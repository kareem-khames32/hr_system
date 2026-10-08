import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { DataSource, type EntityManager } from 'typeorm'
import { recordAudit } from '../audit/audit'
import type { JwtPayload } from '../auth/auth.service'
import { assertCompanyWideWrite, branchScopeOf } from '../auth/guards'
import { Bank, bankFields, banksReady, type BankInput } from './banks'

// B4.6 (ب): جدول البنوك — العرض، والإضافة والتعديل لحساب بكل الفروع. مفيش مسح: البنك بيتعطّل (آيبانات الموظفين القديمة بتفضل مقروءة).
// مفيش بذرة: أكواد البنوك بيدخلها المالك من مصدر البنك نفسه (الجدول الفاضي = كشف البنك زي الأول).

const BANKS_MIGRATION_MISSING = { code: 'BANKS_MIGRATION_MISSING', message: 'جدول البنوك مش موجود — طبّق ترحيل 138. كشف البنك شغال من غير تنبيه كود البنك' }
const BANK_NOT_FOUND = { code: 'BANK_NOT_FOUND', message: 'البنك مش موجود' }
const BANK_DUPLICATE = { code: 'BANK_DUPLICATE', message: 'فيه بنك بنفس الدولة وكود الآيبان' }
const BANK_NOTHING = { code: 'BANK_NOTHING', message: 'مفيش تغيير' }

@Injectable()
export class BanksService {
  constructor(private readonly ds: DataSource) {}

  private view(row: Bank) {
    return { id: row.id, country: row.country, ibanCode: row.ibanCode, nameAr: row.nameAr, nameEn: row.nameEn ?? null, swiftCode: row.swiftCode ?? null, isActive: row.isActive === true }
  }

  private async rows(em: EntityManager) {
    return (await em.getRepository(Bank).find({ order: { country: 'ASC', ibanCode: 'ASC', id: 'ASC' } })).map(row => this.view(row))
  }

  async list(user: JwtPayload) {
    const em = this.ds.manager
    const available = await banksReady(em)
    return { available, canEdit: available && branchScopeOf(user) === null, banks: available ? await this.rows(em) : [] }
  }

  async create(user: JwtPayload, input: BankInput) {
    assertCompanyWideWrite(user)
    const checked = bankFields(input, true)
    if (checked.error !== null) throw new BadRequestException(checked.error)
    await this.ds.transaction(async em => {
      if (!(await banksReady(em))) throw new BadRequestException(BANKS_MIGRATION_MISSING)
      // الدولة والكود فريدين: قفل على الجدول لحد آخر المعاملة (إضافتين في نفس اللحظة: التانية تستنى وتلاقي الأول)
      const [same]: Array<{ id: number }> = await em.query('SELECT [id] FROM dbo.banks WITH (TABLOCKX, HOLDLOCK) WHERE [country] = @0 AND [ibanCode] = @1', [checked.fields.country, checked.fields.ibanCode])
      if (same) throw new ConflictException(BANK_DUPLICATE)
      const inserted = await em.getRepository(Bank).insert({ nameEn: null, swiftCode: null, ...checked.fields, updatedByUserId: user.sub, updatedAt: new Date() })
      await recordAudit(em, { category: 'SETTINGS', action: 'BANK_CREATED', entityType: 'bank', entityId: inserted.identifiers[0].id as number, actorUserId: user.sub,
        summary: `جدول البنوك: إضافة «${checked.fields.nameAr}» (${checked.fields.country} ${checked.fields.ibanCode})`, after: checked.fields })
    })
    return this.list(user)
  }

  /** تعديل الاسم والسويفت والتفعيل (المبعوت بس) تحت قفل صف البنك */
  async update(user: JwtPayload, id: number, input: BankInput) {
    assertCompanyWideWrite(user)
    const checked = bankFields(input, false)
    if (checked.error !== null) throw new BadRequestException(checked.error)
    await this.ds.transaction(async em => {
      if (!(await banksReady(em))) throw new BadRequestException(BANKS_MIGRATION_MISSING)
      const row = await em.getRepository(Bank).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!row) throw new NotFoundException(BANK_NOT_FOUND)
      const before = this.view(row) as Record<string, unknown>
      const changed = Object.fromEntries(Object.entries(checked.fields).filter(([field, value]) => before[field] !== value))
      if (!Object.keys(changed).length) throw new BadRequestException(BANK_NOTHING)
      await em.getRepository(Bank).update({ id: row.id }, { ...changed, updatedByUserId: user.sub, updatedAt: new Date() })
      await recordAudit(em, { category: 'SETTINGS', action: 'BANK_UPDATED', entityType: 'bank', entityId: row.id, actorUserId: user.sub,
        summary: `جدول البنوك: تعديل «${row.nameAr}»`, before: Object.fromEntries(Object.keys(changed).map(field => [field, before[field]])), after: changed })
    })
    return this.list(user)
  }
}
