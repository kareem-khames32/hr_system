'use client'

// صرف الرواتب موظف بموظف — مكوّنات العرض: كروت الإجماليات (تم / لم يتم، بنك / نقدي)، وجدول الموظفين بعلامة «تم الصرف»، وملخص صرف الشهر للمالك.
// كل رقم جاي من الخادم كما هو (نفس دوال كشف البنوك)؛ هنا عرض بـformatMoney فقط، بلا أي حساب.
import { AlertTriangle } from 'lucide-react'
import { formatDateTime } from '../../lib/dates'
import { formatMoney } from '../../lib/money'
import { DISBURSEMENT_MODE_LABELS, type PayrollDisbursementBucket, type PayrollDisbursementRow, type PayrollDisbursementState, type PayrollDisbursementSummary,
  type PayrollDisbursementTotals } from '../../lib/payroll-disbursement-api'

const RUN_STATUS: Record<string, string> = { APPROVED: 'معتمد', PAID: 'مصروف' }
const STATE_STYLE: Record<PayrollDisbursementState, string> = {
  PAID: 'bg-success-50 text-success-700', UNPAID: 'bg-amber-50 text-amber-800', SETTLEMENT: 'bg-sky-50 text-sky-800', NO_AMOUNT: 'bg-gray-100 text-gray-600',
}
const runLabel = (run: { name: string | null; period: string }) => run.name || `مسير ${run.period}`

function TotalCard({ title, bucket, tone }: { title: string; bucket: PayrollDisbursementBucket; tone: string }) {
  return (
    <div className="card">
      <p className="text-sm text-gray-500">{title}</p>
      <p className={`text-2xl font-bold mt-1 ${tone}`} dir="ltr">{formatMoney(bucket.total)}</p>
      <p className="text-xs text-gray-500 mt-1">{bucket.count} موظف • بنك <span dir="ltr" className="font-bold text-primary-700">{formatMoney(bucket.bank)}</span> • نقدي <span dir="ltr" className="font-bold text-success-700">{formatMoney(bucket.cash)}</span></p>
    </div>
  )
}

/** الإجماليات الجارية للمسير كله: تم الصرف / لم يتم / المستحق للصرف (وكل واحد بنك ونقدي)، ومصروف مع التصفية برّه الصرف هنا. */
export function PayrollDisbursementTotalsCards({ totals }: { totals: PayrollDisbursementTotals }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4" data-disbursement-totals>
      <TotalCard title="تم الصرف" bucket={totals.paid} tone="text-success-600" />
      <TotalCard title="لم يتم" bucket={totals.unpaid} tone="text-amber-600" />
      <TotalCard title="المستحق للصرف" bucket={totals.payable} tone="text-gray-800" />
      <div className="card">
        <p className="text-sm text-gray-500">مصروف مع التصفية</p>
        <p className="text-2xl font-bold mt-1 text-sky-700" dir="ltr">{formatMoney(totals.settlement.total)}</p>
        <p className="text-xs text-gray-500 mt-1">{totals.settlement.count} موظف — برّه الصرف هنا عشان مايتصرفش مرتين{totals.noAmount ? ` • ${totals.noAmount} بلا مبلغ` : ''}</p>
      </div>
    </div>
  )
}

/** جدول موظفي المسير: خانة «تم الصرف» للصف القابل للتعليم (لحامل payroll.disburse)، وشارة الحالة لغيره (تصفية / بلا مبلغ / مقفول). */
export function PayrollDisbursementTable({ rows, canMark, disabled, onToggle }: {
  rows: readonly PayrollDisbursementRow[]
  canMark: boolean
  disabled: boolean
  onToggle: (row: PayrollDisbursementRow) => void
}) {
  if (rows.length === 0) return <p className="text-sm text-gray-400">مفيش موظفين بالفلاتر دي</p>
  return (
    <table className="w-full text-sm" data-disbursement-table>
      <thead className="bg-gray-50">
        <tr>
          {['تم الصرف', 'الرقم الوظيفي', 'الموظف', 'القسم / الفريق', 'طريقة الصرف', 'الصافي', 'تحويل بنكي', 'نقدي', 'من علّم ومتى'].map((title, index) => (
            <th key={title} className={`px-3 py-3 ${index >= 5 && index <= 7 ? 'text-center' : 'text-right'} font-medium text-gray-600 whitespace-nowrap`}>{title}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map(row => (
          <tr key={row.itemId} className={row.state === 'PAID' ? 'bg-success-50/40' : undefined} data-disbursement-row={row.state}>
            <td className="px-3 py-2">
              {row.tickable && canMark ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 rounded border-gray-300" checked={row.state === 'PAID'} disabled={disabled} onChange={() => onToggle(row)}
                    aria-label={`تم الصرف — ${row.fullName}`} />
                  <span className={`badge ${STATE_STYLE[row.state]}`}>{row.stateLabel}</span>
                </label>
              ) : <span className={`badge ${STATE_STYLE[row.state]}`}>{row.stateLabel}</span>}
            </td>
            <td className="px-3 py-2 font-mono text-xs text-gray-600" dir="ltr">{row.employeeCode}</td>
            <td className="px-3 py-2 font-medium text-gray-800">
              {row.fullName}
              {row.issue && <span className="flex items-start gap-1 text-xs text-amber-800 mt-0.5"><AlertTriangle size={12} className="mt-0.5 shrink-0" />{row.issue}</span>}
              {row.settlement && <span className="block text-xs text-sky-700">آخر يوم عمل {row.settlement.lastWorkingDay} — راتبه مع التصفية</span>}
            </td>
            <td className="px-3 py-2 text-gray-600">{[row.departmentName, row.teamName].filter(Boolean).join(' / ') || row.branchName || '—'}</td>
            <td className="px-3 py-2 text-gray-600">{row.payMethodLabel}{row.bankName ? <span className="block text-xs text-gray-400">{row.bankName}</span> : null}</td>
            <td className="px-3 py-2 text-center text-gray-800" dir="ltr">{formatMoney(row.netPay)}</td>
            <td className="px-3 py-2 text-center font-bold text-primary-700" dir="ltr">{formatMoney(row.bankAmount)}</td>
            <td className="px-3 py-2 text-center font-bold text-success-700" dir="ltr">{formatMoney(row.cashAmount)}</td>
            <td className="px-3 py-2 text-xs text-gray-600">
              {row.markedBy ? <>{row.markedBy.name ?? 'غير معروف'}{row.markedAt ? <span className="block text-gray-400">{formatDateTime(row.markedAt)}</span> : null}</> : '—'}
              {row.note && <span className="block text-gray-700">{row.note}</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** ملخص صرف الشهر للمالك: لكل مسير تم / لم يتم (عدد وإجمالي) وبنك ونقدي، وسبب الباقي لو الصرف اتقفل من غيرهم، وإجمالي الشهر. */
export function PayrollDisbursementSummaryTable({ summary }: { summary: PayrollDisbursementSummary }) {
  return (
    <table className="w-full text-sm" data-disbursement-summary-table>
      <thead className="bg-gray-50">
        <tr>{['المسير', 'الحالة', 'تم الصرف', 'لم يتم', 'بنك (تم / لم يتم)', 'نقدي (تم / لم يتم)', 'سبب الباقي'].map(title =>
          <th key={title} className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">{title}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {summary.runs.map(run => (
          <tr key={run.id}>
            <td className="px-3 py-2 font-medium text-gray-800">{runLabel(run)}</td>
            <td className="px-3 py-2 text-gray-600">{RUN_STATUS[run.status] ?? run.status} — {DISBURSEMENT_MODE_LABELS[run.mode]}</td>
            <td className="px-3 py-2 text-success-700"><span dir="ltr" className="font-bold">{formatMoney(run.paid.total)}</span> ({run.paid.count})</td>
            <td className="px-3 py-2 text-amber-700"><span dir="ltr" className="font-bold">{formatMoney(run.unpaid.total)}</span> ({run.unpaid.count})</td>
            <td className="px-3 py-2 text-gray-700" dir="ltr">{formatMoney(run.paid.bank)} / {formatMoney(run.unpaid.bank)}</td>
            <td className="px-3 py-2 text-gray-700" dir="ltr">{formatMoney(run.paid.cash)} / {formatMoney(run.unpaid.cash)}</td>
            <td className="px-3 py-2 text-xs text-gray-600">{run.unpaidReason ?? '—'}</td>
          </tr>
        ))}
        <tr className="bg-gray-50 font-bold">
          <td className="px-3 py-2" colSpan={2}>إجمالي الشهر</td>
          <td className="px-3 py-2 text-success-700"><span dir="ltr">{formatMoney(summary.totals.paid.total)}</span> ({summary.totals.paid.count})</td>
          <td className="px-3 py-2 text-amber-700"><span dir="ltr">{formatMoney(summary.totals.unpaid.total)}</span> ({summary.totals.unpaid.count})</td>
          <td className="px-3 py-2" dir="ltr">{formatMoney(summary.totals.paid.bank)} / {formatMoney(summary.totals.unpaid.bank)}</td>
          <td className="px-3 py-2" dir="ltr">{formatMoney(summary.totals.paid.cash)} / {formatMoney(summary.totals.unpaid.cash)}</td>
          <td className="px-3 py-2" />
        </tr>
      </tbody>
    </table>
  )
}
