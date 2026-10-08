import type { EntityManager } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { userHasPerm } from '../auth/guards'

// B4.8 (أ): الإخفاء الجزئي للهوية والآيبان لغير المصرّح لهم (C-EG-08، C-SA-08) — ورا إعداد مقفول افتراضيًا.
// مقفول = زي الأول بالحرف: الهوية كاملة لكل من يشوف الموظف، والآيبان مشيول خالص عن غير المصرّح له بالبيانات المالية.
// مفتوح: الهوية والجواز كاملين لصاحب الملف وللي معاه «تعديل الموظفين» بس، وغيرهم بيشوف آخر 4 خانات؛ وغير المصرّح له بالمالية
// بيشوف الآيبان مخفي بدل ما يختفي. المخفي في خانة لوحدها (…Masked) والأصلية بتتشال — مفيش رقم مخفي بيرجع للخادم من شاشة تعديل.

export const PARTIAL_MASKING_KEY = 'privacy.partial_masking.enabled'
const DOT = '•'

/** «SA•• •••• 1234»: حرفي الدولة وآخر 4 خانات بس. الفاضي = null */
export function maskIbanPartial(value: unknown): string | null {
  const compact = String(value ?? '').replace(/[\s-]/g, '').toUpperCase()
  if (!compact) return null
  const country = /^[A-Z]{2}/.test(compact) ? compact.slice(0, 2) : DOT.repeat(2)
  return `${country}${DOT.repeat(2)} ${DOT.repeat(4)} ${compact.length > 6 ? compact.slice(-4) : DOT.repeat(4)}`
}

/** «•••••• 1234»: آخر 4 خانات بس (والرقم القصير كله مخفي). الفاضي = null */
export function maskIdentityPartial(value: unknown): string | null {
  const compact = String(value ?? '').replace(/\s/g, '')
  if (!compact) return null
  return `${DOT.repeat(6)} ${compact.length > 6 ? compact.slice(-4) : DOT.repeat(4)}`
}

/** يشوف الهوية والجواز كاملين لما الإخفاء مفتوح: صاحب الملف، أو اللي بيعدّل ملفات الموظفين */
export function canSeeFullIdentity(user: JwtPayload, employeeId: number): boolean {
  return user.employeeId === employeeId || userHasPerm(user, 'employees.edit')
}

/** الإعداد مفتوح؟ (بيتقري عند حدود الرد: القايمة والملف والتصدير) */
export async function partialMaskingOn(em: EntityManager): Promise<boolean> {
  const [row]: Array<{ value: string }> = await em.query('SELECT [value] FROM [requests_config] WHERE [key] = @0', [PARTIAL_MASKING_KEY])
  return row?.value === 'true'
}
