'use client'

import { requestStatusLabels as statusLabels, requestStatusStyles } from '@/lib/status-labels'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  LogIn,
  Timer,
  Briefcase,
  Calendar,
  Paperclip,
} from 'lucide-react'
import {
  fetchAllRequests,
  fetchEmployeeDirectory,
  fetchCatalog,
  fetchInbox,
  actOnRequest,
  getCurrentUser,
  fetchFileObjectUrl,
  type ApiRequest,
  type ApiEmployee,
} from '@/lib/api'
import { payloadSummary } from '@/lib/request-payload'

// حالات محرك الطلبات — تسميات عربية

interface PermissionRow {
  id: number
  requesterId: number
  employeeName: string
  employeeCode: string
  avatar: string
  date: string
  fromTime: string
  toTime: string
  hours: number
  reason: string
  permissionType: string
  // باقي مفاتيح الحمولة (ملاحظة، أي مفتاح آخر) — لا يُخفى منها شيء عن المعتمد
  details: string
  attachmentRef: string
  status: string
}

// مدة الإذن بالساعات من from/to (HH:mm)
const hoursBetween = (from: string, to: string): number => {
  const [fh, fm] = (from || '').split(':').map(Number)
  const [th, tm] = (to || '').split(':').map(Number)
  if ([fh, fm, th, tm].some((n) => Number.isNaN(n))) return 0
  const mins = th * 60 + tm - (fh * 60 + fm)
  return mins > 0 ? Math.round((mins / 60) * 10) / 10 : 0
}

// مفاتيح لها أعمدتها في الجدول — وكل ما عداها يظهر في «التفاصيل» تحت السبب:
// المعتمد يرى الحمولة كاملة، ونوع الإذن هو ما يحدد الخصم من عدمه (SEC-REQ-2)
const SHOWN_KEYS = ['date', 'from', 'to', 'reason', 'permissionType', 'permissionTypeId']

const parsePayload = (
  payload?: string
): { date: string; from: string; to: string; reason: string; permissionType: string; permissionTypeId?: number; attachmentUrl: string } => {
  try {
    const p = JSON.parse(payload ?? '{}')
    return {
      date: p.date ?? '—',
      from: p.from ?? '—',
      to: p.to ?? '—',
      reason: p.reason ?? '—',
      permissionType: p.permissionType ? String(p.permissionType) : '',
      permissionTypeId: Number(p.permissionTypeId) || undefined,
      attachmentUrl: typeof p.attachmentUrl === 'string' ? p.attachmentUrl : '',
    }
  } catch {
    return { date: '—', from: '—', to: '—', reason: '—', permissionType: '', attachmentUrl: '' }
  }
}

const getStatusBadge = (status: string) => (
  <span className={`badge flex items-center gap-1 ${requestStatusStyles[status] ?? 'bg-gray-100 text-gray-600'}`}>
    <Clock size={12} />{statusLabels[status] ?? status}
  </span>
)

export default function PermissionsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDate, setSelectedDate] = useState('')

  const [requests, setRequests] = useState<ApiRequest[]>([])
  const [employees, setEmployees] = useState<Pick<ApiEmployee, 'id' | 'fullName' | 'employeeCode'>[]>([])
  const [permissionTypes, setPermissionTypes] = useState<Array<{ id: number; nameAr: string; isDeductible: boolean; maxDurationMinutes?: number | null; isActive: boolean }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actingId, setActingId] = useState<number | null>(null)

  // أزرار الاعتماد/الرفض للطلبات اللي في صندوقي بس — يعني عليّ خطوتها الحالية
  // (ATT-19). بالدور كانت بتظهر لأي حد مش موظف، والـAPI بيرجّع 403 لغير المعتمد
  const [actionable, setActionable] = useState<Set<number>>(new Set())
  const canAct = actionable.size > 0

  const loadRequests = () => {
    setLoading(true)
    setError('')
    fetchAllRequests({ typeCode: 'PERMISSION' })
      .then((rows) => setRequests(rows))
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل طلبات الاستئذان'))
      .finally(() => setLoading(false))
    fetchInbox()
      .then((rows) =>
        setActionable(
          new Set(rows.filter((r) => r.typeCode === 'PERMISSION').map((r) => r.id))
        )
      )
      .catch(() => setActionable(new Set()))
  }

  useEffect(() => {
    loadRequests()
    fetchCatalog<{ id: number; nameAr: string; isDeductible: boolean; maxDurationMinutes?: number | null; isActive: boolean }>('permission-types')
      .then(rows => setPermissionTypes(rows.filter(row => row.isActive)))
      .catch(err => setError(err instanceof Error ? err.message : 'تعذر تحميل أنواع الأذونات'))
    fetchEmployeeDirectory()
      .then((rows) => setEmployees(rows))
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل الموظفين'))
  }, [])

  const handleAct = async (id: number, action: 'APPROVE' | 'REJECT') => {
    setActingId(id)
    setError('')
    try {
      await actOnRequest(id, action)
      loadRequests()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تنفيذ الإجراء')
    } finally {
      setActingId(null)
    }
  }

  // فتح مرفق الطلب بالتوكن — بنفس صلاحية /files (صاحب الملف أو documents.manage)
  const openAttachment = async (ref: string) => {
    const fileId = Number(ref.slice(5))
    if (!Number.isFinite(fileId) || fileId <= 0) return
    setError('')
    const url = await fetchFileObjectUrl(fileId)
    if (url) window.open(url)
    else setError('تعذر فتح المرفق — قد لا تملك صلاحية الاطلاع عليه')
  }

  const empById = new Map(employees.map((e) => [e.id, e]))

  const rows: PermissionRow[] = requests.map((req) => {
    const emp = empById.get(req.requesterId)
    const payload = parsePayload(req.payload)
    // مرجع ملف مخزّن يُفتح بزر؛ أي قيمة أخرى للمرفق تبقى نصاً في التفاصيل
    const attachmentRef = payload.attachmentUrl.startsWith('file:') ? payload.attachmentUrl : ''
    return {
      id: req.id,
      requesterId: req.requesterId,
      employeeName: emp?.fullName ?? `موظف ${req.requesterId}`,
      employeeCode: emp?.employeeCode ?? `#${req.requesterId}`,
      avatar: (emp?.fullName ?? 'م').charAt(0),
      date: payload.date,
      fromTime: payload.from,
      toTime: payload.to,
      hours: hoursBetween(payload.from, payload.to),
      reason: payload.reason,
      permissionType: permissionTypes.find(type => type.id === payload.permissionTypeId)?.nameAr ?? payload.permissionType,
      details: payloadSummary(req.payload, attachmentRef ? [...SHOWN_KEYS, 'attachmentUrl'] : SHOWN_KEYS),
      attachmentRef,
      status: req.status,
    }
  })

  const stats = {
    all: rows.length,
    pending: rows.filter((p) => ['SUBMITTED', 'UNDER_REVIEW', 'RETURNED_FOR_INFO'].includes(p.status)).length,
    approved: rows.filter((p) => ['APPROVED', 'IN_EXECUTION', 'COMPLETED'].includes(p.status)).length,
    rejected: rows.filter((p) => p.status === 'REJECTED').length,
    totalHours: rows.filter((p) => ['APPROVED', 'IN_EXECUTION', 'COMPLETED'].includes(p.status)).reduce((sum, p) => sum + p.hours, 0),
  }

  const filteredRequests = rows.filter((req) => {
    if (activeTab === 'pending' && !['SUBMITTED', 'UNDER_REVIEW', 'RETURNED_FOR_INFO'].includes(req.status)) return false
    if (activeTab === 'approved' && !['APPROVED', 'IN_EXECUTION', 'COMPLETED'].includes(req.status)) return false
    if (activeTab === 'rejected' && req.status !== 'REJECTED') return false
    if (selectedDate && req.date !== selectedDate) return false
    if (
      searchQuery &&
      !req.employeeName.includes(searchQuery) &&
      !req.employeeCode.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false
    return true
  })

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">الأذونات والاستئذان</h1>
            <p className="text-gray-500 mt-1">إدارة طلبات الأذونات للموظفين</p>
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4">
          <div
            className={`card cursor-pointer transition-all ${activeTab === 'all' ? 'ring-2 ring-primary-500' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
                <Clock size={24} className="text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">كل الطلبات</p>
                <p className="text-2xl font-bold text-gray-800">{stats.all}</p>
              </div>
            </div>
          </div>

          <div
            className={`card cursor-pointer transition-all ${activeTab === 'pending' ? 'ring-2 ring-warning-500' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-warning-50 rounded-2xl flex items-center justify-center">
                <AlertCircle size={24} className="text-warning-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">قيد المراجعة</p>
                <p className="text-2xl font-bold text-warning-600">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div
            className={`card cursor-pointer transition-all ${activeTab === 'approved' ? 'ring-2 ring-success-500' : ''}`}
            onClick={() => setActiveTab('approved')}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
                <CheckCircle size={24} className="text-success-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">مكتملة</p>
                <p className="text-2xl font-bold text-success-600">{stats.approved}</p>
              </div>
            </div>
          </div>

          <div
            className={`card cursor-pointer transition-all ${activeTab === 'rejected' ? 'ring-2 ring-danger-500' : ''}`}
            onClick={() => setActiveTab('rejected')}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-danger-50 rounded-2xl flex items-center justify-center">
                <XCircle size={24} className="text-danger-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">مرفوضة</p>
                <p className="text-2xl font-bold text-danger-600">{stats.rejected}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
                <Timer size={24} className="text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">ساعات الأذونات</p>
                <p className="text-2xl font-bold text-primary-600">{stats.totalHours}</p>
              </div>
            </div>
          </div>
        </div>

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

            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-gray-400" />
              <input
                type="date"
                className="input w-40"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Permissions Table */}
        {loading ? (
          <div className="card flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th className="text-right px-4 py-4">الموظف</th>
                    <th className="text-center px-4 py-4">التاريخ</th>
                    <th className="text-center px-4 py-4">من</th>
                    <th className="text-center px-4 py-4">إلى</th>
                    <th className="text-center px-4 py-4">المدة</th>
                    <th className="text-center px-4 py-4">نوع الإذن</th>
                    <th className="text-right px-4 py-4">السبب والتفاصيل</th>
                    <th className="text-center px-4 py-4">الحالة</th>
                    {canAct && <th className="text-center px-4 py-4">الإجراءات</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="table-row">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold">
                            {request.avatar}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{request.employeeName}</p>
                            <p className="text-sm text-gray-400">{request.employeeCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell text-center text-gray-600">{request.date}</td>
                      <td className="table-cell text-center font-mono text-success-600">{request.fromTime}</td>
                      <td className="table-cell text-center font-mono text-danger-600">{request.toTime}</td>
                      <td className="table-cell text-center">
                        <span className="font-bold text-primary-600">{request.hours} ساعة</span>
                      </td>
                      <td className="table-cell text-center">
                        {request.permissionType ? (
                          <span className="badge bg-primary-100 text-primary-600">{request.permissionType}</span>
                        ) : (
                          <span className="text-sm text-warning-600">غير محدد</span>
                        )}
                      </td>
                      <td className="table-cell text-gray-600 max-w-[260px]">
                        <p className="truncate" title={request.reason}>{request.reason}</p>
                        {request.details && (
                          <p className="text-xs text-gray-400 mt-1 break-words">{request.details}</p>
                        )}
                        {request.attachmentRef && (
                          <button
                            onClick={() => openAttachment(request.attachmentRef)}
                            className="mt-1 inline-flex items-center gap-1 text-xs text-primary-600 hover:underline"
                          >
                            <Paperclip size={12} />
                            المرفق
                          </button>
                        )}
                      </td>
                      <td className="table-cell text-center">{getStatusBadge(request.status)}</td>
                      {canAct && (
                        <td className="table-cell">
                          <div className="flex items-center justify-center gap-1">
                            {actionable.has(request.id) && <Link href={`/approvals-inbox?request=${request.id}`} className="text-primary-600 text-sm underline">مراجعة الطلب</Link>}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-sm text-gray-500 p-4 border-t">عدد النتائج: {filteredRequests.length}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {permissionTypes.map(type => <div key={type.id} className="card border-r-4 border-primary-500"><h3 className="font-bold text-gray-800 mb-2">{type.nameAr}</h3><p className="text-sm text-gray-500">{type.isDeductible ? 'بخصم وفق السياسة' : 'بدون خصم ضمن الحدود المحددة'}</p><p className="text-xs text-gray-500 mt-2">{type.maxDurationMinutes != null ? `أقصى مدة: ${type.maxDurationMinutes} دقيقة` : 'لا يوجد حد أقصى للمدة'}</p></div>)}
        </div>
      </div>
    </MainLayout>
  )
}
