'use client'

// B5.10 (أ): «تقييم 360» — الموظف بيرشّح زملاء من فرعه لدورة مفتوحة وبيرد على الدعوات اللي عليه؛ والمدير المباشر بيعتمد ترشيحات فريقه وبيقرا النتيجة
// بعد قفل الدورة (بحد أدنى للردود). الرد مابيتربطش بصاحبه. ميزة performance.feedback360 (مقفولة افتراضيًا).
import { useCallback, useEffect, useState } from 'react'
import { Target } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { apiFetch } from '@/lib/api'

interface Mine {
  ready: boolean; peersMax: number; cycles: Array<{ id: number; name: string }>
  nominations: Array<{ id: number; cycleId: number; reviewerName: string; status: string; statusLabel: string }>
  colleagues: Array<{ id: number; fullName: string }>
  toGive: Array<{ id: number; cycleName: string; subjectName: string; relationLabel: string }>
}
interface Team {
  ready: boolean; canManage: boolean
  pending: Array<{ id: number; cycleName: string; subjectName: string; reviewerName: string }>
  people: Array<{ cycleId: number; cycleName: string; cycleStatus: string; employeeId: number; fullName: string }>
}
interface Summary { relation: string; label: string; hidden: boolean; count: number | null; average: number | null; strengths: string[]; improvements: string[] }
interface Results { cycleName: string; employeeName: string; minGroup: number; closed: boolean; summaries: Summary[] }
const B = '/performance/feedback360'
const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })

export default function Feedback360Page() {
  const [mine, setMine] = useState<Mine | null>(null)
  const [team, setTeam] = useState<Team | null>(null)
  const [results, setResults] = useState<Results | null>(null)
  const [cycleId, setCycleId] = useState('')
  const [picked, setPicked] = useState<number[]>([])
  const [answers, setAnswers] = useState<Record<number, { rating: string; strengths: string; improvements: string }>>({})
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    apiFetch<Mine>(`${B}/my`).then((data) => { setMine(data); setCycleId((current) => current || (data.cycles[0] ? String(data.cycles[0].id) : '')) }).catch(() => setMine(null))
    apiFetch<Team>(`${B}/team`).then(setTeam).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل تقييم 360'))
  }, [])
  useEffect(load, [load])

  async function run(work: () => Promise<unknown>, done: string) {
    setBusy(true); setError(''); setInfo('')
    try { await work(); if (done) setInfo(done); load() } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر تنفيذ الطلب') } finally { setBusy(false) }
  }
  const nominate = () => run(async () => { await apiFetch(`${B}/my/nominations`, json('POST', { cycleId: Number(cycleId), reviewerEmployeeIds: picked })); setPicked([]) }, 'اتبعتت الترشيحات لمديرك')
  const answerOf = (id: number) => answers[id] ?? { rating: '', strengths: '', improvements: '' }
  const respond = (id: number) => {
    const answer = answerOf(id)
    if (!answer.rating) return setError('اختار الدرجة')
    return run(() => apiFetch(`${B}/invites/${id}/respond`, json('POST', { rating: Number(answer.rating), strengths: answer.strengths.trim() || undefined, improvements: answer.improvements.trim() || undefined })), 'اتسجّل ردك — من غير اسمك')
  }
  const decide = (id: number, action: 'APPROVE' | 'REJECT') => run(() => apiFetch(`${B}/invites/${id}/decision`, json('POST', { action })), action === 'APPROVE' ? 'اتعتمد الترشيح' : 'اترفض الترشيح')
  const openUpward = (row: Team['people'][number]) => run(async () => {
    const result = await apiFetch<{ invited: number; total: number }>(`${B}/upward`, json('POST', { cycleId: row.cycleId, subjectEmployeeId: row.employeeId }))
    setInfo(`اتدعى ${result.invited} من ${result.total} مرؤوس مباشر`)
  }, '')
  const show = (row: Team['people'][number]) => run(async () => setResults(await apiFetch<Results>(`${B}/results?cycleId=${row.cycleId}&employeeId=${row.employeeId}`)), '')
  const ready = mine?.ready ?? team?.ready ?? true
  const myNominations = mine?.nominations.filter((row) => String(row.cycleId) === cycleId) ?? []

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Target size={24} className="text-primary-600" />
            تقييم 360
          </h1>
          <p className="text-gray-500 mt-1">رشّح زملاء يقيّموك، ورد على الدعوات اللي عليك. ردك بيتسجّل من غير اسمك، والنتيجة بتتعرض للمدير بعد قفل الدورة ولو الردود 3 أو أكتر.</p>
        </div>

        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        {info && <div role="status" className="bg-green-50 text-green-700 rounded-xl p-4">{info}</div>}
        {!ready && <div className="card text-amber-800 bg-amber-50">جداول تقييم 360 لسه ماتطبّقتش على قاعدة البيانات (ترحيلي 176 و177).</div>}

        {mine?.ready && mine.toGive.length > 0 && (
          <div className="card space-y-3" data-feedback-to-give>
            <h2 className="text-lg font-semibold text-gray-800">دعوات عليك ترد عليها</h2>
            {mine.toGive.map((row) => {
              const answer = answerOf(row.id), change = (patch: Partial<typeof answer>) => setAnswers({ ...answers, [row.id]: { ...answer, ...patch } })
              return (
                <div key={row.id} className="border-t border-gray-100 pt-3 space-y-2">
                  <div className="font-medium text-gray-800">{row.subjectName} <span className="text-xs text-gray-500">· {row.cycleName} · {row.relationLabel}</span></div>
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="text-sm text-gray-600">الدرجة
                      <select className="input mt-1" value={answer.rating} onChange={(event) => change({ rating: event.target.value })}>
                        <option value="">اختار</option>
                        {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
                      </select>
                    </label>
                    <label className="flex-1 min-w-52 text-sm text-gray-600">نقاط القوة
                      <input className="input w-full mt-1" maxLength={1000} value={answer.strengths} onChange={(event) => change({ strengths: event.target.value })} />
                    </label>
                    <label className="flex-1 min-w-52 text-sm text-gray-600">نقاط التحسين
                      <input className="input w-full mt-1" maxLength={1000} value={answer.improvements} onChange={(event) => change({ improvements: event.target.value })} />
                    </label>
                    <button type="button" className="btn-primary disabled:opacity-50" disabled={busy} onClick={() => respond(row.id)}>إرسال</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {mine?.ready && mine.cycles.length > 0 && (
          <div className="card space-y-3" data-feedback-nominate>
            <h2 className="text-lg font-semibold text-gray-800">ترشيح زملاء لتقييمي</h2>
            <label className="text-sm text-gray-600">الدورة
              <select className="input mt-1" value={cycleId} onChange={(event) => { setCycleId(event.target.value); setPicked([]) }}>
                {mine.cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>{cycle.name}</option>)}
              </select>
            </label>
            {myNominations.length > 0 && <ul className="text-sm space-y-1">{myNominations.map((row) => <li key={row.id}>{row.reviewerName} — <span className={row.status === 'APPROVED' ? 'text-green-700' : row.status === 'REJECTED' ? 'text-red-700' : 'text-amber-700'}>{row.statusLabel}</span></li>)}</ul>}
            <div className="flex flex-wrap gap-2">
              {mine.colleagues.map((person) => (
                <label key={person.id} className="flex items-center gap-1 text-sm bg-gray-50 rounded-lg px-2 py-1 border border-gray-200">
                  <input type="checkbox" checked={picked.includes(person.id)} onChange={() => setPicked(picked.includes(person.id) ? picked.filter((id) => id !== person.id) : [...picked, person.id])} />{person.fullName}
                </label>
              ))}
            </div>
            <button type="button" className="btn-primary disabled:opacity-50" disabled={busy || picked.length === 0 || picked.length > mine.peersMax} onClick={nominate}>ترشيح (لحد {mine.peersMax})</button>
          </div>
        )}

        {team?.ready && team.pending.length > 0 && (
          <div className="card space-y-2" data-feedback-pending>
            <h2 className="text-lg font-semibold text-gray-800">ترشيحات مستنية قرارك</h2>
            <ul className="text-sm space-y-1">
              {team.pending.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-1">
                  <span className="flex-1 min-w-52">{row.subjectName} رشّح {row.reviewerName} <span className="text-xs text-gray-500">· {row.cycleName}</span></span>
                  <button type="button" className="text-green-700 text-xs" disabled={busy} onClick={() => decide(row.id, 'APPROVE')}>اعتماد</button>
                  <button type="button" className="text-red-600 text-xs" disabled={busy} onClick={() => decide(row.id, 'REJECT')}>رفض</button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {team?.ready && team.people.length > 0 && (
          <div className="card space-y-2" data-feedback-people>
            <h2 className="text-lg font-semibold text-gray-800">نتايج الفريق</h2>
            <ul className="text-sm space-y-1">
              {team.people.map((row) => (
                <li key={`${row.cycleId}-${row.employeeId}`} className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-1">
                  <span className="flex-1 min-w-52">{row.fullName} <span className="text-xs text-gray-500">· {row.cycleName} · {row.cycleStatus === 'CLOSED' ? 'مقفولة' : 'مفتوحة'}</span></span>
                  {team.canManage && row.cycleStatus === 'ACTIVE' && <button type="button" className="text-primary-600 text-xs" disabled={busy} onClick={() => openUpward(row)}>فتح تقييم مرؤوسيه له</button>}
                  {row.cycleStatus === 'CLOSED' && <button type="button" className="text-primary-600 text-xs" disabled={busy} onClick={() => show(row)}>النتيجة</button>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {results && (
          <div className="card space-y-3" data-feedback-results>
            <h2 className="text-lg font-semibold text-gray-800">نتيجة {results.employeeName} — {results.cycleName}</h2>
            {results.summaries.map((summary) => (
              <div key={summary.relation} className="border-t border-gray-100 pt-2 text-sm">
                <div className="font-medium text-gray-800">{summary.label}</div>
                {summary.hidden ? <p className="text-gray-500">الردود أقل من {results.minGroup} — مابتتعرضش حفاظًا على السرية.</p> : (
                  <div className="space-y-1">
                    <p>المتوسط <span dir="ltr">{summary.average}</span> من 5 · {summary.count} رد</p>
                    {summary.strengths.length > 0 && <div><span className="text-gray-600">نقاط القوة:</span><ul className="list-disc ps-5">{summary.strengths.map((text, index) => <li key={index}>{text}</li>)}</ul></div>}
                    {summary.improvements.length > 0 && <div><span className="text-gray-600">نقاط التحسين:</span><ul className="list-disc ps-5">{summary.improvements.map((text, index) => <li key={index}>{text}</li>)}</ul></div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
