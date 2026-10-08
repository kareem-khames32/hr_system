// B5.1: «تخطيط الزيادات وسلّم الرواتب» — موديول compensation (مقفول افتراضيًا). الأرقام بصلاحية عرض الرواتب.
import { apiFetch } from './api'

export interface ApiSalaryBand { min: number; mid: number; max: number }
export type BandPosition = 'BELOW' | 'WITHIN' | 'ABOVE'
export interface ApiBandGrade { id: number; name: string; isActive: boolean; band: ApiSalaryBand | null; headcount: number; below: number; above: number }
export interface ApiBandEmployee {
  employeeId: number; fullName: string; employeeCode: string | null; gradeId: number | null; gradeName: string | null
  /** راتب المقارنة حسب الأساس (الأساسي أو الإجمالي) */
  salary: number
  /** الراتب ÷ منتصف النطاق */
  compaRatio: number | null
  position: BandPosition | null; positionLabel: string | null
}
export interface ApiSalaryBands { basis: 'BASIC' | 'GROSS'; basisLabel: string; grades: ApiBandGrade[]; employees: ApiBandEmployee[]; withoutGrade: number }

const C = '/compensation'
export const fetchSalaryBands = () => apiFetch<ApiSalaryBands>(`${C}/bands`)

// ===== (ب) دورات الزيادات =====

export type CycleStatus = 'DRAFT' | 'OPEN' | 'REVIEW' | 'APPROVED' | 'APPLIED' | 'CANCELLED'
export type CycleStep = 'open' | 'review' | 'reopen' | 'cancel'
export interface ApiRaiseCycle {
  id: number; name: string; effectivePayrollPeriod: string; status: CycleStatus; statusLabel: string; note: string | null
  createdAt: string; openedAt: string | null; reviewAt: string | null; approvedAt: string | null; appliedAt: string | null
}
export interface ApiRaiseCycles { ready: boolean; cycles: ApiRaiseCycle[] }
export interface ApiRaiseLine {
  employeeId: number; fullName: string; employeeCode: string | null; active: boolean; departmentId: number | null; departmentName: string | null; currency: string
  /** اقتراح المدير، ومين كتبه (null = حساب برّه نطاقك) */
  proposedAmount: number; proposedBy: string | null; proposedAt: string; note: string | null
  /** المبلغ اللي هيتعتمد */
  finalAmount: number; adjusted: boolean; adjustedBy: string | null; adjustedAt: string | null; adjustNote: string | null
  appliedAt: string | null
  /** آخر نتيجة أداء معتمدة وتقديرها — لو موديول الأداء مفتوح وللي معاه صلاحيته، وغير كده null */
  performanceScore: number | null; performanceLabel: string | null
  /** أرقام الراتب: لصاحب «عرض الرواتب» بس، وغير كده null */
  currentBasic: number | null; newBasic: number | null; percent: number | null
  /** الأساسي اتغيّر بعد آخر كتابة على السطر */
  basicChanged: boolean | null
}
export interface ApiRaiseBudget {
  departmentId: number; name: string; unitType: string; currency: string
  budget: number | null; used: number; remaining: number | null
  /** المستخدم عدّى الميزانية — تحذير مش منع */
  over: boolean
}
export interface ApiRaiseCycleDetail {
  cycle: ApiRaiseCycle; salaries: boolean; canMove: boolean; canAdjust: boolean; canBudget: boolean
  /** (ج) الاعتماد (من حد ماقترحش — الخادم بيحكم) والتطبيق على الرواتب، وهل عمود نتيجة الأداء معروض */
  canApprove: boolean; canApply: boolean; performance: boolean
  lines: ApiRaiseLine[]; budgets: ApiRaiseBudget[]
  totals: Array<{ currency: string; count: number; proposed: number; final: number }>
  candidates: Array<{ employeeId: number; fullName: string; employeeCode: string | null }>
}
export interface ApiRaiseApplyResult extends ApiRaiseCycleDetail { applied: number; refused: Array<{ employeeId: number; message: string }> }
export interface ApiMyRaises {
  cycles: Array<{
    id: number; name: string; effectivePayrollPeriod: string
    team: Array<{ employeeId: number; fullName: string; employeeCode: string | null; currency: string; amount: number | null; note: string | null; adjusted: boolean }>
    totals: Array<{ currency: string; amount: number }>
  }>
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })
export const fetchRaiseCycles = () => apiFetch<ApiRaiseCycles>(`${C}/cycles`)
export const createRaiseCycle = (body: { name: string; effectivePayrollPeriod: string; note?: string }) => apiFetch<ApiRaiseCycleDetail>(`${C}/cycles`, json('POST', body))
export const fetchRaiseCycle = (id: number) => apiFetch<ApiRaiseCycleDetail>(`${C}/cycles/${id}`)
export const moveRaiseCycle = (id: number, step: CycleStep) => apiFetch<ApiRaiseCycleDetail>(`${C}/cycles/${id}/steps/${step}`, json('POST', {}))
export const setRaiseBudget = (id: number, departmentId: number, amount: number | null) => apiFetch<ApiRaiseCycleDetail>(`${C}/cycles/${id}/budgets/${departmentId}`, json('PUT', { amount }))
export const adjustRaiseLine = (id: number, employeeId: number, amount: number, note: string) => apiFetch<ApiRaiseCycleDetail>(`${C}/cycles/${id}/lines/${employeeId}`, json('PUT', { amount, note }))
export const approveRaiseCycle = (id: number) => apiFetch<ApiRaiseCycleDetail>(`${C}/cycles/${id}/approve`, json('POST', {}))
export const unapproveRaiseCycle = (id: number) => apiFetch<ApiRaiseCycleDetail>(`${C}/cycles/${id}/unapprove`, json('POST', {}))
export const applyRaiseCycle = (id: number) => apiFetch<ApiRaiseApplyResult>(`${C}/cycles/${id}/apply`, json('POST', {}))
export const fetchMyRaises = () => apiFetch<ApiMyRaises>(`${C}/my-team`)
export const proposeRaise = (id: number, employeeId: number, amount: number, note: string) => apiFetch<ApiMyRaises>(`${C}/cycles/${id}/my-team/${employeeId}`, json('PUT', { amount, ...(note ? { note } : {}) }))
