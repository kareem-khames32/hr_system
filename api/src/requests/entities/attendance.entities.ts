import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

// ============ وجهات الحضور / الأوفرتايم ============

export type OvertimeSource = 'BIOMETRIC_DETECTED' | 'PRE_REQUESTED'
export type OvertimeStatus =
  | 'DETECTED'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'PAID'
  | 'REJECTED'

@Entity('overtime_entries')
export class OvertimeEntry {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ nullable: true })
  requestId: number

  @Index()
  @Column()
  employeeId: number

  @Column({ type: 'date' })
  date: string

  @Column({ length: 30 })
  source: OvertimeSource

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  hoursRequested: number

  // من البصمة — يُملأ عند مزامنة ZKTeco
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  hoursActual: number

  // = min(المعتمد، الفعلي) — يُحسب عند الاعتماد/المزامنة
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  payableHours: number

  @Column({ type: 'decimal', precision: 4, scale: 2, default: 1.5 })
  rate: number

  @Column({ length: 20, default: 'DETECTED' })
  status: OvertimeStatus

  // يُربط عند الدفع في مسير الرواتب
  @Column({ nullable: true })
  payrollRunId: number
}

@Entity('attendance_corrections')
export class AttendanceCorrection {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ nullable: true })
  requestId: number

  @Index()
  @Column()
  employeeId: number

  @Column({ type: 'date' })
  date: string

  @Column({ length: 500 })
  reason: string

  // JSON: {in: '08:00', out: '17:00'}
  @Column({ length: 200 })
  correctedPunch: string
}
