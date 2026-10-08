import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, type EntityManager } from 'typeorm'
import { recordAudit } from '../audit/audit'
import type { JwtPayload } from '../auth/auth.service'
import { assertCompanyWideWrite, branchScopeOf, inBranchScope, userHasPerm, type BranchScope } from '../auth/guards'
import { readBranchCurrencyOf } from '../org/branch-currency-db'
import { ADJUST_STATUSES, BUDGET_STATUSES, budgetUsage, CompensationBudget, CompensationCycle, CompensationProposal, compensationCyclesReady, coveringUnits, CYCLE_STATUS_LABELS,
  CYCLE_STEPS, cycleFields, cycleStepOf, PROPOSE_STATUSES, RAISE_AMOUNT_ERROR, raiseAmount, raiseNote } from './compensation-cycles'

// B5.1 (ب): دورة الزيادات — الدورة وميزانياتها وسطور الاقتراح. **مفيش راتب بيتغيّر من هنا** (التطبيق في الجزء ج من خدمة تاريخ الراتب).
//  - تحريك الدورة: حساب بكل الفروع. الميزانية والتعديل: بنطاق فروع الحساب (فرع الموظف أو الوحدة الحالي).
//  - المدير المباشر بيقترح لمرؤوسيه المباشرين بس، وبيكتب المبلغ ومابيشوفش الراتب.
//  - كل كتابة تحت قفل صف الدورة ثم صف الموظف، والحكم بعد القفل.

export const CYCLES_MIGRATION_MISSING = 'جداول دورات الزيادات ناقصة — طبّق ترحيلات 140 و141 و142 الأول'
const CYCLE_NOT_FOUND = 'دورة الزيادات مش موجودة'
const EMPLOYEE_NOT_FOUND = 'الموظف مش موجود'
const NOT_IN_TEAM = 'الموظف ده مش من مرؤوسيك المباشرين'
const UNIT_NOT_FOUND = 'الإدارة أو القسم مش موجود'
const NOT_ACTIVE = 'الموظف مش على رأس العمل — مفيش زيادة تتقترح له'
const ACTIVE = `e.[isActive] = 1 AND e.[status] IN (N'active', N'probation', N'notice_period')`
const round2 = (value: number) => Math.round(value * 100) / 100

interface LockedEmployee { id: number; fullName: string; branchId: number | null; departmentId: number | null; managerEmployeeId: number | null; basicSalary: number; active: boolean }

@Injectable()
export class CompensationCyclesService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  private async assertReady(em: EntityManager) {
    if (!(await compensationCyclesReady(em))) throw new BadRequestException(CYCLES_MIGRATION_MISSING)
  }

  private async lockCycle(em: EntityManager, id: number): Promise<CompensationCycle> {
    const row = await em.getRepository(CompensationCycle).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
    if (!row) throw new NotFoundException(CYCLE_NOT_FOUND)
    return row
  }

  /** صف الموظف تحت قفل: الفرع والقسم والمدير والنشاط بيتحكم عليهم بعد القفل */
  private async lockEmployee(em: EntityManager, id: number): Promise<LockedEmployee | null> {
    const [row]: Array<Record<string, unknown>> = await em.query(
      `SELECT e.[id], e.[fullName], e.[branchId], e.[departmentId], e.[managerEmployeeId], e.[basicSalary], CASE WHEN ${ACTIVE} THEN 1 ELSE 0 END AS [active]
       FROM [employees] e WITH (UPDLOCK, ROWLOCK) WHERE e.[id] = @0`, [id])
    if (!row) return null
    const idOf = (value: unknown) => (value == null ? null : Number(value))
    return { id: Number(row.id), fullName: String(row.fullName), branchId: idOf(row.branchId), departmentId: idOf(row.departmentId), managerEmployeeId: idOf(row.managerEmployeeId),
      basicSalary: Number(row.basicSalary ?? 0), active: Number(row.active) === 1 }
  }

  private view(cycle: CompensationCycle) {
    return { id: cycle.id, name: cycle.name, effectivePayrollPeriod: cycle.effectivePayrollPeriod, status: cycle.status, statusLabel: CYCLE_STATUS_LABELS[cycle.status], note: cycle.note,
      createdAt: cycle.createdAt, openedAt: cycle.openedAt, reviewAt: cycle.reviewAt, approvedAt: cycle.approvedAt, appliedAt: cycle.appliedAt }
  }

  // ===== الدورات =====

  async list(_user: JwtPayload) {
    const em = this.ds.manager
    if (!(await compensationCyclesReady(em))) return { ready: false, cycles: [] }
    const rows = await em.getRepository(CompensationCycle).find({ order: { id: 'DESC' } })
    return { ready: true, cycles: rows.map(row => this.view(row)) }
  }

  async create(user: JwtPayload, body: unknown) {
    assertCompanyWideWrite(user)
    const checked = cycleFields(body)
    if (checked.fields === null) throw new BadRequestException(checked.error)
    const fields = checked.fields
    const id = await this.ds.transaction(async em => {
      await this.assertReady(em)
      const saved = await em.getRepository(CompensationCycle).insert({ ...fields, status: 'DRAFT', createdByUserId: user.sub, createdAt: new Date(), openedAt: null, reviewByUserId: null, reviewAt: null,
        approvedByUserId: null, approvedAt: null, appliedAt: null, updatedByUserId: null, updatedAt: null })
      const cycleId = Number(saved.identifiers[0].id)
      await recordAudit(em, { category: 'PAYROLL', action: 'RAISE_CYCLE_CREATED', entityType: 'compensation_cycle', entityId: String(cycleId), actorUserId: user.sub,
        summary: `دورة زيادات جديدة: ${fields.name} (يسري من راتب ${fields.effectivePayrollPeriod})`, after: { name: fields.name, effectivePayrollPeriod: fields.effectivePayrollPeriod } })
      return cycleId
    })
    return this.detail(user, id)
  }

  /** فتح / مراجعة / رجوع للاقتراحات / إلغاء — تحت قفل صف الدورة والحكم بعده */
  async move(user: JwtPayload, id: number, rawStep: unknown) {
    assertCompanyWideWrite(user)
    const step = cycleStepOf(rawStep)
    if (!step) throw new NotFoundException('الخطوة مش معروفة')
    const rule = CYCLE_STEPS[step]
    await this.ds.transaction(async em => {
      await this.assertReady(em)
      const cycle = await this.lockCycle(em, id)
      if (!rule.from.includes(cycle.status)) throw new BadRequestException(`«${rule.label}» مش متاحة والدورة «${CYCLE_STATUS_LABELS[cycle.status]}»`)
      const now = new Date()
      await em.getRepository(CompensationCycle).update({ id }, { status: rule.to, updatedByUserId: user.sub, updatedAt: now,
        ...(step === 'open' ? { openedAt: now } : {}), ...(step === 'review' ? { reviewByUserId: user.sub, reviewAt: now } : {}), ...(step === 'reopen' ? { reviewByUserId: null, reviewAt: null } : {}) })
      await recordAudit(em, { category: 'PAYROLL', action: 'RAISE_CYCLE_MOVED', entityType: 'compensation_cycle', entityId: String(id), actorUserId: user.sub,
        summary: `${rule.label}: ${cycle.name}`, before: { status: cycle.status }, after: { status: rule.to } })
    })
    return this.detail(user, id)
  }

  // ===== المراجعة =====

  /** أسماء الحسابات اللي كتبت على السطور — اللي برّه نطاق القارئ اسمه مابيطلعش */
  private async accountNames(em: EntityManager, ids: number[], scope: BranchScope): Promise<Map<number, string | null>> {
    const unique = [...new Set(ids)]
    if (!unique.length) return new Map()
    const rows: Array<{ id: number; displayName: string | null; branchId: number | null; employeeBranchId: number | null }> = await em.query(
      `SELECT u.[id], u.[displayName], u.[branchId], pe.[branchId] AS [employeeBranchId] FROM [users] u LEFT JOIN [employees] pe ON pe.[id] = u.[employeeId]
       WHERE u.[id] IN (${unique.map((_, index) => `@${index}`).join(', ')})`, unique)
    return new Map(rows.map(row => [Number(row.id), inBranchScope(scope, row.employeeBranchId ?? row.branchId) ? row.displayName ?? null : null]))
  }

  /** الدورة للمراجعة: سطور موظفين نطاق الحساب (بفرعهم الحالي) بس، والإجماليات والميزانيات منهم بس. الراتب والنسبة لصاحب «عرض الرواتب». */
  async detail(user: JwtPayload, id: number) {
    const em = this.ds.manager
    await this.assertReady(em)
    const cycle = await em.getRepository(CompensationCycle).findOneBy({ id })
    if (!cycle) throw new NotFoundException(CYCLE_NOT_FOUND)
    const scope = branchScopeOf(user), salaries = userHasPerm(user, 'payroll.view'), currencyOf = await readBranchCurrencyOf(em)
    const units: Array<{ id: number; name: string; parentId: number | null; branchId: number | null; unitType: string; isActive: boolean | number }> = await em.query(
      'SELECT [id], [name], [parentId], [branchId], [unitType], [isActive] FROM [departments] ORDER BY [id]')
    const parentOf = new Map(units.map(unit => [Number(unit.id), unit.parentId == null ? null : Number(unit.parentId)]))
    const unitName = new Map(units.map(unit => [Number(unit.id), unit.name]))
    const people: Array<Record<string, unknown>> = await em.query(
      `SELECT e.[id], e.[fullName], e.[employeeCode], e.[branchId], e.[departmentId], e.[basicSalary], CASE WHEN ${ACTIVE} THEN 1 ELSE 0 END AS [active] FROM [employees] e ORDER BY e.[fullName], e.[id]`)
    const visible = new Map(people.filter(row => inBranchScope(scope, row.branchId == null ? null : Number(row.branchId))).map(row => [Number(row.id), row]))
    const proposals = (await em.getRepository(CompensationProposal).find({ where: { cycleId: id }, order: { id: 'ASC' } })).filter(row => visible.has(row.employeeId))
    const names = await this.accountNames(em, proposals.flatMap(row => [row.proposedByUserId, ...(row.adjustedByUserId == null ? [] : [row.adjustedByUserId])]), scope)
    const lines = proposals.map(row => {
      const person = visible.get(row.employeeId)!, departmentId = person.departmentId == null ? null : Number(person.departmentId)
      const basic = Number(person.basicSalary ?? 0), final = Number(row.finalAmount)
      return {
        employeeId: row.employeeId, fullName: String(person.fullName), employeeCode: (person.employeeCode as string | null) ?? null, active: Number(person.active) === 1,
        departmentId, departmentName: departmentId == null ? null : unitName.get(departmentId) ?? null, currency: currencyOf(person.branchId == null ? null : Number(person.branchId)),
        proposedAmount: Number(row.proposedAmount), proposedBy: names.get(row.proposedByUserId) ?? null, proposedAt: row.proposedAt, note: row.note,
        finalAmount: final, adjusted: row.adjustedByUserId != null, adjustedBy: row.adjustedByUserId == null ? null : names.get(row.adjustedByUserId) ?? null, adjustedAt: row.adjustedAt, adjustNote: row.adjustNote,
        appliedAt: row.appliedAt,
        // أرقام الراتب لصاحب «عرض الرواتب» بس
        currentBasic: salaries ? basic : null, newBasic: salaries ? round2(basic + final) : null, percent: salaries && basic > 0 ? round2((final / basic) * 100) : null,
        basicChanged: salaries ? round2(basic) !== round2(Number(row.currentBasic)) : null,
      }
    })
    const budgetRows = await em.getRepository(CompensationBudget).find({ where: { cycleId: id } })
    const budgetOf = new Map(budgetRows.map(row => [row.departmentId, Number(row.amount)]))
    const usedOf = new Map<number, number>()
    for (const line of lines) for (const unit of coveringUnits(line.departmentId, parentOf)) usedOf.set(unit, (usedOf.get(unit) ?? 0) + line.finalAmount)
    const budgets = units.filter(unit => inBranchScope(scope, unit.branchId == null ? null : Number(unit.branchId)))
      .filter(unit => unit.isActive === true || unit.isActive === 1 || budgetOf.has(Number(unit.id)))
      .map(unit => {
        const unitId = Number(unit.id), budget = budgetOf.get(unitId) ?? null, used = round2(usedOf.get(unitId) ?? 0)
        return { departmentId: unitId, name: unit.name, unitType: unit.unitType, currency: currencyOf(unit.branchId == null ? null : Number(unit.branchId)),
          ...(budget === null ? { budget: null, used, remaining: null, over: false } : budgetUsage(budget, used)) }
      })
    const currencies = [...new Set(lines.map(line => line.currency))]
    const withLine = new Set(lines.map(line => line.employeeId))
    return {
      cycle: this.view(cycle), salaries, canMove: scope === null,
      canAdjust: ADJUST_STATUSES.includes(cycle.status), canBudget: BUDGET_STATUSES.includes(cycle.status),
      lines, budgets,
      totals: currencies.map(currency => {
        const rows = lines.filter(line => line.currency === currency)
        return { currency, count: rows.length, proposed: round2(rows.reduce((sum, line) => sum + line.proposedAmount, 0)), final: round2(rows.reduce((sum, line) => sum + line.finalAmount, 0)) }
      }),
      // موظفين النطاق النشطين اللي لسه مالهمش سطر — للمراجعة تضيف منهم
      candidates: [...visible.values()].filter(row => Number(row.active) === 1 && !withLine.has(Number(row.id)))
        .map(row => ({ employeeId: Number(row.id), fullName: String(row.fullName), employeeCode: (row.employeeCode as string | null) ?? null })),
    }
  }

  /** ميزانية وحدة في الدورة (null = من غير ميزانية) — الوحدة بفرعها الحالي في نطاق الحساب، تحت قفل صف الدورة */
  async setBudget(user: JwtPayload, id: number, departmentId: number, rawAmount: unknown) {
    const amount = rawAmount === null || rawAmount === undefined || rawAmount === '' ? null : raiseAmount(rawAmount)
    if (amount === null && !(rawAmount === null || rawAmount === undefined || rawAmount === '')) throw new BadRequestException(RAISE_AMOUNT_ERROR)
    await this.ds.transaction(async em => {
      await this.assertReady(em)
      const cycle = await this.lockCycle(em, id)
      const [unit]: Array<{ id: number; name: string; branchId: number | null }> = await em.query('SELECT [id], [name], [branchId] FROM [departments] WITH (UPDLOCK, ROWLOCK) WHERE [id] = @0', [departmentId])
      if (!unit || !inBranchScope(branchScopeOf(user), unit.branchId == null ? null : Number(unit.branchId))) throw new NotFoundException(UNIT_NOT_FOUND)
      if (!BUDGET_STATUSES.includes(cycle.status)) throw new BadRequestException(`الميزانية مابتتعدّلش والدورة «${CYCLE_STATUS_LABELS[cycle.status]}»`)
      const repo = em.getRepository(CompensationBudget), existing = await repo.findOne({ where: { cycleId: id, departmentId } })
      if (amount === null) { if (existing) await repo.delete({ id: existing.id }) }
      else if (existing) await repo.update({ id: existing.id }, { amount, updatedByUserId: user.sub, updatedAt: new Date() })
      else await repo.insert({ cycleId: id, departmentId, amount, updatedByUserId: user.sub, updatedAt: new Date() })
      await recordAudit(em, { category: 'PAYROLL', action: 'RAISE_BUDGET_SET', entityType: 'compensation_budget', entityId: `${id}:${departmentId}`, actorUserId: user.sub,
        branchId: unit.branchId == null ? null : Number(unit.branchId), summary: `ميزانية زيادات «${unit.name}» في دورة ${cycle.name}: ${amount === null ? 'من غير ميزانية' : amount}`,
        before: { amount: existing ? Number(existing.amount) : null }, after: { amount } })
    })
    return this.detail(user, id)
  }

  /** كتابة السطر: أول مبلغ = اقتراح؛ والمراجعة بتعدّل «النهائي» بسببها؛ واقتراح المدير بعد تعديل المراجعة مابيغيّرش النهائي */
  private async writeLine(em: EntityManager, cycle: CompensationCycle, employee: LockedEmployee, user: JwtPayload, amount: number, note: string | null, mode: 'propose' | 'adjust') {
    const repo = em.getRepository(CompensationProposal), existing = await repo.findOne({ where: { cycleId: cycle.id, employeeId: employee.id } })
    const now = new Date(), basic = round2(employee.basicSalary)
    if (!existing) {
      await repo.insert({ cycleId: cycle.id, employeeId: employee.id, currentBasic: basic, proposedAmount: amount, proposedByUserId: user.sub, proposedAt: now, note, finalAmount: amount,
        adjustedByUserId: null, adjustedAt: null, adjustNote: null, appliedAt: null, appliedByUserId: null, appliedRevision: null })
    } else if (mode === 'propose') {
      await repo.update({ id: existing.id }, { proposedAmount: amount, proposedByUserId: user.sub, proposedAt: now, note,
        ...(existing.adjustedByUserId == null ? { finalAmount: amount, currentBasic: basic } : {}) })
    } else {
      await repo.update({ id: existing.id }, { finalAmount: amount, currentBasic: basic, adjustedByUserId: user.sub, adjustedAt: now, adjustNote: note })
    }
    await recordAudit(em, { category: 'PAYROLL', action: mode === 'propose' || !existing ? 'RAISE_PROPOSED' : 'RAISE_ADJUSTED', entityType: 'compensation_proposal', entityId: `${cycle.id}:${employee.id}`,
      actorUserId: user.sub, branchId: employee.branchId, summary: `${mode === 'propose' || !existing ? 'اقتراح زيادة' : 'تعديل زيادة'} لـ${employee.fullName} في دورة ${cycle.name}`,
      before: existing ? { proposedAmount: Number(existing.proposedAmount), finalAmount: Number(existing.finalAmount) } : undefined,
      after: { amount, note } })
  }

  /** المراجعة بتضيف سطر أو بتعدّل «النهائي» — بسبب مكتوب، لموظف في نطاق الحساب بفرعه الحالي */
  async adjustLine(user: JwtPayload, id: number, employeeId: number, body: { amount?: unknown; note?: unknown }) {
    const amount = raiseAmount(body.amount)
    if (amount === null) throw new BadRequestException(RAISE_AMOUNT_ERROR)
    const note = raiseNote(body.note, true)
    if (note.error !== null) throw new BadRequestException(note.error)
    await this.ds.transaction(async em => {
      await this.assertReady(em)
      const cycle = await this.lockCycle(em, id)
      const employee = await this.lockEmployee(em, employeeId)
      if (!employee || !inBranchScope(branchScopeOf(user), employee.branchId)) throw new NotFoundException(EMPLOYEE_NOT_FOUND)
      if (!ADJUST_STATUSES.includes(cycle.status)) throw new BadRequestException(`السطور مابتتعدّلش والدورة «${CYCLE_STATUS_LABELS[cycle.status]}»`)
      if (!employee.active) throw new BadRequestException(NOT_ACTIVE)
      await this.writeLine(em, cycle, employee, user, amount, note.note, 'adjust')
    })
    return this.detail(user, id)
  }

  // ===== ورقة المدير =====

  /** الدورات المفتوحة ومرؤوسيني المباشرين النشطين باقتراحي لكل واحد — من غير أي رقم راتب */
  async myTeam(user: JwtPayload) {
    const em = this.ds.manager, me = user.employeeId == null ? null : Number(user.employeeId)
    if (me === null || !(await compensationCyclesReady(em))) return { cycles: [] }
    const team: Array<{ id: number; fullName: string; employeeCode: string | null; branchId: number | null }> = await em.query(
      `SELECT e.[id], e.[fullName], e.[employeeCode], e.[branchId] FROM [employees] e WHERE e.[managerEmployeeId] = @0 AND e.[id] <> @0 AND ${ACTIVE} ORDER BY e.[fullName], e.[id]`, [me])
    if (!team.length) return { cycles: [] }
    const cycles = await em.getRepository(CompensationCycle).find({ where: { status: 'OPEN' }, order: { id: 'ASC' } })
    const currencyOf = await readBranchCurrencyOf(em), ids = new Set(team.map(row => Number(row.id)))
    const out = []
    for (const cycle of cycles) {
      const lineOf = new Map((await em.getRepository(CompensationProposal).find({ where: { cycleId: cycle.id } })).filter(row => ids.has(row.employeeId)).map(row => [row.employeeId, row]))
      const rows = team.map(person => {
        const line = lineOf.get(Number(person.id))
        return { employeeId: Number(person.id), fullName: person.fullName, employeeCode: person.employeeCode ?? null, currency: currencyOf(person.branchId == null ? null : Number(person.branchId)),
          amount: line ? Number(line.proposedAmount) : null, note: line?.note ?? null, adjusted: line ? line.adjustedByUserId != null : false }
      })
      out.push({ id: cycle.id, name: cycle.name, effectivePayrollPeriod: cycle.effectivePayrollPeriod, team: rows,
        totals: [...new Set(rows.map(row => row.currency))].map(currency => ({ currency, amount: round2(rows.filter(row => row.currency === currency).reduce((sum, row) => sum + (row.amount ?? 0), 0)) })) })
    }
    return { cycles: out }
  }

  /** اقتراح المدير لمرؤوس مباشر — «مرؤوسي المباشر» بيتحكم عليه بعد قفل صف الموظف، وغير كده = مش موجود */
  async propose(user: JwtPayload, id: number, employeeId: number, body: { amount?: unknown; note?: unknown }) {
    const me = user.employeeId == null ? null : Number(user.employeeId)
    if (me === null) throw new ForbiddenException('حسابك مش مربوط بملف موظف')
    const amount = raiseAmount(body.amount)
    if (amount === null) throw new BadRequestException(RAISE_AMOUNT_ERROR)
    const note = raiseNote(body.note, false)
    if (note.error !== null) throw new BadRequestException(note.error)
    await this.ds.transaction(async em => {
      await this.assertReady(em)
      const cycle = await this.lockCycle(em, id)
      const employee = await this.lockEmployee(em, employeeId)
      if (!employee || employee.id === me || employee.managerEmployeeId !== me || !employee.active) throw new NotFoundException(NOT_IN_TEAM)
      if (!PROPOSE_STATUSES.includes(cycle.status)) throw new BadRequestException('الدورة مش مفتوحة للاقتراحات')
      await this.writeLine(em, cycle, employee, user, amount, note.note, 'propose')
    })
    return this.myTeam(user)
  }
}
