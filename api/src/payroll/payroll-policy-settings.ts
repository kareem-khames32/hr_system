import { BadRequestException } from '@nestjs/common'
import { payrollCycleSettingsIssue, type PayrollCycleSettings } from './payroll-period'

export const PAYROLL_POLICY_PERIOD_TYPES = ['CALENDAR_MONTH', 'CUSTOM_DAY_RANGE', 'SEMI_MONTHLY'] as const
export const PAYROLL_POLICY_END_MODES = ['DERIVED', 'FIXED_DAY'] as const
export const PAYROLL_POLICY_RATE_BASES = ['GROSS', 'BASIC'] as const
// DOWN = قص الفلوس على منزلتين بلا تقريب (قرار المالك)، وهو الافتراضي؛ البقية تبقى مقبولة لنسخ تاريخية فقط.
export const PAYROLL_POLICY_ROUNDING_MODES = ['HALF_UP', 'HALF_EVEN', 'FLOOR', 'CEIL', 'DOWN'] as const
export const PAYROLL_POLICY_DIVISION_MODES = ['ZERO_WITH_WARNING', 'FAIL_ROW'] as const
export const PAYROLL_POLICY_CURRENCIES = ['SAR', 'EGP'] as const

export interface PayrollPolicySettings {
  defaultPeriodType: typeof PAYROLL_POLICY_PERIOD_TYPES[number]
  cycleStartDay: number
  cycleEndMode: typeof PAYROLL_POLICY_END_MODES[number]
  cycleEndDay: number | null
  baseDaysBasis: 'FIXED_30'
  monthlyDays: number
  dailyHours: number
  rateBase: typeof PAYROLL_POLICY_RATE_BASES[number]
  roundingMode: typeof PAYROLL_POLICY_ROUNDING_MODES[number]
  roundingScale: number
  divisionByZeroMode: typeof PAYROLL_POLICY_DIVISION_MODES[number]
  maxDeductionPctOfGross: number | null
  minNetGuarantee: number | null
  netFloorPct: number | null
  carryOverExcess: boolean
  skipAttendance: boolean
  lateDeductionEnabled: boolean
  currency: typeof PAYROLL_POLICY_CURRENCIES[number]
}

export const PAYROLL_POLICY_CONFIG_KEYS = {
  defaultPeriodType: 'payroll.policy.default_period_type', cycleStartDay: 'payroll.cycle_start_day',
  cycleEndMode: 'payroll.policy.cycle_end_mode', cycleEndDay: 'payroll.policy.cycle_end_day',
  baseDaysBasis: 'payroll.policy.base_days_basis', monthlyDays: 'payroll.monthly_days', dailyHours: 'payroll.daily_hours',
  rateBase: 'payroll.policy.rate_base', roundingMode: 'payroll.policy.rounding_mode', roundingScale: 'payroll.policy.rounding_scale',
  divisionByZeroMode: 'payroll.policy.division_by_zero_mode', maxDeductionPctOfGross: 'payroll.policy.max_deduction_pct_of_gross',
  minNetGuarantee: 'payroll.policy.min_net_guarantee', netFloorPct: 'payroll.policy.net_floor_pct',
  carryOverExcess: 'payroll.policy.carry_over_excess', skipAttendance: 'payroll.policy.skip_attendance',
  lateDeductionEnabled: 'payroll.late_deduction_enabled', currency: 'system.currency',
} as const satisfies Record<keyof PayrollPolicySettings, string>

export const PAYROLL_POLICY_SETTING_FIELDS = Object.keys(PAYROLL_POLICY_CONFIG_KEYS) as Array<keyof PayrollPolicySettings>
const nullableFields = new Set<keyof PayrollPolicySettings>(['cycleEndDay', 'maxDeductionPctOfGross', 'minNetGuarantee', 'netFloorPct'])
export const PAYROLL_POLICY_NULLABLE_CONFIG_KEYS = new Set<string>([...nullableFields].map(field => PAYROLL_POLICY_CONFIG_KEYS[field]))

// افتراضات الإنشاء فقط؛ لا تقرأها النسخ التاريخية ولا تستخدم لتعويض حقولها الناقصة.
export const PAYROLL_POLICY_DEFAULT_CONFIG_SEED: Array<{ key: string; value: string }> = [
  { key: PAYROLL_POLICY_CONFIG_KEYS.defaultPeriodType, value: 'CUSTOM_DAY_RANGE' },
  { key: PAYROLL_POLICY_CONFIG_KEYS.cycleEndMode, value: 'DERIVED' },
  { key: PAYROLL_POLICY_CONFIG_KEYS.cycleEndDay, value: 'null' },
  { key: PAYROLL_POLICY_CONFIG_KEYS.baseDaysBasis, value: 'FIXED_30' },
  { key: PAYROLL_POLICY_CONFIG_KEYS.rateBase, value: 'GROSS' },
  { key: PAYROLL_POLICY_CONFIG_KEYS.roundingMode, value: 'DOWN' },
  { key: PAYROLL_POLICY_CONFIG_KEYS.roundingScale, value: '2' },
  { key: PAYROLL_POLICY_CONFIG_KEYS.divisionByZeroMode, value: 'ZERO_WITH_WARNING' },
  { key: PAYROLL_POLICY_CONFIG_KEYS.maxDeductionPctOfGross, value: 'null' },
  { key: PAYROLL_POLICY_CONFIG_KEYS.minNetGuarantee, value: 'null' },
  { key: PAYROLL_POLICY_CONFIG_KEYS.netFloorPct, value: 'null' },
  { key: PAYROLL_POLICY_CONFIG_KEYS.carryOverExcess, value: 'false' },
  { key: PAYROLL_POLICY_CONFIG_KEYS.skipAttendance, value: 'false' },
]

const enumValues: Partial<Record<keyof PayrollPolicySettings, readonly string[]>> = {
  defaultPeriodType: PAYROLL_POLICY_PERIOD_TYPES, cycleEndMode: PAYROLL_POLICY_END_MODES, baseDaysBasis: ['FIXED_30'],
  rateBase: PAYROLL_POLICY_RATE_BASES, roundingMode: PAYROLL_POLICY_ROUNDING_MODES,
  divisionByZeroMode: PAYROLL_POLICY_DIVISION_MODES, currency: PAYROLL_POLICY_CURRENCIES,
}
const booleanFields = new Set<keyof PayrollPolicySettings>(['carryOverExcess', 'skipAttendance', 'lateDeductionEnabled'])
const numberRules: Partial<Record<keyof PayrollPolicySettings, { min: number; max: number; scale: number }>> = {
  cycleStartDay: { min: 1, max: 31, scale: 0 }, cycleEndDay: { min: 1, max: 31, scale: 0 },
  monthlyDays: { min: 30, max: 30, scale: 2 }, dailyHours: { min: 0.01, max: 24, scale: 2 },
  roundingScale: { min: 0, max: 6, scale: 0 }, maxDeductionPctOfGross: { min: 0, max: 100, scale: 4 },
  minNetGuarantee: { min: 0, max: Number.MAX_SAFE_INTEGER / 100, scale: 2 }, netFloorPct: { min: 0, max: 100, scale: 4 },
}

function scaledUnits(text: string, scale: number): bigint | null {
  const match = /^(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(text)
  if (!match) return null
  const fraction = match[2] ?? '', shift = scale + Number(match[3] ?? 0) - fraction.length
  let units = BigInt(match[1] + fraction)
  if (shift >= 0) return units * (10n ** BigInt(shift))
  const divisor = 10n ** BigInt(-shift)
  if (units % divisor !== 0n) return null
  return units / divisor
}

function fieldError(field: keyof PayrollPolicySettings, value: unknown): string | undefined {
  if (value === null && nullableFields.has(field)) return
  const allowed = enumValues[field]
  if (allowed) return typeof value === 'string' && allowed.includes(value) ? undefined : `${field}: اختر قيمة من ${allowed.join(', ')}`
  if (booleanFields.has(field)) return typeof value === 'boolean' ? undefined : `${field}: يجب أن تكون القيمة true أو false`
  const rule = numberRules[field]!
  if (typeof value !== 'number' || !Number.isFinite(value) || value < rule.min || value > rule.max) {
    return `${field}: رقم مطلوب بين ${rule.min} و${rule.max}`
  }
  const units = scaledUnits(String(value), rule.scale)
  if (units === null) return `${field}: الحد الأقصى للمنازل العشرية ${rule.scale} دون تقريب تلقائي`
  // هذا حد تمثيل تقني للسنتات في JavaScript، وليس سقفًا تجاريًا للصافي.
  if (field === 'minNetGuarantee' && (units > BigInt(Number.MAX_SAFE_INTEGER) || scaledUnits(value.toFixed(2), 2) !== units)) {
    return `${field}: المبلغ يتجاوز دقة تمثيل السنتات الآمنة`
  }
}

function combinationError(settings: Record<string, unknown>): string | undefined {
  if (settings.defaultPeriodType !== 'CUSTOM_DAY_RANGE' && (settings.cycleStartDay !== 1 || settings.cycleEndMode !== 'DERIVED' || settings.cycleEndDay !== null)) {
    return 'الشهر التقويمي ونصف الشهر يتطلبان بداية 1 ونهاية DERIVED دون يوم نهاية ثابت؛ حدود نصف الشهر يحددها محرك الفترات لاحقًا'
  }
  if (settings.cycleEndMode === 'DERIVED' && settings.cycleEndDay !== null) return 'النهاية DERIVED لا تقبل cycleEndDay'
  if (settings.cycleEndMode === 'FIXED_DAY' && settings.cycleEndDay === null) return `النهاية FIXED_DAY تتطلب cycleEndDay = ${settings.cycleStartDay === 1 ? 31 : Number(settings.cycleStartDay) - 1} (اليوم السابق لبداية الدورة)`
  // الخطوة 14/15: الفترات متجاورة بلا فجوة ولا تداخل؛ يوم النهاية الثابت يجب أن يطابق ما تشتقه المسيرات فعليًا (payroll-period.ts).
  const cycleIssue = payrollCycleSettingsIssue(settings as unknown as PayrollCycleSettings)
  if (cycleIssue) return `cycleEndDay: ${cycleIssue}`
}

export function payrollPolicySettingsSnapshot(source: Partial<Record<keyof PayrollPolicySettings, unknown>>) {
  return Object.fromEntries(PAYROLL_POLICY_SETTING_FIELDS.map(field => [field, source[field] ?? null])) as { [K in keyof PayrollPolicySettings]: PayrollPolicySettings[K] | null }
}

export function inspectPayrollPolicySettings(source: Partial<Record<keyof PayrollPolicySettings, unknown>>) {
  const settings = payrollPolicySettingsSnapshot(source), settingsIssues: string[] = []
  let missing = false, invalid = false
  for (const field of PAYROLL_POLICY_SETTING_FIELDS) {
    if (settings[field] === null && !nullableFields.has(field)) {
      missing = true; settingsIssues.push(`${field}: إعداد تاريخي غير محدد`)
    } else {
      const error = fieldError(field, settings[field])
      if (error) { invalid = true; settingsIssues.push(error) }
    }
  }
  if (!missing && !invalid) {
    const error = combinationError(settings)
    if (error) { invalid = true; settingsIssues.push(error) }
  }
  return { settings, settingsStatus: invalid ? 'INVALID' as const : missing ? 'MISSING' as const : 'COMPLETE' as const, settingsIssues }
}

export function validatePayrollPolicySettings(input: Partial<Record<keyof PayrollPolicySettings, unknown>>): PayrollPolicySettings {
  const result = inspectPayrollPolicySettings(input)
  if (result.settingsStatus !== 'COMPLETE') throw new BadRequestException({ code: 'POLICY_SETTINGS_INVALID', message: 'إعدادات نسخة السياسة غير صالحة', issues: result.settingsIssues })
  return result.settings as PayrollPolicySettings
}

export function patchPayrollPolicySettings(stored: Partial<Record<keyof PayrollPolicySettings, unknown>>, patch: Partial<PayrollPolicySettings> | undefined) {
  const snapshot = payrollPolicySettingsSnapshot(stored)
  if (patch === undefined) return snapshot
  if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) throw new BadRequestException('settings يجب أن تكون كائن إعدادات')
  if (inspectPayrollPolicySettings(stored).settingsStatus !== 'COMPLETE' && PAYROLL_POLICY_SETTING_FIELDS.some(field => !Object.prototype.hasOwnProperty.call(patch, field))) {
    throw new BadRequestException({ code: 'POLICY_SETTINGS_FULL_REQUIRED', message: 'إصلاح إعدادات نسخة تاريخية يتطلب إرسال الحقول الثمانية عشر صراحة، بما فيها القيم null المسموحة' })
  }
  return validatePayrollPolicySettings({ ...snapshot, ...patch })
}

export function parsePayrollPolicyConfigValue(field: keyof PayrollPolicySettings, text: unknown): PayrollPolicySettings[keyof PayrollPolicySettings] {
  if (typeof text !== 'string') throw new BadRequestException(`إعداد الإنشاء ${PAYROLL_POLICY_CONFIG_KEYS[field]} غير موجود`)
  let value: unknown = text
  if (text === 'null' && nullableFields.has(field)) value = null
  else if (booleanFields.has(field)) value = text === 'true' ? true : text === 'false' ? false : text
  else if (numberRules[field]) {
    // لا تُحوّل النص الفارغ أو الكسور الزائدة إلى صفر أو إلى قيمة مقربة.
    if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(text)) throw new BadRequestException(`${PAYROLL_POLICY_CONFIG_KEYS[field]}: صيغة رقم عشري غير صالحة`)
    value = Number(text)
    const scale = numberRules[field]!.scale
    if (scaledUnits(text, scale) === null || (Number.isFinite(value as number) && scaledUnits(String(value), scale) !== scaledUnits(text, scale))) {
      throw new BadRequestException(`${PAYROLL_POLICY_CONFIG_KEYS[field]}: دقة عشرية غير صالحة أو فقد في تمثيل القيمة`)
    }
  }
  const error = fieldError(field, value)
  if (error) throw new BadRequestException(error)
  return value as PayrollPolicySettings[keyof PayrollPolicySettings]
}

const CYCLE_CONFIG_FIELDS = ['defaultPeriodType', 'cycleStartDay', 'cycleEndMode', 'cycleEndDay'] as const
export const PAYROLL_POLICY_CYCLE_CONFIG_KEYS: string[] = CYCLE_CONFIG_FIELDS.map(field => PAYROLL_POLICY_CONFIG_KEYS[field])

/**
 * الخطوة 15: افتراضات دورة النسخ الجديدة تُقبل مجتمعة؛ يوم النهاية الثابت يجب أن يبقى اليوم السابق للبداية بعد أي تعديل.
 * لا يقيّد payroll.cycle_start_day ما دامت النهاية مشتقة (يستخدمه المسير الحالي أيضًا).
 */
export function payrollPolicyCycleConfigError(key: string, value: string, current: Map<string, string>): string | undefined {
  if (!PAYROLL_POLICY_CYCLE_CONFIG_KEYS.includes(key)) return
  const values = new Map(current); values.set(key, value)
  let cycle: PayrollCycleSettings
  try {
    cycle = Object.fromEntries(CYCLE_CONFIG_FIELDS.map(field => [field, parsePayrollPolicyConfigValue(field, values.get(PAYROLL_POLICY_CONFIG_KEYS[field]))])) as unknown as PayrollCycleSettings
  } catch { return }
  if (cycle.defaultPeriodType !== 'CUSTOM_DAY_RANGE' || cycle.cycleEndMode !== 'FIXED_DAY') return
  const issue = payrollCycleSettingsIssue(cycle)
  if (issue) return `${key}: ${issue}. اجعل ${PAYROLL_POLICY_CONFIG_KEYS.cycleEndMode} = DERIVED أو اضبط ${PAYROLL_POLICY_CONFIG_KEYS.cycleEndDay} أولًا`
}

export function validatePayrollPolicyDefaultConfig(key: string, value: string): string | undefined {
  if (!PAYROLL_POLICY_DEFAULT_CONFIG_SEED.some(row => row.key === key)) return
  const field = PAYROLL_POLICY_SETTING_FIELDS.find(candidate => PAYROLL_POLICY_CONFIG_KEYS[candidate] === key)!
  try { parsePayrollPolicyConfigValue(field, value) } catch (error) {
    return error instanceof Error ? error.message : 'إعداد السياسة غير صالح'
  }
}
