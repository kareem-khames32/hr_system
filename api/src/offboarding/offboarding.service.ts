import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, In, Not, Repository } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, userHasPerm } from '../auth/guards'
import { User } from '../auth/user.entity'
import { Employee } from '../employees/employee.entity'
import { grossMonthlySalary } from '../employees/compensation'
import { LeaveBalancesService } from '../requests/leave-balances.service'
import { ApproverResolver } from '../requests/approver-resolver.service'
import { Asset, CustodyAssignment } from '../requests/entities/custody.entities'
import { EmployeeObligation } from '../requests/entities/financial.entities'
import { EmployeeStatusHistory } from '../requests/entities/employment.entities'
import { recordEmployeeChange } from '../employees/employee-change-log'
import { OvertimeEntry } from '../requests/entities/attendance.entities'
import { Loan, LoanInstallment } from '../requests/entities/financial.entities'
import { LeaveBalance } from '../requests/entities/leave.entities'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { PayrollItem, PayrollRun } from '../payroll/payroll.entities'
import { getSettlementFinancialClaims, lockPayrollEmployees, type SettlementFinancialSnapshot } from '../payroll/payroll-settlement-boundary'
import { assertSettlementSalaryMatchesRun, readPayrollSettlementSalary, settlementSalaryLineLabel } from '../payroll/payroll-settlement-salary'
// C8 / الخطوة 31: بند مسير عُكس صرفه بسطر منفذ لا يحجز مصادر إضافيه وأقساطه عن التصفية
import { payrollLineNotReversedSql } from '../payroll/payroll-reversal-sql'
import { legacyInstallmentNumber, readLoanInstallmentPositions } from '../payroll/payroll-installment-balances'
import { assertNoHeldLoanInstallments, isPayrollInstallmentPlan } from '../payroll/payroll-installment-ledger'
import { recordSettlementLoanRecovery } from '../loans/loan-recovery'
import { PayrollDecimal } from '../payroll/payroll-decimal'
import { assertUniqueOvertimeDays, legacyExemptOvertimeSource, overtimeFinancialValue, projectOvertimeFinancialValue, type LegacyExplicitOvertimeRequest, type OvertimeFinancialValue } from '../payroll/overtime-financial'
import { loadAttendanceExemptions, exemptionPolicyOnDate } from '../attendance/attendance-exemption-resolver'
import {
  buildEosPolicy,
  caseReason,
  computeEos,
  EOS_DEFAULTS,
  eosLineLabel,
  isValidYmd,
  serviceYears,
  TERMINATION_REASON_LABELS,
} from './eos'
import {
  ClearanceItem,
  ClearanceParty,
  OffboardingCase,
  SettlementLine,
  TerminationReason,
} from './offboarding.entities'
import {
  OPEN_CASE_STATUSES,
  OPEN_CUSTODY_STATUSES,
  openOffboardingCase,
} from './offboarding-open'

const localToday = () => {
  const now = new Date()
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')
}

// D4 / CQ-04 (الخطوة 22): تقريب التصفية هو تقريب المسير ونهاية الخدمة نفسه (roundPayrollMoney).
import { roundPayrollMoney as round2 } from '../payroll/payroll-money'

// صلاحية كل جهة في الـ checklist
const PARTY_PERMS: Record<ClearanceParty, string[]> = {
  manager: [], // المدير المباشر يُتحقق منه هيكلياً
  custody: ['custody.assign', 'approve.custody'],
  it: ['approve.it'],
  finance: ['approve.finance'],
  hr: ['offboarding.manage'],
}

// الجهات بالصلاحية مقفولة على فرع الموظف (القاعدة الأساسية للعزل) — مثل صندوق
// الموافقات؛ نطاق null (مدير النظام) = كل الفروع
const inBranchScope = (user: JwtPayload, branchId?: number | null) => {
  const scope = branchScopeOf(user)
  return scope === null || branchId === scope
}

// SEC-EMP-1: الموظف داخل الملف projection مختصر — الهوية والراتب والبنك
// لأصحاب التصفية (settlement.edit/approve) فقط
const EMP_BRIEF: (keyof Employee)[] = [
  'id', 'employeeCode', 'fullName', 'fullNameEn', 'jobTitle',
  'branchId', 'departmentId', 'teamId', 'status', 'joinDate',
]
const EMP_SETTLEMENT: (keyof Employee)[] = [
  'nationalId', 'basicSalary', 'housingAllowance', 'transportAllowance',
  'otherAllowance', 'phoneAllowance', 'workNatureAllowance', 'payMethod', 'bankName', 'iban',
]
const pickFields = (o: Employee, keys: (keyof Employee)[]) => {
  const out: Partial<Record<keyof Employee, unknown>> = {}
  for (const k of keys) out[k] = o[k]
  return out
}

// HRC-07: بند مكافأة نهاية الخدمة التلقائي (تسميته الحالية والقديمة تبدأ بهذا النص)
const EOS_LINE_PREFIX = 'مكافأة نهاية الخدمة'
const isAutoEosLine = (line: Pick<SettlementLine, 'isAuto' | 'type' | 'label'>) =>
  !!line.isAuto && line.type === 'CREDIT' && String(line.label ?? '').startsWith(EOS_LINE_PREFIX)
const money = (n: number) => round2(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// الاعتماد يرفض لو بند المكافأة التلقائي المحفوظ مختلف عن computeEos بالسياسة الحالية
// (حالة محسوبة بالطريقة القديمة، أو مبلغ آلي عُدّل يدويًا، أو تسمية آلية غُيّرت فلا يُعرف
// البند) — الفرق المتفق عليه يُضاف كبند تسوية يدوي بعد إعادة التوليد
export function assertEosLineMatchesPolicy(stored: Array<Pick<SettlementLine, 'isAuto' | 'type' | 'label' | 'amount'>>, fresh: Array<Partial<SettlementLine>>) {
  const expected = fresh.filter(row => isAutoEosLine(row as SettlementLine)).reduce((sum, row) => round2(sum + Number(row.amount ?? 0)), 0)
  const found = stored.filter(isAutoEosLine)
  const actual = found.reduce((sum, row) => round2(sum + Number(row.amount ?? 0)), 0)
  if (found.length > 1 || actual !== expected || (expected > 0 && found.length !== 1)) {
    throw new ConflictException(
      `مكافأة نهاية الخدمة في التصفية (${found.length ? money(actual) : 'غير موجودة'}) لا تطابق حساب السياسة الحالية (${money(expected)}) — ` +
      'أعد توليد البنود وراجعها قبل الاعتماد، وأضف أي فرق متفق عليه كبند تسوية يدوي'
    )
  }
}

// صافي التصفية من بنودها الحالية (إضافات − خصومات)
const netOf = (lines: SettlementLine[]) =>
  round2(
    lines.reduce(
      (s, l) => s + (l.type === 'CREDIT' ? 1 : -1) * Number(l.amount),
      0
    )
  )

@Injectable()
export class OffboardingService implements OnApplicationBootstrap {
  private readonly logger = new Logger(OffboardingService.name)

  constructor(
    @InjectRepository(OffboardingCase)
    private readonly cases: Repository<OffboardingCase>,
    @InjectRepository(ClearanceItem)
    private readonly items: Repository<ClearanceItem>,
    @InjectRepository(SettlementLine)
    private readonly lines: Repository<SettlementLine>,
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(CustodyAssignment)
    private readonly custody: Repository<CustodyAssignment>,
    @InjectRepository(Asset)
    private readonly assets: Repository<Asset>,
    @InjectRepository(EmployeeObligation)
    private readonly obligations: Repository<EmployeeObligation>,
    @InjectRepository(LeaveBalance)
    private readonly balances: Repository<LeaveBalance>,
    @InjectRepository(OvertimeEntry)
    private readonly overtime: Repository<OvertimeEntry>,
    @InjectRepository(Loan) private readonly loans: Repository<Loan>,
    @InjectRepository(LoanInstallment)
    private readonly installments: Repository<LoanInstallment>,
    @InjectRepository(EmployeeStatusHistory)
    private readonly history: Repository<EmployeeStatusHistory>,
    @InjectRepository(RequestsConfig)
    private readonly config: Repository<RequestsConfig>,
    private readonly resolver: ApproverResolver,
    private readonly leaveBalances: LeaveBalancesService
  ) {}

  // SPEC①/ح٢-ب: كل تغييرات التصفية المالية تمر بنفس قفل حساب وصرف المسير.
  private async withFinancialCase<T>(caseId: number, work: (service: OffboardingService) => Promise<T>) {
    return this.cases.manager.transaction(async em => {
      const identity = await em.getRepository(OffboardingCase).findOne({ where: { id: caseId } })
      if (!identity) throw new NotFoundException('الحالة غير موجودة')
      await lockPayrollEmployees(em, [identity.employeeId])
      return work(this.usingManager(em))
    })
  }

  private usingManager(em: EntityManager) {
    return new OffboardingService(
      em.getRepository(OffboardingCase), em.getRepository(ClearanceItem), em.getRepository(SettlementLine),
      em.getRepository(Employee), em.getRepository(User), em.getRepository(CustodyAssignment), em.getRepository(Asset),
      em.getRepository(EmployeeObligation), em.getRepository(LeaveBalance), em.getRepository(OvertimeEntry),
      em.getRepository(Loan), em.getRepository(LoanInstallment), em.getRepository(EmployeeStatusHistory),
      em.getRepository(RequestsConfig), this.resolver, this.leaveBalances,
    )
  }

  private async payrollFinancialClaims(employeeId: number) {
    const rows = await this.lines.manager.getRepository(PayrollItem).createQueryBuilder('item')
      .innerJoin(PayrollRun, 'run', 'run.id = item.runId')
      .where('item.employeeId = :employeeId', { employeeId })
      .andWhere('run.status IN (:...statuses)', { statuses: ['CALCULATED', 'IN_REVIEW', 'APPROVED', 'PAID'] })
      .andWhere(payrollLineNotReversedSql('item.runId', 'item.employeeId'))
      .getMany()
    const overtime = new Set<number>(), installments = new Set<number>()
    for (const row of rows) {
      const invalid = () => new ConflictException(`المسير #${row.runId} يتضمن بيانات مالية تاريخية بلا مراجع سليمة؛ راجع تفاصيله قبل التصفية`)
      let data: Record<string, unknown>
      try {
        data = row.breakdown ? JSON.parse(row.breakdown) : {}
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw invalid()
      } catch { throw invalid() }
      const newInstallmentPlan = data.installmentPlan != null
      if (newInstallmentPlan && !isPayrollInstallmentPlan(data.installmentPlan)) throw invalid()
      for (const [key, amount, output] of [
        ['overtimeEntryIds', row.overtimeAmount, overtime], ['installmentIds', row.loanInstallments, installments],
      ] as const) {
        // المسودة الجديدة لا تحجز؛ HELD يوقف التصفية قبل القراءة، والمصدر المصروف مغلق في قارئ الرصيد.
        // لا نمد حجز parent إلى child، ولا نغيّر حالات حجز الإضافي أو تفسير المسير التاريخي.
        if (key === 'installmentIds' && newInstallmentPlan) continue
        const ids = data[key]
        if (ids === undefined && Number(amount) === 0) continue
        if (!Array.isArray(ids) || ids.some(id => !Number.isSafeInteger(id) || id <= 0) || (Number(amount) > 0 && !ids.length)) throw invalid()
        for (const id of ids) output.add(id)
      }
    }
    return { overtime, installments }
  }

  private async hasPendingFinancialSources(employeeId: number) {
    if (await this.overtime.count({ where: { employeeId, status: 'APPROVED' } })) return true
    return (await readLoanInstallmentPositions(this.lines.manager, employeeId))
      .some(row => legacyInstallmentNumber(row.remainingAmount) > 0)
  }

  // ===== EMP-1: إنهاء الخدمة من طرف الشركة =====
  // فصل/انتهاء عقد/وفاة/تقاعد... بنفس دورة الاستقالة: فترة إشعار + ملف إخلاء بجهاته
  // الخمس → تصفية بمكافأة حسب السبب → إغلاق عند حلول آخر يوم عمل.
  // HR (offboarding.manage) في فرع الموظف فقط — خارج الفرع 404 مثل ملف الموظف
  async create(
    user: JwtPayload,
    dto: {
      employeeId: number
      reason: TerminationReason
      lastWorkingDay: string
      noticeDate?: string
      notes?: string
      exitInterviewNotes?: string
      revokeAccess?: boolean
    }
  ) {
    const emp = await this.employees.findOne({ where: { id: dto.employeeId } })
    if (!emp || !inBranchScope(user, emp.branchId)) {
      throw new NotFoundException('الموظف غير موجود')
    }
    const blocked = await this.terminationBlock(user, emp, dto)
    if (blocked) throw new BadRequestException(blocked)

    // الوفاة (أو طلب صريح زي الفصل): الحساب يتوقف فوراً — غير كده يفضل شغال
    // لحد الإغلاق زي الاستقالة. إلغاء الملف يرجّعه
    const revoke = dto.reason === 'death' || !!dto.revokeAccess
    const oldStatus = emp.status
    const kase = await this.cases.manager.transaction(async (em) => {
      const opened = await openOffboardingCase(em, {
        employeeId: emp.id,
        terminationReason: dto.reason,
        lastWorkingDay: dto.lastWorkingDay,
        noticeDate: dto.noticeDate || undefined,
        notes: dto.notes?.trim() || undefined,
        exitInterviewNotes: dto.exitInterviewNotes?.trim() || undefined,
        openedBy: user.sub,
        accessRevokedAt: revoke ? new Date() : undefined,
      })
      await em
        .getRepository(Employee)
        .update({ id: emp.id }, { status: 'notice_period' })
      if (revoke) {
        await em
          .getRepository(User)
          .update({ employeeId: emp.id }, { isActive: false })
      }
      await recordEmployeeChange(em, {
        employeeId: emp.id,
        fieldName: 'status', oldValue: oldStatus, newValue: 'notice_period', changedByUserId: user.sub,
        reason: `إنهاء خدمة (${TERMINATION_REASON_LABELS[dto.reason]}) — آخر يوم عمل ${dto.lastWorkingDay} — ملف #${opened.id}`,
      })
      return opened
    })
    this.logger.log(
      `فُتح ملف إنهاء خدمة #${kase.id} (${dto.reason}) للموظف #${emp.id} — بواسطة المستخدم #${user.sub}`
    )
    return this.detail(kase.id, user)
  }

  // EMP-1: معاينة معالج «إنهاء الخدمة» — نفس حساب التصفية الآلي (بلا حفظ) بسبب
  // الإنهاء وآخر يوم عمل، والعهد المفتوحة، وموانع الفتح. المبالغ لأصحاب التصفية فقط
  async preview(
    user: JwtPayload,
    q: { employeeId: number; reason: TerminationReason; lastWorkingDay: string }
  ) {
    const emp = await this.employees.findOne({ where: { id: q.employeeId } })
    if (!emp || !inBranchScope(user, emp.branchId)) {
      throw new NotFoundException('الموظف غير موجود')
    }
    if (!isValidYmd(q.lastWorkingDay)) {
      throw new BadRequestException('آخر يوم عمل تاريخ غير صالح')
    }
    const seesMoney =
      userHasPerm(user, 'settlement.edit') ||
      userHasPerm(user, 'settlement.approve')
    const policy = await this.eosPolicy()
    // أشهر الأجر والمعامل بلا مبالغ — المبلغ نفسه بند في التصفية أدناه
    const eos = computeEos(
      0,
      serviceYears(this.joinDateOf(emp), q.lastWorkingDay),
      q.reason,
      policy
    )
    const open = await this.custody.find({
      where: { employeeId: emp.id, status: In(OPEN_CUSTODY_STATUSES) },
      order: { id: 'ASC' },
    })
    const assets = open.length
      ? await this.assets.find({ where: { id: In(open.map((c) => c.assetId)) } })
      : []
    const assetById = new Map(assets.map((a) => [a.id, a]))
    const lines = seesMoney
      ? ((await this.buildSettlement(
          {
            id: 0,
            employeeId: emp.id,
            lastWorkingDay: q.lastWorkingDay,
            terminationReason: q.reason,
          } as OffboardingCase,
          true,
          true
        )) ?? [])
      : []
    return {
      employeeId: emp.id,
      reason: q.reason,
      lastWorkingDay: q.lastWorkingDay,
      blockReason: await this.terminationBlock(user, emp, q),
      serviceYears: round2(eos.years),
      eos: {
        firstYears: round2(eos.firstYears),
        laterYears: round2(eos.laterYears),
        firstTierMonths: policy.firstTierMonths,
        laterMonths: policy.laterMonths,
        fullMonths: round2(eos.fullMonths),
        factor: eos.factor,
        factorLabel: eos.factorLabel,
      },
      openCustody: open.map((c) => ({
        id: c.id,
        status: c.status,
        assetName: assetById.get(c.assetId)?.name ?? `#${c.assetId}`,
        serialNumber: assetById.get(c.assetId)?.serialNumber ?? null,
      })),
      canViewSettlement: seesMoney,
      ...(seesMoney
        ? {
            lines: lines.map(({ label, type, amount }) => ({ label, type, amount })),
            net: netOf(lines as SettlementLine[]),
          }
        : {}),
    }
  }

  // الحالات اللي يتفتح منها ملف إنهاء — «فترة إشعار» معناها ملف مفتوح بالفعل
  private static readonly TERMINABLE = ['active', 'probation', 'suspended']
  private static readonly STATUS_AR: Record<string, string> = {
    notice_period: 'فترة إشعار',
    terminated: 'منتهية خدمته',
    archived: 'مؤرشف',
  }

  // موانع فتح ملف الإنهاء — مشتركة بين المعاينة والإنشاء (null = مسموح)
  private async terminationBlock(
    user: JwtPayload,
    emp: Employee,
    dto: { lastWorkingDay: string; noticeDate?: string }
  ): Promise<string | null> {
    if (!!user.employeeId && user.employeeId === emp.id) {
      return 'لا يمكنك إنهاء خدمتك بنفسك — قدّم طلب استقالة'
    }
    const open = await this.cases.findOne({
      where: { employeeId: emp.id, status: In(OPEN_CASE_STATUSES) },
    })
    if (open) {
      return `يوجد ملف إنهاء خدمة مفتوح لهذا الموظف (#${open.id}) — أكمله أو ألغِه أولاً`
    }
    if (!OffboardingService.TERMINABLE.includes(emp.status)) {
      return `حالة الموظف (${OffboardingService.STATUS_AR[emp.status] ?? emp.status}) لا تسمح بفتح ملف إنهاء خدمة`
    }
    if (!isValidYmd(dto.lastWorkingDay)) return 'آخر يوم عمل تاريخ غير صالح'
    const joined = this.joinDateOf(emp)
    if (dto.lastWorkingDay < joined) {
      return `آخر يوم عمل قبل تاريخ التعيين (${joined})`
    }
    if (dto.noticeDate) {
      if (!isValidYmd(dto.noticeDate)) return 'تاريخ الإشعار غير صالح'
      if (dto.noticeDate > dto.lastWorkingDay) return 'تاريخ الإشعار بعد آخر يوم عمل'
    }
    return null
  }

  // تاريخ التعيين 'YYYY-MM-DD' — بلا تاريخ تعيين: تاريخ إنشاء الملف
  private joinDateOf(emp: Employee): string {
    return emp.joinDate
      ? String(emp.joinDate).slice(0, 10)
      : new Date(emp.createdAt).toISOString().slice(0, 10)
  }

  // EMP-2: سياسة مكافأة نهاية الخدمة من إعدادات المحرك (eos.*)
  private async eosPolicy() {
    return buildEosPolicy({
      firstTierMonths: await this.cfg('eos.months_per_year', EOS_DEFAULTS.firstTierMonths),
      firstTierYears: await this.cfg('eos.tier1_years', EOS_DEFAULTS.firstTierYears),
      laterMonths: await this.cfg('eos.months_per_year_after', EOS_DEFAULTS.laterMonths),
      resignationFactors: await this.cfg(
        'eos.resignation_factors',
        EOS_DEFAULTS.resignationFactors
      ),
      reasonFactors: await this.cfg('eos.reason_factors', EOS_DEFAULTS.reasonFactors),
    })
  }

  // ===== القائمة والتفاصيل =====
  // SEC-EMP-1: ملفات موظفي فرعي فقط (مدير النظام كل الفروع) — وصافي التصفية
  // في القائمة لأصحاب التصفية فقط
  async list(user: JwtPayload) {
    const seesMoney =
      userHasPerm(user, 'settlement.edit') ||
      userHasPerm(user, 'settlement.approve')
    const rows = await this.cases.find({ order: { createdAt: 'DESC' } })
    const empIds = [...new Set(rows.map((c) => c.employeeId))]
    const emps = empIds.length
      ? await this.employees.find({ where: { id: In(empIds) } })
      : []
    const byId = new Map(emps.map((e) => [e.id, e]))
    const visible = rows.filter((c) =>
      inBranchScope(user, byId.get(c.employeeId)?.branchId)
    )
    return visible.map(({ settlementNet, settlementFinancialSnapshot: _financialSnapshot, ...c }) => ({
      ...c,
      openedByUserId: c.openedBy ?? null, settlementApprovedByUserId: c.settlementApprovedBy ?? null,
      ...(seesMoney ? { settlementNet } : {}),
      employeeName: byId.get(c.employeeId)?.fullName ?? `#${c.employeeId}`,
      employeeCode: byId.get(c.employeeId)?.employeeCode ?? '',
    }))
  }

  // SEC-EMP-1: التفاصيل لـ HR (offboarding.manage)، أصحاب التصفية، الموظف نفسه،
  // مديره المباشر، وجهة إخلاء لها بند في الملف — وأي حد تاني 403.
  // HR وأصحاب التصفية والجهات في فرع الموظف فقط؛ خارج الفرع 404 مثل ملف الموظف.
  // المبالغ (بنود التصفية/الصافي/خصومات البنود) والراتب لأصحاب التصفية فقط
  async detail(id: number, user: JwtPayload) {
    const kase = await this.cases.findOne({ where: { id } })
    if (!kase) throw new NotFoundException('حالة إنهاء الخدمة غير موجودة')
    const items = await this.items.find({
      where: { caseId: id },
      order: { id: 'ASC' },
    })
    // الموظف قبل فحص الوصول — فرعه نطاق جهات الإخلاء
    const employee = await this.employees.findOne({
      where: { id: kase.employeeId },
    })
    const access = await this.accessOf(user, kase, items, employee?.branchId)
    if (!access.canView) {
      // خارج نطاق الفرع = الملف غير موجود بالنسبة لك (نفس عزل /employees/:id)
      if (!access.inScope) {
        throw new NotFoundException('حالة إنهاء الخدمة غير موجودة')
      }
      throw new ForbiddenException('لا تملك صلاحية عرض ملف إنهاء الخدمة هذا')
    }
    // العهد المفتوحة — بند العهدة لا يكتمل وهي موجودة
    const openCustodyCount = await this.custody.count({
      where: {
        employeeId: kase.employeeId,
        status: In(['PENDING_ACK', 'PENDING_MANAGER_CONFIRM', 'ACTIVE', 'RETURN_REQUESTED']),
      },
    })
    const inClearance = kase.status === 'IN_CLEARANCE'
    const { settlementNet, settlementFinancialSnapshot: _financialSnapshot, ...caseInfo } = kase
    const base = {
      ...caseInfo,
      openedByUserId: kase.openedBy ?? null, settlementApprovedByUserId: kase.settlementApprovedBy ?? null,
      employee: employee
        ? pickFields(
            employee,
            access.seesMoney ? [...EMP_BRIEF, ...EMP_SETTLEMENT] : EMP_BRIEF
          )
        : null,
      items: items.map(({ amount, note, ...item }) => {
        const mine = access.isParty(item.party)
        return {
          ...item,
          doneByUserId: item.doneBy ?? null,
          // خصم البند: لأصحاب التصفية أو للجهة صاحبة البند
          ...(access.seesMoney || mine ? { amount } : {}),
          // ملاحظة البند قد تشرح خصماً — لأصحاب التصفية وHR والجهة صاحبة البند
          ...(access.seesMoney || access.isHr || mine ? { note } : {}),
          // زر «إتمام البند» — نفس تفويض completeItem
          canAct: inClearance && item.status !== 'DONE' && (access.isHr || mine),
        }
      }),
      openCustodyCount,
      canViewSettlement: access.seesMoney,
    }
    if (!access.seesMoney) return base
    const lines = await this.lines.find({
      where: { caseId: id },
      order: { id: 'ASC' },
    })
    return { ...base, settlementNet, lines, net: netOf(lines) }
  }

  // من يصل للملف وبأي صفة — مصدر واحد للتفاصيل و«بنود إخلاء عليّ»
  // empBranchId: فرع صاحب الملف — نطاق HR وأصحاب التصفية وجهات الإخلاء
  private async accessOf(
    user: JwtPayload,
    kase: OffboardingCase,
    items: ClearanceItem[],
    empBranchId?: number | null
  ) {
    // الوصول بالصلاحية (HR/أصحاب التصفية/الجهات) مقفول على فرع الموظف — والموظف
    // نفسه ومديره المباشر هيكلياً وصولهم بلا قيد فرع
    const inScope = inBranchScope(user, empBranchId)
    const isHr = inScope && userHasPerm(user, 'offboarding.manage')
    const seesMoney =
      inScope &&
      (userHasPerm(user, 'settlement.edit') ||
        userHasPerm(user, 'settlement.approve'))
    const isOwner = !!user.employeeId && user.employeeId === kase.employeeId
    // المدير المباشر هيكلياً — نفس فحص completeItem
    const isManager =
      !!user.employeeId &&
      (await this.resolver.directManagerOf(kase.employeeId)) === user.employeeId
    // الجهة بصلاحياتها (PARTY_PERMS) في فرع الموظف فقط
    const isParty = (party: string) =>
      party === 'manager'
        ? isManager
        : inScope &&
          (PARTY_PERMS[party as ClearanceParty] ?? []).some((p) =>
            userHasPerm(user, p)
          )
    return {
      inScope,
      isHr,
      seesMoney,
      isParty,
      canView:
        isHr ||
        seesMoney ||
        isOwner ||
        isManager ||
        items.some((i) => isParty(i.party)),
    }
  }

  // ===== إتمام بند إخلاء طرف =====
  async completeItem(
    user: JwtPayload,
    itemId: number,
    dto: { note?: string; amount?: number }
  ) {
    const item = await this.items.findOne({ where: { id: itemId } })
    if (!item) throw new NotFoundException('البند غير موجود')
    await this.withFinancialCase(item.caseId, tx => tx.completeItemLocked(user, itemId, dto))
    return this.detail(item.caseId, user)
  }

  private async completeItemLocked(user: JwtPayload, itemId: number, dto: { note?: string; amount?: number }) {
    const item = await this.items.findOne({ where: { id: itemId } })
    if (!item) throw new NotFoundException('البند غير موجود')
    if (item.status === 'DONE') {
      throw new BadRequestException('البند مكتمل بالفعل')
    }
    const kase = await this.cases.findOne({ where: { id: item.caseId } })
    if (!kase || kase.status !== 'IN_CLEARANCE') {
      throw new BadRequestException('الحالة ليست في مرحلة إخلاء الطرف')
    }

    // التفويض: المدير المباشر هيكلياً، والجهات وHR بصلاحياتهم في فرع الموظف
    // (الأدمن نطاقه كل الفروع) — نفس نطاق accessOf/canAct (SEC-EMP-1)
    const emp = await this.employees.findOne({ where: { id: kase.employeeId } })
    const inScope = inBranchScope(user, emp?.branchId)
    const isHr = inScope && userHasPerm(user, 'offboarding.manage')
    if (!isHr) {
      if (item.party === 'manager') {
        const mgr = await this.resolver.directManagerOf(kase.employeeId)
        if (user.employeeId !== mgr) {
          throw new ForbiddenException('بند المدير المباشر يعتمده المدير المباشر')
        }
      } else {
        const allowed = PARTY_PERMS[item.party as ClearanceParty] ?? []
        if (!allowed.some((p) => userHasPerm(user, p))) {
          throw new ForbiddenException('لا تملك صلاحية هذه الجهة')
        }
        // الجهة تعتمد بنود موظفي فرعها فقط
        if (!inScope) {
          throw new ForbiddenException(
            'الموظف خارج نطاق فرعك — جهة الإخلاء تعتمد بنود فرعها فقط'
          )
        }
      }
    }

    // §2.7: بند العهدة لا يكتمل والموظف ماسك عهدة
    if (item.party === 'custody') {
      const open = await this.custody.count({
        where: {
          employeeId: kase.employeeId,
          status: In(['PENDING_ACK', 'PENDING_MANAGER_CONFIRM', 'ACTIVE', 'RETURN_REQUESTED']),
        },
      })
      if (open > 0) {
        throw new BadRequestException(
          `الموظف لا يزال ماسكاً ${open} عهدة — أرجعها أولاً (أو وثّق قيمتها كخصم وحوّلها LOST)`
        )
      }
    }

    item.status = 'DONE'
    item.note = dto.note ?? item.note
    if (dto.amount !== undefined) item.amount = dto.amount
    item.doneBy = user.sub
    item.doneAt = new Date()
    await this.items.save(item)

    // كل البنود اكتملت؟ → بناء التصفية والانتقال لمرحلتها
    const remaining = await this.items.count({
      where: { caseId: kase.id, status: Not('DONE') },
    })
    if (remaining === 0) {
      const financial: { snapshot?: SettlementFinancialSnapshot } = {}
      await this.buildSettlement(kase, false, false, financial)
      if (financial.snapshot) kase.settlementFinancialSnapshot = financial.snapshot
      kase.status = 'IN_SETTLEMENT'
      await this.cases.save(kase)
    }
  }

  private async cfg(key: string, fallback: string) {
    const row = await this.config.findOne({ where: { key } })
    return row?.value ?? fallback
  }

  // إعادة توليد البنود التلقائية (قبل الاعتماد): تحذف الآلية وتبنيها
  // من الأرقام الحالية — البنود اليدوية لا تُمس
  async recalcLines(user: JwtPayload, caseId: number) {
    await this.withFinancialCase(caseId, async tx => {
      const kase = await tx.editableCase(caseId, user)
      const financial: { snapshot?: SettlementFinancialSnapshot } = {}
      // التوليد قبل الحذف حتى لا يؤدي رفض البيانات التاريخية إلى محو بنود المراجع.
      const rows = await tx.buildSettlement(kase, true, true, financial)
      await tx.lines.delete({ caseId, isAuto: true })
      const saved = rows?.length ? await tx.lines.save(tx.lines.create(rows)) : []
      if (financial.snapshot) {
        tx.attachFinancialLines(financial.snapshot, saved)
        await tx.cases.update(caseId, { settlementFinancialSnapshot: financial.snapshot })
      }
    })
    return this.detail(caseId, user)
  }

  // حذف بند (قبل الاعتماد فقط) — أي بند، والآلي يرجع بإعادة التوليد
  async deleteLine(user: JwtPayload, lineId: number) {
    const line = await this.lines.findOne({ where: { id: lineId } })
    if (!line) throw new NotFoundException('البند غير موجود')
    await this.withFinancialCase(line.caseId, async tx => {
      await tx.editableCase(line.caseId, user)
      await tx.lines.delete({ id: lineId, caseId: line.caseId })
    })
    return this.detail(line.caseId, user)
  }

  // ===== §2.8: بناء بنود التصفية آلياً من مالية الموظف الفعلية =====
  private async buildSettlement(kase: OffboardingCase, force = false, dryRun = false, financial?: { snapshot?: SettlementFinancialSnapshot }) {
    if (!force) {
      const existing = await this.lines.count({ where: { caseId: kase.id } })
      if (existing > 0) return // مبنية من قبل
    }
    const emp = await this.employees.findOne({ where: { id: kase.employeeId } })
    if (!emp) return
    // الحجز الجديد قد يستهلك جزءًا وينقل باقي القسط عند الصرف؛ لا نخفي الباقي من التصفية أثناء انتظار الصرف.
    await assertNoHeldLoanInstallments(this.lines.manager, emp.id)

    const gross = grossMonthlySalary(emp)
    const dayRate = gross / Number(await this.cfg('payroll.monthly_days', '30'))

    const rows: Partial<SettlementLine>[] = []

    // (+) مكافأة نهاية الخدمة — صيغة قابلة للإعداد:
    // شهور لكل سنة خدمة (الافتراضي 0.5 شهر/سنة — راجِعها مع القانوني)
    const policy = await this.eosPolicy()
    const eos = computeEos(gross, serviceYears(this.joinDateOf(emp), kase.lastWorkingDay), caseReason(kase), policy)
    if (eos.amount > 0) {
      rows.push({
        caseId: kase.id,
        label: eosLineLabel(eos, policy),
        type: 'CREDIT',
        amount: eos.amount,
        isAuto: true,
      })
    }

    // (+) راتب آخر شهر — المصدر الوحيد بند المسير للشهر اللي فيه آخر يوم عمل (قرار المالك 20 سبتمبر).
    // نفس التغطية والتناسب والخصومات اللي حسبها المسير، فمستحيل الرقمين يختلفوا، والمسير مستبعده من كشف البنك والمستحق للصرف.
    const runSalary = await readPayrollSettlementSalary(this.lines.manager, emp.id, kase.lastWorkingDay)
    if (runSalary.found && runSalary.runId && runSalary.amount !== 0) {
      rows.push({ caseId: kase.id, label: settlementSalaryLineLabel(runSalary.period ?? '', runSalary.runId),
        type: runSalary.amount > 0 ? 'CREDIT' : 'DEBIT', amount: round2(Math.abs(runSalary.amount)), isAuto: true })
    }

    // (+) بدل رصيد الإجازات المتبقي (encashment)
    const annual = await this.leaveBalances.balanceOf(emp.id, 'annual', kase.lastWorkingDay, true)
    if (annual && annual.remaining > 0) {
      rows.push({ caseId: kase.id, label: 'بدل رصيد إجازات (' + annual.remaining + ' يوم)',
        type: 'CREDIT', amount: round2(annual.remaining * dayRate), isAuto: true })
    }

    // (+) أوفرتايم معتمد لم يُصرف — كل قيد بمُضاعِفه المخزّن (عطلة/عادي)
    const allUnpaidOt = await this.overtime.find({
      where: { employeeId: emp.id, status: 'APPROVED' },
    })
    const allInstallments = (await readLoanInstallmentPositions(this.lines.manager, emp.id))
      .filter(row => legacyInstallmentNumber(row.remainingAmount) > 0)
    const claimed = allUnpaidOt.length || allInstallments.length
      ? await this.payrollFinancialClaims(emp.id)
      : { overtime: new Set<number>(), installments: new Set<number>() }
    if (allUnpaidOt.length || allInstallments.length) {
      const previous = await getSettlementFinancialClaims(this.lines.manager, emp.id, kase.id)
      for (const id of previous.overtimeIds) claimed.overtime.add(id)
      for (const id of previous.installmentIds) claimed.installments.add(id)
    }
    if (allUnpaidOt.some(row => !Number.isFinite(Number(row.payableHours ?? 0)) || Number(row.payableHours ?? 0) < 0 || !Number.isFinite(Number(row.rate)) || Number(row.rate) < 0)) {
      throw new ConflictException('توجد قيم أوفرتايم أو أقساط غير صالحة؛ راجع مصادرها قبل بناء التصفية')
    }
    const unpaidInstallments = allInstallments.filter(row => !claimed.installments.has(row.id) && legacyInstallmentNumber(row.remainingAmount) > 0).sort((a, b) => a.id - b.id)
    const hourRate = dayRate / Number(await this.cfg('payroll.daily_hours', '8'))
    // نفحص اللقطة قبل استبعاد الصفر؛ تلف العمود القديم لا يُسقط استحقاقًا جديدًا بصمت.
    const candidates = allUnpaidOt.filter(row => !claimed.overtime.has(row.id)).sort((a, b) => a.id - b.id)
      .map(row => ({ row, value: overtimeFinancialValue(row, hourRate) }))
    const legacyDates = candidates.filter(({ value }) => value.provenance === 'LEGACY').map(({ row }) => row.date).sort()
    const legacyExemptions = legacyDates.length ? await loadAttendanceExemptions(this.lines.manager, emp.id, legacyDates[0], legacyDates[legacyDates.length - 1]) : []
    const exemptOvertime = await this.cfg('payroll.exempt_overtime_eligible', 'false')
    if (!['true', 'false'].includes(exemptOvertime)) throw new ConflictException('إعداد استحقاق إضافي المستثنى غير صالح')
    const overtimeValues: Array<{ row: OvertimeEntry; value: OvertimeFinancialValue; legacyExplicitRequest?: LegacyExplicitOvertimeRequest }> = []
    for (const candidate of candidates) {
      if (candidate.value.provenance === 'APPROVAL_SNAPSHOT') { overtimeValues.push(candidate); continue }
      const legacy = await legacyExemptOvertimeSource(this.lines.manager, candidate.row,
        exemptionPolicyOnDate(legacyExemptions, candidate.row.date, { overtimeEligible: exemptOvertime === 'true', unpaidLeaveDeductible: true }))
      if (!legacy) continue
      const value = projectOvertimeFinancialValue(legacy.entry, hourRate)
      if (value.hours > 0) overtimeValues.push({ row: candidate.row, value, ...(legacy.interpretation ? { legacyExplicitRequest: legacy.interpretation } : {}) })
    }
    await assertUniqueOvertimeDays(this.lines.manager, emp.id, overtimeValues.map(({ row }) => row.date))
    const snapshot: SettlementFinancialSnapshot = {
      version: 1, generatedAt: new Date().toISOString(),
      // القديم يحتفظ بشكل لقطته للمقارنة؛ المصدر الجديد يحمل دليله المالي المثبت.
      overtime: overtimeValues.map(({ row, value, legacyExplicitRequest }) => ({ id: row.id, payableHours: value.hours, rate: value.multiplier,
        ...(legacyExplicitRequest ? { legacyExplicitRequest } : {}),
        amount: round2(value.amount), ...(value.provenance === 'APPROVAL_SNAPSHOT' ? { financial: {
          provenance: 'APPROVAL_SNAPSHOT' as const, approvedMinutes: value.approvedMinutes, hourlyRate: value.hourlyRate,
          dayKind: String(row.calculationSnapshot?.approval?.dayKind), originalPeriod: row.originalPeriod } } : {}) })),
      installments: unpaidInstallments.map(row => ({ id: row.id, loanId: row.loanId, amount: legacyInstallmentNumber(row.remainingAmount) })),
      overtimeAmount: 0, installmentAmount: 0, overtimeLineId: null, installmentLineId: null,
    }
    const otHours = round2(
      overtimeValues.reduce((sum, { value }) => sum + value.hours, 0)
    )
    if (otHours > 0) {
      const otAmount = round2(
        overtimeValues.reduce((sum, { value }) => sum + value.amount, 0)
      )
      snapshot.overtimeAmount = otAmount
      rows.push({
        caseId: kase.id,
        label: `أوفرتايم معتمد غير مصروف (${otHours} ساعة)`,
        type: 'CREDIT',
        amount: otAmount,
        isAuto: true,
      })
    }

    // (−) رصيد السلف المتبقي
    const loanRemaining = legacyInstallmentNumber(unpaidInstallments
      .reduce((sum, installment) => sum.add(PayrollDecimal.from(installment.remainingAmount)), PayrollDecimal.from('0')).format(2, 'DOWN'))
    snapshot.installmentAmount = loanRemaining
    if (loanRemaining > 0) {
      rows.push({
        caseId: kase.id,
        label: 'رصيد سلف متبقٍ',
        type: 'DEBIT',
        amount: loanRemaining,
        isAuto: true,
      })
    }

    // (−) قيمة العهدة المفقودة/التالفة عبر مسار write-off المباشر (بلا قيد
    // مديونية). العهدة المبلَّغ عنها بطلب فقد (custody_finance) لها قيد DEBIT في
    // دفتر المديونيات يستهلكه المسير الشهري وقت الإشعار — نتخطّاها هنا لمنع
    // الخصم مرتين.
    const shortfallObl = await this.obligations.find({
      where: { employeeId: emp.id, category: 'custody_shortfall' },
    })
    const obligationAssetIds = new Set(
      shortfallObl
        .filter((o) => o.sourceRef?.startsWith('asset:'))
        .map((o) => Number(o.sourceRef!.slice('asset:'.length)))
    )
    const lostCustody = await this.custody.find({
      where: { employeeId: emp.id, status: In(['LOST', 'DAMAGED']) },
    })
    let custodyShortfall = 0
    const lostNames: string[] = []
    for (const c of lostCustody) {
      if (obligationAssetIds.has(c.assetId)) continue // مقيَّد في الدفتر
      const asset = await this.assets.findOne({ where: { id: c.assetId } })
      const val = Number(asset?.value ?? 0)
      if (val > 0) {
        custodyShortfall += val
        lostNames.push(asset?.name ?? `#${c.assetId}`)
      }
    }
    if (custodyShortfall > 0) {
      rows.push({
        caseId: kase.id,
        label: `قيمة عهدة مفقودة/تالفة (${lostNames.join('، ')})`,
        type: 'DEBIT',
        amount: round2(custodyShortfall),
        isAuto: true,
      })
    }

    // (−) خصومات موثقة يدوياً في بنود الإخلاء
    const blockedAmounts = await this.items.find({
      where: { caseId: kase.id },
    })
    for (const it of blockedAmounts) {
      if (Number(it.amount ?? 0) > 0) {
        rows.push({
          caseId: kase.id,
          label: `خصم من إخلاء الطرف (${it.label})`,
          type: 'DEBIT',
          amount: Number(it.amount),
          isAuto: true,
        })
      }
    }

    if (financial) financial.snapshot = snapshot
    if (dryRun) return rows
    if (rows.length > 0) {
      const saved = await this.lines.save(this.lines.create(rows))
      this.attachFinancialLines(snapshot, saved)
    }
    return rows
  }

  private attachFinancialLines(snapshot: SettlementFinancialSnapshot, rows: SettlementLine[]) {
    snapshot.overtimeLineId = rows.find(row => row.isAuto && row.label.startsWith('أوفرتايم معتمد غير مصروف ('))?.id ?? null
    snapshot.installmentLineId = rows.find(row => row.isAuto && row.label === 'رصيد سلف متبقٍ')?.id ?? null
  }

  // ===== تحرير بنود التصفية (قبل الاعتماد فقط) =====
  // أصحاب التصفية في فرع الموظف فقط — خارج الفرع 404 مثل التفاصيل (SEC-EMP-1)
  private async editableCase(caseId: number, user: JwtPayload) {
    const kase = await this.cases.findOne({ where: { id: caseId } })
    if (!kase) throw new NotFoundException('الحالة غير موجودة')
    const emp = await this.employees.findOne({ where: { id: kase.employeeId } })
    if (!inBranchScope(user, emp?.branchId)) {
      throw new NotFoundException('الحالة غير موجودة')
    }
    if (kase.status !== 'IN_SETTLEMENT') {
      throw new BadRequestException(
        kase.status === 'IN_CLEARANCE'
          ? 'أكمل إخلاء الطرف أولاً'
          : 'التصفية معتمدة ومقفولة — لا تعديل'
      )
    }
    // Historical/unknown clearance states may predate the stricter transition
    // guard. A stored case phase alone is not proof that clearance is complete.
    if (await this.items.count({ where: { caseId, status: Not('DONE') } })) {
      throw new BadRequestException('أكمل جميع بنود إخلاء الطرف قبل تحرير أو اعتماد التصفية')
    }
    return kase
  }

  async addLine(
    user: JwtPayload,
    caseId: number,
    dto: { label: string; type: 'CREDIT' | 'DEBIT'; amount: number }
  ) {
    await this.withFinancialCase(caseId, tx => tx.addLineLocked(user, caseId, dto))
    return this.detail(caseId, user)
  }

  private async addLineLocked(user: JwtPayload, caseId: number, dto: { label: string; type: 'CREDIT' | 'DEBIT'; amount: number }) {
    await this.editableCase(caseId, user)
    if (!dto.label || !['CREDIT', 'DEBIT'].includes(dto.type)) {
      throw new BadRequestException('البند: label + type (CREDIT/DEBIT) + amount')
    }
    if (Number(dto.amount) < 0) {
      throw new BadRequestException('المبلغ لا يكون سالباً — اختر النوع بدلاً من الإشارة')
    }
    await this.lines.save(
      this.lines.create({
        caseId,
        label: dto.label,
        type: dto.type,
        amount: round2(Number(dto.amount)),
        isAuto: false,
      })
    )
  }

  async updateLine(
    user: JwtPayload,
    lineId: number,
    dto: { label?: string; amount?: number }
  ) {
    const line = await this.lines.findOne({ where: { id: lineId } })
    if (!line) throw new NotFoundException('البند غير موجود')
    await this.withFinancialCase(line.caseId, tx => tx.updateLineLocked(user, lineId, dto))
    return this.detail(line.caseId, user)
  }

  private async updateLineLocked(user: JwtPayload, lineId: number, dto: { label?: string; amount?: number }) {
    const line = await this.lines.findOne({ where: { id: lineId } })
    if (!line) throw new NotFoundException('البند غير موجود')
    // قبل الاعتماد: أي بند قابل للتعديل — و«إعادة التوليد» ترجّع
    // البنود التلقائية لأرقام النظام لو حبيت تلغي تعديلك
    await this.editableCase(line.caseId, user)
    if (dto.label !== undefined) line.label = dto.label
    if (dto.amount !== undefined) {
      if (Number(dto.amount) < 0) {
        throw new BadRequestException('المبلغ لا يكون سالباً')
      }
      line.amount = round2(Number(dto.amount))
    }
    await this.lines.save(line)
  }

  // ===== اعتماد التصفية: قفل نهائي + مخرجات + إنهاء عند حلول الموعد =====
  async approveSettlement(user: JwtPayload, caseId: number) {
    const kase = await this.withFinancialCase(caseId, async tx => {
      const current = await tx.editableCase(caseId, user)
      const lines = await tx.lines.find({ where: { caseId } })
      const financial: { snapshot?: SettlementFinancialSnapshot } = {}
      const freshRows = (await tx.buildSettlement(current, true, true, financial)) ?? []
      // HRC-07: سطر المكافأة التلقائي المحفوظ لازم يطابق computeEos بالسياسة الحالية
      // قبل القفل — قبل أي فحص آخر حتى يظهر سبب الفرق للمعتمد صريحًا
      assertEosLineMatchesPolicy(lines, freshRows)
      // قرار المالك (20 سبتمبر): راتب آخر شهر المحفوظ لازم يفضل مساوي لبند المسير قبل القفل — مصدر واحد لا يتجزأ.
      assertSettlementSalaryMatchesRun(lines, freshRows)
      const fresh = financial.snapshot
      if (!fresh) throw new ConflictException('تعذر التحقق من مصادر التصفية؛ أعد توليد البنود')
      const stored = current.settlementFinancialSnapshot
      if (!stored) {
        // تسمية البند القديم قابلة للتعديل. خلو fresh قد يكون بسبب مطالبة المسير،
        // فلا يثبت أن البند الآلي القديم لم يحتسب المصدر المالي نفسه بالفعل.
        const ambiguousAuto = lines.some(line => line.isAuto) && await tx.hasPendingFinancialSources(current.employeeId)
        if (fresh.overtime.length || fresh.installments.length || ambiguousAuto) {
          throw new ConflictException('بنود التصفية القديمة بلا مراجع مالية محفوظة؛ أعد توليد البنود وراجعها قبل الاعتماد')
        }
        current.settlementFinancialSnapshot = fresh
      } else {
        const signature = (snapshot: SettlementFinancialSnapshot) => JSON.stringify({
          version: snapshot.version, overtime: snapshot.overtime, installments: snapshot.installments,
          overtimeAmount: snapshot.overtimeAmount, installmentAmount: snapshot.installmentAmount,
        })
        if (signature(stored) !== signature(fresh)) {
          throw new ConflictException('تغيرت مطالبة المسير أو مصادر الأوفرتايم والسلف بعد توليد التصفية؛ أعد توليد البنود وراجعها قبل الاعتماد')
        }
        for (const [id, amount, type] of [
          [stored.overtimeLineId, stored.overtimeAmount, 'CREDIT'], [stored.installmentLineId, stored.installmentAmount, 'DEBIT'],
        ] as const) {
          if (amount === 0 && id === null) continue
          const line = lines.find(row => row.id === id)
          if (!line || !line.isAuto || line.type !== type || Number(line.amount) !== amount) {
            throw new ConflictException('بند الأوفرتايم أو السلف تغير عن مصادره؛ أعد توليده وأضف أي فرق مطلوب كبند تسوية يدوي')
          }
        }
      }
      current.settlementNet = netOf(lines)
      // AD-13 (C6): رصيد السلف غير المغطى بالمستحقات يُسجل مدينًا PENDING_RECOVERY ولا يُشطب تلقائيًا.
      const recoverySnapshot = current.settlementFinancialSnapshot
      if (recoverySnapshot && recoverySnapshot.installmentAmount > 0) {
        await recordSettlementLoanRecovery(tx.lines.manager, { caseId: current.id, employeeId: current.employeeId,
          installmentAmount: recoverySnapshot.installmentAmount, installments: recoverySnapshot.installments,
          lines: lines.map(line => ({ type: line.type, amount: line.amount, label: line.label })), actorId: user.sub })
      }
      current.settlementApprovedBy = user.sub
      current.settlementApprovedAt = new Date()
      const year = new Date().getFullYear()
      current.settlementDocRef = `SET-${year}-${String(current.id).padStart(5, '0')}`
      current.clearanceCertRef = `CLR-${year}-${String(current.id).padStart(5, '0')}`
      current.status = 'SETTLED'
      // اللقطة هي المطالبة: الاعتماد ليس إثبات صرف فلا نصطنع PAID أو رقم مسير.
      return tx.cases.save(current)
    })

    // آخر يوم عمل عدّى؟ → إنهاء فوري
    const today = localToday()
    if (kase.lastWorkingDay < today) await this.finalize(kase)
    return this.detail(caseId, user)
  }

  // إنهاء الخدمة فعلياً: TERMINATED + أرشفة + توثيق
  private async finalize(kase: OffboardingCase) {
    return this.cases.manager.transaction(async em => {
      const current = await em.getRepository(OffboardingCase).findOne({
        where: { id: kase.id }, lock: { mode: 'pessimistic_write' },
      })
      if (!current || current.status !== 'SETTLED' || current.lastWorkingDay >= localToday()) return false
      const emp = await em.getRepository(Employee).findOne({ where: { id: current.employeeId } })
      if (!emp) throw new NotFoundException('الموظف غير موجود')
      if (emp.status !== 'terminated') {
        await recordEmployeeChange(em, {
          employeeId: emp.id, fieldName: 'status', oldValue: emp.status, newValue: 'terminated',
          reason: 'انتهاء خدمة — تصفية معتمدة ' + current.settlementDocRef,
          requestId: current.resignationRequestId ?? undefined,
        })
        await em.getRepository(Employee).update(emp.id, {
          status: 'terminated', isActive: false, archivedAt: new Date(),
          archiveReason: 'انتهاء خدمة — آخر يوم عمل ' + current.lastWorkingDay,
        })
      }
      await em.getRepository(User).update({ employeeId: emp.id }, { isActive: false })
      await em.getRepository(OffboardingCase).update(current.id, { status: 'CLOSED' })
      return true
    })
  }

  // ===== التراجع عن الاستقالة خلال فترة الإشعار =====
  // الموظف نفسه أو HR — قبل الإغلاق الفعلي فقط: الملف يتلغى والموظف يرجع نشطاً
  async withdraw(user: JwtPayload, caseId: number) {
    await this.withFinancialCase(caseId, tx => tx.withdrawLocked(user, caseId))
    return this.detail(caseId, user)
  }

  private async withdrawLocked(user: JwtPayload, caseId: number) {
    const kase = await this.cases.findOne({ where: { id: caseId } })
    if (!kase) throw new NotFoundException('حالة إنهاء الخدمة غير موجودة')
    const emp = await this.employees.findOne({ where: { id: kase.employeeId } })
    const isOwner = !!user.employeeId && user.employeeId === kase.employeeId
    if (isOwner && caseReason(kase) !== 'resignation') {
      throw new ForbiddenException('إلغاء إنهاء الخدمة من طرف الشركة للموارد البشرية فقط')
    }
    if (!isOwner) {
      if (!userHasPerm(user, 'offboarding.manage')) {
        throw new ForbiddenException('التراجع للموظف نفسه أو للموارد البشرية')
      }
      // HR في فرع الموظف فقط — خارج الفرع 404 مثل التفاصيل (SEC-EMP-1)
      if (!inBranchScope(user, emp?.branchId)) {
        throw new NotFoundException('حالة إنهاء الخدمة غير موجودة')
      }
    }
    if (!['IN_CLEARANCE', 'IN_SETTLEMENT', 'SETTLED'].includes(kase.status)) {
      throw new BadRequestException(
        kase.status === 'CLOSED'
          ? 'الخدمة انتهت فعلياً — لا تراجع بعد الإغلاق'
          : 'الملف ملغي بالفعل'
      )
    }
    if (!emp || emp.status === 'terminated') {
      throw new BadRequestException('الموظف منتهي الخدمة بالفعل')
    }
    if (kase.status === 'SETTLED') {
      const snapshot = kase.settlementFinancialSnapshot
      if (snapshot && (snapshot.version !== 1 || !Array.isArray(snapshot.overtime) || !Array.isArray(snapshot.installments))) {
        throw new ConflictException('مصادر التصفية المعتمدة غير مكتملة؛ راجعها ماليًا قبل إلغاء الملف')
      }
      const legacyFinancialLines = !snapshot && (await this.lines.find({ where: { caseId, isAuto: true } }))
        .length > 0 && await this.hasPendingFinancialSources(kase.employeeId)
      if (legacyFinancialLines || snapshot?.overtime.length || snapshot?.installments.length) {
        throw new ConflictException('التصفية المعتمدة تحجز أوفرتايم أو أقساط سلف؛ راجع تسويتها المالية قبل إلغاء الملف حتى لا تُحسب مرة ثانية')
      }
    }

    const old = emp.status
    emp.status = 'active'
    emp.isActive = true
    await this.employees.save(emp)
    kase.status = 'CANCELLED'
    await this.cases.save(kase)
    await recordEmployeeChange(this.history.manager, {
      employeeId: emp.id,
      fieldName: 'status', oldValue: old, newValue: 'active', changedByUserId: user.sub,
      reason: `تراجع عن الاستقالة خلال فترة الإشعار (آخر يوم عمل كان ${kase.lastWorkingDay})`,
      requestId: kase.resignationRequestId ?? undefined,
    })
    this.logger.log(`تراجع عن الاستقالة — موظف #${emp.id} حالة #${kase.id}`)
  }

  // ملفي النشط (خدمة ذاتية) — لزر «التراجع عن الاستقالة» في البورتال
  async myActiveCase(user: JwtPayload) {
    if (!user.employeeId) return null
    const kase = await this.cases.findOne({
      where: {
        employeeId: user.employeeId,
        status: In(['IN_CLEARANCE', 'IN_SETTLEMENT', 'SETTLED']),
      },
      order: { createdAt: 'DESC' },
    })
    if (!kase) return null
    return {
      id: kase.id,
      status: kase.status,
      lastWorkingDay: kase.lastWorkingDay,
      createdAt: kase.createdAt,
    }
  }

  // EMP-7: «بنود إخلاء عليّ» — البنود المعلّقة في الملفات الجارية اللي
  // جهتي مسؤولة عنها (بصلاحياتها في فرعي) أو أنا المدير المباشر لصاحبها
  async myItems(user: JwtPayload) {
    const open = await this.cases.find({
      where: { status: 'IN_CLEARANCE' },
      order: { lastWorkingDay: 'ASC' },
    })
    if (open.length === 0) return []
    const pending = await this.items.find({
      where: {
        caseId: In(open.map((c) => c.id)),
        status: Not('DONE'),
      },
      order: { id: 'ASC' },
    })
    const emps = await this.employees.find({
      where: { id: In([...new Set(open.map((c) => c.employeeId))]) },
    })
    const empById = new Map(emps.map((e) => [e.id, e]))
    const result: Array<{
      itemId: number
      caseId: number
      party: ClearanceParty
      label: string
      status: string
      employeeId: number
      employeeName: string
      employeeCode: string
      lastWorkingDay: string
    }> = []
    for (const kase of open) {
      const caseItems = pending.filter((i) => i.caseId === kase.id)
      if (caseItems.length === 0) continue
      // فرع الموظف نطاق الجهات — ملف فرع آخر لا يظهر منه إلا بند مديره المباشر
      const emp = empById.get(kase.employeeId)
      const access = await this.accessOf(user, kase, caseItems, emp?.branchId)
      for (const it of caseItems) {
        if (!access.isParty(it.party)) continue
        result.push({
          itemId: it.id,
          caseId: kase.id,
          party: it.party,
          label: it.label,
          status: it.status,
          employeeId: kase.employeeId,
          employeeName: emp?.fullName ?? `#${kase.employeeId}`,
          employeeCode: emp?.employeeCode ?? '',
          lastWorkingDay: kase.lastWorkingDay,
        })
      }
    }
    return result
  }

  // يومياً 00:30: الحالات المعتمدة اللي حل آخر يوم عمل فيها
  @Cron('30 0 * * *')
  async finalizeDue() {
    return this.finalizeDueFor()
  }

  async onApplicationBootstrap() {
    try {
      await this.finalizeDue()
    } catch (error) {
      this.logger.error('تعذر إتمام حالات إنهاء الخدمة المستحقة عند الإقلاع', error)
    }
  }

  async finalizeDueFor(user?: JwtPayload) {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const due = await this.cases.find({ where: { status: 'SETTLED' } })
    let finalized = 0
    for (const kase of due) {
      if (kase.lastWorkingDay >= today) continue
      if (user) {
        const emp = await this.employees.findOne({ where: { id: kase.employeeId } })
        if (!emp || !inBranchScope(user, emp.branchId)) continue
      }
      if (await this.finalize(kase)) finalized++
    }
    return { finalized }
  }
}
