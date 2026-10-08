import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, type EntityManager } from 'typeorm'
import { recordAudit } from '../audit/audit'
import type { JwtPayload } from '../auth/auth.service'
import { assertCompanyWideWrite } from '../auth/guards'
import { IntegrationKey } from './integrations.entities'
import { cleanBranchIds, cleanScopes, generateKey, INTEGRATION_SCOPE_LABELS, INTEGRATION_SCOPES, INTEGRATIONS_MIGRATION_MISSING, KEY_NOT_FOUND, keyMatches, keyPrefixOf, KEYS_MAX, storedBranchScope,
  storedScopes, type IntegrationIdentity } from './integration-keys'

// B6.3 (أ): مفاتيح التكامل — الإدارة لحساب بكل الفروع بصلاحية `integrations.manage` (مفتاح ممكن يقرا أكتر من فرع)، والتحقق من مفتاح مبعوت.
// المفتاح بيظهر مرة واحدة في رد الإنشاء؛ في القاعدة بصمته وبادئته بس.

const view = (row: IntegrationKey) => ({ id: row.id, name: row.name, keyPrefix: `hrk_${row.keyPrefix}`, scopes: storedScopes(row.scopes), branchIds: storedBranchScope(row.branchIds), isActive: !!row.isActive,
  createdAt: row.createdAt, lastUsedAt: row.lastUsedAt ?? null, revokedAt: row.revokedAt ?? null })

@Injectable()
export class IntegrationKeysService {
  // آخر مرة اتسجّل فيها «آخر استخدام» لكل مفتاح — كتابة واحدة في الدقيقة بالكتير لكل مفتاح
  private readonly touched = new Map<number, number>()
  private tableReady = false

  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  private async ready(em: EntityManager): Promise<boolean> {
    if (this.tableReady) return true
    const [row]: Array<{ id: number | null }> = await em.query(`SELECT OBJECT_ID(N'dbo.integration_keys', N'U') AS [id]`)
    this.tableReady = row?.id != null
    return this.tableReady
  }

  async list(user: JwtPayload) {
    assertCompanyWideWrite(user)
    const available = await this.ready(this.ds.manager)
    const rows = available ? await this.ds.getRepository(IntegrationKey).find({ order: { id: 'DESC' } }) : []
    return { available, scopes: INTEGRATION_SCOPES.map(key => ({ key, label: INTEGRATION_SCOPE_LABELS[key] })), keys: rows.map(view) }
  }

  /** مفتاح جديد — نصه في الرد ده بس */
  async create(user: JwtPayload, body: { name?: unknown; scopes?: unknown; branchIds?: unknown }) {
    assertCompanyWideWrite(user)
    const name = typeof body?.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : ''
    if (name.length < 2 || name.length > 120) throw new BadRequestException('اسم المفتاح من حرفين لحد 120 حرف')
    const { scopes, issue } = cleanScopes(body?.scopes)
    if (issue) throw new BadRequestException(issue)
    const branches = cleanBranchIds(body?.branchIds)
    if (branches.issue) throw new BadRequestException(branches.issue)
    return this.ds.transaction(async em => {
      if (!(await this.ready(em))) throw new ConflictException(INTEGRATIONS_MIGRATION_MISSING)
      // قفل الجدول لمعاملة الإنشاء: الحد والبادئة بيتحكموا على صفوف ثابتة
      const existing: Array<{ keyPrefix: string; isActive: boolean }> = await em.query('SELECT [keyPrefix], [isActive] FROM dbo.integration_keys WITH (UPDLOCK, HOLDLOCK)')
      if (existing.filter(row => row.isActive).length >= KEYS_MAX) throw new BadRequestException(`المفاتيح الشغالة ${KEYS_MAX} بالكتير — الغي مفتاح مش مستخدم الأول`)
      if (branches.branchIds) {
        const found: Array<{ id: number }> = await em.query(`SELECT [id] FROM dbo.branches WHERE [id] IN (${branches.branchIds.map((_, index) => `@${index}`).join(', ')})`, branches.branchIds)
        if (found.length !== branches.branchIds.length) throw new BadRequestException('فرع من الفروع مش موجود')
      }
      let fresh = generateKey()
      const taken = new Set(existing.map(row => row.keyPrefix))
      for (let attempt = 0; taken.has(fresh.prefix) && attempt < 5; attempt++) fresh = generateKey()
      if (taken.has(fresh.prefix)) throw new ConflictException('تعذر توليد مفتاح — جرّب تاني')
      const row = await em.getRepository(IntegrationKey).save(em.getRepository(IntegrationKey).create({ name, keyPrefix: fresh.prefix, keyHash: fresh.hash, scopes: JSON.stringify(scopes),
        branchIds: branches.branchIds ? JSON.stringify(branches.branchIds) : null, isActive: true, createdByUserId: user.sub, createdAt: new Date(), lastUsedAt: null, revokedByUserId: null, revokedAt: null }))
      await recordAudit(em, { category: 'SETTINGS', action: 'INTEGRATION_KEY_CREATED', entityType: 'integration_key', entityId: String(row.id), actorUserId: user.sub,
        after: { name, scopes, branchIds: branches.branchIds } })
      return { ...view(row), key: fresh.key }
    })
  }

  /** إلغاء مفتاح: كتابة مشروطة بإنه لسه شغال */
  async revoke(user: JwtPayload, id: number) {
    assertCompanyWideWrite(user)
    return this.ds.transaction(async em => {
      if (!(await this.ready(em))) throw new ConflictException(INTEGRATIONS_MIGRATION_MISSING)
      const changed: Array<{ id: number }> = await em.query(`UPDATE dbo.integration_keys SET [isActive] = 0, [revokedByUserId] = @1, [revokedAt] = @2 OUTPUT INSERTED.[id] WHERE [id] = @0 AND [isActive] = 1`, [id, user.sub, new Date()])
      if (!changed.length) {
        const [row]: Array<{ id: number }> = await em.query('SELECT [id] FROM dbo.integration_keys WHERE [id] = @0', [id])
        if (!row) throw new NotFoundException(KEY_NOT_FOUND)
        return { id, revoked: false }
      }
      await recordAudit(em, { category: 'SETTINGS', action: 'INTEGRATION_KEY_REVOKED', entityType: 'integration_key', entityId: String(id), actorUserId: user.sub })
      return { id, revoked: true }
    })
  }

  /** المفتاح المبعوت ← هوية التكامل (نطاقاته وفروعه)، أو null. مفتاح ملغي أو شكله غلط أو بصمته مش مطابقة = null بنفس الشكل. */
  async authenticate(raw: string | null): Promise<IntegrationIdentity | null> {
    const prefix = keyPrefixOf(raw)
    if (!prefix || !raw || !(await this.ready(this.ds.manager))) return null
    const rows: Array<{ id: number; name: string; keyHash: string; scopes: string; branchIds: string | null }> =
      await this.ds.query('SELECT [id], [name], [keyHash], [scopes], [branchIds] FROM dbo.integration_keys WHERE [keyPrefix] = @0 AND [isActive] = 1', [prefix])
    const row = rows.find(candidate => keyMatches(raw, candidate.keyHash))
    if (!row) return null
    const id = Number(row.id), now = Date.now()
    if (now - (this.touched.get(id) ?? 0) > 60_000) {
      this.touched.set(id, now)
      await this.ds.query('UPDATE dbo.integration_keys SET [lastUsedAt] = @1 WHERE [id] = @0', [id, new Date(now)])
    }
    return { id, name: row.name, scopes: storedScopes(row.scopes), branchScope: storedBranchScope(row.branchIds) }
  }
}
