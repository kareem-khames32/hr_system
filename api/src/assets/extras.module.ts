import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { RequestsModule } from '../requests/requests.module'
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

// الملحقات: العهدة/المستندات/الكتالوجات/المرشحون/النقل/التقويم/الإشعارات
@Module({
  imports: [
    EmployeesModule,
    RequestsModule,
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
})
export class ExtrasModule {}
