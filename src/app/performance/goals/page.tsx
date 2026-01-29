'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Plus,
  Target,
  TrendingUp,
  Calendar,
  User,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  Flag,
  BarChart3,
} from 'lucide-react'
import Link from 'next/link'

interface Goal {
  id: string
  title: string
  description: string
  employee: string
  employeeAvatar: string
  department: string
  category: 'individual' | 'team' | 'company'
  priority: 'high' | 'medium' | 'low'
  progress: number
  status: 'on-track' | 'at-risk' | 'behind' | 'completed'
  startDate: string
  endDate: string
  keyResults: {
    id: string
    title: string
    current: number
    target: number
    unit: string
  }[]
}

const goals: Goal[] = [
  {
    id: '1',
    title: 'زيادة إنتاجية فريق التطوير',
    description: 'تحسين كفاءة الفريق من خلال أتمتة العمليات وتحسين الأدوات',
    employee: 'أحمد محمد علي',
    employeeAvatar: 'أ',
    department: 'تقنية المعلومات',
    category: 'team',
    priority: 'high',
    progress: 75,
    status: 'on-track',
    startDate: '2024-01-01',
    endDate: '2024-03-31',
    keyResults: [
      { id: '1', title: 'تقليل وقت النشر', current: 30, target: 50, unit: '%' },
      { id: '2', title: 'زيادة تغطية الاختبارات', current: 70, target: 85, unit: '%' },
      { id: '3', title: 'تقليل الأخطاء البرمجية', current: 15, target: 20, unit: 'خطأ' },
    ],
  },
  {
    id: '2',
    title: 'تحسين رضا العملاء',
    description: 'رفع مستوى رضا العملاء من خلال تحسين جودة الخدمة',
    employee: 'سارة أحمد الخالدي',
    employeeAvatar: 'س',
    department: 'خدمة العملاء',
    category: 'individual',
    priority: 'high',
    progress: 60,
    status: 'at-risk',
    startDate: '2024-01-01',
    endDate: '2024-03-31',
    keyResults: [
      { id: '1', title: 'تقييم رضا العملاء', current: 4.2, target: 4.5, unit: '/5' },
      { id: '2', title: 'وقت الاستجابة', current: 3, target: 2, unit: 'ساعة' },
      { id: '3', title: 'حل المشكلات من أول اتصال', current: 75, target: 90, unit: '%' },
    ],
  },
  {
    id: '3',
    title: 'تحقيق أهداف المبيعات الربعية',
    description: 'الوصول للهدف الربعي للمبيعات وفتح أسواق جديدة',
    employee: 'عمر سالم الحربي',
    employeeAvatar: 'ع',
    department: 'المبيعات',
    category: 'individual',
    priority: 'high',
    progress: 45,
    status: 'behind',
    startDate: '2024-01-01',
    endDate: '2024-03-31',
    keyResults: [
      { id: '1', title: 'قيمة المبيعات', current: 450000, target: 1000000, unit: 'ر.س' },
      { id: '2', title: 'عملاء جدد', current: 8, target: 20, unit: 'عميل' },
      { id: '3', title: 'معدل التحويل', current: 15, target: 25, unit: '%' },
    ],
  },
  {
    id: '4',
    title: 'إطلاق برنامج التدريب الداخلي',
    description: 'تصميم وتنفيذ برنامج تدريبي شامل للموظفين الجدد',
    employee: 'نورة محمد الدوسري',
    employeeAvatar: 'ن',
    department: 'الموارد البشرية',
    category: 'company',
    priority: 'medium',
    progress: 100,
    status: 'completed',
    startDate: '2023-10-01',
    endDate: '2024-01-15',
    keyResults: [
      { id: '1', title: 'تطوير المحتوى', current: 12, target: 12, unit: 'دورة' },
      { id: '2', title: 'تدريب المدربين', current: 5, target: 5, unit: 'مدرب' },
      { id: '3', title: 'إطلاق المنصة', current: 1, target: 1, unit: '' },
    ],
  },
  {
    id: '5',
    title: 'تحسين أمان البنية التحتية',
    description: 'تعزيز الإجراءات الأمنية وتطبيق أفضل الممارسات',
    employee: 'فهد عبدالله السعيد',
    employeeAvatar: 'ف',
    department: 'تقنية المعلومات',
    category: 'individual',
    priority: 'high',
    progress: 85,
    status: 'on-track',
    startDate: '2024-01-01',
    endDate: '2024-02-28',
    keyResults: [
      { id: '1', title: 'اختبارات الاختراق', current: 3, target: 4, unit: 'اختبار' },
      { id: '2', title: 'تحديث الأنظمة', current: 95, target: 100, unit: '%' },
      { id: '3', title: 'تدريب الموظفين', current: 180, target: 200, unit: 'موظف' },
    ],
  },
]

const statusLabels = {
  'on-track': 'على المسار',
  'at-risk': 'في خطر',
  behind: 'متأخر',
  completed: 'مكتمل',
}

const statusColors = {
  'on-track': 'bg-success-50 text-success-700',
  'at-risk': 'bg-warning-50 text-warning-700',
  behind: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
}

const statusIcons = {
  'on-track': TrendingUp,
  'at-risk': AlertTriangle,
  behind: Clock,
  completed: CheckCircle2,
}

const priorityColors = {
  high: 'text-red-500',
  medium: 'text-warning-500',
  low: 'text-gray-400',
}

const categoryLabels = {
  individual: 'فردي',
  team: 'فريق',
  company: 'شركة',
}

const categoryColors = {
  individual: 'bg-blue-100 text-blue-700',
  team: 'bg-purple-100 text-purple-700',
  company: 'bg-primary-100 text-primary-700',
}

export default function GoalsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [expandedGoals, setExpandedGoals] = useState<string[]>([])

  const toggleGoal = (id: string) => {
    setExpandedGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    )
  }

  const filteredGoals = goals.filter((goal) => {
    const matchesSearch =
      goal.title.includes(searchTerm) || goal.employee.includes(searchTerm)
    const matchesStatus = filterStatus === 'all' || goal.status === filterStatus
    const matchesCategory = filterCategory === 'all' || goal.category === filterCategory
    return matchesSearch && matchesStatus && matchesCategory
  })

  const stats = {
    total: goals.length,
    onTrack: goals.filter((g) => g.status === 'on-track').length,
    atRisk: goals.filter((g) => g.status === 'at-risk').length,
    completed: goals.filter((g) => g.status === 'completed').length,
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">الأهداف (OKRs)</h1>
            <p className="text-gray-500 mt-1">إدارة ومتابعة أهداف الموظفين والفرق</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/performance" className="btn-secondary flex items-center gap-2">
              <BarChart3 size={18} />
              التقييمات
            </Link>
            <button className="btn-primary flex items-center gap-2">
              <Plus size={18} />
              هدف جديد
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
              <Target size={24} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي الأهداف</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
              <TrendingUp size={24} className="text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">على المسار</p>
              <p className="text-2xl font-bold text-gray-800">{stats.onTrack}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-warning-50 rounded-2xl flex items-center justify-center">
              <AlertTriangle size={24} className="text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">في خطر</p>
              <p className="text-2xl font-bold text-gray-800">{stats.atRisk}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <CheckCircle2 size={24} className="text-blue-600" />
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
                placeholder="بحث عن هدف..."
                className="input pr-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input w-40"
            >
              <option value="all">كل الحالات</option>
              <option value="on-track">على المسار</option>
              <option value="at-risk">في خطر</option>
              <option value="behind">متأخر</option>
              <option value="completed">مكتمل</option>
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="input w-40"
            >
              <option value="all">كل الأنواع</option>
              <option value="individual">فردي</option>
              <option value="team">فريق</option>
              <option value="company">شركة</option>
            </select>
          </div>
        </div>

        {/* Goals List */}
        <div className="space-y-4">
          {filteredGoals.map((goal) => {
            const StatusIcon = statusIcons[goal.status]
            const isExpanded = expandedGoals.includes(goal.id)

            return (
              <div key={goal.id} className="card">
                <div
                  className="flex items-start gap-4 cursor-pointer"
                  onClick={() => toggleGoal(goal.id)}
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center text-white font-bold flex-shrink-0">
                    {goal.employeeAvatar}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Flag size={14} className={priorityColors[goal.priority]} />
                          <h3 className="font-bold text-gray-800">{goal.title}</h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              categoryColors[goal.category]
                            }`}
                          >
                            {categoryLabels[goal.category]}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">{goal.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <User size={14} />
                            {goal.employee}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {new Date(goal.endDate).toLocaleDateString('ar-SA')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-left">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl font-bold text-gray-800">
                              {goal.progress}%
                            </span>
                            <span
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                statusColors[goal.status]
                              }`}
                            >
                              <StatusIcon size={12} />
                              {statusLabels[goal.status]}
                            </span>
                          </div>
                          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                goal.status === 'completed'
                                  ? 'bg-blue-500'
                                  : goal.status === 'on-track'
                                  ? 'bg-success-500'
                                  : goal.status === 'at-risk'
                                  ? 'bg-warning-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${goal.progress}%` }}
                            />
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp size={20} className="text-gray-400" />
                        ) : (
                          <ChevronDown size={20} className="text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Content - Key Results */}
                {isExpanded && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-700">النتائج الرئيسية</h4>
                      <div className="flex items-center gap-2">
                        <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                          <Edit2 size={16} className="text-gray-600" />
                        </button>
                        <button className="p-2 bg-gray-100 rounded-lg hover:bg-red-100 transition-colors">
                          <Trash2 size={16} className="text-gray-600 hover:text-red-600" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {goal.keyResults.map((kr) => {
                        const percentage = Math.min(
                          100,
                          Math.round((kr.current / kr.target) * 100)
                        )
                        return (
                          <div
                            key={kr.id}
                            className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl"
                          >
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                percentage >= 100
                                  ? 'bg-success-100 text-success-600'
                                  : 'bg-gray-200 text-gray-500'
                              }`}
                            >
                              {percentage >= 100 ? (
                                <CheckCircle2 size={18} />
                              ) : (
                                <Circle size={18} />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-800">{kr.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      percentage >= 100
                                        ? 'bg-success-500'
                                        : percentage >= 70
                                        ? 'bg-blue-500'
                                        : percentage >= 40
                                        ? 'bg-warning-500'
                                        : 'bg-red-500'
                                    }`}
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <span className="text-sm text-gray-600 w-24 text-left">
                                  {kr.current} / {kr.target} {kr.unit}
                                </span>
                              </div>
                            </div>
                            <span
                              className={`text-lg font-bold ${
                                percentage >= 100
                                  ? 'text-success-600'
                                  : percentage >= 70
                                  ? 'text-blue-600'
                                  : percentage >= 40
                                  ? 'text-warning-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {percentage}%
                            </span>
                          </div>
                        )
                      })}
                    </div>
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
