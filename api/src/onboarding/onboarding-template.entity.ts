import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

// B3.1-أ (ترحيل 103): قالب تهيئة بنطاق — لفرع و/أو مسمى و/أو درجة و/أو نوع تعاقد (الخانة الفاضية = أي قيمة). بنوده في
// onboarding_template_items بعمود templateId، والقالب العام (بنود من غير قالب) هو الافتراضي. نفس الشكل في الترحيل بالحرف.
@Entity('onboarding_templates')
export class OnboardingTemplate {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_onboarding_templates' })
  id: number

  @Column({ type: 'nvarchar', length: 150 })
  name: string

  @Column({ type: 'int', nullable: true })
  branchId: number | null

  // المسمى بنصه زي ما هو في ملف الموظف (employees.jobTitle نص حر)
  @Column({ type: 'nvarchar', length: 100, nullable: true })
  jobTitle: string | null

  @Column({ type: 'int', nullable: true })
  gradeId: number | null

  @Column({ type: 'nvarchar', length: 30, nullable: true })
  contractType: string | null

  // المعطّل مابيتختارش لموظف جديد — والقوايم القايمة مابتتغيّرش
  @Column({ type: 'bit' })
  isActive: boolean

  @Column({ type: 'datetime2' })
  createdAt: Date
}
