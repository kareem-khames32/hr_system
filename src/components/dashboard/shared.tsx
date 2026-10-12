'use client'

// B-ADD.3: القطع المشتركة في لوحة الإدارة — تحميل كل قسم لوحده، وألوان الحالة، ومسار النزول في المستويات.
// B-ADD.20: اللوحة بقت إحصائيات بس — هيكل الكارت القديم ورقم الجدول ونافذة القايمة اتشالوا مع الجداول، والنزول بقى
// «فرع ← إدارة ← قسم ← فريق» (الفرع بيتبعت كتضييق لفلتر اللوحة، والوحدة والفريق كـgroup).
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import type { CardGroupLabel, DashboardTone } from '@/lib/dashboard-api'
import type { OrgFilterParams } from '@/lib/org-filter'

export const TONE_TEXT: Record<DashboardTone, string> = {
  green: 'text-success-600', yellow: 'text-warning-600', red: 'text-danger-600', blue: 'text-primary-600', gray: 'text-gray-600',
}
export const TONE_BG: Record<DashboardTone, string> = {
  green: 'bg-success-50', yellow: 'bg-warning-50', red: 'bg-danger-50', blue: 'bg-primary-50', gray: 'bg-gray-100',
}
export const TONE_DOT: Record<DashboardTone, string> = {
  green: 'bg-success-500', yellow: 'bg-warning-500', red: 'bg-danger-500', blue: 'bg-primary-500', gray: 'bg-gray-400',
}

export const num = (value: number) => Number(value ?? 0).toLocaleString('en-US')
export const rate = (value: number | null) => (value === null ? '—' : `${value}%`)

/** تحميل قسم: كل قسم بنداءه وحالته، وإعادة المحاولة بتاعته — قسم بطيء أو واقع مابيوقّفش الباقي */
export function useCard<T>(load: () => Promise<T>, key: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const loader = useRef(load)
  loader.current = load
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    loader.current()
      .then((value) => { if (!cancelled) setData(value) })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'تعذر تحميل الأرقام') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [key, revision])
  const reload = useCallback(() => setRevision((value) => value + 1), [])
  return { data, loading, error, reload }
}

// ===== «فرع ← إدارة ← قسم ← فريق»: المستوى المفتوح ومساره =====
/** خطوة نزول: فرع (بيضيّق فلتر اللوحة) أو مجموعة (unit:12 · team:5 …) */
export interface DrillStep { name: string; group?: string; branchId?: number }

export const drillStepKey = (step: DrillStep) => `${step.branchId ?? ''}|${step.group ?? ''}`

export function useDrill(resetKey: string) {
  const [path, setPath] = useState<DrillStep[]>([])
  // تغيير فلتر اللوحة بيرجّع الرسمة لأول مستوى
  useEffect(() => { setPath([]) }, [resetKey])
  const branchId = path.find((step) => step.branchId !== undefined)?.branchId
  const group = path.length ? path[path.length - 1].group : undefined
  return {
    path,
    active: path.length > 0,
    /** المجموعة المفتوحة (آخر خطوة) — من غير قيمة لو آخر خطوة فرع */
    group,
    /** الفرع المختار من الرسمة */
    branchId,
    /** مفتاح ثابت للمستوى المفتوح (لاعتماديات التحميل) */
    key: path.map(drillStepKey).join('>'),
    /** فلتر اللوحة ومعاه الفرع المختار من الرسمة */
    orgOf: (org: OrgFilterParams): OrgFilterParams => (branchId === undefined ? org : { ...org, branchId }),
    open: (step: DrillStep) => setPath((current) => [...current, step]),
    back: (depth: number) => setPath((current) => current.slice(0, depth)),
  }
}

export function DrillPath({ path, start, onBack }: { path: DrillStep[]; start: CardGroupLabel | null; onBack: (depth: number) => void }) {
  if (!path.length && !start) return null
  const root = start && !path.length ? start.name : 'الكل'
  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm mb-3" aria-label="المستوى المفتوح">
      {path.length ? (
        <button type="button" onClick={() => onBack(0)} className="text-primary-600 hover:underline">الكل</button>
      ) : (
        <span className="font-medium text-gray-700">{root}</span>
      )}
      {path.map((step, index) => (
        <span key={drillStepKey(step)} className="flex items-center gap-1">
          <ChevronLeft size={14} className="text-gray-400" />
          {index === path.length - 1
            ? <span className="font-medium text-gray-700">{step.name}</span>
            : <button type="button" onClick={() => onBack(index + 1)} className="text-primary-600 hover:underline">{step.name}</button>}
        </span>
      ))}
    </nav>
  )
}
