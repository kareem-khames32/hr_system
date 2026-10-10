'use client'

// B-ADD.3: القطع المشتركة بين كروت لوحة الإدارة — هيكل الكارت (عنوان، «شوف الكل»، تحميل وخطأ لكل كارت لوحده)، والرقم الملوّن،
// ومسار «إدارة ← قسم ← فريق»، ونافذة القايمة. الملخص فوق والتفاصيل بالضغط، والحالة بلون ومعاها رقم دايمًا.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, RefreshCw, X } from 'lucide-react'
import ModuleLink from '@/components/ModuleLink'
import type { CardGroupLabel, DashboardTone } from '@/lib/dashboard-api'

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

/** تحميل كارت: كل كارت بنداءه وحالته، وإعادة المحاولة بتاعته — كارت بطيء أو واقع مابيوقّفش الباقي */
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
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'تعذر تحميل الكارت') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [key, revision])
  const reload = useCallback(() => setRevision((value) => value + 1), [])
  return { data, loading, error, reload }
}

export function CardShell({
  title, subtitle, href, loading, error, onRetry, children, wide = false, cardKey,
}: {
  title: string
  subtitle?: ReactNode
  // الشاشة الكاملة («شوف الكل») — من غير لينك لو موديولها مقفول
  href?: string
  loading: boolean
  error: string
  onRetry: () => void
  children: ReactNode
  wide?: boolean
  cardKey: string
}) {
  return (
    <section className={`card min-w-0 ${wide ? 'lg:col-span-2' : ''}`} data-dashboard-card={cardKey}>
      <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        {href && (
          <ModuleLink href={href} className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline shrink-0" fallback={null}>
            شوف الكل
            <ChevronLeft size={14} />
          </ModuleLink>
        )}
      </div>
      {error ? (
        <p role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">
          {error}{' '}
          <button type="button" onClick={onRetry} className="underline inline-flex items-center gap-1">
            <RefreshCw size={12} />
            إعادة المحاولة
          </button>
        </p>
      ) : loading && !children ? (
        <div className="flex items-center justify-center py-8" aria-busy="true">
          <div className="w-7 h-7 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className={loading ? 'opacity-60 transition-opacity' : undefined}>{children}</div>
      )}
    </section>
  )
}

/** رقم بلونه وتسميته — زرار لو بيفتح تفاصيل */
export function Stat({ label, value, tone, onClick, hint }: { label: string; value: ReactNode; tone: DashboardTone; onClick?: () => void; hint?: string }) {
  const body = (
    <>
      <span className={`text-2xl font-bold ${TONE_TEXT[tone]}`}>{value}</span>
      <span className="flex items-center gap-1.5 text-xs text-gray-600">
        <span className={`w-2 h-2 rounded-full shrink-0 ${TONE_DOT[tone]}`} />
        {label}
      </span>
      {hint && <span className="text-[11px] text-gray-400">{hint}</span>}
    </>
  )
  const className = `flex flex-col items-start gap-1 rounded-xl px-3 py-2.5 min-w-0 text-start ${TONE_BG[tone]}`
  return onClick
    ? <button type="button" onClick={onClick} className={`${className} hover:ring-2 hover:ring-primary-500/30 transition-shadow`} title="اضغط للتفاصيل">{body}</button>
    : <div className={className}>{body}</div>
}

/** رقم صغير جوه جدول — بلونه، وزرار لو بيفتح أسماء (الصفر مش زرار) */
export function Count({ value, tone, onClick, label }: { value: number; tone: DashboardTone; onClick?: () => void; label: string }) {
  if (!value) return <span className="text-gray-300">0</span>
  if (!onClick) return <span className={`font-semibold ${TONE_TEXT[tone]}`}>{num(value)}</span>
  return (
    <button type="button" onClick={onClick} aria-label={`${label}: ${value}`} className={`font-semibold underline-offset-2 hover:underline px-1.5 py-0.5 rounded ${TONE_TEXT[tone]} ${TONE_BG[tone]}`}>
      {num(value)}
    </button>
  )
}

// ===== «إدارة ← قسم ← فريق»: المستوى المفتوح ومساره =====
export interface DrillStep { group: string; name: string }

export function useDrill(resetKey: string) {
  const [path, setPath] = useState<DrillStep[]>([])
  // تغيير فلتر اللوحة بيرجّع الكارت لأول مستوى
  useEffect(() => { setPath([]) }, [resetKey])
  return {
    path,
    group: path.length ? path[path.length - 1].group : undefined,
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
        <span key={step.group} className="flex items-center gap-1">
          <ChevronLeft size={14} className="text-gray-400" />
          {index === path.length - 1
            ? <span className="font-medium text-gray-700">{step.name}</span>
            : <button type="button" onClick={() => onBack(index + 1)} className="text-primary-600 hover:underline">{step.name}</button>}
        </span>
      ))}
    </nav>
  )
}

/** نافذة قايمة بتتفتح بالضغط على رقم — جوه الشاشة على الموبايل وبتمرير داخلي */
export function ListModal({ title, subtitle, onClose, children }: { title: string; subtitle?: ReactNode; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-3xl p-5 shadow-xl max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-label={title}
        onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-800">{title}</h2>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 shrink-0">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export const Empty = ({ children }: { children: ReactNode }) => <p className="text-sm text-gray-500 py-3">{children}</p>

/** شريط نسبة أفقي بسيط */
export function Bar({ value, max, tone }: { value: number; max: number; tone: DashboardTone }) {
  const width = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0
  return (
    <div className="h-2 rounded-full bg-gray-100 overflow-hidden" aria-hidden="true">
      <div className={`h-full rounded-full ${TONE_DOT[tone]}`} style={{ width: `${width}%` }} />
    </div>
  )
}
