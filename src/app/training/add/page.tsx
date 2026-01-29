'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout'
import {
  ArrowRight,
  Upload,
  Image,
  Video,
  FileText,
  Plus,
  Trash2,
  Save,
  Send,
  GraduationCap,
  Clock,
  Users,
  Tag,
  DollarSign,
} from 'lucide-react'

const categories = [
  'البرمجة والتقنية',
  'القيادة والإدارة',
  'المبيعات والتسويق',
  'التواصل والمهارات الشخصية',
  'الموارد البشرية',
  'المالية والمحاسبة',
]

const instructors = [
  { id: '1', name: 'د. أحمد محمد', specialty: 'تطوير البرمجيات' },
  { id: '2', name: 'أ. سارة الخالد', specialty: 'القيادة والإدارة' },
  { id: '3', name: 'م. محمد العلي', specialty: 'تقنية المعلومات' },
]

export default function AddCoursePage() {
  const [courseData, setCourseData] = useState({
    title: '',
    titleEn: '',
    description: '',
    category: '',
    level: 'beginner',
    instructor: '',
    duration: '',
    price: '',
    isFree: false,
    isPublished: false,
  })

  const [sections, setSections] = useState([
    { id: '1', title: '', lessons: [{ id: '1', title: '', type: 'video', duration: '' }] },
  ])

  const addSection = () => {
    setSections([
      ...sections,
      {
        id: Date.now().toString(),
        title: '',
        lessons: [{ id: Date.now().toString(), title: '', type: 'video', duration: '' }],
      },
    ])
  }

  const removeSection = (sectionId: string) => {
    setSections(sections.filter((s) => s.id !== sectionId))
  }

  const addLesson = (sectionId: string) => {
    setSections(
      sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              lessons: [
                ...s.lessons,
                { id: Date.now().toString(), title: '', type: 'video', duration: '' },
              ],
            }
          : s
      )
    )
  }

  const removeLesson = (sectionId: string, lessonId: string) => {
    setSections(
      sections.map((s) =>
        s.id === sectionId
          ? { ...s, lessons: s.lessons.filter((l) => l.id !== lessonId) }
          : s
      )
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/training"
              className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              <ArrowRight size={20} className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">إضافة دورة تدريبية</h1>
              <p className="text-gray-500">إنشاء دورة تدريبية جديدة</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-secondary flex items-center gap-2">
              <Save size={18} />
              حفظ كمسودة
            </button>
            <button className="btn-primary flex items-center gap-2">
              <Send size={18} />
              نشر الدورة
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <GraduationCap size={20} className="text-primary-500" />
                المعلومات الأساسية
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    عنوان الدورة (عربي)
                  </label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="مثال: أساسيات تطوير الويب"
                    value={courseData.title}
                    onChange={(e) => setCourseData({ ...courseData, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    عنوان الدورة (إنجليزي)
                  </label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="Example: Web Development Fundamentals"
                    value={courseData.titleEn}
                    onChange={(e) => setCourseData({ ...courseData, titleEn: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    وصف الدورة
                  </label>
                  <textarea
                    className="input w-full"
                    rows={4}
                    placeholder="اكتب وصفاً تفصيلياً للدورة..."
                    value={courseData.description}
                    onChange={(e) => setCourseData({ ...courseData, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      التصنيف
                    </label>
                    <select
                      className="input w-full"
                      value={courseData.category}
                      onChange={(e) => setCourseData({ ...courseData, category: e.target.value })}
                    >
                      <option value="">اختر التصنيف</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      المستوى
                    </label>
                    <select
                      className="input w-full"
                      value={courseData.level}
                      onChange={(e) => setCourseData({ ...courseData, level: e.target.value })}
                    >
                      <option value="beginner">مبتدئ</option>
                      <option value="intermediate">متوسط</option>
                      <option value="advanced">متقدم</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Course Cover */}
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Image size={20} className="text-primary-500" />
                صورة الغلاف
              </h3>
              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-primary-400 transition-colors cursor-pointer">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Upload size={32} className="text-gray-400" />
                </div>
                <p className="text-gray-600 mb-2">اسحب الصورة هنا أو انقر للاختيار</p>
                <p className="text-sm text-gray-400">PNG, JPG حتى 5MB - مقاس 1280x720</p>
              </div>
            </div>

            {/* Course Content */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <Video size={20} className="text-primary-500" />
                  محتوى الدورة
                </h3>
                <button
                  onClick={addSection}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
                >
                  <Plus size={16} />
                  إضافة قسم
                </button>
              </div>

              <div className="space-y-4">
                {sections.map((section, sectionIndex) => (
                  <div key={section.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="w-8 h-8 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center font-bold text-sm">
                        {sectionIndex + 1}
                      </span>
                      <input
                        type="text"
                        className="input flex-1"
                        placeholder="عنوان القسم"
                        value={section.title}
                        onChange={(e) =>
                          setSections(
                            sections.map((s) =>
                              s.id === section.id ? { ...s, title: e.target.value } : s
                            )
                          )
                        }
                      />
                      {sections.length > 1 && (
                        <button
                          onClick={() => removeSection(section.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>

                    <div className="space-y-3 mr-11">
                      {section.lessons.map((lesson, lessonIndex) => (
                        <div key={lesson.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <span className="text-sm text-gray-500">{lessonIndex + 1}.</span>
                          <input
                            type="text"
                            className="input flex-1"
                            placeholder="عنوان الدرس"
                            value={lesson.title}
                          />
                          <select className="input w-32" value={lesson.type}>
                            <option value="video">فيديو</option>
                            <option value="document">مستند</option>
                            <option value="quiz">اختبار</option>
                          </select>
                          <input
                            type="text"
                            className="input w-24"
                            placeholder="المدة"
                            value={lesson.duration}
                          />
                          {section.lessons.length > 1 && (
                            <button
                              onClick={() => removeLesson(section.id, lesson.id)}
                              className="p-2 text-red-500 hover:bg-red-100 rounded-lg"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => addLesson(section.id)}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
                      >
                        <Plus size={14} />
                        إضافة درس
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Instructor */}
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Users size={20} className="text-primary-500" />
                المدرب
              </h3>
              <select
                className="input w-full"
                value={courseData.instructor}
                onChange={(e) => setCourseData({ ...courseData, instructor: e.target.value })}
              >
                <option value="">اختر المدرب</option>
                {instructors.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name} - {inst.specialty}
                  </option>
                ))}
              </select>
            </div>

            {/* Duration */}
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Clock size={20} className="text-primary-500" />
                المدة الإجمالية
              </h3>
              <input
                type="text"
                className="input w-full"
                placeholder="مثال: 10 ساعات"
                value={courseData.duration}
                onChange={(e) => setCourseData({ ...courseData, duration: e.target.value })}
              />
            </div>

            {/* Pricing */}
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <DollarSign size={20} className="text-primary-500" />
                التسعير
              </h3>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={courseData.isFree}
                    onChange={(e) =>
                      setCourseData({ ...courseData, isFree: e.target.checked, price: '' })
                    }
                    className="w-5 h-5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-gray-700">دورة مجانية</span>
                </label>
                {!courseData.isFree && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      السعر (ر.س)
                    </label>
                    <input
                      type="number"
                      className="input w-full"
                      placeholder="0"
                      value={courseData.price}
                      onChange={(e) => setCourseData({ ...courseData, price: e.target.value })}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Course Summary */}
            <div className="card bg-gray-50">
              <h3 className="font-bold text-gray-800 mb-4">ملخص الدورة</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">عدد الأقسام</span>
                  <span className="font-medium text-gray-800">{sections.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">عدد الدروس</span>
                  <span className="font-medium text-gray-800">
                    {sections.reduce((sum, s) => sum + s.lessons.length, 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">السعر</span>
                  <span className="font-medium text-gray-800">
                    {courseData.isFree ? 'مجاني' : courseData.price ? `${courseData.price} ر.س` : '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Requirements Note */}
            <div className="card bg-blue-50 border border-blue-200">
              <h3 className="font-bold text-blue-800 mb-2">ملاحظات</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• تأكد من رفع جميع الفيديوهات قبل النشر</li>
                <li>• يجب إضافة صورة غلاف للدورة</li>
                <li>• اكتب وصفاً واضحاً ومفصلاً</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
