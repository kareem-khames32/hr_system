// العطلة الأسبوعية: الإعداد العام attendance.weekend_days وتجاوز الفرع branch.weekendDays —
// رموز أيام SUN..SAT مفصولة بفاصلة، نفس ما يقسّمه nonWorkingContext. قيمة مثل «Fri Sat»
// كانت تُحفظ فلا تطابق أي يوم فتصير كل الأيام دواماً بلا رسالة (SET-15)
export const WEEK_DAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

// صيغة الـDTO (بلا مسافات، حالة الحروف لا تهم) — التطبيع ورفض «كل الأيام» في الدوال تحت
const DAY = `(${WEEK_DAY_CODES.join('|')})`
export const WEEKEND_DAYS_RE = new RegExp(`^${DAY}(,${DAY})*$`, 'i')
export const WEEKEND_DAYS_HINT = 'رموز أيام إنجليزية مفصولة بفاصلة (مثل FRI,SAT)'

const partsOf = (raw?: string | null) =>
  String(raw ?? '')
    .toUpperCase()
    .split(',')
    .map((p) => p.trim())

// سبب رفض القيمة للرسالة — null = قيمة صالحة. كل أيام الأسبوع مرفوضة: لا يبقى يوم
// عمل فلا يُحتسب غياب ولا تُخصم إجازة
export const weekendDaysError = (raw?: string | null): string | null => {
  const parts = partsOf(raw)
  if (!parts.every((p) => WEEK_DAY_CODES.includes(p))) {
    return `أيام نهاية الأسبوع: ${WEEKEND_DAYS_HINT}`
  }
  if (new Set(parts).size === WEEK_DAY_CODES.length) {
    return 'أيام نهاية الأسبوع لا تكون كل أيام الأسبوع — يلزم يوم عمل واحد على الأقل'
  }
  return null
}

// القيمة المطبَّعة للحفظ: حروف كبيرة بترتيب الأسبوع بلا تكرار (بعد weekendDaysError)
export const normalizeWeekendDays = (raw?: string | null): string => {
  const days = new Set(partsOf(raw))
  return WEEK_DAY_CODES.filter((d) => days.has(d)).join(',')
}
