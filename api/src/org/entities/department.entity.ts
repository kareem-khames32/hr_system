import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Branch } from './branch.entity'
import { Team } from './team.entity'

// نوع الوحدة في شجرة الأقسام (قرار المالك 27 سبتمبر: الهيكل «الإدارة ← القسم ← الفريق»). الإدارة نوع على نفس الشجرة
// مش جدول جديد، فأي حاجة بتختار قسم بأقسامه الفرعية (فلاتر المسير، جمهور العطلات، الخصومات) بتشتغل على الإدارة زي ما هي.
// القيم بتتفحص في الكود (org.dto وorg.service) من غير قيد CHECK — عشان المخطط يطابق بيانات الكيان (ترحيل 072)
export const DEPARTMENT_UNIT_TYPES = ['ADMINISTRATION', 'DEPARTMENT'] as const
export type DepartmentUnitType = (typeof DEPARTMENT_UNIT_TYPES)[number]
export const UNIT_TYPE_MESSAGE = 'نوع الوحدة لازم يكون «إدارة» (ADMINISTRATION) أو «قسم» (DEPARTMENT)'

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 200 })
  name: string

  @Column({ length: 200, nullable: true })
  nameEn: string

  @Column({ length: 50, nullable: true })
  code: string

  // هرمي — قسم أب من نفس الفرع، أو «الإدارة التنفيذية» من أي فرع (فوق كل الفروع — org.service وorg/department-tree)
  @Column({ nullable: true })
  parentId: number

  // «إدارة» أو «قسم»: الإدارة رئيسية أو تحت الإدارة التنفيذية بس، والقسم تحت إدارة من فرعه أو الإدارة التنفيذية أو قسم من فرعه
  // (قسم فرعي). الإدارة التنفيذية نوعها «إدارة» دايمًا — قواعد org.service. الأقسام القائمة «قسم» بالقيمة الافتراضية.
  // type صريح: نوع الاتحاد بيوصل للـreflection كـObject تحت ts-node (transpileOnly) — nvarchar(20) نفس ترحيل 072 بالحرف
  @Column({ type: 'nvarchar', length: 20, default: 'DEPARTMENT' })
  unitType: DepartmentUnitType

  // رئيس القسم — يُستخدم في سلاسل الاعتماد
  @Column({ nullable: true })
  managerEmployeeId: number

  @Column()
  branchId: number

  @ManyToOne(() => Branch, (b) => b.departments)
  @JoinColumn({ name: 'branchId' })
  branch: Branch

  @Column({ default: true })
  isActive: boolean

  // الهيكل التنظيمي: قسم واحد بس في الشركة «الإدارة التنفيذية» — مديره الرئيس التنفيذي
  @Column({ default: false })
  isExecutive: boolean

  // السكرتير التنفيذي: تابع للرئيس التنفيذي بس (مش مدير لحد) — معنى له مع الإدارة التنفيذية فقط
  @Column({ type: 'int', nullable: true })
  executiveSecretaryEmployeeId: number | null

  @OneToMany(() => Team, (t) => t.department)
  teams: Team[]
}
