import { ForbiddenException, BadRequestException, Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { localDateOf } from '../attendance/attendance.service'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf } from '../auth/guards'
import { branchCountryOf } from '../org/branch-currency'
import { legalEntitiesReady } from '../org/legal-entities'
import { EG_INSURANCE_WAGE_LIMITS } from '../statutory/statutory-data'
import { statutoryAt, statutoryNumber, type StatutoryEntry } from '../statutory/statutory'
import { readStatutoryEntries } from '../statutory/statutory.service'

// B4.4 (د): صندوق التدريب المصري (C-EG-04، قانون 14/2025) — تقرير سنوي بتكلفة المنشأة، مش خصم من الموظف ولا بند في القسيمة.
// المنشأة اللي عدد موظفيها وصل الحد بتدفع عن كل موظف نسبة من الحد الأدنى لأجر التأمين، بحد أدنى وأقصى للموظف في السنة.
// الأرقام من حزمة الدولة (eg.training_fund، وحد أجر التأمين) بتاريخ آخر يوم في السنة أو النهارده — و«محتاجة تحقق» لحد ما تتراجع.

export const EG_TRAINING_FUND_KEY = 'eg.training_fund'
export const EG_TRAINING_FUND_COMPANY_ONLY = 'تقرير صندوق التدريب على مستوى الشركة — لحساب بكل الفروع'
export const EG_TRAINING_FUND_YEAR = 'السنة رقم من 2025 للسنة الحالية'
export const EG_TRAINING_FUND_MISSING = 'قيم صندوق التدريب أو حد أجر التأمين مش متسجّلة في حزمة الدولة للتاريخ ده'
export const EG_TRAINING_FUND_NO_ENTITY = 'فروع مصر (من غير كيان قانوني)'

export interface EgTrainingFundRule {
  pct: number; minAmount: number; maxAmount: number; minHeadcount: number
  minInsuranceWage: number
  /** المبلغ عن الموظف الواحد في السنة: النسبة من الحد الأدنى لأجر التأمين، بين الحد الأدنى والأقصى */
  perEmployee: number
  effectiveFrom: string; wageLimitsFrom: string; verified: boolean
}

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

/** قاعدة صندوق التدريب السارية يوم date، أو null لو صفها أو حد أجر التأمين ناقص */
export function egTrainingFundRuleAt(entries: readonly StatutoryEntry[], date: string): EgTrainingFundRule | null {
  const row = statutoryAt(entries, 'EG', EG_TRAINING_FUND_KEY, date), limits = statutoryAt(entries, 'EG', EG_INSURANCE_WAGE_LIMITS, date)
  const pct = statutoryNumber(row, 'pct_of_min_insurance_wage'), minAmount = statutoryNumber(row, 'min_amount'), maxAmount = statutoryNumber(row, 'max_amount'),
    minHeadcount = statutoryNumber(row, 'min_headcount'), minInsuranceWage = statutoryNumber(limits, 'min_salary')
  if (!row || !limits || pct === null || minAmount === null || maxAmount === null || minHeadcount === null || minInsuranceWage === null || maxAmount < minAmount) return null
  return { pct, minAmount, maxAmount, minHeadcount, minInsuranceWage, perEmployee: Math.min(maxAmount, Math.max(minAmount, round2(minInsuranceWage * pct / 100))),
    effectiveFrom: row.effectiveFrom, wageLimitsFrom: limits.effectiveFrom, verified: row.verified && limits.verified }
}

/** تكلفة منشأة: مابتنطبقش تحت حد العدد */
export function egTrainingFundCost(headcount: number, rule: EgTrainingFundRule): { applies: boolean; amount: number } {
  const applies = headcount >= rule.minHeadcount
  return { applies, amount: applies ? round2(headcount * rule.perEmployee) : 0 }
}

@Injectable()
export class EgTrainingFundService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async report(user: JwtPayload, rawYear?: string) {
    // عدد موظفي المنشأة كلها هو اللي بيحدد انطباق الصندوق — حساب فرع مايشوفش عدد فروع تانية
    if (branchScopeOf(user) !== null) throw new ForbiddenException(EG_TRAINING_FUND_COMPANY_ONLY)
    const today = localDateOf(new Date()), thisYear = Number(today.slice(0, 4))
    const year = rawYear === undefined || rawYear === '' ? thisYear : Number(rawYear)
    if (!Number.isInteger(year) || !/^\d{4}$/.test(String(rawYear ?? thisYear)) || year < 2025 || year > thisYear) throw new BadRequestException(EG_TRAINING_FUND_YEAR)
    const date = year === thisYear ? today : `${year}-12-31`
    const em = this.ds.manager
    const rule = egTrainingFundRuleAt(await readStatutoryEntries(em), date)
    const base = { year, date, headcountAsOf: today }
    if (!rule) return { ...base, available: false, message: EG_TRAINING_FUND_MISSING, rule: null, entities: [], total: 0 }
    // الموظفين النشطين النهارده في فروع دولتها مصر، لكل كيان قانوني (الفرع من غير كيان في مجموعة لوحدها)
    const entityReady = await legalEntitiesReady(em)
    const rows: Array<{ branchId: number; country: string | null; entityId: number | null; entityName: string | null; n: number }> = await em.query(
      `SELECT b.[id] AS [branchId], b.[country], ${entityReady ? 'le.[id]' : 'CAST(NULL AS int)'} AS [entityId], ${entityReady ? 'le.[name]' : 'CAST(NULL AS nvarchar(200))'} AS [entityName],
              (SELECT COUNT(*) FROM [employees] e WHERE e.[branchId] = b.[id] AND e.[isActive] = 1 AND e.[status] = N'active') AS [n]
       FROM [branches] b ${entityReady ? 'LEFT JOIN dbo.legal_entities le ON le.[id] = b.[legalEntityId]' : ''}`)
    const groups = new Map<string, { entityId: number | null; name: string; headcount: number }>()
    for (const row of rows) {
      if (branchCountryOf(row.country) !== 'EG') continue
      const key = row.entityId == null ? 'none' : String(row.entityId)
      const group = groups.get(key) ?? { entityId: row.entityId == null ? null : Number(row.entityId), name: row.entityName ?? EG_TRAINING_FUND_NO_ENTITY, headcount: 0 }
      group.headcount += Number(row.n)
      groups.set(key, group)
    }
    const entities = [...groups.values()].filter((group) => group.headcount > 0).sort((a, b) => (a.entityId ?? 0) - (b.entityId ?? 0))
      .map((group) => ({ ...group, ...egTrainingFundCost(group.headcount, rule) }))
    return { ...base, available: true, rule, entities, total: round2(entities.reduce((sum, entity) => sum + entity.amount, 0)) }
  }
}
