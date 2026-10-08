import { statutoryAt, statutoryNumber, type StatutoryEntry } from '../statutory/statutory'

// B4.5 (د): الحد القانوني لغرامات الشهر (أيام الخصم الجزائي) من حزمة الدولة (C-SA-07) — حساب نقي من غير قاعدة بيانات.
// ورا إعداد مقفول بيتفتح من مسار الحسابات القانونية بس (صف الحزمة لازم «اتأكد»). مقفول = لائحة الجزاءات زي ما هي بالحرف.
// السعودية: الغرامة عن المخالفة الواحدة وغرامات الشهر كله بحد أقصى أيام محددة. مصر مالهاش رقم غرامات في الحزمة = من غير حد.

export const PENALTY_FINE_CAP_KEY = 'cases.penalty_fine_cap.enabled'
export const SA_DEDUCTION_CAPS_KEY = 'sa.deduction_caps'

export interface LegalFineCap { maxDays: number; country: 'SA'; key: string; effectiveFrom: string }

/** حد أيام الغرامة في الشهر لدولة فرع الموظف بتاريخ الواقعة، أو null لو الدولة مالهاش حد في الحزمة */
export function legalFineCap(entries: readonly StatutoryEntry[], country: string | null | undefined, date: string): LegalFineCap | null {
  if (String(country ?? '').trim().toUpperCase() !== 'SA') return null
  const row = statutoryAt(entries, 'SA', SA_DEDUCTION_CAPS_KEY, date)
  const maxDays = statutoryNumber(row, 'fine_max_days_per_month')
  return row && maxDays !== null && maxDays > 0 ? { maxDays, country: 'SA', key: SA_DEDUCTION_CAPS_KEY, effectiveFrom: row.effectiveFrom } : null
}

const shown = (days: number) => String(Math.round(days * 100) / 100)
export const fineOverCap = (days: number, maxDays: number) => `الجزاء ده (${shown(days)} يوم) أكتر من الحد القانوني للغرامة (${shown(maxDays)} أيام) لدولة فرع الموظف`
export const fineMonthOverCap = (period: string, total: number, maxDays: number) =>
  `غرامات شهر ${period} للموظف هتبقى ${shown(total)} يوم — الحد القانوني ${shown(maxDays)} أيام في الشهر؛ اختار شهر خصم تاني`

/** رسالة الرفض أو null: الجزاء لوحده، ثم مع غرامات نفس شهر الخصم (usedDays) */
export function fineCapIssue(cap: LegalFineCap | null, days: number, usedDays: number, period: string): string | null {
  if (!cap) return null
  if (days > cap.maxDays) return fineOverCap(days, cap.maxDays)
  return usedDays + days > cap.maxDays + 1e-9 ? fineMonthOverCap(period, usedDays + days, cap.maxDays) : null
}
