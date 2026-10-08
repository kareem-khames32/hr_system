// B4.4 (أ): معاينة ضريبة كسب العمل المصرية لمسير — قراءة بس: مفيش حاجة بتتخزن ولا بتتخصم.
import { apiFetch } from './api'

export interface ApiEgTaxPreviewRow {
  itemId: number; employeeId: number; employeeName: string; employeeCode: string | null
  /** صافي الدخل الخاضع في الفترة، وأيامها (30 للشهر الكامل) */
  netIncome: number; days: number
  /** الدخل محوّل لسنة، والوعاء بعد الإعفاء، وضريبة السنة، وضريبة الفترة */
  annualized: number; taxable: number; annualTax: number; tax: number
  /** الضريبة دي اتحسبت واتخصمت في المسير (محفوظة في البند) — مش حساب معاينة */
  stored: boolean
}
export interface ApiEgTaxPreview {
  runId: number; period: string; available: boolean; message?: string
  /** STORED = فيه بنود ضريبتها اتخصمت في المسير؛ FROM_THIS_PERIOD = حساب «لو الضريبة بدأت من الفترة دي» */
  basis: 'STORED' | 'FROM_THIS_PERIOD'
  table: { effectiveFrom: string; verified: boolean; exemption: number; yearDays: number } | null
  rows: ApiEgTaxPreviewRow[]; totals: { netIncome: number; tax: number }
}

export const fetchEgTaxPreview = (runId: number) => apiFetch<ApiEgTaxPreview>(`/payroll/runs/${runId}/eg-tax-preview`)

// B4.4 (د): صندوق التدريب المصري — تقرير سنوي بتكلفة المنشأة (مش خصم من الموظف)، لحساب بكل الفروع
export interface ApiEgTrainingFund {
  year: number; date: string; headcountAsOf: string; available: boolean; message?: string
  rule: { pct: number; minAmount: number; maxAmount: number; minHeadcount: number; minInsuranceWage: number; perEmployee: number; effectiveFrom: string; wageLimitsFrom: string; verified: boolean } | null
  entities: Array<{ entityId: number | null; name: string; headcount: number; applies: boolean; amount: number }>
  total: number
}
// B4.5 (هـ): تنبيه الحد الأدنى للأجور — الموظفين في نطاق الحساب اللي إجماليهم تحت الحد الأدنى لدولة فرعهم (قراءة بس)
export interface ApiMinimumWageAlerts {
  asOf: string
  minimums: Array<{ country: 'EG'; amount: number; key: string; effectiveFrom: string; verified: boolean }>
  employees: Array<{ employeeId: number; fullName: string; employeeCode: string | null; branchName: string; country: string; gross: number; minimum: number; shortfall: number }>
}
export const fetchMinimumWageAlerts = () => apiFetch<ApiMinimumWageAlerts>('/social-insurance/minimum-wage-alerts')
// B4.6 (أ): نسبة السعودة لكل كيان قانوني سعودي (قراءة بس، لحساب بكل الفروع)
export interface ApiSaudization {
  asOf: string
  entities: Array<{ entityId: number | null; name: string; headcount: number; saudis: number; unknownNationality: number; percent: number | null }>
}
export const fetchSaudization = () => apiFetch<ApiSaudization>('/social-insurance/saudization')
export const fetchEgTrainingFund = (year?: number) => apiFetch<ApiEgTrainingFund>(`/social-insurance/eg-training-fund${year ? `?year=${year}` : ''}`)
