'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Plus,
  FileText,
  Calendar,
  Users,
  DollarSign,
  Clock,
  BarChart3,
  PieChart,
  TrendingUp,
  Download,
  Play,
  Save,
  Settings,
  Filter,
  Trash2,
  Copy,
  Eye,
} from 'lucide-react'

interface SavedReport {
  id: string
  name: string
  type: string
  lastRun: string
  schedule?: string
  createdBy: string
}

const savedReports: SavedReport[] = [
  {
    id: '1',
    name: 'تقرير الحضور الشهري',
    type: 'attendance',
    lastRun: '2024-01-21 09:00',
    schedule: 'شهرياً',
    createdBy: 'أحمد محمد',
  },
  {
    id: '2',
    name: 'تقرير الرواتب الربع سنوي',
    type: 'payroll',
    lastRun: '2024-01-15 14:30',
    schedule: 'ربع سنوي',
    createdBy: 'سارة أحمد',
  },
  {
    id: '3',
    name: 'تحليل أداء الموظفين',
    type: 'performance',
    lastRun: '2024-01-20 11:00',
    createdBy: 'محمد علي',
  },
]

const reportModules = [
  { id: 'employees', name: 'الموظفين', icon: Users, color: 'bg-blue-100 text-blue-600' },
  { id: 'attendance', name: 'الحضور', icon: Clock, color: 'bg-green-100 text-green-600' },
  { id: 'payroll', name: 'الرواتب', icon: DollarSign, color: 'bg-purple-100 text-purple-600' },
  { id: 'leaves', name: 'الإجازات', icon: Calendar, color: 'bg-orange-100 text-orange-600' },
  { id: 'performance', name: 'الأداء', icon: TrendingUp, color: 'bg-pink-100 text-pink-600' },
  { id: 'training', name: 'التدريب', icon: BarChart3, color: 'bg-cyan-100 text-cyan-600' },
]

const employeeFields = [
  { id: 'name', name: 'الاسم', selected: true },
  { id: 'employeeId', name: 'رقم الموظف', selected: true },
  { id: 'department', name: 'القسم', selected: true },
  { id: 'position', name: 'المسمى الوظيفي', selected: true },
  { id: 'joinDate', name: 'تاريخ الالتحاق', selected: false },
  { id: 'salary', name: 'الراتب', selected: false },
  { id: 'status', name: 'الحالة', selected: false },
  { id: 'manager', name: 'المدير', selected: false },
  { id: 'email', name: 'البريد الإلكتروني', selected: false },
  { id: 'phone', name: 'رقم الهاتف', selected: false },
]

export default function CustomReportsPage() {
  const [selectedModule, setSelectedModule] = useState('')
  const [selectedFields, setSelectedFields] = useState<string[]>(['name', 'employeeId', 'department', 'position'])
  const [reportName, setReportName] = useState('')
  const [dateRange, setDateRange] = useState({ from: '', to: '' })
  const [filterDepartment, setFilterDepartment] = useState('all')

  const toggleField = (fieldId: string) => {
    setSelectedFields((prev) =>
      prev.includes(fieldId)
        ? prev.filter((f) => f !== fieldId)
        : [...prev, fieldId]
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">منشئ التقارير المخصصة</h1>
            <p className="text-gray-500 mt-1">إنشاء تقارير مخصصة حسب احتياجاتك</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Report Builder */}
          <div className="col-span-2 space-y-6">
            {/* Step 1: Select Module */}
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm">
                  1
                </span>
                اختر الموديول
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {reportModules.map((module) => {
                  const Icon = module.icon
                  return (
                    <button
                      key={module.id}
                      onClick={() => setSelectedModule(module.id)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        selectedModule === module.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-10 h-10 ${module.color} rounded-xl flex items-center justify-center mb-2`}>
                        <Icon size={20} />
                      </div>
                      <p className="font-medium text-gray-800">{module.name}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Step 2: Select Fields */}
            {selectedModule && (
              <div className="card">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm">
                    2
                  </span>
                  اختر الحقول
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {employeeFields.map((field) => (
                    <label
                      key={field.id}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                        selectedFields.includes(field.id)
                          ? 'bg-primary-50 border border-primary-200'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFields.includes(field.id)}
                        onChange={() => toggleField(field.id)}
                        className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                      />
                      <span className="text-gray-700">{field.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Filters */}
            {selectedModule && (
              <div className="card">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm">
                    3
                  </span>
                  الفلاتر
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      من تاريخ
                    </label>
                    <input
                      type="date"
                      className="input w-full"
                      value={dateRange.from}
                      onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      إلى تاريخ
                    </label>
                    <input
                      type="date"
                      className="input w-full"
                      value={dateRange.to}
                      onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      القسم
                    </label>
                    <select
                      className="input w-full"
                      value={filterDepartment}
                      onChange={(e) => setFilterDepartment(e.target.value)}
                    >
                      <option value="all">جميع الأقسام</option>
                      <option value="it">تقنية المعلومات</option>
                      <option value="hr">الموارد البشرية</option>
                      <option value="finance">المالية</option>
                      <option value="sales">المبيعات</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Report Options */}
            {selectedModule && (
              <div className="card">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm">
                    4
                  </span>
                  خيارات التقرير
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      اسم التقرير
                    </label>
                    <input
                      type="text"
                      className="input w-full"
                      placeholder="مثال: تقرير الموظفين الشهري"
                      value={reportName}
                      onChange={(e) => setReportName(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                      />
                      <span className="text-gray-700">تضمين الرسوم البيانية</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                      />
                      <span className="text-gray-700">تضمين الملخص</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            {selectedModule && (
              <div className="flex items-center gap-3">
                <button className="btn-primary flex items-center gap-2">
                  <Play size={18} />
                  تشغيل التقرير
                </button>
                <button className="btn-secondary flex items-center gap-2">
                  <Save size={18} />
                  حفظ التقرير
                </button>
                <button className="btn-secondary flex items-center gap-2">
                  <Download size={18} />
                  تصدير Excel
                </button>
                <button className="btn-secondary flex items-center gap-2">
                  <Download size={18} />
                  تصدير PDF
                </button>
              </div>
            )}
          </div>

          {/* Sidebar - Saved Reports */}
          <div className="space-y-6">
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FileText size={20} className="text-primary-500" />
                التقارير المحفوظة
              </h3>
              <div className="space-y-3">
                {savedReports.map((report) => (
                  <div
                    key={report.id}
                    className="p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-800">{report.name}</h4>
                      {report.schedule && (
                        <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded text-xs">
                          {report.schedule}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mb-2">
                      آخر تشغيل: {report.lastRun}
                    </p>
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 bg-white rounded-lg hover:bg-gray-200">
                        <Play size={14} className="text-gray-600" />
                      </button>
                      <button className="p-1.5 bg-white rounded-lg hover:bg-gray-200">
                        <Eye size={14} className="text-gray-600" />
                      </button>
                      <button className="p-1.5 bg-white rounded-lg hover:bg-gray-200">
                        <Copy size={14} className="text-gray-600" />
                      </button>
                      <button className="p-1.5 bg-white rounded-lg hover:bg-red-100">
                        <Trash2 size={14} className="text-gray-600 hover:text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Reports */}
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4">تقارير سريعة</h3>
              <div className="space-y-2">
                <button className="w-full text-right p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-gray-700">
                  تقرير الحضور اليومي
                </button>
                <button className="w-full text-right p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-gray-700">
                  تقرير الإجازات المعلقة
                </button>
                <button className="w-full text-right p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-gray-700">
                  تقرير الموظفين الجدد
                </button>
                <button className="w-full text-right p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-gray-700">
                  تقرير مستحقات الرواتب
                </button>
              </div>
            </div>

            {/* Help */}
            <div className="card bg-blue-50 border border-blue-200">
              <h3 className="font-bold text-blue-800 mb-2">نصائح</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• اختر الحقول الضرورية فقط لتقرير أسرع</li>
                <li>• استخدم الفلاتر لتضييق نطاق البيانات</li>
                <li>• يمكنك جدولة التقارير للتشغيل التلقائي</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
