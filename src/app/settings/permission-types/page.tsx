'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import Link from 'next/link'
import {
  ArrowRight,
  Plus,
  Search,
  Timer,
  Edit,
  CheckCircle,
  XCircle,
  X,
} from 'lucide-react'
import { createCatalogItem, fetchCatalog, updateCatalogItem } from '@/lib/api'

interface PermissionType {
  id: number
  nameAr: string
  isDeductible: boolean
  maxDurationMinutes?: number | null
  monthlyFreeCount?: number | null
  monthlyFreeMinutes?: number | null
  deductionPct?: number
  coverage?: 'morning' | 'evening' | 'both'
  isActive: boolean
}

const emptyForm = {
  nameAr: '',
  isDeductible: false,
  maxDurationMinutes: '',
  monthlyFreeCount: '',
  monthlyFreeMinutes: '',
  deductionPct: '100',
  coverage: 'both' as 'morning' | 'evening' | 'both',
  isActive: true,
}

export default function PermissionTypesPage() {
  const [items, setItems] = useState<PermissionType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<PermissionType | null>(null)
  const [formData, setFormData] = useState({ ...emptyForm })

  const loadData = async () => {
    try {
      const data = await fetchCatalog<PermissionType>('permission-types')
      setItems(data)
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

  const filtered = items.filter((t) => t.nameAr.includes(searchQuery))
  const activeCount = items.filter((t) => t.isActive).length
  const deductibleCount = items.filter((t) => t.isDeductible).length

  const handleOpenModal = (t?: PermissionType) => {
    setModalError(null)
    if (t) {
      setEditing(t)
      setFormData({
        nameAr: t.nameAr,
        isDeductible: t.isDeductible,
        maxDurationMinutes:
          t.maxDurationMinutes != null ? String(t.maxDurationMinutes) : '',
        monthlyFreeCount:
          t.monthlyFreeCount != null ? String(t.monthlyFreeCount) : '',
        monthlyFreeMinutes:
          t.monthlyFreeMinutes != null ? String(t.monthlyFreeMinutes) : '',
        deductionPct: t.deductionPct != null ? String(t.deductionPct) : '100',
        coverage: t.coverage ?? 'both',
        isActive: t.isActive,
      })
    } else {
      setEditing(null)
      setFormData({ ...emptyForm })
    }
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setModalError(null)
    const payload: Record<string, unknown> = {
      nameAr: formData.nameAr.trim(),
      isDeductible: formData.isDeductible,
      maxDurationMinutes:
        formData.maxDurationMinutes !== ''
          ? Number(formData.maxDurationMinutes)
          : null,
      monthlyFreeCount:
        formData.monthlyFreeCount !== ''
          ? Number(formData.monthlyFreeCount)
          : null,
      monthlyFreeMinutes:
        formData.monthlyFreeMinutes !== ''
          ? Number(formData.monthlyFreeMinutes)
          : null,
      deductionPct:
        formData.deductionPct !== '' ? Number(formData.deductionPct) : 100,
      coverage: formData.coverage,
      isActive: formData.isActive,
    }
    try {
      if (editing) {
        const updated = await updateCatalogItem<PermissionType>(
          'permission-types',
          editing.id,
          payload
        )
        setItems(items.map((t) => (t.id === editing.id ? updated : t)))
      } else {
        const created = await createCatalogItem<PermissionType>(
          'permission-types',
          payload
        )
        setItems([...items, created])
      }
      setShowModal(false)
    } catch (err: any) {
      setModalError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (t: PermissionType) => {
    try {
      const updated = await updateCatalogItem<PermissionType>(
        'permission-types',
        t.id,
        { isActive: !t.isActive }
      )
      setItems(items.map((x) => (x.id === t.id ? updated : x)))
      setError(null)
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/settings" className="hover:text-primary-600">
            الإعدادات
          </Link>
          <ArrowRight size={16} />
          <span className="text-gray-800">أنواع الأذونات</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">أنواع الأذونات</h1>
            <p className="text-gray-500 mt-1">
              أذونات الخروج والتأخير — حدد ما يُخصم من الراتب وما لا يُخصم
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            إضافة نوع إذن
          </button>
        </div>

        {/* Error Banner */}
        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
              <Timer size={24} className="text-primary-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">أنواع الأذونات</p>
              <p className="text-2xl font-bold text-gray-800">{items.length}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-success-50 rounded-xl flex items-center justify-center">
              <CheckCircle size={24} className="text-success-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">مفعّلة</p>
              <p className="text-2xl font-bold text-success-600">{activeCount}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <XCircle size={24} className="text-red-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">بخصم من الراتب</p>
              <p className="text-2xl font-bold text-red-600">{deductibleCount}</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="card p-4">
          <div className="relative max-w-md">
            <Search
              size={20}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="البحث عن نوع إذن..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pr-10 w-full"
            />
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            {filtered.length === 0 ? (
              <div className="p-12 text-center">
                <Timer size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-bold text-gray-800 mb-2">
                  لا توجد أنواع أذونات
                </h3>
                <p className="text-gray-500">أضف أول نوع إذن من الزر أعلاه</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 text-right">
                      <th className="py-3 px-4 text-sm font-medium text-gray-500">الاسم</th>
                      <th className="py-3 px-4 text-sm font-medium text-gray-500">الخصم</th>
                      <th className="py-3 px-4 text-sm font-medium text-gray-500">
                        أطول إذن
                      </th>
                      <th className="py-3 px-4 text-sm font-medium text-gray-500">
                        كام مرة في الشهر
                      </th>
                      <th className="py-3 px-4 text-sm font-medium text-gray-500">الحالة</th>
                      <th className="py-3 px-4 text-sm font-medium text-gray-500">
                        إجراءات
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((t) => (
                      <tr
                        key={t.id}
                        className={`border-t border-gray-50 hover:bg-gray-50/50 ${
                          !t.isActive ? 'opacity-60' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <p className="font-medium text-gray-800 text-sm">{t.nameAr}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`badge text-xs ${
                              t.isDeductible
                                ? 'bg-red-100 text-red-700'
                                : 'bg-success-50 text-success-700'
                            }`}
                          >
                            {t.isDeductible ? 'بخصم' : 'بدون خصم'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {t.maxDurationMinutes != null
                            ? `${t.maxDurationMinutes} دقيقة`
                            : 'بلا حد'}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {t.monthlyFreeCount ? `${t.monthlyFreeCount} مرة` : 'بلا حد'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`badge text-xs ${
                              t.isActive
                                ? 'bg-success-50 text-success-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {t.isActive ? 'مفعّل' : 'معطّل'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenModal(t)}
                              className="text-xs px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 flex items-center gap-1"
                            >
                              <Edit size={12} />
                              تعديل
                            </button>
                            <button
                              onClick={() => toggleActive(t)}
                              className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 ${
                                t.isActive
                                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  : 'bg-success-50 text-success-600 hover:bg-green-100'
                              }`}
                            >
                              {t.isActive ? (
                                <>
                                  <XCircle size={12} />
                                  تعطيل
                                </>
                              ) : (
                                <>
                                  <CheckCircle size={12} />
                                  تفعيل
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">
                  {editing ? 'تعديل نوع الإذن' : 'إضافة نوع إذن'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {modalError && (
                  <div className="bg-red-50 text-red-700 rounded-xl p-4">{modalError}</div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الاسم *
                  </label>
                  <input
                    type="text"
                    value={formData.nameAr}
                    onChange={(e) =>
                      setFormData({ ...formData, nameAr: e.target.value })
                    }
                    className="input w-full"
                    placeholder="مثال: إذن شخصي"
                  />
                </div>

                {/* الرقمان اللذان يحكمان النوع: كام مرة في الشهر، وأطول إذن */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      كام مرة في الشهر
                    </label>
                    <input
                      type="number"
                      value={formData.monthlyFreeCount}
                      onChange={(e) =>
                        setFormData({ ...formData, monthlyFreeCount: e.target.value })
                      }
                      className="input w-full"
                      dir="ltr"
                      min={0}
                      placeholder="بلا حد"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      عدد مرات استخدام هذا الإذن في الشهر — ما زاد عنه يُرفض عند
                      الإرسال. اتركه فارغاً لبلا حد
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      أطول إذن (دقيقة)
                    </label>
                    <input
                      type="number"
                      value={formData.maxDurationMinutes}
                      onChange={(e) =>
                        setFormData({ ...formData, maxDurationMinutes: e.target.value })
                      }
                      className="input w-full"
                      dir="ltr"
                      min={0}
                      placeholder="بلا حد"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      أطول مدة للإذن الواحد — اتركه فارغاً لبلا حد
                    </p>
                  </div>
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isDeductible}
                    onChange={(e) =>
                      setFormData({ ...formData, isDeductible: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-gray-300 text-primary-600"
                  />
                  <span className="text-sm text-gray-700">يُخصم من الراتب</span>
                </label>

                <details className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                  <summary className="cursor-pointer text-sm font-semibold text-gray-700">
                    خيارات إضافية
                  </summary>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        نطاق التغطية
                      </label>
                      <select
                        value={formData.coverage}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            coverage: e.target.value as 'morning' | 'evening' | 'both',
                          })
                        }
                        className="input w-full"
                      >
                        <option value="morning">صباحي — يعذر التأخير (بداية الوردية)</option>
                        <option value="evening">مسائي — يعذر الانصراف المبكر (نهاية الوردية)</option>
                        <option value="both">كلاهما — تأخير وانصراف مبكر</option>
                      </select>
                      <p className="text-xs text-gray-400 mt-1">
                        إذن التأخير يشيل تأخير الصبح فقط، وإذن الانصراف المبكر يشيل نهاية اليوم فقط
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          دقائق مجانية في الشهر
                        </label>
                        <input
                          type="number"
                          value={formData.monthlyFreeMinutes}
                          onChange={(e) =>
                            setFormData({ ...formData, monthlyFreeMinutes: e.target.value })
                          }
                          className="input w-full"
                          dir="ltr"
                          min={0}
                          placeholder="بلا حد"
                          disabled={formData.isDeductible}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          نسبة الخصم على الزيادة (%)
                        </label>
                        <input
                          type="number"
                          value={formData.deductionPct}
                          onChange={(e) =>
                            setFormData({ ...formData, deductionPct: e.target.value })
                          }
                          className="input w-full"
                          dir="ltr"
                          min={0}
                          max={100}
                          placeholder="100"
                          disabled={formData.isDeductible}
                        />
                      </div>
                    </div>
                    {formData.isDeductible && (
                      <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
                        هذا النوع يُخصم دائماً من الراتب، فلا أثر للدقائق المجانية ولا لنسبة الخصم.
                      </p>
                    )}
                  </div>
                </details>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-gray-300 text-primary-600"
                  />
                  <span className="text-sm text-gray-700">مفعّل</span>
                </label>
              </div>
              <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="btn-secondary">
                  إلغاء
                </button>
                <button
                  onClick={handleSave}
                  className="btn-primary"
                  disabled={!formData.nameAr.trim() || saving}
                >
                  {saving ? 'جارٍ الحفظ...' : editing ? 'حفظ التغييرات' : 'إضافة النوع'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
