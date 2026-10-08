import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

// B3.4-أ (ترحيل 106): سطر لكل نقل مرشح من مرحلة لمرحلة. المرحلة الحالية لسه في candidates.stage. نفس الشكل في الترحيل بالحرف (من غير افتراضي).
@Entity('candidate_stage_log')
export class CandidateStageLog {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_candidate_stage_log' })
  id: number

  @Column({ type: 'int' })
  candidateId: number

  @Column({ type: 'nvarchar', length: 20, nullable: true })
  fromStage: string | null

  @Column({ type: 'nvarchar', length: 20 })
  toStage: string

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  reason: string | null

  @Column({ type: 'int' })
  byUserId: number

  @Column({ type: 'datetime2' })
  createdAt: Date
}
