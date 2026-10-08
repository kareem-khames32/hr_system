import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, type EntityManager } from 'typeorm'
import { recordAudit } from '../audit/audit'
import type { JwtPayload } from '../auth/auth.service'
import { assertCompanyWideWrite } from '../auth/guards'
import { branchCountryOf } from './branch-currency'
import {
  LEGAL_ENTITIES_MIGRATION_MISSING, LEGAL_ENTITY_BRANCH, LEGAL_ENTITY_BRANCH_COUNTRY, LEGAL_ENTITY_HAS_BRANCHES, LEGAL_ENTITY_INACTIVE, LEGAL_ENTITY_NOTHING, LEGAL_ENTITY_NOT_FOUND, LegalEntity,
  cleanLegalEntityValues, legalEntitiesReady, legalEntityGaps, type LegalEntityInput,
} from './legal-entities'

interface BranchRow { id: number; name: string; country: string | null; legalEntityId: number | null; isActive: boolean }

// B4.1: الكيانات القانونية وربط الفروع بيها. بيانات على مستوى الشركة: القراءة والكتابة لحساب نطاقه الشركة كلها (والصلاحية في الضابط).
// الكتابة تحت قفل صف الكيان (والفرع عند الربط) والحكم بعده، وبالخانات بس، وبسطر تدقيق.
@Injectable()
export class LegalEntitiesService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  private async assertReady(em: EntityManager) {
    if (!(await legalEntitiesReady(em))) throw new BadRequestException(LEGAL_ENTITIES_MIGRATION_MISSING)
  }
  private branches(em: EntityManager, lockId?: number): Promise<BranchRow[]> {
    return em.query(`SELECT [id], [name], [country], [legalEntityId], [isActive] FROM dbo.branches${lockId ? ' WITH (UPDLOCK, ROWLOCK) WHERE [id] = @0' : ' ORDER BY [id]'}`, lockId ? [lockId] : [])
  }
  private view(row: LegalEntity, branches: BranchRow[]) {
    const { createdAt: _created, ...rest } = row
    return { ...rest, isActive: row.isActive === true, gaps: legalEntityGaps(row),
      branches: branches.filter((branch) => Number(branch.legalEntityId) === row.id).map((branch) => ({ id: Number(branch.id), name: branch.name })) }
  }

  /** الكيانات بفروعها ونواقصها، والفروع اللي من غير كيان */
  async list(user: JwtPayload) {
    assertCompanyWideWrite(user)
    const em = this.ds.manager
    if (!(await legalEntitiesReady(em))) return { available: false, message: LEGAL_ENTITIES_MIGRATION_MISSING, entities: [], unlinkedBranches: [] }
    const branches = await this.branches(em)
    const rows = await em.getRepository(LegalEntity).find({ order: { id: 'ASC' } })
    return { available: true, entities: rows.map((row) => this.view(row, branches)),
      unlinkedBranches: branches.filter((branch) => branch.legalEntityId == null && branch.isActive !== false).map((branch) => ({ id: Number(branch.id), name: branch.name, country: branchCountryOf(branch.country) })) }
  }

  private async one(id: number) {
    const em = this.ds.manager
    return this.view(await em.getRepository(LegalEntity).findOneOrFail({ where: { id } }), await this.branches(em))
  }

  async create(user: JwtPayload, input: LegalEntityInput) {
    assertCompanyWideWrite(user)
    const values = cleanLegalEntityValues(input, null)
    const id = await this.ds.transaction(async (em) => {
      await this.assertReady(em)
      const made = await em.getRepository(LegalEntity).insert({ nameEn: null, timeZone: null, commercialRegister: null, taxNumber: null, insuranceNumber: null, qiwaNumber: null, payrollBankName: null,
        payrollIban: null, wpsNumber: null, cycleStartDay: null, ...values, isActive: true, createdAt: new Date() })
      const entityId = made.identifiers[0].id as number
      await recordAudit(em, { category: 'SETTINGS', action: 'LEGAL_ENTITY_CREATED', entityType: 'legal_entity', entityId, actorUserId: user.sub, summary: `كيان قانوني جديد: ${values.name}`,
        after: { name: values.name, country: values.country, currency: values.currency } })
      return entityId
    })
    return this.one(id)
  }

  /** تعديل كيان — تحت قفل صفه، المبعوت بس. الإيقاف لكيان من غير فروع */
  async update(user: JwtPayload, id: number, input: LegalEntityInput) {
    assertCompanyWideWrite(user)
    await this.ds.transaction(async (em) => {
      await this.assertReady(em)
      const row = await em.getRepository(LegalEntity).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!row) throw new NotFoundException(LEGAL_ENTITY_NOT_FOUND)
      const values = cleanLegalEntityValues(input, row)
      const changed = (Object.keys(values) as Array<keyof typeof values>).filter((key) => (key === 'isActive' ? row.isActive === true : row[key] ?? null) !== (values[key] ?? null))
      if (!changed.length) throw new BadRequestException(LEGAL_ENTITY_NOTHING)
      if (changed.includes('isActive') && values.isActive === false) {
        const [linked]: Array<{ n: number }> = await em.query('SELECT COUNT(*) AS [n] FROM dbo.branches WITH (UPDLOCK, HOLDLOCK) WHERE [legalEntityId] = @0', [row.id])
        if (Number(linked.n) > 0) throw new ConflictException(LEGAL_ENTITY_HAS_BRANCHES)
      }
      const patch = Object.fromEntries(changed.map((key) => [key, values[key]]))
      await em.getRepository(LegalEntity).update({ id: row.id }, patch)
      await recordAudit(em, { category: 'SETTINGS', action: 'LEGAL_ENTITY_UPDATED', entityType: 'legal_entity', entityId: row.id, actorUserId: user.sub, summary: `تعديل الكيان القانوني «${row.name}»`,
        before: Object.fromEntries(changed.map((key) => [key, row[key] ?? null])), after: patch })
    })
    return this.one(id)
  }

  /**
   * ربط فرع بكيان (أو فكّه بـnull) — تحت قفل صف الكيان ثم الفرع: الكيان ساري، والفرع اللي له دولة بيتربط بكيان دولته بس (فعملته
   * مابتتغيّرش بالربط).
   */
  async linkBranch(user: JwtPayload, branchId: number, rawEntityId: unknown) {
    assertCompanyWideWrite(user)
    if (rawEntityId !== null && (typeof rawEntityId !== 'number' || !Number.isSafeInteger(rawEntityId) || rawEntityId < 1)) throw new NotFoundException(LEGAL_ENTITY_NOT_FOUND)
    const entityId = rawEntityId as number | null
    await this.ds.transaction(async (em) => {
      await this.assertReady(em)
      const entity = entityId === null ? null : await em.getRepository(LegalEntity).findOne({ where: { id: entityId }, lock: { mode: 'pessimistic_write' } })
      if (entityId !== null && !entity) throw new NotFoundException(LEGAL_ENTITY_NOT_FOUND)
      const [branch] = await this.branches(em, branchId)
      if (!branch) throw new NotFoundException(LEGAL_ENTITY_BRANCH)
      if (entity) {
        if (entity.isActive !== true) throw new BadRequestException(LEGAL_ENTITY_INACTIVE)
        const country = branchCountryOf(branch.country)
        if (country && country !== entity.country) throw new BadRequestException(LEGAL_ENTITY_BRANCH_COUNTRY)
      }
      const before = branch.legalEntityId == null ? null : Number(branch.legalEntityId)
      if (before === entityId) return
      await em.query('UPDATE dbo.branches SET [legalEntityId] = @1 WHERE [id] = @0', [branchId, entityId])
      await recordAudit(em, { category: 'SETTINGS', action: 'BRANCH_LEGAL_ENTITY', entityType: 'branch', entityId: branchId, actorUserId: user.sub, branchId,
        summary: entity ? `ربط الفرع «${branch.name}» بالكيان «${entity.name}»` : `فك ربط الفرع «${branch.name}» من كيانه`, before: { legalEntityId: before }, after: { legalEntityId: entityId } })
    })
    return this.list(user)
  }
}
