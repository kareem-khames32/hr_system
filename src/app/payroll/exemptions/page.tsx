'use client'

import { useCallback, useEffect, useState } from 'react'
import { ShieldOff } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { can } from '@/lib/api'
import {
  approveExemption,
  EXEMPTION_STATUS_META,
  fetchExemptionReport,
  fetchExemptions,
  rejectExemption,
  type ExemptionReport,
  type ExemptionStatus,
  type ExemptionView,
} from '@/lib/financial-exemptions-api'
import { formatMoney } from '@/lib/money'

// الخطوة 26 — الإعفاءات المالية: قائمة بنطاق الفرع مع قرار ما ينتظر اعتماد الموارد البشرية، وتقرير الحوكمة (EX-06):
// من أعفى من ومن ماذا وبكم، مع تنبيهات التركّز والاستثناءات والمطابقة. المنح نفسه من شاشة المسير (إعفاء جديد) أو «إعفاءاتي» لمدير القسم.
const monthOf = (offset: number) => { const date = new Date(); date.setMonth(date.getMonth() + offset); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` }

export default function PayrollExemptionsPage() {
  const [tab, setTab] = useState<'list' | 'report'>('list')
  const [status, setStatus] = useState<ExemptionStatus | ''>('PENDING_APPROVAL')
  const [period, setPeriod] = useState('')
  const [rows, setRows] = useState<ExemptionView[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [decision, setDecision] = useState<{ row: ExemptionView; action: 'approve' | 'reject'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [fromPeriod, setFromPeriod] = useState(monthOf(-5))
  const [toPeriod, setToPeriod] = useState(monthOf(1))
  const [report, setReport] = useState<ExemptionReport | null>(null)
  const allowed = can('financial_exemption.view') || can('financial_exemption.approve') || can('financial_exemption.grant')

  const load = useCallback(() => {
    setLoading(true); setError('')
    fetchExemptions({ status: status || undefined, period: period || undefined })
      .then(setRows).catch(e => setError(e instanceof Error ? e.message : 'تعذر تحميل الإعفاءات')).finally(() => setLoading(false))
  }, [status, period])
  useEffect(() => { if (allowed && tab === 'list') load() }, [allowed, tab, load])

  const loadReport = () => {
    setLoading(true); setError('')
    fetchExemptionReport(fromPeriod, toPeriod).then(setReport).catch(e => setError(e instanceof Error ? e.message : 'تعذر تحميل التقرير')).finally(() => setLoading(false))
  }
  const decide = async () => {
    if (!decision) return
    setBusy(true); setError('')
    try {
      if (decision.action === 'approve') await approveExemption(decision.row.id, decision.text.trim(), decision.row.revision)
      else await rejectExemption(decision.row.id, decision.text.trim(), decision.row.revision)
      setDecision(null); load()
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر تنفيذ القرار') } finally { setBusy(false) }
  }

  if (!allowed) return <MainLayout><div className="card text-sm text-gray-600">الإعفاءات المالية تتطلب صلاحية عرض الإعفاءات أو منحها أو اعتمادها.</div></MainLayout>
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><ShieldOff size={24} /> الإعفاءات المالية</h1>
          <div className="flex gap-2">
            <button type="button" className={tab === 'list' ? 'btn-primary text-sm' : 'btn-secondary text-sm'} onClick={() => setTab('list')}>القائمة والاعتماد</button>
            {can('financial_exemption.view') && <button type="button" className={tab === 'report' ? 'btn-primary text-sm' : 'btn-secondary text-sm'} onClick={() => setTab('report')}>تقرير الحوكمة</button>}
          </div>
        </div>
        <p className="text-sm text-gray-500">الإعفاء المالي قرار مستقل عن استثناء الحضور يستهدف موظفًا في مسير واحد قبل اعتماده. يُمنح من شاشة المسير («إعفاء جديد») ويُطبق بإعادة الحساب؛ المانح لا يعتمد ما منحه.</p>
        {error && <p role="alert" className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">{error}</p>}

        {tab === 'list' && (
          <div className="card space-y-3">
            <div className="flex flex-wrap gap-3 items-end">
              <label className="text-sm">الحالة
                <select className="input mt-1" value={status} onChange={event => setStatus(event.target.value as ExemptionStatus | '')}>
                  <option value="">الكل</option>
                  {(Object.keys(EXEMPTION_STATUS_META) as ExemptionStatus[]).map(key => <option key={key} value={key}>{EXEMPTION_STATUS_META[key].label}</option>)}
                </select>
              </label>
              <label className="text-sm">شهر المسير
                <input className="input mt-1" type="month" value={period} onChange={event => setPeriod(event.target.value)} />
              </label>
            </div>
            {loading ? <p className="text-sm text-gray-400">جارٍ التحميل…</p> : rows.length === 0 ? <p className="text-sm text-gray-400">لا إعفاءات بهذه المعايير.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead><tr className="bg-gray-50 text-gray-600">
                    <th className="p-2">#</th><th className="p-2">المسير</th><th className="p-2">الموظف</th><th className="p-2">الهدف</th><th className="p-2">المبلغ</th><th className="p-2">الحالة</th><th className="p-2">المانح والسبب</th><th className="p-2">إجراء</th>
                  </tr></thead>
                  <tbody>
                    {rows.map(row => (
                      <tr key={row.id} className="border-t border-gray-100 align-top">
                        <td className="p-2 font-mono">{row.id}</td>
                        <td className="p-2">#{row.runId} {row.runName ?? ''}<p className="text-xs text-gray-400">{row.period} — {row.runStatusLabel}</p></td>
                        <td className="p-2">{row.employeeName ?? `#${row.employeeId}`}<p className="text-xs text-gray-400">{row.employeeCode}</p></td>
                        <td className="p-2">{row.targetLabel}<p className="text-xs text-gray-500">{row.dispositionLabel}</p></td>
                        <td className="p-2 font-mono">{formatMoney(row.exemptedAmountSnapshot ?? row.estimatedAmount ?? 0)}</td>
                        <td className="p-2"><span className={`badge ${EXEMPTION_STATUS_META[row.status]?.className ?? ''}`}>{row.statusLabel}</span></td>
                        <td className="p-2 text-xs">{row.grantorBasisLabel} — {row.grantedByName ?? '—'}<p className="text-gray-700 whitespace-pre-wrap">{row.reason}</p></td>
                        <td className="p-2 space-y-1">
                          {row.canApprove && <button type="button" className="btn-primary text-xs block" onClick={() => setDecision({ row, action: 'approve', text: '' })}>اعتماد</button>}
                          {row.canReject && <button type="button" className="btn-secondary text-xs block" onClick={() => setDecision({ row, action: 'reject', text: '' })}>رفض</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {decision && (
              <div className="p-3 border rounded-xl bg-gray-50">
                <p className="text-sm font-medium mb-2">{decision.action === 'approve' ? 'اعتماد' : 'رفض'} الإعفاء #{decision.row.id} — {decision.row.employeeName}</p>
                <textarea className="input w-full" rows={2} value={decision.text} onChange={event => setDecision({ ...decision, text: event.target.value })}
                  placeholder={decision.action === 'approve' ? 'ملاحظة (اختيارية)' : 'سبب الرفض (20 حرفًا على الأقل)'} />
                <div className="flex gap-2 mt-2">
                  <button type="button" className="btn-primary text-sm" disabled={busy || (decision.action === 'reject' && decision.text.trim().length < 20)} onClick={decide}>تأكيد</button>
                  <button type="button" className="btn-secondary text-sm" onClick={() => setDecision(null)}>تراجع</button>
                </div>
                {decision.action === 'approve' && <p className="text-xs text-gray-500 mt-1">بعد الاعتماد أعد حساب المسير ليُطبق الإعفاء.</p>}
              </div>
            )}
          </div>
        )}

        {tab === 'report' && (
          <div className="space-y-4">
            <div className="card flex flex-wrap gap-3 items-end">
              <label className="text-sm">من شهر<input className="input mt-1" type="month" value={fromPeriod} onChange={event => setFromPeriod(event.target.value)} /></label>
              <label className="text-sm">إلى شهر<input className="input mt-1" type="month" value={toPeriod} onChange={event => setToPeriod(event.target.value)} /></label>
              <button type="button" className="btn-primary text-sm" disabled={loading || !fromPeriod || !toPeriod} onClick={loadReport}>عرض التقرير</button>
            </div>
            {report && (<>
              <div className="card grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div><p className="text-gray-500">المبلغ المُعفى (مسيرات معتمدة/مصروفة)</p><p className="font-bold font-mono">{formatMoney(report.totals.exemptedAmount)}</p></div>
                <div><p className="text-gray-500">نسبته من الخصومات</p><p className="font-bold">{report.totals.exemptedPctOfDeductions}%</p></div>
                <div><p className="text-gray-500">الإعفاءات / المطبقة / بانتظار الاعتماد</p><p className="font-bold">{report.totals.exemptions} / {report.totals.applied} / {report.totals.pending}</p></div>
                <div><p className="text-gray-500">المطابقة مع بنود المسير</p><p className={`font-bold font-mono ${Number(report.reconciliation.difference) === 0 ? 'text-success-700' : 'text-red-700'}`}>فرق {formatMoney(report.reconciliation.difference)}</p></div>
              </div>
              <div className="card space-y-2">
                <h2 className="font-bold text-gray-800">التنبيهات</h2>
                {report.alerts.grantors.length + report.alerts.employees.length + report.alerts.types.length === 0 ? <p className="text-sm text-gray-400">لا تنبيهات للفترة.</p> : (
                  <ul className="list-disc pr-5 text-sm text-amber-800">
                    {report.alerts.grantors.map(row => <li key={`g${row.userId}`}>المانح {row.name ?? `#${row.userId}`} أعفى {row.pctOfScopeDeductions}% من خصومات مسيراته (الحد {report.thresholds.maxPctPerGrantor}%)</li>)}
                    {report.alerts.employees.map(row => <li key={`e${row.employeeId}`}>الموظف {row.fullName ?? `#${row.employeeId}`} أُعفي {row.last6Months} مرات خلال 6 أشهر: {row.targets.join('، ')}</li>)}
                    {report.alerts.types.map(row => <li key={`t${row.key}`}>{row.label}: معدل التفريغ {row.drainRatePct}% (الحد {report.thresholds.typeDrainAlertPct}%)</li>)}
                  </ul>
                )}
              </div>
              <ReportTable title="بحسب المانح" headers={['المانح', 'الأساس', 'العدد', 'المطبق', 'المرفوض', 'المبلغ', 'النسبة']}
                rows={report.byGrantor.map(row => [row.name ?? `#${row.userId}`, row.bases.join('، '), row.count, row.applied, row.rejected, formatMoney(row.amount), `${row.pctOfScopeDeductions}%`])} />
              <ReportTable title="بحسب الموظف" headers={['الموظف', '3 أشهر', '6 أشهر', '12 شهرًا', 'المبلغ', 'الأهداف']}
                rows={report.byEmployee.map(row => [`${row.fullName ?? `#${row.employeeId}`} ${row.employeeCode ?? ''}`, row.last3Months, row.last6Months, row.last12Months, formatMoney(row.amount), row.targets.join('، ')])} />
              <ReportTable title="بحسب نوع الخصم" headers={['البند', 'المُعفى', 'المحصل', 'معدل التفريغ']}
                rows={report.byType.map(row => [row.label, formatMoney(row.exempted), formatMoney(row.collected), `${row.drainRatePct}%`])} />
              <ReportTable title="بحسب المسير" headers={['المسير', 'الشهر', 'الحالة', 'المُعفى', 'المكافآت المصروفة', 'صافي المسير']}
                rows={report.byRun.map(row => [`#${row.runId} ${row.name ?? ''}`, row.period, row.statusLabel, formatMoney(row.exempted), formatMoney(row.bonuses), formatMoney(row.totalNet ?? 0)])} />
              <div className="card text-sm space-y-1">
                <h2 className="font-bold text-gray-800">الاستثناءات</h2>
                <p>فوق حد المرفق بلا مرفق: {report.exceptions.aboveThresholdWithoutAttachment.map(row => `#${row.id}`).join('، ') || '—'}</p>
                <p>إعادة إعفاء بعد إلغاء: {report.exceptions.reexemptionsAfterRevoke.map(row => `#${row.id}`).join('، ') || '—'}</p>
                <p>منح هيكلي مرفوض: {report.exceptions.rejectedStructuralGrants.map(row => `#${row.id} (${row.basisLabel})`).join('، ') || '—'}</p>
                <p>تجاوزات حدود موثقة: {report.exceptions.limitOverrides.map(row => `#${row.id}`).join('، ') || '—'}</p>
              </div>
            </>)}
          </div>
        )}
      </div>
    </MainLayout>
  )
}

function ReportTable({ title, headers, rows }: { title: string; headers: string[]; rows: Array<Array<string | number>> }) {
  return (
    <div className="card">
      <h2 className="font-bold text-gray-800 mb-2">{title}</h2>
      {rows.length === 0 ? <p className="text-sm text-gray-400">لا بيانات.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead><tr className="bg-gray-50 text-gray-600">{headers.map(header => <th key={header} className="p-2">{header}</th>)}</tr></thead>
            <tbody>{rows.map((row, index) => <tr key={index} className="border-t border-gray-100">{row.map((cell, cellIndex) => <td key={cellIndex} className="p-2">{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}
