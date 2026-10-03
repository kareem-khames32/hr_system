import { Injectable, StreamableFile, type CallHandler, type ExecutionContext, type NestInterceptor } from '@nestjs/common'
import { InjectEntityManager } from '@nestjs/typeorm'
import { from, mergeMap, type Observable } from 'rxjs'
import type { EntityManager } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf } from '../auth/guards'
import { hiddenRunPeriodsUnion, scrubRunLineKey, scrubRunPeriods } from './payroll-run-visibility'

// نص فيه فترة مسير («مسير 2026-07») — من غيره الرد بيرجع زي ما هو من غير أي استعلام
const RUN_PERIOD_HINT = /مسير \d{4}-\d{2}/

const positiveId = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) > 0

/** كل employeeId (رقم موجب) في أي عمق من الرد، ورقم أي كائن تحت employee */
export function responseEmployeeIds(value: unknown, out = new Set<number>()): Set<number> {
  if (Array.isArray(value)) for (const item of value) responseEmployeeIds(item, out)
  else if (value && typeof value === 'object') {
    for (const [key, field] of Object.entries(value)) {
      if (key === 'employeeId' && positiveId(field)) out.add(field)
      else {
        if (key === 'employee' && field && typeof field === 'object' && positiveId((field as { id?: unknown }).id)) out.add((field as { id: number }).id)
        responseEmployeeIds(field, out)
      }
    }
  }
  return out
}

/** نسخة من الرد (JSON خام) كل نص فيها من غير فترة مسير مخفي: المفتاح (key واسم الخاصية) ببصمة معتمة عشان يفضل مميز، والباقي بالوصف العام */
export function scrubResponseRunPeriods(value: unknown, hidden: ReadonlySet<string>): unknown {
  if (typeof value === 'string') return scrubRunPeriods(value, hidden)
  if (Array.isArray(value)) return value.map(item => scrubResponseRunPeriods(item, hidden))
  if (!value || typeof value !== 'object') return value
  const copy: Record<string, unknown> = {}
  for (const [key, field] of Object.entries(value)) {
    copy[RUN_PERIOD_HINT.test(key) ? scrubRunLineKey(key, hidden) : key] =
      key === 'key' && typeof field === 'string' ? scrubRunLineKey(field, hidden) : scrubResponseRunPeriods(field, hidden)
  }
  return copy
}

/**
 * CR40 (شبكة أمان لصنف التسريب): أي رد JSON لحساب فرع فيه «مسير YYYY-MM» — فترة أي مسير مخفي للحساب لموظفي الرد (كل employeeId في أي عمق)
 * بتتحجب من كل نص في الرد، بنفس قاعدة الحجب في القراءات (hiddenRunPeriodsByEmployee: الموظف نفسه بيشوف مسيراته، والشركة بتشوف الكل).
 * الحجب الأساسي جوه كل قارئ زي ما هو؛ ده للنص اللي يفلت من قارئ. الرد من غير النمط، أو من غير موظفين، أو لحساب الشركة، أو من غير فترة مخفية
 * بيرجع هو نفسه بالظبط. الملفات والتيارات مابتتلمسش.
 */
@Injectable()
export class HiddenRunPeriodsInterceptor implements NestInterceptor {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle()
    const request = context.switchToHttp().getRequest()
    const user = request?.user as JwtPayload | undefined
    if (!user || branchScopeOf(user) === null) return next.handle()
    // الموظف اللي الطلب عنه (?employeeId= أو :employeeId) — مع اللي في الرد
    const asked = [request?.query?.employeeId, request?.params?.employeeId].map(Number).filter(id => Number.isSafeInteger(id) && id > 0)
    return next.handle().pipe(mergeMap(body => from(this.scrub(user, body, asked))))
  }

  async scrub(user: JwtPayload, body: unknown, askedEmployeeIds: readonly number[] = []): Promise<unknown> {
    if (!body || typeof body !== 'object' || body instanceof StreamableFile || Buffer.isBuffer(body) || typeof (body as { pipe?: unknown }).pipe === 'function') return body
    let json: string
    try { json = JSON.stringify(body) } catch { return body }
    if (typeof json !== 'string' || !RUN_PERIOD_HINT.test(json)) return body
    // نفس اللي هيتبعت بالظبط (toJSON والتواريخ) قبل الحجب
    const value: unknown = JSON.parse(json)
    const employeeIds = responseEmployeeIds(value, new Set(askedEmployeeIds))
    if (!employeeIds.size) return body
    const hidden = await hiddenRunPeriodsUnion(this.em, user, employeeIds)
    return hidden.size ? scrubResponseRunPeriods(value, hidden) : body
  }
}
