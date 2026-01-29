'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Plus,
  Clock,
  Calendar,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Filter,
} from 'lucide-react'

interface OvertimeRequest {
  id: string
  employeeName: string
  employeeId: string
  department: string
  date: string
  startTime: string
  endTime: string
  hours: number
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  rate: number
  amount: number
}

const overtimeRequests: OvertimeRequest[] = [
  {
    id: '1',
    employeeName: 'أحمد محمد علي',
    employeeId: 'EMP001',
    department: 'تقنية المعلومات',
    date: '2024-01-25',
    startTime: '17:00',
    endTime: '21:00',
    hours: 4,
    reason: 'إنهاء مشروع عاجل',
    status: 'approved',
    rate: 1.5,
    amount: 450,
  },
  {
    id: '2',
    employeeName: 'سارة أحمد الخالدي',
    employeeId: 'EMP002',
    department: 'الموارد البشرية',
    date: '2024-01-24',
    startTime: '17:00',
    endTime: '19:00',
    hours: 2,
    reason: 'إعداد تقرير الرواتب',
    status: 'pending',
    rate: 1.5,
    amount: 200,
  },
  {
    id: '3',
    employeeName: 'عمر سالم الحربي',
    employeeId: 'EMP003',
    department: 'المبيعات',
    date: '2024-01-23',
    startTime: '17:00',
    endTime: '20:00',
    hours: 3,
    reason: 'اجتماع مع عميل',
    status: 'approved',
    rate: 1.5,
    amount: 300,
  },
  {
    id: '4',
    employeeName: 'فهد عبدالله السعيد',
    employeeId: 'EMP005',
    department: 'تقنية المعلومات',
    date: '2024-01-22',
    startTime: '17:00',
    endTime: '22:00',
    hours: 5,
    reason: 'صيانة الخوادم',
    status: 'rejected',
    rate: 2.0,
    amount: 750,
  },
]

const statusLabels = {
  pending: 'قيد الانتظار',
  approved: 'موافق عليه',
  rejected: 'مرفوض',
}

const statusColors = {
  pending: 'bg-warning-50 text-warning-700',
  approved: 'bg-success-50 text-success-700',
  rejected: 'bg-red-100 text-red-700',
}

export default function OvertimePage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const filteredRequests = overtimeRequests.filter((req) => {
    const matchesSearch = req.employeeName.includes(searchTerm)
    const matchesStatus = filterStatus === 'all' || req.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const stats = {
    totalHours: overtimeRequests.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.hours, 0),
    totalAmount: overtimeRequests.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.amount, 0),
    pending: overtimeRequests.filter(r => r.status === 'pending').length,
    approved: overtimeRequests.filter(r => r.status === 'approved').length,
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">العمل الإضافي</h1>
            <p className="text-gray-500 mt-1">إدارة طلبات وساعات العمل الإضافي</p>
          </div>
          <button className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            طلب عمل إضافي
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
              <Clock size={24} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي الساعات</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalHours}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
              <DollarSign size={24} className="text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي المبلغ</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalAmount} ر.س</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-warning-50 rounded-2xl flex items-center justify-center">
              <AlertCircle size={24} className="text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">قيد الانتظار</p>
              <p className="text-2xl font-bold text-gray-800">{stats.pending}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <CheckCircle2 size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">موافق عليها</p>
              <p className="text-2xl font-bold text-gray-800">{stats.approved}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="بحث عن موظف..."
                className="input pr-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input w-48"
            >
              <option value="all">كل الحالات</option>
              <option value="pending">قيد الانتظار</option>
              <option value="approved">موافق عليه</option>
              <option value="rejected">مرفوض</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الموظف</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">التاريخ</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الوقت</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">الساعات</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">السبب</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">المعدل</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">المبلغ</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">الحالة</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <p className="font-medium text-gray-800">{req.employeeName}</p>
                    <p className="text-sm text-gray-500">{req.department}</p>
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    {new Date(req.date).toLocaleDateString('ar-SA')}
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    {req.startTime} - {req.endTime}
                  </td>
                  <td className="px-4 py-4 text-center font-medium text-gray-800">{req.hours}h</td>
                  <td className="px-4 py-4 text-gray-600 max-w-xs truncate">{req.reason}</td>
                  <td className="px-4 py-4 text-center text-gray-600">x{req.rate}</td>
                  <td className="px-4 py-4 text-center font-medium text-gray-800">{req.amount} ر.س</td>
                  <td className="px-4 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[req.status]}`}>
                      {statusLabels[req.status]}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {req.status === 'pending' && (
                      <div className="flex items-center justify-center gap-2">
                        <button className="p-2 bg-success-50 rounded-lg hover:bg-success-100">
                          <CheckCircle2 size={16} className="text-success-600" />
                        </button>
                        <button className="p-2 bg-red-50 rounded-lg hover:bg-red-100">
                          <XCircle size={16} className="text-red-600" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  )
}
