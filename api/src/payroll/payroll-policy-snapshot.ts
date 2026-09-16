import { BadRequestException, ConflictException } from '@nestjs/common'
import { createHash } from 'node:crypto'
import { In, type EntityManager } from 'typeorm'
import { RequestsConfig } from '../requests/entities/requests-config.entity'
import { readPayrollLatenessTierSetById, type PayrollLatenessTierSetSnapshot, PAYROLL_LATENESS_TIER_MODE_LABELS } from './payroll-lateness-tiers'
import { PayrollPolicy, PayrollPolicyVersion } from './payroll-policy.entities'
import { PayrollPolicyVersionSeal } from './payroll-policy-seal.entities'
import { inspectPayrollPolicySettings, PAYROLL_POLICY_CONFIG_KEYS, parsePayrollPolicyConfigValue } from './payroll-policy-settings'

/**
 * الخطوة 19 — لقطة السياسة على المسير: نسخة السياسة وإعدادات الحساب وشرائح التأخير وأساس الأيام وبصمة واحدة.
 * أول حساب يلتقطها، وإعادة الحساب تقرأ منها (لا من payroll.monthly_days أو attendance.absence_penalty_days الحية)،
 * والتحديث بطلب صريح ببصمة الإعدادات الحالية بعد عرض فروقها.
 * حقول نسخة السياسة المنشورة (ساعات اليوم، خصم التأخير، أساس الأيام، العملة، أرضية الصافي وسقف الخصم) تتقدم على الإعداد العام،
 * وبقية القيم من الإعداد العام وقت الالتقاط؛ مصدر كل قيمة محفوظ في sources.
 */
export const PAYROLL_RUN_POLICY_SNAPSHOT_SCHEMA = 1 as const

export interface PayrollRunPolicyValues {
  monthlyDays: number
  dailyHours: number
  lateDeductionEnabled: boolean
  shortfallEnabled: boolean
  shortfallMode: 'MINUTES' | 'MULTIPLIER' | 'FRACTION'
  shortfallValue: number
  overlapPolicy: 'CUMULATIVE' | 'MAX_OF_BOTH' | 'NET_OF_LATENESS'
  dailyCapDays: number
  earlyLeaveDeductionEnabled: boolean
  absencePenaltyDays: number
  exemptOvertimeEligible: boolean
  exemptUnpaidLeaveDeductible: boolean
  currency: string | null
  minNetGuarantee: string | null
  netFloorPct: string | null
  maxDeductionPctOfGross: string | null
}
export type PayrollRunPolicyValueKey = keyof PayrollRunPolicyValues
export interface PayrollRunPolicyValueSource { kind: 'POLICY_VERSION' | 'CONFIG' | 'DEFAULT'; key: string }
export interface PayrollRunPolicySnapshot {
  schemaVersion: typeof PAYROLL_RUN_POLICY_SNAPSHOT_SCHEMA
  capturedAt: string
  capturedBy: number
  period: string
  dayBasis: string
  policy: {
    policyId: number; code: string; name: string; branchId: number | null; versionId: number; versionNo: number; revision: number; status: string
    effectiveFrom: string; publishedAt: string | null; sealHash: string | null; settingsStatus: string; settings: Record<string, unknown>
  } | null
  values: PayrollRunPolicyValues
  sources: Record<PayrollRunPolicyValueKey, PayrollRunPolicyValueSource>
  latenessTiers: PayrollLatenessTierSetSnapshot
  fingerprint: string
}
export interface PayrollPolicySnapshotDifference { key: string; label: string; stored: string; current: string }

// المفتاح وقيمته الافتراضية في الكود (نفس ما كان يقرؤه calculateDefined قبل اللقطة).
const CONFIG: Record<PayrollRunPolicyValueKey, { key: string; fallback: string | null }> = {
  monthlyDays: { key: 'payroll.monthly_days', fallback: '30' },
  dailyHours: { key: 'payroll.daily_hours', fallback: '8' },
  lateDeductionEnabled: { key: 'payroll.late_deduction_enabled', fallback: 'true' },
  shortfallEnabled: { key: 'payroll.shortfall_enabled', fallback: 'true' },
  shortfallMode: { key: 'payroll.shortfall_mode', fallback: 'MINUTES' },
  shortfallValue: { key: 'payroll.shortfall_value', fallback: '1' },
  overlapPolicy: { key: 'payroll.attendance_overlap_policy', fallback: 'NET_OF_LATENESS' },
  dailyCapDays: { key: 'payroll.attendance_daily_cap_days', fallback: '1' },
  earlyLeaveDeductionEnabled: { key: 'payroll.early_leave_deduction_enabled', fallback: 'true' },
  absencePenaltyDays: { key: 'attendance.absence_penalty_days', fallback: '1' },
  exemptOvertimeEligible: { key: 'payroll.exempt_overtime_eligible', fallback: 'false' },
  // أ7: المستثنى من البصمة بلا خصومات إطلاقًا — الإجازة بلا أجر لا تُخصم له ما لم يُفعّل الإعداد صراحةً.
  exemptUnpaidLeaveDeductible: { key: 'payroll.exempt_unpaid_leave_deductible', fallback: 'false' },
  currency: { key: PAYROLL_POLICY_CONFIG_KEYS.currency, fallback: null },
  minNetGuarantee: { key: PAYROLL_POLICY_CONFIG_KEYS.minNetGuarantee, fallback: null },
  netFloorPct: { key: PAYROLL_POLICY_CONFIG_KEYS.netFloorPct, fallback: null },
  maxDeductionPctOfGross: { key: PAYROLL_POLICY_CONFIG_KEYS.maxDeductionPctOfGross, fallback: null },
}
export const PAYROLL_RUN_POLICY_VALUE_LABELS: Record<PayrollRunPolicyValueKey, string> = {
  monthlyDays: 'أساس أيام الشهر', dailyHours: 'ساعات اليوم', lateDeductionEnabled: 'خصم التأخير مفعّل',
  shortfallEnabled: 'خصم نقص ساعات العمل مفعّل', shortfallMode: 'طريقة خصم النقص', shortfallValue: 'قيمة خصم النقص',
  overlapPolicy: 'تداخل التأخير والنقص', dailyCapDays: 'السقف اليومي لخصم الحضور (أيام)', earlyLeaveDeductionEnabled: 'خصم الخروج المبكر على الوردية الثابتة',
  absencePenaltyDays: 'معامل عقوبة الغياب بلا إذن (أيام)', exemptOvertimeEligible: 'استحقاق المستثنى من الحضور للإضافي',
  exemptUnpaidLeaveDeductible: 'خصم الإجازة بلا أجر للمستثنى', currency: 'العملة', minNetGuarantee: 'الحد الأدنى المضمون للصافي',
  netFloorPct: 'أرضية الصافي (% من الإجمالي)', maxDeductionPctOfGross: 'سقف الخصومات (% من الإجمالي)',
}
const KEYS = Object.keys(CONFIG) as PayrollRunPolicyValueKey[]
const fail = (message: string): never => { throw new BadRequestException({ code: 'PAYRUN-POLICY-SETTINGS-INVALID', message }) }

function stable(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null)
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  return `{${Object.keys(value as Record<string, unknown>).sort().map(key => `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key])}`).join(',')}}`
}

/** البصمة تشمل كل ما يغير الحساب؛ وقت الالتقاط ومنفذه خارجها حتى تتطابق لقطتان بنفس المحتوى. */
export function payrollRunPolicySnapshotFingerprint(snapshot: Omit<PayrollRunPolicySnapshot, 'fingerprint' | 'capturedAt' | 'capturedBy'> | PayrollRunPolicySnapshot): string {
  const { fingerprint: _f, capturedAt: _a, capturedBy: _b, ...content } = snapshot as PayrollRunPolicySnapshot
  const { publishedAt: _p, ...policy } = content.policy ?? ({} as NonNullable<PayrollRunPolicySnapshot['policy']>)
  return createHash('sha256').update(stable({ ...content, policy: content.policy ? policy : null }), 'utf8').digest('hex')
}

const bool = (field: string, text: string) => {
  if (!['true', 'false'].includes(text)) fail(`إعداد ${field} يجب أن يكون true أو false`)
  return text === 'true'
}
const nonNegative = (field: string, text: string) => {
  const value = Number(text)
  if (!/^\d+(?:\.\d+)?$/.test(text.trim()) || !Number.isFinite(value) || value < 0) fail(`إعداد ${field} رقم غير سالب`)
  return value
}

/** تلتقط اللقطة من نسخة السياسة المرتبطة والإعدادات الحالية ومجموعة شرائح شهر المسير؛ قراءة فقط. */
export async function capturePayrollRunPolicySnapshot(em: EntityManager, run: { period: string; policyVersionId: number | null }, capturedBy: number): Promise<PayrollRunPolicySnapshot> {
  const rows = await em.getRepository(RequestsConfig).findBy({ key: In(KEYS.map(field => CONFIG[field].key)) })
  const stored = new Map(rows.map(row => [row.key, row.value]))
  const sources = {} as Record<PayrollRunPolicyValueKey, PayrollRunPolicyValueSource>
  const text = (field: PayrollRunPolicyValueKey) => {
    const { key, fallback } = CONFIG[field]
    sources[field] = { kind: stored.has(key) ? 'CONFIG' : 'DEFAULT', key }
    return stored.get(key) ?? fallback
  }
  const monthlyDays = nonNegative('payroll.monthly_days', text('monthlyDays')!), dailyHours = nonNegative('payroll.daily_hours', text('dailyHours')!)
  if (!(monthlyDays > 0) || !(dailyHours > 0)) throw new BadRequestException('أساس أيام الشهر وساعات اليوم يجب أن يكونا أكبر من صفر')
  const shortfallMode = text('shortfallMode') as PayrollRunPolicyValues['shortfallMode'], overlapPolicy = text('overlapPolicy') as PayrollRunPolicyValues['overlapPolicy']
  const values: PayrollRunPolicyValues = {
    monthlyDays, dailyHours,
    lateDeductionEnabled: text('lateDeductionEnabled') === 'true',
    shortfallEnabled: bool('payroll.shortfall_enabled', text('shortfallEnabled')!),
    shortfallMode, shortfallValue: nonNegative('payroll.shortfall_value', text('shortfallValue')!), overlapPolicy,
    dailyCapDays: nonNegative('payroll.attendance_daily_cap_days', text('dailyCapDays')!),
    earlyLeaveDeductionEnabled: bool('payroll.early_leave_deduction_enabled', text('earlyLeaveDeductionEnabled')!),
    absencePenaltyDays: Number(text('absencePenaltyDays')),
    exemptOvertimeEligible: bool('payroll.exempt_overtime_eligible', text('exemptOvertimeEligible')!),
    exemptUnpaidLeaveDeductible: bool('payroll.exempt_unpaid_leave_deductible', text('exemptUnpaidLeaveDeductible')!),
    currency: text('currency'),
    minNetGuarantee: null, netFloorPct: null, maxDeductionPctOfGross: null,
  }
  if (!['MINUTES', 'MULTIPLIER', 'FRACTION'].includes(shortfallMode) || !['CUMULATIVE', 'MAX_OF_BOTH', 'NET_OF_LATENESS'].includes(overlapPolicy)) {
    throw new BadRequestException('سياسة نقص ساعات العمل أو التداخل أو السقف اليومي غير صالحة')
  }
  if (!Number.isFinite(values.absencePenaltyDays) || values.absencePenaltyDays < 0) fail('معامل عقوبة الغياب attendance.absence_penalty_days رقم غير سالب')
  for (const field of ['minNetGuarantee', 'netFloorPct', 'maxDeductionPctOfGross'] as const) {
    const raw = text(field)
    const parsed = raw === null ? null : parsePayrollPolicyConfigValue(field, raw)
    values[field] = parsed === null ? null : String(parsed)
  }

  let policy: PayrollRunPolicySnapshot['policy'] = null
  let ownerTierSetId: number | null = null
  if (run.policyVersionId) {
    const version = await em.getRepository(PayrollPolicyVersion).findOneBy({ id: run.policyVersionId })
    const owner = version ? await em.getRepository(PayrollPolicy).findOneBy({ id: version.policyId }) : null
    if (!version || !owner) throw new ConflictException({ code: 'PAYRUN-POLICY-NOT-FOUND', message: 'نسخة سياسة الرواتب المرتبطة بالمسير غير موجودة' })
    const seal = await em.getRepository(PayrollPolicyVersionSeal).findOneBy({ versionId: version.id })
    const inspection = inspectPayrollPolicySettings({
      defaultPeriodType: version.defaultPeriodType, cycleStartDay: version.cycleStartDay, cycleEndMode: version.cycleEndMode, cycleEndDay: version.cycleEndDay,
      baseDaysBasis: version.baseDaysBasis, monthlyDays: version.monthlyDays == null ? null : Number(version.monthlyDays),
      dailyHours: version.dailyHours == null ? null : Number(version.dailyHours), rateBase: version.rateBase, roundingMode: version.roundingMode,
      roundingScale: version.roundingScale, divisionByZeroMode: version.divisionByZeroMode,
      maxDeductionPctOfGross: version.maxDeductionPctOfGross == null ? null : Number(version.maxDeductionPctOfGross),
      minNetGuarantee: version.minNetGuarantee == null ? null : Number(version.minNetGuarantee), netFloorPct: version.netFloorPct == null ? null : Number(version.netFloorPct),
      carryOverExcess: version.carryOverExcess, skipAttendance: version.skipAttendance, lateDeductionEnabled: version.lateDeductionEnabled, currency: version.currency,
    })
    policy = { policyId: owner.id, code: owner.code, name: owner.name, branchId: owner.branchId, versionId: version.id, versionNo: version.versionNo,
      revision: version.revision, status: version.status, effectiveFrom: version.effectiveFrom, publishedAt: version.publishedAt ? new Date(version.publishedAt).toISOString() : null,
      sealHash: seal?.contentHash ?? null, settingsStatus: inspection.settingsStatus, settings: inspection.settings as unknown as Record<string, unknown> }
    // النسخة المنشورة المكتملة تحكم حقولها؛ الإعداد العام لما لا تحمله النسخة.
    if (inspection.settingsStatus === 'COMPLETE') {
      const s = inspection.settings
      const fromVersion = <K extends PayrollRunPolicyValueKey>(field: K, value: PayrollRunPolicyValues[K], key: string) => { values[field] = value; sources[field] = { kind: 'POLICY_VERSION', key } }
      fromVersion('monthlyDays', Number(s.monthlyDays), 'payroll_policy_versions.monthlyDays')
      fromVersion('dailyHours', Number(s.dailyHours), 'payroll_policy_versions.dailyHours')
      fromVersion('lateDeductionEnabled', s.lateDeductionEnabled === true, 'payroll_policy_versions.lateDeductionEnabled')
      fromVersion('currency', s.currency as string, 'payroll_policy_versions.currency')
      fromVersion('minNetGuarantee', s.minNetGuarantee === null ? null : String(s.minNetGuarantee), 'payroll_policy_versions.minNetGuarantee')
      fromVersion('netFloorPct', s.netFloorPct === null ? null : String(s.netFloorPct), 'payroll_policy_versions.netFloorPct')
      fromVersion('maxDeductionPctOfGross', s.maxDeductionPctOfGross === null ? null : String(s.maxDeductionPctOfGross), 'payroll_policy_versions.maxDeductionPctOfGross')
    }
    // ترحيل 033 — طريقة الخصم على مجموعة المعادلات تتقدم على النسخة المنشورة والإعداد العام؛ الحقل الفارغ (null) لا يغيّر شيئًا،
    // فلقطات المجموعات التي لم تُملأ حقولها (وكل المسيرات السابقة) تبقى بنفس محتواها وبصمتها.
    const fromSet = <K extends PayrollRunPolicyValueKey>(field: K, value: PayrollRunPolicyValues[K]) => { values[field] = value; sources[field] = { kind: 'POLICY_VERSION', key: `payroll_policies.${field}` } }
    if (owner.lateDeductionEnabled != null) fromSet('lateDeductionEnabled', Boolean(owner.lateDeductionEnabled))
    if (owner.earlyLeaveDeductionEnabled != null) fromSet('earlyLeaveDeductionEnabled', Boolean(owner.earlyLeaveDeductionEnabled))
    if (owner.shortfallEnabled != null) fromSet('shortfallEnabled', Boolean(owner.shortfallEnabled))
    if (owner.shortfallMode != null) fromSet('shortfallMode', owner.shortfallMode)
    if (owner.shortfallValue != null) fromSet('shortfallValue', Number(owner.shortfallValue))
    if (owner.absencePenaltyDays != null) fromSet('absencePenaltyDays', Number(owner.absencePenaltyDays))
    ownerTierSetId = owner.latenessTierSetId ?? null
  }
  let latenessTiers: PayrollLatenessTierSetSnapshot
  // أ1 (قرار المالك 16 سبتمبر): شرائح التأخير تعيش داخل معادلة الرواتب وحدها — لا اختيار بالشهر.
  // المعادلة بلا شرائح (أو مسير بلا معادلة) = بلا شرائح: الخصم بالدقيقة، وهو سلوك «بلا مجموعة» القائم.
  if (ownerTierSetId !== null) {
    const { row: _row, ...snapshot } = await readPayrollLatenessTierSetById(em, ownerTierSetId)
    latenessTiers = snapshot
  } else latenessTiers = { setId: null, effectivePeriod: null, contentHash: null, source: 'NONE', tiers: [] }
  const content = { schemaVersion: PAYROLL_RUN_POLICY_SNAPSHOT_SCHEMA, capturedAt: new Date().toISOString(), capturedBy, period: run.period,
    dayBasis: values.monthlyDays === 30 ? 'FIXED_30' : `FIXED_${values.monthlyDays}`, policy, values, sources, latenessTiers }
  return { ...content, fingerprint: payrollRunPolicySnapshotFingerprint(content as PayrollRunPolicySnapshot) }
}

/** قراءة اللقطة المحفوظة مع التحقق من بصمتها وشهرها؛ null للمسير المحسوب قبل الخطوة 19 (والاعتماد يرفضه — لا يُعتمد مسير بلا لقطة). */
export function parsePayrollRunPolicySnapshot(run: { id?: number | null; period?: string | null; policySnapshot?: string | null; policySnapshotHash?: string | null }): PayrollRunPolicySnapshot | null {
  if (!run.policySnapshot && !run.policySnapshotHash) return null
  let parsed: PayrollRunPolicySnapshot
  try { parsed = JSON.parse(run.policySnapshot ?? '') } catch { parsed = null as unknown as PayrollRunPolicySnapshot }
  // بصمة بلا لقطة، أو لقطة لشهر غير شهر المسير، تالفة كتعديل المحتوى نفسه
  if (!parsed || parsed.schemaVersion !== PAYROLL_RUN_POLICY_SNAPSHOT_SCHEMA || !parsed.values || !parsed.latenessTiers ||
    (run.period != null && parsed.period !== run.period) ||
    parsed.fingerprint !== run.policySnapshotHash || payrollRunPolicySnapshotFingerprint(parsed) !== parsed.fingerprint) {
    throw new ConflictException({ code: 'PAYRUN-POLICY-SNAPSHOT-INVALID', message: `لقطة السياسة المحفوظة على المسير #${run.id ?? ''} تالفة أو لا تطابق بصمتها؛ لا يُعاد الحساب منها` })
  }
  return parsed
}

const show = (value: unknown) => value === null || value === undefined ? '—' : typeof value === 'boolean' ? (value ? 'نعم' : 'لا') : String(value)
const tiersText = (set: PayrollLatenessTierSetSnapshot | null | undefined) => !set || !set.tiers.length ? 'بلا شرائح (الخصم بالدقيقة)'
  : `مجموعة #${set.setId} من ${set.effectivePeriod}: ` + set.tiers.map(tier => `${tier.fromMinutes}–${tier.toMinutes ?? '∞'} ${PAYROLL_LATENESS_TIER_MODE_LABELS[tier.mode]}${['FRACTION', 'MULTIPLIER'].includes(tier.mode) ? ` ${Number(tier.value)}` : ''}`).join('، ')

const deep = (value: unknown) => value !== null && typeof value === 'object' ? stable(value) : show(value)
const SOURCE_KIND_LABELS: Record<PayrollRunPolicyValueSource['kind'], string> = { POLICY_VERSION: 'من نسخة السياسة', CONFIG: 'من الإعدادات', DEFAULT: 'قيمة افتراضية' }
const POLICY_FIELD_LABELS: Array<[keyof NonNullable<PayrollRunPolicySnapshot['policy']>, string]> = [
  ['policyId', 'رقم السياسة'], ['code', 'رمز السياسة'], ['branchId', 'فرع السياسة'], ['versionId', 'رقم نسخة السياسة'], ['effectiveFrom', 'سريان نسخة السياسة'],
  ['status', 'حالة نسخة السياسة'], ['settingsStatus', 'اكتمال إعدادات نسخة السياسة'],
]

/**
 * فروق اللقطة المحفوظة عن الإعدادات الحالية بتسميات عربية؛ اللقطة الغائبة (مسير قبل الخطوة 19) تظهر كل قيمها فرقًا.
 * كل ما تغطيه البصمة يُقارن (حالة النسخة وإعداداتها، مصدر كل قيمة، محتوى الشرائح وبصمتها)، ولو اختلفت البصمتان بلا فرق مسمى
 * يُضاف فرق «محتوى آخر في البصمة» — فلا يظهر «التحديث مطلوب» بقائمة فروق فارغة.
 */
export function diffPayrollRunPolicySnapshots(stored: PayrollRunPolicySnapshot | null, current: PayrollRunPolicySnapshot): PayrollPolicySnapshotDifference[] {
  const differences: PayrollPolicySnapshotDifference[] = []
  const push = (key: string, label: string, before: string, after: string) => { if (before !== after) differences.push({ key, label, stored: before, current: after }) }
  const version = (snapshot: PayrollRunPolicySnapshot | null) => !snapshot ? 'لا لقطة محفوظة (مسير قبل الخطوة 19)'
    : snapshot.policy ? `«${snapshot.policy.name}» نسخة ${snapshot.policy.versionNo} (مراجعة ${snapshot.policy.revision}، ختم ${snapshot.policy.sealHash?.slice(0, 12) ?? '—'})` : 'بلا نسخة سياسة (إعدادات عامة)'
  push('policy', 'نسخة السياسة', version(stored), version(current))
  if (stored?.policy && current.policy) {
    for (const [field, label] of POLICY_FIELD_LABELS) push(`policy.${field}`, label, deep(stored.policy[field]), deep(current.policy[field]))
    const settingKeys = [...new Set([...Object.keys(stored.policy.settings ?? {}), ...Object.keys(current.policy.settings ?? {})])].sort()
    for (const key of settingKeys) push(`policy.settings.${key}`, `إعداد نسخة السياسة: ${key}`, deep(stored.policy.settings?.[key]), deep(current.policy.settings?.[key]))
  }
  if (stored) {
    push('schemaVersion', 'صيغة اللقطة', String(stored.schemaVersion), String(current.schemaVersion))
    push('period', 'شهر الرواتب في اللقطة', show(stored.period), show(current.period))
  }
  push('dayBasis', 'أساس الأيام', stored?.dayBasis ?? '—', current.dayBasis)
  for (const key of KEYS) {
    const source = (snapshot: PayrollRunPolicySnapshot | null) => snapshot?.sources?.[key] ? ` (${SOURCE_KIND_LABELS[snapshot.sources[key].kind] ?? snapshot.sources[key].kind})` : ''
    const before = stored ? show(stored.values[key]) : '—', after = show(current.values[key])
    if (before !== after) differences.push({ key: `values.${key}`, label: PAYROLL_RUN_POLICY_VALUE_LABELS[key], stored: before + source(stored), current: after + source(current) })
    // نفس القيمة من مصدر آخر (مثلًا قيمة افتراضية صارت إعدادًا مكتوبًا) تغيّر البصمة فتظهر فرقًا
    else if (stored) push(`sources.${key}`, `مصدر «${PAYROLL_RUN_POLICY_VALUE_LABELS[key]}»`, deep(stored.sources?.[key]), deep(current.sources?.[key]))
  }
  push('latenessTiers', 'شرائح التأخير', stored ? tiersText(stored.latenessTiers) : '—', tiersText(current.latenessTiers))
  if (stored) {
    const integrity = (set: PayrollLatenessTierSetSnapshot) => `${set?.source ?? '—'} • بصمة ${set?.contentHash?.slice(0, 12) ?? '—'}`
    push('latenessTiers.integrity', 'مصدر مجموعة الشرائح وبصمتها', integrity(stored.latenessTiers), integrity(current.latenessTiers))
    push('latenessTiers.detail', 'تفاصيل الشرائح (التسميات والترتيب)', deep(stored.latenessTiers?.tiers ?? []), deep(current.latenessTiers?.tiers ?? []))
    if (!differences.length && payrollRunPolicySnapshotFingerprint(stored) !== payrollRunPolicySnapshotFingerprint(current)) {
      differences.push({ key: 'fingerprint', label: 'محتوى آخر في بصمة اللقطة', stored: payrollRunPolicySnapshotFingerprint(stored).slice(0, 12), current: payrollRunPolicySnapshotFingerprint(current).slice(0, 12) })
    }
  }
  return differences
}
