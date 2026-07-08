import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { RequestsService } from './requests.service'

// المهام الدورية لمحرك الطلبات:
// - تنفيذ النقل المجدول بتاريخ السريان (§7.2)
// - تصعيد الخطوات المتجاوزة للـ SLA
@Injectable()
export class RequestsScheduler {
  private readonly logger = new Logger(RequestsScheduler.name)

  constructor(private readonly requests: RequestsService) {}

  // كل يوم 00:15 — النقل المجدول
  @Cron('15 0 * * *')
  async transfers() {
    const { executed } = await this.requests.runScheduledTransfers()
    if (executed > 0) this.logger.log(`نُفّذ ${executed} نقل مجدول`)
  }

  // كل ساعة — التصعيد
  @Cron('0 * * * *')
  async escalations() {
    const { escalated } = await this.requests.runEscalations()
    if (escalated > 0) this.logger.log(`تم تصعيد ${escalated} طلب`)
  }
}
