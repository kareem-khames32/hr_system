// B2.9-ب: الحقول المخصصة على ملف الموظف — تعريفها (الإعدادات) وقيم الموظف (ملفه).
// مسارات نسبية (لا @/) عشان الاختبارات تقرا الملف مباشرة.
import { apiFetch } from './api'

export type EmployeeFieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'CHOICE' | 'YESNO'
// نفس أنواع الخادم بالحرف
export const EMPLOYEE_FIELD_TYPES: Array<[EmployeeFieldType, string]> = [['TEXT', 'نص'], ['NUMBER', 'رقم'], ['DATE', 'تاريخ'], ['CHOICE', 'اختيار من قايمة'], ['YESNO', 'نعم / لا']]
export const employeeFieldTypeLabel = (type: string): string => EMPLOYEE_FIELD_TYPES.find(([key]) => key === type)?.[1] ?? type

export interface ApiEmployeeField {
  id: number
  fieldKey: string
  label: string
  type: EmployeeFieldType
  options: string[]
  required: boolean
  /** مقيّد: قيمته للي يعدّل ملف الموظف بس */
  restricted: boolean
  sortOrder: number
  isActive: boolean
}
export type EmployeeFieldValue = string | number | boolean | null
export interface ApiEmployeeFieldValue extends ApiEmployeeField { value: EmployeeFieldValue }
/** available = false قبل ترحيل 094: لا الشاشة ولا الكارت بيعرضوا حقول */
export interface ApiEmployeeFieldDefinitions { available: boolean; fields: ApiEmployeeField[] }
export interface ApiEmployeeFieldValues { available: boolean; canEdit: boolean; fields: ApiEmployeeFieldValue[] }
export interface EmployeeFieldInput { fieldKey?: string; label?: string; type?: EmployeeFieldType; options?: string[]; required?: boolean; restricted?: boolean; sortOrder?: number; isActive?: boolean }
/** حقل ينفع شرط في جمهور نوع الطلب (نشط، غير مقيّد، اختيار أو نعم/لا) — وقيمه المتاحة */
export interface AudienceFieldOption { fieldKey: string; label: string; type: EmployeeFieldType; options: string[] }

export const fetchEmployeeFields = () => apiFetch<ApiEmployeeFieldDefinitions>('/settings/employee-fields')
export const fetchAudienceFieldOptions = () => apiFetch<AudienceFieldOption[]>('/settings/employee-fields/audience')
export const createEmployeeField = (input: EmployeeFieldInput) =>
  apiFetch<ApiEmployeeField>('/settings/employee-fields', { method: 'POST', body: JSON.stringify(input) })
export const updateEmployeeField = (id: number, input: EmployeeFieldInput) =>
  apiFetch<ApiEmployeeField>(`/settings/employee-fields/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
export const fetchEmployeeFieldValues = (employeeId: number) => apiFetch<ApiEmployeeFieldValues>(`/employees/${employeeId}/custom-fields`)
export const saveEmployeeFieldValues = (employeeId: number, values: Record<string, EmployeeFieldValue>) =>
  apiFetch<ApiEmployeeFieldValues>(`/employees/${employeeId}/custom-fields`, { method: 'PUT', body: JSON.stringify({ values }) })

// نعم/لا: نفس قيم الخادم في الحفظ وفي شروط الجمهور
export const FIELD_YES = 'yes', FIELD_NO = 'no'
export const audienceValueLabel = (type: string, value: string): string => type !== 'YESNO' ? value : value === FIELD_YES ? 'نعم' : value === FIELD_NO ? 'لا' : value
/** قيمة الحقل في خانة التعديل (نص) */
export const employeeFieldDraft = (field: Pick<ApiEmployeeFieldValue, 'type' | 'value'>): string =>
  field.value === null || field.value === undefined ? '' : field.type === 'YESNO' ? (field.value ? FIELD_YES : FIELD_NO) : String(field.value)
/** قيمة الحقل للعرض */
export const employeeFieldText = (field: Pick<ApiEmployeeFieldValue, 'type' | 'value'>): string => {
  const draft = employeeFieldDraft(field)
  return draft === '' ? '—' : audienceValueLabel(field.type, draft)
}
