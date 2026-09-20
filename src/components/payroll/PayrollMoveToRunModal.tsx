'use client'

// طلب المالك (20 سبتمبر): نافذة واحدة لنقل/ضم الموظفين لمسير — من الجدول الموحد (اختيار متعدد) أو من صف موظف واحد.
// الاختيار المختلط بيتبعت في نداء واحد: اللي في مسير مفتوح يتنقل منه، واللي بلا مسير يتضاف، والباقي يتخطى بسببه لكل موظف.
// العضوية دائمة: التغيير بيبدأ من الشهر المختار ورايح، والشهر المعتمد أو المصروف ما بيتغيرش.

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeftRight, CheckCircle, Search, XCircle } from 'lucide-react'
import { PayrollPeriodSelect, usePayrollDayRange } from '@/components/DayRangeFilter'
import { dayRangeLabel } from '@/lib/payroll-month-range'
import { fetchPayrollRunTargets, type OverviewRunTarget } from '@/lib/payroll-overview-api'
import { movePayrollRunMembers, payrollRunErrorMessage, type PayrollBulkMembershipResult } from '@/lib/payroll-runs-api'

const RUN_STATUS: Record<string, string> = { DRAFT: 'مسودة', CALCULATED: 'محسوب', IN_REVIEW: 'قيد المراجعة', APPROVED: 'معتمد', PAID: 'مصروف', CANCELLED: 'ملغى' }
export const moveTargetLabel = (run: Pick<OverviewRunTarget, 'id' | 'name'>) => run.name ? `${run.name} (#${run.id})` : `مسير #${run.id}`
/** سطر وصف المسير في القائمة: فترته بالأيام ومجموعة معادلاته. */
export const moveTargetDetails = (run: OverviewRunTarget) =>
  `${dayRangeLabel({ from: run.startDate, to: run.endDate })} · ${run.policyName ? `معادلة «${run.policyName}»${run.versionNo ? ` نسخة ${run.versionNo}` : ''}` : 'بلا معادلة محفوظة'}`

export interface PayrollMoveCandidate {
  employeeId: number
  fullName: string
  employeeCode?: string | null
  /** المسير اللي هو فيه دلوقتي (لو معروف) — للعرض بس؛ الخادم هو اللي بيحدد النقل من الإضافة */
  runId?: number | null
  runName?: string | null
}

export function PayrollMoveToRunModal({ employees, period, cycleStartDay, today, onClose, onDone }: {
  employees: PayrollMoveCandidate[]
  period: string
  cycleStartDay?: number | null
  today?: string | null
  onClose: () => void
  onDone: (result: PayrollBulkMembershipResult) => Promise<void> | void
}) {
  const payrollMonth = usePayrollDayRange().context
  const [month, setMonth] = useState(period)
  const [targets, setTargets] = useState<OverviewRunTarget[] | null>(null)
  const [query, setQuery] = useState('')
  const [targetId, setTargetId] = useState<number | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<PayrollBulkMembershipResult | null>(null)

  useEffect(() => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return
    let cancelled = false
    setTargets(null)
    setTargetId(null)
    fetchPayrollRunTargets(month)
      .then(data => { if (!cancelled) setTargets(data.targets) })
      .catch(e => { if (!cancelled) { setTargets([]); setError(payrollRunErrorMessage(e, 'تعذر تحميل المسيرات المفتوحة')) } })
    return () => { cancelled = true }
  }, [month])

  const shown = useMemo(() => {
    const text = query.trim().toLowerCase()
    return (targets ?? []).filter(run => !text || moveTargetLabel(run).toLowerCase().includes(text) || (run.policyName ?? '').toLowerCase().includes(text))
  }, [targets, query])
  const moving = employees.filter(row => row.runId != null).length
  const adding = employees.length - moving

  const submit = async () => {
    setError('')
    if (!targetId) { setError('اختار المسير اللي هيتنقلوا له'); return }
    if (reason.trim().length < 3) { setError('اكتب سبب النقل (3 حروف على الأقل)'); return }
    setBusy(true)
    try {
      const value = await movePayrollRunMembers(targetId, { employeeIds: employees.map(row => row.employeeId), reason: reason.trim() })
      setResult(value)
      await onDone(value)
    } catch (e) {
      setError(payrollRunErrorMessage(e, 'تعذر نقل الموظفين'))
    } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="نقل لمسير">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-xl space-y-3 text-right" data-testid="payroll-move-to-run">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <ArrowLeftRight size={18} />
            {employees.length === 1 ? `نقل لمسير… — ${employees[0].fullName}` : `نقل لمسير… — ${employees.length} موظف`}
          </h3>
          <button type="button" onClick={onClose} disabled={busy} className="text-sm text-gray-500 disabled:opacity-50">إغلاق</button>
        </div>

        {!result && <>
          <p className="text-xs text-gray-500">
            {moving > 0 && adding > 0 ? `${moving} في مسير دلوقتي (هيتنقلوا) و${adding} بلا مسير (هيتضافوا) — نداء واحد.`
              : moving > 0 ? `${moving} موظف في مسير دلوقتي — هيتنقلوا منه.` : `${adding} موظف بلا مسير — هيتضافوا.`}
            {' '}العضوية دائمة: التغيير بيبدأ من الشهر المختار ويكمّل كل شهر بعده، والشهر المعتمد أو المصروف ما بيتغيرش.
          </p>

          <PayrollPeriodSelect id="payroll-move-period" label="التغيير يبدأ من شهر" value={month} className="w-56" disabled={busy}
            cycleStartDay={cycleStartDay ?? payrollMonth?.cycleStartDay ?? null} today={today ?? payrollMonth?.to ?? null}
            onChange={setMonth} />

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-gray-700">المسير المنقول إليه</span>
              <span className="relative">
                <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" className="input w-52 pr-8 text-sm" placeholder="دوّر باسم المسير أو المعادلة" disabled={busy}
                  value={query} onChange={event => setQuery(event.target.value)} data-move-target-search />
              </span>
            </div>
            {targets === null ? <p className="text-sm text-gray-400">جارٍ تحميل المسيرات المفتوحة…</p> : shown.length === 0 ? (
              <p className="text-sm text-gray-500">مفيش مسير مفتوح في شهر {month}{query.trim() ? ' بالبحث ده' : ''} — اعمل «مسير جديد» من تبويب المسيرات.</p>
            ) : (
              <div className="max-h-56 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-xl" data-move-target-list>
                {shown.map(run => (
                  <label key={run.id} className={`flex items-start gap-2 p-2.5 cursor-pointer ${targetId === run.id ? 'bg-primary-50' : ''}`}>
                    <input type="radio" name="payroll-move-target" className="mt-1" disabled={busy} data-move-target={run.id}
                      checked={targetId === run.id} onChange={() => setTargetId(run.id)} />
                    <span className="text-sm">
                      <span className="block font-medium text-gray-800">{moveTargetLabel(run)} <span className="text-xs text-gray-500">{RUN_STATUS[run.status] ?? run.status}</span></span>
                      <span className="block text-xs text-gray-500" dir="rtl">{moveTargetDetails(run)}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700">السبب</span>
            <input className="input w-full" maxLength={400} value={reason} disabled={busy} placeholder="مثال: اتنقلوا لفرع النصر من الشهر ده"
              onChange={event => setReason(event.target.value)} data-move-reason />
          </label>

          {error && <p role="alert" className="p-2 bg-red-50 text-red-700 rounded-lg text-sm">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" className="btn-secondary text-sm" disabled={busy} onClick={onClose}>رجوع</button>
            <button type="button" className="btn-primary text-sm disabled:opacity-50" data-move-submit
              disabled={busy || !targetId || reason.trim().length < 3} onClick={submit}>
              {busy ? 'بينقل...' : `انقل ${employees.length} موظف`}
            </button>
          </div>
        </>}

        {result && <PayrollMoveResult result={result} onClose={onClose} />}
      </div>
    </div>
  )
}

/** نتيجة كل موظف على حدة: تم (اتنقل من مين / اتضاف) أو اتخطى وسببه. */
export function PayrollMoveResult({ result, onClose }: { result: PayrollBulkMembershipResult; onClose: () => void }) {
  const target = result.target.name ? `${result.target.name} (#${result.target.id})` : `مسير #${result.target.id}`
  return (
    <div className="space-y-3 text-sm" data-move-result>
      <p className="font-medium text-gray-800">
        {target} — اتنقل {result.moved.length}، اتضاف {result.added.length}، اتخطى {result.skipped.length} — من شهر {result.fromPeriod} ورايح.
      </p>
      <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-xl">
        {result.results.map(row => (
          <div key={row.employeeId} className="flex items-start gap-2 p-2.5" data-move-result-row={row.employeeId}>
            {row.outcome === 'SKIPPED'
              ? <XCircle size={16} className="mt-0.5 text-amber-600 shrink-0" />
              : <CheckCircle size={16} className="mt-0.5 text-success-600 shrink-0" />}
            <div>
              <p className="font-medium text-gray-800">{row.fullName ?? `موظف #${row.employeeId}`}{row.employeeCode ? <span className="text-xs text-gray-400"> · {row.employeeCode}</span> : null}</p>
              <p className={row.outcome === 'SKIPPED' ? 'text-xs text-amber-700' : 'text-xs text-gray-500'}>
                {row.outcome === 'SKIPPED' ? `اتخطى — ${row.skipReason ?? 'بلا سبب موثق'}`
                  : row.outcome === 'MOVED' ? `تم — اتنقل من ${row.fromRunName ?? `مسير #${row.fromRunId}`}` : 'تم — اتضاف للمسير'}
              </p>
            </div>
          </div>
        ))}
      </div>
      {!result.recalculated && (result.moved.length > 0 || result.added.length > 0) && (
        <p className="text-xs text-gray-500">المسير لسه مسودة: احسبها عشان يظهروا في بنوده.</p>
      )}
      {result.recalculateRuns.length > 0 && (
        <p className="text-xs text-gray-600">أعد حساب أشهر لاحقة: {result.recalculateRuns.map(run => `${run.name ?? `#${run.id}`} (${run.period})`).join('، ')}</p>
      )}
      {result.lockedRuns.length > 0 && (
        <p className="text-xs text-gray-600">ما اتغيّرش: {result.lockedRuns.map(run => `${run.name ?? `#${run.id}`} ${run.period} (${RUN_STATUS[run.status] ?? run.status})`).join('، ')}</p>
      )}
      <div className="flex justify-end">
        <button type="button" className="btn-primary text-sm" onClick={onClose}>تمام</button>
      </div>
    </div>
  )
}

export default PayrollMoveToRunModal
