// فلتر «الفرع ← الإدارة ← القسم ← الفريق» الموحد (طلب المالك 30 سبتمبر: «فلتر بالفرع لوحده، وفي أي شاشة فيها موظفين: الفرع
// والإدارات والأقسام والفرق — فلتر أقوى وأسهل»). المنطق هنا صافي من غير React عشان يتختبر لوحده؛ الشريط والـhook في
// components/OrgFilter.tsx. الشجرة ومكان كل موظف من GET /org/filter-context بنطاق فروع الحساب (الخادم هو اللي بيفرض النطاق)،
// ومتخزّنة للجلسة.
// المطابقة: الفرع = فرع الموظف؛ الإدارة أو القسم = الوحدة وأقسامها الفرعية جوه فرعها بس (branchLocalSubtree — نفس توسعة المسير:
// «الإدارة التنفيذية» مابتسحبش أقسام فروع تانية تحتها)؛ الفريق = الفريق نفسه بالظبط. كل مستوى مختار بيضيّق زيادة.
// موظف مش معروف في الشجرة والفلتر شغال = مش مطابق (مايظهرش صف مش متأكدين من مكانه).

import { apiFetch, getToken } from './api'
import { branchLocalSubtree, isAdministration, unitPathLabel } from './department-tree'

export interface OrgFilterBranch { id: number; name: string }
export interface OrgFilterUnit {
  id: number
  name: string
  branchId: number
  // أب ظاهر للحساب بس — الخادم بيرجّع null بدل أب من فرع برّه النطاق (زي «الإدارة التنفيذية»)
  parentId: number | null
  unitType: 'ADMINISTRATION' | 'DEPARTMENT'
  isExecutive: boolean
}
export interface OrgFilterTeam { id: number; name: string; departmentId: number; branchId: number }
// رقم الموظف ومكانه بس — من غير اسم ولا أي بيانات شخصية
export interface OrgFilterEmployee { id: number; branchId: number | null; departmentId: number | null; teamId: number | null }
export interface OrgFilterContext {
  branches: OrgFilterBranch[]
  units: OrgFilterUnit[]
  teams: OrgFilterTeam[]
  employees: OrgFilterEmployee[]
}

export type OrgFilterLevel = 'branch' | 'administration' | 'department' | 'team'
export const ORG_FILTER_LEVELS: OrgFilterLevel[] = ['branch', 'administration', 'department', 'team']

export interface OrgFilterValue {
  branchId: number | null
  administrationId: number | null
  departmentId: number | null
  teamId: number | null
}
export const EMPTY_ORG_FILTER: OrgFilterValue = { branchId: null, administrationId: null, departmentId: null, teamId: null }

// مكان صف في الشاشة (لما الصف شايل مكانه بنفسه، زي صفوف المسير من لقطته)
export interface OrgPlacementInput {
  branchId?: number | null
  departmentId?: number | null
  teamId?: number | null
}

// للشاشات اللي بتتفلتر أو بتترقّم أو بتتجمّع في الخادم: الفرع، والإدارة/القسم المختار بأقسامه الفرعية جوه فرعه، والفريق
export interface OrgFilterParams {
  branchId?: number
  departmentIds?: number[]
  teamId?: number
}

// ===== التحميل: مرة للجلسة (بمفتاح التوكن)، والشاشات بتاخد النسخة المتخزّنة فورًا =====
// نسخة أقدم من دقيقة بتتحدّث في الخلفية لما شاشة فيها الفلتر تفتح (موظف جديد اتضاف يبان في الفلتر من غير إعادة دخول)
const FRESH_MS = 60_000

interface CacheEntry { key: string; data: OrgFilterContext | null; at: number; pending: Promise<OrgFilterContext> | null }
let cache: CacheEntry | null = null

const sessionKey = () => getToken() ?? ''

export const fetchOrgFilterContext = () => apiFetch<OrgFilterContext>('/org/filter-context')

/** النسخة المتخزّنة للجلسة الحالية لو موجودة (من غير طلب). */
export function peekOrgFilterContext(): { data: OrgFilterContext; at: number } | null {
  return cache && cache.key === sessionKey() && cache.data ? { data: cache.data, at: cache.at } : null
}

/** الشجرة للجلسة: المتخزّنة لو لسه جديدة، وإلا طلب واحد مشترك لكل الشاشات اللي فاتحة في نفس اللحظة. force = حدّث دلوقتي. */
export function loadOrgFilterContext(force = false): Promise<OrgFilterContext> {
  const key = sessionKey()
  if (!cache || cache.key !== key) cache = { key, data: null, at: 0, pending: null }
  const entry = cache
  if (!force && entry.data && Date.now() - entry.at < FRESH_MS) return Promise.resolve(entry.data)
  if (entry.pending) return entry.pending
  const pending = fetchOrgFilterContext().then(
    (data) => {
      if (cache === entry) {
        entry.data = data
        entry.at = Date.now()
        entry.pending = null
      }
      return data
    },
    (error) => {
      if (cache === entry) entry.pending = null
      throw error
    }
  )
  entry.pending = pending
  return pending
}

/** للاختبارات: تفريغ النسخة المتخزّنة. */
export function clearOrgFilterContextCache() {
  cache = null
}

// ===== المطابقة =====
const byName = (a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label, 'ar')

/** الفلتر شغال؟ الفرع المقفول على الحساب (حساب الفرع الواحد) مش فلتر — هو نطاقه أصلًا. */
export function orgFilterActive(value: OrgFilterValue, lockedBranchId: number | null = null): boolean {
  return (value.branchId !== null && value.branchId !== lockedBranchId) || value.administrationId !== null ||
    value.departmentId !== null || value.teamId !== null
}

/** الوحدات اللي عليها الاختيار: القسم المختار (أو الإدارة لو مفيش قسم) بأقسامه الفرعية جوه فرعه — null = مفيش وحدة مختارة. */
export function selectedUnitIds(context: OrgFilterContext | null, value: OrgFilterValue): Set<number> | null {
  const root = value.departmentId ?? value.administrationId
  if (root === null) return null
  return context ? branchLocalSubtree(context.units, [root]) : new Set([root])
}

export interface CompiledOrgFilter {
  active: boolean
  matchesPlacement: (placement: OrgPlacementInput) => boolean
  // false لموظف مش معروف في الشجرة والفلتر شغال؛ known = الموظف موجود في الشجرة
  matches: (employeeId: number | null | undefined) => boolean
  known: (employeeId: number | null | undefined) => boolean
  params: OrgFilterParams
}

/** الفلتر جاهز للمطابقة: كل صف بيتقارن بمجموعات محسوبة مرة واحدة. */
export function compileOrgFilter(
  context: OrgFilterContext | null,
  value: OrgFilterValue,
  lockedBranchId: number | null = null
): CompiledOrgFilter {
  const active = orgFilterActive(value, lockedBranchId)
  const employees = new Map((context?.employees ?? []).map((e) => [e.id, e]))
  const known = (employeeId: number | null | undefined) => employeeId != null && employees.has(Number(employeeId))
  if (!active) return { active, matchesPlacement: () => true, matches: () => true, known, params: {} }
  const branchId = value.branchId
  const unitIds = selectedUnitIds(context, value)
  const teamId = value.teamId
  const matchesPlacement = (placement: OrgPlacementInput) => {
    if (branchId !== null && (placement.branchId ?? null) !== branchId) return false
    if (unitIds && (placement.departmentId == null || !unitIds.has(Number(placement.departmentId)))) return false
    if (teamId !== null && (placement.teamId ?? null) !== teamId) return false
    return true
  }
  const matches = (employeeId: number | null | undefined) => {
    const employee = employeeId == null ? undefined : employees.get(Number(employeeId))
    return employee ? matchesPlacement(employee) : false
  }
  const params: OrgFilterParams = {}
  if (branchId !== null) params.branchId = branchId
  if (unitIds) params.departmentIds = [...unitIds].sort((a, b) => a - b)
  if (teamId !== null) params.teamId = teamId
  return { active, matchesPlacement, matches, known, params }
}

/** org.params كاستعلام: branchId=2&departmentIds=3,4,5&teamId=7 (القيم الفاضية ما بتتبعتش). */
export function orgFilterQuery(params: OrgFilterParams): string {
  const query = new URLSearchParams()
  if (params.branchId) query.set('branchId', String(params.branchId))
  if (params.departmentIds?.length) query.set('departmentIds', params.departmentIds.join(','))
  if (params.teamId) query.set('teamId', String(params.teamId))
  return query.toString()
}

/** org.params كقيم استعلام للنداءات اللي بتبني الاستعلام من كائن (زي fetchLeaves) — departmentIds بفاصلة. */
export function orgFilterQueryValues(params: OrgFilterParams): { branchId?: number; departmentIds?: string; teamId?: number } {
  return {
    ...(params.branchId ? { branchId: params.branchId } : {}),
    ...(params.departmentIds?.length ? { departmentIds: params.departmentIds.join(',') } : {}),
    ...(params.teamId ? { teamId: params.teamId } : {}),
  }
}

/** نفس orgFilterQuery لإضافته على URLSearchParams موجود. */
export function appendOrgFilterParams(query: URLSearchParams, params: OrgFilterParams | undefined) {
  if (!params) return query
  if (params.branchId) query.set('branchId', String(params.branchId))
  if (params.departmentIds?.length) query.set('departmentIds', params.departmentIds.join(','))
  if (params.teamId) query.set('teamId', String(params.teamId))
  return query
}

// ===== الاختيارات: كل مستوى متفلتر باللي فوقه =====
export interface OrgFilterOption { id: number; label: string }
export interface OrgFilterOptions {
  branches: OrgFilterOption[]
  administrations: OrgFilterOption[]
  departments: OrgFilterOption[]
  teams: OrgFilterOption[]
}

/** اختيارات المستويات الأربعة للقيمة الحالية: الإدارات في الفرع المختار، والأقسام تحت الإدارة المختارة (جوه فرعها)، والفرق تحت الوحدة المختارة. */
export function orgFilterOptions(context: OrgFilterContext | null, value: OrgFilterValue): OrgFilterOptions {
  if (!context) return { branches: [], administrations: [], departments: [], teams: [] }
  const branchName = new Map(context.branches.map((b) => [b.id, b.name]))
  const manyBranches = value.branchId === null && context.branches.length > 1
  const withBranch = (label: string, branchId: number) => (manyBranches ? `${label} — ${branchName.get(branchId) ?? `فرع #${branchId}`}` : label)
  const inBranch = (branchId: number) => value.branchId === null || branchId === value.branchId

  const branches = context.branches.map((b) => ({ id: b.id, label: b.name })).sort(byName)

  const administrationUnits = context.units.filter((u) => isAdministration(u) && inBranch(u.branchId))
  const administrations = administrationUnits
    .map((u) => ({ id: u.id, label: withBranch(u.name, u.branchId), executive: u.isExecutive }))
    .sort((a, b) => Number(b.executive) - Number(a.executive) || byName(a, b))
    .map(({ id, label }) => ({ id, label }))

  const underAdministration = value.administrationId !== null ? branchLocalSubtree(context.units, [value.administrationId]) : null
  const departments = context.units
    .filter((u) => !isAdministration(u) && inBranch(u.branchId) && (!underAdministration || underAdministration.has(u.id)))
    .map((u) => {
      // الإدارة مختارة: المسار من تحتها («القسم ← القسم الفرعي»)، وإلا المسار كامل («الإدارة ← القسم»)
      const path = unitPathLabel(u.id, context.units)
      const administration = value.administrationId !== null ? context.units.find((a) => a.id === value.administrationId) : null
      const prefix = administration ? `${administration.name} ← ` : ''
      const label = prefix && path.startsWith(prefix) ? path.slice(prefix.length) : path || u.name
      return { id: u.id, label: withBranch(label, u.branchId) }
    })
    .sort(byName)

  const unitIds = selectedUnitIds(context, value)
  const unitName = new Map(context.units.map((u) => [u.id, u.name]))
  const teams = context.teams
    .filter((t) => inBranch(t.branchId) && (!unitIds || unitIds.has(t.departmentId)))
    .map((t) => ({
      id: t.id,
      label: withBranch(value.departmentId === t.departmentId ? t.name : `${t.name} (${unitName.get(t.departmentId) ?? `قسم #${t.departmentId}`})`, t.branchId),
    }))
    .sort(byName)

  return { branches, administrations, departments, teams }
}

/**
 * اختيار مستوى: بيتحط، والمستويات اللي تحته اللي مابقتش من اختياراته بتتشال (اختيار فرع تاني بيشيل إدارة الفرع القديم، واختيار
 * إدارة بيشيل قسم مش تحتها…). حساب الفرع الواحد فرعه ثابت مهما اتبعت.
 */
export function updateOrgFilter(
  context: OrgFilterContext | null,
  value: OrgFilterValue,
  level: OrgFilterLevel,
  id: number | null,
  lockedBranchId: number | null = null
): OrgFilterValue {
  const next: OrgFilterValue = { ...value }
  if (level === 'branch') next.branchId = id
  if (level === 'administration') next.administrationId = id
  if (level === 'department') next.departmentId = id
  if (level === 'team') next.teamId = id
  if (lockedBranchId !== null) next.branchId = lockedBranchId
  const start = ORG_FILTER_LEVELS.indexOf(level) + 1
  for (const lower of ORG_FILTER_LEVELS.slice(start)) {
    const options = orgFilterOptions(context, next)
    if (lower === 'administration' && next.administrationId !== null && !options.administrations.some((o) => o.id === next.administrationId)) {
      next.administrationId = null
    }
    if (lower === 'department' && next.departmentId !== null && !options.departments.some((o) => o.id === next.departmentId)) {
      next.departmentId = null
    }
    if (lower === 'team' && next.teamId !== null && !options.teams.some((o) => o.id === next.teamId)) next.teamId = null
  }
  return next
}

/** البداية: فاضي، وحساب الفرع الواحد على فرعه. */
export const initialOrgFilter = (lockedBranchId: number | null = null): OrgFilterValue => ({ ...EMPTY_ORG_FILTER, branchId: lockedBranchId })

/** وصف الاختيار في سطر («فرع النصر ← إدارة المبيعات ← التجزئة ← فريق المعرض») — فاضي لو الفلتر مش شغال. */
export function describeOrgFilter(context: OrgFilterContext | null, value: OrgFilterValue, lockedBranchId: number | null = null): string {
  if (!orgFilterActive(value, lockedBranchId)) return ''
  const branch = value.branchId !== null ? context?.branches.find((b) => b.id === value.branchId)?.name ?? `فرع #${value.branchId}` : null
  const unit = (id: number | null) => (id === null ? null : context?.units.find((u) => u.id === id)?.name ?? `#${id}`)
  const team = value.teamId !== null ? context?.teams.find((t) => t.id === value.teamId)?.name ?? `فريق #${value.teamId}` : null
  return [branch, unit(value.administrationId), unit(value.departmentId), team].filter(Boolean).join(' ← ')
}
