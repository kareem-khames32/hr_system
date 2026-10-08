'use client'

import { Fragment, useEffect, useState } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout'
import { AlertTriangle, ArrowRight, ChevronDown, ChevronLeft, Download, Info, Landmark, RefreshCw } from 'lucide-react'
import { PayrollPeriodSelect, usePayrollMonthContext } from '@/components/DayRangeFilter'
import { useOrgFilter } from '@/components/OrgFilter'
import { currencyLabel, useCurrency } from '@/lib/currency'
import { currencyTotalRows, moneyByCurrency } from '@/lib/currency-totals'
import { formatMoney } from '@/lib/money'
import {
  exportCostCenterReportCsv,
  fetchCostCenterReport,
  RUN_STATUS_LABELS,
  type CostCenterReport,
} from '@/lib/cost-center-report-api'

const money =(value: string | null) => (value === null ? '—' : formatMoney(value))
const centerKey = (id: number | null) => (id === null ? 'none' : String(id))

// تقرير مراكز التكلفة: لكل مركز عدد الموظفين وإجمالي الرواتب والخصومات والصافي وحصة صاحب العمل في التأمينات،
// ومن المسيرات المعتمدة والمصروفة للشهر (والمسودات لو اخترت). حساب الفرع يشوف فرعه بس.
export default function CostCenterReportPage() {
  const currency = useCurrency()
  // التقرير على مسيرات شهر رواتب بالاسم — الافتراضي شهر الرواتب الجاري (بدورة 23 يوم 25 سبتمبر = رواتب أكتوبر) مش الشهر التقويمي
  const payrollMonth = usePayrollMonthContext()
  const [period, setPeriod] = useState('')
  useEffect(() => { if (payrollMonth) setPeriod((current) => current || payrollMonth.period) }, [payrollMonth])
  // فلتر «الفرع ← الإدارة ← القسم ← الفريق» الموحد مكان قائمة الفرع: بيتبعت للخادم (الفرع والقسم والفريق من لقطة المسير)،
  // والمراكز وإجمالياتها والتصدير كلها بيه — حساب الفرع الواحد فرعه مقفول
  const org = useOrgFilter()
  const [includeDraft, setIncludeDraft] = useState(false)
  const [report, setReport] = useState<CostCenterReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  // B1.1: مراكز على فروع بعملتين ← عمود العملة وسطر إجمالي لكل عملة
  const perCurrency = report ? currencyTotalRows(report.byCurrency) : []
  const footers = !report ? [] : perCurrency.length ? perCurrency.map((group) => ({ key: group.currency, label: `الإجمالي ${group.label}`, totals: group.totals }))
    : [{ key: 'all', label: 'الإجمالي', totals: report.totals }]
  const statMoney = (pick: (t: CostCenterReport['totals']) => string | null) => !report || pick(report.totals) === null ? '—'
    : moneyByCurrency(report.byCurrency, (t) => pick(t) ?? '0.00', pick(report.totals) ?? '0.00', currency, formatMoney)

  const load = () => {
    if (!/^\d{4}-\d{2}$/.test(period)) return
    setLoading(true)
    setError('')
    fetchCostCenterReport({ period, org: org.params, includeDraft })
      .then((data) => {
        setReport(data)
        setOpen(null)
      })
      .catch((e) => {
        setReport(null)
        setError(e instanceof Error ? e.message : 'تعذر تحميل تقرير مراكز التكلفة')
      })
      .finally(() => setLoading(false))
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [period, org.paramsKey, includeDraft])

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/reports" className="hover:text-primary-600">
            التقارير
          </Link>
          <ArrowRight size={16} />
          <span className="text-gray-800">مراكز التكلفة</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">تقرير مراكز التكلفة</h1>
            <p className="text-gray-500 mt-1">تكلفة الرواتب لكل مركز تكلفة في الشهر — دوس على المركز تشوف موظفينه</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="btn-secondary flex items-center gap-2" disabled={loading}>
              <RefreshCw size={18} />
              تحديث
            </button>
            <button
              onClick={() => report && exportCostCenterReportCsv(report)}
              className="btn-primary flex items-center gap-2"
              disabled={!report || report.centers.length === 0}
            >
              <Download size={18} />
              تصدير CSV
            </button>
          </div>
        </div>

        <div className="card grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div className="md:col-span-2 min-w-0" data-cost-center-org-filter>
            <label className="label">الفرع ← الإدارة ← القسم ← الفريق</label>
            {org.element}
          </div>
          <PayrollPeriodSelect id="cost-center-period" label="شهر الرواتب" value={period} onChange={setPeriod}
            cycleStartDay={payrollMonth?.cycleStartDay} today={payrollMonth?.today} />
          <label className="flex items-center gap-2 text-sm text-gray-700 pb-2.5">
            <input type="checkbox" checked={includeDraft} onChange={(e) => setIncludeDraft(e.target.checked)} />
            اعرض كمان المسيرات اللي لسه ما اتعتمدتش
          </label>
        </div>

        <div className="p-4 bg-blue-50 rounded-xl flex items-start gap-3 text-sm text-blue-700">
          <Info size={18} className="mt-0.5 shrink-0" />
          <span>
            الأرقام من المسيرات المعتمدة والمصروفة للشهر{includeDraft ? ' ومعاها المسيرات المحسوبة اللي لسه ما اتعتمدتش' : ''}.
            مركز التكلفة والفرع زي ما كانوا وقت المسير، والموظف اللي اتعكس صرفه مش محسوب.
          </span>
        </div>

        {error && (
          <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4 flex items-center gap-2">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : report && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: 'الموظفين', value: String(report.totals.headcount) },
                { label: 'إجمالي الرواتب', value: statMoney((t) => t.gross) },
                { label: 'إجمالي الخصومات', value: statMoney((t) => t.deductions) },
                { label: 'صافي الرواتب', value: statMoney((t) => t.net) },
                { label: 'حصة صاحب العمل في التأمينات', value: statMoney((t) => t.employerInsurance) },
              ].map((stat) => (
                <div key={stat.label} className="card">
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-xl font-bold text-gray-800 mt-1">{stat.value}</p>
                </div>
              ))}
            </div>

            {report.centers.length === 0 ? (
              <div className="card text-center py-12 text-gray-500">
                <Landmark size={36} className="mx-auto text-gray-300 mb-3" />
                مفيش مسيرات {includeDraft ? '' : 'معتمدة أو مصروفة '}للشهر ده
              </div>
            ) : (
              <div className="card p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-start p-3 font-medium">مركز التكلفة</th>
                      {perCurrency.length > 0 && <th className="text-start p-3 font-medium">العملة</th>}
                      <th className="text-start p-3 font-medium">الموظفين</th>
                      <th className="text-start p-3 font-medium">الإجمالي</th>
                      <th className="text-start p-3 font-medium">الخصومات</th>
                      <th className="text-start p-3 font-medium">الصافي</th>
                      <th className="text-start p-3 font-medium">حصة صاحب العمل في التأمينات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.centers.map((center) => {
                      const key = centerKey(center.costCenterId)
                      const expanded = open === key
                      return (
                        <Fragment key={key}>
                          <tr
                            className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                            onClick={() => setOpen(expanded ? null : key)}
                          >
                            <td className="p-3 font-medium text-gray-800">
                              <span className="inline-flex items-center gap-1">
                                {expanded ? <ChevronDown size={16} /> : <ChevronLeft size={16} />}
                                {center.name}
                                {center.code && (
                                  <span className="text-xs text-gray-400 mr-1" dir="ltr">
                                    {center.code}
                                  </span>
                                )}
                              </span>
                            </td>
                            {perCurrency.length > 0 && <td className="p-3">{center.currency ? currencyLabel(center.currency) : 'عملتين'}</td>}
                            <td className="p-3">{center.headcount}</td>
                            <td className="p-3">{money(center.gross)}</td>
                            <td className="p-3 text-danger-600">{money(center.deductions)}</td>
                            <td className="p-3 font-bold">{money(center.net)}</td>
                            <td className="p-3">{money(center.employerInsurance)}</td>
                          </tr>
                          {expanded && (
                            <tr className="bg-gray-50/60">
                              <td colSpan={perCurrency.length ? 7 : 6} className="p-3">
                                <table className="w-full text-xs">
                                  <thead className="text-gray-500">
                                    <tr>
                                      <th className="text-start p-2 font-medium">الموظف</th>
                                      <th className="text-start p-2 font-medium">الفرع</th>
                                      <th className="text-start p-2 font-medium">المسير</th>
                                      <th className="text-start p-2 font-medium">الإجمالي</th>
                                      <th className="text-start p-2 font-medium">الخصومات</th>
                                      <th className="text-start p-2 font-medium">الصافي</th>
                                      <th className="text-start p-2 font-medium">التأمينات (صاحب العمل)</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {center.employees.map((employee) => (
                                      <tr key={`${employee.runId}-${employee.employeeId}`} className="border-t border-gray-100">
                                        <td className="p-2">
                                          <Link href={`/employees/${employee.employeeId}`} className="text-primary-600 hover:underline">
                                            {employee.fullName ?? `#${employee.employeeId}`}
                                          </Link>
                                          {employee.employeeCode && (
                                            <span className="text-gray-400 mr-1" dir="ltr">
                                              {employee.employeeCode}
                                            </span>
                                          )}
                                        </td>
                                        <td className="p-2">{employee.branchName ?? '—'}{perCurrency.length > 0 && <span className="text-gray-400 ms-1">({currencyLabel(employee.currency)})</span>}</td>
                                        <td className="p-2">
                                          {employee.runName || `مسير #${employee.runId}`}
                                          <span className="text-gray-400 ms-1">
                                            ({RUN_STATUS_LABELS[employee.runStatus] ?? employee.runStatus})
                                          </span>
                                        </td>
                                        <td className="p-2">{money(employee.gross)}</td>
                                        <td className="p-2 text-danger-600">{money(employee.deductions)}</td>
                                        <td className="p-2 font-medium">{money(employee.net)}</td>
                                        <td className="p-2">{money(employee.employerInsurance)}</td>
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
                        <td className="p-3" colSpan={perCurrency.length ? 2 : 1}>{label}</td>
                        <td className="p-3">{t.headcount}</td>
                        <td className="p-3">{money(t.gross)}</td>
                        <td className="p-3">{money(t.deductions)}</td>
                        <td className="p-3">{money(t.net)}</td>
                        <td className="p-3">{money(t.employerInsurance)}</td>
                      </tr>
                    ))}
                  </tfoot>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  )
}
