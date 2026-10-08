import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, type EntityManager } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, inBranchScope, userHasPerm } from '../auth/guards'
import {
  CYCLE_NOT_OPEN, EMPLOYEE_NOT_FOUND, FEEDBACK360_MIGRATION_MISSING, Feedback360Invite, Feedback360Response, feedback360Ready, FEEDBACK_MIN_GROUP, FEEDBACK_RELATION_LABELS, FEEDBACK_RELATIONS, feedbackFields,
  feedbackSummary, INVITE_NOT_FOUND, INVITE_STATUS_LABELS, nominationFields, PEERS_MAX, type FeedbackRelation,
} from './people-feedback'

// B5.10 (أ): تقييم 360 — الترشيح وقراره تحت قفل صف ملف الموظف المتقيَّم (ثم صف الدعوة)، والحكم بعد القفل: المدير المباشر دلوقتي، أو صاحب
// `performance.manage` والموظف في نطاقه بفرعه الحالي (غير كده «مش موجود»). الرد تحت قفل صف الدعوة: بيتكتب من غير مقيّم ولا وقت، والدعوة
// بتتعلّم «رد» بس — ومن غير سطر تدقيق (سطر التدقيق بيربط الحساب بالرد). النتيجة بعد قفل الدورة وبحد أدنى للردود. ترتيب قفل الرد: صف الدورة ← صف الدعوة.

const NOT_EMPLOYEE = 'حسابك مش مربوط بملف موظف'
const NOT_ACTIVE = 'ملفك مش على رأس العمل'
const HIDDEN_PERSON = 'موظف خارج نطاقك'
const ACTIVE = `[isActive] = 1 AND [status] IN (N'active', N'probation', N'notice_period')`
const idOf = (value: unknown) => (value == null ? null : Number(value))
const flag = (value: unknown) => value === true || value === 1
const marks = (ids: readonly unknown[], from = 0) => ids.map((_, index) => `@${index + from}`).join(', ')

interface PersonRow { id: number; fullName: string; branchId: number | null; managerEmployeeId: number | null; isActive: unknown; status: string }

@Injectable()
export class Feedback360Service {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  private async assertReady(em: EntityManager) {
    if (!(await feedback360Ready(em))) throw new BadRequestException(FEEDBACK360_MIGRATION_MISSING)
  }

  private me(user: JwtPayload): number {
    if (!user.employeeId) throw new ForbiddenException(NOT_EMPLOYEE)
    return Number(user.employeeId)
  }

  private async person(em: EntityManager, id: number, lock: boolean): Promise<PersonRow | null> {
    const [row]: PersonRow[] = await em.query(`SELECT [id], [fullName], [branchId], [managerEmployeeId], [isActive], [status] FROM dbo.employees${lock ? ' WITH (UPDLOCK, ROWLOCK)' : ''} WHERE [id] = @0`, [id])
    return row ? { ...row, id: Number(row.id), branchId: idOf(row.branchId), managerEmployeeId: idOf(row.managerEmployeeId) } : null
  }

  private isActive(person: PersonRow | null): person is PersonRow {
    return !!person && flag(person.isActive) && ['active', 'probation', 'notice_period'].includes(person.status)
  }

  /** الدورة مفتوحة والموظف له تكليف فيها؟ */
  private async openCycle(em: EntityManager, cycleId: number, employeeId: number): Promise<boolean> {
    const rows: unknown[] = await em.query(
      `SELECT c.[id] FROM dbo.review_cycles c INNER JOIN dbo.review_assignments a ON a.[cycleId] = c.[id] AND a.[employeeId] = @1 WHERE c.[id] = @0 AND c.[status] = N'ACTIVE'`, [cycleId, employeeId])
    return rows.length > 0
  }

  private async names(em: EntityManager, ids: number[]): Promise<Map<number, { fullName: string; branchId: number | null }>> {
    const wanted = [...new Set(ids)]
    if (!wanted.length) return new Map()
    const rows: Array<{ id: number; fullName: string; branchId: number | null }> = await em.query(`SELECT [id], [fullName], [branchId] FROM dbo.employees WHERE [id] IN (${marks(wanted)})`, wanted)
    return new Map(rows.map(row => [Number(row.id), { fullName: row.fullName, branchId: idOf(row.branchId) }]))
  }

  /** «تقييم 360»: دوراتي المفتوحة، ترشيحاتي وحالتها، زملاء فرعي للترشيح، والدعوات المعتمدة اللي عليّ أرد عليها */
  async mine(user: JwtPayload) {
    const me = this.me(user), em = this.ds.manager
    if (!(await feedback360Ready(em))) return { ready: false, peersMax: PEERS_MAX, cycles: [], nominations: [], colleagues: [], toGive: [] }
    const self = await this.person(em, me, false)
    const cycles: Array<{ id: number; name: string }> = await em.query(
      `SELECT c.[id], c.[name] FROM dbo.review_cycles c INNER JOIN dbo.review_assignments a ON a.[cycleId] = c.[id] AND a.[employeeId] = @0 WHERE c.[status] = N'ACTIVE' ORDER BY c.[id]`, [me])
    const repo = em.getRepository(Feedback360Invite)
    const mine = await repo.find({ where: { subjectEmployeeId: me, relation: 'PEER' }, order: { id: 'ASC' } })
    const due = (await repo.find({ where: { reviewerEmployeeId: me, status: 'APPROVED', responded: false }, order: { id: 'ASC' } }))
    const cycleNames = new Map<number, { name: string; status: string }>((await em.query(`SELECT [id], [name], [status] FROM dbo.review_cycles`)).map((row: { id: number; name: string; status: string }) => [Number(row.id), row]))
    const names = await this.names(em, [...mine.map(row => row.reviewerEmployeeId), ...due.map(row => row.subjectEmployeeId)])
    const colleagues: Array<{ id: number; fullName: string }> = self?.branchId == null ? [] : await em.query(
      `SELECT [id], [fullName] FROM dbo.employees WHERE ${ACTIVE} AND [branchId] = @0 AND [id] <> @1 AND [id] <> @2 ORDER BY [fullName], [id]`, [self.branchId, me, self.managerEmployeeId ?? 0])
    return { ready: true, peersMax: PEERS_MAX, cycles: cycles.map(row => ({ id: Number(row.id), name: row.name })),
      nominations: mine.map(row => ({ id: row.id, cycleId: row.cycleId, reviewerName: names.get(row.reviewerEmployeeId)?.fullName ?? '—', status: row.status, statusLabel: INVITE_STATUS_LABELS[row.status] ?? row.status })),
      colleagues: colleagues.map(row => ({ id: Number(row.id), fullName: row.fullName })),
      toGive: due.filter(row => cycleNames.get(row.cycleId)?.status === 'ACTIVE').map(row => ({ id: row.id, cycleName: cycleNames.get(row.cycleId)?.name ?? '—', subjectName: names.get(row.subjectEmployeeId)?.fullName ?? '—',
        relation: row.relation, relationLabel: FEEDBACK_RELATION_LABELS[row.relation as FeedbackRelation] ?? row.relation })) }
  }

  /** ترشيح زملاء لتقييمي في دورة مفتوحة لي فيها تكليف: زملاء فرعي الحالي على رأس العمل (مش أنا ولا مديري)، لحد 8، وكل واحد مرة */
  async nominate(user: JwtPayload, body: unknown) {
    const me = this.me(user)
    const { fields, error } = nominationFields(body)
    if (!fields) throw new BadRequestException(error)
    return this.ds.transaction(async em => {
      await this.assertReady(em)
      const self = await this.person(em, me, true)
      if (!this.isActive(self) || self.branchId == null) throw new ForbiddenException(NOT_ACTIVE)
      if (!(await this.openCycle(em, fields.cycleId, me))) throw new ConflictException(CYCLE_NOT_OPEN)
      const existing: Array<{ reviewerEmployeeId: number; status: string }> = await em.query(
        `SELECT [reviewerEmployeeId], [status] FROM dbo.feedback360_invites WITH (UPDLOCK, HOLDLOCK) WHERE [cycleId] = @0 AND [subjectEmployeeId] = @1 AND [relation] = N'PEER'`, [fields.cycleId, me])
      if (fields.reviewerEmployeeIds.some(id => existing.some(row => Number(row.reviewerEmployeeId) === id))) throw new ConflictException('زميل من دول مترشّح قبل كده')
      if (existing.filter(row => row.status !== 'REJECTED').length + fields.reviewerEmployeeIds.length > PEERS_MAX) throw new ConflictException(`${PEERS_MAX} زملاء بالكتير في الدورة`)
      const found: Array<{ id: number }> = await em.query(`SELECT [id] FROM dbo.employees WHERE ${ACTIVE} AND [branchId] = @0 AND [id] IN (${marks(fields.reviewerEmployeeIds, 1)})`, [self.branchId, ...fields.reviewerEmployeeIds])
      if (found.length !== fields.reviewerEmployeeIds.length || fields.reviewerEmployeeIds.some(id => id === me || id === self.managerEmployeeId)) throw new NotFoundException(EMPLOYEE_NOT_FOUND)
      const repo = em.getRepository(Feedback360Invite), now = new Date()
      await repo.save(fields.reviewerEmployeeIds.map(reviewerEmployeeId => repo.create({ cycleId: fields.cycleId, subjectEmployeeId: me, reviewerEmployeeId, relation: 'PEER', status: 'PENDING', responded: false,
        createdByUserId: user.sub, decidedByUserId: null, createdAt: now })))
      return { nominated: fields.reviewerEmployeeIds.length }
    })
  }

  /** الحكم على قارئ بيانات موظف: مديره المباشر دلوقتي، أو صاحب الصلاحية والموظف في نطاقه بفرعه الحالي — ومش الموظف نفسه */
  private rightOver(user: JwtPayload, subject: PersonRow | null): 'MANAGER' | 'RIGHT' | null {
    const me = user.employeeId == null ? null : Number(user.employeeId)
    if (!subject || (me !== null && me === subject.id)) return null
    if (me !== null && subject.managerEmployeeId === me) return 'MANAGER'
    return userHasPerm(user, 'performance.manage') && inBranchScope(branchScopeOf(user), subject.branchId) ? 'RIGHT' : null
  }

  /** ترشيحات مستنية قراري: لمرؤوسيّ المباشرين، ولموظفين نطاق صاحب الصلاحية (اسم المقيّم برّه نطاقه مابيتعرضش) */
  async team(user: JwtPayload) {
    const em = this.ds.manager
    const canManage = userHasPerm(user, 'performance.manage')
    if (!(await feedback360Ready(em))) return { ready: false, canManage, pending: [], people: [] }
    const pending = await em.getRepository(Feedback360Invite).find({ where: { status: 'PENDING', relation: 'PEER' }, order: { id: 'ASC' }, take: 500 })
    // اللي القارئ له قراءة نتيجتهم: تكليفات الدورات المفتوحة والمقفولة لمرؤوسيه المباشرين ولموظفين نطاق صاحب الصلاحية
    const assigned: Array<PersonRow & { cycleId: number; cycleName: string; cycleStatus: string }> = (await em.query(
      `SELECT TOP (3000) c.[id] AS [cycleId], c.[name] AS [cycleName], c.[status] AS [cycleStatus], e.[id], e.[fullName], e.[branchId], e.[managerEmployeeId], e.[isActive], e.[status]
       FROM dbo.review_assignments a INNER JOIN dbo.review_cycles c ON c.[id] = a.[cycleId] AND c.[status] IN (N'ACTIVE', N'CLOSED') INNER JOIN dbo.employees e ON e.[id] = a.[employeeId]
       ORDER BY c.[id] DESC, e.[fullName], e.[id]`)).map((row: PersonRow & { cycleId: number; cycleName: string; cycleStatus: string }) => ({ ...row, id: Number(row.id), cycleId: Number(row.cycleId), branchId: idOf(row.branchId), managerEmployeeId: idOf(row.managerEmployeeId) }))
    const people = assigned.filter(row => this.rightOver(user, row)).map(row => ({ cycleId: row.cycleId, cycleName: row.cycleName, cycleStatus: row.cycleStatus, employeeId: row.id, fullName: row.fullName }))
    const subjects = new Map<number, PersonRow | null>()
    for (const id of new Set(pending.map(row => row.subjectEmployeeId))) subjects.set(id, await this.person(em, id, false))
    const names = await this.names(em, pending.map(row => row.reviewerEmployeeId)), scope = branchScopeOf(user)
    const cycles = new Map<number, string>((await em.query(`SELECT [id], [name] FROM dbo.review_cycles`)).map((row: { id: number; name: string }) => [Number(row.id), row.name]))
    return { ready: true, canManage, people, pending: pending.flatMap(row => {
      const subject = subjects.get(row.subjectEmployeeId) ?? null, right = this.rightOver(user, subject)
      if (!right || !subject) return []
      const reviewer = names.get(row.reviewerEmployeeId)
      return [{ id: row.id, cycleName: cycles.get(row.cycleId) ?? '—', subjectName: subject.fullName,
        reviewerName: reviewer && (right === 'MANAGER' || inBranchScope(scope, reviewer.branchId)) ? reviewer.fullName : HIDDEN_PERSON }]
    }) }
  }

  /** قرار ترشيح: تحت قفل صف الموظف المتقيَّم ثم صف الدعوة، والحكم بعد القفل */
  async decide(user: JwtPayload, inviteId: number, body: unknown) {
    const action = ((body ?? {}) as Record<string, unknown>).action
    if (action !== 'APPROVE' && action !== 'REJECT') throw new BadRequestException('القرار: اعتماد أو رفض')
    return this.ds.transaction(async em => {
      await this.assertReady(em)
      const repo = em.getRepository(Feedback360Invite)
      const peek = await repo.findOne({ where: { id: inviteId } })
      if (!peek) throw new NotFoundException(INVITE_NOT_FOUND)
      const subject = await this.person(em, peek.subjectEmployeeId, true)
      const invite = await repo.findOne({ where: { id: inviteId, subjectEmployeeId: peek.subjectEmployeeId }, lock: { mode: 'pessimistic_write' } })
      if (!invite || invite.relation !== 'PEER' || !this.rightOver(user, subject)) throw new NotFoundException(INVITE_NOT_FOUND)
      if (invite.status !== 'PENDING') throw new ConflictException('الترشيح ده اتاخد فيه قرار قبل كده')
      const status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED'
      await repo.update({ id: invite.id }, { status, decidedByUserId: user.sub })
      return { id: invite.id, status }
    })
  }

  /** فتح تقييم المدير من مرؤوسيه: دعوة معتمدة لكل مرؤوس مباشر على رأس العمل (3 على الأقل، وإلا النتيجة مش هتتعرض أبدًا) */
  async openUpward(user: JwtPayload, body: unknown) {
    const input = (body ?? {}) as Record<string, unknown>
    const valid = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0
    if (!valid(input.cycleId) || !valid(input.subjectEmployeeId)) throw new BadRequestException('اختار الدورة والمدير')
    const cycleId = input.cycleId, subjectId = input.subjectEmployeeId
    return this.ds.transaction(async em => {
      await this.assertReady(em)
      const subject = await this.person(em, subjectId, true)
      if (!subject || !inBranchScope(branchScopeOf(user), subject.branchId)) throw new NotFoundException(EMPLOYEE_NOT_FOUND)
      if (!(await this.openCycle(em, cycleId, subjectId))) throw new ConflictException('دورة التقييم مش مفتوحة أو الموظف مالوش تكليف فيها')
      const reports: Array<{ id: number }> = await em.query(`SELECT [id] FROM dbo.employees WHERE ${ACTIVE} AND [managerEmployeeId] = @0 AND [id] <> @0 ORDER BY [id]`, [subjectId])
      if (reports.length < FEEDBACK_MIN_GROUP) throw new ConflictException(`تقييم المدير محتاج ${FEEDBACK_MIN_GROUP} مرؤوسين مباشرين على الأقل (حد السرية)`)
      const existing: Array<{ reviewerEmployeeId: number }> = await em.query(
        `SELECT [reviewerEmployeeId] FROM dbo.feedback360_invites WITH (UPDLOCK, HOLDLOCK) WHERE [cycleId] = @0 AND [subjectEmployeeId] = @1 AND [relation] = N'UPWARD'`, [cycleId, subjectId])
      const fresh = reports.map(row => Number(row.id)).filter(id => !existing.some(row => Number(row.reviewerEmployeeId) === id))
      const repo = em.getRepository(Feedback360Invite), now = new Date()
      if (fresh.length) await repo.save(fresh.map(reviewerEmployeeId => repo.create({ cycleId, subjectEmployeeId: subjectId, reviewerEmployeeId, relation: 'UPWARD', status: 'APPROVED', responded: false,
        createdByUserId: user.sub, decidedByUserId: user.sub, createdAt: now })))
      return { invited: fresh.length, total: reports.length }
    })
  }

  /** الرد على دعوة معتمدة ليّ، مرة واحدة والدورة مفتوحة: الرد بيتكتب من غير مقيّم ولا وقت، والدعوة بتتعلّم «رد» بس */
  async respond(user: JwtPayload, inviteId: number, body: unknown) {
    const me = this.me(user)
    const { fields, error } = feedbackFields(body)
    if (!fields) throw new BadRequestException(error)
    return this.ds.transaction(async em => {
      await this.assertReady(em)
      const repo = em.getRepository(Feedback360Invite)
      const peek = await repo.findOne({ where: { id: inviteId } })
      if (!peek || peek.reviewerEmployeeId !== me) throw new NotFoundException(INVITE_NOT_FOUND)
      // Codex P5A-B05: صف الدورة بيتقفل الأول (نفس الصف اللي إغلاق الدورة بيقفله) وبعده صف الدعوة — الرد يا إما بيثبت قبل الإغلاق، يا إما بيشوف
      // الدورة مقفولة ويترفض. من غيره رد اتفحص قبل الإغلاق كان بيثبت بعده، وقراءتين للنتيجة بيكشفوه.
      const [cycle]: Array<{ status: string }> = await em.query('SELECT [status] FROM dbo.review_cycles WITH (UPDLOCK, ROWLOCK) WHERE [id] = @0', [peek.cycleId])
      const invite = await repo.findOne({ where: { id: inviteId, cycleId: peek.cycleId }, lock: { mode: 'pessimistic_write' } })
      if (!invite || invite.reviewerEmployeeId !== me) throw new NotFoundException(INVITE_NOT_FOUND)
      if (invite.status !== 'APPROVED') throw new ConflictException('الدعوة مش معتمدة')
      if (flag(invite.responded)) throw new ConflictException('رديت على الدعوة دي قبل كده')
      if (cycle?.status !== 'ACTIVE') throw new ConflictException('دورة التقييم اتقفلت')
      const responses = em.getRepository(Feedback360Response)
      await responses.save(responses.create({ cycleId: invite.cycleId, subjectEmployeeId: invite.subjectEmployeeId, relation: invite.relation, ...fields }))
      await repo.update({ id: invite.id }, { responded: true })
      return { ok: true }
    })
  }

  /** نتيجة 360 لموظف في دورة: لمديره المباشر أو صاحب الصلاحية في نطاقه (مش للموظف نفسه)، بعد قفل الدورة، ولكل علاقة بحد أدنى للردود */
  async results(user: JwtPayload, query: { cycleId?: unknown; employeeId?: unknown }) {
    const cycleId = Number(query.cycleId), employeeId = Number(query.employeeId)
    if (!Number.isSafeInteger(cycleId) || cycleId <= 0 || !Number.isSafeInteger(employeeId) || employeeId <= 0) throw new BadRequestException('اختار الدورة والموظف')
    const em = this.ds.manager
    await this.assertReady(em)
    const subject = await this.person(em, employeeId, false)
    if (!subject || !this.rightOver(user, subject)) throw new NotFoundException(EMPLOYEE_NOT_FOUND)
    const [cycle]: Array<{ name: string; status: string }> = await em.query('SELECT [name], [status] FROM dbo.review_cycles WHERE [id] = @0', [cycleId])
    if (!cycle) throw new NotFoundException('دورة التقييم مش موجودة')
    const base = { cycleName: cycle.name, employeeName: subject.fullName, minGroup: FEEDBACK_MIN_GROUP }
    if (cycle.status !== 'CLOSED') return { ...base, closed: false, summaries: [] }
    const rows = await em.getRepository(Feedback360Response).find({ where: { cycleId, subjectEmployeeId: employeeId } })
    return { ...base, closed: true, summaries: FEEDBACK_RELATIONS.map(relation => feedbackSummary(relation, rows.filter(row => row.relation === relation))) }
  }
}
