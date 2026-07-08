import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm'

// دورة إنهاء الخدمة: استقالة معتمدة → إخلاء طرف (5 جهات) → تصفية → إغلاق
// الموظف يبقى TERMINATED فقط بعد اعتماد التصفية ومرور آخر يوم عمل
export type OffboardingStatus =
  | 'IN_CLEARANCE' // إخلاء الطرف جارٍ
  | 'IN_SETTLEMENT' // البنود اكتملت — التصفية قيد المراجعة
  | 'SETTLED' // التصفية معتمدة ومقفولة — بانتظار آخر يوم عمل
  | 'CLOSED' // انتهت الخدمة فعلياً

@Entity('offboarding_cases')
export class OffboardingCase {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column()
  employeeId: number

  @Column({ nullable: true })
  resignationRequestId: number

  @Column({ type: 'date' })
  lastWorkingDay: string

  @Column({ length: 30, default: 'IN_CLEARANCE' })
  status: OffboardingStatus

  // صافي التصفية بعد الاعتماد
  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  settlementNet: number

  @Column({ nullable: true })
  settlementApprovedBy: number // users.id

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
export type ClearanceStatus = 'PENDING' | 'DONE' | 'BLOCKED'

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

  @Column({ nullable: true })
  doneBy: number // users.id

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
