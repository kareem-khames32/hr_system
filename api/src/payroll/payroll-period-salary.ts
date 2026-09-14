import { MONTHLY_SALARY_COMPONENTS } from '../employees/compensation'
import type { SalaryHistoryRead, SalaryHistorySegment } from './payroll-salary-history'

export const PAYROLL_MONTHLY_SALARY_HISTORY_VERSION = 'SALARY_PAYROLL_PERIOD_HISTORY_V2_20260914' as const
export type MonthlySalaryPeriod = Omit<SalaryHistorySegment, 'effectiveFrom' | 'effectiveTo'> & {
  effectivePayrollPeriod: string; effectiveToPayrollPeriod: string | null
}
export type MonthlySalaryHistorySegment = MonthlySalaryPeriod & { effectiveFrom: string; effectiveTo: string | null }
export class PayrollPeriodSalaryError extends Error {
  constructor(readonly code: string, readonly state: 'MISSING' | 'INVALID', message: string) { super(message); this.name = 'PayrollPeriodSalaryError' }
}
const keys = MONTHLY_SALARY_COMPONENTS.map(row => row.key)
const fail = (code: string, message: string): never => { throw new PayrollPeriodSalaryError(code, 'INVALID', message) }

export function salaryPayrollPeriod(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value) || value.startsWith('0000-')) fail('SALARY_PAYROLL_PERIOD_INVALID', 'شهر سريان الراتب مطلوب بصيغة YYYY-MM صحيحة')
  return value as string
}
const lastDay = (year: number, month: number) => [31, year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
const formattedDate = (year: number, month: number, day: number) => `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(Math.min(day, lastDay(year, month))).padStart(2, '0')}`

/** هذه حدود تشغيل مشتقة للدورة؛ لا تُستخدم لاختيار راتب المسير ولا لإثبات تاريخ قرار يومي. */
export function salaryPayrollPeriodBounds(referencePeriod: string, cycleStartDay: number) {
  const period = salaryPayrollPeriod(referencePeriod)
  if (!Number.isInteger(cycleStartDay) || cycleStartDay < 1 || cycleStartDay > 31) fail('SALARY_PAYROLL_CYCLE_INVALID', 'يوم بداية دورة الرواتب غير صالح')
  const year = Number(period.slice(0, 4)), month = Number(period.slice(5, 7))
  if (cycleStartDay === 1) return { startDate: formattedDate(year, month, 1), endDate: formattedDate(year, month, lastDay(year, month)) }
  const previousYear = month === 1 ? year - 1 : year, previousMonth = month === 1 ? 12 : month - 1
  if (previousYear < 1) fail('SALARY_PAYROLL_CYCLE_INVALID', 'بداية الدورة تقع خارج نطاق التاريخ المدعوم')
  return { startDate: formattedDate(previousYear, previousMonth, cycleStartDay), endDate: formattedDate(year, month, cycleStartDay - 1) }
}

/** كل صف دليل شهري كامل؛ الفجوات مسموحة وتبقى ناقصة، والنهاية شاملة لشهرها. */
export function normalizeMonthlySalaryPeriods(input: unknown, cycleStartDay: number): MonthlySalaryHistorySegment[] {
  if (!Number.isInteger(cycleStartDay) || cycleStartDay < 1 || cycleStartDay > 31) fail('SALARY_PAYROLL_CYCLE_INVALID', 'يوم بداية دورة الرواتب غير صالح')
  if (!Array.isArray(input) || input.length < 1 || input.length > 120) fail('SALARY_PAYROLL_PERIOD_LIMIT', 'أدخل من فترة واحدة إلى 120 فترة راتب شهرية موثقة')
  const required = ['effectivePayrollPeriod', 'effectiveToPayrollPeriod', 'currency', ...keys]
  const rows = (input as unknown[]).map(value => {
    if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value)) || Object.keys(value).length !== required.length || required.some(key => !Object.prototype.hasOwnProperty.call(value, key))) fail('SALARY_PAYROLL_PERIOD_INVALID', 'حقول فترة الراتب الشهرية غير مكتملة أو تحتوي على حقول غير مسموحة')
    const row = value as Record<string, unknown>, effectivePayrollPeriod = salaryPayrollPeriod(row.effectivePayrollPeriod)
    const effectiveToPayrollPeriod = row.effectiveToPayrollPeriod === null ? null : salaryPayrollPeriod(row.effectiveToPayrollPeriod)
    if (effectiveToPayrollPeriod !== null && effectiveToPayrollPeriod < effectivePayrollPeriod) fail('SALARY_PAYROLL_PERIOD_INVALID', 'شهر نهاية الراتب يسبق شهر بدايته')
    if (row.currency !== 'EGP' && row.currency !== 'SAR') fail('SALARY_PAYROLL_PERIOD_INVALID', 'عملة فترة الراتب يجب أن تكون EGP أو SAR')
    const money = Object.fromEntries(keys.map(key => {
      const amount = row[key]
      if (typeof amount !== 'string' || amount.length > 80 || !/^\d+(?:\.\d{1,2})?$/.test(amount)) fail('SALARY_PAYROLL_PERIOD_INVALID', 'مكونات الراتب ستة مبالغ نصية غير سالبة بمنزلتين عشريتين على الأكثر')
      const [whole, fraction = ''] = (amount as string).split('.'), integral = whole.replace(/^0+(?=\d)/, '')
      if (integral.length > 16) fail('SALARY_PAYROLL_PERIOD_INVALID', 'مكوّن الراتب يتجاوز دقة DECIMAL(18,2) ولا يُقرب تلقائيًا')
      return [key, `${integral}.${fraction.padEnd(2, '0')}`]
    })) as Pick<SalaryHistorySegment, typeof keys[number]>
    return { ...money, currency: row.currency as 'EGP' | 'SAR', effectivePayrollPeriod, effectiveToPayrollPeriod,
      effectiveFrom: salaryPayrollPeriodBounds(effectivePayrollPeriod, cycleStartDay).startDate,
      effectiveTo: effectiveToPayrollPeriod === null ? null : salaryPayrollPeriodBounds(effectiveToPayrollPeriod, cycleStartDay).endDate }
  }).sort((left, right) => left.effectivePayrollPeriod.localeCompare(right.effectivePayrollPeriod))
  for (let index = 1; index < rows.length; index++) {
    if (rows[index - 1].effectiveToPayrollPeriod === null || rows[index - 1].effectiveToPayrollPeriod! >= rows[index].effectivePayrollPeriod) fail('SALARY_PAYROLL_PERIOD_INVALID', 'فترات الرواتب الشهرية متداخلة؛ الفترة المفتوحة يجب أن تكون الأخيرة')
  }
  return rows
}

/** اختيار واحد بالشهر المرجعي، مستقل تمامًا عن أيام الخدمة أو إعداد الدورة الحالي. */
export function selectPayrollPeriodSalary(history: SalaryHistoryRead, referencePeriod: string): {
  referencePeriod: string; segment: MonthlySalaryHistorySegment; sourceRef: string; sourceRefs: string[];
  versionId: number; historyRevision: number; historyContentHash: string
} {
  const period = salaryPayrollPeriod(referencePeriod)
  if (!history || typeof history !== 'object' || !Array.isArray(history.segments) || !Number.isInteger(history.revision) || history.revision < 0 || history.revision > 2147483647) fail('SALARY_PAYROLL_PERIOD_INVALID', 'هيكل مراجعة الراتب الشهري غير صالح')
  const version = history.version
  if (!version || version.contractVersion == null) throw new PayrollPeriodSalaryError('SALARY_PAYROLL_PERIOD_EVIDENCE_REQUIRED', 'MISSING', 'لم يُثبت راتب الموظف حسب الشهر المرجعي؛ التاريخ اليومي لا يثبت الاستحقاق الشهري')
  if (version.contractVersion !== PAYROLL_MONTHLY_SALARY_HISTORY_VERSION || !Number.isInteger(version.id) || version.id < 1 || version.id > 2147483647 || history.revision < 1 || version.revision !== history.revision || !/^[a-f0-9]{64}$/.test(version.contentHash)) fail('SALARY_PAYROLL_PERIOD_INVALID', 'عقد تاريخ الراتب الشهري أو مرجع المراجعة غير صالح')
  const periods = history.segments.map(({ effectiveFrom: _from, effectiveTo: _to, ...row }) => row)
  const normalized = normalizeMonthlySalaryPeriods(periods, version.cycleStartDay!)
  if (history.segments.some((row, index) => JSON.stringify(row) !== JSON.stringify({ ...row, ...normalized[index] }))) fail('SALARY_PAYROLL_PERIOD_INVALID', 'صفوف الراتب الشهري لا تطابق الحدود المشتقة أو ترتيب المصدر')
  const index = normalized.findIndex(row => row.effectivePayrollPeriod <= period && (row.effectiveToPayrollPeriod === null || row.effectiveToPayrollPeriod >= period))
  if (index < 0) throw new PayrollPeriodSalaryError('SALARY_PAYROLL_PERIOD_GAP', 'MISSING', 'الشهر المرجعي المطلوب بلا راتب شهري موثق؛ لا يُستخدم راتب حالي أو شهر مجاور بدلًا منه')
  const historyRef = `salary-history:${version.id}:revision:${history.revision}:${version.contentHash}`, sourceRef = `${historyRef}:period:${index + 1}`
  return { referencePeriod: period, segment: normalized[index], sourceRef, sourceRefs: [historyRef, sourceRef], versionId: version.id, historyRevision: history.revision, historyContentHash: version.contentHash }
}
