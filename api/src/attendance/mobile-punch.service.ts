import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, type EntityManager } from 'typeorm'
import { recordAudit } from '../audit/audit'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, inBranchScope, userHasPerm } from '../auth/guards'
import { AttendanceService } from './attendance.service'
import {
  judgePosition, MIN_GAP_SECONDS, MOBILE_DEVICE_PREFIX, MOBILE_PUNCH_MIGRATION_MISSING, MobilePunchAttempt, mobilePunchReady, OUTCOME_LABELS, OUTCOME_MESSAGES, positionFields, PunchSite, SITE_NOT_FOUND, siteFields,
  type Outcome,
} from './mobile-punch'

// B5.6: بصمة الموبايل — الحكم على الخادم تحت قفل صف الموظف (على رأس العمل، له رقم بصمة، مهلة بين بصمتين، موقع فرعه الحالي)، وكل محاولة بتتسجّل
// قبل أي حاجة تانية. البصمة المقبولة بتدخل بعدها من `ingest` القايم (برّه معاملة الحكم) بوقت الخادم وباسم جهاز `MOBILE-<الموقع>`.

const NOT_EMPLOYEE = 'حسابك مش مربوط بملف موظف'
const NOT_ACTIVE = 'ملفك مش على رأس العمل — مفيش بصمة تتسجّل'
const NO_FINGERPRINT = 'ملفك مالوش رقم بصمة — راجع الموارد البشرية'
const TOO_SOON = 'لسه مسجّل بصمة من أقل من دقيقة'
const BRANCH_NOT_FOUND = 'الفرع مش موجود'
const FAILED_LABEL = 'تعذّر تسجيلها'
const ACTIVE_STATUSES = ['active', 'probation', 'notice_period']
const flag = (value: unknown) => value === true || value === 1
const idOf = (value: unknown) => (value == null ? null : Number(value))
const labelOf = (outcome: string) => OUTCOME_LABELS[outcome as Outcome] ?? FAILED_LABEL

@Injectable()
export class MobilePunchService {
  constructor(@InjectDataSource() private readonly ds: DataSource, private readonly attendance: AttendanceService) {}

  private siteView(row: PunchSite) {
    return { id: row.id, name: row.name, branchId: row.branchId, latitude: Number(row.latitude), longitude: Number(row.longitude), radiusMeters: row.radiusMeters, isActive: flag(row.isActive) }
  }

  private attemptView(row: MobilePunchAttempt, sites: Map<number, string>) {
    return { id: row.id, employeeId: row.employeeId, siteName: row.siteId == null ? null : sites.get(row.siteId) ?? null, accuracyMeters: row.accuracyMeters, distanceMeters: idOf(row.distanceMeters),
      outcome: row.outcome, outcomeLabel: labelOf(row.outcome), at: row.createdAt }
  }

  private async siteNames(em: EntityManager): Promise<Map<number, string>> {
    return new Map((await em.getRepository(PunchSite).find()).map(row => [row.id, row.name]))
  }

  // ===== الموظف =====

  /** «بصمتي»: مواقع فرع صاحب الحساب (أسماء ونصف قطر بس)، وهل له رقم بصمة، وآخر محاولاته */
  async mine(user: JwtPayload) {
    if (!user.employeeId) throw new ForbiddenException(NOT_EMPLOYEE)
    const em = this.ds.manager, me = Number(user.employeeId)
    if (!(await mobilePunchReady(em))) return { ready: false, hasFingerprint: false, sites: [], attempts: [] }
    const [person]: Array<{ branchId: number | null; fingerprintCode: string | null }> = await em.query('SELECT [branchId], [fingerprintCode] FROM dbo.employees WHERE [id] = @0', [me])
    const sites = person?.branchId == null ? [] : await em.getRepository(PunchSite).find({ where: { branchId: Number(person.branchId), isActive: true }, order: { name: 'ASC', id: 'ASC' } })
    const attempts = await em.getRepository(MobilePunchAttempt).find({ where: { employeeId: me }, order: { id: 'DESC' }, take: 20 })
    const names = await this.siteNames(em)
    return { ready: true, hasFingerprint: !!person?.fingerprintCode, sites: sites.map(row => ({ id: row.id, name: row.name, radiusMeters: row.radiusMeters })), attempts: attempts.map(row => this.attemptView(row, names)) }
  }

  /**
   * تسجيل بصمة: الموقع ودقته من المتصفح، والحكم كله هنا تحت قفل صف الموظف — والمحاولة بتتسجّل بنتيجتها في نفس المعاملة. المرفوضة بترجع برسالتها
   * بعد ما اتسجّلت؛ والمقبولة بتدخل بصمة بوقت الخادم من `ingest` القايم (لو فشل: المحاولة بتتعلّم «تعذّر» والخطأ بيطلع).
   */
  async punch(user: JwtPayload, body: unknown) {
    if (!user.employeeId) throw new ForbiddenException(NOT_EMPLOYEE)
    const { fields, error } = positionFields(body)
    if (!fields) throw new BadRequestException(error)
    const me = Number(user.employeeId)
    const judged = await this.ds.transaction(async em => {
      if (!(await mobilePunchReady(em))) throw new BadRequestException(MOBILE_PUNCH_MIGRATION_MISSING)
      const [person]: Array<{ id: number; branchId: number | null; fingerprintCode: string | null; isActive: boolean | number; status: string | null }> = await em.query(
        'SELECT [id], [branchId], [fingerprintCode], [isActive], [status] FROM dbo.employees WITH (UPDLOCK, ROWLOCK) WHERE [id] = @0', [me])
      if (!person || !flag(person.isActive) || !ACTIVE_STATUSES.includes(String(person.status))) throw new ForbiddenException(NOT_ACTIVE)
      if (!person.fingerprintCode) throw new BadRequestException(NO_FINGERPRINT)
      const attempts = em.getRepository(MobilePunchAttempt)
      const last = await attempts.findOne({ where: { employeeId: me, outcome: 'ACCEPTED' }, order: { id: 'DESC' } })
      if (last && Date.now() - new Date(last.createdAt).getTime() < MIN_GAP_SECONDS * 1000) throw new ConflictException(TOO_SOON)
      const sites = person.branchId == null ? [] : await em.getRepository(PunchSite).find({ where: { branchId: Number(person.branchId), isActive: true }, order: { id: 'ASC' } })
      const result = judgePosition(fields, sites)
      const now = new Date()
      const attempt = await attempts.save(attempts.create({ employeeId: me, siteId: result.site?.id ?? null, latitude: fields.latitude, longitude: fields.longitude, accuracyMeters: fields.accuracyMeters,
        distanceMeters: result.distance, outcome: result.outcome, createdAt: now }))
      return { attemptId: attempt.id, outcome: result.outcome, siteId: result.site?.id ?? null, siteName: result.site?.name ?? null, distance: result.distance, fingerprintCode: person.fingerprintCode, at: now }
    })
    if (judged.outcome !== 'ACCEPTED') throw new BadRequestException(OUTCOME_MESSAGES[judged.outcome])
    try {
      await this.attendance.ingest([{ employeeCode: judged.fingerprintCode, timestamp: judged.at.toISOString(), deviceSn: `${MOBILE_DEVICE_PREFIX}${judged.siteId}` }], undefined, user, { fromDevice: true })
    } catch (cause) {
      await this.ds.getRepository(MobilePunchAttempt).update({ id: judged.attemptId }, { outcome: 'FAILED' })
      throw cause
    }
    return { accepted: true, at: judged.at, siteName: judged.siteName, distanceMeters: judged.distance }
  }

  // ===== الإدارة =====

  /** مواقع البصمة في نطاق الحساب، وفروعه */
  async sites(user: JwtPayload) {
    const em = this.ds.manager, scope = branchScopeOf(user)
    const branches: Array<{ id: number; name: string }> = (await em.query('SELECT [id], [name] FROM dbo.branches ORDER BY [name], [id]')).filter((row: { id: number }) => inBranchScope(scope, Number(row.id)))
      .map((row: { id: number; name: string }) => ({ id: Number(row.id), name: row.name }))
    if (!(await mobilePunchReady(em))) return { ready: false, branches, sites: [] }
    const sites = (await em.getRepository(PunchSite).find({ order: { branchId: 'ASC', name: 'ASC', id: 'ASC' } })).filter(row => inBranchScope(scope, row.branchId))
    return { ready: true, branches, sites: sites.map(row => this.siteView(row)) }
  }

  /** إضافة موقع (من غير `id`) أو تعديله — بنطاق فرعه (غير كده «مش موجود»)، تحت قفل صفه، وبسطر تدقيق */
  async saveSite(user: JwtPayload, body: unknown, id?: number) {
    const { fields, error } = siteFields(body)
    if (!fields) throw new BadRequestException(error)
    return this.ds.transaction(async em => {
      if (!(await mobilePunchReady(em))) throw new BadRequestException(MOBILE_PUNCH_MIGRATION_MISSING)
      const scope = branchScopeOf(user), repo = em.getRepository(PunchSite)
      const existing = id == null ? null : await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
      if (id != null && (!existing || !inBranchScope(scope, existing.branchId))) throw new NotFoundException(SITE_NOT_FOUND)
      const [branch]: Array<{ id: number }> = await em.query('SELECT [id] FROM dbo.branches WHERE [id] = @0', [fields.branchId])
      if (!branch || !inBranchScope(scope, fields.branchId)) throw new NotFoundException(BRANCH_NOT_FOUND)
      const values = { ...fields, updatedByUserId: user.sub, updatedAt: new Date() }
      const row = existing ? { ...existing, ...values } : await repo.save(repo.create(values))
      if (existing) await repo.update({ id: existing.id }, values)
      await recordAudit(em, { category: 'SETTINGS', action: existing ? 'PUNCH_SITE_UPDATED' : 'PUNCH_SITE_CREATED', entityType: 'punch_site', entityId: String(row.id), actorUserId: user.sub, branchId: fields.branchId,
        summary: `${existing ? 'تعديل' : 'إضافة'} موقع بصمة «${fields.name}» (نصف قطر ${fields.radiusMeters} متر)`, before: existing ? this.siteView(existing) : undefined, after: { id: row.id, ...fields } })
      return { id: row.id }
    })
  }

  /** آخر محاولات بصمة الموبايل لموظفين نطاق الحساب (بفرع الموظف الحالي) — المقبولة والمرفوضة بسببها */
  async attempts(user: JwtPayload) {
    const em = this.ds.manager, canManage = userHasPerm(user, 'attendance.manage')
    if (!(await mobilePunchReady(em))) return { ready: false, canManage, rows: [] }
    const scope = branchScopeOf(user)
    const rows: Array<MobilePunchAttempt & { fullName: string; employeeCode: string | null; branchId: number | null }> = await em.query(
      `SELECT TOP (500) a.[id], a.[employeeId], a.[siteId], a.[accuracyMeters], a.[distanceMeters], a.[outcome], a.[createdAt], e.[fullName], e.[employeeCode], e.[branchId]
       FROM dbo.mobile_punch_attempts a INNER JOIN dbo.employees e ON e.[id] = a.[employeeId] ORDER BY a.[id] DESC`)
    const names = await this.siteNames(em)
    return { ready: true, canManage, rows: rows.filter(row => inBranchScope(scope, idOf(row.branchId))).slice(0, 200).map(row => ({ ...this.attemptView({ ...row, id: Number(row.id), employeeId: Number(row.employeeId), siteId: idOf(row.siteId) } as MobilePunchAttempt, names),
      employeeName: row.fullName, employeeCode: row.employeeCode ?? null })) }
  }
}
