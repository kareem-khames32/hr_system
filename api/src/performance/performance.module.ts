import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from '../auth/user.entity'
import { Employee } from '../employees/employee.entity'
import { Branch } from '../org/entities/branch.entity'
import { Department } from '../org/entities/department.entity'
import { Team } from '../org/entities/team.entity'
import { ApproverResolver } from '../requests/approver-resolver.service'
import { PerformanceGoal, PerformanceGoalUpdate } from './goal.entities'
import { GoalsController } from './goals.controller'
import { GoalsService } from './goals.service'
import { ReviewAssignment, ReviewCycle, ReviewResponse, ReviewTemplate } from './review.entities'
import { ReviewsController } from './reviews.controller'
import { ReviewsService } from './reviews.service'

// B3.6: إدارة الأداء — الأهداف (الدورات والقوالب في B3.7، والمعايرة والربط بالفلوس في B3.8). موديول جديد مقفول لحد ما الشركة تفتحه.
@Module({
  imports: [
    TypeOrmModule.forFeature([
      PerformanceGoal,
      PerformanceGoalUpdate,
      // B3.7: نماذج التقييم ودوراته وتكليفاته وردوده
      ReviewTemplate,
      ReviewCycle,
      ReviewAssignment,
      ReviewResponse,
      // لحل المدير المباشر (ApproverResolver)
      Employee,
      User,
      Team,
      Department,
      Branch,
    ]),
  ],
  controllers: [GoalsController, ReviewsController],
  providers: [GoalsService, ReviewsService, ApproverResolver],
  exports: [GoalsService, ReviewsService],
})
export class PerformanceModule {}
