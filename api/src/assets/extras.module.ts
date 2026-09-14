import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { RequestsModule } from '../requests/requests.module'
import { AttendanceModule } from '../attendance/attendance.module'
import { AttendanceDay, AttendancePunch, PermissionType } from '../attendance/attendance.entities'
import { Employee } from '../employees/employee.entity'
import { EmployeesModule } from '../employees/employees.module'
import { Branch } from '../org/entities/branch.entity'
import { Team } from '../org/entities/team.entity'
import { Asset, CustodyAssignment } from '../requests/entities/custody.entities'
import {
  EmployeeStatusHistory,
  Transfer,
} from '../requests/entities/employment.entities'
import { Loan, LoanInstallment } from '../requests/entities/financial.entities'
import { Leave, LeaveBalance } from '../requests/entities/leave.entities'
import { RequestApproval } from '../requests/entities/request-approval.entity'
import { Request } from '../requests/entities/request.entity'
import { RequestType } from '../requests/entities/request-type.entity'
import {
  AssetType,
  BiometricDevice,
  CostCenter,
  Candidate,
  DocType,
  EmployeeDocument,
  Grade,
  JobTitle,
  PublicHoliday,
  Shift,
  WorkSchedule,
} from './assets.entities'
import { AssetsController } from './assets.controller'
import { CandidatesController } from './candidates.controller'
import { CatalogsController } from './catalogs.controller'
import { DocsController } from './docs.controller'
import { EmployeeExtrasController } from './employee-extras.controller'
import { PortalController } from './portal.controller'
import { DocTypesDefaultsService } from './doc-types-defaults.service'
import { NotificationRead } from './notification-read.entity'

// الملحقات: العهدة/المستندات/الكتالوجات/المرشحون/النقل/التقويم/الإشعارات
@Module({
  imports: [
    EmployeesModule,
    RequestsModule,
    AttendanceModule, // لإعادة حساب الأيام بعد تعديل وردية في الكتالوج
    TypeOrmModule.forFeature([
      Asset,
      CustodyAssignment,
      EmployeeDocument,
      PublicHoliday,
      Shift,
      WorkSchedule,
      BiometricDevice,
      JobTitle,
      Grade,
      AssetType,
      DocType,
      CostCenter,
      Candidate,
      Employee,
      Team,
      Branch,
      Transfer,
      EmployeeStatusHistory,
      Leave,
      LeaveBalance,
      Loan,
      LoanInstallment,
      Request,
      RequestType,
      RequestApproval,
      AttendancePunch,
      AttendanceDay,
      PermissionType,
      NotificationRead, // حالة الإشعارات لكل مستخدم (مقروء/محذوف)
    ]),
  ],
  controllers: [
    AssetsController,
    DocsController,
    CatalogsController,
    CandidatesController,
    EmployeeExtrasController,
    PortalController,
  ],
  providers: [DocTypesDefaultsService],
})
export class ExtrasModule {}
