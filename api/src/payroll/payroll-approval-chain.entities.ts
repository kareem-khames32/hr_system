import { Check, Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'
import { utcDateTime } from './payroll-policy.entities'

// سلسلة اعتماد المسير (قرار المالك 22 سبتمبر): مسؤول الرواتب يحسب ولا يعتمد، وبعد الحساب المسير بيطلع سلسلة خطوات
// بالترتيب، كل خطوة شخص بعينه (حساب دخول) أو دور، وآخر خطوة = الاعتماد النهائي (APPROVED).
//
// جدولان:
//   payroll_approval_chains  تعريف السلسلة: سلسلة الشركة الافتراضية (scope=COMPANY، seriesName='')،
//                            وسلسلة خاصة بمسير دائم باسمه (scope=RUN_SERIES، seriesName=اسم المسير).
//                            الخطوات JSON مرتبة؛ قائمة فاضية = «مفيش سلسلة» (الاعتماد بخطوة واحدة زي ما هو).
//   payroll_run_approvals    سجل القرارات (إلحاقي): اعتماد خطوة أو رفض بسبب، لنسخة حساب بعينها (snapshotVersion)
//                            وببصمة السلسلة وقتها؛ الإلغاء بـvoidedAt (رفض/إعادة فتح/تغيير السلسلة) لا بالحذف.

export type PayrollApprovalChainScope = 'COMPANY' | 'RUN_SERIES'
export type PayrollChainApproverKind = 'USER' | 'ROLE'
export type PayrollRunApprovalDecision = 'APPROVED' | 'REJECTED'

@Entity('payroll_approval_chains')
@Index('UX_payroll_approval_chain_key', ['scope', 'seriesName'], { unique: true })
// سلسلة الشركة بلا اسم مسير، والسلسلة الخاصة لازم باسم مسيرها
@Check('CK_payroll_approval_chain_scope', "([scope] = 'COMPANY' AND [seriesName] = '') OR ([scope] = 'RUN_SERIES' AND [seriesName] <> '')")
export class PayrollApprovalChain {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_payroll_approval_chains' }) id: number
  @Column({ type: 'nvarchar', length: 20 }) scope: PayrollApprovalChainScope
  // اسم المسير الدائم (مقصوص المسافات) — '' لسلسلة الشركة
  @Column({ type: 'nvarchar', length: 200 }) seriesName: string
  // JSON: [{ order, kind: USER|ROLE, userId, roleCode, label }]
  @Column({ type: 'nvarchar', length: 'MAX' }) steps: string
  @Column({ type: 'int' }) revision: number
  @Column({ type: 'int' }) updatedByUserId: number
  @Column({ type: 'datetime2', transformer: utcDateTime }) updatedAt: Date
}

@Entity('payroll_run_approvals')
@Index('IX_payroll_run_approval_run', ['runId', 'snapshotVersion'])
// خطوة واحدة معتمدة مرة واحدة لنسخة الحساب — حارس على مستوى القاعدة فوق قفل المسير
@Index('UX_payroll_run_approval_active_step', ['runId', 'snapshotVersion', 'stepOrder'], { unique: true,
  where: "[voidedAt] IS NULL AND [decision] = 'APPROVED'" })
// الرفض بسبب مكتوب دائمًا — مفروض على مستوى القاعدة كمان
@Check('CK_payroll_run_approval_decision', "[decision] = 'APPROVED' OR ([decision] = 'REJECTED' AND [reason] IS NOT NULL)")
export class PayrollRunApproval {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_payroll_run_approvals' }) id: number
  @Column({ type: 'int' }) runId: number
  @Column({ type: 'int' }) snapshotVersion: number
  @Column({ type: 'int' }) chainId: number
  @Column({ type: 'nvarchar', length: 64 }) chainHash: string
  @Column({ type: 'int' }) stepOrder: number
  @Column({ type: 'int' }) stepCount: number
  @Column({ type: 'nvarchar', length: 100 }) stepLabel: string
  @Column({ type: 'nvarchar', length: 10 }) approverKind: PayrollChainApproverKind
  @Column({ type: 'nvarchar', length: 50, nullable: true }) approverRoleCode: string | null
  @Column({ type: 'nvarchar', length: 10 }) decision: PayrollRunApprovalDecision
  @Column({ type: 'nvarchar', length: 500, nullable: true }) reason: string | null
  @Column({ type: 'int' }) actorUserId: number
  @Column({ type: 'datetime2', transformer: utcDateTime }) decidedAt: Date
  @Column({ type: 'datetime2', nullable: true, transformer: utcDateTime }) voidedAt: Date | null
  // REJECTED | REOPENED | CANCELLED | RECALCULATED | CHAIN_CHANGED
  @Column({ type: 'nvarchar', length: 20, nullable: true }) voidReason: string | null
}
