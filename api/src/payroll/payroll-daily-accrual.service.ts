import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Between, EntityManager, In, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm'
import { AttendanceService, localDateOf } from '../attendance/attendance.service'
import { AttendanceDay } from '../attendance/attendance.entities'
import { loadAttendanceExemptions, exemptionPolicyOnDate } from '../attendance/attendance-exemption-resolver'
import { Employee } from '../employees/employee.entity'
import { suspendedDatesBetween } from '../employees/employee-suspensions'
import { grossMonthlySalary } from '../employees/compensation'
import { Leave, LeaveType } from '../requests/entities/leave.entities'
import { OvertimeEntry } from '../requests/entities/attendance.entities'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { PayrollRun, PayrollRunMember } from './payroll.entities'
import { PayrollDailyAccrual } from './payroll-daily-accrual.entities'
import {
  PAYROLL_ACCRUAL_ENABLED_KEY,
  PAYROLL_ACCRUAL_OPEN_STATUSES,
  payrollAccrualAttendanceInput,
  payrollAccrualDates,
  payrollAccrualInputsHash,
  payrollAccrualNeedsCompute,
  withPayrollAccrualDeadlockRetry,
  type PayrollAccrualDayFacts,
} from './payroll-daily-accrual'
import { attendanceDeductionDay, type AttendanceDeductionPolicy } from './attendance-deductions'
import { payrollLatenessTierDeduction } from './payroll-lateness-tiers'
import { roundPayrollMoney as round2 } from './payroll-money'

// نتيجة تراكم مدى لموظف واحد
export interface PayrollAccrualRangeResult { computed: number; reused: number }

// ساعات الإضافي المعتمدة لليوم: المستحق للصرف أولًا، ثم الفعلي، ثم المطلوب (نفس ترتيب المسير)
function accrualOvertimeHours(entry: OvertimeEntry): number {
  return Number(entry.payableHours ?? entry.hoursActual ?? entry.hoursRequested ?? 0)
}

// ملخص التراكم لمسير — لشاشة المسير: «آخر يوم محسوب» وعدد الأيام المتسخة
export interface PayrollRunAccrualStatus {
  runId: number
  period: string
  startDate: string
  endDate: string
  status: string
  open: boolean
  employees: number
  // آخر يوم من الفترة اتحسب لكل الموظفين المشمولين (null = لسه ما اتراكمش حاجة)
  lastAccruedDate: string | null
  accruedDays: number
  dirtyDays: number
  expectedDays: number
  // اليوم اللي المفروض التراكم يوصله دلوقتي (أمس أو نهاية الفترة، أيهما أقرب)
  targetDate: string
  upToDate: boolean
}

// ===== خدمة التراكم اليومي =====
// شغلها: تحسب اليوم-موظف مرة واحدة وتخزّنه، فإقفال الشهر يقرأ بدل ما يعيد الحساب.
// لا تلمس مسيرًا معتمدًا أو مصروفًا أبدًا، وآمنة لإعادة التشغيل (نفس اليوم مرتين = نفس الصف).
@Injectable()
export class PayrollDailyAccrualService {
  private readonly logger = new Logger(PayrollDailyAccrualService.name)
  // مسير واحد في المرة على مستوى الخدمة كلها (الجار الليلي + زرار «حدّث الحساب»): تراكمين
  // مع بعض بيحسبوا نفس أيام الموظفين فبيعملوا deadlock في SQL Server — نفس نمط مزامنة الأجهزة.
  private lock: Promise<void> = Promise.resolve()
  private async exclusive<T>(fn: () => Promise<T>): Promise<T> {
    const previous = this.lock
    let release!: () => void
    this.lock = new Promise<void>(resolve => (release = resolve))
    await previous
    try { return await fn() } finally { release() }
  }

  constructor(
    @InjectRepository(PayrollRun) private readonly runs: Repository<PayrollRun>,
    @InjectRepository(RequestsConfig) private readonly config: Repository<RequestsConfig>,
    private readonly attendance: AttendanceService
  ) {}

  // ترحيل جدول التراكم (20260920_061) ممكن يكون لسه مش متطبق على قاعدة قائمة:
  // ساعتها المسير بيشتغل بمساره القديم بالحرف (تجسيد الغياب لكل يوم) — التراكم تحسين، مش شرط صحة.
  private tableReady: boolean | null = null
  async accrualTableReady(em: EntityManager): Promise<boolean> {
    if (this.tableReady !== null) return this.tableReady
    try {
      const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.payroll_daily_accrual', N'U') IS NULL THEN 0 ELSE 1 END AS [ready]`)
      this.tableReady = Number(row?.ready ?? 0) === 1
    } catch { this.tableReady = false }
    if (!this.tableReady) this.logger.warn('جدول تراكم المسير اليومي غير موجود (الترحيل 20260920_061 مش متطبق) — الحساب بمساره القديم')
    return this.tableReady
  }

  // للشاشة: المسير نفسه عشان فحص النطاق يتم في خدمة المسير (مصدر واحد للصلاحية)
  async loadRun(runId: number): Promise<PayrollRun> {
    const run = await this.runs.findOne({ where: { id: runId } })
    if (!run) throw new NotFoundException('المسير غير موجود')
    return run
  }

  private async cfg(key: string, fallback: string): Promise<string> {
    const row = await this.config.findOne({ where: { key } })
    return row?.value ?? fallback
  }

  // ===== المسيرات المفتوحة للشهر =====
  private async openRuns(em: EntityManager, period?: string | null): Promise<PayrollRun[]> {
    const where: Record<string, unknown> = { status: In([...PAYROLL_ACCRUAL_OPEN_STATUSES]) }
    if (period) where.period = period
    return em.getRepository(PayrollRun).find({ where: where as any, order: { id: 'ASC' } })
  }

  // موظفو المسير: أعضاء النسخة المحسوبة لو موجودة، وإلا نطاق المسودة (قائمة CUSTOM أو نشطو الفرع/الشركة).
  // التوسّع غير ضار: يوم متراكم زيادة يُعاد استخدامه أو يُهمل، ولا يغيّر أي مبلغ.
  private async runEmployeeIds(em: EntityManager, run: PayrollRun): Promise<number[]> {
    const members = await em.getRepository(PayrollRunMember).find({
      where: { runId: run.id, membershipStatus: 'INCLUDED' }, select: { employeeId: true },
    })
    if (members.length) return members.map(row => row.employeeId)
    const listed = run.employeeIds ? (JSON.parse(run.employeeIds) as number[]) : []
    if (listed.length) return listed
    const scopeIds: number[] = run.scopeIds ? JSON.parse(run.scopeIds) : []
    const where: Record<string, unknown> = { isActive: true }
    if (run.scopeType === 'BRANCH' && run.branchId != null) where.branchId = run.branchId
    else if (run.scopeType === 'BRANCH' && scopeIds.length) where.branchId = In(scopeIds)
    else if (run.scopeType === 'DEPARTMENT' && scopeIds.length) where.departmentId = In(scopeIds)
    else if (run.scopeType === 'TEAM' && scopeIds.length) where.teamId = In(scopeIds)
    const rows = await em.getRepository(Employee).find({ where: where as any, select: { id: true } })
    return rows.map(row => row.id)
  }

  // ===== سياسة خصم الحضور للمبالغ الاسترشادية اليومية =====
  // المبالغ المخزّنة للعرض والتقارير فقط؛ المسير بيعيد جمعها من صفوف الحضور نفسها بلقطة سياسته،
  // فما فيش أي طريق تخلي التراكم يغيّر مبلغًا مصروفًا.
  async deductionBasis(em: EntityManager) {
    const rows = await em.getRepository(RequestsConfig).find({
      where: { key: In(['payroll.monthly_days', 'payroll.daily_hours', 'payroll.late_deduction_enabled',
        'payroll.shortfall_deduction_enabled', 'payroll.shortfall_mode', 'payroll.shortfall_value',
        'payroll.early_leave_deduction_enabled', 'attendance.absence_penalty_days', PAYROLL_ACCRUAL_ENABLED_KEY]) },
    })
    const value = (key: string, fallback: string) => rows.find(row => row.key === key)?.value ?? fallback
    return {
      // مفتاح إيقاف: payroll.daily_accrual_enabled = false يرجّع الحساب لمساره القديم
      // (كل يوم-موظف من الأول) بلا نشر جديد — أمان لو حد شك في التراكم يومًا ما
      accrualEnabled: value(PAYROLL_ACCRUAL_ENABLED_KEY, 'true') === 'true',
      monthlyDays: Number(value('payroll.monthly_days', '30')) || 30,
      dailyHours: Number(value('payroll.daily_hours', '8')) || 8,
      lateEnabled: value('payroll.late_deduction_enabled', 'true') === 'true',
      shortfallEnabled: value('payroll.shortfall_deduction_enabled', 'true') === 'true',
      shortfallMode: value('payroll.shortfall_mode', 'MINUTES') as AttendanceDeductionPolicy['shortfallMode'],
      shortfallValue: Number(value('payroll.shortfall_value', '1')) || 1,
      earlyLeaveEnabled: value('payroll.early_leave_deduction_enabled', 'true') === 'true',
      absencePenalty: Number(value('attendance.absence_penalty_days', '1')) || 1,
    }
  }

  // ===== تراكم مدى لموظف واحد =====
  // ده قلب الحكاية: بدل ما كل يوم-موظف يتحسب من الأول آخر الشهر، اليوم النضيف المتراكم
  // بيتقرا، واللي ناقص أو متسخ أو بصمة مدخلاته اتغيرت هو بس اللي بيتحسب.
  async accrueEmployeeRange(em: EntityManager, input: {
    employeeId: number; period: string; runId: number | null; from: string; to: string
    today?: string; basis?: Awaited<ReturnType<PayrollDailyAccrualService['deductionBasis']>>
    // لو اتبعت، بتتنادى لكل يوم اتحسب فعلًا (المسير بيستخدمها لعدّ الغياب المُجسَّد)
    onComputed?: (date: string, day: AttendanceDay | null) => void
  }): Promise<PayrollAccrualRangeResult> {
    const result: PayrollAccrualRangeResult = { computed: 0, reused: 0 }
    const basis = input.basis ?? await this.deductionBasis(em)
    // الترحيل مش متطبق أو التراكم متوقف بالإعداد: المسار القديم بالحرف — تجسيد الغياب لكل يوم في المدى
    if (!basis.accrualEnabled || !await this.accrualTableReady(em)) {
      result.computed = await this.attendance.materializeAbsences(input.employeeId, input.from, input.to, em)
      return result
    }
    const employee = await em.getRepository(Employee).findOne({ where: { id: input.employeeId } })
    if (!employee) return result
    const today = input.today ?? localDateOf(new Date())
    // نفس حدود تجسيد الغياب: لا يوم قبل التعيين، ولا بعد الأرشفة، ولا في المستقبل
    let start = input.from
    const hireDate = employee.actualStartDate || employee.joinDate
    if (hireDate && hireDate > start) start = hireDate
    let end = input.to
    if (employee.archivedAt) {
      const archived = localDateOf(new Date(employee.archivedAt))
      if (archived < end) end = archived
    }
    if (today < end) end = today
    if (start > end) return result

    const suspendedDates = await suspendedDatesBetween(em, input.employeeId, start, end)
    // نفس خطوة تجسيد الغياب بالحرف: غياب محفوظ قديم في يوم إيقاف (اتكتب قبل الإيقاف) يتشال،
    // وإلا المسير يخصم اليوم غياب ويوم إيقاف مع بعض.
    if (suspendedDates.size) {
      const stale = await em.getRepository(AttendanceDay).find({
        select: { date: true }, where: { employeeId: input.employeeId, date: Between(start, end), status: 'absent' },
      })
      for (const row of stale) {
        const date = String(row.date).slice(0, 10)
        if (suspendedDates.has(date)) await this.attendance.computeDay(input.employeeId, date, false, false, em)
      }
    }
    const exemptions = await loadAttendanceExemptions(em, input.employeeId, start, end)
    const stored = new Map((await em.getRepository(PayrollDailyAccrual).find({
      where: { employeeId: input.employeeId, period: input.period, date: Between(start, end) },
    })).map(row => [String(row.date).slice(0, 10), row]))
    const days = new Map((await em.getRepository(AttendanceDay).find({
      where: { employeeId: input.employeeId, date: Between(start, end) },
    })).map(row => [String(row.date).slice(0, 10), row]))
    // إجازات وإضافي ودوام عطلة المدى: قراءة واحدة للموظف بدل قراءة لكل يوم (كانت N+1)
    const leaves = await em.getRepository(Leave).find({
      where: { employeeId: input.employeeId, status: 'APPROVED', fromDate: LessThanOrEqual(end), toDate: MoreThanOrEqual(start) },
    })
    const sickCodes = new Set((await em.getRepository(LeaveType).find({ where: { category: 'SICK' }, select: { code: true } })).map(row => row.code))
    const overtime = await em.getRepository(OvertimeEntry).find({
      where: { employeeId: input.employeeId, status: 'APPROVED', date: Between(start, end) },
    })
    const overtimeByDate = new Map<string, OvertimeEntry[]>()
    for (const row of overtime) {
      const date = String(row.date).slice(0, 10)
      overtimeByDate.set(date, [...(overtimeByDate.get(date) ?? []), row])
    }
    // أساس الأجر لليوم (استرشادي): راتب ملف الموظف الحالي
    const gross = grossMonthlySalary(employee)
    const dayRate = gross / basis.monthlyDays
    const minuteRate = dayRate / basis.dailyHours / 60
    const policy: AttendanceDeductionPolicy = { schemaVersion: 1, lateEnabled: basis.lateEnabled,
      shortfallEnabled: basis.shortfallEnabled, shortfallMode: basis.shortfallMode, shortfallValue: basis.shortfallValue,
      overlapPolicy: 'CUMULATIVE', dailyCapDays: 0, dayRate, minuteRate, earlyLeaveEnabled: basis.earlyLeaveEnabled }

    const dayInputs = (date: string, attendanceRow: AttendanceDay | null) => {
      const suspended = suspendedDates.has(date)
      const exempt = exemptionPolicyOnDate(exemptions, date, { overtimeEligible: false, unpaidLeaveDeductible: true }).isExempt
      const dayLeaves = leaves.filter(row => String(row.fromDate).slice(0, 10) <= date && String(row.toDate).slice(0, 10) >= date)
      const dayOvertime = overtimeByDate.get(date) ?? []
      const hash = payrollAccrualInputsHash({
        v: 1, attendance: payrollAccrualAttendanceInput(attendanceRow), suspended, exempt,
        leaves: dayLeaves.map(row => [row.id, row.leaveTypeCode ?? null, row.isUnpaid === true, row.period ?? 'FULL']).sort(),
        overtime: dayOvertime.map(row => [row.id, row.source ?? null, accrualOvertimeHours(row), row.calculationSnapshot ?? null]).sort(),
        gross, monthlyDays: basis.monthlyDays,
      })
      return { suspended, exempt, dayLeaves, dayOvertime, hash }
    }

    // (1) أي يوم محتاج إعادة حساب؟ الناقص، المتسخ، اللي بصمة مدخلاته اتغيرت، واليوم اللي لسه ما خلصش
    const pending: string[] = [], recomputed: string[] = []
    for (const date of payrollAccrualDates(start, end)) {
      const { suspended, hash } = dayInputs(date, days.get(date) ?? null)
      if (!payrollAccrualNeedsCompute(stored.get(date), hash, date, today)) { result.reused++; continue }
      pending.push(date)
      // يوم الإيقاف: المسير بيخصمه «يوم إيقاف» بس، ومحرك الحضور ما بيلمسوش — يتخزن بلا إعادة حساب
      if (!suspended) {
        // نفس نداء تجسيد الغياب في المسير بالحرف: بلا تسلسل، وداخل معاملة الاستدعاء
        await this.attendance.computeDay(input.employeeId, date, false, false, em)
        recomputed.push(date)
      }
      result.computed++
    }
    if (!pending.length) return result
    // إعادة قراءة الأيام المحسوبة مرة واحدة (بدل قراءة بعد كل computeDay)
    if (recomputed.length) {
      for (const row of await em.getRepository(AttendanceDay).find({
        where: { employeeId: input.employeeId, date: In(recomputed) },
      })) days.set(String(row.date).slice(0, 10), row)
    }

    // (2) كتابة صف التراكم لكل يوم اتحسب — دايمًا، حتى لو رجع لنفس قيمته: computeDay نفسه
    // بيعلّم اليوم «متسخ»، والكتابة دي هي اللي بتنضّفه وتثبّت بصمته الجديدة.
    const repo = em.getRepository(PayrollDailyAccrual)
    const now = new Date()
    for (const date of pending) {
      const attendanceRow = days.get(date) ?? null
      const { suspended, exempt, dayLeaves, dayOvertime, hash } = dayInputs(date, attendanceRow)
      const facts = this.dayFacts({ date, attendanceRow, suspended, exempt, leaves: dayLeaves, sickCodes, overtime: dayOvertime,
        policy, dayRate, absencePenalty: basis.absencePenalty, dailyHours: basis.dailyHours })
      const row = stored.get(date) ?? repo.create({ employeeId: input.employeeId, period: input.period, date })
      Object.assign(row, facts, { components: JSON.stringify(facts.components), runId: input.runId ?? row.runId ?? null,
        inputsHash: hash, isDirty: false, dirtyReason: null, dirtyAt: null, computedAt: now })
      await repo.save(row)
      input.onComputed?.(date, attendanceRow)
    }
    return result
  }

  // حقائق اليوم: دقائقه وأعلامه ومبالغه الاسترشادية
  private dayFacts(input: {
    date: string; attendanceRow: AttendanceDay | null; suspended: boolean; exempt: boolean
    leaves: Leave[]; sickCodes: Set<string>; overtime: OvertimeEntry[]
    policy: AttendanceDeductionPolicy; dayRate: number; absencePenalty: number; dailyHours: number
  }): PayrollAccrualDayFacts {
    const row = input.attendanceRow
    const status = row?.status ?? null
    const unpaid = input.leaves.filter(leave => leave.isUnpaid === true)
    const sick = input.leaves.filter(leave => input.sickCodes.has(String(leave.leaveTypeCode ?? '')))
    const overtimeMinutes = Math.round(input.overtime.reduce((sum, entry) => sum + accrualOvertimeHours(entry), 0) * 60)
    const overtimeAmount = round2(input.overtime.reduce((sum, entry) => {
      const snapshot = entry.calculationSnapshot as { amount?: unknown } | null
      return sum + Number(snapshot?.amount ?? 0)
    }, 0))
    // يوم الإيقاف: خصم يوم إيقاف بس — لا تأخير ولا نقص ولا غياب
    const deduction = row && !input.suspended && !input.exempt
      ? attendanceDeductionDay({ date: input.date, lateMinutes: row.lateMinutes ?? 0,
        unexcusedLateMinutes: row.unexcusedLateMinutes, shortfallMinutes: row.shortfallMinutes,
        deductibleMinutes: row.deductibleMinutes, attendanceRuleSnapshot: row.attendanceRuleSnapshot },
      input.policy, payrollLatenessTierDeduction(row.lateMinutes ?? 0, [], input.policy.dayRate, input.policy.minuteRate).amount)
      : null
    const isAbsent = !input.suspended && !input.exempt && status === 'absent'
    const workMinutes = Number(row?.workMinutes ?? 0)
    // يوم عمل: له صف حضور وتصنيفه مش عطلة (الويك إند أصلًا بلا صف حضور)
    const isWorkday = !!row && status !== 'holiday'
    // استحقاق اليوم الاسترشادي: الشهر 30 يومًا مهما كان طوله (قرار المالك) — سعر اليوم لكل يوم تغطية
    const earnings = input.dayRate
    return {
      attendanceStatus: status, workMinutes,
      lateMinutes: Number(row?.lateMinutes ?? 0),
      deductibleMinutes: Number(row?.deductibleMinutes ?? 0),
      shortfallMinutes: Number(row?.shortfallMinutes ?? 0),
      earlyLeaveMinutes: Number(row?.earlyLeaveMinutes ?? 0),
      overtimeMinutes, overtimeAmount,
      isAbsent, isLeave: status === 'leave' || input.leaves.length > 0,
      isUnpaidLeave: unpaid.length > 0, isSickLeave: sick.length > 0,
      isSuspended: input.suspended, isHolidayWork: status === 'holiday' && workMinutes > 0,
      isExempt: input.exempt, isWorkday,
      earningsAmount: round2(earnings),
      latenessAmount: round2((deduction?.latenessAmount ?? 0) + (deduction?.permissionAmount ?? 0)),
      shortfallAmount: round2(deduction?.shortfallAmount ?? 0),
      absenceAmount: round2(isAbsent ? input.dayRate * input.absencePenalty : 0),
      leaveAmount: round2(unpaid.length && !input.suspended ? input.dayRate * ((unpaid[0].period ?? 'FULL') === 'FULL' ? 1 : 0.5) : 0),
      suspensionAmount: round2(input.suspended ? input.dayRate : 0),
      components: {
        v: 1, note: 'مبالغ اليوم استرشادية للعرض؛ المسير بيعيد جمعها من صفوف الحضور بلقطة سياسته',
        attendanceDayId: row?.id ?? null, deduction: deduction ?? null,
        leaveIds: input.leaves.map(leave => leave.id), overtimeIds: input.overtime.map(entry => entry.id),
        dayRate: round2(input.dayRate),
      },
    }
  }

  // ===== تراكم مسير كامل (المدى من بدايته حتى «أمس» أو التاريخ المطلوب) =====
  async accrueRun(runId: number, options: { upTo?: string; from?: string } = {}) {
    return this.exclusive(async () => {
      const run = await this.runs.findOne({ where: { id: runId } })
      if (!run) throw new NotFoundException('المسير غير موجود')
      if (!PAYROLL_ACCRUAL_OPEN_STATUSES.includes(run.status as any)) {
        throw new ConflictException('المسير معتمد أو مصروف أو ملغى؛ التراكم اليومي ما بيلمسوش')
      }
      return this.accrueRunIn(run, options)
    })
  }

  private async accrueRunIn(run: PayrollRun, options: { upTo?: string; from?: string } = {}) {
    if (!await this.accrualTableReady(this.runs.manager)) {
      throw new ConflictException('ترحيل تراكم المسير اليومي غير مطبق على قاعدة البيانات الحالية')
    }
    const today = localDateOf(new Date())
    const yesterday = new Date(Date.parse(`${today}T12:00:00Z`) - 86400000).toISOString().slice(0, 10)
    const to = [options.upTo ?? yesterday, run.endDate].sort()[0]
    const from = options.from && options.from > run.startDate ? options.from : run.startDate
    const totals = { runId: run.id, employees: 0, days: 0, computed: 0, reused: 0 }
    if (from > to) return totals
    const employeeIds = await this.runEmployeeIds(this.runs.manager, run)
    totals.employees = employeeIds.length
    const basis = await this.deductionBasis(this.runs.manager)
    for (const employeeId of employeeIds) {
      // معاملة لكل موظف: قفل قصير، وفشل موظف ما بيوقفش الباقي
      try {
        const result = await withPayrollAccrualDeadlockRetry(() => this.runs.manager.transaction(em =>
          this.accrueEmployeeRange(em, { employeeId, period: run.period, runId: run.id, from, to, today, basis })))
        totals.computed += result.computed
        totals.reused += result.reused
        totals.days += result.computed + result.reused
      } catch (error) {
        this.logger.warn(`تعذر تراكم أيام موظف في المسير ${run.id}: ${(error as Error).message}`)
      }
    }
    return totals
  }

  // ===== الجار الليلي: كل المسيرات المفتوحة للشهر الجاري =====
  // مسير واحد في المرة (بلا deadlock)، آمن لإعادة التشغيل، وبيسجل أعداد بس.
  async accrueOpenRuns(options: { upTo?: string; period?: string } = {}) {
    return this.exclusive(async () => {
      if (!await this.accrualTableReady(this.runs.manager)) return { runs: 0, computed: 0, reused: 0, disabled: true }
      if ((await this.cfg(PAYROLL_ACCRUAL_ENABLED_KEY, 'true')) !== 'true') return { runs: 0, computed: 0, reused: 0, disabled: true }
      const runs = await this.openRuns(this.runs.manager, options.period ?? null)
      const totals = { runs: 0, computed: 0, reused: 0, disabled: false }
      for (const run of runs) {
        // المسير ممكن يكون اتعتمد بين القراءة والتنفيذ — نتأكد تحت القفل
        const fresh = await this.runs.findOne({ where: { id: run.id } })
        if (!fresh || !PAYROLL_ACCRUAL_OPEN_STATUSES.includes(fresh.status as any)) continue
        const result = await this.accrueRunIn(fresh, { upTo: options.upTo })
        totals.runs++
        totals.computed += result.computed
        totals.reused += result.reused
      }
      return totals
    })
  }

  // ===== الأيام المتسخة بس (زرار «حدّث الحساب») =====
  async refreshDirty(runId: number) {
    return this.exclusive(async () => {
      const run = await this.runs.findOne({ where: { id: runId } })
      if (!run) throw new NotFoundException('المسير غير موجود')
      if (!PAYROLL_ACCRUAL_OPEN_STATUSES.includes(run.status as any)) {
        throw new ConflictException('المسير معتمد أو مصروف أو ملغى؛ التراكم اليومي ما بيلمسوش')
      }
      return this.accrueRunIn(run)
    })
  }

  // ===== ملخص التراكم لشاشة المسير =====
  async status(runId: number): Promise<PayrollRunAccrualStatus> {
    const run = await this.runs.findOne({ where: { id: runId } })
    if (!run) throw new NotFoundException('المسير غير موجود')
    const open = PAYROLL_ACCRUAL_OPEN_STATUSES.includes(run.status as any)
    const employeeIds = open ? await this.runEmployeeIds(this.runs.manager, run) : (await this.runs.manager.getRepository(PayrollRunMember)
      .find({ where: { runId, membershipStatus: 'INCLUDED' }, select: { employeeId: true } })).map(row => row.employeeId)
    const today = localDateOf(new Date())
    const yesterday = new Date(Date.parse(`${today}T12:00:00Z`) - 86400000).toISOString().slice(0, 10)
    const targetDate = [yesterday, run.endDate].sort()[0]
    const empty: PayrollRunAccrualStatus = { runId, period: run.period, startDate: run.startDate, endDate: run.endDate,
      status: run.status, open, employees: employeeIds.length, lastAccruedDate: null, accruedDays: 0, dirtyDays: 0,
      expectedDays: 0, targetDate, upToDate: false }
    // الترحيل مش متطبق: الشاشة ما تعرضش سطر التراكم بدل ما ترمي خطأ
    if (!await this.accrualTableReady(this.runs.manager)) throw new ConflictException('ترحيل تراكم المسير اليومي غير مطبق على قاعدة البيانات الحالية')
    if (!employeeIds.length) return empty
    const periodDays = payrollAccrualDates(run.startDate, targetDate).length
    empty.expectedDays = periodDays * employeeIds.length
    // قائمة الموظفين كنص مفصول بفواصل عبر STRING_SPLIT بمعاملين (المتاح في SQL Server 2019):
    // IN (@3,@4,…) بـ580 موظف يقترب من سقف الـ2100 معامل ويكسر خطة الاستعلام.
    const ids = employeeIds.join(',')
    const [summary] = await this.runs.manager.query(
      `SELECT COUNT(*) AS [accrued], SUM(CASE WHEN a.[isDirty] = 1 THEN 1 ELSE 0 END) AS [dirty]
       FROM [payroll_daily_accrual] a INNER JOIN STRING_SPLIT(@3, ',') s ON a.[employeeId] = CAST(s.[value] AS int)
       WHERE a.[period] = @0 AND CONVERT(varchar(10), a.[date], 23) BETWEEN @1 AND @2`,
      [run.period, run.startDate, targetDate, ids]
    )
    empty.accruedDays = Number(summary?.accrued ?? 0)
    empty.dirtyDays = Number(summary?.dirty ?? 0)
    // «آخر يوم محسوب»: آخر تاريخ نضيف اتحسب لكل الموظفين المشمولين (مش لبعضهم)
    const [last] = await this.runs.manager.query(
      `SELECT MAX([day]) AS [lastDate] FROM (
         SELECT CONVERT(varchar(10), a.[date], 23) AS [day] FROM [payroll_daily_accrual] a
         INNER JOIN STRING_SPLIT(@3, ',') s ON a.[employeeId] = CAST(s.[value] AS int)
         WHERE a.[period] = @0 AND a.[isDirty] = 0 AND a.[computedAt] IS NOT NULL
           AND CONVERT(varchar(10), a.[date], 23) BETWEEN @1 AND @2
         GROUP BY CONVERT(varchar(10), a.[date], 23) HAVING COUNT(DISTINCT a.[employeeId]) >= @4
       ) [complete]`,
      [run.period, run.startDate, targetDate, ids, employeeIds.length]
    )
    empty.lastAccruedDate = last?.lastDate ? String(last.lastDate).slice(0, 10) : null
    empty.upToDate = empty.dirtyDays === 0 && empty.lastAccruedDate === targetDate
    return empty
  }
}
