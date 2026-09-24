import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm'
import type { PayrollInclusionSource, PayrollMemberSnapshot, PayrollMembershipStatus } from './payroll-membership.entities'
import { PayrollPolicyVersion } from './payroll-policy.entities'

// حالة المسير: مسودة تعريف (الخطوة 16) → محسوبة → معتمدة → مصروفة (الدورة الكاملة لاحقاً:
// محاسب → HR → مالي → تنفيذي → جهة الصرف)
export type PayrollRunStatus = 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'PAID' | 'CANCELLED'

// نطاق المسير: الشركة كلها / فرع / قسم / فريق / مركز تكلفة / موظفون بعينهم
export type PayrollScopeType =
  | 'COMPANY'
  | 'BRANCH'
  | 'DEPARTMENT'
  | 'TEAM'
  | 'COST_CENTER'
  | 'CUSTOM'

// مسير قابل للتعريف: اسم + فترة + نطاق (+ سياسة لاحقاً). عدة مسيرات للفترة الواحدة
// الخطوة 16: اسم المسير فريد داخل شهره لغير الملغى؛ الأسماء الفارغة للمسيرات القديمة خارج القيد.
@Entity('payroll_runs')
@Index('UX_payroll_run_period_name', ['period', 'name'], { unique: true, where: "[name] IS NOT NULL AND [status] <> 'CANCELLED'" })
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

  // الخطوة 16: نسخة السياسة المنشورة التي اشتُقت منها فترة المسير (null = مسير قديم بدورة الإعداد العام).
  @Column({ type: 'int', nullable: true })
  policyVersionId: number | null

  @ManyToOne(() => PayrollPolicyVersion, { nullable: true, onDelete: 'NO ACTION', onUpdate: 'NO ACTION' })
  @JoinColumn({ name: 'policyVersionId', foreignKeyConstraintName: 'FK_payroll_run_policy_version' })
  policyVersion?: PayrollPolicyVersion | null

  // الخطوة 16: تعريف العضوية (JSON) — الفلاتر والقائمة والاستبعادات بأسبابها وتأكيد النطاق الفارغ؛ null = نطاق المسير القديم.
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  definition: string | null

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

  // الخطوة 22 / SRS PR-11 (B5): قيد الصرف — من صرف وقناة الصرف ومرجعه؛ null للمسيرات المصروفة قبل هذا القيد.
  @Column({ type: 'int', nullable: true })
  paidBy: number | null

  @Column({ type: 'nvarchar', length: 20, nullable: true })
  payChannel: string | null

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  payReference: string | null

  // فصل المهام (PAYRUN-STATE-003): من احتسب آخر نسخة ومتى.
  @Column({ type: 'int', nullable: true })
  calculatedBy: number | null

  @Column({ type: 'datetime', nullable: true })
  calculatedAt: Date | null

  // الخطوة 23 (B5، تصحيح المراجعة): مسير تجريبي لا يُحتسب في فترة التكافؤ التشغيلية — السبب المكتوب ومن علّمه ومتى؛ null = يُحتسب متى استوفى الشروط.
  @Column({ type: 'nvarchar', length: 400, nullable: true })
  parityExcludedReason: string | null

  @Column({ type: 'int', nullable: true })
  parityExcludedBy: number | null

  @Column({ type: 'datetime', nullable: true })
  parityExcludedAt: Date | null

  @CreateDateColumn()
  createdAt: Date

  // صفر يعني أن المسير القديم لم يثبت نسخة عضوية؛ لا ننسب إليه لقطة لم تُحفظ وقتها.
  @Column({ type: 'int', default: 0 })
  snapshotVersion: number

  // الخطوة 19: لقطة السياسة (JSON: النسخة والإعدادات والشرائح وأساس الأيام) وبصمتها؛ null = مسير محسوب قبل اللقطة.
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  policySnapshot: string | null

  @Column({ type: 'nvarchar', length: 64, nullable: true })
  policySnapshotHash: string | null

  // الخطوة 20 / D13: LEGACY | SHADOW | POLICY — الجديد SHADOW افتراضيًا؛ null = مسير قبل D13.
  @Column({ type: 'nvarchar', length: 10, nullable: true, default: 'SHADOW' })
  engineMode: 'LEGACY' | 'SHADOW' | 'POLICY' | null

  // الخطوة 20: تقرير التكافؤ لكل موظف ولكل بند لنسخة الحساب الحالية (JSON)
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  parityReport: string | null

  // C8 / الخطوة 31 (SRS PR-06 قاعدة 4، PR-11): REGULAR | REVERSAL | SUPPLEMENTARY — null = مسير أصلي سابق لهذا المسار.
  // مسير العكس والتكميلي مربوطان بالمسير المصروف عبر parentRunId، وصفوف الأصل لا تُعدَّل.
  @Column({ type: 'nvarchar', length: 20, nullable: true })
  runType: 'REGULAR' | 'REVERSAL' | 'SUPPLEMENTARY' | null

  @Index('IX_payroll_runs_parent')
  @Column({ type: 'int', nullable: true })
  parentRunId: number | null

  // سبب التصحيح المكتوب (عكس أو تكميلي)؛ يظهر في شاشة المسير وتقرير التسويات والقسيمة المعكوسة
  @Column({ type: 'nvarchar', length: 1000, nullable: true })
  correctionReason: string | null
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

  // التأمينات الاجتماعية (حصة الموظف) — سطر خصم مستقل، تفصيله في breakdown.socialInsurance
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  socialInsuranceDeduction: number

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  netPay: number

  // طريقة الصرف من ملف الموظف وقت الحساب — لتقارير حالة الصرف
  @Column({ length: 20 })
  payMethod: string

  // اللي اتصرف فعلًا (ترحيل 067): طريقة الصرف وتقسيمها المثبتين وقت الصرف (APPROVED→PAID) من ملف الموظف في تلك اللحظة —
  // نفس اللي كشف البنك كان بيقوله قبل الصرف بلحظة. NULL = البند لسه ما اتصرفش، أو اتصرف قبل الترحيل ده (وقتها السلوك
  // القديم زي ما هو بالحرف). بعد كده تعديل ملف الموظف مابيغيّرش واقعة صرف حصلت — راجع payroll-disbursement-split.ts.
  @Column({ type: 'nvarchar', length: 20, nullable: true })
  paidPayMethod: string | null

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  paidBankAmount: number | null

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  paidCashAmount: number | null

  // JSON: تفاصيل الحساب للمراجعة (أقساط، أيام...)
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  breakdown: string
}
