'use client'

// B5.1 (ب): «زيادات فريقي» — ورقة المدير: بيقترح زيادة شهرية لكل مرؤوس مباشر في الدورة المفتوحة، وبيشوف إجمالي اقتراحاته.
// المدير بيكتب المبلغ ومابيشوفش الراتب. الاقتراح مابيغيّرش راتب: بيتراجع وبيتعتمد الأول.
import { useCallback, useEffect, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { currencyLabel } from '@/lib/currency'
import { formatMoney } from '@/lib/money'
import { fetchMyRaises, proposeRaise, type ApiMyRaises } from '@/lib/compensation-api'

const amountOf = (text: string): number | null => (/^\d{1,7}(\.\d{1,2})?$/.test(text.trim()) ? Number(text.trim()) : null)
const keyOf = (cycleId: number, employeeId: number) => `${cycleId}:${employeeId}`

export default function MyRaisesPage() {
  const [data, setData] = useState<ApiMyRaises | null>(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, { amount: string; note: string }>>({})

  const load = useCallback(() => {
    fetchMyRaises().then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل ورقة الزيادات'))
  }, [])
  useEffect(load, [load])

  async function save(cycleId: number, employeeId: number, fullName: string) {
    const draft = drafts[keyOf(cycleId, employeeId)]
    const amount = draft ? amountOf(draft.amount) : null
    if (!draft || amount === null) return setError('اكتب مبلغ صحيح بمنزلتين بالكتير (الصفر = من غير زيادة)')
    setBusy(true); setError(''); setInfo('')
    try {
      setData(await proposeRaise(cycleId, employeeId, amount, draft.note.trim()))
      setDrafts((current) => { const next = { ...current }; delete next[keyOf(cycleId, employeeId)]; return next })
      setInfo(`اتحفظ اقتراح ${fullName}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر الحفظ')
    } finally {
      setBusy(false)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <TrendingUp size={24} className="text-primary-600" />
            زيادات فريقي
          </h1>
          <p className="text-gray-500 mt-1">اقترح الزيادة الشهرية لكل واحد من مرؤوسيك المباشرين. الاقتراح بيتراجع وبيتعتمد قبل ما أي راتب يتغيّر.</p>
        </div>

        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        {info && <div role="status" className="bg-green-50 text-green-700 rounded-xl p-4">{info}</div>}
        {data && data.cycles.length === 0 && <div className="card text-gray-500">مفيش دورة زيادات مفتوحة لفريقك دلوقتي.</div>}

        {(data?.cycles ?? []).map((cycle) => (
          <div key={cycle.id} className="card space-y-3" data-my-raises>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-800">{cycle.name}</h2>
              <span className="text-sm text-gray-600">يسري من راتب <span dir="ltr">{cycle.effectivePayrollPeriod}</span></span>
              <span className="mr-auto text-sm bg-gray-50 rounded-lg px-3 py-2">
                إجمالي اقتراحاتك في الشهر:{' '}
                {cycle.totals.map((total) => <b key={total.currency} className="font-mono mx-1">{formatMoney(total.amount)} {currencyLabel(total.currency)}</b>)}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="table-header text-right">الموظف</th>
                    <th className="table-header text-center">اقتراحك الحالي</th>
                    <th className="table-header text-center">الزيادة الشهرية</th>
                    <th className="table-header text-right">ملاحظة</th>
                    <th className="table-header" />
                  </tr>
                </thead>
                <tbody>
                  {cycle.team.map((person) => {
                    const key = keyOf(cycle.id, person.employeeId)
                    const draft = drafts[key] ?? { amount: person.amount === null ? '' : String(person.amount), note: person.note ?? '' }
                    const change = (patch: Partial<{ amount: string; note: string }>) => setDrafts((current) => ({ ...current, [key]: { ...draft, ...patch } }))
                    return (
                      <tr key={person.employeeId} className="border-t border-gray-100">
                        <td className="table-cell">{person.fullName}{person.employeeCode ? <span className="text-xs text-gray-500" dir="ltr"> · {person.employeeCode}</span> : null}</td>
                        <td className="table-cell text-center font-mono">
                          {person.amount === null ? '—' : <>{formatMoney(person.amount)} <span className="text-xs text-gray-500 font-sans">{currencyLabel(person.currency)}</span></>}
                          {person.adjusted && <span className="block text-xs text-amber-700 font-sans">المراجعة عدّلته</span>}
                        </td>
                        <td className="table-cell text-center">
                          <input className="input w-28 text-center" dir="ltr" inputMode="decimal" aria-label={`زيادة ${person.fullName}`} value={draft.amount} onChange={(event) => change({ amount: event.target.value })} />
                        </td>
                        <td className="table-cell">
                          <input className="input w-full" maxLength={500} aria-label={`ملاحظة ${person.fullName}`} value={draft.note} onChange={(event) => change({ note: event.target.value })} />
                        </td>
                        <td className="table-cell text-left">
                          <button type="button" className="btn-primary text-xs disabled:opacity-50" disabled={busy || !drafts[key] || amountOf(draft.amount) === null}
                            onClick={() => save(cycle.id, person.employeeId, person.fullName)}>حفظ</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </MainLayout>
  )
}
