import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

// B-ADD.5 (ترحيل 187): قنوات الإشعارات. نفس الشكل في الترحيل بالحرف (اختبار الترحيل بيقارن الشكل وفرق synchronize).

/** إعداد قناة على مستوى الشركة: صف للبريد (خادم SMTP) وصف للواتساب (مزوّد Meta). من غير صف = القناة بإعدادها الحالي (البريد من api/.env، والواتساب مقفول) */
@Entity('notification_channel_settings')
@Index('UX_notification_channel_settings_channel', ['channel'], { unique: true })
export class NotificationChannelSetting {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_notification_channel_settings' })
  id: number

  // EMAIL | WHATSAPP
  @Column({ type: 'nvarchar', length: 20 })
  channel: string

  // البريد: الإعداد المحفوظ هو اللي شغال (بدل api/.env). الواتساب: القناة مفتوحة
  @Column({ type: 'bit' })
  enabled: boolean

  // JSON من غير أسرار (الخادم والمنفذ والمرسل، أو معرّفات Meta)
  @Column({ type: 'nvarchar', length: 'MAX' })
  config: string

  // كلمة سر البريد أو توكن الواتساب مختوم (AES-256-GCM بمفتاح مشتق من سر الخادم) — مابيرجعش في أي رد
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  secret: string | null

  @Column({ type: 'datetime2' })
  updatedAt: Date

  @Column({ type: 'int', nullable: true })
  updatedByUserId: number | null
}

/** قاعدة حدث: أنهي قنوات مفتوحة له، وهل هو إلزامي، وقالب الواتساب المربوط بيه. من غير صف = السلوك الافتراضي (DEFAULT_EVENT_RULE) */
@Entity('notification_event_rules')
@Index('UX_notification_event_rules_event', ['eventCode'], { unique: true })
export class NotificationEventRule {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_notification_event_rules' })
  id: number

  @Column({ type: 'nvarchar', length: 60 })
  eventCode: string

  @Column({ type: 'bit' })
  inApp: boolean

  @Column({ type: 'bit' })
  email: boolean

  @Column({ type: 'bit' })
  whatsapp: boolean

  // إلزامي: اختيار المستخدم «مقفول» أو «ملخص يومي» مابيتطبقش على الحدث ده
  @Column({ type: 'bit' })
  mandatory: boolean

  // JSON: ربط قالب Meta لكل لغة { ar: { templateName, languageCode, variables }, en: … }
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  whatsappTemplates: string | null

  @Column({ type: 'datetime2' })
  updatedAt: Date

  @Column({ type: 'int', nullable: true })
  updatedByUserId: number | null
}

/** رقم واتساب الموظف (E.164 أرقام بس). جدول لوحده مش عمود في employees: الكود شغال قبل الترحيل من غير ما قراءة ملف الموظف تتأثر */
@Entity('employee_whatsapp_numbers')
@Index('UX_employee_whatsapp_numbers_employee', ['employeeId'], { unique: true })
export class EmployeeWhatsappNumber {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_employee_whatsapp_numbers' })
  id: number

  @Column({ type: 'int' })
  employeeId: number

  @Column({ type: 'nvarchar', length: 20 })
  number: string

  @Column({ type: 'datetime2' })
  updatedAt: Date

  @Column({ type: 'int', nullable: true })
  updatedByUserId: number | null
}
