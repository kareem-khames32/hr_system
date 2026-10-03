import { Global, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { QueueController } from './queue.controller'
import { OutboxEvent, QueueJob } from './queue.entities'
import { QueueService } from './queue.service'
import { QueueWorker } from './queue.worker'

// B2.3: الطابور والـoutbox — Global عشان أي موديول (الإشعارات في B2.4 وبعدها) يسجّل مستهلكه في QueueService من غير ما يستورده.
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([OutboxEvent, QueueJob])],
  controllers: [QueueController],
  providers: [QueueService, QueueWorker],
  exports: [QueueService],
})
export class QueueModule {}
