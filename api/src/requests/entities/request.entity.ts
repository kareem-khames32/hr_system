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

  @Index()
  @Column()
  requesterId: number // employees.id

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
