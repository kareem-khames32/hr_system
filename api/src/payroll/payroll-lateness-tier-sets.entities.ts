import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'

// الخطوة 21: مجموعة شرائح التأخير المؤرخة — تسري من شهر رواتب حتى تحل محلها أحدث؛ المحتوى لا يُعدّل بعد الحفظ (مجموعة جديدة بدلًا منه).
@Entity('payroll_lateness_tier_sets')
@Index('IX_payroll_lateness_tier_set_period', ['effectivePeriod', 'isActive'])
export class PayrollLatenessTierSet {
  @PrimaryGeneratedColumn() id: number
  // شهر الرواتب الذي تبدأ منه المجموعة (YYYY-MM)
  @Column({ type: 'nvarchar', length: 7 }) effectivePeriod: string
  // SHA-256 لشهر السريان والشرائح المطبّعة (payrollLatenessTierSetHash)
  @Column({ type: 'nvarchar', length: 64 }) contentHash: string
  // LEGACY_CONVERSION = تحويل الجدول القديم بترحيل 028، EDITOR = من شاشة معادلات الرواتب
  @Column({ type: 'nvarchar', length: 20 }) source: string
  @Column({ type: 'nvarchar', length: 500 }) reason: string
  @Column({ type: 'bit', default: true }) isActive: boolean
  @Column({ type: 'int', nullable: true }) createdBy: number | null
  @CreateDateColumn({ type: 'datetime2' }) createdAt: Date
  @Column({ type: 'int', nullable: true }) supersedesSetId: number | null
  @Column({ type: 'int', nullable: true }) deactivatedBy: number | null
  @Column({ type: 'datetime2', nullable: true }) deactivatedAt: Date | null
  @Column({ type: 'nvarchar', length: 500, nullable: true }) deactivationReason: string | null
}

@Entity('payroll_lateness_tier_set_tiers')
@Index('UX_payroll_lateness_tier_set_sequence', ['setId', 'sequence'], { unique: true })
export class PayrollLatenessTierSetTier {
  @PrimaryGeneratedColumn() id: number
  @Column({ type: 'int' }) setId: number
  @ManyToOne(() => PayrollLatenessTierSet, { onDelete: 'NO ACTION', onUpdate: 'NO ACTION' })
  @JoinColumn({ name: 'setId', foreignKeyConstraintName: 'FK_payroll_lateness_tier_set_tier_set' }) set: PayrollLatenessTierSet
  @Column({ type: 'int' }) sequence: number
  // حدود شاملة: من ≤ دقائق التأخير ≤ إلى (null = بلا نهاية)
  @Column({ type: 'int' }) fromMinutes: number
  @Column({ type: 'int', nullable: true }) toMinutes: number | null
  // FRACTION | MULTIPLIER | MINUTES | NONE
  @Column({ type: 'nvarchar', length: 12 }) mode: string
  // كسر اليوم أو المضاعف (0 لغيرهما)
  @Column({ type: 'decimal', precision: 9, scale: 3 }) value: string
  @Column({ type: 'nvarchar', length: 200, nullable: true }) label: string | null
}

// الخطوة 20: سبب مكتوب لفرق تكافؤ محدد (موظف + بند + المبلغين) — إلحاقي؛ شرط تحويل المسير إلى POLICY.
@Entity('payroll_run_parity_explanations')
@Index('IX_payroll_run_parity_explanation_run', ['runId', 'differenceKey'])
export class PayrollRunParityExplanation {
  @PrimaryGeneratedColumn() id: number
  @Column({ type: 'int' }) runId: number
  @Column({ type: 'int' }) snapshotVersion: number
  @Column({ type: 'int' }) employeeId: number
  @Column({ type: 'nvarchar', length: 30 }) component: string
  @Column({ type: 'nvarchar', length: 40 }) legacyAmount: string
  @Column({ type: 'nvarchar', length: 40, nullable: true }) policyAmount: string | null
  @Column({ type: 'nvarchar', length: 64 }) differenceKey: string
  @Column({ type: 'nvarchar', length: 500 }) reason: string
  @Column({ type: 'int' }) explainedBy: number
  @CreateDateColumn({ type: 'datetime2' }) explainedAt: Date
}
