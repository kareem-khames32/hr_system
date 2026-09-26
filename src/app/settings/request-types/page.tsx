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
  CheckCircle2,
  XCircle,
  GitBranch,
  Shield,
  Lock,
  Wallet,
  FileOutput,
  ClipboardList,
  Trash2,
  Users,
  Paperclip,
  X,
} from 'lucide-react'
import {
  ApiDepartment,
  ApiEmployee,
  ApiRequestType,
  ApiTeam,
  CustomFieldDef,
  createRequestType,
  fetchAdminRequestTypes,
  fetchApprovalChains,
  fetchDepartments,
  fetchDestinationHandlers,
  fetchEmployees,
  fetchTeams,
  updateRequestType,
  updateRequestTypeFull,
} from '@/lib/api'
import { categoryLabels } from '@/data/requestsCatalog'
import { DefinitionBranchBadge, DefinitionBranchField, useDefinitionBranches } from '@/components/DefinitionBranchField'
import { payloadFieldLabel } from '@/lib/request-payload'

const FIXED_HANDLER_LABELS: Record<string, string> = {
  custody_assignments: 'العهد (طلب ونقل وإرجاع)',
  leave_calendar_balance: 'إجازة من الرصيد حسب نوعها',
}

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

const parseJson = <T,>(raw: string | null | undefined, fallback: T): T => {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const parseRequiredFields = (raw?: string): string[] => {
  const parsed = parseJson<unknown>(raw, [])
  return Array.isArray(parsed) ? parsed.map(String) : []
}

// أنواع الحقول المخصّصة — مرآة الباك إند (FIELD_TYPES). «month» حقل يولده النظام لطلب زيادة الراتب ولا يُنشأ من البانِي.
const fieldTypeLabels: Record<Exclude<CustomFieldDef['type'], 'month'>, string> = {
  text: 'نص',
  number: 'رقم',
  date: 'تاريخ',
  select: 'قائمة',
  file: 'مرفق',
}

// أدوار الجمهور المتاحة
const audienceRoles: Array<[string, string]> = [
  ['super_admin', 'مدير النظام'],
  ['hr_manager', 'مدير الموارد البشرية'],
  ['branch_manager', 'مدير الفرع'],
  ['employee', 'موظف'],
]

// «مين» يقدر يقدّم الطلب. 'departments' وضع قديم: بيتحول عند الفتح لـ «الكل» + «فين: أقسام محددة»
type AudienceMode = 'all' | 'departments' | 'roles' | 'employees' | 'positions'
// «فين» (قرار المالك 16 سبتمبر): كل الشركة / فروع محددة / أقسام محددة / فرق محددة
type WhereMode = 'company' | 'branches' | 'departments' | 'teams'

// «حسب المنصب»: المنصب يُعرف من الهيكل (مدير القسم/قائد الفريق/مدير الفرع)، ومعه أدوار مختارة
const audiencePositions: Array<[string, string]> = [
  ['DEPARTMENT_MANAGERS', 'مديرو الأقسام'],
  ['TEAM_LEADERS', 'قادة الفرق'],
  ['BRANCH_MANAGERS', 'مديرو الفروع'],
  ['hr_manager', 'الموارد البشرية'],
  ['executive', 'الإدارة العليا'],
]

// صف حقل مخصّص داخل البانِي
type FieldRow = {
  rid: string
  key: string
  label: string
  type: CustomFieldDef['type']
  required: boolean
  optionsRaw: string
}

const emptyFieldRow = (): FieldRow => ({
  rid: `f-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  key: '',
  label: '',
  type: 'text',
  required: false,
  optionsRaw: '',
})

const parseOptions = (raw: string): string[] =>
  raw
    .split(/[،,]/)
    .map((s) => s.trim())
    .filter(Boolean)

type BuilderForm = {
  nameAr: string
  category: string
  code: string
  destinationHandler: string
  approvalChainId: string
  requiredAttachments: string
  fields: FieldRow[]
  audienceMode: AudienceMode
  // أقسام «فين» (وأقسام الوضع القديم)
  deptIds: number[]
  roleIds: string[]
  empIds: number[]
  posIds: string[]
  whereMode: WhereMode
  branchIds: number[]
  // فرق «فين»
  teamIds: number[]
  // فرع النوع نفسه: null = كل الشركة
  branchId: number | null
}

const emptyForm = (): BuilderForm => ({
  nameAr: '',
  category: 'leaves',
  code: '',
  destinationHandler: 'none',
  approvalChainId: '',
  requiredAttachments: '',
  fields: [],
  audienceMode: 'all',
  deptIds: [],
  roleIds: [],
  empIds: [],
  posIds: [],
  whereMode: 'company',
  branchIds: [],
  teamIds: [],
  branchId: null,
})

type StoredAudience = { mode?: string; ids?: Array<number | string>; where?: { mode?: string; ids?: Array<number | string> } | null }

// «فلان وفلان» أو «فلان، فلان و3 غيرهم»
const namesText = (names: string[]): string =>
  names.length <= 2 ? names.join(' و') : `${names.slice(0, 2).join('، ')} و${names.length - 2} غيرهم`

// جملة «يظهر لـ…»: مين + فين، مثل «مديرو الأقسام في الفرع الرئيسي»
const audienceText = (
  audience: StoredAudience | null,
  typeBranch: string | null,
  lookup: { branch: (id: number) => string; department: (id: number) => string; team: (id: number) => string }
): string => {
  const ids = Array.isArray(audience?.ids) ? audience!.ids : []
  const label = (list: Array<[string, string]>) => (id: number | string) => list.find(([key]) => key === String(id))?.[1] ?? String(id)
  let who = 'الكل'
  if (audience?.mode === 'positions' && ids.length) who = namesText(ids.map(label(audiencePositions)))
  if (audience?.mode === 'roles' && ids.length) who = namesText(ids.map(label(audienceRoles)))
  if (audience?.mode === 'employees' && ids.length) who = ids.length === 1 ? 'موظف واحد بعينه' : `${ids.length} موظفين بعينهم`
  const whereIds = (Array.isArray(audience?.where?.ids) ? audience!.where!.ids : []).map(Number)
  let where = typeBranch ? `في ${typeBranch}` : 'في كل الشركة'
  if (audience?.mode === 'departments' && ids.length) where = `في ${namesText(ids.map(Number).map(lookup.department))}`
  else if (audience?.where?.mode === 'branches' && whereIds.length) where = `في ${namesText(whereIds.map(lookup.branch))}`
  else if (audience?.where?.mode === 'departments' && whereIds.length) where = `في ${namesText(whereIds.map(lookup.department))}`
  else if (audience?.where?.mode === 'teams' && whereIds.length) where = `في ${namesText(whereIds.map(lookup.team))}`
  return `${who} ${where}`
}

// الجمهور كما يُحفظ من النموذج: بدون «فين» = نفس الشكل القديم {mode, ids}
const audienceOfForm = (form: BuilderForm, ids: Array<number | string>): StoredAudience =>
  form.whereMode === 'company'
    ? { mode: form.audienceMode, ids }
    : {
        mode: form.audienceMode,
        ids,
        where: {
          mode: form.whereMode,
          ids: form.whereMode === 'branches' ? form.branchIds : form.whereMode === 'teams' ? form.teamIds : form.deptIds,
        },
      }

export default function RequestTypesPage() {
  const [requestTypes, setRequestTypes] = useState<ApiRequestType[]>([])
  const [chains, setChains] = useState<ApprovalChain[]>([])
  const [handlers, setHandlers] = useState<Array<{ key: string; labelAr: string }>>([])
  const [departments, setDepartments] = useState<ApiDepartment[]>([])
  const [teams, setTeams] = useState<ApiTeam[]>([])
  const [employees, setEmployees] = useState<ApiEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<ApiRequestType | null>(null)
  const [activeMenu, setActiveMenu] = useState<number | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [empFilter, setEmpFilter] = useState('')
  const [form, setForm] = useState<BuilderForm>(emptyForm())
  // سلاسل الاعتماد تحتاج approval_chains.manage — بدونها يُخفى اختيار السلسلة فقط
  const [chainsAvailable, setChainsAvailable] = useState(true)
  // قوائم الجمهور (الأقسام/الموظفون) بصلاحياتها — فشلها لا يُسقط الشاشة
  const [audienceNote, setAudienceNote] = useState<string | null>(null)
  // فرع كل نوع (قرار المالك 16 سبتمبر): حساب الفرع يعدّل أنواع فرعه بس
  const branchInfo = useDefinitionBranches()
  const departmentName = (id: number) => departments.find((d) => d.id === id)?.name ?? `قسم رقم ${id}`
  const teamName = (id: number) => teams.find((t) => t.id === id)?.name ?? `فريق رقم ${id}`
  const audienceLookup = { branch: (id: number) => branchInfo.label(id), department: departmentName, team: teamName }
  const typeAudienceText = (rt: ApiRequestType) =>
    audienceText(parseJson<StoredAudience | null>(rt.visibleTo, null), rt.branchId != null ? branchInfo.label(rt.branchId) : null, audienceLookup)

  const reloadTypes = async () => {
    setRequestTypes(await fetchAdminRequestTypes())
  }

  useEffect(() => {
    const loadData = async () => {
      // الأنواع والوجهات أساس الشاشة (request_types.manage)؛ الباقي اختياري
      const [types, hs, ch, deps, emps, tms] = await Promise.allSettled([
        fetchAdminRequestTypes(),
        fetchDestinationHandlers(),
        fetchApprovalChains(),
        fetchDepartments(),
        fetchEmployees(),
        fetchTeams(),
      ])
      if (tms.status === 'fulfilled') setTeams(tms.value)
      if (types.status === 'fulfilled') setRequestTypes(types.value)
      if (hs.status === 'fulfilled') setHandlers(hs.value)
      const coreFailure = [types, hs].find(
        (r): r is PromiseRejectedResult => r.status === 'rejected'
      )
      setError(
        coreFailure
          ? coreFailure.reason instanceof Error
            ? coreFailure.reason.message
            : 'تعذّر تحميل أنواع الطلبات'
          : null
      )
      if (ch.status === 'fulfilled') setChains(ch.value)
      else setChainsAvailable(false)
      if (deps.status === 'fulfilled') setDepartments(deps.value)
      if (emps.status === 'fulfilled') setEmployees(emps.value)
      const missing = [
        ...(deps.status === 'rejected' ? ['الأقسام'] : []),
        ...(emps.status === 'rejected' ? ['الموظفين'] : []),
      ]
      setAudienceNote(
        missing.length
          ? `تعذّر تحميل قائمة ${missing.join(' و')} (صلاحية غير كافية أو خطأ في الخادم) — اختيار الجمهور بها غير متاح`
          : null
      )
      setLoading(false)
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

  // وجهات بتتنفذ من شاشتها الخاصة ومش في قايمة الاختيار — اسمها بالعربي بدل الكود
  const handlerLabelOf = (key: string) =>
    handlers.find((h) => h.key === key)?.labelAr ?? FIXED_HANDLER_LABELS[key] ?? key

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
    if (rt) {
      setEditing(rt)
      const raw = rt as any
      const cf = parseJson<CustomFieldDef[]>(raw.customFields, [])
      const v = parseJson<StoredAudience | null>(raw.visibleTo, null)
      // الوضع القديم «أقسام محددة» = الكل في أقسام محددة
      const legacyDepartments = v?.mode === 'departments'
      const mode: AudienceMode =
        v?.mode === 'roles' || v?.mode === 'employees' || v?.mode === 'positions'
          ? v.mode
          : 'all'
      const whereIds = (Array.isArray(v?.where?.ids) ? v!.where!.ids : []).map(Number)
      const whereMode: WhereMode = legacyDepartments
        ? 'departments'
        : (v?.where?.mode === 'branches' || v?.where?.mode === 'departments' || v?.where?.mode === 'teams') && whereIds.length
          ? (v!.where!.mode as WhereMode)
          : 'company'
      setForm({
        nameAr: rt.nameAr,
        category: rt.category,
        code: rt.code,
        destinationHandler: rt.destinationHandler || 'none',
        approvalChainId: rt.approvalChainId ? String(rt.approvalChainId) : '',
        requiredAttachments: raw.requiredAttachments ?? '',
        fields: cf.map((f) => ({
          rid: `f-${f.key}-${Math.random().toString(36).slice(2, 7)}`,
          key: f.key,
          label: f.label,
          type: f.type,
          required: !!f.required,
          optionsRaw: (f.options ?? []).join('، '),
        })),
        audienceMode: mode,
        deptIds: legacyDepartments ? (v?.ids ?? []).map(Number) : whereMode === 'departments' ? whereIds : [],
        roleIds: mode === 'roles' ? (v?.ids ?? []).map(String) : [],
        empIds: mode === 'employees' ? (v?.ids ?? []).map(Number) : [],
        posIds: mode === 'positions' ? (v?.ids ?? []).map(String) : [],
        whereMode,
        branchIds: whereMode === 'branches' ? whereIds : [],
        teamIds: whereMode === 'teams' ? whereIds : [],
        branchId: rt.branchId ?? null,
      })
    } else {
      setEditing(null)
      setForm(emptyForm())
    }
    setEmpFilter('')
    setModalError(null)
    setShowModal(true)
  }

  // ===== إدارة صفوف الحقول المخصّصة =====
  const addFieldRow = () =>
    setForm({ ...form, fields: [...form.fields, emptyFieldRow()] })

  const removeFieldRow = (rid: string) =>
    setForm({ ...form, fields: form.fields.filter((f) => f.rid !== rid) })

  const updateFieldRow = (rid: string, patch: Partial<FieldRow>) =>
    setForm({
      ...form,
      fields: form.fields.map((f) => (f.rid === rid ? { ...f, ...patch } : f)),
    })

  const toggleId = <T,>(list: T[], id: T): T[] =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id]

  const audienceIds = (): Array<number | string> => {
    switch (form.audienceMode) {
      case 'departments':
        return form.deptIds
      case 'roles':
        return form.roleIds
      case 'employees':
        return form.empIds
      case 'positions':
        return form.posIds
      default:
        return []
    }
  }

  // ===== الحفظ: إنشاء أو تعديل شامل =====
  const handleSave = async () => {
    // تحقق خفيف — رسائل الباك إند العربية تُعرض كما هي عند الرفض
    if (form.nameAr.trim().length < 3) {
      setModalError('اسم النوع مطلوب (3 أحرف على الأقل)')
      return
    }
    for (const f of form.fields) {
      if (!f.key.trim() || !f.label.trim()) {
        setModalError('كل حقل مخصّص يحتاج مفتاحاً (إنجليزي) وتسمية عربية')
        return
      }
      if (f.type === 'select' && parseOptions(f.optionsRaw).length === 0) {
        setModalError(`حقل القائمة «${f.label}» يحتاج خيارات`)
        return
      }
    }
    if (form.audienceMode !== 'all' && audienceIds().length === 0) {
      setModalError('اختار واحد على الأقل في «مين يقدر يقدّم الطلب»')
      return
    }
    if (form.whereMode === 'branches' && form.branchIds.length === 0) {
      setModalError('اختار فرع واحد على الأقل في «فين»')
      return
    }
    if (form.whereMode === 'departments' && form.deptIds.length === 0) {
      setModalError('اختار قسم واحد على الأقل في «فين»')
      return
    }
    if (form.whereMode === 'teams' && form.teamIds.length === 0) {
      setModalError('اختار فريق واحد على الأقل في «فين»')
      return
    }

    const customFields: CustomFieldDef[] = form.fields.map((f) => ({
      key: f.key.trim(),
      label: f.label.trim(),
      type: f.type,
      required: f.required,
      ...(f.type === 'select' ? { options: parseOptions(f.optionsRaw) } : {}),
    }))
    const visibleTo = audienceOfForm(form, audienceIds())

    setSaving(true)
    setModalError(null)
    try {
      if (editing) {
        await updateRequestTypeFull(editing.id, {
          nameAr: form.nameAr.trim(),
          customFields,
          visibleTo,
          // الوجهة تُرسل فقط لو تغيّرت — أنواع مبذورة بوجهات قديمة كانت تُرفض بـ400
          ...(form.destinationHandler !== (editing.destinationHandler || 'none')
            ? { destinationHandler: form.destinationHandler }
            : {}),
          requiredAttachments: form.requiredAttachments.trim() || undefined,
          ...(form.approvalChainId
            ? { approvalChainId: Number(form.approvalChainId) }
            : {}),
        })
        setNotice(`تم تحديث نوع الطلب «${form.nameAr.trim()}»`)
      } else {
        await createRequestType({
          nameAr: form.nameAr.trim(),
          category: form.category,
          ...(form.code.trim() ? { code: form.code.trim() } : {}),
          ...(customFields.length ? { customFields } : {}),
          ...(form.requiredAttachments.trim()
            ? { requiredAttachments: form.requiredAttachments.trim() }
            : {}),
          destinationHandler: form.destinationHandler,
          ...(form.approvalChainId
            ? { approvalChainId: Number(form.approvalChainId) }
            : {}),
          visibleTo: visibleTo as Parameters<typeof createRequestType>[0]['visibleTo'],
          // حساب الشركة يختار الفرع؛ حساب الفرع يتضاف لفرعه تلقائيًا من الخادم
          ...(branchInfo.choosesBranch && form.branchId != null ? { branchId: form.branchId } : {}),
        })
        setNotice(`تم إنشاء نوع الطلب «${form.nameAr.trim()}» بنجاح`)
      }
      await reloadTypes()
      setShowModal(false)
      setError(null)
    } catch (err: any) {
      setModalError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // فرع النوع اللي بيتعدّل/بيتضاف: نوع الفرع يختار موظفين وأقسام من فرعه بس
  const formBranch: number | null = editing
    ? editing.branchId ?? null
    : branchInfo.choosesBranch ? form.branchId : branchInfo.scope?.[0] ?? null
  const formDepartments = departments.filter((d) => formBranch == null || d.branchId === formBranch)
  // فرق «فين»: فرق أقسام فرع النوع (فرع الفريق = فرع قسمه)
  const formTeams = teams.filter((t) => formDepartments.some((d) => d.id === t.departmentId) && (t.isActive !== false || form.teamIds.includes(t.id)))
  const filteredEmployees = employees.filter(
    (e) =>
      (formBranch == null || e.branchId === formBranch) &&
      (!empFilter ||
      e.fullName.includes(empFilter) ||
      e.employeeCode.toLowerCase().includes(empFilter.toLowerCase()))
  )
  const canEditType = (rt: ApiRequestType) => branchInfo.canEdit(rt.branchId)

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
              كتالوج أنواع الطلبات — أنشئ أنواعاً من الصفر بحقول مخصّصة وجمهور محدد
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
              const customFields = parseJson<CustomFieldDef[]>(
                (rt as any).customFields,
                []
              )
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

                  {/* Menu — نوع لكل الشركة أو لفرع تاني: للعرض بس من حساب الفرع */}
                  {canEditType(rt) && (
                  <div className="absolute top-4 left-64">
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
                  )}

                  {/* Info */}
                  <div className="flex items-start gap-4 mt-8">
                    <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center">
                      <FileText size={28} className="text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800 text-lg">{rt.nameAr}</h3>
                      <p className="text-gray-600 text-sm mt-2">
                        {phaseLabels[rt.phase] ?? rt.phase}
                      </p>
                      {/* مين يشوف الطلب ده (قرار المالك 16 سبتمبر) — ملخص الإعداد نفسه */}
                      <p className="mt-2 text-sm text-blue-800 bg-blue-50 rounded-lg px-3 py-1.5 flex items-start gap-1.5">
                        <Users size={15} className="mt-0.5 shrink-0" />
                        <span>يظهر لـ: {typeAudienceText(rt)}</span>
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <DefinitionBranchBadge branchId={rt.branchId} info={branchInfo} />
                        {!canEditType(rt) && (
                          <span className="text-xs text-gray-500">
                            {rt.branchId == null ? 'نوع لكل الشركة — للعرض بس من حساب الفرع' : 'للعرض بس'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="mt-5 space-y-2.5">
                    {/* اختيار السلسلة يحتاج قائمة السلاسل (approval_chains.manage) */}
                    {chainsAvailable && (
                      <div className="flex items-center gap-3 text-sm">
                        <GitBranch size={16} className="text-gray-400" />
                        <span className="text-gray-600">دورة الاعتماد:</span>
                        <select
                          value={rt.approvalChainId ?? ''}
                          onChange={(e) => {
                            const chainId = Number(e.target.value)
                            if (chainId) assignChain(rt, chainId)
                          }}
                          disabled={updatingId === rt.id || !canEditType(rt)}
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
                    )}
                    <div className="flex items-center gap-3 text-sm">
                      <FileOutput size={16} className="text-gray-400" />
                      <span className="text-gray-600">الوجهة:</span>
                      <span className="text-gray-700">
                        {handlerLabelOf(rt.destinationHandler)}
                      </span>
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

                  {/* Fields preview — الحقول المخصّصة إن وُجدت وإلا القديمة */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {customFields.length > 0
                      ? customFields.map((f) => (
                          <span
                            key={f.key}
                            className="text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded-lg border border-primary-100"
                          >
                            {f.label}
                            <span className="text-primary-400 mr-1">
                              ({(fieldTypeLabels as Record<string, string>)[f.type] ?? f.type})
                            </span>
                          </span>
                        ))
                      : fields.map((f) => (
                          <span
                            key={f}
                            className="text-xs bg-gray-50 text-gray-500 px-2 py-1 rounded-lg border border-gray-100"
                          >
                            {payloadFieldLabel(f)}
                          </span>
                        ))}
                  </div>

                  {/* Footer */}
                  <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                    <span>
                      {customFields.length > 0
                        ? `${customFields.length} حقول مخصّصة`
                        : `${fields.length} حقول مطلوبة`}
                    </span>
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

        {/* ===== Modal: بانِي أنواع الطلبات ===== */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {editing ? 'تعديل نوع الطلب' : 'إنشاء نوع طلب جديد'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {editing
                      ? 'الاسم والحقول والجمهور والوجهة — الكود والفئة لا يتغيران بعد الإنشاء'
                      : 'عرّف الحقول المخصّصة والجمهور والوجهة — النوع يظهر فوراً لمن يخصّه'}
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Modal Error — رسائل الباك إند العربية كما هي */}
                {modalError && (
                  <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm">
                    {modalError}
                  </div>
                )}

                {/* الاسم والفئة */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      اسم الطلب (عربي) *
                    </label>
                    <input
                      type="text"
                      value={form.nameAr}
                      onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                      className="input w-full"
                      placeholder="مثال: طلب بدل مواصلات"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الفئة *
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="input w-full"
                      disabled={!!editing}
                      title={editing ? 'الفئة لا تتغير بعد الإنشاء' : undefined}
                    >
                      {Object.entries(categoryLabels).map(([id, label]) => (
                        <option key={id} value={id}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* الكود والوجهة */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الكود (اختياري)
                    </label>
                    <input
                      type="text"
                      value={form.code}
                      onChange={(e) =>
                        setForm({ ...form, code: e.target.value.toUpperCase() })
                      }
                      className="input w-full font-mono"
                      placeholder="TRANSPORT_ALLOWANCE"
                      dir="ltr"
                      disabled={!!editing}
                      title={editing ? 'الكود لا يتغير بعد الإنشاء' : undefined}
                    />
                    {!editing && (
                      <p className="text-xs text-gray-400 mt-1">
                        يُولَّد تلقائياً إن تُرك فارغاً — حروف إنجليزية كبيرة وأرقام و_
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الوجهة (التنفيذ بعد الاعتماد)
                    </label>
                    <select
                      value={form.destinationHandler}
                      onChange={(e) =>
                        setForm({ ...form, destinationHandler: e.target.value })
                      }
                      className="input w-full"
                    >
                      {handlers.map((h) => (
                        <option key={h.key} value={h.key}>
                          {h.labelAr}
                        </option>
                      ))}
                      {/* وجهة النوع الحالية لو ليست ضمن المنفّذ (مبذورة لموديول لم يُبنَ) — تبقى كما هي */}
                      {form.destinationHandler &&
                        !handlers.some((h) => h.key === form.destinationHandler) && (
                          <option value={form.destinationHandler}>
                            {form.destinationHandler} — الوجهة المحفوظة حالياً
                          </option>
                        )}
                    </select>
                  </div>
                </div>

                {/* دورة الاعتماد والمرفقات */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      دورة الاعتماد (اختياري)
                    </label>
                    {/* بلا approval_chains.manage: لا قائمة سلاسل — يُخفى الاختيار ويبقى الربط كما هو */}
                    {chainsAvailable ? (
                    <>
                    <select
                      value={form.approvalChainId}
                      onChange={(e) =>
                        setForm({ ...form, approvalChainId: e.target.value })
                      }
                      className="input w-full"
                    >
                      <option value="">— بدون دورة (تنفيذ فوري) —</option>
                      {chains.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nameAr}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                      تُدار الدورات من «الاعتمادات والموافقات»
                    </p>
                    </>
                    ) : (
                      <p className="text-sm text-gray-500 bg-gray-50 rounded-xl p-3">
                        اختيار دورة الاعتماد يحتاج صلاحية «إدارة سلاسل الاعتماد» —
                        {editing
                          ? ' تبقى الدورة المربوطة كما هي'
                          : ' يُنشأ للنوع الجديد دورة باسمه تُضبط خطواتها لاحقاً'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      المرفقات المطلوبة (اختياري)
                    </label>
                    <div className="relative">
                      <Paperclip
                        size={16}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="text"
                        value={form.requiredAttachments}
                        onChange={(e) =>
                          setForm({ ...form, requiredAttachments: e.target.value })
                        }
                        className="input w-full pr-9"
                        placeholder="مثال: صورة الفاتورة، تقرير طبي"
                      />
                    </div>
                  </div>
                </div>

                {/* ===== الحقول المخصّصة ===== */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700">
                      الحقول المخصّصة
                    </label>
                    <button
                      onClick={addFieldRow}
                      className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                    >
                      <Plus size={16} />
                      إضافة حقل
                    </button>
                  </div>

                  {form.fields.length === 0 && (
                    <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-500">
                      بلا حقول مخصّصة — نموذج التقديم سيكتفي بخانة التفاصيل
                    </div>
                  )}

                  <div className="space-y-3">
                    {form.fields.map((f, idx) => (
                      <div key={f.rid} className="p-4 bg-gray-50 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">
                            الحقل {idx + 1}
                          </span>
                          <button
                            onClick={() => removeFieldRow(f.rid)}
                            title="حذف الحقل"
                            className="p-1.5 rounded-lg text-danger-500 hover:bg-danger-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">
                              المفتاح (إنجليزي) *
                            </label>
                            <input
                              type="text"
                              value={f.key}
                              onChange={(e) =>
                                updateFieldRow(f.rid, { key: e.target.value })
                              }
                              className="input w-full text-sm font-mono"
                              placeholder="amount"
                              dir="ltr"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">
                              التسمية (عربي) *
                            </label>
                            <input
                              type="text"
                              value={f.label}
                              onChange={(e) =>
                                updateFieldRow(f.rid, { label: e.target.value })
                              }
                              className="input w-full text-sm"
                              placeholder="المبلغ"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">
                              نوع الحقل
                            </label>
                            <select
                              value={f.type}
                              onChange={(e) =>
                                updateFieldRow(f.rid, {
                                  type: e.target.value as CustomFieldDef['type'],
                                })
                              }
                              className="input w-full text-sm"
                            >
                              {(
                                Object.entries(fieldTypeLabels) as Array<
                                  [CustomFieldDef['type'], string]
                                >
                              ).map(([id, label]) => (
                                <option key={id} value={id}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={f.required}
                              onChange={(e) =>
                                updateFieldRow(f.rid, { required: e.target.checked })
                              }
                              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm text-gray-700">إجباري</span>
                          </label>
                          {f.type === 'select' && (
                            <div className="flex-1">
                              <input
                                type="text"
                                value={f.optionsRaw}
                                onChange={(e) =>
                                  updateFieldRow(f.rid, { optionsRaw: e.target.value })
                                }
                                className="input w-full text-sm"
                                placeholder="الخيارات مفصولة بفاصلة: يومي، شهري، سنوي"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ===== مين يشوف الطلب ده ويقدّمه؟ (قرار المالك 16 سبتمبر: مين + فين) ===== */}
                <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 space-y-4">
                  <div>
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <Users size={18} className="text-blue-600" />
                      مين يشوف الطلب ده ويقدّمه؟
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">اختار «مين» وبعدين «فين». مثال: مديرو الأقسام في فرع واحد بس.</p>
                  </div>

                  <div className="max-w-sm">
                    <DefinitionBranchField
                      value={editing ? editing.branchId ?? null : form.branchId}
                      onChange={(branchId) => setForm({ ...form, branchId, branchIds: [], deptIds: [], teamIds: [], empIds: [],
                        whereMode: branchId != null && form.whereMode === 'branches' ? 'company' : form.whereMode })}
                      editing={!!editing}
                      info={branchInfo}
                      disabled={saving}
                    />
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">مين؟</p>
                    <div className="flex items-center gap-5 flex-wrap">
                      {(
                        [
                          ['all', 'الكل'],
                          ['positions', 'حسب المنصب'],
                          ['roles', 'أدوار محددة'],
                          ['employees', 'موظفون بعينهم'],
                        ] as Array<[AudienceMode, string]>
                      ).map(([mode, label]) => (
                        <label key={mode} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="audienceMode"
                            checked={form.audienceMode === mode}
                            onChange={() => setForm({ ...form, audienceMode: mode })}
                            className="w-4 h-4 border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {audienceNote && (form.audienceMode !== 'all' || form.whereMode !== 'company') && (
                    <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                      {audienceNote}
                    </p>
                  )}

                  {form.audienceMode === 'positions' && (
                    <div className="mt-3 space-y-2 border border-gray-100 rounded-xl p-3">
                      <div className="flex items-center gap-5 flex-wrap">
                        {audiencePositions.map(([key, label]) => (
                          <label key={key} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={form.posIds.includes(key)}
                              onChange={() =>
                                setForm({
                                  ...form,
                                  posIds: toggleId(form.posIds, key),
                                })
                              }
                              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm text-gray-700">{label}</span>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">كل واحد يقدّم لمن تحته فقط: مدير القسم لقسمه، وقائد الفريق لفريقه، ومدير الفرع لفرعه.</p>
                    </div>
                  )}

                  {form.audienceMode === 'roles' && (
                    <div className="mt-3 flex items-center gap-5 flex-wrap border border-gray-100 rounded-xl p-3">
                      {audienceRoles.map(([role, label]) => (
                        <label key={role} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={form.roleIds.includes(role)}
                            onChange={() =>
                              setForm({
                                ...form,
                                roleIds: toggleId(form.roleIds, role),
                              })
                            }
                            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700">{label}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {form.audienceMode === 'employees' && (
                    <div className="mt-3 border border-gray-100 rounded-xl p-3">
                      <div className="relative mb-2">
                        <Search
                          size={16}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                          type="text"
                          value={empFilter}
                          onChange={(e) => setEmpFilter(e.target.value)}
                          className="input w-full pr-9 text-sm"
                          placeholder="ابحث بالاسم أو الكود..."
                        />
                      </div>
                      <div className="max-h-44 overflow-y-auto space-y-2">
                        {filteredEmployees.map((emp) => (
                          <label key={emp.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={form.empIds.includes(emp.id)}
                              onChange={() =>
                                setForm({
                                  ...form,
                                  empIds: toggleId(form.empIds, emp.id),
                                })
                              }
                              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm text-gray-700">
                              {emp.fullName}
                              <span className="text-xs text-gray-400 font-mono mr-2" dir="ltr">
                                {emp.employeeCode}
                              </span>
                            </span>
                          </label>
                        ))}
                        {filteredEmployees.length === 0 && (
                          <p className="text-sm text-gray-400">لا نتائج مطابقة</p>
                        )}
                      </div>
                      {form.empIds.length > 0 && (
                        <p className="text-xs text-primary-600 mt-2">
                          {form.empIds.length} موظف محدد
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">فين؟</p>
                    <div className="flex items-center gap-5 flex-wrap">
                      {(
                        [
                          ['company', formBranch != null ? `كل ${branchInfo.label(formBranch)}` : 'كل الشركة'],
                          // نوع خاص بفرع مايظهرش في فروع تانية، فاختيار الفروع للنوع العام بس
                          ...(formBranch == null ? [['branches', 'فروع محددة']] : []),
                          ['departments', 'أقسام محددة'],
                          ['teams', 'فرق محددة'],
                        ] as Array<[WhereMode, string]>
                      ).map(([mode, label]) => (
                        <label key={mode} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="whereMode"
                            checked={form.whereMode === mode}
                            onChange={() => setForm({ ...form, whereMode: mode })}
                            className="w-4 h-4 border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700">{label}</span>
                        </label>
                      ))}
                    </div>

                    {form.whereMode === 'branches' && (
                      <div className="mt-3 max-h-44 overflow-y-auto border border-gray-100 bg-white rounded-xl p-3 space-y-2">
                        {branchInfo.branches.filter((b) => b.isActive || form.branchIds.includes(b.id)).map((b) => (
                          <label key={b.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={form.branchIds.includes(b.id)}
                              onChange={() => setForm({ ...form, branchIds: toggleId(form.branchIds, b.id) })}
                              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm text-gray-700">{b.name}</span>
                          </label>
                        ))}
                        {branchInfo.branches.length === 0 && (
                          <p className="text-sm text-gray-400">لا توجد فروع</p>
                        )}
                      </div>
                    )}

                    {form.whereMode === 'departments' && (
                      <div className="mt-3 max-h-44 overflow-y-auto border border-gray-100 bg-white rounded-xl p-3 space-y-2">
                        {formDepartments.map((d) => (
                          <label key={d.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={form.deptIds.includes(d.id)}
                              onChange={() => setForm({ ...form, deptIds: toggleId(form.deptIds, d.id) })}
                              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm text-gray-700">
                              {d.name}
                              {formBranch == null && (
                                <span className="text-xs text-gray-400 mr-2">{branchInfo.label(d.branchId)}</span>
                              )}
                            </span>
                          </label>
                        ))}
                        {formDepartments.length === 0 && (
                          <p className="text-sm text-gray-400">لا توجد أقسام</p>
                        )}
                      </div>
                    )}

                    {form.whereMode === 'teams' && (
                      <div className="mt-3 max-h-44 overflow-y-auto border border-gray-100 bg-white rounded-xl p-3 space-y-2">
                        {formTeams.map((t) => {
                          const dept = departments.find((d) => d.id === t.departmentId)
                          return (
                            <label key={t.id} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={form.teamIds.includes(t.id)}
                                onChange={() => setForm({ ...form, teamIds: toggleId(form.teamIds, t.id) })}
                                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-sm text-gray-700">
                                {t.name}
                                <span className="text-xs text-gray-400 mr-2">
                                  {[dept?.name, formBranch == null && dept ? branchInfo.label(dept.branchId) : null].filter(Boolean).join(' — ')}
                                </span>
                              </span>
                            </label>
                          )
                        })}
                        {formTeams.length === 0 && (
                          <p className="text-sm text-gray-400">لا توجد فرق</p>
                        )}
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-blue-900 bg-white border border-blue-100 rounded-xl px-3 py-2">
                    <span className="font-medium">النتيجة: </span>
                    يظهر لـ {audienceText(audienceOfForm(form, audienceIds()), formBranch != null ? branchInfo.label(formBranch) : null, audienceLookup)}
                  </p>
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
                    : editing
                      ? 'حفظ التغييرات'
                      : 'إنشاء نوع الطلب'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
