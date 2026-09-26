import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { inBranchScope } from '../auth/guards'
import type { BranchScope } from '../auth/guards'

// فرع الأصل (تدقيق الأدوار D3 — ترحيل 20260922_065): قاعدة واحدة لسجل الأصول ودورة العهدة.
// النطاق هو ناتج branchScopeOf كما هو: null = كل الفروع، مصفوفة = الفروع دي (فرع أو أكتر)، والمصفوفة الفاضية = نطاق
// فاضي مايشوفش حاجة. مفيش فحص على اسم الدور هنا ولا عند أي مستدعٍ — الحكم على قيمة النطاق بس.
export type { BranchScope }
type Branched = { branchId?: number | null }

export const ASSET_NOT_FOUND = 'الأصل غير موجود'
export const CUSTODY_NOT_FOUND = 'الإسناد غير موجود'
export const ASSET_UNBRANCHED_READ_ONLY = 'الأصل ده لسه مالوش فرع — بيتعدّل ويتسلّم من حساب نطاقه كل الفروع بس، وهو اللي يحدد فرعه'
export const ASSET_BRANCH_ALL_BRANCHES_ONLY = 'تحديد فرع الأصل أو تغييره لحساب نطاقه كل الفروع بس'
export const CUSTODY_CROSS_BRANCH = 'الأصل تابع لفرع غير فرع الموظف — العهدة بتتسلّم جوه الفرع الواحد؛ النقل بين فرعين من حساب نطاقه كل الفروع'

const branchOf = (row: Branched | null | undefined): number | null => (row?.branchId == null ? null : Number(row.branchId))

/** يشوف الأصل: حساب كل الفروع، أو أصل من فروعه، أو أصل قديم بلا فرع (قراءة بس). النطاق الفاضي مايشوفش حاجة. */
export const assetVisibleTo = (scope: BranchScope, asset: Branched): boolean =>
  scope === null || (scope.length > 0 && (branchOf(asset) === null || inBranchScope(scope, branchOf(asset))))

/** يكتب على الأصل: حساب كل الفروع، أو أصل مختوم بفرع من فروعه. الأصل القديم بلا فرع لحساب كل الفروع بس. */
export const assetWritableBy = (scope: BranchScope, asset: Branched): boolean =>
  scope === null || (branchOf(asset) !== null && inBranchScope(scope, branchOf(asset)))

/** موظف العهدة جوه نطاق السائل. */
export const employeeInScope = (scope: BranchScope, employee: Branched | null | undefined): boolean =>
  scope === null || (!!employee && inBranchScope(scope, branchOf(employee)))

/** قراءة: الأصل الغايب والأصل الخارج عن النطاق نفس الرد بالحرف (لا كاشف وجود). */
export function assertAssetVisible<T extends Branched>(scope: BranchScope, asset: T | null | undefined): T {
  if (!asset || !assetVisibleTo(scope, asset)) throw new NotFoundException(ASSET_NOT_FOUND)
  return asset
}

/** كتابة: نفس رد الغايب للخارج عن النطاق؛ والأصل القديم بلا فرع (اللي السائل شايفه أصلًا) بسببه الصريح. */
export function assertAssetWritable<T extends Branched>(scope: BranchScope, asset: T | null | undefined): T {
  const visible = assertAssetVisible(scope, asset)
  if (!assetWritableBy(scope, visible)) throw new ForbiddenException(ASSET_UNBRANCHED_READ_ONLY)
  return visible
}

/**
 * عهدة جديدة (إسناد مباشر أو طلب عهدة): الأصل وموظفه في نفس الفرع. أصل بلا فرع يسلّمه حساب كل الفروع بس
 * (وبيتختم بفرع الموظف). يرجّع سبب الرفض أو null.
 */
export function custodyBranchProblem(scope: BranchScope, asset: Branched, employee: Branched): string | null {
  if (branchOf(asset) === null) return scope === null ? null : ASSET_UNBRANCHED_READ_ONLY
  return branchOf(asset) === branchOf(employee) ? null : CUSTODY_CROSS_BRANCH
}

/** نقل عهدة نشطة بين موظفين: جوه الفرع لأي صاحب صلاحية في نطاقه، وبين فرعين لحساب نطاقه كل الفروع بس. */
export function custodyTransferProblem(scope: BranchScope | undefined, owner: Branched, target: Branched): string | null {
  if (branchOf(owner) === branchOf(target)) return null
  return scope === null ? null : 'نقل العهدة يتطلب موظفين في نفس الفرع — النقل بين فرعين من حساب نطاقه كل الفروع'
}

/**
 * تحديد/تغيير فرع أصل (حساب كل الفروع): أصل في عهدة مفتوحة أو مع حامل لازم فرعه = فرع صاحب العهدة،
 * عشان الأصل مايبقاش في فرع وحامله في فرع تاني. holders = فروع أصحاب العهد المفتوحة والحامل الحالي.
 */
export function assetBranchMoveProblem(targetBranchId: number, holders: ReadonlyArray<Branched>): string | null {
  return holders.some(holder => branchOf(holder) !== targetBranchId)
    ? 'الأصل في عهدة موظف من فرع تاني — رجّع العهدة أو انقلها الأول، أو اختار فرع صاحب العهدة'
    : null
}

export function assertAllBranches(scope: BranchScope): void {
  if (scope !== null) throw new ForbiddenException(ASSET_BRANCH_ALL_BRANCHES_ONLY)
}

export function assertValidBranchId(value: unknown): number {
  const id = Number(value)
  if (!Number.isSafeInteger(id) || id < 1) throw new BadRequestException('الفرع غير صالح')
  return id
}
