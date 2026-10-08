'use client'
// B4.4 (د): صندوق التدريب المصري — تقرير سنوي بتكلفة المنشأة (مش خصم من الموظف ولا بند في القسيمة). بيظهر لحساب بكل الفروع لو فيه فروع في مصر.
import { useEffect, useState } from 'react'
import { AlertTriangle, GraduationCap } from 'lucide-react'
import { fetchEgTrainingFund, type ApiEgTrainingFund } from '@/lib/eg-salary-tax-api'
import { formatDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'

export default function EgTrainingFundCard() {
  const [data, setData] = useState<ApiEgTrainingFund | null>(null)

  useEffect(() => {
    let alive = true
    // حساب فرع (403) أو تعذر التحميل: الكارت مابيظهرش
    fetchEgTrainingFund().then((next) => { if (alive) setData(next) }).catch(() => { if (alive) setData(null) })
    return () => { alive = false }
  }, [])

  if (!data || (data.available && !data.entities.length)) return null
  return (
    <div className="card space-y-3" data-eg-training-fund>
      <div>
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <GraduationCap size={20} className="text-primary-600" />
          صندوق التدريب (مصر) — {data.year}
        </h2>
        <p className="text-sm text-gray-500 mt-1">تكلفة سنوية على المنشأة — مش خصم من الموظف ولا بند في القسيمة. عدد الموظفين بتاريخ {formatDate(data.headcountAsOf)}.</p>
      </div>
      {!data.available || !data.rule ? (
        <div role="status" className="bg-amber-50 text-amber-800 rounded-lg p-3 text-sm">{data.message}</div>
      ) : (
        <>
          <div role="status" className="bg-amber-50 text-amber-800 rounded-lg p-3 text-sm flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>
              {formatMoney(data.rule.perEmployee)} للموظف في السنة ({data.rule.pct}% من الحد الأدنى لأجر التأمين {formatMoney(data.rule.minInsuranceWage)}، بين {formatMoney(data.rule.minAmount)} و{formatMoney(data.rule.maxAmount)})
              للمنشأة اللي فيها {data.rule.minHeadcount} موظف وأكتر{data.rule.verified ? '.' : ' — الأرقام لسه «محتاجة تحقق» في حزمة الدولة.'}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="table-header text-right">المنشأة</th>
                  <th className="table-header text-center">عدد الموظفين</th>
                  <th className="table-header text-center">ينطبق؟</th>
                  <th className="table-header text-center">المبلغ السنوي</th>
                </tr>
              </thead>
              <tbody>
                {data.entities.map((entity) => (
                  <tr key={entity.entityId ?? 'none'} className="border-t border-gray-100">
                    <td className="table-cell">{entity.name}</td>
                    <td className="table-cell text-center font-mono">{entity.headcount}</td>
                    <td className="table-cell text-center">{entity.applies ? 'أيوه' : `لأ (أقل من ${data.rule?.minHeadcount})`}</td>
                    <td className="table-cell text-center font-mono font-bold">{formatMoney(entity.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 font-bold">
                  <td className="table-cell" colSpan={3}>الإجمالي</td>
                  <td className="table-cell text-center font-mono">{formatMoney(data.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
