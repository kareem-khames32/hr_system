// توقيت المهام المجدولة والتواريخ (خطة التنفيذ B1.4): TZ في api/.env (اختياري) بيحدد توقيت الشركة للـAPI كله، وبيتقري أول حاجة
// في main.ts (load-env) قبل أي كود، فالتواريخ ومواعيد المهام على نفس التوقيت. الفاضي = توقيت جهاز السيرفر (زي ما كان).

/** التوقيت اللي العملية شغالة بيه فعلًا (TZ لو مضبوط، وإلا توقيت الجهاز) — كل مهمة مجدولة بتاخده صريح */
export function systemTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

/** TZ غلط بيخلّي Node يرجع لـUTC من غير ما حد يحس، فالإقلاع بيقف برسالة واضحة. الفاضي مقبول (توقيت الجهاز) */
export function timeZoneIssue(value: unknown): string | null {
  if (value === undefined || value === null || String(value).trim() === '') return null
  const zone = String(value).trim()
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone })
    return null
  } catch {
    return `TZ="${zone}" مش توقيت معروف — اكتب اسم المنطقة زي Africa/Cairo أو Asia/Riyadh، أو شيل السطر عشان يفضل توقيت جهاز السيرفر`
  }
}
