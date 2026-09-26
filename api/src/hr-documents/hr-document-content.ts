import { BadRequestException } from '@nestjs/common'
import type { LetterContent } from '../letters/letter-template.entities'
import type { HrDocumentField } from './hr-document.entities'

export const HR_DOCUMENT_VARIABLES = [
  { key: 'employee.fullName', label: 'اسم الموظف', sample: 'موظف توضيحي' },
  { key: 'employee.employeeCode', label: 'الرقم الوظيفي', sample: 'DEMO-001' },
  { key: 'employee.jobTitle', label: 'المسمى الوظيفي', sample: 'أخصائي موارد بشرية' },
  { key: 'employee.joinDate', label: 'تاريخ التعيين', sample: '2024-01-01' },
  { key: 'employee.nationalId', label: 'رقم الهوية', sample: '0000000000' },
  { key: 'employee.nationality', label: 'الجنسية', sample: 'جنسية توضيحية' },
  { key: 'employee.email', label: 'البريد الإلكتروني', sample: 'employee@example.invalid' },
  { key: 'employee.phone', label: 'هاتف الموظف', sample: '0000000000' },
  { key: 'employee.address', label: 'عنوان الموظف', sample: 'عنوان توضيحي' },
  { key: 'company.name', label: 'اسم الشركة', sample: 'شركة توضيحية للمعاينة' },
  { key: 'company.nameEn', label: 'اسم الشركة بالإنجليزية', sample: 'Sample Company' },
  { key: 'company.address', label: 'عنوان الشركة', sample: 'عنوان الشركة التوضيحي' },
  { key: 'company.phone', label: 'هاتف الشركة', sample: '0000000000' },
  { key: 'company.commercialRegister', label: 'السجل التجاري', sample: 'DEMO-REGISTER' },
  { key: 'contract.startDate', label: 'بداية العقد المسجلة', sample: '2026-01-01' },
  { key: 'contract.endDate', label: 'نهاية العقد المسجلة', sample: '2026-12-31' },
  { key: 'contract.type', label: 'نوع العقد المسجل', sample: 'محدد المدة' },
  { key: 'contract.durationMonths', label: 'مدة العقد بالأشهر', sample: '12' },
  { key: 'contract.number', label: 'رقم العقد المسجل', sample: 'DEMO-CONTRACT-001' },
  { key: 'salary.basic', label: 'الراتب الأساسي', sample: '6000.00' },
  { key: 'salary.housing', label: 'بدل السكن', sample: '1500.00' },
  { key: 'salary.transport', label: 'بدل النقل', sample: '500.00' },
  { key: 'salary.phone', label: 'بدل الهاتف', sample: '100.00' },
  { key: 'salary.workNature', label: 'بدل طبيعة العمل', sample: '200.00' },
  { key: 'salary.other', label: 'البدلات الأخرى', sample: '200.00' },
  // بدل ضغط العمل (قرار المالك 26 سبتمبر): مصروف كل شهر فظاهر في بيان الراتب وداخل إجماليه المصروف (مش أساس لأي مؤثر)
  { key: 'salary.workPressure', label: 'بدل ضغط العمل', sample: '300.00' },
  { key: 'salary.total', label: 'إجمالي الراتب المسجل (شامل بدل ضغط العمل)', sample: '8800.00' },
  { key: 'salary.currency', label: 'عملة الراتب', sample: 'SAR' },
  { key: 'date', label: 'تاريخ الإصدار', sample: '2026-09-12' },
  { key: 'document.ref', label: 'مرجع المستند', sample: 'HRD-PREVIEW' },
] as const

export const CONTENT_KEYS: Array<keyof LetterContent> = ['title', 'greeting', 'body', 'closing', 'footer']
const limits: Record<keyof LetterContent, number> = { title: 200, greeting: 500, body: 12000, closing: 1500, footer: 1500 }
const builtin = new Set<string>(HR_DOCUMENT_VARIABLES.map(v => v.key))
const token = /\{\{\s*([A-Za-z][A-Za-z0-9_.]*)\s*\}\}/g

export function validateHrFields(raw: unknown): HrDocumentField[] {
  if (!Array.isArray(raw) || raw.length > 20) throw new BadRequestException('الحقول المخصصة قائمة بحد أقصى 20 حقلاً')
  const seen = new Set<string>()
  return raw.map(field => {
    if (!field || typeof field !== 'object' || Array.isArray(field) || Object.keys(field).some(key => !['key', 'label', 'required'].includes(key))) throw new BadRequestException('تعريف الحقل المخصص غير صالح')
    if (typeof field.key !== 'string' || !/^custom\.[A-Za-z][A-Za-z0-9_]{0,49}$/.test(field.key) || seen.has(field.key)) throw new BadRequestException('مفتاح الحقل يجب أن يكون فريداً بصيغة custom.key')
    if (typeof field.label !== 'string' || !field.label.trim() || field.label.trim().length > 100 || typeof field.required !== 'boolean') throw new BadRequestException('اسم الحقل وإلزاميته غير صالحين')
    seen.add(field.key)
    return { key: field.key, label: field.label.trim(), required: field.required }
  })
}

export function validateHrContent(raw: unknown, customFields: HrDocumentField[]): LetterContent {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Object.keys(raw).some(key => !CONTENT_KEYS.includes(key as keyof LetterContent))) throw new BadRequestException('محتوى القالب غير صالح')
  const allowed = new Set([...builtin, ...customFields.map(field => field.key)])
  const result = {} as LetterContent
  for (const key of CONTENT_KEYS) {
    const text = (raw as Record<string, unknown>)[key]
    if (typeof text !== 'string' || text.length > limits[key]) throw new BadRequestException(`حقل ${key} غير صالح أو يتجاوز الحد المسموح`)
    const remaining = text.replace(token, (_match, variable: string) => {
      if (!allowed.has(variable)) throw new BadRequestException(`متغير غير معروف: ${variable}`)
      return ''
    })
    if (remaining.includes('{{') || remaining.includes('}}')) throw new BadRequestException('صيغة المتغير غير مكتملة؛ استخدم {{variable}}')
    result[key] = text.trim()
  }
  if (result.title.length < 2 || result.body.length < 10) throw new BadRequestException('عنوان المستند ونصه مطلوبان')
  return result
}

export function hrContentVariables(content: LetterContent): Set<string> {
  const result = new Set<string>()
  for (const key of CONTENT_KEYS) for (const match of content[key].matchAll(token)) result.add(match[1])
  return result
}

export function validateHrValues(raw: unknown, fields: HrDocumentField[], required = true): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new BadRequestException('قيم الحقول المخصصة غير صالحة')
  const allowed = new Map(fields.map(field => [field.key, field]))
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (!allowed.has(key) || typeof value !== 'string' || value.length > 4000) throw new BadRequestException(`قيمة الحقل ${key} غير صالحة أو غير معرّفة في القالب`)
    result[key] = value.trim()
  }
  for (const field of fields) if (required && field.required && !result[field.key]) throw new BadRequestException(`الحقل مطلوب: ${field.label}`)
  return result
}

export function resolveHrContent(content: LetterContent, values: Record<string, string>): LetterContent {
  const ltr = new Set(['employee.employeeCode', 'employee.joinDate', 'employee.nationalId', 'employee.email', 'employee.phone', 'company.phone',
    'company.commercialRegister', 'contract.startDate', 'contract.endDate', 'contract.durationMonths', 'contract.number', 'date', 'document.ref'])
  const result = Object.fromEntries(CONTENT_KEYS.map(key => [key, content[key].replace(token, (_match, variable: string) => {
    const value = values[variable] || ''
    return value && (ltr.has(variable) || variable.startsWith('salary.')) ? `\u2066${value}\u2069` : value
  })])) as unknown as LetterContent
  if (CONTENT_KEYS.reduce((sum, key) => sum + result[key].length, 0) > 100000) throw new BadRequestException('النص الناتج طويل جداً؛ اختصر قيم الحقول')
  return result
}
