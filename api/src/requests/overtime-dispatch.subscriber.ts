import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { DataSource, EntitySubscriberInterface, TransactionCommitEvent, TransactionRollbackEvent } from 'typeorm'
import { RequestsService } from './requests.service'
import { discardRolledBackOvertimeDispatch, mergeNestedOvertimeDispatch, takeCommittedOvertimeDispatch } from './overtime-dispatch'

@Injectable()
export class OvertimeDispatchSubscriber implements EntitySubscriberInterface, OnModuleDestroy {
  private readonly logger = new Logger(OvertimeDispatchSubscriber.name)

  constructor(private readonly ds: DataSource, private readonly requests: RequestsService) {
    this.ds.subscribers.push(this)
  }

  beforeTransactionCommit(event: TransactionCommitEvent) {
    mergeNestedOvertimeDispatch(event.queryRunner)
  }

  beforeTransactionRollback(event: TransactionRollbackEvent) {
    discardRolledBackOvertimeDispatch(event.queryRunner)
  }

  async afterTransactionCommit(event: TransactionCommitEvent) {
    const ids = takeCommittedOvertimeDispatch(event.queryRunner)
    if (!ids.length) return
    // COMMIT حرر القفل المالي فعلاً. محرك التوجيه يفتح معاملة مستقلة ولا يعيد استعمال هذا الـrunner.
    try { await this.requests.dispatchDetectedOvertime(ids) }
    catch (error) {
      // فشل المسار المستقل لا يُفشل بصمة ثبتت بالفعل؛ DETECTED محفوظ لاستدراك المهمة الدورية.
      this.logger.warn('تعذر التوجيه الفوري للإضافي المكتشف؛ بقي للمراجعة والاستدراك: ' + (error as Error).message)
    }
  }

  onModuleDestroy() {
    const index = this.ds.subscribers.indexOf(this)
    if (index >= 0) this.ds.subscribers.splice(index, 1)
  }
}
