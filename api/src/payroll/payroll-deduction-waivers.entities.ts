import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'
import { utcDateTime } from './payroll-policy.entities'

// «شيل خصم» (تبويب الاستقطاعات في شاشة المسير): قاعدة بتشيل نوع خصم واحد عن شهر، على الشركة أو فرع أو أقسام أو فرق أو موظفين.
// المسيرات اللي لسه مسودة أو محسوبة للشهر ده بتتخطى الخصم ده عند الحساب/إعادة الحساب، والمعتمد أو المصروف ما بيتغيرش.
@Entity('payroll_deduction_waivers')
@Index('IX_payroll_deduction_waivers_period', ['period', 'status'])
export class PayrollDeductionWaiver {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_payroll_deduction_waivers' }) id: number
  // شهر المسير YYYY-MM
  @Column({ type: 'nvarchar', length: 7 }) period: string
  // نوع الخصم: LATENESS | EARLY_LEAVE | SHORTFALL | ABSENCE | UNPAID_LEAVE | SUSPENSION | SICK_LEAVE | LOAN | TYPED_DEDUCTION | SOCIAL_INSURANCE | OTHER
  @Column({ type: 'nvarchar', length: 30 }) kind: string
  // company | branch | departments | teams | employees
  @Column({ type: 'nvarchar', length: 20 }) targetLevel: string
  @Column({ type: 'int', nullable: true }) branchId: number | null
  // أرقام الأقسام أو الفرق أو الموظفين (JSON)
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true }) targetIds: string | null
  @Column({ type: 'nvarchar', length: 500 }) reason: string
  // ACTIVE | CANCELLED
  @Column({ type: 'nvarchar', length: 15, default: 'ACTIVE' }) status: string
  @Column({ type: 'int' }) createdByUserId: number
  @CreateDateColumn({ type: 'datetime2', default: () => 'SYSUTCDATETIME()', transformer: utcDateTime }) createdAt: Date
  @Column({ type: 'int', nullable: true }) cancelledByUserId: number | null
  @Column({ type: 'datetime2', nullable: true }) cancelledAt: Date | null
}
