'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react'

interface EmployeeBalance {
  id: string
  employeeId: string
  employeeName: string
  avatar: string
  department: string
  annualTotal: number
  annualUsed: number
  annualRemaining: number
  sickTotal: number
  sickUsed: number
  sickRemaining: number
  emergencyTotal: number
  emergencyUsed: number
  emergencyRemaining: number
  carryOver: number
}

const employeeBalances: EmployeeBalance[] = [
  {
    id: '1',
    employeeId: 'EMP001',
    employeeName: 'أحمد محمد علي',
    avatar: 'أ',
    department: 'تقنية المعلومات',
    annualTotal: 30,
    annualUsed: 12,
    annualRemaining: 18,
    sickTotal: 30,
    sickUsed: 3,
    sickRemaining: 27,
    emergencyTotal: 6,
    emergencyUsed: 1,
    emergencyRemaining: 5,
    carryOver: 5,
  },
  {
    id: '2',
    employeeId: 'EMP002',
    employeeName: 'سارة أحمد الخالدي',
    avatar: 'س',
    department: 'الموارد البشرية',
    annualTotal: 21,
    annualUsed: 8,
    annualRemaining: 13,
    sickTotal: 30,
    sickUsed: 2,
    sickRemaining: 28,
    emergencyTotal: 6,
    emergencyUsed: 0,
    emergencyRemaining: 6,
    carryOver: 3,
  },
  {
    id: '3',
    employeeId: 'EMP003',
    employeeName: 'محمد خالد السعيد',
    avatar: 'م',
    department: 'المبيعات',
    annualTotal: 30,
    annualUsed: 25,
    annualRemaining: 5,
    sickTotal: 30,
    sickUsed: 10,
    sickRemaining: 20,
    emergencyTotal: 6,
    emergencyUsed: 4,
    emergencyRemaining: 2,
    carryOver: 0,
  },
  {
    id: '4',
    employeeId: 'EMP004',
    employeeName: 'فاطمة علي الزهراني',
    avatar: 'ف',
    department: 'المحاسبة',
    annualTotal: 21,
    annualUsed: 5,
    annualRemaining: 16,
    sickTotal: 30,
    sickUsed: 0,
    sickRemaining: 30,
    emergencyTotal: 6,
    emergencyUsed: 1,
    emergencyRemaining: 5,
    carryOver: 0,
  },
  {
    id: '5',
    employeeId: 'EMP005',
    employeeName: 'عمر سالم الحربي',
    avatar: 'ع',
    department: 'التسويق',
    annualTotal: 30,
    annualUsed: 28,
    annualRemaining: 2,
    sickTotal: 30,
    sickUsed: 5,
    sickRemaining: 25,
    emergencyTotal: 6,
    emergencyUsed: 6,
    emergencyRemaining: 0,
    carryOver: 8,
  },
  {
    id: '6',
    employeeId: 'EMP006',
    employeeName: 'نورة محمد العتيبي',
    avatar: 'ن',
    department: 'خدمة العملاء',
    annualTotal: 21,
    annualUsed: 10,
    annualRemaining: 11,
    sickTotal: 30,
    sickUsed: 1,
    sickRemaining: 29,
    emergencyTotal: 6,
    emergencyUsed: 2,
    emergencyRemaining: 4,
    carryOver: 2,
  },
]

function BalanceBar({ used, total, color }: { used: number; total: number; color: string }) {
  const percentage = (used / total) * 100
  const isLow = percentage > 80

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className={`font-medium ${isLow ? 'text-danger-600' : 'text-gray-600'}`}>
          {total - used} متبقي
        </span>
        <span className="text-gray-400">{used}/{total}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color} ${isLow ? 'opacity-100' : 'opacity-80'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export default function LeaveBalancePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('all')

  const filteredBalances = employeeBalances.filter((emp) => {
    if (
      searchQuery &&
      !emp.employeeName.includes(searchQuery) &&
      !emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false
    if (selectedDepartment !== 'all' && emp.department !== selectedDepartment) return false
    return true
  })

  // Summary stats
  const totalAnnualRemaining = employeeBalances.reduce((sum, e) => sum + e.annualRemaining, 0)
  const avgUsageRate = Math.round(
    (employeeBalances.reduce((sum, e) => sum + e.annualUsed, 0) /
      employeeBalances.reduce((sum, e) => sum + e.annualTotal, 0)) *
      100
  )
  const lowBalanceCount = employeeBalances.filter(
    (e) => e.annualRemaining <= 5 || e.emergencyRemaining <= 1
  ).length

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">رصيد الإجازات</h1>
            <p className="text-gray-500 mt-1">متابعة أرصدة إجازات الموظفين</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-secondary flex items-center gap-2">
              <Download size={18} />
              تصدير
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
                <Calendar size={24} className="text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">إجمالي الرصيد المتبقي</p>
                <p className="text-2xl font-bold text-primary-600">{totalAnnualRemaining} يوم</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
                <TrendingUp size={24} className="text-success-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">معدل الاستخدام</p>
                <p className="text-2xl font-bold text-success-600">{avgUsageRate}%</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-warning-50 rounded-2xl flex items-center justify-center">
                <AlertTriangle size={24} className="text-warning-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">رصيد منخفض</p>
                <p className="text-2xl font-bold text-warning-600">{lowBalanceCount} موظف</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                <TrendingDown size={24} className="text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">إجمالي المرحّل</p>
                <p className="text-2xl font-bold text-purple-600">
                  {employeeBalances.reduce((sum, e) => sum + e.carryOver, 0)} يوم
                </p>
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
            </select>

            <select className="input w-36">
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>
          </div>
        </div>

        {/* Balance Table */}
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="text-right px-4 py-4">الموظف</th>
                  <th className="text-right px-4 py-4">القسم</th>
                  <th className="text-center px-4 py-4 min-w-[180px]">الإجازة السنوية</th>
                  <th className="text-center px-4 py-4 min-w-[180px]">الإجازة المرضية</th>
                  <th className="text-center px-4 py-4 min-w-[180px]">الإجازة الطارئة</th>
                  <th className="text-center px-4 py-4">المرحّل</th>
                </tr>
              </thead>
              <tbody>
                {filteredBalances.map((employee) => (
                  <tr key={employee.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold">
                          {employee.avatar}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{employee.employeeName}</p>
                          <p className="text-sm text-gray-400 font-mono">{employee.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell text-gray-600">{employee.department}</td>
                    <td className="table-cell">
                      <BalanceBar
                        used={employee.annualUsed}
                        total={employee.annualTotal}
                        color="bg-primary-500"
                      />
                    </td>
                    <td className="table-cell">
                      <BalanceBar
                        used={employee.sickUsed}
                        total={employee.sickTotal}
                        color="bg-danger-500"
                      />
                    </td>
                    <td className="table-cell">
                      <BalanceBar
                        used={employee.emergencyUsed}
                        total={employee.emergencyTotal}
                        color="bg-warning-500"
                      />
                    </td>
                    <td className="table-cell text-center">
                      {employee.carryOver > 0 ? (
                        <span className="font-bold text-purple-600">+{employee.carryOver}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              عرض <span className="font-medium text-gray-700">1-{filteredBalances.length}</span> من{' '}
              <span className="font-medium text-gray-700">{filteredBalances.length}</span> موظف
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

        {/* Low Balance Alerts */}
        {lowBalanceCount > 0 && (
          <div className="card bg-warning-50 border-warning-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-warning-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-warning-600" />
              </div>
              <div>
                <h3 className="font-bold text-warning-800">تنبيه: موظفين برصيد منخفض</h3>
                <p className="text-warning-700 text-sm mt-1">
                  يوجد {lowBalanceCount} موظفين لديهم رصيد إجازات منخفض. يرجى التواصل معهم لتنظيم
                  إجازاتهم قبل نهاية السنة.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {employeeBalances
                    .filter((e) => e.annualRemaining <= 5 || e.emergencyRemaining <= 1)
                    .map((emp) => (
                      <span key={emp.id} className="px-3 py-1 bg-white rounded-lg text-sm text-warning-700">
                        {emp.employeeName}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
