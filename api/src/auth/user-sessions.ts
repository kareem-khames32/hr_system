import type { EntityManager } from 'typeorm'

// B2.17-ب: الجلسات النشطة — قواعد صرف (غير فحص وجود الجدول): النصوص والحدود، واسم الجهاز من ترويسة المتصفح.

export const USER_SESSIONS_MIGRATION_MISSING = 'الجلسات النشطة محتاجة ترحيل 20261007_101 على قاعدة البيانات'
export const SESSION_NOT_FOUND = 'الجلسة غير موجودة'
export const SESSION_ENDED_MESSAGE = 'انتهت صلاحية الجلسة — سجّل الدخول من جديد'
/** «آخر نشاط» بيتكتب لما يعدّي عليه المدة دي (مش مع كل طلب) */
export const SESSION_TOUCH_MINUTES = 5
/** صفوف الجلسات اللي مدتها خلصت من أكتر من كده بتتنضّف مع أي دخول جديد */
export const SESSION_KEEP_DAYS = 30

let ready: boolean | null = null
/** جدول ترحيل 101 موجود؟ الموجود بيتحفظ (المخطط مابيتشالش). الناقص مابيتحفظش: بيتفحص مع كل نداء لحد ما الترحيل يتطبق. */
export async function userSessionsReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.user_sessions', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الجدول */
export function resetUserSessionsCache() { ready = null }

/** اسم مفهوم للجهاز من ترويسة User-Agent: «Chrome على Windows». ترويسة فاضية أو مش معروفة = «جهاز غير معروف» */
export function deviceLabel(userAgent: unknown): string {
  const text = typeof userAgent === 'string' ? userAgent : ''
  if (!text.trim()) return 'جهاز غير معروف'
  // الترتيب مهم: Edge وOpera بيكتبوا Chrome في ترويستهم، وChrome بيكتب Safari
  const browser = /Edg(e|A|iOS)?\//.test(text) ? 'Edge' : /OPR\/|Opera/.test(text) ? 'Opera' : /Firefox\/|FxiOS\//.test(text) ? 'Firefox'
    : /Chrome\/|CriOS\//.test(text) ? 'Chrome' : /Safari\//.test(text) ? 'Safari' : null
  const system = /Android/.test(text) ? 'Android' : /iPhone|iPad|iPod/.test(text) ? 'iOS' : /Windows NT/.test(text) ? 'Windows' : /Mac OS X|Macintosh/.test(text) ? 'macOS'
    : /Linux|X11/.test(text) ? 'Linux' : null
  if (browser && system) return `${browser} على ${system}`
  return browser ?? system ?? 'جهاز غير معروف'
}
