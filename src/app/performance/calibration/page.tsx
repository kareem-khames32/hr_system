'use client'

// B3.8: «المعايرة» — جلسة لدورة تقييم بمجموعة (قسم أو فرع): توزيع التقديرات لكل مدير، والتوزيع الكلي جنب الاسترشادي (تحذير بس)، وتعديل
// درجة بسبب إجباري بيتسجّل (قبل، بعد، مين). التعديل قبل الاعتماد، أو بعد اعتراض اتقبل على تقييم معلن — والخادم هو اللي بيحكم.
import { useCallback, useEffect, useState } from 'react'
import { Scale, X } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import EmptyState from '@/components/EmptyState'
import { formatDate } from '@/lib/dates'
import { calibrateReview, fetchCalibration, fetchCalibrationCycles, type ApiCalibration, type ApiCalibrationCycle, type ApiCalibrationRow } from '@/lib/reviews-api'

export default function CalibrationPage() {
  const [cycles, setCycles] = useState<ApiCalibrationCycle[] | null>(null)
  const [notice, setNotice] = useState('')
  const [cycleId, setCycleId] = useState(0)
  const [group, setGroup] = useState('')
  const [session, setSession] = useState<ApiCalibration | null>(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [editing, setEditing] = useState<ApiCalibrationRow | null>(null)
  const [score, setScore] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    fetchCalibrationCycles()
      .then((data) => { setCycles(data.cycles); setNotice(data.available ? '' : data.message ?? ''); if (data.cycles.length) setCycleId(data.cycles[0].id) })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل الدورات'))
  }, [])

  // المجموعة: «d:رقم» قسم، «b:رقم» فرع، والفاضي الكل
  const load = useCallback(() => {
    if (!cycleId) return
    setError('')
    const [kind, id] = group.split(':')
    fetchCalibration(cycleId, kind === 'd' ? { departmentId: Number(id) } : kind === 'b' ? { branchId: Number(id) } : {})
      .then(setSession)
      .catch((cause) => { setSession(null); setError(cause instanceof Error ? cause.message : 'تعذر تحميل جلسة المعايرة') })
  }, [cycleId, group])
  useEffect(load, [load])

  const open = (row: ApiCalibrationRow) => {
    setEditing(row)
    setScore(row.finalScore === null ? '' : String(row.finalScore))
    setReason('')
    setFormError('')
  }
  const save = async () => {
    if (!editing) return
    setBusy(true)
    setFormError('')
    try {
      await calibrateReview(editing.id, score.trim(), reason.trim())
      setInfo(`اتعدّلت درجة ${editing.employeeName} واتسجّل السبب.`)
      setEditing(null)
      load()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'تعذر حفظ التعديل')
    } finally {
      setBusy(false)
    }
  }
  const over = session?.distribution.filter((band) => band.over) ?? []

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Scale size={24} className="text-primary-600" />
            المعايرة
          </h1>
          <p className="text-gray-500 mt-1">توزيع التقديرات لكل مدير، وتعديل الدرجة بسبب بيتسجّل — قبل الاعتماد، أو بعد اعتراض اتقبل.</p>
        </div>
        {error && (
          <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">
            {error}
          </div>
        )}
        {info && (
          <div role="status" className="bg-green-50 text-green-800 rounded-xl p-4">
            {info}
          </div>
        )}
        {notice && (
          <div role="status" className="bg-amber-50 text-amber-800 rounded-xl p-4">
            {notice}
          </div>
        )}
        {cycles && !notice && cycles.length === 0 && <EmptyState title="مفيش دورات تقييم اتطلقت لسه" icon={Scale} />}
        {cycles && cycles.length > 0 && (
          <div className="card flex items-end gap-3 flex-wrap">
            <label className="text-sm text-gray-600">
              الدورة
              <select className="input mt-1 min-w-56" value={cycleId} onChange={(e) => { setCycleId(Number(e.target.value)); setGroup(''); setInfo('') }}>
                {cycles.map((cycle) => (
                  <option key={cycle.id} value={cycle.id}>
                    {cycle.name} — {cycle.statusLabel}
                  </option>
                ))}
              </select>
            </label>
            {session && (
              <label className="text-sm text-gray-600">
                المجموعة
                <select className="input mt-1 min-w-48" value={group} onChange={(e) => setGroup(e.target.value)}>
                  <option value="">الكل</option>
                  {session.groups.departments.map((item) => (
                    <option key={`d${item.id}`} value={`d:${item.id}`}>
                      قسم: {item.name}
                    </option>
                  ))}
                  {session.groups.branches.map((item) => (
                    <option key={`b${item.id}`} value={`b:${item.id}`}>
                      فرع: {item.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}
        {session && session.rows.length === 0 && <EmptyState title="مفيش تقييمات المدير سلّمها في المجموعة دي" icon={Scale} />}
        {session && session.rows.length > 0 && (
          <>
            {over.length > 0 && (
              <div role="status" className="bg-amber-50 text-amber-800 rounded-xl p-4 text-sm" data-guide-warning>
                التوزيع عدّى الاسترشادي في: {over.map((band) => `${band.label} (${band.percent}% والاسترشادي ${band.guide}%)`).join('، ')}. ده تنبيه بس — مابيمنعش الاعتماد.
              </div>
            )}
            <div className="card overflow-x-auto" data-distribution>
              <h2 className="text-lg font-bold text-gray-800 mb-3">توزيع التقديرات لكل مدير</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-start text-gray-500 border-b">
                    <th className="py-2 px-2 font-medium">المدير</th>
                    <th className="py-2 px-2 font-medium">العدد</th>
                    <th className="py-2 px-2 font-medium">المتوسط</th>
                    {session.bands.map((band) => (
                      <th key={band.key} className="py-2 px-2 font-medium">
                        {band.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {session.managers.map((manager) => (
                    <tr key={manager.index} className="border-b last:border-0">
                      <td className="py-2 px-2 text-gray-800">{manager.name ?? (manager.hasManager ? 'مدير برّه نطاقك' : 'من غير مدير')}</td>
                      <td className="py-2 px-2 tabular-nums">{manager.count}</td>
                      <td className="py-2 px-2 tabular-nums">{manager.average ?? '—'}</td>
                      {manager.bands.map((band) => (
                        <td key={band.key} className="py-2 px-2 tabular-nums">
                          {band.count || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-medium">
                    <td className="py-2 px-2">الكل (النسبة ÷ الاسترشادي)</td>
                    <td className="py-2 px-2 tabular-nums">{session.rows.length}</td>
                    <td className="py-2 px-2" />
                    {session.distribution.map((band) => (
                      <td key={band.key} className={`py-2 px-2 tabular-nums ${band.over ? 'text-amber-700' : ''}`}>
                        {band.percent}% ÷ {band.guide}%
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="card overflow-x-auto" data-calibration-rows>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-start text-gray-500 border-b">
                    <th className="py-2 px-2 font-medium">الموظف</th>
                    <th className="py-2 px-2 font-medium">القسم</th>
                    <th className="py-2 px-2 font-medium">المدير</th>
                    <th className="py-2 px-2 font-medium">درجة المدير</th>
                    <th className="py-2 px-2 font-medium">النهائية</th>
                    <th className="py-2 px-2 font-medium">التقدير</th>
                    <th className="py-2 px-2 font-medium">الحالة</th>
                    <th className="py-2 px-2" />
                  </tr>
                </thead>
                <tbody>
                  {session.rows.map((row) => (
                    <tr key={row.id} className="border-b last:border-0 align-top">
                      <td className="py-2 px-2 text-gray-800">
                        {row.employeeName}
                        {row.adjustments.map((entry, index) => (
                          <p key={index} className="text-xs text-gray-500 mt-1">
                            {entry.before ?? '—'} ← {entry.after} · {entry.reason} · {entry.byName ?? '—'} · {formatDate(entry.at)}
                          </p>
                        ))}
                      </td>
                      <td className="py-2 px-2 text-gray-600">{row.departmentName ?? '—'}</td>
                      <td className="py-2 px-2 text-gray-600">{session.managers[row.manager]?.name ?? '—'}</td>
                      <td className="py-2 px-2 tabular-nums">{row.managerScore ?? '—'}</td>
                      <td className="py-2 px-2 tabular-nums font-medium">{row.finalScore ?? '—'}</td>
                      <td className="py-2 px-2">{row.bandLabel ?? '—'}</td>
                      <td className="py-2 px-2 text-gray-600">
                        {row.statusLabel}
                        {row.objection && <p className="text-xs text-amber-700 mt-1">اعتراض: {row.objection.statusLabel}</p>}
                      </td>
                      <td className="py-2 px-2 text-end">
                        {row.canCalibrate && (
                          <button onClick={() => open(row)} className="btn-secondary text-xs">
                            تعديل
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">تعديل درجة {editing.employeeName}</h2>
              <button onClick={() => setEditing(null)} aria-label="إغلاق" className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-500 tabular-nums">
              درجة المدير {editing.managerScore ?? '—'} · النهائية دلوقتي {editing.finalScore ?? '—'}
            </p>
            {formError && (
              <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">
                {formError}
              </div>
            )}
            <label className="block text-sm text-gray-600">
              الدرجة بعد المعايرة (من 100)
              <input className="input mt-1 w-full" inputMode="decimal" value={score} onChange={(e) => setScore(e.target.value)} />
            </label>
            <label className="block text-sm text-gray-600">
              سبب التعديل (إجباري)
              <textarea className="input mt-1 w-full" rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
            </label>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setEditing(null)} className="btn-secondary text-sm">
                إلغاء
              </button>
              <button onClick={save} disabled={busy || score.trim() === '' || reason.trim().length < 3} className="btn-primary text-sm disabled:opacity-50">
                حفظ التعديل
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
