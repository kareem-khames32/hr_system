import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

// B2.3 (ترحيل 086): الـoutbox والطابور. نفس الشكل في الترحيل بالحرف (اختبار الترحيل بيقارن الشكل وفرق synchronize).

/** حدث نطاق اتكتب في نفس معاملة العملية — العامل بيوزعه على مستهلكينه كمهام */
@Entity('outbox_events')
@Index('IX_outbox_events_pending', ['dispatchedAt', 'id'])
@Index('UX_outbox_events_key', ['eventKey'], { unique: true, where: '[eventKey] IS NOT NULL' })
export class OutboxEvent {
  @PrimaryGeneratedColumn({ type: 'bigint', primaryKeyConstraintName: 'PK_outbox_events' })
  id: string

  @Column({ type: 'nvarchar', length: 60 })
  eventType: string

  @Column({ type: 'nvarchar', length: 40, nullable: true })
  entityType: string | null

  @Column({ type: 'nvarchar', length: 60, nullable: true })
  entityId: string | null

  // JSON من غير بيانات حساسة (أرقام ومراجع)
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  payload: string | null

  // مفتاح منع تكرار الحدث نفسه (اختياري): مستند هينتهي مرة واحدة لكل تاريخ انتهاء
  @Column({ type: 'nvarchar', length: 160, nullable: true })
  eventKey: string | null

  @Column({ type: 'datetime2' })
  createdAt: Date

  @Column({ type: 'datetime2', nullable: true })
  dispatchedAt: Date | null
}

/** مهمة في الطابور: مستهلك واحد لحدث واحد (أو شغل مباشر) */
@Entity('jobs_queue')
@Index('IX_jobs_queue_due', ['status', 'runAfter', 'id'])
@Index('UX_jobs_queue_key', ['idempotencyKey'], { unique: true, where: '[idempotencyKey] IS NOT NULL' })
export class QueueJob {
  @PrimaryGeneratedColumn({ type: 'bigint', primaryKeyConstraintName: 'PK_jobs_queue' })
  id: string

  @Column({ type: 'nvarchar', length: 60 })
  jobType: string

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  payload: string | null

  // PENDING | RUNNING | DONE | DEAD
  @Column({ type: 'nvarchar', length: 10 })
  status: string

  @Column({ type: 'int' })
  attempts: number

  @Column({ type: 'int' })
  maxAttempts: number

  @Column({ type: 'datetime2' })
  runAfter: Date

  // منع التكرار: نفس الحدث لنفس المستهلك مرة واحدة
  @Column({ type: 'nvarchar', length: 200, nullable: true })
  idempotencyKey: string | null

  @Column({ type: 'bigint', nullable: true })
  outboxEventId: string | null

  @Column({ type: 'nvarchar', length: 120, nullable: true })
  lockedBy: string | null

  @Column({ type: 'datetime2', nullable: true })
  lockedAt: Date | null

  @Column({ type: 'nvarchar', length: 1000, nullable: true })
  lastError: string | null

  @Column({ type: 'datetime2' })
  createdAt: Date

  @Column({ type: 'datetime2', nullable: true })
  finishedAt: Date | null
}
