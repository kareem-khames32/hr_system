'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Filter,
  Plus,
  Download,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react'
import Link from 'next/link'

interface LeaveRequest {
  id: string
  employeeId: string
  employeeName: string
  avatar: string
  department: string
  leaveType: string
  leaveTypeColor: string
  startDate: string
  endDate: string
  days: number
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  submittedDate: string
  approvedBy?: string
  approvedDate?: string
}

const leaveRequests: LeaveRequest[] = [
  {
    id: '1',
    employeeId: 'EMP001',
    employeeName: 'أحمد محمد علي',
    avatar: 'أ',
    department: 'تقنية المعلومات',
    leaveType: 'إجازة سنوية',
    leaveTypeColor: 'bg-primary-500',
    startDate: '2026/02/01',
    endDate: '2026/02/05',
    days: 5,
    reason: 'إجازة عائلية',
    status: 'pending',
    submittedDate: '2026/01/28',
  },
  {
    id: '2',
    employeeId: 'EMP002',
    employeeName: 'سارة أحمد الخالدي',
    avatar: 'س',
    department: 'الموارد البشرية',
    leaveType: 'إجازة مرضية',
    leaveTypeColor: 'bg-danger-500',
    startDate: '2026/01/27',
    endDate: '2026/01/28',
    days: 2,
    reason: 'مراجعة طبية',
    status: 'approved',
    submittedDate: '2026/01/26',
    approvedBy: 'محمد سالم',
    approvedDate: '2026/01/26',
  },
  {
    id: '3',
    employeeId: 'EMP003',
    employeeName: 'محمد خالد السعيد',
    avatar: 'م',
    department: 'المبيعات',
    leaveType: 'إجازة سنوية',
    leaveTypeColor: 'bg-primary-500',
    startDate: '2026/02/15',
    endDate: '2026/02/25',
    days: 10,
    reason: 'سفر خارج المملكة',
    status: 'pending',
    submittedDate: '2026/01/25',
  },
  {
    id: '4',
    employeeId: 'EMP004',
    employeeName: 'فاطمة علي الزهراني',
    avatar: 'ف',
    department: 'المحاسبة',
    leaveType: 'إجازة طارئة',
    leaveTypeColor: 'bg-warning-500',
    startDate: '2026/01/29',
    endDate: '2026/01/29',
    days: 1,
    reason: 'ظرف عائلي طارئ',
    status: 'approved',
    submittedDate: '2026/01/29',
    approvedBy: 'سارة أحمد',
    approvedDate: '2026/01/29',
  },
  {
    id: '5',
    employeeId: 'EMP005',
    employeeName: 'عمر سالم الحربي',
    avatar: 'ع',
    department: 'التسويق',
    leaveType: 'إجازة سنوية',
    leaveTypeColor: 'bg-primary-500',
    startDate: '2026/01/20',
    endDate: '2026/01/24',
    days: 5,
    reason: 'إجازة شخصية',
    status: 'rejected',
    submittedDate: '2026/01/15',
    approvedBy: 'أحمد محمد',
    approvedDate: '2026/01/16',
  },
  {
    id: '6',
    employeeId: 'EMP006',
    employeeName: 'نورة محمد العتيبي',
    avatar: 'ن',
    department: 'خدمة العملاء',
    leaveType: 'إجازة زواج',
    leaveTypeColor: 'bg-pink-500',
    startDate: '2026/03/01',
    endDate: '2026/03/05',
    days: 5,
    reason: 'إجازة زواج',
    status: 'pending',
    submittedDate: '2026/01/28',
  },
]

const getStatusBadge = (status: LeaveRequest['status']) => {
  switch (status) {
    case 'pending':
      return (
        <span className="badge badge-warning flex items-center gap-1">
          <AlertCircle size={12} />
          في الانتظار
        </span>
      )
    case 'approved':
      return (
        <span className="badge badge-success flex items-center gap-1">
          <CheckCircle size={12} />
          موافق عليه
        </span>
      )
    case 'rejected':
      return (
        <span className="badge badge-danger flex items-center gap-1">
          <XCircle size={12} />
          مرفوض
        </span>
      )
    case 'cancelled':
      return (
        <span className="badge bg-gray-100 text-gray-600 flex items-center gap-1">
          <XCircle size={12} />
          ملغي
        </span>
      )
  }
}

export default function LeavesPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState('all')

  const filteredRequests = leaveRequests.filter((req) => {
    if (activeTab !== 'all' && req.status !== activeTab) return false
    if (
      searchQuery &&
      !req.employeeName.includes(searchQuery) &&
      !req.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false
    if (selectedType !== 'all' && req.leaveType !== selectedType) return false
    return true
  })

  const stats = {
    all: leaveRequests.length,
    pending: leaveRequests.filter((r) => r.status === 'pending').length,
    approved: leaveRequests.filter((r) => r.status === 'approved').length,
    rejected: leaveRequests.filter((r) => r.status === 'rejected').length,
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">طلبات الإجازات</h1>
            <p className="text-gray-500 mt-1">إدارة طلبات إجازات الموظفين</p>
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
                <p className="text-sm text-gray-500">كل الطلبات</p>
                <p className="text-3xl font-bold text-gray-800">{stats.all}</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('pending')}
            className={`card text-right transition-all ${
              activeTab === 'pending' ? 'ring-2 ring-warning-500' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-warning-50 rounded-2xl flex items-center justify-center">
                <AlertCircle size={24} className="text-warning-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">في الانتظار</p>
                <p className="text-3xl font-bold text-warning-600">{stats.pending}</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('approved')}
            className={`card text-right transition-all ${
              activeTab === 'approved' ? 'ring-2 ring-success-500' : ''
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
            onClick={() => setActiveTab('rejected')}
            className={`card text-right transition-all ${
              activeTab === 'rejected' ? 'ring-2 ring-danger-500' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-danger-50 rounded-2xl flex items-center justify-center">
                <XCircle size={24} className="text-danger-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">مرفوضة</p>
                <p className="text-3xl font-bold text-danger-600">{stats.rejected}</p>
              </div>
            </div>
          </button>
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
              <option value="إجازة سنوية">إجازة سنوية</option>
              <option value="إجازة مرضية">إجازة مرضية</option>
              <option value="إجازة طارئة">إجازة طارئة</option>
              <option value="إجازة زواج">إجازة زواج</option>
              <option value="إجازة وفاة">إجازة وفاة</option>
            </select>

            {/* Date Range */}
            <div className="flex items-center gap-2">
              <input type="date" className="input w-40" />
              <span className="text-gray-400">إلى</span>
              <input type="date" className="input w-40" />
            </div>
          </div>
        </div>

        {/* Leave Requests Table */}
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="text-right px-4 py-4">الموظف</th>
                  <th className="text-right px-4 py-4">نوع الإجازة</th>
                  <th className="text-center px-4 py-4">من</th>
                  <th className="text-center px-4 py-4">إلى</th>
                  <th className="text-center px-4 py-4">الأيام</th>
                  <th className="text-right px-4 py-4">السبب</th>
                  <th className="text-center px-4 py-4">الحالة</th>
                  <th className="text-center px-4 py-4">الإجراءات</th>
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
                          <p className="text-sm text-gray-400">{request.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${request.leaveTypeColor}`} />
                        <span className="text-gray-700">{request.leaveType}</span>
                      </div>
                    </td>
                    <td className="table-cell text-center text-gray-600">{request.startDate}</td>
                    <td className="table-cell text-center text-gray-600">{request.endDate}</td>
                    <td className="table-cell text-center">
                      <span className="font-bold text-primary-600">{request.days} يوم</span>
                    </td>
                    <td className="table-cell text-gray-600 max-w-[200px] truncate">
                      {request.reason}
                    </td>
                    <td className="table-cell text-center">{getStatusBadge(request.status)}</td>
                    <td className="table-cell">
                      <div className="flex items-center justify-center gap-1">
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                          <Eye size={18} className="text-gray-500" />
                        </button>
                        {request.status === 'pending' && (
                          <>
                            <button className="p-2 bg-success-50 hover:bg-success-100 rounded-lg transition-colors">
                              <Check size={18} className="text-success-600" />
                            </button>
                            <button className="p-2 bg-danger-50 hover:bg-danger-100 rounded-lg transition-colors">
                              <X size={18} className="text-danger-600" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
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

        {/* Leave Types Legend */}
        <div className="card">
          <h3 className="text-sm font-bold text-gray-700 mb-4">أنواع الإجازات</h3>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-primary-500" />
              <span className="text-sm text-gray-600">إجازة سنوية (30 يوم)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-danger-500" />
              <span className="text-sm text-gray-600">إجازة مرضية (30 يوم)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-warning-500" />
              <span className="text-sm text-gray-600">إجازة طارئة (6 أيام)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-pink-500" />
              <span className="text-sm text-gray-600">إجازة زواج (5 أيام)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gray-500" />
              <span className="text-sm text-gray-600">إجازة وفاة (5 أيام)</span>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
