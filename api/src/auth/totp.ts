import * as crypto from 'crypto'
import { twoFactorRolesOf } from './login-security'

// B2.17-ج: التحقق بتطبيق مصادقة (TOTP — RFC 6238) — قواعد صرف من غير DI ولا اتصال ومن غير مكتبة: توليد الرمز والتحقق منه،
// وترميز السر (base32) ورابط التطبيق، وتشفير السر قبل تخزينه، وأدوار الإلزام.
//
// المعيار اللي كل تطبيقات المصادقة بتدعمه: HMAC-SHA1، 6 أرقام، خطوة 30 ثانية. السر 20 بايت عشوائي.

export const TOTP_DIGITS = 6
export const TOTP_STEP_SECONDS = 30
/** خطوة قبل وخطوة بعد: ساعة الموبايل بتفرق ثواني عن الخادم */
export const TOTP_WINDOW_STEPS = 1
export const TOTP_SECRET_BYTES = 20
/** مفتاح الإعداد: أكواد الأدوار اللي تطبيق المصادقة إلزامي ليها (مفصولة بفاصلة؛ فاضي = ولا دور) */
export const TOTP_ROLES_KEY = 'auth.totp.roles'
export const TOTP_SETUP_REQUIRED = 'TOTP_SETUP_REQUIRED'
export const TOTP_MIGRATION_MISSING = 'التحقق بتطبيق المصادقة محتاج ترحيل 20261007_102 على قاعدة البيانات'
export const TOTP_WRONG_CODE = 'الرمز غلط أو انتهى — اكتب الرمز الظاهر في تطبيق المصادقة دلوقتي'
export const TOTP_ALREADY_ENABLED = 'تطبيق المصادقة مفعّل على الحساب بالفعل'
export const TOTP_NOT_STARTED = 'ابدأ تفعيل تطبيق المصادقة الأول'
export const TOTP_NOT_ENABLED = 'تطبيق المصادقة مش مفعّل على الحساب'
export const TOTP_REQUIRED_FOR_ROLE = 'تطبيق المصادقة إلزامي لدورك — مايتقفلش'
export const TOTP_SETUP_MESSAGE = 'لازم تفعّل تطبيق المصادقة الأول قبل ما تستخدم النظام'
/** علامة حالة الدخول المعلّقة اللي رمزها من تطبيق المصادقة (مكان hash رمز البريد في login_challenges) */
export const TOTP_CHALLENGE_MARK = 'totp'
export const TOTP_CHALLENGE_SENT_TO = 'تطبيق المصادقة'

/** أكواد الأدوار اللي تطبيق المصادقة إلزامي ليها — نفس صيغة «التحقق بخطوتين إلزامي لأدوار» */
export const totpRolesOf = (value: string | null | undefined): string[] => twoFactorRolesOf(value)

// ===== base32 (RFC 4648، من غير حشو) =====
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
export function base32Encode(bytes: Buffer): string {
  let bits = 0, value = 0, out = ''
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31]
  return out
}
/** null لو النص مش base32 (المسافات والشرطات وحالة الأحرف مسموحة: السر بيتعرض مجموعات) */
export function base32Decode(text: unknown): Buffer | null {
  const clean = typeof text === 'string' ? text.replace(/[\s-]/g, '').replace(/=+$/, '').toUpperCase() : ''
  if (!clean || /[^A-Z2-7]/.test(clean)) return null
  let bits = 0, value = 0
  const out: number[] = []
  for (const char of clean) {
    value = (value << 5) | ALPHABET.indexOf(char)
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(out)
}

export const newTotpSecret = (): string => base32Encode(crypto.randomBytes(TOTP_SECRET_BYTES))
/** السر مجموعات من 4 حروف — للكتابة بالإيد في التطبيق */
export const groupedSecret = (secret: string): string => secret.replace(/(.{4})(?=.)/g, '$1 ')

// ===== الرمز =====
export const totpStepAt = (timeMs: number): number => Math.floor(timeMs / 1000 / TOTP_STEP_SECONDS)

/** رمز الخطوة (RFC 4226: HMAC-SHA1 على العدّاد 8 بايت، واقتطاع ديناميكي) */
export function totpCode(secret: Buffer, step: number): string {
  const counter = Buffer.alloc(8)
  counter.writeUInt32BE(Math.floor(step / 0x100000000), 0)
  counter.writeUInt32BE(step >>> 0, 4)
  const digest = crypto.createHmac('sha1', secret).update(counter).digest()
  const offset = digest[digest.length - 1] & 15
  const binary = ((digest[offset] & 127) << 24) | (digest[offset + 1] << 16) | (digest[offset + 2] << 8) | digest[offset + 3]
  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0')
}

/**
 * الرمز صحيح لسر الحساب دلوقتي؟ بيرجّع خطوة الرمز المطابق (الحالية، أو اللي قبلها أو بعدها)، أو null. المقارنة ثابتة الزمن وعلى كل
 * خطوات النافذة. afterStep = آخر خطوة اتقبلت للحساب: رمزها واللي قبلها مايتقبلوش تاني (الرمز مرة واحدة).
 */
export function matchTotp(secretBase32: string, code: unknown, timeMs: number, afterStep: number | null = null): number | null {
  const secret = base32Decode(secretBase32)
  const clean = typeof code === 'string' ? code.replace(/\s/g, '') : ''
  if (!secret || !new RegExp(`^\\d{${TOTP_DIGITS}}$`).test(clean)) return null
  const now = totpStepAt(timeMs), presented = Buffer.from(clean)
  let matched: number | null = null
  for (let step = now - TOTP_WINDOW_STEPS; step <= now + TOTP_WINDOW_STEPS; step++) {
    const equal = crypto.timingSafeEqual(Buffer.from(totpCode(secret, step)), presented)
    if (equal && matched === null && (afterStep === null || step > afterStep)) matched = step
  }
  return matched
}

/** رابط التفعيل اللي تطبيقات المصادقة بتفهمه (بيتفتح على الموبايل، أو بيتحوّل QR من أي أداة) */
export function otpauthUrl(issuer: string, account: string, secretBase32: string): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`
  return `otpauth://totp/${label}?secret=${secretBase32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_STEP_SECONDS}`
}

// ===== تشفير السر في القاعدة =====
// AES-256-GCM بمفتاح مشتق من سر الخادم (JWT_SECRET): نسخة من القاعدة لوحدها ماتطلّعش أسرار التطبيقات. تغيير JWT_SECRET بيخلّي
// الأسرار المتخزّنة ماتتفكّش — أصحابها بيفعّلوا من جديد (مدير النظام بيعيد الضبط).
const SEAL_VERSION = 'v1'
const sealKey = (serverSecret: string): Buffer => Buffer.from(crypto.hkdfSync('sha256', Buffer.from(serverSecret), Buffer.from('hr-totp'), Buffer.from('totp-secret-v1'), 32))

export function sealTotpSecret(secretBase32: string, serverSecret: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', sealKey(serverSecret), iv)
  const sealed = Buffer.concat([cipher.update(secretBase32, 'utf8'), cipher.final()])
  return [SEAL_VERSION, iv.toString('base64'), cipher.getAuthTag().toString('base64'), sealed.toString('base64')].join('.')
}
/** null لو النص مش بصيغتنا أو اتغيّر أو مفتاحه مش مفتاح الخادم الحالي */
export function openTotpSecret(sealed: unknown, serverSecret: string): string | null {
  const parts = typeof sealed === 'string' ? sealed.split('.') : []
  if (parts.length !== 4 || parts[0] !== SEAL_VERSION) return null
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', sealKey(serverSecret), Buffer.from(parts[1], 'base64'))
    decipher.setAuthTag(Buffer.from(parts[2], 'base64'))
    const secret = Buffer.concat([decipher.update(Buffer.from(parts[3], 'base64')), decipher.final()]).toString('utf8')
    return base32Decode(secret) ? secret : null
  } catch {
    return null
  }
}
