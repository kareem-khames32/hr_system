import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm'
import type { IssuedLetterSnapshot, LetterContent } from '../letters/letter-template.entities'

export type HrDocumentCategory = 'contract' | 'acknowledgement' | 'certificate' | 'general'
export interface HrDocumentField { key: string; label: string; required: boolean }
export interface HrDocumentSnapshot extends IssuedLetterSnapshot {
  templateName: string
  category: HrDocumentCategory
  revision: number
  values: Record<string, string>
}

@Entity('hr_document_templates')
export class HrDocumentTemplate {
  @PrimaryGeneratedColumn() id: number
  @Column({ length: 150 }) name: string
  @Column({ type: String, length: 30 }) category: HrDocumentCategory
  @Column({ default: true }) isActive: boolean
  @Column({ type: 'int', default: 1 }) version: number
  @Column({ type: 'simple-json' }) draft: LetterContent
  @Column({ type: 'simple-json' }) customFields: HrDocumentField[]
  @Column({ type: 'int', nullable: true }) publishedRevisionId: number | null
  @Column({ type: 'int', nullable: true }) updatedByUserId: number | null
  @CreateDateColumn() createdAt: Date
  @UpdateDateColumn() updatedAt: Date
}

@Entity('hr_document_template_revisions')
@Unique(['templateId', 'revision'])
export class HrDocumentTemplateRevision {
  @PrimaryGeneratedColumn() id: number
  @Column() templateId: number
  @Column() revision: number
  @Column({ length: 150 }) name: string
  @Column({ type: String, length: 30 }) category: HrDocumentCategory
  @Column({ type: 'simple-json' }) content: LetterContent
  @Column({ type: 'simple-json' }) customFields: HrDocumentField[]
  @Column({ type: 'int', nullable: true }) publishedByUserId: number | null
  @CreateDateColumn() publishedAt: Date
}

@Entity('hr_issued_documents')
@Unique(['issuedByUserId', 'idempotencyKey'])
@Index('UX_hr_issued_documents_ack_task', ['ackTaskId'], { unique: true, where: '[ackTaskId] IS NOT NULL' })
export class HrIssuedDocument {
  @PrimaryGeneratedColumn() id: number
  @Index({ unique: true }) @Column({ length: 60 }) reference: string
  @Column() templateId: number
  @Column() revisionId: number
  @Index() @Column({ type: 'int', nullable: true }) employeeId: number | null
  @Index() @Column({ type: 'int', nullable: true }) branchId: number | null
  @Index({ unique: true }) @Column({ type: 'int' }) fileId: number
  @Column({ type: 'int', nullable: true }) employeeDocumentId: number | null
  @Column({ length: 150 }) templateName: string
  @Column({ type: String, length: 30 }) category: HrDocumentCategory
  @Column({ default: false }) isFinancial: boolean
  @Column() issuedByUserId: number
  @Column({ length: 36 }) idempotencyKey: string
  @Column({ length: 64 }) inputHash: string
  @Column({ type: 'simple-json' }) snapshot: HrDocumentSnapshot
  @CreateDateColumn() createdAt: Date

  // B2.7-ب (ترحيل 092): طلب إقرار الموظف بالمستند — وقته، وموعده، ومهمته في محرك المهام (tasks.id)، وبصمة الملف اللي هيتعرض له.
  // برّه الكيان للقراءة والكتابة (الكود بيشتغل قبل الترحيل): hr-documents/document-acknowledgements.ts
  @Column({ type: 'datetime2', nullable: true, select: false, insert: false, update: false }) ackRequestedAt?: Date | null
  @Column({ type: 'date', nullable: true, select: false, insert: false, update: false }) ackDueDate?: string | null
  @Column({ type: 'int', nullable: true, select: false, insert: false, update: false }) ackTaskId?: number | null
  @Column({ type: 'nvarchar', length: 64, nullable: true, select: false, insert: false, update: false }) ackContentHash?: string | null
}

// B2.7-ب (ترحيل 092): دليل إقرار الموظف بالمستند — سطر واحد للمستند، بيتضاف ومابيتعدلش ولا بيتمسح (مشغّل في الترحيل). نفس أعمدة دليل
// إقرار السياسة (policy_acknowledgements).
@Entity('hr_document_acknowledgements')
@Index('UQ_hr_document_acknowledgements_document', ['documentId'], { unique: true })
export class HrDocumentAcknowledgement {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_hr_document_acknowledgements' }) id: number
  @Column({ type: 'int' }) documentId: number
  // الموظف صاحب المستند، والحساب اللي دخل بيه (الإقرار لنفسه بس)
  @Column({ type: 'int' }) employeeId: number
  @Column({ type: 'int' }) userId: number
  @Column({ type: 'datetime2' }) acknowledgedAt: Date
  // بصمة الملف اللي اتعرض له وقت الإقرار
  @Column({ type: 'nvarchar', length: 64 }) contentHash: string
  @Column({ type: 'nvarchar', length: 64, nullable: true }) ip: string | null
  @Column({ type: 'nvarchar', length: 300, nullable: true }) userAgent: string | null
}
