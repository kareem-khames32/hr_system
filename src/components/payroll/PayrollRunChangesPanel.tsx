'use client'

import { useEffect, useState } from 'react'
import { fetchPayrollRunChanges, type PayrollRunChanges } from '@/lib/api'
import { formatMoney } from '@/lib/money'
import { formatDateTime } from '@/lib/dates'

// B1.7 (R10): «اتغيّر إيه من آخر مسير» — قبل الاعتماد: مين اتغيّر راتبه أو حسابه البنكي أو طريقة صرفه ومين غيّر وإمتى،
// والجداد في المسيرات، والخارجين من آخر مسير في نفس السلسلة. عرض بس لقارئ الرواتب.

const PAY_METHODS: Record<string, string> = { transfer: 'تحويل بنكي', cash: 'نقدي', mixed: 'نقدي + بنك', visa: 'فيزا' }

export function PayrollRunChangesPanel({ runId }: { runId: number }) {
  const [data, setData] = useState<PayrollRunChanges | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    setData(null); setError(null)
    fetchPayrollRunChanges(runId)
      .then(result => { if (!cancelled) setData(result) })
      .catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'تعذر تحميل اللي اتغيّر من آخر مسير') })
    return () => { cancelled = true }
  }, [runId])

  if (error) return <p className="text-sm text-red-600 my-2">{error}</p>
  if (!data) return null
  const total = data.counts.changed + data.counts.new + data.counts.leavers
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 my-4 space-y-3" aria-label="اتغيّر إيه من آخر مسير">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between text-start">
        <span className="font-bold text-gray-800">اتغيّر إيه من آخر مسير</span>
        <span className="text-sm text-gray-500">
          {total === 0 ? 'مفيش تغيير' : `${data.counts.changed} اتغيّر · ${data.counts.new} جديد · ${data.counts.leavers} خرج`}
          <span className="ms-2 text-primary-700 underline">{open ? 'إخفاء' : 'عرض'}</span>
        </span>
      </button>
      {open && (
        <div className="space-y-3">
          {data.rows.length === 0 && data.leavers.length === 0 && <p className="text-sm text-gray-500">مفيش راتب ولا حساب بنكي ولا طريقة صرف اتغيّروا من آخر مسير، ومفيش حد جديد أو خرج.</p>}
          {data.rows.map(row => (
            <div key={row.employeeId} className="border-t border-gray-100 pt-2 text-sm">
              <p className="font-semibold text-gray-800">
                {row.fullName ?? `#${row.employeeId}`}{row.employeeCode ? ` (${row.employeeCode})` : ''}
                {row.isNew && <span className="badge badge-primary ms-2">جديد في المسيرات</span>}
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
