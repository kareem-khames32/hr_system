'use client'
// B4.4 (ج): الحسابات القانونية اللي ورا إعداد (ضريبة كسب العمل، صندوق الشهداء) — كلها مقفولة افتراضيًا. التفعيل لمدير النظام بس، وبس لو صفوف
// الحساب في حزمة الدولة متعلّمة «اتأكد». التفعيل بيسري على المسيرات اللي هتتحسب بعده؛ المحسوب والمعتمد مابيتغيّرش.
import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { fetchStatutoryCalculators, updateStatutoryCalculator, type ApiStatutoryCalculator, type ApiStatutoryCalculators } from '@/lib/statutory-api'

export default function StatutoryCalculatorsCard({ refreshKey }: { refreshKey?: unknown }) {
  const [data, setData] = useState<ApiStatutoryCalculators | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [periods, setPeriods] = useState<Record<string, string>>({})
  // فروع الحساب المختارة قبل الحفظ (للحسابات اللي بتتطبق في فروع بعينها)
  const [branches, setBranches] = useState<Record<string, number[]>>({})

  const load = useCallback(() => {
    fetchStatutoryCalculators().then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل الحسابات القانونية'))
  }, [])
  // صفوف الحزمة اتغيّرت (اتعلّم صف «اتأكد») = موانع التفعيل بتتحدّث
  useEffect(load, [load, refreshKey])

  async function change(row: ApiStatutoryCalculator, enabled: boolean) {
    const startPeriod = periods[row.code] ?? row.startPeriod ?? ''
    if (enabled && !window.confirm(`تفعيل «${row.label}»؟ هيتخصم من صافي الموظفين في المسيرات اللي هتتحسب بعد كده.`)) return
    setBusy(row.code); setError('')
    try {
      setData(await updateStatutoryCalculator(row.code, { enabled, ...(enabled && row.needsStartPeriod ? { startPeriod } : {}),
        ...(row.needsBranches && branches[row.code] ? { branchIds: branches[row.code] } : {}) }))
      setBranches((current) => { const next = { ...current }; delete next[row.code]; return next })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر الحفظ')
    } finally {
      setBusy('')
    }
  }

  if (!data) return error ? <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div> : null
  return (
    <div className="card space-y-3" data-statutory-calculators>
      <div>
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <ShieldCheck size={20} className="text-primary-600" />
          الحسابات القانونية في المسير
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          مقفولة افتراضيًا. التفعيل بيسري على المسيرات اللي هتتحسب بعده بس — المحسوب والمعتمد مابيتغيّرش.
          {!data.canEdit && ' التفعيل لمدير النظام بس.'}
        </p>
      </div>
      {error && <div role="alert" className="bg-red-50 text-red-700 rounded-lg p-3 text-sm">{error}</div>}
      <div className="divide-y divide-gray-100">
        {data.calculators.map((row) => (
          <div key={row.code} className="py-3 flex flex-wrap items-start justify-between gap-3" data-statutory-calculator={row.code}>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-800 flex items-center gap-2 flex-wrap">
                {row.label}
                <span className={`text-xs rounded-full px-2 py-0.5 ${row.enabled ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {row.enabled ? `مفعّل${row.startPeriod ? ` من فترة ${row.startPeriod}` : ''}` : 'مقفول'}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">{row.note}</p>
              {row.needsBranches && (
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1" data-calculator-branches={row.code}>
                  {!row.branchOptions.length && <span className="text-sm text-gray-500">مفيش فروع دولتها مصر.</span>}
                  {row.branchOptions.map((option) => {
                    const chosen = branches[row.code] ?? row.branchIds
                    return (
                      <label key={option.id} className="text-sm text-gray-700 flex items-center gap-1">
                        <input type="checkbox" checked={chosen.includes(option.id)} disabled={!data.canEdit || row.enabled || busy === row.code}
                          onChange={(event) => setBranches((current) => ({ ...current,
                            [row.code]: event.target.checked ? [...chosen, option.id] : chosen.filter((id) => id !== option.id) }))} />
                        {option.name}
                      </label>
                    )
                  })}
                </div>
              )}
              {!row.enabled && row.blockers.map((blocker) => (
                <p key={blocker} className="text-sm text-amber-700 mt-1 flex items-start gap-1">
                  <AlertTriangle size={14} className="mt-1 shrink-0" />
                  {blocker}
                </p>
              ))}
            </div>
            {data.canEdit && (
              <div className="flex items-center gap-2">
                {!row.enabled && row.needsStartPeriod && (
                  <label className="text-sm text-gray-600 flex items-center gap-2">
                    أول فترة
                    <input type="month" className="input w-40" value={periods[row.code] ?? row.startPeriod ?? ''} disabled={busy === row.code}
                      onChange={(event) => setPeriods((current) => ({ ...current, [row.code]: event.target.value }))} />
                  </label>
                )}
                <button type="button" className={row.enabled ? 'btn-secondary' : 'btn-primary'} disabled={busy === row.code || (!row.enabled && row.blockers.length > 0)}
                  onClick={() => void change(row, !row.enabled)}>
                  {row.enabled ? 'قفل' : 'تفعيل'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
