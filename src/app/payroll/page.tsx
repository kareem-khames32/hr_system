'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Filter,
  Download,
  Upload,
  Calendar,
  DollarSign,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Send,
  Lock,
  ChevronLeft,
  ChevronRight,
  Eye,
  Printer,
  Calculator,
  Building2,
  TrendingUp,
  Banknote,
} from 'lucide-react'
import Link from 'next/link'

interface PayrollRecord {
  id: string
  employeeId: string
  employeeName: string
  avatar: string
  department: string
  basicSalary: number
  housingAllowance: number
  transportAllowance: number
  otherAllowances: number
  totalEarnings: number
  gosiDeduction: number
  loanDeduction: number
  absenceDeduction: number
  otherDeductions: number
  totalDeductions: number
  netSalary: number
  bankName: string
  status: 'calculated' | 'approved' | 'paid'
}

const payrollRecords: PayrollRecord[] = [
  {
    id: '1',
    employeeId: 'EMP001',
    employeeName: 'أحمد محمد علي',
    avatar: 'أ',
    department: 'تقنية المعلومات',
    basicSalary: 15000,
    housingAllowance: 3750,
    transportAllowance: 1500,
    otherAllowances: 1000,
    totalEarnings: 21250,
    gosiDeduction: 1462.50,
    loanDeduction: 0,
    absenceDeduction: 0,
    otherDeductions: 0,
    totalDeductions: 1462.50,
    netSalary: 19787.50,
    bankName: 'الراجحي',
    status: 'calculated',
  },
  {
    id: '2',
    employeeId: 'EMP002',
    employeeName: 'سارة أحمد الخالدي',
    avatar: 'س',
    department: 'الموارد البشرية',
    basicSalary: 12000,
    housingAllowance: 3000,
    transportAllowance: 1000,
    otherAllowances: 500,
    totalEarnings: 16500,
    gosiDeduction: 1170,
    loanDeduction: 1000,
    absenceDeduction: 0,
    otherDeductions: 0,
    totalDeductions: 2170,
    netSalary: 14330,
    bankName: 'الأهلي',
    status: 'calculated',
  },
  {
    id: '3',
    employeeId: 'EMP003',
    employeeName: 'محمد خالد السعيد',
    avatar: 'م',
    department: 'المبيعات',
    basicSalary: 10000,
    housingAllowance: 2500,
    transportAllowance: 1000,
    otherAllowances: 2000,
    totalEarnings: 15500,
    gosiDeduction: 975,
    loanDeduction: 0,
    absenceDeduction: 500,
    otherDeductions: 0,
    totalDeductions: 1475,
    netSalary: 14025,
    bankName: 'الراجحي',
    status: 'calculated',
  },
  {
    id: '4',
    employeeId: 'EMP004',
    employeeName: 'فاطمة علي الزهراني',
    avatar: 'ف',
    department: 'المحاسبة',
    basicSalary: 8000,
    housingAllowance: 2000,
    transportAllowance: 800,
    otherAllowances: 0,
    totalEarnings: 10800,
    gosiDeduction: 780,
    loanDeduction: 0,
    absenceDeduction: 0,
    otherDeductions: 0,
    totalDeductions: 780,
    netSalary: 10020,
    bankName: 'الإنماء',
    status: 'calculated',
  },
  {
    id: '5',
    employeeId: 'EMP005',
    employeeName: 'عمر سالم الحربي',
    avatar: 'ع',
    department: 'التسويق',
    basicSalary: 14000,
    housingAllowance: 3500,
    transportAllowance: 1200,
    otherAllowances: 800,
    totalEarnings: 19500,
    gosiDeduction: 1365,
    loanDeduction: 2000,
    absenceDeduction: 0,
    otherDeductions: 0,
    totalDeductions: 3365,
    netSalary: 16135,
    bankName: 'ساب',
    status: 'calculated',
  },
  {
    id: '6',
    employeeId: 'EMP006',
    employeeName: 'نورة محمد العتيبي',
    avatar: 'ن',
    department: 'خدمة العملاء',
    basicSalary: 9000,
    housingAllowance: 2250,
    transportAllowance: 900,
    otherAllowances: 350,
    totalEarnings: 12500,
    gosiDeduction: 877.50,
    loanDeduction: 0,
    absenceDeduction: 300,
    otherDeductions: 0,
    totalDeductions: 1177.50,
    netSalary: 11322.50,
    bankName: 'الراجحي',
    status: 'calculated',
  },
]

const payrollCycles = [
  { id: '1', month: 'يناير 2026', status: 'current', total: 248, processed: 248 },
  { id: '2', month: 'ديسمبر 2025', status: 'paid', total: 245, processed: 245 },
  { id: '3', month: 'نوفمبر 2025', status: 'paid', total: 242, processed: 242 },
]

export default function PayrollPage() {
  const [selectedCycle, setSelectedCycle] = useState('يناير 2026')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('all')

  // Calculate totals
  const totals = payrollRecords.reduce(
    (acc, record) => ({
      totalEarnings: acc.totalEarnings + record.totalEarnings,
      totalDeductions: acc.totalDeductions + record.totalDeductions,
      netSalary: acc.netSalary + record.netSalary,
    }),
    { totalEarnings: 0, totalDeductions: 0, netSalary: 0 }
  )

  const filteredRecords = payrollRecords.filter((record) => {
    if (searchQuery && !record.employeeName.includes(searchQuery) && !record.employeeId.includes(searchQuery)) {
      return false
    }
    if (selectedDepartment !== 'all' && record.department !== selectedDepartment) {
      return false
    }
    return true
  })

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">مسير الرواتب</h1>
            <p className="text-gray-500 mt-1">إدارة ومعالجة رواتب الموظفين</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-secondary flex items-center gap-2">
              <Upload size={18} />
              استيراد
            </button>
            <button className="btn-secondary flex items-center gap-2">
              <Download size={18} />
              تصدير Excel
            </button>
            <button className="btn-primary flex items-center gap-2">
              <Calculator size={18} />
              معالجة الرواتب
            </button>
          </div>
        </div>

        {/* Payroll Cycle Selector */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar size={20} className="text-gray-400" />
                <span className="font-medium text-gray-700">دورة الراتب:</span>
              </div>
              <select
                value={selectedCycle}
                onChange={(e) => setSelectedCycle(e.target.value)}
                className="input w-48"
              >
                {payrollCycles.map((cycle) => (
                  <option key={cycle.id} value={cycle.month}>
                    {cycle.month} {cycle.status === 'paid' ? '(مصروف)' : cycle.status === 'current' ? '(جاري)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-warning-500" />
                <span className="text-sm text-gray-600">محسوب</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary-500" />
                <span className="text-sm text-gray-600">معتمد</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-success-500" />
                <span className="text-sm text-gray-600">مصروف</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card bg-gradient-to-br from-primary-500 to-primary-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-100 text-sm">إجمالي الاستحقاقات</p>
                <p className="text-3xl font-bold mt-1">{totals.totalEarnings.toLocaleString()}</p>
                <p className="text-primary-200 text-sm mt-1">ريال سعودي</p>
              </div>
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <TrendingUp size={28} />
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-danger-500 to-danger-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-danger-100 text-sm">إجمالي الخصومات</p>
                <p className="text-3xl font-bold mt-1">{totals.totalDeductions.toLocaleString()}</p>
                <p className="text-danger-200 text-sm mt-1">ريال سعودي</p>
              </div>
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <DollarSign size={28} />
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-success-500 to-success-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-success-100 text-sm">صافي الرواتب</p>
                <p className="text-3xl font-bold mt-1">{totals.netSalary.toLocaleString()}</p>
                <p className="text-success-200 text-sm mt-1">ريال سعودي</p>
              </div>
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <Banknote size={28} />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">عدد الموظفين</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">{payrollRecords.length}</p>
                <p className="text-gray-400 text-sm mt-1">موظف</p>
              </div>
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
                <Users size={28} className="text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Workflow Steps */}
        <div className="card">
          <h3 className="font-bold text-gray-800 mb-4">خطوات معالجة الرواتب</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-success-500 rounded-2xl flex items-center justify-center text-white">
                  <CheckCircle size={24} />
                </div>
                <span className="text-sm font-medium text-success-600 mt-2">1. جمع البيانات</span>
              </div>
              <div className="flex-1 h-1 bg-success-500 rounded" />

              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-success-500 rounded-2xl flex items-center justify-center text-white">
                  <CheckCircle size={24} />
                </div>
                <span className="text-sm font-medium text-success-600 mt-2">2. الحساب</span>
              </div>
              <div className="flex-1 h-1 bg-gray-200 rounded" />

              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-warning-500 rounded-2xl flex items-center justify-center text-white">
                  <Clock size={24} />
                </div>
                <span className="text-sm font-medium text-warning-600 mt-2">3. المراجعة</span>
              </div>
              <div className="flex-1 h-1 bg-gray-200 rounded" />

              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-gray-200 rounded-2xl flex items-center justify-center text-gray-400">
                  <Lock size={24} />
                </div>
                <span className="text-sm font-medium text-gray-400 mt-2">4. الاعتماد</span>
              </div>
              <div className="flex-1 h-1 bg-gray-200 rounded" />

              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-gray-200 rounded-2xl flex items-center justify-center text-gray-400">
                  <Send size={24} />
                </div>
                <span className="text-sm font-medium text-gray-400 mt-2">5. الصرف</span>
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

            <button className="btn-secondary flex items-center gap-2">
              <Filter size={18} />
              فلاتر متقدمة
            </button>
          </div>
        </div>

        {/* Payroll Table */}
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="text-right px-4 py-4">الموظف</th>
                  <th className="text-center px-4 py-4">الأساسي</th>
                  <th className="text-center px-4 py-4">السكن</th>
                  <th className="text-center px-4 py-4">المواصلات</th>
                  <th className="text-center px-4 py-4">بدلات أخرى</th>
                  <th className="text-center px-4 py-4 bg-success-50">الإجمالي</th>
                  <th className="text-center px-4 py-4">التأمينات</th>
                  <th className="text-center px-4 py-4">السلف</th>
                  <th className="text-center px-4 py-4">خصومات</th>
                  <th className="text-center px-4 py-4 bg-danger-50">إجمالي الخصم</th>
                  <th className="text-center px-4 py-4 bg-primary-50 font-bold">الصافي</th>
                  <th className="text-center px-4 py-4">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold">
                          {record.avatar}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{record.employeeName}</p>
                          <p className="text-sm text-gray-400">{record.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell text-center font-mono">{record.basicSalary.toLocaleString()}</td>
                    <td className="table-cell text-center font-mono">{record.housingAllowance.toLocaleString()}</td>
                    <td className="table-cell text-center font-mono">{record.transportAllowance.toLocaleString()}</td>
                    <td className="table-cell text-center font-mono">{record.otherAllowances.toLocaleString()}</td>
                    <td className="table-cell text-center font-mono font-bold text-success-600 bg-success-50">
                      {record.totalEarnings.toLocaleString()}
                    </td>
                    <td className="table-cell text-center font-mono text-danger-600">{record.gosiDeduction.toLocaleString()}</td>
                    <td className="table-cell text-center font-mono text-danger-600">
                      {record.loanDeduction > 0 ? record.loanDeduction.toLocaleString() : '-'}
                    </td>
                    <td className="table-cell text-center font-mono text-danger-600">
                      {record.absenceDeduction > 0 ? record.absenceDeduction.toLocaleString() : '-'}
                    </td>
                    <td className="table-cell text-center font-mono font-bold text-danger-600 bg-danger-50">
                      {record.totalDeductions.toLocaleString()}
                    </td>
                    <td className="table-cell text-center font-mono font-bold text-primary-600 bg-primary-50 text-lg">
                      {record.netSalary.toLocaleString()}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          href={`/payroll/payslip/${record.employeeId}`}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Eye size={18} className="text-gray-500" />
                        </Link>
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                          <Printer size={18} className="text-gray-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100">
                  <td className="px-4 py-4 font-bold text-gray-800">الإجمالي</td>
                  <td className="px-4 py-4 text-center font-mono font-bold">
                    {payrollRecords.reduce((s, r) => s + r.basicSalary, 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold">
                    {payrollRecords.reduce((s, r) => s + r.housingAllowance, 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold">
                    {payrollRecords.reduce((s, r) => s + r.transportAllowance, 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold">
                    {payrollRecords.reduce((s, r) => s + r.otherAllowances, 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-success-600 bg-success-100">
                    {totals.totalEarnings.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-danger-600">
                    {payrollRecords.reduce((s, r) => s + r.gosiDeduction, 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-danger-600">
                    {payrollRecords.reduce((s, r) => s + r.loanDeduction, 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-danger-600">
                    {payrollRecords.reduce((s, r) => s + r.absenceDeduction, 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-danger-600 bg-danger-100">
                    {totals.totalDeductions.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-primary-600 bg-primary-100 text-lg">
                    {totals.netSalary.toLocaleString()}
                  </td>
                  <td className="px-4 py-4"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button className="btn-secondary flex items-center gap-2">
                <FileText size={18} />
                تقرير ملخص
              </button>
              <button className="btn-secondary flex items-center gap-2">
                <Download size={18} />
                ملف WPS
              </button>
              <button className="btn-secondary flex items-center gap-2">
                <FileText size={18} />
                ملف GOSI
              </button>
            </div>
            <div className="flex items-center gap-4">
              <button className="btn-success flex items-center gap-2">
                <Lock size={18} />
                اعتماد الرواتب
              </button>
              <button className="btn-primary flex items-center gap-2">
                <Send size={18} />
                إرسال للبنك
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
