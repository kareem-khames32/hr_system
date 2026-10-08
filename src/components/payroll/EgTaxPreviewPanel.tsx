'use client'
// B4.4 (أ): معاينة ضريبة كسب العمل المصرية لمسير — عند الطلب، وقراءة بس: الأرقام مابتتخزنش ولا بتتخصم من المسير.
// بتظهر لموظفي الفروع اللي دولتها مصر. الشرائح من «حزمة الدولة» ولسه «محتاجة تحقق» لحد ما محاسب يراجعها.
import { useEffect, useState } from 'react'
import { AlertTriangle, Calculator } from 'lucide-react'
import { fetchEgTaxPreview, type ApiEgTaxPreview } from '@/lib/eg-salary-tax-api'
import { formatDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'

export default function EgTaxPreviewPanel({ runId }: { runId: number }) {
  const [data, setData] = useState<ApiEgTaxPreview | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // مسير تاني = معاينة جديدة
  useEffect(() => { setData(null); setError('') }, [runId])

  async function load() {
    setBusy(true); setError('')
    try { setData(await fetchEgTaxPreview(runId)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر تحميل المعاينة') }
    finally { setBusy(false) }
  }

  return (
    <div className="rounded-xl border border-gray-200 p-4 my-4" data-eg-tax-preview>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="font-bold text-gray-800 flex items-center gap-2">
            <Calculator size={18} className="text-primary-600" />
            معاينة ضريبة كسب العمل (مصر)
          </h4>
          <p className="text-sm text-gray-500 mt-1">حساب عند الطلب لموظفي فروع مصر — مابيتخصمش من المسير ومابيتخزنش</p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => void load()} disabled={busy}>
          {busy ? 'جاري الحساب…' : data ? 'إعادة الحساب' : 'احسب المعاينة'}
        </button>
      </div>
      {error && <div role="alert" className="bg-red-50 text-red-700 rounded-lg p-3 mt-3 text-sm">{error}</div>}
      {data && !data.available && <div role="status" className="bg-amber-50 text-amber-800 rounded-lg p-3 mt-3 text-sm">{data.message}</div>}
      {data?.available && data.table && (
        <div className="mt-3 space-y-3">
          <div role="status" className="bg-amber-50 text-amber-800 rounded-lg p-3 text-sm flex items-start gap-2" data-eg-tax-warning>
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>
              الشرائح السارية من {formatDate(data.table.effectiveFrom)} (إعفاء شخصي {formatMoney(data.table.exemption)} في السنة، سنة {data.table.yearDays} يوم)
              {data.table.verified ? '.' : ' — لسه «محتاجة تحقق» من محاسب في حزمة الدولة.'} الحساب على أساس إن الضريبة بتبدأ من الفترة دي.
            </span>
          </div>
          {!data.rows.length ? (
            <p className="text-sm text-gray-500">مفيش موظفين من فروع مصر في المسير ده.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="table-header text-right">الموظف</th>
                    <th className="table-header text-center">صافي الدخل الخاضع</th>
                    <th className="table-header text-center">الأيام</th>
                    <th className="table-header text-center">الوعاء السنوي</th>
                    <th className="table-header text-center">ضريبة السنة</th>
                    <th className="table-header text-center">ضريبة الفترة</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={row.itemId} className="border-t border-gray-100" data-eg-tax-row={row.employeeId}>
                      <td className="table-cell">
                        {row.employeeName}
                        {row.employeeCode && <span className="text-xs text-gray-400 mr-2">{row.employeeCode}</span>}
                      </td>
                      <td className="table-cell text-center font-mono">{formatMoney(row.netIncome)}</td>
                      <td className="table-cell text-center font-mono">{row.days}</td>
                      <td className="table-cell text-center font-mono">{formatMoney(row.taxable)}</td>
                      <td className="table-cell text-center font-mono">{formatMoney(row.annualTax)}</td>
                      <td className="table-cell text-center font-mono font-bold">{formatMoney(row.tax)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 font-bold">
                    <td className="table-cell">الإجمالي</td>
                    <td className="table-cell text-center font-mono">{formatMoney(data.totals.netIncome)}</td>
                    <td className="table-cell" colSpan={3} />
                    <td className="table-cell text-center font-mono">{formatMoney(data.totals.tax)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
