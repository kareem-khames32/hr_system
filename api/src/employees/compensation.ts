// EMP-4 وSPEC⑥: المكونات مستقلة؛ «أخرى» ليست مجموع الهاتف وطبيعة العمل.
// المكونات الست دي هي «أساس المؤثرات»: سعر اليوم والساعة (الإضافي وخصومات الحضور والخصومات بالأيام)، والإجازة بلا أجر،
// وسقف الخصم وأرضية الصافي، ومكافأة نهاية الخدمة، ومحرك السياسة وتكافؤه — كلهم عليها هي بس.
export const MONTHLY_SALARY_COMPONENTS = [
  { key: 'basicSalary', code: 'BASIC', nameAr: 'الراتب الأساسي', nameEn: 'Basic Salary' },
  { key: 'housingAllowance', code: 'HOUSING', nameAr: 'بدل السكن', nameEn: 'Housing Allowance' },
  { key: 'transportAllowance', code: 'TRANSPORT', nameAr: 'بدل الانتقال', nameEn: 'Transport Allowance' },
  { key: 'phoneAllowance', code: 'PHONE', nameAr: 'بدل الهاتف', nameEn: 'Phone Allowance' },
  { key: 'workNatureAllowance', code: 'WORK_NATURE', nameAr: 'بدل طبيعة العمل', nameEn: 'Work Nature Allowance' },
  { key: 'otherAllowance', code: 'OTHER', nameAr: 'بدلات أخرى', nameEn: 'Other Allowances' },
] as const

// بدل ضغط العمل (قرار المالك 26 سبتمبر): خانة في راتب الموظف بتتصرف معاه كل شهر وبتظهر له في بيانات راتبه وقسيمته،
// بس «من غير مؤثرات» — برّه كل أساس فوق: لا إضافي ولا خصومات ولا سقف ولا تأمينات ولا نهاية خدمة.
// التعديل الوحيد عليه تناسب أيام الخدمة للي اتعيّن أو خرج في نص الفترة، بنفس أساس باقي الراتب.
export const WORK_PRESSURE_ALLOWANCE = { key: 'workPressureAllowance', code: 'WORK_PRESSURE', nameAr: 'بدل ضغط العمل', nameEn: 'Work Pressure Allowance' } as const

// كل مكونات الراتب المصروفة (الست + بدل ضغط العمل): للعرض والتصدير والتحديث الجماعي وسجل الأجر المؤرخ — مش أساس لأي مؤثر.
export const PAID_SALARY_COMPONENTS = [...MONTHLY_SALARY_COMPONENTS, WORK_PRESSURE_ALLOWANCE] as const

type SalaryAmounts = {
  basicSalary?: number | string | null
  housingAllowance?: number | string | null
  transportAllowance?: number | string | null
  phoneAllowance?: number | string | null
  workNatureAllowance?: number | string | null
  otherAllowance?: number | string | null
  workPressureAllowance?: number | string | null
}

/** إجمالي المكونات الست = أساس المؤثرات (مكافأة نهاية الخدمة وبدل رصيد الإجازة وسعر اليوم) — من غير بدل ضغط العمل. */
export function grossMonthlySalary(employee: SalaryAmounts): number {
  return MONTHLY_SALARY_COMPONENTS.reduce(
    (total, component) => total + Number(employee[component.key] ?? 0), 0)
}

/** الإجمالي المصروف كل شهر = المكونات الست + بدل ضغط العمل (خطابات الراتب وبيان الراتب). */
export function paidMonthlySalary(employee: SalaryAmounts): number {
  return grossMonthlySalary(employee) + Number(employee.workPressureAllowance ?? 0)
}
