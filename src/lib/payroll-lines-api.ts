// بنود الاستحقاقات والاستقطاعات لكل موظف (طلب المالك 19 سبتمبر): كل بند عمود باسمه في جدول المسير وتصديره والقسيمة
// وتابتي «البدلات» و«الاستقطاعات». الخادم هو اللي بيقسم البند المحفوظ (api/src/payroll/payroll-item-lines.ts)،
// ومجموع البنود = أعمدة البند المحفوظة بالقرش؛ الشاشة بتعرض وتجمع بس.
import { apiFetch } from './api'
import { sumMoney } from './money'

export interface PayrollLine { key: string; name: string; amount: number }
export interface PayrollItemLines {
  earnings: PayrollLine[]
  deductions: PayrollLine[]
  totals: { earnings: number; deductions: number; net: number }
}
export interface PayrollLineColumn { key: string; name: string }
export interface PayrollLineColumns { earnings: PayrollLineColumn[]; deductions: PayrollLineColumn[] }
export type PayrollLineSide = keyof PayrollLineColumns

export interface PayrollRunLinesRow extends PayrollItemLines { itemId: number; employeeId: number }
export interface PayrollRunLines { runId: number; columns: PayrollLineColumns; rows: PayrollRunLinesRow[] }

export interface PayrollMonthLinesRow extends PayrollItemLines {
  runId: number; runName: string | null; runStatus: string; itemId: number
  employeeId: number; employeeCode: string; fullName: string; branchName: string | null; departmentName: string | null
}
export interface PayrollMonthLines {
  period: string
  runs: Array<{ id: number; name: string | null; status: string }>
  columns: PayrollLineColumns
  rows: PayrollMonthLinesRow[]
}

export const PAYROLL_LINE_GROUP_LABELS: Record<PayrollLineSide, string> = { earnings: 'الاستحقاقات', deductions: 'الاستقطاعات' }
export const PAYROLL_LINE_TOTAL_LABELS: Record<PayrollLineSide | 'net', string> = { earnings: 'إجمالي الاستحقاقات', deductions: 'إجمالي الاستقطاعات', net: 'الصافي' }

export const fetchPayrollRunLines = (runId: number) => apiFetch<PayrollRunLines>(`/payroll/runs/${runId}/lines`)
export const fetchPayrollMonthLines = (period: string) => apiFetch<PayrollMonthLines>(`/payroll/overview/lines?period=${encodeURIComponent(period)}`)

/** مبلغ بند بمفتاحه في صف (صفر لو البند مش موجود عند الموظف ده). */
export const payrollLineAmount = (lines: readonly PayrollLine[] | undefined, key: string): number => lines?.find(line => line.key === key)?.amount ?? 0

/** إجمالي كل عمود للصفوف المعروضة (بالقروش الصحيحة، نفس جمع باقي الشاشة). */
export function payrollLineColumnTotals(rows: ReadonlyArray<Pick<PayrollItemLines, PayrollLineSide>>, side: PayrollLineSide, columns: readonly PayrollLineColumn[]) {
  return Object.fromEntries(columns.map(column => [column.key, sumMoney(rows.map(row => payrollLineAmount(row[side], column.key)))])) as Record<string, number>
}

type ColumnAmounts = Partial<Record<'basicSalary' | 'allowances' | 'overtimeAmount' | 'otherAdditions' | 'latenessDeduction' | 'shortfallDeduction' | 'absenceDeduction'
  | 'unpaidLeaveDeduction' | 'loanInstallments' | 'otherDeductions' | 'socialInsuranceDeduction' | 'netPay', unknown>>
/** احتياطي لو الخادم ما رجعش البنود (نسخة أقدم): أعمدة البند نفسها سطور عامة، بنفس المجاميع. */
export function payrollItemColumnLines(item: ColumnAmounts): PayrollItemLines {
  const line = (key: string, name: string, value: unknown): PayrollLine => ({ key, name, amount: sumMoney([value]) })
  const earnings = [line('BASIC', 'الأساسي', item.basicSalary), line('SALARY_ALLOWANCES', 'البدلات الثابتة', item.allowances), line('OVERTIME', 'الإضافي', item.overtimeAmount),
    line('OTHER_ADDITIONS', 'إضافات أخرى', item.otherAdditions)].filter(row => row.key === 'BASIC' || row.amount !== 0)
  const deductions = [line('LATENESS', 'التأخير', item.latenessDeduction), line('SHORTFALL', 'نقص الساعات', item.shortfallDeduction), line('ABSENCE', 'الغياب', item.absenceDeduction),
    line('UNPAID_LEAVE', 'إجازة بدون راتب', item.unpaidLeaveDeduction), line('OTHER_DEDUCTIONS', 'خصومات أخرى', item.otherDeductions), line('LOAN', 'السلف', item.loanInstallments),
    line('SOCIAL_INSURANCE', 'التأمينات (حصة الموظف)', item.socialInsuranceDeduction)].filter(row => row.amount !== 0)
  return { earnings, deductions, totals: { earnings: sumMoney(earnings.map(row => row.amount)), deductions: sumMoney(deductions.map(row => row.amount)), net: sumMoney([item.netPay]) } }
}

/** المفاتيح اللي ليها سطر تفصيل تحت المبلغ في جدول المسير (الساعات والدقائق والأيام من أعمدة البند نفسه). */
export const PAYROLL_LINE_KEYS = {
  overtime: 'OVERTIME', lateness: 'LATENESS', shortfall: 'SHORTFALL', earlyLeave: 'EARLY_LEAVE', absence: 'ABSENCE', unpaidLeave: 'UNPAID_LEAVE', loan: 'LOAN',
} as const
