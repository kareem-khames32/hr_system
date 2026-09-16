import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, Repository } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { assertCompanyWideWrite, branchScopeOf } from '../auth/guards'
import { PayrollDeductionWaiver } from './payroll-deduction-waivers.entities'
import {
  DEDUCTION_WAIVER_KIND_LABELS, DEDUCTION_WAIVER_LEVELS, DeductionWaiverKind, DeductionWaiverLevel, isDeductionWaiverKind, parseWaiverTargetIds,
} from './payroll-deduction-waivers'
import { findPayrollConflicts } from './payroll-membership-guard'
import { PayrollRun } from './payroll.entities'
import { PayrollService } from './payroll.service'

// تبويبات شاشة المسير: المدرجين بالمسير، موظفين ليس لديهم مسير، التضارب، الاستقطاعات و«شيل خصم». قراءة بنطاق الفرع.

export interface DeductionWaiverInput {
  period: string
  kind: string
  targetLevel: string
  branchId?: number | null
  departmentIds?: number[]
  teamIds?: number[]
  employeeIds?: number[]
  reason: string
}

interface RunRow { id: number; name: string | null; status: string; period: string; startDate: string; endDate: string; runType: string | null }
interface OrgNames { branches: Map<number, string>; departments: Map<number, string>; teams: Map<number, string> }

const OPEN_STATUSES = ['DRAFT', 'CALCULATED', 'IN_REVIEW']
const cents = (value: unknown) => Math.trunc(Math.round(Number(value ?? 0) * 1000) / 10)
const money = (value: number) => value / 100
const idList = (ids: number[], offset = 0) => ids.map((_, index) => `@${index + offset}`).join(', ')
const chunks = <T>(rows: T[], size = 500) => Array.from({ length: Math.ceil(rows.length / size) }, (_, index) => rows.slice(index * size, (index + 1) * size))
const parseJson = (raw: unknown): Record<string, any> => {
  if (!raw || typeof raw !== 'string') return {}
  try { const value = JSON.parse(raw); return value && typeof value === 'object' ? value : {} } catch { return {} }
}

@Injectable()
export class PayrollOverviewService {
  constructor(
    @InjectRepository(PayrollDeductionWaiver) private readonly waivers: Repository<PayrollDeductionWaiver>,
    private readonly payroll: PayrollService,
  ) {}

  private get em(): EntityManager { return this.waivers.manager }

  private period(value: unknown): string {
    if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) throw new BadRequestException('اختار الشهر بصيغة YYYY-MM')
    return value
  }

  private scope(user: JwtPayload) {
    const scope = branchScopeOf(user)
    if (scope !== null && scope < 1) throw new ForbiddenException('حسابك مش مربوط بفرع')
    return scope
  }

  private async monthRuns(period: string): Promise<RunRow[]> {
    const rows: RunRow[] = await this.em.query(`SELECT [id], [name], [status], [period], CONVERT(varchar(10), [startDate], 23) AS [startDate],
        CONVERT(varchar(10), [endDate], 23) AS [endDate], [runType]
      FROM [payroll_runs] WHERE [period] = @0 AND [status] <> 'CANCELLED' ORDER BY [id]`, [period])
    return rows.map(row => ({ ...row, id: Number(row.id) }))
  }

  private async orgNames(): Promise<OrgNames> {
    const map = (rows: Array<{ id: number; name: string }>) => new Map(rows.map(row => [Number(row.id), row.name]))
    return {
      branches: map(await this.em.query('SELECT [id], [name] FROM [branches]')),
      departments: map(await this.em.query('SELECT [id], [name] FROM [departments]')),
      teams: map(await this.em.query('SELECT [id], [name] FROM [teams]')),
    }
  }

  // أعضاء المسيرات الداخلين (العضوية أو البند) مع مكانهم من لقطة الحساب، والموظف الحالي احتياطي
  private async includedMembers(runs: RunRow[]) {
    const result: Array<{ runId: number; employeeId: number; snapshot: Record<string, any> }> = []
    const regular = runs.filter(run => run.runType !== 'REVERSAL').map(run => run.id)
    for (const chunk of chunks(regular)) {
      const rows: Array<{ runId: number; employeeId: number; snapshot: string | null }> = await this.em.query(`
        SELECT m.[runId], m.[employeeId], MAX(m.[snapshot]) AS [snapshot] FROM (
          SELECT [runId], [employeeId], CAST([snapshot] AS nvarchar(max)) AS [snapshot] FROM [payroll_run_members]
          WHERE [runId] IN (${idList(chunk)}) AND ([membershipStatus] = 'INCLUDED' OR [membershipStatus] IS NULL)
          UNION ALL
          SELECT [runId], [employeeId], NULL FROM [payroll_items] WHERE [runId] IN (${idList(chunk)})
        ) m GROUP BY m.[runId], m.[employeeId]`, chunk)
      for (const row of rows) result.push({ runId: Number(row.runId), employeeId: Number(row.employeeId), snapshot: parseJson(row.snapshot) })
    }
    return result
  }

  private async employees(ids: number[]) {
    const map = new Map<number, { id: number; fullName: string; employeeCode: string; branchId: number | null; departmentId: number | null; teamId: number | null; hireDate: string | null }>()
    for (const chunk of chunks([...new Set(ids)])) {
      const rows = await this.em.query(`SELECT [id], [fullName], [employeeCode], [branchId], [departmentId], [teamId],
          CONVERT(varchar(10), COALESCE([actualStartDate], [joinDate]), 23) AS [hireDate]
        FROM [employees] WHERE [id] IN (${idList(chunk)})`, chunk)
      for (const row of rows) map.set(Number(row.id), { ...row, id: Number(row.id) })
    }
    return map
  }

  private placeOf(snapshot: Record<string, any>, employee?: { branchId: number | null; departmentId: number | null; teamId: number | null }) {
    const pick = (key: 'branchId' | 'departmentId' | 'teamId') => snapshot[key] !== undefined ? (snapshot[key] == null ? null : Number(snapshot[key])) : (employee?.[key] ?? null)
    return { branchId: pick('branchId'), departmentId: pick('departmentId'), teamId: pick('teamId') }
  }

  // ===== المدرجين بالمسير =====
  async included(user: JwtPayload, rawPeriod: unknown) {
    const period = this.period(rawPeriod), scope = this.scope(user)
    const runs = await this.monthRuns(period)
    const members = await this.includedMembers(runs)
    const employees = await this.employees(members.map(row => row.employeeId))
    const names = await this.orgNames()
    const rows = members.map(member => {
      const employee = employees.get(member.employeeId)
      const place = this.placeOf(member.snapshot, employee)
      const run = runs.find(row => row.id === member.runId)!
      return {
        employeeId: member.employeeId, employeeCode: member.snapshot.employeeCode ?? employee?.employeeCode ?? '', fullName: member.snapshot.fullName ?? employee?.fullName ?? `#${member.employeeId}`,
        ...place, branchName: place.branchId ? names.branches.get(place.branchId) ?? null : null,
        departmentName: place.departmentId ? names.departments.get(place.departmentId) ?? null : null,
        runId: run.id, runName: run.name, runStatus: run.status, startDate: run.startDate, endDate: run.endDate,
      }
    }).filter(row => scope === null || row.branchId === scope)
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar') || a.runId - b.runId)
    return { period, runs: runs.length, employees: new Set(rows.map(row => row.employeeId)).size, rows }
  }

  // ===== موظفين ليس لديهم مسير =====
  async unassigned(user: JwtPayload, rawPeriod: unknown) {
    const period = this.period(rawPeriod)
    const report = await this.payroll.unassignedReport(user, { period })
    const names = await this.orgNames()
    const scope = this.scope(user)
    const openRuns = (await this.monthRuns(period)).filter(run => OPEN_STATUSES.includes(run.status) && run.runType !== 'REVERSAL')
    const visibleRuns = []
    for (const run of openRuns) {
      try {
        await this.payroll.assertRunAccess(user, await this.em.getRepository(PayrollRun).findOneByOrFail({ id: run.id }))
        visibleRuns.push({ id: run.id, name: run.name, status: run.status })
      } catch { /* مسير خارج نطاق الفرع */ }
    }
    const rows = report.rows.filter(row => scope === null || row.branchId === scope).map(row => ({
      employeeId: row.employeeId, employeeCode: row.employeeCode, fullName: row.fullName, hireDate: row.hireDate,
      branchId: row.branchId, branchName: row.branchId ? names.branches.get(row.branchId) ?? null : null,
      departmentId: row.departmentId, departmentName: row.departmentId ? names.departments.get(row.departmentId) ?? null : null,
      reasonCode: row.reasonCode, reasonText: row.reasonText,
    }))
    return { period, startDate: report.startDate, endDate: report.endDate, openRuns: visibleRuns, rows }
  }

  // ===== التضارب: نفس الموظف في أكتر من مسير غير ملغى لنفس الشهر أو فترات متداخلة =====
  async conflicts(user: JwtPayload, rawPeriod: unknown) {
    const period = this.period(rawPeriod), scope = this.scope(user)
    const runs = await this.monthRuns(period)
    const members = await this.includedMembers(runs)
    const found = new Map<string, { employeeId: number; runId: number; otherRunId: number; otherName: string | null; otherStatus: string;
      otherStartDate: string; otherEndDate: string; overlapDays: number; kind: string; blocking: boolean }>()
    for (const run of runs.filter(row => row.runType !== 'REVERSAL')) {
      const ids = members.filter(row => row.runId === run.id).map(row => row.employeeId)
      if (!ids.length) continue
      const conflicts = await findPayrollConflicts(this.em, { id: run.id, period: run.period, startDate: run.startDate, endDate: run.endDate }, ids)
      for (const conflict of conflicts) {
        const [a, b] = [run.id, conflict.otherRunId].sort((x, y) => x - y)
        const key = `${conflict.employeeId}:${a}:${b}`
        if (found.has(key)) continue
        found.set(key, { employeeId: conflict.employeeId, runId: run.id, otherRunId: conflict.otherRunId, otherName: conflict.name, otherStatus: conflict.status,
          otherStartDate: conflict.startDate, otherEndDate: conflict.endDate, overlapDays: conflict.overlapDays, kind: conflict.kind, blocking: conflict.blocking })
      }
    }
    // مسيرين مسودة أو محسوبين لنفس الشهر مش بيظهروا في فحص الحجز لو واحد فيهم مسودة؛ نكمّلهم من العضويات مباشرة
    const byEmployee = new Map<number, number[]>()
    for (const member of members) byEmployee.set(member.employeeId, [...(byEmployee.get(member.employeeId) ?? []), member.runId])
    for (const [employeeId, runIds] of byEmployee) {
      const unique = [...new Set(runIds)].sort((x, y) => x - y)
      for (let i = 0; i < unique.length; i++) for (let j = i + 1; j < unique.length; j++) {
        const key = `${employeeId}:${unique[i]}:${unique[j]}`
        if (found.has(key)) continue
        const other = runs.find(row => row.id === unique[j])!
        found.set(key, { employeeId, runId: unique[i], otherRunId: other.id, otherName: other.name, otherStatus: other.status, otherStartDate: other.startDate,
          otherEndDate: other.endDate, overlapDays: 0, kind: 'SAME_MONTH', blocking: false })
      }
    }
    const employees = await this.employees([...found.values()].map(row => row.employeeId))
    const names = await this.orgNames()
    const rows = [...found.values()].map(row => {
      const run = runs.find(item => item.id === row.runId)
      const member = members.find(item => item.runId === row.runId && item.employeeId === row.employeeId)
      const employee = employees.get(row.employeeId)
      const place = this.placeOf(member?.snapshot ?? {}, employee)
      return { ...row, runName: run?.name ?? null, runStatus: run?.status ?? null, fullName: member?.snapshot.fullName ?? employee?.fullName ?? `#${row.employeeId}`,
        employeeCode: member?.snapshot.employeeCode ?? employee?.employeeCode ?? '', branchId: place.branchId,
        branchName: place.branchId ? names.branches.get(place.branchId) ?? null : null, departmentName: place.departmentId ? names.departments.get(place.departmentId) ?? null : null }
    }).filter(row => scope === null || row.branchId === scope)
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar') || a.runId - b.runId)
    return { period, rows }
  }

  // ===== الاستقطاعات: كل خصم اتحسب على موظف في مسيرات الشهر، بنوعه =====
  async deductions(user: JwtPayload, rawPeriod: unknown) {
    const period = this.period(rawPeriod), scope = this.scope(user)
    const runs = (await this.monthRuns(period)).filter(run => run.runType !== 'REVERSAL')
    const names = await this.orgNames()
    const rows: Array<{ employeeId: number; employeeCode: string; fullName: string; branchName: string | null; departmentName: string | null;
      runId: number; runName: string | null; runStatus: string; kind: DeductionWaiverKind; kindLabel: string; amount: number }> = []
    for (const chunk of chunks(runs.map(run => run.id))) {
      const items: Array<Record<string, any>> = await this.em.query(`SELECT i.*, CAST(m.[snapshot] AS nvarchar(max)) AS [memberSnapshot]
        FROM [payroll_items] i LEFT JOIN [payroll_run_members] m ON m.[runId] = i.[runId] AND m.[employeeId] = i.[employeeId]
        WHERE i.[runId] IN (${idList(chunk)})`, chunk)
      const employees = await this.employees(items.map(item => Number(item.employeeId)))
      // الخروج المبكر = نقص أيام الوردية الثابتة، ونقص الساعات = المرنة (من لقطة قاعدة يوم الحضور)
      const fixedDays = await this.fixedShiftDays(items, runs)
      for (const item of items) {
        const employeeId = Number(item.employeeId)
        const snapshot = parseJson(item.memberSnapshot), employee = employees.get(employeeId)
        const place = this.placeOf(snapshot, employee)
        if (scope !== null && place.branchId !== scope) continue
        const run = runs.find(row => row.id === Number(item.runId))!
        const breakdown = parseJson(item.breakdown)
        const base = { employeeId, employeeCode: snapshot.employeeCode ?? employee?.employeeCode ?? '', fullName: snapshot.fullName ?? employee?.fullName ?? `#${employeeId}`,
          branchName: place.branchId ? names.branches.get(place.branchId) ?? null : null, departmentName: place.departmentId ? names.departments.get(place.departmentId) ?? null : null,
          runId: run.id, runName: run.name, runStatus: run.status }
        const add = (kind: DeductionWaiverKind, amountCents: number) => {
          if (amountCents > 0) rows.push({ ...base, kind, kindLabel: DEDUCTION_WAIVER_KIND_LABELS[kind], amount: money(amountCents) })
        }
        add('LATENESS', cents(item.latenessDeduction))
        const shortfall = cents(item.shortfallDeduction)
        const days: Array<{ date?: string; shortfallAmount?: number }> = Array.isArray(breakdown.attendanceDeductions?.days) ? breakdown.attendanceDeductions.days : []
        const early = Math.min(shortfall, days.filter(day => day.date && fixedDays.has(`${employeeId}:${day.date}`)).reduce((sum, day) => sum + cents(day.shortfallAmount), 0))
        add('EARLY_LEAVE', early)
        add('SHORTFALL', shortfall - early)
        add('ABSENCE', cents(item.absenceDeduction))
        const leaveLines: Array<{ code?: string; amount?: number }> = Array.isArray(breakdown.leaveDeductionLines) ? breakdown.leaveDeductionLines : []
        if (leaveLines.length) {
          for (const line of leaveLines) {
            const code = String(line.code ?? '')
            add(code === 'SUSPENSION' ? 'SUSPENSION' : code.startsWith('SICK_LEAVE') ? 'SICK_LEAVE' : 'UNPAID_LEAVE', cents(line.amount))
          }
        } else add('UNPAID_LEAVE', cents(item.unpaidLeaveDeduction))
        add('LOAN', cents(item.loanInstallments))
        const obligationLines: Array<{ type?: string; collected?: number; typed?: boolean }> = Array.isArray(breakdown.obligationLines) ? breakdown.obligationLines : []
        const debits = obligationLines.filter(line => line.type === 'DEBIT')
        if (debits.length) {
          const typed = debits.filter(line => line.typed).reduce((sum, line) => sum + cents(line.collected), 0)
          const other = Math.max(0, cents(item.otherDeductions) - typed)
          add('TYPED_DEDUCTION', Math.min(typed, cents(item.otherDeductions)))
          add('OTHER', other)
        } else add('OTHER', cents(item.otherDeductions))
        add('SOCIAL_INSURANCE', cents(item.socialInsuranceDeduction))
      }
    }
    rows.sort((a, b) => a.kind.localeCompare(b.kind) || a.fullName.localeCompare(b.fullName, 'ar') || a.runId - b.runId)
    const totals: Partial<Record<DeductionWaiverKind, number>> = {}
    for (const row of rows) totals[row.kind] = money(cents(totals[row.kind] ?? 0) + cents(row.amount))
    return { period, runs: runs.map(run => ({ id: run.id, name: run.name, status: run.status })), totals, rows }
  }

  private async fixedShiftDays(items: Array<Record<string, any>>, runs: RunRow[]) {
    const fixed = new Set<string>()
    const ids = [...new Set(items.filter(item => Number(item.shortfallDeduction) > 0).map(item => Number(item.employeeId)))]
    if (!ids.length || !runs.length) return fixed
    const from = runs.map(run => run.startDate).sort()[0], to = runs.map(run => run.endDate).sort().at(-1)!
    for (const chunk of chunks(ids)) {
      const rows: Array<{ employeeId: number; date: string; attendanceRuleSnapshot: string | null }> = await this.em.query(`SELECT [employeeId],
          CONVERT(varchar(10), [date], 23) AS [date], CAST([attendanceRuleSnapshot] AS nvarchar(max)) AS [attendanceRuleSnapshot]
        FROM [attendance_days] WHERE [date] BETWEEN CONVERT(date, @0, 23) AND CONVERT(date, @1, 23) AND [employeeId] IN (${idList(chunk, 2)})`, [from, to, ...chunk])
      for (const row of rows) if (parseJson(row.attendanceRuleSnapshot).flexEnabled === false) fixed.add(`${Number(row.employeeId)}:${row.date}`)
    }
    return fixed
  }

  // ===== «شيل خصم» =====
  async listWaivers(user: JwtPayload, rawPeriod: unknown) {
    const period = this.period(rawPeriod), scope = this.scope(user)
    const rows = await this.waivers.find({ where: { period, status: 'ACTIVE' }, order: { id: 'DESC' } })
    const visible = rows.filter(row => scope === null || row.targetLevel === 'company' || row.branchId === scope)
    const names = await this.orgNames()
    const employeeIds = visible.filter(row => row.targetLevel === 'employees').flatMap(row => parseWaiverTargetIds(row.targetIds))
    const employees = await this.employees(employeeIds)
    const users = await this.userNames(visible.map(row => row.createdByUserId))
    return visible.map(row => {
      const ids = parseWaiverTargetIds(row.targetIds)
      return { id: row.id, period: row.period, kind: row.kind, kindLabel: isDeductionWaiverKind(row.kind) ? DEDUCTION_WAIVER_KIND_LABELS[row.kind] : row.kind,
        targetLevel: row.targetLevel, branchId: row.branchId, targetIds: ids, targetText: this.describeTarget(row.targetLevel, row.branchId, ids, names, employees),
        reason: row.reason, createdAt: row.createdAt, createdByName: users.get(row.createdByUserId) ?? null,
        canCancel: scope === null || (row.targetLevel !== 'company' && row.branchId === scope) }
    })
  }

  private async userNames(ids: number[]) {
    const unique = [...new Set(ids.filter(id => Number.isInteger(id) && id > 0))]
    const map = new Map<number, string>()
    for (const chunk of chunks(unique)) {
      const rows: Array<{ id: number; displayName: string | null }> = await this.em.query(`SELECT [id], [displayName] FROM [users] WHERE [id] IN (${idList(chunk)})`, chunk)
      for (const row of rows) map.set(Number(row.id), row.displayName || `مستخدم #${row.id}`)
    }
    return map
  }

  private describeTarget(level: string, branchId: number | null, ids: number[], names: OrgNames, employees: Map<number, { fullName: string }>) {
    if (level === 'company') return 'الشركة كلها'
    const branch = branchId ? names.branches.get(branchId) ?? `فرع #${branchId}` : 'فرع'
    if (level === 'branch') return `${branch} كله`
    const list = (map: Map<number, string>, prefix: string) => ids.map(id => map.get(id) ?? `${prefix} #${id}`).join('، ')
    if (level === 'departments') return `${branch} — أقسام: ${list(names.departments, 'قسم')}`
    if (level === 'teams') return `${branch} — فرق: ${list(names.teams, 'فريق')}`
    return `${branch} — ${ids.map(id => employees.get(id)?.fullName ?? `موظف #${id}`).join('، ')}`
  }

  async createWaiver(user: JwtPayload, input: DeductionWaiverInput) {
    const period = this.period(input.period), scope = this.scope(user)
    if (!isDeductionWaiverKind(input.kind)) throw new BadRequestException('اختار نوع الخصم')
    if (!(DEDUCTION_WAIVER_LEVELS as readonly string[]).includes(input.targetLevel)) throw new BadRequestException('اختار على مين')
    const level = input.targetLevel as DeductionWaiverLevel
    const reason = String(input.reason ?? '').trim()
    if (!reason) throw new BadRequestException('اكتب سبب شيل الخصم')
    if (reason.length > 500) throw new BadRequestException('السبب أطول من 500 حرف')
    const unique = (ids?: number[]) => [...new Set((ids ?? []).map(Number))].filter(id => Number.isSafeInteger(id) && id > 0).sort((a, b) => a - b)
    let branchId: number | null = null
    let ids: number[] = []
    if (level === 'company') {
      assertCompanyWideWrite(user)
    } else {
      branchId = Number(input.branchId)
      if (!Number.isSafeInteger(branchId) || branchId < 1) throw new BadRequestException('اختار الفرع')
      if (scope !== null && branchId !== scope) throw new ForbiddenException('صلاحيتك على فرعك بس')
      const [branch] = await this.em.query('SELECT [id] FROM [branches] WHERE [id] = @0', [branchId])
      if (!branch) throw new BadRequestException('الفرع مش موجود')
      if (level === 'departments') {
        ids = unique(input.departmentIds)
        if (!ids.length) throw new BadRequestException('اختار قسم واحد على الأقل')
        const rows = await this.em.query(`SELECT [id] FROM [departments] WHERE [branchId] = @0 AND [id] IN (${idList(ids, 1)})`, [branchId, ...ids])
        if (rows.length !== ids.length) throw new BadRequestException('في قسم مختار مش تبع الفرع ده')
      } else if (level === 'teams') {
        ids = unique(input.teamIds)
        if (!ids.length) throw new BadRequestException('اختار فريق واحد على الأقل')
        const rows = await this.em.query(`SELECT t.[id] FROM [teams] t INNER JOIN [departments] d ON d.[id] = t.[departmentId]
          WHERE d.[branchId] = @0 AND t.[id] IN (${idList(ids, 1)})`, [branchId, ...ids])
        if (rows.length !== ids.length) throw new BadRequestException('في فريق مختار مش تبع الفرع ده')
      } else if (level === 'employees') {
        ids = unique(input.employeeIds)
        if (!ids.length) throw new BadRequestException('اختار موظف واحد على الأقل')
        const rows = await this.em.query(`SELECT [id] FROM [employees] WHERE [branchId] = @0 AND [id] IN (${idList(ids, 1)})`, [branchId, ...ids])
        if (rows.length !== ids.length) throw new BadRequestException('في موظف مختار مش تبع الفرع ده')
      }
    }
    const saved = await this.waivers.save(this.waivers.create({ period, kind: input.kind, targetLevel: level, branchId,
      targetIds: ids.length ? JSON.stringify(ids) : null, reason, status: 'ACTIVE', createdByUserId: user.sub }))
    // المسيرات اللي هيأثر فيها بعد إعادة الحساب (المعتمد والمصروف ما بيتغيرش)
    const runs = await this.monthRuns(period)
    return { id: saved.id, recalculateRuns: runs.filter(run => OPEN_STATUSES.includes(run.status)).map(run => ({ id: run.id, name: run.name, status: run.status })),
      lockedRuns: runs.filter(run => !OPEN_STATUSES.includes(run.status)).map(run => ({ id: run.id, name: run.name, status: run.status })) }
  }

  async cancelWaiver(user: JwtPayload, id: number) {
    const scope = this.scope(user)
    const waiver = await this.waivers.findOne({ where: { id } })
    if (!waiver || (scope !== null && waiver.targetLevel !== 'company' && waiver.branchId !== scope)) throw new NotFoundException('القاعدة مش موجودة')
    if (waiver.targetLevel === 'company' || waiver.branchId === null) assertCompanyWideWrite(user)
    else if (scope !== null && waiver.branchId !== scope) throw new ForbiddenException('صلاحيتك على فرعك بس')
    if (waiver.status !== 'ACTIVE') return { id: waiver.id, status: waiver.status }
    await this.waivers.update({ id: waiver.id, status: 'ACTIVE' }, { status: 'CANCELLED', cancelledByUserId: user.sub, cancelledAt: new Date() })
    return { id: waiver.id, status: 'CANCELLED' }
  }
}
