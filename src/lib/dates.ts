// تواريخ بالتوقيت المحلي (توقيت الشركة) — ممنوع toISOString على «الآن»:
// بترجع تاريخ UTC، فبعد منتصف الليل محلياً تفتح الشاشات على يوم/شهر امبارح

// تاريخ محلي YYYY-MM-DD لأي لحظة
export const localDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// اليوم المحلي YYYY-MM-DD
export const localToday = (): string => localDateStr(new Date())

// الشهر المحلي YYYY-MM
export const localMonth = (): string => localToday().slice(0, 7)
