// التقارير المالية لشهر رواتب (قراءة فقط): كشف الرواتب، ملخص تكلفة الرواتب بالفرع والقسم، الخصومات بالنوع والموظف، الإضافي، والسلف.
// المصدر بنود المسيرات المحفوظة (payroll_items) وتفصيلها وقت الحساب — لا إعادة حساب. الفلوس بقروش صحيحة BigInt وأي منزلة زيادة تُقص (بلا تقريب).
// كل تفصيل (البدلات، الإضافات، سطور الإجازة، الخصومات) يُقفل على عمود البند نفسه: الباقي غير المفصل يظهر سطرًا صريحًا، فمجموع الأعمدة = الإجمالي دائمًا.
import { HOLIDAY_WORK_SOURCE_PREFIX } from '../attendance/holiday-work'
import { MONTHLY_SALARY_COMPONENTS, PAID_SALARY_COMPONENTS } from '../employees/compensation'
import { buildBankSheet } from '../payroll/bank-sheet'
import { recordedDisbursement } from '../payroll/payroll-disbursement-split'
import { payrollItemSettlementPayout } from '../payroll/payroll-settlement-salary'
import { costCenterCents as cents, costCenterMoney as money } from './cost-center-report'

export { cents as financialCents, money as financialMoney }

// ===== التسميات =====
export const FR_UNSPLIT_ALLOWANCE = 'UNSPLIT'
// أعمدة البدلات: الخمسة + «بدل ضغط العمل» (مصروف جوه عمود البدلات بسطره في مكونات الراتب المحفوظة)
export const FR_ALLOWANCE_BUCKETS: ReadonlyArray<{ key: string; label: string }> = [
  ...PAID_SALARY_COMPONENTS.slice(1).map(component => ({ key: component.code as string, label: component.nameAr as string })),
  { key: FR_UNSPLIT_ALLOWANCE, label: 'بدلات غير مفصلة' },
]

// إضافات لمرة واحدة من دفتر المديونيات (قيود دائنة) بتصنيفها
export const FR_OTHER_ADDITION = 'OTHER'
export const FR_ADDITION_LABELS: Record<string, string> = {
  allowance: 'بدلات إضافية', bonus: 'مكافآت', expense: 'مصروفات مستردة', adjustment: 'تسويات', deduction_reversal: 'إلغاء خصومات',
  manual: 'بنود يدوية', [FR_OTHER_ADDITION]: 'إضافات أخرى',
}
const ADDITION_ORDER = ['allowance', 'bonus', 'expense', 'adjustment', 'deduction_reversal', 'manual']
// «بدل دوام أيام العطلات» بيتصرف قيد «بدل» دائن مصدره holiday_work:… (attendance/holiday-work.ts) — يظهر في عموده الخاص مش مع البدلات الإضافية
export const isHolidayWorkObligation = (info: Pick<FinancialObligationInfo, 'sourceRef'> | null | undefined) =>
  typeof info?.sourceRef === 'string' && info.sourceRef.startsWith(HOLIDAY_WORK_SOURCE_PREFIX)

export const FR_DEDUCTION_KINDS = [
  { key: 'LATENESS', label: 'التأخير' },
  { key: 'SHORTFALL', label: 'نقص ساعات العمل' },
  { key: 'ABSENCE', label: 'الغياب' },
  { key: 'UNPAID_LEAVE', label: 'إجازة بدون راتب' },
  { key: 'SUSPENSION', label: 'أيام الإيقاف عن العمل' },
  { key: 'SICK_CUT', label: 'خصم الإجازة المرضية' },
  { key: 'LOANS', label: 'أقساط السلف' },
  { key: 'TYPED', label: 'الخصومات والجزاءات' },
  { key: 'OTHER_DEBITS', label: 'خصومات أخرى (عهدة/غرامة/تسوية)' },
  { key: 'SOCIAL_INSURANCE', label: 'التأمينات (حصة الموظف)' },
] as const
export type FrDeductionKind = typeof FR_DEDUCTION_KINDS[number]['key']
const DEDUCTION_KEYS = FR_DEDUCTION_KINDS.map(kind => kind.key) as FrDeductionKind[]

export const FR_OTHER_DEBIT_LABELS: Record<string, string> = {
  custody_shortfall: 'عجز عهدة', fine: 'غرامة', adjustment: 'تسوية', manual: 'بند يدوي', bonus_reversal: 'استرداد مكافأة', OTHER: 'خصومات غير مفصلة',
}
export const FR_NO_BRANCH = 'بدون فرع'
export const FR_NO_DEPARTMENT = 'بدون قسم'
export const FR_UNNAMED_TYPED = 'خصم بدون نوع'

// ===== المدخلات =====
type MoneyInput = string | number | null | undefined
type IdInput = number | string | null | undefined

/** صف بند مسير كما يرجع من الاستعلام: الفرع والقسم ومركز التكلفة من لقطة المسير، وأجزاء التفصيل نصوص JSON. */
export interface FinancialItemSource {
  runId: IdInput; runName: string | null; runStatus: string; runType?: string | null
  employeeId: IdInput; employeeCode: string | null; fullName: string | null
  branchId: IdInput; branchName: string | null
  departmentId: IdInput; departmentName: string | null
  costCenterId: IdInput; costCenterName: string | null
  itemPayMethod: string | null; employeePayMethod?: string | null; bankTransferAmount?: MoneyInput
  /** اللي اتثبت على البند وقت الصرف (ترحيل 067) */
  itemPaidPayMethod?: string | null; itemPaidBankAmount?: MoneyInput; itemPaidCashAmount?: MoneyInput
  basicSalary: MoneyInput; allowances: MoneyInput; overtimeAmount: MoneyInput; overtimeHours?: MoneyInput; otherAdditions: MoneyInput
  latenessDeduction: MoneyInput; shortfallDeduction: MoneyInput; absenceDeduction: MoneyInput; unpaidLeaveDeduction: MoneyInput
  loanInstallments: MoneyInput; otherDeductions: MoneyInput; socialInsuranceDeduction?: MoneyInput; netPay: MoneyInput
  salaryComponents?: string | null; earnedComponents?: string | null; obligationLines?: string | null
  leaveDeductionLines?: string | null; overtimeEntryIds?: string | null
  /** حصة صاحب العمل في التأمينات من تفصيل البند؛ null = لا تنطبق أو غير متاحة */
  employerInsurance?: MoneyInput
  /** علامة «مصروف مع التصفية» من تفصيل البند: نص JSON لـ breakdown.settlementPayout كما هو، أو null */
  settlementPayout?: string | null
  /** علامة صرف البند (payroll_item_disbursements) لو موجودة: اللي اتصرف فعلًا بتقسيمه المثبت */
  disbursementStatus?: string | null; disbursedPayMethod?: string | null
  disbursedBankAmount?: MoneyInput; disbursedCashAmount?: MoneyInput
}

/** قيد الدفتر المرتبط بسطر في obligationLines: تصنيفه ونصه ومصدره ونوع الخصم/المكافأة لو موجود. */
export interface FinancialObligationInfo {
  id: number; type: string | null; category: string | null; label: string | null; typeName: string | null; sourceRef?: string | null
}

export interface FinancialLine { type: 'CREDIT' | 'DEBIT'; key: string; category: string | null; label: string | null; typeName: string | null; amount: bigint }

export interface FinancialRow {
  runId: number; runName: string | null; runStatus: string
  employeeId: number; employeeCode: string | null; fullName: string | null
  branchId: number | null; branchName: string | null; departmentId: number | null; departmentName: string | null
  costCenterId: number | null; costCenterName: string | null; payMethod: string
  basic: bigint; allowances: bigint; buckets: Map<string, bigint>; additions: Map<string, bigint>; otherAdditions: bigint
  overtime: bigint; overtimeMinutes: number; overtimeEntries: number; holidayWork: bigint
  gross: bigint; deductions: Record<FrDeductionKind, bigint>; totalDeductions: bigint; net: bigint; bank: bigint; cash: bigint
  /** صافي الصف لو راتبه «مصروف مع التصفية» (برّه كشف البنك)، وإلا صفر — فالصافي = بنك + نقدي + مع التصفية */
  settlement: bigint
  employerInsurance: bigint | null
  lines: FinancialLine[]
}

const toId = (value: IdInput): number | null => {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isSafeInteger(number) ? number : null
}
const parseArray = (text: string | null | undefined): unknown[] => {
  if (typeof text !== 'string' || !text.trim()) return []
  try { const parsed = JSON.parse(text); return Array.isArray(parsed) ? parsed : [] } catch { return [] }
}
const add = (map: Map<string, bigint>, key: string, value: bigint) => { if (value !== 0n) map.set(key, (map.get(key) ?? 0n) + value) }
const zeroKinds = () => Object.fromEntries(DEDUCTION_KEYS.map(key => [key, 0n])) as Record<FrDeductionKind, bigint>
const centsOfNumber = (value: unknown) => typeof value === 'number' || typeof value === 'string' ? cents(value) : 0n

// فرق قروش بسيط من قص كل مكون لوحده (مش بدل حقيقي غير مفصل) يروح لأكبر بند بدل عشان ما يطلعش عمود «غير مفصل» بقرش
const ROUNDING_SLACK = 5n

function allowanceBuckets(source: FinancialItemSource, total: bigint): Map<string, bigint> {
  const buckets = new Map<string, bigint>()
  const components = parseArray(source.salaryComponents)
  if (components.length) {
    for (const component of components) {
      const row = component as { code?: unknown; earnedAmount?: unknown }
      if (!row || typeof row !== 'object' || row.code === 'BASIC' || typeof row.code !== 'string') continue
      add(buckets, row.code, centsOfNumber(row.earnedAmount))
    }
  } else {
    const earned = parseArray(source.earnedComponents)
    earned.forEach((value, index) => {
      const component = MONTHLY_SALARY_COMPONENTS[index]
      if (index > 0 && component) add(buckets, component.code, centsOfNumber(value))
    })
  }
  const split = [...buckets.values()].reduce((sum, value) => sum + value, 0n)
  const remainder = total - split
  if (remainder !== 0n) {
    const largest = [...buckets.entries()].sort((a, b) => (a[1] === b[1] ? 0 : a[1] > b[1] ? -1 : 1))[0]
    if (largest && (remainder < 0n ? -remainder : remainder) <= ROUNDING_SLACK) buckets.set(largest[0], largest[1] + remainder)
    else add(buckets, FR_UNSPLIT_ALLOWANCE, remainder)
  }
  return buckets
}

/** يحوّل بند المسير إلى صف مالي مفصل (قروش). obligations = قيود الدفتر المشار إليها في obligationLines. */
export function computeFinancialRow(source: FinancialItemSource, obligations: ReadonlyMap<number, FinancialObligationInfo>): FinancialRow {
  const basic = cents(source.basicSalary), allowances = cents(source.allowances), overtime = cents(source.overtimeAmount)
  const otherAdditions = cents(source.otherAdditions), otherDeductions = cents(source.otherDeductions)
  const lines: FinancialLine[] = []
  const additions = new Map<string, bigint>()
  const deductions = zeroKinds()
  let holidayWork = 0n, credited = 0n, debited = 0n

  for (const raw of parseArray(source.obligationLines)) {
    const line = raw as { id?: unknown; type?: unknown; amount?: unknown; collected?: unknown }
    if (!line || typeof line !== 'object') continue
    const info = obligations.get(Number(line.id)) ?? null
    const type = (line.type ?? info?.type) === 'CREDIT' ? 'CREDIT' : (line.type ?? info?.type) === 'DEBIT' ? 'DEBIT' : null
    if (!type) continue
    const amount = centsOfNumber(line.collected ?? line.amount)
    if (amount === 0n) continue
    const category = info?.category ?? null
    if (type === 'CREDIT') {
      credited += amount
      if (isHolidayWorkObligation(info)) {
        holidayWork += amount
        lines.push({ type, key: 'HOLIDAY_WORK', category, label: info?.label ?? null, typeName: null, amount })
      } else {
        // تصنيف مش معروف يروح «إضافات أخرى» (والسطر نفسه محتفظ بتصنيفه ونصه) عشان ما يظهرش عمود باسم إنجليزي
        const key = category && ADDITION_ORDER.includes(category) ? category : FR_OTHER_ADDITION
        add(additions, key, amount)
        lines.push({ type, key, category, label: info?.label ?? null, typeName: info?.typeName ?? null, amount })
      }
    } else {
      debited += amount
      const key: FrDeductionKind = category === 'typed_deduction' ? 'TYPED' : 'OTHER_DEBITS'
      deductions[key] += amount
      lines.push({ type, key, category, label: info?.label ?? null, typeName: info?.typeName ?? null, amount })
    }
  }
  // مسير قديم بلا سطور (أو سطر قيد اتمسح): الباقي يظهر صريحًا
  if (otherAdditions !== credited) {
    add(additions, FR_OTHER_ADDITION, otherAdditions - credited)
    lines.push({ type: 'CREDIT', key: FR_OTHER_ADDITION, category: null, label: null, typeName: null, amount: otherAdditions - credited })
  }
  if (otherDeductions !== debited) {
    deductions.OTHER_DEBITS += otherDeductions - debited
    lines.push({ type: 'DEBIT', key: 'OTHER_DEBITS', category: 'OTHER', label: null, typeName: null, amount: otherDeductions - debited })
  }

  // عمود «إجازات بدون راتب» في البند = بدون راتب + أيام الإيقاف + خصم المرضية بنسبها (سطور leaveDeductionLines)
  const unpaidColumn = cents(source.unpaidLeaveDeduction)
  let leaveSplit = 0n
  for (const raw of parseArray(source.leaveDeductionLines)) {
    const line = raw as { code?: unknown; amount?: unknown }
    if (!line || typeof line !== 'object') continue
    const amount = centsOfNumber(line.amount)
    const code = typeof line.code === 'string' ? line.code : ''
    const key: FrDeductionKind = code === 'SUSPENSION' ? 'SUSPENSION' : code.startsWith('SICK_LEAVE') ? 'SICK_CUT' : 'UNPAID_LEAVE'
    deductions[key] += amount
    leaveSplit += amount
  }
  deductions.UNPAID_LEAVE += unpaidColumn - leaveSplit

  deductions.LATENESS = cents(source.latenessDeduction)
  deductions.SHORTFALL = cents(source.shortfallDeduction)
  deductions.ABSENCE = cents(source.absenceDeduction)
  deductions.LOANS = cents(source.loanInstallments)
  deductions.SOCIAL_INSURANCE = cents(source.socialInsuranceDeduction)

  // الإضافات (ومنها بدل دوام أيام العطلات) كلها جوه عمود otherAdditions في البند
  const gross = basic + allowances + overtime + otherAdditions
  const totalDeductions = DEDUCTION_KEYS.reduce((sum, key) => sum + deductions[key], 0n)
  const net = cents(source.netPay)
  const livePayMethod = source.employeePayMethod || source.itemPayMethod || 'transfer'
  // تقسيم بنك/نقدي من كشف البنوك نفسه (payroll/bank-sheet.ts) — مصدر واحد للقاعدة: الموظف اللي راتبه «مصروف مع التصفية»
  // برّه الكشف، فبنكه صفر ونقديه صفر هنا كمان، وصافيه كامل في عمود الصافي (تكلفة الشهر) ومذكور في عمود «مع التصفية».
  // قبل كده الدفتر كان بيقسّم كل صف فعمود «بنك» مابيتصالحش على كشف البنك (37,440.00 مقابل 18,720.00 لنفس المسير).
  // واللي اتصرف فعلًا بيغلب ملف الموظف الحالي (payroll-disbursement-split.ts): تغيير طريقة الصرف بعد الصرف
  // كان بينقل صافي البند من عمود لعمود في الدفتر لواقعة صرف حصلت خلاص.
  const recorded = recordedDisbursement({ runStatus: source.runStatus, itemPayMethod: source.itemPayMethod,
    itemPaid: { payMethod: source.itemPaidPayMethod ?? null, bankAmount: source.itemPaidBankAmount, cashAmount: source.itemPaidCashAmount },
    mark: source.disbursementStatus ? { status: source.disbursementStatus, payMethod: source.disbursedPayMethod,
      bankAmount: source.disbursedBankAmount, cashAmount: source.disbursedCashAmount } : null })
  const sheet = buildBankSheet([{ employeeId: toId(source.employeeId) ?? 0, employeeCode: source.employeeCode ?? '', fullName: source.fullName ?? '',
    payMethod: livePayMethod, bankTransferAmount: source.bankTransferAmount ?? null, bankName: null, iban: null, netPay: money(net),
    settlementPayout: payrollItemSettlementPayout(source.settlementPayout ? `{"settlementPayout":${source.settlementPayout}}` : null), recorded }])
  const payMethod = sheet.rows[0]?.payMethod ?? recorded?.payMethod ?? livePayMethod
  const split = { bank: sheet.rows[0]?.bankAmount ?? 0, cash: sheet.rows[0]?.cashAmount ?? 0, settlement: sheet.settlement.total }
  const hours = Number(source.overtimeHours ?? 0)
  const insurance = source.employerInsurance
  return {
    runId: toId(source.runId) ?? 0, runName: source.runName ?? null, runStatus: source.runStatus,
    employeeId: toId(source.employeeId) ?? 0, employeeCode: source.employeeCode ?? null, fullName: source.fullName ?? null,
    branchId: toId(source.branchId), branchName: source.branchName ?? null,
    departmentId: toId(source.departmentId), departmentName: source.departmentName ?? null,
    costCenterId: toId(source.costCenterId), costCenterName: source.costCenterName ?? null, payMethod,
    basic, allowances, buckets: allowanceBuckets(source, allowances), additions, otherAdditions,
    overtime, overtimeMinutes: Number.isFinite(hours) ? Math.round(hours * 60) : 0, overtimeEntries: parseArray(source.overtimeEntryIds).length,
    holidayWork, gross, deductions, totalDeductions, net,
    bank: cents(split.bank), cash: cents(split.cash), settlement: cents(split.settlement),
    employerInsurance: insurance === null || insurance === undefined || insurance === '' ? null : cents(insurance),
    lines,
  }
}

// ===== الأعمدة الديناميكية =====
function orderedKeys(keys: Iterable<string>, order: readonly string[]) {
  const all = [...new Set(keys)]
  return all.sort((a, b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b)
    return (ia < 0 ? order.length : ia) - (ib < 0 ? order.length : ib) || a.localeCompare(b)
  })
}
const additionLabel = (key: string) => FR_ADDITION_LABELS[key] ?? key
const bucketLabel = (key: string) => FR_ALLOWANCE_BUCKETS.find(bucket => bucket.key === key)?.label ?? key
const byEmployeeOrder = (a: { employeeCode: string | null; fullName: string | null }, b: { employeeCode: string | null; fullName: string | null }) =>
  (a.employeeCode ?? '').localeCompare(b.employeeCode ?? '', 'en', { numeric: true }) || (a.fullName ?? '').localeCompare(b.fullName ?? '', 'ar')
const sumMap = (rows: Iterable<Map<string, bigint>>) => {
  const total = new Map<string, bigint>()
  for (const map of rows) for (const [key, value] of map) add(total, key, value)
  return total
}
const mapToRecord = (keys: string[], map: Map<string, bigint>) => Object.fromEntries(keys.map(key => [key, money(map.get(key) ?? 0n)]))
const kindsToRecord = (kinds: Record<FrDeductionKind, bigint>) => Object.fromEntries(DEDUCTION_KEYS.map(key => [key, money(kinds[key])])) as Record<FrDeductionKind, string>

// ===== ١) كشف الرواتب =====
export function buildPayrollRegister(rows: readonly FinancialRow[], insuranceAvailable: boolean) {
  const bucketKeys = orderedKeys(rows.flatMap(row => [...row.buckets.keys()]), FR_ALLOWANCE_BUCKETS.map(bucket => bucket.key))
  const additionKeys = orderedKeys(rows.flatMap(row => [...row.additions.keys()]), [...ADDITION_ORDER, FR_OTHER_ADDITION])
  const sorted = [...rows].sort((a, b) => (a.branchName ?? '').localeCompare(b.branchName ?? '', 'ar') ||
    (a.departmentName ?? '').localeCompare(b.departmentName ?? '', 'ar') || byEmployeeOrder(a, b) || a.runId - b.runId)
  const total = (pick: (row: FinancialRow) => bigint) => money(rows.reduce((sum, row) => sum + pick(row), 0n))
  const totalKinds = zeroKinds()
  for (const row of rows) for (const key of DEDUCTION_KEYS) totalKinds[key] += row.deductions[key]
  const bucketTotals = sumMap(rows.map(row => row.buckets)), additionTotals = sumMap(rows.map(row => row.additions))
  return {
    columns: {
      allowanceBuckets: bucketKeys.map(key => ({ key, label: bucketLabel(key), total: money(bucketTotals.get(key) ?? 0n) })),
      additions: additionKeys.map(key => ({ key, label: additionLabel(key), total: money(additionTotals.get(key) ?? 0n) })),
      deductions: FR_DEDUCTION_KINDS.map(kind => ({ key: kind.key, label: kind.label, total: money(totalKinds[kind.key]) })),
    },
    rows: sorted.map(row => ({
      runId: row.runId, runName: row.runName, runStatus: row.runStatus,
      employeeId: row.employeeId, employeeCode: row.employeeCode, fullName: row.fullName,
      branchName: row.branchName, departmentName: row.departmentName, costCenterName: row.costCenterName, payMethod: row.payMethod,
      basic: money(row.basic), allowances: money(row.allowances), allowanceBuckets: mapToRecord(bucketKeys, row.buckets),
      additions: mapToRecord(additionKeys, row.additions), otherAdditions: money(row.otherAdditions),
      overtime: money(row.overtime), overtimeMinutes: row.overtimeMinutes, holidayWork: money(row.holidayWork), gross: money(row.gross),
      deductions: kindsToRecord(row.deductions), totalDeductions: money(row.totalDeductions), net: money(row.net),
      bank: money(row.bank), cash: money(row.cash), settlement: money(row.settlement),
      employerInsurance: insuranceAvailable && row.employerInsurance !== null ? money(row.employerInsurance) : null,
      lines: row.lines.map(line => ({ type: line.type, key: line.key, category: line.category, label: line.label, typeName: line.typeName, amount: money(line.amount) })),
    })),
    totals: {
      headcount: new Set(rows.map(row => row.employeeId)).size, items: rows.length,
      basic: total(row => row.basic), allowances: total(row => row.allowances),
      allowanceBuckets: mapToRecord(bucketKeys, bucketTotals), additions: mapToRecord(additionKeys, additionTotals), otherAdditions: total(row => row.otherAdditions),
      overtime: total(row => row.overtime), overtimeMinutes: rows.reduce((sum, row) => sum + row.overtimeMinutes, 0), holidayWork: total(row => row.holidayWork),
      gross: total(row => row.gross), deductions: kindsToRecord(totalKinds), totalDeductions: total(row => row.totalDeductions),
      net: total(row => row.net), bank: total(row => row.bank), cash: total(row => row.cash), settlement: total(row => row.settlement),
      employerInsurance: insuranceAvailable ? total(row => row.employerInsurance ?? 0n) : null,
    },
  }
}

// ===== ٢) ملخص تكلفة الرواتب بالفرع وبالقسم =====
export interface FinancialCostGroup {
  id: number | null; name: string; branchNames: string[]; headcount: number
  gross: string; deductions: string; net: string; overtime: string; holidayWork: string
  employerInsurance: string | null; totalCost: string
}

function costGroups(rows: readonly FinancialRow[], keyOf: (row: FinancialRow) => { id: number | null; name: string | null }, emptyName: string, insuranceAvailable: boolean) {
  type Acc = { id: number | null; name: string; branches: Set<string>; ids: Set<number>; gross: bigint; deductions: bigint; net: bigint; overtime: bigint; holiday: bigint; insurance: bigint }
  const groups = new Map<string, Acc>()
  for (const row of rows) {
    const { id, name } = keyOf(row)
    const key = id === null ? 'none' : String(id)
    let acc = groups.get(key)
    if (!acc) {
      acc = { id, name: id === null ? emptyName : name || `#${id}`, branches: new Set(), ids: new Set(), gross: 0n, deductions: 0n, net: 0n, overtime: 0n, holiday: 0n, insurance: 0n }
      groups.set(key, acc)
    }
    acc.branches.add(row.branchName ?? FR_NO_BRANCH); acc.ids.add(row.employeeId)
    acc.gross += row.gross; acc.deductions += row.totalDeductions; acc.net += row.net
    acc.overtime += row.overtime; acc.holiday += row.holidayWork; acc.insurance += row.employerInsurance ?? 0n
  }
  const result: FinancialCostGroup[] = [...groups.values()].map(acc => ({
    id: acc.id, name: acc.name, branchNames: [...acc.branches].sort((a, b) => a.localeCompare(b, 'ar')), headcount: acc.ids.size,
    gross: money(acc.gross), deductions: money(acc.deductions), net: money(acc.net), overtime: money(acc.overtime), holidayWork: money(acc.holiday),
    employerInsurance: insuranceAvailable ? money(acc.insurance) : null,
    // تكلفة الشركة = إجمالي المستحق + حصة صاحب العمل في التأمينات
    totalCost: money(acc.gross + (insuranceAvailable ? acc.insurance : 0n)),
  }))
  return result.sort((a, b) => (a.id === null ? 1 : 0) - (b.id === null ? 1 : 0) || a.name.localeCompare(b.name, 'ar'))
}

export function buildPayrollCostSummary(rows: readonly FinancialRow[], insuranceAvailable: boolean) {
  const all = costGroups(rows, () => ({ id: 0, name: 'الإجمالي' }), 'الإجمالي', insuranceAvailable)[0]
  return {
    byBranch: costGroups(rows, row => ({ id: row.branchId, name: row.branchName }), FR_NO_BRANCH, insuranceAvailable),
    byDepartment: costGroups(rows, row => ({ id: row.departmentId, name: row.departmentName }), FR_NO_DEPARTMENT, insuranceAvailable),
    totals: all ? { headcount: all.headcount, gross: all.gross, deductions: all.deductions, net: all.net, overtime: all.overtime,
      holidayWork: all.holidayWork, employerInsurance: all.employerInsurance, totalCost: all.totalCost }
      : { headcount: 0, gross: '0.00', deductions: '0.00', net: '0.00', overtime: '0.00', holidayWork: '0.00',
        employerInsurance: insuranceAvailable ? '0.00' : null, totalCost: '0.00' },
  }
}

// ===== ٣) الخصومات بالنوع وبالموظف =====
interface EmployeeAcc {
  employeeId: number; employeeCode: string | null; fullName: string | null; branchName: string | null; departmentName: string | null
}
function mergeEmployees<T extends EmployeeAcc>(rows: readonly FinancialRow[], init: (row: FinancialRow) => T, merge: (acc: T, row: FinancialRow) => void) {
  const map = new Map<number, T>()
  for (const row of rows) {
    let acc = map.get(row.employeeId)
    if (!acc) { acc = init(row); map.set(row.employeeId, acc) }
    merge(acc, row)
  }
  return [...map.values()].sort(byEmployeeOrder)
}
const employeeBase = (row: FinancialRow): EmployeeAcc => ({ employeeId: row.employeeId, employeeCode: row.employeeCode, fullName: row.fullName,
  branchName: row.branchName, departmentName: row.departmentName })

export function buildDeductionsReport(rows: readonly FinancialRow[]) {
  const employees = mergeEmployees(rows, row => ({ ...employeeBase(row), kinds: zeroKinds(), total: 0n }), (acc, row) => {
    for (const key of DEDUCTION_KEYS) acc.kinds[key] += row.deductions[key]
    acc.total += row.totalDeductions
  }).filter(row => row.total !== 0n || DEDUCTION_KEYS.some(key => row.kinds[key] !== 0n))
  const kinds = FR_DEDUCTION_KINDS.map(kind => {
    const affected = employees.filter(row => row.kinds[kind.key] !== 0n)
    return { key: kind.key, label: kind.label, amount: money(affected.reduce((sum, row) => sum + row.kinds[kind.key], 0n)), employees: affected.length }
  })
  // تفصيل «الخصومات والجزاءات» بنوع الخصم، و«خصومات أخرى» بالتصنيف
  const detail = (kind: FrDeductionKind, nameOf: (line: FinancialLine) => string) => {
    const groups = new Map<string, { amount: bigint; ids: Set<number> }>()
    for (const row of rows) for (const line of row.lines) {
      if (line.type !== 'DEBIT' || line.key !== kind) continue
      const name = nameOf(line)
      const group = groups.get(name) ?? { amount: 0n, ids: new Set<number>() }
      group.amount += line.amount; group.ids.add(row.employeeId)
      groups.set(name, group)
    }
    return [...groups.entries()].map(([name, group]) => ({ name, amount: money(group.amount), employees: group.ids.size }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
  }
  return {
    kinds,
    typedByType: detail('TYPED', line => line.typeName || line.label || FR_UNNAMED_TYPED),
    otherByCategory: detail('OTHER_DEBITS', line => FR_OTHER_DEBIT_LABELS[line.category ?? 'OTHER'] ?? line.label ?? FR_OTHER_DEBIT_LABELS.OTHER),
    employees: employees.map(row => ({ employeeId: row.employeeId, employeeCode: row.employeeCode, fullName: row.fullName, branchName: row.branchName,
      departmentName: row.departmentName, amounts: kindsToRecord(row.kinds), total: money(row.total) })),
    totals: { amount: money(employees.reduce((sum, row) => sum + row.total, 0n)), employees: employees.length },
  }
}

// ===== ٥) الإضافي المعتمد اللي دخل مسيرات الشهر =====
export function buildOvertimeReport(rows: readonly FinancialRow[]) {
  const employees = mergeEmployees(rows, row => ({ ...employeeBase(row), departmentId: row.departmentId, entries: 0, minutes: 0, amount: 0n, holidayWork: 0n }), (acc, row) => {
    acc.entries += row.overtimeEntries; acc.minutes += row.overtimeMinutes; acc.amount += row.overtime; acc.holidayWork += row.holidayWork
  }).filter(row => row.minutes !== 0 || row.amount !== 0n || row.holidayWork !== 0n)
  const departments = new Map<string, { departmentId: number | null; name: string; ids: Set<number>; entries: number; minutes: number; amount: bigint; holidayWork: bigint }>()
  for (const row of employees) {
    const key = row.departmentId === null ? 'none' : String(row.departmentId)
    const group = departments.get(key) ?? { departmentId: row.departmentId, name: row.departmentId === null ? FR_NO_DEPARTMENT : row.departmentName || `#${row.departmentId}`,
      ids: new Set<number>(), entries: 0, minutes: 0, amount: 0n, holidayWork: 0n }
    group.ids.add(row.employeeId); group.entries += row.entries; group.minutes += row.minutes; group.amount += row.amount; group.holidayWork += row.holidayWork
    departments.set(key, group)
  }
  return {
    employees: employees.map(row => ({ employeeId: row.employeeId, employeeCode: row.employeeCode, fullName: row.fullName, branchName: row.branchName,
      departmentName: row.departmentName, entries: row.entries, minutes: row.minutes, amount: money(row.amount), holidayWork: money(row.holidayWork) })),
    departments: [...departments.values()]
      .sort((a, b) => (a.departmentId === null ? 1 : 0) - (b.departmentId === null ? 1 : 0) || a.name.localeCompare(b.name, 'ar'))
      .map(group => ({ departmentId: group.departmentId, name: group.name, employees: group.ids.size, entries: group.entries, minutes: group.minutes,
        amount: money(group.amount), holidayWork: money(group.holidayWork) })),
    totals: { employees: employees.length, entries: employees.reduce((sum, row) => sum + row.entries, 0), minutes: employees.reduce((sum, row) => sum + row.minutes, 0),
      amount: money(employees.reduce((sum, row) => sum + row.amount, 0n)), holidayWork: money(employees.reduce((sum, row) => sum + row.holidayWork, 0n)) },
  }
}

// ===== ٤) السلف: الأرصدة القائمة وأقساط الشهر =====
export interface FinancialLoanSource {
  id: IdInput; employeeId: IdInput; employeeCode: string | null; fullName: string | null; branchName: string | null; departmentName: string | null
  amount: MoneyInput; status: string | null; disbursedAt?: string | null
}
export interface FinancialInstallmentSource {
  id: IdInput; loanId: IdInput; dueDate: string; amount: MoneyInput; paidAmount?: MoneyInput; paid?: boolean | number | null
  financialStatus?: string | null; parentInstallmentId?: IdInput
}

/** نفس قاعدة readLoanInstallmentPositions: الحالة الفاضية من paid، والمتبقي على القسط المستحق (DUE) بس، والمسدد من paidAmount. */
export function installmentPosition(row: FinancialInstallmentSource) {
  const paidFlag = row.paid === true || row.paid === 1
  const status = row.financialStatus || (paidFlag ? 'PAID' : 'DUE')
  const amount = cents(row.amount)
  const paid = row.paidAmount === null || row.paidAmount === undefined || row.paidAmount === '' ? (paidFlag ? amount : 0n) : cents(row.paidAmount)
  return { status, amount, paid, remaining: status === 'DUE' ? amount : 0n }
}

export function buildLoansReport(input: {
  loans: readonly FinancialLoanSource[]; installments: readonly FinancialInstallmentSource[]
  startDate: string; endDate: string; deductedByEmployee?: ReadonlyMap<number, bigint>
}) {
  const byLoan = new Map<number, FinancialInstallmentSource[]>()
  for (const row of input.installments) {
    const loanId = toId(row.loanId)
    if (loanId !== null) byLoan.set(loanId, [...(byLoan.get(loanId) ?? []), row])
  }
  type LoanRow = { loanId: number; status: string | null; disbursedAt: string | null; principal: bigint; paid: bigint; outstanding: bigint; installments: number
    openInstallments: number; dueCount: number; dueAmount: bigint; duePaid: bigint; dueRemaining: bigint; overdue: bigint; nextDueDate: string | null }
  type Acc = EmployeeAcc & { loans: LoanRow[] }
  const employees = new Map<number, Acc>()
  for (const loan of input.loans) {
    const loanId = toId(loan.id), employeeId = toId(loan.employeeId)
    if (loanId === null || employeeId === null) continue
    const rows = (byLoan.get(loanId) ?? []).map(row => ({ row, position: installmentPosition(row) })).filter(item => item.position.status !== 'REVERSED')
    const open = rows.filter(item => item.position.remaining > 0n).sort((a, b) => a.row.dueDate.localeCompare(b.row.dueDate))
    const due = rows.filter(item => item.row.dueDate >= input.startDate && item.row.dueDate <= input.endDate)
    const sum = (items: typeof rows, pick: (position: ReturnType<typeof installmentPosition>) => bigint) => items.reduce((total, item) => total + pick(item.position), 0n)
    const loanRow: LoanRow = { loanId, status: loan.status ?? null, disbursedAt: loan.disbursedAt ? String(loan.disbursedAt).slice(0, 10) : null,
      principal: cents(loan.amount), paid: sum(rows, position => position.paid), outstanding: sum(rows, position => position.remaining),
      installments: rows.filter(item => toId(item.row.parentInstallmentId) === null).length, openInstallments: open.length,
      dueCount: due.length, dueAmount: sum(due, position => position.amount), duePaid: sum(due, position => position.paid), dueRemaining: sum(due, position => position.remaining),
      overdue: sum(open.filter(item => item.row.dueDate < input.startDate), position => position.remaining), nextDueDate: open[0]?.row.dueDate ?? null }
    const acc = employees.get(employeeId) ?? { employeeId, employeeCode: loan.employeeCode, fullName: loan.fullName, branchName: loan.branchName,
      departmentName: loan.departmentName, loans: [] }
    acc.loans.push(loanRow)
    employees.set(employeeId, acc)
  }
  // الخصم في مسير الشهر يتعرض على موظف له سلفة داخل الفلتر بس (من غير بيانات سلفة ما نضيفش صف)
  const rows = [...employees.values()].map(acc => {
    const total = (pick: (loan: LoanRow) => bigint) => acc.loans.reduce((sum, loan) => sum + pick(loan), 0n)
    const deducted = input.deductedByEmployee?.get(acc.employeeId) ?? 0n
    return { acc, deducted, principal: total(loan => loan.principal), paid: total(loan => loan.paid), outstanding: total(loan => loan.outstanding),
      dueAmount: total(loan => loan.dueAmount), duePaid: total(loan => loan.duePaid), dueRemaining: total(loan => loan.dueRemaining),
      overdue: total(loan => loan.overdue), dueCount: acc.loans.reduce((sum, loan) => sum + loan.dueCount, 0) }
  }).filter(row => row.outstanding !== 0n || row.dueAmount !== 0n || row.deducted !== 0n)
    .sort((a, b) => byEmployeeOrder(a.acc, b.acc))
  const grand = (pick: (row: typeof rows[number]) => bigint) => money(rows.reduce((sum, row) => sum + pick(row), 0n))
  return {
    employees: rows.map(row => ({
      employeeId: row.acc.employeeId, employeeCode: row.acc.employeeCode, fullName: row.acc.fullName, branchName: row.acc.branchName, departmentName: row.acc.departmentName,
      loansCount: row.acc.loans.length, principal: money(row.principal), paid: money(row.paid), outstanding: money(row.outstanding),
      dueCount: row.dueCount, dueAmount: money(row.dueAmount), duePaid: money(row.duePaid), dueRemaining: money(row.dueRemaining), overdue: money(row.overdue),
      deductedInPayroll: money(row.deducted),
      loans: row.acc.loans.sort((a, b) => a.loanId - b.loanId).map(loan => ({ ...loan, principal: money(loan.principal), paid: money(loan.paid),
        outstanding: money(loan.outstanding), dueAmount: money(loan.dueAmount), duePaid: money(loan.duePaid), dueRemaining: money(loan.dueRemaining), overdue: money(loan.overdue) })),
    })),
    totals: { employees: rows.length, loans: rows.reduce((sum, row) => sum + row.acc.loans.length, 0), principal: grand(row => row.principal), paid: grand(row => row.paid),
      outstanding: grand(row => row.outstanding), dueCount: rows.reduce((sum, row) => sum + row.dueCount, 0), dueAmount: grand(row => row.dueAmount),
      duePaid: grand(row => row.duePaid), dueRemaining: grand(row => row.dueRemaining), overdue: grand(row => row.overdue), deductedInPayroll: grand(row => row.deducted) },
  }
}
