// Pure compatibility contract: also imported by browser code. Legacy parsing is
// centralized here; business logic uses canonical request and leave identifiers.
export const LEAVE_HANDLERS = ['leave_deduct_balance', 'leave_no_balance',
  'leave_calendar_balance', 'leave_calendar', 'leave_calendar_payroll', 'leave_calendar_once'] as const
export const isLeaveDefinition = (type: { destinationHandler?: string }) =>
  LEAVE_HANDLERS.some(handler => handler === type.destinationHandler)
export const definitionCodeOf = (request: { definitionCode?: string | null; typeCode: string }) =>
  request.definitionCode || request.typeCode

export function legacyLeaveCode(typeCode: string): string | undefined {
  if (typeCode === 'LEAVE_MODIFY_CANCEL') return undefined
  return /^LEAVE_([A-Z][A-Z0-9_]*)$/.exec(typeCode)?.[1]
}

export function leaveCodeOf(payload: Record<string, unknown>, definitionCode = 'LEAVE'): string {
  const canonical = payload.leaveTypeCode
  const legacy = payload.leaveType
  if (canonical != null && legacy != null && String(canonical) !== String(legacy)) {
    throw new Error('LEAVE_CODE_CONFLICT')
  }
  const code = canonical ?? legacy ?? legacyLeaveCode(definitionCode) ?? ''
  if (typeof code !== 'string') throw new Error('LEAVE_CODE_INVALID')
  return code.trim()
}

export function normalizedLeavePayload(payload: Record<string, unknown>, definitionCode = 'LEAVE') {
  const code = leaveCodeOf(payload, definitionCode)
  // Alias retained in saved payloads while older clients still render/edit it.
  return code ? { ...payload, leaveTypeCode: code, leaveType: code } : { ...payload }
}

export function isLeaveRequest(request: { typeCode: string; definitionCode?: string | null }) {
  return request.typeCode === 'LEAVE'
}

export function leaveView<T extends { leaveTypeCode: string }>(row: T) {
  return { ...row, leaveType: row.leaveTypeCode }
}

export function leaveTypeView<T extends { balanceType?: string | null }>(row: T) {
  return { ...row, balanceSource: row.balanceType ?? null }
}

export function groupLeaveProfiles<T extends { code: string; nameAr: string; destinationHandler: string;
  requiredFields?: string; customFields?: string }>(types: T[]) {
  const profiles = types.filter(isLeaveDefinition).map((type) => {
    const required: string[] = JSON.parse(type.requiredFields || '[]')
    const fields: Array<{ key: string; label?: string; type?: string; required?: boolean }> = JSON.parse(type.customFields || '[]')
    const keys = [...new Set(['leaveTypeCode', ...required.map(k => k === 'leaveType' ? 'leaveTypeCode' : k)])]
    const custom = fields.map(field => ({ ...field, key: field.key === 'leaveType' ? 'leaveTypeCode' : field.key }))
    const labels: Record<string, string> = { leaveTypeCode: 'نوع الإجازة', fromDate: 'من تاريخ', toDate: 'إلى تاريخ', days: 'عدد الأيام' }
    if (custom.length) for (const key of keys) {
      if (!custom.some(f => f.key === key)) custom.push({ key, label: labels[key] || key,
        type: key.endsWith('Date') ? 'date' : key === 'days' ? 'number' : 'text', required: true })
    }
    return { ...type, definitionCode: type.code, leaveTypeCode: legacyLeaveCode(type.code) ?? null,
      requiredFields: JSON.stringify(keys), customFields: JSON.stringify(custom) }
  })
  if (!profiles.length) return types
  const canonical = profiles.find(p => p.definitionCode === 'LEAVE')
  // This wrapper is navigation only. Clients must choose an exact profile; it
  // does not combine their audiences, handlers, fields or approval policies.
  const group = { ...(canonical ?? profiles[0]), code: 'LEAVE', nameAr: canonical?.nameAr ?? 'طلب إجازة',
    leaveProfiles: profiles, requiresDefinitionSelection: profiles.length > 1 }
  let inserted = false
  return types.flatMap(type => {
    if (!isLeaveDefinition(type)) return [type]
    if (inserted) return []
    inserted = true
    return [group]
  })
}
