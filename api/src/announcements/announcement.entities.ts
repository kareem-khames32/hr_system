import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

export type AnnouncementStatus = 'DRAFT' | 'PUBLISHED' | 'WITHDRAWN'

// B2.16 (ترحيل 100): إعلان لجمهور «مين + فين» بتاريخ نشر وانتهاء. نفس الشكل في الترحيل بالحرف.
@Entity('announcements')
export class Announcement {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_announcements' })
  id: number

  @Column({ type: 'nvarchar', length: 200 })
  title: string

  @Column({ type: 'nvarchar', length: 4000 })
  body: string

  // جمهور الإعلان بنفس صيغة جمهور أنواع الطلبات (request-audience.ts). NULL = كل الشركة
  @Column({ type: 'nvarchar', length: 2000, nullable: true })
  audience: string | null

  // أول يوم يظهر فيه (توقيت الشركة)
  @Column({ type: 'date' })
  publishDate: string

  // آخر يوم يظهر فيه؛ NULL = من غير انتهاء
  @Column({ type: 'date', nullable: true })
  expiryDate: string | null

  @Column({ type: 'bit' })
  pinned: boolean

  // محتاج إقرار قراءة: اللوحة بتطلب «أقرّ بالقراءة» بدل «قريت»
  @Column({ type: 'bit' })
  requiresRead: boolean

  @Column({ type: 'nvarchar', length: 20 })
  status: AnnouncementStatus

  @Column({ type: 'int' })
  createdByUserId: number

  @Column({ type: 'datetime2' })
  createdAt: Date

  @Column({ type: 'datetime2', nullable: true })
  publishedAt: Date | null
}

// مين قرا الإعلان: مرة واحدة لكل موظف
@Entity('announcement_reads')
@Index('UX_announcement_reads_announcement_employee', ['announcementId', 'employeeId'], { unique: true })
export class AnnouncementRead {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_announcement_reads' })
  id: number

  @Column({ type: 'int' })
  announcementId: number

  @Column({ type: 'int' })
  employeeId: number

  @Column({ type: 'int' })
  userId: number

  @Column({ type: 'datetime2' })
  readAt: Date
}
