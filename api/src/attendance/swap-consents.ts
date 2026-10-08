import { BadRequestException } from '@nestjs/common'
import { Column, Entity, PrimaryGeneratedColumn, type EntityManager } from 'typeorm'
import type { Request } from '../requests/entities/request.entity'

// B5.5 (ج): تبديل الوردية بموافقة الطرف التاني — طلب «تبديل وردية» القايم كان بيتنفّذ بموافقة المدير بس. ميزة فرعية `shifts.swap_consent`
//  (مقفولة افتراضيًا): عند كل تقديم بيتسجّل صف موافقة «مستني» للطرف التاني، وتنفيذ التبديل بعد الاعتماد النهائي بيشترط إنه وافق.
//  طلب اتقدّم والميزة مقفولة مالوش صف، فبيتنفّذ زي الأول بالحرف. كله بـem بس.

export const SWAP_CONSENT_FEATURE = 'shifts.swap_consent'
export const SWAP_CONSENT_PENDING = 'الطرف التاني في التبديل لسه ماوافقش — الطلب بيتنفّذ بعد موافقته'
export const SWAP_CONSENT_DECLINED = 'الطرف التاني رفض تبديل الوردية — ارفض الطلب، أو رجّعه لمقدّمه'
export const SWAP_CONSENT_NOT_FOUND = 'طلب التبديل مش موجود'
export const SWAP_CONSENT_STATUS_LABELS: Record<string, string> = { PENDING: 'مستني ردّك', ACCEPTED: 'وافقت', DECLINED: 'رفضت' }

@Entity('shift_swap_consents')
export class ShiftSwapConsent {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_shift_swap_consents' })
  id: number

  /** طلب «تبديل وردية» — صف واحد للطلب */
  @Column({ type: 'int' })
  requestId: number

  /** الطرف التاني في التبديل (payload.withEmployeeId وقت آخر تقديم) */
  @Column({ type: 'int' })
  partnerEmployeeId: number

  /** PENDING مستني · ACCEPTED وافق · DECLINED رفض */
  @Column({ type: 'nvarchar', length: 20 })
  status: string

  @Column({ type: 'nvarchar', length: 300, nullable: true })
  note: string | null

  @Column({ type: 'datetime2', nullable: true })
  decidedAt: Date | null

  @Column({ type: 'datetime2' })
  createdAt: Date
}

let ready: boolean | null = null
/** جدول ترحيل 166 موجود؟ */
export async function swapConsentsReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.shift_swap_consents', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}
/** للاختبارات: نسيان حالة الترحيل */
export function resetSwapConsentsCache() { ready = null }

/** قرار الطرف التاني: موافق أو لأ، وملاحظة اختيارية */
export function consentFields(body: unknown): { fields: { accept: boolean; note: string | null } | null; error: string | null } {
  const input = (body ?? {}) as Record<string, unknown>
  if (typeof input.accept !== 'boolean') return { fields: null, error: 'اختار: موافق أو مش موافق' }
  if (input.note !== undefined && input.note !== null && typeof input.note !== 'string') return { fields: null, error: 'الملاحظة نص' }
  const note = typeof input.note === 'string' ? input.note.trim().replace(/\s+/g, ' ') : ''
  if (note.length > 300) return { fields: null, error: 'الملاحظة 300 حرف بالكتير' }
  return { fields: { accept: input.accept, note: note || null }, error: null }
}

/**
 * التقديم (وكل إعادة تقديم) لطلب تبديل وردية والميزة مفتوحة، جوه معاملة التقديم وصف الطلب مقفول: صف الموافقة بيرجع «مستني» للطرف التاني
 * الحالي — كل تقديم محتاج موافقة جديدة (تفاصيل التبديل ممكن تكون اتغيّرت). والميزة مقفولة أو الترحيل ناقص: ولا حاجة.
 */
export async function stageSwapConsent(em: EntityManager, req: Pick<Request, 'id' | 'payload'>, featureOn: boolean): Promise<void> {
  if (!featureOn || !(await swapConsentsReady(em))) return
  let partner = NaN
  try { partner = Number(JSON.parse(req.payload || '{}').withEmployeeId) } catch { /* الحمولة اتفحصت قبل كده */ }
  if (!Number.isSafeInteger(partner) || partner < 1) return
  const [existing]: Array<{ id: number }> = await em.query('SELECT [id] FROM dbo.shift_swap_consents WITH (UPDLOCK, HOLDLOCK) WHERE [requestId] = @0 ORDER BY [id]', [req.id])
  const repo = em.getRepository(ShiftSwapConsent)
  if (existing) await repo.update({ id: Number(existing.id) }, { partnerEmployeeId: partner, status: 'PENDING', note: null, decidedAt: null })
  else await repo.save(repo.create({ requestId: req.id, partnerEmployeeId: partner, status: 'PENDING', note: null, decidedAt: null, createdAt: new Date() }))
}

/**
 * قبل تنفيذ التبديل (الاعتماد النهائي)، جوه معاملته وصف الطلب مقفول: لو للطلب صف موافقة لازم يكون «وافق» وللطرف التاني نفسه اللي في الحمولة.
 * طلب من غير صف (اتقدّم والميزة مقفولة) بيتنفّذ زي الأول.
 */
export async function assertSwapConsent(em: EntityManager, req: Pick<Request, 'id'>, partnerEmployeeId: number): Promise<void> {
  if (!(await swapConsentsReady(em))) return
  const [row]: Array<{ status: string; partnerEmployeeId: number }> = await em.query('SELECT [status], [partnerEmployeeId] FROM dbo.shift_swap_consents WITH (UPDLOCK, ROWLOCK) WHERE [requestId] = @0 ORDER BY [id]', [req.id])
  if (!row) return
  if (row.status === 'DECLINED') throw new BadRequestException(SWAP_CONSENT_DECLINED)
  if (row.status !== 'ACCEPTED' || Number(row.partnerEmployeeId) !== partnerEmployeeId) throw new BadRequestException(SWAP_CONSENT_PENDING)
}
