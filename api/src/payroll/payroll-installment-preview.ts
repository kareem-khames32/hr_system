import { PayrollDecimal } from './payroll-decimal'
import { allocatePayrollInstallments } from './payroll-installment-allocation'
import { computePayrollInstallmentBudget } from './payroll-installment-budget'
import type { PreviewPayrollInstallmentsDto } from './payroll-installment-preview.dto'
import type { PayrollPolicyDefinition } from './payroll-policy-definition'
import type { PayrollPolicySettings } from './payroll-policy-settings'

export const PAYROLL_INSTALLMENT_OPTIONS_VERSION = 'OWNER_INSTALLMENT_OPTIONS_V1_20260913'

export class PayrollInstallmentPreviewError extends Error {
  constructor(readonly code: string, message: string, readonly path: string) { super(message); this.name = 'PayrollInstallmentPreviewError' }
}

// قرار المالك يفسر BLOCK على مستوى القسط؛ لا يحجب راتب الموظف ولا يعيد كتابة قيمة تاريخية.
export const PAYROLL_INSTALLMENT_MODE_MAPPING = Object.freeze({
  ALLOW_PARTIAL: 'PARTIAL_THEN_CARRY', BLOCK: 'SKIP_AND_EXTEND',
} as const)

function fail(code: string, message: string, path: string): never { throw new PayrollInstallmentPreviewError(code, message, path) }
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') { for (const child of Object.values(value)) freeze(child); Object.freeze(value) }
  return value
}

// تستدعى بعد DTO وتعريف السياسة المتحققين؛ المصادر أدلة صريحة وليست قراءة لسلف الموظف أو حجزًا لها.
export function evaluatePayrollInstallmentPreview(definition: PayrollPolicyDefinition, settings: PayrollPolicySettings, input: PreviewPayrollInstallmentsDto) {
  if (settings.defaultPeriodType === 'SEMI_MONTHLY') fail('INSTALLMENT_PREVIEW_PERIOD_UNSUPPORTED', 'معاينة الأقساط الشهرية لا تدعم نصف الشهر بعد', 'period')
  const budget = computePayrollInstallmentBudget(settings, input.budget)
  const choices = new Map<string, { componentCode: string; storedValue: 'ALLOW_PARTIAL' | 'BLOCK'; insufficientMode: 'PARTIAL_THEN_CARRY' | 'SKIP_AND_EXTEND' }>()
  const loanComponents = new Map<string, string>()
  const installments = input.installments.map((row, index) => {
    const path = `installments[${index}]`, component = definition.components.find(candidate => candidate.code === row.componentCode)
    if (!component || !component.isActive || component.valueSource !== 'LEDGER' || component.componentType !== 'DEDUCTION' || component.ledgerDirection !== 'DEBIT') {
      fail('INSTALLMENT_PREVIEW_COMPONENT_UNAVAILABLE', 'اختر بند دفتر خصم نشطًا من تعريف السياسة المحفوظ', `${path}.componentCode`)
    }
    if (component.stage !== 5 || component.unit !== 'CURRENCY' || component.prorationMode !== 'NONE' || component.conditionFormula !== null ||
        component.minAmount !== null || component.maxAmount !== null || component.capPctOfBase !== null ||
        !component.carryOverEligible || (component.roundingScale ?? settings.roundingScale) < 2) {
      fail('INSTALLMENT_PREVIEW_COMPONENT_UNSUPPORTED', 'معاينة رصيد القسط تتطلب مبلغًا نقديًا قابلًا للترحيل بلا تناسب أو شروط أو حدود تغير أصل الدين، ودقة لا تقل عن قرش', `${path}.componentCode`)
    }
    if (!row.category.trim() || row.category.trim() === '*' || (component.ledgerCategory !== '*' && component.ledgerCategory !== row.category.trim())) {
      fail('INSTALLMENT_PREVIEW_CATEGORY_MISMATCH', 'تصنيف القسط لا يطابق تصنيف بند الدفتر', `${path}.category`)
    }
    const priorComponent = loanComponents.get(row.loanRef.trim())
    if (priorComponent && priorComponent !== row.componentCode) fail('INSTALLMENT_PREVIEW_LOAN_COMPONENT_CONFLICT', 'لا توزع أقساط السلفة نفسها على بندين بقرارات مختلفة داخل المعاينة', `${path}.componentCode`)
    loanComponents.set(row.loanRef.trim(), row.componentCode)
    const storedValue = component.ledgerPartialPayment
    if (storedValue !== 'ALLOW_PARTIAL' && storedValue !== 'BLOCK') fail('INSTALLMENT_PREVIEW_COMPONENT_UNSUPPORTED', 'سياسة السداد الجزئي غير محددة للبند', `${path}.componentCode`)
    const insufficientMode = PAYROLL_INSTALLMENT_MODE_MAPPING[storedValue]
    choices.set(component.code, { componentCode: component.code, storedValue, insufficientMode })
    const { componentCode: _component, category: _category, ...installment } = row
    return { ...installment, insufficientMode }
  })
  const allocation = allocatePayrollInstallments({ period: input.period, nextPeriod: input.nextPeriod,
    currencyScale: 2, availableBudget: budget.availableBudget, installments, manualDeferrals: input.manualDeferrals })
  const net = PayrollDecimal.from(input.budget.netBeforeLoans).subtract(PayrollDecimal.from(allocation.totals.deductedAmount))
  return freeze({ budget, allocation, policyChoices: [...choices.values()].sort((a, b) => a.componentCode < b.componentCode ? -1 : a.componentCode > b.componentCode ? 1 : 0),
    netAfterInstallments: { rawValue6: net.format(6, 'HALF_UP'), exact: { numerator: String(net.numerator), denominator: String(net.denominator) } },
    sourceAssignments: input.installments.map(row => ({ installmentRef: row.installmentRef.trim(), componentCode: row.componentCode, category: row.category.trim() })),
    warnings: [{ code: 'INSTALLMENT_PREVIEW_ONLY', message: 'نتيجة توضيحية بمدخلات صريحة؛ لا تثبت موافقة تأجيل أو اكتمال جدول أو رصيد فعلي، ولا تحجز أو تسدد دينًا' },
      ...budget.warnings, ...allocation.warnings] })
}
