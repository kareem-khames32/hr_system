import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm'

export interface LetterContent {
  title: string
  greeting: string
  body: string
  closing: string
  footer: string
}

@Entity('letter_templates')
export class LetterTemplate {
  @PrimaryGeneratedColumn() id: number
  @Index({ unique: true }) @Column({ length: 64 }) code: string
  @Column({ length: 150 }) name: string
  @Column({ default: true }) isActive: boolean
  @Column({ type: 'int', default: 1 }) version: number
  @Column({ type: 'simple-json' }) draft: LetterContent
  @Column({ type: 'int', nullable: true }) publishedRevisionId: number | null
  @Column({ type: 'int', nullable: true }) updatedByUserId: number | null
  @CreateDateColumn() createdAt: Date
  @UpdateDateColumn() updatedAt: Date
}

@Entity('letter_template_revisions')
@Unique(['templateId', 'revision'])
export class LetterTemplateRevision {
  @PrimaryGeneratedColumn() id: number
  @Column() templateId: number
  @Column() revision: number
  @Column({ type: 'simple-json' }) content: LetterContent
  @Column({ type: 'int', nullable: true }) publishedByUserId: number | null
  @CreateDateColumn() publishedAt: Date
}

@Entity('letter_template_bindings')
export class LetterTemplateBinding {
  @PrimaryColumn({ length: 50 }) requestTypeCode: string
  @Column() templateId: number
}

export interface IssuedLetterSnapshot {
  content: LetterContent
  companyName: string
  companyNameEn: string
  companyAddress: string
  companyPhone: string
  commercialRegister: string
  issuedDate: string
  requestRef: string
}
