import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

export type AttendanceRuleSourceType = 'SHIFT' | 'WORK_SCHEDULE' | 'EMPLOYEE' | 'CALENDAR_GLOBAL' | 'CALENDAR_BRANCH' | 'EMPLOYEE_ORG'
export type AttendanceFlexOverrideMode = 'INHERIT' | 'ENABLED' | 'DISABLED'

export interface EmployeeAttendanceRuleSnapshot {
  workScheduleId: number | null
  flexOverrideMode: AttendanceFlexOverrideMode
}

// النسخة القديمة تبقى كما هي؛ effectiveTo مشتق من النسخة التالية ولا يُكتب فوقها.
@Entity('attendance_rule_versions')
@Index('UX_attendance_rule_source_version', ['sourceType', 'sourceId', 'version'], { unique: true })
@Index('IX_attendance_rule_source_effective', ['sourceType', 'sourceId', 'effectiveFrom'])
export class AttendanceRuleVersion {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'nvarchar', length: 20 })
  sourceType: AttendanceRuleSourceType

  @Column({ type: 'int' })
  sourceId: number

  // NULL يحفظ القيم التي وجدناها في المصدر القديم، بلا ادعاء تاريخ سريان لم يسجل.
  @Column({ type: 'date', nullable: true })
  effectiveFrom: string | null

  @Column({ type: 'int' })
  version: number

  @Column({ type: 'simple-json' })
  snapshot: Record<string, any>

  @Column({ type: 'int', nullable: true })
  actorUserId: number | null

  @Column({ type: 'nvarchar', length: 500 })
  reason: string

  @Column({ type: 'bit', default: false })
  legacyBaseline: boolean

  @CreateDateColumn({ type: 'datetime2' })
  createdAt: Date
}
