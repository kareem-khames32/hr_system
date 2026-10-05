import { Logger } from '@nestjs/common'
import type { EntityManager } from 'typeorm'

// B2.3: الـoutbox — الحدث بيتكتب في نفس معاملة العملية (em بتاعها). لو العملية رجعت، الحدث مش موجود أصلًا.
// قبل ترحيل 086: مفيش كتابة، وتحذير واحد في سجل الخادم.

export const DOMAIN_EVENTS = {
  EMPLOYEE_HIRED: 'تم التعيين',
  REQUEST_APPROVED: 'تم اعتماد الطلب',
  REQUEST_REJECTED: 'تم رفض الطلب',
  // B2.4: الطلب وصل لخطوة مستنية معتمد (تقديم، خطوة تالية، إعادة تقديم، تصعيد)، والطلب اترجع لصاحبه لاستكمال معلومات
  REQUEST_STEP_PENDING: 'الطلب بانتظار معتمد',
  REQUEST_RETURNED: 'الطلب أُعيد لاستكمال معلومات',
  PAYROLL_RUN_APPROVED: 'المسير اتعتمد',
  DOCUMENT_EXPIRING: 'مستند هينتهي',
  EMPLOYEE_TERMINATED: 'الموظف انتهت خدمته',
  // B2.5: مهمة اتكلّف بيها مسؤول (أو اتحوّلت له)، وموعدها قرّب، واتأخرت عن موعدها
  TASK_ASSIGNED: 'مهمة اتكلّف بيها مسؤول',
  TASK_DUE_SOON: 'موعد المهمة قرّب',
  TASK_OVERDUE: 'المهمة اتأخرت',
} as const
export type DomainEventType = keyof typeof DOMAIN_EVENTS
export const QUEUE_MIGRATION_MISSING = 'الطابور والـoutbox محتاجين ترحيل 20261003_086 على قاعدة البيانات'

export interface OutboxEventInput {
  type: DomainEventType
  entityType?: string | null
  entityId?: string | number | null
  /** أرقام ومراجع بس — من غير أسماء ولا مبالغ ولا بيانات شخصية (المستهلك بيقرا اللي محتاجه بصلاحياته) */
  payload?: Record<string, unknown> | null
  /** مفتاح منع تكرار الحدث نفسه (اختياري) */
  key?: string | null
}

const logger = new Logger('Outbox')
let ready: boolean | null = null, checkedAt = 0, warned = false

/** الجداول موجودة (ترحيل 086)؟ الموجود بيتحفظ، والناقص بيتفحص تاني كل دقيقة */
export async function queueTablesReady(em: EntityManager): Promise<boolean> {
  if (ready === true || (ready === false && Date.now() - checkedAt < 60_000)) return ready
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.outbox_events', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.jobs_queue', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  checkedAt = Date.now()
  if (!ready && !warned) { warned = true; logger.warn(QUEUE_MIGRATION_MISSING + ' — الأحداث مش بتتسجل لحد ما يتطبق') }
  return ready
}

/**
 * تسجيل حدث في نفس معاملة em. مفتاح منع التكرار لو اتكرر = الحدث موجود قبل كده، فمفيش صف جديد ولا خطأ (بيرجّع false).
 * قبل الترحيل: مفيش تسجيل (false).
 */
export async function recordOutboxEvent(em: EntityManager, input: OutboxEventInput): Promise<boolean> {
  if (!(await queueTablesReady(em))) return false
  const key = input.key ? String(input.key).slice(0, 160) : null
  const rows: Array<{ id: string }> = await em.query(`INSERT INTO [outbox_events] ([eventType], [entityType], [entityId], [payload], [eventKey], [createdAt])
    OUTPUT INSERTED.[id]
    SELECT @0, @1, @2, @3, @4, SYSUTCDATETIME() WHERE @4 IS NULL OR NOT EXISTS (SELECT 1 FROM [outbox_events] WITH (UPDLOCK, HOLDLOCK) WHERE [eventKey] = @4)`,
    [input.type, input.entityType ? String(input.entityType).slice(0, 40) : null, input.entityId == null ? null : String(input.entityId).slice(0, 60),
      input.payload == null ? null : JSON.stringify(input.payload), key])
  return rows.length === 1
}

export const QUEUE_DEFAULT_MAX_ATTEMPTS = 5

/**
 * مهمة مباشرة في الطابور في نفس معاملة em (من غير حدث) — للكود اللي معاه em بس ومش معاه خدمة الطابور (B1.14: إعادة حساب يوم اتعلّم متسخ).
 * key = منع التكرار (لو موجود قبل كده: مفيش صف جديد، false). runAfter = مايتنفذش قبل الوقت ده. قبل الترحيل: false.
 * نفس إدخال QueueService.enqueue بالحرف (هو بينادي دي).
 */
export async function enqueueQueueJob(em: EntityManager, input: { jobType: string; payload?: unknown; key?: string | null; runAfter?: Date | null;
  maxAttempts?: number; outboxEventId?: string | null
  /**
   * من غير قفل مدى على المفتاح: للمسارات الكتير المتزامنة (تعليم يوم متسخ جوه معاملات الحضور والطلبات). القفل (UPDLOCK, HOLDLOCK) بيمسك
   * فجوة في فهرس المفاتيح لآخر المعاملة، فمعاملتين طويلتين ممكن يستنوا بعض. هنا الفهرس الفريد هو الحكم: مفتاح مكرر = false من غير خطأ
   */
  lockFree?: boolean }): Promise<boolean> {
  if (!(await queueTablesReady(em))) return false
  // runAfter لحظة UTC (العمود بيتقارن بـSYSUTCDATETIME): بتتبعت نص UTC من غير منطقة، لأن مشغل mssql بيكتب Date بتوقيت الخادم المحلي
  // (useUTC=false) فكانت هتتأخر بفرق المنطقة الزمنية
  const runAfterUtc = input.runAfter instanceof Date && !Number.isNaN(input.runAfter.getTime()) ? input.runAfter.toISOString().slice(0, 23) : null
  try {
    const rows: Array<{ id: string }> = await em.query(`INSERT INTO [jobs_queue] ([jobType], [payload], [status], [attempts], [maxAttempts], [runAfter], [idempotencyKey], [outboxEventId], [createdAt])
      OUTPUT INSERTED.[id]
      SELECT @0, @1, N'PENDING', 0, @2, COALESCE(CONVERT(datetime2, @3, 126), SYSUTCDATETIME()), @4, @5, SYSUTCDATETIME()
      WHERE @4 IS NULL OR NOT EXISTS (SELECT 1 FROM [jobs_queue]${input.lockFree ? '' : ' WITH (UPDLOCK, HOLDLOCK)'} WHERE [idempotencyKey] = @4)`,
    [input.jobType, input.payload == null ? null : JSON.stringify(input.payload), input.maxAttempts ?? QUEUE_DEFAULT_MAX_ATTEMPTS, runAfterUtc,
      input.key ? input.key.slice(0, 200) : null, input.outboxEventId ?? null])
    return rows.length === 1
  } catch (error) {
    // سباق على نفس المفتاح من غير قفل: الفهرس الفريد رفض الصف التاني (2601/2627) = المهمة موجودة
    const number = Number((error as { number?: unknown; driverError?: { number?: unknown } })?.number ?? (error as { driverError?: { number?: unknown } })?.driverError?.number)
    if (input.lockFree && (number === 2601 || number === 2627)) return false
    throw error
  }
}

/** للاختبارات: نسيان حالة الجداول */
export function resetQueueTablesCache() { ready = null; checkedAt = 0; warned = false }
