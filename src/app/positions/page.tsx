'use client'

// B2.11: الوظائف المعتمدة — تقرير «معتمد / مشغول / شاغر / زيادة» لكل قسم، وقايمة الوظائف بأعدادها، وإضافة وتعديل وربط الشاغلين والتوليد
// من الموجود لصاحب «إدارة الوظائف المعتمدة» (الأزرار من الخادم: canManage). كله في نطاق فروع الحساب.
import { useCallback, useEffect, useState } from 'react'
import { Briefcase, Plus, Users, Wand2 } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import PositionFormModal from '@/components/positions/PositionFormModal'
import PositionGenerateModal from '@/components/positions/PositionGenerateModal'
import PositionHoldersModal from '@/components/positions/PositionHoldersModal'
import { fetchPositions, type ApiPosition, type ApiPositionsList } from '@/lib/positions-api'

const STATUS_BADGE: Record<ApiPosition['status'], string> = { ACTIVE: 'bg-green-50 text-green-700', FROZEN: 'bg-amber-50 text-amber-800', CANCELLED: 'bg-gray-100 text-gray-600' }

export default function PositionsPage() {
  const [data, setData] = useState<ApiPositionsList | null>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState<{ position: ApiPosition | null } | null>(null)
  const [holdersOf, setHoldersOf] = useState<number | null>(null)
  const [generating, setGenerating] = useState(false)

  const load = useCallback(async () => {
    setError('')
    try { setData(await fetchPositions()) } catch (err) { setError(err instanceof Error ? err.message : 'تعذر تحميل الوظائف المعتمدة') }
  }, [])
  useEffect(() => { void load() }, [load])

  return (
    <MainLayout>
      <div className="space-y-4" data-positions>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Briefcase size={22} className="text-primary-600" />الوظائف المعتمدة</h1>
          {data?.available && data.canManage && (
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary" onClick={() => setGenerating(true)} data-positions-generate><Wand2 size={16} className="inline ml-1" />توليد من الموجود</button>
              <button type="button" className="btn-primary" onClick={() => setForm({ position: null })} data-position-new><Plus size={16} className="inline ml-1" />وظيفة جديدة</button>
            </div>
          )}
        </div>
        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
        {!data ? !error && <p className="text-sm text-gray-500">جاري التحميل…</p> : !data.available ? (
          <div className="card text-sm text-amber-900 bg-amber-50 border border-amber-200" data-positions-unavailable>{data.message ?? 'الوظائف المعتمدة مش متاحة دلوقتي'}</div>
        ) : (
          <>
            <p className="text-sm text-gray-500" data-positions-enforce>
              {data.enforce ? 'التعيين مقفول من غير وظيفة معتمدة فيها شاغر.' : 'الوظيفة عند التعيين اختيارية، والتعيين على وظيفة مليانة بيظهر «زيادة».'}
            </p>
            <div className="card space-y-3" data-positions-summary>
              <h2 className="font-semibold text-gray-800">معتمد / مشغول / شاغر لكل قسم</h2>
              {data.summary.length === 0 ? <p className="text-sm text-gray-500">مفيش وظائف ولا موظفين في نطاقك.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-right text-gray-500 border-b border-gray-200">
                        <th className="py-2 px-2 font-medium">الفرع</th>
                        <th className="py-2 px-2 font-medium">القسم</th>
                        <th className="py-2 px-2 font-medium">معتمد</th>
                        <th className="py-2 px-2 font-medium">مشغول</th>
                        <th className="py-2 px-2 font-medium">شاغر</th>
                        <th className="py-2 px-2 font-medium">زيادة</th>
                        <th className="py-2 px-2 font-medium">موظفين من غير وظيفة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.summary.map(line => (
                        <tr key={`${line.branchId}:${line.departmentId ?? line.departmentName ?? 0}`} className="border-b border-gray-100" data-positions-summary-row>
                          <td className="py-2 px-2">{line.branchName ?? '—'}</td>
                          <td className="py-2 px-2">{line.departmentName ?? 'على مستوى الفرع'}</td>
                          <td className="py-2 px-2">{line.approved}</td>
                          <td className="py-2 px-2">{line.occupied}</td>
                          <td className={`py-2 px-2 ${line.vacant ? 'text-success-700 font-medium' : ''}`}>{line.vacant}</td>
                          <td className={`py-2 px-2 ${line.over ? 'text-red-700 font-medium' : ''}`}>{line.over}</td>
                          <td className={`py-2 px-2 ${line.unassigned ? 'text-warning-700' : ''}`}>{line.unassigned}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card space-y-3" data-positions-list>
              <h2 className="font-semibold text-gray-800">الوظائف ({data.positions.length})</h2>
              {data.positions.length === 0 ? <p className="text-sm text-gray-500">لسه مفيش وظائف معتمدة.{data.canManage ? ' ابدأ بـ«وظيفة جديدة» أو «توليد من الموجود».' : ''}</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-right text-gray-500 border-b border-gray-200">
                        <th className="py-2 px-2 font-medium">الكود</th>
                        <th className="py-2 px-2 font-medium">المسمى</th>
                        <th className="py-2 px-2 font-medium">الوحدة</th>
                        <th className="py-2 px-2 font-medium">معتمد</th>
                        <th className="py-2 px-2 font-medium">مشغول</th>
                        <th className="py-2 px-2 font-medium">شاغر</th>
                        <th className="py-2 px-2 font-medium">الحالة</th>
                        <th className="py-2 px-2 font-medium"><span className="sr-only">إجراءات</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.positions.map(row => (
                        <tr key={row.id} className="border-b border-gray-100" data-position-row={row.id}>
                          <td className="py-2 px-2 whitespace-nowrap text-gray-500">{row.code}</td>
                          <td className="py-2 px-2">
                            <span className="font-medium text-gray-800">{row.title}</span>
                            {row.gradeName && <span className="block text-xs text-gray-500">{row.gradeName}</span>}
                          </td>
                          <td className="py-2 px-2 text-gray-600">{[row.branchName, row.departmentName, row.teamName].filter(Boolean).join(' · ')}</td>
                          <td className="py-2 px-2">{row.headcount}</td>
                          <td className="py-2 px-2">{row.occupied}{row.over > 0 && <span className="text-red-700 text-xs mr-1">(زيادة {row.over})</span>}</td>
                          <td className={`py-2 px-2 ${row.vacant ? 'text-success-700 font-medium' : ''}`}>{row.vacant}</td>
                          <td className="py-2 px-2"><span className={`badge ${STATUS_BADGE[row.status]}`}>{row.statusLabel}</span></td>
                          <td className="py-2 px-2 whitespace-nowrap">
                            <button type="button" className="text-primary-600 underline text-xs ml-3" onClick={() => setHoldersOf(row.id)} data-position-holders><Users size={13} className="inline ml-1" />الشاغلين</button>
                            {data.canManage && <button type="button" className="text-primary-600 underline text-xs" onClick={() => setForm({ position: row })} data-position-edit>تعديل</button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      {form && <PositionFormModal position={form.position} onClose={() => setForm(null)} onSaved={() => { setForm(null); void load() }} />}
      {holdersOf !== null && <PositionHoldersModal id={holdersOf} onClose={() => setHoldersOf(null)} onChanged={() => void load()} />}
      {generating && <PositionGenerateModal onClose={() => setGenerating(false)} onApplied={() => { setGenerating(false); void load() }} />}
    </MainLayout>
  )
}
