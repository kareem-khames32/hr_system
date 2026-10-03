import { AsyncLocalStorage } from 'node:async_hooks'
import { Logger } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { AuditLog } from './audit-log.entity'

// B2.1: سجل التدقيق المركزي — التسجيل نفسه (من غير حقن) عشان أي خدمة أو مستمع يكتب في نفس معاملة العملية.

export const AUDIT_CATEGORIES = ['LOGIN', 'PERMISSIONS', 'SETTINGS', 'BANK_PAYROLL', 'EXPORT', 'PAYROLL'] as const
export type AuditCategory = typeof AUDIT_CATEGORIES[number]
export const AUDIT_CATEGORY_LABELS: Record<AuditCategory, string> = {
  LOGIN: 'الدخول', PERMISSIONS: 'الصلاحيات والنطاق', SETTINGS: 'الإعدادات والموديولات', BANK_PAYROLL: 'البيانات البنكية والرواتب',
  EXPORT: 'التصدير', PAYROLL: 'إجراءات المسير',
}
export const AUDIT_RETENTION_KEY = 'audit.retention_months'
export const AUDIT_RETENTION_DEFAULT = 24
export const AUDIT_RETENTION_MIN = 12
export const AUDIT_MIGRATION_MISSING = 'سجل التدقيق محتاج ترحيل 20261003_084 على قاعدة البيانات'

export interface AuditEntryInput {
  category: AuditCategory
  action: string
  entityType?: string | null
  entityId?: string | number | null
  actorUserId?: number | null
  branchId?: number | null
  summary?: string | null
  before?: unknown
  after?: unknown
  // من الحدث نفسه لو عنده (سجل الدخول)، وإلا من سياق الطلب
  ip?: string | null
  userAgent?: string | null
}

/** سياق الطلب (الـIP والجهاز) — بيتملي من وسيط في أول الطلب ويتقرا من أي مكان جوه نفس الطلب */
export interface AuditRequestContext { ip: string | null; userAgent: string | null; userId?: number | null }
export const auditRequestContext = new AsyncLocalStorage<AuditRequestContext>()

const logger = new Logger('AuditLog')
let ready: boolean | null = null, checkedAt = 0, warned = false

/** الجدول موجود (ترحيل 084)؟ الموجود بيتحفظ، والناقص بيتفحص تاني كل دقيقة */
export async function auditTableReady(em: EntityManager): Promise<boolean> {
  if (ready === true || (ready === false && Date.now() - checkedAt < 60_000)) return ready
  const [row] = await em.query(`SELECT OBJECT_ID(N'dbo.audit_log', N'U') AS [id]`)
  ready = row?.id != null
  checkedAt = Date.now()
  if (!ready && !warned) { warned = true; logger.warn(AUDIT_MIGRATION_MISSING + ' — الأحداث مش بتتسجل لحد ما يتطبق') }
  return ready
}

const SECRET_KEY = /pass(word)?|secret|token|api[_.-]?key|private|credential/i
const json = (value: unknown) => value === undefined ? null : JSON.stringify(value, (key, item) => SECRET_KEY.test(key) ? '***' : item)
const text = (value: unknown, max: number) => value == null ? null : String(value).slice(0, max)
const actorOf = (value: unknown) => Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : null

/** تسجيل حدث في نفس معاملة em. قبل الترحيل: مفيش تسجيل (تحذير واحد). القيم اللي اسمها شبه كلمة سر أو مفتاح بتتخفي */
export async function recordAudit(em: EntityManager, entry: AuditEntryInput): Promise<void> {
  if (!(await auditTableReady(em))) return
  const context = auditRequestContext.getStore()
  await em.getRepository(AuditLog).insert({
    at: new Date(), category: entry.category, action: text(entry.action, 60)!, entityType: text(entry.entityType, 40),
    entityId: text(entry.entityId, 60), actorUserId: actorOf(entry.actorUserId ?? context?.userId ?? null),
    branchId: Number.isSafeInteger(entry.branchId) && Number(entry.branchId) > 0 ? Number(entry.branchId) : null,
    summary: text(entry.summary, 500), before: json(entry.before), after: json(entry.after),
    ip: text(entry.ip ?? context?.ip ?? null, 64), userAgent: text(entry.userAgent ?? context?.userAgent ?? null, 300),
  })
}

/** للاختبارات: نسيان حالة الجدول (بعد ترحيل أو حذف في قاعدة تجربة) */
export function resetAuditTableCache() { ready = null; checkedAt = 0; warned = false }
