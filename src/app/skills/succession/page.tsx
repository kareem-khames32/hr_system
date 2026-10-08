'use client'

// B5.4 (ب): «خطط الإحلال» — الوظائف الحرجة وخلفاؤها بترتيبهم ودرجة جاهزيتهم وفجوتهم عن مهارات الوظيفة. بيانات سرّية (succession.manage).
// موديول skills (مقفول افتراضيًا).
import { useCallback, useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import ModuleGate from '@/components/ModuleGate'
import NineBoxPanel from './NineBoxPanel'
import { fetchSuccession, nominateSuccessor, removeSuccessor, setCriticalPosition, updateSuccessor, type ApiSuccession, type Readiness } from '@/lib/skills-api'

export default function SuccessionPage() {
  const [data, setData] = useState<ApiSuccession | null>(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [reasons, setReasons] = useState<Record<number, string>>({})
  const [drafts, setDrafts] = useState<Record<number, { employeeId: string; readiness: Readiness; note: string }>>({})

  const load = useCallback(() => {
    fetchSuccession().then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل خطط الإحلال'))
  }, [])
  useEffect(load, [load])

  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true); setError(''); setInfo('')
    try { await action(); setInfo(done); load() } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر التنفيذ') } finally { setBusy(false) }
  }
  const mark = (positionId: number) => {
    const reason = (reasons[positionId] ?? '').trim()
    if (reason.length < 2) return setError('اكتب سبب اعتبار الوظيفة حرجة')
    return run(() => setCriticalPosition(positionId, true, reason), 'اتعلّمت الوظيفة «حرجة»')
  }
  const nominate = (positionId: number) => {
    const draft = drafts[positionId]
    if (!draft?.employeeId) return setError('اختار الموظف المرشح')
    return run(async () => {
      await nominateSuccessor(positionId, { employeeId: Number(draft.employeeId), readiness: draft.readiness, note: draft.note.trim() })
      setDrafts((current) => ({ ...current, [positionId]: { employeeId: '', readiness: 'ONE_TO_TWO', note: '' } }))
    }, 'اتسجّل الترشيح')
  }
  const critical = (data?.positions ?? []).filter((row) => row.critical), others = (data?.positions ?? []).filter((row) => !row.critical)

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Users size={24} className="text-primary-600" />
            خطط الإحلال
          </h1>
          <p className="text-gray-500 mt-1">الوظائف الحرجة ومين المرشح يخلف شاغلها. البيانات دي سرّية ومابتظهرش للموظف المرشح.</p>
        </div>

        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        {info && <div role="status" className="bg-green-50 text-green-700 rounded-xl p-4">{info}</div>}
        {data && !data.ready && <div className="card text-amber-800 bg-amber-50">جداول الإحلال لسه ماتطبّقتش على قاعدة البيانات (ترحيلي 158 و159).</div>}
        {data?.ready && critical.length === 0 && <div className="card text-gray-500">مفيش وظائف متعلّمة «حرجة» لسه.</div>}

        {critical.map((row) => {
          const draft = drafts[row.id] ?? { employeeId: '', readiness: 'ONE_TO_TWO' as Readiness, note: '' }
          const change = (patch: Partial<typeof draft>) => setDrafts((current) => ({ ...current, [row.id]: { ...draft, ...patch } }))
          return (
            <div key={row.id} className="card space-y-3" data-critical-position={row.id}>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-800">{row.title}</h2>
                <span className="text-xs text-gray-500 font-mono" dir="ltr">{row.code}</span>
                <span className="text-sm text-gray-600">{row.branchName ?? '—'}{row.departmentName ? ` / ${row.departmentName}` : ''}</span>
                <button type="button" className="mr-auto text-red-600 text-xs disabled:opacity-50" disabled={busy} onClick={() => run(() => setCriticalPosition(row.id, false), 'اتشالت علامة «حرجة»')}>شيل علامة «حرجة»</button>
              </div>
              <p className="text-sm text-gray-600">السبب: {row.reason ?? '—'} · الشاغل: {row.holders.length ? row.holders.join('، ') : 'شاغرة'}{row.hiddenHolders ? ` (+${row.hiddenHolders} خارج نطاقك)` : ''} · مهارات مطلوبة: {row.requirements}</p>
              {row.nominations.length === 0 ? <p className="text-amber-700 text-sm">مفيش خلفاء مرشحين للوظيفة دي.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="table-header text-center">الترتيب</th>
                        <th className="table-header text-right">المرشح</th>
                        <th className="table-header text-center">الجاهزية</th>
                        <th className="table-header text-center">فجوة المهارات</th>
                        <th className="table-header text-right">ملاحظة</th>
                        <th className="table-header text-right">رشّحه</th>
                        <th className="table-header" />
                      </tr>
                    </thead>
                    <tbody>
                      {row.nominations.map((item) => (
                        <tr key={item.id} className="border-t border-gray-100">
                          <td className="table-cell text-center">{item.rank}</td>
                          <td className="table-cell">{item.hidden ? <span className="text-gray-400">{item.fullName}</span> : <>{item.fullName}{item.employeeCode ? <span className="text-xs text-gray-500" dir="ltr"> · {item.employeeCode}</span> : null}</>}</td>
                          <td className="table-cell text-center">
                            <select className="input text-xs" aria-label={`جاهزية ${item.fullName}`} disabled={busy} value={item.readiness}
                              onChange={(event) => run(() => updateSuccessor(item.id, { readiness: event.target.value as Readiness, note: item.note ?? '' }), 'اتحدّثت الجاهزية')}>
                              {data!.readiness.map((level) => <option key={level.code} value={level.code}>{level.label}</option>)}
                            </select>
                          </td>
                          <td className="table-cell text-center">{item.gaps === null ? '—' : item.gaps === 0 ? <span className="text-green-700">مستوفي</span> : <span className="text-amber-700">{item.gaps} من {row.requirements}</span>}</td>
                          <td className="table-cell">{item.note ?? '—'}</td>
                          <td className="table-cell text-xs text-gray-500">{item.nominatedByName ?? '—'} · <span dir="ltr">{String(item.nominatedAt).slice(0, 10)}</span></td>
                          <td className="table-cell text-left"><button type="button" className="text-red-600 text-xs disabled:opacity-50" disabled={busy} onClick={() => run(() => removeSuccessor(item.id), 'اتشال المرشح')}>شيل</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex flex-wrap items-end gap-3 bg-gray-50 rounded-xl p-3" data-nomination-form>
                <label className="flex-1 min-w-48 text-sm text-gray-600">مرشح جديد
                  <select className="input w-full mt-1" value={draft.employeeId} onChange={(event) => change({ employeeId: event.target.value })}>
                    <option value="">اختار موظف</option>
                    {data!.candidates.map((person) => <option key={person.id} value={person.id}>{person.fullName}{person.employeeCode ? ` (${person.employeeCode})` : ''}</option>)}
                  </select>
                </label>
                <label className="text-sm text-gray-600">الجاهزية
                  <select className="input mt-1" value={draft.readiness} onChange={(event) => change({ readiness: event.target.value as Readiness })}>
                    {data!.readiness.map((level) => <option key={level.code} value={level.code}>{level.label}</option>)}
                  </select>
                </label>
                <label className="flex-1 min-w-40 text-sm text-gray-600">ملاحظة
                  <input className="input w-full mt-1" maxLength={300} value={draft.note} onChange={(event) => change({ note: event.target.value })} />
                </label>
                <button type="button" className="btn-primary disabled:opacity-50" disabled={busy} onClick={() => nominate(row.id)}>ترشيح</button>
              </div>
            </div>
          )
        })}

        {/* (ج) شبكة 9-box — ورا ميزتها الفرعية المقفولة افتراضيًا */}
        <ModuleGate feature="skills.nine_box"><NineBoxPanel /></ModuleGate>

        {data?.ready && others.length > 0 && (
          <div className="card space-y-3" data-other-positions>
            <h2 className="text-lg font-semibold text-gray-800">باقي الوظائف المعتمدة</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {others.map((row) => (
                    <tr key={row.id} className="border-t border-gray-100">
                      <td className="table-cell">{row.title}<span className="block text-xs text-gray-500 font-mono" dir="ltr">{row.code}</span></td>
                      <td className="table-cell">{row.branchName ?? '—'}{row.departmentName ? ` / ${row.departmentName}` : ''}</td>
                      <td className="table-cell">
                        <span className="inline-flex items-center gap-2">
                          <input className="input w-56 text-xs" maxLength={300} placeholder="سبب اعتبارها حرجة" aria-label={`سبب ${row.code}`} value={reasons[row.id] ?? ''} onChange={(event) => setReasons({ ...reasons, [row.id]: event.target.value })} />
                          <button type="button" className="btn-secondary text-xs disabled:opacity-50" disabled={busy} onClick={() => mark(row.id)}>علّمها «حرجة»</button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
