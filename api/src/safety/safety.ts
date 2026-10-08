import { Column, Entity, PrimaryGeneratedColumn, type EntityManager } from 'typeorm'

// B5.7: السلامة وإصابات العمل — بلاغ حادث من أي موظف، وسجل حوادث بتصنيف وتحقيق وقفل، وإجراءات تصحيحية ومهمة إبلاغ الجهة كمهام في محرك المهام
//  القايم، وربط بإجازة المصاب. موديول `safety` (مقفول افتراضيًا، باقة «كامل»). هنا الكيانات والقواعد بس.

export const INCIDENT_KINDS = ['INJURY', 'PROPERTY', 'HAZARD'] as const
export type IncidentKind = (typeof INCIDENT_KINDS)[number]
export const INCIDENT_KIND_LABELS: Record<IncidentKind, string> = { INJURY: 'إصابة', PROPERTY: 'تلف في الممتلكات', HAZARD: 'خطر أو وضع غير آمن' }
export const INCIDENT_SEVERITIES = ['MINOR', 'MODERATE', 'SERIOUS'] as const
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number]
export const INCIDENT_SEVERITY_LABELS: Record<IncidentSeverity, string> = { MINOR: 'بسيطة', MODERATE: 'متوسطة', SERIOUS: 'جسيمة' }
export const INCIDENT_STATUSES = ['REPORTED', 'INVESTIGATING', 'CLOSED'] as const
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number]
export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = { REPORTED: 'اتبلّغ', INVESTIGATING: 'تحت التحقيق', CLOSED: 'اتقفل' }
export const INJURED_WHO = ['SELF', 'OTHER', 'NONE'] as const
export const SAFETY_MIGRATION_MISSING = 'جداول السلامة ناقصة — طبّق ترحيلي 169 و170 (وترحيل المهام 088) الأول'
export const INCIDENT_NOT_FOUND = 'الحادث مش موجود'
export const REPORT_DAYS_BACK = 30
export const REPORTS_PER_DAY = 5
export const ACTIONS_MAX = 20
export const incidentCode = (id: number) => `SAF-${String(id).padStart(5, '0')}`

@Entity('safety_incidents')
export class SafetyIncident {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_safety_incidents' })
  id: number

  /** فرع الحادث = فرع المبلّغ وقت البلاغ */
  @Column({ type: 'int' })
  branchId: number

  @Column({ type: 'int' })
  reporterEmployeeId: number

  @Column({ type: 'nvarchar', length: 20 })
  kind: string

  @Column({ type: 'date' })
  occurredOn: string

  @Column({ type: 'nvarchar', length: 200 })
  location: string

  @Column({ type: 'nvarchar', length: 1000 })
  description: string

  /** المصاب: موظف (بيحدده المبلّغ لو هو نفسه، أو مسؤول السلامة) */
  @Column({ type: 'int', nullable: true })
  injuredEmployeeId: number | null

  /** اسم المصاب زي ما المبلّغ كتبه (لما يكون حد تاني) */
  @Column({ type: 'nvarchar', length: 120, nullable: true })
  injuredNote: string | null

  @Column({ type: 'nvarchar', length: 20, nullable: true })
  severity: string | null

  @Column({ type: 'int', nullable: true })
  lostDays: number | null

  @Column({ type: 'nvarchar', length: 1000, nullable: true })
  rootCause: string | null

  @Column({ type: 'nvarchar', length: 20 })
  status: string

  /** إجازة المصاب المربوطة بالحادث (leaves) */
  @Column({ type: 'int', nullable: true })
  leaveId: number | null

  /** مهمة إبلاغ الجهة (tasks) — واحدة للحادث */
  @Column({ type: 'int', nullable: true })
  authorityTaskId: number | null

  @Column({ type: 'int', nullable: true })
  closedByUserId: number | null

  @Column({ type: 'datetime2', nullable: true })
  closedAt: Date | null

  @Column({ type: 'datetime2' })
  createdAt: Date

  @Column({ type: 'datetime2' })
  updatedAt: Date
}

/** إجراء تصحيحي = مهمة في محرك المهام مربوطة بالحادث */
@Entity('safety_incident_actions')
export class SafetyIncidentAction {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_safety_incident_actions' })
  id: number

  @Column({ type: 'int' })
  incidentId: number

  @Column({ type: 'int' })
  taskId: number

  @Column({ type: 'int' })
  createdByUserId: number

  @Column({ type: 'datetime2' })
  createdAt: Date
}

const cleanText = (value: unknown, max: number): string | null => {
  if (value === undefined || value === null) return ''
  if (typeof value !== 'string') return null
  const text = value.trim().replace(/[ \t]+/g, ' ')
  return text.length > max ? null : text
}
const positiveId = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0
const validYmd = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}
const daysBefore = (today: string, days: number) => new Date(new Date(`${today}T00:00:00Z`).getTime() - days * 86400000).toISOString().slice(0, 10)
export const isIncidentKind = (value: unknown): value is IncidentKind => (INCIDENT_KINDS as readonly unknown[]).includes(value)
export const isSeverity = (value: unknown): value is IncidentSeverity => (INCIDENT_SEVERITIES as readonly unknown[]).includes(value)

export interface ReportFields { kind: IncidentKind; occurredOn: string; location: string; description: string; injured: (typeof INJURED_WHO)[number]; injuredNote: string | null }
/** بلاغ حادث: النوع، تاريخه (مش في المستقبل ومش أقدم من 30 يوم)، المكان، الوصف، ومين المصاب */
export function reportFields(body: unknown, today: string): { fields: ReportFields | null; error: string | null } {
  const input = (body ?? {}) as Record<string, unknown>
  if (!isIncidentKind(input.kind)) return { fields: null, error: 'اختار نوع الحادث' }
  if (!validYmd(input.occurredOn)) return { fields: null, error: 'تاريخ الحادث مطلوب' }
  if (input.occurredOn > today) return { fields: null, error: 'تاريخ الحادث في المستقبل' }
  if (input.occurredOn < daysBefore(today, REPORT_DAYS_BACK)) return { fields: null, error: `البلاغ لحادث في آخر ${REPORT_DAYS_BACK} يوم` }
  const location = cleanText(input.location, 200)
  if (!location || location.length < 2) return { fields: null, error: 'اكتب مكان الحادث (لحد 200 حرف)' }
  const description = cleanText(input.description, 1000)
  if (!description || description.length < 10) return { fields: null, error: 'اكتب وصف الحادث (من 10 حروف لحد 1000)' }
  const injured = input.injured === undefined || input.injured === null ? (input.kind === 'INJURY' ? 'SELF' : 'NONE') : input.injured
  if (!(INJURED_WHO as readonly unknown[]).includes(injured)) return { fields: null, error: 'حدّد المصاب: إنت، حد تاني، أو محدش' }
  if (input.kind === 'INJURY' && injured === 'NONE') return { fields: null, error: 'بلاغ الإصابة محتاج مصاب' }
  const injuredNote = cleanText(input.injuredNote, 120)
  if (injuredNote === null) return { fields: null, error: 'اسم المصاب 120 حرف بالكتير' }
  if (injured === 'OTHER' && injuredNote.length < 2) return { fields: null, error: 'اكتب اسم المصاب' }
  return { fields: { kind: input.kind, occurredOn: input.occurredOn, location, description, injured: injured as ReportFields['injured'], injuredNote: injured === 'OTHER' ? injuredNote : null }, error: null }
}

export interface ReviewFields { severity: IncidentSeverity | null; injuredEmployeeId: number | null; lostDays: number | null; rootCause: string | null }
/** مراجعة مسؤول السلامة: الشدة، المصاب، الأيام المفقودة، والسبب — كلهم اختياريين لحد القفل */
export function reviewFields(body: unknown): { fields: ReviewFields | null; error: string | null } {
  const input = (body ?? {}) as Record<string, unknown>
  const blank = (value: unknown) => value === undefined || value === null || value === ''
  if (!blank(input.severity) && !isSeverity(input.severity)) return { fields: null, error: 'الشدة: بسيطة، متوسطة، أو جسيمة' }
  if (!blank(input.injuredEmployeeId) && !positiveId(input.injuredEmployeeId)) return { fields: null, error: 'المصاب مش صحيح' }
  if (!blank(input.lostDays) && (typeof input.lostDays !== 'number' || !Number.isInteger(input.lostDays) || input.lostDays < 0 || input.lostDays > 3650)) return { fields: null, error: 'الأيام المفقودة رقم صحيح من صفر' }
  const rootCause = cleanText(input.rootCause, 1000)
  if (rootCause === null) return { fields: null, error: 'السبب 1000 حرف بالكتير' }
  return { fields: { severity: blank(input.severity) ? null : (input.severity as IncidentSeverity), injuredEmployeeId: blank(input.injuredEmployeeId) ? null : (input.injuredEmployeeId as number),
    lostDays: blank(input.lostDays) ? null : (input.lostDays as number), rootCause: rootCause || null }, error: null }
}

export interface ActionFields { title: string; assigneeEmployeeId: number; dueDate: string }
/** إجراء تصحيحي: عنوان، ومسؤول، وموعد مش فات */
export function actionFields(body: unknown, today: string): { fields: ActionFields | null; error: string | null } {
  const input = (body ?? {}) as Record<string, unknown>
  const title = cleanText(input.title, 150)
  if (!title || title.length < 3) return { fields: null, error: 'اكتب الإجراء (من 3 حروف لحد 150)' }
  if (!positiveId(input.assigneeEmployeeId)) return { fields: null, error: 'اختار المسؤول عن الإجراء' }
  if (!validYmd(input.dueDate) || input.dueDate < today) return { fields: null, error: 'موعد الإجراء تاريخ من النهارده' }
  return { fields: { title, assigneeEmployeeId: input.assigneeEmployeeId, dueDate: input.dueDate }, error: null }
}
/** موعد مهمة إبلاغ الجهة: تاريخ من النهارده (المهلة القانونية بيحددها مسؤول السلامة) */
export function dueDateOf(body: unknown, today: string): string | null {
  const value = ((body ?? {}) as Record<string, unknown>).dueDate
  return validYmd(value) && value >= today ? value : null
}

/** خطوات الحالة المسموحة */
export const NEXT_STATUS: Record<string, IncidentStatus[]> = { REPORTED: ['INVESTIGATING'], INVESTIGATING: ['CLOSED'], CLOSED: ['INVESTIGATING'] }

let ready: boolean | null = null
/** جدولي ترحيلي 169 و170 (وجدول المهام) موجودين؟ */
export async function safetyReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.tasks', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.safety_incidents', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.safety_incident_actions', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الترحيل */
export function resetSafetyCache() { ready = null }
