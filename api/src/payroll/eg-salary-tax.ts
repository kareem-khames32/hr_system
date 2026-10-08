import { statutoryAt, statutoryNumber, type StatutoryEntry } from '../statutory/statutory'
import type { PayrollItemLines } from './payroll-item-lines'
import { salaryItemCodeOf } from './salary-items'

// B4.4 (أ): ضريبة كسب العمل المصرية (C-EG-01) — حساب نقي من غير قاعدة بيانات.
// الشرائح والإعفاء وجدول إلغاء الشرائح الدنيا من حزمة الدولة (B4.2) بقاعدة التاريخ الفعّال: الصف الساري في آخر يوم في الفترة.
// الطريقة تراكمية على سنة 360 يوم: صافي الدخل من أول السنة × (360 ÷ الأيام) ← ناقص الإعفاء ← الشرائح ← × (الأيام ÷ 360) ← ناقص ضريبة
// الفترات اللي فاتت. الشهر الكامل 30 يوم، والمتعيّن أو الخارج في نص الفترة بأيام خدمته (لحد 30).
// الأرقام كلها «محتاجة تحقق» لحد ما محاسب يراجعها في حزمة الدولة — والحساب ده مابيدخلش مسير غير ورا إعداده المقفول (الجزء ب).

export const EG_TAX_COUNTRY = 'EG'
export const EG_TAX_BRACKETS_KEY = 'eg.salary_tax.brackets'
export const EG_TAX_HIGH_INCOME_KEY = 'eg.salary_tax.high_income'
/** أيام الشهر الكامل في سنة الضريبة (360 ÷ 12) */
export const EG_TAX_MONTH_DAYS = 30

export interface EgTaxBand { to: number; pct: number }
/** دخل سنوي من from وطالع: أول firstTo من الوعاء بنسبة firstPct بدل الشرائح الأدنى */
export interface EgTaxTier { from: number; firstTo: number; firstPct: number }
export interface EgTaxTable {
  exemption: number
  yearDays: number
  /** الشرائح بالترتيب: كل واحدة لحد to بنسبتها */
  bands: EgTaxBand[]
  /** نسبة اللي فوق آخر شريحة */
  topPct: number
  tiers: EgTaxTier[]
  /** «ساري من» لصف الشرائح، وهل الصفين (الشرائح وجدول الدخول العالية) اتأكدوا */
  effectiveFrom: string
  verified: boolean
}

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

/** جدول الضريبة الساري يوم date، أو null لو صف الشرائح مش موجود أو ناقص (الحساب مايتعملش بجدول ناقص) */
export function egTaxTableAt(entries: readonly StatutoryEntry[], date: string): EgTaxTable | null {
  const row = statutoryAt(entries, EG_TAX_COUNTRY, EG_TAX_BRACKETS_KEY, date)
  const exemption = statutoryNumber(row, 'personal_exemption'), yearDays = statutoryNumber(row, 'tax_year_days'), topPct = statutoryNumber(row, 'band_top_pct')
  if (!row || exemption === null || !yearDays || topPct === null) return null
  const bands: EgTaxBand[] = []
  for (let index = 1; index <= 20; index++) {
    const to = statutoryNumber(row, `band_${index}_to`), pct = statutoryNumber(row, `band_${index}_pct`)
    if (to === null || pct === null) break
    if (bands.length && to <= bands[bands.length - 1].to) return null
    bands.push({ to, pct })
  }
  if (!bands.length) return null
  const high = statutoryAt(entries, EG_TAX_COUNTRY, EG_TAX_HIGH_INCOME_KEY, date)
  const tiers: EgTaxTier[] = []
  for (let index = 1; index <= 20; index++) {
    const from = statutoryNumber(high, `tier_${index}_from`), firstTo = statutoryNumber(high, `tier_${index}_first_to`), firstPct = statutoryNumber(high, `tier_${index}_first_pct`)
    if (from === null || firstTo === null || firstPct === null) break
    tiers.push({ from, firstTo, firstPct })
  }
  return { exemption, yearDays, bands, topPct, tiers: tiers.sort((left, right) => left.from - right.from), effectiveFrom: row.effectiveFrom, verified: row.verified && (!high || high.verified) }
}

/**
 * الضريبة السنوية على وعاء سنوي (بعد الإعفاء). الدخول العالية: أعلى درجة وعاؤها وصل حدها بتلغي الشرائح الأدنى — أول firstTo بنسبة
 * firstPct، والباقي بشرائحه العادية.
 */
export function egAnnualTax(taxable: number, table: EgTaxTable): number {
  if (!(taxable > 0)) return 0
  const tier = [...table.tiers].reverse().find((entry) => taxable >= entry.from)
  let tax = 0, floor = 0
  if (tier) { tax += Math.min(taxable, tier.firstTo) * tier.firstPct / 100; floor = tier.firstTo }
  for (const band of table.bands) {
    if (band.to <= floor) continue
    if (taxable <= floor) break
    tax += (Math.min(taxable, band.to) - floor) * band.pct / 100
    floor = band.to
  }
  if (taxable > floor) tax += (taxable - floor) * table.topPct / 100
  return round2(tax)
}

export interface EgPeriodTaxInput {
  /** صافي الدخل الخاضع في الفترة دي، وأيامها (30 للشهر الكامل) */
  netIncome: number
  days: number
  /** من أول السنة الضريبية قبل الفترة دي: صافي الدخل، والأيام، والضريبة اللي اتخصمت */
  ytdNetIncome?: number
  ytdDays?: number
  ytdTax?: number
}
export interface EgPeriodTax {
  days: number
  cumulativeNetIncome: number
  cumulativeDays: number
  annualized: number
  exemption: number
  taxable: number
  annualTax: number
  cumulativeTax: number
  /** ضريبة الفترة = ضريبة التراكمي − اللي اتخصم قبل كده (مش أقل من صفر) */
  tax: number
}

/** ضريبة فترة بالطريقة التراكمية. فترة من غير أيام (مفيش خدمة فيها) ضريبتها صفر */
export function egPeriodTax(input: EgPeriodTaxInput, table: EgTaxTable): EgPeriodTax {
  const days = Math.max(0, Math.min(EG_TAX_MONTH_DAYS, Math.round(input.days)))
  const cumulativeDays = Math.max(0, Math.round(input.ytdDays ?? 0)) + days
  const cumulativeNetIncome = round2((input.ytdNetIncome ?? 0) + input.netIncome)
  if (!days || !cumulativeDays) {
    return { days, cumulativeNetIncome, cumulativeDays, annualized: 0, exemption: table.exemption, taxable: 0, annualTax: 0, cumulativeTax: 0, tax: 0 }
  }
  const annualized = round2(Math.max(0, cumulativeNetIncome) * table.yearDays / cumulativeDays)
  const taxable = round2(Math.max(0, annualized - table.exemption))
  const annualTax = egAnnualTax(taxable, table)
  const cumulativeTax = round2(annualTax * cumulativeDays / table.yearDays)
  return { days, cumulativeNetIncome, cumulativeDays, annualized, exemption: table.exemption, taxable, annualTax, cumulativeTax, tax: round2(Math.max(0, cumulativeTax - (input.ytdTax ?? 0))) }
}

/**
 * صافي الدخل الخاضع لبند مسير من سطور قسيمته: الاستحقاقات اللي بندها «خاضع للضريبة» ناقص الاستقطاعات اللي بندها «بيقلل الوعاء»
 * (خصومات الحضور، الإجازة بدون راتب، حصة التأمينات). السطر اللي مالوش بند مابيتحسبش.
 */
export function egNetIncomeOfLines(lines: Pick<PayrollItemLines, 'earnings' | 'deductions'>, taxable: ReadonlyMap<string, boolean>): number {
  const sum = (list: PayrollItemLines['earnings']) => list.reduce((total, line) => {
    const code = salaryItemCodeOf(line.key)
    return code && taxable.get(code) === true ? total + Math.round(line.amount * 100) : total
  }, 0)
  return (sum(lines.earnings) - sum(lines.deductions)) / 100
}

/**
 * أيام الفترة للضريبة من تفصيل بند المسير: الشهر الكامل 30، والجزئي (تعيين أو خروج في نص الفترة) بنسبة تناسب راتبه نفسها
 * (prorataFactor المحفوظ مع البند × 30). بند من غير النسبة (مسير قديم) = شهر كامل.
 */
export function egTaxDaysOf(breakdown: { prorataFactor?: unknown } | null | undefined): number {
  const factor = typeof breakdown?.prorataFactor === 'number' ? breakdown.prorataFactor : NaN
  if (!Number.isFinite(factor) || factor >= 1) return EG_TAX_MONTH_DAYS
  return Math.max(0, Math.round(factor * EG_TAX_MONTH_DAYS))
}
