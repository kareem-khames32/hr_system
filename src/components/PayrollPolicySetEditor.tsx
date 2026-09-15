'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { AlertTriangle, CalendarRange, CheckCircle2, Plus, Save, X } from 'lucide-react'
import { ApiError, fetchConfig } from '../lib/api'
import { fetchLatenessTierSets, type LatenessTierSet } from '../lib/payroll-engine-api'
import {
  chargeRulesOf, createPayrollPolicy, DEFAULT_POLICY_SETTINGS, describePolicyCycle, expectedPolicyCycleEndDay,
  payrollPoliciesError, policyCycleIssue, POLICY_PERIOD_TYPE_LABELS, POLICY_SCREEN_REASON, publishPayrollPolicyVersion,
  SHORTFALL_MODE_LABELS, storedPolicySettings, suggestPolicyEffectiveFrom, updatePayrollPolicyChargeRules, updatePayrollPolicyVersion,
  type PayrollPolicyChargeRules, type PayrollPolicySettingsInput, type PayrollPolicySummary, type PayrollPolicyVersionSummary, type PayrollShortfallMode,
} from '../lib/payroll-policies-api'

type Settings = PayrollPolicySettingsInput
const pad = (value: number) => String(value).padStart(2, '0')
const todayIso = () => { const now = new Date(); return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` }
const numberOrNull = (text: string) => text.trim() === '' ? null : Number(text)
const isDate = (text: string) => /^\d{4}-\d{2}-\d{2}$/.test(text)

// رسالة الخادم أولًا، ثم أسباب منع النشر كما أرسلها (بلا ترجمة من الواجهة).
function errorText(cause: unknown): string {
  const issues = cause instanceof ApiError ? (cause.details as { issues?: { message: string }[] } | undefined)?.issues : undefined
  if (Array.isArray(issues) && issues.length) return issues.map(issue => issue.message).join('؛ ')
  return payrollPoliciesError(cause)
}

const labelClass = 'block text-sm font-medium text-gray-700 mb-1'
const CURRENCY_LABELS: Record<Settings['currency'], string> = { SAR: 'ريال سعودي', EGP: 'جنيه مصري' }

// الحقول الظاهرة فقط: الدورة وساعات اليوم والعملة وحماية الصافي. بقية إعدادات النسخة تبقى كما هي وتُرسل مع الحفظ.
export function PolicySettingsFields({ value, onChange, disabled }: { value: Settings; onChange: (next: Settings) => void; disabled?: boolean }) {
  const set = <K extends keyof Settings>(key: K, next: Settings[K]) => onChange({ ...value, [key]: next })
  const custom = value.defaultPeriodType === 'CUSTOM_DAY_RANGE'
  // الفترات متجاورة: يوم النهاية الثابت يتبع يوم البداية تلقائيًا، وأي قيمة أخرى تُرفض قبل الإرسال.
  const cycleIssue = policyCycleIssue(value)
  return <div className="space-y-5">
    <fieldset disabled={disabled} className="grid md:grid-cols-4 gap-3 min-w-0">
      <legend className="text-sm font-bold text-gray-800 mb-2">دورة المسير</legend>
      <label className="min-w-0"><span className={labelClass}>نوع الفترة</span>
        <select className="input w-full" value={value.defaultPeriodType} onChange={event => {
          const type = event.target.value as Settings['defaultPeriodType']
          onChange(type === 'CUSTOM_DAY_RANGE' ? { ...value, defaultPeriodType: type } : { ...value, defaultPeriodType: type, cycleStartDay: 1, cycleEndMode: 'DERIVED', cycleEndDay: null })
        }}>
          {Object.entries(POLICY_PERIOD_TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select></label>
      {custom && <label className="min-w-0"><span className={labelClass}>يوم بداية الدورة</span>
        <input className="input w-full" type="number" min={1} max={31} step={1} value={value.cycleStartDay} onChange={event => {
          const start = Number(event.target.value)
          onChange(value.cycleEndMode === 'FIXED_DAY' && Number.isInteger(start) && start >= 1 && start <= 31
            ? { ...value, cycleStartDay: start, cycleEndDay: expectedPolicyCycleEndDay(start) } : { ...value, cycleStartDay: start })
        }} /></label>}
      {custom && <label className="min-w-0"><span className={labelClass}>نهاية الفترة</span>
        <select className="input w-full" value={value.cycleEndMode} onChange={event => {
          const mode = event.target.value as Settings['cycleEndMode']
          onChange({ ...value, cycleEndMode: mode, cycleEndDay: mode === 'DERIVED' ? null : expectedPolicyCycleEndDay(value.cycleStartDay) })
        }}>
          <option value="DERIVED">اليوم السابق لبداية الدورة</option>
          <option value="FIXED_DAY">يوم ثابت</option>
        </select></label>}
      {custom && value.cycleEndMode === 'FIXED_DAY' && <label className="min-w-0"><span className={labelClass}>يوم نهاية الدورة</span>
        <input className="input w-full" type="number" min={1} max={31} step={1} value={value.cycleEndDay ?? ''} aria-invalid={!!cycleIssue} onChange={event => set('cycleEndDay', numberOrNull(event.target.value))} /></label>}
      <p className="md:col-span-4 flex items-center gap-2 text-sm text-primary-700 bg-primary-50 rounded-lg px-3 py-2"><CalendarRange size={16} aria-hidden="true" />{describePolicyCycle(value)}</p>
      {cycleIssue && <p role="alert" className="md:col-span-4 flex items-center gap-2 text-sm text-red-800 bg-red-50 rounded-lg px-3 py-2"><AlertTriangle size={16} aria-hidden="true" />{cycleIssue}</p>}
    </fieldset>

    <fieldset disabled={disabled} className="grid md:grid-cols-3 gap-3 min-w-0">
      <legend className="text-sm font-bold text-gray-800 mb-2">ساعات العمل والعملة</legend>
      <label><span className={labelClass}>ساعات العمل اليومية</span>
        <input className="input w-full" type="number" min={0.01} max={24} step={0.01} value={value.dailyHours} onChange={event => set('dailyHours', Number(event.target.value))} /></label>
      <label><span className={labelClass}>العملة</span>
        <select className="input w-full" value={value.currency} onChange={event => set('currency', event.target.value as Settings['currency'])}>
          {(Object.keys(CURRENCY_LABELS) as Settings['currency'][]).map(code => <option key={code} value={code}>{CURRENCY_LABELS[code]}</option>)}
        </select></label>
    </fieldset>

    <fieldset disabled={disabled} className="grid md:grid-cols-3 gap-3 min-w-0">
      <legend className="text-sm font-bold text-gray-800 mb-2">حماية الصافي</legend>
      <label><span className={labelClass}>الحد الأدنى للصافي (مبلغ)</span>
        <input className="input w-full" type="number" min={0} step={0.01} value={value.minNetGuarantee ?? ''} placeholder="بلا حد" onChange={event => set('minNetGuarantee', numberOrNull(event.target.value))} /></label>
      <label><span className={labelClass}>الحد الأدنى للصافي (% من الأجر المستحق)</span>
        <input className="input w-full" type="number" min={0} max={100} step={0.01} value={value.netFloorPct ?? ''} placeholder="بلا حد" onChange={event => set('netFloorPct', numberOrNull(event.target.value))} /></label>
      <label><span className={labelClass}>سقف الخصومات (% من الأجر المستحق)</span>
        <input className="input w-full" type="number" min={0} max={100} step={0.01} value={value.maxDeductionPctOfGross ?? ''} placeholder="بلا سقف" onChange={event => set('maxDeductionPctOfGross', numberOrNull(event.target.value))} /></label>
    </fieldset>
  </div>
}

// القيم الابتدائية للمعادلات الجديدة من «سياسات النظام» (الدورة وساعات اليوم والعملة وحماية الصافي وخصم التأخير)؛ المفتاح الناقص يبقى على الافتراضي.
const CREATE_DEFAULT_KEYS: Partial<Record<keyof Settings, string>> = {
  defaultPeriodType: 'payroll.policy.default_period_type', cycleStartDay: 'payroll.cycle_start_day', cycleEndMode: 'payroll.policy.cycle_end_mode',
  cycleEndDay: 'payroll.policy.cycle_end_day', dailyHours: 'payroll.daily_hours', currency: 'system.currency', lateDeductionEnabled: 'payroll.late_deduction_enabled',
  minNetGuarantee: 'payroll.policy.min_net_guarantee', netFloorPct: 'payroll.policy.net_floor_pct', maxDeductionPctOfGross: 'payroll.policy.max_deduction_pct_of_gross',
}
function createDefaults(rows: Array<{ key: string; value: string }>): Settings {
  const values = new Map(rows.map(row => [row.key, row.value]))
  const next: Record<string, unknown> = { ...DEFAULT_POLICY_SETTINGS }
  for (const [field, key] of Object.entries(CREATE_DEFAULT_KEYS)) {
    const text = key ? values.get(key) : undefined, fallback = DEFAULT_POLICY_SETTINGS[field as keyof Settings]
    if (text === undefined) continue
    if (text === 'null') { if (fallback === null) next[field] = null }
    else if (typeof fallback === 'boolean') { if (text === 'true' || text === 'false') next[field] = text === 'true' }
    else if (typeof fallback === 'number' || fallback === null) { if (text.trim() !== '' && Number.isFinite(Number(text))) next[field] = Number(text) }
    else if (field !== 'currency' || text in CURRENCY_LABELS) next[field] = text
  }
  return next as unknown as Settings
}

export function PayrollPolicyCreateForm({ onCreated, onCancel }: { onCreated: (summary: PayrollPolicySummary) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [settings, setSettings] = useState<Settings>(DEFAULT_POLICY_SETTINGS)
  const [loadingDefaults, setLoadingDefaults] = useState(true)
  const [from, setFrom] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let cancelled = false
    fetchConfig().then(rows => { if (!cancelled) setSettings(createDefaults(rows)) })
      .catch(() => { /* تعذر قراءة الإعدادات: تبقى القيم الافتراضية ظاهرة للتعديل */ })
      .finally(() => { if (!cancelled) setLoadingDefaults(false) })
    return () => { cancelled = true }
  }, [])
  const suggested = suggestPolicyEffectiveFrom(settings, todayIso())
  const effectiveFrom = from ?? suggested
  const ready = name.trim().length > 0 && isDate(effectiveFrom) && !policyCycleIssue(settings) && !saving && !loadingDefaults

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!ready) return
    setSaving(true); setError('')
    try {
      onCreated(await createPayrollPolicy({ code: '', name, description: null, effectiveFrom, settings, metadata: { title: 'النسخة الأولى', notes: null } }))
    } catch (cause) { setError(errorText(cause)) } finally { setSaving(false) }
  }

  return <form className="card space-y-5" aria-label="إنشاء معادلات رواتب" onSubmit={submit}>
    <div className="flex items-start justify-between gap-3">
      <div><h2 className="text-lg font-bold text-gray-800">معادلات رواتب جديدة</h2><p className="text-sm text-gray-500 mt-1">القيم تبدأ من «سياسات النظام». بعد الحفظ راجعها واضغط «حفظ وتفعيل» لتُستخدم في المسيرات.</p></div>
      <button type="button" className="text-gray-400 hover:text-gray-600" aria-label="إغلاق النموذج" onClick={onCancel}><X size={20} /></button>
    </div>
    <div className="grid md:grid-cols-3 gap-3">
      <label className="md:col-span-2"><span className={labelClass}>الاسم</span><input className="input w-full" value={name} maxLength={200} placeholder="مثل: معادلات رواتب فرع المعادي" onChange={event => setName(event.target.value)} required /></label>
      <label><span className={labelClass}>تُطبّق من</span><input className="input w-full" type="date" value={effectiveFrom} onChange={event => setFrom(event.target.value)} required />
        <span className="text-xs text-gray-500">بداية فترة مسير. المقترح: {suggested}{from !== null && from !== suggested && <button type="button" className="text-primary-600 mr-1" onClick={() => setFrom(null)}>استخدام المقترح</button>}</span></label>
    </div>
    <PolicySettingsFields value={settings} onChange={setSettings} disabled={saving || loadingDefaults} />
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <div className="flex flex-wrap gap-2">
      <button type="submit" className="btn-primary flex items-center gap-2" disabled={!ready}><Plus size={17} />{saving ? 'جارٍ الحفظ…' : 'حفظ'}</button>
      <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>إلغاء</button>
    </div>
  </form>
}

const addDay = (date: string) => { const day = new Date(`${date}T00:00:00Z`); day.setUTCDate(day.getUTCDate() + 1); return day.toISOString().slice(0, 10) }
/** أول بداية فترة مسير بعد تاريخ؛ تعديل معادلات مفعّلة يبدأ من الفترة التالية فلا يمس مسير الفترة الجارية. */
function periodStartAfter(settings: Settings, date: string) {
  let day = date, start = date
  for (let step = 0; step < 400 && start <= date; step++) { day = addDay(day); start = suggestPolicyEffectiveFrom(settings, day) }
  return start
}

interface PanelProps {
  summary: PayrollPolicySummary
  version: PayrollPolicyVersionSummary
  onChanged: (notice: string) => void | Promise<void>
}

// يُعاد تركيب اللوحة بمفتاح النسخة ومراجعتها؛ فشل الحفظ لا يمسح ما كتبه المستخدم.
export function PayrollPolicyVersionPanel({ summary, version, onChanged }: PanelProps) {
  const stored = storedPolicySettings(version)
  const canEdit = summary.capabilities.canEdit && !!summary.capabilities.canPublish && summary.policy.isActive
  const pending = version.status === 'DRAFT' && !version.frozenAt && !version.publishedAt
  const [draft, setDraft] = useState<Settings>(stored ?? DEFAULT_POLICY_SETTINGS)
  const [from, setFrom] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const dirty = JSON.stringify(draft) !== JSON.stringify(stored)
  const until = version.effectiveUntil !== undefined ? version.effectiveUntil : version.effectiveTo
  // غير المفعّلة تحتفظ بتاريخها؛ تعديل المفعّلة يُقترح من فترة المسير التالية (بعد اليوم وبعد بدايتها)، والتاريخ قابل للتغيير.
  const versionFrom = String(version.effectiveFrom).slice(0, 10), today = todayIso()
  const suggested = pending ? versionFrom : periodStartAfter(draft, versionFrom > today ? versionFrom : today)
  const effectiveFrom = from ?? suggested

  async function saveAndActivate() {
    setBusy(true); setError('')
    let saved: PayrollPolicyVersionSummary
    try {
      // الخادم يحفظ غير المفعّلة كما هي، أو ينشئ من المفعّلة نسخة جديدة ويترك المفعّلة بلا تغيير.
      saved = (await updatePayrollPolicyVersion(summary.policy.id, version.id, { expectedRevision: version.revision, reason: POLICY_SCREEN_REASON, settings: draft, effectiveFrom, effectiveTo: null })).version
    } catch (cause) { setError(errorText(cause)); setBusy(false); return }
    try { await publishPayrollPolicyVersion(summary.policy.id, saved.id, saved.revision, POLICY_SCREEN_REASON) }
    catch (cause) {
      setBusy(false)
      await onChanged(`حُفظت التعديلات لكن لم تُفعّل بعد: ${errorText(cause)}`)
      return
    }
    setBusy(false)
    await onChanged(`حُفظت «${summary.policy.name}» وفُعّلت على مسيرات الفترة التي تبدأ ${effectiveFrom} وما بعدها.`)
  }

  return <section className="card space-y-4" aria-label="دورة المسير وساعات العمل">
    <div className="flex flex-wrap items-center gap-2">
      <h2 className="text-lg font-bold text-gray-800">{summary.policy.name}</h2>
      <span className={pending ? 'badge badge-warning' : version.status === 'ACTIVE' ? 'badge badge-success' : 'badge'}>{pending ? 'غير مفعّلة بعد' : version.status === 'ACTIVE' ? 'مفعّلة' : 'موقوفة'}</span>
      <span className="text-sm text-gray-500">تُطبّق من {versionFrom}{until ? ` إلى ${until}` : ''}</span>
    </div>
    {!canEdit && <p className="text-xs text-gray-500">تعديل المعادلات يتطلب صلاحية إدارة معادلات الرواتب.</p>}
    {version.settingsStatus && version.settingsStatus !== 'COMPLETE' && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">بعض إعدادات هذه المعادلات ناقصة؛ راجعها ثم «حفظ وتفعيل».</p>}
    <PolicySettingsFields value={draft} onChange={setDraft} disabled={busy || !canEdit} />
    {canEdit && <div className="flex flex-wrap items-end gap-3">
      <label><span className={labelClass}>{pending ? 'تُطبّق من' : 'التعديل يُطبّق من'}</span>
        <input className="input" type="date" value={effectiveFrom} disabled={busy} onChange={event => setFrom(event.target.value)} />
        <span className="block text-xs text-gray-500">بداية فترة مسير؛ المسيرات قبلها تبقى على القيم الحالية.</span></label>
      <button type="button" className="btn-primary flex items-center gap-2" disabled={busy || (!dirty && !pending) || !!policyCycleIssue(draft) || !isDate(effectiveFrom)} onClick={() => void saveAndActivate()}><CheckCircle2 size={16} />{busy ? 'جارٍ الحفظ…' : 'حفظ وتفعيل'}</button>
    </div>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
  </section>
}

// ===== طريقة الخصم على المجموعة (ترحيل 033): كل حقل «زي الإعدادات العامة» أو قيمة خاصة بهذه المعادلات =====
type Choice = '' | 'true' | 'false'
const choiceOf = (value: boolean | null): Choice => value === null ? '' : value ? 'true' : 'false'
const boolOf = (value: string): boolean | null => value === '' ? null : value === 'true'
const textOf = (value: number | null) => value == null ? '' : String(value)
const tierSetLabel = (set: LatenessTierSet) => set.source === 'LEGACY_CONVERSION' ? 'الشرائح الأصلية' : `شرائح شهر ${set.effectivePeriod}`

export function PayrollPolicyChargeRulesPanel({ summary, version, onSaved }: { summary: PayrollPolicySummary; version: PayrollPolicyVersionSummary | null; onSaved: (notice: string) => void | Promise<void> }) {
  const initial = chargeRulesOf(summary.policy)
  const [rules, setRules] = useState<PayrollPolicyChargeRules>(initial)
  const [shortfallValueText, setShortfallValueText] = useState(textOf(initial.shortfallValue))
  const [absenceText, setAbsenceText] = useState(textOf(initial.absencePenaltyDays))
  const [tierSets, setTierSets] = useState<LatenessTierSet[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const canEdit = summary.capabilities.canEdit && summary.policy.isActive

  useEffect(() => {
    let cancelled = false
    fetchLatenessTierSets().then(data => { if (!cancelled) setTierSets(data.sets.filter(set => set.isActive)) }).catch(() => { /* القائمة تبقى «زي الإعدادات العامة» فقط */ })
    return () => { cancelled = true }
  }, [])

  const set = <K extends keyof PayrollPolicyChargeRules>(key: K, value: PayrollPolicyChargeRules[K]) => setRules(current => ({ ...current, [key]: value }))
  // خصم التأخير محفوظ أيضًا في إعدادات المعادلات المكتملة، وهي التي تُطبّق حين يُترك الحقل فارغًا (لا الإعداد العام)؛
  // فالقائمة تعرض القيمة المطبّقة فعلًا، واختيار نفس قيمة الإعدادات يُحفظ فارغًا.
  const versionLate = version?.settingsStatus === 'COMPLETE' && typeof version.lateDeductionEnabled === 'boolean' ? version.lateDeductionEnabled : null
  const valueLabel = rules.shortfallMode === 'MULTIPLIER' ? 'مضاعف خصم النقص' : rules.shortfallMode === 'FRACTION' ? 'جزء اليوم لخصم النقص (مثل 0.25)' : 'قيمة خصم النقص'
  const dirty = JSON.stringify({ ...rules, shortfallValue: shortfallValueText.trim(), absencePenaltyDays: absenceText.trim() })
    !== JSON.stringify({ ...initial, shortfallValue: textOf(initial.shortfallValue), absencePenaltyDays: textOf(initial.absencePenaltyDays) })

  async function save() {
    setBusy(true); setError('')
    try {
      await updatePayrollPolicyChargeRules(summary.policy.id, summary.policy.revision ?? 1, { ...rules, shortfallValue: numberOrNull(shortfallValueText), absencePenaltyDays: numberOrNull(absenceText) })
      setBusy(false)
      await onSaved(`حُفظت طريقة الخصم في «${summary.policy.name}»؛ تُطبّق على أي مسير لم يُعتمد عند إعادة حسابه.`)
    } catch (cause) { setError(errorText(cause)); setBusy(false) }
  }

  return <section className="card space-y-4" aria-label="طريقة الخصم">
    <div>
      <h2 className="text-lg font-bold text-gray-800">طريقة الخصم</h2>
      <p className="text-sm text-gray-500 mt-1">«زي الإعدادات العامة» يأخذ القيمة من «القيم العامة للخصومات» و«سياسات النظام». التعديل يُطبّق على أي مسير لم يُعتمد عند إعادة حسابه.</p>
    </div>
    <fieldset disabled={!canEdit || busy} className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
      <label className="min-w-0"><span className={labelClass}>خصم التأخير</span>
        {versionLate === null
          ? <select className="input w-full" value={choiceOf(rules.lateDeductionEnabled)} onChange={event => set('lateDeductionEnabled', boolOf(event.target.value))}>
            <option value="">زي الإعدادات العامة</option><option value="true">يُخصم</option><option value="false">لا يُخصم</option>
          </select>
          : <select className="input w-full" value={String(rules.lateDeductionEnabled ?? versionLate)} onChange={event => { const value = event.target.value === 'true'; set('lateDeductionEnabled', value === versionLate ? null : value) }}>
            <option value="true">يُخصم</option><option value="false">لا يُخصم</option>
          </select>}
      </label>
      <label className="min-w-0 lg:col-span-2"><span className={labelClass}>شرائح التأخير</span>
        <select className="input w-full" value={rules.latenessTierSetId ?? ''} onChange={event => set('latenessTierSetId', event.target.value ? Number(event.target.value) : null)}>
          <option value="">زي الإعدادات العامة</option>
          {rules.latenessTierSetId != null && !tierSets.some(row => row.id === rules.latenessTierSetId) && <option value={rules.latenessTierSetId}>شرائح موقوفة — تُطبَّق شرائح الشهر السارية</option>}
          {tierSets.map(row => <option key={row.id} value={row.id}>{tierSetLabel(row)}</option>)}
        </select></label>
      <label className="min-w-0"><span className={labelClass}>خصم الخروج المبكر (الوردية الثابتة)</span>
        <select className="input w-full" value={choiceOf(rules.earlyLeaveDeductionEnabled)} onChange={event => set('earlyLeaveDeductionEnabled', boolOf(event.target.value))}>
          <option value="">زي الإعدادات العامة</option><option value="true">يُخصم</option><option value="false">لا يُخصم</option>
        </select></label>
      <label className="min-w-0"><span className={labelClass}>خصم نقص ساعات العمل</span>
        <select className="input w-full" value={choiceOf(rules.shortfallEnabled)} onChange={event => set('shortfallEnabled', boolOf(event.target.value))}>
          <option value="">زي الإعدادات العامة</option><option value="true">يُخصم</option><option value="false">لا يُخصم</option>
        </select></label>
      <label className="min-w-0"><span className={labelClass}>طريقة خصم النقص</span>
        <select className="input w-full" value={rules.shortfallMode ?? ''} onChange={event => set('shortfallMode', (event.target.value || null) as PayrollShortfallMode | null)}>
          <option value="">زي الإعدادات العامة</option>
          {(Object.keys(SHORTFALL_MODE_LABELS) as PayrollShortfallMode[]).map(key => <option key={key} value={key}>{SHORTFALL_MODE_LABELS[key]}</option>)}
        </select></label>
      <label className="min-w-0"><span className={labelClass}>{valueLabel}</span>
        <input className="input w-full" type="number" min={0} step={0.01} value={shortfallValueText} placeholder="زي الإعدادات العامة" onChange={event => setShortfallValueText(event.target.value)} /></label>
      <label className="min-w-0"><span className={labelClass}>معامل الغياب بلا إذن (أيام)</span>
        <input className="input w-full" type="number" min={0} step={0.5} value={absenceText} placeholder="زي الإعدادات العامة" onChange={event => setAbsenceText(event.target.value)} />
        <span className="text-xs text-gray-500">اليوم الغائب بلا إذن يُخصم = قيمة اليوم × المعامل. اتركه فارغًا للقيمة العامة.</span></label>
    </fieldset>
    {canEdit && <div className="flex flex-wrap gap-2">
      <button type="button" className="btn-primary flex items-center gap-2" disabled={busy || !dirty} onClick={() => void save()}><Save size={16} />{busy ? 'جارٍ الحفظ…' : 'حفظ طريقة الخصم'}</button>
    </div>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
  </section>
}
