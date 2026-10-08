'use client'

// B5.7: «السلامة وإصابات العمل» — سجل حوادث نطاق الحساب: التصنيف والتحقيق والقفل، والإجراءات التصحيحية ومهمة إبلاغ الجهة (مهام في «المهام»)،
// وربط الحادث بإجازة المصاب. موديول safety (مقفول افتراضيًا) بصلاحية safety.manage.
import { useCallback, useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { apiFetch } from '@/lib/api'

interface Person { id: number | null; fullName: string; employeeCode: string | null }
interface Option { code: string; label: string }
interface IncidentRow {
  id: number; code: string; kind: string; kindLabel: string; occurredOn: string; location: string; severity: string | null; severityLabel: string | null; lostDays: number | null
  status: string; statusLabel: string; reporter: Person | null; injured: Person | null; injuredNote: string | null
}
interface SafetyList {
  ready: boolean; kinds: Option[]; severities: Option[]; incidents: IncidentRow[]
  summary: { open: number; injuriesThisYear: number; lostDaysThisYear: number }
  people: Array<{ id: number; fullName: string; employeeCode: string | null }>
}
interface TaskView { taskId: number; title: string; status: string; statusLabel: string; dueDate: string | null; open: boolean; assignee: Person | null; assigneeRole: string | null }
interface LeaveView { id: number; leaveTypeCode: string; fromDate: string; toDate: string; days: number; status: string }
interface Detail {
  id: number; code: string; kindLabel: string; occurredOn: string; location: string; description: string; severity: string | null; lostDays: number | null; rootCause: string | null
  status: string; statusLabel: string; reporter: Person | null; injured: Person | null; injuredNote: string | null
  actions: TaskView[]; authorityTask: TaskView | null; leave: LeaveView | null; leaveOptions: LeaveView[]; nextStatuses: Option[]
}
const B = '/safety/incidents'
const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })
const nameOf = (person: Person | null, note?: string | null) => person ? `${person.fullName}${person.employeeCode ? ` · ${person.employeeCode}` : ''}` : note || '—'
const STEP_LABELS: Record<string, string> = { INVESTIGATING: 'بدء التحقيق', CLOSED: 'قفل الحادث' }

export default function SafetyPage() {
  const [data, setData] = useState<SafetyList | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [review, setReview] = useState({ severity: '', injuredEmployeeId: '', lostDays: '', rootCause: '' })
  const [action, setAction] = useState({ title: '', assigneeEmployeeId: '', dueDate: '' })
  const [authorityDue, setAuthorityDue] = useState('')

  const load = useCallback(() => {
    apiFetch<SafetyList>(B).then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل سجل الحوادث'))
  }, [])
  useEffect(load, [load])

  const open = useCallback(async (id: number) => {
    try {
      const result = await apiFetch<Detail>(`${B}/${id}`)
      setDetail(result)
      setReview({ severity: result.severity ?? '', injuredEmployeeId: result.injured?.id ? String(result.injured.id) : '', lostDays: result.lostDays === null ? '' : String(result.lostDays), rootCause: result.rootCause ?? '' })
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر تحميل الحادث') }
  }, [])

  async function run(work: () => Promise<unknown>, done: string) {
    if (!detail) return
    setBusy(true); setError(''); setInfo('')
    try { await work(); setInfo(done); load(); await open(detail.id) } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر الحفظ') } finally { setBusy(false) }
  }
  const saveReview = () => run(() => apiFetch(`${B}/${detail!.id}`, json('PATCH', { severity: review.severity || null, injuredEmployeeId: review.injuredEmployeeId ? Number(review.injuredEmployeeId) : null,
    lostDays: review.lostDays.trim() === '' ? null : Number(review.lostDays), rootCause: review.rootCause.trim() || null })), 'اتحفظت المراجعة')
  const step = (status: string) => run(() => apiFetch(`${B}/${detail!.id}/status`, json('POST', { status })), 'اتغيّرت حالة الحادث')
  const addAction = () => run(async () => {
    await apiFetch(`${B}/${detail!.id}/actions`, json('POST', { title: action.title.trim(), assigneeEmployeeId: Number(action.assigneeEmployeeId), dueDate: action.dueDate }))
    setAction({ title: '', assigneeEmployeeId: '', dueDate: '' })
  }, 'اتفتحت مهمة الإجراء')
  const openAuthority = () => run(() => apiFetch(`${B}/${detail!.id}/authority-task`, json('POST', { dueDate: authorityDue })), 'اتفتحت مهمة إبلاغ الجهة')
  const linkLeave = (leaveId: number | null) => run(() => apiFetch(`${B}/${detail!.id}/leave`, json('PUT', { leaveId })), leaveId === null ? 'اتفك ربط الإجازة' : 'اتربطت الإجازة')

  const closed = detail?.status === 'CLOSED'
  // المصاب المتسجّل لو مش في قايمة الاختيار (برّه النطاق أو مش على رأس العمل) بيفضل ظاهر كاختيار
  const injuredMissing = !!detail?.injured?.id && !data?.people.some((row) => row.id === detail.injured!.id)

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ShieldCheck size={24} className="text-primary-600" />
            السلامة وإصابات العمل
          </h1>
          <p className="text-gray-500 mt-1">سجل الحوادث في فروعك: التصنيف والتحقيق، والإجراءات التصحيحية ومهمة إبلاغ الجهة بتتفتح مهام بمواعيدها.</p>
        </div>

        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        {info && <div role="status" className="bg-green-50 text-green-700 rounded-xl p-4">{info}</div>}
        {data && !data.ready && <div className="card text-amber-800 bg-amber-50">جداول السلامة لسه ماتطبّقتش على قاعدة البيانات (ترحيلي 169 و170).</div>}

        {data?.ready && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" data-safety-summary>
            <div className="card"><div className="text-sm text-gray-500">حوادث مفتوحة</div><div className="text-2xl font-bold text-gray-800">{data.summary.open}</div></div>
            <div className="card"><div className="text-sm text-gray-500">إصابات السنة دي</div><div className="text-2xl font-bold text-gray-800">{data.summary.injuriesThisYear}</div></div>
            <div className="card"><div className="text-sm text-gray-500">أيام مفقودة السنة دي</div><div className="text-2xl font-bold text-gray-800">{data.summary.lostDaysThisYear}</div></div>
          </div>
        )}

        {data?.ready && (
          <div className="card space-y-3" data-safety-incidents>
            <h2 className="text-lg font-semibold text-gray-800">سجل الحوادث</h2>
            {data.incidents.length === 0 ? <p className="text-gray-500">مفيش حوادث متسجّلة.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="table-header text-right">الرقم</th>
                      <th className="table-header text-right">النوع</th>
                      <th className="table-header text-center">التاريخ</th>
                      <th className="table-header text-right">المكان</th>
                      <th className="table-header text-right">المصاب</th>
                      <th className="table-header text-center">الشدة</th>
                      <th className="table-header text-center">الحالة</th>
                      <th className="table-header" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.incidents.map((row) => (
                      <tr key={row.id} className={`border-t border-gray-100 ${detail?.id === row.id ? 'bg-primary-50' : ''}`}>
                        <td className="table-cell font-mono" dir="ltr">{row.code}</td>
                        <td className="table-cell">{row.kindLabel}</td>
                        <td className="table-cell text-center" dir="ltr">{row.occurredOn}</td>
                        <td className="table-cell">{row.location}</td>
                        <td className="table-cell">{nameOf(row.injured, row.injuredNote)}</td>
                        <td className="table-cell text-center">{row.severityLabel ?? '—'}</td>
                        <td className={`table-cell text-center ${row.status === 'CLOSED' ? 'text-gray-500' : 'text-amber-700'}`}>{row.statusLabel}</td>
                        <td className="table-cell text-left"><button type="button" className="text-primary-600 text-xs" onClick={() => open(row.id)}>فتح</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {detail && data && (
          <div className="card space-y-4" data-safety-detail>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-gray-800">الحادث <span className="font-mono" dir="ltr">{detail.code}</span> — {detail.kindLabel} · {detail.statusLabel}</h2>
              <div className="flex gap-2">
                {detail.nextStatuses.map((next) => (
                  <button key={next.code} type="button" className={next.code === 'CLOSED' ? 'btn-primary disabled:opacity-50' : 'btn-secondary disabled:opacity-50'} disabled={busy} onClick={() => step(next.code)}>
                    {closed ? 'فتح التحقيق تاني' : STEP_LABELS[next.code] ?? next.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div><span dir="ltr">{detail.occurredOn}</span> · {detail.location} · المبلّغ: {nameOf(detail.reporter)}</div>
              <p className="text-gray-800 whitespace-pre-wrap">{detail.description}</p>
            </div>

            <div className="flex flex-wrap items-end gap-3 bg-gray-50 rounded-xl p-3" data-safety-review>
              <label className="text-sm text-gray-600">الشدة
                <select className="input mt-1" disabled={closed} value={review.severity} onChange={(event) => setReview({ ...review, severity: event.target.value })}>
                  <option value="">—</option>
                  {data.severities.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
                </select>
              </label>
              <label className="text-sm text-gray-600">المصاب{detail.injuredNote ? ` (المبلّغ كتب: ${detail.injuredNote})` : ''}
                <select className="input mt-1" disabled={closed} value={review.injuredEmployeeId} onChange={(event) => setReview({ ...review, injuredEmployeeId: event.target.value })}>
                  <option value="">—</option>
                  {injuredMissing && <option value={detail.injured!.id!}>{detail.injured!.fullName}</option>}
                  {data.people.map((row) => <option key={row.id} value={row.id}>{row.fullName}{row.employeeCode ? ` · ${row.employeeCode}` : ''}</option>)}
                </select>
              </label>
              <label className="text-sm text-gray-600">أيام مفقودة
                <input className="input mt-1 w-24 text-center" dir="ltr" inputMode="numeric" disabled={closed} value={review.lostDays} onChange={(event) => setReview({ ...review, lostDays: event.target.value })} />
              </label>
              <label className="flex-1 min-w-64 text-sm text-gray-600">السبب
                <input className="input w-full mt-1" maxLength={1000} disabled={closed} value={review.rootCause} onChange={(event) => setReview({ ...review, rootCause: event.target.value })} />
              </label>
              {!closed && <button type="button" className="btn-primary disabled:opacity-50" disabled={busy} onClick={saveReview}>حفظ</button>}
            </div>

            <div className="space-y-2" data-safety-actions>
              <h3 className="font-semibold text-gray-800">الإجراءات التصحيحية</h3>
              {detail.actions.length === 0 ? <p className="text-sm text-gray-500">مفيش إجراءات لسه.</p> : (
                <ul className="text-sm space-y-1">
                  {detail.actions.map((item) => (
                    <li key={item.taskId} className="flex flex-wrap gap-2 border-t border-gray-100 pt-1">
                      <span className="flex-1 min-w-48">{item.title}</span>
                      <span className="text-gray-600">{nameOf(item.assignee)}</span>
                      <span dir="ltr" className="text-gray-500">{item.dueDate ?? '—'}</span>
                      <span className={item.open ? 'text-amber-700' : 'text-green-700'}>{item.statusLabel}</span>
                    </li>
                  ))}
                </ul>
              )}
              {!closed && (
                <div className="flex flex-wrap items-end gap-3">
                  <label className="flex-1 min-w-52 text-sm text-gray-600">إجراء جديد
                    <input className="input w-full mt-1" maxLength={150} value={action.title} onChange={(event) => setAction({ ...action, title: event.target.value })} />
                  </label>
                  <label className="text-sm text-gray-600">المسؤول
                    <select className="input mt-1" value={action.assigneeEmployeeId} onChange={(event) => setAction({ ...action, assigneeEmployeeId: event.target.value })}>
                      <option value="">اختار</option>
                      {data.people.map((row) => <option key={row.id} value={row.id}>{row.fullName}{row.employeeCode ? ` · ${row.employeeCode}` : ''}</option>)}
                    </select>
                  </label>
                  <label className="text-sm text-gray-600">الموعد
                    <input type="date" className="input mt-1" value={action.dueDate} onChange={(event) => setAction({ ...action, dueDate: event.target.value })} />
                  </label>
                  <button type="button" className="btn-secondary disabled:opacity-50" disabled={busy || action.title.trim().length < 3 || !action.assigneeEmployeeId || !action.dueDate} onClick={addAction}>فتح مهمة</button>
                </div>
              )}
            </div>

            <div className="space-y-2" data-safety-authority>
              <h3 className="font-semibold text-gray-800">إبلاغ الجهة المختصة</h3>
              {detail.authorityTask && (
                <p className="text-sm">{detail.authorityTask.title} · <span dir="ltr">{detail.authorityTask.dueDate ?? '—'}</span> · <span className={detail.authorityTask.open ? 'text-amber-700' : 'text-green-700'}>{detail.authorityTask.statusLabel}</span></p>
              )}
              {!closed && (!detail.authorityTask || detail.authorityTask.status === 'CANCELLED') && (
                <div className="flex flex-wrap items-end gap-3">
                  <label className="text-sm text-gray-600">موعد الإبلاغ (حسب مهلة الجهة)
                    <input type="date" className="input mt-1" value={authorityDue} onChange={(event) => setAuthorityDue(event.target.value)} />
                  </label>
                  <button type="button" className="btn-secondary disabled:opacity-50" disabled={busy || !authorityDue} onClick={openAuthority}>فتح مهمة الإبلاغ للموارد البشرية</button>
                </div>
              )}
            </div>

            <div className="space-y-2" data-safety-leave>
              <h3 className="font-semibold text-gray-800">إجازة المصاب</h3>
              {detail.leave ? (
                <p className="text-sm">
                  مربوط بإجازة <span dir="ltr">{detail.leave.fromDate} ← {detail.leave.toDate}</span> ({detail.leave.days} يوم){detail.leave.status !== 'APPROVED' ? ' — الإجازة اتلغت' : ''}
                  {!closed && <button type="button" className="text-red-600 text-xs mr-3" disabled={busy} onClick={() => linkLeave(null)}>فك الربط</button>}
                </p>
              ) : detail.leaveOptions.length === 0 ? <p className="text-sm text-gray-500">مفيش إجازة معتمدة للمصاب من يوم الحادث.</p> : !closed && (
                <ul className="text-sm space-y-1">
                  {detail.leaveOptions.map((leave) => (
                    <li key={leave.id} className="flex flex-wrap gap-3">
                      <span dir="ltr">{leave.fromDate} ← {leave.toDate}</span><span>{leave.days} يوم</span>
                      <button type="button" className="text-primary-600 text-xs" disabled={busy} onClick={() => linkLeave(leave.id)}>ربط بالحادث</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
