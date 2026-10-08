// قاعدة التاريخ الفعّال (خطة التنفيذ 1.3): أي قيمة مؤرخة بتتقرا بقيمتها السارية في آخر يوم في فترة المسير، من غير تقسيم جوه الفترة.
// دوال صافية من غير قاعدة بيانات — الخدمة (statutory.service) بتقرا الصفوف مرة لكل حساب مسير وبتسلّمها هنا.

export interface StatutoryEntry {
  country: string
  key: string
  effectiveFrom: string
  verified: boolean
  source: string | null
  values: Record<string, string>
}

/** التعريف الساري يوم date (آخر «ساري من» لحد اليوم ده) أو null */
export function statutoryAt(entries: readonly StatutoryEntry[], country: string, key: string, date: string): StatutoryEntry | null {
  let found: StatutoryEntry | null = null
  for (const entry of entries) {
    if (entry.country !== country || entry.key !== key || entry.effectiveFrom > date) continue
    if (!found || entry.effectiveFrom > found.effectiveFrom) found = entry
  }
  return found
}

/**
 * P4A-B01: للحسابات اللي ليها أثر (خصم، تسعير، رفض، مدة) — الصف الساري يوم date بشرط إنه «اتأكد». صف «محتاج تحقق» = مفيش صف:
 * الحساب مايتطبقش على التاريخ ده (زي ما هو مقفول)، حتى لو صف أحدث منه اتأكد والحساب اتفعّل.
 */
export function verifiedStatutoryAt(entries: readonly StatutoryEntry[], country: string, key: string, date: string): StatutoryEntry | null {
  const row = statutoryAt(entries, country, key, date)
  return row && row.verified ? row : null
}

/** رقم من قيمة الصف، أو null لو مش موجود أو مش رقم موجب أو صفر */
export function statutoryNumber(entry: StatutoryEntry | null, code: string): number | null {
  const raw = entry?.values[code]
  if (raw === undefined || raw === null || String(raw).trim() === '') return null
  const value = Number(raw)
  return Number.isFinite(value) && value >= 0 ? value : null
}
