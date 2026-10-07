import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

// B2.5 — إضافة المالك 6 أكتوبر (ترحيل 096): سجل المهمة — سطر لكل تغيير عليها (تكليف، تحويل، موعد، حالة، رجوع للتعديل، طلب تمديد
// وقراره، تقييم) بالحساب اللي عمله ووقته. بيتضاف عليه بس (مفيش تعديل ولا مسح)، وبيتقري للي يشوف المهمة (GET /tasks/:id/log).
// نفس الشكل في الترحيل بالحرف.
@Entity('task_log')
@Index('UX_task_log_task_id', ['taskId', 'id'], { unique: true })
export class TaskLogEntry {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_task_log' })
  id: number

  @Column({ type: 'int' })
  taskId: number

  // نوع السطر (TASK_LOG_EVENTS في tasks/task-extras.ts)
  @Column({ type: 'nvarchar', length: 40 })
  event: string

  // الحساب اللي عمل التغيير، وموظفه المتسجّل وقتها (ربط الحساب بموظف تاني بعدها مابيغيّرش مين عمل التغيير)
  @Column({ type: 'int' })
  actorUserId: number

  @Column({ type: 'int', nullable: true })
  actorEmployeeId: number | null

  @Column({ type: 'nvarchar', length: 1000 })
  body: string

  @Column({ type: 'datetime2' })
  createdAt: Date
}
