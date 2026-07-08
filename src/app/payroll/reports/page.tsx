'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Download,
  Printer,
  DollarSign,
  Users,
  BarChart3,
  FileText,
  TrendingDown,
  CreditCard,
  AlertTriangle,
} from 'lucide-react'
import { fetchPayrollReport } from '@/lib/api'

interface ReportRun {
  id: number
  period: string
  status: string
  totalNet: number
  branchName: string
  employees: number
}

interface ReportByMethod {
  payMethod: string
  count: number
  total: number
}

interface ReportDeductions {
  period: string
  lateness: number
  unpaidLeave: number
  loans: number
  overtime: number
}

interface PayrollReport {
  runs: ReportRun[]
  byMethod: ReportByMethod[]
  deductions: ReportDeductions[]
}

const runStatusLabels: Record<string, string> = {
  CALCULATED: 'محسوب',
  APPROVED: 'معتمد',
  PAID: 'مدفوع',
}

const runStatusColors: Record<string, string> = {
  CALCULATED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-warning-50 text-warning-700',
  PAID: 'bg-success-50 text-success-700',
}

const payMethodLabels: Record<string, string> = {
  transfer: 'تحويل بنكي',
  cash: 'نقداً',
  cheque: 'شيك',
}

export default function PayrollReportsPage() {
  const [report, setReport] = useState<PayrollReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchPayrollReport()
      .then((data) => setReport(data as PayrollReport))
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل تقرير الرواتب'))
      .finally(() => setLoading(false))
  }, [])

  const runs = report?.runs ?? []
  const byMethod = report?.byMethod ?? []
  const deductions = report?.deductions ?? []

  const totalNet = runs.reduce((sum, r) => sum + Number(r.totalNet), 0)
  const totalEmployees = runs.reduce((sum, r) => sum + Number(r.employees), 0)
  const totalDeductions = deductions.reduce(
    (sum, d) => sum + Number(d.lateness) + Number(d.unpaidLeave) + Number(d.loans),
    0
  )

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">التقارير المالية</h1>
            <p className="text-gray-500 mt-1">تحليلات وتقارير مسيرات الرواتب والخصومات</p>
          </div>
          <div className="flex items-center gap-3">
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

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4 flex items-center gap-2">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
        <>
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                <DollarSign size={24} className="text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500">إجمالي صافي الرواتب</p>
            <p className="text-2xl font-bold text-gray-800">{totalNet.toLocaleString()}</p>
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
                <FileText size={24} className="text-green-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500">عدد المسيرات</p>
            <p className="text-2xl font-bold text-gray-800">{runs.length}</p>
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                <TrendingDown size={24} className="text-red-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500">إجمالي الخصومات</p>
            <p className="text-2xl font-bold text-gray-800">{totalDeductions.toLocaleString()}</p>
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
                <BarChart3 size={24} className="text-primary-600" />
              </div>
            </div>
            <p className="text-sm text-gray-500">إجمالي بنود الموظفين</p>
            <p className="text-2xl font-bold text-gray-800">{totalEmployees}</p>
          </div>
        </div>

        {/* By Pay Method */}
        <div className="grid grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-lg font-bold text-gray-800 mb-4">حسب طريقة الدفع</h2>
            <div className="space-y-4">
              {byMethod.map((m) => (
                <div key={m.payMethod} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                      <CreditCard size={20} className="text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">
                        {payMethodLabels[m.payMethod] ?? m.payMethod}
                      </p>
                      <p className="text-sm text-gray-500">{Number(m.count)} موظف</p>
                    </div>
                  </div>
                  <p className="font-bold text-primary-600">{Number(m.total).toLocaleString()} ر.س</p>
                </div>
              ))}
              {byMethod.length === 0 && (
                <p className="text-sm text-gray-400">لا توجد بيانات دفع بعد</p>
              )}
            </div>
          </div>

          {/* Deductions by period */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-800 mb-4">الخصومات والإضافي حسب الفترة</h2>
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الفترة</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">التأخير</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">بدون راتب</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">السلف</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">الإضافي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {deductions.map((d) => (
                  <tr key={d.period} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{d.period}</td>
                    <td className="px-4 py-3 text-center text-red-600">
                      -{Number(d.lateness).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center text-red-600">
                      -{Number(d.unpaidLeave).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center text-red-600">
                      -{Number(d.loans).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center text-success-600">
                      +{Number(d.overtime).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {deductions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-400">
                      لا توجد بيانات
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Runs Table */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-4">مسيرات الرواتب</h2>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الفترة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الفرع</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">الحالة</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">الموظفون</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">صافي الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {runs.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{r.period}</td>
                  <td className="px-4 py-3 text-gray-600">{r.branchName}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${runStatusColors[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {runStatusLabels[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    <span className="flex items-center justify-center gap-1">
                      <Users size={14} className="text-gray-400" />
                      {Number(r.employees)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-gray-800">
                    {Number(r.totalNet).toLocaleString()}
                  </td>
                </tr>
              ))}
              {runs.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">
                    لا توجد مسيرات رواتب بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </>
        )}
      </div>
    </MainLayout>
  )
}
