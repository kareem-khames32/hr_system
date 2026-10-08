import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, In, IsNull, type EntityManager } from 'typeorm'
import { announcementAudienceInScope, announcementAudienceIntact, announcementAudienceJson } from '../announcements/announcement-rules'
import { localDateOf } from '../attendance/attendance.service'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, inBranchScope, userHasPerm } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import { Branch } from '../org/entities/branch.entity'
import { Department } from '../org/entities/department.entity'
import { Team } from '../org/entities/team.entity'
import { isCurrentEmployee } from '../reports/metrics'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { audienceNeedsPositions, requestAudienceAllows, type AudiencePositions, type AudienceSubject } from '../requests/request-audience'
import {
  SURVEYS_MIGRATION_MISSING, SURVEYS_PERMISSION, SURVEY_ANSWERED, SURVEY_BRANCH_AUDIENCE, SURVEY_CLOSE_DATE, SURVEY_COMMENT_MIN_KEY, SURVEY_EMPTY_AUDIENCE, SURVEY_KIND_LABELS, SURVEY_NOT_DRAFT,
  SURVEY_BUSY, SURVEY_NOT_FOUND, SURVEY_NOT_OPEN, SURVEY_RESULTS_AFTER_CLOSE, SURVEY_STATUS_LABELS, Survey, SurveyInvitation, SurveyResponse, cleanMinGroup, cleanSurveyAnswers, cleanSurveyKind, cleanSurveyQuestions, cleanSurveyTitle,
  commentMin, complementaryHidden, parseSurveyQuestions, summarize, surveysReady, visibleGroups, type SurveyAnswers,
} from './survey-rules'

export interface SurveyInput { title?: unknown; kind?: unknown; audience?: unknown; isAnonymous?: unknown; minGroup?: unknown; questions?: unknown; closeDate?: unknown }
type Member = Pick<Employee, 'id' | 'departmentId' | 'teamId' | 'branchId' | 'status' | 'isActive'>
type Positions = { departmentManagers: Set<number>; teamLeaders: Set<number>; branchManagers: Set<number> }
const day = (value: unknown): string | null => (value === null || value === undefined ? null : String(value).slice(0, 10))

// B3.13: الاستبيانات. الإدارة بالصلاحية وبنطاق الفروع (جمهور الاستبيان بصيغة ومقيّم جمهور الإعلانات). فتح الاستبيان بيعمل دعوة لكل موظف
// في جمهوره بمجموعته ساعتها. الرد: علامة «رد» على الدعوة في معاملة، والرد نفسه في معاملة تانية من غير أي رابط بالدعوة — والمجهول من غير
// موظف ولا حساب ولا ساعة، ومن غير سطر تدقيق. النتايج بالحد الأدنى للمجموعة ومن غير مجموعات تتحسب بالطرح.
@Injectable()
export class SurveysService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  private assertManager(user: JwtPayload) {
    if (!userHasPerm(user, SURVEYS_PERMISSION)) throw new ForbiddenException('الإجراء ده لصاحب صلاحية إدارة الاستبيانات')
  }
  private async assertReady(em: EntityManager) {
    if (!(await surveysReady(em))) throw new BadRequestException(SURVEYS_MIGRATION_MISSING)
  }

  // ===== الجمهور (نفس مقيّم الإعلانات) =====
  private async positions(em: EntityManager): Promise<Positions> {
    const [departments, teams, branches] = await Promise.all([
      em.getRepository(Department).find({ select: { id: true, managerEmployeeId: true } }),
      em.getRepository(Team).find({ select: { id: true, leaderEmployeeId: true } }),
      em.getRepository(Branch).find({ select: { id: true, managerEmployeeId: true } }),
    ])
    const ids = (values: Array<number | null | undefined>) => new Set(values.filter((value): value is number => !!value))
    return { departmentManagers: ids(departments.map((row) => row.managerEmployeeId)), teamLeaders: ids(teams.map((row) => row.leaderEmployeeId)), branchManagers: ids(branches.map((row) => row.managerEmployeeId)) }
  }
  /** موظفين جمهور الاستبيان الحاليين (الدور مش من جمهور الاستبيان: «مين» بالمنصب أو الموظف أو القسم) */
  private async members(em: EntityManager, audience: string | null): Promise<Member[]> {
    if (!announcementAudienceIntact(audience)) return []
    const people = (await em.getRepository(Employee).find({ select: { id: true, departmentId: true, teamId: true, branchId: true, status: true, isActive: true } })).filter((row) => isCurrentEmployee(row))
    const positions = audienceNeedsPositions(audience) ? await this.positions(em) : null
    return people.filter((employee) => {
      const held: AudiencePositions = positions ? { departmentManager: positions.departmentManagers.has(employee.id), teamLeader: positions.teamLeaders.has(employee.id), branchManager: positions.branchManagers.has(employee.id) } : {}
      const subject: AudienceSubject = { role: null, permissions: [], employeeId: employee.id, departmentId: employee.departmentId ?? null, teamId: employee.teamId ?? null, branchId: employee.branchId ?? null, positions: held }
      return requestAudienceAllows(audience, subject, 'submit')
    })
  }

  // ===== الإدارة =====

  private manageView(row: Survey, counts?: { invited: number; responded: number }) {
    return { id: row.id, title: row.title, kind: row.kind, kindLabel: SURVEY_KIND_LABELS[row.kind] ?? row.kind, audience: row.audience ? JSON.parse(row.audience) : null, isAnonymous: row.isAnonymous === true,
      minGroup: row.minGroup, questions: parseSurveyQuestions(row.questions), closeDate: day(row.closeDate), status: row.status, statusLabel: SURVEY_STATUS_LABELS[row.status] ?? row.status,
      invited: counts?.invited ?? 0, responded: counts?.responded ?? 0 }
  }

  private async counts(em: EntityManager, ids: number[]) {
    const out = new Map<number, { invited: number; responded: number }>()
    if (!ids.length) return out
    const rows: Array<{ surveyId: number; invited: number; responded: number }> = await em.query(
      `SELECT [surveyId], COUNT(*) AS [invited], SUM(CASE WHEN [respondedOn] IS NULL THEN 0 ELSE 1 END) AS [responded] FROM [survey_invitations] WHERE [surveyId] IN (${ids.map((_, index) => `@${index}`).join(', ')}) GROUP BY [surveyId]`, ids)
    for (const row of rows) out.set(Number(row.surveyId), { invited: Number(row.invited), responded: Number(row.responded) })
    return out
  }

  /** الاستبيان في نطاق اللي بيديره (جمهوره جوه فروعه) — وإلا غير موجود */
  private async managed(em: EntityManager, user: JwtPayload, id: number, lock = false): Promise<Survey> {
    await this.assertReady(em)
    const row = await em.getRepository(Survey).findOne({ where: { id }, ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}) })
    if (!row || !announcementAudienceInScope(row.audience, branchScopeOf(user))) throw new NotFoundException(SURVEY_NOT_FOUND)
    return row
  }

  async list(user: JwtPayload) {
    this.assertManager(user)
    const em = this.ds.manager
    if (!(await surveysReady(em))) return { available: false, message: SURVEYS_MIGRATION_MISSING, surveys: [] }
    const scope = branchScopeOf(user)
    const rows = (await em.getRepository(Survey).find({ order: { id: 'DESC' } })).filter((row) => announcementAudienceInScope(row.audience, scope))
    const counts = await this.counts(em, rows.map((row) => row.id))
    return { available: true, surveys: rows.map((row) => this.manageView(row, counts.get(row.id))) }
  }

  private fields(user: JwtPayload, input: SurveyInput, current: Survey | null) {
    const audience = input.audience !== undefined ? announcementAudienceJson(input.audience) : current?.audience ?? null
    if (!announcementAudienceInScope(audience, branchScopeOf(user))) throw new ForbiddenException(SURVEY_BRANCH_AUDIENCE)
    if (input.isAnonymous !== undefined && typeof input.isAnonymous !== 'boolean') throw new BadRequestException('«مجهول» نعم أو لا')
    let closeDate = current ? day(current.closeDate) : null
    if (input.closeDate !== undefined) {
      const raw = input.closeDate
      if (raw === null || raw === '') closeDate = null
      else {
        const valid = typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw) && new Date(`${raw}T00:00:00Z`).toISOString().slice(0, 10) === raw && raw >= localDateOf(new Date())
        if (!valid) throw new BadRequestException(SURVEY_CLOSE_DATE)
        closeDate = raw as string
      }
    }
    return { title: input.title !== undefined || !current ? cleanSurveyTitle(input.title) : current.title, kind: input.kind !== undefined || !current ? cleanSurveyKind(input.kind) : current.kind, audience,
      isAnonymous: input.isAnonymous !== undefined ? input.isAnonymous === true : current ? current.isAnonymous === true : true,
      minGroup: input.minGroup !== undefined || !current ? cleanMinGroup(input.minGroup) : current.minGroup,
      questions: input.questions !== undefined || !current ? JSON.stringify(cleanSurveyQuestions(input.questions)) : current.questions, closeDate }
  }

  async create(user: JwtPayload, input: SurveyInput) {
    this.assertManager(user)
    const em = this.ds.manager
    await this.assertReady(em)
    const made = await em.getRepository(Survey).insert({ ...this.fields(user, input, null), status: 'DRAFT', createdByUserId: user.sub, createdAt: new Date(), openedAt: null, closedAt: null })
    return this.manageView(await em.getRepository(Survey).findOneOrFail({ where: { id: made.identifiers[0].id as number } }))
  }

  /** تعديل مسودة بس — تحت قفل صفها */
  async update(user: JwtPayload, id: number, input: SurveyInput) {
    this.assertManager(user)
    await this.ds.transaction(async (em) => {
      const row = await this.managed(em, user, id, true)
      if (row.status !== 'DRAFT') throw new BadRequestException(SURVEY_NOT_DRAFT)
      await em.getRepository(Survey).update({ id: row.id }, this.fields(user, input, row))
    })
    return this.one(user, id)
  }

  private async one(user: JwtPayload, id: number) {
    const em = this.ds.manager
    const row = await this.managed(em, user, id)
    return this.manageView(row, (await this.counts(em, [row.id])).get(row.id))
  }

  /** فتح الاستبيان: دعوة لكل موظف حالي في جمهوره بقسمه وفرعه ساعتها — تحت قفل صفه، ومرة واحدة */
  async open(user: JwtPayload, id: number) {
    this.assertManager(user)
    await this.ds.transaction(async (em) => {
      const row = await this.managed(em, user, id, true)
      if (row.status !== 'DRAFT') throw new BadRequestException(SURVEY_NOT_DRAFT)
      const members = await this.members(em, row.audience)
      if (!members.length) throw new BadRequestException(SURVEY_EMPTY_AUDIENCE)
      const now = new Date()
      for (let offset = 0; offset < members.length; offset += 200) {
        await em.getRepository(SurveyInvitation).insert(members.slice(offset, offset + 200).map((employee) => ({ surveyId: row.id, employeeId: employee.id, departmentId: employee.departmentId ?? null, branchId: employee.branchId ?? null,
          respondedOn: null, createdAt: now })))
      }
      await em.getRepository(Survey).update({ id: row.id }, { status: 'OPEN', openedAt: now })
    })
    return this.one(user, id)
  }

  async close(user: JwtPayload, id: number) {
    this.assertManager(user)
    await this.ds.transaction(async (em) => {
      // Codex P3L-B02: القفل بياخد قفل صف الاستبيان نفسه اللي الرد ماسكه لحد ما صف الرد يتكتب — فبيستنى الردود الجارية (بالدور، لحد 5 ثواني)
      // وبعده مفيش رد بيتضاف. رد واقف أطول من كده = 409 «جرّب تاني» بدل ما الطلب يقع بمهلة الاتصال. المهلة والقفل في نفس الجملة: المهلة
      // بتنتهي مع الجملة (مابتفضلش على الاتصال)، والقفل بيفضل لآخر المعاملة
      try {
        await em.query('SET LOCK_TIMEOUT 5000; SELECT [id] FROM [surveys] WITH (UPDLOCK, ROWLOCK) WHERE [id] = @0', [id])
      } catch (error) {
        const failure = error as { number?: number; driverError?: { number?: number } }
        if (Number(failure?.driverError?.number ?? failure?.number) === 1222) throw new ConflictException(SURVEY_BUSY)
        throw error
      }
      const row = await this.managed(em, user, id, true)
      if (row.status !== 'OPEN') throw new BadRequestException(SURVEY_NOT_OPEN)
      await em.getRepository(Survey).update({ id: row.id }, { status: 'CLOSED', closedAt: new Date() })
    })
    return this.one(user, id)
  }

  /**
   * نتايج استبيان: من غير أسماء. تحت الحد الأدنى مفيش نتايج خالص. الأقسام اللي ردودها فوق الحد بس — ومن غير أقسام تخلّي قسم مخفي يتحسب بالطرح.
   * التعليقات النصية لما الردود توصل حدها (إعداد)، ومتلخبطة الترتيب ومن غير مجموعة.
   */
  async results(user: JwtPayload, id: number) {
    this.assertManager(user)
    const em = this.ds.manager
    const row = await this.managed(em, user, id)
    if (row.status === 'DRAFT') throw new BadRequestException(SURVEY_NOT_OPEN)
    // Codex P3K-B13: النتايج بعد القفل بس — قراءتها قبل رد وبعده بتكشف الرد ده بالطرح
    if (row.status !== 'CLOSED') throw new BadRequestException(SURVEY_RESULTS_AFTER_CLOSE)
    const questions = parseSurveyQuestions(row.questions)
    const responses = await em.getRepository(SurveyResponse).find({ where: { surveyId: id } })
    const counts = (await this.counts(em, [id])).get(id) ?? { invited: 0, responded: 0 }
    const base = { survey: this.manageView(row, counts), total: responses.length, minGroup: row.minGroup }
    if (responses.length < row.minGroup) return { ...base, visible: false, overall: [], groups: [], comments: [], commentsHidden: true }
    const parsed = responses.map((entry) => ({ departmentId: entry.departmentId ?? 0, answers: JSON.parse(entry.answers) as SurveyAnswers }))
    const byDepartment = new Map<number, SurveyAnswers[]>()
    for (const entry of parsed) byDepartment.set(entry.departmentId, [...(byDepartment.get(entry.departmentId) ?? []), entry.answers])
    const shown = visibleGroups([...byDepartment].map(([key, list]) => ({ key, count: list.length })), row.minGroup)
    // Codex P3L-B02: الإخفاء التكميلي لكل سؤال — ملخص سؤال في مجموعة مخفية مايتحسبش بطرح المعروض من الإجمالي
    const shownKeys = new Set(shown)
    const extra = complementaryHidden(questions, shown.map((key) => ({ key, answers: byDepartment.get(key)! })), parsed.filter((entry) => !shownKeys.has(entry.departmentId)).map((entry) => entry.answers), row.minGroup)
    const hiddenIn = (group: number) => new Set([...extra].filter(([, groups]) => groups.has(group)).map(([question]) => question))
    // اسم القسم بحكم فرعه الحالي: قسم اتنقل برّه نطاق قارئ النتايج مابيتسمّاش
    const scope = branchScopeOf(user)
    const names = new Map((shown.filter(Boolean).length ? await em.getRepository(Department).find({ where: { id: In(shown.filter(Boolean)) } }) : [])
      .filter((entry) => inBranchScope(scope, entry.branchId)).map((entry) => [entry.id, entry.name]))
    const limit = Math.max(row.minGroup, commentMin((await em.getRepository(RequestsConfig).findOne({ where: { key: SURVEY_COMMENT_MIN_KEY } }))?.value))
    const showComments = responses.length >= limit
    return { ...base, visible: true, overall: summarize(questions, parsed.map((entry) => entry.answers), row.minGroup),
      groups: shown.map((key) => ({ name: key ? names.get(key) ?? 'قسم برّه نطاقك' : 'من غير قسم', count: byDepartment.get(key)!.length, summary: summarize(questions, byDepartment.get(key)!, row.minGroup, hiddenIn(key)) })),
      commentsHidden: !showComments,
      comments: showComments ? questions.filter((question) => question.type === 'text').map((question) => ({ key: question.key, label: question.label,
        // متلخبطة الترتيب: ترتيب الرد مايدلّش على صاحبه
        texts: parsed.map((entry) => entry.answers[question.key]).filter((value): value is string => typeof value === 'string').map((value) => ({ value, order: Math.random() }))
          .sort((left, right) => left.order - right.order).map((entry) => entry.value) }))
        // والحد على تعليقات كل سؤال: سؤال كتب فيه أقل من الحد مابتتعرضش تعليقاته
        .filter((entry) => entry.texts.length >= row.minGroup) : [] }
  }

  // ===== الموظف =====

  private openNow(row: Survey): boolean {
    return row.status === 'OPEN' && (!row.closeDate || String(row.closeDate).slice(0, 10) >= localDateOf(new Date()))
  }

  /** «استبياناتي»: الاستبيانات المفتوحة اللي الموظف مدعو لها ولسه ماردّش */
  async mine(user: JwtPayload) {
    const em = this.ds.manager
    if (!user.employeeId || !(await surveysReady(em))) return { surveys: [] }
    const invitations = await em.getRepository(SurveyInvitation).find({ where: { employeeId: user.employeeId, respondedOn: IsNull() } })
    if (!invitations.length) return { surveys: [] }
    const rows = (await em.getRepository(Survey).find({ where: { id: In(invitations.map((row) => row.surveyId)) }, order: { id: 'DESC' } })).filter((row) => this.openNow(row))
    return { surveys: rows.map((row) => ({ id: row.id, title: row.title, kindLabel: SURVEY_KIND_LABELS[row.kind] ?? row.kind, isAnonymous: row.isAnonymous === true, closeDate: day(row.closeDate),
      questionCount: parseSurveyQuestions(row.questions).length })) }
  }

  /** دعوة الموظف لاستبيان مفتوح — وإلا غير موجود */
  private async invited(em: EntityManager, user: JwtPayload, id: number): Promise<{ survey: Survey; invitation: SurveyInvitation }> {
    await this.assertReady(em)
    const survey = await em.getRepository(Survey).findOne({ where: { id } })
    const invitation = survey && user.employeeId ? await em.getRepository(SurveyInvitation).findOne({ where: { surveyId: id, employeeId: user.employeeId } }) : null
    if (!survey || !invitation || survey.status === 'DRAFT') throw new NotFoundException(SURVEY_NOT_FOUND)
    return { survey, invitation }
  }

  async form(user: JwtPayload, id: number) {
    const { survey, invitation } = await this.invited(this.ds.manager, user, id)
    return { id: survey.id, title: survey.title, kindLabel: SURVEY_KIND_LABELS[survey.kind] ?? survey.kind, isAnonymous: survey.isAnonymous === true, minGroup: survey.minGroup, closeDate: day(survey.closeDate),
      questions: parseSurveyQuestions(survey.questions), answered: invitation.respondedOn != null, open: this.openNow(survey) }
  }

  /**
   * الرد على استبيان — معاملة واحدة تحت قفل صف الاستبيان: الاستبيان مفتوح، وعلامة «رد» على دعوة الموظف بكتابة مشروطة باليوم بس (مرة واحدة)،
   * وصف الرد بمجموعة الدعوة — من غير رقم الدعوة ولا ساعة، ومن غير موظف في الاستبيان المجهول. ومفيش سطر تدقيق للرد.
   * Codex P3L-B02: القفل (close) بياخد نفس قفل الصف فبيستنى أي رد جاري، وبعده مفيش رد بيتضاف — النتايج بعد القفل ثابتة.
   */
  async respond(user: JwtPayload, id: number, rawAnswers: unknown) {
    const { survey, invitation } = await this.invited(this.ds.manager, user, id)
    if (!this.openNow(survey)) throw new BadRequestException(SURVEY_NOT_OPEN)
    const answers = cleanSurveyAnswers(parseSurveyQuestions(survey.questions), rawAnswers)
    const today = localDateOf(new Date())
    await this.ds.transaction(async (em) => {
      const fresh = await em.getRepository(Survey).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!fresh || !this.openNow(fresh)) throw new BadRequestException(SURVEY_NOT_OPEN)
      const marked = await em.getRepository(SurveyInvitation).update({ id: invitation.id, respondedOn: IsNull() }, { respondedOn: today })
      if (!marked.affected) throw new ConflictException(SURVEY_ANSWERED)
      await em.getRepository(SurveyResponse).insert({ surveyId: id, departmentId: invitation.departmentId ?? null, branchId: invitation.branchId ?? null,
        employeeId: fresh.isAnonymous === true ? null : invitation.employeeId, answers: JSON.stringify(answers),
        // Codex P3K-B13: الرد المجهول من غير يومه (يوم فتح الاستبيان لكل الردود): يوم العلامة على الدعوة مايتطابقش بيوم رد
        submittedOn: fresh.isAnonymous === true ? (fresh.openedAt ? localDateOf(new Date(fresh.openedAt)) : today) : today })
    })
    return { received: true }
  }
}
