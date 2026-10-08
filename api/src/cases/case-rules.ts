import { BadRequestException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { CASE_KINDS, CASE_MANUAL_EVENTS, CASE_OUTCOMES, CASE_PARTY_ROLES, type CaseEventKind, type CaseKind, type CaseOutcome, type CasePartyRole, type CaseStatus } from './case.entities'

// B3.11: قواعد ملفات القضايا — فحص وجود ترحيلات 124–126، وقيم القضية وأطرافها وأحداثها، وتعارض المصالح، ومهلة الاعتراض.

export const CASES_PERMISSION = 'cases.investigate'
export const CASES_MIGRATION_MISSING = 'ملفات القضايا محتاجة ترحيلات 20261009_124 لـ20261009_126 على قاعدة البيانات'
export const CASE_NOT_FOUND = 'القضية غير موجودة'
export const CASE_TITLE = 'عنوان القضية مطلوب (من 3 لـ200 حرف)'
export const CASE_KIND = 'نوع القضية: شكوى أو تظلم من جزاء أو إبلاغ عن مخالفة أو أخرى'
export const CASE_TEXT = 'النص مطلوب (لحد 10000 حرف)'
export const CASE_EMPLOYEE = 'الموظف غير موجود'
export const CASE_PARTY_ROLE = 'دور الطرف: شاكي أو مشكو في حقه أو شاهد'
export const CASE_PARTY_EXISTS = 'الطرف ده متضاف بنفس الدور'
export const CASE_HANDLER = 'الحساب غير موجود أو مالوش صلاحية التحقيق'
export const CASE_CONFLICT = 'تعارض مصالح: المشكو في حقه أو مديره المباشر مايبقاش محقق ولا مطّلع على الملف'
export const CASE_EVENT_KIND = 'نوع الحدث: ملاحظة أو إفادة أو دليل أو جلسة أو إخطار أو محضر دفاع'
export const CASE_EVENT_PARTY = 'الإفادة ومحضر الدفاع لطرف من أطراف القضية (والدفاع للمشكو في حقه)'
export const CASE_CLOSED = 'القضية مقفولة — مفيش إضافة عليها'
export const CASE_OUTCOME = 'النتيجة: حفظ أو إنذار أو جزاء أو فصل'
export const CASE_NO_INVESTIGATOR = 'عيّن محقق للقضية الأول'
export const CASE_DUE_PROCESS = 'قبل قرار غير الحفظ: لازم إخطار المشكو في حقه وتسجيل محضر دفاعه'
export const CASE_NOT_DECIDED = 'القضية لسه ماتقررش فيها'
export const CASE_OBJECTION_LATE = 'مهلة الاعتراض خلصت'
export const CASE_OBJECTED = 'الاعتراض اتسجّل قبل كده'
export const CASE_FILE_NOT_FOUND = 'الملف غير موجود'
export const CASE_ATTACHMENT_INVALID = 'مرفق غير صالح — ارفعه من شاشة القضية نفسها'
export const CASE_UPLOAD_RULE = 'رفع مرفق قضية للمطّلعين على ملف قضية'
/** مهلة الاعتراض بالأيام بعد القرار (إعداد في requests_config)؛ الغايب أو الغلط = 7 */
export const CASE_OBJECTION_KEY = 'cases.objection_days'
export const CASE_OBJECTION_DEFAULT = 7
export const CASE_KIND_LABELS: Record<CaseKind, string> = { COMPLAINT: 'شكوى', PENALTY_OBJECTION: 'تظلم من جزاء', VIOLATION: 'إبلاغ عن مخالفة', OTHER: 'أخرى' }
export const CASE_STATUS_LABELS: Record<CaseStatus, string> = { OPEN: 'مفتوحة', INVESTIGATING: 'تحقيق', DECIDED: 'اتقرر فيها', CLOSED: 'مقفولة' }
export const CASE_OUTCOME_LABELS: Record<CaseOutcome, string> = { DISMISSED: 'حفظ', WARNING: 'إنذار', PENALTY: 'جزاء', TERMINATION: 'فصل' }
export const CASE_ROLE_LABELS: Record<CasePartyRole, string> = { COMPLAINANT: 'شاكي', RESPONDENT: 'مشكو في حقه', WITNESS: 'شاهد', HANDLER: 'مطّلع' }
export const CASE_EVENT_LABELS: Record<CaseEventKind, string> = {
  NOTE: 'ملاحظة', STATEMENT: 'إفادة', EVIDENCE: 'دليل', SESSION: 'جلسة', NOTICE: 'إخطار المشكو في حقه', DEFENSE: 'محضر دفاع', DECISION: 'قرار', OBJECTION: 'اعتراض', STATUS: 'تغيير حالة',
}

let ready: boolean | null = null
/** جداول ترحيلات 124–126 موجودة؟ الموجود بيتحفظ */
export async function casesReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.hr_cases', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.hr_case_parties', N'U') IS NOT NULL
    AND OBJECT_ID(N'dbo.hr_case_events', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الترحيل */
export function resetCasesCache() { ready = null }

export function cleanCaseTitle(raw: unknown): string {
  const value = typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : ''
  if (value.length < 3 || value.length > 200) throw new BadRequestException(CASE_TITLE)
  return value
}
export function cleanCaseKind(raw: unknown): CaseKind {
  if (typeof raw !== 'string' || !(CASE_KINDS as readonly string[]).includes(raw)) throw new BadRequestException(CASE_KIND)
  return raw as CaseKind
}
/** نص حدث أو وصف: مطلوب (أو اختياري)، لحد 10000 حرف */
export function cleanCaseText(raw: unknown, required = true): string | null {
  if ((raw === undefined || raw === null) && !required) return null
  const value = typeof raw === 'string' ? raw.replace(/\r\n?/g, '\n').trim() : ''
  if ((!value && required) || value.length > 10000) throw new BadRequestException(CASE_TEXT)
  return value || null
}
export function cleanPartyRole(raw: unknown): Exclude<CasePartyRole, 'HANDLER'> {
  if (typeof raw !== 'string' || !(CASE_PARTY_ROLES as readonly string[]).includes(raw)) throw new BadRequestException(CASE_PARTY_ROLE)
  return raw as Exclude<CasePartyRole, 'HANDLER'>
}
export function cleanEventKind(raw: unknown): (typeof CASE_MANUAL_EVENTS)[number] {
  if (typeof raw !== 'string' || !(CASE_MANUAL_EVENTS as readonly string[]).includes(raw)) throw new BadRequestException(CASE_EVENT_KIND)
  return raw as (typeof CASE_MANUAL_EVENTS)[number]
}
export function cleanCaseOutcome(raw: unknown): CaseOutcome {
  if (typeof raw !== 'string' || !(CASE_OUTCOMES as readonly string[]).includes(raw)) throw new BadRequestException(CASE_OUTCOME)
  return raw as CaseOutcome
}
export const cleanCaseId = (raw: unknown): number | null => (typeof raw === 'number' && Number.isSafeInteger(raw) && raw > 0 ? raw : null)

export function objectionDays(raw: string | null | undefined): number {
  const value = Number(raw)
  return Number.isInteger(value) && value >= 0 && value <= 90 ? value : CASE_OBJECTION_DEFAULT
}

/**
 * تعارض مصالح: حساب موظفه هو المشكو في حقه، أو المدير المباشر (من الملف) لمشكو في حقه — مايبقاش مطّلع ولا محقق.
 * respondents: المشكو في حقهم بمديرهم المباشر؛ handlerEmployeeIds: موظفين حسابات المطّلعين.
 */
export function caseConflict(respondents: Array<{ id: number; managerEmployeeId: number | null | undefined }>, handlerEmployeeIds: Array<number | null | undefined>): boolean {
  const blocked = new Set<number>()
  for (const row of respondents) { blocked.add(row.id); if (row.managerEmployeeId) blocked.add(row.managerEmployeeId) }
  return handlerEmployeeIds.some((id) => !!id && blocked.has(id))
}
