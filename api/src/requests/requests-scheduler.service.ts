import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { ModulesService } from '../modules-registry/modules.service'
import { LeaveBalancesService } from './leave-balances.service'
import { RequestsService } from './requests.service'

// المهام الدورية لمحرك الطلبات:
// - تنفيذ النقل المجدول بتاريخ السريان (§7.2)
// - تصعيد الخطوات المتجاوزة للـ SLA
// - بداية السنة: ترحيل الإجازات وصفوف السنوي والمرضي (LEV-2)
@Injectable()
export class RequestsScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(RequestsScheduler.name)

  constructor(
    private readonly requests: RequestsService,
    private readonly balances: LeaveBalancesService,
    private readonly modules: ModulesService
  ) {}

  onApplicationBootstrap() {
    const timer = setTimeout(() => void this.catchUp(), 30_000)
    timer.unref?.()
  }

  async catchUp() {
    // Each job is independent: a malformed overdue request must not prevent
    // transfers or the annual balance rollover from catching up after downtime.
    const jobs = [this.transfers(), this.escalations(), this.yearStart()]
    const results = await Promise.allSettled(jobs)
    for (const result of results) if (result.status === 'rejected') {
      this.logger.error('تعذّر استكمال إحدى مهام الطلبات عند الإقلاع', (result.reason as Error)?.stack)
    }
  }

  // كل يوم 00:15 — النقل المجدول (الموعد في ScheduledJobsRunner — B1.4)
  async transfers() {
    if (!(await this.modules.jobEnabled('requests.scheduled-transfers'))) return
    const { executed, employmentExecuted, cancelled } = await this.requests.runScheduledTransfers()
    if (executed || employmentExecuted) this.logger.log(`نُفّذ ${executed} نقل و${employmentExecuted} تغيير وظيفي مجدول`)
    if (cancelled) this.logger.warn(`أُلغي ${cancelled} نقل مجدول مكرر (يُنفَّذ الأول فقط) — السبب مسجل على كل طلب`)
  }

  // كل ساعة — التصعيد (الموعد في ScheduledJobsRunner — B1.4)
  async escalations() {
    if (!(await this.modules.jobEnabled('requests.escalations'))) return
    const { escalated } = await this.requests.runEscalations()
    if (escalated > 0) this.logger.log(`تم تصعيد ${escalated} طلب`)
  }

  // لحاق الترحيل عند الإقلاع وكل يوم 00:05؛ علامة الإتمام تمنع تكراره داخل السنة.
  // تعطل الخادم يوم 1 يناير لا يسقط الرصيد المرحل، والفشل لا يسجل إتماماً.
  // وبعده تجديد سنوات الرصيد بذكرى التعيين (يومي، مستقل عن نجاح الترحيل السنوي). الموعد في ScheduledJobsRunner (B1.4)
  async yearStart() {
    try {
      await this.yearStartWork()
    } catch {
      // كل جزء سجّل خطأه بنفسه
    }
  }

  /** الشغل نفسه: الجزءين بيتجربوا الاتنين، وأي فشل بيترمي بعدهم (المهمة المجدولة بتسجله «فشلت») */
  async yearStartWork() {
    // موديول الإجازات مقفول = مفيش ترحيل ولا تجديد أرصدة (الفتح بعدين بيلحق: علامة الإتمام بالسنة)
    if (!(await this.modules.jobEnabled('leave.year-start'))) return
    let failure: unknown = null
    try {
      const r = await this.balances.catchUpRollover()
      if (r) {
        this.logger.log(
          `ترحيل إجازات ${r.fromPeriod} → ${r.toPeriod}: ${r.created} رصيد مُرحّل، ${r.ensured} صف جديد`
        )
      }
    } catch (e) {
      this.logger.error('تعذّر الترحيل السنوي للإجازات', (e as Error)?.stack)
      failure = e
    }
    try {
      const r = await this.balances.renewBalancePeriods()
      if (r && (r.created || r.carried)) {
        this.logger.log(`تجديد أرصدة الإجازات: ${r.created} سنة رصيد جديدة، ${r.carried} رصيد مُرحّل`)
      }
    } catch (e) {
      this.logger.error('تعذّر تجديد سنوات أرصدة الإجازات', (e as Error)?.stack)
      failure ??= e
    }
    if (failure) throw failure
  }
}
