// أمان الدخول (خطة التنفيذ B1.3): قواعد صافية من غير DI ولا اتصال — القفل المؤقت والتأخير المتزايد وسياسة كلمة السر (NIST 800-63B).
// الخدمة (login-security.service.ts) بتقرا الإعدادات وبتكتب في القاعدة؛ هنا الحكم بس، فالاختبارات بتستخدمه بنفس الشكل.

export const LOCKOUT_MAX_ATTEMPTS_KEY = 'auth.lockout.max_attempts'
export const LOCKOUT_MINUTES_KEY = 'auth.lockout.minutes'
export const PASSWORD_MIN_LENGTH_KEY = 'auth.password.min_length'
export const TWO_FACTOR_ROLES_KEY = 'auth.two_factor.roles'

export const LOCKOUT_DEFAULTS = { maxAttempts: 10, minutes: 15 } as const
export const PASSWORD_DEFAULTS = { minLength: 8, maxLength: 128 } as const

export interface LockoutSettings { maxAttempts: number; minutes: number }

const intIn = (value: unknown, min: number, max: number, fallback: number) => {
  const number = Number(String(value ?? '').trim())
  return Number.isInteger(number) && number >= min && number <= max ? number : fallback
}

/** إعدادات القفل من قيم requests_config (القيمة الغلط أو الفاضية = الافتراضي). */
export function lockoutSettingsOf(values: Partial<Record<string, string | null | undefined>>): LockoutSettings {
  return {
    maxAttempts: intIn(values[LOCKOUT_MAX_ATTEMPTS_KEY], 3, 100, LOCKOUT_DEFAULTS.maxAttempts),
    minutes: intIn(values[LOCKOUT_MINUTES_KEY], 1, 1440, LOCKOUT_DEFAULTS.minutes),
  }
}

export const passwordMinLengthOf = (value: string | null | undefined) => intIn(value, 8, 64, PASSWORD_DEFAULTS.minLength)

/** حراسة كتابة إعدادات أمان الدخول من الشاشة (PATCH /settings/config) — null = مقبولة. */
export function loginSecurityConfigError(key: string, value: string): string | null {
  const whole = (min: number, max: number, label: string) => {
    const number = Number(String(value).trim())
    return /^\d+$/.test(String(value).trim()) && number >= min && number <= max ? null : `${label} رقم صحيح من ${min} لـ${max}`
  }
  if (key === LOCKOUT_MAX_ATTEMPTS_KEY) return whole(3, 100, 'عدد المحاولات قبل القفل')
  if (key === LOCKOUT_MINUTES_KEY) return whole(1, 1440, 'مدة القفل بالدقايق')
  if (key === PASSWORD_MIN_LENGTH_KEY) return whole(8, 64, 'أقل طول لكلمة السر')
  if (key === TWO_FACTOR_ROLES_KEY) {
    const raw = String(value).split(',').map(role => role.trim()).filter(Boolean)
    return raw.length === twoFactorRolesOf(value).length && new Set(raw).size === raw.length ? null : 'أكواد الأدوار حروف إنجليزية صغيرة وأرقام و_ مفصولة بفاصلة، من غير تكرار'
  }
  return null
}

/** أكواد الأدوار اللي التحقق بخطوتين إلزامي ليها (مفصولة بفاصلة). */
export function twoFactorRolesOf(value: string | null | undefined): string[] {
  return [...new Set(String(value ?? '').split(',').map(role => role.trim()).filter(role => /^[a-z][a-z0-9_]{1,49}$/.test(role)))]
}

/**
 * التأخير قبل رد المحاولة الغلط رقم n ورا بعض: أول اتنين من غير تأخير، وبعدين ثانية ثم 2 ثم 4 (الحد الأقصى).
 * baseMs = ثانية في التشغيل؛ الاختبارات بتصغّرها (AUTH_FAILURE_DELAY_MS).
 */
export function failureDelayMs(failedCount: number, baseMs = 1000): number {
  if (!Number.isFinite(failedCount) || failedCount < 3) return 0
  return Math.min(baseMs * 2 ** (failedCount - 3), baseMs * 4)
}

/** المحاولة دي (بعد ما العداد زاد) بتقفل الحساب؟ وقفله لحد إمتى. */
export function lockAfterFailure(failedCount: number, settings: LockoutSettings, now = new Date()): Date | null {
  return failedCount >= settings.maxAttempts ? new Date(now.getTime() + settings.minutes * 60_000) : null
}

/** الحساب مقفول دلوقتي؟ */
export const lockedNow = (lockedUntil: Date | string | null | undefined, now = new Date()) =>
  !!lockedUntil && new Date(lockedUntil).getTime() > now.getTime()

/** رسالة الحساب المقفول: لحد إمتى بالساعة (توقيت الخادم) ومين يفكه. */
export function lockedMessage(lockedUntil: Date | string, now = new Date()): string {
  const minutes = Math.max(1, Math.ceil((new Date(lockedUntil).getTime() - now.getTime()) / 60_000))
  return `الحساب اتقفل مؤقتًا بعد محاولات دخول غلط كتير — حاول تاني بعد ${minutes} دقيقة، أو كلّم مدير النظام يفكّه`
}

// كلمات سر شائعة ممنوعة (قايمة محلية قصيرة من أشهر القوايم العامة) — المقارنة من غير حالة الحروف ومن غير مسافات الأطراف
const COMMON_PASSWORDS = new Set([
  '12345678', '123456789', '1234567890', '12345678910', '87654321', '11111111', '00000000', '88888888', '99999999', '12121212',
  '11223344', '123123123', '147258369', '159753456', '1q2w3e4r', '1qaz2wsx', 'qwertyui', 'qwertyuiop', 'asdfghjk', 'asdfghjkl',
  'zxcvbnm1', 'password', 'password1', 'password12', 'password123', 'passw0rd', 'p@ssw0rd', 'p@ssword', 'p@ssw0rd1', 'admin123',
  'admin1234', 'administrator', 'welcome1', 'welcome123', 'letmein1', 'iloveyou', 'sunshine', 'princess', 'football', 'baseball',
  'superman', 'starwars', 'trustno1', 'whatever', 'qwerty123', 'qwerty12', 'abc12345', 'abcd1234', 'abcdefgh', 'aa123456',
  'changeme', 'changeme1', 'default1', 'master123', 'monkey12', 'dragon12', 'login123', 'secret12', 'test1234', 'testtest',
  'user1234', 'temp1234', 'pass1234', 'hr123456', 'company1', 'company123', 'maharah1', 'maharah123', 'logicleap', 'logicleaphr',
  'Aa123456', 'Password@1', 'Password@123', 'Qwerty@123', 'Welcome@123', 'P@ssw0rd123',
].map(value => value.toLowerCase()))

export interface PasswordContext { email?: string | null; displayName?: string | null }

/**
 * سياسة كلمة السر الجديدة (NIST 800-63B): طول أدنى (إعداد) وأقصى 128، ومن غير شرط رموز ولا انتهاء صلاحية.
 * الممنوع: كلمات السر الشائعة، وجزء البريد قبل @، واسم المنتج، وحرف واحد متكرر. null = مقبولة.
 */
export function passwordPolicyIssue(password: unknown, minLength: number, context: PasswordContext = {}): string | null {
  if (typeof password !== 'string') return 'اكتب كلمة المرور'
  if (password.length < minLength) return `كلمة المرور ${minLength} حروف على الأقل`
  if (password.length > PASSWORD_DEFAULTS.maxLength) return `كلمة المرور ${PASSWORD_DEFAULTS.maxLength} حرف بحد أقصى`
  const normalized = password.trim().toLowerCase()
  if (COMMON_PASSWORDS.has(normalized)) return 'كلمة المرور دي من الكلمات الشائعة اللي بتتخمّن بسهولة — اختار غيرها'
  if (/^(.)\1+$/.test(normalized)) return 'كلمة المرور حرف واحد متكرر — اختار غيرها'
  const local = String(context.email ?? '').split('@')[0].trim().toLowerCase()
  if (local.length >= 4 && normalized.includes(local)) return 'كلمة المرور فيها اسم الحساب (البريد) — اختار غيرها'
  const name = String(context.displayName ?? '').replace(/\s+/g, '').toLowerCase()
  if (name.length >= 4 && normalized.replace(/\s+/g, '').includes(name)) return 'كلمة المرور فيها اسم صاحب الحساب — اختار غيرها'
  if (normalized.replace(/[\s_.-]/g, '').includes('logicleap')) return 'كلمة المرور فيها اسم النظام — اختار غيرها'
  return null
}
