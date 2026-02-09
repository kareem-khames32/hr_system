'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  UserMinus,
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  X,
  Save,
  ArrowLeft,
  Calculator,
  ClipboardList,
  MessageSquare,
  Package,
  Shield,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

// بيانات الموظف (للعرض)
const employeeData = {
  id: '1',
  name: 'أحمد محمد السعيد',
  nameEn: 'Ahmed Mohammed Alsaeed',
  position: 'مطور برمجيات أول',
  department: 'تقنية المعلومات',
  employeeId: 'EMP001',
  joinDate: '2020-03-15',
  contractType: 'غير محدد المدة',
  basicSalary: 12000,
  totalSalary: 15500,
  leaveBalance: 18,
  loanBalance: 5000,
  avatar: null,
}

// أسباب إنهاء الخدمة
const terminationReasons = [
  { id: 'resignation', name: 'استقالة', icon: '📝', description: 'الموظف قدم استقالته طوعياً' },
  { id: 'termination', name: 'إنهاء خدمات', icon: '⚠️', description: 'إنهاء العقد من قبل الشركة' },
  { id: 'contract_end', name: 'انتهاء العقد', icon: '📋', description: 'انتهاء مدة العقد المحدد' },
  { id: 'retirement', name: 'تقاعد', icon: '🎖️', description: 'بلوغ سن التقاعد' },
  { id: 'death', name: 'وفاة', icon: '🕯️', description: 'وفاة الموظف' },
  { id: 'disability', name: 'عجز صحي', icon: '🏥', description: 'عدم القدرة على العمل لأسباب صحية' },
]

// خطوات إنهاء الخدمة
const terminationSteps = [
  { id: 1, title: 'سبب الإنهاء', icon: FileText },
  { id: 2, title: 'التفاصيل', icon: Calendar },
  { id: 3, title: 'المستحقات', icon: DollarSign },
  { id: 4, title: 'تسليم العهد', icon: Package },
  { id: 5, title: 'المراجعة', icon: CheckCircle },
]

// قائمة العهد
const custodyItems = [
  { id: '1', name: 'لابتوب', serialNumber: 'LP-2024-001', status: 'pending' },
  { id: '2', name: 'هاتف جوال', serialNumber: 'PH-2024-015', status: 'pending' },
  { id: '3', name: 'بطاقة الدخول', serialNumber: 'AC-001', status: 'pending' },
  { id: '4', name: 'مفاتيح المكتب', serialNumber: 'KEY-105', status: 'pending' },
  { id: '5', name: 'سيارة الشركة', serialNumber: 'CAR-2024-003', status: 'pending' },
]

export default function TerminateEmployeePage() {
  const params = useParams()
  const [currentStep, setCurrentStep] = useState(1)
  const [terminationData, setTerminationData] = useState({
    reason: '',
    lastWorkDay: '',
    noticeDate: '',
    noticePeriod: 30,
    notes: '',
    exitInterviewDone: false,
    exitInterviewNotes: '',
    custodyStatus: custodyItems.map(item => ({ ...item, status: 'pending' as 'pending' | 'returned' | 'lost' })),
  })

  // حساب سنوات الخدمة
  const calculateServiceYears = () => {
    const joinDate = new Date(employeeData.joinDate)
    const lastDay = terminationData.lastWorkDay ? new Date(terminationData.lastWorkDay) : new Date()
    const years = (lastDay.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 365)
    return Math.floor(years * 10) / 10
  }

  // حساب مكافأة نهاية الخدمة
  const calculateEndOfService = () => {
    const years = calculateServiceYears()
    const salary = employeeData.basicSalary

    // حسب نظام العمل السعودي
    if (years <= 5) {
      return (salary / 2) * years
    } else {
      const first5Years = (salary / 2) * 5
      const remainingYears = (salary) * (years - 5)
      return first5Years + remainingYears
    }
  }

  // حساب بدل الإجازات
  const calculateLeaveCompensation = () => {
    const dailySalary = employeeData.totalSalary / 30
    return dailySalary * employeeData.leaveBalance
  }

  // إجمالي المستحقات
  const calculateTotalDue = () => {
    const endOfService = calculateEndOfService()
    const leaveCompensation = calculateLeaveCompensation()
    const loans = employeeData.loanBalance
    return endOfService + leaveCompensation - loans
  }

  const nextStep = () => {
    if (currentStep < terminationSteps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const updateCustodyStatus = (itemId: string, status: 'pending' | 'returned' | 'lost') => {
    setTerminationData(prev => ({
      ...prev,
      custodyStatus: prev.custodyStatus.map(item =>
        item.id === itemId ? { ...item, status } : item
      ),
    }))
  }

  const handleSubmit = () => {
    if (!terminationData.reason || !terminationData.lastWorkDay) {
      alert('الرجاء ملء جميع الحقول المطلوبة')
      return
    }
    // هنا يتم إرسال البيانات للسيرفر
    alert('تم إنهاء خدمة الموظف بنجاح')
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
              <h1 className="text-2xl font-bold text-gray-800">إنهاء خدمة موظف</h1>
              <p className="text-gray-500 mt-1">معالجة إنهاء خدمة {employeeData.name}</p>
            </div>
          </div>
          <Link href={`/employees/${params.id}`} className="btn-secondary flex items-center gap-2">
            <X size={18} />
            إلغاء
          </Link>
        </div>

        {/* Employee Info Card */}
        <div className="card bg-gradient-to-l from-red-50 to-white border-r-4 border-red-500">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center">
              <UserMinus size={40} className="text-red-500" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-800">{employeeData.name}</h2>
              <p className="text-gray-500">{employeeData.position} - {employeeData.department}</p>
              <div className="flex items-center gap-6 mt-2 text-sm">
                <span className="text-gray-500">
                  الرقم الوظيفي: <strong className="text-gray-700">{employeeData.employeeId}</strong>
                </span>
                <span className="text-gray-500">
                  تاريخ التعيين: <strong className="text-gray-700">{employeeData.joinDate}</strong>
                </span>
                <span className="text-gray-500">
                  سنوات الخدمة: <strong className="text-gray-700">{calculateServiceYears()} سنة</strong>
                </span>
              </div>
            </div>
            <div className="text-left">
              <p className="text-sm text-gray-500">الراتب الإجمالي</p>
              <p className="text-2xl font-bold text-gray-800">{employeeData.totalSalary.toLocaleString()} ر.س</p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="card">
          <div className="flex items-center justify-between">
            {terminationSteps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                      currentStep === step.id
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                        : currentStep > step.id
                        ? 'bg-success-500 text-white'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    <step.icon size={22} />
                  </div>
                  <span
                    className={`mt-2 text-sm font-medium ${
                      currentStep === step.id
                        ? 'text-red-600'
                        : currentStep > step.id
                        ? 'text-success-600'
                        : 'text-gray-400'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {index < terminationSteps.length - 1 && (
                  <div
                    className={`w-20 h-1 mx-4 rounded-full transition-all ${
                      currentStep > step.id ? 'bg-success-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="card">
          {/* Step 1: Termination Reason */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-4">
                سبب إنهاء الخدمة
              </h2>

              <div className="grid grid-cols-3 gap-4">
                {terminationReasons.map(reason => (
                  <button
                    key={reason.id}
                    onClick={() => setTerminationData(prev => ({ ...prev, reason: reason.id }))}
                    className={`p-6 rounded-xl border-2 text-right transition-all ${
                      terminationData.reason === reason.id
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-3xl mb-3 block">{reason.icon}</span>
                    <h3 className={`font-bold text-lg ${
                      terminationData.reason === reason.id ? 'text-red-700' : 'text-gray-800'
                    }`}>
                      {reason.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-2">{reason.description}</p>
                  </button>
                ))}
              </div>

              {terminationData.reason && (
                <div className="p-4 bg-yellow-50 rounded-xl flex items-start gap-3">
                  <AlertTriangle size={20} className="text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800">تنبيه هام</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      {terminationData.reason === 'resignation' && 'يجب التأكد من استلام خطاب الاستقالة موقع من الموظف.'}
                      {terminationData.reason === 'termination' && 'يجب التأكد من وجود مبررات قانونية ووثائق داعمة.'}
                      {terminationData.reason === 'contract_end' && 'يجب إشعار الموظف قبل انتهاء العقد بالفترة المحددة.'}
                      {terminationData.reason === 'retirement' && 'يجب التنسيق مع التأمينات الاجتماعية.'}
                      {terminationData.reason === 'death' && 'يجب تسليم المستحقات للورثة الشرعيين.'}
                      {terminationData.reason === 'disability' && 'يجب الحصول على تقرير طبي معتمد.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Details */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-4">
                تفاصيل إنهاء الخدمة
              </h2>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="label">تاريخ تقديم الإشعار / الاستقالة *</label>
                  <input
                    type="date"
                    value={terminationData.noticeDate}
                    onChange={(e) => setTerminationData(prev => ({ ...prev, noticeDate: e.target.value }))}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="label">فترة الإشعار (أيام)</label>
                  <input
                    type="number"
                    value={terminationData.noticePeriod}
                    onChange={(e) => setTerminationData(prev => ({ ...prev, noticePeriod: parseInt(e.target.value) || 0 }))}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="label">آخر يوم عمل *</label>
                  <input
                    type="date"
                    value={terminationData.lastWorkDay}
                    onChange={(e) => setTerminationData(prev => ({ ...prev, lastWorkDay: e.target.value }))}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="label">نوع العقد</label>
                  <input
                    type="text"
                    value={employeeData.contractType}
                    disabled
                    className="input w-full bg-gray-50"
                  />
                </div>
              </div>

              <div>
                <label className="label">ملاحظات إضافية</label>
                <textarea
                  value={terminationData.notes}
                  onChange={(e) => setTerminationData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="أي ملاحظات أو تفاصيل إضافية..."
                  className="input w-full h-32 resize-none"
                />
              </div>

              {/* Exit Interview */}
              <div className="p-4 bg-gray-50 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageSquare size={20} className="text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-800">مقابلة الخروج</p>
                      <p className="text-sm text-gray-500">إجراء مقابلة مع الموظف قبل المغادرة</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setTerminationData(prev => ({ ...prev, exitInterviewDone: !prev.exitInterviewDone }))}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      terminationData.exitInterviewDone
                        ? 'bg-success-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {terminationData.exitInterviewDone ? 'تمت ✓' : 'لم تتم'}
                  </button>
                </div>

                {terminationData.exitInterviewDone && (
                  <div>
                    <label className="label">ملخص مقابلة الخروج</label>
                    <textarea
                      value={terminationData.exitInterviewNotes}
                      onChange={(e) => setTerminationData(prev => ({ ...prev, exitInterviewNotes: e.target.value }))}
                      placeholder="ملاحظات الموظف وأسباب المغادرة..."
                      className="input w-full h-24 resize-none"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Settlement */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-4 flex items-center gap-2">
                <Calculator size={20} className="text-primary-500" />
                حساب المستحقات النهائية
              </h2>

              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-xl">
                  <p className="text-sm text-blue-600">سنوات الخدمة</p>
                  <p className="text-2xl font-bold text-blue-700">{calculateServiceYears()}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-xl">
                  <p className="text-sm text-green-600">رصيد الإجازات</p>
                  <p className="text-2xl font-bold text-green-700">{employeeData.leaveBalance} يوم</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-xl">
                  <p className="text-sm text-orange-600">السلف المتبقية</p>
                  <p className="text-2xl font-bold text-orange-700">{employeeData.loanBalance.toLocaleString()} ر.س</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-xl">
                  <p className="text-sm text-purple-600">الراتب الأساسي</p>
                  <p className="text-2xl font-bold text-purple-700">{employeeData.basicSalary.toLocaleString()} ر.س</p>
                </div>
              </div>

              {/* Calculation Details */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                  <h3 className="font-bold text-gray-800">تفاصيل الحساب</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  <div className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">مكافأة نهاية الخدمة</p>
                      <p className="text-sm text-gray-500">
                        {calculateServiceYears() <= 5
                          ? `نصف راتب × ${calculateServiceYears()} سنة`
                          : `(نصف راتب × 5) + (راتب كامل × ${(calculateServiceYears() - 5).toFixed(1)})`
                        }
                      </p>
                    </div>
                    <p className="text-lg font-bold text-success-600">
                      +{calculateEndOfService().toLocaleString()} ر.س
                    </p>
                  </div>
                  <div className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">بدل الإجازات المستحقة</p>
                      <p className="text-sm text-gray-500">
                        {employeeData.leaveBalance} يوم × {(employeeData.totalSalary / 30).toFixed(0)} ر.س/يوم
                      </p>
                    </div>
                    <p className="text-lg font-bold text-success-600">
                      +{calculateLeaveCompensation().toLocaleString()} ر.س
                    </p>
                  </div>
                  <div className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">خصم السلف والقروض</p>
                      <p className="text-sm text-gray-500">رصيد السلف المتبقي</p>
                    </div>
                    <p className="text-lg font-bold text-red-600">
                      -{employeeData.loanBalance.toLocaleString()} ر.س
                    </p>
                  </div>
                </div>
                <div className="bg-primary-50 px-6 py-4 flex items-center justify-between">
                  <p className="text-lg font-bold text-gray-800">إجمالي المستحقات النهائية</p>
                  <p className="text-2xl font-bold text-primary-600">
                    {calculateTotalDue().toLocaleString()} ر.س
                  </p>
                </div>
              </div>

              {/* Info Note */}
              <div className="p-4 bg-blue-50 rounded-xl flex items-start gap-3">
                <Shield size={20} className="text-blue-500 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium">ملاحظة قانونية:</p>
                  <p className="mt-1">
                    يتم احتساب مكافأة نهاية الخدمة وفق نظام العمل السعودي: نصف راتب عن كل سنة من السنوات الخمس الأولى،
                    وراتب كامل عن كل سنة بعد ذلك.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Custody */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-4 flex items-center gap-2">
                <Package size={20} className="text-primary-500" />
                تسليم العهد والممتلكات
              </h2>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-right px-6 py-3 text-sm font-medium text-gray-600">الصنف</th>
                      <th className="text-right px-6 py-3 text-sm font-medium text-gray-600">الرقم التسلسلي</th>
                      <th className="text-center px-6 py-3 text-sm font-medium text-gray-600">الحالة</th>
                      <th className="text-center px-6 py-3 text-sm font-medium text-gray-600">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {terminationData.custodyStatus.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-800">{item.name}</p>
                        </td>
                        <td className="px-6 py-4 text-gray-500">{item.serialNumber}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            item.status === 'returned' ? 'bg-success-100 text-success-700' :
                            item.status === 'lost' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {item.status === 'returned' ? 'تم الاستلام' :
                             item.status === 'lost' ? 'مفقود' : 'قيد الانتظار'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => updateCustodyStatus(item.id, 'returned')}
                              className={`px-3 py-1 rounded-lg text-sm transition-all ${
                                item.status === 'returned'
                                  ? 'bg-success-500 text-white'
                                  : 'bg-gray-100 text-gray-600 hover:bg-success-100 hover:text-success-700'
                              }`}
                            >
                              تم الاستلام
                            </button>
                            <button
                              onClick={() => updateCustodyStatus(item.id, 'lost')}
                              className={`px-3 py-1 rounded-lg text-sm transition-all ${
                                item.status === 'lost'
                                  ? 'bg-red-500 text-white'
                                  : 'bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-700'
                              }`}
                            >
                              مفقود
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-success-50 rounded-xl text-center">
                  <p className="text-3xl font-bold text-success-600">
                    {terminationData.custodyStatus.filter(i => i.status === 'returned').length}
                  </p>
                  <p className="text-sm text-success-700 mt-1">تم استلامها</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-xl text-center">
                  <p className="text-3xl font-bold text-yellow-600">
                    {terminationData.custodyStatus.filter(i => i.status === 'pending').length}
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">قيد الانتظار</p>
                </div>
                <div className="p-4 bg-red-50 rounded-xl text-center">
                  <p className="text-3xl font-bold text-red-600">
                    {terminationData.custodyStatus.filter(i => i.status === 'lost').length}
                  </p>
                  <p className="text-sm text-red-700 mt-1">مفقود</p>
                </div>
              </div>

              {terminationData.custodyStatus.some(i => i.status === 'lost') && (
                <div className="p-4 bg-red-50 rounded-xl flex items-start gap-3">
                  <AlertTriangle size={20} className="text-red-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">تنبيه: يوجد عهد مفقودة</p>
                    <p className="text-sm text-red-700 mt-1">
                      سيتم خصم قيمة العهد المفقودة من المستحقات النهائية للموظف.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-4 flex items-center gap-2">
                <ClipboardList size={20} className="text-primary-500" />
                مراجعة وتأكيد إنهاء الخدمة
              </h2>

              {/* Summary Sections */}
              <div className="space-y-4">
                {/* Employee Info */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <h3 className="font-bold text-gray-800 mb-3">بيانات الموظف</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">الاسم</p>
                      <p className="font-medium text-gray-800">{employeeData.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">الرقم الوظيفي</p>
                      <p className="font-medium text-gray-800">{employeeData.employeeId}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">القسم</p>
                      <p className="font-medium text-gray-800">{employeeData.department}</p>
                    </div>
                  </div>
                </div>

                {/* Termination Details */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <h3 className="font-bold text-gray-800 mb-3">تفاصيل الإنهاء</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">سبب الإنهاء</p>
                      <p className="font-medium text-gray-800">
                        {terminationReasons.find(r => r.id === terminationData.reason)?.name || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">آخر يوم عمل</p>
                      <p className="font-medium text-gray-800">{terminationData.lastWorkDay || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">سنوات الخدمة</p>
                      <p className="font-medium text-gray-800">{calculateServiceYears()} سنة</p>
                    </div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="p-4 bg-primary-50 rounded-xl">
                  <h3 className="font-bold text-gray-800 mb-3">ملخص المستحقات المالية</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">مكافأة نهاية الخدمة</span>
                      <span className="font-medium text-success-600">+{calculateEndOfService().toLocaleString()} ر.س</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">بدل الإجازات</span>
                      <span className="font-medium text-success-600">+{calculateLeaveCompensation().toLocaleString()} ر.س</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">خصم السلف</span>
                      <span className="font-medium text-red-600">-{employeeData.loanBalance.toLocaleString()} ر.س</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-primary-200">
                      <span className="font-bold text-gray-800">الإجمالي</span>
                      <span className="font-bold text-primary-600">{calculateTotalDue().toLocaleString()} ر.س</span>
                    </div>
                  </div>
                </div>

                {/* Custody Status */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <h3 className="font-bold text-gray-800 mb-3">حالة العهد</h3>
                  <div className="flex gap-6 text-sm">
                    <span className="text-success-600">
                      ✓ تم استلام {terminationData.custodyStatus.filter(i => i.status === 'returned').length} أصناف
                    </span>
                    {terminationData.custodyStatus.some(i => i.status === 'pending') && (
                      <span className="text-yellow-600">
                        ⏳ {terminationData.custodyStatus.filter(i => i.status === 'pending').length} قيد الانتظار
                      </span>
                    )}
                    {terminationData.custodyStatus.some(i => i.status === 'lost') && (
                      <span className="text-red-600">
                        ✕ {terminationData.custodyStatus.filter(i => i.status === 'lost').length} مفقود
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Final Confirmation */}
              <div className="p-4 bg-red-50 rounded-xl flex items-start gap-3">
                <AlertTriangle size={20} className="text-red-500 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">تأكيد نهائي</p>
                  <p className="text-sm text-red-700 mt-1">
                    بالضغط على "تأكيد إنهاء الخدمة" سيتم:
                  </p>
                  <ul className="text-sm text-red-700 mt-2 list-disc list-inside space-y-1">
                    <li>إلغاء صلاحيات الدخول للموظف</li>
                    <li>نقل الموظف لقائمة المؤرشفين</li>
                    <li>إنشاء سجل التصفية المالية</li>
                    <li>إصدار شهادة نهاية الخدمة</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
              السابق
            </button>

            <div className="flex items-center gap-3">
              {currentStep === terminationSteps.length ? (
                <>
                  <Link href={`/employees/${params.id}/settlement`} className="btn-secondary flex items-center gap-2">
                    <DollarSign size={18} />
                    صفحة التصفية التفصيلية
                  </Link>
                  <button onClick={handleSubmit} className="btn-danger flex items-center gap-2">
                    <UserMinus size={18} />
                    تأكيد إنهاء الخدمة
                  </button>
                </>
              ) : (
                <button
                  onClick={nextStep}
                  disabled={currentStep === 1 && !terminationData.reason}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  التالي
                  <ChevronLeft size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
