'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Inbox,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  Calendar,
  Wallet,
  Package,
  FileText,
  UserMinus,
  AlertTriangle,
  ChevronLeft,
  X,
  Users,
  GraduationCap,
} from 'lucide-react'
import { categoryLabels } from '@/data/requestsCatalog'
import MyClearanceItems from '@/components/dashboard/MyClearanceItems'
import MyApprovalDecisions from '@/components/MyApprovalDecisions'
// كل مفاتيح الحمولة بتسمياتها — مشترك مع ويدجت لوحة التحكم (SEC-REQ-2)
import RequestPayload from '@/components/RequestPayload'
import OvertimeRequestSummary, { overtimeApprovalLimit } from '@/components/OvertimeRequestSummary'
import { payloadSummary } from '@/lib/request-payload'
import { useCurrency } from '@/lib/currency'
import { approveLoanRequest, fetchLoanCapReview, formatLoanMoney, LOAN_APPROVAL_DECISION_LABELS, LOAN_EXCEPTIONAL_CATEGORY_LABELS, type LoanCapReview } from '@/lib/loans-api'
import { LoanCapSummary } from '@/components/payroll/LoanCapSummary'
import Link from 'next/link'
import { fetchDeductions } from '@/lib/deductions-api'
import { fetchBonuses } from '@/lib/bonuses-api'
import {
  fetchInbox,
  fetchRequest,
  fetchRequestTypes,
  fetchBranches,
  actOnRequest,
  can,
  fetchCustodyPendingMyConfirm,
  managerConfirmCustody,
  type ApiRequest,
  type ApiRequestType,
  type ApiCustody,
  type ApiBranch,
} from '@/lib/api'

// ===== أدوات فك حقول JSON القادمة من الباك =====
interface ResolvedStep {
  stepOrder: number
  role: string
  approverEmployeeId?: number | null
  slaDays?: number | null
  escalateTo?: string | null
  dueAt?: string | null
  actedAt?: string | null
  action?: string | null
}

const parseJson = <T,>(raw: string | null | undefined, fallback: T): T => {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const roleLabels: Record<string, string> = {
  direct_manager_of_requester: 'المدير المباشر',
  department_manager_of_requester: 'مدير القسم',
  branch_manager_of_requester: 'مدير الفرع',
  receiving_team_manager: 'المدير المستقبِل',
  hr: 'الموارد البشرية',
  finance: 'المالية',
  executive: 'الإدارة التنفيذية',
  custody_officer: 'أمين العهدة',
  it: 'تقنية المعلومات',
  specific_employee: 'موظف محدد',
  payroll_officer: 'موظف الرواتب',
}

// اسم جهة الاعتماد — كود غير معروف لا يظهر خاماً أبداً
const roleLabelOf = (role: string): string => roleLabels[role] ?? 'جهة اعتماد'

// إعداد العرض لكل فئة من فئات الكتالوج التسع
const typeConfig: Record<
  string,
  { label: string; icon: typeof Calendar; color: string }
> = {
  leaves: { label: categoryLabels.leaves, icon: Calendar, color: 'bg-blue-100 text-blue-600' },
  time_attendance: { label: categoryLabels.time_attendance, icon: Clock, color: 'bg-orange-100 text-orange-600' },
  financial: { label: categoryLabels.financial, icon: Wallet, color: 'bg-purple-100 text-purple-600' },
  employment_status: { label: categoryLabels.employment_status, icon: UserMinus, color: 'bg-red-100 text-red-600' },
  personal_data: { label: categoryLabels.personal_data, icon: FileText, color: 'bg-gray-100 text-gray-600' },
  letters: { label: categoryLabels.letters, icon: FileText, color: 'bg-cyan-100 text-cyan-600' },
  custody_assets: { label: categoryLabels.custody_assets, icon: Package, color: 'bg-teal-100 text-teal-600' },
  training: { label: categoryLabels.training, icon: GraduationCap, color: 'bg-indigo-100 text-indigo-600' },
  employee_relations: { label: categoryLabels.employee_relations, icon: Users, color: 'bg-pink-100 text-pink-600' },
}
const fallbackConfig = { label: 'طلب', icon: FileText, color: 'bg-gray-100 text-gray-600' }

interface InboxItem {
  id: number
  displayId: string
  category: string
  title: string
  requester: string
  branchName: string
  submittedAt: string
  details: string
  myStepLevel: number
  totalSteps: number
  stepRoleLabel: string // صفة المعتمد في الخطوة الحالية — بالعربية دائماً
  slaDaysLeft: number | null // المتبقي قبل انتهاء مهلة الرد — من dueAt للخطوة الحالية
}

export default function ApprovalsInboxPage() {
  const [items, setItems] = useState<InboxItem[]>([])
  const [decisionsRevision, setDecisionsRevision] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState('')
  const [actionModal, setActionModal] = useState<{
    item: InboxItem
    action: 'approve' | 'reject' | 'return'
  } | null>(null)
  const [comment, setComment] = useState('')
  const [detail, setDetail] = useState<ApiRequest | null>(null)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [detailError, setDetailError] = useState('')
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailRevision, setDetailRevision] = useState(0)
  const [approvedMinutesInput, setApprovedMinutesInput] = useState('')
  const [canAdjustOvertime, setCanAdjustOvertime] = useState(false)
  // AD-07 (C6): مراجعة سقف السلفة عند كل خطوة — تنبيه تغيّر السياسة، والتخفيض أو الاستثناء الموثق
  const currency = useCurrency()
  const [loanReview, setLoanReview] = useState<LoanCapReview | null>(null)
  const [loanReviewError, setLoanReviewError] = useState('')
  const [loanApprovedAmount, setLoanApprovedAmount] = useState('')
  const [loanOverrideReason, setLoanOverrideReason] = useState('')
  useEffect(() => {
    setCanAdjustOvertime(can('overtime.adjust'))
    const requestId = Number(new URLSearchParams(window.location.search).get('request'))
    if (Number.isSafeInteger(requestId) && requestId > 0) setDetailId(requestId)
  }, [])
  useEffect(() => {
    if (detailId == null) return
    let cancelled = false
    setDetail(null)
    setDetailError('')
    setDetailLoading(true)
    fetchRequest(detailId).then((request) => { if (!cancelled) setDetail(request) })
      .catch((err) => { if (!cancelled) setDetailError(err instanceof Error ? err.message : 'تعذر تحميل تفاصيل الطلب') })
      .finally(() => { if (!cancelled) setDetailLoading(false) })
    return () => { cancelled = true }
  }, [detailId, detailRevision])
  const openAction = (item: InboxItem, action: 'approve' | 'reject' | 'return') => {
    setComment('')
    setActionError(null)
    setApprovedMinutesInput('')
    setDetail(null)
    setDetailLoading(true)
    setDetailId(item.id)
    setDetailRevision(value => value + 1)
    setActionModal({ item, action })
  }
  const [acting, setActing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  // عهد أكّد الموظف استلامها وتنتظر اعتمادي كمدير مباشر
  const [custodyPending, setCustodyPending] = useState<ApiCustody[]>([])
  const [custodyError, setCustodyError] = useState('')
  const [custodyConfirming, setCustodyConfirming] = useState<number | null>(null)
  // خصومات ومكافآت بانتظار موافقتي — للعرض والانتقال فقط؛ الاعتماد من شاشاتها. العدد الذي يرفضه الخادم يُخفى وحده
  const [payrollPending, setPayrollPending] = useState<{ deductions: number; bonuses: number; admin: boolean } | null>(null)
  useEffect(() => {
    let cancelled = false
    Promise.allSettled([fetchDeductions({ view: 'pending_me' }), fetchBonuses({ view: 'pending_me' })])
      .then(([deductions, bonuses]) => {
        if (cancelled) return
        setPayrollPending({ deductions: deductions.status === 'fulfilled' ? deductions.value.length : 0,
          bonuses: bonuses.status === 'fulfilled' ? bonuses.value.length : 0, admin: can('payroll.view') })
      })
    return () => { cancelled = true }
  }, [])

  const loadCustodyPending = () =>
    fetchCustodyPendingMyConfirm()
      .then((rows) => { setCustodyPending(rows); setCustodyError('') })
      .catch((err) => setCustodyError(err instanceof Error ? err.message : 'تعذر تحميل العهد التي تنتظر تأكيدك'))

  const confirmCustody = async (id: number) => {
    setCustodyConfirming(id)
    try {
      await managerConfirmCustody(id)
      await loadCustodyPending()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر اعتماد العهدة')
    } finally {
      setCustodyConfirming(null)
    }
  }

  const load = async () => {
    try {
      setError(null)
      // اسم المقدّم يأتي مع الصندوق من السيرفر — لا GET /employees (403 للمعتمد بدور موظف).
      // الأنواع والفروع للعرض فقط: فشلها يعرض اسماً احتياطياً ولا يُسقط الصندوق (REQ-17)
      const [inbox, typeList, branches] = await Promise.all([
        fetchInbox(),
        fetchRequestTypes().catch((): ApiRequestType[] => []),
        fetchBranches().catch((): ApiBranch[] => []),
      ])
      const typesByCode = new Map<string, ApiRequestType>(typeList.map((t) => [t.code, t]))
      const branchesById = new Map(branches.map((b) => [b.id, b]))

      setItems(
        inbox.map((r: ApiRequest): InboxItem => {
          const type = typesByCode.get(r.typeCode)
          const steps = parseJson<ResolvedStep[]>(r.resolvedSteps, [])
          const current =
            steps.find((s) => s.stepOrder === r.currentStep) ??
            steps.find((s) => !s.actedAt)
          const slaDaysLeft = current?.dueAt
            ? Math.ceil(
                (new Date(current.dueAt).getTime() - Date.now()) / 86_400_000
              )
            : null
          return {
            id: r.id,
            displayId: `REQ-${r.id}`,
            category: type?.category ?? '',
            title: type?.nameAr ?? 'طلب',
            requester: r.requesterName ?? `موظف #${r.requesterId}`,
            branchName: r.branchId ? branchesById.get(r.branchId)?.name ?? '' : '',
            submittedAt: (r.submittedAt ?? r.createdAt).slice(0, 10),
            details: payloadSummary(r.payload) || (type?.nameAr ?? 'طلب'),
            myStepLevel: r.currentStep ?? current?.stepOrder ?? 1,
            totalSteps: steps.length || 1,
            stepRoleLabel: roleLabelOf(current?.role ?? ''),
            slaDaysLeft,
          }
        })
      )
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'تعذّر الاتصال بالخادم — تأكد أن الـ API يعمل'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    loadCustodyPending()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = items.filter((i) => !filterType || i.category === filterType)
  const overdue = items.filter((i) => i.slaDaysLeft !== null && i.slaDaysLeft <= 0).length

  const actionLabels = {
    approve: 'اعتماد',
    reject: 'رفض',
    return: 'إعادة للمقدّم',
  }
  const apiActions = {
    approve: 'APPROVE',
    reject: 'REJECT',
    return: 'RETURN',
  } as const

  const isLoanApproval = actionModal?.action === 'approve' && detail?.id === actionModal?.item.id && detail?.typeCode === 'LOAN'
  useEffect(() => {
    setLoanReview(null); setLoanReviewError(''); setLoanApprovedAmount(''); setLoanOverrideReason('')
    if (!isLoanApproval || !detail) return
    let cancelled = false
    fetchLoanCapReview(detail.id).then(review => { if (!cancelled) setLoanReview(review) })
      .catch(err => { if (!cancelled) setLoanReviewError(err instanceof Error ? err.message : 'تعذر تحميل مراجعة سقف السلفة') })
    return () => { cancelled = true }
  }, [isLoanApproval, detail?.id])
  const isOvertimeDetail = !!detail && (['OVERTIME', 'OVERTIME_AUTO'].includes(detail.typeCode) || !!detail.overtime || detail.overtimeReviewRequired === true)
  const overtimeLimit = overtimeApprovalLimit(detail?.overtime)
  const isOvertimeApproval = actionModal?.action === 'approve' && isOvertimeDetail
  const enteredMinutes = approvedMinutesInput.trim() ? Number(approvedMinutesInput) : overtimeLimit
  const invalidMinutes = isOvertimeApproval && (overtimeLimit == null || enteredMinutes == null ||
    !Number.isSafeInteger(enteredMinutes) || enteredMinutes <= 0 || enteredMinutes > overtimeLimit)
  const reducingMinutes = isOvertimeApproval && enteredMinutes != null && overtimeLimit != null && enteredMinutes < overtimeLimit
  const overtimeApprovalBlocked = isOvertimeApproval && (detail?.overtimeReviewRequired === true ||
    !detail?.overtime?.calculationSnapshot?.submission?.evidence || !!detail.overtime.calculationSnapshot.submission.evidence.blockers?.length ||
    invalidMinutes || (reducingMinutes && (!canAdjustOvertime || !comment.trim())))

  const confirmAction = async () => {
    if (!actionModal || acting || detailLoading || detail?.id !== actionModal.item.id) return
    if (actionModal.action !== 'approve' && !comment.trim()) { setActionError('اكتب السبب قبل تنفيذ القرار'); return }
    if (overtimeApprovalBlocked) { setActionError(invalidMinutes ? 'الدقائق يجب أن تكون عددًا صحيحًا موجبًا ضمن الحد المعروض' : reducingMinutes ? 'تخفيض الدقائق يحتاج صلاحية التعديل وسببًا مكتوبًا' : 'أدلة الإضافي تحتاج مراجعة؛ أعد الطلب للمقدّم قبل الموافقة'); return }
    setActing(true)
    setActionError(null)
    try {
      if (isLoanApproval && (loanApprovedAmount.trim() || loanOverrideReason.trim())) {
        await approveLoanRequest(actionModal.item.id, { comment: comment.trim() || undefined, approvedAmount: loanApprovedAmount.trim() || undefined, capOverrideReason: loanOverrideReason.trim() || undefined })
      } else {
        await actOnRequest(
          actionModal.item.id,
          apiActions[actionModal.action],
          comment.trim() || undefined,
          reducingMinutes && enteredMinutes != null ? enteredMinutes : undefined
        )
      }
      setDecisionsRevision(value => value + 1)
      setComment('')
      setActionModal(null)
      setDetailId(null)
      await load()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'تعذّر تنفيذ الإجراء')
    } finally {
      setActing(false)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {custodyError && <div role="alert" className="bg-amber-50 text-amber-800 p-3 rounded-xl">تعذر تحميل عهد المدير: {custodyError} <button onClick={loadCustodyPending} className="underline">إعادة المحاولة</button></div>}
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">صندوق الموافقات</h1>
            <p className="text-gray-500 mt-1">
              كل ما ينتظر قرارك من كل أنواع الطلبات — في مكان واحد
            </p>
          </div>
          <div className="flex items-center gap-3">
            {overdue > 0 && (
              <span className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-xl text-sm font-medium">
                <AlertTriangle size={16} />
                {overdue} متجاوز للمهلة
              </span>
            )}
            <span className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-xl text-sm font-medium">
              <Inbox size={16} />
              {items.length} بانتظارك
            </span>
          </div>
        </div>

        <MyApprovalDecisions onOpen={setDetailId} revision={decisionsRevision} />
        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {payrollPending && (payrollPending.deductions > 0 || payrollPending.bonuses > 0) && (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Wallet size={18} className="text-purple-600" />
              <h3 className="font-bold text-gray-800">خصومات ومكافآت بانتظار موافقتك</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {payrollPending.deductions > 0 && (
                <Link href={payrollPending.admin ? '/payroll/deductions' : '/my/deductions'} className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100">
                  خصومات بانتظار موافقتك
                  <span className="badge text-xs bg-red-100 text-red-700">{payrollPending.deductions}</span>
                  <ChevronLeft size={14} />
                </Link>
              )}
              {payrollPending.bonuses > 0 && (
                <Link href={payrollPending.admin ? '/payroll/bonuses' : '/my/bonuses'} className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100">
                  مكافآت بانتظار موافقتك
                  <span className="badge text-xs bg-success-100 text-success-700">{payrollPending.bonuses}</span>
                  <ChevronLeft size={14} />
                </Link>
              )}
            </div>
          </div>
        )}

        {/* عهد بانتظار اعتمادي كمدير مباشر — تختفي عند الخلو */}
        {custodyPending.length > 0 && (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Package size={18} className="text-teal-600" />
              <h3 className="font-bold text-gray-800">عهد بانتظار اعتمادك</h3>
              <span className="badge text-xs bg-teal-100 text-teal-700">
                {custodyPending.length}
              </span>
            </div>
            <div className="space-y-3">
              {custodyPending.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-4 p-3 bg-gray-50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center shrink-0">
                      <Package size={18} className="text-teal-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">
                        {c.assetName ?? `أصل #${c.assetId}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        الموظف: {c.employeeName ?? `#${c.employeeId}`} — تاريخ التسليم:{' '}
                        <span dir="ltr">{String(c.assignedAt ?? '').slice(0, 10)}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => confirmCustody(c.id)}
                    disabled={custodyConfirming === c.id}
                    className="flex items-center gap-1.5 px-4 py-2 bg-success-500 text-white rounded-xl text-sm font-medium hover:bg-success-600 shrink-0"
                  >
                    <CheckCircle2 size={16} />
                    {custodyConfirming === c.id ? 'جارٍ الاعتماد...' : 'اعتماد'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* بنود إخلاء طرف على جهتي — تختفي عند الخلو */}
        <MyClearanceItems />

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Type Filters */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilterType('')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  !filterType
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                الكل ({items.length})
              </button>
              {Object.keys(typeConfig).map((t) => {
                const count = items.filter((i) => i.category === t).length
                if (!count) return null
                return (
                  <button
                    key={t}
                    onClick={() => setFilterType(filterType === t ? '' : t)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      filterType === t
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {typeConfig[t].label} ({count})
                  </button>
                )
              })}
            </div>

            {/* Items */}
            <div className="space-y-4">
              {filtered.map((item) => {
                const cfg = typeConfig[item.category] ?? fallbackConfig
                const Icon = cfg.icon
                return (
                  <div
                    key={item.id}
                    className={`card p-5 ${
                      item.slaDaysLeft !== null && item.slaDaysLeft <= 0 ? 'border-2 border-red-200' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${cfg.color}`}
                        >
                          <Icon size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-gray-800">{item.title}</h3>
                            <span className={`badge text-xs ${cfg.color}`}>{cfg.label}</span>
                            {item.branchName && (
                              <span className="badge text-xs bg-indigo-100 text-indigo-700">
                                {item.branchName}
                              </span>
                            )}
                            {item.slaDaysLeft !== null && item.slaDaysLeft <= 0 ? (
                              <span className="badge text-xs bg-red-100 text-red-700">
                                متجاوز للمهلة!
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">
                                {item.slaDaysLeft === null ? 'بلا مهلة محددة' : `متبقي ${item.slaDaysLeft} يوم للرد`}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1.5">{item.details}</p>
                          <button type="button" onClick={() => setDetailId(item.id)} className="text-primary-600 text-sm underline mt-2">عرض التفاصيل والمرفقات</button>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                            <span>
                              مقدّم من: <span className="text-gray-600 font-medium">{item.requester}</span>
                            </span>
                            <span dir="ltr">{item.displayId}</span>
                            <span dir="ltr">{item.submittedAt}</span>
                            <span className="flex items-center gap-1">
                              خطوتك: {item.myStepLevel} من {item.totalSteps}
                              <ChevronLeft size={12} />
                            </span>
                            <span>بصفتك: {item.stepRoleLabel}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => openAction(item, 'approve')}
                          className="flex items-center gap-1.5 px-4 py-2 bg-success-500 text-white rounded-xl text-sm font-medium hover:bg-success-600"
                        >
                          <CheckCircle2 size={16} />
                          اعتماد
                        </button>
                        <button
                          onClick={() => openAction(item, 'reject')}
                          className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100"
                        >
                          <XCircle size={16} />
                          رفض
                        </button>
                        <button
                          onClick={() => openAction(item, 'return')}
                          className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200"
                        >
                          <RotateCcw size={16} />
                          إعادة
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}

              {filtered.length === 0 && (
                <div className="card p-12 text-center">
                  <CheckCircle2 size={48} className="mx-auto text-success-300 mb-4" />
                  <h3 className="text-lg font-bold text-gray-800 mb-1">
                    لا يوجد ما ينتظر قرارك 🎉
                  </h3>
                  <p className="text-gray-500">كل الطلبات تمت معالجتها</p>
                </div>
              )}
            </div>
          </>
        )}



        {detailId !== null && !actionModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="تفاصيل الطلب">
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
              <div className="flex justify-between items-center"><h2 className="font-bold text-lg">تفاصيل الطلب #{detailId}</h2><button type="button" aria-label="إغلاق التفاصيل" onClick={() => setDetailId(null)}><X size={20} /></button></div>
              {detailLoading && <p>جارٍ تحميل تفاصيل الطلب...</p>}
              {detailError && <p role="alert" className="text-red-700">{detailError}</p>}
              {detail && <><RequestPayload payload={detail.payload} /><OvertimeRequestSummary overtime={detail.overtime ?? undefined} reviewRequired={detail.overtimeReviewRequired} /></>}
            </div>
          </div>
        )}

        {/* مراجعة القرار وأدلة الطلب */}
        {actionModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-800">
                  {actionLabels[actionModal.action]}: {actionModal.item.title}
                </h2>
                <button
                  disabled={acting}
                  onClick={() => {
                    setActionModal(null)
                    setDetailId(null)
                    setActionError(null)
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {actionError && (
                  <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm">
                    {actionError}
                  </div>
                )}
                <p className="text-sm text-gray-600">
                  مقدّم من {actionModal.item.requester}
                  {actionModal.item.branchName ? ` — ${actionModal.item.branchName}` : ''}
                </p>
                {detailLoading && <p>جارٍ تحميل تفاصيل الطلب...</p>}
                {detailError && <p role="alert" className="text-red-700">{detailError}</p>}
                {detail?.id === actionModal.item.id && <>
                  <RequestPayload payload={detail.payload} />
                  <OvertimeRequestSummary overtime={detail.overtime ?? undefined} reviewRequired={detail.overtimeReviewRequired} />
                </>}
                {isLoanApproval && (
                  <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                    <p className="font-medium text-gray-700">مراجعة سقف السلفة</p>
                    {loanReviewError && <p role="alert" className="text-sm text-red-600">{loanReviewError}</p>}
                    {loanReview && <>
                      <p className="text-sm text-gray-600">المطلوب {formatLoanMoney(loanReview.requestedAmount)} — المعروض للاعتماد {formatLoanMoney(loanReview.currentAmount)} {currency} على {loanReview.months} شهر{loanReview.firstInstallmentPeriod ? ` — أول قسط ${loanReview.firstInstallmentPeriod}` : ''}</p>
                      {loanReview.exceptional && <p className="text-sm bg-amber-50 text-amber-800 rounded-lg p-2">سلفة استثنائية ({LOAN_EXCEPTIONAL_CATEGORY_LABELS[loanReview.exceptionalCategory ?? ''] ?? loanReview.exceptionalCategory}): {loanReview.exceptionalReason}</p>}
                      {loanReview.policyChanged && <p role="alert" className="text-sm bg-red-50 text-red-700 rounded-lg p-2">تنبيه: تغيّرت سياسة السقف أو قيمته منذ التقديم (السقف عند التقديم {formatLoanMoney(loanReview.submitted?.effectiveCap)}).</p>}
                      <LoanCapSummary cap={loanReview.current} currency={currency} title="السقف الآن" />
                      {loanReview.approvals.length > 0 && <ul className="text-xs text-gray-600 space-y-1">{loanReview.approvals.map(row => <li key={`${row.step}-${row.at}`}>خطوة {row.step}: {LOAN_APPROVAL_DECISION_LABELS[row.decision]} — {formatLoanMoney(row.amount)}{row.reason ? ` — ${row.reason}` : ''}</li>)}</ul>}
                      {!loanReview.exceptional && !loanReview.current.allowed && <>
                        <div><label htmlFor="loan-approved-amount" className="block text-sm font-medium text-gray-700 mb-1">تخفيض إلى مبلغ (سبب التخفيض في الملاحظة)</label>
                          <input id="loan-approved-amount" className="input w-full" dir="ltr" inputMode="decimal" disabled={acting} value={loanApprovedAmount} placeholder={loanReview.current.effectiveCap ?? ''} onChange={e => { setLoanApprovedAmount(e.target.value); setActionError(null) }} /></div>
                        {loanReview.canOverride && <div><label htmlFor="loan-override-reason" className="block text-sm font-medium text-gray-700 mb-1">أو استثناء موثق فوق السقف — السبب</label>
                          <textarea id="loan-override-reason" className="input w-full h-16 resize-none" maxLength={500} disabled={acting} value={loanOverrideReason} onChange={e => { setLoanOverrideReason(e.target.value); setActionError(null) }} /></div>}
                      </>}
                    </>}
                  </div>
                )}
                {isOvertimeApproval && overtimeLimit != null && canAdjustOvertime && <div className="rounded-xl border border-gray-200 p-4">
                  <label htmlFor="overtime-approved-minutes" className="block text-sm font-medium text-gray-700 mb-2">الدقائق للاعتماد — يمكن تخفيضها</label>
                  <input id="overtime-approved-minutes" type="number" min={1} max={overtimeLimit} step={1}
                    disabled={acting} value={approvedMinutesInput} placeholder={String(overtimeLimit)}
                    onChange={event => { setApprovedMinutesInput(event.target.value); setActionError(null) }} className="input w-full" />
                  <p className="text-xs text-gray-500 mt-2">الحد الحالي {overtimeLimit} دقيقة. اترك الحقل فارغًا لاعتماد هذا الحد. كل تخفيض يحتاج سببًا محفوظًا.</p>
                  {invalidMinutes && <p role="alert" className="text-sm text-red-600 mt-2">أدخل عدد دقائق صحيحًا من 1 إلى {overtimeLimit}.</p>}
                </div>}
                <div>
                  <label htmlFor="approval-decision-comment" className="block text-sm font-medium text-gray-700 mb-2">
                    {reducingMinutes ? 'سبب تخفيض الساعات *' : actionModal.action === 'approve'
                      ? 'ملاحظة (اختياري)'
                      : 'السبب *'}
                  </label>
                  <textarea
                    id="approval-decision-comment"
                    required={actionModal.action !== 'approve' || reducingMinutes}
                    disabled={acting}
                    maxLength={1000}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="input w-full h-24 resize-none"
                    placeholder={
                      reducingMinutes ? 'وضح سبب تخفيض الدقائق عن الحد المعروض...' : actionModal.action === 'approve'
                        ? 'أي ملاحظة تُسجَّل مع قرارك...'
                        : actionModal.action === 'reject'
                        ? 'اذكر سبب الرفض — يظهر للمقدّم'
                        : 'ما المطلوب استكماله من المقدّم؟'
                    }
                  />
                </div>
                {actionModal.action === 'approve' &&
                  actionModal.item.myStepLevel < actionModal.item.totalSteps && (
                    <p className="text-xs text-gray-400">
                      بعد اعتمادك سينتقل الطلب للخطوة{' '}
                      {actionModal.item.myStepLevel + 1} من{' '}
                      {actionModal.item.totalSteps}
                    </p>
                  )}
              </div>
              <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  disabled={acting}
                  onClick={() => {
                    setActionModal(null)
                    setDetailId(null)
                    setActionError(null)
                  }}
                  className="btn-secondary"
                >
                  إلغاء
                </button>
                <button
                  onClick={confirmAction}
                  className={`px-5 py-2.5 rounded-xl text-white text-sm font-medium ${
                    actionModal.action === 'approve'
                      ? 'bg-success-500 hover:bg-success-600'
                      : actionModal.action === 'reject'
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-gray-500 hover:bg-gray-600'
                  }`}
                  disabled={acting || detailLoading || detail?.id !== actionModal.item.id || overtimeApprovalBlocked || (actionModal.action !== 'approve' && !comment.trim())}
                >
                  {acting ? 'جارٍ التنفيذ...' : `تأكيد ${actionLabels[actionModal.action]}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
