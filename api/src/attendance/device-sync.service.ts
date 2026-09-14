import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { Between, Repository } from 'typeorm'
import { ZkTcpAdapter, ZkTcpError } from './zk-tcp-adapter'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf } from '../auth/guards'
import { BiometricDevice } from '../assets/assets.entities'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { AttendancePunch } from './attendance.entities'
import { AttendanceService } from './attendance.service'

export interface SyncResult {
  deviceId: number
  deviceName: string
  ok: boolean
  pulled: number
  inserted: number
  matched: number
  // بصمات رفضها الاستقبال (وقت مستقبلي/كود غير صالح) — لا تُفشل المزامنة
  rejected?: number
  error?: string
}

// كود جهاز بلا موظف مطابق — لوحة «أكواد بصمة غير مربوطة» في شاشة الأجهزة
export interface UnmatchedCode {
  employeeCode: string
  count: number
  firstPunch: string
  lastPunch: string
  deviceSns: string[]
}

// مزامنة أجهزة ZKTeco عبر TCP/IP: سحب اللوجات → dedupe →
// نفس pipeline الحضور (حساب التأخير حسب الوردية المؤرّخة)
@Injectable()
export class DeviceSyncService {
  private readonly logger = new Logger(DeviceSyncService.name)
  private syncing = new Set<number>()

  constructor(
    @InjectRepository(BiometricDevice)
    private readonly devices: Repository<BiometricDevice>,
    @InjectRepository(AttendancePunch)
    private readonly punches: Repository<AttendancePunch>,
    @InjectRepository(RequestsConfig)
    private readonly config: Repository<RequestsConfig>,
    private readonly attendance: AttendanceService
  ) {}

  // ===== سحب جهاز واحد الآن =====
  async syncDevice(deviceId: number, user?: JwtPayload): Promise<SyncResult> {
    const scope = user ? branchScopeOf(user) : null
    // The secret is selected only for the scoped sync operation, never a catalog response.
    const qb = this.devices.createQueryBuilder('device').addSelect('device.authKey')
      .where('device.id = :id', { id: deviceId })
    if (scope !== null) qb.andWhere('device.branchId = :scope', { scope })
    const device = await qb.getOne()
    if (!device) throw new NotFoundException('الجهاز غير موجود')
    if (!device.ip) {
      return this.finish(device, {
        ok: false,
        pulled: 0,
        inserted: 0,
        matched: 0,
        error: 'لا يوجد IP مسجل للجهاز — سجّله من شاشة الأجهزة',
      })
    }
    if (this.syncing.has(device.id)) {
      return {
        deviceId: device.id,
        deviceName: device.name,
        ok: false,
        pulled: 0,
        inserted: 0,
        matched: 0,
        error: 'مزامنة جارية بالفعل لهذا الجهاز',
      }
    }
    this.syncing.add(device.id)
    try {
      // مهلات قصيرة: جهاز غير متاح ميعلقش النظام
      const zk = new ZkTcpAdapter(device.ip, device.port || 4370, device.authKey, 8000)
      delete (device as Partial<BiometricDevice>).authKey
      try {
        await zk.createSocket()
        const logs = await zk.getAttendances()
        await zk.disconnect().catch(() => undefined)

        const rows: Array<{ deviceUserId: string; recordTime: string | Date }> =
          logs?.data ?? []
        // الجهاز بيرجّع سجله كله كل مرة (المكتبة مابتدعمش السحب من تاريخ): dedupe
        // في الذاكرة مقابل استعلام واحد للبصمات الموجودة في مدى أوقات السجل، والجديد
        // يدخل ingest دفعات — بدل findOne وcomputeDay لكل بصمة (ATT-25)
        const pad = (n: number) => String(n).padStart(2, '0')
        // تنسيق محلي — toISOString كانت تزحزح الوقت 3 ساعات (UTC)
        const localTs = (d: Date) =>
          `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
        // نفس الكود + نفس الثانية + نفس الجهاز = مكررة
        const keyOf = (code: string, t: number) => `${code}|${Math.round(t / 1000)}`
        const parsed: Array<{ code: string; at: Date }> = []
        let minT = Infinity
        let maxT = -Infinity
        for (const r of rows) {
          const code = String(r.deviceUserId ?? '').trim()
          const at = new Date(r.recordTime)
          if (!code || Number.isNaN(at.getTime())) continue
          parsed.push({ code, at })
          if (at.getTime() < minT) minT = at.getTime()
          if (at.getTime() > maxT) maxT = at.getTime()
        }
        const seen = new Set<string>()
        if (parsed.length > 0) {
          const existing = await this.punches.find({
            where: {
              deviceSn: device.serialNumber,
              punchTime: Between(new Date(minT - 1000), new Date(maxT + 1000)),
            },
            select: { employeeCode: true, punchTime: true },
          })
          for (const e of existing) {
            seen.add(keyOf(e.employeeCode, new Date(e.punchTime).getTime()))
          }
        }
        const fresh: Array<{ employeeCode: string; timestamp: string; deviceSn: string }> = []
        for (const p of parsed) {
          const k = keyOf(p.code, p.at.getTime())
          if (seen.has(k)) continue
          seen.add(k) // تكرار داخل نفس السجل
          fresh.push({
            employeeCode: p.code,
            timestamp: localTs(p.at),
            deviceSn: device.serialNumber,
          })
        }
        let inserted = 0
        let matched = 0
        let rejected = 0
        // دفعات عشان الطلب الواحد مايكبرش — ingest بيعيد حساب كل يوم متأثر مرة واحدة
        for (let i = 0; i < fresh.length; i += 500) {
          const result = await this.attendance.ingest(
            fresh.slice(i, i + 500),
            undefined,
            // مصدر داخلي موثوق — نتخطى مفتاح الجهاز
            { sub: 0, email: 'device-sync', role: 'super_admin', branchId: null, employeeId: null },
            // مصدر جهاز: البصمة المرفوضة (وقت مستقبلي/كود غير صالح) تُعدّ ولا تُفشل المزامنة
            { fromDevice: true }
          )
          inserted += result.received
          matched += result.matched
          rejected += result.rejectedFuture + result.rejectedInvalid
        }
        return this.finish(device, {
          ok: true,
          pulled: rows.length,
          inserted,
          matched,
          rejected,
        })
      } finally {
        await zk.disconnect()
      }
    } catch (e: any) {
      // Never serialize transport errors, request packets, or database parameters.
      const msg = e instanceof ZkTcpError ? e.message : 'تعذر إكمال مزامنة الجهاز'
      this.logger.warn(`فشل مزامنة الجهاز #${device.id}: ${msg}`)
      return this.finish(device, {
        ok: false,
        pulled: 0,
        inserted: 0,
        matched: 0,
        error: `تعذر الاتصال بالجهاز: ${msg}`,
      })
    } finally {
      this.syncing.delete(device.id)
    }
  }

  private async finish(
    device: BiometricDevice,
    r: Omit<SyncResult, 'deviceId' | 'deviceName'>
  ): Promise<SyncResult> {
    device.lastSyncAt = new Date()
    device.lastStatus = r.ok
      ? `OK — سُحب ${r.pulled}، جديد ${r.inserted}${r.rejected ? `، مرفوض ${r.rejected}` : ''}`
      : (r.error ?? 'خطأ')
    device.lastSyncCount = r.inserted
    await this.devices.update(device.id, { lastSyncAt: device.lastSyncAt,
      lastStatus: device.lastStatus, lastSyncCount: device.lastSyncCount })
    return { deviceId: device.id, deviceName: device.name, ...r }
  }

  // ===== سحب كل الأجهزة النشطة =====
  async syncAll(user?: JwtPayload): Promise<SyncResult[]> {
    const scope = user ? branchScopeOf(user) : null
    const active = await this.devices.find({ where: { isActive: true, ...(scope !== null ? { branchId: scope } : {}) } })
    const results: SyncResult[] = []
    for (const d of active) {
      results.push(await this.syncDevice(d.id, user))
    }
    return results
  }

  // ===== بصمات بلا موظف مطابق — مجمّعة بكود الجهاز =====
  // اليتيمة بلا موظف ولا فرع؛ نطاقها فرع الجهاز الذي سجّلها (المقيّد بفرع يرى
  // أجهزة فرعه فقط، ومجهولة الجهاز/اليدوية للـsuper_admin)
  async unmatchedPunches(user: JwtPayload): Promise<UnmatchedCode[]> {
    const qb = this.punches
      .createQueryBuilder('p')
      .select('p.employeeCode', 'employeeCode')
      .addSelect('p.deviceSn', 'deviceSn')
      .addSelect('COUNT(*)', 'count')
      .addSelect('MIN(p.punchTime)', 'firstPunch')
      .addSelect('MAX(p.punchTime)', 'lastPunch')
      .where('p.employeeId IS NULL')
      .groupBy('p.employeeCode')
      .addGroupBy('p.deviceSn')
    const scope = branchScopeOf(user)
    if (scope !== null) {
      const sns = (await this.devices.find({ where: { branchId: scope } })).map(
        (d) => d.serialNumber
      )
      if (sns.length === 0) return []
      qb.andWhere('p.deviceSn IN (:...sns)', { sns })
    }
    const rows = await qb.getRawMany<{
      employeeCode: string
      deviceSn: string | null
      count: number
      firstPunch: string
      lastPunch: string
    }>()
    const byCode = new Map<string, UnmatchedCode>()
    for (const r of rows) {
      const cur = byCode.get(r.employeeCode) ?? {
        employeeCode: r.employeeCode,
        count: 0,
        firstPunch: r.firstPunch,
        lastPunch: r.lastPunch,
        deviceSns: [],
      }
      cur.count += Number(r.count)
      if (new Date(r.firstPunch) < new Date(cur.firstPunch)) cur.firstPunch = r.firstPunch
      if (new Date(r.lastPunch) > new Date(cur.lastPunch)) cur.lastPunch = r.lastPunch
      if (r.deviceSn) cur.deviceSns.push(r.deviceSn)
      byCode.set(r.employeeCode, cur)
    }
    return [...byCode.values()].sort((a, b) => b.count - a.count)
  }

  // ===== الجدولة: كل 5 دقائق نفحص هل حان موعد السحب (الفاصل من الإعدادات) =====
  @Cron('*/5 * * * *')
  async scheduledSync() {
    const cfg = await this.config.findOne({
      where: { key: 'attendance.sync_interval_minutes' },
    })
    const interval = Number(cfg?.value ?? '0')
    if (!interval || interval <= 0) return // 0 = الجدولة متوقفة
    const due = await this.devices.find({ where: { isActive: true } })
    const now = Date.now()
    for (const d of due) {
      if (!d.ip) continue
      const last = d.lastSyncAt ? new Date(d.lastSyncAt).getTime() : 0
      if (now - last >= interval * 60000) {
        await this.syncDevice(d.id)
      }
    }
  }
}
