// C8 / الخطوة 31: بند مسير عُكس صرفه بسطر منفذ لا يُقفل حضور الموظف في فترته (يُصحح ثم يُصرف بمسير تكميلي)
import { payrollLineNotReversedSql } from '../payroll/payroll-reversal-sql'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import {
  Between,
  EntityManager,
  In,
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { lockPayrollEmployees } from '../payroll/payroll-settlement-boundary'
import { branchScopeOf, userHasPerm } from '../auth/guards'
import { User } from '../auth/user.entity'
import { PublicHoliday, Shift, WorkSchedule } from '../assets/assets.entities'
import { Employee } from '../employees/employee.entity'
import { Branch } from '../org/entities/branch.entity'
import { AttendanceCorrection, OvertimeEntry } from '../requests/entities/attendance.entities'
import { Leave } from '../requests/entities/leave.entities'
import { Request } from '../requests/entities/request.entity'
import { RequestType } from '../requests/entities/request-type.entity'
import { RequestApproval } from '../requests/entities/request-approval.entity'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { canTransition } from '../requests/state-machine'
import {
  AttendanceDay,
  AttendancePunch,
  AttendanceStatus,
  OvertimePeriod,
  PermissionType,
  PunchSource,
  ScheduleDayOverride,
  ScheduleEntry,
  ScheduleExceptionRule,
  ScheduleSource,
} from './attendance.entities'
import { DEVICE_KEY_MIN_LENGTH, deviceKeyWeakness } from './device-key'
import { AttendanceExemption } from './attendance-exemption.entities'
import { AttendanceRuleVersion } from './attendance-rule.entities'
import { exemptionOnDate, exemptionPolicyOnDate, loadAttendanceExemptions } from './attendance-exemption-resolver'
import { assertAttendanceRulePeriodOpen, attendanceFlexPolicy, attendanceRuleDate, lockAttendanceRuleMutation, resolveAttendanceGrace, resolveAttendanceRule } from './attendance-rule-history'
import type { AttendanceGraceSource } from './attendance-rule-history'
import { calculateAttendanceFlex, attendanceIntervalMinutes } from './attendance-flex-calculator'
import type { AttendanceFlexResult, AttendanceRuleSnapshot, FlexOverrideMode } from './attendance-flex-calculator'
import { overtimeEvidenceFingerprint, overtimeMinutes, selectOvertimePunches } from './overtime-evidence'
import type { OvertimeEvidence, OvertimeEvidencePolicy, OvertimeBlocker } from './overtime-evidence'
import { appendOvertimeEvent, assertOvertimeDayAvailable, claimOvertimeDay, describeOvertimeSubmission, findActiveOvertimeEntries, releaseOvertimeDayClaim } from '../requests/overtime-day-claims'
import { queueOvertimeDispatch } from '../requests/overtime-dispatch'
import { createCalendarResolverCache, resolveBranchCalendarDay, resolveEmployeeCalendarDay, resolveGlobalCalendarDay } from './attendance-calendar-resolver'
import type { CalendarResolverCache, ResolvedCalendarDay } from './attendance-calendar-resolver'
import { assertCalendarScope, beginCalendarChange, calendarSourceContext, confirmCalendarSource, finishCalendarChange } from './attendance-calendar-history'

interface DayAttendanceShift {
  name: string
  start: string
  end: string
  shiftId: number | null
  source: ScheduleSource
  sourceType: 'SHIFT' | 'WORK_SCHEDULE' | null
  sourceId: number | null
  sourceSettings: Record<string, any> | null
  sourceVersionId: number | null
  sourceVersion: number | null
  sourceEffectiveFrom: string | null
  employeeVersionId: number | null
  employeeVersion: number | null
  employeeOverrideMode: FlexOverrideMode
  flexEnabled: boolean
  flexWindowMinutes: number | null
}

export type AttendanceExemptionInfo = Pick<AttendanceExemption,
  'id' | 'effectiveFrom' | 'effectiveTo' | 'terminatedFrom' | 'requiresCheckinForPresence'>
export type AttendanceDayWithExemption = AttendanceDay & {
  attendanceExempt: boolean
  exemption: AttendanceExemptionInfo | null
  provenance?: 'LEGACY_STORED'
  hasShortfall?: boolean
}

// حدّ أمان صريح لمدى عدّ أيام العمل (سنة) — الأطول يُرفض برسالة بدل قصّه بصمت
export const MAX_RANGE_DAYS = 366

// اسم يوم بلا وردية ولا جدول عمل (ولا جدول افتراضي) — لا أوقات مرجعية له
const UNSCHEDULED_NAME = 'بلا وردية'

const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

const hhmmOf = (d: Date): string =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

// تاريخ محلي YYYY-MM-DD — ممنوع toISOString على «الآن» (قاعدة التوقيت المحلي)
export const localDateOf = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// ===== الورديات الليلية (تعبر منتصف الليل: النهاية قبل البداية، 22:00 → 06:00) =====
const isOvernight = (start?: string | null, end?: string | null): boolean =>
  !!start && !!end && toMinutes(end) < toMinutes(start)

// دقائق → HH:mm بلا لفّ عند 24:00 (1805 → "30:05"): خط يوم العمل الممتد لصباح
// الغد، فتبقى المقارنة بالدقائق وترتيب النصوص صحيحين عبر منتصف الليل
const hhmmExt = (mins: number): string =>
  `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`

// "30:05" → "06:05" — ساعة الحائط للتخزين والعرض
const wallClock = (t: string | null): string | null =>
  t == null ? t : hhmmExt(toMinutes(t) % 1440)

// التاريخ المحلي بعد (أو قبل) n يوم
const dateAfter = (ymd: string, n: number): string => {
  const d = new Date(`${ymd}T12:00:00`)
  d.setDate(d.getDate() + n)
  return localDateOf(d)
}

// لحظة محلية = منتصف ليل التاريخ + دقائق بساعة الحائط (ما فوق 1440 = الغد)
const atMinute = (ymd: string, mins: number): Date => {
  const d = new Date(`${ymd}T00:00:00`)
  d.setMinutes(mins)
  return d
}

// نافذة يوم العمل: البصمات المنسوبة لهذا التاريخ [from, to] وخط دقائقه. الوردية
// الليلية نهايتها end+1440، وأوقاتها بلا تاريخ (تصحيح/نافذة/إذن) تُنقل للخط الممتد
interface WorkdayFrame {
  from: Date // أول لحظة
  to: Date // آخر لحظة (شاملة)
  overnight: boolean // وردية اليوم تعبر منتصف الليل
  prevOvernight: boolean // وردية الأمس تعبر منتصف الليل — حدّها يتبع بداية اليوم
  // لحظة بصمة → HH:mm على خط اليوم (صباح الغد يتجاوز 24:00)
  clock(d: Date): string
  // وقت بلا تاريخ → خط اليوم: الأقرب لمرساه (الدخول لبداية الوردية، الخروج
  // لنهايتها في الغد) — بلا ليلية كما هو
  onLine(t: string, anchor: 'start' | 'end'): string
  // نافذة إذن (دقائق ساعة الحائط) → خط اليوم حول منتصف الوردية، والنهاية بعد البداية
  window<T extends { from: number; to: number }>(w: T): T
}

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

// كود البصمة = عمود attendance_punches.employeeCode (20 خانة)
const PUNCH_CODE_MAX = 20
// بصمة بعد «الآن» تُرفض — سماحية 5 دقائق لفرق ساعة الجهاز عن الخادم
const FUTURE_PUNCH_TOLERANCE_MS = 5 * 60 * 1000

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

  // A payroll calculation already owns the employee lock. Rebind repositories
  // locally so nested attendance/OT reads and writes share its transaction.
  private inManager(em: EntityManager): AttendanceService {
    const scoped = Object.assign(Object.create(Object.getPrototypeOf(this)), this) as AttendanceService
    const names = ['punches', 'schedule', 'days', 'employees', 'overtime', 'corrections',
      'config', 'leaves', 'requests', 'holidays', 'branches', 'dayOverrides', 'scheduleRules',
      'overtimePeriods', 'permissionTypes', 'workSchedules', 'shiftsCatalog'] as const
    for (const name of names) (scoped as any)[name] = em.getRepository(this[name].target as any)
    return scoped
  }

  private async financiallyClosedDay(employeeId: number, date: string) {
    const rows = await this.days.manager.query(`SELECT TOP (1) r.id FROM dbo.payroll_runs r
      WHERE r.status IN ('APPROVED','PAID') AND r.startDate<=@0 AND r.endDate>=@0
      AND (EXISTS (SELECT 1 FROM dbo.payroll_items i WHERE i.runId=r.id AND i.employeeId=@1)
        OR EXISTS (SELECT 1 FROM dbo.payroll_run_members m WHERE m.runId=r.id AND m.employeeId=@1
          AND (m.membershipStatus IS NULL OR m.membershipStatus='INCLUDED')))
      AND ${payrollLineNotReversedSql('r.id', '@1')}`, [date, employeeId])
    return rows.length > 0
  }

  private requireCalendar(day: ResolvedCalendarDay) {
    if (day.state !== 'AVAILABLE' || day.working === null || day.dayKind === null) {
      throw new ConflictException({ code: 'ATTENDANCE_CALENDAR_UNAVAILABLE', message: day.issues.map(issue => issue.message).join('؛ ') || 'تقويم هذا اليوم غير مثبت؛ راجع بيانات السريان' })
    }
    return day as ResolvedCalendarDay & { working: boolean; dayKind: 'WORKING' | 'WEEKEND' | 'HOLIDAY' }
  }

  async calendarDay(employeeId: number, date: string, cache?: CalendarResolverCache) {
    return this.requireCalendar(await resolveEmployeeCalendarDay(this.days.manager, employeeId, date, { cache }))
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
    // المدى كامل بلا قصّ صامت (كان 92 يوماً: مرضية 121 يوم عمل تُحسب 64 وتعدّي
    // maxDays) — والأطول من سنة يُرفض صراحةً
    const span = Math.round((to.getTime() - from.getTime()) / 86400000) + 1
    if (span > MAX_RANGE_DAYS) {
      throw new BadRequestException(
        `المدى ${span} يوماً أطول من الحد المسموح (${MAX_RANGE_DAYS} يوماً) — قسّمه على أكثر من طلب`
      )
    }
    // كل يوم يُحسم بنسخة التقويم السارية فيه، لا بعطلة يوم فتح الشاشة.
    const cache = createCalendarResolverCache(this.days.manager)
    let total = 0
    let working = 0
    const skipped: string[] = []
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      total++
      if (!this.requireCalendar(await resolveBranchCalendarDay(this.days.manager, branchId, date, { weekendOverride, cache })).working) skipped.push(date)
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
    const calendar = this.requireCalendar(await resolveBranchCalendarDay(this.days.manager, branchId, date, { weekendOverride }))
    return !calendar.working
  }

  // تصنيف اليوم لأغراض مُضاعِف الأوفرتايم: يوم عمل / عطلة أسبوعية / عطلة رسمية
  // (العطلة الرسمية تُميَّز عن الويك إند لأن مُضاعِفها قد يختلف)
  async dayKind(
    date: string,
    branchId: number,
    weekendOverride?: string
  ): Promise<'WORKING' | 'WEEKEND' | 'HOLIDAY'> {
    return this.requireCalendar(await resolveBranchCalendarDay(this.days.manager, branchId, date, { weekendOverride })).dayKind
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

  async calendarContext(user: JwtPayload, scope: 'GLOBAL' | 'BRANCH' | 'EMPLOYEE', sourceId: number) {
    return this.days.manager.transaction(em => calendarSourceContext(em, user, scope, sourceId))
  }

  async confirmCalendarContext(user: JwtPayload, scope: 'GLOBAL' | 'BRANCH' | 'EMPLOYEE', sourceId: number, change: unknown) {
    return this.days.manager.transaction(em => confirmCalendarSource(em, user, scope, sourceId, change as any))
  }

  listScheduleRules(user: JwtPayload) {
    const scope = branchScopeOf(user)
    return this.scheduleRules.find({ where: scope === null ? {} : [{ branchId: IsNull() }, { branchId: scope }], order: { id: 'ASC' } })
  }

  private validateScheduleRule(data: Record<string, any>) {
    if (typeof data.name !== 'string' || !data.name.trim() || data.name.trim().length > 200) throw new BadRequestException('اسم القاعدة مطلوب ولا يتجاوز 200 حرف')
    if (!this.WEEKDAYS_VALID.includes(data.weekday)) throw new BadRequestException('اليوم غير صالح')
    if (!this.OCC_VALID.includes(data.occurrence)) throw new BadRequestException('التكرار غير صالح')
    if (!['WORK', 'OFF'].includes(data.effect)) throw new BadRequestException('الأثر: WORK أو OFF')
    if (data.branchId != null && (!Number.isInteger(data.branchId) || data.branchId < 1 || data.branchId > 2147483647)) throw new BadRequestException('فرع القاعدة غير صالح')
    if (typeof data.isActive !== 'boolean') throw new BadRequestException('تفعيل القاعدة يجب أن يكون قيمة منطقية')
    return { name: data.name.trim(), weekday: data.weekday, occurrence: data.occurrence, effect: data.effect, branchId: data.branchId ?? null, isActive: data.isActive }
  }

  async createScheduleRule(dto: Record<string, any>, user: JwtPayload) {
    const data = this.validateScheduleRule({ ...dto, isActive: dto.isActive ?? true })
    return this.days.manager.transaction(async em => {
      await lockAttendanceRuleMutation(em)
      const scope = data.branchId == null ? 'GLOBAL' : 'BRANCH', sourceId = data.branchId ?? 0
      await assertCalendarScope(user, scope, sourceId, em, true)
      const before = await beginCalendarChange(em, scope, sourceId, dto.calendarChange, user.sub)
      const saved = await em.getRepository(ScheduleExceptionRule).save(data)
      await finishCalendarChange(em, before, dto.calendarChange, user.sub)
      return saved
    })
  }

  async updateScheduleRule(id: number, dto: Record<string, any>, user: JwtPayload) {
    return this.days.manager.transaction(async em => {
      await lockAttendanceRuleMutation(em)
      const repo = em.getRepository(ScheduleExceptionRule), rule = await repo.findOneBy({ id })
      if (!rule) throw new NotFoundException('القاعدة غير موجودة')
      const scope = rule.branchId == null ? 'GLOBAL' : 'BRANCH', sourceId = rule.branchId ?? 0
      await assertCalendarScope(user, scope, sourceId, em, true)
      if (dto.branchId !== undefined && (dto.branchId ?? null) !== (rule.branchId ?? null)) throw new BadRequestException('نطاق القاعدة ثابت لحفظ تاريخه؛ أنشئ قاعدة في النطاق الجديد ثم عطّل السابقة')
      const data = this.validateScheduleRule({ ...rule, ...dto })
      const before = await beginCalendarChange(em, scope, sourceId, dto.calendarChange, user.sub)
      const saved = await repo.save(Object.assign(rule, data))
      await finishCalendarChange(em, before, dto.calendarChange, user.sub)
      return saved
    })
  }

  async deleteScheduleRule(id: number, user: JwtPayload, change: unknown) {
    return this.days.manager.transaction(async em => {
      await lockAttendanceRuleMutation(em)
      const repo = em.getRepository(ScheduleExceptionRule), rule = await repo.findOneBy({ id })
      if (!rule) throw new NotFoundException('القاعدة غير موجودة')
      const scope = rule.branchId == null ? 'GLOBAL' : 'BRANCH', sourceId = rule.branchId ?? 0
      await assertCalendarScope(user, scope, sourceId, em, true)
      const before = await beginCalendarChange(em, scope, sourceId, change as any, user.sub)
      await repo.delete({ id })
      await finishCalendarChange(em, before, change as any, user.sub)
      return { deleted: true }
    })
  }

  // ===== فترات فتح/قفل الأوفرتايم بالتواريخ =====
  // القرار: فترة تغطّي اليوم؟ CLOSED يحسم، وإلا OPEN يفتح، وإلا المفتاح العام
  async isOvertimeOpen(date: string, branchId: number): Promise<boolean> {
    return (await this.overtimeWindow(date, branchId)).open
  }

  private async overtimeWindow(date: string, branchId: number): Promise<OvertimeEvidence['window']> {
    const periods = await this.overtimePeriods.find({ where: { isActive: true } })
    const covering = periods.filter(
      (p) =>
        (p.branchId == null || p.branchId === branchId) &&
        p.fromDate <= date &&
        p.toDate >= date
    )
    const closed = covering.filter(p => p.effect === 'CLOSED')
    const governing = (closed.length ? closed : covering.filter(p => p.effect === 'OPEN')).sort((a, b) => a.id - b.id)
    return { open: closed.length ? false : governing.length ? true : (await this.configValue('overtime.enabled', 'true')) === 'true',
      governingWindowIds: governing.map(p => p.id), reason: governing.map(p => p.name).join('، ') || 'الإعداد العام للإضافي خارج الفترات المحددة' }
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

  // كتابات الحضور (بصمة يدوية/جدول/تجاوز يوم/تأكيد أوفرتايم) بنطاق فرع
  // المستخدم، وممنوعة على الموظف نفسه (لا اعتماد للذات) — null = مسموح
  private writeBlock(user: JwtPayload, emp: Employee, selfMessage: string): string | null {
    const scope = branchScopeOf(user)
    if (scope !== null && emp.branchId !== scope) return 'الموظف خارج نطاق فرعك'
    if (user.employeeId != null && emp.id === user.employeeId) return selfMessage
    return null
  }

  private assertCanWrite(user: JwtPayload, emp: Employee, selfMessage: string) {
    const reason = this.writeBlock(user, emp, selfMessage)
    if (reason) throw new ForbiddenException(reason)
  }

  // ===== استقبال بصمات ZKTeco (دفعة) — مفتاح الجهاز أو JWT =====
  // مصدر الجهاز (مفتاح، أو مزامنة داخلية fromDevice) يُبلّغ عن العنصر المرفوض
  // ويكمل الباقي؛ الإدخال اليدوي صارم: عنصر غير صالح/مستقبلي/خارج النطاق يرفض الدفعة
  async ingest(
    punchesDto: PunchDto[],
    deviceKey?: string,
    user?: JwtPayload,
    // reason = سبب الإدخال اليدوي — يُحفظ على كل بصمة مع مُدخِلها
    opts?: { fromDevice?: boolean; reason?: string }
  ) {
    const fromDevice = !user || !!opts?.fromDevice
    if (!user) {
      // المفتاح الافتراضي المنشور في الريبو أو القصير = استقبال مفتوح لأي أحد
      const expected = await this.configValue('attendance.device_key', '')
      const weak = deviceKeyWeakness(expected)
      if (weak) {
        throw new UnauthorizedException(
          `${weak} — استقبال البصمات من الأجهزة موقوف حتى يُضبط مفتاح عشوائي لا يقل عن ${DEVICE_KEY_MIN_LENGTH} حرفاً (الإعدادات ← الحضور)`
        )
      }
      if (deviceKey !== expected) {
        throw new UnauthorizedException('مفتاح الجهاز غير صحيح')
      }
    }
    const rejected: Array<{
      index: number
      employeeCode: string
      reason: 'invalid' | 'future'
      message: string
    }> = []
    const summary = (saved: AttendancePunch[], recomputedDays: number) => ({
      received: saved.length,
      matched: saved.filter((r) => r.employeeId).length,
      recomputedDays,
      rejectedFuture: rejected.filter((r) => r.reason === 'future').length,
      rejectedInvalid: rejected.filter((r) => r.reason === 'invalid').length,
      rejected: rejected.slice(0, 100), // أول المرفوض بالتفصيل (للوسيط/الجهاز)
    })
    if (!punchesDto?.length) return summary([], 0)

    // تحقّق كل عنصر على حدة: كود 1-20 خانة + وقت صالح غير مستقبلي
    const latest = Date.now() + FUTURE_PUNCH_TOLERANCE_MS
    const items: Array<{ code: string; punchTime: Date; deviceSn?: string }> = []
    punchesDto.forEach((p, index) => {
      const raw = p?.employeeCode as unknown
      const code =
        typeof raw === 'number' ? String(raw) : typeof raw === 'string' ? raw.trim() : ''
      const reject = (reason: 'invalid' | 'future', message: string) => {
        rejected.push({ index, employeeCode: code, reason, message })
      }
      if (!code || code.length > PUNCH_CODE_MAX) {
        return reject('invalid', `كود الموظف مفقود أو أطول من ${PUNCH_CODE_MAX} خانة`)
      }
      if (p.deviceSn != null && (typeof p.deviceSn !== 'string' || p.deviceSn.length > 50)) {
        return reject('invalid', 'رقم الجهاز (deviceSn) غير صالح')
      }
      const punchTime =
        typeof p.timestamp === 'string'
          ? new Date(p.timestamp.trim().replace(' ', 'T'))
          : new Date(NaN)
      if (Number.isNaN(punchTime.getTime())) {
        return reject('invalid', 'وقت البصمة غير صالح')
      }
      if (punchTime.getTime() > latest) {
        return reject('future', `وقت البصمة ${p.timestamp} في المستقبل — لا تُقبل بصمة بعد الآن`)
      }
      items.push({ code, punchTime, deviceSn: p.deviceSn || undefined })
    })
    // الإدخال اليدوي لا يُحفظ جزئياً — رسالة واضحة بأول العناصر المرفوضة
    if (!fromDevice && rejected.length > 0) {
      throw new BadRequestException(
        rejected
          .slice(0, 5)
          .map((r) => `البصمة ${r.index + 1}${r.employeeCode ? ` (${r.employeeCode})` : ''}: ${r.message}`)
          .join('، ')
      )
    }

    // المطابقة برقم البصمة (fingerprintCode) أولاً ثم الكود الوظيفي —
    // دفعات من الأكواد (حد معاملات SQL Server)
    const codes = [...new Set(items.map((i) => i.code))]
    const emps: Employee[] = []
    for (let i = 0; i < codes.length; i += 500) {
      const chunk = codes.slice(i, i + 500)
      emps.push(
        ...(await this.employees.find({
          where: [{ fingerprintCode: In(chunk) }, { employeeCode: In(chunk) }],
        }))
      )
    }
    const byFingerprint = new Map<string, Employee>()
    const byCode = new Map<string, Employee>()
    for (const e of emps) {
      if (e.fingerprintCode) byFingerprint.set(e.fingerprintCode, e)
      byCode.set(e.employeeCode, e)
    }
    const resolve = (code: string) => byFingerprint.get(code) ?? byCode.get(code)

    // الإدخال اليدوي: لموظف مسجّل داخل نطاق فرع المُدخِل، ولا لنفسه
    if (!fromDevice && user) {
      const scope = branchScopeOf(user)
      for (const it of items) {
        const emp = resolve(it.code)
        if (!emp) {
          // بصمة يتيمة من مستخدم مقيّد بفرع قد تُنسب لاحقاً لموظف فرع آخر عند ربط الكود
          if (scope !== null) {
            throw new BadRequestException(
              `الكود ${it.code} لا يطابق أي موظف — الإدخال اليدوي لموظف مسجّل فقط`
            )
          }
          continue
        }
        this.assertCanWrite(user, emp, 'لا يمكنك إدخال بصمات يدوية لنفسك — يُدخلها مسؤول آخر')
      }
    }

    const rows: AttendancePunch[] = []
    const affected = new Set<string>() // employeeId|date
    for (const it of items) {
      const emp = resolve(it.code)
      const punchTime = it.punchTime
      rows.push(
        this.punches.create({
          employeeCode: it.code,
          employeeId: emp?.id,
          punchTime,
          deviceSn: it.deviceSn,
          // المصدر ومُدخِل اليدوي وسببه — كانت البصمة اليدوية بلا أثر لمن حقنها ولماذا
          source: fromDevice ? 'DEVICE' : 'MANUAL',
          createdByUserId: fromDevice ? undefined : user?.sub,
          reason: fromDevice ? undefined : opts?.reason?.trim() || undefined,
        })
      )
      if (emp) {
        // يوم البصمة بتوقيت الشركة — toISOString (UTC) كانت تنسب بصمة 00:00-02:59
        // لليوم السابق فيُعاد حساب اليوم الغلط
        affected.add(`${emp.id}|${localDateOf(punchTime)}`)
      }
    }
    if (rows.length > 0) await this.punches.save(rows)

    // Resolve after saving: the morning punch can belong to last night's shift.
    // Resolving calendar dates alone leaves the previous workday incomplete.
    affected.clear()
    const claims = new Map<string, Date | null>()
    for (const row of rows) {
      if (row.employeeId) affected.add(`${row.employeeId}|${await this.workDateOf(row.employeeId, row.punchTime, claims)}`)
    }

    // إعادة حساب الأيام المتأثرة فوراً
    for (const key of affected) {
      const [employeeId, date] = key.split('|')
      await this.computeDay(Number(employeeId), date)
    }
    return summary(rows, affected.size)
  }

  // شهر YYYY-MM (الافتراضي: الشهر الجاري محلياً) → أول وآخر يوم
  private monthRange(month?: string): { month: string; from: string; to: string } {
    const m = month || localDateOf(new Date()).slice(0, 7)
    const [yy, mm] = m.split('-').map(Number)
    if (!/^\d{4}-\d{2}$/.test(m) || mm < 1 || mm > 12) {
      throw new BadRequestException('صيغة الشهر YYYY-MM')
    }
    const lastDay = String(new Date(yy, mm, 0).getDate()).padStart(2, '0')
    return { month: m, from: `${m}-01`, to: `${m}-${lastDay}` }
  }

  // ===== سجل البصمات بمصدرها (شاشة الإدخال اليدوي) =====
  // بصمات شهر بمصدرها (MANUAL افتراضياً) بنطاق الفرع: من أدخلها ولماذا وحالة يوم
  // الحضور الذي طُبّقت عليه — الشاشة كانت تحفظ القائمة في الجلسة فقط بحالة «معتمد»
  // ثابتة. اليدوية تُطبَّق فوراً (لا مسار اعتماد لها)، فحالتها الحقيقية حالة يومها
  async listPunches(user: JwtPayload, q: { source?: string; month?: string }) {
    const source = String(q.source || 'MANUAL').toUpperCase() as PunchSource
    if (source !== 'MANUAL' && source !== 'DEVICE') {
      throw new BadRequestException('المصدر (source): MANUAL أو DEVICE')
    }
    const { from, to } = this.monthRange(q.month)
    const qb = this.punches
      .createQueryBuilder('p')
      .where('p.source = :source', { source })
      .andWhere('p.punchTime BETWEEN :from AND :to', {
        from: new Date(`${from}T00:00:00`),
        to: new Date(`${to}T23:59:59`),
      })
      .orderBy('p.punchTime', 'DESC')
      .addOrderBy('p.id', 'DESC')
      .take(2000)
    // نطاق الفرع: بصمات موظفي فرع المستخدم (اليتيمة بلا موظف لمدير النظام فقط)
    const scope = branchScopeOf(user)
    if (scope !== null) {
      qb.andWhere('p.employeeId IN (SELECT e.id FROM employees e WHERE e.branchId = :scope)', {
        scope,
      })
    }
    const rows = await qb.getMany()
    const empIds = [...new Set(rows.map((p) => p.employeeId).filter((id): id is number => !!id))]
    const userIds = [
      ...new Set(rows.map((p) => p.createdByUserId).filter((id): id is number => !!id)),
    ]
    const [emps, creators, dayRows] = await Promise.all([
      empIds.length ? this.employees.find({ where: { id: In(empIds) } }) : [],
      userIds.length
        ? this.punches.manager.getRepository(User).find({
            select: { id: true, displayName: true },
            where: { id: In(userIds) },
          })
        : [],
      // يوم قبل بداية الشهر: خروج وردية ليلية صباح اليوم الأول يتبع يوم أمسه
      empIds.length
        ? this.days.find({
            where: { employeeId: In(empIds), date: Between(dateAfter(from, -1), to) },
          })
        : [],
    ])
    const empById = new Map(emps.map((e) => [e.id, e]))
    const nameById = new Map(creators.map((u) => [u.id, u.displayName]))
    const dayByKey = new Map(dayRows.map((d) => [`${d.employeeId}|${d.date}`, d]))
    const mayManage = userHasPerm(user, 'attendance.manage')
    return rows.map((p) => {
      const t = new Date(p.punchTime)
      const date = localDateOf(t)
      const time = hhmmOf(t)
      const emp = p.employeeId ? empById.get(p.employeeId) : undefined
      // يوم الحضور الذي طُبّقت عليه: صباحٌ هو خروج وردية ليلية من الأمس يتبع يومها
      const prev = p.employeeId
        ? dayByKey.get(`${p.employeeId}|${dateAfter(date, -1)}`)
        : undefined
      const day =
        prev && isOvernight(prev.shiftStart, prev.shiftEnd) && prev.checkOut === time
          ? prev
          : p.employeeId
            ? dayByKey.get(`${p.employeeId}|${date}`)
            : undefined
      const received = p.receivedAt ? new Date(p.receivedAt) : null
      return {
        id: p.id,
        employeeId: p.employeeId ?? null,
        employeeCode: p.employeeCode,
        employeeName: emp?.fullName ?? null,
        date,
        time,
        source: p.source,
        deviceSn: p.deviceSn ?? null,
        reason: p.reason ?? null,
        createdByUserId: p.createdByUserId ?? null,
        createdByName: p.createdByUserId ? (nameById.get(p.createdByUserId) ?? null) : null,
        receivedAt: received ? `${localDateOf(received)} ${hhmmOf(received)}` : null,
        workDate: day?.date ?? date,
        dayStatus: day?.status ?? null,
        // الحذف لليدوية فقط، بصلاحية الإدارة وداخل النطاق ولا لنفسه (كالإدخال)
        canDelete:
          p.source === 'MANUAL' &&
          mayManage &&
          (emp ? this.writeBlock(user, emp, 'self') === null : scope === null),
      }
    })
  }

  // حذف بصمة يدوية ثم إعادة حساب يومها — بصمة الجهاز سجل خام لا يُحذف (يُصحَّح
  // بطلب تصحيح بصمة). بصلاحية الإدارة، داخل نطاق الفرع، ولا يحذف أحد بصمته
  async deleteManualPunch(user: JwtPayload, id: number) {
    const p = await this.punches.findOne({ where: { id } })
    if (!p) throw new NotFoundException('البصمة غير موجودة')
    if (p.source !== 'MANUAL') {
      throw new BadRequestException(
        'لا تُحذف إلا البصمات اليدوية — بصمة الجهاز سجل خام يُصحَّح بطلب تصحيح بصمة'
      )
    }
    const emp = p.employeeId
      ? await this.employees.findOne({ where: { id: p.employeeId } })
      : null
    if (emp) {
      this.assertCanWrite(user, emp, 'لا يمكنك حذف بصمة يدوية لنفسك — يحذفها مسؤول آخر')
    } else if (branchScopeOf(user) !== null) {
      throw new ForbiddenException('بصمة بلا موظف مطابق — يحذفها مدير النظام')
    }
    const t = new Date(p.punchTime)
    // يوم العمل الذي تُنسب له (صباحٌ يُكمل وردية ليلية من الأمس يتبعها) — قبل الحذف
    const workDate = emp ? await this.workDateOf(emp.id, t, new Map()) : localDateOf(t)
    await this.punches.delete({ id })
    this.logger.log(
      `حُذفت بصمة يدوية #${id} (${p.employeeCode} ${localDateOf(t)} ${hhmmOf(t)}) بواسطة المستخدم #${user.sub}`
    )
    let recomputed = false
    if (emp) {
      try {
        await this.computeDay(emp.id, workDate)
        recomputed = true
      } catch (e) {
        this.logger.warn(
          `تعذر إعادة حساب يوم ${workDate} للموظف ${emp.id} بعد حذف بصمة يدوية: ${(e as Error).message}`
        )
      }
    }
    return { deleted: true, employeeId: p.employeeId ?? null, date: workDate, recomputed }
  }

  // ربط البصمات اليتيمة بأثر رجعي — بعد ضبط/تغيير رقم البصمة أو الكود الوظيفي:
  // البصمات غير المطابقة بنفس الكود تُنسب للموظف ثم تُعاد أيامها. من تاريخ
  // الالتحاق فقط (كود أُعيد استخدامه لا يورّث بصمات صاحبه القديم)، والمستقبلية
  // تبقى يتيمة. المدى القصير يُحسب فوراً والطويل (مئات الأيام) في الخلفية
  async relinkUnmatchedPunches(
    emp: Pick<Employee, 'id' | 'employeeCode' | 'fingerprintCode' | 'joinDate'>
  ): Promise<{ relinked: number; days: number }> {
    const codes = [
      ...new Set(
        [emp.fingerprintCode, emp.employeeCode]
          .map((c) => (c ?? '').trim())
          .filter((c) => c && c.length <= PUNCH_CODE_MAX)
      ),
    ]
    if (codes.length === 0) return { relinked: 0, days: 0 }
    // كود مسجّل رقمَ بصمة لموظف آخر يخصّه هو (رقم البصمة أولاً في المطابقة)
    const owners = await this.employees.find({ where: { fingerprintCode: In(codes) } })
    const usable = codes.filter(
      (c) => !owners.some((o) => o.id !== emp.id && o.fingerprintCode === c)
    )
    if (usable.length === 0) return { relinked: 0, days: 0 }
    const upTo = new Date(Date.now() + FUTURE_PUNCH_TOLERANCE_MS)
    const orphans = await this.punches.find({
      select: { id: true, punchTime: true },
      where: {
        employeeId: IsNull(),
        employeeCode: In(usable),
        punchTime: emp.joinDate
          ? Between(new Date(`${emp.joinDate}T00:00:00`), upTo)
          : LessThanOrEqual(upTo),
      },
    })
    if (orphans.length === 0) return { relinked: 0, days: 0 }
    const ids = orphans.map((p) => p.id)
    for (let i = 0; i < ids.length; i += 1000) {
      await this.punches.update({ id: In(ids.slice(i, i + 1000)) }, { employeeId: emp.id })
    }
    const dates = [...new Set(orphans.map((p) => localDateOf(new Date(p.punchTime))))].sort()
    const recompute = async () => {
      for (const date of dates) {
        try {
          await this.computeDay(emp.id, date)
        } catch (e) {
          this.logger.warn(
            `تعذر إعادة حساب ${date} للموظف ${emp.id} بعد ربط البصمات: ${(e as Error).message}`
          )
        }
      }
    }
    if (dates.length <= 31) await recompute()
    else void recompute()
    return { relinked: ids.length, days: dates.length }
  }

  // الوردية الحيّة من الكتالوج — المصدر الوحيد لأوقاتها. NULL = صف قديم
  // بلا مرجع أو وردية محذوفة، فتُستخدم اللقطة المخزّنة كاحتياطي
  private async liveShift(shiftId?: number | null) {
    if (!shiftId) return null
    return this.shiftsCatalog.findOne({ where: { id: shiftId } })
  }

  // مرجع الوردية من اسمها — لملء shiftId عند الإسناد ولترقية الصفوف القديمة
  private async shiftIdByName(name?: string) {
    if (!name) return null
    const row = await this.shiftsCatalog.findOne({ where: { name } })
    return row?.id ?? null
  }

  private async scheduleShift(input: { shiftId?: number; shiftName?: string; startTime?: string; endTime?: string }, dates: string[]) {
    let shift: Shift | null
    if (input.shiftId != null) {
      if (!Number.isInteger(input.shiftId) || input.shiftId < 1) throw new BadRequestException('مرجع الوردية غير صالح')
      // العمود الحي قد يحمل تعطيلًا مستقبليًا؛ صلاحية الإسناد تُحسم بتاريخ يومه.
      shift = await this.shiftsCatalog.findOneBy({ id: input.shiftId })
      if (!shift) throw new BadRequestException('الوردية غير موجودة')
    } else {
      const time = /^([01]\d|2[0-3]):[0-5]\d$/
      if (!input.shiftName?.trim() || !time.test(input.startTime ?? '') || !time.test(input.endTime ?? '')) {
        throw new BadRequestException('الوردية تحتاج مرجعاً صالحاً أو اسماً وبداية ونهاية بصيغة HH:mm')
      }
      shift = await this.shiftsCatalog.findOneBy({ name: input.shiftName })
      // عميل قديم بلا مصدر معروف يحتفظ بالاسم والأوقات المرسلة؛ لا نخترع له نسخة.
      if (!shift) return { shiftId: null, shiftName: input.shiftName, startTime: input.startTime!, endTime: input.endTime! }
    }
    // المصدر القديم المعطل بلا أي تاريخ غير صالح للطلب كله؛ نحافظ على رفضه
    // المبكر. وجود نسخ مؤرخة يستلزم فحص كل يوم، فقد يسبق تعطيلًا مستقبليًا.
    if (dates.length === 0 && shift.isActive === false && !(await this.days.manager.existsBy(AttendanceRuleVersion, {
      sourceType: 'SHIFT', sourceId: shift.id,
    }))) throw new BadRequestException('الوردية غير نشطة')
    let settings: Shift = shift
    for (const [index, date] of [...new Set(dates)].entries()) {
      const resolved = await resolveAttendanceRule(this.days.manager, 'SHIFT', shift.id, attendanceRuleDate(date), shift)
      if (resolved.unavailable || resolved.snapshot.isActive === false) {
        throw new BadRequestException(`الوردية غير سارية أو غير نشطة في ${date}؛ اختر وردية صالحة لكل أيام الإسناد أو استخدم تجاوزًا للأيام المناسبة`)
      }
      // لقطة الإسناد من أول يوم فعلي، لا من إعدادات مستقبلية في الصف الحي.
      if (index === 0) settings = resolved.snapshot
    }
    return { shiftId: shift.id, shiftName: settings.name, startTime: settings.startTime, endTime: settings.endTime }
  }

  // ===== الورديات الليلية: البصمات تُنسب لنافذة الوردية لا لليوم التقويمي =====
  // هل تمتدّ وردية يومٍ ليلية لصباح الغد، وحتى أي لحظة؟ الحدّ = منتصف الفجوة بين
  // نهايتها وبداية وردية الغد (بلا وردية غداً = بداية الليلة نفسها): ليلتان
  // 22:00-06:00 متتاليتان تنقسمان عند 14:00، وليلة يليها صباحي 08:00 عند 07:00.
  // يوم عطلة/إجازة كاملة لم يُبصم مساؤه ولا صُحّح دخوله لا يمتدّ — وإلا تُنسب بصمة
  // دخول مبكرة لوردية الغد لليلة لم تُعمل. null = لا امتداد
  private async nightClaimUntil(
    employeeId: number,
    date: string,
    shift: { start: string; end: string; source: ScheduleSource },
    next?: { start: string; source: ScheduleSource }
  ): Promise<Date | null> {
    if (shift.source === 'none' || !isOvernight(shift.start, shift.end)) return null
    const start = toMinutes(shift.start)
    const end = toMinutes(shift.end) + 1440
    // مساء اليوم = من منتصف الفجوة بين النهاية والبداية حتى منتصف الليل
    const eveningFrom = atMinute(date, Math.floor((toMinutes(shift.end) + start) / 2))
    const eveningPunches = await this.punches.count({
      where: {
        employeeId,
        punchTime: Between(eveningFrom, new Date(atMinute(date, 1440).getTime() - 1000)),
      },
    })
    if (eveningPunches === 0) {
      const corrections = await this.corrections.find({ where: { employeeId, date } })
      const correctedIn = corrections.some((c) => {
        try {
          return !!JSON.parse(c.correctedPunch ?? '{}').in
        } catch {
          return false
        }
      })
      if (!correctedIn && !(await this.expectsWork(employeeId, date))) return null
    }
    const nxt = next ?? (await this.shiftFor(employeeId, dateAfter(date, 1)))
    const nextStart =
      1440 + (nxt.source !== 'none' && nxt.start ? toMinutes(nxt.start) : start)
    return atMinute(date, nextStart > end ? Math.floor((end + nextStart) / 2) : end)
  }

  // يوم عمل متوقَّع للموظف؟ (لا عطلة أسبوعية/رسمية بحسب جدول عمله وفرعه — كما في
  // computeDay — ولا إجازة كاملة معتمدة)
  private async expectsWork(employeeId: number, date: string): Promise<boolean> {
    const emp = await this.employees.findOne({ where: { id: employeeId } })
    if (!emp) return false
    if (!(await this.calendarDay(employeeId, date)).working) {
      return false
    }
    const leaves = await this.leaves.find({
      where: {
        employeeId,
        status: 'APPROVED',
        fromDate: LessThanOrEqual(date),
        toDate: MoreThanOrEqual(date),
      },
    })
    return !leaves.some((l) => (l.period ?? 'FULL') === 'FULL')
  }

  // نافذة بصمات يوم العمل: اليوم التقويمي، إلا أن صباحه يتبع ليلة الأمس حتى حدّها،
  // وليلته (إن كانت ورديته ليلية) تمتدّ لصباح الغد حتى حدّها (nightClaimUntil)
  private async workdayFrame(
    employeeId: number,
    date: string,
    shift: { start: string; end: string; source: ScheduleSource }
  ): Promise<WorkdayFrame> {
    const prevDate = dateAfter(date, -1)
    const prev = await this.shiftFor(employeeId, prevDate)
    const prevOvernight = prev.source !== 'none' && isOvernight(prev.start, prev.end)
    const fromCut = prevOvernight
      ? await this.nightClaimUntil(employeeId, prevDate, prev, shift)
      : null
    const overnight = shift.source !== 'none' && isOvernight(shift.start, shift.end)
    const toCut = overnight ? await this.nightClaimUntil(employeeId, date, shift) : null
    const midnight = atMinute(date, 0)
    const start = overnight ? toMinutes(shift.start) : 0
    const end = overnight ? toMinutes(shift.end) + 1440 : 0
    // دقائق ساعة الحائط → خط اليوم: m أو m+1440 أيهما أقرب للمرساة
    const at = (m: number, anchor: number) =>
      overnight && Math.abs(m + 1440 - anchor) < Math.abs(m - anchor) ? m + 1440 : m
    return {
      from: fromCut && fromCut > midnight ? fromCut : midnight,
      to: new Date((toCut ?? atMinute(date, 1440)).getTime() - 1000),
      overnight,
      prevOvernight,
      clock: (d) =>
        hhmmExt((localDateOf(d) > date ? 1440 : 0) + d.getHours() * 60 + d.getMinutes()),
      onLine: (t, anchor) =>
        overnight ? hhmmExt(at(toMinutes(t), anchor === 'start' ? start : end)) : t,
      window: (w) => {
        if (!overnight) return w
        const from = at(w.from, (start + end) / 2)
        const to = at(w.to, (start + end) / 2)
        return { ...w, from, to: to < from ? to + 1440 : to }
      },
    }
  }

  // نوافذ البصمة لوردية ليلية على خط يوم العمل: نافذة الدخول حول البداية ونافذة
  // الخروج حول النهاية في صباح الغد (05:00-09:00 → 29:00-33:00) — نسخة للحساب
  // فقط، لا يُمسّ كيان الكتالوج
  private nightWindows(sc: Shift | null, frame: WorkdayFrame): Shift | null {
    if (!sc || !frame.overnight) return sc
    const map = (t: string, anchor: 'start' | 'end') => (t ? frame.onLine(t, anchor) : t)
    return {
      ...sc,
      checkinFrom: map(sc.checkinFrom, 'start'),
      checkinTo: map(sc.checkinTo, 'start'),
      checkoutFrom: map(sc.checkoutFrom, 'end'),
      checkoutTo: map(sc.checkoutTo, 'end'),
    }
  }

  // يوم العمل الذي تُنسب له بصمة: صباحٌ تمتدّ إليه ليلة الأمس يتبعها (06:05 تُكمل
  // وردية 22:00-06:00 من الأمس)، وإلا يومها التقويمي. claims = ذاكرة الحدود لكل
  // موظف/يوم داخل الدفعة
  private async workDateOf(
    employeeId: number,
    t: Date,
    claims: Map<string, Date | null>
  ): Promise<string> {
    const day = localDateOf(t)
    const prev = dateAfter(day, -1)
    const key = `${employeeId}|${prev}`
    if (!claims.has(key)) {
      const prevShift = await this.shiftFor(employeeId, prev)
      claims.set(key, await this.nightClaimUntil(employeeId, prev, prevShift))
    }
    const cut = claims.get(key)
    return cut && t < cut ? prev : day
  }

  // ليلية: نافذة الغد تبدأ حيث تنتهي ليلة اليوم، وحدّ ليلة الأمس يتبع بداية وردية
  // اليوم — الجار المحسوب مسبقاً يُعاد (خطوة واحدة بلا تسلسل) كي لا تُعدّ بصمة في
  // يومين أو تسقط من كليهما بعد تغيّر الوردية أو وصول بصمة متأخرة
  private async recomputeNightNeighbors(
    employeeId: number,
    date: string,
    frame: WorkdayFrame,
    shiftStart: string,
    stored: { start: string; end: string } | null
  ) {
    const targets: string[] = []
    if (frame.overnight || (stored && isOvernight(stored.start, stored.end))) {
      targets.push(dateAfter(date, 1))
    }
    if (frame.prevOvernight) {
      targets.push(dateAfter(date, -1))
    }
    for (const d of targets) {
      if ((await this.days.count({ where: { employeeId, date: d } })) === 0) continue
      try {
        await this.computeDay(employeeId, d, false)
      } catch (e) {
        this.logger.warn(
          `تعذر إعادة حساب يوم ${d} للموظف ${employeeId} (جار وردية ليلية): ${(e as Error).message}`
        )
      }
    }
  }

  // ===== وردية الموظف في يوم محدد =====
  // الأولوية: تجاوز اليوم الواحد ← وردية الأسبوع ← جدول عمل الموظف ← جدول
  // العمل الافتراضي (isDefault) ← «بلا وردية». shiftId = مرجع وردية الكتالوج
  // (منه وحده تُقرأ السماحية والنوافذ — لا مطابقة بالاسم)، وsource يُخزَّن في
  // اليوم ليظهر أنه مفترَض أو بلا وردية
  async myToday(employeeId: number) {
    const date = localDateOf(new Date())
    const emp = await this.employees.findOne({ where: { id: employeeId } })
    if (!emp) return null
    const [shift, day, leaves, calendar] = await Promise.all([
      this.shiftFor(employeeId, date),
      this.days.findOne({ where: { employeeId, date } }),
      this.leaves.find({ where: {
        employeeId, status: 'APPROVED',
        fromDate: LessThanOrEqual(date), toDate: MoreThanOrEqual(date),
      }, order: { id: 'ASC' } }),
      this.calendarDay(employeeId, date),
    ])
    const workingDay = calendar.working
    const leave = leaves.find((l) => (l.period ?? 'FULL') === 'FULL') ?? leaves[0]
    const projectedDays = await this.projectExemptionDays(day ? [day] : [], [emp], date, date)
    return {
      date, day: projectedDays[0] ?? null,
      shift: shift.source === 'none' ? null : shift,
      workingDay,
      leave: workingDay && leave
        ? { leaveTypeCode: leave.leaveTypeCode, leaveType: leave.leaveTypeCode, period: leave.period ?? 'FULL' }
        : null,
    }
  }

  async shiftFor(employeeId: number, date: string): Promise<DayAttendanceShift> {
    const emp = await this.employees.findOne({ where: { id: employeeId } })
    const employeeRule = await resolveAttendanceRule(this.days.manager, 'EMPLOYEE', employeeId, date, {
      workScheduleId: emp?.workScheduleId ?? null,
      flexOverrideMode: (emp as any)?.flexOverrideMode ?? 'INHERIT',
    })
    const employeeOverrideMode: FlexOverrideMode = employeeRule.snapshot.flexOverrideMode
    const common = {
      employeeVersionId: employeeRule.versionId, employeeVersion: employeeRule.version,
      employeeOverrideMode,
    }
    const fromSource = async (
      sourceType: 'SHIFT' | 'WORK_SCHEDULE', id: number, fallback: Record<string, any>,
      source: ScheduleSource, suffix = ''
    ): Promise<DayAttendanceShift | null> => {
      const rule = await resolveAttendanceRule(this.days.manager, sourceType, id, date, fallback)
      if (rule.unavailable) return null
      const settings = rule.snapshot
      const inherited = settings.flexEnabled ?? settings.shiftMode === 'flexible'
      const enabled = employeeOverrideMode === 'ENABLED' || (employeeOverrideMode === 'INHERIT' && inherited)
      return {
        name: String(settings.name) + suffix, start: settings.startTime, end: settings.endTime,
        shiftId: sourceType === 'SHIFT' ? id : null, source, sourceType, sourceId: id,
        sourceSettings: settings, sourceVersionId: rule.versionId, sourceVersion: rule.version,
        sourceEffectiveFrom: rule.effectiveFrom, ...common, flexEnabled: !!enabled,
        flexWindowMinutes: settings.flexWindowMinutes == null ? null : Number(settings.flexWindowMinutes),
      }
    }
    const scheduled = async (row: ScheduleEntry | ScheduleDayOverride, source: ScheduleSource, suffix = '') => {
      const live = await this.liveShift(row.shiftId)
      if (row.shiftId) {
        const resolved = await fromSource('SHIFT', row.shiftId, live ?? {
          name: row.shiftName, startTime: row.startTime, endTime: row.endTime,
          flexEnabled: false, flexWindowMinutes: null,
        }, source, suffix)
        if (resolved) return resolved
        return {
          name: UNSCHEDULED_NAME, start: '', end: '', shiftId: null, source: 'none',
          sourceType: null, sourceId: null, sourceSettings: null, sourceVersionId: null,
          sourceVersion: null, sourceEffectiveFrom: null, ...common,
          flexEnabled: employeeOverrideMode === 'ENABLED', flexWindowMinutes: null,
        } as DayAttendanceShift
      }
      return {
        name: row.shiftName + suffix, start: row.startTime, end: row.endTime,
        shiftId: null, source, sourceType: null, sourceId: null, sourceSettings: null,
        sourceVersionId: null, sourceVersion: null, sourceEffectiveFrom: null, ...common,
        flexEnabled: employeeOverrideMode === 'ENABLED', flexWindowMinutes: null,
      } as DayAttendanceShift
    }
    const override = await this.dayOverrides.findOne({ where: { employeeId, date } })
    if (override) return scheduled(override, 'override', ' (يوم خاص)')
    const entry = await this.schedule.findOne({ where: { weekStart: weekKeyOf(date), employeeId } })
    if (entry) return scheduled(entry, 'week')
    const workScheduleId = employeeRule.snapshot.workScheduleId
    if (workScheduleId) {
      const ws = await this.workSchedules.findOne({ where: { id: workScheduleId } })
      if (ws) {
        const resolved = await fromSource('WORK_SCHEDULE', ws.id, ws, 'employee')
        if (resolved) return resolved
      }
    }
    // Default selection is dated too; future edits do not rewrite earlier days.
    for (const ws of await this.workSchedules.find({ order: { id: 'ASC' } })) {
      const resolved = await fromSource('WORK_SCHEDULE', ws.id, ws, 'default')
      if (resolved?.sourceSettings?.isDefault && resolved.sourceSettings.isActive) return resolved
    }
    return {
      name: UNSCHEDULED_NAME, start: '', end: '', shiftId: null, source: 'none',
      sourceType: null, sourceId: null, sourceSettings: null, sourceVersionId: null,
      sourceVersion: null, sourceEffectiveFrom: null, ...common,
      flexEnabled: employeeOverrideMode === 'ENABLED', flexWindowMinutes: null,
    }
  }

  // أيام العمل لموظف بعينه — يشتقّ عطلته الأسبوعية من جدول عمله (للإجازات)
  async workingDaysForEmployee(employeeId: number, fromDate: string, toDate: string) {
    const emp = await this.employees.findOne({ where: { id: employeeId } })
    if (!emp) throw new NotFoundException('الموظف غير موجود')
    attendanceRuleDate(fromDate); attendanceRuleDate(toDate)
    const total = Math.round((Date.parse(`${toDate}T12:00:00Z`) - Date.parse(`${fromDate}T12:00:00Z`)) / 86400000) + 1
    if (total < 1 || total > MAX_RANGE_DAYS) throw new BadRequestException(`مدى أيام العمل يجب أن يكون من يوم إلى ${MAX_RANGE_DAYS} يومًا`)
    const skipped: string[] = [], cache = createCalendarResolverCache(this.days.manager)
    for (let offset = 0; offset < total; offset++) {
      const date = dateAfter(fromDate, offset)
      if (!(await this.calendarDay(employeeId, date, cache)).working) skipped.push(date)
    }
    return { total, working: total - skipped.length, skipped }
  }

  async employeeWorkingDays(user: JwtPayload, employeeId: number, from: string, to: string) {
    if (!Number.isInteger(employeeId) || employeeId < 1) throw new BadRequestException('الموظف غير صالح')
    const emp = await this.employees.findOneBy({ id: employeeId })
    if (!emp) throw new NotFoundException('الموظف غير موجود')
    if (user.employeeId !== employeeId) {
      if (!userHasPerm(user, 'attendance.view_all')) throw new ForbiddenException('لا تملك صلاحية عرض جدول الموظف')
      const scope = branchScopeOf(user)
      if (scope !== null && scope !== emp.branchId) throw new ForbiddenException('الموظف خارج نطاق فرعك')
    }
    const [days, weekendDays] = await Promise.all([
      this.workingDaysForEmployee(employeeId, from, to),
      this.calendarWeekendDays(employeeId, emp.branchId),
    ])
    return { ...days, weekendDays }
  }

  async calendarWeekendDays(employeeId: number | null, branchId: number | null): Promise<string[]> {
    const date = localDateOf(new Date())
    const calendar = employeeId ? await resolveEmployeeCalendarDay(this.days.manager, employeeId, date)
      : branchId ? await resolveBranchCalendarDay(this.days.manager, branchId, date) : await resolveGlobalCalendarDay(this.days.manager, date)
    return this.requireCalendar(calendar).weekendDays ?? []
  }

  // ===== تجسيد الغياب (materialization) =====
  // يُنشئ صفوف الحضور لأيام العمل غير الملموسة (بلا بصمة ولا إجازة ولا تصحيح)
  // في المدى — يعيد استخدام computeDay نفسه (مصدر التصنيف الوحيد) فيصنّفها
  // 'absent'. الأيام المستثناة تُصحح دون لمس البصمات الخام. يحترم تاريخ الالتحاق
  // والأرشفة (لا غياب قبل التعيين أو بعد الأرشفة). يُرجع عدد أيام الغياب المُنشأة.
  async materializeAbsences(
    employeeId: number,
    fromDate: string,
    toDate: string,
    em?: EntityManager
  ): Promise<number> {
    if (em && em !== this.days.manager) return this.inManager(em).materializeAbsences(employeeId, fromDate, toDate, em)
    const emp = await this.employees.findOne({ where: { id: employeeId } })
    if (!emp) return 0
    const ymd = (dt: Date) =>
      `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
    // ابدأ من تاريخ التعيين إن كان داخل المدى — لا غياب قبل التعيين (قاعدة المالك: تاريخ بدء العمل الفعلي
    // إن وُجد، وإلا تاريخ الالتحاق؛ نفس أساس تغطية الراتب وattendanceEmploymentDate)
    let start = fromDate
    const hireDate = emp.actualStartDate || emp.joinDate
    if (hireDate && hireDate > start) start = hireDate
    // لا تتجاوز تاريخ الأرشفة إن وُجد
    let end = toDate
    if (emp.archivedAt) {
      const arch = ymd(new Date(emp.archivedAt))
      if (arch < end) end = arch
    }
    // ولا تتجاوز اليوم — لا غياب لأيام لم تأتِ بعد
    const today = ymd(new Date())
    if (today < end) end = today
    if (start > end) return 0

    const exemptions = await loadAttendanceExemptions(this.days.manager, employeeId, start, end)
    const calendarCache = createCalendarResolverCache(this.days.manager)
    let created = 0
    const from = new Date(`${start}T12:00:00`)
    const to = new Date(`${end}T12:00:00`)
    for (
      let d = new Date(from), i = 0;
      d <= to && i < 400;
      d.setDate(d.getDate() + 1), i++
    ) {
      const date = ymd(d)
      if (em) {
        // Rebuilding a payroll draft needs current dated quantities even for an
        // existing present/holiday row; computeDay itself preserves closed days.
        const day = await this.computeDay(employeeId, date, false)
        if (day.status === 'absent') created++
        continue
      }
      const exemption = exemptionOnDate(exemptions, date)
      const existing = await this.days.findOne({ where: { employeeId, date } })
      // EX-10/13: الاستثناء يومي؛ نصلح الغياب والتأخير القديم، وكذلك يوم exempt
      // انتهى استثناؤه. العطلة والإجازة تبقيان واضحتين، ولا نعدهما غيابًا.
      if (exemption || existing?.status === 'exempt') {
        const day = await this.computeDay(employeeId, date)
        if (day.status === 'absent') created++
        continue
      }
      // عطلة/ويك إند (بحسب جدول الموظف) → لا غياب
      if (!(await this.calendarDay(employeeId, date, calendarCache)).working) continue
      // اليوم المستقر (حضور/إجازة/عطلة) لا يُلمس؛ أما صف الغياب فتصنيف مؤقت
      // قابل للقلب (قد تُعتمد إجازة بأثر رجعي)، وغيابه = لا صف بعد — كلاهما
      // يُعاد حسابه ليعكس أي إجازة/بصمة استُجدّت
      if (existing && existing.status !== 'absent') continue
      // احسب اليوم (computeDay يصنّفه absent/leave/holiday بدقة)
      const day = await this.computeDay(employeeId, date)
      if (day.status === 'absent') created++
    }
    return created
  }

  // تجسيد الغياب لكل الموظفين النشطين في مدى (للمهمة اليومية) — branchId اختياري
  // لقصره على فرع (إعادة حساب يوم بنطاق المستخدم). فشل موظف لا يوقف الباقين (كان
  // استثناء واحد يُجهض التشغيل كله كل ليلة فلا يُجسَّد أحد بعده) — يُسجَّل تحذيراً
  // ويُعاد معرّفه في failed
  async materializeAbsencesAll(
    fromDate: string,
    toDate: string,
    branchId?: number | null
  ): Promise<{ created: number; failed: number[]; total: number }> {
    const where: Record<string, unknown> = { isActive: true }
    if (branchId != null) where.branchId = branchId
    const emps = await this.employees.find({ where: where as any })
    let created = 0
    const failed: number[] = []
    for (const emp of emps) {
      try {
        created += await this.materializeAbsences(emp.id, fromDate, toDate)
      } catch (e) {
        failed.push(emp.id)
        this.logger.warn(
          `تعذر تجسيد غياب الموظف ${emp.id} (${fromDate} → ${toDate}): ${(e as Error).message}`
        )
      }
    }
    return { created, failed, total: emps.length }
  }

  // لحاق تجسيد الغياب (للمهمة الليلية): من بعد آخر يوم مُنجز حتى أمس — ليلة فاتت
  // (السيرفر مقفول) تُلحق في أول تشغيل بعدها بدل ما تفضل بلا غياب لحد المسير.
  // أول أمس يُعاد دائماً لالتقاط التصحيحات المتأخرة (idempotent). المدى محدود بـ
  // attendance.absence_catchup_max_days (افتراضي 31، حد أقصى سنة) بعد توقف طويل.
  // آخر يوم مُنجز يُخزَّن في attendance.absences_materialized_through.
  // onlyIfBehind (فحص الساعة الاحتياطي): لا شيء لو آخر يوم مُنجز = أمس. تشغيلان
  // متزامنان ممنوعان — null = لم يُشغَّل
  private absenceCatchUpRunning = false
  async materializeAbsencesCatchUp(
    opts: { onlyIfBehind?: boolean } = {}
  ): Promise<{ from: string; to: string; created: number; failed: number } | null> {
    if (this.absenceCatchUpRunning) return null
    this.absenceCatchUpRunning = true
    try {
      const STATE_KEY = 'attendance.absences_materialized_through'
      const addDays = (ymd: string, n: number) => {
        const d = new Date(`${ymd}T12:00:00`)
        d.setDate(d.getDate() + n)
        return localDateOf(d)
      }
      const to = addDays(localDateOf(new Date()), -1) // أمس
      const last = await this.configValue(STATE_KEY, '')
      const hasLast = /^\d{4}-\d{2}-\d{2}$/.test(last)
      if (opts.onlyIfBehind && hasLast && last >= to) return null
      const maxRaw = Number(
        await this.configValue('attendance.absence_catchup_max_days', '31')
      )
      // حلقة materializeAbsences نفسها لا تتجاوز سنة — أكبر من ذلك يُقصّ لسنة
      const maxDays =
        Number.isFinite(maxRaw) && maxRaw >= 1
          ? Math.min(MAX_RANGE_DAYS, Math.floor(maxRaw))
          : 31
      let from = addDays(to, -1) // أول أمس — تأخّر التصحيحات
      if (hasLast && addDays(last, 1) < from) from = addDays(last, 1)
      const earliest = addDays(to, -(maxDays - 1))
      if (from < earliest) {
        // توقف أطول من الحد: الأيام الأقدم (غير المُنجزة سابقاً) لا تُلحق هنا —
        // تُسجَّل حتى تُعالَج بحساب المسير لفترتها أو بـ«إعادة حساب اليوم»
        const missedFrom = hasLast && addDays(last, 1) > from ? addDays(last, 1) : from
        if (missedFrom < earliest) {
          this.logger.warn(
            `لحاق الغياب محدود بـ ${maxDays} يوم (attendance.absence_catchup_max_days) — الأيام ${missedFrom} → ${addDays(earliest, -1)} لم تُجسَّد`
          )
        }
        from = earliest
      }
      const { created, failed, total } = await this.materializeAbsencesAll(from, to)
      if (total > 0 && failed.length === total) {
        // فشل الجميع = عطل عام لا موظف بعينه — لا يُسجَّل الإنجاز فيُعاد المدى لاحقاً
        this.logger.error(
          `تعذر تجسيد الغياب (${from} → ${to}) لكل الموظفين — يُعاد المدى في التشغيل القادم`
        )
        return { from, to, created, failed: failed.length }
      }
      if (failed.length > 0) {
        this.logger.warn(
          `تجسيد الغياب (${from} → ${to}): تعذر ${failed.length} موظف [${failed.slice(0, 20).join(', ')}${failed.length > 20 ? ' …' : ''}] — أعد حساب أيامهم`
        )
      }
      // سجّل آخر يوم مُنجز — التشغيل القادم يلحق من بعده
      await this.config.save(this.config.create({ key: STATE_KEY, value: to }))
      return { from, to, created, failed: failed.length }
    } finally {
      this.absenceCatchUpRunning = false
    }
  }

  // ===== تجاوز وردية يوم بعينه (أو مسحه) + إعادة حساب اليوم فوراً =====
  async setDayOverride(dto: {
    employeeId: number
    date: string
    shiftId?: number
    shiftName?: string
    startTime?: string
    endTime?: string
    clear?: boolean
  }, user?: JwtPayload /* بلا مستخدم = نداء داخلي موثوق */): Promise<AttendanceDay | { ok: boolean; date: string; cleared: boolean }> {
    if (!this.days.manager.queryRunner?.isTransactionActive) {
      return this.days.manager.transaction(em => this.inManager(em).setDayOverride(dto, user))
    }
    // موظف صريح أولاً: TypeORM يُسقط شرط where بقيمة undefined — فكان جسم بلا employeeId
    // يُرجع أول موظف (يُفحص نطاقه بدل المقصود) وأول تجاوز في اليوم فيُكتب فوقه.
    // وبعدها emp.id وحده في كل شرط/إنشاء/حذف
    if (!Number.isInteger(dto.employeeId) || dto.employeeId < 1) {
      throw new BadRequestException('الموظف (employeeId) مطلوب — رقم صحيح')
    }
    const emp = await this.employees.findOne({ where: { id: dto.employeeId } })
    if (!emp) throw new NotFoundException('الموظف غير موجود')
    if (user) this.assertCanWrite(user, emp, 'لا يمكنك تعديل وردية يومك بنفسك')
    // تاريخ تقويمي حقيقي: 2026-02-30 يطابق الصيغة لكن القاعدة تقلبه لـ 2026-03-02،
    // فكان التجاوز يُحفظ على يوم لم يختره أحد ويُعدّ «مطبَّقاً» بلا خطأ
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(dto.date ?? '') ||
      localDateOf(new Date(`${dto.date}T12:00:00`)) !== dto.date
    ) {
      throw new BadRequestException('تاريخ غير صالح — الصيغة YYYY-MM-DD')
    }
    // وردية اليوم قبل التعديل — تحدّد الأيام المجاورة المتأثرة (الليلية تمتدّ للغد)
    await lockAttendanceRuleMutation(this.days.manager, [emp.id])
    await assertAttendanceRulePeriodOpen(this.days.manager, [emp.id], dto.date, dto.date)
    const before = await this.shiftFor(emp.id, dto.date)
    const previous = await this.shiftFor(emp.id, dateAfter(dto.date, -1))
    const proposed = dto.clear ? null : await this.scheduleShift(dto, [dto.date])
    if (isOvernight(previous.start, previous.end)) {
      await assertAttendanceRulePeriodOpen(this.days.manager, [emp.id], dateAfter(dto.date, -1), dto.date)
    }
    if (isOvernight(before.start, before.end) || dto.clear || (proposed && isOvernight(proposed.startTime, proposed.endTime))) {
      await assertAttendanceRulePeriodOpen(this.days.manager, [emp.id], dto.date, dateAfter(dto.date, 1))
    }
    if (dto.clear) {
      await this.dayOverrides.delete({
        employeeId: emp.id,
        date: dto.date,
      })
    } else {
      const shift = proposed!
      let row = await this.dayOverrides.findOne({
        where: { employeeId: emp.id, date: dto.date },
      })
      if (!row) {
        row = this.dayOverrides.create({
          employeeId: emp.id,
          date: dto.date,
        })
      }
      Object.assign(row, shift)
      await this.dayOverrides.save(row)
    }
    // إعادة حساب كل يوم متأثر فوراً: اليوم نفسه، والجاران لو فيه وردية ليلية —
    // ليلة اليوم (قبل التعديل أو بعده) تحدّد بداية نافذة الغد، وبداية وردية اليوم
    // تحدّد حدّ ليلة الأمس؛ وإلا تُعدّ بصمة في يومين أو تسقط من كليهما
    const day = await this.recomputeIfTouched(emp.id, dto.date)
    const after = await this.shiftFor(emp.id, dto.date)
    const neighbors: string[] = []
    if (isOvernight(before.start, before.end) || isOvernight(after.start, after.end)) {
      neighbors.push(dateAfter(dto.date, 1))
    }
    if (before.start !== after.start) {
      const prev = await this.shiftFor(emp.id, dateAfter(dto.date, -1))
      if (isOvernight(prev.start, prev.end)) neighbors.push(dateAfter(dto.date, -1))
    }
    for (const d of neighbors) {
      try {
        await this.recomputeIfTouched(emp.id, d)
      } catch (e) {
        // التجاوز حُفظ ويومه أُعيد — فشل الجار لا يُسقط العملية (يُسجَّل للمراجعة)
        this.logger.warn(
          `تعذر إعادة حساب يوم ${d} للموظف ${emp.id} (جار تجاوز ${dto.date}): ${(e as Error).message}`
        )
      }
    }
    return day ?? { ok: true, date: dto.date, cleared: !!dto.clear }
  }

  // إعادة حساب يوم لو محسوب سابقاً (صف قائم — حتى غياب بلا بصمات، وإلا يبقى
  // بالوردية القديمة) أو فيه بصمات داخل نافذة ورديته (الليلية تمتدّ لصباح الغد).
  // يوم بلا صف ولا بصمة لا يُختلق: غياب اليوم الجاري لحظي، والمنقضي يجسّده التجسيد
  private async recomputeIfTouched(
    employeeId: number,
    date: string
  ): Promise<AttendanceDay | null> {
    const stored = await this.days.count({ where: { employeeId, date } })
    if (stored === 0) {
      const frame = await this.workdayFrame(
        employeeId,
        date,
        await this.shiftFor(employeeId, date)
      )
      const punches = await this.punches.count({
        where: { employeeId, punchTime: Between(frame.from, frame.to) },
      })
      if (punches === 0) return null
    }
    return this.computeDay(employeeId, date)
  }

  // تجاوز وردية يوم بعينه لمجموعة موظفين (نطاق: شركة/فرع/قسم) —
  // «يوم استثنائي» بدوام مختلف عن باقي الأسبوع دون تغيير وردية الأسبوع
  async setDayOverridesBulk(dto: {
    employeeIds: number[]
    dates: string[]
    shiftId?: number
    shiftName?: string
    startTime?: string
    endTime?: string
    clear?: boolean
  }, user?: JwtPayload /* بلا مستخدم = نداء داخلي موثوق */) {
    let employeeIds = [
      ...new Set((dto.employeeIds ?? []).map(Number).filter(Boolean)),
    ]
    // تواريخ تقويمية حقيقية — المستحيل (2026-02-30) كانت القاعدة تقلبه ليوم آخر
    // فيُطبَّق عليه التجاوز بصمت، والصيغة الخاطئة كانت تُسقَط بلا تنبيه: يُرفض الطلب
    const badDates = (dto.dates ?? []).filter(
      (d) =>
        !/^\d{4}-\d{2}-\d{2}$/.test(String(d)) ||
        localDateOf(new Date(`${d}T12:00:00`)) !== String(d)
    )
    if (badDates.length > 0) {
      throw new BadRequestException(
        `تواريخ غير صالحة: ${badDates.slice(0, 5).map(String).join('، ')} — الصيغة YYYY-MM-DD`
      )
    }
    const dates = [...new Set((dto.dates ?? []).map(String))]
    if (employeeIds.length === 0 || dates.length === 0) {
      throw new BadRequestException('اختر موظفين وأياماً على الأقل')
    }
    // خارج نطاق فرع المستخدم أو المستخدم نفسه يُستبعد قبل التطبيق (skipped)
    let skipped = 0
    if (user) {
      const emps = await this.employees.find({ where: { id: In(employeeIds) } })
      const byId = new Map(emps.map((e) => [e.id, e]))
      const allowed = employeeIds.filter((id) => {
        const emp = byId.get(id)
        return !!emp && !this.writeBlock(user, emp, 'self')
      })
      skipped = employeeIds.length - allowed.length
      if (allowed.length === 0) {
        throw new ForbiddenException(
          'لا يوجد في الاختيار موظف مسموح لك بتعديل ورديته — خارج نطاق فرعك أو أنت نفسك'
        )
      }
      employeeIds = allowed
    }
    // فحص شكل المدخلات والمصدر مبكرًا؛ السريان يُفحص لكل يوم تحت قفل معاملته،
    // فتظل نتيجة التطبيق الجماعي تفصل الأيام الناجحة عن الأيام المرفوضة.
    if (!dto.clear) await this.scheduleShift(dto, [])
    let applied = 0
    // فشل كل موظف/يوم يُرجَع بسببه للواجهة — لا يُبلع («طُبّق 38» بلا تفسير)
    const failed: Array<{ employeeId: number; date: string; error: string }> = []
    for (const employeeId of employeeIds) {
      for (const date of dates) {
        try {
          await this.setDayOverride({
            employeeId,
            date,
            shiftId: dto.shiftId,
            shiftName: dto.shiftName,
            startTime: dto.startTime,
            endTime: dto.endTime,
            clear: dto.clear,
          })
          applied++
        } catch (e) {
          // أخطاء التحقق (موظف غير موجود...) رسالتها عربية جاهزة؛ غيرها يُسجَّل
          // في اللوج ويُعرض بعبارة عامة (لا تفاصيل قاعدة البيانات للواجهة)
          const known = e instanceof HttpException
          if (!known) {
            this.logger.warn(
              `تعذر تجاوز وردية الموظف ${employeeId} يوم ${date}: ${(e as Error)?.message}`
            )
          }
          failed.push({
            employeeId,
            date,
            error: known
              ? (e as HttpException).message
              : 'خطأ غير متوقع أثناء حفظ التجاوز',
          })
        }
      }
    }
    return {
      ok: true,
      applied,
      failed,
      employees: employeeIds.length,
      days: dates.length,
      skipped, // موظفون استُبعدوا: خارج نطاق الفرع أو المستخدم نفسه أو غير موجودين
    }
  }

  // تجاوزات أسبوع (لعرضها في شاشة الجدولة)
  async weekDayOverrides(week: string, user: JwtPayload) {
    const start = weekKeyOf(week)
    const end = new Date(`${start}T12:00:00`)
    end.setDate(end.getDate() + 6)
    const endStr = end.toISOString().slice(0, 10)
    const all = await this.dayOverrides.find()
    return this.scheduleRowsInScope(
      all.filter((o) => o.date >= start && o.date <= endStr),
      user
    )
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
      typeId: number | null // مرجع النوع في الكتالوج (الطلبات الجديدة)
      type: string | null // الاسم — للصفوف القديمة قبل حفظ المعرّف فقط
      dur: number
    }> = []
    for (const r of rows) {
      try {
        const p = JSON.parse(r.payload ?? '{}')
        if (p.date && String(p.date).startsWith(month) && p.from && p.to) {
          const from = toMinutes(p.from)
          const to = toMinutes(p.to)
          const typeId = Number(p.permissionTypeId)
          monthPerms.push({
            id: r.id,
            date: String(p.date),
            from,
            to,
            typeId: Number.isInteger(typeId) && typeId > 0 ? typeId : null,
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
    // كتالوج الأنواع: بالمعرّف (permissionTypeId) أولاً، وبالاسم للصفوف القديمة
    // قبل حفظ المعرّف فقط — الاسم قابل للتعديل، وإعادة التسمية كانت تحوّل كل
    // أذونات النوع لعذر مجاني. معرّف محذوف/اسم مجهول = نوع مجهول (بخصم كامل)
    const allTypes = await this.permissionTypes.find()
    const typeById = new Map<number, PermissionType>(allTypes.map((t) => [t.id, t]))
    const typeByName = new Map<string, PermissionType>(allTypes.map((t) => [t.nameAr, t]))
    const typeOf = (x: { typeId: number | null; type: string | null }) =>
      x.typeId != null
        ? typeById.get(x.typeId)
        : x.type
          ? typeByName.get(x.type)
          : undefined

    const windows: Array<{
      from: number
      to: number
      deductible: boolean
      deductRatio: number
      coverage: 'morning' | 'evening' | 'both'
    }> = []
    for (const perm of monthPerms.filter((p) => p.date === date)) {
      const pt = typeOf(perm)
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

      // النوع «بخصم» صراحةً → كامل النافذة بخصم بنسبته. والنوع المجهول (بلا نوع/
      // محذوف/اسم قديم تغيّر) → بخصم كامل 100% — لا عذر مجاني بلا حد (كان
      // deductible=false فيعذر ساعات الإذن كلها ببلاش)
      if (!pt || pt.isDeductible) {
        addWin({
          from: perm.from,
          to: perm.to,
          deductible: true,
          deductRatio: pt ? ratio : 1,
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

      // الأسبق أولاً — الأذونات قبل هذا (بترتيب ثابت: تاريخ ثم بداية ثم معرّف)،
      // من نفس النوع بمرجعه المحلول (القديم بالاسم والجديد بالمعرّف يُعدّان معاً)
      const priors = monthPerms.filter(
        (x) =>
          typeOf(x)?.id === pt.id &&
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

  // مأمورية (BUSINESS_TRIP) / عمل عن بُعد (REMOTE_WORK) معتمد يغطي التاريخ — يوم
  // معذور بحالته (لا تأخير ولا غياب). الطلبان بلا سجل مستقل: المدى من الـpayload
  // (fromDate→toDate، أو date ليوم واحد). المأمورية تغلب العمل عن بُعد لو تداخلا
  private async approvedDayExcuses(
    employeeIds: number[],
    date: string
  ): Promise<Map<number, 'mission' | 'remote'>> {
    const out = new Map<number, 'mission' | 'remote'>()
    const ymd = /^\d{4}-\d{2}-\d{2}$/
    // دفعات تحت حد معاملات SQL Server (2100)
    for (let i = 0; i < employeeIds.length; i += 1000) {
      const rows = await this.requests.find({
        where: {
          requesterId: In(employeeIds.slice(i, i + 1000)),
          typeCode: In(['BUSINESS_TRIP', 'REMOTE_WORK']),
          status: In(['COMPLETED', 'APPROVED', 'IN_EXECUTION']),
        },
      })
      for (const r of rows) {
        try {
          const p = JSON.parse(r.payload ?? '{}')
          const from = String(p.fromDate ?? p.date ?? '').slice(0, 10)
          const to = String(p.toDate ?? p.fromDate ?? p.date ?? '').slice(0, 10)
          if (!ymd.test(from) || !ymd.test(to) || from > date || to < date) continue
          if (r.typeCode === 'BUSINESS_TRIP') out.set(r.requesterId, 'mission')
          else if (!out.has(r.requesterId)) out.set(r.requesterId, 'remote')
        } catch {
          /* payload تالف — تجاهل */
        }
      }
    }
    return out
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
  // cascade=false: إعادة حساب جار ليلي من داخل computeDay (بلا تسلسل أبعد)
  async computeDay(employeeId: number, date: string, cascade = true, readOnly = false, em?: EntityManager,
    options: { recomputeLegacy?: boolean } = {}): Promise<AttendanceDayWithExemption> {
    if (em && em !== this.days.manager) return this.inManager(em).computeDay(employeeId, date, cascade, readOnly, undefined, options)
    if (!readOnly && !this.days.manager.queryRunner?.isTransactionActive) {
      return this.days.manager.transaction(async manager => {
        await lockPayrollEmployees(manager, [employeeId])
        return this.inManager(manager).computeDay(employeeId, date, cascade, false, undefined, options)
      })
    }
    const storedDay = await this.days.findOne({ where: { employeeId, date } })
    if (await this.financiallyClosedDay(employeeId, date)) {
      if (storedDay) return Object.assign(storedDay, {
        attendanceExempt: storedDay.attendanceRuleSnapshot?.attendanceExempt ?? storedDay.status === 'exempt',
        exemption: null,
      })
      // A closed legacy period without a day stays without a generated debit.
      return Object.assign(this.days.create({ employeeId, date, status: 'present',
        lateMinutes: 0, earlyLeaveMinutes: 0, deductibleMinutes: 0, workMinutes: 0,
        attendanceReviewRequired: true, attendanceReviewReason: 'الفترة مقفلة ولا يوجد سجل حضور محفوظ لهذا اليوم',
      }), { attendanceExempt: false, exemption: null })
    }
    const emp = await this.employees.findOne({ where: { id: employeeId } })
    if (!emp) throw new NotFoundException('الموظف غير موجود')
    const exemption = exemptionOnDate(
      await loadAttendanceExemptions(this.days.manager, employeeId, date, date), date)
    // يوم لم يأتِ بعد (بالتاريخ المحلي) — يُحسب لكن لا يُحفظ إلا إجازة كاملة أو
    // عطلة (انظر نقطة الحفظ أدناه)
    const isFuture = date > localDateOf(new Date())

    const shift = await this.shiftFor(employeeId, date)
    // نافذة البصمات = نافذة الوردية لا اليوم التقويمي: الليلية (22:00-06:00) تمتدّ
    // لصباح الغد، وصباح اليوم قد يتبع ليلة الأمس (workdayFrame)
    const frame = await this.workdayFrame(employeeId, date, shift)
    const dayStart = frame.from
    const dayEnd = frame.to
    const punches = await this.punches.find({
      where: { employeeId, punchTime: Between(dayStart, dayEnd) },
      order: { punchTime: 'ASC' },
    })

    // بلا أي وردية أو جدول: البصمة تُسجَّل بلا تأخير ولا انصراف مبكر ولا أوفرتايم
    const unscheduled = shift.source === 'none'
    // إعدادات الوردية (سماحية/نوافذ/نوع) بمرجعها في الكتالوج فقط — لا استعارة
    // بالاسم (الافتراضي «صباحي» وجداول العمل كانت تستعير إعدادات وردية بنفس الاسم).
    // الليلية: نوافذها على خط اليوم الممتد (نافذة الخروج صباح الغد)
    const sc = this.nightWindows(shift.sourceSettings as Shift | null, frame)
    const flexPolicy = shift.sourceSettings?.flexPolicy ?? await attendanceFlexPolicy(this.days.manager)
    const graceResolution = await resolveAttendanceGrace(this.days.manager, date, shift, storedDay?.attendanceRuleSnapshot)
    const grace = graceResolution.minutes

    // البصمات الخام (من الجهاز، بلا اتجاه) تُصنّف بالنوافذ/الافتراضي.
    // التصحيحات اليدوية تصرّح باتجاهها (IN/OUT) صراحةً → تُحترم كما هي ولا
    // يُعاد تصنيفها بالنوافذ (المستخدم قال «حضور» فهي حضور مهما كان وقتها)
    // (صباح الغد لليلية بساعة ممتدة 06:05 → 30:05 — تُخزَّن بساعة الحائط)
    const rawInstants = punches.map((p) => frame.clock(p.punchTime))
    const corrections = await this.corrections.find({
      where: { employeeId, date },
      order: { id: 'ASC' },
    })
    if (storedDay && !storedDay.attendanceRuleSnapshot && !punches.length && !corrections.length &&
      !options.recomputeLegacy && ['present', 'late', 'early_leave', 'partial_leave', 'missing_punch'].includes(storedDay.status)) {
      // Imported/legacy summaries are evidence in their own right. Rebuilding a
      // draft or reading a month must not replace them with absence from an empty
      // raw-punch table. Only an explicit recompute or new raw evidence opts in.
      return Object.assign(this.exemptionView(storedDay, exemption), { provenance: 'LEGACY_STORED' as const })
    }
    const corrIn: string[] = []
    const corrOut: string[] = []
    for (const c of corrections) {
      try {
        const cp = JSON.parse(c.correctedPunch ?? '{}')
        // الليلية: وقت التصحيح بلا تاريخ — الدخول حول البداية والخروج صباح الغد
        if (cp.in) corrIn.push(frame.onLine(String(cp.in).slice(0, 5), 'start'))
        if (cp.out) corrOut.push(frame.onLine(String(cp.out).slice(0, 5), 'end'))
      } catch {
        /* تجاهل تصحيحاً تالفاً */
      }
    }
    rawInstants.sort()
    corrIn.sort()
    corrOut.sort()
    const inWin = (t: string, from?: string | null, to?: string | null) =>
      !!from && !!to && toMinutes(t) >= toMinutes(from) && toMinutes(t) <= toMinutes(to)
    // التصنيف بالنوافذ يتطلب النافذتين معاً — نافذة واحدة ناقصة تُسقط الجانب
    // الآخر بالكامل، فنرجع للسلوك الافتراضي حتى تُضبط النافذتان
    const hasWindows =
      !!(sc?.checkinFrom && sc?.checkinTo) && !!(sc?.checkoutFrom && sc?.checkoutTo)
    // تصنيف البصمات الخام (دخول/خروج)
    let rawIn: string | null
    let rawOut: string | null
    // بصمات خارج النافذتين معاً — تُعلَّم «شاذة» لمراجعة HR بدل رميها بصمت
    let punchAnomalies: string[] = []
    if (hasWindows && rawInstants.length > 0) {
      const inHits = rawInstants.filter((t) => inWin(t, sc?.checkinFrom, sc?.checkinTo))
      const outHits = rawInstants.filter((t) => inWin(t, sc?.checkoutFrom, sc?.checkoutTo))
      punchAnomalies = rawInstants.filter((t) => !inHits.includes(t) && !outHits.includes(t))
      const checkoutFromMin = toMinutes(sc!.checkoutFrom!)
      if (toMinutes(sc!.checkinFrom!) < checkoutFromMin) {
        // البصمة خارج النافذة لا تُرمى (كانت تُسقط التأخير أو تقلب يوم حضور غياباً):
        // الدخول = أول بصمة في نافذته، وإلا أول بصمة قبل بداية نافذة الخروج (دخول
        // متأخر بعد النافذة أو مبكر قبلها). الخروج = آخر بصمة بعد الدخول في نافذة
        // الخروج، وإلا آخر بصمة بعده خارج نافذة الدخول (تكرار بصمة الدخول ليس خروجاً)
        rawIn = inHits[0] ?? rawInstants.find((t) => toMinutes(t) < checkoutFromMin) ?? null
        const inAt = rawIn
        const after = inAt
          ? rawInstants.filter((t) => toMinutes(t) > toMinutes(inAt))
          : rawInstants
        const outAfter = outHits.filter((t) => after.includes(t))
        const fallbackOut = after.filter((t) => !inHits.includes(t))
        rawOut = outAfter.length
          ? outAfter[outAfter.length - 1]
          : fallbackOut.length
            ? fallbackOut[fallbackOut.length - 1]
            : null
      } else {
        // نافذة الخروج قبل نافذة الدخول على مدار الساعة (وردية تعبر منتصف الليل):
        // ترتيب «الخروج بعد الدخول» لا يصح داخل اليوم التقويمي — التصنيف بالنوافذ فقط
        rawIn = inHits.length ? inHits[0] : null
        rawOut = outHits.length ? outHits[outHits.length - 1] : null
      }
    } else {
      rawIn = rawInstants.length > 0 ? rawInstants[0] : null
      rawOut = rawInstants.length > 1 ? rawInstants[rawInstants.length - 1] : null
    }
    // التصحيح اليدوي يغلب باتجاهه المصرَّح، وإلا البصمة الخام المصنَّفة
    let checkIn: string | null
    let checkOut: string | null
    {
      checkIn = corrIn.length ? corrIn[0] : rawIn
      checkOut = corrOut.length ? corrOut[corrOut.length - 1] : rawOut
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
    // بلا وردية لا أوقات مرجعية ('') — القيم لا تُستخدم في مساره
    const shiftStart = unscheduled ? 0 : toMinutes(shift.start)
    // الليلية تنتهي في الغد: نهايتها end+1440 على خط اليوم (عليها الانصراف المبكر
    // ونصف الإجازة الثاني والمدة)
    const shiftEnd = unscheduled ? 0 : toMinutes(shift.end) + (frame.overnight ? 1440 : 0)
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

    // Classification keeps its existing windows; the flex boundary separately
    // uses the selected punch instant, including seconds (10:00:59 is late).
    const selectedInstant = (time: string | null, direction: 'start' | 'end', corrected: boolean) => {
      if (time == null) return null
      if (corrected) return atMinute(date, toMinutes(time))
      const matching = punches.filter(p => frame.clock(p.punchTime) === time)
      return matching.length ? matching[direction === 'start' ? 0 : matching.length - 1].punchTime : atMinute(date, toMinutes(time))
    }
    const checkInInstant = selectedInstant(checkIn, 'start', corrIn.length > 0)
    const checkOutInstant = selectedInstant(checkOut, 'end', corrOut.length > 0)
    const preciseMinute = (time: string | null, instant: Date | null) => time == null ? null
      : toMinutes(time) + (instant?.getSeconds() ?? 0) / 60 + (instant?.getMilliseconds() ?? 0) / 60000
    let effectiveCountStart = shiftStart
    for (const w of [...halfLeaveWindows].sort((a, b) => a.from - b.from)) {
      if (w.from <= effectiveCountStart && w.to > effectiveCountStart) effectiveCountStart = w.to
    }
    const countedStartInstant = checkInInstant == null ? null
      : flexPolicy.countEarlyWorkTowardRequired ? checkInInstant
        : new Date(Math.max(checkInInstant.getTime(), atMinute(date, effectiveCountStart).getTime()))
    let flexResult: AttendanceFlexResult | null = null
    let attendanceRuleSnapshot: (AttendanceRuleSnapshot & { graceSource: AttendanceGraceSource; calendar: ResolvedCalendarDay }) | null = null

    let status: AttendanceStatus = 'absent'
    let lateMinutes = 0
    let earlyLeaveMinutes = 0
    let excusedMinutes = 0
    let deductibleMinutes = 0
    let workMinutes = 0
    let leaveConflict = false

    // عطلة اليوم بحسب جدول عمل الموظف إن وُجد (يغلب الفرع/العام) — الجدول
    // الافتراضي لا يغيّر العطلة؛ الحسم من التقويم المؤرخ المشترك.
    const calendar = await this.calendarDay(employeeId, date)
    const isHoliday = !calendar.working
    // نوع اليوم لمُضاعِف الأوفرتايم (يُحسب فقط عند العطلة لتمييز الويك إند/الرسمية)
    const kind = calendar.dayKind

    // مأمورية/عمل عن بُعد معتمد يغطي اليوم — يوم معذور بحالته (العطلة والإجازة تسبقانه)
    const dayExcuse =
      isHoliday || isFullLeaveDay
        ? undefined
        : (await this.approvedDayExcuses([employeeId], date)).get(employeeId)

    const permissions = !unscheduled && !isHoliday && !isFullLeaveDay && !dayExcuse && !exemption
      ? (await this.approvedPermissionWindows(employeeId, date)).map(w => frame.window(w)) : []
    if (!unscheduled && !isHoliday && !isFullLeaveDay && !dayExcuse && !exemption) {
      const required = shift.sourceSettings?.requiredWorkMinutes != null
        ? Number(shift.sourceSettings.requiredWorkMinutes)
        : shift.sourceSettings?.requiredHours != null ? Math.round(Number(shift.sourceSettings.requiredHours) * 60)
          : shiftEnd - shiftStart
      flexResult = calculateAttendanceFlex({
        startMinute: shiftStart, endMinute: shiftEnd,
        checkInMinute: preciseMinute(checkIn, checkInInstant), checkOutMinute: preciseMinute(checkOut, checkOutInstant),
        flexEnabled: shift.flexEnabled, flexWindowMinutes: shift.flexWindowMinutes,
        requiredWorkMinutes: required, graceMinutes: grace,
        windowSupersedesGrace: flexPolicy.windowSupersedesGrace,
        countEarlyWorkTowardRequired: flexPolicy.countEarlyWorkTowardRequired,
        prorateFlexWindowOnPartialLeave: flexPolicy.prorateWindowOnPartialLeave,
        shortfallToleranceMinutes: flexPolicy.shortfallGraceMinutes,
        unpaidBreakMinutes: flexPolicy.unpaidBreakMinutes, maxSessionMinutes: flexPolicy.maxSessionMinutes,
        halfLeaveWindows, permissions,
        actualWorkMinutes: checkInInstant && checkOutInstant ? (checkOutInstant.getTime() - checkInInstant.getTime()) / 60000 : null,
        actualCountedWorkMinutes: countedStartInstant && checkOutInstant ? Math.max(0, (checkOutInstant.getTime() - countedStartInstant.getTime()) / 60000) : null,
        irregularTime: !!(checkInInstant && checkOutInstant && checkInInstant.getTimezoneOffset() !== checkOutInstant.getTimezoneOffset()),
      })
      attendanceRuleSnapshot = {
        schemaVersion: 1, date, ...flexResult, calendar, sourceType: shift.sourceType, sourceId: shift.sourceId,
        sourceVersionId: shift.sourceVersionId, sourceVersion: shift.sourceVersion,
        sourceEffectiveFrom: shift.sourceEffectiveFrom, employeeVersionId: shift.employeeVersionId,
        employeeVersion: shift.employeeVersion, employeeOverrideMode: shift.employeeOverrideMode,
        flexEnabled: shift.flexEnabled, flexWindowMinutes: shift.flexWindowMinutes,
        countEarlyWorkTowardRequired: flexPolicy.countEarlyWorkTowardRequired,
        prorateFlexWindowOnPartialLeave: flexPolicy.prorateWindowOnPartialLeave,
        shortfallToleranceMinutes: flexPolicy.shortfallGraceMinutes,
        unpaidBreakMinutes: flexPolicy.unpaidBreakMinutes, maxSessionMinutes: flexPolicy.maxSessionMinutes,
        windowSupersedesGrace: flexPolicy.windowSupersedesGrace, graceMinutes: grace, graceSource: graceResolution.source, attendanceExempt: false,
      }
    }

    // العطلة قبل الإجازة: ويك إند/عطلة رسمية داخل مدة إجازة «عطلة» لا «إجازة» —
    // الرصيد لا يُخصم لها أصلاً (كانت إجازة الخميس→الأحد تظهر 4 أيام والمخصوم يومان)
    if (isHoliday) {
      // ويك إند/عطلة رسمية: لا تأخير ولا غياب — الحضور يُسجل كعمل بيوم عطلة
      status = 'holiday'
      if (checkIn && checkOut) {
        workMinutes = Math.max(0, toMinutes(checkOut) - toMinutes(checkIn))
      }
    } else if (isFullLeaveDay) {
      status = 'leave'
      // §موظف بصم يوم إجازته الكاملة — تعارض يظهر لـHR للقرار:
      // إلغاء الإجازة (يرجع الرصيد ويتحسب دوام) أو إبقاؤها
      leaveConflict = !!checkIn
    } else if (exemption) {
      // EX-10: البصمة معلومات فقط؛ لا ندخل أصلًا مسار حساب خصومات الحضور.
      status = hasHalfLeave ? 'partial_leave' : 'exempt'
      if (checkIn && checkOut) workMinutes = Math.max(0, toMinutes(checkOut) - toMinutes(checkIn))
    } else if (dayExcuse) {
      // مأمورية/عمل عن بُعد معتمد: يوم معذور بحالته الظاهرة — لا تأخير ولا انصراف
      // مبكر ولا غياب (كان يُجسَّد «غائب» ويُخصم بالمسير). البصمة إن وُجدت تُسجَّل بمدتها
      status = dayExcuse
      if (checkIn && checkOut) {
        workMinutes = Math.max(0, toMinutes(checkOut) - toMinutes(checkIn))
      }
    } else if (unscheduled) {
      // بلا وردية: لا مرجع للتأخير/الانصراف المبكر — البصمة حضور بمدتها الفعلية؛
      // بلا بصمة يبقى غياباً (يوم عمل بحسب العطلة الأسبوعية) مع علامة «بلا وردية»
      if (checkIn && checkOut) {
        workMinutes = Math.max(0, toMinutes(checkOut) - toMinutes(checkIn))
      }
      if (hasHalfLeave) status = 'partial_leave'
      else if (checkIn || checkOut) status = 'present'
    } else if (checkIn || checkOut || hasHalfLeave) {
      // الليلية: نوافذ الإذن على خط اليوم الممتد (إذن 05:00-06:00 = صباح الغد)
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
      } else if (shift.flexEnabled) {
        lateMinutes = flexResult!.lateMinutes
        excusedMinutes = flexResult!.excusedMinutes
        deductibleMinutes = flexResult!.paidPermissionDeductibleMinutes
        workMinutes = flexResult!.rawWorkMinutes ?? 0
        status = lateMinutes > 0 ? 'late' : hasHalfLeave ? 'partial_leave' : 'present'
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
          // ساعات العمل = مدة التواجد الفعلية (بصمة الدخول → بصمة الخروج)،
          // لا تُقصّ على نافذة الوردية: الحضور المبكر والبقاء بعد النهاية
          // وقت تواجد حقيقي يظهر في الكشف. التأخير/الانصراف المبكر يُقاسان
          // بالوردية أعلاه، والأوفرتايم له مساره المستقل
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

    if (flexResult) {
      // One quantity engine serves fixed and flexible definitions. Fixed shifts
      // retain their separate early-leave display; payroll avoids charging it
      // again when it consumes the new shortfall quantity.
      lateMinutes = flexResult.lateMinutes
      deductibleMinutes = flexResult.paidPermissionDeductibleMinutes
      excusedMinutes = flexResult.excusedMinutes
      workMinutes = flexResult.rawWorkMinutes ?? 0
      if (checkIn) status = lateMinutes > 0 ? 'late'
        : !shift.flexEnabled && earlyLeaveMinutes > 0 ? 'early_leave'
          : hasHalfLeave ? 'partial_leave' : 'present'
    }

    // بصمة ناقصة: يوم عمل منقضٍ فيه طرف واحد فقط (دخول بلا خروج أو العكس) — كان
    // يُحفظ «حاضر/متأخر» بصفر دقائق عمل فيُعدّ يوم حضور كاملاً ولا يُنبَّه أحد. يُعلَّم
    // «بصمة ناقصة» (خارج عدّ الحاضرين) حتى يُصحَّح بطلب تصحيح بصمة؛ التأخير المحسوب
    // من بصمة الدخول يبقى. اليوم الجاري لا يُعلَّم (قد تأتي بصمة الانصراف بعد)
    if (
      !exemption &&
      date < localDateOf(new Date()) &&
      !checkIn !== !checkOut &&
      (status === 'present' ||
        status === 'late' ||
        status === 'early_leave' ||
        status === 'partial_leave')
    ) {
      status = 'missing_punch'
    }
    if (exemption) {
      lateMinutes = 0
      earlyLeaveMinutes = 0
      deductibleMinutes = 0
      // حتى في الإجازة تبقى مدة البصمة معلومة مستقلة بلا أثر على الرصيد أو الأجر.
      if (checkIn && checkOut) workMinutes = Math.max(0, toMinutes(checkOut) - toMinutes(checkIn))
    }

    // يوم مستقبلي لا يُحفظ له صف (لا «غائب» مقدماً ولا حضور) إلا الإجازة الكاملة
    // والعطلة — حقائق معروفة سلفاً. وأي صف قديم له يُمسح: سحب/إلغاء إجازة
    // مستقبلية كان يكتب أيامها «غائب» قبل أن تأتي فتدخل التقارير والمسير.
    // والمأمورية/العمل عن بُعد المعتمد كذلك (طلب مكتمل لا يُلغى بعد اعتماده)
    const persist =
      !isFuture ||
      status === 'leave' ||
      status === 'holiday' ||
      status === 'mission' ||
      status === 'remote'
    let day = persist ? await this.days.findOne({ where: { employeeId, date } }) : null
    const storedShift = day ? { start: day.shiftStart, end: day.shiftEnd } : null
    if (!day) day = this.days.create({ employeeId, date })
    Object.assign(day, {
      branchId: calendar.branchId,
      checkIn: wallClock(checkIn),
      checkOut: wallClock(checkOut),
      shiftName: shift.name,
      shiftStart: shift.start,
      shiftEnd: shift.end,
      shiftId: shift.shiftId,
      scheduleSource: shift.source,
      unscheduled,
      status,
      lateMinutes,
      earlyLeaveMinutes,
      excusedMinutes,
      deductibleMinutes,
      workMinutes,
      rawLateMinutes: exemption ? 0 : flexResult?.rawLateMinutes ?? null,
      unexcusedLateMinutes: exemption ? 0 : flexResult?.unexcusedLateMinutes ?? null,
      shortfallMinutes: exemption ? 0 : flexResult?.shortfallMinutes ?? null,
      countedWorkMinutes: flexResult?.countedWorkMinutes ?? (checkIn && checkOut ? workMinutes : null),
      earlyArrivalMinutes: flexResult?.earlyArrivalMinutes ?? null,
      flexOutcome: exemption ? 'EXEMPT' : flexResult?.flexOutcome ?? null,
      attendanceReviewRequired: flexResult?.attendanceReviewRequired ?? false,
      attendanceReviewReason: flexResult?.attendanceReviewReason ?? null,
      attendanceRuleSnapshot,
      leaveConflict,
      // بصمات خارج النافذتين (حتى 30 — عمود 200 خانة) — NULL لو لا شيء
      punchAnomalies: punchAnomalies.length
        ? punchAnomalies.slice(0, 30).map(wallClock).join(',') // ليلية: 30:05 → 06:05
        : null,
      // السماحية التي سرت فعلاً (الوردية تغلب العامة) — ليظهر في السجل أيهما طُبّق
      graceUsed: !exemption && !unscheduled && !isFullLeaveDay && !isHoliday ? grace : null,
      computedAt: new Date(),
    })
    // EX-14: إظهار يوم مفقود أو إعادة تفسير exempt قديم لا يكتب حضورًا من GET.
    if (readOnly) return this.exemptionView(day, exemption)
    if (!persist) {
      await this.days.delete({ employeeId, date })
      return this.exemptionView(day, exemption) // نتيجة للعرض فقط — غير محفوظة
    }
    day = await this.days.save(day)

    // الأوفرتايم × البصمة (يتطلب دخولاً وخروجاً — بصمة خروج وحيدة لا تُنتج
    // أوفرتايم وهمياً). يُكتشف أيضاً في يوم العطلة/الويك إند (العمل يومها كله
    // أوفرتايم) — يُميَّز عن «يوم عطلة بلا دوام» بوجود بصمة دخول وخروج.
    // ولا أوفرتايم ليوم لم يأتِ بعد
    if (exemption) {
      // EX-11: حتى مع استحقاق إضافي فردي لا تقاس ساعاته بالبصمة. نحفظ المصادر
      // المعتمدة والمدفوعة كما هي، ونستخدم تنظيف المكتشف غير المعتمد الموجود فقط.
      if (!isFuture) await this.clearStaleOvertime(employeeId, date, 'اليوم مستثنى من الحضور بقرار معتمد')
    } else if (unscheduled && !isHoliday) {
      // بلا وردية في يوم عمل لا يوجد مرجع للإضافي — مدة البصمات تظل
      // في workMinutes لمراجعة HR. والمكتشف من حساب سابق لليوم (قبل حذف الجدول
      // الافتراضي مثلاً) لم يعد مبرَّرًا — يُلغى مع الاحتفاظ بأثره.
      if (!isFuture) await this.clearStaleOvertime(employeeId, date, 'اليوم بلا وردية')
    } else if (flexResult?.attendanceReviewRequired) {
      // المقادير الناقصة لا تعيد كتابة مصدر إضافي سبق اعتماده.
      if (!isFuture) await this.clearStaleOvertime(employeeId, date, 'مقادير الحضور تحتاج مراجعة قبل كشف إضافي')
    } else if (checkIn && checkOut && !(isFullLeaveDay && !isHoliday) && !isFuture) {
      // نوع اليوم من تقويمه؛ أدلة الإضافي تفحص تعارض الإجازة بصورة مستقلة.
      await this.detectOvertime(emp, date)
    } else if (!isFuture) {
      // الكشف لا ينطبق الآن (بصمة طرف واحد/بلا بصمة، أو إجازة كاملة): قيد مكتشف من
      // حساب سابق لليوم لم يعد مبرَّراً — يُزال ولا يُوجَّه طلباً
      await this.clearStaleOvertime(
        employeeId,
        date,
        checkIn && checkOut ? 'اليوم إجازة كاملة' : 'لا بصمة دخول وخروج لليوم'
      )
    }
    if (cascade) await this.recomputeNightNeighbors(employeeId, date, frame, shift.start, storedShift)
    return this.exemptionView(day, exemption)
  }

  // ===== أوفرتايم مكتشف لم يعد الحساب يبرره =====
  // قيد BIOMETRIC_DETECTED من حساب سابق لليوم (كُشف على وردية افتراضية قبل إسناد
  // الحقيقية، بصمة صُحّحت، إجازة اعتُمدت، دون العتبة، فترة قُفلت…) كان يبقى فيوجّهه
  // الـcron طلب OVERTIME_AUTO ويُصرف على عمل لم يحدث. غير الموجَّه يُحذف، والموجَّه
  // لسلسلة اعتماد يُلغى طلبه آلياً (سجل تدقيق CANCELLED من النظام يُبلغ المعتمد
  // والموظف) ويُعلَّم القيد REJECTED. المعتمَد/المدفوع قرار بشري لا يُمس
  private async clearStaleOvertime(employeeId: number, date: string, reason: string) {
    const stale = await this.overtime.find({
      where: {
        employeeId,
        date,
        source: 'BIOMETRIC_DETECTED',
        status: In(['DETECTED', 'SUBMITTED']),
      },
    })
    for (const entry of stale) {
      if (!entry.requestId) {
        // حجز اليوم وسجل التدقيق يحتفظان بالمصدر الملغى؛ لا نحذف أثر اكتشاف سابق.
        entry.status = 'CANCELLED'
        entry.payableHours = null as any
        await this.overtime.save(entry)
        await releaseOvertimeDayClaim(this.days.manager, entry.id)
        await appendOvertimeEvent(this.days.manager, { entryId: entry.id, eventType: 'AUTO_CANCELLED', reason })
        continue
      }
      const req = await this.requests.findOne({ where: { id: entry.requestId } })
      // اعتُمد طلبه فعلاً (والقيد بانتظار التنفيذ) — قرار المعتمد لا يُلغى هنا
      if (req && ['APPROVED', 'IN_EXECUTION', 'COMPLETED'].includes(req.status)) continue
      if (req && canTransition(req.status, 'CANCELLED')) {
        req.status = 'CANCELLED'
        req.completedAt = new Date()
        await this.requests.save(req)
        await this.requests.manager.getRepository(RequestApproval).save({
          requestId: req.id,
          step: req.currentStep ?? 0,
          approverId: 0, // النظام
          action: 'CANCELLED',
          comment: `أُلغي آلياً: إعادة حساب حضور ${date} لم تعد تبرر الأوفرتايم (${reason})`,
        })
        this.logger.log(`أُلغي طلب الأوفرتايم #${req.id} آلياً — ${date} (${reason})`)
      }
      entry.status = 'REJECTED'
      entry.payableHours = null as any
      await this.overtime.save(entry)
      await releaseOvertimeDayClaim(this.days.manager, entry.id)
      await appendOvertimeEvent(this.days.manager, { entryId: entry.id, requestId: entry.requestId, eventType: 'AUTO_CANCELLED', reason })
    }
  }

  // أدلة خام مؤرخة؛ لا تعيد تفسير الحضور المالي المقفل ولا تحفظ صفوفًا من GET.
  async overtimePreview(user: JwtPayload, date: string, requestedEmployeeId?: number, requestId?: number) {
    const employeeId = requestedEmployeeId ?? user.employeeId
    if (!Number.isSafeInteger(employeeId) || Number(employeeId) < 1) throw new BadRequestException('اختر موظفًا مرتبطًا بالنظام')
    const isSelf = employeeId === user.employeeId
    if (!isSelf && !userHasPerm(user, 'requests.create_on_behalf')) throw new ForbiddenException('لا تملك صلاحية معاينة طلب إضافي نيابة عن موظف')
    return this.days.manager.transaction(async em => {
      await lockPayrollEmployees(em, [employeeId!])
      const employee = await em.getRepository(Employee).findOneBy({ id: employeeId! })
      if (!employee) throw new NotFoundException('الموظف غير موجود')
      const scope = branchScopeOf(user)
      if (!isSelf && scope !== null && employee.branchId !== scope) throw new ForbiddenException('الموظف خارج نطاق فرعك')
      let exceptEntryId: number | undefined
      if (requestId != null) {
        if (!Number.isSafeInteger(requestId) || requestId < 1) throw new BadRequestException('معرف طلب الإضافي غير صالح')
        const request = await em.getRepository(Request).findOneBy({ id: requestId })
        if (!request) throw new NotFoundException('طلب الإضافي غير موجود')
        if (request.requesterId !== employeeId || (!isSelf && request.createdByUserId !== user.sub && user.role !== 'super_admin')) {
          throw new ForbiddenException('الطلب لا يخص الموظف أو لا تملك إعادة تقديمه نيابة عنه')
        }
        const type = await em.getRepository(RequestType).findOneBy({ code: request.definitionCode ?? request.typeCode })
        if (!type || !(['OVERTIME', 'OVERTIME_AUTO'].includes(type.code) || ['overtime_entries', 'overtime_auto'].includes(type.destinationHandler))) throw new BadRequestException('الطلب ليس طلب إضافي')
        let payload: Record<string, unknown> = {}
        try { payload = JSON.parse(request.payload || '{}') } catch { /* الحمولة التالفة لا تمنح استثناء حجز. */ }
        if (request.status !== 'RETURNED_FOR_INFO' || payload.date !== date) throw new BadRequestException('استثناء حجز المعاينة متاح للطلب المُرجع وفي نفس يومه فقط')
        const linked = await em.getRepository(OvertimeEntry).find({ where: { requestId } })
        if (linked.length > 1 || (linked[0] && (linked[0].employeeId !== employeeId || linked[0].date !== date || !['DETECTED', 'SUBMITTED'].includes(linked[0].status)))) {
          throw new ConflictException('سجل الإضافي المرتبط لا يسمح بإعادة تقديم آمنة؛ راجع الحالة أو التعارض التاريخي')
        }
        if (request.typeCode === 'OVERTIME_AUTO' && !linked.length) throw new ConflictException('طلب كشف قديم بلا سجل مرتبط؛ راجع المرجع قبل إعادة التقديم')
        exceptEntryId = linked[0]?.id
      }
      const evidence = await this.overtimeEvidence(employeeId!, date, em)
      const existing = await findActiveOvertimeEntries(em, employeeId!, date)
      const submission = await describeOvertimeSubmission(em, evidence, exceptEntryId)
      // حدود التقديم والسجل القائم لا تدخل بصمة الأدلة؛ إنشاء الطلب لا يغير الدليل نفسه.
      const blockers = [...evidence.blockers, ...submission]
      return { ...evidence, blockers, canSubmit: blockers.length === 0, resubmission: requestId != null,
        existingRecord: existing[0] ? { id: existing[0].id, status: existing[0].status, requestId: existing[0].requestId ?? null } : null }
    })
  }

  // أدلة خام مؤرخة؛ لا تعيد تفسير الحضور المالي المقفل ولا تحفظ صفوفًا من GET.
  async overtimeEvidence(employeeId: number, date: string, em?: EntityManager): Promise<OvertimeEvidence> {
    if (em && em !== this.days.manager) return this.inManager(em).overtimeEvidence(employeeId, date)
    attendanceRuleDate(date)
    if (!Number.isSafeInteger(employeeId) || employeeId < 1) throw new BadRequestException('معرف الموظف غير صالح')
    const emp = await this.employees.findOneBy({ id: employeeId })
    if (!emp) throw new NotFoundException('الموظف غير موجود')
    const shift = await this.shiftFor(employeeId, date)
    const frame = await this.workdayFrame(employeeId, date, shift)
    const sc = this.nightWindows(shift.sourceSettings as Shift | null, frame)
    const calendar = await this.calendarDay(employeeId, date)
    const kind = calendar.dayKind
    const dayKind = kind === 'WORKING' ? 'WEEKDAY' : kind
    const policy = await this.overtimeEvidencePolicy(shift, dayKind)
    const window = await this.overtimeWindow(date, calendar.branchId!)
    const windows = await loadAttendanceExemptions(this.days.manager, employeeId, date, date)
    const exemptDefault = await this.configValue('payroll.exempt_overtime_eligible', 'false')
    if (!['true', 'false'].includes(exemptDefault)) throw new BadRequestException('إعداد استحقاق المستثنى للإضافي غير صالح')
    const exemption = exemptionPolicyOnDate(windows, date, { overtimeEligible: exemptDefault === 'true', unpaidLeaveDeductible: true })
    const flags: string[] = [], blockers: OvertimeBlocker[] = []
    const block = (code: string, message: string) => { blockers.push({ code, message }); if (!flags.includes(code)) flags.push(code) }
    const base: Omit<OvertimeEvidence, 'fingerprint'> = {
      schemaVersion: 1, employeeId, workDate: date, evidenceMode: exemption.isExempt ? 'EXEMPT_APPROVAL' : 'PUNCH',
      exemptionId: exemption.exemptionId ?? null, overtimeEligible: exemption.overtimeEligible,
      schedule: { name: shift.name, start: shift.start, end: shift.end, sourceType: shift.sourceType,
        sourceId: shift.sourceId, sourceVersionId: shift.sourceVersionId, employeeVersionId: shift.employeeVersionId,
        flexEnabled: shift.flexEnabled, overtimeStartMinute: null },
      firstIn: null, lastOut: null, checkIn: null, checkOut: null, dayKind, window,
      rawMinutes: 0, detectedMinutes: 0, policy, flags, blockers,
    }
    if (!window.open) flags.push('CLOSED_WINDOW_REASON_REQUIRED')
    const leaves = await this.leaves.find({ where: { employeeId, status: 'APPROVED', fromDate: LessThanOrEqual(date), toDate: MoreThanOrEqual(date) } })
    if (leaves.length) block('LEAVE_CONFLICT', 'اليوم يتعارض مع إجازة معتمدة؛ سوِّ الإجازة قبل تقديم الإضافي')
    // الاستحقاق الصريح للمستثنى مستقل، ويجوز أن يسبق العمل؛ لا نستخرج ساعاته من البصمة.
    if (exemption.isExempt) {
      flags.push('EXPLICIT_HOURS_REQUIRED')
      if (!exemption.overtimeEligible) block('EXEMPT_NOT_ELIGIBLE', `الموظف مستثنى من الحضور بالقرار #${exemption.exemptionId} وغير مستحق للإضافي في هذا اليوم`)
      return { ...base, fingerprint: overtimeEvidenceFingerprint(base) }
    }
    const punches = await this.punches.find({ where: { employeeId, punchTime: Between(frame.from, frame.to) }, order: { punchTime: 'ASC' } })
    const corrections = await this.corrections.find({ where: { employeeId, date }, order: { id: 'ASC' } })
    const selected = selectOvertimePunches(date, frame, sc, punches, corrections)
    const { checkIn, checkOut, checkInInstant, checkOutInstant } = selected
    Object.assign(base, { firstIn: checkInInstant?.toISOString() ?? null, lastOut: checkOutInstant?.toISOString() ?? null,
      checkIn: wallClock(checkIn), checkOut: wallClock(checkOut) })
    if (selected.duplicatePunches) flags.push('DUPLICATE_PUNCHES_IGNORED')
    if (selected.malformedCorrection) block('ATTENDANCE_REVIEW', 'تصحيح البصمة غير صالح ويحتاج مراجعة')
    const storedDay = await this.days.findOneBy({ employeeId, date })
    if (storedDay?.status === 'absent') block('ABSENCE_CONFLICT', 'اليوم مسجل غيابًا؛ سوِّ حالة الحضور أولًا')
    if (date > localDateOf(new Date())) block('FUTURE_DATE', 'طلب الإضافي المستند إلى البصمة يتطلب يوم عمل فعليًا')
    if (!checkIn && !checkOut) block('NO_PUNCH_EVIDENCE', 'لا توجد بصمات معتبرة لهذا اليوم')
    else if (!checkIn || !checkOut) block('INCOMPLETE_PUNCH', 'بصمة الحضور أو الانصراف ناقصة؛ سوِّ سجل الحضور أولًا')
    if (shift.source === 'none' && kind === 'WORKING') block('UNSCHEDULED', 'اليوم بلا دوام محدد يمكن احتساب الإضافي بعده')
    const start = shift.source === 'none' ? 0 : toMinutes(shift.start)
    const end = shift.source === 'none' ? 0 : toMinutes(shift.end) + (frame.overnight ? 1440 : 0)
    let overtimeStart = end
    const flexPolicy = shift.sourceSettings?.flexPolicy ?? await attendanceFlexPolicy(this.days.manager)
    if (checkInInstant && checkOutInstant) {
      const duration = (checkOutInstant.getTime() - checkInInstant.getTime()) / 60000
      if (duration <= 0 || duration > flexPolicy.maxSessionMinutes || checkInInstant.getTimezoneOffset() !== checkOutInstant.getTimezoneOffset()) block('ATTENDANCE_REVIEW', 'مدة البصمات أو تغير التوقيت يحتاج مراجعة قبل احتساب الإضافي')
      if (kind === 'WORKING' && shift.source !== 'none') {
        const mid = Math.round((start + end) / 2)
        const halfLeaves = leaves.filter(l => (l.period ?? 'FULL') !== 'FULL').map(l => ({ from: l.period === 'MORNING' ? start : mid, to: l.period === 'MORNING' ? mid : end }))
        const precise = (time: string, instant: Date) => toMinutes(time) + instant.getSeconds() / 60 + instant.getMilliseconds() / 60000
        const required = shift.sourceSettings?.requiredWorkMinutes != null ? Number(shift.sourceSettings.requiredWorkMinutes)
          : shift.sourceSettings?.requiredHours != null ? Math.round(Number(shift.sourceSettings.requiredHours) * 60) : end - start
        const result = calculateAttendanceFlex({ startMinute: start, endMinute: end,
          checkInMinute: precise(checkIn!, checkInInstant), checkOutMinute: precise(checkOut!, checkOutInstant),
          flexEnabled: shift.flexEnabled, flexWindowMinutes: shift.flexWindowMinutes, requiredWorkMinutes: required,
          graceMinutes: 0, countEarlyWorkTowardRequired: flexPolicy.countEarlyWorkTowardRequired,
          prorateFlexWindowOnPartialLeave: flexPolicy.prorateWindowOnPartialLeave, unpaidBreakMinutes: flexPolicy.unpaidBreakMinutes,
          maxSessionMinutes: flexPolicy.maxSessionMinutes, halfLeaveWindows: halfLeaves,
          permissions: (await this.approvedPermissionWindows(employeeId, date)).map(w => frame.window(w)) })
        if (result.attendanceReviewRequired) block('ATTENDANCE_REVIEW', result.attendanceReviewReason || 'تعريف الدوام يحتاج مراجعة')
        if (shift.flexEnabled && result.expectedEndMinute != null) overtimeStart = Math.max(end, Math.ceil(result.expectedEndMinute))
      }
      const raw = kind !== 'WORKING' ? Math.max(0, duration) : Math.max(0, (checkOutInstant.getTime() - Math.max(checkInInstant.getTime(), atMinute(date, overtimeStart).getTime())) / 60000)
        + (policy.earlyOvertime ? Math.max(0, (Math.min(checkOutInstant.getTime(), atMinute(date, start).getTime()) - checkInInstant.getTime()) / 60000) : 0)
      const result = overtimeMinutes(raw, policy)
      base.rawMinutes = result.rawMinutes
      base.detectedMinutes = result.detectedMinutes
      if (result.capped) flags.push('DAILY_CAP_TRIMMED')
      if (!result.detectedMinutes && !blockers.length) block('BELOW_THRESHOLD', 'مدة العمل الإضافي دون العتبة أو وحدة التقريب المقررة')
    }
    base.schedule.overtimeStartMinute = kind === 'WORKING' && shift.source !== 'none' ? overtimeStart : null
    if (blockers.length) base.detectedMinutes = 0
    return { ...base, fingerprint: overtimeEvidenceFingerprint(base) }
  }

  private async overtimeEvidencePolicy(shift: DayAttendanceShift, kind: OvertimeEvidence['dayKind']): Promise<OvertimeEvidencePolicy> {
    const names = ['rounding_minutes', 'rounding_direction', 'request_backdate_days', 'max_closed_periods',
      'max_hours_per_day', 'max_hours_per_week', 'max_hours_per_month', 'allow_early_overtime',
      'missing_punch_policy', 'leave_conflict_policy', 'detection_threshold_hours',
      'multiplier_weekday', 'multiplier_weekend', 'multiplier_holiday']
    const rows = await this.config.find({ where: { key: In(names.map(key => `overtime.${key}`)) } })
    const values = new Map(rows.map(row => [row.key.slice('overtime.'.length), row.value]))
    const number = (key: string, fallback: number, integer = false) => {
      const value = Number(values.get(key) ?? fallback)
      if (!Number.isFinite(value) || value < 0 || (integer && !Number.isSafeInteger(value))) throw new BadRequestException(`إعداد الإضافي ${key} غير صالح`)
      return value
    }
    const roundingMinutes = number('rounding_minutes', 15, true)
    if (roundingMinutes < 1 || roundingMinutes > 1440 || (values.get('rounding_direction') ?? 'DOWN') !== 'DOWN') throw new BadRequestException('وحدة تقريب الإضافي يجب أن تكون من 1 إلى 1440 دقيقة واتجاهه للأسفل')
    const missingPunch = values.get('missing_punch_policy') ?? 'BLOCK'
    const leaveConflict = values.get('leave_conflict_policy') ?? 'BLOCK'
    const early = values.get('allow_early_overtime') ?? 'false'
    if (missingPunch !== 'BLOCK' || leaveConflict !== 'BLOCK' || !['true', 'false'].includes(early)) throw new BadRequestException('سياسة أدلة الإضافي غير مدعومة؛ راجع الإعدادات')
    const rawThresholdMinutes = shift.sourceSettings?.overtimeThresholdHours != null ? Number(shift.sourceSettings.overtimeThresholdHours) * 60 : number('detection_threshold_hours', 0.5) * 60
    if (!Number.isFinite(rawThresholdMinutes) || rawThresholdMinutes < 0) throw new BadRequestException('عتبة الإضافي في الدوام غير صالحة')
    // إزالة ضجيج الضرب فقط؛ لا نحول عتبة مصدر قديمة ذات كسر حقيقي إلى سياسة دقائق أخرى.
    const thresholdMinutes = Math.abs(rawThresholdMinutes - Math.round(rawThresholdMinutes)) <= 1e-8 ? Math.round(rawThresholdMinutes) : rawThresholdMinutes
    const cap = (key: string) => {
      const value = number(key, 0) * 60
      const minutes = Math.round(value)
      // نفس سماح إعدادات النظام: 4.1 ساعة تساوي246 دقيقة رغم تمثيلها الثنائي.
      if (!Number.isSafeInteger(minutes) || Math.abs(value - minutes) > 1e-8) throw new BadRequestException('سقف الإضافي يجب أن يمثل عدد دقائق صحيحًا')
      return minutes
    }
    return { thresholdMinutes, roundingMinutes, roundingDirection: 'DOWN',
      maxDailyMinutes: cap('max_hours_per_day'), maxWeeklyMinutes: cap('max_hours_per_week'), maxMonthlyMinutes: cap('max_hours_per_month'),
      backdateDays: number('request_backdate_days', 30, true), maxClosedPeriods: number('max_closed_periods', 1, true),
      multiplier: number(kind === 'HOLIDAY' ? 'multiplier_holiday' : kind === 'WEEKEND' ? 'multiplier_weekend' : 'multiplier_weekday', kind === 'HOLIDAY' ? 2 : 1.5),
      earlyOvertime: early === 'true', missingPunch: 'BLOCK', leaveConflict: 'BLOCK' }
  }

  // الاكتشاف والطلب يشتركان في نفس الأدلة والحجز. المعتمد والمدفوع قرار ثابت.
  private async detectOvertime(emp: Employee, date: string) {
    if (!this.days.manager.queryRunner?.isTransactionActive) throw new Error('كشف الإضافي يتطلب معاملة الحضور وقفل الموظف')
    const active = await findActiveOvertimeEntries(this.days.manager, emp.id, date)
    if (active.length > 1) throw new ConflictException({ code: 'OVERTIME_DUPLICATE_LEGACY', message: 'توجد قيود إضافي فعالة مكررة لهذا اليوم؛ راجع المصادر قبل إعادة الحساب' })
    const current = active[0]
    if (current && (current.source === 'PRE_REQUESTED' || ['APPROVED', 'PAID', 'SUBMITTED'].includes(current.status))) return
    if (!current) {
      const rejected = await this.overtime.find({ where: { employeeId: emp.id, date, source: 'BIOMETRIC_DETECTED', status: 'REJECTED' } })
      for (const entry of rejected) {
        const request = entry.requestId ? await this.requests.findOneBy({ id: entry.requestId }) : null
        // رفض المعتمد ينهي الاكتشاف لهذا اليوم؛ طلب الموظف الجديد يظل مسموحًا بمراجعة صريحة.
        if (!entry.requestId || request?.status !== 'CANCELLED') return
      }
    }
    const evidence = await this.overtimeEvidence(emp.id, date)
    if (!evidence.window.open || evidence.evidenceMode !== 'PUNCH' || evidence.blockers.length || evidence.detectedMinutes <= 0) {
      await this.clearStaleOvertime(emp.id, date, evidence.blockers.map(row => row.message).join('؛ ') || 'نافذة الإضافي مغلقة أو لا توجد مدة مستحقة')
      return
    }
    await assertOvertimeDayAvailable(this.days.manager, emp.id, date, current?.id)
    const entry = current ?? this.overtime.create({ employeeId: emp.id, date, source: 'BIOMETRIC_DETECTED', status: 'DETECTED' })
    const oldFingerprint = entry.calculationSnapshot?.evidence?.fingerprint
    entry.hoursActual = evidence.detectedMinutes / 60
    entry.rate = evidence.policy.multiplier
    entry.payableHours = null as any
    entry.calculationSnapshot = { schemaVersion: 1, evidence }
    const saved = await this.overtime.save(entry)
    await claimOvertimeDay(this.days.manager, saved)
    if (oldFingerprint !== evidence.fingerprint) await appendOvertimeEvent(this.days.manager, {
      entryId: saved.id, eventType: current ? 'DETECTION_REFRESHED' : 'DETECTED', payload: { evidence },
    })
    queueOvertimeDispatch(this.days.manager, saved.id)
  }

  // ===== الجدولة الأسبوعية =====
  async upsertSchedule(
    entries: Array<{
      weekStart: string
      employeeId: number
      shiftName: string
      startTime: string
      endTime: string
      shiftId?: number
    }>,
    user?: JwtPayload // بلا مستخدم = نداء داخلي موثوق
  ): Promise<{ saved: ScheduleEntry[]; skipped: Array<{ employeeId: number; reason: string }> }> {
    if (!this.days.manager.queryRunner?.isTransactionActive) {
      return this.days.manager.transaction(em => this.inManager(em).upsertSchedule(entries, user))
    }
    // موظف خارج نطاق فرع المستخدم أو المستخدم نفسه يُتخطّى ويُبلَّغ (skipped)،
    // والطلب كله مرفوض إن لم يبقَ فيه مسموح
    const skipped: Array<{ employeeId: number; reason: string }> = []
    if (user) {
      const ids = [...new Set(entries.map((e) => Number(e.employeeId)))]
      const emps = ids.length ? await this.employees.find({ where: { id: In(ids) } }) : []
      const byId = new Map(emps.map((e) => [e.id, e]))
      entries = entries.filter((e) => {
        const emp = byId.get(Number(e.employeeId))
        const reason = emp
          ? this.writeBlock(user, emp, 'لا يمكنك تعديل ورديتك بنفسك')
          : 'الموظف غير موجود'
        if (reason) skipped.push({ employeeId: Number(e.employeeId), reason })
        return !reason
      })
      if (entries.length === 0) {
        throw new ForbiddenException([...new Set(skipped.map((s) => s.reason))].join('، '))
      }
    }
    const saved: ScheduleEntry[] = []
    await lockAttendanceRuleMutation(this.days.manager, [...new Set(entries.map(e => Number(e.employeeId)))])
    for (const entry of entries) {
      const weekStart = weekKeyOf(attendanceRuleDate(entry.weekStart))
      await assertAttendanceRulePeriodOpen(this.days.manager, [entry.employeeId], dateAfter(weekStart, -1), dateAfter(weekStart, 7))
    }
    for (const e of entries) {
      const weekStart = weekKeyOf(e.weekStart)
      let row = await this.schedule.findOne({
        where: { weekStart, employeeId: e.employeeId },
      })
      if (!row) row = this.schedule.create({ weekStart, employeeId: e.employeeId })
      // مرجع الوردية (من الطلب أو باسمها) — به تُقرأ الأوقات حيّة لاحقاً
      Object.assign(row, await this.scheduleShift(e, Array.from({ length: 7 }, (_, offset) => dateAfter(weekStart, offset))))
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
    return { saved, skipped }
  }

  // إعادة حساب الأيام المتأثرة بتعديل وردية — يُستدعى بعد تحرير الوردية
  // في الكتالوج حتى تسري الأوقات الجديدة على الأيام المحسوبة سابقاً.
  // (المحسوب فقط: يوم بلا سجل لا يُختلق)
  async recomputeForShift(shiftId: number) {
    const shift = await this.shiftsCatalog.findOne({ where: { id: shiftId } })
    if (!shift) return { recomputed: 0 }
    const today = localDateOf(new Date())
    // ترقية الصفوف القديمة التي أُسندت بالاسم قبل وجود المرجع
    await this.schedule.update(
      { shiftName: shift.name, shiftId: IsNull() },
      { shiftId }
    )
    await this.dayOverrides.update(
      { shiftName: shift.name, shiftId: IsNull() },
      { shiftId }
    )

    const targets = new Set<string>() // employeeId|date
    for (const entry of await this.schedule.find({ where: { shiftId } })) {
      for (let i = 0; i < 7; i++) {
        const d = new Date(`${entry.weekStart}T12:00:00`)
        d.setDate(d.getDate() + i)
        const date = localDateOf(d)
        if (date > today) break
        targets.add(`${entry.employeeId}|${date}`)
      }
    }
    for (const ov of await this.dayOverrides.find({ where: { shiftId } })) {
      if (ov.date <= today) targets.add(`${ov.employeeId}|${ov.date}`)
    }
    // الأيام المحسوبة بهذه الوردية (مرجعها مخزّن في اليوم نفسه)
    for (const d of await this.days.find({ where: { shiftId } })) {
      if (d.date <= today) targets.add(`${d.employeeId}|${d.date}`)
    }

    let recomputed = 0
    let failed = 0
    for (const key of targets) {
      const [empId, date] = key.split('|')
      const existing = await this.days.findOne({
        where: { employeeId: Number(empId), date },
      })
      if (!existing) continue // لا نختلق يوماً لم يُحسب أصلاً
      try {
        await this.computeDay(Number(empId), date)
        recomputed++
      } catch (e) {
        // أفضل جهد — يوم واحد لا يُفشل العملية، لكن لا يُبلع بصمت
        failed++
        this.logger.warn(
          `تعذر إعادة حساب يوم ${date} للموظف ${empId} بعد تعديل الوردية ${shiftId}: ${(e as Error).message}`
        )
      }
    }
    return { recomputed, failed }
  }

  // إعادة حساب الأيام المحسوبة في مدى تواريخ — بعد إضافة/تعديل/حذف عطلة رسمية
  // (غياب صار يوم عطلة يتصحّح والعكس). المحسوب فقط: يوم بلا سجل لا يُختلق.
  // branchId: أيام موظفي فرع بعينه فقط (تغيّر دولة الفرع)
  async recomputeDateRange(from: string, to: string, branchId?: number | null) {
    if (to < from) [from, to] = [to, from]
    let rows = await this.days.find({ where: { date: Between(from, to) } })
    if (branchId != null) {
      const ids = new Set(
        (await this.employees.find({ where: { branchId } })).map((e) => e.id)
      )
      rows = rows.filter((r) => ids.has(r.employeeId))
    }
    let recomputed = 0
    let failed = 0
    for (const r of rows) {
      try {
        await this.computeDay(r.employeeId, r.date)
        recomputed++
      } catch (e) {
        failed++
        this.logger.warn(
          `تعذر إعادة حساب يوم ${r.date} للموظف ${r.employeeId}: ${(e as Error).message}`
        )
      }
    }
    return { recomputed, failed }
  }

  // أيام لم تعد عطلة (عطلة حُذفت أو قُلّص مداها أو نُقل، أو تغيّرت دولة الفرع):
  // التجسيد كان يتخطاها وهي عطلة فلا صف لمن لم يبصم فيها — فتبقى فارغة في شاشات
  // الحضور حتى حساب المسير. يُجسَّد غيابهم الآن حتى أمس فقط (اليوم الجاري لا
  // يُجسَّد قبل انتهائه، كالمهمة الليلية وإعادة حساب اليوم). branchId: فرع بعينه
  async materializeFormerHolidays(from: string, to: string, branchId?: number | null) {
    if (to < from) [from, to] = [to, from]
    const y = new Date(`${localDateOf(new Date())}T12:00:00`)
    y.setDate(y.getDate() - 1)
    const yesterday = localDateOf(y)
    if (to > yesterday) to = yesterday
    if (from > to) return { created: 0, failed: 0 }
    const r = await this.materializeAbsencesAll(from, to, branchId)
    return { created: r.created, failed: r.failed.length }
  }

  // تغيّر دولة الفرع يغيّر العطلات السارية عليه: كل عطلة
  // تغيّر سريانها تُعاد أيام موظفي الفرع المحسوبة في مداها، والتي لم تعد تسري
  // يُجسَّد غياب من لم يبصم في أيامها. لا شيء لو لم يتغيّر سريان أي عطلة
  async recomputeForBranchCountry(
    branchId: number,
    before?: string | null,
    after?: string | null
  ) {
    const norm = (c?: string | null) => String(c ?? '').trim().toUpperCase()
    const b = norm(before)
    const a = norm(after)
    const out = { recomputed: 0, materialized: 0, failed: 0 }
    if (a === b) return out
    // نفس شرط التقويم: فرع بلا دولة = كل العطلات، وعطلة بلا دولة = كل الفروع
    const applies = (h: PublicHoliday, c: string) => !c || !h.country || norm(h.country) === c
    for (const h of await this.holidays.find()) {
      const was = applies(h, b)
      const is = applies(h, a)
      if (was === is) continue
      const from = String(h.date).slice(0, 10)
      const to = String(h.endDate || h.date).slice(0, 10)
      const r = await this.recomputeDateRange(from, to, branchId)
      out.recomputed += r.recomputed
      out.failed += r.failed
      if (was && !is) {
        const m = await this.materializeFormerHolidays(from, to, branchId)
        out.materialized += m.created
        out.failed += m.failed
      }
    }
    return out
  }

  // إعادة حساب الأيام المحسوبة من جدول عمل بعد تعديله في الكتالوج أو نقل علم
  // الافتراضي (كانت لا تُعاد فتبقى بالساعات القديمة). employees: أيام الموظفين
  // المُسند لهم الجدول (ساعاته وعطلته الأسبوعية). defaultDays: أيام «جدول
  // افتراضي» و«بلا وردية» (scheduleSource = default/none) عند مسّ الافتراضي؛
  // صفوف ما قبل تخزين المصدر (NULL) حُسبت بوردية ثابتة في الكود لا بهذا الجدول
  // فتُترك لإعادة حساب يومها. المحسوب فقط وحتى اليوم — يوم بلا سجل لا يُختلق
  async recomputeForWorkSchedule(
    workScheduleId: number,
    opts: { employees: boolean; defaultDays: boolean }
  ) {
    const today = localDateOf(new Date())
    const rows: AttendanceDay[] = []
    if (opts.employees) {
      const ids = (await this.employees.find({ where: { workScheduleId } })).map((e) => e.id)
      // دفعات تحت حد معاملات SQL Server (2100)
      for (let i = 0; i < ids.length; i += 1000) {
        rows.push(
          ...(await this.days.find({
            where: { employeeId: In(ids.slice(i, i + 1000)), date: LessThanOrEqual(today) },
          }))
        )
      }
    }
    if (opts.defaultDays) {
      rows.push(
        ...(await this.days.find({
          where: {
            scheduleSource: In(['default', 'none'] as ScheduleSource[]),
            date: LessThanOrEqual(today),
          },
        }))
      )
    }
    const seen = new Set<string>()
    let recomputed = 0
    let failed = 0
    for (const r of rows) {
      const key = `${r.employeeId}|${r.date}`
      if (seen.has(key)) continue
      seen.add(key)
      try {
        await this.computeDay(r.employeeId, r.date)
        recomputed++
      } catch (e) {
        failed++
        this.logger.warn(
          `تعذر إعادة حساب يوم ${r.date} للموظف ${r.employeeId}: ${(e as Error).message}`
        )
      }
    }
    return { recomputed, failed }
  }

  // صفوف حُسبت قبل تخزين مصدر الوردية (scheduleSource = NULL): يُشتق مصدرها
  // للعرض فقط بلا كتابة، بأولوية shiftFor نفسها (تجاوز ← أسبوع ← جدول الموظف ←
  // مفترَض)، حتى تظهر علامة «جدول افتراضي» ويعمل فلتر «بلا وردية مُسندة» على
  // الأيام القديمة أيضاً. القديم بلا جدول حُسب بوردية مفترَضة ثابتة فمصدره
  // 'default' (وجدول الموظف بحسب إسناده الحالي)
  // EX-14: نعيد فقط معلومات نافذة الاستثناء اللازمة للكشف، دون السبب الطبي أو
  // تفاصيل اعتماد القرار. البصمات ومدة التواجد تبقيان معلومات فعلية.
  private exemptionView(day: AttendanceDay, exemption: AttendanceExemption | null): AttendanceDayWithExemption {
    if (exemption) {
      if (!['holiday', 'leave', 'partial_leave'].includes(day.status)) day.status = 'exempt'
      day.lateMinutes = 0
      day.earlyLeaveMinutes = 0
      day.deductibleMinutes = 0
      day.rawLateMinutes = 0
      day.unexcusedLateMinutes = 0
      day.shortfallMinutes = 0
      day.flexOutcome = 'EXEMPT'
      day.attendanceReviewRequired = false
      day.attendanceReviewReason = null
      if (day.attendanceRuleSnapshot) day.attendanceRuleSnapshot = {
        ...day.attendanceRuleSnapshot, attendanceExempt: true, rawLateMinutes: 0,
        unexcusedLateMinutes: 0, shortfallMinutes: 0, lateMinutes: 0,
        paidPermissionCoveredMinutes: 0, paidPermissionDeductibleMinutes: 0,
        paidPermissionShortfallCoveredMinutes: 0, flexOutcome: 'EXEMPT',
        attendanceReviewRequired: false, attendanceReviewReason: null,
      }
      day.graceUsed = null as any
    }
    return Object.assign(day, {
      attendanceExempt: !!exemption,
      hasShortfall: !exemption && Number(day.shortfallMinutes) > 0,
      exemption: exemption ? {
        id: exemption.id,
        effectiveFrom: exemption.effectiveFrom,
        effectiveTo: exemption.effectiveTo,
        terminatedFrom: exemption.terminatedFrom,
        requiresCheckinForPresence: exemption.requiresCheckinForPresence,
      } : null,
    })
  }

  private async exemptionsFor(employeeIds: number[], from: string, to: string) {
    const ids = [...new Set(employeeIds)]
    const windows = new Map<number, AttendanceExemption[]>()
    // عدد محدود من القراءات المتوازية حتى لا نستهلك اتصالات قاعدة البيانات كلها.
    for (let i = 0; i < ids.length; i += 20) {
      await Promise.all(ids.slice(i, i + 20).map(async id => {
        windows.set(id, await loadAttendanceExemptions(this.days.manager, id, from, to))
      }))
    }
    return windows
  }

  private attendanceEmploymentDate(emp: Employee, date: string) {
    const hireDate = emp.actualStartDate || emp.joinDate
    return (!hireDate || date >= hireDate) &&
      (!emp.archivedAt || date <= localDateOf(new Date(emp.archivedAt)))
  }

  // الأيام المعتمدة المستثناة تظهر ولو لم يجسدها التشغيل الليلي. مسار الحساب
  // readOnly يعيد استخدام تفسير العطلة والإجازة والوردية دون كتابة أو كشف إضافي.
  private async projectExemptionDays(rows: AttendanceDay[], employees: Employee[], from: string, to: string) {
    const windows = await this.exemptionsFor([...rows, ...employees.map(emp => ({ employeeId: emp.id }))]
      .map(row => row.employeeId), from, to)
    const result = new Map<string, AttendanceDayWithExemption>()
    for (const row of rows) {
      const exemption = exemptionOnDate(windows.get(row.employeeId) ?? [], row.date)
      const day = await this.computeDay(row.employeeId, row.date, false, true)
      result.set(`${row.employeeId}|${row.date}`, day)
    }
    for (const emp of employees) {
      const employeeWindows = windows.get(emp.id) ?? []
      if (!employeeWindows.length) continue
      for (let date = from; date <= to; date = dateAfter(date, 1)) {
        const key = `${emp.id}|${date}`
        if (result.has(key) || !this.attendanceEmploymentDate(emp, date) ||
          !exemptionOnDate(employeeWindows, date)) continue
        const day = await this.computeDay(emp.id, date, false, true)
        result.set(key, Object.assign(day, { id: day.id ?? -emp.id, projected: true }))
      }
    }
    return [...result.values()].sort((a, b) => a.date.localeCompare(b.date) || a.employeeId - b.employeeId)
  }

  private async withDerivedSource<T extends AttendanceDay>(rows: T[]): Promise<T[]> {
    const legacy = rows.filter((r) => r.scheduleSource == null)
    if (legacy.length === 0) return rows
    const empIds = [...new Set(legacy.map((r) => r.employeeId))]
    // موظف واحد (الكشف الشهري) يُقيَّد به، وإلا يوم واحد لكل موظفي النطاق
    const oneEmp = empIds.length === 1 ? { employeeId: empIds[0] } : {}
    const dates = legacy.map((r) => r.date).sort()
    const weeks = [...new Set(dates.map((d) => weekKeyOf(d)))]
    const [emps, schedules, overrides, entries] = await Promise.all([
      this.employees.find({ where: empIds.length === 1 ? { id: empIds[0] } : {} }),
      this.workSchedules.find(),
      this.dayOverrides.find({
        where: { ...oneEmp, date: Between(dates[0], dates[dates.length - 1]) },
      }),
      this.schedule.find({ where: { ...oneEmp, weekStart: In(weeks) } }),
    ])
    const wsIds = new Set(schedules.map((w) => w.id))
    const own = new Set(
      emps.filter((e) => e.workScheduleId && wsIds.has(e.workScheduleId)).map((e) => e.id)
    )
    const ovKeys = new Set(overrides.map((o) => `${o.employeeId}|${o.date}`))
    const weekKeys = new Set(entries.map((e) => `${e.employeeId}|${e.weekStart}`))
    for (const r of legacy) {
      r.scheduleSource = ovKeys.has(`${r.employeeId}|${r.date}`)
        ? 'override'
        : weekKeys.has(`${r.employeeId}|${weekKeyOf(r.date)}`)
          ? 'week'
          : own.has(r.employeeId)
            ? 'employee'
            : 'default'
    }
    return rows
  }

  async weekSchedule(week: string, user: JwtPayload) {
    const rows = await this.schedule.find({ where: { weekStart: weekKeyOf(week) } })
    return this.scheduleRowsInScope(rows, user)
  }

  async clearWeekSchedule(week: string, employeeId: number, user: JwtPayload): Promise<{ deleted: boolean; failed: string[] }> {
    if (!this.days.manager.queryRunner?.isTransactionActive) {
      return this.days.manager.transaction(em => this.inManager(em).clearWeekSchedule(week, employeeId, user))
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(week ?? '') || localDateOf(new Date(`${week}T12:00:00`)) !== week) {
      throw new BadRequestException('تاريخ الأسبوع غير صالح')
    }
    const emp = await this.employees.findOneBy({ id: employeeId })
    if (!emp) throw new NotFoundException('الموظف غير موجود')
    this.assertCanWrite(user, emp, 'لا يمكنك تعديل ورديتك بنفسك')
    const weekStart = weekKeyOf(week)
    await lockAttendanceRuleMutation(this.days.manager, [employeeId])
    await assertAttendanceRulePeriodOpen(this.days.manager, [employeeId], dateAfter(weekStart, -1), dateAfter(weekStart, 7))
    const result = await this.schedule.delete({ weekStart, employeeId })
    const failed: string[] = []
    // Include neighbours: the first/last shift may own punches across midnight.
    for (let i = -1; i <= 7; i++) {
      const date = dateAfter(weekStart, i)
      if (date > localDateOf(new Date())) break
      try { await this.recomputeIfTouched(employeeId, date) }
      catch (error) {
        failed.push(date)
        this.logger.warn(`تعذر إعادة حساب ${date} للموظف ${employeeId} بعد إلغاء وردية الأسبوع: ${(error as Error).message}`)
      }
    }
    return { deleted: !!result.affected, failed }
  }

  // صفوف الجدول/التجاوزات بلا branchId — تُرشَّح بموظفي فرع المستخدم
  private async scheduleRowsInScope<T extends { employeeId: number }>(
    rows: T[],
    user: JwtPayload
  ): Promise<T[]> {
    const scope = branchScopeOf(user)
    if (scope === null) return rows
    const emps = await this.employees.find({ where: { branchId: scope } })
    const ids = new Set(emps.map((e) => e.id))
    return rows.filter((r) => ids.has(r.employeeId))
  }

  // مصدر وقتي اليوم لعمود «التحقق» في السجل اليومي — للعرض فقط بلا تخزين (يعمل على
  // الأيام القديمة أيضاً): الدخول/الخروج المحسوبان يُطابَقان ببصماتهما الخام بالدقيقة
  // (خروج الليلية صباح الغد)، والوقت بلا بصمة مطابقة جاء من تصحيح بصمة معتمد.
  // MANUAL = إدخال يدوي من HR (يغلب)، CORRECTION = تصحيح معتمد، DEVICE = جهاز البصمة؛
  // NULL = لا وقت، أو بصمة أقدم من تتبّع المصدر بلا رقم جهاز (غير محدد)
  private async withPunchSource<T extends AttendanceDay>(rows: T[], date: string) {
    const next = dateAfter(date, 1)
    const byMinute = new Map<string, AttendancePunch[]>()
    let corrected = new Set<number>()
    const ids = [
      ...new Set(rows.filter((r) => r.checkIn || r.checkOut).map((r) => r.employeeId)),
    ]
    if (ids.length > 0) {
      for (let i = 0; i < ids.length; i += 500) {
        const found = await this.punches.find({
          select: {
            id: true,
            employeeId: true,
            punchTime: true,
            source: true,
            deviceSn: true,
            reason: true,
          },
          where: {
            employeeId: In(ids.slice(i, i + 500)),
            punchTime: Between(new Date(`${date}T00:00:00`), new Date(`${next}T23:59:59`)),
          },
        })
        for (const p of found) {
          const t = new Date(p.punchTime)
          const key = `${p.employeeId}|${localDateOf(t)}|${hhmmOf(t)}`
          byMinute.set(key, [...(byMinute.get(key) ?? []), p])
        }
      }
      corrected = new Set(
        (await this.corrections.find({ where: { date } })).map((c) => c.employeeId)
      )
    }
    return rows.map((r) => {
      let punchSource: 'DEVICE' | 'MANUAL' | 'CORRECTION' | null = null
      let manualReason: string | null = null
      if (r.checkIn || r.checkOut) {
        const night = isOvernight(r.shiftStart, r.shiftEnd)
        // الدخول يوم التاريخ والخروج صباح الغد للوردية الليلية (والآخر احتياطاً)
        const probes: Array<[string | null, string[]]> = [
          [r.checkIn || null, night ? [date, next] : [date]],
          [r.checkOut || null, night ? [next, date] : [date]],
        ]
        const found = new Set<string>()
        for (const [t, dates] of probes) {
          if (!t) continue
          const hits =
            dates.map((d) => byMinute.get(`${r.employeeId}|${d}|${t}`)).find((h) => h?.length) ??
            []
          const manual = hits.find((p) => p.source === 'MANUAL')
          if (manual) {
            found.add('MANUAL')
            manualReason = manualReason ?? manual.reason ?? null
          } else if (hits.some((p) => p.source === 'DEVICE' || (p.source == null && !!p.deviceSn))) {
            found.add('DEVICE')
          } else if (hits.length === 0 && corrected.has(r.employeeId)) {
            found.add('CORRECTION')
          }
        }
        punchSource = found.has('MANUAL')
          ? 'MANUAL'
          : found.has('CORRECTION')
            ? 'CORRECTION'
            : found.has('DEVICE')
              ? 'DEVICE'
              : null
      }
      return Object.assign(r, { punchSource, manualReason })
    })
  }

  // ===== الاستعلامات (بنطاق الفرع) =====
  async daily(user: JwtPayload, date: string) {
    const scope = branchScopeOf(user)
    const where: Record<string, unknown> = { date }
    if (scope !== null) where.branchId = scope
    const stored = await this.days.find({ where: where as any, order: { employeeId: 'ASC' } })
    const candidates = (await this.employees.find({ where: scope === null ? {} : { branchId: scope } }))
      .filter(emp => (emp.isActive || !!emp.archivedAt) && this.attendanceEmploymentDate(emp, date))
    const projected = await this.projectExemptionDays(stored, candidates, date, date)
    // + مصدر وقتي كل يوم (جهاز/يدوي/تصحيح) لعمود «التحقق»
    const rows = await this.withPunchSource(
      await this.withDerivedSource(projected),
      date
    )
    // اليوم الجاري: غيابه لم يُجسَّد بعد (المهمة الليلية تجسّده) — يُحسب لحظياً
    // حتى يظهر في السجل وكارت «غائب» (صفوف عرض فقط live:true، لا تُخزَّن)
    if (date !== localDateOf(new Date())) return rows
    const live = await this.liveAbsences(date, scope)
    return [...rows, ...live].sort((a, b) => a.employeeId - b.employeeId)
  }

  // غياب اليوم الجاري لحظياً (بلا تخزين) — نفس قواعد التجسيد: موظف نشط في
  // النطاق، ملتحق وغير مؤرشف، اليوم يوم عمل له (عطلة جدول عمله/فرعه)، بلا صف
  // محسوب (لا بصمة ولا تصحيح) ولا إجازة معتمدة تغطيه، وقد مرّت بداية ورديته +
  // السماحية (المرنة: نهاية نافذة الحضور إن ضُبطت). يوم «بلا وردية» لا وقت
  // مرجعي له فيُترك للتجسيد الليلي. للسجل اليومي وكارت «غائبون» في اللوحة
  async liveAbsences(date: string, scope: number | null): Promise<Array<AttendanceDay & { live: true }>> {
    const now = new Date()
    if (date !== localDateOf(now)) return []
    const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60
    const emps = (await this.employees.find({ where: { isActive: true, ...(scope === null ? {} : { branchId: scope }) } }))
      .filter(emp => this.attendanceEmploymentDate(emp, date))
    const touched = new Set((await this.days.find({ where: { date } })).map(day => day.employeeId))
    const leaves = await this.leaves.find({ where: { status: 'APPROVED', fromDate: LessThanOrEqual(date), toDate: MoreThanOrEqual(date) } })
    const fullLeave = new Set(leaves.filter(l => (l.period ?? 'FULL') === 'FULL').map(l => l.employeeId))
    const exemptions = await this.exemptionsFor(emps.map(emp => emp.id), date, date)
    const excuses = await this.approvedDayExcuses(emps.map(emp => emp.id), date)
    const candidates = emps.filter(emp => !touched.has(emp.id) && !fullLeave.has(emp.id) && !excuses.has(emp.id)
      && !exemptionOnDate(exemptions.get(emp.id) ?? [], date))
    const out: Array<AttendanceDay & { live: true }> = []
    for (let i = 0; i < candidates.length; i += 20) {
      const batch = await Promise.all(candidates.slice(i, i + 20).map(async emp => {
        const shift = await this.shiftFor(emp.id, date)
        if (shift.source === 'none' || !shift.start) return null
        const calendar = await this.calendarDay(emp.id, date)
        if (!calendar.working) return null
        const frame = await this.workdayFrame(emp.id, date, shift)
        const start = toMinutes(shift.start), end = toMinutes(shift.end) + (frame.overnight ? 1440 : 0)
        if (nowMin < start) return null
        const mid = Math.round((start + end) / 2)
        const halfLeaveWindows = leaves.filter(l => l.employeeId === emp.id && (l.period ?? 'FULL') !== 'FULL')
          .map(l => ({ from: l.period === 'MORNING' ? start : mid, to: l.period === 'MORNING' ? mid : end }))
        const policy = shift.sourceSettings?.flexPolicy ?? await attendanceFlexPolicy(this.days.manager)
        const graceResolution = await resolveAttendanceGrace(this.days.manager, date, shift)
        const grace = graceResolution.minutes
        const result = calculateAttendanceFlex({
          startMinute: start, endMinute: end, checkInMinute: nowMin, checkOutMinute: null,
          flexEnabled: shift.flexEnabled, flexWindowMinutes: shift.flexWindowMinutes,
          requiredWorkMinutes: Number(shift.sourceSettings?.requiredWorkMinutes ??
            (shift.sourceSettings?.requiredHours != null ? Number(shift.sourceSettings.requiredHours) * 60 : end - start)),
          graceMinutes: grace, windowSupersedesGrace: policy.windowSupersedesGrace,
          prorateFlexWindowOnPartialLeave: policy.prorateWindowOnPartialLeave,
          halfLeaveWindows, permissions: (await this.approvedPermissionWindows(emp.id, date)).map(w => frame.window(w)),
        })
        const invalid = result.flexOutcome === 'INVALID_CONFIGURATION'
        if (result.lateMinutes <= 0 && !invalid) return null
        return Object.assign(this.days.create({
          id: -emp.id, employeeId: emp.id, date,
          shiftName: shift.name, shiftStart: shift.start, shiftEnd: shift.end, shiftId: shift.shiftId ?? undefined,
          scheduleSource: shift.source, unscheduled: false, status: 'absent', lateMinutes: 0, earlyLeaveMinutes: 0,
          excusedMinutes: 0, deductibleMinutes: 0, workMinutes: 0, rawLateMinutes: null,
          unexcusedLateMinutes: null, shortfallMinutes: null, countedWorkMinutes: null, earlyArrivalMinutes: null,
          flexOutcome: invalid ? 'INVALID_CONFIGURATION' : 'NO_PUNCH', attendanceReviewRequired: invalid,
          attendanceReviewReason: invalid ? 'المرونة مفعلة دون مدة نافذة صالحة؛ اضبط تعريف الدوام' : null,
          attendanceRuleSnapshot: null, leaveConflict: false, graceUsed: grace,
        }), { branchId: calendar.branchId, checkIn: null, checkOut: null, live: true as const, graceSource: graceResolution.source })
      }))
      out.push(...batch.filter((row): row is NonNullable<typeof row> => row !== null))
    }
    return out
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
    // صفوف الشهر فقط من قاعدة البيانات (لا تحميل كل تاريخ الموظف وفلترته هنا)
    const [yy, mm] = month.split('-').map(Number)
    if (mm < 1 || mm > 12) throw new BadRequestException('صيغة الشهر YYYY-MM')
    const lastDay = String(new Date(yy, mm, 0).getDate()).padStart(2, '0')
    // غياب أقدم من نافذة اللحاق الليلية لا يجسّده أحد، فيظهر الشهر «بلا غياب» حتى
    // يُحسب المسير — يُجسَّد هنا لهذا الموظف وحده (أفضل جهد) لمن يملك إدارة الحضور
    // وحده: عرض الكشف لا يكتب صفوفاً تدخل حساب الراتب بيد من لا يملك الصلاحية
    if (userHasPerm(user, 'attendance.manage')) {
      await this.catchUpEmployeeAbsences(employeeId, `${month}-01`, `${month}-${lastDay}`)
    }
    const monthRows = await this.withDerivedSource(
      await this.projectExemptionDays(await this.days.find({
        where: {
          employeeId,
          date: Between(`${month}-01`, `${month}-${lastDay}`),
        } as any,
        order: { date: 'ASC' },
      }), [emp], `${month}-01`, `${month}-${lastDay}`)
    )
    const count = (s: AttendanceStatus) =>
      monthRows.filter((r) => r.status === s).length
    const total = (f: (r: AttendanceDay) => number) =>
      monthRows.reduce((s, r) => s + Number(f(r) ?? 0), 0)
    // EX-14: أيام الاستثناء لا تدخل بسط الالتزام أو مقامه حتى مع وجود بصمة.
    const measured = monthRows.filter(row => !row.attendanceExempt && !['holiday', 'leave'].includes(row.status))
    const attended = measured.filter(row => ['present', 'late', 'early_leave', 'partial_leave', 'mission', 'remote'].includes(row.status)).length
    return {
      employeeId,
      month,
      days: monthRows,
      summary: {
        present: count('present'),
        late: count('late'),
        absent: count('absent'),
        earlyLeave: count('early_leave'),
        // الإجازة الجزئية/الكاملة والعطلة — كارت «إجازة جزئية» كان صفراً دائماً
        partialLeave: count('partial_leave'),
        leave: count('leave'),
        holiday: count('holiday'),
        // بصمة طرف واحد ليوم منقضٍ — خارج عدّ الحاضرين حتى تُصحَّح
        missingPunch: count('missing_punch'),
        // مأمورية/عمل عن بُعد معتمد — أيام معذورة لا تُعدّ غياباً
        mission: count('mission'),
        remote: count('remote'),
        exempt: count('exempt'),
        exemptDays: monthRows.filter(row => row.attendanceExempt).length,
        complianceDays: measured.length,
        attendanceRate: measured.length ? Math.round(attended * 10000 / measured.length) / 100 : null,
        totalLateMinutes: total((r) => r.lateMinutes),
        totalEarlyLeaveMinutes: total((r) => r.earlyLeaveMinutes),
        totalWorkMinutes: total((r) => r.workMinutes),
        totalCountedWorkMinutes: total((r) => r.countedWorkMinutes ?? 0),
        totalRawLateMinutes: total((r) => r.rawLateMinutes ?? 0),
        totalShortfallMinutes: total((r) => r.shortfallMinutes ?? 0),
        shortfallDays: monthRows.filter(row => Number(row.shortfallMinutes) > 0).length,
        attendanceReviewDays: monthRows.filter(row => row.attendanceReviewRequired).length,
      },
    }
  }

  private addDays(ymd: string, days: number) {
    const date = new Date(`${ymd}T12:00:00`)
    date.setDate(date.getDate() + days)
    return localDateOf(date)
  }

  // تجسيد غياب موظف واحد لمدى أقدم من نافذة اللحاق الليلية
  // (attendance.absence_catchup_max_days) — ما يقع داخل النافذة تتكفل به المهمة
  // الليلية فلا يُكرَّر هنا. الأيام التي لها صف محفوظ لا تُلمس: العرض يملأ الفجوات
  // وحدها، فالشهر المكتمل لا يُعاد حسابه يوماً يوماً في كل فتح (كان فتح شهر قديم
  // يكلّف ثوانيَ طويلة في كل مرة). idempotent، ومحدود بتاريخ التعيين وبأمس داخل
  // materializeAbsences نفسها. فشله لا يُسقط شاشة الكشف.
  private async catchUpEmployeeAbsences(employeeId: number, from: string, to: string): Promise<number> {
    try {
      const yesterday = this.addDays(localDateOf(new Date()), -1)
      if (from > yesterday) return 0
      const maxRaw = Number(await this.configValue('attendance.absence_catchup_max_days', '31'))
      const maxDays = Number.isFinite(maxRaw) && maxRaw >= 1 ? Math.min(MAX_RANGE_DAYS, Math.floor(maxRaw)) : 31
      if (from >= this.addDays(yesterday, -(maxDays - 1))) return 0
      const end = to > yesterday ? yesterday : to
      const stored = new Set(
        (await this.days.find({ where: { employeeId, date: Between(from, end) } as any, select: { date: true } }))
          .map(row => String(row.date).slice(0, 10))
      )
      let created = 0
      let gapFrom: string | null = null
      for (let date = from, i = 0; date <= end && i <= MAX_RANGE_DAYS; date = this.addDays(date, 1), i++) {
        if (!stored.has(date)) {
          gapFrom = gapFrom ?? date
          continue
        }
        if (gapFrom) {
          created += await this.materializeAbsences(employeeId, gapFrom, this.addDays(date, -1))
          gapFrom = null
        }
      }
      if (gapFrom) created += await this.materializeAbsences(employeeId, gapFrom, end)
      return created
    } catch (e) {
      this.logger.warn(
        `تعذر تجسيد غياب الموظف ${employeeId} (${from} → ${to}): ${(e as Error).message}`
      )
      return 0
    }
  }

  // ===== سجل الأوفرتايم الشهري (شاشة الأوفرتايم) =====
  // كل حالات الشهر (مكتشف/مقدَّم/معتمد/مدفوع/مرفوض) بنطاق الفرع مع حالة الطلب المرتبط
  // الاعتماد من الطلب المرتبط دائمًا. رفض المكتشف غير الموجه يتطلب صلاحية وسببًا.
  async overtimeLog(user: JwtPayload, month?: string) {
    const range = this.monthRange(month)
    const all = await this.overtime.find({
      where: { date: Between(range.from, range.to) },
      order: { date: 'DESC', id: 'DESC' },
    })
    const empIds = [...new Set(all.map((r) => r.employeeId))]
    const emps: Employee[] = []
    for (let i = 0; i < empIds.length; i += 500) {
      emps.push(...(await this.employees.find({ where: { id: In(empIds.slice(i, i + 500)) } })))
    }
    const empById = new Map(emps.map((e) => [e.id, e]))
    const scope = branchScopeOf(user)
    const rows =
      scope === null ? all : all.filter((r) => empById.get(r.employeeId)?.branchId === scope)
    const reqIds = [...new Set(rows.map((r) => r.requestId).filter((id): id is number => !!id))]
    const reqs: Request[] = []
    for (let i = 0; i < reqIds.length; i += 500) {
      reqs.push(...(await this.requests.find({ where: { id: In(reqIds.slice(i, i + 500)) } })))
    }
    const reqById = new Map(reqs.map((r) => [r.id, r]))
    const mayConfirm = userHasPerm(user, 'overtime.confirm')
    const requiresConfirmation = true
    return {
      month: range.month,
      requiresConfirmation,
      entries: rows.map((r) => {
        const emp = empById.get(r.employeeId)
        const req = r.requestId ? reqById.get(r.requestId) : undefined
        const { calculationSnapshot, hourlyRateSnapshot, amountSnapshot, ...attendanceFields } = r
        const maySeeFinancials = r.employeeId === user.employeeId || userHasPerm(user, 'payroll.view')
        return {
          ...attendanceFields,
          ...(maySeeFinancials ? { calculationSnapshot, hourlyRateSnapshot, amountSnapshot } : {}),
          evidence: calculationSnapshot?.submission?.evidence ?? calculationSnapshot?.evidence ?? null,
          employeeName: emp?.fullName ?? null,
          employeeCode: emp?.employeeCode ?? null,
          departmentId: emp?.departmentId ?? null,
          requestStatus: req?.status ?? null,
          requestTypeCode: req?.typeCode ?? null,
          isSelf: user.employeeId != null && r.employeeId === user.employeeId,
          canConfirm: false,
          requiresWorkflow: true,
          canReject:
            mayConfirm &&
            r.status === 'DETECTED' &&
            !r.requestId &&
            !!emp &&
            this.writeBlock(user, emp, 'self') === null,
        }
      }),
    }
  }

  // الأوفرتايم المكتشف بانتظار تأكيد المدير
  async pendingOvertime(user: JwtPayload) {
    // المكتشف بلا طلب فقط — اللي اتوجّه لسلسلة اعتماد (requestId) يُعتمد هناك
    const all = await this.overtime.find({
      where: { status: 'DETECTED', requestId: IsNull() },
      order: { date: 'DESC' },
    })
    // قيد المستخدم نفسه لا يُعرض عليه للتأكيد (لا اعتماد للذات)
    const rows = all.filter(
      (r) => user.employeeId == null || r.employeeId !== user.employeeId
    )
    const scope = branchScopeOf(user)
    if (scope === null) return rows
    const emps = await this.employees.find({ where: { branchId: scope } })
    const ids = new Set(emps.map((e) => e.id))
    return rows.filter((r) => ids.has(r.employeeId))
  }

  // الاعتماد يمر بكل خطوات الطلب؛ هذا المسار يرفض المكتشف غير الموجه فقط بسبب موثق.
  async confirmOvertime(user: JwtPayload, id: number, approve: boolean, reason?: string) {
    const found = await this.overtime.findOneBy({ id })
    if (!found) throw new NotFoundException('قيد الأوفرتايم غير موجود')
    return this.days.manager.transaction(async em => {
      await lockPayrollEmployees(em, [found.employeeId])
      const repo = em.getRepository(OvertimeEntry)
      const row = await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!row || row.employeeId !== found.employeeId) throw new ConflictException('تغير قيد الإضافي؛ أعد تحميل السجل')
      const employee = await em.getRepository(Employee).findOneBy({ id: row.employeeId })
      if (!employee) throw new NotFoundException('الموظف غير موجود')
      this.assertCanWrite(user, employee, 'لا يمكنك التصرف في إضافيك بنفسك')
      if (approve || row.requestId) throw new ConflictException({ code: 'OVERTIME_WORKFLOW_REQUIRED',
        message: row.requestId ? 'اعتماد الإضافي أو رفضه من الطلب المرتبط بعد مراجعة خطواته' : 'الإضافي يحتاج توجيهًا إلى دورة الاعتماد؛ راجع الطلب المرتبط بعد توجيهه',
        requestId: row.requestId ?? null })
      if (row.status !== 'DETECTED') throw new BadRequestException('القيد ليس مكتشفًا بانتظار المراجعة')
      const note = reason?.trim()
      if (!note) throw new BadRequestException('سبب رفض الإضافي مطلوب')
      row.status = 'REJECTED'
      row.payableHours = 0
      await repo.save(row)
      await releaseOvertimeDayClaim(em, row.id)
      await appendOvertimeEvent(em, { entryId: row.id, actorUserId: user.sub, eventType: 'REJECTED', reason: note })
      return row
    })
  }

  // إعادة حساب يوم كامل لموظفي نطاق المستخدم (فرعه أو النظام) — تصحيح بأثر رجعي:
  // كل من له بصمات أو تصحيح أو صف محسوب في اليوم (يشمل صفوف الغياب بلا بصمات —
  // كانت تُتجاهل)، واليوم المنقضي يُجسَّد غياب من لم يُلمس (لو فاتته المهمة الليلية)
  async recomputeDate(date: string, user?: JwtPayload) {
    // تاريخ تقويمي حقيقي: 2026-02-30 يطابق الصيغة لكن JS يقلبه لـ 2026-03-02،
    // فكان التجسيد يكتب غياب يوم آخر لكل موظفي النطاق
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date ?? '') ||
      localDateOf(new Date(`${date}T12:00:00`)) !== date
    ) {
      throw new BadRequestException('تاريخ غير صالح — الصيغة YYYY-MM-DD')
    }
    const scope = user ? branchScopeOf(user) : null
    const punchRows = await this.punches.find({
      where: {
        punchTime: Between(
          new Date(`${date}T00:00:00`),
          new Date(`${date}T23:59:59`)
        ),
      },
    })
    const dayRows = await this.days.find({ where: { date } })
    const corrRows = await this.corrections.find({ where: { date } })
    const ids = new Set<number>()
    for (const p of punchRows) if (p.employeeId) ids.add(p.employeeId)
    for (const d of dayRows) ids.add(d.employeeId)
    for (const c of corrRows) if (c.employeeId) ids.add(c.employeeId)
    let targets = [...ids]
    // نطاق الفرع: موظفو فرع المستخدم فقط
    if (scope !== null && targets.length > 0) {
      const inScope = await this.employees.find({
        where: { id: In(targets), branchId: scope },
      })
      const allowed = new Set(inScope.map((e) => e.id))
      targets = targets.filter((id) => allowed.has(id))
    }
    let recomputed = 0
    let failed = 0
    for (const id of targets) {
      try {
        await this.computeDay(id, date, true, false, undefined, { recomputeLegacy: true })
        recomputed++
      } catch (e) {
        failed++
        this.logger.warn(
          `تعذر إعادة حساب يوم ${date} للموظف ${id}: ${(e as Error).message}`
        )
      }
    }
    // يوم منقضٍ: من لم يُلمس بعد يُسجَّل غيابه (idempotent) — اليوم الجاري لا
    // يُجسَّد قبل انتهائه (غيابه لحظي في السجل)
    const mat =
      date < localDateOf(new Date())
        ? await this.materializeAbsencesAll(date, date, scope)
        : { created: 0, failed: [] as number[] }
    return {
      recomputed,
      materialized: mat.created,
      failed: failed + mat.failed.length,
    }
  }
}
