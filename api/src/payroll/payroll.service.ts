import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Between, EntityManager, In, LessThanOrEqual, MoreThanOrEqual, Not, Repository } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, userHasPerm } from '../auth/guards'
import { AttendanceService } from '../attendance/attendance.service'
import { AttendanceDay } from '../attendance/attendance.entities'
import { Employee } from '../employees/employee.entity'
import { MONTHLY_SALARY_COMPONENTS } from '../employees/compensation'
import { OvertimeEntry } from '../requests/entities/attendance.entities'
import {
  EmployeeObligation,
  Loan,
  LoanInstallment,
} from '../requests/entities/financial.entities'
import { Leave, LeaveType } from '../requests/entities/leave.entities'
import { PayrollDecimal } from './payroll-decimal'
import { parseSickPayTiers, payrollLeaveDeductionLines, sickLeaveDaysInCover, sickLeaveDeduction, type SickPayTier } from './sick-leave-pay'
import { readSuspensionPayrollDays, suspendedDatesBetween } from '../employees/employee-suspensions'
import { withSuspensionLine } from '../employees/employee-suspension-rules'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import {
  PayrollItem,
  PayrollRun,
  PayrollRunMember,
  PayrollScopeType,
} from './payroll.entities'
import { LatenessTier } from './payroll-rules.entities'
import { OffboardingCase } from '../offboarding/offboarding.entities'
import { payrollEmploymentCoverage } from './payroll-employment'
import { getSettlementFinancialClaims, lockPayrollEmployees } from './payroll-settlement-boundary'
import { assertSettlementSalaryMatchesItem, payrollItemSettlementPayout } from './payroll-settlement-salary'
import { PayrollMemberSnapshot, PayrollRunEvent } from './payroll-membership.entities'
import { claimPayrollPeriod, findPayrollConflicts, releasePayrollClaims } from './payroll-membership-guard'
import { Branch } from '../org/entities/branch.entity'
import { Department } from '../org/entities/department.entity'
import { Team } from '../org/entities/team.entity'
import { CostCenter } from '../assets/assets.entities'
import { loadAttendanceExemptions, exemptionPolicyOnDate } from '../attendance/attendance-exemption-resolver'
import { Request } from '../requests/entities/request.entity'
import { attendanceDeductionDay, AttendanceDeductionPolicy } from './attendance-deductions'
import { computeSocialInsurance } from './social-insurance'
import { readSocialInsuranceContext } from './social-insurance.service'
import { readPayrollShadowAttendance } from './payroll-shadow-attendance'
import { roundPayrollMoney as round2 } from './payroll-money'
import { payrollPaySplit } from './pay-split'
import { buildPayrollInstallmentPlan, isPayrollInstallmentPlan, PayrollInstallmentPlan, postPayrollInstallments, releasePayrollInstallments, reservePayrollInstallments } from './payroll-installment-ledger'
import { legacyInstallmentNumber, readLoanInstallmentPositions } from './payroll-installment-balances'
import { protectPayrollObligations } from './payroll-obligation-protection'
import { postPayrollObligations, readPayrollNetProtectionSettings, readTypedObligationFacts, releasePayrollObligations, reservePayrollObligations } from './payroll-obligation-ledger'
import { describePayrollObligationLines } from './payroll-obligation-trace'
import { describePayrollItemsLines, payrollLineColumns } from './payroll-item-lines'
import { approvedPayrollOvertimeClaims, assertUniqueOvertimeDays, closedOvertimePeriod, legacyExemptOvertimeSource, overtimeFinancialValue, overtimeTraceMatchesStoredTotals, projectOvertimeFinancialValue } from './overtime-financial'
import { findPayrollPeriodContinuity, payrollPeriodBounds, PayrollPeriodError, payrollPolicyPeriodBounds, shiftPayrollPeriod } from './payroll-period'
import { PAYROLL_SALARY_EVIDENCE_MODE_KEY, parsePayrollSalaryEvidenceMode, samePayrollRunSalarySource, selectPayrollRunSalary } from './payroll-run-salary'
import { createHash } from 'node:crypto'
import { localDateOf } from '../attendance/attendance.service'
import { PayrollPolicy, PayrollPolicyVersion } from './payroll-policy.entities'
import { payrollPolicyEffectiveEnds } from './payroll-policy-publish'
import { foldPayrollRunInclusions, PayrollRunDefinition, payrollRunDefinitionColumns, payrollRunDefinitionOf, PayrollRunDefinitionError, payrollRunHasOrgFilters, payrollRunSelectionMode, PayrollRunExclusion, PayrollRunFilters, payrollLegacyCalculateAllowed } from './payroll-run-definition'
import { findPayrollRunSeries, findPayrollRunSeriesLocked, payrollRunListsEmployee, payrollRunSeriesName, planPayrollRunMembership, type PayrollRunMembershipPlan } from './payroll-run-membership-moves'
import { PayrollMembershipRow, resolvePayrollRunMembership } from './payroll-run-membership'
import { buildPayrollUnassignedReport, PAYROLL_EXCLUSION_LABELS, PayrollUnassignedReport } from './payroll-unassigned-report'
import { PayrollRunUnassignedAck } from './payroll-run-definition.entities'
// B4 / الخطوات 19–21: لقطة السياسة على المسير، ومحرك السياسة خلف engine_mode، والشرائح المؤرخة.
import { capturePayrollRunPolicySnapshot, diffPayrollRunPolicySnapshots, parsePayrollRunPolicySnapshot, type PayrollRunPolicySnapshot } from './payroll-policy-snapshot'
import { payrollLatenessTierDeduction } from './payroll-lateness-tiers'
// «شيل خصم» لشهر على شركة/فرع/أقسام/فرق/موظفين — يتطبق على المسودة والمحسوب بس عند الحساب
import { readActiveDeductionWaivers, waiveAttendanceDeductionDay, waivedDeductionKinds, waivePolicyShadowTotals, withoutWaivedObligations } from './payroll-deduction-waivers'
// بدل دوام أيام العطلات (أوامر الموارد البشرية + طلبات «دوام يوم عطلة» المعتمدة) → قيد «بدل» في الدفتر عند الحساب
import { syncHolidayWorkPayroll } from '../attendance/holiday-work'
// تراكم المسير يومًا بيوم (قرار المالك 20 سبتمبر): اليوم بيتحسب ليلته، وإقفال الشهر بيقرأه
import { PayrollDailyAccrualService } from './payroll-daily-accrual.service'
import { computePayrollPolicyEnginePreNet, parsePayrollEngineParityReport, PAYROLL_DEFAULT_ENGINE_MODE, PAYROLL_ENGINE_MODE_LABELS, PAYROLL_ENGINE_MODES, PAYROLL_PARITY_COMPONENTS,
  payrollParityDifferenceKey, payrollParityEmployeeRow, payrollPolicySwitchIssues, summarizePayrollEngineParity, type PayrollEngineMode, type PayrollParityEmployeeRow,
  payrollApprovalParityIssues, payrollParityPendingGroups, payrollShadowSourceIssueCodes, payrollPolicyEngineWithLoans, type PayrollPolicyEngineFacts } from './payroll-policy-engine-run'
import { PayrollRunParityExplanation } from './payroll-lateness-tier-sets.entities'
// B5 / الخطوات 22 و23: ترتيب تحصيل المالك، وانتقالات الحالة وفصل المهام وقيد الصرف، وفترة التكافؤ التشغيلية.
import { readPayrollRunCollectionOrder, type PayrollRunCollectionOrder } from './payroll-collection-order'
import { PAYROLL_CALCULATION_EVENT_TYPES, PAYROLL_PAY_CHANNEL_LABELS, PAYROLL_SELF_APPROVAL_KEY, payrollPayRecordIssue, payrollPayRecordOf, payrollRunStateIssue,
  payrollSelfApprovalAllowed, payrollSelfApprovalIssue, type PayrollPayChannel } from './payroll-run-approval'
import { summarizePayrollParityOperations } from './payroll-parity-operations'
// الخطوة 26 (C3): الإعفاء المالي في مسير — التطبيق عند الحساب، والتحقق والتثبيت عند الاعتماد، والإسقاط أو التأجيل عند الصرف
import { applyFinancialExemptions, exemptionLoanLines, exemptPolicyShadowTotals, summarizeFinancialExemptions } from './financial-exemptions'
import { assertRunExemptionsForApproval, describePayslipExemptions, markRunExemptionsApplied, postExemptedObligations, readActiveRunExemptions,
  readExemptionObligationFacts, releaseRunExemptions, reserveExemptedObligations } from './payroll-financial-exemption-ledger'
// C8 / الخطوة 31: مسار العكس والمسير التكميلي بعد الصرف — اعتماد مسير العكس وتنفيذه وإلغاؤه من نقاط المسير نفسها
import { payrollRunTypeOf } from './payroll-corrections'
import { PayrollRunReversalLine } from './payroll-corrections.entities'
import { cancelPayrollReversalLines, carryReversedRunExemptions, describePayrollItemReversal, describePayrollRunCorrection, lockPayrollRunForCorrection, planPayrollItemReversal,
  postPayrollReversalLine, type PayrollReversalBlocker } from './payroll-reversal-ledger'

// الخطوة 16: مدخلات تعريف المسير من الشاشة (تُتحقق هنا ضد القاعدة؛ الـDTO يتحقق من الشكل فقط).
export interface PayrollRunDefinitionInput {
  name?: string | null
  policyVersionId?: number
  period?: string
  // includeEmployeeIds: قائمة الإضافة الدائمة — أسماء يضمها المالك للمسير فوق فلاتره (OR)، وتُنسخ لمسير الشهر الجديد كما هي
  filters?: { branchIds?: number[]; departmentIds?: number[]; teamIds?: number[]; employeeIds?: number[]; allEmployees?: boolean; includeEmployeeIds?: number[] }
  exclusions?: Array<{ employeeId: number; reason: string }>
  confirmEmptyScope?: boolean
  emptyScopeReason?: string | null
}

/**
 * سقف أيام الإيقاف المخصومة: أيام الراتب المستحق ناقص أيام بدون راتب ومكافئ خصم المرضية، بمنزلتين مقصوصتين،
 * فمجموع أيام الخصم ما يعديش أيام الراتب والصافي ما يبقاش سالب (مثلًا دورة 31 يوم: 3 أيام مرضية بلا أجر + 28 إيقاف).
 */
export function payrollSuspensionDaysWithinCap(suspensionDays: number, paidDays: number, unpaidDays: number, sickEquivalentDays: string): number {
  const room = PayrollDecimal.from(String(paidDays)).subtract(PayrollDecimal.from(String(unpaidDays))).subtract(PayrollDecimal.from(sickEquivalentDays || '0'))
  return Math.min(suspensionDays, Math.max(0, Number(room.format(2, 'DOWN'))))
}

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name)

  constructor(
    @InjectRepository(PayrollRun)
    private readonly runs: Repository<PayrollRun>,
    @InjectRepository(PayrollItem)
    private readonly items: Repository<PayrollItem>,
    @InjectRepository(PayrollRunMember)
    private readonly members: Repository<PayrollRunMember>,
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
    @InjectRepository(AttendanceDay)
    private readonly attendance: Repository<AttendanceDay>,
    @InjectRepository(OvertimeEntry)
    private readonly overtime: Repository<OvertimeEntry>,
    @InjectRepository(Leave)
    private readonly leaves: Repository<Leave>,
    @InjectRepository(LoanInstallment)
    private readonly installments: Repository<LoanInstallment>,
    @InjectRepository(Loan)
    private readonly loans: Repository<Loan>,
    @InjectRepository(EmployeeObligation)
    private readonly obligations: Repository<EmployeeObligation>,
    @InjectRepository(LatenessTier)
    private readonly latenessTiers: Repository<LatenessTier>,
    @InjectRepository(RequestsConfig)
    private readonly config: Repository<RequestsConfig>,
    private readonly attendanceService: AttendanceService,
    // تراكم المسير يومًا بيوم: إقفال الشهر بيقرأ الأيام المتراكمة النضيفة بدل ما يعيد حساب كل يوم-موظف
    private readonly dailyAccrual: PayrollDailyAccrualService
  ) {}

  private async cfg(key: string, fallback: string): Promise<string> {
    const row = await this.config.findOne({ where: { key } })
    return row?.value ?? fallback
  }

  // فترة المسير: 23 الشهر السابق → 22 شهر الفترة (قابلة للإعداد)
  async periodRange(period: string) {
    if (!/^\d{4}-\d{2}$/.test(period)) {
      throw new BadRequestException('صيغة الفترة YYYY-MM')
    }
    const startDay = Number(await this.cfg('payroll.cycle_start_day', '23'))
    const [y, m] = period.split('-').map(Number)
    if (y < 1900 || y > 9998 || m < 1 || m > 12 || !Number.isInteger(startDay) || startDay < 1 || startDay > 31) {
      throw new BadRequestException('الشهر أو يوم بداية دورة الرواتب غير صالح')
    }
    // الخطوة 14 / PR-08: النهاية داخل شهر الفترة، والبداية = نهاية الفترة السابقة + يوم،
    // فدورات 29/30/31 لا تتداخل (لا يوم مشترك يوقف الشهر التالي بـPAYRUN-DUP-002) ولا تترك فجوة.
    return payrollPeriodBounds(period, startDay)
  }

  // ① / PR-03: النطاق التنظيمي أولًا، ثم تقاطع الخدمة؛ isActive وحده يسقط مستحقات المنتهي.
  async resolveScope(dto: {
    scopeType: PayrollScopeType
    scopeIds?: number[]
    employeeIds?: number[]
    branchId?: number | null
  }, employees = this.employees): Promise<Employee[]> {
    const where: Record<string, unknown> = {}
    const ids = dto.scopeIds ?? []
    switch (dto.scopeType) {
      case 'COMPANY':
        break
      case 'BRANCH':
        where.branchId = In(ids.length ? ids : [dto.branchId])
        break
      case 'DEPARTMENT':
        if (!ids.length) return []
        where.departmentId = In(ids)
        break
      case 'TEAM':
        if (!ids.length) return []
        where.teamId = In(ids)
        break
      case 'COST_CENTER':
        if (!ids.length) return []
        where.costCenterId = In(ids)
        break
      case 'CUSTOM':
        if (!(dto.employeeIds ?? []).length) return []
        where.id = In(dto.employeeIds!)
        break
    }
    return employees.find({ where, order: { id: 'ASC' } })
  }

  // الخطوة 16: النطاق بفلاتر التعريف وفرع كل عضو في آخر يوم من الفترة (أو آخر يوم كان فيه داخل النطاق لمن انتقل).
  private assertScopeAccess(user: JwtPayload, definition: PayrollRunDefinition, memberBranches: Array<number | null>) {
    const branchId = branchScopeOf(user)
    if (branchId === null) return
    const { filters } = definition
    if (branchId < 1 || filters.allEmployees ||
      filters.branchIds.some(id => id !== branchId) ||
      memberBranches.some(id => id !== branchId) ||
      (!memberBranches.length && !(filters.branchIds.length === 1 && filters.branchIds[0] === branchId))) {
      throw new ForbiddenException('نطاق المسير خارج الفرع المسموح لك')
    }
  }

  // C8: عامة لمسار التصحيح (payroll-corrections.service)؛ مسير العكس بلا عضوية ولا بنود يُحكم بنطاق مسيره الأصلي
  async assertRunAccess(user: JwtPayload, run: PayrollRun, em = this.runs.manager): Promise<void> {
    const branch = branchScopeOf(user)
    if (branch === null) return
    if (run.runType === 'REVERSAL' && run.parentRunId) {
      const parent = await em.getRepository(PayrollRun).findOneBy({ id: run.parentRunId })
      if (!parent || parent.id === run.id) throw new ForbiddenException('تعذر التحقق من نطاق المسير الأصلي لمسير العكس')
      return this.assertRunAccess(user, parent, em)
    }
    if (branch < 1 || run.scopeType === 'COMPANY') throw new ForbiddenException('نطاق المسير خارج الفرع المسموح لك')
    const members = await em.getRepository(PayrollRunMember).find({ where: { runId: run.id } })
    const items = await em.getRepository(PayrollItem).find({ where: { runId: run.id } })
    const ids = [...new Set([...members, ...items].map(row => row.employeeId))]
    const branchIds = run.scopeIds ? JSON.parse(run.scopeIds) as number[] : [run.branchId]
    // الخطوة 16: فروع تعريف المسير الجديد تحكم المسودة قبل أن تُحفظ لها عضوية.
    const definitionBranches = run.definition ? payrollRunDefinitionOf(run).filters.branchIds : null
    if (definitionBranches?.some(id => id !== branch) || (run.definition && payrollRunDefinitionOf(run).filters.allEmployees)) throw new ForbiddenException('نطاق المسير خارج الفرع المسموح لك')
    const legacyBranch = definitionBranches ? (definitionBranches.length === 1 ? definitionBranches[0] : null)
      : run.scopeType === 'BRANCH' && branchIds.length === 1 ? branchIds[0] : null
    if (!run.definition && run.scopeType === 'BRANCH' && branchIds.some(id => id !== branch)) throw new ForbiddenException('نطاق المسير خارج الفرع المسموح لك')
    if (!ids.length && legacyBranch !== branch) throw new ForbiddenException('تعذر التحقق من النطاق التاريخي للمسير')
    for (const id of ids) {
      const member = members.find(row => row.employeeId === id)
      const savedBranch = member?.snapshot ? member.snapshot.branchId : legacyBranch
      if (savedBranch !== branch) throw new ForbiddenException('نطاق العضوية المحفوظ خارج الفرع المسموح لك أو غير موثق تاريخيًا')
    }
  }

  // يقبل أي قيمة من الطلب (نص ناقص أو غير نصي) ويرد بكود عربي موحد بدل رسالة class-validator.
  private requireReason(reason?: unknown) {
    if (typeof reason !== 'string' || !reason.trim() || reason.trim().length > 500) {
      throw new BadRequestException({ code: 'PAYRUN-REASON-001', message: 'اكتب سببًا واضحًا للعملية، بحد أقصى 500 حرف' })
    }
    return reason.trim()
  }

  private stateError(action: string, status: string) {
    return new BadRequestException({ code: ['APPROVED', 'PAID'].includes(status) ? 'PAYRUN-STATE-002' : 'PAYRUN-STATE-001',
      message: `لا يمكن ${action} والمسير في حالة ${status}؛ المسير المصروف لا يُفتح لإعادة الحساب` })
  }

  private async visibleConflicts(user: JwtPayload, conflicts: Awaited<ReturnType<typeof findPayrollConflicts>>, em = this.runs.manager) {
    if (branchScopeOf(user) === null) return conflicts
    const result = []
    for (const conflict of conflicts) {
      const other = await em.getRepository(PayrollRun).findOneBy({ id: conflict.otherRunId })
      try {
        if (!other) throw new ForbiddenException()
        await this.assertRunAccess(user, other, em)
        result.push(conflict)
      } catch (error) {
        if (!(error instanceof ForbiddenException)) throw error
        result.push({ ...conflict, otherRunId: null, name: 'مسير خارج نطاق صلاحيتك — راجع مسؤول الرواتب' })
      }
    }
    return result
  }

  private async event(em: EntityManager, user: JwtPayload, runId: number, eventType: string, reason: string | null, payload: Record<string, unknown> | null) {
    return em.getRepository(PayrollRunEvent).save({ runId, eventType, actorUserId: user.sub, reason, payload })
  }

  private async validateRunMembers(em: EntityManager, run: PayrollRun, items: PayrollItem[]) {
    if (!items.length) throw new BadRequestException('المسير لا يحتوي بنودًا مستحقة للاعتماد أو الصرف')
    const members = await em.getRepository(PayrollRunMember).find({ where: { runId: run.id } })
    const included = members.filter(member => member.membershipStatus !== 'EXCLUDED')
    if (run.snapshotVersion > 0 && (included.length !== items.length ||
      included.some(member => !member.snapshot || !items.some(item => item.employeeId === member.employeeId)))) {
      throw new ConflictException({ code: 'PAYRUN-SNAPSHOT-001', message: 'بنود المسير لا تطابق لقطة الأعضاء؛ راجع المسير قبل الاعتماد أو الصرف' })
    }
    return [...new Set([...included, ...items].map(row => row.employeeId))]
  }

  private async lockRun(em: EntityManager, runId: number) {
    const rows = await em.query(`DECLARE @result int;
      EXEC @result = sys.sp_getapplock @Resource = @0, @LockMode = 'Exclusive',
        @LockOwner = 'Transaction', @LockTimeout = 10000;
      SELECT @result AS lockResult;`, [`hr:payroll:run:${runId}`])
    if (!rows.length || Number(rows[0].lockResult) < 0) throw new ConflictException('المسير قيد التحديث؛ حاول مجددًا بعد انتهاء العملية')
  }

  // PR-05: فحص الصلاحية وقراءة النسخة تحت قفل الحساب نفسه حتى لا تختلط نسختان.
  private async readRun<T>(runId: number, read: (em: EntityManager, run: PayrollRun) => Promise<T>): Promise<T> {
    return this.runs.manager.transaction(async em => {
      await this.lockRun(em, runId)
      const run = await em.getRepository(PayrollRun).findOneBy({ id: runId })
      if (!run) throw new NotFoundException('المسير غير موجود')
      return read(em, run)
    })
  }

  private async assertAttendanceExemptionSnapshot(em: EntityManager, run: PayrollRun, items: PayrollItem[]) {
    for (const item of items) {
      let saved: Record<string, any>
      try { saved = item.breakdown ? JSON.parse(item.breakdown) : {} }
      catch { throw new ConflictException('تفصيل المسير غير صالح؛ أعد حسابه قبل الاعتماد') }
      const from = saved.coverFrom ?? run.startDate
      const to = saved.coverTo ?? run.endDate
      const current = await loadAttendanceExemptions(em, item.employeeId, from, to)
      const comparable = (windows: Array<Record<string, any>>, snapshot: boolean) => JSON.stringify(windows.map(window => {
        const lastDate = window.terminatedFrom ? new Date(Date.parse(`${window.terminatedFrom}T12:00:00Z`) - 86400000).toISOString().slice(0, 10) : to
        return { id: window.id, from: window.effectiveFrom > from ? window.effectiveFrom : from,
          to: [window.effectiveTo ?? to, lastDate, to].sort()[0],
          overtime: snapshot ? window.overtimeSource === 'OVERRIDE' ? window.overtimeEligible : null : window.overtimeEligibleOverride ?? null,
          unpaid: snapshot ? window.unpaidLeaveSource === 'OVERRIDE' ? window.unpaidLeaveDeductible : null : window.unpaidLeaveDeductibleOverride ?? null }
      }).sort((a, b) => a.id - b.id))
      if (comparable(current, false) !== comparable(Array.isArray(saved.attendanceExemptions) ? saved.attendanceExemptions : [], true)) {
        throw new ConflictException({ code: 'PAYRUN-EXEMPTION-CHANGED', message: `قرار استثناء الحضور للموظف #${item.employeeId} تغيّر بعد الحساب؛ أعد حساب المسودة قبل الاعتماد` })
      }
    }
  }

  private attendanceRuleTrace(row: AttendanceDay) {
    return { date: row.date, snapshot: row.attendanceRuleSnapshot ?? null,
      status: row.status, lateMinutes: Number(row.lateMinutes ?? 0),
      shortfallMinutes: row.shortfallMinutes ?? null, deductibleMinutes: Number(row.deductibleMinutes ?? 0),
      reviewRequired: Boolean(row.attendanceReviewRequired), reviewReason: row.attendanceReviewReason ?? null }
  }

  private async assertAttendanceRuleSnapshot(em: EntityManager, run: PayrollRun, items: PayrollItem[]) {
    // تبسيط الرواتب (2026-09-15): الحساب يجدد أيام الحضور حتى اليوم فقط (materializeAbsences لا تتجاوز اليوم، وcomputeDay لا يحفظ يومًا لم يأتِ)،
    // ويقرأ صفوف الأيام اللاحقة كما هي مخزنة. فاليوم اللاحق يُقارن بصفه المخزن لا بإعادة حسابه، وإلا لا تطابق فترة مفتوحة لقطتها أبدًا.
    const today = localDateOf(new Date())
    for (const item of items) {
      const saved = item.breakdown ? JSON.parse(item.breakdown) : {}
      // المسيرات القديمة تسبق هذا الدليل؛ لا نصنع لها لقطة من الإعدادات الحالية.
      if (!Array.isArray(saved.attendanceRules)) continue
      if (saved.attendanceRules.some((day: { reviewRequired: boolean }) => day.reviewRequired)) {
        throw new ConflictException({ code: 'PAYRUN-ATTENDANCE-REVIEW',
          message: `حضور الموظف #${item.employeeId} يحتاج مراجعة؛ صحح البصمة أو إعداد الدوام ثم أعد حساب المسودة` })
      }
      const rows = await em.getRepository(AttendanceDay).find({ where: { employeeId: item.employeeId,
        date: Between(saved.coverFrom ?? run.startDate, saved.coverTo ?? run.endDate) } })
      const exemptions = await loadAttendanceExemptions(em, item.employeeId, saved.coverFrom ?? run.startDate, saved.coverTo ?? run.endDate)
      const comparable = (days: Array<{ date: string }>) => JSON.stringify([...days].sort((a, b) => a.date.localeCompare(b.date)))
      // يوم الإيقاف عن العمل مش داخل حضور المسير (بيتخصم يوم إيقاف بس)، فمايتقارنش هنا كمان
      const suspended = await suspendedDatesBetween(em, item.employeeId, saved.coverFrom ?? run.startDate, saved.coverTo ?? run.endDate)
      const fresh: ReturnType<PayrollService['attendanceRuleTrace']>[] = []
      for (const day of rows) {
        if (suspended.has(day.date) || exemptionPolicyOnDate(exemptions, day.date, { overtimeEligible: false, unpaidLeaveDeductible: true }).isExempt) continue
        fresh.push(this.attendanceRuleTrace(day.date > today ? day : await this.attendanceService.computeDay(item.employeeId, day.date, false, true, em)))
      }
      if (comparable(fresh) !== comparable(saved.attendanceRules)) {
        throw new ConflictException({ code: 'PAYRUN-ATTENDANCE-CHANGED',
          message: `الحضور أو إعداد الدوام للموظف #${item.employeeId} تغيّر بعد الحساب؛ أعد حساب المسودة قبل الاعتماد` })
      }
    }
  }

  // الخطوة 13: الاعتماد يثبت راتب الشهر المحفوظ في لقطة العضو؛ تعديل سجل الأجر أو وضع المصدر بعد الحساب يلزم إعادة الحساب.
  private async assertSalarySourceSnapshot(em: EntityManager, run: PayrollRun, items: PayrollItem[]) {
    const members = await em.getRepository(PayrollRunMember).find({ where: { runId: run.id } })
    const mode = parsePayrollSalaryEvidenceMode(await this.cfg(PAYROLL_SALARY_EVIDENCE_MODE_KEY, 'MONTHLY_HISTORY'))
    for (const item of items) {
      const saved = members.find(member => member.employeeId === item.employeeId)?.snapshot?.salarySource
      // المسيرات السابقة لهذا الدليل لا نصنع لها مصدرًا من الراتب الحالي.
      if (!saved) continue
      const employee = await em.getRepository(Employee).findOneBy({ id: item.employeeId })
      const current = employee ? await selectPayrollRunSalary(em, employee, saved.referencePeriod, mode) : null
      if (saved.kind === 'CURRENT_FILE_UNVERIFIED' && saved.referencePeriod === run.period && mode === 'MONTHLY_HISTORY_OR_CURRENT_FILE' && current &&
        (current.ok ? current.source.kind === 'CURRENT_FILE_UNVERIFIED' : !['SALARY_PAYROLL_PERIOD_GAP', 'SALARY_PAYROLL_PERIOD_INVALID', 'SALARY_HISTORY_INVALID'].includes(current.code))) {
        // راتب الملف غير الموثق محفوظ في اللقطة كما حُسب (PR-05)؛ تعديل الملف وحده لا يعيد تسعيره.
        // يُمنع الاعتماد فقط لو عاد الوضع الافتراضي أو صار للموظف سجل شهري يحكم هذا الشهر.
        continue
      }
      if (saved.referencePeriod !== run.period || !current || !samePayrollRunSalarySource(saved, current)) {
        throw new ConflictException({ code: 'PAYRUN-SALARY-CHANGED',
          message: `راتب شهر المسير للموظف #${item.employeeId} تغيّر في سجل الأجر أو إعداد مصدره بعد الحساب؛ أعد حساب المسودة قبل الاعتماد` })
      }
    }
  }

  private async assertSettlementBoundary(em: EntityManager, items: PayrollItem[]) {
    for (const item of items) {
      const claims = await getSettlementFinancialClaims(em, item.employeeId)
      const breakdown = item.breakdown ? JSON.parse(item.breakdown) : {}
      if ((breakdown.overtimeEntryIds ?? []).some((id: number) => claims.overtimeIds.has(id)) ||
        (breakdown.installmentIds ?? []).some((id: number) => claims.installmentIds.has(id))) {
        throw new ConflictException('أحد بنود المسير دخل تصفية معتمدة؛ أعد حساب المسودة أو راجع التسوية المالية قبل الصرف')
      }
      // قرار المالك (20 سبتمبر): صف «تصفية — مصروف مع التصفية» لازم يساوي بند الراتب في التصفية المعتمدة بالظبط.
      if (breakdown.settlementPayout) {
        await assertSettlementSalaryMatchesItem(em, item.employeeId, Number(breakdown.settlementPayout.caseId), Number(item.netPay))
      }
      if ((breakdown.overtimeEntryIds ?? []).length) {
        if (!Array.isArray(breakdown.overtimeEntryIds) || breakdown.overtimeEntryIds.some((id: unknown) => !Number.isSafeInteger(id) || Number(id) < 1) ||
          new Set(breakdown.overtimeEntryIds).size !== breakdown.overtimeEntryIds.length) throw new ConflictException('مراجع مصادر الإضافي غير صالحة أو مكررة')
        if (breakdown.overtime != null && (!Array.isArray(breakdown.overtime) || breakdown.overtime.length !== breakdown.overtimeEntryIds.length ||
          new Set(breakdown.overtime.map((row: any) => row?.id)).size !== breakdown.overtimeEntryIds.length ||
          breakdown.overtime.some((row: any) => !row || !breakdown.overtimeEntryIds.includes(row.id) ||
            typeof row.amount !== 'number' || !Number.isFinite(row.amount) || row.amount < 0 || typeof row.hours !== 'number' || !Number.isFinite(row.hours) || row.hours < 0) ||
          // مسير اتحسب قبل قرار القص (16 سبتمبر) إجماليه محفوظ بالتقريب القديم وبيفضل صالح للاعتماد والصرف
          !overtimeTraceMatchesStoredTotals(breakdown.overtime, Number(item.overtimeAmount), Number(item.overtimeHours)))) {
          throw new ConflictException('تفصيل الإضافي لا يطابق مصادره أو إجماليه المحفوظ في المسير')
        }
        const paidClaims = await approvedPayrollOvertimeClaims(em, item.employeeId, item.runId)
        if (breakdown.overtimeEntryIds.some((id: number) => paidClaims.has(id))) {
          throw new ConflictException({ code: 'PAYRUN-OVERTIME-CLAIMED', message: 'أحد مصادر الإضافي دخل مسيرًا معتمدًا آخر؛ أعد حساب المسودة قبل الاعتماد أو الصرف' })
        }
        const sources = await em.find(OvertimeEntry, { where: { employeeId: item.employeeId, id: In(breakdown.overtimeEntryIds) } })
        if (sources.length !== new Set(breakdown.overtimeEntryIds).size) throw new ConflictException('أحد مصادر الإضافي المحفوظة لم يعد موجودًا')
        await assertUniqueOvertimeDays(em, item.employeeId, sources.map(source => source.date))
        for (const source of sources) {
          if (source.status !== 'APPROVED') throw new ConflictException('أحد مصادر الإضافي تغيّرت حالة اعتماده أو صُرف بالفعل')
          const trace = Array.isArray(breakdown.overtime) ? breakdown.overtime.find((row: { id: number }) => row.id === source.id) : null
          if (!trace && [source.calculationSnapshot, source.approvedMinutes, source.hourlyRateSnapshot, source.amountSnapshot,
            source.originalPeriod, source.deferredFromRunId].some(value => value != null)) {
            throw new ConflictException('مصدر إضافي جديد لا يملك تفصيلًا ماليًا محفوظًا داخل المسير؛ أعد حساب المسودة')
          }
          if (trace) {
            let financialSource = source
            if (trace.legacyExplicitRequest) {
              const legacy = trace.legacyExplicitRequest
              const request = source.requestId ? await em.findOneBy(Request, { id: source.requestId, requesterId: item.employeeId }) : null
              let payload: { date?: string; hours?: number } = {}
              try { payload = request?.payload ? JSON.parse(request.payload) : {} } catch { /* المصدر التالف يرفض أدناه */ }
              if (trace.provenance !== 'LEGACY' || source.calculationSnapshot != null || source.source !== 'PRE_REQUESTED' ||
                source.requestId !== legacy.requestId || !request || request.typeCode !== 'OVERTIME' ||
                !['APPROVED', 'IN_EXECUTION', 'COMPLETED'].includes(request.status) || payload.date !== source.date ||
                Number(payload.hours) !== legacy.requestHours || Number(source.hoursRequested) !== legacy.entryHoursRequested ||
                (source.payableHours == null ? null : Number(source.payableHours)) !== legacy.sourcePayableHours) {
                throw new ConflictException('ساعات طلب إضافي سابق للمستثنى تغيّرت بعد الحساب؛ راجع مستند الاعتماد')
              }
              // تفسير الاستحقاق القديم ثابت من الطلب؛ لا نكتب ساعات مشتقة فوق السجل التاريخي.
              financialSource = { ...source, payableHours: Math.min(legacy.requestHours, legacy.entryHoursRequested) }
            }
            const current = projectOvertimeFinancialValue(financialSource, trace.hourlyRate)
            if (current.amount !== trace.amount || current.approvedMinutes !== trace.approvedMinutes ||
              current.multiplier !== trace.multiplier || current.hourlyRate !== trace.hourlyRate || current.provenance !== trace.provenance ||
              source.date !== trace.date || source.source !== trace.source) {
              throw new ConflictException('قيمة مصدر إضافي معتمد تغيّرت بعد حساب المسير؛ راجع المصدر قبل الصرف')
            }
          } else projectOvertimeFinancialValue(source, 0)
        }
      }
    }
  }

  // ===== غلاف التوافق: مسير فرع واحد لفترة (المسار القديم) =====
  async calculate(user: JwtPayload, branchId: number, period: string, options: { reason?: string; allowDraftConflicts?: boolean; refreshInstallmentPolicy?: boolean } = {}) {
    return this.calculateDefined(user, {
      period,
      scopeType: 'BRANCH',
      branchId,
      scopeIds: [branchId],
      reason: options.reason,
      allowDraftConflicts: options.allowDraftConflicts,
      refreshInstallmentPolicy: options.refreshInstallmentPolicy,
    })
  }

  // ===== إنشاء/إعادة حساب مسير قابل للتعريف (اسم + فترة + نطاق) =====
  async calculateDefined(user: JwtPayload, dto: {
    runId?: number
    name?: string | null
    period: string
    scopeType: PayrollScopeType
    scopeIds?: number[]
    employeeIds?: number[]
    branchId?: number | null
    policyId?: number | null
    reason?: string
    allowDraftConflicts?: boolean
    refreshInstallmentPolicy?: boolean
    confirmEmptyScope?: boolean
    emptyScopeReason?: string | null
    // الخطوة 19: تحديث لقطة السياسة بطلب صريح وبصمة الإعدادات الحالية التي عُرضت فروقها
    refreshPolicySnapshot?: boolean
    expectedPolicySnapshotHash?: string | null
    // الخطوة 22 (B5): استبعاد موظف من مسير محسوب لحل تعارض — يُكتب في التعريف وتُعاد العضوية والمبالغ في المعاملة نفسها
    addExclusions?: Array<{ employeeId: number; reason: string }>
    // قرار المالك (20 سبتمبر): ضم أسماء لمسير محسوب (عضوية دائمة) — يُكتب في التعريف وتُعاد العضوية والمبالغ في المعاملة نفسها
    membership?: { add?: number[]; remove?: number[]; reason: string }
  }) {
    const proposedRange = await this.periodRange(dto.period)
    const runId = await this.runs.manager.transaction(async em => {
      // PR-11: يمنع سباق إنشاء نفس مسير الفرع، ويُحرر تلقائيًا مع المعاملة.
      const calculationLock = await em.query(`DECLARE @result int;
        EXEC @result = sys.sp_getapplock @Resource = 'hr:payroll:calculation',
          @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000;
        SELECT @result AS lockResult;`)
      if (!calculationLock.length || Number(calculationLock[0].lockResult) < 0) throw new ConflictException('يوجد حساب مسير جارٍ؛ حاول مجددًا بعد انتهائه')
      const runs = em.getRepository(PayrollRun)
      const items = em.getRepository(PayrollItem)
      const members = em.getRepository(PayrollRunMember)

      // إيجاد المسير: بالمعرّف، أو مسير الفرع القديم لنفس الفترة، وإلا أنشئ جديداً
      let run: PayrollRun | null = null
      if (dto.runId) {
        run = await runs.findOne({ where: { id: dto.runId } })
        if (!run) throw new NotFoundException('المسير غير موجود')
      } else if (dto.scopeType === 'BRANCH' && dto.branchId != null) {
        run = await runs.findOne({
          where: { branchId: dto.branchId, period: dto.period, scopeType: 'BRANCH', status: Not('CANCELLED') },
          order: { id: 'DESC' },
        })
      }
      if (run) {
        await this.lockRun(em, run.id)
        run = await runs.findOneByOrFail({ id: run.id })
        await this.assertRunAccess(user, run, em)
        // C8 / الخطوة 31: مسير العكس لا يُحتسب ولا يُعاد حسابه ولا يُستبعد منه موظف؛ سطوره لقطة بنود المسير الأصلي
        if (payrollRunTypeOf(run) === 'REVERSAL') {
          throw new ConflictException({ code: 'PAYRUN-REVERSAL-NO-CALCULATION', message: 'مسير العكس لا يُحتسب ولا يُعاد حسابه؛ ألغه وأنشئ عكسًا جديدًا من المسير المصروف لو تغيّر المطلوب' })
        }
        const sameIds = (proposed: number[] | undefined, stored: number[]) => proposed === undefined ||
          JSON.stringify([...new Set(proposed)].sort((a, b) => a - b)) === JSON.stringify([...new Set(stored)].sort((a, b) => a - b))
        const storedScopeIds = run.scopeIds ? JSON.parse(run.scopeIds) : run.scopeType === 'BRANCH' ? [run.branchId] : []
        if (run.period !== dto.period || run.scopeType !== dto.scopeType ||
          !sameIds(dto.scopeIds, storedScopeIds) || !sameIds(dto.employeeIds, run.employeeIds ? JSON.parse(run.employeeIds) : []) ||
          (dto.branchId !== undefined && dto.branchId !== run.branchId) ||
          (dto.policyId !== undefined && dto.policyId !== run.policyId)) {
          throw new BadRequestException('إعادة الحساب تستخدم فترة ونطاق المسير المحفوظين؛ أنشئ مسيرًا آخر لتغييرهما')
        }
      }
      // الخطوة 16: المسودة تُحتسب أول مرة بلا سبب؛ إعادة حساب المسير المحسوب وحدها تتطلب سببًا.
      const isDraft = run?.status === 'DRAFT'
      if (run && run.status !== 'CALCULATED' && !isDraft) {
        throw this.stateError('إعادة الحساب', run.status)
      }
      if (run && !isDraft) this.requireReason(dto.reason)
      // الخطوة 16 (مراجعة): المسير المرتبط بنسخة سياسة يُتحقق منه تحت قفل الحساب — المسودة لا تُحتسب إلا ونسختها منشورة
      // وسارية على الفترة كاملة بالتواريخ نفسها، وأي مسير مرتبط بسياسة مملوكة لفرع يبقى داخل ذلك الفرع.
      if (run?.policyVersionId) await this.assertRunPolicyAtCalculation(em, user, run, isDraft)
      if (!run && dto.name) await this.assertRunNameAvailable(em, dto.name, dto.period, null)
      const previousMembers = run ? await members.find({ where: { runId: run.id }, order: { employeeId: 'ASC' } }) : []
      const previousItems = run ? await items.find({ where: { runId: run.id }, order: { employeeId: 'ASC' } }) : []
      // الخطوة 22 (B5): «استبعاد الموظف من هذا المسير» من شاشة التعارضات — لمسير محسوب له تعريف، والموظف داخل نسخة الحساب الحالية.
      // الاستبعاد يُكتب في التعريف بسببه ومن استبعده، وإعادة الحساب نفسها (بسبب إلزامي ونسخة جديدة) تعيد العضوية والمبالغ.
      let exclusionsAdded: PayrollRunExclusion[] = []
      if (dto.addExclusions?.length) {
        if (!run || isDraft || !run.definition) this.bad('PAYRUN-EXCLUSION-RUN', 'الاستبعاد مع إعادة الحساب متاح لمسير محسوب له تعريف؛ المسودة تُعدل من تعريفها')
        const current = payrollRunDefinitionOf(run)
        for (const row of dto.addExclusions) {
          if (current.exclusions.some(item => item.employeeId === row.employeeId)) this.bad('PAYRUN-EXCLUSION-DUPLICATE', `الموظف رقم ${row.employeeId} مستبعد بالفعل من هذا المسير`)
          if (!previousMembers.some(member => member.employeeId === row.employeeId && member.membershipStatus !== 'EXCLUDED')) {
            this.bad('PAYRUN-EXCLUSION-NOT-MEMBER', `الموظف رقم ${row.employeeId} ليس داخل نسخة الحساب الحالية لهذا المسير`, { employeeId: row.employeeId })
          }
        }
        const next = await this.normalizeRunDefinition(em, user, { filters: current.filters, exclusions: [...current.exclusions, ...dto.addExclusions],
          confirmEmptyScope: !!current.emptyScope, emptyScopeReason: current.emptyScope?.reason ?? null }, current)
        Object.assign(run, payrollRunDefinitionColumns(next))
        exclusionsAdded = next.exclusions.filter(item => dto.addExclusions!.some(row => row.employeeId === item.employeeId))
      }
      // قرار المالك (20 سبتمبر): «أضفهم لمسير» و«نقل لمسير آخر» على مسير محسوب — العضوية الدائمة تُكتب في التعريف
      // وإعادة الحساب نفسها (بسبب إلزامي ونسخة جديدة) تعيد الأعضاء والمبالغ، فلا تبقى فترة بين التعديل وأثره.
      let membershipPlan: PayrollRunMembershipPlan | null = null
      if (dto.membership && (dto.membership.add?.length || dto.membership.remove?.length)) {
        if (!run || isDraft || !run.definition) this.bad('PAYRUN-MEMBERSHIP-RUN', 'تعديل أعضاء المسير مع إعادة الحساب متاح لمسير محسوب له تعريف؛ المسودة تُعدل من تعريفها')
        const current = payrollRunDefinitionOf(run)
        membershipPlan = planPayrollRunMembership(current, dto.membership)
        const next = await this.normalizeRunDefinition(em, user, { filters: membershipPlan.filters, exclusions: membershipPlan.exclusions,
          confirmEmptyScope: !!current.emptyScope, emptyScopeReason: current.emptyScope?.reason ?? null }, current)
        Object.assign(run, payrollRunDefinitionColumns(next))
      }
      // الخطوة 22 (B5): ترتيب تحصيل المالك من نسخة السياسة المجمدة (أو الترتيب الافتراضي)، للحساب القديم ومحرك السياسة معًا
      const collection: PayrollRunCollectionOrder = await readPayrollRunCollectionOrder(em, run?.policyVersionId ?? null)
      const before = run ? { snapshotVersion: run.snapshotVersion ?? 0, totalNet: Number(run.totalNet), members: previousMembers, items: previousItems } : null
      const { startDate, endDate } = run ?? proposedRange
      const existing = Boolean(run) && !isDraft
      if (!run) {
        run = runs.create({
            name: dto.name ?? null,
            scopeType: dto.scopeType,
            scopeIds: dto.scopeIds ? JSON.stringify(dto.scopeIds) : (null as any),
            employeeIds: dto.employeeIds
              ? JSON.stringify(dto.employeeIds)
              : (null as any),
            branchId: dto.scopeType === 'BRANCH' ? (dto.branchId ?? null) : null,
            policyId: dto.policyId ?? null,
            period: dto.period,
            startDate,
            endDate,
          })
      }

      // الخطوة 19: لقطة السياسة — أول حساب يلتقطها (نسخة السياسة والإعدادات والشرائح المؤرخة وأساس الأيام والبصمة)، وإعادة الحساب
      // تقرأ منها لا من الإعدادات الحية، والتحديث بطلب صريح ببصمة الإعدادات الحالية التي عُرضت فروقها.
      const snapshotStep = await this.policySnapshotForCalculation(em, user, run, { existing, refresh: dto.refreshPolicySnapshot === true,
        expectedHash: dto.expectedPolicySnapshotHash ?? null })
      const policySnapshot = snapshotStep.snapshot, policyValues = policySnapshot.values
      const monthlyDays = policyValues.monthlyDays
      const dailyHours = policyValues.dailyHours
      const lateEnabled = policyValues.lateDeductionEnabled
      const shortfallEnabledValue = String(policyValues.shortfallEnabled)
      const shortfallMode = policyValues.shortfallMode
      const shortfallValue = policyValues.shortfallValue
      const overlapPolicy = policyValues.overlapPolicy
      const dailyCapDays = policyValues.dailyCapDays
      // D1: خصم الخروج المبكر على الوردية الثابتة (من اللقطة).
      const earlyLeaveValue = String(policyValues.earlyLeaveDeductionEnabled)
      const exemptionDefaults = { overtimeEligible: policyValues.exemptOvertimeEligible, unpaidLeaveDeductible: policyValues.exemptUnpaidLeaveDeductible }
      // وضع دليل الراتب قاعدة إثبات بيانات يُعاد فحصها عند الاعتماد (الخطوة 13)، لا معدل حساب؛ يبقى من الإعداد الحالي.
      const salaryEvidenceMode = parsePayrollSalaryEvidenceMode(await this.cfg(PAYROLL_SALARY_EVIDENCE_MODE_KEY, 'MONTHLY_HISTORY'))
      // الخطوة 21: شرائح التأخير من المجموعة المؤرخة المحفوظة في اللقطة + معامل الغياب بلا إذن (يوم × المعامل)
      const tiers = policySnapshot.latenessTiers.tiers
      const absencePenalty = policyValues.absencePenaltyDays
      // الخطوة 20 / D13: وضع المحرك للمسير (الجديد SHADOW)؛ POLICY يصرف نتيجة المحرك بشرط تكافؤ مفسر.
      const engineMode: PayrollEngineMode = run.engineMode && PAYROLL_ENGINE_MODES.includes(run.engineMode) ? run.engineMode : PAYROLL_DEFAULT_ENGINE_MODE
      const explainedKeys = new Set(run.id ? (await em.getRepository(PayrollRunParityExplanation).find({ where: { runId: run.id }, select: { differenceKey: true } })).map(row => row.differenceKey) : [])
      const parityRows: PayrollParityEmployeeRow[] = []
      const policyBlocked: Array<{ employeeId: number; component: string; legacy: string; policy: string | null; reason: string }> = []
      const protectionSettings = { minNetGuarantee: policyValues.minNetGuarantee, netFloorPct: policyValues.netFloorPct, maxDeductionPctOfGross: policyValues.maxDeductionPctOfGross }

    // الخطوتان 16 و17: الأعضاء بالدالة نفسها التي تعرضها المعاينة — المكان في آخر يوم من الفترة، والاستبعاد اليدوي بسببه،
    // وراتب الشهر، والمحجوز في مسير معتمد/مصروف يُستبعد بكود EXC_ALREADY_IN_RUN ورقم المسير الآخر بدل إيقاف المسير كله.
    const definition = payrollRunDefinitionOf(run)
    const membership = await resolvePayrollRunMembership(em, {
      run: { id: run.id ?? null, period: run.period, startDate, endDate }, definition, salaryEvidenceMode, today: localDateOf(new Date()),
      previousMembers,
      beforeEvaluate: async rows => {
        this.assertScopeAccess(user, definition, rows.map(row => row.org.branchId))
        await lockPayrollEmployees(em, rows.map(row => row.employee.id))
      },
    })
    if (!membership.rows.length) this.assertScopeAccess(user, definition, [])
    // تبسيط الرواتب (2026-09-15): مشكلة بيانات الخدمة لا توقف الحساب؛ صف الموظف مستبعد أصلًا بـEXC_EMPLOYMENT_DATA_INVALID
    // (بلا بند مالي) ويظهر في «المستبعدون» بسببه حتى تُصحح بياناته ويُعاد الحساب.
    this.assertNonEmptyScope(membership.candidateCount, definition, dto)
    const covered = []
    const capturedAt = new Date().toISOString()
    const newMembers: PayrollRunMember[] = []
    const orgNames = await this.orgNameMaps(em)
    for (const row of membership.rows) {
      const emp = row.employee, coverage = row.coverage, salary = row.salary
      const snapshot: PayrollMemberSnapshot = {
        version: 1, capturedAt, fullName: emp.fullName, employeeCode: emp.employeeCode, jobTitle: emp.jobTitle ?? null,
        ...this.snapshotOrg(row, orgNames),
        coverFrom: coverage?.coverFrom ?? null, coverTo: coverage?.coverTo ?? null, coverDays: coverage?.coverDays ?? null,
        hireDate: coverage?.hireDate ?? emp.actualStartDate ?? emp.joinDate ?? null,
        leaveDate: coverage?.leaveDate ?? null,
        prorataFactor: null, monthlyDays, basicSalary: null, allowances: null, gross: null, grossEarned: null,
        salarySource: salary?.ok ? salary.source : null,
        salaryIssue: salary && !salary.ok ? { code: salary.code, message: salary.message } : null,
        // قرار المالك (20 سبتمبر): حالة الإيقاف، وصرف راتب آخر شهر مع التصفية — يظهران على صف الموظف في جدول المسير.
        suspensionNote: row.suspensionNote,
        settlementPayout: row.settlement ? { caseId: row.settlement.caseId, lastWorkingDay: row.settlement.lastWorkingDay, label: row.settlement.label } : null,
      }
      const member = members.create({ employeeId: emp.id, snapshot, membershipStatus: row.status, inclusionSource: row.inclusionSource,
        exclusionReason: row.status === 'INCLUDED' ? null : row.code })
      newMembers.push(member)
      if (row.status === 'INCLUDED' && coverage && salary?.ok) {
        covered.push({ emp, coverage, member, salary, org: row.org, settlement: snapshot.settlementPayout ?? null,
          claims: await getSettlementFinancialClaims(em, emp.id) })
      }
    }
    const conflicts = [...membership.draftConflicts, ...membership.blockingConflicts]
    if (membership.draftConflicts.length && !dto.allowDraftConflicts) {
      throw new ConflictException({ code: 'PAYRUN-DRAFT-CONFLICT',
        message: 'توجد مسودات متعارضة؛ اختر صراحة حفظ مسودة للمراجعة أو عالج العضوية قبل الحساب',
        conflicts: await this.visibleConflicts(user, membership.draftConflicts, em) })
    }
    // الخطوة 14: فجوة أو تداخل مع فترة الشهر السابق/التالي لنفس الموظفين (قراءة فقط، تظهر على المسير وسجل الحدث).
    const periodContinuity = await findPayrollPeriodContinuity(em, { id: run.id ?? null, period: run.period, startDate, endDate }, covered.map(({ emp }) => emp.id))
    const prepared: PayrollItem[] = []
    // طول الفترة الفعلي شاملًا طرفيه — للتفصيل ومتغير PERIOD_DAYS في المحرك؛ تناسب أيام الخدمة على أساس 30 (monthlyDays) مهما كان طول الفترة.
    const periodDays = Math.round((Date.parse(`${endDate}T12:00:00Z`) - Date.parse(`${startDate}T12:00:00Z`)) / 86400000) + 1

    let totalNet = 0
    // التأمينات الاجتماعية: نسب وحدود النظامين ونظام كل فرع، تُقرأ مرة للمسير
    const socialInsuranceContext = await readSocialInsuranceContext(em)
    // الإجازة المرضية بأجر متدرج (قرار المالك 16 سبتمبر): شرائح كل نوع من فئة SICK، تُقرأ مرة للمسير
    const sickTiersByCode = new Map<string, SickPayTier[]>((await em.getRepository(LeaveType).find({ where: { category: 'SICK' } }))
      .map(type => [type.code, parseSickPayTiers(type.sickPayTiers)]))
    // «شيل خصم»: قواعد الشهر السارية، تُقرأ مرة للمسير وتتطابق على مكان الموظف في آخر يوم من الفترة
    const deductionWaivers = await readActiveDeductionWaivers(em, run.period)
    // أساس مبالغ التراكم الاسترشادية — يُقرأ مرة للمسير كله (لا يمس أي مبلغ يُصرف)
    const accrualBasis = await this.dailyAccrual.deductionBasis(em)
    for (const { emp, coverage, member, claims, salary, org, settlement } of covered) {
      const { coverFrom, coverTo, coverDays } = coverage
      const waived = waivedDeductionKinds(deductionWaivers, { employeeId: emp.id, branchId: org.branchId, departmentId: org.departmentId, teamId: org.teamId })
      // الحضور قد يصحح ساعات مصدر الإضافي؛ نقرأ الاستحقاق بعد إتمام التصحيح داخل المعاملة.
      // تراكم يومًا بيوم (قرار المالك 20 سبتمبر): اليوم اللي اتحسب ليلته ولسه مدخلاته زي ما هي
      // (مش متسخ، وبصمة مدخلاته مطابقة، وقبل النهارده) بيتقرا كما هو؛ الناقص والمتسخ بس هو اللي
      // بيتحسب هنا بنفس computeDay بالحرف. أول حساب (بلا تراكم) = نفس المسار القديم تمامًا.
      await this.dailyAccrual.accrueEmployeeRange(em, { employeeId: emp.id, period: run.period, runId: run.id ?? null,
        from: coverFrom, to: coverTo, basis: accrualBasis })
      // راتب شهر المسير كاملًا (لا تقسيم ولا متوسط داخل الشهر)؛ التناسب أدناه لأيام الخدمة فقط.
      const monthlyComponents = salary.monthlyComponents
      // PR-10: قروش صحيحة قبل التناسب؛ 30.15 × 3÷30 = 3.015 تُقص إلى 3.01 (قرار المالك: لا تقريب للفلوس).
      const monthlyCents = monthlyComponents.map(amount => Math.round(amount * 100))
      const grossCents = monthlyCents.reduce((sum, amount) => sum + amount, 0)
      const basic = monthlyCents[0] / 100
      const allowances = monthlyCents.slice(1).reduce((sum, amount) => sum + amount, 0) / 100
      const gross = grossCents / 100
      // قرار المالك: الشهر 30 يومًا في كل شيء — الجزء = الراتب ÷ أساس أيام الشهر × أيام التغطية، بسقف الراتب كاملًا،
      // وبنفس الأساس الذي يُحسب به سعر يوم الخصم أدناه. الدورة الكاملة تستحق الشهر كاملًا مهما كان طولها.
      const fullCoverage = coverFrom === startDate && coverTo === endDate
      const prorataFactor = fullCoverage ? 1 : Math.min(coverDays / monthlyDays, 1)
      const prorateCents = (cents: number) => fullCoverage ? cents : Math.min(cents, Math.trunc(cents * coverDays / monthlyDays))
      const grossEarnedCents = prorateCents(grossCents)
      const grossEarned = grossEarnedCents / 100
      const earnedCents = monthlyCents.map(prorateCents)
      const residual = grossEarnedCents - earnedCents.reduce((sum, amount) => sum + amount, 0)
      const largest = monthlyComponents.indexOf(Math.max(...monthlyComponents))
      earnedCents[largest] += residual
      const earnedComponents = earnedCents.map(cents => cents / 100)
      // SPEC⑥ / AL-09،AL-11: أسماء وقيم ثابتة للقسيمة؛ لا نفسر المصفوفات التاريخية بترتيب جديد.
      const salaryComponents = MONTHLY_SALARY_COMPONENTS.map((component, index) => ({
        code: component.code, nameAr: component.nameAr, nameEn: component.nameEn,
        monthlyAmount: monthlyCents[index] / 100, earnedAmount: earnedComponents[index],
      }))
      Object.assign(member.snapshot!, { basicSalary: basic, allowances, gross, grossEarned, monthlyComponents, earnedComponents, salaryComponents,
        prorataFactor: Math.round(prorataFactor * 1e6) / 1e6 })
      const dayRate = gross / monthlyDays
      const hourRate = dayRate / dailyHours
      const minuteRate = hourRate / 60

      // ⑨ / EX-10، EX-13: القرار يومي؛ النافذة الجزئية لا تُعفي بقية الشهر.
      const exemptions = await loadAttendanceExemptions(em, emp.id, coverFrom, coverTo)
      const policyOnDate = (date: string) => exemptionPolicyOnDate(exemptions, date, exemptionDefaults)
      let exemptDays = 0
      for (let time = Date.parse(`${coverFrom}T12:00:00Z`); time <= Date.parse(`${coverTo}T12:00:00Z`); time += 86400000) {
        if (policyOnDate(new Date(time).toISOString().slice(0, 10)).isExempt) exemptDays++
      }
      const attendanceExemptions = exemptions.map(window => ({ id: window.id, effectiveFrom: window.effectiveFrom,
        effectiveTo: window.effectiveTo, terminatedFrom: window.terminatedFrom, reasonCode: window.reasonCode,
        ...exemptionPolicyOnDate([window], window.effectiveFrom, exemptionDefaults) }))
      const isAttendanceExempt = exemptDays === coverDays
      Object.assign(member.snapshot!, { attendanceExemptions, exemptDays, isAttendanceExempt,
        salaryMode: isAttendanceExempt ? 'FIXED_MONTHLY' : 'ATTENDANCE_BASED' })

      // OT-05: المصدر الرجعي المثبت يُرحل مرة واحدة، ولا نعطيه أجر شهر جديد أو نغيّر العضوية.
      const candidatesOt = (await em.getRepository(OvertimeEntry).find({
        where: {
          employeeId: emp.id,
          status: 'APPROVED',
          date: LessThanOrEqual(coverTo),
        },
      })).filter(row => !claims.overtimeIds.has(row.id))
      const previousPayrollClaims = candidatesOt.length ? await approvedPayrollOvertimeClaims(em, emp.id, run.id) : new Map<number, number>()
      const approvedOt: OvertimeEntry[] = []
      const retroactivePeriods = new Map<number, { runId: number; period: string }>()
      for (const row of candidatesOt) {
        if (previousPayrollClaims.has(row.id)) continue
        // تلف لقطة جديدة لا يحوّلها إلى تاريخ قديم أو استثناء مستبعد فيسقط حق الموظف صامتًا.
        overtimeFinancialValue(row, hourRate)
        if (row.date >= coverFrom) { approvedOt.push(row); continue }
        // لا نخمّن سعر اعتماد قديم لم يُحفظ؛ هذا الامتداد للمصادر الجديدة المثبتة فقط.
        if (!row.calculationSnapshot || row.date < (coverage.hireDate ?? '0001-01-01')) continue
        overtimeFinancialValue(row, hourRate)
        const closed = await closedOvertimePeriod(em, emp.id, row.date)
        if (closed && closed.runId !== run.id) { approvedOt.push(row); retroactivePeriods.set(row.id, closed) }
      }
      await assertUniqueOvertimeDays(em, emp.id, approvedOt.map(row => row.date))
      const otRows: OvertimeEntry[] = []
      const legacyExplicitRequests = new Map<number, { requestId: number; requestHours: number; entryHoursRequested: number; sourcePayableHours: number | null }>()
      const excludedOvertimeEntryIds: number[] = []
      for (const row of approvedOt) {
        if ((row.calculationSnapshot as any)?.approval) {
          // EX-11: قرار الاستحقاق والساعات كانا جزءًا من الاعتماد؛ تغيير السياسة لاحقًا لا يسحبهما.
          overtimeFinancialValue(row, hourRate)
          otRows.push(row)
          continue
        }
        const decision = policyOnDate(row.date)
        const legacy = await legacyExemptOvertimeSource(em, row, decision)
        if (!legacy) {
          excludedOvertimeEntryIds.push(row.id)
          continue
        }
        if (legacy.interpretation) legacyExplicitRequests.set(row.id, legacy.interpretation)
        otRows.push(legacy.entry)
      }
      const overtimeDetails = otRows.map(row => {
        const retro = retroactivePeriods.get(row.id)
        return { id: row.id, date: row.date, source: row.source, ...projectOvertimeFinancialValue(row, hourRate),
          dayKind: (row.calculationSnapshot as any)?.approval?.dayKind ?? null,
          originalPeriod: retro?.period ?? row.originalPeriod ?? row.date.slice(0, 7),
          deferredFromRunId: retro?.runId ?? row.deferredFromRunId ?? null,
          ...(legacyExplicitRequests.has(row.id) ? { legacyExplicitRequest: legacyExplicitRequests.get(row.id) } : {}),
          retroactive: !!retro }
      })
      const otHours = round2(overtimeDetails.reduce((sum, row) => sum + row.hours, 0))
      const otAmount = round2(overtimeDetails.reduce((sum, row) => sum + row.amount, 0))

      // 1ب) أيام الإيقاف عن العمل (قرار المالك 16 سبتمبر) تُقرأ قبل الحضور: يوم الإيقاف يتخصم «يوم إيقاف» بس،
      // فتأخير أو نقص أو غياب صف حضوره (بصمة يوم تحقيق مثلًا، أو صف اتسجل قبل الإيقاف) ما يتخصمش تاني.
      const unpaidLeaves = (await em.getRepository(Leave).find({
        where: { employeeId: emp.id, isUnpaid: true, status: 'APPROVED' },
      })).filter(lv => lv.fromDate <= coverTo && lv.toDate >= coverFrom)
      const suspension = await readSuspensionPayrollDays(em, emp.id, coverFrom, coverTo, unpaidLeaves, date => policyOnDate(date).unpaidLeaveDeductible)
      const suspendedDates = new Set(suspension.dates)

      // 2) خصم التأخير: الدقائق غير المعذورة + دقائق الإذن «بخصم»
      // (المعذور بإذن بدون خصم أو إجازة جزئية لا يُخصم)
      // أولاً: جسّد الغياب — أنشئ صفوف 'absent' لأيام العمل غير الملموسة في
      // الفترة (بلا بصمة ولا إجازة) قبل القراءة، فتُحتسب في الخصم والتقارير
      const attRows = (await em.getRepository(AttendanceDay).find({
        where: { employeeId: emp.id, date: Between(coverFrom, coverTo) },
      })).filter(row => !policyOnDate(row.date).isExempt && !suspendedDates.has(row.date))
      const lateMinutes = attRows.reduce(
        (s, r) => s + r.lateMinutes + (r.deductibleMinutes ?? 0),
        0
      )
      // خصم التأخير بالشرائح: كل يوم متأخر على حدة (كسر يوم أو بالدقيقة)، +
      // دقائق الإذن «بخصم» بالدقيقة. بلا شرائح → بالدقيقة (السلوك الافتراضي)
      const attendancePolicy: AttendanceDeductionPolicy = { schemaVersion: 1, lateEnabled,
        shortfallEnabled: shortfallEnabledValue === 'true',
        shortfallMode: shortfallMode as AttendanceDeductionPolicy['shortfallMode'], shortfallValue,
        overlapPolicy: overlapPolicy as AttendanceDeductionPolicy['overlapPolicy'], dailyCapDays, dayRate, minuteRate,
        earlyLeaveEnabled: earlyLeaveValue === 'true' }
      // الخطوة 21: أثر الشريحة لكل يوم (المدى والطريقة والمضاعف والمعادلة) محفوظ مع اليوم ويظهر في القسيمة.
      const attendanceDeductionDays = attRows.map(row => {
        const tier = payrollLatenessTierDeduction(row.lateMinutes, tiers, dayRate, minuteRate)
        // «شيل خصم»: التأخير، والخروج المبكر (نقص الوردية الثابتة) أو نقص الساعات (المرنة) بصفر لليوم
        return waiveAttendanceDeductionDay({ ...attendanceDeductionDay(row, attendancePolicy, tier.amount), latenessTier: tier.trace }, waived,
          row.attendanceRuleSnapshot?.flexEnabled === false)
      })
      // المجموع التاريخي يشمل الأذونات المدفوعة؛ تفصيل اليوم يميز مبلغها صراحةً.
      const latenessRequested = round2(attendanceDeductionDays.reduce((sum, day) => sum + day.latenessAmount + day.permissionAmount, 0))
      const shortfallMinutes = attRows.reduce((sum, day) => sum + Number(day.shortfallMinutes ?? 0), 0)
      const shortfallRequested = round2(attendanceDeductionDays.reduce((sum, day) => sum + day.shortfallAmount, 0))

      // 2ب) خصم الغياب بلا إذن: يوم عمل مجدول بلا بصمة ولا إجازة (status='absent')
      // يُخصم بقيمة اليوم × معامل عقوبة الغياب (افتراضي 1، يُضبط لـ1.5/2).
      // (يوم الإجازة يُصنّف 'leave' لا 'absent' فلا ازدواج مع الإجازة غير المدفوعة)
      const absentRows = attRows.filter((r) => r.status === 'absent')
      const absenceDays = absentRows.length
      const absenceDayAmount = waived.has('ABSENCE') ? 0 : dayRate * absencePenalty
      const absenceRequested = round2(absenceDays * absenceDayAmount)
      // D13/الخطوة 28: محرك السياسة بوضع SHADOW بجانب الحساب القديم لنفس الموظف والفترة (المصروف = القديم دائمًا):
      // مزودات المصادر الحية (ومنها نسب الوردية الليلية ليوم بدايتها) ← منفذ البنود ← تكافؤ يومي. قراءة فقط ولا يغير أي مبلغ.
      // الخطوة 20: وضع LEGACY لا يحسب الظل؛ SHADOW وPOLICY يحسبانه على نفس اللقطة (الشرائح والمعاملات المجمدة).
      const policyShadow = engineMode === 'LEGACY' ? null : await readPayrollShadowAttendance(em, { employeeId: emp.id, periodStart: startDate, periodEnd: endDate, monthlyComponents,
        rules: { monthlyDays, dailyHours, lateEnabled, shortfallEnabled: shortfallEnabledValue === 'true', shortfallMode, shortfallValue, overlapPolicy,
          dailyCapDays, earlyLeaveEnabled: earlyLeaveValue === 'true', absencePenalty, latenessTiers: tiers },
        suspendedDates: suspension.dates,
        legacy: { days: attendanceDeductionDays.map(day => ({ date: day.date, lateness: day.latenessAmount + day.permissionAmount, shortfall: day.shortfallAmount })),
          absentDates: absentRows.map(row => row.date), absenceDayAmount,
          totals: { lateness: latenessRequested, shortfall: shortfallRequested, absence: absenceRequested } } })

      // 3) الإجازات غير المدفوعة (isUnpaid من تعريف النوع — أي نوع
      // غير مدفوع يُخصم يوم بيوم، بلا سياسة غياب) المتقاطعة مع الفترة (unpaidLeaves مقروءة فوق مع الإيقاف)
      let unpaidDays = 0
      let exemptUnpaidLeaveDays = 0
      for (const lv of unpaidLeaves) {
        const from = lv.fromDate < coverFrom ? coverFrom : lv.fromDate
        const to = lv.toDate > coverTo ? coverTo : lv.toDate
        if (from <= to) {
          const fraction = (lv.period ?? 'FULL') === 'FULL' ? 1 : 0.5
          for (let time = Date.parse(`${from}T12:00:00Z`); time <= Date.parse(`${to}T12:00:00Z`); time += 86400000) {
            const date = new Date(time).toISOString().slice(0, 10)
            if (policyOnDate(date).unpaidLeaveDeductible) unpaidDays += fraction
            else exemptUnpaidLeaveDays += fraction
          }
        }
      }
      if (waived.has('UNPAID_LEAVE')) unpaidDays = 0
      // 3أ) الإجازة المرضية بأجر متدرج: ترتيب كل يوم بين أيام المرض المعتمدة في سنته (شاملًا ما قبل الفترة)، ونسبة أجره من شرائح نوعه؛
      // الخصم = سعر اليوم × (100 − النسبة)/100. اليوم المسجل بدون راتب يُعدّ في الترتيب ولا يُخصم مرتين (يخصمه بند 3).
      // المبلغ يدخل عمود الإجازة بلا أجر (عدم استحقاق لا خصم) بدقة محرك السياسة، ويظهر سطرًا مستقلًا في التفصيل والقسيمة.
      // تُحسب قبل سقف الإيقاف: يوم الإيقاف مستبعد منها، وأيامها المخصومة تدخل في السقف.
      const sickLeaves = sickTiersByCode.size ? await em.getRepository(Leave).find({ where: { employeeId: emp.id, status: 'APPROVED',
        leaveTypeCode: In([...sickTiersByCode.keys()]), fromDate: LessThanOrEqual(coverTo), toDate: MoreThanOrEqual(`${coverFrom.slice(0, 4)}-01-01`) } }) : []
      const sick = sickLeaveDeduction(sickLeaveDaysInCover({ leaves: sickLeaves, tiersByCode: sickTiersByCode, coverFrom, coverTo,
        deductible: date => !waived.has('SICK_LEAVE') && policyOnDate(date).unpaidLeaveDeductible && !suspension.dates.includes(date) }), grossCents, monthlyDays)
      // 3ب) أيام الإيقاف عن العمل (قرار المالك 16 سبتمبر): مش غياب، وتُخصم يومًا بيوم مع الإجازة بدون راتب بلا ازدواج في نفس اليوم.
      // سقفها أيام الراتب المستحق ناقص اللي اتخصم فعلًا (بدون راتب + المرضية): دورة 31 يوم موقوفة كلها = صافي صفر مش سالب
      suspension.days = waived.has('SUSPENSION') ? 0 : payrollSuspensionDaysWithinCap(suspension.days, fullCoverage ? monthlyDays : Math.min(coverDays, monthlyDays), unpaidDays, sick.equivalentDays)
      unpaidDays += suspension.days
      const unpaidOnlyDeduction = round2(unpaidDays * dayRate)
      const unpaidDeduction = sick.equivalentDays === '0' ? unpaidOnlyDeduction
        : Number(PayrollDecimal.from(String(unpaidDays)).add(PayrollDecimal.from(sick.equivalentDays))
          .multiply(new PayrollDecimal(BigInt(grossCents), BigInt(100 * monthlyDays))).format(2, 'DOWN'))

      // 5) دفتر المديونيات: بنود PENDING سرت فترتها (effectiveDate ضمن الفترة أو فارغة، والشهر
      // المستهدف لا يتجاوز شهر المسير — DD-07) وغير محجوزة لمسير معتمد آخر (DD-09) — DEBIT خصم،
      // CREDIT إضافة. تُحجز عند الاعتماد وتُستهلك عند الصرف. DD-11 (C2): حماية الصافي لكل الخصومات:
      // فائض الحضور يسقط، وفائض القيود يُرحّل عند الصرف، والأقساط بعدها من الباقي.
      // 5أ) بدل دوام أيام العطلات: أوامر الموارد البشرية وطلبات «دوام يوم عطلة» المعتمدة في أيام تغطية الموظف → قيد «بدل» CREDIT
      // (ساعات البصمة × سعر الساعة بنفس أساس الإضافي × المضاعف، مقصوص لقرشين) يُقرأ تحت مع باقي القيود؛ المحجوز لمسير معتمد والمصروف ما يتلمسش.
      const holidayWork = await syncHolidayWorkPayroll(em, { employeeId: emp.id,
        org: { employeeId: emp.id, branchId: org.branchId ?? null, departmentId: org.departmentId ?? null, teamId: org.teamId ?? null },
        from: coverFrom, to: coverTo, period: run.period, basis: { grossMonthly: gross, monthlyDays, dailyHours },
        skipDates: suspendedDates, actorUserId: user.sub ?? null })
      const obligationRunId = run.id, obligationRunPeriod = run.period
      // «شيل خصم»: القيد المشال (مسجل/تأمينات/أخرى) ما يدخلش المسير ده ويفضل في الدفتر؛ الإضافات ما بتتشالش
      const pendingObligations = withoutWaivedObligations((
        await em.getRepository(EmployeeObligation).find({
          where: { employeeId: emp.id, status: 'PENDING' },
        })
      ).filter((o) => (!o.effectiveDate || o.effectiveDate <= endDate) && (!o.targetPeriod || o.targetPeriod <= obligationRunPeriod) &&
        (o.reservedPayrollRunId == null || o.reservedPayrollRunId === obligationRunId)), waived)
      // C2 / DD-11: فئة نوع الخصم المصنف وأولوية ترحيله (النظامي أولًا، الإداري آخر المصنفة)
      const typedObligationFacts = await readTypedObligationFacts(em, pendingObligations)
      const obligationEntry = (o: EmployeeObligation) => ({ id: o.id, amount: round2(Number(o.amount)), category: o.category,
        deductionRequestId: o.deductionRequestId ?? null, effectiveDate: o.effectiveDate ?? null, ...typedObligationFacts.get(o.id) })
      // الخطوة 26 (EX-01..08): الإعفاء المالي النشط لهذا الموظف في هذا المسير على المبالغ المطلوبة قبل حماية الصافي — الحضور المُعفى صفر
      // (أو ما بقي بعد يوم مُعفى)، والقيود المصنفة المُعفاة تخرج من الخصم وتبقى في الدفتر حتى الصرف، والأقساط المُعفاة تُؤجل في خطة الأقساط.
      // النظامي والقضائي وغير القابل للإعفاء والاستردادات غير المصنفة والإجازة بلا أجر تبقى. بلا إعفاء نشط تمر المبالغ كما هي.
      const exemptionRules = await readActiveRunExemptions(em, run.id, emp.id)
      const exemptionFacts = exemptionRules.length ? await readExemptionObligationFacts(em, pendingObligations) : new Map()
      const exemption = applyFinancialExemptions({ rules: exemptionRules,
        attendance: { days: attendanceDeductionDays.map(day => ({ date: day.date, lateness: day.latenessAmount + day.permissionAmount, shortfall: day.shortfallAmount })),
          absentDates: absentRows.map(row => row.date), absenceDayAmount,
          requested:{ lateness: latenessRequested, shortfall: shortfallRequested, absence: absenceRequested } },
        debits: pendingObligations.filter((o) => o.type === 'DEBIT').map(o => ({ ...obligationEntry(o), ...exemptionFacts.get(o.id), label: o.label })),
        unpaidLeave: unpaidDeduction })
      const exemptedDebits = exemption.debits.map(({ deductionTypeId: _typeId, isExemptable: _exemptable, typeName: _typeName, label: _label, creatorUserId: _creator, ...entry }) => entry)
      const protectionInput = {
        earnedFixedGross: grossEarned, overtime: otAmount, unpaidLeave: unpaidDeduction,
        attendance: exemption.attendance,
        credits: pendingObligations.filter((o) => o.type === 'CREDIT').map(obligationEntry),
        debits: exemptedDebits,
        // الخطوة 19: أرضية الصافي وسقف الخصم من لقطة السياسة (النسخة المنشورة أولًا ثم الإعداد العام وقت الالتقاط).
        settings: protectionSettings,
        // الخطوة 22 (B5): ترتيب تحصيل المالك من نسخة السياسة؛ null = الترتيب الافتراضي كما هو
        collectionOrder: collection.order,
      }
      let netProtection = protectPayrollObligations(protectionInput)
      // خطة الأقساط على رصيد موضع السلف في ترتيب التحصيل؛ الافتراضي (السلف آخرًا) = الصافي قبل الأقساط وما استهلكته الخصومات كما كان.
      const loanSlot = netProtection.loanSlot
      // التأمينات الاجتماعية (حصة الموظف): خصم نظامي شهري بنظام فرع الموظف في آخر يوم من الفترة، يسبق الأقساط
      // (الأقساط تُبنى على الصافي بعده) ويظهر سطرًا مستقلًا بنوع SOCIAL_INSURANCE — إعفاءات الخصومات لا تلمسه.
      const socialInsurance = computeSocialInsurance({
        system: socialInsuranceContext.systemOf((member.snapshot as { branchId?: number | null } | null)?.branchId ?? emp.branchId),
        registered: emp.isGosiRegistered, declaredSalary: emp.gosiBaseSalary, fallbackSalary: basic, nationality: emp.nationality,
      }, socialInsuranceContext.settings)
      // «شيل خصم» التأمينات للشهر: حصة الموظف صفر في المسير ده
      const socialInsuranceDeduction = waived.has('SOCIAL_INSURANCE') ? 0 : socialInsurance.employeeShare
      const previousBreakdown = previousItems.find(row => row.employeeId === emp.id)?.breakdown
      const previousPlan = previousBreakdown ? JSON.parse(previousBreakdown).installmentPlan : null
      if (previousPlan != null && !isPayrollInstallmentPlan(previousPlan)) throw new ConflictException('خطة أقساط المسير السابقة غير صالحة')
      const installmentPlan = await buildPayrollInstallmentPlan(em, emp.id, {
        period: run.period, endDate, netBeforeLoans: round2(loanSlot.netBeforeLoans - socialInsuranceDeduction).toFixed(2), earnedFixedGross: grossEarned.toFixed(2),
        capConsumed: loanSlot.capConsumed.toFixed(2),
      }, { runId: run.id, policy: !dto.refreshInstallmentPolicy && previousPlan ? previousPlan.policy : undefined, exemptions: exemption.loanScope, waived: waived.has('LOAN') })
      const loanDeduction = installmentPlan ? legacyInstallmentNumber(installmentPlan.allocation.totals.deductedAmount) : 0
      // السلف قبل فئات أخرى بترتيب المالك: تُعاد الحماية بالأقساط المحصلة في موضعها فتتقلص الفئات التالية لها.
      if (collection.loanBeforeOthers && loanDeduction > 0) netProtection = protectPayrollObligations({ ...protectionInput, loanCollected: loanDeduction })
      const latenessDeduction = netProtection.attendance.lateness
      const shortfallDeduction = netProtection.attendance.shortfall
      const absenceDeduction = netProtection.attendance.absence
      const otherDeductions = netProtection.otherDeductions
      const otherAdditions = netProtection.otherAdditions

      const netBeforeLoans = round2(
        grossEarned +
          otAmount +
          otherAdditions -
          latenessDeduction -
          shortfallDeduction -
          absenceDeduction -
          unpaidDeduction -
          otherDeductions
      )
      const netPay = round2(netBeforeLoans - socialInsuranceDeduction - loanDeduction)
      // الخطوة 20 / D13: محرك السياسة على نفس الموظف ونفس المدخلات المجمدة (راتب شهر المسير، التغطية، الإضافي المعتمد، الإجازة بلا أجر،
      // قيود الدفتر، خصومات الحضور من منفذ الأيام) بسياسة افتراضية تقلّد القديم، ثم تقرير تكافؤ لكل بند. POLICY يصرف نتيجته.
      let paid = { earnedComponents, salaryComponents, grossEarned, latenessDeduction, shortfallDeduction, absenceDeduction, otherDeductions, otherAdditions,
        unpaidDeduction, installmentPlan, loanDeduction, netPay, netProtection, loanSlot }
      let engineTrace: Record<string, unknown> = { mode: engineMode, paidResult: 'LEGACY', parityStatus: null }
      if (engineMode !== 'LEGACY') {
        const shadowTotals = policyShadow && 'totals' in policyShadow && policyShadow.totals?.policy && ['MATCHED', 'DIFFERENT'].includes(policyShadow.status) ? policyShadow.totals.policy : null
        const engineFacts: PayrollPolicyEngineFacts = { employeeId: emp.id, period: run.period, periodStart: startDate, periodEnd: endDate, monthlyComponents,
          coverDays, periodDays, fullCoverage,
          dailyHours, monthlyDays, lateDeductionEnabled: lateEnabled, currency: policyValues.currency, overtimeAmount: otAmount, unpaidLeaveDays: unpaidDays + Number(sick.equivalentDays),
          credits: pendingObligations.filter(o => o.type === 'CREDIT').map(obligationEntry), debits: exemptedDebits,
          // الخطوة 26: نفس قرار الإعفاء على مجاميع ظل الحضور، فيقيس التكافؤ الحساب لا الإعفاء
          protectionSettings, attendance: { status: policyShadow?.status ?? 'UNAVAILABLE',
            totals: shadowTotals ? waivePolicyShadowTotals(exemptPolicyShadowTotals({ lateness: shadowTotals.lateness, shortfall: shadowTotals.shortfall, absence: shadowTotals.absence },
              (policyShadow as { days?: Array<{ date?: unknown; policy?: { lateness?: unknown; shortfall?: unknown; absence?: unknown } | null }> } | null)?.days, exemptionRules), waived) : null,
            message: policyShadow?.message ?? 'لم يُحسب ظل الحضور' },
          // الخطوة 22 (B5): ترتيب التحصيل نفسه للمحركين، فيقيس التكافؤ الحساب لا اختلاف الترتيب
          collectionOrder: collection.order }
        const preNet = computePayrollPolicyEnginePreNet(engineFacts)
        let policyPlan = installmentPlan, policyLoans: number | null = null, policyFinal = preNet
        if (preNet.netBeforeLoans !== null && preNet.grossEarned !== null && preNet.capConsumed !== null && preNet.protection) {
          // الأقساط تتبع رصيد موضعها في ترتيب التحصيل: نفس السياق = نفس الخطة، وإلا تُبنى خطة من أرقام المحرك بسياسة الأقساط نفسها.
          const policySlot = preNet.protection.loanSlot
          if (policySlot.netBeforeLoans.toFixed(2) !== loanSlot.netBeforeLoans.toFixed(2) || preNet.grossEarned.toFixed(2) !== grossEarned.toFixed(2) || policySlot.capConsumed.toFixed(2) !== loanSlot.capConsumed.toFixed(2)) {
            policyPlan = await buildPayrollInstallmentPlan(em, emp.id, { period: run.period, endDate, netBeforeLoans: round2(policySlot.netBeforeLoans - socialInsuranceDeduction).toFixed(2),
              earnedFixedGross: preNet.grossEarned.toFixed(2), capConsumed: policySlot.capConsumed.toFixed(2) },
            { runId: run.id, policy: !dto.refreshInstallmentPolicy && previousPlan ? previousPlan.policy : undefined, exemptions: exemption.loanScope, waived: waived.has('LOAN') })
          }
          policyLoans = policyPlan ? legacyInstallmentNumber(policyPlan.allocation.totals.deductedAmount) : 0
          if (collection.loanBeforeOthers) policyFinal = payrollPolicyEngineWithLoans(preNet, engineFacts, policyLoans)
        }
        const policyNet = policyFinal.netBeforeLoans === null || policyLoans === null ? null : round2(policyFinal.netBeforeLoans - socialInsuranceDeduction - policyLoans)
        const parity = payrollParityEmployeeRow({ employeeId: emp.id,
          legacy: { basicSalary: earnedComponents[0], allowances: round2(earnedComponents.slice(1).reduce((sum, amount) => sum + amount, 0)), overtimeAmount: otAmount, otherAdditions,
            latenessDeduction, shortfallDeduction, absenceDeduction, unpaidLeaveDeduction: unpaidDeduction, otherDeductions, loanInstallments: loanDeduction, netPay },
          legacyAttendanceRequested: exemption.attendance,
          policy: { ...policyFinal.amounts, loanInstallments: policyLoans, netPay: policyNet }, preNet: policyFinal, attendanceShadowStatus: policyShadow?.status ?? 'SKIPPED',
          // خطة المصادر: رموز مشاكل مصادر الظل التي غابت بسببها قيم المحرك
          sourceIssueCodes: payrollShadowSourceIssueCodes(policyShadow) })
        parityRows.push(parity)
        engineTrace = { mode: engineMode, paidResult: 'LEGACY', parityStatus: parity.status, differences: parity.components.filter(row => row.differenceKey).length, execution: preNet.execution }
        if (engineMode === 'POLICY') {
          for (const row of parity.components) if (row.differenceKey && (row.policy === null || !explainedKeys.has(row.differenceKey))) {
            policyBlocked.push({ employeeId: emp.id, component: row.code, legacy: row.legacy, policy: row.policy, reason: row.policy === null ? row.reason ?? 'قيمة غائبة' : 'فرق بلا سبب مكتوب' })
          }
          if (policyFinal.earnedComponents && policyFinal.protection && policyFinal.grossEarned !== null && policyNet !== null && policyLoans !== null) {
            const policyEarned = policyFinal.earnedComponents
            paid = { earnedComponents: policyEarned, grossEarned: policyFinal.grossEarned,
              salaryComponents: MONTHLY_SALARY_COMPONENTS.map((component, index) => ({ code: component.code, nameAr: component.nameAr, nameEn: component.nameEn,
                monthlyAmount: monthlyCents[index] / 100, earnedAmount: policyEarned[index] })),
              latenessDeduction: policyFinal.protection.attendance.lateness, shortfallDeduction: policyFinal.protection.attendance.shortfall, absenceDeduction: policyFinal.protection.attendance.absence,
              otherDeductions: policyFinal.protection.otherDeductions, otherAdditions: policyFinal.protection.otherAdditions, unpaidDeduction: policyFinal.amounts.unpaidLeaveDeduction ?? 0,
              installmentPlan: policyPlan, loanDeduction: policyLoans, netPay: policyNet, netProtection: policyFinal.protection, loanSlot: policyFinal.protection.loanSlot }
            engineTrace = { ...engineTrace, paidResult: 'POLICY', legacyResult: parity.components.map(row => ({ code: row.code, legacy: row.legacy, policy: row.policy })) }
            Object.assign(member.snapshot!, { grossEarned: paid.grossEarned, earnedComponents: paid.earnedComponents, salaryComponents: paid.salaryComponents })
          }
        }
      }
      totalNet = round2(totalNet + paid.netPay)
      const leaveLinesAll = payrollLeaveDeductionLines(paid.unpaidDeduction, unpaidOnlyDeduction, unpaidDays, sick.lines)
      const leaveLines = { ...leaveLinesAll, lines: withSuspensionLine(leaveLinesAll.lines, suspension.days) }

      prepared.push(
        items.create({
          employeeId: emp.id,
          // الخطوة 20: المصروف = القديم (LEGACY/SHADOW) أو نتيجة المحرك (POLICY) — paid يحمل المصدر المختار
          basicSalary: paid.earnedComponents[0],
          allowances: round2(paid.earnedComponents.slice(1).reduce((sum, amount) => sum + amount, 0)),
          overtimeHours: otHours,
          overtimeAmount: otAmount,
          lateMinutes,
          latenessDeduction: paid.latenessDeduction,
          shortfallMinutes,
          shortfallDeduction: paid.shortfallDeduction,
          absenceDays,
          absenceDeduction: paid.absenceDeduction,
          unpaidLeaveDays: unpaidDays,
          unpaidLeaveDeduction: paid.unpaidDeduction,
          loanInstallments: paid.loanDeduction,
          otherDeductions: paid.otherDeductions,
          otherAdditions: paid.otherAdditions,
          socialInsuranceDeduction,
          netPay: paid.netPay,
          payMethod: emp.payMethod ?? 'transfer',
          breakdown: JSON.stringify({
            ...coverage,
            monthlyDays,
            periodDays,
            dailyHours,
            gross,
            grossEarned: paid.grossEarned,
            monthlyBasicSalary: basic,
            monthlyAllowances: allowances,
            monthlyComponents,
            earnedComponents: paid.earnedComponents,
            salaryComponents: paid.salaryComponents,
            salarySource: salary.source,
            prorataFactor: Math.round(prorataFactor * 1e6) / 1e6,
            prorationBasis: 'MONTHLY_DAYS',
            attendanceExemptions,
            attendanceDeductions: { policy: attendancePolicy, days: attendanceDeductionDays,
              totals: { lateMinutes, shortfallMinutes, latenessDeduction: paid.latenessDeduction, shortfallDeduction: paid.shortfallDeduction },
              // الخطوة 21: مجموعة الشرائح المؤرخة المطبقة (من لقطة السياسة)
              latenessTierSet: { setId: policySnapshot.latenessTiers.setId, effectivePeriod: policySnapshot.latenessTiers.effectivePeriod, contentHash: policySnapshot.latenessTiers.contentHash } },
            attendanceRules: attRows.map(row => this.attendanceRuleTrace(row)),
            policyShadow,
            policyEngine: engineTrace,
            policySnapshotHash: policySnapshot.fingerprint,
            exemptDays,
            isAttendanceExempt,
            exemptUnpaidLeaveDays,
            excludedOvertimeEntryIds,
            dayRate: round2(dayRate),
            hourRate: round2(hourRate),
            overtimeEntryIds: otRows.map((r) => r.id),
            overtime: overtimeDetails,
            // الخطوة 22 (B5): ترتيب التحصيل المطبق ومصدره، ورصيد موضع السلف حين تسبق فئات أخرى (يتحقق منه الاعتماد مع خطة الأقساط)
            collection: { source: collection.source, versionId: collection.versionId, order: collection.effectiveOrder, ownerOrder: collection.order !== null,
              loanSlot: collection.loanBeforeOthers ? paid.loanSlot : null },
            installmentPlan: paid.installmentPlan,
            installmentIds: paid.installmentPlan?.allocation.lines.filter(line => line.eligible).map(line => Number(line.installmentRef)) ?? [],
            obligationIds: paid.netProtection.consumedObligationIds,
            obligationLines: paid.netProtection.lines,
            netProtection: paid.netProtection.trace,
            // الخطوة 26: الإعفاءات المطبقة ونسخها، وسطورها (الأصل والمُعفى وبعد الإعفاء)، والقيود والأقساط المؤجلة، والمحمي الباقي — فقط حين يوجد إعفاء نشط
            ...(exemptionRules.length ? { financialExemptions: summarizeFinancialExemptions({ rules: exemptionRules,
              lines: [...exemption.lines, ...exemptionLoanLines(paid.installmentPlan?.exemptionDeferred)], exemptedObligations: exemption.exemptedObligations,
              protectedItems: exemption.protectedItems, deferredInstallments: paid.installmentPlan?.exemptionDeferred ?? [],
              requested: { lateness: latenessRequested, shortfall: shortfallRequested, absence: absenceRequested } }) } : {}),
            absentDates: absentRows.map((r) => r.date),
            // د (تقرير 15 سبتمبر): يوم ببصمة ناقصة لا يُخصم ولا يُرى، والمشكلة كانت تظهر عند رفض الاعتماد.
            // يُكتب هنا وقت الحساب فتعرضه شاشة المسير على صف الموظف قبل الاعتماد.
            missingPunchDates: attRows.filter((r) => r.status === 'missing_punch').map((r) => r.date),
            // تتبّع مصدر الخصم للتدقيق/الاعتراض: صفوف الحضور المخصومة والإجازات
            attendanceDayIds: attRows
              .filter(
                (r) =>
                  r.lateMinutes > 0 ||
                  (r.shortfallMinutes ?? 0) > 0 ||
                  (r.deductibleMinutes ?? 0) > 0 ||
                  r.status === 'absent'
              )
              .map((r) => r.id),
            unpaidLeaveIds: unpaidLeaves.map((l) => l.id),
            ...(suspension.dates.length ? { suspension: { days: suspension.days, dates: suspension.dates, suspensionIds: suspension.ids } } : {}),
            // قرار المالك (20 سبتمبر): شهر آخر يوم عمل — الصافي ده بيتصرف مع التصفية بنفس الرقم؛
            // داخل إجمالي المسير (تكلفة الشهر كاملة) وبرّه كشف البنك والمبلغ المستحق للصرف، فمينفعش يتصرف مرتين.
            ...(settlement ? { settlementPayout: settlement } : {}),
            // الإجازة المرضية بأجر متدرج: أيام الفترة بترتيبها في السنة ونسبة أجرها، وسطر خصم لكل نسبة
            ...(sick.days.length ? { sickLeave: { ...sick, amount: leaveLines.sickAmount, lines: leaveLines.sickLines,
              leaveIds: [...new Set(sick.days.map(day => day.leaveId))] } } : {}),
            // سطور عمود الإجازة بلا أجر كما تظهر في القسيمة: بدون راتب + خصم المرضية لكل نسبة أجر (مجموعها = العمود)
            leaveDeductionLines: leaveLines.lines,
            // التأمينات الاجتماعية: النظام والفئة والأجر التأميني بعد الحدود والنسب وحصتا الموظف وصاحب العمل (kind = SOCIAL_INSURANCE)
            socialInsurance,
            // بدل دوام أيام العطلات: لكل يوم مغطى — الأمر/الطلب والساعات والمبلغ وقيده في الدفتر، أو سبب عدم احتسابه
            ...(holidayWork.lines.length ? { holidayWork } : {}),
          }),
        })
      )
    }

    // الخطوة 20: POLICY لا يصرف نتيجة فيها قيمة غائبة أو فرق بلا سبب مكتوب؛ تُرجع المعاملة كلها.
    if (policyBlocked.length) {
      throw new ConflictException({ code: 'PAYRUN-POLICY-PARITY-UNEXPLAINED',
        message: `وضع POLICY يصرف نتيجة محرك السياسة، ويوجد ${policyBlocked.length} فرقًا بلا سبب مكتوب أو بقيمة غائبة؛ اكتب سبب كل فرق من «محرك الحساب» أو أعد المسير إلى SHADOW`,
        issues: policyBlocked.slice(0, 100) })
    }
    run.totalNet = totalNet
    run.status = 'CALCULATED'
    run.snapshotVersion = (run.snapshotVersion ?? 0) + 1
    // الخطوة 22 (B5): من احتسب هذه النسخة ومتى — فصل المهام عند الاعتماد (PAYRUN-STATE-003)
    run.calculatedBy = user.sub
    run.calculatedAt = new Date()
    // الخطوتان 19 و20: اللقطة ووضع المحرك وتقرير التكافؤ لنسخة الحساب نفسها
    run.engineMode = engineMode
    run.policySnapshot = JSON.stringify(policySnapshot)
    run.policySnapshotHash = policySnapshot.fingerprint
    const parityReport = summarizePayrollEngineParity({ engineMode, snapshotVersion: run.snapshotVersion, policySnapshotHash: policySnapshot.fingerprint, rows: parityRows })
    run.parityReport = JSON.stringify(parityReport)
    run = await runs.save(run)
    if (existing) {
      await items.delete({ runId: run.id })
      await members.delete({ runId: run.id })
    }
    for (const member of newMembers) member.runId = run.id
    if (newMembers.length) await members.save(newMembers)
    for (const item of prepared) {
      item.runId = run.id
      await items.save(item)
    }
    const after = { snapshotVersion: run.snapshotVersion, totalNet, members: newMembers, items: prepared }
    const oldIds = new Set([...previousMembers.filter(member => member.membershipStatus !== 'EXCLUDED'), ...previousItems].map(member => member.employeeId))
    const newIds = new Set(covered.map(({ emp }) => emp.id))
    const comparable = (member: PayrollRunMember) => {
      const { capturedAt: _capturedAt, ...snapshot } = member.snapshot ?? {}
      return JSON.stringify({ snapshot, membershipStatus: member.membershipStatus, exclusionReason: member.exclusionReason })
    }
    const comparableItem = (item: PayrollItem | undefined) => item ? JSON.stringify(items.metadata.columns
      .filter(column => !['id', 'runId', 'employeeId'].includes(column.propertyName))
      .map(column => {
        const value = column.getEntityValue(item)
        return [column.propertyName, column.type === 'decimal' || column.type === Number ? Number(value ?? 0) : value ?? null]
      })) : null
    const diff = {
      addedEmployeeIds: [...newIds].filter(id => !oldIds.has(id)),
      removedEmployeeIds: [...oldIds].filter(id => !newIds.has(id)),
      changedEmployeeIds: newMembers.filter(member => {
        const prior = previousMembers.find(row => row.employeeId === member.employeeId)
        const previousItem = previousItems.find(row => row.employeeId === member.employeeId)
        const currentItem = prepared.find(row => row.employeeId === member.employeeId)
        return (prior && comparable(prior) !== comparable(member)) ||
          (oldIds.has(member.employeeId) && comparableItem(previousItem) !== comparableItem(currentItem))
      }).map(member => member.employeeId),
    }
    await this.event(em, user, run.id, existing ? 'RECALCULATED' : isDraft ? 'CALCULATED' : 'CREATED', existing ? this.requireReason(dto.reason) : null,
      { before, after, diff, refreshInstallmentPolicy: dto.refreshInstallmentPolicy === true,
        allowDraftConflicts: dto.allowDraftConflicts === true, conflictRunIds: [...new Set(conflicts.map(row => row.otherRunId))],
        periodContinuity: periodContinuity.map(({ otherRunId: _otherRunId, otherRunName: _otherRunName, ...issue }) => issue),
        // الخطوة 19: مصدر اللقطة (أول حساب / محفوظة / محدّثة بطلب صريح) وفروق التحديث؛ الخطوة 20: الوضع وبصمة تقرير التكافؤ
        policySnapshot: { mode: snapshotStep.mode, hash: policySnapshot.fingerprint, previousHash: snapshotStep.previousHash, differences: snapshotStep.differences },
        engine: { mode: engineMode, parityReportHash: parityReport.reportHash, totals: parityReport.totals },
        // الخطوة 22 (B5): ترتيب التحصيل المطبق، والاستبعاد المضاف لحل تعارض (بسببه ومن استبعده)
        collection: { source: collection.source, order: collection.effectiveOrder, versionId: collection.versionId },
        ...(exclusionsAdded.length ? { exclusionsAdded } : {}),
        // قرار المالك (20 سبتمبر): من دخل المسير ومن خرج منه بهذه الإعادة (عضوية دائمة) بسببها
        ...(membershipPlan ? { membership: { added: membershipPlan.added, removed: membershipPlan.removed, reason: dto.membership?.reason ?? null } } : {}) })
    return run.id
    })
    return this.detail(user, runId)
  }

  private async installmentPlanForItem(em: EntityManager, run: PayrollRun, item: PayrollItem): Promise<PayrollInstallmentPlan | null> {
    let breakdown: any
    try { breakdown = item.breakdown ? JSON.parse(item.breakdown) : {} } catch { throw new ConflictException('تفصيل المسير غير صالح') }
    const plan = breakdown.installmentPlan
    if (plan == null) {
      if (Number(item.loanInstallments) !== 0 || breakdown.installmentIds?.length ||
          (await readLoanInstallmentPositions(em, item.employeeId)).some(row => row.financialStatus === 'DUE' && row.remainingAmount !== '0.00')) {
        throw new ConflictException({ code: 'LOAN_PLAN_RECALCULATION_REQUIRED', message: 'المسير بلا خطة أقساط موثقة أو ظهرت سلفة بعد حسابه؛ أعد فتحه وحساب مسودته قبل الاعتماد أو الصرف' })
      }
      return null
    }
    if (!isPayrollInstallmentPlan(plan)) throw new ConflictException('خطة أقساط المسير غير صالحة؛ أعد حساب المسودة')
    const earned = round2(Number(item.basicSalary) + Number(item.allowances))
    const consumed = round2(Number(item.latenessDeduction) + Number(item.shortfallDeduction) + Number(item.absenceDeduction) + Number(item.otherDeductions))
    // التأمينات الاجتماعية (حصة الموظف) تسبق الأقساط: الخطة مبنية على الصافي بعدها
    const socialInsurance = Number(item.socialInsuranceDeduction ?? 0)
    const netBefore = round2(earned + Number(item.overtimeAmount) + Number(item.otherAdditions) - consumed - Number(item.unpaidLeaveDeduction) - socialInsurance)
    const deducted = legacyInstallmentNumber(plan.allocation.totals.deductedAmount)
    const ids = plan.allocation.lines.filter(line => line.eligible).map(line => Number(line.installmentRef)).sort((a, b) => a - b)
    // الخطوة 22 (B5): لو سبقت السلف فئات أخرى بترتيب المالك فخطة الأقساط على رصيد موضعها المحفوظ، لا على الصافي بعد كل الخصومات.
    const slot = breakdown.collection?.loanSlot ?? null
    if (slot !== null && (typeof slot !== 'object' || !Number.isFinite(Number(slot.netBeforeLoans)) || !Number.isFinite(Number(slot.capConsumed)))) {
      throw new ConflictException('رصيد موضع السلف المحفوظ في تفصيل المسير غير صالح؛ أعد حساب المسودة')
    }
    const planNet = slot ? round2(Number(slot.netBeforeLoans) - socialInsurance).toFixed(2) : netBefore.toFixed(2), planCap = slot ? Number(slot.capConsumed).toFixed(2) : consumed.toFixed(2)
    if (plan.context.period !== run.period || plan.context.endDate !== run.endDate || plan.context.earnedFixedGross !== earned.toFixed(2) ||
        plan.context.capConsumed !== planCap || plan.context.netBeforeLoans !== planNet ||
        Number(item.loanInstallments) !== deducted || Number(item.netPay) !== round2(netBefore - deducted) ||
        !Array.isArray(breakdown.installmentIds) || JSON.stringify([...breakdown.installmentIds].sort((a, b) => a - b)) !== JSON.stringify(ids)) {
      throw new ConflictException('مبالغ المسير أو مصادره لا تطابق خطة الأقساط المحفوظة؛ أعد حساب المسودة')
    }
    return plan
  }

  // ===== الاعتماد =====
  async approve(user: JwtPayload, runId: number) {
    return this.runs.manager.transaction(async em => {
      await this.lockRun(em, runId)
      const runs = em.getRepository(PayrollRun)
      const run = await runs.findOne({ where: { id: runId } })
      if (!run) throw new NotFoundException('المسير غير موجود')
      await this.assertRunAccess(user, run, em)
      // الخطوة 22 (B5): خطأ الحالة برمز PAYRUN-STATE-001 والحالة الحالية والحالات المتاحة (SRS PR-11)
      if (run.status !== 'CALCULATED') throw new BadRequestException(payrollRunStateIssue('اعتماد المسير', run.status, ['CALCULATED']))
      // فصل المهام: لا يعتمد المسير من احتسب نسخته الحالية، إلا برخصة الشركة الصغيرة المفعّلة صراحةً (تُسجل في حدث الاعتماد).
      const calculatedBy = await this.runCalculator(em, run)
      const selfApprovalAllowed = payrollSelfApprovalAllowed(await this.cfg(PAYROLL_SELF_APPROVAL_KEY, 'false'))
      const selfApproval = payrollSelfApprovalIssue({ calculatedBy, approverId: user.sub, selfApprovalAllowed })
      if (selfApproval) throw new ForbiddenException(selfApproval)
      // C8 / الخطوة 31: مسير العكس — فصل المهام أعلاه (من أنشأ العكس لا يعتمده)، ثم إعادة التحقق من كل سطر؛ لا حجز ولا دفاتر قبل التنفيذ
      if (payrollRunTypeOf(run) === 'REVERSAL') {
        const ready = await this.reversalLinesReady(em, run)
        run.status = 'APPROVED'
        run.approvedBy = user.sub
        run.approvedAt = new Date()
        await runs.save(run)
        await this.event(em, user, run.id, 'APPROVED', null, { runType: 'REVERSAL', parentRunId: ready.parent.id, employeeIds: ready.employeeIds, totalNet: Number(run.totalNet),
          lineIds: ready.pairs.map(pair => pair.line.id), calculatedBy, smallCompanyException: calculatedBy === user.sub, selfApprovalSetting: selfApprovalAllowed })
        return run
      }
      // الخطوة 19: لا اعتماد بلا لقطة سياسة سليمة (بصمتها ومحتواها وشهرها)؛ اللقطة المعدلة خارج الشاشة ترفض بـPAYRUN-POLICY-SNAPSHOT-INVALID.
      const policySnapshot = parsePayrollRunPolicySnapshot(run)
      if (!policySnapshot) {
        throw new ConflictException({ code: 'PAYRUN-POLICY-SNAPSHOT-MISSING',
          message: 'هذا المسير محسوب بإصدار سابق من النظام؛ اضغط «إعادة حساب المسير» ثم اعتمده' })
      }
      // تبسيط الرواتب (2026-09-15): شرط التكافؤ لا يوقف الاعتماد إلا لمسير يصرف نتيجة محرك السياسة (POLICY)؛
      // SHADOW/LEGACY يصرف الحساب القائم فتقرير الفروق معلومة فقط: يُرفق بالاعتماد متى كان سليمًا ومفسَّرًا (لسجل فترة التكافؤ)، وإلا null بلا منع.
      // وإقرار «موظفون بلا مسير» لم يعد شرطًا للاعتماد (التقرير متاح للقراءة).
      const parity = run.engineMode === 'POLICY'
        ? await this.assertApprovalParity(em, run, policySnapshot.fingerprint)
        : await this.assertApprovalParity(em, run, policySnapshot.fingerprint).catch(error => { if (error instanceof ConflictException) return null; throw error })
      const items = await em.getRepository(PayrollItem).find({ where: { runId } })
      const employeeIds = await this.validateRunMembers(em, run, items)
      await lockPayrollEmployees(em, employeeIds)
      await this.assertAttendanceExemptionSnapshot(em, run, items)
      await this.assertAttendanceRuleSnapshot(em, run, items)
      await this.assertSalarySourceSnapshot(em, run, items)
      await this.assertSettlementBoundary(em, items)
      // الخطوة 26 (EX-01 قاعدة 4): لا إعفاء بانتظار الاعتماد، والحساب طبّق الإعفاءات النشطة الحالية نفسها، وحد المرفق على المبلغ المُسقط فعلًا
      await assertRunExemptionsForApproval(em, run, items)
      // DD-11: الرصيد السالب (المحمي يتجاوز الاستحقاق) يمنع القبول المالي
      const negativeNet = items.filter(item => Number(item.netPay) < 0).map(item => item.employeeId)
      if (negativeNet.length) throw new ConflictException({ code: 'PAYRUN-NET-NEGATIVE', message: 'صافي بعض الموظفين سالب؛ عالج الإجازة بلا أجر أو الاستحقاق ثم أعد الحساب قبل الاعتماد', employeeIds: negativeNet })
      await claimPayrollPeriod(em, run, employeeIds)
      for (const item of items) {
        const plan = await this.installmentPlanForItem(em, run, item)
        if (plan) await reservePayrollInstallments(em, item.employeeId, run.id, run.snapshotVersion, user.sub, plan)
        // DD-09 (C2): حجز قيود الدفتر باسم المسير المعتمد — مسير معتمد واحد فقط يحملها
        await reservePayrollObligations(em, item.employeeId, run.id, item.breakdown ? JSON.parse(item.breakdown) : {})
        // الخطوة 26: القيود المُعفاة تُحجز باسم المسير أيضًا حتى الصرف
        await reserveExemptedObligations(em, item.employeeId, run.id, item.breakdown ? JSON.parse(item.breakdown) : {})
      }
      // الخطوة 26 (EX-08): الإعفاء النشط لعضو ← APPLIED بالمبلغ المُسقط؛ لموظف خارج البنود ← EXPIRED
      await markRunExemptionsApplied(em, run, items, user.sub)
      run.status = 'APPROVED'
      run.approvedBy = user.sub
      run.approvedAt = new Date()
      await runs.save(run)
      await this.event(em, user, run.id, 'APPROVED', null, { snapshotVersion: run.snapshotVersion, employeeIds, totalNet: Number(run.totalNet),
        unassignedAckId: null, unassignedReportHash: null,
        // الخطوتان 19 و20: بصمة لقطة السياسة المتحقق منها ووضع المحرك؛ تقرير التكافؤ وأسبابه لمسير POLICY فقط (null لغيره)
        policySnapshotHash: policySnapshot.fingerprint, engineMode: run.engineMode,
        parityReportHash: parity?.report.reportHash ?? null, parityTotals: parity?.report.totals ?? null, parityExplanationIds: parity?.explanationIds ?? null,
        parityExplained: parity?.explained ?? null,
        // الخطوة 22 (B5): من احتسب، واستخدام رخصة الشركة الصغيرة (المعتمِد هو المحتسِب) إن وقع
        calculatedBy, smallCompanyException: calculatedBy === user.sub, selfApprovalSetting: selfApprovalAllowed })
      return run
    })
  }

  // ===== الصرف: يقفل الأوفرتايم والأقساط المرتبطة =====
  async pay(user: JwtPayload, runId: number, dto: { channel?: unknown; reference?: unknown } = {}) {
    return this.runs.manager.transaction(async em => {
      await this.lockRun(em, runId)
      const runs = em.getRepository(PayrollRun)
      const run = await runs.findOne({ where: { id: runId } })
      if (!run) throw new NotFoundException('المسير غير موجود')
      await this.assertRunAccess(user, run, em)
      // الخطوة 22 (B5): الصرف من «معتمد» فقط (PAYRUN-STATE-001)، ثم قيد الصرف (القناة والمرجع) قبل أي كتابة
      if (run.status !== 'APPROVED') throw new BadRequestException(payrollRunStateIssue('صرف المسير', run.status, ['APPROVED']))
      const payIssue = payrollPayRecordIssue(dto)
      if (payIssue) throw new BadRequestException(payIssue)
      const payRecord = payrollPayRecordOf(dto)
      // C8 / الخطوة 31: تنفيذ مسير العكس — الإضافي والأقساط تعود لحالتها قبل الصرف، وقيود REVERSAL وقيود الإعادة في الدفاتر، وتحرير حجز الفترة؛
      // قيد الصرف هنا قيد الاسترداد (القناة والمرجع). صفوف المسير الأصلي لا تُعدَّل.
      if (payrollRunTypeOf(run) === 'REVERSAL') {
        if (run.parentRunId) await lockPayrollRunForCorrection(em, run.parentRunId)
        const ready = await this.reversalLinesReady(em, run)
        const effects = []
        for (const pair of ready.pairs) effects.push(await postPayrollReversalLine(em, { reversalRun: run, parentRun: ready.parent, line: pair.line, item: pair.item, actorUserId: user.sub }))
        run.status = 'PAID'
        run.paidAt = new Date()
        run.paidBy = user.sub
        run.payChannel = payRecord.channel
        run.payReference = payRecord.reference
        await runs.save(run)
        const summary = { overtime: effects.reduce((sum, row) => sum + row.overtime.length, 0), installments: effects.reduce((sum, row) => sum + row.installments.length, 0),
          obligations: effects.reduce((sum, row) => sum + row.obligations.length, 0), reopenedLoans: effects.reduce((sum, row) => sum + row.reopenedLoans.length, 0),
          releasedClaims: effects.reduce((sum, row) => sum + row.releasedClaimIds.length, 0) }
        await this.event(em, user, run.id, 'PAID', null, { runType: 'REVERSAL', parentRunId: ready.parent.id, totalNet: Number(run.totalNet), employeeIds: ready.employeeIds,
          paidBy: user.sub, channel: payRecord.channel, channelLabel: PAYROLL_PAY_CHANNEL_LABELS[payRecord.channel], reference: payRecord.reference, effects: summary })
        await this.event(em, user, ready.parent.id, 'REVERSAL_POSTED', run.correctionReason ? run.correctionReason.slice(0, 500) : null,
          { reversalRunId: run.id, employeeIds: ready.employeeIds, totalNet: Number(run.totalNet), effects: summary })
        return run
      }
      const items = await em.getRepository(PayrollItem).find({ where: { runId } })
      const employeeIds = await this.validateRunMembers(em, run, items)
      await lockPayrollEmployees(em, employeeIds)
      await this.assertAttendanceExemptionSnapshot(em, run, items)
      await this.assertSettlementBoundary(em, items)
      // DD-11 (C2): الصافي السالب المحفوظ يمنع الصرف أيضًا، لا الاعتماد وحده
      const negativeNetAtPay = items.filter(item => Number(item.netPay) < 0).map(item => item.employeeId)
      if (negativeNetAtPay.length) throw new ConflictException({ code: 'PAYRUN-NET-NEGATIVE', message: 'صافي بعض الموظفين سالب؛ أعد فتح المسير وعالج الإجازة بلا أجر أو الاستحقاق ثم أعد الحساب قبل الصرف', employeeIds: negativeNetAtPay })
      // المسيرات القديمة لا تتجاوز الحارس لمجرد غياب صفوف claims في ترحيلها.
      await claimPayrollPeriod(em, run, employeeIds)
      for (const item of items) {
        const breakdown = item.breakdown ? JSON.parse(item.breakdown) : {}
        // أوفرتايم الفترة → PAID + ربط بالمسير
        if (breakdown.overtimeEntryIds?.length) {
          const updated = await em.getRepository(OvertimeEntry).update(
            { id: In(breakdown.overtimeEntryIds), employeeId: item.employeeId, status: 'APPROVED' },
            { status: 'PAID', payrollRunId: runId }
          )
          if (updated.affected !== new Set(breakdown.overtimeEntryIds).size) throw new ConflictException('أحد مصادر الإضافي تغيّر أو صُرف بالفعل؛ راجع المسير')
        }
        const installmentPlan = await this.installmentPlanForItem(em, run, item)
        if (installmentPlan) await postPayrollInstallments(em, item.employeeId, run.id, run.snapshotVersion, user.sub, installmentPlan)
        // بنود دفتر المديونيات → APPLIED بالمبلغ المحصل (مرة واحدة)، والباقي بعد حماية الصافي قيد مرحّل (C2: DD-09/11)
        await postPayrollObligations(em, item.employeeId, run, breakdown, user.sub)
        // الخطوة 26 (EX-08): القيد المصنف المُعفى ← EXEMPTED (إسقاط) أو DEFERRED مع قسط للشهر التالي بمرجع الإعفاء
        await postExemptedObligations(em, item.employeeId, run, breakdown, user.sub)
      }
      run.status = 'PAID'
      run.paidAt = new Date()
      // قيد الصرف: من صرف وقناته ومرجعه على المسير وفي حدث الصرف
      run.paidBy = user.sub
      run.payChannel = payRecord.channel
      run.payReference = payRecord.reference
      await runs.save(run)
      await this.event(em, user, run.id, 'PAID', null, { snapshotVersion: run.snapshotVersion, totalNet: Number(run.totalNet), employeeIds,
        paidBy: user.sub, channel: payRecord.channel, channelLabel: PAYROLL_PAY_CHANNEL_LABELS[payRecord.channel], reference: payRecord.reference })
      return run
    })
  }

  // ===== الاستعلام (بنطاق الفرع) =====
  /** المسير الذي يُحكم به النطاق: مسير العكس يُحكم بمسيره الأصلي (نفس تسلسل assertRunAccess). */
  private scopeOwnerRun(run: PayrollRun, byId: Map<number, PayrollRun>, seen = new Set<number>()): PayrollRun | null {
    if (run.runType !== 'REVERSAL' || !run.parentRunId) return run
    const parent = byId.get(run.parentRunId)
    if (!parent || parent.id === run.id || seen.has(run.id)) return null
    seen.add(run.id)
    return this.scopeOwnerRun(parent, byId, seen)
  }

  /** نفس شرط assertRunAccess بالضبط، محسوبًا على صفوف محمّلة دفعة واحدة بدل معاملة وقفل لكل مسير. */
  private runInBranchScope(run: PayrollRun, branch: number, byId: Map<number, PayrollRun>,
    membersOf: Map<number, Array<{ employeeId: number; snapshot: PayrollMemberSnapshot | null }>>,
    itemsOf: Map<number, Array<{ employeeId: number }>>): boolean {
    const owner = this.scopeOwnerRun(run, byId)
    if (!owner || owner.scopeType === 'COMPANY') return false
    const branchIds = owner.scopeIds ? JSON.parse(owner.scopeIds) as number[] : [owner.branchId]
    const definition = owner.definition ? payrollRunDefinitionOf(owner) : null
    const definitionBranches = definition ? definition.filters.branchIds : null
    if (definitionBranches?.some(id => id !== branch) || definition?.filters.allEmployees) return false
    const legacyBranch = definitionBranches ? (definitionBranches.length === 1 ? definitionBranches[0] : null)
      : owner.scopeType === 'BRANCH' && branchIds.length === 1 ? branchIds[0] : null
    if (!owner.definition && owner.scopeType === 'BRANCH' && branchIds.some(id => id !== branch)) return false
    const members = membersOf.get(owner.id) ?? [], items = itemsOf.get(owner.id) ?? []
    const ids = [...new Set([...members, ...items].map(row => row.employeeId))]
    if (!ids.length) return legacyBranch === branch
    return ids.every(id => {
      const member = members.find(row => row.employeeId === id)
      return (member?.snapshot ? member.snapshot.branchId : legacyBranch) === branch
    })
  }

  async list(user: JwtPayload) {
    const rows = await this.runs.find({ order: { period: 'DESC', id: 'DESC' } })
    const branch = branchScopeOf(user)
    if (branch === null) return rows.map(run => this.lightRun(run))
    // نطاق الفرع: ثلاثة استعلامات مرتبة بدل قراءة كل مسير في معاملته المستقلة بقفلها (كانت ثوانٍ لمسؤول الفرع).
    if (branch < 1) return []
    const byId = new Map(rows.map(run => [run.id, run]))
    const members = await this.members.find({ select: { runId: true, employeeId: true, snapshot: true } })
    const items = await this.items.find({ select: { runId: true, employeeId: true } })
    const membersOf = new Map<number, Array<{ employeeId: number; snapshot: PayrollMemberSnapshot | null }>>()
    const itemsOf = new Map<number, Array<{ employeeId: number }>>()
    for (const member of members) membersOf.set(member.runId, [...(membersOf.get(member.runId) ?? []), member])
    for (const item of items) itemsOf.set(item.runId, [...(itemsOf.get(item.runId) ?? []), item])
    return rows.filter(run => this.runInBranchScope(run, branch, byId, membersOf, itemsOf)).map(run => this.lightRun(run))
  }

  // الخطوتان 19 و20: نص اللقطة والتقرير الخام لا يُعاد في القوائم والقسيمة؛ التفاصيل عبر engine وpolicy-snapshot.
  private lightRun(run: PayrollRun): PayrollRun {
    const { policySnapshot: _snapshot, parityReport: _report, ...rest } = run
    return rest as PayrollRun
  }

  async detail(user: JwtPayload, runId: number) {
    return this.readRun(runId, async (em, run) => {
    await this.assertRunAccess(user, run, em)
    const items = await em.getRepository(PayrollItem).find({
      where: { runId },
      order: { employeeId: 'ASC' },
    })
    const members = await em.getRepository(PayrollRunMember).find({ where: { runId }, order: { employeeId: 'ASC' } })
    const employeeIds = [...new Set([...members.filter(member => member.membershipStatus !== 'EXCLUDED'), ...items].map(row => row.employeeId))]
    const conflicts = run.status === 'CANCELLED' ? [] : await this.visibleConflicts(user, await findPayrollConflicts(em, run, employeeIds), em)
    // التنبيه يقرأ المعلّق حاليًا داخل الفترة؛ لا يغيّر بنود المسير أو قيمتها المحفوظة.
    const pendingRows = employeeIds.length && run.status !== 'CANCELLED' ? await em.getRepository(OvertimeEntry).find({
      where: { employeeId: In(employeeIds), date: Between(run.startDate, run.endDate), status: In(['DETECTED', 'SUBMITTED']) },
      order: { date: 'ASC', employeeId: 'ASC', id: 'ASC' },
    }) : []
    const pendingOvertime = pendingRows.map(row => {
      const submission = (row.calculationSnapshot as any)?.submission
      return { id: row.id, employeeId: row.employeeId, date: row.date, status: row.status, requestId: row.requestId,
        detectedMinutes: submission?.evidence?.detectedMinutes ?? (row.hoursActual == null ? null : Math.round(Number(row.hoursActual) * 60)),
        requestedMinutes: submission?.requestedMinutes ?? (row.hoursRequested == null ? null : Math.round(Number(row.hoursRequested) * 60)) }
    })
    // الخطوة 14: فجوات/تداخلات فترة المسير مع الشهر السابق والتالي (قراءة فقط)؛ مسير خارج النطاق لا يُكشف رقمه.
    const periodContinuity = []
    for (const issue of run.status === 'CANCELLED' ? [] : await findPayrollPeriodContinuity(em, run, employeeIds)) {
      let visible = true
      if (branchScopeOf(user) !== null) {
        const other = await em.getRepository(PayrollRun).findOneBy({ id: issue.otherRunId })
        try { if (!other) throw new ForbiddenException(); await this.assertRunAccess(user, other, em) }
        catch (error) { if (!(error instanceof ForbiddenException)) throw error; visible = false }
      }
      periodContinuity.push(visible ? issue : { ...issue, otherRunId: null, otherRunName: 'مسير خارج نطاق صلاحيتك' })
    }
    // الخطوة 16: التعريف (فلاتر/قائمة/استبعادات) ونسخة السياسة، وإخفاء رقم مسير الحجز خارج النطاق في عضوية EXC_ALREADY_IN_RUN.
    const selection = payrollRunDefinitionOf(run)
    const policyVersion = await this.runPolicyView(em, run)
    // الخطوة 20: وضع المحرك وتقرير التكافؤ وأسبابه وشروط التحويل إلى POLICY (النص الخام للقطة والتقرير لا يُعاد مرتين)
    const engine = await this.engineView(em, run)
    // الخطوة 22 (B5): من احتسب ومن اعتمد ومن صرف بأسمائهم، وفصل المهام للمستخدم الحالي، وقيد الصرف، وترتيب التحصيل المطبق
    const calculatedBy = await this.runCalculator(em, run)
    const names = await this.userNames(em, [calculatedBy, run.approvedBy, run.paidBy])
    const actor = (id: number | null | undefined, at: Date | null | undefined) => id == null ? null : { id, name: names.get(id) ?? null, at: at ?? null }
    const selfApprovalAllowed = payrollSelfApprovalAllowed(await this.cfg(PAYROLL_SELF_APPROVAL_KEY, 'false'))
    const actors = { calculated: actor(calculatedBy, run.calculatedAt), approved: actor(run.approvedBy, run.approvedAt), paid: actor(run.paidBy, run.paidAt) }
    const approvalGuard = run.status === 'CALCULATED'
      ? { calculatedBy, selfApprovalAllowed, blocked: payrollSelfApprovalIssue({ calculatedBy, approverId: user.sub, selfApprovalAllowed }) } : null
    const payRecord = run.status === 'PAID' ? { paidBy: actors.paid, channel: run.payChannel,
      channelLabel: run.payChannel ? PAYROLL_PAY_CHANNEL_LABELS[run.payChannel as PayrollPayChannel] ?? run.payChannel : null, reference: run.payReference } : null
    let collection: PayrollRunCollectionOrder | { source: 'INVALID'; message: string }
    try { collection = await readPayrollRunCollectionOrder(em, run.policyVersionId ?? null) }
    catch (error) {
      if (!(error instanceof ConflictException)) throw error
      collection = { source: 'INVALID', message: (error.getResponse() as { message?: string }).message ?? 'ترتيب التحصيل في نسخة السياسة غير صالح' }
    }
    // C8 / الخطوة 31: نوع المسير والمسير المرتبط والمسيرات التابعة وسطور العكس أو البنود المعكوسة
    const correction = await describePayrollRunCorrection(em, run)
    return { ...this.lightRun(run), items, members: await this.visibleMembers(user, members, em), conflicts, pendingOvertime, periodContinuity, selection, policyVersion, engine,
      actors, approvalGuard, payRecord, collection, correction }
    })
  }

  // C8 / الخطوة 31: سطور مسير العكس المعلقة جاهزة للاعتماد أو التنفيذ — المسير الأصلي ما زال مصروفًا، والبند بلقطته، ولا مانع لاحق (الموظفون مقفولون)
  private async reversalLinesReady(em: EntityManager, run: PayrollRun) {
    const parent = run.parentRunId ? await em.getRepository(PayrollRun).findOneBy({ id: run.parentRunId }) : null
    if (!parent || parent.status !== 'PAID' || payrollRunTypeOf(parent) === 'REVERSAL') {
      throw new ConflictException({ code: 'PAYRUN-REVERSAL-PARENT', message: 'المسير الأصلي لمسير العكس غير موجود أو لم يعد مصروفًا' })
    }
    const lines = await em.getRepository(PayrollRunReversalLine).find({ where: { reversalRunId: run.id, status: 'PENDING' }, order: { employeeId: 'ASC', id: 'ASC' } })
    if (!lines.length) throw new ConflictException({ code: 'PAYRUN-REVERSAL-EMPTY', message: 'مسير العكس بلا سطور معلقة للتنفيذ' })
    const employeeIds = [...new Set(lines.map(line => line.employeeId))]
    await lockPayrollEmployees(em, employeeIds)
    const items = await em.getRepository(PayrollItem).find({ where: { runId: parent.id, id: In(lines.map(line => line.originalItemId)) } })
    const blockers: PayrollReversalBlocker[] = []
    const pairs: Array<{ line: PayrollRunReversalLine; item: PayrollItem }> = []
    for (const line of lines) {
      const item = items.find(row => row.id === line.originalItemId && row.employeeId === line.employeeId)
      if (!item) throw new ConflictException({ code: 'PAYRUN-REVERSAL-ITEM-CHANGED', message: `بند الموظف #${line.employeeId} في المسير الأصلي لم يعد موجودًا` })
      const plan = await planPayrollItemReversal(em, parent, item, { ownReversalRunId: run.id })
      if (plan.hash !== line.itemHash) throw new ConflictException({ code: 'PAYRUN-REVERSAL-ITEM-CHANGED', message: `بند الموظف #${line.employeeId} في المسير الأصلي لا يطابق لقطته وقت إنشاء العكس` })
      blockers.push(...plan.blockers)
      pairs.push({ line, item })
    }
    if (blockers.length) throw new ConflictException({ code: 'PAYRUN-REVERSAL-BLOCKED', message: `تعذر المتابعة في مسير العكس: ${blockers[0].message}`, blockers })
    return { parent, pairs, employeeIds }
  }

  async reopen(user: JwtPayload, runId: number, reason: string) {
    if (!userHasPerm(user, 'payroll.reopen')) throw new ForbiddenException('ليست لديك صلاحية إعادة فتح المسير')
    await this.changeRunState(user, runId, 'APPROVED', 'CALCULATED', 'REOPENED', this.requireReason(reason))
    return this.detail(user, runId)
  }

  async cancel(user: JwtPayload, runId: number, reason: string) {
    if (!userHasPerm(user, 'payroll.cancel')) throw new ForbiddenException('ليست لديك صلاحية إلغاء المسير')
    // الخطوة 16: المسودة (قبل الحساب) تُلغى بالمسار نفسه وتبقى محفوظة بسجلها.
    await this.changeRunState(user, runId, ['CALCULATED', 'DRAFT'], 'CANCELLED', 'CANCELLED', this.requireReason(reason))
    return this.detail(user, runId)
  }

  private async changeRunState(user: JwtPayload, runId: number, expected: PayrollRun['status'] | PayrollRun['status'][], status: PayrollRun['status'], eventType: string, reason: string) {
    await this.runs.manager.transaction(async em => {
      await this.lockRun(em, runId)
      const runs = em.getRepository(PayrollRun)
      const run = await runs.findOneBy({ id: runId })
      if (!run) throw new NotFoundException('المسير غير موجود')
      await this.assertRunAccess(user, run, em)
      if (!(Array.isArray(expected) ? expected : [expected]).includes(run.status)) throw this.stateError(eventType === 'REOPENED' ? 'إعادة فتح المسير' : 'إلغاء المسير', run.status)
      const items = await em.getRepository(PayrollItem).find({ where: { runId } })
      const members = await em.getRepository(PayrollRunMember).find({ where: { runId } })
      await lockPayrollEmployees(em, [...members, ...items].map(row => row.employeeId))
      const before = { status: run.status, approvedBy: run.approvedBy, approvedAt: run.approvedAt }
      await releasePayrollClaims(em, runId)
      await releasePayrollInstallments(em, runId, user.sub, reason)
      await releasePayrollObligations(em, runId)
      // الخطوة 26: إعادة الفتح تعيد الإعفاء المطبق نشطًا، والإلغاء ينهي الحي
      await releaseRunExemptions(em, runId, status, user.sub, reason)
      // C8 / الخطوة 31: إلغاء مسير العكس قبل تنفيذه يلغي سطوره المعلقة ويُسجل على المسير الأصلي؛ إعادة فتحه المعتمد لا أثر مالي لها
      if (payrollRunTypeOf(run) === 'REVERSAL' && status === 'CANCELLED') {
        const cancelledLineIds = await cancelPayrollReversalLines(em, runId)
        if (run.parentRunId) await this.event(em, user, run.parentRunId, 'REVERSAL_CANCELLED', reason, { reversalRunId: runId, lineIds: cancelledLineIds })
      }
      run.status = status
      if (status === 'CALCULATED') { run.approvedBy = null; run.approvedAt = null }
      await runs.save(run)
      await this.event(em, user, runId, eventType, reason, { before, after: { status }, snapshotVersion: run.snapshotVersion })
    })
  }

  async events(user: JwtPayload, runId: number) {
    return this.readRun(runId, async (em, run) => {
    await this.assertRunAccess(user, run, em)
    const events = await em.getRepository(PayrollRunEvent).find({ where: { runId }, order: { id: 'ASC' } })
    const branch = branchScopeOf(user)
    if (branch !== null) {
      // نسخة سابقة من مسير مخصّص قد تضم فرعًا آخر؛ لا تُكشف بمجرد تغير عضويته الحالية.
      const branchIds = run.scopeIds ? JSON.parse(run.scopeIds) as number[] : [run.branchId]
      const legacyBranch = run.scopeType === 'BRANCH' && branchIds.length === 1 ? branchIds[0] : null
      for (const event of events) {
      for (const phase of ['before', 'after']) {
        const payload = event.payload?.[phase] as { members?: PayrollRunMember[]; items?: PayrollItem[] } | null
        const members = payload?.members ?? []
        const ids = new Set([...members, ...(payload?.items ?? [])].map(row => row.employeeId))
        for (const employeeId of ids) {
          const member = members.find(row => row.employeeId === employeeId)
          const savedBranch = member?.snapshot ? member.snapshot.branchId : legacyBranch
          if (savedBranch !== branch) throw new ForbiddenException('سجل هذا المسير يتضمن أعضاء خارج نطاقك التاريخي')
        }
      }
      // سجل التدقيق الداخلي يحتفظ بالمراجع؛ النسخة المعروضة لا تكشف أرقام مسيرات خارج النطاق.
      if (event.payload?.conflictRunIds) {
        const { conflictRunIds: _conflictRunIds, ...visible } = event.payload
        event.payload = visible
      }
      for (const phase of ['before', 'after']) {
        const members = (event.payload?.[phase] as { members?: Array<{ snapshot?: PayrollMemberSnapshot | null }> } | null)?.members ?? []
        for (const member of members) {
          if (member.snapshot?.alreadyInRun) member.snapshot.alreadyInRun = { ...member.snapshot.alreadyInRun, otherRunId: null, name: null }
        }
      }
      }
    }
    // الخطوة 22 (B5): اسم من فعل كل حدث للوحة «سجل المسير»
    const names = await this.userNames(em, events.map(event => event.actorUserId))
    return events.map(event => ({ ...event, actorName: names.get(event.actorUserId) ?? null }))
    })
  }

  // كل قسائم موظف (المسيرات المعتمدة/المصروفة فقط) — لبورتال الموظف
  async payslipsOf(employeeId: number) {
    const items = await this.items.find({
      where: { employeeId },
      order: { id: 'DESC' },
    })
    const result = []
    for (const item of items) {
      const published = await this.readRun(item.runId, async (em, run) => {
        if (!['APPROVED', 'PAID'].includes(run.status)) return null
        const currentItem = await em.getRepository(PayrollItem).findOneBy({ id: item.id, employeeId })
        // C8: القسيمة المعكوسة تبقى في سجل الموظف موسومة بعكسها وبقسيمة المسير التكميلي إن وُجدت
        return currentItem ? { item: currentItem, run, reversal: await describePayrollItemReversal(em, currentItem) } : null
      })
      if (published) result.push(published)
    }
    return result
  }

  // قسيمة راتب: البند + المسير + الموظف — لشاشة payslip
  async payslip(user: JwtPayload, itemId: number) {
    const reference = await this.items.findOne({ where: { id: itemId }, select: ['runId'] })
    if (!reference) throw new NotFoundException('بند المسير غير موجود')
    return this.readRun(reference.runId, async (em, run) => {
    const item = await em.getRepository(PayrollItem).findOneBy({ id: itemId, runId: run.id })
    if (!item) throw new NotFoundException('بند المسير تغير بعد إعادة الحساب؛ حدّث الشاشة')
    const ownPublished = item.employeeId === user.employeeId && ['APPROVED', 'PAID'].includes(run.status)
    if (!ownPublished && !userHasPerm(user, 'payroll.view')) throw new ForbiddenException('القسيمة غير متاحة لك')
    const member = await em.getRepository(PayrollRunMember).findOneBy({ runId: run.id, employeeId: item.employeeId })
    const snapshot = member?.snapshot
    const branchIds = run.scopeIds ? JSON.parse(run.scopeIds) as number[] : [run.branchId]
    const savedBranch = snapshot ? snapshot.branchId : run.scopeType === 'BRANCH' && branchIds.length === 1 ? branchIds[0] : null
    const scope = branchScopeOf(user)
    if (!ownPublished && scope !== null && savedBranch !== scope) throw new ForbiddenException('القسيمة خارج الفرع المسموح لك أو بلا نطاق تاريخي موثّق')
    // القسيمة القديمة لا تمتلك لقطة هوية أو بنك؛ لا ننسب بيانات الموظف الحالية إلى تاريخها.
    const legacyIdentity = snapshot ? null : await em.getRepository(Employee).findOne({ where: { id: item.employeeId }, select: ['id', 'fullName', 'employeeCode'] })
    // الهوية والبنك والآيبان على القسيمة: قراءة فقط من ملف الموظف، محكومة بنفس صلاحية القسيمة أعلاه.
    // ليست لقطة تاريخية (اللقطة لا تحملها)، فهي بيانات صرف حالية يحتاجها من يقرأ القسيمة.
    const payee = await em.getRepository(Employee).findOne({ where: { id: item.employeeId }, select: ['id', 'nationalId', 'bankName', 'iban', 'payMethod', 'bankTransferAmount'] })
    // طريقة الصرف وتقسيم الصافي «تحويل بنكي X — نقدي Y» من بيانات الصرف الحالية (نفس كشف البنوك)
    const payMethod = payee?.payMethod ?? item.payMethod ?? 'transfer'
    const identity = { nationalId: payee?.nationalId ?? null, bankName: payee?.bankName ?? null, iban: payee?.iban ?? null,
      payMethod, bankTransferAmount: payee?.bankTransferAmount ?? null, paySplit: payrollPaySplit(item.netPay, payMethod, payee?.bankTransferAmount) }
    const employee = snapshot ? { id: item.employeeId, fullName: snapshot.fullName, employeeCode: snapshot.employeeCode,
      jobTitle: snapshot.jobTitle, joinDate: snapshot.hireDate, branchId: snapshot.branchId, departmentId: snapshot.departmentId,
      teamId: snapshot.teamId, costCenterId: snapshot.costCenterId, basicSalary: snapshot.basicSalary, ...identity } :
      legacyIdentity ? { ...legacyIdentity, branchId: savedBranch, basicSalary: Number(item.basicSalary), ...identity } : null
    // C2: تتبع كل قيد دفتر في القسيمة (نوع الخصم وسببه وطلبه وسعر اليوم المستخدم)
    let savedBreakdown: unknown = {}
    try { savedBreakdown = item.breakdown ? JSON.parse(item.breakdown) : {} } catch { savedBreakdown = {} }
    const obligationDetails = await describePayrollObligationLines(em, savedBreakdown)
    // الخطوة 26 (EX-04): الإعفاءات المطبقة على البند برقمها وسببها والمانح بالدور
    const financialExemptions = await describePayslipExemptions(em, savedBreakdown)
    // C8 / الخطوة 31: هل عُكس صرف هذا البند (بأي مسير وسبب) وقسيمة المسير التكميلي المربوطة
    const reversal = await describePayrollItemReversal(em, item)
    // سطور عمود الإجازة بلا أجر (بدون راتب + خصم الإجازة المرضية لكل نسبة أجر)؛ البند القديم بلا سطور = سطر واحد بالعمود
    const savedLeaveLines = (savedBreakdown as { leaveDeductionLines?: unknown }).leaveDeductionLines
    const leaveDeductions = Array.isArray(savedLeaveLines) ? savedLeaveLines
      : Number(item.unpaidLeaveDeduction) > 0 ? [{ code: 'UNPAID_LEAVE', label: 'إجازة بدون راتب', days: Number(item.unpaidLeaveDays), payPercent: 0, amount: Number(item.unpaidLeaveDeduction) }] : []
    // طلب المالك 19 سبتمبر: الاستحقاقات والاستقطاعات بندًا بندًا بأسمائها (نفس جدول المسير وتصديره)، مجموعها = الأعمدة المحفوظة
    const [lines] = await describePayrollItemsLines(em, [item])
    return { item, run: this.lightRun(run), employee, member, identitySource: snapshot ? 'SNAPSHOT' : 'CURRENT_NAME_ONLY', obligationDetails, financialExemptions, reversal, leaveDeductions, lines }
    })
  }

  // طلب المالك 19 سبتمبر: بنود كل موظف في المسير (استحقاقات واستقطاعات بأسمائها) وأعمدة الجدول الموجودة فعلًا — قراءة فقط
  async runLines(user: JwtPayload, runId: number) {
    return this.readRun(runId, async (em, run) => {
      await this.assertRunAccess(user, run, em)
      const items = await em.getRepository(PayrollItem).find({ where: { runId }, order: { employeeId: 'ASC' } })
      const lines = await describePayrollItemsLines(em, items)
      const rows = items.map((item, index) => ({ itemId: item.id, employeeId: item.employeeId, ...lines[index] }))
      return { runId, columns: payrollLineColumns(rows), rows }
    })
  }

  // ===== الخطوات 16–18: تعريف المسير كمسودة، معاينة العضوية (قراءة فقط)، وتقرير «بلا مسير» وإقراره =====
  private bad(code: string, message: string, details: Record<string, unknown> = {}): never {
    throw new BadRequestException({ code, message, ...details })
  }

  private async calculationLock(em: EntityManager) {
    const rows = await em.query(`DECLARE @result int;
      EXEC @result = sys.sp_getapplock @Resource = 'hr:payroll:calculation',
        @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000;
      SELECT @result AS lockResult;`)
    if (!rows.length || Number(rows[0].lockResult) < 0) throw new ConflictException('يوجد حساب مسير جارٍ؛ حاول مجددًا بعد انتهائه')
  }

  private isUniqueViolation(error: unknown): boolean {
    const pending: unknown[] = [error]
    const seen = new Set<object>()
    while (pending.length) {
      const next = pending.pop()
      if (!next || typeof next !== 'object' || seen.has(next)) continue
      seen.add(next)
      const value = next as Record<string, unknown>
      if ([2601, 2627].includes(Number(value.number))) return true
      for (const key of ['driverError', 'originalError', 'info', 'cause']) pending.push(value[key])
      for (const key of ['precedingErrors', 'errors']) if (Array.isArray(value[key])) pending.push(...value[key] as unknown[])
    }
    return false
  }

  private runName(value: unknown): string {
    const name = typeof value === 'string' ? value.trim() : ''
    if (!name || name.length > 200) this.bad('PAYRUN-NAME-REQUIRED', 'اسم المسير مطلوب بحد أقصى 200 حرف')
    return name
  }

  private async runNameTaken(em: EntityManager, name: string, period: string, runId: number | null) {
    const same = await em.getRepository(PayrollRun).findOne({ where: { period, name, status: Not('CANCELLED') }, select: { id: true } })
    return !!same && same.id !== runId
  }

  private async assertRunNameAvailable(em: EntityManager, name: string, period: string, runId: number | null) {
    if (await this.runNameTaken(em, name.trim(), period, runId)) {
      throw new ConflictException({ code: 'PAYRUN-NAME-DUPLICATE', message: `اسم المسير «${name.trim()}» مستخدم لمسير آخر غير ملغى في شهر ${period}؛ اختر اسمًا مختلفًا` })
    }
  }

  private async saveRunRow(em: EntityManager, run: PayrollRun) {
    try { return await em.getRepository(PayrollRun).save(run) }
    catch (error) {
      if (!this.isUniqueViolation(error)) throw error
      throw new ConflictException({ code: 'PAYRUN-NAME-DUPLICATE', message: `اسم المسير «${run.name}» مستخدم لمسير آخر غير ملغى في شهر ${run.period}؛ اختر اسمًا مختلفًا` })
    }
  }

  // نطاق بلا أي موظف في آخر يوم من الفترة يُرفض إلا بتأكيد صريح وسبب محفوظ على التعريف.
  private assertNonEmptyScope(candidateCount: number, definition: PayrollRunDefinition, dto: { confirmEmptyScope?: boolean; emptyScopeReason?: string | null } = {}) {
    if (candidateCount > 0 || definition.emptyScope) return
    if (dto.confirmEmptyScope === true && typeof dto.emptyScopeReason === 'string' && dto.emptyScopeReason.trim().length >= 3) return
    this.bad('PAYRUN-SCOPE-EMPTY', 'نطاق المسير لا يضم أي موظف في آخر يوم من الفترة؛ راجع الفلاتر، أو أكّد النطاق الفارغ صراحةً مع كتابة السبب')
  }

  private async orgNameMaps(em: EntityManager) {
    return {
      branches: new Map((await em.getRepository(Branch).find({ select: ['id', 'name'] })).map(row => [row.id, row.name])),
      departments: new Map((await em.getRepository(Department).find({ select: ['id', 'name'] })).map(row => [row.id, row.name])),
      teams: new Map((await em.getRepository(Team).find({ select: ['id', 'name'] })).map(row => [row.id, row.name])),
      costCenters: new Map((await em.getRepository(CostCenter).find({ select: ['id', 'name'] })).map(row => [row.id, row.name])),
    }
  }

  private snapshotOrg(row: PayrollMembershipRow, names: Awaited<ReturnType<PayrollService['orgNameMaps']>>) {
    const name = (map: Map<number, string>, id: number | null) => id === null ? null : map.get(id) ?? null
    const org = row.org
    return {
      branchId: org.branchId, branchName: name(names.branches, org.branchId),
      departmentId: org.departmentId, departmentName: name(names.departments, org.departmentId),
      teamId: org.teamId, teamName: name(names.teams, org.teamId),
      costCenterId: org.costCenterId, costCenterName: name(names.costCenters, org.costCenterId),
      orgDate: org.date,
      ...(org.issues.length ? { orgIssues: org.issues } : {}),
      ...(row.manualReason ? { manualReason: row.manualReason } : {}),
      ...(row.transferredOut ? { transferredOut: { ...row.transferredOut, branchName: name(names.branches, row.transferredOut.branchId),
        departmentName: name(names.departments, row.transferredOut.departmentId), teamName: name(names.teams, row.transferredOut.teamId) } } : {}),
      ...(row.alreadyInRun ? { alreadyInRun: { otherRunId: row.alreadyInRun.otherRunId, name: row.alreadyInRun.name, status: row.alreadyInRun.status,
        startDate: row.alreadyInRun.startDate, endDate: row.alreadyInRun.endDate, overlapDays: row.alreadyInRun.overlapDays, kind: row.alreadyInRun.kind } } : {}),
    }
  }

  // رقم مسير آخر لا يُكشف لمستخدم فرع لا يملك قراءته.
  private async runVisibility(user: JwtPayload, em: EntityManager) {
    const cache = new Map<number, boolean>()
    return async (runId: number | null | undefined) => {
      if (runId == null) return false
      if (branchScopeOf(user) === null) return true
      if (!cache.has(runId)) {
        const other = await em.getRepository(PayrollRun).findOneBy({ id: runId })
        try { if (!other) throw new ForbiddenException(); await this.assertRunAccess(user, other, em); cache.set(runId, true) }
        catch (error) { if (!(error instanceof ForbiddenException)) throw error; cache.set(runId, false) }
      }
      return cache.get(runId)!
    }
  }

  private async visibleMembers(user: JwtPayload, members: PayrollRunMember[], em: EntityManager) {
    if (branchScopeOf(user) === null) return members
    const visible = await this.runVisibility(user, em)
    const result: PayrollRunMember[] = []
    for (const member of members) {
      const other = member.snapshot?.alreadyInRun
      result.push(other && !(await visible(other.otherRunId))
        ? { ...member, snapshot: { ...member.snapshot!, alreadyInRun: { ...other, otherRunId: null, name: 'مسير خارج نطاق صلاحيتك' } } }
        : member)
    }
    return result
  }

  private async runPolicyView(em: EntityManager, run: PayrollRun) {
    if (!run.policyVersionId) return null
    const version = await em.getRepository(PayrollPolicyVersion).findOneBy({ id: run.policyVersionId })
    const policy = version ? await em.getRepository(PayrollPolicy).findOneBy({ id: version.policyId }) : null
    return version && policy ? { policyId: policy.id, code: policy.code, name: policy.name, versionId: version.id, versionNo: version.versionNo,
      status: version.status, cycleStartDay: version.cycleStartDay, defaultPeriodType: version.defaultPeriodType } : null
  }

  // الفترة من دورة نسخة سياسة منشورة يغطي سريانها الفترة كاملة.
  private async runPolicyPeriod(em: EntityManager, user: JwtPayload, policyVersionId: unknown, period: unknown) {
    if (!Number.isSafeInteger(policyVersionId) || Number(policyVersionId) < 1) this.bad('PAYRUN-POLICY-REQUIRED', 'اختر نسخة سياسة رواتب منشورة للمسير')
    if (typeof period !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) this.bad('PAYRUN-PERIOD-INVALID', 'شهر المسير بصيغة YYYY-MM')
    const version = await em.getRepository(PayrollPolicyVersion).findOneBy({ id: Number(policyVersionId) })
    const policy = version ? await em.getRepository(PayrollPolicy).findOneBy({ id: version.policyId }) : null
    if (!version || !policy) throw new NotFoundException({ code: 'PAYRUN-POLICY-NOT-FOUND', message: 'نسخة سياسة الرواتب المختارة غير موجودة' })
    const scope = branchScopeOf(user)
    if (scope !== null && (scope < 1 || (policy.branchId !== null && policy.branchId !== scope))) throw new ForbiddenException('سياسة الرواتب خارج نطاق الفرع المسموح لك')
    if (!policy.isActive || version.status !== 'ACTIVE' || !version.publishedAt) {
      this.bad('PAYRUN-POLICY-NOT-PUBLISHED', `نسخة السياسة «${policy.name}» رقم ${version.versionNo} غير منشورة؛ المسير يرتبط بنسخة منشورة فقط`)
    }
    if (version.cycleStartDay == null || !version.defaultPeriodType || !version.cycleEndMode) this.bad('PAYRUN-POLICY-CYCLE-MISSING', 'دورة نسخة السياسة غير مكتملة')
    let bounds: { startDate: string; endDate: string }
    try {
      bounds = payrollPolicyPeriodBounds(period, { defaultPeriodType: version.defaultPeriodType, cycleStartDay: Number(version.cycleStartDay),
        cycleEndMode: version.cycleEndMode, cycleEndDay: version.cycleEndDay == null ? null : Number(version.cycleEndDay) })
    } catch (error) {
      if (error instanceof PayrollPeriodError) this.bad('PAYRUN-POLICY-CYCLE-INVALID', error.message)
      throw error
    }
    const versions = await em.getRepository(PayrollPolicyVersion).find({ select: { id: true, policyId: true, status: true, effectiveFrom: true, effectiveTo: true }, where: { policyId: policy.id } })
    const effectiveUntil = payrollPolicyEffectiveEnds(versions).get(version.id)?.effectiveUntil ?? null
    if (version.effectiveFrom > bounds.startDate || (effectiveUntil !== null && effectiveUntil < bounds.endDate)) {
      this.bad('PAYRUN-POLICY-PERIOD', `فترة ${period} (${bounds.startDate} → ${bounds.endDate}) خارج سريان نسخة السياسة «${policy.name}» رقم ${version.versionNo} (${version.effectiveFrom} → ${effectiveUntil ?? 'مفتوح'})`)
    }
    return { policy, version, period, startDate: bounds.startDate, endDate: bounds.endDate, effectiveUntil }
  }

  // سياسة مملوكة لفرع لا تُستخدم للشركة كلها ولا لفرع آخر (مثل رفض وحدة السياسات لنطاق مقترح خارج فرعها):
  // التعريف يُحصر بفلتر فرع واحد هو فرع السياسة، فكل عضو داخله بمكانه آخر يوم في الفترة.
  private async assertPolicyBranchScope(em: EntityManager, policy: PayrollPolicy, definition: PayrollRunDefinition) {
    if (policy.branchId === null) return
    const { filters } = definition
    if (!filters.allEmployees && filters.branchIds.length === 1 && filters.branchIds[0] === policy.branchId) return
    const branch = await em.getRepository(Branch).findOne({ select: { id: true, name: true }, where: { id: policy.branchId } })
    this.bad('PAYRUN-POLICY-BRANCH', `سياسة «${policy.name}» مملوكة لفرع «${branch?.name ?? policy.branchId}»؛ المسير المرتبط بها يُحصر بهذا الفرع وحده — اختره في فلتر الفروع، ولا تستخدمها للشركة كلها أو لفرع آخر`,
      { policyBranchId: policy.branchId })
  }

  // تحت قفل الحساب: المسودة تُعاد مراجعة نسختها (منشورة، سارية على الفترة كاملة، بنفس تواريخ الدورة)؛
  // وإعادة حساب المسير المحسوب تقرأ نسخته كما حُفظت (لقطة السياسة للخطوة 19) مع إبقاء حصر فرع السياسة.
  private async assertRunPolicyAtCalculation(em: EntityManager, user: JwtPayload, run: PayrollRun, isDraft: boolean) {
    const definition = payrollRunDefinitionOf(run)
    if (isDraft) {
      const context = await this.runPolicyPeriod(em, user, run.policyVersionId, run.period)
      if (context.startDate !== run.startDate || context.endDate !== run.endDate) {
        this.bad('PAYRUN-POLICY-PERIOD-CHANGED', `تواريخ دورة نسخة السياسة لشهر ${run.period} (${context.startDate} → ${context.endDate}) لا تطابق تواريخ المسودة (${run.startDate} → ${run.endDate})؛ عدّل المسودة قبل احتسابها`)
      }
      await this.assertPolicyBranchScope(em, context.policy, definition)
      return
    }
    const version = await em.getRepository(PayrollPolicyVersion).findOneBy({ id: Number(run.policyVersionId) })
    const policy = version ? await em.getRepository(PayrollPolicy).findOneBy({ id: version.policyId }) : null
    if (!version || !policy) throw new NotFoundException({ code: 'PAYRUN-POLICY-NOT-FOUND', message: 'نسخة سياسة الرواتب المرتبطة بالمسير غير موجودة' })
    const scope = branchScopeOf(user)
    if (scope !== null && (scope < 1 || (policy.branchId !== null && policy.branchId !== scope))) throw new ForbiddenException('سياسة الرواتب خارج نطاق الفرع المسموح لك')
    await this.assertPolicyBranchScope(em, policy, definition)
  }

  // نقطتا الحساب القديمتان مغلقتان على قاعدة الشركة؛ المسير الجديد مسودة من «مسير جديد» ثم احتساب منفصل عن إعادة الحساب.
  assertLegacyCalculateEndpoint() {
    const database = (this.runs.manager.connection.options as { database?: unknown }).database
    if (payrollLegacyCalculateAllowed(database)) return
    throw new GoneException({ code: 'PAYRUN-LEGACY-ENDPOINT',
      message: 'نقطة الحساب القديمة مغلقة: أنشئ «مسير جديد» كمسودة (POST /payroll/runs) باسم ونسخة سياسة منشورة، ثم «احتساب المسودة» (POST /payroll/runs/:id/calculate) أو «إعادة حساب المسير» بسبب (POST /payroll/runs/:id/recalculate)' })
  }

  // التحقق من الفلاتر المترابطة والقائمة والاستبعادات ضد القاعدة؛ الرقم غير الموجود يُرفض برقمه ولا يسقط صامتًا.
  private async normalizeRunDefinition(em: EntityManager, user: JwtPayload, input: PayrollRunDefinitionInput, previous: PayrollRunDefinition | null): Promise<PayrollRunDefinition> {
    const raw = input.filters ?? {}
    const list = (value: unknown, label: string) => {
      if (value === undefined || value === null) return []
      if (!Array.isArray(value) || value.length > 1000 || value.some(id => !Number.isSafeInteger(id) || id < 1 || id > 2_147_483_647)) {
        this.bad('PAYRUN-FILTER-INVALID', `${label}: أرقام صحيحة موجبة بحد أقصى 1000`)
      }
      return [...new Set(value as number[])].sort((a, b) => a - b)
    }
    const filters: PayrollRunFilters = foldPayrollRunInclusions({ branchIds: list(raw.branchIds, 'الفروع'), departmentIds: list(raw.departmentIds, 'الأقسام'),
      teamIds: list(raw.teamIds, 'الفرق'), costCenterIds: [], employeeIds: list(raw.employeeIds, 'قائمة الموظفين'), allEmployees: raw.allEmployees === true,
      includeSubDepartments: true, includeEmployeeIds: list(raw.includeEmployeeIds, 'المضافون للمسير') })
    if (filters.allEmployees && (payrollRunHasOrgFilters(filters) || filters.employeeIds.length)) this.bad('PAYRUN-FILTER-INVALID', 'اختر «الشركة كلها» أو فلاتر محددة، لا الاثنين معًا')
    const scope = branchScopeOf(user)
    if (scope !== null) {
      if (scope < 1 || filters.allEmployees || filters.branchIds.some(id => id !== scope)) throw new ForbiddenException('نطاق المسير خارج الفرع المسموح لك')
      filters.branchIds = [scope]
    }
    if (!filters.allEmployees && !filters.employeeIds.length && !payrollRunHasOrgFilters(filters)) {
      this.bad('PAYRUN-SCOPE-REQUIRED', 'حدد نطاق المسير: فرعًا أو قسمًا أو فريقًا أو قائمة موظفين')
    }
    // مستخدم الفرع لا يعرف وجود معرّفات فرع آخر: القسم أو الفريق أو الموظف خارج فرعه يُرد بالرد نفسه لغير الموجود.
    // الموظف «ضمن الفرع» لو ملفه الحالي فيه أو له نسخة فرع مؤرخة (EMPLOYEE_ORG) فيه، فمن انتقل خلال الفترة لا يسقط.
    const knownIds = async (kind: 'branch' | 'department' | 'team' | 'employee', chunk: number[]): Promise<number[]> => {
      const list = chunk.map((_, index) => `@${index}`).join(', ')
      const scoped = scope !== null && kind !== 'branch'
      const own = `@${chunk.length}`
      const snapshot = `CAST(v.[snapshot] AS nvarchar(max))`
      const query = kind === 'branch' ? `SELECT [id] FROM [branches] WHERE [id] IN (${list})`
        : kind === 'department' ? `SELECT [id] FROM [departments] WHERE [id] IN (${list})${scoped ? ` AND [branchId] = ${own}` : ''}`
          : kind === 'team' ? `SELECT t.[id] FROM [teams] t LEFT JOIN [departments] d ON d.[id] = t.[departmentId] WHERE t.[id] IN (${list})${scoped ? ` AND d.[branchId] = ${own}` : ''}`
            : `SELECT e.[id] FROM [employees] e WHERE e.[id] IN (${list})${scoped ? ` AND (e.[branchId] = ${own} OR EXISTS (SELECT 1 FROM [attendance_rule_versions] v
                WHERE v.[sourceType] = 'EMPLOYEE_ORG' AND v.[sourceId] = e.[id] AND ISJSON(${snapshot}) = 1
                  AND TRY_CONVERT(int, COALESCE(JSON_VALUE(${snapshot}, '$.data.branchId'), JSON_VALUE(${snapshot}, '$.branchId'))) = ${own}))` : ''}`
      const rows: Array<{ id: number }> = await em.query(query, scoped ? [...chunk, scope] : chunk)
      return rows.map(row => Number(row.id))
    }
    const absent = async (kind: 'branch' | 'department' | 'team' | 'employee', ids: number[], label: string, key: string) => {
      if (!ids.length) return
      const found = new Set<number>()
      for (let offset = 0; offset < ids.length; offset += 500) for (const id of await knownIds(kind, ids.slice(offset, offset + 500))) found.add(id)
      const missing = ids.filter(id => !found.has(id))
      if (missing.length) this.bad('PAYRUN-SCOPE-UNKNOWN-IDS', `${label} غير موجود${scope !== null ? ' أو خارج فرعك' : ''}: ${missing.join('، ')}`, { [key]: missing })
    }
    await absent('branch', filters.branchIds, 'رقم الفرع', 'branchIds')
    await absent('department', filters.departmentIds, 'رقم القسم', 'departmentIds')
    await absent('team', filters.teamIds, 'رقم الفريق', 'teamIds')
    await absent('employee', filters.employeeIds, 'رقم الموظف', 'employeeIds')
    await absent('employee', filters.includeEmployeeIds, 'رقم الموظف المضاف للمسير', 'includeEmployeeIds')
    if (filters.departmentIds.length || filters.teamIds.length) {
      const departments = await em.getRepository(Department).find({ select: { id: true, branchId: true, parentId: true, name: true } })
      const byId = new Map(departments.map(row => [row.id, row]))
      const selected = new Set(filters.departmentIds)
      for (let grew = true; grew;) {
        grew = false
        for (const row of departments) if (row.parentId != null && selected.has(row.parentId) && !selected.has(row.id)) { selected.add(row.id); grew = true }
      }
      const offDepartments = filters.branchIds.length ? filters.departmentIds.filter(id => !filters.branchIds.includes(byId.get(id)!.branchId)) : []
      if (offDepartments.length) this.bad('PAYRUN-FILTER-UNLINKED', `القسم ${offDepartments.map(id => `«${byId.get(id)?.name}» (#${id})`).join('، ')} لا يتبع الفروع المختارة`, { departmentIds: offDepartments })
      if (filters.teamIds.length) {
        const teams = await em.getRepository(Team).find({ select: { id: true, departmentId: true, name: true }, where: { id: In(filters.teamIds) } })
        const offTeams = teams.filter(team => (filters.departmentIds.length && !selected.has(team.departmentId)) ||
          (filters.branchIds.length && !filters.branchIds.includes(byId.get(team.departmentId)?.branchId ?? -1)))
        if (offTeams.length) this.bad('PAYRUN-FILTER-UNLINKED', `الفريق ${offTeams.map(team => `«${team.name}» (#${team.id})`).join('، ')} لا يتبع الفروع أو الأقسام المختارة`, { teamIds: offTeams.map(team => team.id) })
      }
    }
    const exclusions: PayrollRunExclusion[] = []
    for (const row of input.exclusions ?? []) {
      const employeeId = Number(row?.employeeId)
      const reason = typeof row?.reason === 'string' ? row.reason.trim() : ''
      if (!Number.isSafeInteger(employeeId) || employeeId < 1) this.bad('PAYRUN-EXCLUSION-INVALID', 'رقم الموظف المستبعد غير صالح')
      if (exclusions.some(item => item.employeeId === employeeId)) this.bad('PAYRUN-EXCLUSION-DUPLICATE', `الموظف رقم ${employeeId} مستبعد أكثر من مرة`)
      if (reason.length < 3 || reason.length > 500) this.bad('PAYRUN-EXCLUSION-REASON', `اكتب سبب استبعاد الموظف رقم ${employeeId} (من 3 إلى 500 حرف)`, { employeeId })
      // مسير القائمة وحدها يُحذف منه الاسم لا يُستبعد؛ مسير الفلاتر (ومعه المضافون يدويًا) يقبل الاستبعاد بسببه
      if (filters.employeeIds.length && !payrollRunHasOrgFilters(filters) && !filters.employeeIds.includes(employeeId)) {
        this.bad('PAYRUN-EXCLUSION-NOT-LISTED', `الموظف رقم ${employeeId} ليس في قائمة المسير؛ احذفه من القائمة بدل استبعاده`, { employeeId })
      }
      const prior = previous?.exclusions.find(item => item.employeeId === employeeId && item.reason === reason)
      exclusions.push({ employeeId, reason, byUserId: prior?.byUserId ?? user.sub, at: prior?.at ?? new Date().toISOString() })
    }
    await absent('employee', exclusions.map(row => row.employeeId), 'رقم الموظف المستبعد', 'employeeIds')
    let emptyScope: PayrollRunDefinition['emptyScope'] = null
    if (input.confirmEmptyScope === true) {
      const reason = typeof input.emptyScopeReason === 'string' ? input.emptyScopeReason.trim() : ''
      if (reason.length < 3 || reason.length > 500) this.bad('PAYRUN-SCOPE-EMPTY-REASON', 'تأكيد النطاق الفارغ يتطلب سببًا مكتوبًا (من 3 إلى 500 حرف)')
      emptyScope = previous?.emptyScope?.reason === reason ? previous.emptyScope : { reason, byUserId: user.sub, at: new Date().toISOString() }
    }
    return { version: 1, source: 'DEFINITION', mode: payrollRunSelectionMode(filters), filters,
      exclusions: exclusions.sort((a, b) => a.employeeId - b.employeeId), emptyScope }
  }

  private async membershipPreview(em: EntityManager, user: JwtPayload, run: { id: number | null; name: string | null; period: string; startDate: string; endDate: string },
    definition: PayrollRunDefinition, previousMembers: PayrollRunMember[], policy: Awaited<ReturnType<PayrollService['runPolicyView']>>) {
    const monthlyDays = Number(await this.cfg('payroll.monthly_days', '30'))
    if (!Number.isFinite(monthlyDays) || monthlyDays <= 0) throw new BadRequestException('أساس أيام الشهر يجب أن يكون أكبر من صفر')
    const salaryEvidenceMode = parsePayrollSalaryEvidenceMode(await this.cfg(PAYROLL_SALARY_EVIDENCE_MODE_KEY, 'MONTHLY_HISTORY'))
    const resolution = await resolvePayrollRunMembership(em, { run, definition, salaryEvidenceMode, today: localDateOf(new Date()), previousMembers })
    this.assertScopeAccess(user, definition, resolution.rows.map(row => row.org.branchId))
    const names = await this.orgNameMaps(em)
    const visible = await this.runVisibility(user, em)
    const conflictView = async (conflict: { otherRunId: number; name: string | null; status: string; startDate: string; endDate: string; overlapDays: number; kind: string; blocking: boolean }) => {
      const shown = await visible(conflict.otherRunId)
      return { otherRunId: shown ? conflict.otherRunId : null, name: shown ? conflict.name : 'مسير خارج نطاق صلاحيتك', status: conflict.status,
        startDate: conflict.startDate, endDate: conflict.endDate, overlapDays: conflict.overlapDays, kind: conflict.kind, blocking: conflict.blocking }
    }
    const dayBasis = monthlyDays === 30 ? 'FIXED_30' : `FIXED_${monthlyDays}`
    // قرار المالك: الشهر 30 يومًا — المعاينة تقسم على نفس أساس الحساب، فما يُعرض هو ما يُحسب.
    const included = [], excluded = []
    let monthlyCents = 0, earnedCents = 0
    for (const row of resolution.rows) {
      const org = this.snapshotOrg(row, names)
      const common = { employeeId: row.employee.id, employeeCode: row.employee.employeeCode, fullName: row.employee.fullName, jobTitle: row.employee.jobTitle ?? null,
        branchId: org.branchId, branchName: org.branchName, departmentId: org.departmentId, departmentName: org.departmentName, teamId: org.teamId, teamName: org.teamName,
        orgDate: org.orgDate, orgIssues: row.org.issues, inclusionSource: row.inclusionSource,
        // قرار المالك (20 سبتمبر): حالة الإيقاف وصرف راتب آخر شهر مع التصفية يبانوا على صف الموظف في المعاينة زي جدول المسير.
        suspensionNote: row.suspensionNote, settlementPayout: row.settlement }
      if (row.status === 'INCLUDED' && row.coverage && row.salary?.ok) {
        const coverage = row.coverage
        const grossCents = row.salary.monthlyComponents.reduce((sum, amount) => sum + Math.round(amount * 100), 0)
        const fullCoverage = coverage.coverFrom === run.startDate && coverage.coverTo === run.endDate
        const earned = fullCoverage ? grossCents : Math.min(grossCents, Math.trunc(grossCents * coverage.coverDays / monthlyDays))
        monthlyCents += grossCents; earnedCents += earned
        included.push({ ...common, hireDate: coverage.hireDate, leaveDate: coverage.leaveDate, coverFrom: coverage.coverFrom, coverTo: coverage.coverTo,
          coverDays: coverage.coverDays, partial: !fullCoverage, prorataFactor: fullCoverage ? 1 : Math.round(Math.min(coverage.coverDays / monthlyDays, 1) * 1e6) / 1e6,
          monthlyDays, dayBasis, monthlyGross: grossCents / 100, earnedGross: earned / 100,
          salarySource: { kind: row.salary.source.kind, referencePeriod: row.salary.source.referencePeriod, effectivePayrollPeriod: row.salary.source.effectivePayrollPeriod,
            currency: row.salary.source.currency, warning: row.salary.source.warning },
          draftConflicts: await Promise.all(row.draftConflicts.map(conflictView)) })
      } else {
        excluded.push({ ...common, code: row.code, label: PAYROLL_EXCLUSION_LABELS[row.code ?? ''] ?? row.code, message: row.message,
          manualReason: row.manualReason, dataProblem: row.dataProblem, coverDays: row.coverage?.coverDays ?? null,
          otherRun: row.alreadyInRun ? await conflictView(row.alreadyInRun) : null,
          transferredOut: 'transferredOut' in org ? org.transferredOut : null })
      }
    }
    const draftConflictEmployees = new Set(resolution.draftConflicts.map(row => row.employeeId))
    const totals = { candidates: resolution.candidateCount, included: included.length, excluded: excluded.length,
      partial: included.filter(row => row.partial).length, dataProblems: excluded.filter(row => row.dataProblem).length,
      alreadyInRun: excluded.filter(row => row.code === 'EXC_ALREADY_IN_RUN').length, transferredOut: excluded.filter(row => row.code === 'TRANSFERRED_OUT').length,
      manualExclusions: excluded.filter(row => row.code === 'EXC_MANUAL_EXCLUSION').length, draftConflictEmployees: draftConflictEmployees.size,
      // قرار المالك: صفوف «تصفية — مصروف مع التصفية» داخلة في تكلفة الشهر وبرّه المبلغ المستحق للصرف.
      settlementPayout: included.filter(row => row.settlementPayout).length,
      suspended: included.filter(row => row.suspensionNote).length,
      monthlyGross: monthlyCents / 100, earnedGross: earnedCents / 100 }
    const previewHash = createHash('sha256').update(JSON.stringify({ run: [run.id, run.period, run.startDate, run.endDate], filters: definition.filters,
      exclusions: definition.exclusions.map(row => [row.employeeId, row.reason]),
      included: included.map(row => [row.employeeId, row.coverFrom, row.coverTo, row.monthlyGross, row.earnedGross]),
      excluded: excluded.map(row => [row.employeeId, row.code, row.otherRun?.otherRunId ?? null]) })).digest('hex')
    return { readOnly: true, previewHash, run: { ...run, policy }, basis: { monthlyDays, dayBasis },
      selection: { mode: definition.mode, source: definition.source, filters: definition.filters, exclusions: definition.exclusions, emptyScope: definition.emptyScope },
      emptyScopeRequiresConfirmation: resolution.candidateCount === 0 && !definition.emptyScope,
      totals, included, excluded, unusedExclusions: resolution.unusedExclusions }
  }

  private policyViewOf(context: Awaited<ReturnType<PayrollService['runPolicyPeriod']>>) {
    return { policyId: context.policy.id, code: context.policy.code, name: context.policy.name, versionId: context.version.id, versionNo: context.version.versionNo,
      status: context.version.status, cycleStartDay: context.version.cycleStartDay, defaultPeriodType: context.version.defaultPeriodType }
  }

  // معاينة تعريف لم يُحفظ (أو تعديل مسودة قائمة عبر runId) — قراءة فقط.
  async previewRunDefinition(user: JwtPayload, dto: PayrollRunDefinitionInput & { runId?: number }) {
    // قراءة سجل الأجر تتطلب معاملة (قراءة متسقة)؛ لا كتابة داخلها.
    return this.runs.manager.transaction(em => this.previewRunDefinitionIn(em, user, dto))
  }

  private async previewRunDefinitionIn(em: EntityManager, user: JwtPayload, dto: PayrollRunDefinitionInput & { runId?: number }) {
    let previous: PayrollRun | null = null
    if (dto.runId) {
      previous = await em.getRepository(PayrollRun).findOneBy({ id: dto.runId })
      if (!previous) throw new NotFoundException('المسير غير موجود')
      await this.assertRunAccess(user, previous, em)
    }
    const context = await this.runPolicyPeriod(em, user, dto.policyVersionId, dto.period)
    const definition = await this.normalizeRunDefinition(em, user, dto, previous ? payrollRunDefinitionOf(previous) : null)
    await this.assertPolicyBranchScope(em, context.policy, definition)
    const name = typeof dto.name === 'string' && dto.name.trim() ? dto.name.trim() : null
    const preview = await this.membershipPreview(em, user, { id: previous?.id ?? null, name, period: context.period, startDate: context.startDate, endDate: context.endDate },
      definition, [], this.policyViewOf(context))
    return { ...preview, nameTaken: name ? await this.runNameTaken(em, name, context.period, previous?.id ?? null) : false }
  }

  // معاينة التعريف المحفوظ: للمسودة ما سيدخل عند الحساب، وللمحسوب ما ستنتجه إعادة الحساب الآن — قراءة فقط.
  async previewStoredRun(user: JwtPayload, runId: number) {
    return this.readRun(runId, async (em, run) => {
      await this.assertRunAccess(user, run, em)
      if (!['DRAFT', 'CALCULATED'].includes(run.status)) throw this.stateError('معاينة العضوية', run.status)
      const previousMembers = await em.getRepository(PayrollRunMember).find({ where: { runId }, order: { employeeId: 'ASC' } })
      return this.membershipPreview(em, user, { id: run.id, name: run.name, period: run.period, startDate: run.startDate, endDate: run.endDate },
        payrollRunDefinitionOf(run), previousMembers, await this.runPolicyView(em, run))
    })
  }

  // «مسير جديد»: مسودة باسم ونسخة سياسة وفترة من دورتها وفلاتر واستبعادات؛ لا عضوية ولا مبالغ قبل «احتساب المسودة».
  // C8 / الخطوة 31: correction = مسير تكميلي مربوط بمسير مصروف (من payroll-corrections.service بعد فحص الأهلية)
  async createRunDraft(user: JwtPayload, dto: PayrollRunDefinitionInput,
    correction?: { runType: 'SUPPLEMENTARY'; parentRunId: number; correctionReason: string; startDate: string; endDate: string; employeeIds: number[] }) {
    return this.detail(user, await this.saveRunDraft(user, dto, correction))
  }

  // حفظ المسودة نفسه (تحقق الاسم والسياسة وفترتها والتعريف ونطاق الفرع والنطاق الفارغ ثم الحفظ وحدثه) — «مسير جديد» و«إنشاء مسيرات الشهر الجديد» بنفس المسار
  private async saveRunDraft(user: JwtPayload, dto: PayrollRunDefinitionInput,
    correction?: { runType: 'SUPPLEMENTARY'; parentRunId: number; correctionReason: string; startDate: string; endDate: string; employeeIds: number[] },
    copiedFromRunId?: number): Promise<number> {
    return this.runs.manager.transaction(async em => {
      await this.calculationLock(em)
      const name = this.runName(dto.name)
      const context = await this.runPolicyPeriod(em, user, dto.policyVersionId, dto.period)
      if (correction) {
        const parent = await em.getRepository(PayrollRun).findOneBy({ id: correction.parentRunId })
        if (!parent || parent.status !== 'PAID' || payrollRunTypeOf(parent) === 'REVERSAL') {
          throw new ConflictException({ code: 'PAYRUN-SUPPLEMENTARY-PARENT', message: 'المسير الأصلي للمسير التكميلي غير موجود أو لم يعد مصروفًا' })
        }
        if (context.startDate !== correction.startDate || context.endDate !== correction.endDate) {
          throw new ConflictException({ code: 'PAYRUN-SUPPLEMENTARY-PERIOD', message: 'فترة نسخة السياسة لهذا الشهر لا تطابق فترة المسير الأصلي؛ لا يُنشأ مسير تكميلي بفترة مختلفة' })
        }
      }
      const definition = await this.normalizeRunDefinition(em, user, dto, null)
      await this.assertPolicyBranchScope(em, context.policy, definition)
      await this.assertRunNameAvailable(em, name, context.period, null)
      const preview = await this.membershipPreview(em, user, { id: null, name, period: context.period, startDate: context.startDate, endDate: context.endDate },
        definition, [], this.policyViewOf(context))
      this.assertNonEmptyScope(preview.totals.candidates, definition)
      const saved = await this.saveRunRow(em, em.getRepository(PayrollRun).create({ name, ...payrollRunDefinitionColumns(definition),
        policyId: context.policy.id, policyVersionId: context.version.id, period: context.period, startDate: context.startDate, endDate: context.endDate,
        status: 'DRAFT', totalNet: 0, snapshotVersion: 0,
        ...(correction ? { runType: 'SUPPLEMENTARY' as const, parentRunId: correction.parentRunId, correctionReason: correction.correctionReason } : {}) }))
      await this.event(em, user, saved.id, 'DRAFT_CREATED', correction ? correction.correctionReason.slice(0, 500) : null, { name, definition, policy: this.policyViewOf(context),
        period: { period: context.period, startDate: context.startDate, endDate: context.endDate }, previewTotals: preview.totals, previewHash: preview.previewHash,
        ...(correction ? { runType: 'SUPPLEMENTARY', parentRunId: correction.parentRunId } : {}), ...(copiedFromRunId ? { copiedFromRunId } : {}) })
      if (correction) {
        // C3 × C8: إعفاء خصومات الحضور المطبق على البنود المعكوسة يُنقل للتكميلي بقراره الأصلي (لا يُعاد منحه ولا يُحتسب في الحدود)
        const carriedExemptions = await carryReversedRunExemptions(em, { parentRun: { id: correction.parentRunId, period: context.period }, supplementaryRun: saved,
          employeeIds: correction.employeeIds, actorUserId: user.sub })
        await this.event(em, user, correction.parentRunId, 'SUPPLEMENTARY_CREATED', correction.correctionReason.slice(0, 500),
          { supplementaryRunId: saved.id, employeeIds: correction.employeeIds, name, carriedExemptions })
      }
      return saved.id
    })
  }

  // «إنشاء مسيرات الشهر الجديد» (طلب المالك 19 سبتمبر): لكل مسير عادي غير ملغى في شهر المصدر مسودة للشهر التالي بنفس الاسم والمعادلة
  // (أحدث نسخة منشورة سارية على الشهر الجديد) والفلاتر والقائمة والاستبعادات بأسبابها — بنفس حفظ «مسير جديد» وتحققه، مسير مسير.
  // الموجود بنفس الاسم في الشهر الجديد يتخطى، والمرفوض يرجع بسببه. حساب الفرع يشوف ويعمل مسيرات فرعه بس.
  // شهر المصدر الافتراضي = آخر شهر فيه مسير اتحسب (مش مسودة بس) ومش بعد الشهر الجاي (مسير شهر بعيد محفوظ من تجربة ما يبقاش مصدر)؛
  // فالضغط مرتين ما يعملش شهرين، والمسودات الجديدة ما تبقاش مصدر لحد ما تتحسب. لو كله مسودات = أقدم شهر. أي شهر تاني بالاختيار.
  async createNextPeriodRuns(user: JwtPayload, dto: { dryRun?: boolean; sourcePeriod?: string }) {
    if (!userHasPerm(user, 'payroll.calculate')) throw new ForbiddenException('ليست لديك صلاحية إنشاء المسيرات')
    const visible = (await this.list(user)).filter(run => run.status !== 'CANCELLED' && payrollRunTypeOf(run) === 'REGULAR')
    const periods = [...new Set(visible.map(run => run.period))].sort().reverse()
    if (!periods.length) this.bad('PAYRUN-NEXT-NO-SOURCE', 'مفيش مسيرات سابقة تتنسخ — اعمل أول مسير من «مسير جديد»')
    let sourcePeriod: string
    if (dto.sourcePeriod !== undefined && dto.sourcePeriod !== null && dto.sourcePeriod !== '') {
      if (!periods.includes(dto.sourcePeriod)) this.bad('PAYRUN-NEXT-SOURCE-EMPTY', `مفيش مسيرات في شهر ${dto.sourcePeriod} تتنسخ`)
      sourcePeriod = dto.sourcePeriod
    } else {
      const processed = (period: string) => visible.some(run => run.period === period && run.status !== 'DRAFT')
      const latestAllowed = shiftPayrollPeriod(localDateOf(new Date()).slice(0, 7), 1)
      sourcePeriod = periods.find(period => period <= latestAllowed && processed(period)) ?? periods.find(processed) ?? periods[periods.length - 1]
    }
    const targetPeriod = shiftPayrollPeriod(sourcePeriod, 1)
    const sources = visible.filter(run => run.period === sourcePeriod).sort((a, b) => a.id - b.id)
    // الأسماء المحجوزة في الشهر الجديد (كل الفروع — القيد الفريد على الاسم في الشهر للشركة كلها)
    const taken = new Map((await this.runs.find({ where: { period: targetPeriod, status: Not('CANCELLED') }, select: { id: true, name: true } }))
      .filter(run => run.name).map(run => [run.name!.trim(), run.id]))
    const created: Array<{ sourceRunId: number; name: string; runId: number | null; policyName: string; versionNo: number }> = []
    const skipped: Array<{ sourceRunId: number; name: string | null; code: string; reason: string; existingRunId?: number | null }> = []
    for (const source of sources) {
      const name = source.name?.trim() ?? ''
      if (!name) { skipped.push({ sourceRunId: source.id, name: null, code: 'PAYRUN-NEXT-NO-NAME', reason: 'مسير قديم بلا اسم — اعمله من «مسير جديد»' }); continue }
      if (taken.has(name)) {
        const existingRunId = taken.get(name)!
        skipped.push({ sourceRunId: source.id, name, code: 'PAYRUN-NEXT-EXISTS', reason: `موجود بالفعل في شهر ${targetPeriod}`,
          existingRunId: visible.some(run => run.id === existingRunId) ? existingRunId : null })
        continue
      }
      try {
        const plan = await this.runs.manager.transaction(em => this.nextPeriodDraftInput(em, user, source, targetPeriod))
        if (dto.dryRun) { created.push({ sourceRunId: source.id, name, runId: null, policyName: plan.policyName, versionNo: plan.versionNo }); continue }
        const runId = await this.saveRunDraft(user, plan.input, undefined, source.id)
        taken.set(name, runId)
        created.push({ sourceRunId: source.id, name, runId, policyName: plan.policyName, versionNo: plan.versionNo })
      } catch (error) {
        // تعريف محفوظ تالف في مسير المصدر: يتخطى بسببه بدل ما يوقف باقي المسيرات
        if (error instanceof PayrollRunDefinitionError) { skipped.push({ sourceRunId: source.id, name, code: error.code, reason: error.message }); continue }
        if (!(error instanceof HttpException)) throw error
        const response = error.getResponse()
        const body = typeof response === 'object' && response ? response as { code?: unknown; message?: unknown } : { message: response }
        const message = Array.isArray(body.message) ? body.message.join('، ') : typeof body.message === 'string' ? body.message : 'تعذر إنشاء المسودة'
        skipped.push({ sourceRunId: source.id, name, code: typeof body.code === 'string' ? body.code : 'PAYRUN-NEXT-REFUSED', reason: message })
      }
    }
    return { dryRun: dto.dryRun === true, sourcePeriod, targetPeriod, sourcePeriods: periods.slice(0, 12), created, skipped }
  }

  // تعريف مسودة الشهر الجديد من مسير المصدر: نفس الاسم والفلاتر والقائمة والاستبعادات وتأكيد النطاق الفارغ، وأحدث نسخة منشورة
  // من نفس المعادلة يقبلها الشهر الجديد (سريانها ودورتها) — نفس اختيار «مسير الشهر التالي» في الشاشة.
  private async nextPeriodDraftInput(em: EntityManager, user: JwtPayload, source: PayrollRun, targetPeriod: string) {
    const current = source.policyVersionId ? await em.getRepository(PayrollPolicyVersion).findOneBy({ id: source.policyVersionId }) : null
    const policy = current ? await em.getRepository(PayrollPolicy).findOneBy({ id: current.policyId }) : null
    if (!current || !policy) this.bad('PAYRUN-NEXT-NO-POLICY', 'مسير قديم بلا معادلة رواتب — اعمله من «مسير جديد»')
    const versions = (await em.getRepository(PayrollPolicyVersion).find({ where: { policyId: policy.id } }))
      .filter(version => version.status === 'ACTIVE' && version.publishedAt).sort((a, b) => b.versionNo - a.versionNo)
    let chosen: PayrollPolicyVersion | null = null
    for (const version of versions) {
      try { await this.runPolicyPeriod(em, user, version.id, targetPeriod); chosen = version; break }
      catch (error) { if (!(error instanceof BadRequestException) && !(error instanceof NotFoundException)) throw error }
    }
    if (!chosen) this.bad('PAYRUN-NEXT-NO-POLICY-VERSION', `معادلة الرواتب «${policy.name}» مالهاش نسخة منشورة سارية على شهر ${targetPeriod}`)
    const definition = payrollRunDefinitionOf(source)
    const { filters } = definition
    const input: PayrollRunDefinitionInput = {
      name: source.name, policyVersionId: chosen.id, period: targetPeriod,
      // العضوية دائمة: القائمة والمضافون يدويًا والاستبعادات تُنسخ كما هي، فالموظف يفضل في مسيره كل شهر لحد ما المالك ينقله
      filters: { branchIds: filters.branchIds, departmentIds: filters.departmentIds, teamIds: filters.teamIds, employeeIds: filters.employeeIds,
        allEmployees: filters.allEmployees, includeEmployeeIds: filters.includeEmployeeIds },
      exclusions: definition.exclusions.map(row => ({ employeeId: row.employeeId, reason: row.reason })),
      ...(definition.emptyScope ? { confirmEmptyScope: true, emptyScopeReason: definition.emptyScope.reason } : {}),
    }
    // نفس تحقق التعريف قبل الحفظ (الأرقام الموجودة ونطاق الفرع وترابط الفلاتر) عشان المعاينة تقول المرفوض بسببه
    await this.assertPolicyBranchScope(em, policy, await this.normalizeRunDefinition(em, user, input, null))
    return { input, policyName: policy.name, versionNo: chosen.versionNo }
  }

  async updateRunDraft(user: JwtPayload, runId: number, dto: PayrollRunDefinitionInput & { appendExclusions?: Array<{ employeeId: number; reason: string }> }) {
    await this.runs.manager.transaction(async em => {
      await this.calculationLock(em)
      await this.lockRun(em, runId)
      const run = await em.getRepository(PayrollRun).findOneBy({ id: runId })
      if (!run) throw new NotFoundException('المسير غير موجود')
      await this.assertRunAccess(user, run, em)
      if (run.status !== 'DRAFT') throw this.stateError('تعديل تعريف المسير', run.status)
      const before = payrollRunDefinitionOf(run)
      // C8 / الخطوة 31: مسودة المسير التكميلي تبقى على نسخة سياسة الأصل وفترته وقائمة موظفيه المؤهلين (تُحذف منها أسماء ولا تُضاف)
      if (payrollRunTypeOf(run) === 'SUPPLEMENTARY') {
        const nextIds = dto.filters?.employeeIds ?? before.filters.employeeIds
        const orgFilters = !!dto.filters && (!!dto.filters.allEmployees || !!dto.filters.branchIds?.length || !!dto.filters.departmentIds?.length || !!dto.filters.teamIds?.length)
        if ((dto.policyVersionId !== undefined && dto.policyVersionId !== run.policyVersionId) || (dto.period !== undefined && dto.period !== run.period) || orgFilters ||
          !nextIds.length || nextIds.some(id => !before.filters.employeeIds.includes(id))) {
          throw new ConflictException({ code: 'PAYRUN-SUPPLEMENTARY-DEFINITION',
            message: 'مسودة المسير التكميلي مقيدة بنسخة سياسة المسير الأصلي وفترته وقائمة موظفيه؛ احذف أسماء فقط أو أنشئ مسيرًا تكميليًا جديدًا' })
        }
      }
      const name = this.runName(dto.name ?? run.name)
      const context = await this.runPolicyPeriod(em, user, dto.policyVersionId ?? run.policyVersionId, dto.period ?? run.period)
      const definition = await this.normalizeRunDefinition(em, user, {
        // الخطوة 22 (B5): الاستبعاد من شاشة التعارضات يُلحق بالاستبعادات القائمة تحت القفل نفسه (لا يستبدلها)
        filters: dto.filters ?? before.filters, exclusions: dto.exclusions ?? [...before.exclusions, ...(dto.appendExclusions ?? [])],
        confirmEmptyScope: dto.confirmEmptyScope ?? !!before.emptyScope, emptyScopeReason: dto.emptyScopeReason ?? before.emptyScope?.reason ?? null,
      }, before)
      await this.assertPolicyBranchScope(em, context.policy, definition)
      await this.assertRunNameAvailable(em, name, context.period, run.id)
      const preview = await this.membershipPreview(em, user, { id: run.id, name, period: context.period, startDate: context.startDate, endDate: context.endDate },
        definition, [], this.policyViewOf(context))
      this.assertNonEmptyScope(preview.totals.candidates, definition)
      const beforeView = { name: run.name, period: run.period, startDate: run.startDate, endDate: run.endDate, policyVersionId: run.policyVersionId, definition: before }
      Object.assign(run, { name, ...payrollRunDefinitionColumns(definition), policyId: context.policy.id, policyVersionId: context.version.id,
        period: context.period, startDate: context.startDate, endDate: context.endDate })
      await this.saveRunRow(em, run)
      await this.event(em, user, run.id, 'DRAFT_UPDATED', null, { before: beforeView,
        after: { name, period: context.period, startDate: context.startDate, endDate: context.endDate, policyVersionId: context.version.id, definition },
        previewTotals: preview.totals, previewHash: preview.previewHash })
    })
    return this.detail(user, runId)
  }

  // «احتساب المسودة» (أول حساب) منفصل عن «إعادة حساب مسير» (بسبب إلزامي).
  async calculateRunDraft(user: JwtPayload, runId: number, dto: { allowDraftConflicts?: boolean; refreshInstallmentPolicy?: boolean }) {
    const run = await this.runs.findOneBy({ id: runId })
    if (!run) throw new NotFoundException('المسير غير موجود')
    await this.assertRunAccess(user, run) // فصل الفروع: لا تُكشف حالة مسير فرع آخر قبل فحص النطاق
    if (run.status !== 'DRAFT') throw this.stateError('احتساب المسودة', run.status)
    return this.calculateDefined(user, { runId, period: run.period, scopeType: run.scopeType,
      allowDraftConflicts: dto.allowDraftConflicts, refreshInstallmentPolicy: dto.refreshInstallmentPolicy })
  }

  async recalculateRun(user: JwtPayload, runId: number, dto: { reason?: unknown; allowDraftConflicts?: boolean; refreshInstallmentPolicy?: boolean
    refreshPolicySnapshot?: boolean; expectedPolicySnapshotHash?: string }) {
    const run = await this.runs.findOneBy({ id: runId })
    if (!run) throw new NotFoundException('المسير غير موجود')
    await this.assertRunAccess(user, run) // فصل الفروع: لا تُكشف حالة مسير فرع آخر قبل فحص النطاق
    if (run.status !== 'CALCULATED') throw this.stateError('إعادة حساب المسير', run.status)
    return this.calculateDefined(user, { runId, period: run.period, scopeType: run.scopeType, reason: this.requireReason(dto.reason),
      allowDraftConflicts: dto.allowDraftConflicts, refreshInstallmentPolicy: dto.refreshInstallmentPolicy,
      refreshPolicySnapshot: dto.refreshPolicySnapshot, expectedPolicySnapshotHash: dto.expectedPolicySnapshotHash })
  }

  // ===== الخطوة 19: لقطة السياسة على المسير =====
  // أول حساب (مسودة أو مسير جديد) يلتقط؛ إعادة الحساب تقرأ المحفوظ؛ التحديث بطلب صريح ببصمة الإعدادات الحالية المعروضة فروقها.
  private async policySnapshotForCalculation(em: EntityManager, user: JwtPayload, run: PayrollRun, options: { existing: boolean; refresh: boolean; expectedHash: string | null }) {
    const stored = options.existing ? parsePayrollRunPolicySnapshot(run) : null
    if (stored && !options.refresh) return { snapshot: stored, mode: 'STORED' as const, previousHash: stored.fingerprint, differences: [] as ReturnType<typeof diffPayrollRunPolicySnapshots> }
    const current = await capturePayrollRunPolicySnapshot(em, { period: run.period, policyVersionId: run.policyVersionId ?? null }, user.sub)
    if (!options.existing) return { snapshot: current, mode: 'FIRST_CALCULATION' as const, previousHash: null, differences: [] as ReturnType<typeof diffPayrollRunPolicySnapshots> }
    const differences = diffPayrollRunPolicySnapshots(stored, current)
    // بصمة الحالي لا تُعاد في الرفض: مصدرها الوحيد GET policy-snapshot الذي يعرض الفروق، فلا يُحدَّث دون عرضها.
    if (!options.refresh) {
      throw new ConflictException({ code: 'PAYRUN-POLICY-SNAPSHOT-MISSING', differences,
        message: 'هذا المسير محسوب بإصدار سابق من النظام؛ أعد حسابه من «إعادة حساب المسير» في شاشة المسير لتطبيق معادلات الرواتب الحالية' })
    }
    if (!options.expectedHash || options.expectedHash !== current.fingerprint) {
      throw new ConflictException({ code: 'PAYRUN-POLICY-SNAPSHOT-STALE', differences,
        message: 'تحديث لقطة السياسة يتطلب بصمة الإعدادات الحالية التي عُرضت فروقها؛ تغيّرت الإعدادات منذ العرض أو لم تُعرض الفروق — اعرضها مجددًا ثم أعد المحاولة' })
    }
    return { snapshot: current, mode: 'REFRESHED' as const, previousHash: stored?.fingerprint ?? null, differences }
  }

  async policySnapshotView(user: JwtPayload, runId: number) {
    return this.readRun(runId, async (em, run) => {
      await this.assertRunAccess(user, run, em)
      const stored = parsePayrollRunPolicySnapshot(run)
      const current = await capturePayrollRunPolicySnapshot(em, { period: run.period, policyVersionId: run.policyVersionId ?? null }, user.sub)
      const differences = diffPayrollRunPolicySnapshots(run.status === 'DRAFT' ? null : stored, current)
      return { runId: run.id, status: run.status, stored, storedHash: stored?.fingerprint ?? null, current, currentHash: current.fingerprint,
        differences,
        refreshRequired: !!stored && stored.fingerprint !== current.fingerprint,
        canRefresh: run.status === 'CALCULATED' && userHasPerm(user, 'payroll.calculate') && (!stored || stored.fingerprint !== current.fingerprint) }
    })
  }

  // ===== الخطوة 20 / D13: وضع المحرك وتقرير التكافؤ =====
  /**
   * شرط الاعتماد: تقرير تكافؤ SHADOW أو POLICY لنسخة الحساب الحالية وبصمة لقطتها، يغطي كل موظف له بند، وكل فرق أو قيمة غائبة
   * له سبب مكتوب من حامل payroll.approve. مسير بلا وضع محرك (قبل D13) أو LEGACY بلا ظل لا يُعتمد.
   */
  private async assertApprovalParity(em: EntityManager, run: PayrollRun, snapshotFingerprint: string) {
    const report = parsePayrollEngineParityReport(run.parityReport)
    const explanations = await em.getRepository(PayrollRunParityExplanation).find({ where: { runId: run.id }, select: { id: true, differenceKey: true } })
    const itemEmployeeIds = (await em.getRepository(PayrollItem).find({ where: { runId: run.id }, select: { employeeId: true } })).map(row => row.employeeId)
    const issues = payrollApprovalParityIssues(report, { engineMode: run.engineMode ?? null, snapshotVersion: run.snapshotVersion, policySnapshotHash: snapshotFingerprint },
      new Set(explanations.map(row => row.differenceKey)), itemEmployeeIds)
    const general = issues.find(issue => issue.employeeId === null)
    if (general) {
      throw new ConflictException({ code: general.issue === 'STALE_REPORT' ? 'PAYRUN-ENGINE-RECALC-REQUIRED' : general.issue === 'INVALID_REPORT' ? 'PAYRUN-PARITY-REPORT-INVALID'
        : 'PAYRUN-ENGINE-PARITY-REPORT-REQUIRED', issue: general.issue, message: general.reason })
    }
    if (issues.some(issue => issue.issue === 'MISSING_EMPLOYEE')) {
      throw new ConflictException({ code: 'PAYRUN-ENGINE-RECALC-REQUIRED', issues: issues.filter(issue => issue.issue === 'MISSING_EMPLOYEE').slice(0, 100),
        message: 'تقرير التكافؤ لا يغطي كل بنود المسير؛ أعد حساب المسير قبل الاعتماد' })
    }
    if (issues.length) {
      throw new ConflictException({ code: 'PAYRUN-APPROVAL-PARITY-UNEXPLAINED', count: issues.length, groups: payrollParityPendingGroups(issues), issues: issues.slice(0, 100),
        message: `لا يُعتمد المسير قبل أن يكون تقرير التكافؤ صفرًا أو لكل فرق أو قيمة غائبة سبب مكتوب: ${issues.length} بندًا بلا سبب (اكتب الأسباب من «محرك الحساب»، فرديًا أو لكل رمز سبب)` })
    }
    const reportKeys = new Set(report!.rows.flatMap(row => row.components.flatMap(item => item.differenceKey ? [item.differenceKey] : [])))
    const unavailableKeys = new Set(report!.rows.flatMap(row => row.components.flatMap(item => item.differenceKey && item.policy === null ? [item.differenceKey] : [])))
    const used = explanations.filter(row => reportKeys.has(row.differenceKey))
    return { report: report!, explanationIds: used.map(row => row.id),
      explained: { differences: used.filter(row => !unavailableKeys.has(row.differenceKey)).length, unavailable: used.filter(row => unavailableKeys.has(row.differenceKey)).length } }
  }

  private async engineView(em: EntityManager, run: PayrollRun) {
    const report = parsePayrollEngineParityReport(run.parityReport)
    const explanations = await em.getRepository(PayrollRunParityExplanation).find({ where: { runId: run.id }, order: { id: 'ASC' } })
    const keys = new Set(explanations.map(row => row.differenceKey))
    const mode = run.engineMode ?? null
    // شروط الاعتماد نفسها التي يفحصها approve (قراءة فقط) — تظهر في اللوحة قبل الضغط على «اعتماد»
    const itemEmployeeIds = run.status === 'CALCULATED' ? (await em.getRepository(PayrollItem).find({ where: { runId: run.id }, select: { employeeId: true } })).map(row => row.employeeId) : []
    const approvalIssues = run.status === 'CALCULATED' ? payrollApprovalParityIssues(report, { engineMode: mode, snapshotVersion: run.snapshotVersion,
      policySnapshotHash: run.policySnapshotHash ?? null }, keys, itemEmployeeIds) : []
    return { mode, modeLabel: mode ? PAYROLL_ENGINE_MODE_LABELS[mode] : 'مسير قبل D13 (بلا وضع محرك)', report, explanations,
      switchIssues: payrollPolicySwitchIssues(report, { snapshotVersion: run.snapshotVersion, policySnapshotHash: run.policySnapshotHash ?? null }, keys),
      approvalIssues: approvalIssues.slice(0, 200), approvalIssueCount: approvalIssues.length, approvalPendingGroups: payrollParityPendingGroups(approvalIssues),
      recalcRequired: !!mode && run.status === 'CALCULATED' && (!report || report.engineMode !== mode || report.snapshotVersion !== run.snapshotVersion),
      policySnapshotHash: run.policySnapshotHash ?? null }
  }

  /**
   * يسجل أسبابًا مكتوبة (إلحاقي) لفروق أو قيم غائبة موجودة فعلًا في تقرير نسخة الحساب الحالية: فرديًا (موظف + بند) أو لمجموعة برمز سبب النظام.
   * سبب القيمة الغائبة يكفي للاعتماد (المصروف هو القديم) ولا يرفع منع التحويل إلى POLICY.
   */
  private async recordParityExplanations(em: EntityManager, user: JwtPayload, run: PayrollRun, input: Array<{ employeeId?: number; component?: string; reasonCode?: string; reason?: unknown }>) {
    const report = parsePayrollEngineParityReport(run.parityReport)
    if (!report || report.engineMode === 'LEGACY' || report.snapshotVersion !== run.snapshotVersion) {
      this.bad('PAYRUN-PARITY-REPORT-MISSING', 'لا يوجد تقرير تكافؤ SHADOW لنسخة الحساب الحالية؛ أعد حساب المسير بوضع SHADOW أولًا')
    }
    const repo = em.getRepository(PayrollRunParityExplanation)
    const existing = new Set((await repo.find({ where: { runId: run.id }, select: { differenceKey: true } })).map(row => row.differenceKey))
    const pending: PayrollRunParityExplanation[] = []
    for (const entry of input) {
      const group = typeof entry.reasonCode === 'string' && entry.reasonCode.length > 0
      if (group === (entry.employeeId != null || entry.component != null) || (!group && (entry.employeeId == null || entry.component == null))) {
        this.bad('PAYRUN-PARITY-TARGET', 'حدد الفرق بموظف وبند، أو مجموعة فروق برمز سبب النظام وحده')
      }
      const target = group ? `مجموعة الرمز ${entry.reasonCode}` : `الموظف #${entry.employeeId} في البند ${entry.component}`
      const reason = typeof entry.reason === 'string' ? entry.reason.trim() : ''
      if (reason.length < 3 || reason.length > 500) this.bad('PAYRUN-PARITY-REASON', `سبب ${target} مطلوب من 3 إلى 500 حرف`)
      const targets = report!.rows.flatMap(row => row.components.filter(item => item.differenceKey !== null &&
        (group ? item.reasonCode === entry.reasonCode : row.employeeId === entry.employeeId && item.code === entry.component)).map(item => ({ employeeId: row.employeeId, item })))
      if (!targets.length) this.bad('PAYRUN-PARITY-DIFFERENCE-NOT-FOUND', `لا يوجد فرق أو قيمة غائبة لـ${target} ضمن تقرير نسخة الحساب الحالية`)
      for (const { employeeId, item } of targets) {
        if (existing.has(item.differenceKey!)) continue
        existing.add(item.differenceKey!)
        pending.push(repo.create({ runId: run.id, snapshotVersion: run.snapshotVersion, employeeId, component: item.code, legacyAmount: item.legacy,
          policyAmount: item.policy, differenceKey: item.differenceKey!, reason, explainedBy: user.sub }))
      }
    }
    // دفعات صغيرة: حد معاملات SQL Server لكل استعلام
    return pending.length ? repo.save(pending, { chunk: 100 }) : []
  }

  private async lockedEngineRun(em: EntityManager, user: JwtPayload, runId: number) {
    await this.lockRun(em, runId)
    const run = await em.getRepository(PayrollRun).findOneBy({ id: runId })
    if (!run) throw new NotFoundException('المسير غير موجود')
    await this.assertRunAccess(user, run, em)
    if (!userHasPerm(user, 'payroll.approve')) throw new ForbiddenException('أسباب فروق التكافؤ وتحويل وضع المحرك لحامل صلاحية اعتماد المسير')
    return run
  }

  async explainParityDifferences(user: JwtPayload, runId: number, input: Array<{ employeeId?: number; component?: string; reasonCode?: string; reason?: unknown }>) {
    await this.runs.manager.transaction(async em => {
      const run = await this.lockedEngineRun(em, user, runId)
      if (run.status !== 'CALCULATED') throw this.stateError('تسجيل أسباب فروق التكافؤ', run.status)
      const saved = await this.recordParityExplanations(em, user, run, input)
      // الصفوف نفسها سجل إلحاقي بمن كتب ومتى؛ الحدث يحمل التفصيل حتى 100 سبب وإلا ملخصًا لكل رمز مع المعرفات
      if (saved.length) await this.event(em, user, run.id, 'PARITY_EXPLAINED', null, { snapshotVersion: run.snapshotVersion, count: saved.length, explanationIds: saved.map(row => row.id),
        ...(saved.length <= 100
          ? { explanations: saved.map(row => ({ id: row.id, employeeId: row.employeeId, component: row.component, legacy: row.legacyAmount, policy: row.policyAmount, reason: row.reason })) }
          : { groups: input.filter(entry => entry.reasonCode).map(entry => ({ reasonCode: entry.reasonCode, reason: typeof entry.reason === 'string' ? entry.reason.trim() : '' })) }) })
    })
    return this.readRun(runId, async (em, run) => this.engineView(em, run))
  }

  async setEngineMode(user: JwtPayload, runId: number, dto: { mode: PayrollEngineMode; reason?: unknown; explanations?: Array<{ employeeId?: number; component?: string; reasonCode?: string; reason?: unknown }> }) {
    const reason = this.requireReason(dto.reason)
    if (!PAYROLL_ENGINE_MODES.includes(dto.mode)) this.bad('PAYRUN-ENGINE-MODE-INVALID', 'وضع المحرك LEGACY أو SHADOW أو POLICY')
    await this.runs.manager.transaction(async em => {
      const run = await this.lockedEngineRun(em, user, runId)
      // C8 / الخطوة 31: مسير العكس لا يُحتسب؛ سطوره لقطة بنود المسير الأصلي فلا وضع محرك يتغير عليه
      if (payrollRunTypeOf(run) === 'REVERSAL') {
        throw new ConflictException({ code: 'PAYRUN-REVERSAL-NO-CALCULATION', message: 'مسير العكس لا يُحتسب؛ وضع محرك الحساب لا يتغير عليه' })
      }
      if (!['DRAFT', 'CALCULATED'].includes(run.status)) throw this.stateError('تغيير وضع محرك الحساب', run.status)
      const from = run.engineMode ?? null
      if (from === dto.mode) this.bad('PAYRUN-ENGINE-MODE-UNCHANGED', `المسير بالفعل بوضع ${dto.mode}`)
      let issues: ReturnType<typeof payrollPolicySwitchIssues> = []
      const saved = dto.mode === 'POLICY' && dto.explanations?.length ? await this.recordParityExplanations(em, user, run, dto.explanations) : []
      const report = parsePayrollEngineParityReport(run.parityReport)
      if (dto.mode === 'POLICY') {
        if (run.status !== 'CALCULATED') this.bad('PAYRUN-ENGINE-POLICY-NEEDS-REPORT', 'التحويل إلى POLICY بعد حساب المسير بوضع SHADOW وظهور تقرير التكافؤ')
        const keys = new Set((await em.getRepository(PayrollRunParityExplanation).find({ where: { runId: run.id }, select: { differenceKey: true } })).map(row => row.differenceKey))
        issues = payrollPolicySwitchIssues(report, { snapshotVersion: run.snapshotVersion, policySnapshotHash: run.policySnapshotHash ?? null }, keys)
        if (issues.length) {
          throw new ConflictException({ code: 'PAYRUN-ENGINE-PARITY-REQUIRED', issues: issues.slice(0, 100),
            message: `لا يُحوّل المسير إلى POLICY قبل أن يكون تقرير التكافؤ صفرًا أو لكل فرق سبب مكتوب: ${issues.length} شرطًا غير مستوفى (${issues[0].reason})` })
        }
      }
      run.engineMode = dto.mode
      await this.saveRunRow(em, run)
      await this.event(em, user, run.id, 'ENGINE_MODE_CHANGED', reason, { from, to: dto.mode, snapshotVersion: run.snapshotVersion,
        parityReportHash: report?.reportHash ?? null, parityTotals: report?.totals ?? null, explanationIds: saved.map(row => row.id),
        recalculationRequired: run.status === 'CALCULATED' })
    })
    return this.readRun(runId, async (em, run) => this.engineView(em, run))
  }

  private reportScope(user: JwtPayload) {
    const scope = branchScopeOf(user)
    if (scope !== null && scope < 1) throw new ForbiddenException('حساب المستخدم غير مسند إلى فرع صالح')
    return scope
  }

  private async visibleReport(user: JwtPayload, report: PayrollUnassignedReport, em: EntityManager): Promise<PayrollUnassignedReport> {
    if (branchScopeOf(user) === null) return report
    const visible = await this.runVisibility(user, em)
    const rows = []
    for (const row of report.rows) {
      const runs = []
      for (const ref of row.runs) runs.push(await visible(ref.runId) ? ref : { ...ref, runId: null, name: 'مسير خارج نطاق صلاحيتك' })
      rows.push({ ...row, runs, reasonText: runs.some(ref => ref.runId === null) ? row.reasonText.replace(/المسير #\d+( «[^»]*»)?/g, 'مسير خارج نطاق صلاحيتك') : row.reasonText })
    }
    return { ...report, rows }
  }

  // تقرير «بلا مسير» لشهر بدورة الإعداد العام، مع فلاتر اختيارية.
  async unassignedReport(user: JwtPayload, query: { period: string; branchId?: number; departmentId?: number; teamId?: number; includeSuspended?: boolean }) {
    const { startDate, endDate } = await this.periodRange(query.period)
    const em = this.runs.manager
    const report = await buildPayrollUnassignedReport(em, { period: query.period, startDate, endDate, branchScope: this.reportScope(user), today: localDateOf(new Date()),
      filters: { branchId: query.branchId, departmentId: query.departmentId, teamId: query.teamId }, includeSuspended: query.includeSuspended === true })
    return this.visibleReport(user, report, em)
  }

  // اسم من أقرّ بالتقرير يظهر على الشاشة بدل رقم المستخدم
  private ackView(ack: PayrollRunUnassignedAck, names: Map<number, string>) {
    return { id: ack.id, snapshotVersion: ack.snapshotVersion, scopeBranchId: ack.scopeBranchId, reportHash: ack.reportHash, rowCount: ack.reportRowCount,
      note: ack.note, acknowledgedBy: ack.acknowledgedBy, acknowledgedByName: names.get(ack.acknowledgedBy) ?? null, acknowledgedAt: ack.acknowledgedAt }
  }

  // الإقرار الساري: لنسخة الحساب نفسها، ونطاقه يغطي نطاق المستخدم (الشركة، أو فرعه)، وبصمة تقريره تطابق التقرير الآن.
  private async currentUnassignedAck(em: EntityManager, user: JwtPayload, run: PayrollRun) {
    const scope = this.reportScope(user)
    const acks = await em.getRepository(PayrollRunUnassignedAck).find({ where: { runId: run.id, snapshotVersion: run.snapshotVersion }, order: { id: 'DESC' } })
    const eligible = acks.filter(ack => ack.scopeBranchId === null || (scope !== null && ack.scopeBranchId === scope))
    const reports = new Map<string, PayrollUnassignedReport>()
    for (const ack of eligible) {
      const key = String(ack.scopeBranchId)
      if (!reports.has(key)) reports.set(key, await buildPayrollUnassignedReport(em, { period: run.period, startDate: run.startDate, endDate: run.endDate,
        branchScope: ack.scopeBranchId, today: localDateOf(new Date()) }))
      if (reports.get(key)!.reportHash === ack.reportHash) return { ack, eligible, acks }
    }
    return { ack: null, eligible, acks }
  }

  private async assertUnassignedAcknowledged(em: EntityManager, user: JwtPayload, run: PayrollRun) {
    const { ack, eligible } = await this.currentUnassignedAck(em, user, run)
    if (ack) return ack
    throw new ConflictException(eligible.length
      ? { code: 'PAYRUN-UNASSIGNED-ACK-STALE', message: 'تغيّر تقرير «موظفون بلا مسير» بعد الإقرار (موظف أو مسير أو سبب جديد)؛ راجع التقرير وأقر مجددًا قبل الاعتماد' }
      : { code: 'PAYRUN-UNASSIGNED-ACK-REQUIRED', message: 'لا يُعتمد المسير قبل الإقرار بالاطلاع على تقرير «موظفون بلا مسير» لنسخة الحساب الحالية' })
  }

  async runUnassignedReport(user: JwtPayload, runId: number) {
    return this.readRun(runId, async (em, run) => {
      await this.assertRunAccess(user, run, em)
      const report = await buildPayrollUnassignedReport(em, { period: run.period, startDate: run.startDate, endDate: run.endDate,
        branchScope: this.reportScope(user), today: localDateOf(new Date()) })
      const { ack, acks } = run.status === 'DRAFT' ? { ack: null, acks: [] as PayrollRunUnassignedAck[] } : await this.currentUnassignedAck(em, user, run)
      const latest = acks[0] ?? await em.getRepository(PayrollRunUnassignedAck).findOne({ where: { runId }, order: { id: 'DESC' } })
      const ackNames = await this.userNames(em, [ack?.acknowledgedBy, latest?.acknowledgedBy])
      return { ...(await this.visibleReport(user, report, em)), runId: run.id, runStatus: run.status, snapshotVersion: run.snapshotVersion,
        acknowledgement: { required: true, current: ack ? this.ackView(ack, ackNames) : null, latest: latest ? this.ackView(latest, ackNames) : null,
          stale: !ack && !!latest, canAcknowledge: run.status === 'CALCULATED' && (userHasPerm(user, 'payroll.approve') || userHasPerm(user, 'payroll.calculate')) } }
    })
  }

  async acknowledgeUnassigned(user: JwtPayload, runId: number, dto: { reportHash: string; note?: string | null }) {
    if (!userHasPerm(user, 'payroll.approve') && !userHasPerm(user, 'payroll.calculate')) throw new ForbiddenException('الإقرار بتقرير «بلا مسير» يتطلب صلاحية احتساب المسير أو اعتماده')
    await this.runs.manager.transaction(async em => {
      await this.lockRun(em, runId)
      const run = await em.getRepository(PayrollRun).findOneBy({ id: runId })
      if (!run) throw new NotFoundException('المسير غير موجود')
      await this.assertRunAccess(user, run, em)
      if (run.status !== 'CALCULATED') throw this.stateError('الإقرار بتقرير «موظفون بلا مسير»', run.status)
      const scope = this.reportScope(user)
      const report = await buildPayrollUnassignedReport(em, { period: run.period, startDate: run.startDate, endDate: run.endDate, branchScope: scope, today: localDateOf(new Date()) })
      if (report.reportHash !== dto.reportHash) {
        throw new ConflictException({ code: 'PAYRUN-UNASSIGNED-STALE', message: 'تغيّر تقرير «موظفون بلا مسير» منذ عرضه؛ راجع النسخة الحالية ثم أقر', reportHash: report.reportHash })
      }
      const note = typeof dto.note === 'string' && dto.note.trim() ? dto.note.trim().slice(0, 500) : null
      const ack = await em.getRepository(PayrollRunUnassignedAck).save({ runId: run.id, snapshotVersion: run.snapshotVersion, period: run.period,
        startDate: run.startDate, endDate: run.endDate, scopeBranchId: scope, reportHash: report.reportHash, reportRowCount: report.rows.length, note, acknowledgedBy: user.sub })
      await this.event(em, user, run.id, 'UNASSIGNED_ACKNOWLEDGED', note, { ackId: ack.id, snapshotVersion: run.snapshotVersion, reportHash: report.reportHash,
        rowCount: report.rows.length, scopeBranchId: scope, byReason: report.totals.byReason })
    })
    return this.runUnassignedReport(user, runId)
  }

  // ===== الخطوتان 22 و23 (B5): أسماء المنفذين، ومن احتسب، وحل التعارض من الشاشة، وفترة التكافؤ التشغيلية =====
  private async userNames(em: EntityManager, ids: Array<number | null | undefined>) {
    const unique = [...new Set(ids.filter((id): id is number => Number.isSafeInteger(id) && Number(id) > 0))]
    if (!unique.length) return new Map<number, string>()
    const rows: Array<{ id: number; displayName: string | null }> = await em.query(
      `SELECT [id], [displayName] FROM [users] WHERE [id] IN (${unique.map((_, index) => `@${index}`).join(', ')})`, unique)
    return new Map(rows.map(row => [Number(row.id), row.displayName || `مستخدم #${row.id}`]))
  }

  // من احتسب نسخة الحساب الحالية: العمود المحفوظ، وللمسيرات السابقة له آخر حدث حساب مسجل.
  private async runCalculator(em: EntityManager, run: PayrollRun): Promise<number | null> {
    if (run.calculatedBy != null) return run.calculatedBy
    if (run.status === 'DRAFT') return null
    const event = await em.getRepository(PayrollRunEvent).findOne({ where: { runId: run.id, eventType: In([...PAYROLL_CALCULATION_EVENT_TYPES]) }, order: { id: 'DESC' } })
    return event?.actorUserId ?? null
  }

  // «استبعاد الموظف من هذا المسير» من شاشة التعارضات: المسودة يُلحق الاستبعاد بتعريفها، والمحسوب يُعاد حسابه بالاستبعاد وسبب إلزامي.
  async excludeRunMember(user: JwtPayload, runId: number, dto: { employeeId: number; reason?: unknown; allowDraftConflicts?: boolean }) {
    // تصحيح المراجعة: الوجود ← النطاق ← الحالة ← السبب؛ مسير خارج فرع المستخدم يُرفض 403 دون كشف حالته أو التحقق من مدخلاته.
    const run = await this.runs.findOneBy({ id: runId })
    if (!run) throw new NotFoundException('المسير غير موجود')
    await this.assertRunAccess(user, run)
    if (run.status !== 'DRAFT' && run.status !== 'CALCULATED') throw new BadRequestException(payrollRunStateIssue('استبعاد موظف من المسير', run.status, ['DRAFT', 'CALCULATED']))
    const reason = typeof dto.reason === 'string' ? dto.reason.trim() : ''
    if (reason.length < 3 || reason.length > 400) this.bad('PAYRUN-EXCLUSION-REASON', `اكتب سبب استبعاد الموظف رقم ${dto.employeeId} (من 3 إلى 400 حرف)`, { employeeId: dto.employeeId })
    if (run.status === 'DRAFT') return this.updateRunDraft(user, runId, { appendExclusions: [{ employeeId: dto.employeeId, reason }] })
    return this.calculateDefined(user, { runId, period: run.period, scopeType: run.scopeType, reason: `استبعاد الموظف رقم ${dto.employeeId} من المسير: ${reason}`,
      allowDraftConflicts: dto.allowDraftConflicts, addExclusions: [{ employeeId: dto.employeeId, reason }] })
  }

  // ===== قرار المالك (20 سبتمبر): المسير قائمة دائمة — «أضفهم لمسير…» و«نقل لمسير آخر» =====
  // العضوية تتغير من الشهر المختار وما بعده: مسير الشهر نفسه، وكل مسير بنفس الاسم في شهر لاحق ما دام مفتوحًا.
  // الشهر المعتمد أو المصروف لا يُمس. «إنشاء مسيرات الشهر الجديد» ينسخ التعريف كما هو فتستمر العضوية تلقائيًا.

  private runOpenForMembership(run: PayrollRun, action: string) {
    if (run.status !== 'DRAFT' && run.status !== 'CALCULATED') throw new BadRequestException(payrollRunStateIssue(action, run.status, ['DRAFT', 'CALCULATED']))
    if (payrollRunTypeOf(run) !== 'REGULAR') this.bad('PAYRUN-MEMBERSHIP-RUN-TYPE', 'المسير التكميلي ومسير العكس قائمتهما مثبتة بمسيرهما الأصلي؛ غيّر العضوية من المسير العادي')
    if (!payrollRunSeriesName(run.name)) this.bad('PAYRUN-MEMBERSHIP-NO-NAME', 'مسير قديم بلا اسم لا تُنقل عضويته؛ اعمله من «مسير جديد» باسم ثابت')
  }

  /** تغيير العضوية على مسير واحد (تعريفه وحدثه) دون إعادة حساب — للمسودات ولأشهر السلسلة اللاحقة. */
  private async applyRunMembership(em: EntityManager, user: JwtPayload, run: PayrollRun, change: { add?: number[]; remove?: number[]; reason: string }) {
    const before = payrollRunDefinitionOf(run)
    const plan = planPayrollRunMembership(before, change)
    if (!plan.changed) return { plan, changed: false }
    const next = await this.normalizeRunDefinition(em, user, { filters: plan.filters, exclusions: plan.exclusions,
      confirmEmptyScope: !!before.emptyScope, emptyScopeReason: before.emptyScope?.reason ?? null }, before)
    const policy = run.policyId ? await em.getRepository(PayrollPolicy).findOneBy({ id: run.policyId }) : null
    if (policy) await this.assertPolicyBranchScope(em, policy, next)
    Object.assign(run, payrollRunDefinitionColumns(next))
    await this.saveRunRow(em, run)
    await this.event(em, user, run.id, 'MEMBERSHIP_CHANGED', change.reason.slice(0, 500),
      { added: plan.added, removed: plan.removed, alreadyMember: plan.alreadyMember, before: before.filters, after: next.filters })
    return { plan, changed: true }
  }

  private runRef(run: { id: number; name: string | null; period: string; status: string }) {
    return { id: run.id, name: run.name, period: run.period, status: run.status }
  }

  /**
   * «أضفهم لمسير…» من تبويب «موظفين ليس لديهم مسير»، و«نقل لمسير آخر» من صف الموظف أو من ملفه:
   * fromRunId = المسير الذي يخرج منه (النقل)، والمسير المستهدف :runId. الاثنان في الشهر نفسه، والتغيير يسري منه وما بعده.
   */
  async changeRunMembership(user: JwtPayload, runId: number, dto: { employeeIds: number[]; reason?: unknown; fromRunId?: number | null; allowDraftConflicts?: boolean }) {
    const target = await this.runs.findOneBy({ id: runId })
    if (!target) throw new NotFoundException('المسير غير موجود')
    await this.assertRunAccess(user, target)
    this.runOpenForMembership(target, 'إضافة موظفين للمسير')
    const employeeIds = [...new Set((dto.employeeIds ?? []).map(Number))].filter(id => Number.isSafeInteger(id) && id > 0)
    if (!employeeIds.length) this.bad('PAYRUN-MEMBERSHIP-EMPTY', 'اختر موظفًا واحدًا على الأقل')
    if (employeeIds.length > 500) this.bad('PAYRUN-MEMBERSHIP-TOO-MANY', 'أضف 500 موظف كحد أقصى في المرة الواحدة')
    const reason = typeof dto.reason === 'string' ? dto.reason.trim() : ''
    if (reason.length < 3 || reason.length > 400) this.bad('PAYRUN-MEMBERSHIP-REASON', 'اكتب سبب تغيير مسير الموظف (من 3 إلى 400 حرف)')
    let source: PayrollRun | null = null
    if (dto.fromRunId != null) {
      if (dto.fromRunId === runId) this.bad('PAYRUN-MEMBERSHIP-SAME-RUN', 'المسير المنقول منه هو نفسه المسير المنقول إليه')
      source = await this.runs.findOneBy({ id: dto.fromRunId })
      if (!source) throw new NotFoundException('المسير المنقول منه غير موجود')
      await this.assertRunAccess(user, source)
      this.runOpenForMembership(source, 'نقل موظف من المسير')
      if (source.period !== target.period) this.bad('PAYRUN-MEMBERSHIP-PERIOD', `النقل يبدأ من شهر واحد: المسير المنقول منه شهر ${source.period} والمنقول إليه ${target.period}`)
    }
    const period = target.period
    const moved: Array<{ from: ReturnType<PayrollService['runRef']> | null; to: ReturnType<PayrollService['runRef']> }> = []
    const recalculate: Array<ReturnType<PayrollService['runRef']>> = []
    const applied = { added: [] as number[], alreadyMember: [] as number[], removed: [] as number[] }
    let anchorRecalculated = false

    // الأشهر اللاحقة أولًا داخل معاملة واحدة، ثم شهر الأساس (بإعادة حساب لو محسوب) — فلا تبقى سلسلة نصف معدلة.
    await this.runs.manager.transaction(async em => {
      await this.calculationLock(em)
      const forward = async (name: string, change: { add?: number[]; remove?: number[] }) => {
        for (const row of await findPayrollRunSeries(em, { name, fromPeriod: period, excludeRunId: null })) {
          if (row.period === period) continue
          await this.lockRun(em, row.id)
          const run = await em.getRepository(PayrollRun).findOneByOrFail({ id: row.id })
          const result = await this.applyRunMembership(em, user, run, { ...change, reason })
          if (result.changed && run.status === 'CALCULATED') recalculate.push(this.runRef(run))
        }
      }
      if (source) {
        await this.lockRun(em, source.id)
        const row = await em.getRepository(PayrollRun).findOneByOrFail({ id: source.id })
        await forward(payrollRunSeriesName(row.name), { remove: employeeIds })
        if (row.status === 'DRAFT') {
          const result = await this.applyRunMembership(em, user, row, { remove: employeeIds, reason })
          applied.removed.push(...result.plan.removed)
        }
      }
      await forward(payrollRunSeriesName(target.name), { add: employeeIds })
      await this.lockRun(em, target.id)
      const row = await em.getRepository(PayrollRun).findOneByOrFail({ id: target.id })
      if (row.status === 'DRAFT') {
        const result = await this.applyRunMembership(em, user, row, { add: employeeIds, reason })
        applied.added.push(...result.plan.added)
        applied.alreadyMember.push(...result.plan.alreadyMember)
      }
    })
    // المسير المحسوب في شهر الأساس يُعاد حسابه بالتغيير نفسه (معاملة الحساب تقفل وتحدث التعريف والأعضاء والمبالغ معًا)
    if (source && source.status === 'CALCULATED') {
      await this.calculateDefined(user, { runId: source.id, period: source.period, scopeType: source.scopeType,
        reason: `نقل ${employeeIds.length} موظف إلى «${payrollRunSeriesName(target.name)}»: ${reason}`,
        allowDraftConflicts: dto.allowDraftConflicts, membership: { remove: employeeIds, reason } })
      applied.removed.push(...employeeIds)
      anchorRecalculated = true
    }
    if (target.status === 'CALCULATED') {
      await this.calculateDefined(user, { runId: target.id, period, scopeType: target.scopeType,
        reason: `إضافة ${employeeIds.length} موظف لمسير «${payrollRunSeriesName(target.name)}»: ${reason}`,
        allowDraftConflicts: dto.allowDraftConflicts, membership: { add: employeeIds, reason } })
      applied.added.push(...employeeIds)
      anchorRecalculated = true
    }
    moved.push({ from: source ? this.runRef(source) : null, to: this.runRef(target) })
    const locked = [
      ...(source ? await findPayrollRunSeriesLocked(this.runs.manager, { name: payrollRunSeriesName(source.name), fromPeriod: period }) : []),
      ...await findPayrollRunSeriesLocked(this.runs.manager, { name: payrollRunSeriesName(target.name), fromPeriod: period }),
    ].map(row => this.runRef(row))
    return { runId, fromPeriod: period, employeeIds, moved, recalculated: anchorRecalculated,
      added: [...new Set(applied.added)], alreadyMember: [...new Set(applied.alreadyMember)], removed: [...new Set(applied.removed)],
      recalculateRuns: recalculate, lockedRuns: locked, run: await this.detail(user, runId) }
  }

  /** مسير الموظف في شهر: أين هو الآن (بالقائمة الدائمة أو بالفلاتر) وما المسيرات المفتوحة التي يمكن نقله إليها — قراءة فقط. */
  async employeeRunMembership(user: JwtPayload, employeeId: number, period: string) {
    const em = this.runs.manager
    const rows = await this.runs.find({ where: { period }, order: { id: 'ASC' } })
    const current: Array<{ id: number; name: string | null; period: string; status: string; listed: boolean; member: boolean }> = []
    const targets: Array<{ id: number; name: string | null; period: string; status: string }> = []
    for (const run of rows) {
      if (payrollRunTypeOf(run) !== 'REGULAR' || run.status === 'CANCELLED') continue
      try { await this.assertRunAccess(user, run, em) } catch { continue }
      let listed = false
      try { listed = payrollRunListsEmployee(payrollRunDefinitionOf(run), employeeId) } catch { listed = false }
      const member = await em.getRepository(PayrollRunMember).findOne({ where: { runId: run.id, employeeId } })
      if (listed || (member && member.membershipStatus !== 'EXCLUDED')) {
        current.push({ ...this.runRef(run), listed, member: !!member && member.membershipStatus !== 'EXCLUDED' })
      }
      if (run.status === 'DRAFT' || run.status === 'CALCULATED') targets.push(this.runRef(run))
    }
    return { employeeId, period, current, targets }
  }

  // الخطوة 23: فترة التكافؤ التشغيلية من المسيرات الحقيقية (قراءة فقط، بنطاق الفرع). تصحيح المراجعة: كل المسيرات غير الملغاة تُقرأ،
  // فالشهر لا يُحتسب لو فيه مسير آخر LEGACY أو غير مصروف، والمسير المعلّم تجريبيًا لا يُحتسب ولا يحجب.
  async parityHistory(user: JwtPayload) {
    const em = this.runs.manager
    const visible = await this.runVisibility(user, em)
    const runs = await this.runs.find({ where: { status: In(['DRAFT', 'CALCULATED', 'APPROVED', 'PAID']) }, order: { period: 'ASC', id: 'ASC' },
      select: { id: true, name: true, period: true, status: true, engineMode: true, approvedAt: true, approvedBy: true, paidAt: true,
        parityExcludedReason: true, parityExcludedBy: true, parityExcludedAt: true, runType: true } })
    const rows = []
    for (const run of runs) {
      // C8: مسير العكس لا يحتسب رواتب ولا تقرير تكافؤ له؛ لا يُحتسب في فترة التكافؤ ولا يحجبها
      if (payrollRunTypeOf(run) === 'REVERSAL') continue
      if (!(await visible(run.id))) continue
      const approved = ['APPROVED', 'PAID'].includes(run.status)
        ? await em.getRepository(PayrollRunEvent).findOne({ where: { runId: run.id, eventType: 'APPROVED' }, order: { id: 'DESC' } }) : null
      rows.push({ runId: run.id, name: run.name, period: run.period, status: run.status, engineMode: run.engineMode ?? null, approvedAt: run.approvedAt,
        approvedBy: run.approvedBy, paidAt: run.paidAt ?? null, approvedEvent: (approved?.payload ?? null) as Record<string, unknown> | null,
        parityExcludedReason: run.parityExcludedReason ?? null, parityExcludedBy: run.parityExcludedBy ?? null, parityExcludedAt: run.parityExcludedAt ?? null })
    }
    const names = await this.userNames(em, rows.flatMap(row => [row.approvedBy, row.parityExcludedBy]))
    const nameOf = (id: number | null) => id == null ? null : names.get(id) ?? null
    return summarizePayrollParityOperations(rows.map(row => ({ ...row, approvedByName: nameOf(row.approvedBy), parityExcludedByName: nameOf(row.parityExcludedBy) })),
      { scope: branchScopeOf(user) === null ? 'COMPANY' : 'BRANCH' })
  }

  // الخطوة 23 (تصحيح المراجعة): تعليم مسير تجريبي «لا يُحتسب» في فترة التكافؤ أو إعادته للاحتساب — حامل الاعتماد، بنطاق الفرع، بسبب مكتوب وحدث.
  async setParityCounting(user: JwtPayload, runId: number, dto: { counts: boolean; reason?: unknown }) {
    await this.runs.manager.transaction(async em => {
      await this.lockRun(em, runId)
      const run = await em.getRepository(PayrollRun).findOneBy({ id: runId })
      if (!run) throw new NotFoundException('المسير غير موجود')
      await this.assertRunAccess(user, run, em)
      if (run.status === 'CANCELLED') throw new BadRequestException(payrollRunStateIssue('تغيير احتساب المسير في فترة التكافؤ', run.status, ['DRAFT', 'CALCULATED', 'APPROVED', 'PAID']))
      const reason = typeof dto.reason === 'string' ? dto.reason.trim() : ''
      if (reason.length < 3 || reason.length > 400) this.bad('PAYRUN-PARITY-COUNTING-REASON', 'اكتب سبب تغيير احتساب المسير في فترة التكافؤ (من 3 إلى 400 حرف)')
      const excluded = run.parityExcludedReason != null
      if (excluded !== dto.counts) {
        this.bad('PAYRUN-PARITY-COUNTING-UNCHANGED', dto.counts ? 'المسير يُحتسب بالفعل في فترة التكافؤ' : 'المسير معلّم بالفعل «لا يُحتسب» في فترة التكافؤ')
      }
      const before = { parityExcludedReason: run.parityExcludedReason, parityExcludedBy: run.parityExcludedBy, parityExcludedAt: run.parityExcludedAt }
      await em.getRepository(PayrollRun).update({ id: run.id }, dto.counts
        ? { parityExcludedReason: null, parityExcludedBy: null, parityExcludedAt: null }
        : { parityExcludedReason: reason, parityExcludedBy: user.sub, parityExcludedAt: new Date() })
      await this.event(em, user, run.id, 'PARITY_COUNTING_CHANGED', reason, { counts: dto.counts, before })
    })
    return this.parityHistory(user)
  }

  // تقرير حالة الصرف: تجميع بطريقة الدفع (كاش/تحويل/فيزا)
  async payMethodReport(user: JwtPayload, runId: number) {
    const { items } = await this.detail(user, runId)
    const byMethod: Record<string, { count: number; total: number }> = {}
    for (const i of items) {
      // قرار المالك (20 سبتمبر): صف «مصروف مع التصفية» مش داخل المبلغ المستحق للصرف — بيتصرف مع التصفية.
      if (payrollItemSettlementPayout(i.breakdown)) continue
      const m = i.payMethod
      byMethod[m] = byMethod[m] ?? { count: 0, total: 0 }
      byMethod[m].count++
      byMethod[m].total = round2(byMethod[m].total + Number(i.netPay))
    }
    return byMethod
  }
}
