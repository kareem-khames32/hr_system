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

// ===== B4.6 (ج): التاريخ الهجري جنب الميلادي =====
// إعداد لكل كيان قانوني (الخادم بيقول للحساب: فرعه في كيان مفعّل له العرض ولا لأ) — بيتقري مرة للجلسة ويتحفظ في المتصفح.
// مقفول (الافتراضي) = التواريخ ميلادي بس زي الأول بالحرف. التخزين والإدخال ميلادي دايمًا؛ ده عرض بس، بتقويم أم القرى.
export const HIJRI_LOCALE = 'ar-SA-u-ca-islamic-umalqura-nu-latn'
const HIJRI_STORAGE_KEY = 'hr.display.hijri'
let hijriOn: boolean | null = null
const hijriEnabled = (): boolean => {
  if (hijriOn === null) {
    try { hijriOn = typeof window !== 'undefined' && window.localStorage.getItem(HIJRI_STORAGE_KEY) === '1' } catch { hijriOn = false }
  }
  return hijriOn
}
/** إعداد الحساب من الخادم: يعرض الهجري جنب الميلادي ولا لأ */
export const setHijriDisplay = (on: boolean): void => {
  hijriOn = on
  try { if (typeof window !== 'undefined') window.localStorage.setItem(HIJRI_STORAGE_KEY, on ? '1' : '0') } catch { /* من غير تخزين: الإعداد للجلسة دي بس */ }
}
/** التاريخ الهجري (أم القرى) لتاريخ ميلادي — مثال: «1 محرم 1447 هـ». الفارغ/غير الصالح «-». */
export const formatHijriDate = (value: DateInput): string => {
  const date = toDate(value)
  return date ? date.toLocaleDateString(HIJRI_LOCALE, { year: 'numeric', month: 'long', day: 'numeric' }) : '-'
}

const FULL_DATE: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' }
/**
 * تاريخ للعرض (افتراضيًا: 16 سبتمبر 2026) — الفارغ/غير الصالح «-».
 * لحساب مفعّل له عرض الهجري: التاريخ الكامل (من غير خيارات مخصوصة) بياخد الهجري بين قوسين جنبه.
 */
export const formatDate = (value: DateInput, options: Intl.DateTimeFormatOptions = FULL_DATE): string => {
  const date = toDate(value)
  if (!date) return '-'
  const text = date.toLocaleDateString(DISPLAY_LOCALE, options)
  return options === FULL_DATE && hijriEnabled() ? `${text} (${date.toLocaleDateString(HIJRI_LOCALE, FULL_DATE)})` : text
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
