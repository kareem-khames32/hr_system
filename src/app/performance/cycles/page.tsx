'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Plus,
  Calendar,
  Clock,
  Users,
  Target,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  Play,
  Pause,
  Settings,
  BarChart3,
  X,
} from 'lucide-react'

interface ReviewCycle {
  id: string
  name: string
  type: 'quarterly' | 'annual' | 'probation' | 'custom'
  startDate: string
  endDate: string
  status: 'upcoming' | 'active' | 'completed' | 'draft'
  totalEmployees: number
  completedReviews: number
  pendingReviews: number
  templateId: string
  templateName: string
}

const reviewCycles: ReviewCycle[] = [
  {
    id: '1',
    name: 'تقييم الربع الأول 2024',
    type: 'quarterly',
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    status: 'active',
    totalEmployees: 156,
    completedReviews: 89,
    pendingReviews: 67,
    templateId: '1',
    templateName: 'النموذج القياسي',
  },
  {
    id: '2',
    name: 'تقييم الربع الرابع 2023',
    type: 'quarterly',
    startDate: '2023-12-01',
    endDate: '2023-12-31',
    status: 'completed',
    totalEmployees: 150,
    completedReviews: 150,
    pendingReviews: 0,
    templateId: '1',
    templateName: 'النموذج القياسي',
  },
  {
    id: '3',
    name: 'التقييم السنوي 2023',
    type: 'annual',
    startDate: '2024-01-15',
    endDate: '2024-02-15',
    status: 'upcoming',
    totalEmployees: 156,
    completedReviews: 0,
    pendingReviews: 156,
    templateId: '2',
    templateName: 'التقييم السنوي الشامل',
  },
  {
    id: '4',
    name: 'تقييم فترة التجربة - يناير',
    type: 'probation',
    startDate: '2024-01-20',
    endDate: '2024-01-30',
    status: 'upcoming',
    totalEmployees: 8,
    completedReviews: 0,
    pendingReviews: 8,
    templateId: '3',
    templateName: 'نموذج فترة التجربة',
  },
]

const typeLabels = {
  quarterly: 'ربع سنوي',
  annual: 'سنوي',
  probation: 'فترة التجربة',
  custom: 'مخصص',
}

const statusLabels = {
  upcoming: 'قادم',
  active: 'نشط',
  completed: 'مكتمل',
  draft: 'مسودة',
}

const statusColors = {
  upcoming: 'bg-blue-100 text-blue-700',
  active: 'bg-success-50 text-success-700',
  completed: 'bg-gray-100 text-gray-600',
  draft: 'bg-warning-50 text-warning-700',
}

export default function PerformanceCyclesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showModal, setShowModal] = useState(false)

  const filteredCycles = reviewCycles.filter((cycle) => {
    const matchesSearch = cycle.name.includes(searchTerm)
    const matchesStatus = filterStatus === 'all' || cycle.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: reviewCycles.length,
    active: reviewCycles.filter((c) => c.status === 'active').length,
    upcoming: reviewCycles.filter((c) => c.status === 'upcoming').length,
    completed: reviewCycles.filter((c) => c.status === 'completed').length,
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">دورات التقييم</h1>
            <p className="text-gray-500 mt-1">إدارة دورات تقييم الأداء</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            إنشاء دورة جديدة
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
              <Calendar size={24} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي الدورات</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
              <Play size={24} className="text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">نشطة الآن</p>
              <p className="text-2xl font-bold text-gray-800">{stats.active}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Clock size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">قادمة</p>
              <p className="text-2xl font-bold text-gray-800">{stats.upcoming}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
              <CheckCircle2 size={24} className="text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">مكتملة</p>
              <p className="text-2xl font-bold text-gray-800">{stats.completed}</p>
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
                placeholder="بحث عن دورة..."
                className="input pr-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input w-48"
            >
              <option value="all">كل الحالات</option>
              <option value="active">نشطة</option>
              <option value="upcoming">قادمة</option>
              <option value="completed">مكتملة</option>
              <option value="draft">مسودة</option>
            </select>
          </div>
        </div>

        {/* Cycles List */}
        <div className="space-y-4">
          {filteredCycles.map((cycle) => {
            const progress = cycle.totalEmployees > 0
              ? Math.round((cycle.completedReviews / cycle.totalEmployees) * 100)
              : 0

            return (
              <div key={cycle.id} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                        cycle.status === 'active'
                          ? 'bg-success-50'
                          : cycle.status === 'upcoming'
                          ? 'bg-blue-50'
                          : 'bg-gray-100'
                      }`}
                    >
                      <Calendar
                        size={28}
                        className={
                          cycle.status === 'active'
                            ? 'text-success-600'
                            : cycle.status === 'upcoming'
                            ? 'text-blue-600'
                            : 'text-gray-500'
                        }
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">{cycle.name}</h3>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm text-gray-500">
                          {typeLabels[cycle.type]}
                        </span>
                        <span className="text-sm text-gray-500">
                          النموذج: {cycle.templateName}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${statusColors[cycle.status]}`}>
                    {statusLabels[cycle.status]}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-4 mt-6">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                      <Calendar size={16} />
                      تاريخ البداية
                    </div>
                    <p className="font-bold text-gray-800">
                      {new Date(cycle.startDate).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                      <Clock size={16} />
                      تاريخ النهاية
                    </div>
                    <p className="font-bold text-gray-800">
                      {new Date(cycle.endDate).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                      <Users size={16} />
                      الموظفين
                    </div>
                    <p className="font-bold text-gray-800">{cycle.totalEmployees}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                      <Target size={16} />
                      التقدم
                    </div>
                    <p className="font-bold text-gray-800">
                      {cycle.completedReviews}/{cycle.totalEmployees}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-500">نسبة الإكمال</span>
                    <span className="font-medium text-gray-700">{progress}%</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        progress === 100
                          ? 'bg-success-500'
                          : progress > 50
                          ? 'bg-primary-500'
                          : 'bg-warning-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
                  <button className="btn-secondary flex items-center gap-2">
                    <BarChart3 size={16} />
                    عرض التقارير
                  </button>
                  <button className="btn-secondary flex items-center gap-2">
                    <Settings size={16} />
                    الإعدادات
                  </button>
                  <button className="btn-secondary flex items-center gap-2">
                    <Edit2 size={16} />
                    تعديل
                  </button>
                  {cycle.status === 'upcoming' && (
                    <button className="btn-primary flex items-center gap-2">
                      <Play size={16} />
                      بدء الدورة
                    </button>
                  )}
                  {cycle.status === 'active' && (
                    <button className="btn-secondary flex items-center gap-2 text-warning-600">
                      <Pause size={16} />
                      إيقاف مؤقت
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl w-full max-w-lg mx-4">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">إنشاء دورة تقييم جديدة</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اسم الدورة
                  </label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="مثال: تقييم الربع الأول 2024"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    نوع الدورة
                  </label>
                  <select className="input w-full">
                    <option value="quarterly">ربع سنوي</option>
                    <option value="annual">سنوي</option>
                    <option value="probation">فترة التجربة</option>
                    <option value="custom">مخصص</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      تاريخ البداية
                    </label>
                    <input type="date" className="input w-full" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      تاريخ النهاية
                    </label>
                    <input type="date" className="input w-full" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    نموذج التقييم
                  </label>
                  <select className="input w-full">
                    <option value="1">النموذج القياسي</option>
                    <option value="2">التقييم السنوي الشامل</option>
                    <option value="3">نموذج فترة التجربة</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 p-6 border-t border-gray-100">
                <button onClick={() => setShowModal(false)} className="flex-1 btn-secondary">
                  إلغاء
                </button>
                <button onClick={() => setShowModal(false)} className="flex-1 btn-primary">
                  إنشاء الدورة
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
