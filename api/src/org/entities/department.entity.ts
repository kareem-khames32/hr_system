import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Branch } from './branch.entity'
import { Team } from './team.entity'

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 200 })
  name: string

  @Column({ length: 200, nullable: true })
  nameEn: string

  @Column({ length: 50, nullable: true })
  code: string

  // هرمي — قسم أب
  @Column({ nullable: true })
  parentId: number

  // رئيس القسم — يُستخدم في سلاسل الاعتماد
  @Column({ nullable: true })
  managerEmployeeId: number

  @Column()
  branchId: number

  @ManyToOne(() => Branch, (b) => b.departments)
  @JoinColumn({ name: 'branchId' })
  branch: Branch

  @Column({ default: true })
  isActive: boolean

  // الهيكل التنظيمي: قسم واحد بس في الشركة «الإدارة التنفيذية» — مديره الرئيس التنفيذي
  @Column({ default: false })
  isExecutive: boolean

  // السكرتير التنفيذي: تابع للرئيس التنفيذي بس (مش مدير لحد) — معنى له مع الإدارة التنفيذية فقط
  @Column({ type: 'int', nullable: true })
  executiveSecretaryEmployeeId: number | null

  @OneToMany(() => Team, (t) => t.department)
  teams: Team[]
}
