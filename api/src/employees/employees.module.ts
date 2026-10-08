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
import { EmployeePaymentChange } from './employee-payment-change.entity'
import { EmployeeSuspension } from './employee-suspension.entity'
import {
  EmployeeCertification,
  EmployeeEducation,
  EmployeeExperience,
  EmployeeLanguage,
  EmployeeSkill,
} from './qualifications.entities'
import { EmployeesController } from './employees.controller'
import { EmployeeSelfPhotoController } from './employee-self-photo.controller'
import { QualificationsController } from './qualifications.controller'
import { EmployeesService } from './employees.service'
import { EmployeeExportService } from './employee-export.service'
import { EmployeeDataExportService } from './employee-data-export'
import { EmployeeCustomField, EmployeeCustomValue } from './employee-custom-fields.entities'
import { EmployeeCustomFieldsController, EmployeeFieldsSettingsController } from './employee-custom-fields.controller'
import { EmployeeCustomFieldsService } from './employee-custom-fields.service'
import { EmploymentPeriod } from './employment-period.entity'
import { PositionsModule } from '../positions/positions.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Employee,
      // B1.7: سجل تغييرات الصرف (ترحيل 081)
      EmployeePaymentChange,
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
      // B2.9-ب: الحقول المخصصة على ملف الموظف (ترحيل 094)
      EmployeeCustomField,
      EmployeeCustomValue,
      // B2.10: فترات الخدمة المقفولة (ترحيل 095)
      EmploymentPeriod,
    ]),
    // ربط البصمات اليتيمة بأثر رجعي عند ضبط رقم البصمة/الكود
    AttendanceModule,
    // حساب الدخول من الدومين للموظف الجديد في لحظته — DomainSyncService من AuthModule،
    // فمفيش روتين إنشاء تاني. AuthModule مابيستوردش EmployeesModule (بياخد الكيان لوحده) فمفيش حلقة.
    AuthModule,
    // B2.11: حكم الوظيفة المعتمدة جوه معاملة إنشاء الموظف. PositionsModule مابيستوردش EmployeesModule فمفيش حلقة.
    PositionsModule,
  ],
  controllers: [EmployeesController, QualificationsController, EmployeeSelfPhotoController, EmployeeFieldsSettingsController, EmployeeCustomFieldsController],
  providers: [EmployeesService, EmployeeExportService, EmployeeDataExportService, EmployeeCustomFieldsService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
