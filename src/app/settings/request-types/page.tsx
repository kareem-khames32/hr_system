'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import Link from 'next/link'
import {
  ArrowRight,
  Plus,
  Search,
  FileText,
  Edit,
  MoreVertical,
  CheckCircle,
  XCircle,
  GitBranch,
  Shield,
  Lock,
  Wallet,
  FileOutput,
  ClipboardList,
} from 'lucide-react'
import {
  ApiRequestType,
  fetchAdminRequestTypes,
  fetchApprovalChains,
  updateRequestType,
} from '@/lib/api'
import { categoryLabels } from '@/data/requestsCatalog'

interface ApprovalChain {
  id: number
  code: string
  nameAr: string
  isActive: boolean
}

const phaseLabels: Record<string, string> = {
  P1: 'المرحلة الأولى',
  P2: 'المرحلة الثانية',
  P3: 'المرحلة الثالثة',
}

const categoryLabelOf = (category: string) =>
  (categoryLabels as Record<string, string>)[category] ?? category

const parseRequiredFields = (raw?: string): string[] => {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

export default function RequestTypesPage() {
  const [requestTypes, setRequestTypes] = useState<ApiRequestType[]>([])
  const [chains, setChains] = useState<ApprovalChain[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<ApiRequestType | null>(null)
  const [activeMenu, setActiveMenu] = useState<number | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [types, ch] = await Promise.all([
          fetchAdminRequestTypes(),
          fetchApprovalChains(),
        ])
        setRequestTypes(types)
        setChains(ch)
        setError(null)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const usedCategories = [...new Set(requestTypes.map((rt) => rt.category))]

  const filtered = requestTypes.filter((rt) => {
    const matchesSearch =
      rt.nameAr.includes(searchQuery) ||
      rt.code.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || rt.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const activeCount = requestTypes.filter((rt) => rt.isActive).length
  const balanceCount = requestTypes.filter((rt) => rt.affectsBalance).length
  const pdfCount = requestTypes.filter((rt) => rt.autoGeneratesPdf).length

  const chainNameOf = (chainId?: number) =>
    chains.find((c) => c.id === chainId)?.nameAr ?? 'غير مربوط'

  const toggleStatus = async (rt: ApiRequestType) => {
    setActiveMenu(null)
    setUpdatingId(rt.id)
    try {
      const updated = await updateRequestType(rt.id, { isActive: !rt.isActive })
      setRequestTypes(requestTypes.map((t) => (t.id === rt.id ? updated : t)))
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUpdatingId(null)
    }
  }

  const assignChain = async (rt: ApiRequestType, chainId: number) => {
    setUpdatingId(rt.id)
    try {
      const updated = await updateRequestType(rt.id, { approvalChainId: chainId })
      setRequestTypes(requestTypes.map((t) => (t.id === rt.id ? updated : t)))
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUpdatingId(null)
    }
  }

  const handleOpenModal = (rt?: ApiRequestType) => {
    setEditing(rt ?? null)
    setShowModal(true)
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
          <span className="text-gray-800">بانِي الطلبات</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">بانِي الطلبات</h1>
            <p className="text-gray-500 mt-1">
              كتالوج أنواع الطلبات — فعّل الأنواع واربطها بدورات الاعتماد
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            إنشاء نوع طلب جديد
          </button>
        </div>

        {/* Error Banner */}
        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
                <ClipboardList size={24} className="text-primary-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">أنواع الطلبات</p>
                <p className="text-2xl font-bold text-gray-800">{requestTypes.length}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-success-50 rounded-xl flex items-center justify-center">
                <CheckCircle size={24} className="text-success-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">مفعّلة</p>
                <p className="text-2xl font-bold text-success-600">{activeCount}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Wallet size={24} className="text-indigo-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">تؤثر على الرصيد</p>
                <p className="text-2xl font-bold text-indigo-600">{balanceCount}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-warning-50 rounded-xl flex items-center justify-center">
                <FileOutput size={24} className="text-warning-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">توّلد PDF تلقائياً</p>
                <p className="text-2xl font-bold text-gray-800">{pdfCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="card p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search
                size={20}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="البحث عن نوع طلب..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pr-10 w-full md:w-96"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input w-48"
            >
              <option value="all">كل الفئات</option>
              {usedCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {categoryLabelOf(cat)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Request Types Grid */}
        {!loading && (
          <div className="grid grid-cols-2 gap-6">
            {filtered.map((rt) => {
              const fields = parseRequiredFields(rt.requiredFields)
              return (
                <div
                  key={rt.id}
                  className={`card p-6 relative ${!rt.isActive ? 'opacity-60' : ''}`}
                >
                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <span className="badge text-xs bg-gray-100 text-gray-600">
                      {categoryLabelOf(rt.category)}
                    </span>
                    <span
                      className={`badge text-xs ${
                        rt.isActive ? 'badge-success' : 'badge-danger'
                      }`}
                    >
                      {rt.isActive ? 'مفعّل' : 'معطّل'}
                    </span>
                  </div>

                  {/* Menu */}
                  <div className="absolute top-4 left-36">
                    <button
                      onClick={() =>
                        setActiveMenu(activeMenu === rt.id ? null : rt.id)
                      }
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <MoreVertical size={18} className="text-gray-500" />
                    </button>
                    {activeMenu === rt.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setActiveMenu(null)}
                        />
                        <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20">
                          <button
                            onClick={() => {
                              handleOpenModal(rt)
                              setActiveMenu(null)
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50"
                          >
                            <Edit size={16} />
                            تعديل
                          </button>
                          <button
                            onClick={() => toggleStatus(rt)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50"
                          >
                            {rt.isActive ? (
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

                  {/* Info */}
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center">
                      <FileText size={28} className="text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800 text-lg">{rt.nameAr}</h3>
                      <p className="text-gray-500 text-sm font-mono" dir="ltr">
                        {rt.code}
                      </p>
                      <p className="text-gray-600 text-sm mt-2">
                        {phaseLabels[rt.phase] ?? rt.phase}
                      </p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="mt-5 space-y-2.5">
                    <div className="flex items-center gap-3 text-sm">
                      <GitBranch size={16} className="text-gray-400" />
                      <span className="text-gray-600">دورة الاعتماد:</span>
                      <select
                        value={rt.approvalChainId ?? ''}
                        onChange={(e) => {
                          const chainId = Number(e.target.value)
                          if (chainId) assignChain(rt, chainId)
                        }}
                        disabled={updatingId === rt.id}
                        className="input flex-1 py-1.5 text-sm"
                      >
                        <option value="" disabled>
                          {chainNameOf(rt.approvalChainId)}
                        </option>
                        {chains.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nameAr}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      {rt.affectsBalance ? (
                        <CheckCircle size={16} className="text-success-500" />
                      ) : (
                        <XCircle size={16} className="text-gray-300" />
                      )}
                      <span className="text-gray-600">يؤثر على الرصيد</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      {rt.isSecurityRoute ? (
                        <Shield size={16} className="text-indigo-500" />
                      ) : (
                        <XCircle size={16} className="text-gray-300" />
                      )}
                      <span className="text-gray-600">مسار أمني</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      {rt.isConfidential ? (
                        <Lock size={16} className="text-warning-500" />
                      ) : (
                        <XCircle size={16} className="text-gray-300" />
                      )}
                      <span className="text-gray-600">سري</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      {rt.autoGeneratesPdf ? (
                        <FileOutput size={16} className="text-success-500" />
                      ) : (
                        <XCircle size={16} className="text-gray-300" />
                      )}
                      <span className="text-gray-600">يولّد PDF تلقائياً</span>
                    </div>
                  </div>

                  {/* Fields preview */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {fields.map((f) => (
                      <span
                        key={f}
                        className="text-xs bg-gray-50 text-gray-500 px-2 py-1 rounded-lg border border-gray-100 font-mono"
                        dir="ltr"
                      >
                        {f}
                      </span>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                    <span>{fields.length} حقول مطلوبة</span>
                    <span>{rt.phase}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="card p-12 text-center">
            <ClipboardList size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">لا توجد أنواع طلبات</h3>
            <p className="text-gray-500">جرّب تغيير البحث أو الفلتر</p>
          </div>
        )}

        {/* ===== Modal (بانِي الطلبات — عرض فقط في هذه المرحلة) ===== */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">
                  {editing ? 'تعديل نوع الطلب' : 'إنشاء نوع طلب جديد'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  التفعيل وربط دورة الاعتماد متاحان من البطاقات — التعديل الكامل للحقول
                  في مرحلة لاحقة
                </p>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      اسم الطلب (عربي) *
                    </label>
                    <input
                      type="text"
                      defaultValue={editing?.nameAr ?? ''}
                      className="input w-full"
                      placeholder="مثال: طلب شهادة تعريف بالراتب"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الكود
                    </label>
                    <input
                      type="text"
                      defaultValue={editing?.code ?? ''}
                      className="input w-full font-mono"
                      placeholder="e.g. SALARY_CERTIFICATE"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      التصنيف
                    </label>
                    <select
                      defaultValue={editing?.category ?? 'leaves'}
                      className="input w-full"
                    >
                      {Object.entries(categoryLabels).map(([id, label]) => (
                        <option key={id} value={id}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      دورة الاعتماد
                    </label>
                    <select
                      defaultValue={editing?.approvalChainId ?? ''}
                      className="input w-full"
                    >
                      <option value="">— اختر الدورة —</option>
                      {chains.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nameAr}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                      تُدار الدورات من «الاعتمادات والموافقات»
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      defaultChecked={editing?.affectsBalance ?? false}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">يؤثر على الرصيد</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      defaultChecked={editing?.isSecurityRoute ?? false}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">مسار أمني</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      defaultChecked={editing?.isConfidential ?? false}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">سري</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      defaultChecked={editing?.autoGeneratesPdf ?? false}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">يولّد PDF تلقائياً</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الحقول المطلوبة (JSON)
                  </label>
                  <textarea
                    defaultValue={editing?.requiredFields ?? ''}
                    className="input w-full h-24 resize-none font-mono text-sm"
                    dir="ltr"
                    placeholder='["fromDate","toDate","reason"]'
                  />
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  إلغاء
                </button>
                <button
                  className="btn-primary opacity-50 cursor-not-allowed"
                  disabled
                  title="التعديل الكامل في مرحلة لاحقة"
                >
                  {editing ? 'حفظ التغييرات' : 'إنشاء نوع الطلب'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
