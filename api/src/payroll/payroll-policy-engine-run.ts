import { createHash } from 'node:crypto'
import { MONTHLY_SALARY_COMPONENTS } from '../employees/compensation'
import { PayrollDecimal } from './payroll-decimal'
import { executePayrollComponents, PAYROLL_COMPONENT_EXECUTION_VERSION, PayrollComponentExecutionError } from './payroll-component-execution'
import { PayrollPolicyDefinitionError } from './payroll-policy-definition'
import type { PayrollPolicySettings } from './payroll-policy-settings'
import { protectPayrollObligations, type PayrollCollectionClass, type PayrollObligationProtectionEntry, type PayrollObligationProtectionSettings } from './payroll-obligation-protection'

/**
 * الخطوة 20 / D13 — محرك السياسة داخل حساب المسير خلف engine_mode:
 * - LEGACY: الحساب القديم وحده بلا ظل.
 * - SHADOW (الافتراضي): المصروف = الحساب القديم، ومحرك السياسة يُحسب بجانبه على نفس الموظفين ونفس المدخلات المجمدة بسياسة افتراضية تقلّد القديم،
 *   ويُحفظ تقرير تكافؤ لكل موظف ولكل بند على المسير.
 * - POLICY: المصروف = نتيجة محرك السياسة؛ مسموح فقط لو تقرير التكافؤ صفر أو كل فرق له سبب مكتوب من حامل payroll.approve.
 * المحوّل: مصادر الحساب المجمدة (راتب شهر المسير من سجل الأجر، تغطية الخدمة، أيام الإجازة بلا أجر، مبالغ الإضافي المعتمدة، قيود الدفتر)
 * ← متغيرات الكتالوج (BASE_SALARY وGROSS_SALARY وCOVERED_DAYS وDAY_RATE وUNPAID_LEAVE_DAYS وOT_AMOUNT…)؛ خصومات الحضور من منفذ البنود
 * لكل يوم على المصادر الحية (payroll-shadow-attendance). حماية الصافي بنواة DD-11 المشتركة، والأقساط بمخطط الأقساط نفسه.
 */
export const PAYROLL_ENGINE_MODES = ['LEGACY', 'SHADOW', 'POLICY'] as const
export type PayrollEngineMode = typeof PAYROLL_ENGINE_MODES[number]
export const PAYROLL_DEFAULT_ENGINE_MODE: PayrollEngineMode = 'SHADOW'
export const PAYROLL_POLICY_ENGINE_RUN_VERSION = 'POLICY_ENGINE_RUN_V1_20260914' as const
export const PAYROLL_ENGINE_MODE_LABELS: Record<PayrollEngineMode, string> = {
  LEGACY: 'الحساب القديم وحده (بلا ظل)', SHADOW: 'ظل: المصروف القديم ومحرك السياسة بجانبه', POLICY: 'السياسة: المصروف من محرك السياسة',
}

export const PAYROLL_PARITY_COMPONENTS = [
  { code: 'BASIC', field: 'basicSalary', label: 'الراتب الأساسي المستحق' },
  { code: 'ALLOWANCES', field: 'allowances', label: 'البدلات المستحقة' },
  { code: 'OVERTIME', field: 'overtimeAmount', label: 'الإضافي المعتمد' },
  { code: 'OTHER_ADDITIONS', field: 'otherAdditions', label: 'إضافات الدفتر' },
  { code: 'LATENESS', field: 'latenessDeduction', label: 'خصم التأخير' },
  { code: 'SHORTFALL', field: 'shortfallDeduction', label: 'خصم نقص الساعات' },
  { code: 'ABSENCE', field: 'absenceDeduction', label: 'خصم الغياب' },
  { code: 'UNPAID_LEAVE', field: 'unpaidLeaveDeduction', label: 'الإجازة بلا أجر' },
  { code: 'OTHER_DEDUCTIONS', field: 'otherDeductions', label: 'خصومات الدفتر' },
  { code: 'LOANS', field: 'loanInstallments', label: 'أقساط السلف' },
  { code: 'NET', field: 'netPay', label: 'الصافي' },
] as const
export type PayrollParityComponentCode = typeof PAYROLL_PARITY_COMPONENTS[number]['code']
type AmountField = typeof PAYROLL_PARITY_COMPONENTS[number]['field']
export type PayrollEngineAmounts = Record<AmountField, number>
export type PayrollEnginePolicyAmounts = Record<AmountField, number | null>

export interface PayrollPolicyEngineFacts {
  employeeId: number; period: string; periodStart: string; periodEnd: string
  monthlyComponents: number[]; coverDays: number; periodDays: number; fullCoverage: boolean
  dailyHours: number; monthlyDays: number; lateDeductionEnabled: boolean; currency: string | null
  // أيام بلا أجر + الأيام المكافئة لخصم الإجازة المرضية المتدرج (كسور حتى 6 منازل)
  overtimeAmount: number; unpaidLeaveDays: number
  credits: PayrollObligationProtectionEntry[]; debits: PayrollObligationProtectionEntry[]
  protectionSettings: PayrollObligationProtectionSettings
  // خصومات الحضور قبل حماية الصافي من منفذ البنود لكل يوم (null = غير مثبتة المصدر أو غير مدعومة)
  attendance: { status: string; totals: { lateness: string; shortfall: string; absence: string } | null; message: string }
  // B5 / الخطوة 22: ترتيب تحصيل المالك من نسخة السياسة (نفس ترتيب الحساب القديم للتكافؤ)؛ null = الافتراضي
  collectionOrder?: readonly PayrollCollectionClass[] | null
}
export interface PayrollPolicyEngineUnavailable { components: PayrollParityComponentCode[]; code: string; message: string }
export interface PayrollPolicyEnginePreNet {
  status: 'COMPUTED' | 'PARTIAL' | 'ERROR'
  earnedComponents: number[] | null
  amounts: PayrollEnginePolicyAmounts
  attendanceRequested: { lateness: number; shortfall: number; absence: number } | null
  grossEarned: number | null
  netBeforeLoans: number | null
  capConsumed: number | null
  protection: ReturnType<typeof protectPayrollObligations> | null
  unavailable: PayrollPolicyEngineUnavailable[]
  execution: { engineVersion: string; componentExecution: string; definition: 'LEGACY_EQUIVALENT_DEFAULT'
    lines: Array<{ code: string; status: string; amount: string | null; skippedReason: string | null; warnings: string[] }> } | null
  error: { code: string; message: string } | null
}

const SALARY_CODES = ['SAL_BASIC', 'SAL_HOUSING', 'SAL_TRANSPORT', 'SAL_PHONE', 'SAL_WORK_NATURE', 'SAL_OTHER']
const cents = (value: number) => Math.round(Number(value) * 100)
const money = (value: number) => (cents(value) / 100).toFixed(2)
const fraction = (value: PayrollDecimal) => ({ numerator: String(value.numerator), denominator: String(value.denominator) })
const round2 = (value: number) => cents(value) / 100

const component = (code: string, extra: Record<string, unknown>) => ({ code, nameAr: code, componentType: 'EARNING', stage: 1, sequence: 1, valueSource: 'FORMULA',
  conditionFormula: null, unit: 'CURRENCY', prorationMode: 'NONE', amount: null, fieldPath: null, missingFieldBehavior: null, varCode: null, multiplier: null,
  percent: null, baseCode: null, tierSetCode: null, formula: null, ledgerCategory: null, ledgerDirection: null, ledgerPartialPayment: null, minAmount: null,
  maxAmount: null, capPctOfBase: null, capBaseCode: null, roundingMode: 'DOWN', roundingScale: 2, deductionPriority: null, carryOverEligible: false,
  rollupTo: null, exemptible: false, showOnPayslip: true, isActive: true, ...extra })

/** السياسة الافتراضية المقلدة للمسير القديم لفترة كاملة (البنود قبل الصافي). خصومات الحضور تأتي مبالغ فترة من منفذ الأيام. */
export function legacyEquivalentPayrollDefinition() {
  return {
    parameters: [],
    tierSets: [],
    components: [
      ...MONTHLY_SALARY_COMPONENTS.map((salary, index) => component(SALARY_CODES[index], { nameAr: `${salary.nameAr} المستحق`, stage: 1, sequence: index + 1,
        valueSource: 'EMPLOYEE_FIELD', fieldPath: salary.key, missingFieldBehavior: 'ZERO', prorationMode: 'BY_COVERED_DAYS',
        rollupTo: salary.key === 'basicSalary' ? 'basicSalary' : 'allowances' })),
      component('OT_PAY', { nameAr: 'الإضافي المعتمد', stage: 2, sequence: 10, valueSource: 'SYSTEM_VAR', varCode: 'OT_AMOUNT', rollupTo: 'overtimeAmount' }),
      component('LEDGER_CREDITS', { nameAr: 'إضافات الدفتر', stage: 2, sequence: 11, valueSource: 'EXTERNAL', rollupTo: 'otherAdditions' }),
      component('LATENESS_DED', { nameAr: 'خصم التأخير قبل حماية الصافي', componentType: 'DEDUCTION', stage: 3, sequence: 20, valueSource: 'EXTERNAL', deductionPriority: 1, exemptible: true }),
      component('SHORTFALL_DED', { nameAr: 'خصم نقص الساعات قبل حماية الصافي', componentType: 'DEDUCTION', stage: 3, sequence: 21, valueSource: 'EXTERNAL', deductionPriority: 2, exemptible: true }),
      component('ABSENCE_DED', { nameAr: 'خصم الغياب قبل حماية الصافي', componentType: 'DEDUCTION', stage: 3, sequence: 22, valueSource: 'EXTERNAL', deductionPriority: 3, exemptible: true }),
      component('UNPAID_LEAVE_DED', { nameAr: 'الإجازة بلا أجر', componentType: 'DEDUCTION', stage: 3, sequence: 23, valueSource: 'FORMULA',
        formula: 'UNPAID_LEAVE_DAYS * DAY_RATE', deductionPriority: 4, rollupTo: 'unpaidLeaveDeduction' }),
      component('NET', { nameAr: 'الصافي', componentType: 'INFO', stage: 6, sequence: 90, valueSource: 'SYS_NET', roundingMode: null, roundingScale: null }),
    ],
  }
}

function engineSettings(facts: PayrollPolicyEngineFacts): PayrollPolicySettings {
  return { defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 1, cycleEndMode: 'DERIVED', cycleEndDay: null, baseDaysBasis: 'FIXED_30', monthlyDays: 30,
    dailyHours: facts.dailyHours, rateBase: 'GROSS', roundingMode: 'DOWN', roundingScale: 2, divisionByZeroMode: 'ZERO_WITH_WARNING',
    maxDeductionPctOfGross: null, minNetGuarantee: null, netFloorPct: null, carryOverExcess: false, skipAttendance: false,
    lateDeductionEnabled: facts.lateDeductionEnabled, currency: (['SAR', 'EGP'].includes(facts.currency ?? '') ? facts.currency : 'SAR') as PayrollPolicySettings['currency'] }
}

/** نتيجة محرك السياسة قبل الأقساط لموظف واحد؛ حساب نقي بلا قاعدة بيانات. الأقساط يكملها المنسق بمخطط الأقساط. */
export function computePayrollPolicyEnginePreNet(facts: PayrollPolicyEngineFacts): PayrollPolicyEnginePreNet {
  const empty: PayrollEnginePolicyAmounts = { basicSalary: null, allowances: null, overtimeAmount: null, otherAdditions: null, latenessDeduction: null,
    shortfallDeduction: null, absenceDeduction: null, unpaidLeaveDeduction: null, otherDeductions: null, loanInstallments: null, netPay: null }
  const unavailable: PayrollPolicyEngineUnavailable[] = []
  const result = (status: PayrollPolicyEnginePreNet['status'], extra: Partial<PayrollPolicyEnginePreNet> = {}): PayrollPolicyEnginePreNet =>
    ({ status, earnedComponents: null, amounts: empty, attendanceRequested: null, grossEarned: null, netBeforeLoans: null, capConsumed: null, protection: null,
      unavailable, execution: null, error: null, ...extra })
  if (facts.monthlyDays !== 30) {
    unavailable.push({ components: PAYROLL_PARITY_COMPONENTS.map(row => row.code), code: 'ENGINE_MONTHLY_DAYS_UNSUPPORTED', message: 'محرك السياسة يعمل على أساس 30 يومًا فقط (D3)' })
    return result('PARTIAL')
  }
  const monthly = facts.monthlyComponents.map(cents)
  if (monthly.length !== MONTHLY_SALARY_COMPONENTS.length || monthly.some(value => !Number.isSafeInteger(value) || value < 0)) {
    return result('ERROR', { error: { code: 'ENGINE_SALARY_COMPONENTS_INVALID', message: 'مكونات راتب شهر المسير غير صالحة لمحرك السياسة' } })
  }
  const d = (text: string) => PayrollDecimal.from(text)
  const gross = new PayrollDecimal(BigInt(monthly.reduce((sum, value) => sum + value, 0)), 100n), basic = new PayrollDecimal(BigInt(monthly[0]), 100n)
  const dayRate = gross.divide(d('30')), hourRate = dayRate.divide(d(String(facts.dailyHours))), minuteRate = hourRate.divide(d('60'))
  const salaryRef = `payroll-run-salary:employee:${facts.employeeId}:period:${facts.period}`
  const coverageRef = `payroll-employment-coverage:employee:${facts.employeeId}:${facts.periodStart}:${facts.periodEnd}`
  // قرار المالك (الراتب على 30 يوم): مقام التناسب 30 مهما كان طول الفترة (نفس الحساب القديم)، بسقف الراتب كاملًا.
  const factor = facts.fullCoverage ? d('1') : (() => { const value = new PayrollDecimal(BigInt(facts.coverDays), 30n); return value.compare(d('1')) > 0 ? d('1') : value })()
  const attendance = facts.attendance.totals
  if (!attendance) unavailable.push({ components: ['LATENESS', 'SHORTFALL', 'ABSENCE', 'OTHER_DEDUCTIONS', 'LOANS', 'NET'], code: `ATTENDANCE_SHADOW_${facts.attendance.status}`, message: facts.attendance.message })
  const credits = facts.credits.reduce((sum, row) => sum + cents(row.amount), 0)
  const variables: Record<string, string | { numerator: string; denominator: string }> = {
    BASE_SALARY: basic.format(2, 'DOWN'), GROSS_SALARY: gross.format(2, 'DOWN'), BASE_DAYS_BASIS: '30', STANDARD_DAY_HOURS: String(facts.dailyHours),
    DAY_RATE: fraction(dayRate), HOUR_RATE: fraction(hourRate), MINUTE_RATE: fraction(minuteRate), COVERED_DAYS: String(facts.coverDays), PERIOD_DAYS: String(facts.periodDays),
    UNPAID_LEAVE_DAYS: PayrollDecimal.from(facts.unpaidLeaveDays.toFixed(6)).canonical(), OT_AMOUNT: money(facts.overtimeAmount), IS_ATTENDANCE_EXEMPT: '0',
  }
  const variableRef = (code: string) => ['BASE_SALARY', 'GROSS_SALARY', 'DAY_RATE', 'HOUR_RATE', 'MINUTE_RATE'].includes(code) ? salaryRef
    : code === 'OT_AMOUNT' ? `payroll-overtime-approved:employee:${facts.employeeId}:period:${facts.period}`
    : code === 'UNPAID_LEAVE_DAYS' ? `leaves-unpaid:employee:${facts.employeeId}:${facts.periodStart}:${facts.periodEnd}` : coverageRef
  const externalValues: Record<string, string | null> = { LEDGER_CREDITS: (credits / 100).toFixed(2),
    LATENESS_DED: attendance?.lateness ?? null, SHORTFALL_DED: attendance?.shortfall ?? null, ABSENCE_DED: attendance?.absence ?? null }
  const input = {
    variables, employeeFields: Object.fromEntries(MONTHLY_SALARY_COMPONENTS.map((salary, index) => [salary.key, (monthly[index] / 100).toFixed(2)])),
    externalValues,
    sourceMetadata: {
      variables: Object.fromEntries(Object.keys(variables).map(code => [code, { sourceRef: variableRef(code), alreadyProrated: false }])),
      employeeFields: Object.fromEntries(MONTHLY_SALARY_COMPONENTS.map(salary => [salary.key, { sourceRef: salaryRef, alreadyProrated: false }])),
      externalValues: Object.fromEntries(Object.entries(externalValues).filter(([, value]) => value !== null).map(([code]) => [code, {
        sourceRef: code === 'LEDGER_CREDITS' ? `employee_obligations:credits:employee:${facts.employeeId}` : `payroll-shadow-attendance:employee:${facts.employeeId}:${facts.periodStart}:${facts.periodEnd}`,
        alreadyProrated: true }])),
    },
    proration: { calendar30: { value: fraction(factor), sourceRef: coverageRef }, working: { value: null, sourceRef: coverageRef } },
    exemptions: [],
  }
  let execution
  try { execution = executePayrollComponents(legacyEquivalentPayrollDefinition(), engineSettings(facts), input) } catch (error) {
    if (error instanceof PayrollComponentExecutionError || error instanceof PayrollPolicyDefinitionError) {
      return result('ERROR', { error: { code: error.code, message: error.message } })
    }
    return result('ERROR', { error: { code: 'POLICY_ENGINE_FAILED', message: error instanceof Error ? error.message.slice(0, 300) : 'تعذر تشغيل محرك السياسة' } })
  }
  const line = (code: string) => execution.components.find(row => row.code === code)
  const amount = (code: string) => { const value = line(code)?.amount; return value === null || value === undefined ? null : Number(value) }
  const earnedComponents = SALARY_CODES.map(code => amount(code) ?? 0)
  const basicSalary = earnedComponents[0], allowances = round2(earnedComponents.slice(1).reduce((sum, value) => sum + value, 0))
  const grossEarned = round2(basicSalary + allowances)
  const overtimeAmount = amount('OT_PAY') ?? 0, otherAdditions = amount('LEDGER_CREDITS') ?? 0, unpaidLeaveDeduction = amount('UNPAID_LEAVE_DED') ?? 0
  const lines = execution.components.map(row => ({ code: row.code, status: row.status, amount: row.amount, skippedReason: row.skippedReason, warnings: row.warnings.map(warning => warning.code) }))
  const executionView = { engineVersion: PAYROLL_POLICY_ENGINE_RUN_VERSION, componentExecution: PAYROLL_COMPONENT_EXECUTION_VERSION, definition: 'LEGACY_EQUIVALENT_DEFAULT' as const, lines }
  const base: PayrollEnginePolicyAmounts = { ...empty, basicSalary, allowances, overtimeAmount, otherAdditions, unpaidLeaveDeduction }
  if (!attendance) return result('PARTIAL', { earnedComponents, amounts: base, grossEarned, execution: executionView })
  const attendanceRequested = { lateness: amount('LATENESS_DED') ?? 0, shortfall: amount('SHORTFALL_DED') ?? 0, absence: amount('ABSENCE_DED') ?? 0 }
  const protection = protectPayrollObligations({ earnedFixedGross: grossEarned, overtime: overtimeAmount, unpaidLeave: unpaidLeaveDeduction,
    attendance: attendanceRequested, credits: facts.credits, debits: facts.debits, settings: facts.protectionSettings, collectionOrder: facts.collectionOrder ?? null })
  return result('COMPUTED', { earnedComponents, grossEarned, attendanceRequested, execution: executionView, ...engineNetAmounts(base, grossEarned, protection) })
}

function engineNetAmounts(base: PayrollEnginePolicyAmounts, grossEarned: number, protection: ReturnType<typeof protectPayrollObligations>) {
  const overtimeAmount = base.overtimeAmount ?? 0, unpaidLeaveDeduction = base.unpaidLeaveDeduction ?? 0
  const netBeforeLoans = round2(grossEarned + overtimeAmount + protection.otherAdditions - protection.attendance.lateness - protection.attendance.shortfall
    - protection.attendance.absence - unpaidLeaveDeduction - protection.otherDeductions)
  const capConsumed = round2(protection.attendance.lateness + protection.attendance.shortfall + protection.attendance.absence + protection.otherDeductions)
  return { protection, netBeforeLoans, capConsumed,
    amounts: { ...base, otherAdditions: protection.otherAdditions, latenessDeduction: protection.attendance.lateness, shortfallDeduction: protection.attendance.shortfall,
      absenceDeduction: protection.attendance.absence, otherDeductions: protection.otherDeductions } }
}

/**
 * B5 / الخطوة 22: ترتيب المالك يضع السلف قبل فئات أخرى — تُعاد حماية الصافي بمبلغ الأقساط المحصل في موضعه، فتتقلص الفئات التالية له،
 * كما يفعل الحساب القديم تمامًا (التكافؤ يقارن النتيجتين بالترتيب نفسه). الترتيب الافتراضي أو غياب الأقساط لا يغيّر شيئًا.
 */
export function payrollPolicyEngineWithLoans(preNet: PayrollPolicyEnginePreNet, facts: PayrollPolicyEngineFacts, loanCollected: number): PayrollPolicyEnginePreNet {
  if (preNet.status !== 'COMPUTED' || !preNet.attendanceRequested || preNet.grossEarned === null || !facts.collectionOrder || !(loanCollected > 0)) return preNet
  const protection = protectPayrollObligations({ earnedFixedGross: preNet.grossEarned, overtime: preNet.amounts.overtimeAmount ?? 0, unpaidLeave: preNet.amounts.unpaidLeaveDeduction ?? 0,
    attendance: preNet.attendanceRequested, credits: facts.credits, debits: facts.debits, settings: facts.protectionSettings, collectionOrder: facts.collectionOrder, loanCollected })
  return { ...preNet, ...engineNetAmounts(preNet.amounts, preNet.grossEarned, protection) }
}

export interface PayrollParityComponentRow {
  code: PayrollParityComponentCode; label: string; legacy: string; policy: string | null; difference: string | null
  differenceKey: string | null; reasonCode: string | null; reason: string | null
}
export interface PayrollParityEmployeeRow {
  employeeId: number; status: 'MATCHED' | 'DIFFERENT' | 'UNAVAILABLE' | 'ERROR'; attendanceShadowStatus: string
  components: PayrollParityComponentRow[]; unavailable: PayrollPolicyEngineUnavailable[]; error: { code: string; message: string } | null
  // رموز مشاكل مصادر ظل الحضور (الجدول والخدمة والحضور والأيام غير المثبتة) — سبب القيم الغائبة وخطة إصلاحها
  sourceIssueCodes?: string[]
}

/** رموز مشاكل مصادر ظل الحضور للموظف كما حفظها منفذ الظل؛ قراءة نقية من نتيجة readPayrollShadowAttendance. */
export function payrollShadowSourceIssueCodes(shadow: unknown): string[] {
  if (!shadow || typeof shadow !== 'object') return ['ATTENDANCE_SHADOW_NOT_COMPUTED']
  const value = shadow as { sources?: Record<string, { issueCodes?: unknown }>; unprovenDays?: unknown; error?: { code?: unknown }; policyIssue?: { code?: unknown } }
  const codes: string[] = []
  for (const section of ['schedule', 'employment', 'attendance']) {
    const list = value.sources?.[section]?.issueCodes
    if (Array.isArray(list)) for (const code of list) codes.push(String(code))
  }
  if (Array.isArray(value.unprovenDays)) for (const day of value.unprovenDays as Array<{ code?: unknown }>) if (day?.code) codes.push(String(day.code))
  if (value.error?.code) codes.push(String(value.error.code))
  if (value.policyIssue?.code) codes.push(String(value.policyIssue.code))
  return [...new Set(codes)].sort()
}

/** طريق إصلاح كل مشكلة مصدر (خطة المصادر حتى تصير قيم محرك السياسة محسوبة لا غائبة). */
export const PAYROLL_SHADOW_SOURCE_REMEDIES: Record<string, string> = {
  SCHEDULE_TIMING_FIELDS_MISSING: 'جدول العمل أو الوردية بلا «دقائق العمل المطلوبة» أو «اختيار المرونة» موثقين: أكملهما من الكتالوجات (جداول العمل/الورديات) بتاريخ سريان — الحساب القديم يطبق الآن مدة الدوام كاملة بلا مرونة',
  SCHEDULE_TIMING_RULE_UNPROVEN: 'تعريف الدوام بلا نسخة مؤرخة صالحة لليوم: احفظ جدول العمل أو الوردية بتاريخ سريان',
  SCHEDULE_EMPLOYEE_RULE_UNPROVEN: 'إسناد جدول الموظف واختيار مرونته بلا نسخة مؤرخة: ثبّته من ملف الموظف بتاريخ سريان',
  SCHEDULE_INLINE_PLAN_UNVERSIONED: 'إسناد يوم بأوقات مباشرة بلا وردية مؤرخة: أسند وردية معرّفة لذلك اليوم',
  SCHEDULE_DAY_ASSIGNMENT_INVALID: 'إسناد اليوم متعارض: راجع جدول الأسبوع أو استثناء اليوم للموظف',
  ATTENDANCE_CALENDAR_UNPROVEN: 'تقويم اليوم غير مكتمل (يتبع غالبًا دوامًا غير مثبت): أكمل تعريف الدوام، أو أكّد تقويم الفرع/العام بتاريخ سريان',
  ATTENDANCE_PUNCH_EVIDENCE_INVALID: 'بصمة بلا مصدر أو بلا مُدخِل وسبب، أو مؤرخة بعد اليوم: أعد إدخال البصمة اليدوية بسبب من شاشة الحضور؛ فترة لم تنتهِ لا تُثبت',
  ATTENDANCE_STORED_DAY_MISSING: 'لا صف حضور محفوظ لأيام عمل: أعد احتساب حضور الفترة من شاشة الحضور بعد اكتمال البصمات',
  ATTENDANCE_RULE_SNAPSHOT_UNPROVEN: 'صفوف الحضور محسوبة قبل لقطات قواعد الحضور المؤرخة: أعد احتساب حضور الفترة',
  ATTENDANCE_DAY_NOT_CLOSED: 'اليوم أو الفترة لم ينتهِ: يُثبت الظل بعد انتهاء الفترة',
  ATTENDANCE_DAY_REVIEW_REQUIRED: 'أيام حضور تنتظر مراجعة: عالجها من مراجعة الحضور ثم أعد احتساب الفترة',
  ATTENDANCE_TIMING_UNPROVEN: 'دوام يوم العمل غير مثبت: أكمل تعريف جدول العمل أو الوردية المؤرخ',
  ATTENDANCE_TIMING_PROOF_INVALID: 'أوقات دوام اليوم غير صالحة لإثبات البصمات: صحح تعريف الدوام',
  ATTENDANCE_BRANCH_HISTORY_MISMATCH: 'فرع صف الحضور يخالف التنظيم المؤرخ: أعد احتساب حضور اليوم بعد تثبيت النقل',
  ATTENDANCE_NEWER_PUNCH_EVIDENCE: 'وصلت بصمة بعد حساب اليوم: أعد احتساب حضور اليوم',
  ATTENDANCE_NON_WORKING_EVIDENCE_REVIEW: 'يوم غير عامل عليه بصمة أو صف: سوِّه من مراجعة الحضور',
  ATTENDANCE_LEAVE_PROOF_UNSUPPORTED: 'يوم إجازة كاملة: إثبات مدخلات الإجازة التاريخية غير مدعوم في الظل بعد (الخطوة 23)',
  ATTENDANCE_PARTIAL_LEAVE_PROOF_UNSUPPORTED: 'نصف يوم إجازة: غير مدعوم في الظل بعد (الخطوة 23)',
  ATTENDANCE_PERMISSION_HISTORY_UNPROVEN: 'إذن حضور معتمد: غير مدعوم في الظل بعد (الخطوة 23)',
  ATTENDANCE_DAY_EXCUSE_UNPROVEN: 'مأمورية أو عمل عن بُعد معتمد: غير مدعوم في الظل بعد (الخطوة 23)',
  ATTENDANCE_CORRECTION_INPUT_PROOF_UNSUPPORTED: 'تصحيح حضور مكتمل: غير مدعوم في الظل بعد (الخطوة 23)',
  ATTENDANCE_CORRECTION_APPROVAL_UNPROVEN: 'تصحيح حضور بلا طلب مكتمل مطابق: راجع طلب التصحيح',
  ATTENDANCE_EXEMPTION_PROOF_UNSUPPORTED: 'استثناء حضور معتمد: غير مدعوم في الظل بعد (الخطوة 23)',
  ATTENDANCE_SHADOW_NOT_COMPUTED: 'لم يُحسب ظل الحضور لهذا الموظف',
  ATTENDANCE_EMPLOYMENT_COVERAGE_UNPROVEN: 'تغطية خدمة الموظف غير مثبتة (تتبع مشكلة تاريخ التعيين أو إعادة التعيين): أصلح بيانات الخدمة أولًا',
  EMPLOYMENT_HIRE_DATE_MISSING: 'تاريخ بدء الخدمة غير مسجل في ملف الموظف: سجّله (لا يُستخدم تاريخ افتراضي)',
  EMPLOYMENT_REHIRE_UNSUPPORTED: 'عودة للخدمة بعد إنهاء، أو إنهاء أقدم من التعيين الحالي، بلا فترات إعادة تعيين مؤرخة: وثّق تاريخ إعادة التعيين',
}
const REMEDY_FALLBACK = 'مصدر غير مثبت لمحرك السياسة؛ التفصيل في «ظل السياسة» للموظف'
const REASONS: Record<string, string> = {
  SALARY_ROUNDING_DISTRIBUTION: 'المحرك يقرّب كل مكوّن أجر بعد التناسب على حدة، والحساب القديم يضيف فرق التقريب لأكبر مكوّن',
  ATTENDANCE_ENGINE_DIFFERENCE: 'خصم الحضور قبل حماية الصافي يختلف بين محرك السياسة والحساب القديم؛ تفصيل الأيام وأسبابها في «ظل السياسة» للموظف',
  FOLLOWS_UPSTREAM_DIFFERENCE: 'فرق ناتج عن بند سابق مختلف (حماية الصافي والأقساط والصافي تتبع ما قبلها)',
  POLICY_VALUE_DIFFERENCE: 'قيمة محرك السياسة تختلف عن الحساب القديم لنفس المدخلات المجمدة',
}
export function payrollParityDifferenceKey(employeeId: number, code: string, legacy: string, policy: string | null) {
  return createHash('sha256').update(`${employeeId}|${code}|${legacy}|${policy ?? 'null'}`, 'utf8').digest('hex').slice(0, 40)
}

/** تقرير تكافؤ موظف واحد: كل بند بالمبلغين والفرق وسببه ومفتاح الفرق (الذي يُكتب له سبب قبل التحويل إلى POLICY). */
export function payrollParityEmployeeRow(input: { employeeId: number; legacy: PayrollEngineAmounts; legacyAttendanceRequested: { lateness: number; shortfall: number; absence: number }
  policy: PayrollEnginePolicyAmounts; preNet: PayrollPolicyEnginePreNet; attendanceShadowStatus: string; sourceIssueCodes?: string[] }): PayrollParityEmployeeRow {
  const { employeeId, legacy, policy, preNet } = input
  let upstream = false
  const components = PAYROLL_PARITY_COMPONENTS.map(({ code, field, label }) => {
    const legacyText = money(legacy[field]), value = policy[field], policyText = value === null ? null : money(value)
    const row: PayrollParityComponentRow = { code, label, legacy: legacyText, policy: policyText, difference: null, differenceKey: null, reasonCode: null, reason: null }
    if (policyText === null) {
      const missing = preNet.unavailable.find(item => item.components.includes(code))
      row.reasonCode = preNet.error?.code ?? missing?.code ?? 'POLICY_VALUE_UNAVAILABLE'
      row.reason = preNet.error?.message ?? missing?.message ?? 'محرك السياسة لم ينتج قيمة لهذا البند'
      row.differenceKey = payrollParityDifferenceKey(employeeId, code, legacyText, null)
      upstream = true
      return row
    }
    if (policyText === legacyText) return row
    row.difference = ((cents(Number(policyText)) - cents(Number(legacyText))) / 100).toFixed(2)
    row.differenceKey = payrollParityDifferenceKey(employeeId, code, legacyText, policyText)
    const attendanceKey = code === 'LATENESS' ? 'lateness' : code === 'SHORTFALL' ? 'shortfall' : code === 'ABSENCE' ? 'absence' : null
    if (code === 'BASIC' || code === 'ALLOWANCES') {
      const legacyGross = cents(legacy.basicSalary) + cents(legacy.allowances), policyGross = cents(policy.basicSalary ?? 0) + cents(policy.allowances ?? 0)
      row.reasonCode = Math.abs(legacyGross - policyGross) <= 5 ? 'SALARY_ROUNDING_DISTRIBUTION' : 'POLICY_VALUE_DIFFERENCE'
    } else if (attendanceKey && preNet.attendanceRequested && cents(preNet.attendanceRequested[attendanceKey]) !== cents(input.legacyAttendanceRequested[attendanceKey])) {
      row.reasonCode = 'ATTENDANCE_ENGINE_DIFFERENCE'
    } else row.reasonCode = upstream ? 'FOLLOWS_UPSTREAM_DIFFERENCE' : 'POLICY_VALUE_DIFFERENCE'
    row.reason = REASONS[row.reasonCode]
    upstream = true
    return row
  })
  const status = preNet.status === 'ERROR' ? 'ERROR' : components.some(row => row.policy === null) ? 'UNAVAILABLE' : components.some(row => row.difference !== null) ? 'DIFFERENT' : 'MATCHED'
  return { employeeId, status, attendanceShadowStatus: input.attendanceShadowStatus, components, unavailable: preNet.unavailable, error: preNet.error,
    sourceIssueCodes: status === 'UNAVAILABLE' || status === 'ERROR' ? [...new Set(input.sourceIssueCodes ?? [])].sort() : [] }
}

export interface PayrollSourceReadinessRow { code: string; employees: number; employeeIds: number[]; remedy: string }
export interface PayrollEngineParityReport {
  version: typeof PAYROLL_POLICY_ENGINE_RUN_VERSION; engineMode: PayrollEngineMode; paidResult: 'LEGACY' | 'POLICY'
  snapshotVersion: number; policySnapshotHash: string | null; generatedAt: string
  totals: { employees: number; matched: number; different: number; unavailable: number; error: number; differences: number }
  rows: PayrollParityEmployeeRow[]; reportHash: string; message: string
  // خطة المصادر: كل رمز مشكلة مصدر وعدد الموظفين الذين غابت قيمهم بسببه وطريق إصلاحه (مسيرات ما قبل هذا الحقل لا تحمله)
  sourceReadiness?: PayrollSourceReadinessRow[]
}

/** خطة المصادر لتقرير واحد: الرموز مرتبة بعدد الموظفين. */
export function payrollSourceReadiness(rows: readonly PayrollParityEmployeeRow[]): PayrollSourceReadinessRow[] {
  const byCode = new Map<string, number[]>()
  for (const row of rows) for (const code of row.sourceIssueCodes ?? []) byCode.set(code, [...(byCode.get(code) ?? []), row.employeeId])
  return [...byCode.entries()].map(([code, ids]) => ({ code, employees: ids.length, employeeIds: ids.slice(0, 50), remedy: PAYROLL_SHADOW_SOURCE_REMEDIES[code] ?? REMEDY_FALLBACK }))
    .sort((a, b) => b.employees - a.employees || (a.code < b.code ? -1 : 1))
}

export function summarizePayrollEngineParity(input: { engineMode: PayrollEngineMode; snapshotVersion: number; policySnapshotHash: string | null; rows: PayrollParityEmployeeRow[] }): PayrollEngineParityReport {
  const rows = [...input.rows].sort((a, b) => a.employeeId - b.employeeId)
  const count = (status: PayrollParityEmployeeRow['status']) => rows.filter(row => row.status === status).length
  const totals = { employees: rows.length, matched: count('MATCHED'), different: count('DIFFERENT'), unavailable: count('UNAVAILABLE'), error: count('ERROR'),
    differences: rows.reduce((sum, row) => sum + row.components.filter(item => item.differenceKey !== null).length, 0) }
  const reportHash = payrollParityReportContentHash({ engineMode: input.engineMode, snapshotVersion: input.snapshotVersion, policySnapshotHash: input.policySnapshotHash, rows })
  const message = input.engineMode === 'LEGACY' ? 'وضع LEGACY: لم يُحسب محرك السياسة بجانب المسير'
    : totals.differences === 0 ? 'محرك السياسة طابق الحساب القديم لكل موظف ولكل بند'
    : `${totals.differences} فرقًا بين محرك السياسة والحساب القديم؛ لكل فرق سبب مسجل، والتحويل إلى POLICY يحتاج سببًا مكتوبًا لكل فرق`
  return { version: PAYROLL_POLICY_ENGINE_RUN_VERSION, engineMode: input.engineMode, paidResult: input.engineMode === 'POLICY' ? 'POLICY' : 'LEGACY',
    snapshotVersion: input.snapshotVersion, policySnapshotHash: input.policySnapshotHash, generatedAt: new Date().toISOString(), totals, rows, reportHash, message,
    sourceReadiness: payrollSourceReadiness(rows) }
}

/** بصمة محتوى التقرير (الوضع ونسخة الحساب وبصمة اللقطة والصفوف) — تُعاد حسابها عند الاعتماد والتحويل فيُكشف أي تعديل خارج الحساب. */
export function payrollParityReportContentHash(content: Pick<PayrollEngineParityReport, 'engineMode' | 'snapshotVersion' | 'policySnapshotHash' | 'rows'>) {
  return createHash('sha256').update(JSON.stringify({ engineMode: content.engineMode, snapshotVersion: content.snapshotVersion, policySnapshotHash: content.policySnapshotHash, rows: content.rows }), 'utf8').digest('hex')
}
export const payrollParityReportIntact = (report: PayrollEngineParityReport) => payrollParityReportContentHash(report) === report.reportHash

export function parsePayrollEngineParityReport(text: string | null | undefined): PayrollEngineParityReport | null {
  if (!text) return null
  try {
    const parsed = JSON.parse(text)
    return parsed && parsed.version === PAYROLL_POLICY_ENGINE_RUN_VERSION && Array.isArray(parsed.rows) ? parsed : null
  } catch { return null }
}

export interface PayrollPolicySwitchIssue {
  employeeId: number | null; component: string | null; label: string; legacy: string | null; policy: string | null; differenceKey: string | null
  issue: 'NO_SHADOW_REPORT' | 'STALE_REPORT' | 'UNAVAILABLE' | 'UNEXPLAINED'; reason: string
}

/** شروط التحويل إلى POLICY: تقرير ظل للنسخة الحالية، ولا قيمة سياسة غائبة، وكل فرق له سبب مكتوب. */
export function payrollPolicySwitchIssues(report: PayrollEngineParityReport | null, run: { snapshotVersion: number; policySnapshotHash: string | null },
  explainedKeys: ReadonlySet<string>): PayrollPolicySwitchIssue[] {
  const general = (issue: PayrollPolicySwitchIssue['issue'], reason: string): PayrollPolicySwitchIssue[] => [{ employeeId: null, component: null, label: 'المسير', legacy: null, policy: null, differenceKey: null, issue, reason }]
  if (!report || report.engineMode === 'LEGACY') return general('NO_SHADOW_REPORT', 'لا يوجد تقرير تكافؤ SHADOW لهذا المسير؛ احسبه بوضع SHADOW أولًا')
  // تقرير بلا موظفين لا يثبت تكافؤًا (صفر فروق بلا مقارنة)؛ لا تحويل إلى POLICY عليه
  if (!report.rows.length) return general('NO_SHADOW_REPORT', 'تقرير التكافؤ بلا موظفين محسوبين؛ لا يُثبت تكافؤ يسمح بالتحويل إلى POLICY')
  if (!payrollParityReportIntact(report)) return general('STALE_REPORT', 'تقرير التكافؤ المحفوظ لا يطابق بصمته (عُدّل خارج الحساب)؛ أعد حساب المسير')
  if (report.snapshotVersion !== run.snapshotVersion || report.policySnapshotHash !== run.policySnapshotHash) return general('STALE_REPORT', 'تقرير التكافؤ لا يخص نسخة الحساب الحالية؛ أعد حساب المسير')
  const issues: PayrollPolicySwitchIssue[] = []
  for (const row of report.rows) for (const item of row.components) {
    if (item.differenceKey === null) continue
    if (item.policy === null) issues.push({ employeeId: row.employeeId, component: item.code, label: item.label, legacy: item.legacy, policy: null, differenceKey: item.differenceKey, issue: 'UNAVAILABLE',
      reason: `محرك السياسة لم ينتج قيمة (${item.reasonCode}): ${item.reason}؛ لا يُصرف مسير POLICY بقيمة غائبة` })
    else if (!explainedKeys.has(item.differenceKey)) issues.push({ employeeId: row.employeeId, component: item.code, label: item.label, legacy: item.legacy, policy: item.policy, differenceKey: item.differenceKey,
      issue: 'UNEXPLAINED', reason: 'فرق بلا سبب مكتوب من حامل صلاحية اعتماد المسير' })
  }
  return issues
}

export interface PayrollApprovalParityIssue {
  employeeId: number | null; component: string | null; label: string; legacy: string | null; policy: string | null; differenceKey: string | null; reasonCode: string | null
  issue: 'NO_ENGINE_MODE' | 'NO_SHADOW_REPORT' | 'INVALID_REPORT' | 'STALE_REPORT' | 'MISSING_EMPLOYEE' | 'UNEXPLAINED_DIFFERENCE' | 'UNEXPLAINED_UNAVAILABLE'; reason: string
}

/**
 * الخطوة 20 — شروط الاعتماد (أي وضع): تقرير تكافؤ SHADOW أو POLICY لنسخة الحساب الحالية وبصمة لقطتها، يغطي كل موظف له بند،
 * وكل فرق أو قيمة غائبة له سبب مكتوب. القيمة الغائبة يكفيها سبب مكتوب للاعتماد (المصروف هو القديم)، لكنها تبقى مانعة للتحويل إلى POLICY.
 */
export function payrollApprovalParityIssues(report: PayrollEngineParityReport | null, run: { engineMode: PayrollEngineMode | null; snapshotVersion: number; policySnapshotHash: string | null },
  explainedKeys: ReadonlySet<string>, itemEmployeeIds: readonly number[] | null = null): PayrollApprovalParityIssue[] {
  const general = (issue: PayrollApprovalParityIssue['issue'], reason: string): PayrollApprovalParityIssue[] =>
    [{ employeeId: null, component: null, label: 'المسير', legacy: null, policy: null, differenceKey: null, reasonCode: null, issue, reason }]
  if (!run.engineMode) return general('NO_ENGINE_MODE', 'المسير محسوب قبل وضع محرك الحساب وتقرير التكافؤ (D13)؛ أعد حسابه مع «تحديث لقطة السياسة» حتى يُحسب SHADOW بجانبه')
  if (run.engineMode === 'LEGACY' || !report || report.engineMode === 'LEGACY') {
    return general('NO_SHADOW_REPORT', 'لا يُعتمد مسير بلا تقرير تكافؤ SHADOW (الخطوتان 20 و23)؛ أعده إلى SHADOW وأعد حسابه')
  }
  if (!payrollParityReportIntact(report)) return general('INVALID_REPORT', 'تقرير التكافؤ المحفوظ لا يطابق بصمته (عُدّل خارج الحساب)؛ أعد حساب المسير قبل الاعتماد')
  if (report.engineMode !== run.engineMode || report.snapshotVersion !== run.snapshotVersion || report.policySnapshotHash !== run.policySnapshotHash) {
    return general('STALE_REPORT', `وضع محرك الحساب «${run.engineMode}» لا يطابق نسخة الحساب المحفوظة وتقرير تكافئها؛ أعد حساب المسير قبل الاعتماد`)
  }
  const reported = new Set(report.rows.map(row => row.employeeId))
  if (itemEmployeeIds && report.rows.some(row => !itemEmployeeIds.includes(row.employeeId))) {
    return general('STALE_REPORT', 'تقرير التكافؤ يضم موظفين ليسوا في بنود المسير الحالية؛ أعد حساب المسير')
  }
  const issues: PayrollApprovalParityIssue[] = []
  for (const employeeId of itemEmployeeIds ?? []) if (!reported.has(employeeId)) {
    issues.push({ employeeId, component: null, label: 'تقرير التكافؤ', legacy: null, policy: null, differenceKey: null, reasonCode: null, issue: 'MISSING_EMPLOYEE',
      reason: `الموظف #${employeeId} له بند في المسير بلا صف في تقرير التكافؤ؛ أعد حساب المسير` })
  }
  for (const row of report.rows) for (const item of row.components) {
    if (item.differenceKey === null || explainedKeys.has(item.differenceKey)) continue
    issues.push({ employeeId: row.employeeId, component: item.code, label: item.label, legacy: item.legacy, policy: item.policy, differenceKey: item.differenceKey, reasonCode: item.reasonCode,
      issue: item.policy === null ? 'UNEXPLAINED_UNAVAILABLE' : 'UNEXPLAINED_DIFFERENCE',
      reason: item.policy === null ? `قيمة محرك السياسة غائبة (${item.reasonCode}) بلا سبب مكتوب` : 'فرق بلا سبب مكتوب من حامل صلاحية اعتماد المسير' })
  }
  return issues
}

/** تجميع ما ينقصه سبب مكتوب برمز سبب النظام (سبب واحد مكتوب يغطي المجموعة في تقرير النسخة الحالية). */
export function payrollParityPendingGroups(issues: readonly PayrollApprovalParityIssue[]) {
  const groups = new Map<string, { reasonCode: string; count: number; unavailable: number; employees: Set<number> }>()
  for (const issue of issues) {
    if (!issue.reasonCode || issue.employeeId === null) continue
    const group = groups.get(issue.reasonCode) ?? { reasonCode: issue.reasonCode, count: 0, unavailable: 0, employees: new Set<number>() }
    group.count++; if (issue.issue === 'UNEXPLAINED_UNAVAILABLE') group.unavailable++
    group.employees.add(issue.employeeId); groups.set(issue.reasonCode, group)
  }
  return [...groups.values()].map(group => ({ reasonCode: group.reasonCode, count: group.count, unavailable: group.unavailable, employees: group.employees.size }))
    .sort((a, b) => b.count - a.count || (a.reasonCode < b.reasonCode ? -1 : 1))
}
