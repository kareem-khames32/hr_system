import type { EntityManager } from 'typeorm'

// B4.5 (ج) — ترحيل 136: عمودين على leave_types برّه قراءة وكتابة النوع العادية (select/insert/update = false في الكيان)،
// عشان الكود يشتغل قبل الترحيل: قبل العمودين مفيش شرائح ولا حد مرات، والحفظ بقيمة ليهم بيترفض برسالة واضحة.
//  - entitlementTiers: شرائح الإجازة السنوية (JSON) — requests/leave-entitlement-tiers.ts
//  - maxTimesInService: أقصى مرات للإجازة طول الخدمة (المناسبة)

export interface LeaveTypeExtras { entitlementTiers: string | null; maxTimesInService: number | null }
export const LEAVE_TYPE_EXTRAS_MIGRATION = 'الخاصية دي محتاجة ترحيل 136 على قاعدة البيانات الأول'

let ready = false
export async function leaveTypeExtrasReady(em: EntityManager): Promise<boolean> {
  if (ready) return true
  const [row]: Array<{ ready: number }> = await em.query(
    `SELECT CASE WHEN COL_LENGTH(N'dbo.leave_types', N'entitlementTiers') IS NOT NULL AND COL_LENGTH(N'dbo.leave_types', N'maxTimesInService') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}

/** قيم العمودين لأنواع بالـid (أو لكل الأنواع). قبل الترحيل: خريطة فاضية */
export async function readLeaveTypeExtras(em: EntityManager, ids?: number[]): Promise<Map<number, LeaveTypeExtras>> {
  const out = new Map<number, LeaveTypeExtras>()
  if ((ids && !ids.length) || !(await leaveTypeExtrasReady(em))) return out
  const rows: Array<{ id: number; entitlementTiers: string | null; maxTimesInService: number | null }> = await em.query(
    `SELECT [id], [entitlementTiers], [maxTimesInService] FROM dbo.leave_types${ids ? ` WHERE [id] IN (${ids.map((_, index) => `@${index}`).join(', ')})` : ''}`, ids ?? [])
  for (const row of rows) {
    out.set(Number(row.id), { entitlementTiers: row.entitlementTiers ?? null, maxTimesInService: row.maxTimesInService == null ? null : Number(row.maxTimesInService) })
  }
  return out
}

/** كتابة اللي اتبعت بس من العمودين. قبل الترحيل: false (المنادي بيرفض لو فيه قيمة) */
export async function writeLeaveTypeExtras(em: EntityManager, id: number, patch: Partial<LeaveTypeExtras>): Promise<boolean> {
  const sets: string[] = [], params: unknown[] = [id]
  for (const column of ['entitlementTiers', 'maxTimesInService'] as const) {
    if (patch[column] === undefined) continue
    params.push(patch[column])
    sets.push(`[${column}] = @${params.length - 1}`)
  }
  if (!sets.length) return true
  if (!(await leaveTypeExtrasReady(em))) return false
  await em.query(`UPDATE dbo.leave_types SET ${sets.join(', ')} WHERE [id] = @0`, params)
  return true
}
