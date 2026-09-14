import { ConflictException } from '@nestjs/common'
import { EntityManager, EntityTarget, ObjectLiteral } from 'typeorm'
import { PayrollPolicyComponent, PayrollPolicyParameter, PayrollPolicyTier, PayrollTierSet } from './payroll-policy-definition.entities'
import type { PayrollPolicyDefinition } from './payroll-policy-definition'

// لا نعتمد على تحويلDECIMAL إلىNumber في مشغلSQL؛ قيم النقل والتاريخ تبقى نصوصًا دقيقة.
async function exactRows<T extends ObjectLiteral>(em: EntityManager, target: EntityTarget<T>, where: string, parameters: ObjectLiteral, order: string[]) {
  const metadata = em.connection.getMetadata(target), qb = em.createQueryBuilder(target, 'definitionRow').select([])
  const sqlServer = em.connection.options.type === 'mssql'
  for (const column of metadata.columns) {
    const source = 'definitionRow.' + qb.escape(column.databaseName)
    const expression = ['decimal', 'numeric'].includes(String(column.type)) ? `CAST(${source} AS ${sqlServer ? 'nvarchar(100)' : 'CHAR'})` : source
    qb.addSelect(expression, column.propertyName)
  }
  qb.where(where, parameters)
  for (const field of order) qb.addOrderBy('definitionRow.' + qb.escape(field), 'ASC')
  return qb.getRawMany<Record<string, unknown>>()
}

function fields(row: Record<string, unknown>, excluded: string[]) {
  return Object.fromEntries(Object.entries(row).filter(([key]) => !excluded.includes(key)))
}

export async function readPayrollPolicyDefinition(em: EntityManager, versionId: number): Promise<PayrollPolicyDefinition> {
  const where = 'definitionRow.versionId = :versionId'
  // تُقرأ الجداول داخل معاملة الحافظ نفسها عند الكتابة والنسخ.
  const parameters = await exactRows(em, PayrollPolicyParameter, where, { versionId }, ['code'])
  const sets = await exactRows(em, PayrollTierSet, where, { versionId }, ['code'])
  const components = await exactRows(em, PayrollPolicyComponent, where, { versionId }, ['stage', 'sequence', 'code'])
  const tiers = sets.length ? await exactRows(em, PayrollPolicyTier, 'definitionRow.tierSetId IN (:...ids)', { ids: sets.map(set => set.id) }, ['tierSetId', 'sequence']) : []
  const setCodes = new Map(sets.map(set => [set.id, set.code]))
  return {
    parameters: parameters.map(row => fields(row, ['id', 'versionId'])),
    tierSets: sets.map(set => ({ ...fields(set, ['id', 'versionId']), tiers: tiers.filter(tier => tier.tierSetId === set.id).map(tier => fields(tier, ['id', 'tierSetId'])) })),
    components: components.map(component => {
      if (component.tierSetId !== null && !setCodes.has(component.tierSetId)) throw new ConflictException({ code: 'POLICY_DEFINITION_REFERENCE_INVALID', message: 'أحد البنود يشير إلى طقم خارج نسخة السياسة؛ يلزم تصحيح التعريف' })
      return { ...fields(component, ['id', 'versionId', 'tierSetId']), tierSetCode: component.tierSetId === null ? null : setCodes.get(component.tierSetId) }
    }),
  } as unknown as PayrollPolicyDefinition
}

async function insertExact<T extends ObjectLiteral>(em: EntityManager, target: EntityTarget<T>, rows: Record<string, unknown>[]) {
  if (!rows.length) return
  const metadata = em.connection.getMetadata(target), driver = em.connection.driver
  const columns = metadata.columns.filter(column => !column.isGenerated)
  const sqlServer = em.connection.options.type === 'mssql'
  // كل دفعة أدنى من حد معاملاتSQL Server، وأسماءSQL مصدرهاmetadataالموثوقة فقط.
  for (let start = 0; start < rows.length; start += 25) {
    const values: unknown[] = []
    const tuples = rows.slice(start, start + 25).map(row => '(' + columns.map(column => {
      const value = row[column.propertyName]
      if (value === undefined) throw new ConflictException({ code: 'POLICY_DEFINITION_FIELD_MISSING', message: `حقل تعريف مفقود: ${column.propertyName}` })
      const parameter = sqlServer ? '@' + values.length : '?'
      values.push(value)
      // يُرسل النص كـNVARCHAR ثم يحولهSQL إلىDECIMAL؛ تمريره كـdecimalparameter قد يفقد سنتات قبل وصوله.
      return ['decimal', 'numeric'].includes(String(column.type)) ? `CAST(${parameter} AS DECIMAL(${column.precision},${column.scale}))` : parameter
    }).join(', ') + ')')
    await em.query(`INSERT INTO ${driver.escape(metadata.tableName)} (${columns.map(column => driver.escape(column.databaseName)).join(', ')}) VALUES ${tuples.join(', ')}`, values)
  }
}

export async function replacePayrollPolicyDefinition(em: EntityManager, versionId: number, definition: PayrollPolicyDefinition) {
  if (!em.queryRunner?.isTransactionActive) throw new ConflictException('حفظ تعريف السياسة يتطلب معاملة واحدة')
  const oldSets = await em.getRepository(PayrollTierSet).find({ select: { id: true }, where: { versionId } })
  await em.getRepository(PayrollPolicyComponent).delete({ versionId })
  if (oldSets.length) await em.createQueryBuilder().delete().from(PayrollPolicyTier).where('tierSetId IN (:...ids)', { ids: oldSets.map(set => set.id) }).execute()
  await em.getRepository(PayrollTierSet).delete({ versionId })
  await em.getRepository(PayrollPolicyParameter).delete({ versionId })
  await insertExact(em, PayrollPolicyParameter, definition.parameters.map(parameter => ({ ...parameter, versionId })))
  await insertExact(em, PayrollTierSet, definition.tierSets.map(set => {
    const { tiers: _tiers, ...values } = set
    return { ...values, versionId }
  }))
  const sets = await em.getRepository(PayrollTierSet).find({ select: { id: true, code: true }, where: { versionId } })
  const setIds = new Map(sets.map(set => [set.code, set.id]))
  await insertExact(em, PayrollPolicyTier, definition.tierSets.flatMap(set => set.tiers.map(tier => ({ ...tier, tierSetId: setIds.get(set.code) }))))
  await insertExact(em, PayrollPolicyComponent, definition.components.map(component => {
    const { tierSetCode, ...values } = component
    return { ...values, versionId, tierSetId: tierSetCode === null ? null : setIds.get(tierSetCode) }
  }))
}
