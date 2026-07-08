import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm'

// ============ وجهة الإجازات — LeaveType قابل للإعداد ============

@Entity('leave_types')
export class LeaveType {
  @PrimaryGeneratedColumn()
  id: number

  @Index({ unique: true })
  @Column({ length: 50 })
  code: string // ANNUAL, SICK, CASUAL...

  @Column({ length: 200 })
  nameAr: string

  @Column({ default: true })
  isPaid: boolean

  // بيخصم من رصيد إيه: annual | sick | none
  @Column({ length: 50, nullable: true })
  balanceSource: string

  @Column({ length: 100, nullable: true })
  requiredAttachment: string

  @Column({ nullable: true })
  maxDays: number

  // الحج — مرة واحدة طوال الخدمة
  @Column({ default: false })
  oncePerService: boolean

  @Column({ nullable: true })
  approvalChainId: number

  @Column({ default: true })
  isActive: boolean
}

@Entity('leaves')
export class Leave {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ nullable: true })
  requestId: number // الطلب الأصل

  @Index()
  @Column()
  employeeId: number

  @Column({ length: 50 })
  leaveType: string

  @Column({ type: 'date' })
  fromDate: string

  @Column({ type: 'date' })
  toDate: string

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  days: number

  // نصف اليوم: FULL يوم كامل، MORNING النصف الأول من الوردية،
  // EVENING النصف الثاني — الفترة المغطاة لا تأخير فيها
  @Column({ length: 10, default: 'FULL' })
  period: 'FULL' | 'MORNING' | 'EVENING'

  // غير مدفوعة؟ تُخصم يوم بيوم في بيانات المسير (من leave_types.isPaid)
  @Column({ default: false })
  isUnpaid: boolean

  @Column({ length: 30 })
  status: string // APPROVED | CANCELLED
}

@Entity('leave_balances')
@Unique(['employeeId', 'balanceType', 'period'])
export class LeaveBalance {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column()
  employeeId: number

  @Column({ length: 50 })
  balanceType: string // annual | sick

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  entitled: number

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  taken: number

  @Column({ length: 20 })
  period: string // '2026'

  // طبقة الرصيد الافتتاحي المُرحّل وصلاحيته — تُستهلك أولاً قبل رصيد السنة
  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  openingDays: number

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  openingTaken: number

  @Column({ type: 'date', nullable: true })
  openingExpiry: string // NULL = بلا انتهاء
}
