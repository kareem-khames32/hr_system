import type { HrDocumentContent, HrDocumentCustomField, HrDocumentVariable, HrDocumentTemplateInput } from './hr-documents'

export const EMPTY_HR_DOCUMENT: HrDocumentContent = { title: '', greeting: '', body: '', closing: '', footer: '' }
export const HR_DOCUMENT_STARTERS: HrDocumentTemplateInput[] = [
  { name: 'عقد عمل', category: 'contract', customFields: [{ key: 'custom.terms', label: 'بنود العقد', required: true }], draft: {
    title: 'عقد عمل', greeting: '', body: 'الشركة: {{company.name}}\nالموظف: {{employee.fullName}}\nالرقم الوظيفي: {{employee.employeeCode}}\n\n{{custom.terms}}', closing: '', footer: '{{company.name}} — {{company.address}}',
  } },
  { name: 'إقرار', category: 'acknowledgement', customFields: [{ key: 'custom.statement', label: 'نص الإقرار', required: true }], draft: {
    title: 'إقرار', greeting: '', body: 'الاسم: {{employee.fullName}}\nالرقم الوظيفي: {{employee.employeeCode}}\nالشركة: {{company.name}}\n\n{{custom.statement}}', closing: '', footer: '{{company.name}}',
  } },
  { name: 'شهادة', category: 'certificate', customFields: [{ key: 'custom.details', label: 'بيانات الشهادة المعتمدة', required: true }], draft: {
    title: 'شهادة', greeting: 'إلى من يهمه الأمر،', body: 'تصدر {{company.name}} هذه الشهادة بشأن {{employee.fullName}}.\n\n{{custom.details}}', closing: '', footer: '{{company.name}} — {{company.phone}}',
  } },
  { name: 'نموذج عام', category: 'general', customFields: [{ key: 'custom.content', label: 'محتوى المستند', required: true }], draft: {
    title: 'مستند عام', greeting: '', body: '{{company.name}}\n\n{{custom.content}}', closing: '', footer: '{{company.address}}',
  } },
]
export const HR_DOCUMENT_FIELDS: Array<{ key: keyof HrDocumentContent; label: string; rows: number; limit: number }> = [
  { key: 'title', label: 'عنوان المستند', rows: 1, limit: 200 },
  { key: 'greeting', label: 'التحية', rows: 2, limit: 500 },
  { key: 'body', label: 'نص المستند', rows: 9, limit: 12000 },
  { key: 'closing', label: 'الخاتمة والتوقيع', rows: 3, limit: 1500 },
  { key: 'footer', label: 'تذييل الصفحة', rows: 2, limit: 1500 },
]
const TOKEN = /\{\{\s*([^{}]+?)\s*\}\}/g
export const hrVariableKey = (key: string) => key.replace(/^\{\{\s*|\s*\}\}$/g, '')

export function hrEditorVariables(builtins: HrDocumentVariable[], fields: HrDocumentCustomField[]): HrDocumentVariable[] {
  return [...builtins, ...fields.map(field => ({ key: field.key, label: `حقل إضافي: ${field.label}`, sample: `مثال ${field.label}` }))]
}

export function transformHrDocument(content: HrDocumentContent, variables: HrDocumentVariable[], mode: 'canonical' | 'readable' | 'sample'): HrDocumentContent {
  const transform = (text: string) => text.replace(TOKEN, (original, token: string) => {
    const variable = variables.find(item => hrVariableKey(item.key) === token.trim() || item.label.trim() === token.trim())
    if (!variable) return original
    if (mode === 'sample') return String(variable.sample)
    return `{{${mode === 'canonical' ? hrVariableKey(variable.key) : variable.label}}}`
  })
  return { title: transform(content.title), greeting: transform(content.greeting), body: transform(content.body), closing: transform(content.closing), footer: transform(content.footer) }
}

export function hrDocumentEditorIssues(content: HrDocumentContent, builtins: HrDocumentVariable[], fields: HrDocumentCustomField[]): string[] {
  const issues: string[] = []
  if (fields.length > 20) issues.push('الحد الأقصى 20 حقلًا إضافيًا.')
  const keys = new Set<string>(); const labels = new Set<string>()
  for (const field of fields) {
    if (!/^custom\.[A-Za-z][A-Za-z0-9_]{0,49}$/.test(field.key)) issues.push('استخدم رمز حقل يبدأ بحرف إنجليزي ويحتوي حروفًا أو أرقامًا أو شرطة سفلية، بحد أقصى 50 حرفًا.')
    if (!field.label.trim() || field.label.trim().length > 100) issues.push('اسم كل حقل مطلوب وبحد أقصى 100 حرف.')
    if (keys.has(field.key)) issues.push('رموز الحقول الإضافية يجب أن تكون مختلفة.')
    if (labels.has(field.label.trim())) issues.push('أسماء الحقول الإضافية يجب أن تكون مختلفة.')
    keys.add(field.key); labels.add(field.label.trim())
  }
  const variables = hrEditorVariables(builtins, fields)
  const unknown = new Set<string>()
  for (const text of Object.values(content)) {
    for (const match of text.matchAll(TOKEN)) if (!variables.some(item => hrVariableKey(item.key) === match[1].trim() || item.label.trim() === match[1].trim())) unknown.add(match[1].trim())
    if (text.replace(TOKEN, '').includes('{{') || text.replace(TOKEN, '').includes('}}')) issues.push('توجد علامة متغير غير مكتملة؛ أدخل المتغير من الأزرار.')
  }
  if (unknown.size) issues.push(`متغيرات غير معرّفة: ${[...unknown].join('، ')}`)
  const canonical = transformHrDocument(content, variables, 'canonical')
  if (canonical.title.trim().length < 2) issues.push('اكتب عنوانًا من حرفين على الأقل.')
  if (canonical.body.trim().length < 10) issues.push('اكتب نص المستند من 10 أحرف على الأقل.')
  for (const field of HR_DOCUMENT_FIELDS) if (canonical[field.key].length > field.limit) issues.push(`${field.label}: الحد الأقصى ${field.limit} حرف.`)
  return [...new Set(issues)]
}

// A stable representation keeps one UUID for retries of exactly the same issuance.
export function hrDocumentAttemptFingerprint(input: { templateId: number; revisionId: number; employeeId?: number; values: Record<string, string> }): string {
  return JSON.stringify([input.templateId, input.revisionId, input.employeeId ?? null, Object.entries(input.values).sort(([a], [b]) => a.localeCompare(b))])
}
