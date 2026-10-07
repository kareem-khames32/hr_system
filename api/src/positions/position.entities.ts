import { Column, Entity, Index, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm'

// B2.11: الوظائف المعتمدة (موديول positions، اختياري ومقفول افتراضيًا) — ترحيل 097.
//  positions: وظيفة في وحدة (فرع، وقسم وفريق اختياريين) بعدد معتمد — مش صف لكل كرسي. المسمى والدرجة ومركز التكلفة بأرقامهم من الكتالوج.
//  position_holders: ربط الموظف بوظيفته (موظف واحد = وظيفة واحدة). في جدوله مش عمود على employees: كيان الموظف بيتقري في كل استعلام
//  موظفين، فعمود جديد عليه كان هيوقّف النظام كله قبل ما الترحيل يتطبق.
//  «المشغول» محسوب مش متخزّن (position-rules.ts): المربوط بالوظيفة، ومش منتهي ولا مؤرشف، ولسه في وحدتها.
export const POSITION_STATUSES = ['ACTIVE', 'FROZEN', 'CANCELLED'] as const
export type PositionStatus = (typeof POSITION_STATUSES)[number]

@Entity('positions')
export class ApprovedPosition {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_positions' })
  id: number

  @Column({ type: 'int' })
  jobTitleId: number

  @Column({ type: 'int', nullable: true })
  gradeId: number | null

  @Column({ type: 'int' })
  branchId: number

  @Column({ type: 'int', nullable: true })
  departmentId: number | null

  @Column({ type: 'int', nullable: true })
  teamId: number | null

  @Column({ type: 'int', nullable: true })
  costCenterId: number | null

  // العدد المعتمد
  @Column({ type: 'int' })
  headcount: number

  @Column({ type: 'nvarchar', length: 20 })
  status: PositionStatus

  // ميزانية اختيارية للوظيفة (رقم للعرض بس، بعملة الفرع — مابيدخلش في أي حساب)
  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  budget: string | null

  @Column({ type: 'datetime2' })
  createdAt: Date
}

@Entity('position_holders')
@Index('UX_position_holders_position', ['positionId', 'employeeId'], { unique: true })
export class PositionHolder {
  @PrimaryColumn({ type: 'int', primaryKeyConstraintName: 'PK_position_holders' })
  employeeId: number

  @Column({ type: 'int' })
  positionId: number

  @Column({ type: 'int' })
  assignedByUserId: number

  @Column({ type: 'datetime2' })
  assignedAt: Date
}
