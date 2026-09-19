import { apiFetch } from './api'

// «إقفال سنة الإجازات»: معاينة السنة (بنطاق الفرع)، تسوية رصيد موظف (صرف بدل أو تصفير)، وإقفال السنة
export interface YearEndFigures {
  period: string
  periodStart: string
  periodEnd: string
  ended: boolean
  measureDate: string
  annualEntitlement: number
  accrued: number
  opening: number
  adjustments: number
  entitledTotal: number
  used: number
  settled: number
  remaining: number
  deficit: number
  carried: number
  lapsed: number
  closed: boolean
  settleable: number
  eligibleFrom: string | null
}

export interface YearEndRow extends Partial<YearEndFigures> {
  employee: { id: number; fullName: string; employeeCode: string; branchId: number; departmentId: number; joinDate: string | null }
  error?: string
}

export interface YearEndTotals {
  entitledTotal: number
  used: number
  settled: number
  remaining: number
  carried: number
  lapsed: number
  settleable: number
  employees: number
  closed: number
  pending: number
}

export interface YearEndPreview {
  year: string
  branchId: number | null
  today: string
  ended: boolean
  canClose: boolean
  settings: {
    mode: string
    carryOverEnabled: boolean
    carryOverMaxDays: number | null
    entitlementStartMonths: number
    firstYearProrated: boolean
  }
  totals: YearEndTotals
  rows: YearEndRow[]
}

export type LeaveSettlementMode = 'PAID' | 'ZEROED'

export interface LeaveSettlement {
  id: number
  employeeId: number
  period: string
  year: string
  days: number
  mode: LeaveSettlementMode
  reason: string
  beforeRemaining: number
  amount: number | null
  payrollPeriod: string | null
  obligationId: number | null
  createdAt: string
  employeeName?: string
  employeeCode?: string
  actorName?: string
}

export interface SettleLeaveInput {
  mode: LeaveSettlementMode
  reason: string
  payrollPeriod?: string | null
  expectedDays?: number
  idempotencyKey: string
}

const qs = (params: Record<string, string | number | null | undefined>) => {
  const s = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') s.set(k, String(v))
  const text = s.toString()
  return text ? `?${text}` : ''
}

export const fetchYearEndPreview = (year: string, branchId?: number | null) =>
  apiFetch<YearEndPreview>(`/leaves/year-end/${year}${qs({ branchId })}`)

export const fetchYearEndSettlements = (year: string, query: { employeeId?: number; branchId?: number | null } = {}) =>
  apiFetch<LeaveSettlement[]>(`/leaves/year-end/${year}/settlements${qs(query)}`)

export const settleLeaveBalance = (year: string, employeeId: number, input: SettleLeaveInput) =>
  apiFetch<{ settlement: LeaveSettlement; balance: YearEndFigures | null; replayed: boolean }>(
    `/leaves/year-end/${year}/settle/${employeeId}`, { method: 'POST', body: JSON.stringify(input) })

export const closeLeaveYear = (year: string, branchId?: number | null) =>
  apiFetch<{ fromPeriod: string; toPeriod: string; created: number; ensured: number; closingEnsured: number; maxCarry: number | null; summary: YearEndTotals }>(
    `/leaves/year-end/${year}/close`, { method: 'POST', body: JSON.stringify(branchId ? { branchId } : {}) })

export const SETTLEMENT_MODE_LABELS: Record<LeaveSettlementMode, string> = {
  PAID: 'اتصرف بدل',
  ZEROED: 'اتصفّر',
}
