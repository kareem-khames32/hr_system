import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

// B2.4 (ترحيل 087): محرك الإشعارات. نفس الشكل في الترحيل بالحرف (اختبار الترحيل بيقارن الشكل وفرق synchronize).
// القايمة جوه التطبيق لسه بتتبني في PortalController (المحسوب + المخزّن)، وحالة القراءة والحذف في notification_reads زي ما هي.

/** إشعار لمستلم واحد عن حدث واحد. النص هنا هو نص القايمة جوه التطبيق (وسطر الملخص اليومي) */
@Entity('notifications')
@Index('IX_notifications_recipient', ['recipientUserId', 'id'])
@Index('UX_notifications_dedupe', ['dedupeKey'], { unique: true })
export class Notification {
  @PrimaryGeneratedColumn({ type: 'bigint', primaryKeyConstraintName: 'PK_notifications' })
  id: string

  @Column({ type: 'int' })
  recipientUserId: number

  @Column({ type: 'nvarchar', length: 60 })
  eventCode: string

  // فئة التفضيلات: approval | request | payroll …
  @Column({ type: 'nvarchar', length: 30 })
  category: string

  @Column({ type: 'nvarchar', length: 40, nullable: true })
  entityType: string | null

  @Column({ type: 'nvarchar', length: 60, nullable: true })
  entityId: string | null

  // success | error | warning | info — نفس قيم القايمة الحالية
  @Column({ type: 'nvarchar', length: 20 })
  kind: string

  @Column({ type: 'nvarchar', length: 300 })
  title: string

  @Column({ type: 'nvarchar', length: 1000 })
  body: string

  // مسار جوه الواجهة (/my/payslips) — البريد بيكمّله بعنوان الواجهة
  @Column({ type: 'nvarchar', length: 300 })
  link: string

  // بيظهر في قايمة الإشعارات جوه التطبيق؟ (الأحداث اللي ليها عنصر محسوب موجود مابتظهرش مرتين)
  @Column({ type: 'bit' })
  inApp: boolean

  // منع التكرار: نفس الحدث لنفس المستلم مرة واحدة (التسليم «مرة على الأقل»)
  @Column({ type: 'nvarchar', length: 200 })
  dedupeKey: string

  @Column({ type: 'datetime2' })
  createdAt: Date
}

/** سجل توصيل الإشعار على قناة واحدة */
@Entity('notification_deliveries')
@Index('UX_notification_deliveries_channel', ['notificationId', 'channel'], { unique: true })
@Index('IX_notification_deliveries_status', ['status', 'id'])
export class NotificationDelivery {
  @PrimaryGeneratedColumn({ type: 'bigint', primaryKeyConstraintName: 'PK_notification_deliveries' })
  id: string

  @Column({ type: 'bigint' })
  notificationId: string

  // IN_APP | EMAIL
  @Column({ type: 'nvarchar', length: 20 })
  channel: string

  // PENDING | SENT | FAILED | SKIPPED | DIGEST
  @Column({ type: 'nvarchar', length: 20 })
  status: string

  @Column({ type: 'int' })
  attempts: number

  // عنوان المستلم متخفي (a***@example.com) — العنوان الحقيقي بيتقري من الحساب وقت الإرسال
  @Column({ type: 'nvarchar', length: 200, nullable: true })
  address: string | null

  // نص البريد زي ما اتجهّز (من غير مبالغ ولا محتوى طلب)
  @Column({ type: 'nvarchar', length: 300, nullable: true })
  subject: string | null

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  body: string | null

  // سبب التخطّي أو آخر خطأ
  @Column({ type: 'nvarchar', length: 1000, nullable: true })
  detail: string | null

  @Column({ type: 'datetime2' })
  createdAt: Date

  @Column({ type: 'datetime2', nullable: true })
  sentAt: Date | null
}

/** نص قالب معدَّل (الصف موجود = النص اتعدّل؛ من غيره النص الافتراضي في notification-events.ts) */
@Entity('notification_templates')
@Index('UX_notification_templates_key', ['eventCode', 'channel', 'language'], { unique: true })
export class NotificationTemplate {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_notification_templates' })
  id: number

  @Column({ type: 'nvarchar', length: 60 })
  eventCode: string

  @Column({ type: 'nvarchar', length: 20 })
  channel: string

  @Column({ type: 'nvarchar', length: 5 })
  language: string

  @Column({ type: 'nvarchar', length: 300 })
  title: string

  @Column({ type: 'nvarchar', length: 2000 })
  body: string

  @Column({ type: 'datetime2' })
  updatedAt: Date

  @Column({ type: 'int', nullable: true })
  updatedByUserId: number | null
}

/** اختيار المستخدم لفئة وقناة: ON | OFF | DIGEST (الملخص اليومي للبريد بس). من غير صف = ON */
@Entity('notification_preferences')
@Index('UX_notification_preferences_key', ['userId', 'category', 'channel'], { unique: true })
export class NotificationPreference {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_notification_preferences' })
  id: number

  @Column({ type: 'int' })
  userId: number

  @Column({ type: 'nvarchar', length: 30 })
  category: string

  @Column({ type: 'nvarchar', length: 20 })
  channel: string

  @Column({ type: 'nvarchar', length: 10 })
  mode: string

  @Column({ type: 'datetime2' })
  updatedAt: Date
}
