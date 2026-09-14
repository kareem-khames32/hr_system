import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm'

// جهات مهام التهيئة — نفس جهات إخلاء الطرف (offboarding) وصلاحياتها
export type OnboardingParty = 'hr' | 'it' | 'custody' | 'finance' | 'manager'
export const ONBOARDING_PARTIES: OnboardingParty[] = [
  'hr',
  'it',
  'custody',
  'finance',
  'manager',
]

// PENDING قيد التنفيذ · DONE تمّت · SKIPPED غير مطلوبة لهذا الموظف (قرار HR)
export type OnboardingTaskStatus = 'PENDING' | 'DONE' | 'SKIPPED'

// قالب قائمة التهيئة — يُنسخ لكل موظف جديد عند أول ظهور له في الشاشة
@Entity('onboarding_template_items')
export class OnboardingTemplateItem {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 200 })
  label: string

  @Column({ length: 20 })
  party: OnboardingParty

  // الموعد = تاريخ الالتحاق + الإزاحة بالأيام (سالب = قبل المباشرة)
  @Column({ type: 'int', default: 0 })
  dueOffsetDays: number

  @Column({ type: 'int', default: 0 })
  sortOrder: number

  // المعطّل لا يُنسخ للموظفين الجدد — والقوائم القائمة لا تتأثر
  @Column({ default: true })
  isActive: boolean

  @CreateDateColumn()
  createdAt: Date
}

// مهام تهيئة موظف بعينه — نسخة من القالب تُتابَع وتُعدَّل مستقلة عنه
@Entity('onboarding_tasks')
export class OnboardingTask {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column()
  employeeId: number

  // بند القالب المصدر (NULL = مهمة أضافتها HR لهذا الموظف)
  @Column({ type: 'int', nullable: true })
  templateItemId: number | null

  @Column({ length: 200 })
  label: string

  @Column({ length: 20 })
  party: OnboardingParty

  @Column({ type: 'date' })
  dueDate: string

  @Column({ type: 'int', default: 0 })
  sortOrder: number

  @Column({ length: 20, default: 'PENDING' })
  status: OnboardingTaskStatus

  @Column({ length: 500, nullable: true })
  note: string

  // من أتمّها أو استبعدها (users.id) — يُمسح عند إعادة الفتح
  @Column({ name: 'doneByUserId', type: 'int', nullable: true })
  doneBy: number | null

  @Column({ type: 'datetime', nullable: true })
  doneAt: Date | null

  @CreateDateColumn()
  createdAt: Date
}
