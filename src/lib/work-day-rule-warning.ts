// تنبيه القاعدة اللي مش هتفرق في «أيام العمل» (قرار المالك 30 سبتمبر): قاعدة «إجازة/راحة» على يوم هو أصلًا راحة
// (زي «آخر سبت إجازة» والسبت راحة أصلًا — كانت متعملة كده بدل «دوام رسمي»)، والعكس: «دوام» على يوم هو أصلًا شغل.
// تنبيه بس جنب القاعدة — مابيمنعش الحفظ. منطق نقي بلا React عشان اختبارات الخادم تقراه.

export type WorkDayRuleEffect = 'WORK' | 'OFF'

export const OFF_RULE_ON_REST_DAY_WARNING = 'اليوم ده أصلًا راحة في الجدول ده — القاعدة مش هتفرق. قصدك «دوام»؟'
export const workRuleOnWorkingDayWarning = (offLabel: string) => `اليوم ده أصلًا دوام في الجدول ده — القاعدة مش هتفرق. قصدك «${offLabel}»؟`

/** 'FRI,SAT' ← رموز الأيام؛ null/undefined = مش متحدد (بيورث). النص الفاضي = دوام 7 أيام (مفيش راحة). */
export function weekendCodes(value: string | null | undefined): string[] | null {
  if (value === null || value === undefined) return null
  return value.split(',').map(day => day.trim().toUpperCase()).filter(Boolean)
}

/** راحة الفرع: الفاضي أو الغايب = بيورث العام (زي محرك الحضور) ← null. */
export const branchWeekendCodes = (value: string | null | undefined): string[] | null => (value && value.trim() ? weekendCodes(value) : null)

/** أيام الراحة اللي بتحكم القاعدة: أيام الجدول (أو الفرع) نفسه، ولو بيورث (null) فاللي بعده — الفرع ثم العام.
 *  null في الآخر = مش معروفة، فمفيش تنبيه. */
export function effectiveWeekend(...sources: Array<string[] | null | undefined>): string[] | null {
  for (const source of sources) if (source) return source
  return null
}

/** نص التنبيه أو null. offLabel = اسم «الراحة» في الشاشة («راحة» في استثناءات الجدول، «إجازة» في القواعد الاستثنائية). */
export function workDayRuleWarning(effect: WorkDayRuleEffect, weekday: string, weekend: string[] | null, offLabel = 'راحة'): string | null {
  if (!weekend) return null
  const off = weekend.includes(weekday.toUpperCase())
  if (effect === 'OFF' && off) return OFF_RULE_ON_REST_DAY_WARNING
  if (effect === 'WORK' && !off) return workRuleOnWorkingDayWarning(offLabel)
  return null
}
