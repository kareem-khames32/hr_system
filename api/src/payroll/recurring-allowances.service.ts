import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, In, Repository } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { assertCompanyWideWrite, branchScopeOf, inBranchScope, isEmptyBranchScope } from '../auth/guards'
import type { BranchScope } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import { OffboardingCase } from '../offboarding/offboarding.entities'
import { ALLOWANCE_LINE_STATE_LABELS, allowanceAmount, allowanceLineState, parseObligationIdWindow, uniqueIds, type AllowanceLineState } from './allowances-grants'
import { PayrollAllowanceType } from './allowances-grants.entities'
import { resolveAllowanceTargetInput, type AllowanceTargetInput } from './allowances-grants.service'
import { payrollEmploymentCoverage } from './payroll-employment'
import { salaryPayrollPeriodBounds } from './payroll-period-salary'
import { lockPayrollEmployees } from './payroll-settlement-boundary'
import {
  isManagedRecurringCredit, isPayrollMonth, planRecurringAllowanceStop, recurringAllowanceCovers, recurringAllowanceCoversAnyMonth,
  recurringAllowanceEndExclusive, recurringAllowanceLastMonth, recurringAllowanceMonthCents, recurringAllowancesOverlap, recurringAllowanceWindowInput, shiftPayrollMonth,
} from './recurring-allowances'
import { PayrollRecurringAllowance } from './recurring-allowances.entities'
import { cancelManagedRecurringCredits, readRecurringCredits, recurringAllowanceTableReady, type RecurringCreditDbRow } from './recurring-allowances-payroll'

// «البدل الثابت الشهري» في «تابة البدلات»: إسناد نوع بدل لموظفين بمبلغ شهري ثابت من شهر ولحد شهر اختياري (القواعد في
// recurring-allowances.ts، والقيد الشهري بيتعمل وقت حساب المسير في recurring-allowances-payroll.ts). القائمة بالشهور اللي
// اتصرفت وحالة الشهر المختار، والإيقاف بسبب (بيلغي قيود الشهور اللي مسيرها لسه ما اتعتمدش). عزل الفروع بفرع الموظف الحالي،
// وإسناد «الشركة كلها» لحساب على مستوى الشركة — نفس صلاحيات التابة (العرض payroll.view، والإضافة والإيقاف payroll.calculate).

export interface RecurringAllowanceInput extends AllowanceTargetInput {
  allowanceTypeId: number
  amount: string | number
  fromPeriod: string
  untilPeriod?: string | null
  reason: string
}
export interface RecurringAllowanceStopInput { reason: string; fromPeriod?: string | null }

interface RunRef { id: number; name: string | null; status: string; period: string }
interface OpenRunItem extends RunRef { employeeId: number; obligationIds: number[] }
interface EmployeeRef { fullName: string; employeeCode: string; branchId: number | null; departmentId: number | null }
export type RecurringAllowancePhase = 'ACTIVE' | 'UPCOMING' | 'ENDED' | 'STOPPED'
// حالة شهر في القائمة: حالة قيده (زي سطر بدل الشهر الواحد)، أو شهر مغطى والموظف مش في الخدمة فيه خالص
export type RecurringAllowanceMonthState = AllowanceLineState | 'NOT_IN_SERVICE'
const NOT_IN_SERVICE_LABEL = 'مش في الخدمة في الشهر ده — ما ياخدوش'

const cents = (value: unknown) => Math.round(Number(value ?? 0) * 100)
const money = (value: number) => value / 100
const idList = (ids: number[], offset = 0) => ids.map((_, index) => `@${index + offset}`).join(', ')
const chunks = <T>(rows: T[], size = 500) => Array.from({ length: Math.ceil(rows.length / size) }, (_, index) => rows.slice(index * size, (index + 1) * size))
const INSERT_CHUNK = 100 // 15 عمود × 100 صف تحت حد SQL Server (2,100 قيمة للجملة)

@Injectable()
export class PayrollRecurringAllowancesService {
  constructor(@InjectRepository(PayrollRecurringAllowance) private readonly assignments: Repository<PayrollRecurringAllowance>) {}

  private get em(): EntityManager { return this.assignments.manager }

  private period(value: unknown): string {
    if (!isPayrollMonth(value)) throw new BadRequestException('اختار الشهر بصيغة YYYY-MM')
    return value
  }

  private scope(user: JwtPayload): BranchScope {
    const scope = branchScopeOf(user)
    if (isEmptyBranchScope(scope)) throw new ForbiddenException('حسابك مش مربوط بفرع')
    return scope
  }

  private async ready(em: EntityManager = this.em) {
    if (!(await recurringAllowanceTableReady(em))) {
      throw new ConflictException('البدل الثابت الشهري محتاج ترحيل قاعدة البيانات 20260926_071 — كلّم مسؤول النظام')
    }
  }

  private async employeesOf(ids: number[], em: EntityManager = this.em) {
    const map = new Map<number, EmployeeRef>()
    for (const chunk of chunks(uniqueIds(ids))) {
      const rows = await em.query(`SELECT [id], [fullName], [employeeCode], [branchId], [departmentId] FROM [employees] WHERE [id] IN (${idList(chunk)})`, chunk)
      for (const row of rows) map.set(Number(row.id), { fullName: row.fullName, employeeCode: row.employeeCode ?? '',
        branchId: row.branchId == null ? null : Number(row.branchId), departmentId: row.departmentId == null ? null : Number(row.departmentId) })
    }
    return map
  }

  private async orgNames() {
    const map = (rows: Array<{ id: number; name: string }>) => new Map(rows.map(row => [Number(row.id), row.name]))
    return { branches: map(await this.em.query('SELECT [id], [name] FROM [branches]')), departments: map(await this.em.query('SELECT [id], [name] FROM [departments]')) }
  }

  private async userNames(ids: number[]) {
    const map = new Map<number, string>()
    for (const chunk of chunks(uniqueIds(ids))) {
      const rows: Array<{ id: number; displayName: string | null }> = await this.em.query(`SELECT [id], [displayName] FROM [users] WHERE [id] IN (${idList(chunk)})`, chunk)
      for (const row of rows) map.set(Number(row.id), row.displayName || `مستخدم #${row.id}`)
    }
    return map
  }

  // المسيرات المفتوحة (مسودة/محسوب) اللي فيها الموظفين، وقيود الدفتر في حساب كل بند (نافذة "obligationIds" من التفصيل)
  private async openRunItems(employeeIds: number[], em: EntityManager = this.em): Promise<OpenRunItem[]> {
    const result: OpenRunItem[] = []
    for (const chunk of chunks(uniqueIds(employeeIds))) {
      const rows: Array<{ runId: number; employeeId: number; name: string | null; status: string; period: string; ids: string | null }> = await em.query(`
        SELECT i.[runId], i.[employeeId], r.[name], r.[status], r.[period],
          CASE WHEN CHARINDEX('"obligationIds":[', i.[breakdown]) > 0
            THEN SUBSTRING(i.[breakdown], CHARINDEX('"obligationIds":[', i.[breakdown]) + 17, 4000) ELSE NULL END AS [ids]
        FROM [payroll_items] i INNER JOIN [payroll_runs] r ON r.[id] = i.[runId]
        WHERE r.[status] IN (N'DRAFT', N'CALCULATED') AND (r.[runType] IS NULL OR r.[runType] <> N'REVERSAL') AND i.[employeeId] IN (${idList(chunk)})`, chunk)
      for (const row of rows) result.push({ id: Number(row.runId), employeeId: Number(row.employeeId), name: row.name, status: row.status, period: row.period,
        obligationIds: parseObligationIdWindow(row.ids) })
    }
    return result.sort((a, b) => a.period.localeCompare(b.period) || a.id - b.id)
  }

  // المسيرات المفتوحة من شهر (ولحد شهر) اللي فيها واحد على الأقل من الموظفين (عضو أو بند) — محتاجة إعادة حساب عشان تاخد التغيير
  private async openRunsFor(employeeIds: number[], fromPeriod: string, untilPeriod: string | null) {
    const params: unknown[] = [fromPeriod]
    const until = untilPeriod ? `AND [period] <= @${params.push(untilPeriod) - 1}` : ''
    const runs: RunRef[] = (await this.em.query(`SELECT [id], [name], [status], [period] FROM [payroll_runs]
      WHERE [status] IN (N'DRAFT', N'CALCULATED') AND ([runType] IS NULL OR [runType] <> N'REVERSAL') AND [period] >= @0 ${until}
      ORDER BY [period], [id]`, params)).map((row: any) => ({ id: Number(row.id), name: row.name, status: row.status, period: row.period }))
    const wanted = new Set(employeeIds)
    const hit = new Set<number>()
    for (const chunk of chunks(runs.map(run => run.id))) {
      const rows: Array<{ runId: number; employeeId: number }> = await this.em.query(`
        SELECT [runId], [employeeId] FROM [payroll_run_members] WHERE [runId] IN (${idList(chunk)}) AND ([membershipStatus] = 'INCLUDED' OR [membershipStatus] IS NULL)
        UNION SELECT [runId], [employeeId] FROM [payroll_items] WHERE [runId] IN (${idList(chunk)})`, chunk)
      for (const row of rows) if (wanted.has(Number(row.employeeId))) hit.add(Number(row.runId))
    }
    return runs.filter(run => hit.has(run.id)).map(run => ({ id: run.id, name: run.name, status: run.status, period: run.period }))
  }

  // شهور مسيرها معتمد أو اتصرف للموظفين (حجز فترة نشط) من شهر ولحد شهر: ما بتتغيرش
  private async lockedMonths(em: EntityManager, employeeIds: number[], fromPeriod: string, untilPeriod: string | null) {
    const result: Array<{ employeeId: number; period: string }> = []
    for (const chunk of chunks(uniqueIds(employeeIds))) {
      const params: unknown[] = [...chunk, fromPeriod]
      const from = `@${params.length - 1}`
      const until = untilPeriod ? `AND [periodKey] <= @${params.push(untilPeriod) - 1}` : ''
      const rows: Array<{ employeeId: number; periodKey: string }> = await em.query(`SELECT DISTINCT [employeeId], [periodKey] FROM [payroll_period_claims]
        WHERE [releasedAt] IS NULL AND [employeeId] IN (${idList(chunk)}) AND [periodKey] >= ${from} ${until}`, params)
      for (const row of rows) result.push({ employeeId: Number(row.employeeId), period: row.periodKey })
    }
    return result
  }

  private async configNumber(key: string, fallback: number) {
    const rows: Array<{ value: string }> = await this.em.query('SELECT [value] FROM [requests_config] WHERE [key] = @0', [key])
    const value = Number(rows[0]?.value ?? fallback)
    return Number.isFinite(value) ? value : fallback
  }

  /**
   * مبلغ شهر مغطى لسه مالوش قيد (قبل حساب مسيره): بنفس تغطية الخدمة وتناسبها اللي المسير هيحسب بيها (payrollEmploymentCoverage
   * على حدود فترة الشهر) — المنضم/المغادر بنسبة أيامه، واللي مش في الخدمة خالص = NOT_IN_SERVICE. بيانات خدمة ناقصة = null (المبلغ كامل).
   */
  private async expectedMonthCents(rows: Array<{ id: number; employeeId: number; amountCents: number }>, period: string) {
    // بالإسناد: الموظف ممكن يكون عليه أكتر من بدل ثابت بمبالغ مختلفة
    const result = new Map<number, number | 'NOT_IN_SERVICE' | null>()
    if (!rows.length) return result
    const cycle = await this.configNumber('payroll.cycle_start_day', 23)
    const monthlyDays = await this.configNumber('payroll.monthly_days', 30)
    let bounds: { startDate: string; endDate: string }
    try { bounds = salaryPayrollPeriodBounds(period, Number.isInteger(cycle) && cycle >= 1 && cycle <= 31 ? cycle : 23) } catch { return result }
    const ids = uniqueIds(rows.map(row => row.employeeId))
    const employees = new Map<number, Employee>(), cases = new Map<number, OffboardingCase[]>()
    for (const chunk of chunks(ids)) {
      for (const row of await this.em.getRepository(Employee).find({ where: { id: In(chunk) },
        select: { id: true, salaryEntitlementStart: true, actualStartDate: true, joinDate: true, archivedAt: true, status: true, isActive: true } })) employees.set(row.id, row)
      for (const row of await this.em.getRepository(OffboardingCase).find({ where: { employeeId: In(chunk) } })) cases.set(row.employeeId, [...(cases.get(row.employeeId) ?? []), row])
    }
    for (const row of rows) {
      const employee = employees.get(row.employeeId)
      if (!employee) { result.set(row.id, null); continue }
      try {
        const coverage = payrollEmploymentCoverage(employee, cases.get(row.employeeId) ?? [], bounds.startDate, bounds.endDate)
        result.set(row.id, coverage === null ? 'NOT_IN_SERVICE' : recurringAllowanceMonthCents(row.amountCents, {
          fullCoverage: coverage.coverFrom === bounds.startDate && coverage.coverTo === bounds.endDate, coverDays: coverage.coverDays, monthlyDays }))
      } catch { result.set(row.id, null) }
    }
    return result
  }

  // ===== القائمة =====
  /** حالة شهر: من قيده (اتصرف/محجوز/في مسير مفتوح) أو — لشهر مغطى لسه مالوش قيد — مستني الحساب أو محتاج إعادة حساب. */
  private monthState(credit: RecurringCreditDbRow | null, openItems: OpenRunItem[], employeeId: number, period: string) {
    const mine = openItems.filter(item => item.employeeId === employeeId)
    const including = credit ? mine.find(item => item.period >= period && item.obligationIds.includes(credit.id)) : undefined
    // المُدار بيدخل مسير شهره بس؛ إعادة الصرف بعد عكس بتدخل مسير شهرها أو اللي بعده
    const sameMonth = mine.find(item => item.period === period)
    const openRun = including ?? (credit && !isManagedRecurringCredit(credit) ? undefined : sameMonth)
    return allowanceLineState({ lineStatus: 'ACTIVE',
      obligation: credit ? { status: credit.status, reservedPayrollRunId: credit.reservedPayrollRunId, appliedPayrollRunId: credit.appliedPayrollRunId,
        payrollReversalRunId: credit.payrollReversalRunId } : null,
      openRun: openRun ? { id: openRun.id, includesObligation: !!including } : null })
  }

  async list(user: JwtPayload, rawPeriod: unknown) {
    const period = this.period(rawPeriod), scope = this.scope(user)
    if (!(await recurringAllowanceTableReady(this.em))) return { period, rows: [], totals: { count: 0, employees: 0, amount: 0 }, ready: false }
    const all = await this.assignments.find({ order: { id: 'DESC' } })
    const employees = await this.employeesOf(all.map(row => row.employeeId))
    // عزل الفروع بفرع الموظف الحالي (المسير اللي بيصرفه على فرعه دلوقتي)؛ الموظف المحذوف بفرعه وقت الإسناد
    const branchOf = (row: PayrollRecurringAllowance) => employees.has(row.employeeId) ? employees.get(row.employeeId)!.branchId : row.branchId
    const visible = all.filter(row => inBranchScope(scope, branchOf(row)))
    const employeeIds = uniqueIds(visible.map(row => row.employeeId))
    const credits = employeeIds.length ? await readRecurringCredits(this.em, employeeIds, null) : []
    const byAssignment = new Map<number, Map<string, RecurringCreditDbRow>>()
    for (const credit of credits) {
      // لكل شهر السطر الأحدث: إعادة صرف بعد عكس بتظهر مكان الأصل
      const months = byAssignment.get(credit.assignmentId) ?? new Map<string, RecurringCreditDbRow>()
      const current = months.get(credit.period)
      if (!current || credit.id > current.id) months.set(credit.period, credit)
      byAssignment.set(credit.assignmentId, months)
    }
    const openItems = employeeIds.length ? await this.openRunItems(employeeIds) : []
    const runIds = uniqueIds([...openItems.map(item => item.id), ...credits.flatMap(credit => [credit.reservedPayrollRunId, credit.appliedPayrollRunId])])
    const runs = new Map<number, RunRef>()
    for (const chunk of chunks(runIds)) {
      for (const row of await this.em.query(`SELECT [id], [name], [status], [period] FROM [payroll_runs] WHERE [id] IN (${idList(chunk)})`, chunk)) {
        runs.set(Number(row.id), { id: Number(row.id), name: row.name, status: row.status, period: row.period })
      }
    }
    const names = await this.orgNames()
    const users = await this.userNames(visible.flatMap(row => [row.createdByUserId, row.stoppedByUserId ?? 0]))
    const runView = (runId: number | null) => { const run = runId ? runs.get(runId) ?? null : null; return { runId: run?.id ?? runId, runName: run?.name ?? null, runStatus: run?.status ?? null } }
    // شهر مغطى لسه مالوش قيد: مبلغه المتوقع بتغطية خدمة الموظف في الشهر (أو إنه مش في الخدمة خالص)
    const expected = await this.expectedMonthCents(visible.filter(row => recurringAllowanceCovers(row, period) && !byAssignment.get(row.id)?.has(period))
      .map(row => ({ id: row.id, employeeId: row.employeeId, amountCents: cents(row.amount) })), period)

    const rows = visible.map(row => {
      const employee = employees.get(row.employeeId)
      const branchId = branchOf(row)
      const monthlyCents = cents(row.amount)
      const monthsMap = byAssignment.get(row.id) ?? new Map<string, RecurringCreditDbRow>()
      const months: Array<{ period: string; state: RecurringAllowanceMonthState; stateLabel: string; amount: number; runId: number | null; runName: string | null; runStatus: string | null }> =
        [...monthsMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([monthPeriod, credit]) => {
          const { state, runId } = this.monthState(credit, openItems, row.employeeId, monthPeriod)
          return { period: monthPeriod, state, stateLabel: ALLOWANCE_LINE_STATE_LABELS[state], amount: money(cents(credit.amount)), ...runView(runId) }
        })
      const coversPeriod = recurringAllowanceCovers(row, period)
      let month = months.find(entry => entry.period === period) ?? null
      if (!month && coversPeriod) {
        const expectedCents = expected.get(row.id) ?? null
        if (expectedCents === 'NOT_IN_SERVICE') month = { period, state: 'NOT_IN_SERVICE', stateLabel: NOT_IN_SERVICE_LABEL, amount: 0, runId: null, runName: null, runStatus: null }
        else {
          // مستني حساب المسير، أو في مسير مفتوح محسوب قبل الإسناد = أعد الحساب؛ المبلغ بتناسب المنضم/المغادر (أو كامل لو الخدمة مش معروفة)
          const { state, runId } = this.monthState(null, openItems, row.employeeId, period)
          month = { period, state, stateLabel: ALLOWANCE_LINE_STATE_LABELS[state], amount: money(expectedCents ?? monthlyCents), ...runView(runId) }
        }
      }
      const settledPeriods = [...monthsMap.values()].filter(credit => !isManagedRecurringCredit(credit)).map(credit => credit.period).sort()
      const lastSettled = settledPeriods.length ? settledPeriods[settledPeriods.length - 1] : null
      const earliestStop = lastSettled && lastSettled >= row.fromPeriod ? shiftPayrollMonth(lastSettled, 1) : row.fromPeriod
      const end = recurringAllowanceEndExclusive(row)
      const lastMonth = recurringAllowanceLastMonth(row)
      const phase: RecurringAllowancePhase = row.status === 'STOPPED' ? 'STOPPED'
        : lastMonth !== null && lastMonth < period ? 'ENDED' : row.fromPeriod > period ? 'UPCOMING' : 'ACTIVE'
      const stoppable = row.status === 'ACTIVE' && (end === null || earliestStop < end)
      return {
        id: row.id, employeeId: row.employeeId, employeeCode: employee?.employeeCode ?? '', fullName: employee?.fullName ?? `#${row.employeeId}`,
        branchName: branchId ? names.branches.get(branchId) ?? null : null,
        departmentName: employee?.departmentId ? names.departments.get(employee.departmentId) ?? null : null,
        allowanceTypeId: row.allowanceTypeId, typeName: row.typeName, amount: money(monthlyCents),
        fromPeriod: row.fromPeriod, untilPeriod: row.untilPeriod, lastPeriod: lastMonth, coversAnyMonth: recurringAllowanceCoversAnyMonth(row),
        status: row.status, phase, stoppedFromPeriod: row.stoppedFromPeriod, stopReason: row.stopReason, stoppedAt: row.stoppedAt,
        stoppedByName: row.stoppedByUserId ? users.get(row.stoppedByUserId) ?? null : null,
        reason: row.reason, createdAt: row.createdAt, createdByName: users.get(row.createdByUserId) ?? null,
        coversPeriod, month, months, paidMonths: months.filter(entry => entry.state === 'PAID').map(entry => entry.period),
        defaultStopFrom: stoppable ? earliestStop : null,
        canStop: stoppable && (row.targetLevel !== 'company' || scope === null),
      }
    }).sort((a, b) => Number(b.coversPeriod) - Number(a.coversPeriod) || a.typeName.localeCompare(b.typeName, 'ar') || a.fullName.localeCompare(b.fullName, 'ar') || a.id - b.id)

    const covering = rows.filter(row => row.coversPeriod && row.month && row.month.state !== 'NOT_IN_SERVICE' && row.month.state !== 'CANCELLED')
    return { period, rows, ready: true,
      totals: { count: covering.length, employees: new Set(covering.map(row => row.employeeId)).size,
        amount: money(covering.reduce((sum, row) => sum + cents(row.month!.amount), 0)) } }
  }

  // ===== الإسناد =====
  async create(user: JwtPayload, input: RecurringAllowanceInput) {
    const scope = this.scope(user)
    const { fromPeriod, untilPeriod } = recurringAllowanceWindowInput(input)
    const type = await this.em.getRepository(PayrollAllowanceType).findOneBy({ id: Number(input.allowanceTypeId) })
    if (!type || (type.branchId !== null && !inBranchScope(scope, type.branchId))) throw new BadRequestException('اختار نوع البدل')
    if (!type.isActive) throw new BadRequestException('نوع البدل ده موقوف — فعّله الأول')
    const amount = allowanceAmount(input.amount)
    const reason = String(input.reason ?? '').trim()
    if (!reason) throw new BadRequestException('اكتب سبب البدل')
    if (reason.length > 500) throw new BadRequestException('السبب أطول من 500 حرف')
    await this.ready()
    const { target, employeeIds, branchOf } = await resolveAllowanceTargetInput(this.em, user, scope, type, input)
    const window = { fromPeriod, untilPeriod, stoppedFromPeriod: null }

    const result = await this.em.transaction(async em => {
      // نفس البدل لنفس الموظف في شهور متقاطعة ما يتصرفش مرتين
      const duplicates = new Set<number>()
      for (const chunk of chunks(employeeIds)) {
        const rows: Array<{ employeeId: number; fromPeriod: string; untilPeriod: string | null; stoppedFromPeriod: string | null }> = await em.query(`
          SELECT [employeeId], [fromPeriod], [untilPeriod], [stoppedFromPeriod] FROM [payroll_recurring_allowances] WITH (UPDLOCK, HOLDLOCK)
          WHERE [allowanceTypeId] = @0 AND [employeeId] IN (${idList(chunk, 1)})`, [type.id, ...chunk])
        for (const row of rows) if (recurringAllowancesOverlap(window, row)) duplicates.add(Number(row.employeeId))
      }
      const fresh = employeeIds.filter(id => !duplicates.has(id))
      if (!fresh.length) throw new BadRequestException(`كل الموظفين المختارين عندهم «${type.name}» ثابت في الشهور دي خلاص`)
      // شهر مسيره معتمد أو اتصرف للموظف ما بيتغيرش: البدل يبدأ بعده (والشهور اللي فاتت «صرف بدل» لشهرها)
      const locked = await this.lockedMonths(em, fresh, fromPeriod, untilPeriod)
      if (locked.length) {
        const last = locked.map(row => row.period).sort()[locked.length - 1]
        const count = new Set(locked.map(row => row.employeeId)).size
        throw new BadRequestException(`مسير ${last} معتمد أو اتصرف لـ${count === 1 ? 'موظف' : `${count} موظفين`} من المختارين — ابدأ البدل من ${shiftPayrollMonth(last, 1)}، والشهور اللي فاتت تتصرف من «صرف بدل» لشهرها`)
      }
      for (const chunk of chunks(fresh, INSERT_CHUNK)) {
        await em.getRepository(PayrollRecurringAllowance).insert(chunk.map(employeeId => ({ employeeId, branchId: branchOf.get(employeeId) ?? null, allowanceTypeId: type.id,
          typeName: type.name, amount, fromPeriod, untilPeriod, targetLevel: target.level, reason, status: 'ACTIVE', stoppedFromPeriod: null, stopReason: null,
          stoppedByUserId: null, stoppedAt: null, createdByUserId: user.sub })))
      }
      return { fresh, skipped: duplicates.size }
    })
    const recalculateRuns = await this.openRunsFor(result.fresh, fromPeriod, untilPeriod)
    return { created: result.fresh.length, skippedDuplicates: result.skipped, amount: money(cents(amount)), monthlyTotal: money(cents(amount) * result.fresh.length),
      fromPeriod, untilPeriod, recalculateRuns }
  }

  // ===== الإيقاف =====
  async stop(user: JwtPayload, id: number, input: RecurringAllowanceStopInput) {
    const scope = this.scope(user)
    const reason = String(input.reason ?? '').trim()
    if (!reason) throw new BadRequestException('اكتب سبب الإيقاف')
    if (reason.length > 500) throw new BadRequestException('السبب أطول من 500 حرف')
    await this.ready()
    const row = await this.assignments.findOneBy({ id })
    const branchId = row ? (await this.employeesOf([row.employeeId])).get(row.employeeId)?.branchId ?? row.branchId : null
    // برّه نطاق الحساب = نفس رد الرقم اللي مش موجود
    if (!row || !inBranchScope(scope, branchId)) throw new NotFoundException('البدل الثابت مش موجود')
    if (row.targetLevel === 'company') assertCompanyWideWrite(user)
    const result = await this.em.transaction(async em => {
      await lockPayrollEmployees(em, [row.employeeId])
      const current = await em.getRepository(PayrollRecurringAllowance).findOneByOrFail({ id })
      const credits = (await readRecurringCredits(em, [current.employeeId], null)).filter(credit => credit.assignmentId === current.id)
      const settledPeriods = credits.filter(credit => !isManagedRecurringCredit(credit)).map(credit => credit.period)
      const { stopFrom } = planRecurringAllowanceStop(current, settledPeriods, input.fromPeriod)
      // قيود الشهور من شهر الإيقاف واللي بعده لسه ما اتعتمدتش (مُدارة) — تتلغي؛ المعتمد والمصروف قبله زي ما هو
      const toCancel = credits.filter(credit => isManagedRecurringCredit(credit) && credit.period >= stopFrom)
      const cancelled = await cancelManagedRecurringCredits(em, toCancel.map(credit => credit.id))
      if (cancelled.length !== toCancel.length) throw new ConflictException('البدل اتغير أثناء الإيقاف؛ جرّب تاني')
      const updated: Array<{ id: number }> = await em.query(`UPDATE [payroll_recurring_allowances]
        SET [status] = N'STOPPED', [stoppedFromPeriod] = @1, [stopReason] = @2, [stoppedByUserId] = @3, [stoppedAt] = SYSUTCDATETIME()
        OUTPUT INSERTED.[id] WHERE [id] = @0 AND [status] = N'ACTIVE'`, [current.id, stopFrom, reason, user.sub])
      if (updated.length !== 1) throw new ConflictException('البدل اتغير أثناء الإيقاف؛ جرّب تاني')
      return { stopFrom, cancelledMonths: [...new Set(toCancel.map(credit => credit.period))].sort() }
    })
    const recalculateRuns = await this.openRunsFor([row.employeeId], result.stopFrom, null)
    return { id: row.id, status: 'STOPPED', stoppedFromPeriod: result.stopFrom, cancelledMonths: result.cancelledMonths, recalculateRuns }
  }
}
