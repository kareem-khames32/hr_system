'use client'

import { useState } from 'react'
import Link from 'next/link'
import { downloadCsv } from '@/lib/csv'
import { useCurrency } from '@/lib/currency'
import { formatMoney } from '@/lib/money'
import { fetchDeductionsReport, nonZero } from '../_financial/api'
import { EmptyState, FinancialReportShell, StatCard, Th, useFinancialReport } from '../_financial/ReportShell'

// «تقرير الخصومات»: خصومات الشهر بالنوع (تأخير، غياب، بدون راتب، إيقاف، مرضية، سلف، جزاءات، عهدة، تأمينات) وبالموظف.
export default function DeductionsReportPage() {
  const currency = useCurrency()
  const { filters, setFilters, report, loading, error, reload } = useFinancialReport(fetchDeductionsReport)
  const [hideEmpty, setHideEmpty] = useState(true)
  const kinds = report ? report.kinds.filter((kind) => !hideEmpty || nonZero(kind.amount)) : []

  const exportCsv = () => {
    if (!report) return
    const header = ['الكود', 'الموظف', 'الفرع', 'القسم', ...report.kinds.map((kind) => kind.label), 'إجمالي الخصومات']
    const rows: unknown[][] = report.employees.map((row) => [row.employeeCode ?? '', row.fullName ?? '', row.branchName ?? '', row.departmentName ?? '',
      ...report.kinds.map((kind) => row.amounts[kind.key] ?? '0.00'), row.total])
    rows.push(['', `الإجمالي (${report.totals.employees} موظف)`, '', '', ...report.kinds.map((kind) => kind.amount), report.totals.amount])
    downloadCsv(`deductions-${report.period}.csv`, header, rows)
  }

  return (
    <FinancialReportShell
      title="تقرير الخصومات"
      description="خصومات الشهر بالنوع وبالموظف، زي ما اتخصمت فعلًا في المسير"
      filters={filters}
      setFilters={setFilters}
      header={report}
      loading={loading}
      error={error}
      onRefresh={reload}
      onExport={exportCsv}
      exportDisabled={!report || report.employees.length === 0}
      note="المحسوب هنا هو اللي اتخصم فعلًا في الشهر؛ الباقي اللي هيتخصم الشهر الجاي مش داخل."
    >
      {report && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="إجمالي الخصومات" value={`${formatMoney(report.totals.amount)} ${currency}`} />
            <StatCard label="موظفين عليهم خصم" value={report.totals.employees} />
            <StatCard label="أنواع الخصم في الشهر" value={report.kinds.filter((kind) => nonZero(kind.amount)).length} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card p-0 lg:col-span-1">
              <h2 className="text-lg font-bold text-gray-800 p-4 pb-2">حسب النوع</h2>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr><Th>النوع</Th><Th>المبلغ</Th><Th>الموظفين</Th></tr>
                </thead>
                <tbody>
                  {report.kinds.map((kind) => (
                    <tr key={kind.key} className={`border-t border-gray-100 ${nonZero(kind.amount) ? '' : 'text-gray-400'}`}>
                      <td className="p-3">{kind.label}</td>
                      <td className="p-3" dir="ltr">{formatMoney(kind.amount)}</td>
                      <td className="p-3">{kind.employees}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-bold">
                  <tr className="border-t border-gray-200">
                    <td className="p-3">الإجمالي</td>
                    <td className="p-3" dir="ltr">{formatMoney(report.totals.amount)}</td>
                    <td className="p-3">{report.totals.employees}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="lg:col-span-2 space-y-4">
              <div className="card p-0">
                <h2 className="text-lg font-bold text-gray-800 p-4 pb-2">الخصومات والجزاءات حسب نوع الخصم</h2>
                {report.typedByType.length === 0 ? <p className="p-4 pt-0 text-sm text-gray-400">مفيش خصومات بقرار في الشهر ده</p> : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600"><tr><Th>نوع الخصم</Th><Th>المبلغ</Th><Th>الموظفين</Th></tr></thead>
                    <tbody>
                      {report.typedByType.map((row) => (
                        <tr key={row.name} className="border-t border-gray-100">
                          <td className="p-3">{row.name}</td><td className="p-3" dir="ltr">{formatMoney(row.amount)}</td><td className="p-3">{row.employees}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="card p-0">
                <h2 className="text-lg font-bold text-gray-800 p-4 pb-2">الخصومات الأخرى حسب السبب</h2>
                {report.otherByCategory.length === 0 ? <p className="p-4 pt-0 text-sm text-gray-400">مفيش خصومات أخرى في الشهر ده</p> : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600"><tr><Th>السبب</Th><Th>المبلغ</Th><Th>الموظفين</Th></tr></thead>
                    <tbody>
                      {report.otherByCategory.map((row) => (
                        <tr key={row.name} className="border-t border-gray-100">
                          <td className="p-3">{row.name}</td><td className="p-3" dir="ltr">{formatMoney(row.amount)}</td><td className="p-3">{row.employees}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {report.employees.length === 0 ? (
            <EmptyState text="مفيش خصومات على أي موظف في الشهر ده بالفلاتر دي" />
          ) : (
            <div className="card p-0">
              <div className="flex items-center justify-between p-3 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-800">حسب الموظف</h2>
                <label className="flex items-center gap-2 text-sm text-gray-700 fr-no-print">
                  <input type="checkbox" checked={hideEmpty} onChange={(e) => setHideEmpty(e.target.checked)} />
                  اخفي الأنواع اللي كلها أصفار
                </label>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <Th>الكود</Th><Th>الموظف</Th><Th>الفرع</Th><Th>القسم</Th>
                      {kinds.map((kind) => <Th key={kind.key}>{kind.label}</Th>)}
                      <Th>الإجمالي</Th>
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
                        {kinds.map((kind) => (
                          <td key={kind.key} className="p-3 whitespace-nowrap" dir="ltr">{formatMoney(row.amounts[kind.key] ?? '0.00')}</td>
                        ))}
                        <td className="p-3 font-bold text-danger-600 whitespace-nowrap" dir="ltr">{formatMoney(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-bold text-gray-800">
                    <tr className="border-t border-gray-200">
                      <td className="p-3" colSpan={4}>الإجمالي ({report.totals.employees} موظف)</td>
                      {kinds.map((kind) => <td key={kind.key} className="p-3 whitespace-nowrap" dir="ltr">{formatMoney(kind.amount)}</td>)}
                      <td className="p-3 whitespace-nowrap" dir="ltr">{formatMoney(report.totals.amount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </FinancialReportShell>
  )
}
