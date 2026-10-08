import { BadRequestException, Injectable, Logger, NotFoundException, type OnApplicationBootstrap } from '@nestjs/common'
import { DataSource, type EntityManager } from 'typeorm'
import { recordAudit } from '../audit/audit'
import type { JwtPayload } from '../auth/auth.service'
import { assertCompanyWideWrite, branchScopeOf } from '../auth/guards'
import { SALARY_ITEM_SEED, SalaryItem, salaryItemsReady } from './salary-items'

// B4.3: بنود الراتب — البذرة وقت الإقلاع (تتضاف لو ناقصة، والموجود مابيتلمسش)، والعرض، وتعديل الترتيب و«خاضع» لحساب بكل الفروع.
// مفيش بند جديد من الشاشة ولا مسح ولا تغيير اسم: البنود بتوصف سطور القسيمة القايمة (البنود الحرة = T05 الكامل).

const SALARY_ITEMS_MIGRATION_MISSING = { code: 'SALARY_ITEMS_MIGRATION_MISSING', message: 'جدول بنود الراتب مش موجود — طبّق ترحيل 135. القسيمة شغالة بالترتيب الثابت' }
const SALARY_ITEM_NOT_FOUND = { code: 'SALARY_ITEM_NOT_FOUND', message: 'البند مش موجود' }
const SALARY_ITEM_ORDER = { code: 'SALARY_ITEM_ORDER', message: 'الترتيب رقم صحيح من 0 لـ9999' }
const SALARY_ITEM_FLAG = { code: 'SALARY_ITEM_FLAG', message: '«خاضع للتأمين» و«خاضع للضريبة» قيمتهم أيوه أو لأ' }
const SALARY_ITEM_NOTHING = { code: 'SALARY_ITEM_NOTHING', message: 'مفيش تغيير' }

export interface SalaryItemInput { sortOrder?: unknown; insurable?: unknown; taxable?: unknown }

@Injectable()
export class SalaryItemsService implements OnApplicationBootstrap {
  private readonly logger = new Logger('SalaryItems')

  constructor(private readonly ds: DataSource) {}

  async onApplicationBootstrap() {
    try {
      await this.seed()
    } catch (error) {
      this.logger.error(`تعذر إضافة بنود الراتب: ${(error as Error).message}`)
    }
  }

  /** بيضيف الناقص من البذرة بس؛ قبل ترحيل 135 مابيعملش حاجة. بيرجّع عدد اللي اتضاف */
  async seed(): Promise<number> {
    if (!(await salaryItemsReady(this.ds.manager))) {
      this.logger.warn('جدول بنود الراتب (salary_items) مش موجود — طبّق ترحيل 135. القسيمة شغالة بالترتيب الثابت')
      return 0
    }
    // قراءة الموجود بقفل على الجدول كله لحد آخر المعاملة: نسخة تانية من الـAPI بتقلع في نفس اللحظة بتستنى وماتكررش كود
    return this.ds.transaction(async em => {
      const existing = new Set((await em.query('SELECT [code] FROM dbo.salary_items WITH (TABLOCKX, HOLDLOCK)') as Array<{ code: string }>).map(row => String(row.code)))
      const missing = SALARY_ITEM_SEED.filter(seed => !existing.has(seed.code))
      if (missing.length) await em.getRepository(SalaryItem).insert(missing.map(seed => ({ ...seed })))
      return missing.length
    })
  }

  private view(row: SalaryItem) {
    return { id: row.id, code: row.code, nameAr: row.nameAr, nameEn: row.nameEn, kind: row.kind, insurable: row.insurable === true, taxable: row.taxable === true,
      proration: row.proration, sortOrder: row.sortOrder, statutory: row.statutory === true, computed: row.computed === true }
  }

  private async rows(em: EntityManager) {
    return (await em.getRepository(SalaryItem).find({ order: { sortOrder: 'ASC', code: 'ASC' } })).map(row => this.view(row))
  }

  async list(user: JwtPayload) {
    const em = this.ds.manager
    const available = await salaryItemsReady(em)
    return { available, canEdit: available && branchScopeOf(user) === null, items: available ? await this.rows(em) : [] }
  }

  /** تعديل الترتيب و«خاضع للتأمين» و«خاضع للضريبة» (المبعوت بس) تحت قفل صف البند */
  async update(user: JwtPayload, id: number, input: SalaryItemInput) {
    assertCompanyWideWrite(user)
    const patch: { sortOrder?: number; insurable?: boolean; taxable?: boolean } = {}
    if (input.sortOrder !== undefined) {
      if (typeof input.sortOrder !== 'number' || !Number.isInteger(input.sortOrder) || input.sortOrder < 0 || input.sortOrder > 9999) throw new BadRequestException(SALARY_ITEM_ORDER)
      patch.sortOrder = input.sortOrder
    }
    for (const flag of ['insurable', 'taxable'] as const) {
      if (input[flag] === undefined) continue
      if (typeof input[flag] !== 'boolean') throw new BadRequestException(SALARY_ITEM_FLAG)
      patch[flag] = input[flag]
    }
    await this.ds.transaction(async em => {
      if (!(await salaryItemsReady(em))) throw new BadRequestException(SALARY_ITEMS_MIGRATION_MISSING)
      const row = await em.getRepository(SalaryItem).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
      if (!row) throw new NotFoundException(SALARY_ITEM_NOT_FOUND)
      const before = this.view(row)
      const changed = Object.fromEntries(Object.entries(patch).filter(([field, value]) => before[field as keyof typeof patch] !== value))
      if (!Object.keys(changed).length) throw new BadRequestException(SALARY_ITEM_NOTHING)
      await em.getRepository(SalaryItem).update({ id: row.id }, { ...changed, updatedByUserId: user.sub, updatedAt: new Date() })
      await recordAudit(em, { category: 'SETTINGS', action: 'SALARY_ITEM_UPDATED', entityType: 'salary_item', entityId: row.id, actorUserId: user.sub,
        summary: `بنود الراتب: تعديل «${row.nameAr}»`,
        before: Object.fromEntries(Object.keys(changed).map(field => [field, before[field as keyof typeof patch]])), after: changed })
    })
    return this.list(user)
  }
}
