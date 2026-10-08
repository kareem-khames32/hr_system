import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

// B3.9-ج (ترحيلي 120 و121): ميزانية تدريب الأقسام، والتدريب الإلزامي. نفس الشكل في الترحيلات بالحرف (من غير افتراضي).

@Entity('training_plans')
export class TrainingPlan {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_training_plans' })
  id: number

  @Column({ type: 'int' })
  year: number

  @Column({ type: 'int' })
  departmentId: number

  // للتقرير بس — مالهاش قيد مالي
  @Column({ type: 'decimal', precision: 18, scale: 2 })
  budget: string

  @Column({ type: 'int' })
  updatedByUserId: number

  @Column({ type: 'datetime2' })
  updatedAt: Date
}

@Entity('training_requirements')
export class TrainingRequirement {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_training_requirements' })
  id: number

  @Column({ type: 'int' })
  courseId: number

  // إلزامية للمسمى ده، أو للقسم ده، أو للاتنين مع بعض
  @Column({ type: 'nvarchar', length: 200, nullable: true })
  jobTitle: string | null

  @Column({ type: 'int', nullable: true })
  departmentId: number | null

  @Column({ type: 'int' })
  createdByUserId: number

  @Column({ type: 'datetime2' })
  createdAt: Date
}
