// نطاق فروع الحساب في الواجهة — مرآة branchScopeOf في الخادم (الخادم هو اللي بيفرض؛ هنا لإظهار الصفوف والأزرار بس).
// null = على مستوى الشركة (مدير النظام أو حساب فتح له مدير النظام «كل الفروع»)، وإلا قائمة الفروع اللي يشوفها
// (فاضية = حساب مش مربوط بفرع: مايشوفش صفوف فروع). القائمة عشان الحساب اللي نطاقه أكتر من فرع.
import type { CurrentUser } from './api'

export type BranchScope = null | number[]

export function branchScopeOfUser(
  user: Pick<CurrentUser, 'role' | 'branchId' | 'scopeAllBranches'> | null | undefined
): BranchScope {
  if (!user) return []
  if (user.role === 'super_admin' || user.scopeAllBranches === true) return null
  const branchId = Number(user.branchId)
  return Number.isInteger(branchId) && branchId > 0 ? [branchId] : []
}

export const canSeeBranch = (scope: BranchScope, branchId: number | null | undefined): boolean =>
  scope === null || (branchId != null && scope.includes(Number(branchId)))
