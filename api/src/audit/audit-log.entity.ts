import { Check, Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

// B2.1 (ترحيل 084): سجل التدقيق المركزي — إضافة بس. التريجر TR_audit_log_append_only في الترحيل بيرفض أي تعديل أو مسح،
// والتطبيق مابيعدّلش ولا بيمسح صف أبدًا (الاحتفاظ بيخفي القديم من البحث العادي بس).
@Entity('audit_log')
@Index('IX_audit_log_at', ['at'])
@Index('IX_audit_log_category_at', ['category', 'at'])
@Index('IX_audit_log_entity', ['entityType', 'entityId'])
@Index('IX_audit_log_actor_at', ['actorUserId', 'at'])
@Check('CK_audit_log_before_json', '[before] IS NULL OR ISJSON([before]) = 1')
@Check('CK_audit_log_after_json', '[after] IS NULL OR ISJSON([after]) = 1')
export class AuditLog {
  @PrimaryGeneratedColumn({ type: 'bigint', primaryKeyConstraintName: 'PK_audit_log' })
  id: string

  // وقت الحدث بساعة التطبيق (نفس ساعة باقي الشاشات)
  @Column({ type: 'datetime2' })
  at: Date

  // LOGIN | PERMISSIONS | SETTINGS | BANK_PAYROLL | EXPORT | PAYROLL
  @Column({ type: 'nvarchar', length: 20 })
  category: string

  @Column({ type: 'nvarchar', length: 60 })
  action: string

  @Column({ type: 'nvarchar', length: 40, nullable: true })
  entityType: string | null

  @Column({ type: 'nvarchar', length: 60, nullable: true })
  entityId: string | null

  @Column({ type: 'int', nullable: true })
  actorUserId: number | null

  // فرع الحدث (للبحث بنطاق الحساب). NULL = على مستوى الشركة: للي نطاقه «كل الفروع» بس
  @Column({ type: 'int', nullable: true })
  branchId: number | null

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  summary: string | null

  // قبل وبعد للحقول الحساسة (JSON) — البنكية متخفية
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  before: string | null

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  after: string | null

  @Column({ type: 'nvarchar', length: 64, nullable: true })
  ip: string | null

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  userAgent: string | null
}
