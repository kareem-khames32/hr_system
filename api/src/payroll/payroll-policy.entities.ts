import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import type { PayrollScopeType } from './payroll.entities'
import type { PayrollPolicySettings } from './payroll-policy-settings'
import type { PayrollCollectionPolicy } from './payroll-collection-policy'

export type PayrollPolicyVersionStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
export type PayrollPolicyContractVersion = 'LEGACY_V1' | 'SRS_V1'
export interface PayrollPolicyVersionMetadata { title: string | null; notes: string | null }

// الخطوة 15: وقت النشر والتجميد يُخزن بتوقيت UTC مثل createdAt/updatedAt (GETDATE في حاوية SQL) وSYSUTCDATETIME.
// مشغل mssql في TypeORM يكتب ويقرأ datetime2 بالتوقيت المحلي (useUTC=false)؛ التحويل هنا يحفظ اللحظة نفسها
// في القاعدة بساعة UTC ويعيدها للـAPI لحظة صحيحة، دون تغيير مخطط العمود.
export const utcDateTime = {
  to: (value: unknown) => value instanceof Date
    ? new Date(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), value.getUTCHours(), value.getUTCMinutes(), value.getUTCSeconds(), value.getUTCMilliseconds())
    : value,
  from: (value: unknown) => value instanceof Date
    ? new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate(), value.getHours(), value.getMinutes(), value.getSeconds(), value.getMilliseconds()))
    : value,
}

@Entity('payroll_policies')
@Index('UX_payroll_policy_code', ['code'], { unique: true })
@Index('IX_payroll_policy_branch', ['branchId'])
export class PayrollPolicy {
  @PrimaryGeneratedColumn() id: number
  @Column({ type: 'nvarchar', length: 40 }) code: string
  @Column({ type: 'nvarchar', length: 200 }) name: string
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true }) description: string | null
  // ملكية الإدارة ثابتة؛ النطاق المقترح أدناه لا يمنح صلاحية لفرع آخر.
  @Column({ type: 'int', nullable: true }) branchId: number | null
  @Column({ type: 'nvarchar', length: 20, nullable: true }) defaultScopeType: PayrollScopeType | null
  @Column({ type: 'simple-json', nullable: true }) defaultScopeIds: number[] | null
  @Column({ type: 'bit', default: true }) isActive: boolean
  @Column({ type: 'int', default: 1 }) revision: number
  // ترحيل 033 — طريقة الخصم لكل مجموعة معادلات: null = القيمة من نسخة السياسة المنشورة ثم الإعدادات العامة.
  @Column({ type: 'bit', nullable: true }) lateDeductionEnabled: boolean | null
  @Column({ type: 'int', nullable: true }) latenessTierSetId: number | null
  @Column({ type: 'bit', nullable: true }) earlyLeaveDeductionEnabled: boolean | null
  @Column({ type: 'bit', nullable: true }) shortfallEnabled: boolean | null
  @Column({ type: 'nvarchar', length: 12, nullable: true }) shortfallMode: 'MINUTES' | 'MULTIPLIER' | 'FRACTION' | null
  @Column({ type: 'decimal', precision: 9, scale: 4, nullable: true }) shortfallValue: number | null
  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true }) absencePenaltyDays: number | null
  @Column({ type: 'int' }) createdBy: number
  @Column({ type: 'int' }) updatedBy: number
  @CreateDateColumn({ type: 'datetime2' }) createdAt: Date
  @UpdateDateColumn({ type: 'datetime2' }) updatedAt: Date
}

@Entity('payroll_policy_versions')
@Index('UX_payroll_policy_version_number', ['policyId', 'versionNo'], { unique: true })
export class PayrollPolicyVersion {
  @PrimaryGeneratedColumn() id: number
  @Column({ type: 'int' }) policyId: number
  @ManyToOne(() => PayrollPolicy, { onDelete: 'NO ACTION', onUpdate: 'NO ACTION' })
  @JoinColumn({ name: 'policyId', foreignKeyConstraintName: 'FK_payroll_policy_version_policy' }) policy: PayrollPolicy
  @Column({ type: 'int' }) versionNo: number
  @Column({ type: 'int', nullable: true }) sourceVersionId: number | null
  @ManyToOne(() => PayrollPolicyVersion, { nullable: true, onDelete: 'NO ACTION', onUpdate: 'NO ACTION' })
  @JoinColumn({ name: 'sourceVersionId', foreignKeyConstraintName: 'FK_payroll_policy_version_source' }) sourceVersion: PayrollPolicyVersion | null
  @Column({ type: 'nvarchar', length: 12, default: 'DRAFT' }) status: PayrollPolicyVersionStatus
  @Column({ type: 'date' }) effectiveFrom: string
  @Column({ type: 'date', nullable: true }) effectiveTo: string | null
  // رقم العقد يثبت معنى النسخة؛ لا يُستنتج من نصوصها ولا يتغير بتعديل بياناتها الوصفية.
  @Column({ type: 'nvarchar', length: 20, default: 'SRS_V1' }) contractVersion: PayrollPolicyContractVersion
  @Column({ type: 'simple-json', nullable: true }) metadata: PayrollPolicyVersionMetadata | null
  // لا تُملأ النسخ السابقة؛ تثبت هذه القيم عند حفظ تعريف البنود كاملًا فقط.
  @Column({ type: 'nvarchar', length: 40, nullable: true }) catalogVersion: string | null
  @Column({ type: 'nvarchar', length: 40, nullable: true }) engineVersion: string | null
  @Column({ type: 'simple-json', nullable: true }) definitionWarningAcknowledgements: string[] | null
  // قرار التحصيل جزء من النسخة؛ النسخ التاريخية تظل null بلا ترتيب مفترض.
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true, transformer: {
    to: (value: any) => value == null ? null : value?.storageState === 'INVALID_COLLECTION_JSON' && typeof value.rawValue === 'string' && Object.keys(value).length === 2 ? value.rawValue : JSON.stringify(value),
    // البيانات التالفة قابلة للعرض كـINVALID والإصلاح؛ لا نستبدلها بترتيب افتراضي ولا نفشل قراءة النسخة كلها.
    from: (value: string | null) => {
      if (value === null) return null
      try {
        const parsed = JSON.parse(value)
        const exactKeys = (object: any, keys: string[]) => object !== null && typeof object === 'object' && !Array.isArray(object) && Object.keys(object).length === keys.length && keys.every(key => Object.prototype.hasOwnProperty.call(object, key))
        // هذه الوثيقة نصية بالكامل؛ حفظ كائن تالف به أرقام قد يقرّبها أو يحوّل Infinity إلى null عند النسخ.
        if (exactKeys(parsed, ['schemaVersion', 'classifications', 'collectionOrder']) && typeof parsed.schemaVersion === 'string'
          && Array.isArray(parsed.classifications) && parsed.classifications.every((row: any) => exactKeys(row, ['componentCode', 'kind']) && typeof row.componentCode === 'string' && typeof row.kind === 'string')
          && Array.isArray(parsed.collectionOrder) && parsed.collectionOrder.every((code: any) => typeof code === 'string')) return parsed
      } catch { /* يبقى النص الأصلي داخل غلاف لا يمكن قبوله كسياسة صالحة. */ }
      return { storageState: 'INVALID_COLLECTION_JSON', rawValue: value }
    },
  } }) collectionPolicy: PayrollCollectionPolicy | null
  // القيم التاريخية تظل فارغة؛ الإنشاء الجديد وحده يثبت افتراضاته وقت الحفظ.
  @Column({ type: 'nvarchar', length: 20, nullable: true }) defaultPeriodType: PayrollPolicySettings['defaultPeriodType'] | null
  @Column({ type: 'tinyint', nullable: true }) cycleStartDay: number | null
  @Column({ type: 'nvarchar', length: 12, nullable: true }) cycleEndMode: PayrollPolicySettings['cycleEndMode'] | null
  @Column({ type: 'tinyint', nullable: true }) cycleEndDay: number | null
  @Column({ type: 'nvarchar', length: 12, nullable: true }) baseDaysBasis: PayrollPolicySettings['baseDaysBasis'] | null
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true }) monthlyDays: number | null
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true }) dailyHours: number | null
  @Column({ type: 'nvarchar', length: 12, nullable: true }) rateBase: PayrollPolicySettings['rateBase'] | null
  @Column({ type: 'nvarchar', length: 12, nullable: true }) roundingMode: PayrollPolicySettings['roundingMode'] | null
  @Column({ type: 'tinyint', nullable: true }) roundingScale: number | null
  @Column({ type: 'nvarchar', length: 20, nullable: true }) divisionByZeroMode: PayrollPolicySettings['divisionByZeroMode'] | null
  @Column({ type: 'decimal', precision: 7, scale: 4, nullable: true }) maxDeductionPctOfGross: number | null
  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true }) minNetGuarantee: number | null
  @Column({ type: 'decimal', precision: 7, scale: 4, nullable: true }) netFloorPct: number | null
  @Column({ type: 'bit', nullable: true }) carryOverExcess: boolean | null
  @Column({ type: 'bit', nullable: true }) skipAttendance: boolean | null
  @Column({ type: 'bit', nullable: true }) lateDeductionEnabled: boolean | null
  @Column({ type: 'nvarchar', length: 3, nullable: true }) currency: PayrollPolicySettings['currency'] | null
  @Column({ type: 'int', default: 1 }) revision: number
  @Column({ type: 'datetime2', nullable: true, transformer: utcDateTime }) publishedAt: Date | null
  @Column({ type: 'int', nullable: true }) publishedBy: number | null
  @Column({ type: 'datetime2', nullable: true, transformer: utcDateTime }) frozenAt: Date | null
  @Column({ type: 'int' }) createdBy: number
  @Column({ type: 'int' }) updatedBy: number
  @CreateDateColumn({ type: 'datetime2' }) createdAt: Date
  @UpdateDateColumn({ type: 'datetime2' }) updatedAt: Date
}

@Entity('payroll_policy_events')
@Index('IX_payroll_policy_event_policy', ['policyId', 'id'])
export class PayrollPolicyEvent {
  @PrimaryGeneratedColumn() id: number
  @Column({ type: 'int' }) policyId: number
  @ManyToOne(() => PayrollPolicy, { onDelete: 'NO ACTION', onUpdate: 'NO ACTION' })
  @JoinColumn({ name: 'policyId', foreignKeyConstraintName: 'FK_payroll_policy_event_policy' }) policy: PayrollPolicy
  @Column({ type: 'int', nullable: true }) versionId: number | null
  @ManyToOne(() => PayrollPolicyVersion, { nullable: true, onDelete: 'NO ACTION', onUpdate: 'NO ACTION' })
  @JoinColumn({ name: 'versionId', foreignKeyConstraintName: 'FK_payroll_policy_event_version' }) version: PayrollPolicyVersion | null
  @Column({ type: 'nvarchar', length: 30 }) eventType: string
  @Column({ type: 'int' }) actorUserId: number
  @Column({ type: 'nvarchar', length: 500, nullable: true }) reason: string | null
  @Column({ type: 'simple-json' }) payload: Record<string, unknown>
  @CreateDateColumn({ type: 'datetime2' }) createdAt: Date
}
