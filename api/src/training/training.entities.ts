import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

// B3.9 (ترحيلات 117–119): كتالوج الدورات، وجلساتها، وتسجيل الموظفين فيها. نفس الشكل في الترحيلات بالحرف (من غير افتراضي).
// الشهادة مالهاش جدول: بتتسجّل مستند موظف (employee_documents) بنوع «شهادة تدريب» بتاريخ انتهائه — فتنبيه التجديد (B2.15) بيشتغل عليها.
export const TRAINING_COURSE_KINDS = ['INTERNAL', 'EXTERNAL', 'ONLINE'] as const
export type TrainingCourseKind = (typeof TRAINING_COURSE_KINDS)[number]
export const TRAINING_SESSION_STATUSES = ['PLANNED', 'DONE', 'CANCELLED'] as const
export type TrainingSessionStatus = (typeof TRAINING_SESSION_STATUSES)[number]
export const TRAINING_ENROLLMENT_STATUSES = ['ENROLLED', 'ATTENDED', 'COMPLETED', 'ABSENT', 'CANCELLED'] as const
export type TrainingEnrollmentStatus = (typeof TRAINING_ENROLLMENT_STATUSES)[number]

@Entity('training_courses')
export class TrainingCourse {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_training_courses' })
  id: number

  @Column({ type: 'nvarchar', length: 200 })
  name: string

  @Column({ type: 'nvarchar', length: 20 })
  kind: TrainingCourseKind

  // رابط الدورة الأونلاين
  @Column({ type: 'nvarchar', length: 500, nullable: true })
  url: string | null

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  durationHours: string | null

  @Column({ type: 'nvarchar', length: 200, nullable: true })
  provider: string | null

  @Column({ type: 'nvarchar', length: 1000, nullable: true })
  description: string | null

  @Column({ type: 'bit' })
  givesCertificate: boolean

  // مدة صلاحية الشهادة بالشهور؛ الفاضي = من غير انتهاء
  @Column({ type: 'int', nullable: true })
  certificateValidMonths: number | null

  @Column({ type: 'bit' })
  isActive: boolean

  @Column({ type: 'int' })
  createdByUserId: number

  @Column({ type: 'datetime2' })
  createdAt: Date
}

@Entity('training_sessions')
export class TrainingSession {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_training_sessions' })
  id: number

  @Column({ type: 'int' })
  courseId: number

  // الفاضي = كل الشركة (لحساب من غير قيد فروع)
  @Column({ type: 'int', nullable: true })
  branchId: number | null

  @Column({ type: 'date' })
  startDate: string

  @Column({ type: 'date' })
  endDate: string

  @Column({ type: 'nvarchar', length: 200, nullable: true })
  location: string | null

  @Column({ type: 'nvarchar', length: 200, nullable: true })
  trainer: string | null

  // الفاضي = من غير حد
  @Column({ type: 'int', nullable: true })
  capacity: number | null

  // تكلفة المقعد — للتقرير بس، مالهاش قيد مالي
  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  costPerSeat: string | null

  @Column({ type: 'nvarchar', length: 20 })
  status: TrainingSessionStatus

  @Column({ type: 'int' })
  createdByUserId: number

  @Column({ type: 'datetime2' })
  createdAt: Date
}

@Entity('training_enrollments')
export class TrainingEnrollment {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_training_enrollments' })
  id: number

  @Column({ type: 'int' })
  sessionId: number

  @Column({ type: 'int' })
  employeeId: number

  @Column({ type: 'nvarchar', length: 20 })
  status: TrainingEnrollmentStatus

  @Column({ type: 'nvarchar', length: 200, nullable: true })
  result: string | null

  // تقييم الموظف للتدريب (من 1 لـ5) وتعليقه
  @Column({ type: 'int', nullable: true })
  rating: number | null

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  ratingComment: string | null

  // طلب التدريب اللي اتسجّل منه (requests.id)
  @Column({ type: 'int', nullable: true })
  requestId: number | null

  // مستند الشهادة (employee_documents.id)
  @Column({ type: 'int', nullable: true })
  documentId: number | null

  @Column({ type: 'int' })
  enrolledByUserId: number

  @Column({ type: 'datetime2' })
  createdAt: Date

  @Column({ type: 'datetime2', nullable: true })
  completedAt: Date | null
}
