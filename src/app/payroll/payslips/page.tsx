'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Download,
  Eye,
  Printer,
  DollarSign,
  AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'
import {
  fetchPayrollRuns,
  fetchPayrollRun,
  fetchEmployees,
  type ApiPayrollRun,
  type ApiPayrollItem,
  type ApiEmployee,
} from '@/lib/api'
import { useCurrency } from '@/lib/currency'

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

export default function PayslipsListPage() {
  const currency = useCurrency()
  const [searchTerm, setSearchTerm] = useState('')
  const [runs, setRuns] = useState<ApiPayrollRun[]>([])
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null)
  const [run, setRun] = useState<ApiPayrollRun | null>(null)
  const [employees, setEmployees] = useState<Map<number, ApiEmployee>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // تحميل المسيرات وقائمة الموظفين مرة واحدة
  useEffect(() => {
    Promise.all([fetchPayrollRuns(), fetchEmployees()])
      .then(([runsData, emps]) => {
        setEmployees(new Map(emps.map((e) => [e.id, e])))
        setRuns(runsData)
        if (runsData.length > 0) {
          // الأحدث افتراضياً
          const latest = [...runsData].sort((a, b) => b.id - a.id)[0]
          setSelectedRunId(latest.id)
        } else {
          setLoading(false)
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'تعذر تحميل مسيرات الرواتب')
        setLoading(false)
      })
  }, [])

  // تحميل بنود المسير المحدد
  useEffect(() => {
    if (selectedRunId == null) return
    setLoading(true)
    fetchPayrollRun(selectedRunId)
      .then(setRun)
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل بنود المسير'))
      .finally(() => setLoading(false))
  }, [selectedRunId])

  const items: ApiPayrollItem[] = run?.items ?? []

  const filteredItems = items.filter((item) => {
    if (!searchTerm) return true
    const emp = employees.get(item.employeeId)
    return (
      (emp?.fullName ?? '').includes(searchTerm) ||
      (emp?.employeeCode ?? '').toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const totalNet = filteredItems.reduce((sum, i) => sum + Number(i.netPay), 0)
  const deductionsOf = (i: ApiPayrollItem) =>
    Number(i.latenessDeduction) + Number(i.unpaidLeaveDeduction) + Number(i.loanInstallments)

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">قسائم الرواتب</h1>
            <p className="text-gray-500 mt-1">عرض وطباعة قسائم رواتب الموظفين حسب المسير</p>
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

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4 flex items-center gap-2">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        {/* Summary Card */}
        <div className="card bg-gradient-to-br from-primary-500 to-primary-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-100">إجمالي صافي الرواتب</p>
              <p className="text-4xl font-bold mt-1">{totalNet.toLocaleString()} {currency}</p>
              <p className="text-primary-100 mt-2">
                {filteredItems.length} قسيمة راتب
                {run ? ` — فترة ${run.period}` : ''}
              </p>
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
            <select
              className="input w-64"
              value={selectedRunId ?? ''}
              onChange={(e) => setSelectedRunId(Number(e.target.value))}
            >
              {runs.length === 0 && <option value="">لا توجد مسيرات</option>}
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  مسير {r.period} — {runStatusLabels[r.status] ?? r.status}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الموظف</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الفترة</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">الراتب الأساسي</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">العمل الإضافي</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">الخصومات</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">الصافي</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">طريقة الدفع</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredItems.map((item) => {
                const emp = employees.get(item.employeeId)
                return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <p className="font-medium text-gray-800">{emp?.fullName ?? `موظف #${item.employeeId}`}</p>
                    <p className="text-sm text-gray-500">{emp?.employeeCode ?? ''}</p>
                  </td>
                  <td className="px-4 py-4 text-gray-600">{run?.period}</td>
                  <td className="px-4 py-4 text-center text-gray-600">
                    {Number(item.basicSalary).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center text-success-600 font-medium">
                    +{Number(item.overtimeAmount).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center text-red-600 font-medium">
                    -{deductionsOf(item).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center font-bold text-gray-800">
                    {Number(item.netPay).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${runStatusColors[run?.status ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
                      {payMethodLabels[item.payMethod] ?? item.payMethod}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        href={`/payroll/payslip/${item.id}`}
                        className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                      >
                        <Eye size={16} className="text-gray-600" />
                      </Link>
                      <Link
                        href={`/payroll/payslip/${item.id}`}
                        className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                      >
                        <Printer size={16} className="text-gray-600" />
                      </Link>
                    </div>
                  </td>
                </tr>
                )
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-gray-400">
                    لا توجد قسائم في هذا المسير
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
