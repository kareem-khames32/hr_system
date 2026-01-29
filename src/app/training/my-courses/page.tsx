'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  BookOpen,
  Play,
  Clock,
  CheckCircle2,
  Award,
  TrendingUp,
  Calendar,
  Download,
} from 'lucide-react'
import Link from 'next/link'

interface EnrolledCourse {
  id: string
  title: string
  instructor: string
  thumbnail: string
  progress: number
  totalLessons: number
  completedLessons: number
  duration: string
  lastAccessed: string
  status: 'in-progress' | 'completed' | 'not-started'
  certificate?: boolean
  dueDate?: string
  mandatory: boolean
}

const myCourses: EnrolledCourse[] = [
  {
    id: '1',
    title: 'أساسيات الأمن السيبراني',
    instructor: 'م. أحمد السعيد',
    thumbnail: '🔐',
    progress: 75,
    totalLessons: 12,
    completedLessons: 9,
    duration: '4 ساعات',
    lastAccessed: '2024-01-25',
    status: 'in-progress',
    mandatory: true,
    dueDate: '2024-02-15',
  },
  {
    id: '2',
    title: 'مهارات القيادة الفعالة',
    instructor: 'د. سارة الخالدي',
    thumbnail: '👔',
    progress: 100,
    totalLessons: 20,
    completedLessons: 20,
    duration: '8 ساعات',
    lastAccessed: '2024-01-20',
    status: 'completed',
    certificate: true,
    mandatory: false,
  },
  {
    id: '3',
    title: 'سياسات الشركة والامتثال',
    instructor: 'نورة الدوسري',
    thumbnail: '📋',
    progress: 100,
    totalLessons: 8,
    completedLessons: 8,
    duration: '2 ساعة',
    lastAccessed: '2024-01-15',
    status: 'completed',
    certificate: true,
    mandatory: true,
  },
  {
    id: '4',
    title: 'التواصل الفعال في بيئة العمل',
    instructor: 'د. ريم الشمري',
    thumbnail: '🎯',
    progress: 30,
    totalLessons: 12,
    completedLessons: 4,
    duration: '5 ساعات',
    lastAccessed: '2024-01-22',
    status: 'in-progress',
    mandatory: false,
  },
  {
    id: '5',
    title: 'إدارة المشاريع الاحترافية PMP',
    instructor: 'م. عمر الحربي',
    thumbnail: '📊',
    progress: 0,
    totalLessons: 40,
    completedLessons: 0,
    duration: '24 ساعة',
    lastAccessed: '',
    status: 'not-started',
    mandatory: false,
  },
]

const statusLabels = {
  'in-progress': 'قيد التقدم',
  'completed': 'مكتمل',
  'not-started': 'لم يبدأ',
}

const statusColors = {
  'in-progress': 'bg-blue-100 text-blue-700',
  'completed': 'bg-success-50 text-success-700',
  'not-started': 'bg-gray-100 text-gray-700',
}

export default function MyCoursesPage() {
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const filteredCourses = myCourses.filter((course) => {
    const matchesSearch = course.title.includes(searchTerm)
    const matchesStatus = filterStatus === 'all' || course.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: myCourses.length,
    completed: myCourses.filter((c) => c.status === 'completed').length,
    inProgress: myCourses.filter((c) => c.status === 'in-progress').length,
    certificates: myCourses.filter((c) => c.certificate).length,
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">دوراتي التدريبية</h1>
            <p className="text-gray-500 mt-1">متابعة تقدمك في الدورات المسجلة</p>
          </div>
          <Link href="/training" className="btn-primary flex items-center gap-2">
            <BookOpen size={18} />
            استكشف الدورات
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
              <BookOpen size={24} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">الدورات المسجلة</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
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
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <TrendingUp size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">قيد التقدم</p>
              <p className="text-2xl font-bold text-gray-800">{stats.inProgress}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-warning-50 rounded-2xl flex items-center justify-center">
              <Award size={24} className="text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">الشهادات</p>
              <p className="text-2xl font-bold text-gray-800">{stats.certificates}</p>
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
            <div className="flex gap-2">
              {['all', 'in-progress', 'completed', 'not-started'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    filterStatus === status
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' ? 'الكل' : statusLabels[status as keyof typeof statusLabels]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Continue Learning */}
        {myCourses.some((c) => c.status === 'in-progress') && (
          <div className="card bg-gradient-to-br from-primary-500 to-primary-600 text-white">
            <h2 className="text-lg font-bold mb-4">أكمل ما بدأته</h2>
            <div className="flex items-center gap-4">
              {myCourses
                .filter((c) => c.status === 'in-progress')
                .slice(0, 1)
                .map((course) => (
                  <div key={course.id} className="flex items-center gap-4 flex-1">
                    <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-3xl">
                      {course.thumbnail}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{course.title}</h3>
                      <p className="text-primary-100">{course.instructor}</p>
                      <div className="mt-2 flex items-center gap-4">
                        <div className="flex-1 h-2 bg-white/30 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-white rounded-full"
                            style={{ width: `${course.progress}%` }}
                          />
                        </div>
                        <span className="text-sm">{course.progress}%</span>
                      </div>
                    </div>
                    <button className="bg-white text-primary-600 px-6 py-3 rounded-xl font-medium flex items-center gap-2 hover:bg-primary-50 transition-colors">
                      <Play size={18} />
                      استمر
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Courses List */}
        <div className="space-y-4">
          {filteredCourses.map((course) => (
            <div key={course.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center text-4xl">
                  {course.thumbnail}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-800">{course.title}</h3>
                    {course.mandatory && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                        إلزامي
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[course.status]}`}>
                      {statusLabels[course.status]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">{course.instructor}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {course.duration}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen size={14} />
                      {course.completedLessons}/{course.totalLessons} درس
                    </span>
                    {course.lastAccessed && (
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        آخر دخول: {new Date(course.lastAccessed).toLocaleDateString('ar-SA')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-left w-32">
                  {course.status !== 'not-started' && (
                    <>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                        <div
                          className={`h-full rounded-full ${
                            course.progress === 100 ? 'bg-success-500' : 'bg-primary-500'
                          }`}
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                      <p className="text-sm text-gray-600">{course.progress}% مكتمل</p>
                    </>
                  )}
                  {course.dueDate && course.status !== 'completed' && (
                    <p className="text-xs text-warning-600 mt-1">
                      مطلوب قبل: {new Date(course.dueDate).toLocaleDateString('ar-SA')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {course.certificate && (
                    <button className="p-2 bg-warning-50 rounded-lg hover:bg-warning-100" title="تحميل الشهادة">
                      <Award size={18} className="text-warning-600" />
                    </button>
                  )}
                  <Link
                    href={`/training/${course.id}`}
                    className="btn-primary flex items-center gap-2"
                  >
                    {course.status === 'not-started' ? (
                      <>
                        <Play size={16} />
                        ابدأ
                      </>
                    ) : course.status === 'completed' ? (
                      <>
                        <BookOpen size={16} />
                        مراجعة
                      </>
                    ) : (
                      <>
                        <Play size={16} />
                        استمر
                      </>
                    )}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  )
}
