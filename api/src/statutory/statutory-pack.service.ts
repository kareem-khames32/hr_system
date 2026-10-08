import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource, type EntityManager } from 'typeorm'
import { localDateOf } from '../attendance/attendance.service'
import { recordAudit } from '../audit/audit'
import type { JwtPayload } from '../auth/auth.service'
import { STATUTORY_CATALOG, STATUTORY_COUNTRY_LABELS, statutoryKeyInfo, type StatutoryKeyInfo } from './statutory-catalog'
import { CALCULATOR_ROW_IN_USE, enabledCalculatorsOf } from './statutory-calculators.service'
import { StatutoryDefinition, StatutoryValue } from './statutory.entities'

// B4.2: «حزمة الدولة» — عرض القيم القانونية المؤرخة لكل مفتاح، وتعديلها لمدير النظام بس: صف جديد بتاريخ سريان، تعديل قيم صف، وتعليم
// «اتأكد». خانات الصف خانات مفتاحه في الكتالوج بالظبط. التعديل تحت قفل صف التعريف، وبسطر تدقيق بالقيم قبل وبعد. مفتاح بتقراه حاسبة
// (التأمينات) تعديله بيغيّر حساب الفترات المفتوحة — المحسوب قيمته متجمّدة في لقطته.

export const STATUTORY_ADMIN_ONLY = 'تعديل القيم القانونية لمدير النظام بس'
export const STATUTORY_MIGRATION_MISSING = 'حزمة الدولة محتاجة ترحيل 20261003_080 على قاعدة البيانات'
export const STATUTORY_KEY_UNKNOWN = 'المفتاح مش من مفاتيح حزمة الدولة'
export const STATUTORY_NOT_FOUND = 'صف القيم غير موجود'
export const STATUTORY_DATE = 'تاريخ السريان تاريخ صحيح (من 1990 لـ2100)'
export const STATUTORY_VALUES = 'القيم: خانات المفتاح بالظبط، وكل قيمة رقم مش سالب بأربع خانات عشرية بالكتير'
export const STATUTORY_SOURCE = 'المصدر 300 حرف بالكتير'
export const STATUTORY_VERIFIED = '«اتأكد» نعم أو لا'
export const STATUTORY_EXISTS = 'فيه صف بنفس تاريخ السريان للمفتاح ده — عدّله بدل ما تضيف واحد تاني'
export const STATUTORY_NOTHING = 'مفيش بيانات اتغيّرت'

export interface StatutoryRowInput { country?: unknown; key?: unknown; effectiveFrom?: unknown; values?: unknown; source?: unknown; verified?: unknown }

const validDay = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const time = Date.parse(`${value}T12:00:00Z`)
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value
}

/** قيم نضيفة لمفتاح: خاناته من الكتالوج بس. full = صف جديد (كل الخانات)؛ غير كده تعديل (المبعوت بس) */
export function cleanStatutoryValues(info: Pick<StatutoryKeyInfo, 'codes'>, raw: unknown, full: boolean): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new BadRequestException(STATUTORY_VALUES)
  const input = raw as Record<string, unknown>, codes = Object.keys(info.codes), out: Record<string, string> = {}
  if (Object.keys(input).some((code) => !codes.includes(code)) || (full && codes.some((code) => !(code in input)))) throw new BadRequestException(STATUTORY_VALUES)
  for (const code of codes) {
    if (!(code in input)) continue
    const value = input[code], text = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : ''
    if (!/^\d{1,14}(\.\d{1,4})?$/.test(text)) throw new BadRequestException(STATUTORY_VALUES)
    out[code] = String(Number(text))
  }
  return out
}

export function cleanStatutorySource(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === '') return null
  if (typeof raw !== 'string' || raw.trim().length > 300) throw new BadRequestException(STATUTORY_SOURCE)
  return raw.replace(/\s+/g, ' ').trim() || null
}

const sqlErrorNumber = (error: unknown): number | undefined => {
  const value = error as { number?: unknown; driverError?: { number?: unknown }; originalError?: { info?: { number?: unknown } } }
  const number = value?.driverError?.number ?? value?.number ?? value?.originalError?.info?.number
  return typeof number === 'number' ? number : undefined
}
const day = (value: unknown): string => String(value).slice(0, 10)
/** القيمة زي ما اتكتبت (من غير أصفار العمود العشري) */
const plain = (value: unknown): string => String(Number(value))

@Injectable()
export class StatutoryPackService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  private assertAdmin(user: JwtPayload) {
    if (user.role !== 'super_admin') throw new ForbiddenException(STATUTORY_ADMIN_ONLY)
  }
  private async ready(em: EntityManager): Promise<boolean> {
    const [row] = await em.query(`SELECT CASE WHEN OBJECT_ID(N'dbo.statutory_definitions', N'U') IS NOT NULL AND OBJECT_ID(N'dbo.statutory_values', N'U') IS NOT NULL THEN 1 ELSE 0 END AS [ready]`)
    return Number(row?.ready) === 1
  }
  private async valuesOf(em: EntityManager, definitionId: number): Promise<Record<string, string>> {
    return Object.fromEntries((await em.getRepository(StatutoryValue).find({ where: { definitionId }, order: { id: 'ASC' } })).map((row) => [row.code, plain(row.value)]))
  }

  /** كل مفاتيح الكتالوج بصفوفها المؤرخة (الأحدث الأول)، والساري النهارده متعلّم */
  async list(user: JwtPayload) {
    const em = this.ds.manager, canEdit = user.role === 'super_admin'
    if (!(await this.ready(em))) return { available: false, message: STATUTORY_MIGRATION_MISSING, canEdit, countries: [], keys: [] }
    const today = localDateOf(new Date())
    const definitions = await em.getRepository(StatutoryDefinition).find({ order: { effectiveFrom: 'DESC', id: 'DESC' } })
    const values = await em.getRepository(StatutoryValue).find()
    return { available: true, canEdit, countries: Object.entries(STATUTORY_COUNTRY_LABELS).map(([code, label]) => ({ code, label })),
      keys: STATUTORY_CATALOG.map((info) => {
        const rows = definitions.filter((row) => row.country === info.country && row.key === info.key)
        const current = rows.find((row) => day(row.effectiveFrom) <= today)
        return { country: info.country, key: info.key, label: info.label, card: info.card, usedBy: info.usedBy, codes: Object.entries(info.codes).map(([code, label]) => ({ code, label })),
          rows: rows.map((row) => ({ id: row.id, effectiveFrom: day(row.effectiveFrom), verified: row.verified === true, source: row.source ?? null, current: row.id === current?.id,
            values: Object.fromEntries(values.filter((value) => value.definitionId === row.id).map((value) => [value.code, plain(value.value)])) })) }
      }) }
  }

  /** صف جديد بتاريخ سريان لمفتاح من الكتالوج — بكل خاناته. الفهرس الفريد (دولة، مفتاح، تاريخ) بيرفض التكرار */
  async create(user: JwtPayload, input: StatutoryRowInput) {
    this.assertAdmin(user)
    const info = typeof input.country === 'string' && typeof input.key === 'string' ? statutoryKeyInfo(input.country, input.key) : null
    if (!info) throw new BadRequestException(STATUTORY_KEY_UNKNOWN)
    if (!validDay(input.effectiveFrom) || input.effectiveFrom < '1990-01-01' || input.effectiveFrom > '2100-12-31') throw new BadRequestException(STATUTORY_DATE)
    const effectiveFrom = input.effectiveFrom, values = cleanStatutoryValues(info, input.values, true), source = cleanStatutorySource(input.source)
    if (input.verified !== undefined && typeof input.verified !== 'boolean') throw new BadRequestException(STATUTORY_VERIFIED)
    const verified = input.verified === true
    try {
      await this.ds.transaction(async (em) => {
        if (!(await this.ready(em))) throw new BadRequestException(STATUTORY_MIGRATION_MISSING)
        // B4.4 (ج): مفتاح حسابه مفعّل مايقبلش صف «محتاج تحقق» — الصف هيبقى ساري ويتحسب بيه. القفل على صفوف المفتاح بيرتّبه مع التفعيل
        await em.getRepository(StatutoryDefinition).find({ where: { country: info.country, key: info.key }, lock: { mode: 'pessimistic_write' } })
        if (!verified && (await enabledCalculatorsOf(em, info.country, info.key)).length) throw new BadRequestException(CALCULATOR_ROW_IN_USE)
        const made = await em.getRepository(StatutoryDefinition).insert({ country: info.country, key: info.key, effectiveFrom, verified, source })
        const id = made.identifiers[0].id as number
        await em.getRepository(StatutoryValue).insert(Object.entries(values).map(([code, value]) => ({ definitionId: id, code, value })))
        await recordAudit(em, { category: 'SETTINGS', action: 'STATUTORY_ROW_ADDED', entityType: 'statutory_definition', entityId: id, actorUserId: user.sub,
          summary: `حزمة الدولة: صف جديد «${info.label}» (${STATUTORY_COUNTRY_LABELS[info.country]}) ساري من ${effectiveFrom}`, after: { key: info.key, effectiveFrom, verified, values } })
      })
    } catch (error) {
      if (sqlErrorNumber(error) === 2601 || sqlErrorNumber(error) === 2627) throw new ConflictException(STATUTORY_EXISTS)
      throw error
    }
    return this.list(user)
  }

  /** تعديل صف: قيمه (المبعوت بس)، وعلامة «اتأكد»، ومصدره — تحت قفل صف التعريف. تاريخ السريان مابيتعدّلش (صف جديد بتاريخه) */
  async update(user: JwtPayload, id: number, input: StatutoryRowInput) {
    this.assertAdmin(user)
    await this.ds.transaction(async (em) => {
      if (!(await this.ready(em))) throw new BadRequestException(STATUTORY_MIGRATION_MISSING)
      const row = await em.getRepository(StatutoryDefinition).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } })
      const info = row ? statutoryKeyInfo(row.country, row.key) : null
      if (!row || !info) throw new NotFoundException(STATUTORY_NOT_FOUND)
      const before = await this.valuesOf(em, row.id)
      const sent = input.values === undefined ? {} : cleanStatutoryValues(info, input.values, false)
      const changed = Object.fromEntries(Object.entries(sent).filter(([code, value]) => before[code] !== value))
      if (input.verified !== undefined && typeof input.verified !== 'boolean') throw new BadRequestException(STATUTORY_VERIFIED)
      const patch: { verified?: boolean; source?: string | null } = {}
      if (input.verified !== undefined && input.verified !== (row.verified === true)) patch.verified = input.verified
      if (input.source !== undefined) { const source = cleanStatutorySource(input.source); if (source !== (row.source ?? null)) patch.source = source }
      if (!Object.keys(changed).length && !Object.keys(patch).length) throw new BadRequestException(STATUTORY_NOTHING)
      // B4.4 (ج): صف حسابه مفعّل مايتعلّمش «محتاج تحقق» (تحت قفل الصف — التفعيل بياخد نفس القفل)
      if (patch.verified === false && (await enabledCalculatorsOf(em, row.country, row.key)).length) throw new BadRequestException(CALCULATOR_ROW_IN_USE)
      for (const [code, value] of Object.entries(changed)) {
        const updated = await em.getRepository(StatutoryValue).update({ definitionId: row.id, code }, { value })
        if (!updated.affected) await em.getRepository(StatutoryValue).insert({ definitionId: row.id, code, value })
      }
      if (Object.keys(patch).length) await em.getRepository(StatutoryDefinition).update({ id: row.id }, patch)
      await recordAudit(em, { category: 'SETTINGS', action: 'STATUTORY_ROW_UPDATED', entityType: 'statutory_definition', entityId: row.id, actorUserId: user.sub,
        summary: `حزمة الدولة: تعديل «${info.label}» (${STATUTORY_COUNTRY_LABELS[info.country]}) الساري من ${day(row.effectiveFrom)}`,
        before: { values: Object.fromEntries(Object.keys(changed).map((code) => [code, before[code] ?? null])), ...('verified' in patch ? { verified: row.verified === true } : {}), ...('source' in patch ? { source: row.source ?? null } : {}) },
        after: { values: changed, ...patch } })
    })
    return this.list(user)
  }
}
