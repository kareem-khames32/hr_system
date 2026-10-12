'use client'

// B-ADD.7: رسوم لوحة الإدارة الإحصائية — SVG وعناصر بسيطة من غير مكتبة: خط اتجاه، دايرة، أعمدة أفقية ورأسية، وشريط مقسّم.
// اللون دايمًا معاه رقم وتسمية (مش لون لوحده)، والنص بلون النص مش بلون السلسلة. كل رسمة بتتمدد بعرض مكانها.
// B-ADD.20: + خط صغير جوه المؤشر (Sparkline) وفرقه عن الفترة اللي قبلها، وصفوف مقسّمة بتنزل في المستويات، وحلقة نسبة، وبلاطة رقم،
// وهيكل تحميل. ألوان الحالة ثابتة في كل الرسوم (BUCKET_TONE)، ومحور الزمن من اليمين للشمال (الأقدم يمين) زي اتجاه الصفحة.
import { useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import type { AttendanceBucket, DashboardTone } from '@/lib/dashboard-api'
import type { Delta } from '@/lib/dashboard-insights'
import { num } from './shared'

/** ألوان الرسم: ألوان الحالة الخمسة + تلاتة للخانات اللي كانت بتتشارك لون (مأمورية، راحة، أخرى) */
export type ChartTone = DashboardTone | 'cyan' | 'light' | 'slate'

// ألوان السلاسل: كلاس لون النص + currentColor في الرسم (نفس ألوان الحالة في باقي النظام)
export const TONE_INK: Record<ChartTone, string> = {
  green: 'text-success-500', yellow: 'text-warning-500', red: 'text-danger-500', blue: 'text-primary-500', gray: 'text-gray-400',
  cyan: 'text-cyan-500', light: 'text-gray-300', slate: 'text-slate-600',
}
export const TONE_FILL: Record<ChartTone, string> = {
  green: 'bg-success-500', yellow: 'bg-warning-500', red: 'bg-danger-500', blue: 'bg-primary-500', gray: 'bg-gray-400',
  cyan: 'bg-cyan-500', light: 'bg-gray-300', slate: 'bg-slate-600',
}
/** معنى ثابت لكل لون في كل رسوم الحضور: حاضر أخضر، متأخر أصفر، غايب أحمر، إجازة أزرق، مأمورية سماوي، لسه مابصمش رمادي، راحة رمادي فاتح */
export const BUCKET_TONE: Record<AttendanceBucket, ChartTone> = {
  present: 'green', late: 'yellow', absent: 'red', leave: 'blue', mission: 'cyan', pending: 'gray', rest: 'light', other: 'slate',
}

export function Legend({ items }: { items: Array<{ label: string; tone: ChartTone; value?: ReactNode; dashed?: boolean }> }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600" data-chart-legend>
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          {item.dashed
            ? <span className={`w-4 border-t-2 border-dashed ${TONE_INK[item.tone]} border-current`} aria-hidden="true" />
            : <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${TONE_FILL[item.tone]}`} aria-hidden="true" />}
          <span>{item.label}</span>
          {item.value !== undefined && <span className="font-semibold text-gray-800">{item.value}</span>}
        </li>
      ))}
    </ul>
  )
}

/** هيكل تحميل بحجم الرسمة — بدل دايرة التحميل */
export function ChartSkeleton({ height = 'h-40' }: { height?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-100 ${height}`} aria-busy="true" data-chart-skeleton />
}

export const ChartEmpty = ({ children }: { children: ReactNode }) => <p className="text-sm text-gray-500 py-3" data-chart-empty>{children}</p>

// ===== دايرة التوزيع =====
export interface DonutSegment { key: string; label: string; value: number; tone: ChartTone }

export function Donut({ segments, centerLabel, centerValue, onPick, pickTitle = 'اضغط للأسماء' }: {
  segments: DonutSegment[]
  centerLabel: string
  centerValue: ReactNode
  onPick?: (key: string) => void
  pickTitle?: string
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
              <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${TONE_FILL[segment.tone]}`} aria-hidden="true" />
              <span className="text-gray-600 truncate">{segment.label}</span>
              <span className="font-semibold text-gray-800 ms-auto">{num(segment.value)}</span>
              <span className="text-xs text-gray-400 w-9 text-end">{share}%</span>
            </>
          )
          return (
            <li key={segment.key} className="min-w-0">
              {onPick && segment.value > 0
                ? <button type="button" onClick={() => onPick(segment.key)} title={pickTitle} className="flex items-center gap-2 w-full rounded-lg px-1.5 py-0.5 hover:bg-gray-50 text-start">{row}</button>
                : <div className="flex items-center gap-2 px-1.5 py-0.5">{row}</div>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ===== خط الاتجاه =====
export interface LineSeries { key: string; label: string; tone: ChartTone; dashed?: boolean; values: Array<number | null> }

/** حدود محور لسلسلة أعداد (مش نسب): هامش فوق وتحت القيم، ومن غير سالب — عشان خط العدد مايبقاش مسطّح فوق */
export function niceDomain(values: Array<number | null | undefined>): [number, number] {
  const known = values.filter((value): value is number => value !== null && value !== undefined)
  if (!known.length) return [0, 1]
  const low = Math.min(...known), high = Math.max(...known)
  const margin = Math.max(1, Math.ceil((high - low) * 0.15))
  return [Math.max(0, Math.floor(low - margin)), Math.ceil(high + margin)]
}

const tickText = (value: number) => String(Math.round(value * 10) / 10)

/**
 * خطوط على محور زمن (نسب 0–100 افتراضيًا، أو أعداد بحدود domain)؛ النقطة اللي من غير قيمة فجوة في الخط. المرور على الرسمة بيعرض قيم
 * النقطة في سطر نص تحتها. محور الزمن من اليمين للشمال: الأقدم يمين والأحدث شمال، ومحور القيم على اليمين.
 */
export function LineChart({ series, labels, label, suffix = '%', domain = [0, 100], tick = (text: string) => text.slice(5) }: {
  series: LineSeries[]
  labels: string[]
  label: string
  suffix?: string
  domain?: [number, number]
  /** نص علامة محور الزمن من تسمية النقطة */
  tick?: (label: string) => string
}) {
  const [at, setAt] = useState<number | null>(null)
  const width = 600, height = 200, axis = 38, edge = 8, top = 10, bottom = 22
  const count = Math.max(1, labels.length - 1)
  const [low, high] = domain[1] > domain[0] ? domain : [domain[0], domain[0] + 1]
  // أول نقطة (الأقدم) عند محور القيم على اليمين، وآخر نقطة على الشمال
  const x = (index: number) => width - axis - (index / count) * (width - axis - edge)
  const y = (value: number) => top + (1 - (Math.min(high, Math.max(low, value)) - low) / (high - low)) * (height - top - bottom)
  const pathOf = (values: Array<number | null>) => {
    let path = '', open = false
    values.forEach((value, index) => {
      if (value === null || value === undefined) { open = false; return }
      path += `${open ? 'L' : 'M'}${x(index).toFixed(1)} ${y(value).toFixed(1)} `
      open = true
    })
    return path.trim()
  }
  const ticks = [0, 1, 2, 3, 4].map((step) => low + ((high - low) * step) / 4)
  const marks = labels.length <= 1 ? [0] : [0, Math.floor(count / 2), count]
  const pick = (clientX: number, box: DOMRect) => {
    const inside = ((clientX - box.left) / box.width) * width
    const index = Math.round(((width - axis - inside) / (width - axis - edge)) * count)
    setAt(Math.min(count, Math.max(0, index)))
  }
  return (
    <div data-chart="line">
      {/* dir=ltr لإحداثيات الرسم بس (عشان محاذاة نص SVG ماتتقلبش) — الزمن نفسه مرسوم من اليمين للشمال */}
      <div dir="ltr" className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label={label} data-time-axis="rtl"
          onMouseMove={(event) => pick(event.clientX, event.currentTarget.getBoundingClientRect())} onMouseLeave={() => setAt(null)}
          onTouchStart={(event) => pick(event.touches[0].clientX, event.currentTarget.getBoundingClientRect())}>
          {ticks.map((value) => (
            <g key={value}>
              <line x1={edge} x2={width - axis} y1={y(value)} y2={y(value)} className="text-gray-100" stroke="currentColor" strokeWidth="1" />
              <text x={width - axis + 6} y={y(value) + 3} textAnchor="start" fontSize="10" className="fill-gray-400">{tickText(value)}{suffix}</text>
            </g>
          ))}
          {marks.map((index) => (
            <text key={index} x={x(index)} y={height - 6} textAnchor={index === 0 ? 'end' : index === count ? 'start' : 'middle'} fontSize="10" className="fill-gray-400">{tick(labels[index] ?? '')}</text>
          ))}
          {series.map((line) => (
            <path key={line.key} d={pathOf(line.values)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
              strokeDasharray={line.dashed ? '6 4' : undefined} className={TONE_INK[line.tone]} />
          ))}
          {at !== null && (
            <g>
              <line x1={x(at)} x2={x(at)} y1={top} y2={height - bottom} className="text-gray-300" stroke="currentColor" strokeWidth="1" />
              {series.map((line) => line.values[at] !== null && line.values[at] !== undefined && (
                <circle key={line.key} cx={x(at)} cy={y(line.values[at] as number)} r="4" stroke="white" strokeWidth="2" fill="currentColor" className={TONE_INK[line.tone]} />
              ))}
            </g>
          )}
        </svg>
      </div>
      <p className="text-xs text-gray-600 min-h-[1.25rem] mt-1" aria-live="polite">
        {at !== null ? (
          <>
            <span className="font-semibold text-gray-800" dir="ltr">{labels[at]}</span>
            {series.map((line) => (
              <span key={line.key} className="ms-3">{line.label}: <span className="font-semibold text-gray-800">{line.values[at] === null || line.values[at] === undefined ? '—' : `${num(line.values[at] as number)}${suffix}`}</span></span>
            ))}
          </>
        ) : <span className="text-gray-400">الأقدم يمين والأحدث شمال — مرّ على الرسمة تشوف قيم كل نقطة</span>}
      </p>
    </div>
  )
}

// ===== خط صغير جوه المؤشر =====
/** شكل الاتجاه بس (من غير محاور): الأقدم يمين والأحدث شمال، ونقطة على آخر قيمة. القيمة نفسها مكتوبة في المؤشر. */
export function Sparkline({ values, tone }: { values: Array<number | null>; tone: ChartTone }) {
  const known = values.filter((value): value is number => value !== null && value !== undefined)
  if (known.length < 2) return null
  const width = 80, height = 30, inset = 4
  const low = Math.min(...known), high = Math.max(...known)
  const count = Math.max(1, values.length - 1)
  const x = (index: number) => width - inset - (index / count) * (width - inset * 2)
  const y = (value: number) => (high === low ? height / 2 : inset + (1 - (value - low) / (high - low)) * (height - inset * 2))
  let path = '', open = false, last: [number, number] | null = null
  values.forEach((value, index) => {
    if (value === null || value === undefined) { open = false; return }
    path += `${open ? 'L' : 'M'}${x(index).toFixed(1)} ${y(value).toFixed(1)} `
    open = true
    last = [x(index), y(value)]
  })
  const end = last as [number, number] | null
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={`w-16 h-6 shrink-0 ${TONE_INK[tone]}`} aria-hidden="true" data-chart="spark">
      <path d={path.trim()} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {end && <circle cx={end[0]} cy={end[1]} r="3" fill="currentColor" stroke="white" strokeWidth="1.5" />}
    </svg>
  )
}

/** الفرق عن الفترة اللي قبلها: سهم + رقم + وصف — واللون بحكم الحركة (كويسة أو لأ)، مش بلون لوحده */
export function DeltaBadge({ delta, unit = '', caption }: { delta: Delta; unit?: string; caption: string }) {
  const tone = delta.good === null ? 'text-gray-500' : delta.good ? 'text-success-600' : 'text-danger-600'
  const Icon = delta.direction === 'up' ? ArrowUp : delta.direction === 'down' ? ArrowDown : Minus
  const amount = Math.round(Math.abs(delta.diff) * 10) / 10
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1 text-xs" data-delta={delta.direction}>
      <span className={`inline-flex items-center gap-0.5 font-semibold ${tone}`}>
        <Icon size={12} aria-hidden="true" />
        {delta.direction === 'flat' ? 'زي ما هو' : `${delta.direction === 'up' ? 'زاد' : 'قل'} ${num(amount)}${unit ? ` ${unit}` : ''}`}
      </span>
      <span className="text-gray-400">{caption}</span>
    </span>
  )
}

// ===== أعمدة أفقية =====
export interface HBarRow { key: string; label: string; value: number; display?: ReactNode; hint?: ReactNode; tone: ChartTone; onClick?: () => void; title?: string }

/** صف لكل بند: الاسم، شريط بطول قيمته، والرقم — والصف زرار لو بينزل لمستوى تحته */
export function HBars({ rows, max, empty }: { rows: HBarRow[]; max?: number; empty: ReactNode }) {
  if (!rows.length) return <ChartEmpty>{empty}</ChartEmpty>
  const top = max ?? Math.max(1, ...rows.map((row) => row.value))
  return (
    <ul className="space-y-2" data-chart="hbars">
      {rows.map((row) => {
        const width = top > 0 ? Math.max(row.value > 0 ? 2 : 0, Math.round((row.value / top) * 100)) : 0
        const body = (
          <>
            <span className="flex items-baseline justify-between gap-2 text-sm">
              <span className={`truncate ${row.onClick ? 'text-primary-600' : 'text-gray-700'}`}>{row.label}</span>
              <span className="shrink-0">
                {row.hint && <span className="text-xs text-gray-400 me-2">{row.hint}</span>}
                <span className="font-semibold text-gray-800">{row.display ?? num(row.value)}</span>
              </span>
            </span>
            <span className="block h-2.5 rounded-full bg-gray-100 overflow-hidden mt-1" aria-hidden="true">
              <span className={`block h-full rounded-full ${TONE_FILL[row.tone]}`} style={{ width: `${width}%` }} />
            </span>
          </>
        )
        return (
          <li key={row.key} className="min-w-0">
            {row.onClick
              ? <button type="button" onClick={row.onClick} title={row.title ?? 'اضغط للمستوى اللي تحته'} className="block w-full text-start rounded-lg px-1.5 py-1 hover:bg-gray-50">{body}</button>
              : <div className="px-1.5 py-1">{body}</div>}
          </li>
        )
      })}
    </ul>
  )
}

// ===== صفوف مقسّمة (حالة كل وحدة) =====
export interface StackedRow {
  key: string
  label: string
  hint?: ReactNode
  segments: Array<{ key: string; label: string; value: number; tone: ChartTone }>
  /** النزول للمستوى اللي تحت الصف */
  onOpen?: () => void
  /** false = أرقام الصف ده مابتفتحش أسماء (صف من غير مكان يتفلتر بيه) */
  pickable?: boolean
}

/**
 * صف لكل وحدة: اسمها (زرار لو تحتها مستوى)، وشريط مقسّم بنسبة كل حالة، وتحته كل حالة باسمها ورقمها — والرقم زرار بيفتح أصحابه
 * (onPick). الشريط للشكل بس؛ القراءة والضغط من النص.
 */
export function StackedRows({ rows, empty, onPick, pickTitle = 'اضغط للأسماء' }: {
  rows: StackedRow[]
  empty: ReactNode
  onPick?: (rowKey: string, segmentKey: string) => void
  pickTitle?: string
}) {
  if (!rows.length) return <ChartEmpty>{empty}</ChartEmpty>
  return (
    <ul className="space-y-3" data-chart="stacked-rows">
      {rows.map((row) => {
        const total = row.segments.reduce((sum, segment) => sum + segment.value, 0)
        return (
          <li key={row.key} className="min-w-0" data-stacked-row={row.key}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              {row.onOpen
                ? <button type="button" onClick={row.onOpen} title="اضغط للمستوى اللي تحته" className="font-medium text-primary-600 hover:underline text-start truncate">{row.label}</button>
                : <span className="font-medium text-gray-800 truncate">{row.label}</span>}
              <span className="shrink-0 text-xs text-gray-400">{row.hint}{row.hint ? ' · ' : ''}<span className="font-semibold text-gray-800 text-sm">{num(total)}</span></span>
            </div>
            <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100 gap-0.5 mt-1" aria-hidden="true">
              {total > 0 && row.segments.filter((segment) => segment.value > 0).map((segment) => (
                <span key={segment.key} className={`h-full ${TONE_FILL[segment.tone]}`} style={{ width: `${(segment.value / total) * 100}%` }} />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-600">
              {row.segments.filter((segment) => segment.value > 0).map((segment) => {
                const chip = (
                  <>
                    <span className={`w-2 h-2 rounded-sm shrink-0 ${TONE_FILL[segment.tone]}`} aria-hidden="true" />
                    {segment.label} <span className="font-semibold text-gray-800">{num(segment.value)}</span>
                  </>
                )
                return onPick && row.pickable !== false
                  ? <button key={segment.key} type="button" onClick={() => onPick(row.key, segment.key)} title={pickTitle} aria-label={`${segment.label} في ${row.label}: ${segment.value}`}
                      className="inline-flex items-center gap-1 rounded px-1 hover:bg-gray-100">{chip}</button>
                  : <span key={segment.key} className="inline-flex items-center gap-1 px-1">{chip}</span>
              })}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

// ===== أعمدة رأسية مزدوجة (شهر بشهر، أو يوم بيوم من الأسبوع) =====
export function PairedColumns({ groups, first, second, label, suffix = '' }: {
  groups: Array<{ key: string; label: string; first: number; second: number }>
  first: { label: string; tone: ChartTone }
  second: { label: string; tone: ChartTone }
  label: string
  suffix?: string
}) {
  const top = Math.max(1, ...groups.flatMap((group) => [group.first, group.second]))
  const heightOf = (value: number) => `${value > 0 ? Math.max(4, Math.round((value / top) * 100)) : 0}%`
  return (
    <div data-chart="columns" role="img" aria-label={`${label}: ${groups.map((group) => `${group.label} ${first.label} ${group.first} ${second.label} ${group.second}`).join('، ')}`}>
      <div className="flex items-end gap-1 sm:gap-2 h-36">
        {groups.map((group) => (
          <div key={group.key} className="flex-1 min-w-0 h-full flex items-end justify-center gap-0.5 sm:gap-1">
            {[{ value: group.first, tone: first.tone }, { value: group.second, tone: second.tone }].map((bar, index) => (
              <div key={index} className="flex-1 max-w-[1.5rem] h-full flex flex-col justify-end items-center gap-0.5">
                <span className="text-[10px] sm:text-[11px] text-gray-600">{bar.value ? `${bar.value}${suffix}` : ''}</span>
                <span className={`block w-full rounded-t ${TONE_FILL[bar.tone]}`} style={{ height: heightOf(bar.value) }} />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="flex gap-1 sm:gap-2 border-t border-gray-200 pt-1">
        {groups.map((group) => <span key={group.key} className="flex-1 min-w-0 text-center text-[11px] text-gray-500 truncate">{group.label}</span>)}
      </div>
    </div>
  )
}

// ===== شريط واحد مقسّم =====
export function StackedBar({ segments, label }: { segments: Array<{ key: string; label: string; value: number; tone: ChartTone }>; label: string }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)
  return (
    <div data-chart="stacked">
      <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 gap-0.5" role="img" aria-label={`${label}: ${segments.map((segment) => `${segment.label} ${segment.value}`).join('، ')}`}>
        {total > 0 && segments.filter((segment) => segment.value > 0).map((segment) => (
          <span key={segment.key} className={`h-full ${TONE_FILL[segment.tone]}`} style={{ width: `${(segment.value / total) * 100}%` }} />
        ))}
      </div>
      <div className="mt-2"><Legend items={segments.map((segment) => ({ label: segment.label, tone: segment.tone, value: num(segment.value) }))} /></div>
    </div>
  )
}

// ===== حلقة نسبة =====
/** نسبة واحدة من 100 في حلقة، والرقم في النص — null = مفيش رقم يتقال */
export function Ring({ value, label, tone, caption }: { value: number | null; label: string; tone: ChartTone; caption?: ReactNode }) {
  const radius = 34, around = 2 * Math.PI * radius
  const share = value === null ? 0 : Math.min(100, Math.max(0, value))
  return (
    <div className="flex items-center gap-3 min-w-0" data-chart="ring">
      <svg viewBox="0 0 88 88" className="w-20 h-20 shrink-0" role="img" aria-label={`${label}: ${value === null ? 'مفيش رقم' : `${value}%`}`}>
        <circle cx="44" cy="44" r={radius} fill="none" strokeWidth="9" className="text-gray-100" stroke="currentColor" />
        {share > 0 && (
          <circle cx="44" cy="44" r={radius} fill="none" strokeWidth="9" strokeLinecap="round" stroke="currentColor" className={TONE_INK[tone]}
            strokeDasharray={`${(share / 100) * around} ${around}`} transform="rotate(-90 44 44)" />
        )}
        <text x="44" y="49" textAnchor="middle" className="fill-gray-800" fontSize="16" fontWeight="700">{value === null ? '—' : `${Math.round(value * 10) / 10}%`}</text>
      </svg>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        {caption && <p className="text-xs text-gray-500 mt-0.5">{caption}</p>}
      </div>
    </div>
  )
}

// ===== بلاطة رقم =====
const TILE_BG: Record<DashboardTone, string> = { green: 'bg-success-50', yellow: 'bg-warning-50', red: 'bg-danger-50', blue: 'bg-primary-50', gray: 'bg-gray-100' }
const TILE_TEXT: Record<DashboardTone, string> = { green: 'text-success-600', yellow: 'text-warning-600', red: 'text-danger-600', blue: 'text-primary-600', gray: 'text-gray-600' }

/** رقم بتسميته جوه قسم — رمادي لما يبقى صفر، وزرار لما بيفتح أصحابه */
export function StatTile({ label, value, tone, hint, onClick, quiet = true }: {
  label: string
  value: ReactNode
  tone: DashboardTone
  hint?: ReactNode
  onClick?: () => void
  /** الصفر رمادي (الافتراضي) — false للرقم اللي لونه ثابت */
  quiet?: boolean
}) {
  const shown = quiet && (value === 0 || value === '0') ? 'gray' : tone
  const body = (
    <>
      <span className={`block text-2xl font-bold ${TILE_TEXT[shown]}`}>{typeof value === 'number' ? num(value) : value}</span>
      <span className="block text-xs text-gray-600">{label}</span>
      {hint && <span className="block text-[11px] text-gray-400 mt-0.5">{hint}</span>}
    </>
  )
  const className = `block w-full text-start rounded-xl px-3 py-2.5 min-w-0 ${TILE_BG[shown]}`
  return onClick && shown !== 'gray'
    ? <button type="button" onClick={onClick} title="اضغط للأسماء" className={`${className} hover:ring-2 hover:ring-primary-500/30 transition-shadow`} data-stat-tile>{body}</button>
    : <div className={className} data-stat-tile>{body}</div>
}

// ===== مؤشر فوق =====
export function Kpi({ label, value, hint, tone, hintTone, icon, onClick, loading, delta, spark, title = 'اضغط للتفاصيل' }: {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone: ChartTone
  hintTone?: DashboardTone
  icon: ReactNode
  onClick?: () => void
  loading?: boolean
  /** الفرق عن الفترة اللي قبلها (أو عن متوسط الفترة) */
  delta?: { value: Delta; unit?: string; caption: string } | null
  /** شكل الاتجاه — الأقدم أول */
  spark?: Array<number | null>
  title?: string
}) {
  const hintClass = hintTone === 'red' ? 'text-danger-600' : hintTone === 'green' ? 'text-success-600' : hintTone === 'yellow' ? 'text-warning-600' : 'text-gray-400'
  const body = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="text-sm text-gray-500 leading-tight">{label}</span>
        <span className={`shrink-0 ${TONE_INK[tone]}`} aria-hidden="true">{icon}</span>
      </span>
      {/* الخط الصغير بينزل تحت الرقم لو الكارت ضيق (مؤشرين في الصف على الموبايل) */}
      <span className="flex flex-wrap items-end justify-between gap-x-2 gap-y-1 mt-1">
        {loading && value === '—'
          ? <span className="block h-9 w-16 rounded-lg bg-gray-100 animate-pulse" aria-busy="true" />
          : <span className={`block text-2xl sm:text-3xl font-bold text-gray-900 ${loading ? 'opacity-40' : ''}`}>{value}</span>}
        {spark && <Sparkline values={spark} tone={tone} />}
      </span>
      <span className="block mt-1 min-h-[1rem]">{delta ? <DeltaBadge delta={delta.value} unit={delta.unit} caption={delta.caption} /> : null}</span>
      <span className={`block text-xs mt-0.5 min-h-[1rem] ${hintClass}`}>{hint}</span>
    </>
  )
  const className = 'block w-full text-start bg-white rounded-2xl shadow-sm border border-gray-100 p-4 min-w-0'
  return onClick
    ? <button type="button" onClick={onClick} title={title} className={`${className} hover:border-primary-500/40 hover:shadow transition-shadow`} data-kpi>{body}</button>
    : <div className={className} data-kpi>{body}</div>
}
