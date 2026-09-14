// ===== سر توقيع الـJWT =====
// لا قيمة افتراضية إطلاقاً: كان يرجع بصمت لـ'dev-secret' لو JWT_SECRET ناقص،
// فأي حد يقدر يزوّر توكن super_admin. الآن الإقلاع نفسه يفشل لو السر غير سليم.
export const JWT_SECRET_MIN_LENGTH = 32

// قيم منشورة في الريبو — معروفة للكل
export const KNOWN_DEFAULT_SECRETS = [
  'change-this-to-a-long-random-secret-in-production', // .env.example
  'dev-secret', // البديل القديم في الكود وأدوات الاختبار
]
// كلمات القوالب الشائعة؛ السر العشوائي (hex/base64) لا يحتوي عليها
const PLACEHOLDER_SECRET_PATTERN = /change[-_ ]?(?:this|me)|replace[-_ ]?(?:this|me)|your[-_ ]?(?:jwt[-_ ]?)?secret|placeholder|example/i

export function isKnownPlaceholderSecret(secret: string): boolean {
  return KNOWN_DEFAULT_SECRETS.includes(secret) || PLACEHOLDER_SECRET_PATTERN.test(secret)
}

// المزامنة التلقائية تمسح/تعيد إنشاء أعمدة؛ مسموحة فقط لقواعد اختبار مؤقتة
// تنشئها الاختبارات بنفسها: hr_<اسم>_test_<16 hex> (وhr_decision_race_<16 hex>)
export const DISPOSABLE_DATABASE_PATTERN = /^hr_[a-z0-9]+(?:_[a-z0-9]+)*_(?:test|race)_[a-f0-9]{16}$/

export function isDisposableTestDatabase(name: unknown): boolean {
  return typeof name === 'string' && DISPOSABLE_DATABASE_PATTERN.test(name)
}

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
  if (String(config.DB_SYNCHRONIZE ?? '').trim().toLowerCase() === 'true') {
    if (config.NODE_ENV === 'production') {
      throw new Error('DB_SYNCHRONIZE=true ممنوع في الإنتاج — طبّق ترقية المخطط المعتمدة على نسخة احتياطية أولاً')
    }
    // نفس القيمة الافتراضية المستخدمة في app.module عند غياب DB_DATABASE
    const database = typeof config.DB_DATABASE === 'string' && config.DB_DATABASE.trim() ? config.DB_DATABASE.trim() : 'hr_system'
    if (!isDisposableTestDatabase(database)) {
      throw new Error(
        `DB_SYNCHRONIZE=true مرفوض على قاعدة البيانات "${database}" — المزامنة التلقائية مسموحة فقط لقواعد الاختبار المؤقتة ` +
        '(hr_<اسم>_test_<16 حرف hex>). اضبط DB_SYNCHRONIZE=false وطبّق الترحيلات بالمُرحّل المجمّع (docs/migrations/README.md)'
      )
    }
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
  if (isKnownPlaceholderSecret(secret)) {
    const msg =
      'JWT_SECRET قيمة منشورة أو قالب معروف (مثل قيمة .env.example) — أي حد يقدر يزوّر توكن؛ ولّد سراً عشوائياً بـ ' +
      "node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""
    // أي بيئة غير test (development وproduction وغيرهما): فشل صريح قبل الإقلاع
    if (config.NODE_ENV !== 'test') throw new Error(msg)
    // eslint-disable-next-line no-console
    console.warn(`⚠️  ${msg}`)
  }
  return config
}
