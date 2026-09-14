'use client'

import { useEffect, useRef, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  fetchPayrollRuns,
  fetchPayrollRun,
  calculatePayroll,
  approvePayroll,
  payPayroll,
  reopenPayroll,
  cancelPayroll,
  ApiError,
  can,
  fetchPayMethodReport,
  fetchBranches,
  fetchEmployees,
  type ApiPayrollRun,
  type ApiPayrollItem,
  type ApiPayrollConflict,
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
import { PayrollOvertimeBreakdown } from '@/components/PayrollOvertimeBreakdown'
import { PayrollInstallmentBreakdown } from '@/components/PayrollInstallmentBreakdown'

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
  CANCELLED: 'ملغى',
}

// مراحل دورة المسير الفعلية: الحساب ← الاعتماد ← الصرف
const runStages = ['الحساب', 'الاعتماد', 'الصرف']
const stageOfStatus: Record<ApiPayrollRun['status'], number> = {
  CALCULATED: 1,
  APPROVED: 2,
  PAID: 3,
  CANCELLED: -1,
}

const exclusionLabels: Record<string, string> = {
  SUSPENDED: 'الموظف موقوف',
  ARCHIVED: 'ملف الموظف مؤرشف',
  EXC_JOINS_AFTER_PERIOD: 'بداية العمل بعد نهاية الفترة',
  EXC_TERMINATED_BEFORE_PERIOD: 'انتهاء الخدمة قبل بداية الفترة',
  EXC_NO_ACTIVE_EMPLOYMENT: 'لا توجد مدة عمل مستحقة داخل الفترة',
  MANUAL: 'استبعاد يدوي',
  EXC_MANUAL: 'استبعاد يدوي',
}

const errorConflicts = (error: unknown): ApiPayrollConflict[] => {
  const conflicts = error instanceof ApiError ? error.details?.conflicts : undefined
  return Array.isArray(conflicts) ? conflicts.filter((row): row is ApiPayrollConflict =>
    row != null && typeof row === 'object' && typeof row.employeeId === 'number' && typeof row.blocking === 'boolean'
  ) : []
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
  const detailRequest = useRef(0)
  const [calculationReason, setCalculationReason] = useState('')
  const [changeReason, setChangeReason] = useState('')
  const [allowDraftConflicts, setAllowDraftConflicts] = useState(false)
  const [refreshInstallmentPolicy, setRefreshInstallmentPolicy] = useState(false)
  const [calculationConflicts, setCalculationConflicts] = useState<ApiPayrollConflict[]>([])
  const [actionConflicts, setActionConflicts] = useState<ApiPayrollConflict[]>([])

  const [searchQuery, setSearchQuery] = useState('')
  const [periodType, setPeriodType] = useState<'monthly' | 'custom'>('monthly')
  const [customPeriod, setCustomPeriod] = useState({ from: '2026-01-01', to: '2026-01-31' })
  // مسير مستقل لكل فرع + فترة الاحتساب (YYYY-MM)
  const [calcBranchId, setCalcBranchId] = useState<number | null>(null)
  const [calcPeriod, setCalcPeriod] = useState(() => new Date().toISOString().slice(0, 7))

  const loadDetail = async (id: number) => {
    const request = ++detailRequest.current
    setDetailLoading(true)
    setChangeReason('')
    setActionConflicts([])
    setPayMethods(null)
    try {
      const detail = await fetchPayrollRun(id)
      if (request !== detailRequest.current) return
      setRunDetail(detail)
      try {
        const report = await fetchPayMethodReport(id)
        if (request === detailRequest.current) setPayMethods(report)
      } catch {
        if (request === detailRequest.current) setPayMethods(null)
      }
    } catch (e) {
      if (request === detailRequest.current) {
        setRunDetail(null)
        setError(e instanceof Error ? e.message : 'تعذر تحميل تفاصيل المسير')
      }
    } finally {
      if (request === detailRequest.current) setDetailLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchPayrollRuns(), fetchBranches(), can('employees.view') ? fetchEmployees() : Promise.resolve([])])
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
      detailRequest.current += 1
    }
  }, [])

  useEffect(() => {
    setCalculationReason('')
    setAllowDraftConflicts(false)
    setCalculationConflicts([])
  }, [calcBranchId, calcPeriod])

  const existingCalculationRun = runs.find(run => run.branchId === calcBranchId && run.period === calcPeriod &&
    (!run.scopeType || run.scopeType === 'BRANCH') && run.status !== 'CANCELLED')
  const calculationLocked = !!existingCalculationRun && existingCalculationRun.status !== 'CALCULATED'
  const calculateDisabled = actionBusy || detailLoading || periodType !== 'monthly' || calcBranchId == null || !calcPeriod || calculationLocked ||
    (!!existingCalculationRun && !calculationReason.trim())
  const runConflicts = actionConflicts.length ? actionConflicts : runDetail?.conflicts ?? []
  const runBlocked = runDetail?.blocking === true || runConflicts.some(conflict => conflict.blocking)

  const refreshRuns = async (selectId?: number) => {
    const runsData = await fetchPayrollRuns()
    setRuns(runsData)
    const id = selectId ?? runDetail?.id
    if (id != null && runsData.some((r) => r.id === id)) await loadDetail(id)
  }

  const handleCalculate = async () => {
    if (calculateDisabled || !can('payroll.calculate') || calcBranchId == null) return
    setActionBusy(true)
    setError('')
    try {
      const run = await calculatePayroll(calcBranchId, calcPeriod, {
        reason: calculationReason.trim() || undefined,
        allowDraftConflicts,
        refreshInstallmentPolicy,
      })
      await refreshRuns(run.id)
      setCalculationReason('')
      setAllowDraftConflicts(false)
      setCalculationConflicts([])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر احتساب المسير')
      setCalculationConflicts(errorConflicts(e))
    } finally {
      setActionBusy(false)
    }
  }

  const handleApprove = async () => {
    if (!runDetail || runDetail.status !== 'CALCULATED' || actionBusy || detailLoading || runBlocked || !can('payroll.approve')) return
    setActionBusy(true)
    setError('')
    try {
      await approvePayroll(runDetail.id)
      await refreshRuns(runDetail.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر اعتماد المسير')
      setActionConflicts(errorConflicts(e))
    } finally {
      setActionBusy(false)
    }
  }

  const handlePay = async () => {
    if (!runDetail || runDetail.status !== 'APPROVED' || actionBusy || detailLoading || runBlocked || !can('payroll.pay')) return
    setActionBusy(true)
    setError('')
    try {
      await payPayroll(runDetail.id)
      await refreshRuns(runDetail.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر صرف المسير')
      setActionConflicts(errorConflicts(e))
    } finally {
      setActionBusy(false)
    }
  }

  const handleRunChange = async (action: 'reopen' | 'cancel') => {
    if (!runDetail || actionBusy || detailLoading || !changeReason.trim() || !can(`payroll.${action}`)) return
    if (runDetail.status !== (action === 'reopen' ? 'APPROVED' : 'CALCULATED')) return
    setActionBusy(true)
    setError('')
    try {
      await (action === 'reopen' ? reopenPayroll : cancelPayroll)(runDetail.id, changeReason.trim())
      await refreshRuns(runDetail.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تعديل حالة المسير')
      setActionConflicts(errorConflicts(e))
    } finally {
      setActionBusy(false)
    }
  }

  const branchName = (id?: number | null) =>
    branches.find((b) => b.id === id)?.name ?? (id != null ? `فرع #${id}` : '')
  const employeeOf = (id: number) => employees.find((e) => e.id === id)
  const snapshotOf = (id: number) => runDetail?.members?.find(member => member.employeeId === id)?.snapshot
  const employeeName = (id: number) => snapshotOf(id)?.fullName ?? employeeOf(id)?.fullName ?? `موظف #${id}`
  const excludedMembers = runDetail?.members?.filter(member => member.membershipStatus === 'EXCLUDED') ?? []
  const showConflicts = (conflicts: ApiPayrollConflict[], title: string) => conflicts.length > 0 && (
    <div role="alert" className={`rounded-xl border p-4 space-y-2 ${conflicts.some(row => row.blocking) ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
      <p className="font-bold flex items-center gap-2"><AlertCircle size={18} />{title}</p>
      <p className="text-sm">{conflicts.some(row => row.blocking)
        ? 'تعارض حاجب: لا يمكن تجاوزه بخيار حفظ المسودة. عالج حجز الموظف في المسير الآخر قبل المتابعة.'
        : 'تعارض مع مسودات أخرى. الحفظ للمراجعة يتطلب اختيارك الصريح، ويُعاد فحص التعارضات عند الاعتماد.'}</p>
      <ul className="space-y-1 text-sm">
        {conflicts.map((conflict, index) => (
          <li key={`${conflict.employeeId}-${conflict.otherRunId}-${index}`}>
            {employeeName(conflict.employeeId)} — {conflict.name || (conflict.otherRunId != null ? `مسير #${conflict.otherRunId}` : 'مسير خارج نطاق الصلاحية')}
            {' '}({statusLabels[conflict.status as ApiPayrollRun['status']] ?? conflict.status}) — {conflict.overlapDays} يوم متداخل
            {' '}<span dir="ltr">{fmtDate(conflict.startDate)} / {fmtDate(conflict.endDate)}</span>
            {conflict.blocking && <strong> — حاجب</strong>}
          </li>
        ))}
      </ul>
    </div>
  )

  const runStage = runDetail ? stageOfStatus[runDetail.status] : 0
  const items: ApiPayrollItem[] = runDetail?.items ?? []

  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true
    const emp = employeeOf(item.employeeId)
    return (
      employeeName(item.employeeId).includes(searchQuery) ||
      (snapshotOf(item.employeeId)?.employeeCode ?? emp?.employeeCode ?? '').includes(searchQuery)
    )
  })

  // إجماليات المسير من البنود الفعلية
  const totals = filteredItems.reduce(
    (acc, item) => {
      const gross =
        n(item.basicSalary) +
        allowancesOf(item) +
        n(item.overtimeAmount) +
        n(item.otherAdditions)
      const deductions =
        n(item.latenessDeduction) +
        n(item.shortfallDeduction) +
        n(item.absenceDeduction) +
        n(item.unpaidLeaveDeduction) +
        n(item.loanInstallments) +
        n(item.otherDeductions)
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
            <Link href="/payroll/policies" className="btn-secondary text-sm">سياسات الرواتب</Link>
            <Link href="/payroll/salary-history" className="btn-secondary text-sm">سجل الأجر المؤرخ</Link>
            <button className="btn-secondary flex items-center gap-2">
              <Upload size={18} />
              استيراد
            </button>
            <button className="btn-secondary flex items-center gap-2">
              <Download size={18} />
              تصدير Excel
            </button>
            {can('payroll.calculate') && <button
              onClick={handleCalculate}
              disabled={calculateDisabled}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              <Calculator size={18} />
              احتساب المسير
            </button>}
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
                  disabled={actionBusy || detailLoading}
                  onChange={(e) => {
                    const id = Number(e.target.value)
                    setError('')
                    if (id) loadDetail(id)
                  }}
                  className="input w-72"
                >
                  {runs.length === 0 && <option value="">لا توجد مسيرات بعد</option>}
                  {runs.map((run) => (
                    <option key={run.id} value={run.id}>
                      {run.period} — {run.name || branchName(run.branchId) || 'مسير متعدد النطاقات'} ({statusLabels[run.status]})
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
                {can('payroll.calculate') && <div className="flex flex-wrap items-center gap-2 p-2 px-4 bg-primary-50 rounded-xl border border-primary-100">
                  <span className="text-sm font-medium text-gray-700">مسير فرع:</span>
                  <select
                    value={calcBranchId ?? ''}
                    disabled={actionBusy}
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
                    disabled={actionBusy}
                    onChange={(e) => setCalcPeriod(e.target.value)}
                    className="input w-40 py-1"
                    dir="ltr"
                  />
                  <button
                    onClick={handleCalculate}
                    disabled={calculateDisabled}
                    className="btn-primary flex items-center gap-2 text-sm py-1.5 disabled:opacity-50"
                  >
                    <Calculator size={16} />
                    احتساب
                  </button>
                  <span className="text-xs text-primary-600">كل فرع بمسيره واعتماداته المستقلة</span>
                </div>}
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
            {can('payroll.calculate') && periodType === 'monthly' && (
              <div className="space-y-3 border-t border-gray-100 pt-4">
                <div>
                  <label htmlFor="payroll-calculation-reason" className="block text-sm font-medium text-gray-700 mb-2">
                    سبب إعادة الحساب {existingCalculationRun ? '(مطلوب)' : '(عند إعادة حساب مسير موجود)'}
                  </label>
                  <input id="payroll-calculation-reason" value={calculationReason}
                    onChange={e => setCalculationReason(e.target.value)} maxLength={500}
                    disabled={actionBusy || calculationLocked} required={!!existingCalculationRun}
                    placeholder="وضّح التعديل المطلوب وسبب إعادة الحساب" className="input w-full" />
                  {existingCalculationRun && <p className="text-xs text-gray-500 mt-2">
                    يوجد مسير #{existingCalculationRun.id} لنفس الفرع والفترة — {statusLabels[existingCalculationRun.status]}.
                    {existingCalculationRun.status === 'APPROVED' ? ' أعد فتح المسير المعتمد أولًا من إجراءات المسير.'
                      : existingCalculationRun.status === 'PAID' ? ' المسير المصروف مقفل ولا يمكن إعادة حسابه.'
                      : existingCalculationRun.status === 'CANCELLED' ? ' المسير الملغى لا يقبل إعادة الحساب.'
                      : ' سيُحفظ السبب مع نسخة الحساب الجديدة.'}
                  </p>}
                </div>
                <label className="flex items-start gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={allowDraftConflicts}
                    onChange={e => setAllowDraftConflicts(e.target.checked)} disabled={actionBusy || calculationLocked}
                    className="mt-1 rounded border-gray-300" />
                  حفظ مسودة للمراجعة رغم تعارضها مع مسودات أخرى
                </label>
                <label className="flex items-start gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={refreshInstallmentPolicy}
                    onChange={e => setRefreshInstallmentPolicy(e.target.checked)} disabled={actionBusy || calculationLocked}
                    className="mt-1 rounded border-gray-300" />
                  تطبيق إعدادات الأقساط الحالية عند إعادة الحساب بدل الاختيارات المحفوظة مع المسير
                </label>
                {showConflicts(calculationConflicts, 'تعارضات محاولة الحساب')}
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
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold text-gray-800">
                  دورة اعتماد مسير {runDetail.name || branchName(runDetail.branchId) || 'متعدد النطاقات'} — {runDetail.period}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {runDetail.snapshotVersion ? `نسخة الحساب: ${runDetail.snapshotVersion}` : 'مسير سابق — لا توجد نسخة موثقة للعضوية'}
                  {' '}• الحالة: {statusLabels[runDetail.status]}
                </p>
              </div>
              {runDetail.status === 'CALCULATED' && can('payroll.approve') && (
                <button
                  onClick={handleApprove}
                  disabled={actionBusy || detailLoading || runBlocked}
                  className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  <CheckCircle size={16} />
                  اعتماد المسير
                </button>
              )}
              {runDetail.status === 'APPROVED' && can('payroll.pay') && (
                <button
                  onClick={handlePay}
                  disabled={actionBusy || detailLoading || runBlocked}
                  className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  <CheckCircle size={16} />
                  صرف المسير
                </button>
              )}
              {runDetail.status === 'PAID' && (
                <span className="badge badge-success">المسير مصروف ومقفل ✓</span>
              )}
              {runDetail.status === 'CANCELLED' && <span className="badge bg-gray-100 text-gray-600">المسير ملغى ومقفل</span>}
            </div>
            {showConflicts(runConflicts, 'تعارضات المسير الحالي')}
            {!!runDetail.pendingOvertime?.length && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 my-4 space-y-2" role="status">
              <h4 className="font-bold text-amber-900">إضافي معلّق داخل الفترة — {runDetail.pendingOvertime.length} سجل</h4>
              <p className="text-sm text-amber-800">هذه الساعات لم يكتمل اعتمادها، ولا تدخل في قيمة المسير. راجعها قبل الإقفال؛ اعتمادها بعد الإقفال يجعلها مستحقات عن الفترة الأصلية في مسير لاحق.</p>
              <ul className="text-sm space-y-2 max-h-56 overflow-y-auto">{runDetail.pendingOvertime.map(row => <li key={row.id} className="flex flex-wrap items-center gap-2 border-t border-amber-100 pt-2">
                <span>{runDetail.members?.find(member => member.employeeId === row.employeeId)?.snapshot?.fullName ?? employees.find(employee => employee.id === row.employeeId)?.fullName ?? `موظف #${row.employeeId}`}</span><span>· {row.date} · {row.status === 'DETECTED' ? 'مكتشف ولم يُوجّه للاعتماد' : 'في دورة الاعتماد'}</span>
                {row.detectedMinutes != null && <span>· {row.detectedMinutes} دقيقة محتسبة</span>}
                {row.requestId && <Link href={`/approvals-inbox?request=${row.requestId}`} className="text-primary-700 underline">مراجعة الطلب #{row.requestId}</Link>}
              </li>)}</ul>
              <button onClick={() => loadDetail(runDetail.id)} disabled={detailLoading || actionBusy} className="text-sm text-primary-700 underline">تحديث حالة الإضافي</button>
            </div>}
            {runBlocked && !runConflicts.length && <p role="alert" className="p-3 mb-3 bg-red-50 text-red-700 rounded-xl text-sm">يوجد تعارض حاجب يمنع اعتماد المسير أو صرفه. راجع المسير قبل المتابعة.</p>}
            {(runBlocked || runConflicts.length > 0) && <button
              onClick={() => { setError(''); loadDetail(runDetail.id) }} disabled={actionBusy || detailLoading}
              className="btn-secondary text-sm mt-2 mb-3 disabled:opacity-50">تحديث حالة التعارضات</button>}
            {((runDetail.status === 'APPROVED' && can('payroll.reopen')) ||
              (runDetail.status === 'CALCULATED' && can('payroll.cancel'))) && (
              <div className="space-y-2 my-4 p-4 rounded-xl border border-gray-200 bg-gray-50">
                <label htmlFor="payroll-change-reason" className="block text-sm font-medium text-gray-700">
                  سبب {runDetail.status === 'APPROVED' ? 'إعادة فتح المسير' : 'إلغاء المسير'} (مطلوب)
                </label>
                <div className="flex flex-wrap gap-2">
                  <input id="payroll-change-reason" value={changeReason} onChange={e => setChangeReason(e.target.value)}
                    maxLength={500} required disabled={actionBusy || detailLoading}
                    className="input flex-1 min-w-48" placeholder="اكتب سببًا واضحًا يُحفظ في سجل المسير" />
                  <button onClick={() => handleRunChange(runDetail.status === 'APPROVED' ? 'reopen' : 'cancel')}
                    disabled={actionBusy || detailLoading || !changeReason.trim()}
                    className="btn-secondary disabled:opacity-50">
                    {runDetail.status === 'APPROVED' ? 'إعادة فتح للمراجعة' : 'إلغاء المسير'}
                  </button>
                </div>
                <p className="text-xs text-gray-500">{runDetail.status === 'APPROVED'
                  ? 'تعيد هذه العملية المسير إلى المسودة، ويحتاج إلى اعتماد جديد قبل الصرف.'
                  : 'يُحفظ المسير الملغى وسجل تغييراته للمراجعة، ولا يمكن صرفه.'}</p>
              </div>
            )}
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

        {excludedMembers.length > 0 && (
          <div className="card border border-amber-200">
            <h3 className="font-bold text-gray-800 mb-3">المستبعدون من هذه النسخة ({excludedMembers.length})</h3>
            <div className="space-y-2 text-sm">
              {excludedMembers.map(member => <div key={member.employeeId} className="flex flex-wrap items-center justify-between gap-2 bg-amber-50 rounded-lg p-3">
                <span className="font-medium">{employeeName(member.employeeId)} {member.snapshot?.employeeCode && `(${member.snapshot.employeeCode})`}</span>
                <span className="text-amber-900">{member.snapshot?.manualReason || exclusionLabels[member.exclusionReason ?? ''] || member.exclusionReason || 'سبب الاستبعاد غير موثق في المسير السابق'}</span>
              </div>)}
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
                  <th className="text-center px-4 py-4">إضافات أخرى</th>
                  <th className="text-center px-4 py-4 bg-success-50">الإجمالي</th>
                  <th className="text-center px-4 py-4">خصم التأخير</th>
                  <th className="text-center px-4 py-4">نقص ساعات العمل</th>
                  <th className="text-center px-4 py-4">خصم الغياب</th>
                  <th className="text-center px-4 py-4">إجازة بدون راتب</th>
                  <th className="text-center px-4 py-4">أقساط السلف</th>
                  <th className="text-center px-4 py-4">خصومات أخرى</th>
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
                    <td colSpan={17} className="px-4 py-10 text-center text-sm text-gray-400">
                      {runDetail ? 'لا توجد بنود في هذا المسير' : 'اختر مسيراً أو احسب مسيراً جديداً'}
                    </td>
                  </tr>
                )}
                {filteredItems.map((item) => {
                  const emp = employeeOf(item.employeeId)
                  const snapshot = snapshotOf(item.employeeId)
                  const name = employeeName(item.employeeId)
                  const gross =
                    n(item.basicSalary) +
                    allowancesOf(item) +
                    n(item.overtimeAmount) +
                    n(item.otherAdditions)
                  const totalDeductions =
                    n(item.latenessDeduction) +
                    n(item.shortfallDeduction) +
                    n(item.absenceDeduction) +
                    n(item.unpaidLeaveDeduction) +
                    n(item.loanInstallments) +
                    n(item.otherDeductions)

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
                            {snapshot?.employeeCode ?? emp?.employeeCode ?? ''}
                            {snapshot?.branchName && ` • ${snapshot.branchName}`}
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
                        <PayrollOvertimeBreakdown item={item} currency={currency} compact />
                        <PayrollInstallmentBreakdown item={item} currency={currency} compact />
                      </div>
                    </td>
                    <td className="table-cell text-center font-mono">
                      <span className={n(item.otherAdditions) > 0 ? 'text-success-600' : ''}>
                        {n(item.otherAdditions) > 0 ? n(item.otherAdditions).toLocaleString() : '-'}
                      </span>
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
                      <span className={n(item.shortfallDeduction) > 0 ? 'text-danger-600' : ''}>{n(item.shortfallDeduction).toLocaleString()}</span>
                      {n(item.shortfallMinutes) > 0 && <p className="text-xs text-gray-500">{n(item.shortfallMinutes)} دقيقة نقص مرصود</p>}
                    </td>
                    <td className="table-cell text-center font-mono">
                      <div className="flex flex-col items-center">
                        <span className={n(item.absenceDeduction) > 0 ? 'text-danger-600' : ''}>
                          {n(item.absenceDeduction) > 0 ? n(item.absenceDeduction).toLocaleString() : '-'}
                        </span>
                        {n(item.absenceDays) > 0 && (
                          <span className="text-xs text-danger-600">{n(item.absenceDays)} يوم</span>
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
                    <td className="table-cell text-center font-mono">
                      {n(item.otherDeductions) > 0 ? (
                        <span className="text-danger-600">{n(item.otherDeductions).toLocaleString()}</span>
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
                      {!snapshot && emp?.bankName && (
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
                      ) : runDetail?.status === 'CANCELLED' ? (
                        <span className="text-xs text-gray-400">ملغى — لا يقبل الصرف</span>
                      ) : (
                        <span className="text-xs text-gray-400">بانتظار الاعتماد</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          href={`/payroll/payslip/${item.id}`}
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
                  <td className="px-4 py-4 text-center font-mono font-bold text-success-600">
                    {filteredItems.reduce((s, r) => s + n(r.otherAdditions), 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-success-600 bg-success-100">
                    {totals.totalEarnings.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-danger-600">
                    {filteredItems.reduce((s, r) => s + n(r.latenessDeduction), 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-danger-600">
                    {filteredItems.reduce((s, r) => s + n(r.shortfallDeduction), 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-danger-600">
                    {filteredItems.reduce((s, r) => s + n(r.absenceDeduction), 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-danger-600">
                    {filteredItems.reduce((s, r) => s + n(r.unpaidLeaveDeduction), 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-danger-600">
                    {filteredItems.reduce((s, r) => s + n(r.loanInstallments), 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-danger-600">
                    {filteredItems.reduce((s, r) => s + n(r.otherDeductions), 0).toLocaleString()}
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
              {can('payroll.approve') && <button
                onClick={handleApprove}
                disabled={actionBusy || detailLoading || runDetail?.status !== 'CALCULATED' || runBlocked}
                className="btn-success flex items-center gap-2 disabled:opacity-50"
              >
                <Lock size={18} />
                اعتماد الرواتب
              </button>}
              {can('payroll.pay') && <button
                onClick={handlePay}
                disabled={actionBusy || detailLoading || runDetail?.status !== 'APPROVED' || runBlocked}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                <Send size={18} />
                إرسال للبنك (صرف)
              </button>}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
