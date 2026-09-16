'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import Link from 'next/link'
import {
  ArrowRight,
  Plus,
  Search,
  Landmark,
  Edit,
  CheckCircle,
  XCircle,
  X,
} from 'lucide-react'
import { createCatalogItem, fetchCatalog, updateCatalogItem } from '@/lib/api'
import { CompanyWideReadOnlyNote, useCompanyWideWrite } from '@/components/CompanyWideReadOnly'

interface CostCenter {
  id: number
  code: string
  name: string
  isActive: boolean
}

const emptyForm = {
  code: '',
  name: '',
}

export default function CostCentersPage() {
  const [items, setItems] = useState<CostCenter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<CostCenter | null>(null)
  const [formData, setFormData] = useState({ ...emptyForm })
  // مراكز التكلفة لكل الشركة: حساب الفرع يشوفها بس
  const { canWrite, readOnly } = useCompanyWideWrite()

  const loadData = async () => {
    try {
      const data = await fetchCatalog<CostCenter>('cost-centers')
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

  const filtered = items.filter(
    (c) => c.name.includes(searchQuery) || c.code.includes(searchQuery)
  )
  const activeCount = items.filter((c) => c.isActive).length

  const handleOpenModal = (c?: CostCenter) => {
    setModalError(null)
    if (c) {
      setEditing(c)
      setFormData({ code: c.code, name: c.name })
    } else {
      setEditing(null)
      setFormData({ ...emptyForm })
    }
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setModalError(null)
    const payload = { code: formData.code.trim(), name: formData.name.trim() }
    try {
      if (editing) {
        const updated = await updateCatalogItem<CostCenter>(
          'cost-centers',
          editing.id,
          payload
        )
        setItems(items.map((c) => (c.id === editing.id ? updated : c)))
      } else {
        const created = await createCatalogItem<CostCenter>('cost-centers', payload)
        setItems([...items, created])
      }
      setShowModal(false)
    } catch (err: any) {
      setModalError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // لا حذف — التعطيل يكفي حتى لا تنكسر تقارير الرواتب القديمة
  const toggleActive = async (c: CostCenter) => {
    try {
      const updated = await updateCatalogItem<CostCenter>('cost-centers', c.id, {
        isActive: !c.isActive,
      })
      setItems(items.map((x) => (x.id === c.id ? updated : x)))
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
          <span className="text-gray-800">مراكز التكلفة</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">مراكز التكلفة</h1>
            <p className="text-gray-500 mt-1">
              تصنيف مالي للموظفين — يُستخدم في تقارير الرواتب لاحقاً
            </p>
          </div>
          {canWrite && (
            <button
              onClick={() => handleOpenModal()}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={20} />
              إضافة مركز تكلفة
            </button>
          )}
        </div>

        {readOnly && <CompanyWideReadOnlyNote />}

        {/* Error Banner */}
        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
              <Landmark size={24} className="text-primary-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">مراكز التكلفة</p>
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
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <XCircle size={24} className="text-gray-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">معطّلة</p>
              <p className="text-2xl font-bold text-gray-600">
                {items.length - activeCount}
              </p>
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
              placeholder="البحث بالكود أو الاسم..."
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
                <Landmark size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-bold text-gray-800 mb-2">
                  لا توجد مراكز تكلفة
                </h3>
                {canWrite && <p className="text-gray-500">أضف أول مركز تكلفة من الزر أعلاه</p>}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 text-right">
                      <th className="py-3 px-4 text-sm font-medium text-gray-500">الكود</th>
                      <th className="py-3 px-4 text-sm font-medium text-gray-500">الاسم</th>
                      <th className="py-3 px-4 text-sm font-medium text-gray-500">الحالة</th>
                      {canWrite && <th className="py-3 px-4 text-sm font-medium text-gray-500">إجراءات</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => (
                      <tr
                        key={c.id}
                        className={`border-t border-gray-50 hover:bg-gray-50/50 ${
                          !c.isActive ? 'opacity-60' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-sm font-mono text-gray-700" dir="ltr">
                          {c.code}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-gray-800 text-sm">{c.name}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`badge text-xs ${
                              c.isActive
                                ? 'bg-success-50 text-success-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {c.isActive ? 'مفعّل' : 'معطّل'}
                          </span>
                        </td>
                        {canWrite && <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenModal(c)}
                              className="text-xs px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 flex items-center gap-1"
                            >
                              <Edit size={12} />
                              تعديل
                            </button>
                            <button
                              onClick={() => toggleActive(c)}
                              className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 ${
                                c.isActive
                                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  : 'bg-success-50 text-success-600 hover:bg-green-100'
                              }`}
                            >
                              {c.isActive ? (
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
                        </td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Modal */}
        {showModal && canWrite && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">
                  {editing ? 'تعديل مركز التكلفة' : 'إضافة مركز تكلفة'}
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
                    الكود *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    className="input w-full font-mono"
                    dir="ltr"
                    placeholder="CC-100"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    كود فريد لا يتكرر — يظهر في التقارير المالية
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الاسم *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input w-full"
                    placeholder="مثال: الإدارة العامة"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="btn-secondary">
                  إلغاء
                </button>
                <button
                  onClick={handleSave}
                  className="btn-primary"
                  disabled={!formData.code.trim() || !formData.name.trim() || saving}
                >
                  {saving ? 'جارٍ الحفظ...' : editing ? 'حفظ التغييرات' : 'إضافة المركز'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
