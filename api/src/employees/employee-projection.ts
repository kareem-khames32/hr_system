import type { JwtPayload } from '../auth/auth.service'
import { userHasPerm } from '../auth/guards'
import type { EmployeeStatusHistory } from '../requests/entities/employment.entities'
import type { Employee } from './employee.entity'
import { historyWithLegacyLabels, FINANCIAL_CHANGE_FIELDS, LOGIN_ACCOUNT_FIELD } from './employee-change-log'
import { canSeeFullIdentity, maskIbanPartial, maskIdentityPartial } from './employee-privacy'

/**
 * يشوف الراتب والبدلات والبنك لكل الموظفين في نطاقه (مش ملفه هو بس) — نفس القاعدة للقراءة والتصدير ولوحة «فريقي».
 * B2.14: مفتاح employees.view_compensation بيزوّد على القاعدة القايمة (payroll.view أو employees.edit)، فمحدش بيخسر حاجة ومن غير
 * ترحيل لأدوار الشركة؛ المفتاح للي محتاج يشوف الرواتب من غير الصلاحيتين دول.
 */
export function canSeeEmployeesFinance(user: JwtPayload) {
  return userHasPerm(user, 'employees.view_compensation') || userHasPerm(user, 'payroll.view') || userHasPerm(user, 'employees.edit')
}

export function canReadEmployeeFinance(user: JwtPayload, employeeId: number) {
  return user.employeeId === employeeId || canSeeEmployeesFinance(user)
}

// Apply only at HTTP response boundaries. Internal payroll/settlement services
// still receive the complete entity, and editors retain unchanged field values.
// partialMasking (B4.8-أ): إعداد «الإخفاء الجزئي» مفتوح — غير المصرّح له بياخد الهوية والجواز والآيبان مخفيين جزئيًا في خانات لوحدها
// (…Masked) والخانة الأصلية بتتشال. مقفول (الافتراضي) = الناتج زي الأول بالحرف.
export type ProjectedEmployee = Partial<Employee> & { nationalIdMasked?: string | null; passportNoMasked?: string | null; ibanMasked?: string | null }
export function projectEmployee(employee: Employee, user: JwtPayload, partialMasking = false): ProjectedEmployee {
  const finance = canReadEmployeeFinance(user, employee.id)
  const identity = !partialMasking || canSeeFullIdentity(user, employee.id)
  if (finance && identity) return employee
  const safe: ProjectedEmployee = { ...employee }
  if (!identity) {
    safe.nationalIdMasked = maskIdentityPartial(employee.nationalId)
    safe.passportNoMasked = maskIdentityPartial(employee.passportNo)
    delete safe.nationalId
    delete safe.passportNo
  }
  if (finance) return safe
  if (partialMasking) safe.ibanMasked = maskIbanPartial(employee.iban)
  const financialFields: (keyof Employee)[] = [
    'currency', 'salaryCycle', 'basicSalary', 'housingAllowance', 'transportAllowance',
    'phoneAllowance', 'workNatureAllowance', 'otherAllowance', 'workPressureAllowance', 'payMethod', 'bankTransferAmount',
    'bankName', 'bankBranch', 'iban', 'gosiNumber', 'isGosiRegistered', 'gosiBaseSalary', 'gosiFirstRegisteredAt',
  ]
  for (const field of financialFields) delete safe[field]
  return safe
}

// partialMasking (CR4-SELF، B4.8-أ): سطر تغيير رقم الهوية أو الجواز بنفس حكم الخانة نفسها — وإلا السجل بيكشف اللي الملف خبّاه
const IDENTITY_FIELDS: readonly string[] = ['nationalId', 'passportNo']
const maskIdentityStatus = (value: string | null | undefined) => {
  const match = /^(nationalId|passportNo):(.*)$/s.exec(value ?? '')
  return match ? `${match[1]}:${maskIdentityPartial(match[2]) ?? '—'}` : value
}
export function projectEmployeeHistory(rows: EmployeeStatusHistory[], user: JwtPayload, employeeId: number, partialMasking = false) {
  // سطر ربط حساب الدخول القديم داخلي (فيه رقم حساب): مابيرجعش في سجل الموظف لحد
  rows = rows.filter(row => row.fieldName !== LOGIN_ACCOUNT_FIELD)
  if (partialMasking && !canSeeFullIdentity(user, employeeId)) {
    // السطر الجديد بخانته (fieldName)، والقديم بصيغة «nationalId:…» في الحالة القديمة والجديدة
    rows = rows.map(row => {
      const field = IDENTITY_FIELDS.includes(row.fieldName ?? ''), legacy = [row.oldStatus, row.newStatus].some(value => /^(nationalId|passportNo):/.test(value ?? ''))
      if (!field && !legacy) return row
      return { ...row, ...(field ? { oldValue: maskIdentityPartial(row.oldValue), newValue: maskIdentityPartial(row.newValue) } : {}),
        oldStatus: maskIdentityStatus(row.oldStatus) as string, newStatus: maskIdentityStatus(row.newStatus) as string }
    }) as EmployeeStatusHistory[]
  }
  const compatible = rows.map(historyWithLegacyLabels)
  if (canReadEmployeeFinance(user, employeeId)) return compatible
  const financial = /^(salary|basicSalary|housingAllowance|transportAllowance|phoneAllowance|workNatureAllowance|otherAllowance|workPressureAllowance|iban|bankName|bankBranch|gosiBaseSalary|payMethod|salaryCycle):/i
  // Legacy financial history shares these text columns with employment status.
  // The reason may repeat amounts, so hide it with both before/after values.
  return compatible.map(row => {
    if (['SALARY', 'BANK'].includes(row.changeType ?? '') || FINANCIAL_CHANGE_FIELDS.test(row.fieldName ?? '') || financial.test(row.oldStatus ?? '') || financial.test(row.newStatus ?? '')) {
      return { ...row, oldValue: null, newValue: null, oldStatus: 'financial:[محجوب]', newStatus: 'financial:[محجوب]', reason: 'تغيير بيانات مالية — التفاصيل غير متاحة لصلاحيات حسابك' }
    }
    // Finalization uses normal employment statuses but embeds the settlement
    // net in its generated reason. Keep the lifecycle event, hide its amount.
    if (row.reason?.startsWith('انتهاء خدمة — تصفية ')) {
      return { ...row, reason: 'انتهاء خدمة — تصفية معتمدة' }
    }
    return row
  })
}
