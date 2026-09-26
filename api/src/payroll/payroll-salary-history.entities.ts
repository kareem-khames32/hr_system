import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Employee } from '../employees/employee.entity'

/** مراجعات إثبات الأجر تضاف دون تعديل النسخ السابقة أو ملف الموظف أو مسير الرواتب. */
@Entity('employee_salary_history_versions')
@Index('UX_employee_salary_history_revision', ['employeeId', 'revision'], { unique: true })
export class EmployeeSalaryHistoryVersion {
  @PrimaryGeneratedColumn() id: number
  @Column({ type: 'int' }) employeeId: number
  @ManyToOne(() => Employee, { onDelete: 'NO ACTION', onUpdate: 'NO ACTION' })
  @JoinColumn({ name: 'employeeId', foreignKeyConstraintName: 'FK_employee_salary_history_employee' }) employee: Employee
  @Column({ type: 'int' }) revision: number
  @Column({ type: 'nvarchar', length: 500 }) reason: string
  @Column({ type: 'nvarchar', length: 200 }) evidenceReference: string
  @Column({ type: 'nvarchar', length: 64 }) currentSourceHash: string
  @Column({ type: 'nvarchar', length: 64 }) contentHash: string
  // القيم السابقة تبقى null؛ لا يُستنتج شهر استحقاق من تاريخ قديم.
  @Column({ type: 'nvarchar', length: 64, nullable: true }) contractVersion: string | null
  @Column({ type: 'tinyint', nullable: true }) cycleStartDay: number | null
  @Column({ type: 'int' }) createdBy: number
  @CreateDateColumn({ type: 'datetime2' }) createdAt: Date
}

@Entity('employee_salary_history')
@Index('UX_employee_salary_history_sequence', ['versionId', 'sequence'], { unique: true })
export class EmployeeSalaryHistory {
  @PrimaryGeneratedColumn() id: number
  @Column({ type: 'int' }) versionId: number
  @ManyToOne(() => EmployeeSalaryHistoryVersion, { onDelete: 'NO ACTION', onUpdate: 'NO ACTION' })
  @JoinColumn({ name: 'versionId', foreignKeyConstraintName: 'FK_employee_salary_history_version' }) version: EmployeeSalaryHistoryVersion
  @Column({ type: 'int' }) sequence: number
  @Column({ type: 'date' }) effectiveFrom: string
  @Column({ type: 'date', nullable: true }) effectiveTo: string | null
  @Column({ type: 'nvarchar', length: 7, nullable: true }) effectivePayrollPeriod: string | null
  @Column({ type: 'nvarchar', length: 7, nullable: true }) effectiveToPayrollPeriod: string | null
  @Column({ type: 'nvarchar', length: 3 }) currency: 'SAR' | 'EGP'
  // القراءة والكتابة المالية بالنص العشري مباشرة؛ لا تمر المبالغ عبر Number.
  @Column({ type: 'decimal', precision: 18, scale: 2 }) basicSalary: string
  @Column({ type: 'decimal', precision: 18, scale: 2 }) housingAllowance: string
  @Column({ type: 'decimal', precision: 18, scale: 2 }) transportAllowance: string
  @Column({ type: 'decimal', precision: 18, scale: 2 }) phoneAllowance: string
  @Column({ type: 'decimal', precision: 18, scale: 2 }) workNatureAllowance: string
  @Column({ type: 'decimal', precision: 18, scale: 2 }) otherAllowance: string
  // بدل ضغط العمل (ترحيل 071): الفترات القديمة بقيمته الافتراضية صفر، فبصماتها المحفوظة زي ما هي بالحرف
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) workPressureAllowance: string
}
