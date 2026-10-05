import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm'

export type ApprovalAction =
  | 'APPROVED'
  | 'REJECTED'
  | 'RETURNED_FOR_INFO'
  | 'DELEGATED'
  | 'ESCALATED'
  // إلغاء آلي من النظام (approverId = 0) — مثلاً أوفرتايم مكتشف لم يعد الحساب يبرره
  | 'CANCELLED'
  // تعذّر تنفيذ مجدول (approverId = 0) — السبب في التعليق، ويُسجَّل مرة لكل سبب جديد
  | 'EXECUTION_FAILED'
  // B2.6: مهمة تنفيذ الطلب اتقفلت (approverId = اللي قفلها) — الإثبات في التعليق
  | 'EXECUTED'

// سجل تدقيق غير قابل للتعديل — لا UPDATE ولا DELETE عليه
@Entity('request_approvals')
export class RequestApproval {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column()
  requestId: number

  @Column()
  step: number

  @Column()
  approverId: number // users.id

  @Column({ length: 30 })
  action: ApprovalAction

  @Column({ length: 1000, nullable: true })
  comment: string

  // B2.6-ب (ترحيل 090): قرار اتاخد بتفويض — المفوِّض اللي الخطوة كانت باسمه (approverId = حساب البديل). برّه القراءة والكتابة العادية:
  // الكود بيشتغل قبل الترحيل، والقراءة والكتابة بـSQL صريح بعد التأكد من وجوده (approval-delegations.ts)
  @Column({ type: 'int', nullable: true, select: false, insert: false, update: false })
  onBehalfOfEmployeeId: number | null

  @CreateDateColumn()
  actedAt: Date
}
