import * as crypto from 'crypto'

// B2.17: الجلسة في cookie httpOnly — قواعد صرف (من غير DI ولا اتصال): اسم الـcookie وخصائصها، وقراءتها من ترويسة الطلب،
// وحكم رمز CSRF. الخادم والاختبارات بيستخدموها بنفس الشكل.
//
// الجلسة نفسها زي ما هي (JWT بيتطابق مع users.tokenVersion كل طلب). الجديد مكانها في المتصفح: cookie مابتتقريش من سكربت
// الصفحة (HttpOnly) ومابتتبعتش مع طلب جاي من موقع تاني (SameSite)، وفوقها رمز CSRF مربوط بالجلسة لطلبات الكتابة.

export const SESSION_COOKIE = 'hr_session'
export const CSRF_HEADER = 'x-csrf-token'
export const CSRF_TOKEN_INVALID = 'CSRF_TOKEN_INVALID'
export const CSRF_MESSAGE = 'الطلب من غير رمز حماية الجلسة — حدّث الصفحة وحاول تاني'
export const SESSION_SAMESITE_KEY = 'SESSION_COOKIE_SAMESITE'
export const SESSION_SECURE_KEY = 'SESSION_COOKIE_SECURE'

export type SessionSameSite = 'Strict' | 'Lax' | 'None'
export interface SessionCookieOptions { sameSite: SessionSameSite; secure: boolean }

/**
 * خصائص الـcookie من البيئة. SameSite = Strict افتراضيًا (الواجهة والخادم على نفس الموقع — المنفذ مش من الموقع)؛
 * SESSION_COOKIE_SAMESITE = lax أو none للنشر على موقعين. Secure لما عنوان الواجهة https (أو SESSION_COOKIE_SECURE=true)،
 * ودايمًا مع None (المتصفح بيرفض None من غير Secure). SESSION_COOKIE_SECURE=false بيقفلها صريح (خادم داخلي على HTTP).
 */
export function sessionCookieOptions(env: Record<string, unknown> = process.env): SessionCookieOptions {
  const raw = String(env[SESSION_SAMESITE_KEY] ?? '').trim().toLowerCase()
  const sameSite: SessionSameSite = raw === 'lax' ? 'Lax' : raw === 'none' ? 'None' : 'Strict'
  const flag = String(env[SESSION_SECURE_KEY] ?? '').trim().toLowerCase()
  const secure = sameSite === 'None' || flag === 'true' || (flag !== 'false' && /^https:\/\//i.test(String(env.FRONTEND_URL ?? '').trim()))
  return { sameSite, secure }
}

/**
 * اسم الـcookie. على HTTPS بالبادئة `__Host-`: المتصفح مابيقبلهاش غير Secure ومن غير Domain وبـPath=/، فنطاق فرعي تاني (أو صفحة
 * HTTP) مايعرفش يزرع cookie بنفس الاسم مكان جلسة المستخدم. على HTTP الاسم العادي (البادئة محتاجة Secure).
 */
export const sessionCookieName = (options: SessionCookieOptions): string => (options.secure ? `__Host-${SESSION_COOKIE}` : SESSION_COOKIE)

/** قيمة Set-Cookie لجلسة. maxAgeSeconds = null → cookie جلسة (بتتمسح مع قفل المتصفح)؛ رقم → بتفضل المدة دي («تذكرني») */
export function sessionCookieHeader(token: string, options: SessionCookieOptions, maxAgeSeconds: number | null): string {
  return [`${sessionCookieName(options)}=${token}`, 'Path=/', 'HttpOnly', `SameSite=${options.sameSite}`, ...(options.secure ? ['Secure'] : []),
    ...(maxAgeSeconds !== null ? [`Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`] : [])].join('; ')
}

/** قيمة Set-Cookie اللي بتمسح الجلسة من المتصفح (نفس الخصائص، وعمر صفر) */
export const clearedSessionCookieHeader = (options: SessionCookieOptions): string => sessionCookieHeader('', options, 0)

/** قيمة cookie باسمها من ترويسة Cookie (من غير مكتبة). الاسم مطابق بالحرف، وأول قيمة باسمه هي اللي بتتاخد */
export function readCookie(header: unknown, name: string): string | null {
  if (typeof header !== 'string' || !header) return null
  for (const part of header.split(';')) {
    const at = part.indexOf('=')
    if (at < 0 || part.slice(0, at).trim() !== name) continue
    return part.slice(at + 1).trim() || null
  }
  return null
}

type HeaderRequest = { headers?: Record<string, unknown> }
/** توكن الجلسة من cookie الطلب (بالاسم اللي الخادم بيكتبه دلوقتي بس)، أو null */
export const sessionCookieOf = (req: HeaderRequest, options: SessionCookieOptions = sessionCookieOptions()): string | null =>
  readCookie(req.headers?.cookie, sessionCookieName(options))

/** طلب قراءة (مابيغيّرش حاجة)؟ دول من غير رمز CSRF */
export const csrfSafeMethod = (method: unknown): boolean => ['GET', 'HEAD', 'OPTIONS'].includes(String(method ?? '').toUpperCase())

export const newCsrfToken = (): string => crypto.randomBytes(24).toString('hex')

/** الرمز المقدَّم هو رمز الجلسة؟ مقارنة ثابتة الزمن. جلسة من غير رمز، أو ترويسة فاضية أو مكررة = لأ */
export function csrfMatches(expected: unknown, presented: unknown): boolean {
  if (typeof expected !== 'string' || !expected || typeof presented !== 'string' || !presented) return false
  const a = Buffer.from(expected), b = Buffer.from(presented)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
