import { Column, Entity, PrimaryGeneratedColumn, type EntityManager } from 'typeorm'

// B4.8 (ب): حماية البيانات (C-EG-08، C-SA-08) — سجل حوادث التسريب بموعد الإخطار، ومدد الاحتفاظ لكل نوع بيانات.
//  - حادثة التسريب: بتتسجّل بوقت اكتشافها، وموعد إخطار الجهة المختصة = وقت الاكتشاف + 72 ساعة (محسوب ومحفوظ)، وبعدها «اتبلّغت» ثم «اتقفلت».
//  - مدة الاحتفاظ: إعداد بالشهور لكل نوع (فاضي أو صفر = من غير مدة، وده الافتراضي). النظام **مابيمسحش حاجة**: بيعدّ اللي عدّى مدته
//    وبيعمل مهمة مراجعة للموارد البشرية في فرعه، والقرار (أرشفة أو مسح) للبشر.

@Entity('data_breach_incidents')
export class DataBreachIncident {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_data_breach_incidents' })
  id: number

  @Column({ type: 'nvarchar', length: 200 })
  title: string

  @Column({ type: 'nvarchar', length: 2000, nullable: true })
  details: string | null

  /** وقت اكتشاف الحادثة */
  @Column({ type: 'datetime2' })
  discoveredAt: Date

  /** آخر موعد لإخطار الجهة المختصة = وقت الاكتشاف + 72 ساعة */
  @Column({ type: 'datetime2' })
  notifyBy: Date

  /** OPEN لسه مااتبلّغتش · NOTIFIED اتبلّغت · CLOSED اتقفلت */
  @Column({ type: 'nvarchar', length: 20 })
  status: BreachStatus

  @Column({ type: 'datetime2', nullable: true })
  notifiedAt: Date | null

  /** الجهة اللي اتبلّغت ومرجع الإخطار */
  @Column({ type: 'nvarchar', length: 500, nullable: true })
  notificationNote: string | null

  @Column({ type: 'int', nullable: true })
  affectedCount: number | null

  @Column({ type: 'datetime2', nullable: true })
  closedAt: Date | null

  @Column({ type: 'nvarchar', length: 1000, nullable: true })
  closeNote: string | null

  @Column({ type: 'int' })
  createdByUserId: number

  @Column({ type: 'datetime2' })
  createdAt: Date

  @Column({ type: 'int', nullable: true })
  updatedByUserId: number | null

  @Column({ type: 'datetime2', nullable: true })
  updatedAt: Date | null
}

export type BreachStatus = 'OPEN' | 'NOTIFIED' | 'CLOSED'
export const BREACH_NOTIFY_HOURS = 72
export const BREACH_STATUS_LABELS: Readonly<Record<BreachStatus, string>> = { OPEN: 'لسه مااتبلّغتش', NOTIFIED: 'اتبلّغت', CLOSED: 'اتقفلت' }
const HOUR = 3600000
const line = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim()

/** آخر موعد للإخطار: وقت الاكتشاف + 72 ساعة */
export const breachNotifyBy = (discoveredAt: Date): Date => new Date(discoveredAt.getTime() + BREACH_NOTIFY_HOURS * HOUR)

/** الساعات الباقية على موعد الإخطار (سالبة = الموعد فات) والتأخير — للحادثة اللي لسه مااتبلّغتش بس */
export function breachDeadline(row: Pick<DataBreachIncident, 'status' | 'notifyBy' | 'notifiedAt'>, now: Date): { hoursLeft: number | null; overdue: boolean; notifiedLate: boolean } {
  const notifyBy = new Date(row.notifyBy).getTime()
  const notifiedLate = row.notifiedAt != null && new Date(row.notifiedAt).getTime() > notifyBy
  if (row.status !== 'OPEN') return { hoursLeft: null, overdue: false, notifiedLate }
  const hoursLeft = Math.floor((notifyBy - now.getTime()) / HOUR)
  return { hoursLeft, overdue: now.getTime() > notifyBy, notifiedLate: false }
}

export interface BreachInput { title?: unknown; details?: unknown; discoveredAt?: unknown; affectedCount?: unknown }
/** خانات حادثة جديدة بعد التطبيع، أو رسالة الخطأ */
export function breachFields(input: BreachInput, now: Date): { fields: Pick<DataBreachIncident, 'title' | 'details' | 'discoveredAt' | 'notifyBy' | 'affectedCount'>; error: null } | { fields: null; error: string } {
  const fail = (error: string) => ({ fields: null, error })
  const title = line(input.title)
  if (title.length < 3 || title.length > 200) return fail('عنوان الحادثة من 3 لـ200 حرف')
  const details = line(input.details)
  if (details.length > 2000) return fail('تفاصيل الحادثة 2000 حرف بحد أقصى')
  const discoveredAt = typeof input.discoveredAt === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(input.discoveredAt) ? new Date(input.discoveredAt) : null
  if (!discoveredAt || Number.isNaN(discoveredAt.getTime())) return fail('وقت اكتشاف الحادثة مطلوب (تاريخ وساعة)')
  if (discoveredAt.getTime() > now.getTime() + 5 * 60000) return fail('وقت الاكتشاف مايبقاش في المستقبل')
  let affectedCount: number | null = null
  if (input.affectedCount !== undefined && input.affectedCount !== null && input.affectedCount !== '') {
    if (typeof input.affectedCount !== 'number' || !Number.isInteger(input.affectedCount) || input.affectedCount < 0 || input.affectedCount > 100000000) return fail('عدد المتأثرين رقم صحيح')
    affectedCount = input.affectedCount
  }
  return { fields: { title, details: details || null, discoveredAt, notifyBy: breachNotifyBy(discoveredAt), affectedCount }, error: null }
}

/** ملاحظة إخطار أو إقفال (اختيارية بحد أقصى)، أو رسالة الخطأ */
export function breachNote(value: unknown, max: number, required: boolean): { note: string | null; error: null } | { note: null; error: string } {
  const note = line(value)
  if (required && note.length < 3) return { note: null, error: 'اكتب الجهة اللي اتبلّغت ومرجع الإخطار' }
  if (note.length > max) return { note: null, error: `الملاحظة ${max} حرف بحد أقصى` }
  return { note: note || null, error: null }
}

// ===== مدد الاحتفاظ =====
export interface RetentionType { key: string; configKey: string; label: string; hint: string }
export const RETENTION_TYPES: readonly RetentionType[] = [
  { key: 'ex_employees', configKey: 'privacy.retention.ex_employees_months', label: 'ملفات الموظفين المؤرشفين', hint: 'من تاريخ أرشفة الملف' },
  { key: 'candidates', configKey: 'privacy.retention.candidates_months', label: 'بيانات المرشحين اللي مااتعيّنوش', hint: 'من تاريخ تسجيل المرشح' },
]
export const RETENTION_CONFIG_KEYS: readonly string[] = RETENTION_TYPES.map(type => type.configKey)
export const RETENTION_MONTHS_MAX = 600
export const RETENTION_REFUSAL = 'مدد الاحتفاظ بتتغيّر من «الإعدادات ← حماية البيانات» — مش من هنا'
export const RETENTION_JOB = 'privacy.retention-alerts'

/** الشهور من نص الإعداد: رقم صحيح من 1 لـ600، وغير كده (فاضي، صفر، غلط) = من غير مدة */
export function retentionMonths(value: string | null | undefined): number | null {
  const text = String(value ?? '').trim()
  if (!/^\d{1,3}$/.test(text)) return null
  const months = Number(text)
  return months >= 1 && months <= RETENTION_MONTHS_MAX ? months : null
}

/** آخر تاريخ (YYYY-MM-DD) لسه جوه المدة: النهارده ناقص عدد الشهور. اللي قبله عدّى مدته */
export function retentionCutoff(today: string, months: number): string {
  const [year, month, day] = today.split('-').map(Number)
  const total = year * 12 + (month - 1) - months, targetYear = Math.floor(total / 12), targetMonth = total - targetYear * 12
  const last = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(Math.min(day, last)).padStart(2, '0')}`
}

export const retentionTaskTitle = (type: RetentionType) => `مراجعة بيانات عدّت مدة الاحتفاظ: ${type.label}`

let ready: boolean | null = null
/** جدول ترحيل 139 موجود؟ الموجود بيتحفظ؛ الناقص بيتفحص مع كل نداء لحد ما الترحيل يتطبق */
export async function breachIncidentsReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.data_breach_incidents', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الترحيل */
export function resetBreachIncidentsCache() { ready = null }
