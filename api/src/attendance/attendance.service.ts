import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Between, In, IsNull, Repository } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf } from '../auth/guards'
import { PublicHoliday, Shift, WorkSchedule } from '../assets/assets.entities'
import { Employee } from '../employees/employee.entity'
import { Branch } from '../org/entities/branch.entity'
import { AttendanceCorrection, OvertimeEntry } from '../requests/entities/attendance.entities'
import { Leave } from '../requests/entities/leave.entities'
import { Request } from '../requests/entities/request.entity'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import {
  AttendanceDay,
  AttendancePunch,
  AttendanceStatus,
  OvertimePeriod,
  PermissionType,
  ScheduleDayOverride,
  ScheduleEntry,
  ScheduleExceptionRule,
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
    @InjectRepository(AttendanceCorrection)
    private readonly corrections: Repository<AttendanceCorrection>,
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
    @InjectRepository(ScheduleExceptionRule)
    private readonly scheduleRules: Repository<ScheduleExceptionRule>,
    @InjectRepository(OvertimePeriod)
    private readonly overtimePeriods: Repository<OvertimePeriod>,
    @InjectRepository(PermissionType)
    private readonly permissionTypes: Repository<PermissionType>,
    @InjectRepository(WorkSchedule)
    private readonly workSchedules: Repository<WorkSchedule>,
    @InjectRepository(Shift)
    private readonly shiftsCatalog: Repository<Shift>
  ) {}

  // إعدادات الوردية من الكتالوج (بالاسم) — نوافذ/سماحية/أوفرتايم/نوع
  private async shiftConfig(name: string): Promise<Shift | null> {
    if (!name) return null
    // اسم الوردية قد يحمل لاحقة «(يوم خاص)» — نجرّب المطابقة المجرّدة أيضاً
    const bare = name.replace(/\s*\(.*\)\s*$/, '').trim()
    return (
      (await this.shiftsCatalog.findOne({ where: { name } })) ??
      (await this.shiftsCatalog.findOne({ where: { name: bare } }))
    )
  }

  // العطلة الأسبوعية لجدول عمل الموظف (إن وُجد) — تغلب إعداد الفرع/العام
  private async employeeWeekend(employeeId: number): Promise<string | undefined> {
    const emp = await this.employees.findOne({ where: { id: employeeId } })
    if (!emp?.workScheduleId) return undefined
    const ws = await this.workSchedules.findOne({
      where: { id: emp.workScheduleId },
    })
    // جدول محذوف (مرجع معلّق) → السلوك الافتراضي؛ جدول بلا عطلة ('') = دوام
    // 7 أيام (تجاوز فعلي لا رجوع للفرع)
    return ws ? (ws.weekendDays ?? '') : undefined
  }

  // أيام العمل الفعلية في مدى — الويك إند والعطلات الرسمية مستثناة
  // (للإجازات: المخصوم من الرصيد = أيام العمل فقط)
  async workingDaysBetween(
    branchId: number,
    fromDate: string,
    toDate: string,
    weekendOverride?: string
  ): Promise<{ total: number; working: number; skipped: string[] }> {
    const from = new Date(`${fromDate}T12:00:00`)
    const to = new Date(`${toDate}T12:00:00`)
    // حمّل السياق مرة واحدة (لا استعلام لكل يوم داخل الحلقة)
    const ctx = await this.nonWorkingContext(branchId, weekendOverride)
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
      if (this.evalNonWorking(date, branchId, ctx)) skipped.push(date)
      else working++
    }
    return { total, working, skipped }
  }

  // §2.4: يوم عطلة؟ (ويك إند من الإعدادات/الفرع + العطلات الرسمية + قواعد الاستثناء)
  // ممنوع يتحسب تأخير أو غياب فيه حتى لو فيه بصمة
  async isNonWorkingDay(
    date: string,
    branchId: number,
    weekendOverride?: string
  ): Promise<boolean> {
    const ctx = await this.nonWorkingContext(branchId, weekendOverride)
    return this.evalNonWorking(date, branchId, ctx)
  }

  // يحمّل مصادر «يوم العطلة» مرة واحدة (ويك إند + عطلات + قواعد استثناء)
  // weekendOverride: عطلة جدول عمل الموظف — تغلب إعداد الفرع/العام إن وُجدت
  private async nonWorkingContext(
    branchId: number,
    weekendOverride?: string
  ): Promise<{
    weekend: string[]
    holidays: PublicHoliday[]
    rules: ScheduleExceptionRule[]
  }> {
    let weekend = await this.configValue('attendance.weekend_days', 'FRI,SAT')
    const branch = await this.branches.findOne({ where: { id: branchId } })
    if ((branch as any)?.weekendDays) weekend = (branch as any).weekendDays
    // جدول الموظف يغلب — '' تعني دوام 7 أيام (تجاوز صريح لا رجوع للفرع)
    if (weekendOverride !== undefined) weekend = weekendOverride
    const holidays = await this.holidays.find()
    const rules = await this.scheduleRules.find({
      where: { isActive: true },
      order: { id: 'ASC' },
    })
    return {
      weekend: weekend.split(',').map((d) => d.trim().toUpperCase()),
      holidays,
      rules,
    }
  }

  private evalNonWorking(
    date: string,
    branchId: number,
    ctx: {
      weekend: string[]
      holidays: PublicHoliday[]
      rules: ScheduleExceptionRule[]
    }
  ): boolean {
    const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
    const dayName = WEEKDAYS[new Date(`${date}T12:00:00`).getDay()]
    let isWeekend = ctx.weekend.includes(dayName)

    // عطلة رسمية — لا تُبطَل بقواعد الاستثناء
    const isHoliday = ctx.holidays.some(
      (h) => h.date <= date && (h.endDate ? h.endDate >= date : h.date === date)
    )
    if (isHoliday) return true

    // قواعد الاستثناء لنفس اليوم: الفرعية تحسم بعد العامة
    const occ = this.occurrenceOf(date)
    const applicable = ctx.rules
      .filter((r) => r.weekday === dayName)
      .filter((r) => r.branchId == null || r.branchId === branchId)
      .filter((r) => this.occurrenceMatches(r.occurrence, occ))
      .sort((a, b) => (a.branchId == null ? 0 : 1) - (b.branchId == null ? 0 : 1))
    for (const r of applicable) {
      if (r.effect === 'WORK') isWeekend = false
      else if (r.effect === 'OFF') isWeekend = true
    }
    return isWeekend
  }

  // ترتيب تكرار اليوم في شهره: {index: 1..5، isLast}
  private occurrenceOf(date: string): { index: number; isLast: boolean } {
    const d = new Date(`${date}T12:00:00`)
    const dom = d.getDate()
    const index = Math.floor((dom - 1) / 7) + 1
    const next = new Date(d)
    next.setDate(dom + 7)
    return { index, isLast: next.getMonth() !== d.getMonth() }
  }

  private occurrenceMatches(
    occ: string,
    o: { index: number; isLast: boolean }
  ): boolean {
    if (occ === 'ALL') return true
    if (occ === 'LAST') return o.isLast
    const map: Record<string, number> = { '1ST': 1, '2ND': 2, '3RD': 3, '4TH': 4 }
    return map[occ] === o.index
  }

  private async configValue(key: string, fallback: string): Promise<string> {
    const row = await this.config.findOne({ where: { key } })
    return row?.value ?? fallback
  }

  // ===== قواعد استثناء أيام العمل — CRUD =====
  private readonly WEEKDAYS_VALID = [
    'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT',
  ]
  private readonly OCC_VALID = ['ALL', '1ST', '2ND', '3RD', '4TH', 'LAST']

  listScheduleRules() {
    return this.scheduleRules.find({ order: { id: 'ASC' } })
  }

  async createScheduleRule(dto: {
    name: string
    weekday: string
    occurrence: string
    effect: string
    branchId?: number | null
  }) {
    if (!dto.name?.trim()) throw new BadRequestException('اسم القاعدة مطلوب')
    if (!this.WEEKDAYS_VALID.includes(dto.weekday)) {
      throw new BadRequestException('اليوم غير صالح')
    }
    if (!this.OCC_VALID.includes(dto.occurrence)) {
      throw new BadRequestException('التكرار غير صالح')
    }
    if (!['WORK', 'OFF'].includes(dto.effect)) {
      throw new BadRequestException('الأثر: WORK أو OFF')
    }
    return this.scheduleRules.save(
      this.scheduleRules.create({
        name: dto.name.trim(),
        weekday: dto.weekday as any,
        occurrence: dto.occurrence as any,
        effect: dto.effect as any,
        branchId: dto.branchId ?? undefined,
        isActive: true,
      })
    )
  }

  async updateScheduleRule(
    id: number,
    dto: Partial<{
      name: string
      weekday: string
      occurrence: string
      effect: string
      branchId: number | null
      isActive: boolean
    }>
  ) {
    const rule = await this.scheduleRules.findOne({ where: { id } })
    if (!rule) throw new NotFoundException('القاعدة غير موجودة')
    if (dto.weekday && !this.WEEKDAYS_VALID.includes(dto.weekday)) {
      throw new BadRequestException('اليوم غير صالح')
    }
    if (dto.occurrence && !this.OCC_VALID.includes(dto.occurrence)) {
      throw new BadRequestException('التكرار غير صالح')
    }
    if (dto.effect && !['WORK', 'OFF'].includes(dto.effect)) {
      throw new BadRequestException('الأثر: WORK أو OFF')
    }
    // حقول قابلة للتعديل فقط — ممنوع الجسم يكتب على id أو صف آخر
    if (dto.name !== undefined) rule.name = String(dto.name).trim()
    if (dto.weekday !== undefined) rule.weekday = dto.weekday as any
    if (dto.occurrence !== undefined) rule.occurrence = dto.occurrence as any
    if (dto.effect !== undefined) rule.effect = dto.effect as any
    if (dto.branchId !== undefined) rule.branchId = dto.branchId ?? (undefined as any)
    if (dto.isActive !== undefined) rule.isActive = !!dto.isActive
    return this.scheduleRules.save(rule)
  }

  async deleteScheduleRule(id: number) {
    const rule = await this.scheduleRules.findOne({ where: { id } })
    if (!rule) throw new NotFoundException('القاعدة غير موجودة')
    await this.scheduleRules.delete({ id })
    return { deleted: true }
  }

  // ===== فترات فتح/قفل الأوفرتايم بالتواريخ =====
  // القرار: فترة تغطّي اليوم؟ CLOSED يحسم، وإلا OPEN يفتح، وإلا المفتاح العام
  async isOvertimeOpen(date: string, branchId: number): Promise<boolean> {
    const periods = await this.overtimePeriods.find({ where: { isActive: true } })
    const covering = periods.filter(
      (p) =>
        (p.branchId == null || p.branchId === branchId) &&
        p.fromDate <= date &&
        p.toDate >= date
    )
    if (covering.some((p) => p.effect === 'CLOSED')) return false
    if (covering.some((p) => p.effect === 'OPEN')) return true
    return (await this.configValue('overtime.enabled', 'true')) === 'true'
  }

  listOvertimePeriods() {
    return this.overtimePeriods.find({ order: { fromDate: 'DESC' } })
  }

  async createOvertimePeriod(dto: {
    name: string
    fromDate: string
    toDate: string
    effect: string
    branchId?: number | null
  }) {
    if (!dto.name?.trim()) throw new BadRequestException('اسم الفترة مطلوب')
    const dateRe = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRe.test(dto.fromDate) || !dateRe.test(dto.toDate)) {
      throw new BadRequestException('التواريخ بصيغة YYYY-MM-DD')
    }
    if (dto.fromDate > dto.toDate) {
      throw new BadRequestException('تاريخ البداية بعد النهاية')
    }
    if (!['OPEN', 'CLOSED'].includes(dto.effect)) {
      throw new BadRequestException('الأثر: OPEN أو CLOSED')
    }
    return this.overtimePeriods.save(
      this.overtimePeriods.create({
        name: dto.name.trim(),
        fromDate: dto.fromDate,
        toDate: dto.toDate,
        effect: dto.effect as any,
        branchId: dto.branchId ?? undefined,
        isActive: true,
      })
    )
  }

  async updateOvertimePeriod(
    id: number,
    dto: Partial<{
      name: string
      fromDate: string
      toDate: string
      effect: string
      branchId: number | null
      isActive: boolean
    }>
  ) {
    const p = await this.overtimePeriods.findOne({ where: { id } })
    if (!p) throw new NotFoundException('الفترة غير موجودة')
    const dateRe = /^\d{4}-\d{2}-\d{2}$/
    if (dto.fromDate !== undefined && !dateRe.test(dto.fromDate)) {
      throw new BadRequestException('تاريخ البداية غير صالح')
    }
    if (dto.toDate !== undefined && !dateRe.test(dto.toDate)) {
      throw new BadRequestException('تاريخ النهاية غير صالح')
    }
    if (dto.effect !== undefined && !['OPEN', 'CLOSED'].includes(dto.effect)) {
      throw new BadRequestException('الأثر: OPEN أو CLOSED')
    }
    // حقول قابلة للتعديل فقط — ممنوع الجسم يكتب على id
    if (dto.name !== undefined) p.name = String(dto.name).trim()
    if (dto.fromDate !== undefined) p.fromDate = dto.fromDate
    if (dto.toDate !== undefined) p.toDate = dto.toDate
    if (dto.effect !== undefined) p.effect = dto.effect as any
    if (dto.branchId !== undefined) p.branchId = dto.branchId ?? (undefined as any)
    if (dto.isActive !== undefined) p.isActive = !!dto.isActive
    if (p.fromDate > p.toDate) {
      throw new BadRequestException('تاريخ البداية بعد النهاية')
    }
    return this.overtimePeriods.save(p)
  }

  async deleteOvertimePeriod(id: number) {
    const p = await this.overtimePeriods.findOne({ where: { id } })
    if (!p) throw new NotFoundException('الفترة غير موجودة')
    await this.overtimePeriods.delete({ id })
    return { deleted: true }
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
    // بلا وردية مجدولة: ساعات جدول عمل الموظف إن وُجد، وإلا الافتراضية
    const emp = await this.employees.findOne({ where: { id: employeeId } })
    if (emp?.workScheduleId) {
      const ws = await this.workSchedules.findOne({
        where: { id: emp.workScheduleId },
      })
      if (ws) return { name: ws.name, start: ws.startTime, end: ws.endTime }
    }
    return DEFAULT_SHIFT
  }

  // أيام العمل لموظف بعينه — يشتقّ عطلته الأسبوعية من جدول عمله (للإجازات)
  async workingDaysForEmployee(employeeId: number, fromDate: string, toDate: string) {
    const emp = await this.employees.findOne({ where: { id: employeeId } })
    const weekend = await this.employeeWeekend(employeeId)
    return this.workingDaysBetween(emp?.branchId ?? 1, fromDate, toDate, weekend)
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

  // تجاوز وردية يوم بعينه لمجموعة موظفين (نطاق: شركة/فرع/قسم) —
  // «يوم استثنائي» بدوام مختلف عن باقي الأسبوع دون تغيير وردية الأسبوع
  async setDayOverridesBulk(dto: {
    employeeIds: number[]
    dates: string[]
    shiftName?: string
    startTime?: string
    endTime?: string
    clear?: boolean
  }) {
    const employeeIds = [
      ...new Set((dto.employeeIds ?? []).map(Number).filter(Boolean)),
    ]
    const dates = [
      ...new Set(
        (dto.dates ?? []).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d)))
      ),
    ]
    if (employeeIds.length === 0 || dates.length === 0) {
      throw new BadRequestException('اختر موظفين وأياماً على الأقل')
    }
    // تحقّق مُدخلات الوردية مرة واحدة (لا لكل موظف) — فشل مبكر واضح
    if (!dto.clear) {
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
    }
    let applied = 0
    for (const employeeId of employeeIds) {
      for (const date of dates) {
        try {
          await this.setDayOverride({
            employeeId,
            date,
            shiftName: dto.shiftName,
            startTime: dto.startTime,
            endTime: dto.endTime,
            clear: dto.clear,
          })
          applied++
        } catch {
          /* تخطّى موظفاً غير صالح في العملية الجماعية دون إيقاف الباقي */
        }
      }
    }
    return {
      ok: true,
      applied,
      employees: employeeIds.length,
      days: dates.length,
    }
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
  ): Promise<
    Array<{
      from: number
      to: number
      deductible: boolean
      deductRatio: number
      coverage: 'morning' | 'evening' | 'both'
    }>
  > {
    const month = date.slice(0, 7)
    const rows = await this.requests.find({
      where: {
        requesterId: employeeId,
        typeCode: 'PERMISSION',
        status: In(['COMPLETED', 'APPROVED', 'IN_EXECUTION']),
      },
    })
    // كل أذونات الشهر المعتمدة (لحساب الرصيد التراكمي)
    // id = معرّف الطلب — كاسر تعادل ثابت حين يتطابق التاريخ ووقت البداية
    const monthPerms: Array<{
      id: number
      date: string
      from: number
      to: number
      type: string | null
      dur: number
    }> = []
    for (const r of rows) {
      try {
        const p = JSON.parse(r.payload ?? '{}')
        if (p.date && String(p.date).startsWith(month) && p.from && p.to) {
          const from = toMinutes(p.from)
          const to = toMinutes(p.to)
          monthPerms.push({
            id: r.id,
            date: String(p.date),
            from,
            to,
            type: p.permissionType ? String(p.permissionType) : null,
            dur: Math.max(0, to - from),
          })
        }
      } catch {
        /* payload تالف — تجاهل */
      }
    }
    // ترتيب زمني لحساب «الأسبق أولاً» في الرصيد المجاني —
    // كسر التعادل بالمعرّف حتى يكون «الأسبق» محدداً بدقة (لا عشوائياً)
    monthPerms.sort((a, b) =>
      a.date !== b.date
        ? a.date < b.date
          ? -1
          : 1
        : a.from !== b.from
          ? a.from - b.from
          : a.id - b.id
    )
    // كتالوج الأنواع المستخدمة
    const typeNames = [...new Set(monthPerms.map((p) => p.type).filter(Boolean))]
    const typeMap = new Map<string, PermissionType>()
    for (const name of typeNames as string[]) {
      const pt = await this.permissionTypes.findOne({ where: { nameAr: name } })
      if (pt) typeMap.set(name, pt)
    }

    const windows: Array<{
      from: number
      to: number
      deductible: boolean
      deductRatio: number
      coverage: 'morning' | 'evening' | 'both'
    }> = []
    for (const perm of monthPerms.filter((p) => p.date === date)) {
      const pt = perm.type ? typeMap.get(perm.type) : undefined
      const ratio = Math.max(
        0,
        Math.min(1, Number(pt?.deductionPct ?? 100) / 100)
      )
      // اتجاه التغطية من نوع الإذن: صباحي (تأخير) / مسائي (انصراف مبكر) / كلاهما
      const cover: 'morning' | 'evening' | 'both' =
        pt?.coverage === 'morning' || pt?.coverage === 'evening'
          ? pt.coverage
          : 'both'
      const addWin = (w: {
        from: number
        to: number
        deductible: boolean
        deductRatio: number
      }) => {
        windows[windows.length] = { ...w, coverage: cover }
      }

      // النوع «بخصم» صراحةً (أو بلا نوع) → كامل النافذة بخصم
      if (!pt || pt.isDeductible) {
        addWin({
          from: perm.from,
          to: perm.to,
          deductible: !!pt?.isDeductible,
          deductRatio: pt?.isDeductible ? ratio : 1,
        })
        continue
      }

      // نوع مجاني: بلا حدّ شهري → معذور مجاناً بالكامل
      const hasCap =
        pt.monthlyFreeCount != null || pt.monthlyFreeMinutes != null
      if (!hasCap) {
        addWin({ from: perm.from, to: perm.to, deductible: false, deductRatio: 1 })
        continue
      }

      // الأسبق أولاً — الأذونات قبل هذا (بترتيب ثابت: تاريخ ثم بداية ثم معرّف)
      const priors = monthPerms.filter(
        (x) =>
          x.type === perm.type &&
          (x.date < perm.date ||
            (x.date === perm.date &&
              (x.from < perm.from ||
                (x.from === perm.from && x.id < perm.id))))
      )
      const priorCount = priors.length
      const priorMinutes = priors.reduce((s, x) => s + x.dur, 0)

      // تجاوز حدّ العدد → كامل النافذة بخصم (الإذن كوحدة)
      if (pt.monthlyFreeCount != null && priorCount >= pt.monthlyFreeCount) {
        addWin({ from: perm.from, to: perm.to, deductible: true, deductRatio: ratio })
        continue
      }

      // حدّ الدقائق: الجزء ضمن السقف مجاني والباقي بخصم — تقسيم النافذة عند الحد
      // (بلا تقسيم كان الإذن العابر للحد يُعفى بالكامل ويتجاوز السقف بشبه إذن)
      if (pt.monthlyFreeMinutes != null) {
        const freeRemaining = Math.max(0, pt.monthlyFreeMinutes - priorMinutes)
        if (freeRemaining <= 0) {
          addWin({ from: perm.from, to: perm.to, deductible: true, deductRatio: ratio })
        } else if (freeRemaining >= perm.dur) {
          addWin({ from: perm.from, to: perm.to, deductible: false, deductRatio: 1 })
        } else {
          const splitAt = perm.from + freeRemaining
          addWin({ from: perm.from, to: splitAt, deductible: false, deductRatio: 1 })
          addWin({ from: splitAt, to: perm.to, deductible: true, deductRatio: ratio })
        }
        continue
      }

      // حدّ عدد فقط ولم يُتجاوز → مجاني
      addWin({ from: perm.from, to: perm.to, deductible: false, deductRatio: 1 })
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
    const sc = await this.shiftConfig(shift.name)
    // السماحية من الوردية إن حُدّدت، وإلا القيمة العامة
    const grace =
      sc?.graceMinutes != null
        ? Number(sc.graceMinutes)
        : Number(await this.configValue('attendance.grace_minutes', '10'))

    // كل لحظات البصمة لليوم: الفعلية + أي بصمة مطلوبة معتمدة (طلب «تصحيح/طلب
    // بصمة» — وجودها = معتمدة، تُكتب فقط بعد اكتمال الطلب). الأقدم = حضور،
    // الأحدث = انصراف — يعالج «نسي بصمة الحضور/الانصراف» بأمان
    const instants = punches.map((p) => hhmmOf(p.punchTime))
    const corrections = await this.corrections.find({
      where: { employeeId, date },
      order: { id: 'ASC' },
    })
    for (const c of corrections) {
      try {
        const cp = JSON.parse(c.correctedPunch ?? '{}')
        if (cp.in) instants.push(String(cp.in).slice(0, 5))
        if (cp.out) instants.push(String(cp.out).slice(0, 5))
      } catch {
        /* تجاهل تصحيحاً تالفاً */
      }
    }
    instants.sort()
    // تصنيف البصمة: لو الوردية لها نوافذ دخول/خروج → البصمة داخل نافذة الدخول
    // = حضور، وداخل نافذة الخروج = انصراف (فبصمة مسائية وحيدة = خروج لا دخول).
    // غير كده: الأقدم = دخول والأحدث = خروج (السلوك الافتراضي)
    const inWin = (t: string, from?: string | null, to?: string | null) =>
      !!from && !!to && toMinutes(t) >= toMinutes(from) && toMinutes(t) <= toMinutes(to)
    // التصنيف بالنوافذ يتطلب النافذتين معاً — نافذة واحدة ناقصة تُسقط الجانب
    // الآخر بالكامل، فنرجع للسلوك الافتراضي حتى تُضبط النافذتان
    const hasWindows =
      !!(sc?.checkinFrom && sc?.checkinTo) && !!(sc?.checkoutFrom && sc?.checkoutTo)
    let checkIn: string | null
    let checkOut: string | null
    if (hasWindows && instants.length > 0) {
      const inHits = instants.filter((t) => inWin(t, sc?.checkinFrom, sc?.checkinTo))
      const outHits = instants.filter((t) => inWin(t, sc?.checkoutFrom, sc?.checkoutTo))
      checkIn = inHits.length ? inHits[0] : null
      checkOut = outHits.length ? outHits[outHits.length - 1] : null
    } else {
      checkIn = instants.length > 0 ? instants[0] : null
      checkOut = instants.length > 1 ? instants[instants.length - 1] : null
    }

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

    // عطلة اليوم بحسب جدول عمل الموظف إن وُجد (يغلب الفرع/العام)
    const empWeekend = emp.workScheduleId
      ? (
          await this.workSchedules.findOne({
            where: { id: emp.workScheduleId },
          })
        )?.weekendDays
      : undefined
    const isHoliday = await this.isNonWorkingDay(
      date,
      emp.branchId,
      empWeekend ?? undefined
    )

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
    } else if (checkIn || checkOut || hasHalfLeave) {
      const permissions = await this.approvedPermissionWindows(employeeId, date)
      // نوافذ التغطية باتجاهها: الإجازة الجزئية «both» (محدودة بوقتها)،
      // والإذن يحمل اتجاهه (صباحي = يعذر التأخير، مسائي = يعذر الانصراف المبكر)
      const coverage = [
        ...halfLeaveWindows.map((w) => ({
          ...w,
          deductRatio: 1,
          coverage: 'both' as const,
        })),
        ...permissions,
      ]
      // تعذير التأخير (بداية الوردية) بنوافذ صباحي/كلاهما فقط،
      // وتعذير الانصراف المبكر (نهاية الوردية) بنوافذ مسائي/كلاهما فقط
      const lateWins = coverage.filter((w) => w.coverage !== 'evening')
      const earlyWins = coverage.filter((w) => w.coverage !== 'morning')
      const freeLate = lateWins.filter((w) => !w.deductible)
      const paidLate = lateWins.filter((w) => w.deductible)
      const freeEarly = earlyWins.filter((w) => !w.deductible)
      const paidEarly = earlyWins.filter((w) => w.deductible)
      // المخصوم من الراتب = دقائق [a1,a2] المغطاة بنوافذ «بخصم» كاتحاد بلا تكرار
      // (كل دقيقة مرة واحدة بأعلى نسبة تغطّيها) — نوافذ متداخلة لا تُحسب مرتين
      const paidPay = (
        a1: number,
        a2: number,
        paid: Array<{ from: number; to: number; deductRatio: number }>
      ) => {
        if (a2 <= a1) return 0
        const cuts = new Set<number>([a1, a2])
        for (const w of paid) {
          if (w.to > a1 && w.from < a2) {
            cuts.add(Math.max(a1, w.from))
            cuts.add(Math.min(a2, w.to))
          }
        }
        const marks = [...cuts].sort((x, y) => x - y)
        let total = 0
        for (let i = 0; i < marks.length - 1; i++) {
          const segFrom = marks[i]
          const segTo = marks[i + 1]
          const mid = (segFrom + segTo) / 2
          let ratio = 0
          for (const w of paid) {
            if (w.from <= mid && mid < w.to) ratio = Math.max(ratio, w.deductRatio ?? 1)
          }
          if (ratio > 0) total += (segTo - segFrom) * ratio
        }
        return total
      }

      if (!checkIn) {
        // بصمة خروج فقط (نسي بصمة الحضور): حاضر بلا حساب تأخير — لا نعاقبه
        // بحساب البصمة دخولاً (كان يُنتج تأخيراً ضخماً). غير كده = جزئية/غياب
        status = checkOut ? 'present' : 'partial_leave'
      } else if (sc?.shiftMode === 'flexible') {
        // وردية مرنة: لا تأخير بوقت البداية — المهم إكمال الساعات المطلوبة.
        // المدة الافتراضية تعالج الوردية الليلية (النهاية بعد منتصف الليل)
        const dur =
          shiftEnd > shiftStart ? shiftEnd - shiftStart : shiftEnd + 1440 - shiftStart
        const requiredMin =
          sc.requiredHours != null ? Math.round(Number(sc.requiredHours) * 60) : dur
        // الوقت المعذور داخل الوردية (إجازة جزئية/إذن بدون خصم) يُخصم من المطلوب
        const freeCov = coverage.filter((w) => !w.deductible)
        const excusedInShift = this.overlapMinutes(shiftStart, shiftEnd, freeCov)
        excusedMinutes = excusedInShift
        if (checkOut) {
          workMinutes = Math.max(0, toMinutes(checkOut) - toMinutes(checkIn))
          const effectiveRequired = Math.max(0, requiredMin - excusedInShift)
          const deficit = effectiveRequired - workMinutes
          lateMinutes = deficit > grace ? deficit : 0
          status = lateMinutes > 0 ? 'late' : hasHalfLeave ? 'partial_leave' : 'present'
        } else {
          status = 'present' // دخل ولم يخرج بعد
        }
      } else {
        // التأخير الخام: المجاني والبخصم يعذران الدقائق المغطاة من التأخير
        // بالكامل، لكن دقائق «بخصم» تُسجَّل للخصم من الراتب (× النسبة)
        const lateRaw = toMinutes(checkIn) - shiftStart
        let excusedLate = 0
        let deductibleCoveredLate = 0 // مغطاة بإذن بخصم — تُعفى من التأخير كاملة
        let deductiblePayLate = 0 // المخصوم من الراتب (× النسبة)
        if (lateRaw > 0) {
          excusedLate = this.overlapMinutes(shiftStart, toMinutes(checkIn), freeLate)
          deductibleCoveredLate = this.overlapMinutes(shiftStart, toMinutes(checkIn), paidLate)
          deductiblePayLate = paidPay(shiftStart, toMinutes(checkIn), paidLate)
        }
        const effectiveLate = lateRaw - excusedLate - deductibleCoveredLate
        lateMinutes = effectiveLate > grace ? effectiveLate : 0

        let excusedEarly = 0
        let deductibleCoveredEarly = 0
        let deductiblePayEarly = 0
        if (checkOut) {
          const earlyRaw = shiftEnd - toMinutes(checkOut)
          if (earlyRaw > 0) {
            excusedEarly = this.overlapMinutes(toMinutes(checkOut), shiftEnd, freeEarly)
            deductibleCoveredEarly = this.overlapMinutes(toMinutes(checkOut), shiftEnd, paidEarly)
            deductiblePayEarly = paidPay(toMinutes(checkOut), shiftEnd, paidEarly)
          }
          const effectiveEarly = earlyRaw - excusedEarly - deductibleCoveredEarly
          earlyLeaveMinutes = effectiveEarly > grace ? effectiveEarly : 0
          workMinutes = Math.max(0, toMinutes(checkOut) - toMinutes(checkIn))
        }
        excusedMinutes = excusedLate + excusedEarly
        // دقائق صحيحة — العمود int؛ الكسر الناتج عن النسبة يُقرَّب لأقرب دقيقة
        // (فرق أقل من دقيقة/يوم لا أثر مادي له على المسير)
        deductibleMinutes = Math.round(deductiblePayLate + deductiblePayEarly)
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
    // الأوفرتايم يتطلب دخولاً وخروجاً — بصمة خروج وحيدة (بلا دخول) لا تُنتج
    // أوفرتايم وهمياً (لم يثبت عمل أصلاً)
    if (checkIn && checkOut && !isFullLeaveDay && !isHoliday) {
      await this.detectOvertime(emp, date, shift, checkOut)
    }
    return day
  }

  // ===== الأوفرتايم: مطابقة المسبق أو كشف تلقائي فوق العتبة =====
  private async detectOvertime(
    emp: Employee,
    date: string,
    shift: { name?: string; end: string },
    checkOut: string
  ) {
    const extraMinutes = toMinutes(checkOut) - toMinutes(shift.end)
    const actualHours = Math.round((extraMinutes / 60) * 100) / 100

    // 1) طلب مسبق معتمد → يُحتسب دائماً (الموافقة الصريحة تغلب القفل):
    // payable = min(المعتمد، الفعلي) — حتى لو الفترة مقفولة
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

    // 2) الكشف التلقائي فقط يخضع للفتح/القفل (فترات + المفتاح العام)
    const otOpen = await this.isOvertimeOpen(date, emp.branchId)
    if (!otOpen) {
      // قفل بأثر رجعي: احذف المكتشف غير المعتمد (المسبق المعتمد لا يُمس)
      await this.overtime.delete({
        employeeId: emp.id,
        date,
        source: 'BIOMETRIC_DETECTED',
        status: 'DETECTED',
      })
      return
    }

    // عتبة الأوفرتايم من الوردية إن حُدّدت، وإلا القيمة العامة
    const scOt = await this.shiftConfig(shift.name ?? '')
    const threshold =
      scOt?.overtimeThresholdHours != null
        ? Number(scOt.overtimeThresholdHours)
        : Number(await this.configValue('overtime.detection_threshold_hours', '0.5'))

    // كشف تلقائي: فوق العتبة → قيد DETECTED بانتظار تأكيد المدير المباشر
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
    // المكتشف بلا طلب فقط — اللي اتوجّه لسلسلة اعتماد (requestId) يُعتمد هناك
    const rows = await this.overtime.find({
      where: { status: 'DETECTED', requestId: IsNull() },
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
