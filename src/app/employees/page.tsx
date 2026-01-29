'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Filter,
  Plus,
  Download,
  Upload,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Mail,
  Phone,
  Building2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'

interface Employee {
  id: string
  employeeId: string
  name: string
  nameEn: string
  avatar: string
  email: string
  phone: string
  department: string
  jobTitle: string
  status: 'active' | 'probation' | 'suspended' | 'resigned'
  joinDate: string
  branch: string
}

const employees: Employee[] = [
  {
    id: '1',
    employeeId: 'EMP001',
    name: 'أحمد محمد علي',
    nameEn: 'Ahmed Mohammed Ali',
    avatar: 'أ',
    email: 'ahmed.m@company.com',
    phone: '+966 50 123 4567',
    department: 'تقنية المعلومات',
    jobTitle: 'مدير تقنية المعلومات',
    status: 'active',
    joinDate: '2020/03/15',
    branch: 'الرياض',
  },
  {
    id: '2',
    employeeId: 'EMP002',
    name: 'سارة أحمد الخالدي',
    nameEn: 'Sara Ahmed Alkhaldi',
    avatar: 'س',
    email: 'sara.a@company.com',
    phone: '+966 55 234 5678',
    department: 'الموارد البشرية',
    jobTitle: 'أخصائي موارد بشرية',
    status: 'active',
    joinDate: '2021/07/01',
    branch: 'الرياض',
  },
  {
    id: '3',
    employeeId: 'EMP003',
    name: 'محمد خالد السعيد',
    nameEn: 'Mohammed Khaled Alsaeed',
    avatar: 'م',
    email: 'mohammed.k@company.com',
    phone: '+966 54 345 6789',
    department: 'المبيعات',
    jobTitle: 'مندوب مبيعات أول',
    status: 'active',
    joinDate: '2019/11/20',
    branch: 'جدة',
  },
  {
    id: '4',
    employeeId: 'EMP004',
    name: 'فاطمة علي الزهراني',
    nameEn: 'Fatima Ali Alzahrani',
    avatar: 'ف',
    email: 'fatima.a@company.com',
    phone: '+966 56 456 7890',
    department: 'المحاسبة',
    jobTitle: 'محاسب',
    status: 'probation',
    joinDate: '2025/12/01',
    branch: 'الرياض',
  },
  {
    id: '5',
    employeeId: 'EMP005',
    name: 'عمر سالم الحربي',
    nameEn: 'Omar Salem Alharbi',
    avatar: 'ع',
    email: 'omar.s@company.com',
    phone: '+966 50 567 8901',
    department: 'التسويق',
    jobTitle: 'مدير التسويق',
    status: 'active',
    joinDate: '2018/05/10',
    branch: 'الرياض',
  },
  {
    id: '6',
    employeeId: 'EMP006',
    name: 'نورة محمد العتيبي',
    nameEn: 'Noura Mohammed Alotaibi',
    avatar: 'ن',
    email: 'noura.m@company.com',
    phone: '+966 55 678 9012',
    department: 'خدمة العملاء',
    jobTitle: 'مشرف خدمة العملاء',
    status: 'active',
    joinDate: '2022/02/15',
    branch: 'الدمام',
  },
  {
    id: '7',
    employeeId: 'EMP007',
    name: 'خالد عبدالله القحطاني',
    nameEn: 'Khaled Abdullah Alqahtani',
    avatar: 'خ',
    email: 'khaled.a@company.com',
    phone: '+966 54 789 0123',
    department: 'العمليات',
    jobTitle: 'مدير العمليات',
    status: 'suspended',
    joinDate: '2017/09/01',
    branch: 'الرياض',
  },
  {
    id: '8',
    employeeId: 'EMP008',
    name: 'ريم سعود الدوسري',
    nameEn: 'Reem Saud Aldosari',
    avatar: 'ر',
    email: 'reem.s@company.com',
    phone: '+966 56 890 1234',
    department: 'تقنية المعلومات',
    jobTitle: 'مطور برمجيات',
    status: 'active',
    joinDate: '2023/04/20',
    branch: 'الرياض',
  },
]

const getStatusBadge = (status: Employee['status']) => {
  switch (status) {
    case 'active':
      return <span className="badge badge-success">نشط</span>
    case 'probation':
      return <span className="badge badge-warning">فترة تجربة</span>
    case 'suspended':
      return <span className="badge badge-danger">موقوف</span>
    case 'resigned':
      return <span className="badge bg-gray-100 text-gray-600">مستقيل</span>
  }
}

export default function EmployeesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.includes(searchQuery) ||
      emp.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesDepartment =
      selectedDepartment === 'all' || emp.department === selectedDepartment

    const matchesStatus = selectedStatus === 'all' || emp.status === selectedStatus

    return matchesSearch && matchesDepartment && matchesStatus
  })

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">قائمة الموظفين</h1>
            <p className="text-gray-500 mt-1">إدارة بيانات الموظفين في الشركة</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-secondary flex items-center gap-2">
              <Upload size={18} />
              استيراد
            </button>
            <button className="btn-secondary flex items-center gap-2">
              <Download size={18} />
              تصدير
            </button>
            <Link href="/employees/add" className="btn-primary flex items-center gap-2">
              <Plus size={18} />
              إضافة موظف
            </Link>
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
                  placeholder="بحث بالاسم، الرقم الوظيفي، البريد..."
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
              className="input w-48"
            >
              <option value="all">كل الأقسام</option>
              <option value="تقنية المعلومات">تقنية المعلومات</option>
              <option value="الموارد البشرية">الموارد البشرية</option>
              <option value="المبيعات">المبيعات</option>
              <option value="المحاسبة">المحاسبة</option>
              <option value="التسويق">التسويق</option>
              <option value="خدمة العملاء">خدمة العملاء</option>
              <option value="العمليات">العمليات</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="input w-40"
            >
              <option value="all">كل الحالات</option>
              <option value="active">نشط</option>
              <option value="probation">فترة تجربة</option>
              <option value="suspended">موقوف</option>
              <option value="resigned">مستقيل</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                جدول
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                بطاقات
              </button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            عرض <span className="font-medium text-gray-700">{filteredEmployees.length}</span> من{' '}
            <span className="font-medium text-gray-700">{employees.length}</span> موظف
          </p>
        </div>

        {/* Table View */}
        {viewMode === 'table' ? (
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th className="text-right px-4 py-4">الموظف</th>
                    <th className="text-right px-4 py-4">الرقم الوظيفي</th>
                    <th className="text-right px-4 py-4">القسم</th>
                    <th className="text-right px-4 py-4">المسمى الوظيفي</th>
                    <th className="text-right px-4 py-4">الفرع</th>
                    <th className="text-right px-4 py-4">تاريخ التعيين</th>
                    <th className="text-right px-4 py-4">الحالة</th>
                    <th className="text-center px-4 py-4">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee) => (
                    <tr key={employee.id} className="table-row">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold">
                            {employee.avatar}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{employee.name}</p>
                            <p className="text-sm text-gray-400">{employee.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell font-mono text-primary-600">
                        {employee.employeeId}
                      </td>
                      <td className="table-cell">{employee.department}</td>
                      <td className="table-cell">{employee.jobTitle}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1.5">
                          <Building2 size={14} className="text-gray-400" />
                          {employee.branch}
                        </div>
                      </td>
                      <td className="table-cell text-gray-500">{employee.joinDate}</td>
                      <td className="table-cell">{getStatusBadge(employee.status)}</td>
                      <td className="table-cell">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            href={`/employees/${employee.id}`}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Eye size={18} className="text-gray-500" />
                          </Link>
                          <Link
                            href={`/employees/${employee.id}/edit`}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Edit size={18} className="text-gray-500" />
                          </Link>
                          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <MoreVertical size={18} className="text-gray-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">صفحة 1 من 1</p>
              <div className="flex items-center gap-2">
                <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50" disabled>
                  <ChevronRight size={18} />
                </button>
                <button className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium">
                  1
                </button>
                <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50" disabled>
                  <ChevronLeft size={18} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredEmployees.map((employee) => (
              <div key={employee.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl">
                    {employee.avatar}
                  </div>
                  {getStatusBadge(employee.status)}
                </div>
                <h3 className="font-bold text-gray-800">{employee.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{employee.jobTitle}</p>
                <p className="text-xs text-primary-600 font-mono mt-1">{employee.employeeId}</p>

                <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Building2 size={14} />
                    <span>{employee.department} - {employee.branch}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Mail size={14} />
                    <span className="truncate">{employee.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Phone size={14} />
                    <span dir="ltr">{employee.phone}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <Link
                    href={`/employees/${employee.id}`}
                    className="flex-1 btn-secondary text-center text-sm py-2"
                  >
                    عرض
                  </Link>
                  <Link
                    href={`/employees/${employee.id}/edit`}
                    className="flex-1 btn-primary text-center text-sm py-2"
                  >
                    تعديل
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
