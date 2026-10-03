import { Injectable, Logger } from '@nestjs/common'
import { SchedulerRegistry } from '@nestjs/schedule'
import { DataSource, LessThan } from 'typeorm'
import * as os from 'os'
import { ModulesService } from '../modules-registry/modules.service'
import { systemTimeZone } from './schedule-time-zone'
import { ScheduledJobRun } from './scheduled-job-run.entity'
import { SCHEDULED_JOB_IDS, SCHEDULED_JOBS, SCHEDULED_RUNS_KEEP_DAYS, scheduledSlot, type ScheduledJobId } from './scheduled-jobs'

export type ScheduledTickOutcome = 'SUCCEEDED' | 'FAILED' | 'BUSY' | 'DUPLICATE' | 'DISABLED'

interface RunRow { id: number; jobId: string; slot: string; status: string; startedAt: Date; finishedAt: Date | null; durationMs: number | null; error: string | null; host: string | null }

// تشغيل وقف أطول من كده من غير ما يخلص = السيرفر وقف في النص (الشاشة بتقول كده بدل «شغالة» للأبد)
const ABANDONED_AFTER_MS = 6 * 3600_000
const sqlErrorNumber = (error: unknown): number | undefined => {
  const value = error as { number?: unknown; driverError?: { number?: unknown }; originalError?: { info?: { number?: unknown } } }
  const number = value?.driverError?.number ?? value?.number ?? value?.originalError?.info?.number
  return typeof number === 'number' ? number : undefined
}
const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error ?? 'خطأ غير معروف')).replace(/\s+/g, ' ').trim().slice(0, 500)

/**
 * المهام المجدولة (خطة التنفيذ B1.4): كل تشغيل من ScheduledJobsRunner بيعدي على tick:
 * 1. موديول المهمة مقفول ← مفيش تشغيل ولا صف.
 * 2. قفل SQL للمهمة (sp_getapplock على معاملة اتصال مخصص، من غير انتظار): نفس الشغل شغال في أي نسخة ← التشغيل بيتعدّى.
 * 3. صف للمهمة بخانة الدقيقة (مفتاح فريد): نسخة تانية في نفس الدقيقة ← بتتعدّى حتى لو الأولى خلصت.
 * 4. الشغل نفسه، وبعده الصف بيتقفل «نجحت» أو «فشلت» برسالته ومدته. فشل المهمة مايوقفش اللي بعدها.
 * قبل ترحيل 079 (الجدول مش موجود): القفل شغال والسجل بس اللي ناقص — تحذير واحد في سجل الخادم.
 */
@Injectable()
export class ScheduledJobsService {
  private readonly logger = new Logger('ScheduledJobs')
  private missingWarned = false
  readonly host = `${os.hostname()}:${process.pid}`.slice(0, 120)

  constructor(private readonly ds: DataSource, private readonly modules: ModulesService, private readonly registry: SchedulerRegistry) {}

  async tick(id: ScheduledJobId, work: () => Promise<unknown>, now: Date = new Date()): Promise<ScheduledTickOutcome> {
    const job = SCHEDULED_JOBS[id]
    if (job.module && !(await this.modules.jobEnabled(job.module))) return 'DISABLED'
    // القفل على معاملة اتصال مخصص: الـrollback في الآخر بيفكه، ولو العملية وقعت SQL Server بيفكه مع الاتصال
    const holder = this.ds.createQueryRunner()
    try {
      await holder.connect()
      await holder.startTransaction()
      const [lock] = await holder.query(`DECLARE @result int;
        EXEC @result = sys.sp_getapplock @Resource = @0, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 0;
        SELECT @result AS result;`, [`hr:job:${job.lock}`])
      if (!lock || Number(lock.result) < 0) return 'BUSY'
      const runId = await this.begin(id, scheduledSlot(now))
      if (runId === 'DUPLICATE') return 'DUPLICATE'
      const started = Date.now()
      try {
        await work()
      } catch (error) {
        this.logger.error(`المهمة «${job.label}» فشلت: ${errorText(error)}`, error instanceof Error ? error.stack : undefined)
        await this.finish(runId, 'FAILED', Date.now() - started, errorText(error))
        return 'FAILED'
      }
      await this.finish(runId, 'SUCCEEDED', Date.now() - started, null)
      return 'SUCCEEDED'
    } finally {
      if (holder.isTransactionActive) await holder.rollbackTransaction().catch(() => undefined)
      await holder.release().catch(() => undefined)
    }
  }

  /** null = الجدول مش موجود (قبل ترحيل 079) — الشغل بيكمل من غير سجل */
  private async begin(id: ScheduledJobId, slot: string): Promise<number | null | 'DUPLICATE'> {
    try {
      const [row] = await this.ds.query(`INSERT INTO dbo.scheduled_job_runs ([jobId], [slot], [status], [startedAt], [host])
        OUTPUT INSERTED.[id] VALUES (@0, @1, N'RUNNING', @2, @3)`, [id, slot, new Date(), this.host])
      return Number(row.id)
    } catch (error) {
      const number = sqlErrorNumber(error)
      if (number === 2601 || number === 2627) return 'DUPLICATE'
      if (number === 208) { this.warnMissing(); return null }
      throw error
    }
  }

  private async finish(runId: number | null, status: 'SUCCEEDED' | 'FAILED', durationMs: number, error: string | null) {
    if (runId === null) return
    try {
      await this.ds.query(`UPDATE dbo.scheduled_job_runs SET [status] = @0, [finishedAt] = @1, [durationMs] = @2, [error] = @3 WHERE [id] = @4`,
        [status, new Date(), Math.min(Math.max(0, Math.round(durationMs)), 2_147_483_647), error, runId])
    } catch (failure) {
      // تسجيل النتيجة مايوقعش المهمة: الشغل نفسه خلص
      this.logger.warn(`تعذر تسجيل نتيجة تشغيل المهمة #${runId}: ${errorText(failure)}`)
    }
  }

  private warnMissing() {
    if (this.missingWarned) return
    this.missingWarned = true
    this.logger.warn('سجل المهام المجدولة (scheduled_job_runs) مش موجود — طبّق ترحيل 079. المهام شغالة بقفلها من غير سجل')
  }

  /** مسح سجل التشغيل الأقدم من 30 يوم (مهمة scheduler.prune-runs) */
  async prune(now: Date = new Date()): Promise<number> {
    const before = new Date(now.getTime() - SCHEDULED_RUNS_KEEP_DAYS * 86_400_000)
    try {
      const result = await this.ds.getRepository(ScheduledJobRun).delete({ startedAt: LessThan(before) })
      return result.affected ?? 0
    } catch (error) {
      if (sqlErrorNumber(error) === 208) { this.warnMissing(); return 0 }
      throw error
    }
  }

  /** شاشة «المهام المجدولة»: كل مهمة بموعدها والجاية إمتى، وآخر تشغيل وآخر فشل، وعدد آخر 24 ساعة، وآخر 20 تشغيل */
  async overview(now: Date = new Date()) {
    const since = new Date(now.getTime() - 86_400_000)
    let available = true
    let recent: RunRow[] = [], stats: Array<{ jobId: string; runs: number; failed: number; lastSuccessAt: Date | null; lastFailedId: number | null }> = []
    let failures = new Map<number, RunRow>()
    try {
      recent = await this.ds.query(`SELECT [id], [jobId], [slot], [status], [startedAt], [finishedAt], [durationMs], [error], [host] FROM (
          SELECT *, ROW_NUMBER() OVER (PARTITION BY [jobId] ORDER BY [id] DESC) AS [position] FROM dbo.scheduled_job_runs) ranked
        WHERE [position] <= 20 ORDER BY [jobId], [id] DESC`)
      stats = await this.ds.query(`SELECT [jobId],
          SUM(CASE WHEN [startedAt] >= @0 THEN 1 ELSE 0 END) AS [runs],
          SUM(CASE WHEN [startedAt] >= @0 AND [status] = N'FAILED' THEN 1 ELSE 0 END) AS [failed],
          MAX(CASE WHEN [status] = N'SUCCEEDED' THEN [finishedAt] END) AS [lastSuccessAt],
          MAX(CASE WHEN [status] = N'FAILED' THEN [id] END) AS [lastFailedId]
        FROM dbo.scheduled_job_runs GROUP BY [jobId]`, [since])
      const ids = stats.map(row => row.lastFailedId).filter((id): id is number => id != null).map(Number)
      if (ids.length) {
        const rows: RunRow[] = await this.ds.query(`SELECT [id], [jobId], [slot], [status], [startedAt], [finishedAt], [durationMs], [error], [host]
          FROM dbo.scheduled_job_runs WHERE [id] IN (SELECT CAST([value] AS int) FROM OPENJSON(@0))`, [JSON.stringify(ids)])
        failures = new Map(rows.map(row => [Number(row.id), row]))
      }
    } catch (error) {
      if (sqlErrorNumber(error) !== 208) throw error
      available = false
    }
    const view = (row: RunRow) => ({
      id: Number(row.id), status: row.status, slot: row.slot, startedAt: row.startedAt, finishedAt: row.finishedAt,
      durationMs: row.durationMs == null ? null : Number(row.durationMs), error: row.error, host: row.host,
      // «شغالة» من أكتر من 6 ساعات = وقفت من غير ما تخلص (السيرفر اتقفل أو اتعاد تشغيله في النص)
      abandoned: row.status === 'RUNNING' && now.getTime() - new Date(row.startedAt).getTime() > ABANDONED_AFTER_MS,
    })
    const jobs = []
    for (const id of SCHEDULED_JOB_IDS) {
      const job = SCHEDULED_JOBS[id]
      const own = recent.filter(row => row.jobId === id).map(view)
      const stat = stats.find(row => row.jobId === id)
      const failure = stat?.lastFailedId != null ? failures.get(Number(stat.lastFailedId)) : undefined
      jobs.push({
        id, label: job.label, schedule: job.schedule, cron: job.cron, module: job.module,
        enabled: job.module ? await this.modules.jobEnabled(job.module) : true,
        nextRunAt: this.nextRunAt(id),
        lastRun: own[0] ?? null,
        lastSuccessAt: stat?.lastSuccessAt ?? null,
        lastFailure: failure ? view(failure) : null,
        last24h: { runs: Number(stat?.runs ?? 0), failed: Number(stat?.failed ?? 0) },
        recent: own,
      })
    }
    return { timeZone: systemTimeZone(), available, host: this.host, jobs }
  }

  private nextRunAt(id: ScheduledJobId): string | null {
    try {
      const next = this.registry.getCronJob(id).nextDate()
      return next ? next.toISO() : null
    } catch {
      return null
    }
  }
}
