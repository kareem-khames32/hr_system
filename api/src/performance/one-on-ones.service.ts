import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, In, type EntityManager } from 'typeorm'
import { localDateOf } from '../attendance/attendance.service'
import type { JwtPayload } from '../auth/auth.service'
import { recordOutboxEvent } from '../queue/outbox'
import { Task, TASK_OPEN_STATUSES } from '../tasks/task.entity'
import {
  EMPLOYEE_NOT_FOUND, MEETING_NOT_FOUND, MEETING_STATUS_LABELS, meetingActionFields, meetingFields, meetingPatch, ONE_ON_ONE_MIGRATION_MISSING, OneOnOne, OneOnOneAction, oneOnOnesReady,
} from './people-feedback'

// B5.10 (ب): اجتماعات 1:1 — المدير المباشر (دلوقتي، تحت قفل صف ملف الموظف) بيحدد الاجتماع؛ وبعدها الاجتماع لطرفيه المتسجّلين عليه (غيرهم «مش موجود»).
// الأجندة بيعدّلها الطرفين، والتاريخ والملاحظات والحالة للمدير، وكل تعديل تحت قفل صف الاجتماع. مهمة المتابعة صف في محرك المهام القايم.

const NOT_EMPLOYEE = 'حسابك مش مربوط بملف موظف'
const ACTIONS_MAX = 20
const ACTIVE = `[isActive] = 1 AND [status] IN (N'active', N'probation', N'notice_period')`
const ymd = (value: unknown) => String(value).slice(0, 10)
const marks = (ids: readonly unknown[]) => ids.map((_, index) => `@${index}`).join(', ')

/** اجتماعات صاحب الحساب في فترة (محددة أو اتعملت) لتقويمه — قراءة بس، وفاضية لو الجداول ناقصة أو الحساب من غير ملف موظف */
export async function oneOnOneCalendar(em: EntityManager, user: JwtPayload, from: string, to: string): Promise<Array<{ id: number; date: string; time: string | null; withName: string; role: 'MANAGER' | 'EMPLOYEE' }>> {
  if (!user.employeeId || !(await oneOnOnesReady(em))) return []
  const me = Number(user.employeeId)
  const rows: Array<{ id: number; day: string; meetingTime: string | null; managerEmployeeId: number; employeeId: number }> = await em.query(
    `SELECT [id], CONVERT(varchar(10), [meetingDate], 23) AS [day], [meetingTime], [managerEmployeeId], [employeeId] FROM dbo.one_on_ones
     WHERE ([managerEmployeeId] = @0 OR [employeeId] = @0) AND [status] <> N'CANCELLED' AND [meetingDate] BETWEEN @1 AND @2 ORDER BY [meetingDate], [meetingTime], [id]`, [me, from, to])
  const others = [...new Set(rows.map(row => (Number(row.managerEmployeeId) === me ? Number(row.employeeId) : Number(row.managerEmployeeId))))]
  const names = new Map<number, string>(others.length ? (await em.query(`SELECT [id], [fullName] FROM dbo.employees WHERE [id] IN (${marks(others)})`, others)).map((row: { id: number; fullName: string }) => [Number(row.id), row.fullName]) : [])
  return rows.map(row => { const manager = Number(row.managerEmployeeId) === me, other = manager ? Number(row.employeeId) : Number(row.managerEmployeeId)
    return { id: Number(row.id), date: row.day, time: row.meetingTime ?? null, withName: names.get(other) ?? '—', role: manager ? 'MANAGER' as const : 'EMPLOYEE' as const } })
}

@Injectable()
export class OneOnOnesService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  private async assertReady(em: EntityManager) {
    if (!(await oneOnOnesReady(em))) throw new BadRequestException(ONE_ON_ONE_MIGRATION_MISSING)
  }

  private me(user: JwtPayload): number {
    if (!user.employeeId) throw new ForbiddenException(NOT_EMPLOYEE)
    return Number(user.employeeId)
  }

  /** اجتماعاتي (مدير أو موظف) بمهامها، ومرؤوسيّ المباشرين لتحديد اجتماع */
  async list(user: JwtPayload) {
    const me = this.me(user), em = this.ds.manager
    if (!(await oneOnOnesReady(em))) return { ready: false, reports: [], meetings: [] }
    const meetings = await em.getRepository(OneOnOne).find({ where: [{ managerEmployeeId: me }, { employeeId: me }], order: { meetingDate: 'DESC', id: 'DESC' }, take: 100 })
    const others = [...new Set(meetings.map(row => (row.managerEmployeeId === me ? row.employeeId : row.managerEmployeeId)))]
    const names = new Map<number, string>(others.length ? (await em.query(`SELECT [id], [fullName] FROM dbo.employees WHERE [id] IN (${marks(others)})`, others)).map((row: { id: number; fullName: string }) => [Number(row.id), row.fullName]) : [])
    const links = meetings.length ? await em.getRepository(OneOnOneAction).find({ where: { meetingId: In(meetings.map(row => row.id)) }, order: { id: 'ASC' } }) : []
    const tasks = new Map((links.length ? await em.getRepository(Task).find({ where: { id: In(links.map(row => row.taskId)) } }) : []).map(task => [task.id, task]))
    const reports: Array<{ id: number; fullName: string }> = await em.query(`SELECT [id], [fullName] FROM dbo.employees WHERE ${ACTIVE} AND [managerEmployeeId] = @0 AND [id] <> @0 ORDER BY [fullName], [id]`, [me])
    return { ready: true, reports: reports.map(row => ({ id: Number(row.id), fullName: row.fullName })),
      meetings: meetings.map(row => { const manager = row.managerEmployeeId === me
        return { id: row.id, role: manager ? 'MANAGER' : 'EMPLOYEE', withName: names.get(manager ? row.employeeId : row.managerEmployeeId) ?? '—', meetingDate: ymd(row.meetingDate), meetingTime: row.meetingTime, agenda: row.agenda, notes: row.notes,
          status: row.status, statusLabel: MEETING_STATUS_LABELS[row.status] ?? row.status,
          actions: links.filter(link => link.meetingId === row.id).map(link => tasks.get(link.taskId)).filter((task): task is Task => !!task)
            .map(task => ({ taskId: task.id, title: task.title, dueDate: task.dueDate ? ymd(task.dueDate) : null, open: (TASK_OPEN_STATUSES as readonly string[]).includes(task.status), mine: task.assigneeEmployeeId === me })) } }) }
  }

  /** اجتماع جديد: صاحب الحساب هو المدير المباشر للموظف دلوقتي (الحكم بعد قفل صف ملف الموظف) — غير كده «غير موجود» */
  async create(user: JwtPayload, body: unknown) {
    const me = this.me(user)
    const { fields, error } = meetingFields(body, localDateOf(new Date()))
    if (!fields) throw new BadRequestException(error)
    return this.ds.transaction(async em => {
      await this.assertReady(em)
      const [person]: Array<{ id: number; managerEmployeeId: number | null }> = await em.query(`SELECT [id], [managerEmployeeId] FROM dbo.employees WITH (UPDLOCK, ROWLOCK) WHERE [id] = @0 AND ${ACTIVE}`, [fields.employeeId])
      if (!person || Number(person.id) === me || person.managerEmployeeId == null || Number(person.managerEmployeeId) !== me) throw new NotFoundException(EMPLOYEE_NOT_FOUND)
      const repo = em.getRepository(OneOnOne), now = new Date()
      const row = await repo.save(repo.create({ managerEmployeeId: me, employeeId: fields.employeeId, meetingDate: fields.meetingDate, meetingTime: fields.meetingTime, agenda: fields.agenda, notes: null, status: 'SCHEDULED',
        createdByUserId: user.sub, createdAt: now, updatedAt: now }))
      return { id: row.id }
    })
  }

  /** الاجتماع بقفل صفه، لطرف من طرفيه — غير كده «مش موجود» */
  private async lockMeeting(em: EntityManager, me: number, id: number): Promise<OneOnOne> {
    await this.assertReady(em)
    const row = await em.getRepository(OneOnOne).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
    if (!row || (row.managerEmployeeId !== me && row.employeeId !== me)) throw new NotFoundException(MEETING_NOT_FOUND)
    return row
  }

  /** تعديل: الأجندة للطرفين والاجتماع لسه محدد؛ والتاريخ والوقت والملاحظات والحالة للمدير. الاجتماع اللي اتعمل أو اتلغى: ملاحظاته بس. */
  async update(user: JwtPayload, id: number, body: unknown) {
    const me = this.me(user)
    const { patch, managerOnly, error } = meetingPatch(body)
    if (!patch) throw new BadRequestException(error)
    return this.ds.transaction(async em => {
      const row = await this.lockMeeting(em, me, id)
      if (managerOnly && row.managerEmployeeId !== me) throw new ForbiddenException('التاريخ والملاحظات والحالة بيعدّلها المدير')
      if (row.status !== 'SCHEDULED' && Object.keys(patch).some(key => key !== 'notes')) throw new ConflictException('الاجتماع اتقفل — ملاحظاته بس اللي بتتعدّل')
      await em.getRepository(OneOnOne).update({ id: row.id }, { ...patch, updatedAt: new Date() })
      return { id: row.id }
    })
  }

  /** مهمة متابعة من الاجتماع (المدير بس): مهمة في محرك المهام على الموظف أو المدير، بفرع المسؤول الحالي، مربوطة بالاجتماع */
  async addAction(user: JwtPayload, id: number, body: unknown) {
    const me = this.me(user)
    const { fields, error } = meetingActionFields(body, localDateOf(new Date()))
    if (!fields) throw new BadRequestException(error)
    return this.ds.transaction(async em => {
      const row = await this.lockMeeting(em, me, id)
      if (row.managerEmployeeId !== me) throw new ForbiddenException('مهام المتابعة بيفتحها المدير')
      if (row.status === 'CANCELLED') throw new ConflictException('الاجتماع ملغي')
      const links = em.getRepository(OneOnOneAction)
      if ((await links.count({ where: { meetingId: row.id } })) >= ACTIONS_MAX) throw new ConflictException(`${ACTIONS_MAX} مهمة للاجتماع بالكتير`)
      const assigneeId = fields.assignee === 'MANAGER' ? row.managerEmployeeId : row.employeeId
      const [assignee]: Array<{ id: number; branchId: number | null }> = await em.query(`SELECT [id], [branchId] FROM dbo.employees WITH (UPDLOCK, ROWLOCK) WHERE [id] = @0 AND ${ACTIVE}`, [assigneeId])
      if (!assignee || assignee.branchId == null) throw new ConflictException('المسؤول عن المهمة مش على رأس العمل')
      const now = new Date(), tasks = em.getRepository(Task)
      const task = await tasks.save(tasks.create({ title: `متابعة اجتماع 1:1: ${fields.title}`.slice(0, 200), description: null, assigneeEmployeeId: Number(assignee.id), assigneeRole: null, branchId: Number(assignee.branchId),
        createdByUserId: user.sub, dueDate: fields.dueDate, priority: 'NORMAL', status: 'OPEN', requiresProof: false, proofNote: null, proofFileId: null, statusNote: null, closedByUserId: null, closedAt: null,
        remindedAt: null, escalatedAt: null, createdAt: now, updatedAt: now }))
      await links.save(links.create({ meetingId: row.id, taskId: task.id }))
      // نفس حدث التكليف بتاع محرك المهام: «مهمة جديدة عليك»
      await recordOutboxEvent(em, { type: 'TASK_ASSIGNED', entityType: 'task', entityId: task.id, payload: { taskId: task.id, branchId: task.branchId } })
      return { id: row.id, taskId: task.id }
    })
  }
}
