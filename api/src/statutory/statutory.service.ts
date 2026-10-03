import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { DataSource, EntityManager } from 'typeorm'
import { STATUTORY_SEED } from './statutory-data'
import { StatutoryDefinition, StatutoryValue } from './statutory.entities'
import type { StatutoryEntry } from './statutory'

const sqlErrorNumber = (error: unknown): number | undefined => {
  const value = error as { number?: unknown; driverError?: { number?: unknown }; originalError?: { info?: { number?: unknown } } }
  const number = value?.driverError?.number ?? value?.number ?? value?.originalError?.info?.number
  return typeof number === 'number' ? number : undefined
}

/** كل القيم القانونية المؤرخة — قبل ترحيل 080 (الجدول مش موجود) = قايمة فاضية، والحاسبات بترجع لمصدرها الحالي */
export async function readStatutoryEntries(em: EntityManager): Promise<StatutoryEntry[]> {
  try {
    const definitions = await em.getRepository(StatutoryDefinition).find({ order: { country: 'ASC', key: 'ASC', effectiveFrom: 'ASC' } })
    if (!definitions.length) return []
    const values = await em.getRepository(StatutoryValue).find()
    return definitions.map(definition => ({
      country: definition.country, key: definition.key, effectiveFrom: String(definition.effectiveFrom).slice(0, 10),
      verified: definition.verified === true, source: definition.source ?? null,
      values: Object.fromEntries(values.filter(value => value.definitionId === definition.id).map(value => [value.code, String(value.value)])),
    }))
  } catch (error) {
    if (sqlErrorNumber(error) === 208) return []
    throw error
  }
}

// البيانات الأولية (statutory-data.ts) بتتضاف وقت الإقلاع لو ناقصة — الموجود مابيتلمسش (زي مفاتيح الإعدادات في ConfigDefaultsService)
@Injectable()
export class StatutorySeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger('Statutory')

  constructor(private readonly ds: DataSource) {}

  async onApplicationBootstrap() {
    try {
      await this.seed()
    } catch (error) {
      if (sqlErrorNumber(error) === 208) {
        this.logger.warn('جداول القيم القانونية المؤرخة (statutory_definitions) مش موجودة — طبّق ترحيل 080. الحاسبات شغالة على مصدرها الحالي')
        return
      }
      this.logger.error(`تعذر إضافة القيم القانونية المؤرخة: ${(error as Error).message}`)
    }
  }

  async seed(): Promise<number> {
    let added = 0
    for (const seed of STATUTORY_SEED) {
      await this.ds.transaction(async em => {
        const exists = await em.getRepository(StatutoryDefinition).findOne({ where: { country: seed.country, key: seed.key, effectiveFrom: seed.effectiveFrom } })
        if (exists) return
        const definition = await em.getRepository(StatutoryDefinition).save(em.getRepository(StatutoryDefinition).create({
          country: seed.country, key: seed.key, effectiveFrom: seed.effectiveFrom, verified: false, source: seed.source }))
        await em.getRepository(StatutoryValue).insert(Object.entries(seed.values).map(([code, value]) => ({ definitionId: definition.id, code, value })))
        added++
      }).catch(error => {
        // نسخة تانية من الـAPI ضافته في نفس اللحظة: الفهرس الفريد بيرفض التكرار
        if (sqlErrorNumber(error) === 2601 || sqlErrorNumber(error) === 2627) return
        throw error
      })
    }
    if (added) this.logger.log(`اتضاف ${added} تعريف قيم قانونية مؤرخة (محتاج تحقق)`)
    return added
  }
}
