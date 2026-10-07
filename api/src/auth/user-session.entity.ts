import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

/** سبب إنهاء الجلسة: خروج صاحبها، أو إنهاؤها من «جلساتي»، أو تغيير كلمة المرور */
export type SessionEndReason = 'LOGOUT' | 'USER' | 'PASSWORD'

// B2.17-ب (ترحيل 101): جلسة دخول مفتوحة — صف لكل دخول، ورقمه العشوائي (sid) جوه توكن الجلسة. الجلسة اللي صفها اتنهى (revokedAt)
// مابتعدّيش من حارس الدخول حتى لو توكنها لسه في مدته. tokenVersion = إصدار الحساب وقت الدخول: جلسة إصدارها أقدم من الحساب ميتة
// أصلًا (حارس الإصدار القايم)، فمابتتعرضش في «جلساتي». نفس الشكل في الترحيل بالحرف.
@Entity('user_sessions')
@Index('UX_user_sessions_sid', ['sid'], { unique: true })
export class UserSession {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_user_sessions' })
  id: number

  // الرقم العشوائي اللي في التوكن (24 بايت hex) — مش رقم الصف، فرقم جلسة مابيتخمّنش من رقم جلسة تانية
  @Column({ type: 'nvarchar', length: 64 })
  sid: string

  @Column({ type: 'int' })
  userId: number

  @Column({ type: 'int' })
  tokenVersion: number

  @Column({ type: 'datetime2' })
  createdAt: Date

  // آخر طلب بالجلسة — بيتحدّث كل كام دقيقة مش مع كل طلب
  @Column({ type: 'datetime2' })
  lastSeenAt: Date

  // نهاية مدة التوكن
  @Column({ type: 'datetime2' })
  expiresAt: Date

  @Column({ type: 'nvarchar', length: 64, nullable: true })
  ip: string | null

  @Column({ type: 'nvarchar', length: 400, nullable: true })
  userAgent: string | null

  @Column({ type: 'datetime2', nullable: true })
  revokedAt: Date | null

  @Column({ type: 'nvarchar', length: 20, nullable: true })
  revokedReason: string | null
}
