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
}

export type LoanInstallmentFinancialStatus = 'DUE' | 'PARTIAL' | 'DEFERRED' | 'PAID' | 'SETTLED'

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
export type ObligationStatus = 'PENDING' | 'APPLIED' | 'CANCELLED'

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
}

