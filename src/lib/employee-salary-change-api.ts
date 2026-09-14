import { apiFetch, rejectFailedRequestExecution, type ApiRequest, type CustomFieldDef } from './api'
import { SALARY_HISTORY_FIELDS, type SalaryHistoryAmounts } from './payroll-salary-history-api'

export const EMPLOYEE_SALARY_FIELDS = Object.keys(SALARY_HISTORY_FIELDS) as Array<keyof SalaryHistoryAmounts>
export interface EmployeeSalaryChangeContext {
  employeeId: number
  current: Record<keyof SalaryHistoryAmounts, string | null> & { currency: string | null }
  historyRevision: number
  currentSourceHash: string
}
export type EmployeeSalaryValues = SalaryHistoryAmounts & { currency: string }
export interface EmployeeSalaryChangeEvidence { effectiveDate: string; reason: string; evidenceReference: string; previousEffectiveFrom?: string }
export interface EmployeeSalaryChangeCommand {
  expectedRevision: number; expectedCurrentSourceHash: string; effectiveDate: string; reason: string; evidenceReference: string
  salary: SalaryHistoryAmounts & { currency: 'SAR' | 'EGP' }; previousEffectiveFrom?: string
}
const validId = (value: unknown) => typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 2147483647
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !value.startsWith('0000-') && Number.isFinite(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value
function canonical(value: string, signed = false): string | null {
  if (!(signed ? /^-?\d{1,16}(?:\.\d{1,2})?$/ : /^\d{1,16}(?:\.\d{1,2})?$/).test(value)) return null
  const negative = value.startsWith('-'), [whole, fraction = ''] = value.replace(/^-/, '').split('.')
  const money = `${whole.replace(/^0+(?=\d)/, '')}.${fraction.padEnd(2, '0')}`
  return negative && money !== '0.00' ? '-' + money : money
}
export async function fetchEmployeeSalaryChangeContext(employeeId: number, signal?: AbortSignal): Promise<EmployeeSalaryChangeContext> {
  if (!validId(employeeId)) throw new Error('معرّف الموظف غير صالح.')
  const value = await apiFetch<EmployeeSalaryChangeContext>(`/employees/${employeeId}/salary-change-context`, { signal })
  if (!value || value.employeeId !== employeeId || !Number.isInteger(value.historyRevision) || value.historyRevision < 0 || value.historyRevision > 2147483647 ||
    !/^[a-f0-9]{64}$/.test(value.currentSourceHash) || !value.current ||
    EMPLOYEE_SALARY_FIELDS.some(key => value.current[key] !== null && (typeof value.current[key] !== 'string' || canonical(value.current[key]!, true) === null)) ||
    (value.current.currency !== null && (typeof value.current.currency !== 'string' || value.current.currency.length > 20))) throw new Error('تعذر إثبات الأجر الحالي بدقة. أعد تحميل صفحة الموظف قبل تعديل الأجر.')
  return value
}
export function employeeSalaryChanged(context: EmployeeSalaryChangeContext, form: EmployeeSalaryValues): boolean {
  return (context.current.currency ?? '') !== form.currency || EMPLOYEE_SALARY_FIELDS.some(key => {
    const previous = context.current[key], next = form[key]
    return previous === null ? next !== '' : typeof next !== 'string' || canonical(previous, true) !== canonical(next, true)
  })
}
export function employeePreviousSalaryCanBeConfirmed(context: EmployeeSalaryChangeContext): boolean {
  return context.historyRevision === 0 && ['SAR', 'EGP'].includes(context.current.currency ?? '') &&
    EMPLOYEE_SALARY_FIELDS.every(key => typeof context.current[key] === 'string' && canonical(context.current[key]!) !== null)
}
export function buildEmployeeSalaryChange(context: EmployeeSalaryChangeContext, form: EmployeeSalaryValues, evidence: EmployeeSalaryChangeEvidence, today: string): EmployeeSalaryChangeCommand | undefined {
  if (!employeeSalaryChanged(context, form)) return undefined
  const values = EMPLOYEE_SALARY_FIELDS.map(key => [key, canonical(form[key])] as const)
  if (values.some(([, value]) => value === null)) throw new Error('أكمل مكونات الأجر الستة بمبالغ غير سالبة ومنزلتين عشريتين على الأكثر. اكتب صفرًا صريحًا عند عدم الاستحقاق.')
  if (form.currency !== 'SAR' && form.currency !== 'EGP') throw new Error('اختر عملة الأجر: جنيه مصري أو ريال سعودي.')
  if (!validDate(evidence.effectiveDate) || !validDate(today)) throw new Error('حدد تاريخ سريان صحيحًا لتغيير الأجر.')
  if (evidence.effectiveDate > today) throw new Error('تغيير الأجر المستقبلي يُقدّم من طلب زيادة راتب؛ تعديل الملف يقبل تاريخ اليوم أو تاريخًا سابقًا.')
  if (!evidence.reason.trim() || evidence.reason.trim().length > 500) throw new Error('اكتب سبب تغيير الأجر بحد أقصى 500 حرف.')
  if (!evidence.evidenceReference.trim() || evidence.evidenceReference.trim().length > 200) throw new Error('اكتب مرجع عقد الأجر أو قرار التغيير بحد أقصى 200 حرف.')
  const previous = evidence.previousEffectiveFrom?.trim()
  if (previous && !employeePreviousSalaryCanBeConfirmed(context)) throw new Error('الأجر السابق غير مكتمل أو غير صالح لإثبات فترة سابقة.')
  if (previous && (context.historyRevision !== 0 || !validDate(previous) || previous >= evidence.effectiveDate)) throw new Error('تاريخ إثبات الأجر السابق متاح لأول سجل فقط، ويجب أن يسبق تاريخ التغيير.')
  return { expectedRevision: context.historyRevision, expectedCurrentSourceHash: context.currentSourceHash, effectiveDate: evidence.effectiveDate,
    reason: evidence.reason.trim(), evidenceReference: evidence.evidenceReference.trim(),
    salary: { ...Object.fromEntries(values) as SalaryHistoryAmounts, currency: form.currency }, ...(previous ? { previousEffectiveFrom: previous } : {}) }
}
export function employeeSalaryEditPayload<T extends object>(payload: T, context: EmployeeSalaryChangeContext | null, form: EmployeeSalaryValues, evidence: EmployeeSalaryChangeEvidence, today: string): T & { salaryChange?: EmployeeSalaryChangeCommand } {
  const result = { ...payload } as T & Record<string, unknown>
  for (const key of [...EMPLOYEE_SALARY_FIELDS, 'currency', 'salaryChange']) delete result[key]
  if (context) {
    const salaryChange = buildEmployeeSalaryChange(context, form, evidence, today)
    if (salaryChange) (result as Record<string, unknown>).salaryChange = salaryChange
  }
  return result
}
export function employeeSalaryTotal(form: SalaryHistoryAmounts): string | null {
  let cents = BigInt(0)
  for (const key of EMPLOYEE_SALARY_FIELDS) {
    const amount = canonical(form[key], true)
    if (amount === null) return null
    cents += BigInt(amount.replace('.', ''))
  }
  const negative = cents < BigInt(0); if (negative) cents = -cents
  return `${negative ? '-' : ''}${String(cents / BigInt(100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${String(cents % BigInt(100)).padStart(2, '0')}`
}
const salaryRequestReserved = ['newSalary', 'effectiveDate', 'reason', 'increase_pct', 'salaryChangeBasis', 'salaryChangeApproval']
export function salaryIncreaseRequestFields(configured: readonly CustomFieldDef[], required: readonly CustomFieldDef[]): CustomFieldDef[] {
  const extra = new Map<string, CustomFieldDef>()
  for (const field of configured) if (!salaryRequestReserved.includes(field.key)) extra.set(field.key, { ...field })
  for (const field of required) if (!salaryRequestReserved.includes(field.key)) extra.set(field.key, { ...(extra.get(field.key) ?? field), required: true })
  return [
    { key: 'newSalary', label: 'الراتب الأساسي الجديد', type: 'text', required: true },
    { key: 'effectiveDate', label: 'تاريخ سريان الزيادة', type: 'date', required: true },
    { key: 'reason', label: 'سبب زيادة الراتب', type: 'text', required: true },
    ...extra.values(),
  ]
}
export function salaryIncreaseRequestPayload(values: Record<string, string>, configured: readonly CustomFieldDef[] = [], numericKeys: readonly string[] = []): Record<string, unknown> & { newSalary: string; effectiveDate: string; reason: string } {
  const newSalary = canonical((values.newSalary ?? '').trim()), effectiveDate = (values.effectiveDate ?? '').trim(), reason = (values.reason ?? '').trim()
  if (newSalary === null) throw new Error('اكتب الراتب الأساسي الجديد مبلغًا غير سالب بمنزلتين عشريتين على الأكثر.')
  if (!validDate(effectiveDate)) throw new Error('حدد تاريخ سريان زيادة الراتب.')
  if (!reason || reason.length > 500) throw new Error('اكتب سبب زيادة الراتب بحد أقصى 500 حرف.')
  const extra: Record<string, unknown> = {}
  for (const field of configured) {
    if (salaryRequestReserved.includes(field.key)) continue
    const raw = (values[field.key] ?? '').trim()
    if (field.required && !raw) throw new Error(`أكمل الحقل المطلوب: ${field.label}.`)
    const value = (field.type === 'number' || numericKeys.includes(field.key)) && raw !== '' ? Number(raw) : raw
    Object.defineProperty(extra, field.key, { value, enumerable: true, writable: true, configurable: true })
  }
  return { ...extra, newSalary, effectiveDate, reason }
}
export function canCancelSalaryIncreaseExecution(request: ApiRequest | null, handler: string | undefined, canManageSettings: boolean): boolean {
  return !!request && canManageSettings && !request.confidentialMasked && request.status === 'IN_EXECUTION' && !request.completedAt &&
    (request.typeCode === 'SALARY_INCREASE' || handler === 'salary_update_history')
}
export async function cancelSalaryIncreaseExecution(request: ApiRequest, handler: string | undefined, canManageSettings: boolean, comment: string): Promise<ApiRequest> {
  if (!validId(request.id) || !canCancelSalaryIncreaseExecution(request, handler, canManageSettings)) throw new Error('إلغاء التنفيذ متاح لمسؤول الإعدادات لزيادة راتب قيد التنفيذ فقط.')
  const reason = comment.trim()
  if (reason.length < 3 || reason.length > 900) throw new Error('اكتب سبب إلغاء التنفيذ من 3 إلى 900 حرف.')
  // المرجع قد يكون لحركة مجدولة؛ الخادم وحده يتحقق أنها لم تُنفذ ماليًا قبل الإلغاء.
  const result = await rejectFailedRequestExecution(request.id, reason)
  if (!result || result.id !== request.id || result.status !== 'REJECTED') throw new Error('رد إلغاء التنفيذ غير متوقع. أعد تحميل تفاصيل الطلب قبل المتابعة.')
  return result
}
