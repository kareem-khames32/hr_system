import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm'

// أنواع الأصول — كتالوج للإعدادات
@Entity('asset_types')
export class AssetType {
  @PrimaryGeneratedColumn()
  id: number

  @Index({ unique: true })
  @Column({ length: 100 })
  name: string

  @Column({ default: true })
  isActive: boolean
}

// أنواع مستندات الموظف — كتالوج للإعدادات (/catalogs/doc-types). code يُحفظ في
// employee_documents.docType وثابت بعد الإنشاء، وnameAr هو ما تعرضه الشاشات
@Entity('doc_types')
export class DocType {
  @PrimaryGeneratedColumn()
  id: number

  @Index({ unique: true })
  @Column({ length: 50 })
  code: string

  @Index({ unique: true })
  @Column({ length: 200 })
  nameAr: string

  @Column({ default: true })
  isActive: boolean
}

// مستندات الموظف — بصلاحية وتنبيه انتهاء
@Entity('employee_documents')
export class EmployeeDocument {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column()
  employeeId: number

  // كود من كتالوج doc_types (مستندات قديمة قد تحمل نصاً حراً سُجل قبل الكتالوج)
  @Column({ length: 100 })
  docType: string

  @Column({ length: 100, nullable: true })
  number: string

  @Column({ type: 'date', nullable: true })
  issueDate: string

  @Column({ type: 'date', nullable: true })
  expiryDate: string

  @Column({ length: 500, nullable: true })
  fileRef: string

  @Column({ length: 500, nullable: true })
  notes: string
}

// العطلات الرسمية
@Entity('public_holidays')
export class PublicHoliday {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 200 })
  name: string

  @Index()
  @Column({ type: 'date' })
  date: string

  @Column({ type: 'date', nullable: true })
  endDate: string // عطلة ممتدة

  @Column({ length: 5 })
  country: string
}

// كتالوج الورديات — تستخدمه شاشة الجدولة
@Entity('shifts')
export class Shift {
  @PrimaryGeneratedColumn()
  id: number

  @Index({ unique: true })
  @Column({ length: 100 })
  name: string

  @Column({ length: 5 })
  startTime: string // HH:mm

  @Column({ length: 5 })
  endTime: string

  // نوع الوردية: fixed = دوام ثابت (تأخير بمقارنة البداية)،
  // flexible = مرنة (المهم إكمال requiredHours ساعة، والنقص خصم)
  @Column({ length: 10, default: 'fixed' })
  shiftMode: 'fixed' | 'flexible'

  // NULL يميز تعريفًا قديمًا؛ نافذة المرونة لا تُستنتج من نوافذ تصنيف البصمة.
  @Column({ type: 'bit', nullable: true })
  flexEnabled: boolean | null

  @Column({ type: 'int', nullable: true })
  flexWindowMinutes: number | null

  @Column({ type: 'int', nullable: true })
  requiredWorkMinutes: number | null

  // ساعات العمل المطلوبة (للمرنة) — NULL = تُشتق من مدة الوردية
  @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true })
  requiredHours: number

  // سماحية التأخير بالدقائق لهذه الوردية — NULL = القيمة العامة
  @Column({ nullable: true })
  graceMinutes: number

  // عتبة بدء الأوفرتايم بالساعات بعد نهاية الوردية — NULL = القيمة العامة
  @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true })
  overtimeThresholdHours: number

  // نوافذ تصنيف البصمة (اختياري) — بصمة داخل نافذة الدخول = حضور،
  // وداخل نافذة الخروج = انصراف. NULL = المنطق الافتراضي (الأقدم/الأحدث)
  @Column({ length: 5, nullable: true })
  checkinFrom: string

  @Column({ length: 5, nullable: true })
  checkinTo: string

  @Column({ length: 5, nullable: true })
  checkoutFrom: string

  @Column({ length: 5, nullable: true })
  checkoutTo: string

  @Column({ default: true })
  isActive: boolean

  // فرع الوردية: null = كل الشركة؛ وردية الفرع لا تظهر ولا تُسند خارج فرعها (ترحيل 043)
  @Column({ type: 'int', nullable: true })
  branchId: number | null
}

// جدول العمل — نمط قابل للإعداد يتبعه الموظف: أيام نهاية الأسبوع + ساعات الدوام.
// يُختار عند التعيين، والمحرك يشتقّ منه العطلة الأسبوعية والساعات لمن يتبعه.
@Entity('work_schedules')
export class WorkSchedule {
  @PrimaryGeneratedColumn()
  id: number

  @Index({ unique: true })
  @Column({ length: 100 })
  name: string

  @Column({ length: 200, nullable: true })
  description: string

  // أيام نهاية الأسبوع (رموز مفصولة بفاصلة، مثل 'FRI,SAT') — تغلب إعداد الفرع
  @Column({ length: 40, default: 'FRI,SAT' })
  weekendDays: string

  @Column({ length: 5, default: '08:00' })
  startTime: string // HH:mm

  @Column({ length: 5, default: '17:00' })
  endTime: string

  @Column({ type: 'bit', nullable: true })
  flexEnabled: boolean | null

  @Column({ type: 'int', nullable: true })
  flexWindowMinutes: number | null

  @Column({ type: 'int', nullable: true })
  requiredWorkMinutes: number | null

  // جدول من لم يُسند له جدول ولا وردية — واحد فقط (الكتالوج يُسقط العلم عن غيره).
  // يعطيه الساعات فقط؛ عطلته الأسبوعية من الفرع/السياسات لا من weekendDays هنا
  @Column({ default: false })
  isDefault: boolean

  @Column({ default: true })
  isActive: boolean

  // فرع الجدول: null = كل الشركة؛ جدول الفرع لا يظهر ولا يُسند خارج فرعه ولا يكون الافتراضي (ترحيل 043)
  @Column({ type: 'int', nullable: true })
  branchId: number | null
}

// أجهزة البصمة المسجلة (Device ↔ الفرع) — سحب مباشر عبر TCP/IP
@Entity('biometric_devices')
export class BiometricDevice {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 100 })
  name: string

  @Index({ unique: true })
  @Column({ length: 50 })
  serialNumber: string

  @Column()
  branchId: number

  // اتصال السحب المباشر — ZKTeco TCP (البورت الافتراضي 4370)
  @Column({ length: 50, nullable: true })
  ip: string

  @Column({ default: 4370 })
  port: number

  // سرّ الجهاز — لا يُقرأ افتراضياً (select:false) فلا يظهر في أي قراءة عامة؛
  // من يحتاجه (المزامنة) يطلبه صراحةً
  @Column({ length: 100, nullable: true, select: false })
  authKey: string

  @Column({ type: 'datetime', nullable: true })
  lastSyncAt: Date

  // نتيجة آخر مزامنة: OK (n) أو رسالة الخطأ
  @Column({ length: 300, nullable: true })
  lastStatus: string

  @Column({ default: 0 })
  lastSyncCount: number

  @Column({ default: true })
  isActive: boolean
}

// المسميات الوظيفية — كتالوج للإعدادات
@Entity('job_titles')
export class JobTitle {
  @PrimaryGeneratedColumn()
  id: number

  @Index({ unique: true })
  @Column({ length: 200 })
  title: string

  @Column({ length: 200, nullable: true })
  titleEn: string

  @Column({ default: true })
  isActive: boolean
}

// الدرجات الوظيفية بنطاقات الرواتب
@Entity('grades')
export class Grade {
  @PrimaryGeneratedColumn()
  id: number

  @Index({ unique: true })
  @Column({ length: 100 })
  name: string

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  minSalary: number

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  maxSalary: number

  @Column({ default: true })
  isActive: boolean
}

// مراكز التكلفة — مثال: مركز تكلفة لكل عميل، تُربط بموظف/قسم/فرع
@Entity('cost_centers')
export class CostCenter {
  @PrimaryGeneratedColumn()
  id: number

  @Index({ unique: true })
  @Column({ length: 50 })
  code: string

  @Column({ length: 200 })
  name: string

  @Column({ default: true })
  isActive: boolean
}

// المرشحون للتوظيف — pipeline بسيط حتى التعيين
export type CandidateStage =
  | 'applied'
  | 'screening'
  | 'interview'
  | 'offer'
  | 'hired'
  | 'rejected'

@Entity('candidates')
export class Candidate {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 200 })
  fullName: string

  @Column({ length: 200, nullable: true })
  email: string

  @Column({ length: 50, nullable: true })
  phone: string

  @Column({ length: 200 })
  positionTitle: string

  @Column({ nullable: true })
  branchId: number

  @Index()
  @Column({ length: 20, default: 'applied' })
  stage: CandidateStage

  @Column({ length: 1000, nullable: true })
  notes: string

  // بعد التعيين — الموظف الناتج
  @Column({ nullable: true })
  hiredEmployeeId: number

  @CreateDateColumn()
  createdAt: Date
}
