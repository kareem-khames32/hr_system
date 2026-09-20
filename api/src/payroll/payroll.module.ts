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
import { PayrollRunUnassignedAck } from './payroll-run-definition.entities'
import { LoanInstallmentAllocation, LoanInstallmentEvent } from './payroll-installment-ledger.entities'
import { LatenessTier } from './payroll-rules.entities'
import { PayrollLatenessTierSet, PayrollLatenessTierSetTier, PayrollRunParityExplanation } from './payroll-lateness-tier-sets.entities'
import { PayrollController } from './payroll.controller'
import { PayrollBankSheetController } from './bank-sheet.controller'
import { PayrollService } from './payroll.service'
import { ObligationsController } from './obligations.controller'
import { ObligationsService } from './obligations.service'
import { PayrollRulesController } from './payroll-rules.controller'
import { PayrollRulesService } from './payroll-rules.service'
import { PayrollPolicy, PayrollPolicyVersion, PayrollPolicyEvent } from './payroll-policy.entities'
import { PayrollPolicyVersionSeal } from './payroll-policy-seal.entities'
import { PayrollPolicyController } from './payroll-policy.controller'
import { PayrollPolicyService } from './payroll-policy.service'
import { PayrollPolicyComponent, PayrollPolicyParameter, PayrollPolicyTier, PayrollTierSet } from './payroll-policy-definition.entities'
import { EmployeeSalaryHistory, EmployeeSalaryHistoryVersion } from './payroll-salary-history.entities'
import { PayrollSalaryHistoryService } from './payroll-salary-history.service'
import { PayrollSalaryHistoryController } from './payroll-salary-history.controller'
import { DeductionBatch, DeductionRequest, DeductionRequestEvent, DeductionType } from './typed-deductions.entities'
import { TypedDeductionsController } from './typed-deductions.controller'
import { TypedDeductionsService } from './typed-deductions.service'
import { TypedDeductionsScheduler } from './typed-deductions-scheduler.service'
import { BonusBatch, BonusRequest, BonusRequestEvent, BonusType } from './bonuses.entities'
import { BonusesController } from './bonuses.controller'
import { BonusesService } from './bonuses.service'
import { PayrollFinancialExemption, PayrollFinancialExemptionEvent } from './financial-exemptions.entities'
import { FinancialExemptionsController } from './financial-exemptions.controller'
import { FinancialExemptionsService } from './financial-exemptions.service'
import { PayrollRunReversalLine } from './payroll-corrections.entities'
import { PayrollCorrectionsController } from './payroll-corrections.controller'
import { PayrollCorrectionsService } from './payroll-corrections.service'
import { SocialInsuranceController } from './social-insurance.controller'
import { SocialInsuranceService } from './social-insurance.service'
// تبويبات شاشة المسير و«شيل خصم»
import { PayrollDeductionWaiver } from './payroll-deduction-waivers.entities'
import { PayrollOverviewController } from './payroll-overview.controller'
import { PayrollOverviewService } from './payroll-overview.service'
// «تابة البدلات»: أنواع البدلات وصرفها لشهر (إضافة في دفتر المديونيات)
import { PayrollAllowanceGrant, PayrollAllowanceGrantLine, PayrollAllowanceType } from './allowances-grants.entities'
import { PayrollAllowancesController } from './allowances-grants.controller'
import { PayrollAllowancesService } from './allowances-grants.service'
// تراكم المسير يومًا بيوم: جدول الأيام المتراكمة، وخدمتها، والجار الليلي، وشاشة «آخر يوم محسوب»
import { PayrollDailyAccrual } from './payroll-daily-accrual.entities'
import { PayrollDailyAccrualService } from './payroll-daily-accrual.service'
import { PayrollDailyAccrualScheduler } from './payroll-daily-accrual.scheduler'
import { PayrollDailyAccrualController } from './payroll-daily-accrual.controller'

@Module({
  imports: [
    AttendanceModule,
    TypeOrmModule.forFeature([
      PayrollRun,
      PayrollRunMember,
      PayrollPeriodClaim,
      PayrollRunEvent,
      PayrollRunUnassignedAck,
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
      // B4 / الخطوات 19–21: مجموعات شرائح التأخير المؤرخة وأسباب فروق التكافؤ
      PayrollLatenessTierSet,
      PayrollLatenessTierSetTier,
      PayrollRunParityExplanation,
      RequestsConfig,
      PayrollPolicy,
      PayrollPolicyVersion,
      PayrollPolicyEvent,
      PayrollPolicyVersionSeal,
      PayrollPolicyComponent,
      PayrollPolicyParameter,
      PayrollTierSet,
      PayrollPolicyTier,
      EmployeeSalaryHistory,
      EmployeeSalaryHistoryVersion,
      DeductionType,
      DeductionRequest,
      DeductionRequestEvent,
      DeductionBatch,
      // C4 / الخطوة 27: المكافآت
      BonusType,
      BonusRequest,
      BonusRequestEvent,
      BonusBatch,
      // الخطوة 26 (EX-01..08): الإعفاء المالي في مسير وسجل انتقالاته
      PayrollFinancialExemption,
      PayrollFinancialExemptionEvent,
      // C8 / الخطوة 31: سطور عكس صرف المسير
      PayrollRunReversalLine,
      PayrollDeductionWaiver,
      PayrollAllowanceType,
      PayrollAllowanceGrant,
      PayrollAllowanceGrantLine,
      // تراكم المسير يومًا بيوم
      PayrollDailyAccrual,
    ]),
  ],
  controllers: [PayrollController, ObligationsController, PayrollRulesController, PayrollPolicyController, PayrollSalaryHistoryController, TypedDeductionsController, BonusesController,
    FinancialExemptionsController, PayrollCorrectionsController, SocialInsuranceController, PayrollBankSheetController, PayrollOverviewController, PayrollAllowancesController,
    PayrollDailyAccrualController],
  providers: [PayrollService, ObligationsService, PayrollRulesService, PayrollPolicyService, PayrollSalaryHistoryService, TypedDeductionsService, TypedDeductionsScheduler, BonusesService,
    FinancialExemptionsService, PayrollCorrectionsService, SocialInsuranceService, PayrollOverviewService, PayrollAllowancesService,
    PayrollDailyAccrualService, PayrollDailyAccrualScheduler],
})
export class PayrollModule {}
