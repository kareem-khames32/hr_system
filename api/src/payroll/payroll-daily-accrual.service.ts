import { ConflictException, Injectable, Logger, NotFoundException, type OnModuleInit } from '@nestjs/common'
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
import { ModulesService } from '../modules-registry/modules.service'
import { QueueService } from '../queue/queue.service'
import { PayrollRun, PayrollRunMember } from './payroll.entities'
import { PayrollDailyAccrual } from './payroll-daily-accrual.entities'
import {
  PAYROLL_ACCRUAL_ENABLED_KEY,
  PAYROLL_ACCRUAL_OPEN_STATUSES,
  PAYROLL_ACCRUAL_REFRESH_JOB,
  PAYROLL_LIVE_ACCRUAL_ALL_KEY,
  payrollAccrualAttendanceInput,
  payrollAccrualDates,
  payrollAccrualInputsHash,
  payrollAccrualNeedsCompute,
  withoutPayrollAccrualRefresh,
  withPayrollAccrualDeadlockRetry,
  type PayrollAccrualDayFacts,
} from './payroll-daily-accrual'
import { attendanceDeductionDay, type AttendanceDeductionPolicy } from './attendance-deductions'
import { payrollLatenessTierDeduction } from './payroll-lateness-tiers'
import { roundPayrollMoney as round2 } from './payroll-money'
import { payrollPeriodBounds, payrollPeriodOfDate } from './payroll-period'
import { lockPayrollEmployees } from './payroll-settlement-boundary'

// نتيجة تراكم مدى لموظف واحد
export interface PayrollAccrualRangeResult { computed: number; reused: number }
// شغل الخلفية بيستنى قفل الموظف المالي المدة دي بس: عملية مالية طويلة على الموظف (حساب مسير كبير) مابتوقّفش مهمة الليل —
// الموظف بيتخطّى (مهمة الليل والزرار) أو المهمة بتتعاد بعد مهلة (الطابور)
export const PAYROLL_ACCRUAL_LOCK_WAIT_MS = 2000

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
/** B1.14: الفترة الجارية (من دورة الإعداد العام) ولحد أنهي يوم التراكم المفروض يوصل */
export interface PayrollLiveWindow { period: string; startDate: string; endDate: string; upTo: string; today: string }

@Injectable()
export class PayrollDailyAccrualService implements OnModuleInit {
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
    private readonly attendance: AttendanceService,
    private readonly queue: QueueService,
    private readonly modules: ModulesService
  ) {}

  // B1.14: مستهلك مهمة «أعد حساب أيام الموظف المتسخة» (بتتسجل مع تعليم يوم متسخ — payroll-daily-accrual.ts)
  onModuleInit() {
    this.queue.registerHandler(PAYROLL_ACCRUAL_REFRESH_JOB, async payload => {
      // موديول الرواتب مقفول = زي مهمة الليل بالظبط: مفيش حساب، واليوم بيفضل متسخ لحد ما الموديول يتفتح
      if (!(await this.modules.jobEnabled('payroll.daily-accrual'))) return
      await this.refreshEmployee(Number((payload as { employeeId?: unknown } | null)?.employeeId))
    })
  }

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
      // payroll.shortfall_enabled هو المفتاح المبذور اللي بتضبطه الشاشة ويقراه المسير
      // (payroll-policy-snapshot). كانت القراءة هنا باسم تاني مش مبذور، فإيقاف خصم
      // نقص الساعات مكانش بيوصل للتراكم اليومي خالص — اتوحّدوا على المفتاح المبذور.
      where: { key: In(['payroll.monthly_days', 'payroll.daily_hours', 'payroll.late_deduction_enabled',
        'payroll.shortfall_enabled', 'payroll.shortfall_mode', 'payroll.shortfall_value',
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
      shortfallEnabled: value('payroll.shortfall_enabled', 'true') === 'true',
      shortfallMode: value('payroll.shortfall_mode', 'MINUTES') as AttendanceDeductionPolicy['shortfallMode'],
      shortfallValue: Number(value('payroll.shortfall_value', '1')) || 1,
      earlyLeaveEnabled: value('payroll.early_leave_deduction_enabled', 'true') === 'true',
      absencePenalty: Number(value('attendance.absence_penalty_days', '1')) || 1,
    }
  }

  // ===== تراكم مدى لموظف واحد =====
  // ده قلب الحكاية: بدل ما كل يوم-موظف يتحسب من الأول آخر الشهر، اليوم النضيف المتراكم
  // بيتقرا، واللي ناقص أو متسخ أو بصمة مدخلاته اتغيرت هو بس اللي بيتحسب.
  accrueEmployeeRange(em: EntityManager, input: {
    employeeId: number; period: string; runId: number | null; from: string; to: string
    today?: string; basis?: Awaited<ReturnType<PayrollDailyAccrualService['deductionBasis']>>
    // لو اتبعت، بتتنادى لكل يوم اتحسب فعلًا (المسير بيستخدمها لعدّ الغياب المُجسَّد)
    onComputed?: (date: string, day: AttendanceDay | null) => void
    // مسارات الخلفية (مهمة الليل، «حدّث الحساب»، مهمة إعادة الحساب): قفل الموظف المالي وإعادة فحص الإقفال قبل أي كتابة (CRP2B-C-B02).
    // حساب المسير نفسه مابيبعتهاش: هو ماسك قفل موظفيه وبيحسب مسيره المفتوح
    background?: boolean
  }): Promise<PayrollAccrualRangeResult> {
    // B1.14: التراكم بيكتب صف اليوم نضيف في نفس المعاملة، فتعليم «متسخ» اللي جوه حساب اليوم مايسجّلش مهمة إعادة حساب
    return withoutPayrollAccrualRefresh(em, () => this.accrueEmployeeRangeIn(em, input))
  }

  /**
   * CRP2B-C-B02 (مراجعة Codex): أيام الموظف دي مقفولة؟ الفحص ده بيتعمل **جوه المعاملة وتحت قفل الموظف المالي** — نفس القفل اللي حساب
   * المسير واعتماده بياخدوه — فالاعتماد اللي سبق باين هنا، والاعتماد اللي لسه جاي بيستنى لحد ما الكتابة تخلص.
   * مسير الصف نفسه (runId): لازم لسه مفتوح. ومن غير مسير: مفيش مسير عادي معتمد أو مصروف للموظف في الفترة.
   */
  private async accrualClosed(em: EntityManager, employeeId: number, period: string, runId: number | null): Promise<boolean> {
    if (runId != null) {
      const [run]: Array<{ status: string }> = await em.query('SELECT [status] FROM [payroll_runs] WHERE [id] = @0', [runId])
      return !run || !(PAYROLL_ACCRUAL_OPEN_STATUSES as readonly string[]).includes(run.status)
    }
    const closed: unknown[] = await em.query(`SELECT TOP (1) 1 AS [closed] FROM [payroll_items] i INNER JOIN [payroll_runs] c ON c.[id] = i.[runId]
      WHERE i.[employeeId] = @0 AND c.[period] = @1 AND c.[status] IN ('APPROVED', 'PAID') AND (c.[runType] IS NULL OR c.[runType] = 'REGULAR')`, [employeeId, period])
    return closed.length > 0
  }

  private async accrueEmployeeRangeIn(em: EntityManager, input: {
    employeeId: number; period: string; runId: number | null; from: string; to: string
    today?: string; basis?: Awaited<ReturnType<PayrollDailyAccrualService['deductionBasis']>>
    onComputed?: (date: string, day: AttendanceDay | null) => void
    background?: boolean
  }): Promise<PayrollAccrualRangeResult> {
    const result: PayrollAccrualRangeResult = { computed: 0, reused: 0 }
    if (input.background) {
      await lockPayrollEmployees(em, [input.employeeId], PAYROLL_ACCRUAL_LOCK_WAIT_MS)
      if (await this.accrualClosed(em, input.employeeId, input.period, input.runId)) return result
    }
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

    // دفعة واحدة لأيام الموظف في المعاملة دي: قراءاته المرجعية (ملفه ووردياته وقواعد دوامه والتقويم والإعدادات)
    // مرة واحدة بدل مرة لكل يوم — نفس computeDay بالحرف (AttendanceService.batchScope)
    const attendance = this.attendance.batchScope(em)
    const suspendedDates = await suspendedDatesBetween(em, input.employeeId, start, end)
    // نفس خطوة تجسيد الغياب بالحرف: غياب محفوظ قديم في يوم إيقاف (اتكتب قبل الإيقاف) يتشال،
    // وإلا المسير يخصم اليوم غياب ويوم إيقاف مع بعض.
    if (suspendedDates.size) {
      const stale = await em.getRepository(AttendanceDay).find({
        select: { date: true }, where: { employeeId: input.employeeId, date: Between(start, end), status: 'absent' },
      })
      for (const row of stale) {
        const date = String(row.date).slice(0, 10)
        if (suspendedDates.has(date)) await attendance.computeDay(input.employeeId, date, false, false)
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
        await attendance.computeDay(input.employeeId, date, false, false)
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
          this.accrueEmployeeRange(em, { employeeId, period: run.period, runId: run.id, from, to, today, basis, background: true })))
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
      if (!await this.accrualTableReady(this.runs.manager)) return { runs: 0, computed: 0, reused: 0, disabled: true, employees: 0 }
      if ((await this.cfg(PAYROLL_ACCRUAL_ENABLED_KEY, 'true')) !== 'true') return { runs: 0, computed: 0, reused: 0, disabled: true, employees: 0 }
      const runs = await this.openRuns(this.runs.manager, options.period ?? null)
      const totals = { runs: 0, computed: 0, reused: 0, disabled: false, employees: 0 }
      for (const run of runs) {
        // المسير ممكن يكون اتعتمد بين القراءة والتنفيذ — نتأكد تحت القفل
        const fresh = await this.runs.findOne({ where: { id: run.id } })
        if (!fresh || !PAYROLL_ACCRUAL_OPEN_STATUSES.includes(fresh.status as any)) continue
        const result = await this.accrueRunIn(fresh, { upTo: options.upTo })
        totals.runs++
        totals.computed += result.computed
        totals.reused += result.reused
      }
      // B1.14 (الراتب الحي): باقي الموظفين النشطين — اللي لسه مالهمش مسير للفترة الجارية — بيتحسب لهم يوم بيوم برضه، فمعاينة الفترة
      // ماتستناش حد يعمل مسير. ورا payroll.live_accrual_all (false = موظفو المسيرات المفتوحة بس، زي الأول)
      if ((await this.cfg(PAYROLL_LIVE_ACCRUAL_ALL_KEY, 'true')) === 'true') {
        const window = await this.liveWindow(null, options.upTo ?? null)
        if (!options.period || options.period === window.period) {
          const rest = await this.accrueEmployeesIn(await this.uncoveredEmployeeIds(window.period), window)
          totals.employees = rest.employees
          totals.computed += rest.computed
          totals.reused += rest.reused
        }
      }
      return totals
    })
  }

  // ===== B1.14: الراتب الحي =====
  /** الفترة الجارية من دورة الإعداد العام (payroll.cycle_start_day) والتراكم المفروض يوصل لحد امبارح أو آخر الفترة */
  async liveWindow(period?: string | null, upTo?: string | null): Promise<PayrollLiveWindow> {
    const configured = Number(await this.cfg('payroll.cycle_start_day', '23'))
    const startDay = Number.isInteger(configured) && configured >= 1 && configured <= 31 ? configured : 23
    const today = localDateOf(new Date())
    const yesterday = new Date(Date.parse(`${today}T12:00:00Z`) - 86400000).toISOString().slice(0, 10)
    const target = upTo && /^\d{4}-\d{2}-\d{2}$/.test(upTo) ? upTo : yesterday
    const chosen = period && /^\d{4}-(0[1-9]|1[0-2])$/.test(period) ? period : payrollPeriodOfDate(target, startDay)
    const bounds = payrollPeriodBounds(chosen, startDay)
    return { period: chosen, startDate: bounds.startDate, endDate: bounds.endDate, upTo: [target, bounds.endDate].sort()[0], today }
  }

  /**
   * أيام موظفين بعينهم في الفترة الجارية (من غير مسير: runId فاضي، والموجود بيحتفظ بمسيره). نفس دالة التراكم بالحرف: اليوم النضيف
   * بيتقرا والناقص والمتسخ بس بيتحسب، فالتكرار آمن. ولما يتعمل مسير للفترة بيقرا الصفوف دي (نفس المفتاح: موظف وفترة ويوم).
   */
  private async accrueEmployeesIn(employeeIds: readonly number[], window: PayrollLiveWindow) {
    const totals = { employees: 0, computed: 0, reused: 0 }
    if (window.startDate > window.upTo) return totals
    const basis = await this.deductionBasis(this.runs.manager)
    for (const employeeId of employeeIds) {
      // معاملة لكل موظف: قفل قصير، وفشل موظف ما بيوقفش الباقي
      try {
        const result = await withPayrollAccrualDeadlockRetry(() => this.runs.manager.transaction(em =>
          this.accrueEmployeeRange(em, { employeeId, period: window.period, runId: null, from: window.startDate, to: window.upTo, today: window.today, basis, background: true })))
        totals.employees++
        totals.computed += result.computed
        totals.reused += result.reused
      } catch (error) {
        this.logger.warn(`تعذر تراكم أيام الموظف ${employeeId} للفترة ${window.period}: ${(error as Error).message}`)
      }
    }
    return totals
  }

  /** الموظفون النشطون اللي مش في مسير للفترة دي (المفتوح اتراكم مع مسيره، والمعتمد أو المصروف أيامه مقفولة) */
  private async uncoveredEmployeeIds(period: string, only?: readonly number[]): Promise<number[]> {
    const manager = this.runs.manager
    const covered = new Set<number>()
    for (const run of await this.openRuns(manager, period)) for (const id of await this.runEmployeeIds(manager, run)) covered.add(id)
    const closed: Array<{ employeeId: number }> = await manager.query(`SELECT DISTINCT i.[employeeId] FROM [payroll_items] i INNER JOIN [payroll_runs] r ON r.[id] = i.[runId]
      WHERE r.[period] = @0 AND r.[status] IN ('APPROVED', 'PAID') AND (r.[runType] IS NULL OR r.[runType] = 'REGULAR')`, [period])
    for (const row of closed) covered.add(Number(row.employeeId))
    const wanted = only ? new Set(only) : null
    const active = await manager.getRepository(Employee).find({ where: { isActive: true }, select: { id: true }, order: { id: 'ASC' } })
    return active.map(row => row.id).filter(id => !covered.has(id) && (!wanted || wanted.has(id)))
  }

  /**
   * زرار «حدّث الحساب» في معاينة الفترة: يحسب الناقص والمتسخ دلوقتي للموظفين دول (اللي في مسير مفتوح مع مسيره، والباقي من غير مسير).
   * قبل الترحيل أو والتراكم مقفول بالإعداد: مفيش حاجة تتعمل.
   * budgetMs: الطلب مايبدأش موظف جديد بعد المدة دي (أول حساب لفرع كبير بياخد دقايق) وبيرجّع `remaining` = اللي لسه ماتحسبلهمش،
   * والشاشة بتكمّل بطلب تاني. موظف واحد على الأقل في كل طلب، فالتقدّم مضمون.
   */
  async refreshLive(employeeIds: readonly number[], options: { budgetMs?: number } = {}) {
    return this.exclusive(async () => {
      const totals = { employees: 0, computed: 0, reused: 0, disabled: false, remaining: 0 }
      if (!await this.accrualTableReady(this.runs.manager) || (await this.cfg(PAYROLL_ACCRUAL_ENABLED_KEY, 'true')) !== 'true') return { ...totals, disabled: true }
      const window = await this.liveWindow()
      const wanted = new Set(employeeIds)
      const work: Array<{ employeeId: number; period: string; runId: number | null; from: string; to: string }> = []
      for (const run of await this.openRuns(this.runs.manager, window.period)) {
        const to = [window.upTo, run.endDate].sort()[0]
        for (const employeeId of await this.runEmployeeIds(this.runs.manager, run)) {
          if (wanted.has(employeeId)) work.push({ employeeId, period: run.period, runId: run.id, from: run.startDate, to })
        }
      }
      if (window.startDate <= window.upTo) {
        for (const employeeId of await this.uncoveredEmployeeIds(window.period, employeeIds)) {
          work.push({ employeeId, period: window.period, runId: null, from: window.startDate, to: window.upTo })
        }
      }
      if (!work.length) return totals
      const basis = await this.deductionBasis(this.runs.manager)
      // المدة بتتحسب من بعد ما الدور ييجي (مش من وقت الانتظار ورا مهمة الليل)
      const deadline = options.budgetMs == null ? null : Date.now() + options.budgetMs
      for (const [index, item] of work.entries()) {
        // معاملة لكل موظف: قفل قصير، وفشل موظف ما بيوقفش الباقي
        try {
          const result = await withPayrollAccrualDeadlockRetry(() => this.runs.manager.transaction(em =>
            this.accrueEmployeeRange(em, { ...item, today: window.today, basis, background: true })))
          totals.employees++; totals.computed += result.computed; totals.reused += result.reused
        } catch (error) {
          this.logger.warn(`تعذر تراكم أيام الموظف ${item.employeeId} للفترة ${item.period}: ${(error as Error).message}`)
        }
        if (deadline !== null && Date.now() >= deadline) { totals.remaining = work.length - index - 1; break }
      }
      return totals
    })
  }

  /**
   * إعادة حساب أيام الموظف المتسخة دلوقتي (مهمة الطابور بعد تعليم يوم متسخ). نفس دالة التراكم بالحرف، على الأيام المتسخة بس ولحد امبارح.
   * اليوم المقفول ما بيتلمسش: صف مسيره اتعتمد أو اتصرف، أو صف من غير مسير مفتوح (اتحسب قبل ما مسير فترته يتعمل، أو مسيره اتلغى) والموظف
   * ليه في فترته مسير عادي معتمد أو مصروف — نفس قاعدة مهمة الليل. آمنة للتكرار: مهمة اتعادت = الأيام نضيفة = مفيش حساب.
   * القايمة هنا اختيار أولي بس: الحكم النهائي بيتعاد جوه معاملة كل يوم تحت قفل الموظف المالي (accrualClosed)، فمسير اتعتمد بين
   * الاختيار والكتابة مابيتكتبش على أيامه.
   */
  async refreshEmployee(employeeId: number): Promise<PayrollAccrualRangeResult> {
    const totals: PayrollAccrualRangeResult = { computed: 0, reused: 0 }
    if (!Number.isSafeInteger(employeeId) || employeeId <= 0) return totals
    return this.exclusive(async () => {
      const manager = this.runs.manager
      if (!await this.accrualTableReady(manager)) return totals
      const basis = await this.deductionBasis(manager)
      if (!basis.accrualEnabled) return totals
      const today = localDateOf(new Date())
      // runId في الناتج = مسير الصف المفتوح بس (الملغى والمحذوف كأنه من غير مسير)
      const open = PAYROLL_ACCRUAL_OPEN_STATUSES.map(status => `'${status}'`).join(', ')
      const dirty: Array<{ period: string; runId: number | null; date: string }> = await manager.query(
        `SELECT a.[period], CASE WHEN r.[status] IN (${open}) THEN a.[runId] END AS [runId], CONVERT(varchar(10), a.[date], 23) AS [date]
         FROM [payroll_daily_accrual] a LEFT JOIN [payroll_runs] r ON r.[id] = a.[runId]
         WHERE a.[employeeId] = @0 AND a.[isDirty] = 1 AND CONVERT(varchar(10), a.[date], 23) < @1
           AND (r.[status] IN (${open})
             OR ((r.[id] IS NULL OR r.[status] = 'CANCELLED') AND NOT EXISTS (SELECT 1 FROM [payroll_items] i INNER JOIN [payroll_runs] c ON c.[id] = i.[runId]
               WHERE i.[employeeId] = a.[employeeId] AND c.[period] = a.[period] AND c.[status] IN ('APPROVED', 'PAID')
                 AND (c.[runType] IS NULL OR c.[runType] = 'REGULAR'))))
         ORDER BY a.[date]`, [employeeId, today])
      for (const row of dirty) {
        const result = await withPayrollAccrualDeadlockRetry(() => manager.transaction(em => this.accrueEmployeeRange(em, {
          employeeId, period: row.period, runId: row.runId == null ? null : Number(row.runId), from: String(row.date), to: String(row.date), today, basis, background: true })))
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
