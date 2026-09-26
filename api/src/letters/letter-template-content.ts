import { BadRequestException } from '@nestjs/common'
import type { LetterContent } from './letter-template.entities'

export const LETTER_VARIABLES = [
  { key: 'employee.fullName', label: 'اسم الموظف', sample: 'أحمد محمد — بيانات توضيحية' },
  { key: 'employee.employeeCode', label: 'الرقم الوظيفي', sample: 'DEMO-001' },
  { key: 'employee.jobTitle', label: 'المسمى الوظيفي', sample: 'مهندس برمجيات' },
  { key: 'employee.employmentPhrase', label: 'صيغة علاقة العمل الحالية أو السابقة', sample: 'يعمل لدينا' },
  { key: 'employee.joinDate', label: 'تاريخ التعيين', sample: '2022-01-01' },
  { key: 'employee.nationalId', label: 'رقم الهوية', sample: '0000000000' },
  { key: 'company.name', label: 'اسم الشركة', sample: 'شركة المثال — معاينة' },
  { key: 'company.address', label: 'عنوان الشركة', sample: 'الرياض — عنوان توضيحي' },
  { key: 'company.phone', label: 'هاتف الشركة', sample: '0000000000' },
  { key: 'date', label: 'تاريخ إصدار الخطاب', sample: '2026-09-11' },
  { key: 'request.ref', label: 'مرجع الطلب', sample: 'REQ-DEMO' },
  { key: 'purpose', label: 'الغرض من الخطاب', sample: 'تقديمه إلى الجهة المختصة' },
  { key: 'salary.total', label: 'إجمالي الراتب المسجل بملف الموظف (شامل بدل ضغط العمل)', sample: '8500.00' },
  { key: 'salary.currency', label: 'عملة الراتب', sample: 'SAR' },
] as const

const fields: Array<keyof LetterContent> = ['title', 'greeting', 'body', 'closing', 'footer']
const limits: Record<keyof LetterContent, number> = { title: 200, greeting: 500, body: 12000, closing: 1500, footer: 1500 }
const fieldLabels: Record<keyof LetterContent, string> = { title: 'عنوان الخطاب', greeting: 'التحية', body: 'نص الخطاب', closing: 'الخاتمة والتوقيع', footer: 'تذييل الصفحة' }
const keys = new Set<string>(LETTER_VARIABLES.map(v => v.key))
const token = /\{\{\s*([a-zA-Z][a-zA-Z0-9.]*)\s*\}\}/g

export function validateLetterContent(raw: unknown): LetterContent {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new BadRequestException('بيانات القالب غير صالحة')
  const value = raw as Record<string, unknown>
  if (Object.keys(value).some(k => !fields.includes(k as keyof LetterContent))) throw new BadRequestException('حقل غير معروف في القالب')
  const result = {} as LetterContent
  for (const field of fields) {
    const text = value[field]
    if (typeof text !== 'string' || text.length > limits[field]) throw new BadRequestException(`حقل ${fieldLabels[field]} غير صالح أو يتجاوز الطول المتاح`)
    const remaining = text.replace(token, (_all, key: string) => {
      if (!keys.has(key)) throw new BadRequestException(`متغير غير معروف: ${key}`)
      return ''
    })
    if (remaining.includes('{{') || remaining.includes('}}')) throw new BadRequestException('صيغة متغير غير مكتملة؛ استخدم أزرار إدراج المتغيرات')
    result[field] = text.trim()
  }
  if (result.title.length < 2 || result.body.length < 10) throw new BadRequestException('عنوان القالب ونصه مطلوبان')
  return result
}

export function resolveLetterContent(content: LetterContent, values: Record<string, string>): LetterContent {
  const ltr = new Set(['employee.employeeCode', 'employee.joinDate', 'employee.nationalId', 'company.phone', 'date', 'request.ref', 'salary.total', 'salary.currency'])
  return Object.fromEntries(fields.map(field => [field, content[field].replace(token, (_all, key: string) => {
    const value = values[key] ?? ''
    return value && ltr.has(key) ? `\u2066${value}\u2069` : value
  })])) as unknown as LetterContent
}

const genericBody = 'تشهد {{company.name}} بأن الموظف {{employee.fullName}}، بالرقم الوظيفي {{employee.employeeCode}}، {{employee.employmentPhrase}} بمسمى {{employee.jobTitle}} منذ {{employee.joinDate}}.\n\nصدر هذا الخطاب بناءً على طلب الموظف للغرض التالي: {{purpose}}.'
const salaryBody = genericBody + '\n\nإجمالي الراتب الشهري المسجل بملف الموظف: {{salary.total}} {{salary.currency}}.'
export const DEFAULT_LETTER_TEMPLATES: Array<{ code: string; name: string; content: LetterContent }> = [
  ['SALARY', 'تعريف بالراتب', salaryBody],
  ['EMPLOYMENT', 'خطاب إثبات عمل', genericBody],
  ['EXPERIENCE', 'شهادة خبرة', 'تشهد {{company.name}} بأن {{employee.fullName}}، بالرقم الوظيفي {{employee.employeeCode}}، التحق بالعمل منذ {{employee.joinDate}}، والمسمى المسجل بملفه هو {{employee.jobTitle}}.\n\nأُصدرت هذه الشهادة بناءً على طلبه للغرض التالي: {{purpose}}.'],
  ['NOC', 'خطاب عدم ممانعة', genericBody + '\n\nلا مانع لدينا من إصدار هذا الخطاب للغرض المبين أعلاه.'],
  ['EMBASSY', 'خطاب موجه للسفارة', genericBody],
  ['BANK_LOAN', 'خطاب تعريف لجهة التمويل', salaryBody + '\n\nهذا الخطاب لإثبات بيانات العمل والراتب، ولا يمثل ضماناً أو التزاماً مالياً على الشركة.'],
].map(([code, name, body]) => ({ code: `LETTER_${code}`, name, content: { title: name, greeting: 'إلى من يهمه الأمر،', body, closing: 'وتفضلوا بقبول فائق الاحترام،\nإدارة الموارد البشرية', footer: 'وثيقة صادرة بعد اعتماد طلب الموظف رقم {{request.ref}} بتاريخ {{date}}.' } }))
