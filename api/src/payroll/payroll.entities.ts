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

// نطاق المسير: الشركة كلها / فرع / قسم / فريق / مركز تكلفة / موظفون بعينهم
export type PayrollScopeType =
  | 'COMPANY'
  | 'BRANCH'
  | 'DEPARTMENT'
  | 'TEAM'
  | 'COST_CENTER'
  | 'CUSTOM'

// مسير قابل للتعريف: اسم + فترة + نطاق (+ سياسة لاحقاً). عدة مسيرات للفترة الواحدة
@Entity('payroll_runs')
export class PayrollRun {
  @PrimaryGeneratedColumn()
  id: number

  // اسم المسير («مسير فرع جدة – يوليو») — يُشتق افتراضياً لمسير الفرع القديم
  @Column({ length: 200, nullable: true })
  name: string

  @Column({ length: 20, default: 'BRANCH' })
  scopeType: PayrollScopeType

  // معرّفات النطاق (JSON): فروع/أقسام/فرق/مراكز تكلفة — يسمح بنطاق مركّب
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  scopeIds: string

  // قائمة موظفي CUSTOM (JSON)
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  employeeIds: string

  // صار nullable — يُملأ لمسير BRANCH فقط (توافق مع القديم)
  @Index()
  @Column({ nullable: true })
  branchId: number

  // السياسة المطبَّقة (null = المسار المثبّت القديم) — تُفعَّل في مرحلة المحرك
  @Column({ nullable: true })
  policyId: number

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

// لقطة أعضاء المسير وقت الحساب — تدقيق «من كان في المسير» ومنع الازدواج
@Entity('payroll_run_members')
@Unique(['runId', 'employeeId'])
export class PayrollRunMember {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column()
  runId: number

  @Index()
  @Column()
  employeeId: number
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
