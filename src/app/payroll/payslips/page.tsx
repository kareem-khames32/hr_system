'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Download,
  Eye,
  Printer,
  Calendar,
  Filter,
  FileText,
  DollarSign,
} from 'lucide-react'
import Link from 'next/link'

interface Payslip {
  id: string
  employeeId: string
  employeeName: string
  department: string
  month: string
  year: number
  basicSalary: number
  allowances: number
  deductions: number
  netSalary: number
  status: 'paid' | 'pending' | 'processing'
  paymentDate?: string
}

const payslips: Payslip[] = [
  {
    id: 'PS001',
    employeeId: 'EMP001',
    employeeName: 'أحمد محمد علي',
    department: 'تقنية المعلومات',
    month: 'يناير',
    year: 2024,
    basicSalary: 15000,
    allowances: 4500,
    deductions: 1950,
    netSalary: 17550,
    status: 'paid',
    paymentDate: '2024-01-28',
  },
  {
    id: 'PS002',
    employeeId: 'EMP002',
    employeeName: 'سارة أحمد الخالدي',
    department: 'الموارد البشرية',
    month: 'يناير',
    year: 2024,
    basicSalary: 12000,
    allowances: 3600,
    deductions: 1560,
    netSalary: 14040,
    status: 'paid',
    paymentDate: '2024-01-28',
  },
  {
    id: 'PS003',
    employeeId: 'EMP003',
    employeeName: 'عمر سالم الحربي',
    department: 'المبيعات',
    month: 'يناير',
    year: 2024,
    basicSalary: 10000,
    allowances: 5000,
    deductions: 1500,
    netSalary: 13500,
    status: 'paid',
    paymentDate: '2024-01-28',
  },
  {
    id: 'PS004',
    employeeId: 'EMP004',
    employeeName: 'نورة محمد الدوسري',
    department: 'التسويق',
    month: 'يناير',
    year: 2024,
    basicSalary: 11000,
    allowances: 3300,
    deductions: 1430,
    netSalary: 12870,
    status: 'processing',
  },
  {
    id: 'PS005',
    employeeId: 'EMP005',
    employeeName: 'فهد عبدالله السعيد',
    department: 'تقنية المعلومات',
    month: 'يناير',
    year: 2024,
    basicSalary: 18000,
    allowances: 5400,
    deductions: 2340,
    netSalary: 21060,
    status: 'pending',
  },
]

const statusLabels = {
  paid: 'تم الدفع',
  pending: 'معلق',
  processing: 'قيد المعالجة',
}

const statusColors = {
  paid: 'bg-success-50 text-success-700',
  pending: 'bg-warning-50 text-warning-700',
  processing: 'bg-blue-100 text-blue-700',
}

export default function PayslipsListPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('2024-01')
  const [filterStatus, setFilterStatus] = useState('all')

  const filteredPayslips = payslips.filter((slip) => {
    const matchesSearch =
      slip.employeeName.includes(searchTerm) || slip.employeeId.includes(searchTerm)
    const matchesStatus = filterStatus === 'all' || slip.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const totalNet = filteredPayslips.reduce((sum, p) => sum + p.netSalary, 0)

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">قسائم الرواتب</h1>
            <p className="text-gray-500 mt-1">عرض وطباعة قسائم رواتب الموظفين</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-secondary flex items-center gap-2">
              <Printer size={18} />
              طباعة الكل
            </button>
            <button className="btn-primary flex items-center gap-2">
              <Download size={18} />
              تصدير
            </button>
          </div>
        </div>

        {/* Summary Card */}
        <div className="card bg-gradient-to-br from-primary-500 to-primary-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-100">إجمالي صافي الرواتب</p>
              <p className="text-4xl font-bold mt-1">{totalNet.toLocaleString()} ر.س</p>
              <p className="text-primary-100 mt-2">{filteredPayslips.length} قسيمة راتب</p>
            </div>
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center">
              <DollarSign size={40} className="text-white" />
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
            <input
              type="month"
              className="input w-48"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input w-40"
            >
              <option value="all">كل الحالات</option>
              <option value="paid">تم الدفع</option>
              <option value="pending">معلق</option>
              <option value="processing">قيد المعالجة</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الموظف</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الشهر</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">الراتب الأساسي</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">البدلات</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">الخصومات</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">الصافي</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">الحالة</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPayslips.map((slip) => (
                <tr key={slip.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <p className="font-medium text-gray-800">{slip.employeeName}</p>
                    <p className="text-sm text-gray-500">{slip.department}</p>
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    {slip.month} {slip.year}
                  </td>
                  <td className="px-4 py-4 text-center text-gray-600">
                    {slip.basicSalary.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center text-success-600 font-medium">
                    +{slip.allowances.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center text-red-600 font-medium">
                    -{slip.deductions.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center font-bold text-gray-800">
                    {slip.netSalary.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[slip.status]}`}>
                      {statusLabels[slip.status]}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        href={`/payroll/payslip/${slip.employeeId}`}
                        className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                      >
                        <Eye size={16} className="text-gray-600" />
                      </Link>
                      <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                        <Printer size={16} className="text-gray-600" />
                      </button>
                      <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                        <Download size={16} className="text-gray-600" />
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
