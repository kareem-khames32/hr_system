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
  FileOutput,
  ClipboardList,
  Trash2,
  Users,
  Paperclip,
  X,
  Layers,
  ToggleLeft,
  ToggleRight,
  History,
  AlertCircle,
} from 'lucide-react'
import {
  ApiDepartment,
  ApiEmployee,
  ApiRequestType,
  ApiTeam,
  CustomFieldDef,
  can,
  createRequestType,
  fetchAdminRequestTypes,
  fetchApprovalChains,
  fetchDepartments,
  fetchDestinationHandlers,
  fetchEmployees,
  fetchTeams,
  getCurrentUser,
  updateRequestType,
  updateRequestTypeFull,
} from '@/lib/api'
import { categoryLabels } from '@/data/requestsCatalog'
import { DefinitionBranchBadge, DefinitionBranchField, useDefinitionBranches } from '@/components/DefinitionBranchField'
import { payloadFieldLabel } from '@/lib/request-payload'
import { ChainEditorModal, type ChainEditorTarget } from '@/components/approvals/ChainEditorModal'
import { branchVersionsOfChain, chainStepsText, type ApiChain } from '@/components/approvals/chainEditorModel'
import { branchScopeOfUser } from '@/lib/branch-scope'
import {
  categoryChainLabelsOf,
  chainUnset,
  consolidationDefault,
  consolidationStateOf,
  customizeTypeChain,
  fetchRequestCategoryMap,
  followCategoryChain,
  setCategoryChain,
  usageText,
  type ApiRequestCategoryMap,
  type ApiTypeChainInfo,
  type ConsolidationState,
} from '@/lib/request-category-chains'

const FIXED_HANDLER_LABELS: Record<string, string> = {
  custody_assignments: 'العهد (طلب ونقل وإرجاع)',
  leave_calendar_balance: 'إجازة من الرصيد حسب نوعها',
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

// فلتر الحالة: «غير مستخدمة» = ولا طلب اتقدّم عليها (للتنضيف — مفيش حاجة بتتعطل لوحدها)
type StatusFilter = 'all' | 'active' | 'inactive' | 'unused' | 'unused_active'

// «خلّي طلبات الفئة دي كلها على سلسلة واحدة» / «غيّر سلسلة الفئة» — نافذة واحدة
type CategoryDialog = {
  category: string
  // existing = سلسلة موجودة (أو «نفس سلسلة» فئة تانية) · copy = سلسلة جديدة بنسخ خطوات سلسلة · clear = من غير سلسلة للفئة
  mode: 'existing' | 'copy' | 'clear'
  chainId: string
  sourceChainId: string
  nameAr: string
  // أنواع (مش ماشية على سلسلة الفئة) هتتنقل للسلسلة
  selected: number[]
}

const consolidationStateText: Record<ConsolidationState, string> = {
  already: 'ماشي على السلسلة دي أصلًا',
  follower: 'ماشي على سلسلة الفئة الحالية — هيتنقل معاها',
  fixed: '',
  unset: 'سلسلته لسه ما اتضبطتش',
  same: 'نفس الخطوات بالظبط',
  branches: 'نفس الخطوات، بس نسخ الفروع مختلفة — هيفضل على سلسلته إلا لو علّمت عليه',
  different: 'سلسلة مختلفة — هيفضل عليها إلا لو علّمت عليه',
}

export default function RequestTypesPage() {
  const [requestTypes, setRequestTypes] = useState<ApiRequestType[]>([])
  const [chains, setChains] = useState<ApiChain[]>([])
  const [handlers, setHandlers] = useState<Array<{ key: string; labelAr: string }>>([])
  const [departments, setDepartments] = useState<ApiDepartment[]>([])
  const [teams, setTeams] = useState<ApiTeam[]>([])
  const [employees, setEmployees] = useState<ApiEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showModal, setShowModal] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<ApiRequestType | null>(null)
  const [activeMenu, setActiveMenu] = useState<number | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [empFilter, setEmpFilter] = useState('')
  const [form, setForm] = useState<BuilderForm>(emptyForm())
  // سلاسل الاعتماد تحتاج approval_chains.manage — بدونها يُخفى اختيار السلسلة وتعديلها فقط
  const [chainsAvailable, setChainsAvailable] = useState(true)
  // سلسلة كل فئة + وضع كل نوع + استخدامه (طلب المالك 26 سبتمبر) — فشلها لا يُسقط الشاشة
  const [categoryMap, setCategoryMap] = useState<ApiRequestCategoryMap | null>(null)
  // محرر السلسلة جوّه الشاشة نفسها (نفس محرر «الاعتمادات والموافقات»)
  const [editorTarget, setEditorTarget] = useState<ChainEditorTarget | null>(null)
  const [categoryDialog, setCategoryDialog] = useState<CategoryDialog | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [dialogSaving, setDialogSaving] = useState(false)
  // الربط والتخصيص محتاجين الصلاحيتين؛ ربط الفئة إعداد لكل الشركة (الخادم هو اللي بيفرض)
  const [access, setAccess] = useState({ chainActions: false, companyWide: false })
  // قوائم الجمهور (الأقسام/الموظفون) بصلاحياتها — فشلها لا يُسقط الشاشة
  const [audienceNote, setAudienceNote] = useState<string | null>(null)
  // فرع كل نوع (قرار المالك 16 سبتمبر): حساب الفرع يعدّل أنواع فرعه بس
  const branchInfo = useDefinitionBranches()
  const departmentName = (id: number) => departments.find((d) => d.id === id)?.name ?? `قسم رقم ${id}`
  const teamName = (id: number) => teams.find((t) => t.id === id)?.name ?? `فريق رقم ${id}`
  const audienceLookup = { branch: (id: number) => branchInfo.label(id), department: departmentName, team: teamName }
  const typeAudienceText = (rt: ApiRequestType) =>
    audienceText(parseJson<StoredAudience | null>(rt.visibleTo, null), rt.branchId != null ? branchInfo.label(rt.branchId) : null, audienceLookup)

  // بعد أي تغيير في السلاسل: الأنواع + السلاسل + خريطة الفئات مع بعض
  const reloadAll = async () => {
    const [types, ch, map] = await Promise.allSettled([fetchAdminRequestTypes(), fetchApprovalChains(), fetchRequestCategoryMap()])
    if (types.status === 'fulfilled') setRequestTypes(types.value)
    if (ch.status === 'fulfilled') setChains(ch.value as ApiChain[])
    if (map.status === 'fulfilled') setCategoryMap(map.value)
  }

  useEffect(() => {
    const loadData = async () => {
      // الأنواع والوجهات أساس الشاشة (request_types.manage)؛ الباقي اختياري
      const [types, hs, ch, deps, emps, tms, map] = await Promise.allSettled([
        fetchAdminRequestTypes(),
        fetchDestinationHandlers(),
        fetchApprovalChains(),
        fetchDepartments(),
        fetchEmployees(),
        fetchTeams(),
        fetchRequestCategoryMap(),
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
      if (ch.status === 'fulfilled') setChains(ch.value as ApiChain[])
      else setChainsAvailable(false)
      if (map.status === 'fulfilled') setCategoryMap(map.value)
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
      setAccess({
        chainActions: ch.status === 'fulfilled' && can('approval_chains.manage') && can('request_types.manage'),
        companyWide: branchScopeOfUser(getCurrentUser()) === null,
      })
      setLoading(false)
    }
    loadData()
  }, [])

  // ===== سلاسل الاعتماد جوّه الطلبات =====
  const typeInfoOf = (rt: ApiRequestType): ApiTypeChainInfo | undefined =>
    categoryMap?.types.find((t) => t.id === rt.id)
  const categoryEntryOf = (category: string) => categoryMap?.categories.find((c) => c.category === category)
  const chainById = (id?: number | null): ApiChain | null => (id ? chains.find((c) => c.id === id) ?? null : null)
  const chainSummaryById = (id?: number | null) => (id ? categoryMap?.chains.find((c) => c.id === id) ?? null : null)
  const chainNameOf = (chainId?: number | null) =>
    !chainId ? 'من غير سلسلة' : chainById(chainId)?.nameAr ?? chainSummaryById(chainId)?.nameAr ?? `سلسلة رقم ${chainId}`
  const chainStepsOf = (chainId?: number | null): string => {
    const chain = chainById(chainId)
    if (chain) return chainStepsText(chain.steps, chain.autoApprove)
    const summary = chainSummaryById(chainId)
    return summary ? chainStepsText(summary.stepRoles.map((approverRole) => ({ approverRole })), summary.autoApprove) : ''
  }
  const branchVersionCountOf = (chainId?: number | null): number => {
    const chain = chainById(chainId)
    return chain ? branchVersionsOfChain(chain, chains).length : chainSummaryById(chainId)?.branchVersions.length ?? 0
  }
  const categoryChainIdOf = (category: string) => categoryEntryOf(category)?.chainId ?? null
  const categoriesOfChain = (chain: ApiChain) => categoryChainLabelsOf(categoryMap, chain.id)
  const chainTypeNameOf = (chain: ApiChain) =>
    chain.requestTypeName ?? (chain.requestTypeCode ? requestTypes.find((t) => t.code === chain.requestTypeCode)?.nameAr ?? null : null)

  const usedCategories = [...new Set(requestTypes.map((rt) => rt.category))]
  const usageOf = (rt: ApiRequestType) => typeInfoOf(rt)?.usageCount

  const filtered = requestTypes.filter((rt) => {
    const matchesSearch =
      rt.nameAr.includes(searchQuery) ||
      rt.code.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || rt.category === categoryFilter
    const used = usageOf(rt)
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && rt.isActive) ||
      (statusFilter === 'inactive' && !rt.isActive) ||
      (statusFilter === 'unused' && used === 0) ||
      (statusFilter === 'unused_active' && rt.isActive && used === 0)
    return matchesSearch && matchesCategory && matchesStatus
  })

  // الأنواع متجمّعة بفئاتها بترتيب الكتالوج
  const categoryOrder = [...Object.keys(categoryLabels), ...usedCategories.filter((c) => !(c in categoryLabels))]
  const groups = categoryOrder
    .map((category) => ({ category, types: filtered.filter((rt) => rt.category === category) }))
    .filter((group) => group.types.length > 0)

  const activeCount = requestTypes.filter((rt) => rt.isActive).length
  const followingCount = categoryMap?.types.filter((t) => t.mode === 'category').length ?? 0
  const unusedActiveCount = requestTypes.filter((rt) => rt.isActive && usageOf(rt) === 0).length

  // وجهات بتتنفذ من شاشتها الخاصة ومش في قايمة الاختيار — اسمها بالعربي بدل الكود
  const handlerLabelOf = (key: string) =>
    handlers.find((h) => h.key === key)?.labelAr ?? FIXED_HANDLER_LABELS[key] ?? key

  const toggleStatus = async (rt: ApiRequestType) => {
    setActiveMenu(null)
    setUpdatingId(rt.id)
    try {
      const updated = await updateRequestType(rt.id, { isActive: !rt.isActive })
      setRequestTypes(requestTypes.map((t) => (t.id === rt.id ? updated : t)))
      setNotice(updated.isActive ? `تم تفعيل «${rt.nameAr}»` : `تم تعطيل «${rt.nameAr}» — مابقاش يظهر في التقديم، والطلبات القديمة زي ما هي`)
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUpdatingId(null)
    }
  }

  // «خصّص سلسلة للطلب ده»: سلسلة باسمه بنفس الخطوات (ونسخ الفروع) — والمحرر يفتح عليها على طول
  const customizeChain = async (rt: ApiRequestType) => {
    setUpdatingId(rt.id)
    try {
      const result = await customizeTypeChain(rt.id)
      await reloadAll()
      setNotice(
        `«${rt.nameAr}» بقى ليه سلسلة خاصة «${result.chain.nameAr}» بنفس الخطوات${result.branchVersions ? ` ونسخ الفروع (${result.branchVersions})` : ''} — عدّلها زي ما تحب`
      )
      setError(null)
      if (access.chainActions) setEditorTarget({ kind: 'edit', chainId: result.chain.id })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUpdatingId(null)
    }
  }

  // «رجّعه لسلسلة الفئة» — سلسلته الخاصة بتفضل في المكتبة
  const followCategory = async (rt: ApiRequestType) => {
    const categoryChainId = categoryChainIdOf(rt.category)
    if (!categoryChainId) return
    if (!window.confirm(`«${rt.nameAr}» هيرجع يمشي على سلسلة الفئة «${chainNameOf(categoryChainId)}» في الطلبات الجديدة. سلسلته الحالية هتفضل في «الاعتمادات والموافقات». متابعة؟`)) return
    setUpdatingId(rt.id)
    try {
      await followCategoryChain(rt.id)
      await reloadAll()
      setNotice(`«${rt.nameAr}» رجع لسلسلة الفئة «${chainNameOf(categoryChainId)}»`)
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUpdatingId(null)
    }
  }

  // ===== نافذة سلسلة الفئة =====
  const categoryTypes = (category: string) => requestTypes.filter((rt) => rt.category === category)
  // السلسلة المقترحة: اللي عليها أكتر طلبات فعلًا في الفئة (بالاستخدام ثم بالعدد)
  const suggestedChainFor = (category: string): number | null => {
    const scores = new Map<number, { usage: number; types: number }>()
    for (const rt of categoryTypes(category)) {
      const info = typeInfoOf(rt)
      const chain = chainById(rt.approvalChainId)
      if (!chain || info?.mode === 'fixed' || chain.branchId !== null || !chain.isActive || chainUnset(chain)) continue
      const score = scores.get(chain.id) ?? { usage: 0, types: 0 }
      scores.set(chain.id, { usage: score.usage + (info?.usageCount ?? 0), types: score.types + 1 })
    }
    return [...scores.entries()].sort((a, b) => b[1].usage - a[1].usage || b[1].types - a[1].types)[0]?.[0] ?? null
  }
  const dialogTarget = (dialog: CategoryDialog): ApiChain | null =>
    dialog.mode === 'existing' ? chainById(Number(dialog.chainId)) : dialog.mode === 'copy' ? chainById(Number(dialog.sourceChainId)) : null
  const dialogRows = (dialog: CategoryDialog) => {
    const target = dialogTarget(dialog)
    const current = categoryChainIdOf(dialog.category)
    return categoryTypes(dialog.category)
      .map((rt) => ({ rt, state: consolidationStateOf(rt, typeInfoOf(rt), target, current, chains, dialog.mode === 'copy') }))
      .sort((a, b) => Number(b.rt.isActive) - Number(a.rt.isActive) || a.rt.id - b.rt.id)
  }
  const withDefaults = (dialog: CategoryDialog): CategoryDialog => ({
    ...dialog,
    selected: dialog.mode === 'clear' ? [] : dialogRows(dialog)
      .filter(({ rt, state }) => consolidationDefault(rt, state))
      .map(({ rt }) => rt.id),
  })
  const openCategoryDialog = (category: string) => {
    const current = categoryChainIdOf(category)
    const initial = current ?? suggestedChainFor(category)
    setDialogError(null)
    setCategoryDialog(withDefaults({
      category,
      mode: 'existing',
      chainId: initial ? String(initial) : '',
      sourceChainId: initial ? String(initial) : '',
      nameAr: `سلسلة ${categoryLabelOf(category)}`,
      selected: [],
    }))
  }
  const saveCategoryDialog = async () => {
    if (!categoryDialog) return
    const dialog = categoryDialog
    if (dialog.mode === 'existing' && !dialog.chainId) return setDialogError('اختار السلسلة اللي الفئة هتمشي عليها')
    if (dialog.mode === 'copy' && !dialog.sourceChainId) return setDialogError('اختار السلسلة اللي هتنسخ خطواتها')
    if (dialog.mode === 'copy' && dialog.nameAr.trim().length < 3) return setDialogError('اسم السلسلة الجديدة 3 حروف على الأقل')
    setDialogSaving(true)
    setDialogError(null)
    try {
      const result = await setCategoryChain(dialog.category,
        dialog.mode === 'clear'
          ? { chainId: null }
          : dialog.mode === 'copy'
            ? { copyFromChainId: Number(dialog.sourceChainId), nameAr: dialog.nameAr.trim(), repointTypeIds: dialog.selected }
            : { chainId: Number(dialog.chainId), repointTypeIds: dialog.selected })
      await reloadAll()
      const label = categoryLabelOf(dialog.category)
      setNotice(result.chainId === null
        ? `فئة «${label}» بقت من غير سلسلة عامة — كل طلب فاضل على السلسلة اللي هو عليها`
        : `فئة «${label}» بقت على «${result.createdChain?.nameAr ?? chainNameOf(result.chainId)}»${result.createdChain ? ' (سلسلة جديدة بنفس الخطوات)' : ''} — ` +
          (result.repointed.length ? `اتنقل ${result.repointed.length} طلب` : 'ماتنقلش طلبات جديدة'))
      setError(null)
      setCategoryDialog(null)
    } catch (err: any) {
      setDialogError(err.message)
    } finally {
      setDialogSaving(false)
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
      // النوع الجديد بيمشي على سلسلة فئته لو ليها سلسلة
      const fresh = emptyForm()
      const categoryChain = categoryChainIdOf(fresh.category)
      setForm({ ...fresh, approvalChainId: categoryChain ? String(categoryChain) : '' })
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
      await reloadAll()
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
  // سلاسل ينفع يتربط بيها النوع: العامة + سلاسل فرعه لو خاص بفرع (نفس شرط الخادم)
  const formChains = chains.filter((c) => c.branchId === null || (formBranch != null && c.branchId === formBranch))
  const formCategoryChainId = categoryChainIdOf(form.category)

  // ===== سطر السلسلة في كارت النوع: ماشي على الفئة / سلسلة خاصة + الإجراءات =====
  const renderTypeChain = (rt: ApiRequestType) => {
    const info = typeInfoOf(rt)
    if (!info) {
      // من غير خريطة الفئات (صلاحية ناقصة/خطأ): اسم السلسلة بس لو متاح
      return chainsAvailable ? (
        <div className="flex items-center gap-3 text-sm">
          <GitBranch size={16} className="text-gray-400" />
          <span className="text-gray-600">سلسلة الاعتماد:</span>
          <span className="text-gray-700">{chainNameOf(rt.approvalChainId)}</span>
        </div>
      ) : null
    }
    const categoryChainId = categoryChainIdOf(rt.category)
    const busy = updatingId === rt.id
    const actionsAllowed = access.chainActions && canEditType(rt) && info.mode !== 'fixed'
    const chain = chainById(rt.approvalChainId)
    // سلسلته لوحده (مش مشتركة ولا سلسلة فئة، وفي نطاقه): «خصّص» مالهاش لازمة — «تعديل سلسلته» كفاية
    const ownChain = info.mode === 'custom' && info.chainSharedWith === 0 && !!chain &&
      categoryChainLabelsOf(categoryMap, chain.id).length === 0 && (chain.branchId ?? null) === (rt.branchId ?? null)
    return (
      <div className="rounded-xl bg-gray-50 p-3 space-y-2" data-type-chain={rt.code}>
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <GitBranch size={16} className="text-gray-400 shrink-0" />
          {info.mode === 'category' && (
            <span className="badge text-xs bg-emerald-50 text-emerald-700">ماشي على سلسلة الفئة</span>
          )}
          {info.mode === 'custom' && (
            <span className="badge text-xs bg-amber-50 text-amber-700">سلسلة خاصة</span>
          )}
          {info.mode === 'none' && (
            <span className="badge text-xs bg-gray-100 text-gray-600">من غير سلسلة</span>
          )}
          {info.mode === 'fixed' ? (
            <span className="text-xs text-gray-600">{info.fixedReason}</span>
          ) : rt.approvalChainId ? (
            <span className="text-gray-700 truncate">«{chainNameOf(rt.approvalChainId)}»</span>
          ) : null}
        </div>
        {info.mode !== 'fixed' && rt.approvalChainId && (
          <p className="text-xs text-gray-500">
            {chainStepsOf(rt.approvalChainId)}
            {branchVersionCountOf(rt.approvalChainId) > 0 && ` · ${branchVersionCountOf(rt.approvalChainId)} نسخة فرع`}
          </p>
        )}
        {info.mode === 'custom' && info.chainSharedWith > 0 && (
          <p className="text-xs text-amber-700">
            السلسلة دي مشتركة مع {info.chainSharedWith === 1 ? 'طلب تاني' : `${info.chainSharedWith} طلبات تانية`} — تعديلها بيسري عليهم كمان
          </p>
        )}
        {actionsAllowed && (
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {info.mode === 'custom' && chain && (
              <button type="button" className="btn-secondary text-xs px-2.5 py-1" disabled={busy}
                onClick={() => setEditorTarget({ kind: 'edit', chainId: chain.id })}>
                تعديل سلسلته
              </button>
            )}
            {(info.mode === 'category' || info.mode === 'none' || (info.mode === 'custom' && !ownChain)) && (
              <button type="button" className="btn-secondary text-xs px-2.5 py-1" disabled={busy}
                onClick={() => customizeChain(rt)}>
                خصّص سلسلة للطلب ده
              </button>
            )}
            {info.mode !== 'category' && categoryChainId && (
              <button type="button" className="btn-secondary text-xs px-2.5 py-1" disabled={busy}
                onClick={() => followCategory(rt)}>
                رجّعه لسلسلة الفئة
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  // ===== لوحة سلسلة الفئة في رأس كل فئة =====
  const renderCategoryChain = (category: string) => {
    if (!categoryMap) {
      return (
        <p className="text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-3">
          تعذّر تحميل سلسلة الفئة دلوقتي — حدّث الصفحة
        </p>
      )
    }
    const entry = categoryEntryOf(category)
    const chainId = entry?.chainId ?? null
    const chain = chainById(chainId)
    const summary = chainSummaryById(chainId)
    const active = chain ? chain.isActive : summary?.isActive ?? true
    const versions = branchVersionCountOf(chainId)
    const canWrite = access.chainActions && access.companyWide
    const notFollowing = categoryTypes(category).filter((rt) => {
      const info = typeInfoOf(rt)
      return rt.isActive && info && info.mode !== 'category' && info.mode !== 'fixed'
    }).length
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 flex-1 min-w-[18rem] max-w-2xl" data-category-chain={category}>
        {chainId ? (
          <>
            <p className="text-sm text-gray-700 flex items-center gap-2 flex-wrap">
              <GitBranch size={15} className="text-primary-500" />
              <span>سلسلة الفئة:</span>
              <b className="text-gray-900">{chainNameOf(chainId)}</b>
              {!active && <span className="badge text-xs badge-danger">معطّلة — طلبات الفئة واقفة</span>}
            </p>
            <p className="text-xs text-gray-500 mt-1.5">{chainStepsOf(chainId)}</p>
            <p className="text-xs text-gray-500 mt-1">
              {entry!.following} من {entry!.typeCount} ماشيين عليها
              {versions > 0 && ` · ${versions} ${versions === 1 ? 'نسخة فرع' : 'نسخ فروع'}`}
              {entry!.sharedWith.length > 0 && ` · مشتركة مع: ${entry!.sharedWith.map(categoryLabelOf).join('، ')}`}
            </p>
            {entry!.chainMissing && (
              <p className="text-xs text-danger-600 mt-1 flex items-center gap-1">
                <AlertCircle size={13} />
                السلسلة المربوطة مش موجودة — اختار سلسلة تانية للفئة
              </p>
            )}
            <div className="flex items-center gap-2 flex-wrap mt-3">
              {chain && chainsAvailable && (
                <button type="button" className="btn-secondary text-sm px-3 py-1.5"
                  onClick={() => setEditorTarget({ kind: 'edit', chainId: chain.id })}>
                  تعديل السلسلة
                </button>
              )}
              {canWrite && (
                <button type="button" className="btn-secondary text-sm px-3 py-1.5" onClick={() => openCategoryDialog(category)}>
                  {notFollowing > 0 ? 'خلّي طلبات الفئة دي كلها على سلسلة واحدة' : 'غيّر سلسلة الفئة'}
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-700 flex items-center gap-2">
              <GitBranch size={15} className="text-gray-400" />
              {category === 'financial'
                ? 'كل طلب مالي بسلسلته — مفيش سلسلة عامة للمالية'
                : 'الفئة دي لسه مالهاش سلسلة عامة — كل طلب ماشي بسلسلته'}
            </p>
            {canWrite && (
              <button type="button" className={`${category === 'financial' ? 'btn-secondary' : 'btn-primary'} text-sm px-3 py-1.5 mt-3`}
                onClick={() => openCategoryDialog(category)}>
                {category === 'financial' ? 'اختار سلسلة واحدة للمالية' : 'خلّي طلبات الفئة دي كلها على سلسلة واحدة'}
              </button>
            )}
          </>
        )}
      </div>
    )
  }

  const renderTypeCard = (rt: ApiRequestType) => {
    const customFields = parseJson<CustomFieldDef[]>(
      (rt as any).customFields,
      []
    )
    const fields = parseRequiredFields(rt.requiredFields)
    const info = typeInfoOf(rt)
    return (
      <div
        key={rt.id}
        className={`card p-6 ${!rt.isActive ? 'opacity-70' : ''}`}
        data-request-type={rt.code}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center shrink-0">
              <FileText size={28} className="text-primary-600" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-gray-800 text-lg">{rt.nameAr}</h3>
              <p className="text-gray-600 text-sm mt-1">
                {phaseLabels[rt.phase] ?? rt.phase}
              </p>
              {/* الاستخدام — عدد الطلبات وآخر طلب (للتنضيف) */}
              {info && (
                <p className={`text-xs mt-1 flex items-center gap-1 ${info.usageCount ? 'text-gray-500' : 'text-amber-700'}`} data-type-usage>
                  <History size={13} className="shrink-0" />
                  {usageText(info.usageCount, info.lastRequestAt)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
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
            {/* تفعيل/تعطيل من الكارت نفسه — نوع لكل الشركة أو لفرع تاني: للعرض بس من حساب الفرع */}
            {canEditType(rt) && (
              <button
                type="button"
                onClick={() => toggleStatus(rt)}
                disabled={updatingId === rt.id}
                title={rt.isActive ? 'تعطيل النوع' : 'تفعيل النوع'}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                data-type-toggle
              >
                {rt.isActive ? (
                  <ToggleRight size={20} className="text-success-600" />
                ) : (
                  <ToggleLeft size={20} className="text-gray-400" />
                )}
              </button>
            )}
            {canEditType(rt) && (
              <div className="relative">
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
          </div>
        </div>

        {/* مين يشوف الطلب ده (قرار المالك 16 سبتمبر) — ملخص الإعداد نفسه */}
        <p className="mt-3 text-sm text-blue-800 bg-blue-50 rounded-lg px-3 py-1.5 flex items-start gap-1.5">
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

        {/* سلسلة الاعتماد جوّه الطلب نفسه (طلب المالك 26 سبتمبر) */}
        <div className="mt-4">{renderTypeChain(rt)}</div>

        {/* Details */}
        <div className="mt-4 space-y-2.5">
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
              كل أنواع الطلبات وسلاسل اعتمادها في مكان واحد — كل فئة ليها سلسلة عامة، وتقدر تخصّص سلسلة لطلب بعينه ولكل فرع
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
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                <Layers size={24} className="text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">ماشية على سلسلة الفئة</p>
                <p className="text-2xl font-bold text-emerald-600">{categoryMap ? followingCount : '-'}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-warning-50 rounded-xl flex items-center justify-center">
                <History size={24} className="text-warning-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">مفعّلة ومااستُخدمتش</p>
                <p className="text-2xl font-bold text-gray-800">{categoryMap ? unusedActiveCount : '-'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="card p-4 space-y-2">
          <div className="flex items-center gap-4 flex-wrap">
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
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="input w-56"
              data-status-filter
            >
              <option value="all">كل الحالات</option>
              <option value="active">المفعّلة بس</option>
              <option value="inactive">المعطّلة بس</option>
              <option value="unused" disabled={!categoryMap}>غير مستخدمة (ولا طلب)</option>
              <option value="unused_active" disabled={!categoryMap}>مفعّلة وغير مستخدمة</option>
            </select>
          </div>
          {(statusFilter === 'unused' || statusFilter === 'unused_active') && (
            <p className="text-xs text-gray-500">
              الأنواع اللي ماتقدّمش عليها ولا طلب — راجعها وعطّل اللي مش محتاجه من زرار التفعيل في الكارت. مفيش حاجة بتتعطل لوحدها.
            </p>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* الأنواع بفئاتها — لكل فئة سلسلتها في الرأس */}
        {!loading && groups.map(({ category, types }) => (
          <section key={category} className="space-y-4" data-request-category={category}>
            <div className="card p-5 flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Layers size={18} className="text-primary-500" />
                  {categoryLabelOf(category)}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {categoryTypes(category).length} نوع — {categoryTypes(category).filter((rt) => rt.isActive).length} مفعّل
                  {types.length !== categoryTypes(category).length && ` (ظاهر ${types.length} بالفلتر)`}
                </p>
              </div>
              {renderCategoryChain(category)}
            </div>
            <div className="grid grid-cols-2 gap-6">
              {types.map(renderTypeCard)}
            </div>
          </section>
        ))}

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
                      onChange={(e) => {
                        // النوع الجديد بيتبع سلسلة فئته الجديدة (لو ماكانش اختار سلسلة بعينها)
                        const nextChain = categoryChainIdOf(e.target.value)
                        const followedOld = !form.approvalChainId || form.approvalChainId === String(categoryChainIdOf(form.category) ?? '')
                        setForm({
                          ...form,
                          category: e.target.value,
                          ...(followedOld ? { approvalChainId: nextChain ? String(nextChain) : '' } : {}),
                        })
                      }}
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

                {/* سلسلة الاعتماد والمرفقات */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      سلسلة الاعتماد
                    </label>
                    {/* بلا approval_chains.manage: لا قائمة سلاسل — يُخفى الاختيار ويبقى الربط كما هو */}
                    {chainsAvailable ? (
                    <>
                    <div className="flex items-center gap-2">
                    <select
                      value={form.approvalChainId}
                      onChange={(e) =>
                        setForm({ ...form, approvalChainId: e.target.value })
                      }
                      className="input w-full"
                    >
                      {editing ? (
                        !form.approvalChainId && <option value="" disabled>من غير سلسلة</option>
                      ) : (
                        <option value="">سلسلة خاصة جديدة باسم الطلب (فاضية لحد ما تضيف خطواتها)</option>
                      )}
                      {formCategoryChainId && (
                        <option value={formCategoryChainId}>
                          سلسلة الفئة: {chainNameOf(formCategoryChainId)}
                        </option>
                      )}
                      {formChains.filter((c) => c.id !== formCategoryChainId).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nameAr}{c.isActive ? '' : ' (معطّلة)'}
                        </option>
                      ))}
                      {/* السلسلة المربوطة حاليًا لو مش ضمن القائمة (ربط قديم) — تفضل ظاهرة باسمها */}
                      {form.approvalChainId && form.approvalChainId !== String(formCategoryChainId ?? '') &&
                        !formChains.some((c) => String(c.id) === form.approvalChainId) && (
                          <option value={form.approvalChainId}>{chainNameOf(Number(form.approvalChainId))}</option>
                        )}
                    </select>
                    {editing && access.chainActions && chainById(Number(form.approvalChainId)) && (
                      <button type="button" className="btn-secondary text-sm px-3 py-2 shrink-0"
                        onClick={() => setEditorTarget({ kind: 'edit', chainId: Number(form.approvalChainId) })}>
                        افتح السلسلة
                      </button>
                    )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {formCategoryChainId
                        ? 'الأصل إن الطلب يمشي على سلسلة فئته — وتقدر تخصّص له سلسلة من الكارت'
                        : 'كل السلاسل في «الاعتمادات والموافقات» — وسلسلة الفئة من رأس الفئة هنا'}
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

        {/* ===== «خلّي طلبات الفئة دي كلها على سلسلة واحدة» / «غيّر سلسلة الفئة» ===== */}
        {categoryDialog && (() => {
          const dialog = categoryDialog
          const label = categoryLabelOf(dialog.category)
          const current = categoryChainIdOf(dialog.category)
          const rows = dialogRows(dialog)
          const target = dialogTarget(dialog)
          const moving = rows.filter(({ rt, state }) => state === 'follower' || (!['fixed', 'already'].includes(state) && dialog.selected.includes(rt.id)))
          const already = rows.filter(({ state }) => state === 'already').length
          const generalChains = chains.filter((c) => c.branchId === null)
          // سلاسل طلبات الفئة دي الأول (الأقرب للاختيار)، وبعدها «نفس سلسلة» فئة تانية، وبعدها الباقي
          const ownChainIds = new Set(categoryTypes(dialog.category).map((rt) => rt.approvalChainId ?? 0))
          const ownChains = generalChains.filter((c) => ownChainIds.has(c.id))
          // «نفس سلسلة» فئة تانية (الإجازات والحضور مثلًا)
          const otherCategoryChains = (categoryMap?.categories ?? [])
            .filter((entry) => entry.category !== dialog.category && entry.chainId && chainById(entry.chainId) && !ownChainIds.has(entry.chainId))
          const restChains = generalChains.filter((c) => !ownChainIds.has(c.id) && !otherCategoryChains.some((entry) => entry.chainId === c.id))
          const usable = (chain: ApiChain) => chain.isActive && !chainUnset(chain)
          const change = (patch: Partial<CategoryDialog>) => setCategoryDialog(withDefaults({ ...dialog, ...patch }))
          return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" data-category-dialog={dialog.category}>
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">سلسلة فئة «{label}»</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      كل طلب في الفئة ماشي على سلسلتها بيتنقل معاها تلقائي. الطلب اللي ليه سلسلة خاصة بيفضل عليها إلا لو علّمت عليه تحت.
                    </p>
                  </div>
                  <button onClick={() => setCategoryDialog(null)} className="p-2 hover:bg-gray-100 rounded-lg" disabled={dialogSaving}>
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>

                <div className="p-6 space-y-5">
                  {dialogError && (
                    <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm flex items-start gap-2">
                      <AlertCircle size={16} className="shrink-0 mt-0.5" />
                      <span>{dialogError}</span>
                    </div>
                  )}

                  <div className="space-y-3">
                    <label className="flex items-start gap-2">
                      <input type="radio" name="categoryChainMode" className="mt-1" checked={dialog.mode === 'existing'}
                        onChange={() => change({ mode: 'existing' })} />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-800">سلسلة موجودة</span>
                        {dialog.mode === 'existing' && (
                          <select className="input w-full mt-2" value={dialog.chainId} onChange={(e) => change({ chainId: e.target.value })}>
                            <option value="">— اختار السلسلة —</option>
                            {ownChains.length > 0 && (
                              <optgroup label={`سلاسل طلبات ${label}`}>
                                {ownChains.map((c) => (
                                  <option key={c.id} value={c.id} disabled={!usable(c)}>
                                    {c.nameAr}{!c.isActive ? ' (معطّلة)' : chainUnset(c) ? ' (مالهاش خطوات)' : ''}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            {otherCategoryChains.length > 0 && (
                              <optgroup label="نفس سلسلة فئة تانية">
                                {otherCategoryChains.map((entry) => (
                                  <option key={`same-${entry.category}`} value={entry.chainId!}>
                                    نفس سلسلة: {categoryLabelOf(entry.category)} («{chainNameOf(entry.chainId)}»)
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            <optgroup label="باقي السلاسل العامة">
                              {restChains.map((c) => (
                                <option key={c.id} value={c.id} disabled={!usable(c)}>
                                  {c.nameAr}{!c.isActive ? ' (معطّلة)' : chainUnset(c) ? ' (مالهاش خطوات)' : ''}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        )}
                      </div>
                    </label>

                    <label className="flex items-start gap-2">
                      <input type="radio" name="categoryChainMode" className="mt-1" checked={dialog.mode === 'copy'}
                        onChange={() => change({ mode: 'copy' })} />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-800">سلسلة جديدة للفئة بخطوات سلسلة موجودة</span>
                        {dialog.mode === 'copy' && (
                          <div className="grid grid-cols-2 gap-3 mt-2">
                            <select className="input w-full" value={dialog.sourceChainId} onChange={(e) => change({ sourceChainId: e.target.value })}>
                              <option value="">— انسخ خطوات —</option>
                              {[
                                { key: 'own', title: `سلاسل طلبات ${label}`, list: ownChains },
                                { key: 'rest', title: 'باقي السلاسل العامة', list: generalChains.filter((c) => !ownChainIds.has(c.id)) },
                              ]
                                .filter((group) => group.list.length > 0)
                                .map((group) => (
                                  <optgroup key={group.key} label={group.title}>
                                    {group.list.map((c) => (
                                      <option key={c.id} value={c.id} disabled={chainUnset(c)}>
                                        {c.nameAr}{chainUnset(c) ? ' (مالهاش خطوات)' : ''}
                                      </option>
                                    ))}
                                  </optgroup>
                                ))}
                            </select>
                            <input className="input w-full" value={dialog.nameAr} onChange={(e) => setCategoryDialog({ ...dialog, nameAr: e.target.value })}
                              placeholder={`سلسلة ${label}`} />
                            <p className="text-xs text-gray-500 col-span-2">الخطوات ونسخ الفروع بتتنسخ زي ما هي، وبعدها تعدّلها براحتك من «تعديل السلسلة».</p>
                          </div>
                        )}
                      </div>
                    </label>

                    {current && (
                      <label className="flex items-start gap-2">
                        <input type="radio" name="categoryChainMode" className="mt-1" checked={dialog.mode === 'clear'}
                          onChange={() => change({ mode: 'clear' })} />
                        <div>
                          <span className="text-sm font-medium text-gray-800">من غير سلسلة للفئة — كل طلب بسلسلته</span>
                          {dialog.mode === 'clear' && (
                            <p className="text-xs text-gray-500 mt-1">
                              مفيش طلب هيتحرك: الماشيين على «{chainNameOf(current)}» بيفضلوا عليها كسلسلة خاصة.
                            </p>
                          )}
                        </div>
                      </label>
                    )}
                  </div>

                  {dialog.mode !== 'clear' && (
                    <div className="border border-gray-200 rounded-xl">
                      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-800">الطلبات اللي هتمشي على السلسلة دي</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            متعلّم عليها افتراضيًا: المفعّلة اللي سلسلتها لسه ما اتضبطتش أو بنفس الخطوات بالظبط
                            {target ? ` («${target.nameAr}»: ${chainStepsText(target.steps, target.autoApprove)})` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 text-xs">
                          <button type="button" className="text-primary-600 hover:underline"
                            onClick={() => setCategoryDialog({ ...dialog, selected: rows.filter(({ state }) => !['fixed', 'follower', 'already'].includes(state)).map(({ rt }) => rt.id) })}>
                            علّم الكل
                          </button>
                          <button type="button" className="text-gray-500 hover:underline" onClick={() => setCategoryDialog({ ...dialog, selected: [] })}>
                            شيل الكل
                          </button>
                        </div>
                      </div>
                      <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                        {rows.map(({ rt, state }) => {
                          const locked = state === 'follower' || state === 'already' || state === 'fixed'
                          const checked = state === 'follower' || state === 'already' || (state !== 'fixed' && dialog.selected.includes(rt.id))
                          const info = typeInfoOf(rt)
                          return (
                            <label key={rt.id} className={`flex items-start gap-3 px-4 py-2.5 ${locked ? 'bg-gray-50' : 'hover:bg-gray-50'}`} data-consolidation-row={state}>
                              <input type="checkbox" className="mt-1" checked={checked} disabled={locked}
                                onChange={() => setCategoryDialog({ ...dialog, selected: toggleId(dialog.selected, rt.id) })} />
                              <div className="min-w-0">
                                <p className="text-sm text-gray-800 flex items-center gap-2 flex-wrap">
                                  {rt.nameAr}
                                  {!rt.isActive && <span className="badge text-[10px] bg-gray-100 text-gray-500">معطّل</span>}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {state === 'fixed' ? info?.fixedReason : consolidationStateText[state]}
                                  {state !== 'fixed' && state !== 'already' && state !== 'follower' && rt.approvalChainId
                                    ? ` — «${chainNameOf(rt.approvalChainId)}»: ${chainStepsOf(rt.approvalChainId)}` : ''}
                                  {info ? ` · ${usageText(info.usageCount, info.lastRequestAt)}` : ''}
                                </p>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-gray-100 flex items-center justify-between gap-3">
                  <p className="text-sm text-gray-600" data-category-dialog-summary>
                    {dialog.mode === 'clear'
                      ? 'الفئة هتبقى من غير سلسلة عامة — مفيش طلب هيتحرك'
                      : `هيتنقل للسلسلة ${moving.length} طلب${already ? ` — و${already} عليها أصلًا` : ''}`}
                  </p>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setCategoryDialog(null)} className="btn-secondary" disabled={dialogSaving}>
                      إلغاء
                    </button>
                    <button onClick={saveCategoryDialog} className="btn-primary disabled:opacity-50" disabled={dialogSaving} data-category-dialog-save>
                      {dialogSaving ? 'جارٍ الحفظ...' : 'حفظ'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* محرر السلسلة جوّه «بانِي الطلبات» نفسه — نفس محرر المكتبة، وفيه «سلسلة مختلفة لكل فرع» */}
        <ChainEditorModal
          target={editorTarget}
          chains={chains}
          branches={branchInfo.branches}
          employees={employees}
          onNavigate={setEditorTarget}
          onClose={() => setEditorTarget(null)}
          onSaved={async (message) => {
            await reloadAll()
            setNotice(message)
            setError(null)
          }}
          typeNameOf={chainTypeNameOf}
          categoriesOf={categoriesOfChain}
        />
      </div>
    </MainLayout>
  )
}
