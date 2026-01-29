'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  UserCheck,
  UserX,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Camera,
  CheckCircle,
  XCircle,
  Timer,
} from 'lucide-react'

interface AttendanceRecord {
  id: string
  employeeId: string
  employeeName: string
  avatar: string
  department: string
  date: string
  checkIn: string | null
  checkOut: string | null
  workHours: string | null
  status: 'present' | 'absent' | 'late' | 'early_leave' | 'on_leave' | 'holiday'
  location: string
  verificationMethod: 'face' | 'fingerprint' | 'card' | 'manual'
}

const attendanceRecords: AttendanceRecord[] = [
  {
    id: '1',
    employeeId: 'EMP001',
    employeeName: 'أحمد محمد علي',
    avatar: 'أ',
    department: 'تقنية المعلومات',
    date: '2026/01/29',
    checkIn: '08:05',
    checkOut: '17:15',
    workHours: '9:10',
    status: 'present',
    location: 'المكتب الرئيسي',
    verificationMethod: 'face',
  },
  {
    id: '2',
    employeeId: 'EMP002',
    employeeName: 'سارة أحمد الخالدي',
    avatar: 'س',
    department: 'الموارد البشرية',
    date: '2026/01/29',
    checkIn: '08:45',
    checkOut: '17:00',
    workHours: '8:15',
    status: 'late',
    location: 'المكتب الرئيسي',
    verificationMethod: 'face',
  },
  {
    id: '3',
    employeeId: 'EMP003',
    employeeName: 'محمد خالد السعيد',
    avatar: 'م',
    department: 'المبيعات',
    date: '2026/01/29',
    checkIn: null,
    checkOut: null,
    workHours: null,
    status: 'absent',
    location: '-',
    verificationMethod: 'manual',
  },
  {
    id: '4',
    employeeId: 'EMP004',
    employeeName: 'فاطمة علي الزهراني',
    avatar: 'ف',
    department: 'المحاسبة',
    date: '2026/01/29',
    checkIn: '07:55',
    checkOut: '15:30',
    workHours: '7:35',
    status: 'early_leave',
    location: 'المكتب الرئيسي',
    verificationMethod: 'fingerprint',
  },
  {
    id: '5',
    employeeId: 'EMP005',
    employeeName: 'عمر سالم الحربي',
    avatar: 'ع',
    department: 'التسويق',
    date: '2026/01/29',
    checkIn: null,
    checkOut: null,
    workHours: null,
    status: 'on_leave',
    location: '-',
    verificationMethod: 'manual',
  },
  {
    id: '6',
    employeeId: 'EMP006',
    employeeName: 'نورة محمد العتيبي',
    avatar: 'ن',
    department: 'خدمة العملاء',
    date: '2026/01/29',
    checkIn: '07:58',
    checkOut: '17:05',
    workHours: '9:07',
    status: 'present',
    location: 'فرع الدمام',
    verificationMethod: 'face',
  },
  {
    id: '7',
    employeeId: 'EMP007',
    employeeName: 'خالد عبدالله القحطاني',
    avatar: 'خ',
    department: 'العمليات',
    date: '2026/01/29',
    checkIn: '08:02',
    checkOut: null,
    workHours: null,
    status: 'present',
    location: 'المكتب الرئيسي',
    verificationMethod: 'card',
  },
  {
    id: '8',
    employeeId: 'EMP008',
    employeeName: 'ريم سعود الدوسري',
    avatar: 'ر',
    department: 'تقنية المعلومات',
    date: '2026/01/29',
    checkIn: '09:30',
    checkOut: null,
    workHours: null,
    status: 'late',
    location: 'عن بُعد',
    verificationMethod: 'face',
  },
]

const getStatusBadge = (status: AttendanceRecord['status']) => {
  switch (status) {
    case 'present':
      return (
        <span className="badge badge-success flex items-center gap-1">
          <CheckCircle size={12} />
          حاضر
        </span>
      )
    case 'absent':
      return (
        <span className="badge badge-danger flex items-center gap-1">
          <XCircle size={12} />
          غائب
        </span>
      )
    case 'late':
      return (
        <span className="badge badge-warning flex items-center gap-1">
          <AlertTriangle size={12} />
          متأخر
        </span>
      )
    case 'early_leave':
      return (
        <span className="badge bg-orange-50 text-orange-600 flex items-center gap-1">
          <Timer size={12} />
          خروج مبكر
        </span>
      )
    case 'on_leave':
      return (
        <span className="badge badge-primary flex items-center gap-1">
          <Calendar size={12} />
          في إجازة
        </span>
      )
    case 'holiday':
      return (
        <span className="badge bg-purple-50 text-purple-600 flex items-center gap-1">
          <Calendar size={12} />
          عطلة
        </span>
      )
  }
}

const getVerificationIcon = (method: AttendanceRecord['verificationMethod']) => {
  switch (method) {
    case 'face':
      return <Camera size={16} className="text-primary-500" />
    case 'fingerprint':
      return <span className="text-success-500">👆</span>
    case 'card':
      return <span className="text-warning-500">💳</span>
    case 'manual':
      return <span className="text-gray-400">✏️</span>
  }
}

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState('2026-01-29')
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Stats
  const stats = {
    total: 248,
    present: 215,
    absent: 5,
    late: 10,
    onLeave: 18,
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">سجل الحضور والانصراف</h1>
            <p className="text-gray-500 mt-1">متابعة حضور وانصراف الموظفين</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-secondary flex items-center gap-2">
              <Download size={18} />
              تصدير
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
              <UserCheck size={24} className="text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">الإجمالي</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
              <CheckCircle size={24} className="text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">حاضر</p>
              <p className="text-2xl font-bold text-success-600">{stats.present}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-danger-50 rounded-2xl flex items-center justify-center">
              <XCircle size={24} className="text-danger-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">غائب</p>
              <p className="text-2xl font-bold text-danger-600">{stats.absent}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-warning-50 rounded-2xl flex items-center justify-center">
              <AlertTriangle size={24} className="text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">متأخر</p>
              <p className="text-2xl font-bold text-warning-600">{stats.late}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
              <Calendar size={24} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">في إجازة</p>
              <p className="text-2xl font-bold text-primary-600">{stats.onLeave}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex flex-wrap items-center gap-4">
            {/* Date Picker */}
            <div className="flex items-center gap-2">
              <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                <ChevronRight size={18} />
              </button>
              <div className="relative">
                <Calendar size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="input pr-10 w-44"
                />
              </div>
              <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                <ChevronLeft size={18} />
              </button>
              <button className="btn-secondary text-sm py-2">اليوم</button>
            </div>

            {/* Search */}
            <div className="flex-1 min-w-[250px]">
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

            {/* Department Filter */}
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="input w-44"
            >
              <option value="all">كل الأقسام</option>
              <option value="it">تقنية المعلومات</option>
              <option value="hr">الموارد البشرية</option>
              <option value="sales">المبيعات</option>
              <option value="finance">المحاسبة</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="input w-36"
            >
              <option value="all">كل الحالات</option>
              <option value="present">حاضر</option>
              <option value="absent">غائب</option>
              <option value="late">متأخر</option>
              <option value="on_leave">في إجازة</option>
            </select>
          </div>
        </div>

        {/* Attendance Table */}
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="text-right px-4 py-4">الموظف</th>
                  <th className="text-right px-4 py-4">القسم</th>
                  <th className="text-center px-4 py-4">الحضور</th>
                  <th className="text-center px-4 py-4">الانصراف</th>
                  <th className="text-center px-4 py-4">ساعات العمل</th>
                  <th className="text-center px-4 py-4">الحالة</th>
                  <th className="text-center px-4 py-4">الموقع</th>
                  <th className="text-center px-4 py-4">التحقق</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((record) => (
                  <tr key={record.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold">
                          {record.avatar}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{record.employeeName}</p>
                          <p className="text-sm text-gray-400 font-mono">{record.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell text-gray-600">{record.department}</td>
                    <td className="table-cell text-center">
                      {record.checkIn ? (
                        <span className="font-mono text-success-600 font-medium">{record.checkIn}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="table-cell text-center">
                      {record.checkOut ? (
                        <span className="font-mono text-danger-600 font-medium">{record.checkOut}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="table-cell text-center">
                      {record.workHours ? (
                        <span className="font-mono text-gray-700">{record.workHours}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="table-cell text-center">{getStatusBadge(record.status)}</td>
                    <td className="table-cell text-center">
                      <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                        <MapPin size={14} className="text-gray-400" />
                        {record.location}
                      </div>
                    </td>
                    <td className="table-cell text-center">
                      <div className="flex items-center justify-center">
                        {getVerificationIcon(record.verificationMethod)}
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
              عرض <span className="font-medium text-gray-700">1-8</span> من{' '}
              <span className="font-medium text-gray-700">248</span> سجل
            </p>
            <div className="flex items-center gap-2">
              <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                <ChevronRight size={18} />
              </button>
              <button className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium">
                1
              </button>
              <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
                2
              </button>
              <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
                3
              </button>
              <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                <ChevronLeft size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="card">
          <div className="flex items-center gap-8">
            <span className="text-sm font-medium text-gray-600">طرق التحقق:</span>
            <div className="flex items-center gap-2">
              <Camera size={16} className="text-primary-500" />
              <span className="text-sm text-gray-600">التعرف على الوجه</span>
            </div>
            <div className="flex items-center gap-2">
              <span>👆</span>
              <span className="text-sm text-gray-600">البصمة</span>
            </div>
            <div className="flex items-center gap-2">
              <span>💳</span>
              <span className="text-sm text-gray-600">البطاقة</span>
            </div>
            <div className="flex items-center gap-2">
              <span>✏️</span>
              <span className="text-sm text-gray-600">إدخال يدوي</span>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
