import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AttendanceModule } from '../attendance/attendance.module'
import { AuthModule } from '../auth/auth.module'
import { User } from '../auth/user.entity'
import { Branch } from '../org/entities/branch.entity'
import { Department } from '../org/entities/department.entity'
import { Team } from '../org/entities/team.entity'
import { EmployeeDocument, Grade } from '../assets/assets.entities'
import { EmployeeStatusHistory } from '../requests/entities/employment.entities'
import { LeaveBalance } from '../requests/entities/leave.entities'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { Employee } from './employee.entity'
import { EmployeeSuspension } from './employee-suspension.entity'
import {
  EmployeeCertification,
  EmployeeEducation,
  EmployeeExperience,
  EmployeeLanguage,
  EmployeeSkill,
} from './qualifications.entities'
import { EmployeesController } from './employees.controller'
import { QualificationsController } from './qualifications.controller'
import { EmployeesService } from './employees.service'
import { EmployeeExportService } from './employee-export.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Employee,
      User,
      Branch,
      Department,
      Team,
      LeaveBalance,
      RequestsConfig,
      EmployeeStatusHistory,
      EmployeeDocument,
      EmployeeEducation,
      EmployeeCertification,
      EmployeeExperience,
      EmployeeSkill,
      EmployeeLanguage,
      // الإيقاف عن العمل لفترة (ترحيل 20260916_044)
      EmployeeSuspension,
    ]),
    // ربط البصمات اليتيمة بأثر رجعي عند ضبط رقم البصمة/الكود
    AttendanceModule,
    // حساب الدخول من الدومين للموظف الجديد في لحظته — DomainSyncService من AuthModule،
    // فمفيش روتين إنشاء تاني. AuthModule مابيستوردش EmployeesModule (بياخد الكيان لوحده) فمفيش حلقة.
    AuthModule,
  ],
  controllers: [EmployeesController, QualificationsController],
  providers: [EmployeesService, EmployeeExportService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
