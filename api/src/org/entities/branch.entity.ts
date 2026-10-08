import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Department } from './department.entity'

@Entity('branches')
export class Branch {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 200 })
  name: string

  @Column({ length: 200, nullable: true })
  nameEn: string

  @Column({ length: 50, unique: true })
  code: string

  @Column({ length: 100, nullable: true })
  city: string

  @Column({ length: 500, nullable: true })
  address: string

  @Column({ length: 50, nullable: true })
  phone: string

  @Column({ length: 200, nullable: true })
  email: string

  // المدير المُسنَد — يُستخدم في دورات الاعتماد وصلاحيات الفرع
  @Column({ nullable: true })
  managerEmployeeId: number

  // مركز التكلفة — تُحمَّل عليه رواتب الفرع
  @Column({ length: 50, nullable: true })
  costCenter: string

  // تجاوز العطلة الأسبوعية لهذا الفرع (SUN..SAT بفواصل) — فارغ = إعداد النظام
  @Column({ length: 30, nullable: true })
  weekendDays: string

  // دولة الفرع (رمز مثل EG/SA) — تسري عليه العطلات الرسمية لدولته فقط؛
  // فارغ = كل العطلات (السلوك السابق)
  @Column({ length: 5, nullable: true })
  country: string

  // نظام التأمينات الاجتماعية للفرع: NONE (بدون) / SAUDI (التأمينات السعودية) / EGYPTIAN (التأمينات المصرية)
  @Column({ length: 20, default: 'NONE' })
  insuranceSystem: string

  // B4.1 (ترحيل 134): كيان الفرع القانوني (legal_entities.id). برّه الكيان للقراءة والكتابة: org/legal-entities.service.ts
  @Column({ type: 'int', nullable: true, select: false, insert: false, update: false })
  legalEntityId?: number | null

  @Column({ default: true })
  isActive: boolean

  @Column({ default: false })
  isHeadquarters: boolean

  @OneToMany(() => Department, (d) => d.branch)
  departments: Department[]
}
