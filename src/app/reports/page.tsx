'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Download,
  Calendar,
  FileText,
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Clock,
  Briefcase,
  Target,
  Filter,
  ChevronDown,
  Eye,
  Printer,
  Share2,
  RefreshCw,
  Building2,
  UserCheck,
  UserMinus,
  AlertCircle,
} from 'lucide-react'

interface Report {
  id: string
  title: string
  description: string
  category: string
  type: 'chart' | 'table' | 'mixed'
  lastUpdated: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  icon: string
}

const reports: Report[] = [
  {
    id: '1',
    title: 'تقرير القوى العاملة',
    description: 'نظرة شاملة على توزيع الموظفين حسب الأقسام والمستويات',
    category: 'الموارد البشرية',
    type: 'chart',
    lastUpdated: '2024-01-25',
    frequency: 'monthly',
    icon: '👥',
  },
  {
    id: '2',
    title: 'تقرير الحضور والانصراف',
    description: 'ملخص الحضور والتأخير والغياب للموظفين',
    category: 'الحضور',
    type: 'mixed',
    lastUpdated: '2024-01-25',
    frequency: 'daily',
    icon: '⏰',
  },
  {
    id: '3',
    title: 'تقرير الرواتب الشهري',
    description: 'تفاصيل الرواتب والبدلات والخصومات لجميع الموظفين',
    category: 'الرواتب',
    type: 'table',
    lastUpdated: '2024-01-20',
    frequency: 'monthly',
    icon: '💰',
  },
  {
    id: '4',
    title: 'تقرير الإجازات',
    description: 'رصيد الإجازات والإجازات المستخدمة لكل موظف',
    category: 'الإجازات',
    type: 'mixed',
    lastUpdated: '2024-01-24',
    frequency: 'weekly',
    icon: '🏖️',
  },
  {
    id: '5',
    title: 'تقرير التوظيف',
    description: 'إحصائيات التوظيف والتعيينات الجديدة والاستقالات',
    category: 'التوظيف',
    type: 'chart',
    lastUpdated: '2024-01-22',
    frequency: 'monthly',
    icon: '📋',
  },
  {
    id: '6',
    title: 'تقرير الأداء',
    description: 'ملخص تقييمات الأداء ومستوى تحقيق الأهداف',
    category: 'الأداء',
    type: 'chart',
    lastUpdated: '2024-01-15',
    frequency: 'yearly',
    icon: '🎯',
  },
]

const monthlyData = [
  { month: 'يناير', employees: 240, hires: 8, leaves: 3, payroll: 3200000 },
  { month: 'فبراير', employees: 245, hires: 10, leaves: 5, payroll: 3280000 },
  { month: 'مارس', employees: 248, hires: 6, leaves: 3, payroll: 3320000 },
  { month: 'أبريل', employees: 252, hires: 7, leaves: 3, payroll: 3400000 },
  { month: 'مايو', employees: 255, hires: 5, leaves: 2, payroll: 3450000 },
  { month: 'يونيو', employees: 258, hires: 8, leaves: 5, payroll: 3520000 },
]

const departmentDistribution = [
  { department: 'تقنية المعلومات', count: 45, percentage: 18, color: 'bg-blue-500' },
  { department: 'الموارد البشرية', count: 25, percentage: 10, color: 'bg-green-500' },
  { department: 'المبيعات', count: 60, percentage: 24, color: 'bg-purple-500' },
  { department: 'المالية', count: 20, percentage: 8, color: 'bg-yellow-500' },
  { department: 'التسويق', count: 35, percentage: 14, color: 'bg-pink-500' },
  { department: 'العمليات', count: 40, percentage: 16, color: 'bg-indigo-500' },
  { department: 'أخرى', count: 23, percentage: 10, color: 'bg-gray-500' },
]

export default function ReportsPage() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [dateRange, setDateRange] = useState('month')

  const categories = [...new Set(reports.map((r) => r.category))]

  const filteredReports =
    selectedCategory === 'all'
      ? reports
      : reports.filter((r) => r.category === selectedCategory)

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">التقارير والتحليلات</h1>
            <p className="text-gray-500 mt-1">عرض وتحليل بيانات الموارد البشرية</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="input w-40"
            >
              <option value="week">هذا الأسبوع</option>
              <option value="month">هذا الشهر</option>
              <option value="quarter">هذا الربع</option>
              <option value="year">هذا العام</option>
            </select>
            <button className="btn-secondary flex items-center gap-2">
              <RefreshCw size={18} />
              تحديث
            </button>
            <button className="btn-primary flex items-center gap-2">
              <Download size={18} />
              تصدير الكل
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
                <Users size={24} className="text-primary-600" />
              </div>
              <span className="flex items-center gap-1 text-sm text-success-600 font-medium">
                <TrendingUp size={14} />
                +3.2%
              </span>
            </div>
            <p className="text-sm text-gray-500">إجمالي الموظفين</p>
            <p className="text-3xl font-bold text-gray-800">248</p>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
                <UserCheck size={24} className="text-success-600" />
              </div>
              <span className="flex items-center gap-1 text-sm text-success-600 font-medium">
                <TrendingUp size={14} />
                +12%
              </span>
            </div>
            <p className="text-sm text-gray-500">التعيينات الجديدة</p>
            <p className="text-3xl font-bold text-gray-800">44</p>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-warning-50 rounded-2xl flex items-center justify-center">
                <UserMinus size={24} className="text-warning-600" />
              </div>
              <span className="flex items-center gap-1 text-sm text-red-600 font-medium">
                <TrendingDown size={14} />
                -2.1%
              </span>
            </div>
            <p className="text-sm text-gray-500">معدل الدوران</p>
            <p className="text-3xl font-bold text-gray-800">8.5%</p>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                <DollarSign size={24} className="text-blue-600" />
              </div>
              <span className="flex items-center gap-1 text-sm text-success-600 font-medium">
                <TrendingUp size={14} />
                +5.4%
              </span>
            </div>
            <p className="text-sm text-gray-500">إجمالي الرواتب</p>
            <p className="text-3xl font-bold text-gray-800">3.5M</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-2 gap-6">
          {/* Employee Growth Chart */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-800">نمو القوى العاملة</h2>
              <button className="text-gray-400 hover:text-gray-600">
                <Download size={18} />
              </button>
            </div>
            <div className="h-64 flex items-end gap-4">
              {monthlyData.map((data, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-gradient-to-t from-primary-500 to-primary-400 rounded-t-lg transition-all hover:from-primary-600 hover:to-primary-500"
                    style={{ height: `${(data.employees / 260) * 100}%` }}
                  />
                  <span className="text-xs text-gray-500 mt-2">{data.month}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-gray-100">
              <span className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-3 h-3 bg-primary-500 rounded" />
                عدد الموظفين
              </span>
            </div>
          </div>

          {/* Department Distribution */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-800">توزيع الأقسام</h2>
              <button className="text-gray-400 hover:text-gray-600">
                <Download size={18} />
              </button>
            </div>
            <div className="flex items-center gap-8">
              {/* Pie Chart Representation */}
              <div className="relative w-48 h-48">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {(() => {
                    let currentAngle = 0
                    return departmentDistribution.map((dept, index) => {
                      const angle = (dept.percentage / 100) * 360
                      const startAngle = currentAngle
                      currentAngle += angle

                      const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180)
                      const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180)
                      const x2 = 50 + 40 * Math.cos(((startAngle + angle) * Math.PI) / 180)
                      const y2 = 50 + 40 * Math.sin(((startAngle + angle) * Math.PI) / 180)

                      const largeArc = angle > 180 ? 1 : 0

                      return (
                        <path
                          key={index}
                          d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                          className={dept.color.replace('bg-', 'fill-')}
                          stroke="white"
                          strokeWidth="1"
                        />
                      )
                    })
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-gray-800">248</span>
                  <span className="text-xs text-gray-500">موظف</span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 space-y-2">
                {departmentDistribution.map((dept, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded ${dept.color}`} />
                      <span className="text-sm text-gray-600">{dept.department}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-800">{dept.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Hiring vs Turnover */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-800">التعيينات مقابل الاستقالات</h2>
              <button className="text-gray-400 hover:text-gray-600">
                <Download size={18} />
              </button>
            </div>
            <div className="h-64 flex items-end gap-2">
              {monthlyData.map((data, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex gap-1">
                    <div
                      className="flex-1 bg-success-500 rounded-t-lg"
                      style={{ height: `${data.hires * 15}px` }}
                    />
                    <div
                      className="flex-1 bg-red-400 rounded-t-lg"
                      style={{ height: `${data.leaves * 15}px` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{data.month}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100">
              <span className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-3 h-3 bg-success-500 rounded" />
                تعيينات جديدة
              </span>
              <span className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-3 h-3 bg-red-400 rounded" />
                استقالات
              </span>
            </div>
          </div>

          {/* Payroll Trend */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-800">تطور تكلفة الرواتب</h2>
              <button className="text-gray-400 hover:text-gray-600">
                <Download size={18} />
              </button>
            </div>
            <div className="h-64 relative">
              <svg className="w-full h-full" viewBox="0 0 600 200" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Area */}
                <path
                  d={`M 0 ${200 - (monthlyData[0].payroll / 4000000) * 200}
                      ${monthlyData
                        .map(
                          (d, i) =>
                            `L ${(i / (monthlyData.length - 1)) * 600} ${
                              200 - (d.payroll / 4000000) * 200
                            }`
                        )
                        .join(' ')}
                      L 600 200 L 0 200 Z`}
                  fill="url(#gradient)"
                />
                {/* Line */}
                <path
                  d={`M ${monthlyData
                    .map(
                      (d, i) =>
                        `${(i / (monthlyData.length - 1)) * 600} ${
                          200 - (d.payroll / 4000000) * 200
                        }`
                    )
                    .join(' L ')}`}
                  fill="none"
                  stroke="rgb(59, 130, 246)"
                  strokeWidth="3"
                />
                {/* Points */}
                {monthlyData.map((d, i) => (
                  <circle
                    key={i}
                    cx={(i / (monthlyData.length - 1)) * 600}
                    cy={200 - (d.payroll / 4000000) * 200}
                    r="6"
                    fill="white"
                    stroke="rgb(59, 130, 246)"
                    strokeWidth="3"
                  />
                ))}
              </svg>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              {monthlyData.map((d, i) => (
                <span key={i}>{d.month}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Available Reports */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-800">التقارير المتاحة</h2>
            <div className="flex items-center gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input w-40"
              >
                <option value="all">كل الفئات</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors cursor-pointer group"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm">
                    {report.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800 group-hover:text-primary-600 transition-colors">
                      {report.title}
                    </h3>
                    <p className="text-sm text-gray-500">{report.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    آخر تحديث: {new Date(report.lastUpdated).toLocaleDateString('ar-SA')}
                  </span>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 bg-white rounded-lg hover:bg-primary-50 transition-colors">
                      <Eye size={16} className="text-gray-600" />
                    </button>
                    <button className="p-1.5 bg-white rounded-lg hover:bg-primary-50 transition-colors">
                      <Download size={16} className="text-gray-600" />
                    </button>
                    <button className="p-1.5 bg-white rounded-lg hover:bg-primary-50 transition-colors">
                      <Printer size={16} className="text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats Table */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-800">ملخص الإحصائيات الشهرية</h2>
            <button className="btn-secondary flex items-center gap-2">
              <Download size={18} />
              تصدير Excel
            </button>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الشهر</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                  عدد الموظفين
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                  تعيينات جديدة
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">استقالات</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                  إجمالي الرواتب
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                  التغيير
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {monthlyData.map((data, index) => {
                const prevPayroll = index > 0 ? monthlyData[index - 1].payroll : data.payroll
                const change = ((data.payroll - prevPayroll) / prevPayroll) * 100

                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{data.month}</td>
                    <td className="px-4 py-3 text-gray-600">{data.employees}</td>
                    <td className="px-4 py-3">
                      <span className="text-success-600 font-medium">+{data.hires}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-red-600 font-medium">-{data.leaves}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {(data.payroll / 1000000).toFixed(2)} مليون ر.س
                    </td>
                    <td className="px-4 py-3">
                      {index > 0 && (
                        <span
                          className={`flex items-center gap-1 font-medium ${
                            change >= 0 ? 'text-success-600' : 'text-red-600'
                          }`}
                        >
                          {change >= 0 ? (
                            <TrendingUp size={14} />
                          ) : (
                            <TrendingDown size={14} />
                          )}
                          {Math.abs(change).toFixed(1)}%
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  )
}
