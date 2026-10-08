'use client'

// B5.10 (ب): «اجتماعات 1:1» — المدير المباشر بيحدد اجتماع مع مرؤوسه؛ الطرفين بيعدّلوا الأجندة، والمدير بيكتب الملاحظات ويفتح مهام متابعة ويقفل.
// الاجتماع بيظهر في تقويم الطرفين. ميزة performance.one_on_one (مقفولة افتراضيًا).
import { useCallback, useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { apiFetch } from '@/lib/api'

interface Meeting {
  id: number; role: 'MANAGER' | 'EMPLOYEE'; withName: string; meetingDate: string; meetingTime: string | null; agenda: string | null; notes: string | null; status: string; statusLabel: string
  actions: Array<{ taskId: number; title: string; dueDate: string | null; open: boolean; mine: boolean }>
}
interface Data { ready: boolean; reports: Array<{ id: number; fullName: string }>; meetings: Meeting[] }
const B = '/performance/one-on-ones'
const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })

export default function OneOnOnesPage() {
  const [data, setData] = useState<Data | null>(null)
  const [form, setForm] = useState({ employeeId: '', meetingDate: '', meetingTime: '', agenda: '' })
  const [drafts, setDrafts] = useState<Record<number, { agenda: string; notes: string; title: string; assignee: string; dueDate: string }>>({})
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    apiFetch<Data>(B).then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل الاجتماعات'))
  }, [])
  useEffect(load, [load])

  async function run(work: () => Promise<unknown>, done: string) {
    setBusy(true); setError(''); setInfo('')
    try { await work(); setInfo(done); load() } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر الحفظ') } finally { setBusy(false) }
  }
  const create = () => run(async () => {
    await apiFetch(B, json('POST', { employeeId: Number(form.employeeId), meetingDate: form.meetingDate, meetingTime: form.meetingTime || null, agenda: form.agenda.trim() || undefined }))
    setForm({ employeeId: '', meetingDate: '', meetingTime: '', agenda: '' })
  }, 'اتحدد الاجتماع')
  const draftOf = (row: Meeting) => drafts[row.id] ?? { agenda: row.agenda ?? '', notes: row.notes ?? '', title: '', assignee: 'EMPLOYEE', dueDate: '' }
  const change = (row: Meeting, patch: Partial<ReturnType<typeof draftOf>>) => setDrafts({ ...drafts, [row.id]: { ...draftOf(row), ...patch } })
  const forget = (id: number) => setDrafts((current) => { const next = { ...current }; delete next[id]; return next })
  const update = (row: Meeting, body: Record<string, unknown>, done: string) => run(async () => { await apiFetch(`${B}/${row.id}`, json('PATCH', body)); forget(row.id) }, done)
  const addAction = (row: Meeting) => { const draft = draftOf(row)
    return run(async () => { await apiFetch(`${B}/${row.id}/actions`, json('POST', { title: draft.title.trim(), assignee: draft.assignee, dueDate: draft.dueDate })); forget(row.id) }, 'اتفتحت مهمة المتابعة') }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users size={24} className="text-primary-600" />
            اجتماعات 1:1
          </h1>
          <p className="text-gray-500 mt-1">اجتماعاتك مع مديرك ومع فريقك: أجندة مشتركة، وملاحظات، ومهام متابعة. الاجتماع بيظهر في التقويم.</p>
        </div>

        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        {info && <div role="status" className="bg-green-50 text-green-700 rounded-xl p-4">{info}</div>}
        {data && !data.ready && <div className="card text-amber-800 bg-amber-50">جداول اجتماعات 1:1 لسه ماتطبّقتش على قاعدة البيانات (ترحيلي 178 و179).</div>}

        {data?.ready && data.reports.length > 0 && (
          <div className="card space-y-3" data-meeting-form>
            <h2 className="text-lg font-semibold text-gray-800">اجتماع جديد</h2>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm text-gray-600">الموظف
                <select className="input mt-1" value={form.employeeId} onChange={(event) => setForm({ ...form, employeeId: event.target.value })}>
                  <option value="">اختار</option>
                  {data.reports.map((person) => <option key={person.id} value={person.id}>{person.fullName}</option>)}
                </select>
              </label>
              <label className="text-sm text-gray-600">التاريخ
                <input type="date" className="input mt-1" value={form.meetingDate} onChange={(event) => setForm({ ...form, meetingDate: event.target.value })} />
              </label>
              <label className="text-sm text-gray-600">الوقت
                <input type="time" className="input mt-1" value={form.meetingTime} onChange={(event) => setForm({ ...form, meetingTime: event.target.value })} />
              </label>
              <label className="flex-1 min-w-52 text-sm text-gray-600">الأجندة
                <input className="input w-full mt-1" maxLength={1000} value={form.agenda} onChange={(event) => setForm({ ...form, agenda: event.target.value })} />
              </label>
              <button type="button" className="btn-primary disabled:opacity-50" disabled={busy || !form.employeeId || !form.meetingDate} onClick={create}>تحديد</button>
            </div>
          </div>
        )}

        {data?.ready && (
          <div className="card space-y-4" data-meetings>
            <h2 className="text-lg font-semibold text-gray-800">اجتماعاتي</h2>
            {data.meetings.length === 0 ? <p className="text-gray-500">مفيش اجتماعات لسه.</p> : data.meetings.map((row) => {
              const draft = draftOf(row), manager = row.role === 'MANAGER', scheduled = row.status === 'SCHEDULED'
              return (
                <div key={row.id} className="border-t border-gray-100 pt-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-gray-800">{manager ? 'مع' : 'مع مديري'} {row.withName} — <span dir="ltr">{row.meetingDate}{row.meetingTime ? ` ${row.meetingTime}` : ''}</span></span>
                    <span className={row.status === 'DONE' ? 'text-green-700' : row.status === 'CANCELLED' ? 'text-gray-400' : 'text-amber-700'}>{row.statusLabel}</span>
                  </div>
                  <label className="block text-sm text-gray-600">الأجندة
                    <textarea className="input w-full mt-1" rows={2} maxLength={1000} disabled={!scheduled} value={draft.agenda} onChange={(event) => change(row, { agenda: event.target.value })} />
                  </label>
                  {manager ? (
                    <label className="block text-sm text-gray-600">الملاحظات
                      <textarea className="input w-full mt-1" rows={2} maxLength={2000} value={draft.notes} onChange={(event) => change(row, { notes: event.target.value })} />
                    </label>
                  ) : row.notes ? <p className="text-sm text-gray-700 whitespace-pre-wrap">الملاحظات: {row.notes}</p> : null}
                  <div className="flex flex-wrap gap-2">
                    {scheduled && <button type="button" className="btn-secondary disabled:opacity-50" disabled={busy} onClick={() => update(row, { agenda: draft.agenda }, 'اتحفظت الأجندة')}>حفظ الأجندة</button>}
                    {manager && <button type="button" className="btn-secondary disabled:opacity-50" disabled={busy} onClick={() => update(row, { notes: draft.notes }, 'اتحفظت الملاحظات')}>حفظ الملاحظات</button>}
                    {manager && scheduled && <button type="button" className="btn-primary disabled:opacity-50" disabled={busy} onClick={() => update(row, { status: 'DONE' }, 'اتقفل الاجتماع')}>الاجتماع اتعمل</button>}
                    {manager && scheduled && <button type="button" className="text-red-600 text-xs" disabled={busy} onClick={() => update(row, { status: 'CANCELLED' }, 'اتلغى الاجتماع')}>إلغاء</button>}
                  </div>
                  {row.actions.length > 0 && <ul className="text-sm space-y-1">{row.actions.map((item) => <li key={item.taskId}>{item.title} · <span dir="ltr">{item.dueDate ?? '—'}</span> · <span className={item.open ? 'text-amber-700' : 'text-green-700'}>{item.open ? 'مفتوحة' : 'اتقفلت'}</span>{item.mine ? ' · عليّ' : ''}</li>)}</ul>}
                  {manager && row.status !== 'CANCELLED' && (
                    <div className="flex flex-wrap items-end gap-3 bg-gray-50 rounded-xl p-3">
                      <label className="flex-1 min-w-48 text-sm text-gray-600">مهمة متابعة
                        <input className="input w-full mt-1" maxLength={150} value={draft.title} onChange={(event) => change(row, { title: event.target.value })} />
                      </label>
                      <label className="text-sm text-gray-600">على
                        <select className="input mt-1" value={draft.assignee} onChange={(event) => change(row, { assignee: event.target.value })}>
                          <option value="EMPLOYEE">{row.withName}</option>
                          <option value="MANAGER">أنا</option>
                        </select>
                      </label>
                      <label className="text-sm text-gray-600">الموعد
                        <input type="date" className="input mt-1" value={draft.dueDate} onChange={(event) => change(row, { dueDate: event.target.value })} />
                      </label>
                      <button type="button" className="btn-secondary disabled:opacity-50" disabled={busy || draft.title.trim().length < 3 || !draft.dueDate} onClick={() => addAction(row)}>فتح مهمة</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
