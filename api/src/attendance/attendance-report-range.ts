import { BadRequestException } from '@nestjs/common'
import { payrollPeriodBounds, payrollPeriodOfDate } from '../payroll/payroll-period'

/**
 * فلاتر التواريخ في شاشات الحضور وتقاريرها: «من تاريخ» و«إلى تاريخ» باليوم.
 * الشهر (YYYY-MM) لسه مقبول للتوافق مع الشاشات القديمة، والافتراضي في الشاشات شهر الرواتب
 * (من يوم بداية الدورة payroll.cycle_start_day لليوم اللي قبله في الشهر التالي، مثلًا 23 → 22).
 */
export const REPORT_RANGE_MAX_DAYS = 366
export const DEFAULT_CYCLE_START_DAY = 23

export interface ReportDayRange { month: string | null; from: string; to: string }
export interface PayrollMonthContext { cycleStartDay: number; today: string; period: string; from: string; to: string }

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/

const realDate = (value: string) => {
  if (!DATE_RE.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return y >= 1900 && date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

export const dayRangeLength = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1

/** مدى أيام صريح (الطرفان شاملان) — يرمي 400 برسالة واضحة. */
export function assertDayRange(from: string, to: string): { from: string; to: string } {
  if (!realDate(from) || !realDate(to)) throw new BadRequestException('«من تاريخ» و«إلى تاريخ» بصيغة YYYY-MM-DD')
  if (to < from) throw new BadRequestException('«إلى تاريخ» لازم يكون بعد «من تاريخ» أو نفس اليوم')
  if (dayRangeLength(from, to) > REPORT_RANGE_MAX_DAYS) throw new BadRequestException(`أقصى مدة للفلتر ${REPORT_RANGE_MAX_DAYS} يوم`)
  return { from, to }
}

/** شهر تقويمي YYYY-MM → أول وآخر يوم (التوافق مع ?month=). */
export function calendarMonthRange(month: string): { from: string; to: string } {
  if (!MONTH_RE.test(month ?? '')) throw new BadRequestException('الشهر بصيغة YYYY-MM')
  const [y, m] = month.split('-').map(Number)
  return { from: `${month}-01`, to: `${month}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}` }
}

/**
 * فلتر تقرير: from/to (الاتنين مع بعض) لهم الأولوية، وإلا month، وإلا null (المستدعي يختار الافتراضي).
 */
export function reportDayRange(q: { month?: string | null; from?: string | null; to?: string | null }): ReportDayRange | null {
  const from = typeof q.from === 'string' ? q.from.trim() : '', to = typeof q.to === 'string' ? q.to.trim() : ''
  if (from || to) {
    if (!from || !to) throw new BadRequestException('حدد «من تاريخ» و«إلى تاريخ» مع بعض')
    const range = assertDayRange(from, to)
    return { month: null, ...range }
  }
  const month = typeof q.month === 'string' ? q.month.trim() : ''
  if (month) return { month, ...calendarMonthRange(month) }
  return null
}

/** يوم بداية الدورة من الإعداد (نص) — القيمة الفاسدة ترجع للافتراضي بدل ما تكسر شاشة الحضور. */
export function cycleStartDayOf(value: string | null | undefined): number {
  const day = Number(value)
  return Number.isInteger(day) && day >= 1 && day <= 31 ? day : DEFAULT_CYCLE_START_DAY
}

/** شهر الرواتب اللي فيه يوم معين (الافتراضي النهارده) بحدوده الدقيقة — نفس دالة المسير. */
export function payrollMonthContext(cycleStartDay: number, today: string, date?: string | null): PayrollMonthContext {
  const anchor = date ? date : today
  if (!realDate(anchor)) throw new BadRequestException('التاريخ بصيغة YYYY-MM-DD')
  const period = payrollPeriodOfDate(anchor, cycleStartDay)
  const bounds = payrollPeriodBounds(period, cycleStartDay)
  return { cycleStartDay, today, period, from: bounds.startDate, to: bounds.endDate }
}

/** حدود شهر رواتب بالاسم (YYYY-MM). */
export function payrollMonthContextOfPeriod(cycleStartDay: number, today: string, period: string): PayrollMonthContext {
  if (!MONTH_RE.test(period ?? '')) throw new BadRequestException('شهر الرواتب بصيغة YYYY-MM')
  const bounds = payrollPeriodBounds(period, cycleStartDay)
  return { cycleStartDay, today, period, from: bounds.startDate, to: bounds.endDate }
}
