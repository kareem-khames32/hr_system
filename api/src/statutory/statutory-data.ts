// البيانات الأولية للقيم القانونية المؤرخة (خطة التنفيذ B1.5): من بطاقتي C-SA-01 وC-EG-03 في تحليل الفجوات. مصادرها ثانوية
// (PwC وOracle وFragomen وZenHR وMercans)، فـverified = false لحد ما محاسب أو الجهة نفسها يأكدوها. بتتضاف وقت الإقلاع لو ناقصة،
// والموجود مابيتلمسش (التعديل بعدين من شاشة «حزمة الدولة» في B4.2).

/** مسار التأمينات السعودي الجديد: سعودي أول تسجيل له في التأمينات من 3 يوليو 2024 */
export const SA_GOSI_NEW_TRACK = 'sa.gosi.new_track'
export const SA_GOSI_NEW_TRACK_FROM = '2024-07-03'
/** حدود أجر التأمين المصري (الحد الأدنى والأقصى) */
export const EG_INSURANCE_WAGE_LIMITS = 'eg.insurance.wage_limits'

export interface StatutorySeed {
  country: 'SA' | 'EG'
  key: string
  effectiveFrom: string
  source: string
  values: Record<string, string>
}

const SA_SOURCE = 'C-SA-01: PwC (يوليو 2026) وZenHR وMercans — محتاج تحقق من محاسب أو GOSI'
const saCaps = { min_salary: '1500', max_salary: '45000' }

export const STATUTORY_SEED: readonly StatutorySeed[] = [
  { country: 'SA', key: SA_GOSI_NEW_TRACK, effectiveFrom: '2024-07-03', source: SA_SOURCE, values: { employee_pct: '9.75', employer_pct: '11.75', ...saCaps } },
  { country: 'SA', key: SA_GOSI_NEW_TRACK, effectiveFrom: '2025-07-03', source: SA_SOURCE, values: { employee_pct: '10.25', employer_pct: '12.25', ...saCaps } },
  { country: 'SA', key: SA_GOSI_NEW_TRACK, effectiveFrom: '2026-07-03', source: SA_SOURCE, values: { employee_pct: '10.75', employer_pct: '12.75', ...saCaps } },
  { country: 'SA', key: SA_GOSI_NEW_TRACK, effectiveFrom: '2027-07-03', source: SA_SOURCE, values: { employee_pct: '11.25', employer_pct: '13.25', ...saCaps } },
  { country: 'SA', key: SA_GOSI_NEW_TRACK, effectiveFrom: '2028-07-03', source: SA_SOURCE, values: { employee_pct: '11.75', employer_pct: '13.75', ...saCaps } },
  { country: 'EG', key: EG_INSURANCE_WAGE_LIMITS, effectiveFrom: '2026-01-01', source: 'C-EG-03: PwC — محتاج تحقق من محاسب', values: { min_salary: '2700', max_salary: '16700' } },
  { country: 'EG', key: EG_INSURANCE_WAGE_LIMITS, effectiveFrom: '2027-01-01', source: 'C-EG-03: PwC — محتاج تحقق من محاسب', values: { min_salary: '3200', max_salary: '19300' } },
]
