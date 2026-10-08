import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

// B6.3 (أ) — ترحيل 183: مفاتيح التكامل. المفتاح نفسه مابيتخزنش: بصمته (SHA-256) وبادئته بس.

@Entity('integration_keys')
export class IntegrationKey {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_integration_keys' })
  id: number

  @Column({ type: 'nvarchar', length: 120 })
  name: string

  /** أول 8 خانات من المفتاح — للبحث وللعرض في الشاشة */
  @Column({ type: 'nvarchar', length: 12 })
  keyPrefix: string

  /** SHA-256 للمفتاح كله (64 خانة hex) */
  @Column({ type: 'nvarchar', length: 64 })
  keyHash: string

  /** JSON لقايمة نطاقات القراءة */
  @Column({ type: 'nvarchar', length: 400 })
  scopes: string

  /** JSON لأرقام الفروع — الفاضي = كل الفروع */
  @Column({ type: 'nvarchar', length: 400, nullable: true })
  branchIds: string | null

  @Column({ type: 'bit' })
  isActive: boolean

  @Column({ type: 'int' })
  createdByUserId: number

  @Column({ type: 'datetime2' })
  createdAt: Date

  @Column({ type: 'datetime2', nullable: true })
  lastUsedAt: Date | null

  @Column({ type: 'int', nullable: true })
  revokedByUserId: number | null

  @Column({ type: 'datetime2', nullable: true })
  revokedAt: Date | null
}

// B6.3 (ج) — ترحيل 184: نقاط استقبال الـwebhooks. سر التوقيع مختوم (AES-256-GCM بمفتاح مشتق من سر الخادم).
@Entity('webhook_endpoints')
export class WebhookEndpoint {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_webhook_endpoints' })
  id: number

  @Column({ type: 'nvarchar', length: 120 })
  name: string

  @Column({ type: 'nvarchar', length: 500 })
  url: string

  /** سر التوقيع مختوم — بيتعرض مرة واحدة وقت الإنشاء */
  @Column({ type: 'nvarchar', length: 300 })
  secret: string

  /** JSON لأسماء الأحداث المشترك فيها */
  @Column({ type: 'nvarchar', length: 400 })
  events: string

  /** JSON لأرقام الفروع — الفاضي = كل الفروع */
  @Column({ type: 'nvarchar', length: 400, nullable: true })
  branchIds: string | null

  @Column({ type: 'bit' })
  isActive: boolean

  @Column({ type: 'int' })
  createdByUserId: number

  @Column({ type: 'datetime2' })
  createdAt: Date

  /** نتيجة آخر محاولة إرسال (HTTP 200 / HTTP 500 / UNREACHABLE…) */
  @Column({ type: 'nvarchar', length: 40, nullable: true })
  lastStatus: string | null

  @Column({ type: 'datetime2', nullable: true })
  lastAttemptAt: Date | null

  /** محاولات فاشلة ورا بعض (بتتصفّر مع أول نجاح) */
  @Column({ type: 'int' })
  failures: number
}
