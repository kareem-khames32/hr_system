'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Plus,
  Calendar,
  Clock,
  MapPin,
  Video,
  User,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Edit2,
  MessageSquare,
  Phone,
} from 'lucide-react'

interface Interview {
  id: string
  candidateName: string
  candidateAvatar: string
  position: string
  date: string
  time: string
  duration: string
  type: 'onsite' | 'video' | 'phone'
  location: string
  interviewers: string[]
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show'
  stage: 'screening' | 'technical' | 'hr' | 'final'
  notes?: string
}

const interviews: Interview[] = [
  {
    id: '1',
    candidateName: 'عبدالله محمد السعيد',
    candidateAvatar: 'ع',
    position: 'مطور واجهات أمامية Senior',
    date: '2024-01-28',
    time: '10:00',
    duration: '1 ساعة',
    type: 'video',
    location: 'Microsoft Teams',
    interviewers: ['أحمد العتيبي', 'سالم الحربي'],
    status: 'scheduled',
    stage: 'technical',
  },
  {
    id: '2',
    candidateName: 'سارة أحمد العتيبي',
    candidateAvatar: 'س',
    position: 'مصمم UI/UX',
    date: '2024-01-28',
    time: '14:00',
    duration: '45 دقيقة',
    type: 'onsite',
    location: 'غرفة الاجتماعات A',
    interviewers: ['نورة الدوسري'],
    status: 'scheduled',
    stage: 'hr',
  },
  {
    id: '3',
    candidateName: 'محمد خالد الحربي',
    candidateAvatar: 'م',
    position: 'مدير مشاريع',
    date: '2024-01-27',
    time: '11:00',
    duration: '1 ساعة',
    type: 'onsite',
    location: 'غرفة الاجتماعات B',
    interviewers: ['أحمد محمد', 'سارة الخالدي'],
    status: 'completed',
    stage: 'final',
    notes: 'مرشح ممتاز، يُنصح بتقديم عرض',
  },
  {
    id: '4',
    candidateName: 'فهد عبدالرحمن',
    candidateAvatar: 'ف',
    position: 'مطور واجهات أمامية Senior',
    date: '2024-01-26',
    time: '15:00',
    duration: '1 ساعة',
    type: 'phone',
    location: 'مكالمة هاتفية',
    interviewers: ['أحمد العتيبي'],
    status: 'cancelled',
    stage: 'screening',
  },
  {
    id: '5',
    candidateName: 'ريم محمد الشمري',
    candidateAvatar: 'ر',
    position: 'مصمم UI/UX',
    date: '2024-01-25',
    time: '10:00',
    duration: '1 ساعة',
    type: 'video',
    location: 'Zoom',
    interviewers: ['نورة الدوسري', 'أحمد محمد'],
    status: 'no-show',
    stage: 'technical',
  },
]

const statusLabels = {
  scheduled: 'مجدولة',
  completed: 'مكتملة',
  cancelled: 'ملغاة',
  'no-show': 'لم يحضر',
}

const statusColors = {
  scheduled: 'bg-blue-100 text-blue-700',
  completed: 'bg-success-50 text-success-700',
  cancelled: 'bg-gray-100 text-gray-700',
  'no-show': 'bg-red-100 text-red-700',
}

const stageLabels = {
  screening: 'فرز أولي',
  technical: 'مقابلة تقنية',
  hr: 'مقابلة HR',
  final: 'مقابلة نهائية',
}

const stageColors = {
  screening: 'bg-gray-100 text-gray-700',
  technical: 'bg-purple-100 text-purple-700',
  hr: 'bg-blue-100 text-blue-700',
  final: 'bg-primary-100 text-primary-700',
}

const typeIcons = {
  onsite: MapPin,
  video: Video,
  phone: Phone,
}

export default function InterviewsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedDate, setSelectedDate] = useState('')

  const filteredInterviews = interviews.filter((interview) => {
    const matchesSearch =
      interview.candidateName.includes(searchTerm) ||
      interview.position.includes(searchTerm)
    const matchesStatus = filterStatus === 'all' || interview.status === filterStatus
    const matchesDate = !selectedDate || interview.date === selectedDate
    return matchesSearch && matchesStatus && matchesDate
  })

  const todayInterviews = interviews.filter(
    (i) => i.date === '2024-01-28' && i.status === 'scheduled'
  )

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">جدولة المقابلات</h1>
            <p className="text-gray-500 mt-1">إدارة ومتابعة مقابلات المتقدمين</p>
          </div>
          <button className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            جدولة مقابلة
          </button>
        </div>

        {/* Today's Interviews */}
        {todayInterviews.length > 0 && (
          <div className="card bg-gradient-to-br from-primary-500 to-primary-600 text-white">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">مقابلات اليوم</h2>
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                {todayInterviews.length} مقابلات
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {todayInterviews.map((interview) => {
                const TypeIcon = typeIcons[interview.type]
                return (
                  <div key={interview.id} className="bg-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center font-bold">
                        {interview.candidateAvatar}
                      </div>
                      <div>
                        <p className="font-medium">{interview.candidateName}</p>
                        <p className="text-sm text-primary-100">{interview.position}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-primary-100">
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {interview.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <TypeIcon size={14} />
                        {interview.location}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Calendar size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">مجدولة</p>
              <p className="text-2xl font-bold text-gray-800">
                {interviews.filter((i) => i.status === 'scheduled').length}
              </p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
              <CheckCircle2 size={24} className="text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">مكتملة</p>
              <p className="text-2xl font-bold text-gray-800">
                {interviews.filter((i) => i.status === 'completed').length}
              </p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
              <XCircle size={24} className="text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">ملغاة</p>
              <p className="text-2xl font-bold text-gray-800">
                {interviews.filter((i) => i.status === 'cancelled').length}
              </p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
              <AlertCircle size={24} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">لم يحضر</p>
              <p className="text-2xl font-bold text-gray-800">
                {interviews.filter((i) => i.status === 'no-show').length}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="بحث عن متقدم أو وظيفة..."
                className="input pr-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <input
              type="date"
              className="input w-44"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input w-40"
            >
              <option value="all">كل الحالات</option>
              <option value="scheduled">مجدولة</option>
              <option value="completed">مكتملة</option>
              <option value="cancelled">ملغاة</option>
              <option value="no-show">لم يحضر</option>
            </select>
          </div>
        </div>

        {/* Interviews List */}
        <div className="space-y-4">
          {filteredInterviews.map((interview) => {
            const TypeIcon = typeIcons[interview.type]
            return (
              <div key={interview.id} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl">
                    {interview.candidateAvatar}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-gray-800">{interview.candidateName}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stageColors[interview.stage]}`}>
                        {stageLabels[interview.stage]}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[interview.status]}`}>
                        {statusLabels[interview.status]}
                      </span>
                    </div>
                    <p className="text-sm text-primary-600 mb-2">{interview.position}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(interview.date).toLocaleDateString('ar-SA')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {interview.time} ({interview.duration})
                      </span>
                      <span className="flex items-center gap-1">
                        <TypeIcon size={14} />
                        {interview.location}
                      </span>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-gray-500 mb-1">المقابلون</p>
                    <div className="flex items-center gap-1">
                      {interview.interviewers.map((name, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-gray-100 rounded-lg text-xs text-gray-600"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                      <Edit2 size={16} className="text-gray-600" />
                    </button>
                    <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                      <MessageSquare size={16} className="text-gray-600" />
                    </button>
                  </div>
                </div>
                {interview.notes && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">ملاحظات:</span> {interview.notes}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </MainLayout>
  )
}
