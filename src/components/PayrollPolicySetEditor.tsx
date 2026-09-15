'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { AlertTriangle, CalendarRange, CheckCircle2, Copy, LockKeyhole, Pencil, Plus, Save, Send, X } from 'lucide-react'
import { ApiError } from '../lib/api'
import {
  clonePayrollPolicyVersion, createPayrollPolicy, DEFAULT_POLICY_SETTINGS, describePolicyCycle, expectedPolicyCycleEndDay, fetchPayrollPolicyPublishCheck,
  payrollPoliciesError, policyCycleIssue, POLICY_PERIOD_TYPE_LABELS, POLICY_STATUS_LABELS, publishPayrollPolicyVersion, storedPolicySettings,
  suggestPolicyEffectiveFrom, updatePayrollPolicyVersion,
  type PayrollPolicyPublishCheck, type PayrollPolicySettingsInput, type PayrollPolicySummary, type PayrollPolicyVersionSummary,
} from '../lib/payroll-policies-api'

type Settings = PayrollPolicySettingsInput
const pad = (value: number) => String(value).padStart(2, '0')
const todayIso = () => { const now = new Date(); return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` }
const numberOrNull = (text: string) => text.trim() === '' ? null : Number(text)

// رسالة الخادم أولًا، ثم أسباب منع النشر كما أرسلها (بلا ترجمة من الواجهة).
function errorText(cause: unknown): string {
  const issues = cause instanceof ApiError ? (cause.details as { issues?: { message: string }[] } | undefined)?.issues : undefined
  if (Array.isArray(issues) && issues.length) return issues.map(issue => issue.message).join('؛ ')
  return payrollPoliciesError(cause)
}

const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

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
      <legend className="text-sm font-bold text-gray-800 mb-2">معدلات الحساب</legend>
      {/* الخطوة 7 / FE-02 (B5): تنبيه على الحقول التي ما زال المسير لا يقرؤها فقط */}
      <p className="md:col-span-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">المسير يقرأ من النسخة: الدورة، وساعات العمل اليومية، والعملة، وخصم التأخير، وأرضية الصافي وسقف الخصم. «أساس المعدل» و«التقريب» و«القسمة على صفر» تُحفظ مع النسخة ولا يقرؤها حساب المسير بعد (المسير بتقريب منزلتين نصف لأعلى وأساس الأجر الثابت ÷ 30).</p>
      <div><span className={labelClass}>أيام الشهر</span><p className="input bg-gray-50 text-gray-600">30 يومًا (أساس ثابت)</p></div>
      <label><span className={labelClass}>ساعات العمل اليومية</span>
        <input className="input w-full" type="number" min={0.01} max={24} step={0.01} value={value.dailyHours} onChange={event => set('dailyHours', Number(event.target.value))} /></label>
      <label><span className={labelClass}>أساس معدل اليوم والساعة</span>
        <select className="input w-full" value={value.rateBase} onChange={event => set('rateBase', event.target.value as Settings['rateBase'])}>
          <option value="GROSS">إجمالي الأجر الثابت</option><option value="BASIC">الراتب الأساسي</option>
        </select></label>
      <label><span className={labelClass}>العملة</span>
        <select className="input w-full" value={value.currency} onChange={event => set('currency', event.target.value as Settings['currency'])}>
          <option value="SAR">ريال سعودي</option><option value="EGP">جنيه مصري</option>
        </select></label>
      <label><span className={labelClass}>طريقة التقريب</span>
        <select className="input w-full" value={value.roundingMode} onChange={event => set('roundingMode', event.target.value as Settings['roundingMode'])}>
          <option value="HALF_UP">نصف لأعلى</option><option value="HALF_EVEN">نصف للزوجي</option><option value="FLOOR">لأسفل</option><option value="CEIL">لأعلى</option>
        </select></label>
      <label><span className={labelClass}>منازل التقريب</span>
        <input className="input w-full" type="number" min={0} max={6} step={1} value={value.roundingScale} onChange={event => set('roundingScale', Number(event.target.value))} /></label>
      <label><span className={labelClass}>عند القسمة على صفر</span>
        <select className="input w-full" value={value.divisionByZeroMode} onChange={event => set('divisionByZeroMode', event.target.value as Settings['divisionByZeroMode'])}>
          <option value="ZERO_WITH_WARNING">صفر مع تحذير</option><option value="FAIL_ROW">إيقاف صف الموظف</option>
        </select></label>
    </fieldset>

    <fieldset disabled={disabled} className="grid md:grid-cols-3 gap-3 min-w-0">
      <legend className="text-sm font-bold text-gray-800 mb-2">الحضور وحماية الصافي</legend>
      <p className="md:col-span-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">«راتب ثابت بلا أثر للحضور» و«ترحيل الخصم الزائد» لا يقرؤهما حساب المسير بعد: الإعفاء من خصم الحضور يُمنح من «استثناء الحضور»، وزيادة قيود الدفتر تُرحّل دائمًا وزيادة الحضور تسقط (DD-11).</p>
      <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={value.lateDeductionEnabled} onChange={event => set('lateDeductionEnabled', event.target.checked)} />خصم التأخير</label>
      <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={value.skipAttendance} onChange={event => set('skipAttendance', event.target.checked)} />راتب ثابت بلا أثر للحضور</label>
      <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={value.carryOverExcess} onChange={event => set('carryOverExcess', event.target.checked)} />ترحيل الخصم الزائد للشهر التالي</label>
      <label><span className={labelClass}>الحد الأدنى للصافي (مبلغ)</span>
        <input className="input w-full" type="number" min={0} step={0.01} value={value.minNetGuarantee ?? ''} placeholder="بلا حد" onChange={event => set('minNetGuarantee', numberOrNull(event.target.value))} /></label>
      <label><span className={labelClass}>الحد الأدنى للصافي (% من الأجر المستحق)</span>
        <input className="input w-full" type="number" min={0} max={100} step={0.01} value={value.netFloorPct ?? ''} placeholder="بلا حد" onChange={event => set('netFloorPct', numberOrNull(event.target.value))} /></label>
      <label><span className={labelClass}>سقف الخصومات (% من الأجر المستحق)</span>
        <input className="input w-full" type="number" min={0} max={100} step={0.01} value={value.maxDeductionPctOfGross ?? ''} placeholder="بلا سقف" onChange={event => set('maxDeductionPctOfGross', numberOrNull(event.target.value))} /></label>
    </fieldset>
  </div>
}

export function PayrollPolicyCreateForm({ onCreated, onCancel }: { onCreated: (summary: PayrollPolicySummary) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  // فارغ افتراضيًا: الخادم يولّد PS-YYYYMMDD-NN فريدًا فلا يتصادم إنشاء مجموعتين في اليوم نفسه.
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [settings, setSettings] = useState<Settings>(DEFAULT_POLICY_SETTINGS)
  const [effectiveFrom, setEffectiveFrom] = useState(() => suggestPolicyEffectiveFrom(DEFAULT_POLICY_SETTINGS, todayIso()))
  const [fromTouched, setFromTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const suggested = suggestPolicyEffectiveFrom(settings, todayIso())
  useEffect(() => { if (!fromTouched) setEffectiveFrom(suggested) }, [suggested, fromTouched])
  const codeValid = code.trim() === '' || /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/.test(code.trim())
  const ready = name.trim().length > 0 && codeValid && /^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom) && !policyCycleIssue(settings) && !saving

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!ready) return
    setSaving(true); setError('')
    try {
      onCreated(await createPayrollPolicy({ code, name, description: description.trim() || null, effectiveFrom, settings,
        metadata: { title: 'النسخة الأولى', notes: null } }))
    } catch (cause) { setError(errorText(cause)) } finally { setSaving(false) }
  }

  return <form className="card space-y-5" aria-label="إنشاء مجموعة سياسة رواتب" onSubmit={submit}>
    <div className="flex items-start justify-between gap-3">
      <div><h2 className="text-lg font-bold text-gray-800">مجموعة سياسة جديدة</h2><p className="text-sm text-gray-500 mt-1">تُنشأ النسخة الأولى مسودة بمعدلاتها ودورتها. راجعها ثم انشرها لتتجمد.</p></div>
      <button type="button" className="text-gray-400 hover:text-gray-600" aria-label="إغلاق النموذج" onClick={onCancel}><X size={20} /></button>
    </div>
    <div className="grid md:grid-cols-3 gap-3">
      <label><span className={labelClass}>اسم المجموعة</span><input className="input w-full" value={name} maxLength={200} placeholder="مثل: مجموعة القاهرة" onChange={event => setName(event.target.value)} required /></label>
      <label><span className={labelClass}>الكود (اختياري)</span><input className="input w-full font-mono" dir="ltr" value={code} maxLength={40} placeholder={`PS-${todayIso().replace(/-/g, '')}-01`} onChange={event => setCode(event.target.value)} />
        {codeValid ? <span className="text-xs text-gray-500">اتركه فارغًا ليُولَّد كود فريد تلقائيًا.</span> : <span className="text-xs text-red-600">حروف إنجليزية وأرقام وشرطة فقط، ويبدأ بحرف أو رقم.</span>}</label>
      <label><span className={labelClass}>بداية السريان</span><input className="input w-full" type="date" value={effectiveFrom} onChange={event => { setFromTouched(true); setEffectiveFrom(event.target.value) }} required />
        <span className="text-xs text-gray-500">تبدأ النسخة مع بداية فترة مسير كاملة. المقترح: {suggested}{fromTouched && effectiveFrom !== suggested && <button type="button" className="text-primary-600 mr-1" onClick={() => { setFromTouched(false); setEffectiveFrom(suggested) }}>استخدام المقترح</button>}</span></label>
      <label className="md:col-span-3"><span className={labelClass}>الوصف (اختياري)</span><textarea className="input w-full" rows={2} maxLength={8000} value={description} onChange={event => setDescription(event.target.value)} /></label>
    </div>
    <PolicySettingsFields value={settings} onChange={setSettings} disabled={saving} />
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <div className="flex flex-wrap gap-2">
      <button type="submit" className="btn-primary flex items-center gap-2" disabled={!ready}><Plus size={17} />{saving ? 'جارٍ الإنشاء…' : 'إنشاء المسودة'}</button>
      <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>إلغاء</button>
    </div>
  </form>
}

const statusBadge: Record<PayrollPolicyVersionSummary['status'], string> = { DRAFT: 'badge badge-warning', ACTIVE: 'badge badge-success', ARCHIVED: 'badge' }
const yesNo = (value: unknown) => value ? 'نعم' : 'لا'

interface PanelProps {
  summary: PayrollPolicySummary
  version: PayrollPolicyVersionSummary
  locked: boolean
  onChanged: (versionId: number, notice: string) => void | Promise<void>
}

// يُعاد تركيب اللوحة بمفتاح النسخة ومراجعتها؛ فشل الحفظ لا يمسح ما كتبه المستخدم.
export function PayrollPolicyVersionPanel({ summary, version, locked, onChanged }: PanelProps) {
  const stored = storedPolicySettings(version)
  const canEdit = summary.capabilities.canEdit && summary.policy.isActive
  const canPublish = !!summary.capabilities.canPublish && summary.policy.isActive
  const frozen = version.status !== 'DRAFT' || !!version.frozenAt || !!version.publishedAt || version.publishedBy != null
  const [mode, setMode] = useState<'view' | 'edit' | 'publish' | 'clone'>('view')
  const [draft, setDraft] = useState<Settings>(stored ?? DEFAULT_POLICY_SETTINGS)
  const [from, setFrom] = useState(version.effectiveFrom)
  const [to, setTo] = useState(version.effectiveTo ?? '')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [check, setCheck] = useState<PayrollPolicyPublishCheck | null>(null)
  const disabled = locked || busy

  function reset(next: typeof mode) { setMode(next); setReason(''); setError(''); setCheck(null); setDraft(stored ?? DEFAULT_POLICY_SETTINGS); setFrom(version.effectiveFrom); setTo(version.effectiveTo ?? '') }

  async function run(action: () => Promise<void>) {
    setBusy(true); setError('')
    try { await action() } catch (cause) { setError(errorText(cause)) } finally { setBusy(false) }
  }
  const saveEdit = () => run(async () => {
    const response = await updatePayrollPolicyVersion(summary.policy.id, version.id, { expectedRevision: version.revision, reason, settings: draft, effectiveFrom: from, effectiveTo: to || null })
    await onChanged(response.version.id, response.editKind === 'CLONED'
      ? `حُفظت التعديلات في مسودة جديدة رقم ${response.version.versionNo}؛ النسخة المنشورة رقم ${version.versionNo} بقيت مجمدة كما هي.`
      : 'حُفظت إعدادات المسودة ودورتها.')
  })
  const openPublish = () => { reset('publish'); void run(async () => setCheck(await fetchPayrollPolicyPublishCheck(summary.policy.id, version.id))) }
  const publish = () => run(async () => {
    const response = await publishPayrollPolicyVersion(summary.policy.id, version.id, version.revision, reason)
    await onChanged(response.version.id, `نُشرت النسخة رقم ${response.version.versionNo} وتجمدت؛ أي تعديل لاحق يُحفظ في مسودة جديدة.`)
  })
  const clone = () => run(async () => {
    const response = await clonePayrollPolicyVersion(summary.policy.id, version.id, version.revision, reason)
    await onChanged(response.version.id, `أُنشئت مسودة جديدة رقم ${response.version.versionNo} من النسخة رقم ${version.versionNo}.`)
  })

  return <section className="card space-y-4" aria-label="إعدادات نسخة السياسة ودورتها">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold text-gray-800">{summary.policy.name} · نسخة {version.versionNo}</h2>
        <span className={statusBadge[version.status]}>{POLICY_STATUS_LABELS[version.status]}</span>
        <span className="text-sm text-gray-500">السريان من {version.effectiveFrom} إلى {(version.effectiveUntil !== undefined ? version.effectiveUntil : version.effectiveTo) ?? 'مفتوح'}</span>
        {version.supersededByVersionId != null && <span className="text-xs text-blue-700 bg-blue-50 rounded px-2 py-0.5">تتوقف عند بداية نسخة منشورة أحدث</span>}
      </div>
      {mode === 'view' && <div className="flex flex-wrap gap-2">
        {canEdit && <button type="button" className="btn-secondary text-sm flex items-center gap-1" disabled={disabled} onClick={() => reset('edit')}><Pencil size={15} />تعديل الإعدادات والدورة</button>}
        {canEdit && <button type="button" className="btn-secondary text-sm flex items-center gap-1" disabled={disabled} onClick={() => reset('clone')}><Copy size={15} />مسودة جديدة منها</button>}
        {canPublish && !frozen && <button type="button" className="btn-primary text-sm flex items-center gap-1" disabled={disabled} onClick={openPublish}><Send size={15} />مراجعة ونشر</button>}
      </div>}
    </div>
    {frozen && <p className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2"><LockKeyhole size={16} aria-hidden="true" />النسخة منشورة ومجمدة{version.publishedAt ? ` منذ ${String(version.publishedAt).slice(0, 10)}` : ''}. التعديل يُحفظ في مسودة جديدة ولا يغير هذه النسخة.{version.contentHash ? <span className="font-mono text-xs text-gray-500 mr-1" dir="ltr" title={version.contentHash}>ختم المحتوى {version.contentHash.slice(0, 12)}…</span> : null}</p>}
    {!canEdit && <p className="text-xs text-gray-500">إنشاء المجموعات وتعديل نسخها ونشرها يتطلب صلاحية «إدارة مجموعات سياسات الرواتب ونشر نسخها».</p>}
    {version.settingsStatus && version.settingsStatus !== 'COMPLETE' && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">إعدادات النسخة غير مكتملة: {(version.settingsIssues ?? []).join('؛ ')}</p>}

    {mode === 'view' && stored && <dl className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
      {[
        ['الدورة', describePolicyCycle(stored)], ['نوع الفترة', POLICY_PERIOD_TYPE_LABELS[stored.defaultPeriodType]],
        ['أيام الشهر / ساعات اليوم', `${stored.monthlyDays} / ${stored.dailyHours}`], ['أساس المعدل', stored.rateBase === 'GROSS' ? 'إجمالي الأجر الثابت' : 'الأساسي'],
        ['التقريب', `${stored.roundingMode} · ${stored.roundingScale} منزلة`], ['العملة', stored.currency],
        ['خصم التأخير', yesNo(stored.lateDeductionEnabled)], ['راتب ثابت بلا حضور', yesNo(stored.skipAttendance)],
        ['الحد الأدنى للصافي', stored.minNetGuarantee ?? 'بلا حد'], ['أدنى صافي %', stored.netFloorPct ?? 'بلا حد'],
        ['سقف الخصومات %', stored.maxDeductionPctOfGross ?? 'بلا سقف'], ['ترحيل الخصم الزائد', yesNo(stored.carryOverExcess)],
      ].map(([label, value]) => <div key={String(label)} className="rounded-lg bg-gray-50 px-3 py-2"><dt className="text-xs text-gray-500">{label}</dt><dd className="font-medium text-gray-800">{String(value)}</dd></div>)}
    </dl>}

    {mode === 'edit' && <div className="space-y-4">
      {frozen && <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">سيُنشئ الحفظ مسودة جديدة بهذه القيم؛ النسخة المنشورة لا تتغير.</p>}
      <div className="grid md:grid-cols-3 gap-3">
        <label><span className={labelClass}>بداية السريان</span><input className="input w-full" type="date" value={from} onChange={event => setFrom(event.target.value)} disabled={disabled} /></label>
        <label><span className={labelClass}>نهاية السريان (اختياري)</span><input className="input w-full" type="date" value={to} onChange={event => setTo(event.target.value)} disabled={disabled} /></label>
      </div>
      <PolicySettingsFields value={draft} onChange={setDraft} disabled={disabled} />
      <label className="block"><span className={labelClass}>سبب التعديل</span><input className="input w-full" value={reason} maxLength={500} onChange={event => setReason(event.target.value)} disabled={disabled} /></label>
      <div className="flex gap-2">
        <button type="button" className="btn-primary flex items-center gap-2" disabled={disabled || !reason.trim() || !!policyCycleIssue(draft)} onClick={() => void saveEdit()}><Save size={16} />{busy ? 'جارٍ الحفظ…' : 'حفظ'}</button>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => reset('view')}>إلغاء</button>
      </div>
    </div>}

    {mode === 'clone' && <div className="space-y-3">
      <p className="text-sm text-gray-600">تُنسخ إعدادات النسخة رقم {version.versionNo} وبنودها وترتيب تحصيلها إلى مسودة جديدة قابلة للتعديل.</p>
      <label className="block"><span className={labelClass}>سبب إنشاء المسودة</span><input className="input w-full" value={reason} maxLength={500} onChange={event => setReason(event.target.value)} disabled={disabled} /></label>
      <div className="flex gap-2">
        <button type="button" className="btn-primary flex items-center gap-2" disabled={disabled || !reason.trim()} onClick={() => void clone()}><Copy size={16} />إنشاء المسودة</button>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => reset('view')}>إلغاء</button>
      </div>
    </div>}

    {mode === 'publish' && <div className="space-y-3">
      {!check && busy && <p role="status" className="text-sm text-gray-500">جارٍ مراجعة النسخة قبل النشر…</p>}
      {check && <>
        {check.cycle && <p className="flex items-center gap-2 text-sm text-primary-700"><CalendarRange size={16} aria-hidden="true" />{check.cycle}</p>}
        {check.issues.length > 0 && <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800 space-y-1"><p className="font-bold flex items-center gap-1"><AlertTriangle size={16} />لا يمكن النشر قبل معالجة:</p>
          <ul className="list-disc pr-5 space-y-1">{check.issues.map(issue => <li key={issue.code}>{issue.message}{issue.suggestion ? ` — المقترح: ${issue.suggestion}` : ''}</li>)}</ul></div>}
        {check.warnings.length > 0 && <ul className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 list-disc pr-8 space-y-1">{check.warnings.map(warning => <li key={warning.code}>{warning.message}</li>)}</ul>}
        {check.supersedes.length > 0 && <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">{check.supersedes.map(item => `النسخة المنشورة رقم ${item.versionNo} تتوقف فعليًا في ${item.newEffectiveTo}`).join('؛ ')}. تبقى بياناتها وختمها كما نُشرت دون تعديل.</p>}
        {check.integrity && !check.integrity.matches && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">محتوى هذه النسخة المنشورة لا يطابق ختمها المحفوظ؛ لا تربطها بمسير قبل مراجعة سجل الأحداث.</p>}
        {check.periods.length > 0 && <div className="overflow-x-auto"><table className="w-full text-sm"><caption className="text-right text-gray-600 mb-1">أول فترات المسير بهذه النسخة</caption>
          <thead><tr className="text-gray-500 border-b"><th className="text-right py-1">شهر المسير</th><th className="text-right py-1">من</th><th className="text-right py-1">إلى</th></tr></thead>
          <tbody>{check.periods.map(period => <tr key={period.startDate} className="border-b border-gray-100"><td className="py-1">{period.reference}</td><td>{period.startDate}</td><td>{period.endDate}</td></tr>)}</tbody></table></div>}
        {check.publishable && <p className="flex items-center gap-2 text-sm text-green-700"><CheckCircle2 size={16} />النسخة جاهزة للنشر. بعد النشر تتجمد ولا تتغير.</p>}
        {check.canPublish && <label className="block"><span className={labelClass}>سبب النشر</span><input className="input w-full" value={reason} maxLength={500} onChange={event => setReason(event.target.value)} disabled={disabled} /></label>}
      </>}
      <div className="flex gap-2">
        {check?.canPublish && <button type="button" className="btn-primary flex items-center gap-2" disabled={disabled || !reason.trim()} onClick={() => void publish()}><Send size={16} />{busy ? 'جارٍ النشر…' : 'نشر النسخة'}</button>}
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => reset('view')}>إغلاق</button>
      </div>
    </div>}

    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
  </section>
}
