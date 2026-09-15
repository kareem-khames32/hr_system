import { ConflictException } from '@nestjs/common'
import { EntityManager, In, Not } from 'typeorm'
import { EmployeeObligation } from '../requests/entities/financial.entities'
import { OvertimeEntry } from '../requests/entities/attendance.entities'
import { OvertimeEntryEvent } from '../requests/entities/overtime-workflow.entities'
import { BonusRequestEvent } from './bonuses.entities'
import { BONUS_REVERSAL_OBLIGATION_CATEGORY } from './bonuses'
import { exemptionComponentOf, isAttendanceComponent, type ExemptionScopeKind, type ExemptionTarget } from './financial-exemptions'
import { PayrollFinancialExemption } from './financial-exemptions.entities'
import { recordExemptionEvent } from './payroll-financial-exemption-ledger'
import { PayrollRunReversalLine } from './payroll-corrections.entities'
import { PAYROLL_REVERSAL_LINE_STATUS_LABELS, PAYROLL_RUN_TYPE_LABELS, payrollReversalItemSnapshot, payrollRunTypeOf } from './payroll-corrections'
import { readLoanInstallmentPositions } from './payroll-installment-balances'
import { isPayrollInstallmentPlan } from './payroll-installment-ledger'
import { LoanInstallmentEvent } from './payroll-installment-ledger.entities'
import { getSettlementFinancialClaims } from './payroll-settlement-boundary'
import { PayrollItem, PayrollRun } from './payroll.entities'
import { DEDUCTION_REVERSAL_OBLIGATION_CATEGORY } from './typed-deductions'
import { DeductionRequestEvent } from './typed-deductions.entities'

// C8 / الخطوة 31: دفتر عكس صرف بند موظف في مسير مصروف. التخطيط يقرأ فقط ويعيد الموانع؛ التنفيذ داخل معاملة الصرف لمسير العكس:
// الإضافي PAID → APPROVED بلا مسير، الأقساط تعود مستحقة (DUE) ويُلغى ابن الترحيل (REVERSED) ويُحرر الحجز المنشور بحركة REVERSAL في دفتر الأقساط،
// والقيد المستهلك يُعلَّم بمسير العكس ويُنشأ قيد إعادة PENDING بمبلغه المحصل، وتُحرر حجوزات فترة الموظف. صفوف المسير الأصلي وبنوده لا تُعدَّل.
// قرارات الإعفاء المالي (إسقاط قيد أو تأجيله أو تأجيل قسط) قرارات لا صرف: تبقى كما هي وتُسجل عليها واقعة العكس.

const conflict = (code: string, message: string, details: Record<string, unknown> = {}) => new ConflictException({ code, message, ...details })
const cents = (value: unknown) => Math.round(Number(value ?? 0) * 100)
const money = (value: number) => (value / 100).toFixed(2)
const safeIds = (value: unknown) => Array.isArray(value) ? [...new Set(value.filter((id): id is number => Number.isSafeInteger(id) && Number(id) > 0))].sort((a, b) => a - b) : []
function requireTransaction(em: EntityManager) {
  if (!em.queryRunner?.isTransactionActive) throw new Error('Payroll reversal ledger requires a transaction')
}

export interface PayrollReversalBlocker { code: string; message: string; employeeId: number; details?: Record<string, unknown> }
export interface PayrollReversalPlan {
  employeeId: number; itemId: number; netPay: string
  snapshot: ReturnType<typeof payrollReversalItemSnapshot>['snapshot']; hash: string
  overtime: Array<{ id: number; date: string; requestId: number | null }>
  installments: Array<{ allocationId: number; installmentId: number; loanId: number; deductedAmount: string; carriedAmount: string; postedStatus: string
    postedRevision: number; continuationId: number | null; continuationRevision: number | null; postedEventId: number }>
  settledLoanIds: number[]
  // السلفة التي سددها هذا المسير تعود لحالتها قبل الصرف (APPROVED أو DISBURSED) لا لحالة ثابتة
  loanRestores: PayrollLoanRestore[]
  obligations: Array<{ obligationId: number; type: string; category: string; label: string; appliedAmount: string; effectiveDate: string | null; targetPeriod: string | null
    sourceRequestId: number | null; sourceRef: string | null; deductionRequestId: number | null; bonusRequestId: number | null }>
  preserved: { exemptedObligations: Array<{ obligationId: number; status: string | null; exemptionId: number }>
    exemptionDeferredInstallments: Array<{ installmentId: number; exemptionId: number | null }>
    carriedObligations: Array<{ obligationId: number; parentObligationId: number; amount: string; status: string }> }
  exemptionIds: number[]
  exemptions: PayrollReversalExemption[]
  blockers: PayrollReversalBlocker[]
}

export type PayrollLoanOpenStatus = 'APPROVED' | 'DISBURSED'
export interface PayrollLoanRestore { loanId: number; status: PayrollLoanOpenStatus; source: 'POSTED_EVENT' | 'DISBURSED_AT' }
export interface PayrollReversalExemption { id: number; scopeKind: string; targetKind: string | null; carriesToSupplementary: boolean }

/**
 * حالة السلفة قبل أن يسددها المسير: من حركة PAYROLL_POSTED (loanStatusBefore تُسجل عند الصرف)، وللحركات السابقة لهذا الحقل
 * من disbursedAt (السلفة تُنشأ APPROVED بلا تاريخ صرف، وDISBURSED تحمل تاريخه). حالتان مختلفتان في حركات المسير نفسه ⇒ null (مانع).
 */
export function payrollLoanRestoreStatus(recorded: Array<unknown>, disbursedAt: unknown): { status: PayrollLoanOpenStatus; source: PayrollLoanRestore['source'] } | null {
  const known = [...new Set(recorded.filter(value => value !== undefined && value !== null))]
  if (known.some(value => value !== 'APPROVED' && value !== 'DISBURSED') || known.length > 1) return null
  if (known.length === 1) return { status: known[0] as PayrollLoanOpenStatus, source: 'POSTED_EVENT' }
  return { status: disbursedAt ? 'DISBURSED' : 'APPROVED', source: 'DISBURSED_AT' }
}

/**
 * C3 × C8: إعفاء خصومات الحضور (التأخير والنقص والغياب، نوعًا أو يومًا) يُنقل للمسير التكميلي بقراره الأصلي لأن التكميلي يعيد حساب الحضور نفسه.
 * «كل الخصومات» لا يُنقل (قد يشمل خصومات دخلت بعد المسير الأصلي)، وإسقاط القيد المصنف أو تأجيل القسط نُفّذ عند الصرف ويبقى نافذًا.
 */
export function payrollExemptionCarriesToSupplementary(row: { scopeKind: string; targetKind: string | null }) {
  return row.scopeKind !== 'ALL_DEDUCTIONS' && isAttendanceComponent(exemptionComponentOf({ scopeKind: row.scopeKind as ExemptionScopeKind, targetKind: row.targetKind as ExemptionTarget['targetKind'] }))
}

/** قفل تطبيقي للمسير بنفس مورد PayrollService.lockRun (المعاملة الحالية). */
export async function lockPayrollRunForCorrection(em: EntityManager, runId: number) {
  const rows = await em.query(`DECLARE @result int;
    EXEC @result = sys.sp_getapplock @Resource = @0, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000;
    SELECT @result AS lockResult;`, [`hr:payroll:run:${runId}`])
  if (!rows.length || Number(rows[0].lockResult) < 0) throw new ConflictException('المسير قيد التحديث؛ حاول مجددًا بعد انتهاء العملية')
}

/**
 * ماذا سيعيد عكس صرف بند الموظف، وما يمنعه (قراءة فقط). الموانع: المسير ليس مصروفًا أو هو مسير عكس، البند معكوس بالفعل، مصادر قديمة بلا مراجع،
 * سجل إضافي أو قسط أو قيد تغيّر بعد الصرف، ابن ترحيل القسط دخل مسيرًا أو تصفية أو حركة لاحقة (يُعكس المسير اللاحق أولًا)، عكس يدوي DD-12 للقيد، أو تصفية نهائية معتمدة تغطي الفترة.
 */
export async function planPayrollItemReversal(em: EntityManager, run: PayrollRun, item: PayrollItem, options: { ownReversalRunId?: number } = {}): Promise<PayrollReversalPlan> {
  const blockers: PayrollReversalBlocker[] = []
  const employeeId = item.employeeId
  const block = (code: string, message: string, details: Record<string, unknown> = {}) => blockers.push({ code, message, employeeId, details })
  const { snapshot, hash } = payrollReversalItemSnapshot(item)
  const result: PayrollReversalPlan = { employeeId, itemId: item.id, netPay: snapshot.amounts.netPay, snapshot, hash, overtime: [], installments: [], settledLoanIds: [], loanRestores: [], obligations: [],
    preserved: { exemptedObligations: [], exemptionDeferredInstallments: [], carriedObligations: [] }, exemptionIds: [], exemptions: [], blockers }
  if (item.runId !== run.id) block('PAYRUN-REVERSAL-ITEM-RUN', `البند #${item.id} لا يخص المسير #${run.id}`)
  if (run.status !== 'PAID') block('PAYRUN-REVERSAL-NOT-PAID', 'عكس الصرف متاح لمسير مصروف فقط؛ المسير المعتمد يُعاد فتحه بدل عكسه')
  if (payrollRunTypeOf(run) === 'REVERSAL') block('PAYRUN-REVERSAL-OF-REVERSAL', 'مسير العكس لا يُعكس؛ صحح أثره بمسير تكميلي مربوط بالمسير الأصلي')
  const live = await em.getRepository(PayrollRunReversalLine).findOne({ where: { originalItemId: item.id, status: Not('CANCELLED') }, order: { id: 'DESC' } })
  if (live && live.reversalRunId !== options.ownReversalRunId) {
    block('PAYRUN-REVERSAL-EXISTS', `بند الموظف #${employeeId} في هذا المسير معكوس بالفعل بمسير العكس #${live.reversalRunId} (${PAYROLL_REVERSAL_LINE_STATUS_LABELS[live.status] ?? live.status})`, { reversalRunId: live.reversalRunId })
  }
  let breakdown: Record<string, any> = {}
  try { breakdown = item.breakdown ? JSON.parse(item.breakdown) : {} } catch { block('PAYRUN-REVERSAL-BREAKDOWN-INVALID', `تفصيل بند الموظف #${employeeId} غير صالح؛ لا يُعكس آليًا`); return result }
  const settlement = await em.query(`SELECT TOP (1) [id] FROM [offboarding_cases] WHERE [employeeId]=@0 AND [status] IN ('SETTLED','CLOSED') AND [lastWorkingDay]>=@1 ORDER BY [id]`, [employeeId, run.startDate])
  if (settlement.length) block('PAYRUN-REVERSAL-SETTLEMENT', `للموظف #${employeeId} تصفية نهائية معتمدة (#${settlement[0].id}) تغطي فترة المسير؛ الفروق تُعالج في التصفية لا بعكس المسير`, { caseId: Number(settlement[0].id) })
  const settlementClaims = await getSettlementFinancialClaims(em, employeeId)

  // ١) الإضافي: كل سجل مصروف بهذا المسير يعود معتمدًا بلا مسير
  const overtimeIds = safeIds(breakdown.overtimeEntryIds)
  if (Number(item.overtimeAmount) !== 0 && !overtimeIds.length) block('PAYRUN-REVERSAL-LEGACY-OVERTIME', `إضافي الموظف #${employeeId} مصروف بلا مراجع سجلات موثقة (مسير سابق)؛ لا يُعاد لحالته قبل الصرف آليًا`)
  const overtimeRows = overtimeIds.length ? await em.getRepository(OvertimeEntry).find({ where: { id: In(overtimeIds), employeeId } }) : []
  for (const id of overtimeIds) {
    const row = overtimeRows.find(entry => entry.id === id)
    if (!row || row.status !== 'PAID' || Number(row.payrollRunId) !== run.id) {
      block('PAYRUN-REVERSAL-OVERTIME-CHANGED', `سجل الإضافي #${id} لم يعد مصروفًا بهذا المسير (${row ? row.status : 'غير موجود'})؛ راجعه قبل العكس`, { overtimeEntryId: id })
      continue
    }
    if (settlementClaims.overtimeIds.has(id)) block('PAYRUN-REVERSAL-SETTLEMENT', `سجل الإضافي #${id} دخل تصفية معتمدة`, { overtimeEntryId: id })
    result.overtime.push({ id, date: row.date, requestId: row.requestId ?? null })
  }

  // ٢) الأقساط: الحجز المنشور وحركة صرفه وابن الترحيل ما زالوا بحالتهم بعد الصرف مباشرة
  const plan = breakdown.installmentPlan
  if (Number(item.loanInstallments) !== 0 && (plan == null || !isPayrollInstallmentPlan(plan))) {
    block('PAYRUN-REVERSAL-LEGACY-INSTALLMENTS', `أقساط الموظف #${employeeId} مخصومة في مسير سابق لدفتر الأقساط (بلا خطة وحجوزات)؛ لا تُعاد آليًا`)
  }
  const allocations: Array<{ id: number; installmentId: number; sourceRevision: number; deducted: string; carried: string }> = await em.query(`SELECT [id],[installmentId],[sourceRevision],
    CONVERT(varchar(40),[deductedAmount]) AS [deducted],CONVERT(varchar(40),[carriedAmount]) AS [carried]
    FROM [loan_installment_allocations] WHERE [payrollRunId]=@0 AND [employeeId]=@1 AND [status]='POSTED' AND [releasedAt] IS NULL ORDER BY [id]`, [run.id, employeeId])
  const eligibleLines = plan && isPayrollInstallmentPlan(plan) ? plan.allocation.lines.filter(line => line.eligible).length : 0
  if (allocations.length !== eligibleLines) block('PAYRUN-REVERSAL-INSTALLMENTS-INCONSISTENT', `حجوزات أقساط الموظف #${employeeId} المنشورة لا تطابق خطة البند المحفوظة؛ راجع دفتر الأقساط`)
  let positions: Awaited<ReturnType<typeof readLoanInstallmentPositions>> = []
  if (allocations.length) {
    try { positions = await readLoanInstallmentPositions(em, employeeId) }
    catch (error) { block('PAYRUN-REVERSAL-LOAN-BALANCE', error instanceof ConflictException ? String((error.getResponse() as { message?: string }).message) : 'رصيد الأقساط غير متسق') }
  }
  const postedEvents: Array<{ id: number; actionKey: string; payload: string }> = allocations.length ? await em.query(`SELECT [id],[actionKey],[payload] FROM [loan_installment_events]
    WHERE [action]='PAYROLL_POSTED' AND [actionKey] IN (${allocations.map((_, index) => `@${index}`).join(',')})`, allocations.map(row => `posted:${row.id}`)) : []
  const loanIds = new Set<number>()
  const loanStatusBefore = new Map<number, unknown[]>()
  for (const allocation of allocations) {
    const event = postedEvents.find(row => row.actionKey === `posted:${allocation.id}`)
    const position = positions.find(row => row.id === allocation.installmentId)
    let continuationId: number | null = null
    let statusBefore: unknown = null
    try {
      const payload = event ? JSON.parse(event.payload) : {}
      continuationId = payload.continuationId ?? null
      statusBefore = payload.loanStatusBefore ?? null
    } catch { continuationId = null }
    if (position) loanStatusBefore.set(position.loanId, [...(loanStatusBefore.get(position.loanId) ?? []), statusBefore])
    const expected = allocation.carried === '0.00' ? 'PAID' : allocation.deducted === '0.00' ? 'DEFERRED' : 'PARTIAL'
    if (!event || !position || position.financialStatus !== expected || position.financialRevision !== Number(allocation.sourceRevision) + 1 || position.paidAmount !== allocation.deducted ||
        (expected === 'PAID') !== (continuationId === null)) {
      block('PAYRUN-REVERSAL-DOWNSTREAM', `القسط #${allocation.installmentId} تغيّر بعد صرف المسير (سداد مبكر أو تسوية أو حركة لاحقة)؛ لا يُعاد لحالته قبل الصرف`, { installmentId: allocation.installmentId })
      continue
    }
    const later = await em.query(`SELECT TOP (1) [id],[action],[payrollRunId] FROM [loan_installment_events] WHERE [installmentId]=@0 AND [id]>@1 ORDER BY [id]`, [allocation.installmentId, event.id])
    if (later.length) block('PAYRUN-REVERSAL-DOWNSTREAM', `للقسط #${allocation.installmentId} حركة لاحقة للصرف (${later[0].action}#${later[0].id})`, { installmentId: allocation.installmentId, eventId: Number(later[0].id) })
    let continuationRevision: number | null = null
    if (continuationId !== null) {
      const child = positions.find(row => row.id === continuationId)
      if (!child || child.parentInstallmentId !== position.id || child.financialStatus !== 'DUE' || child.remainingAmount !== allocation.carried) {
        block('PAYRUN-REVERSAL-DOWNSTREAM', `قسط الترحيل #${continuationId} الناتج عن صرف القسط #${allocation.installmentId} لم يعد مستحقًا كما أنشأه الصرف`, { installmentId: continuationId })
        continue
      }
      continuationRevision = child.financialRevision
      const claimed = await em.query(`SELECT TOP (1) [payrollRunId],[status] FROM [loan_installment_allocations] WHERE [installmentId]=@0 AND [releasedAt] IS NULL`, [continuationId])
      if (claimed.length) {
        block('PAYRUN-REVERSAL-DOWNSTREAM', `قسط الترحيل #${continuationId} دخل المسير #${claimed[0].payrollRunId} (${claimed[0].status === 'HELD' ? 'معتمد' : 'مصروف'})؛ اعكس ذلك المسير أو أعد فتحه أولًا`,
          { installmentId: continuationId, runId: Number(claimed[0].payrollRunId) })
      }
      const childEvents = await em.query(`SELECT TOP (1) [id],[action] FROM [loan_installment_events] WHERE [installmentId]=@0 AND [id]>@1 ORDER BY [id]`, [continuationId, event.id])
      if (childEvents.length) block('PAYRUN-REVERSAL-DOWNSTREAM', `لقسط الترحيل #${continuationId} حركة لاحقة (${childEvents[0].action})`, { installmentId: continuationId })
      if (settlementClaims.installmentIds.has(continuationId)) block('PAYRUN-REVERSAL-SETTLEMENT', `قسط الترحيل #${continuationId} دخل تصفية معتمدة`, { installmentId: continuationId })
    }
    loanIds.add(position.loanId)
    result.installments.push({ allocationId: Number(allocation.id), installmentId: position.id, loanId: position.loanId, deductedAmount: allocation.deducted, carriedAmount: allocation.carried,
      postedStatus: expected, postedRevision: position.financialRevision, continuationId, continuationRevision, postedEventId: Number(event.id) })
  }
  if (loanIds.size) {
    const loans: Array<{ id: number; status: string; disbursed: number }> = await em.query(`SELECT [id],[status],CASE WHEN [disbursedAt] IS NULL THEN 0 ELSE 1 END AS [disbursed]
      FROM [loans] WHERE [employeeId]=@0 AND [id] IN (${[...loanIds].map((_, index) => `@${index + 1}`).join(',')})`, [employeeId, ...loanIds])
    result.settledLoanIds = loans.filter(loan => loan.status === 'SETTLED').map(loan => Number(loan.id)).sort((a, b) => a - b)
    for (const loanId of result.settledLoanIds) {
      const loan = loans.find(row => Number(row.id) === loanId)!
      const restore = payrollLoanRestoreStatus(loanStatusBefore.get(loanId) ?? [], Number(loan.disbursed) === 1)
      if (!restore) block('PAYRUN-REVERSAL-LOAN-STATUS', `حالة السلفة #${loanId} قبل الصرف غير محددة في حركات المسير؛ لا تُعاد آليًا`, { loanId })
      else result.loanRestores.push({ loanId, ...restore })
    }
  }
  const exemptionDeferred: Array<{ installmentId: number; payload: string }> = await em.query(`SELECT [installmentId],[payload] FROM [loan_installment_events]
    WHERE [payrollRunId]=@0 AND [employeeId]=@1 AND [action]='DEFERRED_BY_EXEMPTION' ORDER BY [id]`, [run.id, employeeId])
  result.preserved.exemptionDeferredInstallments = exemptionDeferred.map(row => {
    let exemptionId: number | null = null
    try { exemptionId = JSON.parse(row.payload).exemptionId ?? null } catch { exemptionId = null }
    return { installmentId: Number(row.installmentId), exemptionId }
  })

  // ٣) دفتر المديونيات: كل قيد استهلكه هذا المسير لهذا الموظف يُعاد بقيد PENDING بمبلغه المحصل
  const obligationIds = safeIds(breakdown.obligationIds)
  if ((Number(item.otherDeductions) !== 0 || Number(item.otherAdditions) !== 0) && breakdown.obligationIds === undefined) {
    block('PAYRUN-REVERSAL-LEGACY-OBLIGATIONS', `قيود دفتر الموظف #${employeeId} مستهلكة بلا مراجع موثقة (مسير سابق)؛ لا تُعاد آليًا`)
  }
  const obligations: Array<Record<string, any>> = obligationIds.length ? await em.query(`SELECT [id],[employeeId],[type],[category],[label],[status],[appliedPayrollRunId],[payrollReversalRunId],
    [deductionRequestId],[bonusRequestId],[sourceRequestId],[sourceRef],[targetPeriod],CONVERT(varchar(10),[effectiveDate],23) AS [effectiveDate],
    CONVERT(varchar(40),[appliedAmount]) AS [applied],CONVERT(varchar(40),[amount]) AS [amount]
    FROM [employee_obligations] WHERE [employeeId]=@0 AND [id] IN (${obligationIds.map((_, index) => `@${index + 1}`).join(',')})`, [employeeId, ...obligationIds]) : []
  for (const id of obligationIds) {
    const row = obligations.find(entry => Number(entry.id) === id)
    if (!row || row.status !== 'APPLIED' || Number(row.appliedPayrollRunId) !== run.id) {
      block('PAYRUN-REVERSAL-OBLIGATION-CHANGED', `قيد الدفتر #${id} لم يعد مستهلكًا بهذا المسير؛ راجعه قبل العكس`, { obligationId: id })
      continue
    }
    if (row.payrollReversalRunId != null) { block('PAYRUN-REVERSAL-EXISTS', `قيد الدفتر #${id} عُكس صرفه بالفعل بمسير العكس #${row.payrollReversalRunId}`, { obligationId: id }); continue }
    // عكس DD-12 اليدوي القائم يمنع إعادة أصل الخصم أو المكافأة. قيد العكس اليدوي نفسه (deduction_reversal / bonus_reversal) يُعاد كأي قيد،
    // وقيد العكس المستهلك في هذا المسير نفسه يُعاد مع أصله فلا يمنع؛ المانع عكس يدوي خارج هذا المسير.
    const manualReversal = async (column: 'deductionRequestId' | 'bonusRequestId', requestId: number, type: 'CREDIT' | 'DEBIT', category: string) =>
      em.query(`SELECT TOP (1) [id] FROM [employee_obligations] WHERE [${column}]=@0 AND [type]=@1 AND [category]=@2 AND [status]<>'CANCELLED' AND [id]<>@3
        AND NOT ([status]='APPLIED' AND [appliedPayrollRunId]=@4 AND [payrollReversalRunId] IS NULL) ORDER BY [id]`, [requestId, type, category, id, run.id])
    if (row.deductionRequestId != null && row.category !== DEDUCTION_REVERSAL_OBLIGATION_CATEGORY) {
      const manual = await manualReversal('deductionRequestId', row.deductionRequestId, 'CREDIT', DEDUCTION_REVERSAL_OBLIGATION_CATEGORY)
      if (manual.length) block('PAYRUN-REVERSAL-OBLIGATION-REVERSED', `للخصم المصنف #${row.deductionRequestId} عكس يدوي قائم (قيد #${manual[0].id})؛ عكس المسير يعيد الخصم كاملًا فيتكرر العكس — عالج العكس اليدوي أولًا`, { obligationId: id })
    }
    if (row.bonusRequestId != null && row.category !== BONUS_REVERSAL_OBLIGATION_CATEGORY) {
      const manual = await manualReversal('bonusRequestId', row.bonusRequestId, 'DEBIT', BONUS_REVERSAL_OBLIGATION_CATEGORY)
      if (manual.length) block('PAYRUN-REVERSAL-OBLIGATION-REVERSED', `للمكافأة #${row.bonusRequestId} استرداد يدوي قائم (قيد #${manual[0].id})؛ عالجه أولًا`, { obligationId: id })
    }
    result.obligations.push({ obligationId: id, type: row.type, category: row.category, label: row.label, appliedAmount: money(cents(row.applied ?? row.amount)),
      effectiveDate: row.effectiveDate ?? null, targetPeriod: row.targetPeriod ?? null, sourceRequestId: row.sourceRequestId ?? null, sourceRef: row.sourceRef ?? null,
      deductionRequestId: row.deductionRequestId ?? null, bonusRequestId: row.bonusRequestId ?? null })
  }
  if (obligationIds.length) {
    const carried: Array<Record<string, any>> = await em.query(`SELECT [id],[carriedFromObligationId],[status],CONVERT(varchar(40),[amount]) AS [amount] FROM [employee_obligations]
      WHERE [employeeId]=@0 AND [carriedFromObligationId] IN (${obligationIds.map((_, index) => `@${index + 1}`).join(',')}) ORDER BY [id]`, [employeeId, ...obligationIds])
    result.preserved.carriedObligations = carried.map(row => ({ obligationId: Number(row.id), parentObligationId: Number(row.carriedFromObligationId), amount: money(cents(row.amount)), status: row.status }))
  }
  const exempted = Array.isArray(breakdown.financialExemptions?.exemptedObligations) ? breakdown.financialExemptions.exemptedObligations : []
  if (exempted.length) {
    const ids = safeIds(exempted.map((row: any) => row?.obligationId))
    const rows = ids.length ? await em.getRepository(EmployeeObligation).find({ where: { id: In(ids), employeeId }, select: { id: true, status: true } }) : []
    result.preserved.exemptedObligations = exempted.filter((row: any) => Number.isSafeInteger(row?.obligationId)).map((row: any) => ({ obligationId: row.obligationId,
      status: rows.find(entry => entry.id === row.obligationId)?.status ?? null, exemptionId: Number(row.exemptionId) }))
  }
  const applied = await em.getRepository(PayrollFinancialExemption).find({ where: { runId: run.id, employeeId, status: 'APPLIED' }, select: { id: true, scopeKind: true, targetKind: true }, order: { id: 'ASC' } })
  result.exemptionIds = applied.map(row => row.id)
  result.exemptions = applied.map(row => ({ id: row.id, scopeKind: row.scopeKind, targetKind: row.targetKind ?? null, carriesToSupplementary: payrollExemptionCarriesToSupplementary(row) }))
  return result
}

/**
 * تنبيهات لا تمنع العكس (C3 × C8). إعفاء خصومات الحضور يُنقل للمسير التكميلي بقراره الأصلي عند إنشائه (لا يُحتسب قرارًا ثانيًا في حد الموظف)؛
 * «كل الخصومات» لا يُنقل لأنه قد يشمل خصومات دخلت بعد المسير الأصلي — يُمنح صراحةً دون أن يُحتسب القرار المعكوس في الحد؛
 * وإسقاط القيد المصنف أو تأجيل القسط نُفّذ عند الصرف ويبقى نافذًا.
 */
export function payrollReversalPlanWarnings(plan: Pick<PayrollReversalPlan, 'employeeId' | 'exemptions'>) {
  const ids = (rows: PayrollReversalExemption[]) => rows.map(row => row.id)
  const list = (rows: PayrollReversalExemption[]) => rows.map(row => `#${row.id}`).join('، ')
  const carried = plan.exemptions.filter(row => row.carriesToSupplementary)
  const all = plan.exemptions.filter(row => !row.carriesToSupplementary && row.scopeKind === 'ALL_DEDUCTIONS')
  const preserved = plan.exemptions.filter(row => !row.carriesToSupplementary && row.scopeKind !== 'ALL_DEDUCTIONS')
  const warnings: Array<{ code: string; employeeId: number; exemptionIds: number[]; message: string }> = []
  if (carried.length) warnings.push({ code: 'PAYRUN-REVERSAL-EXEMPTION-CARRIED', employeeId: plan.employeeId, exemptionIds: ids(carried),
    message: `إعفاء خصومات الحضور للموظف #${plan.employeeId} (${list(carried)}) يُنقل تلقائيًا بقراره الأصلي إلى المسير التكميلي عند إنشائه، ولا يُحتسب قرارًا جديدًا في حدود الإعفاء` })
  if (all.length) warnings.push({ code: 'PAYRUN-REVERSAL-EXEMPTION-NOT-CARRIED', employeeId: plan.employeeId, exemptionIds: ids(all),
    message: `إعفاء «كل الخصومات» للموظف #${plan.employeeId} (${list(all)}) لا يُنقل تلقائيًا لأنه قد يشمل خصومات دخلت بعد المسير الأصلي: ما أسقطه أو أجّله يبقى نافذًا، `
      + 'وامنح إعفاء الحضور على المسير التكميلي بعد حسابه إن بقي مستحقًا — القرار المعكوس لا يُحتسب في حد الموظف' })
  if (preserved.length) warnings.push({ code: 'PAYRUN-REVERSAL-EXEMPTION-PRESERVED', employeeId: plan.employeeId, exemptionIds: ids(preserved),
    message: `قرار الإعفاء للموظف #${plan.employeeId} (${list(preserved)}) أسقط قيدًا مصنفًا أو أجّل قسطًا عند الصرف ويبقى نافذًا؛ لا يُعاد ما أسقطه أو أجّله` })
  return warnings
}

/** ملخص قصير لما سيُعاد (للمعاينة وحدث الإنشاء). */
export function payrollReversalPlanSummary(plan: PayrollReversalPlan) {
  const sum = (rows: Array<{ appliedAmount: string; type: string }>, type: string) => money(rows.filter(row => row.type === type).reduce((total, row) => total + cents(row.appliedAmount), 0))
  return { employeeId: plan.employeeId, itemId: plan.itemId, netPay: plan.netPay, overtimeEntries: plan.overtime.length, installments: plan.installments.length,
    installmentAmount: money(plan.installments.reduce((total, row) => total + cents(row.deductedAmount), 0)), voidedContinuations: plan.installments.filter(row => row.continuationId !== null).length,
    settledLoansReopened: plan.settledLoanIds.length, reopenedLoanStatuses: plan.loanRestores.map(row => ({ loanId: row.loanId, status: row.status })), obligations: plan.obligations.length, reinstatedDebits: sum(plan.obligations, 'DEBIT'), reinstatedCredits: sum(plan.obligations, 'CREDIT'),
    preservedExemptionDecisions: plan.preserved.exemptedObligations.length + plan.preserved.exemptionDeferredInstallments.length, carriedObligationsKept: plan.preserved.carriedObligations.length,
    exemptions: plan.exemptionIds.length, warnings: payrollReversalPlanWarnings(plan), blockers: plan.blockers }
}

/**
 * تنفيذ عكس بند واحد (داخل معاملة صرف مسير العكس، والموظف مقفول). يعيد التخطيط تحت القفل ويرفض أي مانع أو تغيّر في بصمة البند،
 * ثم يكتب كل أثر بشرط حالته بعد الصرف بالضبط (أي سباق يُرجع المعاملة كلها).
 */
export async function postPayrollReversalLine(em: EntityManager, input: { reversalRun: PayrollRun; parentRun: PayrollRun; line: PayrollRunReversalLine; item: PayrollItem; actorUserId: number }) {
  requireTransaction(em)
  const { reversalRun, parentRun, line, item, actorUserId } = input
  const plan = await planPayrollItemReversal(em, parentRun, item, { ownReversalRunId: reversalRun.id })
  if (plan.blockers.length) throw conflict('PAYRUN-REVERSAL-BLOCKED', `تعذر تنفيذ عكس بند الموظف #${item.employeeId}: ${plan.blockers[0].message}`, { blockers: plan.blockers })
  if (plan.hash !== line.itemHash) throw conflict('PAYRUN-REVERSAL-ITEM-CHANGED', `بند الموظف #${item.employeeId} في المسير الأصلي لا يطابق لقطته وقت إنشاء العكس`)
  const employeeId = item.employeeId
  const label = `عكس صرف مسير ${parentRun.period} (#${parentRun.id}) بمسير العكس #${reversalRun.id}`
  const common = { originalRunId: parentRun.id, reversalRunId: reversalRun.id, lineId: line.id }

  // ١) الإضافي
  if (plan.overtime.length) {
    const ids = plan.overtime.map(row => row.id)
    const updated = await em.query(`UPDATE [overtime_entries] SET [status]='APPROVED',[payrollRunId]=NULL OUTPUT INSERTED.[id]
      WHERE [employeeId]=@0 AND [status]='PAID' AND [payrollRunId]=@1 AND [id] IN (${ids.map((_, index) => `@${index + 2}`).join(',')})`, [employeeId, parentRun.id, ...ids])
    if (updated.length !== ids.length) throw conflict('PAYRUN-REVERSAL-OVERTIME-CHANGED', 'أحد سجلات الإضافي تغيّر أثناء تنفيذ العكس؛ أعد المحاولة')
    for (const row of plan.overtime) {
      await em.getRepository(OvertimeEntryEvent).save({ entryId: row.id, requestId: row.requestId, actorUserId, eventType: 'PAYROLL_REVERSED', stepOrder: null,
        reason: `${label}: عاد السجل معتمدًا بلا مسير`.slice(0, 500), payload: { ...common, from: 'PAID', to: 'APPROVED' } })
    }
  }

  // ٢) الأقساط: إلغاء ابن الترحيل، ثم إعادة الأصل مستحقًا، ثم تحرير الحجز المنشور وحركة REVERSAL
  const installments = []
  for (const entry of plan.installments) {
    if (entry.continuationId !== null) {
      const voided = await em.query(`UPDATE [loan_installments] SET [financialStatus]='REVERSED',[financialRevision]=COALESCE([financialRevision],1)+1 OUTPUT INSERTED.[id]
        WHERE [id]=@0 AND [parentInstallmentId]=@1 AND [paid]=0 AND ([financialStatus]='DUE' OR [financialStatus] IS NULL) AND COALESCE([financialRevision],1)=@2`,
      [entry.continuationId, entry.installmentId, entry.continuationRevision])
      if (voided.length !== 1) throw conflict('PAYRUN-REVERSAL-DOWNSTREAM', `قسط الترحيل #${entry.continuationId} تغيّر أثناء تنفيذ العكس`)
    }
    const restored = await em.query(`UPDATE [loan_installments] SET [paidAmount]=CAST('0.00' AS decimal(18,2)),[financialStatus]='DUE',[financialRevision]=COALESCE([financialRevision],1)+1,
      [paid]=0,[paidAt]=NULL OUTPUT INSERTED.[id] WHERE [id]=@0 AND COALESCE([financialRevision],1)=@1 AND [financialStatus]=@2`, [entry.installmentId, entry.postedRevision, entry.postedStatus])
    if (restored.length !== 1) throw conflict('PAYRUN-REVERSAL-DOWNSTREAM', `القسط #${entry.installmentId} تغيّر أثناء تنفيذ العكس`)
    const released = await em.query(`UPDATE [loan_installment_allocations] SET [releasedAt]=SYSUTCDATETIME(),[reversedAt]=SYSUTCDATETIME(),[reversalRunId]=@0
      OUTPUT INSERTED.[id] WHERE [id]=@1 AND [status]='POSTED' AND [releasedAt] IS NULL`, [reversalRun.id, entry.allocationId])
    if (released.length !== 1) throw conflict('PAYRUN-REVERSAL-DOWNSTREAM', `حجز القسط #${entry.installmentId} المنشور تغيّر أثناء تنفيذ العكس`)
    const event = await em.getRepository(LoanInstallmentEvent).save({ employeeId, loanId: entry.loanId, installmentId: entry.installmentId, allocationId: entry.allocationId,
      payrollRunId: reversalRun.id, requestId: null, actorId: actorUserId, action: 'REVERSAL', actionKey: `reversal:${line.id}:allocation:${entry.allocationId}`,
      reason: `${label}: أُعيد القسط مستحقًا (${entry.deductedAmount} مخصوم سابقًا)`.slice(0, 500),
      payload: JSON.stringify({ ...common, allocationId: entry.allocationId, postedEventId: entry.postedEventId, deductedAmount: entry.deductedAmount, carriedAmount: entry.carriedAmount,
        before: { financialStatus: entry.postedStatus, paidAmount: entry.deductedAmount, financialRevision: entry.postedRevision }, after: { financialStatus: 'DUE', paidAmount: '0.00', financialRevision: entry.postedRevision + 1 },
        voidedContinuationId: entry.continuationId }) })
    installments.push({ ...entry, reversalEventId: event.id })
  }
  // السلفة المسددة بهذا المسير تعود لحالتها قبل الصرف (APPROVED أو DISBURSED) كما سُجلت في حركة الصرف
  const reopenedLoans: number[] = []
  const reopenedLoanStatuses: Array<{ loanId: number; from: 'SETTLED'; to: PayrollLoanOpenStatus; source: PayrollLoanRestore['source'] }> = []
  for (const restore of plan.loanRestores) {
    const open = (await readLoanInstallmentPositions(em, employeeId, restore.loanId)).some(row => row.remainingAmount !== '0.00')
    if (!open) continue
    const updated = await em.query(`UPDATE [loans] SET [status]=@2 OUTPUT INSERTED.[id] WHERE [id]=@0 AND [employeeId]=@1 AND [status]='SETTLED'`, [restore.loanId, employeeId, restore.status])
    if (updated.length) {
      reopenedLoans.push(restore.loanId)
      reopenedLoanStatuses.push({ loanId: restore.loanId, from: 'SETTLED', to: restore.status, source: restore.source })
    }
  }

  // ٣) دفتر المديونيات: القيد المستهلك يُعلَّم بمسير العكس، وقيد إعادة PENDING بمبلغه المحصل
  const obligations = []
  const repo = em.getRepository(EmployeeObligation)
  for (const entry of plan.obligations) {
    const marked = await em.query(`UPDATE [employee_obligations] SET [payrollReversalRunId]=@0 OUTPUT INSERTED.[id]
      WHERE [id]=@1 AND [employeeId]=@2 AND [status]='APPLIED' AND [appliedPayrollRunId]=@3 AND [payrollReversalRunId] IS NULL`, [reversalRun.id, entry.obligationId, employeeId, parentRun.id])
    if (marked.length !== 1) throw conflict('PAYRUN-REVERSAL-OBLIGATION-CHANGED', `قيد الدفتر #${entry.obligationId} تغيّر أثناء تنفيذ العكس`)
    let reinstatedId: number | null = null
    if (cents(entry.appliedAmount) > 0) {
      const saved = await repo.save(repo.create({ employeeId, type: entry.type as EmployeeObligation['type'], category: entry.category, amount: Number(entry.appliedAmount),
        label: `إعادة قيد #${entry.obligationId} بعد عكس صرف مسير ${parentRun.period}: ${entry.label}`.slice(0, 300), status: 'PENDING',
        effectiveDate: entry.effectiveDate as string, sourceRequestId: entry.sourceRequestId as number, sourceRef: entry.sourceRef as string, createdByUserId: actorUserId,
        deductionRequestId: entry.deductionRequestId, bonusRequestId: entry.bonusRequestId, targetPeriod: entry.targetPeriod, payrollReversalOfObligationId: entry.obligationId }))
      reinstatedId = saved.id
    }
    const payload = JSON.stringify({ ...common, obligationId: entry.obligationId, reinstatedObligationId: reinstatedId, amount: entry.appliedAmount })
    const reason = `${label}: أُعيد ${entry.appliedAmount} قيدًا مستحقًا (#${reinstatedId ?? '-'}) للمسير التكميلي أو التالي`
    if (entry.deductionRequestId != null) await em.getRepository(DeductionRequestEvent).save({ requestId: entry.deductionRequestId, eventType: 'PAYROLL_REVERSED', actorUserId, fromStatus: null, toStatus: null, stepOrder: null, reason, payload })
    if (entry.bonusRequestId != null) await em.getRepository(BonusRequestEvent).save({ requestId: entry.bonusRequestId, eventType: 'PAYROLL_REVERSED', actorUserId, fromStatus: null, toStatus: null, stepOrder: null, reason, payload })
    obligations.push({ obligationId: entry.obligationId, reinstatedObligationId: reinstatedId, type: entry.type, category: entry.category, amount: entry.appliedAmount })
  }

  // ٤) قرارات الإعفاء المالي تبقى على مسيرها؛ تُسجل واقعة العكس على كل إعفاء مطبق لهذا الموظف في المسير (وإعفاء الحضور يُنقل للتكميلي عند إنشائه)
  for (const exemption of plan.exemptions) {
    const row = await em.getRepository(PayrollFinancialExemption).findOneBy({ id: exemption.id })
    if (row) await recordExemptionEvent(em, row, 'RUN_REVERSED', actorUserId, row.status, row.status, exemption.carriesToSupplementary
      ? `${label}؛ إعفاء خصومات الحضور يُنقل بقراره إلى المسير التكميلي المربوط عند إنشائه`
      : `${label}؛ قرار الإعفاء يبقى نافذًا ولا يُعاد ما أسقطه أو أجّله`, { ...common, carriesToSupplementary: exemption.carriesToSupplementary })
  }

  // ٥) حجز فترة الموظف في المسير الأصلي يُحرر فيُصرف بمسير تكميلي مربوط
  const claims: Array<{ id: number }> = await em.query(`UPDATE [payroll_period_claims] SET [releasedAt]=SYSUTCDATETIME() OUTPUT INSERTED.[id]
    WHERE [runId]=@0 AND [employeeId]=@1 AND [releasedAt] IS NULL`, [parentRun.id, employeeId])

  const effects = { version: 1, ...common, employeeId, itemId: item.id, netPay: plan.netPay,
    overtime: plan.overtime.map(row => ({ id: row.id, date: row.date, from: 'PAID', to: 'APPROVED' })),
    installments: installments.map(row => ({ installmentId: row.installmentId, loanId: row.loanId, allocationId: row.allocationId, deductedAmount: row.deductedAmount, carriedAmount: row.carriedAmount,
      from: row.postedStatus, to: 'DUE', voidedContinuationId: row.continuationId, reversalEventId: row.reversalEventId })),
    reopenedLoans, reopenedLoanStatuses, obligations, preserved: plan.preserved, exemptionIds: plan.exemptionIds,
    carriedExemptionIds: plan.exemptions.filter(row => row.carriesToSupplementary).map(row => row.id), releasedClaimIds: claims.map(row => Number(row.id)) }
  line.status = 'POSTED'
  line.effects = JSON.stringify(effects)
  line.postedByUserId = actorUserId
  line.postedAt = new Date()
  await em.getRepository(PayrollRunReversalLine).save(line)
  return effects
}

/** إلغاء مسير العكس قبل تنفيذه: السطور المعلقة تُلغى (تبقى محفوظة)؛ لا أثر مالي نُفّذ. */
export async function cancelPayrollReversalLines(em: EntityManager, reversalRunId: number) {
  requireTransaction(em)
  const rows: Array<{ id: number }> = await em.query(`UPDATE [payroll_run_reversal_lines] SET [status]='CANCELLED',[cancelledAt]=SYSUTCDATETIME() OUTPUT INSERTED.[id]
    WHERE [reversalRunId]=@0 AND [status]='PENDING'`, [reversalRunId])
  return rows.map(row => Number(row.id))
}

/**
 * C3 × C8: عند إنشاء مسير تكميلي مربوط، ينقل إعفاء خصومات الحضور المطبق على البند المعكوس (سطر عكس منفذ) إلى التكميلي بقراره الأصلي:
 * صف إعفاء جديد ACTIVE على التكميلي بنفس النطاق والهدف والسبب والمرفق والمانح والمعتمد، مرجعه evaluation.carriedFrom، دون إعادة فحص الحدود
 * (ليس قرارًا جديدًا؛ القرار المعكوس لا يُحتسب في حد الموظف). يُطبق عند حساب التكميلي ويُثبت عند اعتماده مثل أي إعفاء، ويُسجل النقل على الصفين.
 */
export async function carryReversedRunExemptions(em: EntityManager, input: { parentRun: Pick<PayrollRun, 'id' | 'period'>; supplementaryRun: Pick<PayrollRun, 'id' | 'period'>;
  employeeIds: number[]; actorUserId: number }) {
  requireTransaction(em)
  const ids = safeIds(input.employeeIds)
  if (!ids.length) return []
  const lines = await em.getRepository(PayrollRunReversalLine).find({ where: { originalRunId: input.parentRun.id, status: 'POSTED', employeeId: In(ids) }, order: { id: 'ASC' } })
  if (!lines.length) return []
  const repo = em.getRepository(PayrollFinancialExemption)
  const sources = (await repo.find({ where: { runId: input.parentRun.id, employeeId: In([...new Set(lines.map(line => line.employeeId))]), status: 'APPLIED' }, order: { id: 'ASC' } }))
    .filter(row => payrollExemptionCarriesToSupplementary(row))
  const carried: Array<{ fromExemptionId: number; exemptionId: number; employeeId: number }> = []
  for (const source of sources) {
    const line = lines.filter(row => row.employeeId === source.employeeId).pop()!
    let evaluation: Record<string, unknown> = {}
    try { evaluation = source.evaluation ? JSON.parse(source.evaluation) : {} } catch { evaluation = {} }
    const carriedFrom = { exemptionId: source.id, runId: input.parentRun.id, reversalRunId: line.reversalRunId, reversalLineId: line.id,
      supplementaryRunId: input.supplementaryRun.id, carriedByUserId: input.actorUserId }
    const copy = await repo.save(repo.create({ runId: input.supplementaryRun.id, period: input.supplementaryRun.period, employeeId: source.employeeId, scopeKind: source.scopeKind,
      targetKind: source.targetKind, deductionTypeId: source.deductionTypeId, targetRef: source.targetRef, disposition: source.disposition, reason: source.reason,
      attachmentRef: source.attachmentRef, status: 'ACTIVE', grantorBasis: source.grantorBasis, grantedByUserId: source.grantedByUserId, grantedByEmployeeId: source.grantedByEmployeeId,
      estimatedAmount: source.exemptedAmountSnapshot ?? source.estimatedAmount, exemptedAmountSnapshot: null, appliedLines: null, appliedSnapshotVersion: null,
      evaluation: JSON.stringify({ ...evaluation, runSnapshotVersion: 0, carriedFrom }), overrides: null, approvedByUserId: source.approvedByUserId, approvedAt: source.approvedAt,
      decidedByUserId: null, decidedAt: null, decisionReason: null, supersededById: null, revision: 1, updatedAt: null }))
    const note = `نُقل إعفاء خصومات الحضور #${source.id} من المسير #${input.parentRun.id} (عُكس صرف بنده بمسير العكس #${line.reversalRunId}) إلى المسير التكميلي #${input.supplementaryRun.id} بقراره الأصلي`
    await recordExemptionEvent(em, copy, 'CARRIED_FROM_REVERSED_RUN', input.actorUserId, null, 'ACTIVE', note, carriedFrom)
    await recordExemptionEvent(em, source, 'CARRIED_TO_SUPPLEMENTARY', input.actorUserId, source.status, source.status, note, { ...carriedFrom, carriedExemptionId: copy.id })
    carried.push({ fromExemptionId: source.id, exemptionId: copy.id, employeeId: source.employeeId })
  }
  return carried
}

const effectsSummary = (effects: string | null) => {
  if (!effects) return null
  try {
    const value = JSON.parse(effects)
    return { overtime: value.overtime?.length ?? 0, installments: value.installments?.length ?? 0, obligations: value.obligations?.length ?? 0,
      reopenedLoans: value.reopenedLoans?.length ?? 0, releasedClaims: value.releasedClaimIds?.length ?? 0, preserved: value.preserved ?? null, detail: value }
  } catch { return null }
}

/** تفاصيل التصحيح على شاشة المسير: النوع، المسير المرتبط، المسيرات التابعة، وسطور العكس (لمسير العكس) أو البنود المعكوسة (للأصلي والتكميلي). */
export async function describePayrollRunCorrection(em: EntityManager, run: PayrollRun) {
  const runType = payrollRunTypeOf(run)
  const parent = run.parentRunId ? await em.getRepository(PayrollRun).findOne({ where: { id: run.parentRunId }, select: { id: true, name: true, period: true, status: true, runType: true } }) : null
  const children = await em.getRepository(PayrollRun).find({ where: { parentRunId: run.id }, order: { id: 'ASC' },
    select: { id: true, name: true, period: true, status: true, runType: true, totalNet: true, createdAt: true, correctionReason: true } })
  const lines = runType === 'REVERSAL'
    ? await em.getRepository(PayrollRunReversalLine).find({ where: { reversalRunId: run.id }, order: { employeeId: 'ASC', id: 'ASC' } })
    : await em.getRepository(PayrollRunReversalLine).find({ where: { originalRunId: run.id, status: Not('CANCELLED') }, order: { employeeId: 'ASC', id: 'ASC' } })
  return {
    runType, runTypeLabel: PAYROLL_RUN_TYPE_LABELS[runType], correctionReason: run.correctionReason ?? null,
    parentRun: parent ? { id: parent.id, name: parent.name, period: parent.period, status: parent.status, runType: payrollRunTypeOf(parent) } : null,
    children: children.map(child => ({ id: child.id, name: child.name, period: child.period, status: child.status, runType: payrollRunTypeOf(child),
      runTypeLabel: PAYROLL_RUN_TYPE_LABELS[payrollRunTypeOf(child)], totalNet: money(cents(child.totalNet)), createdAt: child.createdAt, correctionReason: child.correctionReason ?? null })),
    lines: lines.map(line => {
      let snapshot: Record<string, any> | null = null
      try { snapshot = JSON.parse(line.itemSnapshot) } catch { snapshot = null }
      return { id: line.id, reversalRunId: line.reversalRunId, originalRunId: line.originalRunId, originalItemId: line.originalItemId, employeeId: line.employeeId,
        status: line.status, statusLabel: PAYROLL_REVERSAL_LINE_STATUS_LABELS[line.status] ?? line.status, netPay: money(cents(line.netPay)),
        amounts: snapshot?.amounts ?? null, createdAt: line.createdAt, postedAt: line.postedAt, postedByUserId: line.postedByUserId, effects: effectsSummary(line.effects) }
    }),
  }
}

/** القسيمة: هل عُكس صرف هذا البند، وبأي مسير وسبب، وقسائم المسير التكميلي للموظف نفسه المرتبطة به. */
export async function describePayrollItemReversal(em: EntityManager, item: Pick<PayrollItem, 'id' | 'runId' | 'employeeId'>) {
  const line = await em.getRepository(PayrollRunReversalLine).findOne({ where: { originalItemId: item.id, status: Not('CANCELLED') }, order: { id: 'DESC' } })
  const supplementary: Array<{ runId: number; name: string | null; status: string; itemId: number; netPay: string }> = (await em.query(`SELECT r.[id] AS [runId], r.[name], r.[status], i.[id] AS [itemId],
      CONVERT(varchar(40), i.[netPay]) AS [netPay]
    FROM [payroll_runs] r INNER JOIN [payroll_items] i ON i.[runId]=r.[id]
    WHERE r.[runType]='SUPPLEMENTARY' AND r.[parentRunId]=@0 AND i.[employeeId]=@1 AND r.[status] IN ('APPROVED','PAID') ORDER BY r.[id]`, [item.runId, item.employeeId]))
    .map((row: any) => ({ runId: Number(row.runId), name: row.name ?? null, status: row.status, itemId: Number(row.itemId), netPay: money(cents(row.netPay)) }))
  if (!line && !supplementary.length) return null
  const reversalRun = line ? await em.getRepository(PayrollRun).findOne({ where: { id: line.reversalRunId }, select: { id: true, name: true, status: true, correctionReason: true, paidAt: true } }) : null
  return {
    line: line ? { id: line.id, status: line.status, statusLabel: PAYROLL_REVERSAL_LINE_STATUS_LABELS[line.status] ?? line.status, netPay: money(cents(line.netPay)),
      postedAt: line.postedAt, reversalRunId: line.reversalRunId, reversalRunName: reversalRun?.name ?? null, reversalRunStatus: reversalRun?.status ?? null, reason: reversalRun?.correctionReason ?? null } : null,
    supplementary,
  }
}

/** البنود المعكوسة المنفذة لمجموعة مسيرات (runId → employeeIds) — لقارئي العضوية في الذاكرة. */
export async function postedReversalPairs(em: EntityManager, runIds: number[]) {
  const ids = [...new Set(runIds.filter(id => Number.isSafeInteger(id) && id > 0))]
  const pairs = new Set<string>()
  for (let offset = 0; offset < ids.length; offset += 500) {
    const chunk = ids.slice(offset, offset + 500)
    const rows: Array<{ originalRunId: number; employeeId: number }> = await em.query(`SELECT [originalRunId],[employeeId] FROM [payroll_run_reversal_lines]
      WHERE [status]='POSTED' AND [originalRunId] IN (${chunk.map((_, index) => `@${index}`).join(',')})`, chunk)
    for (const row of rows) pairs.add(`${row.originalRunId}:${row.employeeId}`)
  }
  return pairs
}
