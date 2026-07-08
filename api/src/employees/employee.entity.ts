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
  | 'notice_period'
  | 'suspended'
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

  @Column({ type: 'date', nullable: true })
  joinDate: string

  @Column({ length: 20, default: 'active' })
  status: EmployeeStatus

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  basicSalary: number

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
