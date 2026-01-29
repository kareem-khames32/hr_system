'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Plus,
  Calendar,
  Edit2,
  Trash2,
  Star,
  Sun,
  Moon,
} from 'lucide-react'

interface Holiday {
  id: string
  name: string
  date: string
  endDate?: string
  type: 'religious' | 'national' | 'company'
  days: number
  recurring: boolean
}

const holidays: Holiday[] = [
  {
    id: '1',
    name: 'عيد الفطر',
    date: '2024-04-10',
    endDate: '2024-04-13',
    type: 'religious',
    days: 4,
    recurring: true,
  },
  {
    id: '2',
    name: 'عيد الأضحى',
    date: '2024-06-16',
    endDate: '2024-06-19',
    type: 'religious',
    days: 4,
    recurring: true,
  },
  {
    id: '3',
    name: 'اليوم الوطني',
    date: '2024-09-23',
    type: 'national',
    days: 1,
    recurring: true,
  },
  {
    id: '4',
    name: 'يوم التأسيس',
    date: '2024-02-22',
    type: 'national',
    days: 1,
    recurring: true,
  },
  {
    id: '5',
    name: 'إجازة نهاية السنة',
    date: '2024-12-31',
    type: 'company',
    days: 1,
    recurring: false,
  },
]

const typeLabels = {
  religious: 'دينية',
  national: 'وطنية',
  company: 'خاصة بالشركة',
}

const typeColors = {
  religious: 'bg-green-100 text-green-700',
  national: 'bg-primary-100 text-primary-700',
  company: 'bg-purple-100 text-purple-700',
}

const typeIcons = {
  religious: Moon,
  national: Star,
  company: Sun,
}

export default function HolidaysPage() {
  const [showModal, setShowModal] = useState(false)
  const [selectedYear, setSelectedYear] = useState('2024')

  const totalDays = holidays.reduce((sum, h) => sum + h.days, 0)

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">الإجازات الرسمية</h1>
            <p className="text-gray-500 mt-1">إدارة العطلات والإجازات الرسمية</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="input w-32"
            >
              <option value="2024">2024</option>
              <option value="2025">2025</option>
            </select>
            <button className="btn-primary flex items-center gap-2">
              <Plus size={18} />
              إضافة إجازة
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
              <Calendar size={24} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي الإجازات</p>
              <p className="text-2xl font-bold text-gray-800">{holidays.length}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
              <Moon size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجازات دينية</p>
              <p className="text-2xl font-bold text-gray-800">
                {holidays.filter((h) => h.type === 'religious').length}
              </p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Star size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجازات وطنية</p>
              <p className="text-2xl font-bold text-gray-800">
                {holidays.filter((h) => h.type === 'national').length}
              </p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
              <Sun size={24} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي الأيام</p>
              <p className="text-2xl font-bold text-gray-800">{totalDays}</p>
            </div>
          </div>
        </div>

        {/* Calendar View */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-4">التقويم السنوي</h2>
          <div className="grid grid-cols-4 gap-4">
            {[
              'يناير', 'فبراير', 'مارس', 'أبريل',
              'مايو', 'يونيو', 'يوليو', 'أغسطس',
              'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
            ].map((month, index) => {
              const monthHolidays = holidays.filter((h) => {
                const hMonth = new Date(h.date).getMonth()
                return hMonth === index
              })
              return (
                <div key={month} className="p-4 bg-gray-50 rounded-xl">
                  <h3 className="font-medium text-gray-800 mb-2">{month}</h3>
                  {monthHolidays.length > 0 ? (
                    <div className="space-y-2">
                      {monthHolidays.map((h) => {
                        const Icon = typeIcons[h.type]
                        return (
                          <div
                            key={h.id}
                            className={`p-2 rounded-lg text-xs ${typeColors[h.type]}`}
                          >
                            <div className="flex items-center gap-1">
                              <Icon size={12} />
                              <span className="font-medium">{h.name}</span>
                            </div>
                            <span className="text-xs opacity-75">
                              {new Date(h.date).getDate()}{h.endDate ? ` - ${new Date(h.endDate).getDate()}` : ''}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">لا توجد إجازات</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Holidays List */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-4">قائمة الإجازات</h2>
          <div className="space-y-3">
            {holidays.map((holiday) => {
              const Icon = typeIcons[holiday.type]
              return (
                <div
                  key={holiday.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${typeColors[holiday.type]}`}>
                      <Icon size={24} />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-800">{holiday.name}</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(holiday.date).toLocaleDateString('ar-SA')}
                        {holiday.endDate && ` - ${new Date(holiday.endDate).toLocaleDateString('ar-SA')}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-left">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${typeColors[holiday.type]}`}>
                        {typeLabels[holiday.type]}
                      </span>
                      <p className="text-sm text-gray-500 mt-1">{holiday.days} يوم</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 bg-white rounded-lg hover:bg-gray-200">
                        <Edit2 size={16} className="text-gray-600" />
                      </button>
                      <button className="p-2 bg-white rounded-lg hover:bg-red-100">
                        <Trash2 size={16} className="text-gray-600 hover:text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
