import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

// B-ADD.15 (ترحيل 191): الاجتماعات. نفس الشكل في الترحيل بالحرف (اختبار الاجتماعات بيقارن الشكل وفرق synchronize) — من غير افتراضي.
// مفيش أي محتوى بيتخزّن: لا صوت ولا صورة ولا دردشة الاجتماع — الاجتماع، ومين اتدعى، ومين دخل إمتى بس.

/** اجتماع: فوري (startsAt فاضي) أو بميعاد. code هو رقمه في اللينك واسم غرفته على خادم الاجتماعات (عشوائي: اللينك مايتخمّنش) */
@Entity('meetings')
@Index('UX_meetings_code', ['code'], { unique: true })
@Index('IX_meetings_host', ['hostUserId', 'createdAt'])
export class Meeting {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_meetings' })
  id: number

  @Column({ type: 'nvarchar', length: 36 })
  code: string

  @Column({ type: 'nvarchar', length: 200 })
  title: string

  // صاحب الاجتماع (users.id)
  @Column({ type: 'int' })
  hostUserId: number

  @Column({ type: 'datetime2', nullable: true })
  startsAt: Date | null

  // غرفة انتظار: اللي مش مدعو بيطلب الدخول وصاحب الاجتماع يوافق
  @Column({ type: 'bit' })
  lobby: boolean

  @Column({ type: 'datetime2' })
  createdAt: Date

  // صاحب الاجتماع أنهاه للكل
  @Column({ type: 'datetime2', nullable: true })
  endedAt: Date | null

  // صاحب الاجتماع لغاه
  @Column({ type: 'datetime2', nullable: true })
  cancelledAt: Date | null
}

/** دعوة حساب لاجتماع (صف لكل مدعو) */
@Entity('meeting_invites')
@Index('UX_meeting_invites_target', ['meetingId', 'userId'], { unique: true })
@Index('IX_meeting_invites_user', ['userId'])
export class MeetingInvite {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_meeting_invites' })
  id: number

  @Column({ type: 'int' })
  meetingId: number

  @Column({ type: 'int' })
  userId: number

  @Column({ type: 'datetime2' })
  createdAt: Date
}

/** حضور: وقت الدخول بس (صف مع كل تذكرة دخول؛ الرجوع في خلال دقيقتين مش دخول جديد) — من غير وقت خروج */
@Entity('meeting_attendance')
@Index('IX_meeting_attendance_meeting', ['meetingId', 'joinedAt'])
export class MeetingAttendance {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_meeting_attendance' })
  id: number

  @Column({ type: 'int' })
  meetingId: number

  @Column({ type: 'int' })
  userId: number

  @Column({ type: 'datetime2' })
  joinedAt: Date
}
