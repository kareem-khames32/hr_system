'use client'

// B5.8: «ساعات المشاريع» — المشاريع بعملائها ومهامها (مشروع لكل الفروع بيتعدّل من حساب بكل الفروع)، وتقرير ساعات الأسابيع المعتمدة لكل مشروع في فترة.
// التكلفة بتظهر لو ميزة timesheets.cost مفتوحة والحساب معاه صلاحية عرض الرواتب (الخادم اللي بيقرر). موديول timesheets (مقفول افتراضيًا).
import { useCallback, useEffect, useState } from 'react'
import { Hourglass } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { apiFetch } from '@/lib/api'
import { currencyLabel } from '@/lib/currency'
import { formatMoney } from '@/lib/money'

interface Task { id: number | null; name: string; isActive: boolean }
interface Project { id: number; clientName: string; name: string; branchId: number | null; isActive: boolean; tasks: Task[] }
interface Projects { ready: boolean; canEditAll: boolean; branches: Array<{ id: number; name: string }>; projects: Project[] }
interface ReportProject {
  projectId: number; clientName: string; projectName: string; minutes: number
  tasks: Array<{ taskId: number | null; taskName: string | null; minutes: number }>
  employees: Array<{ employeeId: number; fullName: string; employeeCode: string | null; minutes: number }>
  costs?: Array<{ currency: string; cents: number }>; unpricedMinutes?: number
}
interface Report { from: string; to: string; costShown: boolean; totalMinutes: number; projects: ReportProject[] }
const B = '/timesheets'
const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })
const clock = (minutes: number) => `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`
const money = (cents: number, currency: string) => `${formatMoney(cents / 100)} ${currencyLabel(currency)}`
const ymd = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const monthStart = () => { const now = new Date(); return ymd(new Date(now.getFullYear(), now.getMonth(), 1)) }
const emptyForm = () => ({ id: null as number | null, clientName: '', name: '', branchId: '', isActive: true, tasks: [] as Task[], newTask: '' })

export default function TimesheetsPage() {
  const [data, setData] = useState<Projects | null>(null)
  const [report, setReport] = useState<Report | null>(null)
  const [range, setRange] = useState({ from: monthStart(), to: ymd(new Date()) })
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState(emptyForm())

  const load = useCallback(() => {
    apiFetch<Projects>(`${B}/projects`).then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل المشاريع'))
  }, [])
  useEffect(load, [load])

  async function save() {
    if (form.clientName.trim().length < 2 || form.name.trim().length < 2) return setError('اكتب اسم العميل واسم المشروع')
    setBusy(true); setError(''); setInfo('')
    const body = { clientName: form.clientName.trim(), name: form.name.trim(), branchId: form.branchId ? Number(form.branchId) : null, isActive: form.isActive, tasks: form.tasks.map((task) => ({ ...(task.id === null ? {} : { id: task.id }), name: task.name, isActive: task.isActive })) }
    try {
      await apiFetch(form.id === null ? `${B}/projects` : `${B}/projects/${form.id}`, json(form.id === null ? 'POST' : 'PATCH', body))
      setForm(emptyForm()); setInfo('اتحفظ المشروع'); load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر الحفظ') } finally { setBusy(false) }
  }
  function addTask() {
    const name = form.newTask.trim()
    if (name.length < 2 || form.tasks.some((task) => task.name === name)) return
    setForm({ ...form, tasks: [...form.tasks, { id: null, name, isActive: true }], newTask: '' })
  }
  async function runReport() {
    setBusy(true); setError('')
    try { setReport(await apiFetch<Report>(`${B}/report?from=${range.from}&to=${range.to}`)) } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر تحميل التقرير') } finally { setBusy(false) }
  }
  const branchName = (id: number | null) => id === null ? 'كل الفروع' : data?.branches.find((row) => row.id === id)?.name ?? `فرع #${id}`
  const editable = (row: Project) => row.branchId !== null || !!data?.canEditAll

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Hourglass size={24} className="text-primary-600" />
            ساعات المشاريع
          </h1>
          <p className="text-gray-500 mt-1">المشاريع بعملائها ومهامها، وتقرير ساعات الأسابيع المعتمدة. الموظف بيسجّل من «ساعاتي» ومديره المباشر بيعتمد.</p>
        </div>

        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        {info && <div role="status" className="bg-green-50 text-green-700 rounded-xl p-4">{info}</div>}
        {data && !data.ready && <div className="card text-amber-800 bg-amber-50">جداول ساعات المشاريع لسه ماتطبّقتش على قاعدة البيانات (ترحيلات 171 لحد 174).</div>}

        {data?.ready && (
          <div className="card space-y-3" data-timesheet-projects>
            <h2 className="text-lg font-semibold text-gray-800">المشاريع</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="table-header text-right">العميل</th>
                    <th className="table-header text-right">المشروع</th>
                    <th className="table-header text-right">الفرع</th>
                    <th className="table-header text-right">المهام</th>
                    <th className="table-header text-center">الحالة</th>
                    <th className="table-header" />
                  </tr>
                </thead>
                <tbody>
                  {data.projects.length === 0 && <tr><td colSpan={6} className="table-cell text-center text-gray-500">مفيش مشاريع لسه.</td></tr>}
                  {data.projects.map((row) => (
                    <tr key={row.id} className="border-t border-gray-100">
                      <td className="table-cell">{row.clientName}</td>
                      <td className="table-cell">{row.name}</td>
                      <td className="table-cell">{branchName(row.branchId)}</td>
                      <td className="table-cell text-gray-600">{row.tasks.filter((task) => task.isActive).map((task) => task.name).join('، ') || '—'}</td>
                      <td className="table-cell text-center">{row.isActive ? 'مفعّل' : <span className="text-gray-400">مقفول</span>}</td>
                      <td className="table-cell text-left">{editable(row) && <button type="button" className="text-primary-600 text-xs"
                        onClick={() => setForm({ id: row.id, clientName: row.clientName, name: row.name, branchId: row.branchId === null ? '' : String(row.branchId), isActive: row.isActive, tasks: row.tasks.map((task) => ({ ...task })), newTask: '' })}>تعديل</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 space-y-3" data-timesheet-project-form>
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex-1 min-w-44 text-sm text-gray-600">العميل
                  <input className="input w-full mt-1" maxLength={120} value={form.clientName} onChange={(event) => setForm({ ...form, clientName: event.target.value })} />
                </label>
                <label className="flex-1 min-w-44 text-sm text-gray-600">{form.id === null ? 'مشروع جديد' : 'تعديل المشروع'}
                  <input className="input w-full mt-1" maxLength={150} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                </label>
                <label className="text-sm text-gray-600">الفرع
                  <select className="input mt-1" value={form.branchId} onChange={(event) => setForm({ ...form, branchId: event.target.value })}>
                    {data.canEditAll && <option value="">كل الفروع</option>}
                    {!data.canEditAll && <option value="">اختار</option>}
                    {data.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                  </select>
                </label>
                <label className="text-sm text-gray-600 flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />مفعّل</label>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-gray-600">المهام:</span>
                {form.tasks.map((task, index) => (
                  <label key={`${task.id ?? 'new'}-${task.name}`} className="flex items-center gap-1 bg-white rounded-lg px-2 py-1 border border-gray-200">
                    <input type="checkbox" checked={task.isActive} onChange={(event) => setForm({ ...form, tasks: form.tasks.map((item, at) => at === index ? { ...item, isActive: event.target.checked } : item) })} />
                    {task.name}
                  </label>
                ))}
                <input className="input w-44" maxLength={120} placeholder="مهمة جديدة" value={form.newTask} onChange={(event) => setForm({ ...form, newTask: event.target.value })} />
                <button type="button" className="btn-secondary" onClick={addTask}>إضافة مهمة</button>
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn-primary disabled:opacity-50" disabled={busy} onClick={save}>حفظ</button>
                {form.id !== null && <button type="button" className="btn-secondary" onClick={() => setForm(emptyForm())}>إلغاء</button>}
              </div>
            </div>
          </div>
        )}

        {data?.ready && (
          <div className="card space-y-3" data-timesheet-report>
            <h2 className="text-lg font-semibold text-gray-800">تقرير الساعات المعتمدة</h2>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm text-gray-600">من
                <input type="date" className="input mt-1" value={range.from} onChange={(event) => setRange({ ...range, from: event.target.value })} />
              </label>
              <label className="text-sm text-gray-600">إلى
                <input type="date" className="input mt-1" value={range.to} onChange={(event) => setRange({ ...range, to: event.target.value })} />
              </label>
              <button type="button" className="btn-primary disabled:opacity-50" disabled={busy} onClick={runReport}>عرض</button>
            </div>
            {report && (report.projects.length === 0 ? <p className="text-gray-500">مفيش ساعات معتمدة في الفترة دي.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="table-header text-right">العميل</th>
                      <th className="table-header text-right">المشروع</th>
                      <th className="table-header text-right">المهام</th>
                      <th className="table-header text-right">الموظفين</th>
                      <th className="table-header text-center">الساعات</th>
                      {report.costShown && <th className="table-header text-center">التكلفة</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {report.projects.map((row) => (
                      <tr key={row.projectId} className="border-t border-gray-100 align-top">
                        <td className="table-cell">{row.clientName}</td>
                        <td className="table-cell">{row.projectName}</td>
                        <td className="table-cell text-gray-600">{row.tasks.map((task) => <div key={task.taskId ?? 0}>{task.taskName ?? 'من غير مهمة'}: <span dir="ltr">{clock(task.minutes)}</span></div>)}</td>
                        <td className="table-cell text-gray-600">{row.employees.map((person) => <div key={person.employeeId}>{person.fullName}: <span dir="ltr">{clock(person.minutes)}</span></div>)}</td>
                        <td className="table-cell text-center font-semibold" dir="ltr">{clock(row.minutes)}</td>
                        {report.costShown && (
                          <td className="table-cell text-center">
                            {(row.costs ?? []).map((cost) => <div key={cost.currency}>{money(cost.cents, cost.currency)}</div>)}
                            {(row.unpricedMinutes ?? 0) > 0 && <div className="text-xs text-amber-700">من غير تسعير: <span dir="ltr">{clock(row.unpricedMinutes!)}</span></div>}
                          </td>
                        )}
                      </tr>
                    ))}
                    <tr className="border-t border-gray-200 font-semibold">
                      <td className="table-cell" colSpan={4}>الإجمالي</td>
                      <td className="table-cell text-center" dir="ltr">{clock(report.totalMinutes)}</td>
                      {report.costShown && <td className="table-cell" />}
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
