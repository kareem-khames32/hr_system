import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

// B2.5 (ترحيل 088): المهمة العامة — على موظف، أو على دور وظيفي في فرع المهمة. نفس الشكل في الترحيل بالحرف.
// مهام التهيئة (onboarding_tasks) وبنود إخلاء الطرف (clearance_items) في جداولها زي ما هي، و«مهامي» بيجمع التلاتة (TasksService.mine).

export const TASK_STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING', 'DONE', 'CANCELLED'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]
// المهمة اللي لسه على مسؤولها
export const TASK_OPEN_STATUSES: readonly TaskStatus[] = ['OPEN', 'IN_PROGRESS', 'WAITING']
export const TASK_PRIORITIES = ['LOW', 'NORMAL', 'HIGH'] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

@Entity('tasks')
@Index('IX_tasks_assignee', ['assigneeEmployeeId', 'status'])
@Index('IX_tasks_branch', ['branchId', 'status', 'dueDate'])
export class Task {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_tasks' })
  id: number

  @Column({ type: 'nvarchar', length: 200 })
  title: string

  @Column({ type: 'nvarchar', length: 2000, nullable: true })
  description: string | null

  // المسؤول: موظف، أو دور وظيفي (واحد من الاتنين). الدور بيتحل وقت القراءة بصلاحية الحساب ونطاق فروعه، زي خطوات الاعتماد الوظيفية
  @Column({ type: 'int', nullable: true })
  assigneeEmployeeId: number | null

  @Column({ type: 'nvarchar', length: 40, nullable: true })
  assigneeRole: string | null

  // فرع المهمة: فرع الموظف المسؤول وقت التكليف، أو الفرع المختار لمهمة الدور — نطاق قايمة المهام وحاملي الدور
  @Column({ type: 'int' })
  branchId: number

  // اللي كلّف بيها: اللي أنشأها، أو آخر حد حوّلها لمسؤولها الحالي
  @Column({ type: 'int' })
  createdByUserId: number

  @Column({ type: 'date', nullable: true })
  dueDate: string | null

  @Column({ type: 'nvarchar', length: 10 })
  priority: string

  @Column({ type: 'nvarchar', length: 20 })
  status: string

  @Column({ type: 'bit' })
  requiresProof: boolean

  @Column({ type: 'nvarchar', length: 1000, nullable: true })
  proofNote: string | null

  @Column({ type: 'int', nullable: true })
  proofFileId: number | null

  // سبب آخر حالة: ليه «مستنية»، أو ليه اتلغت، أو ليه اتفتحت تاني
  @Column({ type: 'nvarchar', length: 500, nullable: true })
  statusNote: string | null

  @Column({ type: 'int', nullable: true })
  closedByUserId: number | null

  @Column({ type: 'datetime2', nullable: true })
  closedAt: Date | null

  // التذكير والتصعيد مرة واحدة لكل موعد ومسؤول: تغيير الموعد أو المسؤول أو إعادة الفتح بيصفّرهم
  @Column({ type: 'datetime2', nullable: true })
  remindedAt: Date | null

  @Column({ type: 'datetime2', nullable: true })
  escalatedAt: Date | null

  @Column({ type: 'datetime2' })
  createdAt: Date

  @Column({ type: 'datetime2' })
  updatedAt: Date
}
