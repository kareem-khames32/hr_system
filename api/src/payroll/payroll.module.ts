import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AttendanceModule } from '../attendance/attendance.module'
import { AttendanceDay } from '../attendance/attendance.entities'
import { AttendanceExemption, AttendanceExemptionEvent } from '../attendance/attendance-exemption.entities'
import { AttendanceRuleVersion } from '../attendance/attendance-rule.entities'
import { Employee } from '../employees/employee.entity'
import { OvertimeEntry } from '../requests/entities/attendance.entities'
import { OvertimeDayClaim, OvertimeEntryEvent } from '../requests/entities/overtime-workflow.entities'
import {
  EmployeeObligation,
  Loan,
  LoanInstallment,
} from '../requests/entities/financial.entities'
import { Leave } from '../requests/entities/leave.entities'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { PayrollItem, PayrollRun, PayrollRunMember } from './payroll.entities'
import { PayrollPeriodClaim, PayrollRunEvent } from './payroll-membership.entities'
import { LoanInstallmentAllocation, LoanInstallmentEvent } from './payroll-installment-ledger.entities'
import { LatenessTier } from './payroll-rules.entities'
import { PayrollController } from './payroll.controller'
import { PayrollService } from './payroll.service'
import { ObligationsController } from './obligations.controller'
import { ObligationsService } from './obligations.service'
import { PayrollRulesController } from './payroll-rules.controller'
import { PayrollRulesService } from './payroll-rules.service'
import { PayrollPolicy, PayrollPolicyVersion, PayrollPolicyEvent } from './payroll-policy.entities'
import { PayrollPolicyController } from './payroll-policy.controller'
import { PayrollPolicyService } from './payroll-policy.service'
import { PayrollPolicyComponent, PayrollPolicyParameter, PayrollPolicyTier, PayrollTierSet } from './payroll-policy-definition.entities'
import { EmployeeSalaryHistory, EmployeeSalaryHistoryVersion } from './payroll-salary-history.entities'
import { PayrollSalaryHistoryService } from './payroll-salary-history.service'
import { PayrollSalaryHistoryController } from './payroll-salary-history.controller'

@Module({
  imports: [
    AttendanceModule,
    TypeOrmModule.forFeature([
      PayrollRun,
      PayrollRunMember,
      PayrollPeriodClaim,
      PayrollRunEvent,
      PayrollItem,
      Employee,
      AttendanceDay,
      AttendanceExemption,
      AttendanceExemptionEvent,
      AttendanceRuleVersion,
      OvertimeEntry,
      OvertimeDayClaim,
      OvertimeEntryEvent,
      Leave,
      Loan,
      LoanInstallment,
      LoanInstallmentAllocation,
      LoanInstallmentEvent,
      EmployeeObligation,
      LatenessTier,
      RequestsConfig,
      PayrollPolicy,
      PayrollPolicyVersion,
      PayrollPolicyEvent,
      PayrollPolicyComponent,
      PayrollPolicyParameter,
      PayrollTierSet,
      PayrollPolicyTier,
      EmployeeSalaryHistory,
      EmployeeSalaryHistoryVersion,
    ]),
  ],
  controllers: [PayrollController, ObligationsController, PayrollRulesController, PayrollPolicyController, PayrollSalaryHistoryController],
  providers: [PayrollService, ObligationsService, PayrollRulesService, PayrollPolicyService, PayrollSalaryHistoryService],
})
export class PayrollModule {}
