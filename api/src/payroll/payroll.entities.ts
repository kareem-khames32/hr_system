import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm'
import type { PayrollInclusionSource, PayrollMemberSnapshot, PayrollMembershipStatus } from './payroll-membership.entities'

// حالة المسير: مسودة محسوبة → معتمدة → مصروفة (الدورة الكاملة لاحقاً:
// محاسب → HR → مالي → تنفيذي → جهة الصرف)
export type PayrollRunStatus = 'CALCULATED' | 'APPROVED' | 'PAID' | 'CANCELLED'

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
  @Column({ type: 'nvarchar', length: 200, nullable: true })
  name: string | null

  @Column({ length: 20, default: 'BRANCH' })
  scopeType: PayrollScopeType

  // معرّفات النطاق (JSON): فروع/أقسام/فرق/مراكز تكلفة — يسمح بنطاق مركّب
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  scopeIds: string | null

  // قائمة موظفي CUSTOM (JSON)
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  employeeIds: string | null

  // صار nullable — يُملأ لمسير BRANCH فقط (توافق مع القديم)
  @Index()
  @Column({ type: 'int', nullable: true })
  branchId: number | null

  // السياسة المطبَّقة (null = المسار المثبّت القديم) — تُفعَّل في مرحلة المحرك
  @Column({ type: 'int', nullable: true })
  policyId: number | null

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

  @Column({ type: 'int', nullable: true })
  approvedBy: number | null // users.id

  @Column({ type: 'datetime', nullable: true })
  approvedAt: Date | null

  @Column({ type: 'datetime', nullable: true })
  paidAt: Date

  @CreateDateColumn()
  createdAt: Date

  // صفر يعني أن المسير القديم لم يثبت نسخة عضوية؛ لا ننسب إليه لقطة لم تُحفظ وقتها.
  @Column({ type: 'int', default: 0 })
  snapshotVersion: number
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

  @Column({ type: 'simple-json', nullable: true })
  snapshot: PayrollMemberSnapshot | null

  // تبقى العضويات التاريخية NULL بعد الترحيل؛ القيم الافتراضية للصفوف الجديدة فقط.
  @Column({ type: 'nvarchar', length: 20, nullable: true, default: 'INCLUDED' })
  membershipStatus: PayrollMembershipStatus | null

  @Column({ type: 'nvarchar', length: 30, nullable: true })
  exclusionReason: string | null

  @Column({ type: 'nvarchar', length: 20, nullable: true, default: 'SCOPE' })
  inclusionSource: PayrollInclusionSource | null
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

  // SPEC⑥: مجموع السكن والانتقال والهاتف وطبيعة العمل وأخرى؛ التفصيل في لقطة الحساب.
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

  // النقص المرصود قبل سياسة التداخل والسماح؛ تفاصيل الدقائق المحاسبة في breakdown.
  @Column({ type: 'int', default: 0 })
  shortfallMinutes: number

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  shortfallDeduction: number

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
