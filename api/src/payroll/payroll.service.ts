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
import { AttendanceDay } from '../attendance/attendance.entities'
import { Employee } from '../employees/employee.entity'
import { OvertimeEntry } from '../requests/entities/attendance.entities'
import {
  Loan,
  LoanInstallment,
} from '../requests/entities/financial.entities'
import { Leave } from '../requests/entities/leave.entities'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { PayrollItem, PayrollRun } from './payroll.entities'

const round2 = (n: number) => Math.round(n * 100) / 100

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name)

  constructor(
    @InjectRepository(PayrollRun)
    private readonly runs: Repository<PayrollRun>,
    @InjectRepository(PayrollItem)
    private readonly items: Repository<PayrollItem>,
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
    @InjectRepository(RequestsConfig)
    private readonly config: Repository<RequestsConfig>
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
    const prev = new Date(y, m - 2, startDay)
    const end = new Date(y, m - 1, startDay - 1)
    return {
      startDate: `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`,
      endDate: `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`,
    }
  }

  // ===== إنشاء/إعادة حساب مسير فرع لفترة =====
  async calculate(branchId: number, period: string) {
    const { startDate, endDate } = await this.periodRange(period)

    let run = await this.runs.findOne({ where: { branchId, period } })
    if (run && run.status !== 'CALCULATED') {
      throw new BadRequestException(
        `المسير ${run.status} — لا يُعاد حسابه بعد الاعتماد`
      )
    }
    if (!run) {
      run = this.runs.create({ branchId, period, startDate, endDate })
      run = await this.runs.save(run)
    } else {
      await this.items.delete({ runId: run.id })
    }

    const monthlyDays = Number(await this.cfg('payroll.monthly_days', '30'))
    const dailyHours = Number(await this.cfg('payroll.daily_hours', '8'))
    const lateEnabled =
      (await this.cfg('payroll.late_deduction_enabled', 'true')) === 'true'

    const emps = await this.employees.find({
      where: { branchId, isActive: true },
    })

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
      const attRows = await this.attendance.find({
        where: { employeeId: emp.id, date: Between(startDate, endDate) },
      })
      const lateMinutes = attRows.reduce(
        (s, r) => s + r.lateMinutes + (r.deductibleMinutes ?? 0),
        0
      )
      const latenessDeduction = lateEnabled
        ? round2(lateMinutes * minuteRate)
        : 0

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

      const netPay = round2(
        gross + otAmount - latenessDeduction - unpaidDeduction - loanDeduction
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
          unpaidLeaveDays: unpaidDays,
          unpaidLeaveDeduction: unpaidDeduction,
          loanInstallments: loanDeduction,
          netPay,
          payMethod: emp.payMethod ?? 'transfer',
          breakdown: JSON.stringify({
            dayRate: round2(dayRate),
            hourRate: round2(hourRate),
            overtimeEntryIds: otRows.map((r) => r.id),
            installmentIds: installmentsDue.map((i) => i.id),
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
