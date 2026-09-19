'use client'

import { Fragment, useEffect, useState } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout'
import { AlertTriangle, ArrowRight, ChevronDown, ChevronLeft, Download, Info, Landmark, RefreshCw } from 'lucide-react'
import { fetchBranches, getCurrentUser, type ApiBranch } from '@/lib/api'
import { PayrollPeriodSelect, usePayrollMonthContext } from '@/components/DayRangeFilter'
import { useCurrency } from '@/lib/currency'
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
  const [companyWide, setCompanyWide] = useState(false)
  const [branches, setBranches] = useState<ApiBranch[]>([])
  // التقرير على مسيرات شهر رواتب بالاسم — الافتراضي شهر الرواتب الجاري (بدورة 23 يوم 25 سبتمبر = رواتب أكتوبر) مش الشهر التقويمي
  const payrollMonth = usePayrollMonthContext()
  const [period, setPeriod] = useState('')
  useEffect(() => { if (payrollMonth) setPeriod((current) => current || payrollMonth.period) }, [payrollMonth])
  const [branchId, setBranchId] = useState('')
  const [includeDraft, setIncludeDraft] = useState(false)
  const [report, setReport] = useState<CostCenterReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    const user = getCurrentUser()
    const wide = user?.role === 'super_admin'
    setCompanyWide(wide)
    fetchBranches().then(setBranches).catch(() => setBranches([]))
  }, [])

  const load = () => {
    if (!/^\d{4}-\d{2}$/.test(period)) return
    setLoading(true)
    setError('')
    fetchCostCenterReport({ period, branchId: companyWide ? branchId : undefined, includeDraft })
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
  useEffect(load, [period, branchId, includeDraft, companyWide])

  const myBranch = !companyWide ? branches.find((b) => b.id === getCurrentUser()?.branchId) : undefined

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

        <div className="card grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <PayrollPeriodSelect id="cost-center-period" label="شهر الرواتب" value={period} onChange={setPeriod}
            cycleStartDay={payrollMonth?.cycleStartDay} today={payrollMonth?.today} />
          <div>
            <label className="label">الفرع</label>
            {companyWide ? (
              <select className="input" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                <option value="">كل الفروع</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            ) : (
              <input className="input bg-gray-50" value={myBranch?.name ?? 'فرعك'} disabled />
            )}
          </div>
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
                { label: 'إجمالي الرواتب', value: `${money(report.totals.gross)} ${currency}` },
                { label: 'إجمالي الخصومات', value: `${money(report.totals.deductions)} ${currency}` },
                { label: 'صافي الرواتب', value: `${money(report.totals.net)} ${currency}` },
                {
                  label: 'حصة صاحب العمل في التأمينات',
                  value: report.totals.employerInsurance === null ? '—' : `${money(report.totals.employerInsurance)} ${currency}`,
                },
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
                      <th className="text-right p-3 font-medium">مركز التكلفة</th>
                      <th className="text-right p-3 font-medium">الموظفين</th>
                      <th className="text-right p-3 font-medium">الإجمالي</th>
                      <th className="text-right p-3 font-medium">الخصومات</th>
                      <th className="text-right p-3 font-medium">الصافي</th>
                      <th className="text-right p-3 font-medium">حصة صاحب العمل في التأمينات</th>
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
                            <td className="p-3">{center.headcount}</td>
                            <td className="p-3">{money(center.gross)}</td>
                            <td className="p-3 text-danger-600">{money(center.deductions)}</td>
                            <td className="p-3 font-bold">{money(center.net)}</td>
                            <td className="p-3">{money(center.employerInsurance)}</td>
                          </tr>
                          {expanded && (
                            <tr className="bg-gray-50/60">
                              <td colSpan={6} className="p-3">
                                <table className="w-full text-xs">
                                  <thead className="text-gray-500">
                                    <tr>
                                      <th className="text-right p-2 font-medium">الموظف</th>
                                      <th className="text-right p-2 font-medium">الفرع</th>
                                      <th className="text-right p-2 font-medium">المسير</th>
                                      <th className="text-right p-2 font-medium">الإجمالي</th>
                                      <th className="text-right p-2 font-medium">الخصومات</th>
                                      <th className="text-right p-2 font-medium">الصافي</th>
                                      <th className="text-right p-2 font-medium">التأمينات (صاحب العمل)</th>
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
                                        <td className="p-2">{employee.branchName ?? '—'}</td>
                                        <td className="p-2">
                                          {employee.runName || `مسير #${employee.runId}`}
                                          <span className="text-gray-400 mr-1">
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
                    <tr className="border-t border-gray-200">
                      <td className="p-3">الإجمالي</td>
                      <td className="p-3">{report.totals.headcount}</td>
                      <td className="p-3">{money(report.totals.gross)}</td>
                      <td className="p-3">{money(report.totals.deductions)}</td>
                      <td className="p-3">{money(report.totals.net)}</td>
                      <td className="p-3">{money(report.totals.employerInsurance)}</td>
                    </tr>
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
