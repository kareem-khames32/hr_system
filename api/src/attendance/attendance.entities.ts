import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm'

// سجل البصمة الخام من أجهزة ZKTeco — كود الموظف على الجهاز = employeeCode
@Entity('attendance_punches')
@Index(['employeeId', 'punchTime'])
export class AttendancePunch {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column({ length: 20 })
  employeeCode: string

  // يُحل من الكود وقت الاستقبال — NULL لو الكود غير معروف
  @Column({ nullable: true })
  employeeId: number

  @Column({ type: 'datetime' })
  punchTime: Date

  @Column({ length: 50, nullable: true })
  deviceSn: string

  @CreateDateColumn()
  receivedAt: Date
}

// الجدول الأسبوعي المؤرَّخ: مفتاح الأسبوع = تاريخ الأحد
// (أحمد وردية 10 هذا الأسبوع ووردية 11 الأسبوع القادم)
@Entity('weekly_schedule_entries')
@Unique(['weekStart', 'employeeId'])
export class ScheduleEntry {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column({ type: 'date' })
  weekStart: string

  @Index()
  @Column()
  employeeId: number

  @Column({ length: 100 })
  shiftName: string

  @Column({ length: 5 })
  startTime: string // HH:mm

  @Column({ length: 5 })
  endTime: string // HH:mm
}

export type AttendanceStatus =
  | 'present'
  | 'late'
  | 'absent'
  | 'early_leave'
  | 'leave' // في إجازة معتمدة
  | 'holiday' // عطلة رسمية

// اليوم المحسوب: البصمة مقابل وردية اليوم + فترة السماح
@Entity('attendance_days')
@Unique(['employeeId', 'date'])
export class AttendanceDay {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column()
  employeeId: number

  @Index()
  @Column({ nullable: true })
  branchId: number

  @Column({ type: 'date' })
  date: string

  @Column({ length: 5, nullable: true })
  checkIn: string // أول بصمة

  @Column({ length: 5, nullable: true })
  checkOut: string // آخر بصمة

  @Column({ length: 100 })
  shiftName: string

  @Column({ length: 5 })
  shiftStart: string

  @Column({ length: 5 })
  shiftEnd: string

  @Column({ length: 20 })
  status: AttendanceStatus

  @Column({ default: 0 })
  lateMinutes: number

  @Column({ default: 0 })
  earlyLeaveMinutes: number

  // دقائق معذورة بإذن معتمد — لا تُخصم في المسير
  @Column({ default: 0 })
  excusedMinutes: number

  @Column({ default: 0 })
  workMinutes: number

  @Column({ type: 'datetime', nullable: true })
  computedAt: Date
}
