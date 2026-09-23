import { BadRequestException, ConflictException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { bankSheetSources, buildBankSheet, type BankSheetEmployeeInput, type BankSheetItemInput, type BankSheetMemberInput } from './bank-sheet'
import { PAY_METHOD_LABELS } from './pay-split'
import { payrollItemSettlementPayout } from './payroll-settlement-salary'
import { PayrollItemDisbursement } from './payroll-disbursement.entities'

// صرف المسير موظف بموظف — المنطق الصافي، وخطافا المسير الكبير (إقفال الصرف وإعادة الفتح) بـEntityManager بلا خدمة Nest.
//
// القرار (الأبسط المثبت أمانه): المسير بيبقى PAID بـ«إقفال الصرف» الصريح = نفس pay() القائم، مش تلقائيًا مع آخر علامة.
//   - علامة «تم الصرف» مالهاش أي أثر مالي، فآثار الصرف (قفل الإضافي، ترحيل أقساط السلف، قيود الدفتر، الإعفاءات) بتفضل في
//     انتقال واحد APPROVED→PAID تحت قفل المسير — مرة واحدة بالظبط زي ما هي، ومفيش طريق تاني بيشغّلها.
//   - الصرف التلقائي مع آخر علامة كان هيخلّي ضغطة غلط من موظف المالية تقفل المسير بلا رجعة، وهيشغّل فحوص الصرف التقيلة
//     جوّه علامة بسيطة، وأصلًا مابيغطيش الموظف اللي راتبه موقوف صرفه (المسير عمره ما هيتقفل).
//   - مسير بلا أي علامة: pay() زي ما هو بالحرف (الصرف للمسير كله مرة واحدة). مسير فيه علامات وناقص ناس: لازم سبب مكتوب للباقي.

export const PAYROLL_DISBURSE_PERMISSION = 'payroll.disburse'
export const PAYROLL_DISBURSE_NOTE_MAX = 500
export const PAYROLL_DISBURSE_BULK_MAX = 2000

export type PayrollDisbursementState = 'PAID' | 'UNPAID' | 'SETTLEMENT' | 'NO_AMOUNT'
/** NOT_STARTED: معتمد بلا علامات · PER_EMPLOYEE: فيه علامات · RUN_LEVEL: اتصرف كله مرة واحدة بلا علامات (الكل مصروف ضمنيًا) */
export type PayrollDisbursementMode = 'NOT_STARTED' | 'PER_EMPLOYEE' | 'RUN_LEVEL'
export const PAYROLL_DISBURSEMENT_STATE_LABELS: Record<PayrollDisbursementState, string> = {
  PAID: 'تم الصرف', UNPAID: 'لم يتم', SETTLEMENT: 'مصروف مع التصفية', NO_AMOUNT: 'لا يوجد مبلغ للصرف',
}

export interface PayrollDisbursementRow {
  itemId: number; employeeId: number; employeeCode: string; fullName: string
  branchId: number | null; branchName: string | null; departmentId: number | null; departmentName: string | null; teamId: number | null; teamName: string | null
  payMethod: string; payMethodLabel: string; bankName: string | null; iban: string | null
  netPay: number; bankAmount: number; cashAmount: number; issue: string | null
  state: PayrollDisbursementState; stateLabel: string; tickable: boolean
  markedByUserId: number | null; markedAt: Date | null; note: string | null
  settlement: { caseId: number; lastWorkingDay: string } | null
}
export interface PayrollDisbursementBucket { count: number; total: number; bank: number; cash: number }
export interface PayrollDisbursementFilter {
  branchId?: number | null; departmentId?: number | null; teamId?: number | null
  payMethod?: string | null; state?: PayrollDisbursementState | null; search?: string | null
}

const cents = (value: unknown) => Math.round((Number(value) || 0) * 100)
type MarkLike = Pick<PayrollItemDisbursement, 'itemId' | 'status' | 'amount' | 'bankAmount' | 'cashAmount' | 'payMethod' | 'note' | 'markedByUserId' | 'markedAt'>
interface MemberLike extends BankSheetMemberInput {
  snapshot?: (NonNullable<BankSheetMemberInput['snapshot']> & { departmentId?: number | null; teamId?: number | null
    branchName?: string | null; departmentName?: string | null; teamName?: string | null }) | null
}

export function payrollDisbursementMode(runStatus: string, marks: ReadonlyArray<Pick<MarkLike, 'status'>>): PayrollDisbursementMode {
  if (marks.some(mark => mark.status === 'PAID')) return 'PER_EMPLOYEE'
  return runStatus === 'PAID' ? 'RUN_LEVEL' : 'NOT_STARTED'
}

/** هل التعليم متاح على المسير ده؟ معتمد: تعليم وإلغاء تعليم. مصروف اتقفل وناقص ناس: «تم الصرف» بس للي لسه ماتصرفلوش. */
export const payrollDisbursementOpen = (runStatus: string, mode: PayrollDisbursementMode) =>
  runStatus === 'APPROVED' ? 'OPEN' as const : runStatus === 'PAID' && mode === 'PER_EMPLOYEE' ? 'LATE_ONLY' as const : 'CLOSED' as const

/**
 * صفوف شاشة الصرف: الهوية والمكان من لقطة العضوية (تاريخية)، وطريقة الصرف والتقسيم من نفس دوال كشف البنوك (مصدر واحد)،
 * وصف «تم الصرف» بتقسيمه المثبت وقت العلامة. صف التصفية وصف الصافي صفر مش بيتعلّموا.
 */
export function buildPayrollDisbursementRows(input: {
  runStatus: string
  items: ReadonlyArray<BankSheetItemInput & { id: number }>
  employees: ReadonlyArray<BankSheetEmployeeInput>
  members: ReadonlyArray<MemberLike>
  marks: ReadonlyArray<MarkLike>
  branchScope: number | null
}): { rows: PayrollDisbursementRow[]; mode: PayrollDisbursementMode } {
  const mode = payrollDisbursementMode(input.runStatus, input.marks)
  const open = payrollDisbursementOpen(input.runStatus, mode)
  // نفس مصدر كشف البنوك والتقرير المالي: الصف المصروف بتقسيمه المسجل (العلامة أو لقطة البند في مسير مصروف)، وغيره من ملف الموظف
  const sheet = buildBankSheet(bankSheetSources({ items: input.items, employees: input.employees, members: input.members,
    branchScope: input.branchScope, settlementOf: payrollItemSettlementPayout, runStatus: input.runStatus, marks: input.marks }))
  const itemOf = new Map(input.items.map(item => [item.employeeId, item]))
  const memberOf = new Map(input.members.map(member => [member.employeeId, member]))
  const markOf = new Map(input.marks.map(mark => [mark.itemId, mark]))
  const org = (employeeId: number) => {
    const snapshot = memberOf.get(employeeId)?.snapshot ?? null
    const employee = input.employees.find(row => row.id === employeeId)
    return { branchId: snapshot ? snapshot.branchId ?? null : employee?.branchId ?? null, branchName: snapshot?.branchName ?? null,
      departmentId: snapshot?.departmentId ?? null, departmentName: snapshot?.departmentName ?? null, teamId: snapshot?.teamId ?? null, teamName: snapshot?.teamName ?? null }
  }
  const rows: PayrollDisbursementRow[] = []
  for (const row of sheet.rows) {
    const item = itemOf.get(row.employeeId)!
    const mark = markOf.get(item.id) ?? null
    const paidMark = mark?.status === 'PAID' ? mark : null
    const hasAmount = row.bankAmount + row.cashAmount > 0
    const state: PayrollDisbursementState = paidMark ? 'PAID' : !hasAmount ? 'NO_AMOUNT' : mode === 'RUN_LEVEL' ? 'PAID' : 'UNPAID'
    // صف «تم الصرف» بيعرض اللي اتثبت وقت العلامة، وغيره من ملف الموظف الحالي — والاتنين جايين من صف الكشف نفسه (مصدر واحد)
    const payMethod = row.payMethod
    rows.push({ itemId: item.id, employeeId: row.employeeId, employeeCode: row.employeeCode, fullName: row.fullName, ...org(row.employeeId),
      payMethod, payMethodLabel: PAY_METHOD_LABELS[payMethod] ?? payMethod, bankName: row.bankName, iban: row.iban,
      netPay: paidMark ? Number(paidMark.amount) : row.netPay, bankAmount: row.bankAmount,
      cashAmount: row.cashAmount, issue: state === 'PAID' ? null : row.issue,
      state, stateLabel: PAYROLL_DISBURSEMENT_STATE_LABELS[state],
      tickable: (state === 'PAID' || state === 'UNPAID') && (open === 'OPEN' || (open === 'LATE_ONLY' && state === 'UNPAID')),
      markedByUserId: mark?.markedByUserId ?? null, markedAt: mark?.markedAt ?? null, note: mark?.note ?? null, settlement: null })
  }
  for (const row of sheet.settlement.rows) {
    const item = itemOf.get(row.employeeId)!
    rows.push({ itemId: item.id, employeeId: row.employeeId, employeeCode: row.employeeCode, fullName: row.fullName, ...org(row.employeeId),
      payMethod: 'settlement', payMethodLabel: PAYROLL_DISBURSEMENT_STATE_LABELS.SETTLEMENT, bankName: null, iban: null,
      netPay: row.netPay, bankAmount: 0, cashAmount: 0, issue: null, state: 'SETTLEMENT', stateLabel: PAYROLL_DISBURSEMENT_STATE_LABELS.SETTLEMENT, tickable: false,
      markedByUserId: null, markedAt: null, note: null, settlement: { caseId: row.caseId ?? 0, lastWorkingDay: row.lastWorkingDay ?? '' } })
  }
  rows.sort((a, b) => a.employeeCode.localeCompare(b.employeeCode, 'en') || a.employeeId - b.employeeId)
  return { rows, mode }
}

const normalized = (text: string) => text.trim().toLocaleLowerCase()

/** كل الفلاتر مع بعض (AND): الفرع والقسم والفريق من لقطة المسير، وطريقة الصرف، والحالة، والبحث بالاسم أو الكود. */
export function filterPayrollDisbursementRows(rows: readonly PayrollDisbursementRow[], filter: PayrollDisbursementFilter): PayrollDisbursementRow[] {
  const search = filter.search ? normalized(filter.search) : ''
  return rows.filter(row => (filter.branchId == null || row.branchId === filter.branchId)
    && (filter.departmentId == null || row.departmentId === filter.departmentId)
    && (filter.teamId == null || row.teamId === filter.teamId)
    && (!filter.payMethod || row.payMethod === filter.payMethod)
    && (!filter.state || row.state === filter.state)
    && (!search || normalized(row.fullName).includes(search) || normalized(row.employeeCode).includes(search)))
}

const emptyBucket = () => ({ count: 0, totalCents: 0, bankCents: 0, cashCents: 0 })
const bucketOf = (raw: ReturnType<typeof emptyBucket>): PayrollDisbursementBucket =>
  ({ count: raw.count, total: raw.totalCents / 100, bank: raw.bankCents / 100, cash: raw.cashCents / 100 })

/** الإجماليات بالقروش: تم / لم يتم (وكل واحد بنك ونقدي)، والمستحق للصرف = تم + لم يتم، وصف التصفية والصافي صفر برّه. */
export function summarizePayrollDisbursement(rows: readonly PayrollDisbursementRow[]) {
  const paid = emptyBucket(), unpaid = emptyBucket()
  let settlementCount = 0, settlementCents = 0, noAmount = 0, issues = 0
  for (const row of rows) {
    if (row.state === 'SETTLEMENT') { settlementCount++; settlementCents += cents(row.netPay); continue }
    if (row.state === 'NO_AMOUNT') { noAmount++; continue }
    const bucket = row.state === 'PAID' ? paid : unpaid
    bucket.count++; bucket.bankCents += cents(row.bankAmount); bucket.cashCents += cents(row.cashAmount)
    bucket.totalCents += cents(row.bankAmount) + cents(row.cashAmount)
    if (row.issue) issues++
  }
  const payable = { count: paid.count + unpaid.count, totalCents: paid.totalCents + unpaid.totalCents,
    bankCents: paid.bankCents + unpaid.bankCents, cashCents: paid.cashCents + unpaid.cashCents }
  return { paid: bucketOf(paid), unpaid: bucketOf(unpaid), payable: bucketOf(payable),
    settlement: { count: settlementCount, total: settlementCents / 100 }, noAmount, issues }
}

export function payrollDisbursementNote(value: unknown): string | null {
  if (value == null || value === '') return null
  if (typeof value !== 'string' || value.trim().length > PAYROLL_DISBURSE_NOTE_MAX) {
    throw new BadRequestException({ code: 'PAYRUN-DISBURSE-NOTE', message: `ملاحظة الصرف نص بحد أقصى ${PAYROLL_DISBURSE_NOTE_MAX} حرف` })
  }
  return value.trim() || null
}

// ===== خطافا المسير الكبير =====

export interface PayrollDisbursementClose {
  mode: 'RUN_LEVEL' | 'PER_EMPLOYEE'
  paidCount: number; paidTotal: number; unpaidCount: number; unpaidTotal: number
  unpaidEmployeeIds: number[]; unpaidReason: string | null
}

/**
 * «إقفال الصرف» داخل pay() وتحت قفل المسير وقبل أي أثر مالي:
 * - مسير بلا علامة «تم الصرف» ← الصرف للمسير كله مرة واحدة (السلوك القديم بالحرف، بلا سبب).
 * - مسير فيه علامات والكل اتعلّم ← إقفال عادي.
 * - مسير فيه علامات وناقص ناس ← سبب مكتوب إلزامي، وبيتكتب على صف كل واحد ناقص «لم يتم» فيفضل ظاهر لحد ما يتصرفله.
 */
export async function closePayrollRunDisbursement(em: EntityManager, run: { id: number }, items: ReadonlyArray<{ id: number; employeeId: number; netPay: unknown; breakdown?: string | null }>,
  actorUserId: number, unpaidReasonInput: unknown): Promise<PayrollDisbursementClose> {
  const repo = em.getRepository(PayrollItemDisbursement)
  const marks = await repo.find({ where: { runId: run.id } })
  const paidMarks = marks.filter(mark => mark.status === 'PAID')
  const payable = items.filter(item => !payrollItemSettlementPayout(item.breakdown) && cents(item.netPay) > 0)
  if (!paidMarks.length) {
    return { mode: 'RUN_LEVEL', paidCount: payable.length, paidTotal: payable.reduce((sum, item) => sum + cents(item.netPay), 0) / 100,
      unpaidCount: 0, unpaidTotal: 0, unpaidEmployeeIds: [], unpaidReason: null }
  }
  const paidIds = new Set(paidMarks.map(mark => mark.itemId))
  // علامة على بند مش في المسير الحالي مستحيلة تحت القفل (إعادة الفتح بترفض لو فيه علامات)؛ لو حصلت نوقف بدل ما نقفل على بيانات مش متطابقة
  if (paidMarks.some(mark => !items.some(item => item.id === mark.itemId))) {
    throw new ConflictException({ code: 'PAYRUN-DISBURSE-MISMATCH', message: 'علامات الصرف لا تطابق بنود المسير الحالية؛ راجع شاشة الصرف قبل الإقفال' })
  }
  const leftover = payable.filter(item => !paidIds.has(item.id))
  const unpaidTotal = leftover.reduce((sum, item) => sum + cents(item.netPay), 0) / 100
  const paidTotal = paidMarks.reduce((sum, mark) => sum + cents(mark.amount), 0) / 100
  if (!leftover.length) return { mode: 'PER_EMPLOYEE', paidCount: paidMarks.length, paidTotal, unpaidCount: 0, unpaidTotal: 0, unpaidEmployeeIds: [], unpaidReason: null }
  const reason = typeof unpaidReasonInput === 'string' ? unpaidReasonInput.trim() : ''
  if (reason.length < 3 || reason.length > PAYROLL_DISBURSE_NOTE_MAX) {
    throw new BadRequestException({ code: 'PAYRUN-DISBURSE-UNPAID-REASON', unpaidCount: leftover.length, unpaidTotal,
      message: `فيه ${leftover.length} موظف لسه متعلّمش «تم الصرف» — اقفل الصرف من شاشة «صرف الرواتب» بسبب مكتوب للباقيين (من 3 إلى ${PAYROLL_DISBURSE_NOTE_MAX} حرف)، أو علّمهم الأول` })
  }
  const now = new Date()
  for (const item of leftover) {
    const existing = marks.find(mark => mark.itemId === item.id)
    await repo.save({ ...(existing ?? {}), runId: run.id, itemId: item.id, employeeId: item.employeeId, status: 'UNPAID' as const,
      amount: Number(item.netPay) || 0, bankAmount: 0, cashAmount: 0, payMethod: null, note: `أُقفل الصرف بدونه: ${reason}`.slice(0, PAYROLL_DISBURSE_NOTE_MAX),
      markedByUserId: actorUserId, markedAt: now })
  }
  return { mode: 'PER_EMPLOYEE', paidCount: paidMarks.length, paidTotal, unpaidCount: leftover.length, unpaidTotal,
    unpaidEmployeeIds: leftover.map(item => item.employeeId), unpaidReason: reason }
}

/** إعادة فتح مسير معتمد اتعلّم فيه صرف لموظفين بتضيّع العلامات (إعادة الحساب بتعيد إنشاء البنود)؛ الغِ العلامات الأول. */
export async function assertPayrollRunNotDisbursed(em: EntityManager, runId: number) {
  const paid = await em.getRepository(PayrollItemDisbursement).count({ where: { runId, status: 'PAID' } })
  if (!paid) return
  throw new ConflictException({ code: 'PAYRUN-DISBURSE-STARTED', paidCount: paid,
    message: `اتعلّم «تم الصرف» لـ${paid} موظف في المسير ده؛ الغِ علامات الصرف من شاشة «صرف الرواتب» الأول قبل إعادة فتحه` })
}
