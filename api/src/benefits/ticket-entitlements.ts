import { Column, Entity, PrimaryGeneratedColumn, type EntityManager } from 'typeorm'

// B5.2 (ج): تذاكر السفر السنوية — استحقاق بالدرجة الوظيفية (عدد التذاكر في السنة، وهل بتشمل المعالين). تعريف واستحقاق بس:
// مفيش رصيد ولا حجز ولا صرف نقدي (قواعدهم سؤال للمالك). ميزة فرعية `benefits.tickets` مقفولة افتراضيًا.

export const TICKETS_FEATURE = 'benefits.tickets'

@Entity('ticket_entitlements')
export class TicketEntitlement {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_ticket_entitlements' })
  id: number

  /** الدرجة الوظيفية — صف واحد للدرجة (الخادم بيتأكد تحت قفل مدى) */
  @Column({ type: 'int' })
  gradeId: number

  @Column({ type: 'int' })
  ticketsPerYear: number

  /** الاستحقاق بيشمل معالين الموظف (تذكرة لكل معال) */
  @Column({ type: 'bit' })
  includesDependents: boolean

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  note: string | null

  @Column({ type: 'int' })
  updatedByUserId: number

  @Column({ type: 'datetime2' })
  updatedAt: Date
}

export const TICKETS_PER_YEAR_MAX = 12
export interface TicketFields { ticketsPerYear: number; includesDependents: boolean; note: string | null }
/** عدد التذاكر في السنة (0 = الدرجة مالهاش تذاكر، وبيشيل صفها)، وهل للمعالين، وملاحظة */
export function ticketFields(body: unknown): { fields: TicketFields | null; error: string | null } {
  const input = (body ?? {}) as Record<string, unknown>
  if (typeof input.ticketsPerYear !== 'number' || !Number.isInteger(input.ticketsPerYear) || input.ticketsPerYear < 0 || input.ticketsPerYear > TICKETS_PER_YEAR_MAX) {
    return { fields: null, error: `عدد التذاكر في السنة رقم صحيح من صفر لحد ${TICKETS_PER_YEAR_MAX}` }
  }
  if (input.includesDependents !== undefined && typeof input.includesDependents !== 'boolean') return { fields: null, error: '«تشمل المعالين» نعم أو لا' }
  if (input.note !== undefined && input.note !== null && typeof input.note !== 'string') return { fields: null, error: 'الملاحظة نص' }
  const note = typeof input.note === 'string' ? input.note.trim() : ''
  if (note.length > 300) return { fields: null, error: 'الملاحظة 300 حرف بالكتير' }
  return { fields: { ticketsPerYear: input.ticketsPerYear, includesDependents: input.includesDependents === true, note: note || null }, error: null }
}

let ready: boolean | null = null
/** جدول ترحيل 148 موجود؟ الموجود بيتحفظ؛ الناقص بيتفحص مع كل نداء لحد ما الترحيل يتطبق */
export async function ticketEntitlementsReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.ticket_entitlements', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الترحيل */
export function resetTicketEntitlementsCache() { ready = null }
