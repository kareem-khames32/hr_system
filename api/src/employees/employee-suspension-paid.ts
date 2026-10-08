import { statutoryAt, statutoryNumber, type StatutoryEntry } from '../statutory/statutory'

// B4.5 (د): حد مدة الإيقاف الاحتياطي بأجر من حزمة الدولة (R08، C-EG-07) — حساب نقي من غير قاعدة بيانات.
// الحد بيتطبق لما صف الحزمة «اتأكد» بس: رقم «محتاج تحقق» مايقيّدش حاجة لحد ما المالك يراجعه. السعودية مالهاش رقم في الحزمة.
export const EG_TERMINATION_KEY = 'eg.termination'

/** أقصى أيام للإيقاف بأجر لدولة الفرع يوم البداية، أو null لو مفيش حد (دولة من غير رقم، أو صف لسه «محتاج تحقق») */
export function paidSuspensionMaxDays(entries: readonly StatutoryEntry[], country: string | null | undefined, date: string): number | null {
  if (String(country ?? '').trim().toUpperCase() !== 'EG') return null
  const row = statutoryAt(entries, 'EG', EG_TERMINATION_KEY, date)
  const days = statutoryNumber(row, 'paid_suspension_max_days')
  return row && row.verified && days !== null && days > 0 ? Math.floor(days) : null
}
