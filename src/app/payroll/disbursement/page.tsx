'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle, Download, Filter, Lock, Search, X } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { can } from '@/lib/api'
import { downloadCsv } from '@/lib/csv'
import { formatDateTime } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { dayRangeLabel } from '@/lib/payroll-month-range'
import { defaultPayRecord, payRecordReady, type PayRecordDraft } from '@/components/payroll/PayrollPayRecordForm'
import { PayrollDisbursementSummaryTable, PayrollDisbursementTable, PayrollDisbursementTotalsCards } from '@/components/payroll/PayrollDisbursementBoard'
import { PAY_CHANNEL_LABELS, type PayrollPayChannel } from '@/lib/payroll-runs-api'
import {
  closePayrollDisbursement, DISBURSEMENT_CSV_HEADER, DISBURSEMENT_MODE_LABELS, DISBURSEMENT_STATE_LABELS, disbursementCsvRows, disbursementCsvTotals,
  disbursementFilterCount, disbursementUnpaidReasonReady, emptyDisbursementFilter, fetchDisbursementRuns, fetchDisbursementSummary, fetchDisbursementView,
  markDisbursement, markDisbursementFiltered, type PayrollDisbursementFilter, type PayrollDisbursementRow,
  type PayrollDisbursementRunOption, type PayrollDisbursementState, type PayrollDisbursementSummary, type PayrollDisbursementView,
} from '@/lib/payroll-disbursement-api'

// صرف الرواتب موظف بموظف (قرار المالك 22 سبتمبر): موظف المالية حامل payroll.disburse بيعلّم على كل موظف في مسير معتمد «تم الصرف / لم يتم».
// مابيغيّرش أي مبلغ ولا أي حالة للمسير غير علامة الصرف. «إقفال الصرف» (لحامل صلاحية صرف المسير) هو اللي بيقفل الإضافي ويرحّل أقساط السلف — مرة واحدة.
// كل الأرقام من الخادم (نفس دوال كشف البنوك)؛ الشاشة بتعرض وبتصدّر بس.

const STATUS: Record<string, string> = { APPROVED: 'معتمد', PAID: 'مصروف' }
const messageOf = (error: unknown, fallback: string) => error instanceof Error && error.message ? error.message : fallback
const runLabel = (run: { name: string | null; period: string }) => run.name || `مسير ${run.period}`

export default function PayrollDisbursementPage() {
  const [runs, setRuns] = useState<PayrollDisbursementRunOption[]>([])
  const [runId, setRunId] = useState<number | null>(null)
  const [filter, setFilter] = useState<PayrollDisbursementFilter>(emptyDisbursementFilter)
  const [searchText, setSearchText] = useState('')
  const [view, setView] = useState<PayrollDisbursementView | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const [note, setNote] = useState('')
  const [payRecord, setPayRecord] = useState<PayRecordDraft>({ channel: 'MIXED', reference: '' })
  const [unpaidReason, setUnpaidReason] = useState('')
  const [summary, setSummary] = useState<PayrollDisbursementSummary | null>(null)
  const [summaryPeriod, setSummaryPeriod] = useState('')
  const request = useRef(0)
  const canMark = can('payroll.disburse')

  useEffect(() => {
    fetchDisbursementRuns()
      .then(list => {
        setRuns(list)
        const wanted = Number(new URLSearchParams(window.location.search).get('runId'))
        const chosen = list.find(run => run.id === wanted) ?? list.find(run => run.status === 'APPROVED') ?? list[0]
        if (chosen) { setRunId(chosen.id); setSummaryPeriod(chosen.period) }
      })
      .catch(cause => setError(messageOf(cause, 'تعذر تحميل المسيرات')))
  }, [])

  const load = useCallback(async (id: number, next: PayrollDisbursementFilter) => {
    const current = ++request.current
    setLoading(true); setError('')
    try {
      const result = await fetchDisbursementView(id, next)
      if (current === request.current) setView(result)
    } catch (cause) {
      if (current === request.current) { setView(null); setError(messageOf(cause, 'تعذر تحميل صرف المسير')) }
    } finally {
      if (current === request.current) setLoading(false)
    }
  }, [])
  useEffect(() => { if (runId != null) load(runId, filter) }, [runId, filter, load])

  // البحث بمهلة قصيرة عشان مايبعتش للخادم مع كل حرف
  useEffect(() => {
    const timer = setTimeout(() => setFilter(current => current.search === searchText ? current : { ...current, search: searchText }), 300)
    return () => clearTimeout(timer)
  }, [searchText])

  // اختيار مسير تاني بس هو اللي بيصفّر خانات الشاشة (تحديث قائمة المسيرات بعد كل علامة مايمسحش رسالة النجاح ولا الملاحظة)
  useEffect(() => {
    const run = runs.find(row => row.id === runId)
    setPayRecord(defaultPayRecord(run ?? null)); setUnpaidReason(''); setNote(''); setDone('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId])

  useEffect(() => {
    if (!summaryPeriod) { setSummary(null); return }
    let cancelled = false
    fetchDisbursementSummary({ period: summaryPeriod })
      .then(result => { if (!cancelled) setSummary(result) })
      .catch(() => { if (!cancelled) setSummary(null) })
    return () => { cancelled = true }
    // الملخص بيتحدّث بعد كل تعليم أو إقفال (view بيتغير)
  }, [summaryPeriod, view])

  const pickRun = (id: number) => { setRunId(id); setFilter(emptyDisbursementFilter()); setSearchText(''); setView(null) }
  const act = async (action: () => Promise<PayrollDisbursementView & { changed?: number }>, text: (changed: number) => string) => {
    if (busy) return
    setBusy(true); setError(''); setDone('')
    try {
      const result = await action()
      request.current++
      setView(result)
      setDone(text(result.changed ?? 0))
      setRuns(await fetchDisbursementRuns())
    } catch (cause) {
      setError(messageOf(cause, 'تعذر تسجيل علامة الصرف'))
    } finally {
      setBusy(false)
    }
  }
  const toggle = (row: PayrollDisbursementRow) => act(() => markDisbursement(runId!, { itemIds: [row.itemId], paid: row.state !== 'PAID', note }, filter),
    () => row.state === 'PAID' ? `اتلغت علامة «${row.fullName}»` : `اتعلّم «${row.fullName}» تم الصرف`)
  const markFiltered = (paid: boolean) => {
    if (!view) return
    const expectedCount = paid ? view.bulk.markPaid : view.bulk.markUnpaid
    if (!expectedCount) return
    return act(() => markDisbursementFiltered(runId!, { paid, note, expectedCount }, filter), changed => paid ? `اتعلّم ${changed} موظف تم الصرف` : `اتلغت علامة ${changed} موظف`)
  }
  const closeRun = async () => {
    if (!view || busy || !payRecordReady(payRecord)) return
    setBusy(true); setError(''); setDone('')
    try {
      await closePayrollDisbursement(view.run.id, { channel: payRecord.channel as PayrollPayChannel, reference: payRecord.reference, unpaidReason })
      setDone('اتقفل الصرف: المسير بقى مصروف، والإضافي وأقساط السلف اتقفلوا')
      setRuns(await fetchDisbursementRuns())
      await load(view.run.id, filter)
    } catch (cause) {
      setError(messageOf(cause, 'تعذر إقفال الصرف'))
    } finally {
      setBusy(false)
    }
  }

  const periods = useMemo(() => [...new Set(runs.map(run => run.period))].sort().reverse(), [runs])
  const filterCount = disbursementFilterCount({ ...filter, search: searchText })
  const leftover = view ? view.totals.unpaid.count : 0
  const needsReason = !!view && view.run.mode === 'PER_EMPLOYEE' && leftover > 0
  const exportCsv = () => view && downloadCsv(`صرف-الرواتب-${view.run.period}-${view.run.id}.csv`, DISBURSEMENT_CSV_HEADER,
    [...disbursementCsvRows(view.rows), ...disbursementCsvTotals(view.filteredTotals)])

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">صرف الرواتب</h1>
            <p className="text-gray-500 mt-1">علّم على كل موظف في المسير المعتمد «تم الصرف» لما راتبه يتسلّم أو يتحوّل</p>
          </div>
          <button type="button" onClick={exportCsv} disabled={!view || view.rows.length === 0} className="btn-secondary flex items-center gap-2 disabled:opacity-50" data-disbursement-export>
            <Download size={18} />
            تصدير CSV
          </button>
        </div>

        <div className="card flex flex-wrap items-end gap-4">
          <label className="text-sm">
            <span className="font-medium text-gray-700">المسير</span>
            <select className="input mt-1 block w-96 max-w-full" value={runId ?? ''} disabled={busy} onChange={event => pickRun(Number(event.target.value))} data-disbursement-run>
              {runs.length === 0 && <option value="">مفيش مسيرات معتمدة للصرف</option>}
              {runs.map(run => <option key={run.id} value={run.id}>
                {run.period} — {runLabel(run)} ({STATUS[run.status] ?? run.status}){run.markedPaid ? ` · اتعلّم ${run.markedPaid}` : ''}
              </option>)}
            </select>
          </label>
          {view && <p className="text-xs text-gray-600 mb-2">
            {dayRangeLabel({ from: String(view.run.startDate).slice(0, 10), to: String(view.run.endDate).slice(0, 10) })} • {DISBURSEMENT_MODE_LABELS[view.run.mode]}
            {view.run.closed && ` • اتقفل الصرف: ${view.run.closed.by?.name ?? 'غير معروف'}${view.run.closed.at ? ` — ${formatDateTime(view.run.closed.at)}` : ''}${view.run.closed.reference ? ` • المرجع: ${view.run.closed.reference}` : ''}`}
          </p>}
        </div>

        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4 flex items-center gap-2"><AlertTriangle size={18} />{error}</div>}
        {done && <div role="status" className="bg-success-50 text-success-700 rounded-xl p-4">{done}</div>}

        {view && (
          <>
            <PayrollDisbursementTotalsCards totals={view.totals} />

            {view.run.marking === 'CLOSED' && <p className="rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-700 p-3 flex items-center gap-2"><Lock size={16} />
              {view.run.mode === 'RUN_LEVEL' ? 'المسير ده اتصرف كله مرة واحدة واتقفل — كل موظفيه مصروف لهم، ومفيش علامات تتغير.' : 'الصرف مقفول على المسير ده.'}</p>}
            {view.run.marking === 'LATE_ONLY' && <p className="rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900 p-3">
              الصرف اتقفل وفيه ناس لسه ماتصرفلهمش: علّم «تم الصرف» لكل واحد لما راتبه يتسلّم. اللي اتعلّم مابيتلغيش.</p>}

            <div className="card space-y-3" data-disbursement-filters>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Filter size={16} className="text-gray-400" />الفلاتر
                  {filterCount > 0 && <span className="px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 text-xs">{filterCount} فلتر مفعّل</span>}
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <span>ظاهر <b>{view.counts.shown}</b> من {view.counts.all} موظف</span>
                  <button type="button" className="btn-secondary text-xs px-2 py-1 flex items-center gap-1 disabled:opacity-50" disabled={busy || filterCount === 0}
                    onClick={() => { setFilter(emptyDisbursementFilter()); setSearchText('') }}><X size={13} />مسح الفلاتر</button>
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-sm flex-1 min-w-[220px]">
                  <span className="font-medium text-gray-700">بحث</span>
                  <span className="relative block">
                    <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" className="input w-full pr-9" placeholder="دوّر بالاسم أو الكود..." value={searchText} onChange={event => setSearchText(event.target.value)} />
                  </span>
                </label>
                {([['branchId', 'الفرع', 'كل الفروع', view.facets.branches], ['departmentId', 'القسم', 'كل الأقسام', view.facets.departments],
                  ['teamId', 'الفريق', 'كل الفرق', view.facets.teams]] as const).map(([key, title, all, options]) => (
                  <label key={key} className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-gray-700">{title}</span>
                    <select className="input w-44" value={filter[key] ?? ''} disabled={busy}
                      onChange={event => setFilter(current => ({ ...current, [key]: event.target.value ? Number(event.target.value) : null }))}>
                      <option value="">{all}</option>
                      {options.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                    </select>
                  </label>
                ))}
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-gray-700">طريقة الصرف</span>
                  <select className="input w-40" value={filter.payMethod} disabled={busy} onChange={event => setFilter(current => ({ ...current, payMethod: event.target.value }))}>
                    <option value="">كل الطرق</option>
                    {view.facets.payMethods.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-gray-700">حالة الصرف</span>
                  <select className="input w-44" value={filter.state} disabled={busy}
                    onChange={event => setFilter(current => ({ ...current, state: event.target.value as PayrollDisbursementFilter['state'] }))}>
                    <option value="">كل الحالات</option>
                    {(Object.keys(DISBURSEMENT_STATE_LABELS) as PayrollDisbursementState[]).map(state => <option key={state} value={state}>{DISBURSEMENT_STATE_LABELS[state]}</option>)}
                  </select>
                </label>
              </div>
              {filterCount > 0 && <p className="text-xs text-gray-600" data-disbursement-filtered-totals>
                المفلتر: تم <b dir="ltr">{formatMoney(view.filteredTotals.paid.total)}</b> ({view.filteredTotals.paid.count}) • لم يتم <b dir="ltr">{formatMoney(view.filteredTotals.unpaid.total)}</b> ({view.filteredTotals.unpaid.count})
                {' '}• بنك <b dir="ltr">{formatMoney(view.filteredTotals.payable.bank)}</b> • نقدي <b dir="ltr">{formatMoney(view.filteredTotals.payable.cash)}</b>
              </p>}
              {canMark && view.run.marking !== 'CLOSED' && (
                <div className="flex flex-wrap items-end gap-2 border-t border-gray-100 pt-3" data-disbursement-bulk>
                  <label className="text-xs text-gray-600 flex-1 min-w-[220px]">ملاحظة على العلامة (اختياري)
                    <input className="input text-sm mt-1 w-full" value={note} maxLength={500} disabled={busy} onChange={event => setNote(event.target.value)} placeholder="رقم التحويل أو محضر التسليم" />
                  </label>
                  <button type="button" className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50" disabled={busy || loading || view.bulk.markPaid === 0}
                    onClick={() => markFiltered(true)} data-mark-filtered-paid>
                    <CheckCircle size={16} />علّم المفلتر تم الصرف ({view.bulk.markPaid})
                  </button>
                  {view.run.marking === 'OPEN' && view.bulk.markUnpaid > 0 && (
                    <button type="button" className="btn-secondary text-sm disabled:opacity-50" disabled={busy || loading} onClick={() => markFiltered(false)} data-mark-filtered-unpaid>
                      الغِ علامة المفلتر ({view.bulk.markUnpaid})
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="card overflow-x-auto">
              {loading && <p className="text-sm text-gray-400 mb-2">جارٍ التحميل…</p>}
              <PayrollDisbursementTable rows={view.rows} canMark={canMark} disabled={busy || loading} onToggle={toggle} />
            </div>

            {view.run.status === 'APPROVED' && can('payroll.pay') && (
              <div className="card border-2 border-primary-100 space-y-3" data-disbursement-close>
                <h2 className="font-bold text-gray-800">إقفال الصرف</h2>
                <p className="text-sm text-gray-600">
                  الإقفال بيخلّي المسير «مصروف» وبيقفل الإضافي ويرحّل أقساط السلف وقيود الدفتر — مرة واحدة ومالوش رجوع.
                  {view.run.mode === 'NOT_STARTED' ? ' لسه ماحدش اتعلّم: الإقفال دلوقتي معناه إن المسير كله اتصرف مرة واحدة.'
                    : leftover > 0 ? ` فاضل ${leftover} موظف متعلّمش «تم الصرف» بإجمالي ${formatMoney(view.totals.unpaid.total)} — لازم سبب مكتوب، وهيفضلوا ظاهرين «لم يتم» لحد ما يتصرفلهم.`
                    : ' كل المستحقين اتعلّم لهم «تم الصرف».'}
                </p>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="text-xs text-gray-600">قناة الصرف
                    <select className="input text-sm mt-1 block" value={payRecord.channel} disabled={busy} onChange={event => setPayRecord({ ...payRecord, channel: event.target.value as PayRecordDraft['channel'] })}>
                      {(Object.keys(PAY_CHANNEL_LABELS) as PayrollPayChannel[]).map(channel => <option key={channel} value={channel}>{PAY_CHANNEL_LABELS[channel]}</option>)}
                    </select>
                  </label>
                  <label className="text-xs text-gray-600 flex-1 min-w-48">مرجع الصرف
                    <input className="input text-sm mt-1 w-full" value={payRecord.reference} maxLength={100} disabled={busy} onChange={event => setPayRecord({ ...payRecord, reference: event.target.value })} />
                  </label>
                  {needsReason && <label className="text-xs text-gray-600 flex-1 min-w-64">سبب الإقفال من غير الباقيين (مطلوب)
                    <input className="input text-sm mt-1 w-full" value={unpaidReason} maxLength={500} disabled={busy} onChange={event => setUnpaidReason(event.target.value)}
                      placeholder="مثال: راتبه موقوف صرفه لحد ما يرجع من الإجازة" data-disbursement-unpaid-reason />
                  </label>}
                  <button type="button" onClick={closeRun} disabled={busy || loading || !payRecordReady(payRecord) || (needsReason && !disbursementUnpaidReasonReady(unpaidReason))}
                    className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50" data-disbursement-close-button>
                    <Lock size={16} />إقفال الصرف
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {summary && summary.runs.length > 0 && (
          <div className="card overflow-x-auto space-y-3" data-disbursement-summary>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold text-gray-800">ملخص صرف الشهر</h2>
              <select className="input w-36" dir="ltr" value={summaryPeriod} onChange={event => setSummaryPeriod(event.target.value)}>
                {periods.map(period => <option key={period} value={period}>{period}</option>)}
              </select>
            </div>
            <PayrollDisbursementSummaryTable summary={summary} />
          </div>
        )}
      </div>
    </MainLayout>
  )
}
