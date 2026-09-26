'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, ExternalLink, Info, Send, Users } from 'lucide-react'
import { ApiError, can } from '@/lib/api'
import { useCurrency } from '@/lib/currency'
import {
  BONUS_METHOD_UNIT,
  BONUS_ROLE_LABELS,
  bonusInputError,
  bonusStepError,
  bonusValueHint,
  bonusValueStep,
  createBonus,
  fetchBonusCandidates,
  fetchBonusCreatable,
  formatBonusMoney,
  previewBonuses,
  type BonusCandidate,
  type BonusCreatable,
  type BonusInput,
  type BonusPreview,
} from '@/lib/bonuses-api'

// كارت «مكافأة» في شاشة «الطلبات»: نموذج طلب حقيقي داخل الشاشة نفسها — بلا انتقال لشاشة أخرى،
// زي كارت «خصم» بالظبط. النموذج مربوط بأنواع المكافآت التي يضبطها المسؤول في «أنواع المكافآت»:
// النوع يحدد طريقة الحساب ووحدتها وخطوتها وحدودها وسقفها وسلسلة الاعتماد التي تنتهي بالموارد البشرية.
// الإرسال يمر بنقطة الإنشاء الفردي نفسها (POST /bonuses) التي تستعملها شاشة المكافآت ونافذة صف المسير،
// فتُصرف المكافأة مع مسير الشهر المستهدف ويراها الموظف في «مكافآتي».
// قاعدة المالك: منتقي الموظف من الخادم وحده (candidates) — يستبعد نفسك ومن يعلوك وغير فرعك؛
// الشاشة لا تبني قائمة موظفين خاصة بها، وتقفل الإرسال إذا رجعت القائمة فارغة.
// الشاشة لا تحسب مالًا ولا تقرر نطاقًا: الخادم يعيد الفحص كاملًا (النطاق والسقف والتكرار والشهر المقفول).

const errorText = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback)
const errorCode = (error: unknown) => (error instanceof ApiError ? String(error.details?.code ?? '') : '')

export default function BonusRequestForm({ onSubmitted }: { onSubmitted?: () => void }) {
  const currency = useCurrency()
  const [creatable, setCreatable] = useState<BonusCreatable | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [typeId, setTypeId] = useState(0)
  const [candidates, setCandidates] = useState<BonusCandidate[]>([])
  const [candidatesLoaded, setCandidatesLoaded] = useState(false)
  const [candidateError, setCandidateError] = useState('')
  const [search, setSearch] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [form, setForm] = useState({ inputValue: '', reason: '', targetPeriod: '', attachmentRef: '', confirmNotDuplicate: false })
  const [preview, setPreview] = useState<BonusPreview | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [errorKind, setErrorKind] = useState('')
  const [result, setResult] = useState('')
  const canBulk = can('bonuses.manage')

  const type = creatable?.types.find(row => row.id === typeId) ?? null

  useEffect(() => {
    fetchBonusCreatable()
      .then(value => {
        setCreatable(value)
        setTypeId(value.types[0]?.id ?? 0)
        setForm(form => ({ ...form, inputValue: value.types[0]?.defaultValue ?? '', targetPeriod: value.currentPeriod }))
      })
      .catch(err => setLoadError(errorText(err, 'تعذر تحميل أنواع المكافآت المسموحة لك')))
      .finally(() => setLoading(false))
  }, [])

  // تغيير النوع يغيّر النطاق والحدود والوحدة: القيمة والمعاينة والموظف السابق لا يصلحون كما هم
  useEffect(() => {
    if (!typeId) return
    setCandidateError('')
    setCandidatesLoaded(false)
    setPreview(null)
    setForm(form => ({ ...form, inputValue: creatable?.types.find(row => row.id === typeId)?.defaultValue ?? '', confirmNotDuplicate: false }))
    fetchBonusCandidates(typeId)
      .then(rows => {
        setCandidates(rows)
        setCandidatesLoaded(true)
        setEmployeeId(current => (rows.some(row => String(row.id) === current) ? current : ''))
      })
      .catch(err => {
        // فشل تحميل النطاق = قفل الإرسال، لا قائمة بديلة من الشاشة
        setCandidates([])
        setCandidatesLoaded(false)
        setEmployeeId('')
        setCandidateError(errorText(err, 'تعذر تحميل الموظفين في نطاقك لهذا النوع'))
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeId])

  const input: BonusInput = {
    bonusTypeId: typeId,
    inputValue: form.inputValue.trim(),
    reason: form.reason,
    targetPeriod: form.targetPeriod,
    ...(form.attachmentRef.trim() ? { attachmentRef: form.attachmentRef.trim() } : {}),
    confirmNotDuplicate: form.confirmNotDuplicate,
  }
  const problem = creatable && type ? bonusInputError(input, creatable.reasonMinLength, type) ?? bonusStepError(type, input.inputValue) : 'جارٍ التحميل…'
  // لا موظف في نطاقك لهذا النوع ⇒ لا إرسال: الخادم يرفضه أصلًا، والشاشة لا تخترع قائمة
  const noScope = candidatesLoaded && candidates.length === 0
  const previewKey = JSON.stringify({ input, employeeId })

  // معاينة حيّة لمبلغ المكافأة وسلسلتها من الخادم (نفس نقطة معاينة شاشة المكافآت) — بلا حساب في الواجهة
  useEffect(() => {
    setPreview(null)
    setPreviewError('')
    if (problem || !employeeId) return
    let cancelled = false
    const timer = setTimeout(() => {
      setPreviewing(true)
      previewBonuses(input, { mode: 'EMPLOYEES', ids: [Number(employeeId)], excludeEmployeeIds: [] })
        .then(value => { if (!cancelled) setPreview(value) })
        .catch(err => { if (!cancelled) setPreviewError(errorText(err, 'تعذرت معاينة مبلغ المكافأة')) })
        .finally(() => { if (!cancelled) setPreviewing(false) })
    }, 500)
    return () => { cancelled = true; clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey, problem])

  const submit = async () => {
    if (!creatable || !type || busy) return
    if (noScope || !candidatesLoaded) { setError(candidateError || 'لا يوجد موظفون في نطاقك لهذا النوع — لا يمكن إرسال المكافأة.'); return }
    if (!employeeId) { setError('اختر الموظف المستفيد من المكافأة من قائمة نطاقك.'); return }
    if (problem) { setError(problem); return }
    setBusy(true); setError(''); setErrorKind(''); setResult('')
    try {
      const created = await createBonus({ ...input, employeeId: Number(employeeId) })
      const chain = created.steps.filter(step => step.status !== 'SKIPPED').map(step => step.roleLabel).join(' ← ')
      // قرار المالك 26 سبتمبر: اقتراح مدير الموارد البشرية بيرجع من الخادم معتمدًا لحظتها
      setResult(created.status === 'APPROVED'
        ? `أُنشئت المكافأة #${created.id} بمبلغ ${formatBonusMoney(created.finalAmount ?? created.estimatedAmount)} ${currency} واعتُمدت فورًا — قرار مدير الموارد البشرية نهائي. تُصرف مع مسير ${created.targetPeriod}، ويراها الموظف في «مكافآتي».`
        : `أُرسل طلب المكافأة #${created.id} بمبلغ ${formatBonusMoney(created.estimatedAmount)} ${currency} — ${created.statusLabel}. سلسلة الاعتماد: ${chain}. بعد اعتماد الموارد البشرية تُصرف مع مسير ${created.targetPeriod}، ويراها الموظف في «مكافآتي».`)
      setForm(form => ({ ...form, inputValue: type.defaultValue ?? '', reason: '', attachmentRef: '', confirmNotDuplicate: false }))
      setPreview(null)
      onSubmitted?.()
    } catch (err) {
      // رسالة الخادم العربية كما هي: خارج النطاق، السقف، الشهر المقفول، التكرار، لا مكافأة لنفسك
      setError(errorText(err, 'تعذر إرسال طلب المكافأة'))
      setErrorKind(errorCode(err))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
  if (loadError) return <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4 text-sm">{loadError}</div>
  if (!creatable || !type) {
    return (
      <div className="border border-dashed border-gray-200 rounded-xl p-6 text-center space-y-2" data-testid="bonus-request-empty">
        <AlertTriangle size={26} className="mx-auto text-gray-300" />
        <p className="text-sm text-gray-500">لا توجد أنواع مكافآت مسموح لك بإنشائها. الأنواع ونطاق من يُنشئها تُضبط في «أنواع المكافآت» داخل شاشة المكافآت.</p>
        {canBulk && <a href="/payroll/bonuses?tab=create" className="text-xs text-primary-700 underline">فتح شاشة المكافآت</a>}
      </div>
    )
  }

  const row = preview?.rows[0] ?? null
  const ready = row?.status === 'READY'
  const duplicate = row?.status === 'BONUS_DUPLICATE' || errorKind === 'BONUS_DUPLICATE'
  const searchText = search.trim()
  // المختار يظل ظاهراً في القائمة حتى لو استبعده البحث
  const visible = candidates.filter(candidate => String(candidate.id) === employeeId || !searchText || candidate.fullName.includes(searchText) || candidate.employeeCode.includes(searchText))

  return (
    <div className="space-y-4" data-testid="bonus-request-form">
      <div className="flex items-start gap-2 text-xs text-blue-700 bg-blue-50 rounded-xl px-3 py-2.5">
        <Info size={14} className="shrink-0 mt-0.5" />
        <span>
          اختر نوع المكافأة ثم اكتب قيمتها بالطريقة التي تُحسب بها، وحدد شهر المسير والموظف والسبب. الطلب يمر بسلسلة اعتماد النوع وينتهي بالموارد
          البشرية، ثم تُصرف المكافأة مع مسير الشهر المستهدف. لا مكافأة لنفسك ولا لمن يعلوك. نطاقك: {creatable.basisLabels.join('، ') || 'حسب نوع المكافأة'}.
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label htmlFor="bonus-request-type" className="block text-sm font-medium text-gray-700 mb-2">نوع المكافأة <span className="text-red-500">*</span></label>
          <select id="bonus-request-type" className="input w-full" value={typeId} disabled={busy} onChange={event => setTypeId(Number(event.target.value))}>
            {creatable.types.map(option => <option key={option.id} value={option.id}>{option.nameAr} — {option.calcMethodLabel}</option>)}
          </select>
          <p className="text-xs text-gray-500 mt-1.5">{type.calcMethodLabel} • السلسلة: {type.approvalSteps.map(role => BONUS_ROLE_LABELS[role]).join(' ← ')}</p>
        </div>
        <div>
          <label htmlFor="bonus-request-value" className="block text-sm font-medium text-gray-700 mb-2">
            {BONUS_METHOD_UNIT[type.calcMethod]}{type.calcMethod === 'FIXED_AMOUNT' ? ` (${currency})` : ''} <span className="text-red-500">*</span>
          </label>
          <input
            id="bonus-request-value"
            className="input w-full"
            dir="ltr"
            inputMode="decimal"
            type="number"
            min="0"
            step={bonusValueStep(type)}
            disabled={busy}
            value={form.inputValue}
            onChange={event => setForm(form => ({ ...form, inputValue: event.target.value }))}
          />
          <p className="text-xs text-gray-500 mt-1.5">{bonusValueHint(type)}</p>
        </div>
        <div>
          <label htmlFor="bonus-request-period" className="block text-sm font-medium text-gray-700 mb-2">شهر المسير المستهدف <span className="text-red-500">*</span></label>
          <input id="bonus-request-period" type="month" className="input w-full" dir="ltr" disabled={busy} value={form.targetPeriod} onChange={event => setForm(form => ({ ...form, targetPeriod: event.target.value }))} />
          <p className="text-xs text-gray-500 mt-1.5">الشهر الحالي للمسير: {creatable.currentPeriod} (الدورة تبدأ يوم {creatable.cycleStartDay})</p>
        </div>
      </div>

      <div className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
        حدود النوع: الحد الأدنى {formatBonusMoney(type.minAmount)}، الحد الأعلى {type.maxAmount ? formatBonusMoney(type.maxAmount) : 'بلا'}،
        سقف المكافأة الواحدة {type.maxPctOfBase ? `${type.maxPctOfBase}% من الأساسي${creatable.canExceedCap ? ' (تملك صلاحية تجاوزه)' : ''}` : 'بلا'}.
      </div>

      <div>
        <label htmlFor="bonus-request-employee" className="block text-sm font-medium text-gray-700 mb-2">
          <span className="flex items-center gap-1.5"><Users size={14} className="text-indigo-500" />الموظف المستفيد من المكافأة <span className="text-red-500">*</span></span>
        </label>
        {candidateError && <p role="alert" className="text-sm text-red-600 mb-2">{candidateError}</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input className="input w-full" placeholder="بحث بالاسم أو الرقم الوظيفي" disabled={busy || noScope} value={search} onChange={event => setSearch(event.target.value)} />
          <select id="bonus-request-employee" className="input w-full" value={employeeId} disabled={busy || noScope} onChange={event => setEmployeeId(event.target.value)}>
            <option value="">{noScope ? '— لا يوجد موظفون في نطاقك لهذا النوع —' : !candidatesLoaded ? '— جارٍ تحميل موظفي نطاقك —' : '— اختر الموظف —'}</option>
            {visible.map(candidate => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.fullName} — {candidate.employeeCode}{candidate.teamName ? ` — ${candidate.teamName}` : candidate.departmentName ? ` — ${candidate.departmentName}` : ''}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-gray-500 mt-1.5">
          القائمة من نطاقك في فرعك لهذا النوع كما يحلّه الخادم. لا تُنزل مكافأة لنفسك ولا لمن يعلوك — الخادم يرفضها.
        </p>
        {noScope && (
          <p role="alert" className="flex items-center gap-1.5 text-xs text-warning-700 bg-warning-50 rounded-lg px-3 py-2 mt-1.5">
            <AlertTriangle size={13} className="shrink-0" />
            لا يوجد موظفون في نطاقك لهذا النوع — الإرسال مقفول حتى يظهر لك موظف واحد على الأقل.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="bonus-request-attachment" className="block text-sm font-medium text-gray-700 mb-2">مرجع المستند أو المرفق (اختياري)</label>
        <input
          id="bonus-request-attachment"
          className="input w-full"
          maxLength={300}
          disabled={busy}
          placeholder="مثال: محضر تكريم رقم 4/2026 — أو رقم المستند في خزنة الوثائق"
          value={form.attachmentRef}
          onChange={event => setForm(form => ({ ...form, attachmentRef: event.target.value }))}
        />
      </div>

      <div>
        <label htmlFor="bonus-request-reason" className="block text-sm font-medium text-gray-700 mb-2">
          سبب المكافأة <span className="text-red-500">*</span>
          <span className="text-xs font-normal text-gray-500 mr-2">({creatable.reasonMinLength} حرفًا على الأقل — {form.reason.trim().length})</span>
        </label>
        <textarea
          id="bonus-request-reason"
          className="input w-full min-h-[80px]"
          maxLength={1000}
          disabled={busy}
          value={form.reason}
          onChange={event => setForm(form => ({ ...form, reason: event.target.value }))}
          placeholder="اشرح ما استحق عليه الموظف المكافأة — يظهر السبب لكل معتمِد وللموظف"
        />
      </div>

      {/* المعاينة الحيّة: المبلغ ومعادلته وسلسلة الاعتماد كما يحسبها الخادم لهذا الموظف وهذا الشهر */}
      {employeeId && (previewing || preview || previewError) && (
        <div className="border border-gray-100 rounded-xl p-3 space-y-1.5 bg-gray-50/60" data-testid="bonus-request-preview">
          {previewing && <p className="text-sm text-gray-500">جارٍ حساب المبلغ من راتب الموظف في الشهر المستهدف…</p>}
          {previewError && <p role="alert" className="text-sm text-red-600">{previewError}</p>}
          {row && ready && (
            <>
              <p className="text-sm font-medium text-gray-800">المبلغ المحسوب: <span className="font-mono">{formatBonusMoney(row.amount)}</span> {currency}</p>
              {row.formula && <p className="text-xs text-gray-600" dir="ltr">{row.formula}</p>}
              {row.capExceeded && <p className="text-xs text-warning-700 flex items-center gap-1"><AlertTriangle size={12} />المبلغ يتجاوز سقف المكافأة الواحدة{row.capLimit ? ` (${formatBonusMoney(row.capLimit)} ${currency})` : ''}.</p>}
              {row.escalated && <p className="text-xs text-warning-700 flex items-center gap-1"><AlertTriangle size={12} />المبلغ يتجاوز حد دورك — تُضاف خطوة تصعيد للسلسلة</p>}
              <p className="text-xs text-gray-500">السلسلة: {row.steps.filter(step => step.status !== 'SKIPPED').map(step => step.roleLabel).join(' ← ')}</p>
            </>
          )}
          {row && !ready && <p role="alert" className="text-sm text-red-700">{row.message ?? 'لا يمكن إنزال هذه المكافأة على الموظف المختار.'}</p>}
        </div>
      )}

      {!problem && !employeeId && !noScope && <p className="text-xs text-gray-500">اختر الموظف ليظهر المبلغ المحسوب وسلسلة الاعتماد قبل الإرسال.</p>}
      {problem && employeeId && form.reason.trim().length < creatable.reasonMinLength && (
        <p className="text-xs text-gray-500">اكتب السبب كاملًا ({creatable.reasonMinLength} حرفًا) ليظهر المبلغ المحسوب قبل الإرسال.</p>
      )}

      {duplicate && (
        <label className="text-sm flex items-center gap-2 text-warning-700">
          <input type="checkbox" className="w-4 h-4 accent-primary-500" checked={form.confirmNotDuplicate} onChange={event => setForm(form => ({ ...form, confirmNotDuplicate: event.target.checked }))} />
          أؤكد أنها ليست مكافأة مكررة لنفس السبب
        </label>
      )}

      {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
      {result && <div role="status" className="bg-success-50 text-success-700 rounded-xl p-3 text-sm flex items-start gap-2"><CheckCircle2 size={16} className="shrink-0 mt-0.5" />{result}</div>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="btn-primary flex items-center gap-2 disabled:opacity-50" onClick={submit} disabled={busy || noScope || !candidatesLoaded} data-bonus-submit>
          <Send size={16} />
          {busy ? 'جارٍ الإرسال...' : 'إرسال المكافأة للاعتماد'}
        </button>
        {canBulk && (
          <a href="/payroll/bonuses?tab=create" className="text-xs text-primary-700 hover:underline flex items-center gap-1">
            <ExternalLink size={12} />
            مكافأة لمجموعة موظفين ← شاشة المكافآت
          </a>
        )}
      </div>
    </div>
  )
}
