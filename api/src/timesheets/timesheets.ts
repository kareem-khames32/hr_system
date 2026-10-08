import { Column, Entity, PrimaryGeneratedColumn, type EntityManager } from 'typeorm'
import { weekOfDay, weekStartOf } from '../attendance/schedule-tools'

// B5.8: ساعات المشاريع — مشروع (باسم عميله) ومهامه، وتسجيل دقايق الموظف لكل يوم، وأسبوع بيتبعت لاعتماد المدير المباشر، وتقرير ساعات
// (وتكلفة بأجر الساعة ورا ميزة مقفولة). موديول `timesheets` (مقفول افتراضيًا، باقة «كامل»). هنا الكيانات والقواعد بس.

export const WEEK_STATUSES = ['SUBMITTED', 'APPROVED', 'REJECTED'] as const
export type WeekStatus = (typeof WEEK_STATUSES)[number]
/** الأسبوع من غير صف = مسودة */
export const WEEK_STATUS_LABELS: Record<WeekStatus | 'DRAFT', string> = { DRAFT: 'مسودة', SUBMITTED: 'مستني الاعتماد', APPROVED: 'معتمد', REJECTED: 'مرفوض' }
export const TIMESHEETS_COST_FEATURE = 'timesheets.cost'
export const TIMESHEETS_MIGRATION_MISSING = 'جداول ساعات المشاريع ناقصة — طبّق ترحيلات 171 لحد 174 الأول'
export const PROJECT_NOT_FOUND = 'المشروع مش موجود'
export const WEEK_NOT_FOUND = 'الأسبوع مش موجود'
export const DAY_MINUTES_MAX = 1440
export const ENTRY_DAYS_BACK = 62
export const TASKS_MAX = 50
export const REPORT_DAYS_MAX = 366

@Entity('timesheet_projects')
export class TimesheetProject {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_timesheet_projects' })
  id: number

  @Column({ type: 'nvarchar', length: 120 })
  clientName: string

  @Column({ type: 'nvarchar', length: 150 })
  name: string

  /** الفاضي = لكل الفروع */
  @Column({ type: 'int', nullable: true })
  branchId: number | null

  @Column({ type: 'bit' })
  isActive: boolean

  @Column({ type: 'int' })
  updatedByUserId: number

  @Column({ type: 'datetime2' })
  updatedAt: Date
}

@Entity('timesheet_project_tasks')
export class TimesheetProjectTask {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_timesheet_project_tasks' })
  id: number

  @Column({ type: 'int' })
  projectId: number

  @Column({ type: 'nvarchar', length: 120 })
  name: string

  @Column({ type: 'bit' })
  isActive: boolean
}

/** أسبوع موظف اتبعت للاعتماد (من غير صف = مسودة) */
@Entity('timesheet_weeks')
export class TimesheetWeek {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_timesheet_weeks' })
  id: number

  @Column({ type: 'int' })
  employeeId: number

  /** الأحد */
  @Column({ type: 'date' })
  weekStart: string

  @Column({ type: 'nvarchar', length: 20 })
  status: string

  @Column({ type: 'int' })
  totalMinutes: number

  @Column({ type: 'datetime2' })
  submittedAt: Date

  @Column({ type: 'int', nullable: true })
  decidedByUserId: number | null

  @Column({ type: 'datetime2', nullable: true })
  decidedAt: Date | null

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  decisionNote: string | null
}

@Entity('timesheet_entries')
export class TimesheetEntry {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_timesheet_entries' })
  id: number

  @Column({ type: 'int' })
  employeeId: number

  @Column({ type: 'date' })
  workDate: string

  /** أحد أسبوع اليوم */
  @Column({ type: 'date' })
  weekStart: string

  @Column({ type: 'int' })
  projectId: number

  @Column({ type: 'int', nullable: true })
  taskId: number | null

  @Column({ type: 'int' })
  minutes: number

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  note: string | null

  @Column({ type: 'datetime2' })
  updatedAt: Date
}

const cleanText = (value: unknown, max: number): string | null => {
  if (value === undefined || value === null) return ''
  if (typeof value !== 'string') return null
  const text = value.trim().replace(/\s+/g, ' ')
  return text.length > max ? null : text
}
const positiveId = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0
export const validYmd = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}
export const addDays = (day: string, days: number) => new Date(new Date(`${day}T00:00:00Z`).getTime() + days * 86400000).toISOString().slice(0, 10)
/** أيام الأسبوع السبعة من الأحد */
export const weekDays = (weekStart: string): string[] => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
/** أحد الأسبوع المطلوب: المبعوت لو أحد صالح، وإلا أسبوع النهارده */
export const weekOrCurrent = (value: unknown, today: string): string => weekStartOf(value) ?? weekOfDay(today)

export interface ProjectTaskInput { id: number | null; name: string; isActive: boolean }
export interface ProjectFields { clientName: string; name: string; branchId: number | null; isActive: boolean; tasks: ProjectTaskInput[] }
/** مشروع: عميل واسم وفرع (فاضي = لكل الفروع) ومهامه (اسم من غير تكرار) */
export function projectFields(body: unknown): { fields: ProjectFields | null; error: string | null } {
  const input = (body ?? {}) as Record<string, unknown>
  const clientName = cleanText(input.clientName, 120)
  if (!clientName || clientName.length < 2) return { fields: null, error: 'اسم العميل من حرفين لحد 120 حرف' }
  const name = cleanText(input.name, 150)
  if (!name || name.length < 2) return { fields: null, error: 'اسم المشروع من حرفين لحد 150 حرف' }
  const blank = input.branchId === undefined || input.branchId === null || input.branchId === ''
  if (!blank && !positiveId(input.branchId)) return { fields: null, error: 'الفرع مش صحيح' }
  if (input.isActive !== undefined && typeof input.isActive !== 'boolean') return { fields: null, error: 'حالة المشروع مش صحيحة' }
  const raw = input.tasks === undefined || input.tasks === null ? [] : input.tasks
  if (!Array.isArray(raw) || raw.length > TASKS_MAX) return { fields: null, error: `مهام المشروع قايمة لحد ${TASKS_MAX} مهمة` }
  const tasks: ProjectTaskInput[] = []
  for (const item of raw as Array<Record<string, unknown>>) {
    const taskName = cleanText(item?.name, 120)
    if (!taskName || taskName.length < 2) return { fields: null, error: 'اسم المهمة من حرفين لحد 120 حرف' }
    const noId = item.id === undefined || item.id === null
    if (!noId && !positiveId(item.id)) return { fields: null, error: 'مهمة من المهام مش صحيحة' }
    if (item.isActive !== undefined && typeof item.isActive !== 'boolean') return { fields: null, error: 'حالة المهمة مش صحيحة' }
    if (tasks.some(row => row.name === taskName) || (!noId && tasks.some(row => row.id === item.id))) return { fields: null, error: 'مهمة مكررة في المشروع' }
    tasks.push({ id: noId ? null : (item.id as number), name: taskName, isActive: item.isActive !== false })
  }
  return { fields: { clientName, name, branchId: blank ? null : (input.branchId as number), isActive: input.isActive !== false, tasks }, error: null }
}

export interface EntryFields { workDate: string; projectId: number; taskId: number | null; minutes: number; note: string | null }
/** سطر ساعات: يوم (مش في المستقبل ولا أقدم من 62 يوم)، مشروع، مهمة اختيارية، ودقايق من صفر (= شيل السطر) لحد 24 ساعة */
export function entryFields(body: unknown, today: string): { fields: EntryFields | null; error: string | null } {
  const input = (body ?? {}) as Record<string, unknown>
  if (!validYmd(input.workDate)) return { fields: null, error: 'اليوم مش صحيح' }
  if (input.workDate > today) return { fields: null, error: 'ماينفعش تسجّل ساعات يوم لسه ماجاش' }
  if (input.workDate < addDays(today, -ENTRY_DAYS_BACK)) return { fields: null, error: `التسجيل لآخر ${ENTRY_DAYS_BACK} يوم بس` }
  if (!positiveId(input.projectId)) return { fields: null, error: 'اختار المشروع' }
  const noTask = input.taskId === undefined || input.taskId === null || input.taskId === ''
  if (!noTask && !positiveId(input.taskId)) return { fields: null, error: 'المهمة مش صحيحة' }
  if (typeof input.minutes !== 'number' || !Number.isInteger(input.minutes) || input.minutes < 0 || input.minutes > DAY_MINUTES_MAX) return { fields: null, error: 'الوقت بالدقايق: رقم صحيح من صفر لحد 1440' }
  const note = cleanText(input.note, 300)
  if (note === null) return { fields: null, error: 'الملاحظة 300 حرف بالكتير' }
  return { fields: { workDate: input.workDate, projectId: input.projectId, taskId: noTask ? null : (input.taskId as number), minutes: input.minutes, note: note || null }, error: null }
}

export interface DecisionFields { approve: boolean; note: string | null }
/** قرار المدير: اعتماد، أو رفض بسبب */
export function decisionFields(body: unknown): { fields: DecisionFields | null; error: string | null } {
  const input = (body ?? {}) as Record<string, unknown>
  if (input.action !== 'APPROVE' && input.action !== 'REJECT') return { fields: null, error: 'القرار: اعتماد أو رفض' }
  const note = cleanText(input.note, 300)
  if (note === null) return { fields: null, error: 'الملاحظة 300 حرف بالكتير' }
  if (input.action === 'REJECT' && note.length < 3) return { fields: null, error: 'اكتب سبب الرفض' }
  return { fields: { approve: input.action === 'APPROVE', note: note || null }, error: null }
}

/** فترة التقرير: من وإلى (سنة بالكتير) */
export function reportRange(query: unknown): { from: string; to: string } | null {
  const input = (query ?? {}) as Record<string, unknown>
  if (!validYmd(input.from) || !validYmd(input.to) || input.from > input.to || addDays(input.from, REPORT_DAYS_MAX) < input.to) return null
  return { from: input.from, to: input.to }
}

/** الأسبوع بيتعدّل؟ المسودة والمرفوض بس */
export const weekEditable = (status: string | null | undefined) => status == null || status === 'REJECTED'
/** أجر الساعة: إجمالي مكونات راتب الشهر ÷ أيام الشهر ÷ ساعات اليوم (نفس مقسومات تسعير الإضافي) — null لو المقسومات مش صالحة */
export function hourlyWage(monthlyComponents: readonly number[], monthlyDays: number, dailyHours: number): number | null {
  if (![monthlyDays, dailyHours].every(value => Number.isFinite(value) && value > 0) || monthlyComponents.some(value => !Number.isFinite(value) || value < 0)) return null
  return monthlyComponents.reduce((sum, value) => sum + value, 0) / monthlyDays / dailyHours
}
/** تكلفة دقايق بأجر ساعة، بالقروش (تقريب لأقرب قرش) */
export const costCents = (minutes: number, hourly: number) => Math.round((minutes * hourly * 100) / 60)

let ready: boolean | null = null
/** جداول ترحيلات 171 لحد 174 موجودة؟ */
export async function timesheetsReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.timesheet_projects', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.timesheet_project_tasks', N'U') IS NOT NULL
    AND OBJECT_ID(N'dbo.timesheet_weeks', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.timesheet_entries', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الترحيل */
export function resetTimesheetsCache() { ready = null }
