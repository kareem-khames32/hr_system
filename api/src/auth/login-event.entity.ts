import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

// سجل الدخول (خطة التنفيذ B1.3 — ترحيل 078): كل محاولة دخول أو فك قفل بوقتها ونتيجتها والـIP والجهاز. إضافة بس (مفيش تعديل ولا مسح).
// identifier = البريد أو اسم المستخدم زي ما اتكتب (حتى لو الحساب مش موجود)، userId = الحساب لو اتعرف.
// method: PASSWORD (بريد + كلمة سر) | DOMAIN (حساب الشركة) | CODE (رمز البريد) | ADMIN (فك قفل من مدير).
// الأسماء صريحة (PK_login_events والفهرسين) مطابقة لترحيل 078 عشان فرق المخطط يبقى صفر.
@Entity('login_events')
@Index('IX_login_events_at', ['at'])
@Index('IX_login_events_user', ['userId', 'at'])
export class LoginEvent {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_login_events' })
  id: number

  @Column({ type: 'datetime2' })
  at: Date

  @Column({ type: 'int', nullable: true })
  userId: number | null

  @Column({ type: 'nvarchar', length: 200 })
  identifier: string

  @Column({ type: 'nvarchar', length: 10 })
  method: string

  @Column({ type: 'nvarchar', length: 30 })
  outcome: string

  @Column({ type: 'nvarchar', length: 64, nullable: true })
  ip: string | null

  @Column({ type: 'nvarchar', length: 400, nullable: true })
  userAgent: string | null

  // فك القفل: مين فكه (null للمحاولات نفسها)
  @Column({ type: 'int', nullable: true })
  actorUserId: number | null
}
