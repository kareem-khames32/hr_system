'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  dayRangeError, dayRangeLabel, fallbackPayrollMonthContext, fetchPayrollMonthContext, payrollMonthOfRange,
  payrollMonthRangeOf, setRangeEdge, shiftPayrollMonthRange, type DayRange, type PayrollMonthContext,
} from '../lib/payroll-month-range'
import { formatDate } from '../lib/dates'

/**
 * فلتر «من تاريخ / إلى تاريخ» الموحّد لشاشات الحضور والرواتب.
 * الافتراضي شهر الرواتب الجاري (مثلًا 23 أغسطس – 22 سبتمبر) مع أزرار الشهر السابق/الحالي/التالي.
 */
export function usePayrollDayRange() {
  const [context, setContext] = useState<PayrollMonthContext | null>(null)
  const [range, setRange] = useState<DayRange | null>(null)
  useEffect(() => {
    let alive = true
    fetchPayrollMonthContext()
      .catch(() => fallbackPayrollMonthContext())
      .then(current => {
        if (!alive) return
        setContext(current)
        setRange(previous => previous ?? { from: current.from, to: current.to })
      })
    return () => { alive = false }
  }, [])
  return { range, setRange, context, cycleStartDay: context?.cycleStartDay ?? null }
}

interface Props {
  value: DayRange | null
  onChange: (range: DayRange) => void
  /** يفعّل أزرار شهر الرواتب السابق/الحالي/التالي. */
  cycleStartDay?: number | null
  today?: string | null
  idPrefix?: string
  disabled?: boolean
  className?: string
}

export function DayRangeFilter({ value, onChange, cycleStartDay, today, idPrefix = 'range', disabled, className = '' }: Props) {
  const error = value ? dayRangeError(value) : null
  const period = value && cycleStartDay ? payrollMonthOfRange(value, cycleStartDay) : null
  const move = (months: number) => { if (value && cycleStartDay) onChange(shiftPayrollMonthRange(value, cycleStartDay, months)) }
  const current = () => { if (cycleStartDay && today) { const { from, to } = payrollMonthRangeOf(today, cycleStartDay); onChange({ from, to }) } }
  return (
    <div className={`flex flex-wrap items-end gap-2 ${className}`} data-day-range-filter>
      <label htmlFor={`${idPrefix}-from`} className="text-sm text-gray-600">
        من تاريخ
        <input id={`${idPrefix}-from`} type="date" dir="ltr" className="input mt-1 block w-40" disabled={disabled || !value}
          value={value?.from ?? ''} onChange={event => value && onChange(setRangeEdge(value, 'from', event.target.value))} />
      </label>
      <label htmlFor={`${idPrefix}-to`} className="text-sm text-gray-600">
        إلى تاريخ
        <input id={`${idPrefix}-to`} type="date" dir="ltr" className="input mt-1 block w-40" disabled={disabled || !value}
          value={value?.to ?? ''} onChange={event => value && onChange(setRangeEdge(value, 'to', event.target.value))} />
      </label>
      {cycleStartDay ? (
        <div className="flex items-center gap-1">
          <button type="button" className="btn-secondary px-2 py-2" disabled={disabled || !value} onClick={() => move(-1)} title="شهر الرواتب السابق" aria-label="شهر الرواتب السابق">
            <ChevronRight size={16} />
          </button>
          <button type="button" className="btn-secondary px-3 py-2 text-sm" disabled={disabled || !today} onClick={current} title="شهر الرواتب الحالي">
            شهر الرواتب الحالي
          </button>
          <button type="button" className="btn-secondary px-2 py-2" disabled={disabled || !value} onClick={() => move(1)} title="شهر الرواتب التالي" aria-label="شهر الرواتب التالي">
            <ChevronLeft size={16} />
          </button>
        </div>
      ) : null}
      {value && (
        <p className={`text-xs basis-full ${error ? 'text-red-600' : 'text-gray-500'}`}>
          {error ?? (period
            ? `شهر رواتب ${formatDate(`${period}-01`, { year: 'numeric', month: 'long' })}: ${dayRangeLabel(value)}`
            : dayRangeLabel(value))}
        </p>
      )}
    </div>
  )
}
