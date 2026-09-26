import { apiFetch } from './api'

// «تابة البدلات» في شاشة المسير: أنواع البدلات، وصرف بدل لشهر على استهداف، والإلغاء قبل اعتماد المسير

export type AllowanceLineState = 'PENDING' | 'IN_RUN' | 'NEEDS_RECALC' | 'APPROVED' | 'PAID' | 'REVERSED' | 'CANCELLED'

export interface AllowanceType {
  id: number; code: string; name: string; branchId: number | null; branchName: string | null; isActive: boolean; canEdit: boolean
}

export interface AllowanceGrantRow {
  id: number; grantId: number; employeeId: number; employeeCode: string; fullName: string; branchName: string | null; departmentName: string | null
  allowanceTypeId: number; typeName: string; amount: number; status: 'ACTIVE' | 'CANCELLED'; state: AllowanceLineState; stateLabel: string
  runId: number | null; runName: string | null; runStatus: string | null; reason: string; createdAt: string; canCancel: boolean
}

export interface AllowanceGrantBatch {
  id: number; typeName: string; amount: number; targetLevel: string; targetText: string; reason: string; employeeCount: number
  activeCount: number; cancellableCount: number; createdAt: string; createdByName: string | null; canCancel: boolean
}

export interface AllowanceMonth {
  period: string
  rows: AllowanceGrantRow[]
  grants: AllowanceGrantBatch[]
  totals: { count: number; employees: number; amount: number; byType: Array<{ allowanceTypeId: number; typeName: string; count: number; amount: number }> }
}

export interface AllowanceGrantInput {
  period: string; allowanceTypeId: number; amount: string; targetLevel: string; branchId: number | null
  departmentIds: number[]; teamIds: number[]; employeeIds: number[]; reason: string
}

type RunBrief = { id: number; name: string | null; status: string }
export interface AllowanceGrantCreated {
  id: number; created: number; skippedDuplicates: number; amount: number; total: number
  recalculateRuns: RunBrief[]; lockedRuns: RunBrief[]
}

const post = <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'POST', ...(body === undefined ? {} : { body: JSON.stringify(body) }) })

export const fetchAllowanceTypes = () => apiFetch<AllowanceType[]>('/payroll/allowances/types')
export const createAllowanceType = (input: { name: string; code?: string; branchId?: number | null }) => post<AllowanceType>('/payroll/allowances/types', input)
export const updateAllowanceType = (id: number, input: { name?: string; isActive?: boolean }) =>
  apiFetch<AllowanceType>(`/payroll/allowances/types/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
export const fetchAllowanceMonth = (period: string) => apiFetch<AllowanceMonth>(`/payroll/allowances/grants?period=${encodeURIComponent(period)}`)
export const createAllowanceGrant = (input: AllowanceGrantInput) => post<AllowanceGrantCreated>('/payroll/allowances/grants', input)
export const cancelAllowanceLine = (id: number) => post<{ id: number; status: string; recalculateRuns: RunBrief[] }>(`/payroll/allowances/lines/${id}/cancel`)
export const cancelAllowanceGrant = (id: number) =>
  post<{ id: number; cancelled: number; locked: number; recalculateRuns: RunBrief[] }>(`/payroll/allowances/grants/${id}/cancel`)
