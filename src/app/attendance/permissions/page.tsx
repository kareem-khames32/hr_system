'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  LogOut,
  LogIn,
  Timer,
  Briefcase,
  Calendar,
} from 'lucide-react'

interface PermissionRequest {
  id: string
  employeeId: string
  employeeName: string
  avatar: string
  department: string
  permissionType: 'early_leave' | 'late_arrival' | 'mid_day' | 'work_assignment'
  date: string
  fromTime: string
  toTime: string
  hours: number
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  submittedDate: string
  approvedBy?: string
}

const permissionRequests: PermissionRequest[] = [
  {
    id: '1',
    employeeId: 'EMP001',
    employeeName: 'أحمد محمد علي',
    avatar: 'أ',
    department: 'تقنية المعلومات',
    permissionType: 'early_leave',
    date: '2026/01/29',
    fromTime: '15:00',
    toTime: '17:00',
    hours: 2,
    reason: 'موعد طبي',
    status: 'pending',
    submittedDate: '2026/01/28',
  },
  {
    id: '2',
    employeeId: 'EMP003',
    employeeName: 'محمد خالد السعيد',
    avatar: 'م',
    department: 'المبيعات',
    permissionType: 'late_arrival',
    date: '2026/01/30',
    fromTime: '08:00',
    toTime: '10:00',
    hours: 2,
    reason: 'مراجعة جهة حكومية',
    status: 'pending',
    submittedDate: '2026/01/29',
  },
  {
    id: '3',
    employeeId: 'EMP002',
    employeeName: 'سارة أحمد الخالدي',
    avatar: 'س',
    department: 'الموارد البشرية',
    permissionType: 'mid_day',
    date: '2026/01/28',
    fromTime: '12:00',
    toTime: '14:00',
    hours: 2,
    reason: 'استلام أوراق من المدرسة',
    status: 'approved',
    submittedDate: '2026/01/27',
    approvedBy: 'محمد سالم',
  },
  {
    id: '4',
    employeeId: 'EMP005',
    employeeName: 'عمر سالم الحربي',
    avatar: 'ع',
    department: 'التسويق',
    permissionType: 'work_assignment',
    date: '2026/01/29',
    fromTime: '09:00',
    toTime: '13:00',
    hours: 4,
    reason: 'زيارة عميل',
    status: 'approved',
    submittedDate: '2026/01/28',
    approvedBy: 'أحمد محمد',
  },
  {
    id: '5',
    employeeId: 'EMP006',
    employeeName: 'نورة محمد العتيبي',
    avatar: 'ن',
    department: 'خدمة العملاء',
    permissionType: 'early_leave',
    date: '2026/01/27',
    fromTime: '14:00',
    toTime: '17:00',
    hours: 3,
    reason: 'ظرف عائلي',
    status: 'rejected',
    submittedDate: '2026/01/26',
    approvedBy: 'سارة أحمد',
  },
]

const getPermissionTypeBadge = (type: PermissionRequest['permissionType']) => {
  switch (type) {
    case 'early_leave':
      return (
        <span className="badge bg-orange-50 text-orange-600 flex items-center gap-1">
          <LogOut size={12} />
          خروج مبكر
        </span>
      )
    case 'late_arrival':
      return (
        <span className="badge badge-warning flex items-center gap-1">
          <LogIn size={12} />
          دخول متأخر
        </span>
      )
    case 'mid_day':
      return (
        <span className="badge badge-primary flex items-center gap-1">
          <Timer size={12} />
          خروج أثناء الدوام
        </span>
      )
    case 'work_assignment':
      return (
        <span className="badge badge-success flex items-center gap-1">
          <Briefcase size={12} />
          مهمة عمل
        </span>
      )
  }
}

const getStatusBadge = (status: PermissionRequest['status']) => {
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
  }
}

export default function PermissionsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState('all')

  const stats = {
    all: permissionRequests.length,
    pending: permissionRequests.filter((p) => p.status === 'pending').length,
    approved: permissionRequests.filter((p) => p.status === 'approved').length,
    rejected: permissionRequests.filter((p) => p.status === 'rejected').length,
    totalHours: permissionRequests.filter((p) => p.status === 'approved').reduce((sum, p) => sum + p.hours, 0),
  }

  const filteredRequests = permissionRequests.filter((req) => {
    if (activeTab !== 'all' && req.status !== activeTab) return false
    if (selectedType !== 'all' && req.permissionType !== selectedType) return false
    if (
      searchQuery &&
      !req.employeeName.includes(searchQuery) &&
      !req.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
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
          <button className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            طلب إذن جديد
          </button>
        </div>

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
                <p className="text-sm text-gray-500">في الانتظار</p>
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
                <p className="text-sm text-gray-500">موافق عليها</p>
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

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="input w-48"
            >
              <option value="all">كل الأنواع</option>
              <option value="early_leave">خروج مبكر</option>
              <option value="late_arrival">دخول متأخر</option>
              <option value="mid_day">خروج أثناء الدوام</option>
              <option value="work_assignment">مهمة عمل</option>
            </select>

            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-gray-400" />
              <input type="date" className="input w-40" />
            </div>
          </div>
        </div>

        {/* Permissions Table */}
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="text-right px-4 py-4">الموظف</th>
                  <th className="text-center px-4 py-4">نوع الإذن</th>
                  <th className="text-center px-4 py-4">التاريخ</th>
                  <th className="text-center px-4 py-4">من</th>
                  <th className="text-center px-4 py-4">إلى</th>
                  <th className="text-center px-4 py-4">المدة</th>
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
                    <td className="table-cell text-center">{getPermissionTypeBadge(request.permissionType)}</td>
                    <td className="table-cell text-center text-gray-600">{request.date}</td>
                    <td className="table-cell text-center font-mono text-success-600">{request.fromTime}</td>
                    <td className="table-cell text-center font-mono text-danger-600">{request.toTime}</td>
                    <td className="table-cell text-center">
                      <span className="font-bold text-primary-600">{request.hours} ساعة</span>
                    </td>
                    <td className="table-cell text-gray-600 max-w-[200px] truncate">{request.reason}</td>
                    <td className="table-cell text-center">{getStatusBadge(request.status)}</td>
                    <td className="table-cell">
                      <div className="flex items-center justify-center gap-1">
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                          <Eye size={18} className="text-gray-500" />
                        </button>
                        {request.status === 'pending' && (
                          <>
                            <button className="p-2 bg-success-50 hover:bg-success-100 rounded-lg transition-colors">
                              <CheckCircle size={18} className="text-success-600" />
                            </button>
                            <button className="p-2 bg-danger-50 hover:bg-danger-100 rounded-lg transition-colors">
                              <XCircle size={18} className="text-danger-600" />
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
