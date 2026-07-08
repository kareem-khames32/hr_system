import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Department } from './department.entity'

@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 200 })
  name: string

  @Column({ length: 50, nullable: true })
  code: string

  // قائد الفريق — "المدير المباشر" في سلاسل الاعتماد
  @Column({ nullable: true })
  leaderEmployeeId: number

  @Column()
  departmentId: number

  @ManyToOne(() => Department, (d) => d.teams)
  @JoinColumn({ name: 'departmentId' })
  department: Department

  @Column({ default: true })
  isActive: boolean
}
