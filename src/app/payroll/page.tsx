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
  Plus,
  Minus,
  Edit3,
  Gift,
  X,
  Trash2,
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
  const [periodType, setPeriodType] = useState<'monthly' | 'custom'>('monthly')
  const [customPeriod, setCustomPeriod] = useState({ from: '2026-01-01', to: '2026-01-31' })
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollRecord | null>(null)
  const [adjustmentType, setAdjustmentType] = useState<'bonus' | 'deduction'>('bonus')
  const [adjustmentAmount, setAdjustmentAmount] = useState('')
  const [adjustmentReason, setAdjustmentReason] = useState('')
  const [employeeAdjustments, setEmployeeAdjustments] = useState<Record<string, { bonuses: {amount: number, reason: string}[], removedDeductions: string[] }>>({})

  const openAdjustmentModal = (employee: PayrollRecord, type: 'bonus' | 'deduction') => {
    setSelectedEmployee(employee)
    setAdjustmentType(type)
    setAdjustmentAmount('')
    setAdjustmentReason('')
    setShowAdjustmentModal(true)
  }

  const addAdjustment = () => {
    if (!selectedEmployee || !adjustmentAmount) return

    const amount = parseFloat(adjustmentAmount)
    if (isNaN(amount)) return

    setEmployeeAdjustments(prev => {
      const empAdj = prev[selectedEmployee.id] || { bonuses: [], removedDeductions: [] }
      return {
        ...prev,
        [selectedEmployee.id]: {
          ...empAdj,
          bonuses: [...empAdj.bonuses, { amount, reason: adjustmentReason || 'مكافأة' }]
        }
      }
    })
    setShowAdjustmentModal(false)
  }

  const removeDeduction = (employeeId: string, deductionType: string) => {
    setEmployeeAdjustments(prev => {
      const empAdj = prev[employeeId] || { bonuses: [], removedDeductions: [] }
      return {
        ...prev,
        [employeeId]: {
          ...empAdj,
          removedDeductions: [...empAdj.removedDeductions, deductionType]
        }
      }
    })
  }

  const getAdjustedRecord = (record: PayrollRecord) => {
    const adj = employeeAdjustments[record.id]
    if (!adj) return record

    let adjustedRecord = { ...record }

    // Add bonuses
    const totalBonuses = adj.bonuses.reduce((sum, b) => sum + b.amount, 0)
    adjustedRecord.otherAllowances += totalBonuses
    adjustedRecord.totalEarnings += totalBonuses

    // Remove deductions
    if (adj.removedDeductions.includes('loan')) {
      adjustedRecord.totalDeductions -= adjustedRecord.loanDeduction
      adjustedRecord.loanDeduction = 0
    }
    if (adj.removedDeductions.includes('absence')) {
      adjustedRecord.totalDeductions -= adjustedRecord.absenceDeduction
      adjustedRecord.absenceDeduction = 0
    }

    adjustedRecord.netSalary = adjustedRecord.totalEarnings - adjustedRecord.totalDeductions
    return adjustedRecord
  }

  // Calculate totals
  const totals = payrollRecords.reduce(
    (acc, record) => ({
      totalEarnings: acc.totalEarnings + record.totalEarnings,
      totalDeductions: acc.totalDeductions + record.totalDeductions,
      netSalary: acc.netSalary + record.netSalary,
    }),
    { totalEarnings: 0, totalDeductions: 0, netSalary: 0 }
  )

  const filteredRecords = payrollRecords
    .map(record => getAdjustedRecord(record))
    .filter((record) => {
      if (searchQuery && !record.employeeName.includes(searchQuery) && !record.employeeId.includes(searchQuery)) {
        return false
      }
      if (selectedDepartment !== 'all' && record.department !== selectedDepartment) {
        return false
      }
      return true
    })

  // Recalculate totals with adjustments
  const adjustedTotals = filteredRecords.reduce(
    (acc, record) => ({
      totalEarnings: acc.totalEarnings + record.totalEarnings,
      totalDeductions: acc.totalDeductions + record.totalDeductions,
      netSalary: acc.netSalary + record.netSalary,
    }),
    { totalEarnings: 0, totalDeductions: 0, netSalary: 0 }
  )

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

        {/* Payroll Period Selector */}
        <div className="card">
          <div className="flex flex-col gap-4">
            {/* Period Type Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar size={20} className="text-gray-400" />
                  <span className="font-medium text-gray-700">فترة الراتب:</span>
                </div>
                <div className="flex items-center bg-gray-100 rounded-xl p-1">
                  <button
                    onClick={() => setPeriodType('monthly')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      periodType === 'monthly'
                        ? 'bg-white text-primary-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    شهري
                  </button>
                  <button
                    onClick={() => setPeriodType('custom')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      periodType === 'custom'
                        ? 'bg-white text-primary-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    فترة مخصصة
                  </button>
                </div>
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

            {/* Period Selection */}
            {periodType === 'monthly' ? (
              <div className="flex items-center gap-4">
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
            ) : (
              <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700">من تاريخ:</label>
                  <input
                    type="date"
                    value={customPeriod.from}
                    onChange={(e) => setCustomPeriod(prev => ({ ...prev, from: e.target.value }))}
                    className="input w-44"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700">إلى تاريخ:</label>
                  <input
                    type="date"
                    value={customPeriod.to}
                    onChange={(e) => setCustomPeriod(prev => ({ ...prev, to: e.target.value }))}
                    className="input w-44"
                  />
                </div>
                <button className="btn-primary flex items-center gap-2">
                  <Calculator size={18} />
                  حساب الفترة
                </button>
                <div className="mr-auto flex items-center gap-2 text-sm text-blue-700">
                  <AlertCircle size={16} />
                  <span>سيتم حساب الرواتب للفترة المحددة فقط</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card bg-gradient-to-br from-primary-500 to-primary-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-100 text-sm">إجمالي الاستحقاقات</p>
                <p className="text-3xl font-bold mt-1">{adjustedTotals.totalEarnings.toLocaleString()}</p>
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
                <p className="text-3xl font-bold mt-1">{adjustedTotals.totalDeductions.toLocaleString()}</p>
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
                <p className="text-3xl font-bold mt-1">{adjustedTotals.netSalary.toLocaleString()}</p>
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
                <p className="text-3xl font-bold text-gray-800 mt-1">{filteredRecords.length}</p>
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
                  <th className="text-center px-4 py-4">بدلات/مكافآت</th>
                  <th className="text-center px-4 py-4 bg-success-50">الإجمالي</th>
                  <th className="text-center px-4 py-4">التأمينات</th>
                  <th className="text-center px-4 py-4">السلف</th>
                  <th className="text-center px-4 py-4">خصومات</th>
                  <th className="text-center px-4 py-4 bg-danger-50">إجمالي الخصم</th>
                  <th className="text-center px-4 py-4 bg-primary-50 font-bold">الصافي</th>
                  <th className="text-center px-4 py-4">تعديلات</th>
                  <th className="text-center px-4 py-4">عرض</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => {
                  const adj = employeeAdjustments[record.id]
                  const hasAdjustments = adj && (adj.bonuses.length > 0 || adj.removedDeductions.length > 0)
                  const originalRecord = payrollRecords.find(r => r.id === record.id)!

                  return (
                  <tr key={record.id} className={`table-row ${hasAdjustments ? 'bg-yellow-50' : ''}`}>
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold">
                          {record.avatar}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-800">{record.employeeName}</p>
                            {hasAdjustments && (
                              <span className="px-2 py-0.5 bg-yellow-200 text-yellow-800 text-xs rounded-full">معدّل</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-400">{record.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell text-center font-mono">{record.basicSalary.toLocaleString()}</td>
                    <td className="table-cell text-center font-mono">{record.housingAllowance.toLocaleString()}</td>
                    <td className="table-cell text-center font-mono">{record.transportAllowance.toLocaleString()}</td>
                    <td className="table-cell text-center font-mono">
                      <div className="flex flex-col items-center">
                        <span className={adj?.bonuses.length ? 'text-success-600 font-bold' : ''}>
                          {record.otherAllowances.toLocaleString()}
                        </span>
                        {adj?.bonuses.length > 0 && (
                          <span className="text-xs text-success-600">+{adj.bonuses.reduce((s,b) => s + b.amount, 0).toLocaleString()}</span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell text-center font-mono font-bold text-success-600 bg-success-50">
                      {record.totalEarnings.toLocaleString()}
                    </td>
                    <td className="table-cell text-center font-mono text-danger-600">{record.gosiDeduction.toLocaleString()}</td>
                    <td className="table-cell text-center font-mono">
                      {originalRecord.loanDeduction > 0 ? (
                        <div className="flex items-center justify-center gap-1">
                          <span className={adj?.removedDeductions.includes('loan') ? 'line-through text-gray-400' : 'text-danger-600'}>
                            {originalRecord.loanDeduction.toLocaleString()}
                          </span>
                          {!adj?.removedDeductions.includes('loan') && (
                            <button
                              onClick={() => removeDeduction(record.id, 'loan')}
                              className="p-1 hover:bg-danger-100 rounded text-danger-500"
                              title="إزالة خصم السلفة"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="table-cell text-center font-mono">
                      {originalRecord.absenceDeduction > 0 ? (
                        <div className="flex items-center justify-center gap-1">
                          <span className={adj?.removedDeductions.includes('absence') ? 'line-through text-gray-400' : 'text-danger-600'}>
                            {originalRecord.absenceDeduction.toLocaleString()}
                          </span>
                          {!adj?.removedDeductions.includes('absence') && (
                            <button
                              onClick={() => removeDeduction(record.id, 'absence')}
                              className="p-1 hover:bg-danger-100 rounded text-danger-500"
                              title="إزالة خصم الغياب"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="table-cell text-center font-mono font-bold text-danger-600 bg-danger-50">
                      {record.totalDeductions.toLocaleString()}
                    </td>
                    <td className="table-cell text-center font-mono font-bold text-primary-600 bg-primary-50 text-lg">
                      {record.netSalary.toLocaleString()}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openAdjustmentModal(record, 'bonus')}
                          className="p-2 hover:bg-success-100 rounded-lg transition-colors text-success-600"
                          title="إضافة مكافأة"
                        >
                          <Gift size={18} />
                        </button>
                        <button
                          onClick={() => openAdjustmentModal(record, 'deduction')}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
                          title="تعديل الخصومات"
                        >
                          <Edit3 size={18} />
                        </button>
                      </div>
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
                )}
                )}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100">
                  <td className="px-4 py-4 font-bold text-gray-800">الإجمالي</td>
                  <td className="px-4 py-4 text-center font-mono font-bold">
                    {filteredRecords.reduce((s, r) => s + r.basicSalary, 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold">
                    {filteredRecords.reduce((s, r) => s + r.housingAllowance, 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold">
                    {filteredRecords.reduce((s, r) => s + r.transportAllowance, 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold">
                    {filteredRecords.reduce((s, r) => s + r.otherAllowances, 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-success-600 bg-success-100">
                    {adjustedTotals.totalEarnings.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-danger-600">
                    {filteredRecords.reduce((s, r) => s + r.gosiDeduction, 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-danger-600">
                    {filteredRecords.reduce((s, r) => s + r.loanDeduction, 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-danger-600">
                    {filteredRecords.reduce((s, r) => s + r.absenceDeduction, 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-danger-600 bg-danger-100">
                    {adjustedTotals.totalDeductions.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center font-mono font-bold text-primary-600 bg-primary-100 text-lg">
                    {adjustedTotals.netSalary.toLocaleString()}
                  </td>
                  <td className="px-4 py-4" colSpan={2}></td>
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

      {/* Adjustment Modal */}
      {showAdjustmentModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  adjustmentType === 'bonus' ? 'bg-success-100' : 'bg-gray-100'
                }`}>
                  {adjustmentType === 'bonus' ? (
                    <Gift size={24} className="text-success-600" />
                  ) : (
                    <Edit3 size={24} className="text-gray-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">
                    {adjustmentType === 'bonus' ? 'إضافة مكافأة' : 'تعديل الخصومات'}
                  </h3>
                  <p className="text-sm text-gray-500">{selectedEmployee.employeeName}</p>
                </div>
              </div>
              <button
                onClick={() => setShowAdjustmentModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {adjustmentType === 'bonus' ? (
              <div className="space-y-4">
                <div>
                  <label className="label">مبلغ المكافأة *</label>
                  <input
                    type="number"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                    className="input"
                    placeholder="0.00"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="label">سبب المكافأة</label>
                  <select
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    className="input"
                  >
                    <option value="">اختر السبب</option>
                    <option value="أداء متميز">أداء متميز</option>
                    <option value="مشروع خاص">إنجاز مشروع خاص</option>
                    <option value="ساعات إضافية">ساعات إضافية</option>
                    <option value="ترقية">ترقية</option>
                    <option value="مكافأة سنوية">مكافأة سنوية</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>
                {adjustmentReason === 'أخرى' && (
                  <div>
                    <label className="label">تفاصيل أخرى</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="أدخل السبب"
                    />
                  </div>
                )}

                <div className="p-4 bg-success-50 rounded-xl mt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">الراتب الحالي:</span>
                    <span className="font-bold">{selectedEmployee.netSalary.toLocaleString()} ر.س</span>
                  </div>
                  {adjustmentAmount && (
                    <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-success-200">
                      <span className="text-success-700">الراتب بعد المكافأة:</span>
                      <span className="font-bold text-success-700">
                        {(selectedEmployee.netSalary + parseFloat(adjustmentAmount || '0')).toLocaleString()} ر.س
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-6">
                  <button
                    onClick={addAdjustment}
                    disabled={!adjustmentAmount}
                    className="btn-success flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Plus size={18} />
                    إضافة المكافأة
                  </button>
                  <button
                    onClick={() => setShowAdjustmentModal(false)}
                    className="btn-secondary"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600">الخصومات الحالية للموظف:</p>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium text-gray-800">خصم التأمينات (GOSI)</p>
                      <p className="text-sm text-gray-500">خصم إلزامي - لا يمكن إزالته</p>
                    </div>
                    <span className="font-mono text-danger-600">{selectedEmployee.gosiDeduction.toLocaleString()} ر.س</span>
                  </div>

                  {(() => {
                    const originalRec = payrollRecords.find(r => r.id === selectedEmployee.id)
                    if (!originalRec || originalRec.loanDeduction <= 0) return null
                    return (
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-800">خصم السلفة</p>
                        <p className="text-sm text-gray-500">قسط سلفة مستحق</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-danger-600">
                          {originalRec.loanDeduction.toLocaleString()} ر.س
                        </span>
                        {!employeeAdjustments[selectedEmployee.id]?.removedDeductions.includes('loan') ? (
                          <button
                            onClick={() => {
                              removeDeduction(selectedEmployee.id, 'loan')
                              setShowAdjustmentModal(false)
                            }}
                            className="btn-danger py-1 px-3 text-sm"
                          >
                            إزالة
                          </button>
                        ) : (
                          <span className="text-sm text-success-600">تم الإزالة ✓</span>
                        )}
                      </div>
                    </div>
                    )
                  })()}

                  {(() => {
                    const originalRec = payrollRecords.find(r => r.id === selectedEmployee.id)
                    if (!originalRec || originalRec.absenceDeduction <= 0) return null
                    return (
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="font-medium text-gray-800">خصم الغياب</p>
                        <p className="text-sm text-gray-500">خصم أيام غياب بدون عذر</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-danger-600">
                          {originalRec.absenceDeduction.toLocaleString()} ر.س
                        </span>
                        {!employeeAdjustments[selectedEmployee.id]?.removedDeductions.includes('absence') ? (
                          <button
                            onClick={() => {
                              removeDeduction(selectedEmployee.id, 'absence')
                              setShowAdjustmentModal(false)
                            }}
                            className="btn-danger py-1 px-3 text-sm"
                          >
                            إزالة
                          </button>
                        ) : (
                          <span className="text-sm text-success-600">تم الإزالة ✓</span>
                        )}
                      </div>
                    </div>
                    )
                  })()}
                </div>

                <button
                  onClick={() => setShowAdjustmentModal(false)}
                  className="btn-secondary w-full mt-4"
                >
                  إغلاق
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </MainLayout>
  )
}
