import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

// B2.17-ج (ترحيل 102): سر تطبيق المصادقة لحساب — صف واحد لكل حساب. السر مشفّر (totp.ts: sealTotpSecret) ومابيرجعش في أي رد بعد
// التفعيل. confirmedAt فاضي = تفعيل لسه مااتأكدش برمز (مابيتطلبش في الدخول). lastStep = آخر خطوة زمنية اتقبل رمزها: الرمز مرة واحدة.
// failedCount وlockedUntil: رموز غلط ورا بعض بتقفل التحقق شوية (الرمز 6 أرقام بس). نفس الشكل في الترحيل بالحرف.
@Entity('user_totp')
@Index('UX_user_totp_user', ['userId'], { unique: true })
export class UserTotp {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_user_totp' })
  id: number

  @Column({ type: 'int' })
  userId: number

  @Column({ type: 'nvarchar', length: 200 })
  secret: string

  @Column({ type: 'datetime2', nullable: true })
  confirmedAt: Date | null

  @Column({ type: 'int', nullable: true })
  lastStep: number | null

  @Column({ type: 'int' })
  failedCount: number

  @Column({ type: 'datetime2', nullable: true })
  lockedUntil: Date | null

  @Column({ type: 'datetime2' })
  createdAt: Date
}
