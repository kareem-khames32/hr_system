'use client'

import { Fragment, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronLeft } from 'lucide-react'
import { downloadCsv } from '@/lib/csv'
import { currencyLabel, useCurrency } from '@/lib/currency'
import { currencyTotalRows, moneyByCurrency } from '@/lib/currency-totals'
import { formatMoney } from '@/lib/money'
import { fetchLoansReport, LOAN_STATUS_LABELS } from '../_financial/api'
import { EmptyState, FinancialReportShell, StatCard, Th, useFinancialReport } from '../_financial/ReportShell'

// «تقرير السلف»: لكل موظف رصيد السلف القائم، وأقساط الشهر (المستحق واللي اتسدد والباقي)، والمتأخر من قبل الشهر،
// واللي اتخصم فعلًا في مسيرات الشهر. دوس على الموظف تشوف سلفه واحدة واحدة.
export default function LoansReportPage() {
  const currency = useCurrency()
  const { filters, setFilters, report, loading, error, reload } = useFinancialReport(fetchLoansReport)
  const [open, setOpen] = useState<number | null>(null)
  // B1.1: سلف موظفين بعملتين (فرع مصري وسعودي) ← عمود العملة وسطر إجمالي لكل عملة
  const perCurrency = report ? currencyTotalRows(report.byCurrency) : []
  const footers = !report ? [] : perCurrency.length ? perCurrency.map((group) => ({ key: group.currency, label: `الإجمالي ${group.label}`, currency: group.label, totals: group.totals }))
    : [{ key: 'all', label: 'الإجمالي', currency: currencyLabel(report.byCurrency?.[0]?.currency), totals: report.totals }]
  const money = (pick: (t: NonNullable<typeof report>['totals']) => string) => report ? moneyByCurrency(report.byCurrency, pick, pick(report.totals), currency, formatMoney) : ''

  const exportCsv = () => {
    if (!report) return
    const header = ['الكود', 'الموظف', 'الفرع', 'القسم', 'العملة', 'رقم السلفة', 'حالة السلفة', 'أصل السلفة', 'المسدد', 'الرصيد القائم',
      'أقساط الشهر (عدد)', 'مستحق الشهر', 'اتسدد من قسط الشهر', 'الباقي من قسط الشهر', 'متأخر من قبل الشهر', 'القسط الجاي', 'اتخصم في مسير الشهر']
    const rows: unknown[][] = []
    for (const row of report.employees) {
      for (const loan of row.loans) {
        rows.push([row.employeeCode ?? '', row.fullName ?? '', row.branchName ?? '', row.departmentName ?? '', currencyLabel(row.currency), loan.loanId,
          LOAN_STATUS_LABELS[loan.status ?? ''] ?? loan.status ?? '', loan.principal, loan.paid, loan.outstanding, loan.dueCount, loan.dueAmount,
          loan.duePaid, loan.dueRemaining, loan.overdue, loan.nextDueDate ?? '', ''])
      }
      rows.push([row.employeeCode ?? '', `إجمالي ${row.fullName ?? ''}`, '', '', currencyLabel(row.currency), `${row.loansCount} سلفة`, '', row.principal, row.paid, row.outstanding,
        row.dueCount, row.dueAmount, row.duePaid, row.dueRemaining, row.overdue, '', row.deductedInPayroll])
    }
    for (const { label, currency: code, totals: t } of footers) {
      rows.push(['', `${label} (${t.employees} موظف)`, '', '', code, `${t.loans} سلفة`, '', t.principal, t.paid, t.outstanding, t.dueCount, t.dueAmount, t.duePaid,
        t.dueRemaining, t.overdue, '', t.deductedInPayroll])
    }
    downloadCsv(`loans-${report.period}.csv`, header, rows)
  }

  return (
    <FinancialReportShell
      title="تقرير السلف"
      description="أرصدة السلف القائمة وأقساط شهر الرواتب واللي اتخصم منها في المسير"
      filters={filters}
      setFilters={setFilters}
      header={report}
      loading={loading}
      error={error}
      onRefresh={reload}
      onExport={exportCsv}
      exportDisabled={!report || report.employees.length === 0}
      note="السلف بفرع الموظف وقسمه الحاليين. «اتخصم في مسير الشهر» من المسيرات الداخلة في الأرقام."
    >
      {report && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard label="موظفين عليهم سلف" value={report.totals.employees} />
            <StatCard label="الرصيد القائم" value={money((t) => t.outstanding)} />
            <StatCard label="مستحق الشهر" value={money((t) => t.dueAmount)} />
            <StatCard label="اتخصم في مسير الشهر" value={money((t) => t.deductedInPayroll)} />
            <StatCard label="متأخر من قبل الشهر" value={money((t) => t.overdue)} />
          </div>

          {report.employees.length === 0 ? (
            <EmptyState text="مفيش سلف قائمة ولا أقساط مستحقة في الشهر ده بالفلاتر دي" />
          ) : (
            <div className="card p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <Th>الكود</Th><Th>الموظف</Th><Th>الفرع</Th><Th>القسم</Th>{perCurrency.length > 0 && <Th>العملة</Th>}<Th>السلف</Th><Th>أصل السلف</Th><Th>المسدد</Th><Th>الرصيد القائم</Th>
                    <Th>أقساط الشهر</Th><Th>مستحق الشهر</Th><Th>الباقي من قسط الشهر</Th><Th>متأخر من قبل</Th><Th>اتخصم في المسير</Th>
                  </tr>
                </thead>
                <tbody>
                  {report.employees.map((row) => {
                    const expanded = open === row.employeeId
                    return (
                      <Fragment key={row.employeeId}>
                        <tr className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => setOpen(expanded ? null : row.employeeId)}>
                          <td className="p-3 text-gray-500 whitespace-nowrap" dir="ltr">{row.employeeCode ?? '—'}</td>
                          <td className="p-3 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1">
                              <span className="fr-no-print">{expanded ? <ChevronDown size={16} /> : <ChevronLeft size={16} />}</span>
                              <Link href={`/employees/${row.employeeId}`} className="text-primary-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                                {row.fullName ?? `#${row.employeeId}`}
                              </Link>
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap">{row.branchName ?? '—'}</td>
                          <td className="p-3 whitespace-nowrap">{row.departmentName ?? '—'}</td>
                          {perCurrency.length > 0 && <td className="p-3 whitespace-nowrap">{currencyLabel(row.currency)}</td>}
                          <td className="p-3">{row.loansCount}</td>
                          <td className="p-3" dir="ltr">{formatMoney(row.principal)}</td>
                          <td className="p-3" dir="ltr">{formatMoney(row.paid)}</td>
                          <td className="p-3 font-bold" dir="ltr">{formatMoney(row.outstanding)}</td>
                          <td className="p-3">{row.dueCount}</td>
                          <td className="p-3" dir="ltr">{formatMoney(row.dueAmount)}</td>
                          <td className="p-3" dir="ltr">{formatMoney(row.dueRemaining)}</td>
                          <td className={`p-3 ${row.overdue !== '0.00' ? 'text-danger-600' : ''}`} dir="ltr">{formatMoney(row.overdue)}</td>
                          <td className="p-3" dir="ltr">{formatMoney(row.deductedInPayroll)}</td>
                        </tr>
                        {expanded && (
                          <tr className="bg-gray-50/60">
                            <td colSpan={perCurrency.length ? 14 : 13} className="p-3">
                              <table className="w-full text-xs">
                                <thead className="text-gray-500">
                                  <tr>
                                    <Th>السلفة</Th><Th>الحالة</Th><Th>اتصرفت</Th><Th>الأصل</Th><Th>المسدد</Th><Th>القائم</Th><Th>عدد الأقساط</Th>
                                    <Th>أقساط مفتوحة</Th><Th>مستحق الشهر</Th><Th>اتسدد منه</Th><Th>متأخر</Th><Th>القسط الجاي</Th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {row.loans.map((loan) => (
                                    <tr key={loan.loanId} className="border-t border-gray-100">
                                      <td className="p-2">#{loan.loanId}</td>
                                      <td className="p-2">{LOAN_STATUS_LABELS[loan.status ?? ''] ?? loan.status ?? '—'}</td>
                                      <td className="p-2" dir="ltr">{loan.disbursedAt ?? '—'}</td>
                                      <td className="p-2" dir="ltr">{formatMoney(loan.principal)}</td>
                                      <td className="p-2" dir="ltr">{formatMoney(loan.paid)}</td>
                                      <td className="p-2 font-medium" dir="ltr">{formatMoney(loan.outstanding)}</td>
                                      <td className="p-2">{loan.installments}</td>
                                      <td className="p-2">{loan.openInstallments}</td>
                                      <td className="p-2" dir="ltr">{formatMoney(loan.dueAmount)}</td>
                                      <td className="p-2" dir="ltr">{formatMoney(loan.duePaid)}</td>
                                      <td className="p-2" dir="ltr">{formatMoney(loan.overdue)}</td>
                                      <td className="p-2" dir="ltr">{loan.nextDueDate ?? '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
                <tfoot className="bg-gray-50 font-bold text-gray-800">
                  {footers.map(({ key, label, totals: t }) => (
                    <tr key={key} className="border-t border-gray-200" data-currency-total={key}>
                      <td className="p-3" colSpan={perCurrency.length ? 5 : 4}>{label} ({t.employees} موظف)</td>
                      <td className="p-3">{t.loans}</td>
                      <td className="p-3" dir="ltr">{formatMoney(t.principal)}</td>
                      <td className="p-3" dir="ltr">{formatMoney(t.paid)}</td>
                      <td className="p-3" dir="ltr">{formatMoney(t.outstanding)}</td>
                      <td className="p-3">{t.dueCount}</td>
                      <td className="p-3" dir="ltr">{formatMoney(t.dueAmount)}</td>
                      <td className="p-3" dir="ltr">{formatMoney(t.dueRemaining)}</td>
                      <td className="p-3" dir="ltr">{formatMoney(t.overdue)}</td>
                      <td className="p-3" dir="ltr">{formatMoney(t.deductedInPayroll)}</td>
                    </tr>
                  ))}
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}
    </FinancialReportShell>
  )
}
