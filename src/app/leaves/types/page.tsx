'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Plus,
  Edit2,
  Trash2,
  Calendar,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { createLeaveType, fetchLeaveTypes, updateLeaveType } from '@/lib/api'

interface LeaveTypeRow {
  id: number
  code: string
  nameAr: string
  isPaid: boolean
  balanceSource: 'annual' | 'sick' | 'none'
  requiredAttachment: string | null
  maxDays: number | null
  oncePerService: boolean
  isActive: boolean
}

const balanceSourceLabels: Record<string, string> = {
  annual: 'الرصيد السنوي',
  sick: 'الرصيد المرضي',
  none: 'بدون رصيد',
}

const palette = [
  '#3B82F6',
  '#EF4444',
  '#F97316',
  '#6B7280',
  '#EC4899',
  '#A855F7',
  '#6366F1',
  '#10B981',
]

const emptyForm = {
  code: '',
  nameAr: '',
  isPaid: true,
  balanceSource: 'none',
  requiredAttachment: '',
  maxDays: '',
  oncePerService: false,
}

export default function LeaveTypesPage() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editingType, setEditingType] = useState<LeaveTypeRow | null>(null)
  const [formData, setFormData] = useState({ ...emptyForm })

  const loadData = async () => {
    try {
      const rows = (await fetchLeaveTypes()) as LeaveTypeRow[]
      setLeaveTypes(rows)
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const openModal = (type?: LeaveTypeRow) => {
    setModalError(null)
    if (type) {
      setEditingType(type)
      setFormData({
        code: type.code,
        nameAr: type.nameAr,
        isPaid: type.isPaid,
        balanceSource: type.balanceSource ?? 'none',
        requiredAttachment: type.requiredAttachment ?? '',
        maxDays: type.maxDays != null ? String(type.maxDays) : '',
        oncePerService: type.oncePerService,
      })
    } else {
      setEditingType(null)
      setFormData({ ...emptyForm })
    }
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setModalError(null)
    const payload: Record<string, unknown> = {
      nameAr: formData.nameAr,
      isPaid: formData.isPaid,
      balanceSource: formData.balanceSource,
      oncePerService: formData.oncePerService,
      ...(formData.requiredAttachment
        ? { requiredAttachment: formData.requiredAttachment }
        : {}),
      ...(formData.maxDays !== '' ? { maxDays: Number(formData.maxDays) } : {}),
    }
    try {
      if (editingType) {
        await updateLeaveType(editingType.id, payload)
      } else {
        await createLeaveType({ ...payload, code: formData.code })
      }
      await loadData()
      setShowModal(false)
    } catch (err: any) {
      setModalError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (type: LeaveTypeRow) => {
    try {
      await updateLeaveType(type.id, { isActive: !type.isActive })
      setLeaveTypes((prev) =>
        prev.map((t) => (t.id === type.id ? { ...t, isActive: !t.isActive } : t))
      )
      setError(null)
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">أنواع الإجازات</h1>
            <p className="text-gray-500 mt-1">إدارة وتكوين أنواع الإجازات</p>
          </div>
          <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            إضافة نوع
          </button>
        </div>

        {/* Error Banner */}
        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Leave Types Grid */}
        {!loading && (
          <div className="grid grid-cols-2 gap-4">
            {leaveTypes.map((type, index) => {
              const color = palette[index % palette.length]
              return (
                <div key={type.id} className="card hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        <Calendar size={24} style={{ color }} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800">{type.nameAr}</h3>
                        <p className="text-sm text-gray-500 font-mono" dir="ltr">
                          {type.code}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openModal(type)}
                        title="تعديل"
                        className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                      >
                        <Edit2 size={16} className="text-gray-600" />
                      </button>
                      <button
                        disabled
                        title="الحذف غير متاح — عطّل النوع بدلاً من ذلك"
                        className="p-2 bg-gray-100 rounded-lg opacity-50 cursor-not-allowed"
                      >
                        <Trash2 size={16} className="text-gray-600" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500">مصدر الرصيد</p>
                      <p className="text-lg font-bold text-gray-800">
                        {balanceSourceLabels[type.balanceSource] ?? type.balanceSource}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500">الحد الأقصى</p>
                      <p className="text-lg font-bold text-gray-800">
                        {type.maxDays != null ? `${type.maxDays} يوم` : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        type.isPaid
                          ? 'bg-success-50 text-success-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {type.isPaid ? 'مدفوعة' : 'غير مدفوعة'}
                    </span>
                    {type.requiredAttachment && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-warning-50 text-warning-700">
                        مرفق مطلوب: {type.requiredAttachment}
                      </span>
                    )}
                    {type.oncePerService && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        مرة واحدة طوال الخدمة
                      </span>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      {type.isActive ? (
                        <>
                          <CheckCircle2 size={16} className="text-success-600" />
                          <span className="text-success-600">مفعّل</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={16} className="text-gray-400" />
                          <span className="text-gray-400">معطّل</span>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => toggleActive(type)}
                      className="text-primary-600 text-sm font-medium hover:underline"
                    >
                      {type.isActive ? 'تعطيل' : 'تفعيل'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && leaveTypes.length === 0 && (
          <div className="card p-12 text-center">
            <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">لا توجد أنواع إجازات</h3>
            <p className="text-gray-500 mb-4">ابدأ بإضافة نوع إجازة جديد</p>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingType ? 'تعديل نوع الإجازة' : 'إضافة نوع إجازة جديد'}
                </h2>
              </div>

              <div className="p-6 space-y-4">
                {/* Modal Error */}
                {modalError && (
                  <div className="bg-red-50 text-red-700 rounded-xl p-4">{modalError}</div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الكود *
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                      }
                      className="input w-full font-mono"
                      placeholder="مثال: ANNUAL"
                      dir="ltr"
                      disabled={!!editingType}
                      title={editingType ? 'لا يمكن تعديل الكود بعد الإنشاء' : undefined}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الاسم (عربي) *
                    </label>
                    <input
                      type="text"
                      value={formData.nameAr}
                      onChange={(e) =>
                        setFormData({ ...formData, nameAr: e.target.value })
                      }
                      className="input w-full"
                      placeholder="مثال: سنوية"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      مصدر الرصيد
                    </label>
                    <select
                      value={formData.balanceSource}
                      onChange={(e) =>
                        setFormData({ ...formData, balanceSource: e.target.value })
                      }
                      className="input w-full"
                    >
                      <option value="annual">الرصيد السنوي</option>
                      <option value="sick">الرصيد المرضي</option>
                      <option value="none">بدون رصيد</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الحد الأقصى (أيام)
                    </label>
                    <input
                      type="number"
                      value={formData.maxDays}
                      onChange={(e) =>
                        setFormData({ ...formData, maxDays: e.target.value })
                      }
                      className="input w-full"
                      placeholder="بدون حد"
                      min={0}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المرفق المطلوب
                  </label>
                  <input
                    type="text"
                    value={formData.requiredAttachment}
                    onChange={(e) =>
                      setFormData({ ...formData, requiredAttachment: e.target.value })
                    }
                    className="input w-full"
                    placeholder="مثال: تقرير طبي — اتركه فارغاً إذا لا يلزم"
                  />
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isPaid}
                      onChange={(e) =>
                        setFormData({ ...formData, isPaid: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">إجازة مدفوعة</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.oncePerService}
                      onChange={(e) =>
                        setFormData({ ...formData, oncePerService: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">مرة واحدة طوال الخدمة</span>
                  </label>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="btn-secondary">
                  إلغاء
                </button>
                <button onClick={handleSave} disabled={saving} className="btn-primary">
                  {saving ? 'جارٍ الحفظ...' : editingType ? 'حفظ التغييرات' : 'إضافة النوع'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
