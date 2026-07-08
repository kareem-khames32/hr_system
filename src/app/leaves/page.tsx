'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Plus,
  Download,
  Calendar,
  CheckCircle,
  XCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'
import { fetchLeaves, type ApiLeave } from '@/lib/api'

// سجل الإجازات — هذا هو «سجل الوجهة» بعد اكتمال الموافقات في محرك الطلبات.
// الاعتماد/الرفض يتم في صندوق الموافقات، وليس هنا.

const LEAVE_TYPE_META: Record<string, { label: string; color: string }> = {
  ANNUAL: { label: 'إجازة سنوية', color: 'bg-primary-500' },
  SICK: { label: 'إجازة مرضية', color: 'bg-danger-500' },
  CASUAL: { label: 'إجازة طارئة', color: 'bg-warning-500' },
  UNPAID: { label: 'إجازة بدون راتب', color: 'bg-gray-500' },
  MATERNITY: { label: 'إجازة وضع', color: 'bg-purple-500' },
  PATERNITY: { label: 'إجازة أبوة', color: 'bg-indigo-500' },
  HAJJ: { label: 'إجازة حج', color: 'bg-green-500' },
  MARRIAGE: { label: 'إجازة زواج', color: 'bg-pink-500' },
  BEREAVEMENT: { label: 'إجازة وفاة/عدة', color: 'bg-gray-500' },
  EXAM: { label: 'إجازة امتحانات', color: 'bg-teal-500' },
  COMPENSATORY: { label: 'إجازة تعويضية', color: 'bg-cyan-500' },
}

const leaveTypeMeta = (code: string) =>
  LEAVE_TYPE_META[code] ?? { label: code, color: 'bg-gray-400' }

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'APPROVED':
      return (
        <span className="badge badge-success flex items-center gap-1">
          <CheckCircle size={12} />
          موافق عليه
        </span>
      )
    case 'CANCELLED':
      return (
        <span className="badge bg-gray-100 text-gray-600 flex items-center gap-1">
          <XCircle size={12} />
          ملغاة
        </span>
      )
    default:
      return (
        <span className="badge bg-gray-100 text-gray-600 flex items-center gap-1">
          {status}
        </span>
      )
  }
}

export default function LeavesPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'APPROVED' | 'CANCELLED'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [fromFilter, setFromFilter] = useState('')
  const [toFilter, setToFilter] = useState('')

  const [leaves, setLeaves] = useState<ApiLeave[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    fetchLeaves()
      .then(setLeaves)
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل سجل الإجازات'))
      .finally(() => setLoading(false))
  }, [])

  const filteredRequests = leaves.filter((req) => {
    if (activeTab !== 'all' && req.status !== activeTab) return false
    if (
      searchQuery &&
      !(req.employeeName ?? '').includes(searchQuery) &&
      !(req.employeeCode ?? '').toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false
    if (selectedType !== 'all' && req.leaveType !== selectedType) return false
    if (fromFilter && req.fromDate < fromFilter) return false
    if (toFilter && req.fromDate > toFilter) return false
    return true
  })

  const stats = {
    all: leaves.length,
    approved: leaves.filter((r) => r.status === 'APPROVED').length,
    cancelled: leaves.filter((r) => r.status === 'CANCELLED').length,
    totalDays: leaves
      .filter((r) => r.status === 'APPROVED')
      .reduce((s, r) => s + Number(r.days), 0),
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">سجل الإجازات</h1>
            <p className="text-gray-500 mt-1">
              الإجازات المعتمدة من محرك الطلبات — الموافقة تتم في صندوق الموافقات
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-secondary flex items-center gap-2">
              <Download size={18} />
              تصدير
            </button>
            <Link href="/leaves/request" className="btn-primary flex items-center gap-2">
              <Plus size={18} />
              طلب إجازة جديد
            </Link>
          </div>
        </div>

        {/* Stats Tabs */}
        <div className="grid grid-cols-4 gap-4">
          <button
            onClick={() => setActiveTab('all')}
            className={`card text-right transition-all ${
              activeTab === 'all' ? 'ring-2 ring-primary-500' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
                <FileText size={24} className="text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">كل السجلات</p>
                <p className="text-3xl font-bold text-gray-800">{stats.all}</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('APPROVED')}
            className={`card text-right transition-all ${
              activeTab === 'APPROVED' ? 'ring-2 ring-success-500' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
                <CheckCircle size={24} className="text-success-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">موافق عليها</p>
                <p className="text-3xl font-bold text-success-600">{stats.approved}</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('CANCELLED')}
            className={`card text-right transition-all ${
              activeTab === 'CANCELLED' ? 'ring-2 ring-danger-500' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-danger-50 rounded-2xl flex items-center justify-center">
                <XCircle size={24} className="text-danger-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">ملغاة</p>
                <p className="text-3xl font-bold text-danger-600">{stats.cancelled}</p>
              </div>
            </div>
          </button>

          <div className="card text-right">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
                <Calendar size={24} className="text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">أيام معتمدة</p>
                <p className="text-3xl font-bold text-primary-600">{stats.totalDays}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
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

            {/* Leave Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="input w-48"
            >
              <option value="all">كل أنواع الإجازات</option>
              {Object.entries(LEAVE_TYPE_META).map(([code, meta]) => (
                <option key={code} value={code}>
                  {meta.label}
                </option>
              ))}
            </select>

            {/* Date Range */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="input w-40"
                value={fromFilter}
                onChange={(e) => setFromFilter(e.target.value)}
              />
              <span className="text-gray-400">إلى</span>
              <input
                type="date"
                className="input w-40"
                value={toFilter}
                onChange={(e) => setToFilter(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4 flex items-center gap-2">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        {/* Leave Requests Table */}
        <div className="card overflow-hidden p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="text-right px-4 py-4">الموظف</th>
                  <th className="text-right px-4 py-4">نوع الإجازة</th>
                  <th className="text-center px-4 py-4">من</th>
                  <th className="text-center px-4 py-4">إلى</th>
                  <th className="text-center px-4 py-4">الأيام</th>
                  <th className="text-center px-4 py-4">رقم الطلب</th>
                  <th className="text-center px-4 py-4">الحالة</th>
                  <th className="text-center px-4 py-4">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-gray-400">
                      لا توجد إجازات مسجلة
                    </td>
                  </tr>
                )}
                {filteredRequests.map((request) => {
                  const meta = leaveTypeMeta(request.leaveType)
                  return (
                    <tr key={request.id} className="table-row">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold">
                            {(request.employeeName ?? 'م').charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">
                              {request.employeeName ?? `موظف ${request.employeeId}`}
                            </p>
                            <p className="text-sm text-gray-400 font-mono">
                              {request.employeeCode ?? '-'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${meta.color}`} />
                          <span className="text-gray-700">{meta.label}</span>
                        </div>
                      </td>
                      <td className="table-cell text-center text-gray-600" dir="ltr">
                        {request.fromDate}
                      </td>
                      <td className="table-cell text-center text-gray-600" dir="ltr">
                        {request.toDate}
                      </td>
                      <td className="table-cell text-center">
                        <span className="font-bold text-primary-600">{Number(request.days)} يوم</span>
                      </td>
                      <td className="table-cell text-center text-gray-500 font-mono">
                        {request.requestId ? `#${request.requestId}` : '-'}
                      </td>
                      <td className="table-cell text-center">{getStatusBadge(request.status)}</td>
                      <td className="table-cell">
                        <div className="flex items-center justify-center gap-1">
                          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <Eye size={18} className="text-gray-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              عرض <span className="font-medium text-gray-700">1-{filteredRequests.length}</span> من{' '}
              <span className="font-medium text-gray-700">{filteredRequests.length}</span> سجل
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

        {/* Leave Types Legend */}
        <div className="card">
          <h3 className="text-sm font-bold text-gray-700 mb-4">أنواع الإجازات</h3>
          <div className="flex flex-wrap items-center gap-6">
            {Object.entries(LEAVE_TYPE_META).map(([code, meta]) => (
              <div key={code} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full ${meta.color}`} />
                <span className="text-sm text-gray-600">{meta.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
