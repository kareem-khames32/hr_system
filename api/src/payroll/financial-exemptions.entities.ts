import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'
import { utcDateTime } from './payroll-policy.entities'

// ============ الإعفاء المالي في مسير (الخطوة 26 — EX-01..08) ============
// قرار مستقل عن استثناء الحضور: يُسقط عن موظف بعينه في مسير بعينه خصمًا محددًا أو نوع خصم أو كل الخصومات القابلة للإعفاء،
// دون تعديل السياسة ولا مصدر الخصم (سطر الحضور وقيد الخصم المصنف يبقيان كما هما). يُطبق عند الحساب فيُنتج البند المشمول
// صفرًا موسومًا «مُعفى» بمرجع القرار، ويُثبت المبلغ المُسقط عند اعتماد المسير. أقساط السلف تُؤجل ولا تُسقط.

@Entity('payroll_financial_exemptions')
@Index('IX_payroll_financial_exemptions_run', ['runId'])
@Index('IX_payroll_financial_exemptions_employee', ['employeeId'])
@Index('IX_payroll_financial_exemptions_status', ['status'])
export class PayrollFinancialExemption {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_payroll_financial_exemptions' }) id: number
  // المسير المستهدف (مسير واحد فقط) وشهره للتقارير
  @Column({ type: 'int' }) runId: number
  @Column({ type: 'nvarchar', length: 7 }) period: string
  @Column({ type: 'int' }) employeeId: number
  // ALL_DEDUCTIONS | DEDUCTION_TYPE | SINGLE_ENTRY (EX-02)
  @Column({ type: 'nvarchar', length: 20 }) scopeKind: string
  // DEDUCTION_TYPE: LATENESS | SHORTFALL | ABSENCE | ADVANCE_INSTALLMENT | TYPED — SINGLE_ENTRY: LATENESS_DAY | SHORTFALL_DAY | ABSENCE_DAY | OBLIGATION | LOAN_INSTALLMENT
  @Column({ type: 'nvarchar', length: 30, nullable: true }) targetKind: string | null
  @Column({ type: 'int', nullable: true }) deductionTypeId: number | null
  // تاريخ اليوم (YYYY-MM-DD) أو رقم قيد الدفتر أو رقم قسط السلفة
  @Column({ type: 'nvarchar', length: 40, nullable: true }) targetRef: string | null
  // DROP (إسقاط نهائي) | DEFER_ONE_PERIOD (تأجيل للشهر التالي) — خصومات الحضور إسقاط فقط، والأقساط تأجيل دائمًا (EX-08)
  @Column({ type: 'nvarchar', length: 20 }) disposition: string
  @Column({ type: 'nvarchar', length: 1000 }) reason: string
  @Column({ type: 'nvarchar', length: 300, nullable: true }) attachmentRef: string | null
  // PENDING_APPROVAL | ACTIVE | APPLIED | REJECTED | REVOKED | EXPIRED | SUPERSEDED
  @Column({ type: 'nvarchar', length: 20 }) status: string
  // أساس المنح: HR | DEPARTMENT_MANAGER | FUNCTION_OWNER — يُطبع في القسيمة بالدور لا بالاسم
  @Column({ type: 'nvarchar', length: 30 }) grantorBasis: string
  @Column({ type: 'int' }) grantedByUserId: number
  @Column({ type: 'int', nullable: true }) grantedByEmployeeId: number | null
  // المبلغ المقدَّر وقت المنح من آخر حساب للمسير، والمبلغ المُسقط فعلًا عند اعتماد المسير (التقارير تقرأ اللقطة لا القيود الحية)
  @Column({ type: 'decimal', precision: 18, scale: 2 }) estimatedAmount: number | string
  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true }) exemptedAmountSnapshot: number | string | null
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true }) appliedLines: string | null
  @Column({ type: 'int', nullable: true }) appliedSnapshotVersion: number | null
  // تقييم المنح (السطور المقدرة والتنبيهات والحدود) وتجاوزات الحدود المسموحة (limit_override)
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true }) evaluation: string | null
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true }) overrides: string | null
  @Column({ type: 'int', nullable: true }) approvedByUserId: number | null
  @Column({ type: 'datetime2', nullable: true }) approvedAt: Date | null
  @Column({ type: 'int', nullable: true }) decidedByUserId: number | null
  @Column({ type: 'datetime2', nullable: true }) decidedAt: Date | null
  @Column({ type: 'nvarchar', length: 1000, nullable: true }) decisionReason: string | null
  @Column({ type: 'int', nullable: true }) supersededById: number | null
  @Column({ type: 'int' }) revision: number
  // وقت المنح بافتراضي SYSUTCDATETIME: يُقرأ UTC صراحةً (نفس محوّل نسخ السياسة وأحداث المسير) فلا يظهر أبكر بثلاث ساعات
  @CreateDateColumn({ type: 'datetime2', default: () => 'SYSUTCDATETIME()', transformer: utcDateTime }) createdAt: Date
  @Column({ type: 'datetime2', nullable: true }) updatedAt: Date | null
}

// سجل الإعفاءات (EX-08 قاعدة 6): كل انتقال حالة مع الفاعل والوقت والسبب، مربوطًا بالمسير والموظف
@Entity('payroll_financial_exemption_events')
@Index('IX_payroll_financial_exemption_events_exemption', ['exemptionId'])
@Index('IX_payroll_financial_exemption_events_employee', ['employeeId'])
export class PayrollFinancialExemptionEvent {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_payroll_financial_exemption_events' }) id: number
  @Column({ type: 'int' }) exemptionId: number
  @Column({ type: 'int' }) runId: number
  @Column({ type: 'int' }) employeeId: number
  @Column({ type: 'nvarchar', length: 40 }) eventType: string
  @Column({ type: 'int', nullable: true }) actorUserId: number | null
  @Column({ type: 'nvarchar', length: 20, nullable: true }) fromStatus: string | null
  @Column({ type: 'nvarchar', length: 20, nullable: true }) toStatus: string | null
  @Column({ type: 'nvarchar', length: 1000, nullable: true }) reason: string | null
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true }) payload: string | null
  @CreateDateColumn({ type: 'datetime2', default: () => 'SYSUTCDATETIME()', transformer: utcDateTime }) createdAt: Date
}
