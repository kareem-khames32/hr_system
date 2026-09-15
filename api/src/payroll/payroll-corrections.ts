import { createHash } from 'node:crypto'

// C8 / الخطوة 31: منطق نقي لمسار تصحيح المسير المصروف — أنواع المسير، سبب التصحيح، لقطة البند المعكوس وبصمتها، وتقرير التسويات لكل سلسلة.
// لا قاعدة بيانات هنا؛ الدفاتر في payroll-reversal-ledger.ts والنقاط الطرفية في payroll-corrections.service.ts.

export const PAYROLL_RUN_TYPES = ['REGULAR', 'REVERSAL', 'SUPPLEMENTARY'] as const
export type PayrollRunType = typeof PAYROLL_RUN_TYPES[number]
export const PAYROLL_RUN_TYPE_LABELS: Record<PayrollRunType, string> = { REGULAR: 'مسير أصلي', REVERSAL: 'مسير عكس صرف', SUPPLEMENTARY: 'مسير تكميلي' }
export const PAYROLL_REVERSAL_LINE_STATUS_LABELS: Record<string, string> = { PENDING: 'بانتظار تنفيذ العكس', POSTED: 'نُفّذ العكس', CANCELLED: 'أُلغي العكس' }

/** نوع المسير المحفوظ؛ null للمسيرات السابقة لهذا المسار = أصلي. */
export function payrollRunTypeOf(run: { runType?: string | null } | null | undefined): PayrollRunType {
  const value = run?.runType
  return value === 'REVERSAL' || value === 'SUPPLEMENTARY' ? value : 'REGULAR'
}

export const PAYROLL_CORRECTION_REASON = Object.freeze({ min: 20, max: 1000 })

/** سبب العكس أو المسير التكميلي: نص مكتوب من 20 إلى 1000 حرف بثلاث كلمات مختلفة على الأقل (لا تكرار كلمة واحدة). */
export function payrollCorrectionReasonIssue(reason: unknown): { code: string; message: string } | null {
  const text = typeof reason === 'string' ? reason.trim() : ''
  if (text.length < PAYROLL_CORRECTION_REASON.min || text.length > PAYROLL_CORRECTION_REASON.max) {
    return { code: 'PAYRUN-CORRECTION-REASON', message: `اكتب سبب تصحيح المسير المصروف (من ${PAYROLL_CORRECTION_REASON.min} إلى ${PAYROLL_CORRECTION_REASON.max} حرف): ما الخطأ ومن اكتشفه ومرجعه` }
  }
  if (new Set(text.split(/\s+/).filter(Boolean)).size < 3) {
    return { code: 'PAYRUN-CORRECTION-REASON', message: 'سبب التصحيح يجب أن يصف الخطأ بثلاث كلمات مختلفة على الأقل' }
  }
  return null
}

export const PAYROLL_REVERSAL_ITEM_FIELDS = ['basicSalary', 'allowances', 'overtimeHours', 'overtimeAmount', 'lateMinutes', 'latenessDeduction', 'shortfallMinutes',
  'shortfallDeduction', 'absenceDays', 'absenceDeduction', 'unpaidLeaveDays', 'unpaidLeaveDeduction', 'loanInstallments', 'otherDeductions', 'otherAdditions', 'netPay'] as const
export type PayrollReversalItemField = typeof PAYROLL_REVERSAL_ITEM_FIELDS[number]

const decimalText = (value: unknown) => {
  const number = Number(value ?? 0)
  if (!Number.isFinite(number)) throw new Error('Invalid payroll item amount')
  return number.toFixed(2)
}

/** لقطة مبالغ البند الأصلي (نصوص بخانتين) وبصمة تشمل البند والموظف وطريقة الصرف والتفصيل المحفوظ. */
export function payrollReversalItemSnapshot(item: { id: number; runId: number; employeeId: number; payMethod?: string | null; breakdown?: string | null } & Partial<Record<PayrollReversalItemField, unknown>>) {
  const amounts = Object.fromEntries(PAYROLL_REVERSAL_ITEM_FIELDS.map(field => [field, decimalText(item[field])])) as Record<PayrollReversalItemField, string>
  const snapshot = { itemId: item.id, runId: item.runId, employeeId: item.employeeId, payMethod: item.payMethod ?? null, amounts }
  const hash = createHash('sha256').update(JSON.stringify({ ...snapshot, breakdown: item.breakdown ?? null })).digest('hex')
  return { snapshot, hash }
}

const cents = (value: unknown) => Math.round(Number(value ?? 0) * 100)
const money = (value: number) => (value / 100).toFixed(2)

export interface CorrectionRunLite { id: number; name: string | null; period: string; status: string; runType?: string | null; parentRunId?: number | null
  totalNet?: number | string | null; correctionReason?: string | null; paidAt?: Date | string | null; approvedAt?: Date | string | null; createdAt?: Date | string | null }
export interface CorrectionItemLite { id: number; runId: number; employeeId: number; netPay: number | string }
export interface CorrectionLineLite { id: number; reversalRunId: number; originalRunId: number; originalItemId: number; employeeId: number; status: string; netPay: number | string }

/** كل مسيرات السلسلة من المسير الأصلي: الأبناء المباشرون وأبناؤهم (عكس أو تكميلي)، بترتيب المعرّف. */
export function payrollCorrectionChain(rootId: number, runs: CorrectionRunLite[]): CorrectionRunLite[] {
  const ids = new Set([rootId])
  for (let grew = true; grew;) {
    grew = false
    for (const run of runs) if (run.parentRunId != null && ids.has(run.parentRunId) && !ids.has(run.id)) { ids.add(run.id); grew = true }
  }
  return runs.filter(run => ids.has(run.id)).sort((a, b) => a.id - b.id)
}

/**
 * تقرير التسويات لسلسلة مسير (SRS PR-06 قاعدة 4): لكل موظف صافي المصروف في الأصلي والتكميلي، والمعكوس المنفذ والمعلق، والتكميلي الجاري،
 * والصافي الفعلي بعد التصحيح (المصروف − المعكوس المنفذ)، وفرق التسوية المالية (التكميلي المصروف − المعكوس المنفذ): موجب = يُحوَّل للموظف، سالب = يُسترد منه.
 */
export function summarizePayrollCorrections(rootId: number, allRuns: CorrectionRunLite[], items: CorrectionItemLite[], lines: CorrectionLineLite[]) {
  const chain = payrollCorrectionChain(rootId, allRuns)
  const byId = new Map(chain.map(run => [run.id, run]))
  const rows = new Map<number, { employeeId: number; paidCents: number; originalCents: number; supplementaryPaidCents: number; supplementaryOpenCents: number
    reversedCents: number; pendingReversalCents: number; entries: Array<{ runId: number; runType: PayrollRunType; status: string; netPay: string; itemId: number | null; lineId: number | null; lineStatus: string | null }> }>()
  const row = (employeeId: number) => {
    if (!rows.has(employeeId)) rows.set(employeeId, { employeeId, paidCents: 0, originalCents: 0, supplementaryPaidCents: 0, supplementaryOpenCents: 0, reversedCents: 0, pendingReversalCents: 0, entries: [] })
    return rows.get(employeeId)!
  }
  for (const item of items) {
    const run = byId.get(item.runId)
    if (!run || run.status === 'CANCELLED' || run.status === 'DRAFT' || payrollRunTypeOf(run) === 'REVERSAL') continue
    const target = row(item.employeeId), amount = cents(item.netPay), type = payrollRunTypeOf(run)
    if (run.status === 'PAID') {
      target.paidCents += amount
      if (type === 'SUPPLEMENTARY') target.supplementaryPaidCents += amount
      else target.originalCents += amount
    } else if (type === 'SUPPLEMENTARY') target.supplementaryOpenCents += amount
    target.entries.push({ runId: run.id, runType: type, status: run.status, netPay: money(amount), itemId: item.id, lineId: null, lineStatus: null })
  }
  for (const line of lines) {
    const run = byId.get(line.reversalRunId)
    if (!run || line.status === 'CANCELLED') continue
    const target = row(line.employeeId), amount = cents(line.netPay)
    if (line.status === 'POSTED') target.reversedCents += amount
    else target.pendingReversalCents += amount
    target.entries.push({ runId: run.id, runType: 'REVERSAL', status: run.status, netPay: money(-amount), itemId: null, lineId: line.id, lineStatus: line.status })
  }
  const employees = [...rows.values()].sort((a, b) => a.employeeId - b.employeeId).map(entry => ({
    employeeId: entry.employeeId, originalNet: money(entry.originalCents), supplementaryPaidNet: money(entry.supplementaryPaidCents), supplementaryOpenNet: money(entry.supplementaryOpenCents),
    reversedNet: money(entry.reversedCents), pendingReversalNet: money(entry.pendingReversalCents),
    effectiveNet: money(entry.paidCents - entry.reversedCents), settlementDifference: money(entry.supplementaryPaidCents - entry.reversedCents),
    entries: entry.entries.sort((a, b) => a.runId - b.runId || (a.lineId ?? 0) - (b.lineId ?? 0)),
  }))
  const sum = (key: 'originalNet' | 'supplementaryPaidNet' | 'supplementaryOpenNet' | 'reversedNet' | 'pendingReversalNet' | 'effectiveNet' | 'settlementDifference') =>
    money(employees.reduce((total, entry) => total + cents(entry[key]), 0))
  return {
    rootRunId: rootId,
    runs: chain.map(run => ({ id: run.id, name: run.name, period: run.period, status: run.status, runType: payrollRunTypeOf(run), runTypeLabel: PAYROLL_RUN_TYPE_LABELS[payrollRunTypeOf(run)],
      parentRunId: run.parentRunId ?? null, totalNet: money(cents(run.totalNet)), correctionReason: run.correctionReason ?? null, paidAt: run.paidAt ?? null, createdAt: run.createdAt ?? null })),
    employees,
    totals: { employees: employees.length, originalNet: sum('originalNet'), supplementaryPaidNet: sum('supplementaryPaidNet'), supplementaryOpenNet: sum('supplementaryOpenNet'),
      reversedNet: sum('reversedNet'), pendingReversalNet: sum('pendingReversalNet'), effectiveNet: sum('effectiveNet'), settlementDifference: sum('settlementDifference') },
  }
}
