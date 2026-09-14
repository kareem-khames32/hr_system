// الوردية الليلية (النهاية قبل البداية، مثل 20:00 ← 01:00) تُنسب كلها ليوم بدايتها:
// البصمة بعد منتصف الليل تُخزَّن بساعة الحائط في صف يوم البداية (دخولًا كانت أو انصرافًا)، فنوضّح أنها صباح الغد
export interface NextDayCheckoutDay {
  shiftStart?: string | null
  shiftEnd?: string | null
  checkIn?: string | null
  checkOut?: string | null
}

const clockMinutes = (value?: string | null) =>
  typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d/.test(value) ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5)) : null

/**
 * أي بصمتي اليوم الليلي تقعان صباح اليوم التالي. حد الصباح = منتصف الفجوة بين نهاية الوردية وبدايتها
 * (نفس حد محرك الحضور حين لا تسبق وردية الغد ذلك): 20:00 ← 01:00 ⇒ ما قبل 10:30 صباح الغد.
 * - الدخول صباح الغد: قبل الحد، والانصراف (إن وجد) بعده زمنيًا وقبل الحد أيضًا (مثل 00:30 ← 01:00).
 * - الانصراف صباح الغد: إذا كان الدخول صباح الغد، أو كان قبل الدخول (20:10 ← 00:50)، أو بلا دخول وقبل الحد.
 */
export function nextDayPunchFields(day: NextDayCheckoutDay): { checkIn: boolean; checkOut: boolean } {
  const start = clockMinutes(day.shiftStart), end = clockMinutes(day.shiftEnd)
  if (start === null || end === null || !(end < start)) return { checkIn: false, checkOut: false }
  const cut = Math.floor((start + end) / 2)
  const checkIn = clockMinutes(day.checkIn), checkOut = clockMinutes(day.checkOut)
  const inNextDay = checkIn !== null && checkIn < cut && (checkOut === null || (checkOut >= checkIn && checkOut < cut))
  const outNextDay = checkOut !== null && (inNextDay || (checkIn !== null ? checkOut < checkIn : checkOut < cut))
  return { checkIn: inNextDay, checkOut: outNextDay }
}

export function isNextDayCheckout(day: NextDayCheckoutDay): boolean {
  return nextDayPunchFields(day).checkOut
}

export function NextDayCheckoutHint({ day, field = 'checkOut' }: { day: NextDayCheckoutDay; field?: 'checkIn' | 'checkOut' }) {
  if (!nextDayPunchFields(day)[field]) return null
  return (
    <div
      className="text-[10px] text-purple-600"
      title="وردية ليلية: البصمة بعد منتصف الليل تُحتسب ليوم بداية الوردية (الساعات والتأخير والنقص)"
    >
      صباح اليوم التالي
    </div>
  )
}
