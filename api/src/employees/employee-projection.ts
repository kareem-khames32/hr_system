import type { JwtPayload } from '../auth/auth.service'
import { userHasPerm } from '../auth/guards'
import type { EmployeeStatusHistory } from '../requests/entities/employment.entities'
import type { Employee } from './employee.entity'
import { historyWithLegacyLabels, FINANCIAL_CHANGE_FIELDS } from './employee-change-log'

export function canReadEmployeeFinance(user: JwtPayload, employeeId: number) {
  return user.employeeId === employeeId || userHasPerm(user, 'payroll.view') || userHasPerm(user, 'employees.edit')
}

// Apply only at HTTP response boundaries. Internal payroll/settlement services
// still receive the complete entity, and editors retain unchanged field values.
export function projectEmployee(employee: Employee, user: JwtPayload): Partial<Employee> {
  if (canReadEmployeeFinance(user, employee.id)) return employee
  const safe: Partial<Employee> = { ...employee }
  const financialFields: (keyof Employee)[] = [
    'currency', 'salaryCycle', 'basicSalary', 'housingAllowance', 'transportAllowance',
    'phoneAllowance', 'workNatureAllowance', 'otherAllowance', 'payMethod',
    'bankName', 'bankBranch', 'iban', 'gosiNumber', 'isGosiRegistered', 'gosiBaseSalary',
  ]
  for (const field of financialFields) delete safe[field]
  return safe
}

export function projectEmployeeHistory(rows: EmployeeStatusHistory[], user: JwtPayload, employeeId: number) {
  const compatible = rows.map(historyWithLegacyLabels)
  if (canReadEmployeeFinance(user, employeeId)) return compatible
  const financial = /^(salary|basicSalary|housingAllowance|transportAllowance|phoneAllowance|workNatureAllowance|otherAllowance|iban|bankName|bankBranch|gosiBaseSalary|payMethod|salaryCycle):/i
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
