'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Download,
  ClipboardList,
  ShieldAlert,
  EyeOff,
  FileText,
  ArrowLeft,
  Database,
  Clock,
  X,
} from 'lucide-react'
import {
  requestsCatalog,
  getTypeByCode,
  statusLabels,
  statusStyles,
  categoryLabels,
  type RequestStatus,
  type RequestCategory,
} from '@/data/requestsCatalog'
import {
  fetchAllRequests,
  fetchRequestTypes,
  fetchBranches,
  fetchEmployees,
  fetchDepartments,
  fetchRequest,
  type ApiRequest,
  type ApiRequestType,
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
  receiving_team_manager: 'المدير المستقبِل',
  hr: 'الموارد البشرية',
  finance: 'المالية',
  executive: 'الإدارة التنفيذية',
  custody_officer: 'أمين العهدة',
  it: 'تقنية المعلومات',
}

// أفعال سجل الاعتمادات كما يخزنها الباك
const approvalActionLabels: Record<string, string> = {
  APPROVED: 'اعتمد',
  REJECTED: 'رفض',
  RETURNED_FOR_INFO: 'أعاد لاستكمال معلومات',
  ESCALATED: 'صُعِّد',
}

// ===== سجل طلبات الشركة — صف الشاشة المشتق من ApiRequest =====
interface CompanyRequestRow {
  id: number
  displayId: string
  typeCode: string
  requesterName: string // يُخفى في السرّي
  department: string
  branchId: number | null
  submittedAt: string
  status: RequestStatus
  currentStep: string
  destinationRecord: string | null // مرجع السجل الدائم بعد التنفيذ
  effectiveDate?: string
}

const stepText = (r: ApiRequest, steps: ResolvedStep[]): string => {
  if (r.status === 'COMPLETED') return 'منتهي'
  if (r.status === 'CANCELLED') return 'ألغاه مقدّمه'
  if (r.status === 'DRAFT') return 'مسودة — لم يُقدَّم'
  if (r.status === 'RETURNED_FOR_INFO') return 'مُرجَع لاستكمال معلومات'
  if (r.status === 'REJECTED') {
    const rejected = steps.find((s) => s.action === 'REJECT')
    return rejected
      ? `رُفض عند: ${roleLabels[rejected.role] ?? rejected.role}`
      : 'مرفوض'
  }
  const current =
    steps.find((s) => s.stepOrder === r.currentStep) ?? steps.find((s) => !s.actedAt)
  if (current) {
    return `${roleLabels[current.role] ?? current.role} (${current.stepOrder} من ${steps.length})`
  }
  return ['APPROVED', 'IN_EXECUTION'].includes(r.status) ? 'قيد التنفيذ' : '—'
}

export default function RequestsConsolePage() {
  const [requests, setRequests] = useState<CompanyRequestRow[]>([])
  const [types, setTypes] = useState<Map<string, ApiRequestType>>(new Map())
  const [branches, setBranches] = useState<ApiBranch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<'' | RequestCategory>('')
  const [filterStatus, setFilterStatus] = useState<'' | RequestStatus>('')
  const [filterBranch, setFilterBranch] = useState('')
  const [detail, setDetail] = useState<ApiRequest | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        setError(null)
        const [all, typeList, branchList, employees, departments] = await Promise.all([
          fetchAllRequests(),
          fetchRequestTypes(),
          fetchBranches(),
          fetchEmployees(),
          fetchDepartments(),
        ])
        const typesByCode = new Map(typeList.map((t) => [t.code, t]))
        const employeesById = new Map(employees.map((e) => [e.id, e]))
        const departmentsById = new Map(departments.map((d) => [d.id, d]))
        setTypes(typesByCode)
        setBranches(branchList)
        setRequests(
          all.map((r): CompanyRequestRow => {
            const type = typesByCode.get(r.typeCode)
            const steps = parseJson<ResolvedStep[]>(r.resolvedSteps, [])
            const payload = parseJson<Record<string, unknown>>(r.payload, {})
            const requester = employeesById.get(r.requesterId)
            const department = requester?.departmentId
              ? departmentsById.get(requester.departmentId)?.name ?? ''
              : ''
            // السرّي: يُخفى المقدّم وإدارته
            const masked = type?.isConfidential === true
            return {
              id: r.id,
              displayId: `REQ-${r.id}`,
              typeCode: r.typeCode,
              requesterName: masked
                ? '(سرّي)'
                : requester?.fullName ?? `موظف #${r.requesterId}`,
              department: masked ? '(سرّي)' : department,
              branchId: r.branchId ?? null,
              submittedAt: (r.submittedAt ?? r.createdAt).slice(0, 10),
              status: r.status as RequestStatus,
              currentStep: stepText(r, steps),
              destinationRecord: r.destinationRef ?? null,
              effectiveDate:
                typeof payload.effectiveDate === 'string'
                  ? payload.effectiveDate
                  : undefined,
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
    load()
  }, [])

  const openDetail = async (id: number) => {
    setDetailLoading(true)
    try {
      setDetail(await fetchRequest(id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر تحميل تفاصيل الطلب')
    } finally {
      setDetailLoading(false)
    }
  }

  const filtered = requests.filter((r) => {
    const type = types.get(r.typeCode)
    return (
      (r.displayId.includes(searchQuery) ||
        r.requesterName.includes(searchQuery) ||
        (type?.nameAr ?? '').includes(searchQuery)) &&
      (!filterCategory || type?.category === filterCategory) &&
      (!filterStatus || r.status === filterStatus) &&
      (!filterBranch || String(r.branchId ?? '') === filterBranch)
    )
  })

  const counts = {
    total: requests.length,
    open: requests.filter((r) =>
      ['SUBMITTED', 'UNDER_REVIEW', 'RETURNED_FOR_INFO'].includes(r.status)
    ).length,
    executing: requests.filter((r) =>
      ['APPROVED', 'IN_EXECUTION'].includes(r.status)
    ).length,
    completed: requests.filter((r) => r.status === 'COMPLETED').length,
  }

  const detailType = detail ? types.get(detail.typeCode) : undefined
  const detailSteps = detail ? parseJson<ResolvedStep[]>(detail.resolvedSteps, []) : []

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">لوحة الطلبات — Requests Console</h1>
            <p className="text-gray-500 mt-1">
              الشاشة الأم: كل طلبات الشركة بدورة حياتها الكاملة — وكل طلب معتمَد له وجهة (سجل دائم)
            </p>
          </div>
          <button className="btn-secondary flex items-center gap-2">
            <Download size={18} />
            تصدير
          </button>
        </div>

        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="card p-4 flex items-center gap-3">
                <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
                  <ClipboardList size={24} className="text-primary-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">إجمالي الطلبات</p>
                  <p className="text-2xl font-bold text-gray-800">{counts.total}</p>
                </div>
              </div>
              <div className="card p-4 flex items-center gap-3">
                <div className="w-12 h-12 bg-warning-50 rounded-xl flex items-center justify-center">
                  <Clock size={24} className="text-warning-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">مفتوحة (مُقدَّم/مراجعة/مُرجَع)</p>
                  <p className="text-2xl font-bold text-warning-600">{counts.open}</p>
                </div>
              </div>
              <div className="card p-4 flex items-center gap-3">
                <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
                  <ArrowLeft size={24} className="text-cyan-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">موافَق/قيد التنفيذ</p>
                  <p className="text-2xl font-bold text-cyan-600">{counts.executing}</p>
                </div>
              </div>
              <div className="card p-4 flex items-center gap-3">
                <div className="w-12 h-12 bg-success-50 rounded-xl flex items-center justify-center">
                  <Database size={24} className="text-success-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">مكتملة (كُتبت في وجهتها)</p>
                  <p className="text-2xl font-bold text-success-600">{counts.completed}</p>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="card p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[220px]">
                  <Search
                    size={18}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    placeholder="بحث برقم الطلب / الموظف / النوع..."
                    className="input pr-10 w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value as '' | RequestCategory)}
                  className="input w-48"
                >
                  <option value="">كل الفئات (9)</option>
                  {Object.entries(categoryLabels).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as '' | RequestStatus)}
                  className="input w-52"
                >
                  <option value="">كل الحالات (9)</option>
                  {Object.entries(statusLabels).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
                <select
                  value={filterBranch}
                  onChange={(e) => setFilterBranch(e.target.value)}
                  className="input w-48"
                >
                  <option value="">كل الفروع</option>
                  {branches.map((b) => (
                    <option key={b.id} value={String(b.id)}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Requests Table */}
            <div className="card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="table-header">
                      <th className="text-right px-4 py-3">الطلب</th>
                      <th className="text-right px-4 py-3">مقدّمه</th>
                      <th className="text-center px-4 py-3">الفرع</th>
                      <th className="text-center px-4 py-3">التقديم</th>
                      <th className="text-center px-4 py-3">الحالة</th>
                      <th className="text-right px-4 py-3">الخطوة الحالية</th>
                      <th className="text-right px-4 py-3">الوجهة (السجل الدائم)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((req) => {
                      const type = types.get(req.typeCode)
                      const def = getTypeByCode(req.typeCode)
                      if (!type) return null
                      return (
                        <tr
                          key={req.id}
                          className="table-row cursor-pointer"
                          onClick={() => openDetail(req.id)}
                        >
                          <td className="table-cell">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-gray-800 text-sm">{type.nameAr}</p>
                              {type.isSecurityRoute && (
                                <span className="badge text-[10px] bg-red-100 text-red-700 flex items-center gap-0.5">
                                  <ShieldAlert size={10} />
                                  مسار أمني
                                </span>
                              )}
                              {type.isConfidential && (
                                <span className="badge text-[10px] bg-gray-800 text-white flex items-center gap-0.5">
                                  <EyeOff size={10} />
                                  سرّي
                                </span>
                              )}
                              {type.autoGeneratesPdf && (
                                <span className="badge text-[10px] bg-teal-50 text-teal-700 flex items-center gap-0.5">
                                  <FileText size={10} />
                                  PDF آلي
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-400 font-mono mt-0.5" dir="ltr">
                              {req.displayId} • {type.code}
                            </p>
                            <span className="text-[10px] text-indigo-500">
                              {categoryLabels[type.category as RequestCategory] ?? type.category}
                            </span>
                          </td>
                          <td className="table-cell">
                            <p
                              className={`text-sm ${
                                type.isConfidential ? 'text-gray-400 italic' : 'text-gray-700'
                              }`}
                            >
                              {req.requesterName}
                            </p>
                            <p className="text-xs text-gray-400">{req.department}</p>
                          </td>
                          <td className="table-cell text-center text-xs text-gray-500">
                            {branches.find((b) => b.id === req.branchId)?.name ?? '—'}
                          </td>
                          <td className="table-cell text-center text-xs font-mono text-gray-500" dir="ltr">
                            {req.submittedAt}
                          </td>
                          <td className="table-cell text-center">
                            <span className={`badge text-xs ${statusStyles[req.status]}`}>
                              {statusLabels[req.status]}
                            </span>
                            {req.effectiveDate && (
                              <p className="text-[10px] text-cyan-600 mt-1">
                                تاريخ السريان: {req.effectiveDate}
                              </p>
                            )}
                          </td>
                          <td className="table-cell text-sm text-gray-600">{req.currentStep}</td>
                          <td className="table-cell">
                            {req.destinationRecord ? (
                              <div className="flex items-start gap-1.5">
                                <Database size={14} className="text-success-500 mt-0.5 shrink-0" />
                                <p className="text-xs text-success-700">{req.destinationRecord}</p>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400">
                                → {def?.destination ?? type.destinationHandler}
                                <span className="block text-[10px] text-gray-300">
                                  (يُكتب عند الاكتمال)
                                </span>
                              </p>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {filtered.length === 0 && (
                <div className="p-12 text-center">
                  <ClipboardList size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">لا توجد طلبات مطابقة</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* كتالوج الأنواع */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800 text-sm">
              كتالوج الأنواع المُعرَّفة (
              {requestsCatalog.filter((t) => !t.deprecated).length} نوعاً في 9 فئات — Data-Driven)
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="badge text-[10px] bg-primary-50 text-primary-700">P1 أساسي</span>
              <span className="badge text-[10px] bg-warning-50 text-warning-700">P2 مهم</span>
              <span className="badge text-[10px] bg-gray-100 text-gray-500">P3 متقدم</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(categoryLabels).map(([catId, catLabel]) => {
              // الأنواع المدموجة (deprecated) مخفية — تُعرض الأنواع الفعّالة فقط
              const catTypes = requestsCatalog.filter(
                (t) => t.category === catId && !t.deprecated
              )
              return (
                <div key={catId} className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-sm font-bold text-gray-700 mb-2">
                    {catLabel} <span className="text-gray-400 font-normal">({catTypes.length})</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {catTypes.map((t) => (
                      <span
                        key={t.code}
                        className={`text-[11px] px-2 py-0.5 rounded-lg ${
                          t.phase === 'P1'
                            ? 'bg-primary-50 text-primary-700'
                            : t.phase === 'P2'
                            ? 'bg-warning-50 text-warning-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                        title={`${t.code} → ${t.destination}`}
                      >
                        {t.nameAr}
                        {t.byLaw && ' ⚖️'}
                        {t.securityRoute && ' 🔒'}
                        {t.confidential && ' 🤫'}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Detail Drawer — تفاصيل الطلب وخط الاعتمادات */}
        {(detail || detailLoading) && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex justify-end"
            onClick={() => setDetail(null)}
          >
            <div
              className="bg-white w-full max-w-md h-full overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
                <h2 className="text-lg font-bold text-gray-800">
                  {detailLoading
                    ? 'تفاصيل الطلب'
                    : detailType?.nameAr ?? 'طلب'}
                </h2>
                <button
                  onClick={() => setDetail(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              {detailLoading || !detail ? (
                <div className="flex justify-center py-16">
                  <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="p-6 space-y-5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`badge text-xs ${statusStyles[detail.status as RequestStatus]}`}>
                      {statusLabels[detail.status as RequestStatus] ?? detail.status}
                    </span>
                    <span className="text-xs text-gray-400 font-mono" dir="ltr">
                      REQ-{detail.id}
                    </span>
                  </div>

                  {/* بيانات الطلب */}
                  <div className="p-4 bg-gray-50 rounded-xl space-y-1.5">
                    {Object.entries(
                      parseJson<Record<string, unknown>>(detail.payload, {})
                    ).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">{k}</span>
                        <span className="text-gray-800 font-medium">{String(v)}</span>
                      </div>
                    ))}
                  </div>

                  {detail.destinationRef && (
                    <div className="flex items-start gap-1.5 p-3 bg-success-50 rounded-xl">
                      <Database size={14} className="text-success-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-success-700">
                        الوجهة (السجل الدائم): {detail.destinationRef}
                      </p>
                    </div>
                  )}

                  {/* سلسلة الخطوات */}
                  {detailSteps.length > 0 && (
                    <div>
                      <h3 className="font-bold text-gray-800 text-sm mb-2">سلسلة الاعتماد</h3>
                      <div className="space-y-2">
                        {detailSteps.map((s) => (
                          <div
                            key={s.stepOrder}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium ${
                              s.action === 'REJECT'
                                ? 'bg-red-100 text-red-700'
                                : s.actedAt
                                ? 'bg-success-50 text-success-700'
                                : s.stepOrder === detail.currentStep
                                ? 'bg-warning-50 text-warning-700 ring-1 ring-warning-300'
                                : 'bg-gray-50 text-gray-400'
                            }`}
                          >
                            <span>
                              {s.stepOrder}. {roleLabels[s.role] ?? s.role}
                            </span>
                            <span dir="ltr">
                              {s.actedAt ? s.actedAt.slice(0, 10) : s.dueAt ? `⏳ ${s.dueAt.slice(0, 10)}` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* خط الاعتمادات الزمني */}
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm mb-2">سجل الإجراءات</h3>
                    {detail.approvals && detail.approvals.length > 0 ? (
                      <div className="space-y-2">
                        {detail.approvals.map((a) => (
                          <div key={a.id} className="p-3 bg-gray-50 rounded-xl">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium text-gray-800">
                                خطوة {a.step} — {approvalActionLabels[a.action] ?? a.action}
                              </span>
                              <span className="text-xs text-gray-400" dir="ltr">
                                {a.actedAt.slice(0, 10)}
                              </span>
                            </div>
                            {a.comment && (
                              <p className="text-xs text-gray-500 mt-1">{a.comment}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">لا توجد إجراءات مسجّلة بعد</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
