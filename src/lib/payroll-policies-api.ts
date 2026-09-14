import { apiFetch, ApiError } from './api'

export const COLLECTION_SCHEMA_VERSION = 'SRS_COLLECTION_V1_20260913' as const
export const COLLECTION_KINDS = ['STATUTORY', 'COURT_ORDER', 'UNPAID_NON_ENTITLEMENT', 'ATTENDANCE', 'RECOVERY', 'TYPED', 'ADMINISTRATIVE', 'LOAN', 'OTHER'] as const
export type CollectionKind = typeof COLLECTION_KINDS[number]
export const COLLECTION_LABELS: Record<CollectionKind, string> = {
  STATUTORY: 'استقطاعات نظامية', COURT_ORDER: 'أحكام قضائية', UNPAID_NON_ENTITLEMENT: 'عدم استحقاق / إجازة بلا أجر',
  ATTENDANCE: 'خصومات الحضور', RECOVERY: 'استردادات', TYPED: 'خصومات مصنفة', ADMINISTRATIVE: 'خصومات إدارية', LOAN: 'أقساط السلف', OTHER: 'خصومات أخرى',
}
export const isProtectedCollectionKind = (kind: string) => ['STATUTORY', 'COURT_ORDER', 'UNPAID_NON_ENTITLEMENT'].includes(kind)
export type CompletionState = 'MISSING' | 'INVALID' | 'COMPLETE'
export interface PayrollPolicyVersionSummary {
  id: number; versionNo: number; revision: number; status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
  effectiveFrom: string; effectiveTo: string | null; frozenAt?: string | null; publishedAt?: string | null; publishedBy?: number | null
  metadata?: { title?: string | null; notes?: string | null } | null
}
export interface PayrollPolicyCapabilities { canEdit: boolean; canCloneVersion?: boolean; canArchive?: boolean }
export interface PayrollPolicySummary {
  policy: { id: number; code: string; name: string; branchId: number | null; isActive: boolean }
  versions: PayrollPolicyVersionSummary[]; capabilities: PayrollPolicyCapabilities
}
export interface CollectionComponent {
  code: string; nameAr: string; componentType: 'EARNING' | 'DEDUCTION' | 'INFO'; stage: number; sequence: number
  valueSource: string; ledgerDirection: 'DEBIT' | 'CREDIT' | null; carryOverEligible: boolean; isActive: boolean
}
export interface PayrollCollection {
  schemaVersion: typeof COLLECTION_SCHEMA_VERSION
  classifications: { componentCode: string; kind: CollectionKind }[]
  collectionOrder: string[]
}
export interface PayrollCollectionView {
  policyId: number; versionId: number; revision: number; contractVersion?: string
  version?: PayrollPolicyVersionSummary
  settingsStatus: CompletionState; settingsIssues?: (string | { message: string })[]
  definitionStatus: CompletionState; definitionIssues?: string[]
  definition: { components: CollectionComponent[]; parameters: unknown[]; tierSets: unknown[] }
  collectionState: CompletionState; collectionIssues: { code: string; message: string; path: string }[]
  collection: PayrollCollection | null; capabilities: PayrollPolicyCapabilities
}
export interface PayrollCollectionSaveResponse extends PayrollCollectionView {
  version: PayrollPolicyVersionSummary; editKind: 'UPDATED' | 'CLONED'
}
export interface CollectionDraft { classifications: { componentCode: string; kind: CollectionKind | '' }[]; collectionOrder: string[] }

const collectionPath = (policyId: number, versionId: number) => `/payroll/policies/${policyId}/versions/${versionId}/collection`
export const fetchPayrollPolicies = (signal?: AbortSignal) => apiFetch<PayrollPolicySummary[]>('/payroll/policies', { signal })
export const fetchPayrollPolicy = (policyId: number, signal?: AbortSignal) => apiFetch<PayrollPolicySummary>(`/payroll/policies/${policyId}`, { signal })
export const fetchPayrollPolicyCollection = (policyId: number, versionId: number, signal?: AbortSignal) => apiFetch<PayrollCollectionView>(collectionPath(policyId, versionId), { signal })
export const savePayrollPolicyCollection = (policyId: number, versionId: number, expectedRevision: number, reason: string, collection: PayrollCollection) =>
  apiFetch<PayrollCollectionSaveResponse>(collectionPath(policyId, versionId), { method: 'PATCH', body: JSON.stringify({ expectedRevision, reason: reason.trim(), collection }) })

export function payrollPoliciesError(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) return 'تعذر العثور على واجهة سياسات الرواتب أو النسخة المطلوبة. حدّث خدمة النظام إن لم يكن هذا القسم متاحًا، ثم أعد تحميل السياسات.'
  return error instanceof Error ? error.message : 'تعذر تحميل سياسات الرواتب. حاول مجددًا.'
}
export const isLoanCollectionComponent = (component: CollectionComponent) => component.valueSource === 'LEDGER' && component.ledgerDirection === 'DEBIT'
export const collectionDeductions = (components: CollectionComponent[]) => components.filter(component => component.componentType === 'DEDUCTION')

export function synchronizeCollectionOrder(draft: CollectionDraft): CollectionDraft {
  const allowed = draft.classifications.filter(item => item.kind && !isProtectedCollectionKind(item.kind)).map(item => item.componentCode)
  const order = [...new Set(draft.collectionOrder.filter(code => allowed.includes(code)))]
  return { classifications: draft.classifications.map(item => ({ ...item })), collectionOrder: [...order, ...allowed.filter(code => !order.includes(code))] }
}
export function createCollectionDraft(view: PayrollCollectionView): CollectionDraft {
  const saved = new Map(view.collection?.classifications.map(item => [item.componentCode, item.kind]) ?? [])
  return synchronizeCollectionOrder({
    classifications: collectionDeductions(view.definition.components).map(component => ({ componentCode: component.code,
      kind: isLoanCollectionComponent(component) ? 'LOAN' : (saved.get(component.code) ?? ''), })),
    collectionOrder: [...(view.collection?.collectionOrder ?? [])],
  })
}
export function changeCollectionKind(draft: CollectionDraft, components: CollectionComponent[], code: string, kind: CollectionKind | ''): CollectionDraft {
  const component = components.find(item => item.code === code)
  if (!component || component.componentType !== 'DEDUCTION' || isLoanCollectionComponent(component) || kind === 'LOAN') return draft
  return synchronizeCollectionOrder({ ...draft, classifications: draft.classifications.map(item => item.componentCode === code ? { ...item, kind } : item) })
}
export function moveCollectionItem(draft: CollectionDraft, code: string, direction: -1 | 1): CollectionDraft {
  const order = [...draft.collectionOrder], current = order.indexOf(code), target = current + direction
  if (current < 0 || target < 0 || target >= order.length) return draft
  ;[order[current], order[target]] = [order[target], order[current]]
  return { ...draft, collectionOrder: order }
}
export function proposeCollectionOrder(draft: CollectionDraft, proposal: 'LOAN_FIRST' | 'ATTENDANCE_RECOVERY_FIRST'): CollectionDraft {
  const kinds = new Map(draft.classifications.map(item => [item.componentCode, item.kind]))
  const first = (code: string) => proposal === 'LOAN_FIRST' ? kinds.get(code) === 'LOAN' : ['ATTENDANCE', 'RECOVERY'].includes(kinds.get(code) ?? '')
  return { ...draft, collectionOrder: [...draft.collectionOrder.filter(first), ...draft.collectionOrder.filter(code => !first(code))] }
}
export function collectionDraftIssues(draft: CollectionDraft, components: CollectionComponent[]): string[] {
  const deductions = collectionDeductions(components), issues: string[] = []
  if (draft.classifications.length !== deductions.length || new Set(draft.classifications.map(item => item.componentCode)).size !== deductions.length) issues.push('يلزم تصنيف كل بند خصم مرة واحدة.')
  for (const component of deductions) {
    const kind = draft.classifications.find(item => item.componentCode === component.code)?.kind
    if (!kind || !COLLECTION_KINDS.includes(kind)) { issues.push(`اختر تصنيف «${component.nameAr}».`); continue }
    if (isLoanCollectionComponent(component) !== (kind === 'LOAN')) issues.push(`تصنيف السلف لا يطابق مصدر «${component.nameAr}».`)
    if ((isProtectedCollectionKind(kind) || kind === 'ATTENDANCE') && component.carryOverEligible) issues.push(`«${component.nameAr}» يسمح بترحيل المتبقي؛ هذا لا يتوافق مع التصنيف المختار. يلزم تعديل تعريف البند أو اختيار تصنيفه الصحيح.`)
    if (kind === 'LOAN' && !component.carryOverEligible) issues.push(`تعريف «${component.nameAr}» يجب أن يسمح بترحيل أصل السلفة المتبقي.`)
  }
  const reducibles = draft.classifications.filter(item => item.kind && !isProtectedCollectionKind(item.kind)).map(item => item.componentCode)
  if (new Set(draft.collectionOrder).size !== draft.collectionOrder.length || draft.collectionOrder.length !== reducibles.length || draft.collectionOrder.some(code => !reducibles.includes(code))) issues.push('يجب أن يحتوي الترتيب على كل خصم قابل للترتيب مرة واحدة، دون البنود المحمية.')
  return issues
}
export function collectionPayload(draft: CollectionDraft, components: CollectionComponent[]): PayrollCollection {
  const issues = collectionDraftIssues(draft, components)
  if (issues.length) throw new Error(issues.join(' '))
  return { schemaVersion: COLLECTION_SCHEMA_VERSION, classifications: draft.classifications.map(item => ({ componentCode: item.componentCode, kind: item.kind as CollectionKind })), collectionOrder: [...draft.collectionOrder] }
}
