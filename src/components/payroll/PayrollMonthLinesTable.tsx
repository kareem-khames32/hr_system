'use client'

// كل بنود الشهر لكل موظف (طلب المالك 19 سبتمبر) — قراءة بس:
// تابة «البدلات» بتعرض كل بنود الاستحقاق اللي داخلة مسيرات الشهر (مش البدلات اليدوية بس)، وتابة «الاستقطاعات» كل بنود الاستقطاع.
// صف لكل موظف في كل مسير محسوب، وعمود لكل بند موجود فعلًا باسمه (نفس تقسيم جدول المسير والقسيمة)، والنطاق (فرع الحساب) مفروض في الباك.

import { useEffect, useState } from 'react'
import EmptyState from '@/components/EmptyState'
import { formatMoney, formatMoneyOrDash, sumMoney } from '@/lib/money'
import {
  fetchPayrollMonthLines, PAYROLL_LINE_TOTAL_LABELS, payrollLineAmount, payrollLineColumnTotals,
  type PayrollLineSide, type PayrollMonthLines,
} from '@/lib/payroll-lines-api'

const RUN_STATUS: Record<string, string> = { DRAFT: 'مسودة', CALCULATED: 'محسوب', IN_REVIEW: 'قيد المراجعة', APPROVED: 'معتمد', PAID: 'مصروف', CANCELLED: 'ملغى' }
const runLabel = (id: number, name: string | null) => name ? `${name} (#${id})` : `مسير #${id}`
const TITLES: Record<PayrollLineSide, { title: string; hint: string; empty: string }> = {
  earnings: { title: 'كل بنود الاستحقاق للشهر', hint: 'كل اللي داخل مسيرات الشهر المحسوبة لكل موظف: الأساسي ومكونات الراتب والإضافي وبدل العطلات وكل بدل ومكافأة باسمه.',
    empty: 'مفيش مسيرات محسوبة للشهر ده' },
  deductions: { title: 'كل بنود الاستقطاع للشهر', hint: 'كل خصم داخل مسيرات الشهر المحسوبة لكل موظف: الحضور والإجازة والإيقاف والمرضية وكل نوع خصم باسمه والسلف والتأمينات.',
    empty: 'مفيش استقطاعات في مسيرات الشهر ده' },
}

export function PayrollMonthLinesTable({ side, period, matches, onOpenRun, version = 0 }: {
  side: PayrollLineSide
  period: string
  matches: (row: { fullName: string; employeeCode: string }) => boolean
  onOpenRun: (runId: number) => void
  version?: number
}) {
  const [data, setData] = useState<PayrollMonthLines | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const validPeriod = /^\d{4}-(0[1-9]|1[0-2])$/.test(period)
  useEffect(() => {
    if (!validPeriod) return
    let cancelled = false
    setLoading(true)
    setError('')
    fetchPayrollMonthLines(period)
      .then(result => { if (!cancelled) setData(result) })
      .catch(e => { if (!cancelled) { setData(null); setError(e instanceof Error && e.message ? e.message : 'تعذر تحميل بنود الشهر') } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [period, version, validPeriod])

  // لحد ما شهر الرواتب الجاري يتعرف (الشهر فاضي) ما نعرضش جدول فاضي
  if (!validPeriod) return null
  const text = TITLES[side]
  const columns = data?.columns[side] ?? []
  // صفوف الموظفين اللي عندهم بنود في المجموعة دي بس (الاستقطاعات: اللي اتخصم منه حاجة)
  const rows = (data?.rows ?? []).filter(row => row.totals[side] !== 0 && matches(row))
  const columnTotals = payrollLineColumnTotals(rows, side, columns)
  const tone = side === 'earnings' ? 'text-success-700' : 'text-danger-600'

  return (
    <div className="card p-0 overflow-hidden" data-payroll-month-lines={side}>
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-800">{text.title}</h3>
        <p className="text-xs text-gray-500">{text.hint} قراءة بس — التعديل من مصدر كل بند.</p>
      </div>
      {loading ? (
        <div className="flex justify-center py-10"><div className="w-7 h-7 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : error ? <p className="p-4 text-sm text-danger-600">{error}</p> : rows.length === 0 ? (
        <EmptyState title={data?.rows.length ? (side === 'deductions' ? 'مفيش استقطاعات مطابقة' : 'مفيش بنود مطابقة') : text.empty} className="shadow-none" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="table-header">
              <th className="table-cell text-right">الموظف</th><th className="table-cell text-right">الفرع / القسم</th>
              {columns.map(column => <th key={column.key} className="table-cell text-center whitespace-nowrap">{column.name}</th>)}
              <th className="table-cell text-center whitespace-nowrap">{PAYROLL_LINE_TOTAL_LABELS[side]}</th>
              <th className="table-cell text-right">المسير</th>
            </tr></thead>
            <tbody>
              {rows.map(row => (
                <tr key={`${row.runId}:${row.employeeId}`} className="table-row">
                  <td className="table-cell"><div className="font-medium text-gray-800">{row.fullName}</div><div className="text-xs text-gray-400">{row.employeeCode}</div></td>
                  <td className="table-cell text-sm">{row.branchName ?? '—'}{row.departmentName ? ` / ${row.departmentName}` : ''}</td>
                  {columns.map(column => <td key={column.key} className="table-cell text-center font-mono">{formatMoneyOrDash(payrollLineAmount(row[side], column.key))}</td>)}
                  <td className={`table-cell text-center font-mono font-bold ${tone}`}>{formatMoney(row.totals[side])}</td>
                  <td className="table-cell">
                    <button type="button" className="text-primary-600 hover:underline" onClick={() => onOpenRun(row.runId)}>{runLabel(row.runId, row.runName)}</button>
                    <span className="text-xs text-gray-500 mr-1">({RUN_STATUS[row.runStatus] ?? row.runStatus})</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-bold">
                <td className="table-cell" colSpan={2}>الإجمالي ({rows.length} موظف)</td>
                {columns.map(column => <td key={column.key} className="table-cell text-center font-mono">{formatMoney(columnTotals[column.key])}</td>)}
                <td className={`table-cell text-center font-mono ${tone}`}>{formatMoney(sumMoney(rows.map(row => row.totals[side])))}</td>
                <td className="table-cell" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

export default PayrollMonthLinesTable
