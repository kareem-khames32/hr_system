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
// إعدادات نسخة السياسة (مرآة payroll-policy-settings.ts في الخادم؛ الخادم هو المرجع في التحقق).
export interface PayrollPolicySettingsInput {
  defaultPeriodType: 'CALENDAR_MONTH' | 'CUSTOM_DAY_RANGE' | 'SEMI_MONTHLY'
  cycleStartDay: number; cycleEndMode: 'DERIVED' | 'FIXED_DAY'; cycleEndDay: number | null
  baseDaysBasis: 'FIXED_30'; monthlyDays: number; dailyHours: number
  rateBase: 'GROSS' | 'BASIC'; roundingMode: 'HALF_UP' | 'HALF_EVEN' | 'FLOOR' | 'CEIL'; roundingScale: number
  divisionByZeroMode: 'ZERO_WITH_WARNING' | 'FAIL_ROW'
  maxDeductionPctOfGross: number | null; minNetGuarantee: number | null; netFloorPct: number | null
  carryOverExcess: boolean; skipAttendance: boolean; lateDeductionEnabled: boolean; currency: 'SAR' | 'EGP'
}
export type StoredPolicySettings = { [K in keyof PayrollPolicySettingsInput]?: PayrollPolicySettingsInput[K] | null }
export interface PayrollPolicyVersionSummary extends StoredPolicySettings {
  id: number; versionNo: number; revision: number; status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
  effectiveFrom: string; effectiveTo: string | null; frozenAt?: string | null; publishedAt?: string | null; publishedBy?: number | null
  // الخطوة 15: نهاية السريان الفعلية (نسخة منشورة لاحقة توقفها دون تعديل صفها) وختم المحتوى عند النشر.
  effectiveUntil?: string | null; supersededByVersionId?: number | null; contentHash?: string | null; sealedAt?: string | null
  metadata?: { title?: string | null; notes?: string | null } | null
  settingsStatus?: CompletionState; settingsIssues?: string[]
}
export interface PayrollPolicyCapabilities { canEdit: boolean; canCloneVersion?: boolean; canArchive?: boolean; canPublish?: boolean }
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

// ===== الخطوة 15: إنشاء المجموعة وتعديل نسخها ونشرها =====
export const POLICY_PERIOD_TYPE_LABELS: Record<PayrollPolicySettingsInput['defaultPeriodType'], string> = {
  CUSTOM_DAY_RANGE: 'دورة بيوم بداية محدد', CALENDAR_MONTH: 'شهر تقويمي', SEMI_MONTHLY: 'نصف شهري',
}
export const POLICY_STATUS_LABELS: Record<PayrollPolicyVersionSummary['status'], string> = { DRAFT: 'مسودة', ACTIVE: 'منشورة', ARCHIVED: 'مؤرشفة' }
export const DEFAULT_POLICY_SETTINGS: PayrollPolicySettingsInput = {
  defaultPeriodType: 'CUSTOM_DAY_RANGE', cycleStartDay: 23, cycleEndMode: 'DERIVED', cycleEndDay: null,
  baseDaysBasis: 'FIXED_30', monthlyDays: 30, dailyHours: 8, rateBase: 'GROSS', roundingMode: 'HALF_UP', roundingScale: 2,
  divisionByZeroMode: 'ZERO_WITH_WARNING', maxDeductionPctOfGross: null, minNetGuarantee: null, netFloorPct: null,
  carryOverExcess: false, skipAttendance: false, lateDeductionEnabled: true, currency: 'SAR',
}
export interface PayrollPolicyPublishIssue { code: string; message: string; suggestion?: string }
export interface PayrollPolicyPeriodPreview { reference: string; startDate: string; endDate: string }
export interface PayrollPolicyPublishCheck {
  policyId: number; versionId: number; revision: number; status: PayrollPolicyVersionSummary['status']
  publishable: boolean; canPublish: boolean; issues: PayrollPolicyPublishIssue[]; warnings: PayrollPolicyPublishIssue[]
  cycle: string | null; periods: PayrollPolicyPeriodPreview[]
  supersedes: { versionId: number; versionNo: number; effectiveFrom: string; effectiveTo: string | null; effectiveUntil?: string | null; newEffectiveTo: string }[]
  definitionStatus: CompletionState; collectionState: CompletionState
  effectiveUntil?: string | null; supersededByVersionId?: number | null
  integrity?: { sealVersion: string | null; contentHash: string | null; sealedAt: string | null; currentContentHash: string; matches: boolean } | null
}
export interface PayrollPolicyVersionEditResponse { policyId: number; version: PayrollPolicyVersionSummary; editKind: 'UPDATED' | 'CLONED' | 'PUBLISHED'; capabilities: PayrollPolicyCapabilities }
export interface CreatePayrollPolicyInput {
  // فارغ = يولّده الخادم (PS-YYYYMMDD-NN) بلا تصادم.
  code: string; name: string; description?: string | null; effectiveFrom: string; effectiveTo?: string | null
  settings: PayrollPolicySettingsInput; metadata?: { title?: string | null; notes?: string | null } | null
}
const policyPath = (policyId: number, versionId?: number) => `/payroll/policies/${policyId}${versionId == null ? '' : `/versions/${versionId}`}`
export const createPayrollPolicy = (input: CreatePayrollPolicyInput) =>
  apiFetch<PayrollPolicySummary>('/payroll/policies', { method: 'POST', body: JSON.stringify({ ...input, code: input.code.trim() || undefined, name: input.name.trim() }) })
export const updatePayrollPolicyVersion = (policyId: number, versionId: number, body: { expectedRevision: number; reason: string; settings?: PayrollPolicySettingsInput; effectiveFrom?: string; effectiveTo?: string | null }) =>
  apiFetch<PayrollPolicyVersionEditResponse>(policyPath(policyId, versionId), { method: 'PATCH', body: JSON.stringify({ ...body, reason: body.reason.trim() }) })
export const clonePayrollPolicyVersion = (policyId: number, sourceVersionId: number, expectedRevision: number, reason: string) =>
  apiFetch<PayrollPolicyVersionEditResponse>(`${policyPath(policyId)}/versions`, { method: 'POST', body: JSON.stringify({ sourceVersionId, expectedRevision, reason: reason.trim() }) })
export const fetchPayrollPolicyPublishCheck = (policyId: number, versionId: number) =>
  apiFetch<PayrollPolicyPublishCheck>(`${policyPath(policyId, versionId)}/publish-check`)
export const publishPayrollPolicyVersion = (policyId: number, versionId: number, expectedRevision: number, reason: string) =>
  apiFetch<PayrollPolicyVersionEditResponse & { contentHash: string; periods: PayrollPolicyPeriodPreview[] }>(`${policyPath(policyId, versionId)}/publish`, { method: 'POST', body: JSON.stringify({ expectedRevision, reason: reason.trim() }) })

/** إعدادات نسخة محفوظة كاملة أو null لو ناقصة (نسخة تاريخية تحتاج إرسال الحقول كلها). */
export function storedPolicySettings(version: PayrollPolicyVersionSummary): PayrollPolicySettingsInput | null {
  const keys = Object.keys(DEFAULT_POLICY_SETTINGS) as (keyof PayrollPolicySettingsInput)[]
  const nullable = new Set<keyof PayrollPolicySettingsInput>(['cycleEndDay', 'maxDeductionPctOfGross', 'minNetGuarantee', 'netFloorPct'])
  if (keys.some(key => version[key] == null && !nullable.has(key))) return null
  return Object.fromEntries(keys.map(key => [key, version[key] === undefined ? null : typeof DEFAULT_POLICY_SETTINGS[key] === 'number' && version[key] !== null ? Number(version[key]) : version[key]])) as unknown as PayrollPolicySettingsInput
}

const lastDayOf = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate()
const isoDate = (year: number, month: number, day: number) => `${year}-${String(month).padStart(2, '0')}-${String(Math.min(day, lastDayOf(year, month))).padStart(2, '0')}`

type CycleInput = Pick<PayrollPolicySettingsInput, 'defaultPeriodType' | 'cycleStartDay' | 'cycleEndMode' | 'cycleEndDay'>

/** يوم النهاية الوحيد الذي يصنع فترات متصلة (مرآة payrollCycleExpectedEndDay في الخادم). */
export const expectedPolicyCycleEndDay = (cycleStartDay: number) => cycleStartDay === 1 ? 31 : cycleStartDay - 1

/** سبب رفض دورة غير متصلة قبل الإرسال (مرآة payrollCycleSettingsIssue؛ الخادم هو المرجع). */
export function policyCycleIssue(settings: CycleInput): string | null {
  if (settings.defaultPeriodType !== 'CUSTOM_DAY_RANGE') return null
  if (!Number.isInteger(settings.cycleStartDay) || settings.cycleStartDay < 1 || settings.cycleStartDay > 31) return 'يوم بداية الدورة من 1 إلى 31.'
  if (settings.cycleEndMode === 'DERIVED') return null
  const expected = expectedPolicyCycleEndDay(settings.cycleStartDay)
  if (settings.cycleEndDay === expected) return null
  return `يوم النهاية يجب أن يكون ${expected} (اليوم السابق لبداية الدورة، ويُقص على آخر الشهر القصير). أي يوم آخر يترك أيامًا بلا مسير أو يكرر يومًا في مسيرين.`
}

/** وصف الدورة للعرض (الخادم يتحقق ويعرض الفترات الفعلية في مراجعة النشر). */
export function describePolicyCycle(settings: CycleInput): string {
  if (settings.defaultPeriodType === 'SEMI_MONTHLY') return 'نصف شهري: من 1 إلى 15 ومن 16 إلى آخر الشهر'
  if (settings.defaultPeriodType === 'CALENDAR_MONTH' || (settings.cycleStartDay === 1 && (settings.cycleEndMode === 'DERIVED' || settings.cycleEndDay === 31))) return 'شهر تقويمي: من أول الشهر إلى آخره'
  const end = settings.cycleEndMode === 'DERIVED' ? settings.cycleStartDay - 1 : settings.cycleEndDay
  if (end == null) return 'حدد يوم نهاية الدورة'
  return end <= settings.cycleStartDay ? `من يوم ${settings.cycleStartDay} إلى يوم ${end} من الشهر التالي` : `من يوم ${settings.cycleStartDay} إلى يوم ${end} من الشهر نفسه`
}

/** اقتراح بداية سريان = بداية أقرب فترة تبدأ اليوم أو بعده (مسير شهر كامل). */
export function suggestPolicyEffectiveFrom(settings: Pick<PayrollPolicySettingsInput, 'defaultPeriodType' | 'cycleStartDay' | 'cycleEndMode' | 'cycleEndDay'>, today: string): string {
  const year = Number(today.slice(0, 4)), month = Number(today.slice(5, 7)), day = Number(today.slice(8, 10))
  const candidates: string[] = []
  for (let delta = 0; delta <= 2; delta++) {
    const total = year * 12 + (month - 1) + delta, y = Math.floor(total / 12), m = (total % 12) + 1
    if (settings.defaultPeriodType === 'SEMI_MONTHLY') candidates.push(isoDate(y, m, 1), isoDate(y, m, 16))
    else if (settings.defaultPeriodType === 'CALENDAR_MONTH' || settings.cycleStartDay === 1) candidates.push(isoDate(y, m, 1))
    else {
      // نفس قاعدة الخادم للنهاية المشتقة والثابتة الصالحة: بداية الفترة = اليوم التالي لنهاية الفترة السابقة (أصغر: البداية − 1، آخر الشهر).
      const end = Math.min(settings.cycleStartDay - 1, lastDayOf(y, m))
      candidates.push(end === lastDayOf(y, m) ? isoDate(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, 1) : isoDate(y, m, end + 1))
    }
  }
  const todayIso = isoDate(year, month, day)
  return candidates.sort().find(value => value >= todayIso) ?? candidates.sort()[candidates.length - 1]
}

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
