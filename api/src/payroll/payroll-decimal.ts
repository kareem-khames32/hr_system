// حساب كسري عشري نقي؛ لا تستخدم الأعداد الثنائية في أي عملية مالية.
export type PayrollRoundingMode = 'HALF_UP' | 'HALF_EVEN' | 'FLOOR' | 'CEIL'
export const PAYROLL_DECIMAL_LIMITS = Object.freeze({ inputCharacters: 80, inputDigits: 60, intermediateBits: 4096 })
export class PayrollDecimalError extends Error {
  constructor(readonly code: string, message: string) { super(message); this.name = 'PayrollDecimalError' }
}
type Spend = () => void
const abs = (value: bigint) => value < 0n ? -value : value
function bounded(value: bigint) {
  if (abs(value).toString(2).length > PAYROLL_DECIMAL_LIMITS.intermediateBits) throw new PayrollDecimalError('NUMERIC_LIMIT', 'تجاوزت القيمة الوسيطة حد التعقيد العددي المسموح')
}
function gcd(left: bigint, right: bigint, spend: Spend) {
  left = abs(left); right = abs(right)
  while (right) { spend(); const rest = left % right; left = right; right = rest }
  return left || 1n
}

export class PayrollDecimal {
  readonly numerator: bigint
  readonly denominator: bigint
  constructor(numerator: bigint, denominator: bigint = 1n, private readonly spend: Spend = () => {}) {
    spend(); bounded(numerator); bounded(denominator)
    if (denominator === 0n) throw new PayrollDecimalError('DIVISION_BY_ZERO', 'قسمة على صفر')
    const sign = denominator < 0n ? -1n : 1n, divisor = gcd(numerator, denominator, spend)
    this.numerator = numerator * sign / divisor; this.denominator = abs(denominator) / divisor
  }

  static from(value: string | number, spend: Spend = () => {}) {
    let text: string
    if (typeof value === 'number') {
      if (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value))) {
        throw new PayrollDecimalError('INPUT_INVALID', 'استخدم نصًا عشريًا للأعداد الصحيحة الكبيرة، والقيمة يجب أن تكون محدودة')
      }
      text = String(value)
      // توسعة الصيغة العلمية للعدد الوارد، دون ضرب أو تقريب قيمته المالية.
      const exponent = /^(-?)(\d+)(?:\.(\d+))?e([+-]?\d+)$/i.exec(text)
      if (exponent) {
        const digits = exponent[2] + (exponent[3] ?? ''), point = exponent[2].length + Number(exponent[4])
        text = exponent[1] + (point <= 0 ? '0.' + '0'.repeat(-point) + digits : point >= digits.length ? digits + '0'.repeat(point - digits.length) : digits.slice(0, point) + '.' + digits.slice(point))
      }
    } else if (typeof value === 'string') text = value
    else throw new PayrollDecimalError('INPUT_INVALID', 'القيمة يجب أن تكون عددًا أو نصًا عشريًا')
    if (text.length > PAYROLL_DECIMAL_LIMITS.inputCharacters || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text) || text.replace(/[^0-9]/g, '').length > PAYROLL_DECIMAL_LIMITS.inputDigits) {
      throw new PayrollDecimalError('INPUT_INVALID', 'صيغة عشرية غير صالحة أو تجاوز حد 60 رقمًا و80 محرفًا')
    }
    const negative = text[0] === '-', unsigned = text.replace(/^[+-]/, ''), [whole, fraction = ''] = unsigned.split('.')
    return new PayrollDecimal(BigInt((whole || '0') + fraction) * (negative ? -1n : 1n), 10n ** BigInt(fraction.length), spend)
  }

  add(other: PayrollDecimal) { return new PayrollDecimal(this.numerator * other.denominator + other.numerator * this.denominator, this.denominator * other.denominator, this.spend) }
  subtract(other: PayrollDecimal) { return this.add(other.negate()) }
  multiply(other: PayrollDecimal) { return new PayrollDecimal(this.numerator * other.numerator, this.denominator * other.denominator, this.spend) }
  divide(other: PayrollDecimal) { return new PayrollDecimal(this.numerator * other.denominator, this.denominator * other.numerator, this.spend) }
  negate() { return new PayrollDecimal(-this.numerator, this.denominator, this.spend) }
  absolute() { return new PayrollDecimal(abs(this.numerator), this.denominator, this.spend) }
  compare(other: PayrollDecimal) {
    this.spend(); const left = this.numerator * other.denominator, right = other.numerator * this.denominator
    bounded(left); bounded(right)
    return left < right ? -1 : left > right ? 1 : 0
  }
  isZero() { return this.numerator === 0n }
  integerInRange(min: number, max: number) {
    if (this.denominator !== 1n || this.numerator < BigInt(min) || this.numerator > BigInt(max)) return null
    return Number(this.numerator)
  }
  round(scale: number, mode: PayrollRoundingMode) {
    this.spend()
    if (!Number.isInteger(scale) || scale < 0 || scale > 6) throw new PayrollDecimalError('ROUND_SCALE_INVALID', 'عدد منازل التقريب يجب أن يكون صحيحًا من 0 إلى 6')
    const factor = 10n ** BigInt(scale), scaled = this.numerator * factor
    bounded(scaled)
    let units = scaled / this.denominator
    const remainder = abs(scaled % this.denominator), sign = scaled < 0n ? -1n : 1n
    if (remainder) {
      if (mode === 'FLOOR' && sign < 0n) units -= 1n
      else if (mode === 'CEIL' && sign > 0n) units += 1n
      else if (mode === 'HALF_UP' && remainder * 2n >= this.denominator) units += sign
      else if (mode === 'HALF_EVEN' && (remainder * 2n > this.denominator || (remainder * 2n === this.denominator && abs(units) % 2n === 1n))) units += sign
    }
    return new PayrollDecimal(units, factor, this.spend)
  }
  format(scale: number, mode: PayrollRoundingMode) {
    const rounded = this.round(scale, mode), units = rounded.numerator * (10n ** BigInt(scale)) / rounded.denominator
    const digits = abs(units).toString().padStart(scale + 1, '0')
    return (units < 0n ? '-' : '') + (scale ? digits.slice(0, -scale) + '.' + digits.slice(-scale) : digits)
  }
  canonical() {
    // المدخلات العشرية والتقريب منتهية فقط؛ لا تُستخدم هذه الدالة لقَطع ناتج القسمة الدوري.
    let denominator = this.denominator, twos = 0, fives = 0
    while (denominator % 2n === 0n) { this.spend(); denominator /= 2n; twos++ }
    while (denominator % 5n === 0n) { this.spend(); denominator /= 5n; fives++ }
    if (denominator !== 1n) throw new PayrollDecimalError('INPUT_INVALID', 'لا يمكن تمثيل هذا الكسر كنص عشري منتهٍ')
    const scale = Math.max(twos, fives), units = this.numerator * 2n ** BigInt(scale - twos) * 5n ** BigInt(scale - fives)
    const digits = abs(units).toString().padStart(scale + 1, '0')
    const text = scale ? (digits.slice(0, -scale) + '.' + digits.slice(-scale)).replace(/0+$/, '').replace(/\.$/, '') : digits
    return (units < 0n ? '-' : '') + text
  }
}
