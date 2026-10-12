import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

// B-ADD.19 (كلمة المالك 12 أكتوبر، ترحيل 194): مرفقات المهمة — ربط ملف مخزّن (stored_files، تصنيفه task_attachment) بمهمة. صف لكل
// (مهمة، ملف): ملف المهمة الجماعية مربوط بكل مهامها (نفس الملف، صف لكل مهمة). شيل المرفق بيختم الصف (مين وإمتى) ومابيمسحوش، والملف
// نفسه بيفضل على التخزين. نفس الشكل في الترحيل بالحرف.
@Entity('task_attachments')
@Index('UX_task_attachments_task_file', ['taskId', 'fileId'], { unique: true })
@Index('IX_task_attachments_file', ['fileId'])
export class TaskAttachment {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_task_attachments' })
  id: number

  @Column({ type: 'int' })
  taskId: number

  @Column({ type: 'int' })
  fileId: number

  // الحساب اللي رفع الملف وربطه
  @Column({ type: 'int' })
  uploadedByUserId: number

  @Column({ type: 'datetime2' })
  createdAt: Date

  // اتشال من المهمة: إمتى ومين (فاضيين = المرفق ساري)
  @Column({ type: 'datetime2', nullable: true })
  removedAt: Date | null

  @Column({ type: 'int', nullable: true })
  removedByUserId: number | null
}
