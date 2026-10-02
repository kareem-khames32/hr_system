import { Check, Column, Entity, Index, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm'

/**
 * حالة تفعيل الموديولات (ترحيل 076 — خطة التنفيذ B0.2). صف لكل موديول اتغيّرت حالته أو اتزرع في البيانات الأولية؛
 * الموديول اللي مالوش صف = قيمته الافتراضية في السجل (api/src/modules-registry/registry.ts)، فمفيش حاجة شغالة بتتقفل لوحدها.
 * القفل مابيمسحش بيانات: جداول الموديول وبياناته زي ما هي، والتفعيل تاني بيرجّع كل حاجة من غير ترحيل.
 *
 * أسماء المفتاح والقيد صريحة (مش hash) عشان الترحيل يطابقها بالحرف وفرق المخطط يفضل صفرًا.
 * مفيش قيمة افتراضية لأي عمود في الجداول التلاتة: الخدمة بتكتب كل الأعمدة.
 */
@Entity('system_modules')
@Check('CK_system_modules_audience_json', '[audience] IS NULL OR ISJSON([audience]) = 1')
export class SystemModule {
  // مفتاح الموديول في السجل (recruitment، payroll…)
  @PrimaryColumn({ type: 'nvarchar', length: 60, primaryKeyConstraintName: 'PK_system_modules' })
  key: string

  @Column({ type: 'bit' })
  enabled: boolean

  // آخر تغيير للحالة: إمتى ومين (users.id) — NULL للصفوف المزروعة بالترحيل
  @Column({ type: 'datetime2', nullable: true })
  enabledAt: Date | null

  @Column({ type: 'int', nullable: true })
  enabledBy: number | null

  // جمهور التفعيل (اختياري) بنفس شكل «مين + فين» في أنواع الطلبات: الموديول مفعّل للجمهور ده بس. NULL = لكل الشركة
  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  audience: string | null
}

/** حالة المزايا الفرعية: صف لكل ميزة اتغيّرت عن افتراضيها في السجل. */
@Entity('system_module_features')
export class SystemModuleFeature {
  // مفتاح الميزة في السجل (platform.demo_screens…)
  @PrimaryColumn({ type: 'nvarchar', length: 100, primaryKeyConstraintName: 'PK_system_module_features' })
  key: string

  @Column({ type: 'bit' })
  enabled: boolean

  @Column({ type: 'datetime2', nullable: true })
  updatedAt: Date | null

  @Column({ type: 'int', nullable: true })
  updatedBy: number | null
}

/**
 * سجل تغييرات الموديولات والمزايا (مين فتح أو قفل إيه وإمتى) — إضافة بس، مابيتعدلش ولا يتمسح.
 * سجل مبدئي لحد ما سجل التدقيق المركزي ينزل (B2.1) وياخده.
 */
@Entity('system_module_events')
@Index('IX_system_module_events_key', ['key', 'id'])
export class SystemModuleEvent {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_system_module_events' })
  id: number

  // module = تفعيل/قفل/جمهور موديول · feature = ميزة فرعية · preset = تطبيق باقة
  @Column({ type: 'nvarchar', length: 20 })
  kind: string

  // مفتاح الموديول أو الميزة أو الباقة
  @Column({ type: 'nvarchar', length: 100 })
  key: string

  // الحالة بعد التغيير (NULL لتطبيق الباقة نفسه — موديولاتها ليها صفوفها — ولتغيير جمهور الموديول من غير فتح أو قفل)
  @Column({ type: 'bit', nullable: true })
  enabled: boolean | null

  // جمهور التفعيل بعد التغيير (JSON) — للموديول بس
  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  audience: string | null

  // الحساب اللي غيّر (users.id)
  @Column({ type: 'int' })
  byUserId: number

  @Column({ type: 'datetime2' })
  at: Date
}
