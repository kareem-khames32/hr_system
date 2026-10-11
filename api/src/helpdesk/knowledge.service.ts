import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { Column, DataSource, Entity, In, PrimaryGeneratedColumn, type EntityManager } from 'typeorm'
import { announcementAudienceInScope, announcementAudienceIntact, announcementAudienceJson } from '../announcements/announcement-rules'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, userHasPerm } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import { Branch } from '../org/entities/branch.entity'
import { Department } from '../org/entities/department.entity'
import { Team } from '../org/entities/team.entity'
import { PoliciesService } from '../policies/policies.service'
import { isCurrentEmployee } from '../reports/metrics'
import { RequestType } from '../requests/entities/request-type.entity'
import { audienceNeedsPositions, requestAudienceAllows, type AudiencePositions, type AudienceSubject } from '../requests/request-audience'
import { assertAudienceTargets, orgPlaceOf, orgPlacesFor, type OrgPlaces } from '../org/org-audience'
import { HELPDESK_CATEGORY, HELPDESK_PERMISSION } from './helpdesk-rules'

// B3.10-ب (ترحيل 123): قاعدة المعرفة — مقالات بجمهور «مين + فين» (نفس صيغة ومقيّم جمهور الإعلانات)، مرتبطة بنوع استفسار وبكلمات بحث،
// وبسياسة من مكتبة السياسات من غير تكرار نصها. الموظف بيشوف المنشور اللي في جمهوره قبل ما يفتح استفسار؛ والإدارة بصلاحية مركز الخدمات
// (وحساب الفروع بيكتب لفروعه بس). نفس الشكل في الترحيل بالحرف (من غير افتراضي).

@Entity('kb_articles')
export class KbArticle {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_kb_articles' })
  id: number

  @Column({ type: 'nvarchar', length: 200 })
  title: string

  @Column({ type: 'nvarchar', length: 'max' })
  body: string

  // نوع الاستفسار المرتبط (request_types.code)؛ الفاضي = عام
  @Column({ type: 'nvarchar', length: 50, nullable: true })
  typeCode: string | null

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  keywords: string | null

  // جمهور المقال بصيغة جمهور الإعلانات؛ NULL = كل الشركة
  @Column({ type: 'nvarchar', length: 2000, nullable: true })
  audience: string | null

  // سياسة مرتبطة من مكتبة السياسات (policies.id)
  @Column({ type: 'int', nullable: true })
  policyId: number | null

  @Column({ type: 'bit' })
  isPublished: boolean

  @Column({ type: 'int' })
  createdByUserId: number

  @Column({ type: 'datetime2' })
  createdAt: Date

  @Column({ type: 'datetime2' })
  updatedAt: Date
}

export const KB_MIGRATION_MISSING = 'قاعدة المعرفة محتاجة ترحيل 20261009_123 على قاعدة البيانات'
export const KB_NOT_FOUND = 'المقال غير موجود'
export const KB_TITLE = 'عنوان المقال مطلوب (من 3 لـ200 حرف)'
export const KB_BODY = 'نص المقال مطلوب (لحد 20000 حرف)'
export const KB_KEYWORDS = 'كلمات البحث 500 حرف بالكتير'
export const KB_TYPE = 'نوع الاستفسار المرتبط غير موجود'
export const KB_POLICY = 'السياسة المرتبطة غير موجودة'
export const KB_BRANCH_AUDIENCE = 'حساب الفروع بيكتب لفروعه بس: اختار «فروع محددة» من فروعك في جمهور المقال'
export const KB_SEARCH = 'كلمة البحث 100 حرف بالكتير'

export interface ArticleInput { title?: unknown; body?: unknown; typeCode?: unknown; keywords?: unknown; audience?: unknown; policyId?: unknown; isPublished?: unknown }
type Member = Pick<Employee, 'id' | 'departmentId' | 'teamId' | 'branchId' | 'status' | 'isActive'>
type Positions = { departmentManagers: Set<number>; teamLeaders: Set<number>; branchManagers: Set<number> }

let ready: boolean | null = null
/** جدول ترحيل 123 موجود؟ الموجود بيتحفظ */
export async function knowledgeReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.kb_articles', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الترحيل */
export function resetKnowledgeCache() { ready = null }

export function cleanArticleTitle(raw: unknown): string {
  const value = typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : ''
  if (value.length < 3 || value.length > 200) throw new BadRequestException(KB_TITLE)
  return value
}
export function cleanArticleBody(raw: unknown): string {
  const value = typeof raw === 'string' ? raw.replace(/\r\n?/g, '\n').trim() : ''
  if (!value || value.length > 20000) throw new BadRequestException(KB_BODY)
  return value
}
export function cleanArticleKeywords(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null
  if (typeof raw !== 'string') throw new BadRequestException(KB_KEYWORDS)
  const value = raw.replace(/\s+/g, ' ').trim()
  if (value.length > 500) throw new BadRequestException(KB_KEYWORDS)
  return value || null
}
/** المقال بيطابق كلمة البحث؟ في العنوان أو الكلمات أو النص (من غير فرق حالة الحروف) */
export function articleMatches(article: Pick<KbArticle, 'title' | 'body' | 'keywords'>, term: string): boolean {
  const needle = term.trim().toLowerCase()
  return !needle || [article.title, article.keywords ?? '', article.body].some((text) => text.toLowerCase().includes(needle))
}

@Injectable()
export class KnowledgeService {
  constructor(@InjectDataSource() private readonly ds: DataSource, private readonly policies: PoliciesService) {}

  private assertManager(user: JwtPayload) {
    if (!userHasPerm(user, HELPDESK_PERMISSION)) throw new ForbiddenException('الإجراء ده لصاحب صلاحية إدارة مركز الخدمات')
  }
  private async assertReady(em: EntityManager) {
    if (!(await knowledgeReady(em))) throw new BadRequestException(KB_MIGRATION_MISSING)
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
  private inAudience(row: Pick<KbArticle, 'audience'>, employee: Member, role: string | null | undefined, positions: Positions | null, places: OrgPlaces | null): boolean {
    const held: AudiencePositions = positions ? { departmentManager: positions.departmentManagers.has(employee.id), teamLeader: positions.teamLeaders.has(employee.id), branchManager: positions.branchManagers.has(employee.id) } : {}
    const subject: AudienceSubject = { role: role && role !== 'super_admin' ? role : null, permissions: [], employeeId: employee.id, departmentId: employee.departmentId ?? null, teamId: employee.teamId ?? null,
      branchId: employee.branchId ?? null, positions: held, ...orgPlaceOf(places, employee) }
    // نص جمهور تالف = المقال مش لحد
    return announcementAudienceIntact(row.audience) && requestAudienceAllows(row.audience, subject, 'submit')
  }
  private async viewer(em: EntityManager, user: JwtPayload): Promise<Member | null> {
    if (!user.employeeId) return null
    const employee = await em.getRepository(Employee).findOne({ where: { id: user.employeeId }, select: { id: true, departmentId: true, teamId: true, branchId: true, status: true, isActive: true } })
    return employee && isCurrentEmployee(employee) ? employee : null
  }
  /** المقالات المنشورة اللي في جمهور موظف الحساب */
  private async readable(em: EntityManager, user: JwtPayload): Promise<KbArticle[]> {
    if (!(await knowledgeReady(em))) return []
    const employee = await this.viewer(em, user)
    if (!employee) return []
    const rows = await em.getRepository(KbArticle).find({ where: { isPublished: true }, order: { id: 'DESC' } })
    const positions = rows.some((row) => audienceNeedsPositions(row.audience)) ? await this.positions(em) : null
    // B-ADD.1: أماكن الهيكل لجمهور «إدارات أو أقسام» أو فرق فرع
    const places = await orgPlacesFor(em, rows.map((row) => row.audience))
    return rows.filter((row) => this.inAudience(row, employee, user.role, positions, places))
  }

  private async typeNames(em: EntityManager): Promise<Map<string, string>> {
    return new Map((await em.getRepository(RequestType).find({ where: { category: HELPDESK_CATEGORY as RequestType['category'] } })).map((row) => [row.code, row.nameAr]))
  }

  // ===== الموظف =====

  /** بحث قاعدة المعرفة: المنشور اللي في جمهور الموظف، بكلمة و/أو بنوع استفسار (مقالات النوع والعامة) */
  async search(user: JwtPayload, input: { q?: unknown; typeCode?: unknown }) {
    const term = input.q === undefined || input.q === null ? '' : typeof input.q === 'string' ? input.q : null
    if (term === null || term.length > 100) throw new BadRequestException(KB_SEARCH)
    const typeCode = typeof input.typeCode === 'string' && input.typeCode ? input.typeCode : null
    const em = this.ds.manager
    const rows = (await this.readable(em, user)).filter((row) => articleMatches(row, term) && (!typeCode || row.typeCode === typeCode || row.typeCode === null))
    const types = await this.typeNames(em)
    // مقالات النوع المختار الأول، وبعدها العامة
    const ordered = typeCode ? [...rows.filter((row) => row.typeCode === typeCode), ...rows.filter((row) => row.typeCode !== typeCode)] : rows
    return { articles: ordered.slice(0, 50).map((row) => ({ id: row.id, title: row.title, typeCode: row.typeCode ?? null, typeName: row.typeCode ? types.get(row.typeCode) ?? null : null,
      excerpt: row.body.slice(0, 200), hasPolicy: row.policyId != null })),
    types: [...types].map(([code, name]) => ({ code, name })) }
  }

  /** مقال واحد للقراءة: منشور وفي جمهور الموظف — وإلا غير موجود */
  async read(user: JwtPayload, id: number) {
    const em = this.ds.manager
    const row = (await this.readable(em, user)).find((entry) => entry.id === id)
    if (!row) throw new NotFoundException(KB_NOT_FOUND)
    // Codex P3K-B10: مرجع السياسة بحكم القارئ نفسه (منشورة وهو في جمهورها) — وإلا المقال بيتعرض من غيره
    const policy = row.policyId != null ? await this.policies.referenceFor(user, row.policyId) : null
    return { id: row.id, title: row.title, body: row.body, typeCode: row.typeCode ?? null, typeName: row.typeCode ? (await this.typeNames(em)).get(row.typeCode) ?? null : null,
      // السياسة نفسها بتتقري من مكتبة السياسات بحكمها — هنا عنوانها ولينك بس
      policy: policy ? { id: policy.id, title: policy.title } : null, updatedAt: row.updatedAt }
  }

  // ===== الإدارة =====

  // السياسة المربوطة اللي الحساب مايشوفهاش: من غير رقم ولا عنوان — وhasPolicy بيقول إن فيه ربط (تعديل المقال من غير خانة السياسة مابيلمسوش)
  private manageView(row: KbArticle, types: Map<string, string>, policies: Map<number, string>) {
    return { id: row.id, title: row.title, body: row.body, typeCode: row.typeCode ?? null, typeName: row.typeCode ? types.get(row.typeCode) ?? null : null, keywords: row.keywords ?? null,
      audience: row.audience ? JSON.parse(row.audience) : null, policyId: row.policyId != null && policies.has(row.policyId) ? row.policyId : null,
      policyTitle: row.policyId != null ? policies.get(row.policyId) ?? null : null, hasPolicy: row.policyId != null, isPublished: row.isPublished === true,
      updatedAt: row.updatedAt }
  }

  /** مقالات في نطاق اللي بيديرها: حساب الفروع شايف اللي جمهورها فروعه بس */
  async list(user: JwtPayload) {
    this.assertManager(user)
    const em = this.ds.manager
    if (!(await knowledgeReady(em))) return { available: false, message: KB_MIGRATION_MISSING, articles: [], types: [] }
    const scope = branchScopeOf(user)
    const rows = (await em.getRepository(KbArticle).find({ order: { id: 'DESC' } })).filter((row) => announcementAudienceIntact(row.audience) && announcementAudienceInScope(row.audience, scope))
    const types = await this.typeNames(em)
    const policyIds = [...new Set(rows.map((row) => row.policyId).filter((id): id is number => id != null))]
    const policies = new Map<number, string>()
    for (const policyId of policyIds) {
      const reference = await this.policies.referenceFor(user, policyId, em)
      if (reference) policies.set(reference.id, reference.title)
    }
    return { available: true, articles: rows.map((row) => this.manageView(row, types, policies)), types: [...types].map(([code, name]) => ({ code, name })) }
  }

  /** خانات المقال بعد الحكم عليها: الجمهور في نطاق الحساب، والنوع من أنواع الاستفسارات، والسياسة موجودة */
  private async fields(em: EntityManager, user: JwtPayload, input: ArticleInput, current: KbArticle | null) {
    const audience = input.audience !== undefined ? announcementAudienceJson(input.audience) : current?.audience ?? null
    if (!announcementAudienceInScope(audience, branchScopeOf(user))) throw new ForbiddenException(KB_BRANCH_AUDIENCE)
    if (input.audience !== undefined) await assertAudienceTargets(em, audience, 'جمهور المقال', current?.audience ?? null)
    let typeCode = current?.typeCode ?? null
    if (input.typeCode !== undefined) {
      if (input.typeCode === null || input.typeCode === '') typeCode = null
      else {
        if (typeof input.typeCode !== 'string' || !(await this.typeNames(em)).has(input.typeCode)) throw new BadRequestException(KB_TYPE)
        typeCode = input.typeCode
      }
    }
    let policyId = current?.policyId ?? null
    if (input.policyId !== undefined) {
      if (input.policyId === null || input.policyId === '') policyId = null
      else {
        // Codex P3K-B10: الربط بسياسة الحساب نفسه يقدر يشوفها بس — غيرها نفس رد «مش موجودة»
        const policy = typeof input.policyId === 'number' ? await this.policies.referenceFor(user, input.policyId, em) : null
        if (!policy) throw new BadRequestException(KB_POLICY)
        policyId = policy.id
      }
    }
    if (input.isPublished !== undefined && typeof input.isPublished !== 'boolean') throw new BadRequestException('«منشور» نعم أو لا')
    return { title: input.title !== undefined || !current ? cleanArticleTitle(input.title) : current.title, body: input.body !== undefined || !current ? cleanArticleBody(input.body) : current.body,
      typeCode, keywords: input.keywords !== undefined ? cleanArticleKeywords(input.keywords) : current?.keywords ?? null, audience, policyId,
      isPublished: input.isPublished !== undefined ? input.isPublished === true : current?.isPublished === true }
  }

  async create(user: JwtPayload, input: ArticleInput) {
    this.assertManager(user)
    const em = this.ds.manager
    await this.assertReady(em)
    const now = new Date()
    const made = await em.getRepository(KbArticle).insert({ ...(await this.fields(em, user, input, null)), createdByUserId: user.sub, createdAt: now, updatedAt: now })
    return this.managed(user, made.identifiers[0].id as number)
  }

  /** تعديل مقال (أو نشره وسحبه) — تحت قفل صفه، وهو في نطاق الحساب وإلا «غير موجود»، وبالخانات اللي اتبعتت بس */
  async update(user: JwtPayload, id: number, input: ArticleInput) {
    this.assertManager(user)
    await this.ds.transaction(async (em) => {
      await this.assertReady(em)
      const row = await em.getRepository(KbArticle).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!row || !announcementAudienceInScope(row.audience, branchScopeOf(user))) throw new NotFoundException(KB_NOT_FOUND)
      await em.getRepository(KbArticle).update({ id: row.id }, { ...(await this.fields(em, user, input, row)), updatedAt: new Date() })
    })
    return this.managed(user, id)
  }

  private async managed(user: JwtPayload, id: number) {
    const found = (await this.list(user)).articles.find((row) => row.id === id)
    if (!found) throw new NotFoundException(KB_NOT_FOUND)
    return found
  }
}
