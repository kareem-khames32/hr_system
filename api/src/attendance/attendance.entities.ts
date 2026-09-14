import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm'

// مصدر البصمة الخام — الجهاز أو إدخال HR اليدوي
export type PunchSource = 'DEVICE' | 'MANUAL'

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

  // مصدر البصمة: DEVICE = جهاز (دفع بمفتاح الجهاز أو مزامنة)، MANUAL = إدخال يدوي
  // من HR. NULL = بصمة أقدم من الحقل (لها deviceSn = جهاز، وإلا مصدرها غير محدد)
  @Column({ length: 10, nullable: true })
  source: PunchSource

  // البصمة اليدوية: من أدخلها (users.id) ولماذا — NULL لبصمة الجهاز
  @Column({ nullable: true })
  createdByUserId: number

  @Column({ length: 500, nullable: true })
  reason: string

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

  // مرجع الوردية في الكتالوج — المصدر الحيّ لأوقاتها. الحقول أدناه لقطة
  // احتياطية فقط (صفوف قديمة/وردية محذوفة)، وتعديل الوردية يسري فوراً
  @Column({ nullable: true })
  shiftId: number

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

  // الرصيد الشهري المجاني — عدد مرات و/أو دقائق (NULL = بلا حد مجاني)
  // ما يتجاوز الرصيد يصير «بخصم» بنسبة deductionPct
  @Column({ nullable: true })
  monthlyFreeCount: number

  @Column({ nullable: true })
  monthlyFreeMinutes: number

  // نسبة خصم الدقائق المتجاوزة للرصيد (0-100، افتراضي 100 = خصم كامل)
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 100 })
  deductionPct: number

  // نطاق التغطية: morning = إذن تأخير (يعذر بداية الوردية فقط)،
  // evening = إذن انصراف مبكر (يعذر نهاية الوردية فقط)، both = الاثنان
  @Column({ length: 10, default: 'both' })
  coverage: 'morning' | 'evening' | 'both'

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

  // مرجع الوردية — نفس منطق الجدول الأسبوعي: الأوقات تُقرأ حيّة من الكتالوج
  @Column({ nullable: true })
  shiftId: number

  @Column({ length: 100 })
  shiftName: string

  @Column({ length: 5 })
  startTime: string // HH:mm

  @Column({ length: 5 })
  endTime: string
}

import type { AttendanceStatus } from '../common/domain-status'
import type { AttendanceRuleSnapshot, FlexOutcome } from './attendance-flex-calculator'
export type { AttendanceStatus } from '../common/domain-status'

// مصدر وردية اليوم المحسوب: تجاوز يوم / وردية الأسبوع / جدول عمل الموظف /
// جدول العمل الافتراضي (مفترَض) / لا شيء (بلا وردية)
export type ScheduleSource = 'override' | 'week' | 'employee' | 'default' | 'none'

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

  // مرجع وردية الكتالوج التي حُسب بها اليوم — NULL = ساعات جدول عمل أو بلا وردية
  @Column({ nullable: true })
  shiftId: number

  // مصدر الوردية — 'default' = لم تُسند للموظف وردية ولا جدول فطُبّق جدول العمل
  // الافتراضي، 'none' = لا جدول إطلاقاً. NULL = صف حُسب قبل هذا الحقل
  @Column({ length: 20, nullable: true })
  scheduleSource: ScheduleSource

  // يوم بلا أي وردية أو جدول (ولا جدول افتراضي): البصمة حضور بلا تأخير ولا
  // انصراف مبكر ولا أوفرتايم يوم عمل — معلَّم لـHR بدل افتراض 08:00-17:00 بصمت
  @Column({ default: false })
  unscheduled: boolean

  @Column({ type: String, length: 20 })
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

  @Column({ type: 'int', nullable: true })
  rawLateMinutes: number | null

  // After approved coverage, before grace: payroll's nonduplicated overlap basis.
  @Column({ type: 'int', nullable: true })
  unexcusedLateMinutes: number | null

  // After free coverage, before payroll overlap/caps. Unknown with a missing punch.
  @Column({ type: 'int', nullable: true })
  shortfallMinutes: number | null

  @Column({ type: 'int', nullable: true })
  countedWorkMinutes: number | null

  @Column({ type: 'int', nullable: true })
  earlyArrivalMinutes: number | null

  @Column({ type: 'nvarchar', length: 32, nullable: true })
  flexOutcome: FlexOutcome | null

  @Column({ type: 'bit', default: false })
  attendanceReviewRequired: boolean

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  attendanceReviewReason: string | null

  @Column({ type: 'simple-json', nullable: true })
  attendanceRuleSnapshot: AttendanceRuleSnapshot | null

  // موظف بصم يوم إجازته الكاملة — تعارض بانتظار قرار HR
  // (إلغاء الإجازة فيرجع الرصيد ويتحسب دواماً، أو إبقاؤها)
  @Column({ default: false })
  leaveConflict: boolean

  // بصمات خام خارج نافذتي الدخول والخروج معاً (HH:mm مفصولة بفاصلة) — لا تُرمى
  // بصمت بل تُعلَّم لمراجعة HR، ومنها ما استُخدم دخولاً/خروجاً احتياطياً. NULL = لا شيء
  @Column({ length: 200, nullable: true })
  punchAnomalies: string

  // السماحية المطبَّقة فعلاً على اليوم بالدقائق (سماحية الوردية إن حُدّدت، وإلا
  // العامة attendance.grace_minutes) — حتى يظهر أيهما سرى. NULL = يوم بلا مرجع
  // تأخير (إجازة/عطلة/بلا وردية) أو صف حُسب قبل هذا الحقل
  @Column({ nullable: true })
  graceUsed: number

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
