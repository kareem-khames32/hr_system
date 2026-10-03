import { Controller, Get } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { RequireModule } from '../modules-registry/module.guard'
import { ScheduledJobsService } from '../scheduler/scheduled-jobs.service'

/**
 * ملخص المهام المجدولة للمسار العام (B1.13): المسار من غير دخول، فبيرجّع عدد بس — من غير أسماء المهام ولا رسايل الأخطاء.
 * فاشلة = آخر تشغيل لمهمة مفعّلة فشل أو وقف في النص. unknown = سجل التشغيل مش موجود (ترحيل 079) أو تعذّر قراءته.
 */
export function healthJobsSummary(overview: { available: boolean; jobs: Array<{ enabled: boolean; lastRun: { status: string; abandoned: boolean } | null }> } | null) {
  if (!overview || !overview.available) return { status: 'unknown' as const, failing: 0 }
  const failing = overview.jobs.filter(job => job.enabled && !!job.lastRun && (job.lastRun.status === 'FAILED' || job.lastRun.abandoned)).length
  return { status: failing ? 'failing' as const : 'ok' as const, failing }
}

@RequireModule('platform')
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource, private readonly jobs: ScheduledJobsService) {}

  @Get()
  async check() {
    let db = 'down'
    try {
      await this.dataSource.query('SELECT 1')
      db = 'up'
    } catch {
      db = 'down'
    }
    let overview = null
    if (db === 'up') {
      try { overview = await this.jobs.overview() } catch { overview = null }
    }
    return {
      status: 'ok',
      db,
      time: new Date().toISOString(),
      // B1.13: حالة المهام المجدولة (ملخص)
      jobs: healthJobsSummary(overview),
    }
  }
}
