import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Between, In, Repository } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf } from '../auth/guards'
import { AttendanceService } from '../attendance/attendance.service'
import { AttendanceDay } from '../attendance/attendance.entities'
import { Employee } from '../employees/employee.entity'
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

const round2 = (n: number) => Math.round(n * 100) / 100

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
    const prev = new Date(y, m - 2, startDay)
    const end = new Date(y, m - 1, startDay - 1)
    return {
      startDate: `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`,
      endDate: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`,
    }
  }

  // ===== حلّ نطاق المسير إلى قائمة موظفين نشطين =====
  async resolveScope(dto: {
    scopeType: PayrollScopeType
    scopeIds?: number[]
    employeeIds?: number[]
    branchId?: number | null
  }): Promise<Employee[]> {
    const where: Record<string, unknown> = { isActive: true }
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
    return this.employees.find({ where })
  }

  // ===== غلاف التوافق: مسير فرع واحد لفترة (المسار القديم) =====
  async calculate(branchId: number, period: string) {
    return this.calculateDefined({
      period,
      scopeType: 'BRANCH',
      branchId,
      scopeIds: [branchId],
    })
  }

  // ===== إنشاء/إعادة حساب مسير قابل للتعريف (اسم + فترة + نطاق) =====
  async calculateDefined(dto: {
    runId?: number
    name?: string | null
    period: string
    scopeType: PayrollScopeType
    scopeIds?: number[]
    employeeIds?: number[]
    branchId?: number | null
    policyId?: number | null
  }) {
    const { startDate, endDate } = await this.periodRange(dto.period)

    // إيجاد المسير: بالمعرّف، أو مسير الفرع القديم لنفس الفترة، وإلا أنشئ جديداً
    let run: PayrollRun | null = null
    if (dto.runId) {
      run = await this.runs.findOne({ where: { id: dto.runId } })
      if (!run) throw new NotFoundException('المسير غير موجود')
    } else if (dto.scopeType === 'BRANCH' && dto.branchId != null) {
      run = await this.runs.findOne({
        where: { branchId: dto.branchId, period: dto.period, scopeType: 'BRANCH' },
      })
    }
    if (run && run.status !== 'CALCULATED') {
      throw new BadRequestException(
        `المسير ${run.status} — لا يُعاد حسابه بعد الاعتماد`
      )
    }
    if (!run) {
      run = await this.runs.save(
        this.runs.create({
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
      )
    } else {
      await this.items.delete({ runId: run.id })
      await this.members.delete({ runId: run.id })
    }

    const monthlyDays = Number(await this.cfg('payroll.monthly_days', '30'))
    const dailyHours = Number(await this.cfg('payroll.daily_hours', '8'))
    const lateEnabled =
      (await this.cfg('payroll.late_deduction_enabled', 'true')) === 'true'
    // معادلات مرنة: شرائح التأخير + معامل الغياب بلا إذن (يوم × المعامل)
    const tiers = await this.latenessTiers.find({
      where: { isActive: true },
      order: { fromMinutes: 'ASC' },
    })
    const absencePenalty = Number(
      await this.cfg('attendance.absence_penalty_days', '1')
    )

    // حلّ النطاق من تعريف المسير المخزّن + تثبيت لقطة الأعضاء
    const emps = await this.resolveScope({
      scopeType: run.scopeType,
      scopeIds: run.scopeIds ? JSON.parse(run.scopeIds) : undefined,
      employeeIds: run.employeeIds ? JSON.parse(run.employeeIds) : undefined,
      branchId: run.branchId,
    })
    if (emps.length) {
      await this.members.save(
        emps.map((e) => this.members.create({ runId: run!.id, employeeId: e.id }))
      )
    }

    let totalNet = 0
    for (const emp of emps) {
      const basic = Number(emp.basicSalary ?? 0)
      // الإجمالي = الأساسي + البدلات — وهو أساس معدلات الخصم والإضافي
      const allowances =
        Number(emp.housingAllowance ?? 0) +
        Number(emp.transportAllowance ?? 0) +
        Number(emp.otherAllowance ?? 0)
      const gross = basic + allowances
      const dayRate = gross / monthlyDays
      const hourRate = dayRate / dailyHours
      const minuteRate = hourRate / 60

      // 1) الأوفرتايم المعتمد في الفترة
      const otRows = await this.overtime.find({
        where: {
          employeeId: emp.id,
          status: 'APPROVED',
          date: Between(startDate, endDate),
        },
      })
      const otHours = round2(
        otRows.reduce((s, r) => s + Number(r.payableHours ?? 0), 0)
      )
      const otAmount = round2(
        otRows.reduce(
          (s, r) =>
            s + Number(r.payableHours ?? 0) * Number(r.rate ?? 1.5) * hourRate,
          0
        )
      )

      // 2) خصم التأخير: الدقائق غير المعذورة + دقائق الإذن «بخصم»
      // (المعذور بإذن بدون خصم أو إجازة جزئية لا يُخصم)
      // أولاً: جسّد الغياب — أنشئ صفوف 'absent' لأيام العمل غير الملموسة في
      // الفترة (بلا بصمة ولا إجازة) قبل القراءة، فتُحتسب في الخصم والتقارير
      await this.attendanceService.materializeAbsences(emp.id, startDate, endDate)
      const attRows = await this.attendance.find({
        where: { employeeId: emp.id, date: Between(startDate, endDate) },
      })
      const lateMinutes = attRows.reduce(
        (s, r) => s + r.lateMinutes + (r.deductibleMinutes ?? 0),
        0
      )
      // خصم التأخير بالشرائح: كل يوم متأخر على حدة (كسر يوم أو بالدقيقة)، +
      // دقائق الإذن «بخصم» بالدقيقة. بلا شرائح → بالدقيقة (السلوك الافتراضي)
      const latenessDeduction = lateEnabled
        ? round2(
            attRows.reduce(
              (s, r) =>
                s +
                this.latenessForDay(r.lateMinutes, tiers, dayRate, minuteRate) +
                (r.deductibleMinutes ?? 0) * minuteRate,
              0
            )
          )
        : 0

      // 2ب) خصم الغياب بلا إذن: يوم عمل مجدول بلا بصمة ولا إجازة (status='absent')
      // يُخصم بقيمة اليوم × معامل عقوبة الغياب (افتراضي 1، يُضبط لـ1.5/2).
      // (يوم الإجازة يُصنّف 'leave' لا 'absent' فلا ازدواج مع الإجازة غير المدفوعة)
      const absentRows = attRows.filter((r) => r.status === 'absent')
      const absenceDays = absentRows.length
      const absenceDeduction = round2(absenceDays * dayRate * absencePenalty)

      // 3) الإجازات غير المدفوعة (isUnpaid من تعريف النوع — أي نوع
      // غير مدفوع يُخصم يوم بيوم، بلا سياسة غياب) المتقاطعة مع الفترة
      const unpaidLeaves = await this.leaves.find({
        where: { employeeId: emp.id, isUnpaid: true, status: 'APPROVED' },
      })
      let unpaidDays = 0
      for (const lv of unpaidLeaves) {
        const from = lv.fromDate < startDate ? startDate : lv.fromDate
        const to = lv.toDate > endDate ? endDate : lv.toDate
        if (from <= to) {
          const fullDays =
            Math.round(
              (new Date(to).getTime() - new Date(from).getTime()) / 86400000
            ) + 1
          // نصف اليوم غير المدفوع = نصف يوم خصم
          unpaidDays +=
            (lv.period ?? 'FULL') === 'FULL' ? fullDays : fullDays * 0.5
        }
      }
      const unpaidDeduction = round2(unpaidDays * dayRate)

      // 4) أقساط السلف المستحقة في الفترة (غير المدفوعة)
      const empLoans = await this.loans.find({
        where: { employeeId: emp.id },
      })
      let installmentsDue: LoanInstallment[] = []
      if (empLoans.length > 0) {
        installmentsDue = await this.installments.find({
          where: {
            loanId: In(empLoans.map((l) => l.id)),
            paid: false,
            dueDate: Between(startDate, endDate),
          },
        })
      }
      const loanDeduction = round2(
        installmentsDue.reduce((s, i) => s + Number(i.amount), 0)
      )

      // 5) دفتر المديونيات: بنود PENDING سرت فترتها (effectiveDate ضمن الفترة
      // أو فارغة) — DEBIT خصم، CREDIT إضافة. تُقيَّد APPLIED عند الصرف فقط.
      const pendingObligations = (
        await this.obligations.find({
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

      const netPay = round2(
        gross +
          otAmount +
          otherAdditions -
          latenessDeduction -
          absenceDeduction -
          unpaidDeduction -
          loanDeduction -
          otherDeductions
      )
      totalNet = round2(totalNet + netPay)

      await this.items.save(
        this.items.create({
          runId: run.id,
          employeeId: emp.id,
          basicSalary: basic,
          allowances: round2(allowances),
          overtimeHours: otHours,
          overtimeAmount: otAmount,
          lateMinutes,
          latenessDeduction,
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
            dayRate: round2(dayRate),
            hourRate: round2(hourRate),
            overtimeEntryIds: otRows.map((r) => r.id),
            installmentIds: installmentsDue.map((i) => i.id),
            obligationIds: pendingObligations.map((o) => o.id),
            absentDates: absentRows.map((r) => r.date),
            // تتبّع مصدر الخصم للتدقيق/الاعتراض: صفوف الحضور المخصومة والإجازات
            attendanceDayIds: attRows
              .filter(
                (r) =>
                  r.lateMinutes > 0 ||
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
    await this.runs.save(run)
    return this.detail(run.id)
  }

  // ===== الاعتماد =====
  async approve(user: JwtPayload, runId: number) {
    const run = await this.runs.findOne({ where: { id: runId } })
    if (!run) throw new NotFoundException('المسير غير موجود')
    if (run.status !== 'CALCULATED') {
      throw new BadRequestException('المسير ليس بحالة محسوبة')
    }
    run.status = 'APPROVED'
    run.approvedBy = user.sub
    run.approvedAt = new Date()
    await this.runs.save(run)
    return run
  }

  // ===== الصرف: يقفل الأوفرتايم والأقساط المرتبطة =====
  async pay(runId: number) {
    const run = await this.runs.findOne({ where: { id: runId } })
    if (!run) throw new NotFoundException('المسير غير موجود')
    if (run.status !== 'APPROVED') {
      throw new BadRequestException('المسير غير معتمد')
    }
    const items = await this.items.find({ where: { runId } })
    for (const item of items) {
      const breakdown = item.breakdown ? JSON.parse(item.breakdown) : {}
      // أوفرتايم الفترة → PAID + ربط بالمسير
      if (breakdown.overtimeEntryIds?.length) {
        await this.overtime.update(
          { id: In(breakdown.overtimeEntryIds) },
          { status: 'PAID', payrollRunId: runId }
        )
      }
      // أقساط السلف → مدفوعة
      if (breakdown.installmentIds?.length) {
        await this.installments.update(
          { id: In(breakdown.installmentIds) },
          { paid: true }
        )
      }
      // بنود دفتر المديونيات → APPLIED (تُستهلك مرة واحدة، لا تتكرر)
      if (breakdown.obligationIds?.length) {
        await this.obligations.update(
          { id: In(breakdown.obligationIds), status: 'PENDING' },
          { status: 'APPLIED', appliedPayrollRunId: runId, appliedAt: new Date() }
        )
      }
    }
    run.status = 'PAID'
    run.paidAt = new Date()
    await this.runs.save(run)
    return run
  }

  // ===== الاستعلام (بنطاق الفرع) =====
  async list(user: JwtPayload) {
    const scope = branchScopeOf(user)
    const where = scope !== null ? { branchId: scope } : {}
    return this.runs.find({ where, order: { period: 'DESC' } })
  }

  async detail(runId: number) {
    const run = await this.runs.findOne({ where: { id: runId } })
    if (!run) throw new NotFoundException('المسير غير موجود')
    const items = await this.items.find({
      where: { runId },
      order: { employeeId: 'ASC' },
    })
    return { ...run, items }
  }

  // كل قسائم موظف (المسيرات المعتمدة/المصروفة فقط) — لبورتال الموظف
  async payslipsOf(employeeId: number) {
    const items = await this.items.find({
      where: { employeeId },
      order: { id: 'DESC' },
    })
    const result = []
    for (const item of items) {
      const run = await this.runs.findOne({ where: { id: item.runId } })
      if (!run || run.status === 'CALCULATED') continue // المسودة لا تظهر للموظف
      result.push({ item, run })
    }
    return result
  }

  // قسيمة راتب: البند + المسير + الموظف — لشاشة payslip
  async payslip(itemId: number) {
    const item = await this.items.findOne({ where: { id: itemId } })
    if (!item) throw new NotFoundException('بند المسير غير موجود')
    const run = await this.runs.findOne({ where: { id: item.runId } })
    const employee = await this.employees.findOne({
      where: { id: item.employeeId },
    })
    return { item, run, employee }
  }

  // تقرير حالة الصرف: تجميع بطريقة الدفع (كاش/تحويل/فيزا)
  async payMethodReport(runId: number) {
    const { items } = await this.detail(runId)
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
