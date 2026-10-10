import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, In, type EntityManager } from 'typeorm'
import { DocType, EmployeeDocument } from '../assets/assets.entities'
import { recordAudit } from '../audit/audit'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, inBranchScope, userHasPerm } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import { audienceMembersNow } from '../org/audience-preview'
import { Branch } from '../org/entities/branch.entity'
import { assertAudienceTargets, orgAudienceJson } from '../org/org-audience'
import { TrainingCourse, TrainingEnrollment, TrainingSession, type TrainingEnrollmentStatus } from './training.entities'
import {
  TRAINING_CERT_CODE, TRAINING_CERT_NAME, TRAINING_COURSE_NOT_FOUND, TRAINING_ENROLLMENT_NOT_FOUND, TRAINING_ENROLLMENT_STATUS_LABELS, TRAINING_FULL, TRAINING_KIND_LABELS, TRAINING_MARK_FINAL,
  TRAINING_MIGRATION_MISSING, TRAINING_PERMISSION, TRAINING_RATING_STAGE, TRAINING_SEAT_STATUSES, TRAINING_SESSION_CLOSED, TRAINING_SESSION_NOT_FOUND, TRAINING_SESSION_STATUS_LABELS,
  certificateExpiry, cleanEnrollmentMark, cleanSessionStatus, cleanTrainingCapacity, cleanTrainingCost, cleanTrainingDates, cleanTrainingDuration, cleanTrainingKind, cleanTrainingName,
  cleanTrainingRating, cleanTrainingText, cleanTrainingUrl, cleanValidMonths, enrollmentOpen, trainingReady,
} from './training-rules'

export interface CourseInput {
  name?: unknown; kind?: unknown; url?: unknown; durationHours?: unknown; provider?: unknown; description?: unknown; givesCertificate?: unknown; certificateValidMonths?: unknown; isActive?: unknown
}
export interface SessionInput { courseId?: unknown; branchId?: unknown; startDate?: unknown; endDate?: unknown; location?: unknown; trainer?: unknown; capacity?: unknown; costPerSeat?: unknown }
const ENDED = ['terminated', 'archived']
const day = (value: unknown): string => String(value).slice(0, 10)
const amount = (value: unknown): string | null => (value === null || value === undefined ? null : Number(value).toFixed(2))
const flag = (raw: unknown, label: string): boolean => { if (typeof raw !== 'boolean') throw new BadRequestException(`${label}: نعم أو لا`); return raw }

// B3.9: التدريب. الكتالوج والجلسات والتسجيل بصلاحية إدارة التدريب (والجلسة والموظف بنطاق الفروع)؛ والموظف شايف تسجيلاته وبيقيّم التدريب.
// كل كتابة تحت قفل صفها (الجلسة للتسجيل والسعة، والتسجيل لتغيير حالته). الشهادة مستند موظف بنوع «شهادة تدريب» بتاريخ انتهائه.
@Injectable()
export class TrainingService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  private async assertReady(em: EntityManager) {
    if (!(await trainingReady(em))) throw new BadRequestException(TRAINING_MIGRATION_MISSING)
  }
  private assertManager(user: JwtPayload) {
    if (!userHasPerm(user, TRAINING_PERMISSION)) throw new ForbiddenException('الإجراء ده لصاحب صلاحية إدارة التدريب')
  }
  /** الجلسة في نطاق الحساب: جلسة «كل الشركة» لحساب من غير قيد فروع بس */
  private sessionInScope(user: JwtPayload, session: Pick<TrainingSession, 'branchId'>): boolean {
    return inBranchScope(branchScopeOf(user), session.branchId)
  }

  // ===== الكتالوج =====

  private courseView(row: TrainingCourse) {
    return { id: row.id, name: row.name, kind: row.kind, kindLabel: TRAINING_KIND_LABELS[row.kind] ?? row.kind, url: row.url ?? null, durationHours: row.durationHours === null ? null : Number(row.durationHours),
      provider: row.provider ?? null, description: row.description ?? null, givesCertificate: row.givesCertificate === true, certificateValidMonths: row.certificateValidMonths ?? null, isActive: row.isActive === true }
  }

  async listCourses(user: JwtPayload) {
    this.assertManager(user)
    const em = this.ds.manager
    if (!(await trainingReady(em))) return { available: false, message: TRAINING_MIGRATION_MISSING, courses: [] }
    return { available: true, courses: (await em.getRepository(TrainingCourse).find({ order: { id: 'DESC' } })).map((row) => this.courseView(row)) }
  }

  async createCourse(user: JwtPayload, input: CourseInput) {
    this.assertManager(user)
    const name = cleanTrainingName(input.name), kind = cleanTrainingKind(input.kind), url = cleanTrainingUrl(input.url, kind), givesCertificate = input.givesCertificate === undefined ? false : flag(input.givesCertificate, 'بتطلّع شهادة')
    const values = { name, kind, url, durationHours: cleanTrainingDuration(input.durationHours), provider: cleanTrainingText(input.provider, 200, 'المزوّد'), description: cleanTrainingText(input.description, 1000, 'وصف الدورة'),
      givesCertificate, certificateValidMonths: cleanValidMonths(input.certificateValidMonths, givesCertificate), isActive: true, createdByUserId: user.sub, createdAt: new Date() }
    await this.assertReady(this.ds.manager)
    const made = await this.ds.getRepository(TrainingCourse).insert(values)
    return this.courseView(await this.ds.getRepository(TrainingCourse).findOneOrFail({ where: { id: made.identifiers[0].id as number } }))
  }

  /** تعديل دورة: تحت قفل صفها، وبالخانات اللي اتبعتت بس. الجلسات والشهادات اللي اتعملت مابتتأثرش */
  async updateCourse(user: JwtPayload, id: number, input: CourseInput) {
    this.assertManager(user)
    await this.ds.transaction(async (em) => {
      await this.assertReady(em)
      const course = await em.getRepository(TrainingCourse).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!course) throw new NotFoundException(TRAINING_COURSE_NOT_FOUND)
      const kind = input.kind === undefined ? course.kind : cleanTrainingKind(input.kind)
      const givesCertificate = input.givesCertificate === undefined ? course.givesCertificate === true : flag(input.givesCertificate, 'بتطلّع شهادة')
      const patch: Partial<TrainingCourse> = { kind, givesCertificate }
      if (input.name !== undefined) patch.name = cleanTrainingName(input.name)
      patch.url = cleanTrainingUrl(input.url === undefined ? course.url : input.url, kind)
      if (input.durationHours !== undefined) patch.durationHours = cleanTrainingDuration(input.durationHours)
      if (input.provider !== undefined) patch.provider = cleanTrainingText(input.provider, 200, 'المزوّد')
      if (input.description !== undefined) patch.description = cleanTrainingText(input.description, 1000, 'وصف الدورة')
      patch.certificateValidMonths = givesCertificate ? cleanValidMonths(input.certificateValidMonths === undefined ? course.certificateValidMonths : input.certificateValidMonths, true) : null
      if (input.isActive !== undefined) patch.isActive = flag(input.isActive, 'متاحة')
      await em.getRepository(TrainingCourse).update({ id: course.id }, patch)
    })
    return this.courseView(await this.ds.getRepository(TrainingCourse).findOneOrFail({ where: { id } }))
  }

  // ===== الجلسات =====

  private async sessionViews(em: EntityManager, rows: TrainingSession[]) {
    if (!rows.length) return []
    const courses = new Map((await em.getRepository(TrainingCourse).find({ where: { id: In([...new Set(rows.map((row) => row.courseId))]) } })).map((row) => [row.id, row]))
    const branchIds = [...new Set(rows.map((row) => row.branchId).filter((id): id is number => id != null))]
    const branches = new Map((branchIds.length ? await em.getRepository(Branch).find({ where: { id: In(branchIds) } }) : []).map((row) => [row.id, row.name]))
    const enrollments = await em.getRepository(TrainingEnrollment).find({ where: { sessionId: In(rows.map((row) => row.id)) } })
    return rows.map((row) => {
      const course = courses.get(row.courseId), mine = enrollments.filter((entry) => entry.sessionId === row.id)
      return { id: row.id, courseId: row.courseId, courseName: course?.name ?? '—', kindLabel: course ? TRAINING_KIND_LABELS[course.kind] ?? course.kind : null, givesCertificate: course?.givesCertificate === true,
        branchId: row.branchId ?? null, branchName: row.branchId != null ? branches.get(row.branchId) ?? null : null, startDate: day(row.startDate), endDate: day(row.endDate), location: row.location ?? null,
        trainer: row.trainer ?? null, capacity: row.capacity ?? null, costPerSeat: amount(row.costPerSeat), status: row.status, statusLabel: TRAINING_SESSION_STATUS_LABELS[row.status] ?? row.status,
        counts: { seats: mine.filter((entry) => TRAINING_SEAT_STATUSES.includes(entry.status)).length, attended: mine.filter((entry) => entry.status === 'ATTENDED' || entry.status === 'COMPLETED').length,
          completed: mine.filter((entry) => entry.status === 'COMPLETED').length } }
    })
  }

  async listSessions(user: JwtPayload) {
    this.assertManager(user)
    const em = this.ds.manager
    if (!(await trainingReady(em))) return { available: false, message: TRAINING_MIGRATION_MISSING, canCompany: false, sessions: [] }
    const rows = (await em.getRepository(TrainingSession).find({ order: { startDate: 'DESC', id: 'DESC' } })).filter((row) => this.sessionInScope(user, row))
    return { available: true, canCompany: branchScopeOf(user) === null, sessions: await this.sessionViews(em, rows) }
  }

  /** فرع الجلسة: فرع في نطاق الحساب، أو «كل الشركة» لحساب من غير قيد فروع */
  private async sessionBranch(em: EntityManager, user: JwtPayload, raw: unknown): Promise<number | null> {
    if (raw === undefined || raw === null || raw === '') {
      if (branchScopeOf(user) !== null) throw new BadRequestException('اختار فرع الجلسة')
      return null
    }
    const branch = typeof raw === 'number' && Number.isSafeInteger(raw) ? await em.getRepository(Branch).findOne({ where: { id: raw } }) : null
    // فرع برّه النطاق زي اللي مش موجود
    if (!branch || !inBranchScope(branchScopeOf(user), branch.id)) throw new BadRequestException('الفرع غير موجود')
    return branch.id
  }

  async createSession(user: JwtPayload, input: SessionInput) {
    this.assertManager(user)
    const dates = cleanTrainingDates(input.startDate, input.endDate)
    const values = { ...dates, location: cleanTrainingText(input.location, 200, 'المكان'), trainer: cleanTrainingText(input.trainer, 200, 'المدرب'), capacity: cleanTrainingCapacity(input.capacity),
      costPerSeat: cleanTrainingCost(input.costPerSeat) }
    const em = this.ds.manager
    await this.assertReady(em)
    const course = typeof input.courseId === 'number' && Number.isSafeInteger(input.courseId) ? await em.getRepository(TrainingCourse).findOne({ where: { id: input.courseId } }) : null
    if (!course || course.isActive !== true) throw new BadRequestException(TRAINING_COURSE_NOT_FOUND)
    const branchId = await this.sessionBranch(em, user, input.branchId)
    const made = await em.getRepository(TrainingSession).insert({ courseId: course.id, branchId, ...values, status: 'PLANNED', createdByUserId: user.sub, createdAt: new Date() })
    return (await this.sessionViews(em, [await em.getRepository(TrainingSession).findOneOrFail({ where: { id: made.identifiers[0].id as number } })]))[0]
  }

  /** الجلسة تحت قفل صفها، وفي نطاق الحساب — وإلا غير موجودة */
  private async lockedSession(em: EntityManager, user: JwtPayload, id: number): Promise<TrainingSession> {
    await this.assertReady(em)
    const session = await em.getRepository(TrainingSession).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
    if (!session || !this.sessionInScope(user, session)) throw new NotFoundException(TRAINING_SESSION_NOT_FOUND)
    return session
  }

  /** تعديل جلسة مجدولة (التاريخ، المكان، المدرب، السعة، التكلفة) أو تغيير حالتها — تحت قفل صفها. السعة ماتقلّش عن المسجّلين */
  async updateSession(user: JwtPayload, id: number, input: SessionInput & { status?: unknown }) {
    this.assertManager(user)
    await this.ds.transaction(async (em) => {
      const session = await this.lockedSession(em, user, id)
      if (session.status === 'CANCELLED') throw new BadRequestException(TRAINING_SESSION_CLOSED)
      const patch: Partial<TrainingSession> = {}
      if (input.startDate !== undefined || input.endDate !== undefined) Object.assign(patch, cleanTrainingDates(input.startDate ?? day(session.startDate), input.endDate ?? day(session.endDate)))
      if (input.location !== undefined) patch.location = cleanTrainingText(input.location, 200, 'المكان')
      if (input.trainer !== undefined) patch.trainer = cleanTrainingText(input.trainer, 200, 'المدرب')
      if (input.costPerSeat !== undefined) patch.costPerSeat = cleanTrainingCost(input.costPerSeat)
      if (input.capacity !== undefined) {
        patch.capacity = cleanTrainingCapacity(input.capacity)
        const seats = await em.getRepository(TrainingEnrollment).count({ where: { sessionId: session.id, status: In(TRAINING_SEAT_STATUSES) } })
        if (patch.capacity !== null && patch.capacity < seats) throw new BadRequestException(`السعة ماتقلّش عن المسجّلين (${seats})`)
      }
      if (input.status !== undefined) patch.status = cleanSessionStatus(input.status)
      if (Object.keys(patch).length) await em.getRepository(TrainingSession).update({ id: session.id }, patch)
    })
    return this.sessionDetail(user, id)
  }

  /** جلسة بتسجيلاتها: الموظفين اللي فرعهم الحالي في نطاق الحساب بأساميهم، والباقي عدد بس */
  async sessionDetail(user: JwtPayload, id: number) {
    this.assertManager(user)
    const em = this.ds.manager
    await this.assertReady(em)
    const session = await em.getRepository(TrainingSession).findOne({ where: { id } })
    if (!session || !this.sessionInScope(user, session)) throw new NotFoundException(TRAINING_SESSION_NOT_FOUND)
    const rows = await em.getRepository(TrainingEnrollment).find({ where: { sessionId: id }, order: { id: 'ASC' } })
    const people = new Map((rows.length ? await em.getRepository(Employee).find({ where: { id: In(rows.map((row) => row.employeeId)) } }) : []).map((row) => [row.id, row]))
    const scope = branchScopeOf(user)
    const visible = rows.filter((row) => inBranchScope(scope, people.get(row.employeeId)?.branchId ?? null))
    const documents = new Map((visible.some((row) => row.documentId != null)
      ? await em.getRepository(EmployeeDocument).find({ where: { id: In(visible.map((row) => row.documentId).filter((value): value is number => value != null)) } }) : []).map((row) => [row.id, row]))
    return { session: (await this.sessionViews(em, [session]))[0], hidden: rows.length - visible.length,
      enrollments: visible.map((row) => this.enrollmentView(row, people.get(row.employeeId)?.fullName ?? '—', row.documentId != null ? documents.get(row.documentId) : undefined)) }
  }

  private enrollmentView(row: TrainingEnrollment, employeeName: string | null, document?: EmployeeDocument) {
    return { id: row.id, employeeId: row.employeeId, employeeName, status: row.status, statusLabel: TRAINING_ENROLLMENT_STATUS_LABELS[row.status] ?? row.status, result: row.result ?? null,
      rating: row.rating ?? null, ratingComment: row.ratingComment ?? null, fromRequest: row.requestId != null, completedAt: row.completedAt ?? null,
      certificate: document ? { issueDate: document.issueDate ? day(document.issueDate) : null, expiryDate: document.expiryDate ? day(document.expiryDate) : null } : null }
  }

  // ===== التسجيل =====

  /**
   * تسجيل مجموعة في جلسة — تحت قفل صف الجلسة (السعة بتتحسب تحته): الجلسة مجدولة، وكل موظف شغال وفرعه الحالي في نطاق الحساب وإلا «غير موجود»،
   * والمسجّل قبل كده بيتعدّى. كلهم أو ولا واحد لو السعة ماتكفّيش.
   */
  async enroll(user: JwtPayload, sessionId: number, rawIds: unknown, rawAudience?: unknown) {
    this.assertManager(user)
    // B-ADD.1: التسجيل بجمهور (فرع ← إدارة ← قسم ← فريق ← موظفين + «الكل ماعدا…») بيتفك لموظفينه الحاليين جوه نطاق الحساب دلوقتي، وبعدها
    // نفس أحكام التسجيل بالأسماء بالحرف (الجلسة مجدولة، والسعة، والمسجّل قبل كده بيتعدّى)
    if (rawAudience !== undefined) {
      const audience = orgAudienceJson(rawAudience, 'جمهور التسجيل')
      await assertAudienceTargets(this.ds.manager, audience, 'جمهور التسجيل')
      const members = await audienceMembersNow(this.ds.manager, audience, branchScopeOf(user))
      if (!members.length) throw new BadRequestException('مفيش موظفين في الجمهور ده جوه نطاقك')
      if (members.length > 500) throw new BadRequestException('الجمهور أكبر من 500 موظف — قسّمه على أكتر من مرة')
      rawIds = members.map((member) => member.id)
    }
    if (!Array.isArray(rawIds) || !rawIds.length || rawIds.length > 500 || rawIds.some((id) => typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1)) throw new BadRequestException('اختار موظفين (من 1 لـ500)')
    const ids = [...new Set(rawIds as number[])]
    const result = await this.ds.transaction(async (em) => {
      const session = await this.lockedSession(em, user, sessionId)
      if (session.status !== 'PLANNED') throw new BadRequestException(session.status === 'CANCELLED' ? TRAINING_SESSION_CLOSED : 'الجلسة اتعملت — التسجيل للجلسة المجدولة بس')
      const scope = branchScopeOf(user)
      const people = await em.getRepository(Employee).find({ where: { id: In(ids) } })
      const eligible = people.filter((row) => inBranchScope(scope, row.branchId) && row.isActive !== false && !ENDED.includes(row.status))
      if (eligible.length !== ids.length) throw new BadRequestException('موظف من المختارين غير موجود أو ملفه مش شغال')
      const existing = await em.getRepository(TrainingEnrollment).find({ where: { sessionId: session.id } })
      const taken = new Set(existing.filter((row) => row.status !== 'CANCELLED').map((row) => row.employeeId))
      const fresh = ids.filter((id) => !taken.has(id))
      const seats = existing.filter((row) => TRAINING_SEAT_STATUSES.includes(row.status)).length
      if (session.capacity != null && seats + fresh.length > session.capacity) throw new BadRequestException(`${TRAINING_FULL} (الباقي ${Math.max(0, session.capacity - seats)})`)
      const now = new Date()
      if (fresh.length) {
        await em.getRepository(TrainingEnrollment).insert(fresh.map((employeeId) => ({ sessionId: session.id, employeeId, status: 'ENROLLED' as const, result: null, rating: null, ratingComment: null, requestId: null,
          documentId: null, enrolledByUserId: user.sub, createdAt: now, completedAt: null })))
      }
      return { enrolled: fresh.length, already: ids.length - fresh.length }
    })
    return { ...result, ...(await this.sessionDetail(user, sessionId)) }
  }

  /** نوع مستند «شهادة تدريب» من كتالوج المستندات (بيتعمل أول مرة) — تحت قفل مدى على كوده واسمه */
  private async certificateType(em: EntityManager): Promise<string> {
    const rows: Array<{ code: string }> = await em.query('SELECT [code] FROM [doc_types] WITH (UPDLOCK, HOLDLOCK) WHERE [code] = @0 OR [nameAr] = @1', [TRAINING_CERT_CODE, TRAINING_CERT_NAME])
    if (rows.length) return rows.find((row) => row.code === TRAINING_CERT_CODE)?.code ?? rows[0].code
    await em.getRepository(DocType).insert({ code: TRAINING_CERT_CODE, nameAr: TRAINING_CERT_NAME, isActive: true, requiredForHiring: false })
    return TRAINING_CERT_CODE
  }

  /**
   * تغيير حالة تسجيل (حضر، أكمل، غاب، اتلغى) — تحت قفل صف التسجيل: الجلسة في نطاق الحساب والموظف بفرعه الحالي في نطاقه وإلا «غير موجود»؛ واللي
   * اتقفل (أكمل أو اتلغى) مابيتغيّرش. «أكمل» لدورة بتطلّع شهادة بيسجّل مستند موظف «شهادة تدريب» بتاريخ الإصدار (آخر يوم في الجلسة) وانتهائه.
   */
  async mark(user: JwtPayload, enrollmentId: number, input: { status?: unknown; result?: unknown }) {
    this.assertManager(user)
    const next = cleanEnrollmentMark(input.status), result = cleanTrainingText(input.result, 200, 'النتيجة')
    const sessionId = await this.ds.transaction(async (em) => {
      await this.assertReady(em)
      const enrollment = await em.getRepository(TrainingEnrollment).findOne({ where: { id: enrollmentId }, lock: { mode: 'pessimistic_write' } })
      const session = enrollment ? await em.getRepository(TrainingSession).findOne({ where: { id: enrollment.sessionId } }) : null
      const employee = enrollment ? await em.getRepository(Employee).findOne({ where: { id: enrollment.employeeId } }) : null
      if (!enrollment || !session || !employee || !this.sessionInScope(user, session) || !inBranchScope(branchScopeOf(user), employee.branchId)) throw new NotFoundException(TRAINING_ENROLLMENT_NOT_FOUND)
      if (!enrollmentOpen(enrollment.status)) throw new ConflictException(TRAINING_MARK_FINAL)
      if (session.status === 'CANCELLED' && next !== 'CANCELLED') throw new BadRequestException(TRAINING_SESSION_CLOSED)
      const patch: Partial<TrainingEnrollment> = { status: next as TrainingEnrollmentStatus }
      if (input.result !== undefined) patch.result = result
      if (next === 'COMPLETED') {
        patch.completedAt = new Date()
        const course = await em.getRepository(TrainingCourse).findOne({ where: { id: session.courseId } })
        if (course?.givesCertificate === true) {
          const issueDate = day(session.endDate)
          const made = await em.getRepository(EmployeeDocument).insert({ employeeId: employee.id, docType: await this.certificateType(em), issueDate, expiryDate: certificateExpiry(issueDate, course.certificateValidMonths) as unknown as string,
            notes: `شهادة دورة «${course.name}»`.slice(0, 500) })
          patch.documentId = made.identifiers[0].id as number
        }
      }
      await em.getRepository(TrainingEnrollment).update({ id: enrollment.id }, patch)
      if (next === 'COMPLETED') {
        await recordAudit(em, { category: 'SETTINGS', action: 'TRAINING_COMPLETED', entityType: 'training_enrollment', entityId: enrollment.id, actorUserId: user.sub, branchId: employee.branchId,
          summary: `إكمال تدريب: تسجيل ${enrollment.id} في جلسة ${session.id}${patch.documentId ? ' — اتسجّلت الشهادة' : ''}`, after: { status: next, documentId: patch.documentId ?? null } })
      }
      return session.id
    })
    return this.sessionDetail(user, sessionId)
  }

  /** B3.9-ب: شهادات التدريب (لإدارة التدريب) — تسجيلات أكملت ولها مستند شهادة، لموظفين فرعهم الحالي في نطاق الحساب، الأقرب انتهاءً الأول */
  async certificates(user: JwtPayload) {
    this.assertManager(user)
    const em = this.ds.manager
    if (!(await trainingReady(em))) return { available: false, message: TRAINING_MIGRATION_MISSING, certificates: [] }
    const rows = (await em.getRepository(TrainingEnrollment).find({ where: { status: 'COMPLETED' }, order: { id: 'DESC' } })).filter((row) => row.documentId != null)
    if (!rows.length) return { available: true, certificates: [] }
    const scope = branchScopeOf(user)
    const people = new Map((await em.getRepository(Employee).find({ where: { id: In([...new Set(rows.map((row) => row.employeeId))]) } })).map((row) => [row.id, row]))
    const visible = rows.filter((row) => inBranchScope(scope, people.get(row.employeeId)?.branchId ?? null))
    if (!visible.length) return { available: true, certificates: [] }
    const documents = new Map((await em.getRepository(EmployeeDocument).find({ where: { id: In(visible.map((row) => row.documentId as number)) } })).map((row) => [row.id, row]))
    const sessions = new Map((await em.getRepository(TrainingSession).find({ where: { id: In([...new Set(visible.map((row) => row.sessionId))]) } })).map((row) => [row.id, row]))
    const courses = new Map((await em.getRepository(TrainingCourse).find({ where: { id: In([...new Set([...sessions.values()].map((row) => row.courseId))]) } })).map((row) => [row.id, row.name]))
    const today = new Date().toLocaleDateString('en-CA')
    return { available: true, certificates: visible.filter((row) => documents.has(row.documentId as number)).map((row) => {
      const document = documents.get(row.documentId as number)!, expiryDate = document.expiryDate ? day(document.expiryDate) : null
      return { enrollmentId: row.id, employeeName: people.get(row.employeeId)?.fullName ?? '—', courseName: courses.get(sessions.get(row.sessionId)?.courseId ?? 0) ?? '—',
        issueDate: document.issueDate ? day(document.issueDate) : null, expiryDate, expired: expiryDate !== null && expiryDate < today }
    }).sort((left, right) => (left.expiryDate ?? '9999-12-31').localeCompare(right.expiryDate ?? '9999-12-31')) }
  }

  // ===== الموظف =====

  /** «دوراتي»: تسجيلات الموظف بدوراتها وجلساتها وشهاداتها */
  async mine(user: JwtPayload) {
    const em = this.ds.manager
    if (!(await trainingReady(em))) return { available: false, enrollments: [] }
    if (!user.employeeId) return { available: true, enrollments: [] }
    const rows = (await em.getRepository(TrainingEnrollment).find({ where: { employeeId: user.employeeId }, order: { id: 'DESC' } })).filter((row) => row.status !== 'CANCELLED')
    if (!rows.length) return { available: true, enrollments: [] }
    const sessions = new Map((await em.getRepository(TrainingSession).find({ where: { id: In([...new Set(rows.map((row) => row.sessionId))]) } })).map((row) => [row.id, row]))
    const courses = new Map((await em.getRepository(TrainingCourse).find({ where: { id: In([...new Set([...sessions.values()].map((row) => row.courseId))]) } })).map((row) => [row.id, row]))
    const documentIds = rows.map((row) => row.documentId).filter((value): value is number => value != null)
    const documents = new Map((documentIds.length ? await em.getRepository(EmployeeDocument).find({ where: { id: In(documentIds), employeeId: user.employeeId } }) : []).map((row) => [row.id, row]))
    return { available: true, enrollments: rows.filter((row) => sessions.has(row.sessionId)).map((row) => {
      const session = sessions.get(row.sessionId)!, course = courses.get(session.courseId)
      return { ...this.enrollmentView(row, null, row.documentId != null ? documents.get(row.documentId) : undefined), courseName: course?.name ?? '—', kindLabel: course ? TRAINING_KIND_LABELS[course.kind] ?? course.kind : null,
        url: course?.url ?? null, durationHours: course?.durationHours == null ? null : Number(course.durationHours), provider: course?.provider ?? null, startDate: day(session.startDate), endDate: day(session.endDate),
        location: session.location ?? null, trainer: session.trainer ?? null, sessionStatus: session.status, sessionStatusLabel: TRAINING_SESSION_STATUS_LABELS[session.status] ?? session.status,
        canRate: (row.status === 'ATTENDED' || row.status === 'COMPLETED') && row.rating == null }
    }) }
  }

  /** تقييم الموظف للتدريب — صاحب التسجيل بس، بعد الحضور أو الإكمال، ومرة واحدة، تحت قفل صف التسجيل */
  async rate(user: JwtPayload, enrollmentId: number, input: { rating?: unknown; comment?: unknown }) {
    const rating = cleanTrainingRating(input.rating), comment = cleanTrainingText(input.comment, 500, 'التعليق')
    await this.ds.transaction(async (em) => {
      await this.assertReady(em)
      const enrollment = await em.getRepository(TrainingEnrollment).findOne({ where: { id: enrollmentId }, lock: { mode: 'pessimistic_write' } })
      if (!enrollment || !user.employeeId || enrollment.employeeId !== user.employeeId) throw new NotFoundException(TRAINING_ENROLLMENT_NOT_FOUND)
      if ((enrollment.status !== 'ATTENDED' && enrollment.status !== 'COMPLETED') || enrollment.rating != null) throw new ConflictException(TRAINING_RATING_STAGE)
      await em.getRepository(TrainingEnrollment).update({ id: enrollment.id }, { rating, ratingComment: comment })
    })
    return this.mine(user)
  }
}
