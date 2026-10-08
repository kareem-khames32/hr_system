import { BadRequestException } from '@nestjs/common'
import { Column, Entity, PrimaryGeneratedColumn, type EntityManager } from 'typeorm'
import type { Request } from '../requests/entities/request.entity'
import type { RequestType } from '../requests/entities/request-type.entity'
import { assertHumanApproval } from './human-approval'

// B5.3 (ب): سلفة المأمورية — طلب عادي في محرك الطلبات (وجهة `travel_advance`): الاعتماد النهائي بيسجّل سلفة «مفتوحة» من غير قيد في الدفتر
//  (السلفة بتتصرف نقدًا برّه المسير، والمالية بتسجّل صرفها). التسوية في اعتماد تقرير المصروفات المربوطة بيه (expense-reports.ts).
//  ورا نفس الميزة الفرعية `expenses.reports`. كله بـem بس: مفيش نداء لخدمة تانية جوه معاملة.

export const TRAVEL_ADVANCE_HANDLER = 'travel_advance'
/** من العميل (غير «السبب» المشترك): المبلغ وفترة المأمورية الاختيارية */
export const TRAVEL_ADVANCE_CLIENT_KEYS = ['amount', 'tripFrom', 'tripTo'] as const
export const ADVANCE_MIGRATION_MISSING = 'جدول سلف المأموريات ناقص — طبّق ترحيل 152 الأول'
export const ADVANCE_NOT_FOUND = 'سلفة المأمورية مش موجودة'
export const ADVANCE_AMOUNT = 'مبلغ السلفة موجب بخانتين عشريتين بالكتير (لحد 999999.99)'
export const ADVANCE_PURPOSE = 'اكتب غرض المأمورية في خانة السبب (من حرفين لحد 200 حرف)'
export const ADVANCE_AMOUNT_MAX = 999_999.99
export const ADVANCE_STATUS_LABELS: Record<string, string> = { OPEN: 'مفتوحة', SETTLED: 'اتسوّت بتقرير', RETURNED: 'اترجّعت نقدًا' }

@Entity('travel_advances')
export class TravelAdvance {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_travel_advances' })
  id: number

  @Column({ type: 'int' })
  employeeId: number

  /** بعملة فرع الموظف */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number

  @Column({ type: 'nvarchar', length: 200 })
  purpose: string

  /** OPEN مفتوحة · SETTLED اتسوّت في اعتماد تقرير مصروفات · RETURNED اترجّعت نقدًا */
  @Column({ type: 'nvarchar', length: 20 })
  status: string

  /** الطلب اللي السلفة اتعتمدت بيه — سلفة واحدة للطلب */
  @Column({ type: 'int' })
  requestId: number

  /** الصرف النقدي: المالية بتسجّله. سلفة مااتصرفتش ماتتربطش بتقرير */
  @Column({ type: 'datetime2', nullable: true })
  paidAt: Date | null

  @Column({ type: 'int', nullable: true })
  paidByUserId: number | null

  /** تقرير المصروفات المربوطة بيه (والاتسوّت فيه) */
  @Column({ type: 'int', nullable: true })
  reportId: number | null

  @Column({ type: 'datetime2', nullable: true })
  closedAt: Date | null

  @Column({ type: 'int', nullable: true })
  closedByUserId: number | null

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  closeNote: string | null

  @Column({ type: 'datetime2' })
  createdAt: Date
}

export const advanceCode = (id: number) => `ADV-${String(id).padStart(5, '0')}`

/** مبلغ السلفة وغرضها من حمولة الطلب، أو رسالة الخطأ */
export function advanceValues(payload: Record<string, unknown>): { amount: number; purpose: string } {
  const text = typeof payload.amount === 'number' ? String(payload.amount) : typeof payload.amount === 'string' ? payload.amount.trim() : ''
  const amount = /^\d{1,6}(\.\d{1,2})?$/.test(text) ? Number(text) : NaN
  if (!(amount > 0) || amount > ADVANCE_AMOUNT_MAX) throw new BadRequestException(ADVANCE_AMOUNT)
  const purpose = typeof payload.reason === 'string' ? payload.reason.trim().replace(/\s+/g, ' ') : ''
  if (purpose.length < 2 || purpose.length > 200) throw new BadRequestException(ADVANCE_PURPOSE)
  return { amount, purpose }
}

let ready: boolean | null = null
/** جدول ترحيل 152 موجود؟ الموجود بيتحفظ؛ الناقص بيتفحص مع كل نداء لحد ما الترحيل يتطبق */
export async function travelAdvancesReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.travel_advances', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الترحيل */
export function resetTravelAdvancesCache() { ready = null }

const payloadOf = (raw: string | null | undefined): Record<string, unknown> => {
  try { const value: unknown = JSON.parse(raw || '{}'); return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {} } catch { return {} }
}

/** التقديم (وكل إعادة تقديم): نفس فحوص الاعتماد النهائي بدري، والمبلغ بيتخزّن رقم */
export async function stageTravelAdvance(em: EntityManager, req: Pick<Request, 'payload'>): Promise<Record<string, unknown>> {
  if (!(await travelAdvancesReady(em))) throw new BadRequestException(ADVANCE_MIGRATION_MISSING)
  const payload = payloadOf(req.payload)
  return { ...payload, amount: advanceValues(payload).amount }
}

/**
 * التنفيذ عند الاعتماد النهائي، جوه معاملة الاعتماد وصف الطلب مقفول: سلفة «مفتوحة» لمقدّم الطلب بالمبلغ المعتمد — من غير قيد في الدفتر.
 * تنفيذ اتعاد بيرجّع السلفة نفسها (سلفة واحدة للطلب).
 */
export async function executeTravelAdvance(em: EntityManager, req: Request, _type: RequestType, payload: Record<string, unknown>): Promise<{ ref: string; completed: boolean; note?: string }> {
  if (!(await travelAdvancesReady(em))) throw new BadRequestException(ADVANCE_MIGRATION_MISSING)
  const advances = em.getRepository(TravelAdvance)
  const made = await advances.findOne({ where: { requestId: req.id } })
  if (made) return { ref: advanceCode(made.id), completed: true }
  // السلفة فلوس بتطلع نقدًا: نفس شرط المراجعة البشرية بتاع تقرير المصروفات (Codex P5A-B01)
  await assertHumanApproval(em, req)
  const values = advanceValues(payload)
  const advance = await advances.save(advances.create({ employeeId: req.requesterId, amount: values.amount, purpose: values.purpose, status: 'OPEN', requestId: req.id, paidAt: null, paidByUserId: null,
    reportId: null, closedAt: null, closedByUserId: null, closeNote: null, createdAt: new Date() }))
  return { ref: advanceCode(advance.id), completed: true, note: `سلفة مأمورية ${advanceCode(advance.id)} بمبلغ ${values.amount} — تتصرف نقدًا وتتسوّى بتقرير مصروفات` }
}

/** السلفة المفتوحة المربوطة بتقرير، تحت قفل صفها (بعد قفل صف التقرير)؛ قبل ترحيل 152 مفيش سلف */
export async function attachedAdvance(em: EntityManager, reportId: number): Promise<TravelAdvance | null> {
  if (!(await travelAdvancesReady(em))) return null
  return em.getRepository(TravelAdvance).findOne({ where: { reportId, status: 'OPEN' }, order: { id: 'ASC' }, lock: { mode: 'pessimistic_write' } })
}

/** سلف الموظف المفتوحة (لبند إخلاء الطرف عند فتح ملف إنهاء الخدمة) */
export async function openAdvancesOf(em: EntityManager, employeeId: number): Promise<{ count: number; total: number }> {
  if (!(await travelAdvancesReady(em))) return { count: 0, total: 0 }
  const [row]: Array<{ n: number; total: string | number | null }> = await em.query(`SELECT COUNT(*) AS [n], SUM([amount]) AS [total] FROM dbo.travel_advances WHERE [employeeId] = @0 AND [status] = N'OPEN'`, [employeeId])
  return { count: Number(row?.n ?? 0), total: Math.round(Number(row?.total ?? 0) * 100) / 100 }
}
