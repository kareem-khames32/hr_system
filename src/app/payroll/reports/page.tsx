'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Download,
  Printer,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  PieChart,
  BarChart3,
  FileText,
} from 'lucide-react'

const monthlyData = [
  { month: 'يناير', salaries: 3200000, allowances: 960000, deductions: 416000, net: 3744000 },
  { month: 'فبراير', salaries: 3280000, allowances: 984000, deductions: 426400, net: 3837600 },
  { month: 'مارس', salaries: 3320000, allowances: 996000, deductions: 431600, net: 3884400 },
  { month: 'أبريل', salaries: 3400000, allowances: 1020000, deductions: 442000, net: 3978000 },
  { month: 'مايو', salaries: 3450000, allowances: 1035000, deductions: 448500, net: 4036500 },
  { month: 'يونيو', salaries: 3520000, allowances: 1056000, deductions: 457600, net: 4118400 },
]

const departmentBreakdown = [
  { name: 'تقنية المعلومات', amount: 1200000, percentage: 34, color: 'bg-blue-500' },
  { name: 'المبيعات', amount: 900000, percentage: 25, color: 'bg-green-500' },
  { name: 'الموارد البشرية', amount: 500000, percentage: 14, color: 'bg-purple-500' },
  { name: 'المالية', amount: 450000, percentage: 13, color: 'bg-yellow-500' },
  { name: 'التسويق', amount: 350000, percentage: 10, color: 'bg-pink-500' },
  { name: 'أخرى', amount: 120000, percentage: 4, color: 'bg-gray-500' },
]

export default function PayrollReportsPage() {
  const [selectedYear, setSelectedYear] = useState('2024')
  const [selectedReport, setSelectedReport] = useState('summary')

  const totalSalaries = monthlyData.reduce((sum, m) => sum + m.salaries, 0)
  const totalAllowances = monthlyData.reduce((sum, m) => sum + m.allowances, 0)
  const totalDeductions = monthlyData.reduce((sum, m) => sum + m.deductions, 0)
  const totalNet = monthlyData.reduce((sum, m) => sum + m.net, 0)

  const availableReports = [
    { id: 'summary', name: 'ملخص الرواتب', icon: FileText },
    { id: 'department', name: 'حسب القسم', icon: PieChart },
    { id: 'monthly', name: 'التقرير الشهري', icon: Calendar },
    { id: 'gosi', name: 'تقرير التأمينات', icon: Users },
    { id: 'tax', name: 'التقرير الضريبي', icon: DollarSign },
  ]

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">التقارير المالية</h1>
            <p className="text-gray-500 mt-1">تحليلات وتقارير الرواتب والمصروفات</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="input w-32"
            >
              <option value="2024">2024</option>
              <option value="2023">2023</option>
            </select>
            <button className="btn-secondary flex items-center gap-2">
              <Printer size={18} />
              طباعة
            </button>
            <button className="btn-primary flex items-center gap-2">
              <Download size={18} />
              تصدير
            </button>
          </div>
        </div>

        {/* Report Types */}
        <div className="flex gap-2">
          {availableReports.map((report) => (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                selectedReport === report.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <report.icon size={18} />
              {report.name}
            </button>
          ))}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                <DollarSign size={24} className="text-blue-600" />
              </div>
              <span className="flex items-center gap-1 text-sm text-success-600">
                <TrendingUp size={14} />
                +5.2%
              </span>
            </div>
            <p className="text-sm text-gray-500">إجمالي الرواتب</p>
            <p className="text-2xl font-bold text-gray-800">{(totalSalaries / 1000000).toFixed(1)}M</p>
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
                <TrendingUp size={24} className="text-green-600" />
              </div>
              <span className="flex items-center gap-1 text-sm text-success-600">
                <TrendingUp size={14} />
                +3.8%
              </span>
            </div>
            <p className="text-sm text-gray-500">إجمالي البدلات</p>
            <p className="text-2xl font-bold text-gray-800">{(totalAllowances / 1000000).toFixed(1)}M</p>
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                <TrendingDown size={24} className="text-red-600" />
              </div>
              <span className="flex items-center gap-1 text-sm text-red-600">
                <TrendingUp size={14} />
                +2.1%
              </span>
            </div>
            <p className="text-sm text-gray-500">إجمالي الخصومات</p>
            <p className="text-2xl font-bold text-gray-800">{(totalDeductions / 1000000).toFixed(1)}M</p>
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
                <BarChart3 size={24} className="text-primary-600" />
              </div>
              <span className="flex items-center gap-1 text-sm text-success-600">
                <TrendingUp size={14} />
                +4.5%
              </span>
            </div>
            <p className="text-sm text-gray-500">صافي الرواتب</p>
            <p className="text-2xl font-bold text-gray-800">{(totalNet / 1000000).toFixed(1)}M</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-2 gap-6">
          {/* Monthly Trend */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-800 mb-4">تطور الرواتب الشهري</h2>
            <div className="h-64 flex items-end gap-2">
              {monthlyData.map((month, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <span className="text-xs text-gray-600 mb-1">
                    {(month.net / 1000000).toFixed(1)}M
                  </span>
                  <div
                    className="w-full bg-gradient-to-t from-primary-500 to-primary-400 rounded-t-lg"
                    style={{ height: `${(month.net / 4500000) * 100}%` }}
                  />
                  <span className="text-xs text-gray-500 mt-2">{month.month}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Department Breakdown */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-800 mb-4">توزيع الرواتب حسب القسم</h2>
            <div className="space-y-4">
              {departmentBreakdown.map((dept, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">{dept.name}</span>
                    <span className="text-sm font-medium text-gray-800">
                      {(dept.amount / 1000).toLocaleString()}K ر.س
                    </span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${dept.color} rounded-full`}
                      style={{ width: `${dept.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed Table */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-4">التفاصيل الشهرية</h2>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الشهر</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">الرواتب الأساسية</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">البدلات</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">الخصومات</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">الصافي</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">التغيير</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {monthlyData.map((month, index) => {
                const prevNet = index > 0 ? monthlyData[index - 1].net : month.net
                const change = ((month.net - prevNet) / prevNet * 100).toFixed(1)
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{month.month}</td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {(month.salaries / 1000000).toFixed(2)}M
                    </td>
                    <td className="px-4 py-3 text-center text-success-600">
                      +{(month.allowances / 1000).toLocaleString()}K
                    </td>
                    <td className="px-4 py-3 text-center text-red-600">
                      -{(month.deductions / 1000).toLocaleString()}K
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-gray-800">
                      {(month.net / 1000000).toFixed(2)}M
                    </td>
                    <td className="px-4 py-3 text-center">
                      {index > 0 && (
                        <span className={`flex items-center justify-center gap-1 ${
                          parseFloat(change) >= 0 ? 'text-success-600' : 'text-red-600'
                        }`}>
                          {parseFloat(change) >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          {Math.abs(parseFloat(change))}%
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
