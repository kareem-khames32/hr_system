import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, In, type EntityManager } from 'typeorm'
import { auditRequestContext, recordAudit } from '../audit/audit'
import type { JwtPayload } from '../auth/auth.service'
import { branchIdIn, branchScopeOf, userHasPerm, type BranchScope } from '../auth/guards'
import { User } from '../auth/user.entity'
import { Employee } from '../employees/employee.entity'
import { fileStorage } from '../files/storage'
import { sha256OfStream } from '../files/stored-file-hash'
import { StoredFile } from '../files/stored-file.entity'
import { Branch } from '../org/entities/branch.entity'
import { Department } from '../org/entities/department.entity'
import { Team } from '../org/entities/team.entity'
import { AUDIENCE_WHERE_MODES, AUDIENCE_WHO_MODES, audienceNeedsPositions, parseRequestAudience, requestAudienceAllows,
  type AudiencePositions, type AudienceSubject } from '../requests/request-audience'
import { PolicyGate } from './policy-gate'
import { Policy, PolicyAcknowledgement, PolicyVersion } from './policy.entities'
import { currentPolicyVersion, isPolicyDate, policyAckState, policyContentHash, policyLocalDate, policySchemaReady, upcomingPolicyVersion,
  POLICY_AUDIENCE_MAX, POLICY_BODY_MAX, POLICY_FILE_MISMATCH, POLICY_GRACE_MAX, POLICY_MIGRATION_MISSING, POLICY_NOT_FOUND, type PolicyAckState,
  type PolicyVersionFacts } from './policy-rules'

export interface PolicyInput {
  title?: string
  category?: string | null
  /** «مين + فين» بشكل جمهور نوع الطلب — null = كل الموظفين */
  audience?: unknown
  isMandatory?: boolean
  graceDays?: number
}

export interface PolicyVersionInput {
  /** المحتوى: نص، أو ملف PDF مرفوع (واحد منهم بس) */
  bodyText?: string | null
  fileId?: number | null
  effectiveDate: string
  /** تغيير جوهري = الكل يقرّ من جديد (أول نسخة جوهرية دايمًا) */
  isMaterial?: boolean
}

/** نسخة من غير نصها (القوايم والحساب مابيحمّلوش النص) */
type VersionRow = PolicyVersionFacts & { fileId: number | null; hasText: boolean; publishedAt: Date }
type PolicyWithVersions = { policy: Policy; versions: VersionRow[] }
type OrgPositions = { departmentManagers: Set<number>; teamLeaders: Set<number>; branchManagers: Set<number> }
type AudienceEmployee = Pick<Employee, 'id' | 'employeeCode' | 'fullName' | 'branchId' | 'departmentId' | 'teamId' | 'joinDate'>
/** موظفين (شغالين، في نطاق) ومعاهم اللي المقيّم محتاجه: دور حساب كل واحد ومنصبه في الهيكل */
type AudiencePool = { employees: AudienceEmployee[]; roles: Map<number, string>; positions: OrgPositions | null }

const COMPANY_SCOPE_ONLY = 'إدارة السياسات لحساب نطاقه كل الفروع — السياسة بتسري على الشركة كلها'
const VERSION_COLUMNS = `v.[id], v.[policyId], v.[versionNo], CONVERT(nvarchar(10), v.[effectiveDate], 23) AS [effectiveDate], v.[isMaterial], v.[contentHash], v.[fileId],
  CASE WHEN v.[bodyText] IS NULL THEN 0 ELSE 1 END AS [hasText], v.[publishedAt]`
const sqlErrorNumber = (error: unknown): number | undefined => {
  const value = error as { number?: unknown; driverError?: { number?: unknown } } | null
  const number = Number(value?.driverError?.number ?? value?.number)
  return Number.isFinite(number) ? number : undefined
}

/**
 * B2.7-أ: مكتبة السياسات والإقرار. الإدارة (سياسة، نشر نسخة، سحب) لصاحب «إدارة السياسات» ونطاقه كل الفروع. الموظف بيقرا السياسات اللي
 * في جمهوره ويقرّ لنفسه بس. والتقرير لموظفي نطاق القارئ. حكم «مين عليه إيه» في مكان واحد (statesFor)، والبوابة بتقرا منه.
 */
@Injectable()
export class PoliciesService {
  constructor(@InjectDataSource() private readonly ds: DataSource, private readonly gate: PolicyGate) {
    gate.bind(user => this.overdueFor(user))
  }

  private manages(user: JwtPayload) { return userHasPerm(user, 'policies.manage') }
  private reads(user: JwtPayload) { return this.manages(user) || userHasPerm(user, 'policies.report') }

  private assertCompanyManager(user: JwtPayload) {
    if (branchScopeOf(user) !== null) throw new ForbiddenException(COMPANY_SCOPE_ONLY)
  }

  private async assertReady(em: EntityManager) {
    if (!(await policySchemaReady(em))) throw new BadRequestException(POLICY_MIGRATION_MISSING)
  }

  // ===== المدخلات =====
  private titleOf(value: unknown): string {
    const title = typeof value === 'string' ? value.trim() : ''
    if (title.length < 2 || title.length > 200) throw new BadRequestException('عنوان السياسة من حرفين لـ200 حرف')
    return title
  }

  private categoryOf(value: unknown): string | null {
    const category = typeof value === 'string' ? value.trim() : ''
    if (category.length > 100) throw new BadRequestException('فئة السياسة بحد أقصى 100 حرف')
    return category || null
  }

  private graceOf(value: unknown): number {
    const days = Number(value)
    if (!Number.isInteger(days) || days < 0 || days > POLICY_GRACE_MAX) throw new BadRequestException(`مهلة السماح من صفر لـ${POLICY_GRACE_MAX} يوم`)
    return days
  }

  /** الجمهور بنفس شكل جمهور نوع الطلب (request-audience.ts). «الكل» في «كل الشركة» = من غير جمهور */
  private audienceJson(audience: unknown): string | null {
    if (audience === null || audience === undefined) return null
    if (typeof audience !== 'object' || Array.isArray(audience)) throw new BadRequestException('جمهور السياسة بصيغة غير صحيحة')
    const value = audience as { mode?: unknown; ids?: unknown; where?: { mode?: unknown; ids?: unknown } | null }
    const mode = String(value.mode ?? 'all')
    if (!(AUDIENCE_WHO_MODES as readonly string[]).includes(mode)) throw new BadRequestException('اختيار «مين» في جمهور السياسة غير معروف')
    // الاختيارات مرتّبة ومن غير تكرار: نفس الجمهور بترتيب تاني مايتحسبش «جمهور اتغيّر» (اللي بيبدأ المهلة من جديد للكل)
    const ids = [...new Set(Array.isArray(value.ids) ? value.ids.map(String).filter(Boolean) : [])].sort()
    const whereMode = String(value.where?.mode ?? 'company')
    if (!(AUDIENCE_WHERE_MODES as readonly string[]).includes(whereMode)) throw new BadRequestException('اختيار «فين» في جمهور السياسة غير معروف')
    const whereIds = [...new Set(Array.isArray(value.where?.ids) ? value.where!.ids.map(Number).filter(id => Number.isSafeInteger(id) && id > 0) : [])].sort((a, b) => a - b)
    if (mode !== 'all' && ids.length === 0) throw new BadRequestException('اختار مين السياسة عليهم، أو خلّيها «الكل»')
    // «فين» من غير اختيار كان هيتقري «كل الشركة»: سياسة إلزامية كانت هتقفل الشركة كلها بدل المكان المقصود
    if (whereMode !== 'company' && whereIds.length === 0) throw new BadRequestException('اختار الفروع أو الأقسام أو الفرق، أو خلّيها «كل الشركة»')
    if (mode === 'all' && whereMode === 'company') return null
    const json = JSON.stringify({ mode, ids, where: whereMode === 'company' ? null : { mode: whereMode, ids: whereIds } })
    if (json.length > POLICY_AUDIENCE_MAX) throw new BadRequestException('جمهور السياسة أطول من المسموح — اختار بالدور أو المنصب أو الفرع بدل أسماء كتير')
    return json
  }

  // ===== القراءة المشتركة =====
  private async versionsOf(em: EntityManager, policyIds: readonly number[]): Promise<Map<number, VersionRow[]>> {
    const out = new Map<number, VersionRow[]>()
    for (let offset = 0; offset < policyIds.length; offset += 1000) {
      const part = policyIds.slice(offset, offset + 1000)
      const rows: Array<Record<string, unknown>> = await em.query(
        `SELECT ${VERSION_COLUMNS} FROM [policy_versions] v WHERE v.[policyId] IN (${part.map((_, index) => `@${index}`).join(', ')}) ORDER BY v.[versionNo]`, [...part])
      for (const row of rows) {
        const version: VersionRow = { id: Number(row.id), policyId: Number(row.policyId), versionNo: Number(row.versionNo), effectiveDate: String(row.effectiveDate),
          isMaterial: !!row.isMaterial, contentHash: String(row.contentHash), fileId: row.fileId == null ? null : Number(row.fileId), hasText: Number(row.hasText) === 1,
          publishedAt: row.publishedAt as Date }
        out.set(version.policyId, [...(out.get(version.policyId) ?? []), version])
      }
    }
    return out
  }

  private async withVersions(em: EntityManager, policies: Policy[]): Promise<PolicyWithVersions[]> {
    const versions = await this.versionsOf(em, policies.map(policy => policy.id))
    return policies.map(policy => ({ policy, versions: versions.get(policy.id) ?? [] }))
  }

  /** مين مدير قسم أو قائد فريق أو مدير فرع — لجمهور «حسب المنصب» */
  private async orgPositions(em: EntityManager): Promise<OrgPositions> {
    const [departments, teams, branches] = await Promise.all([
      em.getRepository(Department).find({ select: { id: true, managerEmployeeId: true } }),
      em.getRepository(Team).find({ select: { id: true, leaderEmployeeId: true } }),
      em.getRepository(Branch).find({ select: { id: true, managerEmployeeId: true } }),
    ])
    const ids = (values: Array<number | null | undefined>) => new Set(values.filter((value): value is number => !!value))
    return { departmentManagers: ids(departments.map(row => row.managerEmployeeId)), teamLeaders: ids(teams.map(row => row.leaderEmployeeId)),
      branchManagers: ids(branches.map(row => row.managerEmployeeId)) }
  }

  private positionsOf(index: OrgPositions | null, employeeId: number): AudiencePositions {
    return index ? { departmentManager: index.departmentManagers.has(employeeId), teamLeader: index.teamLeaders.has(employeeId), branchManager: index.branchManagers.has(employeeId) } : {}
  }

  /**
   * الموظف قدام المقيّم: بملفه (قسم، فريق، فرع، منصب) وبدور حسابه. من غير صلاحيات، ودور مدير النظام مش دور وظيفي: المقيّم بيعدّي
   * مدير النظام في أي جمهور (معناها هناك «يقدر يقدّم»)، وهنا السؤال «مين عليه يقرّ»، فمدير النظام عليه اللي على موظفه بس.
   */
  private subjectOf(employee: Pick<Employee, 'id' | 'departmentId' | 'teamId' | 'branchId'>, role: string | null | undefined, positions: AudiencePositions): AudienceSubject {
    return { role: role && role !== 'super_admin' ? role : null, permissions: [], employeeId: employee.id, departmentId: employee.departmentId ?? null,
      teamId: employee.teamId ?? null, branchId: employee.branchId ?? null, positions }
  }

  /** الموظف ده في جمهور السياسة؟ */
  private inAudience(policy: Policy, employee: AudienceEmployee, pool: AudiencePool): boolean {
    return requestAudienceAllows(policy.audience, this.subjectOf(employee, pool.roles.get(employee.id), this.positionsOf(pool.positions, employee.id)), 'submit')
  }

  /** الموظفين الشغالين في نطاق القارئ، باللي المقيّم محتاجه للسياسات دي */
  private async audiencePool(em: EntityManager, scope: BranchScope, policies: readonly Policy[]): Promise<AudiencePool> {
    const employees = scope !== null && !scope.length ? [] : await em.getRepository(Employee).find({
      where: { isActive: true, ...(scope === null ? {} : { branchId: branchIdIn(scope) }) },
      select: { id: true, employeeCode: true, fullName: true, branchId: true, departmentId: true, teamId: true, joinDate: true }, order: { id: 'ASC' } })
    const roles = new Map<number, string>()
    const ids = employees.map(employee => employee.id)
    for (let offset = 0; offset < ids.length; offset += 1000) {
      for (const account of await em.getRepository(User).find({ where: { employeeId: In(ids.slice(offset, offset + 1000)), isActive: true }, select: { id: true, employeeId: true, role: true } })) {
        if (!roles.has(account.employeeId!)) roles.set(account.employeeId!, account.role)
      }
    }
    return { employees, roles, positions: policies.some(policy => audienceNeedsPositions(policy.audience)) ? await this.orgPositions(em) : null }
  }

  /**
   * السياسات اللي القارئ يشوفها من شاشات الإدارة والتقرير: حساب كل الفروع = الكل؛ وحساب الفروع = السياسات اللي ليها موظف واحد على الأقل
   * في نطاقه من جمهورها. سياسة مالهاش حد في نطاقه = نفس رد اللي مش موجودة.
   */
  private async visibleTo(em: EntityManager, user: JwtPayload, policies: Policy[]): Promise<Policy[]> {
    const scope = branchScopeOf(user)
    if (scope === null || !policies.length) return policies
    const pool = await this.audiencePool(em, scope, policies)
    return policies.filter(policy => pool.employees.some(employee => this.inAudience(policy, employee, pool)))
  }

  private async readablePolicy(em: EntityManager, user: JwtPayload, id: number): Promise<Policy> {
    if (!this.reads(user)) throw new ForbiddenException('لا تملك صلاحية عرض السياسات')
    const policy = (await policySchemaReady(em)) && Number.isSafeInteger(id) && id > 0 ? await em.getRepository(Policy).findOne({ where: { id } }) : null
    if (!policy || !(await this.visibleTo(em, user, [policy])).length) throw new NotFoundException(POLICY_NOT_FOUND)
    return policy
  }

  /**
   * السياسات المنشورة اللي الموظف صاحب الحساب في جمهورها وليها نسخة سارية، وحالته مع كل واحدة. ده الحكم الواحد: «سياساتي» و«اللي
   * مستنيني» والإقرار والبوابة بيقروا منه.
   */
  private async statesFor(em: EntityManager, user: JwtPayload, onlyMandatory = false) {
    const today = policyLocalDate(new Date())
    if (!user.employeeId || !(await policySchemaReady(em))) return { today, items: [] }
    const employee = await em.getRepository(Employee).findOne({ where: { id: user.employeeId },
      select: { id: true, departmentId: true, teamId: true, branchId: true, joinDate: true } })
    if (!employee) return { today, items: [] }
    const published = await this.withVersions(em, await em.getRepository(Policy).find({
      where: { status: 'PUBLISHED', ...(onlyMandatory ? { isMandatory: true } : {}) }, order: { id: 'ASC' } }))
    const positions = published.some(item => audienceNeedsPositions(item.policy.audience)) ? this.positionsOf(await this.orgPositions(em), employee.id) : {}
    const subject = this.subjectOf(employee, user.role, positions)
    const applicable = published.filter(item => requestAudienceAllows(item.policy.audience, subject, 'submit') && currentPolicyVersion(item.versions, today))
    const acknowledged = new Map<number, Array<{ versionId: number; acknowledgedAt: Date }>>()
    if (applicable.length) {
      const rows = await em.getRepository(PolicyAcknowledgement).find({ where: { employeeId: employee.id, policyId: In(applicable.map(item => item.policy.id)) },
        select: { id: true, policyId: true, versionId: true, acknowledgedAt: true } })
      for (const row of rows) acknowledged.set(row.policyId, [...(acknowledged.get(row.policyId) ?? []), row])
    }
    const items = applicable.map(({ policy, versions }) => {
      const numberOf = new Map(versions.map(version => [version.id, version.versionNo]))
      const mine = (acknowledged.get(policy.id) ?? []).map(row => ({ versionNo: numberOf.get(row.versionId) ?? 0, acknowledgedAt: row.acknowledgedAt }))
        .sort((a, b) => b.versionNo - a.versionNo)
      const verdict = policyAckState(versions, mine.map(row => row.versionNo), employee.joinDate, policy.graceDays, today, !!policy.isMandatory, policy.graceFrom)!
      return { policy, versions, current: currentPolicyVersion(versions, today)!, state: verdict.state, lockDate: verdict.lockDate, acknowledged: mine[0] ?? null }
    })
    return { today, items }
  }

  /** الحساب عليه سياسة إلزامية عدّت مهلتها؟ (البوابة) */
  private async overdueFor(user: JwtPayload): Promise<boolean> {
    return (await this.statesFor(this.ds.manager, user, true)).items.some(item => item.state === 'OVERDUE')
  }

  private versionView(version: VersionRow) {
    return { id: version.id, versionNo: version.versionNo, effectiveDate: version.effectiveDate, isMaterial: version.isMaterial, kind: version.fileId != null ? 'FILE' as const : 'TEXT' as const,
      contentHash: version.contentHash, publishedAt: version.publishedAt }
  }

  private policyView(policy: Policy, canManage: boolean) {
    return { id: policy.id, title: policy.title, category: policy.category ?? null, isMandatory: !!policy.isMandatory, graceDays: policy.graceDays, status: policy.status,
      // الجمهور نفسه لمدير السياسات بس (فيه أرقام فروع وموظفين)
      audience: canManage ? parseRequestAudience(policy.audience) : null }
  }

  // ===== الإدارة =====
  /** السياسات لصاحب «إدارة السياسات» أو «تقرير الإقرارات»: حساب كل الفروع بيشوف الكل، وحساب الفروع اللي ليها حد في نطاقه بس */
  async list(user: JwtPayload) {
    if (!this.reads(user)) throw new ForbiddenException('لا تملك صلاحية عرض السياسات')
    const em = this.ds.manager
    const canManage = this.manages(user) && branchScopeOf(user) === null
    if (!(await policySchemaReady(em))) return { available: false, canManage, policies: [] }
    const today = policyLocalDate(new Date())
    const policies = await this.withVersions(em, await this.visibleTo(em, user, await em.getRepository(Policy).find({ order: { id: 'DESC' } })))
    return { available: true, canManage, policies: policies.map(({ policy, versions }) => {
      const current = currentPolicyVersion(versions, today), upcoming = upcomingPolicyVersion(versions, today)
      return { ...this.policyView(policy, canManage), createdAt: policy.createdAt, withdrawnAt: policy.withdrawnAt ?? null,
        current: current ? this.versionView(current) : null,
        // أول نسخة منشورة لسه تاريخ سريانها ماجاش
        upcoming: upcoming ? this.versionView(upcoming) : null, versions: versions.length }
    }) }
  }

  /** سياسة بكل نسخها (من غير النصوص) — لشاشة الإدارة والتقرير */
  async detail(user: JwtPayload, id: number) {
    const em = this.ds.manager
    const policy = await this.readablePolicy(em, user, id)
    const versions = (await this.versionsOf(em, [policy.id])).get(policy.id) ?? []
    return { ...this.policyView(policy, this.manages(user) && branchScopeOf(user) === null), versions: [...versions].reverse().map(version => this.versionView(version)) }
  }

  async create(user: JwtPayload, input: PolicyInput) {
    this.assertCompanyManager(user)
    const row = { title: this.titleOf(input.title), category: this.categoryOf(input.category), audience: this.audienceJson(input.audience),
      isMandatory: input.isMandatory === true, graceDays: this.graceOf(input.graceDays ?? 0) }
    return this.ds.transaction(async em => {
      await this.assertReady(em)
      const repo = em.getRepository(Policy)
      const saved = await repo.save(repo.create({ ...row, graceFrom: null, status: 'DRAFT', createdByUserId: user.sub, createdAt: new Date(), withdrawnAt: null, withdrawnByUserId: null }))
      await recordAudit(em, { category: 'SETTINGS', action: 'POLICY_CREATED', entityType: 'policy', entityId: saved.id, actorUserId: user.sub,
        summary: `سياسة جديدة: ${saved.title}`, after: { ...row, audience: parseRequestAudience(row.audience) } })
      return { id: saved.id }
    })
  }

  /**
   * بيانات السياسة (مش محتواها): الجمهور والإلزام والمهلة، والعنوان والفئة قبل النشر بس (بعد النشر هما جزء من اللي الموظفين أقرّوا بيه).
   * المحتوى نفسه بيتغيّر بنسخة جديدة بس. ولو السياسة بقت إلزامية أو جمهورها اتغيّر، المهلة بتتحسب من النهارده.
   */
  async update(user: JwtPayload, id: number, input: PolicyInput) {
    this.assertCompanyManager(user)
    const changed = await this.ds.transaction(async em => {
      await this.assertReady(em)
      const repo = em.getRepository(Policy)
      const policy = await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!policy) throw new NotFoundException(POLICY_NOT_FOUND)
      if (policy.status === 'WITHDRAWN') throw new BadRequestException('السياسة مسحوبة ومابتتعدلش')
      const before = { title: policy.title, category: policy.category ?? null, audience: parseRequestAudience(policy.audience), isMandatory: !!policy.isMandatory, graceDays: policy.graceDays }
      if (input.title !== undefined) {
        const title = this.titleOf(input.title)
        if (title !== policy.title && policy.status !== 'DRAFT') throw new BadRequestException('عنوان السياسة مابيتغيّرش بعد النشر — اسحبها واعمل سياسة جديدة بالعنوان الصح')
        policy.title = title
      }
      if (input.category !== undefined) {
        const category = this.categoryOf(input.category)
        // الفئة بتتعرض جنب العنوان في شاشة الإقرار: زيها زيه بعد النشر
        if (category !== (policy.category ?? null) && policy.status !== 'DRAFT') throw new BadRequestException('فئة السياسة مابتتغيّرش بعد النشر — اسحبها واعمل سياسة جديدة بالفئة الصح')
        policy.category = category
      }
      if (input.audience !== undefined) policy.audience = this.audienceJson(input.audience)
      if (input.isMandatory !== undefined) policy.isMandatory = input.isMandatory === true
      if (input.graceDays !== undefined) policy.graceDays = this.graceOf(input.graceDays)
      const after = { title: policy.title, category: policy.category ?? null, audience: parseRequestAudience(policy.audience), isMandatory: !!policy.isMandatory, graceDays: policy.graceDays }
      if (JSON.stringify(before) === JSON.stringify(after)) return false
      // إلزام بدأ النهارده (السياسة بقت إلزامية، أو جمهورها اتغيّر): المهلة من النهارده، مش من سريان نسخة قديمة. (للمسودة مالوش أثر: أول
      // نسخة سريانها من النهارده أو بعده)
      if ((after.isMandatory && !before.isMandatory) || JSON.stringify(before.audience) !== JSON.stringify(after.audience)) {
        policy.graceFrom = policyLocalDate(new Date())
      }
      await repo.save(policy)
      await recordAudit(em, { category: 'SETTINGS', action: 'POLICY_UPDATED', entityType: 'policy', entityId: policy.id, actorUserId: user.sub,
        summary: `تعديل بيانات سياسة: ${policy.title}`, before, after })
      return true
    })
    if (changed) await this.gate.changed()
    return { id }
  }

  /**
   * نشر نسخة: المحتوى بيتكتب مرة واحدة ببصمته ومابيتعدلش بعدها. تاريخ السريان من النهارده أو بعده، ومش قبل سريان النسخة اللي قبلها.
   */
  async publish(user: JwtPayload, id: number, input: PolicyVersionInput) {
    this.assertCompanyManager(user)
    const today = policyLocalDate(new Date())
    if (!isPolicyDate(input.effectiveDate)) throw new BadRequestException('تاريخ السريان بصيغة YYYY-MM-DD')
    if (input.effectiveDate < today) throw new BadRequestException('تاريخ السريان من النهارده أو بعده')
    const bodyText = typeof input.bodyText === 'string' && input.bodyText.trim() ? input.bodyText.replace(/\r\n/g, '\n').trim() : null
    const fileId = input.fileId == null ? null : Number(input.fileId)
    if ((bodyText === null) === (fileId === null)) throw new BadRequestException('محتوى النسخة: نص، أو ملف PDF — واحد منهم بس')
    if (bodyText !== null && bodyText.length > POLICY_BODY_MAX) throw new BadRequestException(`نص السياسة بحد أقصى ${POLICY_BODY_MAX} حرف — الأطول يترفع ملف PDF`)
    const saved = await this.ds.transaction(async em => {
      await this.assertReady(em)
      const policy = await em.getRepository(Policy).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!policy) throw new NotFoundException(POLICY_NOT_FOUND)
      if (policy.status === 'WITHDRAWN') throw new BadRequestException('السياسة مسحوبة — اعمل سياسة جديدة')
      const versions = (await this.versionsOf(em, [policy.id])).get(policy.id) ?? []
      const previous = versions[versions.length - 1] ?? null
      if (previous && input.effectiveDate < previous.effectiveDate) throw new BadRequestException('تاريخ السريان قبل سريان النسخة اللي قبلها')
      const contentHash = bodyText !== null ? policyContentHash(bodyText) : await this.uploadedFileHash(em, fileId!)
      const repo = em.getRepository(PolicyVersion)
      const version = await repo.save(repo.create({ policyId: policy.id, versionNo: (previous?.versionNo ?? 0) + 1, bodyText, fileId, contentHash, effectiveDate: input.effectiveDate,
        // أول نسخة جوهرية دايمًا: هي اللي بتبدأ الالتزام
        isMaterial: !previous || input.isMaterial === true, publishedAt: new Date(), publishedByUserId: user.sub }))
      if (policy.status !== 'PUBLISHED') await em.getRepository(Policy).update({ id: policy.id }, { status: 'PUBLISHED' })
      await recordAudit(em, { category: 'SETTINGS', action: 'POLICY_VERSION_PUBLISHED', entityType: 'policy', entityId: policy.id, actorUserId: user.sub,
        summary: `نشر النسخة ${version.versionNo} من سياسة: ${policy.title}`,
        after: { versionId: version.id, versionNo: version.versionNo, effectiveDate: input.effectiveDate, isMaterial: version.isMaterial, kind: fileId !== null ? 'FILE' : 'TEXT', contentHash } })
      return { id: version.id, versionNo: version.versionNo, contentHash }
    })
    await this.gate.changed()
    return saved
  }

  /** صف الملف ده PDF مرفوع بتصنيف «policy»؟ */
  private isPolicyPdf(file: StoredFile | null): file is StoredFile {
    return !!file && file.entityType === 'policy' && file.mime === 'application/pdf'
  }

  /** بصمة الملف المرفوع للنشر (بتتحسب من التخزين بالتدفق، من غير تحميل الملف كله في الذاكرة) */
  private async uploadedFileHash(em: EntityManager, fileId: number): Promise<string> {
    const file = Number.isSafeInteger(fileId) && fileId > 0 ? await em.getRepository(StoredFile).findOne({ where: { id: fileId } }) : null
    if (!this.isPolicyPdf(file)) throw new BadRequestException('ملف السياسة لازم يكون PDF مرفوع من شاشة السياسات')
    const storage = fileStorage()
    if (!(await storage.exists(file.storedName))) throw new BadRequestException('ملف السياسة مش موجود على التخزين — ارفعه تاني')
    return (await sha256OfStream(storage.read(file.storedName))).sha256
  }

  /** سحب السياسة: مابتقفلش حد بعدها ومابتظهرش للموظفين، وإقراراتها ونسخها بتفضل */
  async withdraw(user: JwtPayload, id: number) {
    this.assertCompanyManager(user)
    await this.ds.transaction(async em => {
      await this.assertReady(em)
      const repo = em.getRepository(Policy)
      const policy = await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!policy) throw new NotFoundException(POLICY_NOT_FOUND)
      if (policy.status === 'WITHDRAWN') throw new BadRequestException('السياسة مسحوبة فعلًا')
      await repo.update({ id }, { status: 'WITHDRAWN', withdrawnAt: new Date(), withdrawnByUserId: user.sub })
      await recordAudit(em, { category: 'SETTINGS', action: 'POLICY_WITHDRAWN', entityType: 'policy', entityId: id, actorUserId: user.sub, summary: `سحب سياسة: ${policy.title}` })
    })
    await this.gate.changed()
    return { id }
  }

  /**
   * تقرير «مين أقرّ ومين لسه»: موظفين الجمهور الشغالين اللي في نطاق القارئ، وحالة كل واحد مع النسخة السارية. اللي برّه نطاق القارئ
   * مابيظهرش ولا بيتعدّ؛ وسياسة مالهاش حد في نطاقه = نفس رد اللي مش موجودة.
   */
  async report(user: JwtPayload, id: number) {
    if (!this.reads(user)) throw new ForbiddenException('لا تملك صلاحية تقرير الإقرارات')
    const em = this.ds.manager
    const policy = (await policySchemaReady(em)) ? await em.getRepository(Policy).findOne({ where: { id } }) : null
    if (!policy) throw new NotFoundException(POLICY_NOT_FOUND)
    const today = policyLocalDate(new Date())
    const versions = (await this.versionsOf(em, [policy.id])).get(policy.id) ?? []
    const current = currentPolicyVersion(versions, today)
    const scope = branchScopeOf(user)
    const pool = await this.audiencePool(em, scope, [policy])
    const audience = pool.employees.filter(employee => this.inAudience(policy, employee, pool))
    if (scope !== null && !audience.length) throw new NotFoundException(POLICY_NOT_FOUND)
    const acknowledged = new Map<number, { versionNo: number; acknowledgedAt: Date }>()
    const numberOf = new Map(versions.map(version => [version.id, version.versionNo]))
    const ids = audience.map(employee => employee.id)
    for (let offset = 0; offset < ids.length; offset += 1000) {
      for (const row of await em.getRepository(PolicyAcknowledgement).find({ where: { policyId: policy.id, employeeId: In(ids.slice(offset, offset + 1000)) },
        select: { id: true, employeeId: true, versionId: true, acknowledgedAt: true } })) {
        const versionNo = numberOf.get(row.versionId) ?? 0, previous = acknowledged.get(row.employeeId)
        if (!previous || versionNo > previous.versionNo) acknowledged.set(row.employeeId, { versionNo, acknowledgedAt: row.acknowledgedAt })
      }
    }
    // من غير نسخة سارية لسه: مفيش حد عليه حاجة
    const rows = !current ? [] : audience.map(employee => {
      const mine = acknowledged.get(employee.id) ?? null
      const verdict = policyAckState(versions, mine ? [mine.versionNo] : [], employee.joinDate, policy.graceDays, today, !!policy.isMandatory, policy.graceFrom)!
      return { employeeId: employee.id, employeeCode: employee.employeeCode ?? null, fullName: employee.fullName, branchId: employee.branchId, hasAccount: pool.roles.has(employee.id),
        state: verdict.state, lockDate: verdict.lockDate, acknowledgedVersionNo: mine?.versionNo ?? null, acknowledgedAt: mine?.acknowledgedAt ?? null }
    })
    const count = (state: PolicyAckState) => rows.filter(row => row.state === state).length
    return { policy: { id: policy.id, title: policy.title, isMandatory: !!policy.isMandatory, graceDays: policy.graceDays, status: policy.status },
      current: current ? this.versionView(current) : null,
      summary: { audience: rows.length, acknowledged: count('ACKNOWLEDGED'), pending: count('PENDING'), overdue: count('OVERDUE') }, rows }
  }

  // ===== الموظف =====
  /** سطر الموظف: من غير بصمة النسخة — البصمة بتيجي من قراءة النسخة نفسها، فالإقرار مايتمش من القايمة لوحدها */
  private itemView(item: Awaited<ReturnType<PoliciesService['statesFor']>>['items'][number]) {
    const { contentHash: _hash, ...version } = this.versionView(item.current)
    return { policyId: item.policy.id, title: item.policy.title, category: item.policy.category ?? null, isMandatory: !!item.policy.isMandatory,
      version, state: item.state, lockDate: item.lockDate,
      acknowledgedVersionNo: item.acknowledged?.versionNo ?? null, acknowledgedAt: item.acknowledged?.acknowledgedAt ?? null }
  }

  /** «سياساتي»: السياسات المنشورة اللي أنا في جمهورها وحالتي مع كل واحدة */
  async mine(user: JwtPayload) {
    const em = this.ds.manager
    if (!(await policySchemaReady(em))) return { available: false, policies: [] }
    return { available: true, policies: (await this.statesFor(em, user)).items.map(item => this.itemView(item)) }
  }

  /** «اللي مستنيني»: الإلزامي اللي مااقرّيتش بيه. blocked = فيه واحدة عدّت مهلتها (الخادم قافل الباقي) */
  async pending(user: JwtPayload) {
    const em = this.ds.manager
    if (!(await policySchemaReady(em))) return { blocked: false, policies: [] }
    const waiting = (await this.statesFor(em, user, true)).items.filter(item => item.state !== 'ACKNOWLEDGED')
    return { blocked: waiting.some(item => item.state === 'OVERDUE'), policies: waiting.map(item => this.itemView(item)) }
  }

  /**
   * نسخة يقدر الحساب يقراها: صاحب الإدارة أو التقرير أي نسخة من سياسة ظاهرة له (حساب الفروع: ليها حد في نطاقه)؛ والموظف النسخ السارية
   * من سياسة منشورة هو في جمهورها. غير كده نفس رد النسخة اللي مش موجودة.
   */
  private async readableVersion(em: EntityManager, user: JwtPayload, versionId: number) {
    if (!(await policySchemaReady(em))) throw new NotFoundException(POLICY_NOT_FOUND)
    const version = Number.isSafeInteger(versionId) && versionId > 0 ? await em.getRepository(PolicyVersion).findOne({ where: { id: versionId } }) : null
    const policy = version ? await em.getRepository(Policy).findOne({ where: { id: version.policyId } }) : null
    if (!version || !policy) throw new NotFoundException(POLICY_NOT_FOUND)
    if (!this.reads(user) || !(await this.visibleTo(em, user, [policy])).length) {
      const mine = (await this.statesFor(em, user)).items.find(item => item.policy.id === policy.id)
      if (!mine || version.effectiveDate > policyLocalDate(new Date())) throw new NotFoundException(POLICY_NOT_FOUND)
    }
    return { policy, version }
  }

  async versionContent(user: JwtPayload, versionId: number) {
    const { policy, version } = await this.readableVersion(this.ds.manager, user, versionId)
    return { versionId: version.id, policyId: policy.id, title: policy.title, category: policy.category ?? null, versionNo: version.versionNo, effectiveDate: version.effectiveDate,
      kind: version.fileId != null ? 'FILE' as const : 'TEXT' as const, bodyText: version.bodyText ?? null, contentHash: version.contentHash }
  }

  /**
   * ملف النسخة (PDF) بنفس حق قراءتها. بصمته بتتطابق مع بصمة النسخة قبل ما يتبعت: ملف اتبدّل على التخزين (أو صفه مابقاش PDF سياسة)
   * مابيتعرضش، فمحدش بيقرّ بنسخة شاف غيرها. القراءة بالتدفق: الملف مابيتحمّلش في الذاكرة. والإرسال نفسه بيتحقق تاني وهو ماشي
   * (sha256VerifiedStream) بالبصمة والحجم اللي اتحسبوا هنا.
   */
  async versionFile(user: JwtPayload, versionId: number) {
    const em = this.ds.manager
    const { version } = await this.readableVersion(em, user, versionId)
    const file = version.fileId != null ? await em.getRepository(StoredFile).findOne({ where: { id: version.fileId } }) : null
    const storage = fileStorage()
    if (!file || !(await storage.exists(file.storedName))) throw new NotFoundException('ملف السياسة غير موجود')
    const stored = this.isPolicyPdf(file) ? await sha256OfStream(storage.read(file.storedName)) : null
    if (!stored || stored.sha256 !== version.contentHash) throw new ConflictException(POLICY_FILE_MISMATCH)
    return { file, stored }
  }

  /**
   * الإقرار: الموظف لنفسه بس، بالنسخة السارية من سياسة منشورة هو في جمهورها، وببصمة اللي اتعرض له. سطر بيتضاف مرة واحدة لكل موظف ونسخة.
   */
  async acknowledge(user: JwtPayload, versionId: number, contentHash: string) {
    if (!user.employeeId) throw new ForbiddenException('الإقرار للموظف نفسه — حسابك مش مربوط بموظف')
    const context = auditRequestContext.getStore()
    return this.ds.transaction(async em => {
      const item = (await this.statesFor(em, user)).items.find(row => row.current.id === versionId)
      // مش النسخة السارية، أو السياسة مش في جمهوره أو مسحوبة: نفس رد اللي مش موجودة
      if (!item) throw new NotFoundException(POLICY_NOT_FOUND)
      if (contentHash !== item.current.contentHash) throw new ConflictException('نسخة السياسة اتغيّرت — افتحها تاني واقراها قبل الإقرار')
      const repo = em.getRepository(PolicyAcknowledgement)
      const existing = await repo.findOne({ where: { versionId, employeeId: user.employeeId! } })
      if (existing) return { id: existing.id, acknowledgedAt: existing.acknowledgedAt, already: true }
      const saved = await repo.save(repo.create({ policyId: item.policy.id, versionId, employeeId: user.employeeId!, userId: user.sub, acknowledgedAt: new Date(),
        contentHash: item.current.contentHash, ip: context?.ip?.slice(0, 64) ?? null, userAgent: context?.userAgent?.slice(0, 300) ?? null }))
      return { id: saved.id, acknowledgedAt: saved.acknowledgedAt, already: false }
    }).catch(async error => {
      // إقرارين في نفس اللحظة: التاني بياخد سطر الأول (القيد الفريد)
      if (sqlErrorNumber(error) !== 2601 && sqlErrorNumber(error) !== 2627) throw error
      const existing = await this.ds.getRepository(PolicyAcknowledgement).findOneOrFail({ where: { versionId, employeeId: user.employeeId! } })
      return { id: existing.id, acknowledgedAt: existing.acknowledgedAt, already: true }
    })
  }
}
