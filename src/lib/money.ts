// الخطوة 22 / FE-06 (B5): منسّق واحد ونظام أرقام واحد لكل مبالغ الرواتب في الشاشات والقسيمة:
// أرقام لاتينية بفواصل الآلاف ومنزلتين دائمًا (1500.5 ← 1,500.50).
// قرار المالك (16 سبتمبر): لا تقريب للفلوس — المنزلتان بالقص نحو الصفر (1234.567 ← 1,234.56)، مطابق لـroundPayrollMoney في الخادم
// (api/src/payroll/payroll-money.ts) حتى يتطابق المعروض مع المحفوظ في المسير ونهاية الخدمة والتصفية.

const moneyFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const rateFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 6 })

/** القيم العشرية قد تصل نصوصًا من قاعدة البيانات؛ غير الرقمي = صفر. */
export function toMoneyNumber(value: unknown): number {
  const number = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : 0
  return Number.isFinite(number) ? number : 0
}

// أكبر قيمة نثبّتها على 6 منازل بعدد صحيح آمن (≈ 9 مليار).
const MICRO_LIMIT = Number.MAX_SAFE_INTEGER / 1e6

/**
 * نفس خوارزمية الخادم: قص على منزلتين نحو الصفر بقروش صحيحة (1234.567 ← 1234.56، و-1.239 ← -1.23).
 * القيمة تُثبّت أولًا على 6 منازل لإزالة ضجيج التمثيل الثنائي (0.1 + 0.2، و1.15 × 100) حتى لا يسقط قرش حقيقي.
 */
export function roundMoney(value: number): number {
  if (!Number.isFinite(value) || value === 0) return 0
  const magnitude = Math.abs(value)
  const cents = magnitude < MICRO_LIMIT ? Math.trunc(Math.round(magnitude * 1e6) / 1e4) : Math.trunc(magnitude * 100)
  return cents === 0 ? 0 : Math.sign(value) * cents / 100
}

/** نص عشري صالح كما يصل من الخادم (DECIMAL نصًا): «-1234.5670». */
export const isMoneyText = (value: unknown): value is string => typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value)

const groupThousands = (whole: string) => whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')

/** نفس قاعدة roundMoney (قص منزلتين نحو الصفر) على النص العشري مباشرة بلا تحويل ثنائي: «100.0090» ← «100.00». */
function formatMoneyText(text: string): string {
  const negative = text.startsWith('-')
  const [whole, fraction = ''] = (negative ? text.slice(1) : text).split('.')
  const integer = whole.replace(/^0+(?=\d)/, '')
  const cents = fraction.padEnd(2, '0').slice(0, 2)
  const result = `${groupThousands(integer)}.${cents}`
  return negative && /[1-9]/.test(`${integer}${cents}`) ? `-${result}` : result
}

/** المنسّق الواحد لكل مبالغ الرواتب: النص العشري يُقص نصيًا بلا تحويل ثنائي، والرقم بـroundMoney؛ القاعدة نفسها في الحالتين. */
export const formatMoney = (value: unknown): string => isMoneyText(value) ? formatMoneyText(value) : moneyFormatter.format(roundMoney(toMoneyNumber(value)))

/** المبلغ الموجب منسقًا، والصفر أو الفارغ «-». */
export const formatMoneyOrDash = (value: unknown): string => roundMoney(toMoneyNumber(value)) > 0 ? formatMoney(value) : '-'

/** سعر (ساعة/دقيقة) بحتى ست منازل وبنظام الأرقام نفسه. */
export const formatRate = (value: unknown): string => rateFormatter.format(toMoneyNumber(value))

/** جمع مبالغ بالقروش الصحيحة حتى تتطابق مجاميع الأعمدة والصفوف والملخص (لا تراكم كسور عشرية). */
export function sumMoney(values: readonly unknown[]): number {
  const cents = values.reduce<number>((total, value) => total + Math.round(roundMoney(toMoneyNumber(value)) * 100), 0)
  return cents / 100
}
