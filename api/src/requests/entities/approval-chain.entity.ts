import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm'
import { ApprovalStep } from './approval-step.entity'

@Entity('approval_chains')
export class ApprovalChain {
  @PrimaryGeneratedColumn()
  id: number

  @Index({ unique: true })
  @Column({ length: 50 })
  code: string // CHAIN_MANAGER_HR, CHAIN_MANAGER...

  @Column({ length: 200 })
  nameAr: string

  // NULL = كل الفروع؛ قيمة = دورة خاصة بفرع (دورة المعادي ≠ الرياض)
  @Column({ nullable: true })
  branchId: number

  @Column({ default: true })
  isActive: boolean

  @OneToMany(() => ApprovalStep, (s) => s.chain)
  steps: ApprovalStep[]
}
