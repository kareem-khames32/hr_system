import { ForbiddenException, Injectable } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { localDateOf } from '../attendance/attendance.service'
import type { JwtPayload } from '../auth/auth.service'
import { branchScopeOf } from '../auth/guards'
import { nationalityKind } from '../employees/employee-required-fields'
import { branchCountryOf } from '../org/branch-currency'
import { legalEntitiesReady } from '../org/legal-entities'

// B4.6 (أ): تقرير نطاقات البسيط (C-SA-09) — نسبة السعوديين من الموظفين النشطين لكل كيان قانوني سعودي. قراءة بس.
// السعودي بنفس قاعدة التأمينات (nationalityKind). مش حساب نطاق المنشأة ولونه: ده محتاج نشاطها وحجمها ووزن كل موظف (مش في البطاقات).
// النسبة رقم على مستوى المنشأة كلها، فالتقرير لحساب بكل الفروع (حساب فرع مايشوفش أعداد فروع تانية).

export const SAUDIZATION_COMPANY_ONLY = 'تقرير نسبة السعودة على مستوى الشركة — لحساب بكل الفروع'
export const SAUDIZATION_NO_ENTITY = 'فروع السعودية (من غير كيان قانوني)'

export interface SaudizationGroup { entityId: number | null; name: string; headcount: number; saudis: number; unknownNationality: number; percent: number | null }

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

/** تجميع موظفين (كل واحد بكيانه وجنسيته) لنسبة السعوديين لكل كيان. الكيان من غير موظفين برّه التقرير */
export function saudizationGroups(rows: ReadonlyArray<{ entityId: number | null; entityName: string | null; nationality: unknown }>): SaudizationGroup[] {
  const groups = new Map<string, SaudizationGroup>()
  for (const row of rows) {
    const key = row.entityId == null ? 'none' : String(row.entityId)
    const group = groups.get(key) ?? { entityId: row.entityId == null ? null : Number(row.entityId), name: row.entityId == null ? SAUDIZATION_NO_ENTITY : row.entityName ?? SAUDIZATION_NO_ENTITY,
      headcount: 0, saudis: 0, unknownNationality: 0, percent: null }
    const kind = nationalityKind(row.nationality)
    group.headcount += 1
    if (kind === 'SAUDI') group.saudis += 1
    if (kind === 'UNKNOWN') group.unknownNationality += 1
    groups.set(key, group)
  }
  return [...groups.values()].sort((a, b) => (a.entityId ?? Number.MAX_SAFE_INTEGER) - (b.entityId ?? Number.MAX_SAFE_INTEGER))
    .map(group => ({ ...group, percent: group.headcount ? round2(group.saudis * 100 / group.headcount) : null }))
}

@Injectable()
export class SaudizationReportService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async report(user: JwtPayload) {
    if (branchScopeOf(user) !== null) throw new ForbiddenException(SAUDIZATION_COMPANY_ONLY)
    const em = this.ds.manager, entityReady = await legalEntitiesReady(em)
    // الموظفين النشطين النهارده في فروع دولتها السعودية، كل واحد بكيان فرعه
    const rows: Array<{ country: string | null; entityId: number | null; entityName: string | null; nationality: string | null }> = await em.query(
      `SELECT b.[country], ${entityReady ? 'le.[id]' : 'CAST(NULL AS int)'} AS [entityId], ${entityReady ? 'le.[name]' : 'CAST(NULL AS nvarchar(200))'} AS [entityName], e.[nationality]
       FROM [employees] e INNER JOIN [branches] b ON b.[id] = e.[branchId] ${entityReady ? 'LEFT JOIN dbo.legal_entities le ON le.[id] = b.[legalEntityId]' : ''}
       WHERE e.[isActive] = 1 AND e.[status] IN (N'active', N'probation', N'notice_period')`)
    return { asOf: localDateOf(new Date()), entities: saudizationGroups(rows.filter(row => branchCountryOf(row.country) === 'SA')) }
  }
}
