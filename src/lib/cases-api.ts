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

// B3.12: لائحة الجزاءات — المخالفات ودرجات تكرارها، وتوقيع الجزاء (معاينة ثم تأكيد)، والسجل، و«جزاءاتي»
export type PenaltyAction = 'WARNING' | 'DEDUCT_DAYS' | 'SUSPENSION' | 'TERMINATION'
export const PENALTY_ACTION_LABELS: Record<PenaltyAction, string> = { WARNING: 'إنذار كتابي', DEDUCT_DAYS: 'خصم أيام', SUSPENSION: 'إيقاف عن العمل', TERMINATION: 'فصل' }
export interface ApiPenaltyCatalog {
  available: boolean; message?: string; windowDays: number
  violations: Array<{ id: number; category: string; name: string; steps: Array<{ action: PenaltyAction; days: number | null; label: string; occurrenceLabel: string }>; deductionTypeId: number | null
    deductionTypeName: string | null; isActive: boolean }>
  deductionTypes: Array<{ id: number; nameAr: string }>
}
export interface ViolationBody { category?: string; name?: string; steps?: Array<{ action: PenaltyAction; days?: number }>; deductionTypeId?: number | null; isActive?: boolean }
export interface ApiPenaltyPreview {
  employeeName: string; violationName: string; incidentDate: string; occurrence: number; occurrenceLabel: string; action: PenaltyAction; days: number | null; label: string; windowDays: number; needsPeriod: boolean
  /** بصمة اللي اتعرض: التوقيع بيبعتها، ولو اللائحة أو التكرار اتغيّروا الخادم بيرفض */
  fingerprint: string
}
export interface ApiPenalty {
  id: number; employeeId?: number; employeeName?: string; violationName: string; category: string | null; occurrence: number; occurrenceLabel: string; action: PenaltyAction; days: number | null; label: string
  incidentDate: string; status: 'ACTIVE' | 'CANCELLED'; statusLabel: string; caseId?: number | null; deductionRequestId: number | null; note?: string | null; cancelReason?: string | null; createdAt: string
}
export interface PenaltyTarget { employeeId: number; violationId: number; incidentDate: string }
const P = '/penalties'
export const fetchViolations = () => apiFetch<ApiPenaltyCatalog>(`${P}/violations`)
export const createViolation = (body: ViolationBody) => apiFetch<ApiPenaltyCatalog>(`${P}/violations`, json(body))
export const updateViolation = (id: number, body: ViolationBody) => apiFetch<ApiPenaltyCatalog>(`${P}/violations/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
export const previewPenalty = (body: PenaltyTarget) => apiFetch<ApiPenaltyPreview>(`${P}/preview`, json(body))
export const applyPenalty = (body: PenaltyTarget & { expectedFingerprint: string; targetPeriod?: string; caseId?: number; note?: string }) => apiFetch<ApiPenalty>(P, json(body))
export const fetchPenalties = (employeeId?: number) => apiFetch<{ available: boolean; message?: string; penalties: ApiPenalty[] }>(`${P}${employeeId ? `?employeeId=${employeeId}` : ''}`)
export const cancelPenalty = (id: number, reason: string) => apiFetch<ApiPenalty>(`${P}/${id}/cancel`, json({ reason }))
export const fetchMyPenalties = () => apiFetch<{ penalties: ApiPenalty[] }>(`${P}/mine`)
