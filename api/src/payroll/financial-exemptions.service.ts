import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { createHash } from 'node:crypto'
import { EntityManager, In, Repository } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, inBranchScope, userHasPerm } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import { EmployeeObligation } from '../requests/entities/financial.entities'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import type { ExemptionAttachmentDto, ExemptionDecisionDto, ExemptionInputDto, ExemptionListQueryDto, ExemptionReportQueryDto } from './financial-exemptions.dto'
import { PayrollFinancialExemption, PayrollFinancialExemptionEvent } from './financial-exemptions.entities'
import {
  applyFinancialExemptions,
  EXEMPTION_LABELS,
  EXEMPTION_LIVE_STATUSES,
  EXEMPTION_PROTECTED_TYPED_CATEGORIES,
  EXEMPTION_SETTING_KEYS,
  exemptionAttachmentThreshold,
  exemptionComponentOf,
  exemptionEnumSetting,
  exemptionLoanLines,
  exemptionNeedsAttachment,
  exemptionNumericSetting,
  exemptionOverlap,
  exemptionReasonIssue,
  exemptionTargetLabel,
  isAttendanceComponent,
  normalizeExemptionDisposition,
  normalizeExemptionTarget,
  type ExemptionDebitInput,
  type ExemptionDisposition,
  type ExemptionGrantorBasis,
  type ExemptionLine,
  type ExemptionProtectedItem,
  type ExemptionRule,
  type ExemptionTarget,
  type FinancialExemptionBreakdown,
} from './financial-exemptions'
import { exemptionRuleOf, financialExemptionsOf, readExemptionObligationFacts, recordExemptionEvent } from './payroll-financial-exemption-ledger'
import { roundPayrollMoney } from './payroll-money'
import { parsePayrollRunPolicySnapshot } from './payroll-policy-snapshot'
import { lockPayrollEmployees } from './payroll-settlement-boundary'
import { postedReversalPairs } from './payroll-reversal-ledger'
import { payrollLineNotReversedSql } from './payroll-reversal-sql'
import { PayrollItem, PayrollRun, PayrollRunMember } from './payroll.entities'
import { DeductionRequest, DeductionRequestEvent, DeductionType } from './typed-deductions.entities'
import { type Facts as OrgFacts, TypedDeductionsService } from './typed-deductions.service'

// الخطوة 26 — الإعفاء المالي في مسير (SRS EX-01..08): المنح بمعاينة، ونطاق المانح وفصل المهام، والحدود وتجاوزها الموثق،
// ودورة الاعتماد والإلغاء، وقائمة المسير والقسيمة وتقرير الحوكمة. التطبيق المالي نفسه في حساب المسير (payroll.service) عبر الإعفاءات النشطة.
const VIEW = 'financial_exemption.view', GRANT = 'financial_exemption.grant', APPROVE = 'financial_exemption.approve', OVERRIDE = 'financial_exemption.override_limits'
// C8 / الخطوة 31: إعفاء (بالاسم المستعار e) ليس قرار حضور أو «كل الخصومات» على بند نُفّذ عكس صرفه — ذلك القرار نُقل للمسير التكميلي أو يُمنح عليه
const EXEMPTION_NOT_REVERSED_DECISION_SQL = `${payrollLineNotReversedSql('e.[runId]', 'e.[employeeId]')}
  OR (e.[scopeKind]<>'ALL_DEDUCTIONS' AND ISNULL(e.[targetKind], '') NOT IN ('LATENESS','SHORTFALL','ABSENCE','LATENESS_DAY','SHORTFALL_DAY','ABSENCE_DAY'))`
const RUN_STATUS_LABELS: Record<string, string> = { DRAFT: 'مسودة', CALCULATED: 'محسوب', APPROVED: 'معتمد', PAID: 'مصروف', CANCELLED: 'ملغى' }
const bad = (code: string, message: string, details: Record<string, unknown> = {}): never => { throw new BadRequestException({ code, message, ...details }) }
const forbidden = (code: string, message: string, details: Record<string, unknown> = {}): never => { throw new ForbiddenException({ code, message, ...details }) }
const conflict = (code: string, message: string, details: Record<string, unknown> = {}): never => { throw new ConflictException({ code, message, ...details }) }
const money = (value: unknown) => value === null || value === undefined ? null : roundPayrollMoney(Number(value)).toFixed(2)
const cents = (value: unknown) => Math.round(roundPayrollMoney(Number(value)) * 100)
const sumLines = (lines: ExemptionLine[]) => (lines.reduce((total, line) => total + cents(line.exemptedAmount), 0) / 100).toFixed(2)
const parseJson = <T>(text: string | null | undefined, fallback: T): T => { if (!text) return fallback; try { return JSON.parse(text) as T } catch { return fallback } }

interface Settings {
  reasonMinLength: number; attachmentDays: number; maxPerEmployeeYear: number; maxPctPerGrantor: number
  cooldownHours: number; repeatAlertCount: number; typeDrainAlertPct: number; departmentManagerEnabled: boolean
}
interface MemberOrg { employeeId: number; fullName: string | null; employeeCode: string | null; branchId: number | null; departmentId: number | null; teamId: number | null }
type EntryDebit = ExemptionDebitInput & { creatorUserId: number | null; targetPeriod: string | null; category: string }
interface ItemEntries {
  itemId: number
  dayRate: number
  attendance: { days: Array<{ date: string; lateness: number; shortfall: number }>; absentDates: string[]; absenceDayAmount: number; requested: { lateness: number; shortfall: number; absence: number } }
  debits: EntryDebit[]
  installments: Array<{ installmentId: number; loanId: number; dueDate: string; amount: string }>
  unpaidLeave: number
  saved: FinancialExemptionBreakdown | null
}
interface Estimate { lines: ExemptionLine[]; amount: string; protectedItems: ExemptionProtectedItem[]; exemptedObligationIds: number[] }
interface Evaluation {
  run: PayrollRun; org: MemberOrg; target: ExemptionTarget; disposition: ExemptionDisposition; basis: ExemptionGrantorBasis
  status: 'ACTIVE' | 'PENDING_APPROVAL'; estimate: Estimate; warnings: Array<{ code: string; message: string; details?: unknown }>
  overrides: Array<Record<string, unknown>>; supersedes: number[]; attachmentThreshold: string; dayRate: string; reason: string; attachmentRef: string | null
  typedRequestIds: number[]; previewHash: string
}

@Injectable()
export class FinancialExemptionsService {
  constructor(
    @InjectRepository(PayrollFinancialExemption) private readonly exemptions: Repository<PayrollFinancialExemption>,
    private readonly org: TypedDeductionsService,
  ) {}

  private get manager() { return this.exemptions.manager }

  private async settings(em: EntityManager): Promise<Settings> {
    const rows = await em.getRepository(RequestsConfig).findBy({ key: In(EXEMPTION_SETTING_KEYS) })
    const value = (key: string) => rows.find(row => row.key === key)?.value
    const num = (key: string) => exemptionNumericSetting(key, value(key))
    return {
      reasonMinLength: num('financial_exemptions.reason_min_length'), attachmentDays: num('financial_exemptions.attachment_threshold_days'),
      maxPerEmployeeYear: num('financial_exemptions.max_per_employee_year'), maxPctPerGrantor: num('financial_exemptions.max_pct_per_grantor'),
      cooldownHours: num('financial_exemptions.cooldown_hours'), repeatAlertCount: num('financial_exemptions.repeat_alert_count'),
      typeDrainAlertPct: num('financial_exemptions.type_drain_alert_pct'),
      departmentManagerEnabled: exemptionEnumSetting('financial_exemptions.department_manager_enabled', value('financial_exemptions.department_manager_enabled')) === 'true',
    }
  }

  private inBranch(user: JwtPayload, branchId: number | null | undefined) {
    return inBranchScope(branchScopeOf(user), branchId)
  }
  private privileged(user: JwtPayload) { return [VIEW, GRANT, APPROVE].some(perm => userHasPerm(user, perm)) }

  // فصل الفروع (قرار المالك): فرع/قسم كل عضو في المسير من لقطته (أو ملفه الحالي للقديم بلا لقطة)
  private async runOrgs(em: EntityManager, runId: number) {
    const members = await em.getRepository(PayrollRunMember).find({ where: { runId } })
    const items = await em.getRepository(PayrollItem).find({ where: { runId }, select: { id: true, employeeId: true } })
    const orgs = new Map<number, { branchId: number | null; departmentId: number | null }>()
    for (const member of members) if (member.snapshot) orgs.set(member.employeeId, { branchId: member.snapshot.branchId ?? null, departmentId: member.snapshot.departmentId ?? null })
    const legacy = [...new Set([...members, ...items].map(row => row.employeeId))].filter(id => !orgs.has(id))
    if (legacy.length) for (const row of await em.getRepository(Employee).find({ where: { id: In(legacy) }, select: { id: true, branchId: true, departmentId: true } })) {
      orgs.set(row.id, { branchId: row.branchId ?? null, departmentId: row.departmentId ?? null })
    }
    return orgs
  }

  // مسير بلا عضو في فرع المستخدم (ولا في أقسامه ولا إعفاء منحه هو) لا تُكشف بياناته لمستخدم مقيد بفرع
  private async assertRunInScope(em: EntityManager, user: JwtPayload, facts: OrgFacts, runId: number, orgs: Map<number, { branchId: number | null; departmentId: number | null }>) {
    if (branchScopeOf(user) === null) return
    for (const org of orgs.values()) {
      if (this.inBranch(user, org.branchId) || (!!org.departmentId && facts.departments.has(org.departmentId))) return
    }
    if (await em.getRepository(PayrollFinancialExemption).count({ where: { runId, grantedByUserId: user.sub } })) return
    forbidden('EXEMPTION_RUN_OUT_OF_SCOPE', 'المسير خارج نطاق فرعك')
  }

  // نفس قفل المسير في PayrollService (الحساب والاعتماد والانتقالات): المنح والاعتماد والإلغاء لا تتداخل مع إعادة الحساب
  private async lockRun(em: EntityManager, runId: number) {
    const rows = await em.query(`DECLARE @result int;
      EXEC @result = sys.sp_getapplock @Resource = @0, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000;
      SELECT @result AS lockResult;`, [`hr:payroll:run:${runId}`])
    if (!rows.length || Number(rows[0].lockResult) < 0) conflict('EXEMPTION_RUN_BUSY', 'المسير قيد التحديث؛ حاول مجددًا بعد انتهاء العملية')
  }

  private async loadRun(em: EntityManager, runId: number) {
    const run = await em.getRepository(PayrollRun).findOneBy({ id: runId })
    if (!run) throw new NotFoundException({ code: 'EXEMPTION_RUN_NOT_FOUND', message: 'المسير غير موجود' })
    return run
  }

  /** EX-01 قاعدة 3/4: الإعفاء يستهدف مسيرًا محسوبًا قبل الاعتماد؛ المعتمد والمصروف يوجّهان للقيد العكسي. */
  private assertRunOpen(run: PayrollRun) {
    if (run.status === 'CALCULATED') return
    if (run.status === 'APPROVED' || run.status === 'PAID') {
      conflict('EXEMPTION_RUN_LOCKED', `المسير #${run.id} ${RUN_STATUS_LABELS[run.status]}؛ الإعفاء بعد الاعتماد مرفوض — البديل قيد عكسي («عكس الخصم» في الخصومات المصنفة، DD-12) أو إعادة فتح المسير بسبب موثق قبل الصرف`,
        { runStatus: run.status })
    }
    bad('EXEMPTION_RUN_NOT_CALCULATED', run.status === 'DRAFT' ? 'الإعفاء يستهدف مسيرًا محسوبًا فيه الموظف عضو؛ احتسب المسودة أولًا' : 'المسير ملغى', { runStatus: run.status })
  }

  private async memberOrg(em: EntityManager, run: PayrollRun, employeeId: number): Promise<MemberOrg> {
    const [member, item] = await Promise.all([
      em.getRepository(PayrollRunMember).findOneBy({ runId: run.id, employeeId }),
      em.getRepository(PayrollItem).findOne({ where: { runId: run.id, employeeId }, select: { id: true } }),
    ])
    if (!item || member?.membershipStatus === 'EXCLUDED') bad('EXEMPTION_NOT_MEMBER', 'الموظف ليس عضوًا محسوبًا في لقطة هذا المسير')
    const snapshot = member?.snapshot
    const employee = snapshot ? null : await em.getRepository(Employee).findOne({ where: { id: employeeId }, select: { id: true, fullName: true, employeeCode: true, branchId: true, departmentId: true, teamId: true } })
    return { employeeId, fullName: snapshot?.fullName ?? employee?.fullName ?? null, employeeCode: snapshot?.employeeCode ?? employee?.employeeCode ?? null,
      branchId: snapshot ? snapshot.branchId ?? null : employee?.branchId ?? null, departmentId: snapshot ? snapshot.departmentId ?? null : employee?.departmentId ?? null,
      teamId: snapshot ? snapshot.teamId ?? null : employee?.teamId ?? null }
  }

  /** أساس الحساب لتقدير الإعفاء من آخر حساب محفوظ للبند: أيام الحضور والغياب والقيود المدينة والأقساط المستحقة في هذا المسير. */
  private async itemEntries(em: EntityManager, run: PayrollRun, employeeId: number): Promise<ItemEntries> {
    const item = await em.getRepository(PayrollItem).findOneBy({ runId: run.id, employeeId })
    if (!item) return bad('EXEMPTION_NOT_MEMBER', 'الموظف ليس عضوًا محسوبًا في لقطة هذا المسير')
    let breakdown: Record<string, any>
    try { breakdown = item.breakdown ? JSON.parse(item.breakdown) : {} } catch { return conflict('EXEMPTION_RECALC_REQUIRED', 'تفصيل بند المسير غير صالح؛ أعد حساب المسير قبل منح الإعفاء') }
    const snapshot = parsePayrollRunPolicySnapshot(run)
    const gross = Number(breakdown.gross), monthlyDays = Number(breakdown.monthlyDays) || 30
    if (!snapshot || !Number.isFinite(gross) || gross < 0) conflict('EXEMPTION_RECALC_REQUIRED', 'حساب هذا المسير أقدم من لقطة السياسة؛ أعد حسابه قبل منح الإعفاء')
    const dayRate = gross / monthlyDays
    const penalty = Number(snapshot!.values.absencePenaltyDays)
    const days = (Array.isArray(breakdown.attendanceDeductions?.days) ? breakdown.attendanceDeductions.days : []).map((day: Record<string, unknown>) => ({ date: String(day.date),
      lateness: Number(day.latenessAmount ?? 0) + Number(day.permissionAmount ?? 0), shortfall: Number(day.shortfallAmount ?? 0) }))
    const absentDates: string[] = Array.isArray(breakdown.absentDates) ? breakdown.absentDates.map(String) : []
    const absenceDayAmount = dayRate * penalty
    const requested = { lateness: roundPayrollMoney(days.reduce((sum: number, day: { lateness: number }) => sum + day.lateness, 0)),
      shortfall: roundPayrollMoney(days.reduce((sum: number, day: { shortfall: number }) => sum + day.shortfall, 0)), absence: roundPayrollMoney(absentDates.length * absenceDayAmount) }
    const saved = financialExemptionsOf(breakdown)
    const ids = [...new Set<number>([...(Array.isArray(breakdown.obligationLines) ? breakdown.obligationLines : []).filter((line: { type?: string }) => line?.type === 'DEBIT').map((line: { id: number }) => Number(line.id)),
      ...(saved?.exemptedObligations ?? []).map(row => row.obligationId)].filter(id => Number.isSafeInteger(id) && id > 0))]
    const obligations = ids.length ? await em.getRepository(EmployeeObligation).findBy({ id: In(ids), employeeId }) : []
    const facts = await readExemptionObligationFacts(em, obligations)
    const debits: EntryDebit[] = obligations.filter(row => row.type === 'DEBIT').sort((a, b) => a.id - b.id).map(row => {
      const fact = facts.get(row.id)
      return { id: row.id, amount: roundPayrollMoney(Number(row.amount)), deductionRequestId: row.deductionRequestId ?? null, deductionTypeId: fact?.deductionTypeId ?? null,
        typedCategory: fact?.typedCategory ?? null, isExemptable: fact?.isExemptable ?? null, typeName: fact?.typeName ?? null, label: row.label, creatorUserId: fact?.creatorUserId ?? null,
        targetPeriod: row.targetPeriod ?? null, category: row.category }
    })
    const plan = breakdown.installmentPlan
    const installments: ItemEntries['installments'] = []
    if (plan && Array.isArray(plan.allocation?.lines)) {
      for (const line of plan.allocation.lines) {
        if (!line?.eligible) continue
        const source = Array.isArray(plan.sources) ? plan.sources.find((row: { id: number }) => String(row.id) === line.installmentRef) : null
        installments.push({ installmentId: Number(line.installmentRef), loanId: Number(line.loanRef), dueDate: source?.dueDate ?? '', amount: String(line.dueAmount) })
      }
    }
    for (const row of Array.isArray(plan?.exemptionDeferred) ? plan.exemptionDeferred : []) {
      installments.push({ installmentId: row.installmentId, loanId: row.loanId, dueDate: row.dueDate, amount: row.remainingAmount })
    }
    installments.sort((a, b) => a.installmentId - b.installmentId)
    return { itemId: item.id, dayRate, attendance: { days, absentDates, absenceDayAmount, requested }, debits, installments, unpaidLeave: Number(item.unpaidLeaveDeduction ?? 0), saved }
  }

  /** ما سيُسقطه هدف واحد من آخر حساب (مستقلًا عن الإعفاءات الأخرى)، بنفس دالة التطبيق في المسير. */
  private estimate(entries: ItemEntries, target: ExemptionTarget, disposition: ExemptionDisposition): Estimate {
    const rule: ExemptionRule = { id: 0, revision: 1, ...target, disposition }
    const applied = applyFinancialExemptions({ rules: [rule], attendance: entries.attendance, debits: entries.debits, unpaidLeave: entries.unpaidLeave })
    const component = exemptionComponentOf(target)
    const installments = component === null || component === 'LOAN'
      ? entries.installments.filter(row => target.targetKind !== 'LOAN_INSTALLMENT' || row.installmentId === Number(target.targetRef)) : []
    const loanLines = exemptionLoanLines(installments.map(row => ({ installmentId: row.installmentId, loanId: row.loanId, exemptionId: 0, dueDate: row.dueDate, remainingAmount: row.amount, financialRevision: 0 })))
    const lines = [...applied.lines, ...loanLines].filter(line => cents(line.exemptedAmount) > 0)
    return { lines, amount: sumLines(lines), protectedItems: applied.protectedItems, exemptedObligationIds: applied.exemptedObligations.map(row => row.obligationId) }
  }

  /**
   * EX-03: أساس المنح. الموارد البشرية بـfinancial_exemption.grant في فرع الموظف: كل ما يقبل الإعفاء؛ مدير القسم (بلا صلاحية نظام) لقسمه بفروعه:
   * خصومات الحضور الآلية فقط؛ مدير الجهة المالكة: نوع خصمها المصنف فقط. «كل الخصومات» وتأجيل الأقساط للموارد البشرية وحدها.
   */
  private async basisFor(em: EntityManager, user: JwtPayload, facts: OrgFacts, org: MemberOrg, target: ExemptionTarget, settings: Settings): Promise<ExemptionGrantorBasis> {
    if (userHasPerm(user, GRANT) && this.inBranch(user, org.branchId)) return 'HR'
    const component = exemptionComponentOf(target)
    const departmentManager = settings.departmentManagerEnabled && !!org.departmentId && facts.departments.has(org.departmentId)
    let functionOwner = false
    if (component === 'TYPED' && facts.departments.size) {
      let typeId = target.targetKind === 'TYPED' ? target.deductionTypeId : null
      if (target.targetKind === 'OBLIGATION') {
        const [row] = await em.query(`SELECT r.[deductionTypeId] FROM [employee_obligations] o INNER JOIN [deduction_requests] r ON r.[id]=o.[deductionRequestId] WHERE o.[id]=@0`, [Number(target.targetRef)])
        typeId = row?.deductionTypeId ?? null
      }
      const type = typeId ? await em.getRepository(DeductionType).findOne({ where: { id: typeId }, select: { id: true, ownerDepartmentId: true } }) : null
      functionOwner = !!type?.ownerDepartmentId && facts.departments.has(type.ownerDepartmentId)
    }
    if (!departmentManager && !functionOwner) {
      forbidden('EXEMPTION_OUT_OF_SCOPE', 'الموظف أو الخصم خارج نطاق منح الإعفاء لك: الموارد البشرية بصلاحية منح الإعفاء في فرع الموظف، أو مدير القسم لخصومات حضور قسمه، أو مدير الجهة المالكة لنوع خصمها')
    }
    if (target.scopeKind === 'ALL_DEDUCTIONS') forbidden('EXEMPTION_ALL_REQUIRES_HR', 'إعفاء «كل الخصومات القابلة» للموارد البشرية فقط (EX-07)')
    if (isAttendanceComponent(component)) {
      if (departmentManager) return 'DEPARTMENT_MANAGER'
      forbidden('EXEMPTION_BASIS_TARGET', 'مدير الجهة المالكة يعفي من نوع الخصم المملوك لجهته فقط')
    }
    if (component === 'TYPED') {
      if (functionOwner) return 'FUNCTION_OWNER'
      forbidden('EXEMPTION_BASIS_TARGET', 'مدير القسم يعفي من خصومات الحضور الآلية فقط (التأخير والنقص والغياب)؛ الخصم المصنف لمدير الجهة المالكة لنوعه أو الموارد البشرية')
    }
    return forbidden('EXEMPTION_BASIS_TARGET', 'تأجيل أقساط السلف بالإعفاء للموارد البشرية فقط')
  }

  private async evaluate(em: EntityManager, user: JwtPayload, dto: ExemptionInputDto): Promise<Evaluation> {
    const settings = await this.settings(em)
    const run = await this.loadRun(em, dto.runId)
    const org = await this.memberOrg(em, run, dto.employeeId)
    const facts = await this.org.facts(em, user)
    const target = normalizeExemptionTarget(dto)
    const { disposition } = normalizeExemptionDisposition(target, dto.disposition)
    const basis = await this.basisFor(em, user, facts, org, target, settings)
    this.assertRunOpen(run)
    // EX-03 قاعدة 2: لا إعفاء للنفس ولا لمن يعلو المانح (فصل المهام لا يُتجاوز بأي صلاحية)
    if (user.employeeId && Number(user.employeeId) === org.employeeId) forbidden('EXEMPTION_SELF', 'لا يمنح المستخدم إعفاءً ماليًا لنفسه')
    if (facts.superiors.has(org.employeeId)) forbidden('EXEMPTION_SUPERIOR', 'لا يُعفى من يعلوك إداريًا (فصل مهام)')
    const reasonIssue = exemptionReasonIssue(dto.reason, settings.reasonMinLength)
    if (reasonIssue) bad(reasonIssue.code, reasonIssue.message, { minLength: settings.reasonMinLength })
    const reason = String(dto.reason).trim()
    const attachmentRef = typeof dto.attachmentRef === 'string' && dto.attachmentRef.trim() ? dto.attachmentRef.trim() : null
    const entries = await this.itemEntries(em, run, org.employeeId)
    const protectedCategory = (category: string | null | undefined) => EXEMPTION_PROTECTED_TYPED_CATEGORIES.includes(category ?? '')
    if (target.targetKind === 'TYPED') {
      const type = await em.getRepository(DeductionType).findOneBy({ id: target.deductionTypeId! })
      if (!type) throw new NotFoundException({ code: 'EXEMPTION_TYPE_NOT_FOUND', message: 'نوع الخصم المصنف غير موجود' })
      if (!type.isExemptable || protectedCategory(type.category)) bad('EXEMPTION_NOT_EXEMPTABLE', `نوع «${type.nameAr}» غير قابل للإعفاء${protectedCategory(type.category) ? ' (استقطاع نظامي أو حكم قضائي)' : ''}؛ يبقى كما هو حتى في «كل الخصومات»`)
    }
    if (target.targetKind === 'OBLIGATION' && !entries.debits.some(row => row.id === Number(target.targetRef))) {
      bad('EXEMPTION_ENTRY_NOT_IN_RUN', `القيد #${target.targetRef} ليس ضمن خصومات الموظف في آخر حساب لهذا المسير`)
    }
    if (target.targetKind === 'LOAN_INSTALLMENT' && !entries.installments.some(row => row.installmentId === Number(target.targetRef))) {
      bad('EXEMPTION_ENTRY_NOT_IN_RUN', `القسط #${target.targetRef} ليس مستحقًا في آخر حساب لهذا المسير`)
    }
    const estimate = this.estimate(entries, target, disposition)
    if (target.targetKind === 'OBLIGATION' && !estimate.exemptedObligationIds.length) {
      const item = estimate.protectedItems.find(row => row.ref === target.targetRef)
      bad('EXEMPTION_NOT_EXEMPTABLE', item?.reason ?? 'القيد المستهدف غير قابل للإعفاء', { protectedItems: estimate.protectedItems })
    }
    if (!estimate.lines.length) {
      bad('EXEMPTION_NOTHING_TO_EXEMPT', 'لا يوجد في آخر حساب لهذا المسير خصم يشمله هذا الإعفاء', { protectedItems: estimate.protectedItems })
    }
    // EX-03 قاعدة 2: لا يعفي المستخدم خصمًا أنزله هو
    const own = estimate.exemptedObligationIds.map(id => entries.debits.find(row => row.id === id)).find(row => row?.creatorUserId === user.sub)
    if (own) forbidden('EXEMPTION_SOD_CREATOR', `لا تعفي خصمًا أنزلته أنت (القيد #${own.id})؛ يمنحه مانح آخر (فصل مهام)`, { obligationId: own.id })
    // EX-02 قاعدة 5/6: التداخل مع الإعفاءات الحية على الموظف في المسير نفسه
    const live = await this.exemptions.manager.getRepository(PayrollFinancialExemption).find({ where: { runId: run.id, employeeId: org.employeeId, status: In([...EXEMPTION_LIVE_STATUSES]) }, order: { id: 'ASC' } })
    const typeOfObligation = (id: number) => entries.debits.find(row => row.id === id)?.deductionTypeId ?? null
    const overlap = exemptionOverlap(target, live.map(row => ({ ...exemptionRuleOf(row) })), typeOfObligation)
    if (overlap.containedBy) conflict('EXEMPTION_CONTAINED', `يوجد إعفاء «كل الخصومات القابلة» حي #${overlap.containedBy} على هذا الموظف في المسير نفسه يحتوي هذا الإعفاء`, { exemptionId: overlap.containedBy })
    if (overlap.overlapsWith) conflict('EXEMPTION_OVERLAP', `الإعفاء الحي #${overlap.overlapsWith} يستهدف القيد نفسه أو نوعًا يحتويه؛ لا يستهدف إعفاءان حيّان القيد نفسه`, { exemptionId: overlap.overlapsWith })

    // EX-07: الحدود — سقف مدير القسم والجهة المالكة، والمرفق، وعدد إعفاءات الموظف، والتهدئة، وإعادة الإعفاء، ونسبة المانح
    const warnings: Evaluation['warnings'] = []
    const overrides: Array<Record<string, unknown>> = []
    const threshold = exemptionAttachmentThreshold(entries.dayRate, settings.attachmentDays)
    if (basis !== 'HR' && Number(estimate.amount) > Number(threshold)) {
      forbidden('EXEMPTION_MANAGER_CAP', `${EXEMPTION_LABELS.bases[basis]} يعفي بمبلغ لا يتجاوز ${threshold} (${settings.attachmentDays} يوم راتب)؛ المبلغ المقدر ${estimate.amount}`, { threshold, amount: estimate.amount })
    }
    if (exemptionNeedsAttachment(estimate.amount, entries.dayRate, settings.attachmentDays, attachmentRef)) {
      bad('EXEMPTION_ATTACHMENT_REQUIRED', `المبلغ المُعفى المقدر ${estimate.amount} يتجاوز حد ${threshold} بلا مرفق؛ أضف مرجع المرفق`, { threshold, amount: estimate.amount })
    }
    const requireOverride = (code: string, limit: string, message: string, details: Record<string, unknown>) => {
      if (!userHasPerm(user, OVERRIDE)) forbidden(code, `${message}؛ يتطلب صلاحية تجاوز حدود الإعفاء وتبريرًا إضافيًا`, details)
      const issue = exemptionReasonIssue(dto.overrideReason, settings.reasonMinLength)
      if (issue) bad('EXEMPTION_OVERRIDE_REASON_REQUIRED', `${message}؛ اكتب تبريرًا إضافيًا لتجاوز الحد (${issue.message})`, { ...details, limit })
      overrides.push({ tag: 'limit_override', limit, ...details, reason: String(dto.overrideReason).trim(), byUserId: user.sub })
    }
    if (settings.maxPerEmployeeYear > 0) {
      // C8: قرار الحضور أو «كل الخصومات» على بند عُكس صرفه يُنقل للتكميلي أو يُمنح عليه من جديد — لا يُحتسب قرارين في حد الموظف
      const [row] = await em.query(`SELECT COUNT(*) AS [count] FROM [payroll_financial_exemptions] e WHERE e.[employeeId]=@0 AND e.[status] IN ('PENDING_APPROVAL','ACTIVE','APPLIED')
        AND e.[createdAt] >= DATEADD(month, -12, SYSUTCDATETIME()) AND (${EXEMPTION_NOT_REVERSED_DECISION_SQL})`, [org.employeeId])
      const count = Number(row?.count ?? 0)
      if (count >= settings.maxPerEmployeeYear) requireOverride('EXEMPTION_EMPLOYEE_LIMIT', 'max_per_employee_year',
        `للموظف ${count} إعفاء خلال 12 شهرًا والحد ${settings.maxPerEmployeeYear}`, { limitValue: settings.maxPerEmployeeYear, actual: count })
    }
    const typedRequestIds = [...new Set(estimate.exemptedObligationIds.map(id => entries.debits.find(row => row.id === id)?.deductionRequestId).filter((id): id is number => !!id))]
    if (settings.cooldownHours > 0 && typedRequestIds.length) {
      // decidedAt يُكتب من الخدمة بـnew Date() ويُقرأ بالكيان نفسه (ذهابًا وإيابًا بتوقيت العملية)؛ مقارنته بـSYSUTCDATETIME في SQL تزيحه ثلاث ساعات
      const decided = await em.getRepository(DeductionRequest).find({ where: { id: In(typedRequestIds) }, select: { id: true, decidedAt: true } })
      const rows = decided.map(row => ({ id: row.id, ageMinutes: row.decidedAt ? Math.floor((Date.now() - new Date(row.decidedAt).getTime()) / 60000) : null }))
      const fresh = rows.find(row => row.ageMinutes !== null && Number(row.ageMinutes) < settings.cooldownHours * 60)
      if (fresh) requireOverride('EXEMPTION_COOLDOWN', 'cooldown_hours', `اعتُمد الخصم المصنف #${fresh.id} قبل أقل من ${settings.cooldownHours} ساعة (فترة التهدئة)`,
        { limitValue: settings.cooldownHours, requestId: Number(fresh.id), ageMinutes: Number(fresh.ageMinutes) })
    }
    const revoked = (await em.getRepository(PayrollFinancialExemption).find({ where: { runId: run.id, employeeId: org.employeeId, status: 'REVOKED', scopeKind: target.scopeKind } }))
      .filter(row => (row.targetKind ?? null) === target.targetKind && (row.deductionTypeId ?? null) === target.deductionTypeId && (row.targetRef ?? null) === target.targetRef)
    if (revoked.length) requireOverride('EXEMPTION_REEXEMPT_REQUIRES_OVERRIDE', 'reexempt_after_revoke', `أُلغي إعفاء سابق على الهدف نفسه (#${revoked[0].id}) وعاد الخصم`, { revokedExemptionId: revoked[0].id })
    let routedByPct = false
    if (settings.maxPctPerGrantor > 0) {
      const [base] = await em.query(`SELECT COALESCE(SUM([latenessDeduction]+[shortfallDeduction]+[absenceDeduction]+[otherDeductions]+[loanInstallments]
        + COALESCE(TRY_CAST(JSON_VALUE([breakdown], '$.financialExemptions.totals.exempted') AS decimal(18,2)), 0)), 0) AS [total] FROM [payroll_items] WHERE [runId]=@0`, [run.id])
      const [mine] = await em.query(`SELECT COALESCE(SUM(COALESCE([exemptedAmountSnapshot],[estimatedAmount])), 0) AS [total] FROM [payroll_financial_exemptions]
        WHERE [runId]=@0 AND [grantedByUserId]=@1 AND [status] IN ('PENDING_APPROVAL','ACTIVE','APPLIED')`, [run.id, user.sub])
      const baseTotal = Number(base?.total ?? 0), grantorTotal = Number(mine?.total ?? 0) + Number(estimate.amount)
      if (baseTotal > 0 && (grantorTotal / baseTotal) * 100 > settings.maxPctPerGrantor) {
        routedByPct = true
        warnings.push({ code: 'EXEMPTION_GRANTOR_PCT_APPROVAL', message: `إعفاءاتك في هذا المسير ستبلغ ${((grantorTotal / baseTotal) * 100).toFixed(1)}% من خصوماته والحد ${settings.maxPctPerGrantor}%؛ يُحوّل الإعفاء لاعتماد الموارد البشرية` })
      }
    }
    const status: Evaluation['status'] = basis === 'HR' && !routedByPct ? 'ACTIVE' : 'PENDING_APPROVAL'
    if (estimate.lines.some(line => line.component === 'LOAN')) warnings.push({ code: 'EXEMPTION_LOAN_DEFERRED', message: 'سيُؤجَّل القسط لا يُسقط: عند صرف المسير يُعلَّم مؤجلًا ويُنشأ قسط جديد مستحق في الشهر التالي بمرجع الإعفاء' })
    if (disposition === 'DEFER_ONE_PERIOD' && estimate.lines.some(line => line.component === 'TYPED')) warnings.push({ code: 'EXEMPTION_TYPED_DEFERRED', message: 'الخصم المصنف المشمول يُؤجل لشهر واحد: عند الصرف يُنشأ قسط جديد بنفس المبلغ للشهر التالي' })
    if (estimate.protectedItems.length) warnings.push({ code: 'EXEMPTION_PROTECTED_ITEMS', message: 'بنود غير قابلة للإعفاء تبقى كما هي', details: estimate.protectedItems })
    if (overlap.supersedes.length) warnings.push({ code: 'EXEMPTION_SUPERSEDES', message: `الإعفاء الأشمل يحل محل الإعفاءات الحية الأضيق: ${overlap.supersedes.map(id => `#${id}`).join('، ')}`, details: overlap.supersedes })
    if (status === 'PENDING_APPROVAL') warnings.push({ code: 'EXEMPTION_NEEDS_APPROVAL', message: 'الإعفاء يمر بخطوة اعتماد الموارد البشرية قبل أن يُطبق' })
    warnings.push({ code: 'EXEMPTION_RECALC_REQUIRED', message: 'بعد الحفظ (والاعتماد إن لزم) أعد حساب المسير ليُطبق الإعفاء؛ اعتماد المسير يُرفض قبل ذلك' })
    const previewHash = createHash('sha256').update(JSON.stringify({ runId: run.id, snapshotVersion: run.snapshotVersion, employeeId: org.employeeId, target, disposition, basis, status,
      amount: estimate.amount, lines: estimate.lines, supersedes: overlap.supersedes, overrides: overrides.map(row => row.limit), attachment: !!attachmentRef }), 'utf8').digest('hex')
    return { run, org, target, disposition, basis, status, estimate, warnings, overrides, supersedes: overlap.supersedes, attachmentThreshold: threshold, dayRate: money(entries.dayRate)!,
      reason, attachmentRef, typedRequestIds, previewHash }
  }

  private evaluationView(evaluation: Evaluation) {
    return { runId: evaluation.run.id, employeeId: evaluation.org.employeeId, employeeName: evaluation.org.fullName, scopeKind: evaluation.target.scopeKind, targetKind: evaluation.target.targetKind,
      deductionTypeId: evaluation.target.deductionTypeId, targetRef: evaluation.target.targetRef, disposition: evaluation.disposition,
      dispositionLabel: EXEMPTION_LABELS.dispositions[evaluation.disposition], basis: evaluation.basis, basisLabel: EXEMPTION_LABELS.bases[evaluation.basis],
      status: evaluation.status, statusLabel: EXEMPTION_LABELS.statuses[evaluation.status], estimatedAmount: evaluation.estimate.amount, lines: evaluation.estimate.lines,
      protectedItems: evaluation.estimate.protectedItems, warnings: evaluation.warnings, overrides: evaluation.overrides, supersedes: evaluation.supersedes,
      attachmentThreshold: evaluation.attachmentThreshold, dayRate: evaluation.dayRate, previewHash: evaluation.previewHash }
  }

  async preview(user: JwtPayload, dto: ExemptionInputDto) {
    return this.manager.transaction(async em => this.evaluationView(await this.evaluate(em, user, dto)))
  }

  async create(user: JwtPayload, dto: ExemptionInputDto) {
    const id = await this.manager.transaction(async em => {
      await this.lockRun(em, dto.runId)
      await lockPayrollEmployees(em, [dto.employeeId])
      const evaluation = await this.evaluate(em, user, dto)
      if (dto.previewHash && dto.previewHash !== evaluation.previewHash) {
        conflict('EXEMPTION_PREVIEW_STALE', 'تغيّرت نتيجة المعاينة (حساب المسير أو الإعفاءات الحية أو الحدود)؛ راجع المعاينة الجديدة ثم احفظ', { preview: this.evaluationView(evaluation) })
      }
      const repo = em.getRepository(PayrollFinancialExemption)
      const row = await repo.save(repo.create({ runId: evaluation.run.id, period: evaluation.run.period, employeeId: evaluation.org.employeeId, scopeKind: evaluation.target.scopeKind,
        targetKind: evaluation.target.targetKind, deductionTypeId: evaluation.target.deductionTypeId, targetRef: evaluation.target.targetRef, disposition: evaluation.disposition,
        reason: evaluation.reason, attachmentRef: evaluation.attachmentRef, status: evaluation.status, grantorBasis: evaluation.basis, grantedByUserId: user.sub,
        grantedByEmployeeId: user.employeeId ? Number(user.employeeId) : null, estimatedAmount: evaluation.estimate.amount, exemptedAmountSnapshot: null, appliedLines: null,
        appliedSnapshotVersion: null, evaluation: JSON.stringify({ org: evaluation.org, runSnapshotVersion: evaluation.run.snapshotVersion, lines: evaluation.estimate.lines,
          protectedItems: evaluation.estimate.protectedItems, warnings: evaluation.warnings, attachmentThreshold: evaluation.attachmentThreshold, dayRate: evaluation.dayRate, previewHash: evaluation.previewHash }),
        overrides: evaluation.overrides.length ? JSON.stringify(evaluation.overrides) : null, approvedByUserId: null, approvedAt: null, decidedByUserId: null, decidedAt: null,
        decisionReason: null, supersededById: null, revision: 1, updatedAt: null }))
      await recordExemptionEvent(em, row, 'GRANTED', user.sub, null, row.status, row.reason, { basis: row.grantorBasis, estimatedAmount: evaluation.estimate.amount,
        lines: evaluation.estimate.lines.length, overrides: evaluation.overrides, supersedes: evaluation.supersedes })
      for (const otherId of evaluation.supersedes) {
        const other = await repo.findOneBy({ id: otherId })
        if (!other || !EXEMPTION_LIVE_STATUSES.includes(other.status as never)) continue
        await repo.update({ id: other.id }, { status: 'SUPERSEDED', supersededById: row.id, decidedByUserId: user.sub, decidedAt: new Date(), decisionReason: `محتوى في الإعفاء الأشمل #${row.id}`, updatedAt: new Date() })
        await recordExemptionEvent(em, other, 'SUPERSEDED', user.sub, other.status, 'SUPERSEDED', `محتوى في الإعفاء الأشمل #${row.id}`, { supersededById: row.id })
      }
      // EX-03 قاعدة 5: مُنزِّل الخصم المصنف يرى الإعفاء في سجل طلبه (والموظف يُخطر من سجل الإعفاء)
      for (const requestId of evaluation.typedRequestIds) {
        await em.getRepository(DeductionRequestEvent).save({ requestId, eventType: 'EXEMPTION_GRANTED', actorUserId: user.sub, fromStatus: null, toStatus: null, stepOrder: null,
          reason: `إعفاء مالي #${row.id} (${EXEMPTION_LABELS.statuses[row.status as 'ACTIVE']}) في مسير ${row.period}: ${row.reason}`.slice(0, 1000), payload: JSON.stringify({ exemptionId: row.id, runId: row.runId }) })
      }
      return row.id
    })
    return this.detail(user, id)
  }

  private async lockedRow(em: EntityManager, id: number, expectedRevision?: number) {
    await em.query(`SELECT [id] FROM [payroll_financial_exemptions] WITH (UPDLOCK, HOLDLOCK) WHERE [id]=@0`, [id])
    const row = await em.getRepository(PayrollFinancialExemption).findOneBy({ id })
    if (!row) throw new NotFoundException({ code: 'EXEMPTION_NOT_FOUND', message: 'الإعفاء غير موجود' })
    if (expectedRevision !== undefined && row.revision !== expectedRevision) conflict('EXEMPTION_STALE', 'تغيّر الإعفاء منذ عرضه؛ حدّث الشاشة')
    return row
  }

  private orgOfRow(row: PayrollFinancialExemption): Pick<MemberOrg, 'branchId' | 'departmentId'> {
    const org = parseJson<{ org?: MemberOrg }>(row.evaluation, {}).org
    return { branchId: org?.branchId ?? null, departmentId: org?.departmentId ?? null }
  }

  async approve(user: JwtPayload, id: number, dto: ExemptionDecisionDto) {
    if (!userHasPerm(user, APPROVE)) forbidden('EXEMPTION_APPROVE_FORBIDDEN', 'اعتماد الإعفاء المالي يتطلب صلاحية اعتماد الإعفاءات')
    await this.manager.transaction(async em => {
      const peek = await em.getRepository(PayrollFinancialExemption).findOneBy({ id })
      if (!peek) throw new NotFoundException({ code: 'EXEMPTION_NOT_FOUND', message: 'الإعفاء غير موجود' })
      await this.lockRun(em, peek.runId)
      const row = await this.lockedRow(em, id, dto.expectedRevision)
      if (!this.inBranch(user, this.orgOfRow(row).branchId)) forbidden('EXEMPTION_FORBIDDEN', 'الإعفاء خارج نطاق فرعك')
      if (row.status !== 'PENDING_APPROVAL') conflict('EXEMPTION_STATE', `لا يُعتمد إعفاء حالته «${EXEMPTION_LABELS.statuses[row.status as 'ACTIVE'] ?? row.status}»`)
      const run = await this.loadRun(em, row.runId)
      this.assertRunOpen(run)
      if (row.grantedByUserId === user.sub) forbidden('EXEMPTION_SOD_GRANTOR', 'لا يعتمد المانح الإعفاء الذي منحه (فصل مهام)')
      if (user.employeeId && Number(user.employeeId) === row.employeeId) forbidden('EXEMPTION_SELF', 'لا يعتمد المستخدم إعفاءً على نفسه')
      await lockPayrollEmployees(em, [row.employeeId])
      // EX-07 قاعدة 1: الهدف والتداخل والحدود يُعاد فحصها عند الاعتماد على آخر حساب
      const settings = await this.settings(em)
      await this.memberOrg(em, run, row.employeeId)
      const entries = await this.itemEntries(em, run, row.employeeId)
      const rule = exemptionRuleOf(row)
      const estimate = this.estimate(entries, rule, rule.disposition)
      if (!estimate.lines.length) conflict('EXEMPTION_NOTHING_TO_EXEMPT', 'لم يعد في آخر حساب لهذا المسير خصم يشمله هذا الإعفاء؛ ارفضه بسبب')
      const live = (await em.getRepository(PayrollFinancialExemption).find({ where: { runId: row.runId, employeeId: row.employeeId, status: In([...EXEMPTION_LIVE_STATUSES]) } })).filter(other => other.id !== row.id)
      const overlap = exemptionOverlap(rule, live.map(other => ({ ...exemptionRuleOf(other) })), obligationId => entries.debits.find(debit => debit.id === obligationId)?.deductionTypeId ?? null)
      if (overlap.containedBy || overlap.overlapsWith) conflict('EXEMPTION_OVERLAP', `إعفاء حي آخر (#${overlap.containedBy ?? overlap.overlapsWith}) يستهدف القيد نفسه؛ ارفض أحدهما`)
      const threshold = exemptionAttachmentThreshold(entries.dayRate, settings.attachmentDays)
      if (row.grantorBasis !== 'HR' && Number(estimate.amount) > Number(threshold)) conflict('EXEMPTION_MANAGER_CAP', `المبلغ المقدر ${estimate.amount} صار فوق سقف ${threshold} لمنح ${EXEMPTION_LABELS.bases[row.grantorBasis as ExemptionGrantorBasis]}؛ ارفضه`, { threshold, amount: estimate.amount })
      if (exemptionNeedsAttachment(estimate.amount, entries.dayRate, settings.attachmentDays, row.attachmentRef)) bad('EXEMPTION_ATTACHMENT_REQUIRED', `المبلغ المقدر ${estimate.amount} فوق حد ${threshold} بلا مرفق؛ أضف مرجع المرفق للإعفاء أولًا`, { threshold, amount: estimate.amount })
      const note = typeof dto.reason === 'string' ? dto.reason.trim().slice(0, 1000) : ''
      await em.getRepository(PayrollFinancialExemption).update({ id: row.id, status: 'PENDING_APPROVAL' }, { status: 'ACTIVE', approvedByUserId: user.sub, approvedAt: new Date(),
        estimatedAmount: estimate.amount, revision: row.revision + 1, updatedAt: new Date() })
      await recordExemptionEvent(em, row, 'APPROVED', user.sub, 'PENDING_APPROVAL', 'ACTIVE', note || null, { estimatedAmount: estimate.amount })
    })
    return this.detail(user, id)
  }

  async reject(user: JwtPayload, id: number, dto: ExemptionDecisionDto) {
    if (!userHasPerm(user, APPROVE)) forbidden('EXEMPTION_APPROVE_FORBIDDEN', 'رفض الإعفاء المالي يتطلب صلاحية اعتماد الإعفاءات')
    await this.manager.transaction(async em => {
      const settings = await this.settings(em)
      const row = await this.lockedRow(em, id, dto.expectedRevision)
      if (!this.inBranch(user, this.orgOfRow(row).branchId)) forbidden('EXEMPTION_FORBIDDEN', 'الإعفاء خارج نطاق فرعك')
      if (row.status !== 'PENDING_APPROVAL') conflict('EXEMPTION_STATE', `لا يُرفض إعفاء حالته «${EXEMPTION_LABELS.statuses[row.status as 'ACTIVE'] ?? row.status}»`)
      if (row.grantedByUserId === user.sub) forbidden('EXEMPTION_SOD_GRANTOR', 'المانح يلغي إعفاءه بدل رفضه')
      const issue = exemptionReasonIssue(dto.reason, settings.reasonMinLength)
      if (issue) bad(issue.code, issue.message.replace('الإعفاء', 'الرفض'), { minLength: settings.reasonMinLength })
      await em.getRepository(PayrollFinancialExemption).update({ id: row.id }, { status: 'REJECTED', decidedByUserId: user.sub, decidedAt: new Date(), decisionReason: String(dto.reason).trim(), revision: row.revision + 1, updatedAt: new Date() })
      await recordExemptionEvent(em, row, 'REJECTED', user.sub, row.status, 'REJECTED', String(dto.reason).trim(), null)
    })
    return this.detail(user, id)
  }

  /** EX-08 قاعدة 3/4: إلغاء إعفاء حي قبل اعتماد المسير بسبب ≥ الحد، من المانح أو الموارد البشرية؛ المطبق لا يُلغى. */
  async revoke(user: JwtPayload, id: number, dto: ExemptionDecisionDto) {
    await this.manager.transaction(async em => {
      const settings = await this.settings(em)
      const peek = await em.getRepository(PayrollFinancialExemption).findOneBy({ id })
      if (!peek) throw new NotFoundException({ code: 'EXEMPTION_NOT_FOUND', message: 'الإعفاء غير موجود' })
      await this.lockRun(em, peek.runId)
      const row = await this.lockedRow(em, id, dto.expectedRevision)
      const inScope = row.grantedByUserId === user.sub || ((userHasPerm(user, GRANT) || userHasPerm(user, APPROVE)) && this.inBranch(user, this.orgOfRow(row).branchId))
      if (!inScope) forbidden('EXEMPTION_FORBIDDEN', 'إلغاء الإعفاء للمانح نفسه أو للموارد البشرية في فرع الموظف')
      if (row.status === 'APPLIED') conflict('EXEMPTION_APPLIED', `الإعفاء #${row.id} مطبق في مسير معتمد ولا يُلغى؛ صحح الخطأ بإنشاء خصم جديد بدورة اعتماد كاملة يذكر الإعفاء #${row.id}`)
      if (!EXEMPTION_LIVE_STATUSES.includes(row.status as never)) conflict('EXEMPTION_STATE', `لا يُلغى إعفاء حالته «${EXEMPTION_LABELS.statuses[row.status as 'ACTIVE'] ?? row.status}»`)
      this.assertRunOpen(await this.loadRun(em, row.runId))
      const issue = exemptionReasonIssue(dto.reason, settings.reasonMinLength)
      if (issue) bad(issue.code, issue.message.replace('الإعفاء', 'الإلغاء'), { minLength: settings.reasonMinLength })
      await em.getRepository(PayrollFinancialExemption).update({ id: row.id }, { status: 'REVOKED', decidedByUserId: user.sub, decidedAt: new Date(), decisionReason: String(dto.reason).trim(), revision: row.revision + 1, updatedAt: new Date() })
      await recordExemptionEvent(em, row, 'REVOKED', user.sub, row.status, 'REVOKED', String(dto.reason).trim(), { note: 'أعد حساب المسير ليعود الخصم' })
    })
    return this.detail(user, id)
  }

  async attach(user: JwtPayload, id: number, dto: ExemptionAttachmentDto) {
    await this.manager.transaction(async em => {
      const row = await this.lockedRow(em, id)
      const inScope = row.grantedByUserId === user.sub || (userHasPerm(user, GRANT) && this.inBranch(user, this.orgOfRow(row).branchId))
      if (!inScope) forbidden('EXEMPTION_FORBIDDEN', 'إضافة المرفق للمانح نفسه أو للموارد البشرية في فرع الموظف')
      if (![...EXEMPTION_LIVE_STATUSES, 'APPLIED'].includes(row.status as never)) conflict('EXEMPTION_STATE', 'لا يُضاف مرفق لإعفاء منتهٍ أو مرفوض')
      const ref = String(dto.attachmentRef ?? '').trim()
      if (ref.length < 3) bad('EXEMPTION_ATTACHMENT_INVALID', 'مرجع المرفق من 3 إلى 300 حرف')
      await em.getRepository(PayrollFinancialExemption).update({ id: row.id }, { attachmentRef: ref, updatedAt: new Date() })
      await recordExemptionEvent(em, row, 'ATTACHMENT_ADDED', user.sub, row.status, row.status, null, { previous: row.attachmentRef ?? null, attachmentRef: ref })
    })
    return this.detail(user, id)
  }

  // ===== القراءة =====
  private async names(em: EntityManager, rows: PayrollFinancialExemption[]) {
    const userIds = [...new Set(rows.flatMap(row => [row.grantedByUserId, row.approvedByUserId, row.decidedByUserId]).filter((id): id is number => !!id))]
    const employeeIds = [...new Set(rows.map(row => row.employeeId))]
    const runIds = [...new Set(rows.map(row => row.runId))]
    const typeIds = [...new Set(rows.map(row => row.deductionTypeId).filter((id): id is number => !!id))]
    const users = userIds.length ? new Map((await em.query(`SELECT [id],[displayName] FROM [users] WHERE [id] IN (${userIds.map((_, i) => `@${i}`).join(',')})`, userIds) as Array<{ id: number; displayName: string | null }>)
      .map(row => [Number(row.id), row.displayName || `مستخدم #${row.id}`])) : new Map<number, string>()
    const employees = employeeIds.length ? new Map((await em.getRepository(Employee).find({ where: { id: In(employeeIds) }, select: { id: true, fullName: true, employeeCode: true, branchId: true, departmentId: true } })).map(row => [row.id, row])) : new Map<number, Employee>()
    const runs = runIds.length ? new Map((await em.getRepository(PayrollRun).find({ where: { id: In(runIds) }, select: { id: true, name: true, period: true, status: true } })).map(row => [row.id, row])) : new Map<number, PayrollRun>()
    const types = typeIds.length ? new Map((await em.getRepository(DeductionType).find({ where: { id: In(typeIds) }, select: { id: true, nameAr: true } })).map(row => [row.id, row.nameAr])) : new Map<number, string>()
    return { users, employees, runs, types }
  }

  private visible(user: JwtPayload, facts: OrgFacts, row: PayrollFinancialExemption, employee?: Pick<Employee, 'branchId' | 'departmentId'> | null) {
    const org = this.orgOfRow(row)
    const branchId = org.branchId ?? employee?.branchId ?? null, departmentId = org.departmentId ?? employee?.departmentId ?? null
    if (this.privileged(user) && this.inBranch(user, branchId)) return true
    if (row.grantedByUserId === user.sub) return true
    return !!departmentId && facts.departments.has(departmentId)
  }

  private async views(em: EntityManager, user: JwtPayload, rows: PayrollFinancialExemption[]) {
    if (!rows.length) return []
    const { users, employees, runs, types } = await this.names(em, rows)
    return rows.map(row => {
      const evaluation = parseJson<Record<string, any>>(row.evaluation, {})
      const employee = employees.get(row.employeeId)
      const run = runs.get(row.runId)
      const inBranch = this.inBranch(user, evaluation.org?.branchId ?? employee?.branchId ?? null)
      const live = EXEMPTION_LIVE_STATUSES.includes(row.status as never)
      const runOpen = run?.status === 'CALCULATED'
      const decider = userHasPerm(user, APPROVE) && inBranch && row.grantedByUserId !== user.sub && Number(user.employeeId ?? 0) !== row.employeeId
      return {
        id: row.id, runId: row.runId, runName: run?.name ?? null, runStatus: run?.status ?? null, runStatusLabel: run ? RUN_STATUS_LABELS[run.status] ?? run.status : null, period: row.period,
        employeeId: row.employeeId, employeeName: evaluation.org?.fullName ?? employee?.fullName ?? null, employeeCode: evaluation.org?.employeeCode ?? employee?.employeeCode ?? null,
        scopeKind: row.scopeKind, scopeLabel: EXEMPTION_LABELS.scopes[row.scopeKind as 'ALL_DEDUCTIONS'] ?? row.scopeKind, targetKind: row.targetKind, deductionTypeId: row.deductionTypeId, targetRef: row.targetRef,
        targetLabel: exemptionTargetLabel(exemptionRuleOf(row), row.deductionTypeId ? types.get(row.deductionTypeId) ?? null : null),
        disposition: row.disposition, dispositionLabel: EXEMPTION_LABELS.dispositions[row.disposition as ExemptionDisposition] ?? row.disposition,
        reason: row.reason, attachmentRef: row.attachmentRef, status: row.status, statusLabel: EXEMPTION_LABELS.statuses[row.status as 'ACTIVE'] ?? row.status,
        grantorBasis: row.grantorBasis, grantorBasisLabel: EXEMPTION_LABELS.bases[row.grantorBasis as ExemptionGrantorBasis] ?? row.grantorBasis,
        grantedByUserId: row.grantedByUserId, grantedByName: users.get(row.grantedByUserId) ?? null, grantedAt: row.createdAt,
        approvedByName: row.approvedByUserId ? users.get(row.approvedByUserId) ?? null : null, approvedAt: row.approvedAt,
        decidedByName: row.decidedByUserId ? users.get(row.decidedByUserId) ?? null : null, decidedAt: row.decidedAt, decisionReason: row.decisionReason,
        estimatedAmount: money(row.estimatedAmount), exemptedAmountSnapshot: money(row.exemptedAmountSnapshot), lines: row.status === 'APPLIED' ? parseJson(row.appliedLines, []) : evaluation.lines ?? [],
        warnings: evaluation.warnings ?? [], overrides: parseJson(row.overrides, []), supersededById: row.supersededById, revision: row.revision,
        canApprove: row.status === 'PENDING_APPROVAL' && runOpen && decider, canReject: row.status === 'PENDING_APPROVAL' && decider,
        canRevoke: live && runOpen && (row.grantedByUserId === user.sub || ((userHasPerm(user, GRANT) || userHasPerm(user, APPROVE)) && inBranch)),
        canAttach: [...EXEMPTION_LIVE_STATUSES, 'APPLIED'].includes(row.status as never) && (row.grantedByUserId === user.sub || (userHasPerm(user, GRANT) && inBranch)),
      }
    })
  }

  async detail(user: JwtPayload, id: number) {
    return this.manager.transaction(async em => {
      const row = await em.getRepository(PayrollFinancialExemption).findOneBy({ id })
      if (!row) throw new NotFoundException({ code: 'EXEMPTION_NOT_FOUND', message: 'الإعفاء غير موجود' })
      const facts = await this.org.facts(em, user)
      const employee = await em.getRepository(Employee).findOne({ where: { id: row.employeeId }, select: { id: true, branchId: true, departmentId: true } })
      if (!this.visible(user, facts, row, employee)) forbidden('EXEMPTION_FORBIDDEN', 'الإعفاء خارج نطاقك')
      const [view] = await this.views(em, user, [row])
      const events = await em.getRepository(PayrollFinancialExemptionEvent).find({ where: { exemptionId: id }, order: { id: 'ASC' } })
      const names = await this.names(em, [row])
      const actors = events.map(event => event.actorUserId).filter((value): value is number => !!value)
      const actorNames = actors.length ? new Map((await em.query(`SELECT [id],[displayName] FROM [users] WHERE [id] IN (${actors.map((_, i) => `@${i}`).join(',')})`, actors) as Array<{ id: number; displayName: string | null }>)
        .map(entry => [Number(entry.id), entry.displayName || `مستخدم #${entry.id}`])) : names.users
      return { ...view, events: events.map(event => ({ id: event.id, eventType: event.eventType, fromStatus: event.fromStatus, toStatus: event.toStatus, reason: event.reason,
        actorName: event.actorUserId ? actorNames.get(event.actorUserId) ?? null : null, createdAt: event.createdAt, payload: parseJson(event.payload, null) })) }
    })
  }

  /** قائمة إعفاءات مسير للشاشة: الحالة وحدود المنح وصلاحيات المستخدم، وهل تغيّرت الإعفاءات بعد آخر حساب (إعادة الحساب مطلوبة). */
  async runView(user: JwtPayload, runId: number) {
    return this.manager.transaction(async em => {
      const run = await this.loadRun(em, runId)
      const facts = await this.org.facts(em, user)
      if (!this.privileged(user) && !facts.departments.size) forbidden('EXEMPTION_FORBIDDEN', 'عرض إعفاءات المسير يتطلب صلاحية الإعفاءات أو إدارة قسم')
      const orgs = await this.runOrgs(em, runId)
      await this.assertRunInScope(em, user, facts, runId, orgs)
      const settings = await this.settings(em)
      const rows = await em.getRepository(PayrollFinancialExemption).find({ where: { runId }, order: { id: 'DESC' } })
      const employees = rows.length ? new Map((await em.getRepository(Employee).find({ where: { id: In([...new Set(rows.map(row => row.employeeId))]) }, select: { id: true, branchId: true, departmentId: true } })).map(row => [row.id, row])) : new Map<number, Employee>()
      const visibleRows = rows.filter(row => this.visible(user, facts, row, employees.get(row.employeeId)))
      let recalcEmployeeIds: number[] = []
      if (run.status === 'CALCULATED') {
        const applied: Array<{ employeeId: number; applied: string | null }> = await em.query(`SELECT [employeeId], JSON_QUERY([breakdown], '$.financialExemptions.applied') AS [applied] FROM [payroll_items] WHERE [runId]=@0`, [runId])
        const active = rows.filter(row => row.status === 'ACTIVE')
        const key = (list: Array<{ id: number; revision: number }>) => JSON.stringify([...list].map(entry => ({ id: Number(entry.id), revision: Number(entry.revision) })).sort((a, b) => a.id - b.id))
        const visibleEmployees = new Set(visibleRows.map(row => row.employeeId))
        recalcEmployeeIds = applied.filter(item => key(parseJson(item.applied, [])) !== key(active.filter(row => row.employeeId === item.employeeId)))
          .map(item => Number(item.employeeId)).filter(id => (this.privileged(user) && this.inBranch(user, orgs.get(id)?.branchId)) || visibleEmployees.has(id)).sort((a, b) => a - b)
      }
      return {
        run: { id: run.id, name: run.name, period: run.period, status: run.status, statusLabel: RUN_STATUS_LABELS[run.status] ?? run.status, snapshotVersion: run.snapshotVersion },
        settings: { reasonMinLength: settings.reasonMinLength, attachmentThresholdDays: settings.attachmentDays, maxPerEmployeeYear: settings.maxPerEmployeeYear, cooldownHours: settings.cooldownHours,
          maxPctPerGrantor: settings.maxPctPerGrantor },
        permissions: { canGrant: run.status === 'CALCULATED' && (userHasPerm(user, GRANT) || facts.departments.size > 0), canApprove: userHasPerm(user, APPROVE), canOverride: userHasPerm(user, OVERRIDE) },
        recalcRequired: recalcEmployeeIds.length > 0, recalcEmployeeIds, pendingApproval: visibleRows.filter(row => row.status === 'PENDING_APPROVAL').length,
        labels: EXEMPTION_LABELS, exemptions: await this.views(em, user, visibleRows),
      }
    })
  }

  /** من يمكن للمستخدم إعفاؤه في المسير، أو (مع employeeId) خصومات الموظف القابلة للإعفاء في آخر حساب مع المحمي والحدود. */
  async candidates(user: JwtPayload, runId: number, employeeId?: number) {
    return this.manager.transaction(async em => {
      const run = await this.loadRun(em, runId)
      const settings = await this.settings(em)
      const facts = await this.org.facts(em, user)
      const hr = userHasPerm(user, GRANT)
      if (!hr && !facts.departments.size) forbidden('EXEMPTION_FORBIDDEN', 'منح الإعفاء المالي للموارد البشرية أو لمدير القسم أو الجهة المالكة')
      await this.assertRunInScope(em, user, facts, runId, await this.runOrgs(em, runId))
      const ownedTypes = facts.departments.size ? new Set((await em.getRepository(DeductionType).find({ select: { id: true, ownerDepartmentId: true } }))
        .filter(type => type.ownerDepartmentId && facts.departments.has(type.ownerDepartmentId)).map(type => type.id)) : new Set<number>()
      const basesOf = (org: Pick<MemberOrg, 'branchId' | 'departmentId' | 'employeeId'>, typedTypeIds: number[]) => {
        const bases: ExemptionGrantorBasis[] = []
        if (hr && this.inBranch(user, org.branchId)) bases.push('HR')
        if (settings.departmentManagerEnabled && org.departmentId && facts.departments.has(org.departmentId)) bases.push('DEPARTMENT_MANAGER')
        if (typedTypeIds.some(id => ownedTypes.has(id))) bases.push('FUNCTION_OWNER')
        return bases
      }
      if (employeeId === undefined) {
        const members = await em.getRepository(PayrollRunMember).find({ where: { runId } })
        const itemIds = new Set((await em.getRepository(PayrollItem).find({ where: { runId }, select: { id: true, employeeId: true } })).map(item => item.employeeId))
        const typedByEmployee = new Map<number, number[]>()
        if (ownedTypes.size && members.length) {
          const rows: Array<{ employeeId: number; deductionTypeId: number }> = await em.query(`SELECT DISTINCT o.[employeeId], r.[deductionTypeId] FROM [employee_obligations] o
            INNER JOIN [deduction_requests] r ON r.[id]=o.[deductionRequestId] INNER JOIN [payroll_items] i ON i.[employeeId]=o.[employeeId] AND i.[runId]=@0
            WHERE o.[status]='PENDING' AND o.[type]='DEBIT'`, [runId])
          for (const row of rows) typedByEmployee.set(Number(row.employeeId), [...(typedByEmployee.get(Number(row.employeeId)) ?? []), Number(row.deductionTypeId)])
        }
        return { run: { id: run.id, name: run.name, period: run.period, status: run.status }, employees: members
          .filter(member => itemIds.has(member.employeeId) && member.membershipStatus !== 'EXCLUDED' && member.employeeId !== Number(user.employeeId ?? 0) && !facts.superiors.has(member.employeeId))
          .map(member => ({ employeeId: member.employeeId, fullName: member.snapshot?.fullName ?? null, employeeCode: member.snapshot?.employeeCode ?? null,
            branchId: member.snapshot?.branchId ?? null, departmentId: member.snapshot?.departmentId ?? null,
            bases: basesOf({ employeeId: member.employeeId, branchId: member.snapshot?.branchId ?? null, departmentId: member.snapshot?.departmentId ?? null }, typedByEmployee.get(member.employeeId) ?? []) }))
          .filter(row => row.bases.length).map(row => ({ ...row, basisLabels: row.bases.map(basis => EXEMPTION_LABELS.bases[basis]) }))
          .sort((a, b) => (a.fullName ?? '').localeCompare(b.fullName ?? '', 'ar')) }
      }
      const org = await this.memberOrg(em, run, employeeId)
      const entries = await this.itemEntries(em, run, employeeId)
      const bases = basesOf(org, entries.debits.map(row => row.deductionTypeId).filter((id): id is number => !!id))
      if (!bases.length) forbidden('EXEMPTION_OUT_OF_SCOPE', 'الموظف خارج نطاق منح الإعفاء لك')
      if (Number(user.employeeId ?? 0) === employeeId) forbidden('EXEMPTION_SELF', 'لا يمنح المستخدم إعفاءً ماليًا لنفسه')
      if (facts.superiors.has(employeeId)) forbidden('EXEMPTION_SUPERIOR', 'لا يُعفى من يعلوك إداريًا (فصل مهام)')
      const absent = new Set(entries.attendance.absentDates)
      const dates = [...new Set([...entries.attendance.days.filter(day => day.lateness > 0 || day.shortfall > 0).map(day => day.date), ...absent])].sort()
      const protectedCategory = (category: string | null | undefined) => EXEMPTION_PROTECTED_TYPED_CATEGORIES.includes(category ?? '')
      const ownCreator = (row: { creatorUserId: number | null }) => row.creatorUserId !== null && row.creatorUserId === user.sub
      const typed = entries.debits.filter(row => row.deductionRequestId != null)
      const typeGroups = new Map<number, { deductionTypeId: number; typeName: string | null; exemptable: boolean; amount: number }>()
      for (const row of typed) {
        if (!row.deductionTypeId) continue
        const group = typeGroups.get(row.deductionTypeId) ?? { deductionTypeId: row.deductionTypeId, typeName: row.typeName ?? null, exemptable: !(protectedCategory(row.typedCategory) || row.isExemptable === false), amount: 0 }
        group.amount += row.amount
        typeGroups.set(row.deductionTypeId, group)
      }
      const live = await em.getRepository(PayrollFinancialExemption).find({ where: { runId, employeeId }, order: { id: 'DESC' } })
      return {
        run: { id: run.id, name: run.name, period: run.period, status: run.status }, employee: org, bases, basisLabels: bases.map(basis => EXEMPTION_LABELS.bases[basis]),
        dayRate: money(entries.dayRate), attachmentThreshold: exemptionAttachmentThreshold(entries.dayRate, settings.attachmentDays), attachmentThresholdDays: settings.attachmentDays,
        requested: { lateness: money(entries.attendance.requested.lateness), shortfall: money(entries.attendance.requested.shortfall), absence: money(entries.attendance.requested.absence) },
        attendanceDays: dates.map(date => {
          const day = entries.attendance.days.find(row => row.date === date)
          return { date, lateness: money(day?.lateness ?? 0), shortfall: money(day?.shortfall ?? 0), absence: money(absent.has(date) ? entries.attendance.absenceDayAmount : 0) }
        }),
        typedObligations: typed.map(row => ({ obligationId: row.id, amount: money(row.amount), deductionTypeId: row.deductionTypeId, typeName: row.typeName, typedCategory: row.typedCategory,
          targetPeriod: row.targetPeriod, label: row.label, exemptable: !(protectedCategory(row.typedCategory) || row.isExemptable === false || ownCreator(row)),
          // فصل المهام (EX-03 قاعدة 2): من أنزل الخصم لا يلغيه. يُقال على الشاشة قبل الضغط بدل رفض 403 بعده.
          protectedReason: protectedCategory(row.typedCategory) ? 'استقطاع نظامي أو حكم قضائي: غير قابل للإعفاء إطلاقًا'
            : row.isExemptable === false ? 'نوع الخصم معرّف غير قابل للإعفاء'
            : ownCreator(row) ? 'أنت من أنزل هذا الخصم؛ يلغيه مستخدم آخر' : null })),
        typedTypes: [...typeGroups.values()].map(group => ({ ...group, amount: money(group.amount) })),
        recoveries: entries.debits.filter(row => row.deductionRequestId == null).map(row => ({ obligationId: row.id, amount: money(row.amount), label: row.label, category: row.category,
          protectedReason: 'استرداد غير مصنف لا يقبل الإعفاء المالي؛ يُعالج من مصدره' })),
        installments: entries.installments, unpaidLeave: money(entries.unpaidLeave),
        exemptions: await this.views(em, user, live),
      }
    })
  }

  async list(user: JwtPayload, query: ExemptionListQueryDto) {
    return this.manager.transaction(async em => {
      const facts = await this.org.facts(em, user)
      if (!this.privileged(user) && !facts.departments.size) forbidden('EXEMPTION_FORBIDDEN', 'قائمة الإعفاءات تتطلب صلاحية الإعفاءات أو إدارة قسم')
      const where: Record<string, unknown> = {}
      if (query.runId) where.runId = query.runId
      if (query.employeeId) where.employeeId = query.employeeId
      if (query.status) where.status = query.status
      if (query.period) where.period = query.period
      const rows = await em.getRepository(PayrollFinancialExemption).find({ where, order: { id: 'DESC' }, take: 2000 })
      const employees = rows.length ? new Map((await em.getRepository(Employee).find({ where: { id: In([...new Set(rows.map(row => row.employeeId))]) }, select: { id: true, branchId: true, departmentId: true } })).map(row => [row.id, row])) : new Map<number, Employee>()
      return this.views(em, user, rows.filter(row => this.visible(user, facts, row, employees.get(row.employeeId))).slice(0, 500))
    })
  }

  /** الموظف يرى كل إعفاء عليه برقمه وحالته وسببه والمانح بالدور (EX-03 قاعدة 5، EX-04). */
  async mine(user: JwtPayload) {
    const employeeId = Number(user.employeeId ?? 0)
    if (!Number.isSafeInteger(employeeId) || employeeId < 1) return []
    return this.manager.transaction(async em => {
      const rows = await em.getRepository(PayrollFinancialExemption).find({ where: { employeeId }, order: { id: 'DESC' }, take: 200 })
      const { runs, types } = await this.names(em, rows)
      return rows.map(row => ({ id: row.id, runId: row.runId, runName: runs.get(row.runId)?.name ?? null, period: row.period,
        targetLabel: exemptionTargetLabel(exemptionRuleOf(row), row.deductionTypeId ? types.get(row.deductionTypeId) ?? null : null),
        dispositionLabel: EXEMPTION_LABELS.dispositions[row.disposition as ExemptionDisposition] ?? row.disposition, status: row.status,
        statusLabel: EXEMPTION_LABELS.statuses[row.status as 'ACTIVE'] ?? row.status, reason: row.reason,
        grantorBasisLabel: EXEMPTION_LABELS.bases[row.grantorBasis as ExemptionGrantorBasis] ?? row.grantorBasis,
        amount: money(row.exemptedAmountSnapshot ?? row.estimatedAmount), amountIsFinal: row.status === 'APPLIED', grantedAt: row.createdAt,
        lines: row.status === 'APPLIED' ? parseJson(row.appliedLines, []) : [] }))
    })
  }

  /** المسيرات المحسوبة التي يستطيع المستخدم منح إعفاء فيها (للمدير الهيكلي بلا صلاحية المسير، وللموارد البشرية). */
  async grantableRuns(user: JwtPayload) {
    return this.manager.transaction(async em => {
      const facts = await this.org.facts(em, user)
      const hr = userHasPerm(user, GRANT)
      if (!hr && !facts.departments.size) return []
      const settings = await this.settings(em)
      const rows: Array<{ runId: number; name: string | null; period: string; employeeId: number; branchId: number | null; departmentId: number | null }> = await em.query(`SELECT r.[id] AS [runId], r.[name], r.[period], m.[employeeId],
        TRY_CAST(JSON_VALUE(CAST(m.[snapshot] AS nvarchar(max)), '$.branchId') AS int) AS [branchId], TRY_CAST(JSON_VALUE(CAST(m.[snapshot] AS nvarchar(max)), '$.departmentId') AS int) AS [departmentId]
        FROM [payroll_runs] r INNER JOIN [payroll_run_members] m ON m.[runId]=r.[id] INNER JOIN [payroll_items] i ON i.[runId]=r.[id] AND i.[employeeId]=m.[employeeId]
        WHERE r.[status]='CALCULATED' AND (m.[membershipStatus] IS NULL OR m.[membershipStatus] <> 'EXCLUDED')`)
      const runs = new Map<number, { id: number; name: string | null; period: string; candidates: number }>()
      for (const row of rows) {
        if (Number(row.employeeId) === Number(user.employeeId ?? 0) || facts.superiors.has(Number(row.employeeId))) continue
        const eligible = (hr && this.inBranch(user, row.branchId)) || (settings.departmentManagerEnabled && row.departmentId != null && facts.departments.has(Number(row.departmentId)))
        if (!eligible) continue
        const entry = runs.get(Number(row.runId)) ?? { id: Number(row.runId), name: row.name, period: row.period, candidates: 0 }
        entry.candidates++
        runs.set(entry.id, entry)
      }
      return [...runs.values()].sort((a, b) => b.period.localeCompare(a.period) || b.id - a.id)
    })
  }

  /**
   * EX-06: تقرير حوكمة الإعفاءات لفترة — بحسب المانح والموظف ونوع الخصم والمسير، مع التنبيهات والاستثناءات والمطابقة.
   * المبالغ من اللقطات (exemptedAmountSnapshot) للمسيرات المعتمدة والمصروفة، لا من القيود الحية.
   */
  async report(user: JwtPayload, query: ExemptionReportQueryDto) {
    if (!userHasPerm(user, VIEW)) forbidden('EXEMPTION_FORBIDDEN', 'تقرير حوكمة الإعفاءات يتطلب صلاحية عرض الإعفاءات')
    if (query.fromPeriod > query.toPeriod) bad('EXEMPTION_REPORT_RANGE', 'شهر البداية بعد شهر النهاية')
    return this.manager.transaction(async em => {
      const settings = await this.settings(em)
      const all = await em.createQueryBuilder(PayrollFinancialExemption, 'e').where('e.period >= :from AND e.period <= :to', { from: query.fromPeriod, to: query.toPeriod }).orderBy('e.id', 'ASC').getMany()
      const employeeRows = all.length ? await em.getRepository(Employee).find({ where: { id: In([...new Set(all.map(row => row.employeeId))]) }, select: { id: true, fullName: true, employeeCode: true, branchId: true, departmentId: true } }) : []
      const employeeMap = new Map(employeeRows.map(row => [row.id, row]))
      const rows = all.filter(row => this.inBranch(user, this.orgOfRow(row).branchId ?? employeeMap.get(row.employeeId)?.branchId ?? null))
      const { users, runs, types } = await this.names(em, rows)
      const closedRuns: Array<{ id: number; name: string | null; period: string; status: string; totalNet: number; branchId: number | null }> = await em.query(`SELECT [id],[name],[period],[status],[totalNet],[branchId] FROM [payroll_runs]
        WHERE [period] >= @0 AND [period] <= @1 AND [status] IN ('APPROVED','PAID')`, [query.fromPeriod, query.toPeriod])
      const closedIds = closedRuns.map(run => Number(run.id))
      // C8 / الخطوة 31: بند الموظف الذي نُفّذ عكس صرفه لا يدخل المطابقة ولا المبالغ (صرفه الفعلي وإعفاؤه المنقول في المسير التكميلي)؛ الصفوف تبقى في العدد والحالات
      const reversedPairs = await postedReversalPairs(em, closedIds)
      const applied = rows.filter(row => row.status === 'APPLIED' && closedIds.includes(row.runId) && !reversedPairs.has(`${row.runId}:${row.employeeId}`))
      const amountOf = (row: PayrollFinancialExemption) => cents(row.exemptedAmountSnapshot ?? 0)
      const items: Array<{ runId: number; employeeId: number; lateness: number; shortfall: number; absence: number; other: number; loans: number; exempted: number | null; byComponent: string | null; branchId: number | null }> = closedIds.length
        ? await em.query(`SELECT i.[runId], i.[employeeId], i.[latenessDeduction] AS [lateness], i.[shortfallDeduction] AS [shortfall], i.[absenceDeduction] AS [absence], i.[otherDeductions] AS [other],
            i.[loanInstallments] AS [loans], TRY_CAST(JSON_VALUE(i.[breakdown], '$.financialExemptions.totals.exempted') AS decimal(18,2)) AS [exempted],
            JSON_QUERY(i.[breakdown], '$.financialExemptions.totals.byComponent') AS [byComponent], TRY_CAST(JSON_VALUE(CAST(m.[snapshot] AS nvarchar(max)), '$.branchId') AS int) AS [branchId]
            FROM [payroll_items] i LEFT JOIN [payroll_run_members] m ON m.[runId]=i.[runId] AND m.[employeeId]=i.[employeeId] WHERE i.[runId] IN (${closedIds.map((_, index) => `@${index}`).join(',')})
              AND ${payrollLineNotReversedSql('i.[runId]', 'i.[employeeId]')}`, closedIds)
        : []
      const scopedItems = items.filter(item => this.inBranch(user, item.branchId))
      const collected = scopedItems.reduce((sum, item) => sum + cents(item.lateness) + cents(item.shortfall) + cents(item.absence) + cents(item.other) + cents(item.loans), 0)
      const exemptedTotal = applied.reduce((sum, row) => sum + amountOf(row), 0)
      const breakdownTotal = scopedItems.reduce((sum, item) => sum + cents(item.exempted ?? 0), 0)
      const text = (value: number) => (value / 100).toFixed(2)
      const pct = (part: number, whole: number) => whole > 0 ? Math.round((part / whole) * 10000) / 100 : 0

      // 1) بحسب المانح: العدد والمبلغ ونسبته من خصومات المسيرات التي أعفى فيها، ونسب المعتمد والمرفوض
      const byGrantorMap = new Map<number, { rows: PayrollFinancialExemption[] }>()
      for (const row of rows) byGrantorMap.set(row.grantedByUserId, { rows: [...(byGrantorMap.get(row.grantedByUserId)?.rows ?? []), row] })
      const runBase = new Map<number, number>()
      for (const item of scopedItems) runBase.set(item.runId, (runBase.get(item.runId) ?? 0) + cents(item.lateness) + cents(item.shortfall) + cents(item.absence) + cents(item.other) + cents(item.loans) + cents(item.exempted ?? 0))
      const byGrantor = [...byGrantorMap.entries()].map(([userId, group]) => {
        const grantorApplied = group.rows.filter(row => applied.includes(row))
        const amount = grantorApplied.reduce((sum, row) => sum + amountOf(row), 0)
        const base = [...new Set(grantorApplied.map(row => row.runId))].reduce((sum, runId) => sum + (runBase.get(runId) ?? 0), 0)
        const share = pct(amount, base)
        return { userId, name: users.get(userId) ?? null, bases: [...new Set(group.rows.map(row => EXEMPTION_LABELS.bases[row.grantorBasis as ExemptionGrantorBasis] ?? row.grantorBasis))],
          count: group.rows.length, applied: grantorApplied.length, approvedOrActive: group.rows.filter(row => ['ACTIVE', 'APPLIED'].includes(row.status)).length,
          rejected: group.rows.filter(row => row.status === 'REJECTED').length, revoked: group.rows.filter(row => row.status === 'REVOKED').length,
          amount: text(amount), pctOfScopeDeductions: share, flagged: settings.maxPctPerGrantor > 0 && share > settings.maxPctPerGrantor }
      }).sort((a, b) => Number(b.amount) - Number(a.amount))

      // 2) بحسب الموظف: التكرار خلال 3/6/12 شهرًا (من كل الإعفاءات غير المرفوضة) والمبلغ والأنواع
      const employeeIds = [...new Set(rows.map(row => row.employeeId))]
      const history: Array<{ employeeId: number; months: number }> = employeeIds.length ? await em.query(`SELECT e.[employeeId], DATEDIFF(month, e.[createdAt], SYSUTCDATETIME()) AS [months] FROM [payroll_financial_exemptions] e
        WHERE e.[status] IN ('PENDING_APPROVAL','ACTIVE','APPLIED') AND e.[createdAt] >= DATEADD(month, -12, SYSUTCDATETIME()) AND e.[employeeId] IN (${employeeIds.map((_, index) => `@${index}`).join(',')})
          AND (${EXEMPTION_NOT_REVERSED_DECISION_SQL})`, employeeIds) : []
      const byEmployee = employeeIds.map(employeeId => {
        const own = rows.filter(row => row.employeeId === employeeId)
        const within = (months: number) => history.filter(entry => Number(entry.employeeId) === employeeId && Number(entry.months) < months).length
        const employee = employeeMap.get(employeeId)
        return { employeeId, fullName: employee?.fullName ?? null, employeeCode: employee?.employeeCode ?? null, last3Months: within(3), last6Months: within(6), last12Months: within(12),
          amount: text(own.filter(row => applied.includes(row)).reduce((sum, row) => sum + amountOf(row), 0)),
          targets: [...new Set(own.map(row => exemptionTargetLabel(exemptionRuleOf(row), row.deductionTypeId ? types.get(row.deductionTypeId) ?? null : null)))],
          flaggedRepeat: within(6) >= settings.repeatAlertCount }
      }).sort((a, b) => b.last12Months - a.last12Months || Number(b.amount) - Number(a.amount))

      // 3) بحسب نوع الخصم: معدل التفريغ = المُعفى ÷ (المُعفى + المحصل)
      const exemptedByKey = new Map<string, { label: string; cents: number }>()
      for (const row of applied) {
        for (const line of parseJson<ExemptionLine[]>(row.appliedLines, [])) {
          const key = line.component === 'TYPED' ? `TYPED:${line.label.split(' — ')[0]}` : line.component
          const label = line.component === 'TYPED' ? line.label.split(' — ')[0] : EXEMPTION_LABELS.components[line.component]
          exemptedByKey.set(key, { label, cents: (exemptedByKey.get(key)?.cents ?? 0) + cents(line.exemptedAmount) })
        }
      }
      const collectedByKey = new Map<string, number>([['LATENESS', scopedItems.reduce((sum, item) => sum + cents(item.lateness), 0)], ['SHORTFALL', scopedItems.reduce((sum, item) => sum + cents(item.shortfall), 0)],
        ['ABSENCE', scopedItems.reduce((sum, item) => sum + cents(item.absence), 0)], ['LOAN', scopedItems.reduce((sum, item) => sum + cents(item.loans), 0)]])
      if (closedIds.length) {
        const typedCollected: Array<{ nameAr: string | null; amount: number; employeeId: number }> = await em.query(`SELECT JSON_VALUE(r.[typeSnapshot], '$.nameAr') AS [nameAr], COALESCE(o.[appliedAmount], o.[amount]) AS [amount], o.[employeeId]
          FROM [employee_obligations] o INNER JOIN [deduction_requests] r ON r.[id]=o.[deductionRequestId]
          WHERE o.[status]='APPLIED' AND o.[type]='DEBIT' AND o.[payrollReversalRunId] IS NULL AND o.[appliedPayrollRunId] IN (${closedIds.map((_, index) => `@${index}`).join(',')})`, closedIds)
        const scopedEmployees = new Set(scopedItems.map(item => Number(item.employeeId)))
        for (const row of typedCollected) if (scopedEmployees.has(Number(row.employeeId))) collectedByKey.set(`TYPED:${row.nameAr ?? 'خصم مصنف'}`, (collectedByKey.get(`TYPED:${row.nameAr ?? 'خصم مصنف'}`) ?? 0) + cents(row.amount))
      }
      const byType = [...exemptedByKey.entries()].map(([key, value]) => {
        const collectedCents = collectedByKey.get(key) ?? 0, rate = pct(value.cents, value.cents + collectedCents)
        return { key, label: value.label, exempted: text(value.cents), collected: text(collectedCents), drainRatePct: rate, flagged: rate > settings.typeDrainAlertPct }
      }).sort((a, b) => b.drainRatePct - a.drainRatePct)

      // 4) بحسب المسير: المُعفى والمكافآت المصروفة وأثرهما
      const bonuses: Array<{ runId: number; amount: number }> = closedIds.length ? await em.query(`SELECT [appliedPayrollRunId] AS [runId], SUM(COALESCE([appliedAmount],[amount])) AS [amount] FROM [employee_obligations]
        WHERE [status]='APPLIED' AND [type]='CREDIT' AND [category]='bonus' AND [payrollReversalRunId] IS NULL AND [appliedPayrollRunId] IN (${closedIds.map((_, index) => `@${index}`).join(',')}) GROUP BY [appliedPayrollRunId]`, closedIds) : []
      const byRun = closedRuns.filter(run => scopedItems.some(item => item.runId === Number(run.id))).map(run => ({ runId: Number(run.id), name: run.name, period: run.period, status: run.status,
        statusLabel: RUN_STATUS_LABELS[run.status] ?? run.status, exempted: text(applied.filter(row => row.runId === Number(run.id)).reduce((sum, row) => sum + amountOf(row), 0)),
        bonuses: text(cents(bonuses.find(row => Number(row.runId) === Number(run.id))?.amount ?? 0)), totalNet: money(run.totalNet) }))
        .sort((a, b) => a.period.localeCompare(b.period) || a.runId - b.runId)

      // 5) الاستثناءات: فوق حد المرفق بلا مرفق، وإعادة الإعفاء بعد إلغاء، ومنح المدير الهيكلي المرفوض، وتجاوزات الحدود
      const exceptions = {
        aboveThresholdWithoutAttachment: applied.filter(row => !row.attachmentRef && Number(row.exemptedAmountSnapshot ?? 0) > Number(parseJson<Record<string, any>>(row.evaluation, {}).attachmentThreshold ?? Infinity))
          .map(row => ({ id: row.id, employeeId: row.employeeId, amount: money(row.exemptedAmountSnapshot), threshold: parseJson<Record<string, any>>(row.evaluation, {}).attachmentThreshold })),
        reexemptionsAfterRevoke: rows.filter(row => parseJson<Array<{ limit?: string }>>(row.overrides, []).some(entry => entry.limit === 'reexempt_after_revoke')).map(row => ({ id: row.id, employeeId: row.employeeId })),
        rejectedStructuralGrants: rows.filter(row => row.status === 'REJECTED' && row.grantorBasis !== 'HR').map(row => ({ id: row.id, employeeId: row.employeeId, basisLabel: EXEMPTION_LABELS.bases[row.grantorBasis as ExemptionGrantorBasis], decisionReason: row.decisionReason })),
        limitOverrides: rows.filter(row => parseJson<unknown[]>(row.overrides, []).length).map(row => ({ id: row.id, employeeId: row.employeeId, overrides: parseJson(row.overrides, []) })),
      }
      return {
        period: { from: query.fromPeriod, to: query.toPeriod },
        thresholds: { repeatAlertCount: settings.repeatAlertCount, maxPctPerGrantor: settings.maxPctPerGrantor, typeDrainAlertPct: settings.typeDrainAlertPct },
        totals: { exemptions: rows.length, applied: applied.length, pending: rows.filter(row => row.status === 'PENDING_APPROVAL').length, active: rows.filter(row => row.status === 'ACTIVE').length,
          rejected: rows.filter(row => row.status === 'REJECTED').length, revoked: rows.filter(row => row.status === 'REVOKED').length, expired: rows.filter(row => row.status === 'EXPIRED').length,
          exemptedAmount: text(exemptedTotal), collectedDeductions: text(collected), exemptedPctOfDeductions: pct(exemptedTotal, exemptedTotal + collected) },
        // المطابقة (EX-06): مجموع اللقطات = مجموع تفصيل الإعفاء المحفوظ في بنود المسيرات المعتمدة والمصروفة للفترة
        reconciliation: { snapshots: text(exemptedTotal), payrollItems: text(breakdownTotal), difference: text(exemptedTotal - breakdownTotal) },
        alerts: { grantors: byGrantor.filter(row => row.flagged), employees: byEmployee.filter(row => row.flaggedRepeat), types: byType.filter(row => row.flagged) },
        byGrantor, byEmployee, byType, byRun, exceptions,
      }
    })
  }
}
