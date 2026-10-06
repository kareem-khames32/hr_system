import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

// B2.9 الجزء ب (ترحيل 094): الحقول المخصصة على ملف الموظف. نفس الشكل في الترحيل بالحرف.

/** تعريف حقل: مفتاحه ونوعه مابيتغيّروش بعد إنشائه، والحقل مابيتمسحش (بيتعطّل وقيمه بتفضل) */
@Entity('employee_custom_fields')
@Index('UX_employee_custom_fields_key', ['fieldKey'], { unique: true })
export class EmployeeCustomField {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_employee_custom_fields' })
  id: number

  @Column({ type: 'nvarchar', length: 40 })
  fieldKey: string

  @Column({ type: 'nvarchar', length: 100 })
  label: string

  // TEXT | NUMBER | DATE | CHOICE | YESNO
  @Column({ type: 'nvarchar', length: 10 })
  type: string

  // اختيارات القايمة (JSON: نصوص) — لنوع CHOICE بس
  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  options: string | null

  @Column({ type: 'bit' })
  required: boolean

  // مقيّد: قيمته للي يعدّل ملف الموظف بس (الموظف نفسه واللي بيعرض الملف مايشوفوهاش)
  @Column({ type: 'bit' })
  restricted: boolean

  @Column({ type: 'int' })
  sortOrder: number

  @Column({ type: 'bit' })
  isActive: boolean

  @Column({ type: 'datetime2' })
  createdAt: Date
}

/** قيمة موظف في حقل: عمود واحد حسب نوع الحقل (النص والاختيار textValue، الرقم ونعم/لا numberValue، التاريخ dateValue) */
@Entity('employee_custom_values')
@Index('UX_employee_custom_values_employee_field', ['employeeId', 'fieldId'], { unique: true })
export class EmployeeCustomValue {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_employee_custom_values' })
  id: number

  @Column({ type: 'int' })
  employeeId: number

  @Column({ type: 'int' })
  fieldId: number

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  textValue: string | null

  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
  numberValue: string | number | null

  @Column({ type: 'date', nullable: true })
  dateValue: string | null

  @Column({ type: 'datetime2' })
  updatedAt: Date

  @Column({ type: 'int', nullable: true })
  updatedByUserId: number | null
}
