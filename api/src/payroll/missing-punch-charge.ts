import type { EntityManager } from 'typeorm'

// B-ADD.14 (كلمة المالك 12 أكتوبر 2026، واتصحّحت نفس اليوم): «خصم نسيان البصمة» — اليوم اللي فيه **بصمة واحدة بس** (حضور من غير
// انصراف أو العكس) وفضل كده لحد حساب المسير **والموظف ماقدّمش عنه طلب تصحيح**. أول «المرات المسموحة» في فترة المسير من غير خصم،
// وكل مرة بعدها بـ(أجر اليوم × المعامل) — مش يوم كامل. المعامل صفر (الافتراضي) = مفيش خصم = الحساب زي ما كان بالحرف.
//  - اللي قدّم طلب «تصحيح/طلب بصمة» عن اليوم (مستني أو معتمد) مابيتخصمش منه، حتى لو اليوم لسه ناقص وقت الحساب.
//  - اليوم اللي من غير أي بصمة خالص غياب زي ما هو — مالوش دعوة بالقاعدة دي.
//  - المبلغ بيتحط على يومه جوه عمود التأخير (زي «إذن بخصم»): نفس الإعفاءات وحماية الصافي، وسطر لوحده في القسيمة.

export const PAYROLL_MISSING_PUNCH_PENALTY_KEY = 'payroll.missing_punch.penalty_days'
export const PAYROLL_MISSING_PUNCH_FREE_KEY = 'payroll.missing_punch.free_count'
export const MISSING_PUNCH_PENALTY_MAX = 5
export const MISSING_PUNCH_FREE_MAX = 31
/** وجهة طلب «تصحيح/طلب بصمة» في محرك الطلبات (أي نوع طلب وجهته دي بيتعدّ طلب تصحيح) */
const CORRECTION_HANDLER = 'attendance_corrections'
/** الطلب المقدَّم اللي بيتعدّ: كل الحالات ماعدا المسودة والمرفوض والملغي */
const NOT_A_REQUEST = ['DRAFT', 'REJECTED', 'CANCELLED']

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

/** الأيام اللي الموظف قدّم عنها طلب تصحيح بصمة في الفترة: طلب لسه ماشي أو خلص (تاريخه في حمولة الطلب)، أو تصحيح اتسجّل فعلًا */
export async function readPunchRequestDates(em: EntityManager, employeeId: number, from: string, to: string, hold = false): Promise<Set<string>> {
  // P8B-B03: hold = القراءة بتمسك اللي قرته لحد آخر المعاملة (قفل تحديث + قفل مدى): طلب تصحيح جديد للموظف، أو تغيير حالة طلب، أو تصحيح
  // بيتسجّل — كلهم بيستنوا المعاملة تخلص. اعتماد المسير بيقرا كده، فالطلب يا يثبت قبل فحص الاعتماد فيتشاف، يا يستنى لحد ما الاعتماد يثبت.
  const lock = hold ? ' WITH (UPDLOCK, HOLDLOCK)' : ''
  const rows: Array<{ date: string | null }> = await em.query(
    `SELECT CONVERT(varchar(10), c.[date], 23) AS [date] FROM [attendance_corrections] c${lock} WHERE c.[employeeId] = @0 AND c.[date] BETWEEN @1 AND @2
     UNION
     SELECT LEFT(JSON_VALUE(r.[payload], '$.date'), 10) AS [date] FROM [requests] r${lock} INNER JOIN [request_types] t ON t.[code] = r.[typeCode]
     WHERE r.[requesterId] = @0 AND t.[destinationHandler] = N'${CORRECTION_HANDLER}' AND r.[status] NOT IN (${NOT_A_REQUEST.map(status => `N'${status}'`).join(', ')})
       AND ISJSON(r.[payload]) = 1 AND LEFT(JSON_VALUE(r.[payload], '$.date'), 10) BETWEEN @1 AND @2`, [employeeId, from, to])
  return new Set(rows.map(row => String(row.date ?? '').slice(0, 10)).filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date)))
}

export interface MissingPunchCharge { penaltyDays: number; free: number; missingDays: number; withRequest: number; count: number; charged: number; days: Array<{ date: string; amount: number }>
  /** P8A-B03: مصدر الحكم — أيام البصمة الناقصة اللي كان عليها طلب وقت الحساب، واللي من غير طلب (المسموح والمخصوم). الاعتماد بيقارنهم بالطلبات دلوقتي */
  requestDates: string[]; countedDates: string[] }

/**
 * اللي بيتخصم: أيام «بصمة ناقصة» (من أيام خصم الحضور — مش مستثنى ولا إيقاف) اللي مالهاش طلب، بترتيب التاريخ — الأوائل لحد «المسموح»
 * من غير خصم، والباقي كل يوم بأجر اليوم × المعامل. المبلغ من غير تقريب (التقريب على مجموع العمود زي باقي خصومات الحضور).
 */
export function missingPunchCharge(missingDates: readonly string[], requestDates: ReadonlySet<string>, free: number, dayRate: number, penaltyDays: number): MissingPunchCharge {
  const sorted = [...new Set(missingDates)].sort()
  const counted = sorted.filter(date => !requestDates.has(date))
  const amount = Math.max(0, dayRate) * Math.max(0, penaltyDays)
  const days = counted.slice(Math.max(0, free)).map(date => ({ date, amount }))
  return { penaltyDays, free, missingDays: sorted.length, withRequest: sorted.length - counted.length, count: counted.length, charged: days.length, days,
    requestDates: sorted.filter(date => requestDates.has(date)), countedDates: counted }
}

/**
 * P8A-B03: حكم «من غير طلب» اللي الحساب اتبنى عليه لسه هو هو؟ طلب تصحيح اتقدّم بعد الحساب (أو طلب اترفض أو اتلغى بعده) بيغيّر مين
 * يتخصم منه ومين في «المسموح»، فالاعتماد مايعدّيش بالحساب القديم. تفصيل من غير مصدر الحكم (حساب أقدم من التصليح ده) متقادم برضه.
 */
export function missingPunchSourceStale(saved: unknown, requestDatesNow: ReadonlySet<string>): boolean {
  const charge = saved as Partial<MissingPunchCharge> | null | undefined
  if (!charge || !Array.isArray(charge.requestDates) || !Array.isArray(charge.countedDates)) return true
  return charge.countedDates.some(date => requestDatesNow.has(String(date))) || charge.requestDates.some(date => !requestDatesNow.has(String(date)))
}

/** سبب المراجعة اللي محرك الحضور بيكتبه على يوم البصمة الناقصة (attendance-flex-calculator) — بيه اعتماد المسير بيعرف إن وقف اليوم سببه النسيان بس */
export const MISSING_PUNCH_REVIEW_REASON = 'بصمة حضور أو انصراف مفقودة؛ نقص الساعات غير محسوم'
/** يوم مراجعته سببها البصمة الناقصة بس: والخصم مفعّل اليوم ده اتحاسب في المسير، فمايوقّفش اعتماده */
export const reviewIsMissingPunchOnly = (day: { status?: unknown; reviewRequired?: unknown; reviewReason?: unknown }): boolean =>
  day.reviewRequired === true && day.status === 'missing_punch' && day.reviewReason === MISSING_PUNCH_REVIEW_REASON
