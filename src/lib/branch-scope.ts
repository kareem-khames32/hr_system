// نطاق فروع الحساب في الواجهة — مرآة branchScopeOf في الخادم (api/src/auth/guards.ts). الخادم هو اللي بيفرض النطاق؛
// هنا عشان القوائم والمنتقيات تعرض فروع الحساب بس وتخفي اللي برّه.
// null = كل الفروع (مدير النظام أو «كل الفروع»)، مصفوفة = الفروع دي بالظبط (فرع أو أكتر — «اختيار الفروع بعلامات صح»)،
// والمصفوفة الفاضية = ولا فرع (حساب مش مربوط بفرع) — **مش «الكل» أبدًا**.
import type { CurrentUser } from './api'

export type BranchScope = null | number[]

// أرقام فروع صالحة (صحيحة موجبة) من غير تكرار — أي قيمة تانية بتتشال
const validBranchIds = (raw: unknown[]): number[] => {
  const ids: number[] = []
  for (const value of raw) {
    if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && !ids.includes(value)) ids.push(value)
  }
  return ids
}

// نطاق الحساب من بيانات الجلسة: الفروع اللي رجعت مع الدخول (branchIds)، ولو الجلسة أقدم من الخاصية دي = فرعه بس.
// مفيش جلسة = ولا فرع.
export function branchScopeOfUser(
  user: Pick<CurrentUser, 'role' | 'branchId' | 'scopeAllBranches' | 'branchIds'> | null | undefined
): BranchScope {
  if (!user) return []
  if (user.role === 'super_admin' || user.scopeAllBranches === true) return null
  if (Array.isArray(user.branchIds)) return validBranchIds(user.branchIds)
  const branchId = Number(user.branchId)
  return Number.isSafeInteger(branchId) && branchId > 0 ? [branchId] : []
}

// الفرع ده جوه النطاق؟ null = كل الفروع؛ سجل بلا فرع مش جوه أي نطاق مقفول
export const canSeeBranch = (scope: BranchScope, branchId: number | null | undefined): boolean =>
  scope === null || (branchId != null && scope.includes(Number(branchId)))
