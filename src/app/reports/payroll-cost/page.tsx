'use client'

import { downloadCsv } from '@/lib/csv'
import { useCurrency } from '@/lib/currency'
import { formatMoney } from '@/lib/money'
import { fetchPayrollCost, nonZero, type CostGroup, type PayrollCostReport } from '../_financial/api'
import { EmptyState, FinancialReportShell, StatCard, Th, useFinancialReport } from '../_financial/ReportShell'

const money = (value: string | null) => (value === null ? '—' : formatMoney(value))

function CostTable({ title, groupLabel, groups, report, showBranch }: {
  title: string; groupLabel: string; groups: CostGroup[]; report: PayrollCostReport; showBranch: boolean
}) {
  const holiday = nonZero(report.totals.holidayWork)
  const t = report.totals
  return (
    <div className="card p-0">
      <h2 className="text-lg font-bold text-gray-800 p-4 pb-2">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <Th>{groupLabel}</Th>
              {showBranch && <Th>الفرع</Th>}
              <Th>الموظفين</Th>
              <Th>إجمالي المستحق</Th>
              <Th>الإضافي</Th>
              {holiday && <Th>بدل دوام أيام العطلات</Th>}
              <Th>الخصومات</Th>
              <Th>الصافي</Th>
              <Th>حصة صاحب العمل في التأمينات</Th>
              <Th>التكلفة على الشركة</Th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr key={group.id ?? 'none'} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="p-3 font-medium text-gray-800 whitespace-nowrap">{group.name}</td>
                {showBranch && <td className="p-3 whitespace-nowrap">{group.branchNames.join('، ')}</td>}
                <td className="p-3">{group.headcount}</td>
                <td className="p-3" dir="ltr">{money(group.gross)}</td>
                <td className="p-3" dir="ltr">{money(group.overtime)}</td>
                {holiday && <td className="p-3" dir="ltr">{money(group.holidayWork)}</td>}
                <td className="p-3 text-danger-600" dir="ltr">{money(group.deductions)}</td>
                <td className="p-3 font-bold" dir="ltr">{money(group.net)}</td>
                <td className="p-3" dir="ltr">{money(group.employerInsurance)}</td>
                <td className="p-3 font-bold" dir="ltr">{money(group.totalCost)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 font-bold text-gray-800">
            <tr className="border-t border-gray-200">
              <td className="p-3" colSpan={showBranch ? 2 : 1}>الإجمالي</td>
              <td className="p-3">{t.headcount}</td>
              <td className="p-3" dir="ltr">{money(t.gross)}</td>
              <td className="p-3" dir="ltr">{money(t.overtime)}</td>
              {holiday && <td className="p-3" dir="ltr">{money(t.holidayWork)}</td>}
              <td className="p-3" dir="ltr">{money(t.deductions)}</td>
              <td className="p-3" dir="ltr">{money(t.net)}</td>
              <td className="p-3" dir="ltr">{money(t.employerInsurance)}</td>
              <td className="p-3" dir="ltr">{money(t.totalCost)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// «ملخص تكلفة الرواتب»: لكل فرع ولكل قسم عدد الموظفين والمستحق والخصومات والصافي والإضافي وحصة صاحب العمل في التأمينات
// والتكلفة على الشركة (المستحق + حصة صاحب العمل).
export default function PayrollCostPage() {
  const currency = useCurrency()
  const { filters, setFilters, report, loading, error, reload } = useFinancialReport(fetchPayrollCost)

  const exportCsv = () => {
    if (!report) return
    const header = ['التجميع', 'الاسم', 'الفرع', 'الموظفين', 'إجمالي المستحق', 'الإضافي', 'بدل دوام أيام العطلات', 'الخصومات', 'الصافي',
      'حصة صاحب العمل في التأمينات', 'التكلفة على الشركة']
    const line = (kind: string, group: Pick<CostGroup, 'name' | 'branchNames'> & PayrollCostReport['totals']) => [kind, group.name, group.branchNames.join('، '),
      group.headcount, group.gross, group.overtime, group.holidayWork, group.deductions, group.net, group.employerInsurance ?? '', group.totalCost]
    const rows = [
      ...report.byBranch.map((group) => line('فرع', group)),
      ...report.byDepartment.map((group) => line('قسم', group)),
      line('الإجمالي', { ...report.totals, name: 'الإجمالي', branchNames: [] }),
    ]
    downloadCsv(`payroll-cost-${report.period}.csv`, header, rows)
  }

  return (
    <FinancialReportShell
      title="ملخص تكلفة الرواتب"
      description="تكلفة الرواتب لكل فرع ولكل قسم في الشهر: المستحق والخصومات والصافي والإضافي والتأمينات"
      filters={filters}
      setFilters={setFilters}
      header={report}
      loading={loading}
      error={error}
      onRefresh={reload}
      onExport={exportCsv}
      exportDisabled={!report || report.byBranch.length === 0}
      note={report && !report.employerInsuranceAvailable ? 'حصة صاحب العمل في التأمينات مش متاحة لسه («—»).' : undefined}
    >
      {report && (
        report.byBranch.length === 0 ? (
          <EmptyState text={`مفيش بنود رواتب ${report.includeDraft ? '' : 'معتمدة أو مصروفة '}في الشهر ده بالفلاتر دي`} />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard label="الموظفين" value={report.totals.headcount} />
              <StatCard label="إجمالي المستحق" value={`${money(report.totals.gross)} ${currency}`} />
              <StatCard label="صافي الرواتب" value={`${money(report.totals.net)} ${currency}`} />
              <StatCard label="تكلفة الإضافي" value={`${money(report.totals.overtime)} ${currency}`} />
              <StatCard label="التكلفة على الشركة" value={`${money(report.totals.totalCost)} ${currency}`} />
            </div>
            <CostTable title="حسب الفرع" groupLabel="الفرع" groups={report.byBranch} report={report} showBranch={false} />
            <CostTable title="حسب القسم" groupLabel="القسم" groups={report.byDepartment} report={report} showBranch />
          </>
        )
      )}
    </FinancialReportShell>
  )
}
