'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import Link from 'next/link'
import {
  ArrowRight,
  Plus,
  Search,
  Briefcase,
  Edit,
  Trash2,
  MoreVertical,
  Users,
  Layers,
  Award,
} from 'lucide-react'

// Mock data for job titles
const initialJobTitles = [
  {
    id: '1',
    name: 'الرئيس التنفيذي',
    nameEn: 'Chief Executive Officer',
    code: 'CEO',
    department: 'الإدارة العليا',
    grade: 'Grade 10',
    level: 'executive',
    employeesCount: 1,
    description: 'المسؤول الأول عن إدارة الشركة',
    isActive: true,
  },
  {
    id: '2',
    name: 'مدير الموارد البشرية',
    nameEn: 'HR Manager',
    code: 'HR-MGR',
    department: 'الموارد البشرية',
    grade: 'Grade 8',
    level: 'manager',
    employeesCount: 1,
    description: 'إدارة شؤون الموظفين والتوظيف',
    isActive: true,
  },
  {
    id: '3',
    name: 'أخصائي موارد بشرية',
    nameEn: 'HR Specialist',
    code: 'HR-SP',
    department: 'الموارد البشرية',
    grade: 'Grade 5',
    level: 'professional',
    employeesCount: 5,
    description: 'متابعة شؤون الموظفين',
    isActive: true,
  },
  {
    id: '4',
    name: 'مدير تقنية المعلومات',
    nameEn: 'IT Manager',
    code: 'IT-MGR',
    department: 'تقنية المعلومات',
    grade: 'Grade 8',
    level: 'manager',
    employeesCount: 1,
    description: 'إدارة البنية التحتية التقنية',
    isActive: true,
  },
  {
    id: '5',
    name: 'مطور برمجيات أول',
    nameEn: 'Senior Software Developer',
    code: 'IT-SSD',
    department: 'تقنية المعلومات',
    grade: 'Grade 6',
    level: 'senior',
    employeesCount: 8,
    description: 'تطوير وبرمجة الأنظمة',
    isActive: true,
  },
  {
    id: '6',
    name: 'مطور برمجيات',
    nameEn: 'Software Developer',
    code: 'IT-SD',
    department: 'تقنية المعلومات',
    grade: 'Grade 4',
    level: 'professional',
    employeesCount: 12,
    description: 'تطوير وبرمجة الأنظمة',
    isActive: true,
  },
  {
    id: '7',
    name: 'محاسب',
    nameEn: 'Accountant',
    code: 'FIN-ACC',
    department: 'المالية',
    grade: 'Grade 4',
    level: 'professional',
    employeesCount: 6,
    description: 'المحاسبة والتقارير المالية',
    isActive: true,
  },
  {
    id: '8',
    name: 'مندوب مبيعات',
    nameEn: 'Sales Representative',
    code: 'SALES-REP',
    department: 'المبيعات',
    grade: 'Grade 3',
    level: 'entry',
    employeesCount: 20,
    description: 'بيع المنتجات والخدمات',
    isActive: true,
  },
  {
    id: '9',
    name: 'مدير مبيعات',
    nameEn: 'Sales Manager',
    code: 'SALES-MGR',
    department: 'المبيعات',
    grade: 'Grade 7',
    level: 'manager',
    employeesCount: 2,
    description: 'إدارة فريق المبيعات',
    isActive: true,
  },
  {
    id: '10',
    name: 'سكرتير تنفيذي',
    nameEn: 'Executive Secretary',
    code: 'EXEC-SEC',
    department: 'الإدارة العليا',
    grade: 'Grade 4',
    level: 'professional',
    employeesCount: 3,
    description: 'دعم الإدارة التنفيذية',
    isActive: true,
  },
]

const departments = [
  'الإدارة العليا',
  'الموارد البشرية',
  'تقنية المعلومات',
  'المالية',
  'المبيعات',
  'التسويق',
]

const grades = [
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
]

const levels = [
  { value: 'entry', label: 'مبتدئ' },
  { value: 'professional', label: 'متخصص' },
  { value: 'senior', label: 'أول' },
  { value: 'manager', label: 'مدير' },
  { value: 'executive', label: 'تنفيذي' },
]

const getLevelLabel = (level: string) => {
  return levels.find((l) => l.value === level)?.label || level
}

const getLevelColor = (level: string) => {
  const colors: Record<string, string> = {
    entry: 'bg-gray-100 text-gray-600',
    professional: 'bg-blue-100 text-blue-600',
    senior: 'bg-purple-100 text-purple-600',
    manager: 'bg-warning-100 text-warning-600',
    executive: 'bg-primary-100 text-primary-600',
  }
  return colors[level] || 'bg-gray-100 text-gray-600'
}

export default function JobTitlesPage() {
  const [jobTitles, setJobTitles] = useState(initialJobTitles)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDepartment, setFilterDepartment] = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingJob, setEditingJob] = useState<typeof initialJobTitles[0] | null>(null)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    nameEn: '',
    code: '',
    department: '',
    grade: '',
    level: 'professional',
    description: '',
    isActive: true,
  })

  const filteredJobTitles = jobTitles.filter((job) => {
    const matchesSearch =
      job.name.includes(searchQuery) ||
      job.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.code.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDepartment = !filterDepartment || job.department === filterDepartment
    const matchesLevel = !filterLevel || job.level === filterLevel
    return matchesSearch && matchesDepartment && matchesLevel
  })

  const handleOpenModal = (job?: typeof initialJobTitles[0]) => {
    if (job) {
      setEditingJob(job)
      setFormData({
        name: job.name,
        nameEn: job.nameEn,
        code: job.code,
        department: job.department,
        grade: job.grade,
        level: job.level,
        description: job.description,
        isActive: job.isActive,
      })
    } else {
      setEditingJob(null)
      setFormData({
        name: '',
        nameEn: '',
        code: '',
        department: '',
        grade: '',
        level: 'professional',
        description: '',
        isActive: true,
      })
    }
    setShowModal(true)
  }

  const handleSave = () => {
    if (editingJob) {
      setJobTitles(
        jobTitles.map((j) =>
          j.id === editingJob.id ? { ...j, ...formData } : j
        )
      )
    } else {
      const newJob = {
        id: String(Date.now()),
        ...formData,
        employeesCount: 0,
      }
      setJobTitles([...jobTitles, newJob])
    }
    setShowModal(false)
  }

  const handleDelete = (id: string) => {
    const job = jobTitles.find((j) => j.id === id)
    if (job && job.employeesCount > 0) {
      alert('لا يمكن حذف مسمى وظيفي مرتبط بموظفين')
      return
    }
    if (confirm('هل أنت متأكد من حذف هذا المسمى الوظيفي؟')) {
      setJobTitles(jobTitles.filter((j) => j.id !== id))
    }
    setActiveMenu(null)
  }

  const totalEmployees = jobTitles.reduce((sum, j) => sum + j.employeesCount, 0)

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/settings" className="hover:text-primary-600">
            الإعدادات
          </Link>
          <ArrowRight size={16} />
          <span className="text-gray-800">المسميات الوظيفية</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">المسميات الوظيفية</h1>
            <p className="text-gray-500 mt-1">إدارة المسميات والوظائف في الشركة</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            إضافة مسمى وظيفي
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
                <Briefcase size={24} className="text-primary-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">المسميات الوظيفية</p>
                <p className="text-2xl font-bold text-gray-800">{jobTitles.length}</p>
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
                <Layers size={24} className="text-warning-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">الأقسام</p>
                <p className="text-2xl font-bold text-gray-800">
                  {new Set(jobTitles.map((j) => j.department)).size}
                </p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                <Award size={24} className="text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">الوظائف الإدارية</p>
                <p className="text-2xl font-bold text-gray-800">
                  {jobTitles.filter((j) => j.level === 'manager' || j.level === 'executive').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search
                size={20}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="البحث عن مسمى وظيفي..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pr-10 w-full"
              />
            </div>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="input w-48"
            >
              <option value="">كل الأقسام</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="input w-48"
            >
              <option value="">كل المستويات</option>
              {levels.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-right py-4 px-6 text-sm font-bold text-gray-700">
                  المسمى الوظيفي
                </th>
                <th className="text-right py-4 px-6 text-sm font-bold text-gray-700">
                  الكود
                </th>
                <th className="text-right py-4 px-6 text-sm font-bold text-gray-700">
                  القسم
                </th>
                <th className="text-right py-4 px-6 text-sm font-bold text-gray-700">
                  الدرجة
                </th>
                <th className="text-right py-4 px-6 text-sm font-bold text-gray-700">
                  المستوى
                </th>
                <th className="text-right py-4 px-6 text-sm font-bold text-gray-700">
                  الموظفين
                </th>
                <th className="text-right py-4 px-6 text-sm font-bold text-gray-700">
                  إجراءات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredJobTitles.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                        <Briefcase size={20} className="text-primary-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{job.name}</p>
                        <p className="text-sm text-gray-500">{job.nameEn}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="font-mono text-sm text-primary-600 bg-primary-50 px-2 py-1 rounded">
                      {job.code}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-gray-600">{job.department}</td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-gray-600">{job.grade}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getLevelColor(
                        job.level
                      )}`}
                    >
                      {getLevelLabel(job.level)}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-1">
                      <Users size={14} className="text-gray-400" />
                      <span className="text-gray-600">{job.employeesCount}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="relative">
                      <button
                        onClick={() =>
                          setActiveMenu(activeMenu === job.id ? null : job.id)
                        }
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <MoreVertical size={18} className="text-gray-500" />
                      </button>

                      {activeMenu === job.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setActiveMenu(null)}
                          />
                          <div className="absolute left-0 top-full mt-1 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20">
                            <button
                              onClick={() => {
                                handleOpenModal(job)
                                setActiveMenu(null)
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50"
                            >
                              <Edit size={16} />
                              تعديل
                            </button>
                            <button
                              onClick={() => handleDelete(job.id)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-danger-600 hover:bg-danger-50"
                            >
                              <Trash2 size={16} />
                              حذف
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingJob ? 'تعديل المسمى الوظيفي' : 'إضافة مسمى وظيفي'}
                </h2>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      المسمى (عربي) *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="input w-full"
                      placeholder="مثال: مطور برمجيات"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      المسمى (إنجليزي)
                    </label>
                    <input
                      type="text"
                      value={formData.nameEn}
                      onChange={(e) =>
                        setFormData({ ...formData, nameEn: e.target.value })
                      }
                      className="input w-full"
                      placeholder="e.g. Software Developer"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الكود *
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                      }
                      className="input w-full font-mono"
                      placeholder="مثال: IT-SD"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      القسم *
                    </label>
                    <select
                      value={formData.department}
                      onChange={(e) =>
                        setFormData({ ...formData, department: e.target.value })
                      }
                      className="input w-full"
                    >
                      <option value="">اختر القسم</option>
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الدرجة الوظيفية
                    </label>
                    <select
                      value={formData.grade}
                      onChange={(e) =>
                        setFormData({ ...formData, grade: e.target.value })
                      }
                      className="input w-full"
                    >
                      <option value="">اختر الدرجة</option>
                      {grades.map((grade) => (
                        <option key={grade} value={grade}>
                          {grade}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      المستوى الوظيفي
                    </label>
                    <select
                      value={formData.level}
                      onChange={(e) =>
                        setFormData({ ...formData, level: e.target.value })
                      }
                      className="input w-full"
                    >
                      {levels.map((level) => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الوصف الوظيفي
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="input w-full h-24 resize-none"
                    placeholder="وصف المهام والمسؤوليات..."
                  />
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
                  <span className="text-sm text-gray-700">مسمى نشط</span>
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
                  {editingJob ? 'حفظ التغييرات' : 'إضافة المسمى'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
