import { BadRequestException, Logger } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import type { EmployeeCustomField, EmployeeCustomValue } from './employee-custom-fields.entities'

// B2.9 الجزء ب: قواعد الحقول المخصصة على ملف الموظف — من غير حقن خدمة، عشان محرك الطلبات يقرا قيم الموظف لشرط الجمهور.

export const CUSTOM_FIELDS_MIGRATION_MISSING = 'الحقول المخصصة محتاجة ترحيل 20261006_094 على قاعدة البيانات'
export const CUSTOM_FIELD_TYPES = ['TEXT', 'NUMBER', 'DATE', 'CHOICE', 'YESNO'] as const
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number]
export const CUSTOM_FIELD_KEY = /^[a-z][a-z0-9_]{1,39}$/
export const CUSTOM_FIELDS_MAX = 50
export const CUSTOM_FIELD_OPTIONS_MAX = 30
export const CUSTOM_TEXT_MAX = 500
// نعم/لا في شروط الجمهور وفي الرد
export const CUSTOM_YES = 'yes', CUSTOM_NO = 'no'

const logger = new Logger('EmployeeCustomFields')
let ready: boolean | null = null, warned = false

/** الجدولين موجودين (ترحيل 094)؟ الموجود بس بيتحفظ: الناقص بيتفحص مع كل نداء (قاعدة CRP2N) */
export async function customFieldsReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.employee_custom_fields', N'U') IS NOT NULL
    AND OBJECT_ID(N'dbo.employee_custom_values', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  if (!ready && !warned) { warned = true; logger.warn(CUSTOM_FIELDS_MIGRATION_MISSING + ' — ملف الموظف شغال من غيرها لحد ما يتطبق') }
  return ready
}

/** للاختبارات: نسيان حالة الجدولين */
export function resetCustomFieldsCache() { ready = null; warned = false }

export function customFieldOptions(field: Pick<EmployeeCustomField, 'options'>): string[] {
  try {
    const parsed: unknown = field.options ? JSON.parse(field.options) : []
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch { return [] }
}

/** اختيارات القايمة عند الحفظ: نصوص غير فاضية، من غير تكرار */
export function cleanCustomFieldOptions(type: string, raw: unknown): string | null {
  if (type !== 'CHOICE') return null
  const options = [...new Set((Array.isArray(raw) ? raw : []).map(item => typeof item === 'string' ? item.trim() : '').filter(Boolean))]
  if (!options.length) throw new BadRequestException('حقل «اختيار» محتاج اختيار واحد على الأقل')
  if (options.length > CUSTOM_FIELD_OPTIONS_MAX || options.some(item => item.length > 100)) throw new BadRequestException(`الاختيارات بحد أقصى ${CUSTOM_FIELD_OPTIONS_MAX}، وكل اختيار 100 حرف`)
  return JSON.stringify(options)
}

const isoDay = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

/** قيمة جاية من الشاشة ← أعمدة التخزين. null = من غير قيمة (السطر بيتشال). القيمة الغلط برسالتها */
export function customValueColumns(field: Pick<EmployeeCustomField, 'label' | 'type' | 'options'>, raw: unknown): Pick<EmployeeCustomValue, 'textValue' | 'numberValue' | 'dateValue'> | null {
  if (raw === null || raw === undefined || (typeof raw === 'string' && raw.trim() === '')) return null
  const none = { textValue: null, numberValue: null, dateValue: null }
  switch (field.type) {
    case 'TEXT': {
      if (typeof raw !== 'string' || raw.trim().length > CUSTOM_TEXT_MAX) throw new BadRequestException(`«${field.label}»: نص بحد أقصى ${CUSTOM_TEXT_MAX} حرف`)
      return { ...none, textValue: raw.trim() }
    }
    case 'NUMBER': {
      const value = typeof raw === 'number' ? raw : typeof raw === 'string' && /^-?\d+(\.\d{1,4})?$/.test(raw.trim()) ? Number(raw.trim()) : NaN
      if (!Number.isFinite(value) || Math.abs(value) >= 1e14) throw new BadRequestException(`«${field.label}»: رقم غير صحيح`)
      return { ...none, numberValue: value }
    }
    case 'DATE': {
      if (typeof raw !== 'string' || !isoDay(raw.trim())) throw new BadRequestException(`«${field.label}»: تاريخ غير صحيح`)
      return { ...none, dateValue: raw.trim() }
    }
    case 'CHOICE': {
      if (typeof raw !== 'string' || !customFieldOptions(field).includes(raw.trim())) throw new BadRequestException(`«${field.label}»: اختار قيمة من القايمة`)
      return { ...none, textValue: raw.trim() }
    }
    case 'YESNO': {
      if (raw !== true && raw !== false && raw !== CUSTOM_YES && raw !== CUSTOM_NO) throw new BadRequestException(`«${field.label}»: نعم أو لا`)
      return { ...none, numberValue: raw === true || raw === CUSTOM_YES ? 1 : 0 }
    }
    default:
      throw new BadRequestException(`«${field.label}»: نوع الحقل غير معروف`)
  }
}

/** أعمدة التخزين ← قيمة الرد (نص، رقم، تاريخ YYYY-MM-DD، أو true/false) */
export function customValueOf(field: Pick<EmployeeCustomField, 'type'>, row: Pick<EmployeeCustomValue, 'textValue' | 'numberValue' | 'dateValue'> | undefined): string | number | boolean | null {
  if (!row) return null
  if (field.type === 'NUMBER') return row.numberValue == null ? null : Number(row.numberValue)
  if (field.type === 'YESNO') return row.numberValue == null ? null : Number(row.numberValue) === 1
  if (field.type === 'DATE') return row.dateValue == null ? null : String(row.dateValue).slice(0, 10)
  return row.textValue ?? null
}

/** الحقول اللي ينفع شرط جمهور يتحكم بيها: نشطة، غير مقيّدة، ونوعها «اختيار» أو «نعم/لا» — بقيمها المتاحة. قبل الترحيل: ولا حقل */
export async function audienceCustomFieldsOf(em: EntityManager): Promise<Array<{ fieldKey: string; label: string; type: string; options: string[] }>> {
  if (!(await customFieldsReady(em))) return []
  const rows: Array<{ fieldKey: string; label: string; type: string; options: string | null }> = await em.query(
    `SELECT [fieldKey], [label], [type], [options] FROM [employee_custom_fields]
     WHERE [isActive] = 1 AND [restricted] = 0 AND [type] IN (N'CHOICE', N'YESNO') ORDER BY [sortOrder], [id]`)
  return rows.map(row => ({ fieldKey: row.fieldKey, label: row.label, type: row.type, options: row.type === 'YESNO' ? [CUSTOM_YES, CUSTOM_NO] : customFieldOptions(row) }))
}

/**
 * قيم الموظف اللي ينفع شرط جمهور يتحكم بيها: حقول نشطة، غير مقيّدة، ونوعها «اختيار» أو «نعم/لا». مفتاح الحقل ← نص القيمة
 * (الاختيار بنصه، ونعم/لا بـyes/no). قبل الترحيل: ولا قيمة.
 */
export async function audienceCustomValuesOf(em: EntityManager, employeeId: number | null | undefined): Promise<Record<string, string>> {
  if (!employeeId || !(await customFieldsReady(em))) return {}
  const rows: Array<{ fieldKey: string; type: string; textValue: string | null; numberValue: string | number | null }> = await em.query(
    `SELECT f.[fieldKey], f.[type], v.[textValue], v.[numberValue] FROM [employee_custom_values] v INNER JOIN [employee_custom_fields] f ON f.[id] = v.[fieldId]
     WHERE v.[employeeId] = @0 AND f.[isActive] = 1 AND f.[restricted] = 0 AND f.[type] IN (N'CHOICE', N'YESNO')`, [employeeId])
  const values: Record<string, string> = {}
  for (const row of rows) {
    if (row.type === 'CHOICE' && row.textValue != null) values[row.fieldKey] = row.textValue
    if (row.type === 'YESNO' && row.numberValue != null) values[row.fieldKey] = Number(row.numberValue) === 1 ? CUSTOM_YES : CUSTOM_NO
  }
  return values
}
