import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm'

// ============================================================
// مؤهلات الموظف وخبراته — خمس قوائم مستقلة لكل موظف
// (تعليم / شهادات مهنية / خبرات سابقة / مهارات / لغات)
// كلها تتبع نفس النمط: employeeId + حقول القائمة + إنشاء
// ============================================================

// المؤهل الدراسي — بكالوريوس/ماجستير... مع الجامعة وسنة التخرج
@Entity('employee_education')
export class EmployeeEducation {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column()
  employeeId: number

  // درجة المؤهل: high_school | diploma | bachelor | master | phd | other
  @Column({ length: 40 })
  degree: string

  @Column({ length: 150, nullable: true })
  major: string // التخصص

  @Column({ length: 200, nullable: true })
  institution: string // الجامعة/المعهد

  @Column({ type: 'int', nullable: true })
  graduationYear: number

  @Column({ length: 500, nullable: true })
  fileRef: string // مرفق الشهادة (file:N)

  @CreateDateColumn()
  createdAt: Date
}

// الشهادات المهنية — بجهة مانحة وتاريخ حصول/انتهاء (للتنبيه)
@Entity('employee_certifications')
export class EmployeeCertification {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column()
  employeeId: number

  @Column({ length: 200 })
  name: string

  @Column({ length: 200, nullable: true })
  issuer: string // الجهة المانحة

  @Column({ type: 'date', nullable: true })
  issueDate: string

  @Column({ type: 'date', nullable: true })
  expiryDate: string // NULL = لا تنتهي

  @Column({ length: 500, nullable: true })
  fileRef: string

  @CreateDateColumn()
  createdAt: Date
}

// الخبرات السابقة — الشركة والمسمى والفترة وسبب الترك
@Entity('employee_experiences')
export class EmployeeExperience {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column()
  employeeId: number

  @Column({ length: 200 })
  company: string

  @Column({ length: 150, nullable: true })
  jobTitle: string

  @Column({ length: 60, nullable: true })
  country: string

  @Column({ type: 'date', nullable: true })
  fromDate: string

  @Column({ type: 'date', nullable: true })
  toDate: string // NULL = ما زال قائماً

  @Column({ length: 300, nullable: true })
  leaveReason: string

  @CreateDateColumn()
  createdAt: Date
}

// المهارات — بمستوى إتقان وسنوات خبرة
@Entity('employee_skills')
export class EmployeeSkill {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column()
  employeeId: number

  @Column({ length: 150 })
  name: string

  // beginner | intermediate | advanced | expert
  @Column({ length: 30, nullable: true })
  level: string

  @Column({ type: 'int', nullable: true })
  yearsExperience: number

  @CreateDateColumn()
  createdAt: Date

  // B5.4 (ترحيل 157): ربط الصف بمهارة من مكتبة المهارات — مصدر المستوى، ومين قيّم وإمتى، وصلاحية الشهادة. برّه الكيان للقراءة والكتابة
  // (ملف الموظف بيشتغل قبل الترحيل): skills/skills.service.ts
  @Column({ type: 'int', nullable: true, select: false, insert: false, update: false })
  skillId?: number | null

  @Column({ type: 'nvarchar', length: 20, nullable: true, select: false, insert: false, update: false })
  source?: string | null

  @Column({ type: 'int', nullable: true, select: false, insert: false, update: false })
  assessedByUserId?: number | null

  @Column({ type: 'datetime2', nullable: true, select: false, insert: false, update: false })
  assessedAt?: Date | null

  @Column({ type: 'date', nullable: true, select: false, insert: false, update: false })
  validUntil?: string | null
}

// اللغات — مستوى منفصل للتحدث والكتابة والقراءة
@Entity('employee_languages')
export class EmployeeLanguage {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column()
  employeeId: number

  @Column({ length: 80 })
  language: string

  // basic | good | very_good | native — لكل مهارة على حدة
  @Column({ length: 30, nullable: true })
  speaking: string

  @Column({ length: 30, nullable: true })
  writing: string

  @Column({ length: 30, nullable: true })
  reading: string

  @CreateDateColumn()
  createdAt: Date
}
