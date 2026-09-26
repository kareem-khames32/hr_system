import { BadRequestException, ForbiddenException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { inBranchScope, scopeWord } from '../auth/guards'
import type { BranchScope } from '../auth/guards'

// «تسري على» للعطلة الرسمية (طلب المالك 26 سبتمبر: «اقدر اخصص الاجازات الرسمية علي ناس معينه» — ترحيل 070).
// NULL = للكل: السلوك القديم بالحرف لكل العطلات الموجودة. غير كده نفس ترتيب منتقي الاستهداف الموحّد:
//   الفرع كله ← أقسام من الفرع ← فرق من الفرع ← موظفين بالاسم.
// الشكل المخزن (public_holidays.audience وجوه نسخة التقويم العام) ثابت الترتيب ومرتب الأرقام عشان البصمة ماتتغيرش:
//   {"level":"branch","branchId":3}
//   {"level":"departments","branchId":3,"departmentIds":[5,6]}   ← القسم بيشمل أقسامه الفرعية
//   {"level":"teams","branchId":3,"teamIds":[9]}
//   {"level":"employees","branchId":3,"employeeIds":[11,12]}      ← الموظف برقمه مهما اتنقل
// فرع الأقسام/الفرق/الموظفين هو فرع الاختيار في المنتقي (للعرض والتعديل)؛ المطابقة نفسها بالقسم/الفريق/رقم الموظف.
// اللي مش مشمول بعطلة مخصصة اليوم ده عنده يوم عادي: شغل ← غياب لو مابصمش، والإجازة بتعدّه.
export const HOLIDAY_AUDIENCE_LEVELS = ['branch', 'departments', 'teams', 'employees'] as const
export type HolidayAudienceLevel = typeof HOLIDAY_AUDIENCE_LEVELS[number]
export type HolidayAudience =
  | { level: 'branch'; branchId: number }
  | { level: 'departments'; branchId: number; departmentIds: number[] }
  | { level: 'teams'; branchId: number; teamIds: number[] }
  | { level: 'employees'; branchId: number; employeeIds: number[] }
export const HOLIDAY_AUDIENCE_MAX_IDS = 5000
const LIST_KEYS = { departments: 'departmentIds', teams: 'teamIds', employees: 'employeeIds' } as const
type ListLevel = keyof typeof LIST_KEYS

const idOf = (value: unknown): number | null =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= 2147483647 ? value : null
const plain = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)

/** الأرقام المختارة لمستوى التخصيص ([] لمستوى الفرع كله). */
export function holidayAudienceIds(audience: HolidayAudience): number[] {
  if (audience.level === 'departments') return audience.departmentIds
  if (audience.level === 'teams') return audience.teamIds
  if (audience.level === 'employees') return audience.employeeIds
  return []
}

/** الشكل القانوني (المخزن والداخل في بصمة التقويم). null/undefined = للكل؛ أي شكل تاني غلط بيرفض بـfail. */
export function normalizeHolidayAudience(value: unknown, fail: (message: string) => never): HolidayAudience | null {
  if (value === null || value === undefined) return null
  if (!plain(value)) return fail('تخصيص العطلة غير صالح')
  const level = value.level
  if (typeof level !== 'string' || !(HOLIDAY_AUDIENCE_LEVELS as readonly string[]).includes(level)) return fail('مستوى تخصيص العطلة غير صالح')
  const listKey = level === 'branch' ? null : LIST_KEYS[level as ListLevel]
  const keys = ['level', 'branchId', ...(listKey ? [listKey] : [])]
  if (Object.keys(value).sort().join('|') !== [...keys].sort().join('|')) return fail('بنية تخصيص العطلة غير صالحة')
  const branchId = idOf(value.branchId) ?? fail('فرع تخصيص العطلة غير صالح')
  if (!listKey) return { level: 'branch', branchId }
  const raw = value[listKey]
  if (!Array.isArray(raw) || !raw.length || raw.length > HOLIDAY_AUDIENCE_MAX_IDS) return fail('قائمة تخصيص العطلة فاضية أو أطول من المسموح')
  const ids = raw.map(id => idOf(id) ?? fail('رقم في تخصيص العطلة غير صالح'))
  if (new Set(ids).size !== ids.length) return fail('رقم مكرر في تخصيص العطلة')
  ids.sort((a, b) => a - b)
  if (level === 'departments') return { level, branchId, departmentIds: ids }
  if (level === 'teams') return { level, branchId, teamIds: ids }
  return { level: 'employees', branchId, employeeIds: ids }
}

/** قيمة العمود public_holidays.audience: JSON بنفس ترتيب المفاتيح دايمًا، وNULL = للكل. */
export function holidayAudienceColumn(audience: HolidayAudience | null): string | null {
  return audience ? JSON.stringify(audience) : null
}

/** قراءة العمود: NULL = للكل؛ النص التالف مايتقراش «للكل» أبدًا (فشل مقفول). */
export function parseHolidayAudienceColumn(raw: unknown, fail: (message: string) => never): HolidayAudience | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw !== 'string' || raw.length > 200000) return fail('تخصيص العطلة المخزن غير صالح')
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return fail('تخصيص العطلة المخزن تالف') }
  if (parsed === null) return fail('تخصيص العطلة المخزن غير صالح')
  return normalizeHolidayAudience(parsed, fail)
}

export const sameHolidayAudience = (a: HolidayAudience | null, b: HolidayAudience | null) =>
  holidayAudienceColumn(a) === holidayAudienceColumn(b)

/**
 * «تسري على» من الشاشة (نفس قيمة منتقي الاستهداف): null أو level=company = للكل. غير كده الفرع مطلوب وقائمة المستوى
 * (أقسام/فرق/موظفين) واحد على الأقل؛ القوائم التانية بتتجاهل، والتكرار بيتشال.
 */
export function holidayAudienceFromInput(value: unknown): HolidayAudience | null {
  const bad = (message: string): never => { throw new BadRequestException(message) }
  if (value === null || value === undefined) return null
  if (!plain(value)) return bad('«تسري على» غير صالحة')
  if (value.level === 'company') return null
  if (typeof value.level !== 'string' || !(HOLIDAY_AUDIENCE_LEVELS as readonly string[]).includes(value.level)) {
    return bad('اختار العطلة تسري على مين: الكل أو فرع أو أقسام أو فرق أو موظفين')
  }
  const level = value.level as HolidayAudienceLevel
  const branchId = idOf(value.branchId) ?? bad('اختار الفرع اللي العطلة تسري عليه')
  if (level === 'branch') return { level, branchId }
  const listKey = LIST_KEYS[level]
  const label = level === 'departments' ? 'قسم' : level === 'teams' ? 'فريق' : 'موظف'
  const raw = value[listKey]
  if (!Array.isArray(raw) || !raw.length) return bad(`اختار ${label} واحد على الأقل تسري عليه العطلة`)
  if (raw.length > HOLIDAY_AUDIENCE_MAX_IDS) return bad(`أقصى عدد في التخصيص ${HOLIDAY_AUDIENCE_MAX_IDS}`)
  const ids = [...new Set(raw.map(id => idOf(id) ?? bad(`رقم ${label} في «تسري على» غير صالح`)))]
  return normalizeHolidayAudience({ level, branchId, [listKey]: ids }, bad)
}

// ===== المطابقة =====

/** مين بيتسأل عنه التقويم: موظف في يوم (فرعه المؤرخ وقسمه وفريقه في اليوم ده)، أو فرع كامل (employeeId = null). */
export interface HolidayAudienceMember {
  /** null = تقويم فرع كامل مش موظف بعينه: بيطابق عطلة «الفرع كله» بتاعته بس */
  employeeId: number | null
  branchId: number | null
  /** قسم الموظف في اليوم ده وأقسامه الأعلى — عطلة القسم بتشمل أقسامه الفرعية */
  departmentPath: readonly number[]
  teamId: number | null
}

/** العطلة دي تخص العضو ده؟ بلا تخصيص = للكل؛ بلا عضو (التقويم العام) = عطلات الكل بس. */
export function holidayAudienceMatches(audience: HolidayAudience | null | undefined, member: HolidayAudienceMember | null | undefined): boolean {
  if (!audience) return true
  if (!member) return false
  if (audience.level === 'branch') return member.branchId !== null && member.branchId === audience.branchId
  // الأقسام والفرق والموظفين بالاسم مابيغطوش فرع كامل — لموظف بعينه بس
  if (member.employeeId === null) return false
  if (audience.level === 'employees') return audience.employeeIds.includes(member.employeeId)
  if (audience.level === 'teams') return member.teamId !== null && audience.teamIds.includes(member.teamId)
  return member.departmentPath.some(id => audience.departmentIds.includes(id))
}

/** عطلة لأقسام أو فرق: حكمها محتاج قسم الموظف وفريقه في اليوم نفسه. */
export const holidayAudienceNeedsOrg = (audience: HolidayAudience | null | undefined) =>
  audience?.level === 'departments' || audience?.level === 'teams'

/** القسم وأقسامه الأعلى (من غير لف لو الشجرة فيها دايرة). */
export function departmentPathOf(departmentId: number | null | undefined, parentOf: (id: number) => number | null | undefined): number[] {
  const path: number[] = []
  for (let id = departmentId ?? null; id !== null && id !== undefined && !path.includes(id); id = parentOf(id) ?? null) path.push(id)
  return path
}

/**
 * مكان الموظف الحالي لعرض العطلات اللي تخصه (شاشة التقويم وقائمة العطلات للموظف العادي) — عرض بس مش حساب:
 * حساب الأيام نفسه من التقويم المؤرخ (resolveEmployeeCalendarDay).
 */
export async function currentHolidayAudienceMember(em: EntityManager, employeeId: number | null | undefined): Promise<HolidayAudienceMember | null> {
  const id = idOf(Number(employeeId))
  if (id === null) return null
  const rows: Array<{ branchId: number | null; departmentId: number | null; teamId: number | null }> =
    await em.query('SELECT [branchId], [departmentId], [teamId] FROM [employees] WHERE [id] = @0', [id])
  if (!rows.length) return null
  const parents = new Map<number, number | null>()
  if (rows[0].departmentId != null) {
    for (const row of await em.query('SELECT [id], [parentId] FROM [departments]') as Array<{ id: number; parentId: number | null }>) {
      parents.set(Number(row.id), row.parentId == null ? null : Number(row.parentId))
    }
  }
  const num = (value: unknown) => value == null ? null : Number(value)
  return { employeeId: id, branchId: num(rows[0].branchId), teamId: num(rows[0].teamId),
    departmentPath: departmentPathOf(num(rows[0].departmentId), dep => parents.get(dep)) }
}

// ===== الوصف =====

export interface HolidayAudienceNames {
  branches?: ReadonlyMap<number, string>
  departments?: ReadonlyMap<number, string>
  teams?: ReadonlyMap<number, string>
}

// «3 موظفين» / «موظف واحد» / «11 موظف» — نفس لغة الشاشات
const counted = (count: number, one: string, two: string, few: string, many: string) =>
  count === 1 ? one : count === 2 ? two : count <= 10 ? `${count} ${few}` : `${count} ${many}`

// «فرع المعادي» من اسم «المعادي» أو «فرع المعادي» — من غير «فرع فرع»
const prefixed = (word: string, name: string) => name.startsWith(word) ? name : `${word} ${name}`

/** وصف قصير: «للكل» / «فرع المعادي» / «فرع المعادي — قسم المبيعات» / «فرع المعادي — أقسام: المبيعات، المخازن» / «3 موظفين». */
export function describeHolidayAudience(audience: HolidayAudience | null, names: HolidayAudienceNames = {}): string {
  if (!audience) return 'للكل'
  const name = names.branches?.get(audience.branchId)?.trim()
  const branch = name ? prefixed('فرع', name) : `فرع #${audience.branchId}`
  if (audience.level === 'branch') return branch
  const list = (ids: number[], map: ReadonlyMap<number, string> | undefined, word: string, plural: string) => {
    const shown = ids.slice(0, 3).map(id => map?.get(id)?.trim() || `#${id}`)
    if (ids.length === 1) return prefixed(word, shown[0])
    return `${plural}: ${shown.join('، ')}${ids.length > 3 ? ` و${ids.length - 3} غيرهم` : ''}`
  }
  if (audience.level === 'departments') return `${branch} — ${list(audience.departmentIds, names.departments, 'قسم', 'أقسام')}`
  if (audience.level === 'teams') return `${branch} — ${list(audience.teamIds, names.teams, 'فريق', 'فرق')}`
  return counted(audience.employeeIds.length, 'موظف واحد', 'موظفين اتنين', 'موظفين', 'موظف')
}

/** أسماء الفروع والأقسام والفرق للوصف (جداول صغيرة). */
export async function holidayAudienceNames(em: EntityManager): Promise<Required<HolidayAudienceNames>> {
  const map = async (table: 'branches' | 'departments' | 'teams') => new Map<number, string>(
    (await em.query(`SELECT [id], [name] FROM [${table}]`) as Array<{ id: number; name: string }>).map(row => [Number(row.id), String(row.name ?? '')]))
  return { branches: await map('branches'), departments: await map('departments'), teams: await map('teams') }
}

// ===== التحقق وقت الحفظ =====

const inList = (values: unknown[], offset: number) => values.map((_, index) => `@${index + offset}`).join(', ')

/**
 * الأرقام الجديدة في التخصيص لازم تكون موجودة وتبع فرع الاختيار (أقسام الفرع، فرق أقسامه، موظفينه الحاليين) ومستواها
 * متسق. الأرقام اللي كانت محفوظة قبل كده في نفس المستوى ونفس الفرع بتفضل مقبولة (موظف اتنقل بعد العطلة مايوقفش تعديل
 * اسمها). النطاق: حساب الفرع مايخصصش خارج فروعه — وتعديل التقويم العام أصلًا لحساب على مستوى الشركة بس
 * (assertCalendarScope)، فده حزام تاني لو القاعدة دي اتغيرت.
 */
export async function assertHolidayAudienceTargets(em: EntityManager, audience: HolidayAudience | null, scope: BranchScope,
  previous: HolidayAudience | null = null): Promise<void> {
  if (!audience) {
    if (scope !== null) throw new ForbiddenException('العطلة اللي للكل بتتحط من حساب على مستوى الشركة بس')
    return
  }
  if (!inBranchScope(scope, audience.branchId)) throw new ForbiddenException(`صلاحيتك على ${scopeWord(scope)} بس`)
  const [branch] = await em.query('SELECT [id] FROM [branches] WHERE [id] = @0', [audience.branchId])
  if (!branch) throw new BadRequestException('الفرع اللي العطلة تسري عليه مش موجود')
  if (audience.level === 'branch') return
  const kept = previous && previous.level === audience.level && previous.branchId === audience.branchId ? new Set(holidayAudienceIds(previous)) : new Set<number>()
  const fresh = holidayAudienceIds(audience).filter(id => !kept.has(id))
  const sql = audience.level === 'departments' ? 'SELECT [id] FROM [departments] WHERE [branchId] = @0 AND [id] IN ($IDS)'
    : audience.level === 'teams' ? 'SELECT t.[id] FROM [teams] t INNER JOIN [departments] d ON d.[id] = t.[departmentId] WHERE d.[branchId] = @0 AND t.[id] IN ($IDS)'
      : 'SELECT [id] FROM [employees] WHERE [branchId] = @0 AND [id] IN ($IDS)'
  const label = audience.level === 'departments' ? 'قسم' : audience.level === 'teams' ? 'فريق' : 'موظف'
  for (let index = 0; index < fresh.length; index += 500) {
    const chunk = fresh.slice(index, index + 500)
    const rows: Array<{ id: number }> = await em.query(sql.replace('$IDS', inList(chunk, 1)), [audience.branchId, ...chunk])
    if (rows.length !== chunk.length) throw new BadRequestException(`في ${label} مختار مش موجود أو مش تبع الفرع ده`)
  }
}
