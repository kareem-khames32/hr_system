import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm'

// ===== State Machine الموحّدة لكل الطلبات (9 حالات) =====
export type RequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'IN_EXECUTION'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'RETURNED_FOR_INFO'

@Entity('requests')
export class Request {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column({ length: 50 })
  typeCode: string

  // Original request profile remains authoritative for audience, custom fields,
  // handler and approval chains after a legacy LEAVE_* becomes canonical LEAVE.
  @Column({ type: String, length: 50, nullable: true })
  definitionCode: string | null

  @Index()
  @Column()
  requesterId: number // employees.id — صاحب الطلب الفعلي

  // مين أنشأ الطلب (users.id) — يختلف عن الطالب في «نيابة عن الغير»
  @Column({ nullable: true })
  createdByUserId: number

  @Index()
  @Column({ nullable: true })
  branchId: number

  @Column({ length: 30, default: 'DRAFT' })
  status: RequestStatus

  // الخطوة الحالية في سلسلة الاعتماد (stepOrder)
  @Column({ nullable: true })
  currentStep: number

  // JSON: حقول الطلب حسب نوعه
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  payload: string

  // مرجع السجل الدائم بعد التنفيذ (LN-2026-014...) — القاعدة الذهبية
  @Column({ length: 200, nullable: true })
  destinationRef: string

  // الخطوات المفعّلة بعد حل الشروط عند التقديم: JSON [{stepOrder, role, approverEmployeeId, dueAt}]
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  resolvedSteps: string

  @CreateDateColumn()
  createdAt: Date

  @Column({ type: 'datetime', nullable: true })
  submittedAt: Date

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date
}
