import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

// الأدوار = حزم صلاحيات — المدمجة (isSystem) تتعدل صلاحياتها ولا تُحذف،
// والمخصوصة تُنشأ من شاشة الأدوار
@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn()
  id: number

  @Index({ unique: true })
  @Column({ length: 50 })
  code: string // super_admin | hr_manager | ... | أكواد مخصوصة

  @Column({ length: 100 })
  nameAr: string

  // JSON: ["employees.view", ...] — أو ["*"] لمدير النظام
  @Column({ type: 'nvarchar', length: 'MAX' })
  permissions: string

  @Column({ default: false })
  isSystem: boolean

  @Column({ default: true })
  isActive: boolean
}

// تجاوزات لكل مستخدم فوق دوره: GRANT يضيف، REVOKE يشيل
@Entity('user_permission_overrides')
@Index(['userId', 'permission'], { unique: true })
export class UserPermissionOverride {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column()
  userId: number

  @Column({ length: 100 })
  permission: string

  @Column({ length: 10 })
  effect: 'GRANT' | 'REVOKE'
}
