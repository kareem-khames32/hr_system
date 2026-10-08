'use client'

// B3.8: مكافآت دورة التقييم — إدارة الأداء بتقترح بقاعدة (تقدير ← قيمة)، والاقتراح بيروح للمدير المباشر لكل موظف وهو اللي بيقدّمه من «التقييمات».
// الاقتراح مالوش أثر مالي: المكافأة بتتعمل لما المدير يقدّمها وتعدّي سلسلة اعتمادها.
import { useCallback, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { dismissReward, fetchCycleRewards, suggestCycleRewards, type ApiCycleRewards } from '@/lib/reviews-api'

const currentPeriod = () => new Date().toLocaleDateString('en-CA').slice(0, 7)

export default function RewardsPanel({ cycleId, cycleName, onClose }: { cycleId: number; cycleName: string; onClose: () => void }) {
  const [data, setData] = useState<ApiCycleRewards | null>(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [typeId, setTypeId] = useState(0)
  const [period, setPeriod] = useState(currentPeriod())
  const [values, setValues] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    fetchCycleRewards(cycleId)
      .then((next) => { setData(next); setTypeId((current) => current || next.types[0]?.id || 0) })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل نتايج الدورة'))
  }, [cycleId])
  useEffect(load, [load])

  const act = async (work: () => Promise<string>) => {
    setBusy(true)
    setError('')
    setInfo('')
    try {
      setInfo(await work())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تنفيذ الإجراء')
    } finally {
      setBusy(false)
    }
  }
  const suggest = () => act(async () => {
    const made = await suggestCycleRewards(cycleId, { bonusTypeId: typeId, targetPeriod: period, values })
    setData(made)
    const skipped = [made.skipped.noManager ? `${made.skipped.noManager} من غير مدير مباشر` : '', made.skipped.exists ? `${made.skipped.exists} له اقتراح قايم` : ''].filter(Boolean).join('، ')
    return `اتقترح ${made.created} مكافأة — مستنية المديرين يقدّموها.${skipped ? ` (${skipped})` : ''}`
  })
  const dismiss = (id: number) => act(async () => { await dismissReward(id); load(); return 'اتصرف النظر عن الاقتراح.' })
  const type = data?.types.find((entry) => entry.id === typeId)
  const filled = Object.values(values).some((value) => value.trim() !== '')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label="مكافآت الدورة">
      <div className="bg-white rounded-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">مكافآت «{cycleName}»</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="إغلاق">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && (
            <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">
              {error}
            </div>
          )}
          {info && (
            <div role="status" className="bg-green-50 text-green-800 rounded-xl p-3 text-sm">
              {info}
            </div>
          )}
          {data && !data.available && (
            <div role="status" className="bg-amber-50 text-amber-800 rounded-xl p-3 text-sm">
              {data.message}
            </div>
          )}
          {data?.available && !data.canSuggest && (
            <p className="text-sm text-gray-500">اقتراح المكافآت محتاج صلاحية «إدارة المكافآت» ونوع مكافأة يقدر المدير المباشر يقترحه.</p>
          )}
          {data?.available && data.canSuggest && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-3" data-reward-rule>
              <p className="text-sm text-gray-700">
                حط قيمة لكل تقدير (الفاضي من غير اقتراح). الاقتراح بيروح للمدير المباشر لكل موظف، وهو اللي بيقدّم المكافأة فتمشي في سلسلة اعتمادها العادية.
              </p>
              <div className="flex items-end gap-3 flex-wrap">
                <label className="text-sm text-gray-600">
                  نوع المكافأة
                  <select className="input mt-1 min-w-48" value={typeId} onChange={(e) => setTypeId(Number(e.target.value))}>
                    {data.types.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.nameAr} — {entry.calcMethodLabel}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-gray-600">
                  شهر المسير
                  <input type="month" className="input mt-1" value={period} onChange={(e) => setPeriod(e.target.value)} />
                </label>
              </div>
              <div className="flex items-end gap-3 flex-wrap">
                {data.bands.map((band) => (
                  <label key={band.key} className="text-sm text-gray-600">
                    {band.label}
                    <input className="input mt-1 w-28" inputMode="decimal" placeholder={type?.calcMethodLabel ?? ''} value={values[band.key] ?? ''} onChange={(e) => setValues((prev) => ({ ...prev, [band.key]: e.target.value }))} />
                  </label>
                ))}
                <button onClick={suggest} disabled={busy || !typeId || !period || !filled} className="btn-primary text-sm disabled:opacity-50">
                  اقترح المكافآت
                </button>
              </div>
            </div>
          )}
          {data?.available && data.rows.length === 0 && <p className="text-sm text-gray-500">مفيش تقييمات معتمدة في الدورة دي لسه.</p>}
          {data?.available && data.rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-reward-rows>
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-start font-medium text-gray-600">الموظف</th>
                    <th className="px-3 py-2 text-start font-medium text-gray-600">المدير</th>
                    <th className="px-3 py-2 text-start font-medium text-gray-600">الدرجة</th>
                    <th className="px-3 py-2 text-start font-medium text-gray-600">التقدير</th>
                    <th className="px-3 py-2 text-start font-medium text-gray-600">المكافأة المقترحة</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.rows.map((row) => (
                    <tr key={row.assignmentId}>
                      <td className="px-3 py-2 text-gray-800">{row.employeeName}</td>
                      <td className="px-3 py-2 text-gray-600">{row.managerName ?? '—'}</td>
                      <td className="px-3 py-2 tabular-nums">{row.finalScore ?? '—'}</td>
                      <td className="px-3 py-2">{row.bandLabel ?? '—'}</td>
                      <td className="px-3 py-2 text-gray-600">
                        {row.suggestion ? (
                          <>
                            {row.suggestion.typeName} · {row.suggestion.inputValue} · {row.suggestion.targetPeriod} — {row.suggestion.statusLabel}
                            {row.suggestion.bonusStatusLabel ? ` (طلب المكافأة رقم ${row.suggestion.bonusRequestId}: ${row.suggestion.bonusStatusLabel})` : ''}
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2 text-end">
                        {row.suggestion?.status === 'SUGGESTED' && (
                          <button onClick={() => dismiss(row.suggestion!.id)} disabled={busy} className="text-red-600 hover:underline text-xs disabled:opacity-50">
                            صرف النظر
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
