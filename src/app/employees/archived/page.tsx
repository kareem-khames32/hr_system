'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Filter,
  Download,
  UserX,
  Calendar,
  Building2,
  RefreshCw,
  Eye,
  Trash2,
  FileText,
} from 'lucide-react'
import Link from 'next/link'

interface ArchivedEmployee {
  id: string
  name: string
  avatar: string
  employeeId: string
  department: string
  position: string
  joinDate: string
  endDate: string
  reason: 'resignation' | 'termination' | 'retirement' | 'contract_end'
  yearsOfService: number
}

const archivedEmployees: ArchivedEmployee[] = [
  {
    id: '1',
    name: 'خالد عبدالله المطيري',
    avatar: 'خ',
    employeeId: 'EMP045',
    department: 'المبيعات',
    position: 'مدير مبيعات',
    joinDate: '2018-03-15',
    endDate: '2024-01-15',
    reason: 'resignation',
    yearsOfService: 6,
  },
  {
    id: '2',
    name: 'منى سعيد الغامدي',
    avatar: 'م',
    employeeId: 'EMP032',
    department: 'التسويق',
    position: 'أخصائي تسويق',
    joinDate: '2020-06-01',
    endDate: '2023-12-31',
    reason: 'contract_end',
    yearsOfService: 3,
  },
  {
    id: '3',
    name: 'عبدالرحمن محمد السالم',
    avatar: 'ع',
    employeeId: 'EMP012',
    department: 'المالية',
    position: 'محاسب أول',
    joinDate: '2010-01-10',
    endDate: '2023-11-30',
    reason: 'retirement',
    yearsOfService: 13,
  },
  {
    id: '4',
    name: 'ليلى أحمد العمري',
    avatar: 'ل',
    employeeId: 'EMP078',
    department: 'تقنية المعلومات',
    position: 'مطور برمجيات',
    joinDate: '2021-09-01',
    endDate: '2023-10-15',
    reason: 'termination',
    yearsOfService: 2,
  },
]

const reasonLabels = {
  resignation: 'استقالة',
  termination: 'إنهاء خدمات',
  retirement: 'تقاعد',
  contract_end: 'انتهاء العقد',
}

const reasonColors = {
  resignation: 'bg-blue-100 text-blue-700',
  termination: 'bg-red-100 text-red-700',
  retirement: 'bg-purple-100 text-purple-700',
  contract_end: 'bg-warning-50 text-warning-700',
}

export default function ArchivedEmployeesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterReason, setFilterReason] = useState('all')

  const filteredEmployees = archivedEmployees.filter((emp) => {
    const matchesSearch =
      emp.name.includes(searchTerm) || emp.employeeId.includes(searchTerm)
    const matchesReason = filterReason === 'all' || emp.reason === filterReason
    return matchesSearch && matchesReason
  })

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">أرشيف الموظفين</h1>
            <p className="text-gray-500 mt-1">الموظفين المنتهية خدماتهم</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/employees" className="btn-secondary flex items-center gap-2">
              <RefreshCw size={18} />
              الموظفين الحاليين
            </Link>
            <button className="btn-primary flex items-center gap-2">
              <Download size={18} />
              تصدير
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
              <UserX size={24} className="text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي المؤرشفين</p>
              <p className="text-2xl font-bold text-gray-800">{archivedEmployees.length}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <FileText size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">استقالات</p>
              <p className="text-2xl font-bold text-gray-800">
                {archivedEmployees.filter((e) => e.reason === 'resignation').length}
              </p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
              <Calendar size={24} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">تقاعد</p>
              <p className="text-2xl font-bold text-gray-800">
                {archivedEmployees.filter((e) => e.reason === 'retirement').length}
              </p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-warning-50 rounded-2xl flex items-center justify-center">
              <Building2 size={24} className="text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">انتهاء عقد</p>
              <p className="text-2xl font-bold text-gray-800">
                {archivedEmployees.filter((e) => e.reason === 'contract_end').length}
              </p>
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
              value={filterReason}
              onChange={(e) => setFilterReason(e.target.value)}
              className="input w-48"
            >
              <option value="all">كل الأسباب</option>
              <option value="resignation">استقالة</option>
              <option value="termination">إنهاء خدمات</option>
              <option value="retirement">تقاعد</option>
              <option value="contract_end">انتهاء العقد</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الموظف</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">القسم</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">تاريخ الالتحاق</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">تاريخ الانتهاء</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">مدة الخدمة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">السبب</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-300 rounded-xl flex items-center justify-center text-white font-bold">
                        {emp.avatar}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{emp.name}</p>
                        <p className="text-sm text-gray-500">{emp.employeeId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-gray-800">{emp.department}</p>
                    <p className="text-sm text-gray-500">{emp.position}</p>
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    {new Date(emp.joinDate).toLocaleDateString('ar-SA')}
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    {new Date(emp.endDate).toLocaleDateString('ar-SA')}
                  </td>
                  <td className="px-4 py-4 text-gray-600">{emp.yearsOfService} سنوات</td>
                  <td className="px-4 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${reasonColors[emp.reason]}`}>
                      {reasonLabels[emp.reason]}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                        <Eye size={16} className="text-gray-600" />
                      </button>
                      <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                        <Download size={16} className="text-gray-600" />
                      </button>
                      <button className="p-2 bg-gray-100 rounded-lg hover:bg-red-100">
                        <Trash2 size={16} className="text-gray-600 hover:text-red-600" />
                      </button>
                    </div>
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
