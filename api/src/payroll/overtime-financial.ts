import { BadRequestException, ConflictException } from '@nestjs/common'
import { Between, EntityManager, In, IsNull, LessThanOrEqual, MoreThanOrEqual } from 'typeorm'
import type { OvertimeEvidence } from '../attendance/overtime-evidence'
import { Employee } from '../employees/employee.entity'
import { MONTHLY_SALARY_COMPONENTS } from '../employees/compensation'
import { OvertimeEntry } from '../requests/entities/attendance.entities'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { Request } from '../requests/entities/request.entity'
import { exemptionPolicyOnDate, loadAttendanceExemptions, type AttendanceExemptionDayPolicy } from '../attendance/attendance-exemption-resolver'
import { PayrollPeriodClaim } from './payroll-membership.entities'
import { roundPayrollMoney } from './payroll-money'

export const OVERTIME_WAGE_COMPONENT_CODES = MONTHLY_SALARY_COMPONENTS.map(component => component.code)
export const DEFAULT_OVERTIME_WAGE_COMPONENTS = OVERTIME_WAGE_COMPONENT_CODES.join(',')

export function overtimeWageComponents(value: string): string[] {
  const codes = value.split(',').map(code => code.trim().toUpperCase())
  if (codes.length !== OVERTIME_WAGE_COMPONENT_CODES.length || codes.some(code => !OVERTIME_WAGE_COMPONENT_CODES.includes(code as any)) || new Set(codes).size !== codes.length) {
    throw new BadRequestException('الإضافي يُحسب على إجمالي الراتب؛ لا يجوز استبعاد أي مكون من أساس أجره')
  }
  return [...OVERTIME_WAGE_COMPONENT_CODES]
}

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const invalid = (entryId: number): never => {
  throw new ConflictException({ code: 'OT_FINANCIAL_SNAPSHOT_INVALID', message: `لقطة اعتماد الإضافي رقم ${entryId} غير مكتملة أو تغيرت؛ يلزم مراجعة مصدرها قبل الصرف` })
}
const near = (a: number, b: number) => Math.abs(a - b) <= 1e-8 * Math.max(1, Math.abs(a), Math.abs(b))

export interface OvertimeFinancialValue {
  approvedMinutes: number
  hours: number
  multiplier: number
  hourlyRate: number
  amount: number
  provenance: 'APPROVAL_SNAPSHOT' | 'LEGACY'
}

export interface LegacyExplicitOvertimeRequest {
  requestId: number; requestHours: number; entryHoursRequested: number; sourcePayableHours: number | null
}

/** EX-11: نفس المستند والساعات الصريحة للقديم في المسير والتصفية؛ لا اعتماد من بصمة المستثنى. */
export async function legacyExemptOvertimeSource(em: EntityManager, row: OvertimeEntry, decision: AttendanceExemptionDayPolicy):
  Promise<{ entry: OvertimeEntry; interpretation: LegacyExplicitOvertimeRequest | null } | null> {
  if (!decision.isExempt) return { entry: row, interpretation: null }
  if (!decision.overtimeEligible || row.source !== 'PRE_REQUESTED' || !row.requestId) return null
  const request = await em.findOneBy(Request, { id: row.requestId, requesterId: row.employeeId })
  let payload: { hours?: number; date?: string } = {}
  try { payload = request?.payload ? JSON.parse(request.payload) : {} } catch { return null }
  const hours = Math.min(Number(row.hoursRequested), Number(payload.hours))
  if (!request || request.typeCode !== 'OVERTIME' || !['APPROVED', 'IN_EXECUTION', 'COMPLETED'].includes(request.status) ||
    payload.date !== row.date || !Number.isFinite(hours) || hours <= 0) return null
  return { entry: { ...row, payableHours: hours }, interpretation: { requestId: request.id, requestHours: Number(payload.hours),
    entryHoursRequested: Number(row.hoursRequested), sourcePayableHours: row.payableHours == null ? null : Number(row.payableHours) } }
}

/** OT-08: المسير والتصفية يقرآن القيمة المعتمدة نفسها؛ العودة للحساب القديم للسجلات القديمة وحدها. */
export function overtimeFinancialValue(entry: OvertimeEntry, legacyHourlyRate: number): OvertimeFinancialValue {
  const saved = entry.calculationSnapshot as Record<string, any> | null | undefined
  const hasNewFields = saved != null || entry.approvedMinutes != null || entry.hourlyRateSnapshot != null || entry.amountSnapshot != null ||
    entry.originalPeriod != null || entry.deferredFromRunId != null
  if (!hasNewFields) {
    const hours = Number(entry.payableHours ?? 0), multiplier = Number(entry.rate)
    if (![hours, multiplier, legacyHourlyRate].every(value => Number.isFinite(value) && value >= 0)) invalid(entry.id)
    // القديم كان يُجمع بدقته ثم يقرب مجموعه؛ لا نغيّر قروش تاريخه بتقريب كل قيد.
    return { approvedMinutes: hours * 60, hours, multiplier, hourlyRate: legacyHourlyRate,
      amount: hours * multiplier * legacyHourlyRate, provenance: 'LEGACY' }
  }
  const approval = saved?.approval
  if (saved?.schemaVersion !== 1 || approval?.schemaVersion !== 1 || approval.employeeId !== entry.employeeId ||
    approval.workDate !== entry.date || !Number.isSafeInteger(approval.approvedMinutes) || approval.approvedMinutes <= 0 ||
    !Number.isSafeInteger(approval.approverId) || approval.approverId < 1 || typeof approval.approvedAt !== 'string' || !Number.isFinite(Date.parse(approval.approvedAt)) ||
    !['WEEKDAY', 'WEEKEND', 'HOLIDAY'].includes(approval.dayKind) || !['PUNCH', 'EXEMPT_APPROVAL'].includes(approval.evidenceMode) ||
    typeof approval.evidenceFingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(approval.evidenceFingerprint) ||
    approval.evidence?.fingerprint !== approval.evidenceFingerprint || approval.evidence?.employeeId !== entry.employeeId ||
    approval.evidence?.workDate !== entry.date || approval.evidence?.dayKind !== approval.dayKind ||
    approval.evidence?.evidenceMode !== approval.evidenceMode || approval.evidence?.policy?.multiplier !== approval.multiplier ||
    typeof approval.originalPeriod !== 'string' || !/^\d{4}-\d{2}$/.test(approval.originalPeriod) || entry.originalPeriod !== approval.originalPeriod ||
    (approval.deferredFromRunId !== null && (!Number.isSafeInteger(approval.deferredFromRunId) || approval.deferredFromRunId < 1)) ||
    (entry.deferredFromRunId ?? null) !== approval.deferredFromRunId ||
    ![approval.hours, approval.multiplier, approval.hourlyRate, approval.amount, approval.wageBase,
      approval.monthlyDays, approval.dailyHours].every(value => finite(value) && value >= 0) ||
    approval.monthlyDays <= 0 || approval.dailyHours <= 0 || approval.multiplier <= 0 || approval.multiplier > 99.99 ||
    !Array.isArray(approval.wageComponents) || !approval.wageComponents.length) invalid(entry.id)
  const components = approval.wageComponents as Array<{ code: string; amount: number }>
  if (components.some(component => !component || !OVERTIME_WAGE_COMPONENT_CODES.includes(component.code as any) || !finite(component.amount) || component.amount < 0) ||
    new Set(components.map(component => component.code)).size !== components.length ||
    !near(components.reduce((sum, component) => sum + component.amount, 0), approval.wageBase) ||
    !near(approval.hourlyRate, approval.wageBase / approval.monthlyDays / approval.dailyHours) ||
    !near(approval.hours, approval.approvedMinutes / 60) ||
    roundPayrollMoney(approval.hours * approval.multiplier * approval.hourlyRate) !== approval.amount ||
    entry.approvedMinutes == null || Number(entry.approvedMinutes) !== approval.approvedMinutes ||
    entry.hourlyRateSnapshot == null || !near(Number(entry.hourlyRateSnapshot), Number(approval.hourlyRate.toFixed(6))) ||
    entry.amountSnapshot == null || Number(entry.amountSnapshot) !== approval.amount ||
    Number(entry.rate) !== roundPayrollMoney(approval.multiplier) ||
    Number(entry.payableHours) !== roundPayrollMoney(approval.hours)) invalid(entry.id)
  return { approvedMinutes: approval.approvedMinutes, hours: approval.hours, multiplier: approval.multiplier,
    hourlyRate: approval.hourlyRate, amount: approval.amount, provenance: 'APPROVAL_SNAPSHOT' }
}

/** تطبق بعد تفسير EX القديم؛ غياب الساعات لا يثبت صفراً ولا يسمح بصرف المصدر على هذا الأساس. */
export function projectOvertimeFinancialValue(entry: OvertimeEntry, legacyHourlyRate: number): OvertimeFinancialValue {
  const value = overtimeFinancialValue(entry, legacyHourlyRate)
  if (value.provenance === 'LEGACY' && entry.payableHours == null) {
    throw new ConflictException({ code: 'OT_LEGACY_HOURS_UNRESOLVED',
      message: `سجل الإضافي القديم رقم ${entry.id} بتاريخ ${entry.date} بلا ساعات مستحقة مثبتة؛ راجع مصدره قبل احتسابه أو صرفه` })
  }
  return value
}

/** OT-05: نقرأ حجز الفترة تحت قفل الموظف، دون طلب قفل صف المسير بعد القفل المالي. */
export async function closedOvertimePeriod(em: EntityManager, employeeId: number, date: string) {
  const claims = await em.find(PayrollPeriodClaim, { where: { employeeId, releasedAt: IsNull(),
    startDate: LessThanOrEqual(date), endDate: MoreThanOrEqual(date) }, order: { id: 'DESC' } })
  if (claims.length) return { runId: claims[0].runId, period: claims[0].periodKey }
  // المسيرات القديمة قد تسبق دفتر الحجز. جميع كاتبي مالية الموظف يمسكون قفله،
  // والقراءة هنا لا تنتظر صف مسير أمسكه اعتماد آخر قبل انتظار قفل الموظف نفسه.
  const rows = await em.query(`SELECT TOP (1) r.id AS runId, r.period AS period
    FROM dbo.payroll_items i WITH (READUNCOMMITTED)
    INNER JOIN dbo.payroll_runs r WITH (READUNCOMMITTED) ON r.id=i.runId
    WHERE i.employeeId=@0 AND r.status IN ('APPROVED','PAID') AND r.startDate<=@1 AND r.endDate>=@1
    ORDER BY r.id DESC`, [employeeId, date])
  return rows.length ? { runId: Number(rows[0].runId), period: String(rows[0].period) } : null
}

/** OT-05/10: حجز الفترة وحده لا يمنع إدخال المصدر الرجعي في فترتين مختلفتين. */
export async function approvedPayrollOvertimeClaims(em: EntityManager, employeeId: number, excludeRunId?: number) {
  const rows = await em.query(`SELECT i.id, i.runId, i.breakdown, i.overtimeAmount
    FROM dbo.payroll_items i WITH (READUNCOMMITTED)
    INNER JOIN dbo.payroll_runs r WITH (READUNCOMMITTED) ON r.id=i.runId
    WHERE i.employeeId=@0 AND r.status IN ('APPROVED','PAID') AND (@1 IS NULL OR r.id<>@1)`,
  [employeeId, excludeRunId ?? null])
  const result = new Map<number, number>()
  for (const row of rows) {
    let breakdown: Record<string, any> = {}
    try { breakdown = row.breakdown ? JSON.parse(row.breakdown) : {} } catch { invalid(Number(row.id)) }
    const ids = breakdown?.overtimeEntryIds
    if (ids == null && Number(row.overtimeAmount) === 0) continue
    if (!Array.isArray(ids) || ids.some(id => !Number.isSafeInteger(id) || id < 1) ||
      (Number(row.overtimeAmount) > 0 && ids.length === 0)) {
      throw new ConflictException(`مصادر إضافي المسير التاريخي رقم ${row.runId} غير مثبتة؛ راجعها قبل ترحيل إضافي آخر للموظف`)
    }
    for (const id of ids) result.set(id, Number(row.runId))
  }
  return result
}

export async function assertUniqueOvertimeDays(em: EntityManager, employeeId: number, dates: string[]) {
  if (!dates.length) return
  const rows = await em.find(OvertimeEntry, { where: { employeeId, date: In([...new Set(dates)]) } })
  const seen = new Set<string>()
  for (const row of rows) {
    if (['REJECTED', 'CANCELLED'].includes(row.status)) continue
    if (seen.has(row.date)) throw new ConflictException({ code: 'OT_DUPLICATE_DAY', message: `للموظف #${employeeId} أكثر من قيد إضافي فعال في ${row.date}؛ عالج التعارض قبل الترحيل` })
    seen.add(row.date)
  }
}

/** المصروف القديم يحتفظ بدقائقه الفعلية؛ تغيير استثناء الحضور لا يعيد تفسير مستند صرفه. */
async function paidLegacyOvertimeMinutes(em: EntityManager, entry: OvertimeEntry): Promise<number> {
  const invalidPaid = (): never => {
    throw new ConflictException({ code: 'OT_PAID_MINUTES_UNVERIFIABLE',
      message: `دقائق الإضافي المصروف رقم ${entry.id} غير مثبتة؛ راجع مستند الصرف قبل اعتماد إضافي داخل سقفه` })
  }
  if (entry.payrollRunId != null) {
    const rows = await em.query(`SELECT i.breakdown, i.overtimeHours
      FROM dbo.payroll_items i WITH (READUNCOMMITTED)
      INNER JOIN dbo.payroll_runs r WITH (READUNCOMMITTED) ON r.id=i.runId
      WHERE i.employeeId=@0 AND r.id=@1 AND r.status='PAID'`, [entry.employeeId, entry.payrollRunId])
    if (rows.length !== 1) return invalidPaid()
    let breakdown: Record<string, any>
    try { breakdown = rows[0].breakdown ? JSON.parse(rows[0].breakdown) : {} } catch { return invalidPaid() }
    if (!breakdown || typeof breakdown !== 'object' || Array.isArray(breakdown)) return invalidPaid()
    const ids = breakdown.overtimeEntryIds
    if (ids != null && (!Array.isArray(ids) || ids.some(id => !Number.isSafeInteger(id) || id < 1) ||
      new Set(ids).size !== ids.length || !ids.includes(entry.id))) return invalidPaid()
    if (breakdown.overtime != null) {
      if (!Array.isArray(breakdown.overtime)) return invalidPaid()
      const traces = breakdown.overtime.filter((row: any) => row?.id === entry.id)
      if (traces.length !== 1) return invalidPaid()
      const trace = traces[0]
      if (!finite(trace.hours) || trace.hours < 0 || (trace.date != null && trace.date !== entry.date) ||
        (trace.source != null && trace.source !== entry.source)) return invalidPaid()
      const minutes = trace.approvedMinutes ?? trace.hours * 60
      if (!finite(minutes) || minutes < 0 || !near(minutes, trace.hours * 60)) return invalidPaid()
      return minutes
    }
    // المسير القديم ذو المصدر الواحد يثبت مدته بإجمالي الساعات حتى لو سبق تفصيل كل مصدر.
    if (Array.isArray(ids) && ids.length === 1) {
      const hours = Number(rows[0].overtimeHours)
      if (rows[0].overtimeHours == null || !Number.isFinite(hours) || hours < 0) return invalidPaid()
      return hours * 60
    }
  }
  // القديم السابق للقطة التفصيلية لا يُقرأ من طلبه أو قرار اليوم؛ عمود المصروف نفسه هو المتاح.
  const hours = Number(entry.payableHours)
  if (entry.payableHours == null || !Number.isFinite(hours) || hours < 0) return invalidPaid()
  return hours * 60
}

async function assertOvertimeCaps(em: EntityManager, entry: OvertimeEntry, evidence: OvertimeEvidence, approvedMinutes: number) {
  const { maxDailyMinutes, maxWeeklyMinutes, maxMonthlyMinutes } = evidence.policy
  if (![maxDailyMinutes, maxWeeklyMinutes, maxMonthlyMinutes].every(value => finite(value) && value >= 0)) {
    throw new BadRequestException('سقوف الإضافي غير صالحة؛ راجع إعدادات السياسة')
  }
  if (maxDailyMinutes > 0 && approvedMinutes > maxDailyMinutes) throw new ConflictException('ساعات الاعتماد تتجاوز سقف الإضافي اليومي')
  if (maxWeeklyMinutes === 0 && maxMonthlyMinutes === 0) return
  const date = new Date(`${entry.date}T12:00:00Z`)
  // الأحد بداية أسبوع الجدولة الموجود؛ لا نعيد تقسيم أسبوع الإضافي بمعيار مختلف.
  const weekFrom = new Date(date); weekFrom.setUTCDate(weekFrom.getUTCDate() - weekFrom.getUTCDay())
  const weekTo = new Date(weekFrom); weekTo.setUTCDate(weekTo.getUTCDate() + 6)
  const weekStart = weekFrom.toISOString().slice(0, 10), weekEnd = weekTo.toISOString().slice(0, 10)
  const monthStart = entry.date.slice(0, 7) + '-01'
  const monthEnd = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 12)).toISOString().slice(0, 10)
  const rows = await em.find(OvertimeEntry, { where: { employeeId: entry.employeeId,
    status: In(['APPROVED', 'PAID']), date: Between(weekStart < monthStart ? weekStart : monthStart, weekEnd > monthEnd ? weekEnd : monthEnd) } })
  const sources = rows.filter(row => row.id !== entry.id).map(row => ({ row, value: overtimeFinancialValue(row, 0) }))
  const legacyDates = sources.filter(({ row, value }) => row.status !== 'PAID' && value.provenance === 'LEGACY')
    .map(({ row }) => row.date).sort()
  const legacyExemptions = legacyDates.length ? await loadAttendanceExemptions(em, entry.employeeId,
    legacyDates[0], legacyDates[legacyDates.length - 1]) : []
  const exemptDefault = legacyDates.length ? (await em.findOneBy(RequestsConfig, { key: 'payroll.exempt_overtime_eligible' }))?.value ?? 'false' : 'false'
  if (!['true', 'false'].includes(exemptDefault)) throw new ConflictException('إعداد استحقاق إضافي المستثنى غير صالح')
  let weekMinutes = approvedMinutes, monthMinutes = approvedMinutes
  for (const { row, value } of sources) {
    let minutes = value.approvedMinutes
    if (value.provenance === 'LEGACY') {
      if (row.status === 'PAID') minutes = await paidLegacyOvertimeMinutes(em, row)
      else {
        // تفسير الساعات المستحقة القديمة هو نفسه في المسير والتصفية، فلا نعد بصمة مستثنى مستبعدة.
        const legacy = await legacyExemptOvertimeSource(em, row, exemptionPolicyOnDate(legacyExemptions, row.date,
          { overtimeEligible: exemptDefault === 'true', unpaidLeaveDeductible: true }))
        if (!legacy) continue
        minutes = projectOvertimeFinancialValue(legacy.entry, 0).approvedMinutes
      }
    }
    if (row.date >= weekStart && row.date <= weekEnd) weekMinutes += minutes
    if (row.date >= monthStart && row.date <= monthEnd) monthMinutes += minutes
  }
  if (maxWeeklyMinutes > 0 && weekMinutes > maxWeeklyMinutes) throw new ConflictException('الاعتماد يتجاوز سقف الإضافي الأسبوعي؛ خفّض الساعات أو راجع السياسة')
  if (maxMonthlyMinutes > 0 && monthMinutes > maxMonthlyMinutes) throw new ConflictException('الاعتماد يتجاوز سقف الإضافي الشهري؛ خفّض الساعات أو راجع السياسة')
}

/** OT-08/11: تُنشأ اللقطة مرة واحدة داخل معاملة آخر موافقة، ثم يحفظها صاحب المعاملة مع القرار. */
export async function buildOvertimeApprovalSnapshot(em: EntityManager, entry: OvertimeEntry, evidence: OvertimeEvidence,
  decision: { approvedMinutes: number; approverId: number; reason?: string }): Promise<Partial<OvertimeEntry>> {
  if (!em.queryRunner?.isTransactionActive) throw new Error('Overtime approval snapshot requires the employee finance transaction')
  if ((entry.calculationSnapshot as any)?.approval || ['APPROVED', 'PAID'].includes(entry.status)) throw new ConflictException('قيمة الإضافي المعتمدة مثبتة ولا يجوز استبدالها')
  if (evidence.employeeId !== entry.employeeId || evidence.workDate !== entry.date || !Number.isSafeInteger(decision.approvedMinutes) ||
    decision.approvedMinutes <= 0 || !Number.isSafeInteger(decision.approverId) || decision.approverId < 1) throw new BadRequestException('بيانات اعتماد الإضافي غير صالحة')
  const submission = (entry.calculationSnapshot as any)?.submission
  const hasRequestedMinutes = submission != null && Object.prototype.hasOwnProperty.call(submission, 'requestedMinutes')
  const claimed = entry.hoursRequested == null ? null : Number(entry.hoursRequested)
  if (!hasRequestedMinutes && claimed != null && (!Number.isFinite(claimed) || claimed <= 0)) throw new BadRequestException('ساعات الإضافي المطلوبة غير صالحة')
  // دقائق الطلب الجديدة هي الأصل؛ عمود الساعات القديم بدقتين لا يمثل كل دقيقة صحيحة.
  const claimedMinutes = hasRequestedMinutes ? submission.requestedMinutes
    : claimed == null ? null : Math.floor(claimed * 60 + 1e-8)
  if (claimedMinutes != null && (!Number.isSafeInteger(claimedMinutes) || claimedMinutes <= 0)) throw new BadRequestException('دقائق الإضافي المطلوبة غير صالحة')
  const maximum = evidence.evidenceMode === 'EXEMPT_APPROVAL' ? claimedMinutes
    : Math.min(evidence.detectedMinutes, claimedMinutes ?? evidence.detectedMinutes)
  if (maximum == null || !Number.isFinite(maximum) || decision.approvedMinutes > maximum) throw new BadRequestException('ساعات الاعتماد تتجاوز الساعات المطلوبة أو المثبتة من البصمات')
  if (evidence.blockers.length || !evidence.overtimeEligible) throw new ConflictException('أدلة الإضافي تحتاج معالجة قبل الاعتماد')
  await assertOvertimeCaps(em, entry, evidence, decision.approvedMinutes)
  const employee = await em.findOneBy(Employee, { id: entry.employeeId })
  if (!employee) throw new BadRequestException('الموظف غير موجود')
  const rows = await em.find(RequestsConfig, { where: { key: In(['payroll.monthly_days', 'payroll.daily_hours']) } })
  const config = new Map(rows.map(row => [row.key, row.value]))
  // قرار المستخدم: الاعتمادات الجديدة على إجمالي راتب الملف، ولو بقي إعداد قديم يستبعد بدلات.
  // تبقى مكونات اللقطات المعتمدة سابقًا كما حُفظت؛ لا تعيد هذه القاعدة تسعيرها.
  const wageComponents = MONTHLY_SALARY_COMPONENTS
    .map(component => ({ code: component.code, amount: Number(employee[component.key] ?? 0) }))
  const monthlyDays = Number(config.get('payroll.monthly_days') ?? '30'), dailyHours = Number(config.get('payroll.daily_hours') ?? '8')
  const multiplier = evidence.policy.multiplier
  if (wageComponents.some(component => !finite(component.amount) || component.amount < 0) ||
    ![monthlyDays, dailyHours, multiplier].every(value => finite(value) && value > 0) || multiplier > 99.99) {
    throw new BadRequestException('أساس أجر الإضافي أو مقسوماته أو مضاعفه غير صالح؛ راجع الإعدادات')
  }
  const wageBase = wageComponents.reduce((sum, component) => sum + component.amount, 0)
  const hourlyRate = wageBase / monthlyDays / dailyHours, hours = decision.approvedMinutes / 60
  const amount = roundPayrollMoney(hourlyRate * multiplier * hours)
  if (!Number.isSafeInteger(Math.round(amount * 100)) || hourlyRate >= 1e12) throw new BadRequestException('قيمة الإضافي تتجاوز الدقة المالية المدعومة')
  const closed = await closedOvertimePeriod(em, entry.employeeId, entry.date)
  const approval = { schemaVersion: 1, employeeId: entry.employeeId, workDate: entry.date,
    approvedAt: new Date().toISOString(), approverId: decision.approverId, reason: decision.reason?.trim() || null,
    approvedMinutes: decision.approvedMinutes, hours, multiplier, hourlyRate, amount,
    wageBase, wageBasis: 'GROSS_MONTHLY_SALARY', wageComponents, monthlyDays, dailyHours, dayKind: evidence.dayKind,
    evidenceMode: evidence.evidenceMode, evidenceFingerprint: evidence.fingerprint, evidence,
    formula: 'wageBase / monthlyDays / dailyHours * multiplier * approvedMinutes / 60',
    originalPeriod: closed?.period ?? entry.date.slice(0, 7), deferredFromRunId: closed?.runId ?? null }
  return { approvedMinutes: decision.approvedMinutes, hourlyRateSnapshot: Number(hourlyRate.toFixed(6)), amountSnapshot: amount,
    rate: roundPayrollMoney(multiplier), hoursActual: evidence.evidenceMode === 'EXEMPT_APPROVAL' ? null : roundPayrollMoney(evidence.detectedMinutes / 60), payableHours: roundPayrollMoney(hours),
    originalPeriod: approval.originalPeriod, deferredFromRunId: approval.deferredFromRunId,
    calculationSnapshot: { ...(entry.calculationSnapshot ?? {}), schemaVersion: 1, approval } }
}
