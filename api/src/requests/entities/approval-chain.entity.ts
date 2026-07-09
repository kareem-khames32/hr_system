import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm'
import { ApprovalStep } from './approval-step.entity'

// الكود فريد داخل نطاقه: نسخة عامة (branchId=NULL) + نسخة لكل فرع
// بنفس الكود — عشان تجاوز الفرع يشتغل (المعادي ≠ الرياض)
@Index(['code', 'branchId'], { unique: true })
@Entity('approval_chains')
export class ApprovalChain {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 50 })
  code: string // CH_LEAVE_ANNUAL, CH_RESIGNATION...

  @Column({ length: 200 })
  nameAr: string

  // NULL = كل الفروع؛ قيمة = دورة خاصة بفرع (دورة المعادي ≠ الرياض)
  @Column({ nullable: true })
  branchId: number

  @Column({ default: true })
  isActive: boolean

  // النوع المربوط بهذه السلسلة (للعرض في البانِي) — سلسلة لكل نوع طلب
  @Column({ length: 50, nullable: true })
  requestTypeCode: string

  // سلسلة فاضية + autoApprove=false = «لم تُضبط بعد» → توقف الطلب
  // سلسلة فاضية + autoApprove=true = «تنفيذ فوري بلا اعتمادات» (اختيار المالك)
  @Column({ default: false })
  autoApprove: boolean

  @OneToMany(() => ApprovalStep, (s) => s.chain)
  steps: ApprovalStep[]
}
