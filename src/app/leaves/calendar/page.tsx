'use client'

import { useLeaveCatalog } from '@/lib/leave-catalog'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  ChevronRight,
  ChevronLeft,
  Calendar,
  Star,
  AlertTriangle,
} from 'lucide-react'
import { fetchCalendar, type ApiLeave } from '@/lib/api'

interface CalendarHoliday {
  id: number
  name: string
  date: string
  endDate?: string | null
  country?: string | null
}


const HOLIDAY_COLOR = '#16A34A'

const daysOfWeek = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

const monthNames = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
]

export default function LeaveCalendarPage() {
  const leaveCatalog = useLeaveCatalog()
  const leaveMeta = (code: string) => ({ label: leaveCatalog.label(code), color: leaveCatalog.hex(code) })
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [weekendDays, setWeekendDays] = useState<string[]>([])
  const [holidays, setHolidays] = useState<CalendarHoliday[]>([])
  const [leaves, setLeaves] = useState<ApiLeave[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`

  useEffect(() => {
    setLoading(true)
    setError('')
    fetchCalendar(monthKey)
      .then((data) => {
        setHolidays((data.holidays ?? []) as CalendarHoliday[])
        setLeaves(data.leaves ?? [])
        setWeekendDays(data.weekendDays ?? [])
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل التقويم'))
      .finally(() => setLoading(false))
  }, [monthKey])

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const firstDayWeekday = firstDayOfMonth.getDay()
  const totalDays = lastDayOfMonth.getDate()

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const dateStrOf = (day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  const getLeavesForDay = (day: number) => {
    const dateStr = dateStrOf(day)
    return leaves.filter((l) => l.fromDate <= dateStr && dateStr <= l.toDate)
  }

  const getHolidaysForDay = (day: number) => {
    const dateStr = dateStrOf(day)
    return holidays.filter((h) => h.date <= dateStr && dateStr <= (h.endDate ?? h.date))
  }

  const calendarDays: Array<number | null> = []
  for (let i = 0; i < firstDayWeekday; i++) {
    calendarDays.push(null)
  }
  for (let i = 1; i <= totalDays; i++) {
    calendarDays.push(i)
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {leaveCatalog.error && <div role="alert" className="bg-amber-50 text-amber-800 rounded-xl p-3 text-sm">تعذر تحميل أنواع الإجازات: {leaveCatalog.error} <button type="button" className="underline" onClick={leaveCatalog.retry}>إعادة المحاولة</button></div>}
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">تقويم الإجازات</h1>
            <p className="text-gray-500 mt-1">الإجازات المعتمدة والعطلات الرسمية؛ الطلبات المعلقة تظهر في صندوق الموافقات</p>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4 flex items-center gap-2">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        {/* Calendar Navigation */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={prevMonth}
              className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200"
            >
              <ChevronRight size={20} className="text-gray-600" />
            </button>
            <h2 className="text-xl font-bold text-gray-800">
              {monthNames[month]} {year}
            </h2>
            <button
              onClick={nextMonth}
              className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200"
            >
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
          <div className="grid grid-cols-7 gap-1">
            {/* Day Headers */}
            {daysOfWeek.map((day) => (
              <div
                key={day}
                className="p-3 text-center text-sm font-medium text-gray-500 bg-gray-50 rounded-lg"
              >
                {day}
              </div>
            ))}

            {/* Calendar Days */}
            {calendarDays.map((day, index) => {
              const dayLeaves = day ? getLeavesForDay(day) : []
              const dayHolidays = day ? getHolidaysForDay(day) : []
              const events = [
                ...dayHolidays.map((h) => ({
                  key: `h-${h.id}`,
                  label: h.name,
                  color: HOLIDAY_COLOR,
                })),
                ...dayLeaves.map((l) => ({
                  key: `l-${l.id}`,
                  // نص اليوم بعلامة ½ عشان مايبانش يوم كامل (LEV-21)
                  label: `${l.period === 'MORNING' || l.period === 'EVENING' ? '½ ' : ''}${l.employeeName ?? `موظف #${l.employeeId}`}`,
                  color: leaveMeta(l.leaveType).color,
                })),
              ]
              const isToday = day === new Date().getDate() &&
                              month === new Date().getMonth() &&
                              year === new Date().getFullYear()
              const isWeekend = day != null && weekendDays.includes(['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][new Date(year, month, day).getDay()])

              return (
                <div
                  key={index}
                  className={`min-h-[100px] p-2 border border-gray-100 rounded-lg ${
                    day ? 'bg-white hover:bg-gray-50' : 'bg-gray-50'
                  } ${isWeekend ? 'bg-gray-50' : ''}`}
                >
                  {day && (
                    <>
                      <div
                        className={`w-7 h-7 flex items-center justify-center rounded-full text-sm mb-1 ${
                          isToday
                            ? 'bg-primary-500 text-white font-bold'
                            : 'text-gray-700'
                        }`}
                      >
                        {day}
                      </div>
                      <div className="space-y-1">
                        {events.slice(0, 3).map((event) => (
                          <div
                            key={event.key}
                            className="text-xs p-1 rounded truncate"
                            style={{
                              backgroundColor: `${event.color}20`,
                              color: event.color,
                            }}
                          >
                            {event.label}
                          </div>
                        ))}
                        {events.length > 3 && (
                          <div className="text-xs text-gray-500 text-center">
                            +{events.length - 3} آخرين
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
          )}
        </div>

        {/* Legend */}
        <div className="card">
          <h3 className="font-bold text-gray-800 mb-4">دليل الألوان</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: HOLIDAY_COLOR }} />
              <span className="text-sm text-gray-600">عطلة رسمية</span>
            </div>
            {leaveCatalog.types.map((type) => (
              <div key={type.code} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: leaveCatalog.hex(type.code) }} />
                <span className="text-sm text-gray-600">{type.nameAr}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Month Events */}
        <div className="card">
          <h3 className="font-bold text-gray-800 mb-4">أحداث الشهر</h3>
          <div className="space-y-3">
            {holidays.map((h) => (
              <div
                key={`h-${h.id}`}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${HOLIDAY_COLOR}20` }}
                  >
                    <Star size={20} style={{ color: HOLIDAY_COLOR }} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{h.name}</p>
                    <p className="text-sm text-gray-500">عطلة رسمية</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-800">{h.date}</p>
                  {h.endDate && (
                    <p className="text-xs text-gray-500">إلى {h.endDate}</p>
                  )}
                </div>
              </div>
            ))}
            {leaves.map((l) => {
              const meta = leaveMeta(l.leaveType)
              return (
                <div
                  key={`l-${l.id}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${meta.color}20` }}
                    >
                      <Calendar size={20} style={{ color: meta.color }} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">
                        {l.employeeName ?? `موظف #${l.employeeId}`}
                      </p>
                      <p className="text-sm text-gray-500">
                        {meta.label} —{' '}
                        {l.period === 'MORNING'
                          ? 'نصف يوم صباحي'
                          : l.period === 'EVENING'
                            ? 'نصف يوم مسائي'
                            : `${Number(l.days)} يوم`}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-800">{l.fromDate}</p>
                    {l.fromDate !== l.toDate && (
                      <p className="text-xs text-gray-500">إلى {l.toDate}</p>
                    )}
                  </div>
                </div>
              )
            })}
            {holidays.length === 0 && leaves.length === 0 && !loading && (
              <p className="text-sm text-gray-400 text-center py-6">لا توجد أحداث في هذا الشهر</p>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
