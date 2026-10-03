import { Injectable, StreamableFile, type CallHandler, type ExecutionContext, type NestInterceptor } from '@nestjs/common'
import { InjectEntityManager } from '@nestjs/typeorm'
import { from, mergeMap, type Observable } from 'rxjs'
import type { EntityManager } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf } from '../auth/guards'
import { hiddenRunPeriodsByEmployee, scrubRunLineKey, scrubRunPeriods } from './payroll-run-visibility'

// نص فيه فترة مسير («مسير 2026-07») — من غيره الرد بيرجع زي ما هو من غير أي استعلام
const RUN_PERIOD_HINT = /مسير \d{4}-\d{2}/

const positiveId = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) > 0

/** الموظف اللي الكائن ده بيخصه: employeeId، أو رقم الكائن employee اللي جواه */
function ownEmployeeId(value: object): number | null {
  const row = value as { employeeId?: unknown; employee?: unknown }
  if (positiveId(row.employeeId)) return row.employeeId
  const employee = row.employee as { id?: unknown } | null | undefined
  return employee && typeof employee === 'object' && positiveId(employee.id) ? employee.id : null
}

/** كل موظف في الرد نفسه (employeeId أو employee.id في أي عمق) — مش من الطلب: الطلب في إيد المستخدم */
export function responseEmployeeIds(value: unknown, out = new Set<number>()): Set<number> {
  if (Array.isArray(value)) for (const item of value) responseEmployeeIds(item, out)
  else if (value && typeof value === 'object') {
    const own = ownEmployeeId(value)
    if (own != null) out.add(own)
    for (const field of Object.values(value)) responseEmployeeIds(field, out)
  }
  return out
}

/**
 * نسخة من الرد (JSON خام): كل نص جوه كائن بيخص موظف (أقرب كائن فيه employeeId أو employee.id) بيتحجب بفترات المسيرات المخفية
 * لموظفه هو بس — مش باتحاد الرد كله، فنص موظف مايتغيرش حسب مسيرات موظف تاني. المفتاح (key واسم الخاصية) بالبصمة المعتمة.
 * النص برّه أي موظف زي ما هو (الحجب جوه القارئ نفسه).
 */
export function scrubResponseRunPeriods(value: unknown, hiddenByEmployee: ReadonlyMap<number, ReadonlySet<string>>,
  hidden: ReadonlySet<string> | null = null): unknown {
  if (typeof value === 'string') return hidden?.size ? scrubRunPeriods(value, hidden) : value
  if (Array.isArray(value)) return value.map(item => scrubResponseRunPeriods(item, hiddenByEmployee, hidden))
  if (!value || typeof value !== 'object') return value
  const own = ownEmployeeId(value)
  const scope = own != null ? hiddenByEmployee.get(own) ?? null : hidden
  const copy: Record<string, unknown> = {}
  for (const [key, field] of Object.entries(value)) {
    const name = scope?.size && RUN_PERIOD_HINT.test(key) ? scrubRunLineKey(key, scope) : key
    copy[name] = key === 'key' && typeof field === 'string' && scope?.size ? scrubRunLineKey(field, scope) : scrubResponseRunPeriods(field, hiddenByEmployee, scope)
  }
  return copy
}

/**
 * CR40 (شبكة أمان لصنف التسريب): أي رد JSON لحساب فرع فيه «مسير YYYY-MM» — نص كل موظف في الرد بيتحجب منه فترات المسيرات المخفية للحساب
 * لموظفه ده (hiddenRunPeriodsByEmployee: الموظف نفسه بيشوف مسيراته، والشركة بتشوف الكل).
 * CR41: الموظفين من الرد بس (مش من ?employeeId= في الطلب)، وكل موظف بفتراته هو (مش اتحاد الرد)، فالرد مايتغيرش حسب موظف مايخصّوش.
 * الحجب الأساسي جوه كل قارئ زي ما هو؛ ده للنص اللي يفلت من قارئ. الرد من غير النمط، أو من غير موظفين، أو لحساب الشركة، أو من غير فترة
 * مخفية بيرجع هو نفسه بالظبط. الملفات والتيارات مابتتلمسش.
 */
@Injectable()
export class HiddenRunPeriodsInterceptor implements NestInterceptor {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle()
    const user = context.switchToHttp().getRequest()?.user as JwtPayload | undefined
    if (!user || branchScopeOf(user) === null) return next.handle()
    return next.handle().pipe(mergeMap(body => from(this.scrub(user, body))))
  }

  async scrub(user: JwtPayload, body: unknown): Promise<unknown> {
    if (!body || typeof body !== 'object' || body instanceof StreamableFile || Buffer.isBuffer(body) || typeof (body as { pipe?: unknown }).pipe === 'function') return body
    let json: string
    try { json = JSON.stringify(body) } catch { return body }
    if (typeof json !== 'string' || !RUN_PERIOD_HINT.test(json)) return body
    // نفس اللي هيتبعت بالظبط (toJSON والتواريخ) قبل الحجب
    const value: unknown = JSON.parse(json)
    const employeeIds = responseEmployeeIds(value)
    if (!employeeIds.size) return body
    const hidden = await hiddenRunPeriodsByEmployee(this.em, branchScopeOf(user), employeeIds, user.employeeId ?? null)
    return hidden.size ? scrubResponseRunPeriods(value, hidden) : body
  }
}
