'use client'

import Link from 'next/link'
import { downloadCsv } from '@/lib/csv'
import { currencyLabel, useCurrency } from '@/lib/currency'
import { currencyTotalRows, moneyByCurrency } from '@/lib/currency-totals'
import { formatMoney } from '@/lib/money'
import { fetchOvertimePayReport, minutesAsHours, nonZero } from '../_financial/api'
import { EmptyState, FinancialReportShell, StatCard, Th, useFinancialReport } from '../_financial/ReportShell'

// «تقرير الإضافي»: الإضافي المعتمد اللي دخل مسيرات الشهر — الدقائق والمبلغ لكل موظف ولكل قسم.
export default function OvertimePayReportPage() {
  const currency = useCurrency()
  const { filters, setFilters, report, loading, error, reload } = useFinancialReport(fetchOvertimePayReport)
  const holiday = !!report && nonZero(report.totals.holidayWork)
  // B1.1: فروع بعملتين ← عمود العملة وسطر إجمالي لكل عملة
  const perCurrency = report ? currencyTotalRows(report.byCurrency) : []
  const footers = !report ? [] : perCurrency.length ? perCurrency.map((group) => ({ key: group.currency, label: `الإجمالي ${group.label}`, totals: group.totals }))
    : [{ key: 'all', label: 'الإجمالي', totals: report.totals }]

  const exportCsv = () => {
    if (!report) return
    const header = ['الكود', 'الموظف', 'الفرع', 'القسم', 'العملة', 'عدد أيام الإضافي', 'الدقائق', 'الساعات', 'مبلغ الإضافي', 'بدل دوام أيام العطلات']
    const rows: unknown[][] = report.employees.map((row) => [row.employeeCode ?? '', row.fullName ?? '', row.branchName ?? '', row.departmentName ?? '',
      currencyLabel(row.currency), row.entries, row.minutes, minutesAsHours(row.minutes), row.amount, row.holidayWork])
    for (const { label, totals: t } of footers) {
      rows.push(['', `${label} (${t.employees} موظف)`, '', '', perCurrency.length ? label.replace('الإجمالي ', '') : currencyLabel(report.byCurrency?.[0]?.currency),
        t.entries, t.minutes, minutesAsHours(t.minutes), t.amount, t.holidayWork])
    }
    rows.push([])
    rows.push(['حسب القسم'])
    for (const department of report.departments) {
      rows.push(['', department.name, '', '', department.currency ? currencyLabel(department.currency) : '', department.entries, department.minutes, minutesAsHours(department.minutes), department.amount, department.holidayWork])
    }
    downloadCsv(`overtime-${report.period}.csv`, header, rows)
  }

  return (
    <FinancialReportShell
      title="تقرير الإضافي"
      description="الإضافي المعتمد اللي دخل مسيرات الشهر: الدقائق والمبلغ لكل موظف ولكل قسم"
      filters={filters}
      setFilters={setFilters}
      header={report}
      loading={loading}
      error={error}
      onRefresh={reload}
      onExport={exportCsv}
      exportDisabled={!report || report.employees.length === 0}
      note="الدقائق هي المستحقة المحسوبة في المسير (بعد الاعتماد)."
    >
      {report && (
        report.employees.length === 0 ? (
          <EmptyState text={`مفيش إضافي في مسيرات الشهر ${report.includeDraft ? '' : 'المعتمدة '}بالفلاتر دي`} />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="موظفين ليهم إضافي" value={report.totals.employees} />
              <StatCard label="دقائق الإضافي" value={<>{report.totals.minutes} <span className="text-sm text-gray-500">(<span dir="ltr">{minutesAsHours(report.totals.minutes)}</span> ساعة)</span></>} />
              <StatCard label="مبلغ الإضافي" value={moneyByCurrency(report.byCurrency, (t) => t.amount, report.totals.amount, currency, formatMoney)} />
              <StatCard label="عدد أيام الإضافي" value={report.totals.entries} />
            </div>

            <div className="card p-0">
              <h2 className="text-lg font-bold text-gray-800 p-4 pb-2">حسب القسم</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr><Th>القسم</Th>{perCurrency.length > 0 && <Th>العملة</Th>}<Th>الموظفين</Th><Th>عدد الأيام</Th><Th>الدقائق</Th><Th>الساعات</Th><Th>المبلغ</Th>{holiday && <Th>بدل دوام أيام العطلات</Th>}</tr>
                  </thead>
                  <tbody>
                    {report.departments.map((row) => (
                      <tr key={row.departmentId ?? 'none'} className="border-t border-gray-100">
                        <td className="p-3 font-medium">{row.name}</td>
                        {perCurrency.length > 0 && <td className="p-3">{row.currency ? currencyLabel(row.currency) : 'عملتين'}</td>}
                        <td className="p-3">{row.employees}</td>
                        <td className="p-3">{row.entries}</td>
                        <td className="p-3">{row.minutes}</td>
                        <td className="p-3" dir="ltr">{minutesAsHours(row.minutes)}</td>
                        <td className="p-3 font-bold" dir="ltr">{formatMoney(row.amount)}</td>
                        {holiday && <td className="p-3" dir="ltr">{formatMoney(row.holidayWork)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card p-0">
              <h2 className="text-lg font-bold text-gray-800 p-4 pb-2">حسب الموظف</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <Th>الكود</Th><Th>الموظف</Th><Th>الفرع</Th><Th>القسم</Th>{perCurrency.length > 0 && <Th>العملة</Th>}<Th>عدد الأيام</Th><Th>الدقائق</Th><Th>الساعات</Th><Th>المبلغ</Th>
                      {holiday && <Th>بدل دوام أيام العطلات</Th>}
                    </tr>
                  </thead>
                  <tbody>
                    {report.employees.map((row) => (
                      <tr key={row.employeeId} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="p-3 text-gray-500 whitespace-nowrap" dir="ltr">{row.employeeCode ?? '—'}</td>
                        <td className="p-3 whitespace-nowrap">
                          <Link href={`/employees/${row.employeeId}`} className="text-primary-600 hover:underline">{row.fullName ?? `#${row.employeeId}`}</Link>
                        </td>
                        <td className="p-3 whitespace-nowrap">{row.branchName ?? '—'}</td>
                        <td className="p-3 whitespace-nowrap">{row.departmentName ?? '—'}</td>
                        {perCurrency.length > 0 && <td className="p-3 whitespace-nowrap">{currencyLabel(row.currency)}</td>}
                        <td className="p-3">{row.entries}</td>
                        <td className="p-3">{row.minutes}</td>
                        <td className="p-3" dir="ltr">{minutesAsHours(row.minutes)}</td>
                        <td className="p-3 font-bold" dir="ltr">{formatMoney(row.amount)}</td>
                        {holiday && <td className="p-3" dir="ltr">{formatMoney(row.holidayWork)}</td>}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-bold text-gray-800">
                    {footers.map(({ key, label, totals: t }) => (
                      <tr key={key} className="border-t border-gray-200" data-currency-total={key}>
                        <td className="p-3" colSpan={perCurrency.length ? 5 : 4}>{label} ({t.employees} موظف)</td>
                        <td className="p-3">{t.entries}</td>
                        <td className="p-3">{t.minutes}</td>
                        <td className="p-3" dir="ltr">{minutesAsHours(t.minutes)}</td>
                        <td className="p-3" dir="ltr">{formatMoney(t.amount)}</td>
                        {holiday && <td className="p-3" dir="ltr">{formatMoney(t.holidayWork)}</td>}
                      </tr>
                    ))}
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )
      )}
    </FinancialReportShell>
  )
}
