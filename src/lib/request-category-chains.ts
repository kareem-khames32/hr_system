// سلسلة اعتماد لكل فئة جوّه «بانِي الطلبات» (طلب المالك 26 سبتمبر): نداءات الخادم + دوال صافية للشاشة واختباراتها.
// النوع «ماشي على سلسلة الفئة» لو سلسلته = سلسلة فئته؛ غير كده «سلسلة خاصة». الخادم هو اللي بيحسب الوضع ويفرض القواعد.
// مسارات نسبية (لا @/) عشان اختبارات الخادم بتحمّل الملف ده.
import { apiFetch } from './api'
import { formatDate } from './dates'
import { categoryLabels } from '../data/requestsCatalog'
import { branchVersionsOfChain, type ApiChain } from '../components/approvals/chainEditorModel'

export type TypeChainMode = 'category' | 'custom' | 'none' | 'fixed'

export interface ApiCategoryChainSummary {
  id: number
  code: string
  nameAr: string
  branchId: number | null
  isActive: boolean
  autoApprove: boolean
  stepsCount: number
  stepRoles: string[]
  branchVersions: Array<{ id: number; branchId: number; isActive: boolean; stepsCount: number }>
}

export interface ApiCategoryChainEntry {
  category: string
  label: string
  // null = الفئة من غير سلسلة (كل طلب بسلسلته — الافتراضي للمالية)
  chainId: number | null
  // الربط بيشاور على سلسلة مش موجودة (أو مش ظاهرة للحساب)
  chainMissing: boolean
  // فئات تانية على نفس السلسلة (الإجازات والحضور مثلًا)
  sharedWith: string[]
  typeCount: number
  following: number
}

export interface ApiTypeChainInfo {
  id: number
  code: string
  category: string
  approvalChainId: number | null
  mode: TypeChainMode
  // سبب إن النوع مالوش سلسلة في إيده (تأجيل القسط، الخصم، المكافأة)
  fixedReason: string | null
  // أنواع تانية على نفس السلسلة
  chainSharedWith: number
  usageCount: number
  lastRequestAt: string | null
}

export interface ApiRequestCategoryMap {
  categories: ApiCategoryChainEntry[]
  chains: ApiCategoryChainSummary[]
  types: ApiTypeChainInfo[]
}

export interface SetCategoryChainBody {
  // سلسلة موجودة، أو null = الفئة من غير سلسلة
  chainId?: number | null
  // أو سلسلة جديدة بنسخ خطوات السلسلة دي (ونسخ فروعها)
  copyFromChainId?: number
  nameAr?: string
  // أنواع تانية من الفئة تتنقل (الماشيين على سلسلة الفئة القديمة بيتنقلوا لوحدهم)
  repointTypeIds?: number[]
}

export interface SetCategoryChainResult {
  category: string
  chainId: number | null
  previousChainId: number | null
  createdChain: { id: number; code: string; nameAr: string; stepsCount: number; branchVersions: number } | null
  repointed: Array<{ id: number; code: string; nameAr: string; fromChainId: number | null }>
}

export const fetchRequestCategoryMap = () => apiFetch<ApiRequestCategoryMap>('/settings/request-categories')

export const setCategoryChain = (category: string, body: SetCategoryChainBody) =>
  apiFetch<SetCategoryChainResult>(`/settings/request-categories/${encodeURIComponent(category)}/chain`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })

// «خصّص سلسلة للطلب ده»: سلسلة باسمه بنفس الخطوات الحالية (ونسخ الفروع)
export const customizeTypeChain = (typeId: number) =>
  apiFetch<{ typeId: number; code: string; previousChainId: number | null; branchVersions: number
    chain: { id: number; code: string; nameAr: string; branchId: number | null; stepsCount: number } }>(
    `/settings/request-types/${typeId}/customize-chain`, { method: 'POST' })

// «رجّعه لسلسلة الفئة»
export const followCategoryChain = (typeId: number) =>
  apiFetch<{ typeId: number; code: string; chainId: number; previousChainId: number | null; changed: boolean }>(
    `/settings/request-types/${typeId}/follow-category`, { method: 'POST' })

// ===== دوال صافية =====

export const categoryLabelOf = (category: string): string =>
  (categoryLabels as Record<string, string>)[category] ?? category

// أسماء الفئات اللي السلسلة دي سلسلتها
export const categoryChainLabelsOf = (map: ApiRequestCategoryMap | null | undefined, chainId: number): string[] =>
  (map?.categories ?? []).filter((entry) => entry.chainId === chainId).map((entry) => categoryLabelOf(entry.category))

// «15 طلب — آخر طلب 20 سبتمبر 2026» / «ولا طلب لحد دلوقتي»
export function usageText(count: number, lastAt: string | null): string {
  if (!count) return 'ولا طلب لحد دلوقتي'
  const total = count === 1 ? 'طلب واحد' : count === 2 ? 'طلبين' : `${count} طلب`
  return lastAt ? `${total} — آخر طلب ${formatDate(lastAt)}` : total
}

const stepsOf = (item: ApiChain) => [...item.steps]
  .sort((a, b) => a.stepOrder - b.stepOrder || a.id - b.id)
  .map((step) => [step.stepOrder, step.approverRole, step.specificEmployeeId ?? null, !!step.isParallel, step.thresholdField ?? null,
    step.thresholdOp ?? null, step.thresholdValue == null ? null : Number(step.thresholdValue), step.slaDays ?? null, step.escalateTo ?? null])

// بصمة السلسلة نفسها: الخطوات بالترتيب + التنفيذ الفوري (من غير نسخ الفروع)
export const chainStepsSignature = (chain: ApiChain): string => JSON.stringify([chain.isActive, chain.autoApprove, stepsOf(chain)])

// بصمة مسار الاعتماد كله: خطوات السلسلة + نسخ فروعها المفعّلة بخطواتها — سلسلتين بنفس البصمة = نفس السيناريو في كل فرع
export function chainFlowSignature(chain: ApiChain, chains: ApiChain[]): string {
  const versions = branchVersionsOfChain(chain, chains)
    .filter((version) => version.isActive)
    .sort((a, b) => Number(a.branchId) - Number(b.branchId))
    .map((version) => [version.branchId, version.autoApprove, stepsOf(version)])
  return JSON.stringify([chainStepsSignature(chain), versions])
}

export const sameApprovalFlow = (a: ApiChain | null | undefined, b: ApiChain | null | undefined, chains: ApiChain[]): boolean =>
  !!a && !!b && (a.id === b.id || chainFlowSignature(a, chains) === chainFlowSignature(b, chains))

// سلسلة لسه ما اتضبطتش: فاضية من غير تنفيذ فوري (الطلب واقف أصلًا)
export const chainUnset = (chain: ApiChain | null | undefined): boolean =>
  !chain || (chain.steps.length === 0 && !chain.autoApprove)

export type ConsolidationState =
  // النوع ماشي على السلسلة دي أصلًا
  | 'already'
  // ماشي على سلسلة الفئة الحالية — بيتنقل معاها تلقائي
  | 'follower'
  // سلسلته مش في إيده
  | 'fixed'
  // سلسلته لسه ما اتضبطتش
  | 'unset'
  // نفس السيناريو بالظبط (الخطوات ونسخ الفروع)
  | 'same'
  // نفس الخطوات، بس نسخ الفروع مختلفة (فرع هيتغير توجيهه لو اتنقل)
  | 'branches'
  // سيناريو مختلف — الأصل إنه يفضل على سلسلته إلا لو علّمت عليه
  | 'different'

export interface ConsolidationType {
  id: number
  isActive: boolean
  approvalChainId?: number | null
}

export function consolidationStateOf(
  type: ConsolidationType,
  info: Pick<ApiTypeChainInfo, 'mode'> | undefined,
  target: ApiChain | null,
  currentCategoryChainId: number | null,
  chains: ApiChain[],
  // الهدف سلسلة جديدة هتتنسخ من target: اللي على target نفسها مش «عليها أصلًا» — نفس الخطوات وبيتنقل للجديدة
  targetIsCopySource = false
): ConsolidationState {
  if (info?.mode === 'fixed') return 'fixed'
  const chainId = type.approvalChainId ?? null
  if (target && chainId === target.id && !targetIsCopySource) return 'already'
  // الماشي على سلسلة الفئة الحالية بيتنقل معاها لوحده (حتى لو النسخ من نفس السلسلة)
  if (currentCategoryChainId !== null && chainId === currentCategoryChainId) return 'follower'
  if (target && chainId === target.id) return 'same'
  const current = chainId === null ? null : chains.find((chain) => chain.id === chainId) ?? null
  if (chainUnset(current)) return 'unset'
  if (sameApprovalFlow(current, target, chains)) return 'same'
  return current && target && chainStepsSignature(current) === chainStepsSignature(target) ? 'branches' : 'different'
}

// الاختيار الافتراضي في «خلّي طلبات الفئة دي كلها على سلسلة واحدة»: المفعّل اللي مش متخصّص —
// سلسلته لسه ما اتضبطتش أو نفس السيناريو بالظبط. اللي سيناريوه مختلف (ولو في نسخ الفروع بس) بيفضل على سلسلته
// إلا لو علّمت عليه.
export const consolidationDefault = (type: ConsolidationType, state: ConsolidationState): boolean =>
  type.isActive && (state === 'unset' || state === 'same')
