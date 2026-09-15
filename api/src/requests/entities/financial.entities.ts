import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm'
import type { LoanStatus } from '../../common/domain-status'
export type { LoanStatus } from '../../common/domain-status'

// ============ الوجهات المالية ============

@Entity('loans')
export class Loan {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ nullable: true })
  requestId: number

  @Index()
  @Column()
  employeeId: number

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number

  @Column({ type: String, length: 30 })
  status: LoanStatus

  @Column({ type: 'datetime', nullable: true })
  disbursedAt: Date

  // AD-07/09 (C6): المطلوب والمعتمد متمايزان، ولقطة السقوف وقرار الاستثناء محفوظان. NULL للسلف القديمة.
  // المبالغ تُقرأ بـCONVERT نصي؛ لا تمر عبر Number.
  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  requestedAmount: string | null

  @Column({ type: 'bit', nullable: true })
  isExceptional: boolean | null

  @Column({ type: 'nvarchar', length: 30, nullable: true })
  exceptionalCategory: string | null

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  exceptionalReason: string | null

  // شهر أول قسط YYYY-MM كما اختارته الموارد البشرية أو الشهر التالي افتراضيًا
  @Column({ type: 'nvarchar', length: 7, nullable: true })
  firstInstallmentPeriod: string | null

  @Column({ type: 'int', nullable: true })
  installmentMonths: number | null

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  capSnapshot: string | null

  @Column({ type: 'int', nullable: true })
  createdByUserId: number | null
}

// REVERSED (C8 / الخطوة 31): قسط ترحيل أنشأه صرف مسير ثم عُكس الصرف فعاد أصله مستحقًا — مُلغى بلا رصيد، ويُعاد تفعيله لو رُحّل الأصل مجددًا
export type LoanInstallmentFinancialStatus = 'DUE' | 'PARTIAL' | 'DEFERRED' | 'PAID' | 'SETTLED' | 'REVERSED'

@Entity('loan_installments')
@Index('UX_loan_installments_parent', ['parentInstallmentId'], { unique: true, where: '[parentInstallmentId] IS NOT NULL' })
export class LoanInstallment {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column()
  loanId: number

  @Column({ type: 'date' })
  dueDate: string

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number

  @Column({ default: false })
  paid: boolean

  // NULL تاريخي: تستنتج الخدمة الحالة من paid والمراجعة1 دون تعبئة أو تغيير الصف القديم.
  // تقرأ الخدمة المبالغ بـCAST إلىnvarchar للحفاظ على دقة DECIMAL(18,2).
  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  paidAmount: string | null

  @Column({ type: 'nvarchar', length: 20, nullable: true })
  financialStatus: LoanInstallmentFinancialStatus | null

  @Column({ type: 'int', nullable: true })
  financialRevision: number | null

  @Column({ type: 'int', nullable: true })
  parentInstallmentId: number | null

  @Column({ type: 'date', nullable: true })
  originalDueDate: string | null

  @Column({ type: 'datetime2', nullable: true })
  paidAt: Date | null
}

// ============ دفتر المديونيات/المستحقات (Obligations Ledger) ============
// سجل دائم لكل حدث مالي لمرة واحدة على الموظف (خصم أو إضافة) خارج الآليات
// القائمة (تأخير/غياب/إجازة/سلف/أوفرتايم): عهدة مفقودة، مكافأة، بدل، تسوية،
// مصروفات، غرامة... يستهلكه المسير مرة واحدة (PENDING→APPLIED) ويصله بمصدره.
export type ObligationType = 'DEBIT' | 'CREDIT' // خصم | إضافة
// SUSPENDED (C2 / DD-11 قاعدة 4): قسط خصم مصنف تجاوز حد مرات الترحيل؛ لا يدخل مسيرًا حتى قرار الموارد البشرية
// EXEMPTED / DEFERRED (الخطوة 26 / EX-08): أُسقط نهائيًا أو أُجّل بقرار إعفاء مالي عند صرف المسير (المؤجَّل ينشئ قسطًا PENDING للشهر التالي)
export type ObligationStatus = 'PENDING' | 'APPLIED' | 'CANCELLED' | 'SUSPENDED' | 'EXEMPTED' | 'DEFERRED'

@Entity('employee_obligations')
export class EmployeeObligation {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column()
  employeeId: number

  @Column({ length: 10 })
  type: ObligationType

  // تصنيف المصدر: custody_shortfall | bonus | allowance | adjustment |
  // expense | fine | manual ...
  @Column({ length: 40 })
  category: string

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number

  @Column({ length: 300 })
  label: string

  @Index()
  @Column({ length: 15, default: 'PENDING' })
  status: ObligationStatus

  // تاريخ السريان — يُستهلَك في أول مسير فترته تشمله (null = فوراً)
  @Column({ type: 'date', nullable: true })
  effectiveDate: string

  // التتبّع للمصدر
  @Column({ nullable: true })
  sourceRequestId: number

  @Column({ length: 60, nullable: true })
  sourceRef: string // مثل asset:37 / custody:12

  @Column({ nullable: true })
  createdByUserId: number

  // المسير الذي استهلكه (عند الصرف)
  @Column({ nullable: true })
  appliedPayrollRunId: number

  @Column({ type: 'datetime', nullable: true })
  appliedAt: Date

  @CreateDateColumn()
  createdAt: Date

  // DD-05/07: طلب الخصم المصنّف مصدر القيد، وشهر المسير المستهدف (YYYY-MM)
  @Index('IX_employee_obligations_deduction_request')
  @Column({ type: 'int', nullable: true })
  deductionRequestId: number | null

  @Column({ type: 'nvarchar', length: 7, nullable: true })
  targetPeriod: string | null

  // DD-09: الحجز عند اعتماد المسير — مسير معتمد واحد فقط يحمل القيد
  @Index('IX_employee_obligations_reserved_run')
  @Column({ type: 'int', nullable: true })
  reservedPayrollRunId: number | null

  @Column({ type: 'datetime2', nullable: true })
  reservedAt: Date | null

  // DD-11: المحصل فعلًا عند الصرف؛ الباقي بعد حماية الصافي قيد جديد مرتبط بالأصل
  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  appliedAmount: number | null

  @Column({ type: 'int', nullable: true })
  carriedFromObligationId: number | null

  // C4 / الخطوة 27 (EX-05): طلب المكافأة مصدر القيد الموجب (أو قيد استردادها المدين بعد الصرف)
  @Index('IX_employee_obligations_bonus_request')
  @Column({ type: 'int', nullable: true })
  bonusRequestId: number | null

  // الخطوة 26 (EX-08): قرار الإعفاء المالي الذي أسقط القيد أو أجّله، ومرجعه على القسط المؤجَّل الجديد
  @Index('IX_employee_obligations_financial_exemption')
  @Column({ type: 'int', nullable: true })
  financialExemptionId: number | null

  // C8 / الخطوة 31: على القيد المستهلك — مسير العكس الذي عكس صرفه (القيد يبقى APPLIED تاريخيًا ولا يُحتسب محصلًا بعد العكس)
  @Index('IX_employee_obligations_payroll_reversal_run')
  @Column({ type: 'int', nullable: true })
  payrollReversalRunId: number | null

  // وعلى قيد الإعادة (REVERSAL) الجديد PENDING: القيد الأصلي الذي أعاده عكس الصرف ليُستهلك في المسير التكميلي أو التالي
  @Index('IX_employee_obligations_payroll_reversal_of')
  @Column({ type: 'int', nullable: true })
  payrollReversalOfObligationId: number | null
}

