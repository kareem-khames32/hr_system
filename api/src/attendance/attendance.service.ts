import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Between, In, Repository } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf } from '../auth/guards'
import { PublicHoliday } from '../assets/assets.entities'
import { Employee } from '../employees/employee.entity'
import { Branch } from '../org/entities/branch.entity'
import { OvertimeEntry } from '../requests/entities/attendance.entities'
import { Leave } from '../requests/entities/leave.entities'
import { Request } from '../requests/entities/request.entity'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import {
  AttendanceDay,
  AttendancePunch,
  AttendanceStatus,
  PermissionType,
  ScheduleDayOverride,
  ScheduleEntry,
} from './attendance.entities'

// الوردية الافتراضية عند غياب جدولة الأسبوع — مرآة src/lib/attendance.ts
const DEFAULT_SHIFT = { name: 'صباحي', start: '08:00', end: '17:00' }

const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

const hhmmOf = (d: Date): string =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

// تاريخ محلي YYYY-MM-DD — ممنوع toISOString على «الآن» (قاعدة التوقيت المحلي)
const localDateOf = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// مفتاح الأسبوع = تاريخ الأحد الذي يقع فيه اليوم (الأحد = 0)
export const weekKeyOf = (dateStr: string): string => {
  const d = new Date(`${dateStr}T12:00:00`)
  d.setDate(d.getDate() - d.getDay())
  return d.toISOString().slice(0, 10)
}

export interface PunchDto {
  employeeCode: string
  timestamp: string // ISO أو 'YYYY-MM-DD HH:mm:ss' من الجهاز
  deviceSn?: string
}

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name)

  constructor(
    @InjectRepository(AttendancePunch)
    private readonly punches: Repository<AttendancePunch>,
    @InjectRepository(ScheduleEntry)
    private readonly schedule: Repository<ScheduleEntry>,
    @InjectRepository(AttendanceDay)
    private readonly days: Repository<AttendanceDay>,
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
    @InjectRepository(OvertimeEntry)
    private readonly overtime: Repository<OvertimeEntry>,
    @InjectRepository(RequestsConfig)
    private readonly config: Repository<RequestsConfig>,
    @InjectRepository(Leave)
    private readonly leaves: Repository<Leave>,
    @InjectRepository(Request)
    private readonly requests: Repository<Request>,
    @InjectRepository(PublicHoliday)
    private readonly holidays: Repository<PublicHoliday>,
    @InjectRepository(Branch)
    private readonly branches: Repository<Branch>,
    @InjectRepository(ScheduleDayOverride)
    private readonly dayOverrides: Repository<ScheduleDayOverride>,
    @InjectRepository(PermissionType)
    private readonly permissionTypes: Repository<PermissionType>
  ) {}

  // أيام العمل الفعلية في مدى — الويك إند والعطلات الرسمية مستثناة
  // (للإجازات: المخصوم من الرصيد = أيام العمل فقط)
  async workingDaysBetween(
    branchId: number,
    fromDate: string,
    toDate: string
  ): Promise<{ total: number; working: number; skipped: string[] }> {
    const from = new Date(`${fromDate}T12:00:00`)
    const to = new Date(`${toDate}T12:00:00`)
    let total = 0
    let working = 0
    const skipped: string[] = []
    for (
      let d = new Date(from), i = 0;
      d <= to && i < 92;
      d.setDate(d.getDate() + 1), i++
    ) {
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      total++
      if (await this.isNonWorkingDay(date, branchId)) skipped.push(date)
      else working++
    }
    return { total, working, skipped }
  }

  // §2.4: يوم عطلة؟ (ويك إند من الإعدادات/الفرع + العطلات الرسمية)
  // ممنوع يتحسب تأخير أو غياب فيه حتى لو فيه بصمة
  async isNonWorkingDay(
    date: string,
    branchId: number
  ): Promise<boolean> {
    // الويك إند: أيام مفصولة بفواصل SUN..SAT — إعداد عام + تجاوز لكل فرع
    const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
    let weekend = await this.configValue('attendance.weekend_days', 'FRI,SAT')
    const branch = await this.branches.findOne({ where: { id: branchId } })
    if ((branch as any)?.weekendDays) weekend = (branch as any).weekendDays
    const dayName = WEEKDAYS[new Date(`${date}T12:00:00`).getDay()]
    if (
      weekend
        .split(',')
        .map((d) => d.trim().toUpperCase())
        .includes(dayName)
    ) {
      return true
    }
    // عطلة رسمية (مفردة أو ممتدة)
    const all = await this.holidays.find()
    return all.some(
      (h) => h.date <= date && (h.endDate ? h.endDate >= date : h.date === date)
    )
  }

  private async configValue(key: string, fallback: string): Promise<string> {
    const row = await this.config.findOne({ where: { key } })
    return row?.value ?? fallback
  }

  // ===== استقبال بصمات ZKTeco (دفعة) — مفتاح الجهاز أو JWT =====
  async ingest(punchesDto: PunchDto[], deviceKey?: string, user?: JwtPayload) {
    if (!user) {
      const expected = await this.configValue('attendance.device_key', '')
      if (!expected || deviceKey !== expected) {
        throw new UnauthorizedException('مفتاح الجهاز غير صحيح')
      }
    }
    if (!punchesDto?.length) return { received: 0, matched: 0 }

    const codes = [...new Set(punchesDto.map((p) => p.employeeCode))]
    const emps = await this.employees.find({
      where: { employeeCode: In(codes) },
    })
    const byCode = new Map(emps.map((e) => [e.employeeCode, e]))

    const rows: AttendancePunch[] = []
    const affected = new Set<string>() // employeeId|date
    for (const p of punchesDto) {
      const emp = byCode.get(p.employeeCode)
      const punchTime = new Date(p.timestamp.replace(' ', 'T'))
      if (Number.isNaN(punchTime.getTime())) continue
      rows.push(
        this.punches.create({
          employeeCode: p.employeeCode,
          employeeId: emp?.id,
          punchTime,
          deviceSn: p.deviceSn,
        })
      )
      if (emp) {
        affected.add(`${emp.id}|${punchTime.toISOString().slice(0, 10)}`)
      }
    }
    await this.punches.save(rows)

    // إعادة حساب الأيام المتأثرة فوراً
    for (const key of affected) {
      const [employeeId, date] = key.split('|')
      await this.computeDay(Number(employeeId), date)
    }
    return {
      received: rows.length,
      matched: rows.filter((r) => r.employeeId).length,
      recomputedDays: affected.size,
    }
  }

  // ===== وردية الموظف في يوم محدد =====
  // الأولوية: تجاوز اليوم الواحد ← وردية الأسبوع ← الافتراضية
  async shiftFor(employeeId: number, date: string) {
    const override = await this.dayOverrides.findOne({
      where: { employeeId, date },
    })
    if (override) {
      return {
        name: `${override.shiftName} (يوم خاص)`,
        start: override.startTime,
        end: override.endTime,
      }
    }
    const entry = await this.schedule.findOne({
      where: { weekStart: weekKeyOf(date), employeeId },
    })
    if (entry) {
      return { name: entry.shiftName, start: entry.startTime, end: entry.endTime }
    }
    return DEFAULT_SHIFT
  }

  // ===== تجاوز وردية يوم بعينه (أو مسحه) + إعادة حساب اليوم فوراً =====
  async setDayOverride(dto: {
    employeeId: number
    date: string
    shiftName?: string
    startTime?: string
    endTime?: string
    clear?: boolean
  }) {
    const emp = await this.employees.findOne({ where: { id: dto.employeeId } })
    if (!emp) throw new NotFoundException('الموظف غير موجود')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dto.date)) {
      throw new BadRequestException('التاريخ بصيغة YYYY-MM-DD')
    }
    if (dto.clear) {
      await this.dayOverrides.delete({
        employeeId: dto.employeeId,
        date: dto.date,
      })
    } else {
      const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/
      if (
        !dto.shiftName ||
        !timeRe.test(dto.startTime ?? '') ||
        !timeRe.test(dto.endTime ?? '')
      ) {
        throw new BadRequestException(
          'تجاوز اليوم يحتاج: اسم الوردية + بداية ونهاية بصيغة HH:mm'
        )
      }
      let row = await this.dayOverrides.findOne({
        where: { employeeId: dto.employeeId, date: dto.date },
      })
      if (!row) {
        row = this.dayOverrides.create({
          employeeId: dto.employeeId,
          date: dto.date,
        })
      }
      row.shiftName = dto.shiftName
      row.startTime = dto.startTime!
      row.endTime = dto.endTime!
      await this.dayOverrides.save(row)
    }
    // إعادة حساب اليوم فوراً لو فيه بصمات
    const hasPunches = await this.punches.count({
      where: {
        employeeId: dto.employeeId,
        punchTime: Between(
          new Date(`${dto.date}T00:00:00`),
          new Date(`${dto.date}T23:59:59`)
        ),
      },
    })
    if (hasPunches > 0) {
      return this.computeDay(dto.employeeId, dto.date)
    }
    return { ok: true, date: dto.date, cleared: !!dto.clear }
  }

  // تجاوزات أسبوع (لعرضها في شاشة الجدولة)
  async weekDayOverrides(week: string) {
    const start = weekKeyOf(week)
    const end = new Date(`${start}T12:00:00`)
    end.setDate(end.getDate() + 6)
    const endStr = end.toISOString().slice(0, 10)
    const all = await this.dayOverrides.find()
    return all.filter((o) => o.date >= start && o.date <= endStr)
  }

  // الأذونات المعتمدة لليوم — نوافذ [from, to] بالدقائق مع نوع الخصم
  // (بدون خصم = معذور مجاناً، بخصم = الدقائق المتداخلة تُسجل للمسير)
  private async approvedPermissionWindows(
    employeeId: number,
    date: string
  ): Promise<Array<{ from: number; to: number; deductible: boolean }>> {
    const rows = await this.requests.find({
      where: {
        requesterId: employeeId,
        typeCode: 'PERMISSION',
        status: In(['COMPLETED', 'APPROVED', 'IN_EXECUTION']),
      },
    })
    const windows: Array<{ from: number; to: number; deductible: boolean }> = []
    for (const r of rows) {
      try {
        const p = JSON.parse(r.payload ?? '{}')
        if (p.date === date && p.from && p.to) {
          let deductible = false
          if (p.permissionType) {
            const pt = await this.permissionTypes.findOne({
              where: { nameAr: String(p.permissionType) },
            })
            deductible = !!pt?.isDeductible
          }
          windows.push({
            from: toMinutes(p.from),
            to: toMinutes(p.to),
            deductible,
          })
        }
      } catch {
        /* payload تالف — تجاهل */
      }
    }
    return windows
  }

  // تداخل نافذة [a1,a2] مع مجموعة نوافذ الإذن — مجموع الدقائق المتغطاة
  private overlapMinutes(
    a1: number,
    a2: number,
    windows: Array<{ from: number; to: number }>
  ): number {
    let total = 0
    for (const w of windows) {
      total += Math.max(0, Math.min(a2, w.to) - Math.max(a1, w.from))
    }
    return Math.min(total, Math.max(0, a2 - a1))
  }

  // ===== الحساب الفعلي: أول/آخر بصمة مقابل وردية اليوم + فترة السماح
  // + الإذن المعتمد يعذر التأخير/الانصراف المبكر + الإجازة تعلّم اليوم =====
  async computeDay(employeeId: number, date: string): Promise<AttendanceDay> {
    const emp = await this.employees.findOne({ where: { id: employeeId } })
    if (!emp) throw new NotFoundException('الموظف غير موجود')

    const dayStart = new Date(`${date}T00:00:00`)
    const dayEnd = new Date(`${date}T23:59:59`)
    const punches = await this.punches.find({
      where: { employeeId, punchTime: Between(dayStart, dayEnd) },
      order: { punchTime: 'ASC' },
    })

    const shift = await this.shiftFor(employeeId, date)
    const grace = Number(await this.configValue('attendance.grace_minutes', '10'))

    const checkIn = punches.length > 0 ? hhmmOf(punches[0].punchTime) : null
    // بصمة واحدة فقط = دخول بلا انصراف
    const checkOut =
      punches.length > 1 ? hhmmOf(punches[punches.length - 1].punchTime) : null

    // الإجازات المعتمدة المغطية لليوم: يوم كامل ← 'leave'،
    // نصف يوم ← نافذة تغطية (النصف الأول أو الثاني من الوردية)
    const approvedLeaves = await this.leaves.find({
      where: { employeeId, status: 'APPROVED' },
    })
    const dayLeaves = approvedLeaves.filter(
      (l) => l.fromDate <= date && l.toDate >= date
    )
    const isFullLeaveDay = dayLeaves.some(
      (l) => (l.period ?? 'FULL') === 'FULL'
    )
    const shiftStart = toMinutes(shift.start)
    const shiftEnd = toMinutes(shift.end)
    const shiftMid = Math.round((shiftStart + shiftEnd) / 2)
    // نوافذ الإجازات الجزئية — معذورة بلا خصم دائماً (الإجازة لها نظام رصيدها)
    const halfLeaveWindows = dayLeaves
      .filter((l) => (l.period ?? 'FULL') !== 'FULL')
      .map((l) => ({
        from: l.period === 'MORNING' ? shiftStart : shiftMid,
        to: l.period === 'MORNING' ? shiftMid : shiftEnd,
        deductible: false,
      }))
    const hasHalfLeave = halfLeaveWindows.length > 0

    let status: AttendanceStatus = 'absent'
    let lateMinutes = 0
    let earlyLeaveMinutes = 0
    let excusedMinutes = 0
    let deductibleMinutes = 0
    let workMinutes = 0
    let leaveConflict = false

    const isHoliday = await this.isNonWorkingDay(date, emp.branchId)

    if (isFullLeaveDay) {
      status = 'leave'
      // §موظف بصم يوم إجازته الكاملة — تعارض يظهر لـHR للقرار:
      // إلغاء الإجازة (يرجع الرصيد ويتحسب دوام) أو إبقاؤها
      leaveConflict = !!checkIn
    } else if (isHoliday) {
      // ويك إند/عطلة رسمية: لا تأخير ولا غياب — الحضور يُسجل كعمل بيوم عطلة
      status = 'holiday'
      if (checkIn && checkOut) {
        workMinutes = Math.max(0, toMinutes(checkOut) - toMinutes(checkIn))
      }
    } else if (checkIn || hasHalfLeave) {
      const permissions = await this.approvedPermissionWindows(employeeId, date)
      // كل نوافذ التغطية: إجازات جزئية + أذونات (بنوعيها)
      const coverage = [...halfLeaveWindows, ...permissions]
      const freeCoverage = coverage.filter((w) => !w.deductible)
      const paidCoverage = coverage.filter((w) => w.deductible)

      if (!checkIn) {
        // نصف يوم إجازة ومفيش بصمة خالص: النصف الآخر غياب — يبقى جزئية
        status = 'partial_leave'
      } else {
        // التأخير الخام: المجاني يعذره، و«بخصم» يعذره من الغياب
        // لكن دقائقه المتداخلة تتسجل للخصم في المسير
        const lateRaw = toMinutes(checkIn) - shiftStart
        let excusedLate = 0
        let deductibleLate = 0
        if (lateRaw > 0) {
          excusedLate = this.overlapMinutes(shiftStart, toMinutes(checkIn), freeCoverage)
          deductibleLate = this.overlapMinutes(shiftStart, toMinutes(checkIn), paidCoverage)
        }
        const effectiveLate = lateRaw - excusedLate - deductibleLate
        lateMinutes = effectiveLate > grace ? effectiveLate : 0

        let excusedEarly = 0
        let deductibleEarly = 0
        if (checkOut) {
          const earlyRaw = shiftEnd - toMinutes(checkOut)
          if (earlyRaw > 0) {
            excusedEarly = this.overlapMinutes(toMinutes(checkOut), shiftEnd, freeCoverage)
            deductibleEarly = this.overlapMinutes(toMinutes(checkOut), shiftEnd, paidCoverage)
          }
          const effectiveEarly = earlyRaw - excusedEarly - deductibleEarly
          earlyLeaveMinutes = effectiveEarly > grace ? effectiveEarly : 0
          workMinutes = Math.max(0, toMinutes(checkOut) - toMinutes(checkIn))
        }
        excusedMinutes = excusedLate + excusedEarly
        deductibleMinutes = deductibleLate + deductibleEarly
        // العرض الصحيح: إجازة جزئية تظهر «إجازة جزئية» مش «متأخر»
        // طالما الفترة غير المغطاة سليمة
        status =
          lateMinutes > 0
            ? 'late'
            : earlyLeaveMinutes > 0
              ? 'early_leave'
              : hasHalfLeave
                ? 'partial_leave'
                : 'present'
      }
    }

    let day = await this.days.findOne({ where: { employeeId, date } })
    if (!day) day = this.days.create({ employeeId, date })
    Object.assign(day, {
      branchId: emp.branchId,
      checkIn,
      checkOut,
      shiftName: shift.name,
      shiftStart: shift.start,
      shiftEnd: shift.end,
      status,
      lateMinutes,
      earlyLeaveMinutes,
      excusedMinutes,
      deductibleMinutes,
      workMinutes,
      leaveConflict,
      computedAt: new Date(),
    })
    day = await this.days.save(day)

    // الأوفرتايم × البصمة (لا يُكتشف في يوم إجازة أو عطلة)
    if (checkOut && !isFullLeaveDay && !isHoliday) {
      await this.detectOvertime(emp, date, shift, checkOut)
    }
    return day
  }

  // ===== الأوفرتايم: مطابقة المسبق أو كشف تلقائي فوق العتبة =====
  private async detectOvertime(
    emp: Employee,
    date: string,
    shift: { end: string },
    checkOut: string
  ) {
    const extraMinutes = toMinutes(checkOut) - toMinutes(shift.end)
    const actualHours = Math.round((extraMinutes / 60) * 100) / 100
    const threshold = Number(
      await this.configValue('overtime.detection_threshold_hours', '0.5')
    )

    // 1) طلب مسبق معتمد → payable = min(المعتمد، الفعلي)
    const preApproved = await this.overtime.findOne({
      where: { employeeId: emp.id, date, source: 'PRE_REQUESTED' },
    })
    if (preApproved) {
      preApproved.hoursActual = Math.max(0, actualHours)
      if (preApproved.status === 'APPROVED') {
        preApproved.payableHours = Math.min(
          Number(preApproved.hoursRequested ?? 0),
          Math.max(0, actualHours)
        )
      }
      await this.overtime.save(preApproved)
      return
    }

    // 2) كشف تلقائي: فوق العتبة → قيد DETECTED بانتظار تأكيد المدير المباشر
    if (actualHours < threshold) return
    const existing = await this.overtime.findOne({
      where: { employeeId: emp.id, date, source: 'BIOMETRIC_DETECTED' },
    })
    if (existing) {
      existing.hoursActual = actualHours
      if (existing.status === 'DETECTED') existing.payableHours = null as any
      await this.overtime.save(existing)
      return
    }
    const requiresConfirmation =
      (await this.configValue(
        'overtime.biometric_requires_confirmation',
        'true'
      )) === 'true'
    await this.overtime.save(
      this.overtime.create({
        employeeId: emp.id,
        date,
        source: 'BIOMETRIC_DETECTED',
        hoursActual: actualHours,
        // بدون تأكيد مطلوب → اعتماد فوري بالفعلي
        status: requiresConfirmation ? 'DETECTED' : 'APPROVED',
        payableHours: requiresConfirmation ? undefined : actualHours,
      })
    )
  }

  // ===== الجدولة الأسبوعية =====
  async upsertSchedule(
    entries: Array<{
      weekStart: string
      employeeId: number
      shiftName: string
      startTime: string
      endTime: string
    }>
  ) {
    const saved: ScheduleEntry[] = []
    for (const e of entries) {
      const weekStart = weekKeyOf(e.weekStart)
      let row = await this.schedule.findOne({
        where: { weekStart, employeeId: e.employeeId },
      })
      if (!row) row = this.schedule.create({ weekStart, employeeId: e.employeeId })
      Object.assign(row, {
        shiftName: e.shiftName,
        startTime: e.startTime,
        endTime: e.endTime,
      })
      saved.push(await this.schedule.save(row))

      // أيام الأسبوع المحسوبة بالفعل تُعاد فوراً بالوردية الجديدة —
      // (الماضي فقط: يوم بلا سجل ولا بصمات لا يُختلق)
      const today = localDateOf(new Date())
      for (let i = 0; i < 7; i++) {
        const d = new Date(`${weekStart}T12:00:00`)
        d.setDate(d.getDate() + i)
        const date = localDateOf(d)
        if (date > today) break
        const existing = await this.days.findOne({
          where: { employeeId: e.employeeId, date },
        })
        if (existing) {
          try {
            await this.computeDay(e.employeeId, date)
          } catch {
            /* أفضل جهد — لا نفشل حفظ الجدول بسبب يوم واحد */
          }
        }
      }
    }
    return saved
  }

  weekSchedule(week: string) {
    return this.schedule.find({ where: { weekStart: weekKeyOf(week) } })
  }

  // ===== الاستعلامات (بنطاق الفرع) =====
  async daily(user: JwtPayload, date: string) {
    const scope = branchScopeOf(user)
    const where: Record<string, unknown> = { date }
    if (scope !== null) where.branchId = scope
    return this.days.find({ where: where as any, order: { employeeId: 'ASC' } })
  }

  async monthly(user: JwtPayload, employeeId: number, month: string) {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new BadRequestException('صيغة الشهر YYYY-MM')
    }
    const emp = await this.employees.findOne({ where: { id: employeeId } })
    if (!emp) throw new NotFoundException('الموظف غير موجود')
    // الموظف يشوف شهره هو فقط — غير كده يحتاج attendance.view_all وداخل نطاقه
    if (user.employeeId !== employeeId) {
      const scope = branchScopeOf(user)
      const canViewAll =
        user.role === 'super_admin' ||
        (user.permissions ?? []).includes('*') ||
        (user.permissions ?? []).includes('attendance.view_all')
      if (!canViewAll || (scope !== null && emp.branchId !== scope)) {
        throw new BadRequestException('لا تملك صلاحية عرض حضور غيرك')
      }
    }
    const rows = await this.days.find({
      where: { employeeId } as any,
      order: { date: 'ASC' },
    })
    const monthRows = rows.filter((r) => r.date.startsWith(month))
    return {
      employeeId,
      month,
      days: monthRows,
      summary: {
        present: monthRows.filter((r) => r.status === 'present').length,
        late: monthRows.filter((r) => r.status === 'late').length,
        absent: monthRows.filter((r) => r.status === 'absent').length,
        earlyLeave: monthRows.filter((r) => r.status === 'early_leave').length,
        totalLateMinutes: monthRows.reduce((s, r) => s + r.lateMinutes, 0),
        totalWorkMinutes: monthRows.reduce((s, r) => s + r.workMinutes, 0),
      },
    }
  }

  // الأوفرتايم المكتشف بانتظار تأكيد المدير
  async pendingOvertime(user: JwtPayload) {
    const rows = await this.overtime.find({
      where: { status: 'DETECTED' },
      order: { date: 'DESC' },
    })
    const scope = branchScopeOf(user)
    if (scope === null) return rows
    const emps = await this.employees.find({ where: { branchId: scope } })
    const ids = new Set(emps.map((e) => e.id))
    return rows.filter((r) => ids.has(r.employeeId))
  }

  // تأكيد/رفض المدير للأوفرتايم المكتشف — payable = الفعلي
  async confirmOvertime(user: JwtPayload, id: number, approve: boolean) {
    const row = await this.overtime.findOne({ where: { id } })
    if (!row) throw new NotFoundException('قيد الأوفرتايم غير موجود')
    if (row.status !== 'DETECTED') {
      throw new BadRequestException('القيد ليس بانتظار التأكيد')
    }
    if (approve) {
      row.status = 'APPROVED'
      row.payableHours = Number(row.hoursActual ?? 0)
    } else {
      row.status = 'REJECTED'
      row.payableHours = 0
    }
    await this.overtime.save(row)
    return row
  }

  // إعادة حساب يوم كامل لكل موظفي فرع/النظام (تصحيح بأثر رجعي)
  async recomputeDate(date: string) {
    const punchRows = await this.punches.find({
      where: {
        punchTime: Between(
          new Date(`${date}T00:00:00`),
          new Date(`${date}T23:59:59`)
        ),
      },
    })
    const ids = [...new Set(punchRows.map((p) => p.employeeId).filter(Boolean))]
    for (const id of ids) await this.computeDay(id as number, date)
    return { recomputed: ids.length }
  }
}
