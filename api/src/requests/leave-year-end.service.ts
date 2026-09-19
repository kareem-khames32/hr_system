import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, EntityManager, In, Repository } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, userHasPerm } from '../auth/guards'
import { localDateOf } from '../attendance/attendance.service'
import { grossMonthlySalary } from '../employees/compensation'
import { Employee } from '../employees/employee.entity'
import { roundPayrollMoney } from '../payroll/payroll-money'
import { payrollPeriodBounds, payrollPeriodOfDate, shiftPayrollPeriod } from '../payroll/payroll-period'
import { payrollLineNotReversedSql } from '../payroll/payroll-reversal-sql'
import { EmployeeObligation } from './entities/financial.entities'
import { RequestsConfig } from './entities/requests-config.entity'
import { isYearKey } from './leave-balance-periods'
import { LeaveBalancesService, type YearEndFigures } from './leave-balances.service'
import { LeaveBalanceSettlement, type LeaveSettlementMode } from './leave-year-end.entity'
import { leaveSettlementAmount } from './leave-year-end.math'

// ===== شاشة «إقفال سنة الإجازات» =====
// معاينة سنة (بنطاق الفرع): لكل موظف المستحق والمستخدم والمتبقي واللي يترحّل (بسقف النوع) واللي يسقط والمسوّى.
// «تسوية رصيد موظف»: المتبقي يتصفّر بسبب، ويا إما يتصرف بدل (الأيام × الراتب الشامل ÷ 30) كإضافة في
// شهر مسير (قيد CREDIT في دفتر المديونيات بتصنيف «بدل») يا إما يتصفّر بس — وسجل لكل تسوية.
// «إقفال السنة»: نفس الترحيل السنوي (للشركة أو فرع): المُرحّل لحد السقف، والباقي يسقط، وصفوف السنة الجديدة؛
// آمن يتكرر.

export const LEAVE_SETTLEMENT_CATEGORY = 'allowance'
const PAYROLL_PERM = 'payroll.calculate'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MONTH_RE = /^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/

export interface SettleLeaveInput {
  mode: LeaveSettlementMode
  reason: string
  payrollPeriod?: string | null
  expectedDays?: number
  idempotencyKey: string
}

const cents = (v: number) => Math.round(v * 100) / 100

@Injectable()
export class LeaveYearEndService {
  constructor(
    @InjectRepository(LeaveBalanceSettlement)
    private readonly settlements: Repository<LeaveBalanceSettlement>,
    private readonly balances: LeaveBalancesService,
    private readonly ds: DataSource
  ) {}

  private today() {
    return localDateOf(new Date())
  }

  // نطاق الفرع: حساب الفرع على فرعه بس؛ مدير النظام الشركة كلها أو فرع يختاره
  private scopeFor(user: JwtPayload, branchIdRaw?: unknown): number | null {
    const scope = branchScopeOf(user)
    if (branchIdRaw == null || branchIdRaw === '') return scope
    const branchId = Number(branchIdRaw)
    if (!Number.isInteger(branchId) || branchId <= 0) throw new BadRequestException('رقم الفرع غير صالح')
    if (scope !== null && branchId !== scope) throw new ForbiddenException('الفرع خارج نطاق صلاحيتك')
    return branchId
  }

  private assertYear(year: string) {
    if (!isYearKey(year) || Number(year) < 2000 || Number(year) > 2100) throw new BadRequestException('السنة غير صالحة')
  }

  async preview(user: JwtPayload, year: string, branchIdRaw?: unknown) {
    this.assertYear(year)
    const branchId = this.scopeFor(user, branchIdRaw)
    const today = this.today()
    const { settings, rows } = await this.balances.yearEndPreview(year, branchId, today)
    const keys = ['entitledTotal', 'used', 'settled', 'remaining', 'carried', 'lapsed', 'settleable'] as const
    const totals = Object.fromEntries(keys.map((k) => [k, 0])) as Record<(typeof keys)[number], number>
    let closed = 0
    let pending = 0
    for (const r of rows) {
      if (r.error) continue
      for (const k of keys) totals[k] = cents(totals[k] + Number(r[k] ?? 0))
      if (r.closed) closed++
      else if (r.ended) pending++
    }
    const currentYear = Number(today.slice(0, 4))
    return {
      year,
      branchId,
      today,
      ended: Number(year) < currentYear,
      // الإقفال للسنة اللي لسه خالصة بس (اللي قبلها اترحّلت على اللي بعدها خلاص)
      canClose: Number(year) === currentYear - 1,
      settings,
      totals: { ...totals, employees: rows.filter((r) => !r.error).length, closed, pending },
      rows,
    }
  }

  async close(user: JwtPayload, year: string, branchIdRaw?: unknown) {
    this.assertYear(year)
    const branchId = this.scopeFor(user, branchIdRaw)
    const currentYear = Number(this.today().slice(0, 4))
    if (Number(year) >= currentYear) {
      throw new BadRequestException(`سنة ${year} لسه ما خلصتش — الإقفال بيبقى بعد آخر يوم فيها`)
    }
    if (Number(year) !== currentYear - 1) {
      throw new BadRequestException(`الإقفال للسنة اللي فاتت بس (${currentYear - 1}) — سنة ${year} اترحّلت على اللي بعدها`)
    }
    const result = await this.balances.closeYear(year, branchId)
    const after = await this.preview(user, year, branchId ?? undefined)
    return { ...result, branchId, summary: after.totals }
  }

  async settle(user: JwtPayload, year: string, employeeId: number, input: SettleLeaveInput) {
    this.assertYear(year)
    const mode = input.mode
    if (mode !== 'PAID' && mode !== 'ZEROED') throw new BadRequestException('التسوية: صرف بدل أو تصفير بس')
    const reason = String(input.reason ?? '').trim()
    if (reason.length < 3 || reason.length > 500) throw new BadRequestException('سبب التسوية مطلوب من 3 لـ 500 حرف')
    if (!UUID_RE.test(String(input.idempotencyKey ?? ''))) throw new BadRequestException('مفتاح العملية غير صالح — أعد فتح نافذة التسوية')
    const expectedDays = input.expectedDays === undefined || input.expectedDays === null ? undefined : Number(input.expectedDays)
    if (expectedDays !== undefined && !Number.isFinite(expectedDays)) throw new BadRequestException('عدد الأيام المتوقع غير صالح')
    const payrollPeriod = mode === 'PAID' ? String(input.payrollPeriod ?? '') : null
    if (mode === 'PAID') {
      if (!userHasPerm(user, PAYROLL_PERM)) {
        throw new ForbiddenException('صرف البدل في المسير محتاج صلاحية حساب الرواتب — اختار «تصفير بس» أو اطلبها من المسؤول')
      }
      if (!MONTH_RE.test(payrollPeriod!)) throw new BadRequestException('اختار شهر المسير اللي البدل هيتصرف فيه')
    }
    const scope = branchScopeOf(user)
    const today = this.today()
    return this.ds.transaction(async (em) => {
      // الموظف الأول: نفس ترتيب الأقفال في تعديل الرصيد (موظف ثم صف الرصيد)
      const employee = await em.findOne(Employee, { where: { id: employeeId }, lock: { mode: 'pessimistic_write' } })
      if (!employee || (scope !== null && employee.branchId !== scope)) throw new NotFoundException('الموظف غير موجود')
      const prior = await em.findOneBy(LeaveBalanceSettlement, { employeeId, idempotencyKey: input.idempotencyKey })
      if (prior) {
        if (prior.mode !== mode || prior.reason !== reason || prior.year !== year || (prior.payrollPeriod ?? null) !== payrollPeriod || prior.actorUserId !== user.sub) {
          throw new ConflictException('مفتاح العملية مستخدم لتسوية مختلفة — أعد فتح نافذة التسوية')
        }
        return { settlement: this.settlementView(prior), balance: null, replayed: true }
      }
      if (['archived', 'terminated'].includes(employee.status)) {
        throw new BadRequestException('الموظف خدمته منتهية — رصيده بيتسوّى في مخالصة نهاية الخدمة')
      }
      let gross = 0
      let cycle = 23
      if (mode === 'PAID') {
        gross = grossMonthlySalary(employee)
        if (!(gross > 0)) throw new BadRequestException('الموظف مالوش راتب مسجّل — مينفعش يتصرف له بدل، اختار «تصفير بس»')
        cycle = await this.cycleStartDay(em)
        const current = payrollPeriodOfDate(today, cycle)
        if (payrollPeriod! > shiftPayrollPeriod(current, 12)) throw new BadRequestException('شهر المسير مايزيدش عن 12 شهر قدام')
        const closedRun = await this.closedRun(em, employee.id, payrollPeriod!)
        if (closedRun) throw new BadRequestException(`مسير ${payrollPeriod} للموظف ده اتعتمد أو اتصرف — اختار شهر لسه مفتوح`)
      }
      const result = await this.balances.settleYearEnd(em, employee, year, expectedDays, today)
      const money = mode === 'PAID' ? leaveSettlementAmount(result.days, gross) : null
      if (money && !(money.amount > 0)) throw new BadRequestException('مبلغ البدل صفر — راجع الراتب')
      let row = await em.save(LeaveBalanceSettlement, em.create(LeaveBalanceSettlement, {
        employeeId,
        balanceType: 'annual',
        period: result.period,
        year,
        days: result.days,
        mode,
        reason,
        beforeRemaining: result.beforeRemaining,
        monthlySalary: money ? roundPayrollMoney(gross) : null,
        amount: money ? money.amount : null,
        payrollPeriod,
        obligationId: null,
        idempotencyKey: input.idempotencyKey,
        actorUserId: user.sub,
      }))
      if (money) {
        // إضافة في مسير الشهر المختار (أول مسير مفتوح فترته تشمل الشهر ده يستهلكها) — تظهر في القسيمة «بدل»
        const obligation = await em.save(EmployeeObligation, em.create(EmployeeObligation, {
          employeeId,
          type: 'CREDIT',
          category: LEAVE_SETTLEMENT_CATEGORY,
          amount: money.amount,
          label: `بدل رصيد إجازة ${result.days} يوم — سنة ${year}`,
          status: 'PENDING',
          effectiveDate: payrollPeriodBounds(payrollPeriod!, cycle).startDate,
          targetPeriod: payrollPeriod,
          sourceRef: `leave-settlement:${row.id}`,
          createdByUserId: user.sub,
        }))
        row.obligationId = obligation.id
        row = await em.save(LeaveBalanceSettlement, row)
      }
      return { settlement: this.settlementView(row), balance: result.after as YearEndFigures, replayed: false }
    })
  }

  // سجل التسويات لسنة (بنطاق الفرع)، ولموظف لو اتحدد — بالأسماء مش أرقام
  async history(user: JwtPayload, year: string, employeeIdRaw?: unknown, branchIdRaw?: unknown) {
    this.assertYear(year)
    const branchId = this.scopeFor(user, branchIdRaw)
    const qb = this.settlements.createQueryBuilder('s').where('s.year = :year', { year })
    if (employeeIdRaw != null && employeeIdRaw !== '') {
      const employeeId = Number(employeeIdRaw)
      if (!Number.isInteger(employeeId) || employeeId <= 0) throw new BadRequestException('رقم الموظف غير صالح')
      qb.andWhere('s.employeeId = :employeeId', { employeeId })
    }
    if (branchId !== null) {
      qb.andWhere('s.employeeId IN (SELECT e.id FROM employees e WHERE e.branchId = :branchId)', { branchId })
    }
    const rows = await qb.orderBy('s.id', 'DESC').take(500).getMany()
    const empIds = [...new Set(rows.map((r) => r.employeeId))]
    const actorIds = [...new Set(rows.map((r) => r.actorUserId))]
    const emps = empIds.length
      ? await this.ds.getRepository(Employee).find({ where: { id: In(empIds) }, select: { id: true, fullName: true, employeeCode: true } })
      : []
    const actors: Array<{ id: number; displayName: string }> = actorIds.length
      ? await this.ds.query(`SELECT [id], [displayName] FROM [users] WHERE [id] IN (${actorIds.map((_, i) => `@${i}`).join(',')})`, actorIds)
      : []
    const empBy = new Map(emps.map((e) => [e.id, e]))
    const actorBy = new Map(actors.map((a) => [Number(a.id), a.displayName]))
    return rows.map((r) => ({
      ...this.settlementView(r),
      employeeName: empBy.get(r.employeeId)?.fullName ?? '',
      employeeCode: empBy.get(r.employeeId)?.employeeCode ?? '',
      actorName: actorBy.get(r.actorUserId) ?? '',
    }))
  }

  private settlementView(r: LeaveBalanceSettlement) {
    return {
      id: r.id,
      employeeId: r.employeeId,
      period: r.period,
      year: r.year,
      days: Number(r.days),
      mode: r.mode,
      reason: r.reason,
      beforeRemaining: Number(r.beforeRemaining),
      amount: r.amount == null ? null : Number(r.amount),
      payrollPeriod: r.payrollPeriod,
      obligationId: r.obligationId,
      actorUserId: r.actorUserId,
      createdAt: r.createdAt,
    }
  }

  private async cycleStartDay(em: EntityManager) {
    const row = await em.getRepository(RequestsConfig).findOne({ where: { key: 'payroll.cycle_start_day' } })
    const n = Number(row?.value ?? '23')
    return Number.isInteger(n) && n >= 1 && n <= 31 ? n : 23
  }

  // مسير الموظف للشهر اتعتمد أو اتصرف (ومش معكوس) — البدل مايدخلوش
  private async closedRun(em: EntityManager, employeeId: number, period: string): Promise<number | null> {
    const rows = await em.query(
      `SELECT TOP (1) r.[id] FROM [payroll_runs] r INNER JOIN [payroll_items] i ON i.[runId]=r.[id]
       WHERE i.[employeeId]=@0 AND r.[period]=@1 AND r.[status] IN ('APPROVED','PAID') AND ${payrollLineNotReversedSql('r.[id]', 'i.[employeeId]')}
       ORDER BY r.[id]`,
      [employeeId, period]
    )
    return rows.length ? Number(rows[0].id) : null
  }
}
