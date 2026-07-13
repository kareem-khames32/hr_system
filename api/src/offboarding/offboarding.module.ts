import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from '../auth/user.entity'
import { Employee } from '../employees/employee.entity'
import { Branch } from '../org/entities/branch.entity'
import { Department } from '../org/entities/department.entity'
import { Team } from '../org/entities/team.entity'
import { ApproverResolver } from '../requests/approver-resolver.service'
import { OvertimeEntry } from '../requests/entities/attendance.entities'
import { CustodyAssignment } from '../requests/entities/custody.entities'
import { EmployeeStatusHistory } from '../requests/entities/employment.entities'
import { Loan, LoanInstallment } from '../requests/entities/financial.entities'
import { LeaveBalance } from '../requests/entities/leave.entities'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import {
  ClearanceItem,
  OffboardingCase,
  SettlementLine,
} from './offboarding.entities'
import { OffboardingController } from './offboarding.controller'
import { OffboardingService } from './offboarding.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OffboardingCase,
      ClearanceItem,
      SettlementLine,
      Employee,
      User,
      CustodyAssignment,
      LeaveBalance,
      OvertimeEntry,
      Loan,
      LoanInstallment,
      EmployeeStatusHistory,
      RequestsConfig,
      // لحل المدير المباشر
      Team,
      Department,
      Branch,
    ]),
  ],
  controllers: [OffboardingController],
  providers: [OffboardingService, ApproverResolver],
  exports: [OffboardingService],
})
export class OffboardingModule {}
