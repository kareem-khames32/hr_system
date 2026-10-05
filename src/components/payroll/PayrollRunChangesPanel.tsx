'use client'

import { useEffect, useState } from 'react'
import { fetchBankSheet, fetchPayrollRunChanges, type ApiBankSheetRow, type PayrollRunChanges } from '@/lib/api'
import { formatMoney } from '@/lib/money'
import { formatDateTime } from '@/lib/dates'

// B1.7 (R10): «اتغيّر إيه من آخر مسير» — قبل الاعتماد: مين اتغيّر راتبه أو حسابه البنكي أو طريقة صرفه ومين غيّر وإمتى،
// والجداد في المسيرات، والخارجين من آخر مسير في نفس السلسلة. عرض بس لقارئ الرواتب.
// B1.14: تنبيهات قبل الاعتماد في نفس اللوحة — صافي اتغيّر بالنسبة المضبوطة أو أكتر (بالبنود اللي فرقت)، وصافي صفر أو سالب،
// وبيانات صرف ناقصة (من كشف البنوك الموجود: نفس فحصه بالحرف).

const PAY_METHODS: Record<string, string> = { transfer: 'تحويل بنكي', cash: 'نقدي', mixed: 'نقدي + بنك', visa: 'فيزا' }
const person = (row: { employeeId: number; fullName: string | null; employeeCode: string | null }) =>
  `${row.fullName ?? `#${row.employeeId}`}${row.employeeCode ? ` (${row.employeeCode})` : ''}`

export function PayrollRunChangesPanel({ runId }: { runId: number }) {
  const [data, setData] = useState<PayrollRunChanges | null>(null)
  const [paymentIssues, setPaymentIssues] = useState<ApiBankSheetRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    setData(null); setError(null); setPaymentIssues([])
    fetchPayrollRunChanges(runId)
      .then(result => { if (!cancelled) setData(result) })
      .catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'تعذر تحميل اللي اتغيّر من آخر مسير') })
    // بيانات الصرف الناقصة من كشف البنوك؛ فشله مايوقفش اللوحة
    fetchBankSheet(runId)
      .then(sheet => { if (!cancelled) setPaymentIssues(sheet.issues?.rows ?? []) })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [runId])

  if (error) return <p className="text-sm text-red-600 my-2">{error}</p>
  if (!data) return null
  const total = data.counts.changed + data.counts.new + data.counts.leavers
  const netChanges = data.alerts?.netChanges ?? [], zeroNet = data.alerts?.zeroOrNegativeNet ?? []
  const alerts = netChanges.length + zeroNet.length + paymentIssues.length
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 my-4 space-y-3" aria-label="اتغيّر إيه من آخر مسير" data-payroll-changes-panel>
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between text-start">
        <span className="font-bold text-gray-800">
          اتغيّر إيه من آخر مسير
          {alerts > 0 && <span className="badge bg-amber-50 text-amber-800 ms-2" data-payroll-alerts-count>{alerts} تنبيه قبل الاعتماد</span>}
        </span>
        <span className="text-sm text-gray-500">
          {total === 0 ? 'مفيش تغيير' : `${data.counts.changed} اتغيّر · ${data.counts.new} جديد · ${data.counts.leavers} خرج`}
          <span className="ms-2 text-primary-700 underline">{open ? 'إخفاء' : 'عرض'}</span>
        </span>
      </button>
      {open && (
        <div className="space-y-3">
          {alerts > 0 && (
            <div className="rounded-xl bg-amber-50 p-3 text-sm space-y-2" data-payroll-alerts>
              <p className="font-semibold text-amber-900">راجع قبل الاعتماد</p>
              {netChanges.length > 0 && <div>
                <p className="text-amber-900">الصافي اتغيّر {data.alerts!.thresholdPercent}% أو أكتر عن آخر مسير ({netChanges.length}):</p>
                <ul className="text-xs text-gray-700 space-y-1 mt-1">{netChanges.map(row => (
                  <li key={row.employeeId}>
                    <span className="font-medium">{person(row)}</span>: <span dir="ltr">{formatMoney(row.previousNet)}</span> ← <span dir="ltr">{formatMoney(row.currentNet)}</span>
                    {row.percent != null && <span className="text-amber-800"> ({row.percent}%)</span>}
                    {row.previousPeriod && <span className="text-gray-400"> — عن مسير {row.previousPeriod}</span>}
                    {row.lines.length > 0 && <span className="text-gray-500"> — {row.lines.map(line => `${line.label}: ${formatMoney(line.previous)} ← ${formatMoney(line.current)}`).join('، ')}</span>}
                  </li>
                ))}</ul>
              </div>}
              {zeroNet.length > 0 && <p className="text-amber-900">صافي صفر أو سالب ({zeroNet.length}): <span className="text-gray-700">{zeroNet.map(row => `${person(row)}: ${formatMoney(row.netPay)}`).join('، ')}</span></p>}
              {paymentIssues.length > 0 && <div>
                <p className="text-amber-900">بيانات صرف ناقصة ({paymentIssues.length}):</p>
                <ul className="text-xs text-gray-700 space-y-0.5 mt-1">{paymentIssues.map(row => (
                  <li key={row.employeeId}><span className="font-medium">{row.fullName}{row.employeeCode ? ` (${row.employeeCode})` : ''}</span> — {row.issue}</li>
                ))}</ul>
              </div>}
            </div>
          )}
          {/* CRP1-B01: حساب الفروع بيقارن بمسيرات فروعه بس */}
          {data.scoped && <p className="text-xs text-gray-400">المقارنة بآخر مسير لكل موظف في فروعك. اللي اتنقل من فرع تاني بيبان «جديد».</p>}
          {data.rows.length === 0 && data.leavers.length === 0 && <p className="text-sm text-gray-500">مفيش راتب ولا حساب بنكي ولا طريقة صرف اتغيّروا من آخر مسير، ومفيش حد جديد أو خرج.</p>}
          {data.rows.map(row => (
            <div key={row.employeeId} className="border-t border-gray-100 pt-2 text-sm">
              <p className="font-semibold text-gray-800">
                {row.fullName ?? `#${row.employeeId}`}{row.employeeCode ? ` (${row.employeeCode})` : ''}
                {row.isNew && <span className="badge badge-primary ms-2">{data.scoped ? 'جديد على مسيرات فروعك' : 'جديد في المسيرات'}</span>}
              </p>
              {row.salary && <p className="text-gray-700">الراتب الشهري: <span dir="ltr">{formatMoney(row.salary.previous)}</span> ← <span dir="ltr">{formatMoney(row.salary.current)}</span>
                {row.previousPeriod && <span className="text-xs text-gray-400"> (من مسير {row.previousPeriod})</span>}</p>}
              {row.payMethod && <p className="text-gray-700">طريقة الصرف: {PAY_METHODS[row.payMethod.previous] ?? row.payMethod.previous} ← {PAY_METHODS[row.payMethod.current] ?? row.payMethod.current}</p>}
              {row.changes.length > 0 && <ul className="text-xs text-gray-600 space-y-0.5 mt-1">{row.changes.map((change, index) => (
                <li key={index}>
                  {change.label}{change.kind === 'PAYMENT' ? <>: <span dir="ltr">{change.oldValue ?? '—'}</span> ← <span dir="ltr">{change.newValue ?? '—'}</span></> : change.reason ? ` (${change.reason})` : ''}
                  {' — '}{change.changedByName ?? (change.changedByUserId ? `مستخدم #${change.changedByUserId}` : 'غير مسجل')} · {formatDateTime(change.changedAt)}
                  {change.source ? ` · ${change.source}` : ''}
                </li>
              ))}</ul>}
            </div>
          ))}
          {data.leavers.length > 0 && (
            <div className="border-t border-gray-100 pt-2 text-sm">
              <p className="font-semibold text-gray-800">خرجوا من المسير ده{data.previousSeriesPeriod ? ` (كانوا في مسير ${data.previousSeriesPeriod})` : ''}</p>
              <p className="text-gray-600">{data.leavers.map(row => `${row.fullName ?? `#${row.employeeId}`}${row.employeeCode ? ` (${row.employeeCode})` : ''}`).join('، ')}</p>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
