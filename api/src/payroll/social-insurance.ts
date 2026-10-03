// التأمينات الاجتماعية (إعداد أولي جاهز): نظامان — السعودية (GOSI) والمصرية.
// ملف حساب صرف بلا قاعدة بيانات: الإعدادات من requests_config، ونظام الفرع من branches.insuranceSystem،
// وبيانات الموظف (مسجل؟ الأجر التأميني، الجنسية). الفلوس بالقص على منزلتين (roundPayrollMoney).
import { nationalityKind } from '../employees/employee-required-fields'
import { roundPayrollMoney } from './payroll-money'
import { EG_INSURANCE_WAGE_LIMITS, SA_GOSI_NEW_TRACK, SA_GOSI_NEW_TRACK_FROM } from '../statutory/statutory-data'
import { statutoryAt, statutoryNumber, type StatutoryEntry } from '../statutory/statutory'

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
/** B1.5: أساس التأمينات السعودية من غير أجر تأمين مسجل = الأساسي + السكن (مفتوح) أو الأساسي بس (الافتراضي = زي ما كان) */
export const SAUDI_BASE_INCLUDES_HOUSING_KEY = 'social_insurance.saudi.base_includes_housing'
/** تاريخ آخر حفظ للإعدادات — فارغ = لسه على الافتراضي («راجعها»). */
export const SOCIAL_INSURANCE_REVIEWED_KEY = 'social_insurance.reviewed_at'
/** B1.5: آخر يوم اتغيّرت فيه حدود الأجر المصري من الشاشة (حفظ الشاشة من غير ما الحدود تتغير مابيلمسوش). المفتاح لسه ماتكتبش = آخر حفظ للشاشة */
export const SOCIAL_INSURANCE_EG_LIMITS_SINCE_KEY = 'social_insurance.egyptian.limits_changed_at'

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
/** B1.5: مسار التأمينات السعودي للسعودي — القديم (قبل 3 يوليو 2024 أو من غير تاريخ) أو الجديد */
export type SocialInsuranceTrack = 'OLD' | 'NEW'

/** B1.5: القيم المؤرخة السارية في آخر يوم في فترة المسير (قاعدة التاريخ الفعّال) — بتتجمّد في لقطة المسير مع النتيجة */
export interface SocialInsuranceRates {
  /** نسب وحدود المسار الجديد؛ null = مفيش قيم سارية (قبل ترحيل 080 أو قبل 3 يوليو 2024) = كل السعوديين على القديم */
  saudiNewTrack: { employeePct: number; employerPct: number; minSalary: number; maxSalary: number; effectiveFrom: string; verified: boolean } | null
  /** حدود الأجر المصري من الجدول لما يكون أحدث من آخر حفظ لشاشة التأمينات؛ null = حدود الشاشة */
  egyptianLimits: { minSalary: number; maxSalary: number; effectiveFrom: string; verified: boolean } | null
  baseIncludesHousing: boolean
}

/** B1.5: القيم السارية يوم date (آخر يوم في فترة المسير). حدود الأجر المصري: القرار الأحدث الساري يوم date بيكسب —
 *  قيمة الشاشة لو اتغيرت يوم date أو قبله ومن بداية صف الجدول الساري أو بعدها، وإلا صف الجدول (ولو مفيش صف = الشاشة زي ما كانت).
 *  فتغيير الشاشة مابيرجعش بأثر رجعي على فترة قبله، وصف السنة الجاية بيسري لوحده من أول يوم فيها */
export function socialInsuranceRatesAt(entries: readonly StatutoryEntry[], date: string, egyptianLimitsSince: string | null, baseIncludesHousing: boolean): SocialInsuranceRates {
  const track = statutoryAt(entries, 'SA', SA_GOSI_NEW_TRACK, date)
  const employeePct = statutoryNumber(track, 'employee_pct'), employerPct = statutoryNumber(track, 'employer_pct')
  const saMin = statutoryNumber(track, 'min_salary'), saMax = statutoryNumber(track, 'max_salary')
  const limits = statutoryAt(entries, 'EG', EG_INSURANCE_WAGE_LIMITS, date)
  const egMin = statutoryNumber(limits, 'min_salary'), egMax = statutoryNumber(limits, 'max_salary')
  const since = egyptianLimitsSince ? String(egyptianLimitsSince).slice(0, 10) : null
  const screenWins = !!since && since <= date && (!limits || limits.effectiveFrom <= since)
  return {
    saudiNewTrack: track && employeePct !== null && employerPct !== null && saMin !== null && saMax !== null
      ? { employeePct, employerPct, minSalary: saMin, maxSalary: saMax, effectiveFrom: track.effectiveFrom, verified: track.verified } : null,
    egyptianLimits: limits && !screenWins && egMin !== null && egMax !== null
      ? { minSalary: egMin, maxSalary: egMax, effectiveFrom: limits.effectiveFrom, verified: limits.verified } : null,
    baseIncludesHousing,
  }
}

/** B1.5: اللي بيظهر في الشاشة وبيتقارن بيه وقت الحفظ: حدود الأجر المصري السارية النهارده (من الجدول لو هو القرار الأحدث) */
export function socialInsuranceSettingsShown(settings: SocialInsuranceSettings, today: SocialInsuranceRates): SocialInsuranceSettings {
  return today.egyptianLimits ? { ...settings, egyptianMinSalary: today.egyptianLimits.minSalary, egyptianMaxSalary: today.egyptianLimits.maxSalary } : settings
}

/** B1.5: سعودي أول تسجيل له في التأمينات من 3 يوليو 2024 = المسار الجديد؛ الفاضي أو قبله = القديم */
export function saudiTrackOf(firstRegisteredAt: unknown): SocialInsuranceTrack {
  const date = typeof firstRegisteredAt === 'string' ? firstRegisteredAt.slice(0, 10) : firstRegisteredAt instanceof Date ? firstRegisteredAt.toISOString().slice(0, 10) : ''
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= SA_GOSI_NEW_TRACK_FROM ? 'NEW' : 'OLD'
}
export type SocialInsuranceSkipReason = 'NO_SYSTEM' | 'NOT_REGISTERED' | 'NO_SALARY'

export interface SocialInsuranceInput {
  system: unknown
  registered: boolean | null | undefined
  /** employees.gosiBaseSalary — الأجر التأميني المسجل */
  declaredSalary: number | string | null | undefined
  /** لو مفيش أجر تأميني مسجل: الراتب الأساسي للشهر */
  fallbackSalary?: number | string | null
  nationality: unknown
  /** B1.5: employees.gosiFirstRegisteredAt — تاريخ أول تسجيل في التأمينات (السعودي من 3 يوليو 2024 = المسار الجديد) */
  firstRegisteredAt?: string | Date | null
  /** B1.5: سكن الشهر — بيتضاف للأساسي في فروع السعودية لما أجر التأمين فاضي والإعداد مفتوح */
  housingSalary?: number | string | null
}

export interface SocialInsuranceResult {
  kind: typeof SOCIAL_INSURANCE_DEDUCTION_KIND
  label: string
  system: InsuranceSystem
  applies: boolean
  skipReason: SocialInsuranceSkipReason | null
  category: SocialInsuranceCategory | null
  salarySource: 'DECLARED' | 'BASIC' | 'BASIC_HOUSING' | null
  /** B1.5: مسار السعودي (OLD/NEW)؛ null لغير السعودي والمصري */
  track?: SocialInsuranceTrack | null
  /** B1.5: «ساري من» للقيم المؤرخة اللي اتطبقت (نسب المسار الجديد أو حدود الأجر المصري)؛ null = إعدادات الشاشة */
  ratesEffectiveFrom?: string | null
  ratesVerified?: boolean | null
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
export function computeSocialInsurance(input: SocialInsuranceInput, settings: SocialInsuranceSettings, rates?: SocialInsuranceRates | null): SocialInsuranceResult {
  const system = normalizeInsuranceSystem(input.system)
  const empty = (skipReason: SocialInsuranceSkipReason | null, category: SocialInsuranceCategory | null = null): SocialInsuranceResult => ({
    kind: SOCIAL_INSURANCE_DEDUCTION_KIND, label: SOCIAL_INSURANCE_LINE_LABEL, system, applies: false, skipReason, category, salarySource: null,
    baseSalary: 0, insuredSalary: 0, employeePct: 0, employerPct: 0, employeeShare: 0, employerShare: 0 })
  if (system === 'NONE') return empty('NO_SYSTEM')
  if (input.registered !== true) return empty('NOT_REGISTERED')
  const category: SocialInsuranceCategory = system === 'EGYPTIAN' ? 'EGYPTIAN' : nationalityKind(input.nationality) === 'SAUDI' ? 'SAUDI' : 'NON_SAUDI'
  const declared = positive(input.declaredSalary), fallback = positive(input.fallbackSalary)
  // B1.5: فروع السعودية من غير أجر تأمين مسجل: الأساسي + السكن لو الإعداد مفتوح (الافتراضي الأساسي بس زي ما كان)
  const housing = !declared && system === 'SAUDI' && rates?.baseIncludesHousing ? positive(input.housingSalary) : 0
  const baseSalary = roundPayrollMoney(declared || fallback + housing)
  if (baseSalary <= 0) return empty('NO_SALARY', category)
  const track: SocialInsuranceTrack | null = category === 'SAUDI' ? saudiTrackOf(input.firstRegisteredAt) : null
  const newTrack = track === 'NEW' ? rates?.saudiNewTrack ?? null : null
  const dated = category === 'EGYPTIAN' ? rates?.egyptianLimits ?? null : newTrack
  const [min, max] = dated ? [dated.minSalary, dated.maxSalary]
    : system === 'EGYPTIAN' ? [settings.egyptianMinSalary, settings.egyptianMaxSalary] : [settings.saudiMinSalary, settings.saudiMaxSalary]
  const insuredSalary = roundPayrollMoney(Math.min(Math.max(baseSalary, min), max > 0 ? Math.max(max, min) : Number.POSITIVE_INFINITY))
  const [employeePct, employerPct] = category === 'EGYPTIAN' ? [settings.egyptianEmployeePct, settings.egyptianEmployerPct]
    : newTrack ? [newTrack.employeePct, newTrack.employerPct]
    : category === 'SAUDI' ? [settings.saudiEmployeePct, settings.saudiEmployerPct] : [settings.nonSaudiEmployeePct, settings.nonSaudiEmployerPct]
  // قروش × نسبة مئوية بمنزلتين (أعداد صحيحة) ثم قص — بلا ضجيج الكسور الثنائية
  const share = (pct: number) => roundPayrollMoney(Math.round(insuredSalary * 100) * Math.round(pct * 100) / 1e6)
  return { kind: SOCIAL_INSURANCE_DEDUCTION_KIND, label: SOCIAL_INSURANCE_LINE_LABEL, system, applies: true, skipReason: null, category,
    salarySource: declared ? 'DECLARED' : housing ? 'BASIC_HOUSING' : 'BASIC', baseSalary, insuredSalary, employeePct, employerPct,
    employeeShare: share(employeePct), employerShare: share(employerPct),
    track, ratesEffectiveFrom: dated?.effectiveFrom ?? null, ratesVerified: dated ? dated.verified : null }
}
