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
