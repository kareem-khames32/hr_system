import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

// B-ADD.23 (ترحيل 198): مكالمات النظام. نفس الشكل في الترحيل بالحرف (اختبار المكالمات بيقارن الشكل وفرق synchronize) — من غير افتراضي.
// مفيش أي محتوى بيتخزّن: لا صوت ولا صورة — مين اتصل بمين، وإمتى، واتردّ عليها ولا لأ، وإمتى انتهت بس.

/** مكالمة بين حسابين. code رقمها واسم غرفتها على خادم الاجتماعات (عشوائي). الحالة من الأوقات (call-rules ← callStateOf) */
@Entity('meet_calls')
@Index('UX_meet_calls_code', ['code'], { unique: true })
@Index('IX_meet_calls_caller', ['callerUserId', 'startedAt'])
@Index('IX_meet_calls_callee', ['calleeUserId', 'startedAt'])
export class MeetCall {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_meet_calls' })
  id: number

  @Column({ type: 'nvarchar', length: 36 })
  code: string

  // المتصل (users.id)
  @Column({ type: 'int' })
  callerUserId: number

  // اللي بيتّصلوا بيه (users.id)
  @Column({ type: 'int' })
  calleeUserId: number

  @Column({ type: 'datetime2' })
  startedAt: Date

  // وقت الرد (الفاضي = ماتردّش عليها)
  @Column({ type: 'datetime2', nullable: true })
  answeredAt: Date | null

  // وقت القفل أو الرفض أو إلغاء المتصل (الفاضي مع رنة خلصت = محدش رد)
  @Column({ type: 'datetime2', nullable: true })
  endedAt: Date | null

  // اللي بيتّصلوا بيه رفضها
  @Column({ type: 'bit' })
  rejected: boolean
}
