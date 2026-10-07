// B2.11: الوظائف المعتمدة — نداءات الخادم وأشكال ردوده. المسمّيات والأرقام (معتمد / مشغول / شاغر / زيادة) من الخادم نفسه.
import { apiFetch } from './api'

export type PositionStatus = 'ACTIVE' | 'FROZEN' | 'CANCELLED'
export const POSITION_STATUS_LABELS: Record<PositionStatus, string> = { ACTIVE: 'نشطة', FROZEN: 'مجمّدة', CANCELLED: 'ملغية' }

export interface ApiPosition {
  id: number
  code: string
  jobTitleId: number
  title: string
  gradeId: number | null
  gradeName: string | null
  branchId: number
  branchName: string | null
  departmentId: number | null
  departmentName: string | null
  teamId: number | null
  teamName: string | null
  costCenterId: number | null
  costCenterName: string | null
  headcount: number
  status: PositionStatus
  statusLabel: string
  budget: string | null
  approved: number
  occupied: number
  vacant: number
  over: number
  createdAt: string
}

export interface ApiPositionSummaryLine {
  branchId: number
  branchName: string | null
  departmentId: number | null
  departmentName: string | null
  approved: number
  occupied: number
  vacant: number
  over: number
  unassigned: number
}

export interface ApiPositionsList {
  available: boolean
  message?: string
  canManage: boolean
  enforce: boolean
  positions: ApiPosition[]
  summary: ApiPositionSummaryLine[]
}

export interface ApiPositionHolder { employeeId: number; fullName: string; employeeCode: string; jobTitle: string | null; seated: boolean; note: string | null; assignedAt: string }
export interface ApiPositionDetail extends ApiPosition {
  canManage: boolean
  holders: ApiPositionHolder[]
  linkable: Array<{ id: number; fullName: string; employeeCode: string; jobTitle: string | null }>
}

/** وظيفة في قايمة الاختيار بتاعة نموذج التعيين */
export interface ApiPositionOption {
  id: number
  code: string
  title: string
  gradeName: string | null
  departmentId: number | null
  departmentName: string | null
  teamId: number | null
  teamName: string | null
  headcount: number
  occupied: number
  vacant: number
}
export interface ApiPositionOptions { available: boolean; enforce: boolean; positions: ApiPositionOption[] }

export interface ApiPositionGeneration {
  groups: Array<{ branchId: number; branchName: string | null; departmentId: number | null; departmentName: string | null; title: string | null; employees: number
    action: 'create' | 'skip'; reason: string | null }>
  truncated: boolean
  totals: { create: number; createEmployees: number; skip: number; skipEmployees: number }
}

export interface PositionInput {
  jobTitleId?: number
  branchId?: number
  departmentId?: number | null
  teamId?: number | null
  gradeId?: number | null
  costCenterId?: number | null
  headcount?: number
  status?: PositionStatus
  budget?: string | null
}

/** بيانات نموذج الوظيفة: فروع نطاق الحساب بأقسامها وفرقها، والكتالوجات النشطة */
export interface ApiPositionForm {
  branches: Array<{ id: number; name: string }>
  departments: Array<{ id: number; name: string; branchId: number }>
  teams: Array<{ id: number; name: string; departmentId: number }>
  jobTitles: Array<{ id: number; title: string }>
  grades: Array<{ id: number; name: string }>
  costCenters: Array<{ id: number; name: string; code: string }>
}

const json = (method: string, body?: unknown): RequestInit => ({ method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })

export const fetchPositions = () => apiFetch<ApiPositionsList>('/positions')
export const fetchPosition = (id: number) => apiFetch<ApiPositionDetail>(`/positions/${id}`)
export const fetchPositionForm = () => apiFetch<ApiPositionForm>('/positions/form')
export const fetchPositionOptions = (branchId: number) => apiFetch<ApiPositionOptions>(`/positions/options?branchId=${branchId}`)
export const createPosition = (input: PositionInput) => apiFetch<ApiPosition>('/positions', json('POST', input))
export const updatePosition = (id: number, input: PositionInput) => apiFetch<ApiPosition>(`/positions/${id}`, json('PATCH', input))
export const addPositionHolder = (id: number, employeeId: number) => apiFetch<ApiPositionDetail>(`/positions/${id}/holders`, json('POST', { employeeId }))
export const removePositionHolder = (id: number, employeeId: number) => apiFetch<ApiPositionDetail>(`/positions/${id}/holders/${employeeId}`, json('DELETE'))
export const fetchPositionGeneration = () => apiFetch<ApiPositionGeneration>('/positions/generate')
export const applyPositionGeneration = () => apiFetch<{ created: number; linked: number }>('/positions/generate', json('POST'))

/** وظائف وحدة الموظف من قايمة فرعه: اللي على مستوى الفرع، أو على قسمه، أو على فريقه */
export const positionsOfUnit = (options: ApiPositionOption[], unit: { departmentId?: number | null; teamId?: number | null }): ApiPositionOption[] =>
  options.filter(row => (row.departmentId == null || row.departmentId === (unit.departmentId ?? null)) && (row.teamId == null || row.teamId === (unit.teamId ?? null)))
