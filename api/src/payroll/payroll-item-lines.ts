import type { EntityManager } from 'typeorm'
import { HOLIDAY_WORK_LABEL, HOLIDAY_WORK_SOURCE_PREFIX } from '../attendance/holiday-work'
import { MONTHLY_SALARY_COMPONENTS } from '../employees/compensation'
import { PAYROLL_OBLIGATION_CATEGORY_LABELS } from './payroll-obligation-trace'

// بنود الاستحقاقات والاستقطاعات لكل موظف في المسير (طلب المالك 19 سبتمبر): كل بند عمود باسمه بدل «البدلات» و«إضافات أخرى» و«خصومات أخرى».
// قراءة فقط من المحفوظ مع البند: أعمدة payroll_items + تفصيل breakdown (مكونات الراتب، أيام الحضور، سطور الإجازة) + قيود الدفتر بأسمائها.
// المجاميع = الأعمدة المحفوظة بالقرش: بنود الاستحقاق = الأساسي + البدلات الثابتة + الإضافي + الإضافات، وبنود الاستقطاع = أعمدة الخصم السبعة،
// والصافي = netPay. أي فرق بين سطور التفصيل وعمودها (مسير قديم أو قيد اتمسح) يروح سطر «إضافات أخرى» أو «خصومات أخرى» بدل ما يتوه.

export interface PayrollLine { key: string; name: string; amount: number }
export interface PayrollItemLines {
  earnings: PayrollLine[]
  deductions: PayrollLine[]
  totals: { earnings: number; deductions: number; net: number }
}
export interface PayrollLineColumn { key: string; name: string }

/** قيد الدفتر المشار إليه في breakdown.obligationLines: نوعه وتصنيفه ونصه ومصدره، واسم نوع الخصم أو المكافأة وقت الطلب. */
export interface PayrollLineObligationFact {
  id: number
  type: string | null
  category: string | null
  label: string | null
  sourceRef: string | null
  amount: number | string | null
  deductionRequestId: number | null
  bonusRequestId: number | null
  typeName: string | null
}

/** أعمدة بند المسير اللي بتتقسم لبنود (قيم DECIMAL ممكن توصل نصوص من القاعدة). */
export interface PayrollLineItem {
  basicSalary?: unknown; allowances?: unknown; overtimeAmount?: unknown; otherAdditions?: unknown
  latenessDeduction?: unknown; shortfallDeduction?: unknown; absenceDeduction?: unknown; unpaidLeaveDeduction?: unknown
  loanInstallments?: unknown; otherDeductions?: unknown; socialInsuranceDeduction?: unknown; netPay?: unknown
  breakdown?: string | null
}

export const PAYROLL_LINE_NAMES = {
  BASIC: 'الأساسي', SALARY_ALLOWANCES: 'البدلات الثابتة', OVERTIME: 'الإضافي', HOLIDAY_WORK: HOLIDAY_WORK_LABEL, OTHER_ADDITIONS: 'إضافات أخرى',
  LATENESS: 'التأخير', EARLY_LEAVE: 'الانصراف المبكر', SHORTFALL: 'نقص الساعات', ABSENCE: 'الغياب', UNPAID_LEAVE: 'إجازة بدون راتب',
  SUSPENSION: 'الإيقاف', SICK_LEAVE: 'خصم المرضية', OTHER_DEDUCTIONS: 'خصومات أخرى', LOAN: 'السلف', SOCIAL_INSURANCE: 'التأمينات (حصة الموظف)',
} as const
export const PAYROLL_LINE_TOTAL_NAMES = { earnings: 'إجمالي الاستحقاقات', deductions: 'إجمالي الاستقطاعات', net: 'الصافي' } as const

// ترتيب الأعمدة: رتبة البند ثم اسمه (البنود المتغيرة: مكونات الراتب بترتيبها، والبدلات والخصومات بأسمائها)
const SALARY_CODES: readonly string[] = MONTHLY_SALARY_COMPONENTS.map(component => component.code)
function lineRank(key: string): number {
  if (key === 'BASIC') return 0
  if (key.startsWith('SALARY:')) { const index = SALARY_CODES.indexOf(key.slice(7)); return 10 + (index < 0 ? 9 : index) }
  if (key === 'SALARY_ALLOWANCES') return 19
  if (key === 'OVERTIME') return 20
  if (key === 'HOLIDAY_WORK') return 30
  if (key.startsWith('ALLOWANCE:')) return 40
  if (key.startsWith('BONUS:')) return 50
  if (key.startsWith('CREDIT:')) return 60
  if (key === 'OTHER_ADDITIONS') return 90
  const fixed: Record<string, number> = { LATENESS: 100, EARLY_LEAVE: 101, SHORTFALL: 102, ABSENCE: 103, UNPAID_LEAVE: 104, SUSPENSION: 105, SICK_LEAVE: 106,
    OTHER_DEDUCTIONS: 130, LOAN: 140, SOCIAL_INSURANCE: 150 }
  if (key in fixed) return fixed[key]
  if (key.startsWith('TYPED:')) return 110
  if (key.startsWith('DEBIT:')) return 120
  return 200
}
export const comparePayrollLines = (a: Pick<PayrollLine, 'key' | 'name'>, b: Pick<PayrollLine, 'key' | 'name'>) =>
  lineRank(a.key) - lineRank(b.key) || a.name.localeCompare(b.name, 'ar') || a.key.localeCompare(b.key)

// ===== أدوات القروش =====
const numberOf = (value: unknown): number => {
  const number = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : 0
  return Number.isFinite(number) ? number : 0
}
/** مبلغ محفوظ بمنزلتين (عمود أو سطر) → قروش صحيحة. */
const cents = (value: unknown) => Math.round(numberOf(value) * 100)
/** مجموع مبالغ يومية غير مقصوصة → قروش بالقص نحو الصفر (نفس roundPayrollMoney اللي حسب العمود). */
const truncatedCents = (value: number) => Math.trunc(Math.round(value * 1e6) / 1e4)
const money = (value: number) => value / 100
const parseObject = (text: unknown): Record<string, any> => {
  if (text && typeof text === 'object') return text as Record<string, any>
  if (typeof text !== 'string' || !text.trim()) return {}
  try { const parsed = JSON.parse(text); return parsed && typeof parsed === 'object' ? parsed : {} } catch { return {} }
}
const cleanName = (value: unknown) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''

class LineBag {
  private readonly map = new Map<string, { key: string; name: string; cents: number }>()
  add(key: string, name: string, amount: number) {
    if (!amount) return
    const row = this.map.get(key)
    if (row) row.cents += amount
    else this.map.set(key, { key, name, cents: amount })
  }
  sum() { return [...this.map.values()].reduce((total, row) => total + row.cents, 0) }
  entries() { return [...this.map.values()] }
  lines(): PayrollLine[] {
    return this.entries().filter(row => row.cents !== 0).map(row => ({ key: row.key, name: row.name, amount: money(row.cents) })).sort(comparePayrollLines)
  }
}

interface ObligationLineRef { id: number; type: 'CREDIT' | 'DEBIT' | null; amount: number }
/** سطور الدفتر المحفوظة مع البند (المحصل فعلًا)؛ المسيرات الأقدم من حماية الصافي تحفظ المعرفات بس = مبلغ القيد. */
function obligationLinesOf(breakdown: Record<string, any>, facts: ReadonlyMap<number, PayrollLineObligationFact>): ObligationLineRef[] {
  const typeOf = (value: unknown) => value === 'CREDIT' ? 'CREDIT' as const : value === 'DEBIT' ? 'DEBIT' as const : null
  if (Array.isArray(breakdown.obligationLines)) {
    return breakdown.obligationLines.filter((line: unknown) => line && typeof line === 'object').map((line: Record<string, unknown>) => {
      const id = Number(line.id)
      return { id, type: typeOf(line.type) ?? typeOf(facts.get(id)?.type), amount: cents(line.collected ?? line.amount ?? facts.get(id)?.amount) }
    })
  }
  if (Array.isArray(breakdown.obligationIds)) {
    return breakdown.obligationIds.map((raw: unknown) => {
      const id = Number(raw), fact = facts.get(id)
      return { id, type: typeOf(fact?.type), amount: cents(fact?.amount) }
    })
  }
  return []
}

/** أرقام قيود الدفتر اللي البند بيشير لها (للتحميل من القاعدة مرة واحدة لكل المسير). */
export function payrollItemObligationIds(item: Pick<PayrollLineItem, 'breakdown'>): number[] {
  const breakdown = parseObject(item.breakdown)
  const raw: unknown[] = Array.isArray(breakdown.obligationLines) ? breakdown.obligationLines.map((line: { id?: unknown } | null) => line?.id)
    : Array.isArray(breakdown.obligationIds) ? breakdown.obligationIds : []
  return [...new Set(raw.map(Number).filter(id => Number.isSafeInteger(id) && id > 0))]
}

function creditLine(fact: PayrollLineObligationFact | undefined): { key: string; name: string } {
  if (!fact) return { key: 'OTHER_ADDITIONS', name: PAYROLL_LINE_NAMES.OTHER_ADDITIONS }
  const label = cleanName(fact.label)
  // بدل دوام أيام العطلات: قيد «بدل» مصدره holiday_work:… — عمود لوحده مهما اختلف تاريخه وساعاته في النص
  if ((fact.sourceRef ?? '').startsWith(HOLIDAY_WORK_SOURCE_PREFIX) || (fact.category === 'allowance' && label.startsWith(HOLIDAY_WORK_LABEL))) {
    return { key: 'HOLIDAY_WORK', name: PAYROLL_LINE_NAMES.HOLIDAY_WORK }
  }
  // البدل المصروف من «تابة البدلات» اسمه = اسم نوع البدل وقت الصرف
  if (fact.category === 'allowance') { const name = label || 'بدل'; return { key: `ALLOWANCE:${name}`, name } }
  if (fact.category === 'bonus' || (fact.bonusRequestId != null && fact.category !== 'bonus_reversal')) {
    const name = cleanName(fact.typeName) || 'مكافأة'
    return { key: `BONUS:${name}`, name }
  }
  const category = fact.category ?? 'other'
  return { key: `CREDIT:${category}`, name: PAYROLL_OBLIGATION_CATEGORY_LABELS[category] ?? PAYROLL_LINE_NAMES.OTHER_ADDITIONS }
}

function debitLine(fact: PayrollLineObligationFact | undefined): { key: string; name: string } {
  if (!fact) return { key: 'OTHER_DEDUCTIONS', name: PAYROLL_LINE_NAMES.OTHER_DEDUCTIONS }
  // الخصم المسجل بنوعه (الجودة، الالتزام…) باسم النوع وقت الطلب
  if (fact.deductionRequestId != null || fact.category === 'typed_deduction') {
    const name = cleanName(fact.typeName) || 'خصم'
    return { key: `TYPED:${name}`, name }
  }
  const category = fact.category ?? 'other'
  return { key: `DEBIT:${category}`, name: PAYROLL_OBLIGATION_CATEGORY_LABELS[category] ?? PAYROLL_LINE_NAMES.OTHER_DEDUCTIONS }
}

/** أيام الوردية الثابتة (flexEnabled = false) من لقطة قواعد الحضور المحفوظة مع البند: نقصها بعد التأخير = انصراف مبكر. */
function fixedShiftDates(breakdown: Record<string, any>): Set<string> {
  const dates = new Set<string>()
  for (const rule of Array.isArray(breakdown.attendanceRules) ? breakdown.attendanceRules : []) {
    if (rule && typeof rule.date === 'string' && parseObject(rule.snapshot).flexEnabled === false) dates.add(rule.date)
  }
  return dates
}

/**
 * يقسم بند مسير محفوظ إلى بنود استحقاق واستقطاع بأسمائها. facts = قيود الدفتر المشار إليها (payrollItemObligationIds).
 * مجموع كل مجموعة = أعمدتها المحفوظة بالقرش، والصافي = netPay.
 */
export function projectPayrollItemLines(item: PayrollLineItem, facts: ReadonlyMap<number, PayrollLineObligationFact> = new Map()): PayrollItemLines {
  const breakdown = parseObject(item.breakdown)
  const earnings = new LineBag(), deductions = new LineBag()

  // ===== الاستحقاقات =====
  const basic = cents(item.basicSalary)
  const allowances = cents(item.allowances)
  // مكونات الراتب الثابتة كما اتحسبت (سكن، انتقال، هاتف، طبيعة عمل، أخرى)؛ لو مجموعها ما يطابقش العمود = سطر واحد «البدلات الثابتة»
  const components = (Array.isArray(breakdown.salaryComponents) ? breakdown.salaryComponents : [])
    .filter((row: any) => row && typeof row.code === 'string' && row.code !== 'BASIC')
  const componentCents = components.reduce((sum: number, row: any) => sum + cents(row.earnedAmount), 0)
  if (components.length && componentCents === allowances && components.every((row: any) => cents(row.earnedAmount) >= 0)) {
    for (const row of components) earnings.add(`SALARY:${row.code}`, cleanName(row.nameAr) || row.code, cents(row.earnedAmount))
  } else earnings.add('SALARY_ALLOWANCES', PAYROLL_LINE_NAMES.SALARY_ALLOWANCES, allowances)
  earnings.add('OVERTIME', PAYROLL_LINE_NAMES.OVERTIME, cents(item.overtimeAmount))

  const obligationLines = obligationLinesOf(breakdown, facts)
  const otherAdditions = cents(item.otherAdditions)
  const credits = new LineBag()
  for (const line of obligationLines.filter(row => row.type === 'CREDIT')) {
    const { key, name } = creditLine(facts.get(line.id))
    credits.add(key, name, line.amount)
  }
  mergeWithRemainder(earnings, credits, otherAdditions, 'OTHER_ADDITIONS', PAYROLL_LINE_NAMES.OTHER_ADDITIONS)

  // ===== الاستقطاعات =====
  deductions.add('LATENESS', PAYROLL_LINE_NAMES.LATENESS, cents(item.latenessDeduction))
  // عمود النقص = انصراف مبكر (أيام الوردية الثابتة) + نقص ساعات (المرنة)، بأيام الخصم المحفوظة بعد «شيل خصم»
  const shortfall = cents(item.shortfallDeduction)
  const fixed = fixedShiftDates(breakdown)
  const days: Array<{ date?: unknown; shortfallAmount?: unknown }> = Array.isArray(breakdown.attendanceDeductions?.days) ? breakdown.attendanceDeductions.days : []
  const earlyRequested = fixed.size ? truncatedCents(days.filter(day => typeof day?.date === 'string' && fixed.has(day.date))
    .reduce((sum, day) => sum + Math.max(0, numberOf(day.shortfallAmount)), 0)) : 0
  const early = Math.max(0, Math.min(shortfall, earlyRequested))
  deductions.add('EARLY_LEAVE', PAYROLL_LINE_NAMES.EARLY_LEAVE, early)
  deductions.add('SHORTFALL', PAYROLL_LINE_NAMES.SHORTFALL, shortfall - early)
  deductions.add('ABSENCE', PAYROLL_LINE_NAMES.ABSENCE, cents(item.absenceDeduction))

  // عمود الإجازة بلا أجر = بدون راتب + الإيقاف + خصم المرضية بنسبها (leaveDeductionLines)؛ لو ما يطابقش = سطر واحد
  const unpaid = cents(item.unpaidLeaveDeduction)
  const leaveLines: Array<{ code?: unknown; amount?: unknown }> = Array.isArray(breakdown.leaveDeductionLines) ? breakdown.leaveDeductionLines.filter((line: unknown) => line && typeof line === 'object') : []
  const leaveCents = leaveLines.reduce((sum, line) => sum + cents(line.amount), 0)
  if (leaveLines.length && leaveCents === unpaid && leaveLines.every(line => cents(line.amount) >= 0)) {
    for (const line of leaveLines) {
      const code = typeof line.code === 'string' ? line.code : ''
      if (code === 'SUSPENSION') deductions.add('SUSPENSION', PAYROLL_LINE_NAMES.SUSPENSION, cents(line.amount))
      else if (code.startsWith('SICK_LEAVE')) deductions.add('SICK_LEAVE', PAYROLL_LINE_NAMES.SICK_LEAVE, cents(line.amount))
      else deductions.add('UNPAID_LEAVE', PAYROLL_LINE_NAMES.UNPAID_LEAVE, cents(line.amount))
    }
  } else deductions.add('UNPAID_LEAVE', PAYROLL_LINE_NAMES.UNPAID_LEAVE, unpaid)

  const debits = new LineBag()
  for (const line of obligationLines.filter(row => row.type === 'DEBIT')) {
    const { key, name } = debitLine(facts.get(line.id))
    debits.add(key, name, line.amount)
  }
  mergeWithRemainder(deductions, debits, cents(item.otherDeductions), 'OTHER_DEDUCTIONS', PAYROLL_LINE_NAMES.OTHER_DEDUCTIONS)
  deductions.add('LOAN', PAYROLL_LINE_NAMES.LOAN, cents(item.loanInstallments))
  deductions.add('SOCIAL_INSURANCE', PAYROLL_LINE_NAMES.SOCIAL_INSURANCE, cents(item.socialInsuranceDeduction))

  const earningLines = earnings.lines()
  // الأساسي يظهر دايمًا (حتى لو صفر) عشان صف الموظف وقسيمته يبدأوا بيه
  if (!earningLines.some(line => line.key === 'BASIC')) earningLines.unshift({ key: 'BASIC', name: PAYROLL_LINE_NAMES.BASIC, amount: money(basic) })
  return {
    earnings: earningLines,
    deductions: deductions.lines(),
    totals: {
      earnings: money(basic + allowances + cents(item.overtimeAmount) + otherAdditions),
      deductions: money(cents(item.latenessDeduction) + shortfall + cents(item.absenceDeduction) + unpaid + cents(item.loanInstallments) +
        cents(item.otherDeductions) + cents(item.socialInsuranceDeduction)),
      net: money(cents(item.netPay)),
    },
  }
}

// سطور الدفتر المفصلة تدخل لو مجموعها ≤ العمود، والباقي سطر صريح؛ لو زادت عن العمود (مسير قديم) العمود كله سطر واحد
function mergeWithRemainder(target: LineBag, detail: LineBag, column: number, key: string, name: string) {
  const split = detail.sum()
  if (split > column || column < 0) { target.add(key, name, column); return }
  for (const row of detail.entries()) target.add(row.key, row.name, row.cents)
  target.add(key, name, column - split)
}

/** أعمدة الجدول: كل بند له مبلغ في صف واحد على الأقل، بالترتيب الثابت (الأساسي أول الاستحقاقات دايمًا لو فيه صفوف). */
export function payrollLineColumns(rows: ReadonlyArray<Pick<PayrollItemLines, 'earnings' | 'deductions'>>): { earnings: PayrollLineColumn[]; deductions: PayrollLineColumn[] } {
  const collect = (pick: (row: Pick<PayrollItemLines, 'earnings' | 'deductions'>) => PayrollLine[]) => {
    const map = new Map<string, PayrollLineColumn>()
    for (const row of rows) for (const line of pick(row)) if (line.amount !== 0 || line.key === 'BASIC') if (!map.has(line.key)) map.set(line.key, { key: line.key, name: line.name })
    return [...map.values()].sort(comparePayrollLines)
  }
  return { earnings: collect(row => row.earnings), deductions: collect(row => row.deductions) }
}

/** قيود الدفتر المشار إليها في البنود (بدفعات 1000) مع اسم نوع الخصم أو المكافأة من لقطة الطلب. */
export async function loadPayrollLineFacts(em: EntityManager, items: ReadonlyArray<Pick<PayrollLineItem, 'breakdown'>>): Promise<Map<number, PayrollLineObligationFact>> {
  const ids = [...new Set(items.flatMap(item => payrollItemObligationIds(item)))].filter(id => Number.isSafeInteger(id) && id > 0 && id <= 2_147_483_647)
  const facts = new Map<number, PayrollLineObligationFact>()
  for (let offset = 0; offset < ids.length; offset += 1000) {
    const chunk = ids.slice(offset, offset + 1000)
    // الأرقام أعداد صحيحة متحقق منها فوق؛ القائمة جوه IN بدل 1000 باراميتر
    const rows: Array<Record<string, unknown>> = await em.query(
      `SELECT o.[id], o.[type], o.[category], o.[label], o.[sourceRef], CONVERT(varchar(40), o.[amount]) AS [amount], o.[deductionRequestId], o.[bonusRequestId],
         COALESCE(CASE WHEN ISJSON(dr.[typeSnapshot]) = 1 THEN JSON_VALUE(dr.[typeSnapshot], '$.nameAr') END, dt.[nameAr],
                  CASE WHEN ISJSON(br.[typeSnapshot]) = 1 THEN JSON_VALUE(br.[typeSnapshot], '$.nameAr') END, bt.[nameAr]) AS [typeName]
       FROM [employee_obligations] o
       LEFT JOIN [deduction_requests] dr ON dr.[id] = o.[deductionRequestId]
       LEFT JOIN [deduction_types] dt ON dt.[id] = dr.[deductionTypeId]
       LEFT JOIN [bonus_requests] br ON br.[id] = o.[bonusRequestId]
       LEFT JOIN [bonus_types] bt ON bt.[id] = br.[bonusTypeId]
       WHERE o.[id] IN (${chunk.join(', ')})`)
    for (const row of rows) {
      const id = Number(row.id)
      facts.set(id, { id, type: (row.type as string) ?? null, category: (row.category as string) ?? null, label: (row.label as string) ?? null,
        sourceRef: (row.sourceRef as string) ?? null, amount: (row.amount as string) ?? null,
        deductionRequestId: row.deductionRequestId == null ? null : Number(row.deductionRequestId),
        bonusRequestId: row.bonusRequestId == null ? null : Number(row.bonusRequestId), typeName: (row.typeName as string) ?? null })
    }
  }
  return facts
}

/** بنود كل صف (بنفس ترتيب المدخلات) بعد تحميل قيود الدفتر مرة واحدة. */
export async function describePayrollItemsLines<T extends PayrollLineItem>(em: EntityManager, items: readonly T[]): Promise<PayrollItemLines[]> {
  const facts = await loadPayrollLineFacts(em, items)
  return items.map(item => projectPayrollItemLines(item, facts))
}
