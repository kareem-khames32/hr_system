import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common'
import { EntityManager } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { userHasPerm } from '../auth/guards'
import { MONTHLY_SALARY_COMPONENTS } from '../employees/compensation'
import { PayrollDecimal } from '../payroll/payroll-decimal'
import { readLoanInstallmentPositions } from '../payroll/payroll-installment-balances'
import { PayrollPeriodSalaryError, selectPayrollPeriodSalary } from '../payroll/payroll-period-salary'
import { readSalaryHistory, salaryHistorySchemaMissing } from '../payroll/payroll-salary-history'
import { lockPayrollEmployees } from '../payroll/payroll-settlement-boundary'
import { assertLoanReferenceId, loanScheduleAmounts } from '../requests/loan-installment-requests'
import {
  addMonths, computeLoanCap, fromCents, LOAN_EXCEPTIONAL_CATEGORIES, LOAN_REPAYMENT_METHODS, LOAN_REPAYMENT_MODES,
  LoanCapEvaluation, LoanCapPolicyRow, loanCapWindow, loanMoney, loanPeriod, selectLoanCapPolicy, toCents,
} from './loan-caps'
import type { LoanRepaymentMethod, LoanRepaymentMode } from './loans.entities'

// AD-01..09 (C6): السقف يُفحص عند التقديم ويُعاد عند كل خطوة اعتماد تحت القفل المالي للموظف.
export const LOAN_REQUEST_CLIENT_FIELDS = ['amount', 'months', 'exceptional', 'exceptionalCategory', 'firstInstallmentPeriod'] as const
export const LOAN_REQUEST_SERVER_FIELDS = ['capCheck', 'capApprovals', 'approvedAmount', 'exceptionalBy'] as const
export const EARLY_SETTLEMENT_FIELDS = ['amount', 'reference', 'method', 'mode'] as const

export const isLoanCapRequestType = (type: { code: string; destinationHandler?: string | null } | null | undefined) =>
  !!type && type.destinationHandler === 'loans_installments' && type.code !== 'EARLY_LOAN_SETTLEMENT'
export const isEarlySettlementType = (type: { code: string; destinationHandler?: string | null } | null | undefined) =>
  !!type && (type.code === 'EARLY_LOAN_SETTLEMENT' || type.destinationHandler === 'loan_early_settlement')

const blank = (value: unknown) => value === undefined || value === null || (typeof value === 'string' && value.trim() === '')
const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key)
export function localDate(value = new Date()) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

async function configValue(em: EntityManager, key: string, fallback: string): Promise<string> {
  const [row] = await em.query('SELECT [value] FROM [requests_config] WHERE [key]=@0', [key])
  return row?.value ?? fallback
}
async function intConfig(em: EntityManager, key: string, fallback: number, min: number, max: number) {
  const raw = await configValue(em, key, String(fallback)), value = Number(raw)
  if (!Number.isInteger(value) || value < min || value > max) throw new ConflictException({ code: 'LOAN_CONFIG_INVALID', message: `إعداد «${key}» غير صالح؛ راجعه في الإعدادات` })
  return value
}
export async function loanReasonMinLength(em: EntityManager) { return intConfig(em, 'loan.exceptional_reason_min_length', 10, 1, 500) }
async function boolConfig(em: EntityManager, key: string, fallback: boolean) {
  const raw = (await configValue(em, key, fallback ? 'true' : 'false')).trim()
  return raw === 'true' ? true : raw === 'false' ? false : fallback
}

/** أيام طلب السلفة من الشهر (من يوم إلى يوم، والتفاف فوق نهاية الشهر لو البداية بعد النهاية). الأصل 1..31 = مفتوح طول الشهر.
 *  والقرار ب2: مفتاح «اقفل طلب السلفة الآن» يعلو الأيام — مقفول يعني مقفول أيًّا كان اليوم. */
export async function loanRequestDayWindow(em: EntityManager, today: string) {
  const from = await intConfig(em, 'loan.request_from_day', 1, 1, 31), to = await intConfig(em, 'loan.request_to_day', 31, 1, 31)
  const enabled = await boolConfig(em, 'loan.request_open', true)
  const [year, month, day] = today.split('-').map(Number)
  const lastDay = new Date(year, month, 0).getDate()
  const start = Math.min(from, lastDay), end = Math.min(to, lastDay)
  const insideDays = start <= end ? day >= start && day <= end : day >= start || day <= end
  return { fromDay: from, toDay: to, enabled, open: enabled && insideDays,
    message: enabled ? `طلب السلفة متاح من يوم ${from} إلى يوم ${to} من الشهر` : 'طلب السلفة مقفول حاليًا' }
}
async function assertLoanRequestDayWindow(em: EntityManager, today: string) {
  const dayWindow = await loanRequestDayWindow(em, today)
  if (!dayWindow.open) throw new BadRequestException({ code: 'LOAN_REQUEST_DAY_WINDOW', message: dayWindow.message })
}

/** العميل لا يكتب لقطة السقف ولا المبلغ المعتمد ولا هوية منشئ الاستثناء. */
export function assertLoanRequestClientPayload(payload: Record<string, unknown> | null | undefined) {
  for (const key of LOAN_REQUEST_SERVER_FIELDS) {
    if (payload && own(payload, key)) throw new BadRequestException(`الحقل ${key} يكتبه الخادم عند التقديم والاعتماد فقط`)
  }
}

function parseFlag(value: unknown): boolean {
  if (blank(value) || value === false || value === 'false') return false
  if (value === true || value === 'true') return true
  throw new BadRequestException('علم السلفة الاستثنائية يجب أن يكون true أو false')
}

// ===== قراءة مصادر التقييم =====
const POLICY_COLUMNS = `[id],[policyKey],[version],[name],[scopeType],[scopeIds],[salaryBase],
  CONVERT(varchar(40),[percentOfSalary]) AS [percentOfSalary],CONVERT(varchar(40),[flatCapAmount]) AS [flatCapAmount],[maxRequestsPerMonth],
  CONVERT(varchar(40),[maxAmountPerMonth]) AS [maxAmountPerMonth],CONVERT(varchar(40),[maxOutstandingBalance]) AS [maxOutstandingBalance],
  [maxInstallmentMonths],[monthDefinition],CONVERT(varchar(10),[effectiveFrom],23) AS [effectiveFrom],CONVERT(varchar(10),[effectiveTo],23) AS [effectiveTo],
  [priority],[isActive],[supersedesId],[reason],[createdByUserId],[createdAt],[deactivatedAt],[deactivatedByUserId],[deactivationReason]`
export const LOAN_CAP_POLICY_COLUMNS = POLICY_COLUMNS

export function parseLoanCapPolicyRow(row: any): LoanCapPolicyRow & Record<string, unknown> {
  let scopeIds: number[] | null = null
  if (row.scopeIds != null) {
    try { scopeIds = JSON.parse(row.scopeIds) } catch { scopeIds = null }
    if (!Array.isArray(scopeIds) || scopeIds.some(id => !Number.isInteger(id))) throw new ConflictException({ code: 'LOAN_CAP_POLICY_INVALID', message: `نطاق سياسة السقوف رقم ${row.id} تالف؛ راجعها` })
  }
  const pct = row.percentOfSalary == null ? null : PayrollDecimal.from(row.percentOfSalary).format(4, 'HALF_UP')
  return { ...row, scopeIds, percentOfSalary: pct, isActive: row.isActive === true || row.isActive === 1 }
}

async function salaryBasis(em: EntityManager, employee: Record<string, any>, period: string) {
  const exact = (value: unknown) => PayrollDecimal.from(value == null ? '0' : String(value)).format(2, 'DOWN')
  const gross = (row: Record<string, any>) => MONTHLY_SALARY_COMPONENTS.reduce((sum, c) => sum.add(PayrollDecimal.from(exact(row[c.key]))), PayrollDecimal.from('0')).format(2, 'DOWN')
  const fromEmployee = (note: string | null) => ({ basic: exact(employee.basicSalary), gross: gross(employee), sourceRef: `employees:${employee.id}:current`, note })
  try {
    const history = await readSalaryHistory(em, employee.id)
    if (!history.version) return fromEmployee(null)
    const selected = selectPayrollPeriodSalary(history, period)
    return { basic: exact(selected.segment.basicSalary), gross: gross(selected.segment), sourceRef: selected.sourceRef, note: null }
  } catch (error) {
    if (salaryHistorySchemaMissing(error)) return fromEmployee(null)
    if (error instanceof PayrollPeriodSalaryError && error.state === 'MISSING') return fromEmployee(`لا يوجد راتب شهري موثق للفترة ${period}؛ استُخدم الراتب الحالي في ملف الموظف`)
    throw error
  }
}

/** AD-02..06: التقييم الكامل لموظف بتاريخ. يتطلب معاملة (قراءة سجل الأجر). */
export async function evaluateEmployeeLoanCap(em: EntityManager, input: { employeeId: number; amount: string; months: number; asOf: string; excludeRequestId?: number | null }): Promise<LoanCapEvaluation> {
  const [employee] = await em.query(`SELECT [id],[branchId],[departmentId],[teamId],${MONTHLY_SALARY_COMPONENTS.map(c => `CONVERT(varchar(40),[${c.key}]) AS [${c.key}]`).join(',')}
    FROM [employees] WHERE [id]=@0`, [input.employeeId])
  if (!employee) throw new BadRequestException('الموظف غير موجود')
  const cycleStartDay = await intConfig(em, 'payroll.cycle_start_day', 23, 1, 31)
  const rows = (await em.query(`SELECT ${POLICY_COLUMNS} FROM [loan_cap_policies] WHERE [isActive]=1 AND [effectiveFrom]<=@0 AND ([effectiveTo] IS NULL OR [effectiveTo]>=@0)`, [input.asOf])).map(parseLoanCapPolicyRow)
  const policy = selectLoanCapPolicy(rows, employee, input.asOf)
  const window = loanCapWindow(policy?.monthDefinition ?? 'PAYROLL_PERIOD', input.asOf, cycleStartDay)
  const salary = await salaryBasis(em, employee, loanCapWindow('PAYROLL_PERIOD', input.asOf, cycleStartDay).period)
  // AD-04: المعلّق والمعتمد والمكتمل يحجز العداد؛ المرفوض والملغي والمسودة لا.
  const requests = await em.query(`SELECT r.[id],r.[payload] FROM [requests] r INNER JOIN [request_types] t ON t.[code]=r.[typeCode]
    WHERE r.[requesterId]=@0 AND r.[id]<>@1 AND t.[destinationHandler]='loans_installments' AND t.[code]<>'EARLY_LOAN_SETTLEMENT'
      AND r.[status] IN ('SUBMITTED','UNDER_REVIEW','APPROVED','IN_EXECUTION','COMPLETED','RETURNED_FOR_INFO')
      AND r.[submittedAt] >= CAST(@2 AS date) AND r.[submittedAt] < DATEADD(day,1,CAST(@3 AS date))`, [input.employeeId, input.excludeRequestId ?? 0, window.from, window.to])
  let used = 0n
  for (const row of requests) {
    let payload: any = {}
    try { payload = JSON.parse(row.payload || '{}') } catch { throw new ConflictException({ code: 'LOAN_REQUEST_INVALID', message: `حمولة طلب السلفة رقم ${row.id} تالفة؛ راجعه قبل تقديم طلب جديد` }) }
    used += toCents(loanMoney(blank(payload.approvedAmount) ? payload.amount : payload.approvedAmount, `مبلغ طلب السلفة رقم ${row.id}`))
  }
  // AD-06: كل الأقساط المفتوحة لكل السلف (العادية والاستثنائية) + أرصدة ما بعد الإنهاء غير المحصلة.
  const positions = await readLoanInstallmentPositions(em, input.employeeId)
  let outstanding = positions.filter(row => row.financialStatus === 'DUE').reduce((sum, row) => sum + toCents(row.remainingAmount), 0n)
  for (const row of await em.query(`SELECT CONVERT(varchar(40),[amount]-[recoveredAmount]-[writtenOffAmount]) AS [open] FROM [loan_recovery_balances] WHERE [employeeId]=@0 AND [status]='PENDING_RECOVERY'`, [input.employeeId])) {
    outstanding += toCents(PayrollDecimal.from(row.open).format(2, 'DOWN'))
  }
  return computeLoanCap({ asOf: input.asOf, amount: input.amount, months: input.months, policy, salary,
    usage: { requests: requests.length, amount: fromCents(used) }, outstanding: fromCents(outstanding), window })
}

// ===== AD-05/07/09: التقديم =====
export async function stageLoanRequestSubmission(em: EntityManager, input: { requestId: number; requesterId: number; actor: JwtPayload; payload: Record<string, unknown>; today?: string }) {
  const today = input.today ?? localDate()
  const { capCheck: _capCheck, capApprovals: _capApprovals, approvedAmount: _approved, exceptionalBy: _by, ...client } = input.payload
  const exceptional = parseFlag(client.exceptional)
  if (!exceptional) await assertLoanRequestDayWindow(em, today)
  const schedule = loanScheduleAmounts(client.amount, client.months ?? 1)
  await lockPayrollEmployees(em, [input.requesterId])
  const canExceptional = userHasPerm(input.actor, 'loans.exceptional')
  const cycleStartDay = await intConfig(em, 'payroll.cycle_start_day', 23, 1, 31)
  const currentPeriod = loanCapWindow('PAYROLL_PERIOD', today, cycleStartDay).period
  let firstInstallmentPeriod: string | null = null
  if (!blank(client.firstInstallmentPeriod)) {
    if (!canExceptional) throw new ForbiddenException({ code: 'LOAN_FIRST_PERIOD_FORBIDDEN', message: 'تحديد شهر أول قسط متاح للموارد البشرية المخوّلة فقط' })
    firstInstallmentPeriod = loanPeriod(client.firstInstallmentPeriod, 'شهر أول قسط')
    const ahead = await intConfig(em, 'loan.first_installment_max_months_ahead', 12, 0, 120), last = addMonths(currentPeriod, ahead)
    if (firstInstallmentPeriod < currentPeriod || firstInstallmentPeriod > last) {
      throw new BadRequestException(`شهر أول قسط يجب أن يكون من فترة المسير الحالية ${currentPeriod} حتى ${last}`)
    }
  }
  const evaluation = await evaluateEmployeeLoanCap(em, { employeeId: input.requesterId, amount: schedule.amount, months: schedule.months, asOf: today, excludeRequestId: input.requestId })
  const staged: Record<string, unknown> = { ...client, amount: schedule.amount, months: schedule.months }
  delete staged.exceptional; delete staged.exceptionalCategory; delete staged.firstInstallmentPeriod
  if (exceptional) {
    if (!canExceptional) throw new ForbiddenException({ code: 'LOAN_EXCEPTIONAL_FORBIDDEN', message: 'إنشاء السلفة الاستثنائية للموارد البشرية المخوّلة فقط' })
    const [self] = await em.query('SELECT TOP(1) [id] FROM [users] WHERE [employeeId]=@0 AND [id]=@1', [input.requesterId, input.actor.sub])
    if (self) throw new ForbiddenException({ code: 'LOAN_EXCEPTIONAL_SELF', message: 'لا تنشئ سلفة استثنائية لنفسك؛ يقدمها مخوّل آخر' })
    const min = await loanReasonMinLength(em), reason = typeof client.reason === 'string' ? client.reason.trim() : ''
    if (reason.length < min || reason.length > 500) throw new BadRequestException(`سبب السلفة الاستثنائية مطلوب من ${min} إلى 500 حرف`)
    if (!LOAN_EXCEPTIONAL_CATEGORIES.includes(client.exceptionalCategory as any)) throw new BadRequestException('اختر تصنيف سبب السلفة الاستثنائية')
    if (!firstInstallmentPeriod) throw new BadRequestException('حدد شهر أول قسط للسلفة الاستثنائية')
    Object.assign(staged, { exceptional: true, exceptionalCategory: client.exceptionalCategory, reason, firstInstallmentPeriod, exceptionalBy: input.actor.sub })
  } else {
    if (!blank(client.exceptionalCategory)) throw new BadRequestException('تصنيف الاستثناء يخص السلفة الاستثنائية فقط')
    if (!evaluation.allowed) {
      throw new BadRequestException({ code: 'LOAN_CAP_EXCEEDED', message: `لا يمكن تقديم السلفة: ${evaluation.violations.map(row => row.message).join('؛ ')}`, cap: evaluation })
    }
    if (firstInstallmentPeriod) staged.firstInstallmentPeriod = firstInstallmentPeriod
  }
  // شهر أول قسط يُختم مرة واحدة عند التقديم فيراه الموظف والمعتمد قبل الاعتماد (القرار د)؛
  // الافتراضي هو افتراضي المعالج نفسه: أول الشهر التالي.
  if (!firstInstallmentPeriod) staged.firstInstallmentPeriod = addMonths(today.slice(0, 7), 1)
  staged.capCheck = { stage: 'SUBMIT', checkedAt: new Date().toISOString(), actorUserId: input.actor.sub, evaluation }
  return staged
}

// ===== AD-07: كل خطوة اعتماد =====
export type LoanApprovalDecision = 'WITHIN_CAP' | 'REDUCED' | 'OVERRIDE' | 'EXCEPTIONAL'
// hrFinal: المعتمد صاحب سلطة الموارد البشرية — قراره نهائي (قرار المالك 26 سبتمبر)، فمنشئ السلفة الاستثنائية
// لو كان هو مايتمنعش من اعتمادها (والاعتماد الفوري لطلبه نيابةً بيمر من هنا لكل خطوة). غيره يفضل ممنوع (فصل المهام)
export async function reviewLoanRequestApproval(em: EntityManager, input: { requestId: number; requesterId: number; payload: string | null; actor: JwtPayload; step: number;
  approvedAmount?: string | null; capOverrideReason?: string | null; comment?: string | null; today?: string; hrFinal?: boolean }) {
  await lockPayrollEmployees(em, [input.requesterId])
  let stored: Record<string, any>
  try { stored = JSON.parse(input.payload || '{}') } catch { throw new BadRequestException('حمولة طلب السلفة تالفة') }
  const schedule = loanScheduleAmounts(stored.amount, stored.months ?? 1)
  const current = blank(stored.approvedAmount) ? schedule.amount : loanMoney(stored.approvedAmount, 'المبلغ المعتمد')
  let decided = current
  if (!blank(input.approvedAmount)) {
    decided = loanMoney(input.approvedAmount, 'المبلغ المعتمد')
    if (toCents(decided) >= toCents(current)) throw new BadRequestException(`التخفيض يجب أن يكون أقل من المبلغ الحالي ${current}`)
    if (!input.comment?.trim()) throw new BadRequestException('اكتب سبب تخفيض مبلغ السلفة في الملاحظة')
    loanScheduleAmounts(decided, schedule.months)
  }
  if (stored.exceptional === true && stored.exceptionalBy === input.actor.sub && input.hrFinal !== true) {
    throw new ForbiddenException({ code: 'LOAN_EXCEPTIONAL_SELF_APPROVAL', message: 'منشئ السلفة الاستثنائية لا يعتمدها بنفسه (فصل المهام)' })
  }
  const evaluation = await evaluateEmployeeLoanCap(em, { employeeId: input.requesterId, amount: decided, months: schedule.months, asOf: input.today ?? localDate(), excludeRequestId: input.requestId })
  const submitted: LoanCapEvaluation | null = stored.capCheck?.evaluation ?? null
  const policyChanged = submitted === null ? null
    : (submitted.policy?.id ?? null) !== (evaluation.policy?.id ?? null) || (submitted.effectiveCap ?? null) !== (evaluation.effectiveCap ?? null)
  const overrideReason = blank(input.capOverrideReason) ? null : String(input.capOverrideReason).trim()
  let decision: LoanApprovalDecision
  if (evaluation.allowed) {
    if (overrideReason) throw new BadRequestException('المبلغ ضمن السقف الحالي؛ لا يُسجل استثناء')
    decision = decided !== current ? 'REDUCED' : 'WITHIN_CAP'
  } else if (stored.exceptional === true) {
    decision = 'EXCEPTIONAL'
  } else if (overrideReason) {
    if (!userHasPerm(input.actor, 'loans.cap_override')) throw new ForbiddenException({ code: 'LOAN_CAP_OVERRIDE_FORBIDDEN', message: 'تجاوز السقف باستثناء موثق يتطلب صلاحية «اعتماد سلفة تتجاوز السقف»' })
    const min = await loanReasonMinLength(em)
    if (overrideReason.length < min || overrideReason.length > 500) throw new BadRequestException(`سبب الاستثناء الموثق من ${min} إلى 500 حرف`)
    decision = 'OVERRIDE'
  } else {
    const canOverride = userHasPerm(input.actor, 'loans.cap_override')
    throw new ConflictException({
      code: 'LOAN_CAP_EXCEEDED_AT_APPROVAL',
      message: `${policyChanged ? 'تغيّرت معطيات السقف منذ التقديم. ' : ''}المبلغ ${decided} لم يعد مسموحًا: ${evaluation.violations.map(row => row.message).join('؛ ')}. ` +
        `الخيارات: الرفض بسبب، أو التخفيض إلى ${evaluation.effectiveCap ?? 'حد مسموح'} أو أقل${canOverride ? '، أو تسجيل استثناء موثق بسبب' : ''}`,
      cap: evaluation, policyChanged, maxApprovable: evaluation.effectiveCap, options: ['REJECT', 'REDUCE', ...(canOverride ? ['OVERRIDE'] : [])],
    })
  }
  const approvals = Array.isArray(stored.capApprovals) ? stored.capApprovals : []
  approvals.push({ step: input.step, approverUserId: input.actor.sub, at: new Date().toISOString(), previousAmount: current, amount: decided, decision,
    reason: decision === 'OVERRIDE' ? overrideReason : decision === 'REDUCED' ? input.comment!.trim() : null, policyChanged, evaluation })
  const next: Record<string, unknown> = { ...stored, capApprovals: approvals }
  if (decided !== schedule.amount) next.approvedAmount = decided
  return { payload: JSON.stringify(next), decision, evaluation, policyChanged }
}

// ===== المعالج: قراءة الطلب المعتمد =====
export function readApprovedLoanRequest(payload: Record<string, any>) {
  const schedule = loanScheduleAmounts(payload.amount, payload.months ?? 1)
  const amount = blank(payload.approvedAmount) ? schedule.amount : loanMoney(payload.approvedAmount, 'المبلغ المعتمد')
  if (toCents(amount) > toCents(schedule.amount)) throw new BadRequestException('المبلغ المعتمد أكبر من المطلوب')
  const approved = loanScheduleAmounts(amount, schedule.months)
  const exceptional = payload.exceptional === true
  if (exceptional && (!LOAN_EXCEPTIONAL_CATEGORIES.includes(payload.exceptionalCategory) || blank(payload.reason) || blank(payload.firstInstallmentPeriod))) {
    throw new BadRequestException('السلفة الاستثنائية بلا سبب أو تصنيف أو شهر أول قسط؛ أعد تقديمها')
  }
  return {
    requestedAmount: schedule.amount, amount, amounts: approved.amounts, months: approved.months, exceptional,
    exceptionalCategory: exceptional ? String(payload.exceptionalCategory) : null,
    exceptionalReason: exceptional ? String(payload.reason).trim() : null,
    firstInstallmentPeriod: blank(payload.firstInstallmentPeriod) ? null : loanPeriod(payload.firstInstallmentPeriod, 'شهر أول قسط'),
    capSnapshot: payload.capCheck || payload.capApprovals ? JSON.stringify({ capCheck: payload.capCheck ?? null, capApprovals: payload.capApprovals ?? [], exceptionalBy: payload.exceptionalBy ?? null }) : null,
  }
}

/** AD-14 عبر الطلبات: المبلغ الفارغ = سداد كلي؛ الجزئي يتطلب مرجعًا. */
export function readEarlySettlementPayload(payload: Record<string, any>, requestId: number | null) {
  const loanId = assertLoanReferenceId(payload.loanId)
  const amount = blank(payload.amount) ? null : loanMoney(payload.amount, 'مبلغ السداد')
  const mode = (blank(payload.mode) ? (amount === null ? 'FULL' : 'SHORTEN_TERM') : payload.mode) as LoanRepaymentMode
  if (!LOAN_REPAYMENT_MODES.includes(mode)) throw new BadRequestException('طريقة السداد: كلي، أو تقصير المدة، أو تخفيض القسط')
  const method = (blank(payload.method) ? 'OTHER' : payload.method) as LoanRepaymentMethod
  if (!LOAN_REPAYMENT_METHODS.includes(method)) throw new BadRequestException('وسيلة السداد غير صالحة')
  let reference = blank(payload.reference) ? null : String(payload.reference).trim()
  if (reference !== null && reference.length > 100) throw new BadRequestException('مرجع السداد لا يتجاوز 100 حرف')
  if (reference === null && amount !== null) throw new BadRequestException('مرجع السداد (رقم الإيصال أو التحويل) مطلوب للسداد الجزئي')
  if (reference === null && requestId !== null) reference = `REQ-${requestId}`
  return { loanId, amount, mode, method, reference }
}
