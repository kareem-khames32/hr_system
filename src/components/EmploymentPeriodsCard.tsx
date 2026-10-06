'use client'
// B2.10: قسم «فترات الخدمة» في ملف الموظف — بيظهر بس لموظف اتعيّن تاني (له فترة خدمة مقفولة). الخادم هو اللي بيحكم مين يشوف.
import { useEffect, useState } from 'react'
import { fetchEmploymentPeriods, type ApiEmploymentPeriods } from '../lib/api'
import { formatDate } from '../lib/dates'
import { terminationReasonLabel } from '../lib/termination-reasons'

export default function EmploymentPeriodsCard({ employeeId }: { employeeId: number }) {
  const [data, setData] = useState<ApiEmploymentPeriods | null>(null)

  useEffect(() => {
    let alive = true
    setData(null)
    fetchEmploymentPeriods(employeeId).then((result) => { if (alive) setData(result) }).catch(() => undefined)
    return () => { alive = false }
  }, [employeeId])

  if (!data?.ready || data.periods.length === 0) return null

  return (
    <div className="pt-6 border-t border-gray-100" data-employment-periods>
      <h3 className="text-md font-bold text-gray-700 mb-1">فترات الخدمة</h3>
      <p className="text-sm text-gray-500 mb-4">الموظف اتعيّن تاني: مدة الخدمة ورصيد الإجازات بيتحسبوا من بداية الفترة الحالية.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-right text-gray-500 border-b border-gray-100">
              <th className="py-2 font-medium">الفترة</th>
              <th className="py-2 font-medium">من</th>
              <th className="py-2 font-medium">إلى</th>
              <th className="py-2 font-medium">سبب الخروج</th>
              <th className="py-2 font-medium">سبب إعادة التعيين</th>
            </tr>
          </thead>
          <tbody>
            {data.periods.map((period) => (
              <tr key={period.periodNo} className="border-b border-gray-50 align-top">
                <td className="py-2 whitespace-nowrap">{period.periodNo}</td>
                <td className="py-2 whitespace-nowrap">{period.startDate ? formatDate(period.startDate) : '—'}</td>
                <td className="py-2 whitespace-nowrap">{period.endDate ? formatDate(period.endDate) : '—'}</td>
                <td className="py-2">{terminationReasonLabel(period.exitReason)}</td>
                <td className="py-2 break-words">{period.rehireReason}</td>
              </tr>
            ))}
            <tr className="font-medium text-gray-800">
              <td className="py-2 whitespace-nowrap">{data.current.periodNo} (الحالية)</td>
              <td className="py-2 whitespace-nowrap">{data.current.startDate ? formatDate(data.current.startDate) : '—'}</td>
              <td className="py-2">—</td>
              <td className="py-2">—</td>
              <td className="py-2">—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
