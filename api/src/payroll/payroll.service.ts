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
import { roundPayrollMoney as round2 } from './payroll-money'
import { buildPayrollInstallmentPlan, isPayrollInstallmentPlan, PayrollInstallmentPlan, postPayrollInstallments, releasePayrollInstallments, reservePayrollInstallments } from './payroll-installment-ledger'
import { legacyInstallmentNumber, readLoanInstallmentPositions } from './payroll-installment-balances'
import { approvedPayrollOvertimeClaims, assertUniqueOvertimeDays, closedOvertimePeriod, legacyExemptOvertimeSource, overtimeFinancialValue, projectOvertimeFinancialValue } from './overtime-financial'

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
    // PR-08: قص اليوم داخل الشهر بدل ترحيله تلقائيًا إلى الشهر التالي.
    const prev = startDay === 1 ? new Date(y, m - 1, 1) : new Date(y, m - 2, Math.min(startDay, new Date(y, m - 1, 0).getDate()))
    const end = startDay === 1 ? new Date(y, m, 0) : new Date(y, m - 1, Math.min(startDay - 1, new Date(y, m, 0).getDate()))
    return {
      startDate: `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`,
      endDate: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`,
    }
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

  private assertScopeAccess(user: JwtPayload, scope: { scopeType: PayrollScopeType; scopeIds?: number[]; branchId?: number | null }, employees: Employee[]) {
    const branchId = branchScopeOf(user)
    if (branchId === null) return
    const scopeIds = scope.scopeIds?.length ? scope.scopeIds : [scope.branchId]
    if (branchId < 1 || scope.scopeType === 'COMPANY' ||
      (scope.scopeType === 'BRANCH' && scopeIds.some(id => id !== branchId)) ||
      employees.some(emp => emp.branchId !== branchId) ||
      (!employees.length && scope.scopeType !== 'BRANCH')) {
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
    const legacyBranch = run.scopeType === 'BRANCH' && branchIds.length === 1 ? branchIds[0] : null
    if (run.scopeType === 'BRANCH' && branchIds.some(id => id !== branch)) throw new ForbiddenException('نطاق المسير خارج الفرع المسموح لك')
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
      if (run && run.status !== 'CALCULATED') {
        throw this.stateError('إعادة الحساب', run.status)
      }
      if (run) this.requireReason(dto.reason)
      const previousMembers = run ? await members.find({ where: { runId: run.id }, order: { employeeId: 'ASC' } }) : []
      const previousItems = run ? await items.find({ where: { runId: run.id }, order: { employeeId: 'ASC' } }) : []
      const before = run ? { snapshotVersion: run.snapshotVersion ?? 0, totalNet: Number(run.totalNet), members: previousMembers, items: previousItems } : null
      const { startDate, endDate } = run ?? proposedRange
      const existing = Boolean(run)
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
      // معادلات مرنة: شرائح التأخير + معامل الغياب بلا إذن (يوم × المعامل)
      const tiers = await this.latenessTiers.find({
        where: { isActive: true },
        order: { fromMinutes: 'ASC' },
    })
    const absencePenalty = Number(
      await this.cfg('attendance.absence_penalty_days', '1')
    )

    // حلّ النطاق من تعريف المسير المخزّن + تثبيت لقطة الأعضاء
    const definition = {
      scopeType: run.scopeType,
      scopeIds: run.scopeIds ? JSON.parse(run.scopeIds) : undefined,
      employeeIds: run.employeeIds ? JSON.parse(run.employeeIds) : undefined,
      branchId: run.branchId,
    }
    const emps = await this.resolveScope(definition, em.getRepository(Employee))
    this.assertScopeAccess(user, definition, emps)
    await lockPayrollEmployees(em, emps.map(emp => emp.id))
    const covered = []
    const capturedAt = new Date().toISOString()
    const newMembers: PayrollRunMember[] = []
    const orgNames = {
      branches: new Map((await em.getRepository(Branch).find({ select: ['id', 'name'] })).map(row => [row.id, row.name])),
      departments: new Map((await em.getRepository(Department).find({ select: ['id', 'name'] })).map(row => [row.id, row.name])),
      teams: new Map((await em.getRepository(Team).find({ select: ['id', 'name'] })).map(row => [row.id, row.name])),
      costCenters: new Map((await em.getRepository(CostCenter).find({ select: ['id', 'name'] })).map(row => [row.id, row.name])),
    }
    // تحقق الجميع قبل تجسيد الحضور أو استبدال أي بند مالي.
    for (const emp of emps) {
      const cases = await em.getRepository(OffboardingCase).find({ where: { employeeId: emp.id } })
      let coverage: ReturnType<typeof payrollEmploymentCoverage>
      try { coverage = payrollEmploymentCoverage(emp, cases, startDate, endDate) }
      catch (error) {
        if (error instanceof BadRequestException) throw new BadRequestException(`الموظف ${emp.employeeCode}: ${error.message}`)
        throw error
      }
      const snapshot: PayrollMemberSnapshot = {
        version: 1, capturedAt, fullName: emp.fullName, employeeCode: emp.employeeCode, jobTitle: emp.jobTitle ?? null,
        branchId: emp.branchId ?? null, branchName: orgNames.branches.get(emp.branchId) ?? null,
        departmentId: emp.departmentId ?? null, departmentName: orgNames.departments.get(emp.departmentId) ?? null,
        teamId: emp.teamId ?? null, teamName: orgNames.teams.get(emp.teamId) ?? null,
        costCenterId: emp.costCenterId ?? null, costCenterName: orgNames.costCenters.get(emp.costCenterId) ?? null,
        coverFrom: coverage?.coverFrom ?? null, coverTo: coverage?.coverTo ?? null, coverDays: coverage?.coverDays ?? null,
        hireDate: coverage?.hireDate ?? emp.actualStartDate ?? emp.joinDate ?? null,
        leaveDate: coverage?.leaveDate ?? null,
        prorataFactor: null, monthlyDays, basicSalary: null, allowances: null, gross: null, grossEarned: null,
      }
      const member = members.create({ employeeId: emp.id, snapshot,
        membershipStatus: coverage ? 'INCLUDED' : 'EXCLUDED', inclusionSource: run.scopeType === 'CUSTOM' ? 'MANUAL_INCLUDE' : 'SCOPE',
        exclusionReason: coverage ? null : emp.status === 'suspended' ? 'SUSPENDED' : emp.status === 'archived' ? 'ARCHIVED' :
          (emp.actualStartDate || emp.joinDate || '') > endDate ? 'EXC_JOINS_AFTER_PERIOD' :
            cases.some(kase => kase.status !== 'CANCELLED' && kase.lastWorkingDay < startDate) ? 'EXC_TERMINATED_BEFORE_PERIOD' : 'EXC_NO_ACTIVE_EMPLOYMENT',
      })
      newMembers.push(member)
      if (coverage) covered.push({ emp, coverage, member, claims: await getSettlementFinancialClaims(em, emp.id) })
    }
    const conflicts = await findPayrollConflicts(em, run, covered.map(({ emp }) => emp.id))
    const blocking = conflicts.filter(conflict => conflict.blocking)
    if (blocking.length || (conflicts.length && !dto.allowDraftConflicts)) {
      throw new ConflictException({ code: blocking.length ? (blocking.some(row => row.kind === 'OVERLAP') ? 'PAYRUN-DUP-002' : 'PAYRUN-DUP-001') : 'PAYRUN-DRAFT-CONFLICT',
        message: blocking.length ? 'يوجد موظف في مسير معتمد أو مصروف بفترة متداخلة؛ عالج التعارض قبل الحساب' : 'توجد مسودات متعارضة؛ اختر صراحة حفظ مسودة للمراجعة أو عالج العضوية قبل الحساب',
        conflicts: await this.visibleConflicts(user, conflicts, em) })
    }
    const prepared: PayrollItem[] = []

    let totalNet = 0
    for (const { emp, coverage, member, claims } of covered) {
      const { coverFrom, coverTo, coverDays } = coverage
      // الحضور قد يصحح ساعات مصدر الإضافي؛ نقرأ الاستحقاق بعد إتمام التصحيح داخل المعاملة.
      await this.attendanceService.materializeAbsences(emp.id, coverFrom, coverTo, em)
      const monthlyComponents = MONTHLY_SALARY_COMPONENTS.map(component => Number(emp[component.key] ?? 0))
      if (monthlyComponents.some(amount => !Number.isFinite(amount) || amount < 0)) {
        throw new BadRequestException(`الموظف ${emp.employeeCode}: أحد مكونات الراتب غير صالح`)
      }
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
        overlapPolicy: overlapPolicy as AttendanceDeductionPolicy['overlapPolicy'], dailyCapDays, dayRate, minuteRate }
      const attendanceDeductionDays = attRows.map(row => attendanceDeductionDay(row, attendancePolicy,
        this.latenessForDay(row.lateMinutes, tiers, dayRate, minuteRate)))
      // المجموع التاريخي يشمل الأذونات المدفوعة؛ تفصيل اليوم يميز مبلغها صراحةً.
      const latenessDeduction = round2(attendanceDeductionDays.reduce((sum, day) => sum + day.latenessAmount + day.permissionAmount, 0))
      const shortfallMinutes = attRows.reduce((sum, day) => sum + Number(day.shortfallMinutes ?? 0), 0)
      const shortfallDeduction = round2(attendanceDeductionDays.reduce((sum, day) => sum + day.shortfallAmount, 0))

      // 2ب) خصم الغياب بلا إذن: يوم عمل مجدول بلا بصمة ولا إجازة (status='absent')
      // يُخصم بقيمة اليوم × معامل عقوبة الغياب (افتراضي 1، يُضبط لـ1.5/2).
      // (يوم الإجازة يُصنّف 'leave' لا 'absent' فلا ازدواج مع الإجازة غير المدفوعة)
      const absentRows = attRows.filter((r) => r.status === 'absent')
      const absenceDays = absentRows.length
      const absenceDeduction = round2(absenceDays * dayRate * absencePenalty)

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

      // 5) دفتر المديونيات: بنود PENDING سرت فترتها (effectiveDate ضمن الفترة
      // أو فارغة) — DEBIT خصم، CREDIT إضافة. تُقيَّد APPLIED عند الصرف فقط.
      const pendingObligations = (
        await em.getRepository(EmployeeObligation).find({
          where: { employeeId: emp.id, status: 'PENDING' },
        })
      ).filter((o) => !o.effectiveDate || o.effectiveDate <= endDate)
      const otherDeductions = round2(
        pendingObligations
          .filter((o) => o.type === 'DEBIT')
          .reduce((s, o) => s + Number(o.amount), 0)
      )
      const otherAdditions = round2(
        pendingObligations
          .filter((o) => o.type === 'CREDIT')
          .reduce((s, o) => s + Number(o.amount), 0)
      )

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
            prorataFactor: Math.round(prorataFactor * 1e6) / 1e6,
            prorationBasis: 'MONTHLY_DAYS',
            attendanceExemptions,
            attendanceDeductions: { policy: attendancePolicy, days: attendanceDeductionDays,
              totals: { lateMinutes, shortfallMinutes, latenessDeduction, shortfallDeduction } },
            attendanceRules: attRows.map(row => this.attendanceRuleTrace(row)),
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
            obligationIds: pendingObligations.map((o) => o.id),
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
    await this.event(em, user, run.id, existing ? 'RECALCULATED' : 'CREATED', existing ? this.requireReason(dto.reason) : null,
      { before, after, diff, refreshInstallmentPolicy: dto.refreshInstallmentPolicy === true,
        allowDraftConflicts: dto.allowDraftConflicts === true, conflictRunIds: [...new Set(conflicts.map(row => row.otherRunId))] })
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
      const items = await em.getRepository(PayrollItem).find({ where: { runId } })
      const employeeIds = await this.validateRunMembers(em, run, items)
      await lockPayrollEmployees(em, employeeIds)
      await this.assertAttendanceExemptionSnapshot(em, run, items)
      await this.assertAttendanceRuleSnapshot(em, run, items)
      await this.assertSettlementBoundary(em, items)
      await claimPayrollPeriod(em, run, employeeIds)
      for (const item of items) {
        const plan = await this.installmentPlanForItem(em, run, item)
        if (plan) await reservePayrollInstallments(em, item.employeeId, run.id, run.snapshotVersion, user.sub, plan)
      }
      run.status = 'APPROVED'
      run.approvedBy = user.sub
      run.approvedAt = new Date()
      await runs.save(run)
      await this.event(em, user, run.id, 'APPROVED', null, { snapshotVersion: run.snapshotVersion, employeeIds, totalNet: Number(run.totalNet) })
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
        // بنود دفتر المديونيات → APPLIED (تُستهلك مرة واحدة، لا تتكرر)
        if (breakdown.obligationIds?.length) {
          const updated = await em.getRepository(EmployeeObligation).update(
            { id: In(breakdown.obligationIds), employeeId: item.employeeId, status: 'PENDING' },
            { status: 'APPLIED', appliedPayrollRunId: runId, appliedAt: new Date() }
          )
          if (updated.affected !== new Set(breakdown.obligationIds).size) throw new ConflictException('أحد بنود التسوية استُهلك بالفعل؛ راجع المسير')
        }
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
    return { ...run, items, members, conflicts, pendingOvertime }
    })
  }

  async reopen(user: JwtPayload, runId: number, reason: string) {
    if (!userHasPerm(user, 'payroll.reopen')) throw new ForbiddenException('ليست لديك صلاحية إعادة فتح المسير')
    await this.changeRunState(user, runId, 'APPROVED', 'CALCULATED', 'REOPENED', this.requireReason(reason))
    return this.detail(user, runId)
  }

  async cancel(user: JwtPayload, runId: number, reason: string) {
    if (!userHasPerm(user, 'payroll.cancel')) throw new ForbiddenException('ليست لديك صلاحية إلغاء المسير')
    await this.changeRunState(user, runId, 'CALCULATED', 'CANCELLED', 'CANCELLED', this.requireReason(reason))
    return this.detail(user, runId)
  }

  private async changeRunState(user: JwtPayload, runId: number, expected: PayrollRun['status'], status: PayrollRun['status'], eventType: string, reason: string) {
    await this.runs.manager.transaction(async em => {
      await this.lockRun(em, runId)
      const runs = em.getRepository(PayrollRun)
      const run = await runs.findOneBy({ id: runId })
      if (!run) throw new NotFoundException('المسير غير موجود')
      await this.assertRunAccess(user, run, em)
      if (run.status !== expected) throw this.stateError(eventType === 'REOPENED' ? 'إعادة فتح المسير' : 'إلغاء المسير', run.status)
      const items = await em.getRepository(PayrollItem).find({ where: { runId } })
      const members = await em.getRepository(PayrollRunMember).find({ where: { runId } })
      await lockPayrollEmployees(em, [...members, ...items].map(row => row.employeeId))
      const before = { status: run.status, approvedBy: run.approvedBy, approvedAt: run.approvedAt }
      await releasePayrollClaims(em, runId)
      await releasePayrollInstallments(em, runId, user.sub, reason)
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
    return { item, run, employee, member, identitySource: snapshot ? 'SNAPSHOT' : 'CURRENT_NAME_ONLY' }
    })
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
