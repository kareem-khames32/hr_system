'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Plus,
  Search,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ClipboardList,
  ChevronLeft,
  X,
  Send,
  Users,
  EyeOff,
} from 'lucide-react'
import {
  getTypeByCode,
  statusLabels,
  statusStyles,
  categoryLabels,
  type RequestStatus,
} from '@/data/requestsCatalog'
import {
  fetchRequestTypes,
  fetchMyRequests,
  createRequest,
  cancelRequest,
  resubmitRequest,
  type ApiRequest,
  type ApiRequestType,
} from '@/lib/api'

// ===== أدوات فك حقول JSON القادمة من الباك (payload / resolvedSteps / requiredFields) =====
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
  leaveId: 'رقم الإجازة',
  loanId: 'رقم السلفة',
  withEmployeeId: 'رقم الموظف البديل',
  toEmployeeId: 'رقم الموظف المستلم',
  toTeamId: 'رقم الفريق الجديد',
  toTitle: 'المسمى الجديد',
  assignmentId: 'رقم العهدة',
  iban: 'الآيبان IBAN',
  name: 'الاسم',
  phone: 'رقم الهاتف',
  documentType: 'نوع الوثيقة',
  courseName: 'اسم الدورة',
}

const isDateField = (f: string) => f === 'date' || f.includes('Date')
const isNumberField = (f: string) =>
  /days|hours|amount|months|salary|pct/i.test(f) || /Id$/.test(f)

const payloadSummary = (raw?: string | null): string => {
  const payload = parseJson<Record<string, unknown>>(raw, {})
  return Object.entries(payload)
    .map(([k, v]) => `${fieldLabels[k] ?? k}: ${v}`)
    .join(' • ')
}

// شكل الصف في الشاشة — مشتق من ApiRequest
interface MyRequestRow {
  id: number
  displayId: string
  type: string
  typeCode: string
  submittedAt: string
  status: RequestStatus
  // سلسلة الاعتماد وخطوتها الحالية
  steps: { name: string; state: 'done' | 'current' | 'waiting' | 'rejected' }[]
  details: string
  destinationRecord?: string // مرجع الوجهة بعد الاكتمال
}

const mapRequest = (r: ApiRequest, types: ApiRequestType[]): MyRequestRow => {
  const steps = parseJson<ResolvedStep[]>(r.resolvedSteps, [])
  return {
    id: r.id,
    displayId: `REQ-${r.id}`,
    type:
      types.find((t) => t.code === r.typeCode)?.nameAr ??
      getTypeByCode(r.typeCode)?.nameAr ??
      r.typeCode,
    typeCode: r.typeCode,
    submittedAt: (r.submittedAt ?? r.createdAt).slice(0, 10),
    status: r.status as RequestStatus,
    steps: steps.map((s) => ({
      name: roleLabels[s.role] ?? s.role,
      state:
        s.action === 'REJECT'
          ? 'rejected'
          : s.action === 'APPROVE' || (s.actedAt && s.action !== 'RETURN')
          ? 'done'
          : s.stepOrder === r.currentStep
          ? 'current'
          : 'waiting',
    })),
    details: payloadSummary(r.payload),
    destinationRecord: r.destinationRef ?? undefined,
  }
}

const statusIcons: Partial<Record<RequestStatus, typeof Clock>> = {
  SUBMITTED: Send,
  UNDER_REVIEW: Clock,
  APPROVED: CheckCircle2,
  IN_EXECUTION: RotateCcw,
  COMPLETED: CheckCircle2,
  REJECTED: XCircle,
  RETURNED_FOR_INFO: RotateCcw,
  DRAFT: FileText,
  CANCELLED: XCircle,
}

export default function MyRequestsPage() {
  const [types, setTypes] = useState<ApiRequestType[]>([])
  const [requests, setRequests] = useState<MyRequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | RequestStatus>('all')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewModal, setShowNewModal] = useState(false)
  const [selectedType, setSelectedType] = useState('')
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [requestNote, setRequestNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const load = async () => {
    try {
      setError(null)
      const [typeList, mine] = await Promise.all([
        fetchRequestTypes(),
        fetchMyRequests(),
      ])
      setTypes(typeList)
      setRequests(mine.map((r) => mapRequest(r, typeList)))
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // الأنواع المتاحة للموظف — من كتالوج السيرفر (المرحلة P1 التي يقدّمها الموظف)
  const availableRequestTypes = types.filter(
    (t) =>
      t.isActive &&
      t.phase === 'P1' &&
      (getTypeByCode(t.code)?.submitter.includes('E') ?? true)
  )

  const selectedTypeDef = availableRequestTypes.find((t) => t.code === selectedType)
  const requiredFields = parseJson<string[]>(selectedTypeDef?.requiredFields, [])

  const filtered = requests.filter(
    (r) =>
      (filter === 'all' ||
        (filter === 'IN_EXECUTION'
          ? ['APPROVED', 'IN_EXECUTION'].includes(r.status)
          : r.status === filter)) &&
      (r.type.includes(searchQuery) || r.displayId.includes(searchQuery))
  )

  const counts: Record<string, number> = {
    all: requests.length,
    UNDER_REVIEW: requests.filter((r) => r.status === 'UNDER_REVIEW').length,
    IN_EXECUTION: requests.filter((r) => ['APPROVED', 'IN_EXECUTION'].includes(r.status)).length,
    COMPLETED: requests.filter((r) => r.status === 'COMPLETED').length,
    REJECTED: requests.filter((r) => r.status === 'REJECTED').length,
    RETURNED_FOR_INFO: requests.filter((r) => r.status === 'RETURNED_FOR_INFO').length,
  }

  const handleSubmit = async () => {
    if (!selectedTypeDef || submitting) return
    const payload: Record<string, unknown> = {}
    for (const f of requiredFields) {
      const raw = (fieldValues[f] ?? '').trim()
      payload[f] = isNumberField(f) && raw !== '' ? Number(raw) : raw
    }
    if (requestNote.trim()) payload.note = requestNote.trim()
    setSubmitting(true)
    setSubmitError(null)
    try {
      await createRequest(selectedTypeDef.code, payload)
      setSelectedType('')
      setFieldValues({})
      setRequestNote('')
      setShowNewModal(false)
      await load()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'تعذّر إرسال الطلب')
    } finally {
      setSubmitting(false)
    }
  }

  const withdraw = async (id: number) => {
    if (!confirm('سحب الطلب؟ لن يظهر للمعتمدين بعد السحب.')) return
    try {
      await cancelRequest(id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر سحب الطلب')
    }
  }

  const resubmit = async (id: number) => {
    try {
      await resubmitRequest(id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر إعادة إرسال الطلب')
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">طلباتي</h1>
            <p className="text-gray-500 mt-1">
              قدّم طلباتك وتابع حالتها وخطوة الاعتماد الحالية
            </p>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            طلب جديد
          </button>
        </div>

        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Status Filters */}
            <div className="flex gap-2 flex-wrap">
              {(
                [
                  ['all', 'الكل'],
                  ['UNDER_REVIEW', 'قيد المراجعة'],
                  ['IN_EXECUTION', 'قيد التنفيذ'],
                  ['COMPLETED', 'مكتمل'],
                  ['REJECTED', 'مرفوض'],
                  ['RETURNED_FOR_INFO', 'مُرجَع إليّ'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setFilter(id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    filter === id
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                  <span
                    className={`mr-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                      filter === id ? 'bg-white/20' : 'bg-white'
                    }`}
                  >
                    {counts[id] ?? 0}
                  </span>
                </button>
              ))}
              <div className="relative flex-1 max-w-xs mr-auto">
                <Search
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="بحث برقم الطلب أو النوع..."
                  className="input pr-10 w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Requests List */}
            <div className="space-y-4">
              {filtered.map((req) => {
                const StatusIcon = statusIcons[req.status] ?? Clock
                return (
                  <div key={req.id} className="card p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center ${statusStyles[req.status]}`}
                        >
                          <StatusIcon size={24} />
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="font-bold text-gray-800">{req.type}</h3>
                            <span className={`badge text-xs ${statusStyles[req.status]}`}>
                              {statusLabels[req.status]}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{req.details}</p>
                          {req.destinationRecord && (
                            <p className="text-xs text-success-600 mt-1">
                              ✓ الوجهة: {req.destinationRecord}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1" dir="ltr">
                            {req.displayId} • {req.submittedAt}
                          </p>
                        </div>
                      </div>
                      {['DRAFT', 'SUBMITTED', 'UNDER_REVIEW'].includes(req.status) && (
                        <button
                          onClick={() => withdraw(req.id)}
                          className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-600"
                        >
                          سحب الطلب
                        </button>
                      )}
                      {req.status === 'RETURNED_FOR_INFO' && (
                        <button
                          onClick={() => resubmit(req.id)}
                          className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
                        >
                          استكمال وإعادة إرسال
                        </button>
                      )}
                    </div>

                    {/* سلسلة الاعتماد */}
                    {req.steps.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-400">سلسلة الاعتماد:</span>
                        {req.steps.map((step, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                                step.state === 'done'
                                  ? 'bg-success-50 text-success-700'
                                  : step.state === 'current'
                                  ? 'bg-warning-50 text-warning-700 ring-1 ring-warning-300'
                                  : step.state === 'rejected'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-50 text-gray-400'
                              }`}
                            >
                              {step.state === 'done' && <CheckCircle2 size={12} />}
                              {step.state === 'current' && <Clock size={12} />}
                              {step.state === 'rejected' && <XCircle size={12} />}
                              {step.name}
                              {step.state === 'current' && ' (الآن)'}
                            </div>
                            {i < req.steps.length - 1 && (
                              <ChevronLeft size={14} className="text-gray-300" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {filtered.length === 0 && (
                <div className="card p-12 text-center">
                  <ClipboardList size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">لا توجد طلبات مطابقة</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* New Request Modal */}
        {showNewModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">تقديم طلب جديد</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    الطلبات الظاهرة لك حسب ما حدده المسؤول في «بانِي الطلبات»
                  </p>
                </div>
                <button
                  onClick={() => setShowNewModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {submitError && (
                  <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm">
                    {submitError}
                  </div>
                )}

                {/* فئات الكتالوج */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedCategory('')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                      !selectedCategory ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    الكل
                  </button>
                  {Object.entries(categoryLabels).map(([catId, catLabel]) => {
                    const count = availableRequestTypes.filter((t) => t.category === catId).length
                    if (!count) return null
                    return (
                      <button
                        key={catId}
                        onClick={() => setSelectedCategory(selectedCategory === catId ? '' : catId)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                          selectedCategory === catId
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {catLabel} ({count})
                      </button>
                    )
                  })}
                </div>

                <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto">
                  {availableRequestTypes
                    .filter((t) => !selectedCategory || t.category === selectedCategory)
                    .map((t) => {
                      const def = getTypeByCode(t.code)
                      return (
                        <button
                          key={t.code}
                          onClick={() => {
                            setSelectedType(t.code)
                            setFieldValues({})
                            setSubmitError(null)
                          }}
                          className={`p-4 rounded-xl border-2 text-right transition-all flex items-center justify-between ${
                            selectedType === t.code
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-100 hover:border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <FileText
                              size={20}
                              className={
                                selectedType === t.code ? 'text-primary-600' : 'text-gray-400'
                              }
                            />
                            <div>
                              <p className="font-bold text-gray-800 text-sm">
                                {t.nameAr}
                                {t.autoGeneratesPdf && (
                                  <span className="mr-2 badge text-[10px] bg-teal-50 text-teal-700">PDF آلي</span>
                                )}
                                {t.isConfidential && (
                                  <span className="mr-2 badge text-[10px] bg-gray-800 text-white">
                                    <EyeOff size={9} className="inline ml-0.5" />
                                    سرّي
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-gray-500">
                                السلسلة: {def?.approvalChain ?? '—'} • الوجهة:{' '}
                                {def?.destination ?? t.destinationHandler}
                              </p>
                            </div>
                          </div>
                          <span className="flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg whitespace-nowrap">
                            <Users size={12} />
                            {categoryLabels[t.category as keyof typeof categoryLabels] ?? t.category}
                          </span>
                        </button>
                      )
                    })}
                </div>

                {selectedType && requiredFields.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {requiredFields.map((f) => (
                      <div key={f}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {fieldLabels[f] ?? f}
                        </label>
                        <input
                          type={
                            isDateField(f) ? 'date' : isNumberField(f) ? 'number' : 'text'
                          }
                          className="input w-full"
                          placeholder={f === 'from' || f === 'to' ? 'HH:MM' : undefined}
                          value={fieldValues[f] ?? ''}
                          onChange={(e) =>
                            setFieldValues({ ...fieldValues, [f]: e.target.value })
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}

                {selectedType && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      تفاصيل الطلب
                    </label>
                    <textarea
                      value={requestNote}
                      onChange={(e) => setRequestNote(e.target.value)}
                      className="input w-full h-24 resize-none"
                      placeholder="اكتب تفاصيل طلبك... (حقول النموذج الكاملة تُبنى حسب نوع الطلب)"
                    />
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button onClick={() => setShowNewModal(false)} className="btn-secondary">
                  إلغاء
                </button>
                <button
                  onClick={handleSubmit}
                  className="btn-primary flex items-center gap-2"
                  disabled={!selectedType || submitting}
                >
                  <Send size={16} />
                  {submitting ? 'جارٍ الإرسال...' : 'إرسال الطلب'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
