'use client'

// B1.1: إجمالي لكل عملة في الشاشات اللي بتجمع فلوس موظفين من فروع بعملتين (فرع مصري بالجنيه وسعودي بالريال).
// الخادم بيرجّع byCurrency بنفس شكل الإجمالي العام لكل عملة لوحدها. عملة واحدة = نفس العرض القديم بعلامتها، عملتين = لكل عملة سطرها،
// ومفيش رقم واحد بيجمع جنيه على ريال. نفس قاعدة التقسيم في الخادم بالحرف (ملف صرف مشترك).
import { currencyLabel } from './currency'
export { singleCurrency, splitByCurrency, totalsByCurrency } from '../../api/src/org/currency-totals'

export interface ByCurrency<T> { currency: string; totals: T }

/** فيه أكتر من عملة؟ (التفصيل لكل عملة بيظهر بس ساعتها) */
export const multiCurrency = <T>(byCurrency: ReadonlyArray<ByCurrency<T>> | null | undefined): byCurrency is ReadonlyArray<ByCurrency<T>> =>
  !!byCurrency && byCurrency.length > 1

/** علامة العملة الصح للإجمالي: عملة واحدة في التفصيل = علامتها، وإلا العلامة العامة للشاشة. */
export function totalsLabel<T>(byCurrency: ReadonlyArray<ByCurrency<T>> | null | undefined, fallbackLabel: string): string {
  return byCurrency && byCurrency.length === 1 ? currencyLabel(byCurrency[0].currency) : fallbackLabel
}

/**
 * المبلغ بعلامته: «6,000.00 ج.م — 9,000.00 ر.س» لو فيه عملتين، وإلا المبلغ العام بعلامة عملته.
 * format = منسّق المبالغ في الشاشة (formatMoney غالبًا).
 */
export function moneyByCurrency<T>(byCurrency: ReadonlyArray<ByCurrency<T>> | null | undefined, pick: (totals: T) => string | number,
  fallback: string | number, fallbackLabel: string, format: (value: string | number) => string): string {
  if (multiCurrency(byCurrency)) return byCurrency.map((group) => `${format(pick(group.totals))} ${currencyLabel(group.currency)}`).join(' — ')
  return `${format(fallback)} ${totalsLabel(byCurrency, fallbackLabel)}`.trim()
}

/** سطور إجمالي لكل عملة (لجداول بتعرض أعمدة كتير): [{ label: 'ج.م', totals }] — فاضية لو عملة واحدة (الإجمالي العام يكفي). */
export function currencyTotalRows<T>(byCurrency: ReadonlyArray<ByCurrency<T>> | null | undefined): Array<{ currency: string; label: string; totals: T }> {
  return multiCurrency(byCurrency) ? byCurrency.map((group) => ({ currency: group.currency, label: currencyLabel(group.currency), totals: group.totals })) : []
}
