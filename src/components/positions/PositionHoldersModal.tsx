'use client'
// B2.11: شاغلو الوظيفة المعتمدة. صاحب الإدارة يربط موظف من وحدة الوظيفة (ولو على وظيفة تانية بيتنقل منها) أو يفكّه. الحكم في الخادم:
// نفس حكم التعيين (في وحدتها، ونشطة، وفيها شاغر لو الإنفاذ مفعّل).
import { useCallback, useEffect, useState } from 'react'
import { EmployeePicker } from '../EmployeePicker'
import { addPositionHolder, fetchPosition, removePositionHolder, type ApiPositionDetail } from '../../lib/positions-api'

interface Props {
  id: number
  onClose: () => void
  /** بعد ربط أو فكّ: الشاشة بتعيد أرقامها */
  onChanged: () => void
}

export default function PositionHoldersModal({ id, onClose, onChanged }: Props) {
  const [detail, setDetail] = useState<ApiPositionDetail | null>(null)
  const [picked, setPicked] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    try { setDetail(await fetchPosition(id)) } catch (err) { setError(err instanceof Error ? err.message : 'تعذر تحميل الوظيفة') }
  }, [id])
  useEffect(() => { void load() }, [load])

  const act = async (run: () => Promise<ApiPositionDetail>) => {
    setError(''); setBusy(true)
    try { setDetail(await run()); setPicked(''); onChanged() } catch (err) { setError(err instanceof Error ? err.message : 'تعذر تنفيذ الإجراء') } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !busy && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-xl p-6 shadow-xl max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="position-holders-title"
        onClick={event => event.stopPropagation()} data-position-holders-modal>
        <h2 id="position-holders-title" className="text-lg font-semibold text-gray-800 mb-1">{detail ? `${detail.title} — ${detail.code}` : 'الوظيفة المعتمدة'}</h2>
        {detail && (
          <p className="text-sm text-gray-500 mb-4">
            {[detail.branchName, detail.departmentName, detail.teamName].filter(Boolean).join(' · ')} · معتمد {detail.headcount} · مشغول {detail.occupied} · شاغر {detail.vacant}
            {detail.over > 0 && <span className="text-red-700"> · زيادة {detail.over}</span>}
          </p>
        )}
        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm mb-3">{error}</div>}
        {!detail ? !error && <p className="text-sm text-gray-500">جاري التحميل…</p> : (
          <div className="space-y-4">
            {detail.holders.length === 0 ? <p className="text-sm text-gray-500">مفيش حد مربوط بالوظيفة دي.</p> : (
              <ul className="divide-y divide-gray-100" data-position-holder-list>
                {detail.holders.map(holder => (
                  <li key={holder.employeeId} className="py-2 flex flex-wrap items-center justify-between gap-2" data-position-holder={holder.employeeId}>
                    <div>
                      <span className="font-medium text-gray-800">{holder.fullName}</span>
                      <span className="block text-xs text-gray-500">{holder.employeeCode}{holder.jobTitle ? ` · ${holder.jobTitle}` : ''}</span>
                      {!holder.seated && <span className="badge bg-amber-50 text-amber-800 mt-1" data-position-holder-note>{holder.note} — مش محسوب في المشغول</span>}
                    </div>
                    {detail.canManage && <button type="button" className="text-red-700 underline text-xs" disabled={busy} onClick={() => void act(() => removePositionHolder(id, holder.employeeId))} data-position-unlink>فكّ الربط</button>}
                  </li>
                ))}
              </ul>
            )}
            {detail.canManage && detail.status === 'ACTIVE' && (
              <div className="border-t border-gray-100 pt-3 space-y-2" data-position-link>
                <label className="label" htmlFor="position-link-employee">اربط موظف من وحدة الوظيفة</label>
                <EmployeePicker id="position-link-employee" employees={detail.linkable} value={picked} onChange={value => setPicked(value)} placeholder="اكتب الاسم أو الكود" />
                <p className="text-xs text-gray-500">لو الموظف على وظيفة معتمدة تانية هيتنقل منها.</p>
                <button type="button" className="btn-primary" disabled={busy || !picked} onClick={() => void act(() => addPositionHolder(id, Number(picked)))} data-position-link-save>ربط</button>
              </div>
            )}
          </div>
        )}
        <div className="flex justify-end mt-5">
          <button type="button" className="btn-secondary" disabled={busy} onClick={onClose}>إغلاق</button>
        </div>
      </div>
    </div>
  )
}
