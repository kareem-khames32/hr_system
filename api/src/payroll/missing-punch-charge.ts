import type { EntityManager } from 'typeorm'

// B-ADD.14 (كلمة المالك 12 أكتوبر 2026): «خصم نسيان البصمة» — كل طلب «تصحيح/طلب بصمة» معتمد = بصمة منسية. اللي بيتخصم: كل مرة بعد
// «المرات المسموحة» في فترة المسير × (أجر اليوم × المعامل). المعامل صفر (الافتراضي) = مفيش خصم = الحساب زي ما كان بالحرف.
//  - الإدخال اليدوي من الموارد البشرية (عطل جهاز مثلًا) مش تصحيح من الموظف، فمابيتعدّش.
//  - المبلغ بيتحط على يومه جوه عمود التأخير (زي «إذن بخصم»): نفس الإعفاءات وحماية الصافي، وسطر لوحده في القسيمة.

export const PAYROLL_MISSING_PUNCH_PENALTY_KEY = 'payroll.missing_punch.penalty_days'
export const PAYROLL_MISSING_PUNCH_FREE_KEY = 'payroll.missing_punch.free_count'
export const MISSING_PUNCH_PENALTY_MAX = 5
export const MISSING_PUNCH_FREE_MAX = 31

/** المعامل من نص الإعداد: رقم من 0 لحد 5 بمنزلتين. أي حاجة تانية = صفر (مقفول) */
export function missingPunchPenaltyOf(raw: string | null | undefined): number {
  const text = String(raw ?? '').trim(), value = Number(text)
  return /^\d+(?:\.\d{1,2})?$/.test(text) && value > 0 && value <= MISSING_PUNCH_PENALTY_MAX ? value : 0
}
/** المرات المسموحة من نص الإعداد: عدد صحيح من 0 لحد 31. أي حاجة تانية = صفر */
export function missingPunchFreeOf(raw: string | null | undefined): number {
  const text = String(raw ?? '').trim(), value = Number(text)
  return /^\d{1,2}$/.test(text) && value <= MISSING_PUNCH_FREE_MAX ? value : 0
}

/** تواريخ تصحيحات البصمة المعتمدة للموظف في الفترة — صف لكل تصحيح (تصحيحين في يوم = مرتين)، بترتيب التاريخ ثم الرقم */
export async function readPunchCorrectionDates(em: EntityManager, employeeId: number, from: string, to: string): Promise<string[]> {
  const rows: Array<{ date: string }> = await em.query(
    `SELECT CONVERT(varchar(10), [date], 23) AS [date] FROM [attendance_corrections] WHERE [employeeId] = @0 AND [date] BETWEEN @1 AND @2 ORDER BY [date], [id]`, [employeeId, from, to])
  return rows.map(row => String(row.date).slice(0, 10))
}

export interface MissingPunchCharge { penaltyDays: number; free: number; count: number; charged: number; days: Array<{ date: string; times: number; amount: number }> }

/**
 * اللي بيتخصم: التصحيحات اللي يومها من أيام خصم الحضور (مش مستثنى ولا إيقاف)، بترتيبها — الأوائل لحد «المسموح» من غير خصم، والباقي كل
 * مرة بأجر اليوم × المعامل. المبلغ لكل يوم من غير تقريب (التقريب على مجموع العمود زي باقي خصومات الحضور).
 */
export function missingPunchCharge(dates: readonly string[], chargeableDates: ReadonlySet<string>, free: number, dayRate: number, penaltyDays: number): MissingPunchCharge {
  const counted = dates.filter(date => chargeableDates.has(date))
  const byDate = new Map<string, number>()
  for (const date of counted.slice(Math.max(0, free))) byDate.set(date, (byDate.get(date) ?? 0) + 1)
  const amount = Math.max(0, dayRate) * Math.max(0, penaltyDays)
  const days = [...byDate.entries()].map(([date, times]) => ({ date, times, amount: times * amount }))
  return { penaltyDays, free, count: counted.length, charged: days.reduce((sum, day) => sum + day.times, 0), days }
}
