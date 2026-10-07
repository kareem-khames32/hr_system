'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { fetchDocumentExpiry, renewalTaskText, type DocumentExpiryReport as Report } from '@/lib/documents-expiry-api'
import { loadOrgFilterContext } from '@/lib/org-filter'

// B2.15: تقرير «هينتهي / منتهي» في شاشة مستندات الموظفين — بنطاق فروع القارئ، وبفلتر فرع ومدة. المستند اللي له بديل أحدث مابيظهرش.
export function DocumentExpiryReport() {
  // فروع الفلتر من شجرة الفلتر الموحد (بنطاق القارئ) — تعذّرها = من غير فلتر فرع
  const [branches, setBranches] = useState<Array<{ id: number; name: string }>>([])
  useEffect(() => { loadOrgFilterContext().then((context) => setBranches(context.branches)).catch(() => undefined) }, [])
  const [days, setDays] = useState(30)
  const [branchId, setBranchId] = useState<number | null>(null)
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    fetchDocumentExpiry(days, branchId).then((result) => { if (live) { setReport(result); setError(null) } })
      .catch((err) => { if (live) setError(err instanceof Error ? err.message : 'تعذر تحميل تقرير انتهاء المستندات') })
    return () => { live = false }
  }, [days, branchId])

  return (
    <div className="card space-y-3" data-document-expiry>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><AlertTriangle size={18} className="text-warning-600" /> مستندات هتنتهي أو انتهت</h2>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {branches.length > 1 && (
            <select aria-label="الفرع" value={branchId ?? ''} onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : null)} className="rounded-lg border border-gray-200 px-2 py-1.5">
              <option value="">كل الفروع</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          )}
          <select aria-label="المدة" value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-lg border border-gray-200 px-2 py-1.5">
            {[30, 60, 90].map((value) => <option key={value} value={value}>خلال {value} يوم</option>)}
          </select>
        </div>
      </div>
      {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
      {report && (
        <>
          <p className="text-sm text-gray-500">منتهي: <b className="text-red-600">{report.summary.expired}</b> • هينتهي: <b className="text-warning-700">{report.summary.expiring}</b></p>
          {report.rows.length === 0 ? <p className="text-sm text-gray-500">مفيش مستندات منتهية ولا هتنتهي في المدة دي.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-right text-gray-500 border-b border-gray-100">
                    <th className="py-2 px-2 font-medium">الموظف</th>
                    <th className="py-2 px-2 font-medium">الفرع</th>
                    <th className="py-2 px-2 font-medium">المستند</th>
                    <th className="py-2 px-2 font-medium">تاريخ الانتهاء</th>
                    <th className="py-2 px-2 font-medium">التجديد</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-50">
                      <td className="py-2 px-2 text-gray-800">{row.employeeName} <span className="text-xs text-gray-400"><bdi>{row.employeeCode}</bdi></span></td>
                      <td className="py-2 px-2 text-gray-600">{row.branchName ?? '—'}</td>
                      <td className="py-2 px-2 text-gray-600">{row.typeName}</td>
                      <td className="py-2 px-2">
                        <bdi>{row.expiryDate}</bdi>{' '}
                        <span className={`px-2 py-0.5 rounded-full text-xs ${row.state === 'EXPIRED' ? 'bg-red-100 text-red-700' : 'bg-warning-50 text-warning-700'}`}>
                          {row.state === 'EXPIRED' ? `منتهي من ${-row.daysLeft} يوم` : row.daysLeft === 0 ? 'بينتهي النهارده' : `باقي ${row.daysLeft} يوم`}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-gray-600">{renewalTaskText(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
