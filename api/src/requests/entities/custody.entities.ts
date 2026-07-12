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
export type CustodyStatus =
  | 'PENDING_ACK'
  | 'PENDING_MANAGER_CONFIRM'
  | 'ACTIVE'
  | 'RETURN_REQUESTED'
  | 'RETURNED'
  | 'TRANSFERRED' // نُقلت لموظف آخر — عهدة جديدة فُتحت للمستلم
  | 'LOST'
  | 'DAMAGED'

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
  @Column({ nullable: true })
  assignedBy: number

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

  @Column({ length: 30, default: 'PENDING_ACK' })
  status: CustodyStatus
}
