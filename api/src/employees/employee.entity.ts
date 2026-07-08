import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm'

export type EmployeeStatus =
  | 'active'
  | 'probation'
  | 'notice_period' // فترة إشعار (استقالة معتمدة — إخلاء الطرف جارٍ)
  | 'suspended'
  | 'terminated' // انتهت الخدمة (بعد التصفية وآخر يوم عمل)
  | 'archived'

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn()
  id: number

  // الكود الوظيفي — نفسه كود البصمة (EMP001) لمطابقة سجلات ZKTeco
  @Index({ unique: true })
  @Column({ length: 20 })
  employeeCode: string

  @Column({ length: 200 })
  fullName: string

  @Column({ length: 200, nullable: true })
  fullNameEn: string

  @Column({ length: 200, nullable: true })
  email: string

  @Column({ length: 50, nullable: true })
  phone: string

  @Column({ length: 50, nullable: true })
  nationalId: string

  // ===== البيانات الشخصية =====
  @Column({ type: 'date', nullable: true })
  birthDate: string

  @Column({ length: 10, nullable: true })
  gender: 'male' | 'female'

  @Column({ length: 20, nullable: true })
  maritalStatus: string // single | married | divorced | widowed

  @Column({ length: 100, nullable: true })
  nationality: string

  @Column({ length: 500, nullable: true })
  address: string

  @Column({ length: 200, nullable: true })
  emergencyContactName: string

  @Column({ length: 50, nullable: true })
  emergencyContactPhone: string

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

  @Column({ type: 'date', nullable: true })
  joinDate: string

  // ===== العقد =====
  @Column({ length: 30, nullable: true })
  contractType: string // permanent | fixed_term | part_time | seasonal

  @Column({ type: 'date', nullable: true })
  contractStart: string

  @Column({ type: 'date', nullable: true })
  contractEnd: string // NULL = غير محدد المدة

  @Column({ length: 20, default: 'active' })
  status: EmployeeStatus

  // توثيق الأرشفة — للفلترة بالسبب والفترة في شاشة الأرشيف
  @Column({ type: 'datetime', nullable: true })
  archivedAt: Date

  @Column({ length: 300, nullable: true })
  archiveReason: string

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  basicSalary: number

  // البدلات — تدخل في إجمالي الراتب بالمسير
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  housingAllowance: number

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  transportAllowance: number

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  otherAllowance: number

  // طريقة الصرف — لتقارير حالة الصرف في المسير
  @Column({ length: 20, default: 'transfer' })
  payMethod: 'transfer' | 'cash' | 'visa'

  @Column({ length: 100, nullable: true })
  bankName: string

  @Column({ length: 50, nullable: true })
  iban: string

  @Column({ default: true })
  isActive: boolean

  @CreateDateColumn()
  createdAt: Date
}
