import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

// B3.5-أ (ترحيل 109): عرض عمل لمرشح. مسودة ← مستني الاعتماد ← معتمد ← اتبعت ← مقبول أو مرفوض من المرشح؛ والمسحوب نهائي.
// نفس الشكل في الترحيل بالحرف (من غير افتراضي).
export const OFFER_STATUSES = ['DRAFT', 'PENDING', 'APPROVED', 'SENT', 'ACCEPTED', 'DECLINED', 'WITHDRAWN'] as const
export type OfferStatus = (typeof OFFER_STATUSES)[number]

@Entity('candidate_offers')
export class CandidateOffer {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_candidate_offers' })
  id: number

  @Column({ type: 'int' })
  candidateId: number

  // الوظيفة الشاغرة لو المرشح عليها (لمقارنة الراتب بنطاقها)
  @Column({ type: 'int', nullable: true })
  jobId: number | null

  // الراتب المعروض: رقم في العرض بس — مابيدخلش في أي حساب
  @Column({ type: 'decimal', precision: 18, scale: 2 })
  salary: string

  @Column({ type: 'date' })
  startDate: string

  // آخر يوم للرد من اللينك (اختياري)
  @Column({ type: 'date', nullable: true })
  expiresOn: string | null

  @Column({ type: 'nvarchar', length: 1000, nullable: true })
  notes: string | null

  @Column({ type: 'nvarchar', length: 20 })
  status: OfferStatus

  @Column({ type: 'int' })
  createdByUserId: number

  @Column({ type: 'datetime2' })
  createdAt: Date

  @Column({ type: 'int', nullable: true })
  approvedByUserId: number | null

  @Column({ type: 'datetime2', nullable: true })
  approvedAt: Date | null

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  returnReason: string | null

  // بصمة sha256 لرمز لينك الرد — الرمز نفسه مابيتخزنش
  @Column({ type: 'nvarchar', length: 64, nullable: true })
  tokenHash: string | null

  @Column({ type: 'datetime2', nullable: true })
  sentAt: Date | null

  // دليل الرد
  @Column({ type: 'datetime2', nullable: true })
  respondedAt: Date | null

  // LINK = المرشح من اللينك، RECRUITER = مسجّل من مسؤول التوظيف
  @Column({ type: 'nvarchar', length: 20, nullable: true })
  respondedVia: string | null

  @Column({ type: 'nvarchar', length: 64, nullable: true })
  respondedIp: string | null

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  respondedAgent: string | null

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  respondedNote: string | null
}
