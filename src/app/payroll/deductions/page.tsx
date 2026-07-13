'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  MinusCircle,
  AlertTriangle,
  Download,
  Clock,
  Ban,
} from 'lucide-react'
import Link from 'next/link'
import {
  fetchPayrollRuns,
  fetchPayrollRun,
  fetchEmployees,
  fetchAllRequests,
  type ApiPayrollRun,
  type ApiPayrollItem,
  type ApiEmployee,
  type ApiRequest,
} from '@/lib/api'
import { useCurrency } from '@/lib/currency'

const runStatusLabels: Record<string, string> = {
  CALCULATED: 'محسوب',
  APPROVED: 'معتمد',
  PAID: 'مدفوع',
}

const requestStatusLabels: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'مسودة', className: 'bg-gray-100 text-gray-600' },
  SUBMITTED: { label: 'مُقدَّم', className: 'bg-warning-100 text-warning-700' },
  UNDER_REVIEW: { label: 'قيد المراجعة', className: 'bg-warning-100 text-warning-700' },
  RETURNED_FOR_INFO: { label: 'معاد للاستكمال', className: 'bg-orange-100 text-orange-700' },
  APPROVED: { label: 'معتمد', className: 'bg-primary-100 text-primary-700' },
  IN_EXECUTION: { label: 'قيد التنفيذ', className: 'bg-indigo-100 text-indigo-700' },
  COMPLETED: { label: 'مكتمل', className: 'bg-success-100 text-success-700' },
  REJECTED: { label: 'مرفوض', className: 'bg-red-100 text-red-700' },
  CANCELLED: { label: 'ملغى', className: 'bg-gray-100 text-gray-600' },
}

const reqStatusMeta = (s: string) =>
  requestStatusLabels[s] ?? { label: s, className: 'bg-gray-100 text-gray-600' }

const parsePayload = (raw?: string): { reason?: string } => {
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export default function DeductionsPage() {
  const currency = useCurrency()
  const [runs, setRuns] = useState<ApiPayrollRun[]>([])
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null)
  const [run, setRun] = useState<ApiPayrollRun | null>(null)
  const [employees, setEmployees] = useState<Map<number, ApiEmployee>>(new Map())
  const [objections, setObjections] = useState<ApiRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      fetchPayrollRuns(),
      fetchEmployees(),
      fetchAllRequests({ typeCode: 'DEDUCTION_OBJECTION' }),
    ])
      .then(([runsData, emps, objs]) => {
        setEmployees(new Map(emps.map((e) => [e.id, e])))
        setRuns(runsData)
        setObjections(objs)
        if (runsData.length > 0) {
          const latest = [...runsData].sort((a, b) => b.id - a.id)[0]
          setSelectedRunId(latest.id)
        } else {
          setLoading(false)
        }
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'تعذر تحميل بيانات الخصومات')
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (selectedRunId == null) return
    setLoading(true)
    fetchPayrollRun(selectedRunId)
      .then(setRun)
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل بنود المسير'))
      .finally(() => setLoading(false))
  }, [selectedRunId])

  const items: ApiPayrollItem[] = run?.items ?? []
  const totalOf = (i: ApiPayrollItem) =>
    Number(i.latenessDeduction) +
    Number(i.absenceDeduction ?? 0) +
    Number(i.unpaidLeaveDeduction) +
    Number(i.loanInstallments) +
    Number(i.otherDeductions ?? 0)

  const totals = {
    lateness: items.reduce((s, i) => s + Number(i.latenessDeduction), 0),
    absence: items.reduce((s, i) => s + Number(i.absenceDeduction ?? 0), 0),
    unpaidLeave: items.reduce((s, i) => s + Number(i.unpaidLeaveDeduction), 0),
    loans: items.reduce((s, i) => s + Number(i.loanInstallments), 0),
    other: items.reduce((s, i) => s + Number(i.otherDeductions ?? 0), 0),
  }
  const grandTotal =
    totals.lateness + totals.absence + totals.unpaidLeave + totals.loans + totals.other
  const affectedCount = items.filter((i) => totalOf(i) > 0).length
  const openObjections = objections.filter((o) =>
    ['SUBMITTED', 'UNDER_REVIEW', 'RETURNED_FOR_INFO'].includes(o.status)
  ).length

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">الخصومات</h1>
            <p className="text-gray-500 mt-1">الخصومات الفعلية المحسوبة في مسيرات الرواتب</p>
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

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4 flex items-center gap-2">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        {/* Warning Banner */}
        <div className="bg-warning-50 border border-warning-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-warning-600 mt-0.5" />
          <div>
            <p className="font-medium text-warning-800">تنبيه هام</p>
            <p className="text-sm text-warning-700">
              الخصومات تُحسب آلياً من الحضور (التأخير والغياب بلا إذن)، والإجازات بدون راتب، وأقساط
              السلف المستحقة — ولا تُدخل يدوياً. للاعتراض على خصم يقدَّم طلب «اعتراض على خصم» من محرك الطلبات.
            </p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - Deductions per run */}
          <div className="col-span-2 space-y-6">
            {/* Run Selector */}
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Clock size={20} className="text-primary-500" />
                مسير الرواتب
              </h3>
              <select
                className="input"
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

            {/* Deductions Table */}
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <MinusCircle size={20} className="text-danger-500" />
                خصومات الموظفين {run ? `— فترة ${run.period}` : ''}
              </h3>
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="table-header">
                      <th className="text-right px-4 py-3">الموظف</th>
                      <th className="text-center px-4 py-3">خصم التأخير</th>
                      <th className="text-center px-4 py-3">خصم الغياب</th>
                      <th className="text-center px-4 py-3">إجازة بدون راتب</th>
                      <th className="text-center px-4 py-3">أقساط السلف</th>
                      <th className="text-center px-4 py-3 text-danger-600">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const emp = employees.get(item.employeeId)
                      return (
                        <tr key={item.id} className="table-row">
                          <td className="table-cell">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                                {(emp?.fullName ?? '؟').charAt(0)}
                              </div>
                              <div>
                                <span className="font-medium text-gray-800">
                                  {emp?.fullName ?? `موظف #${item.employeeId}`}
                                </span>
                                <p className="text-xs text-gray-400">{emp?.employeeCode ?? ''}</p>
                              </div>
                            </div>
                          </td>
                          <td className="table-cell text-center font-mono">
                            {Number(item.latenessDeduction).toLocaleString()}
                            <p className="text-xs text-gray-400">{Number(item.lateMinutes)} دقيقة</p>
                          </td>
                          <td className="table-cell text-center font-mono">
                            {Number(item.absenceDeduction ?? 0).toLocaleString()}
                            <p className="text-xs text-gray-400">{Number(item.absenceDays ?? 0)} يوم</p>
                          </td>
                          <td className="table-cell text-center font-mono">
                            {Number(item.unpaidLeaveDeduction).toLocaleString()}
                            <p className="text-xs text-gray-400">{Number(item.unpaidLeaveDays)} يوم</p>
                          </td>
                          <td className="table-cell text-center font-mono">
                            {Number(item.loanInstallments).toLocaleString()}
                          </td>
                          <td className="table-cell text-center font-mono font-bold text-danger-600">
                            -{totalOf(item).toLocaleString()}
                          </td>
                        </tr>
                      )
                    })}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-10 text-gray-400">
                          لا توجد بنود في هذا المسير
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              )}
            </div>

            {/* Objections */}
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Ban size={20} className="text-warning-500" />
                اعتراضات على الخصومات ({objections.length})
              </h3>
              <div className="space-y-3">
                {objections.map((obj) => {
                  const emp = employees.get(obj.requesterId)
                  const meta = reqStatusMeta(obj.status)
                  const payload = parsePayload(obj.payload)
                  return (
                    <div key={obj.id} className="p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500">{(obj.createdAt ?? '').slice(0, 10)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${meta.className}`}>
                          {meta.label}
                        </span>
                      </div>
                      <p className="font-medium text-gray-800">
                        {emp?.fullName ?? `مستخدم #${obj.requesterId}`}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">{payload.reason ?? '—'}</p>
                    </div>
                  )
                })}
                {objections.length === 0 && (
                  <p className="text-sm text-gray-400">لا توجد اعتراضات مقدمة</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Summary */}
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="card bg-gradient-to-br from-danger-500 to-danger-600 text-white">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <MinusCircle size={20} />
                ملخص خصومات المسير
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-danger-100">خصم التأخير:</span>
                  <span className="font-bold">{totals.lateness.toLocaleString()} {currency}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-danger-100">خصم الغياب:</span>
                  <span className="font-bold">{totals.absence.toLocaleString()} {currency}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-danger-100">إجازات بدون راتب:</span>
                  <span className="font-bold">{totals.unpaidLeave.toLocaleString()} {currency}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-danger-100">أقساط السلف:</span>
                  <span className="font-bold">{totals.loans.toLocaleString()} {currency}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-danger-100">خصومات أخرى (عهدة/غرامة):</span>
                  <span className="font-bold">{totals.other.toLocaleString()} {currency}</span>
                </div>
                <div className="border-t border-white/20 pt-3 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-danger-100">الإجمالي:</span>
                    <span className="font-bold text-2xl">{grandTotal.toLocaleString()} {currency}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4">إحصائيات سريعة</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-600">موظفون عليهم خصومات</span>
                  <span className="font-bold text-danger-600">{affectedCount}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-600">إجمالي بنود المسير</span>
                  <span className="font-bold text-gray-800">{items.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-warning-50 rounded-xl">
                  <span className="text-warning-700">اعتراضات مفتوحة</span>
                  <span className="font-bold text-warning-700">{openObjections}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
