import { Check, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { PayrollPolicyVersion } from './payroll-policy.entities'

@Entity('payroll_tier_sets')
@Index('UX_payroll_tier_set_code', ['versionId', 'code'], { unique: true })
@Index('UX_payroll_tier_set_owner', ['versionId', 'id'], { unique: true })
export class PayrollTierSet {
  @PrimaryGeneratedColumn() id: number
  @Column({ type: 'int' }) versionId: number
  @ManyToOne(() => PayrollPolicyVersion, { onDelete: 'NO ACTION', onUpdate: 'NO ACTION' })
  @JoinColumn({ name: 'versionId', foreignKeyConstraintName: 'FK_payroll_tier_set_version' }) version: PayrollPolicyVersion
  @Column({ type: 'nvarchar', length: 40 }) code: string
  @Column({ type: 'nvarchar', length: 200 }) nameAr: string
  @Column({ type: 'nvarchar', length: 2000, nullable: true }) description: string | null
  @Column({ type: 'nvarchar', length: 40, nullable: true }) inputVar: string | null
  @Column({ type: 'nvarchar', length: 500, nullable: true }) inputFormula: string | null
  @Column({ type: 'nvarchar', length: 12 }) inputUnit: string
  @Column({ type: 'nvarchar', length: 24 }) applicationBasis: string
  @Column({ type: 'nvarchar', length: 8 }) tierApplicationMode: string
  @Column({ type: 'nvarchar', length: 24 }) graceMode: string
  @Column({ type: 'int' }) graceMinutes: number
  @Column({ type: 'int', nullable: true }) graceMaxUsesPerPeriod: number | null
  @Column({ type: 'bit' }) allowGraceOnFlexibleShift: boolean
  @Column({ type: 'bit' }) allowShiftGraceOverride: boolean
  @Column({ type: 'nvarchar', length: 16 }) noMatchBehavior: string
  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true }) maxDailyDeductionDayFraction: string | null
  @Column({ type: 'decimal', precision: 7, scale: 4, nullable: true }) maxPeriodDeductionDayFraction: string | null
  @Column({ type: 'nvarchar', length: 8 }) secondsRoundingMode: string
  @Column({ type: 'nvarchar', length: 8 }) minutesRoundingMode: string
  @Column({ type: 'tinyint' }) roundingUnitMinutes: number
  @Column({ type: 'nvarchar', length: 12, nullable: true }) roundingMode: string | null
  @Column({ type: 'tinyint', nullable: true }) roundingScale: number | null
  @Column({ type: 'bit' }) isActive: boolean
}

@Entity('payroll_policy_components')
@Index('UX_payroll_policy_component_code', ['versionId', 'code'], { unique: true })
@Index('UX_payroll_policy_component_sequence', ['versionId', 'stage', 'sequence'], { unique: true })
export class PayrollPolicyComponent {
  @PrimaryGeneratedColumn() id: number
  @Column({ type: 'int' }) versionId: number
  @ManyToOne(() => PayrollPolicyVersion, { onDelete: 'NO ACTION', onUpdate: 'NO ACTION' })
  @JoinColumn({ name: 'versionId', foreignKeyConstraintName: 'FK_payroll_policy_component_version' }) version: PayrollPolicyVersion
  @Column({ type: 'nvarchar', length: 40 }) code: string
  @Column({ type: 'nvarchar', length: 200 }) nameAr: string
  @Column({ type: 'nvarchar', length: 12 }) componentType: string
  @Column({ type: 'tinyint' }) stage: number
  @Column({ type: 'int' }) sequence: number
  @Column({ type: 'nvarchar', length: 20 }) valueSource: string
  @Column({ type: 'nvarchar', length: 500, nullable: true }) conditionFormula: string | null
  @Column({ type: 'nvarchar', length: 12 }) unit: string
  @Column({ type: 'nvarchar', length: 30 }) prorationMode: string
  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true }) amount: string | null
  @Column({ type: 'nvarchar', length: 60, nullable: true }) fieldPath: string | null
  @Column({ type: 'nvarchar', length: 8, nullable: true }) missingFieldBehavior: string | null
  @Column({ type: 'nvarchar', length: 40, nullable: true }) varCode: string | null
  @Column({ type: 'decimal', precision: 18, scale: 6, nullable: true }) multiplier: string | null
  @Column({ type: 'decimal', precision: 9, scale: 4, nullable: true }) percent: string | null
  @Column({ type: 'nvarchar', length: 48, nullable: true }) baseCode: string | null
  @Column({ type: 'int', nullable: true }) tierSetId: number | null
  @ManyToOne(() => PayrollTierSet, { nullable: true, onDelete: 'NO ACTION', onUpdate: 'NO ACTION' })
  @JoinColumn([{ name: 'versionId', referencedColumnName: 'versionId', foreignKeyConstraintName: 'FK_payroll_policy_component_tier_set' }, { name: 'tierSetId', referencedColumnName: 'id', foreignKeyConstraintName: 'FK_payroll_policy_component_tier_set' }]) tierSet: PayrollTierSet | null
  @Column({ type: 'nvarchar', length: 500, nullable: true }) formula: string | null
  @Column({ type: 'nvarchar', length: 40, nullable: true }) ledgerCategory: string | null
  @Column({ type: 'nvarchar', length: 6, nullable: true }) ledgerDirection: string | null
  @Column({ type: 'nvarchar', length: 16, nullable: true }) ledgerPartialPayment: string | null
  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true }) minAmount: string | null
  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true }) maxAmount: string | null
  @Column({ type: 'decimal', precision: 9, scale: 4, nullable: true }) capPctOfBase: string | null
  @Column({ type: 'nvarchar', length: 48, nullable: true }) capBaseCode: string | null
  @Column({ type: 'nvarchar', length: 12, nullable: true }) roundingMode: string | null
  @Column({ type: 'tinyint', nullable: true }) roundingScale: number | null
  @Column({ type: 'int', nullable: true }) deductionPriority: number | null
  @Column({ type: 'bit' }) carryOverEligible: boolean
  @Column({ type: 'nvarchar', length: 40, nullable: true }) rollupTo: string | null
  @Column({ type: 'bit' }) exemptible: boolean
  @Column({ type: 'bit' }) showOnPayslip: boolean
  @Column({ type: 'bit' }) isActive: boolean
}

@Entity('payroll_policy_parameters')
@Index('UX_payroll_policy_parameter_code', ['versionId', 'code'], { unique: true })
export class PayrollPolicyParameter {
  @PrimaryGeneratedColumn() id: number
  @Column({ type: 'int' }) versionId: number
  @ManyToOne(() => PayrollPolicyVersion, { onDelete: 'NO ACTION', onUpdate: 'NO ACTION' })
  @JoinColumn({ name: 'versionId', foreignKeyConstraintName: 'FK_payroll_policy_parameter_version' }) version: PayrollPolicyVersion
  @Column({ type: 'nvarchar', length: 40 }) code: string
  @Column({ type: 'nvarchar', length: 200 }) nameAr: string
  @Column({ type: 'decimal', precision: 18, scale: 6 }) value: string
  @Column({ type: 'nvarchar', length: 24 }) unit: string
  @Column({ type: 'bit' }) isActive: boolean
}

@Entity('payroll_policy_tiers')
@Index('UX_payroll_policy_tier_sequence', ['tierSetId', 'sequence'], { unique: true })
@Check('CK_payroll_policy_tier_bounds', '[sequence] > 0 AND [fromValue] >= 0 AND ([toValue] IS NULL OR [toValue] > [fromValue])')
@Check('CK_payroll_policy_tier_method', "([method] IN ('NONE','RATE_1_1') AND [multiplier] IS NULL AND [dayFraction] IS NULL AND [fixedAmount] IS NULL AND [formula] IS NULL) OR ([method] = 'MULTIPLIER' AND [multiplier] IS NOT NULL AND [multiplier] > 0 AND [dayFraction] IS NULL AND [fixedAmount] IS NULL AND [formula] IS NULL) OR ([method] = 'DAY_FRACTION' AND [dayFraction] IS NOT NULL AND [dayFraction] > 0 AND [dayFraction] <= 1 AND [multiplier] IS NULL AND [fixedAmount] IS NULL AND [formula] IS NULL) OR ([method] = 'FIXED_AMOUNT' AND [fixedAmount] IS NOT NULL AND [fixedAmount] > 0 AND [multiplier] IS NULL AND [dayFraction] IS NULL AND [formula] IS NULL) OR ([method] = 'FORMULA' AND [formula] IS NOT NULL AND [formula] <> N'' AND [multiplier] IS NULL AND [dayFraction] IS NULL AND [fixedAmount] IS NULL)")
export class PayrollPolicyTier {
  @PrimaryGeneratedColumn() id: number
  @Column({ type: 'int' }) tierSetId: number
  @ManyToOne(() => PayrollTierSet, { onDelete: 'NO ACTION', onUpdate: 'NO ACTION' })
  @JoinColumn({ name: 'tierSetId', foreignKeyConstraintName: 'FK_payroll_policy_tier_set' }) tierSet: PayrollTierSet
  @Column({ type: 'int' }) sequence: number
  // SQL يعيدdecimal كـNumber؛ القراءة المالية للنقل تستخدمCAST إلىnvarchar في خدمة الحفظ.
  @Column({ type: 'decimal', precision: 18, scale: 6 }) fromValue: string
  @Column({ type: 'decimal', precision: 18, scale: 6, nullable: true }) toValue: string | null
  @Column({ type: 'nvarchar', length: 16 }) method: string
  @Column({ type: 'decimal', precision: 6, scale: 3, nullable: true }) multiplier: string | null
  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true }) dayFraction: string | null
  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true }) fixedAmount: string | null
  @Column({ type: 'nvarchar', length: 500, nullable: true }) formula: string | null
  @Column({ type: 'nvarchar', length: 200, nullable: true }) label: string | null
  @Column({ type: 'bit' }) isActive: boolean
}
