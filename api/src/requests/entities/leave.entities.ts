import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm'
import type { BalanceType, LeavePeriod, LeaveStatus, LeaveTypeCode } from '../../common/domain-status'
import { leaveView, leaveTypeView } from '../../common/leave-contract'
export type { LeavePeriod, LeaveStatus } from '../../common/domain-status'

// ============ وجهة الإجازات — LeaveType قابل للإعداد ============

@Entity('leave_types')
export class LeaveType {
  @PrimaryGeneratedColumn()
  id: number

  @Index({ unique: true })
  @Column({ length: 50 })
  code: string // ANNUAL, SICK, CASUAL...

  @Column({ length: 200 })
  nameAr: string

  @Column({ default: true })
  isPaid: boolean

  // بيخصم من رصيد إيه: annual | sick | none
  @Column({ type: String, name: 'balanceType', length: 50, nullable: true })
  balanceType: BalanceType | null

  /** @deprecated compatibility alias; persistence uses balanceType. */
  get balanceSource() { return this.balanceType }
  set balanceSource(value: BalanceType | null) { this.balanceType = value }
  toJSON() { return leaveTypeView(this) }

  @Column({ length: 100, nullable: true })
  requiredAttachment: string

  @Column({ nullable: true })
  maxDays: number

  // الحج — مرة واحدة طوال الخدمة
  @Column({ default: false })
  oncePerService: boolean

  @Column({ nullable: true })
  approvalChainId: number

  @Column({ default: true })
  isActive: boolean

  // ===== شاشة أنواع الإجازات (قرار المالك 16 سبتمبر) =====
  // الفئة تحدد باقي الإعداد: ANNUAL برصيد سنوي · OCCASION بمناسبة · SICK مرضية بأجر متدرج · UNPAID بدون راتب
  @Column({ type: 'nvarchar', length: 20, nullable: true })
  category: string | null

  @Column({ type: 'nvarchar', length: 200, nullable: true })
  nameEn: string | null

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  description: string | null

  // الرصيد (السنوية والمرضية): أيام السنة، ويتجدد أول السنة أو في ذكرى التعيين، والترحيل وسقفه
  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  annualDays: number | null

  @Column({ type: 'nvarchar', length: 20, default: 'YEAR_START' })
  renewalBasis: string

  @Column({ default: false })
  carryOverEnabled: boolean

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  carryOverMaxDays: number | null

  // المناسبة: أيام ثابتة للمرة، وأقصى مرات في السنة (مرة طول الخدمة = oncePerService)
  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  fixedDays: number | null

  @Column({ type: 'int', nullable: true })
  maxTimesPerYear: number | null

  // المرضية: [{fromDay,toDay|null,payPercent}] على مجموع أيام المرض في السنة
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  sickPayTiers: string | null

  // شروط الطلب (أقصى أيام للطلب الواحد = maxDays)
  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  minDaysPerRequest: number | null

  @Column({ type: 'int', default: 0 })
  noticeDays: number

  @Column({ default: true })
  backdateAllowed: boolean

  @Column({ type: 'int', nullable: true })
  backdateMaxDays: number | null

  // ALL_DAYS كل أيام التقويم · WORKING_DAYS أيام العمل فقط
  @Column({ type: 'nvarchar', length: 20, default: 'WORKING_DAYS' })
  countingMode: string

  @Column({ default: true })
  halfDayAllowed: boolean

  // المرفق: NONE · OPTIONAL · REQUIRED · REQUIRED_ABOVE_DAYS (اسمه = requiredAttachment)
  @Column({ type: 'nvarchar', length: 30, default: 'NONE' })
  attachmentRule: string

  @Column({ type: 'int', nullable: true })
  attachmentAboveDays: number | null

  // WITH_REQUEST مع الطلب · AFTER_RETURN بعد الرجوع خلال attachmentDeadlineDays وإلا تتحول الأيام بدون راتب
  @Column({ type: 'nvarchar', length: 20, default: 'WITH_REQUEST' })
  attachmentTiming: string

  @Column({ type: 'int', default: 7 })
  attachmentDeadlineDays: number

  // فرع النوع: null = كل الشركة؛ نوع الفرع لا يظهر ولا يُطلب خارج فرعه (ترحيل 043)
  @Column({ type: 'int', nullable: true })
  branchId: number | null
}

@Entity('leaves')
export class Leave {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ nullable: true })
  requestId: number // الطلب الأصل

  @Index()
  @Column()
  employeeId: number

  @Column({ type: String, name: 'leaveTypeCode', length: 50 })
  leaveTypeCode: LeaveTypeCode

  /** @deprecated compatibility alias; persistence uses leaveTypeCode. */
  get leaveType() { return this.leaveTypeCode }
  set leaveType(value: LeaveTypeCode) { this.leaveTypeCode = value }
  toJSON() { return leaveView(this) }

  @Column({ type: 'date' })
  fromDate: string

  @Column({ type: 'date' })
  toDate: string

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  days: number

  // نصف اليوم: FULL يوم كامل، MORNING النصف الأول من الوردية،
  // EVENING النصف الثاني — الفترة المغطاة لا تأخير فيها
  @Column({ type: String, length: 10, default: 'FULL' })
  period: LeavePeriod

  // غير مدفوعة؟ تُخصم يوم بيوم في بيانات المسير (من leave_types.isPaid)
  @Column({ default: false })
  isUnpaid: boolean

  @Column({ type: String, length: 30 })
  status: LeaveStatus

  // إلغاء مباشر من الموارد البشرية — لاشتقاق إشعار للموظف
  @Column({ nullable: true })
  revokedByUserId: number

  @Column({ type: 'datetime', nullable: true })
  revokedAt: Date

  // مرفق «بعد الرجوع»: PENDING حتى attachmentDueDate · UPLOADED · MISSED (تحوّلت الأيام بدون راتب)
  @Column({ type: 'nvarchar', length: 20, nullable: true })
  attachmentStatus: string | null

  @Column({ type: 'date', nullable: true })
  attachmentDueDate: string | null

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  attachmentRef: string | null
}

@Entity('leave_balances')
@Unique(['employeeId', 'balanceType', 'period'])
export class LeaveBalance {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column()
  employeeId: number

  @Column({ type: String, length: 50 })
  balanceType: BalanceType

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  entitled: number

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  taken: number

  @Column({ length: 20 })
  period: string // '2026'

  // طبقة الرصيد الافتتاحي المُرحّل وصلاحيته — تُستهلك أولاً قبل رصيد السنة
  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  openingDays: number

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  openingTaken: number

  @Column({ type: 'date', nullable: true })
  openingExpiry: string // NULL = بلا انتهاء

  // تعديل إداري مستقل عن السياسة والإجازات المستهلكة، موثق في سجل منفصل.
  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  adjustmentDays: number
}

@Entity('leave_balance_adjustments')
@Unique('UQ_leave_adjustment_operation', ['employeeId', 'balanceType', 'period', 'idempotencyKey'])
export class LeaveBalanceAdjustment {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column()
  employeeId: number

  @Column({ type: String, length: 50 })
  balanceType: BalanceType

  @Column({ length: 20 })
  period: string

  @Column({ length: 36 })
  idempotencyKey: string

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  delta: number

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  beforeAdjustment: number

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  afterAdjustment: number

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  beforeRemaining: number

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  afterRemaining: number

  @Column({ length: 500 })
  reason: string

  @Column()
  actorUserId: number

  @CreateDateColumn()
  createdAt: Date
}

