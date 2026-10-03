import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

// سجل تشغيل المهام المجدولة (خطة التنفيذ B1.4 — ترحيل 079): صف لكل تشغيل بموعده (slot = الدقيقة بتوقيت UTC). المفتاح الفريد
// (jobId, slot) بيخلّي نسخة تانية من الـAPI في نفس الدقيقة تتعدّى. status: RUNNING ثم SUCCEEDED أو FAILED (برسالة الخطأ).
// بيتمسح بعد 30 يوم (scheduler.prune-runs). الأسماء صريحة مطابقة للترحيل عشان فرق المخطط يبقى صفر.
@Entity('scheduled_job_runs')
@Index('UX_scheduled_job_runs_slot', ['jobId', 'slot'], { unique: true })
@Index('IX_scheduled_job_runs_started', ['startedAt'])
export class ScheduledJobRun {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_scheduled_job_runs' })
  id: number

  @Column({ type: 'nvarchar', length: 80 })
  jobId: string

  @Column({ type: 'nvarchar', length: 20 })
  slot: string

  @Column({ type: 'nvarchar', length: 12 })
  status: string

  @Column({ type: 'datetime2' })
  startedAt: Date

  @Column({ type: 'datetime2', nullable: true })
  finishedAt: Date | null

  @Column({ type: 'int', nullable: true })
  durationMs: number | null

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  error: string | null

  // السيرفر والعملية اللي شغّلت (hostname:pid)
  @Column({ type: 'nvarchar', length: 120, nullable: true })
  host: string | null
}
