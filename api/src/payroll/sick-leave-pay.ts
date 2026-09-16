import { PayrollDecimal } from './payroll-decimal'

/**
 * أجر الإجازة المرضية المتدرج (قرار المالك 16 سبتمبر): كل يوم مرضي معتمد يأخذ ترتيبه بين أيام المرض المعتمدة للموظف
 * في نفس السنة الميلادية (بالتاريخ، شاملًا ما سبق الفترة)، ونسبة أجره من شرائح نوعه؛ الخصم = سعر اليوم × (100 − النسبة)/100.
 * الأيام بأجر كامل لا تضيف شيئًا، واليوم المسجل أصلًا بدون راتب (isUnpaid) يُعدّ في الترتيب ولا يُخصم مرتين.
 * حساب نقي بلا قاعدة بيانات.
 */
export interface SickPayTier { fromDay: number; toDay: number | null; payPercent: number }
export const DEFAULT_SICK_PAY_TIERS: readonly SickPayTier[] = Object.freeze([
  { fromDay: 1, toDay: 30, payPercent: 100 },
  { fromDay: 31, toDay: 90, payPercent: 75 },
  { fromDay: 91, toDay: null, payPercent: 0 },
])

/** الشرائح المحفوظة JSON؛ الفارغ أو التالف = الافتراضي (1-30 كامل، 31-90 بـ75%، 91+ بلا أجر). */
export function parseSickPayTiers(raw: string | null | undefined): SickPayTier[] {
  if (!raw || !String(raw).trim()) return DEFAULT_SICK_PAY_TIERS.map(tier => ({ ...tier }))
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed) || !parsed.length) throw new Error('empty')
    const tiers = parsed.map((row: any) => {
      const fromDay = Number(row?.fromDay), toDay = row?.toDay === null || row?.toDay === undefined || row?.toDay === '' ? null : Number(row.toDay)
      const payPercent = Number(row?.payPercent)
      if (!Number.isInteger(fromDay) || fromDay < 1 || (toDay !== null && (!Number.isInteger(toDay) || toDay < fromDay)) ||
        !Number.isFinite(payPercent) || payPercent < 0 || payPercent > 100) throw new Error('invalid')
      return { fromDay, toDay, payPercent: Math.round(payPercent * 100) / 100 }
    })
    return tiers.sort((a, b) => a.fromDay - b.fromDay)
  } catch {
    return DEFAULT_SICK_PAY_TIERS.map(tier => ({ ...tier }))
  }
}

/** نسبة الأجر لليوم رقم dayNumber من أيام المرض في السنة؛ يوم خارج كل الشرائح = أجر كامل. */
export function sickPayPercentForDay(tiers: readonly SickPayTier[], dayNumber: number): number {
  const tier = tiers.find(row => dayNumber >= row.fromDay && (row.toDay === null || dayNumber <= row.toDay))
  return tier ? tier.payPercent : 100
}

export interface SickLeaveRow {
  id: number; leaveTypeCode: string; fromDate: string; toDate: string
  period?: string | null; isUnpaid: boolean; status?: string
}
export interface SickLeaveDay {
  date: string; leaveId: number; leaveTypeCode: string
  /** ترتيب اليوم بين أيام المرض المعتمدة في سنته (نصف اليوم يُعدّ نصفًا ويأخذ رقم اليوم الذي يقع فيه) */
  dayNumber: number; fraction: number; payPercent: number
  /** NONE أجر كامل · DEDUCTED خصم بالنسبة · UNPAID مسجل بدون راتب (يُخصم كاملًا في بند الإجازة بلا أجر) · EXEMPT لا يُخصم بقرار الاستثناء */
  status: 'NONE' | 'DEDUCTED' | 'UNPAID' | 'EXEMPT'
}

const DAY = 86400000
const isoDay = (time: number) => new Date(time).toISOString().slice(0, 10)

/** أيام الإجازات المرضية داخل [coverFrom, coverTo] بترتيب كل يوم في سنته. الإجازات المُمرَّرة يجب أن تشمل كل مرض السنة قبل الفترة. */
export function sickLeaveDaysInCover(input: {
  leaves: readonly SickLeaveRow[]; tiersByCode: ReadonlyMap<string, readonly SickPayTier[]>; coverFrom: string; coverTo: string
  deductible?: (date: string) => boolean
}): SickLeaveDay[] {
  const expanded: Array<{ date: string; leave: SickLeaveRow; fraction: number }> = []
  for (const leave of input.leaves) {
    if (leave.status !== undefined && leave.status !== 'APPROVED') continue
    const fraction = (leave.period ?? 'FULL') === 'FULL' ? 1 : 0.5
    const last = leave.toDate > input.coverTo ? input.coverTo : leave.toDate
    for (let time = Date.parse(`${leave.fromDate}T12:00:00Z`); time <= Date.parse(`${last}T12:00:00Z`); time += DAY) {
      expanded.push({ date: isoDay(time), leave, fraction })
    }
  }
  expanded.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.leave.id - b.leave.id)
  // بالأنصاف لتفادي كسور الأعداد الثنائية
  const halvesByYear = new Map<string, number>()
  const days: SickLeaveDay[] = []
  for (const row of expanded) {
    const year = row.date.slice(0, 4)
    const halves = (halvesByYear.get(year) ?? 0) + row.fraction * 2
    halvesByYear.set(year, halves)
    if (row.date < input.coverFrom) continue
    const dayNumber = Math.ceil(halves / 2)
    const tiers = input.tiersByCode.get(row.leave.leaveTypeCode) ?? DEFAULT_SICK_PAY_TIERS
    const payPercent = sickPayPercentForDay(tiers, dayNumber)
    const status: SickLeaveDay['status'] = row.leave.isUnpaid ? 'UNPAID' : payPercent >= 100 ? 'NONE'
      : input.deductible && !input.deductible(row.date) ? 'EXEMPT' : 'DEDUCTED'
    days.push({ date: row.date, leaveId: row.leave.id, leaveTypeCode: row.leave.leaveTypeCode, dayNumber, fraction: row.fraction, payPercent, status })
  }
  return days
}

export interface SickLeaveDeductionLine { payPercent: number; days: number; amount: number; label: string }
export interface SickLeaveDeduction {
  /** أيام مكافئة للخصم = Σ الكسر × (100 − النسبة)/100 — نص عشري دقيق */
  equivalentDays: string
  amount: number
  lines: SickLeaveDeductionLine[]
  days: SickLeaveDay[]
  exemptDays: number
}

export const sickLeaveDeductionLabel = (payPercent: number) => `خصم إجازة مرضية (بنسبة أجر ${payPercent}%)`

/**
 * خصم الإجازة المرضية للفترة. المبلغ الإجمالي = تقريب (الأيام المكافئة × الإجمالي ÷ أساس الشهر) بدقة كسرية
 * (نفس ما يحسبه محرك السياسة لبند الإجازة بلا أجر)، والسطور لكل نسبة أجر، وفرق التقريب على آخر سطر.
 */
export function sickLeaveDeduction(days: readonly SickLeaveDay[], grossCents: number, monthlyDays: number): SickLeaveDeduction {
  const dayRate = new PayrollDecimal(BigInt(Math.round(grossCents)), BigInt(100 * monthlyDays))
  const byPercent = new Map<number, { days: number; equivalent: PayrollDecimal }>()
  let equivalent = new PayrollDecimal(0n)
  for (const day of days) {
    if (day.status !== 'DEDUCTED') continue
    const share = PayrollDecimal.from(String(day.fraction)).multiply(PayrollDecimal.from('100').subtract(PayrollDecimal.from(String(day.payPercent))))
      .divide(PayrollDecimal.from('100'))
    equivalent = equivalent.add(share)
    const bucket = byPercent.get(day.payPercent) ?? { days: 0, equivalent: new PayrollDecimal(0n) }
    bucket.days += day.fraction
    bucket.equivalent = bucket.equivalent.add(share)
    byPercent.set(day.payPercent, bucket)
  }
  const amount = Number(equivalent.multiply(dayRate).format(2, 'DOWN'))
  const lines = [...byPercent.entries()].sort((a, b) => b[0] - a[0]).map(([payPercent, bucket]) => ({ payPercent, days: bucket.days,
    amount: Number(bucket.equivalent.multiply(dayRate).format(2, 'DOWN')), label: sickLeaveDeductionLabel(payPercent) }))
  if (lines.length) {
    const residualCents = Math.round(amount * 100) - lines.reduce((sum, line) => sum + Math.round(line.amount * 100), 0)
    lines[lines.length - 1].amount = (Math.round(lines[lines.length - 1].amount * 100) + residualCents) / 100
  }
  return { equivalentDays: equivalent.format(6, 'HALF_UP').replace(/\.?0+$/, '') || '0', amount, lines, days: [...days],
    exemptDays: days.filter(day => day.status === 'EXEMPT').reduce((sum, day) => sum + day.fraction, 0) }
}

export interface PayrollLeaveDeductionLine { code: string; label: string; days: number; payPercent: number | null; amount: number }
const cents = (value: number) => Math.round(value * 100)

/**
 * سطور عمود «الإجازة بلا أجر» للتفصيل والقسيمة: «إجازة بدون راتب» ثم خصم المرضية لكل نسبة أجر.
 * total = العمود المصروف؛ فرق تقريب المجموع على آخر سطر مرضي، فمجموع السطور = العمود دائمًا.
 */
export function payrollLeaveDeductionLines(total: number, unpaidOnly: number, unpaidDays: number, sickLines: readonly SickLeaveDeductionLine[]) {
  const unpaidCents = sickLines.length ? Math.min(cents(unpaidOnly), cents(total)) : cents(total)
  const sickCents = Math.max(0, cents(total) - unpaidCents)
  const fitted = sickLines.map(line => ({ ...line }))
  if (fitted.length) {
    const residual = sickCents - fitted.reduce((sum, line) => sum + cents(line.amount), 0)
    fitted[fitted.length - 1].amount = (cents(fitted[fitted.length - 1].amount) + residual) / 100
  }
  const lines: PayrollLeaveDeductionLine[] = [
    ...(unpaidDays > 0 || unpaidCents > 0 ? [{ code: 'UNPAID_LEAVE', label: 'إجازة بدون راتب', days: unpaidDays, payPercent: 0, amount: unpaidCents / 100 }] : []),
    ...fitted.map(line => ({ code: `SICK_LEAVE_${line.payPercent}`, label: line.label, days: line.days, payPercent: line.payPercent, amount: line.amount })),
  ]
  return { lines, sickAmount: sickCents / 100, sickLines: fitted }
}
