// عملة الفرع ونظام تأميناته من دولته (قرار المالك 30 سبتمبر): «لو الفرع مصري يبقى كله مصري، ولو سعودي يبقى كله سعودي،
// وده بيتظبط من الإعدادات مش من أماكن متفرقة». مصر ← جنيه والتأمينات المصرية، السعودية ← ريال والتأمينات السعودية،
// والفرع من غير دولة (فروع قديمة) ← عملة النظام العامة (system.currency).
// العملة تسمية بس: مفيش أي تحويل مبالغ في أي مكان.
// ملف صرف بلا imports — تستورده الواجهة (src/lib/currency.ts وشاشة الفروع) والخادم، فالقاعدة واحدة في الاتنين.

export type BranchCurrency = 'EGP' | 'SAR'
export const BRANCH_COUNTRIES = ['EG', 'SA'] as const
export type BranchCountry = typeof BRANCH_COUNTRIES[number]
export const BRANCH_COUNTRY_NAMES: Record<BranchCountry, string> = { EG: 'مصر', SA: 'السعودية' }
const COUNTRY_CURRENCY: Record<BranchCountry, BranchCurrency> = { EG: 'EGP', SA: 'SAR' }
const COUNTRY_INSURANCE: Record<BranchCountry, 'EGYPTIAN' | 'SAUDI'> = { EG: 'EGYPTIAN', SA: 'SAUDI' }
export const BRANCH_INSURANCE_SYSTEMS = ['NONE', 'SAUDI', 'EGYPTIAN'] as const
export const BRANCH_INSURANCE_LABELS: Record<string, string> = { NONE: 'بدون تأمينات', SAUDI: 'التأمينات السعودية', EGYPTIAN: 'التأمينات المصرية' }

/** رمز الدولة بحروف كبيرة من غير مسافات؛ الفاضي = null (فرع قديم من غير دولة). */
export function normalizeBranchCountry(value: unknown): string | null {
  const text = typeof value === 'string' ? value.trim().toUpperCase() : ''
  return text || null
}

/** مصر أو السعودية، وإلا null (فاضي أو رمز قديم تاني). */
export function branchCountryOf(value: unknown): BranchCountry | null {
  const code = normalizeBranchCountry(value)
  return code === 'EG' || code === 'SA' ? code : null
}

/** عملة النظام العامة: EGP أو SAR — الغايب أو أي قيمة تانية = ريال (افتراض البذرة، والإعدادات مابتقبلش غيرهم). */
export function systemCurrencyOf(value: unknown): BranchCurrency {
  return typeof value === 'string' && value.trim().toUpperCase() === 'EGP' ? 'EGP' : 'SAR'
}

/** عملة الفرع من دولته؛ الفرع من غير دولة (أو برمز قديم غير مصر والسعودية) = عملة النظام العامة. */
export function branchCurrency(country: unknown, systemCurrency: unknown): BranchCurrency {
  const code = branchCountryOf(country)
  return code ? COUNTRY_CURRENCY[code] : systemCurrencyOf(systemCurrency)
}

/** أنظمة التأمينات اللي تمشي مع دولة الفرع: مصر (بدون/المصرية)، السعودية (بدون/السعودية)، ومن غير دولة الثلاثة (فروع قديمة). */
export function branchInsuranceOptions(country: unknown): string[] {
  const code = branchCountryOf(country)
  return code ? ['NONE', COUNTRY_INSURANCE[code]] : [...BRANCH_INSURANCE_SYSTEMS]
}

/** رسالة لو نظام تأمينات الفرع مايمشيش مع دولته (فرع مصري بتأمينات سعودية أو العكس)، وإلا null. */
export function branchInsuranceIssue(country: unknown, insuranceSystem: unknown): string | null {
  const code = branchCountryOf(country)
  const system = typeof insuranceSystem === 'string' && insuranceSystem ? insuranceSystem : 'NONE'
  if (!code || branchInsuranceOptions(code).includes(system)) return null
  const allowed = branchInsuranceOptions(code).map(option => `«${BRANCH_INSURANCE_LABELS[option]}»`).join(' أو ')
  return `فرع ${BRANCH_COUNTRY_NAMES[code]} تأميناته ${allowed} بس — «${BRANCH_INSURANCE_LABELS[system] ?? system}» مابتمشيش معاه؛ غيّر نظام التأمينات أو دولة الفرع`
}
