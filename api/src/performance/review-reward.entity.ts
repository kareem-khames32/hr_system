import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

// B3.8-ب (ترحيل 116): مكافأة مقترحة من نتيجة تقييم — موجّهة للمدير المباشر، وهو اللي بيقدّم طلب المكافأة بموديول المكافآت الموجود.
// نفس الشكل في الترحيل بالحرف (من غير افتراضي). الاقتراح نفسه مالوش أثر مالي.
export const REVIEW_REWARD_STATUSES = ['SUGGESTED', 'CLAIMED', 'SUBMITTED', 'DISMISSED'] as const
export type ReviewRewardStatus = (typeof REVIEW_REWARD_STATUSES)[number]

@Entity('review_reward_suggestions')
export class ReviewRewardSuggestion {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_review_reward_suggestions' })
  id: number

  @Column({ type: 'int' })
  cycleId: number

  @Column({ type: 'int' })
  assignmentId: number

  @Column({ type: 'int' })
  employeeId: number

  // المدير المباشر وقت الاقتراح — الاقتراح موجّه له
  @Column({ type: 'int' })
  managerEmployeeId: number

  @Column({ type: 'int' })
  bonusTypeId: number

  // التقدير والدرجة النهائية وقت الاقتراح
  @Column({ type: 'nvarchar', length: 2 })
  band: string

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  finalScore: string

  // قيمة المكافأة بطريقة حساب النوع (مبلغ، أيام، أو نسبة)
  @Column({ type: 'decimal', precision: 18, scale: 4 })
  inputValue: string

  // شهر المسير المستهدف YYYY-MM
  @Column({ type: 'nvarchar', length: 7 })
  targetPeriod: string

  @Column({ type: 'nvarchar', length: 20 })
  status: ReviewRewardStatus

  @Column({ type: 'int', nullable: true })
  bonusRequestId: number | null

  @Column({ type: 'int' })
  createdByUserId: number

  @Column({ type: 'datetime2' })
  createdAt: Date

  @Column({ type: 'int', nullable: true })
  decidedByUserId: number | null

  @Column({ type: 'datetime2', nullable: true })
  decidedAt: Date | null
}
