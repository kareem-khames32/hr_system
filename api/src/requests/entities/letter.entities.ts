import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

// ============ وجهة الخطابات — PDF يتولّد أوتوماتيك ============

@Entity('letter_requests')
export class LetterRequest {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ nullable: true })
  requestId: number

  @Index()
  @Column()
  employeeId: number

  @Column({ length: 50 })
  letterType: string // SALARY | EMPLOYMENT | EXPERIENCE | NOC | EMBASSY | BANK_LOAN

  @Column({ length: 500, nullable: true })
  purpose: string

  @Column({ length: 30 })
  status: string // GENERATED | DELIVERED

  // مرجع الـ PDF المولّد — توليد فعلي في مرحلة لاحقة
  @Column({ length: 500, nullable: true })
  generatedPdfRef: string
}
