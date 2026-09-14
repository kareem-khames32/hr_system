import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm'
import type { TransferStatus } from '../../common/domain-status'
export type { TransferStatus } from '../../common/domain-status'

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

  // Legacy property/API alias; database name states that the value is teams.id.
  @Column({ name: 'fromTeamId', type: 'int', nullable: true })
  fromTeam: number | null

  @Column({ name: 'toTeamId' })
  toTeam: number

  // التنفيذ الآلي بتاريخ السريان — الـ scheduler ينفّذه يومياً
  @Column({ type: 'date' })
  effectiveDate: string

  @Column({ type: String, length: 30 })
  status: TransferStatus

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

  @Index()
  @Column({ type: String, length: 20, nullable: true })
  changeType: 'STATUS' | 'SALARY' | 'TEAM' | 'TITLE' | 'BANK' | 'CONTRACT' | 'SHIFT' | 'DATA' | null

  @Column({ type: String, length: 60, nullable: true })
  fieldName: string | null

  @Column({ type: 'simple-json', nullable: true })
  oldValue: unknown

  @Column({ type: 'simple-json', nullable: true })
  newValue: unknown

  // Actual users.id when known; request/system execution is traced by requestId,
  // never guessed from the requester employee or the user who submitted it.
  @Column({ type: 'int', nullable: true })
  changedByUserId: number | null

  // Lifecycle values only for new rows. API projection derives legacy prefixed
  // labels from the structured values for older frontend consumers.
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

