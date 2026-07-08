import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

// ============ الوجهات المالية ============

@Entity('loans')
export class Loan {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ nullable: true })
  requestId: number

  @Index()
  @Column()
  employeeId: number

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number

  @Column({ length: 30 })
  status: string // APPROVED | DISBURSED | SETTLED

  @Column({ type: 'datetime', nullable: true })
  disbursedAt: Date
}

@Entity('loan_installments')
export class LoanInstallment {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column()
  loanId: number

  @Column({ type: 'date' })
  dueDate: string

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number

  @Column({ default: false })
  paid: boolean
}
