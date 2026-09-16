// الخطوتان 7 و22 (B5): مجاميع بند المسير بالقروش الصحيحة — مجموع أعمدة الصف = إجمالي الصف، ومجموع سطور الملخص = الإجمالي الكبير (ALDD-12).
import type { ApiPayrollItem } from './api'
import { sumMoney, toMoneyNumber } from './money'

export const PAYROLL_EARNING_FIELDS = ['basicSalary', 'allowances', 'overtimeAmount', 'otherAdditions'] as const
export const PAYROLL_DEDUCTION_FIELDS = ['latenessDeduction', 'shortfallDeduction', 'absenceDeduction', 'unpaidLeaveDeduction', 'loanInstallments', 'otherDeductions', 'socialInsuranceDeduction'] as const
export type PayrollDeductionField = typeof PAYROLL_DEDUCTION_FIELDS[number]
export const PAYROLL_DEDUCTION_LABELS: Record<PayrollDeductionField, string> = {
  latenessDeduction: 'خصم التأخير', shortfallDeduction: 'نقص ساعات العمل', absenceDeduction: 'خصم الغياب',
  unpaidLeaveDeduction: 'إجازات بدون راتب', loanInstallments: 'أقساط السلف', otherDeductions: 'خصومات أخرى (مصنفة/عهدة/استرداد)',
  socialInsuranceDeduction: 'التأمينات الاجتماعية (حصة الموظف)',
}

type ItemAmounts = Partial<Pick<ApiPayrollItem, typeof PAYROLL_EARNING_FIELDS[number] | PayrollDeductionField | 'netPay'>>

export const payrollItemEarnings = (item: ItemAmounts) => sumMoney(PAYROLL_EARNING_FIELDS.map(field => item[field]))
export const payrollItemDeductions = (item: ItemAmounts) => sumMoney(PAYROLL_DEDUCTION_FIELDS.map(field => item[field]))

/** ملخص خصومات المسير: سطر لكل عمود (ومنها النقص والخصومات الأخرى) والإجمالي الكبير من الصفوف نفسها. */
export function payrollDeductionSummary(items: readonly ItemAmounts[]) {
  const lines = PAYROLL_DEDUCTION_FIELDS.map(field => ({ field, label: PAYROLL_DEDUCTION_LABELS[field], total: sumMoney(items.map(item => item[field])) }))
  return { lines, grandTotal: sumMoney(items.map(payrollItemDeductions)), affected: items.filter(item => payrollItemDeductions(item) > 0).length }
}

/** إجماليات جدول المسير: الاستحقاقات والخصومات والصافي ومجموع كل عمود. */
export function payrollRunTotals(items: readonly ItemAmounts[]) {
  const column = (field: typeof PAYROLL_EARNING_FIELDS[number] | PayrollDeductionField | 'netPay') => sumMoney(items.map(item => item[field]))
  return { earnings: sumMoney(items.map(payrollItemEarnings)), deductions: sumMoney(items.map(payrollItemDeductions)), net: column('netPay'), column,
    negativeNet: items.filter(item => toMoneyNumber(item.netPay) < 0).length }
}

export interface PayrollItemCoverage { coverFrom: string | null; coverTo: string | null; coverDays: number | null; prorataFactor: number | null; monthlyDays: number | null }
/** التغطية والمعامل وأساس الأيام من تفصيل البند المحفوظ (لا إعادة حساب في الواجهة). */
export function payrollItemCoverage(item: Pick<ApiPayrollItem, 'breakdown'>): PayrollItemCoverage | null {
  try {
    const detail = JSON.parse(item.breakdown || '{}')
    const number = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null
    const date = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
    const coverage = { coverFrom: date(detail.coverFrom), coverTo: date(detail.coverTo), coverDays: number(detail.coverDays),
      prorataFactor: number(detail.prorataFactor), monthlyDays: number(detail.monthlyDays) }
    return coverage.coverDays === null && coverage.prorataFactor === null ? null : coverage
  } catch { return null }
}

/** أيام «بصمة ناقصة» من تفصيل البند المحفوظ: تُعرض على صف الموظف وقت الحساب لا عند رفض الاعتماد. */
export function payrollItemMissingPunchDates(item: Pick<ApiPayrollItem, 'breakdown'>): string[] {
  try {
    const detail = JSON.parse(item.breakdown || '{}')
    return Array.isArray(detail.missingPunchDates)
      ? detail.missingPunchDates.filter((value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value))
      : []
  } catch { return [] }
}

export function payrollMissingPunchText(dates: readonly string[]): string | null {
  if (!dates.length) return null
  const shown = dates.slice(0, 3).join('، ')
  return `بصمة ناقصة في ${dates.length} يوم (${shown}${dates.length > 3 ? '…' : ''}) — سوِّها قبل الاعتماد`
}

export function payrollCoverageText(coverage: PayrollItemCoverage | null): string | null {
  if (!coverage) return null
  const range = coverage.coverFrom && coverage.coverTo ? ` من ${coverage.coverFrom} إلى ${coverage.coverTo}` : ''
  return `${coverage.coverDays ?? '—'} يوم مغطى${range}`
}
