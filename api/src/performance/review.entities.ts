import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

// B3.7 (ترحيلات 112–115): نماذج التقييم، والدورات، وتكليف كل موظف، وردود التقييم. نفس الشكل في الترحيلات بالحرف (من غير افتراضي).
export const REVIEW_CYCLE_KINDS = ['ANNUAL', 'SEMI_ANNUAL', 'PROBATION', 'PROJECT'] as const
export type ReviewCycleKind = (typeof REVIEW_CYCLE_KINDS)[number]
export const REVIEW_CYCLE_STATUSES = ['DRAFT', 'ACTIVE', 'CLOSED'] as const
export type ReviewCycleStatus = (typeof REVIEW_CYCLE_STATUSES)[number]
export const REVIEW_AUDIENCE_MODES = ['COMPANY', 'BRANCHES', 'DEPARTMENTS'] as const
export type ReviewAudienceMode = (typeof REVIEW_AUDIENCE_MODES)[number]
export const REVIEW_ASSIGNMENT_STATUSES = ['OPEN', 'COMPLETED', 'APPROVED', 'ANNOUNCED', 'ACKNOWLEDGED'] as const
export type ReviewAssignmentStatus = (typeof REVIEW_ASSIGNMENT_STATUSES)[number]
export type ReviewRelation = 'SELF' | 'MANAGER'
// B3.7-ب: إقرار الموظف بنتيجته بيتسجّل صف رد بعلاقة ACK (تعليقه وتاريخه) — من غير عمود جديد على التكليف
export type ReviewResponseRelation = ReviewRelation | 'ACK'

@Entity('review_templates')
export class ReviewTemplate {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_review_templates' })
  id: number

  @Column({ type: 'nvarchar', length: 200 })
  name: string

  @Column({ type: 'nvarchar', length: 1000, nullable: true })
  description: string | null

  // مقياس التقدير: من 1 لـratingMax
  @Column({ type: 'int' })
  ratingMax: number

  // الأقسام الموزونة (JSON) — شكلها في review-rules.ts
  @Column({ type: 'nvarchar', length: 'max' })
  sections: string

  @Column({ type: 'bit' })
  isActive: boolean

  @Column({ type: 'int' })
  createdByUserId: number

  @Column({ type: 'datetime2' })
  createdAt: Date
}

@Entity('review_cycles')
export class ReviewCycle {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_review_cycles' })
  id: number

  @Column({ type: 'nvarchar', length: 200 })
  name: string

  @Column({ type: 'nvarchar', length: 20 })
  kind: ReviewCycleKind

  @Column({ type: 'int' })
  templateId: number

  @Column({ type: 'date' })
  periodStart: string

  @Column({ type: 'date' })
  periodEnd: string

  @Column({ type: 'nvarchar', length: 20 })
  audienceMode: ReviewAudienceMode

  // أرقام الفروع أو الأقسام (JSON)؛ الفاضي مع COMPANY
  @Column({ type: 'nvarchar', length: 2000, nullable: true })
  audienceIds: string | null

  // الفروع اللي الدورة بتغطيها (JSON) لحكم نطاق اللي بيديرها؛ الفاضي = كل الشركة
  @Column({ type: 'nvarchar', length: 2000, nullable: true })
  branchIds: string | null

  @Column({ type: 'date' })
  selfDueDate: string

  @Column({ type: 'date' })
  managerDueDate: string

  @Column({ type: 'nvarchar', length: 20 })
  status: ReviewCycleStatus

  // نسخة النموذج المتجمّدة وقت الإطلاق (JSON: ratingMax وsections)
  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  templateSnapshot: string | null

  @Column({ type: 'datetime2', nullable: true })
  launchedAt: Date | null

  @Column({ type: 'int', nullable: true })
  launchedByUserId: number | null

  @Column({ type: 'int' })
  createdByUserId: number

  @Column({ type: 'datetime2' })
  createdAt: Date

  @Column({ type: 'datetime2', nullable: true })
  closedAt: Date | null
}

@Entity('review_assignments')
export class ReviewAssignment {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_review_assignments' })
  id: number

  @Column({ type: 'int' })
  cycleId: number

  @Column({ type: 'int' })
  employeeId: number

  // فرع الموظف ومديره المباشر (المقيِّم) وقت الإطلاق
  @Column({ type: 'int', nullable: true })
  branchId: number | null

  @Column({ type: 'int', nullable: true })
  managerEmployeeId: number | null

  @Column({ type: 'nvarchar', length: 20 })
  status: ReviewAssignmentStatus

  @Column({ type: 'datetime2', nullable: true })
  selfSubmittedAt: Date | null

  @Column({ type: 'datetime2', nullable: true })
  managerSubmittedAt: Date | null

  // الدرجات من 100
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  selfScore: string | null

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  managerScore: string | null

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  finalScore: string | null

  @Column({ type: 'datetime2' })
  createdAt: Date
}

@Entity('review_responses')
export class ReviewResponse {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_review_responses' })
  id: number

  @Column({ type: 'int' })
  assignmentId: number

  @Column({ type: 'nvarchar', length: 10 })
  relation: ReviewResponseRelation

  // الإجابات (JSON): لكل قسم، تقدير كل بند وتعليقه
  @Column({ type: 'nvarchar', length: 'max' })
  answers: string

  // لوحة الأدلة المتجمّدة وقت التسليم (JSON)
  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  evidence: string | null

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  score: string | null

  @Column({ type: 'nvarchar', length: 2000, nullable: true })
  comment: string | null

  @Column({ type: 'int' })
  submittedByUserId: number

  @Column({ type: 'datetime2' })
  submittedAt: Date
}
