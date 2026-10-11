import { BadRequestException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { branchLocalParentOfRows } from './department-tree'

// B-ADD.1 (إضافات المالك 11 أكتوبر): الاستهداف الموحد — «على مين؟» بترتيب واحد في كل النظام:
//   الشركة كلها ← فرع ← إدارة ← قسم ← فريق ← موظفين بالاسم، ومعاه استثناء («الكل ماعدا…»).
// الحكم على مكان الموظف من الجمهور في دالة واحدة (isMember): بيناديها مقيّم «مين + فين» (الإعلانات، السياسات، قاعدة المعرفة،
// الاستبيانات، تفعيل الموديولات…) لأوضاعه الهيكلية، ومطابق العطلات الرسمية، وفترات الإضافي.
// «الإدارة» صف في جدول الأقسام (unitType = ADMINISTRATION) على نفس الشجرة: اختيار إدارة أو قسم بيشمل الوحدات اللي تحته جوه فرعه
// (departmentPath = قسم الموظف واللي فوقه جوه فرعه — org/department-tree). القديم اللي بيطابق برقم القسم بالحرف زي ما هو:
// المنادي بيبعت مسار فيه قسم الموظف بس.

export const ORG_TARGET_LEVELS = ['company', 'branch', 'administrations', 'departments', 'teams', 'employees'] as const
export type OrgTargetLevel = typeof ORG_TARGET_LEVELS[number]

/** جمهور بمستوى واحد. branchIds: فروع مستوى «فرع»، وللمستويات اللي تحته فرع الاختيار (فاضية = من غير قيد فرع). */
export interface OrgTarget {
  level: OrgTargetLevel
  branchIds: readonly number[]
  /** أرقام الإدارات/الأقسام أو الفرق أو الموظفين حسب المستوى ([] للشركة والفرع) */
  ids: readonly number[]
  /** «الكل ماعدا…»: موظفين بالاسم برّه الجمهور مهما كان مستواه */
  excludeEmployeeIds?: readonly number[]
}

/** الموظف قدام الجمهور: فرعه، وقسمه واللي فوقه جوه فرعه، وفريقه. employeeId = null: فرع كامل مش موظف بعينه. */
export interface OrgMember {
  employeeId: number | null
  branchId: number | null
  departmentPath: readonly number[]
  teamId: number | null
  /** الفرع الحالي لقسم الموظف (ومساره كله جوه الفرع ده)، ولفريقه (فرع قسم الفريق) — بيتحكم بيهم لما فرع الاختيار متحدد */
  unitBranchId?: number | null
  teamBranchId?: number | null
}

/**
 * Codex P7A-B01: لما فرع الاختيار متحدد، الوحدة أو الفريق نفسه لازم يكون لسه تبعه دلوقتي — فريق اتنقل لقسم في فرع تاني مابقاش من
 * جمهور فرعه القديم حتى لو موظفه لسه في الفرع القديم. من غير معلومة عن فرع المرجع = مش عضو (القيد مايفتحش).
 */
const refInChosenBranch = (target: OrgTarget, branchId: number | null | undefined): boolean =>
  !target.branchIds.length || (branchId != null && target.branchIds.includes(branchId))

/** الموظف ده من الجمهور ده؟ من غير جمهور = الكل؛ ومن غير عضو = الجمهور المفتوح بس. */
export function isMember(target: OrgTarget | null | undefined, member: OrgMember | null | undefined): boolean {
  if (!target) return true
  if (!member) return false
  if (member.employeeId !== null && target.excludeEmployeeIds?.includes(member.employeeId)) return false
  if (target.level === 'company') return true
  // فرع الاختيار قيد على كل المستويات اللي تحته: وحدة أو فريق أو موظف اتنقل لفرع تاني مابقاش من جمهور فرعه القديم
  if (target.branchIds.length && (member.branchId === null || !target.branchIds.includes(member.branchId))) return false
  switch (target.level) {
    case 'branch': return target.branchIds.length > 0
    case 'administrations':
    case 'departments': return refInChosenBranch(target, member.unitBranchId) && member.departmentPath.some(id => target.ids.includes(id))
    case 'teams': return member.teamId !== null && target.ids.includes(member.teamId) && refInChosenBranch(target, member.teamBranchId)
    case 'employees': return member.employeeId !== null && target.ids.includes(member.employeeId)
    default: return false
  }
}

// ===== مسار القسم ومكان الموظف =====

/** القسم واللي فوقه (من غير لف لو الشجرة فيها دايرة). */
export function departmentPathFrom(departmentId: number | null | undefined, parentOf: (id: number) => number | null | undefined): number[] {
  const path: number[] = []
  for (let id = departmentId ?? null; id !== null && id !== undefined && !path.includes(id); id = parentOf(id) ?? null) path.push(id)
  return path
}

/** مكان الموظف في الهيكل قدام مقيّم الجمهور: مسار قسمه، والفرع الحالي لقسمه ولفريقه. */
export interface OrgPlace { departmentPath: readonly number[]; departmentBranchId: number | null; teamBranchId: number | null }
export type OrgPlaces = (row: { departmentId?: number | null; teamId?: number | null }) => OrgPlace

/**
 * أماكن الهيكل الحالية (قراءتين لجدولين صغيرين: الأقسام والفرق): مسار كل قسم جوه فرعه، وفرع كل قسم، وفرع كل فريق (فرع قسمه).
 * قسم أو فريق مش موجود = من غير فرع (مايطابقش جمهور فرع اختياره متحدد).
 */
export async function orgPlaces(em: EntityManager): Promise<OrgPlaces> {
  const num = (value: unknown) => (value == null ? null : Number(value))
  const departments: Array<{ id: number; parentId: number | null; branchId: number | null }> = await em.query('SELECT [id], [parentId], [branchId] FROM [departments]')
  const teams: Array<{ id: number; departmentId: number | null }> = await em.query('SELECT [id], [departmentId] FROM [teams]')
  const parentOf = branchLocalParentOfRows(departments.map(row => ({ id: Number(row.id), parentId: num(row.parentId), branchId: num(row.branchId) })))
  const branchOf = new Map(departments.map(row => [Number(row.id), num(row.branchId)]))
  const teamDepartment = new Map(teams.map(row => [Number(row.id), num(row.departmentId)]))
  const cache = new Map<number, number[]>()
  const pathOf = (id: number) => {
    let path = cache.get(id)
    if (!path) { path = departmentPathFrom(id, parentOf); cache.set(id, path) }
    return path
  }
  return (row) => {
    const departmentId = num(row.departmentId), teamId = num(row.teamId)
    const teamHome = teamId === null ? null : teamDepartment.get(teamId) ?? null
    return { departmentPath: departmentId === null ? [] : pathOf(departmentId), departmentBranchId: departmentId === null ? null : branchOf.get(departmentId) ?? null,
      teamBranchId: teamHome === null ? null : branchOf.get(teamHome) ?? null }
  }
}

/** مكان الموظف على موضوع المقيّم (من غير أماكن مقروءة = من غير إضافة: المطابقة بقسمه بس زي الشكل القديم). */
export const orgPlaceOf = (places: OrgPlaces | null | undefined, row: { departmentId?: number | null; teamId?: number | null } | null | undefined): Partial<OrgPlace> =>
  places && row ? places(row) : {}

// ===== إضافات شكل «مين + فين» المحفوظ (request-audience.ts) =====
//   where: { mode: 'units', ids, branchId }   ← إدارات أو أقسام من فرع، وكل واحدة بتشمل اللي تحتها جوه الفرع
//   where: { mode: 'teams', ids, branchId }   ← branchId اختياري: فرع الاختيار (الشكل القديم من غيره زي ما هو)
//   exclude: [أرقام موظفين]                    ← «الكل ماعدا…»
// الشكل القديم كله بيتحفظ بنفس نصه بالحرف (المفاتيح الجديدة بتتكتب لما تكون موجودة بس).

const positiveId = (value: unknown): number | null => {
  const id = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN
  return Number.isSafeInteger(id) && id > 0 && id <= 2147483647 ? id : null
}
export const AUDIENCE_EXCLUDE_MAX = 500

/** فرع الاختيار جوه «فين»: مطلوب للإدارات والأقسام (units)، واختياري للفرق، وممنوع في غيرهم. */
export function audienceWhereBranchId(where: { branchId?: unknown } | null | undefined, mode: string, label: string): number | null {
  const raw = where?.branchId
  if (raw === undefined || raw === null) {
    if (mode === 'units') throw new BadRequestException(`اختار الفرع اللي الإدارات أو الأقسام تبعه في ${label}`)
    return null
  }
  if (mode !== 'units' && mode !== 'teams') throw new BadRequestException(`${label} بصيغة غير صحيحة`)
  const id = positiveId(raw)
  if (id === null) throw new BadRequestException(`فرع ${label} غير صالح`)
  return id
}

/** قايمة «الكل ماعدا…»: أرقام موظفين مرتّبة ومن غير تكرار ([] = من غير استثناء). */
export function audienceExcludeIds(exclude: unknown, label: string): number[] {
  if (exclude === undefined || exclude === null) return []
  if (!Array.isArray(exclude) || exclude.length > AUDIENCE_EXCLUDE_MAX) throw new BadRequestException(`قايمة المستثنين في ${label} غير صالحة (${AUDIENCE_EXCLUDE_MAX} بالكتير)`)
  const ids = exclude.map(value => positiveId(value) ?? (() => { throw new BadRequestException(`رقم موظف مستثنى غير صالح في ${label}`) })())
  return [...new Set(ids)].sort((a, b) => a - b)
}

// ===== كاتب الجمهور للي بيتبني جديد على الاستهداف الموحد (المهمة الجماعية، تسجيل دورة…) =====
export const ORG_AUDIENCE_TEXT_MAX = 8000
const ORG_WHERE = ['company', 'branches', 'units', 'teams'] as const

/**
 * الجمهور بنفس شكل «مين + فين» المحفوظ، من اللي منتقي الاستهداف الموحد بيبعته بس: «مين» = الكل أو موظفين بالاسم، و«فين» = الشركة
 * كلها أو فروع أو إدارات/أقسام من فرع أو فرق من فرع، ومعاه المستثنين. null = الشركة كلها. أي شكل تاني (أدوار، شروط…) مرفوض.
 */
export function orgAudienceJson(audience: unknown, label: string): string | null {
  if (audience === null || audience === undefined) return null
  if (typeof audience !== 'object' || Array.isArray(audience)) throw new BadRequestException(`${label} بصيغة غير صحيحة`)
  const value = audience as StoredAudience & { conditions?: unknown }
  if (value.conditions != null) throw new BadRequestException(`${label} «على مين؟» بس — من غير شروط صفات`)
  const mode = String(value.mode ?? 'all')
  if (mode !== 'all' && mode !== 'employees') throw new BadRequestException(`اختيار «مين» في ${label} غير معروف`)
  const ids = mode === 'employees' ? [...new Set(idList(value.ids))].sort((a, b) => a - b).map(String) : []
  if (mode === 'employees' && !ids.length) throw new BadRequestException(`اختار الموظفين في ${label}`)
  const whereMode = String(value.where?.mode ?? 'company')
  if (!(ORG_WHERE as readonly string[]).includes(whereMode)) throw new BadRequestException(`اختيار «فين» في ${label} غير معروف`)
  const whereIds = [...new Set(idList(value.where?.ids))].sort((a, b) => a - b)
  if (whereMode !== 'company' && !whereIds.length) throw new BadRequestException(`اختار الفروع أو الإدارات أو الأقسام أو الفرق في ${label}`)
  const branchId = whereMode === 'company' ? null : audienceWhereBranchId(value.where, whereMode, label)
  const exclude = audienceExcludeIds(value.exclude, label)
  if (mode === 'all' && whereMode === 'company' && !exclude.length) return null
  const text = JSON.stringify({ mode, ids, where: whereMode === 'company' ? null : { mode: whereMode, ids: whereIds, ...(branchId !== null ? { branchId } : {}) },
    ...(exclude.length ? { exclude } : {}) })
  if (text.length > ORG_AUDIENCE_TEXT_MAX) throw new BadRequestException(`${label} أكبر من الحد`)
  return text
}

interface StoredAudience { mode?: unknown; ids?: unknown; where?: { mode?: unknown; ids?: unknown; branchId?: unknown } | null; exclude?: unknown }
const parsed = (audience: string | null | undefined): StoredAudience | null => {
  if (!audience) return null
  try {
    const value: unknown = JSON.parse(audience)
    return value && typeof value === 'object' && !Array.isArray(value) ? value as StoredAudience : null
  } catch { return null }
}
const idList = (value: unknown): number[] => Array.isArray(value) ? value.map(positiveId).filter((id): id is number => id !== null) : []
const inList = (values: unknown[], offset: number) => values.map((_, index) => `@${index + offset}`).join(', ')

/**
 * أرقام الجمهور الجديدة موجودة ومكانها صح: الإدارات/الأقسام تبع فرع الاختيار، والفرق (لما فرعها متحدد) فرق أقسامه، والمستثنين
 * موظفين موجودين. previous: الأرقام اللي كانت محفوظة قبل كده بتفضل مقبولة (وحدة اتعطّلت أو اتنقلت مابتوقفش تعديل عنوان).
 */
export async function assertAudienceTargets(em: EntityManager, audience: string | null | undefined, label: string, previous: string | null | undefined = null): Promise<void> {
  const value = parsed(audience)
  if (!value) return
  const before = parsed(previous)
  const where = value.where ?? null, mode = String(where?.mode ?? 'company')
  const branchId = positiveId(where?.branchId)
  const same = !!before?.where && String(before.where.mode ?? '') === mode && positiveId(before.where.branchId) === branchId
  const kept = new Set(same ? idList(before!.where!.ids) : [])
  const fresh = idList(where?.ids).filter(id => !kept.has(id))
  const check = async (sql: string, ids: number[], params: unknown[], message: string) => {
    for (let index = 0; index < ids.length; index += 500) {
      const chunk = ids.slice(index, index + 500)
      const rows: unknown[] = await em.query(sql.replace('$IDS', inList(chunk, params.length)), [...params, ...chunk])
      if (rows.length !== chunk.length) throw new BadRequestException(message)
    }
  }
  if (branchId !== null) {
    const [branch] = await em.query('SELECT [id] FROM [branches] WHERE [id] = @0', [branchId])
    if (!branch) throw new BadRequestException(`الفرع المختار في ${label} مش موجود`)
    if (mode === 'units') await check('SELECT [id] FROM [departments] WHERE [branchId] = @0 AND [id] IN ($IDS)', fresh, [branchId], `في إدارة أو قسم مختار في ${label} مش موجود أو مش تبع الفرع ده`)
    if (mode === 'teams') await check('SELECT t.[id] FROM [teams] t INNER JOIN [departments] d ON d.[id] = t.[departmentId] WHERE d.[branchId] = @0 AND t.[id] IN ($IDS)', fresh, [branchId], `في فريق مختار في ${label} مش موجود أو مش تبع الفرع ده`)
  }
  const keptOut = new Set(idList(before?.exclude))
  await check('SELECT [id] FROM [employees] WHERE [id] IN ($IDS)', idList(value.exclude).filter(id => !keptOut.has(id)), [], `في موظف مستثنى في ${label} مش موجود`)
}

/** الجمهور محتاج أماكن الهيكل: إدارات أو أقسام بأقسامها الفرعية، أو فرق فرع اختيارها متحدد (فرع الفريق الحالي جزء من الحكم)؟ */
export const audienceNeedsOrgPlaces = (audience: string | null | undefined): boolean => {
  const where = parsed(audience)?.where
  return where?.mode === 'units' || (where?.mode === 'teams' && where.branchId != null)
}

/** أماكن الهيكل لو واحد من الجماهير دي محتاجها، وإلا null (من غير قراءة). */
export async function orgPlacesFor(em: EntityManager, audiences: ReadonlyArray<string | null | undefined>): Promise<OrgPlaces | null> {
  return audiences.some(audienceNeedsOrgPlaces) ? orgPlaces(em) : null
}

/**
 * فرع الاختيار لجمهور محفوظ، لحكم نطاق حساب الفروع من غير قراءة: «فروع محددة» ← فروعها؛ إدارات/أقسام/فرق بفرع متحدد ← فرعها.
 * null = الجمهور مش متثبّت بفروع (كل الشركة، أو أقسام وفرق بالشكل القديم من غير فرع).
 */
export function audienceBranchIds(audience: string | null | undefined): number[] | null {
  const where = parsed(audience)?.where
  if (!where) return null
  if (where.mode === 'branches') { const ids = idList(where.ids); return ids.length ? ids : null }
  if (where.mode === 'units' || where.mode === 'teams') { const id = positiveId(where.branchId); return id === null ? null : [id] }
  return null
}
