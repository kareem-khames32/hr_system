import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, In, type EntityManager } from 'typeorm'
import { localDateOf } from '../attendance/attendance.service'
import { weekOfDay, weekStartOf } from '../attendance/schedule-tools'
import { recordAudit } from '../audit/audit'
import type { JwtPayload } from '../auth/auth.service'
import { assertCompanyWideWrite, branchScopeOf, inBranchScope, userHasPerm } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import { ModulesService } from '../modules-registry/modules.service'
import { readBranchCurrencyOf } from '../org/branch-currency-db'
import { overtimeWageMonthSalary } from '../payroll/overtime-financial'
import { payrollPeriodOfDate } from '../payroll/payroll-period'
import { PAYROLL_SALARY_EVIDENCE_MODE_KEY } from '../payroll/payroll-run-salary'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import {
  addDays, costCents, DAY_MINUTES_MAX, decisionFields, entryFields, hourlyWage, PROJECT_NOT_FOUND, projectFields, reportRange, TIMESHEETS_COST_FEATURE, TIMESHEETS_MIGRATION_MISSING, TimesheetEntry,
  TimesheetProject, TimesheetProjectTask, timesheetsReady, TimesheetWeek, WEEK_NOT_FOUND, WEEK_STATUS_LABELS, weekDays, weekEditable, weekOrCurrent, type WeekStatus,
} from './timesheets'

// B5.8: ساعات المشاريع — كل كتابة على ساعات موظف أو أسبوعه (تسجيله، إرساله، سحبه، وقرار المدير) تحت قفل صف ملف الموظف، وبعده صف الأسبوع:
// ترتيب القفل واحد (الموظف ← الأسبوع)، والأسبوع اللي لسه مالوش صف محمي بقفل الموظف. قرار المدير بيتحكم بعد القفل (المدير المباشر دلوقتي،
// أو صاحب الصلاحية والموظف في نطاقه بفرعه الحالي) — غير كده «مش موجود». التكلفة قراءة بس بأجر ساعة تسعير الإضافي، ورا ميزة مقفولة وصلاحية الرواتب.

const NOT_EMPLOYEE = 'حسابك مش مربوط بملف موظف'
const NOT_ACTIVE = 'ملفك مش على رأس العمل'
const BRANCH_NOT_FOUND = 'الفرع مش موجود'
const WEEK_INVALID = 'الأسبوع مش صحيح (بدايته الأحد)'
const WEEK_SUBMITTED = 'الأسبوع اتبعت للاعتماد — اسحبه الأول لو عايز تعدّل'
const WEEK_APPROVED = 'الأسبوع معتمد ومابيتعدّلش'
const HIDDEN_PERSON = 'موظف خارج نطاقك'
const ACTIVE_STATUSES = ['active', 'probation', 'notice_period']
const flag = (value: unknown) => value === true || value === 1
const idOf = (value: unknown) => (value == null ? null : Number(value))
const marks = (ids: readonly unknown[], from = 0) => ids.map((_, index) => `@${index + from}`).join(', ')
const ymd = (value: unknown) => String(value).slice(0, 10)
const statusLabel = (status: string | null | undefined) => WEEK_STATUS_LABELS[(status ?? 'DRAFT') as WeekStatus | 'DRAFT'] ?? String(status)

interface LockedPerson { id: number; fullName: string; employeeCode: string | null; branchId: number | null; managerEmployeeId: number | null; status: string; isActive: unknown }
interface Names { projects: Map<number, TimesheetProject>; tasks: Map<number, TimesheetProjectTask> }

@Injectable()
export class TimesheetsService {
  constructor(@InjectDataSource() private readonly ds: DataSource, private readonly modules: ModulesService) {}

  private async assertReady(em: EntityManager) {
    if (!(await timesheetsReady(em))) throw new BadRequestException(TIMESHEETS_MIGRATION_MISSING)
  }

  private me(user: JwtPayload): number {
    if (!user.employeeId) throw new ForbiddenException(NOT_EMPLOYEE)
    return Number(user.employeeId)
  }

  private async lockPerson(em: EntityManager, employeeId: number): Promise<LockedPerson | null> {
    const [person]: LockedPerson[] = await em.query(
      'SELECT [id], [fullName], [employeeCode], [branchId], [managerEmployeeId], [status], [isActive] FROM dbo.employees WITH (UPDLOCK, ROWLOCK) WHERE [id] = @0', [employeeId])
    return person ?? null
  }

  /** ملف صاحب الحساب بقفل صفه — لازم يكون على رأس العمل */
  private async lockMe(em: EntityManager, me: number): Promise<LockedPerson> {
    const person = await this.lockPerson(em, me)
    if (!person || !flag(person.isActive) || !ACTIVE_STATUSES.includes(person.status)) throw new ForbiddenException(NOT_ACTIVE)
    return person
  }

  private weekRow(em: EntityManager, employeeId: number, weekStart: string) {
    return em.getRepository(TimesheetWeek).findOne({ where: { employeeId, weekStart }, lock: { mode: 'pessimistic_write' } })
  }

  private async names(em: EntityManager, entries: Array<Pick<TimesheetEntry, 'projectId' | 'taskId'>>): Promise<Names> {
    const projectIds = [...new Set(entries.map(row => row.projectId))], taskIds = [...new Set(entries.map(row => row.taskId).filter((id): id is number => id != null))]
    return { projects: new Map((projectIds.length ? await em.getRepository(TimesheetProject).find({ where: { id: In(projectIds) } }) : []).map(row => [row.id, row])),
      tasks: new Map((taskIds.length ? await em.getRepository(TimesheetProjectTask).find({ where: { id: In(taskIds) } }) : []).map(row => [row.id, row])) }
  }

  private lineView(row: TimesheetEntry, names: Names) {
    const project = names.projects.get(row.projectId)
    return { id: row.id, workDate: ymd(row.workDate), projectId: row.projectId, clientName: project?.clientName ?? '—', projectName: project?.name ?? '—', taskId: row.taskId,
      taskName: row.taskId == null ? null : names.tasks.get(row.taskId)?.name ?? '—', minutes: row.minutes, note: row.note }
  }

  private async attendanceMinutes(em: EntityManager, employeeIds: number[], from: string, to: string): Promise<Map<string, number>> {
    if (!employeeIds.length) return new Map()
    const rows: Array<{ employeeId: number; day: string; workMinutes: number }> = await em.query(
      `SELECT [employeeId], CONVERT(varchar(10), [date], 23) AS [day], [workMinutes] FROM dbo.attendance_days WHERE [date] BETWEEN @0 AND @1 AND [employeeId] IN (${marks(employeeIds, 2)})`, [from, to, ...employeeIds])
    return new Map(rows.map(row => [`${Number(row.employeeId)}:${row.day}`, Number(row.workMinutes)]))
  }

  private daysView(weekStart: string, employeeId: number, entries: TimesheetEntry[], attendance: Map<string, number>) {
    return weekDays(weekStart).map(date => ({ date, loggedMinutes: entries.filter(row => ymd(row.workDate) === date).reduce((sum, row) => sum + row.minutes, 0),
      attendanceMinutes: attendance.get(`${employeeId}:${date}`) ?? null }))
  }

  // ===== المشاريع =====

  private projectView(row: TimesheetProject, tasks: TimesheetProjectTask[]) {
    return { id: row.id, clientName: row.clientName, name: row.name, branchId: row.branchId, isActive: flag(row.isActive),
      tasks: tasks.filter(task => task.projectId === row.id).map(task => ({ id: task.id, name: task.name, isActive: flag(task.isActive) })) }
  }

  /** مشاريع نطاق الحساب (ومشاريع كل الفروع)، وفروع النطاق للاختيار. `canEditAll`: مشروع لكل الفروع بيتعدّل من حساب بكل الفروع بس. */
  async projects(user: JwtPayload) {
    const em = this.ds.manager, scope = branchScopeOf(user)
    if (!(await timesheetsReady(em))) return { ready: false, canEditAll: scope === null, branches: [], projects: [] }
    const rows = (await em.getRepository(TimesheetProject).find({ order: { clientName: 'ASC', name: 'ASC', id: 'ASC' } })).filter(row => row.branchId == null || inBranchScope(scope, row.branchId))
    const tasks = rows.length ? await em.getRepository(TimesheetProjectTask).find({ where: { projectId: In(rows.map(row => row.id)) }, order: { id: 'ASC' } }) : []
    const branches: Array<{ id: number; name: string }> = (await em.query('SELECT [id], [name] FROM dbo.branches ORDER BY [name], [id]'))
      .map((row: { id: number; name: string }) => ({ id: Number(row.id), name: row.name })).filter((row: { id: number }) => inBranchScope(scope, row.id))
    return { ready: true, canEditAll: scope === null, branches, projects: rows.map(row => this.projectView(row, tasks)) }
  }

  /** مشروع جديد أو تعديل (تحت قفل صفه): لكل الفروع = حساب بكل الفروع؛ لفرع = الفرع في نطاق الحساب. المهام بتتضاف وتتعدّل وتتقفل، وماتتمسحش. */
  async saveProject(user: JwtPayload, id: number | null, body: unknown) {
    const { fields, error } = projectFields(body)
    if (!fields) throw new BadRequestException(error)
    const scope = branchScopeOf(user)
    return this.ds.transaction(async em => {
      await this.assertReady(em)
      const repo = em.getRepository(TimesheetProject), taskRepo = em.getRepository(TimesheetProjectTask)
      const current = id === null ? null : await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
      if (id !== null && (!current || (current.branchId != null && !inBranchScope(scope, current.branchId)))) throw new NotFoundException(PROJECT_NOT_FOUND)
      if (fields.branchId === null || (current && current.branchId == null)) assertCompanyWideWrite(user)
      if (fields.branchId !== null) {
        const [branch]: Array<{ id: number }> = await em.query('SELECT [id] FROM dbo.branches WHERE [id] = @0', [fields.branchId])
        if (!branch || !inBranchScope(scope, fields.branchId)) throw new NotFoundException(BRANCH_NOT_FOUND)
      }
      const existing = current ? await taskRepo.find({ where: { projectId: current.id }, order: { id: 'ASC' } }) : []
      if (fields.tasks.some(task => task.id !== null && !existing.some(row => row.id === task.id))) throw new BadRequestException('مهمة من المهام مش تبع المشروع')
      if (existing.some(row => !fields.tasks.some(task => task.id === row.id) && fields.tasks.some(task => task.name === row.name))) throw new BadRequestException('مهمة مكررة في المشروع')
      const now = new Date(), values = { clientName: fields.clientName, name: fields.name, branchId: fields.branchId, isActive: fields.isActive, updatedByUserId: user.sub, updatedAt: now }
      const before = current ? this.projectView(current, existing) : undefined
      const projectId = current ? current.id : (await repo.save(repo.create(values))).id
      if (current) await repo.update({ id: current.id }, values)
      for (const task of fields.tasks) {
        if (task.id === null) await taskRepo.save(taskRepo.create({ projectId, name: task.name, isActive: task.isActive }))
        else await taskRepo.update({ id: task.id, projectId }, { name: task.name, isActive: task.isActive })
      }
      await recordAudit(em, { category: 'SETTINGS', action: current ? 'TIMESHEET_PROJECT_UPDATED' : 'TIMESHEET_PROJECT_CREATED', entityType: 'timesheet_project', entityId: String(projectId), actorUserId: user.sub,
        branchId: fields.branchId ?? undefined, summary: `${current ? 'تعديل' : 'إضافة'} مشروع «${fields.name}» للعميل «${fields.clientName}»`, before, after: fields })
      return { id: projectId }
    })
  }

  // ===== الموظف =====

  /** «ساعاتي»: أسبوع (الأحد) بأيامه — المسجّل ودقايق الحضور المحسوبة لكل يوم — وحالته، والمشاريع المتاحة لفرع الموظف */
  async mine(user: JwtPayload, query: { week?: unknown }) {
    const me = this.me(user), em = this.ds.manager, today = localDateOf(new Date())
    const weekStart = weekOrCurrent(query?.week, today)
    if (!(await timesheetsReady(em))) return { ready: false, weekStart, today, status: 'DRAFT', statusLabel: statusLabel(null), editable: false, decisionNote: null, days: [], entries: [], projects: [], totalMinutes: 0 }
    const [person]: Array<{ branchId: number | null }> = await em.query('SELECT [branchId] FROM dbo.employees WHERE [id] = @0', [me])
    const branchId = idOf(person?.branchId)
    const available = (await em.getRepository(TimesheetProject).find({ where: { isActive: true }, order: { clientName: 'ASC', name: 'ASC', id: 'ASC' } })).filter(row => row.branchId == null || row.branchId === branchId)
    const tasks = available.length ? await em.getRepository(TimesheetProjectTask).find({ where: { projectId: In(available.map(row => row.id)), isActive: true }, order: { id: 'ASC' } }) : []
    const entries = await em.getRepository(TimesheetEntry).find({ where: { employeeId: me, weekStart }, order: { workDate: 'ASC', id: 'ASC' } })
    const week = await em.getRepository(TimesheetWeek).findOne({ where: { employeeId: me, weekStart } })
    const names = await this.names(em, entries)
    return { ready: true, weekStart, today, status: week?.status ?? 'DRAFT', statusLabel: statusLabel(week?.status), editable: weekEditable(week?.status), decisionNote: week?.decisionNote ?? null,
      days: this.daysView(weekStart, me, entries, await this.attendanceMinutes(em, [me], weekStart, addDays(weekStart, 6))),
      entries: entries.map(row => this.lineView(row, names)), totalMinutes: entries.reduce((sum, row) => sum + row.minutes, 0),
      projects: available.map(row => ({ id: row.id, clientName: row.clientName, name: row.name, tasks: tasks.filter(task => task.projectId === row.id).map(task => ({ id: task.id, name: task.name })) })) }
  }

  /** الأسبوع لازم يكون بيتعدّل (مسودة أو مرفوض) — بيتنادى بعد قفل صف الموظف */
  private async editableWeek(em: EntityManager, me: number, weekStart: string): Promise<TimesheetWeek | null> {
    const week = await this.weekRow(em, me, weekStart)
    if (week?.status === 'SUBMITTED') throw new ConflictException(WEEK_SUBMITTED)
    if (week && !weekEditable(week.status)) throw new ConflictException(WEEK_APPROVED)
    return week
  }

  /** سطر ساعات ليوم ومشروع ومهمة: بيتحط أو يتعدّل، وصفر دقايق بيشيله. المشروع لازم يكون مفعّل ومتاح لفرع الموظف الحالي، ومجموع اليوم 24 ساعة بالكتير. */
  async saveEntry(user: JwtPayload, body: unknown) {
    const me = this.me(user)
    const { fields, error } = entryFields(body, localDateOf(new Date()))
    if (!fields) throw new BadRequestException(error)
    const weekStart = weekOfDay(fields.workDate)
    return this.ds.transaction(async em => {
      await this.assertReady(em)
      const person = await this.lockMe(em, me)
      await this.editableWeek(em, me, weekStart)
      const repo = em.getRepository(TimesheetEntry)
      const sameDay = await repo.find({ where: { employeeId: me, workDate: fields.workDate }, order: { id: 'ASC' } })
      const existing = sameDay.find(row => row.projectId === fields.projectId && row.taskId === fields.taskId) ?? null
      if (fields.minutes === 0) {
        if (existing) await repo.delete({ id: existing.id })
        return { ok: true }
      }
      const project = await em.getRepository(TimesheetProject).findOne({ where: { id: fields.projectId } })
      if (!project || !flag(project.isActive) || (project.branchId != null && project.branchId !== idOf(person.branchId))) throw new NotFoundException(PROJECT_NOT_FOUND)
      if (fields.taskId !== null) {
        const task = await em.getRepository(TimesheetProjectTask).findOne({ where: { id: fields.taskId, projectId: project.id } })
        if (!task || !flag(task.isActive)) throw new BadRequestException('المهمة مش تبع المشروع')
      }
      if (sameDay.filter(row => row.id !== existing?.id).reduce((sum, row) => sum + row.minutes, 0) + fields.minutes > DAY_MINUTES_MAX) throw new BadRequestException('مجموع ساعات اليوم أكتر من 24 ساعة')
      const now = new Date()
      if (existing) await repo.update({ id: existing.id }, { minutes: fields.minutes, note: fields.note, updatedAt: now })
      else await repo.save(repo.create({ employeeId: me, workDate: fields.workDate, weekStart, projectId: project.id, taskId: fields.taskId, minutes: fields.minutes, note: fields.note, updatedAt: now }))
      return { ok: true }
    })
  }

  /** إرسال الأسبوع للاعتماد: فيه ساعات، ومش في المستقبل، ومش مبعوت ولا معتمد. المرفوض بيتبعت تاني بنفس الصف. */
  async submit(user: JwtPayload, body: unknown) {
    const me = this.me(user), weekStart = weekStartOf(((body ?? {}) as Record<string, unknown>).weekStart)
    if (!weekStart || weekStart > localDateOf(new Date())) throw new BadRequestException(WEEK_INVALID)
    return this.ds.transaction(async em => {
      await this.assertReady(em)
      await this.lockMe(em, me)
      const week = await this.weekRow(em, me, weekStart)
      if (week?.status === 'SUBMITTED') throw new ConflictException('الأسبوع مبعوت للاعتماد قبل كده')
      if (week?.status === 'APPROVED') throw new ConflictException(WEEK_APPROVED)
      const totalMinutes = (await em.getRepository(TimesheetEntry).find({ where: { employeeId: me, weekStart } })).reduce((sum, row) => sum + row.minutes, 0)
      if (totalMinutes <= 0) throw new BadRequestException('مفيش ساعات مسجّلة في الأسبوع ده')
      const repo = em.getRepository(TimesheetWeek), values = { status: 'SUBMITTED', totalMinutes, submittedAt: new Date(), decidedByUserId: null, decidedAt: null, decisionNote: null }
      if (week) await repo.update({ id: week.id }, values)
      else await repo.save(repo.create({ employeeId: me, weekStart, ...values }))
      return { weekStart, status: 'SUBMITTED', totalMinutes }
    })
  }

  /** سحب أسبوع مبعوت لسه مااتاخدش فيه قرار: بيرجع مسودة */
  async recall(user: JwtPayload, body: unknown) {
    const me = this.me(user), weekStart = weekStartOf(((body ?? {}) as Record<string, unknown>).weekStart)
    if (!weekStart) throw new BadRequestException(WEEK_INVALID)
    return this.ds.transaction(async em => {
      await this.assertReady(em)
      await this.lockMe(em, me)
      const week = await this.weekRow(em, me, weekStart)
      if (week?.status !== 'SUBMITTED') throw new ConflictException('مفيش أسبوع مبعوت يتسحب')
      await em.getRepository(TimesheetWeek).delete({ id: week.id })
      return { weekStart, status: 'DRAFT' }
    })
  }

  // ===== المدير =====

  /**
   * «ساعات فريقي»: الأسابيع المبعوتة (وآخر اللي اتاخد فيها قرار) لمرؤوسي صاحب الحساب المباشرين، ولموظفين نطاق صاحب `timesheets.manage` بفرعهم الحالي —
   * بسطورها ودقايق الحضور المحسوبة لكل يوم. أسبوع صاحب الحساب نفسه مش فيها.
   */
  async team(user: JwtPayload) {
    const em = this.ds.manager, me = user.employeeId == null ? null : Number(user.employeeId), byRight = userHasPerm(user, 'timesheets.manage'), scope = branchScopeOf(user)
    if (!(await timesheetsReady(em))) return { ready: false, weeks: [] }
    const repo = em.getRepository(TimesheetWeek)
    const candidates = [...await repo.find({ where: { status: 'SUBMITTED' }, order: { weekStart: 'ASC', id: 'ASC' } }),
      ...await repo.find({ where: { status: In(['APPROVED', 'REJECTED']) }, order: { decidedAt: 'DESC', id: 'DESC' }, take: 200 })]
    const ids = [...new Set(candidates.map(row => row.employeeId))]
    const people: Array<{ id: number; fullName: string; employeeCode: string | null; branchId: number | null; managerEmployeeId: number | null }> = ids.length
      ? await em.query(`SELECT [id], [fullName], [employeeCode], [branchId], [managerEmployeeId] FROM dbo.employees WHERE [id] IN (${marks(ids)})`, ids) : []
    const visible = new Map(people.filter(row => Number(row.id) !== me && ((me !== null && idOf(row.managerEmployeeId) === me) || (byRight && inBranchScope(scope, idOf(row.branchId))))).map(row => [Number(row.id), row]))
    const weeks = candidates.filter(row => visible.has(row.employeeId)).slice(0, 100)
    const out = []
    for (const week of weeks) {
      const person = visible.get(week.employeeId)!
      const entries = await em.getRepository(TimesheetEntry).find({ where: { employeeId: week.employeeId, weekStart: ymd(week.weekStart) }, order: { workDate: 'ASC', id: 'ASC' } })
      const names = await this.names(em, entries)
      out.push({ id: week.id, employeeId: week.employeeId, fullName: person.fullName, employeeCode: person.employeeCode ?? null, weekStart: ymd(week.weekStart), status: week.status, statusLabel: statusLabel(week.status),
        totalMinutes: week.totalMinutes, submittedAt: week.submittedAt, decisionNote: week.decisionNote, canDecide: week.status === 'SUBMITTED',
        days: this.daysView(ymd(week.weekStart), week.employeeId, entries, await this.attendanceMinutes(em, [week.employeeId], ymd(week.weekStart), addDays(ymd(week.weekStart), 6))),
        lines: entries.map(row => this.lineView(row, names)) })
    }
    return { ready: true, weeks: out }
  }

  /**
   * قرار على أسبوع مبعوت: تحت قفل صف الموظف ثم صف الأسبوع، والحكم بعد القفل — المدير المباشر دلوقتي، أو صاحب `timesheets.manage` والموظف في نطاقه
   * بفرعه الحالي (غير كده «مش موجود»). ومحدش بيعتمد أسبوعه. بسطر تدقيق.
   */
  async decide(user: JwtPayload, weekId: number, body: unknown) {
    const { fields, error } = decisionFields(body)
    if (!fields) throw new BadRequestException(error)
    const me = user.employeeId == null ? null : Number(user.employeeId)
    return this.ds.transaction(async em => {
      await this.assertReady(em)
      const repo = em.getRepository(TimesheetWeek)
      const peek = await repo.findOne({ where: { id: weekId } })
      if (!peek) throw new NotFoundException(WEEK_NOT_FOUND)
      const person = await this.lockPerson(em, peek.employeeId)
      const week = await repo.findOne({ where: { id: weekId, employeeId: peek.employeeId }, lock: { mode: 'pessimistic_write' } })
      const byManager = !!person && me !== null && idOf(person.managerEmployeeId) === me
      const byRight = !!person && userHasPerm(user, 'timesheets.manage') && inBranchScope(branchScopeOf(user), idOf(person.branchId))
      if (!week || !person || (!byManager && !byRight)) throw new NotFoundException(WEEK_NOT_FOUND)
      if (me !== null && me === week.employeeId) throw new ForbiddenException('ماينفعش تعتمد ساعاتك بنفسك')
      if (week.status !== 'SUBMITTED') throw new ConflictException('الأسبوع مش مستني اعتماد')
      const status = fields.approve ? 'APPROVED' : 'REJECTED'
      await repo.update({ id: week.id }, { status, decidedByUserId: user.sub, decidedAt: new Date(), decisionNote: fields.note })
      await recordAudit(em, { category: 'SETTINGS', action: fields.approve ? 'TIMESHEET_WEEK_APPROVED' : 'TIMESHEET_WEEK_REJECTED', entityType: 'timesheet_week', entityId: String(week.id), actorUserId: user.sub,
        branchId: idOf(person.branchId) ?? undefined, summary: `${fields.approve ? 'اعتماد' : 'رفض'} ساعات أسبوع ${ymd(week.weekStart)} للموظف ${person.fullName}`,
        before: { status: 'SUBMITTED' }, after: { status, totalMinutes: week.totalMinutes, note: fields.note, by: byManager ? 'MANAGER' : 'RIGHT' } })
      return { id: week.id, status }
    })
  }

  // ===== التقرير =====

  /**
   * ساعات الأسابيع المعتمدة في فترة، لموظفين نطاق القارئ (بفرعهم الحالي)، لكل عميل ومشروع ومهمة. التكلفة بتتعرض لو ميزة `timesheets.cost` مفتوحة
   * والقارئ معاه `payroll.view`: دقايق الموظف × أجر ساعته في شهر المسير اللي فيه اليوم (نفس مصدر تسعير الإضافي)، بعملة فرعه — قراءة بس.
   * موظف راتب شهره مش متحدد = دقايقه «من غير تسعير».
   */
  async report(user: JwtPayload, query: unknown) {
    const range = reportRange(query)
    if (!range) throw new BadRequestException('حدّد فترة التقرير (من وإلى، سنة بالكتير)')
    const scope = branchScopeOf(user)
    const costShown = userHasPerm(user, 'payroll.view') && await this.modules.isFeatureEnabled(TIMESHEETS_COST_FEATURE)
    return this.ds.transaction(async em => {
      await this.assertReady(em)
      const rows: Array<{ employeeId: number; branchId: number | null; fullName: string; employeeCode: string | null; workDate: string; projectId: number; taskId: number | null; minutes: number }> = (await em.query(
        `SELECT e.[employeeId], p.[branchId], p.[fullName], p.[employeeCode], CONVERT(varchar(10), e.[workDate], 23) AS [workDate], e.[projectId], e.[taskId], e.[minutes]
         FROM dbo.timesheet_entries e INNER JOIN dbo.timesheet_weeks w ON w.[employeeId] = e.[employeeId] AND w.[weekStart] = e.[weekStart] AND w.[status] = N'APPROVED'
           INNER JOIN dbo.employees p ON p.[id] = e.[employeeId]
         WHERE e.[workDate] BETWEEN @0 AND @1 ORDER BY e.[projectId], e.[employeeId], e.[workDate], e.[id]`, [range.from, range.to]))
        .map((row: Record<string, unknown>) => ({ ...row, employeeId: Number(row.employeeId), branchId: idOf(row.branchId), projectId: Number(row.projectId), taskId: idOf(row.taskId), minutes: Number(row.minutes) }))
        .filter((row: { branchId: number | null }) => inBranchScope(scope, row.branchId))
      const names = await this.names(em, rows)
      const price = costShown ? await this.pricer(em) : null
      const projects = []
      for (const projectId of [...new Set(rows.map(row => row.projectId))]) {
        const own = rows.filter(row => row.projectId === projectId), project = names.projects.get(projectId)
        const costs = new Map<string, number>()
        let unpricedMinutes = 0
        if (price) for (const row of own) {
          const priced = await price(row.employeeId, row.branchId, row.workDate)
          if (!priced) unpricedMinutes += row.minutes
          else costs.set(priced.currency, (costs.get(priced.currency) ?? 0) + costCents(row.minutes, priced.hourly))
        }
        projects.push({ projectId, clientName: project?.clientName ?? '—', projectName: project?.name ?? '—', minutes: own.reduce((sum, row) => sum + row.minutes, 0),
          tasks: [...new Set(own.map(row => row.taskId))].map(taskId => ({ taskId, taskName: taskId == null ? null : names.tasks.get(taskId)?.name ?? '—', minutes: own.filter(row => row.taskId === taskId).reduce((sum, row) => sum + row.minutes, 0) })),
          employees: [...new Set(own.map(row => row.employeeId))].map(employeeId => { const first = own.find(row => row.employeeId === employeeId)!
            return { employeeId, fullName: first.fullName ?? HIDDEN_PERSON, employeeCode: first.employeeCode ?? null, minutes: own.filter(row => row.employeeId === employeeId).reduce((sum, row) => sum + row.minutes, 0) } }),
          ...(price ? { costs: [...costs].map(([currency, cents]) => ({ currency, cents })), unpricedMinutes } : {}) })
      }
      projects.sort((a, b) => a.clientName.localeCompare(b.clientName, 'ar') || a.projectName.localeCompare(b.projectName, 'ar') || a.projectId - b.projectId)
      return { ...range, costShown, totalMinutes: rows.reduce((sum, row) => sum + row.minutes, 0), projects }
    })
  }

  /** أجر ساعة موظف في شهر مسير يوم معيّن (بيتحسب مرة لكل موظف وشهر) — null لو راتب الشهر أو الإعدادات مش صالحة */
  private async pricer(em: EntityManager) {
    const config = new Map((await em.find(RequestsConfig, { where: { key: In(['payroll.monthly_days', 'payroll.daily_hours', 'payroll.cycle_start_day', PAYROLL_SALARY_EVIDENCE_MODE_KEY]) } })).map(row => [row.key, row.value]))
    const monthlyDays = Number(config.get('payroll.monthly_days') ?? '30'), dailyHours = Number(config.get('payroll.daily_hours') ?? '8'), cycleStart = Number(config.get('payroll.cycle_start_day') ?? '23')
    const currencyOf = await readBranchCurrencyOf(em), cache = new Map<string, number | null>(), employees = new Map<number, Employee | null>()
    return async (employeeId: number, branchId: number | null, workDate: string): Promise<{ hourly: number; currency: string } | null> => {
      let hourly: number | null = null
      try {
        const key = `${employeeId}:${payrollPeriodOfDate(workDate, cycleStart)}`
        if (!cache.has(key)) {
          if (!employees.has(employeeId)) employees.set(employeeId, await em.findOneBy(Employee, { id: employeeId }))
          const employee = employees.get(employeeId)
          const selected = employee ? (await overtimeWageMonthSalary(em, employee, workDate, config)).salary : null
          cache.set(key, selected?.ok ? hourlyWage(selected.monthlyComponents, monthlyDays, dailyHours) : null)
        }
        hourly = cache.get(key) ?? null
      } catch { hourly = null }
      return hourly === null ? null : { hourly, currency: String(currencyOf(branchId)) }
    }
  }
}
