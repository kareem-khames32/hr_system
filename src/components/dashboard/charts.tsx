'use client'

// B-ADD.7: رسوم لوحة الإدارة الإحصائية — SVG وعناصر بسيطة من غير مكتبة: خط اتجاه، دايرة، أعمدة أفقية ورأسية، وشريط مقسّم.
// اللون دايمًا معاه رقم وتسمية (مش لون لوحده)، والنص بلون النص مش بلون السلسلة. كل رسمة بتتمدد بعرض مكانها.
import { useState, type ReactNode } from 'react'
import type { DashboardTone } from '@/lib/dashboard-api'
import { TONE_DOT, num } from './cards/shared'

// ألوان السلاسل: كلاس لون النص + currentColor في الرسم (نفس ألوان الحالة في باقي اللوحة)
export const TONE_INK: Record<DashboardTone, string> = {
  green: 'text-success-500', yellow: 'text-warning-500', red: 'text-danger-500', blue: 'text-primary-500', gray: 'text-gray-400',
}

export function Legend({ items }: { items: Array<{ label: string; tone: DashboardTone; value?: ReactNode; dashed?: boolean }> }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600" data-chart-legend>
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          {item.dashed
            ? <span className={`w-4 border-t-2 border-dashed ${TONE_INK[item.tone]} border-current`} aria-hidden="true" />
            : <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${TONE_DOT[item.tone]}`} aria-hidden="true" />}
          <span>{item.label}</span>
          {item.value !== undefined && <span className="font-semibold text-gray-800">{item.value}</span>}
        </li>
      ))}
    </ul>
  )
}

// ===== دايرة التوزيع =====
export interface DonutSegment { key: string; label: string; value: number; tone: DashboardTone }

export function Donut({ segments, centerLabel, centerValue, onPick }: {
  segments: DonutSegment[]
  centerLabel: string
  centerValue: ReactNode
  onPick?: (key: string) => void
}) {
  const shown = segments.filter((segment) => segment.value > 0)
  const total = shown.reduce((sum, segment) => sum + segment.value, 0)
  const radius = 42, around = 2 * Math.PI * radius
  let offset = 0
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4" data-chart="donut">
      <svg viewBox="0 0 120 120" className="w-36 h-36 shrink-0" role="img" aria-label={`${centerLabel}: ${shown.map((segment) => `${segment.label} ${segment.value}`).join('، ')}`}>
        <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="14" className="text-gray-100" stroke="currentColor" />
        {total > 0 && shown.map((segment) => {
          const length = (segment.value / total) * around
          const arc = (
            <circle key={segment.key} cx="60" cy="60" r={radius} fill="none" strokeWidth="14" stroke="currentColor" className={TONE_INK[segment.tone]}
              strokeDasharray={`${Math.max(0, length - 1.5)} ${around - Math.max(0, length - 1.5)}`} strokeDashoffset={-offset} transform="rotate(-90 60 60)" />
          )
          offset += length
          return arc
        })}
        <text x="60" y="58" textAnchor="middle" className="fill-gray-800" fontSize="20" fontWeight="700">{centerValue}</text>
        <text x="60" y="74" textAnchor="middle" className="fill-gray-500" fontSize="9">{centerLabel}</text>
      </svg>
      <ul className="grid grid-cols-2 sm:grid-cols-1 gap-x-4 gap-y-1.5 text-sm min-w-0 w-full">
        {segments.map((segment) => {
          const share = total > 0 ? Math.round((segment.value / total) * 100) : 0
          const row = (
            <>
              <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${TONE_DOT[segment.tone]}`} aria-hidden="true" />
              <span className="text-gray-600 truncate">{segment.label}</span>
              <span className="font-semibold text-gray-800 ms-auto">{num(segment.value)}</span>
              <span className="text-xs text-gray-400 w-9 text-end">{share}%</span>
            </>
          )
          return (
            <li key={segment.key} className="min-w-0">
              {onPick && segment.value > 0
                ? <button type="button" onClick={() => onPick(segment.key)} title="اضغط للأسماء" className="flex items-center gap-2 w-full rounded-lg px-1.5 py-0.5 hover:bg-gray-50 text-start">{row}</button>
                : <div className="flex items-center gap-2 px-1.5 py-0.5">{row}</div>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ===== خط الاتجاه =====
export interface LineSeries { key: string; label: string; tone: DashboardTone; dashed?: boolean; values: Array<number | null> }

/** خطوط نسب (0–100) على أيام؛ اليوم اللي من غير قيمة فجوة في الخط. المرور على الرسمة بيعرض قيم اليوم. */
export function LineChart({ series, labels, label, suffix = '%' }: { series: LineSeries[]; labels: string[]; label: string; suffix?: string }) {
  const [at, setAt] = useState<number | null>(null)
  const width = 600, height = 200, left = 34, right = 8, top = 10, bottom = 22
  const count = Math.max(1, labels.length - 1)
  const x = (index: number) => left + (index / count) * (width - left - right)
  const y = (value: number) => top + (1 - Math.min(100, Math.max(0, value)) / 100) * (height - top - bottom)
  const pathOf = (values: Array<number | null>) => {
    let path = '', open = false
    values.forEach((value, index) => {
      if (value === null || value === undefined) { open = false; return }
      path += `${open ? 'L' : 'M'}${x(index).toFixed(1)} ${y(value).toFixed(1)} `
      open = true
    })
    return path.trim()
  }
  const ticks = [0, 25, 50, 75, 100]
  const marks = labels.length <= 1 ? [0] : [0, Math.floor(count / 2), count]
  const pick = (clientX: number, box: DOMRect) => {
    const inside = ((clientX - box.left) / box.width) * width
    const index = Math.round(((inside - left) / (width - left - right)) * count)
    setAt(Math.min(count, Math.max(0, index)))
  }
  return (
    <div data-chart="line">
      {/* محور الزمن من الشمال لليمين زي أي رسم اتجاه — الاتجاه هنا للرسمة مش للنص */}
      <div dir="ltr" className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label={label}
          onMouseMove={(event) => pick(event.clientX, event.currentTarget.getBoundingClientRect())} onMouseLeave={() => setAt(null)}
          onTouchStart={(event) => pick(event.touches[0].clientX, event.currentTarget.getBoundingClientRect())}>
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} className="text-gray-100" stroke="currentColor" strokeWidth="1" />
              <text x={left - 6} y={y(tick) + 3} textAnchor="end" fontSize="10" className="fill-gray-400">{tick}{suffix}</text>
            </g>
          ))}
          {marks.map((index) => (
            <text key={index} x={x(index)} y={height - 6} textAnchor={index === 0 ? 'start' : index === count ? 'end' : 'middle'} fontSize="10" className="fill-gray-400">{labels[index]?.slice(5)}</text>
          ))}
          {series.map((line) => (
            <path key={line.key} d={pathOf(line.values)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
              strokeDasharray={line.dashed ? '6 4' : undefined} className={TONE_INK[line.tone]} />
          ))}
          {at !== null && (
            <g>
              <line x1={x(at)} x2={x(at)} y1={top} y2={height - bottom} className="text-gray-300" stroke="currentColor" strokeWidth="1" />
              {series.map((line) => line.values[at] !== null && line.values[at] !== undefined && (
                <circle key={line.key} cx={x(at)} cy={y(line.values[at] as number)} r="3.5" stroke="white" strokeWidth="1.5" fill="currentColor" className={TONE_INK[line.tone]} />
              ))}
            </g>
          )}
        </svg>
      </div>
      <p className="text-xs text-gray-600 min-h-[1.25rem] mt-1" aria-live="polite">
        {at !== null && (
          <>
            <span className="font-semibold text-gray-800">{labels[at]}</span>
            {series.map((line) => (
              <span key={line.key} className="ms-3">{line.label}: <span className="font-semibold text-gray-800">{line.values[at] === null || line.values[at] === undefined ? '—' : `${line.values[at]}${suffix}`}</span></span>
            ))}
          </>
        )}
      </p>
    </div>
  )
}

// ===== أعمدة أفقية =====
export interface HBarRow { key: string; label: string; value: number; display?: ReactNode; hint?: ReactNode; tone: DashboardTone; onClick?: () => void; title?: string }

/** صف لكل بند: الاسم، شريط بطول قيمته، والرقم — والصف زرار لو بيفتح تفاصيل */
export function HBars({ rows, max, empty }: { rows: HBarRow[]; max?: number; empty: ReactNode }) {
  if (!rows.length) return <p className="text-sm text-gray-500 py-3">{empty}</p>
  const top = max ?? Math.max(1, ...rows.map((row) => row.value))
  return (
    <ul className="space-y-2" data-chart="hbars">
      {rows.map((row) => {
        const width = top > 0 ? Math.max(row.value > 0 ? 2 : 0, Math.round((row.value / top) * 100)) : 0
        const body = (
          <>
            <span className="flex items-baseline justify-between gap-2 text-sm">
              <span className="text-gray-700 truncate">{row.label}</span>
              <span className="shrink-0">
                {row.hint && <span className="text-xs text-gray-400 me-2">{row.hint}</span>}
                <span className="font-semibold text-gray-800">{row.display ?? num(row.value)}</span>
              </span>
            </span>
            <span className="block h-2.5 rounded-full bg-gray-100 overflow-hidden mt-1" aria-hidden="true">
              <span className={`block h-full rounded-full ${TONE_DOT[row.tone]}`} style={{ width: `${width}%` }} />
            </span>
          </>
        )
        return (
          <li key={row.key} className="min-w-0">
            {row.onClick
              ? <button type="button" onClick={row.onClick} title={row.title ?? 'اضغط للتفاصيل'} className="block w-full text-start rounded-lg px-1.5 py-1 hover:bg-gray-50">{body}</button>
              : <div className="px-1.5 py-1">{body}</div>}
          </li>
        )
      })}
    </ul>
  )
}

// ===== أعمدة رأسية مزدوجة (شهر بشهر) =====
export function PairedColumns({ groups, first, second, label }: {
  groups: Array<{ key: string; label: string; first: number; second: number }>
  first: { label: string; tone: DashboardTone }
  second: { label: string; tone: DashboardTone }
  label: string
}) {
  const top = Math.max(1, ...groups.flatMap((group) => [group.first, group.second]))
  const heightOf = (value: number) => `${value > 0 ? Math.max(4, Math.round((value / top) * 100)) : 0}%`
  return (
    <div data-chart="columns" role="img" aria-label={`${label}: ${groups.map((group) => `${group.label} ${first.label} ${group.first} ${second.label} ${group.second}`).join('، ')}`}>
      <div className="flex items-end gap-2 h-36">
        {groups.map((group) => (
          <div key={group.key} className="flex-1 min-w-0 h-full flex items-end justify-center gap-1">
            {[{ value: group.first, tone: first.tone }, { value: group.second, tone: second.tone }].map((bar, index) => (
              <div key={index} className="flex-1 max-w-[1.5rem] h-full flex flex-col justify-end items-center gap-0.5">
                <span className="text-[11px] text-gray-600">{bar.value || ''}</span>
                <span className={`block w-full rounded-t ${TONE_DOT[bar.tone]}`} style={{ height: heightOf(bar.value) }} />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="flex gap-2 border-t border-gray-200 pt-1">
        {groups.map((group) => <span key={group.key} className="flex-1 min-w-0 text-center text-[11px] text-gray-500 truncate">{group.label}</span>)}
      </div>
    </div>
  )
}

// ===== شريط واحد مقسّم =====
export function StackedBar({ segments, label }: { segments: Array<{ key: string; label: string; value: number; tone: DashboardTone }>; label: string }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)
  return (
    <div data-chart="stacked">
      <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 gap-0.5" role="img" aria-label={`${label}: ${segments.map((segment) => `${segment.label} ${segment.value}`).join('، ')}`}>
        {total > 0 && segments.filter((segment) => segment.value > 0).map((segment) => (
          <span key={segment.key} className={`h-full ${TONE_DOT[segment.tone]}`} style={{ width: `${(segment.value / total) * 100}%` }} />
        ))}
      </div>
      <div className="mt-2"><Legend items={segments.map((segment) => ({ label: segment.label, tone: segment.tone, value: num(segment.value) }))} /></div>
    </div>
  )
}

// ===== مؤشر فوق =====
export function Kpi({ label, value, hint, tone, hintTone, icon, onClick, loading }: {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone: DashboardTone
  hintTone?: DashboardTone
  icon: ReactNode
  onClick?: () => void
  loading?: boolean
}) {
  const hintClass = hintTone === 'red' ? 'text-danger-600' : hintTone === 'green' ? 'text-success-600' : hintTone === 'yellow' ? 'text-warning-600' : 'text-gray-400'
  const body = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="text-sm text-gray-500 truncate">{label}</span>
        <span className={`shrink-0 ${TONE_INK[tone]}`} aria-hidden="true">{icon}</span>
      </span>
      <span className={`block text-3xl font-bold text-gray-900 mt-1 ${loading ? 'opacity-40' : ''}`}>{value}</span>
      <span className={`block text-xs mt-1 min-h-[1rem] ${hintClass}`}>{hint}</span>
    </>
  )
  const className = 'block w-full text-start bg-white rounded-2xl shadow-sm border border-gray-100 p-4 min-w-0'
  return onClick
    ? <button type="button" onClick={onClick} title="اضغط للتفاصيل" className={`${className} hover:border-primary-500/40 hover:shadow transition-shadow`} data-kpi>{body}</button>
    : <div className={className} data-kpi>{body}</div>
}
