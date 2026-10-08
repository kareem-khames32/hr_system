'use client'

// B5.4 (ج): شبكة 9-box — الأداء (من آخر تقييم معلن) × الإمكانات (تقدير بيتسجّل هنا). ميزة فرعية skills.nine_box (مقفولة افتراضيًا)، سرّية.
import { useCallback, useEffect, useState } from 'react'
import { fetchNineBox, setTalentPotential, type ApiNineBox, type Band } from '@/lib/skills-api'

const BANDS: Band[] = ['LOW', 'MEDIUM', 'HIGH']
const LABELS: Record<Band, string> = { LOW: 'منخفض', MEDIUM: 'متوسط', HIGH: 'عالي' }

export default function NineBoxPanel() {
  const [data, setData] = useState<ApiNineBox | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    fetchNineBox().then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل الشبكة'))
  }, [])
  useEffect(load, [load])

  async function rate(employeeId: number, potential: Band) {
    setBusy(true); setError('')
    try { await setTalentPotential(employeeId, potential); load() } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر الحفظ') } finally { setBusy(false) }
  }

  if (!data) return error ? <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div> : null
  return (
    <div className="card space-y-3" data-nine-box>
      <h2 className="text-lg font-semibold text-gray-800">شبكة 9-box</h2>
      <p className="text-xs text-gray-500">الأداء من درجة آخر تقييم معلن (أقل من {data.thresholds.mediumFrom} منخفض، من {data.thresholds.highFrom} عالي). الإمكانات تقديرك إنت.</p>
      {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
      {!data.ready ? <p className="text-amber-800">جدول تقدير الإمكانات لسه مااتطبّقش (ترحيل 160).</p> : (
        <>
          <div className="grid grid-cols-3 gap-2 text-xs" dir="ltr">
            {[...BANDS].reverse().flatMap((potential) => BANDS.map((performance) => {
              const inBox = data.rows.filter((row) => row.potential === potential && row.performance === performance)
              return (
                <div key={`${potential}-${performance}`} className="border border-gray-100 rounded-lg p-2 min-h-20" dir="rtl">
                  <span className="block text-gray-400">إمكانات {LABELS[potential]} · أداء {LABELS[performance]}</span>
                  {inBox.map((row) => <span key={row.employeeId} className="block text-gray-800">{row.fullName}</span>)}
                </div>
              )
            }))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="table-header text-right">الموظف</th>
                  <th className="table-header text-center">درجة آخر تقييم</th>
                  <th className="table-header text-center">الأداء</th>
                  <th className="table-header text-center">الإمكانات</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 && <tr><td colSpan={4} className="table-cell text-center text-gray-500">مفيش موظفين لهم تقييم أداء معلن في نطاقك.</td></tr>}
                {data.rows.map((row) => (
                  <tr key={row.employeeId} className="border-t border-gray-100">
                    <td className="table-cell">{row.fullName}{row.employeeCode ? <span className="text-xs text-gray-500" dir="ltr"> · {row.employeeCode}</span> : null}</td>
                    <td className="table-cell text-center font-mono">{row.score ?? '—'}</td>
                    <td className="table-cell text-center">{row.performanceLabel ?? '—'}</td>
                    <td className="table-cell text-center">
                      <select className="input text-xs" aria-label={`إمكانات ${row.fullName}`} disabled={busy} value={row.potential ?? ''} onChange={(event) => event.target.value && rate(row.employeeId, event.target.value as Band)}>
                        <option value="">مش متقدّرة</option>
                        {BANDS.map((band) => <option key={band} value={band}>{LABELS[band]}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
