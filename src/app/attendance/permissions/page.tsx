'use client'

import { useEffect, useState } from 'react'
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
} from 'lucide-react'
import {
  fetchAllRequests,
  fetchEmployees,
  actOnRequest,
  getCurrentUser,
  type ApiRequest,
  type ApiEmployee,
} from '@/lib/api'

// حالات محرك الطلبات — تسميات عربية
const statusLabels: Record<string, string> = {
  DRAFT: 'مسودة',
  UNDER_REVIEW: 'قيد المراجعة',
  RETURNED: 'معاد للتعديل',
  COMPLETED: 'مكتمل',
  REJECTED: 'مرفوض',
  CANCELLED: 'ملغي',
}

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

const parsePayload = (payload?: string): { date: string; from: string; to: string; reason: string } => {
  try {
    const p = JSON.parse(payload ?? '{}')
    return {
      date: p.date ?? '—',
      from: p.from ?? '—',
      to: p.to ?? '—',
      reason: p.reason ?? '—',
    }
  } catch {
    return { date: '—', from: '—', to: '—', reason: '—' }
  }
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'UNDER_REVIEW':
      return (
        <span className="badge badge-warning flex items-center gap-1">
          <AlertCircle size={12} />
          قيد المراجعة
        </span>
      )
    case 'COMPLETED':
      return (
        <span className="badge badge-success flex items-center gap-1">
          <CheckCircle size={12} />
          مكتمل
        </span>
      )
    case 'REJECTED':
      return (
        <span className="badge badge-danger flex items-center gap-1">
          <XCircle size={12} />
          مرفوض
        </span>
      )
    default:
      return (
        <span className="badge bg-gray-100 text-gray-600 flex items-center gap-1">
          <Clock size={12} />
          {statusLabels[status] ?? status}
        </span>
      )
  }
}

export default function PermissionsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDate, setSelectedDate] = useState('')

  const [requests, setRequests] = useState<ApiRequest[]>([])
  const [employees, setEmployees] = useState<ApiEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actingId, setActingId] = useState<number | null>(null)

  const currentUser = getCurrentUser()
  const canAct = !!currentUser && currentUser.role !== 'employee'

  const loadRequests = () => {
    setLoading(true)
    setError('')
    fetchAllRequests({ typeCode: 'PERMISSION' })
      .then((rows) => setRequests(rows))
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل طلبات الاستئذان'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadRequests()
    fetchEmployees()
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

  const empById = new Map(employees.map((e) => [e.id, e]))

  const rows: PermissionRow[] = requests.map((req) => {
    const emp = empById.get(req.requesterId)
    const payload = parsePayload(req.payload)
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
      status: req.status,
    }
  })

  const stats = {
    all: rows.length,
    pending: rows.filter((p) => p.status === 'UNDER_REVIEW').length,
    approved: rows.filter((p) => p.status === 'COMPLETED').length,
    rejected: rows.filter((p) => p.status === 'REJECTED').length,
    totalHours: rows.filter((p) => p.status === 'COMPLETED').reduce((sum, p) => sum + p.hours, 0),
  }

  const filteredRequests = rows.filter((req) => {
    if (activeTab === 'pending' && req.status !== 'UNDER_REVIEW') return false
    if (activeTab === 'approved' && req.status !== 'COMPLETED') return false
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
                    <th className="text-right px-4 py-4">السبب</th>
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
                      <td className="table-cell text-gray-600 max-w-[200px] truncate">{request.reason}</td>
                      <td className="table-cell text-center">{getStatusBadge(request.status)}</td>
                      {canAct && (
                        <td className="table-cell">
                          <div className="flex items-center justify-center gap-1">
                            {request.status === 'UNDER_REVIEW' && (
                              <>
                                <button
                                  onClick={() => handleAct(request.id, 'APPROVE')}
                                  disabled={actingId === request.id}
                                  className="p-2 bg-success-50 hover:bg-success-100 rounded-lg transition-colors"
                                >
                                  <CheckCircle size={18} className="text-success-600" />
                                </button>
                                <button
                                  onClick={() => handleAct(request.id, 'REJECT')}
                                  disabled={actingId === request.id}
                                  className="p-2 bg-danger-50 hover:bg-danger-100 rounded-lg transition-colors"
                                >
                                  <XCircle size={18} className="text-danger-600" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                عرض <span className="font-medium text-gray-700">1-{filteredRequests.length}</span> من{' '}
                <span className="font-medium text-gray-700">{filteredRequests.length}</span> طلب
              </p>
              <div className="flex items-center gap-2">
                <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50" disabled>
                  <ChevronRight size={18} />
                </button>
                <button className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium">
                  1
                </button>
                <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50" disabled>
                  <ChevronLeft size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Permission Types Info */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card border-r-4 border-orange-500">
            <div className="flex items-center gap-2 mb-2">
              <LogOut size={20} className="text-orange-500" />
              <h3 className="font-bold text-gray-800">خروج مبكر</h3>
            </div>
            <p className="text-sm text-gray-500">مغادرة العمل قبل نهاية الدوام الرسمي</p>
          </div>
          <div className="card border-r-4 border-warning-500">
            <div className="flex items-center gap-2 mb-2">
              <LogIn size={20} className="text-warning-500" />
              <h3 className="font-bold text-gray-800">دخول متأخر</h3>
            </div>
            <p className="text-sm text-gray-500">الحضور بعد بداية الدوام الرسمي</p>
          </div>
          <div className="card border-r-4 border-primary-500">
            <div className="flex items-center gap-2 mb-2">
              <Timer size={20} className="text-primary-500" />
              <h3 className="font-bold text-gray-800">خروج أثناء الدوام</h3>
            </div>
            <p className="text-sm text-gray-500">مغادرة والعودة أثناء ساعات العمل</p>
          </div>
          <div className="card border-r-4 border-success-500">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase size={20} className="text-success-500" />
              <h3 className="font-bold text-gray-800">مهمة عمل</h3>
            </div>
            <p className="text-sm text-gray-500">التواجد خارج المكتب لمهمة رسمية</p>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
