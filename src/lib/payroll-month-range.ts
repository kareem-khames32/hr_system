import { apiFetch } from './api'
import { formatDate, localDateStr, localToday } from './dates'

/**
 * فلاتر التاريخ في شاشات الحضور والرواتب: «من تاريخ» و«إلى تاريخ» باليوم،
 * والافتراضي «شهر الرواتب» (من يوم بداية الدورة لليوم اللي قبله في الشهر التالي، مثلًا 23 أغسطس – 22 سبتمبر).
 * نفس حساب الباك (api/src/payroll/payroll-period.ts): نهاية الشهر = يوم (البداية − 1) مقصوص على آخر الشهر،
 * والبداية = نهاية الشهر السابق + يوم.
 */
export interface DayRange { from: string; to: string }
export interface PayrollMonthRange extends DayRange { period: string }
export interface PayrollMonthContext extends PayrollMonthRange { cycleStartDay: number; today: string }

export const DAY_RANGE_MAX_DAYS = 366
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/

const leap = (year: number) => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
const lastDayOf = (year: number, month: number) => [31, leap(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
const iso = (year: number, month: number, day: number) => `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

export const isDayKey = (value: unknown): value is string => {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false
  const year = Number(value.slice(0, 4)), month = Number(value.slice(5, 7)), day = Number(value.slice(8, 10))
  return year >= 1900 && month >= 1 && month <= 12 && day >= 1 && day <= lastDayOf(year, month)
}

const validCycle = (cycleStartDay: number) => Number.isInteger(cycleStartDay) && cycleStartDay >= 1 && cycleStartDay <= 31

/** يوم نهاية دورة شهر معين (داخل الشهر نفسه). */
const cycleEndDay = (year: number, month: number, cycleStartDay: number) =>
  cycleStartDay === 1 ? lastDayOf(year, month) : Math.min(cycleStartDay - 1, lastDayOf(year, month))

export function shiftPeriod(period: string, months: number): string {
  const index = Number(period.slice(0, 4)) * 12 + Number(period.slice(5, 7)) - 1 + months
  const year = Math.floor(index / 12)
  return `${String(year).padStart(4, '0')}-${String(index - year * 12 + 1).padStart(2, '0')}`
}

/** حدود شهر رواتب بالاسم (راتب سبتمبر بدورة 23 = 2026-08-23 → 2026-09-22). */
export function payrollMonthBounds(period: string, cycleStartDay: number): PayrollMonthRange {
  if (!MONTH_RE.test(period) || !validCycle(cycleStartDay)) throw new Error('شهر الرواتب أو يوم بداية الدورة غير صالح')
  const year = Number(period.slice(0, 4)), month = Number(period.slice(5, 7))
  const to = iso(year, month, cycleEndDay(year, month, cycleStartDay))
  if (cycleStartDay === 1) return { period, from: iso(year, month, 1), to }
  const previousYear = month === 1 ? year - 1 : year, previousMonth = month === 1 ? 12 : month - 1
  const previousEnd = cycleEndDay(previousYear, previousMonth, cycleStartDay)
  const from = previousEnd === lastDayOf(previousYear, previousMonth) ? iso(year, month, 1) : iso(previousYear, previousMonth, previousEnd + 1)
  return { period, from, to }
}

/** شهر الرواتب اللي فيه يوم معين. */
export function payrollPeriodOfDate(date: string, cycleStartDay: number): string {
  if (!isDayKey(date) || !validCycle(cycleStartDay)) throw new Error('التاريخ أو يوم بداية الدورة غير صالح')
  const year = Number(date.slice(0, 4)), month = Number(date.slice(5, 7)), day = Number(date.slice(8, 10))
  const own = date.slice(0, 7)
  return day <= cycleEndDay(year, month, cycleStartDay) ? own : shiftPeriod(own, 1)
}

/** مدى شهر الرواتب اللي فيه اليوم ده (الافتراضي لكل الفلاتر). */
export const payrollMonthRangeOf = (date: string, cycleStartDay: number): PayrollMonthRange =>
  payrollMonthBounds(payrollPeriodOfDate(date, cycleStartDay), cycleStartDay)

/** شهر الرواتب السابق/التالي لمدى معروض (بيتحسب من «من تاريخ»). */
export const shiftPayrollMonthRange = (range: DayRange, cycleStartDay: number, months: number): PayrollMonthRange =>
  payrollMonthBounds(shiftPeriod(payrollPeriodOfDate(range.from, cycleStartDay), months), cycleStartDay)

/** لو المدى بالظبط شهر رواتب كامل يرجع اسمه (YYYY-MM)، وإلا null. */
export function payrollMonthOfRange(range: DayRange, cycleStartDay: number): string | null {
  if (!isDayKey(range.from) || !isDayKey(range.to) || !validCycle(cycleStartDay)) return null
  const bounds = payrollMonthRangeOf(range.from, cycleStartDay)
  return bounds.from === range.from && bounds.to === range.to ? bounds.period : null
}

export const isPeriodKey = (value: unknown): value is string => typeof value === 'string' && MONTH_RE.test(value)

/** اسم الشهر للعرض: «سبتمبر 2026». */
export const periodLabel = (period: string) => isPeriodKey(period) ? formatDate(`${period}-01`, { year: 'numeric', month: 'long' }) : period

/**
 * شهور الاختيار السريع حوالين الشهر الجاري (3 قدام و24 لورا)، والشهر المختار لو برّاهم — الأحدث الأول.
 * الأبعد من كده بأزرار السابق/التالي أو بكتابة التاريخ.
 */
export function payrollMonthOptions(anchor: string | null | undefined, selected?: string | null, back = 24, ahead = 3): string[] {
  const months = isPeriodKey(anchor) ? Array.from({ length: back + ahead + 1 }, (_, index) => shiftPeriod(anchor, ahead - index)) : []
  if (isPeriodKey(selected) && !months.includes(selected)) months.push(selected)
  return months.sort((a, b) => b.localeCompare(a))
}

export const dayRangeLength = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1

/** رسالة خطأ للمدى أو null لو سليم (maxDays = null: من غير حد أقصى للمدة). */
export function dayRangeError(range: DayRange, maxDays: number | null = DAY_RANGE_MAX_DAYS): string | null {
  if (!isDayKey(range.from) || !isDayKey(range.to)) return 'اختار «من تاريخ» و«إلى تاريخ»'
  if (range.to < range.from) return '«إلى تاريخ» لازم يكون بعد «من تاريخ» أو نفس اليوم'
  if (maxDays !== null && dayRangeLength(range.from, range.to) > maxDays) return `أقصى مدة للفلتر ${maxDays} يوم`
  return null
}

/** المدى لو سليم وإلا null — للاستعلام بس بعد ما الفلتر يكمل. */
export const validDayRange = (range: DayRange | null | undefined, maxDays: number | null = DAY_RANGE_MAX_DAYS): DayRange | null =>
  range && !dayRangeError(range, maxDays) ? range : null

/** تعديل طرف واحد مع الحفاظ على الترتيب: «من» بعد «إلى» يسحب «إلى» معاه والعكس. */
export function setRangeEdge(range: DayRange, edge: 'from' | 'to', value: string): DayRange {
  if (!isDayKey(value)) return range
  if (edge === 'from') return { from: value, to: value > range.to ? value : range.to }
  return { from: value < range.from ? value : range.from, to: value }
}

/** اليوم المحلي لقيمة تاريخ أو طابع زمني (createdAt) — YYYY-MM-DD كما هي، والطابع الزمني بتوقيت الجهاز. */
export function localDayOf(value: string | null | undefined): string {
  const text = String(value ?? '')
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? '' : localDateStr(date)
}

export const dateInRange = (date: string | null | undefined, range: DayRange) => {
  const day = String(date ?? '').slice(0, 10)
  return isDayKey(day) && day >= range.from && day <= range.to
}

/** فترة (من/إلى، النهاية المفتوحة = null) تتقاطع مع المدى. */
export const periodOverlapsRange = (from: string | null | undefined, to: string | null | undefined, range: DayRange) => {
  const start = String(from ?? '').slice(0, 10), end = to ? String(to).slice(0, 10) : null
  return (!start || start <= range.to) && (end === null || end >= range.from)
}

/** عنوان المدى للعرض: «23 أغسطس – 22 سبتمبر 2026». */
export function dayRangeLabel(range: DayRange): string {
  if (!isDayKey(range.from) || !isDayKey(range.to)) return ''
  if (range.from === range.to) return formatDate(range.from)
  const sameYear = range.from.slice(0, 4) === range.to.slice(0, 4)
  const start = formatDate(range.from, sameYear ? { month: 'long', day: 'numeric' } : { year: 'numeric', month: 'long', day: 'numeric' })
  return `${start} – ${formatDate(range.to)}`
}

/** اسم ملف/مفتاح قصير للمدى: 2026-08-23_2026-09-22. */
export const dayRangeKey = (range: DayRange) => `${range.from}_${range.to}`

/** query string للمدى: from=..&to=.. */
export const dayRangeQuery = (range: DayRange) => new URLSearchParams({ from: range.from, to: range.to }).toString()

let cached: Promise<PayrollMonthContext> | null = null

/** شهر الرواتب الجاري من السيرفر (يوم بداية الدورة من إعداد الشركة) — مرة واحدة للجلسة. */
export function fetchPayrollMonthContext(): Promise<PayrollMonthContext> {
  if (!cached) {
    cached = apiFetch<PayrollMonthContext>('/attendance/payroll-month').then(context => {
      if (!context || !validCycle(Number(context.cycleStartDay)) || !isDayKey(context.from) || !isDayKey(context.to)) throw new Error('رد شهر الرواتب غير صالح')
      return { ...context, cycleStartDay: Number(context.cycleStartDay) }
    }).catch(error => { cached = null; throw error })
  }
  return cached
}

/** بديل لو السيرفر مردّش: شهر تقويمي (دورة تبدأ يوم 1) عشان الشاشة تفضل شغالة. */
export const fallbackPayrollMonthContext = (today = localToday()): PayrollMonthContext =>
  ({ ...payrollMonthRangeOf(today, 1), cycleStartDay: 1, today })
