import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'

// ============ AD-01..06: سياسات سقوف السلف (مؤرخة بالنسخ) ============
// لا يُعدَّل صف سارٍ في مكانه: التعديل نسخة جديدة بنفس policyKey، والسابقة تُقفل بتاريخ نهاية أو تُعطّل.
export type LoanCapScopeType = 'COMPANY' | 'BRANCH' | 'DEPARTMENT' | 'TEAM' | 'EMPLOYEES'
export type LoanCapSalaryBase = 'BASIC' | 'GROSS'
export type LoanCapMonthDefinition = 'PAYROLL_PERIOD' | 'CALENDAR'

@Entity('loan_cap_policies')
@Index('UX_loan_cap_policies_key_version', ['policyKey', 'version'], { unique: true })
@Check('CK_loan_cap_policies_scope', "[scopeType] IN ('COMPANY','BRANCH','DEPARTMENT','TEAM','EMPLOYEES')")
@Check('CK_loan_cap_policies_base', "[salaryBase] IS NULL OR [salaryBase] IN ('BASIC','GROSS')")
@Check('CK_loan_cap_policies_month', "[monthDefinition] IN ('PAYROLL_PERIOD','CALENDAR')")
@Check('CK_loan_cap_policies_values', '([percentOfSalary] IS NULL OR ([percentOfSalary] > 0 AND [percentOfSalary] <= 1000 AND [salaryBase] IS NOT NULL)) AND ([flatCapAmount] IS NULL OR [flatCapAmount] > 0) AND ([maxRequestsPerMonth] IS NULL OR [maxRequestsPerMonth] >= 1) AND ([maxAmountPerMonth] IS NULL OR [maxAmountPerMonth] > 0) AND ([maxOutstandingBalance] IS NULL OR [maxOutstandingBalance] >= 0) AND ([maxInstallmentMonths] IS NULL OR ([maxInstallmentMonths] >= 1 AND [maxInstallmentMonths] <= 1000))')
@Check('CK_loan_cap_policies_window', '[effectiveTo] IS NULL OR [effectiveTo] >= [effectiveFrom]')
export class LoanCapPolicy {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_loan_cap_policies' }) id: number
  @Column({ type: 'nvarchar', length: 40 }) policyKey: string
  @Column({ type: 'int' }) version: number
  @Column({ type: 'nvarchar', length: 150 }) name: string
  @Column({ type: 'nvarchar', length: 20 }) scopeType: LoanCapScopeType
  // مصفوفة JSON لمعرفات الفروع/الأقسام/الفرق/الموظفين؛ NULL لنطاق الشركة.
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true }) scopeIds: string | null
  @Column({ type: 'nvarchar', length: 20, nullable: true }) salaryBase: LoanCapSalaryBase | null
  // المبالغ تُقرأ بـCONVERT نصي؛ نوع TypeScript النصي وحده لا يمنع تحويل driver.
  @Column({ type: 'decimal', precision: 9, scale: 4, nullable: true }) percentOfSalary: string | null
  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true }) flatCapAmount: string | null
  @Column({ type: 'int', nullable: true }) maxRequestsPerMonth: number | null
  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true }) maxAmountPerMonth: string | null
  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true }) maxOutstandingBalance: string | null
  @Column({ type: 'int', nullable: true }) maxInstallmentMonths: number | null
  @Column({ type: 'nvarchar', length: 20 }) monthDefinition: LoanCapMonthDefinition
  @Column({ type: 'date' }) effectiveFrom: string
  @Column({ type: 'date', nullable: true }) effectiveTo: string | null
  @Column({ type: 'int' }) priority: number
  @Column({ type: 'bit' }) isActive: boolean
  @Column({ type: 'int', nullable: true }) supersedesId: number | null
  @Column({ type: 'nvarchar', length: 500, nullable: true }) reason: string | null
  @Column({ type: 'int', nullable: true }) createdByUserId: number | null
  @CreateDateColumn({ type: 'datetime2', default: () => 'SYSUTCDATETIME()' }) createdAt: Date
  @Column({ type: 'datetime2', nullable: true }) deactivatedAt: Date | null
  @Column({ type: 'int', nullable: true }) deactivatedByUserId: number | null
  @Column({ type: 'nvarchar', length: 500, nullable: true }) deactivationReason: string | null
}

// ============ AD-14: السداد المبكر الكلي والجزئي بمبلغ ومرجع ============
export type LoanRepaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'OTHER'
export type LoanRepaymentMode = 'FULL' | 'SHORTEN_TERM' | 'REDUCE_INSTALLMENT'

@Entity('loan_repayments')
@Index('UX_loan_repayments_reference', ['loanId', 'reference'], { unique: true })
@Index('IDX_loan_repayments_employee', ['employeeId'])
@Check('CK_loan_repayments_amounts', '[amount] > 0 AND [balanceBefore] >= [amount] AND [balanceAfter] = [balanceBefore] - [amount]')
@Check('CK_loan_repayments_method', "[method] IN ('CASH','BANK_TRANSFER','OTHER')")
@Check('CK_loan_repayments_mode', "[mode] IN ('FULL','SHORTEN_TERM','REDUCE_INSTALLMENT')")
export class LoanRepayment {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_loan_repayments' }) id: number
  @Column({ type: 'int' }) loanId: number
  @Column({ type: 'int' }) employeeId: number
  @Column({ type: 'decimal', precision: 18, scale: 2 }) amount: string
  @Column({ type: 'nvarchar', length: 20 }) method: LoanRepaymentMethod
  @Column({ type: 'nvarchar', length: 20 }) mode: LoanRepaymentMode
  @Column({ type: 'nvarchar', length: 100 }) reference: string
  @Column({ type: 'nvarchar', length: 500, nullable: true }) reason: string | null
  @Column({ type: 'int', nullable: true }) requestId: number | null
  @Column({ type: 'int', nullable: true }) actorId: number | null
  @Column({ type: 'decimal', precision: 18, scale: 2 }) balanceBefore: string
  @Column({ type: 'decimal', precision: 18, scale: 2 }) balanceAfter: string
  @Column({ type: 'int', nullable: true }) eventId: number | null
  @CreateDateColumn({ type: 'datetime2', default: () => 'SYSUTCDATETIME()' }) createdAt: Date
}

// ============ AD-13: رصيد السلف المتبقي بعد التصفية ============
// يُنشأ عند اعتماد تصفية لم تغطِّ مستحقاتها رصيد السلف؛ لا يُشطب إلا بصلاحية مستقلة وسبب.
export type LoanRecoveryStatus = 'PENDING_RECOVERY' | 'RECOVERED' | 'WRITTEN_OFF' | 'CANCELLED'

@Entity('loan_recovery_balances')
@Index('UX_loan_recovery_balances_case', ['caseId'], { unique: true })
@Index('IDX_loan_recovery_balances_employee', ['employeeId'])
@Check('CK_loan_recovery_balances_status', "[status] IN ('PENDING_RECOVERY','RECOVERED','WRITTEN_OFF','CANCELLED')")
@Check('CK_loan_recovery_balances_amounts', '[amount] > 0 AND [recoveredAmount] >= 0 AND [writtenOffAmount] >= 0 AND [recoveredAmount] + [writtenOffAmount] <= [amount] AND [coveredAmount] >= 0 AND [coveredAmount] + [amount] = [loanBalance]')
export class LoanRecoveryBalance {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_loan_recovery_balances' }) id: number
  @Column({ type: 'int' }) employeeId: number
  @Column({ type: 'int' }) caseId: number
  // رصيد السلف عند التصفية = المُقاصّ من المستحقات + المتبقي المدين
  @Column({ type: 'decimal', precision: 18, scale: 2 }) loanBalance: string
  @Column({ type: 'decimal', precision: 18, scale: 2 }) coveredAmount: string
  @Column({ type: 'decimal', precision: 18, scale: 2 }) amount: string
  @Column({ type: 'decimal', precision: 18, scale: 2 }) recoveredAmount: string
  @Column({ type: 'decimal', precision: 18, scale: 2 }) writtenOffAmount: string
  @Column({ type: 'nvarchar', length: 20 }) status: LoanRecoveryStatus
  @Column({ type: 'nvarchar', length: 'MAX' }) sourceSnapshot: string
  @Column({ type: 'int', nullable: true }) createdByUserId: number | null
  @CreateDateColumn({ type: 'datetime2', default: () => 'SYSUTCDATETIME()' }) createdAt: Date
  @Column({ type: 'datetime2', nullable: true }) resolvedAt: Date | null
  @Column({ type: 'int', nullable: true }) resolvedByUserId: number | null
}

export type LoanRecoveryAction = 'CREATED' | 'COLLECTED' | 'WRITTEN_OFF' | 'CANCELLED'

// سجل مضاف فقط لكل حركة على الرصيد المتبقي (مسار التدقيق RP-11).
@Entity('loan_recovery_events')
@Index('IDX_loan_recovery_events_recovery', ['recoveryId'])
@Index('UX_loan_recovery_events_reference', ['recoveryId', 'reference'], { unique: true, where: '[reference] IS NOT NULL' })
@Check('CK_loan_recovery_events_action', "[action] IN ('CREATED','COLLECTED','WRITTEN_OFF','CANCELLED')")
export class LoanRecoveryEvent {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_loan_recovery_events' }) id: number
  @Column({ type: 'int' }) recoveryId: number
  @ManyToOne(() => LoanRecoveryBalance, { nullable: false, onDelete: 'NO ACTION', onUpdate: 'NO ACTION' })
  @JoinColumn({ name: 'recoveryId', foreignKeyConstraintName: 'FK_loan_recovery_event_balance' }) recovery: LoanRecoveryBalance
  @Column({ type: 'nvarchar', length: 20 }) action: LoanRecoveryAction
  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true }) amount: string | null
  @Column({ type: 'decimal', precision: 18, scale: 2 }) balanceAfter: string
  @Column({ type: 'nvarchar', length: 100, nullable: true }) reference: string | null
  @Column({ type: 'nvarchar', length: 500, nullable: true }) reason: string | null
  @Column({ type: 'int', nullable: true }) actorId: number | null
  @CreateDateColumn({ type: 'datetime2', default: () => 'SYSUTCDATETIME()' }) createdAt: Date
}
