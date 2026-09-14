'use client'

// الخطوة 18: تقرير «موظفون بلا مسير» لفترة المسير مع أسبابهم، والإقرار الموثق الذي يسبق الاعتماد.
import { useCallback, useEffect, useState } from 'react'
import type { ApiBranch, ApiDepartment, ApiTeam } from '../../lib/api'
import {
  acknowledgePayrollRunUnassigned, fetchPayrollRunUnassigned, payrollRunErrorMessage, UNASSIGNED_REASON_LABELS,
  type PayrollRunUnassignedReport,
} from '../../lib/payroll-runs-api'

export function PayrollUnassignedPanel({ runId, snapshotVersion, runStatus, branches, departments, teams, onAckChange }: {
  runId: number; snapshotVersion: number; runStatus: string
  branches: ApiBranch[]; departments: ApiDepartment[]; teams: ApiTeam[]
  onAckChange?: (current: boolean) => void
}) {
  const [report, setReport] = useState<PayrollRunUnassignedReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const next = await fetchPayrollRunUnassigned(runId)
      setReport(next)
      onAckChange?.(!!next.acknowledgement.current)
    } catch (e) {
      setReport(null)
      onAckChange?.(false)
      setError(payrollRunErrorMessage(e, 'تعذر تحميل تقرير «موظفون بلا مسير»'))
    } finally {
      setLoading(false)
    }
  }, [runId, onAckChange])

  useEffect(() => { load() }, [load, snapshotVersion, runStatus])

  const acknowledge = async () => {
    if (!report || busy) return
    setBusy(true)
    setError('')
    try {
      const next = await acknowledgePayrollRunUnassigned(runId, report.reportHash, note)
      setReport(next)
      setNote('')
      onAckChange?.(!!next.acknowledgement.current)
    } catch (e) {
      setError(payrollRunErrorMessage(e, 'تعذر تسجيل الإقرار'))
      await load()
    } finally {
      setBusy(false)
    }
  }

  const nameOf = <T extends { id: number; name: string }>(rows: T[], id: number | null) => id == null ? null : rows.find(row => row.id === id)?.name ?? `#${id}`
  const ack = report?.acknowledgement
  return (
    <div className="card border border-amber-200 space-y-3" data-testid="payroll-unassigned-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-bold text-gray-800">موظفون بلا مسير في الفترة</h3>
          <p className="text-xs text-gray-500">كل من له علاقة عمل في يوم واحد على الأقل من الفترة وليس داخلًا في مسير غير ملغى. الاعتماد يتطلب إقرارًا بالاطلاع على هذه النسخة.</p>
        </div>
        <button onClick={load} disabled={loading || busy} className="btn-secondary text-sm disabled:opacity-50">تحديث التقرير</button>
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading && !report && <p className="text-sm text-gray-400">جارٍ تحميل التقرير…</p>}
      {report && <>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="badge bg-gray-100 text-gray-700">على رأس العمل: {report.totals.employed}</span>
          <span className="badge bg-success-50 text-success-700">داخل مسيرات: {report.totals.assigned}</span>
          <span className={`badge ${report.totals.unassigned ? 'bg-amber-50 text-amber-800' : 'bg-success-50 text-success-700'}`}>بلا مسير: {report.totals.unassigned}</span>
          {Object.entries(report.totals.byReason).map(([code, count]) => <span key={code} className="badge bg-gray-50 text-gray-600">
            {UNASSIGNED_REASON_LABELS[code as keyof typeof UNASSIGNED_REASON_LABELS] ?? code}: {count}</span>)}
        </div>
        {report.rows.length > 0 ? <div className="max-h-80 overflow-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead><tr className="table-header">
              <th className="text-right px-3 py-2">الموظف</th><th className="text-right px-3 py-2">المكان</th>
              <th className="text-center px-3 py-2">التغطية</th><th className="text-right px-3 py-2">السبب</th>
            </tr></thead>
            <tbody>{report.rows.map(row => <tr key={row.employeeId} className="table-row">
              <td className="table-cell"><p className="font-medium text-gray-800">{row.fullName}</p><p className="text-xs text-gray-400">{row.employeeCode}</p></td>
              <td className="table-cell text-xs">{[nameOf(branches, row.branchId), nameOf(departments, row.departmentId), nameOf(teams, row.teamId)].filter(Boolean).join(' / ') || '—'}</td>
              <td className="table-cell text-center text-xs" dir="ltr">{row.coverFrom ? `${row.coverFrom} → ${row.coverTo} (${row.coverDays})` : '—'}</td>
              <td className="table-cell text-xs"><span className="badge bg-amber-50 text-amber-800 ml-1">{UNASSIGNED_REASON_LABELS[row.reasonCode]}</span> {row.reasonText}</td>
            </tr>)}</tbody>
          </table>
        </div> : <p className="rounded-xl bg-success-50 p-3 text-sm text-success-700">لا يوجد موظف على رأس العمل خارج مسيرات هذه الفترة.</p>}
        {ack?.current ? <p className="rounded-xl bg-success-50 p-3 text-sm text-success-700">
          تم الإقرار بهذه النسخة من التقرير (إقرار #{ack.current.id} بواسطة المستخدم #{ack.current.acknowledgedBy} في {String(ack.current.acknowledgedAt).slice(0, 16).replace('T', ' ')}){ack.current.note ? ` — ${ack.current.note}` : ''}.
        </p> : <div className="space-y-2">
          <p className={`rounded-xl p-3 text-sm ${ack?.stale ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-900'}`}>
            {runStatus === 'DRAFT' ? 'احسب المسودة أولًا؛ الإقرار يخص نسخة حساب محددة.'
              : ack?.stale ? 'تغيّر التقرير أو نسخة الحساب بعد آخر إقرار؛ راجع التقرير الحالي وأقر مجددًا قبل الاعتماد.'
                : 'لم يُقر أحد بعد بهذا التقرير؛ الاعتماد مرفوض حتى الإقرار.'}
          </p>
          {ack?.canAcknowledge && <div className="flex flex-wrap gap-2">
            <input value={note} onChange={e => setNote(e.target.value)} maxLength={500} disabled={busy}
              placeholder="ملاحظة الإقرار (اختيارية): مثل «الموظفون المذكورون في مسير الإدارة الشهر القادم»" className="input flex-1 min-w-64" />
            <button onClick={acknowledge} disabled={busy || loading} className="btn-primary text-sm disabled:opacity-50">أقر بالاطلاع على التقرير</button>
          </div>}
        </div>}
      </>}
    </div>
  )
}
