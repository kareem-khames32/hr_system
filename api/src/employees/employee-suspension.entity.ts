import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'
import type { SuspensionStatus } from './employee-suspension-rules'

// الإيقاف عن العمل لفترة (قرار المالك 16 سبتمبر) — سجل كامل لكل إيقاف على ملف الموظف.
// الحالة «موقوف» مشتقة من التواريخ، فلا تُكتب على employees.status ولا تقفل isActive.
@Entity('employee_suspensions')
@Index(['employeeId', 'fromDate'])
export class EmployeeSuspension {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  employeeId: number

  @Column({ type: 'date' })
  fromDate: string

  // آخر يوم إيقاف فعلي — يتقدم عند الإنهاء المبكر
  @Column({ type: 'date' })
  toDate: string

  // النهاية المقررة وقت التسجيل (تبقى كما هي للتاريخ)
  @Column({ type: 'date' })
  plannedToDate: string

  @Column({ length: 500 })
  reason: string

  // ACTIVE | ENDED_EARLY | CANCELLED (الإنهاء قبل البداية = إلغاء)
  @Column({ type: String, length: 20, default: 'ACTIVE' })
  status: SuspensionStatus

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  endReason: string | null

  @Column({ type: 'datetime', nullable: true })
  endedAt: Date | null

  @Column({ type: 'int', nullable: true })
  endedByUserId: number | null

  @Column({ type: 'int', nullable: true })
  createdByUserId: number | null

  @CreateDateColumn()
  createdAt: Date
}
