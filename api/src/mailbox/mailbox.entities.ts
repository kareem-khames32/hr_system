import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

// B-ADD.16 (ترحيل 192): البريد. نفس الشكل في الترحيل بالحرف (من غير افتراضي) — الاختبار بيقارن الشكل وفرق synchronize.
// ولا جدول هنا فيه رسالة ولا مرفق ولا كلمة سر: البريد كله بيفضل على Exchange.

/** اسم دخول الموظف في المجال (UPN) — بيتسجّل وقت «الدخول بحساب الشركة»، وبيه «افتح بريدك» بيعرف يدخل Exchange باسم مين. الاسم بس، من غير أي سر */
@Entity('mail_accounts')
@Index('UX_mail_accounts_user', ['userId'], { unique: true })
export class MailAccount {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_mail_accounts' })
  id: number

  @Column({ type: 'int' })
  userId: number

  @Column({ type: 'nvarchar', length: 200 })
  login: string

  @Column({ type: 'datetime2' })
  updatedAt: Date
}

/** صندوق مشترك (زي info@ أو hr@): عنوانه واسمه. مين يفتحه في mail_shared_mailbox_users، وExchange نفسه بيتحقق من صلاحية الموظف عليه */
@Entity('mail_shared_mailboxes')
@Index('UX_mail_shared_mailboxes_address', ['address'], { unique: true })
export class MailSharedMailbox {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_mail_shared_mailboxes' })
  id: number

  // بحروف صغيرة
  @Column({ type: 'nvarchar', length: 200 })
  address: string

  @Column({ type: 'nvarchar', length: 200 })
  name: string

  @Column({ type: 'bit' })
  isActive: boolean

  @Column({ type: 'datetime2' })
  createdAt: Date

  @Column({ type: 'int', nullable: true })
  createdByUserId: number | null

  @Column({ type: 'datetime2' })
  updatedAt: Date

  @Column({ type: 'int', nullable: true })
  updatedByUserId: number | null
}

/** حساب مسموح له يفتح صندوق مشترك من جوه النظام */
@Entity('mail_shared_mailbox_users')
@Index('UX_mail_shared_mailbox_users_pair', ['mailboxId', 'userId'], { unique: true })
export class MailSharedMailboxUser {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_mail_shared_mailbox_users' })
  id: number

  @Column({ type: 'int' })
  mailboxId: number

  @Column({ type: 'int' })
  userId: number

  @Column({ type: 'datetime2' })
  createdAt: Date

  @Column({ type: 'int', nullable: true })
  createdByUserId: number | null
}
