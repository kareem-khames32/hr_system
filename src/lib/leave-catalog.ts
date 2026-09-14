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
