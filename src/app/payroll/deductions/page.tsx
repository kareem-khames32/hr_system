'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  MinusCircle,
  Users,
  Building2,
  UserCheck,
  Search,
  Check,
  X,
  DollarSign,
  Calendar,
  AlertCircle,
  AlertTriangle,
  Filter,
  Download,
  Eye,
  Clock,
  Ban,
} from 'lucide-react'
import Link from 'next/link'

interface Employee {
  id: string
  name: string
  avatar: string
  department: string
  position: string
  basicSalary: number
}

const allEmployees: Employee[] = [
  { id: '1', name: 'أحمد محمد علي', avatar: 'أ', department: 'تقنية المعلومات', position: 'مطور برمجيات', basicSalary: 15000 },
  { id: '2', name: 'سارة أحمد الخالدي', avatar: 'س', department: 'الموارد البشرية', position: 'أخصائي موارد بشرية', basicSalary: 12000 },
  { id: '3', name: 'محمد خالد السعيد', avatar: 'م', department: 'المبيعات', position: 'مدير مبيعات', basicSalary: 10000 },
  { id: '4', name: 'فاطمة علي الزهراني', avatar: 'ف', department: 'المحاسبة', position: 'محاسب', basicSalary: 8000 },
  { id: '5', name: 'عمر سالم الحربي', avatar: 'ع', department: 'التسويق', position: 'مدير تسويق', basicSalary: 14000 },
  { id: '6', name: 'نورة محمد العتيبي', avatar: 'ن', department: 'خدمة العملاء', position: 'ممثل خدمة عملاء', basicSalary: 9000 },
  { id: '7', name: 'خالد عبدالله الشمري', avatar: 'خ', department: 'تقنية المعلومات', position: 'مدير تقنية المعلومات', basicSalary: 18000 },
  { id: '8', name: 'ريم سعود الدوسري', avatar: 'ر', department: 'الموارد البشرية', position: 'مدير الموارد البشرية', basicSalary: 16000 },
  { id: '9', name: 'يوسف أحمد المطيري', avatar: 'ي', department: 'المبيعات', position: 'مندوب مبيعات', basicSalary: 7000 },
  { id: '10', name: 'هند فهد القحطاني', avatar: 'هـ', department: 'المحاسبة', position: 'مدير مالي', basicSalary: 20000 },
]

const departments = [
  { id: 'it', name: 'تقنية المعلومات', count: 2 },
  { id: 'hr', name: 'الموارد البشرية', count: 2 },
  { id: 'sales', name: 'المبيعات', count: 2 },
  { id: 'accounting', name: 'المحاسبة', count: 2 },
  { id: 'marketing', name: 'التسويق', count: 1 },
  { id: 'support', name: 'خدمة العملاء', count: 1 },
]

const deductionReasons = [
  { id: 'absence', name: 'غياب بدون عذر', icon: '🚫', color: 'danger' },
  { id: 'late', name: 'تأخير', icon: '⏰', color: 'warning' },
  { id: 'early_leave', name: 'خروج مبكر', icon: '🚪', color: 'warning' },
  { id: 'violation', name: 'مخالفة', icon: '⚠️', color: 'danger' },
  { id: 'damage', name: 'إتلاف', icon: '💔', color: 'danger' },
  { id: 'loan', name: 'قسط سلفة', icon: '💳', color: 'primary' },
  { id: 'advance', name: 'استرداد سلفة', icon: '💰', color: 'primary' },
  { id: 'other', name: 'أخرى', icon: '📝', color: 'gray' },
]

type ScopeType = 'individual' | 'department' | 'company' | 'custom'
type DeductionCalcType = 'fixed' | 'percentage' | 'days'

export default function DeductionsPage() {
  const [scope, setScope] = useState<ScopeType>('individual')
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('')
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [deductionType, setDeductionType] = useState<DeductionCalcType>('fixed')
  const [deductionAmount, setDeductionAmount] = useState('')
  const [deductionPercentage, setDeductionPercentage] = useState('')
  const [deductionDays, setDeductionDays] = useState('')
  const [deductionReason, setDeductionReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0])
  const [searchQuery, setSearchQuery] = useState('')
  const [showEmployeeSelector, setShowEmployeeSelector] = useState(false)
  const [requireApproval, setRequireApproval] = useState(true)
  const [deductionHistory] = useState([
    { id: '1', date: '2026-01-20', scope: 'موظف واحد', employees: 1, amount: 500, reason: 'غياب بدون عذر', status: 'applied' },
    { id: '2', date: '2026-01-18', scope: 'قسم المبيعات', employees: 2, amount: 200, reason: 'تأخير', status: 'pending' },
    { id: '3', date: '2026-01-15', scope: 'موظف واحد', employees: 1, amount: 1000, reason: 'قسط سلفة', status: 'applied' },
  ])

  // Get affected employees based on scope
  const getAffectedEmployees = (): Employee[] => {
    switch (scope) {
      case 'individual':
        return allEmployees.filter(e => e.id === selectedEmployee)
      case 'department':
        const dept = departments.find(d => d.id === selectedDepartment)
        return allEmployees.filter(e => e.department === dept?.name)
      case 'company':
        return allEmployees
      case 'custom':
        return allEmployees.filter(e => selectedEmployees.includes(e.id))
      default:
        return []
    }
  }

  const affectedEmployees = getAffectedEmployees()

  // Calculate deduction for single employee
  const calculateDeduction = (emp: Employee) => {
    switch (deductionType) {
      case 'fixed':
        return parseFloat(deductionAmount || '0')
      case 'percentage':
        return emp.basicSalary * parseFloat(deductionPercentage || '0') / 100
      case 'days':
        const dailyRate = emp.basicSalary / 30
        return dailyRate * parseFloat(deductionDays || '0')
      default:
        return 0
    }
  }

  // Calculate total deduction
  const calculateTotalDeduction = () => {
    return affectedEmployees.reduce((sum, emp) => sum + calculateDeduction(emp), 0)
  }

  const toggleEmployeeSelection = (id: string) => {
    setSelectedEmployees(prev =>
      prev.includes(id)
        ? prev.filter(e => e !== id)
        : [...prev, id]
    )
  }

  const selectAllEmployees = () => {
    const filteredIds = allEmployees
      .filter(e => !searchQuery || e.name.includes(searchQuery) || e.department.includes(searchQuery))
      .map(e => e.id)
    setSelectedEmployees(filteredIds)
  }

  const clearAllEmployees = () => {
    setSelectedEmployees([])
  }

  const filteredEmployees = allEmployees.filter(e =>
    !searchQuery || e.name.includes(searchQuery) || e.department.includes(searchQuery)
  )

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">الخصومات</h1>
            <p className="text-gray-500 mt-1">إضافة خصومات للموظفين بمرونة في اختيار النطاق</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-secondary flex items-center gap-2">
              <Download size={18} />
              تصدير
            </button>
            <Link href="/payroll" className="btn-secondary">
              العودة للرواتب
            </Link>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="bg-warning-50 border border-warning-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-warning-600 mt-0.5" />
          <div>
            <p className="font-medium text-warning-800">تنبيه هام</p>
            <p className="text-sm text-warning-700">
              الخصومات ستطبق على مسير الرواتب الحالي. تأكد من مراجعة البيانات قبل الإرسال.
              {requireApproval && ' سيتطلب الخصم موافقة المدير قبل التطبيق.'}
            </p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - Deduction Form */}
          <div className="col-span-2 space-y-6">
            {/* Scope Selection */}
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Users size={20} className="text-primary-500" />
                نطاق التطبيق
              </h3>
              <p className="text-sm text-gray-500 mb-4">اختر من سيتم تطبيق الخصم عليهم</p>

              <div className="grid grid-cols-4 gap-3">
                {/* Individual */}
                <button
                  onClick={() => setScope('individual')}
                  className={`p-4 rounded-xl border-2 transition-all text-center ${
                    scope === 'individual'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-2 ${
                    scope === 'individual' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <UserCheck size={24} />
                  </div>
                  <p className={`font-medium ${scope === 'individual' ? 'text-primary-700' : 'text-gray-700'}`}>
                    موظف واحد
                  </p>
                  <p className="text-xs text-gray-400 mt-1">اختيار موظف محدد</p>
                </button>

                {/* Department */}
                <button
                  onClick={() => setScope('department')}
                  className={`p-4 rounded-xl border-2 transition-all text-center ${
                    scope === 'department'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-2 ${
                    scope === 'department' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <Building2 size={24} />
                  </div>
                  <p className={`font-medium ${scope === 'department' ? 'text-primary-700' : 'text-gray-700'}`}>
                    قسم كامل
                  </p>
                  <p className="text-xs text-gray-400 mt-1">جميع موظفي القسم</p>
                </button>

                {/* Company */}
                <button
                  onClick={() => setScope('company')}
                  className={`p-4 rounded-xl border-2 transition-all text-center ${
                    scope === 'company'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-2 ${
                    scope === 'company' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <Users size={24} />
                  </div>
                  <p className={`font-medium ${scope === 'company' ? 'text-primary-700' : 'text-gray-700'}`}>
                    الشركة كاملة
                  </p>
                  <p className="text-xs text-gray-400 mt-1">جميع الموظفين</p>
                </button>

                {/* Custom */}
                <button
                  onClick={() => {
                    setScope('custom')
                    setShowEmployeeSelector(true)
                  }}
                  className={`p-4 rounded-xl border-2 transition-all text-center ${
                    scope === 'custom'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-2 ${
                    scope === 'custom' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <Filter size={24} />
                  </div>
                  <p className={`font-medium ${scope === 'custom' ? 'text-primary-700' : 'text-gray-700'}`}>
                    اختيار مخصص
                  </p>
                  <p className="text-xs text-gray-400 mt-1">تحديد موظفين معينين</p>
                </button>
              </div>

              {/* Scope-specific selectors */}
              <div className="mt-4">
                {scope === 'individual' && (
                  <div>
                    <label className="label">اختر الموظف</label>
                    <select
                      value={selectedEmployee}
                      onChange={(e) => setSelectedEmployee(e.target.value)}
                      className="input"
                    >
                      <option value="">-- اختر موظف --</option>
                      {allEmployees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} - {emp.department}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {scope === 'department' && (
                  <div>
                    <label className="label">اختر القسم</label>
                    <select
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      className="input"
                    >
                      <option value="">-- اختر قسم --</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name} ({dept.count} موظف)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {scope === 'custom' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="label mb-0">الموظفين المحددين ({selectedEmployees.length})</label>
                      <button
                        onClick={() => setShowEmployeeSelector(true)}
                        className="text-sm text-primary-600 hover:text-primary-700"
                      >
                        تعديل الاختيار
                      </button>
                    </div>
                    {selectedEmployees.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedEmployees.slice(0, 5).map(id => {
                          const emp = allEmployees.find(e => e.id === id)
                          return emp ? (
                            <span
                              key={id}
                              className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm flex items-center gap-1"
                            >
                              {emp.name}
                              <button
                                onClick={() => toggleEmployeeSelection(id)}
                                className="hover:text-primary-900"
                              >
                                <X size={14} />
                              </button>
                            </span>
                          ) : null
                        })}
                        {selectedEmployees.length > 5 && (
                          <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                            +{selectedEmployees.length - 5} آخرين
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">لم يتم اختيار أي موظف</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Deduction Details */}
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <MinusCircle size={20} className="text-danger-500" />
                تفاصيل الخصم
              </h3>

              {/* Deduction Type Toggle */}
              <div className="mb-4">
                <label className="label">طريقة حساب الخصم</label>
                <div className="flex items-center bg-gray-100 rounded-xl p-1 w-fit">
                  <button
                    onClick={() => setDeductionType('fixed')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      deductionType === 'fixed'
                        ? 'bg-white text-primary-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    مبلغ ثابت
                  </button>
                  <button
                    onClick={() => setDeductionType('percentage')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      deductionType === 'percentage'
                        ? 'bg-white text-primary-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    نسبة من الراتب
                  </button>
                  <button
                    onClick={() => setDeductionType('days')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      deductionType === 'days'
                        ? 'bg-white text-primary-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    عدد أيام
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {deductionType === 'fixed' && (
                  <div>
                    <label className="label">مبلغ الخصم (ر.س) *</label>
                    <input
                      type="number"
                      value={deductionAmount}
                      onChange={(e) => setDeductionAmount(e.target.value)}
                      className="input"
                      placeholder="0.00"
                      dir="ltr"
                    />
                    <p className="text-xs text-gray-400 mt-1">سيطبق نفس المبلغ على جميع الموظفين المحددين</p>
                  </div>
                )}

                {deductionType === 'percentage' && (
                  <div>
                    <label className="label">النسبة من الراتب الأساسي (%) *</label>
                    <input
                      type="number"
                      value={deductionPercentage}
                      onChange={(e) => setDeductionPercentage(e.target.value)}
                      className="input"
                      placeholder="0"
                      dir="ltr"
                      max="100"
                    />
                    <p className="text-xs text-gray-400 mt-1">سيحسب بناءً على الراتب الأساسي لكل موظف</p>
                  </div>
                )}

                {deductionType === 'days' && (
                  <div>
                    <label className="label">عدد أيام الخصم *</label>
                    <input
                      type="number"
                      value={deductionDays}
                      onChange={(e) => setDeductionDays(e.target.value)}
                      className="input"
                      placeholder="0"
                      dir="ltr"
                    />
                    <p className="text-xs text-gray-400 mt-1">سيحسب على أساس (الراتب ÷ 30) × عدد الأيام</p>
                  </div>
                )}

                <div>
                  <label className="label">تاريخ التطبيق *</label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="label">سبب الخصم *</label>
                <div className="grid grid-cols-4 gap-2">
                  {deductionReasons.map(reason => (
                    <button
                      key={reason.id}
                      onClick={() => setDeductionReason(reason.id)}
                      className={`p-3 rounded-xl border-2 transition-all text-center ${
                        deductionReason === reason.id
                          ? 'border-danger-500 bg-danger-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-xl">{reason.icon}</span>
                      <p className={`text-sm mt-1 ${deductionReason === reason.id ? 'text-danger-700 font-medium' : 'text-gray-600'}`}>
                        {reason.name}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {deductionReason === 'other' && (
                <div className="mt-4">
                  <label className="label">تفاصيل السبب</label>
                  <input
                    type="text"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="input"
                    placeholder="أدخل سبب الخصم"
                  />
                </div>
              )}

              {/* Approval Toggle */}
              <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">يتطلب موافقة المدير</p>
                    <p className="text-sm text-gray-500">سيتم إرسال الخصم للمدير للموافقة قبل التطبيق</p>
                  </div>
                  <button
                    onClick={() => setRequireApproval(!requireApproval)}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      requireApproval ? 'bg-primary-500' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      requireApproval ? 'translate-x-1' : 'translate-x-6'
                    }`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Affected Employees Preview */}
            {affectedEmployees.length > 0 && (
              <div className="card">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Eye size={20} className="text-gray-500" />
                  معاينة الموظفين المتأثرين ({affectedEmployees.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="table-header">
                        <th className="text-right px-4 py-3">الموظف</th>
                        <th className="text-center px-4 py-3">القسم</th>
                        <th className="text-center px-4 py-3">الراتب الأساسي</th>
                        <th className="text-center px-4 py-3 text-danger-600">الخصم</th>
                      </tr>
                    </thead>
                    <tbody>
                      {affectedEmployees.map(emp => (
                        <tr key={emp.id} className="table-row">
                          <td className="table-cell">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                                {emp.avatar}
                              </div>
                              <span className="font-medium text-gray-800">{emp.name}</span>
                            </div>
                          </td>
                          <td className="table-cell text-center text-gray-600">{emp.department}</td>
                          <td className="table-cell text-center font-mono">{emp.basicSalary.toLocaleString()}</td>
                          <td className="table-cell text-center font-mono font-bold text-danger-600">
                            -{calculateDeduction(emp).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Summary & History */}
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="card bg-gradient-to-br from-danger-500 to-danger-600 text-white">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <MinusCircle size={20} />
                ملخص الخصم
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-danger-100">عدد الموظفين:</span>
                  <span className="font-bold text-xl">{affectedEmployees.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-danger-100">
                    {deductionType === 'fixed' ? 'المبلغ لكل موظف:' :
                     deductionType === 'percentage' ? 'النسبة:' : 'عدد الأيام:'}
                  </span>
                  <span className="font-bold">
                    {deductionType === 'fixed'
                      ? `${parseFloat(deductionAmount || '0').toLocaleString()} ر.س`
                      : deductionType === 'percentage'
                      ? `${deductionPercentage || 0}%`
                      : `${deductionDays || 0} يوم`
                    }
                  </span>
                </div>
                <div className="border-t border-white/20 pt-3 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-danger-100">الإجمالي:</span>
                    <span className="font-bold text-2xl">{calculateTotalDeduction().toLocaleString()} ر.س</span>
                  </div>
                </div>
              </div>
              <button
                disabled={affectedEmployees.length === 0 || (!deductionAmount && !deductionPercentage && !deductionDays) || !deductionReason}
                className="w-full mt-4 py-3 bg-white text-danger-600 rounded-xl font-bold hover:bg-danger-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {requireApproval ? 'إرسال للاعتماد' : 'تأكيد وتطبيق'}
              </button>
            </div>

            {/* Quick Stats */}
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4">إحصائيات سريعة</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-600">خصومات هذا الشهر</span>
                  <span className="font-bold text-danger-600">3,500 ر.س</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-600">عدد المتأثرين</span>
                  <span className="font-bold text-gray-800">5 موظف</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-warning-50 rounded-xl">
                  <span className="text-warning-700">بانتظار الاعتماد</span>
                  <span className="font-bold text-warning-700">1</span>
                </div>
              </div>
            </div>

            {/* Recent Deductions */}
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4">آخر الخصومات</h3>
              <div className="space-y-3">
                {deductionHistory.map(ded => (
                  <div key={ded.id} className="p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-500">{ded.date}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        ded.status === 'applied'
                          ? 'bg-success-100 text-success-700'
                          : 'bg-warning-100 text-warning-700'
                      }`}>
                        {ded.status === 'applied' ? 'مطبق' : 'قيد الانتظار'}
                      </span>
                    </div>
                    <p className="font-medium text-gray-800">{ded.scope}</p>
                    <div className="flex items-center justify-between mt-1 text-sm">
                      <span className="text-gray-500">{ded.employees} موظف • {ded.reason}</span>
                      <span className="font-bold text-danger-600">-{ded.amount.toLocaleString()} ر.س</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Employee Selector Modal */}
      {showEmployeeSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 text-lg">اختيار الموظفين</h3>
              <button
                onClick={() => setShowEmployeeSelector(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pr-10"
                placeholder="بحث بالاسم أو القسم..."
              />
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={selectAllEmployees}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                تحديد الكل ({filteredEmployees.length})
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={clearAllEmployees}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                إلغاء التحديد
              </button>
              <span className="mr-auto text-sm text-gray-500">
                محدد: {selectedEmployees.length}
              </span>
            </div>

            {/* Employee List */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredEmployees.map(emp => (
                <div
                  key={emp.id}
                  onClick={() => toggleEmployeeSelection(emp.id)}
                  className={`p-3 rounded-xl cursor-pointer transition-all flex items-center gap-3 ${
                    selectedEmployees.includes(emp.id)
                      ? 'bg-primary-50 border-2 border-primary-500'
                      : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                    selectedEmployees.includes(emp.id)
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-200'
                  }`}>
                    {selectedEmployees.includes(emp.id) && <Check size={16} />}
                  </div>
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold">
                    {emp.avatar}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{emp.name}</p>
                    <p className="text-sm text-gray-500">{emp.department} • {emp.position}</p>
                  </div>
                  <span className="text-sm font-mono text-gray-500">
                    {emp.basicSalary.toLocaleString()} ر.س
                  </span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => setShowEmployeeSelector(false)}
                className="btn-primary flex-1"
              >
                تأكيد الاختيار ({selectedEmployees.length})
              </button>
              <button
                onClick={() => setShowEmployeeSelector(false)}
                className="btn-secondary"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
