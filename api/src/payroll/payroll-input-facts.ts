import { MONTHLY_SALARY_COMPONENTS } from '../employees/compensation'
import { PayrollDecimal, PayrollDecimalError } from './payroll-decimal'
import { PAYROLL_POLICY_SETTING_FIELDS, PayrollPolicySettings, validatePayrollPolicySettings } from './payroll-policy-settings'
import { PayrollPeriodError, payrollPolicyPeriodBounds } from './payroll-period'
import type { PayrollInputFactsDto } from './payroll-input-facts.dto'

export const PAYROLL_INPUT_FACTS_VERSION = 'SRS_INPUT_FACTS_V2_20260914' as const
export const PAYROLL_INPUT_FACTS_LIMITS = Object.freeze({ periodDays: 32, salarySegments: 1, scheduledWorkDates: 32, sourceRefCharacters: 200, evaluationSteps: 20000 })
type SalaryKey = typeof MONTHLY_SALARY_COMPONENTS[number]['key']
type Salary<T> = { [K in SalaryKey]: T }
type DeepReadonly<T> = T extends (infer V)[] ? ReadonlyArray<DeepReadonly<V>> : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T
export interface PayrollInputFactDecimal { rawValue6: string; exact: { numerator: string; denominator: string } }
export interface PayrollInputFactAmounts {
  components: Salary<PayrollInputFactDecimal>; allowancesTotal: PayrollInputFactDecimal; grossSalary: PayrollInputFactDecimal
}
export interface PayrollInputFactsWarning { code: 'NO_SCHEDULED_WORK_DAYS'; message: string; path: string }
interface Facts {
  contractVersion: typeof PAYROLL_INPUT_FACTS_VERSION
  periodEntitlement: 'FULL_MONTHLY_CYCLE'
  salaryBasis: 'SINGLE_PAYROLL_PERIOD_SALARY'
  referencePeriod: string
  sourceValidation: 'CALLER_SUPPLIED_UNVERIFIED'
  normalizedInput: PayrollInputFactsDto
  settingsUsed: {
    defaultPeriodType: PayrollPolicySettings['defaultPeriodType']; cycleStartDay: number
    cycleEndMode: PayrollPolicySettings['cycleEndMode']; cycleEndDay: number | null
    monthlyDays: 30; dailyHours: string; rateBase: PayrollPolicySettings['rateBase']
  }
  coverage: {
    periodDays: number; coveredDays: number; fullCoverage: boolean; periodScheduledDays: number; coveredScheduledDays: number
    calendarCoverageFactor: PayrollInputFactDecimal; workingCoverageFactor: PayrollInputFactDecimal | null; earnedCalendar30Factor: PayrollInputFactDecimal
  }
  monthlyEquivalent: PayrollInputFactAmounts
  earnedCalendar30: PayrollInputFactAmounts
  rates: { monthlyRateBase: PayrollInputFactDecimal; dayRate: PayrollInputFactDecimal; hourRate: PayrollInputFactDecimal; minuteRate: PayrollInputFactDecimal }
  segments: Array<{
    from: string; to: string; sourceRef: string; segmentCalendarDays: number; segmentScheduledDays: number
    calendarWeight: PayrollInputFactDecimal; monthlyContribution: Salary<PayrollInputFactDecimal>
  }>
  warnings: PayrollInputFactsWarning[]
}
export type PayrollInputFacts = DeepReadonly<Facts>
export class PayrollInputFactsError extends Error {
  constructor(readonly code: string, message: string, readonly path: string) { super(message); this.name = 'PayrollInputFactsError' }
}
const salaryKeys = MONTHLY_SALARY_COMPONENTS.map(component => component.key)
const rootKeys = ['periodStart', 'periodEnd', 'hireDate', 'coverageStart', 'coverageEnd', 'coverageSourceRef', 'salarySegments', 'scheduledWorkDates', 'scheduleSourceRef']
const own = (object: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(object, key)
function fail(code: string, message: string, path: string): never { throw new PayrollInputFactsError(code, message, path) }
function shape(value: unknown, keys: readonly string[], path: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) fail('INPUT_FACTS_SHAPE_INVALID', 'كائن حقائق صريح مطلوب', path)
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) fail('INPUT_FACTS_SHAPE_INVALID', 'حقائق المدخلات تقبل كائنات JSON البسيطة فقط', path)
  const copy: Record<string, unknown> = {}
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !keys.includes(key)) fail('INPUT_FACTS_FIELD_UNKNOWN', 'حقل غير مسموح في حقائق المدخلات', path)
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!
    if (!own(descriptor, 'value')) fail('INPUT_FACTS_SHAPE_INVALID', 'حقائق المدخلات لا تقبل خصائص محسوبة', `${path}.${key}`)
    copy[key] = descriptor.value
  }
  for (const key of keys) if (!own(copy, key)) fail('INPUT_FACTS_FIELD_REQUIRED', `الحقل ${key} مطلوب صراحة`, `${path}.${key}`)
  return copy
}
function array(value: unknown, maximum: number, path: string): unknown[] {
  if (!Array.isArray(value) || value.length > maximum) fail('INPUT_FACTS_COLLECTION_LIMIT', `قائمة صريحة بحد أقصى${maximum}عنصرًا مطلوبة`, path)
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Array.prototype && prototype !== null) fail('INPUT_FACTS_SHAPE_INVALID', 'القائمة لا تقبل نموذجًا موروثًا مخصصًا', path)
  const result: unknown[] = []
  for (const key of Reflect.ownKeys(value)) if (key !== 'length' && (typeof key !== 'string' || !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length)) fail('INPUT_FACTS_SHAPE_INVALID', 'القائمة لا تقبل خصائص إضافية', path)
  for (let index = 0; index < value.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, index)
    if (!descriptor || !own(descriptor, 'value')) fail('INPUT_FACTS_SHAPE_INVALID', 'القائمة لا تقبل فراغات أو خصائص محسوبة', `${path}[${index}]`)
    result.push(descriptor.value)
  }
  return result
}
function date(value: unknown, path: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) fail('INPUT_FACTS_DATE_INVALID', 'تاريخ فعلي بصيغةYYYY-MM-DD مطلوب', path)
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) fail('INPUT_FACTS_DATE_INVALID', 'التاريخ غير موجود في التقويم', path)
  return value
}
function source(value: unknown, path: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > PAYROLL_INPUT_FACTS_LIMITS.sourceRefCharacters) fail('INPUT_FACTS_SOURCE_REQUIRED', 'مرجع مصدر غير فارغ بحد200محرف مطلوب صراحة', path)
  return value.trim()
}
const stamp = (value: string) => Date.parse(`${value}T00:00:00.000Z`)
const days = (from: string, to: string) => (stamp(to) - stamp(from)) / 86400000 + 1
function verifyMonthlyCycle(periodStart: string, periodEnd: string, policy: PayrollPolicySettings): void {
  // PR-08 + الخطوة 14/15: الشهر المرجعي هو شهر النهاية، والحدود هي ما تشتقه المسيرات نفسها (payroll-period.ts):
  // بداية الفترة = نهاية السابقة + يوم، فدورات 29/30/31 متجاورة بلا يوم مشترك ولا قص مستقل لكل طرف.
  let expected: { startDate: string; endDate: string }
  try { expected = payrollPolicyPeriodBounds(periodEnd.slice(0, 7), policy) } catch (error) {
    if (!(error instanceof PayrollPeriodError)) throw error
    fail('INPUT_FACTS_PERIOD_CYCLE_MISMATCH', error.code === 'PAYROLL_CYCLE_INVALID' ? error.message : 'حدود الدورة المطلوبة تقع خارج نطاق التاريخ المدعوم', 'periodStart')
  }
  if (periodStart !== expected.startDate || periodEnd !== expected.endDate) fail('INPUT_FACTS_PERIOD_CYCLE_MISMATCH', `الفترة لا تطابق دورة السياسة الشهرية؛ الفترة المطلوبة ${expected.startDate} إلى ${expected.endDate}`, 'periodStart')
}
function freeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child)
    Object.freeze(value)
  }
  return value
}

/** مرحلة صفر من أدلة صريحة؛ لا إسقاط لمتغيرات الكتالوج ولا استنتاج لتاريخ راتب مفقود. */
export function buildPayrollInputFacts(input: unknown, settings: PayrollPolicySettings): PayrollInputFacts {
  let remaining = PAYROLL_INPUT_FACTS_LIMITS.evaluationSteps, currentPath = 'facts'
  const spend = () => { if (--remaining < 0) fail('INPUT_FACTS_EVALUATION_LIMIT', 'تجاوز بناء الحقائق ميزانية التعقيد المسموح بها', currentPath) }
  try {
    const validatedSettings = shape(settings, PAYROLL_POLICY_SETTING_FIELDS, 'settings')
    let policy: PayrollPolicySettings
    try { policy = validatePayrollPolicySettings(validatedSettings) } catch (error) {
      fail('INPUT_FACTS_SETTINGS_INVALID', error instanceof Error ? error.message : 'إعدادات نسخة السياسة غير مكتملة', 'settings')
    }
    if (policy.defaultPeriodType === 'SEMI_MONTHLY') fail('INPUT_FACTS_PERIOD_UNSUPPORTED', 'استحقاق نصف الشهر لم يُعرّف بعد؛ هذه المعاينة لدورة شهرية كاملة', 'settings.defaultPeriodType')
    const raw = shape(input, rootKeys, 'facts')
    const periodStart = date(raw.periodStart, 'periodStart'), periodEnd = date(raw.periodEnd, 'periodEnd')
    const hireDate = date(raw.hireDate, 'hireDate')
    const coverageStart = date(raw.coverageStart, 'coverageStart'), coverageEnd = date(raw.coverageEnd, 'coverageEnd')
    const periodDays = days(periodStart, periodEnd)
    if (periodDays < 1) fail('INPUT_FACTS_PERIOD_INVALID', 'نهاية دورة الراتب يجب أن تأتي بعد بدايتها أو تساويها', 'periodEnd')
    if (periodDays > PAYROLL_INPUT_FACTS_LIMITS.periodDays) fail('INPUT_FACTS_PERIOD_UNSUPPORTED', 'هذه المعاينة تدعم دورة شهرية بحد أقصى32يومًا', 'periodEnd')
    verifyMonthlyCycle(periodStart, periodEnd, policy)
    if (coverageStart < periodStart || coverageEnd > periodEnd || coverageEnd < coverageStart || coverageStart < hireDate) fail('INPUT_FACTS_COVERAGE_INVALID', 'التغطية يجب أن تكون تقاطعًا غير فارغ داخل الفترة وبعد التعيين', 'coverageStart')
    const coverageSourceRef = source(raw.coverageSourceRef, 'coverageSourceRef'), scheduleSourceRef = source(raw.scheduleSourceRef, 'scheduleSourceRef')
    const scheduled = array(raw.scheduledWorkDates, PAYROLL_INPUT_FACTS_LIMITS.scheduledWorkDates, 'scheduledWorkDates').map((value, index) => date(value, `scheduledWorkDates[${index}]`))
    const seenDates = new Set<string>()
    for (const scheduledDate of scheduled) {
      if (scheduledDate < periodStart || scheduledDate > periodEnd || seenDates.has(scheduledDate)) fail('INPUT_FACTS_SCHEDULE_INVALID', 'أيام الجدول لا تتكرر وتبقى داخل فترة المسير الكاملة', 'scheduledWorkDates')
      seenDates.add(scheduledDate)
    }
    scheduled.sort()
    const decimal = (value: string | number) => PayrollDecimal.from(value, spend)
    const zero = decimal('0'), one = decimal('1'), thirty = decimal('30')
    const salary = (value: unknown, path: string): Salary<string> => {
      const components = shape(value, salaryKeys, path), normalized = {} as Salary<string>
      for (const key of salaryKeys) {
        currentPath = `${path}.${key}`
        const candidate = components[key]
        if (typeof candidate !== 'string' || !/^\d+(?:\.\d+)?$/.test(candidate)) fail('INPUT_FACTS_SALARY_INVALID', 'كل مكوّن راتب نص عشري غير سالب وصريح', currentPath)
        const canonical = decimal(candidate).canonical(), [whole, fraction = ''] = canonical.split('.')
        if (whole.length > 16 || fraction.length > 2) fail('INPUT_FACTS_SALARY_PRECISION', 'مكوّن الراتب يتجاوزDECIMAL(18,2) ولا يُقرب تلقائيًا', currentPath)
        normalized[key] = canonical
      }
      return normalized
    }
    // قرار المالك: راتب واحد لشهر المسير كله؛ اسم الحقل القديم باقٍ للتوافق فقط.
    if (Array.isArray(raw.salarySegments) && raw.salarySegments.length !== 1) fail('INPUT_FACTS_MONTHLY_SALARY_REQUIRED', 'اختر قيمة راتب واحدة لشهر المسير كله؛ لا يقسم الراتب بين أيام بقيمة قديمة وأيام بقيمة جديدة', 'salarySegments')
    const salarySegments = array(raw.salarySegments, PAYROLL_INPUT_FACTS_LIMITS.salarySegments, 'salarySegments').map((value, index) => {
      const path = `salarySegments[${index}]`, segment = shape(value, ['from', 'to', 'sourceRef', 'salary'], path)
      const from = date(segment.from, `${path}.from`), to = date(segment.to, `${path}.to`)
      if (from < coverageStart || to > coverageEnd || to < from) fail('INPUT_FACTS_SEGMENT_RANGE', 'فترة الراتب مرتبة ومحصورة في أيام التغطية الفعلية', path)
      return { from, to, sourceRef: source(segment.sourceRef, `${path}.sourceRef`), salary: salary(segment.salary, `${path}.salary`) }
    })
    currentPath = 'salarySegments'
    if (salarySegments[0].from !== coverageStart || salarySegments[0].to !== coverageEnd) fail('INPUT_FACTS_SEGMENT_COVERAGE', 'دليل راتب الشهر الواحد يجب أن يغطي أول وآخر يوم خدمة في الفترة', currentPath)
    const coveredDays = days(coverageStart, coverageEnd), fullCoverage = coverageStart === periodStart && coverageEnd === periodEnd
    const coveredScheduledDays = scheduled.filter(value => value >= coverageStart && value <= coverageEnd).length
    const calendarCoverageFactor = decimal(String(coveredDays)).divide(decimal(String(periodDays)))
    const calendar30 = decimal(String(coveredDays)).divide(thirty)
    const earnedCalendar30Factor = fullCoverage || calendar30.compare(one) > 0 ? one : calendar30
    const workingCoverageFactor = scheduled.length ? decimal(String(coveredScheduledDays)).divide(decimal(String(scheduled.length))) : null
    const fact = (value: PayrollDecimal): PayrollInputFactDecimal => ({ rawValue6: value.format(6, 'HALF_UP'), exact: { numerator: value.numerator.toString(), denominator: value.denominator.toString() } })
    const monthly = Object.fromEntries(salaryKeys.map(key => [key, decimal(salarySegments[0].salary[key])])) as Salary<PayrollDecimal>
    const segments = salarySegments.map(segment => {
      currentPath = `salarySegments.${segment.from}`
      const segmentCalendarDays = days(segment.from, segment.to)
      const segmentScheduledDays = scheduled.filter(value => value >= segment.from && value <= segment.to).length
      const contribution = {} as Salary<PayrollInputFactDecimal>
      for (const key of salaryKeys) {
        contribution[key] = fact(monthly[key])
      }
      return { from: segment.from, to: segment.to, sourceRef: segment.sourceRef, segmentCalendarDays, segmentScheduledDays,
        calendarWeight: fact(one), monthlyContribution: contribution }
    })
    const totalAllowances = (components: Salary<PayrollDecimal>) => salaryKeys.filter(key => key !== 'basicSalary').reduce((sum, key) => sum.add(components[key]), zero)
    const amounts = (components: Salary<PayrollDecimal>): PayrollInputFactAmounts => {
      const allowancesTotal = totalAllowances(components)
      return { components: Object.fromEntries(salaryKeys.map(key => [key, fact(components[key])])) as Salary<PayrollInputFactDecimal>,
        allowancesTotal: fact(allowancesTotal), grossSalary: fact(components.basicSalary.add(allowancesTotal)) }
    }
    currentPath = 'earnedCalendar30'
    // راتب الشهر ثابت؛ تناسب أيام الخدمة يطبّق مرة واحدة على المستحق ولا يخفض سعر اليوم.
    const earned = Object.fromEntries(salaryKeys.map(key => [key, monthly[key].multiply(earnedCalendar30Factor)])) as Salary<PayrollDecimal>
    currentPath = 'rates'
    const monthlyRateBase = policy.rateBase === 'BASIC' ? monthly.basicSalary : monthly.basicSalary.add(totalAllowances(monthly))
    const dailyHours = decimal(String(policy.dailyHours)), dayRate = monthlyRateBase.divide(thirty), hourRate = dayRate.divide(dailyHours), minuteRate = hourRate.divide(decimal('60'))
    const warnings: PayrollInputFactsWarning[] = scheduled.length ? [] : [{ code: 'NO_SCHEDULED_WORK_DAYS', message: 'لا أيام عمل في الجدول المقدم للفترة؛ نسبة أيام العمل غير متاحة ولم يُفترض مقام بديل', path: 'scheduledWorkDates' }]
    const normalizedInput: PayrollInputFactsDto = { periodStart, periodEnd, hireDate, coverageStart, coverageEnd, coverageSourceRef, salarySegments,
      scheduledWorkDates: scheduled, scheduleSourceRef }
    return freeze({ contractVersion: PAYROLL_INPUT_FACTS_VERSION, periodEntitlement: 'FULL_MONTHLY_CYCLE', salaryBasis: 'SINGLE_PAYROLL_PERIOD_SALARY',
      referencePeriod: periodEnd.slice(0, 7), sourceValidation: 'CALLER_SUPPLIED_UNVERIFIED',
      normalizedInput, settingsUsed: { defaultPeriodType: policy.defaultPeriodType, cycleStartDay: policy.cycleStartDay,
        cycleEndMode: policy.cycleEndMode, cycleEndDay: policy.cycleEndDay, monthlyDays: 30, dailyHours: dailyHours.canonical(), rateBase: policy.rateBase },
      coverage: { periodDays, coveredDays, fullCoverage, periodScheduledDays: scheduled.length, coveredScheduledDays,
        calendarCoverageFactor: fact(calendarCoverageFactor), workingCoverageFactor: workingCoverageFactor ? fact(workingCoverageFactor) : null, earnedCalendar30Factor: fact(earnedCalendar30Factor) },
      monthlyEquivalent: amounts(monthly), earnedCalendar30: amounts(earned), rates: { monthlyRateBase: fact(monthlyRateBase), dayRate: fact(dayRate), hourRate: fact(hourRate), minuteRate: fact(minuteRate) },
      segments, warnings } as Facts)
  } catch (error) {
    if (error instanceof PayrollDecimalError) throw new PayrollInputFactsError(error.code, error.message, currentPath)
    throw error
  }
}
