import { Module } from '@nestjs/common'
import { LettersModule } from '../letters/letters.module'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AttendanceModule } from '../attendance/attendance.module'
import { Employee } from '../employees/employee.entity'
import { EmployeesModule } from '../employees/employees.module'
import { Branch } from '../org/entities/branch.entity'
import { Department } from '../org/entities/department.entity'
import { Team } from '../org/entities/team.entity'
import { ApproverResolver } from './approver-resolver.service'
import { DestinationsService } from './destinations.service'
import { LeaveBalancesService } from './leave-balances.service'
import { LeavesController } from './leaves.controller'
import { LeaveAttachmentsController } from './leave-attachments.controller'
import { LeaveAttachmentDeadlineJob } from './leave-attachment-deadline.job'
import { ApprovalChain } from './entities/approval-chain.entity'
import { ApprovalStep } from './entities/approval-step.entity'
import { AttendanceCorrection, OvertimeEntry } from './entities/attendance.entities'
import { OvertimeDayClaim, OvertimeEntryEvent } from './entities/overtime-workflow.entities'
import { Asset, CustodyAssignment } from './entities/custody.entities'
import {
  EmployeeStatusHistory,
  Promotion,
  Transfer,
} from './entities/employment.entities'
import { Loan, LoanInstallment } from './entities/financial.entities'
import { Leave, LeaveBalance, LeaveBalanceAdjustment, LeaveType } from './entities/leave.entities'
import { LetterRequest } from './entities/letter.entities'
import { RequestApproval } from './entities/request-approval.entity'
import { RequestAttachment } from './entities/request-attachment.entity'
import { RequestType } from './entities/request-type.entity'
import { Request } from './entities/request.entity'
import { RequestsConfig } from './entities/requests-config.entity'
import { RequestsScheduler } from './requests-scheduler.service'
import { RequestsController } from './requests.controller'
import { RequestsService } from './requests.service'
import { OvertimeDispatchSubscriber } from './overtime-dispatch.subscriber'

@Module({
  imports: [
    LettersModule,
    AttendanceModule,
    // EmployeesService.findOne — فحص نطاق الفرع لأرصدة موظف (SEC-LEV-1)
    EmployeesModule,
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
      LeaveBalanceAdjustment,
      OvertimeEntry,
      OvertimeDayClaim,
      OvertimeEntryEvent,
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
  controllers: [RequestsController, LeavesController, LeaveAttachmentsController],
  providers: [
    RequestsService,
    OvertimeDispatchSubscriber,
    ApproverResolver,
    DestinationsService,
    LeaveBalancesService,
    RequestsScheduler,
    // مهلة مرفق الإجازة «بعد الرجوع»: تذكير يومي وتحويل الأيام بدون راتب بعد المهلة
    LeaveAttachmentDeadlineJob,
  ],
  exports: [RequestsService, LeaveBalancesService, DestinationsService, ApproverResolver, LeaveAttachmentDeadlineJob],
})
export class RequestsModule {}
