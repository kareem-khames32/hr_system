import { BadRequestException } from '@nestjs/common'

// فلتر «الفرع ← الإدارة ← القسم ← الفريق» الموحد في الخادم (طلب المالك 30 سبتمبر) — للشاشات اللي بتتفلتر أو بتترقّم أو بتتجمّع هنا.
// الواجهة (src/lib/org-filter.ts) بتبعت الفرع المختار (branchId)، والإدارة/القسم المختار بأقسامه الفرعية جوه فرعه (departmentIds=3,4,5)،
// والفريق (teamId). ده تضييق فوق نطاق فروع الحساب مش بديل عنه: المنادي بيطبّق النطاق الأول، فأي رقم برّه النطاق بيرجّع صفر صفوف
// ومابيكشفش حاجة.

export interface OrgFilterInput {
  branchId?: unknown
  departmentIds?: unknown
  teamId?: unknown
}

export interface OrgFilter {
  branchId: number | null
  departmentIds: number[] | null
  teamId: number | null
}

// أقسام الإدارة المختارة بفروعها — حد معقول تحت حد معاملات SQL Server (2100)
export const ORG_FILTER_MAX_UNITS = 500

export const EMPTY_ORG_FILTER: OrgFilter = { branchId: null, departmentIds: null, teamId: null }

const positiveId = (value: unknown, message: string): number | null => {
  if (value === undefined || value === null || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(String(value).trim())
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new BadRequestException(message)
  return parsed
}

/** قراءة الفلتر من الاستعلام: branchId وteamId رقم موجب، وdepartmentIds أرقام موجبة بفاصلة (أو مصفوفة). قيمة غلط = 400 برسالة واضحة. */
export function parseOrgFilter(input: OrgFilterInput | null | undefined): OrgFilter {
  const raw = input ?? {}
  const branchId = positiveId(raw.branchId, 'رقم الفرع غير صالح')
  const teamId = positiveId(raw.teamId, 'رقم الفريق غير صالح')
  let departmentIds: number[] | null = null
  if (raw.departmentIds !== undefined && raw.departmentIds !== null && raw.departmentIds !== '') {
    const parts = (Array.isArray(raw.departmentIds) ? raw.departmentIds : String(raw.departmentIds).split(','))
      .map((part) => (typeof part === 'string' ? part.trim() : part))
      .filter((part) => part !== '')
    if (parts.length === 0) throw new BadRequestException('الأقسام المختارة غير صالحة')
    const ids = new Set<number>()
    for (const part of parts) ids.add(positiveId(part, 'الأقسام المختارة غير صالحة') as number)
    if (ids.size > ORG_FILTER_MAX_UNITS) throw new BadRequestException(`الأقسام المختارة أكتر من ${ORG_FILTER_MAX_UNITS}`)
    departmentIds = [...ids].sort((a, b) => a - b)
  }
  return { branchId, departmentIds, teamId }
}

export const orgFilterIsEmpty = (filter: OrgFilter): boolean =>
  filter.branchId === null && filter.departmentIds === null && filter.teamId === null

/** مطابقة صف محمّل في الذاكرة بمكانه (فرعه وقسمه وفريقه). */
export function orgFilterMatches(
  row: { branchId?: number | null; departmentId?: number | null; teamId?: number | null },
  filter: OrgFilter
): boolean {
  if (filter.branchId !== null && (row.branchId ?? null) !== filter.branchId) return false
  if (filter.departmentIds !== null && (row.departmentId == null || !filter.departmentIds.includes(Number(row.departmentId)))) return false
  if (filter.teamId !== null && (row.teamId ?? null) !== filter.teamId) return false
  return true
}

/**
 * شروط SQL خام بمعاملات موضعية (@0, @1 …) زي branchScopeSql: الأرقام بتتضاف لآخر params والشروط بترجع بأرقامها — عمرها ما بتتلزق
 * في نص الاستعلام. columns = أعمدة الفرع والقسم والفريق في الاستعلام. مفيش فلتر = مصفوفة فاضية.
 */
export function orgFilterSql(
  columns: { branch: string; department: string; team: string },
  filter: OrgFilter,
  params: unknown[]
): string[] {
  const clauses: string[] = []
  if (filter.branchId !== null) clauses.push(`${columns.branch} = @${params.push(filter.branchId) - 1}`)
  if (filter.departmentIds !== null) {
    clauses.push(`${columns.department} IN (${filter.departmentIds.map((id) => `@${params.push(id) - 1}`).join(', ')})`)
  }
  if (filter.teamId !== null) clauses.push(`${columns.team} = @${params.push(filter.teamId) - 1}`)
  return clauses
}

/**
 * نفس الشروط لـQueryBuilder بمعاملات مسمّاة: [شرط، معاملات] لكل مستوى مختار.
 * الاستخدام: `for (const [clause, params] of orgFilterQb(filter, { branch: 'e.branchId', … })) qb.andWhere(clause, params)`
 */
export function orgFilterQb(
  filter: OrgFilter,
  columns: { branch: string; department: string; team: string },
  prefix = 'orgFilter'
): Array<[string, Record<string, unknown>]> {
  const clauses: Array<[string, Record<string, unknown>]> = []
  if (filter.branchId !== null) clauses.push([`${columns.branch} = :${prefix}BranchId`, { [`${prefix}BranchId`]: filter.branchId }])
  if (filter.departmentIds !== null) {
    clauses.push([`${columns.department} IN (:...${prefix}DepartmentIds)`, { [`${prefix}DepartmentIds`]: filter.departmentIds }])
  }
  if (filter.teamId !== null) clauses.push([`${columns.team} = :${prefix}TeamId`, { [`${prefix}TeamId`]: filter.teamId }])
  return clauses
}
