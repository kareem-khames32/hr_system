import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm'
import type { SettlementFinancialSnapshot } from '../payroll/payroll-settlement-boundary'

// دورة إنهاء الخدمة: استقالة معتمدة → إخلاء طرف (5 جهات) → تصفية → إغلاق
// الموظف يبقى TERMINATED فقط بعد اعتماد التصفية ومرور آخر يوم عمل
export type OffboardingStatus =
  | 'IN_CLEARANCE' // إخلاء الطرف جارٍ
  | 'IN_SETTLEMENT' // البنود اكتملت — التصفية قيد المراجعة
  | 'SETTLED' // التصفية معتمدة ومقفولة — بانتظار آخر يوم عمل
  | 'CLOSED' // انتهت الخدمة فعلياً
  | 'CANCELLED' // تراجع عن الاستقالة خلال فترة الإشعار — الموظف رجع نشطاً

// EMP-2: سبب إنهاء الخدمة — يحدد معامل مكافأة نهاية الخدمة (إعدادات eos.*)
export const TERMINATION_REASONS = [
  'resignation', // استقالة (طلب معتمد أو خطاب تسجّله الموارد البشرية)
  'termination', // إنهاء من صاحب العمل (م84)
  'dismissal', // فصل تأديبي (م80)
  'contract_end', // انتهاء مدة العقد
  'retirement', // تقاعد
  'death', // وفاة
  'disability', // عجز صحي
  'force_majeure', // قوة قاهرة (م87)
] as const
export type TerminationReason = (typeof TERMINATION_REASONS)[number]

@Entity('offboarding_cases')
export class OffboardingCase {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column()
  employeeId: number

  @Column({ nullable: true })
  resignationRequestId: number

  // EMP-2: سبب الإنهاء — NULL في الملفات القديمة = استقالة (كانت المسار الوحيد)
  @Column({ type: 'nvarchar', length: 30, nullable: true })
  terminationReason: TerminationReason

  // EMP-1: الإنهاء من طرف الشركة — تاريخ الإشعار والملاحظات ومقابلة الخروج
  @Column({ type: 'date', nullable: true })
  noticeDate: string

  @Column({ length: 1000, nullable: true })
  notes: string

  @Column({ length: 1000, nullable: true })
  exitInterviewNotes: string

  // من فتح الملف (users.id) — NULL = فُتح آلياً من طلب استقالة معتمد
  @Column({ name: 'openedByUserId', nullable: true })
  openedBy: number

  // إيقاف حساب الدخول عند فتح الملف (وفاة/فصل) — إلغاء الملف يعيده
  @Column({ type: 'datetime', nullable: true })
  accessRevokedAt: Date

  @Column({ type: 'date' })
  lastWorkingDay: string

  @Column({ length: 30, default: 'IN_CLEARANCE' })
  status: OffboardingStatus

  // صافي التصفية بعد الاعتماد
  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  settlementNet: number

  // ① / ح٢-ب: NULL للملفات القديمة؛ لا يعاد اختراع مصادر تسويتها بأثر رجعي.
  @Column({ type: 'simple-json', nullable: true })
  settlementFinancialSnapshot: SettlementFinancialSnapshot | null

  @Column({ name: 'settlementApprovedByUserId', nullable: true })
  settlementApprovedBy: number // users.id

  toJSON() { return { ...this, openedByUserId: this.openedBy ?? null, settlementApprovedByUserId: this.settlementApprovedBy ?? null } }

  @Column({ type: 'datetime', nullable: true })
  settlementApprovedAt: Date

  // مراجع المخرجات: مستند التصفية + شهادة إخلاء الطرف
  @Column({ length: 100, nullable: true })
  settlementDocRef: string

  @Column({ length: 100, nullable: true })
  clearanceCertRef: string

  @CreateDateColumn()
  createdAt: Date
}

// الجهات الخمس لإخلاء الطرف
export type ClearanceParty = 'manager' | 'custody' | 'it' | 'finance' | 'hr'
export type ClearanceStatus = 'PENDING' | 'DONE'

@Entity('clearance_items')
export class ClearanceItem {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column()
  caseId: number

  @Column({ length: 20 })
  party: ClearanceParty

  @Column({ length: 200 })
  label: string

  @Column({ length: 20, default: 'PENDING' })
  status: ClearanceStatus

  @Column({ length: 500, nullable: true })
  note: string

  // مبلغ مرتبط (خصم متوقع مثلاً) — يغذي التصفية
  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  amount: number

  @Column({ name: 'doneByUserId', nullable: true })
  doneBy: number // users.id

  toJSON() { return { ...this, doneByUserId: this.doneBy ?? null } }

  @Column({ type: 'datetime', nullable: true })
  doneAt: Date
}

// بنود التصفية: إضافات (+) وخصومات (−) — الآلي قابل للتعديل والإضافة حرة
@Entity('settlement_lines')
export class SettlementLine {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column()
  caseId: number

  @Column({ length: 200 })
  label: string

  @Column({ length: 10 })
  type: 'CREDIT' | 'DEBIT'

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number

  // بند محسوب آلياً من النظام (يبقى قابلاً لتعديل المبلغ قبل الاعتماد)
  @Column({ default: false })
  isAuto: boolean
}
