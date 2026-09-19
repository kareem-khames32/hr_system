import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'
import { utcDateTime } from './payroll-policy.entities'

// «تابة البدلات» في شاشة المسير (ترحيل 20260919_057):
// أنواع البدلات يضيفها الموارد البشرية (للشركة كلها افتراضيًا، أو خاصة بفرع)، وصرف بدل لشهر بمبلغ ثابت على استهداف
// (الشركة ← فرع ← أقسام ← فرق ← موظفين) = دفعة + سطر لكل موظف مربوط بإضافة في دفتر المديونيات (CREDIT / allowance).

@Entity('payroll_allowance_types')
@Index('UX_payroll_allowance_types_code', ['code'], { unique: true })
export class PayrollAllowanceType {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_payroll_allowance_types' }) id: number
  @Column({ type: 'nvarchar', length: 40 }) code: string
  // الاسم اللي بيظهر سطر في المسير والقسيمة (مثلًا «بدل انتقالات إضافي»)
  @Column({ type: 'nvarchar', length: 120 }) name: string
  // null = للشركة كلها؛ رقم = نوع خاص بالفرع ده
  @Column({ type: 'int', nullable: true }) branchId: number | null
  @Column({ type: 'bit', default: true }) isActive: boolean
  @Column({ type: 'int' }) createdByUserId: number
  @CreateDateColumn({ type: 'datetime2', default: () => 'SYSUTCDATETIME()', transformer: utcDateTime }) createdAt: Date
  @Column({ type: 'int', nullable: true }) updatedByUserId: number | null
  @Column({ type: 'datetime2', nullable: true, transformer: utcDateTime }) updatedAt: Date | null
}

// دفعة صرف: الشهر والنوع (باسمه وقت الصرف) والمبلغ لكل موظف والاستهداف والسبب
@Entity('payroll_allowance_grants')
@Index('IX_payroll_allowance_grants_period', ['period'])
export class PayrollAllowanceGrant {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_payroll_allowance_grants' }) id: number
  // شهر المسير YYYY-MM
  @Column({ type: 'nvarchar', length: 7 }) period: string
  @Column({ type: 'int' }) allowanceTypeId: number
  @Column({ type: 'nvarchar', length: 120 }) typeName: string
  @Column({ type: 'decimal', precision: 18, scale: 2 }) amount: number | string
  // company | branch | departments | teams | employees
  @Column({ type: 'nvarchar', length: 20 }) targetLevel: string
  @Column({ type: 'int', nullable: true }) branchId: number | null
  // أرقام الأقسام أو الفرق أو الموظفين (JSON)
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true }) targetIds: string | null
  @Column({ type: 'nvarchar', length: 500 }) reason: string
  @Column({ type: 'int' }) employeeCount: number
  @Column({ type: 'int' }) createdByUserId: number
  @CreateDateColumn({ type: 'datetime2', default: () => 'SYSUTCDATETIME()', transformer: utcDateTime }) createdAt: Date
}

// سطر لكل موظف: مبلغه وقيد الدفتر بتاعه، والإلغاء قبل اعتماد المسير
@Entity('payroll_allowance_grant_lines')
@Index('IX_payroll_allowance_grant_lines_period', ['period', 'status'])
@Index('IX_payroll_allowance_grant_lines_grant', ['grantId'])
@Index('IX_payroll_allowance_grant_lines_employee', ['employeeId', 'period'])
export class PayrollAllowanceGrantLine {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_payroll_allowance_grant_lines' }) id: number
  @Column({ type: 'int' }) grantId: number
  @Column({ type: 'nvarchar', length: 7 }) period: string
  @Column({ type: 'int' }) employeeId: number
  // فرع الموظف وقت الصرف (عزل الفروع في التابة)
  @Column({ type: 'int', nullable: true }) branchId: number | null
  @Column({ type: 'int' }) allowanceTypeId: number
  @Column({ type: 'decimal', precision: 18, scale: 2 }) amount: number | string
  // employee_obligations.id (CREDIT / allowance)
  @Column({ type: 'int', nullable: true }) obligationId: number | null
  // ACTIVE | CANCELLED
  @Column({ type: 'nvarchar', length: 15, default: 'ACTIVE' }) status: string
  @CreateDateColumn({ type: 'datetime2', default: () => 'SYSUTCDATETIME()', transformer: utcDateTime }) createdAt: Date
  @Column({ type: 'int', nullable: true }) cancelledByUserId: number | null
  @Column({ type: 'datetime2', nullable: true, transformer: utcDateTime }) cancelledAt: Date | null
}
