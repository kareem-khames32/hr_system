import { BadRequestException } from '@nestjs/common'
import { PayrollDecimal } from '../payroll/payroll-decimal'
import { salaryPayrollPeriodBounds } from '../payroll/payroll-period-salary'
import type { LoanCapMonthDefinition, LoanCapSalaryBase, LoanCapScopeType, LoanRepaymentMode } from './loans.entities'

// منطق نقي بلا قاعدة بيانات: سقوف السلف (AD-01..07) وخطة السداد المبكر (AD-14).
export const LOAN_CAP_VERSION = 'LOAN_CAP_V1_20260914' as const
export const LOAN_CAP_SCOPE_TYPES: readonly LoanCapScopeType[] = ['COMPANY', 'BRANCH', 'DEPARTMENT', 'TEAM', 'EMPLOYEES']
export const LOAN_EXCEPTIONAL_CATEGORIES = ['MEDICAL', 'FAMILY', 'EDUCATION', 'OTHER'] as const
export type LoanExceptionalCategory = typeof LOAN_EXCEPTIONAL_CATEGORIES[number]
export const LOAN_REPAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'OTHER'] as const
export const LOAN_REPAYMENT_MODES: readonly LoanRepaymentMode[] = ['FULL', 'SHORTEN_TERM', 'REDUCE_INSTALLMENT']

function bad(message: string, code = 'LOAN_INPUT_INVALID', extra: Record<string, unknown> = {}): never {
  throw new BadRequestException({ code, message, ...extra })
}

// ===== مال بالقروش الصحيحة =====
export function toCents(value: string): bigint {
  if (!/^-?\d{1,18}\.\d{2}$/.test(value)) bad('مبلغ داخلي غير صالح')
  const negative = value.startsWith('-'), [whole, fraction] = (negative ? value.slice(1) : value).split('.')
  return BigInt(whole + fraction) * (negative ? -1n : 1n)
}
export function fromCents(cents: bigint): string {
  const negative = cents < 0n, abs = negative ? -cents : cents
  return `${negative ? '-' : ''}${abs / 100n}.${String(abs % 100n).padStart(2, '0')}`
}
/** مبلغ عميل: نص أو رقم صحيح التمثيل، موجب (أو صفر عند السماح) وبمنزلتين على الأكثر. */
export function loanMoney(value: unknown, label: string, allowZero = false): string {
  const text = typeof value === 'number' && Number.isFinite(value) ? String(value) : value
  if (typeof text !== 'string' || !/^\d{1,16}(?:\.\d{1,2})?$/.test(text.trim())) bad(`${label} يجب أن يكون مبلغًا غير سالب بمنزلتين عشريتين على الأكثر`)
  const [whole, fraction = ''] = (text as string).trim().split('.')
  const cents = BigInt(whole + fraction.padEnd(2, '0'))
  if (!allowZero && cents === 0n) bad(`${label} يجب أن يكون أكبر من صفر`)
  return fromCents(cents)
}
const minCents = (...values: bigint[]) => values.reduce((a, b) => (b < a ? b : a))

// ===== تواريخ نصية =====
export function isoDate(value: unknown, label: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) bad(`${label} مطلوب بصيغة YYYY-MM-DD`)
  const parsed = new Date(`${value}T00:00:00Z`)
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) bad(`${label} ليس تاريخًا صحيحًا`)
  return value as string
}
export function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}
export function addMonths(period: string, months: number): string {
  const year = Number(period.slice(0, 4)), month = Number(period.slice(5, 7)) - 1 + months
  const y = year + Math.floor(month / 12), m = ((month % 12) + 12) % 12
  return `${String(y).padStart(4, '0')}-${String(m + 1).padStart(2, '0')}`
}
export function loanPeriod(value: unknown, label: string): string {
  if (typeof value !== 'string' || !/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(value)) bad(`${label} مطلوب بصيغة YYYY-MM`)
  return value as string
}

// ===== AD-01: سياسة السقوف =====
export interface LoanCapPolicyValues {
  name: string; scopeType: LoanCapScopeType; scopeIds: number[] | null
  salaryBase: LoanCapSalaryBase | null; percentOfSalary: string | null; flatCapAmount: string | null
  maxRequestsPerMonth: number | null; maxAmountPerMonth: string | null; maxOutstandingBalance: string | null
  maxInstallmentMonths: number | null; monthDefinition: LoanCapMonthDefinition
  effectiveFrom: string; effectiveTo: string | null; priority: number; reason: string | null
}
export interface LoanCapPolicyRow extends LoanCapPolicyValues { id: number; policyKey: string; version: number; isActive: boolean }

const blank = (value: unknown) => value === undefined || value === null || (typeof value === 'string' && value.trim() === '')
function optionalInt(value: unknown, label: string, min: number, max: number): number | null {
  if (blank(value)) return null
  const parsed = typeof value === 'string' && /^\d{1,10}$/.test(value.trim()) ? Number(value) : value
  if (typeof parsed !== 'number' || !Number.isInteger(parsed) || parsed < min || parsed > max) bad(`${label} يجب أن يكون عددًا صحيحًا من ${min} إلى ${max}`)
  return parsed as number
}
function optionalPercent(value: unknown): string | null {
  if (blank(value)) return null
  const text = typeof value === 'number' && Number.isFinite(value) ? String(value) : value
  if (typeof text !== 'string' || !/^\d{1,4}(?:\.\d{1,4})?$/.test(text.trim())) bad('نسبة السقف من الراتب رقم بأربع منازل عشرية على الأكثر')
  const decimal = PayrollDecimal.from((text as string).trim())
  if (decimal.isZero() || decimal.compare(PayrollDecimal.from('1000')) > 0) bad('نسبة السقف من الراتب أكبر من صفر ولا تتجاوز 1000%')
  return decimal.format(4, 'HALF_UP')
}

/** AD-01: كل حقول السقوف اختيارية، لكن لا تُحفظ سياسة بلا أي سقف؛ والمقطوع لا يكون صفرًا أو سالبًا (AD-03). */
export function normalizeLoanCapPolicyInput(input: unknown): LoanCapPolicyValues {
  if (!input || typeof input !== 'object' || Array.isArray(input)) bad('بيانات سياسة السقوف مطلوبة')
  const row = input as Record<string, unknown>
  const name = typeof row.name === 'string' ? row.name.trim() : ''
  if (name.length < 3 || name.length > 150) bad('اسم السياسة من 3 إلى 150 حرفًا')
  if (!LOAN_CAP_SCOPE_TYPES.includes(row.scopeType as LoanCapScopeType)) bad('نطاق السياسة غير صالح')
  const scopeType = row.scopeType as LoanCapScopeType
  let scopeIds: number[] | null = null
  if (scopeType !== 'COMPANY') {
    if (!Array.isArray(row.scopeIds) || !row.scopeIds.length || row.scopeIds.length > 500) bad('اختر عنصرًا واحدًا على الأقل لنطاق السياسة (حتى 500)')
    scopeIds = [...new Set((row.scopeIds as unknown[]).map(value => optionalInt(value, 'معرف النطاق', 1, 2147483647)!))].sort((a, b) => a - b)
  } else if (Array.isArray(row.scopeIds) && row.scopeIds.length) bad('نطاق الشركة لا يقبل معرفات')
  const percentOfSalary = optionalPercent(row.percentOfSalary)
  const salaryBase = blank(row.salaryBase) ? null : row.salaryBase
  if (salaryBase !== null && salaryBase !== 'BASIC' && salaryBase !== 'GROSS') bad('قاعدة النسبة: الأساسي أو الإجمالي')
  if (percentOfSalary !== null && salaryBase === null) bad('حدد قاعدة احتساب النسبة (الأساسي أو الإجمالي)')
  const money = (key: string, label: string, allowZero = false) => blank(row[key]) ? null : loanMoney(row[key], label, allowZero)
  const flatCapAmount = money('flatCapAmount', 'السقف المقطوع')
  const maxAmountPerMonth = money('maxAmountPerMonth', 'سقف قيمة السلف الشهرية')
  const maxOutstandingBalance = money('maxOutstandingBalance', 'سقف المديونية القائمة', true)
  const maxRequestsPerMonth = optionalInt(row.maxRequestsPerMonth, 'حد عدد الطلبات الشهري', 1, 1000)
  const maxInstallmentMonths = optionalInt(row.maxInstallmentMonths, 'أقصى عدد أشهر التقسيط', 1, 1000)
  if ([percentOfSalary, flatCapAmount, maxAmountPerMonth, maxOutstandingBalance, maxRequestsPerMonth, maxInstallmentMonths].every(value => value === null)) {
    bad('حدد سقفًا واحدًا على الأقل؛ السياسة بلا سقوف لا تُحفظ', 'LOAN_CAP_POLICY_EMPTY')
  }
  const monthDefinition = blank(row.monthDefinition) ? 'PAYROLL_PERIOD' : row.monthDefinition
  if (monthDefinition !== 'PAYROLL_PERIOD' && monthDefinition !== 'CALENDAR') bad('تعريف الشهر: فترة المسير أو الشهر التقويمي')
  const effectiveFrom = isoDate(row.effectiveFrom, 'تاريخ بداية السريان')
  const effectiveTo = blank(row.effectiveTo) ? null : isoDate(row.effectiveTo, 'تاريخ نهاية السريان')
  if (effectiveTo !== null && effectiveTo < effectiveFrom) bad('نهاية السريان تسبق بدايته')
  const priority = optionalInt(row.priority, 'الأولوية', 0, 1000) ?? 0
  const reason = blank(row.reason) ? null : String(row.reason).trim()
  if (reason !== null && reason.length > 500) bad('السبب لا يتجاوز 500 حرف')
  return { name, scopeType, scopeIds, salaryBase: salaryBase as LoanCapSalaryBase | null, percentOfSalary, flatCapAmount, maxRequestsPerMonth,
    maxAmountPerMonth, maxOutstandingBalance, maxInstallmentMonths, monthDefinition: monthDefinition as LoanCapMonthDefinition, effectiveFrom, effectiveTo, priority, reason }
}

const SCOPE_RANK: Record<LoanCapScopeType, number> = { EMPLOYEES: 4, TEAM: 3, DEPARTMENT: 2, BRANCH: 1, COMPANY: 0 }

/** AD-01: الأخص نطاقًا ثم الأولوية الأعلى؛ المعطلة وخارج نافذة السريان لا تشارك. */
export function selectLoanCapPolicy(rows: LoanCapPolicyRow[], employee: { id: number; branchId: number | null; departmentId: number | null; teamId: number | null }, asOf: string): LoanCapPolicyRow | null {
  const target: Record<LoanCapScopeType, number | null> = { COMPANY: null, BRANCH: employee.branchId, DEPARTMENT: employee.departmentId, TEAM: employee.teamId, EMPLOYEES: employee.id }
  const matching = rows.filter(row => row.isActive && row.effectiveFrom <= asOf && (row.effectiveTo === null || row.effectiveTo >= asOf) &&
    (row.scopeType === 'COMPANY' || (target[row.scopeType] !== null && !!row.scopeIds?.includes(target[row.scopeType]!))))
  matching.sort((a, b) => SCOPE_RANK[b.scopeType] - SCOPE_RANK[a.scopeType] || b.priority - a.priority || b.version - a.version || b.id - a.id)
  return matching[0] ?? null
}

// ===== AD-04: تعريف الشهر =====
export interface LoanCapWindow { definition: LoanCapMonthDefinition; period: string; from: string; to: string; resetsOn: string }
export function loanCapWindow(definition: LoanCapMonthDefinition, asOf: string, cycleStartDay: number): LoanCapWindow {
  const month = asOf.slice(0, 7)
  if (definition === 'PAYROLL_PERIOD' && Number.isInteger(cycleStartDay) && cycleStartDay >= 1 && cycleStartDay <= 31) {
    for (const period of [month, addMonths(month, 1)]) {
      const bounds = salaryPayrollPeriodBounds(period, cycleStartDay)
      if (bounds.startDate <= asOf && asOf <= bounds.endDate) return { definition, period, from: bounds.startDate, to: bounds.endDate, resetsOn: addDays(bounds.endDate, 1) }
    }
  }
  const from = `${month}-01`, next = `${addMonths(month, 1)}-01`
  return { definition: 'CALENDAR', period: month, from, to: addDays(next, -1), resetsOn: next }
}

// ===== AD-02..06: السقف الفعّال =====
export type LoanCapComponentCode = 'PERCENT' | 'FLAT' | 'MONTHLY_AMOUNT' | 'OUTSTANDING'
export interface LoanCapComponent { code: LoanCapComponentCode; label: string; limit: string; used: string | null; available: string }
export type LoanCapViolationCode = 'AMOUNT_OVER_CAP' | 'CAP_EXHAUSTED' | 'MONTHLY_COUNT_REACHED' | 'MONTHS_OVER_MAX'
export interface LoanCapEvaluation {
  version: typeof LOAN_CAP_VERSION; asOf: string; amount: string; months: number
  policy: { id: number; policyKey: string; version: number; name: string; scopeType: LoanCapScopeType; monthDefinition: LoanCapMonthDefinition } | null
  salary: { base: LoanCapSalaryBase | null; value: string | null; sourceRef: string; note: string | null }
  window: LoanCapWindow
  usage: { requests: number; amount: string; maxRequests: number | null; remainingRequests: number | null }
  outstanding: string
  components: LoanCapComponent[]
  effectiveCap: string | null; governing: LoanCapComponentCode | null; governingLabel: string | null
  maxInstallmentMonths: number | null
  excess: string
  violations: Array<{ code: LoanCapViolationCode; message: string }>
  allowed: boolean
}

export function computeLoanCap(input: {
  asOf: string; amount: string; months: number; policy: LoanCapPolicyRow | null
  salary: { basic: string; gross: string; sourceRef: string; note?: string | null }
  usage: { requests: number; amount: string }; outstanding: string; window: LoanCapWindow
}): LoanCapEvaluation {
  const { policy } = input, amount = toCents(input.amount), components: LoanCapComponent[] = []
  const baseValue = policy?.salaryBase === 'BASIC' ? input.salary.basic : policy?.salaryBase === 'GROSS' ? input.salary.gross : null
  if (policy?.percentOfSalary && baseValue !== null) {
    const limit = PayrollDecimal.from(baseValue).multiply(PayrollDecimal.from(policy.percentOfSalary)).divide(PayrollDecimal.from('100')).format(2, 'HALF_UP')
    const pct = PayrollDecimal.from(policy.percentOfSalary).canonical()
    components.push({ code: 'PERCENT', label: `سقف النسبة (${pct}% من ${policy.salaryBase === 'BASIC' ? 'الراتب الأساسي' : 'إجمالي الراتب'})`, limit, used: null, available: limit })
  }
  if (policy?.flatCapAmount) components.push({ code: 'FLAT', label: 'السقف المقطوع للطلب الواحد', limit: policy.flatCapAmount, used: null, available: policy.flatCapAmount })
  if (policy?.maxAmountPerMonth) {
    const available = toCents(policy.maxAmountPerMonth) - toCents(input.usage.amount)
    components.push({ code: 'MONTHLY_AMOUNT', label: 'سقف قيمة السلف في الشهر', limit: policy.maxAmountPerMonth, used: input.usage.amount, available: fromCents(available > 0n ? available : 0n) })
  }
  if (policy?.maxOutstandingBalance) {
    const available = toCents(policy.maxOutstandingBalance) - toCents(input.outstanding)
    components.push({ code: 'OUTSTANDING', label: 'سقف المديونية القائمة', limit: policy.maxOutstandingBalance, used: input.outstanding, available: fromCents(available > 0n ? available : 0n) })
  }
  // AD-05: الأدنى يحكم، وعند التساوي يبقى الترتيب المعرّف (النسبة، المقطوع، الشهري، المديونية).
  let governing: LoanCapComponent | null = null
  for (const component of components) if (!governing || toCents(component.available) < toCents(governing.available)) governing = component
  const effectiveCap = governing ? toCents(governing.available) : null
  const violations: LoanCapEvaluation['violations'] = []
  const maxRequests = policy?.maxRequestsPerMonth ?? null
  if (maxRequests !== null && input.usage.requests >= maxRequests) {
    violations.push({ code: 'MONTHLY_COUNT_REACHED', message: `بلغت الحد الشهري لعدد طلبات السلف (${maxRequests})؛ يُعاد العداد في ${input.window.resetsOn}` })
  }
  if (effectiveCap !== null && effectiveCap <= 0n) {
    violations.push({ code: 'CAP_EXHAUSTED', message: `لا توجد مساحة سلفة متاحة الآن؛ القيد الحاكم: «${governing!.label}»` })
  } else if (effectiveCap !== null && amount > effectiveCap) {
    violations.push({ code: 'AMOUNT_OVER_CAP', message: `المبلغ المطلوب ${input.amount} يتجاوز السقف الفعّال ${fromCents(effectiveCap)}؛ القيد الحاكم: «${governing!.label}»` })
  }
  const maxMonths = policy?.maxInstallmentMonths ?? null
  if (maxMonths !== null && input.months > maxMonths) violations.push({ code: 'MONTHS_OVER_MAX', message: `عدد الأقساط ${input.months} يتجاوز الحد الأقصى ${maxMonths} شهرًا` })
  const excess = effectiveCap !== null && amount > effectiveCap ? amount - (effectiveCap > 0n ? effectiveCap : 0n) : 0n
  return {
    version: LOAN_CAP_VERSION, asOf: input.asOf, amount: input.amount, months: input.months,
    policy: policy ? { id: policy.id, policyKey: policy.policyKey, version: policy.version, name: policy.name, scopeType: policy.scopeType, monthDefinition: policy.monthDefinition } : null,
    salary: { base: policy?.salaryBase ?? null, value: policy?.percentOfSalary ? baseValue : null, sourceRef: input.salary.sourceRef, note: input.salary.note ?? null },
    window: input.window,
    usage: { requests: input.usage.requests, amount: input.usage.amount, maxRequests, remainingRequests: maxRequests === null ? null : Math.max(0, maxRequests - input.usage.requests) },
    outstanding: input.outstanding, components,
    effectiveCap: effectiveCap === null ? null : fromCents(effectiveCap > 0n ? effectiveCap : 0n),
    governing: governing?.code ?? null, governingLabel: governing?.label ?? null,
    maxInstallmentMonths: maxMonths, excess: fromCents(excess), violations, allowed: violations.length === 0,
  }
}

// ===== AD-14: خطة السداد المبكر =====
export interface LoanRepaymentSource { id: number; dueDate: string; remainingAmount: string }
export interface LoanRepaymentLine { installmentId: number; paidAmount: string; carriedAmount: string }
export interface LoanRepaymentPlan { mode: LoanRepaymentMode; total: string; amount: string; balanceAfter: string; lines: LoanRepaymentLine[] }

/**
 * FULL: كل الأقساط المفتوحة تُسوّى. SHORTEN_TERM: يُسدد من آخر الأقساط فيقل عددها ويبقى مبلغ الأولى.
 * REDUCE_INSTALLMENT: يبقى العدد ويُوزع المتبقي بالتساوي (القسط الأخير يمتص الفرق)، ثم بالتناسب لو كان أحد الأقساط أصغر من حصته.
 */
export function planEarlyRepayment(sources: LoanRepaymentSource[], amountText: string | null, requestedMode: LoanRepaymentMode): LoanRepaymentPlan {
  const open = sources.filter(row => toCents(row.remainingAmount) > 0n)
  if (!open.length) bad('السلفة مسددة بالفعل أو غير موجودة لهذا الموظف', 'LOAN_ALREADY_SETTLED')
  const total = open.reduce((sum, row) => sum + toCents(row.remainingAmount), 0n)
  const pay = amountText === null ? total : toCents(amountText)
  if (pay <= 0n) bad('مبلغ السداد يجب أن يكون أكبر من صفر')
  if (pay > total) bad(`مبلغ السداد يتجاوز الرصيد المتبقي؛ قيمة الإقفال الدقيقة ${fromCents(total)}`, 'LOAN_REPAYMENT_EXCEEDS_BALANCE', { closingAmount: fromCents(total) })
  if (!LOAN_REPAYMENT_MODES.includes(requestedMode)) bad('طريقة السداد غير صالحة')
  if (requestedMode === 'FULL' && pay !== total) bad(`السداد الكلي يساوي قيمة الإقفال ${fromCents(total)}؛ للسداد الجزئي اختر تقصير المدة أو تخفيض القسط`)
  const ordered = [...open].sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id - b.id)
  const lines: LoanRepaymentLine[] = []
  const mode: LoanRepaymentMode = pay === total ? 'FULL' : requestedMode
  if (mode === 'FULL') {
    for (const row of ordered) lines.push({ installmentId: row.id, paidAmount: row.remainingAmount, carriedAmount: '0.00' })
  } else if (mode === 'SHORTEN_TERM') {
    let left = pay
    for (const row of [...ordered].reverse()) {
      if (left === 0n) break
      const remaining = toCents(row.remainingAmount), paid = left >= remaining ? remaining : left
      lines.push({ installmentId: row.id, paidAmount: fromCents(paid), carriedAmount: fromCents(remaining - paid) })
      left -= paid
    }
  } else {
    const after = total - pay, count = BigInt(ordered.length), remaining = ordered.map(row => toCents(row.remainingAmount))
    const feasible = (targets: bigint[]) => targets.every((value, index) => value >= 0n && value <= remaining[index])
    const base = after / count
    let targets = remaining.map((_, index) => index === remaining.length - 1 ? after - base * (count - 1n) : base)
    if (!feasible(targets)) {
      targets = remaining.map(value => value * after / total)
      targets[targets.length - 1] = after - targets.slice(0, -1).reduce((sum, value) => sum + value, 0n)
    }
    if (!feasible(targets)) bad('تعذر توزيع المتبقي على الأقساط بهذا المبلغ؛ استخدم تقصير المدة')
    ordered.forEach((row, index) => {
      const paid = remaining[index] - targets[index]
      if (paid > 0n) lines.push({ installmentId: row.id, paidAmount: fromCents(paid), carriedAmount: fromCents(targets[index]) })
    })
  }
  return { mode, total: fromCents(total), amount: fromCents(pay), balanceAfter: fromCents(total - pay), lines }
}

/** AD-13: المقاصة تستهلك المستحقات بعد باقي الخصومات، والجزء غير المغطى من رصيد السلف يبقى مدينًا. */
export function settlementLoanRecovery(input: { loanBalance: string; credits: string; debits: string }): { loanBalance: string; covered: string; uncovered: string } | null {
  const loan = toCents(input.loanBalance)
  if (loan <= 0n) return null
  const net = toCents(input.credits) - toCents(input.debits)
  if (net >= 0n) return null
  const uncovered = minCents(loan, -net)
  return { loanBalance: fromCents(loan), covered: fromCents(loan - uncovered), uncovered: fromCents(uncovered) }
}
