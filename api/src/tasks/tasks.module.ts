import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { OffboardingModule } from '../offboarding/offboarding.module'
import { OnboardingModule } from '../onboarding/onboarding.module'
import { RequestsModule } from '../requests/requests.module'
import { Task } from './task.entity'
import { TasksController } from './tasks.controller'
import { TasksService } from './tasks.service'

// B2.5: محرك المهام — المهمة العامة و«مهامي». التهيئة والإخلاء بيتقروا من خدماتهم، والمدير المباشر من محلّل محرك الطلبات.
@Module({
  imports: [TypeOrmModule.forFeature([Task]), RequestsModule, OnboardingModule, OffboardingModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
