import type { EmployeeFormState, QualRow, QualificationsPayload } from '@/components/EmployeeForm'

export const EMPLOYEE_ADD_DRAFT_PREFIX = 'employee-add-draft:v1:'
const SCHEMA_VERSION = 1
const QUALIFICATIONS = ['education', 'certifications', 'experiences', 'skills', 'languages'] as const
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const text = (value: unknown) => typeof value === 'string' && value.length <= 20000 ? value : ''
const positiveId = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : undefined
const fileRef = (value: unknown) => typeof value === 'string' && /^file:[1-9]\d*$/.test(value) ? value : ''
const row = (value: unknown): QualRow => isRecord(value) ? Object.fromEntries(Object.entries(value).filter(([key, val]) => key !== '__proto__' && typeof val === 'string' && val.length <= 20000).map(([key, val]) => [key, String(val)])) : {}
const rows = (value: unknown) => Array.isArray(value) ? value.slice(0, 500).filter(isRecord).map(row) : []

export interface EmployeeAddDraft {
  schemaVersion: 1
  userId: number
  savedAt: string
  currentStep: number
  form: EmployeeFormState
  leaveEntitled: boolean
  selectedSchedule: number | ''
  openingBalance: string
  openingExpiry: 'end_of_year' | 'custom_date' | 'no_expiry'
  openingExpiryDate: string
  qualifications: QualificationsPayload
  qualificationDrafts: Record<keyof QualificationsPayload, QualRow>
  contractFileRef: string
  contractFileName: string
  documentRefs: Array<{ docType: string; fileRef: string }>
}

export function loadEmployeeAddDraft(userId: number, defaults: EmployeeFormState): EmployeeAddDraft | null {
  const stored = sessionStorage.getItem(`${EMPLOYEE_ADD_DRAFT_PREFIX}${userId}`)
  if (!stored) return null
  let value: unknown
  try { value = JSON.parse(stored) } catch { throw new Error('المسودة المحفوظة غير صالحة؛ يمكنك حذفها والبدء من جديد.') }
  if (!isRecord(value) || value.schemaVersion !== SCHEMA_VERSION || value.userId !== userId || !isRecord(value.form) || typeof value.savedAt !== 'string' || !Number.isFinite(Date.parse(value.savedAt))) {
    throw new Error('تعذر قراءة نسخة المسودة المحفوظة؛ يمكنك حذفها والبدء من جديد.')
  }
  // Only known text fields and the successful photo upload ID can cross the storage boundary.
  const form = { ...defaults }
  for (const key of Object.keys(defaults)) {
    if (typeof defaults[key as keyof EmployeeFormState] === 'string' && key !== 'status') Object.assign(form, { [key]: text(value.form[key]) })
  }
  form.status = value.form.status === 'active' ? 'active' : 'probation'
  form.flexOverrideMode = value.form.flexOverrideMode === 'ENABLED' || value.form.flexOverrideMode === 'DISABLED' ? value.form.flexOverrideMode : 'INHERIT'
  form.photoFileId = positiveId(value.form.photoFileId)
  const qualifications = isRecord(value.qualifications) ? value.qualifications : {}
  const qualificationDrafts = isRecord(value.qualificationDrafts) ? value.qualificationDrafts : {}
  const parseQualifications = (source: Record<string, unknown>): QualificationsPayload => ({ education: rows(source.education), certifications: rows(source.certifications), experiences: rows(source.experiences), skills: rows(source.skills), languages: rows(source.languages) })
  return {
    schemaVersion: SCHEMA_VERSION, userId, savedAt: value.savedAt,
    currentStep: typeof value.currentStep === 'number' && Number.isInteger(value.currentStep) && value.currentStep >= 1 && value.currentStep <= 5 ? value.currentStep : 1,
    form, leaveEntitled: value.leaveEntitled !== false, selectedSchedule: positiveId(value.selectedSchedule) ?? '',
    openingBalance: text(value.openingBalance), openingExpiry: value.openingExpiry === 'custom_date' || value.openingExpiry === 'no_expiry' ? value.openingExpiry : 'end_of_year', openingExpiryDate: text(value.openingExpiryDate),
    qualifications: parseQualifications(qualifications),
    qualificationDrafts: Object.fromEntries(QUALIFICATIONS.map((key) => [key, row(qualificationDrafts[key])])) as Record<keyof QualificationsPayload, QualRow>,
    contractFileRef: fileRef(value.contractFileRef), contractFileName: text(value.contractFileName),
    documentRefs: Array.isArray(value.documentRefs) ? value.documentRefs.slice(0, 500).filter(isRecord).filter((item) => text(item.docType) && fileRef(item.fileRef)).map((item) => ({ docType: text(item.docType), fileRef: fileRef(item.fileRef) })) : [],
  }
}

export function saveEmployeeAddDraft(draft: EmployeeAddDraft) {
  sessionStorage.setItem(`${EMPLOYEE_ADD_DRAFT_PREFIX}${draft.userId}`, JSON.stringify(draft))
}

export function clearEmployeeAddDraft(userId: number) {
  sessionStorage.removeItem(`${EMPLOYEE_ADD_DRAFT_PREFIX}${userId}`)
}

export function clearEmployeeAddDrafts(storage: Storage) {
  const keys: string[] = []
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index)
    if (key?.startsWith('employee-add-draft:')) keys.push(key)
  }
  keys.forEach((key) => storage.removeItem(key))
}
