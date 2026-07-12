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

// أنواع الإذن: «بدون خصم» يعذر التأخير مجاناً (الافتراضي)،
// «بخصم» يعذره من الغياب لكن دقائق التأخير المتداخلة تُسجل للخصم بالمسير
@Entity('permission_types')
export class PermissionType {
  @PrimaryGeneratedColumn()
  id: number

  @Index({ unique: true })
  @Column({ length: 100 })
  nameAr: string

  @Column({ default: false })
  isDeductible: boolean

  // أقصى مدة للإذن بالدقائق (NULL = بلا حد)
  @Column({ nullable: true })
  maxDurationMinutes: number

  @Column({ default: true })
  isActive: boolean
}

// تجاوز وردية يوم بعينه — يتقدم على وردية الأسبوع (حالة خاصة/يوم استثنائي)
@Entity('schedule_day_overrides')
@Unique(['employeeId', 'date'])
export class ScheduleDayOverride {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column()
  employeeId: number

  @Index()
  @Column({ type: 'date' })
  date: string

  @Column({ length: 100 })
  shiftName: string

  @Column({ length: 5 })
  startTime: string // HH:mm

  @Column({ length: 5 })
  endTime: string
}

export type AttendanceStatus =
  | 'present'
  | 'late'
  | 'absent'
  | 'early_leave'
  | 'leave' // في إجازة معتمدة (يوم كامل)
  | 'partial_leave' // إجازة نصف يوم — الفترة المغطاة بلا تأخير
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

  // دقائق معذورة بإذن معتمد «بدون خصم» أو إجازة جزئية — لا تُخصم
  @Column({ default: 0 })
  excusedMinutes: number

  // دقائق متأخرة غطاها إذن «بخصم» — لا تُحسب غياباً لكنها تُخصم بالمسير
  @Column({ default: 0 })
  deductibleMinutes: number

  @Column({ default: 0 })
  workMinutes: number

  // موظف بصم يوم إجازته الكاملة — تعارض بانتظار قرار HR
  // (إلغاء الإجازة فيرجع الرصيد ويتحسب دواماً، أو إبقاؤها)
  @Column({ default: false })
  leaveConflict: boolean

  @Column({ type: 'datetime', nullable: true })
  computedAt: Date
}

// قواعد استثناء أيام العمل — تُبطِل الافتراضي (الويك إند) ليوم بعينه:
// «آخر سبت في الشهر = دوام رسمي» (WORK) أو «أول خميس = إجازة» (OFF)
export type RuleWeekday =
  | 'SUN' | 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT'
export type RuleOccurrence = 'ALL' | '1ST' | '2ND' | '3RD' | '4TH' | 'LAST'
export type RuleEffect = 'WORK' | 'OFF' // تحويل عطلة→دوام | دوام→عطلة

@Entity('schedule_exception_rules')
export class ScheduleExceptionRule {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 200 })
  name: string

  @Column({ length: 10 })
  weekday: RuleWeekday

  @Column({ length: 10, default: 'ALL' })
  occurrence: RuleOccurrence

  @Column({ length: 10 })
  effect: RuleEffect

  // NULL = يسري على كل الفروع؛ قيمة = فرع بعينه (يتقدّم على العام)
  @Column({ nullable: true })
  branchId: number

  @Column({ default: true })
  isActive: boolean
}

// فترات فتح/قفل احتساب الأوفرتايم بالتواريخ — تتقدّم على المفتاح العام
// «افتح رمضان» (OPEN) أو «اقفل أول أسبوعين» (CLOSED)؛ CLOSED يحسم عند التداخل
export type OvertimePeriodEffect = 'OPEN' | 'CLOSED'

@Entity('overtime_periods')
export class OvertimePeriod {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 200 })
  name: string

  @Column({ type: 'date' })
  fromDate: string

  @Column({ type: 'date' })
  toDate: string

  @Column({ length: 10 })
  effect: OvertimePeriodEffect

  @Column({ nullable: true })
  branchId: number

  @Column({ default: true })
  isActive: boolean
}
