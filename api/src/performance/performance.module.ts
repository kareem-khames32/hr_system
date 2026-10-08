import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from '../auth/user.entity'
import { Employee } from '../employees/employee.entity'
import { Branch } from '../org/entities/branch.entity'
import { Department } from '../org/entities/department.entity'
import { Team } from '../org/entities/team.entity'
import { PayrollModule } from '../payroll/payroll.module'
import { ApproverResolver } from '../requests/approver-resolver.service'
import { PerformanceGoal, PerformanceGoalUpdate } from './goal.entities'
import { GoalsController } from './goals.controller'
import { GoalsService } from './goals.service'
import { ReviewAssignment, ReviewCycle, ReviewResponse, ReviewTemplate } from './review.entities'
import { ReviewRewardSuggestion } from './review-reward.entity'
import { ReviewRewardsController } from './review-rewards.controller'
import { ReviewRewardsService } from './review-rewards.service'
import { ReviewsController } from './reviews.controller'
import { ReviewsService } from './reviews.service'

// B3.6: إدارة الأداء — الأهداف (الدورات والقوالب في B3.7، والمعايرة والربط بالفلوس في B3.8). موديول جديد مقفول لحد ما الشركة تفتحه.
@Module({
  imports: [
    // B3.8-ب: المدير بيقدّم المكافأة المقترحة بخدمة المكافآت نفسها
    PayrollModule,
    TypeOrmModule.forFeature([
      PerformanceGoal,
      PerformanceGoalUpdate,
      // B3.7: نماذج التقييم ودوراته وتكليفاته وردوده
      ReviewTemplate,
      ReviewCycle,
      ReviewAssignment,
      ReviewResponse,
      // B3.8-ب: المكافآت المقترحة من نتيجة التقييم
      ReviewRewardSuggestion,
      // لحل المدير المباشر (ApproverResolver)
      Employee,
      User,
      Team,
      Department,
      Branch,
    ]),
  ],
  controllers: [GoalsController, ReviewsController, ReviewRewardsController],
  providers: [GoalsService, ReviewsService, ReviewRewardsService, ApproverResolver],
  exports: [GoalsService, ReviewsService],
})
export class PerformanceModule {}
