import { BadRequestException, ConflictException, Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import type { DataSource } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, branchScopeSql, inBranchScope, type BranchScope } from '../auth/guards'
import { AUDIT_ACTOR_EMPLOYEE_KEY, AUDIT_CATEGORIES, AUDIT_CATEGORY_LABELS, AUDIT_EMPLOYEE_KEYS, AUDIT_HIDDEN_EMPLOYEE, AUDIT_MIGRATION_MISSING, AUDIT_RETENTION_DEFAULT,
  AUDIT_RETENTION_KEY, AUDIT_RETENTION_MIN,
  auditEmployeeKeys, auditTableReady, recordAudit, type AuditCategory } from './audit'

export interface AuditSearchQuery {
  category?: string; action?: string; actorUserId?: number; entityType?: string; entityId?: string
  from?: string; to?: string; q?: string; expired?: boolean; page?: number; pageSize?: number
}

/** أرقام الموظفين المعلَنة في تفاصيل الحدث (قبل وبعد)، كتعبيرات في استعلام البحث */
const declaredEmployeeIds = (keys: readonly string[]) => keys.flatMap(key => ['before', 'after'].map(side =>
  `TRY_CONVERT(int, CASE WHEN ISJSON(a.[${side}]) = 1 THEN JSON_VALUE(a.[${side}], '$.${key}') END)`)).join(', ')

/** مدة الاحتفاظ من الإعداد (شهور، 12 على الأقل) */
export function auditRetentionMonths(value: unknown): number {
  const months = Number(value)
  return Number.isInteger(months) && months >= AUDIT_RETENTION_MIN && months <= 1200 ? months : AUDIT_RETENTION_DEFAULT
}

/** أول لحظة جوه مدة الاحتفاظ (اللي قبلها «منتهي الاحتفاظ») */
export function auditRetentionStart(months: number, now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth() - months, now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds())
}

@Injectable()
export class AuditService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  /**
   * البحث في السجل بنطاق الحساب: حساب «كل الفروع» بيشوف الكل، وحساب الفروع بيشوف أحداث فروعه بس (أحداث الشركة — الإعدادات
   * والموديولات والأدوار — مالهاش فرع، فمابتظهرلوش). العادي = جوه مدة الاحتفاظ، وexpired = اللي عدّى المدة بس (تقرير «منتهي الاحتفاظ»).
   */
  async search(user: JwtPayload, query: AuditSearchQuery) {
    if (!(await auditTableReady(this.ds.manager))) throw new ConflictException({ code: 'AUDIT_MIGRATION_MISSING', message: AUDIT_MIGRATION_MISSING })
    const page = Number.isInteger(query.page) && Number(query.page) > 0 ? Number(query.page) : 1
    const pageSize = Number.isInteger(query.pageSize) && Number(query.pageSize) > 0 ? Math.min(Number(query.pageSize), 200) : 50
    const params: unknown[] = []
    const where: string[] = []
    const scope = branchScopeOf(user)
    if (scope !== null) where.push(branchScopeSql('a.[branchId]', scope, params))
    const [config] = await this.ds.query('SELECT [value] FROM [requests_config] WHERE [key] = @0', [AUDIT_RETENTION_KEY])
    const months = auditRetentionMonths(config?.value)
    params.push(auditRetentionStart(months))
    where.push(query.expired === true ? `a.[at] < @${params.length - 1}` : `a.[at] >= @${params.length - 1}`)
    if (query.category) {
      if (!(AUDIT_CATEGORIES as readonly string[]).includes(query.category)) throw new BadRequestException('فئة سجل التدقيق غير معروفة')
      params.push(query.category); where.push(`a.[category] = @${params.length - 1}`)
    }
    if (query.action) { params.push(query.action); where.push(`a.[action] = @${params.length - 1}`) }
    if (query.actorUserId) { params.push(Number(query.actorUserId)); where.push(`a.[actorUserId] = @${params.length - 1}${this.partyActorShown(scope, params)}`) }
    if (query.entityType) { params.push(query.entityType); where.push(`a.[entityType] = @${params.length - 1}`) }
    if (query.entityId) { params.push(String(query.entityId)); where.push(`a.[entityId] = @${params.length - 1}`) }
    for (const [value, op] of [[query.from, '>='], [query.to, '<']] as const) {
      if (!value) continue
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException('التاريخ بصيغة YYYY-MM-DD')
      params.push(op === '<' ? new Date(new Date(`${value}T00:00:00`).getTime() + 86_400_000) : new Date(`${value}T00:00:00`))
      where.push(`a.[at] ${op} @${params.length - 1}`)
    }
    if (query.q && query.q.trim()) {
      params.push(`%${query.q.trim().replace(/[%_[\]]/g, match => `[${match}]`)}%`)
      const like = params.length - 1
      where.push(`(a.[summary] LIKE @${like}${this.employeeNameMatch(scope, like, params)})`)
    }
    const filter = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const [{ total }] = await this.ds.query(`SELECT COUNT_BIG(*) AS [total] FROM [audit_log] a ${filter}`, params)
    const rows: any[] = await this.ds.query(`SELECT a.[id], a.[at], a.[category], a.[action], a.[entityType], a.[entityId], a.[actorUserId], u.[displayName] AS [actorName],
        a.[branchId], a.[summary], a.[before], a.[after], a.[ip], a.[userAgent]
      FROM [audit_log] a LEFT JOIN [users] u ON u.[id] = a.[actorUserId] ${filter}
      ORDER BY a.[at] DESC, a.[id] DESC OFFSET ${(page - 1) * pageSize} ROWS FETCH NEXT ${pageSize} ROWS ONLY`, params)
    const parse = (value: string | null) => { try { return value == null ? null : JSON.parse(value) } catch { return value } }
    const out = rows.map(row => ({ ...row, id: String(row.id), categoryLabel: AUDIT_CATEGORY_LABELS[row.category as AuditCategory] ?? row.category,
      before: parse(row.before), after: parse(row.after) }))
    await this.scopeEmployeeIdentities(scope, out)
    return { retentionMonths: months, expired: query.expired === true, page, pageSize, total: Number(total), rows: out }
  }

  /**
   * CRP2J: البحث بنص في أحداث الأنواع اللي بتعلن مفاتيح موظفين (ملخصها متخزن من غير أسماء): الاسم بيطابق لو صاحبه مذكور في تفاصيل الحدث
   * وفرعه دلوقتي في نطاق القارئ. اسم موظف برّه النطاق مابيطابقش، فعدد النتايج زي أي اسم مش موجود.
   */
  private employeeNameMatch(scope: BranchScope, like: number, params: unknown[]): string {
    return Object.entries(AUDIT_EMPLOYEE_KEYS).map(([entityType, keys]) => {
      const inScope = scope === null ? '' : ` AND ${branchScopeSql('e.[branchId]', scope, params)}`
      return ` OR (a.[entityType] = N'${entityType}' AND EXISTS (SELECT 1 FROM [employees] e WHERE e.[fullName] LIKE @${like}${inScope} AND e.[id] IN (${declaredEmployeeIds(keys)})))`
    }).join('')
  }

  /**
   * CRP2J: منفّذ الحدث لما يكون هو نفسه موظف مذكور في تفاصيله ومحجوب عن القارئ (فرعه دلوقتي برّه نطاقه): الفلتر برقم حسابه مابيطابقش الحدث،
   * زي ما حسابه بيتحجب في الرد (scopeEmployeeIdentities). «هو نفسه» برقم الموظف المتسجّل مع الحدث وقتها، أو بربط حسابه دلوقتي. CASE عشان الشرط
   * يفضل بقيمتين حتى لو نوع الكيان فاضي.
   */
  private partyActorShown(scope: BranchScope, params: unknown[]): string {
    if (scope === null) return ''
    return Object.entries(AUDIT_EMPLOYEE_KEYS).map(([entityType, keys]) => {
      const hiddenParty = (id: string) => `${id} IN (${declaredEmployeeIds(keys)})`
        + ` AND NOT EXISTS (SELECT 1 FROM [employees] ae WHERE ae.[id] = ${id} AND ${branchScopeSql('ae.[branchId]', scope, params)})`
      return ` AND CASE WHEN a.[entityType] = N'${entityType}' AND ((${hiddenParty(`COALESCE(${declaredEmployeeIds([AUDIT_ACTOR_EMPLOYEE_KEY])})`)})`
        + ` OR EXISTS (SELECT 1 FROM [users] au WHERE au.[id] = a.[actorUserId] AND ${hiddenParty('au.[employeeId]')})) THEN 1 ELSE 0 END = 0`
    }).join('')
  }

  /**
   * CRP2I + CRP2J: هوية موظف في حدث من الأنواع اللي بتعلن مفاتيحه (AUDIT_EMPLOYEE_KEYS)، بفرعه دلوقتي: في نطاق القارئ = اسمه بيتحط مكان
   * موضعه في الملخص ورقمه بيفضل؛ برّه نطاقه = الموضع «موظف برّه نطاقك» والرقم فاضي. ولو المحجوب ده هو نفسه منفّذ الحدث (سجّل تفويضه أو لغاه
   * بنفسه)، حسابه وجهازه بيتحجبوا معاه — برقمه المتسجّل مع الحدث وقتها، أو بربط حسابه دلوقتي؛ ومنفّذ مش مذكور في الحدث بيفضل ظاهر زي باقي أحداث
   * السجل. حساب كل الفروع بيشوف الكل. السجل المخزن زي ما هو.
   */
  private async scopeEmployeeIdentities(scope: BranchScope, rows: Array<{ entityType: string | null; actorUserId: number | null; actorName: string | null; ip: string | null;
    userAgent: string | null; summary: string | null; before: unknown; after: unknown }>) {
    const declared = rows.map(row => ({ row, keys: auditEmployeeKeys(row.entityType),
      sides: [row.before, row.after].filter((side): side is Record<string, unknown> => !!side && typeof side === 'object') })).filter(item => item.keys.length)
    if (!declared.length) return
    const ids = [...new Set(declared.flatMap(({ sides, keys }) => sides.flatMap(side => keys.map(key => Number(side[key])))).filter(id => Number.isSafeInteger(id) && id > 0))]
    const visible = new Map<number, string>()
    for (let offset = 0; offset < ids.length; offset += 1000) {
      const part = ids.slice(offset, offset + 1000)
      const found: Array<{ id: number; fullName: string; branchId: number | null }> = await this.ds.query(
        `SELECT [id], [fullName], [branchId] FROM [employees] WHERE [id] IN (${part.map((_, index) => `@${index}`).join(', ')})`, part)
      for (const employee of found) {
        if (inBranchScope(scope, employee.branchId)) visible.set(Number(employee.id), employee.fullName)
      }
    }
    // موظف كل حساب منفّذ دلوقتي (الحسابات المربوطة بموظف بس؛ الصفحة أقصاها 200 حدث)
    const actorIds = [...new Set(declared.map(({ row }) => Number(row.actorUserId)).filter(id => Number.isSafeInteger(id) && id > 0))]
    const accounts: Array<{ id: number; employeeId: number }> = scope === null || !actorIds.length ? [] : await this.ds.query(
      `SELECT [id], [employeeId] FROM [users] WHERE [employeeId] IS NOT NULL AND [id] IN (${actorIds.map((_, index) => `@${index}`).join(', ')})`, actorIds)
    const actorEmployee = new Map(accounts.map(account => [Number(account.id), Number(account.employeeId)]))
    for (const { row, keys, sides } of declared) {
      // المنفّذ هو نفسه موظف مذكور في الحدث ومحجوب: برقمه المتسجّل مع الحدث وقتها، أو بربط حسابه دلوقتي
      const recorded = Number(sides.map(side => side[AUDIT_ACTOR_EMPLOYEE_KEY]).find(value => value != null))
      const hiddenParty = (id: number | undefined) => id != null && !visible.has(id) && keys.some(key => sides.some(side => Number(side[key]) === id))
      if ([recorded, actorEmployee.get(Number(row.actorUserId))].some(hiddenParty)) {
        row.actorUserId = null; row.actorName = AUDIT_HIDDEN_EMPLOYEE; row.ip = null; row.userAgent = null
      }
      for (const key of keys) {
        const id = Number(sides.map(side => side[key]).find(value => value != null))
        if (typeof row.summary === 'string') row.summary = row.summary.split(`{${key}}`).join(visible.get(id) ?? AUDIT_HIDDEN_EMPLOYEE)
      }
      for (const side of sides) {
        for (const key of [...keys, AUDIT_ACTOR_EMPLOYEE_KEY]) if (side[key] != null && !visible.has(Number(side[key]))) side[key] = null
      }
    }
  }

  /** تصدير من شاشة (الملف بيتعمل في المتصفح): الشاشة واسم الملف وعدد الصفوف، باسم الحساب وفرعه */
  async recordExport(user: JwtPayload, input: { screen?: unknown; filename?: unknown; rows?: unknown }) {
    const screen = typeof input.screen === 'string' ? input.screen.trim().slice(0, 200) : ''
    const filename = typeof input.filename === 'string' ? input.filename.trim().slice(0, 200) : ''
    const rows = Number(input.rows)
    if (!screen || !filename || !Number.isInteger(rows) || rows < 0 || rows > 10_000_000) throw new BadRequestException('بيانات التصدير ناقصة')
    await recordAudit(this.ds.manager, { category: 'EXPORT', action: 'SCREEN_EXPORT', entityType: 'screen', entityId: screen.slice(0, 60),
      actorUserId: user.sub, branchId: user.branchId ?? null, summary: `تصدير ${filename} (${rows} صف) من ${screen}`, after: { screen, filename, rows } })
    return { recorded: true }
  }
}
