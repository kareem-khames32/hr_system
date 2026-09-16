// التأمينات الاجتماعية (إعداد أولي جاهز): نظامان — السعودية (GOSI) والمصرية.
// ملف حساب صرف بلا قاعدة بيانات: الإعدادات من requests_config، ونظام الفرع من branches.insuranceSystem،
// وبيانات الموظف (مسجل؟ الأجر التأميني، الجنسية). الفلوس بالقص على منزلتين (roundPayrollMoney).
import { nationalityKind } from '../employees/employee-required-fields'
import { roundPayrollMoney } from './payroll-money'

/** مفتاح نوع الخصم على القسيمة — إعفاءات الخصومات تتخطاه (خصم نظامي). */
export const SOCIAL_INSURANCE_DEDUCTION_KIND = 'SOCIAL_INSURANCE' as const
export const SOCIAL_INSURANCE_LINE_LABEL = 'التأمينات الاجتماعية (حصة الموظف)'

export const INSURANCE_SYSTEMS = ['NONE', 'SAUDI', 'EGYPTIAN'] as const
export type InsuranceSystem = typeof INSURANCE_SYSTEMS[number]
export const INSURANCE_SYSTEM_LABELS: Record<InsuranceSystem, string> = { NONE: 'بدون تأمينات', SAUDI: 'التأمينات السعودية', EGYPTIAN: 'التأمينات المصرية' }

export function normalizeInsuranceSystem(value: unknown): InsuranceSystem {
  const text = String(value ?? '').trim().toUpperCase()
  return (INSURANCE_SYSTEMS as readonly string[]).includes(text) ? text as InsuranceSystem : 'NONE'
}

export interface SocialInsuranceSettings {
  saudiEmployeePct: number
  saudiEmployerPct: number
  nonSaudiEmployeePct: number
  nonSaudiEmployerPct: number
  saudiMinSalary: number
  saudiMaxSalary: number
  egyptianEmployeePct: number
  egyptianEmployerPct: number
  egyptianMinSalary: number
  egyptianMaxSalary: number
}
export type SocialInsuranceSettingField = keyof SocialInsuranceSettings

/** القيم الافتراضية — «راجعها» قبل أول مسير (نسب وحدود 2026 التقريبية). */
export const SOCIAL_INSURANCE_DEFAULTS: SocialInsuranceSettings = {
  saudiEmployeePct: 9.75, saudiEmployerPct: 11.75, nonSaudiEmployeePct: 0, nonSaudiEmployerPct: 2, saudiMinSalary: 1500, saudiMaxSalary: 45000,
  egyptianEmployeePct: 11, egyptianEmployerPct: 18.75, egyptianMinSalary: 2700, egyptianMaxSalary: 16700,
}

export const SOCIAL_INSURANCE_CONFIG_KEYS: Record<SocialInsuranceSettingField, string> = {
  saudiEmployeePct: 'social_insurance.saudi.saudi_employee_pct',
  saudiEmployerPct: 'social_insurance.saudi.saudi_employer_pct',
  nonSaudiEmployeePct: 'social_insurance.saudi.non_saudi_employee_pct',
  nonSaudiEmployerPct: 'social_insurance.saudi.non_saudi_employer_pct',
  saudiMinSalary: 'social_insurance.saudi.min_salary',
  saudiMaxSalary: 'social_insurance.saudi.max_salary',
  egyptianEmployeePct: 'social_insurance.egyptian.employee_pct',
  egyptianEmployerPct: 'social_insurance.egyptian.employer_pct',
  egyptianMinSalary: 'social_insurance.egyptian.min_salary',
  egyptianMaxSalary: 'social_insurance.egyptian.max_salary',
}
/** تاريخ آخر حفظ للإعدادات — فارغ = لسه على الافتراضي («راجعها»). */
export const SOCIAL_INSURANCE_REVIEWED_KEY = 'social_insurance.reviewed_at'

const FIELDS = Object.keys(SOCIAL_INSURANCE_DEFAULTS) as SocialInsuranceSettingField[]
const isPct = (field: SocialInsuranceSettingField) => field.endsWith('Pct')

/** قراءة الإعدادات من قيم requests_config؛ القيمة الناقصة أو التالفة = الافتراضي. */
export function parseSocialInsuranceSettings(values: ReadonlyMap<string, string | null | undefined> | Record<string, string | null | undefined>): SocialInsuranceSettings {
  const read = (key: string) => values instanceof Map ? values.get(key) : (values as Record<string, string | null | undefined>)[key]
  const result = { ...SOCIAL_INSURANCE_DEFAULTS }
  for (const field of FIELDS) {
    const raw = read(SOCIAL_INSURANCE_CONFIG_KEYS[field])
    const number = raw === null || raw === undefined || String(raw).trim() === '' ? NaN : Number(raw)
    if (Number.isFinite(number) && number >= 0) result[field] = number
  }
  return result
}

/** مشكلة الإعدادات المرسلة للحفظ أو null. */
export function socialInsuranceSettingsIssue(settings: SocialInsuranceSettings): string | null {
  for (const field of FIELDS) {
    const value = settings[field]
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return 'كل النسب والحدود لازم تكون أرقام موجبة'
    if (isPct(field) && value > 100) return 'النسبة لازم تكون من 0 لـ 100'
    if (!/^\d+(\.\d{1,2})?$/.test(String(value))) return 'النسب والحدود بحد أقصى رقمين بعد العلامة'
  }
  if (settings.saudiMinSalary > settings.saudiMaxSalary) return 'في التأمينات السعودية: الحد الأدنى للأجر أكبر من الحد الأقصى'
  if (settings.egyptianMinSalary > settings.egyptianMaxSalary) return 'في التأمينات المصرية: الحد الأدنى للأجر أكبر من الحد الأقصى'
  return null
}

export type SocialInsuranceCategory = 'SAUDI' | 'NON_SAUDI' | 'EGYPTIAN'
export type SocialInsuranceSkipReason = 'NO_SYSTEM' | 'NOT_REGISTERED' | 'NO_SALARY'

export interface SocialInsuranceInput {
  system: unknown
  registered: boolean | null | undefined
  /** employees.gosiBaseSalary — الأجر التأميني المسجل */
  declaredSalary: number | string | null | undefined
  /** لو مفيش أجر تأميني مسجل: الراتب الأساسي للشهر */
  fallbackSalary?: number | string | null
  nationality: unknown
}

export interface SocialInsuranceResult {
  kind: typeof SOCIAL_INSURANCE_DEDUCTION_KIND
  label: string
  system: InsuranceSystem
  applies: boolean
  skipReason: SocialInsuranceSkipReason | null
  category: SocialInsuranceCategory | null
  salarySource: 'DECLARED' | 'BASIC' | null
  baseSalary: number
  insuredSalary: number
  employeePct: number
  employerPct: number
  employeeShare: number
  employerShare: number
}

const positive = (value: unknown) => {
  const number = Number(value)
  return value !== null && value !== undefined && value !== '' && Number.isFinite(number) && number > 0 ? number : 0
}

/** حصة الموظف وصاحب العمل لشهر واحد: الأجر التأميني بين الحد الأدنى والأقصى × النسبة، مقصوصة لمنزلتين. */
export function computeSocialInsurance(input: SocialInsuranceInput, settings: SocialInsuranceSettings): SocialInsuranceResult {
  const system = normalizeInsuranceSystem(input.system)
  const empty = (skipReason: SocialInsuranceSkipReason | null, category: SocialInsuranceCategory | null = null): SocialInsuranceResult => ({
    kind: SOCIAL_INSURANCE_DEDUCTION_KIND, label: SOCIAL_INSURANCE_LINE_LABEL, system, applies: false, skipReason, category, salarySource: null,
    baseSalary: 0, insuredSalary: 0, employeePct: 0, employerPct: 0, employeeShare: 0, employerShare: 0 })
  if (system === 'NONE') return empty('NO_SYSTEM')
  if (input.registered !== true) return empty('NOT_REGISTERED')
  const category: SocialInsuranceCategory = system === 'EGYPTIAN' ? 'EGYPTIAN' : nationalityKind(input.nationality) === 'SAUDI' ? 'SAUDI' : 'NON_SAUDI'
  const declared = positive(input.declaredSalary), fallback = positive(input.fallbackSalary)
  const baseSalary = roundPayrollMoney(declared || fallback)
  if (baseSalary <= 0) return empty('NO_SALARY', category)
  const [min, max] = system === 'EGYPTIAN' ? [settings.egyptianMinSalary, settings.egyptianMaxSalary] : [settings.saudiMinSalary, settings.saudiMaxSalary]
  const insuredSalary = roundPayrollMoney(Math.min(Math.max(baseSalary, min), max > 0 ? Math.max(max, min) : Number.POSITIVE_INFINITY))
  const [employeePct, employerPct] = category === 'EGYPTIAN' ? [settings.egyptianEmployeePct, settings.egyptianEmployerPct]
    : category === 'SAUDI' ? [settings.saudiEmployeePct, settings.saudiEmployerPct] : [settings.nonSaudiEmployeePct, settings.nonSaudiEmployerPct]
  // قروش × نسبة مئوية بمنزلتين (أعداد صحيحة) ثم قص — بلا ضجيج الكسور الثنائية
  const share = (pct: number) => roundPayrollMoney(Math.round(insuredSalary * 100) * Math.round(pct * 100) / 1e6)
  return { kind: SOCIAL_INSURANCE_DEDUCTION_KIND, label: SOCIAL_INSURANCE_LINE_LABEL, system, applies: true, skipReason: null, category,
    salarySource: declared ? 'DECLARED' : 'BASIC', baseSalary, insuredSalary, employeePct, employerPct,
    employeeShare: share(employeePct), employerShare: share(employerPct) }
}
