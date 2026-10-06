import type { EntityManager } from 'typeorm'

// B2.6-ب (ترحيل 090): تفويض الاعتمادات.
//  المفوِّض (موظف خطوات اعتماد مسمّاة باسمه) بيحدد بديل واحد لفترة. طول الفترة، الخطوة اللي مستنياه بتبقى مستنية بديله كمان، والقرار
//  بيتسجّل «بالنيابة عن». القاعدة بتتقري وقت الصندوق والقرار والبريد (من ApproverResolver.holdsStep)، والخطوات المحفوظة مابتتكتبش من جديد.
//  خطوات الأدوار الوظيفية (موارد بشرية، مالية…) بالصلاحية، فمالهاش تفويض. والتفويض مابيتنقلش: بديل البديل مش بديل للمفوِّض.
//  الجدول والعمود برّه مسار الكود قبل الترحيل: كل قراءة هنا بعد التأكد من وجودهم.

export const DELEGATION_MIGRATION_MISSING = 'تفويض الاعتمادات محتاج ترحيل 20261005_090 على قاعدة البيانات'
export const DELEGATION_NOT_FOUND = 'التفويض غير موجود'
/** أقصى فترة تفويض بالأيام (الطرفين داخلين) */
export const DELEGATION_DAYS_MAX = 366

let ready: boolean | null = null

/** جدول التفويضات وعمود «بالنيابة عن» موجودين (ترحيل 090)؟ الموجود بيتحفظ (المخطط مابيتشالش). الناقص مابيتحفظش: بيتفحص مع
 * كل نداء، فعملية شغالة من قبل الترحيل بتشوفه أول ما يتطبق وماتكمّلش بحكم «قبل الترحيل» على حاجة اتعملت بعده (Codex CRP2N-B01). */
export async function delegationSchemaReady(em: EntityManager): Promise<boolean> {
  if (ready === true) return true
  const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.approval_delegations', N'U') IS NOT NULL
    AND COL_LENGTH(N'dbo.request_approvals', N'onBehalfOfEmployeeId') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
  ready = Number(row?.ready) === 1
  return ready
}

/** للاختبارات: نسيان حالة الجدول */
export function resetDelegationSchemaCache() { ready = null }

/** تاريخ محلي YYYY-MM-DD (ممنوع toISOString على «الآن») */
export const delegationLocalDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export interface ActiveDelegation {
  id: number
  delegatorEmployeeId: number
  delegateEmployeeId: number
  /** null = كل فئات الطلبات */
  categories: string[] | null
}

/** فئات التفويض المتخزنة (JSON): قايمة مش فاضية، أو null لكل الفئات */
export function delegationCategories(raw: unknown): string[] | null {
  if (typeof raw !== 'string' || !raw) return null
  try {
    const parsed = JSON.parse(raw)
    const list = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string' && !!item) : []
    return list.length ? list : null
  } catch { return null }
}

type DelegationRow = { id: number; delegatorEmployeeId: number; delegateEmployeeId: number; categories: string | null }
const activeOf = (row: DelegationRow): ActiveDelegation => ({ id: Number(row.id), delegatorEmployeeId: Number(row.delegatorEmployeeId),
  delegateEmployeeId: Number(row.delegateEmployeeId), categories: delegationCategories(row.categories) })
// ساري: مش ملغي، والتاريخ جوه الفترة (الطرفين داخلين)، والمفوِّض لسه موظف شغال — اللي ساب الشغل خطواته «واقفة» وبتروح للموارد البشرية
// زي الأول، وبديله مابيكمّلش باسمه
const ACTIVE_ON = `d.[revokedAt] IS NULL AND d.[startDate] <= @0 AND d.[endDate] >= @0`
const DELEGATOR_ACTIVE = `EXISTS (SELECT 1 FROM [employees] e WHERE e.[id] = d.[delegatorEmployeeId] AND e.[isActive] = 1)`
const COLUMNS = `d.[id], d.[delegatorEmployeeId], d.[delegateEmployeeId], d.[categories]`

/** التفويضات السارية في اليوم ده اللي الموظف بديل فيها — فاضي لحساب من غير موظف، وقبل الترحيل */
export async function activeDelegationsTo(em: EntityManager, delegateEmployeeId: number | null | undefined, day = delegationLocalDate(new Date())): Promise<ActiveDelegation[]> {
  if (!delegateEmployeeId || !(await delegationSchemaReady(em))) return []
  const rows: DelegationRow[] = await em.query(
    `SELECT ${COLUMNS} FROM [approval_delegations] d WHERE ${ACTIVE_ON} AND ${DELEGATOR_ACTIVE} AND d.[delegateEmployeeId] = @1 ORDER BY d.[id]`, [day, delegateEmployeeId])
  return rows.map(activeOf)
}

/** التفويضات اللي فترتها سارية في اليوم ده من مجموعة مفوِّضين: مرشّحي بريد «طلب بانتظارك» بس — الحكم لكل حساب من delegationContext (activeDelegationsTo) */
export async function activeDelegationsFrom(em: EntityManager, delegatorEmployeeIds: readonly number[], day = delegationLocalDate(new Date())): Promise<ActiveDelegation[]> {
  const ids = [...new Set(delegatorEmployeeIds)]
  if (!ids.length || !(await delegationSchemaReady(em))) return []
  const out: ActiveDelegation[] = []
  for (let offset = 0; offset < ids.length; offset += 1000) {
    const part = ids.slice(offset, offset + 1000)
    const rows: DelegationRow[] = await em.query(
      `SELECT ${COLUMNS} FROM [approval_delegations] d WHERE ${ACTIVE_ON} AND d.[delegatorEmployeeId] IN (${part.map((_, index) => `@${index + 1}`).join(', ')}) ORDER BY d.[id]`, [day, ...part])
    out.push(...rows.map(activeOf))
  }
  return out
}

/** المفوِّضين اللي تفويضاتهم دي بتغطّي فئة الطلب */
export const delegatorsForCategory = (delegations: readonly ActiveDelegation[], category: string | null | undefined): Set<number> =>
  new Set(delegations.filter(row => row.categories === null || (!!category && row.categories.includes(category))).map(row => row.delegatorEmployeeId))

/**
 * قرار البديل: «بالنيابة عن» المفوِّض على سطر التدقيق اللي لسه مكتوب في نفس المعاملة (العمود برّه الكيان عشان الكود يشتغل قبل الترحيل،
 * فبيتكتب بعد الإدراج مباشرة). السطر بعد كده زي باقي سجل التدقيق: لا تعديل ولا مسح.
 */
export async function recordOnBehalf(em: EntityManager, approvalId: number, delegatorEmployeeId: number): Promise<void> {
  await em.query(`UPDATE [request_approvals] SET [onBehalfOfEmployeeId] = @1 WHERE [id] = @0 AND [onBehalfOfEmployeeId] IS NULL`, [approvalId, delegatorEmployeeId])
}

/** الحساب اعتمد خطوة في الطلب ده بالنيابة قبل كده؟ (قبل الترحيل مفيش قرار بالنيابة أصلًا) */
export async function approvedOnBehalfIn(em: EntityManager, requestId: number, userId: number): Promise<boolean> {
  if (!(await delegationSchemaReady(em))) return false
  const rows: unknown[] = await em.query(
    `SELECT TOP (1) [id] FROM [request_approvals] WHERE [requestId] = @0 AND [approverId] = @1 AND [onBehalfOfEmployeeId] IS NOT NULL
       AND [action] IN (N'APPROVED', N'APPROVE', N'APPPROVE')`, [requestId, userId])
  return rows.length > 0
}

/** سطور التدقيق اللي اتاخدت بالنيابة: رقم السطر ← المفوِّض */
export async function onBehalfOfApprovals(em: EntityManager, approvalIds: readonly number[]): Promise<Map<number, number>> {
  const out = new Map<number, number>()
  if (!approvalIds.length || !(await delegationSchemaReady(em))) return out
  for (let offset = 0; offset < approvalIds.length; offset += 1000) {
    const part = approvalIds.slice(offset, offset + 1000)
    const rows: Array<{ id: number; employeeId: number }> = await em.query(
      `SELECT [id], [onBehalfOfEmployeeId] AS [employeeId] FROM [request_approvals] WHERE [onBehalfOfEmployeeId] IS NOT NULL AND [id] IN (${part.map((_, index) => `@${index}`).join(', ')})`, [...part])
    for (const row of rows) out.set(Number(row.id), Number(row.employeeId))
  }
  return out
}
