// B5.3 (أ): «تقارير المصروفات» — ميزة فرعية expenses.reports (مقفولة افتراضيًا). التقرير بيتقدّم كطلب في محرك الطلبات.
import { apiFetch } from './api'

export type ReportPhase = 'DRAFT' | 'PENDING' | 'RETURNED' | 'REJECTED' | 'APPROVED'
export interface ApiExpenseCategory {
  id: number; name: string
  /** حد البند الواحد بعملة فرع الموظف؛ null = من غير حد */
  limitPerLine: number | null
  /** WARN تحذير · BLOCK منع */
  limitMode: 'WARN' | 'BLOCK'
  receiptRequired: boolean; isActive: boolean
  /** (ج) حد مختلف لدرجات معيّنة — بيسبق حد الفئة العام (فاضية في «مصروفاتي»: الموظف بيشوف حد درجته في limitPerLine) */
  gradeLimits: Array<{ gradeId: number; limitPerLine: number }>
}
export interface ApiPerDiemRate { id: number; categoryId: number; gradeId: number | null; destination: string; dailyAmount: number; isActive: boolean }
export interface ApiExpenseLine {
  id: number; categoryId: number; categoryName: string; expenseDate: string; amount: number; note: string | null; receiptFileId: number | null
  /** فوق حد «تحذير» — بيتعرض للمعتمد */
  warning: string | null
  /** مانع للتقديم (فئة مقفولة، فوق حد «منع»، إيصال إجباري ناقص) */
  problem: string | null
  /** (ج) بند بدل يومي: «3 يوم × 200.00 (الرياض)»؛ null = بند مصروف عادي */
  perDiem: string | null
}
export interface ApiExpenseReport {
  id: number; code: string; employeeId: number; title: string; tripFrom: string | null; tripTo: string | null
  phase: ReportPhase; phaseLabel: string; editable: boolean; requestId: number | null; total: number
  submittedAt: string | null; approvedAt: string | null; lines: ApiExpenseLine[]
  /** (ب) سلفة المأمورية المربوطة بالتقرير، والصافي = الإجمالي − السلفة (سالب = بيتخصم من الراتب) */
  advance: { id: number; code: string; amount: number } | null
  net: number | null
}
export interface ApiTravelAdvance {
  id: number; code: string; employeeId: number; amount: number; purpose: string
  /** OPEN مفتوحة · SETTLED اتسوّت بتقرير · RETURNED اترجّعت نقدًا */
  status: 'OPEN' | 'SETTLED' | 'RETURNED'; statusLabel: string
  paid: boolean; paidAt: string | null; reportId: number | null; requestId: number; closedAt: string | null; closeNote: string | null
}
export interface ApiMyExpenses {
  ready: boolean; currency: string | null
  /** كود نوع الطلب اللي التقرير بيتقدّم بيه؛ null = مسؤول النظام لسه ماعرّفش نوع بوجهة «تقرير مصروفات» */
  requestTypeCode: string | null
  /** (ب) كود نوع طلب «سلفة مأمورية»؛ null = مش متعرّف */
  advanceTypeCode: string | null
  categories: ApiExpenseCategory[]; reports: ApiExpenseReport[]; advances: ApiTravelAdvance[]
  /** (ج) سعر البدل اليومي لدرجة الحساب لكل وجهة */
  perDiem: Array<{ destination: string; dailyAmount: number }>
}
export interface ApiExpensesOverview {
  ready: boolean; canEdit: boolean; categories: ApiExpenseCategory[]
  grades: Array<{ id: number; name: string }>; rates: ApiPerDiemRate[]
  reports: Array<ApiExpenseReport & { employeeName: string; employeeCode: string | null; currency: string }>
  advances: Array<ApiTravelAdvance & { employeeName: string; employeeCode: string | null; currency: string }>
}
export interface ReportInput { title: string; tripFrom?: string | null; tripTo?: string | null }
export interface LineInput { categoryId: number; expenseDate: string; amount: number; note?: string; receiptFileId?: number | null }
export interface CategoryInput { name: string; limitPerLine: number | null; limitMode: 'WARN' | 'BLOCK'; receiptRequired: boolean; isActive?: boolean; gradeLimits?: Array<{ gradeId: number; limitPerLine: number }> }
export interface RateInput { categoryId: number; gradeId: number | null; destination: string; dailyAmount: number; isActive?: boolean }

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })
const M = '/expenses/my'
export const fetchMyExpenses = () => apiFetch<ApiMyExpenses>(M)
export const createExpenseReport = (body: ReportInput) => apiFetch<{ id: number }>(`${M}/reports`, json('POST', body))
export const updateExpenseReport = (id: number, body: ReportInput) => apiFetch<{ id: number }>(`${M}/reports/${id}`, json('PATCH', body))
export const removeExpenseReport = (id: number) => apiFetch<{ removed: boolean }>(`${M}/reports/${id}`, { method: 'DELETE' })
export const addExpenseLine = (reportId: number, body: LineInput) => apiFetch<{ id: number; warning: string | null }>(`${M}/reports/${reportId}/lines`, json('POST', body))
export const updateExpenseLine = (reportId: number, lineId: number, body: LineInput) => apiFetch<{ id: number; warning: string | null }>(`${M}/reports/${reportId}/lines/${lineId}`, json('PATCH', body))
export const removeExpenseLine = (reportId: number, lineId: number) => apiFetch<{ removed: boolean }>(`${M}/reports/${reportId}/lines/${lineId}`, { method: 'DELETE' })
export const addPerDiemLine = (reportId: number, body: { destination: string; days: number; expenseDate: string; note?: string }) =>
  apiFetch<{ id: number; amount: number; perDiem: string }>(`${M}/reports/${reportId}/per-diem`, json('POST', body))
export const createPerDiemRate = (body: RateInput) => apiFetch<{ id: number }>('/expenses/rates', json('POST', body))
export const updatePerDiemRate = (id: number, body: RateInput) => apiFetch<{ id: number }>(`/expenses/rates/${id}`, json('PATCH', body))
export const attachTravelAdvance = (reportId: number, advanceId: number | null) => apiFetch<{ advanceId: number | null }>(`${M}/reports/${reportId}/advance`, json('PUT', { advanceId }))
export const travelAdvanceStep = (id: number, step: 'paid' | 'returned', note?: string) => apiFetch<{ id: number }>(`/expenses/advances/${id}/steps/${step}`, json('POST', { note }))
export const fetchExpensesOverview = () => apiFetch<ApiExpensesOverview>('/expenses/overview')
export const createExpenseCategory = (body: CategoryInput) => apiFetch<{ id: number }>('/expenses/categories', json('POST', body))
export const updateExpenseCategory = (id: number, body: CategoryInput) => apiFetch<{ id: number }>(`/expenses/categories/${id}`, json('PATCH', body))
