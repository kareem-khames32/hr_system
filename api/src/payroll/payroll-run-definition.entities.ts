import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

// الخطوة 18 / PR-07: إقرار موثق بالاطلاع على تقرير «موظفون بلا مسير» لنسخة حساب محددة من المسير.
// سجل إلحاقي: الاعتماد يعيد بناء التقرير ويطابق بصمته؛ أي تغيير بعد الإقرار يلزم إقرارًا جديدًا.
@Entity('payroll_run_unassigned_acks')
@Index('IX_payroll_unassigned_ack_run', ['runId', 'id'])
export class PayrollRunUnassignedAck {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_payroll_run_unassigned_acks' }) id: number
  @Column({ type: 'int' }) runId: number
  @Column({ type: 'int' }) snapshotVersion: number
  @Column({ type: 'nvarchar', length: 7 }) period: string
  @Column({ type: 'date' }) startDate: string
  @Column({ type: 'date' }) endDate: string
  // null = تقرير الشركة كلها؛ رقم الفرع = إقرار مستخدم محصور بفرعه ولا يغطي اعتماد مستخدم على مستوى الشركة.
  @Column({ type: 'int', nullable: true }) scopeBranchId: number | null
  @Column({ type: 'nvarchar', length: 64 }) reportHash: string
  @Column({ type: 'int' }) reportRowCount: number
  @Column({ type: 'nvarchar', length: 500, nullable: true }) note: string | null
  @Column({ type: 'int' }) acknowledgedBy: number
  @CreateDateColumn({ type: 'datetime2', default: () => 'SYSUTCDATETIME()' }) acknowledgedAt: Date
}
