'use client'

// شاشة استثناء الحضور (خطة المراجعة 24): طلب واعتماد ورفض وإلغاء وإنهاء، بسجل قرار كامل.
// الإجراءات المعروضة لكل صف تأتي من الخادم (فصل المهام: منشئ الطلب لا يعتمده — إلا مدير الموارد البشرية، وإنشاؤه لغيره
// بيتعتمد لحظتها: قرار المالك 26 سبتمبر)، والخادم يعيد كل فحص عند التنفيذ.
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Ban, CalendarX, CheckCircle, History, Plus, RefreshCw, Search, ShieldCheck, X, XCircle } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { DayRangeFilter, usePayrollDayRange } from '@/components/DayRangeFilter'
import { periodOverlapsRange } from '@/lib/payroll-month-range'
import {
  approveAttendanceExemption,
  can,
  cancelAttendanceExemption,
  createAttendanceExemption,
  fetchEmployeeDirectory,
  terminateAttendanceExemption,
  type ApiEmployeeDirectoryEntry,
} from '@/lib/api'
import {
  EXEMPTION_DECISION_LABELS,
  EXEMPTION_EVENT_LABELS,
  EXEMPTION_REASON_LABELS,
  EXEMPTION_STATE_LABELS,
  emptyExemptionForm,
  exemptionCreateBody,
  exemptionCreatedNotice,
  exemptionCreateFormError,
  exemptionErrorMessage,
  exemptionReasonError,
  fetchAttendanceExemptionEvents,
  fetchAttendanceExemptionList,
  rejectAttendanceExemption,
  type AttendanceExemptionEventRow,
  type AttendanceExemptionList,
  type AttendanceExemptionRow,
  type ExemptionCreateForm,
  type ExemptionDecisionKind,
  type ExemptionReasonCode,
  type ExemptionState,
} from '@/lib/attendance-exemptions-api'

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'CLOSED'

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'ALL', label: 'كل الطلبات' },
  { value: 'PENDING', label: 'بانتظار القرار' },
  { value: 'APPROVED', label: 'معتمد (ساري أو يبدأ لاحقًا)' },
  { value: 'CLOSED', label: 'منتهٍ أو مرفوض أو ملغى' },
]

const matchesFilter = (state: ExemptionState, filter: StatusFilter) =>
  filter === 'ALL' ||
  (filter === 'PENDING' && (state === 'PENDING_HR' || state === 'PENDING_EXECUTIVE')) ||
  (filter === 'APPROVED' && (state === 'ACTIVE' || state === 'SCHEDULED')) ||
  (filter === 'CLOSED' && (state === 'ENDED' || state === 'REJECTED' || state === 'CANCELLED'))

const periodText = (row: AttendanceExemptionRow) => {
  const end = row.terminatedFrom ? `وأُنهي من ${row.terminatedFrom}` : row.effectiveTo ? `إلى ${row.effectiveTo}` : '— مفتوح'
  return `من ${row.effectiveFrom} ${end}`
}

const latestDate = (...dates: Array<string | null | undefined>) =>
  dates.filter((date): date is string => !!date).sort().at(-1) ?? ''

function ExemptionsContent() {
  const canView = can('attendance_exemption.view')
  const canManage = can('attendance_exemption.manage')
  const [data, setData] = useState<AttendanceExemptionList | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [filter, setFilter] = useState<StatusFilter>('ALL')
  const [search, setSearch] = useState('')
  // الاستثناءات اللي مدتها بتتقاطع مع الفترة — الافتراضي شهر الرواتب الجاري (مثلًا 23 → 22)
  const { range, setRange, context } = usePayrollDayRange()
  const [notice, setNotice] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState<ExemptionCreateForm>(emptyExemptionForm())
  const [employees, setEmployees] = useState<ApiEmployeeDirectoryEntry[]>([])
  const [employeesError, setEmployeesError] = useState('')
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [decision, setDecision] = useState<{ kind: ExemptionDecisionKind; row: AttendanceExemptionRow } | null>(null)
  const [decisionReason, setDecisionReason] = useState('')
  const [terminateFrom, setTerminateFrom] = useState('')
  const [deciding, setDeciding] = useState(false)
  const [decisionError, setDecisionError] = useState('')

  const [historyRow, setHistoryRow] = useState<AttendanceExemptionRow | null>(null)
  const [history, setHistory] = useState<AttendanceExemptionEventRow[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')

  useEffect(() => {
    if (!canView) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    setError('')
    fetchAttendanceExemptionList()
      .then(result => { if (!cancelled) setData(result) })
      .catch(cause => { if (!cancelled) setError(exemptionErrorMessage(cause, 'تعذر تحميل طلبات استثناء الحضور.')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [canView, reload])

  // «بانتظار موافقتي» بيفتح الشاشة على الطلبات المعلقة (?status=PENDING)
  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get('status')
    if (status && STATUS_FILTERS.some(option => option.value === status)) setFilter(status as StatusFilter)
  }, [])

  useEffect(() => {
    if (!createOpen || employees.length) return
    let cancelled = false
    setEmployeesError('')
    fetchEmployeeDirectory()
      .then(rows => { if (!cancelled) setEmployees(rows) })
      .catch(cause => { if (!cancelled) setEmployeesError(exemptionErrorMessage(cause, 'تعذر تحميل قائمة الموظفين.')) })
    return () => { cancelled = true }
  }, [createOpen, employees.length])

  const rows = useMemo(() => data?.rows ?? [], [data])
  const minLength = data?.reasonMinLength ?? 20
  // العدادات والجدول على نفس الفترة المختارة (الاستثناءات اللي مدتها بتتقاطع معاها)
  const rangeRows = useMemo(() => rows.filter(row => !range || periodOverlapsRange(row.effectiveFrom, row.effectiveTo, range)), [rows, range])
  const counts = useMemo(() => ({
    pending: rangeRows.filter(row => row.state === 'PENDING_HR' || row.state === 'PENDING_EXECUTIVE').length,
    awaitingMe: rangeRows.filter(row => row.actions.approve || row.actions.approveExecutive).length,
    active: rangeRows.filter(row => row.state === 'ACTIVE').length,
    scheduled: rangeRows.filter(row => row.state === 'SCHEDULED').length,
  }), [rangeRows])
  // المعلق خارج الفترة المختارة بيتقال بدل ما يختفي بصمت (عدد «بانتظار موافقتي» بيعدّ كل المعلق)
  const pendingOutsideRange = filter === 'PENDING' ? rows.filter(row => matchesFilter(row.state, 'PENDING') && !rangeRows.includes(row)).length : 0
  const term = search.trim().toLowerCase()
  const visible = rangeRows.filter(row => matchesFilter(row.state, filter) && (!term ||
    `${row.employee?.fullName ?? ''} ${row.employee?.employeeCode ?? ''} #${row.id}`.toLowerCase().includes(term)))
  const employeeTerm = employeeSearch.trim().toLowerCase()
  const employeeChoices = employees.filter(row => String(row.id) === form.employeeId || !employeeTerm ||
    `${row.fullName} ${row.employeeCode}`.toLowerCase().includes(employeeTerm))

  const openCreate = () => {
    if (!data) return
    setForm(emptyExemptionForm(data.today))
    setFormError('')
    setEmployeeSearch('')
    setCreateOpen(true)
  }

  const submitCreate = async () => {
    if (!data || saving) return
    const problem = exemptionCreateFormError(form, minLength, data.earliestStart ?? data.currentPeriodStart)
    if (problem) { setFormError(problem); return }
    setSaving(true)
    setFormError('')
    try {
      const created = await createAttendanceExemption(exemptionCreateBody(form))
      setCreateOpen(false)
      // مدير الموارد البشرية بصلاحية الاعتماد: الخادم بيرجّعه معتمدًا لحظتها (قرار المالك 26 سبتمبر)
      setNotice(exemptionCreatedNotice(created))
      setReload(value => value + 1)
    } catch (cause) {
      setFormError(exemptionErrorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  const minTerminateDate = (row: AttendanceExemptionRow) => latestDate(data?.today, row.effectiveFrom, data?.currentPeriodStart)

  const openDecision = (kind: ExemptionDecisionKind, row: AttendanceExemptionRow) => {
    setDecision({ kind, row })
    setDecisionReason('')
    setDecisionError('')
    setTerminateFrom(kind === 'terminate' ? minTerminateDate(row) : '')
  }

  const submitDecision = async () => {
    if (!decision || deciding) return
    const problem = exemptionReasonError(decisionReason, minLength)
    if (problem) { setDecisionError(problem); return }
    if (decision.kind === 'terminate' && !/^\d{4}-\d{2}-\d{2}$/.test(terminateFrom)) {
      setDecisionError('حدد أول يوم يعود فيه الموظف لقواعد الحضور.')
      return
    }
    const { kind, row } = decision
    const reason = decisionReason.trim()
    setDeciding(true)
    setDecisionError('')
    try {
      if (kind === 'approve') await approveAttendanceExemption(row.id, reason, false)
      else if (kind === 'approveExecutive') await approveAttendanceExemption(row.id, reason, true)
      else if (kind === 'reject') await rejectAttendanceExemption(row.id, reason)
      else if (kind === 'cancel') await cancelAttendanceExemption(row.id, reason)
      else await terminateAttendanceExemption(row.id, terminateFrom, reason)
      setDecision(null)
      setNotice(`تم «${EXEMPTION_DECISION_LABELS[kind].submit}» للطلب #${row.id}.`)
      setReload(value => value + 1)
    } catch (cause) {
      setDecisionError(exemptionErrorMessage(cause))
    } finally {
      setDeciding(false)
    }
  }

  const openHistory = async (row: AttendanceExemptionRow) => {
    setHistoryRow(row)
    setHistory([])
    setHistoryError('')
    setHistoryLoading(true)
    try {
      const events = await fetchAttendanceExemptionEvents(row.id)
      setHistory(current => (current.length ? current : events))
    } catch (cause) {
      setHistoryError(exemptionErrorMessage(cause, 'تعذر تحميل سجل القرار.'))
    } finally {
      setHistoryLoading(false)
    }
  }

  if (!canView) {
    return <p className="card text-gray-500">عرض استثناءات الحضور يتطلب صلاحية «عرض استثناءات الحضور في النطاق».</p>
  }

  const smallButton = 'px-3 py-1.5 text-xs inline-flex items-center gap-1 disabled:opacity-50'

  return (
    <div className="space-y-6 pb-8">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <span className="rounded-2xl p-3 bg-primary-50 text-primary-600"><ShieldCheck size={26} /></span>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">استثناء الحضور</h1>
            <p className="text-gray-500 mt-1">في أيام الاستثناء المعتمد لا يُخصم على الموظف غياب ولا تأخير ولا نقص ساعات، ويُصرف راتبه الثابت عن تلك الأيام.</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button type="button" className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50" disabled={loading} onClick={() => setReload(value => value + 1)}>
            <RefreshCw size={16} />تحديث
          </button>
          {canManage && (
            <button type="button" className="btn-primary inline-flex items-center gap-2 disabled:opacity-50" disabled={loading || !data} onClick={openCreate}>
              <Plus size={18} />طلب استثناء
            </button>
          )}
        </div>
      </header>

      <section className="card space-y-2 text-sm text-gray-600" aria-label="مسار استثناء الحضور">
        <p><strong className="text-gray-800">المسار:</strong> طلب ← اعتماد الموارد البشرية من مستخدم غير منشئ الطلب ← للمناصب القيادية اعتماد تنفيذي من مستخدم آخر ← نافذة سارية بتاريخ ← إنهاء بتاريخ عند الحاجة.</p>
        <p>ما ينشئه مدير الموارد البشرية لموظف غيره يُعتمد لحظة إنشائه باسمه (قراره نهائي)، والقيادي منه ينتظر الاعتماد التنفيذي وحده ما لم يحمل صلاحيته.</p>
        <p>الموظف المستثنى بلا خصومات حضور وبلا عمل إضافي. والاستثناء لا يرفع خصومات الجودة أو الالتزام أو أقساط السلف؛ رفعها يكون بالإعفاء المالي.</p>
        {data && <p className="text-xs text-gray-500">يبدأ الطلب الجديد من بداية فترة الرواتب السابقة ({data.earliestStart ?? data.currentPeriodStart}) أو بعدها، ولا يغيّر الاستثناء فترة في مسير معتمد أو مصروف.</p>}
      </section>

      {notice && (
        <div role="status" className="card bg-success-50 text-success-600 text-sm flex items-start justify-between gap-3">
          <span>{notice}</span>
          <button type="button" aria-label="إغلاق التنبيه" onClick={() => setNotice('')}><X size={16} /></button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'بانتظار القرار', value: counts.pending, tone: 'bg-warning-50 text-warning-600' },
          { label: 'بانتظار قرارك أنت', value: counts.awaitingMe, tone: 'bg-primary-50 text-primary-600' },
          { label: 'سارية اليوم', value: counts.active, tone: 'bg-success-50 text-success-600' },
          { label: 'معتمدة تبدأ لاحقًا', value: counts.scheduled, tone: 'bg-gray-100 text-gray-600' },
        ].map(stat => (
          <div key={stat.label} className="stat-card">
            <span className={`stat-icon text-xl font-bold ${stat.tone}`}>{stat.value}</span>
            <span className="text-sm text-gray-600">{stat.label}</span>
          </div>
        ))}
      </div>

      <section className="card space-y-4" aria-label="طلبات استثناء الحضور">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[220px]">
            <label htmlFor="exemption-search" className="label">بحث</label>
            <div className="relative">
              <Search size={16} className="absolute right-3 top-3 text-gray-400" />
              <input id="exemption-search" className="input pr-9" value={search} placeholder="اسم الموظف أو كوده أو رقم الطلب" onChange={event => setSearch(event.target.value)} />
            </div>
          </div>
          <div className="min-w-[220px]">
            <label htmlFor="exemption-filter" className="label">الحالة</label>
            <select id="exemption-filter" className="input" value={filter} onChange={event => setFilter(event.target.value as StatusFilter)}>
              {STATUS_FILTERS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <DayRangeFilter idPrefix="exemptions" value={range} onChange={setRange} cycleStartDay={context?.cycleStartDay} today={context?.today} />
        </div>
        {error && (
          <div role="alert" className="text-sm text-danger-600 flex items-center gap-2"><AlertTriangle size={16} />{error}</div>
        )}
        {data?.truncated && <p className="text-xs text-warning-600">تُعرض أحدث {data.limit} طلب فقط؛ استخدم البحث لتضييق النتائج.</p>}
        {pendingOutsideRange > 0 && <p className="text-xs text-warning-600">{pendingOutsideRange} طلب آخر بانتظار القرار مدته خارج الفترة المختارة — وسّع الفترة لعرضه.</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px]">
            <thead>
              <tr className="table-header">
                <th className="table-cell text-right">#</th>
                <th className="table-cell text-right">الموظف</th>
                <th className="table-cell text-right">الفترة</th>
                <th className="table-cell text-right">السبب</th>
                <th className="table-cell text-right">الحالة</th>
                <th className="table-cell text-right">القرار</th>
                <th className="table-cell text-right">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="table-cell text-center text-gray-500">جارٍ التحميل…</td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan={7} className="table-cell text-center text-gray-500">{rows.length ? 'لا توجد طلبات مطابقة للبحث أو الحالة.' : 'لا توجد طلبات استثناء حضور في نطاقك بعد.'}</td></tr>
              ) : visible.map(row => (
                <tr key={row.id} className="table-row align-top">
                  <td className="table-cell">{row.id}</td>
                  <td className="table-cell">
                    <div className="font-medium text-gray-800">{row.employee?.fullName ?? `موظف #${row.employeeId}`}</div>
                    <div className="text-xs text-gray-500">{row.employee?.employeeCode}{row.employee?.branchName ? ` · ${row.employee.branchName}` : ''}</div>
                  </td>
                  <td className="table-cell whitespace-nowrap">{periodText(row)}</td>
                  <td className="table-cell max-w-xs">
                    <div className="font-medium">{EXEMPTION_REASON_LABELS[row.reasonCode] ?? row.reasonCode}</div>
                    <div className="text-xs text-gray-500 line-clamp-2" title={row.reason}>{row.reason}</div>
                  </td>
                  <td className="table-cell"><span className={EXEMPTION_STATE_LABELS[row.state].className}>{EXEMPTION_STATE_LABELS[row.state].label}</span></td>
                  <td className="table-cell text-xs text-gray-600 space-y-0.5">
                    <div>أنشأه: {row.createdByName ?? `#${row.createdByUserId}`}</div>
                    {row.approvedByUserId && <div>الموارد البشرية: {row.approvedByName ?? `#${row.approvedByUserId}`}</div>}
                    {row.executiveApprovedByUserId && <div>التنفيذي: {row.executiveApprovedByName ?? `#${row.executiveApprovedByUserId}`}</div>}
                    {row.terminatedByUserId && <div>أنهاه: {row.terminatedByName ?? `#${row.terminatedByUserId}`}</div>}
                    {row.actions.blockedBy === 'CREATOR' && <div className="text-warning-600">أنشأته أنت؛ القرار لمستخدم آخر.</div>}
                    {row.actions.blockedBy === 'HR_APPROVER' && <div className="text-warning-600">اعتمدتَ خطوة الموارد البشرية؛ القرار التنفيذي لمستخدم آخر.</div>}
                    {row.state === 'PENDING_EXECUTIVE' && !row.actions.approveExecutive && <div className="text-warning-600">
                      ينتظر اعتمادًا تنفيذيًا من مستخدم ثالث يحمل صلاحية الاعتماد التنفيذي: غير منشئ الطلب وغير من اعتمد خطوة الموارد البشرية. وإلا فألغِه وأعد تقديمه بتصنيف آخر.
                    </div>}
                  </td>
                  <td className="table-cell">
                    <div className="flex flex-wrap gap-2">
                      {row.actions.approve && <button type="button" className={`btn-success ${smallButton}`} onClick={() => openDecision('approve', row)}><CheckCircle size={14} />اعتماد</button>}
                      {row.actions.approveExecutive && <button type="button" className={`btn-success ${smallButton}`} onClick={() => openDecision('approveExecutive', row)}><CheckCircle size={14} />اعتماد تنفيذي</button>}
                      {row.actions.reject && <button type="button" className={`btn-danger ${smallButton}`} onClick={() => openDecision('reject', row)}><XCircle size={14} />رفض</button>}
                      {row.actions.cancel && <button type="button" className={`btn-secondary ${smallButton}`} onClick={() => openDecision('cancel', row)}><Ban size={14} />إلغاء</button>}
                      {row.actions.terminate && <button type="button" className={`btn-secondary ${smallButton}`} onClick={() => openDecision('terminate', row)}><CalendarX size={14} />إنهاء</button>}
                      <button type="button" className={`btn-secondary ${smallButton}`} onClick={() => openHistory(row)}><History size={14} />السجل</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {createOpen && data && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="exemption-create-title">
            <div className="flex items-center justify-between mb-4">
              <h3 id="exemption-create-title" className="font-bold text-gray-800 text-lg">طلب استثناء حضور</h3>
              <button type="button" disabled={saving} onClick={() => setCreateOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="إغلاق"><X size={20} /></button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="exemption-employee-search" className="label">بحث عن الموظف</label>
                <input id="exemption-employee-search" className="input" value={employeeSearch} placeholder="الاسم أو الكود" onChange={event => setEmployeeSearch(event.target.value)} />
              </div>
              <div>
                <label htmlFor="exemption-employee" className="label">الموظف</label>
                <select id="exemption-employee" className="input" value={form.employeeId} onChange={event => setForm({ ...form, employeeId: event.target.value })}>
                  <option value="">{employees.length ? 'اختر الموظف' : employeesError ? 'تعذر تحميل الموظفين' : 'جارٍ تحميل الموظفين…'}</option>
                  {employeeChoices.map(row => <option key={row.id} value={row.id}>{row.fullName} · {row.employeeCode}</option>)}
                </select>
                {employeesError && <p className="text-xs text-danger-600 mt-1">{employeesError}</p>}
              </div>
              <div>
                <label htmlFor="exemption-from" className="label">يبدأ من</label>
                <input id="exemption-from" type="date" className="input" min={data.earliestStart ?? data.currentPeriodStart} value={form.effectiveFrom} onChange={event => setForm({ ...form, effectiveFrom: event.target.value })} />
              </div>
              <div>
                <label htmlFor="exemption-to" className="label">ينتهي في (اختياري)</label>
                <input id="exemption-to" type="date" className="input" min={form.effectiveFrom || data.earliestStart || data.currentPeriodStart} value={form.effectiveTo} onChange={event => setForm({ ...form, effectiveTo: event.target.value })} />
                <p className="text-xs text-gray-500 mt-1">اتركه فارغًا لنافذة مفتوحة تُنهى لاحقًا بتاريخ.</p>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="exemption-reason-code" className="label">تصنيف السبب</label>
                <select id="exemption-reason-code" className="input" value={form.reasonCode} onChange={event => setForm({ ...form, reasonCode: event.target.value as ExemptionReasonCode | '' })}>
                  <option value="">اختر التصنيف</option>
                  {(Object.keys(EXEMPTION_REASON_LABELS) as ExemptionReasonCode[]).map(code => <option key={code} value={code}>{EXEMPTION_REASON_LABELS[code]}</option>)}
                </select>
                {form.reasonCode === 'executive' && <p className="text-xs text-warning-600 mt-1">الاستثناء القيادي يمر بثلاثة أشخاص مختلفين: من يقدّمه، ومن يعتمده في الموارد البشرية، ومن يعتمده تنفيذيًا. اختر تصنيفًا آخر إن لم يتوفر ثلاثة مستخدمين. (ما ينشئه مدير الموارد البشرية تُعتمد خطوة الموارد البشرية فيه فورًا.)</p>}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="exemption-reason" className="label">السبب الموثق</label>
                <textarea id="exemption-reason" rows={3} maxLength={500} className="input" value={form.reason} onChange={event => setForm({ ...form, reason: event.target.value })} />
                <p className="text-xs text-gray-500 mt-1">{form.reason.trim().length} من 500 حرف — الحد الأدنى {minLength} حرفًا.</p>
              </div>
              <label className="sm:col-span-2 flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.requiresCheckinForPresence} onChange={event => setForm({ ...form, requiresCheckinForPresence: event.target.checked })} />
                يُتوقع منه بصمة دخول (علامة تظهر في كشف الحضور ولا تغيّر الخصم)
              </label>
            </div>
            {formError && <p role="alert" className="text-sm text-danger-600 mt-4">{formError}</p>}
            <div className="flex justify-end gap-2 mt-6">
              <button type="button" className="btn-secondary" disabled={saving} onClick={() => setCreateOpen(false)}>إغلاق</button>
              <button type="button" className="btn-primary disabled:opacity-50" disabled={saving} onClick={submitCreate}>{saving ? 'جارٍ الإرسال…' : 'إرسال الطلب'}</button>
            </div>
          </div>
        </div>
      )}

      {decision && data && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="exemption-decision-title">
            <div className="flex items-center justify-between mb-4">
              <h3 id="exemption-decision-title" className="font-bold text-gray-800 text-lg">{EXEMPTION_DECISION_LABELS[decision.kind].title} #{decision.row.id}</h3>
              <button type="button" disabled={deciding} onClick={() => setDecision(null)} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="إغلاق"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">{decision.row.employee?.fullName ?? `موظف #${decision.row.employeeId}`} · {periodText(decision.row)}</p>
              {decision.kind === 'terminate' && (
                <div>
                  <label htmlFor="exemption-terminate-from" className="label">أول يوم يعود فيه لقواعد الحضور</label>
                  <input id="exemption-terminate-from" type="date" className="input" min={minTerminateDate(decision.row)} max={decision.row.effectiveTo ?? undefined} value={terminateFrom} onChange={event => setTerminateFrom(event.target.value)} />
                  <p className="text-xs text-gray-500 mt-1">الأيام السابقة لهذا التاريخ تبقى مستثناة كما اعتُمدت.</p>
                </div>
              )}
              {decision.kind === 'cancel' && <p className="text-xs text-gray-500">الإلغاء للطلب المعلق فقط، ويبقى الطلب وسجله محفوظين.</p>}
              {decision.kind === 'reject' && <p className="text-xs text-gray-500">الرفض نهائي لهذا الطلب، ويمكن تقديم طلب جديد لاحقًا.</p>}
              <div>
                <label htmlFor="exemption-decision-reason" className="label">سبب القرار</label>
                <textarea id="exemption-decision-reason" rows={3} maxLength={500} className="input" value={decisionReason} onChange={event => setDecisionReason(event.target.value)} />
                <p className="text-xs text-gray-500 mt-1">{decisionReason.trim().length} من 500 حرف — الحد الأدنى {minLength} حرفًا.</p>
              </div>
              {decisionError && <p role="alert" className="text-sm text-danger-600">{decisionError}</p>}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button type="button" className="btn-secondary" disabled={deciding} onClick={() => setDecision(null)}>إغلاق</button>
              <button type="button" className={`${decision.kind === 'reject' ? 'btn-danger' : 'btn-primary'} disabled:opacity-50`} disabled={deciding} onClick={submitDecision}>
                {deciding ? 'جارٍ التنفيذ…' : EXEMPTION_DECISION_LABELS[decision.kind].submit}
              </button>
            </div>
          </div>
        </div>
      )}

      {historyRow && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[85vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="exemption-history-title">
            <div className="flex items-center justify-between mb-4">
              <h3 id="exemption-history-title" className="font-bold text-gray-800 text-lg">سجل قرار الاستثناء #{historyRow.id}</h3>
              <button type="button" onClick={() => setHistoryRow(null)} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="إغلاق"><X size={20} /></button>
            </div>
            {historyLoading && <p className="text-sm text-gray-500">جارٍ التحميل…</p>}
            {historyError && <p role="alert" className="text-sm text-danger-600">{historyError}</p>}
            {!historyLoading && !historyError && history.length === 0 && <p className="text-sm text-gray-500">لا توجد أحداث مسجلة.</p>}
            <ol className="space-y-3">
              {history.map(event => (
                <li key={event.id} className="border border-gray-100 rounded-xl p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-gray-800">{EXEMPTION_EVENT_LABELS[event.eventType] ?? event.eventType}</span>
                    <span className="text-xs text-gray-500" dir="ltr">{String(event.createdAt).slice(0, 16).replace('T', ' ')}</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">بواسطة: {event.actorName ?? `#${event.actorUserId}`}</div>
                  {event.reason && <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{event.reason}</p>}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AttendanceExemptionsPage() {
  return <MainLayout><ExemptionsContent /></MainLayout>
}
