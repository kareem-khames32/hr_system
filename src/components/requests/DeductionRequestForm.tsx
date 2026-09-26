'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, ExternalLink, Info, Send, Users } from 'lucide-react'
import { ApiError, can } from '@/lib/api'
import { useCurrency } from '@/lib/currency'
import {
  createDeduction,
  DEDUCTION_METHOD_UNIT,
  DEDUCTION_ROLE_LABELS,
  deductionInputError,
  deductionStepError,
  deductionValueHint,
  deductionValueStep,
  fetchDeductionCandidates,
  fetchDeductionCreatable,
  formatDeductionMoney,
  previewDeductions,
  type DeductionCandidate,
  type DeductionCreatable,
  type DeductionInput,
  type DeductionPreview,
} from '@/lib/deductions-api'

// كارت «خصم» في شاشة «الطلبات»: نموذج طلب حقيقي داخل الشاشة نفسها — بلا انتقال لشاشة أخرى.
// النموذج مربوط بأنواع الخصومات التي يضبطها المسؤول في «أنواع الخصومات» (الكتالوج): النوع يحدد
// طريقة الحساب ووحدتها وخطوتها، والمرفق الإجباري، والتقسيط، وسلسلة الاعتماد التي ينتهي بها لدى
// الموارد البشرية. الإرسال يمر بنفس نقطة الإنشاء الفردي (POST /deductions) التي تستعملها شاشة
// الخصومات، فيحصل الخصم على حماية الصافي والدفتر ويظهر للموظف في «خصوماتي» وقسيمة راتبه.
// الشاشة لا تحسب مالًا ولا تقرر نطاقًا: الخادم يعيد الفحص كاملًا (النطاق والحدود والتكرار والشهر المقفول).

const errorText = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback)
const localToday = () => new Date().toLocaleDateString('en-CA')
const errorCode = (error: unknown) => (error instanceof ApiError ? String(error.details?.code ?? '') : '')

export default function DeductionRequestForm({ onSubmitted }: { onSubmitted?: () => void }) {
  const currency = useCurrency()
  const [creatable, setCreatable] = useState<DeductionCreatable | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [typeId, setTypeId] = useState(0)
  const [candidates, setCandidates] = useState<DeductionCandidate[]>([])
  const [candidateError, setCandidateError] = useState('')
  const [search, setSearch] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [form, setForm] = useState({ inputValue: '', reason: '', targetPeriod: '', installments: 1, attachmentRef: '', confirmNotDuplicate: false })
  const [preview, setPreview] = useState<DeductionPreview | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [errorKind, setErrorKind] = useState('')
  const [result, setResult] = useState('')
  const canBulk = can('deductions.manage')

  const type = creatable?.types.find(row => row.id === typeId) ?? null
  const incidentDate = creatable?.today ?? localToday()

  useEffect(() => {
    fetchDeductionCreatable()
      .then(value => {
        setCreatable(value)
        setTypeId(value.types[0]?.id ?? 0)
        setForm(form => ({ ...form, inputValue: value.types[0]?.defaultValue ?? '', targetPeriod: value.currentPeriod }))
      })
      .catch(err => setLoadError(errorText(err, 'تعذر تحميل أنواع الخصومات المسموحة لك')))
      .finally(() => setLoading(false))
  }, [])

  // تغيير النوع يغيّر النطاق والحدود والوحدة: القيمة والمعاينة والموظف السابق لا يصلحون كما هم
  useEffect(() => {
    if (!typeId) return
    setCandidateError('')
    setPreview(null)
    setForm(form => ({ ...form, inputValue: creatable?.types.find(row => row.id === typeId)?.defaultValue ?? '', installments: 1, confirmNotDuplicate: false }))
    fetchDeductionCandidates(typeId)
      .then(rows => {
        setCandidates(rows)
        setEmployeeId(current => (rows.some(row => String(row.id) === current) ? current : ''))
      })
      .catch(err => setCandidateError(errorText(err, 'تعذر تحميل الموظفين في نطاقك لهذا النوع')))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeId])

  const input: DeductionInput = {
    deductionTypeId: typeId,
    inputValue: form.inputValue.trim(),
    incidentDate,
    reason: form.reason,
    targetPeriod: form.targetPeriod,
    ...(type?.installmentAllowed ? { installments: form.installments } : {}),
    ...(form.attachmentRef.trim() ? { attachmentRef: form.attachmentRef.trim() } : {}),
    confirmNotDuplicate: form.confirmNotDuplicate,
  }
  const problem = creatable && type ? deductionInputError(input, creatable.reasonMinLength, type) ?? deductionStepError(type, input.inputValue) : 'جارٍ التحميل…'
  const previewKey = JSON.stringify({ input, employeeId })

  // معاينة حيّة لمبلغ الخصم وسلسلته من الخادم (نفس نقطة معاينة شاشة الخصومات) — بلا حساب في الواجهة
  useEffect(() => {
    setPreview(null)
    setPreviewError('')
    if (problem || !employeeId) return
    let cancelled = false
    const timer = setTimeout(() => {
      setPreviewing(true)
      previewDeductions(input, { mode: 'EMPLOYEES', ids: [Number(employeeId)], excludeEmployeeIds: [] })
        .then(value => { if (!cancelled) setPreview(value) })
        .catch(err => { if (!cancelled) setPreviewError(errorText(err, 'تعذرت معاينة مبلغ الخصم')) })
        .finally(() => { if (!cancelled) setPreviewing(false) })
    }, 500)
    return () => { cancelled = true; clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey, problem])

  const submit = async () => {
    if (!creatable || !type || busy) return
    if (!employeeId) { setError('اختر الموظف المستهدف بالخصم من قائمة نطاقك.'); return }
    if (problem) { setError(problem); return }
    setBusy(true); setError(''); setErrorKind(''); setResult('')
    try {
      const created = await createDeduction({ ...input, employeeId: Number(employeeId) })
      const chain = created.steps.filter(step => step.status !== 'SKIPPED').map(step => step.roleLabel).join(' ← ')
      // قرار المالك 26 سبتمبر: خصم مدير الموارد البشرية بيرجع من الخادم معتمدًا لحظتها
      setResult(created.status === 'APPROVED'
        ? `أُنشئ الخصم #${created.id} واعتُمد فورًا — قرار مدير الموارد البشرية نهائي. يُخصم في مسير ${created.targetPeriod} بحماية الصافي، ويراه الموظف في «خصوماتي» وفي قسيمة راتبه.`
        : `أُرسل طلب الخصم #${created.id} — ${created.statusLabel}. سلسلة الاعتماد: ${chain}. بعد اعتماد الموارد البشرية يُخصم في مسير ${created.targetPeriod} بحماية الصافي، ويراه الموظف في «خصوماتي» وفي قسيمة راتبه.`)
      setForm(form => ({ ...form, inputValue: type.defaultValue ?? '', reason: '', attachmentRef: '', installments: 1, confirmNotDuplicate: false }))
      setPreview(null)
      onSubmitted?.()
    } catch (err) {
      // رسالة الخادم العربية كما هي: حماية الصافي، الشهر المقفول، المرفق الناقص، رفض النطاق أو السلسلة
      setError(errorText(err, 'تعذر إرسال طلب الخصم'))
      setErrorKind(errorCode(err))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
  if (loadError) return <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4 text-sm">{loadError}</div>
  if (!creatable || !type) {
    return (
      <div className="border border-dashed border-gray-200 rounded-xl p-6 text-center space-y-2">
        <AlertTriangle size={26} className="mx-auto text-gray-300" />
        <p className="text-sm text-gray-500">لا توجد أنواع خصم مسموح لك بإنشائها. الأنواع ونطاق من يُنشئها تُضبط في «أنواع الخصومات» داخل شاشة الخصومات.</p>
        {canBulk && <a href="/payroll/deductions?tab=create" className="text-xs text-primary-700 underline">فتح شاشة الخصومات</a>}
      </div>
    )
  }

  const row = preview?.rows[0] ?? null
  const ready = row?.status === 'READY'
  const duplicate = row?.status === 'DEDUCTION_DUPLICATE' || errorKind === 'DEDUCTION_DUPLICATE'
  const searchText = search.trim()
  // المختار يظل ظاهراً في القائمة حتى لو استبعده البحث
  const visible = candidates.filter(candidate => String(candidate.id) === employeeId || !searchText || candidate.fullName.includes(searchText) || candidate.employeeCode.includes(searchText))

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 text-xs text-blue-700 bg-blue-50 rounded-xl px-3 py-2.5">
        <Info size={14} className="shrink-0 mt-0.5" />
        <span>
          اختر نوع الخصم ثم اكتب قيمته بالطريقة التي يُحسب بها، وحدد شهر المسير والموظف والسبب. الطلب يمر بسلسلة اعتماد النوع وينتهي بالموارد
          البشرية، ثم يُخصم في شهر المسير المستهدف بحماية الصافي. نطاقك: {creatable.basisLabels.join('، ') || 'حسب نوع الخصم'}.
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label htmlFor="deduction-request-type" className="block text-sm font-medium text-gray-700 mb-2">نوع الخصم <span className="text-red-500">*</span></label>
          <select id="deduction-request-type" className="input w-full" value={typeId} onChange={event => setTypeId(Number(event.target.value))}>
            {creatable.types.map(option => <option key={option.id} value={option.id}>{option.nameAr} — {option.categoryLabel}</option>)}
          </select>
          <p className="text-xs text-gray-500 mt-1.5">{type.calcMethodLabel} • السلسلة: {type.approvalSteps.map(role => DEDUCTION_ROLE_LABELS[role]).join(' ← ')}</p>
        </div>
        <div>
          <label htmlFor="deduction-request-value" className="block text-sm font-medium text-gray-700 mb-2">
            {DEDUCTION_METHOD_UNIT[type.calcMethod]}{type.calcMethod === 'FIXED_AMOUNT' ? ` (${currency})` : ''} <span className="text-red-500">*</span>
          </label>
          <input
            id="deduction-request-value"
            className="input w-full"
            dir="ltr"
            inputMode="decimal"
            type="number"
            min="0"
            step={deductionValueStep(type)}
            value={form.inputValue}
            onChange={event => setForm(form => ({ ...form, inputValue: event.target.value }))}
          />
          <p className="text-xs text-gray-500 mt-1.5">{deductionValueHint(type)}</p>
        </div>
        <div>
          <label htmlFor="deduction-request-period" className="block text-sm font-medium text-gray-700 mb-2">شهر المسير المستهدف <span className="text-red-500">*</span></label>
          <input id="deduction-request-period" type="month" className="input w-full" dir="ltr" value={form.targetPeriod} onChange={event => setForm(form => ({ ...form, targetPeriod: event.target.value }))} />
          <p className="text-xs text-gray-500 mt-1.5">الشهر الحالي للمسير: {creatable.currentPeriod} (الدورة تبدأ يوم {creatable.cycleStartDay})</p>
        </div>
      </div>

      <div>
        <label htmlFor="deduction-request-employee" className="block text-sm font-medium text-gray-700 mb-2">
          <span className="flex items-center gap-1.5"><Users size={14} className="text-indigo-500" />الموظف المستهدف بالخصم <span className="text-red-500">*</span></span>
        </label>
        {candidateError && <p role="alert" className="text-sm text-red-600 mb-2">{candidateError}</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input className="input w-full" placeholder="بحث بالاسم أو الرقم الوظيفي" value={search} onChange={event => setSearch(event.target.value)} />
          <select id="deduction-request-employee" className="input w-full" value={employeeId} onChange={event => setEmployeeId(event.target.value)}>
            <option value="">{candidates.length === 0 ? '— لا يوجد موظفون في نطاقك لهذا النوع —' : '— اختر الموظف —'}</option>
            {visible.map(candidate => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.fullName} — {candidate.employeeCode}{candidate.teamName ? ` — ${candidate.teamName}` : candidate.departmentName ? ` — ${candidate.departmentName}` : ''}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-gray-500 mt-1.5">
          القائمة من نطاقك في فرعك لهذا النوع كما يحلّه الخادم. لا تُنزل خصمًا على نفسك ولا على من يعلوك — الخادم يرفضه.
        </p>
      </div>

      {type.requiresAttachment && (
        <div>
          <label htmlFor="deduction-request-attachment" className="block text-sm font-medium text-gray-700 mb-2">مرجع المستند أو المرفق (إلزامي لهذا النوع) <span className="text-red-500">*</span></label>
          <input
            id="deduction-request-attachment"
            className="input w-full"
            maxLength={300}
            placeholder="مثال: محضر مخالفة رقم 12/2026 — أو رقم المستند في خزنة الوثائق"
            value={form.attachmentRef}
            onChange={event => setForm(form => ({ ...form, attachmentRef: event.target.value }))}
          />
          <p className="text-xs text-gray-500 mt-1.5">النوع لا يقبل الإرسال بلا مرجع مستند؛ يظهر المرجع لكل معتمِد في تفاصيل الخصم.</p>
        </div>
      )}

      {type.installmentAllowed && (
        <div>
          <label htmlFor="deduction-request-installments" className="block text-sm font-medium text-gray-700 mb-2">عدد الأقساط</label>
          <select
            id="deduction-request-installments"
            className="input w-full md:w-60"
            value={form.installments}
            onChange={event => setForm(form => ({ ...form, installments: Number(event.target.value) }))}
          >
            {Array.from({ length: Math.max(1, type.maxInstallments) }, (_, index) => index + 1).map(count => (
              <option key={count} value={count}>{count === 1 ? 'قسط واحد (كامل المبلغ في شهر المسير)' : `${count} أقساط متتالية`}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1.5">الحد لهذا النوع {type.maxInstallments} قسط؛ كل قسط يُخصم في شهر مسيره بحماية الصافي، وتظهر قيمته في المعاينة بالأسفل.</p>
        </div>
      )}

      <div>
        <label htmlFor="deduction-request-reason" className="block text-sm font-medium text-gray-700 mb-2">
          سبب الخصم <span className="text-red-500">*</span>
          <span className="text-xs font-normal text-gray-500 mr-2">({creatable.reasonMinLength} حرفًا على الأقل — {form.reason.trim().length})</span>
        </label>
        <textarea
          id="deduction-request-reason"
          className="input w-full min-h-[80px]"
          maxLength={1000}
          value={form.reason}
          onChange={event => setForm(form => ({ ...form, reason: event.target.value }))}
          placeholder="اشرح الواقعة التي استوجبت الخصم — يظهر السبب لكل معتمِد وللموظف"
        />
      </div>

      {/* المعاينة الحيّة: المبلغ ومعادلته وسلسلة الاعتماد كما يحسبها الخادم لهذا الموظف وهذا الشهر */}
      {employeeId && (previewing || preview || previewError) && (
        <div className="border border-gray-100 rounded-xl p-3 space-y-1.5 bg-gray-50/60">
          {previewing && <p className="text-sm text-gray-500">جارٍ حساب المبلغ من راتب الموظف في الشهر المستهدف…</p>}
          {previewError && <p role="alert" className="text-sm text-red-600">{previewError}</p>}
          {row && ready && (
            <>
              <p className="text-sm font-medium text-gray-800">المبلغ المحسوب: <span className="font-mono">{formatDeductionMoney(row.amount)}</span> {currency}</p>
              {row.formula && <p className="text-xs text-gray-600" dir="ltr">{row.formula}</p>}
              {row.installments.length > 1 && (
                <p className="text-xs text-gray-600">الأقساط: {row.installments.map(part => `${part.period}: ${formatDeductionMoney(part.amount)}`).join('، ')}</p>
              )}
              {row.pctLimit && <p className="text-xs text-gray-500">حد النسبة من إجمالي الراتب: {formatDeductionMoney(row.pctLimit)} {currency}</p>}
              {row.escalated && <p className="text-xs text-warning-700 flex items-center gap-1"><AlertTriangle size={12} />المبلغ يتجاوز حد دورك — تُضاف خطوة تصعيد للسلسلة</p>}
              <p className="text-xs text-gray-500">السلسلة: {row.steps.filter(step => step.status !== 'SKIPPED').map(step => step.roleLabel).join(' ← ')}</p>
            </>
          )}
          {row && !ready && <p role="alert" className="text-sm text-red-700">{row.message ?? 'لا يمكن إنزال هذا الخصم على الموظف المختار.'}</p>}
        </div>
      )}

      {!problem && !employeeId && <p className="text-xs text-gray-500">اختر الموظف ليظهر المبلغ المحسوب وسلسلة الاعتماد قبل الإرسال.</p>}
      {problem && employeeId && form.reason.trim().length < creatable.reasonMinLength && (
        <p className="text-xs text-gray-500">اكتب السبب كاملًا ({creatable.reasonMinLength} حرفًا) ليظهر المبلغ المحسوب قبل الإرسال.</p>
      )}

      {duplicate && (
        <label className="text-sm flex items-center gap-2 text-warning-700">
          <input type="checkbox" className="w-4 h-4 accent-primary-500" checked={form.confirmNotDuplicate} onChange={event => setForm(form => ({ ...form, confirmNotDuplicate: event.target.checked }))} />
          أؤكد أن هذا ليس خصمًا مكررًا لنفس الواقعة
        </label>
      )}

      {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
      {result && <div role="status" className="bg-success-50 text-success-700 rounded-xl p-3 text-sm flex items-start gap-2"><CheckCircle2 size={16} className="shrink-0 mt-0.5" />{result}</div>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="btn-primary flex items-center gap-2" onClick={submit} disabled={busy}>
          <Send size={16} />
          {busy ? 'جارٍ الإرسال...' : 'إرسال الخصم للاعتماد'}
        </button>
        {canBulk && (
          <a href="/payroll/deductions?tab=create" className="text-xs text-primary-700 hover:underline flex items-center gap-1">
            <ExternalLink size={12} />
            خصم لمجموعة موظفين ← شاشة الخصومات
          </a>
        )}
      </div>
    </div>
  )
}
