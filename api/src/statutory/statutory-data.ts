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

/** B4.2: بطاقة ماذكرتش تاريخ سريان للقيمة — بتتسجّل بالتاريخ ده (والمصدر بيقول كده)، ومدير النظام يضيف صف بتاريخه الصحيح من «حزمة الدولة» */
export const STATUTORY_UNDATED = '2000-01-01'

const SA_SOURCE ='C-SA-01: PwC (يوليو 2026) وZenHR وMercans — محتاج تحقق من محاسب أو GOSI'
const saCaps = { min_salary: '1500', max_salary: '45000' }

export const STATUTORY_SEED: readonly StatutorySeed[] = [
  { country: 'SA', key: SA_GOSI_NEW_TRACK, effectiveFrom: '2024-07-03', source: SA_SOURCE, values: { employee_pct: '9.75', employer_pct: '11.75', ...saCaps } },
  { country: 'SA', key: SA_GOSI_NEW_TRACK, effectiveFrom: '2025-07-03', source: SA_SOURCE, values: { employee_pct: '10.25', employer_pct: '12.25', ...saCaps } },
  { country: 'SA', key: SA_GOSI_NEW_TRACK, effectiveFrom: '2026-07-03', source: SA_SOURCE, values: { employee_pct: '10.75', employer_pct: '12.75', ...saCaps } },
  { country: 'SA', key: SA_GOSI_NEW_TRACK, effectiveFrom: '2027-07-03', source: SA_SOURCE, values: { employee_pct: '11.25', employer_pct: '13.25', ...saCaps } },
  { country: 'SA', key: SA_GOSI_NEW_TRACK, effectiveFrom: '2028-07-03', source: SA_SOURCE, values: { employee_pct: '11.75', employer_pct: '13.75', ...saCaps } },
  { country: 'EG', key: EG_INSURANCE_WAGE_LIMITS, effectiveFrom: '2026-01-01', source: 'C-EG-03: PwC — محتاج تحقق من محاسب', values: { min_salary: '2700', max_salary: '16700' } },
  { country: 'EG', key: EG_INSURANCE_WAGE_LIMITS, effectiveFrom: '2027-01-01', source: 'C-EG-03: PwC — محتاج تحقق من محاسب', values: { min_salary: '3200', max_salary: '19300' } },

  // ===== B4.2: باقي بيانات بطاقات C — بيانات مرجعية بس: ولا حاسبة بتقراها لحد ما دفعتها (B4.4، B4.5) تربطها ورا إعداد مقفول =====
  // مصر
  { country: 'EG', key: 'eg.insurance.rates', effectiveFrom: '2020-01-01', source: 'C-EG-03: القانون 148/2019 (PwC، Legal 500) — محتاج تحقق من محاسب تأمينات', values: { employee_pct: '11', employer_pct: '18.75' } },
  { country: 'EG', key: 'eg.salary_tax.brackets', effectiveFrom: '2024-03-01', source: 'C-EG-01: قانون 7/2024 (PwC، AHG، ETA) — محتاج تحقق من محاسب',
    values: { personal_exemption: '20000', disability_exemption: '30000', tax_year_days: '360', band_1_to: '40000', band_1_pct: '0', band_2_to: '55000', band_2_pct: '10', band_3_to: '70000', band_3_pct: '15',
      band_4_to: '200000', band_4_pct: '20', band_5_to: '400000', band_5_pct: '22.5', band_6_to: '1200000', band_6_pct: '25', band_top_pct: '27.5', insurance_premium_max_pct: '15', insurance_premium_max_amount: '10000' } },
  { country: 'EG', key: 'eg.salary_tax.high_income', effectiveFrom: '2024-03-01', source: 'C-EG-01: جداول Andersen Egypt والوطن — مااتقرتش من نص القانون ومتعارضة مع صياغة PwC؛ محتاج تحقق',
    values: { tier_1_from: '600001', tier_1_first_to: '55000', tier_1_first_pct: '10', tier_2_from: '700001', tier_2_first_to: '70000', tier_2_first_pct: '15', tier_3_from: '800001', tier_3_first_to: '200000', tier_3_first_pct: '20',
      tier_4_from: '900001', tier_4_first_to: '400000', tier_4_first_pct: '22.5', tier_5_from: '1200001', tier_5_first_to: '1200000', tier_5_first_pct: '25' } },
  { country: 'EG', key: 'eg.martyrs_fund', effectiveFrom: '2021-01-01', source: 'C-EG-04: PwC ودليل ETA — الوعاء محتاج تحقق', values: { employee_pct: '0.05' } },
  { country: 'EG', key: 'eg.health_insurance', effectiveFrom: STATUTORY_UNDATED, source: 'C-EG-04: PwC — من غير تاريخ سريان في البطاقة، والمحافظات المطبّقة محتاجة تحقق', values: { employee_pct: '1', employer_pct: '4', spouse_pct: '3', dependent_pct: '1' } },
  { country: 'EG', key: 'eg.training_fund', effectiveFrom: '2025-09-01', source: 'C-EG-04: قانون 14/2025 (Matouk Bassiouny، EY) — سنوي أرجح، ومصدر بيقول شهري؛ محتاج تحقق',
    values: { pct_of_min_insurance_wage: '0.25', min_amount: '10', max_amount: '30', min_headcount: '30' } },
  { country: 'EG', key: 'eg.leave.annual', effectiveFrom: '2025-09-01', source: 'C-EG-05: قانون 14/2025 (Amereller، Clyde & Co) — محتاج تحقق من مستشار قانوني',
    values: { first_year_days: '15', standard_days: '21', senior_days: '30', senior_service_years: '10', senior_age: '50', disability_days: '45' } },
  { country: 'EG', key: 'eg.leave.other', effectiveFrom: '2025-09-01', source: 'C-EG-05: قانون 14/2025 (Amereller، Matouk Bassiouny، Shehata) — الحج من خبر صحفي؛ محتاج تحقق',
    values: { casual_days: '7', casual_max_per_occasion: '2', maternity_days: '120', maternity_times: '3', paternity_days: '1', paternity_times: '3', hajj_months: '1', hajj_min_service_years: '5' } },
  { country: 'EG', key: 'eg.overtime', effectiveFrom: '2025-09-01', source: 'C-EG-06: مادة 121 (Habib Al Mulla، مصراوي) — خبرين بيقولوا 25% للنهار؛ والقاسم مالوش مصدر؛ محتاج تحقق',
    values: { day_premium_pct: '35', night_premium_pct: '70', rest_day_multiplier: '2', daily_hours: '8', weekly_hours: '48' } },
  { country: 'EG', key: 'eg.minimum_wage', effectiveFrom: '2025-03-01', source: 'C-EG-06: PwC (أغسطس 2026) ومصراوي — محتاج تحقق', values: { monthly_amount: '7000' } },
  { country: 'EG', key: 'eg.periodic_raise', effectiveFrom: '2025-09-01', source: 'C-EG-06: مادة 12 (Habib Al Mulla، مصراوي) — محتاج تحقق', values: { min_pct_of_insurance_wage: '3', min_amount: '250' } },
  { country: 'EG', key: 'eg.deduction_caps', effectiveFrom: '2025-09-01', source: 'C-EG-07: مادتي 113 و114 (Habib Al Mulla، Matouk Bassiouny) — محتاج تحقق من مستشار قانوني',
    values: { loan_installment_pct: '10', garnishment_pct: '25', alimony_pct: '50' } },
  { country: 'EG', key: 'eg.termination', effectiveFrom: '2025-09-01', source: 'C-EG-07: مواد 146 و156 و167 (Habib Al Mulla، Ibrachy & Dermarkar) — محتاج تحقق من مستشار قانوني',
    values: { notice_months: '3', resignation_reply_days: '10', probation_max_months: '3', paid_suspension_max_days: '60' } },
  // السعودية
  { country: 'SA', key: 'sa.gosi.old_track', effectiveFrom: STATUTORY_UNDATED, source: 'C-SA-01: PwC (29 يوليو 2026) — المسجّل قبل 3 يوليو 2024؛ من غير تاريخ سريان في البطاقة؛ محتاج تحقق من محاسب أو GOSI',
    values: { saudi_employee_pct: '9.75', saudi_employer_pct: '11.75', non_saudi_employee_pct: '0', non_saudi_employer_pct: '2', ...saCaps } },
  { country: 'SA', key: 'sa.leave.annual', effectiveFrom: '2025-02-19', source: 'C-SA-06: مادة 109 (هيئة الخبراء، HRSD) — محتاج تحقق من مستشار قانوني', values: { standard_days: '21', senior_days: '30', senior_service_years: '5' } },
  { country: 'SA', key: 'sa.leave.other', effectiveFrom: '2025-02-19', source: 'C-SA-06: تعديلات 2025 (King & Spalding، هيئة الخبراء) — محتاج تحقق من مستشار قانوني',
    values: { maternity_weeks: '12', paternity_days: '3', marriage_days: '5', bereavement_days: '5', sibling_bereavement_days: '3', hajj_min_days: '10', hajj_max_days: '15', hajj_min_service_years: '2',
      sick_full_days: '30', sick_reduced_days: '60', sick_reduced_pct: '75', sick_unpaid_days: '30' } },
  { country: 'SA', key: 'sa.overtime', effectiveFrom: '2025-02-19', source: 'C-SA-06: مادتي 98 و107 (هيئة الخبراء) — قاسم الساعة محتاج تحقق',
    values: { premium_pct_of_basic: '50', daily_hours: '8', weekly_hours: '48', ramadan_daily_hours: '6', ramadan_weekly_hours: '36' } },
  { country: 'SA', key: 'sa.end_of_service', effectiveFrom: STATUTORY_UNDATED, source: 'C-SA-07: مادتي 84 و85 (HRSD) — من غير تاريخ سريان في البطاقة؛ وعاء الأجر وكسر السنة محتاجين تحقق',
    values: { first_tier_months: '0.5', first_tier_years: '5', later_months: '1', resignation_min_years: '2', resignation_low_fraction: '0.3333', resignation_mid_years: '5', resignation_mid_fraction: '0.6667', resignation_full_years: '10' } },
  { country: 'SA', key: 'sa.deduction_caps', effectiveFrom: STATUTORY_UNDATED, source: 'C-SA-07: مواد 70 و92 و93 (HRSD) — من غير تاريخ سريان في البطاقة؛ محتاج تحقق',
    values: { loan_installment_pct: '10', total_pct: '50', fine_max_days_per_month: '5' } },
  { country: 'SA', key: 'sa.termination', effectiveFrom: '2025-02-19', source: 'C-SA-06: تعديلات 2025 (King & Spalding، هيئة الخبراء) — محتاج تحقق من مستشار قانوني',
    values: { probation_max_days: '180', notice_employee_days: '30', notice_employer_days: '60', resignation_silence_days: '30' } },
]
