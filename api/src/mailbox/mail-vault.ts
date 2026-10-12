import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import type { SessionCookieOptions } from '../auth/session-cookie'

// B-ADD.16: مخزن كلمة سر البريد للجلسة — قواعد صرف من غير DI ولا اتصال (الخدمة mail-vault.service.ts، والاختبارات بتستخدمه بنفس الشكل).
//
// موافقة المالك (12 أكتوبر 2026): النظام يمسك كلمة مرور الموظف في الشركة مشفّرة طول الجلسة عشان يفتح بيها بريده على Exchange.
// التصميم «مفتاح مقسوم» زي المصدر، من غير Redis:
//   - الخادم: النص المشفّر بس (AES-256-GCM) في ذاكرة العملية — لا قاعدة بيانات ولا ملف ولا سجل.
//   - المتصفح: المفتاح (256 بت) بس، في cookie مابتتقريش من سكربت الصفحة ومابتتبعتش غير لمسارات البريد.
// نص من غير مفتاحه مابيتفكش، ومفتاح من غير نصه مالوش قيمة — لازم الاتنين. النص مربوط بالجلسة نفسها (الحساب وإصدار التوكن ورقم الجلسة) في
// بيانات التوثيق (AAD)، فمفتاح جلسة مايفتحش نص جلسة تانية ولا حساب تاني. العمر = مدة الجلسة وبيتجدد مع الاستخدام، وبيتمسح مع الخروج.

export const MAIL_KEY_COOKIE = 'hr_mail_key'
/** الـcookie لمسارات البريد بس (البادئة العامة api + مسار الموديول) */
export const MAIL_KEY_COOKIE_PATH = '/api/mail'
const KEY_BYTES = 32, IV_BYTES = 12, TAG_BYTES = 16
const KEY_RE = /^[A-Za-z0-9_-]{43}$/

/** الجلسة اللي النص مربوط بيها — كلها من التوكن، ولا خانة منها من طلب */
export interface VaultScope { userId: number; tokenVersion: number; sid: string | null }

export const vaultScopeOf = (payload: { sub: number; tokenVersion?: number; sid?: string }): VaultScope => ({
  userId: payload.sub, tokenVersion: payload.tokenVersion ?? 0, sid: payload.sid ?? null,
})

const bindingOf = (scope: VaultScope) => `${scope.userId}:${scope.tokenVersion}:${scope.sid ?? ''}`
/** اسم الخانة في الذاكرة مايكشفش الحساب */
const slotOf = (scope: VaultScope) => createHash('sha256').update(`mail-vault:${bindingOf(scope)}`).digest('hex')

interface VaultEntry { userId: number; tokenVersion: number; blob: Buffer; expiresAt: number; hardExpiresAt: number | null }

/**
 * المخزن نفسه: خريطة في الذاكرة. `ttlMs` عمر الخانة من آخر استخدام (مدة الجلسة)، و`now` ساعة قابلة للتبديل في الاختبار.
 * مفيش دالة هنا بترجّع النص المشفّر ولا المفتاح لحد غير صاحب الطلب، ومفيش حاجة بتتسجّل.
 */
export class MailVault {
  private readonly entries = new Map<string, VaultEntry>()

  constructor(private readonly ttlMs: () => number, private readonly now: () => number = () => Date.now()) {}

  get size(): number { return this.entries.size }

  /** نص جلسات الحساب اللي بإصدار توكن أقدم: التوكن بتاعها مات (تغيير كلمة مرور أو صلاحية أو تعطيل) فبتتمسح */
  private dropStale(scope: VaultScope) {
    for (const [slot, entry] of this.entries) if (entry.userId === scope.userId && entry.tokenVersion !== scope.tokenVersion) this.entries.delete(slot)
  }

  /**
   * بيخزن كلمة السر مشفّرة للجلسة دي وبيرجّع المفتاح للمتصفح (base64url) — المفتاح مابيتحفظش هنا.
   * hardExpiresAt: نهاية التوكن نفسه لو معروفة (الخانة ماتعيش بعدها حتى لو بتتستخدم).
   */
  store(scope: VaultScope, password: string, hardExpiresAt: number | null = null): string {
    this.dropStale(scope)
    const key = randomBytes(KEY_BYTES), iv = randomBytes(IV_BYTES)
    const cipher = createCipheriv('aes-256-gcm', key, iv)
    cipher.setAAD(Buffer.from(bindingOf(scope)))
    const data = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()])
    const now = this.now()
    this.entries.set(slotOf(scope), { userId: scope.userId, tokenVersion: scope.tokenVersion, blob: Buffer.concat([iv, cipher.getAuthTag(), data]),
      expiresAt: now + this.ttlMs(), hardExpiresAt })
    const out = key.toString('base64url')
    key.fill(0)
    return out
  }

  private live(scope: VaultScope): VaultEntry | null {
    this.dropStale(scope)
    const slot = slotOf(scope), entry = this.entries.get(slot)
    if (!entry) return null
    const now = this.now()
    if (entry.expiresAt <= now || (entry.hardExpiresAt !== null && entry.hardExpiresAt <= now)) {
      this.entries.delete(slot)
      return null
    }
    return entry
  }

  /** فيه نص مخزّن للجلسة دي ولسه في عمره؟ (من غير مفتاح — مابيفكش حاجة) */
  has(scope: VaultScope): boolean { return this.live(scope) !== null }

  /** كلمة السر بمفتاح المتصفح، أو null (مفيش نص، أو خلص عمره، أو المفتاح غلط أو متلاعب فيه). القراءة الصح بتجدد العمر */
  read(scope: VaultScope, browserKey: string | null | undefined): string | null {
    const entry = this.live(scope)
    if (!entry || typeof browserKey !== 'string' || !KEY_RE.test(browserKey)) return null
    const key = Buffer.from(browserKey, 'base64url')
    try {
      const decipher = createDecipheriv('aes-256-gcm', key, entry.blob.subarray(0, IV_BYTES))
      decipher.setAAD(Buffer.from(bindingOf(scope)))
      decipher.setAuthTag(entry.blob.subarray(IV_BYTES, IV_BYTES + TAG_BYTES))
      const plain = Buffer.concat([decipher.update(entry.blob.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]).toString('utf8')
      entry.expiresAt = this.now() + this.ttlMs()
      return plain
    } catch {
      return null
    } finally {
      key.fill(0)
    }
  }

  /** الخروج (أو قفل البريد): نص الجلسة دي بيتمسح */
  drop(scope: VaultScope): boolean { return this.entries.delete(slotOf(scope)) }

  /** كل نصوص الحساب (كل جلساته) */
  dropUser(userId: number): number {
    let dropped = 0
    for (const [slot, entry] of this.entries) if (entry.userId === userId && this.entries.delete(slot)) dropped++
    return dropped
  }

  /** تنضيف اللي خلص عمره (الخدمة بتناديه كل دقيقة) */
  sweep(): number {
    const now = this.now()
    let dropped = 0
    for (const [slot, entry] of this.entries) {
      if (entry.expiresAt <= now || (entry.hardExpiresAt !== null && entry.hardExpiresAt <= now)) { this.entries.delete(slot); dropped++ }
    }
    return dropped
  }

  clear() { this.entries.clear() }
}

// ===== cookie المفتاح =====

/** على HTTPS بالبادئة ‎__Secure-‎ (المتصفح مابيقبلهاش غير Secure)؛ ‎__Host-‎ ماتنفعش هنا عشان المسار مش / */
export const mailKeyCookieName = (options: SessionCookieOptions): string => (options.secure ? `__Secure-${MAIL_KEY_COOKIE}` : MAIL_KEY_COOKIE)

/**
 * قيمة Set-Cookie لمفتاح البريد: HttpOnly، لمسارات البريد بس، وبنفس SameSite و Secure بتوع cookie الجلسة (Strict افتراضيًا).
 * من غير Max-Age عن قصد: cookie جلسة متصفح — المفتاح مابيتكتبش على قرص الجهاز، وقفل المتصفح بيمسحه.
 */
export function mailKeyCookieHeader(key: string, options: SessionCookieOptions): string {
  return [`${mailKeyCookieName(options)}=${key}`, `Path=${MAIL_KEY_COOKIE_PATH}`, 'HttpOnly', `SameSite=${options.sameSite}`, ...(options.secure ? ['Secure'] : [])].join('; ')
}

/** قيمة Set-Cookie اللي بتمسح المفتاح من المتصفح (نفس الاسم والمسار، وعمر صفر) */
export function clearedMailKeyCookieHeader(options: SessionCookieOptions): string {
  return [`${mailKeyCookieName(options)}=`, `Path=${MAIL_KEY_COOKIE_PATH}`, 'HttpOnly', `SameSite=${options.sameSite}`, ...(options.secure ? ['Secure'] : []), 'Max-Age=0'].join('; ')
}

// ===== محاولات «افتح بريدك» =====

export const MAIL_UNLOCK_LIMIT = { maxAttempts: 5, minutes: 15 } as const

/**
 * عدّاد محاولات كلمة سر البريد الغلط لكل حساب (في الذاكرة): خمس محاولات غلط ورا بعض = قفل ربع ساعة. أقل من حد قفل الدخول عن قصد —
 * كل محاولة غلط بتتعدّ على الموظف في المجال نفسه، والمجال بيقفل حسابه بعد عدد من المحاولات.
 */
export class UnlockAttempts {
  private readonly rows = new Map<number, { count: number; lockedUntil: number | null }>()

  constructor(private readonly now: () => number = () => Date.now()) {}

  /** مقفول لحد إمتى (ms) أو null */
  lockedUntil(userId: number): number | null {
    const row = this.rows.get(userId)
    if (!row?.lockedUntil) return null
    if (row.lockedUntil > this.now()) return row.lockedUntil
    this.rows.delete(userId)
    return null
  }

  /** محاولة غلط: بيرجّع العدد بعدها، ولحد إمتى القفل لو وصل الحد */
  fail(userId: number): { count: number; lockedUntil: number | null } {
    const row = this.rows.get(userId) ?? { count: 0, lockedUntil: null }
    row.count += 1
    if (row.count >= MAIL_UNLOCK_LIMIT.maxAttempts) row.lockedUntil = this.now() + MAIL_UNLOCK_LIMIT.minutes * 60_000
    this.rows.set(userId, row)
    return { ...row }
  }

  reset(userId: number) { this.rows.delete(userId) }
}
