// مدة الإذن بالدقائق من وقتيه (HH:MM أو H:MM، والثواني إن وُجدت تُهمل زي محرك الحضور).
// النهاية قبل البداية = الإذن بيعدّي نص الليل (وردية ليلية: 23:30 → 00:30 = 60 دقيقة).
// وقت ناقص أو غير صالح = null؛ نفس الوقتين = 0.
export function permissionClockMinutes(value: unknown): number | null {
  const m = /^(\d{1,2}):([0-5]\d)(?::[0-5]\d)?$/.exec(String(value ?? '').trim())
  if (!m || Number(m[1]) > 23) return null
  return Number(m[1]) * 60 + Number(m[2])
}

export function permissionDurationMinutes(from: unknown, to: unknown): number | null {
  const a = permissionClockMinutes(from), b = permissionClockMinutes(to)
  if (a == null || b == null) return null
  return b >= a ? b - a : b + 1440 - a
}
