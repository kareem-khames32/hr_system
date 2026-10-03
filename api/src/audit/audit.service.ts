import { BadRequestException, ConflictException, Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import type { DataSource } from 'typeorm'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf, branchScopeSql } from '../auth/guards'
import { AUDIT_CATEGORIES, AUDIT_CATEGORY_LABELS, AUDIT_MIGRATION_MISSING, AUDIT_RETENTION_DEFAULT, AUDIT_RETENTION_KEY, AUDIT_RETENTION_MIN,
  auditTableReady, recordAudit, type AuditCategory } from './audit'

export interface AuditSearchQuery {
  category?: string; action?: string; actorUserId?: number; entityType?: string; entityId?: string
  from?: string; to?: string; q?: string; expired?: boolean; page?: number; pageSize?: number
}

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
    if (query.actorUserId) { params.push(Number(query.actorUserId)); where.push(`a.[actorUserId] = @${params.length - 1}`) }
    if (query.entityType) { params.push(query.entityType); where.push(`a.[entityType] = @${params.length - 1}`) }
    if (query.entityId) { params.push(String(query.entityId)); where.push(`a.[entityId] = @${params.length - 1}`) }
    for (const [value, op] of [[query.from, '>='], [query.to, '<']] as const) {
      if (!value) continue
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException('التاريخ بصيغة YYYY-MM-DD')
      params.push(op === '<' ? new Date(new Date(`${value}T00:00:00`).getTime() + 86_400_000) : new Date(`${value}T00:00:00`))
      where.push(`a.[at] ${op} @${params.length - 1}`)
    }
    if (query.q && query.q.trim()) { params.push(`%${query.q.trim().replace(/[%_[\]]/g, match => `[${match}]`)}%`); where.push(`a.[summary] LIKE @${params.length - 1}`) }
    const filter = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const [{ total }] = await this.ds.query(`SELECT COUNT_BIG(*) AS [total] FROM [audit_log] a ${filter}`, params)
    const rows: any[] = await this.ds.query(`SELECT a.[id], a.[at], a.[category], a.[action], a.[entityType], a.[entityId], a.[actorUserId], u.[displayName] AS [actorName],
        a.[branchId], a.[summary], a.[before], a.[after], a.[ip], a.[userAgent]
      FROM [audit_log] a LEFT JOIN [users] u ON u.[id] = a.[actorUserId] ${filter}
      ORDER BY a.[at] DESC, a.[id] DESC OFFSET ${(page - 1) * pageSize} ROWS FETCH NEXT ${pageSize} ROWS ONLY`, params)
    const parse = (value: string | null) => { try { return value == null ? null : JSON.parse(value) } catch { return value } }
    return {
      retentionMonths: months, expired: query.expired === true, page, pageSize, total: Number(total),
      rows: rows.map(row => ({ ...row, id: String(row.id), categoryLabel: AUDIT_CATEGORY_LABELS[row.category as AuditCategory] ?? row.category,
        before: parse(row.before), after: parse(row.after) })),
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
