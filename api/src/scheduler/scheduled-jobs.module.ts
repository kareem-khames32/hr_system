import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ScheduledJobRun } from './scheduled-job-run.entity'
import { ScheduledJobsController } from './scheduled-jobs.controller'
import { ScheduledJobsRunner } from './scheduled-jobs.runner'
import { ScheduledJobsService } from './scheduled-jobs.service'

// المهام المجدولة (خطة التنفيذ B1.4): المواعيد كلها في ScheduledJobsRunner، والتشغيل مرة واحدة وسجله في ScheduledJobsService
@Module({
  imports: [TypeOrmModule.forFeature([ScheduledJobRun])],
  controllers: [ScheduledJobsController],
  providers: [ScheduledJobsService, ScheduledJobsRunner],
  exports: [ScheduledJobsService],
})
export class ScheduledJobsModule {}
