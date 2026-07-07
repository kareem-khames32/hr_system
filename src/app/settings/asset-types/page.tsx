'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import Link from 'next/link'
import {
  ArrowRight,
  Plus,
  Package,
  Edit,
  Trash2,
  MoreVertical,
  CheckCircle,
  XCircle,
  Laptop,
  Smartphone,
  Car,
  KeyRound,
  CreditCard,
  Shield,
  GitBranch,
} from 'lucide-react'

interface AssetType {
  id: string
  name: string
  nameEn: string
  icon: 'laptop' | 'phone' | 'car' | 'key' | 'card' | 'other'
  requiresApproval: boolean // التسليم يمر بدورة اعتماد؟
  requiresReturnApproval: boolean // الإخلاء يمر بدورة اعتماد؟
  deductIfLost: boolean // يُخصم عند الفقد/التلف؟
  defaultValue: number // القيمة التقديرية للخصم
  isActive: boolean
  assignedCount: number
}

const iconMap = {
  laptop: Laptop,
  phone: Smartphone,
  car: Car,
  key: KeyRound,
  card: CreditCard,
  other: Package,
}

const iconLabels = {
  laptop: 'لابتوب',
  phone: 'جوال',
  car: 'سيارة',
  key: 'مفاتيح',
  card: 'بطاقة',
  other: 'أخرى',
}

const initialAssetTypes: AssetType[] = [
  {
    id: 'at1',
    name: 'لابتوب',
    nameEn: 'Laptop',
    icon: 'laptop',
    requiresApproval: true,
    requiresReturnApproval: true,
    deductIfLost: true,
    defaultValue: 4500,
    isActive: true,
    assignedCount: 84,
  },
  {
    id: 'at2',
    name: 'هاتف جوال',
    nameEn: 'Mobile Phone',
    icon: 'phone',
    requiresApproval: true,
    requiresReturnApproval: false,
    deductIfLost: true,
    defaultValue: 2000,
    isActive: true,
    assignedCount: 45,
  },
  {
    id: 'at3',
    name: 'سيارة شركة',
    nameEn: 'Company Car',
    icon: 'car',
    requiresApproval: true,
    requiresReturnApproval: true,
    deductIfLost: false,
    defaultValue: 0,
    isActive: true,
    assignedCount: 7,
  },
  {
    id: 'at4',
    name: 'بطاقة دخول',
    nameEn: 'Access Card',
    icon: 'card',
    requiresApproval: false,
    requiresReturnApproval: false,
    deductIfLost: true,
    defaultValue: 100,
    isActive: true,
    assignedCount: 156,
  },
  {
    id: 'at5',
    name: 'مفاتيح مكتب',
    nameEn: 'Office Keys',
    icon: 'key',
    requiresApproval: false,
    requiresReturnApproval: false,
    deductIfLost: true,
    defaultValue: 50,
    isActive: true,
    assignedCount: 32,
  },
]

const emptyForm = {
  name: '',
  nameEn: '',
  icon: 'other' as AssetType['icon'],
  requiresApproval: true,
  requiresReturnApproval: false,
  deductIfLost: true,
  defaultValue: 0,
  isActive: true,
}

export default function AssetTypesPage() {
  const [assetTypes, setAssetTypes] = useState(initialAssetTypes)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<AssetType | null>(null)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [formData, setFormData] = useState(emptyForm)

  const totalAssigned = assetTypes.reduce((s, t) => s + t.assignedCount, 0)

  const handleOpenModal = (t?: AssetType) => {
    if (t) {
      setEditing(t)
      setFormData({
        name: t.name,
        nameEn: t.nameEn,
        icon: t.icon,
        requiresApproval: t.requiresApproval,
        requiresReturnApproval: t.requiresReturnApproval,
        deductIfLost: t.deductIfLost,
        defaultValue: t.defaultValue,
        isActive: t.isActive,
      })
    } else {
      setEditing(null)
      setFormData(emptyForm)
    }
    setShowModal(true)
  }

  const handleSave = () => {
    if (editing) {
      setAssetTypes(
        assetTypes.map((t) => (t.id === editing.id ? { ...t, ...formData } : t))
      )
    } else {
      setAssetTypes([
        ...assetTypes,
        { id: 'at' + Date.now(), ...formData, assignedCount: 0 },
      ])
    }
    setShowModal(false)
  }

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف نوع العهدة؟')) {
      setAssetTypes(assetTypes.filter((t) => t.id !== id))
    }
    setActiveMenu(null)
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
              عرّف العهد التي تُسلَّم للموظفين وقواعد اعتمادها وخصمها
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
              <p className="text-sm text-gray-500">عهد مسلَّمة حالياً</p>
              <p className="text-2xl font-bold text-gray-800">{totalAssigned}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
              <GitBranch size={24} className="text-indigo-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">تتطلب اعتماداً عند التسليم</p>
              <p className="text-2xl font-bold text-indigo-600">
                {assetTypes.filter((t) => t.requiresApproval).length}
              </p>
            </div>
          </div>
        </div>

        {/* Types Grid */}
        <div className="grid grid-cols-3 gap-4">
          {assetTypes.map((t) => {
            const Icon = iconMap[t.icon]
            return (
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
                          onClick={() => handleDelete(t.id)}
                          className="w-full flex items-center gap-2 px-4 py-2 text-danger-600 hover:bg-danger-50"
                        >
                          <Trash2 size={16} />
                          حذف
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
                    <Icon size={24} className="text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{t.name}</h3>
                    <p className="text-xs text-gray-400">{t.nameEn}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    {t.requiresApproval ? (
                      <CheckCircle size={15} className="text-success-500" />
                    ) : (
                      <XCircle size={15} className="text-gray-300" />
                    )}
                    <span className="text-gray-600">التسليم باعتماد</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.requiresReturnApproval ? (
                      <CheckCircle size={15} className="text-success-500" />
                    ) : (
                      <XCircle size={15} className="text-gray-300" />
                    )}
                    <span className="text-gray-600">الإخلاء باعتماد</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.deductIfLost ? (
                      <CheckCircle size={15} className="text-warning-500" />
                    ) : (
                      <XCircle size={15} className="text-gray-300" />
                    )}
                    <span className="text-gray-600">
                      يُخصم عند الفقد
                      {t.deductIfLost && t.defaultValue > 0 && (
                        <span className="text-xs text-gray-400">
                          {' '}
                          (~{t.defaultValue.toLocaleString()} ر.س)
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-sm">
                  <span className="text-gray-500">{t.assignedCount} مسلَّمة</span>
                  <span
                    className={`badge text-xs ${
                      t.isActive ? 'badge-success' : 'badge-danger'
                    }`}
                  >
                    {t.isActive ? 'مفعّل' : 'معطّل'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الاسم (عربي) *
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الاسم (إنجليزي)
                    </label>
                    <input
                      type="text"
                      value={formData.nameEn}
                      onChange={(e) =>
                        setFormData({ ...formData, nameEn: e.target.value })
                      }
                      className="input w-full"
                      dir="ltr"
                      placeholder="Laptop"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الأيقونة
                    </label>
                    <select
                      value={formData.icon}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          icon: e.target.value as AssetType['icon'],
                        })
                      }
                      className="input w-full"
                    >
                      {Object.entries(iconLabels).map(([id, label]) => (
                        <option key={id} value={id}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      القيمة التقديرية (للخصم عند الفقد)
                    </label>
                    <input
                      type="number"
                      value={formData.defaultValue}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          defaultValue: Number(e.target.value),
                        })
                      }
                      className="input w-full"
                      min="0"
                    />
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                  <label className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield size={16} className="text-indigo-500" />
                      <span className="text-sm text-gray-700">
                        التسليم يمر بدورة اعتماد
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.requiresApproval}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          requiresApproval: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded border-gray-300 text-primary-600"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield size={16} className="text-indigo-500" />
                      <span className="text-sm text-gray-700">
                        الإخلاء/الإرجاع يمر بدورة اعتماد
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.requiresReturnApproval}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          requiresReturnApproval: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded border-gray-300 text-primary-600"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package size={16} className="text-warning-500" />
                      <span className="text-sm text-gray-700">
                        يُخصم من الراتب/التصفية عند الفقد أو التلف
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.deductIfLost}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          deductIfLost: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded border-gray-300 text-primary-600"
                    />
                  </label>
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
                  disabled={!formData.name}
                >
                  {editing ? 'حفظ التغييرات' : 'إضافة النوع'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
