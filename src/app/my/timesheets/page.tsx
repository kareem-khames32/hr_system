'use client'

// B5.8: «ساعاتي» — الموظف بيسجّل ساعاته على المشاريع لكل يوم في الأسبوع ويبعت الأسبوع لاعتماد مديره المباشر، والمدير بيعتمد أسابيع فريقه
// وهو شايف دقايق الحضور المحسوبة جنب المسجّل. موديول timesheets (مقفول افتراضيًا).
import { useCallback, useEffect, useState } from 'react'
import { Hourglass } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { apiFetch } from '@/lib/api'

interface Line { id: number; workDate: string; projectId: number; clientName: string; projectName: string; taskId: number | null; taskName: string | null; minutes: number; note: string | null }
interface Day { date: string; loggedMinutes: number; attendanceMinutes: number | null }
interface MyWeek {
  ready: boolean; weekStart: string; today: string; status: string; statusLabel: string; editable: boolean; decisionNote: string | null; days: Day[]; entries: Line[]; totalMinutes: number
  projects: Array<{ id: number; clientName: string; name: string; tasks: Array<{ id: number; name: string }> }>
}
interface TeamWeek {
  id: number; fullName: string; employeeCode: string | null; weekStart: string; status: string; statusLabel: string; totalMinutes: number; decisionNote: string | null; canDecide: boolean; days: Day[]; lines: Line[]
}
const B = '/timesheets'
const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })
const clock = (minutes: number | null) => minutes === null ? '—' : `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`
const shift = (week: string, days: number) => { const date = new Date(`${week}T12:00:00`); date.setDate(date.getDate() + days); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
const dayName = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('ar-EG', { weekday: 'long' })
const emptyForm = (workDate = '') => ({ workDate, projectId: '', taskId: '', hours: '', note: '' })

export default function MyTimesheetsPage() {
  const [data, setData] = useState<MyWeek | null>(null)
  const [team, setTeam] = useState<TeamWeek[]>([])
  const [week, setWeek] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [notes, setNotes] = useState<Record<number, string>>({})

  const load = useCallback(() => {
    apiFetch<MyWeek>(`${B}/my${week ? `?week=${week}` : ''}`).then((result) => { setData(result); setForm((current) => current.workDate ? current : emptyForm(result.today >= result.weekStart && result.today <= shift(result.weekStart, 6) ? result.today : result.weekStart)) })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل ساعاتك'))
    apiFetch<{ weeks: TeamWeek[] }>(`${B}/team`).then((result) => setTeam(result.weeks)).catch(() => setTeam([]))
  }, [week])
  useEffect(load, [load])

  async function run(work: () => Promise<unknown>, done: string) {
    setBusy(true); setError(''); setInfo('')
    try { await work(); setInfo(done); load() } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر الحفظ') } finally { setBusy(false) }
  }
  function add() {
    const hours = Number(form.hours)
    if (!form.workDate || !form.projectId || form.hours.trim() === '' || !Number.isFinite(hours) || hours <= 0) return setError('اختار اليوم والمشروع واكتب عدد الساعات')
    return run(async () => {
      await apiFetch(`${B}/my/entries`, json('PUT', { workDate: form.workDate, projectId: Number(form.projectId), taskId: form.taskId ? Number(form.taskId) : null, minutes: Math.round(hours * 60), note: form.note.trim() || undefined }))
      setForm({ ...emptyForm(form.workDate), projectId: form.projectId })
    }, 'اتسجّلت الساعات')
  }
  const remove = (line: Line) => run(() => apiFetch(`${B}/my/entries`, json('PUT', { workDate: line.workDate, projectId: line.projectId, taskId: line.taskId, minutes: 0 })), 'اتشال السطر')
  const submit = () => run(() => apiFetch(`${B}/my/submit`, json('POST', { weekStart: data!.weekStart })), 'اتبعت الأسبوع للاعتماد')
  const recall = () => run(() => apiFetch(`${B}/my/recall`, json('POST', { weekStart: data!.weekStart })), 'اتسحب الأسبوع')
  const decide = (row: TeamWeek, action: 'APPROVE' | 'REJECT') => run(() => apiFetch(`${B}/weeks/${row.id}/decision`, json('POST', { action, note: (notes[row.id] ?? '').trim() || undefined })), action === 'APPROVE' ? 'اتعتمد الأسبوع' : 'اترفض الأسبوع')

  const project = data?.projects.find((row) => String(row.id) === form.projectId)

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Hourglass size={24} className="text-primary-600" />
            ساعاتي
          </h1>
          <p className="text-gray-500 mt-1">سجّل ساعاتك على المشاريع لكل يوم، وابعت الأسبوع لمديرك يعتمده.</p>
        </div>

        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        {info && <div role="status" className="bg-green-50 text-green-700 rounded-xl p-4">{info}</div>}
        {data && !data.ready && <div className="card text-amber-800 bg-amber-50">جداول ساعات المشاريع لسه ماتطبّقتش على قاعدة البيانات (ترحيلات 171 لحد 174).</div>}

        {data?.ready && (
          <div className="card space-y-4" data-timesheet-week>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button type="button" className="btn-secondary" onClick={() => { setForm(emptyForm()); setWeek(shift(data.weekStart, -7)) }}>الأسبوع اللي قبله</button>
                <span className="font-semibold text-gray-800" dir="ltr">{data.weekStart} ← {shift(data.weekStart, 6)}</span>
                <button type="button" className="btn-secondary disabled:opacity-50" disabled={shift(data.weekStart, 7) > data.today} onClick={() => { setForm(emptyForm()); setWeek(shift(data.weekStart, 7)) }}>اللي بعده</button>
              </div>
              <div className="flex items-center gap-3">
                <span className={data.status === 'APPROVED' ? 'text-green-700' : data.status === 'REJECTED' ? 'text-red-700' : 'text-amber-700'}>{data.statusLabel} · {clock(data.totalMinutes)}</span>
                {data.editable && <button type="button" className="btn-primary disabled:opacity-50" disabled={busy || data.totalMinutes === 0} onClick={submit}>إرسال للاعتماد</button>}
                {data.status === 'SUBMITTED' && <button type="button" className="btn-secondary disabled:opacity-50" disabled={busy} onClick={recall}>سحب</button>}
              </div>
            </div>
            {data.decisionNote && <p className="text-sm text-gray-600">ملاحظة المدير: {data.decisionNote}</p>}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="table-header text-start">اليوم</th>
                    <th className="table-header text-start">المشروع والمهمة</th>
                    <th className="table-header text-center">المسجّل</th>
                    <th className="table-header text-center">الحضور</th>
                  </tr>
                </thead>
                <tbody>
                  {data.days.map((day) => {
                    const lines = data.entries.filter((line) => line.workDate === day.date)
                    return (
                      <tr key={day.date} className="border-t border-gray-100 align-top">
                        <td className="table-cell whitespace-nowrap">{dayName(day.date)} <span className="text-xs text-gray-500" dir="ltr">{day.date}</span></td>
                        <td className="table-cell">
                          {lines.length === 0 ? <span className="text-gray-400">—</span> : lines.map((line) => (
                            <div key={line.id} className="flex flex-wrap gap-2">
                              <span>{line.clientName} · {line.projectName}{line.taskName ? ` · ${line.taskName}` : ''}</span>
                              <span dir="ltr" className="text-gray-600">{clock(line.minutes)}</span>
                              {line.note && <span className="text-gray-500">{line.note}</span>}
                              {data.editable && <button type="button" className="text-red-600 text-xs" disabled={busy} onClick={() => remove(line)}>شيل</button>}
                            </div>
                          ))}
                        </td>
                        <td className="table-cell text-center" dir="ltr">{clock(day.loggedMinutes)}</td>
                        <td className="table-cell text-center" dir="ltr">{clock(day.attendanceMinutes)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {data.editable && (data.projects.length === 0 ? <p className="text-sm text-gray-500">مفيش مشاريع متاحة لفرعك لسه.</p> : (
              <div className="flex flex-wrap items-end gap-3 bg-gray-50 rounded-xl p-3" data-timesheet-entry-form>
                <label className="text-sm text-gray-600">اليوم
                  <select className="input mt-1" value={form.workDate} onChange={(event) => setForm({ ...form, workDate: event.target.value })}>
                    {data.days.filter((day) => day.date <= data.today).map((day) => <option key={day.date} value={day.date}>{dayName(day.date)} {day.date}</option>)}
                  </select>
                </label>
                <label className="text-sm text-gray-600">المشروع
                  <select className="input mt-1" value={form.projectId} onChange={(event) => setForm({ ...form, projectId: event.target.value, taskId: '' })}>
                    <option value="">اختار</option>
                    {data.projects.map((row) => <option key={row.id} value={row.id}>{row.clientName} · {row.name}</option>)}
                  </select>
                </label>
                {project && project.tasks.length > 0 && (
                  <label className="text-sm text-gray-600">المهمة
                    <select className="input mt-1" value={form.taskId} onChange={(event) => setForm({ ...form, taskId: event.target.value })}>
                      <option value="">من غير مهمة</option>
                      {project.tasks.map((task) => <option key={task.id} value={task.id}>{task.name}</option>)}
                    </select>
                  </label>
                )}
                <label className="text-sm text-gray-600">الساعات
                  <input className="input mt-1 w-24 text-center" dir="ltr" inputMode="decimal" placeholder="2.5" value={form.hours} onChange={(event) => setForm({ ...form, hours: event.target.value })} />
                </label>
                <label className="flex-1 min-w-44 text-sm text-gray-600">ملاحظة
                  <input className="input w-full mt-1" maxLength={300} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
                </label>
                <button type="button" className="btn-primary disabled:opacity-50" disabled={busy} onClick={add}>تسجيل</button>
              </div>
            ))}
          </div>
        )}

        {team.length > 0 && (
          <div className="card space-y-4" data-timesheet-team>
            <h2 className="text-lg font-semibold text-gray-800">ساعات فريقي</h2>
            {team.map((row) => (
              <div key={row.id} className="border-t border-gray-100 pt-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-gray-800">{row.fullName}{row.employeeCode ? <span className="text-xs text-gray-500" dir="ltr"> · {row.employeeCode}</span> : null} — أسبوع <span dir="ltr">{row.weekStart}</span></span>
                  <span className={row.status === 'APPROVED' ? 'text-green-700' : row.status === 'REJECTED' ? 'text-red-700' : 'text-amber-700'}>{row.statusLabel} · {clock(row.totalMinutes)}</span>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                  {row.days.map((day) => <span key={day.date}>{dayName(day.date)}: <span dir="ltr">{clock(day.loggedMinutes)}</span> / حضور <span dir="ltr">{clock(day.attendanceMinutes)}</span></span>)}
                </div>
                <ul className="text-sm space-y-1">
                  {row.lines.map((line) => <li key={line.id}><span dir="ltr" className="text-gray-500">{line.workDate}</span> · {line.clientName} · {line.projectName}{line.taskName ? ` · ${line.taskName}` : ''} · <span dir="ltr">{clock(line.minutes)}</span>{line.note ? ` — ${line.note}` : ''}</li>)}
                </ul>
                {row.canDecide ? (
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="flex-1 min-w-52 text-sm text-gray-600">ملاحظة (مطلوبة عند الرفض)
                      <input className="input w-full mt-1" maxLength={300} value={notes[row.id] ?? ''} onChange={(event) => setNotes({ ...notes, [row.id]: event.target.value })} />
                    </label>
                    <button type="button" className="btn-primary disabled:opacity-50" disabled={busy} onClick={() => decide(row, 'APPROVE')}>اعتماد</button>
                    <button type="button" className="btn-secondary disabled:opacity-50" disabled={busy || (notes[row.id] ?? '').trim().length < 3} onClick={() => decide(row, 'REJECT')}>رفض</button>
                  </div>
                ) : row.decisionNote ? <p className="text-sm text-gray-600">الملاحظة: {row.decisionNote}</p> : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
