import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

// الفئات التسع — مرآة src/data/requestsCatalog.ts في الفرونت
export type RequestCategory =
  | 'leaves'
  | 'time_attendance'
  | 'financial'
  | 'employment_status'
  | 'personal_data'
  | 'letters'
  | 'custody_assets'
  | 'training'
  | 'employee_relations'

@Entity('request_types')
export class RequestType {
  @PrimaryGeneratedColumn()
  id: number

  @Index({ unique: true })
  @Column({ length: 50 })
  code: string // LEAVE_ANNUAL, OVERTIME...

  @Column({ length: 200 })
  nameAr: string

  @Column({ length: 50 })
  category: RequestCategory

  // JSON: تعريف الحقول المطلوبة عند التقديم (أسماء فقط — الشكل القديم)
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  requiredFields: string

  // JSON: حقول مخصّصة كاملة الوصف —
  // [{key, label, type: text|number|date|select|file, required, options?}]
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  customFields: string

  // JSON: جمهور النوع — مين يقدر يقدمه وفين:
  // {mode: 'all'|'positions'|'roles'|'employees'|'departments'(قديم), ids, where?: {mode: 'company'|'branches'|'departments', ids}}
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  visibleTo: string

  // فرع النوع: null = كل الشركة؛ نوع الفرع لا يظهر ولا يُقدَّم خارج فرعه (ترحيل 043)
  @Column({ type: 'int', nullable: true })
  branchId: number | null

  // JSON: المرفقات المطلوبة
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  requiredAttachments: string

  @Column({ nullable: true })
  approvalChainId: number

  // كود الـ handler الذي يكتب في الوجهة (السجل الدائم) بعد الاعتماد
  @Column({ length: 100 })
  destinationHandler: string

  @Column({ default: false })
  affectsBalance: boolean

  // مسار أمني خاص (تغيير الحساب البنكي)
  @Column({ default: false })
  isSecurityRoute: boolean

  // سرّي — يتخطى المدير المباشر (الشكاوى/البلاغات)
  @Column({ default: false })
  isConfidential: boolean

  // الخطابات — PDF يتولّد أوتوماتيك
  @Column({ default: false })
  autoGeneratesPdf: boolean

  @Column({ length: 5, default: 'P1' })
  phase: 'P1' | 'P2' | 'P3'

  @Column({ default: true })
  isActive: boolean

  // B2.6 (ترحيل 089): «مهمة تنفيذ بعد الاعتماد» — الدور الوظيفي اللي بينفّذ، ومهلته بالأيام، والإثبات إجباري ولا لأ. فاضي = من غير مهمة
  // (السلوك القايم). برّه الكيان للقراءة والكتابة (الكود بيشتغل قبل الترحيل): بيتقروا ويتكتبوا بـSQL صريح بعد التأكد من وجودهم
  // (requests/execution-tasks.ts)
  @Column({ type: 'nvarchar', length: 40, nullable: true, select: false, insert: false, update: false })
  executionRole?: string | null

  @Column({ type: 'int', nullable: true, select: false, insert: false, update: false })
  executionDays?: number | null

  @Column({ type: 'bit', nullable: true, select: false, insert: false, update: false })
  executionProof?: boolean | null
}
