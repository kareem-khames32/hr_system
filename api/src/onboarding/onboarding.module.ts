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
import { OnboardingTemplate } from './onboarding-template.entity'
import { OnboardingController } from './onboarding.controller'
import { OnboardingService } from './onboarding.service'
import { ProbationController } from './probation.controller'
import { ProbationService } from './probation.service'

// تهيئة الموظفين الجدد: قالب مهام + مهام لكل موظف بجهة مسؤولة وموعد
@Module({
  imports: [
    TypeOrmModule.forFeature([
      OnboardingTemplateItem,
      // B3.1-أ: قوالب بالنطاق
      OnboardingTemplate,
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
  controllers: [OnboardingController, ProbationController],
  providers: [OnboardingService, ProbationService, ApproverResolver],
  // B2.5: «مهامي» بيقرا مهام التهيئة اللي على جهة الحساب من الخدمة نفسها. B3.1-ج: والمهمة اليومية بتنادي خدمة فترة التجربة
  exports: [OnboardingService, ProbationService],
})
export class OnboardingModule {}
