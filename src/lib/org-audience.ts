// B-ADD.1 (إضافات المالك 11 أكتوبر): الاستهداف الموحد — «على مين؟» بنفس الترتيب في كل شاشة بتحدد جمهور:
// الشركة كلها ← فرع ← إدارة ← قسم ← فريق ← موظفين بالاسم، ومعاه «الكل ماعدا…» ومعاينة «N موظف» بالأسماء قبل الحفظ.
// الملف ده بيحوّل بين قيمة المنتقي (OrgTargetPicker) وشكل الجمهور المحفوظ «مين + فين» (api/src/requests/request-audience.ts)،
// وبيجيب شجرة نطاق الحساب والمعاينة من الخادم. الحكم والنطاق في الخادم؛ هنا تسهيل الاختيار والعرض.
import { apiFetch } from './api'
import type { OrgPickerDepartment, OrgPickerEmployee, OrgPickerTeam, OrgTarget } from '../components/OrgTargetPicker'

export interface StoredAudience {
  mode?: string
  ids?: Array<number | string>
  where?: { mode?: string; ids?: Array<number | string>; branchId?: number | string | null } | null
  exclude?: Array<number | string> | null
  conditions?: unknown
}

export interface OrgAudienceContext {
  branches: Array<{ id: number; name: string }>
  /** listed = false (B-ADD.18، شجرة المدير): قسم فريق بيقوده من غير ما يدير القسم — بيتعرض عشان الفريق يظهر تحته، ومش من اختياراته */
  units: Array<{ id: number; name: string; branchId: number; parentId: number | null; unitType: 'ADMINISTRATION' | 'DEPARTMENT'; isExecutive: boolean; listed?: boolean }>
  teams: Array<{ id: number; name: string; departmentId: number; branchId: number }>
  employees: Array<{ id: number; branchId: number | null; departmentId: number | null; teamId: number | null; fullName: string; employeeCode: string | null }>
}
export interface AudiencePreview {
  count: number
  employees: Array<{ id: number; employeeCode: string | null; fullName: string; branchId: number | null; departmentId: number | null; teamId: number | null }>
  truncated: boolean
}

export const fetchOrgAudienceContext = () => apiFetch<OrgAudienceContext>('/org/audience-context')
export const previewOrgAudience = (audience: StoredAudience | null) =>
  apiFetch<AudiencePreview>('/org/audience-preview', { method: 'POST', body: JSON.stringify({ audience }) })

/**
 * B-ADD.18: مصدر تاني لشجرة المنتقي ومعاينته بدل شجرة نطاق الفروع — «اللي تحتي في الهيكل» للمهمة الجماعية من المدير. المنتقي بيعرض اللي
 * المصدر رجّعه بس (من غير «الشركة كلها»)، والخادم هو اللي بيحكم.
 */
export interface OrgAudienceSource {
  context: () => Promise<OrgAudienceContext>
  preview: (audience: StoredAudience | null) => Promise<AudiencePreview>
}

// قوايم المنتقي من سياق الخادم
export const pickerDepartments = (context: OrgAudienceContext): OrgPickerDepartment[] =>
  // وحدة مش من اختيارات المنتقي (listed = false) بتتبعت «مش نشطة»: المنتقي بيخبّيها من قوايم الإدارات والأقسام وفلترها، وفرقها بتفضل ظاهرة
  context.units.map((u) => ({ id: u.id, name: u.name, branchId: u.branchId, parentId: u.parentId, unitType: u.unitType, ...(u.listed === false ? { isActive: false } : {}) }))
export const pickerTeams = (context: OrgAudienceContext): OrgPickerTeam[] => context.teams.map((t) => ({ id: t.id, name: t.name, departmentId: t.departmentId }))
export const pickerEmployees = (context: OrgAudienceContext): OrgPickerEmployee[] =>
  context.employees.map((e) => ({ id: e.id, fullName: e.fullName, employeeCode: e.employeeCode ?? undefined, branchId: e.branchId, departmentId: e.departmentId, teamId: e.teamId }))

const numbers = (values: unknown): number[] =>
  Array.isArray(values) ? [...new Set(values.map(Number).filter((n) => Number.isSafeInteger(n) && n > 0))].sort((a, b) => a - b) : []

/** «مين» من شاشة فيها اختيار أدوار/مناصب (السياسات والموديولات): الاستهداف الموحد بيحدد «فين» والاستثناء بس */
export interface AudienceWho { mode: string; ids: string[] }

/** الاختيار مكتمل؟ (فرع متحدد، وواحد على الأقل في مستوى القوايم) */
export function orgTargetComplete(target: OrgTarget): boolean {
  if (target.level === 'company') return true
  if (target.branchId == null) return false
  if (target.level === 'branch') return true
  if (target.level === 'administrations') return (target.administrationIds ?? []).length > 0
  if (target.level === 'departments') return target.departmentIds.length > 0
  if (target.level === 'teams') return (target.teamIds ?? []).length > 0
  return target.employeeIds.length > 0
}

/** قيمة المنتقي ← الجمهور المحفوظ. null = الشركة كلها من غير استثناء. الاختيار الناقص = undefined. */
export function audienceOfOrgTarget(target: OrgTarget, exclude: number[] = [], who: AudienceWho | null = null): StoredAudience | null | undefined {
  if (!orgTargetComplete(target)) return undefined
  const out = numbers(exclude)
  const base = who && who.mode !== 'all' ? { mode: who.mode, ids: [...who.ids].sort() } : { mode: 'all', ids: [] as string[] }
  const extra = out.length ? { exclude: out } : {}
  if (target.level === 'company') return base.mode === 'all' && !out.length ? null : { ...base, where: null, ...extra }
  const branchId = target.branchId as number
  if (target.level === 'branch') return { ...base, where: { mode: 'branches', ids: [branchId] }, ...extra }
  if (target.level === 'administrations') return { ...base, where: { mode: 'units', ids: numbers(target.administrationIds), branchId }, ...extra }
  if (target.level === 'departments') return { ...base, where: { mode: 'units', ids: numbers(target.departmentIds), branchId }, ...extra }
  if (target.level === 'teams') return { ...base, where: { mode: 'teams', ids: numbers(target.teamIds), branchId }, ...extra }
  // موظفين بالاسم من فرع الاختيار: «مين» = الموظفين دول و«فين» = فرعهم (اللي يتنقل لفرع تاني يخرج من جمهور فرعه القديم)
  return { mode: 'employees', ids: numbers(target.employeeIds).map(String), where: { mode: 'branches', ids: [branchId] } }
}

/** أكتر من فرع كامل (اختيار الفروع بعلامات صح) ← الجمهور المحفوظ */
export function audienceOfBranches(branchIds: number[], exclude: number[] = [], who: AudienceWho | null = null): StoredAudience | undefined {
  const ids = numbers(branchIds)
  if (!ids.length) return undefined
  const out = numbers(exclude)
  const base = who && who.mode !== 'all' ? { mode: who.mode, ids: [...who.ids].sort() } : { mode: 'all', ids: [] as string[] }
  return { ...base, where: { mode: 'branches', ids }, ...(out.length ? { exclude: out } : {}) }
}

export type AudienceShape =
  | { kind: 'target'; target: OrgTarget; exclude: number[] }
  | { kind: 'branches'; branchIds: number[]; exclude: number[] }
  // جمهور محفوظ بشكل المنتقي مايعرضوش (أقسام أو فرق بالشكل القديم من غير فرع، شروط صفات…): بيتعرض بوصفه ويتساب زي ما هو لحد ما يتغيّر
  | { kind: 'other' }

const emptyTarget = (level: OrgTarget['level'], branchId: number | null): OrgTarget =>
  ({ level, branchId, departmentIds: [], teamIds: [], employeeIds: [], administrationIds: [] })

/** الجمهور المحفوظ ← قيمة المنتقي (جزء «فين» والاستثناء؛ «مين» بالأدوار/المناصب بيفضل عند شاشته). */
export function shapeOfAudience(audience: StoredAudience | null | undefined, context: OrgAudienceContext): AudienceShape {
  if (!audience) return { kind: 'target', target: emptyTarget('company', null), exclude: [] }
  if (audience.conditions != null || audience.mode === 'departments') return { kind: 'other' }
  const exclude = numbers(audience.exclude)
  const where = audience.where ?? null
  const whereIds = numbers(where?.ids)
  if (audience.mode === 'employees') {
    const ids = numbers(audience.ids)
    const branches = where?.mode === 'branches' ? whereIds : where ? [] : [...new Set(ids.map((id) => context.employees.find((e) => e.id === id)?.branchId).filter((b): b is number => b != null))]
    if (branches.length !== 1 || (where && where.mode !== 'branches')) return { kind: 'other' }
    return { kind: 'target', target: { ...emptyTarget('employees', branches[0]), employeeIds: ids }, exclude: [] }
  }
  if (!where || where.mode === 'company' || !whereIds.length) return { kind: 'target', target: emptyTarget('company', null), exclude }
  if (where.mode === 'branches') {
    return whereIds.length === 1 ? { kind: 'target', target: emptyTarget('branch', whereIds[0]), exclude } : { kind: 'branches', branchIds: whereIds, exclude }
  }
  const branchId = Number(where.branchId)
  if (!Number.isSafeInteger(branchId) || branchId <= 0) return { kind: 'other' }
  if (where.mode === 'teams') return { kind: 'target', target: { ...emptyTarget('teams', branchId), teamIds: whereIds }, exclude }
  if (where.mode === 'units') {
    const administrations = whereIds.every((id) => context.units.find((u) => u.id === id)?.unitType === 'ADMINISTRATION')
    return administrations ? { kind: 'target', target: { ...emptyTarget('administrations', branchId), administrationIds: whereIds }, exclude }
      : { kind: 'target', target: { ...emptyTarget('departments', branchId), departmentIds: whereIds }, exclude }
  }
  return { kind: 'other' }
}

/** وصف قصير لجمهور محفوظ (للقوايم): «الشركة كلها» / «فرع المعادي» / «فرع المعادي — إدارات: المبيعات» / «3 موظفين»… */
export function describeAudience(audience: StoredAudience | null | undefined, context: OrgAudienceContext | null): string {
  if (!audience) return 'الشركة كلها'
  const exclude = numbers(audience.exclude)
  const suffix = exclude.length ? ` (ماعدا ${exclude.length})` : ''
  const where = audience.where ?? null
  const ids = numbers(where?.ids)
  const name = <T extends { id: number; name: string }>(list: T[] | undefined, id: number, word: string) => list?.find((row) => row.id === id)?.name ?? `${word} #${id}`
  const branch = (id: number) => name(context?.branches, id, 'فرع')
  const who = audience.mode === 'roles' ? 'أدوار محددة' : audience.mode === 'positions' ? 'حسب المنصب' : audience.mode === 'employees' ? `${numbers(audience.ids).length} موظف بالاسم` : ''
  let place = 'الشركة كلها'
  if (where && ids.length) {
    if (where.mode === 'branches') place = ids.map(branch).join('، ')
    else if (where.mode === 'units') place = `${where.branchId ? `${branch(Number(where.branchId))} — ` : ''}${ids.map((id) => name(context?.units, id, 'وحدة')).join('، ')}`
    else if (where.mode === 'teams') place = `${where.branchId ? `${branch(Number(where.branchId))} — ` : ''}فرق: ${ids.map((id) => name(context?.teams, id, 'فريق')).join('، ')}`
    else if (where.mode === 'departments') place = `أقسام: ${ids.map((id) => name(context?.units, id, 'قسم')).join('، ')}`
  }
  return `${who ? `${who} — ` : ''}${place}${suffix}`
}
