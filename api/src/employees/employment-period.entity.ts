import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

// B2.10 (ترحيل 095): فترة خدمة مقفولة لموظف اتعيّن تاني. الفترة المفتوحة مش هنا: هي صف الموظف نفسه (تاريخ تعيينه الحالي)،
// فكل الحسابات اللي بتقرا تاريخ التعيين بتقرا بداية الفترة الحالية من غير ما تتلمس. نفس الشكل في الترحيل بالحرف.
@Entity('employment_periods')
@Index('UX_employment_periods_employee_no', ['employeeId', 'periodNo'], { unique: true })
export class EmploymentPeriod {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_employment_periods' })
  id: number

  @Column({ type: 'int' })
  employeeId: number

  // 1 = أول فترة خدمة للموظف
  @Column({ type: 'int' })
  periodNo: number

  // تاريخ التعيين اللي كانت الفترة دي محسوبة منه
  @Column({ type: 'date' })
  startDate: string

  // آخر يوم عمل في ملف الإنهاء المقفول
  @Column({ type: 'date' })
  endDate: string

  // سبب الخروج من ملف الإنهاء (استقالة، إنهاء…)
  @Column({ type: 'nvarchar', length: 60, nullable: true })
  exitReason: string | null

  @Column({ type: 'int', nullable: true })
  offboardingCaseId: number | null

  // سبب إعادة التعيين اللي قفلت الفترة دي وفتحت اللي بعدها
  @Column({ type: 'nvarchar', length: 500 })
  rehireReason: string

  @Column({ type: 'int', nullable: true })
  rehiredByUserId: number | null

  @Column({ type: 'datetime2' })
  createdAt: Date
}
