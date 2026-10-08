'use client'
// B4.6 (أ): تقرير نطاقات البسيط — نسبة السعوديين من الموظفين النشطين لكل كيان قانوني سعودي. قراءة بس.
// بيظهر لحساب بكل الفروع لو فيه موظفين في فروع السعودية؛ حساب الفرع (403) أو تعذر التحميل: الكارت مابيظهرش.
import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { fetchSaudization, type ApiSaudization } from '@/lib/eg-salary-tax-api'
import { formatDate } from '@/lib/dates'

export default function SaudizationCard() {
  const [data, setData] = useState<ApiSaudization | null>(null)

  useEffect(() => {
    let alive = true
    fetchSaudization().then((next) => { if (alive) setData(next) }).catch(() => { if (alive) setData(null) })
    return () => { alive = false }
  }, [])

  if (!data || !data.entities.length) return null
  return (
    <div className="card space-y-3" data-saudization>
      <div>
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Users size={20} className="text-primary-600" />
          نسبة السعودة
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          السعوديين من الموظفين النشطين في فروع السعودية بتاريخ {formatDate(data.asOf)} — عدّ بسيط، مش حساب نطاق المنشأة في «نطاقات».
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="table-header text-right">المنشأة</th>
              <th className="table-header text-center">الموظفين</th>
              <th className="table-header text-center">السعوديين</th>
              <th className="table-header text-center">النسبة</th>
              <th className="table-header text-center">من غير جنسية</th>
            </tr>
          </thead>
          <tbody>
            {data.entities.map((entity) => (
              <tr key={entity.entityId ?? 'none'} className="border-t border-gray-100">
                <td className="table-cell">{entity.name}</td>
                <td className="table-cell text-center font-mono">{entity.headcount}</td>
                <td className="table-cell text-center font-mono">{entity.saudis}</td>
                <td className="table-cell text-center font-mono font-bold">{entity.percent === null ? '—' : `${entity.percent}%`}</td>
                <td className="table-cell text-center font-mono">{entity.unknownNationality || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
