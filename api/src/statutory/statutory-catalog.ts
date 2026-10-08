import { EG_INSURANCE_WAGE_LIMITS, SA_GOSI_NEW_TRACK } from './statutory-data'

// B4.2: كتالوج «حزمة الدولة» — اسم كل مفتاح وخاناته بالعربي، وبطاقته في تحليل الفجوات، ومين بيقراه في الحساب. المفتاح اللي مالوش قارئ
// (usedBy = null) بيانات مرجعية: تعديلها مابيغيّرش أي مبلغ لحد ما دفعته تربطه ورا إعداد مقفول. خانات كل مفتاح ثابتة: صف جديد أو تعديل
// بنفس الخانات بالظبط.

export type StatutoryCountry = 'EG' | 'SA'
export interface StatutoryKeyInfo {
  country: StatutoryCountry
  key: string
  label: string
  card: string
  /** الحاسبة اللي بتقرا المفتاح دلوقتي (اسمها بالعربي) — null = بيانات مرجعية بس */
  usedBy: string | null
  codes: Record<string, string>
}

const pct = (label: string) => `${label} (%)`
const INSURANCE = 'حساب التأمينات الاجتماعية'

// B4.4: مفتاحي الضريبة بتقراهم المعاينة عند الطلب، وحساب المسير لو إعداد الضريبة مفتوح (مقفول افتراضيًا)؛ وصندوق الشهداء بإعداده
const TAX_PREVIEW = 'ضريبة كسب العمل: المعاينة، والمسير لو إعدادها مفتوح (مقفول افتراضيًا)'
const MARTYRS_FUND = 'صندوق الشهداء في المسير لو إعداده مفتوح (مقفول افتراضيًا)'
// B4.4 (د)
const HEALTH_INSURANCE = 'التأمين الصحي الشامل في المسير لو إعداده مفتوح (مقفول افتراضيًا)'
const TRAINING_FUND = 'تقرير صندوق التدريب السنوي (للعرض بس)'
export const STATUTORY_CATALOG: readonly StatutoryKeyInfo[] = [
  // ===== مصر =====
  { country: 'EG', key: EG_INSURANCE_WAGE_LIMITS, label: 'حدود أجر التأمين', card: 'C-EG-03', usedBy: INSURANCE, codes: { min_salary: 'الحد الأدنى للأجر', max_salary: 'الحد الأقصى للأجر' } },
  { country: 'EG', key: 'eg.insurance.rates', label: 'نسب التأمينات الاجتماعية', card: 'C-EG-03', usedBy: null, codes: { employee_pct: pct('حصة الموظف'), employer_pct: pct('حصة صاحب العمل') } },
  { country: 'EG', key: 'eg.salary_tax.brackets', label: 'ضريبة كسب العمل — الشرائح والإعفاء', card: 'C-EG-01', usedBy: TAX_PREVIEW,
    codes: { personal_exemption: 'الإعفاء الشخصي السنوي', disability_exemption: 'إعفاء ذوي الإعاقة السنوي', tax_year_days: 'أيام السنة الضريبية', band_1_to: 'الشريحة 1 لحد', band_1_pct: pct('الشريحة 1'),
      band_2_to: 'الشريحة 2 لحد', band_2_pct: pct('الشريحة 2'), band_3_to: 'الشريحة 3 لحد', band_3_pct: pct('الشريحة 3'), band_4_to: 'الشريحة 4 لحد', band_4_pct: pct('الشريحة 4'), band_5_to: 'الشريحة 5 لحد',
      band_5_pct: pct('الشريحة 5'), band_6_to: 'الشريحة 6 لحد', band_6_pct: pct('الشريحة 6'), band_top_pct: pct('فوق الشريحة 6'), insurance_premium_max_pct: pct('أقساط التأمين الخاص: حد من الصافي'),
      insurance_premium_max_amount: 'أقساط التأمين الخاص: حد المبلغ' } },
  { country: 'EG', key: 'eg.salary_tax.high_income', label: 'ضريبة كسب العمل — إلغاء الشرائح الدنيا للدخول العالية', card: 'C-EG-01', usedBy: TAX_PREVIEW,
    codes: { tier_1_from: 'الفئة 1: صافي الدخل من', tier_1_first_to: 'الفئة 1: أول', tier_1_first_pct: pct('الفئة 1: نسبة الأول'), tier_2_from: 'الفئة 2: صافي الدخل من', tier_2_first_to: 'الفئة 2: أول',
      tier_2_first_pct: pct('الفئة 2: نسبة الأول'), tier_3_from: 'الفئة 3: صافي الدخل من', tier_3_first_to: 'الفئة 3: أول', tier_3_first_pct: pct('الفئة 3: نسبة الأول'), tier_4_from: 'الفئة 4: صافي الدخل من',
      tier_4_first_to: 'الفئة 4: أول', tier_4_first_pct: pct('الفئة 4: نسبة الأول'), tier_5_from: 'الفئة 5: صافي الدخل من', tier_5_first_to: 'الفئة 5: أول', tier_5_first_pct: pct('الفئة 5: نسبة الأول') } },
  { country: 'EG', key: 'eg.martyrs_fund', label: 'صندوق تكريم الشهداء (مشاركة اجتماعية)', card: 'C-EG-04', usedBy: MARTYRS_FUND, codes: { employee_pct: pct('من إجمالي الراتب') } },
  { country: 'EG', key: 'eg.health_insurance', label: 'التأمين الصحي الشامل', card: 'C-EG-04', usedBy: HEALTH_INSURANCE,
    codes: { employee_pct: pct('حصة الموظف'), employer_pct: pct('حصة صاحب العمل'), spouse_pct: pct('الزوجة غير العاملة'), dependent_pct: pct('لكل معال') } },
  { country: 'EG', key: 'eg.training_fund', label: 'صندوق التدريب', card: 'C-EG-04', usedBy: TRAINING_FUND,
    codes: { pct_of_min_insurance_wage: pct('من الحد الأدنى لأجر التأمين'), min_amount: 'حد أدنى للموظف', max_amount: 'حد أقصى للموظف', min_headcount: 'المنشأة من كام موظف' } },
  { country: 'EG', key: 'eg.leave.annual', label: 'الإجازة السنوية', card: 'C-EG-05', usedBy: null,
    codes: { first_year_days: 'أيام أول سنة', standard_days: 'أيام من السنة التانية', senior_days: 'أيام الشريحة الأعلى', senior_service_years: 'الشريحة الأعلى بعد كام سنة خدمة', senior_age: 'أو من سن',
      disability_days: 'أيام ذوي الإعاقة' } },
  { country: 'EG', key: 'eg.leave.other', label: 'إجازات تانية (عارضة، وضع، أبوة، حج)', card: 'C-EG-05', usedBy: null,
    codes: { casual_days: 'العارضة في السنة', casual_max_per_occasion: 'العارضة: أيام في المرة', maternity_days: 'الوضع بالأيام', maternity_times: 'الوضع: مرات في الخدمة', paternity_days: 'الأبوة بالأيام',
      paternity_times: 'الأبوة: مرات', hajj_months: 'الحج بالشهور', hajj_min_service_years: 'الحج بعد كام سنة خدمة' } },
  { country: 'EG', key: 'eg.overtime', label: 'الإضافي وساعات العمل', card: 'C-EG-06', usedBy: null,
    codes: { day_premium_pct: pct('علاوة إضافي النهار'), night_premium_pct: pct('علاوة إضافي الليل'), rest_day_multiplier: 'معامل يوم الراحة', daily_hours: 'ساعات اليوم', weekly_hours: 'ساعات الأسبوع' } },
  { country: 'EG', key: 'eg.minimum_wage', label: 'الحد الأدنى للأجور (القطاع الخاص)', card: 'C-EG-06', usedBy: null, codes: { monthly_amount: 'المبلغ الشهري' } },
  { country: 'EG', key: 'eg.periodic_raise', label: 'العلاوة الدورية', card: 'C-EG-06', usedBy: null, codes: { min_pct_of_insurance_wage: pct('حد أدنى من أجر التأمين'), min_amount: 'حد أدنى بالمبلغ في الشهر' } },
  { country: 'EG', key: 'eg.deduction_caps', label: 'حدود الخصم من الأجر', card: 'C-EG-07', usedBy: null,
    codes: { loan_installment_pct: pct('قسط سلفة صاحب العمل'), garnishment_pct: pct('الحجز للديون'), alimony_pct: pct('الحجز للنفقة') } },
  { country: 'EG', key: 'eg.termination', label: 'الإخطار والتجربة والإيقاف', card: 'C-EG-07', usedBy: null,
    codes: { notice_months: 'الإخطار بالشهور', resignation_reply_days: 'الرد على الاستقالة بالأيام', probation_max_months: 'أقصى تجربة بالشهور', paid_suspension_max_days: 'أقصى إيقاف احتياطي بأجر بالأيام' } },
  // ===== السعودية =====
  { country: 'SA', key: SA_GOSI_NEW_TRACK, label: 'التأمينات — المسار الجديد', card: 'C-SA-01', usedBy: INSURANCE,
    codes: { employee_pct: pct('حصة الموظف'), employer_pct: pct('حصة صاحب العمل'), min_salary: 'الحد الأدنى للأجر', max_salary: 'الحد الأقصى للأجر' } },
  { country: 'SA', key: 'sa.gosi.old_track', label: 'التأمينات — المسار القديم وغير السعودي', card: 'C-SA-01', usedBy: null,
    codes: { saudi_employee_pct: pct('سعودي: حصة الموظف'), saudi_employer_pct: pct('سعودي: حصة صاحب العمل'), non_saudi_employee_pct: pct('غير سعودي: حصة الموظف'), non_saudi_employer_pct: pct('غير سعودي: حصة صاحب العمل'),
      min_salary: 'الحد الأدنى للأجر', max_salary: 'الحد الأقصى للأجر' } },
  { country: 'SA', key: 'sa.leave.annual', label: 'الإجازة السنوية', card: 'C-SA-06', usedBy: null, codes: { standard_days: 'الأيام', senior_days: 'أيام الشريحة الأعلى', senior_service_years: 'الشريحة الأعلى بعد كام سنة' } },
  { country: 'SA', key: 'sa.leave.other', label: 'إجازات تانية (وضع، أبوة، زواج، وفاة، حج، مرضية)', card: 'C-SA-06', usedBy: null,
    codes: { maternity_weeks: 'الوضع بالأسابيع', paternity_days: 'الأبوة بالأيام', marriage_days: 'الزواج بالأيام', bereavement_days: 'الوفاة بالأيام', sibling_bereavement_days: 'وفاة الأخ أو الأخت بالأيام',
      hajj_min_days: 'الحج: أقل أيام', hajj_max_days: 'الحج: أكتر أيام', hajj_min_service_years: 'الحج بعد كام سنة خدمة', sick_full_days: 'المرضية: أيام بأجر كامل', sick_reduced_days: 'المرضية: أيام بأجر مخفّض',
      sick_reduced_pct: pct('المرضية: نسبة الأجر المخفّض'), sick_unpaid_days: 'المرضية: أيام بدون أجر' } },
  { country: 'SA', key: 'sa.overtime', label: 'الإضافي وساعات العمل', card: 'C-SA-06', usedBy: null,
    codes: { premium_pct_of_basic: pct('علاوة الإضافي من الأساسي'), daily_hours: 'ساعات اليوم', weekly_hours: 'ساعات الأسبوع', ramadan_daily_hours: 'ساعات اليوم في رمضان', ramadan_weekly_hours: 'ساعات الأسبوع في رمضان' } },
  { country: 'SA', key: 'sa.end_of_service', label: 'مكافأة نهاية الخدمة', card: 'C-SA-07', usedBy: null,
    codes: { first_tier_months: 'شهور عن كل سنة في الشريحة الأولى', first_tier_years: 'سنين الشريحة الأولى', later_months: 'شهور عن كل سنة بعدها', resignation_min_years: 'الاستقالة: من غير مكافأة تحت كام سنة',
      resignation_low_fraction: 'الاستقالة: كسر الشريحة الأولى', resignation_mid_years: 'الاستقالة: الشريحة التانية من كام سنة', resignation_mid_fraction: 'الاستقالة: كسر الشريحة التانية', resignation_full_years: 'الاستقالة: كاملة من كام سنة' } },
  { country: 'SA', key: 'sa.deduction_caps', label: 'حدود الخصم من الأجر', card: 'C-SA-07', usedBy: null,
    codes: { loan_installment_pct: pct('قسط سلفة صاحب العمل'), total_pct: pct('مجموع الخصومات'), fine_max_days_per_month: 'الغرامات: أيام أجر في الشهر' } },
  { country: 'SA', key: 'sa.termination', label: 'التجربة والإخطار والاستقالة', card: 'C-SA-06', usedBy: null,
    codes: { probation_max_days: 'أقصى تجربة بالأيام', notice_employee_days: 'إخطار الموظف بالأيام', notice_employer_days: 'إخطار صاحب العمل بالأيام', resignation_silence_days: 'قبول الاستقالة بالسكوت بعد كام يوم' } },
]

export const STATUTORY_COUNTRY_LABELS: Record<StatutoryCountry, string> = { EG: 'مصر', SA: 'السعودية' }
export const statutoryKeyInfo = (country: string, key: string): StatutoryKeyInfo | null => STATUTORY_CATALOG.find((entry) => entry.country === country && entry.key === key) ?? null
