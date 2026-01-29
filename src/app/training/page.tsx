'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Filter,
  Plus,
  BookOpen,
  GraduationCap,
  Clock,
  Users,
  Calendar,
  Play,
  CheckCircle2,
  Award,
  TrendingUp,
  Star,
  Video,
  FileText,
  Download,
  Eye,
  BarChart3,
} from 'lucide-react'
import Link from 'next/link'

interface Course {
  id: string
  title: string
  description: string
  category: string
  instructor: string
  duration: string
  lessonsCount: number
  enrolledCount: number
  completedCount: number
  rating: number
  level: 'beginner' | 'intermediate' | 'advanced'
  status: 'active' | 'draft' | 'archived'
  thumbnail: string
  type: 'video' | 'document' | 'interactive'
  mandatory: boolean
}

const courses: Course[] = [
  {
    id: '1',
    title: 'أساسيات الأمن السيبراني',
    description: 'تعلم أساسيات حماية المعلومات والأمن الرقمي في بيئة العمل',
    category: 'تقنية المعلومات',
    instructor: 'م. أحمد السعيد',
    duration: '4 ساعات',
    lessonsCount: 12,
    enrolledCount: 180,
    completedCount: 145,
    rating: 4.8,
    level: 'beginner',
    status: 'active',
    thumbnail: '🔐',
    type: 'video',
    mandatory: true,
  },
  {
    id: '2',
    title: 'مهارات القيادة الفعالة',
    description: 'برنامج شامل لتطوير المهارات القيادية والإدارية',
    category: 'تطوير ذاتي',
    instructor: 'د. سارة الخالدي',
    duration: '8 ساعات',
    lessonsCount: 20,
    enrolledCount: 65,
    completedCount: 42,
    rating: 4.9,
    level: 'intermediate',
    status: 'active',
    thumbnail: '👔',
    type: 'video',
    mandatory: false,
  },
  {
    id: '3',
    title: 'إدارة المشاريع الاحترافية PMP',
    description: 'التحضير لشهادة إدارة المشاريع الاحترافية',
    category: 'إدارة المشاريع',
    instructor: 'م. عمر الحربي',
    duration: '24 ساعة',
    lessonsCount: 40,
    enrolledCount: 35,
    completedCount: 18,
    rating: 4.7,
    level: 'advanced',
    status: 'active',
    thumbnail: '📊',
    type: 'interactive',
    mandatory: false,
  },
  {
    id: '4',
    title: 'سياسات الشركة والامتثال',
    description: 'دليل شامل لسياسات الشركة وإجراءات الامتثال',
    category: 'موارد بشرية',
    instructor: 'نورة الدوسري',
    duration: '2 ساعة',
    lessonsCount: 8,
    enrolledCount: 248,
    completedCount: 230,
    rating: 4.5,
    level: 'beginner',
    status: 'active',
    thumbnail: '📋',
    type: 'document',
    mandatory: true,
  },
  {
    id: '5',
    title: 'تقنيات البيع الاحترافية',
    description: 'استراتيجيات ومهارات البيع المتقدمة',
    category: 'المبيعات',
    instructor: 'أ. فهد العتيبي',
    duration: '6 ساعات',
    lessonsCount: 15,
    enrolledCount: 48,
    completedCount: 35,
    rating: 4.6,
    level: 'intermediate',
    status: 'active',
    thumbnail: '💼',
    type: 'video',
    mandatory: false,
  },
  {
    id: '6',
    title: 'التواصل الفعال في بيئة العمل',
    description: 'مهارات التواصل والعرض والتفاوض',
    category: 'تطوير ذاتي',
    instructor: 'د. ريم الشمري',
    duration: '5 ساعات',
    lessonsCount: 12,
    enrolledCount: 92,
    completedCount: 78,
    rating: 4.8,
    level: 'beginner',
    status: 'active',
    thumbnail: '🎯',
    type: 'interactive',
    mandatory: false,
  },
]

const levelLabels = {
  beginner: 'مبتدئ',
  intermediate: 'متوسط',
  advanced: 'متقدم',
}

const levelColors = {
  beginner: 'bg-green-100 text-green-700',
  intermediate: 'bg-blue-100 text-blue-700',
  advanced: 'bg-purple-100 text-purple-700',
}

const typeIcons = {
  video: Video,
  document: FileText,
  interactive: Play,
}

export default function TrainingPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterLevel, setFilterLevel] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.title.includes(searchTerm) || course.description.includes(searchTerm)
    const matchesCategory = filterCategory === 'all' || course.category === filterCategory
    const matchesLevel = filterLevel === 'all' || course.level === filterLevel
    return matchesSearch && matchesCategory && matchesLevel && course.status === 'active'
  })

  const categories = [...new Set(courses.map((c) => c.category))]

  const stats = {
    totalCourses: courses.filter((c) => c.status === 'active').length,
    totalEnrolled: courses.reduce((sum, c) => sum + c.enrolledCount, 0),
    totalCompleted: courses.reduce((sum, c) => sum + c.completedCount, 0),
    avgRating: courses.reduce((sum, c) => sum + c.rating, 0) / courses.length,
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">التدريب والتطوير</h1>
            <p className="text-gray-500 mt-1">منصة التعلم الإلكتروني للموظفين</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/training/my-courses" className="btn-secondary flex items-center gap-2">
              <BookOpen size={18} />
              دوراتي
            </Link>
            <button className="btn-primary flex items-center gap-2">
              <Plus size={18} />
              إضافة دورة
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
              <BookOpen size={24} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">الدورات المتاحة</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalCourses}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Users size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي التسجيلات</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalEnrolled}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
              <GraduationCap size={24} className="text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">الدورات المكتملة</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalCompleted}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-warning-50 rounded-2xl flex items-center justify-center">
              <Star size={24} className="text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">متوسط التقييم</p>
              <p className="text-2xl font-bold text-gray-800">{stats.avgRating.toFixed(1)}/5</p>
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
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="input w-48"
            >
              <option value="all">كل التصنيفات</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="input w-40"
            >
              <option value="all">كل المستويات</option>
              <option value="beginner">مبتدئ</option>
              <option value="intermediate">متوسط</option>
              <option value="advanced">متقدم</option>
            </select>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                }`}
              >
                <BarChart3 size={18} className="text-gray-600" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                }`}
              >
                <FileText size={18} className="text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Mandatory Courses Banner */}
        <div className="bg-primary-50 border border-primary-200 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
              <Award size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-primary-800">دورات إلزامية</p>
              <p className="text-sm text-primary-600">
                لديك {courses.filter((c) => c.mandatory).length} دورات إلزامية يجب إكمالها
              </p>
            </div>
            <button className="btn-primary btn-sm">عرض الدورات</button>
          </div>
        </div>

        {/* Courses Grid */}
        <div className={viewMode === 'grid' ? 'grid grid-cols-3 gap-4' : 'space-y-4'}>
          {filteredCourses.map((course) => {
            const TypeIcon = typeIcons[course.type]
            const completionRate = Math.round(
              (course.completedCount / course.enrolledCount) * 100
            )

            if (viewMode === 'grid') {
              return (
                <div
                  key={course.id}
                  className="card hover:shadow-lg transition-shadow overflow-hidden"
                >
                  {/* Thumbnail */}
                  <div className="h-32 bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-5xl relative">
                    {course.thumbnail}
                    {course.mandatory && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 bg-red-500 text-white text-xs font-medium rounded-full">
                        إلزامي
                      </span>
                    )}
                    <span
                      className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                        levelColors[course.level]
                      }`}
                    >
                      {levelLabels[course.level]}
                    </span>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-gray-800 line-clamp-2">{course.title}</h3>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                      {course.description}
                    </p>

                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {course.duration}
                      </span>
                      <span className="flex items-center gap-1">
                        <TypeIcon size={14} />
                        {course.lessonsCount} درس
                      </span>
                    </div>

                    <div className="flex items-center gap-1 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          className={
                            i < Math.floor(course.rating)
                              ? 'text-warning-500 fill-warning-500'
                              : 'text-gray-300'
                          }
                        />
                      ))}
                      <span className="text-sm text-gray-600 mr-1">
                        ({course.rating})
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <span className="text-sm text-gray-500">
                        {course.enrolledCount} مشترك
                      </span>
                      <button className="btn-primary btn-sm flex items-center gap-1">
                        <Play size={14} />
                        ابدأ الدورة
                      </button>
                    </div>
                  </div>
                </div>
              )
            } else {
              return (
                <div
                  key={course.id}
                  className="card hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">
                      {course.thumbnail}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-800">{course.title}</h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            levelColors[course.level]
                          }`}
                        >
                          {levelLabels[course.level]}
                        </span>
                        {course.mandatory && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                            إلزامي
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mb-2">{course.description}</p>
                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {course.duration}
                        </span>
                        <span className="flex items-center gap-1">
                          <TypeIcon size={14} />
                          {course.lessonsCount} درس
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={14} />
                          {course.enrolledCount} مشترك
                        </span>
                        <span className="flex items-center gap-1">
                          <Star size={14} className="text-warning-500 fill-warning-500" />
                          {course.rating}
                        </span>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-sm text-gray-500 mb-2">معدل الإكمال</p>
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                        <div
                          className="h-full bg-success-500 rounded-full"
                          style={{ width: `${completionRate}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500">{completionRate}%</p>
                    </div>
                    <button className="btn-primary flex items-center gap-2">
                      <Play size={18} />
                      ابدأ الدورة
                    </button>
                  </div>
                </div>
              )
            }
          })}
        </div>

        {/* Learning Paths */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-4">مسارات التعلم</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                title: 'مسار القيادة والإدارة',
                courses: 5,
                duration: '25 ساعة',
                enrolled: 45,
                color: 'from-blue-500 to-blue-600',
                icon: '🎯',
              },
              {
                title: 'مسار التطوير التقني',
                courses: 8,
                duration: '40 ساعة',
                enrolled: 78,
                color: 'from-purple-500 to-purple-600',
                icon: '💻',
              },
              {
                title: 'مسار المهارات الشخصية',
                courses: 6,
                duration: '18 ساعة',
                enrolled: 120,
                color: 'from-green-500 to-green-600',
                icon: '🌟',
              },
            ].map((path, index) => (
              <div
                key={index}
                className="bg-gray-50 rounded-2xl p-4 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-12 h-12 bg-gradient-to-br ${path.color} rounded-2xl flex items-center justify-center text-2xl`}
                  >
                    {path.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{path.title}</h3>
                    <p className="text-sm text-gray-500">
                      {path.courses} دورات • {path.duration}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{path.enrolled} مشترك</span>
                  <button className="text-primary-600 text-sm font-medium hover:text-primary-700">
                    عرض المسار ←
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
