import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DocType, EmployeeDocument } from '../assets/assets.entities'
import { Employee } from '../employees/employee.entity'
import { Branch } from '../org/entities/branch.entity'
import { Department } from '../org/entities/department.entity'
import { TrainingPlan, TrainingRequirement } from './training-plan.entities'
import { TrainingPlansService } from './training-plans.service'
import { TrainingController } from './training.controller'
import { TrainingCourse, TrainingEnrollment, TrainingSession } from './training.entities'
import { TrainingService } from './training.service'

// B3.9: التدريب — كتالوج الدورات، والجلسات، وتسجيل الموظفين وحضورهم وإكمالهم، والشهادة كمستند موظف بانتهائه. موديول جديد مقفول لحد ما الشركة تفتحه.
@Module({
  imports: [TypeOrmModule.forFeature([TrainingCourse, TrainingSession, TrainingEnrollment, TrainingPlan, TrainingRequirement, Employee, Branch, Department, DocType, EmployeeDocument])],
  controllers: [TrainingController],
  providers: [TrainingService, TrainingPlansService],
  exports: [TrainingService],
})
export class TrainingModule {}
