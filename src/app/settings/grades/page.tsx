'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import Link from 'next/link'
import {
  ArrowRight,
  Plus,
  Search,
  Award,
  Edit,
  Trash2,
  MoreVertical,
  Users,
  TrendingUp,
  DollarSign,
  Briefcase,
} from 'lucide-react'

// Mock data for grades
const initialGrades = [
  {
    id: '1',
    name: 'Grade 1',
    nameAr: 'الدرجة الأولى',
    level: 1,
    minSalary: 3000,
    maxSalary: 5000,
    jobTitlesCount: 2,
    employeesCount: 15,
    description: 'وظائف المستوى الأول - موظفين جدد',
    benefits: ['تأمين طبي أساسي', 'إجازة سنوية 21 يوم'],
    isActive: true,
  },
  {
    id: '2',
    name: 'Grade 2',
    nameAr: 'الدرجة الثانية',
    level: 2,
    minSalary: 5000,
    maxSalary: 7000,
    jobTitlesCount: 3,
    employeesCount: 22,
    description: 'وظائف المستوى الثاني',
    benefits: ['تأمين طبي أساسي', 'إجازة سنوية 21 يوم', 'بدل مواصلات'],
    isActive: true,
  },
  {
    id: '3',
    name: 'Grade 3',
    nameAr: 'الدرجة الثالثة',
    level: 3,
    minSalary: 7000,
    maxSalary: 10000,
    jobTitlesCount: 4,
    employeesCount: 28,
    description: 'وظائف المستوى الثالث',
    benefits: ['تأمين طبي شامل', 'إجازة سنوية 25 يوم', 'بدل مواصلات', 'بدل هاتف'],
    isActive: true,
  },
  {
    id: '4',
    name: 'Grade 4',
    nameAr: 'الدرجة الرابعة',
    level: 4,
    minSalary: 10000,
    maxSalary: 14000,
    jobTitlesCount: 5,
    employeesCount: 18,
    description: 'متخصصين',
    benefits: ['تأمين طبي شامل للعائلة', 'إجازة سنوية 25 يوم', 'بدل مواصلات', 'بدل هاتف'],
    isActive: true,
  },
  {
    id: '5',
    name: 'Grade 5',
    nameAr: 'الدرجة الخامسة',
    level: 5,
    minSalary: 14000,
    maxSalary: 18000,
    jobTitlesCount: 4,
    employeesCount: 12,
    description: 'متخصصين أول',
    benefits: ['تأمين طبي شامل للعائلة', 'إجازة سنوية 30 يوم', 'بدل سكن', 'بدل مواصلات', 'بدل هاتف'],
    isActive: true,
  },
  {
    id: '6',
    name: 'Grade 6',
    nameAr: 'الدرجة السادسة',
    level: 6,
    minSalary: 18000,
    maxSalary: 24000,
    jobTitlesCount: 3,
    employeesCount: 8,
    description: 'مشرفين وقادة فرق',
    benefits: ['تأمين طبي VIP', 'إجازة سنوية 30 يوم', 'بدل سكن', 'سيارة شركة', 'بدل تعليم'],
    isActive: true,
  },
  {
    id: '7',
    name: 'Grade 7',
    nameAr: 'الدرجة السابعة',
    level: 7,
    minSalary: 24000,
    maxSalary: 32000,
    jobTitlesCount: 2,
    employeesCount: 5,
    description: 'مدراء أقسام',
    benefits: ['تأمين طبي VIP', 'إجازة سنوية 30 يوم', 'بدل سكن', 'سيارة شركة', 'بدل تعليم', 'تذاكر سفر'],
    isActive: true,
  },
  {
    id: '8',
    name: 'Grade 8',
    nameAr: 'الدرجة الثامنة',
    level: 8,
    minSalary: 32000,
    maxSalary: 45000,
    jobTitlesCount: 2,
    employeesCount: 4,
    description: 'مدراء إدارات',
    benefits: ['تأمين طبي VIP', 'إجازة سنوية 35 يوم', 'بدل سكن', 'سيارة فاخرة', 'بدل تعليم', 'تذاكر سفر درجة أعمال'],
    isActive: true,
  },
  {
    id: '9',
    name: 'Grade 9',
    nameAr: 'الدرجة التاسعة',
    level: 9,
    minSalary: 45000,
    maxSalary: 60000,
    jobTitlesCount: 1,
    employeesCount: 2,
    description: 'المدراء التنفيذيين',
    benefits: ['تأمين طبي دولي', 'إجازة سنوية 35 يوم', 'سكن مؤثث', 'سيارة فاخرة مع سائق', 'تعليم الأبناء', 'تذاكر سفر درجة أولى'],
    isActive: true,
  },
  {
    id: '10',
    name: 'Grade 10',
    nameAr: 'الدرجة العاشرة',
    level: 10,
    minSalary: 60000,
    maxSalary: 100000,
    jobTitlesCount: 1,
    employeesCount: 1,
    description: 'الإدارة العليا',
    benefits: ['تأمين طبي دولي VIP', 'إجازة مفتوحة', 'سكن فاخر', 'سيارة فاخرة مع سائق', 'تعليم الأبناء', 'تذاكر سفر درجة أولى', 'مكافأة سنوية'],
    isActive: true,
  },
]

export default function GradesPage() {
  const [grades, setGrades] = useState(initialGrades)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingGrade, setEditingGrade] = useState<typeof initialGrades[0] | null>(null)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    level: 1,
    minSalary: 0,
    maxSalary: 0,
    description: '',
    benefits: [] as string[],
    isActive: true,
  })
  const [newBenefit, setNewBenefit] = useState('')

  const filteredGrades = grades.filter(
    (grade) =>
      grade.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      grade.nameAr.includes(searchQuery)
  )

  const handleOpenModal = (grade?: typeof initialGrades[0]) => {
    if (grade) {
      setEditingGrade(grade)
      setFormData({
        name: grade.name,
        nameAr: grade.nameAr,
        level: grade.level,
        minSalary: grade.minSalary,
        maxSalary: grade.maxSalary,
        description: grade.description,
        benefits: [...grade.benefits],
        isActive: grade.isActive,
      })
    } else {
      setEditingGrade(null)
      setFormData({
        name: '',
        nameAr: '',
        level: grades.length + 1,
        minSalary: 0,
        maxSalary: 0,
        description: '',
        benefits: [],
        isActive: true,
      })
    }
    setShowModal(true)
  }

  const handleSave = () => {
    if (editingGrade) {
      setGrades(
        grades.map((g) =>
          g.id === editingGrade.id
            ? { ...g, ...formData }
            : g
        )
      )
    } else {
      const newGrade = {
        id: String(Date.now()),
        ...formData,
        jobTitlesCount: 0,
        employeesCount: 0,
      }
      setGrades([...grades, newGrade])
    }
    setShowModal(false)
  }

  const handleDelete = (id: string) => {
    const grade = grades.find((g) => g.id === id)
    if (grade && grade.employeesCount > 0) {
      alert('لا يمكن حذف درجة مرتبطة بموظفين')
      return
    }
    if (confirm('هل أنت متأكد من حذف هذه الدرجة الوظيفية؟')) {
      setGrades(grades.filter((g) => g.id !== id))
    }
    setActiveMenu(null)
  }

  const addBenefit = () => {
    if (newBenefit.trim()) {
      setFormData({
        ...formData,
        benefits: [...formData.benefits, newBenefit.trim()],
      })
      setNewBenefit('')
    }
  }

  const removeBenefit = (index: number) => {
    setFormData({
      ...formData,
      benefits: formData.benefits.filter((_, i) => i !== index),
    })
  }

  const totalEmployees = grades.reduce((sum, g) => sum + g.employeesCount, 0)
  const avgSalary = Math.round(
    grades.reduce((sum, g) => sum + (g.minSalary + g.maxSalary) / 2, 0) / grades.length
  )

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/settings" className="hover:text-primary-600">
            الإعدادات
          </Link>
          <ArrowRight size={16} />
          <span className="text-gray-800">الدرجات الوظيفية</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">الدرجات الوظيفية</h1>
            <p className="text-gray-500 mt-1">سلم الدرجات والرواتب</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            إضافة درجة وظيفية
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
                <Award size={24} className="text-primary-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">الدرجات الوظيفية</p>
                <p className="text-2xl font-bold text-gray-800">{grades.length}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-success-50 rounded-xl flex items-center justify-center">
                <Users size={24} className="text-success-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">إجمالي الموظفين</p>
                <p className="text-2xl font-bold text-success-600">{totalEmployees}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-warning-50 rounded-xl flex items-center justify-center">
                <DollarSign size={24} className="text-warning-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">متوسط الراتب</p>
                <p className="text-2xl font-bold text-gray-800">
                  {avgSalary.toLocaleString()} <span className="text-sm text-gray-500">ر.س</span>
                </p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                <TrendingUp size={24} className="text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">أعلى راتب</p>
                <p className="text-2xl font-bold text-gray-800">
                  {Math.max(...grades.map((g) => g.maxSalary)).toLocaleString()} <span className="text-sm text-gray-500">ر.س</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="card p-4">
          <div className="relative max-w-md">
            <Search
              size={20}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="البحث عن درجة وظيفية..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pr-10 w-full"
            />
          </div>
        </div>

        {/* Grades Grid */}
        <div className="grid grid-cols-2 gap-6">
          {filteredGrades.map((grade) => (
            <div key={grade.id} className="card p-6 relative">
              {/* Actions */}
              <div className="absolute top-4 left-4">
                <button
                  onClick={() =>
                    setActiveMenu(activeMenu === grade.id ? null : grade.id)
                  }
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <MoreVertical size={18} className="text-gray-500" />
                </button>

                {activeMenu === grade.id && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setActiveMenu(null)}
                    />
                    <div className="absolute left-0 top-full mt-1 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20">
                      <button
                        onClick={() => {
                          handleOpenModal(grade)
                          setActiveMenu(null)
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50"
                      >
                        <Edit size={16} />
                        تعديل
                      </button>
                      <button
                        onClick={() => handleDelete(grade.id)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-danger-600 hover:bg-danger-50"
                      >
                        <Trash2 size={16} />
                        حذف
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary-500/30">
                  {grade.level}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">{grade.name}</h3>
                  <p className="text-gray-500">{grade.nameAr}</p>
                  <p className="text-sm text-gray-400 mt-1">{grade.description}</p>
                </div>
              </div>

              {/* Salary Range */}
              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500 mb-2">نطاق الراتب</p>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-2xl font-bold text-gray-800">
                      {grade.minSalary.toLocaleString()}
                    </span>
                    <span className="text-gray-500 text-sm mr-1">ر.س</span>
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="h-2 bg-gray-200 rounded-full">
                      <div
                        className="h-full bg-gradient-to-l from-primary-500 to-primary-300 rounded-full"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-primary-600">
                      {grade.maxSalary.toLocaleString()}
                    </span>
                    <span className="text-gray-500 text-sm mr-1">ر.س</span>
                  </div>
                </div>
              </div>

              {/* Benefits */}
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-2">المزايا والبدلات</p>
                <div className="flex flex-wrap gap-2">
                  {grade.benefits.slice(0, 4).map((benefit, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-primary-50 text-primary-600 rounded-full text-xs"
                    >
                      {benefit}
                    </span>
                  ))}
                  {grade.benefits.length > 4 && (
                    <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">
                      +{grade.benefits.length - 4} مزايا أخرى
                    </span>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Briefcase size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {grade.jobTitlesCount} مسميات وظيفية
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-600">{grade.employeesCount} موظف</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingGrade ? 'تعديل الدرجة الوظيفية' : 'إضافة درجة وظيفية'}
                </h2>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الاسم (إنجليزي) *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="input w-full"
                      placeholder="e.g. Grade 1"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الاسم (عربي) *
                    </label>
                    <input
                      type="text"
                      value={formData.nameAr}
                      onChange={(e) =>
                        setFormData({ ...formData, nameAr: e.target.value })
                      }
                      className="input w-full"
                      placeholder="مثال: الدرجة الأولى"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      المستوى *
                    </label>
                    <input
                      type="number"
                      value={formData.level}
                      onChange={(e) =>
                        setFormData({ ...formData, level: parseInt(e.target.value) || 1 })
                      }
                      className="input w-full"
                      min={1}
                      max={20}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الحد الأدنى للراتب (ر.س) *
                    </label>
                    <input
                      type="number"
                      value={formData.minSalary}
                      onChange={(e) =>
                        setFormData({ ...formData, minSalary: parseInt(e.target.value) || 0 })
                      }
                      className="input w-full"
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الحد الأقصى للراتب (ر.س) *
                    </label>
                    <input
                      type="number"
                      value={formData.maxSalary}
                      onChange={(e) =>
                        setFormData({ ...formData, maxSalary: parseInt(e.target.value) || 0 })
                      }
                      className="input w-full"
                      min={0}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الوصف
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="input w-full"
                    placeholder="وصف مختصر للدرجة..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المزايا والبدلات
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newBenefit}
                      onChange={(e) => setNewBenefit(e.target.value)}
                      className="input flex-1"
                      placeholder="أضف ميزة..."
                      onKeyPress={(e) => e.key === 'Enter' && addBenefit()}
                    />
                    <button
                      onClick={addBenefit}
                      className="btn-secondary px-4"
                    >
                      إضافة
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.benefits.map((benefit, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-primary-50 text-primary-600 rounded-full text-sm flex items-center gap-2"
                      >
                        {benefit}
                        <button
                          onClick={() => removeBenefit(index)}
                          className="hover:text-danger-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">درجة نشطة</span>
                </label>
              </div>

              <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  إلغاء
                </button>
                <button onClick={handleSave} className="btn-primary">
                  {editingGrade ? 'حفظ التغييرات' : 'إضافة الدرجة'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
