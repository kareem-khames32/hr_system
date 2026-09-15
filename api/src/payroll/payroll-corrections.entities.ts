import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'
import { utcDateTime } from './payroll-policy.entities'

// ============ C8 / الخطوة 31: عكس صرف مسير مصروف (SRS PR-11، DD-12، AD) ============
// مسير العكس (runType = REVERSAL، parentRunId = المسير المصروف) لا يحمل بنود payroll_items: كل سطر هنا يعكس بند موظف واحد في المسير الأصلي
// بلقطة مبالغه وبصمتها وقت الإنشاء. صفوف المسير الأصلي لا تُعدَّل أبدًا. التنفيذ (POSTED) يعيد الإضافي والأقساط لحالتها قبل الصرف،
// ويكتب قيود REVERSAL في دفتر الأقساط وقيود إعادة في دفتر المديونيات، ويحرر حجز فترة الموظف فيُصرف بمسير تكميلي مربوط.

export type PayrollReversalLineStatus = 'PENDING' | 'POSTED' | 'CANCELLED'

@Entity('payroll_run_reversal_lines')
@Index('IX_payroll_reversal_line_reversal_run', ['reversalRunId'])
@Index('IX_payroll_reversal_line_original', ['originalRunId', 'employeeId'])
// بند واحد لا يُعكس مرتين: سطر حي (معلق أو منفذ) واحد لكل بند أصلي
@Index('UX_payroll_reversal_line_active_item', ['originalItemId'], { unique: true, where: "[status] <> 'CANCELLED'" })
export class PayrollRunReversalLine {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_payroll_run_reversal_lines' }) id: number
  @Column({ type: 'int' }) reversalRunId: number
  @Column({ type: 'int' }) originalRunId: number
  @Column({ type: 'int' }) originalItemId: number
  @Column({ type: 'int' }) employeeId: number
  // PENDING (مسير العكس محسوب أو معتمد) | POSTED (نُفّذ العكس) | CANCELLED (أُلغي مسير العكس قبل التنفيذ)
  @Column({ type: 'nvarchar', length: 16 }) status: PayrollReversalLineStatus
  // صافي البند الأصلي المعكوس (موجب)؛ صافي مسير العكس = سالب مجموعه
  @Column({ type: 'decimal', precision: 18, scale: 2 }) netPay: number | string
  // لقطة مبالغ البند الأصلي (نصوص عشرية) وبصمتها: التنفيذ يرفض لو تغيّر البند (لا يحدث لمسير مصروف لكنه يُثبت)
  @Column({ type: 'nvarchar', length: 'MAX' }) itemSnapshot: string
  @Column({ type: 'nvarchar', length: 64 }) itemHash: string
  // ما نفّذه العكس فعلًا (إضافي، أقساط، قيود مُعادة، إعفاءات، حجوزات)؛ null قبل التنفيذ
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true }) effects: string | null
  @Column({ type: 'int' }) createdByUserId: number
  @CreateDateColumn({ type: 'datetime2', default: () => 'SYSUTCDATETIME()', transformer: utcDateTime }) createdAt: Date
  @Column({ type: 'int', nullable: true }) postedByUserId: number | null
  @Column({ type: 'datetime2', nullable: true, transformer: utcDateTime }) postedAt: Date | null
  @Column({ type: 'datetime2', nullable: true, transformer: utcDateTime }) cancelledAt: Date | null
}
