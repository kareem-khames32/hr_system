import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { createHash } from 'crypto'
import { InjectDataSource } from '@nestjs/typeorm'
import { Column, DataSource, Entity, In, PrimaryGeneratedColumn, type EntityManager } from 'typeorm'
import { recordAudit } from '../audit/audit'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, inBranchScope, userHasPerm } from '../auth/guards'
import { Employee } from '../employees/employee.entity'
import { DeductionType } from '../payroll/typed-deductions.entities'
import { TypedDeductionsService } from '../payroll/typed-deductions.service'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { handlesCase } from './case-access'
import { HrCase, HrCaseEvent, HrCaseParty } from './case.entities'
import { casesReady } from './case-rules'

// B3.12 (ترحيلي 127 و128): لائحة الجزاءات — مخالفة × رقم التكرار ← الجزاء (إنذار، خصم أيام، إيقاف، فصل)، وسجل جزاءات وإنذارات الموظف.
//  التكرار بيتحسب في مدة (إعداد بالأيام) تحت قفل صف الموظف. الجزاء المالي (خصم أيام) بيعمل **خصم مصنّف من النوع الموجود** بخدمته
//  نفسها — برّه أي معاملة هنا — فبيمشي في سلسلة الخصومات ودفترها زي أي خصم؛ والصف هنا السجل والرابط (بالقضية وبطلب الخصم) بس.
//  الإيقاف والفصل بيتسجّلوا هنا وتنفيذهم في موديولاتهم. نفس الشكل في الترحيلات بالحرف (من غير افتراضي).

export const PENALTY_ACTIONS = ['WARNING', 'DEDUCT_DAYS', 'SUSPENSION', 'TERMINATION'] as const
export type PenaltyAction = (typeof PENALTY_ACTIONS)[number]
export interface PenaltyStep { action: PenaltyAction; days: number | null }

@Entity('penalty_violations')
export class PenaltyViolation {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_penalty_violations' })
  id: number

  @Column({ type: 'nvarchar', length: 100 })
  category: string

  @Column({ type: 'nvarchar', length: 200 })
  name: string

  // درجات التكرار (JSON): من 1 لـ4 — كل درجة جزاء وأيامه
  @Column({ type: 'nvarchar', length: 'max' })
  steps: string

  // نوع الخصم المصنّف اللي بيتعمل منه الجزاء المالي (deduction_types.id)
  @Column({ type: 'int', nullable: true })
  deductionTypeId: number | null

  @Column({ type: 'bit' })
  isActive: boolean

  @Column({ type: 'int' })
  createdByUserId: number

  @Column({ type: 'datetime2' })
  createdAt: Date
}

@Entity('employee_penalties')
export class EmployeePenalty {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_employee_penalties' })
  id: number

  @Column({ type: 'int' })
  employeeId: number

  @Column({ type: 'int' })
  violationId: number

  @Column({ type: 'int' })
  occurrence: number

  @Column({ type: 'nvarchar', length: 20 })
  action: PenaltyAction

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  days: string | null

  @Column({ type: 'int', nullable: true })
  caseId: number | null

  // طلب الخصم المصنّف اللي اتعمل من الجزاء (deduction_requests.id)
  @Column({ type: 'int', nullable: true })
  deductionRequestId: number | null

  @Column({ type: 'nvarchar', length: 1000, nullable: true })
  note: string | null

  @Column({ type: 'date' })
  incidentDate: string

  // ACTIVE ساري / CANCELLED ملغى (مابيتحسبش في التكرار) / PENDING حجز جزاء خصم لحد ما طلب خصمه يثبت (مابيتحسبش، وبيوقّف توقيع تاني لنفس
  // الموظف والمخالفة لحد ما يتحسم)
  @Column({ type: 'nvarchar', length: 20 })
  status: 'ACTIVE' | 'CANCELLED' | 'PENDING'

  @Column({ type: 'int' })
  createdByUserId: number

  @Column({ type: 'datetime2' })
  createdAt: Date

  @Column({ type: 'int', nullable: true })
  cancelledByUserId: number | null

  @Column({ type: 'datetime2', nullable: true })
  cancelledAt: Date | null

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  cancelReason: string | null
}

export const PENALTIES_PERMISSION = 'cases.penalties'
export const PENALTIES_MIGRATION_MISSING = 'لائحة الجزاءات محتاجة ترحيلي 20261009_127 و20261009_128 على قاعدة البيانات'
export const PENALTY_NOT_FOUND = 'الجزاء غير موجود'
export const PENALTY_VIOLATION_NOT_FOUND = 'المخالفة غير موجودة في اللائحة'
export const PENALTY_NAME = 'الفئة (2–100 حرف) واسم المخالفة (3–200 حرف) مطلوبين'
export const PENALTY_STEPS = 'درجات التكرار: من 1 لـ4 — كل درجة إنذار، أو خصم أيام (من ربع يوم لـ30)، أو إيقاف (من يوم لـ30)، أو فصل'
export const PENALTY_DEDUCTION_TYPE = 'المخالفة اللي فيها خصم أيام محتاجة نوع خصم مصنّف متاح بطريقة «أيام من الراتب»'
export const PENALTY_EMPLOYEE = 'الموظف غير موجود'
export const PENALTY_DATE = 'تاريخ الواقعة تاريخ صحيح مش في المستقبل'
export const PENALTY_PERIOD = 'شهر المسير المستهدف (YYYY-MM) مطلوب لجزاء الخصم'
export const PENALTY_CHANGED = 'رقم التكرار أو الجزاء اتغيّر عن اللي اتعرض — راجع المعاينة تاني'
export const PENALTY_IN_PROGRESS = 'فيه جزاء لنفس الموظف والمخالفة لسه بيتسجّل — استنى لحظة وجرّب تاني'
export const PENALTY_EXPIRED = 'التوقيع اتأخر وحجزه اتلغى — راجع المعاينة ووقّع تاني'
/** حجز جزاء خصم أقدم من كده ومالوش طلب خصم = محاولة اتقطعت قبل ما الخصم يتعمل: بيتشال */
export const PENALTY_PENDING_MINUTES = 10
/** علامة دايمة في سبب طلب الخصم: الجزاء بيلاقي بيها خصمه لو الرد وقع بعد ما الطلب ثبت (مايتعملش مرتين) */
/** وصف في سبب طلب الخصم للي بيقراه — مش مرجع: محدش بيدوّر بيه (Codex P3L-B03) */
export const penaltyMarker = (penaltyId: number): string => `(جزاء رقم ${penaltyId})`
/**
 * Codex P3K-B12-01: بصمة اللي المعاينة عرضته — المخالفة ورقم التكرار والجزاء وأيامه ونوع الخصم ومدة احتساب التكرار. التوقيع لازم يبعتها زي
 * ما هي: أي تغيير في اللائحة أو التكرار أو المدة بين المعاينة والتوقيع = 409.
 */
export function penaltyFingerprint(violation: Pick<PenaltyViolation, 'id' | 'deductionTypeId'>, occurrence: number, step: PenaltyStep, windowDays: number): string {
  return createHash('sha256').update(JSON.stringify([violation.id, occurrence, step.action, step.days ?? null, violation.deductionTypeId ?? null, windowDays])).digest('hex').slice(0, 32)
}
export const PENALTY_CASE = 'القضية مش متاحة لتنفيذ الجزاء: لازم تكون مطّلع عليها، واتقرر فيها بإنذار أو جزاء، والموظف مشكو في حقه فيها'
export const PENALTY_CANCELLED = 'الجزاء ده ملغى'
export const PENALTY_CANCEL_REASON = 'سبب الإلغاء مطلوب (من 3 لـ500 حرف)'
/** مدة احتساب التكرار بالأيام (إعداد في requests_config)؛ الغايب أو الغلط = 180 */
export const PENALTY_WINDOW_KEY = 'cases.repeat_window_days'
export const PENALTY_WINDOW_DEFAULT = 180
export const PENALTY_ACTION_LABELS: Record<PenaltyAction, string> = { WARNING: 'إنذار كتابي', DEDUCT_DAYS: 'خصم أيام', SUSPENSION: 'إيقاف عن العمل', TERMINATION: 'فصل' }
const ORDINALS = ['الأول', 'التاني', 'التالت', 'الرابع']

let ready: boolean | null = null
/** جدولي ترحيلي 127 و128 موجودين؟ الموجود بيتحفظ */
export async function penaltiesReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.penalty_violations', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.employee_penalties', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الترحيل */
export function resetPenaltiesCache() { ready = null }

const line = (raw: unknown): string => (typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : '')
const realDay = (raw: unknown): string | null => {
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
  const date = new Date(`${raw}T00:00:00Z`)
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw ? null : raw
}

/** درجات تكرار المخالفة: من 1 لـ4؛ خصم الأيام بأرباع اليوم لحد 30، والإيقاف بأيام صحيحة لحد 30 */
export function cleanPenaltySteps(raw: unknown): PenaltyStep[] {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 4) throw new BadRequestException(PENALTY_STEPS)
  return raw.map((entry) => {
    const step = entry as { action?: unknown; days?: unknown }
    if (!entry || typeof entry !== 'object' || typeof step.action !== 'string' || !(PENALTY_ACTIONS as readonly string[]).includes(step.action)) throw new BadRequestException(PENALTY_STEPS)
    const action = step.action as PenaltyAction
    if (action === 'WARNING' || action === 'TERMINATION') {
      if (step.days !== undefined && step.days !== null) throw new BadRequestException(PENALTY_STEPS)
      return { action, days: null }
    }
    const days = step.days
    const valid = typeof days === 'number' && days > 0 && days <= 30 && (action === 'DEDUCT_DAYS' ? Number.isInteger(days * 4) : Number.isInteger(days))
    if (!valid) throw new BadRequestException(PENALTY_STEPS)
    return { action, days: days as number }
  })
}
export const parsePenaltySteps = (text: string | null | undefined): PenaltyStep[] => { try { return cleanPenaltySteps(JSON.parse(text || '[]')) } catch { return [] } }

/** الجزاء لرقم تكرار: درجته في اللائحة، واللي بعد آخر درجة بياخد آخر درجة */
export function penaltyStepFor(steps: PenaltyStep[], occurrence: number): PenaltyStep | null {
  return steps.length ? steps[Math.min(Math.max(occurrence, 1), steps.length) - 1] : null
}
export function penaltyWindowDays(raw: string | null | undefined): number {
  const value = Number(raw)
  return Number.isInteger(value) && value >= 1 && value <= 3650 ? value : PENALTY_WINDOW_DEFAULT
}
export const occurrenceLabel = (occurrence: number): string => `التكرار ${ORDINALS[occurrence - 1] ?? `رقم ${occurrence}`}`
export const penaltyLabel = (step: PenaltyStep): string => (step.days ? `${PENALTY_ACTION_LABELS[step.action]} (${step.days} يوم)` : PENALTY_ACTION_LABELS[step.action])
const dayBefore = (date: string, days: number): string => new Date(Date.parse(`${date}T00:00:00Z`) - days * 86400000).toISOString().slice(0, 10)

export interface ViolationInput { category?: unknown; name?: unknown; steps?: unknown; deductionTypeId?: unknown; isActive?: unknown }
export interface ApplyInput { employeeId?: unknown; violationId?: unknown; incidentDate?: unknown; targetPeriod?: unknown; caseId?: unknown; note?: unknown; expectedFingerprint?: unknown }

@Injectable()
export class PenaltiesService {
  constructor(@InjectDataSource() private readonly ds: DataSource, private readonly deductions: TypedDeductionsService) {}

  private assertManager(user: JwtPayload) {
    if (!userHasPerm(user, PENALTIES_PERMISSION)) throw new ForbiddenException('الإجراء ده لصاحب صلاحية لائحة الجزاءات')
  }
  private async assertReady(em: EntityManager) {
    if (!(await penaltiesReady(em))) throw new BadRequestException(PENALTIES_MIGRATION_MISSING)
  }

  // ===== اللائحة =====

  private violationView(row: PenaltyViolation, types: Map<number, string>) {
    const steps = parsePenaltySteps(row.steps)
    return { id: row.id, category: row.category, name: row.name, steps: steps.map((step, index) => ({ ...step, label: penaltyLabel(step), occurrenceLabel: occurrenceLabel(index + 1) })),
      deductionTypeId: row.deductionTypeId ?? null, deductionTypeName: row.deductionTypeId != null ? types.get(row.deductionTypeId) ?? null : null, isActive: row.isActive === true }
  }

  async catalog(user: JwtPayload) {
    this.assertManager(user)
    const em = this.ds.manager
    if (!(await penaltiesReady(em))) return { available: false, message: PENALTIES_MIGRATION_MISSING, windowDays: PENALTY_WINDOW_DEFAULT, violations: [], deductionTypes: [] }
    const rows = await em.getRepository(PenaltyViolation).find({ order: { category: 'ASC', id: 'ASC' } })
    const types = await em.getRepository(DeductionType).find({ where: { isActive: true, calcMethod: 'DAYS_OF_SALARY' }, order: { nameAr: 'ASC' } })
    const names = new Map((await em.getRepository(DeductionType).find()).map((row) => [row.id, row.nameAr]))
    return { available: true, windowDays: penaltyWindowDays((await em.getRepository(RequestsConfig).findOne({ where: { key: PENALTY_WINDOW_KEY } }))?.value),
      violations: rows.map((row) => this.violationView(row, names)), deductionTypes: types.map((row) => ({ id: row.id, nameAr: row.nameAr })) }
  }

  /** خانات المخالفة بعد الحكم عليها: درجاتها، ونوع الخصم لو فيها خصم أيام */
  private async violationFields(em: EntityManager, input: ViolationInput, current: PenaltyViolation | null) {
    const category = input.category !== undefined || !current ? line(input.category) : current.category
    const name = input.name !== undefined || !current ? line(input.name) : current.name
    if (category.length < 2 || category.length > 100 || name.length < 3 || name.length > 200) throw new BadRequestException(PENALTY_NAME)
    const steps = input.steps !== undefined || !current ? cleanPenaltySteps(input.steps) : parsePenaltySteps(current.steps)
    let deductionTypeId = current?.deductionTypeId ?? null
    if (input.deductionTypeId !== undefined) deductionTypeId = input.deductionTypeId === null || input.deductionTypeId === '' ? null : Number(input.deductionTypeId)
    if (steps.some((step) => step.action === 'DEDUCT_DAYS')) {
      const type = deductionTypeId && Number.isSafeInteger(deductionTypeId) ? await em.getRepository(DeductionType).findOne({ where: { id: deductionTypeId } }) : null
      if (!type || type.isActive !== true || type.calcMethod !== 'DAYS_OF_SALARY') throw new BadRequestException(PENALTY_DEDUCTION_TYPE)
    } else deductionTypeId = null
    if (input.isActive !== undefined && typeof input.isActive !== 'boolean') throw new BadRequestException('«متاحة» نعم أو لا')
    return { category, name, steps: JSON.stringify(steps), deductionTypeId, isActive: input.isActive !== undefined ? input.isActive === true : current ? current.isActive === true : true }
  }

  async createViolation(user: JwtPayload, input: ViolationInput) {
    this.assertManager(user)
    const em = this.ds.manager
    await this.assertReady(em)
    await em.getRepository(PenaltyViolation).insert({ ...(await this.violationFields(em, input, null)), createdByUserId: user.sub, createdAt: new Date() })
    return this.catalog(user)
  }

  /** تعديل مخالفة — تحت قفل صفها. الجزاءات اللي اتوقّعت شايلة لقطتها، فمابتتغيّرش */
  async updateViolation(user: JwtPayload, id: number, input: ViolationInput) {
    this.assertManager(user)
    await this.ds.transaction(async (em) => {
      await this.assertReady(em)
      const row = await em.getRepository(PenaltyViolation).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!row) throw new NotFoundException(PENALTY_VIOLATION_NOT_FOUND)
      await em.getRepository(PenaltyViolation).update({ id: row.id }, await this.violationFields(em, input, row))
    })
    return this.catalog(user)
  }

  // ===== التوقيع =====

  /** رقم التكرار والجزاء لموظف ومخالفة وتاريخ واقعة: الجزاءات السارية لنفس المخالفة في المدة قبل التاريخ + 1 */
  private async judge(em: EntityManager, employeeId: number, violation: PenaltyViolation, incidentDate: string) {
    const windowDays = penaltyWindowDays((await em.getRepository(RequestsConfig).findOne({ where: { key: PENALTY_WINDOW_KEY } }))?.value)
    const from = dayBefore(incidentDate, windowDays)
    // الساري بس: الحجز (PENDING) عمره ما ليه خصم — الخصم وتثبيت الجزاء ساري بيتكتبوا في معاملة واحدة — فالمعاينة والتوقيع بيعدّوا نفس العدّ
    const earlier = (await em.getRepository(EmployeePenalty).find({ where: { employeeId, violationId: violation.id, status: 'ACTIVE' } })).filter((row) => {
      const at = String(row.incidentDate).slice(0, 10)
      return at >= from && at <= incidentDate
    })
    const occurrence = earlier.length + 1, step = penaltyStepFor(parsePenaltySteps(violation.steps), occurrence)
    if (!step) throw new BadRequestException(PENALTY_VIOLATION_NOT_FOUND)
    return { occurrence, step, windowDays }
  }

  /** الموظف (بفرعه الحالي في نطاق الحساب) والمخالفة (متاحة) والتاريخ — وإلا رسالتهم */
  private async target(em: EntityManager, user: JwtPayload, input: ApplyInput) {
    const incidentDate = realDay(input.incidentDate)
    if (!incidentDate || incidentDate > new Date().toLocaleDateString('en-CA')) throw new BadRequestException(PENALTY_DATE)
    const employee = typeof input.employeeId === 'number' && Number.isSafeInteger(input.employeeId) ? await em.getRepository(Employee).findOne({ where: { id: input.employeeId } }) : null
    if (!employee || !inBranchScope(branchScopeOf(user), employee.branchId)) throw new BadRequestException(PENALTY_EMPLOYEE)
    const violation = typeof input.violationId === 'number' && Number.isSafeInteger(input.violationId) ? await em.getRepository(PenaltyViolation).findOne({ where: { id: input.violationId } }) : null
    if (!violation || violation.isActive !== true) throw new BadRequestException(PENALTY_VIOLATION_NOT_FOUND)
    return { employee, violation, incidentDate }
  }

  /** معاينة: رقم التكرار والجزاء اللي هيتوقّع — من غير كتابة */
  async preview(user: JwtPayload, input: ApplyInput) {
    this.assertManager(user)
    const em = this.ds.manager
    await this.assertReady(em)
    const { employee, violation, incidentDate } = await this.target(em, user, input)
    const { occurrence, step, windowDays } = await this.judge(em, employee.id, violation, incidentDate)
    return { employeeName: employee.fullName, violationName: violation.name, incidentDate, occurrence, occurrenceLabel: occurrenceLabel(occurrence), action: step.action, days: step.days, label: penaltyLabel(step),
      windowDays, needsPeriod: step.action === 'DEDUCT_DAYS', fingerprint: penaltyFingerprint(violation, occurrence, step, windowDays) }
  }

  /** قضية الجزاء: الحساب مطّلع عليها، واتقرر فيها بإنذار أو جزاء، والموظف مشكو في حقه فيها — وإلا رسالة واحدة */
  private async caseOf(em: EntityManager, user: JwtPayload, raw: unknown, employeeId: number): Promise<HrCase | null> {
    if (raw === undefined || raw === null || raw === '') return null
    const id = typeof raw === 'number' && Number.isSafeInteger(raw) ? raw : 0
    const row = id && (await casesReady(em)) ? await em.getRepository(HrCase).findOne({ where: { id } }) : null
    const parties = row ? await em.getRepository(HrCaseParty).find({ where: { caseId: row.id } }) : []
    const allowed = !!row && (row.status === 'DECIDED' || row.status === 'CLOSED') && (row.outcome === 'WARNING' || row.outcome === 'PENALTY')
      && (await handlesCase(em, user, row.id)) && parties.some((entry) => entry.role === 'RESPONDENT' && entry.employeeId === employeeId)
    if (!allowed) throw new BadRequestException(PENALTY_CASE)
    return row
  }

  /**
   * حجوزات لسه مااكتملتش لنفس الموظف والمخالفة (جزاء خصم طلبه بيتعمل برّه المعاملة) بتتحسم قبل أي حكم جديد، تحت قفل صف الموظف.
   * Codex P3L-B03/B05: الحجز عمره ما ليه خصم (الخصم وتثبيت الجزاء في معاملة واحدة)، فمفيش بحث عن خصمه: قديم = محاولة اتقطعت وبيتشال —
   * وكاتبه لو لسه شغال خصمه بيرجع لأن ربطه مشروط بوجود الحجز؛ ولسه جديد = التوقيع التاني بيستنى (409) بدل ما يحسبه سابقة أو يتجاهله.
   */
  private async settlePending(em: EntityManager, employeeId: number, violationId: number) {
    for (const row of await em.getRepository(EmployeePenalty).find({ where: { employeeId, violationId, status: 'PENDING' } })) {
      if (Date.now() - new Date(row.createdAt).getTime() <= PENALTY_PENDING_MINUTES * 60000) throw new ConflictException(PENALTY_IN_PROGRESS)
      await em.getRepository(EmployeePenalty).createQueryBuilder().delete().where('id = :id AND status = :status', { id: row.id, status: 'PENDING' }).execute()
    }
  }

  /**
   * توقيع جزاء: التكرار بيتحسب تحت قفل صف الموظف، وبصمة اللي اتعرض في المعاينة لازم تطابق (وإلا 409). الصف بيتسجّل (ومعاه حدث في ملف القضية
   * لو مربوط). جزاء الخصم بيتسجّل «حجز» الأول، وبعد المعاملة بيعمل خصم مصنّف بخدمة الخصومات نفسها (نطاقها وسقفها وسلسلتها) وبيتثبّت ساري
   * مربوط بيه — لو رفضت، الحجز بيتشال والرفض بيطلع؛ ولو الرد وقع بعد ما الطلب ثبت، الجزاء بيلاقيه بعلامته وبيتربط (مايتعملش مرتين).
   */
  async apply(user: JwtPayload, input: ApplyInput) {
    this.assertManager(user)
    const note = input.note === undefined || input.note === null ? null : line(input.note).slice(0, 1000) || null
    const made = await this.ds.transaction(async (em) => {
      await this.assertReady(em)
      // قفل صف الموظف الأول: الحكم كله (النطاق بفرعه الحالي، والمخالفة، والتكرار) بيتاخد بعده — نقل في النص مايعدّيش بحكم قديم
      if (typeof input.employeeId === 'number' && Number.isSafeInteger(input.employeeId)) await em.getRepository(Employee).findOne({ where: { id: input.employeeId }, lock: { mode: 'pessimistic_write' } })
      const { employee, violation, incidentDate } = await this.target(em, user, input)
      await this.settlePending(em, employee.id, violation.id)
      const { occurrence, step, windowDays } = await this.judge(em, employee.id, violation, incidentDate)
      if (typeof input.expectedFingerprint !== 'string' || input.expectedFingerprint !== penaltyFingerprint(violation, occurrence, step, windowDays)) throw new ConflictException(PENALTY_CHANGED)
      const targetPeriod = typeof input.targetPeriod === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(input.targetPeriod) ? input.targetPeriod : null
      if (step.action === 'DEDUCT_DAYS' && !targetPeriod) throw new BadRequestException(PENALTY_PERIOD)
      const linked = await this.caseOf(em, user, input.caseId, employee.id)
      const inserted = await em.getRepository(EmployeePenalty).insert({ employeeId: employee.id, violationId: violation.id, occurrence, action: step.action, days: step.days === null ? null : step.days.toFixed(2),
        caseId: linked?.id ?? null, deductionRequestId: null, note, incidentDate, status: step.action === 'DEDUCT_DAYS' ? 'PENDING' : 'ACTIVE', createdByUserId: user.sub, createdAt: new Date(), cancelledByUserId: null, cancelledAt: null, cancelReason: null })
      const id = inserted.identifiers[0].id as number
      const text = `${violation.name} — ${occurrenceLabel(occurrence)}: ${penaltyLabel(step)}`
      await recordAudit(em, { category: 'SETTINGS', action: 'PENALTY_APPLIED', entityType: 'employee_penalty', entityId: id, actorUserId: user.sub, branchId: employee.branchId,
        summary: `جزاء على موظف رقم ${employee.id}: ${text}`, after: { violationId: violation.id, occurrence, action: step.action, days: step.days, caseId: linked?.id ?? null } })
      return { id, employeeId: employee.id, deductionTypeId: violation.deductionTypeId, step, incidentDate, targetPeriod, caseId: linked?.id ?? null, text,
        reason: `جزاء من لائحة الجزاءات ${penaltyMarker(id)}: ${text}${linked ? ` (ملف قضية رقم ${linked.id})` : ''}` }
    })
    if (made.step.action === 'DEDUCT_DAYS') {
      try {
        await this.deductions.create(user, { employeeId: made.employeeId, deductionTypeId: made.deductionTypeId as number, inputValue: String(made.step.days), incidentDate: made.incidentDate,
          reason: made.reason, targetPeriod: made.targetPeriod as string }, {
          // Codex P3L-B03/B05: تثبيت الجزاء ساري وربطه بخصمه جوه معاملة الخصم نفسها، بكتابة مشروطة بإن الحجز لسه موجود: الخصم وربطه بيثبتوا
          // مع بعض، وتوقيع اتأخر لحد ما حجزه اتشال خصمه بيرجع (مفيش خصمين لجزاء واحد، ومفيش بحث بنص السبب)
          afterSave: async (em, requestId) => {
            const linked = await em.getRepository(EmployeePenalty).update({ id: made.id, status: 'PENDING' }, { deductionRequestId: requestId, status: 'ACTIVE' })
            if (!linked.affected) throw new ConflictException(PENALTY_EXPIRED)
          } })
      } catch (error) {
        // الخصم وربطه ثبتوا والرد بس اللي وقع: الجزاء ساري بخصمه. غير كده مفيش خصم (الخصومات رفضت: نطاق، سقف، فترة مقفولة…): الحجز بيتشال والرفض بيطلع
        const now = await this.ds.getRepository(EmployeePenalty).findOne({ where: { id: made.id } })
        if (!(now?.status === 'ACTIVE' && now.deductionRequestId != null)) {
          await this.ds.getRepository(EmployeePenalty).createQueryBuilder().delete().where('id = :id AND status = :status', { id: made.id, status: 'PENDING' }).execute()
          throw error
        }
      }
    }
    // حدث التنفيذ في ملف القضية بعد ما الجزاء (وخصمه) يثبت — الخط الزمني بيتزوّد بس، فمابيتكتبش قبل كده
    if (made.caseId) {
      await this.ds.getRepository(HrCaseEvent).insert({ caseId: made.caseId, kind: 'STATUS', body: `تنفيذ القرار — ${made.text}`, employeeId: made.employeeId, fileId: null, createdByUserId: user.sub, createdAt: new Date() })
    }
    return (await this.register(user, { employeeId: made.employeeId })).penalties.find((row) => row.id === made.id)
  }

  // ===== السجل =====

  private async views(em: EntityManager, rows: EmployeePenalty[], withEmployee: boolean) {
    const violations = new Map((rows.length ? await em.getRepository(PenaltyViolation).find({ where: { id: In([...new Set(rows.map((row) => row.violationId))]) } }) : []).map((row) => [row.id, row]))
    const people = new Map((withEmployee && rows.length ? await em.getRepository(Employee).find({ where: { id: In([...new Set(rows.map((row) => row.employeeId))]) } }) : []).map((row) => [row.id, row]))
    return rows.map((row) => {
      const step: PenaltyStep = { action: row.action, days: row.days === null || row.days === undefined ? null : Number(row.days) }
      return { id: row.id, ...(withEmployee ? { employeeId: row.employeeId, employeeName: people.get(row.employeeId)?.fullName ?? '—' } : {}), violationName: violations.get(row.violationId)?.name ?? '—',
        category: violations.get(row.violationId)?.category ?? null, occurrence: row.occurrence, occurrenceLabel: occurrenceLabel(row.occurrence), action: row.action, days: step.days, label: penaltyLabel(step),
        incidentDate: String(row.incidentDate).slice(0, 10), status: row.status, statusLabel: row.status === 'ACTIVE' ? 'ساري' : row.status === 'PENDING' ? 'قيد التسجيل' : 'ملغى', caseId: row.caseId ?? null, deductionRequestId: row.deductionRequestId ?? null,
        note: row.note ?? null, cancelReason: row.cancelReason ?? null, createdAt: row.createdAt }
    })
  }

  /** سجل الجزاءات (بالصلاحية): لموظفين فرعهم الحالي في نطاق الحساب، واختياريًا لموظف واحد */
  async register(user: JwtPayload, filter: { employeeId?: unknown } = {}) {
    this.assertManager(user)
    const em = this.ds.manager
    if (!(await penaltiesReady(em))) return { available: false, message: PENALTIES_MIGRATION_MISSING, penalties: [] }
    const wanted = filter.employeeId === undefined || filter.employeeId === null || filter.employeeId === '' ? null : Number(filter.employeeId)
    if (wanted !== null && (!Number.isSafeInteger(wanted) || wanted < 1)) throw new BadRequestException(PENALTY_EMPLOYEE)
    const rows = await em.getRepository(EmployeePenalty).find({ where: wanted ? { employeeId: wanted } : {}, order: { id: 'DESC' }, take: 500 })
    const scope = branchScopeOf(user)
    const people = new Map((rows.length ? await em.getRepository(Employee).find({ where: { id: In([...new Set(rows.map((row) => row.employeeId))]) } }) : []).map((row) => [row.id, row]))
    return { available: true, penalties: await this.views(em, rows.filter((row) => inBranchScope(scope, people.get(row.employeeId)?.branchId ?? null)), true) }
  }

  /** «جزاءاتي»: جزاءات الموظف نفسه السارية */
  async mine(user: JwtPayload) {
    const em = this.ds.manager
    if (!user.employeeId || !(await penaltiesReady(em))) return { penalties: [] }
    const rows = await em.getRepository(EmployeePenalty).find({ where: { employeeId: user.employeeId, status: 'ACTIVE' }, order: { id: 'DESC' } })
    return { penalties: (await this.views(em, rows, false)).map(({ note: _note, cancelReason: _reason, caseId: _case, ...row }) => row) }
  }

  /** إلغاء جزاء (بسبب) — تحت قفل صفه، والموظف في نطاق الحساب. الخصم المصنّف المرتبط بيتلغى من شاشة الخصومات بحكمها */
  async cancel(user: JwtPayload, id: number, rawReason: unknown) {
    this.assertManager(user)
    const reason = line(rawReason)
    if (reason.length < 3 || reason.length > 500) throw new BadRequestException(PENALTY_CANCEL_REASON)
    const employeeId = await this.ds.transaction(async (em) => {
      await this.assertReady(em)
      const row = await em.getRepository(EmployeePenalty).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
      const employee = row ? await em.getRepository(Employee).findOne({ where: { id: row.employeeId } }) : null
      if (!row || !employee || !inBranchScope(branchScopeOf(user), employee.branchId)) throw new NotFoundException(PENALTY_NOT_FOUND)
      if (row.status !== 'ACTIVE') throw new ConflictException(PENALTY_CANCELLED)
      await em.getRepository(EmployeePenalty).update({ id: row.id }, { status: 'CANCELLED', cancelledByUserId: user.sub, cancelledAt: new Date(), cancelReason: reason })
      await recordAudit(em, { category: 'SETTINGS', action: 'PENALTY_CANCELLED', entityType: 'employee_penalty', entityId: row.id, actorUserId: user.sub, branchId: employee.branchId,
        summary: `إلغاء جزاء رقم ${row.id}: ${reason}`, before: { status: 'ACTIVE' }, after: { status: 'CANCELLED', reason } })
      return row.employeeId
    })
    return (await this.register(user, { employeeId })).penalties.find((row) => row.id === id)
  }
}
