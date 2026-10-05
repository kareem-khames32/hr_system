import { Logger } from '@nestjs/common'
import type { EntityManager } from 'typeorm'

// B2.4: قراءة الإشعارات المخزّنة من غير حقن خدمة — PortalController (قايمة الإشعارات الموجودة) بيناديها بالـem اللي معاه،
// زي hiringDocumentsNotification. قبل ترحيل 087: مفيش جداول، فالقايمة الحالية زي ما هي.

export const NOTIFICATIONS_MIGRATION_MISSING = 'محرك الإشعارات محتاج ترحيل 20261005_087 على قاعدة البيانات'
// الإشعار المخزّن بيفضل في القايمة المدة دي، وأقصى عدد منه في القايمة
export const IN_APP_KEEP_DAYS = 60
export const IN_APP_LIMIT = 20

const logger = new Logger('Notifications')
let ready: boolean | null = null, checkedAt = 0, warned = false

/** الجداول موجودة (ترحيل 087)؟ الموجود بيتحفظ، والناقص بيتفحص تاني كل دقيقة */
export async function notificationTablesReady(em: EntityManager): Promise<boolean> {
  if (ready === true || (ready === false && Date.now() - checkedAt < 60_000)) return ready
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.notifications', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.notification_deliveries', N'U') IS NOT NULL
    AND OBJECT_ID(N'dbo.notification_templates', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.notification_preferences', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  checkedAt = Date.now()
  if (!ready && !warned) { warned = true; logger.warn(NOTIFICATIONS_MIGRATION_MISSING + ' — مفيش إشعار بيتخزن ولا بريد بيتبعت لحد ما يتطبق') }
  return ready
}

/** للاختبارات: نسيان حالة الجداول */
export function resetNotificationTablesCache() { ready = null; checkedAt = 0; warned = false }

export interface StoredNotificationItem { id: string; kind: string; category: string; title: string; body: string; at: Date; link: string }

/**
 * إشعارات الحساب المخزّنة اللي بتظهر في القايمة (الأحدث الأول) — بنفس شكل العنصر المحسوب، ورقمها «n-<id>» في notification_reads.
 * اللينك مسار الشاشة من غير استعلام: القايمة بتفحص بيه إن الشاشة متاحة للمستخدم (routeAvailable).
 * الإشعار بيظهر طول ما اللي بيقوله لسه صحيح: «قسيمتك ظهرت» طول ما القسيمة نفسها ظاهرة (مسير معتمد أو مصروف ليه بند لموظف الحساب — نفس شرط
 * «قسائم راتبي»)، فمسير اتفتح تاني أو موظف اتشال منه إشعاره بيختفي. ونفس الحدث على نفس الكيان أكتر من مرة (اتفتح واتعتمد تاني) = الأحدث بس.
 */
export async function storedInAppNotifications(em: EntityManager, userId: number): Promise<StoredNotificationItem[]> {
  if (!(await notificationTablesReady(em))) return []
  const rows: Array<{ id: string; eventCode: string; entityType: string | null; entityId: string | null; kind: string; category: string; title: string; body: string;
    createdAt: Date; link: string }> = await em.query(
    `SELECT TOP (${IN_APP_LIMIT * 3}) n.[id], n.[eventCode], n.[entityType], n.[entityId], n.[kind], n.[category], n.[title], n.[body], n.[createdAt], n.[link]
     FROM [notifications] n
     WHERE n.[recipientUserId] = @0 AND n.[inApp] = 1 AND n.[createdAt] >= @1
       AND (n.[entityType] IS NULL OR n.[entityType] <> N'payroll_run' OR EXISTS (
         SELECT 1 FROM [payroll_runs] r INNER JOIN [payroll_items] i ON i.[runId] = r.[id] INNER JOIN [users] u ON u.[employeeId] = i.[employeeId]
         WHERE u.[id] = n.[recipientUserId] AND r.[id] = TRY_CAST(n.[entityId] AS int) AND r.[status] IN (N'APPROVED', N'PAID')))
     ORDER BY n.[id] DESC`, [userId, new Date(Date.now() - IN_APP_KEEP_DAYS * 86_400_000)])
  const seen = new Set<string>(), out: StoredNotificationItem[] = []
  for (const row of rows) {
    const key = `${row.eventCode}:${row.entityType}:${row.entityId}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ id: `n-${row.id}`, kind: row.kind, category: row.category, title: row.title, body: row.body, at: row.createdAt, link: String(row.link).split('?')[0] })
    if (out.length >= IN_APP_LIMIT) break
  }
  return out
}
