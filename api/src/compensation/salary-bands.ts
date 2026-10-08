// B5.1 (أ): سلّم الرواتب — نطاق الدرجة (أدنى، منتصف، أقصى) ونسبة المقارنة. حساب نقي من غير قاعدة بيانات.
// النطاق هو حدود الدرجة الموجودة (grades.minSalary / maxSalary)؛ المنتصف مشتق = (الأدنى + الأقصى) ÷ 2، من غير عمود جديد.
// نسبة المقارنة = راتب الموظف ÷ منتصف النطاق. أساس الراتب إعداد: الأساسي (الافتراضي) أو إجمالي المكونات الشهرية الثابتة.

export const BAND_BASIS_KEY = 'compensation.band_basis'
export type BandBasis = 'BASIC' | 'GROSS'
export const BAND_BASIS_LABELS: Readonly<Record<BandBasis, string>> = { BASIC: 'الراتب الأساسي', GROSS: 'إجمالي المكونات الثابتة' }
export const bandBasisOf = (value: string | null | undefined): BandBasis => (value === 'GROSS' ? 'GROSS' : 'BASIC')

export interface SalaryBand { min: number; mid: number; max: number }
export type BandPosition = 'BELOW' | 'WITHIN' | 'ABOVE'
export const BAND_POSITION_LABELS: Readonly<Record<BandPosition, string>> = { BELOW: 'تحت الأدنى', WITHIN: 'جوه النطاق', ABOVE: 'فوق الأقصى' }

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
const amount = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

/** نطاق الدرجة، أو null لو حد من الحدين مش متحدد أو الأدنى أكبر من الأقصى أو الأقصى صفر */
export function salaryBandOf(grade: { minSalary?: unknown; maxSalary?: unknown } | null | undefined): SalaryBand | null {
  const min = amount(grade?.minSalary), max = amount(grade?.maxSalary)
  if (min === null || max === null || min > max || max <= 0) return null
  return { min: round2(min), mid: round2((min + max) / 2), max: round2(max) }
}

/** نسبة المقارنة (الراتب ÷ منتصف النطاق) بمنزلتين، أو null من غير نطاق */
export function compaRatio(salary: number, band: SalaryBand | null): number | null {
  return band && band.mid > 0 && Number.isFinite(salary) ? round2(salary / band.mid) : null
}

/** موقع الراتب من النطاق، أو null من غير نطاق */
export function bandPosition(salary: number, band: SalaryBand | null): BandPosition | null {
  if (!band || !Number.isFinite(salary)) return null
  return salary < band.min ? 'BELOW' : salary > band.max ? 'ABOVE' : 'WITHIN'
}

/** راتب المقارنة حسب الأساس: الأساسي، أو مجموع المكونات الشهرية الست */
export function bandSalaryOf(amounts: { basic: number; gross: number }, basis: BandBasis): number {
  return round2(basis === 'GROSS' ? amounts.gross : amounts.basic)
}
