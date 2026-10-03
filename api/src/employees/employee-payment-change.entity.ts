import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

// B1.7 (ترحيل 081): سجل تغييرات الصرف — صف لكل تغيير في الآيبان أو البنك أو فرع البنك أو طريقة الصرف أو مبلغ التحويل،
// بيتكتب في نفس معاملة التغيير: قبل وبعد (الآيبان متخفي زي سجل التغييرات)، ومين، وإمتى، والمصدر، ورقم الطلب.
// مصدر «مين غيّر» لتاب «اتغيّر إيه من آخر مسير» ولضابط «اللي غيّر مايعتمدش لوحده». الأسماء صريحة مطابقة للترحيل.
@Entity('employee_payment_changes')
@Index('IX_employee_payment_changes_employee', ['employeeId', 'changedAt'])
export class EmployeePaymentChange {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_employee_payment_changes' })
  id: number

  @Column({ type: 'int' })
  employeeId: number

  /** iban | bankName | bankBranch | payMethod | bankTransferAmount */
  @Column({ type: 'nvarchar', length: 40 })
  field: string

  @Column({ type: 'nvarchar', length: 200, nullable: true })
  oldValue: string | null

  @Column({ type: 'nvarchar', length: 200, nullable: true })
  newValue: string | null

  @Column({ type: 'int', nullable: true })
  changedByUserId: number | null

  @Column({ type: 'datetime2' })
  changedAt: Date

  /** PROFILE | EXCEL | REQUEST | CREATE */
  @Column({ type: 'nvarchar', length: 20 })
  source: string

  @Column({ type: 'int', nullable: true })
  requestId: number | null
}
