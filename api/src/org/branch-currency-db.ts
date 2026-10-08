// قراءة عملة الفرع من القاعدة (القاعدة نفسها في branch-currency.ts): دولة الفرع، والفرع من غير دولة = عملة النظام العامة.
// B4.1: الفرع المربوط بكيان قانوني عملته عملة كيانه (= عملة دولة الكيان، والفرع بيتربط بكيان دولته بس — فمفيش عملة بتتغيّر لفرع له دولة).
// قبل ترحيلي 133 و134، أو فرع من غير كيان: القاعدة القديمة بالحرف.
// كل قراءة في معاملة المنادي (em)، ومفيش أي كتابة هنا.
import type { EntityManager } from 'typeorm'
import { branchScopeSql, type BranchScope } from '../auth/guards'
import { systemCurrencyOf, type BranchCurrency } from './branch-currency'
import { currencyOfBranch, legalEntitiesReady } from './legal-entities'

/** عملة النظام العامة (system.currency). */
export async function readSystemCurrency(em: EntityManager): Promise<BranchCurrency> {
  const rows: Array<{ value: string | null }> = await em.query('SELECT [value] FROM dbo.requests_config WHERE [key]=@0', ['system.currency'])
  return systemCurrencyOf(rows[0]?.value)
}

/** أعمدة ومصدر قراءة «دولة الفرع وعملة كيانه»: بعمود الكيان لو الترحيل متطبّق، وإلا الدولة بس */
async function branchCurrencySource(em: EntityManager): Promise<string> {
  return (await legalEntitiesReady(em))
    ? 'SELECT b.[id], b.[country], e.[currency] AS [entityCurrency] FROM dbo.branches b LEFT JOIN dbo.legal_entities e ON e.[id] = b.[legalEntityId]'
    : 'SELECT b.[id], b.[country], NULL AS [entityCurrency] FROM dbo.branches b'
}

/** عملة فرع واحد؛ فرع مش موجود أو null = عملة النظام. */
export async function readBranchCurrency(em: EntityManager, branchId: number | null | undefined, systemCurrency?: BranchCurrency): Promise<BranchCurrency> {
  const system = systemCurrency ?? await readSystemCurrency(em)
  const id = Number(branchId)
  if (branchId == null || !Number.isSafeInteger(id) || id < 1) return system
  const rows: Array<{ country: string | null; entityCurrency: string | null }> = await em.query(`${await branchCurrencySource(em)} WHERE b.[id]=@0`, [id])
  return currencyOfBranch(rows[0]?.entityCurrency, rows[0]?.country, system)
}

/** دالة عملة الفرع لكل الفروع بقراءة واحدة (B1.1: إجمالي لكل عملة في التقارير)؛ فرع غايب أو null = عملة النظام. */
export async function readBranchCurrencyOf(em: EntityManager): Promise<(branchId: number | null | undefined) => BranchCurrency> {
  const system = await readSystemCurrency(em)
  const map = new Map((await readBranchCurrencies(em, null, system)).map(row => [row.id, row.currency]))
  return branchId => (branchId == null ? system : map.get(Number(branchId)) ?? system)
}

/** رقم كل فرع في النطاق وعملته بس (null = كل الفروع، [] = ولا فرع) — مفيش اسم ولا أي بيان تاني. */
export async function readBranchCurrencies(em: EntityManager, scope: BranchScope, systemCurrency?: BranchCurrency): Promise<Array<{ id: number; currency: BranchCurrency }>> {
  const system = systemCurrency ?? await readSystemCurrency(em)
  const params: unknown[] = []
  const clause = branchScopeSql('b.[id]', scope, params)
  const rows: Array<{ id: number; country: string | null; entityCurrency: string | null }> = await em.query(
    `${await branchCurrencySource(em)}${clause ? ` WHERE ${clause}` : ''} ORDER BY b.[id]`, params)
  return rows.map(row => ({ id: Number(row.id), currency: currencyOfBranch(row.entityCurrency, row.country, system) }))
}
