'use client'
// B2.5 (إضافة المالك 6 أكتوبر): تقرير الالتزام — لكل موظف في الفترة: المهام اللي خلصت، وفي الميعاد، والمتأخرة، ومرات الرجوع للتعديل
// (ومتوسط التقييم لو ميزة التقييم مفتوحة). الخادم هو اللي بيحدد الموظفين: صاحب «عرض كل المهام» في نطاقه، وغيره على مهام فريقه واللي كلّف بيه.
// دي أرقام بس: مفيش درجة بتتحسب لوحدها.
import { useCallback, useEffect, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { localToday } from '../../lib/dates'
import { fetchTaskReport, TASKS_CHANGED_EVENT, type ApiTaskReport } from '../../lib/tasks-api'

const daysAgo = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function TaskComplianceReport() {
  const [from, setFrom] = useState(daysAgo(90))
  const [to, setTo] = useState(localToday())
  const [report, setReport] = useState<ApiTaskReport | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    try { setReport(await fetchTaskReport(from, to)) } catch (err) { setError(err instanceof Error ? err.message : 'تعذر تحميل التقرير') }
  }, [from, to])
  useEffect(() => { void load() }, [load])
  // بعد أي تغيير في المهام من نفس الشاشة (قفل، رجوع للتعديل، تقييم): الأرقام من الخادم تاني
  useEffect(() => {
    const again = () => { void load() }
    window.addEventListener(TASKS_CHANGED_EVENT, again)
    return () => window.removeEventListener(TASKS_CHANGED_EVENT, again)
  }, [load])

  if (report && !report.available) return null
  return (
    <div className="card space-y-3" data-task-report>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2"><BarChart3 size={18} className="text-primary-600" />الالتزام بالمواعيد</h2>
        <div className="flex flex-wrap items-end gap-2 text-sm">
          <div>
            <label className="label" htmlFor="task-report-from">من</label>
            <input id="task-report-from" type="date" className="input" value={from} max={to} onChange={event => setFrom(event.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="task-report-to">إلى</label>
            <input id="task-report-to" type="date" className="input" value={to} min={from} onChange={event => setTo(event.target.value)} />
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-500">المهام اللي خلصت في الفترة، لكل موظف. الأرقام دي أدلة بس، والتقدير للمدير.</p>
      {error && <div role="alert" className="bg-red-50 text-red-700 rounded-lg p-2 text-sm">{error}</div>}
      {!report ? <p className="text-sm text-gray-500">جاري التحميل…</p> : report.rows.length === 0 ? <p className="text-sm text-gray-500">مفيش مهام خلصت في الفترة دي.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-gray-500 border-b border-gray-200">
                <th className="py-2 px-2 font-medium">الموظف</th>
                <th className="py-2 px-2 font-medium">خلصت</th>
                <th className="py-2 px-2 font-medium">في الميعاد</th>
                <th className="py-2 px-2 font-medium">متأخرة</th>
                <th className="py-2 px-2 font-medium">من غير موعد</th>
                <th className="py-2 px-2 font-medium">مرات الرجوع</th>
                {report.ratingEnabled && <th className="py-2 px-2 font-medium">متوسط التقييم</th>}
              </tr>
            </thead>
            <tbody>
              {report.rows.map(row => (
                <tr key={row.employeeId} className="border-b border-gray-100" data-task-report-row={row.employeeId}>
                  <td className="py-2 px-2">
                    <span className="font-medium text-gray-800">{row.fullName}</span>
                    <span className="block text-xs text-gray-500">{row.employeeCode}{row.branchName ? ` · ${row.branchName}` : ''}</span>
                  </td>
                  <td className="py-2 px-2">{row.done}</td>
                  <td className="py-2 px-2 text-success-700">{row.onTime}</td>
                  <td className={`py-2 px-2 ${row.late ? 'text-red-700 font-medium' : ''}`}>{row.late}</td>
                  <td className="py-2 px-2">{row.noDueDate}</td>
                  <td className={`py-2 px-2 ${row.returns ? 'text-warning-700 font-medium' : ''}`}>{row.returns}</td>
                  {report.ratingEnabled && <td className="py-2 px-2">{row.ratingAverage != null ? `${row.ratingAverage} من 5 (${row.rated})` : '—'}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {report?.truncated && <p className="text-xs text-gray-500">الفترة فيها مهام أكتر من اللي اتعدّ — صغّر الفترة.</p>}
    </div>
  )
}
