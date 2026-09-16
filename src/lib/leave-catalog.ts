'use client'

import { useEffect, useState } from 'react'
import { fetchActiveLeaveTypes, type ApiLeaveTypeOption } from '@/lib/api'

// Historical rows may reference a disabled standard type. Current catalog names
// always win; these labels are display fallbacks, never submission options.
const HISTORICAL_LABELS: Record<string, string> = {
  ANNUAL: 'إجازة سنوية', SICK: 'إجازة مرضية', CASUAL: 'إجازة عارضة',
  UNPAID: 'إجازة بدون راتب', MATERNITY: 'إجازة وضع', PATERNITY: 'إجازة أبوة',
  HAJJ: 'إجازة حج', MARRIAGE: 'إجازة زواج', BEREAVEMENT: 'إجازة وفاة/عدة',
  EXAM: 'إجازة امتحانات', COMPENSATORY: 'إجازة تعويضية',
}

export const LEAVE_COLORS: Record<string, { color: string; hex: string }> = {
  ANNUAL: { color: 'bg-blue-500', hex: '#3B82F6' },
  SICK: { color: 'bg-red-500', hex: '#EF4444' },
  CASUAL: { color: 'bg-orange-500', hex: '#F97316' },
  UNPAID: { color: 'bg-gray-500', hex: '#6B7280' },
  MATERNITY: { color: 'bg-purple-500', hex: '#A855F7' },
  PATERNITY: { color: 'bg-indigo-500', hex: '#6366F1' },
  HAJJ: { color: 'bg-green-500', hex: '#22C55E' },
  MARRIAGE: { color: 'bg-pink-500', hex: '#EC4899' },
  BEREAVEMENT: { color: 'bg-gray-500', hex: '#6B7280' },
  EXAM: { color: 'bg-teal-500', hex: '#14B8A6' },
  COMPENSATORY: { color: 'bg-cyan-500', hex: '#06B6D4' },
}

export function leaveTypeLabel(code: string, types: Pick<ApiLeaveTypeOption, 'code' | 'nameAr'>[] = []): string {
  return types.find((type) => type.code === code)?.nameAr ?? HISTORICAL_LABELS[code] ?? `نوع إجازة (${code})`
}

// ===== قواعد نوع الإجازة في شاشات التقديم (للعرض بس — السيرفر هو اللي بيفرضها) =====
type LeaveRules = Partial<ApiLeaveTypeOption>
const ruleNum = (v: unknown): number | null => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v))

// ALL_DAYS = أيام التقويم كلها؛ سيرفر أقدم من غير countingMode: بدون راتب = تقويم
export const leaveCountsCalendarDays = (lt?: LeaveRules | null): boolean =>
  !!lt && (lt.countingMode ? lt.countingMode === 'ALL_DAYS' : lt.isPaid === false)

export const leaveHalfDayAllowed = (lt?: LeaveRules | null): boolean => lt?.halfDayAllowed !== false

// اسم المرفق لو النوع بيطلبه مع الطلب نفسه (مطلوب/اختياري) — '' لو مش مع الطلب
export function leaveAttachmentName(lt?: LeaveRules | null): string {
  const name = (lt?.requiredAttachment ?? '').trim()
  if (!lt || lt.attachmentTiming === 'AFTER_RETURN') return ''
  if (!lt.attachmentRule) return name // سيرفر أقدم: المرفق المسمى = مطلوب
  return lt.attachmentRule === 'NONE' ? '' : name || 'مستند داعم'
}

// المرفق مطلوب دلوقتي؟ days = المدة المحسوبة (null = لسه ماتحسبتش)
export function leaveAttachmentRequiredNow(lt: LeaveRules | null | undefined, days: number | null): boolean {
  if (!leaveAttachmentName(lt)) return false
  if (!lt?.attachmentRule || lt.attachmentRule === 'REQUIRED') return true
  if (lt.attachmentRule === 'REQUIRED_ABOVE_DAYS') return days !== null && days > (ruleNum(lt.attachmentAboveDays) ?? 0)
  return false
}

// سطر واحد بحدود النوع: الأيام، الإشعار، الأثر الرجعي، نص اليوم، المرفق
export function leaveRulesHint(lt?: LeaveRules | null): string {
  if (!lt) return ''
  const parts: string[] = []
  const unit = leaveCountsCalendarDays(lt) ? 'أيام تقويم' : 'أيام عمل'
  const min = ruleNum(lt.minDaysPerRequest)
  const max = ruleNum(lt.maxDays)
  if (min && min > 0 && max && max > 0) parts.push(`من ${min} لـ ${max} يوم في الطلب (${unit})`)
  else if (min && min > 0) parts.push(`أقل مدة ${min} يوم (${unit})`)
  else if (max && max > 0) parts.push(`أقصى مدة ${max} يوم (${unit})`)
  else parts.push(`بتتحسب ${unit}`)
  if (lt.category === 'OCCASION') {
    const fixed = ruleNum(lt.fixedDays)
    const times = ruleNum(lt.maxTimesPerYear)
    if (fixed && fixed > 0) parts.push(`${fixed} يوم للمرة`)
    if (times && times > 0) parts.push(`${times} مرة في السنة`)
  }
  if (lt.oncePerService) parts.push('مرة واحدة طول الخدمة')
  const notice = ruleNum(lt.noticeDays)
  if (notice && notice > 0) parts.push(`قدّم قبلها بـ${notice} يوم`)
  if (lt.backdateAllowed === false) parts.push('من غير أثر رجعي')
  else if (ruleNum(lt.backdateMaxDays) !== null) parts.push(`أثر رجعي لحد ${ruleNum(lt.backdateMaxDays)} يوم`)
  if (lt.halfDayAllowed === false) parts.push('من غير نص يوم')
  const attachment = (lt.requiredAttachment ?? '').trim() || 'مستند داعم'
  if (lt.attachmentRule && lt.attachmentRule !== 'NONE') {
    const when = lt.attachmentTiming === 'AFTER_RETURN'
      ? `بعد الرجوع خلال ${ruleNum(lt.attachmentDeadlineDays) ?? 7} يوم`
      : 'مع الطلب'
    if (lt.attachmentRule === 'OPTIONAL') parts.push(`${attachment} اختياري`)
    else if (lt.attachmentRule === 'REQUIRED_ABOVE_DAYS') parts.push(`${attachment} ${when} لو المدة أكتر من ${ruleNum(lt.attachmentAboveDays) ?? 0} يوم`)
    else parts.push(`${attachment} ${when}`)
  }
  return parts.join(' · ')
}

export function useLeaveCatalog() {
  const [types, setTypes] = useState<ApiLeaveTypeOption[]>([])
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let cancelled = false
    setError('')
    fetchActiveLeaveTypes()
      .then((rows) => { if (!cancelled) setTypes(rows) })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'تعذر تحميل أنواع الإجازات') })
    return () => { cancelled = true }
  }, [revision])
  return {
    types,
    labels: { ...HISTORICAL_LABELS, ...Object.fromEntries(types.map((type) => [type.code, type.nameAr])) },
    label: (code: string) => leaveTypeLabel(code, types),
    color: (code: string) => LEAVE_COLORS[code]?.color ?? 'bg-gray-400',
    hex: (code: string) => LEAVE_COLORS[code]?.hex ?? '#6B7280',
    error,
    retry: () => setRevision((value) => value + 1),
  }
}
