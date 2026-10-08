import { Column, Entity, PrimaryGeneratedColumn, type EntityManager } from 'typeorm'

// B5.2 (ب): اشتراكات التأمين الطبي وطلبات شركة التأمين.
//  - الاشتراك: عضو (الموظف نفسه أو معال من معاليه) على فئة في وثيقة، برقم بطاقته ومن/إلى. اشتراك ساري واحد للعضو.
//  - طلب شركة التأمين: إضافة أو حذف عضو — بيتسجّل، يتبعت في الكشف، وبعد رد الشركة «تم» بيعمل الاشتراك (برقم البطاقة) أو ينهيه.
//  - طلبات الحذف بتطلع لوحدها مع فتح ملف إنهاء الخدمة ومع حذف معال — لو للعضو اشتراك ساري. مفيش مبلغ هنا.

export type EnrollmentStatus = 'ACTIVE' | 'ENDED'
@Entity('insurance_enrollments')
export class InsuranceEnrollment {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_insurance_enrollments' })
  id: number

  @Column({ type: 'int' })
  policyId: number

  @Column({ type: 'int' })
  classId: number

  @Column({ type: 'int' })
  employeeId: number

  /** المعال المشترك، أو فاضي = الموظف نفسه */
  @Column({ type: 'int', nullable: true })
  dependentId: number | null

  @Column({ type: 'nvarchar', length: 60, nullable: true })
  cardNumber: string | null

  @Column({ type: 'date' })
  startDate: string

  @Column({ type: 'date', nullable: true })
  endDate: string | null

  @Column({ type: 'nvarchar', length: 20 })
  status: EnrollmentStatus

  @Column({ type: 'int' })
  createdByUserId: number

  @Column({ type: 'datetime2' })
  createdAt: Date

  @Column({ type: 'int', nullable: true })
  updatedByUserId: number | null

  @Column({ type: 'datetime2', nullable: true })
  updatedAt: Date | null
}

export type MemberRequestKind = 'ADD' | 'REMOVE'
export type MemberRequestStatus = 'PENDING' | 'SENT' | 'DONE' | 'CANCELLED'
export type MemberRequestOrigin = 'MANUAL' | 'OFFBOARDING' | 'DEPENDENT'
@Entity('insurance_member_requests')
export class InsuranceMemberRequest {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_insurance_member_requests' })
  id: number

  @Column({ type: 'nvarchar', length: 10 })
  kind: MemberRequestKind

  @Column({ type: 'int' })
  policyId: number

  @Column({ type: 'int' })
  classId: number

  @Column({ type: 'int' })
  employeeId: number

  @Column({ type: 'int', nullable: true })
  dependentId: number | null

  /** الاشتراك اللي طلب الحذف بينهيه */
  @Column({ type: 'int', nullable: true })
  enrollmentId: number | null

  @Column({ type: 'nvarchar', length: 20 })
  status: MemberRequestStatus

  /** MANUAL من الشاشة · OFFBOARDING مع ملف إنهاء الخدمة · DEPENDENT مع حذف المعال */
  @Column({ type: 'nvarchar', length: 20 })
  origin: MemberRequestOrigin

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  reason: string | null

  /** تاريخ بداية التغطية (إضافة) أو نهايتها (حذف) زي ما شركة التأمين ردّت */
  @Column({ type: 'date', nullable: true })
  effectiveDate: string | null

  @Column({ type: 'nvarchar', length: 60, nullable: true })
  cardNumber: string | null

  /** 0 = النظام (طلب طلع لوحده) */
  @Column({ type: 'int' })
  createdByUserId: number

  @Column({ type: 'datetime2' })
  createdAt: Date

  @Column({ type: 'int', nullable: true })
  sentByUserId: number | null

  @Column({ type: 'datetime2', nullable: true })
  sentAt: Date | null

  @Column({ type: 'int', nullable: true })
  closedByUserId: number | null

  @Column({ type: 'datetime2', nullable: true })
  closedAt: Date | null
}

// ===== القواعد (حساب نقي) =====

export const MEMBER_REQUEST_KIND_LABELS: Record<MemberRequestKind, string> = { ADD: 'إضافة', REMOVE: 'حذف' }
export const MEMBER_REQUEST_STATUS_LABELS: Record<MemberRequestStatus, string> = { PENDING: 'مستني الكشف', SENT: 'اتبعت لشركة التأمين', DONE: 'تم', CANCELLED: 'ملغي' }
export const MEMBER_REQUEST_ORIGIN_LABELS: Record<MemberRequestOrigin, string> = { MANUAL: 'من الشاشة', OFFBOARDING: 'إنهاء خدمة', DEPENDENT: 'حذف معال' }
/** الطلب المفتوح: لسه ماتقفلش بـ«تم» ولا اتلغى */
export const OPEN_REQUEST_STATUSES: readonly MemberRequestStatus[] = ['PENDING', 'SENT']
export const requestStepAllowed = (step: 'send' | 'done' | 'cancel', status: MemberRequestStatus) =>
  step === 'send' ? status === 'PENDING' : OPEN_REQUEST_STATUSES.includes(status)

const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/
const realDay = (value: unknown): value is string => {
  if (typeof value !== 'string' || !DAY.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  // شهر أو يوم برّه المدى = تاريخ مش صالح (toISOString بترمي عليه)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}
/** رد شركة التأمين: تاريخ السريان (مطلوب)، ورقم البطاقة (مطلوب للإضافة) */
export function requestOutcome(kind: MemberRequestKind, body: unknown): { effectiveDate: string; cardNumber: string | null; error: null } | { effectiveDate: null; cardNumber: null; error: string } {
  const input = (body ?? {}) as Record<string, unknown>
  const fail = (error: string) => ({ effectiveDate: null, cardNumber: null, error })
  if (!realDay(input.effectiveDate)) return fail(kind === 'ADD' ? 'تاريخ بداية التغطية مطلوب بصيغة YYYY-MM-DD' : 'تاريخ نهاية التغطية مطلوب بصيغة YYYY-MM-DD')
  if (input.cardNumber !== undefined && input.cardNumber !== null && typeof input.cardNumber !== 'string') return fail('رقم البطاقة نص')
  const cardNumber = typeof input.cardNumber === 'string' ? input.cardNumber.trim() : ''
  if (cardNumber.length > 60) return fail('رقم البطاقة 60 حرف بالكتير')
  if (kind === 'ADD' && !cardNumber) return fail('رقم بطاقة التأمين مطلوب عشان الاشتراك يتسجّل')
  return { effectiveDate: input.effectiveDate, cardNumber: cardNumber || null, error: null }
}
export function requestReason(raw: unknown, required: boolean): { reason: string | null; error: string | null } {
  if (raw !== undefined && raw !== null && typeof raw !== 'string') return { reason: null, error: 'السبب نص' }
  const reason = typeof raw === 'string' ? raw.trim() : ''
  if (reason.length > 300) return { reason: null, error: 'السبب 300 حرف بالكتير' }
  if (required && !reason) return { reason: null, error: 'اكتب السبب' }
  return { reason: reason || null, error: null }
}

// ===== جاهزية الترحيل =====

let ready: boolean | null = null
/** جدولي ترحيلي 146 و147 موجودين؟ الموجود بيتحفظ؛ الناقص بيتفحص مع كل نداء لحد ما الترحيل يتطبق */
export async function insuranceMembersReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.insurance_enrollments', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.insurance_member_requests', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الترحيل */
export function resetInsuranceMembersCache() { ready = null }

// ===== طلبات الحذف اللي بتطلع لوحدها (بمدير معاملة المنادي) =====

/**
 * طلب حذف لكل اشتراك ساري في القايمة مالوش طلب حذف مفتوح. بيرجّع عدد الطلبات اللي اتعملت. الجداول ناقصة = صفر ومن غير أثر.
 * الحكم على الاشتراكات تحت قفل مدى على اشتراكات الموظف (UPDLOCK, HOLDLOCK) — إضافة اشتراك في نفس اللحظة بتستنى.
 */
async function raiseRemovals(em: EntityManager, employeeId: number, dependentId: number | 'ALL', origin: MemberRequestOrigin, reason: string, actorUserId: number): Promise<number> {
  if (!(await insuranceMembersReady(em))) return 0
  const rows: Array<{ id: number; policyId: number; classId: number; dependentId: number | null }> = await em.query(
    `SELECT e.[id], e.[policyId], e.[classId], e.[dependentId] FROM [insurance_enrollments] e WITH (UPDLOCK, HOLDLOCK)
     WHERE e.[employeeId] = @0 AND e.[status] = N'ACTIVE'${dependentId === 'ALL' ? '' : ' AND e.[dependentId] = @1'}
       AND NOT EXISTS (SELECT 1 FROM [insurance_member_requests] r WHERE r.[enrollmentId] = e.[id] AND r.[kind] = N'REMOVE' AND r.[status] IN (N'PENDING', N'SENT'))
     ORDER BY e.[id]`, dependentId === 'ALL' ? [employeeId] : [employeeId, dependentId])
  const now = new Date()
  for (const row of rows) {
    await em.getRepository(InsuranceMemberRequest).insert({ kind: 'REMOVE', policyId: Number(row.policyId), classId: Number(row.classId), employeeId, dependentId: row.dependentId == null ? null : Number(row.dependentId),
      enrollmentId: Number(row.id), status: 'PENDING', origin, reason, effectiveDate: null, cardNumber: null, createdByUserId: actorUserId, createdAt: now, sentByUserId: null, sentAt: null, closedByUserId: null, closedAt: null })
  }
  return rows.length
}

/** مع فتح ملف إنهاء الخدمة: طلب حذف لاشتراك الموظف وكل معاليه الساريين. بيرجّع العدد (صفر = مفيش بند إخلاء طرف زيادة) */
export const raiseOffboardingRemovals = (em: EntityManager, employeeId: number, actorUserId: number) =>
  raiseRemovals(em, employeeId, 'ALL', 'OFFBOARDING', 'إنهاء خدمة الموظف', actorUserId)

/** مع حذف معال من السجل: طلب حذف لاشتراكه الساري (لو له) */
export const raiseDependentRemoval = (em: EntityManager, employeeId: number, dependentId: number, actorUserId: number) =>
  raiseRemovals(em, employeeId, dependentId, 'DEPENDENT', 'حذف المعال من سجل المعالين', actorUserId)
