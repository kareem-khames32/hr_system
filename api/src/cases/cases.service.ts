import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, In, type EntityManager } from 'typeorm'
import { recordAudit } from '../audit/audit'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, inBranchScope, userHasPerm } from '../auth/guards'
import { User } from '../auth/user.entity'
import { Employee } from '../employees/employee.entity'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { HrCase, HrCaseEvent, HrCaseParty, type CaseEventKind, type CasePartyRole } from './case.entities'
import {
  CASES_MIGRATION_MISSING, CASES_PERMISSION, CASE_CLOSED, CASE_CONFLICT, CASE_DUE_PROCESS, CASE_EMPLOYEE, CASE_EVENT_LABELS, CASE_EVENT_PARTY, CASE_HANDLER, CASE_KIND_LABELS, CASE_NOT_DECIDED,
  CASE_NOT_FOUND, CASE_NO_INVESTIGATOR, CASE_OBJECTED, CASE_OBJECTION_KEY, CASE_OBJECTION_LATE, CASE_OUTCOME_LABELS, CASE_PARTY_EXISTS, CASE_ROLE_LABELS, CASE_STATUS_LABELS, caseConflict, casesReady,
  cleanCaseId, cleanCaseKind, cleanCaseOutcome, cleanCaseText, cleanCaseTitle, cleanEventKind, cleanPartyRole, objectionDays,
} from './case-rules'

export interface CaseInput { kind?: unknown; title?: unknown; description?: unknown; complainantEmployeeId?: unknown; respondentEmployeeId?: unknown }

// B3.11: ملفات القضايا (الشكاوى والتحقيقات). الاطلاع على مستوى القضية: المطّلعين عليها (HANDLER) بس — صاحب صلاحية التحقيق اللي مش متضاف
// مابيشوفهاش، ولا فيه قايمة عامة. فتح قضية يدويًا بالصلاحية (والفاتح أول مطّلع). تعارض المصالح: المشكو في حقه أو مديره المباشر مايبقاش
// مطّلع ولا محقق. الخط الزمني بيتزوّد بس. كل كتابة تحت قفل صف القضية، والحكم (العضوية والتعارض والحالة) تحته.
@Injectable()
export class CasesService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  private async assertReady(em: EntityManager) {
    if (!(await casesReady(em))) throw new BadRequestException(CASES_MIGRATION_MISSING)
  }

  /** القضية للمطّلع عليها — وإلا غير موجودة (حتى لو الحساب معاه الصلاحية) */
  private async handled(em: EntityManager, user: JwtPayload, id: number, lock = false): Promise<HrCase> {
    await this.assertReady(em)
    const row = await em.getRepository(HrCase).findOne({ where: { id }, ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}) })
    if (!row || !(await em.getRepository(HrCaseParty).count({ where: { caseId: id, role: 'HANDLER', userId: user.sub } }))) throw new NotFoundException(CASE_NOT_FOUND)
    return row
  }

  /** موظف في نطاق فروع الحساب (بفرعه الحالي) — وإلا «غير موجود» */
  private async employeeInScope(em: EntityManager, user: JwtPayload, raw: unknown): Promise<Employee> {
    const id = cleanCaseId(raw)
    const employee = id ? await em.getRepository(Employee).findOne({ where: { id } }) : null
    if (!employee || !inBranchScope(branchScopeOf(user), employee.branchId)) throw new BadRequestException(CASE_EMPLOYEE)
    return employee
  }

  /** الحكم على تعارض المصالح بأطراف القضية ومطّلعيها دلوقتي (تحت قفل صفها) */
  private async assertNoConflict(em: EntityManager, caseId: number) {
    const parties = await em.getRepository(HrCaseParty).find({ where: { caseId } })
    const respondentIds = parties.filter((row) => row.role === 'RESPONDENT' && row.employeeId != null).map((row) => row.employeeId as number)
    const handlerUserIds = parties.filter((row) => row.role === 'HANDLER' && row.userId != null).map((row) => row.userId as number)
    if (!respondentIds.length || !handlerUserIds.length) return
    const respondents = await em.getRepository(Employee).find({ where: { id: In(respondentIds) } })
    const handlers = await em.getRepository(User).find({ where: { id: In(handlerUserIds) } })
    if (caseConflict(respondents, handlers.map((row) => row.employeeId))) throw new BadRequestException(CASE_CONFLICT)
  }

  private event(em: EntityManager, caseId: number, kind: CaseEventKind, body: string, userId: number, employeeId: number | null = null) {
    return em.getRepository(HrCaseEvent).insert({ caseId, kind, body, employeeId, fileId: null, createdByUserId: userId, createdAt: new Date() })
  }

  private summary(row: HrCase) {
    return { id: row.id, kind: row.kind, kindLabel: CASE_KIND_LABELS[row.kind] ?? row.kind, title: row.title, status: row.status, statusLabel: CASE_STATUS_LABELS[row.status] ?? row.status,
      outcome: row.outcome ?? null, outcomeLabel: row.outcome ? CASE_OUTCOME_LABELS[row.outcome] ?? row.outcome : null, openedAt: row.openedAt, decidedAt: row.decidedAt ?? null, closedAt: row.closedAt ?? null }
  }

  // ===== المطّلعين =====

  /** القضايا اللي الحساب مطّلع عليها بس */
  async list(user: JwtPayload) {
    const em = this.ds.manager
    if (!(await casesReady(em))) return { available: false, message: CASES_MIGRATION_MISSING, canOpen: false, cases: [] }
    const mine = await em.getRepository(HrCaseParty).find({ where: { role: 'HANDLER', userId: user.sub } })
    const rows = mine.length ? await em.getRepository(HrCase).find({ where: { id: In(mine.map((row) => row.caseId)) }, order: { id: 'DESC' } }) : []
    return { available: true, canOpen: userHasPerm(user, CASES_PERMISSION), cases: rows.map((row) => ({ ...this.summary(row), investigating: row.investigatorUserId === user.sub })) }
  }

  /** فتح قضية يدويًا — بالصلاحية؛ والفاتح أول مطّلع عليها. الأطراف من موظفين نطاق الحساب */
  async open(user: JwtPayload, input: CaseInput) {
    if (!userHasPerm(user, CASES_PERMISSION)) throw new ForbiddenException('فتح ملف قضية لصاحب صلاحية التحقيق')
    const kind = cleanCaseKind(input.kind), title = cleanCaseTitle(input.title), description = cleanCaseText(input.description, false)
    const id = await this.ds.transaction(async (em) => {
      await this.assertReady(em)
      const complainant = input.complainantEmployeeId != null && input.complainantEmployeeId !== '' ? await this.employeeInScope(em, user, input.complainantEmployeeId) : null
      const respondent = input.respondentEmployeeId != null && input.respondentEmployeeId !== '' ? await this.employeeInScope(em, user, input.respondentEmployeeId) : null
      const now = new Date()
      const made = await em.getRepository(HrCase).insert({ kind, title, description, branchId: (respondent ?? complainant)?.branchId ?? null, requestId: null, investigatorUserId: null, status: 'OPEN', outcome: null,
        outcomeNote: null, openedByUserId: user.sub, openedAt: now, decidedAt: null, closedAt: null })
      const caseId = made.identifiers[0].id as number
      const party = (role: CasePartyRole, employeeId: number | null, userId: number | null) => ({ caseId, role, employeeId, userId, addedByUserId: user.sub, addedAt: now })
      await em.getRepository(HrCaseParty).insert([party('HANDLER', null, user.sub), ...(complainant ? [party('COMPLAINANT', complainant.id, null)] : []), ...(respondent ? [party('RESPONDENT', respondent.id, null)] : [])])
      await this.assertNoConflict(em, caseId)
      await recordAudit(em, { category: 'SETTINGS', action: 'CASE_OPENED', entityType: 'hr_case', entityId: caseId, actorUserId: user.sub, branchId: null, summary: `فتح ملف قضية رقم ${caseId}`, after: { kind } })
      return caseId
    })
    return this.detail(user, id)
  }

  /** ملف القضية كامل للمطّلع: الأطراف والمطّلعين بأساميهم، والخط الزمني */
  async detail(user: JwtPayload, id: number) {
    const em = this.ds.manager
    const row = await this.handled(em, user, id)
    const parties = await em.getRepository(HrCaseParty).find({ where: { caseId: id }, order: { id: 'ASC' } })
    const events = await em.getRepository(HrCaseEvent).find({ where: { caseId: id }, order: { id: 'ASC' } })
    const employeeIds = [...new Set([...parties.map((entry) => entry.employeeId), ...events.map((entry) => entry.employeeId)].filter((value): value is number => value != null))]
    const userIds = [...new Set([...parties.map((entry) => entry.userId), ...events.map((entry) => entry.createdByUserId), row.investigatorUserId].filter((value): value is number => !!value))]
    const people = new Map((employeeIds.length ? await em.getRepository(Employee).find({ where: { id: In(employeeIds) } }) : []).map((entry) => [entry.id, entry.fullName]))
    const accounts = new Map((userIds.length ? await em.getRepository(User).find({ where: { id: In(userIds) } }) : []).map((entry) => [entry.id, entry.displayName]))
    return { ...this.summary(row), description: row.description ?? null, outcomeNote: row.outcomeNote ?? null, fromRequest: row.requestId != null,
      investigatorName: row.investigatorUserId ? accounts.get(row.investigatorUserId) ?? null : null,
      parties: parties.filter((entry) => entry.role !== 'HANDLER').map((entry) => ({ id: entry.id, role: entry.role, roleLabel: CASE_ROLE_LABELS[entry.role] ?? entry.role, employeeId: entry.employeeId,
        employeeName: entry.employeeId != null ? people.get(entry.employeeId) ?? '—' : '—' })),
      handlers: parties.filter((entry) => entry.role === 'HANDLER').map((entry) => ({ userId: entry.userId, name: entry.userId != null ? accounts.get(entry.userId) ?? '—' : '—', investigator: entry.userId === row.investigatorUserId })),
      events: events.map((entry) => ({ id: entry.id, kind: entry.kind, kindLabel: CASE_EVENT_LABELS[entry.kind] ?? entry.kind, body: entry.body, employeeName: entry.employeeId != null ? people.get(entry.employeeId) ?? null : null,
        byName: entry.createdByUserId ? accounts.get(entry.createdByUserId) ?? null : null, at: entry.createdAt })) }
  }

  /** إجراء مطّلع على قضية — تحت قفل صفها، والعضوية بتتحكم تحته */
  private async act(user: JwtPayload, id: number, work: (em: EntityManager, row: HrCase) => Promise<void>) {
    await this.ds.transaction(async (em) => work(em, await this.handled(em, user, id, true)))
    return this.detail(user, id)
  }

  /** حساب الموظف المفعّل (المطّلع بيتضاف بموظفه) */
  private async accountOf(em: EntityManager, user: JwtPayload, raw: unknown): Promise<User> {
    const employee = await this.employeeInScope(em, user, raw)
    const account = await em.getRepository(User).findOne({ where: { employeeId: employee.id, isActive: true } })
    if (!account) throw new BadRequestException(CASE_HANDLER)
    return account
  }

  /** إضافة مطّلع على الملف (بموظفه) — ومش مشكو في حقه ولا مديره المباشر */
  addHandler(user: JwtPayload, id: number, employeeId: unknown, investigator = false) {
    return this.act(user, id, async (em, row) => {
      if (row.status === 'CLOSED') throw new BadRequestException(CASE_CLOSED)
      const account = await this.accountOf(em, user, employeeId)
      if (!(await em.getRepository(HrCaseParty).count({ where: { caseId: row.id, role: 'HANDLER', userId: account.id } }))) {
        await em.getRepository(HrCaseParty).insert({ caseId: row.id, role: 'HANDLER', employeeId: null, userId: account.id, addedByUserId: user.sub, addedAt: new Date() })
      }
      await this.assertNoConflict(em, row.id)
      if (investigator) {
        await em.getRepository(HrCase).update({ id: row.id }, { investigatorUserId: account.id, ...(row.status === 'OPEN' ? { status: 'INVESTIGATING' as const } : {}) })
        await this.event(em, row.id, 'STATUS', `تعيين محقق: ${account.displayName}`, user.sub)
      }
    })
  }

  /** إضافة طرف (شاكي، مشكو في حقه، شاهد) من موظفين نطاق الحساب — مرة واحدة بنفس الدور، ومن غير تعارض مصالح مع المطّلعين */
  addParty(user: JwtPayload, id: number, input: { employeeId?: unknown; role?: unknown }) {
    const role = cleanPartyRole(input.role)
    return this.act(user, id, async (em, row) => {
      if (row.status === 'CLOSED') throw new BadRequestException(CASE_CLOSED)
      const employee = await this.employeeInScope(em, user, input.employeeId)
      if (await em.getRepository(HrCaseParty).count({ where: { caseId: row.id, role, employeeId: employee.id } })) throw new BadRequestException(CASE_PARTY_EXISTS)
      await em.getRepository(HrCaseParty).insert({ caseId: row.id, role, employeeId: employee.id, userId: null, addedByUserId: user.sub, addedAt: new Date() })
      await this.assertNoConflict(em, row.id)
    })
  }

  /** حدث في الخط الزمني (ملاحظة، إفادة، دليل، جلسة، إخطار، محضر دفاع). الإفادة والدفاع لطرف من أطراف القضية */
  addEvent(user: JwtPayload, id: number, input: { kind?: unknown; body?: unknown; employeeId?: unknown }) {
    const kind = cleanEventKind(input.kind), body = cleanCaseText(input.body) as string
    return this.act(user, id, async (em, row) => {
      if (row.status === 'CLOSED') throw new BadRequestException(CASE_CLOSED)
      let employeeId: number | null = null
      if (kind === 'STATEMENT' || kind === 'DEFENSE') {
        const wanted = cleanCaseId(input.employeeId)
        const party = wanted ? await em.getRepository(HrCaseParty).findOne({ where: { caseId: row.id, employeeId: wanted, ...(kind === 'DEFENSE' ? { role: 'RESPONDENT' as const } : {}) } }) : null
        if (!party || party.role === 'HANDLER') throw new BadRequestException(CASE_EVENT_PARTY)
        employeeId = party.employeeId
      }
      await this.event(em, row.id, kind, body, user.sub, employeeId)
    })
  }

  /**
   * قرار في القضية (حفظ، إنذار، جزاء، فصل) — لازم محقق متعيّن؛ وقرار غير الحفظ على مشكو في حقهم لازم يسبقه إخطار ومحضر دفاع. القرار بيتسجّل
   * في الخط الزمني؛ والإجراء نفسه (الجزاء أو الفصل) بيتنفذ في موديوله.
   */
  decide(user: JwtPayload, id: number, input: { outcome?: unknown; note?: unknown }) {
    const outcome = cleanCaseOutcome(input.outcome), note = cleanCaseText(input.note) as string
    return this.act(user, id, async (em, row) => {
      if (row.status === 'CLOSED') throw new BadRequestException(CASE_CLOSED)
      if (!row.investigatorUserId) throw new BadRequestException(CASE_NO_INVESTIGATOR)
      if (outcome !== 'DISMISSED' && (await em.getRepository(HrCaseParty).count({ where: { caseId: row.id, role: 'RESPONDENT' } }))) {
        const kinds = new Set((await em.getRepository(HrCaseEvent).find({ where: { caseId: row.id, kind: In(['NOTICE', 'DEFENSE']) } })).map((entry) => entry.kind))
        if (!kinds.has('NOTICE') || !kinds.has('DEFENSE')) throw new BadRequestException(CASE_DUE_PROCESS)
      }
      await em.getRepository(HrCase).update({ id: row.id }, { status: 'DECIDED', outcome, outcomeNote: note.slice(0, 2000), decidedAt: new Date() })
      await this.event(em, row.id, 'DECISION', `${CASE_OUTCOME_LABELS[outcome]}: ${note}`, user.sub)
      await recordAudit(em, { category: 'SETTINGS', action: 'CASE_DECIDED', entityType: 'hr_case', entityId: row.id, actorUserId: user.sub, branchId: null, summary: `قرار في ملف القضية رقم ${row.id}`, after: { outcome } })
    })
  }

  close(user: JwtPayload, id: number) {
    return this.act(user, id, async (em, row) => {
      if (row.status !== 'DECIDED') throw new BadRequestException(row.status === 'CLOSED' ? CASE_CLOSED : CASE_NOT_DECIDED)
      await em.getRepository(HrCase).update({ id: row.id }, { status: 'CLOSED', closedAt: new Date() })
      await this.event(em, row.id, 'STATUS', 'إقفال القضية', user.sub)
    })
  }

  // ===== الموظف الطرف =====

  private async objectionUntil(em: EntityManager, row: HrCase): Promise<Date | null> {
    if (!row.decidedAt) return null
    const days = objectionDays((await em.getRepository(RequestsConfig).findOne({ where: { key: CASE_OBJECTION_KEY } }))?.value)
    return new Date(new Date(row.decidedAt).getTime() + days * 86400000)
  }

  /**
   * «قضاياي»: الشاكي بيشوف حالة شكواه ونتيجتها؛ والمشكو في حقه بيشوف القضية بعد إخطاره بس (نص الإخطار، والحالة والنتيجة، ومهلة اعتراضه).
   * الشاهد مابيشوفش حاجة. ملف القضية نفسه للمطّلعين بس.
   */
  async mine(user: JwtPayload) {
    const em = this.ds.manager
    if (!user.employeeId || !(await casesReady(em))) return { cases: [] }
    const parties = await em.getRepository(HrCaseParty).find({ where: { employeeId: user.employeeId, role: In(['COMPLAINANT', 'RESPONDENT']) } })
    if (!parties.length) return { cases: [] }
    const rows = await em.getRepository(HrCase).find({ where: { id: In([...new Set(parties.map((row) => row.caseId))]) }, order: { id: 'DESC' } })
    const events = await em.getRepository(HrCaseEvent).find({ where: { caseId: In(rows.map((row) => row.id)), kind: In(['NOTICE', 'OBJECTION']) }, order: { id: 'ASC' } })
    const out: Array<Record<string, unknown>> = []
    for (const row of rows) {
      const roles = parties.filter((entry) => entry.caseId === row.id).map((entry) => entry.role)
      const notices = events.filter((entry) => entry.caseId === row.id && entry.kind === 'NOTICE')
      const respondent = roles.includes('RESPONDENT'), complainant = roles.includes('COMPLAINANT')
      // المشكو في حقه من غير إخطار لسه مش شايف القضية
      if (!complainant && (!respondent || !notices.length)) continue
      const decided = row.status === 'DECIDED' || row.status === 'CLOSED'
      const objected = events.some((entry) => entry.caseId === row.id && entry.kind === 'OBJECTION' && entry.employeeId === user.employeeId)
      const until = respondent && decided ? await this.objectionUntil(em, row) : null
      out.push({ id: row.id, kindLabel: CASE_KIND_LABELS[row.kind] ?? row.kind, role: respondent ? 'RESPONDENT' : 'COMPLAINANT', roleLabel: CASE_ROLE_LABELS[respondent ? 'RESPONDENT' : 'COMPLAINANT'],
        // الشاكي شايف عنوان شكواه؛ والمشكو في حقه شايف نص الإخطار بس
        title: complainant ? row.title : null, notices: respondent ? notices.map((entry) => ({ body: entry.body, at: entry.createdAt })) : [],
        statusLabel: CASE_STATUS_LABELS[row.status] ?? row.status, outcomeLabel: decided && row.outcome ? CASE_OUTCOME_LABELS[row.outcome] ?? row.outcome : null,
        outcomeNote: respondent && decided ? row.outcomeNote ?? null : null, objected, objectionUntil: until, canObject: !!until && !objected && Date.now() <= until.getTime() })
    }
    return { cases: out }
  }

  /** اعتراض المشكو في حقه على القرار — في المهلة، ومرة واحدة، تحت قفل صف القضية؛ والقضية المقفولة بترجع «اتقرر فيها» عشان تتراجع */
  async object(user: JwtPayload, id: number, rawReason: unknown) {
    const reason = cleanCaseText(rawReason) as string
    await this.ds.transaction(async (em) => {
      await this.assertReady(em)
      const row = await em.getRepository(HrCase).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
      const party = row && user.employeeId ? await em.getRepository(HrCaseParty).findOne({ where: { caseId: id, role: 'RESPONDENT', employeeId: user.employeeId } }) : null
      // مش طرف مشكو في حقه، أو لسه مااتخطرش = غير موجودة
      if (!row || !party || !(await em.getRepository(HrCaseEvent).count({ where: { caseId: id, kind: 'NOTICE' } }))) throw new NotFoundException(CASE_NOT_FOUND)
      if (row.status !== 'DECIDED' && row.status !== 'CLOSED') throw new BadRequestException(CASE_NOT_DECIDED)
      const until = await this.objectionUntil(em, row)
      if (!until || Date.now() > until.getTime()) throw new BadRequestException(CASE_OBJECTION_LATE)
      if (await em.getRepository(HrCaseEvent).count({ where: { caseId: id, kind: 'OBJECTION', employeeId: user.employeeId as number } })) throw new ConflictException(CASE_OBJECTED)
      await this.event(em, id, 'OBJECTION', reason, user.sub, user.employeeId as number)
      if (row.status === 'CLOSED') await em.getRepository(HrCase).update({ id }, { status: 'DECIDED', closedAt: null })
    })
    return this.mine(user)
  }
}
