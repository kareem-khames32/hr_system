import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm'

// ===== سجل «تسوية رصيد موظف» من شاشة إقفال سنة الإجازات (ترحيل 058) =====
// المتبقي من سنة الرصيد بيتصفّر (leave_balances.settledDays)، وكل تسوية صف هنا بسببها:
// PAID = اتصرف بدل في شهر مسير (قيد إضافة في دفتر المديونيات obligationId)، ZEROED = اتصفّر بس.
export type LeaveSettlementMode = 'PAID' | 'ZEROED'

@Entity('leave_balance_settlements')
@Unique('UQ_leave_settlement_operation', ['employeeId', 'idempotencyKey'])
export class LeaveBalanceSettlement {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column()
  employeeId: number

  @Column({ type: 'nvarchar', length: 50 })
  balanceType: string

  // مفتاح صف سنة الرصيد اللي اتسوّى ('2026' أو ذكرى تعيين 'YYYY-MM-DD')
  @Column({ type: 'nvarchar', length: 20 })
  period: string

  // السنة المختارة في شاشة الإقفال
  @Column({ type: 'nvarchar', length: 4 })
  year: string

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  days: number

  @Column({ type: 'nvarchar', length: 10 })
  mode: LeaveSettlementMode

  @Column({ type: 'nvarchar', length: 500 })
  reason: string

  // المتبقي قبل التسوية (للمراجعة)
  @Column({ type: 'decimal', precision: 8, scale: 2 })
  beforeRemaining: number

  // PAID: الراتب الشهري الشامل وقت التسوية ÷ 30 × الأيام، في شهر مسير
  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  monthlySalary: number | null

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  amount: number | null

  @Column({ type: 'nvarchar', length: 7, nullable: true })
  payrollPeriod: string | null

  @Column({ type: 'int', nullable: true })
  obligationId: number | null

  @Column({ type: 'nvarchar', length: 36 })
  idempotencyKey: string

  @Column()
  actorUserId: number

  @CreateDateColumn()
  createdAt: Date
}
