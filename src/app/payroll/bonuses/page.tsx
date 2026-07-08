'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Gift,
  UserCheck,
  DollarSign,
  Download,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'
import Link from 'next/link'
import {
  fetchAllRequests,
  fetchEmployees,
  createRequest,
  type ApiRequest,
  type ApiEmployee,
} from '@/lib/api'

const bonusReasons = [
  { id: 'أداء متميز', name: 'أداء متميز', icon: '⭐' },
  { id: 'إنجاز مشروع', name: 'إنجاز مشروع', icon: '🎯' },
  { id: 'مكافأة سنوية', name: 'مكافأة سنوية', icon: '📅' },
  { id: 'مكافأة عيد', name: 'مكافأة عيد', icon: '🎉' },
  { id: 'ترقية', name: 'ترقية', icon: '📈' },
  { id: 'ساعات إضافية', name: 'ساعات إضافية', icon: '⏰' },
  { id: 'other', name: 'أخرى', icon: '📝' },
]

const statusLabels: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'مسودة', className: 'bg-gray-100 text-gray-600' },
  SUBMITTED: { label: 'مُقدَّم', className: 'bg-warning-100 text-warning-700' },
  UNDER_REVIEW: { label: 'قيد المراجعة', className: 'bg-warning-100 text-warning-700' },
  RETURNED_FOR_INFO: { label: 'معاد للاستكمال', className: 'bg-orange-100 text-orange-700' },
  APPROVED: { label: 'معتمد', className: 'bg-primary-100 text-primary-700' },
  IN_EXECUTION: { label: 'قيد التنفيذ', className: 'bg-indigo-100 text-indigo-700' },
  COMPLETED: { label: 'مصروف', className: 'bg-success-100 text-success-700' },
  REJECTED: { label: 'مرفوض', className: 'bg-red-100 text-red-700' },
  CANCELLED: { label: 'ملغى', className: 'bg-gray-100 text-gray-600' },
}

const statusMeta = (s: string) =>
  statusLabels[s] ?? { label: s, className: 'bg-gray-100 text-gray-600' }

const parsePayload = (raw?: string): { amount?: number; reason?: string; employeeId?: number } => {
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export default function BonusesPage() {
  const [requests, setRequests] = useState<ApiRequest[]>([])
  const [employees, setEmployees] = useState<ApiEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // نموذج مكافأة جديدة
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [bonusAmount, setBonusAmount] = useState('')
  const [bonusReason, setBonusReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')

  const empById = new Map(employees.map((e) => [e.id, e]))

  const load = () => {
    setLoading(true)
    Promise.all([fetchAllRequests({ typeCode: 'BONUS' }), fetchEmployees()])
      .then(([reqs, emps]) => {
        setRequests(reqs)
        setEmployees(emps)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل طلبات المكافآت'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const effectiveReason = bonusReason === 'other' ? customReason : bonusReason

  const submitBonus = async () => {
    setSubmitError('')
    setSubmitSuccess('')
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        amount: Number(bonusAmount),
        reason: effectiveReason,
      }
      if (selectedEmployee) payload.employeeId = Number(selectedEmployee)
      await createRequest('BONUS', payload)
      setSubmitSuccess('تم إرسال طلب المكافأة للاعتماد')
      setBonusAmount('')
      setBonusReason('')
      setCustomReason('')
      setSelectedEmployee('')
      load()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'تعذر إرسال الطلب')
    } finally {
      setSubmitting(false)
    }
  }

  // إحصائيات من الطلبات الحقيقية
  const thisMonth = new Date().toISOString().slice(0, 7)
  const stats = {
    monthTotal: requests
      .filter((r) => (r.createdAt ?? '').startsWith(thisMonth))
      .reduce((sum, r) => sum + Number(parsePayload(r.payload).amount ?? 0), 0),
    beneficiaries: new Set(requests.map((r) => parsePayload(r.payload).employeeId ?? r.requesterId)).size,
    pending: requests.filter((r) => ['SUBMITTED', 'UNDER_REVIEW'].includes(r.status)).length,
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">المكافآت</h1>
            <p className="text-gray-500 mt-1">طلبات المكافآت عبر محرك الطلبات — تُصرف في المسير بعد الاعتماد</p>
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

        {/* Main Content Grid */}
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - Bonus Form */}
          <div className="col-span-2 space-y-6">
            {/* Bonus Details */}
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Gift size={20} className="text-success-500" />
                إضافة مكافأة
              </h3>

              {submitError && (
                <div className="bg-red-50 text-red-700 rounded-xl p-4 mb-4 flex items-center gap-2">
                  <AlertTriangle size={18} />
                  {submitError}
                </div>
              )}
              {submitSuccess && (
                <div className="bg-success-50 text-success-700 rounded-xl p-4 mb-4 flex items-center gap-2">
                  <CheckCircle size={18} />
                  {submitSuccess}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">الموظف المستفيد (اختياري — الافتراضي: مقدم الطلب)</label>
                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="input"
                  >
                    <option value="">-- مقدم الطلب --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} ({emp.employeeCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">مبلغ المكافأة (ر.س) *</label>
                  <input
                    type="number"
                    value={bonusAmount}
                    onChange={(e) => setBonusAmount(e.target.value)}
                    className="input"
                    placeholder="0.00"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="label">سبب المكافأة *</label>
                <div className="grid grid-cols-4 gap-2">
                  {bonusReasons.map((reason) => (
                    <button
                      key={reason.id}
                      onClick={() => setBonusReason(reason.id)}
                      className={`p-3 rounded-xl border-2 transition-all text-center ${
                        bonusReason === reason.id
                          ? 'border-success-500 bg-success-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-xl">{reason.icon}</span>
                      <p className={`text-sm mt-1 ${bonusReason === reason.id ? 'text-success-700 font-medium' : 'text-gray-600'}`}>
                        {reason.name}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {bonusReason === 'other' && (
                <div className="mt-4">
                  <label className="label">تفاصيل السبب</label>
                  <input
                    type="text"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="input"
                    placeholder="أدخل سبب المكافأة"
                  />
                </div>
              )}
            </div>

            {/* Bonus Requests Table */}
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <UserCheck size={20} className="text-gray-500" />
                سجل طلبات المكافآت ({requests.length})
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
                      <th className="text-right px-4 py-3">مقدم الطلب</th>
                      <th className="text-center px-4 py-3">المستفيد</th>
                      <th className="text-center px-4 py-3">السبب</th>
                      <th className="text-center px-4 py-3 text-success-600">المبلغ</th>
                      <th className="text-center px-4 py-3">التاريخ</th>
                      <th className="text-center px-4 py-3">الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((req) => {
                      const payload = parsePayload(req.payload)
                      const requester = empById.get(req.requesterId)
                      const target = payload.employeeId ? empById.get(Number(payload.employeeId)) : requester
                      const meta = statusMeta(req.status)
                      return (
                        <tr key={req.id} className="table-row">
                          <td className="table-cell">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                                {(requester?.fullName ?? '؟').charAt(0)}
                              </div>
                              <span className="font-medium text-gray-800">
                                {requester?.fullName ?? `مستخدم #${req.requesterId}`}
                              </span>
                            </div>
                          </td>
                          <td className="table-cell text-center text-gray-600">
                            {target?.fullName ?? requester?.fullName ?? '—'}
                          </td>
                          <td className="table-cell text-center text-gray-600">{payload.reason ?? '—'}</td>
                          <td className="table-cell text-center font-mono font-bold text-success-600">
                            +{Number(payload.amount ?? 0).toLocaleString()}
                          </td>
                          <td className="table-cell text-center text-gray-500">
                            {(req.createdAt ?? '').slice(0, 10)}
                          </td>
                          <td className="table-cell text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${meta.className}`}>
                              {meta.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                    {requests.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-gray-400">
                          لا توجد طلبات مكافآت بعد
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              )}
            </div>
          </div>

          {/* Right Column - Summary & History */}
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="card bg-gradient-to-br from-success-500 to-success-600 text-white">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Gift size={20} />
                ملخص المكافأة
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-success-100">المستفيد:</span>
                  <span className="font-bold">
                    {selectedEmployee
                      ? empById.get(Number(selectedEmployee))?.fullName ?? '—'
                      : 'مقدم الطلب'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-success-100">السبب:</span>
                  <span className="font-bold">{effectiveReason || '—'}</span>
                </div>
                <div className="border-t border-white/20 pt-3 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-success-100">المبلغ:</span>
                    <span className="font-bold text-2xl">
                      {Number(bonusAmount || '0').toLocaleString()} ر.س
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={submitBonus}
                disabled={submitting || !bonusAmount || !effectiveReason}
                className="w-full mt-4 py-3 bg-white text-success-600 rounded-xl font-bold hover:bg-success-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'جارٍ الإرسال...' : 'تأكيد وإرسال للاعتماد'}
              </button>
            </div>

            {/* Quick Stats */}
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4">إحصائيات سريعة</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-600">مكافآت هذا الشهر</span>
                  <span className="font-bold text-gray-800">{stats.monthTotal.toLocaleString()} ر.س</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-gray-600">عدد المستفيدين</span>
                  <span className="font-bold text-gray-800">{stats.beneficiaries} موظف</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-warning-50 rounded-xl">
                  <span className="text-warning-700">بانتظار الاعتماد</span>
                  <span className="font-bold text-warning-700">{stats.pending}</span>
                </div>
              </div>
            </div>

            {/* Recent Bonuses */}
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4">آخر المكافآت</h3>
              <div className="space-y-3">
                {requests.slice(0, 5).map((req) => {
                  const payload = parsePayload(req.payload)
                  const target = payload.employeeId
                    ? empById.get(Number(payload.employeeId))
                    : empById.get(req.requesterId)
                  const meta = statusMeta(req.status)
                  return (
                    <div key={req.id} className="p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500">{(req.createdAt ?? '').slice(0, 10)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${meta.className}`}>
                          {meta.label}
                        </span>
                      </div>
                      <p className="font-medium text-gray-800">
                        {target?.fullName ?? `مستخدم #${req.requesterId}`}
                      </p>
                      <div className="flex items-center justify-between mt-1 text-sm">
                        <span className="text-gray-500">{payload.reason ?? '—'}</span>
                        <span className="font-bold text-success-600">
                          {Number(payload.amount ?? 0).toLocaleString()} ر.س
                        </span>
                      </div>
                    </div>
                  )
                })}
                {requests.length === 0 && !loading && (
                  <p className="text-sm text-gray-400">لا توجد مكافآت بعد</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
