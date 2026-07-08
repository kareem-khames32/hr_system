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

  @Column({ default: true })
  isActive: boolean

  @Column({ type: 'datetime2', nullable: true })
  lastLoginAt: Date
}
