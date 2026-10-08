import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

// B3.11 (ترحيلات 124–126): ملف القضية (شكوى، تظلم من جزاء، إبلاغ عن مخالفة)، وأطرافه والمطّلعين عليه، وخطه الزمني. نفس الشكل في الترحيلات
// بالحرف (من غير افتراضي). الاطلاع على مستوى القضية: المطّلعين (HANDLER) بس — صاحب الصلاحية اللي مش متضاف مابيشوفهاش.
export const CASE_KINDS = ['COMPLAINT', 'PENALTY_OBJECTION', 'VIOLATION', 'OTHER'] as const
export type CaseKind = (typeof CASE_KINDS)[number]
export const CASE_STATUSES = ['OPEN', 'INVESTIGATING', 'DECIDED', 'CLOSED'] as const
export type CaseStatus = (typeof CASE_STATUSES)[number]
export const CASE_OUTCOMES = ['DISMISSED', 'WARNING', 'PENALTY', 'TERMINATION'] as const
export type CaseOutcome = (typeof CASE_OUTCOMES)[number]
export const CASE_PARTY_ROLES = ['COMPLAINANT', 'RESPONDENT', 'WITNESS'] as const
export type CasePartyRole = (typeof CASE_PARTY_ROLES)[number] | 'HANDLER'
/** أحداث بيسجّلها المطّلع بإيده؛ والباقي (DECISION، OBJECTION، STATUS) بيتسجّل من إجراءاته */
export const CASE_MANUAL_EVENTS = ['NOTE', 'STATEMENT', 'EVIDENCE', 'SESSION', 'NOTICE', 'DEFENSE'] as const
export type CaseEventKind = (typeof CASE_MANUAL_EVENTS)[number] | 'DECISION' | 'OBJECTION' | 'STATUS'

@Entity('hr_cases')
export class HrCase {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_hr_cases' })
  id: number

  @Column({ type: 'nvarchar', length: 30 })
  kind: CaseKind

  @Column({ type: 'nvarchar', length: 200 })
  title: string

  @Column({ type: 'nvarchar', length: 'max', nullable: true })
  description: string | null

  // فرع صاحب القضية — للعدّ بس (الاطلاع على مستوى القضية مش الفرع)
  @Column({ type: 'int', nullable: true })
  branchId: number | null

  // الطلب اللي اتفتحت منه (requests.id)
  @Column({ type: 'int', nullable: true })
  requestId: number | null

  @Column({ type: 'int', nullable: true })
  investigatorUserId: number | null

  @Column({ type: 'nvarchar', length: 20 })
  status: CaseStatus

  @Column({ type: 'nvarchar', length: 20, nullable: true })
  outcome: CaseOutcome | null

  @Column({ type: 'nvarchar', length: 2000, nullable: true })
  outcomeNote: string | null

  @Column({ type: 'int' })
  openedByUserId: number

  @Column({ type: 'datetime2' })
  openedAt: Date

  @Column({ type: 'datetime2', nullable: true })
  decidedAt: Date | null

  @Column({ type: 'datetime2', nullable: true })
  closedAt: Date | null
}

@Entity('hr_case_parties')
export class HrCaseParty {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_hr_case_parties' })
  id: number

  @Column({ type: 'int' })
  caseId: number

  @Column({ type: 'nvarchar', length: 20 })
  role: CasePartyRole

  // الشاكي والمشكو في حقه والشاهد
  @Column({ type: 'int', nullable: true })
  employeeId: number | null

  // المطّلع على الملف (HANDLER)
  @Column({ type: 'int', nullable: true })
  userId: number | null

  @Column({ type: 'int' })
  addedByUserId: number

  @Column({ type: 'datetime2' })
  addedAt: Date
}

@Entity('hr_case_events')
export class HrCaseEvent {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_hr_case_events' })
  id: number

  @Column({ type: 'int' })
  caseId: number

  @Column({ type: 'nvarchar', length: 20 })
  kind: CaseEventKind

  @Column({ type: 'nvarchar', length: 'max' })
  body: string

  // صاحب الإفادة أو الدفاع أو الاعتراض
  @Column({ type: 'int', nullable: true })
  employeeId: number | null

  @Column({ type: 'int', nullable: true })
  fileId: number | null

  @Column({ type: 'int' })
  createdByUserId: number

  @Column({ type: 'datetime2' })
  createdAt: Date
}
