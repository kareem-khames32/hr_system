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
