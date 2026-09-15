import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'

export type LoanInstallmentAllocationStatus = 'HELD' | 'POSTED' | 'RELEASED'

@Entity('loan_installment_allocations')
@Index('UX_loan_installment_allocation_active', ['installmentId'], { unique: true, where: '[releasedAt] IS NULL' })
@Index('IDX_loan_installment_allocation_run', ['payrollRunId'])
@Check('CK_loan_installment_allocation_amounts', '[deductedAmount] >= 0 AND [carriedAmount] >= 0')
@Check('CK_loan_installment_allocation_status', "[status] IN ('HELD','POSTED','RELEASED')")
export class LoanInstallmentAllocation {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_loan_installment_allocations' }) id: number
  // مراجع المصادر القديمة تُثبتها الخدمة تحت قفل الموظف؛ لا FKs جديدة على تلك الجداول.
  @Column({ type: 'int' }) installmentId: number
  @Column({ type: 'int' }) employeeId: number
  @Column({ type: 'int' }) payrollRunId: number
  @Column({ type: 'int' }) payrollSnapshotVersion: number
  @Column({ type: 'int' }) sourceRevision: number
  // SQL CAST نصي عند القراءة والكتابة؛ تحديد نوع TypeScript وحده لا يمنع تحويل driver إلىNumber.
  @Column({ type: 'decimal', precision: 18, scale: 2 }) deductedAmount: string
  @Column({ type: 'decimal', precision: 18, scale: 2 }) carriedAmount: string
  @Column({ type: 'date', nullable: true }) continuationDueDate: string | null
  @Column({ type: 'nvarchar', length: 30 }) outcome: string
  @Column({ type: 'nvarchar', length: 16 }) status: LoanInstallmentAllocationStatus
  @Column({ type: 'nvarchar', length: 'MAX' }) sourceSnapshot: string
  @Column({ type: 'int', nullable: true }) createdByUserId: number | null
  @CreateDateColumn({ type: 'datetime2', default: () => 'SYSUTCDATETIME()' }) claimedAt: Date
  // الحجز المنشور يبقى مانعًا لإعادة التحصيل ما دام releasedAt=null.
  @Column({ type: 'datetime2', nullable: true }) releasedAt: Date | null
  @Column({ type: 'datetime2', nullable: true }) postedAt: Date | null
  // C8 / الخطوة 31: الحجز المنشور الذي عُكس بمسير عكس — يبقى POSTED تاريخيًا ويُحرر (releasedAt) فيُعاد تحصيل القسط في مسير لاحق
  @Column({ type: 'int', nullable: true }) reversalRunId: number | null
  @Column({ type: 'datetime2', nullable: true }) reversedAt: Date | null
}

@Entity('loan_installment_events')
@Index('UX_loan_installment_event_action_key', ['actionKey'], { unique: true })
export class LoanInstallmentEvent {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_loan_installment_events' }) id: number
  @Column({ type: 'int' }) employeeId: number
  @Column({ type: 'int' }) loanId: number
  @Column({ type: 'int' }) installmentId: number
  @Column({ type: 'int', nullable: true }) allocationId: number | null
  @ManyToOne(() => LoanInstallmentAllocation, { nullable: true, onDelete: 'NO ACTION', onUpdate: 'NO ACTION' })
  @JoinColumn({ name: 'allocationId', foreignKeyConstraintName: 'FK_loan_installment_event_allocation' }) allocation: LoanInstallmentAllocation | null
  @Column({ type: 'int', nullable: true }) payrollRunId: number | null
  @Column({ type: 'int', nullable: true }) requestId: number | null
  @Column({ type: 'int', nullable: true }) actorId: number | null
  @Column({ type: 'nvarchar', length: 40 }) action: string
  @Column({ type: 'nvarchar', length: 150 }) actionKey: string
  @Column({ type: 'nvarchar', length: 500, nullable: true }) reason: string | null
  @Column({ type: 'nvarchar', length: 'MAX' }) payload: string
  @CreateDateColumn({ type: 'datetime2', default: () => 'SYSUTCDATETIME()' }) createdAt: Date
}
