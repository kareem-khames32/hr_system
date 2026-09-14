import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from '../auth/user.entity'
import { Employee } from '../employees/employee.entity'
import { Branch } from '../org/entities/branch.entity'
import { Department } from '../org/entities/department.entity'
import { Team } from '../org/entities/team.entity'
import { ApproverResolver } from '../requests/approver-resolver.service'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { OnboardingTask, OnboardingTemplateItem } from './onboarding.entities'
import { OnboardingController } from './onboarding.controller'
import { OnboardingService } from './onboarding.service'

// تهيئة الموظفين الجدد: قالب مهام + مهام لكل موظف بجهة مسؤولة وموعد
@Module({
  imports: [
    TypeOrmModule.forFeature([
      OnboardingTemplateItem,
      OnboardingTask,
      Employee,
      User,
      RequestsConfig,
      // لحل المدير المباشر
      Team,
      Department,
      Branch,
    ]),
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService, ApproverResolver],
})
export class OnboardingModule {}
