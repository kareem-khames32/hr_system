import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, In, Repository } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { assertCompanyWideWrite, branchScopeOf, userHasPerm } from '../auth/guards'
import { MONTHLY_SALARY_COMPONENTS } from '../employees/compensation'
import { Employee } from '../employees/employee.entity'
import { Branch } from '../org/entities/branch.entity'
import { Department } from '../org/entities/department.entity'
import { Team } from '../org/entities/team.entity'
import { EmployeeObligation } from '../requests/entities/financial.entities'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { hasHrOverride } from '../requests/approver-resolver.service'
import { PayrollDecimal } from './payroll-decimal'
// C8 / الخطوة 31: بند مسير عُكس صرفه بسطر منفذ لا يُغلق شهر الموظف أمام المكافأة (تُصرف بالمسير التكميلي)
import { payrollLineNotReversedSql } from './payroll-reversal-sql'
import { payrollPeriodOfDate } from './payroll-period'
import { salaryPayrollPeriodBounds } from './payroll-period-salary'
import { PAYROLL_SALARY_EVIDENCE_MODE_KEY, parsePayrollSalaryEvidenceMode, type PayrollSalaryEvidenceMode, selectPayrollRunSalary } from './payroll-run-salary'
import { lockPayrollEmployees } from './payroll-settlement-boundary'
import { PayrollRun } from './payroll.entities'
import {
  addPayrollMonths,
  buildDeductionChain,
  currentDeductionStep,
  DEDUCTION_STRUCTURAL_ROLES,
  type DeductionChainStep,
  type DeductionMissingApproverFallback,
  deductionPreviewHash,
  type DeductionSalaryBasis,
  parseDeductionSteps,
} from './typed-deductions'
import { type Facts as OrgFacts, TypedDeductionsService } from './typed-deductions.service'
import {
  assertBonusCap,
  BONUS_CREATOR_BASES,
  BONUS_LABELS,
  BONUS_OBLIGATION_CATEGORY,
  BONUS_REVERSAL_OBLIGATION_CATEGORY,
  BONUS_SETTING_KEYS,
  type BonusAmountTrace,
  type BonusCreatorBasis,
  bonusDecimal,
  bonusEnumSetting,
  bonusNumericSetting,
  type BonusPayoutState,
  bonusPayoutState,
  type BonusSelectionMode,
  bonusTypeColumns,
  bonusTypeFinancialChanged,
  type BonusTypeRules,
  bonusTypeRulesFromRow,
  computeBonusAmount,
  normalizeBonusTypeRules,
} from './bonuses'
import { BonusBatch, BonusRequest, BonusRequestEvent, BonusType } from './bonuses.entities'
import type {
  BonusBulkPreviewDto,
  BonusBulkSubmitDto,
  BonusDecisionDto,
  BonusInputDto,
  BonusListQueryDto,
  BonusReverseDto,
  BonusTypeDto,
  CreateBonusDto,
} from './bonuses.dto'
import { optionalCreatedRange } from '../attendance/attendance-report-range'

interface Settings {
  reasonMinLength: number
  duplicateWindowHours: number
  managerCreationEnabled: boolean
  bulkMaxEmployees: number
  missingApproverFallback: DeductionMissingApproverFallback
  cycleStartDay: number
  monthlyDays: string
  dailyHours: string
  salaryEvidenceMode: PayrollSalaryEvidenceMode
}
interface NormalizedInput {
  inputValue: string
  reason: string
  targetPeriod: string
  attachmentRef: string | null
  confirmNotDuplicate: boolean
}
interface EvaluationContext {
  type: BonusType
  rules: BonusTypeRules
  input: NormalizedInput
  settings: Settings
  facts: OrgFacts
  today: string
  currentPeriod: string
  canExceedCap: boolean
}
interface ReadyEvaluation {
  ok: true
  employee: Employee
  basis: BonusCreatorBasis
  bases: BonusCreatorBasis[]
  trace: BonusAmountTrace
  amount: string
  steps: DeductionChainStep[]
  overrides: { capOverride: boolean; duplicateOf: number | null }
}
interface FailedEvaluation {
  ok: false
  employee: Employee
  status: number
  code: string
  message: string
  details?: Record<string, unknown>
}
type Evaluation = ReadyEvaluation | FailedEvaluation
type OrgNames = { branches: Map<number, string>; departments: Map<number, string>; teams: Map<number, string> }

const VIEW = 'bonuses.view', APPROVE = 'bonuses.approve', MANAGE = 'bonuses.manage', EXCEED_CAP = 'bonuses.exceed_cap'
const bad = (code: string, message: string, details: Record<string, unknown> = {}): never => { throw new BadRequestException({ code, message, ...details }) }
const dec = (value: unknown) => PayrollDecimal.from(typeof value === 'number' ? value.toFixed(4) : String(value))
const money = (value: unknown) => value === null || value === undefined ? null : dec(value).format(2, 'DOWN')
const decimalText = (value: unknown) => PayrollDecimal.from(typeof value === 'number' ? value : String(value)).canonical()
const sumMoney = (values: Array<unknown>) => values.reduce<PayrollDecimal>((sum, value) => value === null || value === undefined ? sum : sum.add(dec(value)), PayrollDecimal.from('0')).format(2, 'DOWN')
const json = <T>(text: string | null, fallback: T): T => { if (!text) return fallback; try { return JSON.parse(text) as T } catch { return fallback } }

// C4 / الخطوة 27 — EX-05: المكافأة الفردية ثم الجماعية على نفس نمط الخصومات المصنفة ودفتر المديونيات:
// الاقتراح للموظف المختار (لا لمقدم الطلب)، لا مكافأة للنفس ولا لمن يعلو المُقترِح، المدير الهيكلي يقترح لمرؤوسيه،
// سقف من الأساسي وتصعيد بأيام الراتب، سلسلة ملتقطة تنتهي بالموارد البشرية، وفترة مسير مستهدفة.
// القيد الموجب يُنشأ عند آخر اعتماد فقط، ويحجزه المسير عند اعتماده ويستهلكه عند الصرف (payroll-obligation-ledger).
@Injectable()
export class BonusesService {
  constructor(
    @InjectRepository(BonusType) private readonly types: Repository<BonusType>,
    @InjectRepository(BonusRequest) private readonly requests: Repository<BonusRequest>,
    private readonly org: TypedDeductionsService,
  ) {}

  private get manager() { return this.types.manager }

  private today() { return new Date().toLocaleDateString('en-CA') }

  private async settings(em: EntityManager): Promise<Settings> {
    const keys = [...BONUS_SETTING_KEYS, 'payroll.cycle_start_day', 'payroll.monthly_days', 'payroll.daily_hours', PAYROLL_SALARY_EVIDENCE_MODE_KEY]
    const rows = await em.getRepository(RequestsConfig).findBy({ key: In(keys) })
    const value = (key: string) => rows.find(row => row.key === key)?.value
    const cycle = Number(value('payroll.cycle_start_day') ?? '23')
    const decimal = (key: string, fallback: string) => { const text = (value(key) ?? fallback).trim(); return /^\d+(\.\d{1,2})?$/.test(text) && Number(text) > 0 ? text : fallback }
    return {
      reasonMinLength: bonusNumericSetting('bonuses.reason_min_length', value('bonuses.reason_min_length')),
      duplicateWindowHours: bonusNumericSetting('bonuses.duplicate_window_hours', value('bonuses.duplicate_window_hours')),
      bulkMaxEmployees: bonusNumericSetting('bonuses.bulk_max_employees', value('bonuses.bulk_max_employees')),
      managerCreationEnabled: bonusEnumSetting('bonuses.manager_creation_enabled', value('bonuses.manager_creation_enabled')) === 'true',
      missingApproverFallback: bonusEnumSetting('bonuses.missing_approver_fallback', value('bonuses.missing_approver_fallback')) as DeductionMissingApproverFallback,
      cycleStartDay: Number.isInteger(cycle) && cycle >= 1 && cycle <= 31 ? cycle : 23,
      monthlyDays: decimal('payroll.monthly_days', '30'),
      dailyHours: decimal('payroll.daily_hours', '8'),
      salaryEvidenceMode: parsePayrollSalaryEvidenceMode(value(PAYROLL_SALARY_EVIDENCE_MODE_KEY)),
    }
  }

  private async inChunks<T>(ids: number[], load: (chunk: number[]) => Promise<T[]>, size = 1000): Promise<T[]> {
    const result: T[] = []
    for (let index = 0; index < ids.length; index += size) result.push(...await load(ids.slice(index, index + size)))
    return result
  }

  // ===== النطاق: نفس الحقائق الهيكلية للخصومات المصنفة (مدير مباشر/فريق/قسم مع فروعه/فرع + سلسلة الرؤساء) =====
  private basesFor(user: JwtPayload, facts: OrgFacts, settings: Pick<Settings, 'managerCreationEnabled'>, employee: Employee): BonusCreatorBasis[] {
    const bases: BonusCreatorBasis[] = []
    if (settings.managerCreationEnabled && facts.employeeId) {
      if (employee.managerEmployeeId === facts.employeeId) bases.push('DIRECT_MANAGER')
      if (employee.teamId && facts.teams.has(employee.teamId)) bases.push('TEAM_LEADER')
      if (employee.departmentId && facts.departments.has(employee.departmentId)) bases.push('DEPARTMENT_MANAGER')
      if (facts.branches.has(employee.branchId)) bases.push('BRANCH_MANAGER')
    }
    if (userHasPerm(user, MANAGE) && this.inBranchScope(user, employee)) bases.push('HR')
    return bases
  }

  private inBranchScope(user: JwtPayload, employee: Pick<Employee, 'branchId'> | undefined | null) {
    const scope = branchScopeOf(user)
    return !!employee && (scope === null || scope === employee.branchId)
  }

  private scopedBases(user: JwtPayload, ctx: EvaluationContext, employee: Employee) {
    // عزل الفروع: حساب مقفول على فرع ما ينزلش خصم/مكافأة على موظف في فرع تاني حتى لو الهيكل رابطهم
    if (!this.inBranchScope(user, employee)) return []
    return this.basesFor(user, ctx.facts, ctx.settings, employee).filter(basis => ctx.rules.creatorScopes.includes(basis))
  }

  private async orgNames(em: EntityManager): Promise<OrgNames> {
    return {
      branches: new Map((await em.getRepository(Branch).find({ select: { id: true, name: true } })).map(row => [row.id, row.name])),
      departments: new Map((await em.getRepository(Department).find({ select: { id: true, name: true } })).map(row => [row.id, row.name])),
      teams: new Map((await em.getRepository(Team).find({ select: { id: true, name: true } })).map(row => [row.id, row.name])),
    }
  }

  private async employeeBriefs(em: EntityManager, ids: Array<number | null | undefined>) {
    const unique = [...new Set(ids.filter((id): id is number => Number.isSafeInteger(id) && Number(id) > 0))]
    const rows = unique.length ? await this.inChunks(unique, chunk => em.getRepository(Employee).find({ where: { id: In(chunk) },
      select: { id: true, fullName: true, employeeCode: true, branchId: true, departmentId: true, teamId: true, managerEmployeeId: true, isActive: true } })) : []
    return new Map(rows.map(row => [row.id, row]))
  }

  // ===== راتب الشهر المستهدف (قرار المالك: الراتب يسري على شهر مسير كامل) — نفس اختيار المسير (الخطوة 13) =====
  private async salaryBasis(em: EntityManager, employee: Employee, period: string, settings: Settings): Promise<DeductionSalaryBasis> {
    const selection = await selectPayrollRunSalary(em, employee, period, settings.salaryEvidenceMode)
    if (!selection.ok) {
      throw new BadRequestException({ code: `BONUS_${selection.code}`, message: `${selection.message} — لا تُحسب المكافأة بلا راتب الشهر ${period}` })
    }
    const values = MONTHLY_SALARY_COMPONENTS.map(component => PayrollDecimal.from(selection.source.amounts[component.key]).format(2, 'DOWN'))
    const gross = values.reduce((sum, value) => sum.add(PayrollDecimal.from(value)), PayrollDecimal.from('0')).format(2, 'DOWN')
    const source = selection.source.kind === 'MONTHLY_HISTORY' ? String(selection.source.sourceRef) : `${selection.source.sourceRef}:CURRENT_FILE_UNVERIFIED`
    return { basic: values[0], gross, monthlyDays: settings.monthlyDays, dailyHours: settings.dailyHours, source }
  }

  private async closedRun(em: EntityManager, employeeId: number, period: string): Promise<number | null> {
    const rows = await em.query(`SELECT TOP (1) r.[id] FROM [payroll_runs] r INNER JOIN [payroll_items] i ON i.[runId]=r.[id]
      WHERE i.[employeeId]=@0 AND r.[period]=@1 AND r.[status] IN ('APPROVED','PAID') AND ${payrollLineNotReversedSql('r.[id]', 'i.[employeeId]')} ORDER BY r.[id]`, [employeeId, period])
    return rows.length ? Number(rows[0].id) : null
  }

  private async duplicateOf(em: EntityManager, employeeId: number, typeId: number, targetPeriod: string, inputValue: string, settings: Settings): Promise<number | null> {
    if (settings.duplicateWindowHours <= 0) return null
    const rows = await em.query(`SELECT TOP (1) [id] FROM [bonus_requests] WHERE [employeeId]=@0 AND [bonusTypeId]=@1 AND [targetPeriod]=@2
      AND [inputValue]=CAST(@3 AS decimal(18,4)) AND [status] IN ('IN_APPROVAL','APPROVED')
      AND [createdAt] >= DATEADD(hour, 0 - @4, SYSUTCDATETIME()) ORDER BY [id] DESC`, [employeeId, typeId, targetPeriod, inputValue, settings.duplicateWindowHours])
    return rows.length ? Number(rows[0].id) : null
  }

  private exception(failed: FailedEvaluation): HttpException {
    const body = { ...(failed.details ?? {}), code: failed.code, message: failed.message }
    return failed.status === 403 ? new ForbiddenException(body) : failed.status === 409 ? new ConflictException(body) : failed.status === 404 ? new NotFoundException(body) : new BadRequestException(body)
  }

  private outOfScope(): ForbiddenException {
    return new ForbiddenException({ code: 'BONUS_OUT_OF_SCOPE', message: 'الموظف خارج نطاق صلاحيتك لهذا النوع من المكافآت' })
  }

  private async context(em: EntityManager, user: JwtPayload, dto: BonusInputDto): Promise<EvaluationContext> {
    const settings = await this.settings(em)
    const type = await em.getRepository(BonusType).findOneBy({ id: dto.bonusTypeId })
    if (!type) throw new NotFoundException({ code: 'BONUS_TYPE_NOT_FOUND', message: 'نوع المكافأة غير معرّف في الكتالوج' })
    const rules = bonusTypeRulesFromRow(type)
    if (!rules.isActive) bad('BONUS_TYPE_INACTIVE', 'نوع المكافأة معطل ولا يقبل اقتراحات جديدة')
    const reason = typeof dto.reason === 'string' ? dto.reason.trim() : ''
    if (reason.length < settings.reasonMinLength) bad('BONUS_REASON_TOO_SHORT', `سبب المكافأة لا يقل عن ${settings.reasonMinLength} حرفًا`, { minLength: settings.reasonMinLength })
    if (typeof dto.targetPeriod !== 'string' || !/^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/.test(dto.targetPeriod)) bad('BONUS_PERIOD_INVALID', 'الشهر المستهدف بصيغة YYYY-MM صحيحة')
    const today = this.today()
    const currentPeriod = payrollPeriodOfDate(today, settings.cycleStartDay)
    if (dto.targetPeriod > addPayrollMonths(currentPeriod, 12)) bad('BONUS_PERIOD_TOO_FAR', 'الشهر المستهدف لا يتجاوز 12 شهرًا بعد شهر المسير الحالي')
    const facts = await this.org.facts(em, user)
    return { type, rules, settings, facts, today, currentPeriod, canExceedCap: userHasPerm(user, EXCEED_CAP),
      input: { inputValue: String(dto.inputValue ?? '').trim(), reason, targetPeriod: dto.targetPeriod, attachmentRef: dto.attachmentRef?.trim() || null, confirmNotDuplicate: dto.confirmNotDuplicate === true } }
  }

  private async evaluate(em: EntityManager, user: JwtPayload, ctx: EvaluationContext, employee: Employee): Promise<Evaluation> {
    const failed = (status: number, code: string, message: string, details?: Record<string, unknown>): FailedEvaluation => ({ ok: false, employee, status, code, message, details })
    // EX-05 قاعدة 4: لا مكافأة للنفس
    if (ctx.facts.employeeId === employee.id) return failed(403, 'BONUS_SELF', 'لا يمكنك اقتراح مكافأة لنفسك')
    // النطاق قبل أي فحص يكشف حالة الموظف لمن لا يملكه
    const bases = this.scopedBases(user, ctx, employee)
    if (!bases.length) return failed(403, 'BONUS_OUT_OF_SCOPE', 'الموظف خارج نطاق صلاحيتك لهذا النوع من المكافآت')
    if (ctx.facts.superiors.has(employee.id)) return failed(403, 'BONUS_SUPERIOR', 'لا يمكن اقتراح مكافأة لمن يعلوك في التسلسل الإداري')
    if (!employee.isActive) return failed(400, 'BONUS_EMPLOYEE_INACTIVE', 'الموظف غير نشط')
    const closedRunId = await this.closedRun(em, employee.id, ctx.input.targetPeriod)
    if (closedRunId) return failed(400, 'BONUS_PERIOD_CLOSED', `مسير ${ctx.input.targetPeriod} للموظف معتمد أو مصروف (#${closedRunId})؛ اختر شهرًا مفتوحًا`, { runId: closedRunId })
    let trace: BonusAmountTrace
    try {
      const salary = await this.salaryBasis(em, employee, ctx.input.targetPeriod, ctx.settings)
      trace = computeBonusAmount(ctx.rules, ctx.input.inputValue, salary)
      assertBonusCap(trace, ctx.canExceedCap)
    } catch (error) {
      if (error instanceof HttpException) {
        const body = error.getResponse() as Record<string, unknown>
        return failed(error.getStatus(), String(body?.code ?? 'BONUS_INVALID'), String(body?.message ?? error.message), body)
      }
      throw error
    }
    const duplicate = await this.duplicateOf(em, employee.id, ctx.type.id, ctx.input.targetPeriod, trace.inputValue, ctx.settings)
    if (duplicate && !ctx.input.confirmNotDuplicate) {
      return failed(409, 'BONUS_DUPLICATE', `توجد مكافأة مطابقة (#${duplicate}) للموظف لنفس الشهر خلال ${ctx.settings.duplicateWindowHours} ساعة؛ أكّد أنها ليست تكرارًا`, { duplicateOf: duplicate })
    }
    const basis = BONUS_CREATOR_BASES.find(item => bases.includes(item))!
    // EX-05 قاعدة 1: تجاوز حد التصعيد يضيف خطوة المدير الأعلى قبل الموارد البشرية
    const steps = buildDeductionChain({ approvalSteps: ctx.rules.approvalSteps, escalated: trace.escalated, escalationStep: ctx.rules.escalationStep,
      creatorEmployeeId: ctx.facts.employeeId, employeeId: employee.id, approvers: await this.org.approversFor(em, employee, ctx.facts.departmentRows),
      missingApproverFallback: ctx.settings.missingApproverFallback })
    return { ok: true, employee, basis, bases, trace, amount: trace.amount, steps, overrides: { capOverride: trace.capExceeded, duplicateOf: duplicate } }
  }

  private event(em: EntityManager, requestId: number, eventType: string, actorUserId: number | null, fromStatus: string | null, toStatus: string | null,
    stepOrder: number | null, reason: string | null, payload: unknown) {
    return em.getRepository(BonusRequestEvent).save({ requestId, eventType, actorUserId, fromStatus, toStatus, stepOrder, reason,
      payload: payload === null || payload === undefined ? null : JSON.stringify(payload) })
  }

  private async persist(em: EntityManager, user: JwtPayload, ctx: EvaluationContext, evaluation: ReadyEvaluation, batchId: number | null) {
    const repo = em.getRepository(BonusRequest)
    const employee = evaluation.employee
    const saved = await repo.save(repo.create({
      batchId, employeeId: employee.id, bonusTypeId: ctx.type.id, typeVersion: ctx.type.version,
      typeSnapshot: JSON.stringify({ id: ctx.type.id, version: ctx.type.version, ...ctx.rules }),
      calcMethod: ctx.rules.calcMethod, inputValue: evaluation.trace.inputValue, estimatedAmount: evaluation.amount, finalAmount: null,
      amountTrace: JSON.stringify({ creation: evaluation.trace }),
      reason: ctx.input.reason, attachmentRef: ctx.input.attachmentRef, targetPeriod: ctx.input.targetPeriod,
      status: 'IN_APPROVAL', creatorUserId: user.sub, creatorEmployeeId: ctx.facts.employeeId, scopeBasis: evaluation.basis,
      scopeSnapshot: JSON.stringify({ bases: evaluation.bases, capturedAt: new Date().toISOString(),
        employee: { branchId: employee.branchId, departmentId: employee.departmentId ?? null, teamId: employee.teamId ?? null, managerEmployeeId: employee.managerEmployeeId ?? null } }),
      steps: JSON.stringify(evaluation.steps), escalated: evaluation.trace.escalated, capExceeded: evaluation.trace.capExceeded, outOfScope: false,
      overrides: JSON.stringify(evaluation.overrides), obligationId: null, decisionReason: null, decidedByUserId: null, decidedAt: null, revision: 0, updatedAt: null,
    }))
    await this.event(em, saved.id, 'SUBMITTED', user.sub, null, 'IN_APPROVAL', null, null,
      { amount: evaluation.amount, basis: evaluation.basis, escalated: evaluation.trace.escalated, capExceeded: evaluation.trace.capExceeded, overrides: evaluation.overrides, batchId })
    for (const step of evaluation.steps.filter(row => row.status === 'SKIPPED' || row.fallbackFrom)) {
      await this.event(em, saved.id, step.status === 'SKIPPED' ? 'STEP_SKIPPED' : 'STEP_FALLBACK', null, 'IN_APPROVAL', 'IN_APPROVAL', step.order, step.note,
        { role: step.role, fallbackFrom: step.fallbackFrom ?? null, approverEmployeeId: step.approverEmployeeId })
    }
    return saved
  }

  // ===== الكتالوج =====
  private typeView(row: BonusType) {
    const rules = bonusTypeRulesFromRow(row)
    return { id: row.id, version: row.version, ...rules, calcMethodLabel: BONUS_LABELS.calcMethods[rules.calcMethod],
      creatorScopeLabels: rules.creatorScopes.map(role => BONUS_LABELS.roles[role]), approvalStepLabels: rules.approvalSteps.map(role => BONUS_LABELS.roles[role]),
      escalationStepLabel: rules.escalationStep ? BONUS_LABELS.roles[rules.escalationStep] : null, updatedAt: row.updatedAt, createdAt: row.createdAt }
  }

  async listTypes(user: JwtPayload, includeInactive: boolean) {
    const rows = await this.types.find({ order: { code: 'ASC' } })
    const manage = userHasPerm(user, MANAGE)
    return rows.filter(row => row.isActive || (includeInactive && manage)).map(row => this.typeView(row))
  }

  // أنواع المكافآت مالهاش فرع = لكل الشركة: حساب الفرع يشوفها بس، والإضافة والتعديل والتعطيل لحساب على مستوى الشركة
  async createType(user: JwtPayload, dto: BonusTypeDto) {
    assertCompanyWideWrite(user)
    const rules = normalizeBonusTypeRules(dto as unknown as Record<string, unknown>)
    if (await this.types.findOneBy({ code: rules.code })) throw new ConflictException({ code: 'BONUS_TYPE_CODE_EXISTS', message: `الكود ${rules.code} مستخدم لنوع مكافأة آخر` })
    const saved = await this.types.save(this.types.create({ ...bonusTypeColumns(rules), version: 1, updatedByUserId: user.sub, updatedAt: null }))
    return this.typeView(saved)
  }

  async updateType(user: JwtPayload, id: number, dto: BonusTypeDto) {
    assertCompanyWideWrite(user)
    return this.manager.transaction(async em => {
      const repo = em.getRepository(BonusType)
      const row = await repo.createQueryBuilder('t').setLock('pessimistic_write').where('t.id = :id', { id }).getOne()
      if (!row) throw new NotFoundException({ code: 'BONUS_TYPE_NOT_FOUND', message: 'نوع المكافأة غير موجود' })
      const before = bonusTypeRulesFromRow(row)
      const after = normalizeBonusTypeRules(dto as unknown as Record<string, unknown>, before)
      Object.assign(row, bonusTypeColumns(after), { version: bonusTypeFinancialChanged(before, after) ? row.version + 1 : row.version, updatedByUserId: user.sub, updatedAt: new Date() })
      return this.typeView(await repo.save(row))
    })
  }

  // ===== ما يستطيع المستخدم اقتراحه ولمن (خارج النطاق لا يظهر) =====
  async creatable(user: JwtPayload) {
    const em = this.manager
    const settings = await this.settings(em), facts = await this.org.facts(em, user)
    const structural = new Set<BonusCreatorBasis>()
    if (settings.managerCreationEnabled && facts.employeeId) {
      if (facts.directReports > 0) structural.add('DIRECT_MANAGER')
      if (facts.teams.size) structural.add('TEAM_LEADER')
      if (facts.departments.size) structural.add('DEPARTMENT_MANAGER')
      if (facts.branches.size) structural.add('BRANCH_MANAGER')
    }
    const hr = userHasPerm(user, MANAGE) && branchScopeOf(user) !== -1
    const available = new Set<BonusCreatorBasis>()
    const types = (await em.getRepository(BonusType).find({ where: { isActive: true }, order: { code: 'ASC' } })).map(row => this.typeView(row)).filter(type => {
      let allowed = false
      for (const scope of type.creatorScopes) {
        if (scope === 'HR' ? hr : structural.has(scope)) { available.add(scope); allowed = true }
      }
      return allowed
    })
    const bases = BONUS_CREATOR_BASES.filter(basis => available.has(basis))
    const today = this.today()
    return { today, currentPeriod: payrollPeriodOfDate(today, settings.cycleStartDay), cycleStartDay: settings.cycleStartDay, reasonMinLength: settings.reasonMinLength,
      canExceedCap: userHasPerm(user, EXCEED_CAP), bases, basisLabels: bases.map(basis => BONUS_LABELS.roles[basis]), types }
  }

  async candidates(user: JwtPayload, typeId?: number) {
    const em = this.manager
    const settings = await this.settings(em), facts = await this.org.facts(em, user)
    let rules: BonusTypeRules | null = null
    if (typeId !== undefined) {
      const type = await em.getRepository(BonusType).findOneBy({ id: typeId })
      if (!type) throw new NotFoundException({ code: 'BONUS_TYPE_NOT_FOUND', message: 'نوع المكافأة غير موجود' })
      rules = bonusTypeRulesFromRow(type)
    }
    const employees = await em.getRepository(Employee).find({ where: { isActive: true }, order: { fullName: 'ASC' },
      select: { id: true, fullName: true, employeeCode: true, branchId: true, departmentId: true, teamId: true, managerEmployeeId: true, isActive: true } })
    const names = await this.orgNames(em)
    return employees.filter(row => row.id !== facts.employeeId && !facts.superiors.has(row.id) && this.inBranchScope(user, row))
      .map(row => ({ row, bases: this.basesFor(user, facts, settings, row).filter(basis => !rules || rules.creatorScopes.includes(basis)) }))
      .filter(entry => entry.bases.length)
      .map(({ row, bases }) => ({ id: row.id, fullName: row.fullName, employeeCode: row.employeeCode, branchId: row.branchId, branchName: names.branches.get(row.branchId) ?? null,
        departmentId: row.departmentId ?? null, departmentName: row.departmentId ? names.departments.get(row.departmentId) ?? null : null,
        departmentPath: this.org.departmentPath(facts.departmentRows, row.departmentId).map(id => ({ id, name: names.departments.get(id) ?? null })),
        teamId: row.teamId ?? null, teamName: row.teamId ? names.teams.get(row.teamId) ?? null : null, bases, basisLabels: bases.map(basis => BONUS_LABELS.roles[basis]) }))
  }

  // ===== الاقتراح الفردي =====
  async create(user: JwtPayload, dto: CreateBonusDto) {
    const id = await this.manager.transaction(async em => {
      await this.org.assertMoneyRequestVisible(em, user, 'PAYROLL_BONUS', 'المكافأة')
      const ctx = await this.context(em, user, dto)
      const employee = await em.getRepository(Employee).findOneBy({ id: dto.employeeId })
      if (!employee) {
        // لا كاشف وجود: من لا يملك نطاقًا عامًا يستلم نفس رد «خارج النطاق»
        if (userHasPerm(user, MANAGE) && branchScopeOf(user) === null) throw new NotFoundException({ code: 'BONUS_EMPLOYEE_NOT_FOUND', message: 'الموظف غير موجود' })
        throw this.outOfScope()
      }
      if (ctx.facts.employeeId !== employee.id && !this.scopedBases(user, ctx, employee).length) throw this.outOfScope()
      await lockPayrollEmployees(em, [employee.id])
      const evaluation = await this.evaluate(em, user, ctx, employee)
      if (!evaluation.ok) throw this.exception(evaluation)
      const saved = await this.persist(em, user, ctx, evaluation, null)
      if (hasHrOverride(user)) await this.approveInstantly(em, user, saved, ctx, evaluation)
      return saved.id
    })
    return this.detail(user, id)
  }

  // ===== المعاينة والاقتراح الجماعي (قرار المالك) =====
  private previewRow(employee: Employee | null, employeeId: number, names: OrgNames, approverNames: Map<number, Employee>, status: string, message: string | null, evaluation: ReadyEvaluation | null) {
    return {
      employeeId, employeeCode: employee?.employeeCode ?? null, fullName: employee?.fullName ?? null,
      branchName: employee ? names.branches.get(employee.branchId) ?? null : null,
      departmentName: employee?.departmentId ? names.departments.get(employee.departmentId) ?? null : null,
      teamName: employee?.teamId ? names.teams.get(employee.teamId) ?? null : null,
      status, message,
      amount: evaluation?.amount ?? null, formula: evaluation?.trace.formula ?? null, dayRate: evaluation?.trace.dayRate ?? null,
      escalated: evaluation?.trace.escalated ?? false, escalationThreshold: evaluation?.trace.escalationThreshold ?? null,
      capLimit: evaluation?.trace.capLimit ?? null, capExceeded: evaluation?.trace.capExceeded ?? false,
      basis: evaluation?.basis ?? null, basisLabel: evaluation ? BONUS_LABELS.roles[evaluation.basis] : null,
      steps: (evaluation?.steps ?? []).map(step => ({ order: step.order, role: step.role, roleLabel: BONUS_LABELS.roles[step.role], status: step.status, note: step.note,
        escalation: step.escalation, fallbackFrom: step.fallbackFrom ?? null, approverEmployeeId: step.approverEmployeeId,
        approverName: step.approverEmployeeId ? approverNames.get(step.approverEmployeeId)?.fullName ?? null : null })),
      overrides: evaluation?.overrides ?? null,
    }
  }

  private async buildPreview(em: EntityManager, user: JwtPayload, dto: BonusBulkPreviewDto, lock: boolean) {
    const ctx = await this.context(em, user, dto)
    const mode = dto.selection.mode as BonusSelectionMode
    const ids = [...new Set(dto.selection.ids)].sort((a, b) => a - b)
    if (!ids.length) bad('BONUS_SELECTION_EMPTY', 'اختر موظفًا أو فريقًا أو قسمًا أو فرعًا')
    const excluded = new Set(dto.selection.excludeEmployeeIds ?? [])
    const repo = em.getRepository(Employee)
    const order = { id: 'ASC' as const }
    const loaded = mode === 'EMPLOYEES' ? await repo.find({ where: { id: In(ids) }, order })
      : mode === 'TEAM' ? await repo.find({ where: { teamId: In(ids), isActive: true }, order })
        : mode === 'DEPARTMENT' ? await repo.find({ where: { departmentId: In([...this.org.descendants(ctx.facts.departmentRows, new Set(ids))]), isActive: true }, order })
          : await repo.find({ where: { branchId: In(ids), isActive: true }, order })
    // من خارج نطاق المُقترِح لهذا النوع لا يُعرض ولا يُعد ولا يُقفل؛ نفسه يبقى ليُرفض بسبب «نفسك»
    const employees = loaded.filter(row => row.id === ctx.facts.employeeId || this.scopedBases(user, ctx, row).length > 0)
    if (employees.length > ctx.settings.bulkMaxEmployees) bad('BONUS_BULK_LIMIT', `الاختيار يضم ${employees.length} موظفًا في نطاقك والحد ${ctx.settings.bulkMaxEmployees} في الدفعة الواحدة`)
    if (lock) await lockPayrollEmployees(em, employees.filter(row => !excluded.has(row.id)).map(row => row.id))
    const names = await this.orgNames(em)
    const evaluations: ReadyEvaluation[] = []
    const outcomes: Array<{ employee: Employee | null; employeeId: number; status: string; message: string | null; evaluation: ReadyEvaluation | null }> = []
    for (const employee of employees) {
      if (excluded.has(employee.id)) { outcomes.push({ employee, employeeId: employee.id, status: 'EXCLUDED', message: 'مستبعد قبل الإرسال', evaluation: null }); continue }
      const evaluation = await this.evaluate(em, user, ctx, employee)
      if (evaluation.ok) { evaluations.push(evaluation); outcomes.push({ employee, employeeId: employee.id, status: 'READY', message: null, evaluation }); continue }
      outcomes.push({ employee, employeeId: employee.id, status: evaluation.code, message: evaluation.message, evaluation: null })
    }
    for (const id of mode === 'EMPLOYEES' ? ids.filter(id => !employees.some(row => row.id === id)) : []) {
      outcomes.push({ employee: null, employeeId: id, status: 'BONUS_OUT_OF_SCOPE', message: 'الموظف غير متاح في نطاقك لهذا النوع', evaluation: null })
    }
    const approverNames = await this.employeeBriefs(em, evaluations.flatMap(row => row.steps.map(step => step.approverEmployeeId)))
    const rows = outcomes.map(row => this.previewRow(row.employee, row.employeeId, names, approverNames as Map<number, Employee>, row.status, row.message, row.evaluation))
    const totals = { candidates: rows.length, ready: evaluations.length, excluded: rows.filter(row => row.status === 'EXCLUDED').length,
      failed: rows.filter(row => !['READY', 'EXCLUDED'].includes(row.status)).length, escalated: evaluations.filter(row => row.trace.escalated).length,
      capExceeded: evaluations.filter(row => row.trace.capExceeded).length, totalAmount: sumMoney(evaluations.map(row => row.amount)) }
    const previewHash = deductionPreviewHash({
      kind: 'BONUS', typeId: ctx.type.id, typeVersion: ctx.type.version, input: ctx.input, selection: { mode, ids, excluded: [...excluded].sort((a, b) => a - b) },
      rows: rows.map(row => ({ employeeId: row.employeeId, status: row.status, amount: row.amount, basis: row.basis, escalated: row.escalated, capExceeded: row.capExceeded,
        steps: row.steps.map(step => [step.role, step.status, step.approverEmployeeId]) })),
    })
    return { ctx, evaluations, ignoredOutOfScope: loaded.length - employees.length, response: { previewHash, type: this.typeView(ctx.type), targetPeriod: ctx.input.targetPeriod,
      currentPeriod: ctx.currentPeriod, selection: { mode, ids, excludeEmployeeIds: [...excluded].sort((a, b) => a - b) }, totals, rows } }
  }

  async preview(user: JwtPayload, dto: BonusBulkPreviewDto) {
    // المعاينة داخل معاملة لأن قراءة سجل الأجر تتطلبها؛ لا كتابة فيها
    return this.manager.transaction(async em => (await this.buildPreview(em, user, dto, false)).response)
  }

  async bulkSubmit(user: JwtPayload, dto: BonusBulkSubmitDto) {
    const result = await this.manager.transaction(async em => {
      await this.org.assertMoneyRequestVisible(em, user, 'PAYROLL_BONUS', 'المكافأة')
      const { ctx, evaluations, response, ignoredOutOfScope } = await this.buildPreview(em, user, dto, true)
      if (response.previewHash !== dto.previewHash) return { stale: response }
      if (!evaluations.length) bad('BONUS_BULK_EMPTY', 'لا يوجد موظف جاهز للإرسال في المعاينة')
      const batchRepo = em.getRepository(BonusBatch)
      const batch = await batchRepo.save(batchRepo.create({ bonusTypeId: ctx.type.id, selectionMode: response.selection.mode, selection: JSON.stringify(response.selection),
        targetPeriod: ctx.input.targetPeriod, previewHash: response.previewHash, candidateCount: response.totals.candidates, createdCount: evaluations.length,
        skippedCount: response.totals.candidates - evaluations.length, result: '{}', createdByUserId: user.sub }))
      const created: Array<{ employeeId: number; requestId: number; amount: string; status: string }> = []
      // قرار المالك 26 سبتمبر: دفعة الموارد البشرية بتتعتمد كلها لحظة إرسالها (نفس الاقتراح الفردي)
      const instant = hasHrOverride(user)
      for (const evaluation of evaluations) {
        const saved = await this.persist(em, user, ctx, evaluation, batch.id)
        if (instant) await this.approveInstantly(em, user, saved, ctx, evaluation)
        created.push({ employeeId: evaluation.employee.id, requestId: saved.id, amount: evaluation.amount, status: saved.status })
      }
      const skipped = response.rows.filter(row => row.status !== 'READY').map(row => ({ employeeId: row.employeeId, fullName: row.fullName, status: row.status, message: row.message }))
      // سجل تدقيق داخلي فقط (لا يُعاد في أي رد): عدد من في الوحدة خارج نطاق المُقترِح
      batch.result = JSON.stringify({ created, skipped, ignoredOutOfScope })
      await batchRepo.save(batch)
      return { batchId: batch.id, created, skipped, totals: response.totals }
    })
    if ('stale' in result) {
      throw new ConflictException({ code: 'BONUS_PREVIEW_STALE', message: 'تغيّرت نتيجة المعاينة منذ عرضها (راتب أو نطاق أو تكرار أو استبعاد)؛ راجع المعاينة الجديدة ثم أرسل', preview: result.stale })
    }
    return result
  }

  // ===== العرض والصلاحية =====
  private privileged(user: JwtPayload) { return [VIEW, APPROVE, MANAGE].some(perm => userHasPerm(user, perm)) }

  private actorProblem(user: JwtPayload, row: BonusRequest, step: DeductionChainStep, employee: Pick<Employee, 'branchId'> | undefined | null): string | null {
    // المُقترِح لا يعتمد مكافأته — إلا صاحب سلطة الموارد البشرية: قراره نهائي (قرار المالك 26 سبتمبر)، واقتراحه بيتعتمد
    // لحظتها أصلًا؛ ده بيخص مكافآت قديمة اقترحها قبل القرار وواقفة في سلسلتها. الموظف نفسه ممنوع دايمًا
    if (user.sub === row.creatorUserId && !hasHrOverride(user)) return 'لا يعتمد المُقترِح مكافأته'
    if (user.employeeId && user.employeeId === row.employeeId) return 'لا يعتمد الموظف مكافأة مقترحة له'
    if ((DEDUCTION_STRUCTURAL_ROLES as readonly string[]).includes(step.role)) {
      return user.role === 'super_admin' || (step.approverEmployeeId !== null && user.employeeId === step.approverEmployeeId) ? null : `الخطوة الحالية بانتظار ${BONUS_LABELS.roles[step.role]}`
    }
    if (step.role === 'HR') return userHasPerm(user, APPROVE) && this.inBranchScope(user, employee) ? null : 'الخطوة الحالية بانتظار اعتماد الموارد البشرية في نطاق فرع الموظف'
    if (step.role === 'EXECUTIVE') return userHasPerm(user, 'approve.executive') ? null : 'الخطوة الحالية بانتظار الإدارة التنفيذية'
    return 'دور الخطوة غير معروف'
  }

  private snapshotRules(row: BonusRequest): BonusTypeRules {
    const snapshot = json<Record<string, any> | null>(row.typeSnapshot, null)
    if (!snapshot) throw new ConflictException({ code: 'BONUS_SNAPSHOT_INVALID', message: 'لقطة نوع المكافأة المحفوظة غير صالحة' })
    return bonusTypeRulesFromRow(snapshot)
  }

  private async visibleRows(em: EntityManager, user: JwtPayload, rows: BonusRequest[], view: string) {
    const steps = new Map(rows.map(row => [row.id, parseDeductionSteps(row.steps)]))
    const people = await this.employeeBriefs(em, rows.flatMap(row => [row.employeeId, row.creatorEmployeeId, ...steps.get(row.id)!.map(step => step.approverEmployeeId)]))
    const privileged = this.privileged(user)
    const visible = rows.filter(row => {
      const employee = people.get(row.employeeId), chain = steps.get(row.id)!
      const involved = row.creatorUserId === user.sub || (!!user.employeeId && chain.some(step => step.approverEmployeeId === user.employeeId))
      if (!((privileged && this.inBranchScope(user, employee)) || involved)) return false
      if (view === 'created') return row.creatorUserId === user.sub
      if (view === 'pending_me') { const step = currentDeductionStep(chain); return row.status === 'IN_APPROVAL' && !!step && !this.actorProblem(user, row, step, employee) }
      return true
    })
    return { visible, steps, people }
  }

  private obligationView(item: EmployeeObligation, runs: Map<number, string>) {
    return { id: item.id, type: item.type, category: item.category, label: item.label, amount: money(item.amount), status: item.status,
      statusLabel: BONUS_LABELS.obligationStatuses[item.status] ?? item.status, targetPeriod: item.targetPeriod, effectiveDate: item.effectiveDate,
      reservedPayrollRunId: item.reservedPayrollRunId, appliedPayrollRunId: item.appliedPayrollRunId,
      appliedPeriod: item.appliedPayrollRunId ? runs.get(item.appliedPayrollRunId) ?? null : null, appliedAmount: money(item.appliedAmount),
      reversal: item.category === BONUS_REVERSAL_OBLIGATION_CATEGORY }
  }

  private async ledger(em: EntityManager, requestIds: number[]) {
    const obligations = requestIds.length ? await this.inChunks(requestIds, chunk => em.getRepository(EmployeeObligation).find({ where: { bonusRequestId: In(chunk) }, order: { id: 'ASC' } })) : []
    const runIds = [...new Set(obligations.map(item => item.appliedPayrollRunId).filter((id): id is number => !!id))]
    const runs = runIds.length ? new Map((await em.getRepository(PayrollRun).find({ where: { id: In(runIds) }, select: { id: true, period: true } })).map(run => [run.id, run.period])) : new Map<number, string>()
    return { obligations, runs }
  }

  /** حالة المكافأة للعرض: «معتمد — بانتظار الصرف» حتى يستهلك مسير مصروف قيدها، ثم «مصروف في مسير الشهر». */
  private payout(row: BonusRequest, obligations: EmployeeObligation[], runs: Map<number, string>) {
    // C8 / الخطوة 31: قيد المكافأة الذي عُكس صرفه بمسير عكس لا يُعد مصروفًا؛ قيد إعادته (PENDING) هو الساري حتى يُصرف
    const credits = obligations.filter(item => item.bonusRequestId === row.id && item.type === 'CREDIT' && item.category === BONUS_OBLIGATION_CATEGORY)
    const liveCredits = credits.filter(item => item.payrollReversalRunId == null)
    const credit = liveCredits[liveCredits.length - 1] ?? credits[credits.length - 1] ?? null
    // قيد الاسترداد اليدوي المستهلك في مسير عُكس صرفه يمثله قيد إعادته (نفس المبلغ) فلا يُحتسب مرتين
    const reversals = obligations.filter(item => item.bonusRequestId === row.id && item.type === 'DEBIT' && item.category === BONUS_REVERSAL_OBLIGATION_CATEGORY && item.status !== 'CANCELLED' && item.payrollReversalRunId == null)
    const state: BonusPayoutState | null = row.status === 'APPROVED' ? bonusPayoutState(credit) : null
    const period = credit?.appliedPayrollRunId ? runs.get(credit.appliedPayrollRunId) ?? null : null
    const statusLabel = row.status !== 'APPROVED' ? BONUS_LABELS.statuses[row.status] ?? row.status
      : state === 'PAID' ? `مصروف في مسير ${period ?? `#${credit?.appliedPayrollRunId}`}`
        : state === 'RESERVED' ? BONUS_LABELS.payout.RESERVED : BONUS_LABELS.statuses.APPROVED
    const paidAmount = credit?.status === 'APPLIED' ? money(credit.appliedAmount ?? credit.amount)! : '0.00'
    return { credit, state, statusLabel, paidAmount, reversedAmount: sumMoney(reversals.map(item => item.amount)),
      view: state ? { state, label: BONUS_LABELS.payout[state], runId: credit?.appliedPayrollRunId ?? credit?.reservedPayrollRunId ?? null, period } : null }
  }

  private async views(em: EntityManager, user: JwtPayload, rows: BonusRequest[], view: string) {
    const { visible, steps, people } = await this.visibleRows(em, user, rows, view)
    if (!visible.length) return []
    const { obligations, runs } = await this.ledger(em, visible.map(row => row.id))
    return visible.map(row => {
      const chain = steps.get(row.id)!, employee = people.get(row.employeeId), step = currentDeductionStep(chain)
      const snapshot = json<Record<string, any>>(row.typeSnapshot, {})
      const canManage = userHasPerm(user, MANAGE) && this.inBranchScope(user, employee)
      const payout = this.payout(row, obligations, runs)
      const actorOk = row.status === 'IN_APPROVAL' && !!step && !this.actorProblem(user, row, step, employee)
      return {
        id: row.id, batchId: row.batchId, status: row.status, statusLabel: payout.statusLabel, revision: row.revision,
        employee: employee ? { id: employee.id, fullName: employee.fullName, employeeCode: employee.employeeCode, branchId: employee.branchId, departmentId: employee.departmentId ?? null, teamId: employee.teamId ?? null } : { id: row.employeeId },
        type: { id: row.bonusTypeId, version: row.typeVersion, code: snapshot.code ?? null, nameAr: snapshot.nameAr ?? null, isTaxable: snapshot.isTaxable ?? null, isInsurable: snapshot.isInsurable ?? null,
          calcMethod: row.calcMethod, calcMethodLabel: (BONUS_LABELS.calcMethods as Record<string, string>)[row.calcMethod] ?? row.calcMethod },
        inputValue: decimalText(row.inputValue), estimatedAmount: money(row.estimatedAmount), finalAmount: money(row.finalAmount), amountTrace: json(row.amountTrace, null),
        reason: row.reason, attachmentRef: row.attachmentRef, targetPeriod: row.targetPeriod,
        creator: { userId: row.creatorUserId, employeeId: row.creatorEmployeeId, name: row.creatorEmployeeId ? people.get(row.creatorEmployeeId)?.fullName ?? null : null,
          basis: row.scopeBasis, basisLabel: (BONUS_LABELS.roles as Record<string, string>)[row.scopeBasis] ?? row.scopeBasis },
        steps: chain.map(item => ({ ...item, fallbackFrom: item.fallbackFrom ?? null, roleLabel: BONUS_LABELS.roles[item.role],
          fallbackFromLabel: item.fallbackFrom ? BONUS_LABELS.roles[item.fallbackFrom] : null,
          approverName: item.approverEmployeeId ? people.get(item.approverEmployeeId)?.fullName ?? null : null })),
        currentStepOrder: step?.order ?? null, escalated: row.escalated, capExceeded: row.capExceeded, outOfScope: row.outOfScope, overrides: json(row.overrides, null),
        obligations: obligations.filter(item => item.bonusRequestId === row.id).map(item => this.obligationView(item, runs)),
        payout: payout.view, paidAmount: payout.paidAmount, reversedAmount: payout.reversedAmount,
        decisionReason: row.decisionReason, decidedByUserId: row.decidedByUserId, decidedAt: row.decidedAt, createdAt: row.createdAt, updatedAt: row.updatedAt,
        capabilities: {
          canApprove: actorOk,
          canReject: actorOk,
          canAdjust: actorOk && step?.role === 'HR' && canManage,
          canWithdraw: row.status === 'IN_APPROVAL' && row.creatorUserId === user.sub,
          canCancel: canManage && (row.status === 'IN_APPROVAL' || (row.status === 'APPROVED' && payout.state === 'AWAITING_PAYROLL')),
          canReverse: canManage && row.status === 'APPROVED' && payout.state === 'PAID' && dec(payout.paidAmount).compare(dec(payout.reversedAmount)) > 0,
          canExceedCap: userHasPerm(user, EXCEED_CAP),
        },
      }
    })
  }

  async list(user: JwtPayload, query: BonusListQueryDto) {
    // الصفحات تُقرأ حتى 500 صف مرئي فعلًا؛ تصفية الرؤية بعد القراءة لا تُسقط الأقدم عن صاحب نطاق محدود
    // «من تاريخ / إلى تاريخ» على تاريخ الطلب بيتفلتر هنا في كل صفحة (قبل حد الـ500) — مش في المتصفح على قائمة ناقصة
    const created = optionalCreatedRange(query)
    const result: Array<Record<string, unknown>> = []
    let beforeId: number | null = null
    for (let page = 0; page < 40 && result.length < 500; page++) {
      const qb = this.requests.createQueryBuilder('r').orderBy('r.id', 'DESC').take(500)
      if (beforeId !== null) qb.andWhere('r.id < :beforeId', { beforeId })
      if (created) qb.andWhere('r.createdAt >= CONVERT(datetime2, :createdFrom, 126) AND r.createdAt < CONVERT(datetime2, :createdTo, 126)', { createdFrom: created.start, createdTo: created.end })
      if (query.status) qb.andWhere('r.status = :status', { status: query.status })
      if (query.typeId) qb.andWhere('r.bonusTypeId = :typeId', { typeId: query.typeId })
      if (query.targetPeriod) qb.andWhere('r.targetPeriod = :targetPeriod', { targetPeriod: query.targetPeriod })
      if (query.employeeId) qb.andWhere('r.employeeId = :employeeId', { employeeId: query.employeeId })
      if (query.batchId) qb.andWhere('r.batchId = :batchId', { batchId: query.batchId })
      const rows = await qb.getMany()
      if (!rows.length) break
      result.push(...await this.views(this.manager, user, rows, query.view ?? 'all'))
      beforeId = rows[rows.length - 1].id
      if (rows.length < 500) break
    }
    return result.slice(0, 500)
  }

  // لا كاشف وجود (نفس قاعدة الخصومات — تدقيق الأدوار D6): اللي مالوش أي صفة على الطلب بياخد نفس رد الطلب الغايب بالحرف،
  // فالرد مايفرّقش بين رقم موجود خارج نطاقه ورقم مش موجود أصلًا.
  private notFound() { return new NotFoundException({ code: 'BONUS_NOT_FOUND', message: 'طلب المكافأة غير موجود' }) }

  /** له صفة على الطلب: مُقترِحه، أو صاحب المكافأة نفسه (شايفها في «مكافآتي»)، أو معتمِد في سلسلتها، أو صاحب صلاحية مكافآت في فرع الموظف، أو صاحب الخطوة الحالية. */
  private knows(user: JwtPayload, row: BonusRequest, employee: Pick<Employee, 'branchId'> | undefined | null) {
    const chain = parseDeductionSteps(row.steps), step = currentDeductionStep(chain)
    return row.creatorUserId === user.sub
      || (!!user.employeeId && (user.employeeId === row.employeeId || chain.some(item => item.approverEmployeeId === user.employeeId)))
      || (this.privileged(user) && this.inBranchScope(user, employee))
      || (row.status === 'IN_APPROVAL' && !!step && !this.actorProblem(user, row, step, employee))
  }

  async detail(user: JwtPayload, id: number) {
    const row = await this.requests.findOneBy({ id })
    if (!row) throw this.notFound()
    const [view] = await this.views(this.manager, user, [row], 'all')
    if (!view) throw this.notFound()
    const events = await this.manager.getRepository(BonusRequestEvent).find({ where: { requestId: id }, order: { id: 'ASC' } })
    return { ...view, events: events.map(event => ({ ...event, payload: json(event.payload, null) })) }
  }

  // الموظف يرى مكافآته من لحظة الاقتراح بحالتها وشهرها ومصير صرفها، دون ملاحظات المعتمدين الداخلية
  async mine(user: JwtPayload) {
    if (!user.employeeId) return []
    const em = this.manager
    const rows = await this.requests.find({ where: { employeeId: user.employeeId }, order: { id: 'DESC' }, take: 200 })
    if (!rows.length) return []
    const { obligations, runs } = await this.ledger(em, rows.map(row => row.id))
    const people = await this.employeeBriefs(em, rows.map(row => row.creatorEmployeeId))
    return rows.map(row => {
      const snapshot = json<Record<string, any>>(row.typeSnapshot, {})
      const payout = this.payout(row, obligations, runs)
      return { id: row.id, status: row.status, statusLabel: payout.statusLabel, payout: payout.view,
        type: { nameAr: snapshot.nameAr ?? null, calcMethodLabel: (BONUS_LABELS.calcMethods as Record<string, string>)[row.calcMethod] ?? row.calcMethod },
        inputValue: decimalText(row.inputValue), amount: money(row.finalAmount ?? row.estimatedAmount), amountIsFinal: row.finalAmount !== null,
        reason: row.reason, targetPeriod: row.targetPeriod, paidAmount: payout.paidAmount, reversedAmount: payout.reversedAmount,
        issuer: { basisLabel: (BONUS_LABELS.roles as Record<string, string>)[row.scopeBasis] ?? row.scopeBasis, name: row.creatorEmployeeId ? people.get(row.creatorEmployeeId)?.fullName ?? null : null },
        decisionReason: ['REJECTED', 'CANCELLED'].includes(row.status) ? row.decisionReason : null, createdAt: row.createdAt, decidedAt: row.decidedAt }
    })
  }

  // ===== دورة الاعتماد =====
  // actor: صاحب الإجراء — اللي مالوش صفة على الطلب بياخد «غير موجود» قبل فحص النسخة والحالة، فالإجراءات مش كاشف وجود هي كمان
  private async lockedRequest(em: EntityManager, id: number, expectedRevision?: number, actor?: JwtPayload) {
    const row = await em.getRepository(BonusRequest).createQueryBuilder('r').setLock('pessimistic_write').where('r.id = :id', { id }).getOne()
    if (!row) throw this.notFound()
    if (actor && !this.knows(actor, row, await em.getRepository(Employee).findOne({ where: { id: row.employeeId }, select: { id: true, branchId: true } }))) throw this.notFound()
    if (expectedRevision !== undefined && row.revision !== expectedRevision) {
      throw new ConflictException({ code: 'BONUS_REVISION_CHANGED', message: 'تغيّر طلب المكافأة منذ فتحه؛ حدّث الشاشة ثم أعد المحاولة' })
    }
    return row
  }

  private async creatorStillInScope(em: EntityManager, row: BonusRequest, employee: Employee) {
    if (!row.creatorEmployeeId) return false
    const creator = { sub: row.creatorUserId, employeeId: row.creatorEmployeeId, role: 'employee', permissions: [] } as unknown as JwtPayload
    const facts = await this.org.facts(em, creator)
    return this.basesFor(creator, facts, { managerCreationEnabled: true }, employee).includes(row.scopeBasis as BonusCreatorBasis)
  }

  async approve(user: JwtPayload, id: number, dto: BonusDecisionDto) {
    const notice = await this.manager.transaction(async em => {
      const row = await this.lockedRequest(em, id, dto.expectedRevision, user)
      await lockPayrollEmployees(em, [row.employeeId])
      if (row.status !== 'IN_APPROVAL') throw new ConflictException({ code: 'BONUS_STATE', message: `لا يمكن اعتماد مكافأة حالتها «${BONUS_LABELS.statuses[row.status] ?? row.status}»` })
      const steps = parseDeductionSteps(row.steps)
      let step = currentDeductionStep(steps)
      if (!step) throw new ConflictException({ code: 'BONUS_CHAIN_INVALID', message: 'لا توجد خطوة اعتماد معلقة' })
      const employee = await em.getRepository(Employee).findOneBy({ id: row.employeeId })
      if (!employee) throw new NotFoundException({ code: 'BONUS_EMPLOYEE_NOT_FOUND', message: 'الموظف غير موجود' })
      const problem = this.actorProblem(user, row, step, employee)
      if (problem) throw new ForbiddenException({ code: 'BONUS_NOT_CURRENT_APPROVER', message: problem })
      const settings = await this.settings(em)
      const rules = this.snapshotRules(row)
      // النقل خارج نطاق المُقترِح لا يلغي الطلب لكنه يحوّله للموارد البشرية
      if (!row.outOfScope && row.scopeBasis !== 'HR' && !(await this.creatorStillInScope(em, row, employee))) {
        row.outOfScope = true
        for (const pending of steps.filter(item => item.status === 'PENDING' && (DEDUCTION_STRUCTURAL_ROLES as readonly string[]).includes(item.role))) {
          pending.status = 'SKIPPED'; pending.note = 'تُخطّي: خرج الموظف عن نطاق المُقترِح — يوجَّه للموارد البشرية'
        }
        await this.event(em, row.id, 'OUT_OF_SCOPE', user.sub, row.status, row.status, null, 'خرج الموظف عن نطاق المُقترِح بعد الاقتراح', { basis: row.scopeBasis })
        step = currentDeductionStep(steps)!
        if (this.actorProblem(user, row, step, employee)) {
          row.steps = JSON.stringify(steps); row.revision += 1; row.updatedAt = new Date()
          await em.getRepository(BonusRequest).save(row)
          return 'OUT_OF_SCOPE_ROUTED_TO_HR'
        }
      }
      // إعادة التسعير بالراتب المرجعي الحالي للشهر المستهدف وإعادة فحص الحدود والسقف عند كل خطوة
      const salary = await this.salaryBasis(em, employee, row.targetPeriod, settings)
      const overrides = json<{ capOverride?: boolean }>(row.overrides, {})
      const capAllowed = overrides.capOverride === true || userHasPerm(user, EXCEED_CAP)
      let trace: BonusAmountTrace
      try {
        trace = computeBonusAmount(rules, decimalText(row.inputValue), salary)
      } catch (error) {
        if (error instanceof HttpException) {
          const body = error.getResponse() as Record<string, unknown>
          throw new BadRequestException({ ...body, message: `تعذر الاعتماد بحدود النوع الحالية: ${body?.message ?? error.message}` })
        }
        throw error
      }
      assertBonusCap(trace, capAllowed, 'تعذر الاعتماد: ')
      let amount = trace.amount
      const reason = dto.reason?.trim() || null
      if (dto.adjustedAmount !== undefined && dto.adjustedAmount !== null && String(dto.adjustedAmount).trim() !== '') {
        if (step.role !== 'HR' || !userHasPerm(user, MANAGE)) throw new ForbiddenException({ code: 'BONUS_ADJUST_FORBIDDEN', message: 'تعديل مبلغ المكافأة متاح لخطوة الموارد البشرية بصلاحية إدارة المكافآت' })
        if (!reason) bad('BONUS_ADJUST_REASON_REQUIRED', 'اكتب سبب تعديل مبلغ المكافأة')
        const adjusted = computeBonusAmount({ ...rules, calcMethod: 'FIXED_AMOUNT', valueStep: null }, dto.adjustedAmount, salary)
        assertBonusCap(adjusted, capAllowed, 'تعذر تعديل المبلغ: ')
        step.adjustedFrom = amount; step.adjustedTo = adjusted.amount; amount = adjusted.amount
      }
      await this.approveStep(em, user, row, steps, step, { amount, trace }, rules, settings, reason)
      row.steps = JSON.stringify(steps); row.revision += 1; row.updatedAt = new Date()
      await em.getRepository(BonusRequest).save(row)
      return null
    })
    return { ...(await this.detail(user, id)), notice }
  }

  // اعتماد خطوة واحدة بالمبلغ المسعّر، وعند آخر خطوة: القيد الموجب والحالة «معتمد» — دالة واحدة للاعتماد اليدوي (approve)
  // والفوري (approveInstantly)، فالمكافأة اللي بتعتمدها الموارد البشرية لحظة اقتراحها بتخلص بنفس أثر اعتمادها خطوة بخطوة
  private async approveStep(em: EntityManager, user: JwtPayload, row: BonusRequest, steps: DeductionChainStep[], step: DeductionChainStep,
    priced: { amount: string; trace: BonusAmountTrace }, rules: BonusTypeRules, settings: Settings, reason: string | null, instant = false) {
    const { amount, trace } = priced
    step.status = 'APPROVED'; step.actedByUserId = user.sub; step.actedAt = new Date().toISOString(); step.reason = reason
    const traces = json<Record<string, any>>(row.amountTrace, {})
    traces.approvals = [...(Array.isArray(traces.approvals) ? traces.approvals : []), { stepOrder: step.order, amount, trace }]
    row.amountTrace = JSON.stringify(traces)
    await this.event(em, row.id, 'STEP_APPROVED', user.sub, 'IN_APPROVAL', 'IN_APPROVAL', step.order, reason,
      { role: step.role, amount, adjustedFrom: step.adjustedFrom, ...(instant ? { instant: true } : {}) })
    if (!currentDeductionStep(steps)) {
      // القيد الموجب للموظف المختار نفسه، بشهره المستهدف وبداية دورته (لا يدخل مسودة شهر سابق)
      const repo = em.getRepository(EmployeeObligation)
      const saved = await repo.save(repo.create({ employeeId: row.employeeId, type: 'CREDIT', category: BONUS_OBLIGATION_CATEGORY, amount: Number(amount),
        label: `${rules.nameAr}: ${row.reason}`.slice(0, 300), status: 'PENDING',
        effectiveDate: salaryPayrollPeriodBounds(row.targetPeriod, settings.cycleStartDay).startDate, sourceRef: `bonus:${row.id}`,
        createdByUserId: row.creatorUserId, bonusRequestId: row.id, targetPeriod: row.targetPeriod }))
      const closedRunId = await this.closedRun(em, row.employeeId, row.targetPeriod)
      row.status = 'APPROVED'; row.finalAmount = amount; row.obligationId = saved.id
      row.decidedByUserId = user.sub; row.decidedAt = new Date()
      await this.event(em, row.id, 'APPROVED', user.sub, 'IN_APPROVAL', 'APPROVED', step.order, reason,
        { amount, obligationId: saved.id, targetPeriod: row.targetPeriod, ...(closedRunId ? { deferredPastClosedRunId: closedRunId } : {}), ...(instant ? { instant: true } : {}) })
    }
  }

  // قرار المالك 26 سبتمبر: صاحب سلطة الموارد البشرية قراره نهائي — المكافأة اللي بيقترحها (فردية أو ضمن مجموعة) بتتعتمد
  // لحظة اقتراحها: كل خطوة معلقة في السلسلة الملتقطة (المدير الهيكلي والتصعيد والموارد البشرية) باسمه وبالمبلغ المسعّر عند
  // الاقتراح، وآخر خطوة بتكتب القيد الموجب — الحالة النهائية هي نفسها بعد اعتماد يدوي كامل. المُقترِح من غيرهم: كما كان
  private async approveInstantly(em: EntityManager, user: JwtPayload, row: BonusRequest, ctx: EvaluationContext, evaluation: ReadyEvaluation) {
    const steps = parseDeductionSteps(row.steps)
    for (let step = currentDeductionStep(steps); step; step = currentDeductionStep(steps)) {
      await this.approveStep(em, user, row, steps, step, { amount: evaluation.amount, trace: evaluation.trace }, ctx.rules, ctx.settings,
        'اعتماد فوري — مدير الموارد البشرية', true)
      row.revision += 1
    }
    row.steps = JSON.stringify(steps); row.updatedAt = new Date()
    await em.getRepository(BonusRequest).save(row)
  }

  async reject(user: JwtPayload, id: number, dto: BonusDecisionDto) {
    const reason = dto.reason?.trim() ?? ''
    if (reason.length < 5) bad('BONUS_REASON_REQUIRED', 'سبب الرفض مطلوب (5 أحرف على الأقل)')
    await this.manager.transaction(async em => {
      const row = await this.lockedRequest(em, id, dto.expectedRevision, user)
      if (row.status !== 'IN_APPROVAL') throw new ConflictException({ code: 'BONUS_STATE', message: `لا يمكن رفض مكافأة حالتها «${BONUS_LABELS.statuses[row.status] ?? row.status}»` })
      const steps = parseDeductionSteps(row.steps), step = currentDeductionStep(steps)
      if (!step) throw new ConflictException({ code: 'BONUS_CHAIN_INVALID', message: 'لا توجد خطوة اعتماد معلقة' })
      const employee = await em.getRepository(Employee).findOneBy({ id: row.employeeId })
      const problem = this.actorProblem(user, row, step, employee)
      if (problem) throw new ForbiddenException({ code: 'BONUS_NOT_CURRENT_APPROVER', message: problem })
      step.status = 'REJECTED'; step.actedByUserId = user.sub; step.actedAt = new Date().toISOString(); step.reason = reason
      Object.assign(row, { status: 'REJECTED', steps: JSON.stringify(steps), decisionReason: reason, decidedByUserId: user.sub, decidedAt: new Date(), revision: row.revision + 1, updatedAt: new Date() })
      await em.getRepository(BonusRequest).save(row)
      await this.event(em, row.id, 'REJECTED', user.sub, 'IN_APPROVAL', 'REJECTED', step.order, reason, { role: step.role })
    })
    return this.detail(user, id)
  }

  async withdraw(user: JwtPayload, id: number, dto: BonusDecisionDto) {
    await this.manager.transaction(async em => {
      const row = await this.lockedRequest(em, id, dto.expectedRevision, user)
      if (row.creatorUserId !== user.sub) throw new ForbiddenException({ code: 'BONUS_WITHDRAW_FORBIDDEN', message: 'سحب المكافأة متاح لمُقترِحها فقط' })
      if (row.status !== 'IN_APPROVAL') throw new ConflictException({ code: 'BONUS_STATE', message: 'السحب متاح قبل اكتمال الاعتماد فقط؛ بعده تُلغى من الموارد البشرية' })
      const reason = dto.reason?.trim() || null
      Object.assign(row, { status: 'WITHDRAWN', decisionReason: reason, decidedByUserId: user.sub, decidedAt: new Date(), revision: row.revision + 1, updatedAt: new Date() })
      await em.getRepository(BonusRequest).save(row)
      await this.event(em, row.id, 'WITHDRAWN', user.sub, 'IN_APPROVAL', 'WITHDRAWN', null, reason, null)
    })
    return this.detail(user, id)
  }

  // الإلغاء بسبب موثق قبل الصرف؛ المحجوز في مسير معتمد يحتاج إعادة فتح المسير أولًا، والمصروف يُعكس بقيد استرداد
  async cancel(user: JwtPayload, id: number, dto: BonusDecisionDto) {
    if (!userHasPerm(user, MANAGE)) throw new ForbiddenException({ code: 'BONUS_CANCEL_FORBIDDEN', message: 'إلغاء المكافأة يتطلب صلاحية إدارة المكافآت' })
    await this.manager.transaction(async em => {
      const settings = await this.settings(em)
      const reason = dto.reason?.trim() ?? ''
      if (reason.length < settings.reasonMinLength) bad('BONUS_REASON_TOO_SHORT', `سبب الإلغاء لا يقل عن ${settings.reasonMinLength} حرفًا`, { minLength: settings.reasonMinLength })
      const row = await this.lockedRequest(em, id, dto.expectedRevision, user)
      const employee = await em.getRepository(Employee).findOneBy({ id: row.employeeId })
      if (!this.inBranchScope(user, employee)) throw new ForbiddenException({ code: 'BONUS_FORBIDDEN', message: 'طلب المكافأة خارج نطاق فرعك' })
      if (!['IN_APPROVAL', 'APPROVED'].includes(row.status)) throw new ConflictException({ code: 'BONUS_STATE', message: `لا يمكن إلغاء مكافأة حالتها «${BONUS_LABELS.statuses[row.status] ?? row.status}»` })
      await lockPayrollEmployees(em, [row.employeeId])
      let cancelledObligationIds: number[] = []
      if (row.status === 'APPROVED') {
        const credits = (await em.getRepository(EmployeeObligation).findBy({ bonusRequestId: row.id })).filter(item => item.type === 'CREDIT')
        if (credits.some(item => item.status === 'APPLIED' && item.payrollReversalRunId == null)) throw new ConflictException({ code: 'BONUS_CONSUMED', message: 'المكافأة صُرفت في مسير مصروف؛ استخدم «عكس المكافأة» بقيد استرداد في المسير التالي' })
        const reserved = credits.find(item => item.status === 'PENDING' && item.reservedPayrollRunId != null)
        if (reserved) throw new ConflictException({ code: 'BONUS_RESERVED', message: `قيد المكافأة محجوز في مسير معتمد (#${reserved.reservedPayrollRunId})؛ أعد فتح المسير أولًا` })
        const pending = credits.filter(item => item.status === 'PENDING')
        const updated = await em.query(`UPDATE [employee_obligations] SET [status]='CANCELLED' OUTPUT INSERTED.[id]
          WHERE [bonusRequestId]=@0 AND [type]='CREDIT' AND [status]='PENDING' AND [reservedPayrollRunId] IS NULL`, [row.id])
        if (updated.length !== pending.length) throw new ConflictException({ code: 'BONUS_RESERVED', message: 'تغيّر قيد المكافأة أثناء الإلغاء؛ أعد المحاولة' })
        cancelledObligationIds = updated.map((item: { id: number }) => Number(item.id))
      }
      const fromStatus = row.status
      Object.assign(row, { status: 'CANCELLED', decisionReason: reason, decidedByUserId: user.sub, decidedAt: new Date(), revision: row.revision + 1, updatedAt: new Date() })
      await em.getRepository(BonusRequest).save(row)
      await this.event(em, row.id, 'CANCELLED', user.sub, fromStatus, 'CANCELLED', null, reason, { cancelledObligationIds })
    })
    return this.detail(user, id)
  }

  // نفس قواعد DD-12: عكس المصروف (كلي أو جزئي) بقيد استرداد مدين في أول شهر مفتوح؛ المسير المصروف لا يتغير
  async reverse(user: JwtPayload, id: number, dto: BonusReverseDto) {
    if (!userHasPerm(user, MANAGE)) throw new ForbiddenException({ code: 'BONUS_REVERSE_FORBIDDEN', message: 'عكس المكافأة يتطلب صلاحية إدارة المكافآت' })
    await this.manager.transaction(async em => {
      const settings = await this.settings(em)
      const reason = dto.reason?.trim() ?? ''
      if (reason.length < settings.reasonMinLength) bad('BONUS_REASON_TOO_SHORT', `سبب العكس لا يقل عن ${settings.reasonMinLength} حرفًا`, { minLength: settings.reasonMinLength })
      const row = await this.lockedRequest(em, id, dto.expectedRevision, user)
      const employee = await em.getRepository(Employee).findOneBy({ id: row.employeeId })
      if (!this.inBranchScope(user, employee)) throw new ForbiddenException({ code: 'BONUS_FORBIDDEN', message: 'طلب المكافأة خارج نطاق فرعك' })
      if (row.status !== 'APPROVED') throw new ConflictException({ code: 'BONUS_STATE', message: 'العكس متاح لمكافأة معتمدة صُرفت في مسير مصروف' })
      await lockPayrollEmployees(em, [row.employeeId])
      const { obligations, runs } = await this.ledger(em, [row.id])
      const payout = this.payout(row, obligations, runs)
      if (payout.state !== 'PAID') throw new ConflictException({ code: 'BONUS_NOT_PAID', message: 'المكافأة لم تُصرف بعد؛ ألغها بدل عكسها' })
      const remaining = dec(payout.paidAmount).subtract(dec(payout.reversedAmount))
      if (remaining.compare(PayrollDecimal.from('0')) <= 0) throw new ConflictException({ code: 'BONUS_NOTHING_TO_REVERSE', message: 'لا يوجد مبلغ مصروف غير معكوس لهذه المكافأة' })
      const amount = dto.amount !== undefined && String(dto.amount).trim() !== '' ? bonusDecimal(dto.amount, 'مبلغ العكس', { scale: 2 }) : remaining.format(2, 'DOWN')
      if (dec(amount).compare(remaining) > 0) bad('BONUS_REVERSAL_ABOVE_PAID', `مبلغ العكس ${money(amount)} يتجاوز المصروف غير المعكوس ${remaining.format(2, 'DOWN')}`, { limit: remaining.format(2, 'DOWN') })
      let period = payrollPeriodOfDate(this.today(), settings.cycleStartDay)
      for (let guard = 0; guard < 12 && await this.closedRun(em, row.employeeId, period); guard++) period = addPayrollMonths(period, 1)
      const snapshot = json<Record<string, any>>(row.typeSnapshot, {})
      const repo = em.getRepository(EmployeeObligation)
      const saved = await repo.save(repo.create({ employeeId: row.employeeId, type: 'DEBIT', category: BONUS_REVERSAL_OBLIGATION_CATEGORY, amount: Number(money(amount)),
        label: `استرداد ${snapshot.nameAr ?? 'مكافأة'} #${row.id}${payout.view?.period ? ` — مسير ${payout.view.period}` : ''}: ${reason}`.slice(0, 300), status: 'PENDING',
        effectiveDate: salaryPayrollPeriodBounds(period, settings.cycleStartDay).startDate, sourceRef: `bonus-reversal:${row.id}`,
        createdByUserId: user.sub, bonusRequestId: row.id, targetPeriod: period }))
      row.revision += 1; row.updatedAt = new Date()
      await em.getRepository(BonusRequest).save(row)
      await this.event(em, row.id, 'REVERSED', user.sub, row.status, row.status, null, reason,
        { amount: money(amount), obligationId: saved.id, paid: payout.paidAmount, reversedBefore: payout.reversedAmount, targetPeriod: period })
    })
    return this.detail(user, id)
  }
}
