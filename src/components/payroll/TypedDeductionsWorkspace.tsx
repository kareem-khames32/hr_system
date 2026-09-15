'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, ClipboardList, Download, Plus, RefreshCw, Settings2, Users, X } from 'lucide-react'
import { ApiError, can, fetchDepartments, fetchEmployees, fetchTeams, type ApiDepartment, type ApiEmployee, type ApiTeam } from '@/lib/api'
import { csvDateStamp, downloadCsv } from '@/lib/csv'
import {
  approveDeduction, cancelDeduction, createDeductionType, decideSuspendedObligation, DEDUCTION_CATEGORY_LABELS, DEDUCTION_METHOD_LABELS, DEDUCTION_METHOD_UNIT,
  DEDUCTION_ROLE_LABELS, DEDUCTION_STATUS_META, deductionInputError, fetchDeduction, fetchDeductionCandidates, fetchDeductionCreatable, fetchDeductionReports,
  fetchDeductions, fetchDeductionTypes, formatDeductionMoney, previewDeductions, rejectDeduction, respondDeductionObjection, reverseDeduction, submitDeductionBatch,
  updateDeductionType, withdrawDeduction, type DeductionApprovalRole, type DeductionCalcMethod, type DeductionCandidate, type DeductionCategory, type DeductionCreatable,
  type DeductionCreatorBasis, type DeductionInput, type DeductionPreview, type DeductionReport, type DeductionSelectionMode, type DeductionStatus, type DeductionStepView,
  type DeductionTypeInput, type DeductionTypeView, type DeductionView,
} from '@/lib/deductions-api'

// الخطوة 25: مساحة الخصومات المصنفة — القائمة والاعتماد (مع الاعتراض والعكس وقرارات الأقساط المعلقة)، والإنشاء لموظف أو
// اختيار أو فريق أو قسم أو فرع بمعاينة واستبعاد، وكتالوج الأنواع، والتقارير. الخادم يعيد فحص النطاق والحدود والتكرار
// والاعتماد في كل خطوة؛ هذه الشاشة لا تقرر شيئًا ماليًا بنفسها.
type Tab = 'list' | 'create' | 'types' | 'reports'
type ActionKind = 'approve' | 'reject' | 'withdraw' | 'cancel' | 'reverse' | 'respond' | 'resume' | 'drop'
const errorText = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback
const localToday = () => new Date().toLocaleDateString('en-CA')
const moneyPattern = /^\d+(\.\d{1,2})?$/
const STEP_STATUS: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'بانتظار', className: 'bg-warning-100 text-warning-700' }, APPROVED: { label: 'معتمد', className: 'bg-success-100 text-success-700' },
  REJECTED: { label: 'مرفوض', className: 'bg-red-100 text-red-700' }, SKIPPED: { label: 'متخطّى', className: 'bg-gray-100 text-gray-500' },
}
const SELECTION_LABELS: Record<DeductionSelectionMode, string> = { EMPLOYEES: 'موظف أو مجموعة مختارة', TEAM: 'فريق', DEPARTMENT: 'قسم (مع أقسامه الفرعية)', BRANCH: 'فرع' }
const PREVIEW_STATUS: Record<string, string> = { READY: 'جاهز', EXCLUDED: 'مستبعد' }
const ACTION_TITLES: Record<ActionKind, string> = { approve: 'اعتماد الخصم', reject: 'رفض الخصم', withdraw: 'سحب الخصم', cancel: 'إلغاء الخصم', reverse: 'عكس الخصم المستهلك',
  respond: 'الرد على اعتراض الموظف', resume: 'استئناف قسط معلق', drop: 'إسقاط قسط معلق' }

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${className}`}>{children}</span>
}

const stepLabel = (step: Pick<DeductionStepView, 'roleLabel' | 'fallbackFrom' | 'fallbackFromLabel'>) =>
  `${step.roleLabel}${step.fallbackFrom ? ` (بديل عن ${step.fallbackFromLabel ?? DEDUCTION_ROLE_LABELS[step.fallbackFrom]})` : ''}`

export function TypedDeductionsWorkspace({ currency, mode, focusRequestId = null }: { currency: string; mode: 'admin' | 'manager'; focusRequestId?: number | null }) {
  const [tab, setTab] = useState<Tab>('list')
  const [creatable, setCreatable] = useState<DeductionCreatable | null>(null)
  const [loadError, setLoadError] = useState('')
  const [rows, setRows] = useState<DeductionView[]>([])
  const [loadingRows, setLoadingRows] = useState(true)
  const [filters, setFilters] = useState<ListFilters>({ view: mode === 'manager' || focusRequestId ? 'all' : 'pending_me', status: '', targetPeriod: '' })
  const [canManage, setCanManage] = useState(false)
  const [ready, setReady] = useState(false)

  const loadRows = () => {
    setLoadingRows(true)
    fetchDeductions({ view: filters.view, status: filters.status || undefined, targetPeriod: filters.targetPeriod || undefined })
      .then(setRows).catch(error => setLoadError(errorText(error, 'تعذر تحميل الخصومات المصنفة'))).finally(() => setLoadingRows(false))
  }
  useEffect(() => {
    setCanManage(can('deductions.manage'))
    fetchDeductionCreatable().then(setCreatable).catch(error => setLoadError(errorText(error, 'تعذر تحميل أنواع الخصومات المسموحة'))).finally(() => setReady(true))
  }, [])
  useEffect(loadRows, [filters.view, filters.status, filters.targetPeriod])
  useEffect(() => { if (focusRequestId) { setTab('list'); setFilters(value => ({ ...value, view: 'all' })) } }, [focusRequestId])

  const canCreate = (creatable?.types.length ?? 0) > 0
  // الموظف غير المدير ولا المعتمد: لا مساحة إدارية تُعرض له
  if (mode === 'manager' && ready && !loadingRows && !canCreate && rows.length === 0 && filters.view === 'all' && !filters.status && !filters.targetPeriod && !focusRequestId) return null

  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <ClipboardList size={20} className="text-primary-500" />
          الخصومات المصنفة
        </h3>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={tab === 'list' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('list')}>القائمة والاعتماد</button>
          {canCreate && <button type="button" className={tab === 'create' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('create')}><span className="flex items-center gap-1"><Plus size={16} />إنشاء خصم</span></button>}
          {canManage && <button type="button" className={tab === 'types' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('types')}><span className="flex items-center gap-1"><Settings2 size={16} />أنواع الخصومات</span></button>}
        </div>
      </div>
      {loadError && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm flex items-center gap-2"><AlertTriangle size={16} />{loadError}</div>}
      {tab === 'list' && <DeductionList rows={rows} loading={loadingRows} filters={filters} setFilters={setFilters} reload={loadRows} currency={currency}
        reasonMinLength={creatable?.reasonMinLength ?? 20} currentPeriod={creatable?.currentPeriod ?? ''} focusRequestId={focusRequestId} />}
      {tab === 'create' && creatable && <DeductionCreator creatable={creatable} currency={currency} onCreated={() => { setFilters(value => ({ ...value, view: 'created' })); setTab('list'); loadRows() }} />}
      {tab === 'types' && canManage && <DeductionTypesPanel onChanged={() => fetchDeductionCreatable().then(setCreatable).catch(() => undefined)} />}
    </div>
  )
}

type ListFilters = { view: 'all' | 'pending_me' | 'created'; status: string; targetPeriod: string }

function DeductionList({ rows, loading, filters, setFilters, reload, currency, reasonMinLength, currentPeriod, focusRequestId }: {
  rows: DeductionView[]; loading: boolean; filters: ListFilters; setFilters: (update: (value: ListFilters) => ListFilters) => void
  reload: () => void; currency: string; reasonMinLength: number; currentPeriod: string; focusRequestId: number | null
}) {
  const [expanded, setExpanded] = useState<number | null>(null)
  const [detail, setDetail] = useState<DeductionView | null>(null)
  const [focused, setFocused] = useState<DeductionView | null>(null)
  const [action, setAction] = useState<{ kind: ActionKind; row: DeductionView; obligationId?: number } | null>(null)
  const [reason, setReason] = useState('')
  const [adjusted, setAdjusted] = useState('')
  const [targetPeriod, setTargetPeriod] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState('')

  // فتح طلب محدد من رابط القسيمة أو المسير (?request=ID)
  useEffect(() => {
    if (!focusRequestId) return
    fetchDeduction(focusRequestId).then(view => { setFocused(view); setExpanded(view.id); setDetail(view) })
      .catch(error => setNotice(errorText(error, 'تعذر فتح طلب الخصم المطلوب')))
  }, [focusRequestId])
  const shown = focused && !rows.some(row => row.id === focused.id) ? [focused, ...rows] : rows

  const toggle = (row: DeductionView) => {
    if (expanded === row.id) { setExpanded(null); setDetail(null); return }
    setExpanded(row.id); setDetail(null)
    fetchDeduction(row.id).then(setDetail).catch(error => setNotice(errorText(error, 'تعذر تحميل تفاصيل الخصم')))
  }
  const open = (kind: ActionKind, row: DeductionView, obligationId?: number) => {
    setAction({ kind, row, obligationId }); setReason(''); setAdjusted(''); setTargetPeriod(currentPeriod); setActionError('')
  }
  const submit = async () => {
    if (!action) return
    const { kind, row, obligationId } = action
    const text = reason.trim()
    if (kind === 'reject' && text.length < 5) { setActionError('اكتب سبب الرفض (5 أحرف على الأقل).'); return }
    if (kind === 'respond' && text.length < 5) { setActionError('اكتب الرد على الاعتراض (5 أحرف على الأقل).'); return }
    if (['cancel', 'reverse', 'resume', 'drop'].includes(kind) && text.length < reasonMinLength) { setActionError(`اكتب السبب (${reasonMinLength} حرفًا على الأقل).`); return }
    if (adjusted && (!moneyPattern.test(adjusted.trim()) || Number(adjusted) <= 0)) { setActionError('المبلغ رقم موجب بمنزلتين عشريتين على الأكثر.'); return }
    if (kind === 'approve' && adjusted && !text) { setActionError('اكتب سبب تعديل المبلغ.'); return }
    if (kind === 'resume' && !/^\d{4}-(0[1-9]|1[0-2])$/.test(targetPeriod)) { setActionError('حدد شهر المسير الذي يُستأنف فيه التحصيل.'); return }
    setBusy(true); setActionError('')
    try {
      const result = kind === 'approve' ? await approveDeduction(row, text || undefined, adjusted.trim() || undefined)
        : kind === 'reject' ? await rejectDeduction(row, text)
          : kind === 'withdraw' ? await withdrawDeduction(row, text || undefined)
            : kind === 'cancel' ? await cancelDeduction(row, text)
              : kind === 'reverse' ? await reverseDeduction(row, text, adjusted.trim() || undefined)
                : kind === 'respond' ? await respondDeductionObjection(row.id, text)
                  : await decideSuspendedObligation(obligationId!, kind === 'resume' ? 'RESUME' : 'DROP', text, kind === 'resume' ? targetPeriod : undefined)
      setNotice(result.notice === 'OUT_OF_SCOPE_ROUTED_TO_HR' ? 'خرج الموظف عن نطاق المُنشئ؛ حُوّل الطلب لاعتماد الموارد البشرية.' : `تم: ${ACTION_TITLES[kind]} — ${result.statusLabel}`)
      setAction(null); setExpanded(null); setDetail(null); setFocused(null); reload()
    } catch (error) {
      setActionError(error instanceof ApiError && error.status === 409 ? `${error.message} — حدّث القائمة ثم أعد المحاولة.` : errorText(error, 'تعذر تنفيذ الإجراء'))
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm text-gray-600">العرض
          <select className="input mt-1" value={filters.view} onChange={event => setFilters(value => ({ ...value, view: event.target.value as ListFilters['view'] }))}>
            <option value="pending_me">بانتظار اعتمادي</option>
            <option value="created">أنشأتها</option>
            <option value="all">كل ما يخصني في نطاقي</option>
          </select>
        </label>
        <label className="text-sm text-gray-600">الحالة
          <select className="input mt-1" value={filters.status} onChange={event => setFilters(value => ({ ...value, status: event.target.value }))}>
            <option value="">كل الحالات</option>
            {(Object.keys(DEDUCTION_STATUS_META) as DeductionStatus[]).map(status => <option key={status} value={status}>{DEDUCTION_STATUS_META[status].label}</option>)}
          </select>
        </label>
        <label className="text-sm text-gray-600">شهر المسير المستهدف
          <input type="month" className="input mt-1" dir="ltr" value={filters.targetPeriod} onChange={event => setFilters(value => ({ ...value, targetPeriod: event.target.value }))} />
        </label>
        <button type="button" className="btn-secondary flex items-center gap-1" onClick={reload}><RefreshCw size={16} />تحديث</button>
      </div>
      {notice && <div role="status" className="bg-primary-50 text-primary-700 rounded-xl p-3 text-sm flex items-center justify-between">{notice}<button type="button" aria-label="إغلاق" onClick={() => setNotice('')}><X size={14} /></button></div>}
      {loading ? (
        <div className="flex items-center justify-center py-10"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : shown.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">لا توجد خصومات مصنفة بهذا العرض</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="text-right px-3 py-3">#</th>
                <th className="text-right px-3 py-3">الموظف</th>
                <th className="text-right px-3 py-3">النوع</th>
                <th className="text-center px-3 py-3">المبلغ ({currency})</th>
                <th className="text-center px-3 py-3">الشهر المستهدف</th>
                <th className="text-right px-3 py-3">المُنشئ</th>
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
                      <td className="table-cell text-center font-mono">{formatDeductionMoney(row.finalAmount ?? row.estimatedAmount)}
                        {row.installments > 1 && <span className="block text-xs text-gray-400">{row.installments} أقساط</span>}
                        {row.reversedAmount !== '0.00' && <span className="block text-xs text-success-700">معكوس {formatDeductionMoney(row.reversedAmount)}</span>}</td>
                      <td className="table-cell text-center font-mono" dir="ltr">{row.targetPeriod}</td>
                      <td className="table-cell text-sm">{row.creator.name ?? `مستخدم #${row.creator.userId}`}<span className="block text-xs text-gray-400">{row.creator.basisLabel}</span></td>
                      <td className="table-cell text-center">
                        <Badge className={DEDUCTION_STATUS_META[row.status]?.className ?? 'bg-gray-100 text-gray-600'}>{row.statusLabel}</Badge>
                        {row.status === 'IN_APPROVAL' && step && <span className="block text-xs text-gray-400 mt-1">بانتظار {stepLabel(step)}{step.approverName ? `: ${step.approverName}` : ''}</span>}
                        {row.escalated && <span className="block text-xs text-warning-700">مصعّد</span>}
                        {row.outOfScope && <span className="block text-xs text-orange-700">خرج عن النطاق</span>}
                        {row.openObjection && <span className="block text-xs text-red-700">اعتراض من الموظف بلا رد</span>}
                        {row.obligations.some(item => item.status === 'SUSPENDED') && <span className="block text-xs text-orange-700">قسط معلق بانتظار قرار</span>}
                      </td>
                      <td className="table-cell">
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          <button type="button" className="p-1.5 bg-gray-100 rounded-lg hover:bg-gray-200" title="التفاصيل" onClick={() => toggle(row)}>{expanded === row.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
                          {row.capabilities.canRespondObjection && <button type="button" className="btn-primary text-xs px-2 py-1" onClick={() => open('respond', row)}>الرد على الاعتراض</button>}
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
                            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="font-medium text-gray-700 mb-1">الواقعة والسبب</p>
                                <p className="text-gray-600">تاريخ الواقعة: <span dir="ltr">{detail.incidentDate}</span></p>
                                <p className="text-gray-600 whitespace-pre-wrap">{detail.reason}</p>
                                {detail.attachmentRef && <p className="text-gray-500">المرجع: {detail.attachmentRef}</p>}
                                {detail.decisionReason && <p className="text-gray-500 mt-1">سبب القرار: {detail.decisionReason}</p>}
                                {(detail.amountTrace?.installments ?? []).some(part => part.units) && (
                                  <ul className="mt-2 text-xs text-gray-500 space-y-0.5">
                                    {(detail.amountTrace?.installments ?? []).map(part => <li key={part.period}><span dir="ltr">{part.period}</span>: {part.units} × {formatDeductionMoney(part.rate ?? null)} = {formatDeductionMoney(part.amount)}</li>)}
                                  </ul>
                                )}
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
                                      {item.adjustedTo && <span className="text-xs text-gray-500 w-full">عُدّل المبلغ من {formatDeductionMoney(item.adjustedFrom ?? null)} إلى {formatDeductionMoney(item.adjustedTo)}</span>}
                                    </li>
                                  ))}
                                </ol>
                              </div>
                              <div>
                                <p className="font-medium text-gray-700 mb-1">قيود الدفتر (بعد الاعتماد)</p>
                                {detail.obligations.length === 0 ? <p className="text-gray-400">لا يُنشأ قيد قبل آخر اعتماد</p> : (
                                  <ul className="space-y-1">
                                    {detail.obligations.map(item => (
                                      <li key={item.id} className="text-gray-600">
                                        {item.type === 'CREDIT' ? <span className="text-success-700">عكس (إضافة) </span> : null}
                                        <span dir="ltr" className="font-mono">{item.targetPeriod}</span>: {formatDeductionMoney(item.amount)} — {item.statusLabel}
                                        {item.reservedPayrollRunId && item.status === 'PENDING' ? ` (محجوز لمسير #${item.reservedPayrollRunId})` : ''}
                                        {item.appliedPayrollRunId ? ` (مسير #${item.appliedPayrollRunId}، المحصل ${formatDeductionMoney(item.appliedAmount)})` : ''}
                                        {item.carriedFromObligationId ? ` — مرحّل من قيد #${item.carriedFromObligationId}` : ''}
                                        {item.status === 'SUSPENDED' && detail.capabilities.canDecideSuspended && (
                                          <span className="flex gap-1 mt-1">
                                            <button type="button" className="btn-primary text-xs px-2 py-0.5" onClick={() => open('resume', detail, item.id)}>استئناف</button>
                                            <button type="button" className="btn-secondary text-xs px-2 py-0.5 text-red-600" onClick={() => open('drop', detail, item.id)}>إسقاط</button>
                                          </span>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                <p className="text-xs text-gray-500 mt-1">المحصل {formatDeductionMoney(detail.collectedAmount)} · المعكوس {formatDeductionMoney(detail.reversedAmount)}</p>
                              </div>
                              <div>
                                <p className="font-medium text-gray-700 mb-1">اعتراض الموظف</p>
                                {detail.objections.length === 0 ? <p className="text-gray-400">لا اعتراض</p> : (
                                  <ul className="space-y-2">
                                    {detail.objections.map(item => (
                                      <li key={item.id} className="text-gray-600">
                                        <p className="whitespace-pre-wrap">«{item.text}»</p>
                                        {item.response ? <p className="text-xs text-success-700 whitespace-pre-wrap">الرد: {item.response.text}</p> : <p className="text-xs text-red-700">بلا رد — {detail.capabilities.blockedByObjection ? 'يمنع الاعتماد حتى الرد' : 'لا يمنع الاعتماد'}</p>}
                                      </li>
                                    ))}
                                  </ul>
                                )}
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
            <p className="text-sm text-gray-600">{action.row.employee.fullName} — {action.row.type.nameAr} — {formatDeductionMoney(action.row.finalAmount ?? action.row.estimatedAmount)} {currency} لشهر <span dir="ltr">{action.row.targetPeriod}</span></p>
            {action.kind === 'approve' && action.row.capabilities.canAdjust && (
              <label className="block text-sm text-gray-600">تعديل المبلغ (اختياري، بحدود النوع)
                <input className="input mt-1" dir="ltr" inputMode="decimal" value={adjusted} onChange={event => setAdjusted(event.target.value)} placeholder={action.row.estimatedAmount} />
              </label>
            )}
            {action.kind === 'reverse' && (
              <label className="block text-sm text-gray-600">مبلغ العكس (فارغ = كل المستهلك غير المعكوس {formatDeductionMoney(action.row.collectedAmount)} − {formatDeductionMoney(action.row.reversedAmount)})
                <input className="input mt-1" dir="ltr" inputMode="decimal" value={adjusted} onChange={event => setAdjusted(event.target.value)} />
              </label>
            )}
            {action.kind === 'resume' && (
              <label className="block text-sm text-gray-600">شهر المسير الذي يُستأنف فيه التحصيل
                <input type="month" className="input mt-1" dir="ltr" value={targetPeriod} min={currentPeriod || undefined} onChange={event => setTargetPeriod(event.target.value)} />
              </label>
            )}
            {action.kind === 'respond' && action.row.objections.filter(item => !item.response).map(item => <p key={item.id} className="text-sm bg-gray-50 rounded-lg p-2 whitespace-pre-wrap">«{item.text}»</p>)}
            <label className="block text-sm text-gray-600">{action.kind === 'reject' ? 'سبب الرفض (إلزامي)' : action.kind === 'respond' ? 'الرد على الاعتراض (يراه الموظف)'
              : ['cancel', 'reverse', 'resume', 'drop'].includes(action.kind) ? `السبب (${reasonMinLength} حرفًا على الأقل)` : 'ملاحظة (اختيارية)'}
              <textarea className="input mt-1 min-h-[80px]" value={reason} onChange={event => setReason(event.target.value)} />
            </label>
            {action.kind === 'cancel' && <p className="text-xs text-gray-500">الأقساط غير المستهلكة والمعلقة تُلغى؛ المحجوز في مسير معتمد يحتاج إعادة فتح المسير أولًا، والمستهلك يُعكس بإجراء «عكس».</p>}
            {action.kind === 'reverse' && <p className="text-xs text-gray-500">يُنشأ قيد إضافة موجب يُصرف في المسير التالي؛ المسير المصروف لا يتغير.</p>}
            {action.kind === 'approve' && action.row.capabilities.blockedByObjection && <p className="text-xs text-red-700">على الخصم اعتراض بلا رد؛ سجّل الرد أولًا.</p>}
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

function DeductionCreator({ creatable, currency, onCreated }: { creatable: DeductionCreatable; currency: string; onCreated: () => void }) {
  const [typeId, setTypeId] = useState<number>(creatable.types[0]?.id ?? 0)
  const type = creatable.types.find(row => row.id === typeId) ?? null
  const [candidates, setCandidates] = useState<DeductionCandidate[]>([])
  const [candidateError, setCandidateError] = useState('')
  const [selectionMode, setSelectionMode] = useState<DeductionSelectionMode>('EMPLOYEES')
  const [branchId, setBranchId] = useState<number | ''>('')
  const [departmentId, setDepartmentId] = useState<number | ''>('')
  const [teamId, setTeamId] = useState<number | ''>('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [excluded, setExcluded] = useState<Set<number>>(new Set())
  const [form, setForm] = useState({ inputValue: '', incidentDate: localToday(), reason: '', targetPeriod: creatable.currentPeriod, installments: 1, attachmentRef: '', confirmNotDuplicate: false })
  const [preview, setPreview] = useState<DeductionPreview | null>(null)
  const [previewKey, setPreviewKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState('')

  useEffect(() => {
    if (!typeId) return
    setCandidateError('')
    fetchDeductionCandidates(typeId).then(setCandidates).catch(err => setCandidateError(errorText(err, 'تعذر تحميل الموظفين في نطاقك')))
    setForm(value => ({ ...value, inputValue: type?.defaultValue ?? '', installments: 1 }))
    // تغيير النوع يغيّر النطاق والحدود: المعاينة والاختيار السابقان لا يصلحان
    setPreview(null); setSelected(new Set()); setExcluded(new Set())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeId])

  const inBranch = (row: DeductionCandidate) => !branchId || row.branchId === branchId
  // القسم مع فروعه: نفس حل الخادم (مسار القسم صعودًا يضم القسم المختار)
  const inDepartment = (row: DeductionCandidate, id: number) => row.departmentPath?.length ? row.departmentPath.some(item => item.id === id) : row.departmentId === id
  const branches = useMemo(() => [...new Map(candidates.map(row => [row.branchId, row.branchName ?? `فرع #${row.branchId}`])).entries()], [candidates])
  const departments = useMemo(() => {
    const map = new Map<number, string>()
    for (const row of candidates.filter(item => !branchId || item.branchId === branchId)) {
      for (const item of row.departmentPath ?? (row.departmentId ? [{ id: row.departmentId, name: row.departmentName }] : [])) if (!map.has(item.id)) map.set(item.id, item.name ?? `قسم #${item.id}`)
    }
    return [...map.entries()]
  }, [candidates, branchId])
  const teams = useMemo(() => [...new Map(candidates.filter(row => row.teamId && (!branchId || row.branchId === branchId) && (!departmentId || inDepartment(row, departmentId)))
    .map(row => [row.teamId as number, row.teamName ?? `فريق #${row.teamId}`])).entries()], [candidates, branchId, departmentId])
  // المشمولون فعلًا بالوحدة المختارة كما يحلها الخادم؛ البحث لا يغيّر من يُخصم منه
  const members = useMemo(() => selectionMode === 'TEAM' ? (teamId ? candidates.filter(row => row.teamId === teamId) : [])
    : selectionMode === 'DEPARTMENT' ? (departmentId ? candidates.filter(row => inDepartment(row, departmentId)) : [])
      : selectionMode === 'BRANCH' ? (branchId ? candidates.filter(row => row.branchId === branchId) : []) : [],
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [selectionMode, teamId, departmentId, branchId, candidates])
  const searchText = search.trim()
  const matches = (row: DeductionCandidate) => !searchText || row.fullName.includes(searchText) || row.employeeCode.includes(searchText)
  const visible = selectionMode === 'EMPLOYEES'
    ? candidates.filter(row => inBranch(row) && (!departmentId || inDepartment(row, departmentId)) && (!teamId || row.teamId === teamId) && matches(row))
    : members.filter(matches)
  const unitId = selectionMode === 'TEAM' ? teamId : selectionMode === 'DEPARTMENT' ? departmentId : selectionMode === 'BRANCH' ? branchId : ''
  // تغيير الوحدة المختارة يصفّر الاستبعاد؛ الاستبعاد نفسه لا يتأثر بالبحث أو الفلاتر
  useEffect(() => { setExcluded(new Set()) }, [selectionMode, unitId])

  const selectionIds = selectionMode === 'EMPLOYEES' ? [...selected] : unitId ? [unitId as number] : []
  const input: DeductionInput = { deductionTypeId: typeId, inputValue: form.inputValue.trim(), incidentDate: form.incidentDate, reason: form.reason, targetPeriod: form.targetPeriod,
    ...(type?.installmentAllowed ? { installments: form.installments } : {}), ...(form.attachmentRef.trim() ? { attachmentRef: form.attachmentRef.trim() } : {}), confirmNotDuplicate: form.confirmNotDuplicate }
  const selection = { mode: selectionMode, ids: selectionIds.sort((a, b) => a - b), excludeEmployeeIds: selectionMode === 'EMPLOYEES' ? [] : [...excluded].sort((a, b) => a - b) }
  const currentKey = JSON.stringify({ input, selection })
  const stale = !!preview && previewKey !== currentKey
  const hiddenSelected = selectionMode === 'EMPLOYEES' ? [...selected].filter(id => !visible.some(row => row.id === id)).length : 0

  const changeMode = (value: DeductionSelectionMode) => {
    setSelectionMode(value)
    if (value === 'BRANCH') { setDepartmentId(''); setTeamId('') }
    if (value === 'DEPARTMENT') setTeamId('')
  }
  const runPreview = async () => {
    const problem = deductionInputError(input, creatable.reasonMinLength, type)
    if (problem) { setError(problem); return }
    if (!selection.ids.length) { setError(selectionMode === 'EMPLOYEES' ? 'اختر موظفًا واحدًا على الأقل.' : `اختر ${SELECTION_LABELS[selectionMode]} من الفلاتر.`); return }
    setBusy(true); setError(''); setResult('')
    try { const next = await previewDeductions(input, selection); setPreview(next); setPreviewKey(currentKey) }
    catch (err) { setError(errorText(err, 'تعذرت المعاينة')) } finally { setBusy(false) }
  }
  const submit = async () => {
    if (!preview || stale) { setError('أعد المعاينة بعد آخر تعديل قبل الإرسال.'); return }
    setBusy(true); setError('')
    try {
      const created = await submitDeductionBatch(input, selection, preview.previewHash)
      setResult(`أُرسل ${created.created.length} خصمًا للاعتماد (دفعة #${created.batchId})${created.skipped.length ? `، وتُخطّي ${created.skipped.length} بسبب ظاهر في المعاينة` : ''}.`)
      setPreview(null); setSelected(new Set()); setExcluded(new Set()); setForm(value => ({ ...value, reason: '', confirmNotDuplicate: false }))
      onCreated()
    } catch (err) {
      const fresh = err instanceof ApiError ? (err.details?.preview as DeductionPreview | undefined) : undefined
      if (fresh) { setPreview(fresh); setPreviewKey(currentKey) }
      setError(errorText(err, 'تعذر الإرسال'))
    } finally { setBusy(false) }
  }
  const toggleSet = (set: Set<number>, id: number, apply: (next: Set<number>) => void) => { const next = new Set(set); if (next.has(id)) next.delete(id); else next.add(id); apply(next) }
  const hasDuplicates = preview?.rows.some(row => row.status === 'DEDUCTION_DUPLICATE')

  if (!type) return <p className="text-sm text-gray-400">لا توجد أنواع خصم مسموحة لك.</p>
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">نطاقك: {creatable.basisLabels.join('، ')}. الخصم يُرسل كطلب يمر بسلسلة اعتماد النوع وينتهي بالموارد البشرية، ثم يُخصم في شهر المسير المستهدف مع حماية الصافي.</p>
      <div className="grid md:grid-cols-3 gap-3">
        <label className="text-sm text-gray-600">نوع الخصم
          <select className="input mt-1" value={typeId} onChange={event => setTypeId(Number(event.target.value))}>
            {creatable.types.map(row => <option key={row.id} value={row.id}>{row.nameAr} — {row.categoryLabel}</option>)}
          </select>
        </label>
        <label className="text-sm text-gray-600">{DEDUCTION_METHOD_UNIT[type.calcMethod]} ({type.calcMethodLabel})
          <input className="input mt-1" dir="ltr" inputMode="decimal" value={form.inputValue} onChange={event => setForm(value => ({ ...value, inputValue: event.target.value }))} />
        </label>
        <label className="text-sm text-gray-600">شهر المسير المستهدف
          <input type="month" className="input mt-1" dir="ltr" value={form.targetPeriod} onChange={event => setForm(value => ({ ...value, targetPeriod: event.target.value }))} />
          <span className="text-xs text-gray-400">الشهر الحالي للمسير: {creatable.currentPeriod} (الدورة تبدأ يوم {creatable.cycleStartDay})</span>
        </label>
        <label className="text-sm text-gray-600">تاريخ الواقعة
          <input type="date" className="input mt-1" dir="ltr" max={creatable.today} value={form.incidentDate} onChange={event => setForm(value => ({ ...value, incidentDate: event.target.value }))} />
        </label>
        {type.installmentAllowed && (
          <label className="text-sm text-gray-600">عدد الأقساط (حتى {type.maxInstallments}){type.calcMethod === 'DAYS_OF_SALARY' || type.calcMethod === 'HOURS_OF_SALARY' ? ' — تُقسم الوحدات ويُسعَّر كل قسط بشهره' : ''}
            <input type="number" className="input mt-1" min={1} max={type.maxInstallments} value={form.installments} onChange={event => setForm(value => ({ ...value, installments: Math.max(1, Math.min(type.maxInstallments, Number(event.target.value) || 1)) }))} />
          </label>
        )}
        <label className="text-sm text-gray-600">مرجع المستند{type.requiresAttachment ? ' (إلزامي)' : ' (اختياري)'}
          <input className="input mt-1" value={form.attachmentRef} maxLength={300} onChange={event => setForm(value => ({ ...value, attachmentRef: event.target.value }))} />
        </label>
      </div>
      <div className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
        حدود النوع: الحد الأدنى {formatDeductionMoney(type.minAmount)}، الحد الأعلى {type.maxAmount ? formatDeductionMoney(type.maxAmount) : 'بلا'}،
        أقصى {type.maxPctOfGross ?? '—'}% من إجمالي الراتب للخصم الواحد
        {type.valueStep ? `، خطوة المدخل ${type.valueStep}` : ''}
        ، عمر الواقعة حتى {type.maxIncidentAgeDays} يومًا. السلسلة: {type.approvalSteps.map(role => DEDUCTION_ROLE_LABELS[role]).join(' ← ')}.
      </div>
      <label className="block text-sm text-gray-600">سبب الخصم ({creatable.reasonMinLength} حرفًا على الأقل — {form.reason.trim().length})
        <textarea className="input mt-1 min-h-[70px]" maxLength={1000} value={form.reason} onChange={event => setForm(value => ({ ...value, reason: event.target.value }))} />
      </label>

      <div className="border border-gray-100 rounded-xl p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gray-700 flex items-center gap-1"><Users size={16} />الموظفون المشمولون</span>
          {(Object.keys(SELECTION_LABELS) as DeductionSelectionMode[]).map(value => (
            <label key={value} className="text-sm flex items-center gap-1">
              <input type="radio" name="deduction-selection" checked={selectionMode === value} onChange={() => changeMode(value)} />
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
        {selectionMode !== 'EMPLOYEES' && !selectionIds.length && <p className="text-xs text-warning-700">اختر {SELECTION_LABELS[selectionMode]} من الفلاتر أعلاه؛ الموظفون خارج نطاقك لا يُحسبون ولا يُعرضون.</p>}
        <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
          {visible.length === 0 ? <p className="text-sm text-gray-400 p-2">لا يوجد موظفون في نطاقك بهذه الفلاتر</p> : visible.map(row => {
            const checked = selectionMode === 'EMPLOYEES' ? selected.has(row.id) : !excluded.has(row.id)
            return (
              <label key={row.id} className="flex items-center gap-2 p-2 text-sm">
                <input type="checkbox" checked={checked} onChange={() => selectionMode === 'EMPLOYEES' ? toggleSet(selected, row.id, setSelected) : toggleSet(excluded, row.id, setExcluded)} />
                <span className="font-medium text-gray-800">{row.fullName}</span>
                <span className="text-xs text-gray-400">{row.employeeCode} — {[row.branchName, row.departmentName, row.teamName].filter(Boolean).join(' / ')} — {row.basisLabels.join('، ')}</span>
                {selectionMode !== 'EMPLOYEES' && excluded.has(row.id) && <Badge className="bg-gray-100 text-gray-600">مستبعد</Badge>}
              </label>
            )
          })}
        </div>
        <p className="text-xs text-gray-400">
          {selectionMode === 'EMPLOYEES'
            ? `محدد ${selected.size}${hiddenSelected ? ` (منهم ${hiddenSelected} خارج الفلاتر الحالية ويبقون مختارين)` : ''}`
            : `المشمولون ${members.length}، المستبعدون ${excluded.size}${visible.length !== members.length ? ` — يُعرض ${visible.length} بالبحث؛ البحث لا يغيّر من يُخصم منه` : ''}. إلغاء التحديد يستبعد الموظف.`}
        </p>
      </div>

      {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
      {result && <div role="status" className="bg-success-50 text-success-700 rounded-xl p-3 text-sm flex items-center gap-2"><CheckCircle2 size={16} />{result}</div>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary" onClick={runPreview} disabled={busy}>{busy ? 'جارٍ…' : 'معاينة الأرقام'}</button>
        <button type="button" className="btn-primary" onClick={submit} disabled={busy || !preview || stale || preview.totals.ready === 0}>إرسال للاعتماد</button>
        {stale && <span className="text-xs text-warning-700 self-center">تغيّرت المدخلات أو الاستبعاد بعد المعاينة؛ أعد المعاينة.</span>}
      </div>

      {preview && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-3 text-sm">
            <Badge className="bg-success-100 text-success-700">جاهز {preview.totals.ready}</Badge>
            <Badge className="bg-gray-100 text-gray-600">مستبعد {preview.totals.excluded}</Badge>
            <Badge className="bg-red-100 text-red-700">مرفوض {preview.totals.failed}</Badge>
            {preview.totals.escalated > 0 && <Badge className="bg-warning-100 text-warning-700">مصعّد {preview.totals.escalated}</Badge>}
            <span className="font-medium">الإجمالي: {formatDeductionMoney(preview.totals.totalAmount)} {currency}</span>
          </div>
          {hasDuplicates && (
            <label className="text-sm flex items-center gap-2 text-warning-700">
              <input type="checkbox" checked={form.confirmNotDuplicate} onChange={event => setForm(value => ({ ...value, confirmNotDuplicate: event.target.checked }))} />
              أؤكد أن هذه ليست خصومات مكررة (ثم أعد المعاينة)
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
                    <td className="table-cell text-center font-mono">{formatDeductionMoney(row.amount)}{row.installments.length > 1 && <span className="block text-xs text-gray-400">{row.installments.map(part => `${part.period}: ${formatDeductionMoney(part.amount)}`).join('، ')}</span>}</td>
                    <td className="table-cell text-xs text-gray-600" dir="ltr">{row.formula ?? ''}
                      {row.installments.some(part => part.units) ? <span className="block text-gray-400">{row.installments.map(part => `${part.units} × ${formatDeductionMoney(part.rate ?? null)}`).join(' + ')}</span> : null}
                      {row.pctLimit ? <span className="block text-gray-400" dir="rtl">الحد {formatDeductionMoney(row.pctLimit)}</span> : null}</td>
                    <td className="table-cell text-xs">{row.steps.map(step => `${stepLabel(step)}${step.status === 'SKIPPED' ? ' (متخطّى)' : ''}${step.escalation ? ' (تصعيد)' : ''}`).join(' ← ')}</td>
                    <td className="table-cell text-center">
                      {selectionMode !== 'EMPLOYEES' && (row.status === 'READY' || row.status === 'EXCLUDED') && (
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

const CREATOR_BASES: DeductionCreatorBasis[] = ['DIRECT_MANAGER', 'TEAM_LEADER', 'DEPARTMENT_MANAGER', 'BRANCH_MANAGER', 'FUNCTION_OWNER', 'HR']
const CHAIN_ROLES: DeductionApprovalRole[] = ['DIRECT_MANAGER', 'TEAM_LEADER', 'DEPARTMENT_MANAGER', 'BRANCH_MANAGER', 'EXECUTIVE']
const emptyScope = () => ({ departmentIds: [] as number[], teamIds: [] as number[], employeeIds: [] as number[] })
const emptyType = (): DeductionTypeInput => ({ code: '', nameAr: '', nameEn: '', category: 'DISCIPLINARY', calcMethod: 'DAYS_OF_SALARY', defaultValue: '', valueStep: '0.25', minAmount: '1',
  maxAmount: '', maxPctOfGross: '25', isExemptable: true, installmentAllowed: false, maxInstallments: 1, requiresAttachment: false,
  creatorScopes: ['DIRECT_MANAGER', 'TEAM_LEADER', 'DEPARTMENT_MANAGER', 'HR'], approvalSteps: ['HR'], escalationDays: '', escalationStep: 'DEPARTMENT_MANAGER',
  maxIncidentAgeDays: 90, carryForwardPriority: 3, isActive: true, ownerDepartmentId: null, functionalScope: null, basisEscalationDays: {} })
const blank = (value: unknown) => value === '' || value === undefined ? null : value

function DeductionTypesPanel({ onChanged }: { onChanged: () => void }) {
  const [types, setTypes] = useState<DeductionTypeView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<DeductionTypeView | 'new' | null>(null)
  const [form, setForm] = useState<DeductionTypeInput>(emptyType())
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [org, setOrg] = useState<{ departments: ApiDepartment[]; teams: ApiTeam[]; employees: ApiEmployee[] }>({ departments: [], teams: [], employees: [] })
  const [employeeSearch, setEmployeeSearch] = useState('')
  const load = () => { setLoading(true); fetchDeductionTypes(true).then(setTypes).catch(err => setError(errorText(err, 'تعذر تحميل الكتالوج'))).finally(() => setLoading(false)) }
  useEffect(load, [])
  useEffect(() => {
    Promise.all([fetchDepartments(), fetchTeams(), fetchEmployees()])
      .then(([departments, teams, employees]) => setOrg({ departments, teams, employees }))
      .catch(err => setError(errorText(err, 'تعذر تحميل الأقسام والفرق لتحديد الجهة المالكة')))
  }, [])
  const departmentName = (id: number | null | undefined) => id ? org.departments.find(row => row.id === id)?.name ?? `قسم #${id}` : null
  const protectedCategory = form.category === 'STATUTORY' || form.category === 'COURT_ORDER'
  const unitMethod = form.calcMethod === 'DAYS_OF_SALARY' || form.calcMethod === 'HOURS_OF_SALARY'
  const scope = form.functionalScope ?? emptyScope()
  const open = (row: DeductionTypeView | 'new') => {
    setEditing(row); setFormError(''); setEmployeeSearch('')
    setForm(row === 'new' ? emptyType() : { ...row, nameEn: row.nameEn ?? '', defaultValue: row.defaultValue ?? '', valueStep: row.valueStep ?? '', minAmount: row.minAmount ?? '', maxAmount: row.maxAmount ?? '',
      maxPctOfGross: row.maxPctOfGross ?? '', escalationDays: row.escalationDays ?? '', approvalSteps: row.approvalSteps.filter(role => role !== 'HR'),
      functionalScope: row.functionalScope ?? null, basisEscalationDays: { ...(row.basisEscalationDays ?? {}) } })
  }
  const save = async () => {
    if (!editing) return
    const scopes = form.creatorScopes ?? []
    if (scopes.includes('FUNCTION_OWNER') && !form.ownerDepartmentId) { setFormError('«مدير الجهة المالكة» يتطلب تحديد الجهة المالكة.'); return }
    const matrix = Object.fromEntries(Object.entries(form.basisEscalationDays ?? {}).filter(([basis]) => scopes.includes(basis as DeductionCreatorBasis)))
    if (Object.values(matrix).some(days => days !== null && !/^\d+(\.\d{1,4})?$/.test(String(days)))) { setFormError('حد التصعيد لكل دور: عدد أيام موجب أو «بلا تصعيد».'); return }
    const cleanScope = form.ownerDepartmentId && (scope.departmentIds.length || scope.teamIds.length || scope.employeeIds.length) ? scope : null
    setBusy(true); setFormError('')
    const payload: DeductionTypeInput = { ...form, nameEn: blank(form.nameEn) as string | null, defaultValue: blank(form.defaultValue) as string | null,
      valueStep: unitMethod ? blank(form.valueStep) as string | null : null, minAmount: blank(form.minAmount) as string | null, maxAmount: blank(form.maxAmount) as string | null,
      maxPctOfGross: blank(form.maxPctOfGross) as string | null, escalationDays: blank(form.escalationDays) as string | null,
      escalationStep: blank(form.escalationDays) === null ? null : form.escalationStep, isExemptable: protectedCategory ? false : form.isExemptable,
      maxInstallments: form.installmentAllowed ? form.maxInstallments : 1, approvalSteps: [...(form.approvalSteps ?? []).filter(role => role !== 'HR'), 'HR'],
      ownerDepartmentId: form.ownerDepartmentId ?? null, functionalScope: cleanScope, basisEscalationDays: matrix }
    try {
      if (editing === 'new') await createDeductionType(payload)
      else { const { code: _code, ...rest } = payload; await updateDeductionType(editing.id, rest) }
      setEditing(null); load(); onChanged()
    } catch (err) { setFormError(errorText(err, 'تعذر حفظ النوع')) } finally { setBusy(false) }
  }
  const toggleList = <T,>(list: T[] | undefined, value: T): T[] => (list ?? []).includes(value) ? (list ?? []).filter(item => item !== value) : [...(list ?? []), value]
  const toggleScope = (key: 'departmentIds' | 'teamIds' | 'employeeIds', id: number) => setForm(value => ({ ...value, functionalScope: { ...(value.functionalScope ?? emptyScope()), [key]: toggleList((value.functionalScope ?? emptyScope())[key], id) } }))
  const matrixMode = (basis: DeductionCreatorBasis) => !Object.prototype.hasOwnProperty.call(form.basisEscalationDays ?? {}, basis) ? 'inherit' : form.basisEscalationDays?.[basis] === null ? 'never' : 'custom'
  const setMatrix = (basis: DeductionCreatorBasis, mode: 'inherit' | 'never' | 'custom', days = '1') => setForm(value => {
    const next = { ...(value.basisEscalationDays ?? {}) }
    if (mode === 'inherit') delete next[basis]; else next[basis] = mode === 'never' ? null : days
    return { ...value, basisEscalationDays: next }
  })
  const ownerTeams = org.teams
  const employeeMatches = employeeSearch.trim() ? org.employees.filter(row => row.fullName.includes(employeeSearch.trim()) || row.employeeCode.includes(employeeSearch.trim())).slice(0, 20) : []

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">كل تعديل مالي (الحدود، المُنشئ، الجهة المالكة، النطاق الوظيفي، مصفوفة التصعيد) يرفع نسخة النوع؛ الطلبات القائمة تكمل بالنسخة والسلسلة الملتقطة فيها. التعطيل يخفي النوع من الإنشاء فقط.</p>
        <button type="button" className="btn-primary flex items-center gap-1" onClick={() => open('new')}><Plus size={16} />نوع جديد</button>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {loading ? <p className="text-sm text-gray-400">جارٍ التحميل…</p> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="text-right px-3 py-2">الاسم</th><th className="text-right px-3 py-2">الفئة والطريقة</th>
                <th className="text-right px-3 py-2">الحدود</th><th className="text-right px-3 py-2">المُنشئ والجهة</th><th className="text-right px-3 py-2">السلسلة</th>
                <th className="text-center px-3 py-2">الحالة</th><th className="text-center px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {types.map(row => (
                <tr key={row.id} className="table-row">
                  <td className="table-cell text-sm">{row.nameAr}</td>
                  <td className="table-cell text-xs">{row.categoryLabel}<span className="block text-gray-400">{row.calcMethodLabel}{row.valueStep ? ` (خطوة ${row.valueStep})` : ''}</span></td>
                  <td className="table-cell text-xs">أدنى {formatDeductionMoney(row.minAmount)} · أعلى {row.maxAmount ? formatDeductionMoney(row.maxAmount) : 'بلا'} · {row.maxPctOfGross ?? '—'}%{row.installmentAllowed ? ` · حتى ${row.maxInstallments} أقساط` : ''}{row.isExemptable ? '' : ' · غير قابل للإعفاء'}</td>
                  <td className="table-cell text-xs">{row.creatorScopes.map(item => DEDUCTION_ROLE_LABELS[item]).join('، ')}
                    {row.ownerDepartmentId ? <span className="block text-gray-500">الجهة المالكة: {departmentName(row.ownerDepartmentId)}{row.functionalScope ? ` — نطاق وظيفي: ${row.functionalScope.departmentIds.length} قسم، ${row.functionalScope.teamIds.length} فريق، ${row.functionalScope.employeeIds.length} موظف` : ''}</span> : null}</td>
                  <td className="table-cell text-xs">{row.approvalSteps.map(role => DEDUCTION_ROLE_LABELS[role]).join(' ← ')}</td>
                  <td className="table-cell text-center"><Badge className={row.isActive ? 'bg-success-100 text-success-700' : 'bg-gray-100 text-gray-500'}>{row.isActive ? 'مفعل' : 'معطل'}</Badge></td>
                  <td className="table-cell text-center"><button type="button" className="btn-secondary text-xs px-2 py-1" onClick={() => open(row)}>تعديل</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-gray-800">{editing === 'new' ? 'نوع خصم جديد' : `تعديل ${editing.nameAr}`}</h4>
              <button type="button" aria-label="إغلاق" onClick={() => setEditing(null)}><X size={18} /></button>
            </div>
            <div className="grid md:grid-cols-3 gap-3 text-sm">
              <label className="text-gray-600">الاسم العربي<input className="input mt-1" value={form.nameAr ?? ''} onChange={event => setForm(value => ({ ...value, nameAr: event.target.value }))} /></label>
              <label className="text-gray-600">الفئة
                <select className="input mt-1" value={form.category} disabled={editing !== 'new' && (editing.category === 'STATUTORY' || editing.category === 'COURT_ORDER')}
                  onChange={event => setForm(value => ({ ...value, category: event.target.value as DeductionCategory }))}>
                  {(Object.keys(DEDUCTION_CATEGORY_LABELS) as DeductionCategory[]).map(key => <option key={key} value={key}>{DEDUCTION_CATEGORY_LABELS[key]}</option>)}
                </select>
              </label>
              <label className="text-gray-600">طريقة الحساب
                <select className="input mt-1" value={form.calcMethod} onChange={event => setForm(value => ({ ...value, calcMethod: event.target.value as DeductionCalcMethod }))}>
                  {(Object.keys(DEDUCTION_METHOD_LABELS) as DeductionCalcMethod[]).map(key => <option key={key} value={key}>{DEDUCTION_METHOD_LABELS[key]}</option>)}
                </select>
              </label>
              <label className="text-gray-600">القيمة الافتراضية<input className="input mt-1" dir="ltr" value={form.defaultValue ?? ''} onChange={event => setForm(value => ({ ...value, defaultValue: event.target.value }))} /></label>
              {unitMethod && <label className="text-gray-600">خطوة المدخل<input className="input mt-1" dir="ltr" value={form.valueStep ?? ''} onChange={event => setForm(value => ({ ...value, valueStep: event.target.value }))} /></label>}
              <label className="text-gray-600">الحد الأدنى للمبلغ<input className="input mt-1" dir="ltr" value={form.minAmount ?? ''} onChange={event => setForm(value => ({ ...value, minAmount: event.target.value }))} /></label>
              <label className="text-gray-600">الحد الأعلى للمبلغ (فارغ = بلا)<input className="input mt-1" dir="ltr" value={form.maxAmount ?? ''} onChange={event => setForm(value => ({ ...value, maxAmount: event.target.value }))} /></label>
              <label className="text-gray-600">أقصى % من إجمالي الراتب<input className="input mt-1" dir="ltr" value={form.maxPctOfGross ?? ''} onChange={event => setForm(value => ({ ...value, maxPctOfGross: event.target.value }))} /></label>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-1"><input type="checkbox" checked={protectedCategory ? false : !!form.isExemptable} disabled={protectedCategory} onChange={event => setForm(value => ({ ...value, isExemptable: event.target.checked }))} />يقبل الإعفاء المالي{protectedCategory ? ' (ممنوع للنظامي والحكم القضائي، والفئة ثابتة)' : ''}</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={!!form.installmentAllowed} onChange={event => setForm(value => ({ ...value, installmentAllowed: event.target.checked, maxInstallments: event.target.checked ? Math.max(2, value.maxInstallments ?? 2) : 1 }))} />يسمح بالتقسيط</label>
              {form.installmentAllowed && <label className="flex items-center gap-1">حتى<input type="number" className="input w-20" min={1} max={24} value={form.maxInstallments ?? 1} onChange={event => setForm(value => ({ ...value, maxInstallments: Number(event.target.value) }))} />أقساط</label>}
              <label className="flex items-center gap-1"><input type="checkbox" checked={!!form.requiresAttachment} onChange={event => setForm(value => ({ ...value, requiresAttachment: event.target.checked }))} />المرفق إلزامي</label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={!!form.isActive} onChange={event => setForm(value => ({ ...value, isActive: event.target.checked }))} />مفعل</label>
            </div>
            <fieldset className="text-sm">
              <legend className="text-gray-700 font-medium mb-1">من يُنشئ هذا النوع (بعلاقته بالموظف)</legend>
              <div className="flex flex-wrap gap-3">{CREATOR_BASES.map(basis => (
                <label key={basis} className={`flex items-center gap-1 ${basis === 'FUNCTION_OWNER' && !form.ownerDepartmentId ? 'text-gray-400' : ''}`}>
                  <input type="checkbox" disabled={basis === 'FUNCTION_OWNER' && !form.ownerDepartmentId} checked={(form.creatorScopes ?? []).includes(basis)}
                    onChange={() => setForm(value => ({ ...value, creatorScopes: toggleList(value.creatorScopes, basis) }))} />{DEDUCTION_ROLE_LABELS[basis]}
                </label>
              ))}</div>
            </fieldset>
            <fieldset className="text-sm">
              <legend className="text-gray-700 font-medium mb-1">خطوات الاعتماد قبل الموارد البشرية (بترتيب الاختيار؛ خطوة الموارد البشرية الأخيرة ثابتة)</legend>
              <div className="flex flex-wrap gap-3">{CHAIN_ROLES.map(role => <label key={role} className="flex items-center gap-1"><input type="checkbox" checked={(form.approvalSteps ?? []).includes(role)} onChange={() => setForm(value => ({ ...value, approvalSteps: toggleList(value.approvalSteps, role) }))} />{DEDUCTION_ROLE_LABELS[role]}</label>)}</div>
              <p className="text-xs text-gray-400 mt-1">السلسلة: {[...(form.approvalSteps ?? []).filter(role => role !== 'HR'), 'HR'].map(role => DEDUCTION_ROLE_LABELS[role as DeductionApprovalRole]).join(' ← ')}. الدور الهيكلي بلا معتمِد يصعد لمستوى أعلى (إعداد «بديل المعتمِد المفقود»).</p>
            </fieldset>
            <details className="text-sm border border-gray-100 rounded-xl p-3">
              <summary className="cursor-pointer text-gray-700 font-medium">خيارات إضافية</summary>
              <div className="space-y-3 mt-3">
                <div className="grid md:grid-cols-3 gap-3">
                  <label className="text-gray-600">الكود<input className="input mt-1" dir="ltr" value={form.code ?? ''} disabled={editing !== 'new'} onChange={event => setForm(value => ({ ...value, code: event.target.value.toUpperCase() }))} /></label>
                  <label className="text-gray-600">الاسم الإنجليزي<input className="input mt-1" dir="ltr" value={form.nameEn ?? ''} onChange={event => setForm(value => ({ ...value, nameEn: event.target.value }))} /></label>
                  <label className="text-gray-600">حد التصعيد بأيام الراتب (فارغ = بلا)<input className="input mt-1" dir="ltr" value={form.escalationDays ?? ''} onChange={event => setForm(value => ({ ...value, escalationDays: event.target.value }))} /></label>
                  <label className="text-gray-600">خطوة التصعيد
                    <select className="input mt-1" value={form.escalationStep ?? 'DEPARTMENT_MANAGER'} onChange={event => setForm(value => ({ ...value, escalationStep: event.target.value as DeductionApprovalRole }))}>
                      {(['DEPARTMENT_MANAGER', 'BRANCH_MANAGER', 'EXECUTIVE'] as DeductionApprovalRole[]).map(role => <option key={role} value={role}>{DEDUCTION_ROLE_LABELS[role]}</option>)}
                    </select>
                  </label>
                  <label className="text-gray-600">أقصى عمر للواقعة (يوم)<input type="number" className="input mt-1" min={0} value={form.maxIncidentAgeDays ?? 90} onChange={event => setForm(value => ({ ...value, maxIncidentAgeDays: Number(event.target.value) }))} /></label>
                  <label className="text-gray-600">أولوية الترحيل (الأعلى يُحصَّل أولًا)<input type="number" className="input mt-1" min={1} max={99} value={form.carryForwardPriority ?? 3} onChange={event => setForm(value => ({ ...value, carryForwardPriority: Number(event.target.value) }))} /></label>
                  <label className="text-gray-600">الجهة المالكة
                    <select className="input mt-1" value={form.ownerDepartmentId ?? ''} onChange={event => setForm(value => ({ ...value, ownerDepartmentId: event.target.value ? Number(event.target.value) : null,
                      ...(event.target.value ? {} : { functionalScope: null, creatorScopes: (value.creatorScopes ?? []).filter(item => item !== 'FUNCTION_OWNER') }) }))}>
                      <option value="">بلا جهة مالكة</option>
                      {org.departments.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
                    </select>
                  </label>
                </div>
                {form.ownerDepartmentId ? <p className="text-xs text-gray-500">النوع مملوك لجهة: الأدوار الهيكلية لا تُنشئه إلا لمن ينتمي لتلك الجهة؛ «مدير الجهة المالكة» يُنشئه على نطاقه الوظيفي أدناه.</p> : null}
                {(form.creatorScopes ?? []).length > 0 && (
                  <div>
                    <p className="text-gray-700 font-medium mb-1">حد التصعيد الخاص بكل دور</p>
                    <div className="grid md:grid-cols-2 gap-2">
                      {(form.creatorScopes ?? []).map(basis => (
                        <div key={basis} className="flex items-center gap-2 text-xs">
                          <span className="w-28 text-gray-600">{DEDUCTION_ROLE_LABELS[basis]}</span>
                          <select className="input py-1" value={matrixMode(basis)} onChange={event => setMatrix(basis, event.target.value as 'inherit' | 'never' | 'custom', form.escalationDays || '1')}>
                            <option value="inherit">حد النوع ({form.escalationDays || 'بلا'})</option>
                            <option value="custom">حد خاص بالأيام</option>
                            <option value="never">بلا تصعيد</option>
                          </select>
                          {matrixMode(basis) === 'custom' && <input className="input py-1 w-20" dir="ltr" value={String(form.basisEscalationDays?.[basis] ?? '')} onChange={event => setMatrix(basis, 'custom', event.target.value)} />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            {form.ownerDepartmentId ? (
              <fieldset className="text-sm border border-gray-100 rounded-xl p-3">
                <legend className="text-gray-700 font-medium px-1">النطاق الوظيفي للجهة المالكة — فارغ = أقسام الجهة نفسها</legend>
                <p className="text-xs text-gray-500 mb-1">الأقسام (مع فروعها)</p>
                <div className="flex flex-wrap gap-3">{org.departments.map(row => <label key={row.id} className="flex items-center gap-1"><input type="checkbox" checked={scope.departmentIds.includes(row.id)} onChange={() => toggleScope('departmentIds', row.id)} />{row.name}</label>)}</div>
                <p className="text-xs text-gray-500 mt-2 mb-1">الفرق</p>
                <div className="flex flex-wrap gap-3">{ownerTeams.map(row => <label key={row.id} className="flex items-center gap-1"><input type="checkbox" checked={scope.teamIds.includes(row.id)} onChange={() => toggleScope('teamIds', row.id)} />{row.name}</label>)}</div>
                <p className="text-xs text-gray-500 mt-2 mb-1">موظفون بأعيانهم ({scope.employeeIds.length})</p>
                <div className="flex flex-wrap gap-1 mb-1">{scope.employeeIds.map(id => {
                  const person = org.employees.find(row => row.id === id)
                  return <button key={id} type="button" className="px-2 py-0.5 rounded-full text-xs bg-gray-100" onClick={() => toggleScope('employeeIds', id)}>{person ? `${person.fullName} (${person.employeeCode})` : `#${id}`} ×</button>
                })}</div>
                <input className="input" placeholder="ابحث بالاسم أو الرقم الوظيفي لإضافة موظف" value={employeeSearch} onChange={event => setEmployeeSearch(event.target.value)} />
                {employeeMatches.length > 0 && <div className="max-h-32 overflow-y-auto mt-1">{employeeMatches.map(row => (
                  <label key={row.id} className="flex items-center gap-1 text-xs p-1"><input type="checkbox" checked={scope.employeeIds.includes(row.id)} onChange={() => toggleScope('employeeIds', row.id)} />{row.fullName} — {row.employeeCode}</label>
                ))}</div>}
              </fieldset>
            ) : null}
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

// ===== DD-13: التقارير بنطاق المستخدم مع تصدير جدولي بنفس الأعمدة المعروضة =====
function ReportSection({ title, note, headers, rows, file, empty }: { title: string; note?: string; headers: string[]; rows: Array<Array<string | number>>; file: string; empty: string }) {
  return (
    <section className="border border-gray-100 rounded-xl p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-medium text-gray-800">{title}</h4>
        <button type="button" className="btn-secondary text-xs px-2 py-1 flex items-center gap-1" disabled={!rows.length} onClick={() => downloadCsv(`deductions-${file}-${csvDateStamp()}.csv`, headers, rows)}><Download size={14} />تصدير</button>
      </div>
      {note && <p className="text-xs text-gray-500">{note}</p>}
      {rows.length === 0 ? <p className="text-sm text-gray-400">{empty}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="table-header">{headers.map(header => <th key={header} className="text-right px-3 py-2 whitespace-nowrap">{header}</th>)}</tr></thead>
            <tbody>{rows.map((row, index) => <tr key={index} className="table-row">{row.map((cell, cellIndex) => <td key={cellIndex} className="table-cell text-xs">{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function DeductionReportsPanel({ currency }: { currency: string }) {
  const [filters, setFilters] = useState({ fromPeriod: '', toPeriod: '' })
  const [report, setReport] = useState<DeductionReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const load = () => {
    setLoading(true); setError('')
    fetchDeductionReports({ fromPeriod: filters.fromPeriod || undefined, toPeriod: filters.toPeriod || undefined })
      .then(setReport).catch(err => setError(errorText(err, 'تعذر تحميل تقارير الخصومات'))).finally(() => setLoading(false))
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [])
  const m = (value: string) => formatDeductionMoney(value)
  const ledgerRows = (rows: DeductionReport['ledger']['carried']) => rows.map(row => [row.obligationId, row.requestId ?? '—', row.fullName, row.employeeCode ?? '', row.typeName ?? '', m(row.amount), row.targetPeriod ?? '', row.statusLabel, row.carryDepth, row.reason ?? ''])
  const ledgerHeaders = ['القيد', 'الطلب', 'الموظف', 'الكود', 'النوع', `المبلغ (${currency})`, 'الشهر', 'الحالة', 'مرات الترحيل', 'الملاحظة']
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm text-gray-600">من شهر<input type="month" className="input mt-1" dir="ltr" value={filters.fromPeriod} onChange={event => setFilters(value => ({ ...value, fromPeriod: event.target.value }))} /></label>
        <label className="text-sm text-gray-600">إلى شهر<input type="month" className="input mt-1" dir="ltr" value={filters.toPeriod} onChange={event => setFilters(value => ({ ...value, toPeriod: event.target.value }))} /></label>
        <button type="button" className="btn-secondary flex items-center gap-1" onClick={load} disabled={loading}><RefreshCw size={16} />{loading ? 'جارٍ…' : 'عرض'}</button>
        {report && <span className="text-xs text-gray-500">الفترة {report.fromPeriod} ← {report.toPeriod} · تُقرأ من دفتر المديونيات ولقطات المسيرات بنطاقك</span>}
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {report && <>
        <ReportSection title="المطابقة: سطور الخصم المصنف في المسيرات = قيود الدفتر" file="reconciliation" empty="لا مسيرات معتمدة أو مصروفة بخصومات مصنفة في الفترة (أو لا تملك صلاحية عرض الخصومات)."
          note="أي فرق غير صفري استثناء يُراجع قبل الصرف."
          headers={['المسير', 'الاسم', 'الشهر', 'الحالة', 'السطور', `من المسير (${currency})`, `من الدفتر (${currency})`, 'الفرق']}
          rows={report.reconciliation.map(row => [row.runId, row.runName ?? '', row.period, row.status === 'PAID' ? 'مصروف' : 'معتمد', row.lines, m(row.breakdownTyped), m(row.ledgerTyped), row.difference === '0.00' ? '0.00' : `فرق ${m(row.difference)}`])} />
        <ReportSection title="الخصومات بحسب النوع والجهة المُنزِلة" file="by-type" empty="لا قيود في الفترة."
          headers={['الشهر', 'النوع', 'الفئة', 'الجهة المُنزِلة', 'الطلبات', `المستحق (${currency})`, `المحصل (${currency})`, `المعكوس (${currency})`]}
          rows={report.byType.map(row => [row.period, row.typeName ?? row.typeCode ?? '', row.categoryLabel ?? '', row.basisLabel, row.requests, m(row.due), m(row.collected), m(row.reversed)])} />
        <ReportSection title="الخصومات بحسب الموظف" file="by-employee" empty="لا خصومات قائمة خلال 12 شهرًا."
          note={`يُوسم من تجاوز ${report.repeatThreshold} خصومات خلال 90 يومًا.`}
          headers={['الموظف', 'الكود', '3 أشهر (عدد)', `3 أشهر (${currency})`, '6 أشهر (عدد)', `6 أشهر (${currency})`, '12 شهرًا (عدد)', `12 شهرًا (${currency})`, 'خلال 90 يومًا', 'الأنواع', 'تكرار']}
          rows={report.byEmployee.map(row => [row.fullName, row.employeeCode ?? '', row.last3.count, m(row.last3.total), row.last6.count, m(row.last6.total), row.last12.count, m(row.last12.total), row.last90Count, row.types.join('، '), row.repeatFlag ? 'متكرر' : ''])} />
        <ReportSection title="المرحّل بسبب حماية الصافي" file="carried" empty="لا أقساط مرحّلة مفتوحة." headers={ledgerHeaders} rows={ledgerRows(report.ledger.carried)} />
        <ReportSection title="المعلّق بانتظار قرار الموارد البشرية" file="suspended" empty="لا أقساط معلقة." headers={ledgerHeaders} rows={ledgerRows(report.ledger.suspended)} />
        <ReportSection title="قيود بلا مسير" file="without-run" empty="لا قيود متأخرة بلا مسير." headers={ledgerHeaders} rows={ledgerRows(report.ledger.withoutRun)} />
        <ReportSection title="زمن دورة الاعتماد" file="cycle-time" empty="لا قرارات اعتماد مسجلة."
          note={`الطلبات ${report.escalation.total} · المصعّدة بالمبلغ ${report.escalation.escalated} (${report.escalation.ratePct}%) · المصعّدة بانتهاء المهلة ${report.escalation.slaEscalations}`}
          headers={['الدور', 'عدد القرارات', 'متوسط الساعات', 'أقصى الساعات']} rows={report.cycleTime.map(row => [row.roleLabel, row.acted, row.avgHours, row.maxHours])} />
        <ReportSection title="اعتراضات الموظفين" file="objections" empty="لا اعتراضات."
          headers={['الطلب', 'الموظف', 'النوع', 'الاعتراض', 'الرد', 'حالة الطلب']}
          rows={report.objections.map(row => [row.requestId, row.fullName, row.typeName ?? '', row.text ?? '', row.response ?? 'بلا رد', DEDUCTION_STATUS_META[row.requestStatus as DeductionStatus]?.label ?? row.requestStatus])} />
      </>}
    </div>
  )
}
