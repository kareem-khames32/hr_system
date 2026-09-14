'use client'

// أيام الفترة من السيرفر بنطاق الفرع (GET /dashboard/attendance-trend): «أسبوعي» = آخر
// 7 أيام و«شهري» = آخر 30 يوماً حتى اليوم. عمود اليوم بتعريفات كروت اليوم نفسها
import { useEffect, useState } from 'react'
import { fetchAttendanceTrend, type ApiAttendanceTrend } from '@/lib/api'

type TrendDay = ApiAttendanceTrend['days'][number]

const weekdayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const weekdayOf = (date: string) => weekdayNames[new Date(`${date}T12:00:00`).getDay()] ?? ''

// أقصى ارتفاع للعمود بالبكسل (داخل حاوية h-52)
const BAR_MAX_PX = 200

const totalOf = (d: TrendDay) => d.attended + d.absent + d.onLeave

export default function AttendanceChart() {
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const [trend, setTrend] = useState<ApiAttendanceTrend | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    fetchAttendanceTrend(period)
      .then((data) => {
        if (!cancelled) setTrend(data)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'تعذر تحميل إحصائيات الحضور')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [period])

  const days = trend?.days ?? []
  const maxValue = Math.max(1, ...days.map(totalOf))
  const hasData = days.some((d) => totalOf(d) > 0)
  const isMonth = trend?.period === 'month'
  const px = (v: number) => `${(v / maxValue) * BAR_MAX_PX}px`

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-800">إحصائيات الحضور</h3>
          {trend && (
            <p className="text-xs text-gray-400 mt-1">
              من <span dir="ltr">{trend.from}</span> إلى <span dir="ltr">{trend.to}</span>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === 'week'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            أسبوعي
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === 'month'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            شهري
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary-500" />
          <span className="text-sm text-gray-600">حاضر</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-warning-500" />
          <span className="text-sm text-gray-600">إجازة</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-danger-500" />
          <span className="text-sm text-gray-600">غائب</span>
        </div>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>
      ) : !hasData ? (
        <div className="flex items-center justify-center h-64 text-sm text-gray-400">
          لا توجد سجلات حضور في هذه الفترة
        </div>
      ) : (
        <div className={`flex items-end justify-between h-64 ${isMonth ? 'gap-1' : 'gap-4'}`}>
          {days.map((day) => {
            const isToday = day.date === trend?.to
            return (
              <div
                key={day.date}
                className="flex-1 min-w-0 flex flex-col items-center gap-2"
                title={`${weekdayOf(day.date)} ${day.date} — حاضر ${day.attended} · إجازة ${day.onLeave} · غائب ${day.absent}`}
              >
                <div className="w-full flex flex-col-reverse items-center h-52">
                  {totalOf(day) > 0 ? (
                    <div
                      className={`w-full ${isMonth ? '' : 'max-w-12'} flex flex-col-reverse rounded-t-lg overflow-hidden`}
                    >
                      <div
                        className="bg-primary-500 transition-all duration-500"
                        style={{ height: px(day.attended) }}
                      />
                      <div
                        className="bg-warning-500 transition-all duration-500"
                        style={{ height: px(day.onLeave) }}
                      />
                      <div
                        className="bg-danger-500 transition-all duration-500"
                        style={{ height: px(day.absent) }}
                      />
                    </div>
                  ) : (
                    <div className={`w-full ${isMonth ? '' : 'max-w-12'} h-4 bg-gray-200 rounded-t-lg`} />
                  )}
                </div>
                <span
                  className={`${isMonth ? 'text-[10px]' : 'text-xs'} font-medium ${
                    isToday ? 'text-primary-600 font-bold' : 'text-gray-500'
                  }`}
                >
                  {isMonth ? Number(day.date.slice(8)) : weekdayOf(day.date)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
