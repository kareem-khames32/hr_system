import { apiFetch, getCurrentUser, type CurrentUser } from './api'
import { branchScopeOfUser, canSeeBranch } from './branch-scope'

export type PayrollCalendarScope = 'GLOBAL' | 'BRANCH' | 'EMPLOYEE'
export interface PayrollCalendarContext {
  scope: PayrollCalendarScope; sourceId: number; revision: number; currentSourceHash: string
  effectiveFrom: string | null; legacyBaseline: boolean; current: Record<string, unknown>
  currentMatchesHistory: boolean
}
export interface CalendarChangeEvidence { effectiveFrom: string; reason: string }
export interface PayrollCalendarChange extends CalendarChangeEvidence { expectedRevision: number; expectedCurrentSourceHash: string }
export const emptyCalendarEvidence = (): CalendarChangeEvidence => ({ effectiveFrom: '', reason: '' })
const idValid = (id: unknown) => typeof id === 'number' && Number.isSafeInteger(id) && id > 0 && id <= 2147483647
const dateValid = (date: unknown): date is string => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && !date.startsWith('0000-') && Number.isFinite(Date.parse(date + 'T00:00:00Z')) && new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) === date
function scopeValid(scope: PayrollCalendarScope, sourceId: number) {
  if (!['GLOBAL', 'BRANCH', 'EMPLOYEE'].includes(scope) || (scope === 'GLOBAL' ? sourceId !== 0 : !idValid(sourceId))) throw new Error('نطاق التقويم غير صالح.')
}
// مرآة assertCalendarScope في الخادم: العام لحساب «كل الفروع» بس، وتقويم الفرع لحساب نطاقه فيه الفرع ده (فرع أو أكتر).
// الحساب اللي مش على مستوى الشركة ومالوش فرع (نطاق فاضي) مايكتبش حاجة — مش «الكل».
export function calendarScopeWritable(scope: PayrollCalendarScope, sourceId: number, user: CurrentUser | null = getCurrentUser()): boolean {
  if (!user) return false
  const branches = branchScopeOfUser(user)
  if (branches === null) return true
  if (scope === 'GLOBAL') return false
  if (scope === 'BRANCH') return canSeeBranch(branches, sourceId)
  return true // نطاق الموظف يُثبت من سياق الخادم؛ لا نستنتجه من معرّف الموظف.
}
export async function fetchPayrollCalendarContext(scope: PayrollCalendarScope, sourceId: number, signal?: AbortSignal): Promise<PayrollCalendarContext> {
  scopeValid(scope, sourceId)
  const result = await apiFetch<PayrollCalendarContext>(`/attendance/calendar-context?${new URLSearchParams({ scope, sourceId: String(sourceId) })}`, { signal })
  return validatePayrollCalendarContext(result, scope, sourceId)
}
export function validatePayrollCalendarContext(result: PayrollCalendarContext, scope: PayrollCalendarScope, sourceId: number): PayrollCalendarContext {
  scopeValid(scope, sourceId)
  if (!result || result.scope !== scope || result.sourceId !== sourceId || !Number.isSafeInteger(result.revision) || result.revision < 0 || result.revision > 2147483647 ||
    typeof result.currentSourceHash !== 'string' || !/^[a-f0-9]{64}$/.test(result.currentSourceHash) || typeof result.legacyBaseline !== 'boolean' ||
    !(result.effectiveFrom === null || dateValid(result.effectiveFrom)) || typeof result.currentMatchesHistory !== 'boolean' || !result.current || typeof result.current !== 'object' || Array.isArray(result.current)) throw new Error('رد سياق التقويم غير صالح. أعد تحميله قبل التعديل.')
  const current = result.current
  const nullableText = (value: unknown, limit: number) => value === null || typeof value === 'string' && value.length <= limit
  if (scope === 'GLOBAL' && (!nullableText(current.weekendDays, 40) || !Array.isArray(current.holidays) || !Array.isArray(current.exceptions)) ||
    scope === 'BRANCH' && (current.id !== sourceId || !nullableText(current.country, 5) || !nullableText(current.weekendDays, 40) || !Array.isArray(current.exceptions)) ||
    scope === 'EMPLOYEE' && !(current.branchId === null || idValid(current.branchId))) throw new Error('تفاصيل نطاق التقويم غير مكتملة؛ لا يمكن استخدامها أساسًا للحفظ.')
  const rowsValid = (rows: unknown, check: (row: Record<string, unknown>) => boolean) => Array.isArray(rows) && rows.length <= 10000 && rows.every(row => row && typeof row === 'object' && !Array.isArray(row) && check(row))
  if (scope !== 'EMPLOYEE' && !rowsValid(current.exceptions, row => idValid(row.id) && typeof row.name === 'string' && ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].includes(String(row.weekday)) && ['ALL', '1ST', '2ND', '3RD', '4TH', 'LAST'].includes(String(row.occurrence)) && ['OFF', 'WORK'].includes(String(row.effect)) && typeof row.isActive === 'boolean') ||
    scope === 'GLOBAL' && !rowsValid(current.holidays, row => idValid(row.id) && typeof row.name === 'string' && dateValid(row.date) && (row.endDate === null || dateValid(row.endDate) && row.endDate >= String(row.date)) && nullableText(row.country, 5))) throw new Error('عناصر التقويم غير مكتملة؛ أعد تحميل السياق قبل الحفظ.')
  return result
}
export function buildCalendarChange(context: PayrollCalendarContext | null, evidence: CalendarChangeEvidence): PayrollCalendarChange {
  if (!context) throw new Error('حمّل سياق التقويم أولًا؛ تعديل التقويم غير متاح دون معرفة نسخته الحالية.')
  validatePayrollCalendarContext(context, context.scope, context.sourceId)
  if (context.currentMatchesHistory === false) throw new Error('تغيّرت بيانات التقويم خارج السجل المحفوظ. راجع التغيير غير المسجل قبل الحفظ.')
  if (!dateValid(evidence.effectiveFrom)) throw new Error('حدد تاريخًا صحيحًا لتطبيق تغيير التقويم.')
  if (context.effectiveFrom && evidence.effectiveFrom < context.effectiveFrom) throw new Error(`تاريخ التطبيق لا يسبق أحدث نسخة: ${context.effectiveFrom}.`)
  const reason = evidence.reason.trim()
  if (reason.length < 3 || reason.length > 500) throw new Error('اكتب سبب التغيير من 3 إلى 500 حرف.')
  return { effectiveFrom: evidence.effectiveFrom, reason, expectedRevision: context.revision, expectedCurrentSourceHash: context.currentSourceHash }
}
export async function confirmPayrollCalendarContext(context: PayrollCalendarContext, evidence: CalendarChangeEvidence): Promise<PayrollCalendarContext> {
  const calendarChange = buildCalendarChange(context, evidence)
  const result = await apiFetch<PayrollCalendarContext>('/attendance/calendar-context/confirm', { method: 'POST', body: JSON.stringify({ scope: context.scope, sourceId: context.sourceId, calendarChange }) })
  validatePayrollCalendarContext(result, context.scope, context.sourceId)
  if (result.revision !== context.revision + 1 || result.effectiveFrom !== calendarChange.effectiveFrom || result.legacyBaseline || !result.currentMatchesHistory || result.currentSourceHash !== context.currentSourceHash) throw new Error('رد تأكيد التقويم لا يثبت النسخة المطلوبة. أعد تحميل السياق قبل أي محاولة جديدة.')
  return result
}
export async function deleteCalendarSource(path: `/catalogs/holidays/${number}` | `/attendance/schedule-rules/${number}`, context: PayrollCalendarContext, evidence: CalendarChangeEvidence) {
  if (!/^\/(?:catalogs\/holidays|attendance\/schedule-rules)\/[1-9]\d*$/.test(path)) throw new Error('مرجع عنصر التقويم غير صالح.')
  return apiFetch<{ deleted?: boolean; warning?: string }>(path, { method: 'DELETE', body: JSON.stringify({ calendarChange: buildCalendarChange(context, evidence) }) })
}
export function calendarRuleToggle(context: PayrollCalendarContext, ruleId: number, displayedIsActive: boolean): { isActive: boolean } {
  validatePayrollCalendarContext(context, context.scope, context.sourceId)
  const row = Array.isArray(context.current.exceptions) ? context.current.exceptions.find(item => item.id === ruleId) : null
  if (!row || row.isActive !== displayedIsActive) throw new Error('تغيّرت حالة القاعدة منذ عرض القائمة. أغلق النافذة وحدّث القواعد قبل تأكيد القرار.')
  return { isActive: !row.isActive }
}
export function employeeCalendarPayload<T extends object>(payload: T, originalBranchId: string, nextBranchId: string, context: PayrollCalendarContext | null, evidence: CalendarChangeEvidence, confirmCurrent: boolean): T & { calendarChange?: PayrollCalendarChange } {
  const result = { ...payload } as T & Record<string, unknown>
  delete result.calendarChange
  const changed = originalBranchId !== nextBranchId
  if (!changed) delete result.branchId
  if (changed || confirmCurrent) {
    if (!context || context.scope !== 'EMPLOYEE') throw new Error('تعذر تحميل تاريخ فرع الموظف. يمكن حفظ البيانات الأخرى بعد إبقاء الفرع الحالي.')
    ;(result as Record<string, unknown>).calendarChange = buildCalendarChange(context, evidence)
  }
  return result
}
