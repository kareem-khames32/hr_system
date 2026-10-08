import { statutoryNumber, verifiedStatutoryAt, type StatutoryEntry } from '../statutory/statutory'

// B4.5 (ب): الحد القانوني لمعامل الإضافي من حزمة الدولة (C-EG-06، C-SA-06) — حساب نقي من غير قاعدة بيانات.
// معاملات الشركة (overtime.multiplier_*) سياسة الشركة وبتفضل زي ما هي؛ والإعداد ده لما يتفتح بيخلّي تسعير الإضافي الجديد ياخد الأعلى من
// معامل الشركة والحد القانوني لدولة فرع الموظف. الإعداد مقفول (الافتراضي) = معامل الشركة بالحرف.
//  - مصر: الأجر + نسبة النهار في يوم العمل، ومعامل يوم الراحة في الراحة. العطلة الرسمية مالهاش رقم مؤكد في الحزمة = معامل الشركة.
//    (إضافي الليل محتاج تعريف «الليل» — مش في الحزمة، فمش محسوب.)
//  - السعودية: أجر الساعة + نسبة من **الأساسي** — يعني على إجمالي الموظف: 1 + النسبة × (الأساسي ÷ الإجمالي)، لأي نوع يوم.

export const OVERTIME_LEGAL_MINIMUM_KEY = 'overtime.legal_minimum.enabled'
export const EG_OVERTIME_KEY = 'eg.overtime'
export const SA_OVERTIME_KEY = 'sa.overtime'

export type LegalOvertimeDayKind = 'WEEKDAY' | 'WEEKEND' | 'HOLIDAY'
export interface LegalOvertimeMinimum {
  /** الحد القانوني كمعامل على سعر ساعة الإجمالي، مقرّب لفوق لمنزلتين (دقة عمود المعامل) */
  multiplier: number
  country: 'EG' | 'SA'
  key: string
  effectiveFrom: string
  verified: boolean
}

/** لفوق لمنزلتين: الحد القانوني مايتقربش لتحت */
const ceil2 = (value: number) => Math.ceil(value * 100 - 1e-9) / 100

/** الحد القانوني لمعامل الإضافي يوم date، أو null لو الدولة أو نوع اليوم مالوش حد في الحزمة — أو صف اليوم ده «محتاج تحقق» (P4A-B01) */
export function legalOvertimeMinimum(input: { country: string | null | undefined; dayKind: LegalOvertimeDayKind; basicSalary: number; grossSalary: number },
  entries: readonly StatutoryEntry[], date: string): LegalOvertimeMinimum | null {
  if (input.country === 'EG') {
    const row = verifiedStatutoryAt(entries, 'EG', EG_OVERTIME_KEY, date)
    const premium = statutoryNumber(row, 'day_premium_pct'), rest = statutoryNumber(row, 'rest_day_multiplier')
    const multiplier = input.dayKind === 'WEEKDAY' ? (premium === null ? null : 1 + premium / 100) : input.dayKind === 'WEEKEND' ? rest : null
    return row && multiplier !== null && multiplier > 0 ? { multiplier: ceil2(multiplier), country: 'EG', key: EG_OVERTIME_KEY, effectiveFrom: row.effectiveFrom, verified: row.verified } : null
  }
  if (input.country === 'SA') {
    const row = verifiedStatutoryAt(entries, 'SA', SA_OVERTIME_KEY, date)
    const premium = statutoryNumber(row, 'premium_pct_of_basic')
    if (!row || premium === null || !(input.grossSalary > 0) || !(input.basicSalary >= 0)) return null
    return { multiplier: ceil2(1 + premium / 100 * Math.min(1, input.basicSalary / input.grossSalary)), country: 'SA', key: SA_OVERTIME_KEY, effectiveFrom: row.effectiveFrom, verified: row.verified }
  }
  return null
}

/** لقطة الحد القانوني في أدلة الإضافي لما هو اللي اتطبق (أعلى من معامل الشركة) */
export interface AppliedLegalOvertimeMinimum extends LegalOvertimeMinimum { companyMultiplier: number }

/** المعامل المطبّق: الأعلى من معامل الشركة والحد القانوني. applied = null لما معامل الشركة هو الأعلى أو مفيش حد */
export function overtimeMultiplierWithLegalMinimum(companyMultiplier: number, legal: LegalOvertimeMinimum | null): { multiplier: number; applied: AppliedLegalOvertimeMinimum | null } {
  return legal && legal.multiplier > companyMultiplier ? { multiplier: legal.multiplier, applied: { ...legal, companyMultiplier } } : { multiplier: companyMultiplier, applied: null }
}
