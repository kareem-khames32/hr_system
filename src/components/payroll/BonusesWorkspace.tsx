'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Download, Gift, Plus, RefreshCw, Settings2, Users, X } from 'lucide-react'
import { ApiError, can } from '@/lib/api'
import { csvDateStamp, downloadCsv } from '@/lib/csv'
import type { DeductionApprovalRole, DeductionStepView } from '@/lib/deductions-api'
import {
  approveBonus, BONUS_METHOD_LABELS, BONUS_METHOD_UNIT, BONUS_ROLE_LABELS, BONUS_STATUS_META, bonusBadgeClass, bonusInputError, cancelBonus,
  createBonusType, fetchBonus, fetchBonusCandidates, fetchBonusCreatable, fetchBonuses, fetchBonusTypes, formatBonusMoney, previewBonuses, rejectBonus,
  reverseBonus, submitBonusBatch, updateBonusType, withdrawBonus, type BonusCalcMethod, type BonusCandidate, type BonusCreatable, type BonusCreatorBasis,
  type BonusInput, type BonusPreview, type BonusSelection, type BonusSelectionMode, type BonusStatus, type BonusTypeInput, type BonusTypeView, type BonusView,
} from '@/lib/bonuses-api'
import { CompanyWideReadOnlyNote, useCompanyWideWrite } from '@/components/CompanyWideReadOnly'
import { DayRangeFilter, usePayrollDayRange } from '@/components/DayRangeFilter'
import { dateInRange, localDayOf } from '@/lib/payroll-month-range'

// C4 / الخطوة 27: مساحة المكافآت — القائمة والاعتماد (المدير الأعلى عند التصعيد ثم الموارد البشرية)، والاقتراح لموظف واحد
// أو اختيار أو فريق أو قسم أو فرع بمعاينة أرقام حقيقية واستبعاد، وكتالوج الأنواع. الخادم يعيد فحص النطاق والسقف والتكرار
// والفترة في كل خطوة؛ هذه الشاشة لا تقرر شيئًا ماليًا بنفسها.
type Tab = 'list' | 'create' | 'types'
type ActionKind = 'approve' | 'reject' | 'withdraw' | 'cancel' | 'reverse'
type ListFilters = { view: 'all' | 'pending_me' | 'created'; status: string; targetPeriod: string }
type CreatorMode = BonusSelectionMode
const errorText = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback
const moneyPattern = /^\d+(\.\d{1,2})?$/
const STEP_STATUS: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'بانتظار', className: 'bg-warning-100 text-warning-700' }, APPROVED: { label: 'معتمد', className: 'bg-success-100 text-success-700' },
  REJECTED: { label: 'مرفوض', className: 'bg-red-100 text-red-700' }, SKIPPED: { label: 'متخطّى', className: 'bg-gray-100 text-gray-500' },
}
// القرار هـ: «مكافأة فردية» و«مجموعة مختارة» صارا اختيارًا واحدًا — موظف واحد هو مجموعة من واحد
const SELECTION_LABELS: Record<CreatorMode, string> = { EMPLOYEES: 'موظف أو مجموعة مختارة', TEAM: 'فريق', DEPARTMENT: 'قسم (مع أقسامه الفرعية)', BRANCH: 'فرع' }
const PREVIEW_STATUS: Record<string, string> = { READY: 'جاهز', EXCLUDED: 'مستبعد' }
const ACTION_TITLES: Record<ActionKind, string> = { approve: 'اعتماد المكافأة', reject: 'رفض المكافأة', withdraw: 'سحب المكافأة', cancel: 'إلغاء المكافأة', reverse: 'عكس المكافأة المصروفة' }

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${className}`}>{children}</span>
}
const stepLabel = (step: Pick<DeductionStepView, 'roleLabel' | 'fallbackFrom' | 'fallbackFromLabel'>) =>
  `${step.roleLabel}${step.fallbackFrom ? ` (بديل عن ${step.fallbackFromLabel ?? BONUS_ROLE_LABELS[step.fallbackFrom]})` : ''}`

// رابط «بانتظار موافقتي» في صندوق الموافقات وكارت «مكافأة» في «طلب جديد» يفتحان الشاشة على العرض والتبويب المطلوبين
const urlParam = (key: string) => typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get(key)

export function BonusesWorkspace({ currency, mode, focusRequestId = null, initialTab, initialEmployeeId = null, initialPeriod = null }: {
  currency: string; mode: 'admin' | 'manager'; focusRequestId?: number | null
  // رابط «مكافأة» من جدول المسير: يفتح الاقتراح لموظف واحد بالموظف وشهر المسير جاهزين
  initialTab?: 'create'; initialEmployeeId?: number | null; initialPeriod?: string | null
}) {
  const [tab, setTab] = useState<Tab>('list')
  const [creatable, setCreatable] = useState<BonusCreatable | null>(null)
  const [loadError, setLoadError] = useState('')
  const [rows, setRows] = useState<BonusView[]>([])
  const [loadingRows, setLoadingRows] = useState(true)
  const [filters, setFilters] = useState<ListFilters>({ view: mode === 'manager' || focusRequestId ? 'all' : 'pending_me', status: '', targetPeriod: '' })
  const [canManage, setCanManage] = useState(false)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const view = urlParam('view')
    if (view === 'pending_me' || view === 'created' || view === 'all') setFilters(value => ({ ...value, view }))
  }, [])

  const loadRows = () => {
    setLoadingRows(true)
    fetchBonuses({ view: filters.view, status: filters.status || undefined, targetPeriod: filters.targetPeriod || undefined })
      .then(setRows).catch(error => setLoadError(errorText(error, 'تعذر تحميل المكافآت'))).finally(() => setLoadingRows(false))
  }
  useEffect(() => {
    setCanManage(can('bonuses.manage'))
    fetchBonusCreatable().then(value => { setCreatable(value); if ((initialTab === 'create' || urlParam('tab') === 'create') && value.types.length > 0) setTab('create') })
      .catch(error => setLoadError(errorText(error, 'تعذر تحميل أنواع المكافآت المسموحة'))).finally(() => setReady(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(loadRows, [filters.view, filters.status, filters.targetPeriod])
  useEffect(() => { if (focusRequestId) { setTab('list'); setFilters(value => ({ ...value, view: 'all' })) } }, [focusRequestId])

  const canCreate = (creatable?.types.length ?? 0) > 0
  // موظف ليس مديرًا ولا معتمدًا: لا مساحة إدارية تُعرض له
  if (mode === 'manager' && ready && !loadingRows && !canCreate && rows.length === 0 && filters.view === 'all' && !filters.status && !filters.targetPeriod && !focusRequestId) return null

  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-bold text-gray-800 flex items-center gap-2"><Gift size={20} className="text-success-500" />المكافآت</h3>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={tab === 'list' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('list')}>القائمة والاعتماد</button>
          {canCreate && <button type="button" className={tab === 'create' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('create')}><span className="flex items-center gap-1"><Plus size={16} />اقتراح مكافأة</span></button>}
          {canManage && <button type="button" className={tab === 'types' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('types')}><span className="flex items-center gap-1"><Settings2 size={16} />أنواع المكافآت</span></button>}
        </div>
      </div>
      {loadError && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm flex items-center gap-2"><AlertTriangle size={16} />{loadError}</div>}
      {tab === 'list' && <BonusList rows={rows} loading={loadingRows} filters={filters} setFilters={setFilters} reload={loadRows} currency={currency}
        reasonMinLength={creatable?.reasonMinLength ?? 20} focusRequestId={focusRequestId} />}
      {tab === 'create' && creatable && <BonusCreator creatable={creatable} currency={currency} initialEmployeeId={initialEmployeeId} initialPeriod={initialPeriod} onCreated={() => { setFilters(value => ({ ...value, view: 'created' })); setTab('list'); loadRows() }} />}
      {tab === 'types' && canManage && <BonusTypesPanel onChanged={() => fetchBonusCreatable().then(setCreatable).catch(() => undefined)} />}
    </div>
  )
}

function BonusList({ rows, loading, filters, setFilters, reload, currency, reasonMinLength, focusRequestId }: {
  rows: BonusView[]; loading: boolean; filters: ListFilters; setFilters: (update: (value: ListFilters) => ListFilters) => void
  reload: () => void; currency: string; reasonMinLength: number; focusRequestId: number | null
}) {
  const [expanded, setExpanded] = useState<number | null>(null)
  const [detail, setDetail] = useState<BonusView | null>(null)
  const [focused, setFocused] = useState<BonusView | null>(null)
  const [action, setAction] = useState<{ kind: ActionKind; row: BonusView } | null>(null)
  const [reason, setReason] = useState('')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!focusRequestId) return
    fetchBonus(focusRequestId).then(view => { setFocused(view); setExpanded(view.id); setDetail(view) }).catch(error => setNotice(errorText(error, 'تعذر فتح طلب المكافأة المطلوب')))
  }, [focusRequestId])
  // فلتر «من تاريخ / إلى تاريخ» على تاريخ الطلب — الافتراضي شهر الرواتب الجاري؛ الطلب المفتوح من رابط يظهر دايمًا
  const { range, setRange, context } = usePayrollDayRange()
  const rangeRows = range ? rows.filter(row => dateInRange(localDayOf(row.createdAt), range)) : rows
  const outsideRange = rows.length - rangeRows.length
  const shown = focused && !rangeRows.some(row => row.id === focused.id) ? [focused, ...rangeRows] : rangeRows

  const toggle = (row: BonusView) => {
    if (expanded === row.id) { setExpanded(null); setDetail(null); return }
    setExpanded(row.id); setDetail(null)
    fetchBonus(row.id).then(setDetail).catch(error => setNotice(errorText(error, 'تعذر تحميل تفاصيل المكافأة')))
  }
  const open = (kind: ActionKind, row: BonusView) => { setAction({ kind, row }); setReason(''); setAmount(''); setActionError('') }
  const submit = async () => {
    if (!action) return
    const { kind, row } = action
    const text = reason.trim()
    if (kind === 'reject' && text.length < 5) { setActionError('اكتب سبب الرفض (5 أحرف على الأقل).'); return }
    if ((kind === 'cancel' || kind === 'reverse') && text.length < reasonMinLength) { setActionError(`اكتب السبب (${reasonMinLength} حرفًا على الأقل).`); return }
    if (amount && (!moneyPattern.test(amount.trim()) || Number(amount) <= 0)) { setActionError('المبلغ رقم موجب بمنزلتين عشريتين على الأكثر.'); return }
    if (kind === 'approve' && amount && !text) { setActionError('اكتب سبب تعديل المبلغ.'); return }
    setBusy(true); setActionError('')
    try {
      const result = kind === 'approve' ? await approveBonus(row, text || undefined, amount.trim() || undefined)
        : kind === 'reject' ? await rejectBonus(row, text)
          : kind === 'withdraw' ? await withdrawBonus(row, text || undefined)
            : kind === 'cancel' ? await cancelBonus(row, text)
              : await reverseBonus(row, text, amount.trim() || undefined)
      setNotice(result.notice === 'OUT_OF_SCOPE_ROUTED_TO_HR' ? 'خرج الموظف عن نطاق المُقترِح؛ حُوّل الطلب لاعتماد الموارد البشرية.' : `تم: ${ACTION_TITLES[kind]} — ${result.statusLabel}`)
      setAction(null); setExpanded(null); setDetail(null); setFocused(null); reload()
    } catch (error) {
      setActionError(error instanceof ApiError && error.status === 409 ? `${error.message} — حدّث القائمة ثم أعد المحاولة.` : errorText(error, 'تعذر تنفيذ الإجراء'))
    } finally { setBusy(false) }
  }
  const exportCsv = () => downloadCsv(`bonuses-${csvDateStamp()}.csv`,
    ['رقم الطلب', 'الدفعة', 'الرقم الوظيفي', 'الموظف', 'النوع', 'القيمة', 'المبلغ', 'الشهر المستهدف', 'المُقترِح', 'صفة المُقترِح', 'الحالة', 'السبب'],
    shown.map(row => [row.id, row.batchId ?? '', row.employee.employeeCode ?? '', row.employee.fullName ?? `موظف #${row.employee.id}`, row.type.nameAr ?? '',
      `${row.type.calcMethodLabel}: ${row.inputValue}`, row.finalAmount ?? row.estimatedAmount, row.targetPeriod, row.creator.name ?? `مستخدم #${row.creator.userId}`,
      row.creator.basisLabel, row.statusLabel, row.reason]))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm text-gray-600">العرض
          <select className="input mt-1" value={filters.view} onChange={event => setFilters(value => ({ ...value, view: event.target.value as ListFilters['view'] }))}>
            <option value="pending_me">بانتظار اعتمادي</option>
            <option value="created">اقترحتها</option>
            <option value="all">كل ما يخصني في نطاقي</option>
          </select>
        </label>
        <label className="text-sm text-gray-600">الحالة
          <select className="input mt-1" value={filters.status} onChange={event => setFilters(value => ({ ...value, status: event.target.value }))}>
            <option value="">كل الحالات</option>
            {(Object.keys(BONUS_STATUS_META) as BonusStatus[]).map(status => <option key={status} value={status}>{BONUS_STATUS_META[status].label}</option>)}
          </select>
        </label>
        <label className="text-sm text-gray-600">شهر المسير المستهدف
          <input type="month" className="input mt-1" dir="ltr" value={filters.targetPeriod} onChange={event => setFilters(value => ({ ...value, targetPeriod: event.target.value }))} />
        </label>
        <DayRangeFilter idPrefix="bonuses" value={range} onChange={setRange} cycleStartDay={context?.cycleStartDay} today={context?.today} />
        <button type="button" className="btn-secondary flex items-center gap-1" onClick={reload}><RefreshCw size={16} />تحديث</button>
        <button type="button" className="btn-secondary flex items-center gap-1 disabled:opacity-50" onClick={exportCsv} disabled={loading || shown.length === 0}><Download size={16} />تصدير CSV</button>
      </div>
      {outsideRange > 0 && <p className="text-xs text-gray-500" data-outside-range>فيه {outsideRange} طلب تاريخه برا الفترة المختارة — غيّر «من تاريخ» أو «إلى تاريخ» عشان تشوفهم.</p>}
      {notice && <div role="status" className="bg-primary-50 text-primary-700 rounded-xl p-3 text-sm flex items-center justify-between">{notice}<button type="button" aria-label="إغلاق" onClick={() => setNotice('')}><X size={14} /></button></div>}
      {loading ? (
        <div className="flex items-center justify-center py-10"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : shown.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">لا توجد مكافآت بهذا العرض</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="text-right px-3 py-3">#</th>
                <th className="text-right px-3 py-3">المستفيد</th>
                <th className="text-right px-3 py-3">النوع</th>
                <th className="text-center px-3 py-3">المبلغ ({currency})</th>
                <th className="text-center px-3 py-3">الشهر المستهدف</th>
                <th className="text-right px-3 py-3">المُقترِح</th>
                <th className="text-center px-3 py-3">الحالة</th>
                <th className="text-center px-3 py-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(row => {
                const step = row.steps.find(item => item.order === row.currentStepOrder)
                return (
                  <Fragment key={row.id}>
                    <tr className={`table-row ${focusRequestId === row.id ? 'bg-primary-50' : ''}`}>
                      <td className="table-cell font-mono text-xs">{row.id}{row.batchId ? <span className="block text-gray-400">دفعة {row.batchId}</span> : null}</td>
                      <td className="table-cell"><span className="font-medium text-gray-800">{row.employee.fullName ?? `موظف #${row.employee.id}`}</span><span className="block text-xs text-gray-400">{row.employee.employeeCode}</span></td>
                      <td className="table-cell text-sm">{row.type.nameAr}<span className="block text-xs text-gray-400">{row.type.calcMethodLabel}: {row.inputValue}</span></td>
                      <td className="table-cell text-center font-mono text-success-700">{formatBonusMoney(row.finalAmount ?? row.estimatedAmount)}
                        {row.reversedAmount !== '0.00' && <span className="block text-xs text-red-600">مسترد {formatBonusMoney(row.reversedAmount)}</span>}</td>
                      <td className="table-cell text-center font-mono" dir="ltr">{row.targetPeriod}</td>
                      <td className="table-cell text-sm">{row.creator.name ?? `مستخدم #${row.creator.userId}`}<span className="block text-xs text-gray-400">{row.creator.basisLabel}</span></td>
                      <td className="table-cell text-center">
                        <Badge className={bonusBadgeClass(row.status, row.payout?.state)}>{row.statusLabel}</Badge>
                        {row.status === 'IN_APPROVAL' && step && <span className="block text-xs text-gray-400 mt-1">بانتظار {stepLabel(step)}{step.approverName ? `: ${step.approverName}` : ''}</span>}
                        {row.escalated && <span className="block text-xs text-warning-700">مصعّدة للمدير الأعلى</span>}
                        {row.capExceeded && <span className="block text-xs text-orange-700">تتجاوز سقف النوع (باستثناء مسجل)</span>}
                        {row.outOfScope && <span className="block text-xs text-orange-700">خرج عن النطاق</span>}
                      </td>
                      <td className="table-cell">
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          <button type="button" className="p-1.5 bg-gray-100 rounded-lg hover:bg-gray-200" title="التفاصيل" onClick={() => toggle(row)}>{expanded === row.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
                          {row.capabilities.canApprove && <button type="button" className="btn-primary text-xs px-2 py-1" onClick={() => open('approve', row)}>اعتماد</button>}
                          {row.capabilities.canReject && <button type="button" className="btn-secondary text-xs px-2 py-1" onClick={() => open('reject', row)}>رفض</button>}
                          {row.capabilities.canWithdraw && <button type="button" className="btn-secondary text-xs px-2 py-1" onClick={() => open('withdraw', row)}>سحب</button>}
                          {row.capabilities.canCancel && <button type="button" className="btn-secondary text-xs px-2 py-1 text-red-600" onClick={() => open('cancel', row)}>إلغاء</button>}
                          {row.capabilities.canReverse && <button type="button" className="btn-secondary text-xs px-2 py-1" onClick={() => open('reverse', row)}>عكس</button>}
                        </div>
                      </td>
                    </tr>
                    {expanded === row.id && (
                      <tr>
                        <td colSpan={8} className="bg-gray-50 p-4">
                          {!detail ? <p className="text-sm text-gray-400">جارٍ تحميل التفاصيل…</p> : (
                            <div className="grid md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="font-medium text-gray-700 mb-1">السبب والحساب</p>
                                <p className="text-gray-600 whitespace-pre-wrap">{detail.reason}</p>
                                {detail.attachmentRef && <p className="text-gray-500">المرجع: {detail.attachmentRef}</p>}
                                {detail.amountTrace?.creation?.formula && <p className="text-xs text-gray-500 mt-1" dir="ltr">{detail.amountTrace.creation.formula}</p>}
                                {detail.decisionReason && <p className="text-gray-500 mt-1">سبب القرار: {detail.decisionReason}</p>}
                              </div>
                              <div>
                                <p className="font-medium text-gray-700 mb-1">سلسلة الاعتماد الملتقطة</p>
                                <ol className="space-y-1">
                                  {detail.steps.map(item => (
                                    <li key={item.order} className="flex flex-wrap items-center gap-2">
                                      <span className="text-gray-500">{item.order}.</span>{stepLabel(item)}{item.approverName ? ` (${item.approverName})` : ''}
                                      <Badge className={STEP_STATUS[item.status].className}>{STEP_STATUS[item.status].label}</Badge>
                                      {item.escalation && <Badge className="bg-warning-100 text-warning-700">تصعيد</Badge>}
                                      {item.note && <span className="text-xs text-gray-400 w-full">{item.note}</span>}
                                      {item.adjustedTo && <span className="text-xs text-gray-500 w-full">عُدّل المبلغ من {formatBonusMoney(item.adjustedFrom ?? null)} إلى {formatBonusMoney(item.adjustedTo)}</span>}
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {action && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-gray-800">{ACTION_TITLES[action.kind]} #{action.row.id}</h4>
              <button type="button" aria-label="إغلاق" onClick={() => setAction(null)}><X size={18} /></button>
            </div>
            <p className="text-sm text-gray-600">{action.row.employee.fullName} — {action.row.type.nameAr} — {formatBonusMoney(action.row.finalAmount ?? action.row.estimatedAmount)} {currency} لشهر <span dir="ltr">{action.row.targetPeriod}</span></p>
            {action.kind === 'approve' && action.row.capabilities.canAdjust && (
              <label className="block text-sm text-gray-600">تعديل المبلغ (اختياري، بحدود النوع وسقفه)
                <input className="input mt-1" dir="ltr" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} placeholder={action.row.estimatedAmount} />
              </label>
            )}
            {action.kind === 'reverse' && (
              <label className="block text-sm text-gray-600">مبلغ الاسترداد (فارغ = كل المصروف غير المسترد {formatBonusMoney(action.row.paidAmount)} − {formatBonusMoney(action.row.reversedAmount)})
                <input className="input mt-1" dir="ltr" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} />
              </label>
            )}
            <label className="block text-sm text-gray-600">{action.kind === 'reject' ? 'سبب الرفض (إلزامي)' : action.kind === 'cancel' || action.kind === 'reverse' ? `السبب (${reasonMinLength} حرفًا على الأقل)` : 'ملاحظة (اختيارية)'}
              <textarea className="input mt-1 min-h-[80px]" value={reason} onChange={event => setReason(event.target.value)} />
            </label>
            {action.kind === 'approve' && <p className="text-xs text-gray-500">الاعتماد الأخير ينشئ قيد إضافة للموظف المستفيد في شهر المسير المستهدف؛ يُصرف مع ذلك المسير فقط.</p>}
            {action.kind === 'cancel' && <p className="text-xs text-gray-500">قيد المكافأة غير المحجوز يُلغى؛ المحجوز في مسير معتمد يحتاج إعادة فتح المسير، والمصروف يُعكس بإجراء «عكس».</p>}
            {action.kind === 'reverse' && <p className="text-xs text-gray-500">يُنشأ قيد استرداد يُخصم في أول مسير مفتوح؛ المسير المصروف لا يتغير.</p>}
            {actionError && <p role="alert" className="text-sm text-red-600">{actionError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setAction(null)} disabled={busy}>رجوع</button>
              <button type="button" className="btn-primary" onClick={submit} disabled={busy}>{busy ? 'جارٍ التنفيذ…' : 'تأكيد'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BonusCreator({ creatable, currency, onCreated, initialEmployeeId = null, initialPeriod = null }: {
  creatable: BonusCreatable; currency: string; onCreated: () => void; initialEmployeeId?: number | null; initialPeriod?: string | null
}) {
  const [typeId, setTypeId] = useState<number>(creatable.types[0]?.id ?? 0)
  const type = creatable.types.find(row => row.id === typeId) ?? null
  const [candidates, setCandidates] = useState<BonusCandidate[]>([])
  const [candidateError, setCandidateError] = useState('')
  const [selectionMode, setSelectionMode] = useState<CreatorMode>('EMPLOYEES')
  const [branchId, setBranchId] = useState<number | ''>('')
  const [departmentId, setDepartmentId] = useState<number | ''>('')
  const [teamId, setTeamId] = useState<number | ''>('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [excluded, setExcluded] = useState<Set<number>>(new Set())
  const [form, setForm] = useState({ inputValue: '', reason: '', targetPeriod: initialPeriod ?? creatable.currentPeriod, attachmentRef: '', confirmNotDuplicate: false })
  // الموظف القادم من رابط المسير يُختار مرة واحدة بعد تحميل الموظفين في النطاق
  const [pendingEmployeeId, setPendingEmployeeId] = useState<number | null>(initialEmployeeId)
  const [preview, setPreview] = useState<BonusPreview | null>(null)
  const [previewKey, setPreviewKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState('')

  useEffect(() => {
    if (!typeId) return
    setCandidateError('')
    fetchBonusCandidates(typeId).then(setCandidates).catch(err => setCandidateError(errorText(err, 'تعذر تحميل الموظفين في نطاقك')))
    setForm(value => ({ ...value, inputValue: type?.defaultValue ?? '' }))
    // تغيير النوع يغيّر النطاق والحدود: المعاينة والاختيار السابقان لا يصلحان. الموظف المختار (أو القادم من رابط المسير)
    // يُعاد اختياره تلقائيًا متى كان داخل نطاق النوع الجديد بعد تحميل موظفيه.
    if (selected.size === 1) setPendingEmployeeId([...selected][0])
    setCandidates([])
    setPreview(null); setSelected(new Set()); setExcluded(new Set())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeId])
  useEffect(() => {
    if (!pendingEmployeeId || !candidates.some(row => row.id === pendingEmployeeId)) return
    setSelectionMode('EMPLOYEES'); setSelected(new Set([pendingEmployeeId])); setPendingEmployeeId(null)
  }, [candidates, pendingEmployeeId])

  // القسم مع فروعه: نفس حل الخادم (مسار القسم صعودًا يضم القسم المختار)
  const inDepartment = (row: BonusCandidate, id: number) => row.departmentPath?.length ? row.departmentPath.some(item => item.id === id) : row.departmentId === id
  const branches = useMemo(() => [...new Map(candidates.map(row => [row.branchId, row.branchName ?? `فرع #${row.branchId}`])).entries()], [candidates])
  const departments = useMemo(() => {
    const map = new Map<number, string>()
    for (const row of candidates.filter(item => !branchId || item.branchId === branchId)) {
      for (const item of row.departmentPath ?? (row.departmentId ? [{ id: row.departmentId, name: row.departmentName }] : [])) if (!map.has(item.id)) map.set(item.id, item.name ?? `قسم #${item.id}`)
    }
    return [...map.entries()]
  }, [candidates, branchId])
  const teams = useMemo(() => [...new Map(candidates.filter(row => row.teamId && (!branchId || row.branchId === branchId) && (!departmentId || inDepartment(row, departmentId)))
    .map(row => [row.teamId as number, row.teamName ?? `فريق #${row.teamId}`])).entries()],
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [candidates, branchId, departmentId])
  const unitMode = selectionMode === 'TEAM' || selectionMode === 'DEPARTMENT' || selectionMode === 'BRANCH'
  // المشمولون فعلًا بالوحدة المختارة كما يحلها الخادم؛ البحث لا يغيّر من يُكافأ
  const members = useMemo(() => selectionMode === 'TEAM' ? (teamId ? candidates.filter(row => row.teamId === teamId) : [])
    : selectionMode === 'DEPARTMENT' ? (departmentId ? candidates.filter(row => inDepartment(row, departmentId)) : [])
      : selectionMode === 'BRANCH' ? (branchId ? candidates.filter(row => row.branchId === branchId) : []) : [],
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [selectionMode, teamId, departmentId, branchId, candidates])
  const searchText = search.trim()
  const matches = (row: BonusCandidate) => !searchText || row.fullName.includes(searchText) || row.employeeCode.includes(searchText)
  const visible = unitMode ? members.filter(matches)
    : candidates.filter(row => (!branchId || row.branchId === branchId) && (!departmentId || inDepartment(row, departmentId)) && (!teamId || row.teamId === teamId) && matches(row))
  const unitId = selectionMode === 'TEAM' ? teamId : selectionMode === 'DEPARTMENT' ? departmentId : selectionMode === 'BRANCH' ? branchId : ''
  // تغيير الوحدة المختارة يصفّر الاستبعاد؛ الاستبعاد نفسه لا يتأثر بالبحث أو الفلاتر
  useEffect(() => { setExcluded(new Set()) }, [selectionMode, unitId])

  const input: BonusInput = { bonusTypeId: typeId, inputValue: form.inputValue.trim(), reason: form.reason, targetPeriod: form.targetPeriod,
    ...(form.attachmentRef.trim() ? { attachmentRef: form.attachmentRef.trim() } : {}), confirmNotDuplicate: form.confirmNotDuplicate }
  const selection: BonusSelection = selectionMode === 'EMPLOYEES'
    ? { mode: 'EMPLOYEES', ids: [...selected].sort((a, b) => a - b), excludeEmployeeIds: [] }
    : { mode: selectionMode, ids: unitId ? [unitId as number] : [], excludeEmployeeIds: [...excluded].sort((a, b) => a - b) }
  const currentKey = JSON.stringify({ input, selection })
  const stale = !!preview && previewKey !== currentKey
  const hiddenSelected = selectionMode === 'EMPLOYEES' ? [...selected].filter(id => !visible.some(row => row.id === id)).length : 0

  const changeMode = (value: CreatorMode) => {
    setSelectionMode(value); setPreview(null)
    if (value === 'BRANCH') { setDepartmentId(''); setTeamId('') }
    if (value === 'DEPARTMENT') setTeamId('')
  }
  const toggleSet = (set: Set<number>, id: number, apply: (next: Set<number>) => void) => { const next = new Set(set); if (next.has(id)) next.delete(id); else next.add(id); apply(next) }
  // القرار هـ: «إرسال» يعاين داخليًا ثم يرسل ببصمة تلك المعاينة — بلا خطوة ثانية على المستخدم
  const submit = async () => {
    const problem = bonusInputError(input, creatable.reasonMinLength, type)
    if (problem) { setError(problem); return }
    if (!selection.ids.length) { setError(selectionMode === 'EMPLOYEES' ? 'اختر موظفًا واحدًا على الأقل.' : `اختر ${SELECTION_LABELS[selectionMode]} من الفلاتر.`); return }
    setBusy(true); setError(''); setResult('')
    let fresh: BonusPreview
    try { fresh = preview && !stale ? preview : await previewBonuses(input, selection); setPreview(fresh); setPreviewKey(currentKey) }
    catch (err) { setError(errorText(err, 'تعذرت المعاينة')); setBusy(false); return }
    if (!fresh.totals.ready) { setError('لا يوجد موظف جاهز للإرسال؛ راجع الأسباب بالجدول.'); setBusy(false); return }
    try {
      const created = await submitBonusBatch(input, selection, fresh.previewHash)
      setResult(`أُرسلت ${created.created.length} مكافأة للاعتماد${created.skipped.length ? `، وتُخطّي ${created.skipped.length} بسبب ظاهر في الجدول` : ''}.`)
      setSelected(new Set()); setExcluded(new Set())
      setPreview(null); setForm(value => ({ ...value, reason: '', confirmNotDuplicate: false }))
      onCreated()
    } catch (err) {
      const fresh = err instanceof ApiError ? (err.details?.preview as BonusPreview | undefined) : undefined
      if (fresh) { setPreview(fresh); setPreviewKey(currentKey) }
      setError(errorText(err, 'تعذر الإرسال'))
    } finally { setBusy(false) }
  }
  const hasDuplicates = preview?.rows.some(row => row.status === 'BONUS_DUPLICATE')

  if (!type) return <p className="text-sm text-gray-400">لا توجد أنواع مكافآت مسموحة لك.</p>
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">نطاقك: {creatable.basisLabels.join('، ')}. المكافأة تُرسل كطلب للموظف المستفيد نفسه (لا لك)، تمر بسلسلة النوع وتنتهي بالموارد البشرية، ثم تُصرف في شهر المسير المستهدف. لا مكافأة لنفسك ولا لمن يعلوك.</p>
      <div className="grid md:grid-cols-3 gap-3">
        <label className="text-sm text-gray-600">نوع المكافأة
          <select className="input mt-1" value={typeId} onChange={event => setTypeId(Number(event.target.value))}>
            {creatable.types.map(row => <option key={row.id} value={row.id}>{row.nameAr} — {row.calcMethodLabel}</option>)}
          </select>
        </label>
        <label className="text-sm text-gray-600">{BONUS_METHOD_UNIT[type.calcMethod]} ({type.calcMethodLabel})
          <input className="input mt-1" dir="ltr" inputMode="decimal" value={form.inputValue} onChange={event => setForm(value => ({ ...value, inputValue: event.target.value }))} />
        </label>
        <label className="text-sm text-gray-600">شهر المسير المستهدف
          <input type="month" className="input mt-1" dir="ltr" value={form.targetPeriod} onChange={event => setForm(value => ({ ...value, targetPeriod: event.target.value }))} />
          <span className="text-xs text-gray-400">الشهر الحالي للمسير: {creatable.currentPeriod} (الدورة تبدأ يوم {creatable.cycleStartDay})</span>
        </label>
        <label className="text-sm text-gray-600 md:col-span-2">سبب المكافأة ({creatable.reasonMinLength} حرفًا على الأقل — {form.reason.trim().length})
          <textarea className="input mt-1 min-h-[60px]" maxLength={1000} value={form.reason} onChange={event => setForm(value => ({ ...value, reason: event.target.value }))} />
        </label>
        <label className="text-sm text-gray-600">مرجع مستند (اختياري)
          <input className="input mt-1" value={form.attachmentRef} maxLength={300} onChange={event => setForm(value => ({ ...value, attachmentRef: event.target.value }))} />
        </label>
      </div>
      <div className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
        حدود النوع: الحد الأدنى {formatBonusMoney(type.minAmount)}، الحد الأعلى {type.maxAmount ? formatBonusMoney(type.maxAmount) : 'بلا'}،
        سقف المكافأة الواحدة {type.maxPctOfBase ? `${type.maxPctOfBase}% من الأساسي${creatable.canExceedCap ? ' (تملك صلاحية تجاوزه)' : ''}` : 'بلا'}
        {type.valueStep ? `، خطوة المدخل ${type.valueStep}` : ''}.
        السلسلة: {type.approvalSteps.map(role => BONUS_ROLE_LABELS[role]).join(' ← ')}.
      </div>

      <div className="border border-gray-100 rounded-xl p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gray-700 flex items-center gap-1"><Users size={16} />المستفيدون</span>
          {(Object.keys(SELECTION_LABELS) as CreatorMode[]).map(value => (
            <label key={value} className="text-sm flex items-center gap-1">
              <input type="radio" name="bonus-selection" checked={selectionMode === value} onChange={() => changeMode(value)} />
              {SELECTION_LABELS[value]}
            </label>
          ))}
        </div>
        {candidateError && <p role="alert" className="text-sm text-red-600">{candidateError}</p>}
        <div className="grid md:grid-cols-4 gap-2">
          <select className="input" value={branchId} onChange={event => { setBranchId(event.target.value ? Number(event.target.value) : ''); setDepartmentId(''); setTeamId('') }}>
            <option value="">{selectionMode === 'BRANCH' ? 'اختر الفرع' : 'كل الفروع في نطاقك'}</option>
            {branches.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <select className="input" value={departmentId} disabled={selectionMode === 'BRANCH'} title={selectionMode === 'BRANCH' ? 'اختيار الفرع يشمل كل أقسامه' : undefined}
            onChange={event => { setDepartmentId(event.target.value ? Number(event.target.value) : ''); setTeamId('') }}>
            <option value="">{selectionMode === 'DEPARTMENT' ? 'اختر القسم' : 'كل الأقسام'}</option>
            {departments.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <select className="input" value={teamId} disabled={selectionMode === 'BRANCH' || selectionMode === 'DEPARTMENT'} title={selectionMode === 'DEPARTMENT' ? 'اختيار القسم يشمل كل فرقه' : undefined}
            onChange={event => setTeamId(event.target.value ? Number(event.target.value) : '')}>
            <option value="">{selectionMode === 'TEAM' ? 'اختر الفريق' : 'كل الفرق'}</option>
            {teams.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <input className="input" placeholder="بحث بالاسم أو الرقم الوظيفي" value={search} onChange={event => setSearch(event.target.value)} />
        </div>
        {unitMode && !unitId && <p className="text-xs text-warning-700">اختر {SELECTION_LABELS[selectionMode]} من الفلاتر أعلاه؛ الموظفون خارج نطاقك لا يُحسبون ولا يُعرضون.</p>}
        <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
          {visible.length === 0 ? <p className="text-sm text-gray-400 p-2">لا يوجد موظفون في نطاقك بهذه الفلاتر</p> : visible.map(row => {
            const checked = selectionMode === 'EMPLOYEES' ? selected.has(row.id) : !excluded.has(row.id)
            return (
              <label key={row.id} className="flex items-center gap-2 p-2 text-sm">
                <input type="checkbox" checked={checked}
                  onChange={() => selectionMode === 'EMPLOYEES' ? toggleSet(selected, row.id, setSelected) : toggleSet(excluded, row.id, setExcluded)} />
                <span className="font-medium text-gray-800">{row.fullName}</span>
                <span className="text-xs text-gray-400">{row.employeeCode} — {[row.branchName, row.departmentName, row.teamName].filter(Boolean).join(' / ')} — {row.basisLabels.join('، ')}</span>
                {unitMode && excluded.has(row.id) && <Badge className="bg-gray-100 text-gray-600">مستبعد</Badge>}
              </label>
            )
          })}
        </div>
        <p className="text-xs text-gray-400">
          {selectionMode === 'EMPLOYEES' ? `محدد ${selected.size}${hiddenSelected ? ` (منهم ${hiddenSelected} خارج الفلاتر الحالية ويبقون مختارين)` : ''}`
            : `المشمولون ${members.length}، المستبعدون ${excluded.size}${visible.length !== members.length ? ` — يُعرض ${visible.length} بالبحث؛ البحث لا يغيّر من يُكافأ` : ''}. إلغاء التحديد يستبعد الموظف.`}
        </p>
      </div>

      {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
      {result && <div role="status" className="bg-success-50 text-success-700 rounded-xl p-3 text-sm flex items-center gap-2"><CheckCircle2 size={16} />{result}</div>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" onClick={submit} disabled={busy}>{busy ? 'جارٍ…' : 'إرسال للاعتماد'}</button>
      </div>

      {preview && (preview.totals.failed > 0 || preview.totals.excluded > 0) && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-3 text-sm">
            <Badge className="bg-success-100 text-success-700">جاهز {preview.totals.ready}</Badge>
            <Badge className="bg-gray-100 text-gray-600">مستبعد {preview.totals.excluded}</Badge>
            <Badge className="bg-red-100 text-red-700">مرفوض {preview.totals.failed}</Badge>
            <span className="font-medium">إجمالي المجموعة ({preview.totals.ready} موظف): {formatBonusMoney(preview.totals.totalAmount)} {currency}</span>
          </div>
          {hasDuplicates && (
            <label className="text-sm flex items-center gap-2 text-warning-700">
              <input type="checkbox" checked={form.confirmNotDuplicate} onChange={event => setForm(value => ({ ...value, confirmNotDuplicate: event.target.checked }))} />
              أؤكد أن هذه ليست مكافآت مكررة (ثم أعد المعاينة)
            </label>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="text-right px-3 py-2">الموظف</th>
                  <th className="text-center px-3 py-2">النتيجة</th>
                  <th className="text-center px-3 py-2">المبلغ</th>
                  <th className="text-right px-3 py-2">الحساب</th>
                  <th className="text-right px-3 py-2">السلسلة</th>
                  <th className="text-center px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map(row => (
                  <tr key={row.employeeId} className="table-row">
                    <td className="table-cell text-sm">{row.fullName ?? `غير متاح في نطاقك #${row.employeeId}`}<span className="block text-xs text-gray-400">{row.employeeCode} {row.departmentName ? `— ${row.departmentName}` : ''} {row.teamName ? `— ${row.teamName}` : ''}</span></td>
                    <td className="table-cell text-center text-sm">
                      <Badge className={row.status === 'READY' ? 'bg-success-100 text-success-700' : row.status === 'EXCLUDED' ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-700'}>{PREVIEW_STATUS[row.status] ?? 'مرفوض'}</Badge>
                      {row.message && <span className="block text-xs text-gray-500 mt-1">{row.message}</span>}
                    </td>
                    <td className="table-cell text-center font-mono text-success-700">{formatBonusMoney(row.amount)}</td>
                    <td className="table-cell text-xs text-gray-600"><span dir="ltr">{row.formula ?? ''}</span>
                      {row.capLimit ? <span className="block text-gray-400">السقف {formatBonusMoney(row.capLimit)}{row.capExceeded ? ' — متجاوز بصلاحية' : ''}</span> : null}
                      {row.escalated ? <span className="block text-warning-700">فوق حد التصعيد {formatBonusMoney(row.escalationThreshold)}</span> : null}</td>
                    <td className="table-cell text-xs">{row.steps.map(step => `${stepLabel(step)}${step.status === 'SKIPPED' ? ' (متخطّى)' : ''}${step.escalation ? ' (تصعيد)' : ''}`).join(' ← ')}</td>
                    <td className="table-cell text-center">
                      {unitMode && (row.status === 'READY' || row.status === 'EXCLUDED') && (
                        <button type="button" className={`text-xs underline ${row.status === 'READY' ? 'text-red-600' : 'text-primary-700'}`} onClick={() => toggleSet(excluded, row.employeeId, setExcluded)}>
                          {row.status === 'READY' ? 'استبعاد' : 'إرجاع'}</button>
                      )}
                      {row.status === 'READY' && selectionMode === 'EMPLOYEES' && <button type="button" className="text-xs text-red-600 underline" onClick={() => toggleSet(selected, row.employeeId, setSelected)}>إزالة</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

const CREATOR_BASES: BonusCreatorBasis[] = ['DIRECT_MANAGER', 'TEAM_LEADER', 'DEPARTMENT_MANAGER', 'BRANCH_MANAGER', 'HR']
const CHAIN_ROLES: DeductionApprovalRole[] = ['DIRECT_MANAGER', 'TEAM_LEADER', 'DEPARTMENT_MANAGER', 'BRANCH_MANAGER', 'EXECUTIVE']
const ESCALATION_ROLES: DeductionApprovalRole[] = ['DEPARTMENT_MANAGER', 'BRANCH_MANAGER', 'EXECUTIVE']
const emptyType = (): BonusTypeInput => ({ code: '', nameAr: '', nameEn: '', calcMethod: 'FIXED_AMOUNT', defaultValue: '', valueStep: '', minAmount: '1', maxAmount: '', maxPctOfBase: '100',
  isTaxable: true, isInsurable: false, creatorScopes: [...CREATOR_BASES], approvalSteps: ['HR'], escalationDays: '', escalationStep: 'DEPARTMENT_MANAGER', isActive: true })
const blank = (value: unknown) => value === '' || value === undefined ? null : value
const toggleList = <T,>(items: T[] | undefined, item: T) => (items ?? []).includes(item) ? (items ?? []).filter(value => value !== item) : [...(items ?? []), item]

function BonusTypesPanel({ onChanged }: { onChanged: () => void }) {
  const [types, setTypes] = useState<BonusTypeView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<BonusTypeView | 'new' | null>(null)
  const [form, setForm] = useState<BonusTypeInput>(emptyType())
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  // أنواع المكافآت لكل الشركة: حساب الفرع يشوفها بس
  const { canWrite, readOnly } = useCompanyWideWrite()

  const load = () => { setLoading(true); fetchBonusTypes(true).then(setTypes).catch(err => setError(errorText(err, 'تعذر تحميل الكتالوج'))).finally(() => setLoading(false)) }
  useEffect(load, [])
  const open = (row: BonusTypeView | 'new') => {
    setEditing(row); setFormError('')
    setForm(row === 'new' ? emptyType() : { ...row, nameEn: row.nameEn ?? '', defaultValue: row.defaultValue ?? '', valueStep: row.valueStep ?? '', minAmount: row.minAmount ?? '',
      maxAmount: row.maxAmount ?? '', maxPctOfBase: row.maxPctOfBase ?? '', escalationDays: row.escalationDays ?? '' })
  }
  const save = async () => {
    const escalationDays = blank(form.escalationDays) as string | null
    const payload: BonusTypeInput = {
      nameAr: form.nameAr, nameEn: (blank(form.nameEn) as string | null), calcMethod: form.calcMethod, defaultValue: blank(form.defaultValue) as string | null,
      valueStep: form.calcMethod === 'DAYS_OF_SALARY' ? blank(form.valueStep) as string | null : null, minAmount: blank(form.minAmount) as string | null,
      maxAmount: blank(form.maxAmount) as string | null, maxPctOfBase: blank(form.maxPctOfBase) as string | null, isTaxable: !!form.isTaxable, isInsurable: !!form.isInsurable,
      creatorScopes: form.creatorScopes, approvalSteps: form.approvalSteps, escalationDays, escalationStep: escalationDays === null ? null : form.escalationStep, isActive: !!form.isActive,
      ...(editing === 'new' ? { code: form.code?.trim() } : {}),
    }
    if (!payload.creatorScopes?.length) { setFormError('اختر نطاق مُقترِح واحدًا على الأقل.'); return }
    setBusy(true); setFormError('')
    try {
      if (editing === 'new') await createBonusType(payload)
      else if (editing) await updateBonusType(editing.id, payload)
      setEditing(null); load(); onChanged()
    } catch (err) { setFormError(errorText(err, 'تعذر حفظ نوع المكافأة')) } finally { setBusy(false) }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">تعديل طريقة الحساب أو الحدود أو السقف أو النطاق أو السلسلة يرفع نسخة النوع؛ الطلبات القائمة تبقى بلقطتها.</p>
        {canWrite && <button type="button" className="btn-primary flex items-center gap-1" onClick={() => open('new')}><Plus size={16} />نوع جديد</button>}
      </div>
      {readOnly && <CompanyWideReadOnlyNote />}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {loading ? <p className="text-sm text-gray-400">جارٍ التحميل…</p> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="text-right px-3 py-2">الاسم</th><th className="text-right px-3 py-2">الحساب</th>
                <th className="text-center px-3 py-2">السقف</th><th className="text-right px-3 py-2">النطاق والسلسلة</th><th className="text-center px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {types.map(row => (
                <tr key={row.id} className="table-row">
                  <td className="table-cell text-sm">{row.nameAr}{!row.isActive && <Badge className="bg-gray-100 text-gray-500">معطل</Badge>}</td>
                  <td className="table-cell text-sm">{row.calcMethodLabel}{row.defaultValue ? ` (افتراضي ${row.defaultValue})` : ''}</td>
                  <td className="table-cell text-center text-sm">{row.maxPctOfBase ? `${row.maxPctOfBase}% من الأساسي` : 'بلا'}</td>
                  <td className="table-cell text-xs text-gray-600">{row.creatorScopes.map(role => BONUS_ROLE_LABELS[role]).join('، ')}<span className="block">{row.approvalSteps.map(role => BONUS_ROLE_LABELS[role]).join(' ← ')}</span></td>
                  <td className="table-cell text-center">{canWrite && <button type="button" className="btn-secondary text-xs px-2 py-1" onClick={() => open(row)}>تعديل</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && canWrite && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-gray-800">{editing === 'new' ? 'نوع مكافأة جديد' : `تعديل ${editing.nameAr}`}</h4>
              <button type="button" aria-label="إغلاق" onClick={() => setEditing(null)}><X size={18} /></button>
            </div>
            <div className="grid md:grid-cols-3 gap-3 text-sm">
              <label className="text-gray-600">الاسم العربي<input className="input mt-1" value={form.nameAr ?? ''} onChange={event => setForm(value => ({ ...value, nameAr: event.target.value }))} /></label>
              <label className="text-gray-600">طريقة الحساب
                <select className="input mt-1" value={form.calcMethod} onChange={event => setForm(value => ({ ...value, calcMethod: event.target.value as BonusCalcMethod }))}>
                  {(Object.keys(BONUS_METHOD_LABELS) as BonusCalcMethod[]).map(method => <option key={method} value={method}>{BONUS_METHOD_LABELS[method]}</option>)}
                </select>
              </label>
              <label className="text-gray-600">القيمة الافتراضية<input className="input mt-1" dir="ltr" value={form.defaultValue ?? ''} onChange={event => setForm(value => ({ ...value, defaultValue: event.target.value }))} /></label>
              {form.calcMethod === 'DAYS_OF_SALARY' && <label className="text-gray-600">خطوة الأيام<input className="input mt-1" dir="ltr" value={form.valueStep ?? ''} onChange={event => setForm(value => ({ ...value, valueStep: event.target.value }))} /></label>}
              <label className="text-gray-600">الحد الأدنى<input className="input mt-1" dir="ltr" value={form.minAmount ?? ''} onChange={event => setForm(value => ({ ...value, minAmount: event.target.value }))} /></label>
              <label className="text-gray-600">الحد الأعلى (فارغ = بلا)<input className="input mt-1" dir="ltr" value={form.maxAmount ?? ''} onChange={event => setForm(value => ({ ...value, maxAmount: event.target.value }))} /></label>
              <label className="text-gray-600">السقف % من الأساسي (فارغ = بلا)<input className="input mt-1" dir="ltr" value={form.maxPctOfBase ?? ''} onChange={event => setForm(value => ({ ...value, maxPctOfBase: event.target.value }))} /></label>
              <label className="flex items-center gap-2 text-gray-600 self-end pb-2"><input type="checkbox" checked={!!form.isActive} onChange={event => setForm(value => ({ ...value, isActive: event.target.checked }))} />مفعل</label>
            </div>
            <div className="text-sm text-gray-600">
              <p className="font-medium">من يقترح</p>
              <div className="flex flex-wrap gap-3 mt-1">{CREATOR_BASES.map(role => <label key={role} className="flex items-center gap-1"><input type="checkbox" checked={(form.creatorScopes ?? []).includes(role)} onChange={() => setForm(value => ({ ...value, creatorScopes: toggleList(value.creatorScopes, role) }))} />{BONUS_ROLE_LABELS[role]}</label>)}</div>
            </div>
            <div className="text-sm text-gray-600">
              <p className="font-medium">خطوات قبل الموارد البشرية (الموارد البشرية آخر خطوة دائمًا)</p>
              <div className="flex flex-wrap gap-3 mt-1">{CHAIN_ROLES.map(role => <label key={role} className="flex items-center gap-1"><input type="checkbox" checked={(form.approvalSteps ?? []).includes(role)} onChange={() => setForm(value => ({ ...value, approvalSteps: [...toggleList((value.approvalSteps ?? []).filter(item => item !== 'HR'), role), 'HR'] }))} />{BONUS_ROLE_LABELS[role]}</label>)}</div>
            </div>
            <details className="text-sm border border-gray-100 rounded-xl p-3">
              <summary className="cursor-pointer text-gray-700 font-medium">خيارات إضافية</summary>
              <div className="grid md:grid-cols-3 gap-3 mt-3">
                <label className="text-gray-600">الكود<input className="input mt-1" dir="ltr" value={form.code ?? ''} disabled={editing !== 'new'} onChange={event => setForm(value => ({ ...value, code: event.target.value.toUpperCase() }))} /></label>
                <label className="text-gray-600">الاسم الإنجليزي<input className="input mt-1" dir="ltr" value={form.nameEn ?? ''} onChange={event => setForm(value => ({ ...value, nameEn: event.target.value }))} /></label>
                <label className="text-gray-600">حد التصعيد بأيام الراتب (فارغ = بلا)<input className="input mt-1" dir="ltr" value={form.escalationDays ?? ''} onChange={event => setForm(value => ({ ...value, escalationDays: event.target.value }))} /></label>
                <label className="text-gray-600">خطوة التصعيد (المدير الأعلى)
                  <select className="input mt-1" value={form.escalationStep ?? 'DEPARTMENT_MANAGER'} disabled={!form.escalationDays} onChange={event => setForm(value => ({ ...value, escalationStep: event.target.value as DeductionApprovalRole }))}>
                    {ESCALATION_ROLES.map(role => <option key={role} value={role}>{BONUS_ROLE_LABELS[role]}</option>)}
                  </select>
                </label>
                <div className="flex flex-col gap-1 text-gray-600">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={!!form.isTaxable} onChange={event => setForm(value => ({ ...value, isTaxable: event.target.checked }))} />خاضعة للضريبة</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={!!form.isInsurable} onChange={event => setForm(value => ({ ...value, isInsurable: event.target.checked }))} />خاضعة للتأمين</label>
                </div>
              </div>
            </details>
            {formError && <p role="alert" className="text-sm text-red-600">{formError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setEditing(null)} disabled={busy}>رجوع</button>
              <button type="button" className="btn-primary" onClick={save} disabled={busy}>{busy ? 'جارٍ الحفظ…' : 'حفظ'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
