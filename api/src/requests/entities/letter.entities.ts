import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'
import type { LetterStatus } from '../../common/domain-status'
import type { IssuedLetterSnapshot } from '../../letters/letter-template.entities'
export type { LetterStatus } from '../../common/domain-status'

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

  @Column({ type: String, length: 30 })
  status: LetterStatus

  // مرجع ملف PDF مولّد ومحفوظ فعلياً في التخزين الخاص
  @Column({ length: 500, nullable: true })
  generatedPdfRef: string

  @Column({ type: 'int', nullable: true })
  templateId: number | null

  @Column({ type: 'int', nullable: true })
  templateRevisionId: number | null

  @Column({ type: 'simple-json', nullable: true })
  contentSnapshot: IssuedLetterSnapshot | null
}

