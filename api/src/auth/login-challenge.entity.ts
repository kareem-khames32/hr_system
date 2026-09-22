import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

/** مسار الدخول اللي طلب الرمز — الرمز مربوط بمحاولة دخول واحدة بمسارها. */
export type LoginChallengeMethod = 'PASSWORD' | 'DOMAIN'

/**
 * حالة دخول معلَّقة (التحقق بخطوتين): كلمة المرور صحّت — أو الـbind على المجال نجح — والجلسة **لسه ما اتفتحتش**.
 * الصف ده مش جلسة ومش توكن: مايفتحش أي مسار في النظام. الجلسة (JWT) بتتولد بعد التحقق من الرمز بس.
 * الرمز نفسه مخزَّن hash (bcrypt) — لا يُخزَّن ولا يُسجَّل ولا يُرجَّع صريحًا في أي رد.
 *
 * أسماء القيد والفهارس صريحة (مش hash) عشان ترحيل 066 يطابقها بالحرف وفرق المخطط يفضل صفرًا.
 * مفيش أي عمود له قيمة افتراضية: الخدمة بتكتب كل الأعمدة في الـinsert، فمفيش قيد افتراضي مُدار.
 */
@Entity('login_challenges')
@Index('UX_login_challenges_token', ['token'], { unique: true })
@Index('IX_login_challenges_user', ['userId'])
export class LoginChallenge {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_login_challenges' })
  id: number

  // المعرّف المعلَّق اللي بيرجع للعميل: عشوائي 32 بايت. لوحده مايعملش حاجة — لازم معاه الرمز المبعوت على البريد
  @Column({ type: 'nvarchar', length: 64 })
  token: string

  @Column({ type: 'int' })
  userId: number

  // bcrypt لرمز الـ6 أرقام — المقارنة بس، والرمز الصريح مايتخزنش
  @Column({ type: 'nvarchar', length: 200 })
  codeHash: string

  @Column({ type: 'nvarchar', length: 20 })
  method: LoginChallengeMethod

  // العنوان اللي الرمز اتبعت له فعلًا (من AD لو موجود، وإلا بريد الحساب) — للسجل وللعرض مُقنَّعًا
  @Column({ type: 'nvarchar', length: 200 })
  sentTo: string

  @Column({ type: 'datetime2' })
  expiresAt: Date

  // محاولات إدخال رمز غلط — بتتراكم ومابتتصفّرش بإعادة الإرسال (وإلا كان الحد بيتخطى)
  @Column({ type: 'int' })
  attempts: number

  @Column({ type: 'int' })
  resendCount: number

  @Column({ type: 'datetime2' })
  lastSentAt: Date

  // استُخدم مرة واحدة: بعدها نفس الرمز مايفتحش جلسة تانية
  @Column({ type: 'datetime2', nullable: true })
  consumedAt: Date | null

  // اتقفل بعد استنفاد المحاولات — لازم يبدأ الدخول من الأول
  @Column({ type: 'datetime2', nullable: true })
  lockedAt: Date | null

  @Column({ type: 'datetime2' })
  createdAt: Date
}
