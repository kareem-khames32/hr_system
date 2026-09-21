import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

// الأدوار الأساسية — تتوسع لاحقاً بجدول roles/permissions الكامل
export type UserRole = 'super_admin' | 'hr_manager' | 'branch_manager' | 'employee'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number

  @Index({ unique: true })
  @Column({ length: 200 })
  email: string

  @Column({ length: 200 })
  passwordHash: string

  @Column({ length: 200 })
  displayName: string

  @Column({ length: 30, default: 'employee' })
  role: UserRole

  // نطاق الفرع: super_admin يرى الكل — غيره مقفول على فرعه
  @Column({ nullable: true })
  branchId: number

  // «نطاقه: فرعه / كل الفروع» (قرار المالك 22 سبتمبر): لما يتفتح، branchScopeOf بيرجّع null للحساب ده فيشوف كل
  // الفروع ويعدّل إعدادات الشركة — بشرط الصلاحية المحددة لكل فعل (النطاق مش صلاحية). مايفتحوش ولا يقفلوش غير
  // مدير النظام، وراكب في التوكن: أي تغيير له بيزوّد tokenVersion. branchId بيفضل «الفرع الأصلي» للحساب.
  @Column({ default: false })
  scopeAllBranches: boolean

  // ربط الحساب بالموظف
  @Column({ nullable: true })
  employeeId: number

  // صلاحيات إضافية فوق الدور — JSON مثل ["finance","custody_officer"]
  // تمنح المستخدم قدرات دور آخر في الاعتمادات والمسارات المحمية
  @Column({ type: 'nvarchar', length: 500, nullable: true })
  permissions: string

  @Column({ default: true })
  isActive: boolean

  // إصدار التوكن — يُزاد عند تغيير الدور/الصلاحيات أو التعطيل ليُبطِل فوراً كل
  // توكن قديم (بدل انتظار انتهاء الصلاحية 8 ساعات)
  @Column({ default: 0 })
  tokenVersion: number

  @Column({ type: 'datetime', nullable: true })
  lastLoginAt: Date

  // كلمة مرور مؤقتة عيّنها المدير: بعد الدخول الصح لازم صاحب الحساب يغيّرها قبل ما يستخدم النظام.
  // select: false — مش بتتقري إلا صراحةً (الدخول وشاشة المستخدمين)، فباقي النظام مايتأثرش بيها
  @Column({ default: false, select: false })
  mustChangePassword: boolean

  // آخر مرة اتعيّنت فيها كلمة المرور على النظام ده (المدير أو صاحب الحساب) — null = لسه ما اتعيّنتش هنا
  // (الحسابات المنقولة من القديم جات بكلمة غير قابلة للاستخدام: null + علامة المستورد = «محتاج باسورد»)
  @Column({ type: 'datetime', nullable: true, select: false })
  passwordChangedAt: Date | null
}
