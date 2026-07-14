// ============================================================
// كتالوج متغيّرات محرك الرواتب — الأسماء المتاحة للمعادلات والبنود.
// يُبنى قاموسها لكل موظف في buildContext()، وتُستخدم أسماؤها في:
//   - التحقق من المعادلات (validateFormula)
//   - رقائق المتغيّرات في محرّر السياسة (الواجهة)
// ============================================================

export interface PayrollVariable {
  code: string
  nameAr: string
  group: 'salary' | 'rates' | 'attendance' | 'financial'
}

export const PAYROLL_VARIABLES: PayrollVariable[] = [
  // الراتب والبدلات (من ملف الموظف)
  { code: 'BASIC', nameAr: 'الراتب الأساسي', group: 'salary' },
  { code: 'HOUSING', nameAr: 'بدل السكن', group: 'salary' },
  { code: 'TRANSPORT', nameAr: 'بدل الانتقال', group: 'salary' },
  { code: 'OTHER_ALLOWANCE', nameAr: 'بدلات أخرى', group: 'salary' },
  { code: 'GROSS', nameAr: 'الإجمالي (أساسي + بدلات)', group: 'salary' },
  // المعدلات المشتقة
  { code: 'DAY_RATE', nameAr: 'قيمة اليوم', group: 'rates' },
  { code: 'HOUR_RATE', nameAr: 'قيمة الساعة', group: 'rates' },
  { code: 'MINUTE_RATE', nameAr: 'قيمة الدقيقة', group: 'rates' },
  { code: 'MONTHLY_DAYS', nameAr: 'أيام الشهر (المقام)', group: 'rates' },
  { code: 'DAILY_HOURS', nameAr: 'ساعات اليوم (المقام)', group: 'rates' },
  // الحضور
  { code: 'LATE_MINUTES', nameAr: 'إجمالي دقائق التأخير', group: 'attendance' },
  { code: 'LATE_DAYS', nameAr: 'عدد أيام التأخير', group: 'attendance' },
  { code: 'ABSENT_DAYS', nameAr: 'أيام الغياب بلا إذن', group: 'attendance' },
  { code: 'UNPAID_LEAVE_DAYS', nameAr: 'أيام الإجازة بدون راتب', group: 'attendance' },
  { code: 'WORKED_DAYS', nameAr: 'أيام العمل الفعلية', group: 'attendance' },
  // المالية
  { code: 'OT_HOURS', nameAr: 'ساعات الأوفرتايم المدفوعة', group: 'financial' },
  { code: 'OT_AMOUNT', nameAr: 'قيمة الأوفرتايم (بمعدلاته)', group: 'financial' },
  { code: 'LOAN_DUE', nameAr: 'أقساط السلف المستحقة', group: 'financial' },
]

export const PAYROLL_VARIABLE_CODES = PAYROLL_VARIABLES.map((v) => v.code)
