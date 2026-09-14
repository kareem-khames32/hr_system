import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

export type AttendanceExemptionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
export type AttendanceExemptionReasonCode = 'executive' | 'field_role' | 'remote' | 'contractual' | 'medical' | 'other'

// EX-09 / EX-13: مصدر واحد مؤرخ للاستثناء؛ لا علم دائم موازٍ على الموظف.
@Entity('attendance_exemptions')
export class AttendanceExemption {
  @PrimaryGeneratedColumn()
  id: number

  @Index('IDX_attendance_exemption_employee')
  @Column({ type: 'int' })
  employeeId: number

  @Column({ type: 'date' })
  effectiveFrom: string

  @Column({ type: 'date', nullable: true })
  effectiveTo: string | null

  @Column({ type: 'nvarchar', length: 30 })
  reasonCode: AttendanceExemptionReasonCode

  @Column({ type: 'nvarchar', length: 500 })
  reason: string

  @Column({ type: 'nvarchar', length: 20, default: 'PENDING' })
  status: AttendanceExemptionStatus

  @Column({ type: 'int' })
  createdByUserId: number

  @Column({ type: 'int', nullable: true })
  approvedByUserId: number | null

  @Column({ type: 'datetime2', nullable: true })
  approvedAt: Date | null

  @Column({ type: 'int', nullable: true })
  executiveApprovedByUserId: number | null

  @Column({ type: 'datetime2', nullable: true })
  executiveApprovedAt: Date | null

  // أول يوم يعود فيه الموظف لقواعد الحضور. تبقى APPROVED نافذةً تاريخيةً قبله.
  @Column({ type: 'date', nullable: true })
  terminatedFrom: string | null

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  terminationReason: string | null

  @Column({ type: 'int', nullable: true })
  terminatedByUserId: number | null

  @Column({ type: 'bit', nullable: true })
  overtimeEligibleOverride: boolean | null

  @Column({ type: 'bit', nullable: true })
  unpaidLeaveDeductibleOverride: boolean | null

  @Column({ type: 'bit', default: false })
  requiresCheckinForPresence: boolean

  @CreateDateColumn({ type: 'datetime2' })
  createdAt: Date

  @UpdateDateColumn({ type: 'datetime2' })
  updatedAt: Date
}

@Entity('attendance_exemption_events')
export class AttendanceExemptionEvent {
  @PrimaryGeneratedColumn()
  id: number

  @Index('IDX_attendance_exemption_event')
  @Column({ type: 'int' })
  exemptionId: number

  @Column({ type: 'int' })
  actorUserId: number

  @Column({ type: 'nvarchar', length: 30 })
  eventType: string

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  reason: string | null

  @Column({ type: 'simple-json', nullable: true })
  payload: Record<string, unknown> | null

  @CreateDateColumn({ type: 'datetime2' })
  createdAt: Date
}
