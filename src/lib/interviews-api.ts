// B3.4-ب: المقابلات وبطاقات التقييم — لمسؤول التوظيف (القايمة والتحديد والقفل)، وللمحاور نفسه (مقابلاته وبطاقته). الخادم بيحكم.
import { apiFetch } from './api'

export type InterviewMode = 'ONSITE' | 'VIDEO' | 'PHONE'
export type InterviewStatus = 'SCHEDULED' | 'DONE' | 'CANCELLED'
export type InterviewRecommendation = 'YES' | 'MAYBE' | 'NO'
export const INTERVIEW_MODE_LABELS: Record<InterviewMode, string> = { ONSITE: 'حضوري', VIDEO: 'فيديو', PHONE: 'تليفون' }
export const RECOMMENDATION_LABELS: Record<InterviewRecommendation, string> = { YES: 'مناسب', MAYBE: 'محتمل', NO: 'غير مناسب' }

export interface ApiScorecard {
  mine: boolean
  /** اسم المحاور — null لو مش في نطاق القارئ */
  interviewerName: string | null
  submitted: boolean; submittedAt: string | null
  /** المحتوى null لحد ما البطاقة تتسلّم، وللمحاور: لحد ما يسلّم بطاقته هو */
  rating: number | null; recommendation: InterviewRecommendation | null; recommendationLabel: string | null; notes: string | null
}
export interface ApiInterview {
  id: number; candidateId: number; candidateName: string; positionTitle: string | null
  /** الموعد بساعة النظام: YYYY-MM-DDTHH:mm */
  scheduledAt: string; durationMinutes: number; mode: InterviewMode; modeLabel: string
  location: string | null; notes: string | null; status: InterviewStatus; statusLabel: string
  cvFileId: number | null; scorecards: ApiScorecard[]
  /** بعد التحديد بس: عدد الدعوات اللي اتبعتت بالبريد */
  invited?: number
}
export interface ApiInterviewsList { available: boolean; message?: string; interviews: ApiInterview[] }
export interface ApiInterviewForm {
  candidates: Array<{ id: number; fullName: string; positionTitle: string }>
  interviewers: Array<{ id: number; fullName: string; employeeCode: string }>
}
export interface InterviewBody {
  candidateId: number; scheduledAt: string; durationMinutes: number; mode: InterviewMode
  location?: string; notes?: string; interviewerEmployeeIds: number[]
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })

export const fetchInterviews = () => apiFetch<ApiInterviewsList>('/recruitment/interviews')
export const fetchInterviewForm = () => apiFetch<ApiInterviewForm>('/recruitment/interviews/form')
export const scheduleInterview = (body: InterviewBody) => apiFetch<ApiInterview>('/recruitment/interviews', json('POST', body))
export const closeInterview = (id: number, status: 'DONE' | 'CANCELLED') => apiFetch<ApiInterview>(`/recruitment/interviews/${id}/status`, json('POST', { status }))
export const fetchMyInterviews = () => apiFetch<ApiInterviewsList>('/recruitment/my-interviews')
export const submitScorecard = (id: number, body: { rating: number; recommendation: InterviewRecommendation; notes?: string }) =>
  apiFetch<ApiInterview>(`/recruitment/my-interviews/${id}/scorecard`, json('POST', body))

/** «2026-10-09T10:30» ← «2026-10-09 · 10:30» */
export const interviewWhen = (stamp: string) => stamp.replace('T', ' · ')
