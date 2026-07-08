'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  fetchPayrollRuns,
  fetchPayrollRun,
  calculatePayroll,
  approvePayroll,
  payPayroll,
  fetchPayMethodReport,
  fetchBranches,
  fetchEmployees,
  type ApiPayrollRun,
  type ApiPayrollItem,
  type ApiBranch,
  type ApiEmployee,
} from '@/lib/api'
import {
  Search,
  Filter,
  Download,
  Upload,
  Calendar,
  DollarSign,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Send,
  Lock,
  Eye,
  Printer,
  Calculator,
  TrendingUp,
  Banknote,
} from 'lucide-react'
import Link from 'next/link'
import { useCurrency } from '@/lib/currency'

// حقل البدلات الجديد في بند المسير (ليس بعد ضمن ApiPayrollItem)
type PayrollItemWithAllowances = ApiPayrollItem & { allowances?: number }

const payMethodLabels: Record<string, string> = {
  transfer: 'تحويل بنكي',
  cash: 'كاش',
  visa: 'فيزا',
}

// خريطة حالة المسير في الباك إند إلى تسميات الشاشة
const statusLabels: Record<ApiPayrollRun['status'], string> = {
  CALCULATED: 'محسوب',
  APPROVED: 'معتمد',
  PAID: 'مصروف',
}

// مراحل دورة المسير الفعلية: الحساب ← الاعتماد ← الصرف
const runStages = ['الحساب', 'الاعتماد', 'الصرف']
const stageOfStatus: Record<ApiPayrollRun['status'], number> = {
  CALCULATED: 1,
  APPROVED: 2,
  PAID: 3,
}

// القيم العشرية قد تصل نصوصاً من قاعدة البيانات
const n = (v: unknown): number => Number(v ?? 0) || 0
const fmtDate = (s?: string) => (s ? s.slice(0, 10) : '')
const allowancesOf = (item: ApiPayrollItem) =>
  n((item as PayrollItemWithAllowances).allowances)

export default function PayrollPage() {
  const currency = useCurrency()
  const [runs, setRuns] = useState<ApiPayrollRun[]>([])
  const [branches, setBranches] = useState<ApiBranch[]>([])
  const [employees, setEmployees] = useState<ApiEmployee[]>([])
  const [runDetail, setRunDetail] = useState<ApiPayrollRun | null>(null)
  const [payMethods, setPayMethods] = useState<Record<string, { count: number; total: number }> | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  const [error, setError] = useState('')

  const [searchQuery, setSearchQuery] = useState('')
  const [periodType, setPeriodType] = useState<'monthly' | 'custom'>('monthly')
  const [customPeriod, setCustomPeriod] = useState({ from: '2026-01-01', to: '2026-01-31' })
  // مسير مستقل لكل فرع + فترة الاحتساب (YYYY-MM)
  const [calcBranchId, setCalcBranchId] = useState<number | null>(null)
  const [calcPeriod, setCalcPeriod] = useState(() => new Date().toISOString().slice(0, 7))

  const loadDetail = async (id: number) => {
    setDetailLoading(true)
    try {
      const detail = await fetchPayrollRun(id)
      setRunDetail(detail)
      try {
        setPayMethods(await fetchPayMethodReport(id))
      } catch {
        setPayMethods(null)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل تفاصيل المسير')
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchPayrollRuns(), fetchBranches(), fetchEmployees()])
      .then(([runsData, branchesData, employeesData]) => {
        if (cancelled) return
        setRuns(runsData)
        setBranches(branchesData)
        setEmployees(employeesData)
        if (branchesData.length > 0) setCalcBranchId(branchesData[0].id)
        if (runsData.length > 0) loadDetail(runsData[0].id)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'تعذر تحميل مسيرات الرواتب')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const refreshRuns = async (selectId?: number) => {
    const runsData = await fetchPayrollRuns()
    setRuns(runsData)
    const id = selectId ?? runDetail?.id
    if (id != null && runsData.some((r) => r.id === id)) await loadDetail(id)
  }

  const handleCalculate = async () => {
    if (calcBranchId == null || !calcPeriod) return
    setActionBusy(true)
    setError('')
    try {
      const run = await calculatePayroll(calcBranchId, calcPeriod)
      await refreshRuns(run.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر احتساب المسير')
    } finally {
      setActionBusy(false)
    }
  }

  const handleApprove = async () => {
    if (!runDetail) return
    setActionBusy(true)
    setError('')
    try {
      await approvePayroll(runDetail.id)
      await refreshRuns(runDetail.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر اعتماد المسير')
    } finally {
      setActionBusy(false)
    }
  }

  const handlePay = async () => {
    if (!runDetail) return
    setActionBusy(true)
    setError('')
    try {
      await payPayroll(runDetail.id)
      await refreshRuns(runDetail.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر صرف المسير')
    } finally {
      setActionBusy(false)
    }
  }

  const branchName = (id?: number | null) =>
    branches.find((b) => b.id === id)?.name ?? (id != null ? `فرع #${id}` : '')
  const employeeOf = (id: number) => employees.find((e) => e.id === id)

  const runStage = runDetail ? stageOfStatus[runDetail.status] : 0
  const items: ApiPayrollItem[] = runDetail?.items ?? []

  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true
    const emp = employeeOf(item.employeeId)
    return (
      (emp?.fullName ?? '').includes(searchQuery) ||
      (emp?.employeeCode ?? '').includes(searchQuery)
    )
  })

  // إجماليات المسير من البنود الفعلية
  const totals = filteredItems.reduce(
    (acc, item) => {
      const gross = n(item.basicSalary) + allowancesOf(item) + n(item.overtimeAmount)
      const deductions =
        n(item.latenessDeduction) + n(item.unpaidLeaveDeduction) + n(item.loanInstallments)
      return {
        totalEarnings: acc.totalEarnings + gross,
        totalDeductions: acc.totalDeductions + deductions,
        netSalary: acc.netSalary + n(item.netPay),
      }
    },
    { totalEarnings: 0, totalDeductions: 0, netSalary: 0 }
  )

  // سجل الاعتمادات الفعلي من طوابع المسير الزمنية
  const approvalsLog = runDetail
    ? [
        `الحساب ✓ — بواسطة النظام في ${fmtDate(runDetail.createdAt)}`,
        ...(runDetail.approvedAt ? [`الاعتماد ✓ — في ${fmtDate(runDetail.approvedAt)}`] : []),
        ...(runDetail.paidAt ? [`الصرف ✓ — في ${fmtDate(runDetail.paidAt)}`] : []),
      ]
    : []

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">مسير الرواتب</h1>
            <p className="text-gray-500 mt-1">إدارة ومعالجة رواتب الموظفين</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-secondary flex items-center gap-2">
              <Upload size={18} />
              استيراد
            </button>
            <button className="btn-secondary flex items-center gap-2">
              <Download size={18} />
              تصدير Excel
            </button>
            <button
              onClick={handleCalculate}
              disabled={actionBusy || calcBranchId == null}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              <Calculator size={18} />
              احتساب المسير
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {/* Payroll Period Selector */}
        <div className="card">
          <div className="flex flex-col gap-4">
            {/* Period Type Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar size={20} className="text-gray-400" />
                  <span className="font-medium text-gray-700">فترة الراتب:</span>
                </div>
                <div className="flex items-center bg-gray-100 rounded-xl p-1">
                  <button
                    onClick={() => setPeriodType('monthly')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      periodType === 'monthly'
                        ? 'bg-white text-primary-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    شهري
                  </button>
                  <button
                    onClick={() => setPeriodType('custom')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      periodType === 'custom'
                        ? 'bg-white text-primary-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    فترة مخصصة
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-warning-500" />
                  <span className="text-sm text-gray-600">محسوب</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary-500" />
                  <span className="text-sm text-gray-600">معتمد</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-success-500" />
                  <span className="text-sm text-gray-600">مصروف</span>
                </div>
              </div>
            </div>

            {/* Period Selection */}
            {periodType === 'monthly' ? (
              <div className="flex items-center gap-4 flex-wrap">
                <select
                  value={runDetail?.id ?? ''}
                  onChange={(e) => {
                    const id = Number(e.target.value)
                    if (id) loadDetail(id)
                  }}
                  className="input w-72"
                >
                  {runs.length === 0 && <option value="">لا توجد مسيرات بعد</option>}
                  {runs.map((run) => (
                    <option key={run.id} value={run.id}>
                      {run.period} — {branchName(run.branchId)} ({statusLabels[run.status]})
                    </option>
                  ))}
                </select>
                {/* فترة المسير الفعلية من الباك إند */}
                {runDetail && (
                  <div className="flex items-center gap-2 p-2 px-4 bg-indigo-50 rounded-xl border border-indigo-100">
                    <span className="text-sm text-gray-700">فترة المسير:</span>
                    <span className="text-xs text-indigo-600 font-medium" dir="ltr">
                      {fmtDate(runDetail.startDate)} ← {fmtDate(runDetail.endDate)}
                    </span>
                  </div>
                )}
                {/* مسير مستقل لكل فرع — احتساب مسير جديد */}
                <div className="flex items-center gap-2 p-2 px-4 bg-primary-50 rounded-xl border border-primary-100">
                  <span className="text-sm font-medium text-gray-700">مسير فرع:</span>
                  <select
                    value={calcBranchId ?? ''}
                    onChange={(e) => setCalcBranchId(Number(e.target.value))}
                    className="input w-56 py-1"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="month"
                    value={calcPeriod}
                    onChange={(e) => setCalcPeriod(e.target.value)}
                    className="input w-40 py-1"
                    dir="ltr"
                  />
                  <button
                    onClick={handleCalculate}
                    disabled={actionBusy || calcBranchId == null}
                    className="btn-primary flex items-center gap-2 text-sm py-1.5 disabled:opacity-50"
                  >
                    <Calculator size={16} />
                    احتساب
                  </button>
                  <span className="text-xs text-primary-600">كل فرع بمسيره واعتماداته المستقلة</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700">من تاريخ:</label>
                  <input
                    type="date"
                    value={customPeriod.from}
                    onChange={(e) => setCustomPeriod(prev => ({ ...prev, from: e.target.value }))}
                    className="input w-44"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700">إلى تاريخ:</label>
                  <input
                    type="date"
                    value={customPeriod.to}
                    onChange={(e) => setCustomPeriod(prev => ({ ...prev, to: e.target.value }))}
                    className="input w-44"
                  />
                </div>
                <div className="mr-auto flex items-center gap-2 text-sm text-blue-700">
                  <AlertCircle size={16} />
                  <span>الاحتساب بفترة مخصصة غير متاح حالياً — الاحتساب شهري حسب دورة الشركة</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card bg-gradient-to-br from-primary-500 to-primary-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-100 text-sm">إجمالي الاستحقاقات</p>
                <p className="text-3xl font-bold mt-1">{totals.totalEarnings.toLocaleString()}</p>
                <p className="text-primary-200 text-sm mt-1">{currency}</p>
              </div>
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <TrendingUp size={28} />
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-danger-500 to-danger-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-danger-100 text-sm">إجمالي الخصومات</p>
                <p className="text-3xl font-bold mt-1">{totals.totalDeductions.toLocaleString()}</p>
                <p className="text-danger-200 text-sm mt-1">{currency}</p>
              </div>
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <DollarSign size={28} />
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-success-500 to-success-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-success-100 text-sm">صافي الرواتب</p>
                <p className="text-3xl font-bold mt-1">{totals.netSalary.toLocaleString()}</p>
                <p className="text-success-200 text-sm mt-1">{currency}</p>
              </div>
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <Banknote size={28} />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">عدد الموظفين</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">{filteredItems.length}</p>
                <p className="text-gray-400 text-sm mt-1">موظف</p>
              </div>
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
                <Users size={28} className="text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Workflow Steps — دورة المسير: الحساب ← الاعتماد ← الصرف */}
        {runDetail && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">
                دورة اعتماد مسير {branchName(runDetail.branchId)} — {runDetail.period}
              </h3>
              {runDetail.status === 'CALCULATED' ? (
                <button
                  onClick={handleApprove}
                  disabled={actionBusy}
                  className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  <CheckCircle size={16} />
                  اعتماد المسير
                </button>
              ) : runDetail.status === 'APPROVED' ? (
                <button
                  onClick={handlePay}
                  disabled={actionBusy}
                  className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  <CheckCircle size={16} />
                  صرف المسير
                </button>
              ) : (
                <span className="badge badge-success">المسير مصروف ومقفل ✓</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                {runStages.map((stage, i) => (
                  <div key={stage} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white ${
                          i < runStage
                            ? 'bg-success-500'
                            : i === runStage
                            ? 'bg-warning-500'
                            : 'bg-gray-200'
                        }`}
                      >
                        {i < runStage ? <CheckCircle size={22} /> : i === runStage ? <Clock size={22} /> : <Lock size={22} className="text-gray-400" />}
                      </div>
                      <span
                        className={`text-xs font-medium mt-2 whitespace-nowrap ${
                          i < runStage ? 'text-success-600' : i === runStage ? 'text-warning-600' : 'text-gray-400'
                        }`}
                      >
                        {i + 1}. {stage}
                      </span>
                    </div>
                    {i < runStages.length - 1 && (
                      <div className={`flex-1 h-1 rounded mx-2 ${i < runStage ? 'bg-success-500' : 'bg-gray-200'}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>
            {/* سجل الاعتمادات */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-2">سجل الاعتمادات:</p>
              <div className="flex flex-wrap gap-2">
                {approvalsLog.map((log, i) => (
                  <span key={i} className="text-xs bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg border border-gray-100">
                    {log}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ملخص طرق الصرف — من تقرير الباك إند */}
        {runDetail && payMethods && Object.keys(payMethods).length > 0 && (
          <div className="card border-2 border-teal-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-800">ملخص طرق الصرف</h3>
                <p className="text-sm text-gray-500 mt-1">
                  توزيع صافي المسير على طرق الصرف (تحويل / كاش / فيزا)
                </p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 bg-teal-50 rounded-xl border border-teal-100">
                <p className="text-xs text-teal-600">مركز تكلفة الفرع</p>
                <p className="text-lg font-bold text-teal-800 font-mono" dir="ltr">
                  {branches.find((b) => b.id === runDetail.branchId)?.costCenter ?? '—'}
                </p>
                <p className="text-sm text-teal-700 mt-1">
                  {n(runDetail.totalNet).toLocaleString()} {currency} إجمالي
                </p>
              </div>
              {Object.entries(payMethods).map(([method, data]) => (
                <div key={method} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-500">{payMethodLabels[method] ?? method}</p>
                  <p className="text-lg font-bold text-gray-800">
                    {n(data.total).toLocaleString()} {currency}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{n(data.count)} موظف</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="card">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="بحث بالاسم أو الرقم الوظيفي..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input pr-10"
                />
              </div>
            </div>

            <button className="btn-secondary flex items-center gap-2">
              <Filter size={18} />
              فلاتر متقدمة
            </button>
          </div>
        </div>

        {/* Payroll Table */}
        <div className="card overflow-hidden p-0">
          {detailLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="text-right px-4 py-4">الموظف</th>
                  <th className="text-center px-4 py-4">الأساسي</th>
                  <th className="text-center px-4 py-4">البدلات</th>
                  <th className="text-center px-4 py-4">العمل الإضافي</th>
                  <th className="text-center px-4 py-4 bg-success-50">الإجمالي</th>
                  <th className="text-center px-4 py-4">خصم التأخير</th>
                  <th className="text-center px-4 py-4">إجازة بدون راتب</th>
                  <th className="text-center px-4 py-4">أقساط السلف</th>
                  <th className="text-center px-4 py-4 bg-danger-50">إجمالي الخصم</th>
                  <th className="text-center px-4 py-4 bg-primary-50 font-bold">الصافي</th>
                  <th className="text-center px-4 py-4">طريقة الصرف</th>
                  <th className="text-center px-4 py-4">حالة الصرف</th>
                  <th className="text-center px-4 py-4">عرض</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={13} className="px-4 py-10 text-center text-sm text-gray-400">
                      {runDetail ? 'لا توجد بنود في هذا المسير' : 'اختر مسيراً أو احسب مسيراً جديداً'}
                    </td>
                  </tr>
                )}
                {filteredItems.map((item) => {
                  const emp = employeeOf(item.employeeId)
                  const name = emp?.fullName ?? `موظف #${item.employeeId}`
                  const gross = n(item.basicSalary) + allowancesOf(item) + n(item.overtimeAmount)
                  const totalDeductions =
                    n(item.latenessDeduction) + n(item.unpaidLeaveDeduction) + n(item.loanInstallments)

                  return (
                  <tr key={item.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold">
                          {name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{name}</p>
                          <p className="text-sm text-gray-400">
                            {emp?.jobTitle ?? emp?.employeeCode ?? ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell text-center font-mono">{n(item.basicSalary).toLocaleString()}</td>
                    <td className="table-cell text-center font-mono">
                      {allowancesOf(item) > 0 ? allowancesOf(item).toLocaleString() : '-'}
                    </td>
                    <td className="table-cell text-center font-mono">
                      <div className="flex flex-col items-center">
                        <span className={n(item.overtimeAmount) > 0 ? 'text-success-600 font-bold' : ''}>
                          {n(item.overtimeAmount).toLocaleString()}
                        </span>
                        {n(item.overtimeHours) > 0 && (
                          <span className="text-xs text-success-600">{n(item.overtimeHours)} ساعة</span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell text-center font-mono font-bold text-success-600 bg-success-50">
                      {gross.toLocaleString()}
                    </td>
                    <td className="table-cell text-center font-mono">
                      <div className="flex flex-col items-center">
                        <span className={n(item.latenessDeduction) > 0 ? 'text-danger-600' : ''}>
                          {n(item.latenessDeduction) > 0 ? n(item.latenessDeduction).toLocaleString() : '-'}
                        </span>
                        {n(item.lateMinutes) > 0 && (
                          <span className="text-xs text-danger-600">{n(item.lateMinutes)} دقيقة</span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell text-center font-mono">
                      <div className="flex flex-col items-center">
                        <span className={n(item.unpaidLeaveDeduction) > 0 ? 'text-danger-600' : ''}>
                          {n(item.unpaidLeaveDeduction) > 0 ? n(item.unpaidLeaveDeduction).toLocaleString() : '-'}
                        </span>
                        {n(item.unpaidLeaveDays) > 0 && (
                          <span className="text-xs text-danger-600">{n(item.unpaidLeaveDays)} يوم</span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell text-center font-mono">
                      {n(item.loanInstallments) > 0 ? (
                        <span className="text-danger-600">{n(item.loanInstallments).toLocaleString()}</span>
                      ) : '-'}
                    </td>
                    <td className="table-cell text-center font-mono font-bold text-danger-600 bg-danger-50">
                      {totalDeductions.toLocaleString()}
                    </td>
                    <td className="table-cell text-center font-mono font-bold text-primary-600 bg-primary-50 text-lg">
                      {n(item.netPay).toLocaleString()}
                    </td>
                    <td className="table-cell text-center">
                      <span className={`badge text-xs ${
                        item.payMethod === 'transfer' ? 'bg-blue-50 text-blue-700'
                        : item.payMethod === 'cash' ? 'bg-amber-50 text-amber-700'
                        : 'bg-purple-50 text-purple-700'
                      }`}>
                        {payMethodLabels[item.payMethod] ?? item.payMethod}
                      </span>
                      {emp?.bankName && (
                        <p className="text-[10px] text-gray-400 mt-0.5">{emp.bankName}</p>
                      )}
                    </td>
                    <td className="table-cell text-center">
                      {runDetail?.status === 'PAID' ? (
                        <span className="text-xs px-3 py-1.5 rounded-lg font-medium bg-success-500 text-white">
                          صُرف ✓
                        </span>
                      ) : runDetail?.status === 'APPROVED' ? (
                        <span className="text-xs text-gray-400">معتمد — بانتظار الصرف</span>
                      ) : (
                        <span className="text-xs text-gray-400">بانتظار الاعتماد</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          href={`/payroll/payslip/${item.employeeId}`}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Eye size={18} className="text-gray-500" />
                        </Link>
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                          <Printer size={18} className="text-gray-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                )}
              </tbody>
              {filteredItems.length > 0 && (
              <tfoot>
                <tr className="bg-gray-100">
                  <td className="px-4 py-4 font-bold text-gray-800">الإجمالي</td>
                  <td className="px-4 py-4 text-center font-mono font-bold">
                    {filteredItems.reduce((s, r) => s + n(r.basicSalary), 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold">
                    {filteredItems.reduce((s, r) => s + allowancesOf(r), 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold">
                    {filteredItems.reduce((s, r) => s + n(r.overtimeAmount), 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-success-600 bg-success-100">
                    {totals.totalEarnings.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-danger-600">
                    {filteredItems.reduce((s, r) => s + n(r.latenessDeduction), 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-danger-600">
                    {filteredItems.reduce((s, r) => s + n(r.unpaidLeaveDeduction), 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-danger-600">
                    {filteredItems.reduce((s, r) => s + n(r.loanInstallments), 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-danger-600 bg-danger-100">
                    {totals.totalDeductions.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-primary-600 bg-primary-100 text-lg">
                    {totals.netSalary.toLocaleString()}
                  </td>
                  <td className="px-4 py-4" colSpan={3}></td>
                </tr>
              </tfoot>
              )}
            </table>
          </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button className="btn-secondary flex items-center gap-2">
                <FileText size={18} />
                تقرير ملخص
              </button>
              <button className="btn-secondary flex items-center gap-2">
                <Download size={18} />
                ملف WPS
              </button>
              <button className="btn-secondary flex items-center gap-2">
                <FileText size={18} />
                ملف GOSI
              </button>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleApprove}
                disabled={actionBusy || !runDetail}
                className="btn-success flex items-center gap-2 disabled:opacity-50"
              >
                <Lock size={18} />
                اعتماد الرواتب
              </button>
              <button
                onClick={handlePay}
                disabled={actionBusy || !runDetail}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                <Send size={18} />
                إرسال للبنك (صرف)
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
