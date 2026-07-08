import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Department } from './department.entity'

@Entity('branches')
export class Branch {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 200 })
  name: string

  @Column({ length: 200, nullable: true })
  nameEn: string

  @Column({ length: 50, unique: true })
  code: string

  @Column({ length: 100, nullable: true })
  city: string

  @Column({ length: 500, nullable: true })
  address: string

  @Column({ length: 50, nullable: true })
  phone: string

  @Column({ length: 200, nullable: true })
  email: string

  // المدير المُسنَد — يُستخدم في دورات الاعتماد وصلاحيات الفرع
  @Column({ nullable: true })
  managerEmployeeId: number

  // مركز التكلفة — تُحمَّل عليه رواتب الفرع
  @Column({ length: 50, nullable: true })
  costCenter: string

  @Column({ default: true })
  isActive: boolean

  @Column({ default: false })
  isHeadquarters: boolean

  @OneToMany(() => Department, (d) => d.branch)
  departments: Department[]
}
