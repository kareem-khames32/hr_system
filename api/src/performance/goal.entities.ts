import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

// B3.6 (ترحيلين 110 و111): هدف الأداء وسجله. نفس الشكل في الترحيلين بالحرف (من غير افتراضي).
export const GOAL_OWNER_TYPES = ['EMPLOYEE', 'DEPARTMENT', 'COMPANY'] as const
export type GoalOwnerType = (typeof GOAL_OWNER_TYPES)[number]
export const GOAL_KINDS = ['KPI', 'GOAL'] as const
export type GoalKind = (typeof GOAL_KINDS)[number]
export const GOAL_STATUSES = ['PROPOSED', 'ACTIVE', 'DONE', 'CANCELLED', 'REJECTED'] as const
export type GoalStatus = (typeof GOAL_STATUSES)[number]
export type GoalUpdateKind = 'PROGRESS' | 'CHANGE' | 'STATUS' | 'EVIDENCE'

@Entity('performance_goals')
export class PerformanceGoal {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_performance_goals' })
  id: number

  @Column({ type: 'nvarchar', length: 20 })
  ownerType: GoalOwnerType

  @Column({ type: 'int', nullable: true })
  employeeId: number | null

  @Column({ type: 'int', nullable: true })
  departmentId: number | null

  // فرع الهدف وقت الإنشاء (فرع الموظف أو القسم)؛ الفاضي = هدف شركة. الحكم بالفرع الحالي لصاحب الهدف
  @Column({ type: 'int', nullable: true })
  branchId: number | null

  @Column({ type: 'int', nullable: true })
  parentGoalId: number | null

  @Column({ type: 'nvarchar', length: 10 })
  kind: GoalKind

  @Column({ type: 'nvarchar', length: 200 })
  title: string

  @Column({ type: 'nvarchar', length: 1000, nullable: true })
  description: string | null

  // من 0 لـ100
  @Column({ type: 'int' })
  weight: number

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  targetValue: string | null

  @Column({ type: 'nvarchar', length: 30, nullable: true })
  unit: string | null

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  actualValue: string | null

  @Column({ type: 'date' })
  periodStart: string

  @Column({ type: 'date' })
  periodEnd: string

  @Column({ type: 'nvarchar', length: 20 })
  status: GoalStatus

  @Column({ type: 'int' })
  proposedByUserId: number

  @Column({ type: 'int', nullable: true })
  decidedByUserId: number | null

  @Column({ type: 'datetime2', nullable: true })
  decidedAt: Date | null

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  decisionReason: string | null

  @Column({ type: 'datetime2' })
  createdAt: Date

  @Column({ type: 'datetime2', nullable: true })
  closedAt: Date | null
}

@Entity('performance_goal_updates')
export class PerformanceGoalUpdate {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_performance_goal_updates' })
  id: number

  @Column({ type: 'int' })
  goalId: number

  @Column({ type: 'nvarchar', length: 20 })
  kind: GoalUpdateKind

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  actualValue: string | null

  @Column({ type: 'nvarchar', length: 1000, nullable: true })
  note: string | null

  // التعديل قبل وبعد (JSON) لسطور CHANGE وSTATUS
  @Column({ type: 'nvarchar', length: 2000, nullable: true })
  changes: string | null

  @Column({ type: 'int', nullable: true })
  taskId: number | null

  @Column({ type: 'int' })
  byUserId: number

  @Column({ type: 'datetime2' })
  createdAt: Date
}
