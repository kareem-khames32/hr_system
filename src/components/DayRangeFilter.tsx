'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  DAY_RANGE_MAX_DAYS, dayRangeError, dayRangeLabel, fallbackPayrollMonthContext, fetchPayrollMonthContext, isDayKey, isPeriodKey, payrollMonthBounds,
  payrollMonthOfRange, payrollMonthOptions, payrollMonthRangeOf, payrollPeriodOfDate, periodLabel, setRangeEdge, shiftPayrollMonthRange,
  type DayRange, type PayrollMonthContext,
} from '../lib/payroll-month-range'

/**
 * فلتر التاريخ الموحّد (قاعدة المالك 2026-09-19): اختيار سريع لشهر الرواتب + «من تاريخ / إلى تاريخ» بأي يوم.
 * الافتراضي شهر الرواتب الجاري (مثلًا 23 أغسطس – 22 سبتمبر)؛ اختيار شهر يملا اليومين، وكتابة يوم بإيدك تغلب عليه.
 */
export function usePayrollMonthContext(): PayrollMonthContext | null {
  const [context, setContext] = useState<PayrollMonthContext | null>(null)
  useEffect(() => {
    let alive = true
    fetchPayrollMonthContext()
      .catch(() => fallbackPayrollMonthContext())
      .then(current => { if (alive) setContext(current) })
    return () => { alive = false }
  }, [])
  return context
}

export function usePayrollDayRange() {
  const context = usePayrollMonthContext()
  const [range, setRange] = useState<DayRange | null>(null)
  useEffect(() => { if (context) setRange(previous => previous ?? { from: context.from, to: context.to }) }, [context])
  return { range, setRange, context, cycleStartDay: context?.cycleStartDay ?? null }
}

const validCycle = (day: number | null | undefined): day is number => typeof day === 'number' && Number.isInteger(day) && day >= 1 && day <= 31
const CUSTOM = 'custom'

/** خانة يوم بتحتفظ باللي بيتكتب لحد ما يبقى تاريخ كامل صالح: كتابة السنة رقم رقم (0002 ← 0020 ← 2026) ما ترجّعش الخانة للقيمة القديمة. */
function DayInput({ id, value, disabled, onCommit }: { id: string; value: string; disabled?: boolean; onCommit: (day: string) => void }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => { setDraft(value) }, [value])
  return (
    <input id={id} type="date" dir="ltr" className="input mt-1 block w-40" disabled={disabled} value={draft}
      onChange={event => { const next = event.target.value; setDraft(next); if (isDayKey(next)) onCommit(next) }}
      onBlur={() => { if (!isDayKey(draft)) setDraft(value) }} />
  )
}

interface Props {
  value: DayRange | null
  onChange: (range: DayRange) => void
  /** يوم بداية دورة الرواتب: الشهور بتتحسب بيه (من غيره = شهر تقويمي). */
  cycleStartDay?: number | null
  today?: string | null
  idPrefix?: string
  disabled?: boolean
  className?: string
  /** فلتر اختياري: value = null معناها «كل التواريخ»، وonClear بيرجّعه لكده. */
  onClear?: () => void
  /** أقصى مدة بالأيام (null = من غير حد). */
  maxDays?: number | null
}

export function DayRangeFilter({ value, onChange, cycleStartDay, today, idPrefix = 'range', disabled, className = '', onClear, maxDays = DAY_RANGE_MAX_DAYS }: Props) {
  const clearable = !!onClear
  const payroll = validCycle(cycleStartDay)
  const cycle = payroll ? cycleStartDay : 1
  const monthWord = payroll ? 'شهر الرواتب' : 'الشهر'
  const idle = disabled || (!value && !clearable)
  const error = value ? dayRangeError(value, maxDays) : null
  const period = value ? payrollMonthOfRange(value, cycle) : null
  const anchorDay = isDayKey(today) ? today : value && isDayKey(value.from) ? value.from : null
  const months = payrollMonthOptions(anchorDay ? payrollPeriodOfDate(anchorDay, cycle) : null, period)
  const base = value && isDayKey(value.from) ? value : !value && isDayKey(today) ? payrollMonthRangeOf(today, cycle) : null
  const pick = (month: string) => {
    if (isPeriodKey(month)) { const { from, to } = payrollMonthBounds(month, cycle); onChange({ from, to }) }
    else if (!month && onClear) onClear()
  }
  const edge = (side: 'from' | 'to', day: string) => onChange(value ? setRangeEdge(value, side, day) : { from: day, to: day })
  const move = (step: number) => { if (base) { const { from, to } = shiftPayrollMonthRange(base, cycle, step); onChange({ from, to }) } }
  const current = () => { if (isDayKey(today)) { const { from, to } = payrollMonthRangeOf(today, cycle); onChange({ from, to }) } }
  return (
    <div className={`flex flex-wrap items-end gap-2 ${className}`} data-day-range-filter>
      <label htmlFor={`${idPrefix}-month`} className="text-sm text-gray-600">
        {monthWord}
        <select id={`${idPrefix}-month`} className="input mt-1 block w-44" disabled={idle} value={period ?? (value ? CUSTOM : '')}
          onChange={event => pick(event.target.value)} data-month-quick-pick>
          {(clearable || !value) && <option value="">{clearable ? 'كل التواريخ' : ''}</option>}
          {value && !period && <option value={CUSTOM} disabled>مدة مخصصة</option>}
          {months.map(month => <option key={month} value={month}>{periodLabel(month)}</option>)}
        </select>
      </label>
      <label htmlFor={`${idPrefix}-from`} className="text-sm text-gray-600">
        من تاريخ
        <DayInput id={`${idPrefix}-from`} value={value?.from ?? ''} disabled={idle} onCommit={day => edge('from', day)} />
      </label>
      <label htmlFor={`${idPrefix}-to`} className="text-sm text-gray-600">
        إلى تاريخ
        <DayInput id={`${idPrefix}-to`} value={value?.to ?? ''} disabled={idle} onCommit={day => edge('to', day)} />
      </label>
      <div className="flex items-center gap-1">
        <button type="button" className="btn-secondary px-2 py-2" disabled={idle || !base} onClick={() => move(-1)} title={`${monthWord} السابق`} aria-label={`${monthWord} السابق`}>
          <ChevronRight size={16} />
        </button>
        <button type="button" className="btn-secondary px-3 py-2 text-sm" disabled={idle || !isDayKey(today)} onClick={current} title={`${monthWord} الحالي`}>
          {monthWord} الحالي
        </button>
        <button type="button" className="btn-secondary px-2 py-2" disabled={idle || !base} onClick={() => move(1)} title={`${monthWord} التالي`} aria-label={`${monthWord} التالي`}>
          <ChevronLeft size={16} />
        </button>
      </div>
      {value && !disabled && (
        <p className={`text-xs basis-full ${error ? 'text-red-600' : 'text-gray-500'}`}>
          {error ?? (period ? `${payroll ? 'شهر رواتب ' : ''}${periodLabel(period)}: ${dayRangeLabel(value)}` : dayRangeLabel(value))}
        </p>
      )}
    </div>
  )
}

/**
 * اختيار مسير / شهر رواتب بالاسم (YYYY-MM): بيفضل بالشهر لأن المسير بيتحدد بيه، بس بيوضّح أيامه بالظبط (23 أغسطس – 22 سبتمبر).
 * allLabel = خيار «كل الشهور» (قيمة فاضية) لو الفلتر اختياري.
 */
export function PayrollPeriodSelect({ id, label, value, onChange, cycleStartDay, today, allLabel, disabled, className = '' }: {
  id: string; label: string; value: string; onChange: (period: string) => void
  cycleStartDay?: number | null; today?: string | null; allLabel?: string; disabled?: boolean; className?: string
}) {
  const cycle = validCycle(cycleStartDay) ? cycleStartDay : null
  const anchor = isDayKey(today) ? (cycle ? payrollPeriodOfDate(today, cycle) : today.slice(0, 7)) : null
  const months = payrollMonthOptions(anchor, value)
  const bounds = cycle && isPeriodKey(value) ? payrollMonthBounds(value, cycle) : null
  return (
    <label htmlFor={id} className={`block text-sm text-gray-600 ${className}`} data-payroll-period-select>
      {label}
      <select id={id} className="input mt-1 block w-full min-w-[11rem]" value={value} disabled={disabled} onChange={event => onChange(event.target.value)}>
        {(allLabel !== undefined || !value) && <option value="">{allLabel ?? ''}</option>}
        {months.map(month => <option key={month} value={month}>{periodLabel(month)}</option>)}
      </select>
      {bounds && <span className="block text-xs text-gray-500 mt-1" data-payroll-period-range>{dayRangeLabel(bounds)}</span>}
    </label>
  )
}
