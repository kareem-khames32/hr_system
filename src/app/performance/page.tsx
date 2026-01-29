'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Filter,
  Download,
  Plus,
  Target,
  TrendingUp,
  TrendingDown,
  Award,
  Star,
  Calendar,
  User,
  Users,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit2,
  MessageSquare,
  ChevronDown,
} from 'lucide-react'
import Link from 'next/link'

interface PerformanceReview {
  id: string
  employeeName: string
  employeeAvatar: string
  department: string
  position: string
  reviewPeriod: string
  reviewDate: string
  overallScore: number
  status: 'pending' | 'in-progress' | 'completed' | 'approved'
  reviewer: string
  goals: { completed: number; total: number }
  competencies: {
    name: string
    score: number
  }[]
}

const reviews: PerformanceReview[] = [
  {
    id: '1',
    employeeName: 'أحمد محمد علي',
    employeeAvatar: 'أ',
    department: 'تقنية المعلومات',
    position: 'مطور برمجيات أول',
    reviewPeriod: 'الربع الرابع 2024',
    reviewDate: '2024-01-15',
    overallScore: 4.5,
    status: 'completed',
    reviewer: 'سالم العتيبي',
    goals: { completed: 8, total: 10 },
    competencies: [
      { name: 'الجودة التقنية', score: 5 },
      { name: 'العمل الجماعي', score: 4 },
      { name: 'التواصل', score: 4 },
      { name: 'حل المشكلات', score: 5 },
    ],
  },
  {
    id: '2',
    employeeName: 'سارة أحمد الخالدي',
    employeeAvatar: 'س',
    department: 'الموارد البشرية',
    position: 'أخصائي موارد بشرية',
    reviewPeriod: 'الربع الرابع 2024',
    reviewDate: '2024-01-14',
    overallScore: 4.2,
    status: 'approved',
    reviewer: 'محمد سالم',
    goals: { completed: 7, total: 8 },
    competencies: [
      { name: 'التواصل', score: 5 },
      { name: 'التنظيم', score: 4 },
      { name: 'خدمة العملاء', score: 4 },
      { name: 'المبادرة', score: 4 },
    ],
  },
  {
    id: '3',
    employeeName: 'عمر سالم الحربي',
    employeeAvatar: 'ع',
    department: 'المبيعات',
    position: 'مندوب مبيعات',
    reviewPeriod: 'الربع الرابع 2024',
    reviewDate: '2024-01-20',
    overallScore: 3.8,
    status: 'in-progress',
    reviewer: 'خالد محمد',
    goals: { completed: 5, total: 8 },
    competencies: [
      { name: 'تحقيق الأهداف', score: 4 },
      { name: 'التواصل', score: 4 },
      { name: 'علاقات العملاء', score: 3 },
      { name: 'المرونة', score: 4 },
    ],
  },
  {
    id: '4',
    employeeName: 'نورة محمد الدوسري',
    employeeAvatar: 'ن',
    department: 'التسويق',
    position: 'مدير تسويق',
    reviewPeriod: 'الربع الرابع 2024',
    reviewDate: '2024-01-25',
    overallScore: 0,
    status: 'pending',
    reviewer: 'أحمد علي',
    goals: { completed: 0, total: 6 },
    competencies: [],
  },
  {
    id: '5',
    employeeName: 'فهد عبدالله السعيد',
    employeeAvatar: 'ف',
    department: 'تقنية المعلومات',
    position: 'مطور برمجيات',
    reviewPeriod: 'الربع الرابع 2024',
    reviewDate: '2024-01-18',
    overallScore: 4.8,
    status: 'completed',
    reviewer: 'أحمد محمد',
    goals: { completed: 10, total: 10 },
    competencies: [
      { name: 'الجودة التقنية', score: 5 },
      { name: 'الابتكار', score: 5 },
      { name: 'التعلم المستمر', score: 5 },
      { name: 'الالتزام', score: 4 },
    ],
  },
]

const statusLabels = {
  pending: 'في الانتظار',
  'in-progress': 'قيد التقييم',
  completed: 'مكتمل',
  approved: 'معتمد',
}

const statusColors = {
  pending: 'bg-gray-100 text-gray-700',
  'in-progress': 'bg-blue-100 text-blue-700',
  completed: 'bg-warning-50 text-warning-700',
  approved: 'bg-success-50 text-success-700',
}

function ScoreIndicator({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 4.5) return 'text-success-600'
    if (score >= 3.5) return 'text-blue-600'
    if (score >= 2.5) return 'text-warning-600'
    return 'text-red-600'
  }

  const getBgColor = () => {
    if (score >= 4.5) return 'bg-success-50'
    if (score >= 3.5) return 'bg-blue-50'
    if (score >= 2.5) return 'bg-warning-50'
    return 'bg-red-50'
  }

  return (
    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${getBgColor()}`}>
      <Star size={14} className={`${getColor()} fill-current`} />
      <span className={`font-bold ${getColor()}`}>{score.toFixed(1)}</span>
    </div>
  )
}

export default function PerformancePage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterDepartment, setFilterDepartment] = useState('all')

  const filteredReviews = reviews.filter((review) => {
    const matchesSearch =
      review.employeeName.includes(searchTerm) || review.department.includes(searchTerm)
    const matchesStatus = filterStatus === 'all' || review.status === filterStatus
    const matchesDepartment = filterDepartment === 'all' || review.department === filterDepartment
    return matchesSearch && matchesStatus && matchesDepartment
  })

  const stats = {
    totalReviews: reviews.length,
    completed: reviews.filter((r) => r.status === 'completed' || r.status === 'approved').length,
    pending: reviews.filter((r) => r.status === 'pending').length,
    avgScore:
      reviews.filter((r) => r.overallScore > 0).reduce((sum, r) => sum + r.overallScore, 0) /
      reviews.filter((r) => r.overallScore > 0).length,
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">إدارة الأداء</h1>
            <p className="text-gray-500 mt-1">تقييم ومتابعة أداء الموظفين</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/performance/goals" className="btn-secondary flex items-center gap-2">
              <Target size={18} />
              الأهداف
            </Link>
            <button className="btn-primary flex items-center gap-2">
              <Plus size={18} />
              تقييم جديد
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
              <BarChart3 size={24} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي التقييمات</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalReviews}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
              <CheckCircle2 size={24} className="text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">مكتملة</p>
              <p className="text-2xl font-bold text-gray-800">{stats.completed}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-warning-50 rounded-2xl flex items-center justify-center">
              <Clock size={24} className="text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">في الانتظار</p>
              <p className="text-2xl font-bold text-gray-800">{stats.pending}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Star size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">متوسط التقييم</p>
              <p className="text-2xl font-bold text-gray-800">{stats.avgScore.toFixed(1)}/5</p>
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
                placeholder="بحث عن موظف..."
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
              <option value="pending">في الانتظار</option>
              <option value="in-progress">قيد التقييم</option>
              <option value="completed">مكتمل</option>
              <option value="approved">معتمد</option>
            </select>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="input w-48"
            >
              <option value="all">كل الأقسام</option>
              <option value="تقنية المعلومات">تقنية المعلومات</option>
              <option value="الموارد البشرية">الموارد البشرية</option>
              <option value="المبيعات">المبيعات</option>
              <option value="التسويق">التسويق</option>
            </select>
            <button className="btn-secondary flex items-center gap-2">
              <Download size={18} />
              تصدير
            </button>
          </div>
        </div>

        {/* Reviews Table */}
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الموظف</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الفترة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الأهداف</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">التقييم</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الحالة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">المُقيِّم</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredReviews.map((review) => (
                <tr key={review.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold">
                        {review.employeeAvatar}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{review.employeeName}</p>
                        <p className="text-sm text-gray-500">{review.position}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-gray-800">{review.reviewPeriod}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(review.reviewDate).toLocaleDateString('ar-SA')}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-success-500 rounded-full"
                          style={{
                            width: `${(review.goals.completed / review.goals.total) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">
                        {review.goals.completed}/{review.goals.total}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {review.overallScore > 0 ? (
                      <ScoreIndicator score={review.overallScore} />
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        statusColors[review.status]
                      }`}
                    >
                      {statusLabels[review.status]}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-gray-600">{review.reviewer}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        href={`/performance/${review.id}`}
                        className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <Eye size={16} className="text-gray-600" />
                      </Link>
                      <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                        <Edit2 size={16} className="text-gray-600" />
                      </button>
                      <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                        <MessageSquare size={16} className="text-gray-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Performance Distribution */}
        <div className="grid grid-cols-2 gap-4">
          <div className="card">
            <h2 className="text-lg font-bold text-gray-800 mb-4">توزيع التقييمات</h2>
            <div className="space-y-4">
              {[
                { label: 'ممتاز (4.5-5.0)', count: 2, percentage: 40, color: 'bg-success-500' },
                { label: 'جيد جداً (3.5-4.4)', count: 2, percentage: 40, color: 'bg-blue-500' },
                { label: 'جيد (2.5-3.4)', count: 1, percentage: 20, color: 'bg-warning-500' },
                { label: 'يحتاج تحسين (0-2.4)', count: 0, percentage: 0, color: 'bg-red-500' },
              ].map((item, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">{item.label}</span>
                    <span className="text-sm font-medium text-gray-800">{item.count} موظف</span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-bold text-gray-800 mb-4">أفضل الموظفين أداءً</h2>
            <div className="space-y-3">
              {reviews
                .filter((r) => r.overallScore > 0)
                .sort((a, b) => b.overallScore - a.overallScore)
                .slice(0, 5)
                .map((review, index) => (
                  <div
                    key={review.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                        index === 0
                          ? 'bg-yellow-500'
                          : index === 1
                          ? 'bg-gray-400'
                          : index === 2
                          ? 'bg-amber-600'
                          : 'bg-gray-300'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{review.employeeName}</p>
                      <p className="text-xs text-gray-500">{review.department}</p>
                    </div>
                    <ScoreIndicator score={review.overallScore} />
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
