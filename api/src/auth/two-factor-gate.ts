import { mailConfigGaps, readMailConfig } from './mail.service'

// ===== بوابة فتح التحقق بخطوتين =====
// مفتاح واحد في requests_config بيفتح التحقق لكل مسارات الدخول. بيتسلّم مقفول.
// الخطر الوحيد الحقيقي: يتفتح وخادم البريد مش مضبوط → الشركة كلها، والمالك نفسه، تتقفل برّه النظام.
// فالفتح مرفوض لو إعداد SMTP ناقص. القفل مسموح دايمًا (مفيش قفل بيتمنع).
export const TWO_FACTOR_CONFIG_KEY = 'auth.two_factor_enabled'

/**
 * سبب منع كتابة المفتاح — null = مسموح.
 * دالة نقية بتقرا البيئة: مفيش DI ولا اتصال، فالإعدادات والاختبارات بيستخدموها بنفس الشكل.
 */
export function twoFactorEnableBlock(
  key: string,
  value: string,
  env: Record<string, unknown> = process.env as unknown as Record<string, unknown>
): string | null {
  if (key !== TWO_FACTOR_CONFIG_KEY) return null
  if (String(value).trim().toLowerCase() !== 'true') return null
  const gaps = mailConfigGaps(readMailConfig(env))
  if (gaps.length === 0) return null
  return (
    `مينفعش تفتح التحقق بخطوتين وخادم البريد مش مضبوط (ناقص ${gaps.join(', ')} في api/.env) — ` +
    'كل الحسابات هتتقفل برّه النظام. اضبط البريد، افحصه بزر «فحص إرسال البريد»، وبعدها افتحه.'
  )
}
