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
  X,
  Layers,
} from 'lucide-react'
import {
  ApiBranch,
  ApiEmployee,
  ApiRequestType,
  fetchApprovalChains,
  fetchBranches,
  fetchEmployees,
  fetchRequestTypes,
  updateApprovalChain,
} from '@/lib/api'
import { ChainEditorModal, type ChainEditorTarget } from '@/components/approvals/ChainEditorModal'
import {
  branchesWithoutVersionOf,
  branchVersionsOfChain,
  generalChainOf,
  roleDescriptions,
  roleLabels,
  thresholdFieldLabels,
  type ApiChain,
  type ApiChainStep,
} from '@/components/approvals/chainEditorModel'
import { categoryChainLabelsOf, fetchRequestCategoryMap, type ApiRequestCategoryMap } from '@/lib/request-category-chains'

// «الاعتمادات والموافقات» = مكتبة كل سلاسل الاعتماد. ربط الطلبات بالسلاسل (سلسلة لكل فئة، وسلسلة خاصة لطلب بعينه)
// بقى جوّه «بانِي الطلبات» (طلب المالك 26 سبتمبر) — والمحرر نفسه مشترك بين الشاشتين (ChainEditorModal).
export default function ApprovalsPage() {
  const [chains, setChains] = useState<ApiChain[]>([])
  const [branches, setBranches] = useState<ApiBranch[]>([])
  const [employees, setEmployees] = useState<ApiEmployee[]>([])
  const [requestTypes, setRequestTypes] = useState<ApiRequestType[]>([])
  // سلسلة كل فئة (من «بانِي الطلبات») — لشارة «سلسلة فئة» وجدول الفروع؛ فشلها مايوقعش المكتبة
  const [categoryMap, setCategoryMap] = useState<ApiRequestCategoryMap | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterBranch, setFilterBranch] = useState('')
  const [editorTarget, setEditorTarget] = useState<ChainEditorTarget | null>(null)
  const [activeMenu, setActiveMenu] = useState<number | null>(null)
  const [expandedChain, setExpandedChain] = useState<number | null>(null)

  const reloadChains = async () => {
    const [ch, map] = await Promise.allSettled([fetchApprovalChains(), fetchRequestCategoryMap()])
    if (ch.status === 'fulfilled') setChains(ch.value as ApiChain[])
    if (map.status === 'fulfilled') setCategoryMap(map.value)
  }

  useEffect(() => {
    const load = async () => {
      try {
        const [ch, brs, emps, types] = await Promise.all([
          fetchApprovalChains(),
          fetchBranches(),
          fetchEmployees(),
          fetchRequestTypes(),
        ])
        setChains(ch as ApiChain[])
        setBranches(brs)
        setEmployees(emps)
        setRequestTypes(types)
        setError(null)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
      fetchRequestCategoryMap().then(setCategoryMap).catch(() => setCategoryMap(null))
    }
    load()
  }, [])

  const branchLabelOf = (branchId: number | null) =>
    branchId === null
      ? 'كل الفروع'
      : branches.find((b) => b.id === branchId)?.name ?? `فرع #${branchId}`

  const employeeNameOf = (employeeId: number | null | undefined) =>
    employeeId == null
      ? ''
      : employees.find((e) => e.id === employeeId)?.fullName ?? `موظف #${employeeId}`

  // تسمية الخطوة — خطوة «موظف بعينه» تعرض اسم الموظف المحدد
  const stepRoleLabel = (step: ApiChainStep) =>
    step.approverRole === 'specific_employee' && step.specificEmployeeId != null
      ? `موظف بعينه: ${employeeNameOf(step.specificEmployeeId)}`
      : roleLabels[step.approverRole] ?? step.approverRole

  // اسم/فئة النوع المربوط — نفضّل ما يرسله الباك (مستقل عن فلترة الجمهور)
  // ونرجع للكتالوج المحلي كخطة بديلة
  // النسخة الخاصة بفرع = نفس كود سلسلة عامة، ونوع طلبها هو نوع العامة
  const generalOf = (chain: ApiChain): ApiChain | null => generalChainOf(chain, chains)
  const branchVersionsOf = (chain: ApiChain): ApiChain[] => branchVersionsOfChain(chain, chains)
  const chainTypeName = (chain: ApiChain): string | null =>
    chain.requestTypeName ??
    (chain.requestTypeCode
      ? requestTypes.find((t) => t.code === chain.requestTypeCode)?.nameAr ??
        chain.requestTypeCode
      : generalOf(chain) ? chainTypeName(generalOf(chain)!) : null)
  const chainTypeCategory = (chain: ApiChain): string =>
    chain.requestTypeCategory ??
    (chain.requestTypeCode
      ? requestTypes.find((t) => t.code === chain.requestTypeCode)?.category ??
        ''
      : '')
  // الفئات اللي السلسلة دي سلسلتها (نسخة الفرع بتاخد فئات العامة)
  const categoriesOf = (chain: ApiChain): string[] =>
    categoryChainLabelsOf(categoryMap, generalOf(chain)?.id ?? chain.id)

  const filteredChains = chains
    .filter((chain) => {
      const boundTypeName = chainTypeName(chain) ?? ''
      const q = searchQuery.trim().toLowerCase()
      const matchesSearch =
        !q ||
        chain.nameAr.includes(searchQuery) ||
        chain.code.toLowerCase().includes(q) ||
        boundTypeName.toLowerCase().includes(q)
      const matchesBranch =
        !filterBranch ||
        (filterBranch === 'all'
          ? chain.branchId === null
          : chain.branchId === Number(filterBranch))
      return matchesSearch && matchesBranch
    })
    // ترتيب افتراضي: الفئة ثم الاسم — تتجمّع سلاسل الأنواع المتقاربة معاً
    .sort((a, b) => {
      const catA = chainTypeCategory(a)
      const catB = chainTypeCategory(b)
      if (catA !== catB) return catA.localeCompare(catB, 'ar')
      return a.nameAr.localeCompare(b.nameAr, 'ar')
    })

  const handleOpenModal = (chain?: ApiChain) => {
    setEditorTarget(chain ? { kind: 'edit', chainId: chain.id } : { kind: 'create' })
  }

  // «نسخة خاصة بفرع» (طلب المالك 24 سبتمبر): نفس نوع الطلب بسلسلة مختلفة في كل فرع — المحرر بيفتح بنفس الكود مقفول
  // والخطوات منسوخة، والفروع اللي لسه مالهاش نسخة بس
  const handleOpenBranchCopy = (chain: ApiChain) => {
    setActiveMenu(null)
    if (!branchesWithoutVersionOf(chain, chains, branches).length) {
      setNotice(`كل الفروع ليها نسخة خاصة من «${chain.nameAr}» — عدّل نسخة الفرع من القائمة`)
      return
    }
    setEditorTarget({ kind: 'branchCopy', chainId: chain.id })
  }

  const toggleChainActive = async (chain: ApiChain) => {
    setActiveMenu(null)
    // التعطيل بيوقف التقديم الجديد على الدورة (SET-3) — تأكيد للدورة الأساسية لنوع أو لفئة
    const cats = chain.branchId === null ? categoriesOf(chain) : []
    const typeName = cats.length ? null : chainTypeName(chain)
    const typeLabel = cats.length ? `فئة «${cats.join('» و«')}»` : typeName ? `«${typeName}»` : 'الأنواع المربوطة بها'
    const primary = !!chain.isPrimary || cats.length > 0
    if (
      chain.isActive &&
      primary &&
      !window.confirm(
        `تعطيل «${chain.nameAr}» يوقف تقديم طلبات ${typeLabel} الجديدة في كل فرع ليس له نسخة مفعّلة من الدورة، والطلبات الجارية تكمل مسارها. متابعة؟`
      )
    ) {
      return
    }
    try {
      await updateApprovalChain(chain.id, { isActive: !chain.isActive })
      setNotice(
        !chain.isActive
          ? `تم تفعيل دورة «${chain.nameAr}»`
          : chain.branchId !== null
            ? `تم تعطيل دورة «${chain.nameAr}» — طلبات الفرع الجديدة ترجع للدورة العامة`
            : primary
              ? `تم تعطيل دورة «${chain.nameAr}» — تقديم طلبات ${typeLabel} الجديدة موقوف لحد ما تتفعّل (الجارية تكمل مسارها)`
              : `تم تعطيل دورة «${chain.nameAr}»`
      )
      await reloadChains()
      setError(null)
    } catch (err: any) {
      setError(err.message)
    }
  }

  // تبديل «التنفيذ الفوري بلا اعتمادات» — للسلاسل الفاضية فقط
  const toggleAutoApprove = async (chain: ApiChain) => {
    setActiveMenu(null)
    // حارس محلي: لا يُسمح بالتفعيل والسلسلة بها خطوات
    if (!chain.autoApprove && chain.steps.length > 0) {
      setError('احذف خطوات السلسلة أولاً قبل تفعيل التنفيذ الفوري')
      return
    }
    try {
      await updateApprovalChain(chain.id, { autoApprove: !chain.autoApprove })
      setNotice(
        chain.autoApprove
          ? `تم إيقاف التنفيذ الفوري لدورة «${chain.nameAr}» — الطلب يتطلب معتمدين`
          : `تم تفعيل التنفيذ الفوري لدورة «${chain.nameAr}» — الطلب يُنفَّذ فور تقديمه`
      )
      await reloadChains()
      setError(null)
    } catch (err: any) {
      setError(err.message)
    }
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
            <p className="text-gray-500 mt-1">مكتبة كل سلاسل الاعتماد — سلاسل الفئات والطلبات والفروع</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            إنشاء دورة اعتماد
          </button>
        </div>

        {/* الربط بقى جوّه الطلبات نفسها (طلب المالك 26 سبتمبر) */}
        <div className="bg-blue-50 text-blue-900 rounded-xl p-4 flex items-start gap-3" data-request-builder-note>
          <Layers size={18} className="shrink-0 mt-0.5" />
          <p className="text-sm">
            مين بيمشي على أنهي سلسلة بقى من{' '}
            <Link href="/settings/request-types" className="font-medium underline hover:text-blue-700">
              «بانِي الطلبات»
            </Link>
            : كل فئة ليها سلسلة عامة (والإجازات والحضور ممكن يبقوا على نفس السلسلة)، وتقدر تخصّص سلسلة لطلب بعينه ولكل فرع.
            الشاشة دي مكتبة كل السلاسل: تعدّل أي سلسلة، أو تفعّلها وتعطّلها، أو تعمل سلسلة يدوية لحالة خاصة.
          </p>
        </div>

        {/* Error Banner */}
        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {/* Success Banner */}
        {notice && (
          <div className="bg-success-50 text-success-700 rounded-xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} />
              <span>{notice}</span>
            </div>
            <button
              onClick={() => setNotice(null)}
              className="p-1 hover:bg-success-100 rounded-lg"
            >
              <X size={16} />
            </button>
          </div>
        )}

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
                <p className="text-xs text-gray-400 mt-0.5">
                  أضف المعتمدين والترتيب لكل سلسلة — والسلسلة الفاضية توقف الطلب حتى تضبطها
                </p>
              </div>
            </div>

            {/* Chains */}
            <div className="grid grid-cols-1 gap-4 mr-13">
              {filteredChains.map((chain) => {
                const thresholdSteps = chain.steps.filter((s) => s.thresholdField)
                const chainCategories = chain.branchId === null ? categoriesOf(chain) : []
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
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-gray-800">{chain.nameAr}</h4>
                            <span
                              className={`badge text-xs ${
                                chain.isActive ? 'badge-success' : 'badge-danger'
                              }`}
                            >
                              {chain.isActive ? 'نشط' : 'معطل'}
                            </span>
                            {/* سلسلة فئة — كل طلبات الفئة الماشية عليها */}
                            {chainCategories.length > 0 && (
                              <span className="badge text-xs bg-emerald-50 text-emerald-700">
                                سلسلة فئة: {chainCategories.join('، ')}
                              </span>
                            )}
                            {/* شارة نوع الطلب المرتبط — يوضّح أي طلب تعتمده هذه السلسلة */}
                            {chain.requestTypeCode ? (
                              <span className="badge text-xs bg-blue-50 text-blue-700">
                                الطلب: {chainTypeName(chain)}
                              </span>
                            ) : chainCategories.length === 0 && !generalOf(chain) ? (
                              <span className="badge text-xs bg-gray-100 text-gray-600">
                                سلسلة مخصّصة
                              </span>
                            ) : null}
                            <span className="badge text-xs bg-indigo-100 text-indigo-700">
                              {branchLabelOf(chain.branchId)}
                            </span>
                            {branchVersionsOf(chain).length > 0 && (
                              <span className="badge text-xs bg-amber-50 text-amber-700">
                                نسخ خاصة: {branchVersionsOf(chain).map((v) => branchLabelOf(v.branchId)).join('، ')}
                              </span>
                            )}
                            {generalOf(chain) && (
                              <span className="badge text-xs bg-amber-50 text-amber-700">
                                نسخة خاصة من «{generalOf(chain)!.nameAr}»
                              </span>
                            )}
                          </div>

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
                            <div className="absolute left-0 top-full mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20">
                              <button
                                onClick={() => {
                                  handleOpenModal(chain)
                                  setActiveMenu(null)
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 text-sm"
                              >
                                <Edit size={16} />
                                تعديل
                              </button>
                              {chain.branchId === null && (
                                <button
                                  onClick={() => handleOpenBranchCopy(chain)}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 text-sm"
                                >
                                  <Copy size={16} />
                                  نسخة خاصة بفرع
                                </button>
                              )}
                              <button
                                onClick={() => toggleChainActive(chain)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 text-sm"
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
                              {/* تنفيذ فوري بلا اعتمادات — للسلاسل الفاضية فقط */}
                              <button
                                onClick={() => toggleAutoApprove(chain)}
                                disabled={chain.steps.length > 0}
                                title={
                                  chain.steps.length > 0
                                    ? 'احذف الخطوات أولاً'
                                    : chain.autoApprove
                                      ? 'إيقاف التنفيذ الفوري'
                                      : 'تفعيل التنفيذ الفوري بلا اعتمادات'
                                }
                                className={`w-full flex flex-col items-start gap-0.5 px-4 py-2 text-sm ${
                                  chain.steps.length > 0
                                    ? 'text-gray-700 opacity-50 cursor-not-allowed'
                                    : 'text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  {chain.autoApprove ? (
                                    <Zap size={16} className="text-success-500" />
                                  ) : (
                                    <Zap size={16} className="text-gray-400" />
                                  )}
                                  {chain.autoApprove
                                    ? 'إيقاف التنفيذ الفوري'
                                    : 'تنفيذ فوري بلا اعتمادات'}
                                </span>
                                <span className="text-[10px] text-gray-400 pr-6">
                                  (للسلاسل الفاضية فقط)
                                </span>
                              </button>
                              <div className="border-t border-gray-100 my-1" />
                              <button
                                disabled
                                title="الحذف غير متاح — استخدم التعطيل بدلاً منه"
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
                      {/* حالة السلسلة الفاضية — نداء واضح حسب وضع التنفيذ الفوري */}
                      {chain.steps.length === 0 ? (
                        chain.autoApprove ? (
                          <div className="flex items-start gap-2 p-3 bg-success-50 rounded-xl">
                            <Zap size={16} className="text-success-600 shrink-0 mt-0.5" />
                            <p className="text-sm text-success-700">
                              تنفيذ فوري — بلا اعتمادات (الطلب يُنفَّذ فور تقديمه)
                            </p>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-3 p-3 bg-warning-50 rounded-xl">
                            <div className="flex items-start gap-2">
                              <AlertCircle
                                size={16}
                                className="text-warning-600 shrink-0 mt-0.5"
                              />
                              <p className="text-sm text-warning-700">
                                لم تُضبط بعد — لن يُقبل أي طلب من هذا النوع حتى تضيف
                                المعتمدين
                              </p>
                            </div>
                            <button
                              onClick={() => handleOpenModal(chain)}
                              className="btn-primary shrink-0 flex items-center gap-1 text-sm px-3 py-1.5"
                            >
                              <Plus size={15} />
                              إضافة خطوات
                            </button>
                          </div>
                        )
                      ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">مستويات الاعتماد:</span>
                        <div className="flex items-center gap-2 flex-wrap">
                          {chain.steps.map((step, index) => (
                            <div key={step.id} className="flex items-center gap-2">
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                                <span className="w-5 h-5 bg-primary-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                  {step.stepOrder}
                                </span>
                                <span className="text-sm text-gray-700">
                                  {stepRoleLabel(step)}
                                </span>
                                {step.isParallel && (
                                  <span className="badge text-[10px] bg-indigo-100 text-indigo-700">
                                    متوازية
                                  </span>
                                )}
                              </div>
                              {index < chain.steps.length - 1 &&
                                (chain.steps[index + 1].isParallel ? (
                                  <span
                                    className="text-indigo-500 font-bold text-sm"
                                    dir="ltr"
                                    title="خطوات متوازية — نفس مستوى الاعتماد"
                                  >
                                    ∥
                                  </span>
                                ) : (
                                  <ChevronLeft size={16} className="text-gray-400" />
                                ))}
                            </div>
                          ))}
                        </div>
                      </div>
                      )}
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
                                  {stepRoleLabel(step)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {step.approverRole === 'specific_employee'
                                    ? employeeNameOf(step.specificEmployeeId)
                                    : roleDescriptions[step.approverRole] ?? ''}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              {step.isParallel && (
                                <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs">
                                  متوازية مع السابقة
                                </span>
                              )}
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
                              {/* لا شارة «يمكن التفويض»: التفويض غير مبني بعد و canDelegate بلا أثر (SET-17) */}
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

        {/* المحرر المشترك مع «بانِي الطلبات» — إنشاء / تعديل / نسخة خاصة بفرع + جدول «سلسلة مختلفة لكل فرع» */}
        <ChainEditorModal
          target={editorTarget}
          chains={chains}
          branches={branches}
          employees={employees}
          onNavigate={setEditorTarget}
          onClose={() => setEditorTarget(null)}
          onSaved={async (message) => {
            await reloadChains()
            setNotice(message)
            setError(null)
          }}
          typeNameOf={chainTypeName}
          categoriesOf={categoriesOf}
        />
      </div>
    </MainLayout>
  )
}
