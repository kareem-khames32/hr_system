'use client'

import { useEffect, useState } from 'react'
import { ShieldOff } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { PayrollFinancialExemptionsPanel } from '@/components/payroll/PayrollFinancialExemptionsPanel'
import { EXEMPTION_STATUS_META, fetchGrantableExemptionRuns, fetchMyExemptions, type GrantableRun, type MyExemptionView } from '@/lib/financial-exemptions-api'
import { formatMoney } from '@/lib/money'

// الخطوة 26 (EX-03 قاعدة 5، EX-04): الموظف يرى كل إعفاء مالي عليه برقمه وحالته وسببه والمانح بالدور.
// مدير القسم يجد تحتها المسيرات المحسوبة التي فيها موظفو قسمه، ويمنح منها إعفاء خصومات الحضور بسقف وباعتماد الموارد البشرية.
export default function MyExemptionsPage() {
  const [rows, setRows] = useState<MyExemptionView[]>([])
  const [runs, setRuns] = useState<GrantableRun[]>([])
  const [runId, setRunId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([fetchMyExemptions(), fetchGrantableExemptionRuns().catch(() => [] as GrantableRun[])])
      .then(([mine, grantable]) => { setRows(mine); setRuns(grantable) })
      .catch(e => setError(e instanceof Error ? e.message : 'تعذر تحميل الإعفاءات'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><ShieldOff size={24} /> إعفاءاتي المالية</h1>
        {error && <p role="alert" className="p-3 bg-red-50 text-red-700 rounded-xl text-sm">{error}</p>}
        <div className="card">
          {loading ? <p className="text-sm text-gray-400">جارٍ التحميل…</p> : rows.length === 0 ? <p className="text-sm text-gray-400">لا إعفاءات مالية عليك.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead><tr className="bg-gray-50 text-gray-600">
                  <th className="p-2">#</th><th className="p-2">المسير</th><th className="p-2">ما أُعفيت منه</th><th className="p-2">المبلغ</th><th className="p-2">الحالة</th><th className="p-2">المانح والسبب</th>
                </tr></thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id} className="border-t border-gray-100 align-top">
                      <td className="p-2 font-mono">{row.id}</td>
                      <td className="p-2">{row.runName ?? `#${row.runId}`}<p className="text-xs text-gray-400">{row.period}</p></td>
                      <td className="p-2">{row.targetLabel}<p className="text-xs text-gray-500">{row.dispositionLabel}</p>
                        {row.lines.map((line, index) => <p key={index} className="text-xs text-gray-600">{line.label}: {formatMoney(line.originalAmount)} ← {formatMoney(line.afterAmount)}{line.note ? ` (${line.note})` : ''}</p>)}</td>
                      <td className="p-2 font-mono">{row.amount ? formatMoney(row.amount) : '—'}<p className="text-xs text-gray-400">{row.amountIsFinal ? 'مُسقط فعلًا' : 'تقديري حتى اعتماد المسير'}</p></td>
                      <td className="p-2"><span className={`badge ${EXEMPTION_STATUS_META[row.status]?.className ?? ''}`}>{row.statusLabel}</span></td>
                      <td className="p-2 text-xs">{row.grantorBasisLabel}<p className="text-gray-700 whitespace-pre-wrap">{row.reason}</p></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-2">أقساط السلف المشمولة بالإعفاء تُؤجل للشهر التالي ولا يُسقط الدين؛ تجدها في «سلفي».</p>
        </div>

        {runs.length > 0 && (
          <div className="card space-y-3">
            <h2 className="font-bold text-gray-800">منح إعفاء لموظفي نطاقك</h2>
            <p className="text-xs text-gray-500">مدير القسم يعفي من خصومات الحضور الآلية لقسمه بسقف يوم راتب ويمر الإعفاء باعتماد الموارد البشرية؛ مدير الجهة المالكة يعفي من نوع خصمها.</p>
            <select className="input" value={runId ?? ''} onChange={event => setRunId(event.target.value ? Number(event.target.value) : null)}>
              <option value="">— اختر المسير —</option>
              {runs.map(run => <option key={run.id} value={run.id}>#{run.id} {run.name ?? ''} — {run.period} ({run.candidates} موظف في نطاقك)</option>)}
            </select>
            {runId && <PayrollFinancialExemptionsPanel key={runId} runId={runId} runStatus="CALCULATED" snapshotVersion={0} />}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
