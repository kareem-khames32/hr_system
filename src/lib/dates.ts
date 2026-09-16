// تواريخ بالتوقيت المحلي (توقيت الشركة) — ممنوع toISOString على «الآن»:
// بترجع تاريخ UTC، فبعد منتصف الليل محلياً تفتح الشاشات على يوم/شهر امبارح

// تاريخ محلي YYYY-MM-DD لأي لحظة
export const localDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// اليوم المحلي YYYY-MM-DD
export const localToday = (): string => localDateStr(new Date())

// الشهر المحلي YYYY-MM
export const localMonth = (): string => localToday().slice(0, 7)

// ===== عرض التواريخ والأرقام بنظام واحد في كل الشاشات =====
// عربي بتقويم ميلادي وأرقام لاتينية (نفس نظام أرقام مبالغ الرواتب في money.ts):
// «ar-SA» وحدها تعرض تقويمًا هجريًا، و«ar-EG» وحدها تعرض أرقامًا هندية (١٦) بجانب أرقام لاتينية في نفس الشاشة.
export const DISPLAY_LOCALE = 'ar-EG-u-ca-gregory-nu-latn'

type DateInput = Date | string | number | null | undefined

const toDate = (value: DateInput): Date | null => {
  if (value === null || value === undefined || value === '') return null
  // تاريخ بلا وقت (YYYY-MM-DD) يُقرأ محليًا لا UTC — وإلا يظهر اليوم السابق غرب جرينتش
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10)))
    : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** تاريخ للعرض (افتراضيًا: 16 سبتمبر 2026) — الفارغ/غير الصالح «-». */
export const formatDate = (value: DateInput, options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' }): string => {
  const date = toDate(value)
  return date ? date.toLocaleDateString(DISPLAY_LOCALE, options) : '-'
}

/** تاريخ ووقت للعرض. */
export const formatDateTime = (value: DateInput, options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }): string => {
  const date = toDate(value)
  return date ? date.toLocaleString(DISPLAY_LOCALE, options) : '-'
}

/** رقم عادي (عدد/كمية) بفواصل الآلاف وأرقام لاتينية؛ المبالغ المالية بـformatMoney. */
export const formatNumber = (value: number | string | null | undefined, options?: Intl.NumberFormatOptions): string => {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? number.toLocaleString('en-US', options) : '-'
}
