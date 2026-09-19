'use client'

import { useState } from 'react'
import Link from 'next/link'
import { downloadCsv } from '@/lib/csv'
import { useCurrency } from '@/lib/currency'
import { formatMoney } from '@/lib/money'
import { fetchPayrollRegister, minutesAsHours, nonZero, PAY_METHOD_LABELS, type ColumnDef, type PayrollRegisterReport, type RegisterRow } from '../_financial/api'
import { EmptyState, FinancialReportShell, StatCard, Th, useFinancialReport } from '../_financial/ReportShell'

// عمود في الكشف: عنوانه وقيمته في الصف وفي الإجمالي
interface Column { key: string; label: string; cell: (row: RegisterRow) => string; total: (report: PayrollRegisterReport) => string; money: boolean; tone?: string }

function columnsOf(report: PayrollRegisterReport, hideEmpty: boolean): Column[] {
  const keep = (total: string) => !hideEmpty || nonZero(total)
  const dynamic = (defs: ColumnDef[], pick: (row: RegisterRow) => Record<string, string>, totals: Record<string, string>, tone?: string) =>
    defs.filter((def) => keep(def.total)).map((def): Column => ({ key: def.key, label: def.label, cell: (row) => pick(row)[def.key] ?? '0.00',
      total: () => totals[def.key] ?? '0.00', money: true, tone }))
  const t = report.totals
  return [
    { key: 'basic', label: 'الأساسي', cell: (row) => row.basic, total: () => t.basic, money: true },
    ...dynamic(report.columns.allowanceBuckets, (row) => row.allowanceBuckets, t.allowanceBuckets),
    ...dynamic(report.columns.additions, (row) => row.additions, t.additions),
    ...(keep(t.overtime) ? [{ key: 'overtime', label: 'الإضافي', cell: (row: RegisterRow) => row.overtime, total: () => t.overtime, money: true }] : []),
    ...(keep(t.holidayWork) ? [{ key: 'holidayWork', label: 'بدل دوام أيام العطلات', cell: (row: RegisterRow) => row.holidayWork, total: () => t.holidayWork, money: true }] : []),
    { key: 'gross', label: 'الإجمالي', cell: (row) => row.gross, total: () => t.gross, money: true, tone: 'font-bold' },
    ...dynamic(report.columns.deductions, (row) => row.deductions, t.deductions, 'text-danger-600'),
    { key: 'totalDeductions', label: 'إجمالي الخصومات', cell: (row) => row.totalDeductions, total: () => t.totalDeductions, money: true, tone: 'text-danger-600 font-bold' },
    { key: 'net', label: 'الصافي', cell: (row) => row.net, total: () => t.net, money: true, tone: 'font-bold' },
    { key: 'bank', label: 'بنك', cell: (row) => row.bank, total: () => t.bank, money: true },
    { key: 'cash', label: 'نقدي', cell: (row) => row.cash, total: () => t.cash, money: true },
  ]
}

// «تقرير الرواتب» (كشف الرواتب): سطر لكل موظف في كل مسير للشهر — الأساسي وكل بند بدل والإضافات والإضافي، والإجمالي،
// وكل نوع خصم، والصافي وتقسيمه بنك/نقدي. الإجمالي في آخر الجدول.
export default function PayrollRegisterPage() {
  const currency = useCurrency()
  const { filters, setFilters, report, loading, error, reload } = useFinancialReport(fetchPayrollRegister)
  const [hideEmpty, setHideEmpty] = useState(true)
  const columns = report ? columnsOf(report, hideEmpty) : []
  const multiRun = !!report && report.runs.length > 1

  const exportCsv = () => {
    if (!report) return
    // الملف فيه كل الأعمدة (حتى الفاضية) عشان يتطابق شهر مع شهر في Excel
    const all = columnsOf(report, false)
    const header = ['الكود', 'الموظف', 'الفرع', 'القسم', 'مركز التكلفة', 'المسير', 'طريقة الصرف', ...all.map((column) => column.label), 'دقائق الإضافي']
    const rows: unknown[][] = report.rows.map((row) => [row.employeeCode ?? '', row.fullName ?? '', row.branchName ?? '', row.departmentName ?? '',
      row.costCenterName ?? '', row.runName || `#${row.runId}`, PAY_METHOD_LABELS[row.payMethod] ?? row.payMethod, ...all.map((column) => column.cell(row)), row.overtimeMinutes])
    rows.push(['', `الإجمالي (${report.totals.headcount} موظف)`, '', '', '', '', '', ...all.map((column) => column.total(report)), report.totals.overtimeMinutes])
    downloadCsv(`payroll-register-${report.period}.csv`, header, rows)
  }

  return (
    <FinancialReportShell
      title="تقرير الرواتب"
      description="كشف الرواتب لكل موظف: الأساسي والبدلات والإضافي والخصومات بأنواعها والصافي وطريقة الصرف"
      filters={filters}
      setFilters={setFilters}
      header={report}
      loading={loading}
      error={error}
      onRefresh={reload}
      onExport={exportCsv}
      exportDisabled={!report || report.rows.length === 0}
      note="البنك والنقدي بطريقة الصرف الحالية في ملف الموظف."
    >
      {report && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard label="الموظفين" value={report.totals.headcount} />
            <StatCard label="إجمالي المستحق" value={`${formatMoney(report.totals.gross)} ${currency}`} />
            <StatCard label="إجمالي الخصومات" value={`${formatMoney(report.totals.totalDeductions)} ${currency}`} />
            <StatCard label="صافي الرواتب" value={`${formatMoney(report.totals.net)} ${currency}`} />
            <StatCard label="طريقة الصرف" value={
              <span className="block text-base leading-7">
                بنك: <span dir="ltr">{formatMoney(report.totals.bank)}</span>
                <br />
                نقدي: <span dir="ltr">{formatMoney(report.totals.cash)}</span>
              </span>
            } />
          </div>

          {report.rows.length === 0 ? (
            <EmptyState text={`مفيش بنود رواتب ${report.includeDraft ? '' : 'معتمدة أو مصروفة '}في الشهر ده بالفلاتر دي`} />
          ) : (
            <div className="card p-0">
              <div className="flex items-center justify-between p-3 border-b border-gray-100 fr-no-print">
                <span className="text-sm text-gray-500">{report.rows.length} سطر — {report.totals.headcount} موظف</span>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} />
                  اخفي الأعمدة اللي كلها أصفار
                </label>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <Th>الكود</Th>
                      <Th>الموظف</Th>
                      <Th>الفرع</Th>
                      <Th>القسم</Th>
                      {multiRun && <Th>المسير</Th>}
                      {columns.map((column) => <Th key={column.key}>{column.label}</Th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((row) => (
                      <tr key={`${row.runId}-${row.employeeId}`} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="p-3 text-gray-500 whitespace-nowrap" dir="ltr">{row.employeeCode ?? '—'}</td>
                        <td className="p-3 whitespace-nowrap">
                          <Link href={`/employees/${row.employeeId}`} className="text-primary-600 hover:underline">{row.fullName ?? `#${row.employeeId}`}</Link>
                        </td>
                        <td className="p-3 whitespace-nowrap">{row.branchName ?? '—'}</td>
                        <td className="p-3 whitespace-nowrap">{row.departmentName ?? '—'}</td>
                        {multiRun && <td className="p-3 whitespace-nowrap">{row.runName || `#${row.runId}`}</td>}
                        {columns.map((column) => (
                          <td key={column.key} className={`p-3 whitespace-nowrap ${column.tone ?? ''}`} dir="ltr">
                            {column.key === 'overtime' && row.overtimeMinutes > 0
                              ? <span title={`${row.overtimeMinutes} دقيقة`}>{formatMoney(column.cell(row))}</span>
                              : formatMoney(column.cell(row))}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-bold text-gray-800">
                    <tr className="border-t border-gray-200">
                      <td className="p-3" colSpan={multiRun ? 5 : 4}>الإجمالي ({report.totals.headcount} موظف)</td>
                      {columns.map((column) => (
                        <td key={column.key} className={`p-3 whitespace-nowrap ${column.tone ?? ''}`} dir="ltr">{formatMoney(column.total(report))}</td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>
              {report.totals.overtimeMinutes > 0 && (
                <p className="p-3 text-xs text-gray-500 border-t border-gray-100">
                  دقائق الإضافي في الشهر: {report.totals.overtimeMinutes} دقيقة (<span dir="ltr">{minutesAsHours(report.totals.overtimeMinutes)}</span> ساعة)
                </p>
              )}
            </div>
          )}
        </>
      )}
    </FinancialReportShell>
  )
}
