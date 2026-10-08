import { Column, Entity, PrimaryGeneratedColumn, type EntityManager } from 'typeorm'

// B5.10: الأداء — 360 (ترشيح زملاء واعتماد المدير، تقييم للمدير، رد من غير مقيّم ولا وقت، ونتيجة بحد أدنى بعد قفل الدورة)، واجتماعات 1:1
// (أجندة وملاحظات ومهام)، والتقدير بين الزملاء. تلات ميزات فرعية مقفولة افتراضيًا جوه موديول الأداء. هنا الكيانات والقواعد بس.

export const FEEDBACK360_FEATURE = 'performance.feedback360'
export const ONE_ON_ONE_FEATURE = 'performance.one_on_one'
export const RECOGNITION_FEATURE = 'performance.recognition'
export const FEEDBACK360_MIGRATION_MISSING = 'جداول تقييم 360 ناقصة — طبّق ترحيلي 176 و177 الأول'
export const ONE_ON_ONE_MIGRATION_MISSING = 'جداول اجتماعات 1:1 ناقصة — طبّق ترحيلي 178 و179 الأول'
export const RECOGNITION_MIGRATION_MISSING = 'جدول التقدير ناقص — طبّق ترحيل 180 الأول'
export const INVITE_NOT_FOUND = 'الدعوة مش موجودة'
export const MEETING_NOT_FOUND = 'الاجتماع مش موجود'
export const EMPLOYEE_NOT_FOUND = 'الموظف غير موجود'
export const CYCLE_NOT_OPEN = 'دورة التقييم مش مفتوحة أو مالكش تكليف فيها'
/** أقل عدد ردود لنفس العلاقة عشان النتيجة تتعرض */
export const FEEDBACK_MIN_GROUP = 3
export const PEERS_MAX = 8
export const RECOGNITIONS_PER_DAY = 5
export const FEEDBACK_RELATIONS = ['PEER', 'UPWARD'] as const
export type FeedbackRelation = (typeof FEEDBACK_RELATIONS)[number]
export const FEEDBACK_RELATION_LABELS: Record<FeedbackRelation, string> = { PEER: 'زملاء', UPWARD: 'مرؤوسين' }
export const INVITE_STATUS_LABELS: Record<string, string> = { PENDING: 'مستني اعتماد المدير', APPROVED: 'معتمد', REJECTED: 'مرفوض' }
export const MEETING_STATUSES = ['SCHEDULED', 'DONE', 'CANCELLED'] as const
export const MEETING_STATUS_LABELS: Record<string, string> = { SCHEDULED: 'محدد', DONE: 'اتعمل', CANCELLED: 'اتلغى' }

/** دعوة تقييم 360: مين يقيّم مين في أنهي دورة. عليها علامة «رد» بس — من غير وقت الرد ولا ربط بالرد نفسه. */
@Entity('feedback360_invites')
export class Feedback360Invite {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_feedback360_invites' })
  id: number

  @Column({ type: 'int' })
  cycleId: number

  @Column({ type: 'int' })
  subjectEmployeeId: number

  @Column({ type: 'int' })
  reviewerEmployeeId: number

  @Column({ type: 'nvarchar', length: 10 })
  relation: string

  @Column({ type: 'nvarchar', length: 10 })
  status: string

  @Column({ type: 'bit' })
  responded: boolean

  @Column({ type: 'int' })
  createdByUserId: number

  @Column({ type: 'int', nullable: true })
  decidedByUserId: number | null

  @Column({ type: 'datetime2' })
  createdAt: Date
}

/** رد تقييم 360: من غير مقيّم ولا دعوة ولا وقت — السرية في شكل الجدول نفسه */
@Entity('feedback360_responses')
export class Feedback360Response {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_feedback360_responses' })
  id: number

  @Column({ type: 'int' })
  cycleId: number

  @Column({ type: 'int' })
  subjectEmployeeId: number

  @Column({ type: 'nvarchar', length: 10 })
  relation: string

  @Column({ type: 'int' })
  rating: number

  @Column({ type: 'nvarchar', length: 1000, nullable: true })
  strengths: string | null

  @Column({ type: 'nvarchar', length: 1000, nullable: true })
  improvements: string | null
}

@Entity('one_on_ones')
export class OneOnOne {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_one_on_ones' })
  id: number

  @Column({ type: 'int' })
  managerEmployeeId: number

  @Column({ type: 'int' })
  employeeId: number

  @Column({ type: 'date' })
  meetingDate: string

  @Column({ type: 'nvarchar', length: 5, nullable: true })
  meetingTime: string | null

  /** بيعدّلها الطرفين */
  @Column({ type: 'nvarchar', length: 1000, nullable: true })
  agenda: string | null

  /** بيكتبها المدير */
  @Column({ type: 'nvarchar', length: 2000, nullable: true })
  notes: string | null

  @Column({ type: 'nvarchar', length: 10 })
  status: string

  @Column({ type: 'int' })
  createdByUserId: number

  @Column({ type: 'datetime2' })
  createdAt: Date

  @Column({ type: 'datetime2' })
  updatedAt: Date
}

/** مهمة متابعة من اجتماع = مهمة في محرك المهام */
@Entity('one_on_one_actions')
export class OneOnOneAction {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_one_on_one_actions' })
  id: number

  @Column({ type: 'int' })
  meetingId: number

  @Column({ type: 'int' })
  taskId: number
}

@Entity('recognitions')
export class Recognition {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_recognitions' })
  id: number

  @Column({ type: 'int' })
  fromEmployeeId: number

  @Column({ type: 'int' })
  toEmployeeId: number

  /** فرع المستلم وقت الشكر: قايمة الفرع */
  @Column({ type: 'int' })
  branchId: number

  @Column({ type: 'nvarchar', length: 500 })
  message: string

  @Column({ type: 'int', nullable: true })
  hiddenByUserId: number | null

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

/** ترشيح زملاء: دورة، وقايمة موظفين من غير تكرار (لحد 8) */
export function nominationFields(body: unknown): { fields: { cycleId: number; reviewerEmployeeIds: number[] } | null; error: string | null } {
  const input = (body ?? {}) as Record<string, unknown>
  if (!positiveId(input.cycleId)) return { fields: null, error: 'اختار دورة التقييم' }
  const ids = input.reviewerEmployeeIds
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > PEERS_MAX || ids.some(id => !positiveId(id)) || new Set(ids).size !== ids.length) return { fields: null, error: `رشّح من زميل لحد ${PEERS_MAX} زملاء من غير تكرار` }
  return { fields: { cycleId: input.cycleId, reviewerEmployeeIds: ids as number[] }, error: null }
}

export interface FeedbackFields { rating: number; strengths: string | null; improvements: string | null }
/** رد 360: درجة من 1 لـ5، ونقاط قوة ونقاط تحسين اختيارية */
export function feedbackFields(body: unknown): { fields: FeedbackFields | null; error: string | null } {
  const input = (body ?? {}) as Record<string, unknown>
  if (typeof input.rating !== 'number' || !Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) return { fields: null, error: 'الدرجة رقم صحيح من 1 لـ5' }
  const strengths = cleanText(input.strengths, 1000), improvements = cleanText(input.improvements, 1000)
  if (strengths === null || improvements === null) return { fields: null, error: 'التعليق 1000 حرف بالكتير' }
  return { fields: { rating: input.rating, strengths: strengths || null, improvements: improvements || null }, error: null }
}

export interface FeedbackSummary { relation: FeedbackRelation; label: string; hidden: boolean; count: number | null; average: number | null; strengths: string[]; improvements: string[] }
/**
 * نتيجة علاقة واحدة: أقل من الحد = مخفية كلها (ولا العدد). غير كده: العدد والمتوسط (بكسرين)، والتعليقات مرتبة أبجديًا (مش بترتيب الإدخال).
 * كل قايمة تعليقات لها حدها هي كمان (Codex P5A-N01): قايمة فيها أقل من الحد مابتتعرضش — تعليق وحيد بيتعرف صاحبه من الباقي.
 */
export function feedbackSummary(relation: FeedbackRelation, rows: ReadonlyArray<Pick<Feedback360Response, 'rating' | 'strengths' | 'improvements'>>): FeedbackSummary {
  const label = FEEDBACK_RELATION_LABELS[relation]
  if (rows.length < FEEDBACK_MIN_GROUP) return { relation, label, hidden: true, count: null, average: null, strengths: [], improvements: [] }
  const texts = (pick: (row: (typeof rows)[number]) => string | null) => {
    const found = rows.map(pick).filter((text): text is string => !!text).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
    return found.length < FEEDBACK_MIN_GROUP ? [] : found
  }
  return { relation, label, hidden: false, count: rows.length, average: Math.round((rows.reduce((sum, row) => sum + row.rating, 0) / rows.length) * 100) / 100,
    strengths: texts(row => row.strengths), improvements: texts(row => row.improvements) }
}

export interface MeetingFields { employeeId: number; meetingDate: string; meetingTime: string | null; agenda: string | null }
const timeOf = (value: unknown): string | null | undefined => value === undefined || value === null || value === '' ? null : typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : undefined
/** اجتماع 1:1 جديد: الموظف، وتاريخ من النهارده، ووقت وأجندة اختياريين */
export function meetingFields(body: unknown, today: string): { fields: MeetingFields | null; error: string | null } {
  const input = (body ?? {}) as Record<string, unknown>
  if (!positiveId(input.employeeId)) return { fields: null, error: 'اختار الموظف' }
  if (!validYmd(input.meetingDate) || input.meetingDate < today) return { fields: null, error: 'تاريخ الاجتماع من النهارده' }
  const meetingTime = timeOf(input.meetingTime)
  if (meetingTime === undefined) return { fields: null, error: 'وقت الاجتماع بصيغة 14:30' }
  const agenda = cleanText(input.agenda, 1000)
  if (agenda === null) return { fields: null, error: 'الأجندة 1000 حرف بالكتير' }
  return { fields: { employeeId: input.employeeId, meetingDate: input.meetingDate, meetingTime, agenda: agenda || null }, error: null }
}

export interface MeetingPatch { agenda?: string | null; meetingDate?: string; meetingTime?: string | null; notes?: string | null; status?: string }
/** تعديل اجتماع: الخانات المبعوتة بس. الأجندة للطرفين؛ والتاريخ والوقت والملاحظات والحالة للمدير (`managerOnly` بيقول لو التعديل فيه حاجة منهم). */
export function meetingPatch(body: unknown): { patch: MeetingPatch | null; managerOnly: boolean; error: string | null } {
  const input = (body ?? {}) as Record<string, unknown>, patch: MeetingPatch = {}
  const fail = (error: string) => ({ patch: null, managerOnly: false, error })
  if (input.agenda !== undefined) { const agenda = cleanText(input.agenda, 1000); if (agenda === null) return fail('الأجندة 1000 حرف بالكتير'); patch.agenda = agenda || null }
  if (input.meetingDate !== undefined) { if (!validYmd(input.meetingDate)) return fail('تاريخ الاجتماع مش صحيح'); patch.meetingDate = input.meetingDate }
  if (input.meetingTime !== undefined) { const time = timeOf(input.meetingTime); if (time === undefined) return fail('وقت الاجتماع بصيغة 14:30'); patch.meetingTime = time }
  if (input.notes !== undefined) { const notes = cleanText(input.notes, 2000); if (notes === null) return fail('الملاحظات 2000 حرف بالكتير'); patch.notes = notes || null }
  if (input.status !== undefined) { if (!(MEETING_STATUSES as readonly unknown[]).includes(input.status)) return fail('حالة الاجتماع مش صحيحة'); patch.status = input.status as string }
  if (!Object.keys(patch).length) return fail('مفيش تعديل')
  return { patch, managerOnly: Object.keys(patch).some(key => key !== 'agenda'), error: null }
}

export interface MeetingActionFields { title: string; assignee: 'EMPLOYEE' | 'MANAGER'; dueDate: string }
/** مهمة متابعة: عنوان، وعلى مين (الموظف أو المدير)، وموعد من النهارده */
export function meetingActionFields(body: unknown, today: string): { fields: MeetingActionFields | null; error: string | null } {
  const input = (body ?? {}) as Record<string, unknown>
  const title = cleanText(input.title, 150)
  if (!title || title.length < 3) return { fields: null, error: 'اكتب المهمة (من 3 حروف لحد 150)' }
  if (input.assignee !== 'EMPLOYEE' && input.assignee !== 'MANAGER') return { fields: null, error: 'المهمة على الموظف أو المدير' }
  if (!validYmd(input.dueDate) || input.dueDate < today) return { fields: null, error: 'موعد المهمة تاريخ من النهارده' }
  return { fields: { title, assignee: input.assignee, dueDate: input.dueDate }, error: null }
}

/** كلمة شكر: زميل ورسالة من 5 حروف لحد 500 */
export function recognitionFields(body: unknown): { fields: { toEmployeeId: number; message: string } | null; error: string | null } {
  const input = (body ?? {}) as Record<string, unknown>
  if (!positiveId(input.toEmployeeId)) return { fields: null, error: 'اختار الزميل' }
  const message = cleanText(input.message, 500)
  if (!message || message.length < 5) return { fields: null, error: 'اكتب كلمة الشكر (من 5 حروف لحد 500)' }
  return { fields: { toEmployeeId: input.toEmployeeId, message }, error: null }
}

const ready: Record<string, boolean> = {}
async function tablesReady(em: EntityManager, key: string, tables: string[]): Promise<boolean> {
  if (ready[key]) return true
  const [row] = await em.query(`SELECT CASE WHEN ${tables.map(table => `OBJECT_ID(N'dbo.${table}', N'U') IS NOT NULL`).join(' AND ')} THEN 1 ELSE 0 END AS [ready]`)
  ready[key] = Number(row?.ready) === 1
  return ready[key]
}
export const feedback360Ready = (em: EntityManager) => tablesReady(em, 'feedback360', ['review_cycles', 'review_assignments', 'feedback360_invites', 'feedback360_responses'])
export const oneOnOnesReady = (em: EntityManager) => tablesReady(em, 'oneOnOne', ['tasks', 'one_on_ones', 'one_on_one_actions'])
export const recognitionsReady = (em: EntityManager) => tablesReady(em, 'recognition', ['recognitions'])
/** للاختبارات: نسيان حالة الترحيلات */
export function resetPeopleFeedbackCache() { for (const key of Object.keys(ready)) delete ready[key] }
