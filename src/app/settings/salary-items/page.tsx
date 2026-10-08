'use client'

// B4.3: «بنود الراتب» — كل بند بيظهر في القسيمة: نوعه، وخاضع للتأمين وللضريبة، وطريقة تناسبه، وترتيبه. المبالغ مصدرها زي ما هو
// (راتب الموظف، والحضور، والدفتر)؛ الشاشة بتوصف وبترتّب بس. التعديل لحساب بكل الفروع.
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Info, ListOrdered } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { fetchSalaryItems, updateSalaryItem, type ApiSalaryItem, type ApiSalaryItems } from '@/lib/salary-items-api'

const PRORATION_LABELS: Record<ApiSalaryItem['proration'], string> = { SERVICE_DAYS: 'بأيام الخدمة في الفترة', NONE: '—' }
const GROUPS: Array<{ kind: ApiSalaryItem['kind']; title: string; taxHint: string }> = [
  { kind: 'EARNING', title: 'الاستحقاقات', taxHint: 'بيدخل وعاء الضريبة' },
  { kind: 'DEDUCTION', title: 'الاستقطاعات', taxHint: 'بيقلل وعاء الضريبة' },
]

export default function SalaryItemsPage() {
  const [data, setData] = useState<ApiSalaryItems | null>(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState<number | null>(null)
  const [orders, setOrders] = useState<Record<number, string>>({})

  const load = useCallback(() => {
    fetchSalaryItems().then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل بنود الراتب'))
  }, [])
  useEffect(load, [load])

  async function save(item: ApiSalaryItem, body: { sortOrder?: number; insurable?: boolean; taxable?: boolean }) {
    setBusy(item.id); setError(''); setInfo('')
    try {
      setData(await updateSalaryItem(item.id, body))
      setOrders((current) => { const next = { ...current }; delete next[item.id]; return next })
      setInfo(`اتحفظ «${item.nameAr}»`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر الحفظ')
    } finally {
      setBusy(null)
    }
  }

  function saveOrder(item: ApiSalaryItem) {
    const text = (orders[item.id] ?? '').trim()
    const value = Number(text)
    if (!/^\d{1,4}$/.test(text)) { setError('الترتيب رقم صحيح من 0 لـ9999'); return }
    if (value !== item.sortOrder) void save(item, { sortOrder: value })
  }

  const canEdit = data?.canEdit === true

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <Link href="/settings" className="text-sm text-primary-600 hover:underline">
            ← الإعدادات
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mt-2">
            <ListOrdered size={24} className="text-primary-600" />
            بنود الراتب
          </h1>
          <p className="text-gray-500 mt-1">كل بند بيظهر في القسيمة وجدول المسير: نوعه، وخاضع لإيه، وترتيبه</p>
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
        {data && !data.available && (
          <div role="status" className="bg-amber-50 text-amber-800 rounded-xl p-4">
            جدول بنود الراتب لسه مااتعملش على الخادم (ترحيل 135). القسيمة شغالة بترتيبها الثابت.
          </div>
        )}
        {data?.available && (
          <div role="note" className="bg-blue-50 text-blue-800 rounded-xl p-4 text-sm flex items-start gap-2" data-salary-items-note>
            <Info size={18} className="mt-0.5 shrink-0" />
            <span>
              المبالغ مابتتغيّرش من هنا: مبلغ كل بند من مصدره (راتب الموظف، الحضور، الدفتر). «الترتيب» بيرتّب سطور القسيمة وأعمدة جدول المسير.
              «خاضع للضريبة» هيقراه حساب ضريبة كسب العمل لما يتفعّل، و«خاضع للتأمين» وصف بس — حساب التأمينات بيقرا أجر التأمين المسجل في ملف الموظف.
              {!canEdit && ' التعديل لحساب على مستوى الشركة.'}
            </span>
          </div>
        )}
        {data?.available && GROUPS.map((group) => (
          <section key={group.kind} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" data-salary-items-group={group.kind}>
            <h2 className="text-lg font-semibold text-gray-800 px-5 py-4 border-b border-gray-100">{group.title}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-right font-medium px-4 py-3 w-28">الترتيب</th>
                    <th className="text-right font-medium px-4 py-3">البند</th>
                    <th className="text-right font-medium px-4 py-3">التناسب</th>
                    <th className="text-center font-medium px-4 py-3">خاضع للتأمين</th>
                    <th className="text-center font-medium px-4 py-3" title={group.taxHint}>خاضع للضريبة</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.filter((item) => item.kind === group.kind).map((item) => (
                    <tr key={item.id} className="border-t border-gray-100" data-salary-item={item.code}>
                      <td className="px-4 py-3">
                        {canEdit ? (
                          <input
                            type="text" inputMode="numeric" aria-label={`ترتيب ${item.nameAr}`} disabled={busy === item.id}
                            value={orders[item.id] ?? String(item.sortOrder)}
                            onChange={(event) => setOrders((current) => ({ ...current, [item.id]: event.target.value }))}
                            onBlur={() => { if (orders[item.id] !== undefined) saveOrder(item) }}
                            onKeyDown={(event) => { if (event.key === 'Enter') (event.target as HTMLInputElement).blur() }}
                            className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-center tabular-nums"
                          />
                        ) : (
                          <span className="tabular-nums">{item.sortOrder}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{item.nameAr}</div>
                        <div className="text-xs text-gray-500" dir="ltr">{item.nameEn}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.statutory && <span className="text-xs bg-indigo-50 text-indigo-700 rounded-full px-2 py-0.5">قانوني</span>}
                          {!item.computed && <span className="text-xs bg-amber-50 text-amber-800 rounded-full px-2 py-0.5">لسه مش بيتحسب</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{PRORATION_LABELS[item.proration]}</td>
                      {(['insurable', 'taxable'] as const).map((flag) => (
                        <td key={flag} className="px-4 py-3 text-center">
                          <input
                            type="checkbox" checked={item[flag]} disabled={!canEdit || busy === item.id}
                            aria-label={`${flag === 'insurable' ? 'خاضع للتأمين' : 'خاضع للضريبة'}: ${item.nameAr}`}
                            onChange={(event) => void save(item, { [flag]: event.target.checked })}
                            className="h-4 w-4"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </MainLayout>
  )
}
