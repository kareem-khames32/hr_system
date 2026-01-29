'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  ChevronRight,
  ChevronLeft,
  Calendar,
  Filter,
  Users,
} from 'lucide-react'

interface LeaveEvent {
  id: string
  employeeName: string
  type: string
  startDate: string
  endDate: string
  color: string
}

const leaveEvents: LeaveEvent[] = [
  { id: '1', employeeName: 'أحمد محمد', type: 'سنوية', startDate: '2024-01-15', endDate: '2024-01-19', color: '#3B82F6' },
  { id: '2', employeeName: 'سارة أحمد', type: 'مرضية', startDate: '2024-01-22', endDate: '2024-01-24', color: '#EF4444' },
  { id: '3', employeeName: 'عمر سالم', type: 'طارئة', startDate: '2024-01-10', endDate: '2024-01-10', color: '#F97316' },
  { id: '4', employeeName: 'نورة محمد', type: 'سنوية', startDate: '2024-01-28', endDate: '2024-02-02', color: '#3B82F6' },
  { id: '5', employeeName: 'فهد عبدالله', type: 'سنوية', startDate: '2024-01-08', endDate: '2024-01-12', color: '#3B82F6' },
]

const daysOfWeek = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

export default function LeaveCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2024, 0, 1))
  const [selectedDepartment, setSelectedDepartment] = useState('all')

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const firstDayWeekday = firstDayOfMonth.getDay()
  const totalDays = lastDayOfMonth.getDate()

  const monthNames = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ]

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return leaveEvents.filter((event) => {
      const start = new Date(event.startDate)
      const end = new Date(event.endDate)
      const current = new Date(dateStr)
      return current >= start && current <= end
    })
  }

  const calendarDays = []
  for (let i = 0; i < firstDayWeekday; i++) {
    calendarDays.push(null)
  }
  for (let i = 1; i <= totalDays; i++) {
    calendarDays.push(i)
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">تقويم الإجازات</h1>
            <p className="text-gray-500 mt-1">عرض تقويمي لإجازات الموظفين</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="input w-48"
            >
              <option value="all">كل الأقسام</option>
              <option value="it">تقنية المعلومات</option>
              <option value="hr">الموارد البشرية</option>
              <option value="sales">المبيعات</option>
            </select>
          </div>
        </div>

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

          {/* Calendar Grid */}
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
              const events = day ? getEventsForDay(day) : []
              const isToday = day === new Date().getDate() &&
                              month === new Date().getMonth() &&
                              year === new Date().getFullYear()
              const isWeekend = index % 7 === 5 || index % 7 === 6

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
                            key={event.id}
                            className="text-xs p-1 rounded truncate"
                            style={{
                              backgroundColor: `${event.color}20`,
                              color: event.color,
                            }}
                          >
                            {event.employeeName}
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
        </div>

        {/* Legend */}
        <div className="card">
          <h3 className="font-bold text-gray-800 mb-4">دليل الألوان</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3B82F6' }} />
              <span className="text-sm text-gray-600">إجازة سنوية</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#EF4444' }} />
              <span className="text-sm text-gray-600">إجازة مرضية</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#F97316' }} />
              <span className="text-sm text-gray-600">إجازة طارئة</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#6B7280' }} />
              <span className="text-sm text-gray-600">إجازة بدون راتب</span>
            </div>
          </div>
        </div>

        {/* Upcoming Leaves */}
        <div className="card">
          <h3 className="font-bold text-gray-800 mb-4">الإجازات القادمة</h3>
          <div className="space-y-3">
            {leaveEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${event.color}20` }}
                  >
                    <Calendar size={20} style={{ color: event.color }} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{event.employeeName}</p>
                    <p className="text-sm text-gray-500">{event.type}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-800">
                    {new Date(event.startDate).toLocaleDateString('ar-SA')}
                  </p>
                  {event.startDate !== event.endDate && (
                    <p className="text-xs text-gray-500">
                      إلى {new Date(event.endDate).toLocaleDateString('ar-SA')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
