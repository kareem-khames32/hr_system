import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

// حالة الإشعار لكل مستخدم (مقروء/محذوف من قائمته) — الإشعارات نفسها مشتقة من
// الأحداث بلا جدول، فالمحفوظ هنا مفتاحها (id في GET /notifications) فقط.
// الإشعار المجمّع (عدّاد مثل «موافقات بانتظارك») يحفظ عناصره وقت القراءة/الحذف:
// ظهور عنصر جديد بعدها يرجّعه غير مقروء ويُظهره ثانيةً لو كان محذوفاً
@Entity('notification_reads')
@Index(['userId', 'notificationId'], { unique: true })
export class NotificationRead {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  userId: number

  @Column({ length: 150 })
  notificationId: string

  @Column({ type: 'datetime' })
  readAt: Date

  // null = ظاهر في قائمة المستخدم
  @Column({ type: 'datetime', nullable: true })
  dismissedAt: Date | null

  // عناصر الإشعار المجمّع لحظة القراءة (JSON مصفوفة مفاتيح) — null للإشعار المفرد
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  seenKeys: string | null
}
