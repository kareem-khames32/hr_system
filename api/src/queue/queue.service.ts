import { raiseDocumentAlerts } from '../assets/document-expiry'
import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DataSource, type EntityManager } from 'typeorm'
import * as os from 'os'
import { ModulesService } from '../modules-registry/modules.service'
import { enqueueQueueJob, QUEUE_DEFAULT_MAX_ATTEMPTS, queueTablesReady, recordOutboxEvent, type DomainEventType } from './outbox'

// B2.3: الطابور (jobs_queue) والعامل اللي بيوزع الـoutbox ويشغّل المهام.
// - التوزيع: كل حدث ماتوزعش بيتحول لمهمة لكل مستهلك مشترك في نوعه، بمفتاح منع تكرار «حدث:مستهلك»، وبعدين بيتعلّم «اتوزع».
// - السحب: UPDLOCK + READPAST + ROWLOCK — نسختين من الـAPI مابياخدوش نفس المهمة، ومحدش بيستنى التاني.
// - النتيجة: نجاح = DONE. فشل = إعادة بعد مهلة بتزيد (30 ثانية × 2^(المحاولة-1)، لحد ساعة). بعد الحد الأقصى = DEAD برسالته.
// - مهمة اتمسكت ووقفت (العامل وقع) بترجع PENDING بعد 10 دقايق (أو DEAD لو خلّصت محاولاتها).
// التسليم «مرة على الأقل»: المستهلك لازم يبقى آمن للتكرار.

export interface QueueJobContext { jobId: string; attempt: number; maxAttempts: number }
export type QueueJobHandler = (payload: unknown, context: QueueJobContext) => Promise<void>
interface Registered { handler: QueueJobHandler; maxAttempts: number }
interface ClaimedJob { id: string; jobType: string; payload: string | null; attempts: number; maxAttempts: number }

export const QUEUE_STALE_AFTER_MS = 10 * 60_000
// المهمة المنتهية (DONE) بتتمسح بعد المدة دي — نفس مدة سجل المهام المجدولة
export const QUEUE_DONE_KEEP_DAYS = 30
export const DOCUMENT_EXPIRY_WINDOW_DAYS = 30
export { QUEUE_DEFAULT_MAX_ATTEMPTS } from './outbox'
const BACKOFF_BASE_MS = 30_000, BACKOFF_MAX_MS = 3_600_000
export const queueBackoffMs = (attempt: number) => Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** Math.max(0, attempt - 1))
const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error ?? 'خطأ غير معروف')).replace(/\s+/g, ' ').trim().slice(0, 1000)

@Injectable()
export class QueueService {
  private readonly logger = new Logger('Queue')
  private readonly handlers = new Map<string, Registered>()
  private readonly subscriptions = new Map<DomainEventType, Set<string>>()
  readonly host = `${os.hostname()}:${process.pid}`.slice(0, 120)

  constructor(private readonly ds: DataSource, private readonly modules: ModulesService) {}

  /** مستهلك لنوع مهمة (اسم ثابت — بيتسجل في المهمة، فتغييره بيسيب المهام القديمة من غير مستهلك) */
  registerHandler(jobType: string, handler: QueueJobHandler, options: { maxAttempts?: number } = {}) {
    if (!/^[a-z][a-z0-9_.-]{1,59}$/.test(jobType)) throw new Error(`اسم المهمة «${jobType}» غير صالح`)
    this.handlers.set(jobType, { handler, maxAttempts: Math.max(1, Math.min(50, options.maxAttempts ?? QUEUE_DEFAULT_MAX_ATTEMPTS)) })
  }

  /** المستهلك ده بياخد كل حدث من النوع ده (مهمة لكل حدث) */
  subscribe(eventType: DomainEventType, jobType: string) {
    if (!this.subscriptions.has(eventType)) this.subscriptions.set(eventType, new Set())
    this.subscriptions.get(eventType)!.add(jobType)
  }

  /** مهمة مباشرة في نفس معاملة em (من غير حدث). key = منع التكرار. قبل الترحيل: false */
  async enqueue(em: EntityManager, input: { jobType: string; payload?: unknown; key?: string | null; runAfter?: Date | null }): Promise<boolean> {
    if (!(await queueTablesReady(em))) return false
    return this.insertJob(em, input.jobType, input.payload ?? null, input.key ?? null, null, input.runAfter ?? null)
  }

  // الإدخال نفسه في outbox.ts (enqueueQueueJob): الكود اللي معاه em بس بيستعمله مباشرة
  private insertJob(em: EntityManager, jobType: string, payload: unknown, key: string | null, outboxEventId: string | null, runAfter: Date | null): Promise<boolean> {
    return enqueueQueueJob(em, { jobType, payload, key, runAfter, outboxEventId, maxAttempts: this.handlers.get(jobType)?.maxAttempts })
  }

  /** توزيع دفعة من الـoutbox (حدث من غير مستهلك بيتعلّم «اتوزع» من غير مهام) */
  async dispatchOutbox(limit = 100): Promise<number> {
    if (!(await queueTablesReady(this.ds.manager))) return 0
    return this.ds.transaction(async em => {
      const events: Array<{ id: string; eventType: DomainEventType; entityType: string | null; entityId: string | null; payload: string | null; createdAt: Date }> =
        await em.query(`SELECT TOP (@0) [id], [eventType], [entityType], [entityId], [payload], [createdAt] FROM [outbox_events] WITH (UPDLOCK, READPAST, ROWLOCK)
          WHERE [dispatchedAt] IS NULL ORDER BY [id]`, [limit])
      for (const event of events) {
        let payload: unknown = null
        try { payload = event.payload ? JSON.parse(event.payload) : null } catch { payload = null }
        for (const jobType of this.subscriptions.get(event.eventType) ?? []) {
          await this.insertJob(em, jobType, { event: { id: String(event.id), type: event.eventType, entityType: event.entityType, entityId: event.entityId, payload, at: event.createdAt } },
            `event:${event.id}:${jobType}`, String(event.id), null)
        }
        await em.query(`UPDATE [outbox_events] SET [dispatchedAt] = SYSUTCDATETIME() WHERE [id] = @0 AND [dispatchedAt] IS NULL`, [event.id])
      }
      return events.length
    })
  }

  /** مهام اتمسكت من عامل وقف: ترجع PENDING (أو DEAD لو خلّصت محاولاتها) */
  async recoverStale(staleMs = QUEUE_STALE_AFTER_MS): Promise<number> {
    if (!(await queueTablesReady(this.ds.manager))) return 0
    const rows: unknown[] = await this.ds.query(`UPDATE [jobs_queue] SET
        [status] = CASE WHEN [attempts] >= [maxAttempts] THEN N'DEAD' ELSE N'PENDING' END,
        [lastError] = N'العامل وقف والمهمة ماسكها (السيرفر وقع أو اتقفل)', [lockedBy] = NULL, [lockedAt] = NULL,
        [finishedAt] = CASE WHEN [attempts] >= [maxAttempts] THEN SYSUTCDATETIME() ELSE NULL END
      OUTPUT INSERTED.[id]
      WHERE [status] = N'RUNNING' AND [lockedAt] < DATEADD(millisecond, -@0, SYSUTCDATETIME())`, [Math.max(1000, Math.round(staleMs))])
    return rows.length
  }

  /** سحب مهام جاهزة (أقدم الأول) */
  async claim(limit = 20): Promise<ClaimedJob[]> {
    const jobTypes = [...this.handlers.keys()]
    if (!jobTypes.length || !(await queueTablesReady(this.ds.manager))) return []
    const rows: ClaimedJob[] = await this.ds.query(`WITH due AS (
        SELECT TOP (@0) * FROM [jobs_queue] WITH (UPDLOCK, READPAST, ROWLOCK)
        WHERE [status] = N'PENDING' AND [runAfter] <= SYSUTCDATETIME() AND [jobType] IN (SELECT [value] FROM OPENJSON(@2))
        ORDER BY [runAfter], [id])
      UPDATE due SET [status] = N'RUNNING', [attempts] = [attempts] + 1, [lockedBy] = @1, [lockedAt] = SYSUTCDATETIME()
      OUTPUT INSERTED.[id], INSERTED.[jobType], INSERTED.[payload], INSERTED.[attempts], INSERTED.[maxAttempts]`, [limit, this.host, JSON.stringify(jobTypes)])
    return rows.map(row => ({ ...row, id: String(row.id), attempts: Number(row.attempts), maxAttempts: Number(row.maxAttempts) }))
  }

  private async finish(job: ClaimedJob, error: unknown | null) {
    if (error == null) {
      await this.ds.query(`UPDATE [jobs_queue] SET [status] = N'DONE', [finishedAt] = SYSUTCDATETIME(), [lockedBy] = NULL, [lockedAt] = NULL
        WHERE [id] = @0 AND [status] = N'RUNNING' AND [lockedBy] = @1`, [job.id, this.host])
      return 'DONE' as const
    }
    const dead = job.attempts >= job.maxAttempts
    await this.ds.query(`UPDATE [jobs_queue] SET [status] = @2, [lastError] = @3, [lockedBy] = NULL, [lockedAt] = NULL,
        [runAfter] = CASE WHEN @2 = N'PENDING' THEN DATEADD(millisecond, @4, SYSUTCDATETIME()) ELSE [runAfter] END,
        [finishedAt] = CASE WHEN @2 = N'DEAD' THEN SYSUTCDATETIME() ELSE NULL END
      WHERE [id] = @0 AND [status] = N'RUNNING' AND [lockedBy] = @1`, [job.id, this.host, dead ? 'DEAD' : 'PENDING', errorText(error), queueBackoffMs(job.attempts)])
    return dead ? 'DEAD' as const : 'RETRY' as const
  }

  /** دورة واحدة: المتعطل، والتوزيع، والمهام الجاهزة. بترجع العدّ */
  async runOnce(options: { limit?: number } = {}) {
    const result = { recovered: 0, dispatched: 0, done: 0, retried: 0, dead: 0 }
    if (!(await queueTablesReady(this.ds.manager))) return result
    result.recovered = await this.recoverStale()
    result.dispatched = await this.dispatchOutbox()
    for (const job of await this.claim(options.limit ?? 20)) {
      const registered = this.handlers.get(job.jobType)
      let failure: unknown = null
      try {
        if (!registered) throw new Error(`مفيش مستهلك للمهمة «${job.jobType}»`)
        await registered.handler(job.payload ? JSON.parse(job.payload) : null, { jobId: job.id, attempt: job.attempts, maxAttempts: job.maxAttempts })
      } catch (error) {
        failure = error ?? new Error('خطأ غير معروف')
        this.logger.warn(`المهمة #${job.id} (${job.jobType}) فشلت في المحاولة ${job.attempts}: ${errorText(error)}`)
      }
      const outcome = await this.finish(job, failure)
      if (outcome === 'DONE') result.done++
      else if (outcome === 'RETRY') result.retried++
      else result.dead++
    }
    return result
  }

  /**
   * «مستند هينتهي» (المهمة اليومية documents.expiry-events): مستندات الموظفين النشطين اللي هتنتهي من النهارده لحد 30 يوم — حدث واحد لكل
   * مستند وتاريخ انتهاء (eventKey)، فالتشغيل كل يوم مابيكررش، وتجديد المستند بتاريخ جديد بيعمل حدث جديد. بيرجّع عدد الأحداث الجديدة.
   */
  async recordDocumentExpiryEvents(today: string = new Date().toLocaleDateString('en-CA'), windowDays = DOCUMENT_EXPIRY_WINDOW_DAYS): Promise<number> {
    // موديول المستندات أساسي فدايمًا مفعّل، والفحص هنا زي باقي دوال الشغل المجدولة (النداء المباشر واللحاق)
    if (!(await this.modules.jobEnabled('documents.expiry-events'))) return 0
    if (!(await queueTablesReady(this.ds.manager))) return 0
    // B2.15: التنبيه بأيام نوع المستند (الافتراضي نفس النافذة: 30 يوم)، ومعاه مهمة التجديد على المسؤول — assets/document-expiry.ts
    return (await this.documentAlerts(today)).events
  }

  /** شغل المهمة بعد بواباتها: حدث لكل مستند وصل ليوم تنبيه، ومهمة تجديد لو النوع له مسؤول */
  documentAlerts(today: string) {
    return raiseDocumentAlerts(this.ds, today)
  }

  /**
   * مسح المهام المنتهية بنجاح (DONE) الأقدم من 30 يوم (مع مهمة scheduler.prune-runs). الميتة (DEAD) والمستنية مابتتمسحش،
   * والأحداث نفسها (outbox_events) بتفضل: مفتاح منع تكرار الحدث لازم يفضل موجود. بيرجّع عدد الصفوف.
   */
  async pruneDone(now: Date = new Date(), keepDays = QUEUE_DONE_KEEP_DAYS): Promise<number> {
    if (!(await queueTablesReady(this.ds.manager))) return 0
    const before = new Date(now.getTime() - Math.max(1, keepDays) * 86_400_000).toISOString().slice(0, 23)
    let total = 0
    // على دفعات: مسح كبير في جملة واحدة بيمسك الجدول اللي العامل بيسحب منه. الجملة بتبدأ بـWITH (زي السحب): جملة بتبدأ بـDELETE
    // المشغّل بيرجّع لها [الصفوف، العدد] مش الصفوف
    for (;;) {
      const rows: unknown[] = await this.ds.query(`WITH old AS (
          SELECT TOP (2000) * FROM [jobs_queue] WHERE [status] = N'DONE' AND [finishedAt] < CONVERT(datetime2, @0, 126) ORDER BY [id])
        DELETE FROM old OUTPUT DELETED.[id]`, [before])
      total += rows.length
      if (rows.length < 2000) return total
    }
  }

  /** شاشة الطابور: العدّ بكل حالة، وآخر الأحداث الماتوزعتش، وآخر المهام الميتة برسايلها */
  async overview() {
    if (!(await queueTablesReady(this.ds.manager))) return { available: false as const }
    const counts: Array<{ status: string; n: number }> = await this.ds.query(`SELECT [status], COUNT(*) AS [n] FROM [jobs_queue] GROUP BY [status]`)
    const [pending] = await this.ds.query(`SELECT COUNT(*) AS [n] FROM [outbox_events] WHERE [dispatchedAt] IS NULL`)
    const dead = await this.ds.query(`SELECT TOP (20) [id], [jobType], [attempts], [maxAttempts], [lastError], [createdAt], [finishedAt] FROM [jobs_queue]
      WHERE [status] = N'DEAD' ORDER BY [id] DESC`)
    const byStatus = Object.fromEntries(['PENDING', 'RUNNING', 'DONE', 'DEAD'].map(status => [status, Number(counts.find(row => row.status === status)?.n ?? 0)]))
    return { available: true as const, jobs: byStatus, outboxPending: Number(pending?.n ?? 0),
      dead: dead.map((row: Record<string, unknown>) => ({ ...row, id: String(row.id) })) }
  }

  /** إعادة مهمة ميتة: ترجع PENDING بمحاولات جديدة */
  async retryDead(id: string) {
    if (!/^\d{1,18}$/.test(id)) throw new NotFoundException('المهمة غير موجودة')
    const rows: unknown[] = await this.ds.query(`UPDATE [jobs_queue] SET [status] = N'PENDING', [attempts] = 0, [runAfter] = SYSUTCDATETIME(), [finishedAt] = NULL
      OUTPUT INSERTED.[id] WHERE [id] = @0 AND [status] = N'DEAD'`, [id])
    if (!rows.length) throw new NotFoundException('المهمة غير موجودة أو مش ميتة')
    return { id, status: 'PENDING' }
  }
}
