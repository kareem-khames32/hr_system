import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

// ============ وجهات الحضور / الأوفرتايم ============

export type OvertimeSource = 'BIOMETRIC_DETECTED' | 'PRE_REQUESTED'
import type { OvertimeStatus } from '../../common/domain-status'
export type { OvertimeStatus } from '../../common/domain-status'

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
  hoursRequested: number | null

  // من البصمة — يُملأ عند مزامنة ZKTeco
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  hoursActual: number | null

  // = min(المعتمد، الفعلي) — يُحسب عند الاعتماد/المزامنة
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  payableHours: number | null

  @Column({ type: 'decimal', precision: 4, scale: 2, default: 1.5 })
  rate: number

  @Column({ type: String, length: 20, default: 'DETECTED' })
  status: OvertimeStatus

  // يُربط عند الدفع في مسير الرواتب
  @Column({ nullable: true })
  payrollRunId: number

  // نحفظ دليل التقديم وقرار التسعير؛ القديم يبقى بلا لقطة ولا ننسب إليه تاريخاً مخترعاً.
  @Column({ type: 'simple-json', nullable: true })
  calculationSnapshot: Record<string, any> | null

  @Column({ type: 'int', nullable: true })
  approvedMinutes: number | null

  @Column({ type: 'decimal', precision: 18, scale: 6, nullable: true })
  hourlyRateSnapshot: number | null

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  amountSnapshot: number | null

  @Column({ type: 'nvarchar', length: 7, nullable: true })
  originalPeriod: string | null

  @Column({ type: 'int', nullable: true })
  deferredFromRunId: number | null
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


