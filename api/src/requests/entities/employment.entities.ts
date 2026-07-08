import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm'

// ============ وجهات الحالة الوظيفية ============

@Entity('transfers')
export class Transfer {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ nullable: true })
  requestId: number

  @Index()
  @Column()
  employeeId: number

  @Column()
  fromTeam: number

  @Column()
  toTeam: number

  // التنفيذ الآلي بتاريخ السريان — الـ scheduler ينفّذه يومياً
  @Column({ type: 'date' })
  effectiveDate: string

  @Column({ length: 30 })
  status: string // SCHEDULED | EXECUTED

  @Column({ type: 'datetime', nullable: true })
  executedAt: Date
}

@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ nullable: true })
  requestId: number

  @Index()
  @Column()
  employeeId: number

  @Column({ length: 200 })
  fromTitle: string

  @Column({ length: 200 })
  toTitle: string

  @Column({ type: 'date' })
  effectiveDate: string
}

// يغذّي سجل النقل/الترقية/تغيير الحالة/تغييرات الراتب
@Entity('employee_status_history')
export class EmployeeStatusHistory {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column()
  employeeId: number

  @Column({ length: 100, nullable: true })
  oldStatus: string

  @Column({ length: 100 })
  newStatus: string

  @CreateDateColumn()
  changedAt: Date

  @Column({ length: 500, nullable: true })
  reason: string

  @Column({ nullable: true })
  requestId: number
}
