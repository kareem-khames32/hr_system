'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  DollarSign,
  Calculator,
  FileText,
  Printer,
  Download,
  CheckCircle,
  Clock,
  Calendar,
  User,
  Briefcase,
  ArrowLeft,
  AlertTriangle,
  Plus,
  Minus,
  Edit3,
  Save,
  X,
  CreditCard,
  Building2,
  Shield,
  Receipt,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

// بيانات الموظف
const employeeData = {
  id: '1',
  name: 'أحمد محمد السعيد',
  nameEn: 'Ahmed Mohammed Alsaeed',
  position: 'مطور برمجيات أول',
  department: 'تقنية المعلومات',
  employeeId: 'EMP001',
  nationalId: '1234567890',
  joinDate: '2020-03-15',
  lastWorkDay: '2026-02-28',
  terminationReason: 'استقالة',
  contractType: 'غير محدد المدة',
  basicSalary: 12000,
  housingAllowance: 2500,
  transportAllowance: 1000,
  totalSalary: 15500,
  leaveBalance: 18,
  loanBalance: 5000,
  bankName: 'بنك الراجحي',
  iban: 'SA0380000000608010167519',
}

// عناصر الاستحقاقات
const defaultEntitlements = [
  { id: '1', name: 'مكافأة نهاية الخدمة', type: 'credit', amount: 0, calculated: true, description: 'حسب نظام العمل' },
  { id: '2', name: 'بدل الإجازات المستحقة', type: 'credit', amount: 0, calculated: true, description: 'رصيد الإجازات × الراتب اليومي' },
  { id: '3', name: 'راتب الشهر الحالي', type: 'credit', amount: 0, calculated: true, description: 'حتى آخر يوم عمل' },
]

const defaultDeductions = [
  { id: 'd1', name: 'رصيد السلف', type: 'debit', amount: 5000, calculated: false, description: 'سلف غير مسددة' },
  { id: 'd2', name: 'التأمينات الاجتماعية', type: 'debit', amount: 0, calculated: true, description: 'حصة الموظف' },
]

export default function SettlementPage() {
  const params = useParams()
  const [entitlements, setEntitlements] = useState(defaultEntitlements)
  const [deductions, setDeductions] = useState(defaultDeductions)
  const [showAddItem, setShowAddItem] = useState<'credit' | 'debit' | null>(null)
  const [newItem, setNewItem] = useState({ name: '', amount: 0, description: '' })
  const [isApproved, setIsApproved] = useState(false)
  const [isPaid, setIsPaid] = useState(false)
  const [paymentDate, setPaymentDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer')

  // حساب سنوات الخدمة
  const calculateServiceYears = () => {
    const joinDate = new Date(employeeData.joinDate)
    const lastDay = new Date(employeeData.lastWorkDay)
    const years = (lastDay.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 365)
    return Math.floor(years * 10) / 10
  }

  // حساب مكافأة نهاية الخدمة
  const calculateEndOfService = () => {
    const years = calculateServiceYears()
    const salary = employeeData.basicSalary

    if (years <= 5) {
      return Math.round((salary / 2) * years)
    } else {
      const first5Years = (salary / 2) * 5
      const remainingYears = (salary) * (years - 5)
      return Math.round(first5Years + remainingYears)
    }
  }

  // حساب بدل الإجازات
  const calculateLeaveCompensation = () => {
    const dailySalary = employeeData.totalSalary / 30
    return Math.round(dailySalary * employeeData.leaveBalance)
  }

  // حساب راتب الشهر الحالي
  const calculateCurrentMonthSalary = () => {
    const lastDay = new Date(employeeData.lastWorkDay)
    const daysWorked = lastDay.getDate()
    const dailySalary = employeeData.totalSalary / 30
    return Math.round(dailySalary * daysWorked)
  }

  // حساب التأمينات
  const calculateGOSI = () => {
    return Math.round(employeeData.basicSalary * 0.1) // 10% من الراتب الأساسي
  }

  // تحديث القيم المحسوبة
  const getCalculatedEntitlements = () => {
    return entitlements.map(item => {
      if (item.calculated) {
        if (item.name === 'مكافأة نهاية الخدمة') {
          return { ...item, amount: calculateEndOfService() }
        }
        if (item.name === 'بدل الإجازات المستحقة') {
          return { ...item, amount: calculateLeaveCompensation() }
        }
        if (item.name === 'راتب الشهر الحالي') {
          return { ...item, amount: calculateCurrentMonthSalary() }
        }
      }
      return item
    })
  }

  const getCalculatedDeductions = () => {
    return deductions.map(item => {
      if (item.calculated && item.name === 'التأمينات الاجتماعية') {
        return { ...item, amount: calculateGOSI() }
      }
      return item
    })
  }

  const calculatedEntitlements = getCalculatedEntitlements()
  const calculatedDeductions = getCalculatedDeductions()

  // إجمالي الاستحقاقات
  const totalEntitlements = calculatedEntitlements.reduce((sum, item) => sum + item.amount, 0)

  // إجمالي الخصومات
  const totalDeductions = calculatedDeductions.reduce((sum, item) => sum + item.amount, 0)

  // صافي المستحقات
  const netAmount = totalEntitlements - totalDeductions

  // إضافة بند جديد
  const addNewItem = () => {
    if (!newItem.name || newItem.amount <= 0) {
      alert('الرجاء إدخال اسم البند والمبلغ')
      return
    }

    const item = {
      id: Date.now().toString(),
      name: newItem.name,
      type: showAddItem,
      amount: newItem.amount,
      calculated: false,
      description: newItem.description,
    }

    if (showAddItem === 'credit') {
      setEntitlements(prev => [...prev, item as typeof prev[0]])
    } else {
      setDeductions(prev => [...prev, item as typeof prev[0]])
    }

    setNewItem({ name: '', amount: 0, description: '' })
    setShowAddItem(null)
  }

  // حذف بند
  const removeItem = (id: string, type: 'credit' | 'debit') => {
    if (type === 'credit') {
      setEntitlements(prev => prev.filter(item => item.id !== id || item.calculated))
    } else {
      setDeductions(prev => prev.filter(item => item.id !== id || item.calculated))
    }
  }

  // اعتماد التصفية
  const approveSettlement = () => {
    setIsApproved(true)
  }

  // تأكيد الدفع
  const confirmPayment = () => {
    if (!paymentDate) {
      alert('الرجاء تحديد تاريخ الدفع')
      return
    }
    setIsPaid(true)
    alert('تم تأكيد صرف المستحقات بنجاح')
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/employees/${params.id}`}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-500" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">تصفية مستحقات نهاية الخدمة</h1>
              <p className="text-gray-500 mt-1">حساب وصرف المستحقات النهائية للموظف</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-secondary flex items-center gap-2">
              <Printer size={18} />
              طباعة
            </button>
            <button className="btn-secondary flex items-center gap-2">
              <Download size={18} />
              تصدير PDF
            </button>
          </div>
        </div>

        {/* Status Banner */}
        {isPaid ? (
          <div className="bg-success-50 border border-success-200 rounded-xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-success-100 rounded-xl flex items-center justify-center">
              <CheckCircle size={24} className="text-success-600" />
            </div>
            <div>
              <h3 className="font-bold text-success-800">تم صرف المستحقات</h3>
              <p className="text-sm text-success-700">تم صرف المستحقات بتاريخ {paymentDate}</p>
            </div>
          </div>
        ) : isApproved ? (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Clock size={24} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-blue-800">تم اعتماد التصفية</h3>
              <p className="text-sm text-blue-700">في انتظار صرف المستحقات</p>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-12 gap-6">
          {/* Employee Info */}
          <div className="col-span-4 space-y-6">
            {/* Employee Card */}
            <div className="card">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                  <User size={32} className="text-gray-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{employeeData.name}</h2>
                  <p className="text-gray-500">{employeeData.position}</p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">الرقم الوظيفي</span>
                  <span className="font-medium text-gray-800">{employeeData.employeeId}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">رقم الهوية</span>
                  <span className="font-medium text-gray-800">{employeeData.nationalId}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">القسم</span>
                  <span className="font-medium text-gray-800">{employeeData.department}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">تاريخ التعيين</span>
                  <span className="font-medium text-gray-800">{employeeData.joinDate}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">آخر يوم عمل</span>
                  <span className="font-medium text-gray-800">{employeeData.lastWorkDay}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">سبب الإنهاء</span>
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                    {employeeData.terminationReason}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500">سنوات الخدمة</span>
                  <span className="font-bold text-primary-600">{calculateServiceYears()} سنة</span>
                </div>
              </div>
            </div>

            {/* Salary Details */}
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <DollarSign size={18} className="text-primary-500" />
                تفاصيل الراتب
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">الراتب الأساسي</span>
                  <span className="font-medium text-gray-800">{employeeData.basicSalary.toLocaleString()} ر.س</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">بدل السكن</span>
                  <span className="font-medium text-gray-800">{employeeData.housingAllowance.toLocaleString()} ر.س</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">بدل المواصلات</span>
                  <span className="font-medium text-gray-800">{employeeData.transportAllowance.toLocaleString()} ر.س</span>
                </div>
                <div className="flex justify-between py-2 bg-gray-50 -mx-6 px-6 rounded-lg">
                  <span className="font-bold text-gray-800">الإجمالي</span>
                  <span className="font-bold text-primary-600">{employeeData.totalSalary.toLocaleString()} ر.س</span>
                </div>
              </div>
            </div>

            {/* Bank Info */}
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Building2 size={18} className="text-primary-500" />
                معلومات الحساب البنكي
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">البنك</span>
                  <span className="font-medium text-gray-800">{employeeData.bankName}</span>
                </div>
                <div className="py-2">
                  <span className="text-gray-500">IBAN</span>
                  <p className="font-medium text-gray-800 mt-1 font-mono text-xs">{employeeData.iban}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Settlement Details */}
          <div className="col-span-8 space-y-6">
            {/* Entitlements */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <Plus size={18} className="text-success-500" />
                  الاستحقاقات
                </h3>
                {!isApproved && (
                  <button
                    onClick={() => setShowAddItem('credit')}
                    className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    <Plus size={16} />
                    إضافة بند
                  </button>
                )}
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">البند</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">الوصف</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">المبلغ</th>
                      {!isApproved && <th className="w-10"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {calculatedEntitlements.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{item.name}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{item.description}</td>
                        <td className="px-4 py-3 text-left">
                          <span className="font-bold text-success-600">
                            +{item.amount.toLocaleString()} ر.س
                          </span>
                        </td>
                        {!isApproved && (
                          <td className="px-4 py-3">
                            {!item.calculated && (
                              <button
                                onClick={() => removeItem(item.id, 'credit')}
                                className="p-1 rounded hover:bg-red-100 text-red-500"
                              >
                                <X size={16} />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-success-50">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 font-bold text-gray-800">
                        إجمالي الاستحقاقات
                      </td>
                      <td className="px-4 py-3 text-left font-bold text-success-600">
                        +{totalEntitlements.toLocaleString()} ر.س
                      </td>
                      {!isApproved && <td></td>}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Deductions */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <Minus size={18} className="text-red-500" />
                  الخصومات
                </h3>
                {!isApproved && (
                  <button
                    onClick={() => setShowAddItem('debit')}
                    className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    <Plus size={16} />
                    إضافة خصم
                  </button>
                )}
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">البند</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">الوصف</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">المبلغ</th>
                      {!isApproved && <th className="w-10"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {calculatedDeductions.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{item.name}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{item.description}</td>
                        <td className="px-4 py-3 text-left">
                          <span className="font-bold text-red-600">
                            -{item.amount.toLocaleString()} ر.س
                          </span>
                        </td>
                        {!isApproved && (
                          <td className="px-4 py-3">
                            {!item.calculated && (
                              <button
                                onClick={() => removeItem(item.id, 'debit')}
                                className="p-1 rounded hover:bg-red-100 text-red-500"
                              >
                                <X size={16} />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-red-50">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 font-bold text-gray-800">
                        إجمالي الخصومات
                      </td>
                      <td className="px-4 py-3 text-left font-bold text-red-600">
                        -{totalDeductions.toLocaleString()} ر.س
                      </td>
                      {!isApproved && <td></td>}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Net Amount */}
            <div className="card bg-gradient-to-l from-primary-50 to-white border-2 border-primary-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center">
                    <Receipt size={32} className="text-primary-600" />
                  </div>
                  <div>
                    <p className="text-gray-600">صافي المستحقات النهائية</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {totalEntitlements.toLocaleString()} - {totalDeductions.toLocaleString()} = {netAmount.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-4xl font-bold text-primary-600">
                    {netAmount.toLocaleString()}
                  </p>
                  <p className="text-gray-500">ريال سعودي</p>
                </div>
              </div>
            </div>

            {/* Payment Section */}
            {isApproved && !isPaid && (
              <div className="card">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <CreditCard size={18} className="text-primary-500" />
                  تأكيد الصرف
                </h3>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="label">تاريخ الصرف *</label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="label">طريقة الصرف</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="input w-full"
                    >
                      <option value="bank_transfer">تحويل بنكي</option>
                      <option value="check">شيك</option>
                      <option value="cash">نقدي</option>
                    </select>
                  </div>
                </div>

                <button onClick={confirmPayment} className="btn-success w-full flex items-center justify-center gap-2">
                  <CheckCircle size={18} />
                  تأكيد صرف المستحقات
                </button>
              </div>
            )}

            {/* Actions */}
            {!isApproved && (
              <div className="flex items-center justify-between">
                <div className="p-4 bg-yellow-50 rounded-xl flex items-start gap-3 flex-1 ml-4">
                  <AlertTriangle size={20} className="text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-700">
                    <p className="font-medium">ملاحظة:</p>
                    <p>بعد الاعتماد لن يمكن تعديل بنود التصفية</p>
                  </div>
                </div>
                <button onClick={approveSettlement} className="btn-primary flex items-center gap-2">
                  <Shield size={18} />
                  اعتماد التصفية
                </button>
              </div>
            )}

            {/* Legal Note */}
            <div className="p-4 bg-blue-50 rounded-xl flex items-start gap-3">
              <Shield size={20} className="text-blue-500 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium">الأساس القانوني:</p>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>مكافأة نهاية الخدمة: نصف راتب عن كل سنة من السنوات الخمس الأولى، وراتب كامل عن كل سنة بعد ذلك (المادة 84 من نظام العمل)</li>
                  <li>بدل الإجازات: تعويض عن الإجازات غير المستخدمة بالراتب اليومي الكامل (المادة 111)</li>
                  <li>يجب صرف المستحقات خلال أسبوع من انتهاء العقد (المادة 88)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Add Item Modal */}
        {showAddItem && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">
                  إضافة {showAddItem === 'credit' ? 'استحقاق' : 'خصم'}
                </h2>
                <button onClick={() => setShowAddItem(null)} className="p-2 rounded-lg hover:bg-gray-100">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="label">اسم البند *</label>
                  <input
                    type="text"
                    value={newItem.name}
                    onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={showAddItem === 'credit' ? 'مثال: مكافأة إضافية' : 'مثال: تأمين طبي'}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="label">المبلغ (ر.س) *</label>
                  <input
                    type="number"
                    value={newItem.amount || ''}
                    onChange={(e) => setNewItem(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="label">الوصف</label>
                  <input
                    type="text"
                    value={newItem.description}
                    onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="وصف اختياري..."
                    className="input w-full"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 flex gap-3">
                <button onClick={addNewItem} className="flex-1 btn-primary">
                  إضافة
                </button>
                <button onClick={() => setShowAddItem(null)} className="flex-1 btn-secondary">
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
