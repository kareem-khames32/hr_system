'use client'

import { Calendar, Gift, AlertCircle, FileWarning, Clock } from 'lucide-react'

interface Event {
  id: string
  type: 'birthday' | 'holiday' | 'contract' | 'document' | 'anniversary'
  title: string
  date: string
  daysLeft: number
}

const events: Event[] = [
  {
    id: '1',
    type: 'birthday',
    title: 'عيد ميلاد أحمد محمد',
    date: '2026/02/01',
    daysLeft: 3,
  },
  {
    id: '2',
    type: 'holiday',
    title: 'يوم التأسيس',
    date: '2026/02/22',
    daysLeft: 24,
  },
  {
    id: '3',
    type: 'contract',
    title: 'انتهاء عقد سالم أحمد',
    date: '2026/02/15',
    daysLeft: 17,
  },
  {
    id: '4',
    type: 'document',
    title: 'انتهاء إقامة محمد علي',
    date: '2026/02/28',
    daysLeft: 30,
  },
  {
    id: '5',
    type: 'anniversary',
    title: 'ذكرى تعيين فاطمة سالم (5 سنوات)',
    date: '2026/02/10',
    daysLeft: 12,
  },
]

const getEventIcon = (type: Event['type']) => {
  switch (type) {
    case 'birthday':
      return { icon: <Gift size={18} />, bg: 'bg-pink-50', color: 'text-pink-500' }
    case 'holiday':
      return { icon: <Calendar size={18} />, bg: 'bg-success-50', color: 'text-success-600' }
    case 'contract':
      return { icon: <FileWarning size={18} />, bg: 'bg-warning-50', color: 'text-warning-600' }
    case 'document':
      return { icon: <AlertCircle size={18} />, bg: 'bg-danger-50', color: 'text-danger-600' }
    case 'anniversary':
      return { icon: <Clock size={18} />, bg: 'bg-primary-50', color: 'text-primary-600' }
    default:
      return { icon: <Calendar size={18} />, bg: 'bg-gray-100', color: 'text-gray-600' }
  }
}

export default function UpcomingEvents() {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-800">الأحداث القادمة</h3>
        <button className="text-sm text-primary-500 hover:text-primary-600 font-medium">
          عرض التقويم
        </button>
      </div>

      <div className="space-y-3">
        {events.map((event) => {
          const { icon, bg, color } = getEventIcon(event.type)
          return (
            <div
              key={event.id}
              className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className={`w-10 h-10 rounded-xl ${bg} ${color} flex items-center justify-center flex-shrink-0`}>
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 text-sm truncate">{event.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{event.date}</p>
              </div>
              <div className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                event.daysLeft <= 7
                  ? 'bg-danger-50 text-danger-600'
                  : event.daysLeft <= 14
                  ? 'bg-warning-50 text-warning-600'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {event.daysLeft === 0 ? 'اليوم' : `${event.daysLeft} يوم`}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
