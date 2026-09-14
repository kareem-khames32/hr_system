import { BadRequestException, ConflictException } from '@nestjs/common'
import { EntityManager, In } from 'typeorm'
import { Loan } from '../requests/entities/financial.entities'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { PayrollDecimal } from './payroll-decimal'
import { allocatePayrollInstallments, PAYROLL_INSTALLMENT_ALLOCATION_VERSION, PayrollInstallmentAllocationError, PayrollInstallmentAllocationResult } from './payroll-installment-allocation'
import { computePayrollInstallmentBudget, PayrollInstallmentBudgetError } from './payroll-installment-budget'
import { LoanInstallmentPosition, readLoanInstallmentPositions } from './payroll-installment-balances'
import { LoanInstallmentAllocation, LoanInstallmentEvent } from './payroll-installment-ledger.entities'
import { getSettlementFinancialClaims, lockPayrollEmployees } from './payroll-settlement-boundary'
import { parsePayrollPolicyConfigValue, PAYROLL_POLICY_CONFIG_KEYS, PAYROLL_POLICY_SETTING_FIELDS, PayrollPolicySettings, validatePayrollPolicySettings } from './payroll-policy-settings'

export const PAYROLL_INSTALLMENT_PLAN_VERSION = 'LOAN_ALLOCATION_V1_20260913' as const
const MODE_KEY = 'loan.insufficient_net_behavior'
type Mode = 'PARTIAL_THEN_CARRY' | 'SKIP_AND_EXTEND'
type PositionSnapshot = Omit<LoanInstallmentPosition, 'paidAt' | 'paid' | 'employeeId'>
export interface PayrollInstallmentPlan {
  version: typeof PAYROLL_INSTALLMENT_PLAN_VERSION
  policy: { mode: Mode; settings: PayrollPolicySettings }
  context: { period: string; endDate: string; netBeforeLoans: string; earnedFixedGross: string; capConsumed: string }
  sources: PositionSnapshot[]
  excludedClaimedIds: number[]
  budget: ReturnType<typeof computePayrollInstallmentBudget>
  allocation: PayrollInstallmentAllocationResult
}
const conflict = (message: string, code = 'LOAN_SOURCE_CHANGED') => new ConflictException({ code, message })
const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const canonical = (value: any): any => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value
const same = (left: unknown, right: unknown) => JSON.stringify(canonical(left)) === JSON.stringify(canonical(right))
const snapshot = ({ paidAt: _at, paid: _paid, employeeId: _employeeId, ...value }: LoanInstallmentPosition): PositionSnapshot => value
function requireTransaction(em: EntityManager) { if (!em.queryRunner?.isTransactionActive) throw new Error('Installment ledger requires a transaction') }
function nextMonth(period: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period) || period < '0001-01' || period >= '9999-12') throw new BadRequestException('شهر القسط خارج المجال المدعوم')
  const year = Number(period.slice(0, 4)), month = Number(period.slice(5))
  return month === 12 ? `${String(year + 1).padStart(4, '0')}-01` : `${period.slice(0, 4)}-${String(month + 1).padStart(2, '0')}`
}

export function isPayrollInstallmentPlan(value: unknown): value is PayrollInstallmentPlan {
  try {
    const plan = value as PayrollInstallmentPlan
    if (!plan || plan.version !== PAYROLL_INSTALLMENT_PLAN_VERSION || !plan.policy || !['PARTIAL_THEN_CARRY', 'SKIP_AND_EXTEND'].includes(plan.policy.mode) ||
        !plan.context || !/^\d{4}-\d{2}-\d{2}$/.test(plan.context.endDate) || !Array.isArray(plan.sources) || !Array.isArray(plan.excludedClaimedIds) ||
        plan.allocation?.engineVersion !== PAYROLL_INSTALLMENT_ALLOCATION_VERSION || !Array.isArray(plan.allocation.lines) || !plan.budget) return false
    validatePayrollPolicySettings(plan.policy.settings)
    if (plan.sources.length > 1000 || new Set(plan.sources.map(row => row.id)).size !== plan.sources.length ||
        plan.sources.some(row => !Number.isInteger(row.id) || row.id < 1 || !Number.isInteger(row.financialRevision) || row.financialRevision < 1 || row.financialStatus !== 'DUE')) return false
    const lines = plan.allocation.lines
    if (lines.length !== plan.sources.length || new Set(lines.map(line => line.installmentRef)).size !== lines.length ||
        lines.some(line => !plan.sources.some(source => String(source.id) === line.installmentRef && source.remainingAmount === line.dueAmount))) return false
    const deducted = lines.reduce((sum, line) => sum.add(PayrollDecimal.from(line.deductedAmount)), PayrollDecimal.from('0'))
    return deducted.compare(PayrollDecimal.from(plan.allocation.totals.deductedAmount)) === 0
  } catch { return false }
}

async function configuredPolicy(em: EntityManager): Promise<PayrollInstallmentPlan['policy']> {
  const keys = [...Object.values(PAYROLL_POLICY_CONFIG_KEYS), MODE_KEY]
  const rows = await em.getRepository(RequestsConfig).findBy({ key: In(keys) })
  const settings = Object.fromEntries(PAYROLL_POLICY_SETTING_FIELDS.map(field => [field,
    parsePayrollPolicyConfigValue(field, rows.find(row => row.key === PAYROLL_POLICY_CONFIG_KEYS[field])?.value)]))
  const mode = rows.find(row => row.key === MODE_KEY)?.value
  if (mode !== 'PARTIAL_THEN_CARRY' && mode !== 'SKIP_AND_EXTEND') throw new BadRequestException('اختر سلوك نقص المتاح لأقساط السلف في الإعدادات')
  return { mode, settings: validatePayrollPolicySettings(settings) }
}

// حجز المصدر مستقل عن تداخل فترة الموظف، ويشمل التخطي الذي لا يخصم أي مبلغ.
async function claimedInstallmentIds(em: EntityManager, employeeId: number, excludeRunId = 0) {
  const claimed = new Set<number>()
  const rows = await em.query(`SELECT [installmentId] FROM [loan_installment_allocations]
    WHERE [employeeId]=@0 AND [status]='HELD' AND [releasedAt] IS NULL AND [payrollRunId]<>@1`, [employeeId, excludeRunId])
  for (const row of rows) claimed.add(row.installmentId)
  const old = await em.query(`SELECT i.[breakdown],i.[loanInstallments] FROM [payroll_items] i INNER JOIN [payroll_runs] r ON r.[id]=i.[runId]
    WHERE i.[employeeId]=@0 AND r.[id]<>@1 AND r.[status] IN ('APPROVED','PAID')`, [employeeId, excludeRunId])
  for (const row of old) {
    let data: any
    try { data = row.breakdown ? JSON.parse(row.breakdown) : {} } catch { throw conflict('تفصيل أقساط مسير سابق غير صالح') }
    if (data.installmentPlan != null) { if (!isPayrollInstallmentPlan(data.installmentPlan)) throw conflict('خطة أقساط مسير سابق غير صالحة'); continue }
    if (Number(row.loanInstallments) === 0 && data.installmentIds === undefined) continue
    if (!Array.isArray(data.installmentIds) || data.installmentIds.some((id: unknown) => !Number.isInteger(id) || Number(id) < 1)) throw conflict('مصادر أقساط مسير سابق غير موثقة')
    for (const id of data.installmentIds) claimed.add(id)
  }
  for (const id of (await getSettlementFinancialClaims(em, employeeId)).installmentIds) claimed.add(id)
  return claimed
}

export async function assertNoHeldLoanInstallments(em: EntityManager, employeeId: number, loanId?: number) {
  const rows = await em.query(`SELECT TOP(1) a.[id] FROM [loan_installment_allocations] a
    INNER JOIN [loan_installments] i ON i.[id]=a.[installmentId]
    WHERE a.[employeeId]=@0 AND a.[status]='HELD' AND a.[releasedAt] IS NULL ${loanId === undefined ? '' : 'AND i.[loanId]=@1'}`,
    loanId === undefined ? [employeeId] : [employeeId, loanId])
  if (rows.length) throw conflict('للموظف أقساط محجوزة في مسير معتمد؛ اصرف المسير أو أعد فتحه قبل التأجيل أو التسوية', 'LOAN_INSTALLMENT_HELD')
}

export async function buildPayrollInstallmentPlan(em: EntityManager, employeeId: number, context: PayrollInstallmentPlan['context'],
  options: { runId?: number; policy?: PayrollInstallmentPlan['policy'] } = {}): Promise<PayrollInstallmentPlan | null> {
  try {
  const all = (await readLoanInstallmentPositions(em, employeeId)).filter(row => row.financialStatus === 'DUE' && row.remainingAmount !== '0.00')
  if (!all.length && !options.policy) return null
  const policy = options.policy ? plain(options.policy) : await configuredPolicy(em)
  validatePayrollPolicySettings(policy.settings)
  if (!['PARTIAL_THEN_CARRY', 'SKIP_AND_EXTEND'].includes(policy.mode)) throw conflict('اختيار سداد الأقساط المحفوظ غير صالح')
  const claimed = await claimedInstallmentIds(em, employeeId, options.runId)
  const excludedClaimedIds = all.filter(row => row.dueDate <= context.endDate && claimed.has(row.id)).map(row => row.id).sort((a, b) => a - b)
  const sources = all.filter(row => !excludedClaimedIds.includes(row.id)).map(snapshot)
  const nextPeriod = nextMonth(context.period), mappedPeriod = (date: string) => date > context.endDate && date.slice(0, 7) < nextPeriod ? nextPeriod : date.slice(0, 7)
  const tails = new Map<number, string>()
  for (const source of sources) { const period = mappedPeriod(source.dueDate); if (!tails.has(source.loanId) || tails.get(source.loanId)! < period) tails.set(source.loanId, period) }
  const budget = computePayrollInstallmentBudget(policy.settings, { netBeforeLoans: context.netBeforeLoans, earnedFixedGross: context.earnedFixedGross,
    capConsumed: context.capConsumed, sourceRefs: { netBeforeLoans: 'PAYROLL_ITEM_BEFORE_LOANS', earnedFixedGross: 'PAYROLL_EARNED_FIXED_GROSS', capConsumed: 'PAYROLL_PRIOR_DEDUCTIONS' } })
  const allocation = allocatePayrollInstallments({ period: context.period, nextPeriod, availableBudget: budget.availableBudget, currencyScale: 2,
    installments: sources.map(source => ({ installmentRef: String(source.id), loanRef: String(source.loanId), sourceRef: `loan_installments:${source.id}`,
      sourceRevision: source.financialRevision, sequence: source.id, originalDuePeriod: source.originalDueDate.slice(0, 7), duePeriod: mappedPeriod(source.dueDate),
      remainingAmount: source.remainingAmount, priority: 0, insufficientMode: policy.mode,
      extensionPeriod: policy.mode === 'SKIP_AND_EXTEND' ? nextMonth([context.period, tails.get(source.loanId)!].sort().at(-1)!) : null })), manualDeferrals: [] })
  return { version: PAYROLL_INSTALLMENT_PLAN_VERSION, policy, context: plain(context), sources, excludedClaimedIds, budget, allocation }
  } catch (error) {
    if (error instanceof PayrollInstallmentAllocationError || error instanceof PayrollInstallmentBudgetError) {
      throw new ConflictException({ code: error.code, message: `تعذر حساب أقساط الموظف: ${error.message}`, path: error.path })
    }
    throw error
  }
}

async function freshPlan(em: EntityManager, employeeId: number, runId: number, value: unknown) {
  if (!isPayrollInstallmentPlan(value)) throw conflict('خطة أقساط المسير غير مكتملة؛ أعد حساب المسودة', 'LOAN_PLAN_INVALID')
  const current = await buildPayrollInstallmentPlan(em, employeeId, value.context, { runId, policy: value.policy })
  if (!same(current, value)) throw conflict('رصيد أو جدول أو حجز أحد الأقساط تغيّر بعد الحساب؛ أعد حساب المسودة')
  return value
}

async function event(em: EntityManager, values: { employeeId: number; loanId: number; installmentId: number; actorId: number | null;
  action: string; actionKey: string; reason?: string | null; allocationId?: number | null; payrollRunId?: number | null; requestId?: number | null; payload: unknown }) {
  const { payload, ...rest } = values
  return em.getRepository(LoanInstallmentEvent).save({ ...rest, payload: JSON.stringify(payload) })
}

export async function reservePayrollInstallments(em: EntityManager, employeeId: number, runId: number, snapshotVersion: number, actorId: number, value: unknown) {
  requireTransaction(em)
  const plan = await freshPlan(em, employeeId, runId, value)
  const repo = em.getRepository(LoanInstallmentAllocation)
  if (await repo.countBy({ payrollRunId: runId, employeeId, status: 'HELD' })) throw conflict('المسير يحتفظ بحجز أقساط غير محرر')
  for (const line of plan.allocation.lines.filter(line => line.eligible)) {
    const source = plan.sources.find(row => String(row.id) === line.installmentRef)!
    const [allocation] = await em.query(`INSERT INTO [loan_installment_allocations]
      ([installmentId],[employeeId],[payrollRunId],[payrollSnapshotVersion],[sourceRevision],[deductedAmount],[carriedAmount],
       [continuationDueDate],[outcome],[status],[sourceSnapshot],[createdByUserId]) OUTPUT INSERTED.[id]
      VALUES(@0,@1,@2,@3,@4,CAST(@5 AS decimal(18,2)),CAST(@6 AS decimal(18,2)),@7,@8,'HELD',@9,@10)`,
    [source.id, employeeId, runId, snapshotVersion, source.financialRevision, line.deductedAmount, line.remainingAmount,
      line.continuation ? `${line.continuation.duePeriod}-01` : null, line.outcome, JSON.stringify(source), actorId])
    await event(em, { employeeId, loanId: source.loanId, installmentId: source.id, actorId, action: 'RESERVED', actionKey: `reservation:${allocation.id}`,
      allocationId: allocation.id, payrollRunId: runId, payload: { source, allocation: line } })
  }
}

async function closePosition(em: EntityManager, source: LoanInstallmentPosition, deducted: string, carry: string, date: string | null, settled = false) {
  if (source.financialStatus !== 'DUE' || PayrollDecimal.from(deducted).add(PayrollDecimal.from(carry)).compare(PayrollDecimal.from(source.amount)) !== 0) throw conflict('تخصيص القسط لا يحفظ رصيده الأصلي')
  const continued = carry !== '0.00', status = continued ? deducted === '0.00' ? 'DEFERRED' : 'PARTIAL' : settled ? 'SETTLED' : 'PAID'
  const updated = await em.query(`UPDATE [loan_installments] SET [paidAmount]=CAST(@0 AS decimal(18,2)),[financialStatus]=@1,
    [financialRevision]=COALESCE([financialRevision],1)+1,[paid]=@2,[paidAt]=CASE WHEN @3=1 THEN SYSUTCDATETIME() ELSE NULL END
    OUTPUT INSERTED.[id] WHERE [id]=@4 AND COALESCE([financialRevision],1)=@5 AND [paid]=0
    AND ([financialStatus] IS NULL OR [financialStatus]='DUE')`, [deducted, status, !continued, deducted !== '0.00', source.id, source.financialRevision])
  if (updated.length !== 1) throw conflict('القسط تغير أثناء تثبيت الحركة')
  if (!continued) return null
  if (!date || date <= source.dueDate) throw conflict('موعد القسط المرحّل يجب أن يلي موعد الأصل')
  const [child] = await em.query(`INSERT INTO [loan_installments]
    ([loanId],[dueDate],[amount],[paid],[paidAmount],[financialStatus],[financialRevision],[parentInstallmentId],[originalDueDate])
    OUTPUT INSERTED.[id] VALUES(@0,@1,CAST(@2 AS decimal(18,2)),0,CAST('0.00' AS decimal(18,2)),'DUE',1,@3,@4)`,
    [source.loanId, date, carry, source.id, source.originalDueDate])
  return Number(child.id)
}

export async function postPayrollInstallments(em: EntityManager, employeeId: number, runId: number, snapshotVersion: number, actorId: number, value: unknown) {
  requireTransaction(em)
  const plan = await freshPlan(em, employeeId, runId, value), positions = await readLoanInstallmentPositions(em, employeeId)
  const allocations = await em.query(`SELECT *,CONVERT(varchar(40),[deductedAmount]) AS [deductedExact],
    CONVERT(varchar(40),[carriedAmount]) AS [carriedExact],CONVERT(varchar(10),[continuationDueDate],23) AS [dueExact]
    FROM [loan_installment_allocations] WHERE [payrollRunId]=@0 AND [employeeId]=@1 AND [status]='HELD' AND [releasedAt] IS NULL`, [runId, employeeId])
  const lines = plan.allocation.lines.filter(line => line.eligible)
  if (allocations.length !== lines.length) throw conflict('حجوزات أقساط المسير لا تطابق خطته')
  for (const line of lines) {
    const allocation = allocations.find((row: any) => String(row.installmentId) === line.installmentRef)
    const source = positions.find(row => String(row.id) === line.installmentRef)!
    if (!allocation || allocation.payrollSnapshotVersion !== snapshotVersion || allocation.sourceRevision !== source.financialRevision ||
        allocation.deductedExact !== line.deductedAmount || allocation.carriedExact !== line.remainingAmount ||
        allocation.dueExact !== (line.continuation ? `${line.continuation.duePeriod}-01` : null) || !same(JSON.parse(allocation.sourceSnapshot), snapshot(source))) throw conflict('تفصيل حجز القسط تغير بعد الاعتماد')
    const continuationId = await closePosition(em, source, allocation.deductedExact, allocation.carriedExact, allocation.dueExact)
    await em.getRepository(LoanInstallmentAllocation).update(allocation.id, { status: 'POSTED', postedAt: new Date() })
    await event(em, { employeeId, loanId: source.loanId, installmentId: source.id, actorId, action: 'PAYROLL_POSTED', actionKey: `posted:${allocation.id}`,
      allocationId: allocation.id, payrollRunId: runId, payload: { before: snapshot(source), deductedAmount: line.deductedAmount, carriedAmount: line.remainingAmount, continuationId } })
  }
  const remaining = await readLoanInstallmentPositions(em, employeeId)
  for (const loanId of new Set(lines.map(line => Number(line.loanRef)))) {
    if (!remaining.some(row => row.loanId === loanId && row.remainingAmount !== '0.00')) {
      await em.getRepository(Loan).update({ id: loanId, employeeId }, { status: 'SETTLED' })
    }
  }
}

export async function releasePayrollInstallments(em: EntityManager, runId: number, actorId: number, reason: string) {
  requireTransaction(em)
  const rows = await em.getRepository(LoanInstallmentAllocation).findBy({ payrollRunId: runId, status: 'HELD' })
  for (const row of rows) {
    const source = JSON.parse(row.sourceSnapshot)
    await em.getRepository(LoanInstallmentAllocation).update(row.id, { status: 'RELEASED', releasedAt: new Date() })
    await event(em, { employeeId: row.employeeId, loanId: source.loanId, installmentId: row.installmentId, actorId, action: 'RELEASED', actionKey: `released:${row.id}`,
      allocationId: row.id, payrollRunId: runId, reason, payload: { allocationId: row.id } })
  }
}

export async function getLoanInstallmentDeferralEvidence(em: EntityManager, input: { employeeId: number; loanId: number; installmentId: number; toPeriod: string }) {
  requireTransaction(em)
  await lockPayrollEmployees(em, [input.employeeId])
  nextMonth(input.toPeriod)
  const today = new Date(), currentPeriod = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  if (input.toPeriod <= currentPeriod) throw new BadRequestException('اختر شهرًا لاحقًا لتأجيل القسط')
  const source = (await readLoanInstallmentPositions(em, input.employeeId, input.loanId)).find(row => row.id === input.installmentId)
  if (!source || source.financialStatus !== 'DUE' || source.remainingAmount === '0.00' || `${input.toPeriod}-01` <= source.dueDate) throw new BadRequestException('اختر قسطًا مفتوحًا وموعد تأجيل يلي استحقاقه')
  if ((await claimedInstallmentIds(em, input.employeeId)).has(source.id)) throw conflict('القسط دخل مسيرًا أو تصفية معتمدة؛ حرر حجزه قبل التأجيل', 'LOAN_INSTALLMENT_HELD')
  return { loanId: source.loanId, installmentId: source.id, sourceRevision: source.financialRevision, amount: source.remainingAmount, toPeriod: input.toPeriod }
}

export async function deferLoanInstallment(em: EntityManager, input: { employeeId: number; loanId: number; installmentId: number; expectedRevision: number;
  expectedAmount?: string; toPeriod: string; requestId: number; actorId: number | null; reason: string }) {
  requireTransaction(em)
  await lockPayrollEmployees(em, [input.employeeId])
  const prior = await em.getRepository(LoanInstallmentEvent).findOneBy({ actionKey: `request:${input.requestId}:defer` })
  if (prior) {
    if (prior.employeeId !== input.employeeId || prior.installmentId !== input.installmentId || prior.loanId !== input.loanId ||
        JSON.parse(prior.payload).toPeriod !== input.toPeriod || prior.reason !== input.reason?.trim() ||
        JSON.parse(prior.payload).before.financialRevision !== input.expectedRevision ||
        (input.expectedAmount !== undefined && JSON.parse(prior.payload).before.remainingAmount !== input.expectedAmount)) throw conflict('مرجع قرار التأجيل مستخدم لحركة أخرى')
    return { eventId: prior.id, continuationId: JSON.parse(prior.payload).continuationId as number }
  }
  const evidence = await getLoanInstallmentDeferralEvidence(em, input)
  if (evidence.sourceRevision !== input.expectedRevision) throw conflict('القسط تغير بعد تقديم طلب التأجيل؛ أعد تقديم الطلب للمراجعة')
  if (input.expectedAmount !== undefined && evidence.amount !== input.expectedAmount) throw conflict('رصيد القسط تغير بعد تقديم طلب التأجيل؛ أعد تقديم الطلب للمراجعة')
  if (!input.reason?.trim() || input.reason.trim().length < 3 || input.reason.length > 500) throw new BadRequestException('سبب التأجيل مطلوب من3إلى500حرف')
  const source = (await readLoanInstallmentPositions(em, input.employeeId, input.loanId)).find(row => row.id === input.installmentId)!
  const continuationId = (await closePosition(em, source, '0.00', source.remainingAmount, `${input.toPeriod}-01`))!
  const recorded = await event(em, { employeeId: input.employeeId, loanId: input.loanId, installmentId: input.installmentId, actorId: input.actorId,
    action: 'DEFERRED', actionKey: `request:${input.requestId}:defer`, requestId: input.requestId, reason: input.reason.trim(), payload: { before: snapshot(source), toPeriod: input.toPeriod, continuationId } })
  return { eventId: recorded.id, continuationId }
}

export async function settleLoanEarly(em: EntityManager, input: { employeeId: number; loanId: number; requestId: number; actorId: number | null; reason: string }) {
  requireTransaction(em)
  await lockPayrollEmployees(em, [input.employeeId])
  const prior = await em.getRepository(LoanInstallmentEvent).findOneBy({ actionKey: `request:${input.requestId}:early` })
  if (prior) { if (prior.employeeId !== input.employeeId || prior.loanId !== input.loanId) throw conflict('مرجع التسوية مستخدم لسلفة أخرى'); return { eventId: prior.id } }
  const sources = (await readLoanInstallmentPositions(em, input.employeeId, input.loanId)).filter(row => row.financialStatus === 'DUE' && row.remainingAmount !== '0.00')
  if (!sources.length) throw new BadRequestException('السلفة مسددة بالفعل أو غير موجودة لهذا الموظف')
  const claims = await claimedInstallmentIds(em, input.employeeId)
  if (sources.some(source => claims.has(source.id))) throw conflict('أحد الأقساط محجوز في مسير أو تصفية؛ راجعه قبل السداد المبكر', 'LOAN_INSTALLMENT_HELD')
  for (const source of sources) await closePosition(em, source, source.remainingAmount, '0.00', null, true)
  await em.getRepository(Loan).update({ id: input.loanId, employeeId: input.employeeId }, { status: 'SETTLED' })
  const recorded = await event(em, { employeeId: input.employeeId, loanId: input.loanId, installmentId: sources[0].id, actorId: input.actorId,
    action: 'SETTLED_EARLY', actionKey: `request:${input.requestId}:early`, requestId: input.requestId, reason: input.reason || null, payload: { sources: sources.map(snapshot) } })
  return { eventId: recorded.id }
}
