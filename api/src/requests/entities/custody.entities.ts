import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm'

// ============ وجهة العهدة والأصول ============

// حالة الأصل في المخزون: متاح → مُسنَد → متقاعد (تالف/مفقود/مستهلك)
export type AssetStatus = 'AVAILABLE' | 'ASSIGNED' | 'RETIRED'

@Entity('assets')
export class Asset {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 200 })
  name: string

  @Column({ length: 100 })
  category: string

  @Column({ length: 100, nullable: true })
  serialNumber: string

  // قيمة الأصل (اختيارية) — تغذي خصم «عهدة لم تُرجَع» في التصفية
  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  value: number

  @Column({ length: 20, default: 'AVAILABLE' })
  status: AssetStatus

  // مين ماسك الأصل دلوقتي
  @Column({ nullable: true })
  currentHolderId: number
}

// الدورة: PENDING_ACK (بانتظار تأكيد الموظف) → PENDING_MANAGER_CONFIRM
// (بانتظار اعتماد المدير المباشر) → ACTIVE (ملزِم قانونياً) → RETURNED
import type { CustodyStatus } from '../../common/domain-status'
export type { CustodyStatus } from '../../common/domain-status'

@Entity('custody_assignments')
export class CustodyAssignment {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ nullable: true })
  requestId: number

  @Index()
  @Column()
  assetId: number

  @Index()
  @Column()
  employeeId: number

  // مين أسند العهدة (employees.id)
  @Column({ name: 'assignedByEmployeeId', nullable: true })
  assignedBy: number

  toJSON() { return { ...this, assignedByEmployeeId: this.assignedBy ?? null } }

  @CreateDateColumn()
  assignedAt: Date

  // تأكيد الموظف بالاستلام
  @Column({ type: 'datetime', nullable: true })
  acknowledgedAt: Date

  // اعتماد المدير المباشر — بعده تصبح ملزِمة (ACTIVE)
  @Column({ type: 'datetime', nullable: true })
  managerConfirmAt: Date

  @Column({ type: 'datetime', nullable: true })
  returnedAt: Date

  // الحالة عند الإرجاع
  @Column({ length: 100, nullable: true })
  condition: string

  @Column({ type: String, length: 30, default: 'PENDING_ACK' })
  status: CustodyStatus
}


