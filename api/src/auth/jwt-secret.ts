// ===== سر توقيع الـJWT =====
// لا قيمة افتراضية إطلاقاً: كان يرجع بصمت لـ'dev-secret' لو JWT_SECRET ناقص،
// فأي حد يقدر يزوّر توكن super_admin. الآن الإقلاع نفسه يفشل لو السر غير سليم.
export const JWT_SECRET_MIN_LENGTH = 32

// قيم منشورة في الريبو — معروفة للكل
const KNOWN_DEFAULT_SECRETS = [
  'change-this-to-a-long-random-secret-in-production', // .env.example
]

export function jwtLifetimeSeconds(value: unknown = '8h'): number {
  const match = /^(\d+)(s|m|h|d)?$/.exec(String(value).trim())
  const multiplier = { s: 1, m: 60, h: 3600, d: 86400 }
  const seconds = match ? Number(match[1]) * (multiplier[match[2] as keyof typeof multiplier] ?? 1) : NaN
  if (!Number.isSafeInteger(seconds) || seconds <= 0) {
    throw new Error('JWT_EXPIRES_IN يجب أن يكون مدة موجبة بالثواني أو بصيغة 30m أو 8h أو 1d')
  }
  return seconds
}

// validate للـ ConfigModule — يُستدعى مرة وقت الإقلاع، وأي throw = فشل الإقلاع
export function validateEnv(
  config: Record<string, unknown>
): Record<string, unknown> {
  jwtLifetimeSeconds(config.JWT_EXPIRES_IN ?? '8h')
  if (config.NODE_ENV === 'production' && String(config.DB_SYNCHRONIZE).toLowerCase() === 'true') {
    throw new Error('DB_SYNCHRONIZE=true ممنوع في الإنتاج — طبّق ترقية المخطط المعتمدة على نسخة احتياطية أولاً')
  }
  const secret = typeof config.JWT_SECRET === 'string' ? config.JWT_SECRET : ''
  if (!secret.trim()) {
    throw new Error(
      'JWT_SECRET غير مضبوط في .env — الإقلاع موقوف (لا توجد قيمة افتراضية)'
    )
  }
  if (secret.length < JWT_SECRET_MIN_LENGTH) {
    throw new Error(
      `JWT_SECRET أقصر من ${JWT_SECRET_MIN_LENGTH} حرفاً — استخدم سراً عشوائياً طويلاً`
    )
  }
  if (KNOWN_DEFAULT_SECRETS.includes(secret)) {
    const msg =
      'JWT_SECRET هو القيمة المنشورة في .env.example — أي حد يقدر يزوّر توكن؛ ولّد سراً عشوائياً'
    // production: فشل صريح — التطوير: تحذير فقط حتى لا تسقط البيئة المحلية
    if (config.NODE_ENV === 'production') throw new Error(msg)
    // eslint-disable-next-line no-console
    console.warn(`⚠️  ${msg}`)
  }
  return config
}
