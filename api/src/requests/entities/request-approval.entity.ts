import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm'

export type ApprovalAction =
  | 'APPROVED'
  | 'REJECTED'
  | 'RETURNED_FOR_INFO'
  | 'DELEGATED'
  | 'ESCALATED'
  // إلغاء آلي من النظام (approverId = 0) — مثلاً أوفرتايم مكتشف لم يعد الحساب يبرره
  | 'CANCELLED'
  // تعذّر تنفيذ مجدول (approverId = 0) — السبب في التعليق، ويُسجَّل مرة لكل سبب جديد
  | 'EXECUTION_FAILED'

// سجل تدقيق غير قابل للتعديل — لا UPDATE ولا DELETE عليه
@Entity('request_approvals')
export class RequestApproval {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column()
  requestId: number

  @Column()
  step: number

  @Column()
  approverId: number // users.id

  @Column({ length: 30 })
  action: ApprovalAction

  @Column({ length: 1000, nullable: true })
  comment: string

  @CreateDateColumn()
  actedAt: Date
}
