import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Between, EntityManager, In, LessThanOrEqual, Not, Repository } from 'typeorm'
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
import { Leave } from '../requests/entities/leave.entities'
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
import { PayrollMemberSnapshot, PayrollRunEvent } from './payroll-membership.entities'
import { claimPayrollPeriod, findPayrollConflicts, releasePayrollClaims } from './payroll-membership-guard'
import { Branch } from '../org/entities/branch.entity'
import { Department } from '../org/entities/department.entity'
import { Team } from '../org/entities/team.entity'
import { CostCenter } from '../assets/assets.entities'
import { loadAttendanceExemptions, exemptionPolicyOnDate } from '../attendance/attendance-exemption-resolver'
import { Request } from '../requests/entities/request.entity'
import { attendanceDeductionDay, AttendanceDeductionPolicy } from './attendance-deductions'
import { readPayrollShadowAttendance } from './payroll-shadow-attendance'
import { roundPayrollMoney as round2 } from './payroll-money'
import { buildPayrollInstallmentPlan, isPayrollInstallmentPlan, PayrollInstallmentPlan, postPayrollInstallments, releasePayrollInstallments, reservePayrollInstallments } from './payroll-installment-ledger'
import { legacyInstallmentNumber, readLoanInstallmentPositions } from './payroll-installment-balances'
import { protectPayrollObligations } from './payroll-obligation-protection'
import { postPayrollObligations, readPayrollNetProtectionSettings, readTypedObligationFacts, releasePayrollObligations, reservePayrollObligations } from './payroll-obligation-ledger'
import { describePayrollObligationLines } from './payroll-obligation-trace'
import { approvedPayrollOvertimeClaims, assertUniqueOvertimeDays, closedOvertimePeriod, legacyExemptOvertimeSource, overtimeFinancialValue, projectOvertimeFinancialValue } from './overtime-financial'
import { findPayrollPeriodContinuity, payrollPeriodBounds, PayrollPeriodError, payrollPolicyPeriodBounds } from './payroll-period'
import { PAYROLL_SALARY_EVIDENCE_MODE_KEY, parsePayrollSalaryEvidenceMode, samePayrollRunSalarySource, selectPayrollRunSalary } from './payroll-run-salary'
import { createHash } from 'node:crypto'
import { localDateOf } from '../attendance/attendance.service'
import { PayrollPolicy, PayrollPolicyVersion } from './payroll-policy.entities'
import { payrollPolicyEffectiveEnds } from './payroll-policy-publish'
import { PayrollRunDefinition, payrollRunDefinitionColumns, payrollRunDefinitionOf, payrollRunHasOrgFilters, payrollRunSelectionMode, PayrollRunExclusion, PayrollRunFilters } from './payroll-run-definition'
import { PayrollMembershipRow, resolvePayrollRunMembership } from './payroll-run-membership'
import { buildPayrollUnassignedReport, PAYROLL_EXCLUSION_LABELS, PayrollUnassignedReport } from './payroll-unassigned-report'
import { PayrollRunUnassignedAck } from './payroll-run-definition.entities'

// الخطوة 16: مدخلات تعريف المسير من الشاشة (تُتحقق هنا ضد القاعدة؛ الـDTO يتحقق من الشكل فقط).
export interface PayrollRunDefinitionInput {
  name?: string | null
  policyVersionId?: number
  period?: string
  filters?: { branchIds?: number[]; departmentIds?: number[]; teamIds?: number[]; employeeIds?: number[]; allEmployees?: boolean }
  exclusions?: Array<{ employeeId: number; reason: string }>
  confirmEmptyScope?: boolean
  emptyScopeReason?: string | null
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
    private readonly attendanceService: AttendanceService
  ) {}

  // خصم تأخير يوم واحد بحسب شرائح التأخير المُعدّة (إن وُجدت)، وإلا بالدقيقة
  private latenessForDay(
    lateMin: number,
    tiers: LatenessTier[],
    dayRate: number,
    minuteRate: number
  ): number {
    if (lateMin <= 0) return 0
    const tier = tiers.find(
      (t) =>
        lateMin >= Number(t.fromMinutes) &&
        (t.toMinutes == null || lateMin <= Number(t.toMinutes))
    )
    if (!tier) return lateMin * minuteRate // لا شريحة مطابقة → بالدقيقة (السلوك الافتراضي)
    return tier.mode === 'FRACTION'
      ? Number(tier.value) * dayRate
      : lateMin * minuteRate
  }

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

  private async assertRunAccess(user: JwtPayload, run: PayrollRun, em = this.runs.manager) {
    const branch = branchScopeOf(user)
    if (branch === null) return
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

  private requireReason(reason?: string) {
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
      const fresh: ReturnType<PayrollService['attendanceRuleTrace']>[] = []
      for (const day of rows) {
        if (exemptionPolicyOnDate(exemptions, day.date, { overtimeEligible: false, unpaidLeaveDeductible: true }).isExempt) continue
        fresh.push(this.attendanceRuleTrace(await this.attendanceService.computeDay(item.employeeId, day.date, false, true, em)))
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
      if ((breakdown.overtimeEntryIds ?? []).length) {
        if (!Array.isArray(breakdown.overtimeEntryIds) || breakdown.overtimeEntryIds.some((id: unknown) => !Number.isSafeInteger(id) || Number(id) < 1) ||
          new Set(breakdown.overtimeEntryIds).size !== breakdown.overtimeEntryIds.length) throw new ConflictException('مراجع مصادر الإضافي غير صالحة أو مكررة')
        if (breakdown.overtime != null && (!Array.isArray(breakdown.overtime) || breakdown.overtime.length !== breakdown.overtimeEntryIds.length ||
          new Set(breakdown.overtime.map((row: any) => row?.id)).size !== breakdown.overtimeEntryIds.length ||
          breakdown.overtime.some((row: any) => !row || !breakdown.overtimeEntryIds.includes(row.id) ||
            typeof row.amount !== 'number' || !Number.isFinite(row.amount) || row.amount < 0 || typeof row.hours !== 'number' || !Number.isFinite(row.hours) || row.hours < 0) ||
          round2(breakdown.overtime.reduce((sum: number, row: any) => sum + row.amount, 0)) !== Number(item.overtimeAmount) ||
          round2(breakdown.overtime.reduce((sum: number, row: any) => sum + row.hours, 0)) !== Number(item.overtimeHours))) {
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
      if (!run && dto.name) await this.assertRunNameAvailable(em, dto.name, dto.period, null)
      const previousMembers = run ? await members.find({ where: { runId: run.id }, order: { employeeId: 'ASC' } }) : []
      const previousItems = run ? await items.find({ where: { runId: run.id }, order: { employeeId: 'ASC' } }) : []
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

      const monthlyDays = Number(await this.cfg('payroll.monthly_days', '30'))
      const dailyHours = Number(await this.cfg('payroll.daily_hours', '8'))
      if (!Number.isFinite(monthlyDays) || monthlyDays <= 0 || !Number.isFinite(dailyHours) || dailyHours <= 0) {
        throw new BadRequestException('أساس أيام الشهر وساعات اليوم يجب أن يكونا أكبر من صفر')
      }
      const lateEnabled =
        (await this.cfg('payroll.late_deduction_enabled', 'true')) === 'true'
      const shortfallEnabledValue = await this.cfg('payroll.shortfall_enabled', 'true')
      const shortfallMode = await this.cfg('payroll.shortfall_mode', 'MINUTES')
      const shortfallValue = Number(await this.cfg('payroll.shortfall_value', '1'))
      const overlapPolicy = await this.cfg('payroll.attendance_overlap_policy', 'NET_OF_LATENESS')
      const dailyCapDays = Number(await this.cfg('payroll.attendance_daily_cap_days', '1'))
      // D1: خصم الخروج المبكر على الوردية الثابتة (افتراضي مفعّل = السلوك القائم).
      const earlyLeaveValue = await this.cfg('payroll.early_leave_deduction_enabled', 'true')
      if (!['true', 'false'].includes(earlyLeaveValue)) throw new BadRequestException('إعداد خصم الخروج المبكر على الوردية الثابتة غير صالح')
      if (!['true', 'false'].includes(shortfallEnabledValue) || !['MINUTES', 'MULTIPLIER', 'FRACTION'].includes(shortfallMode)
        || !['CUMULATIVE', 'MAX_OF_BOTH', 'NET_OF_LATENESS'].includes(overlapPolicy)
        || ![shortfallValue, dailyCapDays].every(value => Number.isFinite(value) && value >= 0)) {
        throw new BadRequestException('سياسة نقص ساعات العمل أو التداخل أو السقف اليومي غير صالحة')
      }
      const exemptOvertime = await this.cfg('payroll.exempt_overtime_eligible', 'false')
      const exemptUnpaid = await this.cfg('payroll.exempt_unpaid_leave_deductible', 'true')
      if (![exemptOvertime, exemptUnpaid].every(value => ['true', 'false'].includes(value))) {
        throw new BadRequestException('إعداد استحقاق المستثنى للإضافي أو خصم الإجازة بلا أجر غير صالح')
      }
      const exemptionDefaults = { overtimeEligible: exemptOvertime === 'true', unpaidLeaveDeductible: exemptUnpaid === 'true' }
      const salaryEvidenceMode = parsePayrollSalaryEvidenceMode(await this.cfg(PAYROLL_SALARY_EVIDENCE_MODE_KEY, 'MONTHLY_HISTORY'))
      // معادلات مرنة: شرائح التأخير + معامل الغياب بلا إذن (يوم × المعامل)
      const tiers = await this.latenessTiers.find({
        where: { isActive: true },
        order: { fromMinutes: 'ASC' },
    })
    const absencePenalty = Number(
      await this.cfg('attendance.absence_penalty_days', '1')
    )

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
    // تحقق الجميع قبل تجسيد الحضور أو استبدال أي بند مالي.
    const dataProblem = membership.rows.find(row => row.dataProblem)
    if (dataProblem) throw new BadRequestException(dataProblem.dataProblem!.message)
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
      }
      const member = members.create({ employeeId: emp.id, snapshot, membershipStatus: row.status, inclusionSource: row.inclusionSource,
        exclusionReason: row.status === 'INCLUDED' ? null : row.code })
      newMembers.push(member)
      if (row.status === 'INCLUDED' && coverage && salary?.ok) covered.push({ emp, coverage, member, salary, claims: await getSettlementFinancialClaims(em, emp.id) })
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

    let totalNet = 0
    for (const { emp, coverage, member, claims, salary } of covered) {
      const { coverFrom, coverTo, coverDays } = coverage
      // الحضور قد يصحح ساعات مصدر الإضافي؛ نقرأ الاستحقاق بعد إتمام التصحيح داخل المعاملة.
      await this.attendanceService.materializeAbsences(emp.id, coverFrom, coverTo, em)
      // راتب شهر المسير كاملًا (لا تقسيم ولا متوسط داخل الشهر)؛ التناسب أدناه لأيام الخدمة فقط.
      const monthlyComponents = salary.monthlyComponents
      // PR-10: قروش صحيحة قبل التناسب؛ 30.15 × 3÷30 = 3.015 تُقرّب إلى3.02.
      const monthlyCents = monthlyComponents.map(amount => Math.round(amount * 100))
      const grossCents = monthlyCents.reduce((sum, amount) => sum + amount, 0)
      const basic = monthlyCents[0] / 100
      const allowances = monthlyCents.slice(1).reduce((sum, amount) => sum + amount, 0) / 100
      const gross = grossCents / 100
      // ② / PR-10 وقرار المستخدم: الجزء على أساس 30؛ الدورة الكاملة تستحق شهرًا كاملًا.
      const fullCoverage = coverFrom === startDate && coverTo === endDate
      const prorataFactor = fullCoverage ? 1 : Math.min(coverDays / monthlyDays, 1)
      const prorateCents = (cents: number) => fullCoverage ? cents : Math.min(cents, Math.round(cents * coverDays / monthlyDays))
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

      // 2) خصم التأخير: الدقائق غير المعذورة + دقائق الإذن «بخصم»
      // (المعذور بإذن بدون خصم أو إجازة جزئية لا يُخصم)
      // أولاً: جسّد الغياب — أنشئ صفوف 'absent' لأيام العمل غير الملموسة في
      // الفترة (بلا بصمة ولا إجازة) قبل القراءة، فتُحتسب في الخصم والتقارير
      const attRows = (await em.getRepository(AttendanceDay).find({
        where: { employeeId: emp.id, date: Between(coverFrom, coverTo) },
      })).filter(row => !policyOnDate(row.date).isExempt)
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
      const attendanceDeductionDays = attRows.map(row => attendanceDeductionDay(row, attendancePolicy,
        this.latenessForDay(row.lateMinutes, tiers, dayRate, minuteRate)))
      // المجموع التاريخي يشمل الأذونات المدفوعة؛ تفصيل اليوم يميز مبلغها صراحةً.
      const latenessRequested = round2(attendanceDeductionDays.reduce((sum, day) => sum + day.latenessAmount + day.permissionAmount, 0))
      const shortfallMinutes = attRows.reduce((sum, day) => sum + Number(day.shortfallMinutes ?? 0), 0)
      const shortfallRequested = round2(attendanceDeductionDays.reduce((sum, day) => sum + day.shortfallAmount, 0))

      // 2ب) خصم الغياب بلا إذن: يوم عمل مجدول بلا بصمة ولا إجازة (status='absent')
      // يُخصم بقيمة اليوم × معامل عقوبة الغياب (افتراضي 1، يُضبط لـ1.5/2).
      // (يوم الإجازة يُصنّف 'leave' لا 'absent' فلا ازدواج مع الإجازة غير المدفوعة)
      const absentRows = attRows.filter((r) => r.status === 'absent')
      const absenceDays = absentRows.length
      const absenceRequested = round2(absenceDays * dayRate * absencePenalty)
      // D13/الخطوة 28: محرك السياسة بوضع SHADOW بجانب الحساب القديم لنفس الموظف والفترة (المصروف = القديم دائمًا):
      // مزودات المصادر الحية (ومنها نسب الوردية الليلية ليوم بدايتها) ← منفذ البنود ← تكافؤ يومي. قراءة فقط ولا يغير أي مبلغ.
      const policyShadow = await readPayrollShadowAttendance(em, { employeeId: emp.id, periodStart: startDate, periodEnd: endDate, monthlyComponents,
        rules: { monthlyDays, dailyHours, lateEnabled, shortfallEnabled: shortfallEnabledValue === 'true', shortfallMode, shortfallValue, overlapPolicy,
          dailyCapDays, earlyLeaveEnabled: earlyLeaveValue === 'true', absencePenalty, latenessTiers: tiers },
        legacy: { days: attendanceDeductionDays.map(day => ({ date: day.date, lateness: day.latenessAmount + day.permissionAmount, shortfall: day.shortfallAmount })),
          absentDates: absentRows.map(row => row.date), absenceDayAmount: dayRate * absencePenalty,
          totals: { lateness: latenessRequested, shortfall: shortfallRequested, absence: absenceRequested } } })

      // 3) الإجازات غير المدفوعة (isUnpaid من تعريف النوع — أي نوع
      // غير مدفوع يُخصم يوم بيوم، بلا سياسة غياب) المتقاطعة مع الفترة
      const unpaidLeaves = (await em.getRepository(Leave).find({
        where: { employeeId: emp.id, isUnpaid: true, status: 'APPROVED' },
      })).filter(lv => lv.fromDate <= coverTo && lv.toDate >= coverFrom)
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
      const unpaidDeduction = round2(unpaidDays * dayRate)

      // 5) دفتر المديونيات: بنود PENDING سرت فترتها (effectiveDate ضمن الفترة أو فارغة، والشهر
      // المستهدف لا يتجاوز شهر المسير — DD-07) وغير محجوزة لمسير معتمد آخر (DD-09) — DEBIT خصم،
      // CREDIT إضافة. تُحجز عند الاعتماد وتُستهلك عند الصرف. DD-11 (C2): حماية الصافي لكل الخصومات:
      // فائض الحضور يسقط، وفائض القيود يُرحّل عند الصرف، والأقساط بعدها من الباقي.
      const obligationRunId = run.id, obligationRunPeriod = run.period
      const pendingObligations = (
        await em.getRepository(EmployeeObligation).find({
          where: { employeeId: emp.id, status: 'PENDING' },
        })
      ).filter((o) => (!o.effectiveDate || o.effectiveDate <= endDate) && (!o.targetPeriod || o.targetPeriod <= obligationRunPeriod) &&
        (o.reservedPayrollRunId == null || o.reservedPayrollRunId === obligationRunId))
      // C2 / DD-11: فئة نوع الخصم المصنف وأولوية ترحيله (النظامي أولًا، الإداري آخر المصنفة)
      const typedObligationFacts = await readTypedObligationFacts(em, pendingObligations)
      const obligationEntry = (o: EmployeeObligation) => ({ id: o.id, amount: round2(Number(o.amount)), category: o.category,
        deductionRequestId: o.deductionRequestId ?? null, effectiveDate: o.effectiveDate ?? null, ...typedObligationFacts.get(o.id) })
      const netProtection = protectPayrollObligations({
        earnedFixedGross: grossEarned, overtime: otAmount, unpaidLeave: unpaidDeduction,
        attendance: { lateness: latenessRequested, shortfall: shortfallRequested, absence: absenceRequested },
        credits: pendingObligations.filter((o) => o.type === 'CREDIT').map(obligationEntry),
        debits: pendingObligations.filter((o) => o.type === 'DEBIT').map(obligationEntry),
        settings: await readPayrollNetProtectionSettings(em),
      })
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
      const previousBreakdown = previousItems.find(row => row.employeeId === emp.id)?.breakdown
      const previousPlan = previousBreakdown ? JSON.parse(previousBreakdown).installmentPlan : null
      if (previousPlan != null && !isPayrollInstallmentPlan(previousPlan)) throw new ConflictException('خطة أقساط المسير السابقة غير صالحة')
      const installmentPlan = await buildPayrollInstallmentPlan(em, emp.id, {
        period: run.period, endDate, netBeforeLoans: netBeforeLoans.toFixed(2), earnedFixedGross: grossEarned.toFixed(2),
        capConsumed: round2(latenessDeduction + shortfallDeduction + absenceDeduction + otherDeductions).toFixed(2),
      }, { runId: run.id, policy: !dto.refreshInstallmentPolicy && previousPlan ? previousPlan.policy : undefined })
      const loanDeduction = installmentPlan ? legacyInstallmentNumber(installmentPlan.allocation.totals.deductedAmount) : 0
      const netPay = round2(netBeforeLoans - loanDeduction)
      totalNet = round2(totalNet + netPay)

      prepared.push(
        items.create({
          employeeId: emp.id,
          basicSalary: earnedComponents[0],
          allowances: round2(earnedComponents.slice(1).reduce((sum, amount) => sum + amount, 0)),
          overtimeHours: otHours,
          overtimeAmount: otAmount,
          lateMinutes,
          latenessDeduction,
          shortfallMinutes,
          shortfallDeduction,
          absenceDays,
          absenceDeduction,
          unpaidLeaveDays: unpaidDays,
          unpaidLeaveDeduction: unpaidDeduction,
          loanInstallments: loanDeduction,
          otherDeductions,
          otherAdditions,
          netPay,
          payMethod: emp.payMethod ?? 'transfer',
          breakdown: JSON.stringify({
            ...coverage,
            monthlyDays,
            dailyHours,
            gross,
            grossEarned,
            monthlyBasicSalary: basic,
            monthlyAllowances: allowances,
            monthlyComponents,
            earnedComponents,
            salaryComponents,
            salarySource: salary.source,
            prorataFactor: Math.round(prorataFactor * 1e6) / 1e6,
            prorationBasis: 'MONTHLY_DAYS',
            attendanceExemptions,
            attendanceDeductions: { policy: attendancePolicy, days: attendanceDeductionDays,
              totals: { lateMinutes, shortfallMinutes, latenessDeduction, shortfallDeduction } },
            attendanceRules: attRows.map(row => this.attendanceRuleTrace(row)),
            policyShadow,
            exemptDays,
            isAttendanceExempt,
            exemptUnpaidLeaveDays,
            excludedOvertimeEntryIds,
            dayRate: round2(dayRate),
            hourRate: round2(hourRate),
            overtimeEntryIds: otRows.map((r) => r.id),
            overtime: overtimeDetails,
            installmentPlan,
            installmentIds: installmentPlan?.allocation.lines.filter(line => line.eligible).map(line => Number(line.installmentRef)) ?? [],
            obligationIds: netProtection.consumedObligationIds,
            obligationLines: netProtection.lines,
            netProtection: netProtection.trace,
            absentDates: absentRows.map((r) => r.date),
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
          }),
        })
      )
    }

    run.totalNet = totalNet
    run.status = 'CALCULATED'
    run.snapshotVersion = (run.snapshotVersion ?? 0) + 1
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
        periodContinuity: periodContinuity.map(({ otherRunId: _otherRunId, otherRunName: _otherRunName, ...issue }) => issue) })
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
    const netBefore = round2(earned + Number(item.overtimeAmount) + Number(item.otherAdditions) - consumed - Number(item.unpaidLeaveDeduction))
    const deducted = legacyInstallmentNumber(plan.allocation.totals.deductedAmount)
    const ids = plan.allocation.lines.filter(line => line.eligible).map(line => Number(line.installmentRef)).sort((a, b) => a - b)
    if (plan.context.period !== run.period || plan.context.endDate !== run.endDate || plan.context.earnedFixedGross !== earned.toFixed(2) ||
        plan.context.capConsumed !== consumed.toFixed(2) || plan.context.netBeforeLoans !== netBefore.toFixed(2) ||
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
      if (run.status !== 'CALCULATED') {
        throw new BadRequestException('المسير ليس بحالة محسوبة')
      }
      // الخطوة 18 / PR-07: لا اعتماد قبل إقرار موثق بتقرير «موظفون بلا مسير» لنسخة الحساب نفسها وببصمة التقرير الحالية.
      const unassignedAck = await this.assertUnassignedAcknowledged(em, user, run)
      const items = await em.getRepository(PayrollItem).find({ where: { runId } })
      const employeeIds = await this.validateRunMembers(em, run, items)
      await lockPayrollEmployees(em, employeeIds)
      await this.assertAttendanceExemptionSnapshot(em, run, items)
      await this.assertAttendanceRuleSnapshot(em, run, items)
      await this.assertSalarySourceSnapshot(em, run, items)
      await this.assertSettlementBoundary(em, items)
      // DD-11: الرصيد السالب (المحمي يتجاوز الاستحقاق) يمنع القبول المالي
      const negativeNet = items.filter(item => Number(item.netPay) < 0).map(item => item.employeeId)
      if (negativeNet.length) throw new ConflictException({ code: 'PAYRUN-NET-NEGATIVE', message: 'صافي بعض الموظفين سالب؛ عالج الإجازة بلا أجر أو الاستحقاق ثم أعد الحساب قبل الاعتماد', employeeIds: negativeNet })
      await claimPayrollPeriod(em, run, employeeIds)
      for (const item of items) {
        const plan = await this.installmentPlanForItem(em, run, item)
        if (plan) await reservePayrollInstallments(em, item.employeeId, run.id, run.snapshotVersion, user.sub, plan)
        // DD-09 (C2): حجز قيود الدفتر باسم المسير المعتمد — مسير معتمد واحد فقط يحملها
        await reservePayrollObligations(em, item.employeeId, run.id, item.breakdown ? JSON.parse(item.breakdown) : {})
      }
      run.status = 'APPROVED'
      run.approvedBy = user.sub
      run.approvedAt = new Date()
      await runs.save(run)
      await this.event(em, user, run.id, 'APPROVED', null, { snapshotVersion: run.snapshotVersion, employeeIds, totalNet: Number(run.totalNet),
        unassignedAckId: unassignedAck.id, unassignedReportHash: unassignedAck.reportHash })
      return run
    })
  }

  // ===== الصرف: يقفل الأوفرتايم والأقساط المرتبطة =====
  async pay(user: JwtPayload, runId: number) {
    return this.runs.manager.transaction(async em => {
      await this.lockRun(em, runId)
      const runs = em.getRepository(PayrollRun)
      const run = await runs.findOne({ where: { id: runId } })
      if (!run) throw new NotFoundException('المسير غير موجود')
      await this.assertRunAccess(user, run, em)
      if (run.status !== 'APPROVED') {
        throw new BadRequestException('المسير غير معتمد')
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
      }
      run.status = 'PAID'
      run.paidAt = new Date()
      await runs.save(run)
      await this.event(em, user, run.id, 'PAID', null, { snapshotVersion: run.snapshotVersion, totalNet: Number(run.totalNet), employeeIds })
      return run
    })
  }

  // ===== الاستعلام (بنطاق الفرع) =====
  async list(user: JwtPayload) {
    const runs = await this.runs.find({ order: { period: 'DESC', id: 'DESC' } })
    if (branchScopeOf(user) === null) return runs
    const result: PayrollRun[] = []
    for (const run of runs) {
      try { result.push(await this.readRun(run.id, async (em, current) => {
        await this.assertRunAccess(user, current, em)
        return current
      })) }
      catch (error) { if (!(error instanceof ForbiddenException)) throw error }
    }
    return result
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
    return { ...run, items, members: await this.visibleMembers(user, members, em), conflicts, pendingOvertime, periodContinuity, selection, policyVersion }
    })
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
    return events
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
        return currentItem ? { item: currentItem, run } : null
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
    const employee = snapshot ? { id: item.employeeId, fullName: snapshot.fullName, employeeCode: snapshot.employeeCode,
      jobTitle: snapshot.jobTitle, joinDate: snapshot.hireDate, branchId: snapshot.branchId, departmentId: snapshot.departmentId,
      teamId: snapshot.teamId, costCenterId: snapshot.costCenterId, basicSalary: snapshot.basicSalary } :
      legacyIdentity ? { ...legacyIdentity, branchId: savedBranch, basicSalary: Number(item.basicSalary) } : null
    // C2: تتبع كل قيد دفتر في القسيمة (نوع الخصم وسببه وطلبه وسعر اليوم المستخدم)
    let savedBreakdown: unknown = {}
    try { savedBreakdown = item.breakdown ? JSON.parse(item.breakdown) : {} } catch { savedBreakdown = {} }
    const obligationDetails = await describePayrollObligationLines(em, savedBreakdown)
    return { item, run, employee, member, identitySource: snapshot ? 'SNAPSHOT' : 'CURRENT_NAME_ONLY', obligationDetails }
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
    const filters: PayrollRunFilters = { branchIds: list(raw.branchIds, 'الفروع'), departmentIds: list(raw.departmentIds, 'الأقسام'), teamIds: list(raw.teamIds, 'الفرق'),
      costCenterIds: [], employeeIds: list(raw.employeeIds, 'قائمة الموظفين'), allEmployees: raw.allEmployees === true, includeSubDepartments: true }
    if (filters.allEmployees && (payrollRunHasOrgFilters(filters) || filters.employeeIds.length)) this.bad('PAYRUN-FILTER-INVALID', 'اختر «الشركة كلها» أو فلاتر محددة، لا الاثنين معًا')
    const scope = branchScopeOf(user)
    if (scope !== null) {
      if (scope < 1 || filters.allEmployees || filters.branchIds.some(id => id !== scope)) throw new ForbiddenException('نطاق المسير خارج الفرع المسموح لك')
      filters.branchIds = [scope]
    }
    if (!filters.allEmployees && !filters.employeeIds.length && !payrollRunHasOrgFilters(filters)) {
      this.bad('PAYRUN-SCOPE-REQUIRED', 'حدد نطاق المسير: فرعًا أو قسمًا أو فريقًا أو قائمة موظفين')
    }
    const absent = async (entity: typeof Branch | typeof Department | typeof Team | typeof Employee, ids: number[], label: string, key: string) => {
      if (!ids.length) return
      const found = new Set<number>()
      for (let offset = 0; offset < ids.length; offset += 500) {
        for (const row of await em.getRepository(entity as typeof Branch).find({ select: { id: true }, where: { id: In(ids.slice(offset, offset + 500)) } })) found.add(row.id)
      }
      const missing = ids.filter(id => !found.has(id))
      if (missing.length) this.bad('PAYRUN-SCOPE-UNKNOWN-IDS', `${label} غير موجود: ${missing.join('، ')}`, { [key]: missing })
    }
    await absent(Branch, filters.branchIds, 'رقم الفرع', 'branchIds')
    await absent(Department, filters.departmentIds, 'رقم القسم', 'departmentIds')
    await absent(Team, filters.teamIds, 'رقم الفريق', 'teamIds')
    await absent(Employee, filters.employeeIds, 'رقم الموظف', 'employeeIds')
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
      if (filters.employeeIds.length && !filters.employeeIds.includes(employeeId)) {
        this.bad('PAYRUN-EXCLUSION-NOT-LISTED', `الموظف رقم ${employeeId} ليس في قائمة المسير؛ احذفه من القائمة بدل استبعاده`, { employeeId })
      }
      const prior = previous?.exclusions.find(item => item.employeeId === employeeId && item.reason === reason)
      exclusions.push({ employeeId, reason, byUserId: prior?.byUserId ?? user.sub, at: prior?.at ?? new Date().toISOString() })
    }
    await absent(Employee, exclusions.map(row => row.employeeId), 'رقم الموظف المستبعد', 'employeeIds')
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
    const included = [], excluded = []
    let monthlyCents = 0, earnedCents = 0
    for (const row of resolution.rows) {
      const org = this.snapshotOrg(row, names)
      const common = { employeeId: row.employee.id, employeeCode: row.employee.employeeCode, fullName: row.employee.fullName, jobTitle: row.employee.jobTitle ?? null,
        branchId: org.branchId, branchName: org.branchName, departmentId: org.departmentId, departmentName: org.departmentName, teamId: org.teamId, teamName: org.teamName,
        orgDate: org.orgDate, orgIssues: row.org.issues, inclusionSource: row.inclusionSource }
      if (row.status === 'INCLUDED' && row.coverage && row.salary?.ok) {
        const coverage = row.coverage
        const grossCents = row.salary.monthlyComponents.reduce((sum, amount) => sum + Math.round(amount * 100), 0)
        const fullCoverage = coverage.coverFrom === run.startDate && coverage.coverTo === run.endDate
        const earned = fullCoverage ? grossCents : Math.min(grossCents, Math.round(grossCents * coverage.coverDays / monthlyDays))
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
  async createRunDraft(user: JwtPayload, dto: PayrollRunDefinitionInput) {
    const runId = await this.runs.manager.transaction(async em => {
      await this.calculationLock(em)
      const name = this.runName(dto.name)
      const context = await this.runPolicyPeriod(em, user, dto.policyVersionId, dto.period)
      const definition = await this.normalizeRunDefinition(em, user, dto, null)
      await this.assertRunNameAvailable(em, name, context.period, null)
      const preview = await this.membershipPreview(em, user, { id: null, name, period: context.period, startDate: context.startDate, endDate: context.endDate },
        definition, [], this.policyViewOf(context))
      this.assertNonEmptyScope(preview.totals.candidates, definition)
      const saved = await this.saveRunRow(em, em.getRepository(PayrollRun).create({ name, ...payrollRunDefinitionColumns(definition),
        policyId: context.policy.id, policyVersionId: context.version.id, period: context.period, startDate: context.startDate, endDate: context.endDate,
        status: 'DRAFT', totalNet: 0, snapshotVersion: 0 }))
      await this.event(em, user, saved.id, 'DRAFT_CREATED', null, { name, definition, policy: this.policyViewOf(context),
        period: { period: context.period, startDate: context.startDate, endDate: context.endDate }, previewTotals: preview.totals, previewHash: preview.previewHash })
      return saved.id
    })
    return this.detail(user, runId)
  }

  async updateRunDraft(user: JwtPayload, runId: number, dto: PayrollRunDefinitionInput) {
    await this.runs.manager.transaction(async em => {
      await this.calculationLock(em)
      await this.lockRun(em, runId)
      const run = await em.getRepository(PayrollRun).findOneBy({ id: runId })
      if (!run) throw new NotFoundException('المسير غير موجود')
      await this.assertRunAccess(user, run, em)
      if (run.status !== 'DRAFT') throw this.stateError('تعديل تعريف المسير', run.status)
      const before = payrollRunDefinitionOf(run)
      const name = this.runName(dto.name ?? run.name)
      const context = await this.runPolicyPeriod(em, user, dto.policyVersionId ?? run.policyVersionId, dto.period ?? run.period)
      const definition = await this.normalizeRunDefinition(em, user, {
        filters: dto.filters ?? before.filters, exclusions: dto.exclusions ?? before.exclusions,
        confirmEmptyScope: dto.confirmEmptyScope ?? !!before.emptyScope, emptyScopeReason: dto.emptyScopeReason ?? before.emptyScope?.reason ?? null,
      }, before)
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
    if (run.status !== 'DRAFT') throw this.stateError('احتساب المسودة', run.status)
    return this.calculateDefined(user, { runId, period: run.period, scopeType: run.scopeType,
      allowDraftConflicts: dto.allowDraftConflicts, refreshInstallmentPolicy: dto.refreshInstallmentPolicy })
  }

  async recalculateRun(user: JwtPayload, runId: number, dto: { reason: string; allowDraftConflicts?: boolean; refreshInstallmentPolicy?: boolean }) {
    const run = await this.runs.findOneBy({ id: runId })
    if (!run) throw new NotFoundException('المسير غير موجود')
    if (run.status !== 'CALCULATED') throw this.stateError('إعادة حساب المسير', run.status)
    return this.calculateDefined(user, { runId, period: run.period, scopeType: run.scopeType, reason: this.requireReason(dto.reason),
      allowDraftConflicts: dto.allowDraftConflicts, refreshInstallmentPolicy: dto.refreshInstallmentPolicy })
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

  private ackView(ack: PayrollRunUnassignedAck) {
    return { id: ack.id, snapshotVersion: ack.snapshotVersion, scopeBranchId: ack.scopeBranchId, reportHash: ack.reportHash, rowCount: ack.reportRowCount,
      note: ack.note, acknowledgedBy: ack.acknowledgedBy, acknowledgedAt: ack.acknowledgedAt }
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
      return { ...(await this.visibleReport(user, report, em)), runId: run.id, runStatus: run.status, snapshotVersion: run.snapshotVersion,
        acknowledgement: { required: true, current: ack ? this.ackView(ack) : null, latest: latest ? this.ackView(latest) : null,
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

  // تقرير حالة الصرف: تجميع بطريقة الدفع (كاش/تحويل/فيزا)
  async payMethodReport(user: JwtPayload, runId: number) {
    const { items } = await this.detail(user, runId)
    const byMethod: Record<string, { count: number; total: number }> = {}
    for (const i of items) {
      const m = i.payMethod
      byMethod[m] = byMethod[m] ?? { count: 0, total: 0 }
      byMethod[m].count++
      byMethod[m].total = round2(byMethod[m].total + Number(i.netPay))
    }
    return byMethod
  }
}
