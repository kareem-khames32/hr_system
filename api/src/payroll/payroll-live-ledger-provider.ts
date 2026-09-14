import type { EntityManager } from 'typeorm'
import { PayrollDecimal } from './payroll-decimal'
import { readLoanInstallmentPositions } from './payroll-installment-balances'
import { isPayrollInstallmentPlan } from './payroll-installment-ledger'
import { PAYROLL_LIVE_SOURCE_ROW_LIMIT, PayrollLiveSourceIssue, PayrollLiveSourceSection, payrollLiveSourcePeriod } from './payroll-live-source-contract'

type Row = Record<string, any>
type Read = { rows: Row[]; issues: PayrollLiveSourceIssue[]; missing: boolean }
type Claim = { sourceRef: string; kind: 'ALLOCATION' | 'PAYROLL' | 'SETTLEMENT'; ownerId: number; status: string; ids: number[]; rawSnapshot: string | null }
export class PayrollLiveLedgerProviderError extends Error {
  constructor(readonly code: string, message: string, readonly sourceRef?: string) { super(message); this.name = 'PayrollLiveLedgerProviderError' }
}
const LIMIT = PAYROLL_LIVE_SOURCE_ROW_LIMIT
const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key)
const id = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= 2147483647
const issue = (code: string, message: string, sourceRef?: string): PayrollLiveSourceIssue => ({ code, message, ...(sourceRef ? { sourceRef } : {}) })
const fail = (code: string, message: string, sourceRef?: string): never => { throw new PayrollLiveLedgerProviderError(code, message, sourceRef) }
const unique = (values: string[]) => [...new Set(values)].sort()
function date(value: unknown, sourceRef: string) {
  try { return payrollLiveSourcePeriod(value, value).startDate } catch { return fail('LIVE_LEDGER_DATE_INVALID', 'تاريخ المصدر المالي غير صالح', sourceRef) }
}
function money(value: unknown, sourceRef: string): PayrollDecimal {
  if (typeof value !== 'string' || !/^\d{1,16}\.\d{2}$/.test(value)) fail('LIVE_LEDGER_AMOUNT_INVALID', 'المبلغ ليس نصًا دقيقًا غير سالب ضمن DECIMAL(18,2)', sourceRef)
  return PayrollDecimal.from(value as string)
}
function total(values: string[]) { return values.reduce((sum, value) => sum.add(PayrollDecimal.from(value)), PayrollDecimal.from('0')).format(2, 'HALF_UP') }
function parsed(raw: unknown, sourceRef: string): Row {
  if (typeof raw !== 'string' || raw.length > 2000000) fail('LIVE_LEDGER_SNAPSHOT_INVALID', 'تفصيل المطالبة مفقود أو يتجاوز حد القراءة', sourceRef)
  let value: any
  try { value = JSON.parse(raw as string) } catch { fail('LIVE_LEDGER_SNAPSHOT_INVALID', 'تفصيل المطالبة المالي يحتوي JSON غير صالح', sourceRef) }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) fail('LIVE_LEDGER_SNAPSHOT_INVALID', 'تفصيل المطالبة المالي ليس كائنًا صالحًا', sourceRef)
  return value
}
function ids(value: unknown, sourceRef: string): number[] {
  if (!Array.isArray(value) || value.length > LIMIT || value.some(item => !id(item)) || new Set(value).size !== value.length) {
    fail('LIVE_LEDGER_CLAIM_IDS_INVALID', 'مراجع المطالبة مفقودة أو مكررة أو غير صالحة', sourceRef)
  }
  return value as number[]
}
function errorIssue(error: any, sourceRef: string): PayrollLiveSourceIssue {
  if (error instanceof PayrollLiveLedgerProviderError) return issue(error.code, error.message, error.sourceRef ?? sourceRef)
  const response = typeof error?.getResponse === 'function' ? error.getResponse() : null
  return issue(typeof response?.code === 'string' ? response.code : 'LIVE_LEDGER_READ_INVALID',
    typeof response?.message === 'string' ? response.message : 'تعذر إثبات المصدر المالي؛ راجع بياناته ومخططه', sourceRef)
}
async function rows(em: EntityManager, sql: string, params: unknown[], sourceRef: string): Promise<Row[]> {
  const result = await em.query(sql, params)
  if (!Array.isArray(result)) fail('LIVE_LEDGER_READ_INVALID', 'نتيجة المصدر المالي غير صالحة', sourceRef)
  if (result.length > LIMIT) fail('LIVE_LEDGER_ROW_LIMIT', `مصدر ${sourceRef} يتجاوز حد ${LIMIT} صف؛ لم تُعرض نتيجة جزئية كرصد كامل`, sourceRef)
  return result
}
async function capture(sourceRef: string, read: () => Promise<Row[]>): Promise<Read> {
  try { return { rows: await read(), issues: [], missing: false } } catch (error: any) {
    const number = error?.number ?? error?.driverError?.number ?? error?.originalError?.info?.number
    const missing = number === 207 || number === 208
    if (!missing && !(error instanceof PayrollLiveLedgerProviderError) && typeof error?.getResponse !== 'function') throw error
    return { rows: [], missing, issues: [missing ? issue('LIVE_LEDGER_SCHEMA_MISSING', 'جدول أو حقل المصدر المالي غير موجود؛ لم تُفترض له أرصدة صفرية', sourceRef) : errorIssue(error, sourceRef)] }
  }
}
function state(reads: Read[], issues: PayrollLiveSourceIssue[], unsupported = false): PayrollLiveSourceSection['state'] {
  return reads.some(read => read.missing) ? 'MISSING' : issues.length ? 'INVALID' : unsupported ? 'UNSUPPORTED' : 'AVAILABLE'
}

/** Read-only inspection inside the caller's transaction. Eligibility is source/date availability, never approval or collection. */
export async function readPayrollLiveLedger(em: EntityManager, employeeId: number, periodStart: string, periodEnd: string): Promise<{
  installments: PayrollLiveSourceSection; credits: PayrollLiveSourceSection; otherDebits: PayrollLiveSourceSection
}> {
  if (!em.queryRunner?.isTransactionActive) fail('LIVE_LEDGER_TRANSACTION_REQUIRED', 'قراءة الدفتر تتطلب معاملة القراءة الخاصة بالمصادر')
  if (!id(employeeId)) fail('LIVE_LEDGER_EMPLOYEE_INVALID', 'معرف الموظف غير صالح')
  payrollLiveSourcePeriod(periodStart, periodEnd)
  const loans = await capture('loans', () => rows(em, `SELECT TOP (5001) [id],[employeeId],[requestId],[status],CAST([amount] AS nvarchar(40)) AS [amount],
    CONVERT(varchar(33),[disbursedAt],126) AS [disbursedAt] FROM [loans] WHERE [employeeId]=@0 ORDER BY [id]`, [employeeId], 'loans'))
  let rawPositions: Row[] = []
  const positions = await capture('loan_installments', async () => {
    // The existing exact balance/continuation validator is reused; only its SELECT is bounded here.
    const reader = { query: async (text: string, params: unknown[]) => {
      if (!/^SELECT\s/i.test(text)) fail('LIVE_LEDGER_READ_ONLY', 'قارئ الأرصدة لا يقبل إلا SELECT')
      rawPositions = await rows(em, text.replace(/^SELECT\s/i, 'SELECT TOP (5001) '), params, 'loan_installments')
      return rawPositions
    } } as EntityManager
    return await readLoanInstallmentPositions(reader, employeeId)
  })
  const allocations = await capture('loan_installment_allocations', () => rows(em, `SELECT TOP (5001) [id],[installmentId],[employeeId],[payrollRunId],[payrollSnapshotVersion],[sourceRevision],
    CAST([deductedAmount] AS nvarchar(40)) AS [deductedAmount],CAST([carriedAmount] AS nvarchar(40)) AS [carriedAmount],
    CONVERT(varchar(10),[continuationDueDate],23) AS [continuationDueDate],[outcome],[status],[sourceSnapshot],
    CONVERT(varchar(33),[claimedAt],126) AS [claimedAt],CONVERT(varchar(33),[postedAt],126) AS [postedAt]
    FROM [loan_installment_allocations] WHERE [employeeId]=@0 AND [releasedAt] IS NULL ORDER BY [id]`, [employeeId], 'loan_installment_allocations'))
  const payroll = await capture('payroll_items', () => rows(em, `SELECT TOP (5001) i.[id],i.[runId],r.[status],r.[snapshotVersion],i.[breakdown],
    CAST(i.[loanInstallments] AS nvarchar(40)) AS [loanInstallments],CAST(i.[otherAdditions] AS nvarchar(40)) AS [otherAdditions],
    CAST(i.[otherDeductions] AS nvarchar(40)) AS [otherDeductions]
    FROM [payroll_items] i INNER JOIN [payroll_runs] r ON r.[id]=i.[runId]
    WHERE i.[employeeId]=@0 AND r.[status] IN ('APPROVED','PAID') ORDER BY i.[id]`, [employeeId], 'payroll_items'))
  const settlements = await capture('offboarding_cases', () => rows(em, `SELECT TOP (5001) c.[id],c.[status],c.[settlementFinancialSnapshot],
    (SELECT COUNT(*) FROM [settlement_lines] l WHERE l.[caseId]=c.[id] AND l.[isAuto]=1) AS [autoLineCount]
    FROM [offboarding_cases] c WHERE c.[employeeId]=@0 AND c.[status] IN ('SETTLED','CLOSED') ORDER BY c.[id]`, [employeeId], 'offboarding_cases'))
  const obligations = await capture('employee_obligations', () => rows(em, `SELECT TOP (5001) [id],[employeeId],[type],[category],[label],[status],
    CAST([amount] AS nvarchar(40)) AS [amount],CONVERT(varchar(10),[effectiveDate],23) AS [effectiveDate],
    [sourceRequestId],[sourceRef],[appliedPayrollRunId],CONVERT(varchar(33),[appliedAt],126) AS [appliedAt]
    FROM [employee_obligations] WHERE [employeeId]=@0 AND [status]='PENDING'
    ORDER BY [id]`, [employeeId], 'employee_obligations'))

  const installmentReads = [loans, positions, allocations, payroll, settlements]
  const installmentIssues = installmentReads.flatMap(read => read.issues), creditIssues = [payroll, obligations].flatMap(read => read.issues), debitIssues = [...creditIssues]
  const installmentClaims: Claim[] = [], obligationClaims: Claim[] = []
  const addIssue = (target: PayrollLiveSourceIssue[], error: unknown, ref: string) => target.push(errorIssue(error, ref))
  const positionById = new Map<number, Row>(positions.rows.map(row => [row.id, row]))
  const loanById = new Map<number, Row>()
  for (const row of loans.rows) {
    const ref = `loans:${row.id}`
    try {
      if (!id(row.id) || row.employeeId !== employeeId || loanById.has(row.id) || !['APPROVED', 'DISBURSED', 'SETTLED'].includes(row.status)) fail('LIVE_LOAN_INVALID', 'هوية أو حالة السلفة غير صالحة', ref)
      money(row.amount, ref); loanById.set(row.id, row)
      const schedule = positions.rows.filter(position => position.loanId === row.id)
      if (!positions.issues.length && !schedule.length && !money(row.amount, ref).isZero()) fail('LIVE_LOAN_SCHEDULE_MISSING', 'السلفة موجودة دون جدول أقساط مثبت؛ لا يمكن وصف رصيدها بأنه صفر', ref)
      if (!positions.issues.length && schedule.length && PayrollDecimal.from(total(schedule.filter(position => position.parentInstallmentId === null).map(position => position.amount))).compare(money(row.amount, ref)) !== 0) fail('LIVE_LOAN_SCHEDULE_TOTAL_MISMATCH', 'أصول جدول الأقساط لا تحفظ مبلغ السلفة؛ لا يُفترض الرصيد الناقص صفرًا', ref)
      if (row.status === 'SETTLED' && schedule.some(position => position.remainingAmount !== '0.00')) fail('LIVE_LOAN_STATUS_CONFLICT', 'سلفة مسددة ما زالت تحتوي رصيد قسط مفتوح', ref)
    } catch (error) { addIssue(installmentIssues, error, ref) }
  }
  const seenPositions = new Set<number>()
  for (const row of positions.rows) {
    const ref = `loan_installments:${row.id}`
    try {
      if (!id(row.id) || !id(row.loanId) || row.employeeId !== employeeId || !loanById.has(row.loanId) || seenPositions.has(row.id)) fail('LIVE_LOAN_POSITION_INVALID', 'هوية القسط أو سلفته غير متسقة', ref)
      seenPositions.add(row.id); date(row.dueDate, ref); date(row.originalDueDate, ref)
    } catch (error) { addIssue(installmentIssues, error, ref) }
  }
  for (const row of allocations.rows) {
    const ref = `loan_installment_allocations:${row.id}`
    try {
      if (!id(row.id) || !id(row.installmentId) || row.employeeId !== employeeId || !id(row.payrollRunId) || !id(row.sourceRevision) || !id(row.payrollSnapshotVersion) || !['HELD', 'POSTED'].includes(row.status)) fail('LIVE_LOAN_ALLOCATION_INVALID', 'بيانات حجز القسط أو حالة تحريره غير متسقة', ref)
      const source = parsed(row.sourceSnapshot, ref), position = positionById.get(row.installmentId)
      if (source.id !== row.installmentId || !id(source.loanId) || source.financialRevision !== row.sourceRevision || !position || position.loanId !== source.loanId) fail('LIVE_LOAN_ALLOCATION_INVALID', 'مرجع الحجز لا يطابق القسط وسلفته', ref)
      if (row.status === 'HELD' && (position!.financialStatus !== 'DUE' || position!.financialRevision !== row.sourceRevision || position!.remainingAmount !== source.remainingAmount)) fail('LIVE_LOAN_ALLOCATION_STALE', 'حجز القسط غير المصروف لا يطابق مراجعة الرصيد الحالية', ref)
      const allocated = money(row.deductedAmount, ref).add(money(row.carriedAmount, ref))
      if (allocated.compare(money(source.remainingAmount, ref)) !== 0) fail('LIVE_LOAN_ALLOCATION_INVALID', 'مبالغ الحجز لا تحفظ أصل رصيد القسط', ref)
      installmentClaims.push({ sourceRef: ref, kind: 'ALLOCATION', ownerId: row.payrollRunId, status: row.status, ids: [row.installmentId], rawSnapshot: row.sourceSnapshot })
    } catch (error) { addIssue(installmentIssues, error, ref) }
  }
  for (const row of payroll.rows) {
    const ref = `payroll_items:${row.id}`
    let data: Row, loanAmount: PayrollDecimal, creditAmount: PayrollDecimal, debitAmount: PayrollDecimal
    try {
      if (!id(row.id) || !id(row.runId) || !['APPROVED', 'PAID'].includes(row.status)) fail('LIVE_PAYROLL_CLAIM_INVALID', 'هوية مطالبة المسير غير صالحة', ref)
      loanAmount = money(row.loanInstallments, ref); creditAmount = money(row.otherAdditions, ref); debitAmount = money(row.otherDeductions, ref)
      data = row.breakdown === null && loanAmount.isZero() && creditAmount.isZero() && debitAmount.isZero() ? {} : parsed(row.breakdown, ref)
    } catch (error) { for (const target of [installmentIssues, creditIssues, debitIssues]) addIssue(target, error, ref); continue }
    try {
      let claimed: number[] = []
      if (data.installmentPlan != null) {
        if (!isPayrollInstallmentPlan(data.installmentPlan)) fail('LIVE_PAYROLL_INSTALLMENT_PLAN_INVALID', 'خطة أقساط المسير السابق غير صالحة', ref)
        const lines = data.installmentPlan.allocation.lines
        if (lines.some((line: any) => typeof line.eligible !== 'boolean')) fail('LIVE_PAYROLL_INSTALLMENT_PLAN_INVALID', 'أهلية أقساط المطالبة السابقة غير مثبتة', ref)
        claimed = ids(lines.filter((line: any) => line.eligible).map((line: any) => /^\d+$/.test(line.installmentRef) ? Number(line.installmentRef) : null), ref)
        if (PayrollDecimal.from(total(lines.filter((line: any) => line.eligible).map((line: any) => money(line.deductedAmount, ref).format(2, 'HALF_UP')))).compare(loanAmount) !== 0) fail('LIVE_PAYROLL_INSTALLMENT_PLAN_INVALID', 'مبلغ أقساط المسير لا يطابق خطة مصادره', ref)
      } else if (own(data, 'installmentIds')) claimed = ids(data.installmentIds, ref)
      else if (!loanAmount.isZero()) fail('LIVE_PAYROLL_INSTALLMENT_SOURCES_MISSING', 'مسير سابق خصم أقساطًا دون توثيق مصادرها', ref)
      if (!loanAmount.isZero() && !claimed.length) fail('LIVE_PAYROLL_INSTALLMENT_SOURCES_MISSING', 'مبلغ قسط سابق موجب بلا مصدر موثق', ref)
      if (claimed.some(value => !positionById.has(value))) fail('LIVE_PAYROLL_INSTALLMENT_SOURCE_MISSING', 'قسط مطالب به في مسير سابق لم يعد له مصدر قابل للإثبات', ref)
      if (claimed.length) installmentClaims.push({ sourceRef: ref, kind: 'PAYROLL', ownerId: row.runId, status: row.status, ids: claimed, rawSnapshot: row.breakdown })
    } catch (error) { addIssue(installmentIssues, error, ref) }
    try {
      if (own(data, 'obligationIds')) {
        const claimed = ids(data.obligationIds, ref)
        if ((!creditAmount.isZero() || !debitAmount.isZero()) && !claimed.length) fail('LIVE_PAYROLL_OBLIGATION_SOURCES_MISSING', 'مبلغ دفتر سابق بلا مصادر مثبتة', ref)
        if (claimed.length) obligationClaims.push({ sourceRef: ref, kind: 'PAYROLL', ownerId: row.runId, status: row.status, ids: claimed, rawSnapshot: row.breakdown })
      } else {
        if (!creditAmount.isZero()) creditIssues.push(issue('LIVE_PAYROLL_OBLIGATION_SOURCES_MISSING', 'إضافة دفتر في مسير سابق دون توثيق مصادرها', ref))
        if (!debitAmount.isZero()) debitIssues.push(issue('LIVE_PAYROLL_OBLIGATION_SOURCES_MISSING', 'خصم دفتر في مسير سابق دون توثيق مصادره', ref))
      }
    } catch (error) { addIssue(creditIssues, error, ref); addIssue(debitIssues, error, ref) }
  }
  for (const row of settlements.rows) {
    const ref = `offboarding_cases:${row.id}`
    try {
      if (!id(row.id) || !['SETTLED', 'CLOSED'].includes(row.status) || !Number.isSafeInteger(row.autoLineCount) || row.autoLineCount < 0) fail('LIVE_SETTLEMENT_INVALID', 'بيانات التصفية القديمة غير صالحة', ref)
      if (row.settlementFinancialSnapshot === null) {
        if (row.autoLineCount && positions.rows.some(position => position.remainingAmount !== '0.00')) fail('LIVE_SETTLEMENT_SOURCES_MISSING', 'تصفية معتمدة ذات بنود آلية دون مصادر مالية مثبتة مع وجود سلف مفتوحة', ref)
        continue
      }
      const snapshot = parsed(row.settlementFinancialSnapshot, ref)
      if (snapshot.version !== 1 || !Array.isArray(snapshot.overtime) || !Array.isArray(snapshot.installments)) fail('LIVE_SETTLEMENT_SNAPSHOT_INVALID', 'مصادر التصفية القديمة غير صالحة', ref)
      const claimed = ids(snapshot.installments.map((entry: any) => entry?.id), ref)
      for (const entry of snapshot.installments) {
        const position = positionById.get(entry.id)
        if (!position || entry.loanId !== position.loanId || !(typeof entry.amount === 'number' && Number.isFinite(entry.amount) && entry.amount >= 0)) fail('LIVE_SETTLEMENT_SNAPSHOT_INVALID', 'قسط التصفية لا يطابق مصدره المثبت', ref)
      }
      if (claimed.length) installmentClaims.push({ sourceRef: ref, kind: 'SETTLEMENT', ownerId: row.id, status: row.status, ids: claimed, rawSnapshot: row.settlementFinancialSnapshot })
    } catch (error) { addIssue(installmentIssues, error, ref) }
  }
  if (installmentClaims.reduce((count, claim) => count + claim.ids.length, 0) > LIMIT) installmentIssues.push(issue('LIVE_LEDGER_ROW_LIMIT', 'مراجع مطالبات الأقساط تتجاوز حد القراءة الكامل', 'loan_installments'))
  if (obligationClaims.reduce((count, claim) => count + claim.ids.length, 0) > LIMIT) {
    const value = issue('LIVE_LEDGER_ROW_LIMIT', 'مراجع مطالبات الدفتر تتجاوز حد القراءة الكامل', 'employee_obligations'); creditIssues.push(value); debitIssues.push(value)
  }
  const installmentState = state(installmentReads, installmentIssues)
  const classifiedPositions: Array<Row & { exclusionReasons: string[] }> = positions.rows.map(position => {
    const claims = installmentClaims.filter(claim => claim.ids.includes(position.id))
    const reasons: string[] = []
    if (position.financialStatus !== 'DUE') reasons.push(`POSITION_${position.financialStatus}`)
    if (position.remainingAmount === '0.00') reasons.push('NO_OPEN_BALANCE')
    if (position.dueDate > periodEnd) reasons.push('FUTURE_DUE')
    for (const claim of claims) reasons.push(`CLAIM_${claim.kind}_${claim.status}`)
    if (installmentState !== 'AVAILABLE') reasons.push('SOURCE_UNVERIFIED')
    return { ...position, sourceRef: `loan_installments:${position.id}`, claimRefs: unique(claims.map(claim => claim.sourceRef)), exclusionReasons: unique(reasons) }
  })
  const eligible = classifiedPositions.filter(row => !row.exclusionReasons.length), excluded = classifiedPositions.filter(row => row.exclusionReasons.length)
  const scheduleTails = [...loanById.keys()].sort((a, b) => a - b).map(loanId => {
    const schedule = positions.rows.filter(row => row.loanId === loanId), open = schedule.filter(row => row.financialStatus === 'DUE' && row.remainingAmount !== '0.00')
    return { loanId, lastScheduledDueDate: schedule.map(row => row.dueDate).sort().slice(-1)[0] ?? null,
      lastOpenDueDate: open.map(row => row.dueDate).sort().slice(-1)[0] ?? null,
      remainingAmount: installmentState !== 'AVAILABLE' ? null : total(open.map(row => row.remainingAmount)), sourceRefs: schedule.map(row => `loan_installments:${row.id}`) }
  })
  const installmentRefs = unique([...loans.rows.map(row => `loans:${row.id}`), ...rawPositions.map(row => `loan_installments:${row.id}`),
    ...allocations.rows.map(row => `loan_installment_allocations:${row.id}`), ...payroll.rows.map(row => `payroll_items:${row.id}`), ...settlements.rows.map(row => `offboarding_cases:${row.id}`)])
  const seenObligations = new Set<number>()
  for (const row of obligations.rows) {
    const ref = `employee_obligations:${row.id}`
    try {
      if (!id(row.id) || row.employeeId !== employeeId || seenObligations.has(row.id) || !['CREDIT', 'DEBIT'].includes(row.type) || row.status !== 'PENDING' ||
        typeof row.category !== 'string' || !row.category.trim() || row.category.length > 40 || typeof row.label !== 'string' || !row.label.trim() || row.label.length > 300 ||
        row.appliedPayrollRunId !== null || row.appliedAt !== null) fail('LIVE_OBLIGATION_INVALID', 'هوية أو حالة بند الدفتر لا تطابق مصدرًا معلقًا صالحًا', ref)
      seenObligations.add(row.id)
      if (money(row.amount, ref).isZero()) fail('LIVE_OBLIGATION_AMOUNT_INVALID', 'بند الدفتر المعلق يجب أن يكون موجبًا', ref)
      if (row.effectiveDate !== null) date(row.effectiveDate, ref)
    } catch (error) {
      if (row.type !== 'DEBIT') addIssue(creditIssues, error, ref)
      if (row.type !== 'CREDIT') addIssue(debitIssues, error, ref)
    }
  }
  function obligationSection(type: 'CREDIT' | 'DEBIT', issues: PayrollLiveSourceIssue[]): PayrollLiveSourceSection {
    const entries = obligations.rows.filter(row => row.type === type)
    const due = entries.filter(row => row.effectiveDate === null || row.effectiveDate <= periodEnd)
    const sectionState = state([obligations, payroll], issues, type === 'DEBIT' && due.length > 0)
    const listed: Array<Row & { exclusionReasons: string[] }> = entries.map(entry => {
      const claims = obligationClaims.filter(claim => claim.ids.includes(entry.id))
      return { ...entry, upstreamSourceRef: entry.sourceRef, sourceRef: `employee_obligations:${entry.id}`, claimRefs: unique(claims.map(claim => claim.sourceRef)),
        exclusionReasons: unique([...claims.map(claim => `CLAIM_PAYROLL_${claim.status}`), ...(entry.effectiveDate !== null && entry.effectiveDate > periodEnd ? ['FUTURE_EFFECTIVE_DATE'] : []),
          ...(type === 'DEBIT' ? ['NON_INSTALLMENT_DEBIT_UNSUPPORTED'] : []), ...(['INVALID', 'MISSING'].includes(sectionState) ? ['SOURCE_UNVERIFIED'] : [])]) }
    })
    return { state: sectionState, issues: type === 'DEBIT' && due.length ? [...issues, issue('LIVE_NON_INSTALLMENT_DEBIT_UNSUPPORTED', 'أرصدة DEBIT العامة معروضة دون تحويلها إلى أقساط أو افتراض سلوك تحصيل لها', 'employee_obligations')] : issues,
      sourceRefs: unique([...entries.map(row => `employee_obligations:${row.id}`), ...obligations.rows.filter(row => !['CREDIT', 'DEBIT'].includes(row.type)).map(row => `employee_obligations:${row.id}`), ...payroll.rows.map(row => `payroll_items:${row.id}`)]),
      data: { periodStart, periodEnd, entries: listed, unclassifiedEntries: obligations.rows.filter(row => !['CREDIT', 'DEBIT'].includes(row.type)),
        eligible: listed.filter(row => !row.exclusionReasons.length), excluded: listed.filter(row => row.exclusionReasons.length), claims: obligationClaims,
        totalPending: issues.length || obligations.missing || payroll.missing ? null : total(entries.map(row => row.amount)),
        totalDueInPeriod: issues.length || obligations.missing || payroll.missing ? null : total(due.map(row => row.amount)),
        totalEligible: sectionState !== 'AVAILABLE' ? null : total(listed.filter(row => !row.exclusionReasons.length).map(row => row.amount)) } }
  }
  return { installments: { state: installmentState, issues: installmentIssues, sourceRefs: installmentRefs,
    data: { periodStart, periodEnd, loans: loans.rows, positions: classifiedPositions, rawPositions: positions.issues.length ? rawPositions : null,
      eligible, excluded, claims: installmentClaims, allocations: allocations.rows, payrollClaims: payroll.rows, settlements: settlements.rows, scheduleTails,
      totals: installmentState !== 'AVAILABLE' ? null : { remainingAmount: total(positions.rows.map(row => row.remainingAmount)), paidAmount: total(positions.rows.map(row => row.paidAmount)),
        eligibleAmount: total(eligible.map(row => row.remainingAmount)), excludedOpenAmount: total(excluded.map(row => row.remainingAmount)) } } },
    credits: obligationSection('CREDIT', creditIssues), otherDebits: obligationSection('DEBIT', debitIssues) }
}
