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
  ChevronUp,
  AlertCircle,
  Zap,
  Copy,
  ToggleRight,
  ToggleLeft,
  X,
} from 'lucide-react'
import {
  ApiBranch,
  ApiEmployee,
  ChainStepInput,
  createApprovalChain,
  fetchApprovalChains,
  fetchBranches,
  fetchEmployees,
  replaceChainSteps,
  updateApprovalChain,
} from '@/lib/api'

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
  specificEmployeeId?: number | null
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
  department_manager_of_requester: 'مدير القسم',
  branch_manager_of_requester: 'مدير الفرع',
  receiving_team_manager: 'المدير المستقبِل',
  hr: 'الموارد البشرية',
  finance: 'المالية',
  custody_officer: 'أمين العهدة',
  it: 'تقنية المعلومات',
  executive: 'التنفيذي',
  specific_employee: 'موظف بعينه',
}

const roleDescriptions: Record<string, string> = {
  direct_manager_of_requester: 'مدير مقدم الطلب المباشر',
  department_manager_of_requester: 'مدير قسم مقدم الطلب',
  branch_manager_of_requester: 'مدير فرع مقدم الطلب',
  receiving_team_manager: 'مدير الفريق المستقبِل (النقل)',
  hr: 'إدارة الموارد البشرية',
  finance: 'الإدارة المالية',
  custody_officer: 'المسؤول عن العُهد',
  it: 'قسم تقنية المعلومات',
  executive: 'الإدارة التنفيذية',
  specific_employee: 'موظف محدد بالاسم يعتمد الخطوة',
}

// أدوار التصعيد — كل الأدوار عدا «موظف بعينه»
const escalationRoles = Object.entries(roleLabels).filter(
  ([id]) => id !== 'specific_employee'
)

const thresholdFieldLabels: Record<string, string> = {
  amount: 'المبلغ',
  increase_pct: 'نسبة الزيادة %',
}

const thresholdOps = ['>=', '>', '<', '<='] as const

// كود السلسلة — نفس قيد الباك إند
const CODE_RE = /^[A-Za-z0-9_-]{3,50}$/

// تحويل صوتي مبسّط عربي → لاتيني لاقتراح الكود من الاسم
const AR_TO_EN: Record<string, string> = {
  ا: 'A', أ: 'A', إ: 'E', آ: 'A', ء: '', ئ: 'Y', ؤ: 'W',
  ب: 'B', ت: 'T', ث: 'TH', ج: 'J', ح: 'H', خ: 'KH',
  د: 'D', ذ: 'TH', ر: 'R', ز: 'Z', س: 'S', ش: 'SH',
  ص: 'S', ض: 'D', ط: 'T', ظ: 'Z', ع: 'A', غ: 'GH',
  ف: 'F', ق: 'Q', ك: 'K', ل: 'L', م: 'M', ن: 'N',
  ه: 'H', ة: 'H', و: 'W', ي: 'Y', ى: 'A',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
}

const suggestCode = (nameAr: string): string =>
  nameAr
    .trim()
    .split('')
    .map((ch) => {
      if (/[A-Za-z0-9_-]/.test(ch)) return ch.toUpperCase()
      if (/\s/.test(ch)) return '_'
      return AR_TO_EN[ch] ?? ''
    })
    .join('')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50)

// نموذج الخطوة داخل البانِي — نصوص خام للحقول الاختيارية
type StepForm = {
  key: string
  approverRole: string
  specificEmployeeId: string
  slaDays: string
  escalateTo: string
  thresholdField: string
  thresholdOp: string
  thresholdValue: string
  isParallel: boolean
}

const emptyStep = (): StepForm => ({
  key: `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  approverRole: 'direct_manager_of_requester',
  specificEmployeeId: '',
  slaDays: '',
  escalateTo: '',
  thresholdField: '',
  thresholdOp: '',
  thresholdValue: '',
  isParallel: false,
})

export default function ApprovalsPage() {
  const [chains, setChains] = useState<ApiChain[]>([])
  const [branches, setBranches] = useState<ApiBranch[]>([])
  const [employees, setEmployees] = useState<ApiEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterBranch, setFilterBranch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editingChain, setEditingChain] = useState<ApiChain | null>(null)
  const [codeTouched, setCodeTouched] = useState(false)
  const [activeMenu, setActiveMenu] = useState<number | null>(null)
  const [expandedChain, setExpandedChain] = useState<number | null>(null)

  const [formData, setFormData] = useState<{
    name: string
    code: string
    branchId: string
    steps: StepForm[]
  }>({
    name: '',
    code: '',
    branchId: 'all',
    steps: [],
  })

  const reloadChains = async () => {
    const ch = await fetchApprovalChains()
    setChains(ch as ApiChain[])
  }

  useEffect(() => {
    const load = async () => {
      try {
        const [ch, brs, emps] = await Promise.all([
          fetchApprovalChains(),
          fetchBranches(),
          fetchEmployees(),
        ])
        setChains(ch as ApiChain[])
        setBranches(brs)
        setEmployees(emps)
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

  const employeeNameOf = (employeeId: number | null | undefined) =>
    employeeId == null
      ? ''
      : employees.find((e) => e.id === employeeId)?.fullName ?? `موظف #${employeeId}`

  // تسمية الخطوة — خطوة «موظف بعينه» تعرض اسم الموظف المحدد
  const stepRoleLabel = (step: ApiChainStep) =>
    step.approverRole === 'specific_employee' && step.specificEmployeeId != null
      ? `موظف بعينه: ${employeeNameOf(step.specificEmployeeId)}`
      : roleLabels[step.approverRole] ?? step.approverRole

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
        steps: chain.steps.map((s) => ({
          key: `db-${s.id}`,
          approverRole: s.approverRole,
          specificEmployeeId:
            s.specificEmployeeId != null ? String(s.specificEmployeeId) : '',
          slaDays: s.slaDays != null ? String(s.slaDays) : '',
          escalateTo: s.escalateTo ?? '',
          thresholdField: s.thresholdField ?? '',
          thresholdOp: s.thresholdOp ?? '',
          thresholdValue: s.thresholdValue != null ? String(s.thresholdValue) : '',
          isParallel: !!s.isParallel,
        })),
      })
    } else {
      setEditingChain(null)
      setFormData({
        name: '',
        code: '',
        branchId: 'all',
        steps: [emptyStep()],
      })
    }
    setCodeTouched(false)
    setModalError(null)
    setShowModal(true)
  }

  // اسم الدورة يقترح الكود تلقائياً ما دام المستخدم لم يلمس حقل الكود
  const handleNameChange = (value: string) => {
    if (!editingChain && !codeTouched) {
      setFormData({ ...formData, name: value, code: suggestCode(value) })
    } else {
      setFormData({ ...formData, name: value })
    }
  }

  const addStep = () => {
    setFormData({ ...formData, steps: [...formData.steps, emptyStep()] })
  }

  const removeStep = (index: number) => {
    setFormData({
      ...formData,
      steps: formData.steps.filter((_, i) => i !== index),
    })
  }

  const moveStep = (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= formData.steps.length) return
    const steps = [...formData.steps]
    ;[steps[index], steps[target]] = [steps[target], steps[index]]
    setFormData({ ...formData, steps })
  }

  const updateStep = (
    index: number,
    field: keyof StepForm,
    value: string | boolean
  ) => {
    const steps = formData.steps.map((s, i) =>
      i === index ? { ...s, [field]: value } : s
    )
    setFormData({ ...formData, steps })
  }

  // تحقق محلي يطابق قواعد الباك إند قبل الإرسال
  const validateForm = (): string | null => {
    if (formData.name.trim().length < 3) {
      return 'اسم الدورة مطلوب (3 أحرف على الأقل)'
    }
    if (!editingChain && !CODE_RE.test(formData.code.trim())) {
      return 'كود الدورة: أحرف إنجليزية وأرقام و _ أو - فقط (من 3 إلى 50 خانة)'
    }
    for (const s of formData.steps) {
      if (s.approverRole === 'specific_employee' && s.specificEmployeeId === '') {
        // نفس رسالة الباك إند حرفياً
        return 'خطوة «موظف بعينه» تحتاج تحديد الموظف'
      }
      const parts = [
        s.thresholdField.trim() !== '',
        s.thresholdOp !== '',
        s.thresholdValue.trim() !== '',
      ].filter(Boolean).length
      if (parts !== 0 && parts !== 3) {
        // نفس رسالة الباك إند حرفياً
        return 'الخطوة الشرطية تحتاج: حقل + معامل + قيمة عتبة'
      }
      if (s.slaDays !== '') {
        const n = Number(s.slaDays)
        if (!Number.isInteger(n) || n < 1) return 'مهلة الرد: عدد أيام صحيح (1 فأكثر)'
      }
      if (s.thresholdValue.trim() !== '' && Number.isNaN(Number(s.thresholdValue))) {
        return 'قيمة العتبة يجب أن تكون رقماً'
      }
    }
    return null
  }

  const buildSteps = (): ChainStepInput[] =>
    formData.steps.map(
      (s, i) =>
        ({
          approverRole: s.approverRole,
          // «موازية مع السابقة» — مدعومة في الباك وإن لم تكن مُعرَّفة في ChainStepInput
          isParallel: i > 0 && s.isParallel,
          // «موظف بعينه» — المفتاح مقبول في الباك وإن لم يكن مُعرَّفاً في ChainStepInput
          ...(s.approverRole === 'specific_employee' && s.specificEmployeeId !== ''
            ? { specificEmployeeId: Number(s.specificEmployeeId) }
            : {}),
          ...(s.slaDays !== '' ? { slaDays: Number(s.slaDays) } : {}),
          ...(s.escalateTo ? { escalateTo: s.escalateTo } : {}),
          ...(s.thresholdField.trim()
            ? {
                thresholdField: s.thresholdField.trim(),
                thresholdOp: s.thresholdOp as ChainStepInput['thresholdOp'],
                thresholdValue: Number(s.thresholdValue),
              }
            : {}),
        }) as any
    )

  const handleSave = async () => {
    const problem = validateForm()
    if (problem) {
      setModalError(problem)
      return
    }
    setSaving(true)
    setModalError(null)
    try {
      const name = formData.name.trim()
      if (editingChain) {
        await updateApprovalChain(editingChain.id, { nameAr: name })
        await replaceChainSteps(editingChain.id, buildSteps())
        setNotice(`تم تحديث دورة «${name}» — الخطوات الجديدة تسري على الطلبات القادمة`)
      } else {
        await createApprovalChain({
          code: formData.code.trim(),
          nameAr: name,
          branchId:
            formData.branchId === 'all' ? undefined : Number(formData.branchId),
          steps: buildSteps(),
        })
        setNotice(`تم إنشاء دورة الاعتماد «${name}» بنجاح`)
      }
      await reloadChains()
      setShowModal(false)
      setError(null)
    } catch (err: any) {
      // رسالة الباك إند العربية كما هي
      setModalError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleChainActive = async (chain: ApiChain) => {
    setActiveMenu(null)
    try {
      await updateApprovalChain(chain.id, { isActive: !chain.isActive })
      setNotice(
        chain.isActive
          ? `تم تعطيل دورة «${chain.nameAr}»`
          : `تم تفعيل دورة «${chain.nameAr}»`
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
            <p className="text-gray-500 mt-1">سلاسل الاعتماد الفعلية المطبقة على الطلبات</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            إنشاء دورة اعتماد
          </button>
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
                                تعديل
                              </button>
                              <button
                                disabled
                                title="النسخ في مرحلة لاحقة"
                                className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 opacity-50 cursor-not-allowed text-sm"
                              >
                                <Copy size={16} />
                                نسخ
                              </button>
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
                                  {stepRoleLabel(step)}
                                </span>
                                {step.isParallel && (
                                  <span className="badge text-[10px] bg-indigo-100 text-indigo-700">
                                    متوازية
                                  </span>
                                )}
                                {step.canDelegate && (
                                  <Zap size={12} className="text-warning-500" />
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

        {/* Builder Modal — إنشاء / تعديل دورة اعتماد */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingChain ? 'تعديل دورة الاعتماد' : 'إنشاء دورة اعتماد جديدة'}
                </h2>
                {editingChain && (
                  <p className="text-sm text-warning-600 mt-2 flex items-center gap-1.5">
                    <AlertCircle size={15} className="shrink-0" />
                    تعديل الخطوات يسري على الطلبات الجديدة فقط — الطلبات الجارية تكمل
                    بخطواتها المحلولة
                  </p>
                )}
              </div>

              <div className="p-6 space-y-6">
                {/* Modal Error — رسائل الباك إند العربية كما هي */}
                {modalError && (
                  <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm flex items-start gap-2">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      اسم الدورة *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="input w-full"
                      placeholder="مثال: اعتماد الإجازات"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      كود الدورة *
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => {
                        setCodeTouched(true)
                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                      }}
                      className="input w-full font-mono"
                      placeholder="CHAIN_X"
                      dir="ltr"
                      disabled={!!editingChain}
                      title={editingChain ? 'الكود لا يتغير بعد الإنشاء' : undefined}
                    />
                    {!editingChain && (
                      <p className="text-xs text-gray-400 mt-1">
                        يُقترح تلقائياً من الاسم — أحرف إنجليزية وأرقام و _ أو - (من 3 إلى 50)
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    نطاق الفرع
                  </label>
                  <select
                    value={formData.branchId}
                    onChange={(e) =>
                      setFormData({ ...formData, branchId: e.target.value })
                    }
                    className="input w-full"
                    disabled={!!editingChain}
                    title={editingChain ? 'نطاق الفرع لا يتغير بعد الإنشاء' : undefined}
                  >
                    <option value="all">كل الفروع (دورة عامة)</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} فقط
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    نسخة بفرع محدد تتقدم على العامة عند التنفيذ — طلبات موظفي الفرع تتبع
                    دورته الخاصة أولاً
                  </p>
                </div>

                {/* Approval Steps */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-medium text-gray-700">
                      خطوات الاعتماد
                    </label>
                    <button
                      onClick={addStep}
                      className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                    >
                      <Plus size={16} />
                      إضافة خطوة
                    </button>
                  </div>

                  {formData.steps.length === 0 && (
                    <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-500 flex items-center gap-2">
                      <Zap size={16} className="text-warning-500" />
                      بلا خطوات — الطلب يُنفَّذ أوتوماتيكياً فور التقديم
                    </div>
                  )}

                  <div className="space-y-3">
                    {formData.steps.map((step, index) => (
                      <div
                        key={step.key}
                        className="p-4 bg-gray-50 rounded-xl space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                              {index + 1}
                            </span>
                            <span className="text-sm font-medium text-gray-700">
                              الخطوة {index + 1}
                            </span>
                            <label
                              className={`flex items-center gap-1.5 mr-3 ${
                                index === 0 ? 'opacity-40 cursor-not-allowed' : ''
                              }`}
                              title={
                                index === 0
                                  ? 'الخطوة الأولى لا يمكن أن تكون موازية'
                                  : 'تُعتمد بالتوازي مع الخطوة السابقة (نفس الترتيب)'
                              }
                            >
                              <input
                                type="checkbox"
                                checked={index > 0 && step.isParallel}
                                disabled={index === 0}
                                onChange={(e) =>
                                  updateStep(index, 'isParallel', e.target.checked)
                                }
                                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 disabled:cursor-not-allowed"
                              />
                              <span className="text-xs text-gray-600">
                                موازية مع السابقة
                              </span>
                            </label>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => moveStep(index, -1)}
                              disabled={index === 0}
                              title="نقل لأعلى"
                              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <ChevronUp size={16} />
                            </button>
                            <button
                              onClick={() => moveStep(index, 1)}
                              disabled={index === formData.steps.length - 1}
                              title="نقل لأسفل"
                              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <ChevronDown size={16} />
                            </button>
                            <button
                              onClick={() => removeStep(index)}
                              title="حذف الخطوة"
                              className="p-1.5 rounded-lg text-danger-500 hover:bg-danger-50"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
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
                              مهلة الرد (أيام — اختياري)
                            </label>
                            <input
                              type="number"
                              value={step.slaDays}
                              onChange={(e) =>
                                updateStep(index, 'slaDays', e.target.value)
                              }
                              className="input w-full text-sm"
                              min={1}
                              placeholder="بلا مهلة"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">
                              التصعيد إلى (اختياري)
                            </label>
                            <select
                              value={step.escalateTo}
                              onChange={(e) =>
                                updateStep(index, 'escalateTo', e.target.value)
                              }
                              className="input w-full text-sm"
                            >
                              <option value="">بدون تصعيد</option>
                              {escalationRoles.map(([id, name]) => (
                                <option key={id} value={id}>
                                  {name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* اختيار الموظف — لخطوة «موظف بعينه» فقط */}
                        {step.approverRole === 'specific_employee' && (
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">
                              الموظف المعتمد *
                            </label>
                            <select
                              value={step.specificEmployeeId}
                              onChange={(e) =>
                                updateStep(index, 'specificEmployeeId', e.target.value)
                              }
                              className="input w-full text-sm"
                            >
                              <option value="">— اختر الموظف —</option>
                              {employees.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                  {emp.fullName}
                                </option>
                              ))}
                            </select>
                            <p className="text-xs text-gray-400 mt-1">
                              هذا الموظف بعينه هو من يعتمد الخطوة أياً كان مقدم الطلب
                            </p>
                          </div>
                        )}

                        {/* شرط العتبة — الثلاثة معاً أو لا شيء */}
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">
                            شرط العتبة (اختياري — الحقل والمعامل والقيمة معاً أو لا شيء)
                          </label>
                          <div className="grid grid-cols-3 gap-3">
                            <input
                              type="text"
                              value={step.thresholdField}
                              onChange={(e) =>
                                updateStep(index, 'thresholdField', e.target.value)
                              }
                              className="input w-full text-sm font-mono"
                              placeholder="amount"
                              dir="ltr"
                            />
                            <select
                              value={step.thresholdOp}
                              onChange={(e) =>
                                updateStep(index, 'thresholdOp', e.target.value)
                              }
                              className="input w-full text-sm font-mono"
                              dir="ltr"
                            >
                              <option value="">—</option>
                              {thresholdOps.map((op) => (
                                <option key={op} value={op}>
                                  {op}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              value={step.thresholdValue}
                              onChange={(e) =>
                                updateStep(index, 'thresholdValue', e.target.value)
                              }
                              className="input w-full text-sm"
                              placeholder="القيمة"
                              dir="ltr"
                            />
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            مثال: amount &gt;= 1000 — الخطوة تُطبَّق فقط إذا تحقق الشرط على
                            بيانات الطلب
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                  disabled={saving}
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary disabled:opacity-50"
                >
                  {saving
                    ? 'جارٍ الحفظ...'
                    : editingChain
                      ? 'حفظ التغييرات'
                      : 'إنشاء الدورة'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
