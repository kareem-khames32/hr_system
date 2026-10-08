import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

// B3.3-أ (ترحيل 105): صف لكل مرشح اتضاف أو اتقدّم على وظيفة شاغرة بعينها. جدول المرشحين القايم مابيتلمسش: مرشح من غير صف هنا =
// مرشح متضاف من غير وظيفة زي الأول. نفس الشكل في الترحيل بالحرف (من غير افتراضي).
@Entity('candidate_applications')
export class CandidateApplication {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_candidate_applications' })
  id: number

  @Column({ type: 'int' })
  candidateId: number

  @Column({ type: 'int' })
  jobId: number

  // المصدر: نص قصير («داخلي»، «يدوي»، أو اسم مصدر اللينك)
  @Column({ type: 'nvarchar', length: 60, nullable: true })
  source: string | null

  // رقم الهوية أو الجواز (اختياري — لفحص التكرار على نفس الوظيفة)
  @Column({ type: 'nvarchar', length: 40, nullable: true })
  nationalId: string | null

  // الموظف المتقدّم لو التقديم داخلي من البوابة
  @Column({ type: 'int', nullable: true })
  applicantEmployeeId: number | null

  // B3.3-ب: ملف السيرة الذاتية وتاريخ موافقة البيانات (التقديم من اللينك العام)
  @Column({ type: 'int', nullable: true })
  cvFileId: number | null

  @Column({ type: 'datetime2', nullable: true })
  consentAt: Date | null

  @Column({ type: 'datetime2' })
  createdAt: Date
}
