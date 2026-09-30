// قراءة عملة الفرع من القاعدة (القاعدة نفسها في branch-currency.ts): دولة الفرع، والفرع من غير دولة = عملة النظام العامة.
// كل قراءة في معاملة المنادي (em)، ومفيش أي كتابة هنا.
import type { EntityManager } from 'typeorm'
import { branchScopeSql, type BranchScope } from '../auth/guards'
import { branchCurrency, systemCurrencyOf, type BranchCurrency } from './branch-currency'

/** عملة النظام العامة (system.currency). */
export async function readSystemCurrency(em: EntityManager): Promise<BranchCurrency> {
  const rows: Array<{ value: string | null }> = await em.query('SELECT [value] FROM dbo.requests_config WHERE [key]=@0', ['system.currency'])
  return systemCurrencyOf(rows[0]?.value)
}

/** عملة فرع واحد؛ فرع مش موجود أو null = عملة النظام. */
export async function readBranchCurrency(em: EntityManager, branchId: number | null | undefined, systemCurrency?: BranchCurrency): Promise<BranchCurrency> {
  const system = systemCurrency ?? await readSystemCurrency(em)
  const id = Number(branchId)
  if (branchId == null || !Number.isSafeInteger(id) || id < 1) return system
  const rows: Array<{ country: string | null }> = await em.query('SELECT [country] FROM dbo.branches WHERE [id]=@0', [id])
  return branchCurrency(rows[0]?.country, system)
}

/** رقم كل فرع في النطاق وعملته بس (null = كل الفروع، [] = ولا فرع) — مفيش اسم ولا أي بيان تاني. */
export async function readBranchCurrencies(em: EntityManager, scope: BranchScope, systemCurrency?: BranchCurrency): Promise<Array<{ id: number; currency: BranchCurrency }>> {
  const system = systemCurrency ?? await readSystemCurrency(em)
  const params: unknown[] = []
  const clause = branchScopeSql('[id]', scope, params)
  const rows: Array<{ id: number; country: string | null }> = await em.query(
    `SELECT [id], [country] FROM dbo.branches${clause ? ` WHERE ${clause}` : ''} ORDER BY [id]`, params)
  return rows.map(row => ({ id: Number(row.id), currency: branchCurrency(row.country, system) }))
}
