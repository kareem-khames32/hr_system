import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, In, type EntityManager } from 'typeorm'
import { localDateOf } from '../attendance/attendance.service'
import { recordAudit } from '../audit/audit'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, inBranchScope } from '../auth/guards'
import { recordOutboxEvent } from '../queue/outbox'
import { Task, TASK_OPEN_STATUSES } from '../tasks/task.entity'
import {
  actionFields, ACTIONS_MAX, dueDateOf, INCIDENT_KIND_LABELS, INCIDENT_KINDS, INCIDENT_NOT_FOUND, INCIDENT_SEVERITIES, INCIDENT_SEVERITY_LABELS, INCIDENT_STATUS_LABELS, incidentCode, NEXT_STATUS,
  reportFields, REPORTS_PER_DAY, reviewFields, SAFETY_MIGRATION_MISSING, SafetyIncident, SafetyIncidentAction, safetyReady,
  type IncidentKind, type IncidentSeverity, type IncidentStatus,
} from './safety'

// B5.7: السلامة — البلاغ من أي موظف على فرعه الحالي (تحت قفل صف ملفه)، والسجل لصاحب `safety.manage` بفرع الحادث: كل كتابة تحت قفل صف الحادث
// والحكم على النطاق بعد القفل (غير كده «مش موجود»). الإجراء التصحيحي ومهمة إبلاغ الجهة مهام في محرك المهام القايم. ترتيب القفل: الحادث ← الموظف ← المهام.
// سرّي: اسم المبلّغ والمصاب بفرعهم الحالي (برّه نطاق القارئ = من غير اسم ولا رقم)، والمبلّغ بيشوف بلاغه وحالته بس.

const NOT_EMPLOYEE = 'حسابك مش مربوط بملف موظف'
const NOT_ACTIVE = 'ملفك مش على رأس العمل'
const EMPLOYEE_NOT_FOUND = 'الموظف غير موجود'
const LEAVE_NOT_FOUND = 'الإجازة مش موجودة'
const CLOSED_LOCKED = 'الحادث مقفول — افتح التحقيق تاني الأول'
const HIDDEN_PERSON = 'موظف خارج نطاقك'
const TASK_STATUS_LABELS: Record<string, string> = { OPEN: 'مفتوحة', IN_PROGRESS: 'شغالة', WAITING: 'مستنية', DONE: 'خلصت', CANCELLED: 'اتلغت' }
const ACTIVE_STATUSES = ['active', 'probation', 'notice_period']
const flag = (value: unknown) => value === true || value === 1
const idOf = (value: unknown) => (value == null ? null : Number(value))
const marks = (ids: readonly number[]) => ids.map((_, index) => `@${index}`).join(', ')
const ymd = (value: unknown) => (value == null ? null : String(value).slice(0, 10))

interface PersonRow { id: number; fullName: string; employeeCode: string | null; branchId: number | null }
interface LockedPerson extends PersonRow { status: string; isActive: unknown }

@Injectable()
export class SafetyService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  private async assertReady(em: EntityManager) {
    if (!(await safetyReady(em))) throw new BadRequestException(SAFETY_MIGRATION_MISSING)
  }

  private options() {
    return { kinds: INCIDENT_KINDS.map(code => ({ code, label: INCIDENT_KIND_LABELS[code] })), severities: INCIDENT_SEVERITIES.map(code => ({ code, label: INCIDENT_SEVERITY_LABELS[code] })) }
  }

  private async people(em: EntityManager, ids: Array<number | null>): Promise<Map<number, PersonRow>> {
    const wanted = [...new Set(ids.filter((id): id is number => id != null))]
    if (!wanted.length) return new Map()
    const rows: PersonRow[] = await em.query(`SELECT [id], [fullName], [employeeCode], [branchId] FROM dbo.employees WHERE [id] IN (${marks(wanted)})`, wanted)
    return new Map(rows.map(row => [Number(row.id), { id: Number(row.id), fullName: row.fullName, employeeCode: row.employeeCode ?? null, branchId: idOf(row.branchId) }]))
  }

  /** اسم موظف في عرض السجل: بفرعه الحالي — برّه نطاق القارئ من غير اسم ولا رقم */
  private personView(scope: number[] | null, people: Map<number, PersonRow>, id: number | null) {
    if (id == null) return null
    const person = people.get(id)
    if (!person || !inBranchScope(scope, person.branchId)) return { id: null, fullName: HIDDEN_PERSON, employeeCode: null }
    return { id: person.id, fullName: person.fullName, employeeCode: person.employeeCode }
  }

  private statusOf(row: SafetyIncident) {
    return { status: row.status, statusLabel: INCIDENT_STATUS_LABELS[row.status as IncidentStatus] ?? row.status }
  }

  // ===== الموظف =====

  /** «بلاغات السلامة»: بلاغات صاحب الحساب وحالتها بس (من غير الشدة والسبب والأيام) */
  async mine(user: JwtPayload) {
    if (!user.employeeId) throw new ForbiddenException(NOT_EMPLOYEE)
    const em = this.ds.manager, me = Number(user.employeeId)
    if (!(await safetyReady(em))) return { ready: false, ...this.options(), reports: [] }
    const rows = await em.getRepository(SafetyIncident).find({ where: { reporterEmployeeId: me }, order: { id: 'DESC' }, take: 100 })
    return { ready: true, ...this.options(), reports: rows.map(row => ({ id: row.id, code: incidentCode(row.id), kind: row.kind, kindLabel: INCIDENT_KIND_LABELS[row.kind as IncidentKind] ?? row.kind,
      occurredOn: ymd(row.occurredOn), location: row.location, description: row.description, ...this.statusOf(row), createdAt: row.createdAt })) }
  }

  /** بلاغ حادث: على فرع المبلّغ الحالي، تحت قفل صف ملفه (الفرع والحالة وعدد بلاغات اليوم بيتحكموا بعد القفل) */
  async report(user: JwtPayload, body: unknown) {
    if (!user.employeeId) throw new ForbiddenException(NOT_EMPLOYEE)
    const me = Number(user.employeeId), now = new Date(), today = localDateOf(now)
    const { fields, error } = reportFields(body, today)
    if (!fields) throw new BadRequestException(error)
    return this.ds.transaction(async em => {
      await this.assertReady(em)
      const [person]: LockedPerson[] = await em.query('SELECT [id], [fullName], [employeeCode], [branchId], [status], [isActive] FROM dbo.employees WITH (UPDLOCK, ROWLOCK) WHERE [id] = @0', [me])
      if (!person || !flag(person.isActive) || !ACTIVE_STATUSES.includes(person.status) || person.branchId == null) throw new ForbiddenException(NOT_ACTIVE)
      const [counted]: Array<{ total: number }> = await em.query('SELECT COUNT(*) AS [total] FROM dbo.safety_incidents WHERE [reporterEmployeeId] = @0 AND [createdAt] >= @1', [me, new Date(`${today}T00:00:00`)])
      if (Number(counted?.total) >= REPORTS_PER_DAY) throw new ConflictException(`${REPORTS_PER_DAY} بلاغات في اليوم بالكتير — كلّم مسؤول السلامة`)
      const repo = em.getRepository(SafetyIncident)
      const row = await repo.save(repo.create({ branchId: Number(person.branchId), reporterEmployeeId: me, kind: fields.kind, occurredOn: fields.occurredOn, location: fields.location, description: fields.description,
        injuredEmployeeId: fields.injured === 'SELF' ? me : null, injuredNote: fields.injuredNote, severity: null, lostDays: null, rootCause: null, status: 'REPORTED', leaveId: null, authorityTaskId: null,
        closedByUserId: null, closedAt: null, createdAt: now, updatedAt: now }))
      return { id: row.id, code: incidentCode(row.id) }
    })
  }

  // ===== السجل =====

  /** سجل حوادث نطاق الحساب (بفرع الحادث)، وملخص السنة، وموظفين النطاق للاختيار */
  async list(user: JwtPayload) {
    const em = this.ds.manager, scope = branchScopeOf(user)
    if (!(await safetyReady(em))) return { ready: false, ...this.options(), incidents: [], summary: { open: 0, injuriesThisYear: 0, lostDaysThisYear: 0 }, people: [] }
    const rows = (await em.getRepository(SafetyIncident).find({ order: { id: 'DESC' }, take: 500 })).filter(row => inBranchScope(scope, row.branchId))
    const people = await this.people(em, rows.flatMap(row => [row.reporterEmployeeId, row.injuredEmployeeId]))
    const year = localDateOf(new Date()).slice(0, 4), thisYear = rows.filter(row => String(ymd(row.occurredOn)).startsWith(year))
    const active: PersonRow[] = (await em.query(`SELECT [id], [fullName], [employeeCode], [branchId] FROM dbo.employees WHERE [isActive] = 1 AND [status] IN (N'active', N'probation', N'notice_period') ORDER BY [fullName], [id]`))
      .map((row: PersonRow) => ({ id: Number(row.id), fullName: row.fullName, employeeCode: row.employeeCode ?? null, branchId: idOf(row.branchId) })).filter((row: PersonRow) => inBranchScope(scope, row.branchId))
    return { ready: true, ...this.options(),
      incidents: rows.map(row => ({ id: row.id, code: incidentCode(row.id), branchId: row.branchId, kind: row.kind, kindLabel: INCIDENT_KIND_LABELS[row.kind as IncidentKind] ?? row.kind, occurredOn: ymd(row.occurredOn),
        location: row.location, severity: row.severity, severityLabel: row.severity ? INCIDENT_SEVERITY_LABELS[row.severity as IncidentSeverity] ?? row.severity : null, lostDays: row.lostDays, ...this.statusOf(row),
        reporter: this.personView(scope, people, row.reporterEmployeeId), injured: this.personView(scope, people, row.injuredEmployeeId), injuredNote: row.injuredNote })),
      summary: { open: rows.filter(row => row.status !== 'CLOSED').length, injuriesThisYear: thisYear.filter(row => row.kind === 'INJURY').length,
        lostDaysThisYear: thisYear.reduce((sum, row) => sum + (row.lostDays ?? 0), 0) },
      people: active.map(row => ({ id: row.id, fullName: row.fullName, employeeCode: row.employeeCode })) }
  }

  private async tasksOf(em: EntityManager, ids: number[]) {
    return ids.length ? await em.getRepository(Task).find({ where: { id: In(ids) } }) : []
  }

  private taskView(task: Task | undefined, assignees: Map<number, PersonRow>, scope: number[] | null) {
    if (!task) return null
    return { taskId: task.id, title: task.title, status: task.status, statusLabel: TASK_STATUS_LABELS[task.status] ?? task.status, dueDate: ymd(task.dueDate), open: (TASK_OPEN_STATUSES as readonly string[]).includes(task.status),
      assignee: this.personView(scope, assignees, task.assigneeEmployeeId), assigneeRole: task.assigneeRole }
  }

  /** الحادث بتفاصيله: التحقيق، ومهامه بحالتها من محرك المهام، والإجازة المربوطة، وإجازات المصاب اللي ممكن تتربط */
  async detail(user: JwtPayload, id: number) {
    const em = this.ds.manager, scope = branchScopeOf(user)
    await this.assertReady(em)
    const row = await em.getRepository(SafetyIncident).findOne({ where: { id } })
    if (!row || !inBranchScope(scope, row.branchId)) throw new NotFoundException(INCIDENT_NOT_FOUND)
    const actions = await em.getRepository(SafetyIncidentAction).find({ where: { incidentId: row.id }, order: { id: 'ASC' } })
    const tasks = await this.tasksOf(em, [...actions.map(item => item.taskId), ...(row.authorityTaskId ? [row.authorityTaskId] : [])])
    const people = await this.people(em, [row.reporterEmployeeId, row.injuredEmployeeId, ...tasks.map(task => task.assigneeEmployeeId)])
    const injured = this.personView(scope, people, row.injuredEmployeeId)
    // إجازات المصاب بتتعرض لو المصاب نفسه في نطاق القارئ (بفرعه الحالي)
    const leaves: Array<{ id: number; leaveTypeCode: string; fromDate: string; toDate: string; days: number; status: string }> = injured?.id == null ? [] : await em.query(
      `SELECT [id], [leaveTypeCode], CONVERT(varchar(10), [fromDate], 23) AS [fromDate], CONVERT(varchar(10), [toDate], 23) AS [toDate], [days], [status] FROM dbo.leaves
       WHERE [employeeId] = @0 AND ([id] = @2 OR ([status] = N'APPROVED' AND [toDate] >= @1)) ORDER BY [fromDate], [id]`, [injured.id, ymd(row.occurredOn), row.leaveId ?? 0])
    const leaveView = (item: (typeof leaves)[number]) => ({ id: Number(item.id), leaveTypeCode: item.leaveTypeCode, fromDate: item.fromDate, toDate: item.toDate, days: Number(item.days), status: item.status })
    const linked = leaves.find(item => Number(item.id) === row.leaveId) ?? null
    return { id: row.id, code: incidentCode(row.id), branchId: row.branchId, kind: row.kind, kindLabel: INCIDENT_KIND_LABELS[row.kind as IncidentKind] ?? row.kind, occurredOn: ymd(row.occurredOn), location: row.location,
      description: row.description, severity: row.severity, lostDays: row.lostDays, rootCause: row.rootCause, ...this.statusOf(row), reporter: this.personView(scope, people, row.reporterEmployeeId), injured,
      injuredNote: row.injuredNote, createdAt: row.createdAt, closedAt: row.closedAt,
      actions: actions.map(item => this.taskView(tasks.find(task => task.id === item.taskId), people, scope)).filter(item => item !== null),
      authorityTask: row.authorityTaskId ? this.taskView(tasks.find(task => task.id === row.authorityTaskId), people, scope) : null,
      leave: linked ? leaveView(linked) : null, leaveOptions: leaves.filter(item => item.status === 'APPROVED').map(leaveView),
      nextStatuses: (NEXT_STATUS[row.status] ?? []).map(code => ({ code, label: INCIDENT_STATUS_LABELS[code] })) }
  }

  /** قفل صف الحادث والحكم على النطاق بعده — برّه النطاق «مش موجود» */
  private async lockIncident(em: EntityManager, user: JwtPayload, id: number): Promise<SafetyIncident> {
    await this.assertReady(em)
    const row = await em.getRepository(SafetyIncident).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
    if (!row || !inBranchScope(branchScopeOf(user), row.branchId)) throw new NotFoundException(INCIDENT_NOT_FOUND)
    return row
  }

  /** موظف على رأس العمل في نطاق الحساب، بقفل صف ملفه (الفرع بيتحكم بعد القفل) — غير كده «غير موجود» */
  private async lockPerson(em: EntityManager, user: JwtPayload, employeeId: number, mustBeActive: boolean): Promise<LockedPerson> {
    const [person]: LockedPerson[] = await em.query('SELECT [id], [fullName], [employeeCode], [branchId], [status], [isActive] FROM dbo.employees WITH (UPDLOCK, ROWLOCK) WHERE [id] = @0', [employeeId])
    if (!person || person.branchId == null || !inBranchScope(branchScopeOf(user), Number(person.branchId))) throw new NotFoundException(EMPLOYEE_NOT_FOUND)
    if (mustBeActive && (!flag(person.isActive) || !ACTIVE_STATUSES.includes(person.status))) throw new NotFoundException(EMPLOYEE_NOT_FOUND)
    return person
  }

  private reviewOf(row: SafetyIncident) {
    return { severity: row.severity, injuredEmployeeId: row.injuredEmployeeId, lostDays: row.lostDays, rootCause: row.rootCause }
  }

  /** مراجعة الحادث: الشدة، المصاب (موظف في نطاق الحساب)، الأيام المفقودة، السبب. تغيير المصاب بيفك ربط الإجازة. */
  async review(user: JwtPayload, id: number, body: unknown) {
    const { fields, error } = reviewFields(body)
    if (!fields) throw new BadRequestException(error)
    return this.ds.transaction(async em => {
      const row = await this.lockIncident(em, user, id)
      if (row.status === 'CLOSED') throw new ConflictException(CLOSED_LOCKED)
      if (fields.injuredEmployeeId !== null && fields.injuredEmployeeId !== row.injuredEmployeeId) await this.lockPerson(em, user, fields.injuredEmployeeId, false)
      if (row.kind === 'INJURY' && fields.injuredEmployeeId === null && !row.injuredNote) throw new BadRequestException('حادث الإصابة محتاج مصاب')
      const before = this.reviewOf(row)
      const leaveId = fields.injuredEmployeeId === row.injuredEmployeeId ? row.leaveId : null
      await em.getRepository(SafetyIncident).update({ id: row.id }, { ...fields, leaveId, updatedAt: new Date() })
      await recordAudit(em, { category: 'SETTINGS', action: 'SAFETY_INCIDENT_REVIEWED', entityType: 'safety_incident', entityId: String(row.id), actorUserId: user.sub, branchId: row.branchId,
        summary: `مراجعة الحادث ${incidentCode(row.id)}`, before, after: fields })
      return { id: row.id }
    })
  }

  /** خطوة الحالة. القفل بيشترط شدة وسبب، وإن كل مهام الحادث (الإجراءات وإبلاغ الجهة) اتقفلت — صفوف المهام بتتقفل للقراءة بعد صف الحادث */
  async setStatus(user: JwtPayload, id: number, body: unknown) {
    const target = ((body ?? {}) as Record<string, unknown>).status
    return this.ds.transaction(async em => {
      const row = await this.lockIncident(em, user, id)
      const allowed = NEXT_STATUS[row.status] ?? []
      if (typeof target !== 'string' || !(allowed as string[]).includes(target)) throw new ConflictException(`الحادث «${INCIDENT_STATUS_LABELS[row.status as IncidentStatus] ?? row.status}» — الخطوة دي مش متاحة`)
      const now = new Date()
      if (target === 'CLOSED') {
        if (!row.severity || !row.rootCause) throw new BadRequestException('اكتب الشدة والسبب قبل قفل الحادث')
        const taskIds = [...(await em.getRepository(SafetyIncidentAction).find({ where: { incidentId: row.id } })).map(item => item.taskId), ...(row.authorityTaskId ? [row.authorityTaskId] : [])].sort((a, b) => a - b)
        const open: Array<{ id: number }> = taskIds.length ? await em.query(
          `SELECT [id] FROM dbo.tasks WITH (UPDLOCK, ROWLOCK) WHERE [id] IN (${marks(taskIds)}) AND [status] IN (N'OPEN', N'IN_PROGRESS', N'WAITING') ORDER BY [id]`, taskIds) : []
        if (open.length) throw new ConflictException(`فيه ${open.length} مهمة للحادث لسه مفتوحة — اقفلها أو الغيها من المهام الأول`)
      }
      await em.getRepository(SafetyIncident).update({ id: row.id }, { status: target, closedByUserId: target === 'CLOSED' ? user.sub : null, closedAt: target === 'CLOSED' ? now : null, updatedAt: now })
      await recordAudit(em, { category: 'SETTINGS', action: 'SAFETY_INCIDENT_STATUS', entityType: 'safety_incident', entityId: String(row.id), actorUserId: user.sub, branchId: row.branchId,
        summary: `الحادث ${incidentCode(row.id)}: ${INCIDENT_STATUS_LABELS[target as IncidentStatus]}`, before: { status: row.status }, after: { status: target } })
      return { id: row.id, status: target }
    })
  }

  private async openTask(em: EntityManager, user: JwtPayload, values: { title: string; assigneeEmployeeId: number | null; assigneeRole: string | null; branchId: number; dueDate: string }): Promise<Task> {
    const now = new Date(), repo = em.getRepository(Task)
    const task = await repo.save(repo.create({ ...values, description: null, createdByUserId: user.sub, priority: 'NORMAL', status: 'OPEN', requiresProof: false,
      proofNote: null, proofFileId: null, statusNote: null, closedByUserId: null, closedAt: null, remindedAt: null, escalatedAt: null, createdAt: now, updatedAt: now }))
    // نفس حدث التكليف بتاع محرك المهام: «مهمة جديدة عليك»
    await recordOutboxEvent(em, { type: 'TASK_ASSIGNED', entityType: 'task', entityId: task.id, payload: { taskId: task.id, branchId: task.branchId } })
    return task
  }

  /** إجراء تصحيحي = مهمة في محرك المهام على موظف على رأس العمل في نطاق الحساب (فرع المهمة = فرعه)، مربوطة بالحادث. عنوانها برقم الحادث من غير تفاصيله. */
  async addAction(user: JwtPayload, id: number, body: unknown) {
    const { fields, error } = actionFields(body, localDateOf(new Date()))
    if (!fields) throw new BadRequestException(error)
    return this.ds.transaction(async em => {
      const row = await this.lockIncident(em, user, id)
      if (row.status === 'CLOSED') throw new ConflictException(CLOSED_LOCKED)
      const repo = em.getRepository(SafetyIncidentAction)
      if ((await repo.count({ where: { incidentId: row.id } })) >= ACTIONS_MAX) throw new ConflictException(`${ACTIONS_MAX} إجراء للحادث بالكتير`)
      const person = await this.lockPerson(em, user, fields.assigneeEmployeeId, true)
      const task = await this.openTask(em, user, { title: `إجراء تصحيحي (${incidentCode(row.id)}): ${fields.title}`.slice(0, 200), assigneeEmployeeId: Number(person.id), assigneeRole: null,
        branchId: Number(person.branchId), dueDate: fields.dueDate })
      await repo.save(repo.create({ incidentId: row.id, taskId: task.id, createdByUserId: user.sub, createdAt: new Date() }))
      await recordAudit(em, { category: 'SETTINGS', action: 'SAFETY_ACTION_ADDED', entityType: 'safety_incident', entityId: String(row.id), actorUserId: user.sub, branchId: row.branchId,
        summary: `إجراء تصحيحي للحادث ${incidentCode(row.id)}: ${fields.title}`, after: { taskId: task.id, assigneeEmployeeId: Number(person.id), dueDate: fields.dueDate } })
      return { id: row.id, taskId: task.id }
    })
  }

  /** مهمة إبلاغ الجهة المختصة: واحدة للحادث على دور الموارد البشرية في فرع الحادث، بموعد بيكتبه المسؤول (ملغية = ممكن تتفتح تاني) */
  async openAuthorityTask(user: JwtPayload, id: number, body: unknown) {
    const dueDate = dueDateOf(body, localDateOf(new Date()))
    if (!dueDate) throw new BadRequestException('موعد الإبلاغ تاريخ من النهارده')
    return this.ds.transaction(async em => {
      const row = await this.lockIncident(em, user, id)
      if (row.status === 'CLOSED') throw new ConflictException(CLOSED_LOCKED)
      if (row.authorityTaskId) {
        const [current]: Array<{ status: string }> = await em.query('SELECT [status] FROM dbo.tasks WITH (UPDLOCK, ROWLOCK) WHERE [id] = @0', [row.authorityTaskId])
        if (current && current.status !== 'CANCELLED') throw new ConflictException('مهمة إبلاغ الجهة مفتوحة للحادث ده قبل كده')
      }
      const task = await this.openTask(em, user, { title: `إبلاغ الجهة المختصة بحادث ${incidentCode(row.id)}`, assigneeEmployeeId: null, assigneeRole: 'hr', branchId: row.branchId, dueDate })
      await em.getRepository(SafetyIncident).update({ id: row.id }, { authorityTaskId: task.id, updatedAt: new Date() })
      await recordAudit(em, { category: 'SETTINGS', action: 'SAFETY_AUTHORITY_TASK', entityType: 'safety_incident', entityId: String(row.id), actorUserId: user.sub, branchId: row.branchId,
        summary: `مهمة إبلاغ الجهة بالحادث ${incidentCode(row.id)} بموعد ${dueDate}`, after: { taskId: task.id, dueDate } })
      return { id: row.id, taskId: task.id }
    })
  }

  /** ربط الحادث بإجازة معتمدة للمصاب نفسه (آخرها من يوم الحادث) — أو فك الربط. المصاب لازم يكون في نطاق الحساب بفرعه الحالي. */
  async linkLeave(user: JwtPayload, id: number, body: unknown) {
    const value = ((body ?? {}) as Record<string, unknown>).leaveId
    if (value !== null && (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0)) throw new BadRequestException('اختار الإجازة')
    return this.ds.transaction(async em => {
      const row = await this.lockIncident(em, user, id)
      if (row.status === 'CLOSED') throw new ConflictException(CLOSED_LOCKED)
      if (value !== null) {
        if (row.injuredEmployeeId == null) throw new BadRequestException('حدّد المصاب (موظف) قبل ربط الإجازة')
        await this.lockPerson(em, user, row.injuredEmployeeId, false)
        const [leave]: Array<{ id: number }> = await em.query(`SELECT [id] FROM dbo.leaves WHERE [id] = @0 AND [employeeId] = @1 AND [status] = N'APPROVED' AND [toDate] >= @2`, [value, row.injuredEmployeeId, ymd(row.occurredOn)])
        if (!leave) throw new NotFoundException(LEAVE_NOT_FOUND)
      }
      await em.getRepository(SafetyIncident).update({ id: row.id }, { leaveId: value, updatedAt: new Date() })
      await recordAudit(em, { category: 'SETTINGS', action: 'SAFETY_LEAVE_LINKED', entityType: 'safety_incident', entityId: String(row.id), actorUserId: user.sub, branchId: row.branchId,
        summary: value === null ? `فك ربط الإجازة عن الحادث ${incidentCode(row.id)}` : `ربط الحادث ${incidentCode(row.id)} بإجازة`, before: { leaveId: row.leaveId }, after: { leaveId: value } })
      return { id: row.id, leaveId: value }
    })
  }
}
