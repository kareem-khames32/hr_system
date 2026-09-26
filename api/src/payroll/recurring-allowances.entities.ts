import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'
import { utcDateTime } from './payroll-policy.entities'

// «البدل الثابت الشهري» في «تابة البدلات» (ترحيل 20260926_071): إسناد نوع بدل لموظف بمبلغ شهري ثابت من شهر ولحد شهر اختياري.
// صف لكل موظف (الاستهداف بيتحول لأسماء الموظفين وقت الحفظ)؛ قيد الشهر نفسه في دفتر المديونيات بمرجع
// recurring-allowance:<id>:<الشهر> بيتعمل وقت حساب مسير الشهر (القواعد في recurring-allowances.ts).
@Entity('payroll_recurring_allowances')
@Index('IX_payroll_recurring_allowances_employee', ['employeeId', 'status'])
@Index('IX_payroll_recurring_allowances_type', ['allowanceTypeId'])
export class PayrollRecurringAllowance {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_payroll_recurring_allowances' }) id: number
  @Column({ type: 'int' }) employeeId: number
  // فرع الموظف وقت الإسناد (للتدقيق؛ عزل الفروع في التابة بفرعه الحالي)
  @Column({ type: 'int', nullable: true }) branchId: number | null
  @Column({ type: 'int' }) allowanceTypeId: number
  // اسم النوع وقت الإسناد = اسم السطر في المسير والقسيمة كل شهر
  @Column({ type: 'nvarchar', length: 120 }) typeName: string
  // المبلغ الشهري الكامل (قبل تناسب المنضم/المغادر)
  @Column({ type: 'decimal', precision: 18, scale: 2 }) amount: number | string
  // أول شهر رواتب (YYYY-MM)، وآخر شهر مخطط (شامل؛ null = مفتوح)
  @Column({ type: 'nvarchar', length: 7 }) fromPeriod: string
  @Column({ type: 'nvarchar', length: 7, nullable: true }) untilPeriod: string | null
  // اتعمل منين: company | branch | departments | teams | employees (إسناد «الشركة كلها» يوقفه حساب على مستوى الشركة بس)
  @Column({ type: 'nvarchar', length: 20 }) targetLevel: string
  @Column({ type: 'nvarchar', length: 500 }) reason: string
  // ACTIVE | STOPPED
  @Column({ type: 'nvarchar', length: 15, default: 'ACTIVE' }) status: string
  // الإيقاف: أول شهر ما يتصرفش، وسببه ومين وإمتى
  @Column({ type: 'nvarchar', length: 7, nullable: true }) stoppedFromPeriod: string | null
  @Column({ type: 'nvarchar', length: 500, nullable: true }) stopReason: string | null
  @Column({ type: 'int', nullable: true }) stoppedByUserId: number | null
  @Column({ type: 'datetime2', nullable: true, transformer: utcDateTime }) stoppedAt: Date | null
  @Column({ type: 'int' }) createdByUserId: number
  @CreateDateColumn({ type: 'datetime2', default: () => 'SYSUTCDATETIME()', transformer: utcDateTime }) createdAt: Date
}
