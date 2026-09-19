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
import { RequestType } from '../requests/entities/request-type.entity'
import { audienceNeedsEmployee, audienceSubjectOf, parseRequestAudience, requestAudienceAllows, requestTypeInBranch } from '../requests/request-audience'
import { orgPositionsOf } from '../requests/request-audience-positions'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { PayrollDecimal } from './payroll-decimal'
import { salaryPayrollPeriodBounds } from './payroll-period-salary'
import { PAYROLL_SALARY_EVIDENCE_MODE_KEY, parsePayrollSalaryEvidenceMode, PayrollSalaryEvidenceMode, selectPayrollRunSalary } from './payroll-run-salary'
import { lockPayrollEmployees } from './payroll-settlement-boundary'
// C8 / الخطوة 31: بند مسير عُكس صرفه بسطر منفذ لا يُغلق شهر الموظف ولا يُعد آخر مسير له
import { payrollLineNotReversedSql } from './payroll-reversal-sql'
import { PayrollItem, PayrollRun } from './payroll.entities'
import {
  addPayrollMonths,
  buildDeductionChain,
  computeDeductionAmount,
  currentDeductionStep,
  daysBetween,
  DEDUCTION_CREATOR_BASES,
  DEDUCTION_LABELS,
  DEDUCTION_REVERSAL_OBLIGATION_CATEGORY,
  DEDUCTION_SETTING_KEYS,
  DEDUCTION_STRUCTURAL_ROLES,
  DeductionAmountTrace,
  DeductionChainStep,
  deductionDateValid,
  deductionDecimal,
  DeductionCreatorBasis,
  deductionEnumSetting,
  deductionEscalationDaysFor,
  DeductionMissingApproverFallback,
  deductionNumericSetting,
  deductionPeriod,
  deductionPreviewHash,
  DeductionSalaryBasis,
  DeductionSelectionMode,
  DeductionSlaAction,
  deductionSplitsByUnits,
  deductionStepWaitingSince,
  DeductionStructuralRole,
  deductionTypeColumns,
  deductionTypeFinancialChanged,
  DeductionTypeRules,
  deductionTypeRulesFromRow,
  normalizeDeductionTypeRules,
  parseDeductionSteps,
  payrollPeriodForDate,
  splitDeductionInstallments,
  splitDeductionUnits,
  TYPED_DEDUCTION_OBLIGATION_CATEGORY,
} from './typed-deductions'
import { DeductionBatch, DeductionRequest, DeductionRequestEvent, DeductionType } from './typed-deductions.entities'
import type {
  CreateDeductionDto,
  DeductionBulkPreviewDto,
  DeductionBulkSubmitDto,
  DeductionDecisionDto,
  DeductionInputDto,
  DeductionListQueryDto,
  DeductionObjectionDto,
  DeductionObligationDecisionDto,
  DeductionReportQueryDto,
  DeductionReverseDto,
  DeductionTypeDto,
} from './typed-deductions.dto'
import { optionalCreatedRange } from '../attendance/attendance-report-range'

interface Settings {
  reasonMinLength: number
  duplicateWindowHours: number
  managerCreationEnabled: boolean
  bulkMaxEmployees: number
  cycleStartDay: number
  monthlyDays: string
  dailyHours: string
  salaryEvidenceMode: PayrollSalaryEvidenceMode
  missingApproverFallback: DeductionMissingApproverFallback
  stepSlaHours: number
  slaAction: DeductionSlaAction
  objectionWindowDays: number
  objectionBlocksApproval: boolean
  repeatThreshold: number
}
// C4: الحقائق الهيكلية مشتركة مع موديول المكافآت (نفس حل النطاق والرؤساء)
export interface Facts {
  employeeId: number | null
  // قسم المُنشئ نفسه: يحدد انتماءه للجهة المالكة (DD-03 قاعدة 3)
  departmentId: number | null
  directReports: number
  teams: Set<number>
  departments: Set<number>
  branches: Set<number>
  superiors: Set<number>
  departmentRows: Department[]
}
interface NormalizedInput {
  inputValue: string
  incidentDate: string
  reason: string
  targetPeriod: string
  installments: number
  attachmentRef: string | null
  confirmNotDuplicate: boolean
}
interface EvaluationContext {
  type: DeductionType
  rules: DeductionTypeRules
  input: NormalizedInput
  settings: Settings
  facts: Facts
  today: string
  currentPeriod: string
}
// قسط الخصم: المبلغ دائمًا، والوحدات وسعرها ومصدر الراتب للطرق الزمنية (DD-10 قاعدة 2)
interface Part { period: string; amount: string; units?: string; rate?: string; salarySource?: string; formula?: string }
interface ReadyEvaluation {
  ok: true
  employee: Employee
  basis: DeductionCreatorBasis
  bases: DeductionCreatorBasis[]
  trace: DeductionAmountTrace
  amount: string
  parts: Part[]
  escalationDays: string | null
  steps: DeductionChainStep[]
  overrides: { incidentAgeOverride: boolean; duplicateOf: number | null }
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

const MANAGE = 'deductions.manage', APPROVE = 'deductions.approve', VIEW = 'deductions.view'
const OBJECTION_EVENTS = ['OBJECTION', 'OBJECTION_RESPONDED']
const bad = (code: string, message: string, details: Record<string, unknown> = {}): never => { throw new BadRequestException({ code, message, ...details }) }
const dec = (value: unknown) => PayrollDecimal.from(typeof value === 'number' ? value.toFixed(4) : String(value))
const money = (value: unknown) => value === null || value === undefined ? null : dec(value).format(2, 'DOWN')
const decimalText = (value: unknown) => PayrollDecimal.from(typeof value === 'number' ? value : String(value)).canonical()
const sumMoney = (values: Array<unknown>) => values.reduce<PayrollDecimal>((sum, value) => value === null || value === undefined ? sum : sum.add(dec(value)), PayrollDecimal.from('0')).format(2, 'DOWN')
const json = <T>(text: string | null, fallback: T): T => { if (!text) return fallback; try { return JSON.parse(text) as T } catch { return fallback } }

// DD-01..DD-13: الكتالوج (مع الجهة المالكة والنطاق الوظيفي ومصفوفة التصعيد)، صلاحية المنشئ ونطاقه، الطلب والاعتماد مع
// التصعيد والبديل والمهلة، اعتراض الموظف، الفترة المستهدفة، العكس بعد الصرف، قرارات الأقساط المعلقة، التقارير،
// والإنشاء الجماعي بمعاينة واستبعاد. القيد المالي يُنشأ في دفتر المديونيات عند آخر اعتماد فقط،
// والمسير يحجزه عند اعتماده ويستهلكه عند الصرف (payroll-obligation-ledger).
@Injectable()
export class TypedDeductionsService {
  constructor(
    @InjectRepository(DeductionType) private readonly types: Repository<DeductionType>,
    @InjectRepository(DeductionRequest) private readonly requests: Repository<DeductionRequest>,
  ) {}

  private get manager() { return this.types.manager }

  private today() { return new Date().toLocaleDateString('en-CA') }

  private async settings(em: EntityManager): Promise<Settings> {
    const keys = [...DEDUCTION_SETTING_KEYS, 'payroll.cycle_start_day', 'payroll.monthly_days', 'payroll.daily_hours', PAYROLL_SALARY_EVIDENCE_MODE_KEY]
    const rows = await em.getRepository(RequestsConfig).findBy({ key: In(keys) })
    const value = (key: string) => rows.find(row => row.key === key)?.value
    const num = (key: string) => deductionNumericSetting(key, value(key))
    const choice = (key: string) => deductionEnumSetting(key, value(key))
    const cycle = Number(value('payroll.cycle_start_day') ?? '23')
    const decimal = (key: string, fallback: string) => { const text = (value(key) ?? fallback).trim(); return /^\d+(\.\d{1,2})?$/.test(text) && Number(text) > 0 ? text : fallback }
    return {
      reasonMinLength: num('deductions.reason_min_length'),
      duplicateWindowHours: num('deductions.duplicate_window_hours'),
      managerCreationEnabled: choice('deductions.manager_creation_enabled') === 'true',
      bulkMaxEmployees: num('deductions.bulk_max_employees'),
      cycleStartDay: Number.isInteger(cycle) && cycle >= 1 && cycle <= 31 ? cycle : 23,
      monthlyDays: decimal('payroll.monthly_days', '30'),
      dailyHours: decimal('payroll.daily_hours', '8'),
      salaryEvidenceMode: parsePayrollSalaryEvidenceMode(value(PAYROLL_SALARY_EVIDENCE_MODE_KEY)),
      missingApproverFallback: choice('deductions.missing_approver_fallback') as DeductionMissingApproverFallback,
      stepSlaHours: num('deductions.step_sla_hours'),
      slaAction: choice('deductions.sla_breach_action') as DeductionSlaAction,
      objectionWindowDays: num('deductions.objection_window_days'),
      objectionBlocksApproval: choice('deductions.objection_blocks_approval') === 'true',
      repeatThreshold: num('deductions.repeat_deduction_threshold'),
    }
  }

  private async inChunks<T>(ids: number[], load: (chunk: number[]) => Promise<T[]>, size = 1000): Promise<T[]> {
    const result: T[] = []
    for (let index = 0; index < ids.length; index += size) result.push(...await load(ids.slice(index, index + size)))
    return result
  }

  // الأعمار من SQL Server مباشرة (createdAt بتوقيت UTC الخادم؛ تفادي قراءة datetime2 بتوقيت محلي)
  private async ageMinutes(em: EntityManager, ids: number[]): Promise<Map<number, number>> {
    const rows = await this.inChunks(ids, chunk => em.query(`SELECT [id], DATEDIFF(minute, [createdAt], SYSUTCDATETIME()) AS [ageMinutes]
      FROM [deduction_requests] WHERE [id] IN (${chunk.map((_, index) => `@${index}`).join(',')})`, chunk) as Promise<Array<{ id: number; ageMinutes: number }>>)
    return new Map(rows.map(row => [Number(row.id), Number(row.ageMinutes)]))
  }

  // ===== الهيكل التنظيمي والنطاق (DD-03/04) =====
  private departmentManagers(rows: Department[], departmentId: number | null | undefined): number[] {
    const result: number[] = [], seen = new Set<number>()
    let current = departmentId ? rows.find(row => row.id === departmentId) : undefined
    while (current && !seen.has(current.id)) {
      seen.add(current.id)
      if (current.managerEmployeeId) result.push(current.managerEmployeeId)
      current = current.parentId ? rows.find(row => row.id === current!.parentId) : undefined
    }
    return result
  }

  departmentPath(rows: Department[], departmentId: number | null | undefined): number[] {
    const result: number[] = [], seen = new Set<number>()
    let current = departmentId ? rows.find(row => row.id === departmentId) : undefined
    while (current && !seen.has(current.id)) {
      seen.add(current.id); result.push(current.id)
      current = current.parentId ? rows.find(row => row.id === current!.parentId) : undefined
    }
    return result
  }

  descendants(rows: Department[], roots: Set<number>): Set<number> {
    const result = new Set(roots)
    let grew = true
    while (grew) {
      grew = false
      for (const row of rows) if (row.parentId && result.has(row.parentId) && !result.has(row.id)) { result.add(row.id); grew = true }
    }
    return result
  }

  // نفس دلالة ApproverResolver: المدير المباشر ← قائد الفريق ← مدير القسم (صعودًا) ← مدير الفرع
  async approversFor(em: EntityManager, employee: Employee, departmentRows: Department[]): Promise<Record<DeductionStructuralRole, number | null>> {
    const team = employee.teamId ? await em.getRepository(Team).findOne({ where: { id: employee.teamId }, select: { id: true, leaderEmployeeId: true } }) : null
    const branch = await em.getRepository(Branch).findOne({ where: { id: employee.branchId }, select: { id: true, managerEmployeeId: true } })
    const teamLeader = team?.leaderEmployeeId && team.leaderEmployeeId !== employee.id ? team.leaderEmployeeId : null
    const departmentManager = this.departmentManagers(departmentRows, employee.departmentId).find(id => id !== employee.id) ?? null
    const branchManager = branch?.managerEmployeeId && branch.managerEmployeeId !== employee.id ? branch.managerEmployeeId : null
    const direct = employee.managerEmployeeId && employee.managerEmployeeId !== employee.id ? employee.managerEmployeeId : teamLeader ?? departmentManager ?? branchManager
    return { DIRECT_MANAGER: direct, TEAM_LEADER: teamLeader, DEPARTMENT_MANAGER: departmentManager, BRANCH_MANAGER: branchManager }
  }

  async facts(em: EntityManager, user: Pick<JwtPayload, 'employeeId'>): Promise<Facts> {
    const departmentRows = await em.getRepository(Department).find({ select: { id: true, parentId: true, managerEmployeeId: true, branchId: true } })
    const employeeId = Number.isSafeInteger(user.employeeId) && Number(user.employeeId) > 0 ? Number(user.employeeId) : null
    const facts: Facts = { employeeId, departmentId: null, directReports: 0, teams: new Set(), departments: new Set(), branches: new Set(), superiors: new Set(), departmentRows }
    if (!employeeId) return facts
    const employees = em.getRepository(Employee)
    const self = await employees.findOne({ where: { id: employeeId } })
    facts.departmentId = self?.departmentId ?? null
    facts.directReports = await employees.count({ where: { managerEmployeeId: employeeId, isActive: true } })
    facts.teams = new Set((await em.getRepository(Team).find({ where: { leaderEmployeeId: employeeId }, select: { id: true } })).map(row => row.id))
    facts.departments = this.descendants(departmentRows, new Set(departmentRows.filter(row => row.managerEmployeeId === employeeId).map(row => row.id)))
    facts.branches = new Set((await em.getRepository(Branch).find({ where: { managerEmployeeId: employeeId }, select: { id: true } })).map(row => row.id))
    // DD-03 قاعدة 4: سلسلة من يعلو المُنشئ (بنفس حل المدير المباشر) لا يُنزل عليها خصم
    let current = self
    const seen = new Set<number>([employeeId])
    for (let depth = 0; current && depth < 20; depth++) {
      const next = (await this.approversFor(em, current, departmentRows)).DIRECT_MANAGER
      if (!next || seen.has(next)) break
      seen.add(next); facts.superiors.add(next)
      current = await employees.findOne({ where: { id: next } })
    }
    return facts
  }

  // DD-03 قاعدة 3: النوع المملوك لجهة لا يُنزله دور هيكلي إلا من ينتمي لتلك الجهة (عضو في شجرتها أو مديرها)
  private creatorInOwnerUnit(facts: Facts, rules: Pick<DeductionTypeRules, 'ownerDepartmentId'> | null) {
    if (!rules?.ownerDepartmentId) return true
    if (facts.departments.has(rules.ownerDepartmentId)) return true
    return facts.departmentId !== null && this.descendants(facts.departmentRows, new Set([rules.ownerDepartmentId])).has(facts.departmentId)
  }

  // DD-04 قاعدة 2: النطاق الوظيفي الصريح؛ بلا تعريف = شجرة القسم المالك
  private inFunctionalScope(facts: Facts, rules: Pick<DeductionTypeRules, 'ownerDepartmentId' | 'functionalScope'>, employee: Employee) {
    const scope = rules.functionalScope
    if (!scope) return !!employee.departmentId && !!rules.ownerDepartmentId && this.descendants(facts.departmentRows, new Set([rules.ownerDepartmentId])).has(employee.departmentId)
    return scope.employeeIds.includes(employee.id) || (!!employee.teamId && scope.teamIds.includes(employee.teamId)) ||
      (!!employee.departmentId && this.descendants(facts.departmentRows, new Set(scope.departmentIds)).has(employee.departmentId))
  }

  private basesFor(user: JwtPayload, facts: Facts, settings: Settings, employee: Employee, rules: DeductionTypeRules | null): DeductionCreatorBasis[] {
    const bases: DeductionCreatorBasis[] = []
    if (settings.managerCreationEnabled && facts.employeeId) {
      if (this.creatorInOwnerUnit(facts, rules)) {
        if (employee.managerEmployeeId === facts.employeeId) bases.push('DIRECT_MANAGER')
        if (employee.teamId && facts.teams.has(employee.teamId)) bases.push('TEAM_LEADER')
        if (employee.departmentId && facts.departments.has(employee.departmentId)) bases.push('DEPARTMENT_MANAGER')
        if (facts.branches.has(employee.branchId)) bases.push('BRANCH_MANAGER')
      }
      if (rules?.ownerDepartmentId && facts.departments.has(rules.ownerDepartmentId) && this.inFunctionalScope(facts, rules, employee)) bases.push('FUNCTION_OWNER')
    }
    const scope = branchScopeOf(user)
    if (userHasPerm(user, MANAGE) && (scope === null || scope === employee.branchId)) bases.push('HR')
    return bases
  }

  private inBranchScope(user: JwtPayload, employee: Pick<Employee, 'branchId'> | undefined | null) {
    const scope = branchScopeOf(user)
    return !!employee && (scope === null || scope === employee.branchId)
  }

  // ===== B4 (قرار المالك): جمهور نوع الطلب المالي يحكم القدرة فعلًا =====
  // «خصم» و«مكافأة» كارتان في المجموعة المالية؛ من يخفيه عنه visibleTo لا يراه في «طلب جديد»
  // ولا يُنشئ منه ولو أرسل مباشرةً إلى /deductions أو /bonuses.
  // المقيّم واحد مشترك مع محرك الطلبات (requests/request-audience.ts) — إعداد واحد وإجابة واحدة.
  async assertMoneyRequestVisible(em: EntityManager, user: JwtPayload, typeCode: string, label: string) {
    const type = await em.getRepository(RequestType).findOne({ where: { code: typeCode } })
    if (!type) return
    const audience = parseRequestAudience(type.visibleTo)
    // قسم المستخدم وفرعه لا يُقرآن إلا لجمهور محصور في أقسام/فروع أو لنوع خاص بفرع (قرار المالك 16 سبتمبر)
    const self = (audienceNeedsEmployee(type.visibleTo) || type.branchId != null) && user.employeeId
      ? await em.getRepository(Employee).findOne({ where: { id: user.employeeId }, select: { id: true, departmentId: true, teamId: true, branchId: true } })
      : null
    // «حسب المنصب»: مدير قسم / قائد فريق / مدير فرع يُعرفون من الهيكل لا من الدور
    const positions = audience?.mode === 'positions' ? await orgPositionsOf(em, user.employeeId) : null
    const owner = user.role === 'super_admin' || (user.permissions ?? []).includes('*')
    if (!requestTypeInBranch(type, self?.branchId ?? user.branchId, owner)
      || !requestAudienceAllows(type.visibleTo, { ...audienceSubjectOf(user, self), positions }, 'submit')) {
      throw new ForbiddenException({ code: 'MONEY_REQUEST_NOT_VISIBLE', message: `طلب ${label} غير متاح لك` })
    }
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

  // ===== الراتب المرجعي للشهر (قرار المالك: الراتب يسري على شهر مسير كامل) =====
  // نفس اختيار المسير (الخطوة 13): السجل الشهري لشهر المسير، ووضع الملف الحالي الانتقالي فقط لو ضُبط صراحة؛
  // بلا راتب للشهر يُرفض الخصم لأن المسير نفسه سيستبعد الموظف.
  private async salaryBasis(em: EntityManager, employee: Employee, period: string, settings: Settings): Promise<DeductionSalaryBasis> {
    const selection = await selectPayrollRunSalary(em, employee, period, settings.salaryEvidenceMode)
    if (!selection.ok) {
      throw new BadRequestException({ code: `DEDUCTION_${selection.code}`, message: `${selection.message} — لا يُحسب الخصم بلا راتب الشهر ${period}` })
    }
    const values = MONTHLY_SALARY_COMPONENTS.map(component => PayrollDecimal.from(selection.source.amounts[component.key]).format(2, 'DOWN'))
    const gross = values.reduce((sum, value) => sum.add(PayrollDecimal.from(value)), PayrollDecimal.from('0')).format(2, 'DOWN')
    const source = selection.source.kind === 'MONTHLY_HISTORY' ? String(selection.source.sourceRef) : `${selection.source.sourceRef}:CURRENT_FILE_UNVERIFIED`
    return { basic: values[0], gross, monthlyDays: settings.monthlyDays, dailyHours: settings.dailyHours, source }
  }

  /** DD-10 قاعدة 2: الطرق الزمنية تُقسّط بالوحدات ويُسعَّر كل قسط براتب شهره؛ غيرها يُقسّط بالمبلغ. */
  private async priceParts(em: EntityManager, employee: Employee, rules: DeductionTypeRules, settings: Settings, total: { inputValue: string; amount: string },
    targetSalary: DeductionSalaryBasis, targetPeriod: string, installments: number): Promise<Part[]> {
    if (!deductionSplitsByUnits(rules.calcMethod)) {
      return splitDeductionInstallments(total.amount, installments).map((amount, index) => ({ period: addPayrollMonths(targetPeriod, index), amount }))
    }
    const unlimited = { ...rules, valueStep: null, minAmount: null, maxAmount: null, maxPctOfGross: null, escalationDays: null }
    const parts: Part[] = []
    const units = splitDeductionUnits(total.inputValue, installments)
    for (let index = 0; index < units.length; index++) {
      const period = addPayrollMonths(targetPeriod, index)
      const salary = index === 0 ? targetSalary : await this.salaryBasis(em, employee, period, settings)
      const priced = computeDeductionAmount(unlimited, units[index], salary)
      parts.push({ period, amount: priced.amount, units: priced.inputValue, rate: rules.calcMethod === 'DAYS_OF_SALARY' ? priced.dayRate : priced.hourRate,
        salarySource: salary.source, formula: priced.formula })
    }
    return parts
  }

  private async closedRun(em: EntityManager, employeeId: number, period: string): Promise<number | null> {
    const rows = await em.query(`SELECT TOP (1) r.[id] FROM [payroll_runs] r INNER JOIN [payroll_items] i ON i.[runId]=r.[id]
      WHERE i.[employeeId]=@0 AND r.[period]=@1 AND r.[status] IN ('APPROVED','PAID') AND ${payrollLineNotReversedSql('r.[id]', 'i.[employeeId]')} ORDER BY r.[id]`, [employeeId, period])
    return rows.length ? Number(rows[0].id) : null
  }

  private async duplicateOf(em: EntityManager, employeeId: number, typeId: number, incidentDate: string, inputValue: string, settings: Settings): Promise<number | null> {
    if (settings.duplicateWindowHours <= 0) return null
    const rows = await em.query(`SELECT TOP (1) [id] FROM [deduction_requests] WHERE [employeeId]=@0 AND [deductionTypeId]=@1 AND [incidentDate]=@2
      AND [inputValue]=CAST(@3 AS decimal(18,4)) AND [status] IN ('IN_APPROVAL','APPROVED')
      AND [createdAt] >= DATEADD(hour, 0 - @4, SYSUTCDATETIME()) ORDER BY [id] DESC`, [employeeId, typeId, incidentDate, inputValue, settings.duplicateWindowHours])
    return rows.length ? Number(rows[0].id) : null
  }

  private exception(failed: FailedEvaluation): HttpException {
    const body = { ...(failed.details ?? {}), code: failed.code, message: failed.message }
    return failed.status === 403 ? new ForbiddenException(body) : failed.status === 409 ? new ConflictException(body) : failed.status === 404 ? new NotFoundException(body) : new BadRequestException(body)
  }

  private outOfScope(): ForbiddenException {
    return new ForbiddenException({ code: 'DEDUCTION_OUT_OF_SCOPE', message: 'الموظف خارج نطاق صلاحيتك لهذا النوع من الخصومات' })
  }

  private async context(em: EntityManager, user: JwtPayload, dto: DeductionInputDto): Promise<EvaluationContext> {
    const settings = await this.settings(em)
    const type = await em.getRepository(DeductionType).findOneBy({ id: dto.deductionTypeId })
    if (!type) throw new NotFoundException({ code: 'DEDUCTION_TYPE_NOT_FOUND', message: 'نوع الخصم غير معرّف في الكتالوج' })
    const rules = deductionTypeRulesFromRow(type)
    if (!rules.isActive) bad('DEDUCTION_TYPE_INACTIVE', 'نوع الخصم معطل ولا يقبل طلبات جديدة')
    const reason = typeof dto.reason === 'string' ? dto.reason.trim() : ''
    if (reason.length < settings.reasonMinLength) bad('DEDUCTION_REASON_TOO_SHORT', `سبب الخصم لا يقل عن ${settings.reasonMinLength} حرفًا`, { minLength: settings.reasonMinLength })
    if (!deductionDateValid(dto.incidentDate)) bad('DEDUCTION_DATE_INVALID', 'تاريخ الواقعة غير صالح')
    const today = this.today()
    if (dto.incidentDate > today) bad('DEDUCTION_INCIDENT_FUTURE', 'تاريخ الواقعة لا يكون مستقبليًا')
    const targetPeriod = deductionPeriod(dto.targetPeriod)
    const currentPeriod = payrollPeriodForDate(today, settings.cycleStartDay)
    if (targetPeriod > addPayrollMonths(currentPeriod, 12)) bad('DEDUCTION_PERIOD_TOO_FAR', 'الشهر المستهدف لا يتجاوز 12 شهرًا بعد شهر المسير الحالي')
    const installments = dto.installments ?? 1
    if (installments > 1 && !rules.installmentAllowed) bad('DEDUCTION_INSTALLMENTS_NOT_ALLOWED', 'هذا النوع لا يسمح بتقسيط الخصم')
    if (installments > rules.maxInstallments) bad('DEDUCTION_INSTALLMENTS_ABOVE_MAX', `عدد الأقساط ${installments} يتجاوز الحد ${rules.maxInstallments} لهذا النوع`, { limit: rules.maxInstallments })
    const attachmentRef = dto.attachmentRef?.trim() || null
    if (rules.requiresAttachment && !attachmentRef) bad('DEDUCTION_ATTACHMENT_REQUIRED', 'هذا النوع يتطلب مرفقًا أو مرجع مستند')
    const facts = await this.facts(em, user)
    return { type, rules, settings, facts, today, currentPeriod,
      input: { inputValue: String(dto.inputValue ?? '').trim(), incidentDate: dto.incidentDate, reason, targetPeriod, installments, attachmentRef, confirmNotDuplicate: dto.confirmNotDuplicate === true } }
  }

  private scopedBases(user: JwtPayload, ctx: EvaluationContext, employee: Employee) {
    // عزل الفروع: حساب مقفول على فرع ما ينزلش خصم/مكافأة على موظف في فرع تاني حتى لو الهيكل رابطهم
    if (!this.inBranchScope(user, employee)) return []
    return this.basesFor(user, ctx.facts, ctx.settings, employee, ctx.rules).filter(basis => ctx.rules.creatorScopes.includes(basis))
  }

  private async evaluate(em: EntityManager, user: JwtPayload, ctx: EvaluationContext, employee: Employee): Promise<Evaluation> {
    const failed = (status: number, code: string, message: string, details?: Record<string, unknown>): FailedEvaluation => ({ ok: false, employee, status, code, message, details })
    if (ctx.facts.employeeId === employee.id) return failed(403, 'DEDUCTION_SELF', 'لا يمكنك إنزال خصم على نفسك')
    // DD-04: النطاق قبل أي فحص يكشف حالة الموظف (نشط/غير نشط) لمن لا يملكه
    const bases = this.scopedBases(user, ctx, employee)
    if (!bases.length) return failed(403, 'DEDUCTION_OUT_OF_SCOPE', 'الموظف خارج نطاق صلاحيتك لهذا النوع من الخصومات')
    if (ctx.facts.superiors.has(employee.id)) return failed(403, 'DEDUCTION_SUPERIOR', 'لا يمكن إنزال خصم على من يعلوك في التسلسل الإداري')
    if (!employee.isActive) return failed(400, 'DEDUCTION_EMPLOYEE_INACTIVE', 'الموظف غير نشط')
    let incidentAgeOverride = false
    if (daysBetween(ctx.input.incidentDate, ctx.today) > ctx.rules.maxIncidentAgeDays) {
      if (!bases.includes('HR')) return failed(400, 'DEDUCTION_INCIDENT_TOO_OLD', `الواقعة أقدم من ${ctx.rules.maxIncidentAgeDays} يومًا؛ يلزم إنشاؤه من الموارد البشرية`, { limit: ctx.rules.maxIncidentAgeDays })
      incidentAgeOverride = true
    }
    const closedRunId = await this.closedRun(em, employee.id, ctx.input.targetPeriod)
    if (closedRunId) return failed(400, 'DEDUCTION_PERIOD_CLOSED', `مسير ${ctx.input.targetPeriod} للموظف معتمد أو مصروف (#${closedRunId})؛ اختر شهرًا مفتوحًا`, { runId: closedRunId })
    const basis = DEDUCTION_CREATOR_BASES.find(item => bases.includes(item))!
    // DD-03 قاعدة 1/5: حد التصعيد من مصفوفة دور المُنشئ، وإلا حد النوع
    const escalationDays = deductionEscalationDaysFor(ctx.rules, basis)
    let trace: DeductionAmountTrace, parts: Part[]
    try {
      const salary = await this.salaryBasis(em, employee, ctx.input.targetPeriod, ctx.settings)
      trace = computeDeductionAmount({ ...ctx.rules, escalationDays }, ctx.input.inputValue, salary)
      parts = await this.priceParts(em, employee, ctx.rules, ctx.settings, trace, salary, ctx.input.targetPeriod, ctx.input.installments)
    } catch (error) {
      if (error instanceof HttpException) {
        const body = error.getResponse() as Record<string, unknown>
        return failed(error.getStatus(), String(body?.code ?? 'DEDUCTION_INVALID'), String(body?.message ?? error.message), body)
      }
      throw error
    }
    const duplicate = await this.duplicateOf(em, employee.id, ctx.type.id, ctx.input.incidentDate, trace.inputValue, ctx.settings)
    if (duplicate && !ctx.input.confirmNotDuplicate) {
      return failed(409, 'DEDUCTION_DUPLICATE', `يوجد خصم مطابق (#${duplicate}) للموظف خلال ${ctx.settings.duplicateWindowHours} ساعة؛ أكّد أنه ليس تكرارًا`, { duplicateOf: duplicate })
    }
    const steps = buildDeductionChain({ approvalSteps: ctx.rules.approvalSteps, escalated: trace.escalated, escalationStep: ctx.rules.escalationStep,
      creatorEmployeeId: ctx.facts.employeeId, employeeId: employee.id, approvers: await this.approversFor(em, employee, ctx.facts.departmentRows),
      missingApproverFallback: ctx.settings.missingApproverFallback })
    return { ok: true, employee, basis, bases, trace, amount: sumMoney(parts.map(part => part.amount)), parts, escalationDays, steps, overrides: { incidentAgeOverride, duplicateOf: duplicate } }
  }

  private event(em: EntityManager, requestId: number, eventType: string, actorUserId: number | null, fromStatus: string | null, toStatus: string | null,
    stepOrder: number | null, reason: string | null, payload: unknown) {
    return em.getRepository(DeductionRequestEvent).save({ requestId, eventType, actorUserId, fromStatus, toStatus, stepOrder, reason,
      payload: payload === null || payload === undefined ? null : JSON.stringify(payload) })
  }

  private async persist(em: EntityManager, user: JwtPayload, ctx: EvaluationContext, evaluation: ReadyEvaluation, batchId: number | null) {
    const repo = em.getRepository(DeductionRequest)
    const employee = evaluation.employee
    const saved = await repo.save(repo.create({
      batchId, employeeId: employee.id, deductionTypeId: ctx.type.id, typeVersion: ctx.type.version,
      typeSnapshot: JSON.stringify({ id: ctx.type.id, version: ctx.type.version, ...ctx.rules }),
      calcMethod: ctx.rules.calcMethod, inputValue: evaluation.trace.inputValue, estimatedAmount: evaluation.amount, finalAmount: null,
      amountTrace: JSON.stringify({ creation: evaluation.trace, installments: evaluation.parts, escalationDays: evaluation.escalationDays }),
      incidentDate: ctx.input.incidentDate, reason: ctx.input.reason, attachmentRef: ctx.input.attachmentRef, targetPeriod: ctx.input.targetPeriod,
      installments: ctx.input.installments, status: 'IN_APPROVAL', creatorUserId: user.sub, creatorEmployeeId: ctx.facts.employeeId,
      scopeBasis: evaluation.basis,
      scopeSnapshot: JSON.stringify({ bases: evaluation.bases, capturedAt: new Date().toISOString(),
        employee: { branchId: employee.branchId, departmentId: employee.departmentId ?? null, teamId: employee.teamId ?? null, managerEmployeeId: employee.managerEmployeeId ?? null } }),
      steps: JSON.stringify(evaluation.steps), escalated: evaluation.trace.escalated, outOfScope: false,
      overrides: JSON.stringify(evaluation.overrides), obligationIds: null, decisionReason: null, decidedByUserId: null, decidedAt: null, revision: 0, updatedAt: null,
    }))
    await this.event(em, saved.id, 'SUBMITTED', user.sub, null, 'IN_APPROVAL', null, null,
      { amount: evaluation.amount, basis: evaluation.basis, escalated: evaluation.trace.escalated, escalationDays: evaluation.escalationDays, overrides: evaluation.overrides, batchId })
    for (const step of evaluation.steps.filter(row => row.status === 'SKIPPED' || row.fallbackFrom)) {
      await this.event(em, saved.id, step.status === 'SKIPPED' ? 'STEP_SKIPPED' : 'STEP_FALLBACK', null, 'IN_APPROVAL', 'IN_APPROVAL', step.order, step.note,
        { role: step.role, fallbackFrom: step.fallbackFrom ?? null, approverEmployeeId: step.approverEmployeeId })
    }
    return saved
  }

  // ===== الكتالوج (DD-01) =====
  private typeView(row: DeductionType) {
    const rules = deductionTypeRulesFromRow(row)
    return { id: row.id, version: row.version, ...rules, categoryLabel: DEDUCTION_LABELS.categories[rules.category], calcMethodLabel: DEDUCTION_LABELS.calcMethods[rules.calcMethod],
      creatorScopeLabels: rules.creatorScopes.map(role => DEDUCTION_LABELS.roles[role]), approvalStepLabels: rules.approvalSteps.map(role => DEDUCTION_LABELS.roles[role]),
      escalationStepLabel: rules.escalationStep ? DEDUCTION_LABELS.roles[rules.escalationStep] : null, updatedAt: row.updatedAt, createdAt: row.createdAt }
  }

  async listTypes(user: JwtPayload, includeInactive: boolean) {
    const rows = await this.types.find({ order: { code: 'ASC' } })
    const manage = userHasPerm(user, MANAGE)
    return rows.filter(row => row.isActive || (includeInactive && manage)).map(row => this.typeView(row))
  }

  // الجهة المالكة وعناصر النطاق الوظيفي يجب أن تكون موجودة فعلًا
  private async assertTypeReferences(em: EntityManager, rules: DeductionTypeRules) {
    const departments = (ids: number[]) => ids.length ? em.getRepository(Department).count({ where: { id: In(ids) } }) : Promise.resolve(0)
    const teams = (ids: number[]) => ids.length ? em.getRepository(Team).count({ where: { id: In(ids) } }) : Promise.resolve(0)
    const employees = (ids: number[]) => ids.length ? em.getRepository(Employee).count({ where: { id: In(ids) } }) : Promise.resolve(0)
    if (rules.ownerDepartmentId && await departments([rules.ownerDepartmentId]) !== 1) bad('DEDUCTION_TYPE_OWNER_NOT_FOUND', 'القسم المالك للنوع غير موجود')
    const scope = rules.functionalScope
    if (scope && (await departments(scope.departmentIds) !== scope.departmentIds.length || await teams(scope.teamIds) !== scope.teamIds.length ||
      await employees(scope.employeeIds) !== scope.employeeIds.length)) bad('DEDUCTION_TYPE_SCOPE_NOT_FOUND', 'أحد أقسام أو فرق أو موظفي النطاق الوظيفي غير موجود')
  }

  // أنواع الخصم مالهاش فرع = لكل الشركة: حساب الفرع يشوفها بس، والإضافة والتعديل والتعطيل لحساب على مستوى الشركة
  async createType(user: JwtPayload, dto: DeductionTypeDto) {
    assertCompanyWideWrite(user)
    const rules = normalizeDeductionTypeRules(dto as unknown as Record<string, unknown>)
    if (await this.types.findOneBy({ code: rules.code })) throw new ConflictException({ code: 'DEDUCTION_TYPE_CODE_EXISTS', message: `الكود ${rules.code} مستخدم لنوع آخر` })
    await this.assertTypeReferences(this.manager, rules)
    const saved = await this.types.save(this.types.create({ ...deductionTypeColumns(rules), version: 1, updatedByUserId: user.sub, updatedAt: null }))
    return this.typeView(saved)
  }

  async updateType(user: JwtPayload, id: number, dto: DeductionTypeDto) {
    assertCompanyWideWrite(user)
    return this.manager.transaction(async em => {
      const repo = em.getRepository(DeductionType)
      const row = await repo.createQueryBuilder('t').setLock('pessimistic_write').where('t.id = :id', { id }).getOne()
      if (!row) throw new NotFoundException({ code: 'DEDUCTION_TYPE_NOT_FOUND', message: 'نوع الخصم غير موجود' })
      const before = deductionTypeRulesFromRow(row)
      const after = normalizeDeductionTypeRules(dto as unknown as Record<string, unknown>, before)
      await this.assertTypeReferences(em, after)
      Object.assign(row, deductionTypeColumns(after), { version: deductionTypeFinancialChanged(before, after) ? row.version + 1 : row.version, updatedByUserId: user.sub, updatedAt: new Date() })
      return this.typeView(await repo.save(row))
    })
  }

  // ===== ما يستطيع المستخدم إنشاءه ولمن (DD-04: خارج النطاق لا يظهر) =====
  async creatable(user: JwtPayload) {
    const em = this.manager
    const settings = await this.settings(em), facts = await this.facts(em, user)
    const structural = new Set<DeductionCreatorBasis>()
    if (settings.managerCreationEnabled && facts.employeeId) {
      if (facts.directReports > 0) structural.add('DIRECT_MANAGER')
      if (facts.teams.size) structural.add('TEAM_LEADER')
      if (facts.departments.size) structural.add('DEPARTMENT_MANAGER')
      if (facts.branches.size) structural.add('BRANCH_MANAGER')
    }
    const hr = userHasPerm(user, MANAGE) && branchScopeOf(user) !== -1
    const available = new Set<DeductionCreatorBasis>()
    const types = (await em.getRepository(DeductionType).find({ where: { isActive: true }, order: { code: 'ASC' } })).map(row => this.typeView(row)).filter(type => {
      let allowed = false
      for (const scope of type.creatorScopes) {
        const ok = scope === 'HR' ? hr
          : scope === 'FUNCTION_OWNER' ? settings.managerCreationEnabled && !!facts.employeeId && !!type.ownerDepartmentId && facts.departments.has(type.ownerDepartmentId)
            : structural.has(scope) && this.creatorInOwnerUnit(facts, type)
        if (ok) { available.add(scope); allowed = true }
      }
      return allowed
    })
    const bases = DEDUCTION_CREATOR_BASES.filter(basis => available.has(basis))
    const today = this.today()
    return { today, currentPeriod: payrollPeriodForDate(today, settings.cycleStartDay), cycleStartDay: settings.cycleStartDay, reasonMinLength: settings.reasonMinLength,
      bases, basisLabels: bases.map(basis => DEDUCTION_LABELS.roles[basis]), types }
  }

  async candidates(user: JwtPayload, typeId?: number) {
    const em = this.manager
    const settings = await this.settings(em), facts = await this.facts(em, user)
    let rules: DeductionTypeRules | null = null
    if (typeId !== undefined) {
      const type = await em.getRepository(DeductionType).findOneBy({ id: typeId })
      if (!type) throw new NotFoundException({ code: 'DEDUCTION_TYPE_NOT_FOUND', message: 'نوع الخصم غير موجود' })
      rules = deductionTypeRulesFromRow(type)
    }
    const employees = await em.getRepository(Employee).find({ where: { isActive: true }, order: { fullName: 'ASC' },
      select: { id: true, fullName: true, employeeCode: true, branchId: true, departmentId: true, teamId: true, managerEmployeeId: true, isActive: true } })
    const names = await this.orgNames(em)
    return employees.filter(row => row.id !== facts.employeeId && !facts.superiors.has(row.id) && this.inBranchScope(user, row))
      .map(row => ({ row, bases: this.basesFor(user, facts, settings, row, rules).filter(basis => !rules || rules.creatorScopes.includes(basis)) }))
      .filter(entry => entry.bases.length)
      .map(({ row, bases }) => ({ id: row.id, fullName: row.fullName, employeeCode: row.employeeCode, branchId: row.branchId, branchName: names.branches.get(row.branchId) ?? null,
        departmentId: row.departmentId ?? null, departmentName: row.departmentId ? names.departments.get(row.departmentId) ?? null : null,
        // مسار القسم صعودًا (القسم ثم آباؤه): الواجهة تطابق به اختيار «قسم مع فروعه» كما يحله الخادم
        departmentPath: this.departmentPath(facts.departmentRows, row.departmentId).map(id => ({ id, name: names.departments.get(id) ?? null })),
        teamId: row.teamId ?? null, teamName: row.teamId ? names.teams.get(row.teamId) ?? null : null, bases, basisLabels: bases.map(basis => DEDUCTION_LABELS.roles[basis]) }))
  }

  // ===== الإنشاء الفردي (DD-05) =====
  async create(user: JwtPayload, dto: CreateDeductionDto) {
    const id = await this.manager.transaction(async em => {
      await this.assertMoneyRequestVisible(em, user, 'PAYROLL_DEDUCTION', 'الخصم')
      const ctx = await this.context(em, user, dto)
      const employee = await em.getRepository(Employee).findOneBy({ id: dto.employeeId })
      if (!employee) {
        // لا كاشف وجود: من لا يملك نطاقًا عامًا يستلم نفس رد «خارج النطاق»
        if (userHasPerm(user, MANAGE) && branchScopeOf(user) === null) throw new NotFoundException({ code: 'DEDUCTION_EMPLOYEE_NOT_FOUND', message: 'الموظف غير موجود' })
        throw this.outOfScope()
      }
      if (ctx.facts.employeeId !== employee.id && !this.scopedBases(user, ctx, employee).length) throw this.outOfScope()
      await lockPayrollEmployees(em, [employee.id])
      const evaluation = await this.evaluate(em, user, ctx, employee)
      if (!evaluation.ok) throw this.exception(evaluation)
      return (await this.persist(em, user, ctx, evaluation, null)).id
    })
    return this.detail(user, id)
  }

  // ===== المعاينة والإنشاء الجماعي (قرار المالك) =====
  private previewRow(employee: Employee | null, employeeId: number, names: OrgNames, approverNames: Map<number, Employee>, status: string, message: string | null, evaluation: ReadyEvaluation | null) {
    return {
      employeeId, employeeCode: employee?.employeeCode ?? null, fullName: employee?.fullName ?? null,
      branchName: employee ? names.branches.get(employee.branchId) ?? null : null,
      departmentName: employee?.departmentId ? names.departments.get(employee.departmentId) ?? null : null,
      teamName: employee?.teamId ? names.teams.get(employee.teamId) ?? null : null,
      status, message,
      amount: evaluation?.amount ?? null, formula: evaluation?.trace.formula ?? null, escalated: evaluation?.trace.escalated ?? false,
      escalationThreshold: evaluation?.trace.escalationThreshold ?? null, pctLimit: evaluation?.trace.pctLimit ?? null,
      basis: evaluation?.basis ?? null, basisLabel: evaluation ? DEDUCTION_LABELS.roles[evaluation.basis] : null,
      installments: evaluation?.parts ?? [],
      steps: (evaluation?.steps ?? []).map(step => ({ order: step.order, role: step.role, roleLabel: DEDUCTION_LABELS.roles[step.role], status: step.status, note: step.note,
        escalation: step.escalation, fallbackFrom: step.fallbackFrom ?? null, approverEmployeeId: step.approverEmployeeId,
        approverName: step.approverEmployeeId ? approverNames.get(step.approverEmployeeId)?.fullName ?? null : null })),
      overrides: evaluation?.overrides ?? null,
    }
  }

  private async buildPreview(em: EntityManager, user: JwtPayload, dto: DeductionBulkPreviewDto, lock: boolean) {
    const ctx = await this.context(em, user, dto)
    const mode = dto.selection.mode as DeductionSelectionMode
    const ids = [...new Set(dto.selection.ids)].sort((a, b) => a - b)
    if (!ids.length) bad('DEDUCTION_SELECTION_EMPTY', 'اختر موظفًا أو فريقًا أو قسمًا أو فرعًا')
    const excluded = new Set(dto.selection.excludeEmployeeIds ?? [])
    const repo = em.getRepository(Employee)
    const order = { id: 'ASC' as const }
    const loaded = mode === 'EMPLOYEES' ? await repo.find({ where: { id: In(ids) }, order })
      : mode === 'TEAM' ? await repo.find({ where: { teamId: In(ids), isActive: true }, order })
        : mode === 'DEPARTMENT' ? await repo.find({ where: { departmentId: In([...this.descendants(ctx.facts.departmentRows, new Set(ids))]), isActive: true }, order })
          : await repo.find({ where: { branchId: In(ids), isActive: true }, order })
    // DD-04: من خارج نطاق المُنشئ لهذا النوع لا يُعرض ولا يُعد ولا يُقفل؛ نفسه يبقى ليُرفض بسبب «نفسك»
    const employees = loaded.filter(row => row.id === ctx.facts.employeeId || this.scopedBases(user, ctx, row).length > 0)
    if (employees.length > ctx.settings.bulkMaxEmployees) bad('DEDUCTION_BULK_LIMIT', `الاختيار يضم ${employees.length} موظفًا في نطاقك والحد ${ctx.settings.bulkMaxEmployees} في الدفعة الواحدة`)
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
    // الاختيار بالمعرفات: غير الموجود وخارج النطاق نفس الرد بلا بيانات
    for (const id of mode === 'EMPLOYEES' ? ids.filter(id => !employees.some(row => row.id === id)) : []) {
      outcomes.push({ employee: null, employeeId: id, status: 'DEDUCTION_OUT_OF_SCOPE', message: 'الموظف غير متاح في نطاقك لهذا النوع', evaluation: null })
    }
    const approverNames = await this.employeeBriefs(em, evaluations.flatMap(row => row.steps.map(step => step.approverEmployeeId)))
    const rows = outcomes.map(row => this.previewRow(row.employee, row.employeeId, names, approverNames, row.status, row.message, row.evaluation))
    const totals = { candidates: rows.length, ready: evaluations.length, excluded: rows.filter(row => row.status === 'EXCLUDED').length,
      failed: rows.filter(row => !['READY', 'EXCLUDED'].includes(row.status)).length, escalated: evaluations.filter(row => row.trace.escalated).length,
      totalAmount: sumMoney(evaluations.map(row => row.amount)) }
    const previewHash = deductionPreviewHash({
      typeId: ctx.type.id, typeVersion: ctx.type.version, input: ctx.input, selection: { mode, ids, excluded: [...excluded].sort((a, b) => a - b) },
      rows: rows.map(row => ({ employeeId: row.employeeId, status: row.status, amount: row.amount, basis: row.basis, escalated: row.escalated,
        steps: row.steps.map(step => [step.role, step.status, step.approverEmployeeId]), installments: row.installments })),
    })
    return { ctx, evaluations, ignoredOutOfScope: loaded.length - employees.length, response: { previewHash, type: this.typeView(ctx.type), targetPeriod: ctx.input.targetPeriod,
      currentPeriod: ctx.currentPeriod, selection: { mode, ids, excludeEmployeeIds: [...excluded].sort((a, b) => a - b) }, totals, rows } }
  }

  async preview(user: JwtPayload, dto: DeductionBulkPreviewDto) {
    // المعاينة داخل معاملة لأن قراءة سجل الأجر تتطلبها؛ لا كتابة فيها
    return this.manager.transaction(async em => (await this.buildPreview(em, user, dto, false)).response)
  }

  async bulkSubmit(user: JwtPayload, dto: DeductionBulkSubmitDto) {
    const result = await this.manager.transaction(async em => {
      await this.assertMoneyRequestVisible(em, user, 'PAYROLL_DEDUCTION', 'الخصم')
      const { ctx, evaluations, response, ignoredOutOfScope } = await this.buildPreview(em, user, dto, true)
      if (response.previewHash !== dto.previewHash) {
        return { stale: response }
      }
      if (!evaluations.length) bad('DEDUCTION_BULK_EMPTY', 'لا يوجد موظف جاهز للإرسال في المعاينة')
      const batchRepo = em.getRepository(DeductionBatch)
      const batch = await batchRepo.save(batchRepo.create({ deductionTypeId: ctx.type.id, selectionMode: response.selection.mode, selection: JSON.stringify(response.selection),
        targetPeriod: ctx.input.targetPeriod, previewHash: response.previewHash, candidateCount: response.totals.candidates, createdCount: evaluations.length,
        skippedCount: response.totals.candidates - evaluations.length, result: '{}', createdByUserId: user.sub }))
      const created: Array<{ employeeId: number; requestId: number; amount: string }> = []
      for (const evaluation of evaluations) {
        const saved = await this.persist(em, user, ctx, evaluation, batch.id)
        created.push({ employeeId: evaluation.employee.id, requestId: saved.id, amount: evaluation.amount })
      }
      const skipped = response.rows.filter(row => row.status !== 'READY').map(row => ({ employeeId: row.employeeId, fullName: row.fullName, status: row.status, message: row.message }))
      // سجل تدقيق داخلي فقط (لا يُعاد في أي رد): عدد من في الوحدة خارج نطاق المُنشئ
      batch.result = JSON.stringify({ created, skipped, ignoredOutOfScope })
      await batchRepo.save(batch)
      return { batchId: batch.id, created, skipped, totals: response.totals }
    })
    if ('stale' in result) {
      throw new ConflictException({ code: 'DEDUCTION_PREVIEW_STALE', message: 'تغيّرت نتيجة المعاينة منذ عرضها (راتب أو نطاق أو تكرار أو استبعاد)؛ راجع المعاينة الجديدة ثم أرسل', preview: result.stale })
    }
    return result
  }

  // ===== العرض والصلاحية =====
  private privileged(user: JwtPayload) { return [VIEW, APPROVE, MANAGE].some(perm => userHasPerm(user, perm)) }

  private actorProblem(user: JwtPayload, row: DeductionRequest, step: DeductionChainStep, employee: Pick<Employee, 'branchId'> | undefined | null): string | null {
    if (user.sub === row.creatorUserId) return 'لا يعتمد المُنشئ خصمه'
    if (user.employeeId && user.employeeId === row.employeeId) return 'لا يعتمد الموظف خصمًا عليه'
    if ((DEDUCTION_STRUCTURAL_ROLES as readonly string[]).includes(step.role)) {
      return user.role === 'super_admin' || (step.approverEmployeeId !== null && user.employeeId === step.approverEmployeeId) ? null : `الخطوة الحالية بانتظار ${DEDUCTION_LABELS.roles[step.role]}`
    }
    if (step.role === 'HR') return userHasPerm(user, APPROVE) && this.inBranchScope(user, employee) ? null : 'الخطوة الحالية بانتظار اعتماد الموارد البشرية في نطاق فرع الموظف'
    if (step.role === 'EXECUTIVE') return userHasPerm(user, 'approve.executive') ? null : 'الخطوة الحالية بانتظار الإدارة التنفيذية'
    return 'دور الخطوة غير معروف'
  }

  private snapshotRules(row: DeductionRequest): DeductionTypeRules {
    const snapshot = json<Record<string, any> | null>(row.typeSnapshot, null)
    if (!snapshot) throw new ConflictException({ code: 'DEDUCTION_SNAPSHOT_INVALID', message: 'لقطة نوع الخصم المحفوظة غير صالحة' })
    return deductionTypeRulesFromRow(snapshot)
  }

  private objections(events: DeductionRequestEvent[], requestId: number) {
    const own = events.filter(event => event.requestId === requestId)
    const responses = own.filter(event => event.eventType === 'OBJECTION_RESPONDED')
    return own.filter(event => event.eventType === 'OBJECTION').map(event => {
      const response = responses.find(item => json<{ objectionEventId?: number }>(item.payload, {}).objectionEventId === event.id) ?? null
      return { id: event.id, text: event.reason, createdAt: event.createdAt, byUserId: event.actorUserId,
        response: response ? { text: response.reason, at: response.createdAt, byUserId: response.actorUserId } : null }
    })
  }

  private async openObjection(em: EntityManager, requestId: number) {
    const events = await em.getRepository(DeductionRequestEvent).find({ where: { requestId, eventType: In(OBJECTION_EVENTS) }, order: { id: 'ASC' } })
    return this.objections(events, requestId).find(item => !item.response) ?? null
  }

  private async visibleRows(em: EntityManager, user: JwtPayload, rows: DeductionRequest[], view: string) {
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

  private obligationView(item: EmployeeObligation) {
    return { id: item.id, type: item.type, category: item.category, label: item.label, amount: money(item.amount), status: item.status,
      statusLabel: DEDUCTION_LABELS.obligationStatuses[item.status] ?? item.status, targetPeriod: item.targetPeriod, effectiveDate: item.effectiveDate,
      reservedPayrollRunId: item.reservedPayrollRunId, appliedPayrollRunId: item.appliedPayrollRunId, appliedAmount: money(item.appliedAmount),
      carriedFromObligationId: item.carriedFromObligationId }
  }

  private ledgerTotals(items: EmployeeObligation[]) {
    const debits = items.filter(item => item.type === 'DEBIT')
    // C8 / الخطوة 31: المستهلك في مسير عُكس صرفه لا يُحتسب محصلًا؛ قيد إعادته يُحتسب حين يُستهلك
    const collected = sumMoney(debits.filter(item => item.status === 'APPLIED' && item.payrollReversalRunId == null).map(item => item.appliedAmount ?? item.amount))
    // وقيد العكس اليدوي المستهلك في مسير عُكس صرفه يمثله قيد إعادته (نفس المبلغ) فلا يُحتسب مرتين
    const reversed = sumMoney(items.filter(item => item.type === 'CREDIT' && item.category === DEDUCTION_REVERSAL_OBLIGATION_CATEGORY && item.status !== 'CANCELLED' && item.payrollReversalRunId == null).map(item => item.amount))
    return { collected, reversed, suspended: debits.filter(item => item.status === 'SUSPENDED').length }
  }

  private async views(em: EntityManager, user: JwtPayload, rows: DeductionRequest[], view: string, settings?: Settings) {
    const config = settings ?? await this.settings(em)
    const { visible, steps, people } = await this.visibleRows(em, user, rows, view)
    if (!visible.length) return []
    const ids = visible.map(row => row.id)
    const obligations = await this.inChunks(ids, chunk => em.getRepository(EmployeeObligation).find({ where: { deductionRequestId: In(chunk) }, order: { id: 'ASC' } }))
    const events = await this.inChunks(ids, chunk => em.getRepository(DeductionRequestEvent).find({ where: { requestId: In(chunk), eventType: In(OBJECTION_EVENTS) }, order: { id: 'ASC' } }))
    return visible.map(row => {
      const chain = steps.get(row.id)!, employee = people.get(row.employeeId), step = currentDeductionStep(chain)
      const snapshot = json<Record<string, any>>(row.typeSnapshot, {})
      const canManage = userHasPerm(user, MANAGE) && this.inBranchScope(user, employee)
      const rowObligations = obligations.filter(item => item.deductionRequestId === row.id)
      const totals = this.ledgerTotals(rowObligations)
      const objections = this.objections(events, row.id)
      const open = objections.some(item => !item.response)
      const actorOk = row.status === 'IN_APPROVAL' && !!step && !this.actorProblem(user, row, step, employee)
      const blockedByObjection = config.objectionBlocksApproval && open
      return {
        id: row.id, batchId: row.batchId, status: row.status, statusLabel: DEDUCTION_LABELS.statuses[row.status] ?? row.status, revision: row.revision,
        employee: employee ? { id: employee.id, fullName: employee.fullName, employeeCode: employee.employeeCode, branchId: employee.branchId, departmentId: employee.departmentId ?? null, teamId: employee.teamId ?? null } : { id: row.employeeId },
        type: { id: row.deductionTypeId, version: row.typeVersion, code: snapshot.code ?? null, nameAr: snapshot.nameAr ?? null, category: snapshot.category ?? null,
          categoryLabel: snapshot.category ? (DEDUCTION_LABELS.categories as Record<string, string>)[snapshot.category] ?? null : null,
          calcMethod: row.calcMethod, calcMethodLabel: (DEDUCTION_LABELS.calcMethods as Record<string, string>)[row.calcMethod] ?? row.calcMethod },
        inputValue: decimalText(row.inputValue), estimatedAmount: money(row.estimatedAmount), finalAmount: money(row.finalAmount), amountTrace: json(row.amountTrace, null),
        incidentDate: row.incidentDate, reason: row.reason, attachmentRef: row.attachmentRef, targetPeriod: row.targetPeriod, installments: row.installments,
        creator: { userId: row.creatorUserId, employeeId: row.creatorEmployeeId, name: row.creatorEmployeeId ? people.get(row.creatorEmployeeId)?.fullName ?? null : null,
          basis: row.scopeBasis, basisLabel: (DEDUCTION_LABELS.roles as Record<string, string>)[row.scopeBasis] ?? row.scopeBasis },
        steps: chain.map(item => ({ ...item, fallbackFrom: item.fallbackFrom ?? null, roleLabel: DEDUCTION_LABELS.roles[item.role],
          fallbackFromLabel: item.fallbackFrom ? DEDUCTION_LABELS.roles[item.fallbackFrom] : null,
          approverName: item.approverEmployeeId ? people.get(item.approverEmployeeId)?.fullName ?? null : null })),
        currentStepOrder: step?.order ?? null, escalated: row.escalated, outOfScope: row.outOfScope, overrides: json(row.overrides, null),
        obligations: rowObligations.map(item => this.obligationView(item)),
        collectedAmount: totals.collected, reversedAmount: totals.reversed,
        objections, openObjection: open,
        decisionReason: row.decisionReason, decidedByUserId: row.decidedByUserId, decidedAt: row.decidedAt, createdAt: row.createdAt, updatedAt: row.updatedAt,
        capabilities: {
          canApprove: actorOk && !blockedByObjection,
          canReject: actorOk,
          canAdjust: actorOk && !blockedByObjection && step?.role === 'HR' && canManage,
          canWithdraw: row.status === 'IN_APPROVAL' && row.creatorUserId === user.sub,
          canCancel: ['IN_APPROVAL', 'APPROVED'].includes(row.status) && canManage,
          canRespondObjection: open && (actorOk || (canManage || (userHasPerm(user, APPROVE) && this.inBranchScope(user, employee)))) && user.employeeId !== row.employeeId,
          canReverse: row.status === 'APPROVED' && canManage && dec(totals.collected).compare(dec(totals.reversed)) > 0,
          canDecideSuspended: canManage && totals.suspended > 0,
          blockedByObjection,
        },
      }
    })
  }

  async list(user: JwtPayload, query: DeductionListQueryDto) {
    // الصفحات تُقرأ حتى 500 صف مرئي فعلًا؛ تصفية الرؤية بعد القراءة لا تُسقط الأقدم عن صاحب نطاق محدود
    // «من تاريخ / إلى تاريخ» على تاريخ الطلب بيتفلتر هنا في كل صفحة (قبل حد الـ500) — مش في المتصفح على قائمة ناقصة
    const created = optionalCreatedRange(query)
    const settings = await this.settings(this.manager)
    const result: Array<Record<string, unknown>> = []
    let beforeId: number | null = null
    for (let page = 0; page < 40 && result.length < 500; page++) {
      const qb = this.requests.createQueryBuilder('r').orderBy('r.id', 'DESC').take(500)
      if (beforeId !== null) qb.andWhere('r.id < :beforeId', { beforeId })
      if (created) qb.andWhere('r.createdAt >= CONVERT(datetime2, :createdFrom, 126) AND r.createdAt < CONVERT(datetime2, :createdTo, 126)', { createdFrom: created.start, createdTo: created.end })
      if (query.status) qb.andWhere('r.status = :status', { status: query.status })
      if (query.typeId) qb.andWhere('r.deductionTypeId = :typeId', { typeId: query.typeId })
      if (query.targetPeriod) qb.andWhere('r.targetPeriod = :targetPeriod', { targetPeriod: query.targetPeriod })
      if (query.employeeId) qb.andWhere('r.employeeId = :employeeId', { employeeId: query.employeeId })
      if (query.batchId) qb.andWhere('r.batchId = :batchId', { batchId: query.batchId })
      const rows = await qb.getMany()
      if (!rows.length) break
      result.push(...await this.views(this.manager, user, rows, query.view ?? 'all', settings))
      beforeId = rows[rows.length - 1].id
      if (rows.length < 500) break
    }
    return result.slice(0, 500)
  }

  async detail(user: JwtPayload, id: number) {
    const row = await this.requests.findOneBy({ id })
    if (!row) throw new NotFoundException({ code: 'DEDUCTION_NOT_FOUND', message: 'طلب الخصم غير موجود' })
    const [view] = await this.views(this.manager, user, [row], 'all')
    if (!view) throw new ForbiddenException({ code: 'DEDUCTION_FORBIDDEN', message: 'طلب الخصم خارج نطاق صلاحيتك' })
    const events = await this.manager.getRepository(DeductionRequestEvent).find({ where: { requestId: id }, order: { id: 'ASC' } })
    return { ...view, events: events.map(event => ({ ...event, payload: json(event.payload, null) })) }
  }

  // DD-08: الموظف يرى خصوماته فقط بحالتها واعتراضه والرد عليه، دون ملاحظات المعتمدين الداخلية
  async mine(user: JwtPayload) {
    if (!user.employeeId) return []
    const em = this.manager
    const settings = await this.settings(em)
    const rows = await this.requests.find({ where: { employeeId: user.employeeId }, order: { id: 'DESC' }, take: 200 })
    if (!rows.length) return []
    const ids = rows.map(row => row.id)
    const obligations = await em.getRepository(EmployeeObligation).find({ where: { deductionRequestId: In(ids) }, order: { id: 'ASC' } })
    const events = await em.getRepository(DeductionRequestEvent).find({ where: { requestId: In(ids), eventType: In(OBJECTION_EVENTS) }, order: { id: 'ASC' } })
    const ages = await this.ageMinutes(em, ids)
    const people = await this.employeeBriefs(em, rows.map(row => row.creatorEmployeeId))
    const runIds = [...new Set(obligations.map(item => item.appliedPayrollRunId).filter((id): id is number => !!id))]
    const runs = runIds.length ? new Map((await em.getRepository(PayrollRun).find({ where: { id: In(runIds) }, select: { id: true, period: true } })).map(run => [run.id, run.period])) : new Map<number, string>()
    return rows.map(row => {
      const snapshot = json<Record<string, any>>(row.typeSnapshot, {})
      const mineObligations = obligations.filter(item => item.deductionRequestId === row.id)
      const objections = this.objections(events, row.id).map(item => ({ id: item.id, text: item.text, createdAt: item.createdAt, response: item.response ? { text: item.response.text, at: item.response.at } : null }))
      const open = objections.some(item => !item.response)
      const age = ages.get(row.id) ?? Number.MAX_SAFE_INTEGER
      const windowMinutes = settings.objectionWindowDays * 1440
      return { id: row.id, status: row.status, statusLabel: DEDUCTION_LABELS.statuses[row.status] ?? row.status,
        type: { nameAr: snapshot.nameAr ?? null, categoryLabel: snapshot.category ? (DEDUCTION_LABELS.categories as Record<string, string>)[snapshot.category] ?? null : null,
          calcMethodLabel: (DEDUCTION_LABELS.calcMethods as Record<string, string>)[row.calcMethod] ?? row.calcMethod },
        inputValue: decimalText(row.inputValue), amount: money(row.finalAmount ?? row.estimatedAmount), amountIsFinal: row.finalAmount !== null,
        incidentDate: row.incidentDate, reason: row.reason, targetPeriod: row.targetPeriod, installments: row.installments,
        issuer: { basisLabel: (DEDUCTION_LABELS.roles as Record<string, string>)[row.scopeBasis] ?? row.scopeBasis, name: row.creatorEmployeeId ? people.get(row.creatorEmployeeId)?.fullName ?? null : null },
        obligations: mineObligations.map(item => ({ type: item.type, reversal: item.category === DEDUCTION_REVERSAL_OBLIGATION_CATEGORY, targetPeriod: item.targetPeriod, amount: money(item.amount),
          status: item.status, statusLabel: DEDUCTION_LABELS.obligationStatuses[item.status] ?? item.status,
          appliedPayrollRunId: item.appliedPayrollRunId, appliedPeriod: item.appliedPayrollRunId ? runs.get(item.appliedPayrollRunId) ?? null : null, appliedAmount: money(item.appliedAmount) })),
        objections, canObject: ['IN_APPROVAL', 'APPROVED'].includes(row.status) && !open && windowMinutes > 0 && age <= windowMinutes,
        objectionMinutesLeft: windowMinutes > 0 ? Math.max(0, windowMinutes - age) : 0,
        decisionReason: ['REJECTED', 'CANCELLED'].includes(row.status) ? row.decisionReason : null, createdAt: row.createdAt, decidedAt: row.decidedAt }
    })
  }

  // ===== اعتراض الموظف (DD-08 قاعدة 3) =====
  async object(user: JwtPayload, id: number, dto: DeductionObjectionDto) {
    const text = dto.text?.trim() ?? ''
    if (text.length < 10) bad('DEDUCTION_OBJECTION_TOO_SHORT', 'اكتب نص الاعتراض (10 أحرف على الأقل)')
    await this.manager.transaction(async em => {
      const settings = await this.settings(em)
      const row = await this.lockedRequest(em, id)
      // غير صاحب الخصم يستلم «غير موجود» بلا كشف لوجود طلبات غيره
      if (!user.employeeId || row.employeeId !== user.employeeId) throw new NotFoundException({ code: 'DEDUCTION_NOT_FOUND', message: 'طلب الخصم غير موجود' })
      if (!['IN_APPROVAL', 'APPROVED'].includes(row.status)) throw new ConflictException({ code: 'DEDUCTION_STATE', message: 'الاعتراض متاح على خصم قيد الاعتماد أو معتمد فقط' })
      const age = (await this.ageMinutes(em, [row.id])).get(row.id) ?? Number.MAX_SAFE_INTEGER
      if (settings.objectionWindowDays <= 0 || age > settings.objectionWindowDays * 1440) {
        bad('DEDUCTION_OBJECTION_WINDOW_CLOSED', `مهلة الاعتراض ${settings.objectionWindowDays} أيام من الإخطار انتهت`, { windowDays: settings.objectionWindowDays })
      }
      if (await this.openObjection(em, row.id)) throw new ConflictException({ code: 'DEDUCTION_OBJECTION_EXISTS', message: 'لديك اعتراض قائم على هذا الخصم بانتظار الرد' })
      row.revision += 1; row.updatedAt = new Date()
      await em.getRepository(DeductionRequest).save(row)
      await this.event(em, row.id, 'OBJECTION', user.sub, row.status, row.status, currentDeductionStep(parseDeductionSteps(row.steps))?.order ?? null, text, null)
    })
    return (await this.mine(user)).find(item => item.id === id)
  }

  async respondObjection(user: JwtPayload, id: number, dto: DeductionObjectionDto) {
    const text = dto.text?.trim() ?? ''
    if (text.length < 5) bad('DEDUCTION_OBJECTION_RESPONSE_TOO_SHORT', 'اكتب الرد على الاعتراض (5 أحرف على الأقل)')
    await this.manager.transaction(async em => {
      const row = await this.lockedRequest(em, id)
      const employee = await em.getRepository(Employee).findOneBy({ id: row.employeeId })
      const step = currentDeductionStep(parseDeductionSteps(row.steps))
      const currentApprover = row.status === 'IN_APPROVAL' && !!step && !this.actorProblem(user, row, step, employee)
      const hr = (userHasPerm(user, MANAGE) || userHasPerm(user, APPROVE)) && this.inBranchScope(user, employee)
      if (user.employeeId === row.employeeId || !(currentApprover || hr)) throw new ForbiddenException({ code: 'DEDUCTION_OBJECTION_RESPONSE_FORBIDDEN', message: 'الرد على الاعتراض للمعتمِد الحالي أو الموارد البشرية في نطاق الموظف' })
      const objection = await this.openObjection(em, row.id)
      if (!objection) throw new ConflictException({ code: 'DEDUCTION_OBJECTION_NONE', message: 'لا يوجد اعتراض قائم بانتظار الرد' })
      row.revision += 1; row.updatedAt = new Date()
      await em.getRepository(DeductionRequest).save(row)
      await this.event(em, row.id, 'OBJECTION_RESPONDED', user.sub, row.status, row.status, step?.order ?? null, text, { objectionEventId: objection.id })
    })
    return this.detail(user, id)
  }

  // ===== دورة الاعتماد (DD-06) =====
  private async lockedRequest(em: EntityManager, id: number, expectedRevision?: number) {
    const row = await em.getRepository(DeductionRequest).createQueryBuilder('r').setLock('pessimistic_write').where('r.id = :id', { id }).getOne()
    if (!row) throw new NotFoundException({ code: 'DEDUCTION_NOT_FOUND', message: 'طلب الخصم غير موجود' })
    if (expectedRevision !== undefined && row.revision !== expectedRevision) {
      throw new ConflictException({ code: 'DEDUCTION_REVISION_CHANGED', message: 'تغيّر طلب الخصم منذ فتحه؛ حدّث الشاشة ثم أعد المحاولة' })
    }
    return row
  }

  private async creatorStillInScope(em: EntityManager, row: DeductionRequest, employee: Employee, settings: Settings, rules: DeductionTypeRules) {
    if (!row.creatorEmployeeId) return false
    const creator = { sub: row.creatorUserId, employeeId: row.creatorEmployeeId, role: 'employee', permissions: [] } as unknown as JwtPayload
    const facts = await this.facts(em, creator)
    return this.basesFor(creator, facts, { ...settings, managerCreationEnabled: true }, employee, rules).includes(row.scopeBasis as DeductionCreatorBasis)
  }

  async approve(user: JwtPayload, id: number, dto: DeductionDecisionDto) {
    const notice = await this.manager.transaction(async em => {
      const row = await this.lockedRequest(em, id, dto.expectedRevision)
      await lockPayrollEmployees(em, [row.employeeId])
      if (row.status !== 'IN_APPROVAL') throw new ConflictException({ code: 'DEDUCTION_STATE', message: `لا يمكن اعتماد خصم حالته «${DEDUCTION_LABELS.statuses[row.status] ?? row.status}»` })
      const steps = parseDeductionSteps(row.steps)
      let step = currentDeductionStep(steps)
      if (!step) throw new ConflictException({ code: 'DEDUCTION_CHAIN_INVALID', message: 'لا توجد خطوة اعتماد معلقة' })
      const employee = await em.getRepository(Employee).findOneBy({ id: row.employeeId })
      if (!employee) throw new NotFoundException({ code: 'DEDUCTION_EMPLOYEE_NOT_FOUND', message: 'الموظف غير موجود' })
      const problem = this.actorProblem(user, row, step, employee)
      if (problem) throw new ForbiddenException({ code: 'DEDUCTION_NOT_CURRENT_APPROVER', message: problem })
      const settings = await this.settings(em)
      // DD-08 قاعدة 3: اعتراض الموظف القائم يلزم المعتمِد بالرد قبل الاعتماد
      if (settings.objectionBlocksApproval && await this.openObjection(em, row.id)) {
        throw new ConflictException({ code: 'DEDUCTION_OBJECTION_OPEN', message: 'على الخصم اعتراض من الموظف بلا رد؛ سجّل الرد قبل الاعتماد' })
      }
      const rules = this.snapshotRules(row)
      // DD-04 قاعدة 3/4: النقل خارج نطاق المُنشئ لا يلغي الطلب لكنه يحوّله للموارد البشرية
      if (!row.outOfScope && row.scopeBasis !== 'HR' && !(await this.creatorStillInScope(em, row, employee, settings, rules))) {
        row.outOfScope = true
        for (const pending of steps.filter(item => item.status === 'PENDING' && (DEDUCTION_STRUCTURAL_ROLES as readonly string[]).includes(item.role))) {
          pending.status = 'SKIPPED'; pending.note = 'تُخطّي: خرج الموظف عن نطاق المُنشئ — يوجَّه للموارد البشرية'
        }
        await this.event(em, row.id, 'OUT_OF_SCOPE', user.sub, row.status, row.status, null, 'خرج الموظف عن نطاق المُنشئ بعد الإنشاء', { basis: row.scopeBasis })
        step = currentDeductionStep(steps)!
        if (this.actorProblem(user, row, step, employee)) {
          row.steps = JSON.stringify(steps); row.revision += 1; row.updatedAt = new Date()
          await em.getRepository(DeductionRequest).save(row)
          return 'OUT_OF_SCOPE_ROUTED_TO_HR'
        }
      }
      // إعادة فحص الحدود بالراتب المرجعي الحالي للشهر المستهدف عند كل خطوة
      const salary = await this.salaryBasis(em, employee, row.targetPeriod, settings)
      let trace: DeductionAmountTrace, parts: Part[]
      try {
        trace = computeDeductionAmount({ ...rules, escalationDays: deductionEscalationDaysFor(rules, row.scopeBasis) }, decimalText(row.inputValue), salary)
        parts = await this.priceParts(em, employee, rules, settings, trace, salary, row.targetPeriod, row.installments)
      } catch (error) {
        if (error instanceof HttpException) {
          const body = error.getResponse() as Record<string, unknown>
          throw new BadRequestException({ ...body, message: `تعذر الاعتماد بحدود النوع الحالية: ${body?.message ?? error.message}` })
        }
        throw error
      }
      let amount = sumMoney(parts.map(part => part.amount))
      const reason = dto.reason?.trim() || null
      if (dto.adjustedAmount !== undefined && dto.adjustedAmount !== null && String(dto.adjustedAmount).trim() !== '') {
        if (step.role !== 'HR' || !userHasPerm(user, MANAGE)) throw new ForbiddenException({ code: 'DEDUCTION_ADJUST_FORBIDDEN', message: 'تعديل المبلغ متاح لخطوة الموارد البشرية بصلاحية إدارة الخصومات' })
        if (!reason) bad('DEDUCTION_ADJUST_REASON_REQUIRED', 'اكتب سبب تعديل مبلغ الخصم')
        const adjusted = computeDeductionAmount({ ...rules, calcMethod: 'FIXED_AMOUNT', valueStep: null }, dto.adjustedAmount, salary)
        step.adjustedFrom = amount; step.adjustedTo = adjusted.amount; amount = adjusted.amount
        // المبلغ المعدل عملة: يُقسّط بالمبلغ لا بالوحدات
        parts = splitDeductionInstallments(amount, row.installments).map((value, index) => ({ period: addPayrollMonths(row.targetPeriod, index), amount: value }))
      }
      step.status = 'APPROVED'; step.actedByUserId = user.sub; step.actedAt = new Date().toISOString(); step.reason = reason
      const traces = json<Record<string, any>>(row.amountTrace, {})
      traces.approvals = [...(Array.isArray(traces.approvals) ? traces.approvals : []), { stepOrder: step.order, amount, trace, installments: parts }]
      row.amountTrace = JSON.stringify(traces)
      await this.event(em, row.id, 'STEP_APPROVED', user.sub, 'IN_APPROVAL', 'IN_APPROVAL', step.order, reason, { role: step.role, amount, adjustedFrom: step.adjustedFrom })
      if (!currentDeductionStep(steps)) {
        // DD-06 قاعدة 5 + DD-10: القيد المستحق بأقساطه لفترات متتالية بدءًا من الشهر المستهدف
        const repo = em.getRepository(EmployeeObligation)
        const obligationIds: number[] = []
        for (let index = 0; index < parts.length; index++) {
          const part = parts[index]
          const unitNote = part.units && part.rate ? ` [${part.units} ${rules.calcMethod === 'DAYS_OF_SALARY' ? 'يوم' : 'ساعة'} × ${money(part.rate)}]` : ''
          const label = `${rules.nameAr}${parts.length > 1 ? ` (قسط ${index + 1}/${parts.length})` : ''}${unitNote}: ${row.reason}`
          const saved = await repo.save(repo.create({ employeeId: row.employeeId, type: 'DEBIT', category: TYPED_DEDUCTION_OBLIGATION_CATEGORY,
            amount: Number(part.amount), label: label.slice(0, 300), status: 'PENDING',
            effectiveDate: salaryPayrollPeriodBounds(part.period, settings.cycleStartDay).startDate, sourceRef: `deduction:${row.id}`,
            createdByUserId: row.creatorUserId, deductionRequestId: row.id, targetPeriod: part.period }))
          obligationIds.push(saved.id)
        }
        const closedRunId = await this.closedRun(em, row.employeeId, row.targetPeriod)
        row.status = 'APPROVED'; row.finalAmount = amount; row.obligationIds = JSON.stringify(obligationIds)
        row.decidedByUserId = user.sub; row.decidedAt = new Date()
        await this.event(em, row.id, 'APPROVED', user.sub, 'IN_APPROVAL', 'APPROVED', step.order, reason,
          { amount, obligationIds, parts, ...(closedRunId ? { deferredPastClosedRunId: closedRunId } : {}) })
      }
      row.steps = JSON.stringify(steps); row.revision += 1; row.updatedAt = new Date()
      await em.getRepository(DeductionRequest).save(row)
      return null
    })
    return { ...(await this.detail(user, id)), notice }
  }

  async reject(user: JwtPayload, id: number, dto: DeductionDecisionDto) {
    const reason = dto.reason?.trim() ?? ''
    if (reason.length < 5) bad('DEDUCTION_REASON_REQUIRED', 'سبب الرفض مطلوب (5 أحرف على الأقل)')
    await this.manager.transaction(async em => {
      const row = await this.lockedRequest(em, id, dto.expectedRevision)
      if (row.status !== 'IN_APPROVAL') throw new ConflictException({ code: 'DEDUCTION_STATE', message: `لا يمكن رفض خصم حالته «${DEDUCTION_LABELS.statuses[row.status] ?? row.status}»` })
      const steps = parseDeductionSteps(row.steps), step = currentDeductionStep(steps)
      if (!step) throw new ConflictException({ code: 'DEDUCTION_CHAIN_INVALID', message: 'لا توجد خطوة اعتماد معلقة' })
      const employee = await em.getRepository(Employee).findOneBy({ id: row.employeeId })
      const problem = this.actorProblem(user, row, step, employee)
      if (problem) throw new ForbiddenException({ code: 'DEDUCTION_NOT_CURRENT_APPROVER', message: problem })
      step.status = 'REJECTED'; step.actedByUserId = user.sub; step.actedAt = new Date().toISOString(); step.reason = reason
      Object.assign(row, { status: 'REJECTED', steps: JSON.stringify(steps), decisionReason: reason, decidedByUserId: user.sub, decidedAt: new Date(), revision: row.revision + 1, updatedAt: new Date() })
      await em.getRepository(DeductionRequest).save(row)
      await this.event(em, row.id, 'REJECTED', user.sub, 'IN_APPROVAL', 'REJECTED', step.order, reason, { role: step.role })
    })
    return this.detail(user, id)
  }

  async withdraw(user: JwtPayload, id: number, dto: DeductionDecisionDto) {
    await this.manager.transaction(async em => {
      const row = await this.lockedRequest(em, id, dto.expectedRevision)
      if (row.creatorUserId !== user.sub) throw new ForbiddenException({ code: 'DEDUCTION_WITHDRAW_FORBIDDEN', message: 'سحب الخصم متاح لمُنشئه فقط' })
      if (row.status !== 'IN_APPROVAL') throw new ConflictException({ code: 'DEDUCTION_STATE', message: 'السحب متاح قبل اكتمال الاعتماد فقط؛ بعده يُلغى من الموارد البشرية' })
      const reason = dto.reason?.trim() || null
      Object.assign(row, { status: 'WITHDRAWN', decisionReason: reason, decidedByUserId: user.sub, decidedAt: new Date(), revision: row.revision + 1, updatedAt: new Date() })
      await em.getRepository(DeductionRequest).save(row)
      await this.event(em, row.id, 'WITHDRAWN', user.sub, 'IN_APPROVAL', 'WITHDRAWN', null, reason, null)
    })
    return this.detail(user, id)
  }

  // DD-12: الإلغاء بسبب موثق قبل الاستهلاك؛ المحجوز في مسير معتمد يحتاج إعادة فتح المسير أولًا، والمستهلك يُعكس بقيد موجب
  async cancel(user: JwtPayload, id: number, dto: DeductionDecisionDto) {
    if (!userHasPerm(user, MANAGE)) throw new ForbiddenException({ code: 'DEDUCTION_CANCEL_FORBIDDEN', message: 'إلغاء الخصم يتطلب صلاحية إدارة الخصومات' })
    await this.manager.transaction(async em => {
      const settings = await this.settings(em)
      const reason = dto.reason?.trim() ?? ''
      if (reason.length < settings.reasonMinLength) bad('DEDUCTION_REASON_TOO_SHORT', `سبب الإلغاء لا يقل عن ${settings.reasonMinLength} حرفًا`, { minLength: settings.reasonMinLength })
      const row = await this.lockedRequest(em, id, dto.expectedRevision)
      const employee = await em.getRepository(Employee).findOneBy({ id: row.employeeId })
      if (!this.inBranchScope(user, employee)) throw new ForbiddenException({ code: 'DEDUCTION_FORBIDDEN', message: 'طلب الخصم خارج نطاق فرعك' })
      if (!['IN_APPROVAL', 'APPROVED'].includes(row.status)) throw new ConflictException({ code: 'DEDUCTION_STATE', message: `لا يمكن إلغاء خصم حالته «${DEDUCTION_LABELS.statuses[row.status] ?? row.status}»` })
      await lockPayrollEmployees(em, [row.employeeId])
      let cancelledObligationIds: number[] = [], appliedObligationIds: number[] = []
      if (row.status === 'APPROVED') {
        // قيود الخصم المدينة فقط؛ قيد العكس الموجب لا يُلغى بإلغاء الطلب
        const obligations = (await em.getRepository(EmployeeObligation).findBy({ deductionRequestId: row.id })).filter(item => item.type === 'DEBIT')
        const reserved = obligations.find(item => item.status === 'PENDING' && item.reservedPayrollRunId != null)
        if (reserved) throw new ConflictException({ code: 'DEDUCTION_RESERVED', message: `أحد أقساط الخصم محجوز في مسير معتمد (#${reserved.reservedPayrollRunId})؛ أعد فتح المسير أو اصرفه أولًا` })
        const pending = obligations.filter(item => item.status === 'PENDING' || item.status === 'SUSPENDED')
        appliedObligationIds = obligations.filter(item => item.status === 'APPLIED').map(item => item.id)
        if (!pending.length) throw new ConflictException({ code: 'DEDUCTION_CONSUMED', message: 'الخصم استُهلك بالكامل في مسير مصروف؛ استخدم «عكس الخصم» بقيد موجب في المسير التالي' })
        const updated = await em.query(`UPDATE [employee_obligations] SET [status]='CANCELLED' OUTPUT INSERTED.[id]
          WHERE [deductionRequestId]=@0 AND [type]='DEBIT' AND [status] IN ('PENDING','SUSPENDED') AND [reservedPayrollRunId] IS NULL`, [row.id])
        if (updated.length !== pending.length) throw new ConflictException({ code: 'DEDUCTION_RESERVED', message: 'تغيّرت أقساط الخصم أثناء الإلغاء؛ أعد المحاولة' })
        cancelledObligationIds = updated.map((item: { id: number }) => Number(item.id))
      }
      const fromStatus = row.status
      Object.assign(row, { status: 'CANCELLED', decisionReason: reason, decidedByUserId: user.sub, decidedAt: new Date(), revision: row.revision + 1, updatedAt: new Date() })
      await em.getRepository(DeductionRequest).save(row)
      await this.event(em, row.id, 'CANCELLED', user.sub, fromStatus, 'CANCELLED', null, reason, { cancelledObligationIds, appliedObligationIds })
    })
    return this.detail(user, id)
  }

  // DD-12 قاعدة 3/4: عكس المستهلك في مسير مصروف بقيد موجب (كلي أو جزئي) يُستهلك في المسير التالي؛ المسير المصروف لا يتغير
  async reverse(user: JwtPayload, id: number, dto: DeductionReverseDto) {
    if (!userHasPerm(user, MANAGE)) throw new ForbiddenException({ code: 'DEDUCTION_REVERSE_FORBIDDEN', message: 'عكس الخصم يتطلب صلاحية إدارة الخصومات' })
    await this.manager.transaction(async em => {
      const settings = await this.settings(em)
      const reason = dto.reason?.trim() ?? ''
      if (reason.length < settings.reasonMinLength) bad('DEDUCTION_REASON_TOO_SHORT', `سبب العكس لا يقل عن ${settings.reasonMinLength} حرفًا`, { minLength: settings.reasonMinLength })
      const row = await this.lockedRequest(em, id, dto.expectedRevision)
      const employee = await em.getRepository(Employee).findOneBy({ id: row.employeeId })
      if (!this.inBranchScope(user, employee)) throw new ForbiddenException({ code: 'DEDUCTION_FORBIDDEN', message: 'طلب الخصم خارج نطاق فرعك' })
      if (row.status !== 'APPROVED') throw new ConflictException({ code: 'DEDUCTION_STATE', message: 'العكس متاح لخصم معتمد استُهلك في مسير مصروف' })
      await lockPayrollEmployees(em, [row.employeeId])
      const obligations = await em.getRepository(EmployeeObligation).findBy({ deductionRequestId: row.id })
      const totals = this.ledgerTotals(obligations)
      const remaining = dec(totals.collected).subtract(dec(totals.reversed))
      if (remaining.compare(PayrollDecimal.from('0')) <= 0) throw new ConflictException({ code: 'DEDUCTION_NOTHING_TO_REVERSE', message: 'لا يوجد مبلغ مستهلك غير معكوس لهذا الخصم' })
      const amount = dto.amount !== undefined && String(dto.amount).trim() !== '' ? deductionDecimal(dto.amount, 'مبلغ العكس', { scale: 2 }) : remaining.format(2, 'DOWN')
      if (dec(amount).compare(remaining) > 0) bad('DEDUCTION_REVERSAL_ABOVE_APPLIED', `مبلغ العكس ${money(amount)} يتجاوز المستهلك غير المعكوس ${remaining.format(2, 'DOWN')}`, { limit: remaining.format(2, 'DOWN') })
      const appliedRunIds = [...new Set(obligations.filter(item => item.type === 'DEBIT' && item.status === 'APPLIED' && item.appliedPayrollRunId).map(item => item.appliedPayrollRunId as number))]
      const runPeriods = appliedRunIds.length ? (await em.getRepository(PayrollRun).find({ where: { id: In(appliedRunIds) }, select: { id: true, period: true } })).map(run => run.period).sort() : []
      const period = payrollPeriodForDate(this.today(), settings.cycleStartDay)
      const snapshot = json<Record<string, any>>(row.typeSnapshot, {})
      const repo = em.getRepository(EmployeeObligation)
      const saved = await repo.save(repo.create({ employeeId: row.employeeId, type: 'CREDIT', category: DEDUCTION_REVERSAL_OBLIGATION_CATEGORY, amount: Number(money(amount)),
        label: `عكس ${snapshot.nameAr ?? 'خصم'} #${row.id}${runPeriods.length ? ` — مسير ${runPeriods.join('، ')}` : ''}: ${reason}`.slice(0, 300), status: 'PENDING',
        effectiveDate: salaryPayrollPeriodBounds(period, settings.cycleStartDay).startDate, sourceRef: `deduction-reversal:${row.id}`,
        createdByUserId: user.sub, deductionRequestId: row.id, targetPeriod: period }))
      row.revision += 1; row.updatedAt = new Date()
      await em.getRepository(DeductionRequest).save(row)
      await this.event(em, row.id, 'REVERSED', user.sub, row.status, row.status, null, reason,
        { amount: money(amount), obligationId: saved.id, collected: totals.collected, reversedBefore: totals.reversed, targetPeriod: period, runPeriods })
    })
    return this.detail(user, id)
  }

  // DD-11 قاعدة 4: قرار الموارد البشرية على قسط معلق بعد تجاوز حد الترحيل: استئناف لشهر محدد أو إسقاط موثق
  async decideSuspended(user: JwtPayload, obligationId: number, dto: DeductionObligationDecisionDto) {
    if (!userHasPerm(user, MANAGE)) throw new ForbiddenException({ code: 'DEDUCTION_DECISION_FORBIDDEN', message: 'قرار القسط المعلق يتطلب صلاحية إدارة الخصومات' })
    const requestId = await this.manager.transaction(async em => {
      const settings = await this.settings(em)
      const reason = dto.reason?.trim() ?? ''
      if (reason.length < settings.reasonMinLength) bad('DEDUCTION_REASON_TOO_SHORT', `سبب القرار لا يقل عن ${settings.reasonMinLength} حرفًا`, { minLength: settings.reasonMinLength })
      const obligation = await em.getRepository(EmployeeObligation).createQueryBuilder('o').setLock('pessimistic_write').where('o.id = :id', { id: obligationId }).getOne()
      if (!obligation?.deductionRequestId) throw new NotFoundException({ code: 'DEDUCTION_OBLIGATION_NOT_FOUND', message: 'قسط الخصم المصنف غير موجود' })
      const row = await this.lockedRequest(em, obligation.deductionRequestId)
      const employee = await em.getRepository(Employee).findOneBy({ id: row.employeeId })
      if (!this.inBranchScope(user, employee)) throw new ForbiddenException({ code: 'DEDUCTION_FORBIDDEN', message: 'الخصم خارج نطاق فرعك' })
      if (obligation.status !== 'SUSPENDED') throw new ConflictException({ code: 'DEDUCTION_OBLIGATION_STATE', message: 'القرار متاح لقسط معلق فقط' })
      await lockPayrollEmployees(em, [row.employeeId])
      const currentPeriod = payrollPeriodForDate(this.today(), settings.cycleStartDay)
      if (dto.action === 'RESUME') {
        const target = dto.targetPeriod ?? currentPeriod
        if (target < currentPeriod) bad('DEDUCTION_PERIOD_PAST', `الاستئناف لشهر ${currentPeriod} أو بعده`)
        const closed = await this.closedRun(em, row.employeeId, target)
        if (closed) bad('DEDUCTION_PERIOD_CLOSED', `مسير ${target} للموظف معتمد أو مصروف (#${closed})؛ اختر شهرًا مفتوحًا`, { runId: closed })
        await em.getRepository(EmployeeObligation).update({ id: obligation.id, status: 'SUSPENDED' }, { status: 'PENDING', targetPeriod: target,
          effectiveDate: salaryPayrollPeriodBounds(target, settings.cycleStartDay).startDate })
        await this.event(em, row.id, 'CARRY_RESUMED', user.sub, row.status, row.status, null, reason, { obligationId: obligation.id, targetPeriod: target, amount: money(obligation.amount) })
      } else {
        await em.getRepository(EmployeeObligation).update({ id: obligation.id, status: 'SUSPENDED' }, { status: 'CANCELLED' })
        await this.event(em, row.id, 'CARRY_DROPPED', user.sub, row.status, row.status, null, reason, { obligationId: obligation.id, amount: money(obligation.amount) })
      }
      row.revision += 1; row.updatedAt = new Date()
      await em.getRepository(DeductionRequest).save(row)
      return row.id
    })
    return this.detail(user, requestId)
  }

  // ===== مهلة الخطوة (DD-06 قاعدة 1): تُشغَّل دوريًا من TypedDeductionsScheduler =====
  async processSla(now: Date = new Date()) {
    const result = { checked: 0, escalated: 0, rejected: 0, breached: 0 }
    const settings = await this.settings(this.manager)
    if (settings.stepSlaHours <= 0) return result
    const candidates = await this.requests.find({ where: { status: 'IN_APPROVAL' }, order: { id: 'ASC' }, take: 1000 })
    if (!candidates.length) return result
    const ages = await this.ageMinutes(this.manager, candidates.map(row => row.id))
    const limitMs = settings.stepSlaHours * 3600000
    for (const candidate of candidates) {
      result.checked++
      let chain: DeductionChainStep[]
      try { chain = parseDeductionSteps(candidate.steps) } catch { continue }
      if (!currentDeductionStep(chain)) continue
      // لحظة الإنشاء الحقيقية (UTC) من عمر SQL؛ الساعة المعطاة now تسمح بمحاكاة مرور الوقت في الاختبار
      const createdMs = Date.now() - (ages.get(candidate.id) ?? 0) * 60000
      if (now.getTime() - deductionStepWaitingSince(chain, new Date(createdMs)).getTime() < limitMs) continue
      const outcome = await this.manager.transaction(async em => {
        const row = await this.lockedRequest(em, candidate.id)
        if (row.status !== 'IN_APPROVAL' || row.revision !== candidate.revision) return null
        const steps = parseDeductionSteps(row.steps), step = currentDeductionStep(steps)
        if (!step) return null
        const label = DEDUCTION_LABELS.roles[step.role]
        const at = now.toISOString()
        if (settings.slaAction === 'AUTO_REJECT') {
          const reason = `رفض آلي: انتهت مهلة ${settings.stepSlaHours} ساعة على خطوة ${label} دون قرار`
          step.status = 'REJECTED'; step.actedAt = at; step.reason = reason
          Object.assign(row, { status: 'REJECTED', steps: JSON.stringify(steps), decisionReason: reason, decidedByUserId: null, decidedAt: new Date(), revision: row.revision + 1, updatedAt: new Date() })
          await em.getRepository(DeductionRequest).save(row)
          await this.event(em, row.id, 'REJECTED', null, 'IN_APPROVAL', 'REJECTED', step.order, reason, { role: step.role, sla: true })
          return 'rejected' as const
        }
        if (settings.slaAction === 'ESCALATE' && step.role !== 'HR') {
          // خطوة الموارد البشرية الأخيرة لا تُتخطى أبدًا؛ غيرها يُصعَّد للخطوة التالية مع تسجيل التصعيد
          step.status = 'SKIPPED'; step.actedAt = at; step.note = `صُعِّد آليًا: انتهت مهلة ${settings.stepSlaHours} ساعة دون قرار ${label}`
          Object.assign(row, { steps: JSON.stringify(steps), revision: row.revision + 1, updatedAt: new Date() })
          await em.getRepository(DeductionRequest).save(row)
          await this.event(em, row.id, 'SLA_ESCALATED', null, 'IN_APPROVAL', 'IN_APPROVAL', step.order, step.note, { role: step.role, hours: settings.stepSlaHours, nextStepOrder: currentDeductionStep(steps)?.order ?? null })
          return 'escalated' as const
        }
        const logged = await em.getRepository(DeductionRequestEvent).count({ where: { requestId: row.id, eventType: 'SLA_BREACHED', stepOrder: step.order } })
        if (logged) return null
        await this.event(em, row.id, 'SLA_BREACHED', null, 'IN_APPROVAL', 'IN_APPROVAL', step.order, `تجاوزت خطوة ${label} مهلة ${settings.stepSlaHours} ساعة`, { role: step.role, action: settings.slaAction })
        return 'breached' as const
      })
      if (outcome) result[outcome]++
    }
    return result
  }

  // ===== تقارير الخصومات (DD-13): من الدفتر واللقطات، بنطاق المستخدم =====
  async reports(user: JwtPayload, query: DeductionReportQueryDto) {
    const em = this.manager
    const settings = await this.settings(em)
    const today = this.today(), currentPeriod = payrollPeriodForDate(today, settings.cycleStartDay)
    const toPeriod = query.toPeriod ?? currentPeriod
    const fromPeriod = query.fromPeriod ?? addPayrollMonths(toPeriod, -5)
    if (fromPeriod > toPeriod) bad('DEDUCTION_REPORT_RANGE_INVALID', 'بداية فترة التقرير بعد نهايتها')
    const qb = this.requests.createQueryBuilder('r').orderBy('r.id', 'DESC').take(5000)
    if (query.typeId) qb.andWhere('r.deductionTypeId = :typeId', { typeId: query.typeId })
    const { visible, steps, people } = await this.visibleRows(em, user, await qb.getMany(), 'all')
    const ids = visible.map(row => row.id)
    const obligations = await this.inChunks(ids, chunk => em.getRepository(EmployeeObligation).find({ where: { deductionRequestId: In(chunk) }, order: { id: 'ASC' } }))
    const events = await this.inChunks(ids, chunk => em.getRepository(DeductionRequestEvent).find({ where: { requestId: In(chunk), eventType: In([...OBJECTION_EVENTS, 'SLA_ESCALATED']) }, order: { id: 'ASC' } }))
    const ages = await this.ageMinutes(em, ids)
    const byId = new Map(visible.map(row => [row.id, row]))
    const snapshots = new Map(visible.map(row => [row.id, json<Record<string, any>>(row.typeSnapshot, {})]))
    const personName = (id: number) => people.get(id)?.fullName ?? `#${id}`

    // 1) بحسب النوع والجهة المُنزِلة لكل فترة
    const groups = new Map<string, { period: string; typeId: number; typeCode: string | null; typeName: string | null; categoryLabel: string | null; basis: string; basisLabel: string;
      requestIds: Set<number>; due: unknown[]; collected: unknown[]; reversed: unknown[] }>()
    for (const item of obligations) {
      const row = byId.get(item.deductionRequestId ?? -1)
      if (!row || !item.targetPeriod || item.targetPeriod < fromPeriod || item.targetPeriod > toPeriod || item.status === 'CANCELLED') continue
      const snapshot = snapshots.get(row.id)!
      const key = `${item.targetPeriod}|${row.deductionTypeId}|${row.scopeBasis}`
      const group = groups.get(key) ?? { period: item.targetPeriod, typeId: row.deductionTypeId, typeCode: snapshot.code ?? null, typeName: snapshot.nameAr ?? null,
        categoryLabel: snapshot.category ? (DEDUCTION_LABELS.categories as Record<string, string>)[snapshot.category] ?? null : null,
        basis: row.scopeBasis, basisLabel: (DEDUCTION_LABELS.roles as Record<string, string>)[row.scopeBasis] ?? row.scopeBasis, requestIds: new Set<number>(),
        due: [] as unknown[], collected: [] as unknown[], reversed: [] as unknown[] }
      if (item.type === 'DEBIT') {
        group.requestIds.add(row.id)
        // C8: قيد الإعادة بعد عكس صرف المسير ليس استحقاقًا جديدًا، والمستهلك المعكوس ليس محصلًا
        if (item.carriedFromObligationId == null && item.payrollReversalOfObligationId == null) group.due.push(item.amount)
        if (item.status === 'APPLIED' && item.payrollReversalRunId == null) group.collected.push(item.appliedAmount ?? item.amount)
      } else if (item.category === DEDUCTION_REVERSAL_OBLIGATION_CATEGORY && item.payrollReversalRunId == null) group.reversed.push(item.amount)
      groups.set(key, group)
    }
    const byType = [...groups.values()].sort((a, b) => a.period.localeCompare(b.period) || (a.typeCode ?? '').localeCompare(b.typeCode ?? '') || a.basis.localeCompare(b.basis))
      .map(({ requestIds, due, collected, reversed, ...group }) => ({ ...group, requests: requestIds.size, due: sumMoney(due), collected: sumMoney(collected), reversed: sumMoney(reversed) }))

    // 2) بحسب الموظف: تكرار 3/6/12 شهرًا ووسم من تجاوز الحد خلال 90 يومًا
    const monthsAgo = (months: number) => { const date = new Date(`${today}T00:00:00Z`); date.setUTCMonth(date.getUTCMonth() - months); return date.toISOString().slice(0, 10) }
    const since = { last3: monthsAgo(3), last6: monthsAgo(6), last12: monthsAgo(12), last90: new Date(Date.parse(`${today}T00:00:00Z`) - 90 * 86400000).toISOString().slice(0, 10) }
    const employeeGroups = new Map<number, { last3: unknown[]; last6: unknown[]; last12: unknown[]; last90: number; types: Set<string> }>()
    for (const row of visible.filter(item => ['IN_APPROVAL', 'APPROVED'].includes(item.status) && item.incidentDate >= since.last12)) {
      const entry = employeeGroups.get(row.employeeId) ?? { last3: [], last6: [], last12: [], last90: 0, types: new Set<string>() }
      const amount = row.finalAmount ?? row.estimatedAmount
      for (const key of ['last3', 'last6', 'last12'] as const) if (row.incidentDate >= since[key]) entry[key].push(amount)
      if (row.incidentDate >= since.last90) entry.last90++
      entry.types.add(snapshots.get(row.id)?.nameAr ?? snapshots.get(row.id)?.code ?? `#${row.deductionTypeId}`)
      employeeGroups.set(row.employeeId, entry)
    }
    const byEmployee = [...employeeGroups.entries()].map(([employeeId, entry]) => ({ employeeId, fullName: personName(employeeId), employeeCode: people.get(employeeId)?.employeeCode ?? null,
      last3: { count: entry.last3.length, total: sumMoney(entry.last3) }, last6: { count: entry.last6.length, total: sumMoney(entry.last6) },
      last12: { count: entry.last12.length, total: sumMoney(entry.last12) }, last90Count: entry.last90, repeatFlag: entry.last90 >= settings.repeatThreshold, types: [...entry.types] }))
      .sort((a, b) => b.last12.count - a.last12.count || a.employeeId - b.employeeId)

    // 3) المرحّل والمعلّق والقيود بلا مسير
    const obligationById = new Map(obligations.map(item => [item.id, item]))
    const carryDepth = (item: EmployeeObligation) => {
      let depth = 0, current: EmployeeObligation | undefined = item
      const seen = new Set<number>()
      while (current?.carriedFromObligationId && !seen.has(current.id) && depth < 100) { seen.add(current.id); depth++; current = obligationById.get(current.carriedFromObligationId) }
      return depth
    }
    const openDebits = obligations.filter(item => item.type === 'DEBIT' && ['PENDING', 'SUSPENDED'].includes(item.status))
    const employeeIds = [...new Set(openDebits.map(item => item.employeeId))]
    const lastRuns = new Map<number, string>()
    for (const chunk of employeeIds.length ? await this.inChunks(employeeIds, async part => [part]) : []) {
      const rows = await em.query(`SELECT i.[employeeId], MAX(r.[period]) AS [lastPeriod] FROM [payroll_items] i INNER JOIN [payroll_runs] r ON r.[id]=i.[runId]
        WHERE r.[status] IN ('APPROVED','PAID') AND i.[employeeId] IN (${chunk.map((_, index) => `@${index}`).join(',')})
          AND ${payrollLineNotReversedSql('r.[id]', 'i.[employeeId]')} GROUP BY i.[employeeId]`, chunk)
      for (const row of rows) lastRuns.set(Number(row.employeeId), String(row.lastPeriod))
    }
    const ledgerRow = (item: EmployeeObligation, reason: string | null = null) => {
      const row = byId.get(item.deductionRequestId ?? -1)
      return { obligationId: item.id, requestId: item.deductionRequestId, employeeId: item.employeeId, fullName: personName(item.employeeId), employeeCode: people.get(item.employeeId)?.employeeCode ?? null,
        typeName: row ? snapshots.get(row.id)?.nameAr ?? null : null, amount: money(item.amount), targetPeriod: item.targetPeriod, status: item.status,
        statusLabel: DEDUCTION_LABELS.obligationStatuses[item.status] ?? item.status, carriedFromObligationId: item.carriedFromObligationId, carryDepth: carryDepth(item), reason }
    }
    const ledger = {
      carried: openDebits.filter(item => item.status === 'PENDING' && item.carriedFromObligationId != null).map(item => ledgerRow(item)),
      suspended: openDebits.filter(item => item.status === 'SUSPENDED').map(item => ledgerRow(item)),
      withoutRun: openDebits.filter(item => item.status === 'PENDING' && item.carriedFromObligationId == null && !!item.targetPeriod && item.targetPeriod < currentPeriod)
        .flatMap(item => {
          const person = people.get(item.employeeId), last = lastRuns.get(item.employeeId)
          if (person && !person.isActive) return [ledgerRow(item, 'الموظف غير نشط — يُحال للتسوية النهائية')]
          if (!last || last < item.targetPeriod!) return [ledgerRow(item, 'لم يدخل الموظف مسيرًا معتمدًا منذ الشهر المستهدف')]
          return [ledgerRow(item, `دخل الموظف مسير ${last} دون استهلاك القسط؛ راجع الحجز أو تاريخ السريان`)]
        }),
    }

    // 4) زمن دورة الاعتماد لكل دور ونسبة التصعيد
    const hoursByRole = new Map<string, number[]>()
    for (const row of visible) {
      let start = Date.now() - (ages.get(row.id) ?? 0) * 60000
      for (const step of steps.get(row.id) ?? []) {
        const acted = step.actedAt ? Date.parse(step.actedAt) : NaN
        if (!Number.isFinite(acted)) continue
        if (step.status === 'APPROVED' || step.status === 'REJECTED') hoursByRole.set(step.role, [...(hoursByRole.get(step.role) ?? []), Math.max(0, acted - start) / 3600000])
        start = Math.max(start, acted)
      }
    }
    const cycleTime = [...hoursByRole.entries()].map(([role, hours]) => ({ role, roleLabel: (DEDUCTION_LABELS.roles as Record<string, string>)[role] ?? role, acted: hours.length,
      avgHours: (hours.reduce((sum, value) => sum + value, 0) / hours.length).toFixed(2), maxHours: Math.max(...hours).toFixed(2) }))
    const escalatedCount = visible.filter(row => row.escalated).length
    const escalation = { total: visible.length, escalated: escalatedCount, slaEscalations: events.filter(event => event.eventType === 'SLA_ESCALATED').length,
      ratePct: visible.length ? (escalatedCount * 100 / visible.length).toFixed(2) : '0.00' }

    // 5) الاعتراضات ونتائجها
    const objections = visible.flatMap(row => this.objections(events, row.id).map(item => ({ requestId: row.id, employeeId: row.employeeId, fullName: personName(row.employeeId),
      typeName: snapshots.get(row.id)?.nameAr ?? null, requestStatus: row.status, text: item.text, createdAt: item.createdAt, response: item.response?.text ?? null, respondedAt: item.response?.at ?? null })))

    // 6) المطابقة: سطور الخصم المصنفة المحفوظة في المسيرات المعتمدة/المصروفة = قيود الدفتر المحجوزة/المستهلكة بها
    const reconciliation: Array<{ runId: number; runName: string | null; period: string; status: string; lines: number; breakdownTyped: string; ledgerTyped: string; difference: string }> = []
    if (this.privileged(user)) {
      const scope = branchScopeOf(user)
      const runs = (await em.getRepository(PayrollRun).find({ where: { status: In(['APPROVED', 'PAID']) }, order: { id: 'ASC' } })).filter(run => run.period >= fromPeriod && run.period <= toPeriod)
      for (const run of runs) {
        const items = await em.getRepository(PayrollItem).find({ where: { runId: run.id }, select: { id: true, employeeId: true, breakdown: true } })
        const branches = scope === null ? null : await this.employeeBriefs(em, items.map(item => item.employeeId))
        const inScope = (employeeId: number) => scope === null || branches?.get(employeeId)?.branchId === scope
        const lines = items.filter(item => inScope(item.employeeId)).flatMap(item => {
          try {
            const breakdown = JSON.parse(item.breakdown || '{}')
            return (Array.isArray(breakdown.obligationLines) ? breakdown.obligationLines : []).filter((line: any) => line?.typed && line.type === 'DEBIT' && Number(line.collected) > 0)
          } catch { return [] }
        }) as Array<{ id: number; collected: number }>
        const ledgerRows = (await em.getRepository(EmployeeObligation).find({ where: run.status === 'PAID' ? { appliedPayrollRunId: run.id, type: 'DEBIT' } : { reservedPayrollRunId: run.id, type: 'DEBIT', status: 'PENDING' } }))
          .filter(item => item.deductionRequestId != null && inScope(item.employeeId))
        if (!lines.length && !ledgerRows.length) continue
        const breakdownTyped = sumMoney(lines.map(line => line.collected))
        const ledgerTyped = run.status === 'PAID' ? sumMoney(ledgerRows.map(item => item.appliedAmount ?? 0))
          : sumMoney(lines.filter(line => ledgerRows.some(item => item.id === line.id)).map(line => line.collected))
        reconciliation.push({ runId: run.id, runName: run.name ?? null, period: run.period, status: run.status, lines: lines.length, breakdownTyped, ledgerTyped,
          difference: dec(breakdownTyped).subtract(dec(ledgerTyped)).format(2, 'DOWN') })
      }
    }
    return { generatedAt: new Date().toISOString(), currentPeriod, fromPeriod, toPeriod, repeatThreshold: settings.repeatThreshold,
      byType, byEmployee, ledger, cycleTime, escalation, objections, reconciliation }
  }
}
