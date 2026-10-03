import { Controller, Get } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { RequireModule } from '../modules-registry/module.guard'
import { ScheduledJobsService } from '../scheduler/scheduled-jobs.service'
import { QueueService } from '../queue/queue.service'

/**
 * ملخص المهام المجدولة للمسار العام (B1.13): المسار من غير دخول، فبيرجّع عدد بس — من غير أسماء المهام ولا رسايل الأخطاء.
 * فاشلة = آخر تشغيل لمهمة مفعّلة فشل أو وقف في النص. unknown = سجل التشغيل مش موجود (ترحيل 079) أو تعذّر قراءته.
 */
export function healthJobsSummary(overview: { available: boolean; jobs: Array<{ enabled: boolean; lastRun: { status: string; abandoned: boolean } | null }> } | null) {
  if (!overview || !overview.available) return { status: 'unknown' as const, failing: 0 }
  const failing = overview.jobs.filter(job => job.enabled && !!job.lastRun && (job.lastRun.status === 'FAILED' || job.lastRun.abandoned)).length
  return { status: failing ? 'failing' as const : 'ok' as const, failing }
}

/** B2.3: ملخص الطابور للمسار العام بالعدد بس (من غير أنواع المهام ولا رسايلها). unknown = الجداول مش موجودة (ترحيل 086) أو تعذّر قراءتها */
export function healthQueueSummary(overview: { available: boolean; jobs?: Record<string, number>; outboxPending?: number } | null) {
  if (!overview || !overview.available || !overview.jobs) return { status: 'unknown' as const, pending: 0, dead: 0 }
  const pending = (overview.jobs.PENDING ?? 0) + (overview.jobs.RUNNING ?? 0) + (overview.outboxPending ?? 0), dead = overview.jobs.DEAD ?? 0
  return { status: dead ? 'dead' as const : 'ok' as const, pending, dead }
}

@RequireModule('platform')
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource, private readonly jobs: ScheduledJobsService, private readonly queue: QueueService) {}

  @Get()
  async check() {
    let db = 'down'
    try {
      await this.dataSource.query('SELECT 1')
      db = 'up'
    } catch {
      db = 'down'
    }
    let overview = null, queue = null
    if (db === 'up') {
      try { overview = await this.jobs.overview() } catch { overview = null }
      try { queue = await this.queue.overview() } catch { queue = null }
    }
    return {
      status: 'ok',
      db,
      time: new Date().toISOString(),
      // B1.13: حالة المهام المجدولة (ملخص)
      jobs: healthJobsSummary(overview),
      // B2.3: الطابور (ملخص)
      queue: healthQueueSummary(queue),
    }
  }
}
