import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, In, LessThanOrEqual, type EntityManager } from 'typeorm'
import { localDateOf } from '../attendance/attendance.service'
import { recordAudit } from '../audit/audit'
import type { JwtPayload } from '../auth/auth.service'
import { branchIdIn, branchScopeOf, userHasPerm } from '../auth/guards'
import type { BranchScope } from '../auth/guards'
import { User } from '../auth/user.entity'
import { Employee } from '../employees/employee.entity'
import { StoredFile } from '../files/stored-file.entity'
import { ModulesService } from '../modules-registry/modules.service'
import { Branch } from '../org/entities/branch.entity'
import { Department } from '../org/entities/department.entity'
import { Team } from '../org/entities/team.entity'
import { assertAudienceTargets, departmentPathsFor, type DepartmentPaths } from '../org/org-audience'
import { recordOutboxEvent } from '../queue/outbox'
import { isCurrentEmployee } from '../reports/metrics'
import { audienceNeedsPositions, parseRequestAudience, requestAudienceAllows, type AudiencePositions, type AudienceSubject } from '../requests/request-audience'
import { Announcement, AnnouncementRead } from './announcement.entities'
import {
  ANNOUNCEMENTS_MIGRATION_MISSING, ANNOUNCEMENT_ATTACHMENT_INVALID, ANNOUNCEMENT_BRANCH_AUDIENCE, ANNOUNCEMENT_FILE_NOT_FOUND, ANNOUNCEMENT_NOT_DRAFT,
  ANNOUNCEMENT_NOT_FOUND, ANNOUNCEMENT_UPLOAD_RULE, announcementAttachmentInput, announcementAudienceInScope, announcementAudienceIntact,
  announcementAudienceJson, announcementBody, announcementDates, announcementLive, announcementTitle, announcementsReady, occasionsOf,
} from './announcement-rules'

export interface AnnouncementInput {
  title?: unknown; body?: unknown; audience?: unknown; publishDate?: unknown; expiryDate?: unknown; pinned?: unknown; requiresRead?: unknown
  /** B2.16-ب: رقم ملف مرفوع بتصنيف «announcement» (null = فك المرفق) */
  attachmentFileId?: unknown
}
type Attachment = { id: number; name: string; size: number }
type Positions = { departmentManagers: Set<number>; teamLeaders: Set<number>; branchManagers: Set<number> }
// B-ADD.1: اللي المقيّم محتاجه من الهيكل لمجموعة إعلانات — المناصب («حسب المنصب») ومسارات الأقسام («إدارات أو أقسام»)، كل واحد لما يتحتاج بس
type OrgFacts = { positions: Positions | null; paths: DepartmentPaths | null }
type Member = Pick<Employee, 'id' | 'departmentId' | 'teamId' | 'branchId'>
const day = (value: unknown): string | null => (value == null || value === '' ? null : String(value).slice(0, 10))

// B2.16: الإعلانات — إعلان لجمهور «مين + فين» (نفس مقيّم جمهور أنواع الطلبات والسياسات) بتاريخ نشر وانتهاء، ولوحته في البوابة،
// وتسجيل القراءة، وتقريرها. حساب الفروع بيدير إعلانات فروعه بس.
@Injectable()
export class AnnouncementsService {
  constructor(@InjectDataSource() private readonly ds: DataSource, private readonly modules: ModulesService) {}

  private get repo() { return this.ds.getRepository(Announcement) }

  private async assertReady(em: EntityManager = this.ds.manager) {
    if (!(await announcementsReady(em))) throw new BadRequestException(ANNOUNCEMENTS_MIGRATION_MISSING)
  }

  // ===== الجمهور =====
  private async positions(em: EntityManager): Promise<Positions> {
    const [departments, teams, branches] = await Promise.all([
      em.getRepository(Department).find({ select: { id: true, managerEmployeeId: true } }),
      em.getRepository(Team).find({ select: { id: true, leaderEmployeeId: true } }),
      em.getRepository(Branch).find({ select: { id: true, managerEmployeeId: true } }),
    ])
    const ids = (values: Array<number | null | undefined>) => new Set(values.filter((value): value is number => !!value))
    return { departmentManagers: ids(departments.map(row => row.managerEmployeeId)), teamLeaders: ids(teams.map(row => row.leaderEmployeeId)),
      branchManagers: ids(branches.map(row => row.managerEmployeeId)) }
  }

  /**
   * الموظف قدام مقيّم الجمهور: بملفه (قسم، فريق، فرع، منصب) وبدور حسابه. من غير صلاحيات، ودور مدير النظام مش دور وظيفي: المقيّم
   * بيعدّي مدير النظام في أي جمهور، وهنا السؤال «الإعلان ده للموظف ده؟»، فمدير النظام بيشوف اللي لموظفه بس (زي السياسات).
   */
  private subject(employee: Member, role: string | null | undefined, org: OrgFacts): AudienceSubject {
    const positions = org.positions
    const held: AudiencePositions = positions ? { departmentManager: positions.departmentManagers.has(employee.id), teamLeader: positions.teamLeaders.has(employee.id),
      branchManager: positions.branchManagers.has(employee.id) } : {}
    return { role: role && role !== 'super_admin' ? role : null, permissions: [], employeeId: employee.id, departmentId: employee.departmentId ?? null,
      teamId: employee.teamId ?? null, branchId: employee.branchId ?? null, positions: held, departmentPath: org.paths ? org.paths(employee.departmentId) : null }
  }

  private inAudience(row: Pick<Announcement, 'audience'>, employee: Member, role: string | null | undefined, org: OrgFacts): boolean {
    // نص جمهور تالف (اتغيّر برّه الكاتب) = الإعلان مش لحد
    return announcementAudienceIntact(row.audience) && requestAudienceAllows(row.audience, this.subject(employee, role, org), 'submit')
  }

  private async positionsFor(em: EntityManager, rows: ReadonlyArray<Pick<Announcement, 'audience'>>): Promise<OrgFacts> {
    return { positions: rows.some(row => audienceNeedsPositions(row.audience)) ? await this.positions(em) : null,
      paths: await departmentPathsFor(em, rows.map(row => row.audience)) }
  }

  /** موظف الحساب الحالي (ملف مفعّل وحالته مش خارج)، أو null */
  private async viewer(em: EntityManager, user: JwtPayload): Promise<Member | null> {
    if (!user.employeeId) return null
    const employee = await em.getRepository(Employee).findOne({ where: { id: user.employeeId }, select: { id: true, departmentId: true, teamId: true, branchId: true, status: true, isActive: true } })
    return employee && isCurrentEmployee(employee) ? employee : null
  }

  private view(row: Announcement, attachment: Attachment | null) {
    return { id: row.id, title: row.title, body: row.body, publishDate: day(row.publishDate)!, expiryDate: day(row.expiryDate), pinned: row.pinned === true,
      requiresRead: row.requiresRead === true, attachment }
  }

  /** مرفق كل إعلان (واحد): الملف المربوط بيه بتصنيف «announcement» — اسمه وحجمه؛ قراءته من /files/:id بحكم الإعلان (assertFileAccess) */
  private async attachmentsOf(em: EntityManager, ids: number[]): Promise<Map<number, Attachment>> {
    const byAnnouncement = new Map<number, Attachment>()
    if (!ids.length) return byAnnouncement
    const rows = await em.getRepository(StoredFile).find({ where: { entityType: 'announcement', entityId: In(ids) },
      select: { id: true, originalName: true, size: true, entityId: true }, order: { id: 'ASC' } })
    for (const row of rows) if (!byAnnouncement.has(row.entityId)) byAnnouncement.set(row.entityId, { id: row.id, name: row.originalName, size: row.size })
    return byAnnouncement
  }

  // ===== لوحة الإعلانات (الموظف) =====
  /** الإعلانات السارية اللي موظف الحساب في جمهورها — المثبّت أولًا ثم الأحدث — وبعلامة القراءة */
  async board(user: JwtPayload) {
    const em = this.ds.manager
    if (!(await announcementsReady(em))) return { available: false, items: [] }
    const employee = await this.viewer(em, user)
    if (!employee) return { available: true, items: [] }
    const today = localDateOf(new Date())
    const published = (await this.repo.find({ where: { status: 'PUBLISHED', publishDate: LessThanOrEqual(today) as any }, order: { pinned: 'DESC', publishDate: 'DESC', id: 'DESC' } }))
      .filter(row => announcementLive(row, today))
    const positions = await this.positionsFor(em, published)
    const mine = published.filter(row => this.inAudience(row, employee, user.role, positions))
    const reads = mine.length ? await em.getRepository(AnnouncementRead).find({ where: { employeeId: employee.id, announcementId: In(mine.map(row => row.id)) } }) : []
    const readAt = new Map(reads.map(read => [read.announcementId, read.readAt]))
    const attachments = await this.attachmentsOf(em, mine.map(row => row.id))
    return { available: true, items: mine.map(row => ({ ...this.view(row, attachments.get(row.id) ?? null), read: readAt.has(row.id), readAt: readAt.get(row.id) ?? null })) }
  }

  /**
   * الإعلان ساري والحساب في جمهوره دلوقتي؟ (فحص الإشعار وقت التوزيع والإرسال، وتسجيل القراءة). lock = صف الإعلان مقفول قراءة لآخر
   * المعاملة (السحب بيستنى)، والمنادي جوه معاملة.
   */
  async liveFor(user: JwtPayload, id: number, em: EntityManager = this.ds.manager, lock = false): Promise<{ row: Announcement; employee: Member } | null> {
    if (!(await announcementsReady(em)) || !Number.isSafeInteger(id) || id <= 0) return null
    const row = await em.getRepository(Announcement).findOne({ where: { id }, ...(lock ? { lock: { mode: 'pessimistic_read' as const } } : {}) })
    const employee = row ? await this.viewer(em, user) : null
    if (!row || !employee || !announcementLive(row, localDateOf(new Date()))) return null
    return this.inAudience(row, employee, user.role, await this.positionsFor(em, [row])) ? { row, employee } : null
  }

  /** الإعلانات السارية من الأرقام دي اللي الحساب في جمهورها دلوقتي — قايمة الإشعارات بتسأل بيها قبل ما تعرض «إعلان جديد» المخزّن */
  async liveIdsFor(user: JwtPayload, ids: number[]): Promise<Set<number>> {
    const live = new Set<number>(), em = this.ds.manager
    const wanted = [...new Set(ids.filter(id => Number.isSafeInteger(id) && id > 0))]
    if (!wanted.length || !(await announcementsReady(em))) return live
    const employee = await this.viewer(em, user)
    if (!employee) return live
    const today = localDateOf(new Date())
    const rows = (await em.getRepository(Announcement).find({ where: { id: In(wanted) } })).filter(row => announcementLive(row, today))
    const positions = await this.positionsFor(em, rows)
    for (const row of rows) if (this.inAudience(row, employee, user.role, positions)) live.add(row.id)
    return live
  }

  /**
   * «قريت» / «أقرّ بالقراءة»: الموظف لنفسه، لإعلان ساري هو في جمهوره. الحكم والتسجيل في معاملة واحدة وصف الإعلان مقفول قراءة:
   * سحب الإعلان بيستنى، فمفيش قراءة بتتسجّل لإعلان اتسحب بين الحكم والكتابة. مرة واحدة: الإدخال مشروط بعدم وجود الصف (والفهرس الفريد
   * وراه)، والمرة التانية بترجّع نفس الوقت.
   */
  async markRead(user: JwtPayload, id: number) {
    await this.assertReady()
    return this.ds.transaction(async em => {
      const seen = await this.liveFor(user, id, em, true)
      // إعلان مش للحساب ده (جمهور تاني، مسودة، مسحوب، منتهي) = نفس رد رقم مش موجود
      if (!seen) throw new NotFoundException(ANNOUNCEMENT_NOT_FOUND)
      await em.query(`INSERT INTO [announcement_reads] ([announcementId], [employeeId], [userId], [readAt])
        SELECT @0, @1, @2, @3
        WHERE NOT EXISTS (SELECT 1 FROM [announcement_reads] WITH (UPDLOCK, HOLDLOCK) WHERE [announcementId] = @0 AND [employeeId] = @1)`,
      // وقت القراءة بساعة التطبيق (زي الكيان): وقت بساعة القاعدة كان هيتقري في التقرير مزاح بفرق المنطقة
      [seen.row.id, seen.employee.id, user.sub, new Date()])
      const read = await em.getRepository(AnnouncementRead).findOneOrFail({ where: { announcementId: seen.row.id, employeeId: seen.employee.id } })
      return { read: true, readAt: read.readAt }
    })
  }

  // ===== الإدارة =====
  /** إعلان بيديره الحساب: جمهوره جوه نطاق فروعه. غير كده = نفس رد رقم مش موجود */
  private async managed(user: JwtPayload, id: number, em: EntityManager, lock = false): Promise<Announcement> {
    await this.assertReady(em)
    const row = Number.isSafeInteger(id) && id > 0
      ? await em.getRepository(Announcement).findOne({ where: { id }, ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}) }) : null
    if (!row || !announcementAudienceInScope(row.audience, branchScopeOf(user))) throw new NotFoundException(ANNOUNCEMENT_NOT_FOUND)
    return row
  }

  private manageView(row: Announcement, attachment: Attachment | null) {
    return { ...this.view(row, attachment), status: row.status, audience: parseRequestAudience(row.audience), createdAt: row.createdAt, publishedAt: row.publishedAt }
  }

  private async manageViewOf(em: EntityManager, row: Announcement) {
    return this.manageView(row, (await this.attachmentsOf(em, [row.id])).get(row.id) ?? null)
  }

  private fields(user: JwtPayload, input: AnnouncementInput, current: Announcement | null) {
    const today = localDateOf(new Date())
    const dates = announcementDates(input.publishDate !== undefined ? input.publishDate : day(current?.publishDate) ?? undefined,
      input.expiryDate !== undefined ? input.expiryDate : day(current?.expiryDate), today)
    const audience = input.audience !== undefined ? announcementAudienceJson(input.audience) : current?.audience ?? null
    // حساب الفروع بينشر لفروعه بس
    if (!announcementAudienceInScope(audience, branchScopeOf(user))) throw new ForbiddenException(ANNOUNCEMENT_BRANCH_AUDIENCE)
    for (const [name, value] of [['pinned', input.pinned], ['requiresRead', input.requiresRead]] as const) {
      if (value !== undefined && typeof value !== 'boolean') throw new BadRequestException(`${name} يقبل true أو false بس`)
    }
    return {
      title: input.title !== undefined || !current ? announcementTitle(input.title) : current.title,
      body: input.body !== undefined || !current ? announcementBody(input.body) : current.body,
      audience, ...dates,
      pinned: input.pinned !== undefined ? input.pinned === true : current?.pinned === true,
      requiresRead: input.requiresRead !== undefined ? input.requiresRead === true : current?.requiresRead === true,
    }
  }

  async list(user: JwtPayload) {
    if (!(await announcementsReady(this.ds.manager))) return { available: false, message: ANNOUNCEMENTS_MIGRATION_MISSING, items: [] }
    const scope = branchScopeOf(user)
    const rows = (await this.repo.find({ order: { id: 'DESC' }, take: 300 })).filter(row => announcementAudienceInScope(row.audience, scope))
    const attachments = await this.attachmentsOf(this.ds.manager, rows.map(row => row.id))
    // B-ADD.4: نسبة القراءة لكل إعلان منشور (جمهوره في نطاق القارئ دلوقتي، وقرا منهم كام) — «مين ماقراش» من تقرير الإعلان
    const stats = await this.readStats(this.ds.manager, rows.filter(row => row.status === 'PUBLISHED'), scope)
    return { available: true, message: null, items: rows.map(row => ({ ...this.manageView(row, attachments.get(row.id) ?? null), readStats: stats.get(row.id) ?? null })) }
  }

  async create(user: JwtPayload, input: AnnouncementInput) {
    await this.assertReady()
    const fields = this.fields(user, input, null)
    const attachment = announcementAttachmentInput(input.attachmentFileId)
    return this.ds.transaction(async em => {
      await assertAudienceTargets(em, fields.audience, 'جمهور الإعلان')
      const repo = em.getRepository(Announcement)
      const saved = await repo.save(repo.create({ ...fields, status: 'DRAFT', createdByUserId: user.sub, createdAt: new Date(), publishedAt: null }))
      if (attachment != null) await this.setAttachment(em, user, saved.id, attachment)
      await recordAudit(em, { category: 'SETTINGS', action: 'ANNOUNCEMENT_CREATED', entityType: 'announcement', entityId: saved.id, actorUserId: user.sub,
        branchId: user.branchId ?? null, summary: `إعلان جديد (مسودة): ${saved.title}`, after: { title: saved.title, audience: parseRequestAudience(saved.audience) } })
      return this.manageViewOf(em, saved)
    })
  }

  /** تعديل المسودة بس: الإعلان المنشور اتقري بنصه، فتغييره بسحب وإعلان جديد */
  async update(user: JwtPayload, id: number, input: AnnouncementInput) {
    return this.ds.transaction(async em => {
      const row = await this.managed(user, id, em, true)
      if (row.status !== 'DRAFT') throw new BadRequestException(ANNOUNCEMENT_NOT_DRAFT)
      const fields = this.fields(user, input, row)
      if (input.audience !== undefined) await assertAudienceTargets(em, fields.audience, 'جمهور الإعلان', row.audience)
      const attachment = announcementAttachmentInput(input.attachmentFileId)
      // بالحقول وبرقم الصف — مش حفظ الكيان كله (الصف مقفول من أول المعاملة)
      await em.getRepository(Announcement).update({ id: row.id }, fields)
      if (attachment !== undefined) await this.setAttachment(em, user, row.id, attachment)
      return this.manageViewOf(em, await em.getRepository(Announcement).findOneOrFail({ where: { id: row.id } }))
    })
  }

  /** النشر: المسودة بتبقى منشورة، وحدث «إعلان اتنشر» في نفس المعاملة لو تاريخ نشرها وصل (الإشعار لجمهورها) */
  async publish(user: JwtPayload, id: number) {
    return this.ds.transaction(async em => {
      const row = await this.managed(user, id, em, true)
      if (row.status !== 'DRAFT') throw new BadRequestException('الإعلان مش مسودة')
      const now = new Date(), today = localDateOf(now)
      await em.getRepository(Announcement).update({ id: row.id }, { status: 'PUBLISHED', publishedAt: now })
      if (String(day(row.publishDate)) <= today) {
        await recordOutboxEvent(em, { type: 'ANNOUNCEMENT_PUBLISHED', entityType: 'announcement', entityId: row.id, key: `announcement-published:${row.id}`,
          payload: { announcementId: row.id } })
      }
      await recordAudit(em, { category: 'SETTINGS', action: 'ANNOUNCEMENT_PUBLISHED', entityType: 'announcement', entityId: row.id, actorUserId: user.sub,
        branchId: user.branchId ?? null, summary: `نشر إعلان: ${row.title}`, after: { title: row.title, publishDate: day(row.publishDate), expiryDate: day(row.expiryDate),
          audience: parseRequestAudience(row.audience) } })
      return this.manageViewOf(em, await em.getRepository(Announcement).findOneOrFail({ where: { id: row.id } }))
    })
  }

  /** السحب: الإعلان المنشور بيختفي من اللوحة (والقراءات المتسجّلة بتفضل للتقرير) */
  async withdraw(user: JwtPayload, id: number) {
    return this.ds.transaction(async em => {
      const row = await this.managed(user, id, em, true)
      if (row.status !== 'PUBLISHED') throw new BadRequestException('الإعلان مش منشور')
      await em.getRepository(Announcement).update({ id: row.id }, { status: 'WITHDRAWN' })
      await recordAudit(em, { category: 'SETTINGS', action: 'ANNOUNCEMENT_WITHDRAWN', entityType: 'announcement', entityId: row.id, actorUserId: user.sub,
        branchId: user.branchId ?? null, summary: `سحب إعلان: ${row.title}` })
      return this.manageViewOf(em, await em.getRepository(Announcement).findOneOrFail({ where: { id: row.id } }))
    })
  }

  // ===== المرفق (B2.16-ب) =====
  /**
   * مرفق الإعلان (واحد): ملف رفعه نفس الحساب بتصنيف «announcement» ولسه مش مربوط — بيتربط بتحديث مشروط (مسودتين في نفس اللحظة: واحدة بس
   * بتاخده). null بيفك المرفق الحالي (بيرجع ملف مرفوع مش مربوط). المنادي ماسك قفل صف الإعلان، أو الصف لسه جديد جوه معاملته.
   */
  private async setAttachment(em: EntityManager, user: JwtPayload, announcementId: number, fileId: number | null) {
    const current: Array<{ id: number }> = await em.query(`SELECT [id] FROM [stored_files] WHERE [entityType] = N'announcement' AND [entityId] = @0`, [announcementId])
    if (fileId !== null && current.some(row => Number(row.id) === fileId)) return
    if (current.length) await em.query(`UPDATE [stored_files] SET [entityId] = NULL WHERE [entityType] = N'announcement' AND [entityId] = @0`, [announcementId])
    if (fileId === null) return
    const bound: unknown[] = await em.query(`UPDATE [stored_files] SET [entityId] = @0 OUTPUT INSERTED.[id]
      WHERE [id] = @1 AND [entityType] = N'announcement' AND [entityId] IS NULL AND [uploadedBy] = @2`, [announcementId, fileId, user.sub])
    if (!bound.length) throw new BadRequestException(ANNOUNCEMENT_ATTACHMENT_INVALID)
  }

  /** رفع مرفق إعلان (/files/upload): لصاحب صلاحية الإدارة، والموديول مفتوح له */
  async assertCanUpload(user: JwtPayload) {
    if (!userHasPerm(user, 'announcements.manage') || !(await this.modules.allowedFor('announcements', user))) throw new ForbiddenException(ANNOUNCEMENT_UPLOAD_RULE)
  }

  /**
   * تحميل مرفق إعلان (/files/:id) بحكم الإعلان نفسه دايمًا، حتى لرافعه (نطاق حسابه ممكن يتغيّر بعد ما رفع): اللي بيدير الإعلان (صلاحيته،
   * وجمهور الإعلان جوه نطاقه)، أو موظف الإعلان ساري له وهو في جمهوره. قبل الربط: لرافعه بس وبصلاحيته دلوقتي. غير كده نفس رد الملف الغايب.
   */
  async assertFileAccess(user: JwtPayload, file: Pick<StoredFile, 'id' | 'uploadedBy' | 'entityId'>) {
    const missing = new NotFoundException(ANNOUNCEMENT_FILE_NOT_FOUND)
    if (!(await this.modules.allowedFor('announcements', user))) throw missing
    const manages = userHasPerm(user, 'announcements.manage')
    if (!file.entityId) {
      if (manages && !!user.sub && file.uploadedBy === user.sub) return
      throw missing
    }
    const em = this.ds.manager
    const row = (await announcementsReady(em)) ? await em.getRepository(Announcement).findOne({ where: { id: file.entityId } }) : null
    if (!row) throw missing
    if (manages && announcementAudienceInScope(row.audience, branchScopeOf(user))) return
    if (!(await this.liveFor(user, row.id))) throw missing
  }

  // ===== المناسبات (الميزة الفرعية announcements.occasions — B2.16-ب) =====
  /** زمايل فرع موظف الحساب الحاليين اللي عيد ميلادهم أو ذكرى تعيينهم النهارده أو خلال أيام — باليوم والشهر بس، من غير سنة الميلاد */
  async occasions(user: JwtPayload) {
    const em = this.ds.manager, today = localDateOf(new Date())
    const employee = await this.viewer(em, user)
    if (!employee?.branchId) return occasionsOf([], today)
    const colleagues = await em.getRepository(Employee).find({ where: { branchId: employee.branchId, isActive: true },
      select: { id: true, fullName: true, birthDate: true, joinDate: true, status: true, isActive: true }, order: { id: 'ASC' } })
    return occasionsOf(colleagues.filter(row => isCurrentEmployee(row)), today)
  }

  /** الموظفين الحاليين في نطاق فروع القارئ (كل الفروع لو null) وحساباتهم المفعّلة ودور كل واحد — قراءة واحدة لأي عدد إعلانات */
  private async audiencePool(em: EntityManager, scope: BranchScope) {
    const employees = scope !== null && !scope.length ? [] : await em.getRepository(Employee).find({
      where: { isActive: true, ...(scope === null ? {} : { branchId: branchIdIn(scope) }) },
      select: { id: true, employeeCode: true, fullName: true, branchId: true, departmentId: true, teamId: true, status: true, isActive: true }, order: { id: 'ASC' } })
    const current = employees.filter(employee => isCurrentEmployee(employee))
    const accounts: User[] = []
    const ids = current.map(employee => employee.id)
    for (let offset = 0; offset < ids.length; offset += 1000) {
      accounts.push(...await em.getRepository(User).find({ where: { employeeId: In(ids.slice(offset, offset + 1000)), isActive: true } }))
    }
    const roles = new Map<number, string>()
    for (const account of accounts) if (!roles.has(account.employeeId!)) roles.set(account.employeeId!, account.role)
    return { current, accounts, roles }
  }

  /** موظفين الجمهور الحاليين في نطاق فروع القارئ (كل الفروع لو null)، ومعاهم دور حساب كل واحد */
  private async audienceMembers(em: EntityManager, row: Announcement, scope: BranchScope) {
    const { current, accounts, roles } = await this.audiencePool(em, scope)
    const positions = await this.positionsFor(em, [row])
    const members = current.filter(employee => this.inAudience(row, employee, roles.get(employee.id), positions))
    const inAudience = new Set(members.map(member => member.id))
    return { members, accounts: accounts.filter(account => inAudience.has(account.employeeId!)) }
  }

  /**
   * B-ADD.4: لكل إعلان — جمهوره الحالي في نطاق القارئ وعدد اللي قروا منهم (نفس حساب تقرير الإعلان الواحد). الموظفين والحسابات بيتقروا
   * مرة واحدة لكل الإعلانات، والقراءات باستعلام واحد.
   */
  private async readStats(em: EntityManager, rows: Announcement[], scope: BranchScope): Promise<Map<number, { audience: number; read: number }>> {
    const stats = new Map<number, { audience: number; read: number }>()
    if (!rows.length) return stats
    const { current, roles } = await this.audiencePool(em, scope)
    const org = await this.positionsFor(em, rows)
    const readers = new Map<number, Set<number>>()
    const ids = rows.map(row => row.id)
    for (let offset = 0; offset < ids.length; offset += 1000) {
      for (const read of await em.getRepository(AnnouncementRead).find({ where: { announcementId: In(ids.slice(offset, offset + 1000)) }, select: { id: true, announcementId: true, employeeId: true } })) {
        if (!readers.has(read.announcementId)) readers.set(read.announcementId, new Set())
        readers.get(read.announcementId)!.add(read.employeeId)
      }
    }
    for (const row of rows) {
      const members = current.filter(employee => this.inAudience(row, employee, roles.get(employee.id), org))
      const seen = readers.get(row.id)
      stats.set(row.id, { audience: members.length, read: seen ? members.filter(member => seen.has(member.id)).length : 0 })
    }
    return stats
  }

  /** تقرير القراءة: موظفين جمهور الإعلان اللي في نطاق القارئ — مين قرا وإمتى، ومين لسه */
  async report(user: JwtPayload, id: number) {
    const em = this.ds.manager
    const row = await this.managed(user, id, em)
    const { members } = await this.audienceMembers(em, row, branchScopeOf(user))
    const reads = members.length ? await em.getRepository(AnnouncementRead).find({ where: { announcementId: row.id } }) : []
    const readAt = new Map(reads.map(read => [read.employeeId, read.readAt]))
    const branches = new Map((await em.getRepository(Branch).find({ select: { id: true, name: true } })).map(branch => [branch.id, branch.name]))
    const rows = members.map(member => ({ employeeId: member.id, employeeCode: member.employeeCode, fullName: member.fullName,
      branchName: branches.get(member.branchId) ?? null, readAt: readAt.get(member.id) ?? null }))
    return { announcement: await this.manageViewOf(em, row), summary: { audience: rows.length, read: rows.filter(item => item.readAt !== null).length }, rows }
  }

  /** حسابات جمهور الإعلان الساري (لمحرك الإشعارات): الحسابات المفعّلة لموظفين الجمهور الحاليين في كل الفروع */
  async liveAudienceAccounts(id: number): Promise<{ row: Announcement; accounts: User[] } | null> {
    const em = this.ds.manager
    if (!(await announcementsReady(em))) return null
    const row = await em.getRepository(Announcement).findOne({ where: { id } })
    if (!row || !announcementLive(row, localDateOf(new Date()))) return null
    return { row, accounts: (await this.audienceMembers(em, row, null)).accounts }
  }
}
