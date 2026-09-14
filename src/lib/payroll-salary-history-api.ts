import { apiFetch } from './api'

export const SALARY_HISTORY_FIELDS = { basicSalary: 'الأساسي', housingAllowance: 'السكن', transportAllowance: 'الانتقال', phoneAllowance: 'الهاتف', workNatureAllowance: 'طبيعة العمل', otherAllowance: 'أخرى' } as const
export type SalaryHistoryAmounts = Record<keyof typeof SALARY_HISTORY_FIELDS, string>
export const MONTHLY_SALARY_HISTORY_VERSION = 'SALARY_PAYROLL_PERIOD_HISTORY_V2_20260914'
export type SalaryHistorySegment = SalaryHistoryAmounts & { effectiveFrom: string; effectiveTo: string | null; currency: 'SAR' | 'EGP'; effectivePayrollPeriod?: string; effectiveToPayrollPeriod?: string | null }
export interface SalaryHistoryView {
  employee: { id: number; employeeCode: string; fullName: string; branchId: number | null }
  current: Record<keyof typeof SALARY_HISTORY_FIELDS, string | null> & { currency: string | null }
  currentSourceHash: string
  revision: number
  version: null | { id: number; revision: number; reason: string; evidenceReference: string; createdAt: string; createdBy: number; contentHash: string; currentSourceHash: string; contractVersion?: string | null; cycleStartDay?: number | null }
  segments: SalaryHistorySegment[]
  capabilities: { canEdit: boolean }
}
export const emptySalaryHistorySegment = (): SalaryHistorySegment => ({ effectiveFrom: '', effectiveTo: null, currency: 'EGP', basicSalary: '', housingAllowance: '', transportAllowance: '', phoneAllowance: '', workNatureAllowance: '', otherAllowance: '' })
export const emptyMonthlySalaryPeriod = (): SalaryHistorySegment => ({ ...emptySalaryHistorySegment(), effectivePayrollPeriod: '', effectiveToPayrollPeriod: null })
const monthValid = (value: unknown): value is string => typeof value === 'string' && /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(value)
const dateValid = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !value.startsWith('0000-') && Number.isFinite(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value
const exactMoney = (value: unknown): value is string => typeof value === 'string' && /^\d{1,16}(?:\.\d{1,2})?$/.test(value)
export function monthlySalaryFormError(segments: SalaryHistorySegment[], reason: string, evidence: string): string | null {
  if (!reason.trim() || reason.trim().length > 500) return 'اكتب سبب التوثيق أو التصحيح، بحد أقصى 500 حرف.'
  if (!evidence.trim() || evidence.trim().length > 200) return 'اكتب مرجع العقد أو قرار الأجر، بحد أقصى 200 حرف.'
  if (!Array.isArray(segments) || !segments.length || segments.length > 120) return 'أضف فترة راتب واحدة على الأقل، وبحد أقصى 120 فترة.'
  for (let index = 0; index < segments.length; index++) {
    const row = segments[index]
    if (!row || !monthValid(row.effectivePayrollPeriod) || (row.effectiveToPayrollPeriod !== null && (!monthValid(row.effectiveToPayrollPeriod) || row.effectiveToPayrollPeriod < row.effectivePayrollPeriod))) return `حدد شهر سريان الراتب وآخر شهر للفترة ${index + 1}؛ لا نستنتج الشهر من التاريخ القديم.`
    if (!['SAR', 'EGP'].includes(row.currency) || Object.keys(SALARY_HISTORY_FIELDS).some(key => !exactMoney(row[key as keyof SalaryHistoryAmounts]))) return `أكمل العملة ومكونات الراتب الستة للفترة ${index + 1} بمبالغ صريحة غير سالبة ومنزلتين عشريتين على الأكثر.`
    const previous = segments[index - 1]
    if (previous && (previous.effectiveToPayrollPeriod === null || previous.effectiveToPayrollPeriod! >= row.effectivePayrollPeriod)) return 'رتب فترات الرواتب من الأقدم إلى الأحدث دون تداخل؛ الفترة المستمرة تكون الأخيرة.'
  }
  return null
}
export function salaryHistoryFormError(segments: SalaryHistorySegment[], reason: string, evidence: string): string | null {
  if (!reason.trim() || reason.trim().length > 500) return 'اكتب سبب التوثيق أو التصحيح، بحد أقصى 500 حرف.'
  if (!evidence.trim() || evidence.trim().length > 200) return 'اكتب مرجع العقد أو قرار الأجر، بحد أقصى 200 حرف.'
  if (!Array.isArray(segments) || !segments.length || segments.length > 120) return 'أضف فترة أجر واحدة على الأقل، وبحد أقصى 120 فترة.'
  for (let index = 0; index < segments.length; index++) {
    const row = segments[index]
    if (!row || !dateValid(row.effectiveFrom) || (row.effectiveTo !== null && (!dateValid(row.effectiveTo) || row.effectiveTo < row.effectiveFrom))) return `حدد بداية ونهاية صحيحتين لفترة الأجر ${index + 1}.`
    if (!['SAR', 'EGP'].includes(row.currency)) return 'حدد عملة كل فترة أجر.'
    if (Object.keys(SALARY_HISTORY_FIELDS).some(key => !exactMoney(row[key as keyof SalaryHistoryAmounts]))) return `اكتب المكونات الستة للفترة ${index + 1}، بما فيها الصفر عند عدم الاستحقاق. المبلغ غير سالب وبحد أقصى منزلتين عشريتين.`
    if (index && (segments[index - 1].effectiveTo === null || segments[index - 1].effectiveTo! >= row.effectiveFrom)) return 'رتب الفترات من الأقدم إلى الأحدث دون تداخل؛ الفترة المفتوحة تكون الأخيرة فقط.'
  }
  return null
}
function validateResponse(value: SalaryHistoryView, employeeId: number): SalaryHistoryView {
  if (!value || value.employee?.id !== employeeId || typeof value.employee.fullName !== 'string' || !Number.isSafeInteger(value.revision) || value.revision < 0 || !/^[a-f0-9]{64}$/.test(value.currentSourceHash) || !value.current || typeof value.capabilities?.canEdit !== 'boolean' || !Array.isArray(value.segments) || value.segments.length > 120 ||
    Object.keys(SALARY_HISTORY_FIELDS).some(key => { const current = value.current[key as keyof SalaryHistoryAmounts]; return current !== null && (typeof current !== 'string' || !/^-?\d{1,16}(?:\.\d{1,2})?$/.test(current)) }) ||
    (value.revision === 0 ? value.version !== null || value.segments.length !== 0 : !value.version || value.version.revision !== value.revision || typeof value.version.reason !== 'string' || typeof value.version.evidenceReference !== 'string' ||
      (value.version.contractVersion === MONTHLY_SALARY_HISTORY_VERSION ? monthlySalaryFormError(value.segments, value.version.reason, value.version.evidenceReference) : salaryHistoryFormError(value.segments, value.version.reason, value.version.evidenceReference)) !== null)) {
    throw new Error('رد سجل الأجر لا يطابق الموظف أو يحتوي بيانات غير صالحة؛ أعد تحميل السجل.')
  }
  if (value.version?.contractVersion === MONTHLY_SALARY_HISTORY_VERSION) {
    if (!Number.isInteger(value.version.cycleStartDay) || value.version.cycleStartDay! < 1 || value.version.cycleStartDay! > 31 || value.segments.some(row => !dateValid(row.effectiveFrom) || (row.effectiveTo !== null && (!dateValid(row.effectiveTo) || row.effectiveTo < row.effectiveFrom)))) throw new Error('رد سجل الأجر الشهري غير مكتمل؛ أعد تحميل السجل.')
  } else if (value.version?.contractVersion != null || value.segments.some(row => row.effectivePayrollPeriod != null || row.effectiveToPayrollPeriod != null)) throw new Error('نسخة سجل الأجر غير معروفة؛ لا يمكن تفسير الشهور تلقائيًا.')
  return value
}
export async function fetchSalaryHistory(employeeId: number, signal?: AbortSignal): Promise<SalaryHistoryView> {
  if (!Number.isSafeInteger(employeeId) || employeeId < 1) throw new Error('اختر موظفًا صحيحًا.')
  return validateResponse(await apiFetch<SalaryHistoryView>(`/payroll/employees/${employeeId}/salary-history`, { signal }), employeeId)
}
export async function saveSalaryHistory(view: SalaryHistoryView, segments: SalaryHistorySegment[], reason: string, evidenceReference: string): Promise<SalaryHistoryView> {
  if (view.version?.contractVersion === MONTHLY_SALARY_HISTORY_VERSION || segments.some(row => row.effectivePayrollPeriod != null)) throw new Error('احفظ هذا السجل من مسار شهور الرواتب للحفاظ على شهر سريان كل قيمة.')
  const error = salaryHistoryFormError(segments, reason, evidenceReference)
  if (error) throw new Error(error)
  // القائمة البيضاء تمنع إعادة إرسال حقول التدقيق أو معرفات النسخ المأخوذة من رد الخادم.
  const rows = segments.map(row => ({ effectiveFrom: row.effectiveFrom, effectiveTo: row.effectiveTo, currency: row.currency, ...Object.fromEntries(Object.keys(SALARY_HISTORY_FIELDS).map(key => [key, row[key as keyof SalaryHistoryAmounts]])) }))
  const result = await apiFetch<SalaryHistoryView>(`/payroll/employees/${view.employee.id}/salary-history`, { method: 'POST', body: JSON.stringify({ expectedRevision: view.revision, expectedCurrentSourceHash: view.currentSourceHash, reason: reason.trim(), evidenceReference: evidenceReference.trim(), segments: rows }) })
  const checked = validateResponse(result, view.employee.id)
  if (checked.revision !== view.revision + 1) throw new Error('وصل رد حفظ غير متوقع؛ أعد تحميل السجل قبل أي محاولة جديدة.')
  return checked
}

export async function saveMonthlySalaryHistory(view: SalaryHistoryView, segments: SalaryHistorySegment[], reason: string, evidenceReference: string): Promise<SalaryHistoryView> {
  const error = monthlySalaryFormError(segments, reason, evidenceReference)
  if (error) throw new Error(error)
  const periods = segments.map(row => ({ effectivePayrollPeriod: row.effectivePayrollPeriod!, effectiveToPayrollPeriod: row.effectiveToPayrollPeriod!, currency: row.currency,
    ...Object.fromEntries(Object.keys(SALARY_HISTORY_FIELDS).map(key => [key, row[key as keyof SalaryHistoryAmounts]])) }))
  const result = await apiFetch<SalaryHistoryView>(`/payroll/employees/${view.employee.id}/salary-history/monthly`, { method: 'POST', body: JSON.stringify({ expectedRevision: view.revision, expectedCurrentSourceHash: view.currentSourceHash, reason: reason.trim(), evidenceReference: evidenceReference.trim(), periods }) })
  const checked = validateResponse(result, view.employee.id)
  if (checked.revision !== view.revision + 1 || checked.version?.contractVersion !== MONTHLY_SALARY_HISTORY_VERSION) throw new Error('وصل رد حفظ شهور غير متوقع؛ أعد تحميل السجل قبل أي محاولة جديدة.')
  return checked
}
