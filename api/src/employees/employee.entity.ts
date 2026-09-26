import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm'

import type { EmployeeStatus } from '../common/domain-status'
export type { EmployeeStatus } from '../common/domain-status'

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn()
  id: number

  // الكود الوظيفي — يولّده النظام عند الإضافة (EMP-0001…) ولا يُعدّل؛ ربط البصمات برقم البصمة وحده
  @Index({ unique: true })
  @Column({ length: 20 })
  employeeCode: string

  // رقم البصمة المستقل (قد يختلف عن الكود الوظيفي على أجهزة ZKTeco)
  @Column({ length: 40, nullable: true })
  fingerprintCode: string

  @Column({ length: 200 })
  fullName: string

  @Column({ length: 200, nullable: true })
  fullNameEn: string

  // صورة الموظف — معرّف ملف مرفوع عبر /files/upload
  @Column({ nullable: true })
  photoFileId: number

  @Column({ length: 200, nullable: true })
  email: string

  // البريد الشخصي (مستقل عن بريد العمل email)
  @Column({ length: 160, nullable: true })
  personalEmail: string

  @Column({ length: 50, nullable: true })
  phone: string

  // رقم جوال بديل
  @Column({ length: 30, nullable: true })
  phoneAlt: string

  @Column({ length: 50, nullable: true })
  nationalId: string

  // جواز السفر
  @Column({ length: 40, nullable: true })
  passportNo: string

  @Column({ type: 'date', nullable: true })
  passportExpiry: string

  // ===== البيانات الشخصية =====
  @Column({ type: 'date', nullable: true })
  birthDate: string

  @Column({ length: 120, nullable: true })
  birthPlace: string

  @Column({ length: 10, nullable: true })
  gender: 'male' | 'female'

  @Column({ length: 20, nullable: true })
  maritalStatus: string // single | married | divorced | widowed

  @Column({ length: 100, nullable: true })
  nationality: string

  @Column({ length: 500, nullable: true })
  address: string

  // البلد والرمز البريدي (تفصيل العنوان)
  @Column({ length: 60, nullable: true })
  country: string

  @Column({ length: 20, nullable: true })
  postalCode: string

  @Column({ length: 200, nullable: true })
  emergencyContactName: string

  // صلة القرابة لجهة الطوارئ
  @Column({ length: 60, nullable: true })
  emergencyRelation: string

  @Column({ length: 50, nullable: true })
  emergencyContactPhone: string

  // رقم طوارئ بديل
  @Column({ length: 30, nullable: true })
  emergencyPhoneAlt: string

  @Column({ length: 100, nullable: true })
  jobTitle: string

  @Index()
  @Column()
  branchId: number

  @Column({ nullable: true })
  departmentId: number

  @Column({ nullable: true })
  teamId: number

  // المدير المباشر
  @Column({ nullable: true })
  managerEmployeeId: number

  // مركز التكلفة (اختياري) — يتقدم على مركز تكلفة الفرع في التقارير
  @Column({ nullable: true })
  costCenterId: number

  // جدول العمل الذي يتبعه الموظف (اختياري) — المحرك يشتقّ منه العطلة الأسبوعية
  // والساعات؛ بلا جدول = إعداد الفرع/العام (السلوك الافتراضي)
  @Column({ nullable: true })
  workScheduleId: number

  // هل يستحق إجازة سنوية؟ مقفول = لا يتراكم له رصيد سنوي (استحقاقه = 0)
  @Column({ default: true })
  annualLeaveEntitled: boolean

  @Column({ type: 'date', nullable: true })
  joinDate: string

  // بداية استحقاق الراتب — أرضية تغطية المسير لهذا الموظف. الفارغ = تاريخ بدء
  // العمل الفعلي وإلا تاريخ التعيين (سلوك ما قبل الحقل، فلا يتغير أي مسير قائم)
  @Column({ type: 'date', nullable: true })
  salaryEntitlementStart: string

  // ===== بيانات التوظيف =====
  // تاريخ بداية العمل الفعلي (قد يختلف عن تاريخ التعيين)
  @Column({ type: 'date', nullable: true })
  actualStartDate: string

  // نوع التوظيف (full_time | part_time | contract ...)
  @Column({ length: 30, nullable: true })
  workType: string

  // تاريخ انتهاء فترة التجربة
  @Column({ type: 'date', nullable: true })
  probationEndDate: string

  // مصدر التوظيف (إعلان | ترشيح | وكالة ...)
  @Column({ length: 60, nullable: true })
  recruitmentSource: string

  // الدرجة الوظيفية (مرجع كتالوج الدرجات)
  @Column({ type: 'int', nullable: true })
  gradeId: number

  // موقع العمل
  @Column({ length: 120, nullable: true })
  workLocation: string

  // ===== العقد =====
  @Column({ length: 30, nullable: true })
  contractType: string // permanent | fixed_term | part_time | seasonal

  @Column({ type: 'date', nullable: true })
  contractStart: string

  @Column({ type: 'date', nullable: true })
  contractEnd: string // NULL = غير محدد المدة

  // رقم العقد المرجعي (اختياري)
  @Column({ length: 60, nullable: true })
  contractNumber: string

  // مدة العقد بالأشهر (اختياري — لعقد محدد المدة)
  @Column({ type: 'int', nullable: true })
  contractDurationMonths: number

  // فترة الإشعار بالأيام قبل الإنهاء (اختياري)
  @Column({ type: 'int', nullable: true })
  noticePeriodDays: number

  @Column({ type: String, length: 20, default: 'active' })
  status: EmployeeStatus

  // توثيق الأرشفة — للفلترة بالسبب والفترة في شاشة الأرشيف
  @Column({ type: 'datetime', nullable: true })
  archivedAt: Date

  @Column({ length: 300, nullable: true })
  archiveReason: string

  // العملة ودورة صرف الراتب
  @Column({ length: 10, nullable: true, default: 'SAR' })
  currency: string

  @Column({ length: 20, nullable: true })
  salaryCycle: string

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  basicSalary: number

  // البدلات — تدخل في إجمالي الراتب بالمسير
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  housingAllowance: number

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  transportAllowance: number

  // بدل الهاتف وبدل طبيعة العمل مستقلان عن otherAllowance؛ لا يُجمعان داخله.
  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  phoneAllowance: number

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  workNatureAllowance: number

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  otherAllowance: number

  // بدل ضغط العمل (قرار المالك 26 سبتمبر): بيتصرف مع الراتب كل شهر وبيظهر للموظف، بس «من غير مؤثرات» —
  // برّه سعر اليوم والساعة والخصومات والسقف والتأمينات ونهاية الخدمة (compensation.ts). الموظفين القدام = صفر
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  workPressureAllowance: number

  // طريقة الصرف — نقدي / تحويل بنكي / نقدي + بنك (mixed)؛ visa قيمة قديمة
  @Column({ length: 20, default: 'transfer' })
  payMethod: 'transfer' | 'cash' | 'mixed' | 'visa'

  // في «نقدي + بنك»: المبلغ اللي يتحول للبنك من صافي الراتب، والباقي نقدي
  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  bankTransferAmount: number | null

  @Column({ length: 100, nullable: true })
  bankName: string

  // اسم فرع البنك
  @Column({ length: 120, nullable: true })
  bankBranch: string

  @Column({ length: 50, nullable: true })
  iban: string

  // ===== التأمينات الاجتماعية (GOSI) =====
  @Column({ length: 40, nullable: true })
  gosiNumber: string

  @Column({ type: 'bit', nullable: true })
  isGosiRegistered: boolean

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  gosiBaseSalary: number

  @Column({ default: true })
  isActive: boolean

  @CreateDateColumn()
  createdAt: Date
}


