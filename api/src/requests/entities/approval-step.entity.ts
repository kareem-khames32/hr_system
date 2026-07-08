import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { ApprovalChain } from './approval-chain.entity'

// الأدوار تُحل ديناميكياً من الهيكل التنظيمي وقت التشغيل — شوف ApproverResolver
export type ApproverRole =
  | 'direct_manager_of_requester'
  | 'department_manager_of_requester'
  | 'branch_manager_of_requester'
  | 'receiving_team_manager'
  | 'hr'
  | 'finance'
  | 'custody_officer'
  | 'it'
  | 'executive'
  | 'specific_employee'

@Entity('approval_steps')
export class ApprovalStep {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column()
  chainId: number

  @ManyToOne(() => ApprovalChain, (c) => c.steps)
  @JoinColumn({ name: 'chainId' })
  chain: ApprovalChain

  @Column()
  stepOrder: number

  @Column({ length: 60 })
  approverRole: ApproverRole

  // للدور specific_employee — موظف بعينه هو صاحب الخطوة
  @Column({ nullable: true })
  specificEmployeeId: number

  @Column({ default: false })
  isParallel: boolean

  // الخطوة الشرطية: تُفعَّل فقط عند تحقق الشرط على حقل من الـ payload
  // مثال: amount >= 5000 → خطوة المالية
  @Column({ length: 60, nullable: true })
  thresholdField: string

  @Column({ type: 'nvarchar', length: 10, nullable: true })
  thresholdOp: '>=' | '>' | '<' | '<=' | null

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  thresholdValue: number

  // مهلة الرد بالأيام — تجاوزها يصعّد للدور المحدد
  @Column({ nullable: true })
  slaDays: number

  @Column({ length: 60, nullable: true })
  escalateTo: string

  @Column({ default: true })
  canDelegate: boolean
}
