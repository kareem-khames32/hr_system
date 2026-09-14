import type { ApiAttendanceDay } from '@/lib/api'

const outcomeLabels: Record<string, string> = { WITHIN_WINDOW: 'داخل نافذة المرونة', BEFORE_START: 'حضور قبل بداية الدوام',
  AFTER_WINDOW: 'بعد نافذة المرونة', INVALID_CONFIGURATION: 'إعداد الدوام يحتاج مراجعة', MISSING_PUNCH: 'بصمة ناقصة' }
const duration = (minutes: number) => `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`

export function AttendanceFlexSummary({ day }: { day: ApiAttendanceDay }) {
  const rule = day.attendanceRuleSnapshot
  if (day.provenance === 'LEGACY_STORED') return <p className="mt-2 text-xs text-gray-500">سجل سابق محفوظ؛ تفاصيل حساب المرونة غير مسجلة.</p>
  if (!rule && !day.attendanceReviewRequired) return null
  return <div className="mt-2 space-y-1 text-xs">
    {rule?.flexEnabled && <p className="text-blue-700">{outcomeLabels[day.flexOutcome ?? ''] ?? 'مرونة الحضور'} · النافذة {rule.flexWindowMinutes} د</p>}
    {day.countedWorkMinutes != null && rule && <p className="text-gray-500">المحتسب {duration(day.countedWorkMinutes)} / المطلوب {duration(rule.effectiveRequiredWorkMinutes)}</p>}
    {Number(day.shortfallMinutes ?? 0) > 0 && <p className="font-medium text-amber-800">نقص ساعات العمل: {day.shortfallMinutes} دقيقة</p>}
    {day.attendanceReviewRequired && <p className="rounded bg-amber-50 p-1 text-amber-900">{day.attendanceReviewReason ?? 'مراجعة الحضور مطلوبة قبل اعتماد الراتب'}</p>}
  </div>
}
