import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

// الأدوار الأساسية — تتوسع لاحقاً بجدول roles/permissions الكامل
export type UserRole = 'super_admin' | 'hr_manager' | 'branch_manager' | 'employee'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number

  @Index({ unique: true })
  @Column({ length: 200 })
  email: string

  @Column({ length: 200 })
  passwordHash: string

  @Column({ length: 200 })
  displayName: string

  @Column({ length: 30, default: 'employee' })
  role: UserRole

  // نطاق الفرع: super_admin يرى الكل — غيره مقفول على فرعه
  @Column({ nullable: true })
  branchId: number

  // ربط الحساب بالموظف
  @Column({ nullable: true })
  employeeId: number

  // صلاحيات إضافية فوق الدور — JSON مثل ["finance","custody_officer"]
  // تمنح المستخدم قدرات دور آخر في الاعتمادات والمسارات المحمية
  @Column({ type: 'nvarchar', length: 500, nullable: true })
  permissions: string

  @Column({ default: true })
  isActive: boolean

  @Column({ type: 'datetime', nullable: true })
  lastLoginAt: Date
}
