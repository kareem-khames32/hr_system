import { apiFetch, rejectFailedRequestExecution, type ApiRequest, type CustomFieldDef } from './api'
import { SALARY_HISTORY_FIELDS, type SalaryHistoryAmounts } from './payroll-salary-history-api'

export const EMPLOYEE_SALARY_FIELDS = Object.keys(SALARY_HISTORY_FIELDS) as Array<keyof SalaryHistoryAmounts>
export interface EmployeeSalaryChangeContext {
  employeeId: number
  current: Record<keyof SalaryHistoryAmounts, string | null> & { currency: string | null }
  historyRevision: number
  currentSourceHash: string
  // قاعدة المالك: التغيير يسري من راتب شهر كامل؛ الخادم يثبت شهر المسير الجاري ودورته.
  cycleStartDay: number
  currentPayrollPeriod: string
  currentPayrollPeriodBounds?: { startDate: string; endDate: string }
  historyContract?: 'NONE' | 'DAILY' | 'MONTHLY'
}
export type EmployeeSalaryValues = SalaryHistoryAmounts & { currency: string }
export interface EmployeeSalaryChangeEvidence { effectivePayrollPeriod: string; reason: string; evidenceReference: string; previousEffectivePayrollPeriod?: string }
export interface EmployeeSalaryChangeCommand {
  expectedRevision: number; expectedCurrentSourceHash: string; effectivePayrollPeriod: string; reason: string; evidenceReference: string
  salary: SalaryHistoryAmounts & { currency: 'SAR' | 'EGP' }; previousEffectivePayrollPeriod?: string
}
const validId = (value: unknown) => typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 2147483647
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !value.startsWith('0000-') && Number.isFinite(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value
export const validPayrollMonth = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && !value.startsWith('0000-')
/** «راتب 2026-09» = 2026-08-23 → 2026-09-22 عند دورة 23؛ للعرض فقط والخادم هو المرجع. */
export function payrollMonthExplanation(context: Pick<EmployeeSalaryChangeContext, 'currentPayrollPeriod' | 'currentPayrollPeriodBounds' | 'cycleStartDay'>): string {
  const bounds = context.currentPayrollPeriodBounds
  return bounds && validDate(bounds.startDate) && validDate(bounds.endDate)
    ? `راتب شهر ${context.currentPayrollPeriod} = من ${bounds.startDate} إلى ${bounds.endDate} (الدورة تبدأ يوم ${context.cycleStartDay})`
    : `شهر المسير الجاري ${context.currentPayrollPeriod} (الدورة تبدأ يوم ${context.cycleStartDay})`
}
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
    (value.current.currency !== null && (typeof value.current.currency !== 'string' || value.current.currency.length > 20)) ||
    !Number.isInteger(value.cycleStartDay) || value.cycleStartDay < 1 || value.cycleStartDay > 31 || !validPayrollMonth(value.currentPayrollPeriod)) throw new Error('تعذر إثبات الأجر الحالي بدقة. أعد تحميل صفحة الموظف قبل تعديل الأجر.')
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
export function buildEmployeeSalaryChange(context: EmployeeSalaryChangeContext, form: EmployeeSalaryValues, evidence: EmployeeSalaryChangeEvidence): EmployeeSalaryChangeCommand | undefined {
  if (!employeeSalaryChanged(context, form)) return undefined
  const values = EMPLOYEE_SALARY_FIELDS.map(key => [key, canonical(form[key])] as const)
  if (values.some(([, value]) => value === null)) throw new Error('أكمل مكونات الأجر (الست وبدل ضغط العمل) بمبالغ غير سالبة ومنزلتين عشريتين على الأكثر. اكتب صفرًا صريحًا عند عدم الاستحقاق.')
  if (form.currency !== 'SAR' && form.currency !== 'EGP') throw new Error('اختر عملة الأجر: جنيه مصري أو ريال سعودي.')
  const effective = evidence.effectivePayrollPeriod?.trim()
  if (!validPayrollMonth(effective) || !validPayrollMonth(context.currentPayrollPeriod)) throw new Error('حدد «يسري من راتب شهر» لتغيير الأجر.')
  if (effective > context.currentPayrollPeriod) throw new Error('تغيير الأجر من راتب شهر لاحق يُقدَّم من طلب زيادة راتب؛ تعديل الملف يقبل شهر المسير الجاري أو شهرًا سابقًا.')
  if (!evidence.reason.trim() || evidence.reason.trim().length > 500) throw new Error('اكتب سبب تغيير الأجر بحد أقصى 500 حرف.')
  if (!evidence.evidenceReference.trim() || evidence.evidenceReference.trim().length > 200) throw new Error('اكتب مرجع عقد الأجر أو قرار التغيير بحد أقصى 200 حرف.')
  const previous = evidence.previousEffectivePayrollPeriod?.trim()
  if (previous && !employeePreviousSalaryCanBeConfirmed(context)) throw new Error('الأجر السابق غير مكتمل أو غير صالح لإثبات شهور سابقة.')
  if (previous && (context.historyRevision !== 0 || !validPayrollMonth(previous) || previous >= effective)) throw new Error('شهر إثبات الأجر السابق متاح لأول سجل فقط، ويجب أن يسبق شهر التغيير.')
  return { expectedRevision: context.historyRevision, expectedCurrentSourceHash: context.currentSourceHash, effectivePayrollPeriod: effective,
    reason: evidence.reason.trim(), evidenceReference: evidence.evidenceReference.trim(),
    salary: { ...Object.fromEntries(values) as SalaryHistoryAmounts, currency: form.currency }, ...(previous ? { previousEffectivePayrollPeriod: previous } : {}) }
}
export function employeeSalaryEditPayload<T extends object>(payload: T, context: EmployeeSalaryChangeContext | null, form: EmployeeSalaryValues, evidence: EmployeeSalaryChangeEvidence): T & { salaryChange?: EmployeeSalaryChangeCommand } {
  const result = { ...payload } as T & Record<string, unknown>
  for (const key of [...EMPLOYEE_SALARY_FIELDS, 'currency', 'salaryChange']) delete result[key]
  if (context) {
    const salaryChange = buildEmployeeSalaryChange(context, form, evidence)
    if (salaryChange) (result as Record<string, unknown>).salaryChange = salaryChange
  }
  return result
}
/** الخطوة 13: حدود «يسري من راتب شهر» لأجر التعيين كما يثبتها الخادم من الدورة وتاريخ التعيين. */
export interface EmployeeSalaryStartContext {
  cycleStartDay: number
  currentPayrollPeriod: string
  hireDate: string | null
  hirePayrollPeriod: string | null
  minPayrollPeriod: string | null
  maxPayrollPeriod: string
  defaultPayrollPeriod: string
  defaultPayrollPeriodBounds: { startDate: string; endDate: string }
}
export async function fetchEmployeeSalaryStartContext(hireDate: string, signal?: AbortSignal): Promise<EmployeeSalaryStartContext> {
  const date = hireDate.trim()
  if (date && !validDate(date)) throw new Error('تاريخ التعيين غير صالح لتحديد شهر سريان الأجر.')
  const value = await apiFetch<EmployeeSalaryStartContext>(`/employees/salary-start-context${date ? `?hireDate=${encodeURIComponent(date)}` : ''}`, { signal })
  if (!value || !Number.isInteger(value.cycleStartDay) || value.cycleStartDay < 1 || value.cycleStartDay > 31 || !validPayrollMonth(value.currentPayrollPeriod) ||
    !validPayrollMonth(value.maxPayrollPeriod) || !validPayrollMonth(value.defaultPayrollPeriod) || (value.minPayrollPeriod !== null && !validPayrollMonth(value.minPayrollPeriod)) ||
    (value.hireDate ?? '') !== date) throw new Error('تعذر تحديد شهر سريان أجر التعيين. سيُوثَّق الأجر من الشهر الافتراضي الذي يحدده الخادم.')
  return value
}
/**
 * شهر «يسري من راتب شهر» الذي يُرسل مع إنشاء الموظف: فقط عند وجود أجر وتحميل الحدود؛ بدون الحدود يترك الخادم يطبق افتراضه.
 * يرمي رسالة عربية عند شهر خارج المدى أو عملة لا يدعمها المسير.
 */
export function employeeCreateSalaryPeriod(context: EmployeeSalaryStartContext | null, chosen: string, form: SalaryHistoryAmounts & { currency: string }): string | undefined {
  const hasSalary = EMPLOYEE_SALARY_FIELDS.some(key => { const amount = canonical(String(form[key] ?? '').trim()); return amount !== null && amount !== '0.00' })
  if (!hasSalary) return undefined
  if (form.currency !== 'SAR' && form.currency !== 'EGP') throw new Error('اختر عملة الأجر: ريال سعودي أو جنيه مصري؛ أجر التعيين يُوثَّق للمسير بهاتين العملتين فقط.')
  if (!context) return undefined
  const effective = chosen.trim() || context.defaultPayrollPeriod
  if (!validPayrollMonth(effective)) throw new Error('حدد «يسري من راتب شهر» لأجر التعيين بصيغة شهر صحيحة.')
  if (context.minPayrollPeriod !== null && effective < context.minPayrollPeriod) throw new Error(`أجر التعيين لا يسري قبل راتب شهر التعيين ${context.minPayrollPeriod}.`)
  if (effective > context.maxPayrollPeriod) throw new Error(`أجر التعيين يسري من راتب شهر ${context.maxPayrollPeriod} على الأكثر؛ الزيادة من شهر لاحق تُقدَّم بطلب زيادة راتب بعد الإنشاء.`)
  return effective
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
const salaryRequestReserved = ['newSalary', 'effectivePayrollPeriod', 'effectiveDate', 'reason', 'increase_pct', 'salaryChangeBasis', 'salaryChangeApproval']
export function salaryIncreaseRequestFields(configured: readonly CustomFieldDef[], required: readonly CustomFieldDef[]): CustomFieldDef[] {
  const extra = new Map<string, CustomFieldDef>()
  for (const field of configured) if (!salaryRequestReserved.includes(field.key)) extra.set(field.key, { ...field })
  for (const field of required) if (!salaryRequestReserved.includes(field.key)) extra.set(field.key, { ...(extra.get(field.key) ?? field), required: true })
  return [
    { key: 'newSalary', label: 'الراتب الأساسي الجديد', type: 'text', required: true },
    { key: 'effectivePayrollPeriod', label: 'يسري من راتب شهر', type: 'month', required: true },
    { key: 'reason', label: 'سبب زيادة الراتب', type: 'text', required: true },
    ...extra.values(),
  ]
}
export function salaryIncreaseRequestPayload(values: Record<string, string>, configured: readonly CustomFieldDef[] = [], numericKeys: readonly string[] = []): Record<string, unknown> & { newSalary: string; effectivePayrollPeriod: string; reason: string } {
  const newSalary = canonical((values.newSalary ?? '').trim()), effectivePayrollPeriod = (values.effectivePayrollPeriod ?? '').trim(), reason = (values.reason ?? '').trim()
  if (newSalary === null) throw new Error('اكتب الراتب الأساسي الجديد مبلغًا غير سالب بمنزلتين عشريتين على الأكثر.')
  // قاعدة المالك: الزيادة تسري على شهر مسير كامل؛ لا تاريخ يومي.
  if (!validPayrollMonth(effectivePayrollPeriod)) throw new Error('حدد «يسري من راتب شهر» لزيادة الراتب.')
  if (!reason || reason.length > 500) throw new Error('اكتب سبب زيادة الراتب بحد أقصى 500 حرف.')
  const extra: Record<string, unknown> = {}
  for (const field of configured) {
    if (salaryRequestReserved.includes(field.key)) continue
    const raw = (values[field.key] ?? '').trim()
    if (field.required && !raw) throw new Error(`أكمل الحقل المطلوب: ${field.label}.`)
    const value = (field.type === 'number' || numericKeys.includes(field.key)) && raw !== '' ? Number(raw) : raw
    Object.defineProperty(extra, field.key, { value, enumerable: true, writable: true, configurable: true })
  }
  return { ...extra, newSalary, effectivePayrollPeriod, reason }
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
