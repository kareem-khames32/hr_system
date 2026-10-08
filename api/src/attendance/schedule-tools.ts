import { Column, Entity, PrimaryGeneratedColumn, type EntityManager } from 'typeorm'

// B5.5 (أ): أدوات الجدولة — نسخ أسبوع، أنماط تدوير، ونشر جدول أسبوع لفرع بإشعار. ميزة فرعية `shifts.advanced` (مقفولة افتراضيًا) جوه موديول
//  الورديات القايم. أي كتابة جدول بتعدّي من `AttendanceService.upsertSchedule` القايم — هنا القواعد والقراءات بس.

export const SCHEDULE_TOOLS_FEATURE = 'shifts.advanced'
export const SCHEDULE_TOOLS_MIGRATION_MISSING = 'جداول أدوات الجدولة ناقصة — طبّق ترحيلي 161 و162 الأول'
export const ROTATION_NOT_FOUND = 'نمط التدوير مش موجود'
export const BRANCH_NOT_FOUND = 'الفرع مش موجود'
export const ROTATION_SLOTS_MIN = 2
export const ROTATION_SLOTS_MAX = 12
export const ROTATION_WEEKS_MAX = 12
export const ROTATION_EMPLOYEES_MAX = 500

@Entity('shift_rotations')
export class ShiftRotation {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_shift_rotations' })
  id: number

  @Column({ type: 'nvarchar', length: 120 })
  name: string

  /** فرع النمط؛ null = لكل الفروع */
  @Column({ type: 'int', nullable: true })
  branchId: number | null

  /** أرقام ورديات الكتالوج بالترتيب، مفصولة بفاصلة: خانة لكل أسبوع */
  @Column({ type: 'nvarchar', length: 200 })
  shiftIds: string

  @Column({ type: 'bit' })
  isActive: boolean

  @Column({ type: 'int' })
  updatedByUserId: number

  @Column({ type: 'datetime2' })
  updatedAt: Date
}

@Entity('schedule_publications')
export class SchedulePublication {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_schedule_publications' })
  id: number

  /** بداية الأسبوع (الأحد) */
  @Column({ type: 'date' })
  weekStart: string

  @Column({ type: 'int' })
  branchId: number

  /** عدد الموظفين اللي لهم وردية في الأسبوع وقت النشر */
  @Column({ type: 'int' })
  employeesCount: number

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  note: string | null

  @Column({ type: 'int' })
  publishedByUserId: number

  @Column({ type: 'datetime2' })
  publishedAt: Date
}

const cleanText = (value: unknown, max: number): string | null => {
  if (value === undefined || value === null) return ''
  if (typeof value !== 'string') return null
  const text = value.trim().replace(/\s+/g, ' ')
  return text.length > max ? null : text
}
const positiveId = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0
const localYmd = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
/** بداية أسبوع صالحة: تاريخ حقيقي ويوم أحد (نفس مفتاح الجدول القايم)، وإلا null */
export function weekStartOf(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T12:00:00`)
  return !Number.isNaN(date.getTime()) && localYmd(date) === value && date.getDay() === 0 ? value : null
}
/** الأسبوع بعد (أو قبل) n أسبوع */
export function weekAfter(week: string, n: number): string {
  const date = new Date(`${week}T12:00:00`)
  date.setDate(date.getDate() + n * 7)
  return localYmd(date)
}
/** بداية الأسبوع (الأحد) اللي فيه اليوم ده */
export function weekOfDay(today: string): string {
  const date = new Date(`${today}T12:00:00`)
  date.setDate(date.getDate() - date.getDay())
  return localYmd(date)
}
export const rotationShiftIds = (raw: string | null | undefined): number[] => String(raw ?? '').split(',').map(Number).filter((id) => Number.isSafeInteger(id) && id > 0)
/** وردية الخانة اللي عليها الدور في الأسبوع رقم `weekOffset` من البداية */
export const rotationShiftAt = (shiftIds: readonly number[], startIndex: number, weekOffset: number): number => shiftIds[(startIndex + weekOffset) % shiftIds.length]

export interface RotationFields { name: string; branchId: number | null; shiftIds: number[]; isActive: boolean }
/** نمط تدوير: اسم، وفرع (فاضي = لكل الفروع)، وترتيب ورديات من خانتين لحد 12 */
export function rotationFields(body: unknown): { fields: RotationFields | null; error: string | null } {
  const input = (body ?? {}) as Record<string, unknown>
  const name = cleanText(input.name, 120)
  if (!name || name.length < 2) return { fields: null, error: 'اسم النمط من حرفين لحد 120 حرف' }
  let branchId: number | null = null
  if (input.branchId !== undefined && input.branchId !== null) {
    if (!positiveId(input.branchId)) return { fields: null, error: 'الفرع مش صحيح' }
    branchId = input.branchId
  }
  if (!Array.isArray(input.shiftIds) || input.shiftIds.length < ROTATION_SLOTS_MIN || input.shiftIds.length > ROTATION_SLOTS_MAX || !input.shiftIds.every(positiveId)) {
    return { fields: null, error: `ترتيب الورديات من ${ROTATION_SLOTS_MIN} لحد ${ROTATION_SLOTS_MAX} خانة` }
  }
  if (new Set(input.shiftIds).size < 2) return { fields: null, error: 'النمط محتاج ورديتين مختلفتين على الأقل' }
  if (input.isActive !== undefined && typeof input.isActive !== 'boolean') return { fields: null, error: '«مفعّل» نعم أو لا' }
  return { fields: { name, branchId, shiftIds: input.shiftIds as number[], isActive: input.isActive !== false }, error: null }
}

export interface CopyFields { fromWeek: string; toWeek: string; branchId: number | null; overwrite: boolean }
/** نسخ أسبوع: المصدر والهدف بدايات أسابيع مختلفة، والهدف مش أسبوع فات */
export function copyFields(body: unknown, today: string): { fields: CopyFields | null; error: string | null } {
  const input = (body ?? {}) as Record<string, unknown>
  const fromWeek = weekStartOf(input.fromWeek), toWeek = weekStartOf(input.toWeek)
  if (!fromWeek || !toWeek) return { fields: null, error: 'أسبوع المصدر والهدف: تاريخ يوم أحد (بداية الأسبوع)' }
  if (fromWeek === toWeek) return { fields: null, error: 'أسبوع الهدف هو نفسه أسبوع المصدر' }
  if (toWeek < weekOfDay(today)) return { fields: null, error: 'أسبوع الهدف فات — النسخ للأسبوع الحالي أو اللي بعده' }
  let branchId: number | null = null
  if (input.branchId !== undefined && input.branchId !== null) {
    if (!positiveId(input.branchId)) return { fields: null, error: 'الفرع مش صحيح' }
    branchId = input.branchId
  }
  if (input.overwrite !== undefined && typeof input.overwrite !== 'boolean') return { fields: null, error: '«اكتب فوق» نعم أو لا' }
  return { fields: { fromWeek, toWeek, branchId, overwrite: input.overwrite === true }, error: null }
}

export interface ApplyFields { rotationId: number; employeeIds: number[]; fromWeek: string; weeks: number; startIndex: number }
/** تطبيق نمط: الموظفين، وأسبوع البداية (مش فات)، وعدد الأسابيع، والخانة اللي يبدأ منها */
export function applyFields(body: unknown, today: string): { fields: ApplyFields | null; error: string | null } {
  const input = (body ?? {}) as Record<string, unknown>
  if (!positiveId(input.rotationId)) return { fields: null, error: 'اختار نمط التدوير' }
  if (!Array.isArray(input.employeeIds) || !input.employeeIds.length || input.employeeIds.length > ROTATION_EMPLOYEES_MAX || !input.employeeIds.every(positiveId)) {
    return { fields: null, error: `اختار الموظفين (لحد ${ROTATION_EMPLOYEES_MAX})` }
  }
  const fromWeek = weekStartOf(input.fromWeek)
  if (!fromWeek) return { fields: null, error: 'أسبوع البداية: تاريخ يوم أحد (بداية الأسبوع)' }
  if (fromWeek < weekOfDay(today)) return { fields: null, error: 'أسبوع البداية فات — التطبيق من الأسبوع الحالي أو اللي بعده' }
  if (typeof input.weeks !== 'number' || !Number.isInteger(input.weeks) || input.weeks < 1 || input.weeks > ROTATION_WEEKS_MAX) return { fields: null, error: `عدد الأسابيع من 1 لحد ${ROTATION_WEEKS_MAX}` }
  const startIndex = input.startIndex === undefined || input.startIndex === null ? 0 : input.startIndex
  if (typeof startIndex !== 'number' || !Number.isInteger(startIndex) || startIndex < 0 || startIndex >= ROTATION_SLOTS_MAX) return { fields: null, error: 'خانة البداية مش صحيحة' }
  return { fields: { rotationId: input.rotationId, employeeIds: [...new Set(input.employeeIds as number[])], fromWeek, weeks: input.weeks, startIndex }, error: null }
}

export interface PublishFields { week: string; branchId: number; note: string | null; overrideReason: string | null }
/** نشر جدول أسبوع لفرع */
export function publishFields(body: unknown): { fields: PublishFields | null; error: string | null } {
  const input = (body ?? {}) as Record<string, unknown>
  const week = weekStartOf(input.week)
  if (!week) return { fields: null, error: 'الأسبوع: تاريخ يوم أحد (بداية الأسبوع)' }
  if (!positiveId(input.branchId)) return { fields: null, error: 'اختار الفرع' }
  const note = cleanText(input.note, 300)
  if (note === null) return { fields: null, error: 'الملاحظة 300 حرف بالكتير' }
  // (ب) سبب تجاوز مخالفات «منع» — اختياري هنا، ومطلوب لو الفحص لقى مخالفة منع
  const overrideReason = cleanText(input.overrideReason, 300)
  if (overrideReason === null || (overrideReason !== '' && overrideReason.length < 2)) return { fields: null, error: 'سبب التجاوز من حرفين لحد 300 حرف' }
  return { fields: { week, branchId: input.branchId, note: note || null, overrideReason: overrideReason || null }, error: null }
}

let ready: boolean | null = null
/** جدولي ترحيلي 161 و162 موجودين؟ الموجود بيتحفظ؛ الناقص بيتفحص مع كل نداء لحد ما الترحيل يتطبق */
export async function scheduleToolsReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.shift_rotations', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.schedule_publications', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الترحيل */
export function resetScheduleToolsCache() { ready = null }

const ACTIVE = `e.[isActive] = 1 AND e.[status] IN (N'active', N'probation', N'notice_period')`
/** موظفين الفرع (بفرعهم الحالي) اللي على رأس العمل ولهم وردية في الأسبوع — دول اللي النشر بيبلّغهم */
export async function scheduledEmployeeIds(em: EntityManager, weekStart: string, branchId: number): Promise<number[]> {
  const rows: Array<{ id: number }> = await em.query(
    `SELECT DISTINCT e.[id] FROM dbo.weekly_schedule_entries s INNER JOIN dbo.employees e ON e.[id] = s.[employeeId] WHERE s.[weekStart] = @0 AND e.[branchId] = @1 AND ${ACTIVE}`, [weekStart, branchId])
  return rows.map((row) => Number(row.id))
}
/** النشر والموظفين اللي لسه يخصّهم دلوقتي (لسه في فرعه ولهم وردية في أسبوعه)؛ null = النشر مش موجود أو الترحيل ناقص */
export async function publicationAudience(em: EntityManager, publicationId: number): Promise<{ weekStart: string; branchId: number; employeeIds: number[] } | null> {
  if (!(await scheduleToolsReady(em))) return null
  const row = await em.getRepository(SchedulePublication).findOne({ where: { id: publicationId } })
  if (!row) return null
  const weekStart = String(row.weekStart).slice(0, 10)
  return { weekStart, branchId: row.branchId, employeeIds: await scheduledEmployeeIds(em, weekStart, row.branchId) }
}
