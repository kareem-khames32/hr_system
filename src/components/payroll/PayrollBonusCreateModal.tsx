'use client'

// قاعدة المالك: الزرار اللي بيوديك شاشة تانية علشان تعمل حاجة = عيب. زرار «مكافأة» على صف الموظف
// في جدول المسير بقى بيفتح النافذة دي في نفس الشاشة — زي «شيل خصم» و«نقل لمسير آخر» بالظبط.
// النافذة بتقترح مكافأة لموظف واحد، بالموظف وشهر المسير جاهزين، وبتمر بنفس نقطة الإنشاء الفردي
// (POST /bonuses) ونفس المعاينة اللي بتستعملهم شاشة المكافآت، فالمبلغ والسلسلة والسقف والتكرار
// والنطاق كلها من الخادم — الشاشة دي ما بتحسبش مال ولا بتقرر نطاق. شاشة /payroll/bonuses باقية
// كما هي لمكافأة المجموعات (فريق أو قسم أو فرع)، ولها رابط ثانوي من هنا لمن يملك صلاحيتها.

import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, ExternalLink, Gift, Info, Send } from 'lucide-react'
import { ApiError, can } from '@/lib/api'
import { useCurrency } from '@/lib/currency'
import {
  BONUS_METHOD_UNIT,
  BONUS_ROLE_LABELS,
  bonusInputError,
  createBonus,
  fetchBonusCreatable,
  formatBonusMoney,
  previewBonuses,
  type BonusCreatable,
  type BonusInput,
  type BonusPreviewRow,
  type BonusView,
} from '@/lib/bonuses-api'

const errorText = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback)
const errorCode = (error: unknown) => (error instanceof ApiError ? String(error.details?.code ?? '') : '')
const isPeriod = (value: string | null | undefined): value is string => !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
// سلسلة الاعتماد كما يعيدها الخادم للطلب نفسه — الخطوة المتخطّاة لا تُعرض
const chainOf = (steps: BonusView['steps']) => steps.filter(step => step.status !== 'SKIPPED').map(step => step.roleLabel).join(' ← ')

export function PayrollBonusCreateModal({ employeeId, employeeName, period, onClose }: {
  employeeId: number
  employeeName: string
  /** شهر المسير المفتوح — يُملأ كشهر مستهدف جاهز */
  period: string
  onClose: () => void
}) {
  const currency = useCurrency()
  const [creatable, setCreatable] = useState<BonusCreatable | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [typeId, setTypeId] = useState(0)
  const [form, setForm] = useState({ inputValue: '', reason: '', targetPeriod: isPeriod(period) ? period : '', attachmentRef: '', confirmNotDuplicate: false })
  const [row, setRow] = useState<BonusPreviewRow | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [errorKind, setErrorKind] = useState('')
  const [created, setCreated] = useState<BonusView | null>(null)
  // رابط ثانوي للمجموعات: نفس بوابة شاشة المكافآت الإدارية
  const canBulk = can('bonuses.manage')

  const type = creatable?.types.find(option => option.id === typeId) ?? null

  useEffect(() => {
    fetchBonusCreatable()
      .then(value => {
        setCreatable(value)
        setTypeId(value.types[0]?.id ?? 0)
        setForm(form => ({ ...form, inputValue: value.types[0]?.defaultValue ?? '', targetPeriod: isPeriod(period) ? period : value.currentPeriod }))
      })
      .catch(err => setLoadError(errorText(err, 'تعذر تحميل أنواع المكافآت المسموحة لك')))
      .finally(() => setLoading(false))
  }, [period])

  // تغيير النوع يغيّر النطاق والحدود والوحدة: القيمة السابقة ومعاينتها لا تصلحان كما هما
  useEffect(() => {
    if (!typeId) return
    setRow(null)
    setForm(form => ({ ...form, inputValue: creatable?.types.find(option => option.id === typeId)?.defaultValue ?? '', confirmNotDuplicate: false }))
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
  const problem = creatable && type ? bonusInputError(input, creatable.reasonMinLength, type) : 'جارٍ التحميل…'
  const previewKey = JSON.stringify(input)

  // معاينة حيّة من الخادم لهذا الموظف وهذا الشهر: المبلغ ومعادلته وسلسلته والسقف والتكرار — بلا حساب في الواجهة
  useEffect(() => {
    setRow(null)
    setPreviewError('')
    if (problem || created) return
    let cancelled = false
    const timer = setTimeout(() => {
      setPreviewing(true)
      previewBonuses(input, { mode: 'EMPLOYEES', ids: [employeeId], excludeEmployeeIds: [] })
        .then(value => { if (!cancelled) setRow(value.rows.find(item => item.employeeId === employeeId) ?? null) })
        .catch(err => { if (!cancelled) setPreviewError(errorText(err, 'تعذرت معاينة مبلغ المكافأة')) })
        .finally(() => { if (!cancelled) setPreviewing(false) })
    }, 500)
    return () => { cancelled = true; clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewKey, problem, employeeId, created])

  const submit = async () => {
    if (!creatable || !type || busy) return
    if (problem) { setError(problem); return }
    setBusy(true); setError(''); setErrorKind('')
    try {
      const value = await createBonus({ ...input, employeeId })
      setCreated(value)
    } catch (err) {
      // رسالة الخادم العربية كما هي: خارج النطاق، السقف، الشهر المقفول، التكرار، لا مكافأة لنفسك
      setError(errorText(err, 'تعذر إرسال المكافأة'))
      setErrorKind(errorCode(err))
    } finally {
      setBusy(false)
    }
  }

  const ready = row?.status === 'READY'
  const duplicate = row?.status === 'BONUS_DUPLICATE' || errorKind === 'BONUS_DUPLICATE'
  const bulkHref = `/payroll/bonuses?tab=create&employeeId=${employeeId}&period=${form.targetPeriod || period}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={`مكافأة — ${employeeName}`}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-xl space-y-3 text-right" data-testid="payroll-bonus-create">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-gray-800 flex items-center gap-2"><Gift size={18} className="text-success-500" />مكافأة — {employeeName}</h3>
          <button type="button" onClick={onClose} disabled={busy} className="text-sm text-gray-500 disabled:opacity-50">إغلاق</button>
        </div>

        {loading && <p className="text-sm text-gray-400">جارٍ تحميل أنواع المكافآت المسموحة لك…</p>}
        {loadError && <p role="alert" className="p-2 bg-red-50 text-red-700 rounded-lg text-sm">{loadError}</p>}

        {!loading && !loadError && creatable && !type && (
          <div className="border border-dashed border-gray-200 rounded-xl p-6 text-center space-y-2" data-testid="payroll-bonus-create-empty">
            <AlertTriangle size={26} className="mx-auto text-gray-300" />
            <p className="text-sm text-gray-500">لا توجد أنواع مكافآت مسموح لك بإنشائها. الأنواع ونطاق من يُنشئها تُضبط في «أنواع المكافآت» داخل شاشة المكافآت.</p>
            {canBulk && <a href="/payroll/bonuses" className="text-xs text-primary-700 underline">فتح شاشة المكافآت</a>}
          </div>
        )}

        {/* نتيجة الإرسال: رقم الطلب وسلسلة الاعتماد وشهر الصرف — نفس ما تبلّغه نافذتا «شيل خصم» و«نقل لمسير آخر» */}
        {created && (
          <div className="space-y-3 text-sm" data-testid="payroll-bonus-create-result">
            <div role="status" className="bg-success-50 text-success-700 rounded-xl p-3 flex items-start gap-2">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              <span>
                أُرسلت مكافأة {employeeName} #{created.id} بمبلغ {formatBonusMoney(created.estimatedAmount)} {currency} — {created.statusLabel}.
                سلسلة الاعتماد: {chainOf(created.steps)}. بعد اعتماد الموارد البشرية تُصرف مع مسير {created.targetPeriod}.
              </span>
            </div>
            {created.escalated && <p className="text-xs text-warning-700 flex items-center gap-1"><AlertTriangle size={12} />المبلغ تجاوز حد دورك فأُضيفت خطوة تصعيد للسلسلة.</p>}
            {created.notice && <p className="text-xs text-gray-600">{created.notice}</p>}
            <div className="flex justify-end">
              <button type="button" className="btn-primary text-sm" onClick={onClose}>تمام</button>
            </div>
          </div>
        )}

        {!created && type && creatable && <>
          <div className="flex items-start gap-2 text-xs text-blue-700 bg-blue-50 rounded-xl px-3 py-2.5">
            <Info size={14} className="shrink-0 mt-0.5" />
            <span>
              المكافأة تُرسل كطلب للموظف المستفيد نفسه (لا لك)، تمر بسلسلة اعتماد النوع وتنتهي بالموارد البشرية، ثم تُصرف مع مسير الشهر المستهدف.
              لا مكافأة لنفسك ولا لمن يعلوك. نطاقك: {creatable.basisLabels.join('، ') || 'حسب نوع المكافأة'}.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label htmlFor="payroll-bonus-type" className="block text-sm font-medium text-gray-700 mb-2">نوع المكافأة <span className="text-red-500">*</span></label>
              <select id="payroll-bonus-type" className="input w-full" value={typeId} disabled={busy} onChange={event => setTypeId(Number(event.target.value))}>
                {creatable.types.map(option => <option key={option.id} value={option.id}>{option.nameAr} — {option.calcMethodLabel}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="payroll-bonus-value" className="block text-sm font-medium text-gray-700 mb-2">
                {BONUS_METHOD_UNIT[type.calcMethod]}{type.calcMethod === 'FIXED_AMOUNT' ? ` (${currency})` : ''} <span className="text-red-500">*</span>
              </label>
              <input id="payroll-bonus-value" className="input w-full" dir="ltr" inputMode="decimal" disabled={busy}
                value={form.inputValue} onChange={event => setForm(form => ({ ...form, inputValue: event.target.value }))} />
            </div>
            <div>
              <label htmlFor="payroll-bonus-period" className="block text-sm font-medium text-gray-700 mb-2">شهر المسير المستهدف <span className="text-red-500">*</span></label>
              <input id="payroll-bonus-period" type="month" className="input w-full" dir="ltr" disabled={busy}
                value={form.targetPeriod} onChange={event => setForm(form => ({ ...form, targetPeriod: event.target.value }))} />
              <p className="text-xs text-gray-500 mt-1.5">شهر المسير المفتوح {period}؛ الشهر الحالي للمسير: {creatable.currentPeriod} (الدورة تبدأ يوم {creatable.cycleStartDay})</p>
            </div>
          </div>

          <div className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
            حدود النوع: الحد الأدنى {formatBonusMoney(type.minAmount)}، الحد الأعلى {type.maxAmount ? formatBonusMoney(type.maxAmount) : 'بلا'}،
            سقف المكافأة الواحدة {type.maxPctOfBase ? `${type.maxPctOfBase}% من الأساسي${creatable.canExceedCap ? ' (تملك صلاحية تجاوزه)' : ''}` : 'بلا'}
            {type.valueStep ? `، خطوة المدخل ${type.valueStep}` : ''}.
            السلسلة: {type.approvalSteps.map(role => BONUS_ROLE_LABELS[role]).join(' ← ')}.
          </div>

          <div>
            <label htmlFor="payroll-bonus-reason" className="block text-sm font-medium text-gray-700 mb-2">
              سبب المكافأة <span className="text-red-500">*</span>
              <span className="text-xs font-normal text-gray-500 mr-2">({creatable.reasonMinLength} حرفًا على الأقل — {form.reason.trim().length})</span>
            </label>
            <textarea id="payroll-bonus-reason" className="input w-full min-h-[70px]" maxLength={1000} disabled={busy}
              placeholder="اشرح ما استحقت عليه المكافأة — يظهر السبب لكل معتمِد وللموظف"
              value={form.reason} onChange={event => setForm(form => ({ ...form, reason: event.target.value }))} />
          </div>

          <div>
            <label htmlFor="payroll-bonus-attachment" className="block text-sm font-medium text-gray-700 mb-2">مرجع مستند (اختياري)</label>
            <input id="payroll-bonus-attachment" className="input w-full" maxLength={300} disabled={busy}
              value={form.attachmentRef} onChange={event => setForm(form => ({ ...form, attachmentRef: event.target.value }))} />
          </div>

          {/* المعاينة الحيّة: المبلغ ومعادلته وسلسلة الاعتماد كما يحسبها الخادم لهذا الموظف وهذا الشهر */}
          {(previewing || row || previewError) && (
            <div className="border border-gray-100 rounded-xl p-3 space-y-1.5 bg-gray-50/60" data-testid="payroll-bonus-create-preview">
              {previewing && <p className="text-sm text-gray-500">جارٍ حساب المبلغ من راتب الموظف في الشهر المستهدف…</p>}
              {previewError && <p role="alert" className="text-sm text-red-600">{previewError}</p>}
              {row && ready && <>
                <p className="text-sm font-medium text-gray-800">المبلغ المحسوب: <span className="font-mono">{formatBonusMoney(row.amount)}</span> {currency}</p>
                {row.formula && <p className="text-xs text-gray-600" dir="ltr">{row.formula}</p>}
                {row.capExceeded && <p className="text-xs text-warning-700 flex items-center gap-1"><AlertTriangle size={12} />المبلغ يتجاوز سقف المكافأة الواحدة{row.capLimit ? ` (${formatBonusMoney(row.capLimit)} ${currency})` : ''}.</p>}
                {row.escalated && <p className="text-xs text-warning-700 flex items-center gap-1"><AlertTriangle size={12} />المبلغ يتجاوز حد دورك — تُضاف خطوة تصعيد للسلسلة</p>}
                <p className="text-xs text-gray-500">السلسلة: {row.steps.filter(step => step.status !== 'SKIPPED').map(step => step.roleLabel).join(' ← ')}</p>
              </>}
              {row && !ready && <p role="alert" className="text-sm text-red-700">{row.message ?? 'لا يمكن إنزال هذه المكافأة على هذا الموظف.'}</p>}
            </div>
          )}

          {problem && <p className="text-xs text-gray-500">{problem} — يظهر المبلغ المحسوب وسلسلة الاعتماد قبل الإرسال.</p>}

          {duplicate && (
            <label className="text-sm flex items-center gap-2 text-warning-700">
              <input type="checkbox" className="w-4 h-4 accent-primary-500" checked={form.confirmNotDuplicate}
                onChange={event => setForm(form => ({ ...form, confirmNotDuplicate: event.target.checked }))} />
              أؤكد أنها ليست مكافأة مكررة لنفس السبب
            </label>
          )}

          {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{error}</div>}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <button type="button" className="btn-primary flex items-center gap-2 disabled:opacity-50" onClick={submit} disabled={busy} data-bonus-submit>
                <Send size={16} />
                {busy ? 'جارٍ الإرسال...' : 'إرسال المكافأة للاعتماد'}
              </button>
              <button type="button" className="btn-secondary text-sm" disabled={busy} onClick={onClose}>رجوع</button>
            </div>
            {canBulk && (
              <a href={bulkHref} className="text-xs text-primary-700 hover:underline flex items-center gap-1">
                <ExternalLink size={12} />
                مكافأة لمجموعة موظفين ← شاشة المكافآت
              </a>
            )}
          </div>
        </>}
      </div>
    </div>
  )
}

export default PayrollBonusCreateModal
