'use client'
// B2.11: خطوة اختيار الوظيفة المعتمدة عند حفظ موظف جديد (لما موديول الوظائف المعتمدة مفعّل). الوظائف هنا هي النشطة في وحدة الموظف
// (فرعه، وقسمه وفريقه). الإنفاذ مفعّل: الاختيار إجباري والمليانة مقفولة؛ غير كده اختياري والمليانة بتتعيّن عليها «زيادة».
// الحكم النهائي في الخادم جوه معاملة الإنشاء.
import { useState } from 'react'
import type { ApiPositionOption } from '../../lib/positions-api'

interface Props {
  options: ApiPositionOption[]
  enforce: boolean
  /** رقم الوظيفة، أو null = من غير وظيفة (والإنفاذ مقفول بس) */
  onPick: (positionId: number | null) => void
  onCancel: () => void
}

export default function PositionPickModal({ options, enforce, onPick, onCancel }: Props) {
  const [picked, setPicked] = useState<number | null>(null)
  const open = (row: ApiPositionOption) => !enforce || row.vacant > 0
  const none = !options.some(open)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="position-pick-title" data-position-pick>
        <h2 id="position-pick-title" className="text-lg font-semibold text-gray-800 mb-2">الوظيفة المعتمدة</h2>
        <p className="text-sm text-gray-500 mb-3">
          {enforce ? 'التعيين لازم يكون على وظيفة معتمدة فيها شاغر في وحدة الموظف.' : 'اختار الوظيفة اللي الموظف هيتعيّن عليها، أو كمّل من غير وظيفة.'}
        </p>
        {enforce && none ? (
          <div role="alert" className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 text-sm" data-position-pick-none>
            مفيش وظيفة معتمدة فيها شاغر في وحدة الموظف، والتعيين من غير وظيفة مقفول. راجع شاشة «الوظائف المعتمدة» أو غيّر قسم الموظف.
          </div>
        ) : (
          <ul className="space-y-2" role="radiogroup" aria-labelledby="position-pick-title">
            {options.map(row => (
              <li key={row.id}>
                <label className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${picked === row.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200'} ${open(row) ? 'cursor-pointer' : 'opacity-60'}`} data-position-option={row.id}>
                  <input type="radio" name="position-pick" className="mt-1" checked={picked === row.id} disabled={!open(row)} onChange={() => setPicked(row.id)} />
                  <span>
                    <span className="font-medium text-gray-800">{row.title}</span> <span className="text-xs text-gray-500">{row.code}</span>
                    <span className="block text-xs text-gray-500">{[row.gradeName, row.departmentName ?? 'على مستوى الفرع', row.teamName].filter(Boolean).join(' · ')}</span>
                    <span className={`block text-xs ${row.vacant > 0 ? 'text-success-700' : 'text-red-700'}`}>{row.vacant > 0 ? `شاغر ${row.vacant} من ${row.headcount}` : `مليانة (${row.occupied} من ${row.headcount})`}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap justify-end gap-2 mt-5">
          <button type="button" className="btn-secondary" onClick={onCancel} data-position-pick-back>رجوع</button>
          {!enforce && <button type="button" className="btn-secondary" onClick={() => onPick(null)} data-position-pick-skip>من غير وظيفة</button>}
          {!(enforce && none) && <button type="button" className="btn-primary" disabled={picked === null} onClick={() => picked !== null && onPick(picked)} data-position-pick-save>كمّل الحفظ</button>}
        </div>
      </div>
    </div>
  )
}
