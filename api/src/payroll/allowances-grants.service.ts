import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, In, Repository } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { assertCompanyWideWrite, branchForWrite, branchScopeOf, inBranchScope, isEmptyBranchScope, scopeWord } from '../auth/guards'
import type { BranchScope } from '../auth/guards'
import { EmployeeObligation } from '../requests/entities/financial.entities'
import {
  ALLOWANCE_LINE_STATE_LABELS, ALLOWANCE_MAX_EMPLOYEES, ALLOWANCE_OBLIGATION_CATEGORY, ALLOWANCE_SOURCE_PREFIX, AllowanceTarget,
  allowanceAmount, allowanceLineCancellable, allowanceLineState, allowanceTypeCode, allowanceTypeName, isAllowanceTargetLevel,
  parseObligationIdWindow, resolveAllowanceTargetEmployees, uniqueIds,
} from './allowances-grants'
import { PayrollAllowanceGrant, PayrollAllowanceGrantLine, PayrollAllowanceType } from './allowances-grants.entities'
import { salaryPayrollPeriodBounds } from './payroll-period-salary'
import { lockPayrollEmployees } from './payroll-settlement-boundary'

// «تابة البدلات» في شاشة المسير: أنواع البدلات، وصرف بدل لشهر على استهداف (سطر لكل موظف + إضافة في دفتر المديونيات)،
// والقائمة بالحالة والمسير والإجماليات، والإلغاء قبل اعتماد المسير. عزل الفروع: حساب الفرع يشوف ويعدّل فرعه بس،
// والشركة كلها (نوع أو صرف) لحساب على مستوى الشركة.

export interface AllowanceTypeInput { name: string; code?: string | null; branchId?: number | null }
export interface AllowanceTypeUpdate { name?: string; isActive?: boolean }
export interface AllowanceGrantInput {
  period: string
  allowanceTypeId: number
  amount: string | number
  targetLevel: string
  branchId?: number | null
  departmentIds?: number[]
  teamIds?: number[]
  employeeIds?: number[]
  reason: string
}

interface RunRef { id: number; name: string | null; status: string; period: string }
interface OpenRunItem extends RunRef { employeeId: number; obligationIds: number[] }

const OPEN_STATUSES = ['DRAFT', 'CALCULATED', 'IN_REVIEW']
const cents = (value: unknown) => Math.round(Number(value ?? 0) * 100)
const money = (value: number) => value / 100
const idList = (ids: number[], offset = 0) => ids.map((_, index) => `@${index + offset}`).join(', ')
const chunks = <T>(rows: T[], size = 500) => Array.from({ length: Math.ceil(rows.length / size) }, (_, index) => rows.slice(index * size, (index + 1) * size))
const parseIds = (raw: string | null | undefined) => { try { return uniqueIds(JSON.parse(raw ?? '[]')) } catch { return [] } }

@Injectable()
export class PayrollAllowancesService {
  constructor(@InjectRepository(PayrollAllowanceType) private readonly types: Repository<PayrollAllowanceType>) {}

  private get em(): EntityManager { return this.types.manager }

  private period(value: unknown): string {
    if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) throw new BadRequestException('اختار الشهر بصيغة YYYY-MM')
    return value
  }

  private scope(user: JwtPayload): BranchScope {
    const scope = branchScopeOf(user)
    if (isEmptyBranchScope(scope)) throw new ForbiddenException('حسابك مش مربوط بفرع')
    return scope
  }

  private async branchNames(em: EntityManager = this.em) {
    const rows: Array<{ id: number; name: string }> = await em.query('SELECT [id], [name] FROM [branches]')
    return new Map(rows.map(row => [Number(row.id), row.name]))
  }

  private async orgNames(em: EntityManager = this.em) {
    const map = (rows: Array<{ id: number; name: string }>) => new Map(rows.map(row => [Number(row.id), row.name]))
    return {
      branches: await this.branchNames(em),
      departments: map(await em.query('SELECT [id], [name] FROM [departments]')),
      teams: map(await em.query('SELECT [id], [name] FROM [teams]')),
    }
  }

  private async userNames(ids: number[]) {
    const map = new Map<number, string>()
    for (const chunk of chunks(uniqueIds(ids))) {
      const rows: Array<{ id: number; displayName: string | null }> = await this.em.query(`SELECT [id], [displayName] FROM [users] WHERE [id] IN (${idList(chunk)})`, chunk)
      for (const row of rows) map.set(Number(row.id), row.displayName || `مستخدم #${row.id}`)
    }
    return map
  }

  private async cycleStartDay(em: EntityManager) {
    const rows: Array<{ value: string }> = await em.query(`SELECT [value] FROM [requests_config] WHERE [key] = 'payroll.cycle_start_day'`)
    const cycle = Number(rows[0]?.value ?? '23')
    return Number.isInteger(cycle) && cycle >= 1 && cycle <= 31 ? cycle : 23
  }

  // ===== أنواع البدلات =====
  private typeView(row: PayrollAllowanceType, scope: BranchScope, branches: Map<number, string>) {
    return { id: row.id, code: row.code, name: row.name, branchId: row.branchId, branchName: row.branchId ? branches.get(row.branchId) ?? `فرع #${row.branchId}` : null,
      isActive: row.isActive, canEdit: scope === null || (row.branchId !== null && inBranchScope(scope, row.branchId)) }
  }

  async listTypes(user: JwtPayload) {
    const scope = this.scope(user)
    const rows = await this.types.find({ order: { name: 'ASC', id: 'ASC' } })
    const branches = await this.branchNames()
    return rows.filter(row => row.branchId === null || inBranchScope(scope, row.branchId))
      .sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name, 'ar'))
      .map(row => this.typeView(row, scope, branches))
  }

  // نوع الشركة ما يتكررش اسمه في أي مكان، ونوع الفرع ما يتكررش مع الشركة أو مع نفس الفرع
  private async assertUniqueName(name: string, branchId: number | null, exceptId?: number) {
    const same = (await this.types.find()).filter(row => row.id !== exceptId && row.name.trim() === name &&
      (branchId === null || row.branchId === null || row.branchId === branchId))
    if (same.length) throw new BadRequestException(same[0].isActive ? 'في بدل بنفس الاسم' : 'في بدل بنفس الاسم بس موقوف — فعّله بدل ما تعمل واحد جديد')
  }

  async createType(user: JwtPayload, input: AllowanceTypeInput) {
    const scope = this.scope(user)
    const name = allowanceTypeName(input.name)
    // حساب الفرع الواحد: فرعه تلقائيًا؛ حساب الفروع المتعددة لازم يختار فرع منها (مفيش اختيار صامت)
    const branchId: number | null = input.branchId == null ? (scope === null ? null : branchForWrite(scope, null)) : Number(input.branchId)
    if (branchId === null) assertCompanyWideWrite(user)
    else {
      if (!Number.isSafeInteger(branchId) || branchId < 1) throw new BadRequestException('اختار الفرع')
      if (!inBranchScope(scope, branchId)) throw new ForbiddenException(`صلاحيتك على ${scopeWord(scope)} بس`)
      const [branch] = await this.em.query('SELECT [id] FROM [branches] WHERE [id] = @0', [branchId])
      if (!branch) throw new BadRequestException('الفرع مش موجود')
    }
    await this.assertUniqueName(name, branchId)
    const code = allowanceTypeCode(input.code, () => `ALW-${Date.now().toString(36).toUpperCase()}`)
    if (await this.types.findOneBy({ code })) throw new BadRequestException('الكود ده مستخدم لبدل تاني')
    const saved = await this.types.save(this.types.create({ code, name, branchId, isActive: true, createdByUserId: user.sub, updatedByUserId: null, updatedAt: null }))
    return this.typeView(saved, scope, await this.branchNames())
  }

  private async editableType(user: JwtPayload, id: number) {
    const scope = this.scope(user)
    const row = await this.types.findOneBy({ id })
    if (!row || (row.branchId !== null && !inBranchScope(scope, row.branchId))) throw new NotFoundException('نوع البدل مش موجود')
    if (row.branchId === null) assertCompanyWideWrite(user)
    return { row, scope }
  }

  async updateType(user: JwtPayload, id: number, input: AllowanceTypeUpdate) {
    const { row, scope } = await this.editableType(user, id)
    if (input.name !== undefined) {
      const name = allowanceTypeName(input.name)
      if (name !== row.name) await this.assertUniqueName(name, row.branchId, row.id)
      row.name = name
    }
    if (input.isActive !== undefined) row.isActive = input.isActive === true
    row.updatedByUserId = user.sub
    row.updatedAt = new Date()
    const saved = await this.types.save(row)
    return this.typeView(saved, scope, await this.branchNames())
  }

  // ===== المسيرات المفتوحة اللي فيها الموظفين (لشهر البدل أو بعده) وقيود الدفتر في حسابها =====
  private async openRunItems(employeeIds: number[], fromPeriod: string, em: EntityManager = this.em): Promise<OpenRunItem[]> {
    const result: OpenRunItem[] = []
    for (const chunk of chunks(uniqueIds(employeeIds))) {
      const rows: Array<{ runId: number; employeeId: number; name: string | null; status: string; period: string; ids: string | null }> = await em.query(`
        SELECT i.[runId], i.[employeeId], r.[name], r.[status], r.[period],
          CASE WHEN CHARINDEX('"obligationIds":[', i.[breakdown]) > 0
            THEN SUBSTRING(i.[breakdown], CHARINDEX('"obligationIds":[', i.[breakdown]) + 17, 4000) ELSE NULL END AS [ids]
        FROM [payroll_items] i INNER JOIN [payroll_runs] r ON r.[id] = i.[runId]
        WHERE r.[status] IN ('DRAFT', 'CALCULATED', 'IN_REVIEW') AND (r.[runType] IS NULL OR r.[runType] <> 'REVERSAL')
          AND r.[period] >= @0 AND i.[employeeId] IN (${idList(chunk, 1)})`, [fromPeriod, ...chunk])
      for (const row of rows) result.push({ id: Number(row.runId), employeeId: Number(row.employeeId), name: row.name, status: row.status, period: row.period,
        obligationIds: parseObligationIdWindow(row.ids) })
    }
    return result.sort((a, b) => a.period.localeCompare(b.period) || a.id - b.id)
  }

  // المسيرات غير الملغاة لشهر فيها واحد على الأقل من الموظفين (عضو أو بند): المفتوح يتعاد حسابه، والمعتمد/المصروف ما بيتغيرش
  private async monthRunsFor(period: string, employeeIds: number[]) {
    const wanted = new Set(employeeIds)
    const runs: Array<RunRef & { runType: string | null }> = (await this.em.query(`SELECT [id], [name], [status], [period], [runType] FROM [payroll_runs]
      WHERE [period] = @0 AND [status] <> 'CANCELLED' ORDER BY [id]`, [period])).map((row: any) => ({ ...row, id: Number(row.id) }))
    const regular = runs.filter(run => run.runType !== 'REVERSAL')
    const hit = new Set<number>()
    for (const chunk of chunks(regular.map(run => run.id))) {
      const rows: Array<{ runId: number; employeeId: number }> = await this.em.query(`
        SELECT [runId], [employeeId] FROM [payroll_run_members] WHERE [runId] IN (${idList(chunk)}) AND ([membershipStatus] = 'INCLUDED' OR [membershipStatus] IS NULL)
        UNION SELECT [runId], [employeeId] FROM [payroll_items] WHERE [runId] IN (${idList(chunk)})`, chunk)
      for (const row of rows) if (wanted.has(Number(row.employeeId))) hit.add(Number(row.runId))
    }
    const view = (run: RunRef) => ({ id: run.id, name: run.name, status: run.status })
    const touched = regular.filter(run => hit.has(run.id))
    return { recalculateRuns: touched.filter(run => OPEN_STATUSES.includes(run.status)).map(view), lockedRuns: touched.filter(run => !OPEN_STATUSES.includes(run.status)).map(view) }
  }

  // ===== قائمة الشهر =====
  async listGrants(user: JwtPayload, rawPeriod: unknown) {
    const period = this.period(rawPeriod), scope = this.scope(user)
    const all = await this.em.getRepository(PayrollAllowanceGrantLine).find({ where: { period }, order: { id: 'DESC' } })
    const lines = all.filter(line => inBranchScope(scope, line.branchId))
    const grants = new Map<number, PayrollAllowanceGrant>()
    for (const chunk of chunks(uniqueIds(lines.map(line => line.grantId)))) {
      for (const row of await this.em.getRepository(PayrollAllowanceGrant).findBy({ id: In(chunk) })) grants.set(row.id, row)
    }
    const obligations = new Map<number, EmployeeObligation>()
    for (const chunk of chunks(uniqueIds(lines.map(line => line.obligationId)))) {
      for (const row of await this.em.getRepository(EmployeeObligation).findBy({ id: In(chunk) })) obligations.set(row.id, row)
    }
    const employees = new Map<number, { fullName: string; employeeCode: string; branchId: number | null; departmentId: number | null }>()
    for (const chunk of chunks(uniqueIds(lines.map(line => line.employeeId)))) {
      const rows = await this.em.query(`SELECT [id], [fullName], [employeeCode], [branchId], [departmentId] FROM [employees] WHERE [id] IN (${idList(chunk)})`, chunk)
      for (const row of rows) employees.set(Number(row.id), { fullName: row.fullName, employeeCode: row.employeeCode ?? '', branchId: row.branchId == null ? null : Number(row.branchId),
        departmentId: row.departmentId == null ? null : Number(row.departmentId) })
    }
    const pendingEmployees = lines.filter(line => {
      const obligation = line.obligationId ? obligations.get(line.obligationId) : undefined
      return line.status === 'ACTIVE' && obligation?.status === 'PENDING' && obligation.reservedPayrollRunId == null
    }).map(line => line.employeeId)
    const openItems = pendingEmployees.length ? await this.openRunItems(pendingEmployees, period) : []
    const runIds = uniqueIds([...openItems.map(item => item.id), ...[...obligations.values()].flatMap(row => [row.reservedPayrollRunId, row.appliedPayrollRunId])])
    const runs = new Map<number, RunRef>()
    for (const chunk of chunks(runIds)) {
      const rows = await this.em.query(`SELECT [id], [name], [status], [period] FROM [payroll_runs] WHERE [id] IN (${idList(chunk)})`, chunk)
      for (const row of rows) runs.set(Number(row.id), { id: Number(row.id), name: row.name, status: row.status, period: row.period })
    }
    const names = await this.orgNames()
    const users = await this.userNames([...grants.values()].map(grant => grant.createdByUserId))
    const canWrite = (grant: PayrollAllowanceGrant | undefined, branchId: number | null) =>
      scope === null || (!!grant && grant.targetLevel !== 'company' && inBranchScope(scope, branchId))

    const rows = lines.map(line => {
      const grant = grants.get(line.grantId)
      const obligation = line.obligationId ? obligations.get(line.obligationId) ?? null : null
      const mine = openItems.filter(item => item.employeeId === line.employeeId && item.period >= line.period)
      const including = obligation ? mine.find(item => item.obligationIds.includes(obligation.id)) : undefined
      const openRun = including ?? mine[0]
      const { state, runId } = allowanceLineState({ lineStatus: line.status,
        obligation: obligation ? { status: obligation.status, reservedPayrollRunId: obligation.reservedPayrollRunId ?? null,
          appliedPayrollRunId: obligation.appliedPayrollRunId ?? null, payrollReversalRunId: obligation.payrollReversalRunId ?? null } : null,
        openRun: openRun ? { id: openRun.id, includesObligation: !!including } : null })
      const run = runId ? runs.get(runId) ?? null : null
      const employee = employees.get(line.employeeId)
      const branchId = line.branchId ?? employee?.branchId ?? null
      return {
        id: line.id, grantId: line.grantId, employeeId: line.employeeId, employeeCode: employee?.employeeCode ?? '', fullName: employee?.fullName ?? `#${line.employeeId}`,
        branchName: branchId ? names.branches.get(branchId) ?? null : null,
        departmentName: employee?.departmentId ? names.departments.get(employee.departmentId) ?? null : null,
        allowanceTypeId: line.allowanceTypeId, typeName: grant?.typeName ?? `بدل #${line.allowanceTypeId}`, amount: money(cents(line.amount)),
        status: line.status, state, stateLabel: ALLOWANCE_LINE_STATE_LABELS[state], runId: run?.id ?? runId, runName: run?.name ?? null, runStatus: run?.status ?? null,
        reason: grant?.reason ?? '', createdAt: line.createdAt,
        canCancel: allowanceLineCancellable(state) && canWrite(grant, line.branchId),
      }
    }).sort((a, b) => a.typeName.localeCompare(b.typeName, 'ar') || a.fullName.localeCompare(b.fullName, 'ar') || a.id - b.id)

    const active = rows.filter(row => row.state !== 'CANCELLED')
    const byType = new Map<number, { allowanceTypeId: number; typeName: string; count: number; cents: number }>()
    for (const row of active) {
      const entry = byType.get(row.allowanceTypeId) ?? { allowanceTypeId: row.allowanceTypeId, typeName: row.typeName, count: 0, cents: 0 }
      entry.count++; entry.cents += cents(row.amount)
      byType.set(row.allowanceTypeId, entry)
    }
    const grantViews = [...grants.values()].sort((a, b) => b.id - a.id).map(grant => {
      const mine = rows.filter(row => row.grantId === grant.id)
      const cancellable = mine.filter(row => row.canCancel).length
      // حساب الفرع يشوف سطور فرعه بس: العدد هو سطوره الظاهرة (مش عدد الشركة كلها — ولا «اتلغى منه» غلط من سطور الفروع التانية)
      return { id: grant.id, typeName: grant.typeName, amount: money(cents(grant.amount)), targetLevel: grant.targetLevel,
        targetText: this.describeTarget(grant, names), reason: grant.reason, employeeCount: scope === null ? grant.employeeCount : mine.length,
        activeCount: mine.filter(row => row.state !== 'CANCELLED').length, cancellableCount: cancellable,
        createdAt: grant.createdAt, createdByName: users.get(grant.createdByUserId) ?? null, canCancel: cancellable > 0 }
    })
    return {
      period, rows, grants: grantViews,
      totals: { count: active.length, employees: new Set(active.map(row => row.employeeId)).size, amount: money(active.reduce((sum, row) => sum + cents(row.amount), 0)),
        byType: [...byType.values()].sort((a, b) => a.typeName.localeCompare(b.typeName, 'ar')).map(entry => ({ allowanceTypeId: entry.allowanceTypeId,
          typeName: entry.typeName, count: entry.count, amount: money(entry.cents) })) },
    }
  }

  private describeTarget(grant: PayrollAllowanceGrant, names: { branches: Map<number, string>; departments: Map<number, string>; teams: Map<number, string> }) {
    if (grant.targetLevel === 'company') return 'الشركة كلها'
    const branch = grant.branchId ? names.branches.get(grant.branchId) ?? `فرع #${grant.branchId}` : 'فرع'
    if (grant.targetLevel === 'branch') return `${branch} كله`
    const ids = parseIds(grant.targetIds)
    if (grant.targetLevel === 'departments') return `${branch} — أقسام: ${ids.map(id => names.departments.get(id) ?? `قسم #${id}`).join('، ')}`
    if (grant.targetLevel === 'teams') return `${branch} — فرق: ${ids.map(id => names.teams.get(id) ?? `فريق #${id}`).join('، ')}`
    return `${branch} — ${ids.length} موظف مختار`
  }

  // ===== صرف بدل =====
  async createGrant(user: JwtPayload, input: AllowanceGrantInput) {
    const period = this.period(input.period), scope = this.scope(user)
    const type = await this.types.findOneBy({ id: Number(input.allowanceTypeId) })
    if (!type || (type.branchId !== null && !inBranchScope(scope, type.branchId))) throw new BadRequestException('اختار نوع البدل')
    if (!type.isActive) throw new BadRequestException('نوع البدل ده موقوف — فعّله الأول')
    const amount = allowanceAmount(input.amount)
    const reason = String(input.reason ?? '').trim()
    if (!reason) throw new BadRequestException('اكتب سبب صرف البدل')
    if (reason.length > 500) throw new BadRequestException('السبب أطول من 500 حرف')
    if (!isAllowanceTargetLevel(input.targetLevel)) throw new BadRequestException('اختار على مين')
    const target: AllowanceTarget = { level: input.targetLevel, branchId: null, departmentIds: [], teamIds: [], employeeIds: [] }
    let employees: Array<{ id: number; branchId: number | null; departmentId: number | null; teamId: number | null; status: string | null; isActive: boolean | null }>
    const loadEmployees = async (where: string, params: unknown[]) => (await this.em.query(`SELECT [id], [branchId], [departmentId], [teamId], [status], [isActive]
      FROM [employees] ${where}`, params)).map((row: any) => ({ id: Number(row.id), branchId: row.branchId == null ? null : Number(row.branchId),
      departmentId: row.departmentId == null ? null : Number(row.departmentId), teamId: row.teamId == null ? null : Number(row.teamId),
      status: row.status ?? null, isActive: row.isActive == null ? null : row.isActive === true || row.isActive === 1 }))
    let targetIds: number[] = []
    if (target.level === 'company') {
      assertCompanyWideWrite(user)
      if (type.branchId !== null) throw new BadRequestException('البدل ده خاص بفرع — اختار الفرع بتاعه')
      employees = await loadEmployees('', [])
    } else {
      const branchId = Number(input.branchId)
      if (!Number.isSafeInteger(branchId) || branchId < 1) throw new BadRequestException('اختار الفرع')
      if (!inBranchScope(scope, branchId)) throw new ForbiddenException(`صلاحيتك على ${scopeWord(scope)} بس`)
      if (type.branchId !== null && type.branchId !== branchId) throw new BadRequestException('نوع البدل ده خاص بفرع تاني')
      const [branch] = await this.em.query('SELECT [id] FROM [branches] WHERE [id] = @0', [branchId])
      if (!branch) throw new BadRequestException('الفرع مش موجود')
      target.branchId = branchId
      if (target.level === 'departments') {
        targetIds = target.departmentIds = uniqueIds(input.departmentIds)
        if (!targetIds.length) throw new BadRequestException('اختار قسم واحد على الأقل')
        const rows = await this.em.query(`SELECT [id] FROM [departments] WHERE [branchId] = @0 AND [id] IN (${idList(targetIds, 1)})`, [branchId, ...targetIds])
        if (rows.length !== targetIds.length) throw new BadRequestException('في قسم مختار مش تبع الفرع ده')
      } else if (target.level === 'teams') {
        targetIds = target.teamIds = uniqueIds(input.teamIds)
        if (!targetIds.length) throw new BadRequestException('اختار فريق واحد على الأقل')
        const rows = await this.em.query(`SELECT t.[id] FROM [teams] t INNER JOIN [departments] d ON d.[id] = t.[departmentId]
          WHERE d.[branchId] = @0 AND t.[id] IN (${idList(targetIds, 1)})`, [branchId, ...targetIds])
        if (rows.length !== targetIds.length) throw new BadRequestException('في فريق مختار مش تبع الفرع ده')
      } else if (target.level === 'employees') {
        targetIds = target.employeeIds = uniqueIds(input.employeeIds)
        if (!targetIds.length) throw new BadRequestException('اختار موظف واحد على الأقل')
        if (targetIds.length > ALLOWANCE_MAX_EMPLOYEES) throw new BadRequestException(`الحد ${ALLOWANCE_MAX_EMPLOYEES} موظف في المرة`)
      }
      employees = await loadEmployees('WHERE [branchId] = @0', [branchId])
    }
    const employeeIds = resolveAllowanceTargetEmployees(target, employees)
    if (target.level === 'employees' && employeeIds.length !== targetIds.length) throw new BadRequestException('في موظف مختار مش تبع الفرع ده أو ساب الشغل')
    if (!employeeIds.length) throw new BadRequestException('مفيش موظفين شغالين في الاختيار ده')
    if (employeeIds.length > ALLOWANCE_MAX_EMPLOYEES) throw new BadRequestException(`الحد ${ALLOWANCE_MAX_EMPLOYEES} موظف في المرة`)
    const branchOf = new Map(employees.map(employee => [employee.id, employee.branchId]))

    const result = await this.em.transaction(async em => {
      // نفس البدل لنفس الموظف في نفس الشهر ما يتصرفش مرتين
      const duplicates = new Set<number>()
      for (const chunk of chunks(employeeIds)) {
        const rows: Array<{ employeeId: number }> = await em.query(`SELECT DISTINCT [employeeId] FROM [payroll_allowance_grant_lines] WITH (UPDLOCK, HOLDLOCK)
          WHERE [period] = @0 AND [allowanceTypeId] = @1 AND [status] = 'ACTIVE' AND [employeeId] IN (${idList(chunk, 2)})`, [period, type.id, ...chunk])
        for (const row of rows) duplicates.add(Number(row.employeeId))
      }
      const fresh = employeeIds.filter(id => !duplicates.has(id))
      if (!fresh.length) throw new BadRequestException(`كل الموظفين المختارين واخدين «${type.name}» في ${period} خلاص`)
      const grant = await em.getRepository(PayrollAllowanceGrant).save(em.getRepository(PayrollAllowanceGrant).create({ period, allowanceTypeId: type.id, typeName: type.name,
        amount, targetLevel: target.level, branchId: target.branchId, targetIds: targetIds.length ? JSON.stringify(targetIds) : null, reason,
        employeeCount: fresh.length, createdByUserId: user.sub }))
      for (const chunk of chunks(fresh, 150)) {
        await em.getRepository(PayrollAllowanceGrantLine).insert(chunk.map(employeeId => ({ grantId: grant.id, period, employeeId, branchId: branchOf.get(employeeId) ?? null,
          allowanceTypeId: type.id, amount, obligationId: null, status: 'ACTIVE', cancelledByUserId: null, cancelledAt: null })))
      }
      const lines: Array<{ id: number; employeeId: number }> = await em.query('SELECT [id], [employeeId] FROM [payroll_allowance_grant_lines] WHERE [grantId] = @0', [grant.id])
      if (lines.length !== fresh.length) throw new ConflictException('تعذر حفظ سطور البدل؛ جرّب تاني')
      // إضافة في دفتر المديونيات باسم البدل وبشهره (بداية دورته) — المسير بياخدها في «إضافات أخرى» ويحجزها عند الاعتماد
      const effectiveDate = salaryPayrollPeriodBounds(period, await this.cycleStartDay(em)).startDate
      for (const chunk of chunks(lines, 100)) {
        await em.getRepository(EmployeeObligation).insert(chunk.map(line => ({ employeeId: Number(line.employeeId), type: 'CREDIT' as const,
          category: ALLOWANCE_OBLIGATION_CATEGORY, amount: Number(amount), label: type.name.slice(0, 300), status: 'PENDING' as const, effectiveDate,
          sourceRef: `${ALLOWANCE_SOURCE_PREFIX}${Number(line.id)}`, createdByUserId: user.sub, targetPeriod: period })))
      }
      await em.query(`UPDATE l SET l.[obligationId] = o.[id]
        FROM [payroll_allowance_grant_lines] l INNER JOIN [employee_obligations] o
          ON o.[sourceRef] = N'${ALLOWANCE_SOURCE_PREFIX}' + CAST(l.[id] AS nvarchar(20)) AND o.[employeeId] = l.[employeeId] AND o.[category] = @1
        WHERE l.[grantId] = @0`, [grant.id, ALLOWANCE_OBLIGATION_CATEGORY])
      const [missing] = await em.query('SELECT COUNT(*) AS [n] FROM [payroll_allowance_grant_lines] WHERE [grantId] = @0 AND [obligationId] IS NULL', [grant.id])
      if (Number(missing?.n ?? 0) !== 0) throw new ConflictException('تعذر ربط البدل بدفتر المديونيات؛ جرّب تاني')
      return { grant, created: fresh.length, skipped: duplicates.size, employeeIds: fresh }
    })
    const runs = await this.monthRunsFor(period, result.employeeIds)
    return { id: result.grant.id, created: result.created, skippedDuplicates: result.skipped, amount: money(cents(amount)),
      total: money(cents(amount) * result.created), ...runs }
  }

  // ===== الإلغاء قبل اعتماد المسير =====
  private cancelConflict(obligation: EmployeeObligation | null): string | null {
    if (!obligation) return null
    if (obligation.status === 'APPLIED') return `البدل ده اتصرف في مسير #${obligation.appliedPayrollRunId} — مينفعش يتلغي`
    if (obligation.status === 'PENDING' && obligation.reservedPayrollRunId != null) return `البدل ده في مسير معتمد (#${obligation.reservedPayrollRunId}) — افتح المسير الأول وبعدين الغيه`
    return null
  }

  private async runsHolding(em: EntityManager, lines: Array<{ employeeId: number; period: string }>, obligationIds: number[]) {
    if (!lines.length || !obligationIds.length) return []
    const wanted = new Set(obligationIds)
    const from = lines.map(line => line.period).sort()[0]
    const items = await this.openRunItems(lines.map(line => line.employeeId), from, em)
    const found = new Map<number, { id: number; name: string | null; status: string }>()
    for (const item of items) if (item.obligationIds.some(id => wanted.has(id))) found.set(item.id, { id: item.id, name: item.name, status: item.status })
    return [...found.values()]
  }

  async cancelLine(user: JwtPayload, id: number) {
    const scope = this.scope(user)
    const lines = this.em.getRepository(PayrollAllowanceGrantLine)
    const line = await lines.findOneBy({ id })
    if (!line || !inBranchScope(scope, line.branchId)) throw new NotFoundException('سطر البدل مش موجود')
    const grant = await this.em.getRepository(PayrollAllowanceGrant).findOneBy({ id: line.grantId })
    if (!grant || grant.targetLevel === 'company') assertCompanyWideWrite(user)
    if (line.status !== 'ACTIVE') return { id: line.id, status: line.status, recalculateRuns: [] }
    return this.em.transaction(async em => {
      await lockPayrollEmployees(em, [line.employeeId])
      const current = await em.getRepository(PayrollAllowanceGrantLine).findOneByOrFail({ id })
      if (current.status !== 'ACTIVE') return { id: current.id, status: current.status, recalculateRuns: [] }
      const obligation = current.obligationId ? await em.getRepository(EmployeeObligation).findOneBy({ id: current.obligationId }) : null
      const conflict = this.cancelConflict(obligation)
      if (conflict) throw new ConflictException(conflict)
      if (obligation?.status === 'PENDING') {
        const updated = await em.query(`UPDATE [employee_obligations] SET [status] = 'CANCELLED' OUTPUT INSERTED.[id]
          WHERE [id] = @0 AND [status] = 'PENDING' AND [reservedPayrollRunId] IS NULL`, [obligation.id])
        if (updated.length !== 1) throw new ConflictException('البدل اتغير أثناء الإلغاء؛ جرّب تاني')
      }
      await em.query(`UPDATE [payroll_allowance_grant_lines] SET [status] = 'CANCELLED', [cancelledByUserId] = @1, [cancelledAt] = SYSUTCDATETIME()
        WHERE [id] = @0 AND [status] = 'ACTIVE'`, [current.id, user.sub])
      const recalculateRuns = obligation ? await this.runsHolding(em, [current], [obligation.id]) : []
      return { id: current.id, status: 'CANCELLED', recalculateRuns }
    })
  }

  async cancelGrant(user: JwtPayload, id: number) {
    const scope = this.scope(user)
    const grant = await this.em.getRepository(PayrollAllowanceGrant).findOneBy({ id })
    if (!grant) throw new NotFoundException('صرف البدل مش موجود')
    const visible = (await this.em.getRepository(PayrollAllowanceGrantLine).findBy({ grantId: grant.id })).filter(line => inBranchScope(scope, line.branchId))
    if (!visible.length) throw new NotFoundException('صرف البدل مش موجود')
    if (grant.targetLevel === 'company' || grant.branchId === null) assertCompanyWideWrite(user)
    else if (!inBranchScope(scope, grant.branchId)) throw new ForbiddenException(`صلاحيتك على ${scopeWord(scope)} بس`)
    return this.em.transaction(async em => {
      const active = (await em.getRepository(PayrollAllowanceGrantLine).findBy({ grantId: grant.id, status: 'ACTIVE' }))
        .filter(line => inBranchScope(scope, line.branchId))
      const obligations = new Map<number, EmployeeObligation>()
      for (const chunk of chunks(uniqueIds(active.map(line => line.obligationId)))) {
        for (const row of await em.getRepository(EmployeeObligation).findBy({ id: In(chunk) })) obligations.set(row.id, row)
      }
      const locked: number[] = [], toCancel: PayrollAllowanceGrantLine[] = []
      for (const line of active) {
        const obligation = line.obligationId ? obligations.get(line.obligationId) ?? null : null
        if (this.cancelConflict(obligation)) locked.push(line.id)
        else toCancel.push(line)
      }
      const pendingIds = toCancel.map(line => line.obligationId).filter((value): value is number => value != null && obligations.get(value)?.status === 'PENDING')
      const cancelledObligations = new Set<number>()
      for (const chunk of chunks(pendingIds)) {
        const updated: Array<{ id: number }> = await em.query(`UPDATE [employee_obligations] SET [status] = 'CANCELLED' OUTPUT INSERTED.[id]
          WHERE [status] = 'PENDING' AND [reservedPayrollRunId] IS NULL AND [id] IN (${idList(chunk)})`, chunk)
        for (const row of updated) cancelledObligations.add(Number(row.id))
      }
      // اللي اتحجز في مسير معتمد في نفس اللحظة يفضل زي ما هو
      const done = toCancel.filter(line => line.obligationId == null || obligations.get(line.obligationId)?.status !== 'PENDING' || cancelledObligations.has(line.obligationId))
      for (const line of toCancel) if (!done.includes(line)) locked.push(line.id)
      for (const chunk of chunks(done.map(line => line.id))) {
        await em.query(`UPDATE [payroll_allowance_grant_lines] SET [status] = 'CANCELLED', [cancelledByUserId] = @0, [cancelledAt] = SYSUTCDATETIME()
          WHERE [status] = 'ACTIVE' AND [id] IN (${idList(chunk, 1)})`, [user.sub, ...chunk])
      }
      const recalculateRuns = await this.runsHolding(em, done, [...cancelledObligations])
      return { id: grant.id, cancelled: done.length, locked: locked.length, recalculateRuns }
    })
  }
}
