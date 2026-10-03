import { inBranchScope, type BranchScope } from '../auth/guards'
import { FUNCTIONAL_APPROVER_ROLES, holdsFunctionalStep } from '../requests/approver-resolver.service'

// B1.11 / D05: خطوة وظيفية (موارد بشرية، مالية، IT، عهدة، رواتب، تنفيذي) بتتحل وقت الفعل لأي حساب نشط معاه صلاحيتها
// ونطاقه فيه فرع الطلب. لو مفيش ولا حساب كده في فرع، طلبات الفرع ده بتقف عند الخطوة ومحدش يشوفها غير مدير النظام
// (والموارد البشرية مابتفكّش الخطوة الوظيفية — stuckRequestIds للمعتمد المسمّى بس). المحرر بينبّه بس، مش بيمنع.
// مدير النظام مش بيتحسب حامل: بيعتمد أي خطوة، بس وجوده مش معناه إن الخطوة ليها صاحب.

export interface ChainHolderGap {
  stepId: number
  stepOrder: number
  // APPROVER = دور الخطوة نفسها، ESCALATION = جهة تصعيدها لما المهلة تعدّي
  kind: 'APPROVER' | 'ESCALATION'
  role: string
  // الفروع اللي مفيهاش حامل — بنطاق القارئ بس
  branches: Array<{ id: number; name: string }>
}

export interface ChainHolderAccount {
  role: string
  permissions: string[]
  // النطاق الفعّال (effectiveBranchScope): null = كل الفروع
  scope: BranchScope
}

const isFunctional = (role: string | null | undefined): role is string =>
  !!role && (FUNCTIONAL_APPROVER_ROLES as readonly string[]).includes(role)

/**
 * الثغرات لكل سلسلة (المفتاح رقم السلسلة؛ السلسلة اللي مفيهاش ثغرة مالهاش مفتاح).
 * فروع السلسلة: سلسلة الفرع = فرعها. السلسلة العامة = كل فرع شغال مالوش نسخة مفعّلة بنفس الكود (النسخة بتتقدم عليها —
 * resolveChain). السلسلة المعطّلة مابيتوجّهش عليها طلبات، فمالهاش تحذير.
 * holders: الحسابات النشطة غير مدير النظام بصلاحياتها النهائية ونطاقها. viewer: نطاق القارئ — فرع برّه نطاقه مايتذكرش.
 */
export function chainHolderGaps(input: {
  chains: Array<{ id: number; code: string; branchId: number | null; isActive: boolean }>
  steps: Array<{ id: number; chainId: number; stepOrder: number; approverRole: string; escalateTo?: string | null }>
  branches: Array<{ id: number; name: string; isActive: boolean }>
  holders: ChainHolderAccount[]
  viewer: BranchScope
}): Map<number, ChainHolderGap[]> {
  const gaps = new Map<number, ChainHolderGap[]>()
  const activeBranches = input.branches.filter((branch) => branch.isActive)
  const holdsIn = (role: string, branchId: number) =>
    input.holders.some((account) => holdsFunctionalStep(account, role) && inBranchScope(account.scope, branchId))
  for (const chain of input.chains) {
    if (!chain.isActive) continue
    const branches = (chain.branchId != null
      ? activeBranches.filter((branch) => branch.id === Number(chain.branchId))
      : activeBranches.filter((branch) => !input.chains.some((copy) =>
          copy.id !== chain.id && copy.isActive && copy.code === chain.code && copy.branchId != null && Number(copy.branchId) === branch.id)))
      .filter((branch) => inBranchScope(input.viewer, branch.id))
    if (branches.length === 0) continue
    const found: ChainHolderGap[] = []
    for (const step of input.steps.filter((row) => row.chainId === chain.id).sort((a, b) => a.stepOrder - b.stepOrder || a.id - b.id)) {
      const roles: Array<[ChainHolderGap['kind'], string | null | undefined]> = [['APPROVER', step.approverRole], ['ESCALATION', step.escalateTo]]
      for (const [kind, role] of roles) {
        if (!isFunctional(role)) continue
        const missing = branches.filter((branch) => !holdsIn(role, branch.id))
        if (missing.length) found.push({ stepId: step.id, stepOrder: step.stepOrder, kind, role, branches: missing.map(({ id, name }) => ({ id, name })) })
      }
    }
    if (found.length) gaps.set(chain.id, found)
  }
  return gaps
}
