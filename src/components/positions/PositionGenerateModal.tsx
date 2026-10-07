'use client'
// B2.11: توليد الوظائف المعتمدة من الموجود — معاينة ثم تطبيق. وظيفة لكل (مسمى × قسم × فرع) من الموظفين اللي من غير وظيفة، بعددهم
// الحالي ومربوطين بيها. المسمى اللي مش في الكتالوج، واللي له وظيفة قايمة في نفس القسم، بيتخطّوا بسببهم.
import { useEffect, useState } from 'react'
import { applyPositionGeneration, fetchPositionGeneration, type ApiPositionGeneration } from '../../lib/positions-api'

interface Props {
  onClose: () => void
  onApplied: () => void
}

export default function PositionGenerateModal({ onClose, onApplied }: Props) {
  const [plan, setPlan] = useState<ApiPositionGeneration | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ created: number; linked: number } | null>(null)

  useEffect(() => {
    fetchPositionGeneration().then(setPlan).catch(err => setError(err instanceof Error ? err.message : 'تعذر تحميل المعاينة'))
  }, [])

  const apply = async () => {
    setError(''); setBusy(true)
    try { setDone(await applyPositionGeneration()) } catch (err) { setError(err instanceof Error ? err.message : 'تعذر التوليد') } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !busy && (done ? onApplied() : onClose())}>
      <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="position-generate-title"
        onClick={event => event.stopPropagation()} data-position-generate>
        <h2 id="position-generate-title" className="text-lg font-semibold text-gray-800 mb-2">توليد الوظائف من الموجود</h2>
        <p className="text-sm text-gray-500 mb-3">وظيفة نشطة لكل مسمى في كل قسم، بعدد موظفيه الحاليين وهم مربوطين بيها. راجع الأعداد وعدّلها بعد التوليد.</p>
        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm mb-3">{error}</div>}
        {done ? (
          <p className="text-sm text-green-700" role="status" data-position-generate-done>اتعمل {done.created} وظيفة واتربط بيها {done.linked} موظف.</p>
        ) : !plan ? !error && <p className="text-sm text-gray-500">جاري التحميل…</p> : plan.groups.length === 0 ? (
          <p className="text-sm text-gray-500">كل الموظفين في نطاقك مربوطين بوظائف معتمدة.</p>
        ) : (
          <>
            <p className="text-sm text-gray-700 mb-2" data-position-generate-totals>
              هيتعمل {plan.totals.create} وظيفة لـ{plan.totals.createEmployees} موظف{plan.totals.skip ? `، وهيتخطّى ${plan.totals.skip} مجموعة فيها ${plan.totals.skipEmployees} موظف` : ''}.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-right text-gray-500 border-b border-gray-200">
                    <th className="py-2 px-2 font-medium">الفرع</th>
                    <th className="py-2 px-2 font-medium">القسم</th>
                    <th className="py-2 px-2 font-medium">المسمى</th>
                    <th className="py-2 px-2 font-medium">الموظفين</th>
                    <th className="py-2 px-2 font-medium">هيحصل إيه</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.groups.map((group, index) => (
                    <tr key={index} className="border-b border-gray-100" data-position-generate-row={group.action}>
                      <td className="py-2 px-2">{group.branchName ?? '—'}</td>
                      <td className="py-2 px-2">{group.departmentName ?? 'على مستوى الفرع'}</td>
                      <td className="py-2 px-2">{group.title ?? '—'}</td>
                      <td className="py-2 px-2">{group.employees}</td>
                      <td className={`py-2 px-2 ${group.action === 'skip' ? 'text-warning-700' : 'text-success-700'}`}>{group.action === 'create' ? 'وظيفة جديدة' : `متخطّى: ${group.reason}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {plan.truncated && <p className="text-xs text-gray-500 mt-2">المعاينة بتعرض أول 500 مجموعة؛ التوليد بيشمل الكل.</p>}
          </>
        )}
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => (done ? onApplied() : onClose())}>{done ? 'تمام' : 'إلغاء'}</button>
          {!done && plan && plan.totals.create > 0 && <button type="button" className="btn-primary" disabled={busy} onClick={() => void apply()} data-position-generate-apply>{busy ? 'جاري التوليد…' : 'ولّد الوظائف'}</button>}
        </div>
      </div>
    </div>
  )
}
