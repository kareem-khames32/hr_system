import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'
import { utcDateTime } from '../payroll/payroll-policy.entities'

// «دوام أيام العطلات»: أمر من الموارد البشرية (ORDER) بأيام عطلة محددة لشركة/فرع/أقسام/فرق/موظفين،
// أو طلب «دوام يوم عطلة» معتمد لموظف واحد (REQUEST). ساعات البصمة في الأيام دي بتتحسب «بدل دوام أيام العطلات»
// في مسير الفترة اللي فيها اليوم (ساعات × سعر الساعة × المضاعف)، من غير تأخير ولا غياب ولا أي خصم.
@Entity('holiday_work_orders')
@Index('IX_holiday_work_orders_range', ['status', 'firstDate', 'lastDate'])
@Index('UX_holiday_work_orders_request', ['sourceRequestId'], { unique: true, where: '[sourceRequestId] IS NOT NULL' })
export class HolidayWorkOrder {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_holiday_work_orders' }) id: number
  // ORDER = أمر الموارد البشرية | REQUEST = طلب موظف معتمد
  @Column({ type: 'nvarchar', length: 10, default: 'ORDER' }) kind: string
  @Column({ type: 'nvarchar', length: 150 }) name: string
  // company | branch | departments | teams | employees
  @Column({ type: 'nvarchar', length: 20 }) targetLevel: string
  @Column({ type: 'int', nullable: true }) branchId: number | null
  // أرقام الأقسام أو الفرق أو الموظفين (JSON)
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true }) targetIds: string | null
  // أيام العطلة المطلوب فيها الدوام (JSON مرتب YYYY-MM-DD) وأولها وآخرها للبحث بالفترة
  @Column({ type: 'nvarchar', length: 'MAX' }) dates: string
  @Column({ type: 'date' }) firstDate: string
  @Column({ type: 'date' }) lastDate: string
  // مضاعف سعر الساعة (الافتراضي من attendance.holiday_work_multiplier)
  @Column({ type: 'decimal', precision: 5, scale: 2 }) multiplier: number
  // ACTIVE | CANCELLED
  @Column({ type: 'nvarchar', length: 12, default: 'ACTIVE' }) status: string
  // طلب «دوام يوم عطلة» المعتمد مصدر السجل (نوع REQUEST)
  @Column({ type: 'int', nullable: true }) sourceRequestId: number | null
  @Column({ type: 'nvarchar', length: 500, nullable: true }) note: string | null
  @Column({ type: 'int', nullable: true }) createdByUserId: number | null
  @CreateDateColumn({ type: 'datetime2', default: () => 'SYSUTCDATETIME()', transformer: utcDateTime }) createdAt: Date
  @Column({ type: 'int', nullable: true }) updatedByUserId: number | null
  @Column({ type: 'datetime2', nullable: true, transformer: utcDateTime }) updatedAt: Date | null
  @Column({ type: 'int', nullable: true }) cancelledByUserId: number | null
  @Column({ type: 'datetime2', nullable: true, transformer: utcDateTime }) cancelledAt: Date | null
  @Column({ type: 'nvarchar', length: 300, nullable: true }) cancelReason: string | null
}
