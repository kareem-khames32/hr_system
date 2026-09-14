import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

@Entity('overtime_day_claims')
@Index('UQ_overtime_day_claim_active', ['employeeId', 'workDate'], { unique: true, where: '"releasedAt" IS NULL' })
export class OvertimeDayClaim {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'int' })
  employeeId: number

  @Column({ type: 'date' })
  workDate: string

  @Index('IX_overtime_day_claim_entry')
  @Column({ type: 'int' })
  entryId: number

  @CreateDateColumn({ type: 'datetime2' })
  claimedAt: Date

  @Column({ type: 'datetime2', nullable: true })
  releasedAt: Date | null
}

@Entity('overtime_entry_events')
export class OvertimeEntryEvent {
  @PrimaryGeneratedColumn()
  id: number

  @Index('IX_overtime_event_entry')
  @Column({ type: 'int' })
  entryId: number

  @Column({ type: 'int', nullable: true })
  requestId: number | null

  @Column({ type: 'int', nullable: true })
  actorUserId: number | null

  @Column({ type: 'nvarchar', length: 30 })
  eventType: string

  @Column({ type: 'int', nullable: true })
  stepOrder: number | null

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  reason: string | null

  @Column({ type: 'simple-json', nullable: true })
  payload: Record<string, unknown> | null

  @CreateDateColumn({ type: 'datetime2' })
  createdAt: Date
}
