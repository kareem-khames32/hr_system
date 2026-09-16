import type { PayrollRoundingMode } from './payroll-decimal'

/**
 * قرار المالك (16 سبتمبر): لا تقريب للفلوس — منزلتان بالقص نحو الصفر (1234.567 ← 1234.56، و-1.239 ← -1.23).
 * هذا المساعد الواحد للمسير والخصومات والمكافآت والسلف ونهاية الخدمة والتصفية، والمنسّق في الواجهة (src/lib/money.ts) بالقاعدة نفسها.
 */
export const PAYROLL_MONEY_ROUNDING: PayrollRoundingMode = 'DOWN'

// أكبر قيمة نثبّتها على 6 منازل بعدد صحيح آمن (≈ 9 مليار).
const MICRO_LIMIT = Number.MAX_SAFE_INTEGER / 1e6

/**
 * قص المبلغ على منزلتين نحو الصفر بقروش صحيحة. القيمة تُثبّت أولًا على 6 منازل لإزالة ضجيج التمثيل الثنائي
 * (0.1 + 0.2 = 0.30000000000000004، و1.15 × 100 = 114.99999999999999) حتى لا يسقط قرش حقيقي، ثم يُقص الباقي.
 */
export function roundPayrollMoney(value: number): number {
  if (!Number.isFinite(value) || value === 0) return 0
  const magnitude = Math.abs(value)
  const cents = magnitude < MICRO_LIMIT
    ? Math.trunc(Math.round(magnitude * 1e6) / 1e4)
    : Math.trunc(magnitude * 100)
  return cents === 0 ? 0 : Math.sign(value) * cents / 100
}

/** نص المبلغ بمنزلتين مقصوصتين (بلا تقريب): «1234.56». */
export function payrollMoneyText(value: number): string {
  return roundPayrollMoney(value).toFixed(2)
}

/**
 * التقريب القديم (نصف لأعلى) للتحقق من لقطات مالية حُفظت قبل قرار القص فقط — لا يُستخدم لحساب مبلغ جديد.
 */
export function legacyHalfUpPayrollMoney(value: number): number {
  const scaled = Math.abs(value) * 100
  const tolerance = Number.EPSILON * Math.max(1, scaled) * 4
  return Math.sign(value) * Math.round(scaled + tolerance) / 100
}

/** مبلغ محفوظ يطابق القيمة بقاعدة القص الحالية، أو بالتقريب القديم للقطات السابقة للقرار. */
export function matchesStoredPayrollMoney(value: number, stored: number): boolean {
  return roundPayrollMoney(value) === stored || legacyHalfUpPayrollMoney(value) === stored
}
