// B3.11: الشكاوى والتحقيقات — ملفات القضايا للمطّلعين عليها، و«قضاياي» والاعتراض للموظف الطرف (الخادم بيحكم: عضوية القضية مش الصلاحية).
import { apiFetch, uploadFile } from './api'

export type CaseKind = 'COMPLAINT' | 'PENALTY_OBJECTION' | 'VIOLATION' | 'OTHER'
export const CASE_KIND_LABELS: Record<CaseKind, string> = { COMPLAINT: 'شكوى', PENALTY_OBJECTION: 'تظلم من جزاء', VIOLATION: 'إبلاغ عن مخالفة', OTHER: 'أخرى' }
export type CaseStatus = 'OPEN' | 'INVESTIGATING' | 'DECIDED' | 'CLOSED'
export type CaseOutcome = 'DISMISSED' | 'WARNING' | 'PENALTY' | 'TERMINATION'
export const CASE_OUTCOME_LABELS: Record<CaseOutcome, string> = { DISMISSED: 'حفظ', WARNING: 'إنذار', PENALTY: 'جزاء', TERMINATION: 'فصل' }
export type CasePartyRole = 'COMPLAINANT' | 'RESPONDENT' | 'WITNESS'
export const CASE_ROLE_LABELS: Record<CasePartyRole, string> = { COMPLAINANT: 'شاكي', RESPONDENT: 'مشكو في حقه', WITNESS: 'شاهد' }
export type CaseEventKind = 'NOTE' | 'STATEMENT' | 'EVIDENCE' | 'SESSION' | 'NOTICE' | 'DEFENSE'
export const CASE_EVENT_LABELS: Record<CaseEventKind, string> = { NOTE: 'ملاحظة', STATEMENT: 'إفادة', EVIDENCE: 'دليل', SESSION: 'جلسة', NOTICE: 'إخطار المشكو في حقه', DEFENSE: 'محضر دفاع' }

export interface ApiCaseSummary {
  id: number; kind: CaseKind; kindLabel: string; title: string; status: CaseStatus; statusLabel: string; outcome: CaseOutcome | null; outcomeLabel: string | null
  openedAt: string; decidedAt: string | null; closedAt: string | null
}
export interface ApiCaseFile extends ApiCaseSummary {
  description: string | null; outcomeNote: string | null; fromRequest: boolean; investigatorName: string | null
  parties: Array<{ id: number; role: CasePartyRole; roleLabel: string; employeeId: number | null; employeeName: string }>
  handlers: Array<{ userId: number | null; name: string; investigator: boolean }>
  events: Array<{ id: number; kind: string; kindLabel: string; body: string; employeeName: string | null; byName: string | null; at: string; file: { id: number; name: string } | null }>
}
export interface ApiMyCase {
  id: number; kindLabel: string; role: 'COMPLAINANT' | 'RESPONDENT'; roleLabel: string; title: string | null; notices: Array<{ body: string; at: string }>
  statusLabel: string; outcomeLabel: string | null; outcomeNote: string | null; objected: boolean; objectionUntil: string | null; canObject: boolean
}

const json = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) })
const C = '/cases'
export const fetchHandledCases = () => apiFetch<{ available: boolean; message?: string; canOpen: boolean; cases: Array<ApiCaseSummary & { investigating: boolean }> }>(C)
export const openCase = (body: { kind: CaseKind; title: string; description?: string; complainantEmployeeId?: number; respondentEmployeeId?: number }) => apiFetch<ApiCaseFile>(C, json(body))
export const fetchCaseFile = (id: number) => apiFetch<ApiCaseFile>(`${C}/${id}`)
export const addCaseHandler = (id: number, employeeId: number) => apiFetch<ApiCaseFile>(`${C}/${id}/handlers`, json({ employeeId }))
export const setCaseInvestigator = (id: number, employeeId: number) => apiFetch<ApiCaseFile>(`${C}/${id}/investigator`, json({ employeeId }))
export const addCaseParty = (id: number, employeeId: number, role: CasePartyRole) => apiFetch<ApiCaseFile>(`${C}/${id}/parties`, json({ employeeId, role }))
export const addCaseEvent = (id: number, body: { kind: CaseEventKind; body: string; employeeId?: number; fileId?: number }) => apiFetch<ApiCaseFile>(`${C}/${id}/events`, json(body))
export const decideCase = (id: number, outcome: CaseOutcome, note: string) => apiFetch<ApiCaseFile>(`${C}/${id}/decision`, json({ outcome, note }))
export const closeCase = (id: number) => apiFetch<ApiCaseFile>(`${C}/${id}/close`, json({}))
export const fetchMyCases = () => apiFetch<{ cases: ApiMyCase[] }>(`${C}/mine`)
export const objectToCase = (id: number, reason: string) => apiFetch<{ cases: ApiMyCase[] }>(`${C}/${id}/objection`, json({ reason }))
/** مرفق دليل: بيترفع بتصنيف «قضية» من غير رقم، والخادم بيربطه بحدثه تحت قفل القضية */
export const uploadCaseFile = (file: File) => uploadFile(file, { entityType: 'case' })
