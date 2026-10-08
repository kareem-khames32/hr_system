import { statutoryAt, statutoryNumber, type StatutoryEntry } from '../statutory/statutory'

// B4.5 (ج): شرائح الإجازة السنوية بمدة الخدمة والسن — حساب نقي من غير قاعدة بيانات.
// الشرائح إعداد في نوع الإجازة السنوية (leave_types.entitlementTiers). فاضية (الافتراضي) = أيام النوع لكل الموظفين زي الأول بالحرف.
// الموظف بياخد أعلى شريحة منطبقة عليه (دولة فرعه، وسنين خدمته الكاملة، وسنّه)؛ ولو مفيش شريحة منطبقة بياخد أيام النوع.
// حزمة الدولة بتقترح الشرائح وأنواع الإجازات بس (statutoryAnnualTiers / statutoryLeaveTypes): المالك بيراجع ويحفظ بنفسه.

export type TierCountry = 'EG' | 'SA'
export interface EntitlementTier {
  /** null = كل الدول */
  country: TierCountry | null
  /** من كام سنة خدمة كاملة (null = من غير شرط خدمة) */
  minServiceYears: number | null
  /** من سن كام (null = من غير شرط سن) */
  minAge: number | null
  days: number
}
export interface EntitlementFacts { country: string | null | undefined; joinDate: string | null | undefined; birthDate: string | null | undefined }

export const ENTITLEMENT_TIERS_MAX = 20
const COUNTRIES: readonly string[] = ['EG', 'SA']
const blank = (value: unknown) => value === null || value === undefined || value === ''

/** الشرائح من الصفوف المُرسلة، أو رسالة الخطأ. قايمة فاضية = من غير شرائح */
export function checkEntitlementTiers(rows: unknown): { tiers: EntitlementTier[]; error: null } | { tiers: null; error: string } {
  const fail = (error: string) => ({ tiers: null, error })
  if (!Array.isArray(rows)) return fail('شرائح الإجازة السنوية قايمة صفوف')
  if (rows.length > ENTITLEMENT_TIERS_MAX) return fail(`شرائح الإجازة السنوية ${ENTITLEMENT_TIERS_MAX} صف بحد أقصى`)
  const tiers: EntitlementTier[] = [], seen = new Set<string>()
  for (let index = 0; index < rows.length; index++) {
    const row = (rows[index] ?? {}) as Record<string, unknown>, where = `الشريحة ${index + 1}`
    const country = blank(row.country) ? null : String(row.country).trim().toUpperCase()
    if (country !== null && !COUNTRIES.includes(country)) return fail(`${where}: الدولة مصر أو السعودية أو الكل`)
    const service = blank(row.minServiceYears) ? null : Number(row.minServiceYears)
    if (service !== null && (!Number.isInteger(service) || service < 0 || service > 60)) return fail(`${where}: سنين الخدمة رقم صحيح من 0 لـ 60`)
    const age = blank(row.minAge) ? null : Number(row.minAge)
    if (age !== null && (!Number.isInteger(age) || age < 15 || age > 80)) return fail(`${where}: السن رقم صحيح من 15 لـ 80`)
    const days = blank(row.days) ? NaN : Number(row.days)
    if (!Number.isFinite(days) || days < 0 || days > 365 || Math.round(days * 100) !== days * 100) return fail(`${where}: الأيام رقم من 0 لـ 365`)
    if (country === null && service === null && age === null) return fail(`${where}: لازم دولة أو سنين خدمة أو سن — الأيام من غير شرط مكانها «أيام السنة»`)
    const key = `${country ?? ''}|${service ?? ''}|${age ?? ''}`
    if (seen.has(key)) return fail(`${where}: مكررة بنفس الدولة والخدمة والسن`)
    seen.add(key)
    tiers.push({ country: country as TierCountry | null, minServiceYears: service, minAge: age, days })
  }
  return { tiers, error: null }
}

/** الشرائح المحفوظة (JSON). التالف أو الفاضي = من غير شرائح (أيام النوع) */
export function parseEntitlementTiers(raw: unknown): EntitlementTier[] {
  if (blank(raw)) return []
  try {
    const checked = checkEntitlementTiers(typeof raw === 'string' ? JSON.parse(raw) : raw)
    return checked.tiers ?? []
  } catch {
    return []
  }
}

/** سنين كاملة من تاريخ لتاريخ (YYYY-MM-DD)، أو null لو التاريخ ناقص أو بعد onDate */
export function fullYearsBetween(from: string | null | undefined, onDate: string): number | null {
  const start = String(from ?? '').slice(0, 10), end = String(onDate ?? '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end) return null
  const years = Number(end.slice(0, 4)) - Number(start.slice(0, 4))
  return end.slice(5) < start.slice(5) ? years - 1 : years
}

/** أيام السنوية للموظف يوم onDate: أعلى شريحة منطبقة، وإلا أيام النوع */
export function tieredAnnualDays(baseDays: number, tiers: readonly EntitlementTier[], facts: EntitlementFacts, onDate: string): number {
  if (!tiers.length) return baseDays
  const country = String(facts.country ?? '').trim().toUpperCase()
  const service = fullYearsBetween(facts.joinDate, onDate), age = fullYearsBetween(facts.birthDate, onDate)
  let best: number | null = null
  for (const tier of tiers) {
    if (tier.country !== null && tier.country !== country) continue
    if (tier.minServiceYears !== null && (service === null || service < tier.minServiceYears)) continue
    if (tier.minAge !== null && (age === null || age < tier.minAge)) continue
    if (best === null || tier.days > best) best = tier.days
  }
  return best ?? baseDays
}

export const EG_LEAVE_ANNUAL_KEY = 'eg.leave.annual'
export const SA_LEAVE_ANNUAL_KEY = 'sa.leave.annual'
export const EG_LEAVE_OTHER_KEY = 'eg.leave.other'
export const SA_LEAVE_OTHER_KEY = 'sa.leave.other'

/** اقتراح الشرائح من حزمة الدولة بتاريخ date — للمراجعة قبل الحفظ. unverified = فيه صف «محتاج تحقق» */
export function statutoryAnnualTiers(entries: readonly StatutoryEntry[], date: string): { tiers: EntitlementTier[]; unverified: boolean } {
  const tiers: EntitlementTier[] = []
  let unverified = false
  const add = (country: TierCountry, minServiceYears: number | null, minAge: number | null, days: number | null) => {
    if (days !== null) tiers.push({ country, minServiceYears, minAge, days })
  }
  const eg = statutoryAt(entries, 'EG', EG_LEAVE_ANNUAL_KEY, date)
  if (eg) {
    unverified = unverified || !eg.verified
    const senior = statutoryNumber(eg, 'senior_days'), seniorYears = statutoryNumber(eg, 'senior_service_years'), seniorAge = statutoryNumber(eg, 'senior_age')
    add('EG', null, null, statutoryNumber(eg, 'first_year_days'))
    add('EG', 1, null, statutoryNumber(eg, 'standard_days'))
    if (seniorYears !== null) add('EG', seniorYears, null, senior)
    if (seniorAge !== null) add('EG', null, seniorAge, senior)
  }
  const sa = statutoryAt(entries, 'SA', SA_LEAVE_ANNUAL_KEY, date)
  if (sa) {
    unverified = unverified || !sa.verified
    const seniorYears = statutoryNumber(sa, 'senior_service_years')
    add('SA', null, null, statutoryNumber(sa, 'standard_days'))
    if (seniorYears !== null) add('SA', seniorYears, null, statutoryNumber(sa, 'senior_days'))
  }
  return { tiers, unverified }
}

export interface StatutoryLeaveType {
  /** كود النوع العام المقابل (الكود الفعلي = الكود + الدولة + الفرع) */
  baseCode: string
  nameAr: string
  maxDays: number
  oncePerService: boolean
  maxTimesInService: number | null
  countingMode: 'ALL_DAYS' | 'WORKING_DAYS'
  note: string | null
}

/** أنواع إجازات دولة من الحزمة بتاريخ date (وضع، أبوة، حج، وللسعودية زواج ووفاة) — بتتعمل غير مفعّلة لفرع */
export function statutoryLeaveTypes(entries: readonly StatutoryEntry[], country: string | null | undefined, date: string): { types: StatutoryLeaveType[]; unverified: boolean } {
  const types: StatutoryLeaveType[] = []
  const add = (baseCode: string, nameAr: string, maxDays: number | null, extra: Partial<StatutoryLeaveType> = {}) => {
    if (maxDays !== null && maxDays > 0) types.push({ baseCode, nameAr, maxDays: Math.round(maxDays), oncePerService: false, maxTimesInService: null, countingMode: 'ALL_DAYS', note: null, ...extra })
  }
  const service = (years: number | null) => (years === null ? null : `القانون بيشترط ${years} سنين خدمة — بيتراجع يدوي`)
  if (country === 'EG') {
    const row = statutoryAt(entries, 'EG', EG_LEAVE_OTHER_KEY, date)
    if (!row) return { types, unverified: false }
    const months = statutoryNumber(row, 'hajj_months')
    add('MATERNITY', 'وضع (مصر)', statutoryNumber(row, 'maternity_days'), { maxTimesInService: statutoryNumber(row, 'maternity_times') })
    add('PATERNITY', 'أبوة (مصر)', statutoryNumber(row, 'paternity_days'), { maxTimesInService: statutoryNumber(row, 'paternity_times') })
    add('HAJJ', 'حج (مصر)', months === null ? null : months * 30, { oncePerService: true, note: service(statutoryNumber(row, 'hajj_min_service_years')) })
    return { types, unverified: !row.verified }
  }
  if (country === 'SA') {
    const row = statutoryAt(entries, 'SA', SA_LEAVE_OTHER_KEY, date)
    if (!row) return { types, unverified: false }
    const weeks = statutoryNumber(row, 'maternity_weeks')
    add('MATERNITY', 'وضع (السعودية)', weeks === null ? null : weeks * 7)
    add('PATERNITY', 'أبوة (السعودية)', statutoryNumber(row, 'paternity_days'), { countingMode: 'WORKING_DAYS' })
    add('MARRIAGE', 'زواج (السعودية)', statutoryNumber(row, 'marriage_days'))
    add('BEREAVEMENT', 'وفاة (السعودية)', statutoryNumber(row, 'bereavement_days'))
    add('BEREAVEMENT_SIBLING', 'وفاة أخ أو أخت (السعودية)', statutoryNumber(row, 'sibling_bereavement_days'))
    add('HAJJ', 'حج (السعودية)', statutoryNumber(row, 'hajj_max_days'), { oncePerService: true, note: service(statutoryNumber(row, 'hajj_min_service_years')) })
    return { types, unverified: !row.verified }
  }
  return { types, unverified: false }
}

/** كود نوع الحزمة لفرع: الكود العام + الدولة + الفرع (فريد لكل فرع) */
export const statutoryLeaveTypeCode = (baseCode: string, country: string, branchId: number) => `${baseCode}_${country}_B${branchId}`
