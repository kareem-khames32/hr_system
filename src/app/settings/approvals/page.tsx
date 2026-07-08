'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import Link from 'next/link'
import {
  ArrowRight,
  Plus,
  Search,
  CheckCircle2,
  GitBranch,
  Edit,
  Trash2,
  MoreVertical,
  FileText,
  Clock,
  UserCheck,
  ChevronDown,
  ChevronLeft,
  AlertCircle,
  Zap,
  Copy,
  ToggleRight,
  ToggleLeft,
} from 'lucide-react'
import { ApiBranch, fetchApprovalChains, fetchBranches } from '@/lib/api'

// شكل سلسلة الاعتماد كما يرجعها الباك إند
interface ApiChainStep {
  id: number
  chainId: number
  stepOrder: number
  approverRole: string
  isParallel: boolean
  thresholdField: string | null
  thresholdOp: string | null
  thresholdValue: number | null
  slaDays: number | null
  escalateTo: string | null
  canDelegate: boolean
}

interface ApiChain {
  id: number
  code: string
  nameAr: string
  branchId: number | null
  isActive: boolean
  steps: ApiChainStep[]
}

// أدوار المعتمدين الحقيقية في المحرك
const roleLabels: Record<string, string> = {
  direct_manager_of_requester: 'المدير المباشر',
  receiving_team_manager: 'المدير المستقبِل',
  hr: 'الموارد البشرية',
  finance: 'المالية',
  executive: 'التنفيذي',
  custody_officer: 'أمين العهدة',
  it: 'تقنية المعلومات',
}

const roleDescriptions: Record<string, string> = {
  direct_manager_of_requester: 'مدير مقدم الطلب المباشر',
  receiving_team_manager: 'مدير الفريق المستقبِل (النقل)',
  hr: 'إدارة الموارد البشرية',
  finance: 'الإدارة المالية',
  executive: 'الإدارة التنفيذية',
  custody_officer: 'المسؤول عن العُهد',
  it: 'قسم تقنية المعلومات',
}

const thresholdFieldLabels: Record<string, string> = {
  amount: 'المبلغ',
  increase_pct: 'نسبة الزيادة %',
}

const READONLY_TITLE = 'التعديل في مرحلة لاحقة'

type StepForm = {
  id: number | string
  approverRole: string
  slaDays: number
  canDelegate: boolean
}

export default function ApprovalsPage() {
  const [chains, setChains] = useState<ApiChain[]>([])
  const [branches, setBranches] = useState<ApiBranch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterBranch, setFilterBranch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingChain, setEditingChain] = useState<ApiChain | null>(null)
  const [activeMenu, setActiveMenu] = useState<number | null>(null)
  const [expandedChain, setExpandedChain] = useState<number | null>(null)

  const [formData, setFormData] = useState<{
    name: string
    code: string
    branchId: string
    isActive: boolean
    steps: StepForm[]
  }>({
    name: '',
    code: '',
    branchId: 'all',
    isActive: true,
    steps: [],
  })

  useEffect(() => {
    const load = async () => {
      try {
        const [ch, brs] = await Promise.all([fetchApprovalChains(), fetchBranches()])
        setChains(ch as ApiChain[])
        setBranches(brs)
        setError(null)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const branchLabelOf = (branchId: number | null) =>
    branchId === null
      ? 'كل الفروع'
      : branches.find((b) => b.id === branchId)?.name ?? `فرع #${branchId}`

  const filteredChains = chains.filter((chain) => {
    const matchesSearch =
      chain.nameAr.includes(searchQuery) ||
      chain.code.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesBranch =
      !filterBranch ||
      (filterBranch === 'all'
        ? chain.branchId === null
        : chain.branchId === Number(filterBranch))
    return matchesSearch && matchesBranch
  })

  const handleOpenModal = (chain?: ApiChain) => {
    if (chain) {
      setEditingChain(chain)
      setFormData({
        name: chain.nameAr,
        code: chain.code,
        branchId: chain.branchId === null ? 'all' : String(chain.branchId),
        isActive: chain.isActive,
        steps: chain.steps.map((s) => ({
          id: s.id,
          approverRole: s.approverRole,
          slaDays: s.slaDays ?? 3,
          canDelegate: s.canDelegate,
        })),
      })
    } else {
      setEditingChain(null)
      setFormData({
        name: '',
        code: '',
        branchId: 'all',
        isActive: true,
        steps: [
          {
            id: 's1',
            approverRole: 'direct_manager_of_requester',
            slaDays: 3,
            canDelegate: true,
          },
        ],
      })
    }
    setShowModal(true)
  }

  const addStep = () => {
    setFormData({
      ...formData,
      steps: [
        ...formData.steps,
        {
          id: `s${formData.steps.length + 1}-${Date.now()}`,
          approverRole: 'direct_manager_of_requester',
          slaDays: 3,
          canDelegate: true,
        },
      ],
    })
  }

  const removeStep = (index: number) => {
    setFormData({
      ...formData,
      steps: formData.steps.filter((_, i) => i !== index),
    })
  }

  const updateStep = (index: number, field: keyof StepForm, value: any) => {
    const newSteps = [...formData.steps]
    ;(newSteps[index] as any)[field] = value
    setFormData({ ...formData, steps: newSteps })
  }

  const totalChains = chains.length
  const activeChains = chains.filter((c) => c.isActive).length
  const totalSteps = chains.reduce((sum, c) => sum + c.steps.length, 0)

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/settings" className="hover:text-primary-600">
            الإعدادات
          </Link>
          <ArrowRight size={16} />
          <span className="text-gray-800">الاعتمادات والموافقات</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">الاعتمادات والموافقات</h1>
            <p className="text-gray-500 mt-1">سلاسل الاعتماد الفعلية المطبقة على الطلبات</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            إضافة مسار اعتماد
          </button>
        </div>

        {/* Error Banner */}
        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
                <GitBranch size={24} className="text-primary-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">مسارات الاعتماد</p>
                <p className="text-2xl font-bold text-gray-800">{totalChains}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-success-50 rounded-xl flex items-center justify-center">
                <CheckCircle2 size={24} className="text-success-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">المسارات النشطة</p>
                <p className="text-2xl font-bold text-success-600">{activeChains}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-warning-50 rounded-xl flex items-center justify-center">
                <FileText size={24} className="text-warning-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">إجمالي الخطوات</p>
                <p className="text-2xl font-bold text-gray-800">{totalSteps}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                <UserCheck size={24} className="text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">متوسط المستويات</p>
                <p className="text-2xl font-bold text-gray-800">
                  {totalChains > 0 ? Math.round(totalSteps / totalChains) : 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search
                size={20}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="البحث عن مسار اعتماد..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pr-10 w-full"
              />
            </div>
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="input w-48"
            >
              <option value="">كل الفروع</option>
              <option value="all">مسارات عامة (كل الفروع)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
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

        {/* Chains List */}
        {!loading && filteredChains.length > 0 && (
          <div className="space-y-4">
            {/* Section Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                <GitBranch size={20} className="text-primary-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">سلاسل الاعتماد</h3>
                <p className="text-sm text-gray-500">{filteredChains.length} مسار اعتماد</p>
              </div>
            </div>

            {/* Chains */}
            <div className="grid grid-cols-1 gap-4 mr-13">
              {filteredChains.map((chain) => {
                const thresholdSteps = chain.steps.filter((s) => s.thresholdField)
                return (
                  <div
                    key={chain.id}
                    className={`card p-5 ${!chain.isActive ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            chain.isActive ? 'bg-success-100' : 'bg-gray-100'
                          }`}
                        >
                          <GitBranch
                            size={24}
                            className={chain.isActive ? 'text-success-600' : 'text-gray-400'}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-gray-800">{chain.nameAr}</h4>
                            <span
                              className={`badge text-xs ${
                                chain.isActive ? 'badge-success' : 'badge-danger'
                              }`}
                            >
                              {chain.isActive ? 'نشط' : 'معطل'}
                            </span>
                            <span className="badge text-xs bg-indigo-100 text-indigo-700">
                              {branchLabelOf(chain.branchId)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1 font-mono" dir="ltr">
                            {chain.code}
                          </p>

                          {/* Conditions */}
                          {thresholdSteps.length > 0 && (
                            <div className="flex items-center gap-2 mt-2">
                              <AlertCircle size={14} className="text-warning-500" />
                              <span className="text-xs text-warning-600">
                                {thresholdSteps.length} شرط عتبة
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="relative">
                        <button
                          onClick={() =>
                            setActiveMenu(activeMenu === chain.id ? null : chain.id)
                          }
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <MoreVertical size={18} className="text-gray-500" />
                        </button>

                        {activeMenu === chain.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActiveMenu(null)}
                            />
                            <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20">
                              <button
                                onClick={() => {
                                  handleOpenModal(chain)
                                  setActiveMenu(null)
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 text-sm"
                              >
                                <Edit size={16} />
                                عرض / تعديل
                              </button>
                              <button
                                disabled
                                title={READONLY_TITLE}
                                className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 opacity-50 cursor-not-allowed text-sm"
                              >
                                <Copy size={16} />
                                نسخ
                              </button>
                              <button
                                disabled
                                title={READONLY_TITLE}
                                className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 opacity-50 cursor-not-allowed text-sm"
                              >
                                {chain.isActive ? (
                                  <>
                                    <ToggleLeft size={16} />
                                    تعطيل
                                  </>
                                ) : (
                                  <>
                                    <ToggleRight size={16} />
                                    تفعيل
                                  </>
                                )}
                              </button>
                              <div className="border-t border-gray-100 my-1" />
                              <button
                                disabled
                                title={READONLY_TITLE}
                                className="w-full flex items-center gap-2 px-4 py-2 text-danger-600 opacity-50 cursor-not-allowed text-sm"
                              >
                                <Trash2 size={16} />
                                حذف
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Approval Steps */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">مستويات الاعتماد:</span>
                        <div className="flex items-center gap-2 flex-wrap">
                          {chain.steps.length === 0 && (
                            <span className="text-sm text-gray-400">
                              بلا موافقات — تنفيذ تلقائي
                            </span>
                          )}
                          {chain.steps.map((step, index) => (
                            <div key={step.id} className="flex items-center gap-2">
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                                <span className="w-5 h-5 bg-primary-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                  {step.stepOrder}
                                </span>
                                <span className="text-sm text-gray-700">
                                  {roleLabels[step.approverRole] ?? step.approverRole}
                                </span>
                                {step.canDelegate && (
                                  <Zap size={12} className="text-warning-500" />
                                )}
                              </div>
                              {index < chain.steps.length - 1 && (
                                <ChevronLeft size={16} className="text-gray-400" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Expand for more details */}
                    {chain.steps.length > 0 && (
                      <button
                        onClick={() =>
                          setExpandedChain(expandedChain === chain.id ? null : chain.id)
                        }
                        className="mt-3 text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                      >
                        <ChevronDown
                          size={16}
                          className={`transition-transform ${
                            expandedChain === chain.id ? 'rotate-180' : ''
                          }`}
                        />
                        {expandedChain === chain.id ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
                      </button>
                    )}

                    {/* Expanded Details */}
                    {expandedChain === chain.id && (
                      <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                        {chain.steps.map((step) => (
                          <div
                            key={step.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 bg-primary-500 text-white rounded-lg flex items-center justify-center font-bold">
                                {step.stepOrder}
                              </span>
                              <div>
                                <p className="font-medium text-gray-800">
                                  {roleLabels[step.approverRole] ?? step.approverRole}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {roleDescriptions[step.approverRole] ?? ''}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              {step.thresholdField && (
                                <span className="px-2 py-1 bg-warning-100 text-warning-700 rounded text-xs">
                                  {thresholdFieldLabels[step.thresholdField] ??
                                    step.thresholdField}{' '}
                                  {step.thresholdOp} {step.thresholdValue}
                                </span>
                              )}
                              {step.slaDays != null && (
                                <div className="flex items-center gap-1">
                                  <Clock size={14} />
                                  <span>{step.slaDays} أيام</span>
                                </div>
                              )}
                              {step.escalateTo && (
                                <span className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs">
                                  التصعيد إلى: {roleLabels[step.escalateTo] ?? step.escalateTo}
                                </span>
                              )}
                              {step.canDelegate && (
                                <span className="px-2 py-1 bg-warning-100 text-warning-700 rounded text-xs">
                                  يمكن التفويض
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredChains.length === 0 && (
          <div className="card p-12 text-center">
            <GitBranch size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">لا توجد مسارات اعتماد</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || filterBranch
                ? 'لم يتم العثور على مسارات مطابقة للبحث'
                : 'لم تُعرَّف سلاسل اعتماد بعد'}
            </p>
          </div>
        )}

        {/* Modal (عرض فقط — التعديل في مرحلة لاحقة) */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingChain ? 'تعديل مسار الاعتماد' : 'إضافة مسار اعتماد جديد'}
                </h2>
                <p className="text-sm text-warning-600 mt-1">
                  عرض فقط — {READONLY_TITLE}
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      اسم المسار *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="input w-full"
                      placeholder="مثال: اعتماد الإجازات"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      كود المسار *
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                      }
                      className="input w-full font-mono"
                      placeholder="CHAIN_X"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    نطاق الفرع *
                  </label>
                  <select
                    value={formData.branchId}
                    onChange={(e) =>
                      setFormData({ ...formData, branchId: e.target.value })
                    }
                    className="input w-full"
                  >
                    <option value="all">كل الفروع (مسار عام)</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} فقط
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    المسار الخاص بفرع يُطبَّق على طلبات موظفي هذا الفرع فقط — كل فرع بدوراته المنفصلة
                  </p>
                </div>

                {/* Approval Steps */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-medium text-gray-700">
                      مستويات الاعتماد *
                    </label>
                    <button
                      onClick={addStep}
                      className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                    >
                      <Plus size={16} />
                      إضافة مستوى
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formData.steps.map((step, index) => (
                      <div
                        key={step.id}
                        className="p-4 bg-gray-50 rounded-xl space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                              {index + 1}
                            </span>
                            <span className="text-sm font-medium text-gray-700">
                              المستوى {index + 1}
                            </span>
                          </div>
                          {formData.steps.length > 1 && (
                            <button
                              onClick={() => removeStep(index)}
                              className="text-danger-500 hover:text-danger-600"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">
                              المعتمد
                            </label>
                            <select
                              value={step.approverRole}
                              onChange={(e) =>
                                updateStep(index, 'approverRole', e.target.value)
                              }
                              className="input w-full text-sm"
                            >
                              {Object.entries(roleLabels).map(([id, name]) => (
                                <option key={id} value={id}>
                                  {name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">
                              مهلة الرد (أيام)
                            </label>
                            <input
                              type="number"
                              value={step.slaDays}
                              onChange={(e) =>
                                updateStep(index, 'slaDays', parseInt(e.target.value) || 1)
                              }
                              className="input w-full text-sm"
                              min={1}
                              max={30}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={step.canDelegate}
                              onChange={(e) =>
                                updateStep(index, 'canDelegate', e.target.checked)
                              }
                              className="w-4 h-4 rounded border-gray-300 text-primary-600"
                            />
                            <span className="text-sm text-gray-600">يمكن التفويض</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
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
                  <span className="text-sm text-gray-700">مسار نشط</span>
                </label>
              </div>

              <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  إلغاء
                </button>
                <button
                  disabled
                  title={READONLY_TITLE}
                  className="btn-primary opacity-50 cursor-not-allowed"
                >
                  {editingChain ? 'حفظ التغييرات' : 'إضافة المسار'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
