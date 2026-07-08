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

// مستندات الموظف — بصلاحية وتنبيه انتهاء
@Entity('employee_documents')
export class EmployeeDocument {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column()
  employeeId: number

  @Column({ length: 100 })
  docType: string // هوية | جواز | إقامة | عقد | شهادة ...

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

  @Column({ length: 5, default: 'EG' })
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

  @Column({ default: true })
  isActive: boolean
}

// أجهزة البصمة المسجلة (Device ↔ الفرع)
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
