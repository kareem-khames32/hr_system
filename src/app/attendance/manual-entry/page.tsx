'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Plus,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Trash2,
  FileText,
  Save,
  Users,
} from 'lucide-react'
import {
  ingestPunchesManual,
  fetchEmployees,
  fetchPunches,
  deleteManualPunch,
  can,
  type ApiEmployee,
  type ApiPunch,
} from '@/lib/api'
import { localMonth, localToday } from '@/lib/dates'

// ============================================================
// الإدخال اليدوي للحضور: كل بصمة يدوية تُحفظ بمصدرها (MANUAL) ومُدخِلها
// وسببها، وتُطبَّق فوراً على يوم الحضور (لا مسار اعتماد لها) — فالقائمة من
// السيرفر (/attendance/punches?source=MANUAL) وحالتها = حالة يومها المحسوب
// ============================================================

// حالة يوم الحضور الذي طُبّقت عليه البصمة
const dayStatusConfig: Record<string, { label: string; className: string }> = {
  present: { label: 'حاضر', className: 'bg-success-50 text-success-700' },
  late: { label: 'متأخر', className: 'bg-warning-50 text-warning-700' },
  early_leave: { label: 'خروج مبكر', className: 'bg-orange-50 text-orange-600' },
  missing_punch: { label: 'بصمة ناقصة', className: 'bg-rose-50 text-rose-700' },
  absent: { label: 'غائب', className: 'bg-red-100 text-red-700' },
  leave: { label: 'في إجازة', className: 'bg-indigo-50 text-indigo-600' },
  partial_leave: { label: 'إجازة جزئية', className: 'bg-indigo-100 text-indigo-700' },
  holiday: { label: 'عطلة', className: 'bg-blue-50 text-blue-600' },
  mission: { label: 'مأمورية', className: 'bg-teal-50 text-teal-700' },
  remote: { label: 'عمل عن بُعد', className: 'bg-cyan-50 text-cyan-700' },
}

export default function ManualEntryPage() {
  const [month, setMonth] = useState(localMonth())
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [employees, setEmployees] = useState<ApiEmployee[]>([])
  const [punches, setPunches] = useState<ApiPunch[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  // الإدخال والحذف لمن يملك إدارة الحضور (الفرض الحقيقي في الباك)
  const [canManage, setCanManage] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [formData, setFormData] = useState({
    employeeId: '',
    date: '',
    checkIn: '',
    checkOut: '',
    reason: '',
  })

  useEffect(() => {
    const manage = can('attendance.manage')
    setCanManage(manage)
    if (!manage) return
    fetchEmployees()
      .then(setEmployees)
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل الموظفين'))
  }, [])

  // سجل البصمات اليدوية للشهر المحدد — من السيرفر (يبقى بعد إعادة التحميل)
  useEffect(() => {
    setLoading(true)
    fetchPunches({ source: 'MANUAL', month })
      .then(setPunches)
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل سجل الإدخال اليدوي'))
      .finally(() => setLoading(false))
  }, [month, reloadKey])

  // إرسال البصمات اليدوية لمحرك الحضور — timestamp = YYYY-MM-DD HH:mm:ss + السبب
  const handleSubmit = async () => {
    setError('')
    setSuccess('')
    if (!formData.employeeId || !formData.date || !formData.checkIn) {
      setError('الرجاء اختيار الموظف والتاريخ ووقت الحضور على الأقل')
      return
    }
    const reason = formData.reason.trim()
    if (!reason) {
      setError('اكتب سبب الإدخال اليدوي — يُحفظ مع البصمة ومن أدخلها للمراجعة لاحقاً')
      return
    }
    const emp = employees.find((e) => String(e.id) === formData.employeeId)
    if (!emp) {
      setError('الموظف المحدد غير موجود')
      return
    }
    // لا بصمة بعد «الآن» — السيرفر يرفضها أيضاً (سماحية 5 دقائق لفرق الساعة)
    const latest = Date.now() + 5 * 60 * 1000
    const times = [formData.checkIn, formData.checkOut].filter(Boolean)
    if (times.some((t) => new Date(`${formData.date}T${t}:00`).getTime() > latest)) {
      setError('لا يمكن إدخال بصمة بتاريخ أو وقت في المستقبل')
      return
    }
    const batch: Array<{ employeeCode: string; timestamp: string }> = [
      { employeeCode: emp.employeeCode, timestamp: `${formData.date} ${formData.checkIn}:00` },
    ]
    if (formData.checkOut) {
      batch.push({
        employeeCode: emp.employeeCode,
        timestamp: `${formData.date} ${formData.checkOut}:00`,
      })
    }
    setSubmitting(true)
    try {
      const result = await ingestPunchesManual(batch, reason)
      setSuccess(
        `تم الحفظ: ${result.received} بصمة لـ${emp.fullName} — أُعيد حساب ${result.recomputedDays ?? 0} يوم حضور`
      )
      const entryMonth = formData.date.slice(0, 7)
      setFormData({ employeeId: '', date: '', checkIn: '', checkOut: '', reason: '' })
      setShowForm(false)
      // القائمة تنتقل لشهر الإدخال حتى تظهر البصمة فيها
      if (entryMonth !== month) setMonth(entryMonth)
      else setReloadKey((k) => k + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر حفظ الإدخال')
    } finally {
      setSubmitting(false)
    }
  }

  // حذف بصمة يدوية — السيرفر يعيد حساب يوم الحضور بعدها
  const handleDelete = async (p: ApiPunch) => {
    if (deletingId) return
    if (
      !confirm(
        `حذف البصمة اليدوية ${p.time} بتاريخ ${p.date} لـ${p.employeeName ?? p.employeeCode}؟ سيُعاد حساب يوم الحضور.`
      )
    )
      return
    setDeletingId(p.id)
    setError('')
    setSuccess('')
    try {
      const res = await deleteManualPunch(p.id)
      setSuccess(
        res.recomputed
          ? `حُذفت البصمة وأُعيد حساب يوم ${res.date}`
          : 'حُذفت البصمة — تعذّرت إعادة حساب اليوم، أعد حسابه من سجل الحضور'
      )
      setReloadKey((k) => k + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر حذف البصمة')
    } finally {
      setDeletingId(null)
    }
  }

  const filteredPunches = punches.filter(
    (p) =>
      (p.employeeName ?? '').includes(searchTerm) ||
      p.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // إحصاءات الشهر من السجل الحقيقي
  const dayKey = (p: ApiPunch) => `${p.employeeId ?? p.employeeCode}|${p.workDate}`
  const stats = {
    total: punches.length,
    employees: new Set(punches.map((p) => p.employeeId ?? p.employeeCode)).size,
    days: new Set(punches.map(dayKey)).size,
    missing: new Set(punches.filter((p) => p.dayStatus === 'missing_punch').map(dayKey)).size,
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">الإدخال اليدوي للحضور</h1>
            <p className="text-gray-500 mt-1">
              إدخال بصمات الحضور والانصراف يدوياً — تُطبَّق فوراً على يوم الحضور ويُسجَّل من أدخلها وسببها
            </p>
          </div>
          {canManage && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={18} />
              إدخال جديد
            </button>
          )}
        </div>

        {/* Success / Error Banners */}
        {success && (
          <div className="bg-success-50 text-success-700 rounded-xl p-4 flex items-center gap-2">
            <CheckCircle2 size={18} />
            {success}
          </div>
        )}
        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4 flex items-center gap-2">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Stats — الشهر المحدد */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
              <FileText size={24} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">البصمات اليدوية</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
              <Users size={24} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">موظفون</p>
              <p className="text-2xl font-bold text-gray-800">{stats.employees}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
              <Calendar size={24} className="text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">أيام حضور متأثرة</p>
              <p className="text-2xl font-bold text-gray-800">{stats.days}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center">
              <AlertCircle size={24} className="text-rose-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">أيام ما زالت ببصمة ناقصة</p>
              <p className="text-2xl font-bold text-gray-800">{stats.missing}</p>
            </div>
          </div>
        </div>

        {/* Entry Form */}
        {showForm && canManage && (
          <div className="card">
            <h3 className="font-bold text-gray-800 mb-4">إدخال سجل حضور جديد</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الموظف
                </label>
                <select
                  className="input w-full"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                >
                  <option value="">اختر الموظف</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeCode})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  التاريخ
                </label>
                <input
                  type="date"
                  className="input w-full"
                  max={localToday()}
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  وقت الحضور
                </label>
                <input
                  type="time"
                  className="input w-full"
                  value={formData.checkIn}
                  onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  وقت الانصراف
                </label>
                <input
                  type="time"
                  className="input w-full"
                  value={formData.checkOut}
                  onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  سبب الإدخال اليدوي <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="input w-full"
                  rows={3}
                  maxLength={500}
                  placeholder="اكتب سبب الإدخال اليدوي (عطل الجهاز، مأمورية خارجية...)"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className={`btn-primary flex items-center gap-2 ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Save size={18} />
                {submitting ? 'جارٍ الحفظ...' : 'حفظ الإدخال'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {/* Search + Month */}
        <div className="card">
          <div className="flex items-center gap-3">
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
            <input
              type="month"
              value={month}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
              className="input w-44"
              title="شهر السجل"
            />
          </div>
        </div>

        {/* Entries Table — كل بصمة يدوية سطر */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الموظف</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">التاريخ</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">وقت البصمة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">السبب</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">حالة اليوم</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">أدخلها</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPunches.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400">
                    {punches.length === 0
                      ? `لا توجد بصمات يدوية في ${month} — البصمات المُدخلة تُطبَّق فوراً على سجل الحضور`
                      : 'لا توجد نتائج مطابقة للبحث'}
                  </td>
                </tr>
              )}
              {filteredPunches.map((p) => {
                const status = p.dayStatus ? dayStatusConfig[p.dayStatus] : undefined
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600 font-bold">
                          {(p.employeeName ?? p.employeeCode).charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{p.employeeName ?? '—'}</p>
                          <p className="text-sm text-gray-500 font-mono">{p.employeeCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      <span className="font-mono text-sm" dir="ltr">{p.date}</span>
                      {p.workDate !== p.date && (
                        <p
                          className="text-[10px] text-gray-400"
                          title="بصمة صباحية تُكمل وردية ليلية من اليوم السابق"
                        >
                          يوم العمل <span dir="ltr">{p.workDate}</span>
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-3 py-1 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium font-mono">
                        {p.time}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-600 max-w-[220px] truncate" title={p.reason ?? ''}>
                      {p.reason || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-4">
                      {p.employeeId == null ? (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          غير مطابقة لموظف
                        </span>
                      ) : status ? (
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.className}`}>
                          {status.label}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-800">{p.createdByName ?? '—'}</p>
                      <p className="text-xs text-gray-500 font-mono" dir="ltr">{p.receivedAt ?? ''}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {p.canDelete ? (
                          <button
                            onClick={() => handleDelete(p)}
                            disabled={deletingId === p.id}
                            title="حذف البصمة اليدوية وإعادة حساب يوم الحضور — للتعديل احذفها وأدخلها من جديد"
                            className={`p-2 bg-gray-100 rounded-lg hover:bg-red-100 ${
                              deletingId === p.id ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            <Trash2 size={16} className="text-gray-600 hover:text-red-600" />
                          </button>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
