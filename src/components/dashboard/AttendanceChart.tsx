'use client'

import { useState } from 'react'

interface DayData {
  day: string
  present: number
  absent: number
  leave: number
}

const weekData: DayData[] = [
  { day: 'الأحد', present: 220, absent: 8, leave: 12 },
  { day: 'الإثنين', present: 225, absent: 5, leave: 10 },
  { day: 'الثلاثاء', present: 218, absent: 10, leave: 12 },
  { day: 'الأربعاء', present: 222, absent: 6, leave: 12 },
  { day: 'الخميس', present: 215, absent: 8, leave: 17 },
  { day: 'الجمعة', present: 0, absent: 0, leave: 0 },
  { day: 'السبت', present: 0, absent: 0, leave: 0 },
]

export default function AttendanceChart() {
  const [period, setPeriod] = useState<'week' | 'month'>('week')
  const maxValue = Math.max(...weekData.map((d) => d.present + d.absent + d.leave))

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-800">إحصائيات الحضور</h3>
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
      <div className="flex items-end justify-between gap-4 h-64">
        {weekData.map((day, index) => {
          const total = day.present + day.absent + day.leave
          const presentHeight = total > 0 ? (day.present / maxValue) * 100 : 0
          const leaveHeight = total > 0 ? (day.leave / maxValue) * 100 : 0
          const absentHeight = total > 0 ? (day.absent / maxValue) * 100 : 0

          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex flex-col-reverse items-center h-52">
                {total > 0 ? (
                  <div className="w-full max-w-12 flex flex-col-reverse rounded-t-lg overflow-hidden">
                    <div
                      className="bg-primary-500 transition-all duration-500"
                      style={{ height: `${presentHeight * 2}px` }}
                    />
                    <div
                      className="bg-warning-500 transition-all duration-500"
                      style={{ height: `${leaveHeight * 2}px` }}
                    />
                    <div
                      className="bg-danger-500 transition-all duration-500"
                      style={{ height: `${absentHeight * 2}px` }}
                    />
                  </div>
                ) : (
                  <div className="w-full max-w-12 h-4 bg-gray-200 rounded-t-lg" />
                )}
              </div>
              <span className="text-xs text-gray-500 font-medium">{day.day}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
