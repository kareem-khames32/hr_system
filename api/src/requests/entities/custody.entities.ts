import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm'

// ============ وجهة العهدة والأصول ============

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

  // مين ماسك الأصل دلوقتي
  @Column({ nullable: true })
  currentHolderId: number
}

export type CustodyStatus =
  | 'PENDING_ACK'
  | 'ACTIVE'
  | 'RETURN_REQUESTED'
  | 'RETURNED'
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

  @CreateDateColumn()
  assignedAt: Date

  // تأكيد الاستلام = السجل الملزِم قانونياً
  @Column({ type: 'datetime', nullable: true })
  acknowledgedAt: Date

  @Column({ type: 'datetime', nullable: true })
  returnedAt: Date

  // الحالة عند الإرجاع
  @Column({ length: 100, nullable: true })
  condition: string

  @Column({ length: 30, default: 'PENDING_ACK' })
  status: CustodyStatus
}
