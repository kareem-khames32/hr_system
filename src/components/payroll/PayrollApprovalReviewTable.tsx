'use client'

// مراجعة المعتمد للمسير المنتظر عنده (سلسلة اعتماد المسير): إجماليات المسير وجدول موظفيه باستحقاقاتهم واستقطاعاتهم وصافيهم، وبنود كل موظف بأسمائها.
// قراءة فقط — الأرقام من الخادم (نفس تقسيم بنود المسير)، والعرض بـformatMoney.
import { Fragment, useState } from 'react'
import { formatMoney } from '../../lib/money'
import { currencyLabel, currencyName } from '../../lib/currency'
import type { PayrollApprovalReview } from '../../lib/payroll-approval-chain-api'

// B1.1: مسير فيه فرعين بعملتين ← إجماليات لكل عملة لوحدها بعنوانها (من الخادم)، مفيش رقم بيجمع جنيه على ريال
export function PayrollApprovalReviewTotals({ totals, byCurrency }: { totals: PayrollApprovalReview['totals']; byCurrency?: PayrollApprovalReview['byCurrency'] }) {
  if (byCurrency && byCurrency.length > 1) return (
    <div className="space-y-3" data-review-totals>
      {byCurrency.map(group => (
        <div key={group.currency} className="space-y-2" data-currency-total={group.currency}>
          <p className="text-sm font-bold text-gray-700">{currencyName(group.currency)} ({currencyLabel(group.currency)})</p>
          <ReviewTotals totals={group.totals} />
        </div>
      ))}
    </div>
  )
  return <ReviewTotals totals={totals} marker />
}

function ReviewTotals({ totals, marker = false }: { totals: PayrollApprovalReview['totals']; marker?: boolean }) {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-review-totals={marker || undefined}>
        <div className="rounded-xl bg-gray-50 p-3"><p className="text-xs text-gray-500">الموظفين</p><p className="text-lg font-bold text-gray-800">{totals.employees}</p></div>
        <div className="rounded-xl bg-gray-50 p-3"><p className="text-xs text-gray-500">إجمالي الاستحقاقات</p><p className="text-lg font-bold text-gray-800" dir="ltr">{formatMoney(totals.earnings)}</p></div>
        <div className="rounded-xl bg-gray-50 p-3"><p className="text-xs text-gray-500">إجمالي الاستقطاعات</p><p className="text-lg font-bold text-danger-600" dir="ltr">{formatMoney(totals.deductions)}</p></div>
        <div className="rounded-xl bg-gray-50 p-3"><p className="text-xs text-gray-500">الصافي</p><p className="text-lg font-bold text-success-600" dir="ltr">{formatMoney(totals.net)}</p></div>
      </div>
      {totals.negativeNet > 0 && <p role="alert" className="rounded-xl bg-red-50 text-red-700 text-sm p-3">صافي {totals.negativeNet} موظف سالب — الاعتماد النهائي هيترفض لحد ما يتصحح ويتعاد الحساب.</p>}
    </>
  )
}

export function PayrollApprovalReviewTable({ rows, initialOpenItemId = null }: { rows: PayrollApprovalReview['rows']; initialOpenItemId?: number | null }) {
  const [detailOf, setDetailOf] = useState<number | null>(initialOpenItemId)
  // B1.1: موظفين بعملتين ← علامة العملة جنب الصافي
  const multi = new Set(rows.map(row => row.currency ?? '')).size > 1
  return (
    <div className="overflow-x-auto max-h-[28rem] overflow-y-auto rounded-xl border border-gray-100">
      <table className="w-full text-sm" data-review-table>
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            {['الرقم الوظيفي', 'الموظف', 'القسم', 'الاستحقاقات', 'الاستقطاعات', 'الصافي', ''].map((title, index) => (
              <th key={index} className={`px-3 py-2 ${index >= 3 && index <= 5 ? 'text-center' : 'text-right'} font-medium text-gray-600 whitespace-nowrap`}>{title}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(row => (
            <Fragment key={row.itemId}>
              <tr className={row.net < 0 ? 'bg-red-50' : undefined}>
                <td className="px-3 py-2 font-mono text-xs text-gray-600" dir="ltr">{row.employeeCode}</td>
                <td className="px-3 py-2 font-medium text-gray-800">{row.fullName}{row.settlementPayout && <span className="block text-xs text-sky-700">مصروف مع التصفية</span>}</td>
                <td className="px-3 py-2 text-gray-600">{[row.branchName, row.departmentName].filter(Boolean).join(' — ') || '—'}</td>
                <td className="px-3 py-2 text-center" dir="ltr">{formatMoney(row.earnings)}</td>
                <td className="px-3 py-2 text-center text-danger-600" dir="ltr">{formatMoney(row.deductions)}</td>
                <td className="px-3 py-2 text-center font-bold text-gray-800" dir="ltr">{formatMoney(row.net)}{multi && row.currency ? <span className="text-xs font-normal text-gray-400"> {currencyLabel(row.currency)}</span> : null}</td>
                <td className="px-3 py-2 text-left">
                  <button type="button" className="text-xs text-primary-700 underline" onClick={() => setDetailOf(detailOf === row.itemId ? null : row.itemId)}>
                    {detailOf === row.itemId ? 'اقفل البنود' : 'البنود'}
                  </button>
                </td>
              </tr>
              {detailOf === row.itemId && (
                <tr className="bg-gray-50">
                  <td colSpan={7} className="px-3 py-2 text-xs text-gray-700">
                    <span className="font-medium text-gray-800">الاستحقاقات: </span>
                    {row.earningLines.map(line => `${line.name} ${formatMoney(line.amount)}`).join(' • ') || '—'}
                    <span className="font-medium text-gray-800 mr-4">الاستقطاعات: </span>
                    {row.deductionLines.map(line => `${line.name} ${formatMoney(line.amount)}`).join(' • ') || '—'}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
