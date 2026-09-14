import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm'
import { PayrollPolicyVersion, utcDateTime } from './payroll-policy.entities'

/**
 * ختم نسخة السياسة المنشورة (الخطوة 15): بصمة المحتوى كما جُمّد، صف واحد لكل نسخة.
 * جدول مستقل حتى لا يتغير مخطط payroll_policy_versions الذي تثبته ترحيلات 006–010 واختباراتها؛
 * مشغل قاعدة البيانات (ترحيل 022) يمنع تعديل الختم، ومراجعة النشر تعيد حساب البصمة وتقارنها.
 */
@Entity('payroll_policy_version_seals')
export class PayrollPolicyVersionSeal {
  @PrimaryColumn({ type: 'int', primaryKeyConstraintName: 'PK_payroll_policy_version_seal' }) versionId: number
  @OneToOne(() => PayrollPolicyVersion, { onDelete: 'NO ACTION', onUpdate: 'NO ACTION' })
  @JoinColumn({ name: 'versionId', foreignKeyConstraintName: 'FK_payroll_policy_version_seal_version' }) version: PayrollPolicyVersion
  @Column({ type: 'nvarchar', length: 64 }) contentHash: string
  @Column({ type: 'nvarchar', length: 40 }) sealVersion: string
  @Column({ type: 'int' }) sealedBy: number
  @CreateDateColumn({ type: 'datetime2', default: () => 'SYSUTCDATETIME()', transformer: utcDateTime }) sealedAt: Date
}
