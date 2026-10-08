'use client'

// B2.7-أ: تقرير «مين أقرّ ومين لسه» لسياسة — موظفين جمهورها اللي في نطاق القارئ، وحالة كل واحد مع النسخة السارية، وتصدير.
import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { csvDateStamp, downloadCsv } from '@/lib/csv'
import { formatDate, formatDateTime } from '@/lib/dates'
import { fetchPolicyReport, POLICY_ACK_LABELS, policyGraceText, type ApiPolicyReport, type PolicyAckState } from '@/lib/policies-api'

const STATE_STYLES: Record<PolicyAckState, string> = { ACKNOWLEDGED: 'bg-green-50 text-green-700', PENDING: 'bg-amber-50 text-amber-800', OVERDUE: 'bg-red-50 text-red-700' }
type Filter = 'ALL' | PolicyAckState

export default function PolicyReport({ policyId }: { policyId: number }) {
  const [report, setReport] = useState<ApiPolicyReport | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<Filter>('ALL')

  useEffect(() => {
    let current = true
    setReport(null); setError(''); setFilter('ALL')
    fetchPolicyReport(policyId)
      .then(data => { if (current) setReport(data) })
      .catch(cause => { if (current) setError(cause instanceof Error ? cause.message : 'تعذر تحميل التقرير') })
    return () => { current = false }
  }, [policyId])

  const rows = useMemo(() => (report?.rows ?? []).filter(row => filter === 'ALL' || row.state === filter), [report, filter])
  // غير الإلزامية مالهاش مهلة: «لسه» من غير «عدّى المهلة»
  const stateLabel = (state: PolicyAckState) => state === 'PENDING' && report && !report.policy.isMandatory ? 'لسه' : POLICY_ACK_LABELS[state]

  if (error) return <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>
  if (!report) return <p role="status" className="text-sm text-gray-400">جارٍ تحميل التقرير…</p>

  const exportCsv = () => downloadCsv(`policy-acknowledgements-${report.policy.id}-${csvDateStamp()}.csv`,
    ['كود الموظف', 'الاسم', 'الحالة', 'النسخة اللي أقرّ بيها', 'وقت الإقرار', 'القفل من يوم', 'له حساب'],
    rows.map(row => [row.employeeCode ?? '', row.fullName, stateLabel(row.state), row.acknowledgedVersionNo ?? '', row.acknowledgedAt ? formatDateTime(row.acknowledgedAt) : '',
      row.lockDate ?? '', row.hasAccount ? 'أيوه' : 'لأ']))
  const cards: Array<[Filter, string, number]> = [['ALL', 'في الجمهور', report.summary.audience], ['ACKNOWLEDGED', 'أقرّوا', report.summary.acknowledged],
    ['PENDING', 'لسه', report.summary.pending], ['OVERDUE', 'عدّوا المهلة', report.summary.overdue]]

  return (
    <div className="space-y-4" data-policy-report>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          {report.current ? `النسخة السارية: ${report.current.versionNo} (من ${formatDate(report.current.effectiveDate)})` : 'مفيش نسخة سارية لسه'}
          {report.policy.isMandatory ? ` · إلزامية · ${policyGraceText(report.policy.graceDays)}` : ' · غير إلزامية'}
        </p>
        <button type="button" onClick={exportCsv} disabled={rows.length === 0} className="btn-secondary flex items-center gap-2 disabled:opacity-50"><Download size={18} />تصدير</button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map(([key, label, count]) => (
          <button key={key} type="button" onClick={() => setFilter(key)} aria-pressed={filter === key}
            className={`card text-start transition ${filter === key ? 'ring-2 ring-primary-500' : 'hover:bg-gray-50'}`}>
            <span className="block text-2xl font-bold text-gray-800">{count}</span>
            <span className="text-sm text-gray-500">{label}</span>
          </button>
        ))}
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm" data-policy-report-table>
          <thead className="bg-gray-50">
            <tr>{['الموظف', 'الحالة', 'أقرّ بالنسخة', 'وقت الإقرار', 'القفل من يوم'].map(title => <th key={title} className="px-3 py-2 text-start font-medium text-gray-600 whitespace-nowrap">{title}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(row => (
              <tr key={row.employeeId}>
                <td className="px-3 py-2">
                  <span className="text-gray-800">{row.fullName}</span>
                  {row.employeeCode && <span className="text-xs text-gray-400 mr-2" dir="ltr">{row.employeeCode}</span>}
                  {/* من غير حساب مش هيقدر يدخل يقرّ */}
                  {!row.hasAccount && <span className="badge bg-gray-100 text-gray-600 ms-2">من غير حساب دخول</span>}
                </td>
                <td className="px-3 py-2"><span className={`badge ${STATE_STYLES[row.state]}`}>{stateLabel(row.state)}</span></td>
                <td className="px-3 py-2">{row.acknowledgedVersionNo ?? '—'}</td>
                <td className="px-3 py-2 whitespace-nowrap" dir="ltr">{row.acknowledgedAt ? formatDateTime(row.acknowledgedAt) : '—'}</td>
                <td className="px-3 py-2 whitespace-nowrap">{row.lockDate ? formatDate(row.lockDate) : '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-gray-400">مفيش موظفين بالاختيار ده</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
