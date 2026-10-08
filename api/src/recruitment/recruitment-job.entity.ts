import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

// B3.2-أ (ترحيل 104): الوظيفة الشاغرة — من طلب «احتياج توظيف» معتمد (requestId) أو من شاشة الوظائف. الحالة: مسودة ← منشورة ↔ موقوفة ←
// مقفولة. نفس الشكل في الترحيل بالحرف (من غير افتراضي).
export const RECRUITMENT_JOB_STATUSES = ['DRAFT', 'PUBLISHED', 'PAUSED', 'CLOSED'] as const
export type RecruitmentJobStatus = (typeof RECRUITMENT_JOB_STATUSES)[number]

@Entity('recruitment_jobs')
export class RecruitmentJob {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_recruitment_jobs' })
  id: number

  // المسمى بنصه من كتالوج المسميات وقت الإنشاء
  @Column({ type: 'nvarchar', length: 200 })
  title: string

  @Column({ type: 'int' })
  branchId: number

  // القسم (اختياري): الفاضي = على مستوى الفرع
  @Column({ type: 'int', nullable: true })
  departmentId: number | null

  // العدد المطلوب
  @Column({ type: 'int' })
  openings: number

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  reason: string | null

  // نطاق الراتب المعروض (للعرض والمقارنة بس — مابيدخلش في أي حساب)، بعملة الفرع
  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  salaryFrom: string | null

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  salaryTo: string | null

  @Column({ type: 'date', nullable: true })
  startDate: string | null

  @Column({ type: 'nvarchar', length: 4000, nullable: true })
  description: string | null

  @Column({ type: 'nvarchar', length: 4000, nullable: true })
  requirements: string | null

  @Column({ type: 'nvarchar', length: 20 })
  status: RecruitmentJobStatus

  // النشر: للموظفين جوه البوابة، و/أو برّه (صفحة الوظائف — B3.3)
  @Column({ type: 'bit' })
  internal: boolean

  @Column({ type: 'bit' })
  external: boolean

  // طلب «احتياج التوظيف» المعتمد اللي الوظيفة اتعملت منه (NULL = من الشاشة)
  @Column({ type: 'int', nullable: true })
  requestId: number | null

  // 0 = اتعملت من طلب معتمد
  @Column({ type: 'int' })
  createdByUserId: number

  @Column({ type: 'datetime2', nullable: true })
  publishedAt: Date | null

  @Column({ type: 'datetime2', nullable: true })
  closedAt: Date | null

  @Column({ type: 'datetime2' })
  createdAt: Date
}
