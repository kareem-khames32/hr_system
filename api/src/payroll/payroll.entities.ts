import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm'

// حالة المسير: مسودة محسوبة → معتمدة → مصروفة (الدورة الكاملة لاحقاً:
// محاسب → HR → مالي → تنفيذي → جهة الصرف)
export type PayrollRunStatus = 'CALCULATED' | 'APPROVED' | 'PAID'

// مسير مستقل لكل فرع لكل فترة (23 الشهر السابق → 22 الشهر الحالي)
@Entity('payroll_runs')
@Unique(['branchId', 'period'])
export class PayrollRun {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column()
  branchId: number

  @Column({ length: 7 })
  period: string // '2026-07'

  @Column({ type: 'date' })
  startDate: string // 2026-06-23

  @Column({ type: 'date' })
  endDate: string // 2026-07-22

  @Column({ length: 20, default: 'CALCULATED' })
  status: PayrollRunStatus

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalNet: number

  @Column({ nullable: true })
  approvedBy: number // users.id

  @Column({ type: 'datetime', nullable: true })
  approvedAt: Date

  @Column({ type: 'datetime', nullable: true })
  paidAt: Date

  @CreateDateColumn()
  createdAt: Date
}

// سطر الموظف في المسير — مع حالة صرف لكل موظف (كاش/تحويل/فيزا)
@Entity('payroll_items')
@Unique(['runId', 'employeeId'])
export class PayrollItem {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column()
  runId: number

  @Index()
  @Column()
  employeeId: number

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  basicSalary: number

  // إجمالي البدلات (سكن + انتقال + أخرى) — من ملف الموظف وقت الحساب
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  allowances: number

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  overtimeHours: number

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  overtimeAmount: number

  @Column({ default: 0 })
  lateMinutes: number

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  latenessDeduction: number

  // أيام الغياب بلا إذن (يوم عمل مجدول بلا بصمة ولا إجازة) وخصمها بقيمة اليوم
  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  absenceDays: number

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  absenceDeduction: number

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  unpaidLeaveDays: number

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  unpaidLeaveDeduction: number

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  loanInstallments: number

  // من دفتر المديونيات: خصومات أخرى (عهدة مفقودة/غرامة/تسوية) وإضافات أخرى
  // (مكافأة/بدل/مصروفات) لمرة واحدة
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  otherDeductions: number

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  otherAdditions: number

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  netPay: number

  // طريقة الصرف من ملف الموظف — لتقارير حالة الصرف
  @Column({ length: 20 })
  payMethod: string

  // JSON: تفاصيل الحساب للمراجعة (أقساط، أيام...)
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  breakdown: string
}
