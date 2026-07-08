'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import Link from 'next/link'
import {
  ArrowRight,
  Plus,
  Package,
  Edit,
  MoreVertical,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { createCatalogItem, fetchCatalog, updateCatalogItem } from '@/lib/api'

interface AssetType {
  id: number
  name: string
  isActive: boolean
}

const emptyForm = {
  name: '',
  isActive: true,
}

export default function AssetTypesPage() {
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<AssetType | null>(null)
  const [activeMenu, setActiveMenu] = useState<number | null>(null)
  const [formData, setFormData] = useState({ ...emptyForm })

  const loadData = async () => {
    try {
      const data = await fetchCatalog<AssetType>('asset-types')
      setAssetTypes(data)
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

  const activeCount = assetTypes.filter((t) => t.isActive).length

  const handleOpenModal = (t?: AssetType) => {
    setModalError(null)
    if (t) {
      setEditing(t)
      setFormData({ name: t.name, isActive: t.isActive })
    } else {
      setEditing(null)
      setFormData({ ...emptyForm })
    }
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setModalError(null)
    try {
      if (editing) {
        const updated = await updateCatalogItem<AssetType>('asset-types', editing.id, {
          name: formData.name,
          isActive: formData.isActive,
        })
        setAssetTypes(assetTypes.map((t) => (t.id === editing.id ? updated : t)))
      } else {
        const created = await createCatalogItem<AssetType>('asset-types', {
          name: formData.name,
          isActive: formData.isActive,
        })
        setAssetTypes([...assetTypes, created])
      }
      setShowModal(false)
    } catch (err: any) {
      setModalError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (t: AssetType) => {
    setActiveMenu(null)
    try {
      const updated = await updateCatalogItem<AssetType>('asset-types', t.id, {
        isActive: !t.isActive,
      })
      setAssetTypes(assetTypes.map((x) => (x.id === t.id ? updated : x)))
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
          <span className="text-gray-800">أنواع العهد</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">أنواع العهد</h1>
            <p className="text-gray-500 mt-1">
              عرّف العهد التي تُسلَّم للموظفين في النظام
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            إضافة نوع عهدة
          </button>
        </div>

        {/* Error Banner */}
        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
              <Package size={24} className="text-primary-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">أنواع العهد</p>
              <p className="text-2xl font-bold text-gray-800">{assetTypes.length}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-success-50 rounded-xl flex items-center justify-center">
              <CheckCircle size={24} className="text-success-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">مفعّلة</p>
              <p className="text-2xl font-bold text-gray-800">{activeCount}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
              <XCircle size={24} className="text-indigo-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">معطّلة</p>
              <p className="text-2xl font-bold text-indigo-600">
                {assetTypes.length - activeCount}
              </p>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Types Grid */}
        {!loading && (
          <div className="grid grid-cols-3 gap-4">
            {assetTypes.map((t) => (
              <div
                key={t.id}
                className={`card p-5 relative ${!t.isActive ? 'opacity-60' : ''}`}
              >
                <div className="absolute top-4 left-4">
                  <button
                    onClick={() => setActiveMenu(activeMenu === t.id ? null : t.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <MoreVertical size={18} className="text-gray-500" />
                  </button>
                  {activeMenu === t.id && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setActiveMenu(null)}
                      />
                      <div className="absolute left-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20">
                        <button
                          onClick={() => {
                            handleOpenModal(t)
                            setActiveMenu(null)
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50"
                        >
                          <Edit size={16} />
                          تعديل
                        </button>
                        <button
                          onClick={() => toggleActive(t)}
                          className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50"
                        >
                          {t.isActive ? (
                            <>
                              <XCircle size={16} />
                              تعطيل
                            </>
                          ) : (
                            <>
                              <CheckCircle size={16} />
                              تفعيل
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
                    <Package size={24} className="text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{t.name}</h3>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-sm">
                  <span className="text-gray-500">#{t.id}</span>
                  <span
                    className={`badge text-xs ${
                      t.isActive ? 'badge-success' : 'badge-danger'
                    }`}
                  >
                    {t.isActive ? 'مفعّل' : 'معطّل'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && assetTypes.length === 0 && (
          <div className="card p-12 text-center">
            <Package size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">لا توجد أنواع عهد</h3>
            <p className="text-gray-500">أضف أول نوع عهدة من الزر أعلاه</p>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">
                  {editing ? 'تعديل نوع العهدة' : 'إضافة نوع عهدة'}
                </h2>
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
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="input w-full"
                    placeholder="مثال: لابتوب"
                  />
                </div>

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
                  disabled={!formData.name || saving}
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
