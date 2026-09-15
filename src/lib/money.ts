// الخطوة 22 / FE-06 (B5): منسّق واحد ونظام أرقام واحد لكل مبالغ الرواتب في الشاشات والقسيمة:
// أرقام لاتينية بفواصل الآلاف ومنزلتين دائمًا (1500.5 ← 1,500.50)، وتقريب نصف لأعلى مطابق لـroundPayrollMoney في الخادم
// (api/src/payroll/payroll-money.ts) حتى يتطابق المعروض مع المحفوظ في المسير ونهاية الخدمة والتصفية.

const moneyFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const rateFormatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 6 })

/** القيم العشرية قد تصل نصوصًا من قاعدة البيانات؛ غير الرقمي = صفر. */
export function toMoneyNumber(value: unknown): number {
  const number = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : 0
  return Number.isFinite(number) ? number : 0
}

/** نفس خوارزمية الخادم: منزلتان، نصف لأعلى، مع هامش خطأ التمثيل الثنائي قرب نصف القرش (1.005 ← 1.01). */
export function roundMoney(value: number): number {
  const scaled = Math.abs(value) * 100
  const tolerance = Number.EPSILON * Math.max(1, scaled) * 4
  const rounded = Math.sign(value) * Math.round(scaled + tolerance) / 100
  return rounded === 0 ? 0 : rounded
}

/** نص عشري صالح كما يصل من الخادم (DECIMAL نصًا): «-1234.5670». */
export const isMoneyText = (value: unknown): value is string => typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value)

const groupThousands = (whole: string) => whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')

// زيادة رقم نصي بمقدار واحد (للتقريب لأعلى) دون تحويل ثنائي — مبالغ DECIMAL(18,4) الكبيرة تبقى دقيقة.
function incrementDigits(digits: string): string {
  const chars = digits.split('')
  for (let index = chars.length - 1; index >= 0; index--) {
    if (chars[index] !== '9') { chars[index] = String(Number(chars[index]) + 1); return chars.join('') }
    chars[index] = '0'
  }
  return `1${chars.join('')}`
}

/** نفس قاعدة roundMoney (منزلتان، نصف لأعلى بعيدًا عن الصفر) على النص العشري مباشرة: «100.0050» ← «100.01». */
function formatMoneyText(text: string): string {
  const negative = text.startsWith('-')
  const [whole, fraction = ''] = (negative ? text.slice(1) : text).split('.')
  const padded = fraction.padEnd(3, '0')
  let cents = `${whole}${padded.slice(0, 2)}`.replace(/^0+(?=\d)/, '')
  if (padded[2] >= '5') cents = incrementDigits(cents)
  cents = cents.padStart(3, '0')
  const integer = cents.slice(0, -2).replace(/^0+(?=\d)/, '')
  const result = `${groupThousands(integer)}.${cents.slice(-2)}`
  return negative && /[1-9]/.test(cents) ? `-${result}` : result
}

/** المنسّق الواحد لكل مبالغ الرواتب: النص العشري يُقرّب نصيًا بلا تحويل ثنائي، والرقم بـroundMoney؛ القاعدة نفسها في الحالتين. */
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
