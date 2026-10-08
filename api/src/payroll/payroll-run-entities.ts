import { BadRequestException } from '@nestjs/common'
import type { EntityManager } from 'typeorm'
import { legalEntitiesReady } from '../org/legal-entities'
import type { PayrollRunDefinition } from './payroll-run-definition'

// B4.1: الكيانات القانونية اللي تعريف مسير بيلمسها — من فروعه المختارة، وفروع أقسامه وفرقه، وفروع موظفيه المسمّين (بفرعهم الحالي)،
// وكل الفروع لو «الشركة كلها». الفرع غير المربوط بكيان مابيتحسبش. قبل ترحيلي 133 و134: ولا كيان (مفيش حارس).

export const PAYRUN_ENTITY_MIXED = 'PAYRUN-ENTITY-MIXED'

async function idsIn(em: EntityManager, sql: (placeholders: string) => string, ids: number[]): Promise<number[]> {
  const out: number[] = []
  const unique = [...new Set(ids)]
  for (let offset = 0; offset < unique.length; offset += 900) {
    const chunk = unique.slice(offset, offset + 900)
    const rows: Array<{ id: number | null }> = await em.query(sql(chunk.map((_, index) => `@${index}`).join(', ')), chunk)
    for (const row of rows) if (row.id != null) out.push(Number(row.id))
  }
  return out
}

/** الكيانات اللي تعريف المسير بيلمسها: رقم الكيان واسمه، مرتبة بالرقم */
export async function runEntities(em: EntityManager, definition: PayrollRunDefinition): Promise<Array<{ id: number; name: string }>> {
  if (!(await legalEntitiesReady(em))) return []
  const { filters } = definition
  let entityIds: number[]
  if (filters.allEmployees) {
    const rows: Array<{ id: number }> = await em.query('SELECT DISTINCT [legalEntityId] AS [id] FROM dbo.branches WHERE [legalEntityId] IS NOT NULL AND [isActive] = 1')
    entityIds = rows.map(row => Number(row.id))
  } else {
    const branchIds = [
      ...filters.branchIds,
      ...(await idsIn(em, list => `SELECT DISTINCT [branchId] AS [id] FROM dbo.departments WHERE [id] IN (${list})`, filters.departmentIds)),
      ...(await idsIn(em, list => `SELECT DISTINCT d.[branchId] AS [id] FROM dbo.teams t INNER JOIN dbo.departments d ON d.[id] = t.[departmentId] WHERE t.[id] IN (${list})`, filters.teamIds)),
      ...(await idsIn(em, list => `SELECT DISTINCT [branchId] AS [id] FROM dbo.employees WHERE [id] IN (${list})`, [...filters.employeeIds, ...filters.includeEmployeeIds])),
    ]
    entityIds = await idsIn(em, list => `SELECT DISTINCT [legalEntityId] AS [id] FROM dbo.branches WHERE [legalEntityId] IS NOT NULL AND [id] IN (${list})`, branchIds)
  }
  const ids = [...new Set(entityIds)].sort((a, b) => a - b)
  if (!ids.length) return []
  const names: Array<{ id: number; name: string }> = await em.query(`SELECT [id], [name] FROM dbo.legal_entities WHERE [id] IN (${ids.map((_, index) => `@${index}`).join(', ')}) ORDER BY [id]`, ids)
  return names.map(row => ({ id: Number(row.id), name: String(row.name) }))
}

export const runEntityNames = async (em: EntityManager, definition: PayrollRunDefinition): Promise<string[]> => (await runEntities(em, definition)).map(row => row.name)

/**
 * مسير جديد (أو تعديل مسودة) مايجمعش أكتر من كيان قانوني. `previous` = تعريف المسودة قبل التعديل: لو كانت مجمّعة أصلًا التعديل بيعدّي
 * (تعريف قايم مابيتمنعش لحد ما المالك يقسّمه — بيظهر عليه تحذير).
 */
export async function assertRunSingleEntity(em: EntityManager, definition: PayrollRunDefinition, previous: PayrollRunDefinition | null): Promise<void> {
  const entities = await runEntities(em, definition)
  if (entities.length < 2) return
  if (previous && (await runEntities(em, previous)).length > 1) return
  throw new BadRequestException({ code: PAYRUN_ENTITY_MIXED,
    message: `المسير لكيان قانوني واحد: النطاق المختار بيجمع ${entities.map(row => `«${row.name}»`).join(' و')} — اعمل مسير لكل كيان` })
}
