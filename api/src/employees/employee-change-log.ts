import { EntityManager } from 'typeorm'
import { EmployeeStatusHistory } from '../requests/entities/employment.entities'

type ChangeType = NonNullable<EmployeeStatusHistory['changeType']>
export const FINANCIAL_CHANGE_FIELDS = /^(salary|basicSalary|housingAllowance|transportAllowance|phoneAllowance|workNatureAllowance|otherAllowance|workPressureAllowance|currency|iban|bankName|bankBranch|gosiBaseSalary|payMethod|bankTransferAmount|salaryCycle)$/i
export function employeeChangeType(field: string): ChangeType {
  if (field === 'status') return 'STATUS'
  if (/^(iban|bankName|bankBranch|payMethod)$/.test(field)) return 'BANK'
  if (FINANCIAL_CHANGE_FIELDS.test(field)) return 'SALARY'
  if (/^(team|teamId|branchId|departmentId|managerEmployeeId)$/.test(field)) return 'TEAM'
  if (/^(title|jobTitle)$/.test(field)) return 'TITLE'
  if (field.startsWith('contract')) return 'CONTRACT'
  if (field.startsWith('shift')) return 'SHIFT'
  return 'DATA'
}
export function maskedIban(value: unknown): string | null {
  if (value == null || value === '' || value === '—') return null
  const compact = String(value).replace(/[\s-]/g, '')
  return compact.includes('*') ? compact : '****' + compact.slice(-4)
}
export function redactAuditText(value: string | null | undefined, knownAccounts: unknown[] = []) {
  let safe = value ?? null
  for (const account of knownAccounts) {
    const compact = String(account ?? '').replace(/[\s-]/g, '')
    if (!/^[A-Z]{2}[A-Z0-9]{13,32}$/i.test(compact)) continue
    // Match the known account with optional separators, without consuming words
    // following it. The remainder of an audit reason must stay intact.
    safe = safe?.replace(new RegExp(compact.split('').join('[\\s-]*'), 'gi'), maskedIban(account)!) ?? null
  }
  return safe?.replace(/\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/gi, match => maskedIban(match)!) ?? null
}
const display = (value: unknown) => value == null ? '—' : typeof value === 'object' ? JSON.stringify(value) : String(value)

export interface EmployeeChangeInput {
  employeeId: number
  fieldName: string
  oldValue: unknown
  newValue: unknown
  changeType?: ChangeType
  reason?: string | null
  requestId?: number | null
  changedByUserId?: number | null
}
export async function recordEmployeeChange(em: EntityManager, input: EmployeeChangeInput) {
  const changeType = input.changeType || employeeChangeType(input.fieldName)
  const oldValue = input.fieldName === 'iban' ? maskedIban(input.oldValue) : input.oldValue ?? null
  const newValue = input.fieldName === 'iban' ? maskedIban(input.newValue) : input.newValue ?? null
  return em.getRepository(EmployeeStatusHistory).save({
    employeeId: input.employeeId, changeType, fieldName: input.fieldName,
    oldValue, newValue,
    oldStatus: changeType === 'STATUS' ? display(oldValue).slice(0, 100) : null as any,
    newStatus: changeType === 'STATUS' ? display(newValue).slice(0, 100) : 'change',
    reason: redactAuditText(input.reason, input.fieldName === 'iban' ? [input.oldValue, input.newValue] : [])?.slice(0, 500) ?? null as any,
    requestId: input.requestId || null as any, changedByUserId: input.changedByUserId ?? null,
  })
}

/** Compatibility is at the response boundary; bank audit values remain masked
 * even for financial readers. This also protects unmigrated historical rows. */
export function historyWithLegacyLabels(row: EmployeeStatusHistory) {
  const bankValues = row.fieldName === 'iban' ? [row.oldValue, row.newValue]
    : [row.oldStatus, row.newStatus].filter(v => /^iban:/i.test(v ?? '')).map(v => v.slice(5))
  const safe = { ...row, reason: redactAuditText(row.reason, bankValues) }
  if (!row.changeType) {
    for (const key of ['oldStatus', 'newStatus'] as const) {
      if (/^iban:/i.test(safe[key] ?? '')) safe[key] = 'iban:' + (maskedIban(safe[key].slice(5)) ?? '—')
    }
    return safe
  }
  if (row.fieldName === 'iban') {
    safe.oldValue = maskedIban(row.oldValue)
    safe.newValue = maskedIban(row.newValue)
  }
  if (row.changeType !== 'STATUS') {
    const field = row.fieldName || row.changeType.toLowerCase()
    const prefix = field === 'contract' ? 'contract: ' : field + ':'
    safe.oldStatus = prefix + display(safe.oldValue)
    safe.newStatus = prefix + display(safe.newValue)
    if (field === 'legacy_data_update') safe.oldStatus = safe.newStatus = 'data_update'
  }
  return safe
}
