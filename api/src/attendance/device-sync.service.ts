import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { Between, Repository } from 'typeorm'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ZKLib = require('node-zklib')
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
  error?: string
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
  async syncDevice(deviceId: number): Promise<SyncResult> {
    const device = await this.devices.findOne({ where: { id: deviceId } })
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
      const zk = new ZKLib(device.ip, device.port || 4370, 8000, 4000)
      try {
        await zk.createSocket()
        const logs = await zk.getAttendances()
        await zk.disconnect().catch(() => undefined)

        const rows: Array<{ deviceUserId: string; recordTime: string | Date }> =
          logs?.data ?? []
        let inserted = 0
        let matched = 0
        for (const r of rows) {
          const employeeCode = String(r.deviceUserId ?? '').trim()
          if (!employeeCode) continue
          const punchTime = new Date(r.recordTime)
          if (Number.isNaN(punchTime.getTime())) continue

          // dedupe: نفس الكود + نفس اللحظة + نفس الجهاز = مكررة
          const dup = await this.punches.findOne({
            where: {
              employeeCode,
              deviceSn: device.serialNumber,
              punchTime: Between(
                new Date(punchTime.getTime() - 500),
                new Date(punchTime.getTime() + 500)
              ),
            },
          })
          if (dup) continue

          // تنسيق محلي — toISOString كانت تزحزح الوقت 3 ساعات (UTC)
          const pad = (n: number) => String(n).padStart(2, '0')
          const localTs = `${punchTime.getFullYear()}-${pad(punchTime.getMonth() + 1)}-${pad(punchTime.getDate())} ${pad(punchTime.getHours())}:${pad(punchTime.getMinutes())}:${pad(punchTime.getSeconds())}`
          const result = await this.attendance.ingest(
            [
              {
                employeeCode,
                timestamp: localTs,
                deviceSn: device.serialNumber,
              },
            ],
            undefined,
            // مصدر داخلي موثوق — نتخطى مفتاح الجهاز
            { sub: 0, email: 'device-sync', role: 'super_admin', branchId: null, employeeId: null }
          )
          inserted++
          matched += result.matched
        }
        return this.finish(device, {
          ok: true,
          pulled: rows.length,
          inserted,
          matched,
        })
      } finally {
        zk.disconnect?.().catch?.(() => undefined)
      }
    } catch (e: any) {
      const raw =
        e?.message ??
        (typeof e === 'object' ? JSON.stringify(e) : String(e ?? ''))
      const msg = (String(raw) || 'خطأ اتصال غير معروف').slice(0, 250)
      this.logger.warn(`فشل مزامنة ${device.name} (${device.ip}): ${msg}`)
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
      ? `OK — سُحب ${r.pulled}، جديد ${r.inserted}`
      : (r.error ?? 'خطأ')
    device.lastSyncCount = r.inserted
    await this.devices.save(device)
    return { deviceId: device.id, deviceName: device.name, ...r }
  }

  // ===== سحب كل الأجهزة النشطة =====
  async syncAll(): Promise<SyncResult[]> {
    const active = await this.devices.find({ where: { isActive: true } })
    const results: SyncResult[] = []
    for (const d of active) {
      results.push(await this.syncDevice(d.id))
    }
    return results
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
