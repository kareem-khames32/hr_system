import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

// B3.4-ب (ترحيلين 107 و108): مقابلة مرشح، وبطاقة تقييم لكل محاور فيها. نفس الشكل في الترحيلين بالحرف (من غير افتراضي).
export const INTERVIEW_MODES = ['ONSITE', 'VIDEO', 'PHONE'] as const
export type InterviewMode = (typeof INTERVIEW_MODES)[number]
export const INTERVIEW_STATUSES = ['SCHEDULED', 'DONE', 'CANCELLED'] as const
export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number]
export const INTERVIEW_RECOMMENDATIONS = ['YES', 'MAYBE', 'NO'] as const
export type InterviewRecommendation = (typeof INTERVIEW_RECOMMENDATIONS)[number]

@Entity('candidate_interviews')
export class CandidateInterview {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_candidate_interviews' })
  id: number

  @Column({ type: 'int' })
  candidateId: number

  // الموعد بساعة التطبيق (زي باقي تواريخ النظام)
  @Column({ type: 'datetime2' })
  scheduledAt: Date

  @Column({ type: 'int' })
  durationMinutes: number

  @Column({ type: 'nvarchar', length: 20 })
  mode: InterviewMode

  // المكان أو رابط الاجتماع (اختياري)
  @Column({ type: 'nvarchar', length: 300, nullable: true })
  location: string | null

  @Column({ type: 'nvarchar', length: 1000, nullable: true })
  notes: string | null

  @Column({ type: 'nvarchar', length: 20 })
  status: InterviewStatus

  @Column({ type: 'int' })
  createdByUserId: number

  @Column({ type: 'datetime2' })
  createdAt: Date

  @Column({ type: 'datetime2', nullable: true })
  closedAt: Date | null
}

@Entity('interview_scorecards')
export class InterviewScorecard {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_interview_scorecards' })
  id: number

  @Column({ type: 'int' })
  interviewId: number

  // المحاور: موظف (حسابه المربوط بيه هو اللي بيسلّم البطاقة)
  @Column({ type: 'int' })
  interviewerEmployeeId: number

  // من 1 لـ5 — فاضي لحد التسليم
  @Column({ type: 'int', nullable: true })
  rating: number | null

  @Column({ type: 'nvarchar', length: 20, nullable: true })
  recommendation: InterviewRecommendation | null

  @Column({ type: 'nvarchar', length: 2000, nullable: true })
  notes: string | null

  @Column({ type: 'datetime2', nullable: true })
  submittedAt: Date | null

  @Column({ type: 'datetime2' })
  createdAt: Date
}
