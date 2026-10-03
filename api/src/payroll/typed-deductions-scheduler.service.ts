import { Injectable, Logger } from '@nestjs/common'
import { ModulesService } from '../modules-registry/modules.service'
import { TypedDeductionsService } from './typed-deductions.service'

// DD-06 قاعدة 1: فحص مهلة خطوات اعتماد الخصومات المصنفة كل 15 دقيقة (الإعداد deductions.step_sla_hours
// وسلوك الانتهاء deductions.sla_breach_action). التشغيل متتابع؛ الدورة الجارية لا تتداخل مع التالية.
@Injectable()
export class TypedDeductionsScheduler {
  private readonly logger = new Logger(TypedDeductionsScheduler.name)
  private running = false

  constructor(private readonly deductions: TypedDeductionsService, private readonly modules: ModulesService) {}

  // الموعد (كل 15 دقيقة) في ScheduledJobsRunner (B1.4) — الدالة دي للنداء المباشر
  async processStepSla() {
    if (this.running) return
    this.running = true
    try {
      await this.processStepSlaWork()
    } catch (error) {
      this.logger.error(`تعذر فحص مهلة اعتماد الخصومات: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      this.running = false
    }
  }

  /** الشغل نفسه — بيرمي الخطأ (المهمة المجدولة بتسجله «فشلت»، وقفلها بيمنع التداخل بين النسخ) */
  async processStepSlaWork() {
    if (!(await this.modules.jobEnabled('payroll.deductions-sla'))) return
    const result = await this.deductions.processSla()
    if (result.escalated || result.rejected || result.breached) {
      this.logger.log(`مهلة اعتماد الخصومات: صُعِّد ${result.escalated}، رُفض آليًا ${result.rejected}، سُجّل تجاوز ${result.breached}`)
    }
  }
}
