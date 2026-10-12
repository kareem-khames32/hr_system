import { BadRequestException, ConflictException, ForbiddenException, HttpException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, type EntityManager } from 'typeorm'
import { recordAudit } from '../audit/audit'
import type { JwtPayload } from '../auth/auth.service'
import { assertCompanyWideWrite, branchScopeOf, inBranchScope, userHasPerm, type BranchScope } from '../auth/guards'
import { ModulesService } from '../modules-registry/modules.service'
import { readBranchCurrencyOf } from '../org/branch-currency-db'
import { audienceMembersNow } from '../org/audience-preview'
import { assertAudienceTargets, orgAudienceJson } from '../org/org-audience'
import { applyEmployeeSalaryChange, type EmployeeSalaryValue } from '../payroll/payroll-salary-change'
import { readSalaryHistory, readSalaryHistoryCurrent } from '../payroll/payroll-salary-history'
import { REVIEW_BANDS, reviewBand, reviewsReady } from '../performance/review-rules'
import { ADJUST_STATUSES, approverIssue, cycleWriterIds, recordCycleWriter, BUDGET_STATUSES, budgetUsage, CompensationBudget, CompensationCycle, CompensationProposal, compensationCyclesReady, coveringUnits, CYCLE_STATUS_LABELS,
  CYCLE_STEPS, cycleEvidenceReference, cycleFields, cycleStepOf, percentAmount, percentNote, PERCENT_STATUSES, PROPOSE_STATUSES, RAISE_AMOUNT_ERROR, RAISE_AMOUNT_MAX, RAISE_PERCENT_BASIS_LABELS, RAISE_PERCENT_ERROR, RAISE_PERCENT_MAX_EMPLOYEES,
  raiseAmount, raisedBasic, raiseNote, raisePercent, raisePercentBasis, sameBasic } from './compensation-cycles'

// B5.1 (ب، ج): دورة الزيادات — الدورة وميزانياتها وسطور الاقتراح، واعتمادها وتطبيقها. الراتب بيتكتب في مكان واحد بس: `apply`، ومن خدمة تاريخ
// الراتب القايمة (`applyEmployeeSalaryChange`) بعد اعتماد من حد ماقترحش — مفيش كتابة راتب تانية في الملف ده.
//  - تحريك الدورة: حساب بكل الفروع. الميزانية والتعديل: بنطاق فروع الحساب (فرع الموظف أو الوحدة الحالي).
//  - المدير المباشر بيقترح لمرؤوسيه المباشرين بس، وبيكتب المبلغ ومابيشوفش الراتب.
//  - كل كتابة تحت قفل صف الدورة ثم صف الموظف، والحكم بعد القفل.

export const CYCLES_MIGRATION_MISSING = 'جداول دورات الزيادات ناقصة — طبّق ترحيلات 140 و141 و142 و181 الأول'
const CYCLE_NOT_FOUND = 'دورة الزيادات مش موجودة'
const EMPLOYEE_NOT_FOUND = 'الموظف مش موجود'
const NOT_IN_TEAM = 'الموظف ده مش من مرؤوسيك المباشرين'
const UNIT_NOT_FOUND = 'الإدارة أو القسم مش موجود'
const NOT_ACTIVE = 'الموظف مش على رأس العمل — مفيش زيادة تتقترح له'
const APPLY_NOT_ACTIVE = 'الموظف مش على رأس العمل — زيادته مااتطبّقتش'
export const APPLY_BASIC_CHANGED = 'أساسي الموظف اتغيّر بعد آخر مراجعة لسطره — رجّع الدورة للمراجعة وراجع السطر'
const APPLY_NEEDS_EDIT = 'تطبيق الزيادات على الرواتب محتاج «تعديل الموظفين» مع «اعتماد المسير»'
const APPROVED_ONLY = 'الخطوة دي للدورة المعتمدة بس'
// B-ADD.11
const PERCENT_NEEDS_SALARIES = 'الزيادة بالنسبة محتاجة «عرض الرواتب» — المبلغ والنسبة مع بعض بيكشفوا الراتب'
const PERCENT_AUDIENCE = 'المستهدفين بالنسبة'
const PERCENT_NOBODY = 'مفيش موظفين على رأس العمل في الاختيار ده'
const ACTIVE = `e.[isActive] = 1 AND e.[status] IN (N'active', N'probation', N'notice_period')`
const round2 = (value: number) => Math.round(value * 100) / 100

interface LockedEmployee { id: number; fullName: string; branchId: number | null; departmentId: number | null; managerEmployeeId: number | null; basicSalary: number; active: boolean }

@Injectable()
export class CompensationCyclesService {
  constructor(@InjectDataSource() private readonly ds: DataSource, private readonly modules: ModulesService) {}

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
    // Codex P5A-B03: قسم اتنقل لفرع برّه نطاق القارئ مايتعرضش برقمه ولا باسمه — الحكم بفرع القسم الحالي (الموظف نفسه لسه في نطاقه)
    const unitBranch = new Map(units.map(unit => [Number(unit.id), unit.branchId == null ? null : Number(unit.branchId)]))
    const unitShown = (unitId: number | null) => unitId != null && unitBranch.has(unitId) && (unitBranch.get(unitId) == null || inBranchScope(scope, unitBranch.get(unitId) ?? null))
    // القسم الحقيقي للسطر (لحساب استهلاك ميزانيات وحدات نطاق القارئ) — مابيطلعش في الرد
    const ownUnit = new Map<number, number | null>()
    const people: Array<Record<string, unknown>> = await em.query(
      `SELECT e.[id], e.[fullName], e.[employeeCode], e.[branchId], e.[departmentId], e.[basicSalary], CASE WHEN ${ACTIVE} THEN 1 ELSE 0 END AS [active] FROM [employees] e ORDER BY e.[fullName], e.[id]`)
    const visible = new Map(people.filter(row => inBranchScope(scope, row.branchId == null ? null : Number(row.branchId))).map(row => [Number(row.id), row]))
    const proposals = (await em.getRepository(CompensationProposal).find({ where: { cycleId: id }, order: { id: 'ASC' } })).filter(row => visible.has(row.employeeId))
    const names = await this.accountNames(em, proposals.flatMap(row => [row.proposedByUserId, ...(row.adjustedByUserId == null ? [] : [row.adjustedByUserId])]), scope)
    // (ج) آخر نتيجة أداء معتمدة — لو موديول الأداء مفتوح وللي معاه صلاحيته
    const scores = await this.performanceScores(em, user, id, proposals.map(row => row.employeeId))
    const lines = proposals.map(row => {
      const person = visible.get(row.employeeId)!, departmentId = person.departmentId == null ? null : Number(person.departmentId)
      const basic = Number(person.basicSalary ?? 0), final = Number(row.finalAmount), score = scores?.get(row.employeeId) ?? null
      ownUnit.set(row.employeeId, departmentId)
      return {
        performanceScore: score, performanceLabel: score === null ? null : REVIEW_BANDS.find(band => band.key === reviewBand(score))?.label ?? null,
        employeeId: row.employeeId, fullName: String(person.fullName), employeeCode: (person.employeeCode as string | null) ?? null, active: Number(person.active) === 1,
        departmentId: unitShown(departmentId) ? departmentId : null, departmentName: unitShown(departmentId) ? unitName.get(departmentId as number) ?? null : null, currency: currencyOf(person.branchId == null ? null : Number(person.branchId)),
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
    for (const line of lines) for (const unit of coveringUnits(ownUnit.get(line.employeeId) ?? null, parentOf)) usedOf.set(unit, (usedOf.get(unit) ?? 0) + line.finalAmount)
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
      canAdjust: ADJUST_STATUSES.includes(cycle.status), canBudget: BUDGET_STATUSES.includes(cycle.status), canPercent: salaries && PERCENT_STATUSES.includes(cycle.status),
      // (ج) الاعتماد والتطبيق: لحساب بكل الفروع بصلاحية اعتماد المسير (والتطبيق محتاج تعديل الموظفين كمان)
      canApprove: scope === null && userHasPerm(user, 'payroll.approve'), canApply: scope === null && userHasPerm(user, 'payroll.approve') && userHasPerm(user, 'employees.edit'),
      performance: scores !== null,
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
    // سجل الكاتبين مابيتمسحش: تعديل لاحق من حد تاني مابيرجّعش للكاتب الأول حق الاعتماد (Codex P5A-B02)
    await recordCycleWriter(em, cycle.id, user.sub)
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

  /**
   * B-ADD.11 (كلمة المالك 12 أكتوبر 2026): «زيادة بالنسبة» — المراجعة بتكتب نسبة و«على مين؟» (الاستهداف الموحد)، والنظام بيحسب مبلغ
   * كل موظف من أساسيه (أو إجمالي راتبه الثابت) ويكتبه «النهائي» في سطره. النسبة العامة أول تطبيق، والاستثناء (نسبة تانية أو صفر لإدارة
   * أو قسم أو موظفين بالاسم) تطبيق تاني بيكتب فوق سطور المختارين — آخر تطبيق هو اللي بيسري. الزيادة نفسها دايمًا على الأساسي
   * (التطبيق على الرواتب زي ما هو). بصلاحية «عرض الرواتب» كمان، وتحت قفل الدورة ثم صفوف الموظفين، والعضوية بتتعاد بعد القفل.
   */
  async applyPercent(user: JwtPayload, id: number, body: { percent?: unknown; basis?: unknown; audience?: unknown; note?: unknown }) {
    if (!userHasPerm(user, 'payroll.view')) throw new ForbiddenException(PERCENT_NEEDS_SALARIES)
    const percent = raisePercent(body.percent), basis = raisePercentBasis(body.basis)
    if (percent === null) throw new BadRequestException(RAISE_PERCENT_ERROR)
    if (basis === null) throw new BadRequestException('اختار النسبة من الأساسي ولا من إجمالي الراتب')
    const extra = raiseNote(body.note, false)
    if (extra.error !== null) throw new BadRequestException(extra.error)
    const audience = orgAudienceJson(body.audience, PERCENT_AUDIENCE), scope = branchScopeOf(user)
    const result = await this.ds.transaction(async em => {
      await this.assertReady(em)
      const cycle = await this.lockCycle(em, id)
      if (!PERCENT_STATUSES.includes(cycle.status)) throw new BadRequestException(`السطور مابتتعدّلش والدورة «${CYCLE_STATUS_LABELS[cycle.status]}»`)
      await assertAudienceTargets(em, audience, PERCENT_AUDIENCE)
      const first = (await audienceMembersNow(em, audience, scope)).map(row => row.id)
      if (!first.length) throw new BadRequestException(PERCENT_NOBODY)
      if (first.length > RAISE_PERCENT_MAX_EMPLOYEES) throw new BadRequestException(`الاختيار أكبر من ${RAISE_PERCENT_MAX_EMPLOYEES} موظف — طبّق النسبة على فروع أو إدارات`)
      // قفل صفوف المختارين بترتيب ثابت، وبعده العضوية والراتب بيتقروا من جديد (الحكم بعد القفل)
      const sorted = [...first].sort((a, b) => a - b)
      for (let index = 0; index < sorted.length; index += 1000) {
        await em.query(`SELECT e.[id] FROM [employees] e WITH (UPDLOCK, ROWLOCK) WHERE e.[id] IN (SELECT CAST([value] AS int) FROM OPENJSON(@0)) ORDER BY e.[id]`, [JSON.stringify(sorted.slice(index, index + 1000))])
      }
      const locked = new Set(sorted)
      const members = (await audienceMembersNow(em, audience, scope)).map(row => row.id).filter(memberId => locked.has(memberId))
      const pay = new Map<number, { branchId: number | null; basic: number; total: number }>()
      for (let index = 0; index < members.length; index += 1000) {
        const rows: Array<Record<string, unknown>> = await em.query(
          `SELECT e.[id], e.[branchId], e.[basicSalary], e.[housingAllowance], e.[transportAllowance], e.[phoneAllowance], e.[workNatureAllowance], e.[otherAllowance], e.[workPressureAllowance]
           FROM [employees] e WHERE ${ACTIVE} AND e.[id] IN (SELECT CAST([value] AS int) FROM OPENJSON(@0))`, [JSON.stringify(members.slice(index, index + 1000))])
        for (const row of rows) {
          const basic = Number(row.basicSalary ?? 0)
          const allowances = ['housingAllowance', 'transportAllowance', 'phoneAllowance', 'workNatureAllowance', 'otherAllowance', 'workPressureAllowance'].reduce((sum, key) => sum + Number(row[key] ?? 0), 0)
          pay.set(Number(row.id), { branchId: row.branchId == null ? null : Number(row.branchId), basic, total: basic + allowances })
        }
      }
      const repo = em.getRepository(CompensationProposal), now = new Date(), note = percentNote(percent, basis, extra.note).slice(0, 500)
      const lineOf = new Map((await repo.find({ where: { cycleId: cycle.id } })).map(row => [row.employeeId, row]))
      let applied = 0, noSalary = 0, total = 0
      for (const employeeId of members) {
        const person = pay.get(employeeId)
        if (!person || !inBranchScope(scope, person.branchId)) continue
        const base = basis === 'TOTAL' ? person.total : person.basic
        if (!(person.basic > 0) || !(base > 0)) { noSalary += 1; continue }
        const amount = percentAmount(base, percent), basic = round2(person.basic), line = lineOf.get(employeeId)
        if (amount > RAISE_AMOUNT_MAX) throw new BadRequestException(RAISE_AMOUNT_ERROR)
        // سطر جديد: «المقترح» = نفس المبلغ بس متعلّم إنه من المراجعة (adjustedBy) — ورقة المدير مابتعرضش مبلغه
        if (!line) await repo.insert({ cycleId: cycle.id, employeeId, currentBasic: basic, proposedAmount: amount, proposedByUserId: user.sub, proposedAt: now, note: null, finalAmount: amount,
          adjustedByUserId: user.sub, adjustedAt: now, adjustNote: note, appliedAt: null, appliedByUserId: null, appliedRevision: null })
        else await repo.update({ id: line.id }, { finalAmount: amount, currentBasic: basic, adjustedByUserId: user.sub, adjustedAt: now, adjustNote: note })
        applied += 1; total += amount
      }
      if (!applied) throw new BadRequestException(noSalary ? 'المختارين مالهمش أساسي مسجّل — مفيش مبلغ يتحسب' : PERCENT_NOBODY)
      await recordCycleWriter(em, cycle.id, user.sub)
      await recordAudit(em, { category: 'PAYROLL', action: 'RAISE_PERCENT_APPLIED', entityType: 'compensation_cycle', entityId: String(cycle.id), actorUserId: user.sub,
        summary: `زيادة بنسبة ${percent}% من ${RAISE_PERCENT_BASIS_LABELS[basis]} لـ${applied} موظف في دورة ${cycle.name}`, after: { percent, basis, audience, applied, noSalary, total: round2(total), note: extra.note } })
      return { applied, noSalary }
    })
    return { ...(await this.detail(user, id)), percentApplied: result }
  }

  // ===== (ج) الاعتماد والتطبيق =====

  /** آخر نتيجة أداء معتمدة لكل موظف، أو null لو موديول الأداء مقفول أو جداوله ناقصة أو الحساب مامعهوش صلاحيته */
  private async performanceScores(em: EntityManager, user: JwtPayload, cycleId: number, employeeIds: number[]): Promise<Map<number, number> | null> {
    if (!(userHasPerm(user, 'performance.manage') || userHasPerm(user, 'performance.calibrate')) || !(await this.modules.isEnabled('performance')) || !(await reviewsReady(em))) return null
    const out = new Map<number, number>()
    if (!employeeIds.length) return out
    const rows: Array<{ employeeId: number; finalScore: string | number | null }> = await em.query(
      `SELECT a.[employeeId], a.[finalScore] FROM [review_assignments] a
       WHERE a.[status] IN (N'APPROVED', N'ANNOUNCED', N'ACKNOWLEDGED') AND a.[finalScore] IS NOT NULL
         AND a.[employeeId] IN (SELECT [employeeId] FROM [compensation_proposals] WHERE [cycleId] = @0)
         AND a.[id] = (SELECT MAX(b.[id]) FROM [review_assignments] b WHERE b.[employeeId] = a.[employeeId] AND b.[status] IN (N'APPROVED', N'ANNOUNCED', N'ACKNOWLEDGED') AND b.[finalScore] IS NOT NULL)`, [cycleId])
    const wanted = new Set(employeeIds)
    for (const row of rows) if (wanted.has(Number(row.employeeId))) out.set(Number(row.employeeId), Number(row.finalScore))
    return out
  }

  /** اعتماد الدورة — من حد ماقترحش (مش اللي بعتها للمراجعة ولا اللي كتب أو عدّل سطر)، لحساب بكل الفروع، تحت قفل صف الدورة */
  async approve(user: JwtPayload, id: number) {
    assertCompanyWideWrite(user)
    await this.ds.transaction(async em => {
      await this.assertReady(em)
      const cycle = await this.lockCycle(em, id)
      if (cycle.status !== 'REVIEW') throw new BadRequestException(`الاعتماد للدورة اللي تحت المراجعة بس — الدورة «${CYCLE_STATUS_LABELS[cycle.status]}»`)
      const issue = approverIssue(cycle, await em.getRepository(CompensationProposal).find({ where: { cycleId: id } }), user.sub, await cycleWriterIds(em, id))
      if (issue) throw new (issue.includes('مافيهاش') ? BadRequestException : ForbiddenException)(issue)
      const now = new Date()
      await em.getRepository(CompensationCycle).update({ id }, { status: 'APPROVED', approvedByUserId: user.sub, approvedAt: now, updatedByUserId: user.sub, updatedAt: now })
      await recordAudit(em, { category: 'PAYROLL', action: 'RAISE_CYCLE_APPROVED', entityType: 'compensation_cycle', entityId: String(id), actorUserId: user.sub,
        summary: `اعتماد دورة الزيادات: ${cycle.name}`, before: { status: cycle.status }, after: { status: 'APPROVED' } })
    })
    return this.detail(user, id)
  }

  /** رجوع الدورة المعتمدة للمراجعة — قبل ما أي سطر يتطبّق بس */
  async unapprove(user: JwtPayload, id: number) {
    assertCompanyWideWrite(user)
    await this.ds.transaction(async em => {
      await this.assertReady(em)
      const cycle = await this.lockCycle(em, id)
      if (cycle.status !== 'APPROVED') throw new BadRequestException(APPROVED_ONLY)
      if (await em.getRepository(CompensationProposal).createQueryBuilder('line').where('line.cycleId = :id AND line.appliedAt IS NOT NULL', { id }).getCount()) {
        throw new BadRequestException('فيه زيادات اتطبّقت من الدورة — مابترجعش للمراجعة')
      }
      const now = new Date()
      await em.getRepository(CompensationCycle).update({ id }, { status: 'REVIEW', approvedByUserId: null, approvedAt: null, updatedByUserId: user.sub, updatedAt: now })
      await recordAudit(em, { category: 'PAYROLL', action: 'RAISE_CYCLE_UNAPPROVED', entityType: 'compensation_cycle', entityId: String(id), actorUserId: user.sub,
        summary: `رجوع دورة الزيادات للمراجعة: ${cycle.name}`, before: { status: 'APPROVED' }, after: { status: 'REVIEW' } })
    })
    return this.detail(user, id)
  }

  /**
   * تطبيق الزيادات المعتمدة على الرواتب — سطر سطر، كل سطر في معاملته (الدورة ثم السطر ثم الموظف)، ومن خدمة تاريخ الراتب القايمة بس.
   * السطر اللي اترفض (أساسي اتغيّر، موظف مش على رأس العمل، شهر مقفول أو لسه ماجاش…) بيتقال سببه والباقي بيكمّل؛ والدورة «اتطبّقت» لما مايفضلش سطر.
   */
  async apply(user: JwtPayload, id: number) {
    assertCompanyWideWrite(user)
    if (!userHasPerm(user, 'employees.edit')) throw new ForbiddenException(APPLY_NEEDS_EDIT)
    await this.assertReady(this.ds.manager)
    const head = await this.ds.getRepository(CompensationCycle).findOneBy({ id })
    if (!head) throw new NotFoundException(CYCLE_NOT_FOUND)
    if (head.status !== 'APPROVED') throw new BadRequestException(APPROVED_ONLY)
    const pending = await this.ds.getRepository(CompensationProposal).createQueryBuilder('line').select(['line.id', 'line.employeeId'])
      .where('line.cycleId = :id AND line.appliedAt IS NULL AND line.finalAmount > 0', { id }).orderBy('line.id', 'ASC').getMany()
    let applied = 0
    const refused: Array<{ employeeId: number; message: string }> = []
    for (const target of pending) {
      try {
        if (await this.ds.transaction(em => this.applyLine(em, user, id, target.id))) applied++
      } catch (error) {
        if (!(error instanceof HttpException)) throw error
        const body = error.getResponse()
        refused.push({ employeeId: target.employeeId, message: typeof body === 'string' ? body : String((body as { message?: unknown }).message ?? error.message) })
      }
    }
    await this.ds.transaction(async em => {
      const cycle = await this.lockCycle(em, id)
      if (cycle.status !== 'APPROVED') return
      const left = await em.getRepository(CompensationProposal).createQueryBuilder('line').where('line.cycleId = :id AND line.appliedAt IS NULL AND line.finalAmount > 0', { id }).getCount()
      if (left) return
      const now = new Date()
      await em.getRepository(CompensationCycle).update({ id }, { status: 'APPLIED', appliedAt: now, updatedByUserId: user.sub, updatedAt: now })
      await recordAudit(em, { category: 'PAYROLL', action: 'RAISE_CYCLE_APPLIED', entityType: 'compensation_cycle', entityId: String(id), actorUserId: user.sub,
        summary: `دورة الزيادات اتطبّقت كلها: ${cycle.name}`, before: { status: 'APPROVED' }, after: { status: 'APPLIED' } })
    })
    return { applied, refused, ...(await this.detail(user, id)) }
  }

  /** سطر واحد في معاملة المنادي: true = اتكتب في تاريخ الراتب؛ false = اتطبّق قبل كده. الرفض برسالته */
  private async applyLine(em: EntityManager, user: JwtPayload, cycleId: number, lineId: number): Promise<boolean> {
    const cycle = await this.lockCycle(em, cycleId)
    if (cycle.status !== 'APPROVED') throw new BadRequestException(APPROVED_ONLY)
    const repo = em.getRepository(CompensationProposal)
    const line = await repo.findOne({ where: { id: lineId, cycleId }, lock: { mode: 'pessimistic_write' } })
    if (!line || line.appliedAt !== null || !(Number(line.finalAmount) > 0)) return false
    const employee = await this.lockEmployee(em, line.employeeId)
    if (!employee || !employee.active) throw new BadRequestException(APPLY_NOT_ACTIVE)
    const current = await readSalaryHistoryCurrent(em, line.employeeId), history = await readSalaryHistory(em, line.employeeId)
    if (!current) throw new BadRequestException(APPLY_NOT_ACTIVE)
    // المبلغ اتعتمد على أساسي معيّن: لو الأساسي اتغيّر بعدها السطر مايتطبّقش — محدش راجع الزيادة على الرقم الجديد
    if (current.current.basicSalary === null || !sameBasic(current.current.basicSalary, line.currentBasic)) throw new ConflictException(APPLY_BASIC_CHANGED)
    const result = await applyEmployeeSalaryChange(em, {
      employeeId: line.employeeId, actorUserId: user.sub, effectivePayrollPeriod: cycle.effectivePayrollPeriod,
      reason: `زيادة دورة «${cycle.name}»`.slice(0, 500), evidenceReference: cycleEvidenceReference(cycle.id),
      expectedRevision: history.revision, expectedCurrentSourceHash: current.currentSourceHash,
      salary: { ...current.current, basicSalary: raisedBasic(current.current.basicSalary, line.finalAmount) } as EmployeeSalaryValue,
    })
    await repo.update({ id: line.id }, { appliedAt: new Date(), appliedByUserId: user.sub, appliedRevision: result.history.revision })
    await recordAudit(em, { category: 'PAYROLL', action: 'RAISE_APPLIED', entityType: 'compensation_proposal', entityId: `${cycle.id}:${line.employeeId}`, actorUserId: user.sub, branchId: employee.branchId,
      summary: `تطبيق زيادة ${employee.fullName} من دورة ${cycle.name} (يسري من راتب ${cycle.effectivePayrollPeriod})`, after: { amount: Number(line.finalAmount), revision: result.history.revision, evidenceReference: cycleEvidenceReference(cycle.id) } })
    return true
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
          // B-ADD.11: ورقة المدير «باقتراحي»: مبلغ وملاحظة السطر بيظهروا للي اقترحه هو بس. سطر فتحته المراجعة (زيادة بالنسبة أو إضافة)
          // مبلغه مايظهرش للمدير — المبلغ مع نسبة معلنة بيكشفوا الراتب
          amount: line && line.proposedByUserId === user.sub ? Number(line.proposedAmount) : null,
          note: line && line.proposedByUserId === user.sub ? line.note ?? null : null, adjusted: line ? line.adjustedByUserId != null : false }
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
