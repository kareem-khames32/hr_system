import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

// ============ معادلات الرواتب: شرائح التأخير ============
// شريحة تأخير: مدى دقائق التأخير (بعد تجاوز السماح) → خصم إما كسر من اليوم
// (ربع/نصف/يوم) أو بالوقت الفعلي بالدقيقة. تُطبَّق لكل يوم متأخر على حدة.
export type LatenessTierMode = 'FRACTION' | 'MINUTES'

@Entity('lateness_tiers')
export class LatenessTier {
  @PrimaryGeneratedColumn()
  id: number

  // من دقيقة تأخير (شامل) — التأخير الإجمالي المسجَّل على اليوم
  @Column()
  fromMinutes: number

  // إلى دقيقة تأخير (شامل) — null = ما لا نهاية
  @Column({ nullable: true })
  toMinutes: number

  // FRACTION: خصم value × قيمة اليوم (0.25/0.5/1)
  // MINUTES: خصم دقائق التأخير الفعلية × قيمة الدقيقة (value يُتجاهَل)
  @Column({ length: 10, default: 'FRACTION' })
  mode: LatenessTierMode

  @Column({ type: 'decimal', precision: 6, scale: 3, default: 0 })
  value: number

  @Column({ default: true })
  isActive: boolean

  @Column({ length: 200, nullable: true })
  label: string
}
