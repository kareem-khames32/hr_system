// «تسري على» للعطلة الرسمية (طلب المالك 26 سبتمبر: «اقدر اخصص الاجازات الرسمية علي ناس معينه» — ترحيل 070).
// مرآة api/src/attendance/holiday-audience.ts: null = للكل، غير كده نفس قيمة منتقي الاستهداف الموحّد
// (الفرع كله / أقسام / فرق / موظفين من الفرع). الخادم هو اللي بيتحقق من الأرقام وبيحسب التقويم — هنا تحويل وعرض بس.
import type { OrgTarget } from '../components/OrgTargetPicker'
import type { StoredAudience } from './org-audience'

// B-ADD.2: excludeEmployeeIds = «الكل ماعدا…» (اختياري، ومش مع الموظفين بالاسم). «الإدارة» وحدة في شجرة الأقسام: رقمها في departmentIds
export type ApiHolidayAudience =
  | { level: 'branch'; branchId: number; excludeEmployeeIds?: number[] }
  | { level: 'departments'; branchId: number; departmentIds: number[]; excludeEmployeeIds?: number[] }
  | { level: 'teams'; branchId: number; teamIds: number[]; excludeEmployeeIds?: number[] }
  | { level: 'employees'; branchId: number; employeeIds: number[] }

const idValid = (id: unknown): id is number => typeof id === 'number' && Number.isSafeInteger(id) && id > 0 && id <= 2147483647
const idsValid = (ids: unknown): ids is number[] => Array.isArray(ids) && ids.length > 0 && ids.length <= 5000 && ids.every(idValid) && new Set(ids).size === ids.length
const LIST_KEY = { departments: 'departmentIds', teams: 'teamIds', employees: 'employeeIds' } as const

/** شكل «تسري على» سليم زي ما الخادم بيبعته (سياق التقويم وقائمة العطلات) — أي حاجة تانية مابتتقراش «للكل». */
export function isHolidayAudience(value: unknown): value is ApiHolidayAudience {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const row = value as Record<string, unknown>
  if (!idValid(row.branchId)) return false
  // B-ADD.2: المستثنين مفتاح اختياري (قايمة غير فاضية) على الفرع والأقسام والفرق بس
  const excluded = Object.prototype.hasOwnProperty.call(row, 'excludeEmployeeIds')
  if (excluded && (row.level === 'employees' || !idsValid(row.excludeEmployeeIds))) return false
  const keys = Object.keys(row).length - (excluded ? 1 : 0)
  if (row.level === 'branch') return keys === 2
  const key = LIST_KEY[row.level as keyof typeof LIST_KEY]
  return !!key && keys === 3 && idsValid(row[key])
}

// ===== B-ADD.2: «تسري على» ↔ الجمهور المحفوظ بتاع الحقل الموحد (OrgAudienceField) =====
const sorted = (values: unknown): number[] =>
  Array.isArray(values) ? [...new Set(values.map(Number).filter((n) => Number.isSafeInteger(n) && n > 0))].sort((a, b) => a - b) : []

/** عطلة (أو فترة إضافي) محفوظة ← قيمة الحقل الموحد. null = للكل */
export function storedOfHolidayAudience(audience: ApiHolidayAudience | null | undefined): StoredAudience | null {
  if (!audience) return null
  const branchId = audience.branchId
  if (audience.level === 'employees') return { mode: 'employees', ids: sorted(audience.employeeIds).map(String), where: { mode: 'branches', ids: [branchId] } }
  const exclude = sorted(audience.excludeEmployeeIds)
  const extra = exclude.length ? { exclude } : {}
  if (audience.level === 'branch') return { mode: 'all', ids: [], where: { mode: 'branches', ids: [branchId] }, ...extra }
  if (audience.level === 'departments') return { mode: 'all', ids: [], where: { mode: 'units', ids: sorted(audience.departmentIds), branchId }, ...extra }
  return { mode: 'all', ids: [], where: { mode: 'teams', ids: sorted(audience.teamIds), branchId }, ...extra }
}

export type HolidayAudienceInput =
  | { level: 'company'; excludeEmployeeIds?: number[] }
  | { level: 'branch' | 'departments' | 'teams' | 'employees'; branchId: number; departmentIds?: number[]; teamIds?: number[]; employeeIds?: number[]; excludeEmployeeIds?: number[] }

/** قيمة الحقل الموحد ← اللي بيتبعت للخادم («تسري على»). null = للكل؛ undefined = شكل مش من أشكال العطلة (أكتر من فرع مثلًا) */
export function holidayInputOfStored(audience: StoredAudience | null | undefined): HolidayAudienceInput | null | undefined {
  if (!audience) return null
  const exclude = sorted(audience.exclude)
  const extra = exclude.length ? { excludeEmployeeIds: exclude } : {}
  const where = audience.where ?? null
  const ids = sorted(where?.ids)
  if (audience.mode === 'employees') {
    return where?.mode === 'branches' && ids.length === 1 ? { level: 'employees', branchId: ids[0], employeeIds: sorted(audience.ids) } : undefined
  }
  if ((audience.mode ?? 'all') !== 'all') return undefined
  if (!where || !ids.length) return exclude.length ? { level: 'company', ...extra } : null
  if (where.mode === 'branches') return ids.length === 1 ? { level: 'branch', branchId: ids[0], ...extra } : undefined
  const branchId = Number(where.branchId)
  if (!Number.isSafeInteger(branchId) || branchId <= 0) return undefined
  if (where.mode === 'units') return { level: 'departments', branchId, departmentIds: ids, ...extra }
  if (where.mode === 'teams') return { level: 'teams', branchId, teamIds: ids, ...extra }
  return undefined
}

/** قيمة المنتقي لعطلة محفوظة: بلا تخصيص = الشركة كلها. */
export function holidayAudienceToTarget(audience: ApiHolidayAudience | null | undefined): OrgTarget {
  const base: OrgTarget = { level: 'company', branchId: null, departmentIds: [], teamIds: [], employeeIds: [] }
  if (!audience) return base
  if (audience.level === 'branch') return { ...base, level: 'branch', branchId: audience.branchId }
  if (audience.level === 'departments') return { ...base, level: 'departments', branchId: audience.branchId, departmentIds: [...audience.departmentIds] }
  if (audience.level === 'teams') return { ...base, level: 'teams', branchId: audience.branchId, teamIds: [...audience.teamIds] }
  return { ...base, level: 'employees', branchId: audience.branchId, employeeIds: [...audience.employeeIds] }
}

/** اختيار ناقص: فرع من غير ما يتحدد، أو مستوى أقسام/فرق/موظفين من غير ولا واحد. */
export function holidayTargetIncomplete(target: OrgTarget): boolean {
  if (target.level === 'company') return false
  if (target.branchId == null) return true
  if (target.level === 'departments') return target.departmentIds.length === 0
  if (target.level === 'teams') return (target.teamIds ?? []).length === 0
  if (target.level === 'employees') return target.employeeIds.length === 0
  return false
}

/** اللي بيتبعت للخادم: الشركة كلها = null (للكل)، غير كده قائمة المستوى المختار بس. */
export function holidayTargetToAudience(target: OrgTarget): ApiHolidayAudience | null {
  if (target.level === 'company' || target.branchId == null) return null
  const branchId = target.branchId
  if (target.level === 'departments') return { level: 'departments', branchId, departmentIds: [...new Set(target.departmentIds)].sort((a, b) => a - b) }
  if (target.level === 'teams') return { level: 'teams', branchId, teamIds: [...new Set(target.teamIds ?? [])].sort((a, b) => a - b) }
  if (target.level === 'employees') return { level: 'employees', branchId, employeeIds: [...new Set(target.employeeIds)].sort((a, b) => a - b) }
  return { level: 'branch', branchId }
}

// «قسم واحد» / «قسمين» / «3 أقسام» / «11 قسم» — نفس لغة الشاشات
const counted = (count: number, forms: [string, string, string, string]) =>
  count === 1 ? forms[0] : count === 2 ? forms[1] : count <= 10 ? `${count} ${forms[2]}` : `${count} ${forms[3]}`
export const departmentsCount = (count: number) => counted(count, ['قسم واحد', 'قسمين', 'أقسام', 'قسم'])
export const teamsCount = (count: number) => counted(count, ['فريق واحد', 'فريقين', 'فرق', 'فريق'])
export const employeesCount = (count: number) => counted(count, ['موظف واحد', 'موظفين اتنين', 'موظفين', 'موظف'])

export interface HolidayAudienceNames {
  branches?: Array<{ id: number; name: string }>
  departments?: Array<{ id: number; name: string }>
  teams?: Array<{ id: number; name: string }>
}

// «فرع المعادي» من اسم «المعادي» أو «فرع المعادي» — من غير «فرع فرع»
const prefixed = (word: string, name: string) => (name.startsWith(word) ? name : `${word} ${name}`)

/**
 * وصف قصير: «للكل» / «فرع المعادي» / «فرع المعادي — قسم المبيعات» / «فرع المعادي — أقسام: المبيعات، المخازن» / «3 موظفين».
 * من غير أسماء (ملخص نسخة التقويم): بالعدد — «فرع كامل» / «قسمين» / «فريق واحد».
 */
export function describeHolidayAudience(audience: ApiHolidayAudience | null | undefined, names: HolidayAudienceNames = {}): string {
  if (!audience) return 'للكل'
  if (audience.level === 'employees') return employeesCount(audience.employeeIds.length)
  // B-ADD.2: المستثنين في آخر الوصف
  const except = audience.excludeEmployeeIds?.length ? ` (ماعدا ${employeesCount(audience.excludeEmployeeIds.length)})` : ''
  const named = names.branches?.find(b => b.id === audience.branchId)?.name?.trim()
  if (!names.branches) {
    return `${audience.level === 'branch' ? 'فرع كامل' : audience.level === 'departments' ? departmentsCount(audience.departmentIds.length) : teamsCount(audience.teamIds.length)}${except}`
  }
  const branch = named ? prefixed('فرع', named) : `فرع #${audience.branchId}`
  if (audience.level === 'branch') return `${branch}${except}`
  const list = (ids: number[], rows: Array<{ id: number; name: string }> | undefined, word: string, plural: string) => {
    const shown = ids.slice(0, 3).map(id => rows?.find(row => row.id === id)?.name?.trim() || `#${id}`)
    if (ids.length === 1) return prefixed(word, shown[0])
    return `${plural}: ${shown.join('، ')}${ids.length > 3 ? ` و${ids.length - 3} غيرهم` : ''}`
  }
  if (audience.level === 'departments') return `${branch} — ${list(audience.departmentIds, names.departments, 'قسم', 'أقسام')}${except}`
  return `${branch} — ${list(audience.teamIds, names.teams, 'فريق', 'فرق')}${except}`
}
