'use client'

import { useEffect, useMemo, useState } from 'react'
import { MainLayout } from '@/components/layout'
import Link from 'next/link'
import {
  ArrowRight,
  Plus,
  Search,
  Package,
  Edit,
  CheckCircle,
  Archive,
  RotateCcw,
  X,
  Tags,
} from 'lucide-react'
import {
  can,
  fetchAssets,
  createAsset,
  updateAsset,
  retireAsset,
  reactivateAsset,
  fetchCatalog,
  createCatalogItem,
  updateCatalogItem,
  type ApiAsset,
} from '@/lib/api'
import { useCurrency } from '@/lib/currency'
import { CompanyWideReadOnlyNote, useCompanyWideWrite } from '@/components/CompanyWideReadOnly'

// حالات الأصل — تسميات موحّدة في كل النظام
const assetStatusLabels: Record<string, string> = {
  AVAILABLE: 'متاح',
  ASSIGNED: 'مُسنَد',
  RETIRED: 'متقاعد',
}

const assetStatusStyles: Record<string, string> = {
  AVAILABLE: 'bg-success-50 text-success-700',
  ASSIGNED: 'bg-blue-100 text-blue-700',
  RETIRED: 'bg-gray-100 text-gray-600',
}

// حالة الأصل مع احتياط للسجلات القديمة بلا حالة
const assetStatus = (a: ApiAsset): 'AVAILABLE' | 'ASSIGNED' | 'RETIRED' =>
  a.status ?? (a.currentHolderId ? 'ASSIGNED' : 'AVAILABLE')

const emptyForm = {
  name: '',
  category: '',
  serialNumber: '',
  value: '',
}

// تصنيف أصل — كتالوج asset_types (القراءة للجميع، الكتابة settings.manage)
interface AssetTypeRow {
  id: number
  name: string
  isActive: boolean
}

export default function AssetRegistryPage() {
  const currency = useCurrency()
  const [assets, setAssets] = useState<ApiAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // كتالوج التصنيفات — مصدر حقل «الفئة»، وإدارته لمن يملك settings.manage
  const [assetTypes, setAssetTypes] = useState<AssetTypeRow[]>([])
  const [typesError, setTypesError] = useState<string | null>(null)
  const canManageTypes = can('settings.manage')
  // التصنيفات لكل الشركة: حساب الفرع يشوفها بس (الأصول نفسها بفرعها وتتدار عادي)
  const { canWrite: canWriteTypes, readOnly: typesReadOnly } = useCompanyWideWrite()
  const [showTypesModal, setShowTypesModal] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')
  const [editingTypeId, setEditingTypeId] = useState<number | null>(null)
  const [editingTypeName, setEditingTypeName] = useState('')
  const [typeBusy, setTypeBusy] = useState(false)
  const [typeModalError, setTypeModalError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<ApiAsset | null>(null)
  const [formData, setFormData] = useState({ ...emptyForm })
  const [busyId, setBusyId] = useState<number | null>(null)

  const loadData = async () => {
    try {
      const data = await fetchAssets()
      setAssets(data)
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // فشل الكتالوج لا يُسقط السجل — يُعرض تحت حقل الفئة
  const loadTypes = async () => {
    try {
      setAssetTypes(await fetchCatalog<AssetTypeRow>('asset-types'))
      setTypesError(null)
    } catch (err: any) {
      setTypesError(err.message)
    }
  }

  useEffect(() => {
    loadData()
    loadTypes()
  }, [])

  // الفئات المتاحة للفلترة — قيم مميزة من الأصول الموجودة
  const categories = useMemo(
    () =>
      Array.from(new Set(assets.map((a) => a.category).filter(Boolean))).sort(),
    [assets]
  )

  // خيارات «الفئة» في النموذج: التصنيفات المفعّلة من الكتالوج، ومعها فئة الأصل
  // الحالية عند التعديل لو خارج الكتالوج (بيانات قديمة) كي لا تتغير بصمت
  const activeTypeNames = assetTypes.filter((t) => t.isActive).map((t) => t.name)
  const categoryOptions =
    formData.category && !activeTypeNames.includes(formData.category)
      ? [...activeTypeNames, formData.category]
      : activeTypeNames

  // ===== إدارة كتالوج التصنيفات (settings.manage) =====
  const runTypeAction = async (fn: () => Promise<unknown>) => {
    setTypeBusy(true)
    setTypeModalError(null)
    try {
      await fn()
      await loadTypes()
      return true
    } catch (err: any) {
      setTypeModalError(err.message)
      return false
    } finally {
      setTypeBusy(false)
    }
  }

  const handleAddType = async () => {
    const name = newTypeName.trim()
    if (!name) return
    if (await runTypeAction(() => createCatalogItem('asset-types', { name, isActive: true }))) {
      setNewTypeName('')
    }
  }

  const handleRenameType = async (t: AssetTypeRow) => {
    const name = editingTypeName.trim()
    if (!name || name === t.name) {
      setEditingTypeId(null)
      return
    }
    if (await runTypeAction(() => updateCatalogItem('asset-types', t.id, { name }))) {
      setEditingTypeId(null)
    }
  }

  const handleToggleType = (t: AssetTypeRow) =>
    runTypeAction(() => updateCatalogItem('asset-types', t.id, { isActive: !t.isActive }))

  const filtered = assets.filter((a) => {
    const st = assetStatus(a)
    const q = searchQuery.trim()
    const matchesSearch =
      !q || a.name.includes(q) || (a.serialNumber ?? '').includes(q)
    return (
      matchesSearch &&
      (!filterStatus || st === filterStatus) &&
      (!filterCategory || a.category === filterCategory)
    )
  })

  const stats = {
    total: assets.length,
    available: assets.filter((a) => assetStatus(a) === 'AVAILABLE').length,
    assigned: assets.filter((a) => assetStatus(a) === 'ASSIGNED').length,
    retired: assets.filter((a) => assetStatus(a) === 'RETIRED').length,
  }

  const handleOpenModal = (a?: ApiAsset) => {
    setModalError(null)
    if (a) {
      setEditing(a)
      setFormData({
        name: a.name,
        category: a.category,
        serialNumber: a.serialNumber ?? '',
        value: a.value != null ? String(Number(a.value)) : '',
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
    const payload: Partial<ApiAsset> = {
      name: formData.name.trim(),
      category: formData.category.trim(),
      serialNumber: formData.serialNumber.trim() || undefined,
      value: formData.value !== '' ? Number(formData.value) : undefined,
    }
    try {
      if (editing) {
        const updated = await updateAsset(editing.id, payload)
        setAssets(assets.map((a) => (a.id === editing.id ? { ...a, ...updated } : a)))
      } else {
        const created = await createAsset(payload)
        setAssets([...assets, created])
      }
      setShowModal(false)
    } catch (err: any) {
      setModalError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // إحالة للتقاعد — الباك يرفض الأصول المُسنَدة برسالة عربية تُعرض كما هي
  const handleRetire = async (a: ApiAsset) => {
    if (!window.confirm(`إحالة «${a.name}» للتقاعد؟ لن يظهر في التسليم الجديد.`)) return
    setBusyId(a.id)
    setError(null)
    try {
      const updated = await retireAsset(a.id)
      setAssets(assets.map((x) => (x.id === a.id ? { ...x, ...updated } : x)))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const handleReactivate = async (a: ApiAsset) => {
    setBusyId(a.id)
    setError(null)
    try {
      const updated = await reactivateAsset(a.id)
      setAssets(assets.map((x) => (x.id === a.id ? { ...x, ...updated } : x)))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {/* الإعدادات العامة لمن يملكها فقط — الشاشة نفسها بصلاحية العهد */}
          {canManageTypes ? (
            <Link href="/settings" className="hover:text-primary-600">
              الإعدادات
            </Link>
          ) : (
            <span>الإعدادات</span>
          )}
          <ArrowRight size={16} />
          <span className="text-gray-800">سجل الأصول</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">سجل الأصول</h1>
            <p className="text-gray-500 mt-1">
              سجل أصول الشركة — الإضافة والتعديل والإحالة للتقاعد
            </p>
          </div>
          <div className="flex items-center gap-3">
            {canManageTypes && (
              <button
                onClick={() => {
                  setTypeModalError(null)
                  setEditingTypeId(null)
                  setShowTypesModal(true)
                }}
                className="btn-secondary flex items-center gap-2"
              >
                <Tags size={18} />
                تصنيفات الأصول
              </button>
            )}
            <button
              onClick={() => handleOpenModal()}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={20} />
              إضافة أصل
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
              <Package size={24} className="text-primary-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي الأصول</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-success-50 rounded-xl flex items-center justify-center">
              <CheckCircle size={24} className="text-success-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">متاحة</p>
              <p className="text-2xl font-bold text-success-600">{stats.available}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Package size={24} className="text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">مُسنَدة</p>
              <p className="text-2xl font-bold text-blue-600">{stats.assigned}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <Archive size={24} className="text-gray-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">متقاعدة</p>
              <p className="text-2xl font-bold text-gray-600">{stats.retired}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="بحث بالاسم أو الرقم التسلسلي..."
                className="input pr-10 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input w-48"
            >
              <option value="">كل الحالات</option>
              {Object.entries(assetStatusLabels).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="input w-48"
            >
              <option value="">كل الفئات</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
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
                <Package size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-bold text-gray-800 mb-2">لا توجد أصول مطابقة</h3>
                <p className="text-gray-500">أضف أول أصل من الزر أعلاه</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 text-right">
                      <th className="py-3 px-4 text-sm font-medium text-gray-500">الاسم</th>
                      <th className="py-3 px-4 text-sm font-medium text-gray-500">الفئة</th>
                      <th className="py-3 px-4 text-sm font-medium text-gray-500">الرقم التسلسلي</th>
                      <th className="py-3 px-4 text-sm font-medium text-gray-500">القيمة</th>
                      <th className="py-3 px-4 text-sm font-medium text-gray-500">الحالة</th>
                      <th className="py-3 px-4 text-sm font-medium text-gray-500">الحامل الحالي</th>
                      <th className="py-3 px-4 text-sm font-medium text-gray-500">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a) => {
                      const st = assetStatus(a)
                      return (
                        <tr
                          key={a.id}
                          className={`border-t border-gray-50 hover:bg-gray-50/50 ${
                            st === 'RETIRED' ? 'opacity-60' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <p className="font-medium text-gray-800 text-sm">{a.name}</p>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">{a.category}</td>
                          <td className="py-3 px-4 text-sm font-mono text-gray-600" dir="ltr">
                            {a.serialNumber || '—'}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-700">
                            {a.value != null
                              ? `${Number(a.value).toLocaleString('en-US')} ${currency}`
                              : '—'}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`badge text-xs ${assetStatusStyles[st]}`}>
                              {assetStatusLabels[st]}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {a.holderName || '—'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenModal(a)}
                                className="text-xs px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 flex items-center gap-1"
                              >
                                <Edit size={12} />
                                تعديل
                              </button>
                              {st === 'AVAILABLE' && (
                                <button
                                  onClick={() => handleRetire(a)}
                                  disabled={busyId === a.id}
                                  className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 flex items-center gap-1"
                                >
                                  <Archive size={12} />
                                  {busyId === a.id ? 'جارٍ الإحالة...' : 'إحالة للتقاعد'}
                                </button>
                              )}
                              {st === 'RETIRED' && (
                                <button
                                  onClick={() => handleReactivate(a)}
                                  disabled={busyId === a.id}
                                  className="text-xs px-3 py-1.5 bg-success-50 text-success-600 rounded-lg hover:bg-green-100 flex items-center gap-1"
                                >
                                  <RotateCcw size={12} />
                                  {busyId === a.id ? 'جارٍ التفعيل...' : 'إعادة تفعيل'}
                                </button>
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
        )}

        {/* Modal — إضافة / تعديل أصل */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">
                  {editing ? 'تعديل الأصل' : 'إضافة أصل'}
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الاسم *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input w-full"
                      placeholder="لابتوب Dell Latitude"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الفئة *
                    </label>
                    {/* الفئة من كتالوج التصنيفات — لا نص حر */}
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      className="input w-full"
                    >
                      <option value="">— اختر التصنيف —</option>
                      {categoryOptions.map((c) => (
                        <option key={c} value={c}>
                          {activeTypeNames.includes(c) ? c : `${c} (خارج الكتالوج)`}
                        </option>
                      ))}
                    </select>
                    {typesError ? (
                      <p className="text-xs text-red-600 mt-1">
                        تعذر تحميل التصنيفات: {typesError}
                      </p>
                    ) : (
                      activeTypeNames.length === 0 && (
                        <p className="text-xs text-gray-400 mt-1">
                          {canManageTypes && canWriteTypes
                            ? 'لا توجد تصنيفات مفعّلة — أضفها من «تصنيفات الأصول»'
                            : 'لا توجد تصنيفات مفعّلة — اطلب إضافتها من مسؤول الإعدادات'}
                        </p>
                      )
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الرقم التسلسلي
                  </label>
                  <input
                    type="text"
                    value={formData.serialNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, serialNumber: e.target.value.toUpperCase() })
                    }
                    className="input w-full font-mono"
                    dir="ltr"
                    placeholder="LP-2026-012"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    القيمة ({currency})
                  </label>
                  <input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="input w-full"
                    dir="ltr"
                    min={0}
                    placeholder="4500"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    القيمة اختيارية — تُستخدم خصماً عند الفقد/التلف في التصفية
                  </p>
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="btn-secondary">
                  إلغاء
                </button>
                <button
                  onClick={handleSave}
                  className="btn-primary"
                  disabled={!formData.name.trim() || !formData.category.trim() || saving}
                >
                  {saving ? 'جارٍ الحفظ...' : editing ? 'حفظ التغييرات' : 'إضافة الأصل'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal — كتالوج تصنيفات الأصول (settings.manage) */}
        {showTypesModal && canManageTypes && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">تصنيفات الأصول</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    القائمة التي يُختار منها حقل «الفئة» — المعطَّل لا يظهر للأصول الجديدة
                  </p>
                </div>
                <button
                  onClick={() => setShowTypesModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {typesReadOnly && <CompanyWideReadOnlyNote />}
                {typeModalError && (
                  <div className="bg-red-50 text-red-700 rounded-xl p-4">{typeModalError}</div>
                )}

                {canWriteTypes && <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddType()}
                    className="input flex-1"
                    placeholder="اسم تصنيف جديد — مثال: طابعة"
                    maxLength={100}
                  />
                  <button
                    onClick={handleAddType}
                    disabled={typeBusy || !newTypeName.trim()}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Plus size={16} />
                    إضافة
                  </button>
                </div>}

                <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl">
                  {assetTypes.length === 0 && (
                    <p className="p-4 text-sm text-gray-400 text-center">لا توجد تصنيفات بعد</p>
                  )}
                  {assetTypes.map((t) => (
                    <div key={t.id} className="flex items-center gap-2 p-3">
                      {editingTypeId === t.id && canWriteTypes ? (
                        <>
                          <input
                            type="text"
                            value={editingTypeName}
                            onChange={(e) => setEditingTypeName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRenameType(t)}
                            className="input flex-1 text-sm py-1.5"
                            maxLength={100}
                            autoFocus
                          />
                          <button
                            onClick={() => handleRenameType(t)}
                            disabled={typeBusy || !editingTypeName.trim()}
                            className="text-xs px-3 py-1.5 bg-primary-500 text-white rounded-lg disabled:opacity-50"
                          >
                            حفظ
                          </button>
                          <button
                            onClick={() => setEditingTypeId(null)}
                            className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg"
                          >
                            إلغاء
                          </button>
                        </>
                      ) : (
                        <>
                          <span
                            className={`flex-1 text-sm ${
                              t.isActive ? 'text-gray-800' : 'text-gray-400 line-through'
                            }`}
                          >
                            {t.name}
                          </span>
                          {canWriteTypes && <>
                          <button
                            onClick={() => {
                              setEditingTypeId(t.id)
                              setEditingTypeName(t.name)
                            }}
                            disabled={typeBusy}
                            className="text-xs px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 flex items-center gap-1"
                          >
                            <Edit size={12} />
                            تعديل
                          </button>
                          <button
                            onClick={() => handleToggleType(t)}
                            disabled={typeBusy}
                            className={`text-xs px-3 py-1.5 rounded-lg ${
                              t.isActive
                                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                : 'bg-success-50 text-success-600 hover:bg-green-100'
                            }`}
                          >
                            {t.isActive ? 'تعطيل' : 'تفعيل'}
                          </button>
                          </>}
                        </>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400">
                  تعديل اسم التصنيف لا يغيّر فئة الأصول المسجلة به سابقاً، والحذف غير متاح —
                  عطّل التصنيف بدلاً منه
                </p>
              </div>
              <div className="p-6 border-t border-gray-100 flex items-center justify-end">
                <button onClick={() => setShowTypesModal(false)} className="btn-secondary">
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
