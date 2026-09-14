// EMP-4 وSPEC⑥: المكونات مستقلة؛ «أخرى» ليست مجموع الهاتف وطبيعة العمل.
export const MONTHLY_SALARY_COMPONENTS = [
  { key: 'basicSalary', code: 'BASIC', nameAr: 'الراتب الأساسي', nameEn: 'Basic Salary' },
  { key: 'housingAllowance', code: 'HOUSING', nameAr: 'بدل السكن', nameEn: 'Housing Allowance' },
  { key: 'transportAllowance', code: 'TRANSPORT', nameAr: 'بدل الانتقال', nameEn: 'Transport Allowance' },
  { key: 'phoneAllowance', code: 'PHONE', nameAr: 'بدل الهاتف', nameEn: 'Phone Allowance' },
  { key: 'workNatureAllowance', code: 'WORK_NATURE', nameAr: 'بدل طبيعة العمل', nameEn: 'Work Nature Allowance' },
  { key: 'otherAllowance', code: 'OTHER', nameAr: 'بدلات أخرى', nameEn: 'Other Allowances' },
] as const

export function grossMonthlySalary(employee: {
  basicSalary?: number | string | null
  housingAllowance?: number | string | null
  transportAllowance?: number | string | null
  phoneAllowance?: number | string | null
  workNatureAllowance?: number | string | null
  otherAllowance?: number | string | null
}): number {
  return MONTHLY_SALARY_COMPONENTS.reduce(
    (total, component) => total + Number(employee[component.key] ?? 0), 0)
}
