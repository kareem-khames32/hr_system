import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, In, type EntityManager } from 'typeorm'
import { localDateOf } from '../attendance/attendance.service'
import { recordAudit } from '../audit/audit'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, inBranchScope } from '../auth/guards'
import { canSeeFullIdentity, maskIdentityPartial, partialMaskingOn } from '../employees/employee-privacy'
import { eligibleCoverage, InsuranceClass, InsuranceClassGrade, InsurancePolicy, insuranceReady } from './insurance'
import { InsuranceEnrollment, InsuranceMemberRequest, insuranceMembersReady, MEMBER_REQUEST_KIND_LABELS, MEMBER_REQUEST_ORIGIN_LABELS, MEMBER_REQUEST_STATUS_LABELS, OPEN_REQUEST_STATUSES,
  requestOutcome, requestReason, requestStepAllowed, type MemberRequestStatus } from './insurance-members'

// B5.2 (ب): اشتراكات التأمين الطبي وطلبات شركة التأمين — بصلاحية الموديول وبنطاق فروع الحساب (فرع الموظف الحالي؛ برّه النطاق = مش موجود).
// كل كتابة تحت قفل صف الموظف (ثم صف الطلب)، والحكم بعد القفل، وبسطر تدقيق. مفيش مبلغ بيتخصم.

export const MEMBERS_MIGRATION_MISSING = 'جداول اشتراكات التأمين ناقصة — طبّق ترحيلات 143 لحد 147 الأول'
const EMPLOYEE_NOT_FOUND = 'الموظف مش موجود'
const DEPENDENT_NOT_FOUND = 'المعال مش موجود في سجل الموظف'
const REQUEST_NOT_FOUND = 'طلب شركة التأمين مش موجود'
const ENROLLMENT_NOT_FOUND = 'الاشتراك مش موجود'
const ACTIVE = `e.[isActive] = 1 AND e.[status] IN (N'active', N'probation', N'notice_period')`
const flag = (value: unknown) => value === true || value === 1
const idOf = (value: unknown) => (value == null ? null : Number(value))
const day = (value: unknown) => (value == null ? null : String(value).slice(0, 10))

interface LockedEmployee { id: number; fullName: string; branchId: number | null; gradeId: number | null; country: string | null; active: boolean }

@Injectable()
export class BenefitsMembersService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  private async ready(em: EntityManager) { return (await insuranceReady(em)) && (await insuranceMembersReady(em)) }
  private async assertReady(em: EntityManager) {
    if (!(await this.ready(em))) throw new BadRequestException(MEMBERS_MIGRATION_MISSING)
  }

  /** صف الموظف تحت قفل: فرعه ودرجته ونشاطه بيتحكم عليهم بعد القفل؛ برّه نطاق الحساب = مش موجود */
  private async lockEmployee(em: EntityManager, user: JwtPayload, id: number): Promise<LockedEmployee> {
    const [row]: Array<Record<string, unknown>> = await em.query(
      `SELECT e.[id], e.[fullName], e.[branchId], e.[gradeId], b.[country], CASE WHEN ${ACTIVE} THEN 1 ELSE 0 END AS [active]
       FROM [employees] e WITH (UPDLOCK, ROWLOCK) LEFT JOIN [branches] b ON b.[id] = e.[branchId] WHERE e.[id] = @0`, [id])
    if (!row || !inBranchScope(branchScopeOf(user), idOf(row.branchId))) throw new NotFoundException(EMPLOYEE_NOT_FOUND)
    return { id: Number(row.id), fullName: String(row.fullName), branchId: idOf(row.branchId), gradeId: idOf(row.gradeId), country: (row.country as string | null) ?? null, active: Number(row.active) === 1 }
  }

  /** وثيقة الموظف وفئته دلوقتي (بمدير المعاملة) — نفس حكم تقرير الأهلية */
  private async coverageOf(em: EntityManager, employee: LockedEmployee) {
    const policies = await em.getRepository(InsurancePolicy).find()
    const classRows = await em.getRepository(InsuranceClass).find()
    const links = classRows.length ? await em.getRepository(InsuranceClassGrade).find({ where: { classId: In(classRows.map(row => row.id)) } }) : []
    const classes = classRows.map(row => ({ id: row.id, policyId: row.policyId, name: row.name, isDefault: flag(row.isDefault), isActive: flag(row.isActive), gradeIds: links.filter(link => link.classId === row.id).map(link => link.gradeId) }))
    return eligibleCoverage({ country: employee.country, gradeId: employee.gradeId }, policies, classes, localDateOf(new Date()))
  }

  // ===== القراءة =====

  /** أعضاء نطاق الحساب (الموظف النشط ومعاليه المشمولين بالتأمين) باشتراكهم الساري وطلبهم المفتوح، وطلبات شركة التأمين */
  async members(user: JwtPayload) {
    const em = this.ds.manager
    if (!(await this.ready(em))) return { ready: false, members: [], requests: [] }
    const scope = branchScopeOf(user)
    const people: Array<{ id: number; fullName: string; employeeCode: string | null; branchId: number | null }> = (await em.query(
      `SELECT e.[id], e.[fullName], e.[employeeCode], e.[branchId] FROM [employees] e WHERE ${ACTIVE} ORDER BY e.[fullName], e.[id]`) as Array<{ id: number; fullName: string; employeeCode: string | null; branchId: number | null }>)
      .filter(row => inBranchScope(scope, idOf(row.branchId)))
    const visible = new Map(people.map(row => [Number(row.id), row]))
    const dependents: Array<{ id: number; employeeId: number; nameAr: string; relation: string }> = (await em.query(
      `SELECT d.[id], d.[employeeId], d.[nameAr], d.[relation] FROM [dependents] d WHERE d.[status] = N'ACTIVE' AND d.[isInsured] = 1 ORDER BY d.[id]`) as Array<{ id: number; employeeId: number; nameAr: string; relation: string }>)
      .filter(row => visible.has(Number(row.employeeId)))
    const enrollments = (await em.getRepository(InsuranceEnrollment).find({ where: { status: 'ACTIVE' } })).filter(row => visible.has(row.employeeId))
    // الطلبات: كل المفتوح + آخر 100 مقفول — لموظفين النطاق بفرعهم الحالي (اللي ساب الشغل وطلبه مفتوح لسه ظاهر)
    const everyone: Array<{ id: number; fullName: string; employeeCode: string | null; branchId: number | null }> = await em.query(
      `SELECT e.[id], e.[fullName], e.[employeeCode], e.[branchId] FROM [employees] e WHERE e.[id] IN (SELECT [employeeId] FROM [insurance_member_requests])`)
    const requestable = new Map(everyone.filter(row => inBranchScope(scope, idOf(row.branchId))).map(row => [Number(row.id), row]))
    const allRequests = (await em.getRepository(InsuranceMemberRequest).find({ order: { id: 'DESC' } })).filter(row => requestable.has(row.employeeId))
    const requests = [...allRequests.filter(row => OPEN_REQUEST_STATUSES.includes(row.status)), ...allRequests.filter(row => !OPEN_REQUEST_STATUSES.includes(row.status)).slice(0, 100)]
    const policies = new Map((await em.getRepository(InsurancePolicy).find()).map(row => [row.id, row.name]))
    const classes = new Map((await em.getRepository(InsuranceClass).find()).map(row => [row.id, row.name]))
    const dependentNames: Array<{ id: number; nameAr: string; relation: string }> = requests.some(row => row.dependentId != null)
      ? await em.query(`SELECT d.[id], d.[nameAr], d.[relation] FROM [dependents] d WHERE d.[id] IN (SELECT [dependentId] FROM [insurance_member_requests] WHERE [dependentId] IS NOT NULL)`) : []
    const dependentOf = new Map(dependentNames.map(row => [Number(row.id), row]))
    const memberKey = (employeeId: number, dependentId: number | null) => `${employeeId}:${dependentId ?? 0}`
    const enrollmentOf = new Map(enrollments.map(row => [memberKey(row.employeeId, row.dependentId), row]))
    const openOf = new Map(allRequests.filter(row => OPEN_REQUEST_STATUSES.includes(row.status)).map(row => [memberKey(row.employeeId, row.dependentId), row]))
    const member = (employee: { id: number; fullName: string; employeeCode: string | null }, dependent: { id: number; nameAr: string; relation: string } | null) => {
      const key = memberKey(Number(employee.id), dependent ? Number(dependent.id) : null), enrollment = enrollmentOf.get(key), open = openOf.get(key)
      return { employeeId: Number(employee.id), employeeName: employee.fullName, employeeCode: employee.employeeCode ?? null, dependentId: dependent ? Number(dependent.id) : null,
        memberName: dependent ? dependent.nameAr : employee.fullName, relation: dependent ? dependent.relation : null,
        enrollment: enrollment ? { id: enrollment.id, policyName: policies.get(enrollment.policyId) ?? null, className: classes.get(enrollment.classId) ?? null, cardNumber: enrollment.cardNumber, startDate: day(enrollment.startDate) } : null,
        openRequest: open ? { id: open.id, kind: open.kind, kindLabel: MEMBER_REQUEST_KIND_LABELS[open.kind], status: open.status, statusLabel: MEMBER_REQUEST_STATUS_LABELS[open.status] } : null }
    }
    return {
      ready: true,
      members: people.flatMap(employee => [member(employee, null), ...dependents.filter(row => Number(row.employeeId) === Number(employee.id)).map(row => member(employee, row))]),
      requests: requests.map(row => {
        const employee = requestable.get(row.employeeId)!, dependent = row.dependentId == null ? null : dependentOf.get(row.dependentId) ?? null
        return { id: row.id, kind: row.kind, kindLabel: MEMBER_REQUEST_KIND_LABELS[row.kind], status: row.status, statusLabel: MEMBER_REQUEST_STATUS_LABELS[row.status], origin: row.origin,
          originLabel: MEMBER_REQUEST_ORIGIN_LABELS[row.origin], employeeId: row.employeeId, employeeName: employee.fullName, employeeCode: employee.employeeCode ?? null,
          memberName: dependent ? dependent.nameAr : employee.fullName, relation: dependent ? dependent.relation : null, policyName: policies.get(row.policyId) ?? null, className: classes.get(row.classId) ?? null,
          reason: row.reason, effectiveDate: day(row.effectiveDate), cardNumber: row.cardNumber, createdAt: row.createdAt, sentAt: row.sentAt, closedAt: row.closedAt }
      }),
    }
  }

  /** كشف شركة التأمين: طلبات نطاق الحساب في حالة معيّنة ببيانات العضو (الهوية بحكم الإخفاء الجزئي) */
  async sheet(user: JwtPayload, rawStatus: unknown) {
    const em = this.ds.manager
    await this.assertReady(em)
    const status: MemberRequestStatus = rawStatus === 'SENT' ? 'SENT' : 'PENDING', scope = branchScopeOf(user), masking = await partialMaskingOn(em)
    const rows: Array<Record<string, unknown>> = await em.query(
      `SELECT r.[id], r.[kind], r.[reason], r.[employeeId], r.[dependentId], e.[fullName], e.[employeeCode], e.[branchId], CONVERT(char(10), e.[birthDate], 23) AS [employeeBirthDate], e.[nationalId] AS [employeeNationalId],
              d.[nameAr] AS [dependentName], d.[nameEn] AS [dependentNameEn], d.[relation], CONVERT(char(10), d.[birthDate], 23) AS [dependentBirthDate], d.[nationalId] AS [dependentNationalId],
              p.[name] AS [policyName], p.[policyNumber], c.[name] AS [className], n.[cardNumber]
       FROM [insurance_member_requests] r INNER JOIN [employees] e ON e.[id] = r.[employeeId] LEFT JOIN [dependents] d ON d.[id] = r.[dependentId]
         LEFT JOIN [insurance_policies] p ON p.[id] = r.[policyId] LEFT JOIN [insurance_classes] c ON c.[id] = r.[classId] LEFT JOIN [insurance_enrollments] n ON n.[id] = r.[enrollmentId]
       WHERE r.[status] = @0 ORDER BY r.[id]`, [status])
    return {
      status, statusLabel: MEMBER_REQUEST_STATUS_LABELS[status],
      rows: rows.filter(row => inBranchScope(scope, idOf(row.branchId))).map(row => {
        const employeeId = Number(row.employeeId), dependent = row.dependentId != null
        const nationalId = (dependent ? row.dependentNationalId : row.employeeNationalId) as string | null
        return { requestId: Number(row.id), kind: row.kind, kindLabel: MEMBER_REQUEST_KIND_LABELS[row.kind as 'ADD' | 'REMOVE'], employeeName: row.fullName, employeeCode: row.employeeCode ?? null,
          memberName: dependent ? row.dependentName : row.fullName, memberNameEn: dependent ? row.dependentNameEn ?? null : null, relation: dependent ? row.relation : null,
          birthDate: (dependent ? row.dependentBirthDate : row.employeeBirthDate) ?? null,
          // رقم الهوية: كامل للي يشوفه في ملف الموظف، وبآخر 4 خانات لغيره لما الإخفاء الجزئي مفتوح
          nationalId: masking && !canSeeFullIdentity(user, employeeId) ? maskIdentityPartial(nationalId) : nationalId ?? null,
          policyName: row.policyName ?? null, policyNumber: row.policyNumber ?? null, className: row.className ?? null, cardNumber: row.cardNumber ?? null, reason: row.reason ?? null }
      }),
    }
  }

  // ===== الكتابة =====

  /** طلب إضافة عضو (الموظف أو معال مشمول بالتأمين) على وثيقة دولة فرعه وفئة درجته */
  async requestAdd(user: JwtPayload, body: { employeeId?: unknown; dependentId?: unknown }) {
    const employeeId = Number(body.employeeId), dependentId = body.dependentId === undefined || body.dependentId === null ? null : Number(body.dependentId)
    if (!Number.isSafeInteger(employeeId) || employeeId < 1 || (dependentId !== null && (!Number.isSafeInteger(dependentId) || dependentId < 1))) throw new BadRequestException('اختار الموظف (والمعال لو الطلب لمعال)')
    await this.ds.transaction(async em => {
      await this.assertReady(em)
      const employee = await this.lockEmployee(em, user, employeeId)
      if (!employee.active) throw new BadRequestException('الموظف مش على رأس العمل — مفيش طلب إضافة')
      let memberName = employee.fullName
      if (dependentId !== null) {
        const [dependent]: Array<{ nameAr: string; status: string; isInsured: boolean | number }> = await em.query(
          'SELECT [nameAr], [status], [isInsured] FROM [dependents] WITH (UPDLOCK, ROWLOCK) WHERE [id] = @0 AND [employeeId] = @1', [dependentId, employeeId])
        if (!dependent || dependent.status !== 'ACTIVE') throw new NotFoundException(DEPENDENT_NOT_FOUND)
        if (!flag(dependent.isInsured)) throw new BadRequestException('المعال مش متعلّم «مشمول بالتأمين» في سجل المعالين')
        memberName = dependent.nameAr
      }
      const coverage = await this.coverageOf(em, employee)
      if (!coverage) throw new BadRequestException('مفيش وثيقة تأمين سارية لدولة فرع الموظف')
      if (!coverage.insuranceClass) throw new BadRequestException('درجة الموظف مش مربوطة بفئة في الوثيقة ومفيش فئة افتراضية')
      if (await this.activeEnrollments(em, employeeId, dependentId)) throw new BadRequestException('العضو مشترك فعلًا في التأمين')
      if (await this.openRequests(em, employeeId, dependentId)) throw new BadRequestException('للعضو طلب مفتوح عند شركة التأمين')
      const made = await em.getRepository(InsuranceMemberRequest).insert({ kind: 'ADD', policyId: coverage.policy.id, classId: coverage.insuranceClass.id, employeeId, dependentId, enrollmentId: null, status: 'PENDING', origin: 'MANUAL',
        reason: null, effectiveDate: null, cardNumber: null, createdByUserId: user.sub, createdAt: new Date(), sentByUserId: null, sentAt: null, closedByUserId: null, closedAt: null })
      await recordAudit(em, { category: 'SETTINGS', action: 'INSURANCE_ADD_REQUESTED', entityType: 'insurance_member_request', entityId: String(made.identifiers[0].id), actorUserId: user.sub, branchId: employee.branchId,
        summary: `طلب إضافة «${memberName}» للتأمين الطبي (فئة ${coverage.insuranceClass.name})`, after: { employeeId, dependentId, policyId: coverage.policy.id, classId: coverage.insuranceClass.id } })
    })
    return this.members(user)
  }

  /** اشتراكات العضو السارية — تحت قفل مدى على اشتراكات الموظف (إضافة في نفس اللحظة بتستنى) */
  private async activeEnrollments(em: EntityManager, employeeId: number, dependentId: number | null): Promise<number> {
    const [row]: Array<{ n: number }> = await em.query(
      `SELECT COUNT(*) AS [n] FROM [insurance_enrollments] WITH (UPDLOCK, HOLDLOCK) WHERE [employeeId] = @0 AND [status] = N'ACTIVE' AND ${dependentId === null ? '[dependentId] IS NULL' : '[dependentId] = @1'}`,
      dependentId === null ? [employeeId] : [employeeId, dependentId])
    return Number(row?.n ?? 0)
  }

  private async openRequests(em: EntityManager, employeeId: number, dependentId: number | null): Promise<number> {
    const [row]: Array<{ n: number }> = await em.query(
      `SELECT COUNT(*) AS [n] FROM [insurance_member_requests] WITH (UPDLOCK, HOLDLOCK) WHERE [employeeId] = @0 AND [status] IN (N'PENDING', N'SENT') AND ${dependentId === null ? '[dependentId] IS NULL' : '[dependentId] = @1'}`,
      dependentId === null ? [employeeId] : [employeeId, dependentId])
    return Number(row?.n ?? 0)
  }

  /** طلب حذف لاشتراك ساري — بسبب مكتوب */
  async requestRemove(user: JwtPayload, enrollmentId: number, rawReason: unknown) {
    const checked = requestReason(rawReason, true)
    if (checked.error !== null) throw new BadRequestException(checked.error)
    await this.ds.transaction(async em => {
      await this.assertReady(em)
      const found = await em.getRepository(InsuranceEnrollment).findOneBy({ id: enrollmentId })
      if (!found) throw new NotFoundException(ENROLLMENT_NOT_FOUND)
      const employee = await this.lockEmployee(em, user, found.employeeId).catch(() => { throw new NotFoundException(ENROLLMENT_NOT_FOUND) })
      const enrollment = await em.getRepository(InsuranceEnrollment).findOne({ where: { id: enrollmentId }, lock: { mode: 'pessimistic_write' } })
      if (!enrollment || enrollment.status !== 'ACTIVE') throw new BadRequestException('الاشتراك مش ساري')
      if (await this.openRequests(em, enrollment.employeeId, enrollment.dependentId)) throw new BadRequestException('للعضو طلب مفتوح عند شركة التأمين')
      const made = await em.getRepository(InsuranceMemberRequest).insert({ kind: 'REMOVE', policyId: enrollment.policyId, classId: enrollment.classId, employeeId: enrollment.employeeId, dependentId: enrollment.dependentId,
        enrollmentId: enrollment.id, status: 'PENDING', origin: 'MANUAL', reason: checked.reason, effectiveDate: null, cardNumber: null, createdByUserId: user.sub, createdAt: new Date(), sentByUserId: null, sentAt: null,
        closedByUserId: null, closedAt: null })
      await recordAudit(em, { category: 'SETTINGS', action: 'INSURANCE_REMOVE_REQUESTED', entityType: 'insurance_member_request', entityId: String(made.identifiers[0].id), actorUserId: user.sub, branchId: employee.branchId,
        summary: `طلب حذف عضو من التأمين الطبي (موظف ${employee.fullName})`, after: { enrollmentId: enrollment.id, reason: checked.reason } })
    })
    return this.members(user)
  }

  /** «اتبعت في الكشف» / «تم» (برد شركة التأمين) / «إلغاء» — تحت قفل صف الموظف ثم صف الطلب، والحكم بعدهم */
  async step(user: JwtPayload, requestId: number, step: 'send' | 'done' | 'cancel', body: { effectiveDate?: unknown; cardNumber?: unknown; reason?: unknown }) {
    await this.ds.transaction(async em => {
      await this.assertReady(em)
      const repo = em.getRepository(InsuranceMemberRequest)
      const found = await repo.findOneBy({ id: requestId })
      if (!found) throw new NotFoundException(REQUEST_NOT_FOUND)
      const employee = await this.lockEmployee(em, user, found.employeeId).catch(() => { throw new NotFoundException(REQUEST_NOT_FOUND) })
      const request = await repo.findOne({ where: { id: requestId }, lock: { mode: 'pessimistic_write' } })
      if (!request) throw new NotFoundException(REQUEST_NOT_FOUND)
      if (!requestStepAllowed(step, request.status)) throw new BadRequestException(`الخطوة دي مش متاحة والطلب «${MEMBER_REQUEST_STATUS_LABELS[request.status]}»`)
      const now = new Date()
      if (step === 'send') {
        await repo.update({ id: request.id }, { status: 'SENT', sentByUserId: user.sub, sentAt: now })
      } else if (step === 'cancel') {
        const checked = requestReason(body.reason, true)
        if (checked.error !== null) throw new BadRequestException(checked.error)
        await repo.update({ id: request.id }, { status: 'CANCELLED', closedByUserId: user.sub, closedAt: now, reason: `${request.reason ? `${request.reason} — ` : ''}ملغي: ${checked.reason}`.slice(0, 300) })
      } else {
        const outcome = requestOutcome(request.kind, body)
        if (outcome.error !== null) throw new BadRequestException(outcome.error)
        const enrollments = em.getRepository(InsuranceEnrollment)
        if (request.kind === 'ADD') {
          if (request.dependentId !== null) {
            const [dependent]: Array<{ status: string }> = await em.query('SELECT [status] FROM [dependents] WITH (UPDLOCK, ROWLOCK) WHERE [id] = @0 AND [employeeId] = @1', [request.dependentId, request.employeeId])
            if (!dependent || dependent.status !== 'ACTIVE') throw new BadRequestException('المعال اتحذف من سجل المعالين — الغي الطلب')
          }
          // اشتراك ساري واحد للعضو
          if (await this.activeEnrollments(em, request.employeeId, request.dependentId)) throw new BadRequestException('العضو مشترك فعلًا في التأمين')
          await enrollments.insert({ policyId: request.policyId, classId: request.classId, employeeId: request.employeeId, dependentId: request.dependentId, cardNumber: outcome.cardNumber, startDate: outcome.effectiveDate,
            endDate: null, status: 'ACTIVE', createdByUserId: user.sub, createdAt: now, updatedByUserId: null, updatedAt: null })
        } else {
          const enrollment = request.enrollmentId === null ? null : await enrollments.findOne({ where: { id: request.enrollmentId }, lock: { mode: 'pessimistic_write' } })
          if (!enrollment || enrollment.status !== 'ACTIVE') throw new BadRequestException('الاشتراك مش ساري — الغي الطلب')
          if (outcome.effectiveDate < String(enrollment.startDate).slice(0, 10)) throw new BadRequestException('نهاية التغطية قبل بدايتها')
          await enrollments.update({ id: enrollment.id }, { status: 'ENDED', endDate: outcome.effectiveDate, updatedByUserId: user.sub, updatedAt: now })
        }
        await repo.update({ id: request.id }, { status: 'DONE', effectiveDate: outcome.effectiveDate, cardNumber: outcome.cardNumber, closedByUserId: user.sub, closedAt: now })
      }
      await recordAudit(em, { category: 'SETTINGS', action: step === 'send' ? 'INSURANCE_REQUEST_SENT' : step === 'cancel' ? 'INSURANCE_REQUEST_CANCELLED' : 'INSURANCE_REQUEST_DONE', entityType: 'insurance_member_request',
        entityId: String(request.id), actorUserId: user.sub, branchId: employee.branchId,
        summary: `طلب ${MEMBER_REQUEST_KIND_LABELS[request.kind]} تأمين لموظف ${employee.fullName}: ${step === 'send' ? 'اتبعت في الكشف' : step === 'cancel' ? 'اتلغى' : 'تم'}`,
        before: { status: request.status }, after: { status: step === 'send' ? 'SENT' : step === 'cancel' ? 'CANCELLED' : 'DONE' } })
    })
    return this.members(user)
  }
}
