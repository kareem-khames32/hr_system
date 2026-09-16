// B4 / الخطوات 19–21: لقطة السياسة على المسير، ووضع محرك الحساب وتقرير التكافؤ، ومجموعات شرائح التأخير المؤرخة.
// كل النداءات عبر apiFetch؛ الخادم هو المرجع في التحقق والأرقام.
import { apiFetch } from './api'

export type PayrollEngineMode = 'LEGACY' | 'SHADOW' | 'POLICY'
export const ENGINE_MODE_LABELS: Record<PayrollEngineMode, string> = {
  LEGACY: 'الحساب القديم وحده (بلا ظل)', SHADOW: 'ظل: المصروف القديم ومحرك السياسة بجانبه', POLICY: 'السياسة: المصروف من محرك السياسة',
}

export type LatenessTierMode = 'FRACTION' | 'MULTIPLIER' | 'MINUTES' | 'NONE'
export const LATENESS_TIER_MODE_LABELS: Record<LatenessTierMode, string> = {
  FRACTION: 'كسر من اليوم', MULTIPLIER: 'الدقائق × مضاعف', MINUTES: 'الدقائق × سعر الدقيقة', NONE: 'بلا خصم',
}
export interface LatenessTierRow { sequence: number; fromMinutes: number; toMinutes: number | null; mode: LatenessTierMode; value: string; label: string | null }
export interface LatenessTierSetSnapshot { setId: number | null; effectivePeriod: string | null; contentHash: string | null; source: string; tiers: LatenessTierRow[] }

export interface PayrollPolicySnapshot {
  schemaVersion: 1; capturedAt: string; capturedBy: number; period: string; dayBasis: string
  policy: { policyId: number; code: string; name: string; branchId: number | null; versionId: number; versionNo: number; revision: number; status: string
    effectiveFrom: string; publishedAt: string | null; sealHash: string | null; settingsStatus: string } | null
  values: Record<string, string | number | boolean | null>
  sources: Record<string, { kind: 'POLICY_VERSION' | 'CONFIG' | 'DEFAULT'; key: string }>
  latenessTiers: LatenessTierSetSnapshot
  fingerprint: string
}
export interface PayrollPolicySnapshotView {
  runId: number; status: string; stored: PayrollPolicySnapshot | null; storedHash: string | null
  current: PayrollPolicySnapshot; currentHash: string
  differences: Array<{ key: string; label: string; stored: string; current: string }>
  refreshRequired: boolean; canRefresh: boolean; labels: Record<string, string>
}

export interface PayrollParityComponentRow {
  code: string; label: string; legacy: string; policy: string | null; difference: string | null; differenceKey: string | null; reasonCode: string | null; reason: string | null
}
export interface PayrollParityEmployeeRow {
  employeeId: number; status: 'MATCHED' | 'DIFFERENT' | 'UNAVAILABLE' | 'ERROR'; attendanceShadowStatus: string
  components: PayrollParityComponentRow[]; unavailable: Array<{ components: string[]; code: string; message: string }>; error: { code: string; message: string } | null
  sourceIssueCodes?: string[]
}
// خطة المصادر: رمز مشكلة المصدر وعدد الموظفين الذين غابت قيمهم بسببه وطريق إصلاحه
export interface PayrollSourceReadinessRow { code: string; employees: number; employeeIds: number[]; remedy: string }
export interface PayrollParityReport {
  version: string; engineMode: PayrollEngineMode; paidResult: 'LEGACY' | 'POLICY'; snapshotVersion: number; policySnapshotHash: string | null; generatedAt: string
  totals: { employees: number; matched: number; different: number; unavailable: number; error: number; differences: number }
  rows: PayrollParityEmployeeRow[]; reportHash: string; message: string
  sourceReadiness?: PayrollSourceReadinessRow[]
}
// شروط الاعتماد من جهة تقرير التكافؤ (نفس فحص الخادم عند «اعتماد»)
export interface PayrollApprovalParityIssue {
  employeeId: number | null; component: string | null; label: string; legacy: string | null; policy: string | null; differenceKey: string | null; reasonCode: string | null
  issue: 'NO_ENGINE_MODE' | 'NO_SHADOW_REPORT' | 'INVALID_REPORT' | 'STALE_REPORT' | 'MISSING_EMPLOYEE' | 'UNEXPLAINED_DIFFERENCE' | 'UNEXPLAINED_UNAVAILABLE'; reason: string
}
export interface PayrollParityPendingGroup { reasonCode: string; count: number; unavailable: number; employees: number }
// سبب مكتوب لفرق واحد (موظف + بند) أو لمجموعة برمز سبب النظام
export type PayrollParityExplanationInput = { employeeId: number; component: string; reason: string } | { reasonCode: string; reason: string }
export interface PayrollParityExplanation {
  id: number; runId: number; snapshotVersion: number; employeeId: number; component: string; legacyAmount: string; policyAmount: string | null
  differenceKey: string; reason: string; explainedBy: number; explainedAt: string
}
export interface PayrollPolicySwitchIssue {
  employeeId: number | null; component: string | null; label: string; legacy: string | null; policy: string | null; differenceKey: string | null
  issue: 'NO_SHADOW_REPORT' | 'STALE_REPORT' | 'UNAVAILABLE' | 'UNEXPLAINED'; reason: string
}
export interface PayrollRunEngineView {
  mode: PayrollEngineMode | null; modeLabel: string; report: PayrollParityReport | null; explanations: PayrollParityExplanation[]
  switchIssues: PayrollPolicySwitchIssue[]; recalcRequired: boolean; policySnapshotHash: string | null
  approvalIssues?: PayrollApprovalParityIssue[]; approvalIssueCount?: number; approvalPendingGroups?: PayrollParityPendingGroup[]
}

const post = <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) })

export const fetchPayrollPolicySnapshot = (runId: number) => apiFetch<PayrollPolicySnapshotView>(`/payroll/runs/${runId}/policy-snapshot`)
export const explainPayrollParity = (runId: number, explanations: PayrollParityExplanationInput[]) =>
  post<PayrollRunEngineView>(`/payroll/runs/${runId}/parity-explanations`, { explanations })
export const setPayrollEngineMode = (runId: number, body: { mode: PayrollEngineMode; reason: string; explanations?: PayrollParityExplanationInput[] }) =>
  post<PayrollRunEngineView>(`/payroll/runs/${runId}/engine-mode`, body)

/** نص سبب النظام لرمز ما كما ورد في التقرير (أول بند يحمله). */
export function parityReasonText(report: PayrollParityReport | null, reasonCode: string): string | null {
  for (const row of report?.rows ?? []) for (const item of row.components) if (item.reasonCode === reasonCode && item.reason) return item.reason
  return null
}

/** المسير المعروض يحمل engine من /payroll/runs/:id. */
export const engineOf = (run: unknown): PayrollRunEngineView | null => {
  const engine = (run as { engine?: PayrollRunEngineView } | null)?.engine
  return engine && typeof engine === 'object' ? engine : null
}

/** فروق التكافؤ التي تحتاج سببًا (قيمة غائبة أو فرق) مع السبب المكتوب إن وُجد. */
export function parityDifferences(engine: PayrollRunEngineView | null) {
  if (!engine?.report) return []
  const explained = new Map(engine.explanations.map(row => [row.differenceKey, row]))
  return engine.report.rows.flatMap(row => row.components.filter(item => item.differenceKey !== null)
    .map(item => ({ employeeId: row.employeeId, status: row.status, ...item, explanation: explained.get(item.differenceKey!) ?? null })))
}

// ===== الخطوة 21: مجموعات شرائح التأخير المؤرخة =====
export interface LatenessTierSet {
  id: number; effectivePeriod: string; contentHash: string; source: string; reason: string; isActive: boolean; createdBy: number | null; createdAt: string
  supersedesSetId: number | null; deactivatedBy: number | null; deactivatedAt: string | null; deactivationReason: string | null
  tiers: LatenessTierRow[]; integrity: 'VERIFIED' | 'HASH_MISMATCH'
}
export interface LatenessTierSetsResponse {
  sets: LatenessTierSet[]
  legacyTiers: Array<{ id: number; fromMinutes: number; toMinutes: number | null; mode: string; value: number | string; isActive: boolean; label: string | null }>
  limits: { rows: number; maxMinutes: number; maxDayFraction: string; maxMultiplier: string; labelLength: number; reasonLength: number }
  savedId?: number
}
export interface LatenessTierDraftRow { fromMinutes: string; toMinutes: string; mode: LatenessTierMode; value: string; label: string }
export interface LatenessTierSetPreview {
  effectivePeriod: string; tiers: LatenessTierRow[]; gaps: Array<{ fromMinutes: number; toMinutes: number | null; message: string }>
  examples: Array<{ minutes: number; tierSequence: number | null; effect: string }>; contentHash: string
}
const tierBody = (rows: LatenessTierDraftRow[]) => rows.map(row => ({ fromMinutes: row.fromMinutes === '' ? null : Number(row.fromMinutes),
  toMinutes: row.toMinutes === '' ? null : Number(row.toMinutes), mode: row.mode, value: ['FRACTION', 'MULTIPLIER'].includes(row.mode) ? row.value : '0', label: row.label || null }))

export const fetchLatenessTierSets = () => apiFetch<LatenessTierSetsResponse>('/payroll/rules/lateness-tier-sets')
export const previewLatenessTierSet = (effectivePeriod: string, rows: LatenessTierDraftRow[]) =>
  post<LatenessTierSetPreview>('/payroll/rules/lateness-tier-sets/preview', { effectivePeriod, tiers: tierBody(rows) })
export const createLatenessTierSet = (effectivePeriod: string, rows: LatenessTierDraftRow[], reason: string) =>
  post<LatenessTierSetsResponse>('/payroll/rules/lateness-tier-sets', { effectivePeriod, tiers: tierBody(rows), reason })
export const deactivateLatenessTierSet = (id: number, reason: string) => post<LatenessTierSetsResponse>(`/payroll/rules/lateness-tier-sets/${id}/deactivate`, { reason })

export interface LatenessTierTrace {
  minutes: number; matched: boolean; sequence: number | null; fromMinutes: number | null; toMinutes: number | null
  mode: LatenessTierMode | 'NO_MATCH_PER_MINUTE'; value: string | null; label: string | null; dayRate: number; minuteRate: number; amount: number; formula: string
}
/** أثر الشريحة لكل يوم من تفصيل بند المسير المحفوظ (لا يُعاد حسابه في الواجهة). */
export function latenessTierEffects(breakdown: string | undefined | null) {
  try {
    const detail = JSON.parse(breakdown || '{}')
    const days = detail?.attendanceDeductions?.days
    if (!Array.isArray(days)) return null
    const rows = days.filter((day: { latenessTier?: LatenessTierTrace | null }) => day && day.latenessTier)
      .map((day: { date: string; latenessTier: LatenessTierTrace; latenessAmount: number }) => ({ date: day.date, trace: day.latenessTier, appliedAmount: day.latenessAmount }))
    return { set: detail.attendanceDeductions.latenessTierSet ?? null, rows }
  } catch { return null }
}
