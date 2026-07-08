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
import {
  fetchInbox,
  fetchRequestTypes,
  fetchEmployees,
  fetchBranches,
  actOnRequest,
  fetchCustodyPendingMyConfirm,
  managerConfirmCustody,
  type ApiRequest,
  type ApiRequestType,
  type ApiCustody,
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
  receiving_team_manager: 'المدير المستقبِل',
  hr: 'الموارد البشرية',
  finance: 'المالية',
  executive: 'الإدارة التنفيذية',
  custody_officer: 'أمين العهدة',
  it: 'تقنية المعلومات',
}

const fieldLabels: Record<string, string> = {
  date: 'التاريخ',
  fromDate: 'من تاريخ',
  toDate: 'إلى تاريخ',
  effectiveDate: 'تاريخ السريان',
  from: 'من الساعة',
  to: 'إلى الساعة',
  days: 'عدد الأيام',
  hours: 'عدد الساعات',
  amount: 'المبلغ',
  months: 'عدد الأشهر',
  newSalary: 'الراتب الجديد',
  increase_pct: 'نسبة الزيادة %',
  reason: 'السبب',
  description: 'الوصف',
  destination: 'جهة الانتداب',
  iban: 'الآيبان IBAN',
  name: 'الاسم',
  phone: 'رقم الهاتف',
  documentType: 'نوع الوثيقة',
  courseName: 'اسم الدورة',
  note: 'ملاحظة',
}

const payloadSummary = (raw?: string | null): string => {
  const payload = parseJson<Record<string, unknown>>(raw, {})
  return Object.entries(payload)
    .map(([k, v]) => `${fieldLabels[k] ?? k}: ${v}`)
    .join(' • ')
}

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
  slaDaysLeft: number // المتبقي قبل انتهاء مهلة الرد — من dueAt للخطوة الحالية
}

export default function ApprovalsInboxPage() {
  const [items, setItems] = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState('')
  const [actionModal, setActionModal] = useState<{
    item: InboxItem
    action: 'approve' | 'reject' | 'return'
  } | null>(null)
  const [comment, setComment] = useState('')
  const [acting, setActing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [history, setHistory] = useState<
    { id: string; title: string; action: string }[]
  >([])
  // عهد أكّد الموظف استلامها وتنتظر اعتمادي كمدير مباشر
  const [custodyPending, setCustodyPending] = useState<ApiCustody[]>([])
  const [custodyConfirming, setCustodyConfirming] = useState<number | null>(null)

  const loadCustodyPending = () =>
    fetchCustodyPendingMyConfirm()
      .then(setCustodyPending)
      .catch(() => setCustodyPending([]))

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
      const [inbox, typeList, employees, branches] = await Promise.all([
        fetchInbox(),
        fetchRequestTypes(),
        fetchEmployees(),
        fetchBranches(),
      ])
      const typesByCode = new Map<string, ApiRequestType>(typeList.map((t) => [t.code, t]))
      const employeesById = new Map(employees.map((e) => [e.id, e]))
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
            : current?.slaDays ?? 3
          const requester = employeesById.get(r.requesterId)
          return {
            id: r.id,
            displayId: `REQ-${r.id}`,
            category: type?.category ?? '',
            title: type?.nameAr ?? r.typeCode,
            requester: requester?.fullName ?? `موظف #${r.requesterId}`,
            branchName: r.branchId ? branchesById.get(r.branchId)?.name ?? '' : '',
            submittedAt: (r.submittedAt ?? r.createdAt).slice(0, 10),
            details: payloadSummary(r.payload) || (type?.nameAr ?? r.typeCode),
            myStepLevel: r.currentStep ?? current?.stepOrder ?? 1,
            totalSteps: steps.length || 1,
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
  const overdue = items.filter((i) => i.slaDaysLeft <= 0).length

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

  const confirmAction = async () => {
    if (!actionModal || acting) return
    setActing(true)
    setActionError(null)
    try {
      await actOnRequest(
        actionModal.item.id,
        apiActions[actionModal.action],
        comment || undefined
      )
      setHistory([
        {
          id: actionModal.item.displayId,
          title: actionModal.item.title,
          action:
            actionModal.action === 'approve'
              ? 'اعتمدت'
              : actionModal.action === 'reject'
              ? 'رفضت'
              : 'أعدت',
        },
        ...history,
      ])
      setComment('')
      setActionModal(null)
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

        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

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
                      item.slaDaysLeft <= 0 ? 'border-2 border-red-200' : ''
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
                            {item.slaDaysLeft <= 0 ? (
                              <span className="badge text-xs bg-red-100 text-red-700">
                                متجاوز للمهلة!
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">
                                متبقي {item.slaDaysLeft} يوم للرد
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1.5">{item.details}</p>
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
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setActionModal({ item, action: 'approve' })}
                          className="flex items-center gap-1.5 px-4 py-2 bg-success-500 text-white rounded-xl text-sm font-medium hover:bg-success-600"
                        >
                          <CheckCircle2 size={16} />
                          اعتماد
                        </button>
                        <button
                          onClick={() => setActionModal({ item, action: 'reject' })}
                          className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100"
                        >
                          <XCircle size={16} />
                          رفض
                        </button>
                        <button
                          onClick={() => setActionModal({ item, action: 'return' })}
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

        {/* آخر قراراتي */}
        {history.length > 0 && (
          <div className="card p-5">
            <h3 className="font-bold text-gray-800 mb-3 text-sm">آخر قراراتك في الجلسة</h3>
            <div className="space-y-2">
              {history.slice(0, 5).map((h, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircle2 size={14} className="text-gray-300" />
                  <span>
                    {h.action} «{h.title}»
                  </span>
                  <span className="text-xs text-gray-400" dir="ltr">
                    {h.id}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Modal */}
        {actionModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-800">
                  {actionLabels[actionModal.action]}: {actionModal.item.title}
                </h2>
                <button
                  onClick={() => {
                    setActionModal(null)
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {actionModal.action === 'approve'
                      ? 'ملاحظة (اختياري)'
                      : 'السبب *'}
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="input w-full h-24 resize-none"
                    placeholder={
                      actionModal.action === 'approve'
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
                  onClick={() => {
                    setActionModal(null)
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
                  disabled={acting || (actionModal.action !== 'approve' && !comment)}
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
