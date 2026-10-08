'use client'
// B4.5 (هـ): تنبيه الحد الأدنى للأجور — الموظفين النشطين (في نطاق الحساب) اللي إجمالي راتبهم الشهري تحت الحد الأدنى لدولة فرعهم.
// عرض بس: مابيغيّرش راتب ولا بيمنع حفظه. الكارت مابيظهرش لو مفيش دولة ليها حد أدنى في الحزمة أو مفيش موظف تحته.
import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { fetchMinimumWageAlerts, type ApiMinimumWageAlerts } from '@/lib/eg-salary-tax-api'
import { formatDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'

export default function MinimumWageAlertCard() {
  const [data, setData] = useState<ApiMinimumWageAlerts | null>(null)

  useEffect(() => {
    let alive = true
    fetchMinimumWageAlerts().then((next) => { if (alive) setData(next) }).catch(() => { if (alive) setData(null) })
    return () => { alive = false }
  }, [])

  if (!data || !data.employees.length) return null
  return (
    <div className="card space-y-3" data-minimum-wage-alerts>
      <div>
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <AlertTriangle size={20} className="text-amber-600" />
          موظفين تحت الحد الأدنى للأجور ({data.employees.length})
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          إجمالي الراتب الشهري (المكونات الثابتة) أقل من الحد الأدنى لدولة الفرع بتاريخ {formatDate(data.asOf)} — للعلم بس، النظام مابيغيّرش راتب.
        </p>
      </div>
      {data.minimums.map((minimum) => (
        <div key={minimum.country} role="status" className="bg-amber-50 text-amber-800 rounded-lg p-3 text-sm">
          الحد الأدنى في مصر {formatMoney(minimum.amount)} في الشهر (ساري من {formatDate(minimum.effectiveFrom)})
          {minimum.verified ? '.' : ' — الرقم لسه «محتاج تحقق» في حزمة الدولة.'}
        </div>
      ))}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="table-header text-right">الموظف</th>
              <th className="table-header text-right">الفرع</th>
              <th className="table-header text-center">الإجمالي الشهري</th>
              <th className="table-header text-center">الحد الأدنى</th>
              <th className="table-header text-center">الفرق</th>
            </tr>
          </thead>
          <tbody>
            {data.employees.map((row) => (
              <tr key={row.employeeId} className="border-t border-gray-100">
                <td className="table-cell">{row.fullName}{row.employeeCode ? <span className="text-xs text-gray-500" dir="ltr"> · {row.employeeCode}</span> : null}</td>
                <td className="table-cell">{row.branchName}</td>
                <td className="table-cell text-center font-mono">{formatMoney(row.gross)}</td>
                <td className="table-cell text-center font-mono">{formatMoney(row.minimum)}</td>
                <td className="table-cell text-center font-mono font-bold text-red-700">{formatMoney(row.shortfall)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
