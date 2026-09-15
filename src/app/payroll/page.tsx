'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  fetchPayrollRuns,
  fetchPayrollRun,
  approvePayroll,
  reopenPayroll,
  cancelPayroll,
  ApiError,
  can,
  fetchPayMethodReport,
  fetchBranches,
  fetchDepartments,
  fetchTeams,
  fetchEmployees,
  type ApiPayrollRun,
  type ApiPayrollItem,
  type ApiPayrollConflict,
  type ApiBranch,
  type ApiDepartment,
  type ApiTeam,
  type ApiEmployee,
} from '@/lib/api'
import {
  calculatePayrollRunDraft, fetchPayrollRunMembershipPreview, MEMBERSHIP_EXCLUSION_LABELS, payrollRunErrorMessage, recalculatePayrollRun,
  SELECTION_MODE_LABELS, type PayrollMembershipPreview, type PayrollRunWithSelection,
} from '@/lib/payroll-runs-api'
import { PayrollRunDefinitionPanel } from '@/components/payroll/PayrollRunDefinitionPanel'
import { PayrollDraftMembership } from '@/components/payroll/PayrollDraftMembership'
import { PayrollUnassignedPanel } from '@/components/payroll/PayrollUnassignedPanel'
// B4 / الخطوتان 19 و20: لقطة السياسة ومحرك الحساب وتقرير التكافؤ
import { PayrollPolicySnapshotPanel, type PolicySnapshotRefreshChoice } from '@/components/payroll/PayrollPolicySnapshotPanel'
import { PayrollRunEnginePanel } from '@/components/payroll/PayrollRunEnginePanel'
import { PayrollFinancialExemptionsPanel } from '@/components/payroll/PayrollFinancialExemptionsPanel'
// C8 / الخطوة 31: تصحيح المسير المصروف — مسير عكس صرف ومسير تكميلي مربوطان وتقرير تسوياتهما
import { PayrollRunCorrectionsPanel } from '@/components/payroll/PayrollRunCorrectionsPanel'
// B5 / الخطوة 22: منسّق المبالغ الموحد، ومجاميع البنود بالقروش، والتغطية، وسجل المسير، وقيد الصرف، وحل التعارضات، وترتيب التحصيل
import { formatMoney, formatMoneyOrDash } from '@/lib/money'
import { payrollCoverageText, payrollItemCoverage, payrollItemDeductions, payrollItemEarnings, payrollRunTotals } from '@/lib/payroll-item-totals'
import { collectionOrderText, payPayrollRun, type PayrollPayChannel, type PayrollRunScreenFields } from '@/lib/payroll-runs-api'
import { PayrollRunEventsPanel } from '@/components/payroll/PayrollRunEventsPanel'
import { PayrollConflictResolution } from '@/components/payroll/PayrollConflictResolution'
import { PayrollPayRecordForm, PayrollPayRecordSummary, payRecordReady, type PayRecordDraft } from '@/components/payroll/PayrollPayRecordForm'
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
import { downloadCsv, csvDateStamp } from '@/lib/csv'
import { PayrollOvertimeBreakdown } from '@/components/PayrollOvertimeBreakdown'
import { PayrollInstallmentBreakdown } from '@/components/PayrollInstallmentBreakdown'
import { PayrollObligationBreakdown } from '@/components/PayrollObligationBreakdown'
import { PayrollShadowAttendanceBreakdown } from '@/components/payroll/PayrollShadowAttendanceBreakdown'

// حقل البدلات الجديد في بند المسير (ليس بعد ضمن ApiPayrollItem)
type PayrollItemWithAllowances = ApiPayrollItem & { allowances?: number }

const payMethodLabels: Record<string, string> = {
  transfer: 'تحويل بنكي',
  cash: 'كاش',
  visa: 'فيزا',
}

// خريطة حالة المسير في الباك إند إلى تسميات الشاشة
const statusLabels: Record<ApiPayrollRun['status'], string> = {
  DRAFT: 'مسودة',
  CALCULATED: 'محسوب',
  APPROVED: 'معتمد',
  PAID: 'مصروف',
  CANCELLED: 'ملغى',
}

// مراحل دورة المسير الفعلية: الحساب ← الاعتماد ← الصرف
const runStages = ['الحساب', 'الاعتماد', 'الصرف']
const stageOfStatus: Record<ApiPayrollRun['status'], number> = {
  DRAFT: 0,
  CALCULATED: 1,
  APPROVED: 2,
  PAID: 3,
  CANCELLED: -1,
}

const exclusionLabels: Record<string, string> = {
  // الخطوات 16–17: أكواد الانتقال والاستبعاد اليدوي والحجز في مسير آخر ومشاكل البيانات
  ...MEMBERSHIP_EXCLUSION_LABELS,
  SUSPENDED: 'الموظف موقوف',
  ARCHIVED: 'ملف الموظف مؤرشف',
  EXC_JOINS_AFTER_PERIOD: 'بداية العمل بعد نهاية الفترة',
  EXC_TERMINATED_BEFORE_PERIOD: 'انتهاء الخدمة قبل بداية الفترة',
  EXC_NO_ACTIVE_EMPLOYMENT: 'لا توجد مدة عمل مستحقة داخل الفترة',
  MANUAL: 'استبعاد يدوي',
  EXC_MANUAL: 'استبعاد يدوي',
  // الخطوة 13: راتب شهر المسير من السجل الشهري
  NO_SALARY_DEFINED: 'لا يوجد راتب موثق لشهر المسير — أثبته «يسري من راتب شهر» من سجل الأجر',
  SALARY_DAILY_HISTORY_ONLY: 'سجل الأجر بتواريخ يومية لا تحدد شهر الراتب — حوّله إلى شهور',
  SALARY_PAYROLL_PERIOD_GAP: 'شهر المسير غير موثق في سجل الأجر الشهري',
  SALARY_PAYROLL_PERIOD_INVALID: 'سجل الأجر الشهري غير صالح لهذا الشهر',
  SALARY_HISTORY_INVALID: 'سجل الأجر لا يطابق بصمته الموثقة',
  SALARY_HISTORY_SCHEMA_MISSING: 'ترحيل سجل الأجر غير مطبق',
  SALARY_COMPONENT_INVALID: 'أحد مكونات راتب الملف غير صالح',
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
  // الخطوة 22 (B5): قيد الصرف (القناة والمرجع) وعدّاد تحميل التفاصيل لتحديث سجل المسير
  const [payRecord, setPayRecord] = useState<PayRecordDraft>({ channel: '', reference: '' })
  const [detailStamp, setDetailStamp] = useState(0)

  const [searchQuery, setSearchQuery] = useState('')
  const [periodType, setPeriodType] = useState<'monthly' | 'custom'>('monthly')
  const [customPeriod, setCustomPeriod] = useState({ from: '2026-01-01', to: '2026-01-31' })
  // الخطوة 16: «مسير جديد» (تعريف مسودة) منفصل عن «احتساب المسودة» و«إعادة حساب مسير»
  const [departments, setDepartments] = useState<ApiDepartment[]>([])
  const [teams, setTeams] = useState<ApiTeam[]>([])
  const [showDefinition, setShowDefinition] = useState(false)
  const [editingDraft, setEditingDraft] = useState<PayrollRunWithSelection | null>(null)
  const [draftPreview, setDraftPreview] = useState<PayrollMembershipPreview | null>(null)
  const [draftPreviewError, setDraftPreviewError] = useState('')
  // الخطوة 18: الاعتماد متاح فقط بعد إقرار ساري بتقرير «موظفون بلا مسير»
  const [unassignedAckCurrent, setUnassignedAckCurrent] = useState(false)
  const handleAckChange = useCallback((current: boolean) => setUnassignedAckCurrent(current), [])
  // الخطوة 19: اختيار «تحديث لقطة السياسة» من لوحة اللقطة (مع بصمة الإعدادات المعروضة)
  const [policyRefresh, setPolicyRefresh] = useState<PolicySnapshotRefreshChoice>({ refresh: false, expectedHash: null })
  const handlePolicyRefreshChoice = useCallback((choice: PolicySnapshotRefreshChoice) => setPolicyRefresh(choice), [])

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
      setDetailStamp(stamp => stamp + 1)
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
        // رابط «المسير #…» من المعاينة يفتح المسير المطلوب مباشرة
        const wanted = typeof window === 'undefined' ? 0 : Number(new URLSearchParams(window.location.search).get('run'))
        const initial = runsData.find(run => run.id === wanted) ?? runsData[0]
        if (initial) loadDetail(initial.id)
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

  // الفلاتر المترابطة تحتاج الأقسام والفرق؛ غيابها لا يمنع عرض المسيرات
  useEffect(() => {
    if (!can('payroll.calculate')) return
    let cancelled = false
    Promise.all([fetchDepartments(), fetchTeams()])
      .then(([departmentRows, teamRows]) => { if (!cancelled) { setDepartments(departmentRows); setTeams(teamRows) } })
      .catch(() => { /* الفلاتر تعرض الفروع فقط */ })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    setCalculationReason('')
    setAllowDraftConflicts(false)
    setCalculationConflicts([])
    setUnassignedAckCurrent(false)
    setPayRecord({ channel: '', reference: '' })
  }, [runDetail?.id, runDetail?.snapshotVersion])

  // المسودة: معاينة العضوية المحفوظة (قراءة فقط) قبل «احتساب المسودة»
  useEffect(() => {
    setDraftPreview(null)
    setDraftPreviewError('')
    if (!runDetail || runDetail.status !== 'DRAFT' || !can('payroll.calculate')) return
    let cancelled = false
    fetchPayrollRunMembershipPreview(runDetail.id)
      .then(preview => { if (!cancelled) setDraftPreview(preview) })
      .catch(e => { if (!cancelled) setDraftPreviewError(payrollRunErrorMessage(e, 'تعذرت معاينة عضوية المسودة')) })
    return () => { cancelled = true }
  }, [runDetail])

  const calculationTarget = runDetail && (runDetail.status === 'DRAFT' || runDetail.status === 'CALCULATED') ? runDetail : null
  const calculateDisabled = actionBusy || detailLoading || !calculationTarget ||
    (calculationTarget.status === 'CALCULATED' && !calculationReason.trim())
  const runConflicts = actionConflicts.length ? actionConflicts : runDetail?.conflicts ?? []
  const runBlocked = runDetail?.blocking === true || runConflicts.some(conflict => conflict.blocking)
  // الخطوة 22 (B5): حقول شاشة المسير (المنفذون، فصل المهام، قيد الصرف، ترتيب التحصيل)؛ فصل المهام والصافي السالب يمنعان الاعتماد
  const screen = runDetail as (ApiPayrollRun & PayrollRunScreenFields) | null
  const negativeNetCount = (runDetail?.items ?? []).filter(item => n(item.netPay) < 0).length
  const approvalBlocked = !!screen?.approvalGuard?.blocked || negativeNetCount > 0
  // C8 / الخطوة 31: مسير العكس لا يُحتسب ولا يُقر له تقرير «بلا مسير» ولا لقطة سياسة أو تكافؤ؛ اعتماده بفصل المهام وتنفيذه بقيد الاسترداد
  const isReversalRun = runDetail?.runType === 'REVERSAL'

  const refreshRuns = async (selectId?: number) => {
    const runsData = await fetchPayrollRuns()
    setRuns(runsData)
    const id = selectId ?? runDetail?.id
    if (id != null && runsData.some((r) => r.id === id)) await loadDetail(id)
  }

  // «احتساب المسودة» لأول مرة، أو «إعادة حساب المسير» المحسوب بسبب إلزامي — لا ينشئ أي منهما مسيرًا جديدًا
  const handleCalculate = async () => {
    if (calculateDisabled || !can('payroll.calculate') || !calculationTarget) return
    setActionBusy(true)
    setError('')
    try {
      const run = calculationTarget.status === 'DRAFT'
        ? await calculatePayrollRunDraft(calculationTarget.id, { allowDraftConflicts })
        : await recalculatePayrollRun(calculationTarget.id, { reason: calculationReason.trim(), allowDraftConflicts, refreshInstallmentPolicy,
          // الخطوة 19: إعادة الحساب تقرأ لقطة السياسة؛ التحديث فقط باختيار صريح بعد عرض الفروق
          ...(policyRefresh.refresh && policyRefresh.expectedHash ? { refreshPolicySnapshot: true, expectedPolicySnapshotHash: policyRefresh.expectedHash } : {}) })
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
    if (!runDetail || runDetail.status !== 'CALCULATED' || actionBusy || detailLoading || runBlocked || (!unassignedAckCurrent && !isReversalRun) || approvalBlocked || !can('payroll.approve')) return
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
    if (!runDetail || runDetail.status !== 'APPROVED' || actionBusy || detailLoading || runBlocked || !can('payroll.pay') || !payRecordReady(payRecord)) return
    setActionBusy(true)
    setError('')
    try {
      // الخطوة 22 (B5): الصرف يسجل القناة والمرجع ومن صرف
      await payPayrollRun(runDetail.id, { channel: payRecord.channel as PayrollPayChannel, reference: payRecord.reference.trim() })
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
    if (action === 'reopen' ? runDetail.status !== 'APPROVED' : !['CALCULATED', 'DRAFT'].includes(runDetail.status)) return
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
  // الخطوة 22 (B5): شاشة التعارضات بإجراءات حل — استبعاد الموظف من هذا المسير بسبب، أو فتح المسير الآخر
  const showConflicts = (conflicts: ApiPayrollConflict[], title: string) => (
    <PayrollConflictResolution title={title} conflicts={conflicts} employeeName={employeeName} canExclude={can('payroll.calculate')}
      run={calculationTarget ?? (runDetail ? { id: runDetail.id, status: runDetail.status } : null)} allowDraftConflicts={allowDraftConflicts}
      onOpenRun={id => { setError(''); loadDetail(id) }}
      onResolved={async () => { setError(''); setCalculationConflicts([]); setActionConflicts([]); if (runDetail) await refreshRuns(runDetail.id) }} />
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

  // إجماليات المسير من البنود الفعلية بالقروش الصحيحة (مجموع كل عمود = مجموع الصفوف، ولا تراكم كسور)
  const runTotals = payrollRunTotals(filteredItems)
  const totals = { totalEarnings: runTotals.earnings, totalDeductions: runTotals.deductions, netSalary: runTotals.net }

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
            {/* «استيراد» أُزيل لأنه بلا تنفيذ؛ التصدير ينتج CSV لبنود المسير المعروض بعد البحث (الخطوة 30) */}
            <button
              type="button"
              onClick={() => runDetail && downloadCsv(`payroll-run-${runDetail.id}-${runDetail.period}-${csvDateStamp()}.csv`,
                ['الرقم الوظيفي', 'الموظف', 'الأساسي', 'البدلات', 'الإضافي', 'إضافات أخرى', 'خصم التأخير', 'نقص الساعات', 'الغياب', 'بدون راتب', 'أقساط السلف', 'خصومات أخرى', 'الصافي', 'طريقة الدفع'],
                filteredItems.map((item) => [snapshotOf(item.employeeId)?.employeeCode ?? employeeOf(item.employeeId)?.employeeCode ?? '', employeeName(item.employeeId),
                  item.basicSalary, allowancesOf(item), item.overtimeAmount, item.otherAdditions ?? 0, item.latenessDeduction, item.shortfallDeduction ?? 0,
                  item.absenceDeduction ?? 0, item.unpaidLeaveDeduction, item.loanInstallments, item.otherDeductions ?? 0, item.netPay,
                  payMethodLabels[item.payMethod] ?? item.payMethod]))}
              disabled={!runDetail || filteredItems.length === 0}
              className="btn-secondary flex items-center gap-2 disabled:opacity-50"
            >
              <Download size={18} />
              تصدير CSV
            </button>
            {can('payroll.calculate') && <button
              onClick={() => { setEditingDraft(null); setShowDefinition(true) }}
              disabled={actionBusy}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              <Calculator size={18} />
              مسير جديد
            </button>}
          </div>
        </div>

        {/* Error Banner */}
        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {/* الخطوة 16: تعريف مسير جديد أو تعديل مسودة — مع معاينة العضوية قبل الحفظ */}
        {can('payroll.calculate') && (showDefinition || editingDraft) && (
          <PayrollRunDefinitionPanel key={editingDraft?.id ?? 'new'} branches={branches} departments={departments} teams={teams}
            employees={employees} currency={currency} draft={editingDraft}
            onSaved={async run => { setShowDefinition(false); setEditingDraft(null); setError(''); await refreshRuns(run.id) }}
            onCancel={() => { setShowDefinition(false); setEditingDraft(null) }} />
        )}

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
                {/* الخطوة 16: المسير الجديد يُعرّف من «مسير جديد»؛ لا يُنشأ مسير من زر الحساب */}
                {can('payroll.calculate') && <span className="text-xs text-primary-700">لإنشاء مسير آخر لنفس الفرع أو الشهر بمجموعة سياسة مختلفة استخدم «مسير جديد».</span>}
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
            {can('payroll.calculate') && periodType === 'monthly' && calculationTarget && (
              <div className="space-y-3 border-t border-gray-100 pt-4">
                <p className="text-sm font-bold text-gray-800">
                  {calculationTarget.status === 'DRAFT' ? `احتساب مسودة المسير #${calculationTarget.id}` : `إعادة حساب المسير #${calculationTarget.id}`}
                  {calculationTarget.name ? ` «${calculationTarget.name}»` : ''}
                </p>
                {calculationTarget.status === 'CALCULATED' && <div>
                  <label htmlFor="payroll-calculation-reason" className="block text-sm font-medium text-gray-700 mb-2">
                    سبب إعادة الحساب (مطلوب)
                  </label>
                  <input id="payroll-calculation-reason" value={calculationReason}
                    onChange={e => setCalculationReason(e.target.value)} maxLength={500}
                    disabled={actionBusy} required
                    placeholder="وضّح التعديل المطلوب وسبب إعادة الحساب" className="input w-full" />
                  <p className="text-xs text-gray-500 mt-2">تُعاد العضوية بالتعريف المحفوظ (مكان الموظف آخر يوم في الفترة)، ويُحفظ السبب مع نسخة الحساب الجديدة ويلزم إقرار جديد بتقرير «بلا مسير».</p>
                </div>}
                <label className="flex items-start gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={allowDraftConflicts}
                    onChange={e => setAllowDraftConflicts(e.target.checked)} disabled={actionBusy}
                    className="mt-1 rounded border-gray-300" />
                  حفظ مسودة للمراجعة رغم تعارضها مع مسودات أخرى
                </label>
                {calculationTarget.status === 'CALCULATED' && <label className="flex items-start gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={refreshInstallmentPolicy}
                    onChange={e => setRefreshInstallmentPolicy(e.target.checked)} disabled={actionBusy}
                    className="mt-1 rounded border-gray-300" />
                  تطبيق إعدادات الأقساط الحالية عند إعادة الحساب بدل الاختيارات المحفوظة مع المسير
                </label>}
                <button onClick={handleCalculate} disabled={calculateDisabled} className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50">
                  <Calculator size={16} />
                  {calculationTarget.status === 'DRAFT' ? 'احتساب المسودة' : 'إعادة حساب المسير'}
                </button>
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
                <p className="text-3xl font-bold mt-1">{formatMoney(totals.totalEarnings)}</p>
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
                <p className="text-3xl font-bold mt-1">{formatMoney(totals.totalDeductions)}</p>
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
                <p className="text-3xl font-bold mt-1">{formatMoney(totals.netSalary)}</p>
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
                {/* الخطوة 22 (B5): من احتسب ومن اعتمد ومن صرف، وترتيب التحصيل المطبق على المسير */}
                {screen?.actors && <p className="text-xs text-gray-600 mt-1">
                  {screen.actors.calculated ? `احتسبه: ${screen.actors.calculated.name ?? `مستخدم #${screen.actors.calculated.id}`}` : 'لم يُحتسب بعد'}
                  {screen.actors.approved && ` • اعتمده: ${screen.actors.approved.name ?? `مستخدم #${screen.actors.approved.id}`}`}
                  {screen.actors.paid && ` • صرفه: ${screen.actors.paid.name ?? `مستخدم #${screen.actors.paid.id}`}`}
                </p>}
                {collectionOrderText(screen?.collection) && <p className="text-xs text-primary-700 mt-1">{collectionOrderText(screen?.collection)}</p>}
              </div>
              {runDetail.status === 'CALCULATED' && can('payroll.approve') && (
                <button
                  onClick={handleApprove}
                  disabled={actionBusy || detailLoading || runBlocked || (!unassignedAckCurrent && !isReversalRun) || approvalBlocked}
                  title={approvalBlocked ? screen?.approvalGuard?.blocked?.message ?? 'صافي سالب يمنع الاعتماد' : unassignedAckCurrent || isReversalRun ? undefined : 'أقر أولًا بتقرير «موظفون بلا مسير» أدناه'}
                  className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  <CheckCircle size={16} />
                  اعتماد المسير
                </button>
              )}
              {runDetail.status === 'DRAFT' && <span className="badge bg-gray-100 text-gray-700">مسودة تعريف — لم تُحتسب بعد</span>}
              {runDetail.status === 'APPROVED' && can('payroll.pay') && (
                <PayrollPayRecordForm draft={payRecord} onChange={setPayRecord} disabled={actionBusy || detailLoading || runBlocked || negativeNetCount > 0} onPay={handlePay} />
              )}
              {runDetail.status === 'PAID' && (
                <div className="flex flex-col items-end gap-1">
                  <span className="badge badge-success">المسير مصروف ومقفل ✓</span>
                  <PayrollPayRecordSummary run={screen ?? {}} />
                </div>
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
            {!!runDetail.periodContinuity?.length && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 my-4 space-y-2" role="status">
              <h4 className="font-bold text-amber-900">فترة المسير لا تتجاور مع الشهر السابق أو التالي لنفس الموظفين</h4>
              <p className="text-sm text-amber-800">بداية كل فترة يجب أن تكون اليوم التالي لنهاية السابقة. الفجوة أيام بلا مسير، والتداخل يوم يُحسب مرتين ويمنع الاعتماد. غالبًا سببه تغيير يوم بداية الدورة بعد حساب مسير سابق.</p>
              <ul className="text-sm space-y-1">{runDetail.periodContinuity.map((issue, index) => <li key={index} className="border-t border-amber-100 pt-1">
                {issue.kind === 'GAP' ? 'فجوة' : 'تداخل'} {issue.days} يوم ({issue.from} → {issue.to}) بين {issue.previousPeriod} و{issue.nextPeriod} مع {issue.otherRunId ? `المسير #${issue.otherRunId}` : issue.otherRunName ?? 'مسير آخر'}{issue.otherRunName && issue.otherRunId ? ` «${issue.otherRunName}»` : ''} — {issue.employeeIds.length} موظف
              </li>)}</ul>
            </div>}
            {runBlocked && !runConflicts.length && <p role="alert" className="p-3 mb-3 bg-red-50 text-red-700 rounded-xl text-sm">يوجد تعارض حاجب يمنع اعتماد المسير أو صرفه. راجع المسير قبل المتابعة.</p>}
            {(runBlocked || runConflicts.length > 0) && <button
              onClick={() => { setError(''); loadDetail(runDetail.id) }} disabled={actionBusy || detailLoading}
              className="btn-secondary text-sm mt-2 mb-3 disabled:opacity-50">تحديث حالة التعارضات</button>}
            {runDetail.status === 'CALCULATED' && !unassignedAckCurrent && !isReversalRun && can('payroll.approve') && <p className="p-3 mb-3 bg-amber-50 text-amber-900 rounded-xl text-sm">
              الاعتماد متوقف حتى الإقرار بتقرير «موظفون بلا مسير» لنسخة الحساب الحالية (أسفل الصفحة).</p>}
            {runDetail.status === 'CALCULATED' && screen?.approvalGuard?.blocked && can('payroll.approve') && <p role="alert" className="p-3 mb-3 bg-amber-50 text-amber-900 rounded-xl text-sm">
              {screen.approvalGuard.blocked.message}</p>}
            {negativeNetCount > 0 && ['CALCULATED', 'APPROVED'].includes(runDetail.status) && <p role="alert" className="p-3 mb-3 bg-red-50 text-red-700 rounded-xl text-sm">
              صافي {negativeNetCount} موظف سالب (مظلل في الجدول)؛ الاعتماد والصرف ممنوعان حتى معالجة الإجازة بلا أجر أو الاستحقاق ثم إعادة الحساب.</p>}
            {((runDetail.status === 'APPROVED' && can('payroll.reopen')) ||
              ((runDetail.status === 'CALCULATED' || runDetail.status === 'DRAFT') && can('payroll.cancel'))) && (
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
            {/* الخطوة 22 (B5): سجل المسير الفعلي بمن فعل ماذا ومتى (بدل سطر مبني من التواريخ) */}
            <PayrollRunEventsPanel runId={runDetail.id} refreshKey={String(detailStamp)} />
          </div>
        )}

        {/* C8 / الخطوة 31: المسير المصروف يُصحح بمسير عكس ومسير تكميلي مربوطين دون تعديل صفوفه؛ ومسير العكس أو التكميلي يعرض ربطه وسطوره وتسوياته */}
        {runDetail && can('payroll.view') && (runDetail.status === 'PAID' || (runDetail.runType != null && runDetail.runType !== 'REGULAR')) && (
          <PayrollRunCorrectionsPanel run={runDetail} employeeName={employeeName} onOpenRun={id => refreshRuns(id)} />
        )}

        {/* الخطوة 16/17: مسودة المسير — تعريفها ومعاينة عضويتها قبل «احتساب المسودة» */}
        {runDetail?.status === 'DRAFT' && (() => {
          const draft = runDetail as PayrollRunWithSelection
          return (
            <div className="card space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-gray-800">تعريف مسودة المسير #{draft.id}{draft.name ? ` «${draft.name}»` : ''}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {draft.selection ? SELECTION_MODE_LABELS[draft.selection.mode] : ''}
                    {draft.policyVersion && ` • السياسة «${draft.policyVersion.name}» نسخة ${draft.policyVersion.versionNo}`}
                    {draft.selection && ` • استبعادات: ${draft.selection.exclusions.length}`}
                    {draft.selection?.emptyScope && ` • نطاق فارغ مؤكد: ${draft.selection.emptyScope.reason}`}
                  </p>
                </div>
                {can('payroll.calculate') && <button onClick={() => { setShowDefinition(false); setEditingDraft(draft) }} disabled={actionBusy} className="btn-secondary text-sm">تعديل التعريف</button>}
              </div>
              {draftPreviewError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{draftPreviewError}</p>}
              {draftPreview ? <PayrollDraftMembership draft={draft} preview={draftPreview} currency={currency} canEdit={can('payroll.calculate')}
                  onUpdated={() => refreshRuns(draft.id)} />
                : !draftPreviewError && can('payroll.calculate') && <p className="text-sm text-gray-400">جارٍ تحميل معاينة العضوية…</p>}
            </div>
          )
        })()}

        {/* الخطوة 19: لقطة السياسة على المسير وفروقها عن الإعدادات الحالية (التحديث اختيار صريح عند إعادة الحساب) */}
        {runDetail && !isReversalRun && ['DRAFT', 'CALCULATED', 'APPROVED', 'PAID'].includes(runDetail.status) && can('payroll.view') && (
          <PayrollPolicySnapshotPanel runId={runDetail.id} runStatus={runDetail.status} snapshotVersion={runDetail.snapshotVersion ?? 0} onRefreshChoice={handlePolicyRefreshChoice} />
        )}

        {/* الخطوة 20 / D13: وضع محرك الحساب وتقرير التكافؤ لكل موظف */}
        {runDetail && !isReversalRun && runDetail.status !== 'CANCELLED' && (
          <PayrollRunEnginePanel run={runDetail} employeeName={employeeName} onChanged={() => refreshRuns(runDetail.id)} />
        )}

        {/* الخطوة 26: الإعفاء المالي في المسير (منفصل عن استثناء الحضور) — منح بمعاينة واعتماد وإلغاء، ثم إعادة الحساب */}
        {runDetail && !isReversalRun && ['CALCULATED', 'APPROVED', 'PAID'].includes(runDetail.status) &&
          (can('financial_exemption.view') || can('financial_exemption.grant') || can('financial_exemption.approve')) && (
          <PayrollFinancialExemptionsPanel runId={runDetail.id} runStatus={runDetail.status} snapshotVersion={runDetail.snapshotVersion ?? 0} onChanged={() => refreshRuns(runDetail.id)} />
        )}

        {/* الخطوة 18: «موظفون بلا مسير» وإقراره قبل الاعتماد */}
        {runDetail && !isReversalRun && ['CALCULATED', 'APPROVED', 'PAID'].includes(runDetail.status) && (
          <PayrollUnassignedPanel runId={runDetail.id} snapshotVersion={runDetail.snapshotVersion ?? 0} runStatus={runDetail.status}
            branches={branches} departments={departments} teams={teams} onAckChange={handleAckChange} />
        )}

        {excludedMembers.length > 0 && (
          <div className="card border border-amber-200">
            <h3 className="font-bold text-gray-800 mb-3">المستبعدون من هذه النسخة ({excludedMembers.length})</h3>
            <div className="space-y-2 text-sm">
              {excludedMembers.map(member => <div key={member.employeeId} className="flex flex-wrap items-center justify-between gap-2 bg-amber-50 rounded-lg p-3">
                <span className="font-medium">{employeeName(member.employeeId)} {member.snapshot?.employeeCode && `(${member.snapshot.employeeCode})`}</span>
                <span className="text-amber-900">
                  {exclusionLabels[member.exclusionReason ?? ''] || member.exclusionReason || 'سبب الاستبعاد غير موثق في المسير السابق'}
                  {member.snapshot?.manualReason && ` — ${member.snapshot.manualReason}`}
                  {member.snapshot?.alreadyInRun && ` — ${member.snapshot.alreadyInRun.otherRunId ? `المسير #${member.snapshot.alreadyInRun.otherRunId}` : member.snapshot.alreadyInRun.name ?? 'مسير آخر'} (${statusLabels[member.snapshot.alreadyInRun.status as ApiPayrollRun['status']] ?? member.snapshot.alreadyInRun.status})`}
                  {member.snapshot?.transferredOut && ` — آخر يوم في النطاق ${member.snapshot.transferredOut.lastInScopeDate}${member.snapshot.transferredOut.branchName ? `، مكانه آخر يوم: ${member.snapshot.transferredOut.branchName}` : ''}`}
                </span>
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
                  {formatMoney(runDetail.totalNet)} {currency} إجمالي
                </p>
              </div>
              {Object.entries(payMethods).map(([method, data]) => (
                <div key={method} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-500">{payMethodLabels[method] ?? method}</p>
                  <p className="text-lg font-bold text-gray-800">
                    {formatMoney(data.total)} {currency}
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
                  // الخطوة 22 (B5): الإجمالي والخصومات بالقروش من الأعمدة نفسها، والتغطية والمعامل من تفصيل البند المحفوظ
                  const gross = payrollItemEarnings(item)
                  const totalDeductions = payrollItemDeductions(item)
                  const coverage = payrollCoverageText(payrollItemCoverage(item))
                  const negativeNet = n(item.netPay) < 0

                  return (
                  <tr key={item.id} className={`table-row ${negativeNet ? 'bg-red-50' : ''}`}>
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
                          {snapshot?.salarySource && <p className={`text-xs ${snapshot.salarySource.kind === 'MONTHLY_HISTORY' ? 'text-gray-500' : 'text-amber-700'}`}
                            title={snapshot.salarySource.warning ?? undefined}>
                            {snapshot.salarySource.kind === 'MONTHLY_HISTORY'
                              ? `راتب شهر ${snapshot.salarySource.referencePeriod} من السجل (يسري من ${snapshot.salarySource.effectivePayrollPeriod})`
                              : `راتب الملف الحالي — غير موثق لشهر ${snapshot.salarySource.referencePeriod}`}
                          </p>}
                          {coverage && <p className="text-xs text-gray-500">التغطية: {coverage}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="table-cell text-center font-mono">{formatMoney(item.basicSalary)}</td>
                    <td className="table-cell text-center font-mono">
                      {formatMoneyOrDash(allowancesOf(item))}
                    </td>
                    <td className="table-cell text-center font-mono">
                      <div className="flex flex-col items-center">
                        <span className={n(item.overtimeAmount) > 0 ? 'text-success-600 font-bold' : ''}>
                          {formatMoney(item.overtimeAmount)}
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
                        {formatMoneyOrDash(item.otherAdditions)}
                      </span>
                    </td>
                    <td className="table-cell text-center font-mono font-bold text-success-600 bg-success-50">
                      {formatMoney(gross)}
                    </td>
                    <td className="table-cell text-center font-mono">
                      <div className="flex flex-col items-center">
                        <span className={n(item.latenessDeduction) > 0 ? 'text-danger-600' : ''}>
                          {formatMoneyOrDash(item.latenessDeduction)}
                        </span>
                        {n(item.lateMinutes) > 0 && (
                          <span className="text-xs text-danger-600">{n(item.lateMinutes)} دقيقة</span>
                        )}
                        <PayrollShadowAttendanceBreakdown item={item} currency={currency} compact />
                      </div>
                    </td>
                    <td className="table-cell text-center font-mono">
                      <span className={n(item.shortfallDeduction) > 0 ? 'text-danger-600' : ''}>{formatMoney(item.shortfallDeduction)}</span>
                      {n(item.shortfallMinutes) > 0 && <p className="text-xs text-gray-500">{n(item.shortfallMinutes)} دقيقة نقص مرصود</p>}
                    </td>
                    <td className="table-cell text-center font-mono">
                      <div className="flex flex-col items-center">
                        <span className={n(item.absenceDeduction) > 0 ? 'text-danger-600' : ''}>
                          {formatMoneyOrDash(item.absenceDeduction)}
                        </span>
                        {n(item.absenceDays) > 0 && (
                          <span className="text-xs text-danger-600">{n(item.absenceDays)} يوم</span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell text-center font-mono">
                      <div className="flex flex-col items-center">
                        <span className={n(item.unpaidLeaveDeduction) > 0 ? 'text-danger-600' : ''}>
                          {formatMoneyOrDash(item.unpaidLeaveDeduction)}
                        </span>
                        {n(item.unpaidLeaveDays) > 0 && (
                          <span className="text-xs text-danger-600">{n(item.unpaidLeaveDays)} يوم</span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell text-center font-mono">
                      {n(item.loanInstallments) > 0 ? (
                        <span className="text-danger-600">{formatMoney(item.loanInstallments)}</span>
                      ) : '-'}
                    </td>
                    <td className="table-cell text-center font-mono">
                      {n(item.otherDeductions) > 0 ? (
                        <span className="text-danger-600">{formatMoney(item.otherDeductions)}</span>
                      ) : '-'}
                      {/* C2: تتبع قيود الدفتر سطرًا سطرًا (النوع والسبب والطلب وسعر اليوم) */}
                      <PayrollObligationBreakdown item={item} currency={currency} compact />
                    </td>
                    <td className="table-cell text-center font-mono font-bold text-danger-600 bg-danger-50">
                      {formatMoney(totalDeductions)}
                    </td>
                    <td className={`table-cell text-center font-mono font-bold bg-primary-50 text-lg ${negativeNet ? 'text-red-700' : 'text-primary-600'}`}>
                      {formatMoney(item.netPay)}
                      {negativeNet && <p className="text-xs font-sans">صافي سالب — يمنع الاعتماد</p>}
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
                        {/* الطباعة من صفحة القسيمة (زر كان بلا تنفيذ) */}
                        <Link
                          href={`/payroll/payslip/${item.id}`}
                          title="طباعة القسيمة"
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Printer size={18} className="text-gray-500" />
                        </Link>
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
                    {formatMoney(runTotals.column('basicSalary'))}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold">
                    {formatMoney(runTotals.column('allowances'))}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold">
                    {formatMoney(runTotals.column('overtimeAmount'))}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-success-600">
                    {formatMoney(runTotals.column('otherAdditions'))}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-success-600 bg-success-100">
                    {formatMoney(totals.totalEarnings)}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-danger-600">
                    {formatMoney(runTotals.column('latenessDeduction'))}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-danger-600">
                    {formatMoney(runTotals.column('shortfallDeduction'))}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-danger-600">
                    {formatMoney(runTotals.column('absenceDeduction'))}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-danger-600">
                    {formatMoney(runTotals.column('unpaidLeaveDeduction'))}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-danger-600">
                    {formatMoney(runTotals.column('loanInstallments'))}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-danger-600">
                    {formatMoney(runTotals.column('otherDeductions'))}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-danger-600 bg-danger-100">
                    {formatMoney(totals.totalDeductions)}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-primary-600 bg-primary-100 text-lg">
                    {formatMoney(totals.netSalary)}
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
              {/* «ملف WPS» و«ملف GOSI» أُخفيا: لا مولّد لملفات البنك أو التأمينات بعد؛ الملخص يفتح التقارير المالية الفعلية (الخطوة 30) */}
              <Link href="/payroll/reports" className="btn-secondary flex items-center gap-2">
                <FileText size={18} />
                تقرير ملخص
              </Link>
            </div>
            <div className="flex items-center gap-4">
              {can('payroll.approve') && <button
                onClick={handleApprove}
                disabled={actionBusy || detailLoading || runDetail?.status !== 'CALCULATED' || runBlocked || !unassignedAckCurrent || approvalBlocked}
                className="btn-success flex items-center gap-2 disabled:opacity-50"
              >
                <Lock size={18} />
                اعتماد الرواتب
              </button>}
              {can('payroll.pay') && <button
                onClick={handlePay}
                disabled={actionBusy || detailLoading || runDetail?.status !== 'APPROVED' || runBlocked || negativeNetCount > 0 || !payRecordReady(payRecord)}
                title={payRecordReady(payRecord) ? undefined : 'اختر قناة الصرف واكتب مرجعه في دورة الاعتماد أعلاه'}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                <Send size={18} />
                صرف بالقناة والمرجع
              </button>}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
