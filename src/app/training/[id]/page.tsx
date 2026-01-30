'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  ArrowRight,
  Play,
  Clock,
  Users,
  Star,
  CheckCircle2,
  Circle,
  Lock,
  FileText,
  Download,
  MessageSquare,
  Award,
  BookOpen,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

const course = {
  id: '1',
  title: 'أساسيات الأمن السيبراني',
  description: 'تعلم أساسيات حماية المعلومات والأمن الرقمي في بيئة العمل. هذه الدورة تغطي المفاهيم الأساسية للأمن السيبراني وكيفية حماية نفسك ومؤسستك من التهديدات الإلكترونية.',
  instructor: {
    name: 'م. أحمد السعيد',
    title: 'خبير أمن المعلومات',
    avatar: 'أ',
  },
  thumbnail: '🔐',
  duration: '4 ساعات',
  lessonsCount: 12,
  enrolledCount: 180,
  rating: 4.8,
  level: 'مبتدئ',
  language: 'العربية',
  lastUpdated: '2024-01-15',
  progress: 75,
  sections: [
    {
      id: 's1',
      title: 'مقدمة في الأمن السيبراني',
      lessons: [
        { id: 'l1', title: 'ما هو الأمن السيبراني؟', duration: '15 دقيقة', type: 'video', completed: true, locked: false },
        { id: 'l2', title: 'أهمية الأمن السيبراني', duration: '12 دقيقة', type: 'video', completed: true, locked: false },
        { id: 'l3', title: 'اختبار: المفاهيم الأساسية', duration: '10 دقائق', type: 'quiz', completed: true, locked: false },
      ],
    },
    {
      id: 's2',
      title: 'التهديدات الإلكترونية',
      lessons: [
        { id: 'l4', title: 'أنواع البرمجيات الخبيثة', duration: '20 دقيقة', type: 'video', completed: true, locked: false },
        { id: 'l5', title: 'هجمات التصيد الاحتيالي', duration: '18 دقيقة', type: 'video', completed: true, locked: false },
        { id: 'l6', title: 'الهندسة الاجتماعية', duration: '15 دقيقة', type: 'video', completed: true, locked: false },
        { id: 'l7', title: 'اختبار: التهديدات الإلكترونية', duration: '15 دقيقة', type: 'quiz', completed: false, locked: false },
      ],
    },
    {
      id: 's3',
      title: 'حماية البيانات',
      lessons: [
        { id: 'l8', title: 'كلمات المرور القوية', duration: '12 دقيقة', type: 'video', completed: true, locked: false },
        { id: 'l9', title: 'التشفير والحماية', duration: '20 دقيقة', type: 'video', completed: true, locked: false },
        { id: 'l10', title: 'النسخ الاحتياطي', duration: '10 دقائق', type: 'video', completed: true, locked: false },
      ],
    },
    {
      id: 's4',
      title: 'أفضل الممارسات',
      lessons: [
        { id: 'l11', title: 'سياسات الأمان في العمل', duration: '15 دقيقة', type: 'video', completed: false, locked: true },
        { id: 'l12', title: 'الاختبار النهائي', duration: '30 دقيقة', type: 'quiz', completed: false, locked: true },
      ],
    },
  ],
}

export default function CourseDetailsPage() {
  const params = useParams()
  const [activeSection, setActiveSection] = useState('s2')
  const [activeLesson, setActiveLesson] = useState('l7')

  const totalLessons = course.sections.reduce((sum, s) => sum + s.lessons.length, 0)
  const completedLessons = course.sections.reduce(
    (sum, s) => sum + s.lessons.filter((l) => l.completed).length,
    0
  )

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/training/my-courses" className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200">
            <ArrowRight size={20} className="text-gray-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-800">{course.title}</h1>
            <p className="text-gray-500 mt-1">{course.instructor.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-left">
              <p className="text-sm text-gray-500">التقدم</p>
              <p className="text-xl font-bold text-primary-600">{course.progress}%</p>
            </div>
            <div className="w-16 h-16 relative">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="#E5E7EB"
                  strokeWidth="8"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="#6C63FF"
                  strokeWidth="8"
                  strokeDasharray={`${course.progress * 1.76} 176`}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="col-span-2 space-y-6">
            {/* Video Player Placeholder */}
            <div className="card overflow-hidden">
              <div className="aspect-video bg-gray-900 flex items-center justify-center">
                <button className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                  <Play size={40} className="text-white mr-[-4px]" />
                </button>
              </div>
              <div className="p-4">
                <h2 className="text-lg font-bold text-gray-800">اختبار: التهديدات الإلكترونية</h2>
                <p className="text-gray-500">القسم 2 • الدرس 4</p>
              </div>
            </div>

            {/* Course Info Tabs */}
            <div className="card">
              <div className="flex gap-4 border-b border-gray-100 mb-4">
                <button className="pb-3 border-b-2 border-primary-500 text-primary-600 font-medium">
                  نظرة عامة
                </button>
                <button className="pb-3 text-gray-500 hover:text-gray-700">
                  الموارد
                </button>
                <button className="pb-3 text-gray-500 hover:text-gray-700">
                  المناقشات
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-gray-600 leading-relaxed">{course.description}</p>

                <div className="grid grid-cols-4 gap-4 pt-4">
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <Clock size={20} className="text-gray-400 mx-auto mb-1" />
                    <p className="text-sm text-gray-500">المدة</p>
                    <p className="font-medium text-gray-800">{course.duration}</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <BookOpen size={20} className="text-gray-400 mx-auto mb-1" />
                    <p className="text-sm text-gray-500">الدروس</p>
                    <p className="font-medium text-gray-800">{course.lessonsCount}</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <Users size={20} className="text-gray-400 mx-auto mb-1" />
                    <p className="text-sm text-gray-500">المشتركين</p>
                    <p className="font-medium text-gray-800">{course.enrolledCount}</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-xl">
                    <Star size={20} className="text-warning-500 mx-auto mb-1" />
                    <p className="text-sm text-gray-500">التقييم</p>
                    <p className="font-medium text-gray-800">{course.rating}/5</p>
                  </div>
                </div>

                {/* Instructor */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl mt-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center text-white text-xl font-bold">
                    {course.instructor.avatar}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{course.instructor.name}</p>
                    <p className="text-sm text-gray-500">{course.instructor.title}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Course Content */}
          <div className="space-y-4">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800">محتوى الدورة</h3>
                <span className="text-sm text-gray-500">
                  {completedLessons}/{totalLessons} درس
                </span>
              </div>

              <div className="space-y-3">
                {course.sections.map((section) => (
                  <div key={section.id} className="border border-gray-100 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setActiveSection(activeSection === section.id ? '' : section.id)}
                      className="w-full p-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
                    >
                      <span className="font-medium text-gray-800 text-sm">{section.title}</span>
                      <span className="text-xs text-gray-500">
                        {section.lessons.filter((l) => l.completed).length}/{section.lessons.length}
                      </span>
                    </button>

                    {activeSection === section.id && (
                      <div className="p-2 space-y-1">
                        {section.lessons.map((lesson) => (
                          <button
                            key={lesson.id}
                            onClick={() => !lesson.locked && setActiveLesson(lesson.id)}
                            disabled={lesson.locked}
                            className={`w-full p-2 rounded-lg flex items-center gap-2 text-right transition-colors ${
                              activeLesson === lesson.id
                                ? 'bg-primary-50 text-primary-700'
                                : lesson.locked
                                ? 'opacity-50 cursor-not-allowed'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            {lesson.completed ? (
                              <CheckCircle2 size={16} className="text-success-500 flex-shrink-0" />
                            ) : lesson.locked ? (
                              <Lock size={16} className="text-gray-400 flex-shrink-0" />
                            ) : (
                              <Circle size={16} className="text-gray-300 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{lesson.title}</p>
                              <p className="text-xs text-gray-500">{lesson.duration}</p>
                            </div>
                            {lesson.type === 'quiz' && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                                اختبار
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Certificate */}
            <div className="card bg-gradient-to-br from-warning-50 to-warning-100">
              <div className="flex items-center gap-3 mb-3">
                <Award size={24} className="text-warning-600" />
                <h3 className="font-bold text-gray-800">شهادة إتمام</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                أكمل جميع الدروس واجتز الاختبار النهائي للحصول على شهادة معتمدة.
              </p>
              <div className="w-full h-2 bg-warning-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-warning-500 rounded-full"
                  style={{ width: `${course.progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {course.progress}% مكتمل - {100 - course.progress}% متبقي
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
