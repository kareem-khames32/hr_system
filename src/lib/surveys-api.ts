// B3.13: الاستبيانات — «استبياناتي» والرد للموظف المدعو، والإدارة والنتايج المجمّعة لصاحب الصلاحية (الخادم بيحكم السرية والحد الأدنى).
import { apiFetch } from './api'

export type SurveyKind = 'SATISFACTION' | 'ENPS' | 'PULSE' | 'ONBOARDING' | 'EXIT' | 'TRAINING' | 'SERVICE'
export const SURVEY_KIND_LABELS: Record<SurveyKind, string> = { SATISFACTION: 'رضا', ENPS: 'eNPS', PULSE: 'نبض', ONBOARDING: 'تهيئة', EXIT: 'خروج', TRAINING: 'تقييم تدريب', SERVICE: 'رضا الخدمة' }
export type SurveyQuestionType = 'rating' | 'enps' | 'choice' | 'text'
export const SURVEY_QUESTION_LABELS: Record<SurveyQuestionType, string> = { rating: 'تقدير (1–5)', enps: 'eNPS (0–10)', choice: 'اختيار', text: 'نص' }
export interface SurveyQuestion { key: string; label: string; type: SurveyQuestionType; required: boolean; options?: string[] }
export interface SurveyAudience { mode: string; ids?: string[]; where?: { mode: string; ids: number[] } | null }
export interface ApiSurvey {
  id: number; title: string; kind: SurveyKind; kindLabel: string; audience: SurveyAudience | null; isAnonymous: boolean; minGroup: number; questions: SurveyQuestion[]; closeDate: string | null
  status: 'DRAFT' | 'OPEN' | 'CLOSED'; statusLabel: string; invited: number; responded: number
}
export interface SurveyBody {
  title: string; kind: SurveyKind; audience: SurveyAudience | null; isAnonymous: boolean; minGroup: number; closeDate?: string | null
  questions: Array<{ label: string; type: SurveyQuestionType; required: boolean; options?: string[] }>
}
export interface SurveySummaryRow { key: string; label: string; type: SurveyQuestionType; answered: number; average?: number | null; enps?: number | null; counts?: Array<{ option: string; count: number }> }
export interface ApiSurveyResults {
  survey: ApiSurvey; total: number; minGroup: number; visible: boolean; overall: SurveySummaryRow[]
  groups: Array<{ name: string; count: number; summary: SurveySummaryRow[] }>; commentsHidden: boolean; comments: Array<{ key: string; label: string; texts: string[] }>
}
export interface ApiMySurvey { id: number; title: string; kindLabel: string; isAnonymous: boolean; closeDate: string | null; questionCount: number }
export interface ApiSurveyForm { id: number; title: string; kindLabel: string; isAnonymous: boolean; minGroup: number; closeDate: string | null; questions: SurveyQuestion[]; answered: boolean; open: boolean }

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })
const S = '/surveys'
export const fetchSurveys = () => apiFetch<{ available: boolean; message?: string; surveys: ApiSurvey[] }>(S)
export const createSurvey = (body: SurveyBody) => apiFetch<ApiSurvey>(S, json('POST', body))
export const openSurvey = (id: number) => apiFetch<ApiSurvey>(`${S}/${id}/open`, json('POST', {}))
export const closeSurvey = (id: number) => apiFetch<ApiSurvey>(`${S}/${id}/close`, json('POST', {}))
export const fetchSurveyResults = (id: number) => apiFetch<ApiSurveyResults>(`${S}/${id}/results`)
export const fetchMySurveys = () => apiFetch<{ surveys: ApiMySurvey[] }>(`${S}/mine`)
export const fetchSurveyForm = (id: number) => apiFetch<ApiSurveyForm>(`${S}/${id}`)
export const respondToSurvey = (id: number, answers: Record<string, number | string>) => apiFetch<{ received: boolean }>(`${S}/${id}/respond`, json('POST', { answers }))
