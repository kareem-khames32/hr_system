import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

// القيم القانونية المؤرخة (خطة التنفيذ B1.5 — ترحيل 080، وبنفس شكل «حزمة الدولة» B4.2 عشان تتنقل لها من غير تحويل):
// تعريف لكل (دولة، مفتاح، ساري من) — وصفوفه كود وقيمة. القراءة بقاعدة التاريخ الفعّال: التعريف الساري في آخر يوم في فترة المسير.
// الأسماء صريحة مطابقة للترحيل عشان فرق المخطط يبقى صفر.
@Entity('statutory_definitions')
@Index('UX_statutory_definitions_key', ['country', 'key', 'effectiveFrom'], { unique: true })
export class StatutoryDefinition {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_statutory_definitions' })
  id: number

  /** SA | EG */
  @Column({ type: 'nvarchar', length: 2 })
  country: string

  @Column({ type: 'nvarchar', length: 80 })
  key: string

  @Column({ type: 'date' })
  effectiveFrom: string

  /** القيمة اتأكدت من محاسب أو من الجهة نفسها؟ (البيانات الأولية من مصادر ثانوية = لأ) */
  @Column({ type: 'bit', default: false })
  verified: boolean

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  source: string | null
}

@Entity('statutory_values')
@Index('UX_statutory_values_code', ['definitionId', 'code'], { unique: true })
export class StatutoryValue {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_statutory_values' })
  id: number

  @Column({ type: 'int' })
  definitionId: number

  @Column({ type: 'nvarchar', length: 60 })
  code: string

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  value: string
}
