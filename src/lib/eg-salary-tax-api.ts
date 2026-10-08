// B4.4 (أ): معاينة ضريبة كسب العمل المصرية لمسير — قراءة بس: مفيش حاجة بتتخزن ولا بتتخصم.
import { apiFetch } from './api'

export interface ApiEgTaxPreviewRow {
  itemId: number; employeeId: number; employeeName: string; employeeCode: string | null
  /** صافي الدخل الخاضع في الفترة، وأيامها (30 للشهر الكامل) */
  netIncome: number; days: number
  /** الدخل محوّل لسنة، والوعاء بعد الإعفاء، وضريبة السنة، وضريبة الفترة */
  annualized: number; taxable: number; annualTax: number; tax: number
}
export interface ApiEgTaxPreview {
  runId: number; period: string; available: boolean; message?: string
  table: { effectiveFrom: string; verified: boolean; exemption: number; yearDays: number } | null
  rows: ApiEgTaxPreviewRow[]; totals: { netIncome: number; tax: number }
}

export const fetchEgTaxPreview = (runId: number) => apiFetch<ApiEgTaxPreview>(`/payroll/runs/${runId}/eg-tax-preview`)
