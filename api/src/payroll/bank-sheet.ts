import type { BranchScope } from '../auth/guards'
import { PAY_METHOD_LABELS, PAY_METHODS, payrollPaySplit } from './pay-split'
import { disbursementMarksByItem, recordedDisbursement, type DisbursementMarkInput, type RecordedDisbursement } from './payroll-disbursement-split'
import { roundPayrollMoney } from './payroll-money'

// كشف البنوك لمسير (قرار المالك): لكل موظف الكود والاسم والبنك والآيبان ومبلغ البنك والنقدي، وإجمالي كل بنك.
export const NO_BANK_LABEL = 'بدون بنك محدد'

export interface BankSheetSource {
  employeeId: number
  employeeCode: string
  fullName: string
  payMethod: string | null
  bankTransferAmount: unknown
  bankName: string | null
  iban: string | null
  netPay: unknown
  /** قرار المالك (20 سبتمبر): راتب آخر شهر بيتصرف مع التصفية — برّه كشف البنك تمامًا، ومبلغه بيتقال للعلم فقط. */
  settlementPayout?: { caseId: number; lastWorkingDay: string; label: string } | null
  /**
   * الصرف المسجل للبند لو حصل (payroll-disbursement-split.ts): طريقة الصرف المثبتة وتقسيمها وقت العلامة.
   * موجود ⇒ الصف بيعرض اللي اتصرف فعلًا لا ملف الموظف الحالي. غير موجود ⇒ الملف الحالي زي ما هو.
   */
  recorded?: RecordedDisbursement | null
}

export interface BankSheetRow {
  employeeId: number; employeeCode: string; fullName: string; payMethod: string; payMethodLabel: string
  bankName: string | null; iban: string | null; netPay: number; bankAmount: number; cashAmount: number
  /** سبب إن الصف ده مش جاهز يتصرف زي ما ملف الموظف بيقول، أو null لو سليم. */
  issue: string | null
}

const cents = (value: number) => Math.round(value * 100)

// الآيبان السعودي SA وبعده 22 رقم، والمصري EG وبعده 27 — نفس قاعدة آيبان بنك الرواتب في ملف الشركة
// (settings/company-profile.ts). المسافات والشُرط بتتشال قبل الفحص لأن الناس بتكتبها بيها.
const PAYOUT_IBAN = /^(SA\d{22}|EG\d{27})$/
const normalizedIban = (value: string | null | undefined) => String(value ?? '').replace(/[\s-]/g, '').toUpperCase()

/**
 * سبب إن الصف مش جاهز للصرف بالطريقة المكتوبة في ملف الموظف، أو null لو سليم. الترتيب مقصود:
 * أول سبب بس هو اللي يظهر عشان الرسالة تبقى فعل واحد واضح.
 * ملحوظة: نقص البنك أو الآيبان بيتقال لما فيه مبلغ بنكي فعلي — صافي صفر مش بيتصرف فمش محتاج تصحيح الشهر ده.
 */
export function bankSheetRowIssue(row: {
  payMethod: string; bankTransferAmount?: unknown; bankName?: string | null; iban?: string | null; bankAmount: number
}): string | null {
  if (!(PAY_METHODS as readonly string[]).includes(row.payMethod)) {
    return `طريقة صرف غير معروفة «${row.payMethod}» — صحّح طريقة الصرف في ملف الموظف`
  }
  if (row.payMethod === 'mixed' && !(Number(row.bankTransferAmount) > 0)) {
    return '«نقدي + بنك» بدون مبلغ تحويل بنكي — الصافي كله بيتصرف نقدي؛ اكتب مبلغ البنك في ملف الموظف'
  }
  if (row.bankAmount <= 0) return null
  if (!row.bankName?.trim()) return 'مبلغ بنكي بدون اسم بنك — اكتب البنك في ملف الموظف'
  if (!row.iban?.trim()) return 'مبلغ بنكي بدون آيبان — اكتب الآيبان في ملف الموظف'
  if (!PAYOUT_IBAN.test(normalizedIban(row.iban))) {
    return 'الآيبان مش بالشكل الصحيح — SA وبعده 22 رقم أو EG وبعده 27 رقم'
  }
  return null
}

export interface BankSheetItemInput {
  id?: number; employeeId: number; netPay: unknown; payMethod?: string | null; breakdown?: string | null
  /** اللي اتثبت على البند وقت الصرف (ترحيل 067) — يغلب ملف الموظف الحالي في المسير المصروف */
  paidPayMethod?: string | null; paidBankAmount?: unknown; paidCashAmount?: unknown
}
export interface BankSheetEmployeeInput {
  id: number; employeeCode?: string | null; fullName?: string | null; branchId?: number | null
  payMethod?: string | null; bankTransferAmount?: unknown; bankName?: string | null; iban?: string | null
}
export interface BankSheetMemberInput {
  employeeId: number
  snapshot?: { employeeCode?: string | null; fullName?: string | null; branchId?: number | null } | null
}

/**
 * مصادر كشف البنوك من بنود المسير: الهوية من لقطة العضوية (تاريخية)، وبيانات الصرف من ملف الموظف الحالي
 * (طريقة الصرف ومبلغ البنك والآيبان قرار صرف حالي لا لقطة). دالة صافية يستخدمها الكشف وتقرير طرق الصرف معًا.
 *
 * الاستثناء الواحد: بند اتصرف فعلًا (علامة «تم الصرف» أو مسير مصروف بلا علامات) بياخد تقسيمه المسجل —
 * `runStatus` و`marks` هما مصدره؛ من غيرهم الدالة زي ما هي بالحرف (ملف الموظف الحالي).
 */
export function bankSheetSources(input: {
  items: ReadonlyArray<BankSheetItemInput>
  employees: ReadonlyArray<BankSheetEmployeeInput>
  members: ReadonlyArray<BankSheetMemberInput>
  /** نطاق فروع المشاهد (branchScopeOf): null = كل الفروع، مصفوفة = الفروع دي بس (الفاضية = ولا فرع) */
  branchScope: BranchScope
  settlementOf: (breakdown: string | null | undefined) => BankSheetSource['settlementPayout']
  /** حالة المسير — PAID معناها الفلوس اتحركت خلاص */
  runStatus?: string | null
  /** علامات صرف البنود (payroll_item_disbursements) */
  marks?: ReadonlyArray<DisbursementMarkInput & { itemId?: unknown }> | null
}): BankSheetSource[] {
  const byId = new Map(input.employees.map(employee => [employee.id, employee]))
  const members = new Map(input.members.map(member => [member.employeeId, member]))
  const markOf = disbursementMarksByItem(input.marks)
  const sources: BankSheetSource[] = []
  for (const item of input.items) {
    const employee = byId.get(item.employeeId)
    const snapshot = members.get(item.employeeId)?.snapshot
    const branchId = snapshot ? snapshot.branchId : employee?.branchId ?? null
    if (input.branchScope !== null && (branchId == null || !input.branchScope.includes(Number(branchId)))) continue
    sources.push({
      employeeId: item.employeeId,
      employeeCode: snapshot?.employeeCode ?? employee?.employeeCode ?? '',
      fullName: snapshot?.fullName ?? employee?.fullName ?? '',
      payMethod: employee?.payMethod ?? item.payMethod ?? null,
      bankTransferAmount: employee?.bankTransferAmount ?? null,
      bankName: employee?.bankName ?? null,
      iban: employee?.iban ?? null,
      netPay: item.netPay,
      // قرار المالك (20 سبتمبر): راتب شهر آخر يوم عمل بيتصرف مع التصفية — خارج كشف البنك والمبلغ المستحق.
      settlementPayout: input.settlementOf(item.breakdown),
      recorded: recordedDisbursement({ runStatus: input.runStatus, itemPayMethod: item.payMethod,
        itemPaid: { payMethod: item.paidPayMethod ?? null, bankAmount: item.paidBankAmount, cashAmount: item.paidCashAmount },
        mark: item.id == null ? null : markOf.get(item.id) ?? null }),
    })
  }
  return sources
}

export function buildBankSheet(allSources: BankSheetSource[]) {
  // صفوف التصفية مش في الكشف ولا في مبلغ الصرف؛ بتتذكر في «مصروف مع التصفية» عشان حد ما يفتكرش إنها اتنسيت.
  const settlement = allSources.filter(source => source.settlementPayout)
  const sources = allSources.filter(source => !source.settlementPayout)
  const rows: BankSheetRow[] = sources.map(source => {
    // اللي اتصرف فعلًا أولًا: طريقة الصرف المسجلة وتقسيمها المثبت؛ غير المصروف من ملف الموظف الحالي زي ما هو
    const payMethod = source.recorded?.payMethod ?? source.payMethod ?? 'transfer'
    const split = source.recorded?.amounts ?? payrollPaySplit(source.netPay, payMethod, source.bankTransferAmount)
    const bankName = source.bankName?.trim() || null, iban = source.iban?.trim() || null
    return { employeeId: source.employeeId, employeeCode: source.employeeCode, fullName: source.fullName, payMethod,
      payMethodLabel: PAY_METHOD_LABELS[payMethod] ?? payMethod, bankName, iban,
      netPay: roundPayrollMoney(Number(source.netPay) || 0), bankAmount: split.bank, cashAmount: split.cash,
      // مبلغ اتصرف بالفعل بتقسيمه المثبت: بيانات الملف مش تنبيه دلوقتي (الفلوس اتحركت خلاص)
      issue: source.recorded?.amounts ? null
        : bankSheetRowIssue({ payMethod, bankTransferAmount: source.bankTransferAmount, bankName, iban, bankAmount: split.bank }) }
  })
  rows.sort((a, b) => (a.bankAmount > 0 ? 0 : 1) - (b.bankAmount > 0 ? 0 : 1)
    || (a.bankName ?? NO_BANK_LABEL).localeCompare(b.bankName ?? NO_BANK_LABEL, 'ar') || a.employeeCode.localeCompare(b.employeeCode, 'en'))
  const banks = new Map<string, { bankName: string; employees: number; totalCents: number }>()
  let bankCents = 0, cashCents = 0, issueBankCents = 0, issueCashCents = 0
  for (const row of rows) {
    bankCents += cents(row.bankAmount); cashCents += cents(row.cashAmount)
    if (row.issue) { issueBankCents += cents(row.bankAmount); issueCashCents += cents(row.cashAmount) }
    if (row.bankAmount <= 0) continue
    const name = row.bankName ?? NO_BANK_LABEL
    const bank = banks.get(name) ?? { bankName: name, employees: 0, totalCents: 0 }
    bank.employees++; bank.totalCents += cents(row.bankAmount)
    banks.set(name, bank)
  }
  const settlementCents = settlement.reduce((sum, source) => sum + cents(roundPayrollMoney(Number(source.netPay) || 0)), 0)
  const issueRows = rows.filter(row => row.issue)
  return {
    rows,
    banks: [...banks.values()].map(bank => ({ bankName: bank.bankName, employees: bank.employees, total: bank.totalCents / 100 })),
    totals: { employees: rows.length, bank: bankCents / 100, cash: cashCents / 100, net: (bankCents + cashCents) / 100 },
    // بيانات صرف ناقصة أو غلط: الصف موجود في الكشف بمبلغه (محدش بيتشال من غير قرار)، بس بيتقال صراحةً قبل ما الفلوس تتحرك.
    issues: { employees: issueRows.length, bank: issueBankCents / 100, cash: issueCashCents / 100, rows: issueRows },
    settlement: { employees: settlement.length, total: settlementCents / 100,
      rows: settlement.map(source => ({ employeeId: source.employeeId, employeeCode: source.employeeCode, fullName: source.fullName,
        netPay: roundPayrollMoney(Number(source.netPay) || 0), lastWorkingDay: source.settlementPayout?.lastWorkingDay ?? null,
        caseId: source.settlementPayout?.caseId ?? null })) },
  }
}

/**
 * ملخص طرق الصرف من نفس صفوف كشف البنوك: لكل طريقة عدد الموظفين وصافيهم، ومنه كام بنك وكام نقدي.
 * مصدر واحد للرقمين عشان «تقرير طرق الصرف» و«كشف البنوك» ما يقولوش كلام مختلف عن نفس المسير.
 * `total` هو الصافي كما هو في البند (حتى لو سالب) عشان يطابق إجمالي المسير، و`bank + cash` هو المصروف فعلًا
 * (السالب لا يُصرف ⇒ صفر وصفر). يعني الصافي السالب هو الحالة الوحيدة اللي فيها bank + cash ≠ total،
 * وهي ممنوعة عند الاعتماد والصرف أصلًا (`payroll.service.ts` فحص الصافي السالب).
 */
export function bankSheetPayMethodSummary(rows: ReadonlyArray<Pick<BankSheetRow, 'payMethod' | 'payMethodLabel' | 'netPay' | 'bankAmount' | 'cashAmount'>>) {
  const byMethod: Record<string, { label: string; count: number; total: number; bank: number; cash: number }> = {}
  const raw: Record<string, { label: string; count: number; totalCents: number; bankCents: number; cashCents: number }> = {}
  for (const row of rows) {
    const bucket = raw[row.payMethod] ?? { label: row.payMethodLabel, count: 0, totalCents: 0, bankCents: 0, cashCents: 0 }
    bucket.count++
    bucket.totalCents += cents(row.netPay)
    bucket.bankCents += cents(row.bankAmount)
    bucket.cashCents += cents(row.cashAmount)
    raw[row.payMethod] = bucket
  }
  for (const [method, bucket] of Object.entries(raw)) {
    byMethod[method] = { label: bucket.label, count: bucket.count, total: bucket.totalCents / 100,
      bank: bucket.bankCents / 100, cash: bucket.cashCents / 100 }
  }
  return byMethod
}
