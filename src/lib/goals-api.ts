// B3.6: أهداف الأداء — «أهدافي» و«فريقي» و«كل الأهداف»، والإجراءات (الخادم بيحكم الدور: صاحب الهدف، مديره المباشر، أو إدارة الأداء بنطاق الفروع)
import { apiFetch } from './api'

export type GoalOwnerType = 'EMPLOYEE' | 'DEPARTMENT' | 'COMPANY'
export type GoalKind = 'KPI' | 'GOAL' | 'PIP'
export type GoalStatus = 'PROPOSED' | 'ACTIVE' | 'DONE' | 'CANCELLED' | 'REJECTED'
export const GOAL_KIND_LABELS: Record<GoalKind, string> = { KPI: 'مؤشر', GOAL: 'هدف', PIP: 'خطة تحسين' }

export interface ApiGoal {
  id: number; ownerType: GoalOwnerType; employeeId: number | null; employeeName: string | null; departmentId: number | null; departmentName: string | null
  parentGoalId: number | null; parentTitle: string | null
  kind: GoalKind; kindLabel: string; title: string; description: string | null; weight: number
  /** نصوص بخانتين أو null */
  targetValue: string | null; unit: string | null; actualValue: string | null
  /** الفعلي ÷ المستهدف (لما فيه مستهدف موجب) */
  progressPercent: number | null
  periodStart: string; periodEnd: string; status: GoalStatus; statusLabel: string; decisionReason: string | null
  role: 'owner' | 'manager' | 'hr' | 'viewer'
  can: { decide: boolean; progress: boolean; change: boolean; close: boolean; evidence: boolean }
}
export interface ApiGoalUpdate { id: number; kind: 'PROGRESS' | 'CHANGE' | 'STATUS' | 'EVIDENCE'; actualValue: string | null; note: string | null
  changes: { before?: Record<string, unknown>; after?: Record<string, unknown> } | null; taskId: number | null; at: string; byName: string | null }
export interface ApiGoalDetail extends ApiGoal { updates: ApiGoalUpdate[] }
export interface GoalBody {
  ownerType?: GoalOwnerType; employeeId?: number; departmentId?: number; parentGoalId?: number | null; kind: GoalKind; title: string; description?: string | null
  weight: number; targetValue?: string | null; unit?: string | null; periodStart: string; periodEnd: string
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })

export const fetchMyGoals = () => apiFetch<{ available: boolean; message?: string; weightTotal: number; goals: ApiGoal[]; shared: ApiGoal[] }>('/performance/goals/mine')
export const fetchTeamGoals = () =>
  apiFetch<{ available: boolean; message?: string; manager: boolean; reports: Array<{ id: number; fullName: string }>; goals: ApiGoal[] }>('/performance/goals/team')
export const fetchAllGoals = () => apiFetch<{ available: boolean; message?: string; canManageCompany: boolean; goals: ApiGoal[] }>('/performance/goals/all')
export const fetchGoal = (id: number) => apiFetch<ApiGoalDetail>(`/performance/goals/${id}`)
export const createGoal = (body: GoalBody) => apiFetch<ApiGoalDetail>('/performance/goals', json('POST', body))
export const decideGoal = (id: number, decision: 'approve' | 'reject', reason?: string) =>
  apiFetch<ApiGoalDetail>(`/performance/goals/${id}/decision`, json('POST', { decision, ...(reason ? { reason } : {}) }))
export const progressGoal = (id: number, actualValue: string, note?: string) =>
  apiFetch<ApiGoalDetail>(`/performance/goals/${id}/progress`, json('POST', { actualValue, ...(note ? { note } : {}) }))
export const changeGoal = (id: number, body: { title?: string; weight?: number; targetValue?: string | null; unit?: string | null; periodEnd?: string; reason: string }) =>
  apiFetch<ApiGoalDetail>(`/performance/goals/${id}`, json('PATCH', body))
export const closeGoal = (id: number, status: 'DONE' | 'CANCELLED', note?: string) =>
  apiFetch<ApiGoalDetail>(`/performance/goals/${id}/status`, json('POST', { status, ...(note ? { note } : {}) }))
export const linkGoalTask = (id: number, taskId: number) => apiFetch<ApiGoalDetail>(`/performance/goals/${id}/evidence`, json('POST', { taskId }))
