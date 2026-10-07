import { Injectable, Type } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { localDateOf } from '../attendance/attendance.service'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, inBranchScope } from '../auth/guards'
import { canSeeEmployeesFinance } from '../employees/employee-projection'
import { readOpenSuspensions } from '../employees/employee-suspensions'
import { addDays, displayEmployeeStatus } from '../employees/employee-suspension-rules'
import { ModulesService } from '../modules-registry/modules.service'
import { readBranchCurrencyOf } from '../org/branch-currency-db'
import { DOCUMENT_EXPIRY_WINDOW_DAYS } from '../queue/queue.service'
import { isCurrentEmployee } from '../reports/metrics'
import { ApproverResolver } from '../requests/approver-resolver.service'
import { RequestsService } from '../requests/requests.service'
import { TASK_OPEN_STATUSES } from '../tasks/task.entity'
import { TasksService } from '../tasks/tasks.service'

/** نافذة «إجازات الفريق» و«اللي هينتهي» بالأيام */
export const TEAM_WINDOW_DAYS = 30
// أقل من حد معاملات SQL Server (2,100) بهامش
const CHUNK = 900

export interface TeamMember {
  id: number; employeeCode: string; fullName: string; jobTitle: string | null; status: string
  branchName: string | null; departmentName: string | null; teamName: string | null
  /** مرؤوس مباشر (مش أبعد في الشجرة) */
  direct: boolean
  /** الراتب الأساسي وعملة فرعه — للي معاه حق عرض الرواتب، ولموظف جوه نطاق فروع حسابه بس */
  basicSalary?: string | null
  currency?: string | null
}
export interface TeamExpiry { employeeId: number; kind: 'probation' | 'contract' | 'document'; label: string; date: string; daysLeft: number }

const day = (value: unknown): string | null => (value == null || value === '' ? null : String(value).slice(0, 10))
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000)

// B2.14: لوحة «فريقي» — قراءة بس، وبنطاق فريق صاحب الحساب في الهيكل (نفس تعريف «مهام فريقي»): اللي مالوش حد تحته مابيشوفش حاجة.
@Injectable()
export class TeamService {
  constructor(@InjectDataSource() private readonly ds: DataSource, private readonly modules: ModulesService, private readonly refs: ModuleRef) {}

  private use<T>(type: Type<T>): T {
    return this.refs.get(type, { strict: false })
  }

  private async byIds<T>(ids: number[], run: (list: string, params: unknown[]) => Promise<T[]>, lead: unknown[] = []): Promise<T[]> {
    const rows: T[] = []
    for (let at = 0; at < ids.length; at += CHUNK) {
      const part = ids.slice(at, at + CHUNK)
      rows.push(...await run(part.map((_, index) => `@${lead.length + index}`).join(', '), [...lead, ...part]))
    }
    return rows
  }

  /** فريق الحساب في الهيكل: المباشرين وكل اللي تحتهم — نفس دالتي «مهام فريقي» بالحرف */
  private async teamOf(user: JwtPayload): Promise<{ ids: number[]; direct: Set<number> }> {
    if (!user.employeeId) return { ids: [], direct: new Set() }
    const resolver = this.use(ApproverResolver)
    const [direct, under] = await Promise.all([resolver.directReportsOf(user.employeeId), resolver.subordinatesOf(user.employeeId)])
    return { ids: [...new Set([...direct, ...under])].filter(id => id !== user.employeeId), direct: new Set(direct) }
  }

  /** بند القايمة: تحته حد؟ */
  async status(user: JwtPayload) {
    return { manager: (await this.teamOf(user)).ids.length > 0 }
  }

  async overview(user: JwtPayload) {
    const { ids, direct } = await this.teamOf(user)
    // من غير فريق: ولا بيان (نفس الرد لأي حساب مش مدير)
    if (!ids.length) return { manager: false as const }
    const today = localDateOf(new Date()), until = addDays(today, TEAM_WINDOW_DAYS)
    const finance = canSeeEmployeesFinance(user), scope = branchScopeOf(user)
    const raw = await this.byIds<Record<string, any>>(ids, (list, params) => this.ds.query(
      `SELECT e.id AS id, e.employeeCode AS employeeCode, e.fullName AS fullName, e.jobTitle AS jobTitle, e.status AS status, e.isActive AS isActive,
              e.branchId AS branchId, CONVERT(varchar(10), e.probationEndDate, 23) AS probationEndDate, CONVERT(varchar(10), e.contractEnd, 23) AS contractEnd,
              ${finance ? 'CONVERT(varchar(40), e.basicSalary) AS basicSalary,' : ''}
              b.name AS branchName, d.name AS departmentName, t.name AS teamName, d.branchId AS departmentBranchId, td.branchId AS teamBranchId
       FROM employees e LEFT JOIN branches b ON b.id = e.branchId LEFT JOIN departments d ON d.id = e.departmentId LEFT JOIN teams t ON t.id = e.teamId
         LEFT JOIN departments td ON td.id = t.departmentId
       WHERE e.id IN (${list})`, params))
    // الفريق = الموظفين الحاليين بس (تعريف قاموس المؤشرات)
    const current = raw.filter(row => isCurrentEmployee(row as { status: string; isActive: unknown })).sort((a, b) => String(a.fullName).localeCompare(String(b.fullName), 'ar'))
    const memberIds = current.map(row => Number(row.id))
    const suspensions = await readOpenSuspensions(this.ds.manager, today)
    const currencyOf = finance ? await readBranchCurrencyOf(this.ds.manager) : null
    const team: TeamMember[] = current.map(row => {
      // مرؤوس في فرع برّه نطاق فروع الحساب: ظاهر بعلاقة الهيكل (اسمه ومسمّاه وحالته)، من غير أسماء وحداته ومن غير راتبه
      const inScope = inBranchScope(scope, Number(row.branchId))
      // CRP3D-B14-01: اسم الوحدة بفرعها الحالي — قسم (أو فريق، بفرع قسمه) اتنقل لفرع برّه نطاق الحساب مابيتعرضش اسمه، حتى لو الموظف نفسه جوه النطاق
      const unitInScope = (branchId: unknown) => inBranchScope(scope, branchId == null ? null : Number(branchId))
      const member: TeamMember = {
        id: Number(row.id), employeeCode: row.employeeCode, fullName: row.fullName, jobTitle: row.jobTitle ?? null,
        status: displayEmployeeStatus(row.status, suspensions.get(Number(row.id)) ?? [], today),
        branchName: inScope ? row.branchName ?? null : null,
        departmentName: inScope && unitInScope(row.departmentBranchId) ? row.departmentName ?? null : null,
        teamName: inScope && unitInScope(row.teamBranchId) ? row.teamName ?? null : null, direct: direct.has(Number(row.id)),
      }
      // الراتب: حق عرض الرواتب بيغطي موظفين نطاق فروع الحساب بس
      if (currencyOf && inScope) Object.assign(member, { basicSalary: row.basicSalary ?? null, currency: currencyOf(row.branchId == null ? null : Number(row.branchId)) })
      return member
    })
    const [attendanceOn, leaveOn] = await Promise.all([this.modules.allowedFor('attendance', user), this.modules.allowedFor('leave', user)])
    const [attendanceRows, leaveRows, documentRows, inbox, teamTasks] = await Promise.all([
      !attendanceOn || !memberIds.length ? [] : this.byIds<Record<string, any>>(memberIds, (list, params) => this.ds.query(
        `SELECT a.employeeId AS employeeId, a.status AS status, a.checkIn AS checkIn, a.checkOut AS checkOut, a.lateMinutes AS lateMinutes
         FROM attendance_days a WHERE a.date = @0 AND a.employeeId IN (${list})`, params), [today]),
      !leaveOn || !memberIds.length ? [] : this.byIds<Record<string, any>>(memberIds, (list, params) => this.ds.query(
        `SELECT l.employeeId AS employeeId, CONVERT(varchar(10), l.fromDate, 23) AS fromDate, CONVERT(varchar(10), l.toDate, 23) AS toDate, l.days AS days, l.period AS period
         FROM leaves l WHERE l.status = 'APPROVED' AND l.toDate >= @0 AND l.fromDate <= @1 AND l.employeeId IN (${list})`, params), [today, until]),
      !memberIds.length ? [] : this.byIds<Record<string, any>>(memberIds, (list, params) => this.ds.query(
        // اسم النوع من كتالوج أنواع المستندات (المستند بيشيل الكود)؛ نص قديم من غير نوع في الكتالوج بيتعرض زي ما هو
        `SELECT d.employeeId AS employeeId, COALESCE(dt.nameAr, d.docType) AS docType, CONVERT(varchar(10), d.expiryDate, 23) AS expiryDate
         FROM employee_documents d LEFT JOIN doc_types dt ON dt.code = d.docType
         WHERE d.expiryDate IS NOT NULL AND d.expiryDate >= DATEADD(day, -@1, CONVERT(date, @0, 23)) AND d.expiryDate <= DATEADD(day, @2, CONVERT(date, @0, 23))
           AND d.employeeId IN (${list})`, params), [today, TEAM_WINDOW_DAYS, DOCUMENT_EXPIRY_WINDOW_DAYS]),
      this.use(RequestsService).inbox(user),
      this.use(TasksService).team(user),
    ])
    const nameOf = new Map(team.map(member => [member.id, member.fullName]))
    // إجازات الفريق: التواريخ من غير نوع الإجازة (المدير محتاج يعرف مين مش موجود، مش السبب)
    const leaves = leaveRows.map(row => ({ employeeId: Number(row.employeeId), fullName: nameOf.get(Number(row.employeeId)) ?? '', fromDate: day(row.fromDate)!, toDate: day(row.toDate)!,
      days: Number(row.days ?? 0), period: String(row.period ?? 'FULL') })).sort((a, b) => a.fromDate.localeCompare(b.fromDate) || a.fullName.localeCompare(b.fullName, 'ar'))
    const onLeaveToday = new Set(leaves.filter(leave => leave.period === 'FULL' && leave.fromDate <= today && leave.toDate >= today).map(leave => leave.employeeId))
    const attendanceOf = new Map(attendanceRows.map(row => [Number(row.employeeId), row]))
    const attendance = !attendanceOn ? null : team.map(member => {
      const row = attendanceOf.get(member.id)
      return { employeeId: member.id, fullName: member.fullName, status: row ? String(row.status) : onLeaveToday.has(member.id) ? 'leave' : 'none',
        checkIn: row?.checkIn ?? null, checkOut: row?.checkOut ?? null, lateMinutes: Number(row?.lateMinutes ?? 0) }
    })
    const count = (match: (status: string) => boolean) => (attendance ?? []).filter(row => match(row.status)).length
    const expiring: Array<TeamExpiry & { fullName: string }> = []
    const expiry = (employeeId: number, kind: TeamExpiry['kind'], label: string, date: string | null) => {
      if (date && date <= until) expiring.push({ employeeId, fullName: nameOf.get(employeeId) ?? '', kind, label, date, daysLeft: daysBetween(today, date) })
    }
    for (const row of current) {
      if (row.status === 'probation') expiry(Number(row.id), 'probation', 'نهاية فترة التجربة', day(row.probationEndDate))
      expiry(Number(row.id), 'contract', 'نهاية العقد', day(row.contractEnd))
    }
    for (const row of documentRows) expiry(Number(row.employeeId), 'document', String(row.docType ?? 'مستند'), day(row.expiryDate))
    expiring.sort((a, b) => a.date.localeCompare(b.date) || a.fullName.localeCompare(b.fullName, 'ar'))
    const openTasks = teamTasks.tasks.filter((task: { status: string }) => (TASK_OPEN_STATUSES as readonly string[]).includes(task.status))
    return {
      manager: true as const, date: today, windowDays: TEAM_WINDOW_DAYS, canSeeCompensation: finance, team,
      attendanceToday: attendance && {
        attended: count(status => ['present', 'late', 'early_leave'].includes(status)), late: count(status => status === 'late'),
        absent: count(status => status === 'absent'), onLeave: count(status => status === 'leave'), none: count(status => status === 'none'), rows: attendance,
      },
      leaves: leaveOn ? leaves : null,
      expiring,
      pendingApprovals: inbox.length,
      tasks: { open: openTasks.length, overdue: openTasks.filter((task: { overdue?: boolean }) => task.overdue === true).length },
    }
  }
}
