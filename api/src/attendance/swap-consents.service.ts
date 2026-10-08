import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { consentFields, ShiftSwapConsent, SWAP_CONSENT_NOT_FOUND, SWAP_CONSENT_STATUS_LABELS, swapConsentsReady } from './swap-consents'

// B5.5 (ج): موافقة الطرف التاني على تبديل الوردية — الموظف بيشوف طلبات التبديل اللي هو طرف فيها وبيوافق أو يرفض. القرار تحت قفل صف الطلب ثم
// صف الموافقة، والطلب لازم يكون لسه تحت الاعتماد. طلب مش هو طرف فيه زي اللي مش موجود.

const NOT_EMPLOYEE = 'حسابك مش مربوط بملف موظف'
const MIGRATION_MISSING = 'جدول موافقات تبديل الوردية ناقص — طبّق ترحيل 166 الأول'
const REQUEST_CLOSED = 'الطلب مابقاش تحت الاعتماد — مفيش قرار يتسجّل عليه'
const ALREADY_DECIDED = 'سجّلت قرارك على الطلب ده قبل كده'
const OPEN = ['SUBMITTED', 'UNDER_REVIEW']

@Injectable()
export class SwapConsentsService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  /** طلبات التبديل اللي صاحب الحساب طرف تاني فيها: مين طالب، وتاريخ ورديته وورديتك، وحالة الطلب، وقرارك */
  async mine(user: JwtPayload) {
    if (!user.employeeId) throw new ForbiddenException(NOT_EMPLOYEE)
    const em = this.ds.manager
    if (!(await swapConsentsReady(em))) return { ready: false, rows: [] }
    const rows: Array<{ requestId: number; status: string; note: string | null; decidedAt: Date | null; requestStatus: string; payload: string | null; requesterName: string | null; createdAt: Date }> = await em.query(
      `SELECT c.[requestId], c.[status], c.[note], c.[decidedAt], r.[status] AS [requestStatus], r.[payload], e.[fullName] AS [requesterName], c.[createdAt]
       FROM dbo.shift_swap_consents c INNER JOIN dbo.requests r ON r.[id] = c.[requestId] LEFT JOIN dbo.employees e ON e.[id] = r.[requesterId]
       WHERE c.[partnerEmployeeId] = @0 ORDER BY c.[id] DESC`, [Number(user.employeeId)])
    return { ready: true, rows: rows.slice(0, 100).map(row => {
      let payload: Record<string, unknown> = {}
      try { payload = JSON.parse(row.payload || '{}') } catch { /* حمولة قديمة */ }
      const date = typeof payload.date === 'string' ? payload.date : null
      return { requestId: Number(row.requestId), requesterName: row.requesterName ?? null, date, withDate: typeof payload.withDate === 'string' ? payload.withDate : date, status: row.status,
        statusLabel: SWAP_CONSENT_STATUS_LABELS[row.status] ?? row.status, note: row.note ?? null, decidedAt: row.decidedAt ?? null,
        // القرار متاح والطلب لسه تحت الاعتماد وقرارك لسه مااتسجّلش
        open: OPEN.includes(row.requestStatus) && row.status === 'PENDING', requestStatus: row.requestStatus }
    }) }
  }

  /** قرار الطرف التاني على طلب تبديل هو طرف فيه (غير كده «مش موجود»): مرة واحدة، والطلب لسه تحت الاعتماد */
  async decide(user: JwtPayload, requestId: number, body: unknown) {
    if (!user.employeeId) throw new ForbiddenException(NOT_EMPLOYEE)
    const { fields, error } = consentFields(body)
    if (!fields) throw new BadRequestException(error)
    return this.ds.transaction(async em => {
      if (!(await swapConsentsReady(em))) throw new BadRequestException(MIGRATION_MISSING)
      // ترتيب الأقفال زي محرك الطلبات: صف الطلب ثم صف الموافقة
      const [request]: Array<{ id: number; status: string }> = await em.query('SELECT [id], [status] FROM dbo.requests WITH (UPDLOCK, ROWLOCK) WHERE [id] = @0', [requestId])
      const row = request ? await em.getRepository(ShiftSwapConsent).findOne({ where: { requestId }, order: { id: 'ASC' }, lock: { mode: 'pessimistic_write' } }) : null
      if (!request || !row || row.partnerEmployeeId !== Number(user.employeeId)) throw new NotFoundException(SWAP_CONSENT_NOT_FOUND)
      if (!OPEN.includes(request.status)) throw new ConflictException(REQUEST_CLOSED)
      if (row.status !== 'PENDING') throw new ConflictException(ALREADY_DECIDED)
      await em.getRepository(ShiftSwapConsent).update({ id: row.id }, { status: fields.accept ? 'ACCEPTED' : 'DECLINED', note: fields.note, decidedAt: new Date() })
      return { requestId, status: fields.accept ? 'ACCEPTED' : 'DECLINED' }
    })
  }
}
