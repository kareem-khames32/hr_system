import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Employee } from '../employees/employee.entity'
import { Branch } from '../org/entities/branch.entity'
import { Department } from '../org/entities/department.entity'
import { Team } from '../org/entities/team.entity'
import { ApproverResolver } from './approver-resolver.service'
import { DestinationsService } from './destinations.service'
import { LeaveBalancesService } from './leave-balances.service'
import { LeavesController } from './leaves.controller'
import { ApprovalChain } from './entities/approval-chain.entity'
import { ApprovalStep } from './entities/approval-step.entity'
import { AttendanceCorrection, OvertimeEntry } from './entities/attendance.entities'
import { Asset, CustodyAssignment } from './entities/custody.entities'
import {
  EmployeeStatusHistory,
  Promotion,
  Transfer,
} from './entities/employment.entities'
import { Loan, LoanInstallment } from './entities/financial.entities'
import { Leave, LeaveBalance, LeaveType } from './entities/leave.entities'
import { LetterRequest } from './entities/letter.entities'
import { RequestApproval } from './entities/request-approval.entity'
import { RequestAttachment } from './entities/request-attachment.entity'
import { RequestType } from './entities/request-type.entity'
import { Request } from './entities/request.entity'
import { RequestsConfig } from './entities/requests-config.entity'
import { RequestsScheduler } from './requests-scheduler.service'
import { RequestsController } from './requests.controller'
import { RequestsService } from './requests.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      // المحرك
      RequestType,
      ApprovalChain,
      ApprovalStep,
      Request,
      RequestApproval,
      RequestAttachment,
      RequestsConfig,
      // الوجهات
      LeaveType,
      Leave,
      LeaveBalance,
      OvertimeEntry,
      AttendanceCorrection,
      Loan,
      LoanInstallment,
      Transfer,
      Promotion,
      EmployeeStatusHistory,
      Asset,
      CustodyAssignment,
      LetterRequest,
      // الهيكل التنظيمي (لحل الأدوار)
      Employee,
      Team,
      Department,
      Branch,
    ]),
  ],
  controllers: [RequestsController, LeavesController],
  providers: [
    RequestsService,
    ApproverResolver,
    DestinationsService,
    LeaveBalancesService,
    RequestsScheduler,
  ],
  exports: [RequestsService, LeaveBalancesService],
})
export class RequestsModule {}
