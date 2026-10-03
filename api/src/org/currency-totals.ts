// B1.1: تجميع الفلوس لكل عملة. التقارير والشاشات اللي بتجمع موظفين من فروع بعملتين بتطلع إجمالي لكل عملة لوحده —
// مفيش أي تحويل، ومجموع العملات = الإجمالي العام بالظبط (اللي بيفضل راجع زي ما هو للتوافق).
// ملف صرف بلا imports زي branch-currency.ts: الواجهة والخادم بيستخدموا نفس القاعدة.

/** الصفوف مقسومة بالعملة بترتيب ثابت (EGP قبل SAR)، من غير مجموعات فاضية. */
export function splitByCurrency<R>(rows: readonly R[], currencyOf: (row: R) => string): Array<{ currency: string; rows: R[] }> {
  const groups = new Map<string, R[]>()
  for (const row of rows) {
    const currency = currencyOf(row)
    const group = groups.get(currency)
    if (group) group.push(row)
    else groups.set(currency, [row])
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([currency, list]) => ({ currency, rows: list }))
}

/** إجمالي كل عملة بنفس دالة الإجمالي العامة على صفوفها هي بس. */
export function totalsByCurrency<R, T>(rows: readonly R[], currencyOf: (row: R) => string, total: (rows: readonly R[]) => T): Array<{ currency: string; totals: T }> {
  return splitByCurrency(rows, currencyOf).map(group => ({ currency: group.currency, totals: total(group.rows) }))
}

/** عملة واحدة لو كل القيم واحدة، وإلا null (مجموعة فيها عملتين — زي «بدون قسم» على فرعين). */
export function singleCurrency(currencies: Iterable<string>): string | null {
  const unique = new Set(currencies)
  return unique.size === 1 ? [...unique][0] : null
}
