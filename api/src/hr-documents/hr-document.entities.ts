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
}
