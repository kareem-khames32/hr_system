'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import Link from 'next/link'
import {
  ArrowRight,
  Plus,
  Search,
  Layers,
  Edit,
  Trash2,
  MoreVertical,
  Users,
  ChevronDown,
  ChevronLeft,
  Building2,
  User,
} from 'lucide-react'

// Mock data for departments
const initialDepartments = [
  {
    id: '1',
    name: 'الإدارة العليا',
    nameEn: 'Executive Management',
    code: 'EXEC',
    parentId: null,
    managerId: '1',
    managerName: 'محمد أحمد السعيد',
    branch: 'الفرع الرئيسي - الرياض',
    employeesCount: 5,
    description: 'الإدارة التنفيذية للشركة',
    isActive: true,
  },
  {
    id: '2',
    name: 'الموارد البشرية',
    nameEn: 'Human Resources',
    code: 'HR',
    parentId: '1',
    managerId: '2',
    managerName: 'أحمد محمد علي',
    branch: 'الفرع الرئيسي - الرياض',
    employeesCount: 12,
    description: 'إدارة شؤون الموظفين والتوظيف',
    isActive: true,
  },
  {
    id: '3',
    name: 'تقنية المعلومات',
    nameEn: 'Information Technology',
    code: 'IT',
    parentId: '1',
    managerId: '3',
    managerName: 'خالد سالم العتيبي',
    branch: 'الفرع الرئيسي - الرياض',
    employeesCount: 25,
    description: 'إدارة البنية التحتية والتطوير',
    isActive: true,
  },
  {
    id: '4',
    name: 'التطوير',
    nameEn: 'Development',
    code: 'IT-DEV',
    parentId: '3',
    managerId: '4',
    managerName: 'عمر فهد القحطاني',
    branch: 'الفرع الرئيسي - الرياض',
    employeesCount: 15,
    description: 'فريق تطوير البرمجيات',
    isActive: true,
  },
  {
    id: '5',
    name: 'الدعم الفني',
    nameEn: 'Technical Support',
    code: 'IT-SUP',
    parentId: '3',
    managerId: '5',
    managerName: 'ناصر عبدالله المالكي',
    branch: 'الفرع الرئيسي - الرياض',
    employeesCount: 10,
    description: 'دعم المستخدمين والأنظمة',
    isActive: true,
  },
  {
    id: '6',
    name: 'المالية',
    nameEn: 'Finance',
    code: 'FIN',
    parentId: '1',
    managerId: '6',
    managerName: 'سعد محمد الدوسري',
    branch: 'الفرع الرئيسي - الرياض',
    employeesCount: 18,
    description: 'الشؤون المالية والمحاسبة',
    isActive: true,
  },
  {
    id: '7',
    name: 'المبيعات',
    nameEn: 'Sales',
    code: 'SALES',
    parentId: '1',
    managerId: '7',
    managerName: 'فيصل عبدالرحمن الشمري',
    branch: 'الفرع الرئيسي - الرياض',
    employeesCount: 35,
    description: 'إدارة المبيعات والعملاء',
    isActive: true,
  },
  {
    id: '8',
    name: 'التسويق',
    nameEn: 'Marketing',
    code: 'MKT',
    parentId: '1',
    managerId: '8',
    managerName: 'عبدالعزيز سلطان الحربي',
    branch: 'الفرع الرئيسي - الرياض',
    employeesCount: 14,
    description: 'التسويق والعلاقات العامة',
    isActive: true,
  },
]

const branches = [
  'الفرع الرئيسي - الرياض',
  'فرع جدة',
  'فرع الدمام',
  'فرع المدينة المنورة',
]

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState(initialDepartments)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingDept, setEditingDept] = useState<typeof initialDepartments[0] | null>(null)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list')
  const [expandedDepts, setExpandedDepts] = useState<string[]>(['1', '3'])

  const [formData, setFormData] = useState({
    name: '',
    nameEn: '',
    code: '',
    parentId: '',
    managerName: '',
    branch: '',
    description: '',
    isActive: true,
  })

  const filteredDepartments = departments.filter(
    (dept) =>
      dept.name.includes(searchQuery) ||
      dept.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getChildren = (parentId: string | null) => {
    return departments.filter((d) => d.parentId === parentId)
  }

  const handleOpenModal = (dept?: typeof initialDepartments[0]) => {
    if (dept) {
      setEditingDept(dept)
      setFormData({
        name: dept.name,
        nameEn: dept.nameEn,
        code: dept.code,
        parentId: dept.parentId || '',
        managerName: dept.managerName,
        branch: dept.branch,
        description: dept.description,
        isActive: dept.isActive,
      })
    } else {
      setEditingDept(null)
      setFormData({
        name: '',
        nameEn: '',
        code: '',
        parentId: '',
        managerName: '',
        branch: '',
        description: '',
        isActive: true,
      })
    }
    setShowModal(true)
  }

  const handleSave = () => {
    if (editingDept) {
      setDepartments(
        departments.map((d) =>
          d.id === editingDept.id
            ? { ...d, ...formData, parentId: formData.parentId || null }
            : d
        )
      )
    } else {
      const newDept = {
        id: String(Date.now()),
        ...formData,
        parentId: formData.parentId || null,
        managerId: String(Date.now()),
        employeesCount: 0,
      }
      setDepartments([...departments, newDept])
    }
    setShowModal(false)
  }

  const handleDelete = (id: string) => {
    const hasChildren = departments.some((d) => d.parentId === id)
    if (hasChildren) {
      alert('لا يمكن حذف قسم له أقسام فرعية')
      return
    }
    if (confirm('هل أنت متأكد من حذف هذا القسم؟')) {
      setDepartments(departments.filter((d) => d.id !== id))
    }
    setActiveMenu(null)
  }

  const toggleExpand = (id: string) => {
    setExpandedDepts((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    )
  }

  const renderTreeItem = (dept: typeof initialDepartments[0], level: number = 0) => {
    const children = getChildren(dept.id)
    const hasChildren = children.length > 0
    const isExpanded = expandedDepts.includes(dept.id)

    return (
      <div key={dept.id}>
        <div
          className={`flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors ${
            level > 0 ? 'mr-8' : ''
          }`}
          style={{ marginRight: level * 32 }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(dept.id)}
              className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ChevronDown
                size={18}
                className={`text-gray-400 transition-transform ${
                  isExpanded ? '' : '-rotate-90'
                }`}
              />
            </button>
          ) : (
            <div className="w-7" />
          )}

          <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
            <Layers size={20} className="text-primary-600" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-800">{dept.name}</span>
              <span className="text-xs text-gray-400 font-mono">({dept.code})</span>
            </div>
            <p className="text-sm text-gray-500">{dept.managerName}</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Users size={14} />
              <span>{dept.employeesCount}</span>
            </div>
            <button
              onClick={() => handleOpenModal(dept)}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Edit size={16} className="text-gray-500" />
            </button>
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div className="border-r-2 border-gray-100 mr-4">
            {children.map((child) => renderTreeItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  const totalEmployees = departments.reduce((sum, d) => sum + d.employeesCount, 0)
  const rootDepartments = departments.filter((d) => !d.parentId)

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/settings" className="hover:text-primary-600">
            الإعدادات
          </Link>
          <ArrowRight size={16} />
          <span className="text-gray-800">إدارة الأقسام</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">إدارة الأقسام والإدارات</h1>
            <p className="text-gray-500 mt-1">الهيكل التنظيمي للشركة</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            إضافة قسم جديد
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
                <Layers size={24} className="text-primary-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">إجمالي الأقسام</p>
                <p className="text-2xl font-bold text-gray-800">{departments.length}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-success-50 rounded-xl flex items-center justify-center">
                <Layers size={24} className="text-success-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">الأقسام الرئيسية</p>
                <p className="text-2xl font-bold text-success-600">
                  {departments.filter((d) => !d.parentId).length}
                </p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-warning-50 rounded-xl flex items-center justify-center">
                <Users size={24} className="text-warning-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">إجمالي الموظفين</p>
                <p className="text-2xl font-bold text-gray-800">{totalEmployees}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                <User size={24} className="text-gray-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">متوسط حجم القسم</p>
                <p className="text-2xl font-bold text-gray-800">
                  {Math.round(totalEmployees / departments.length)} موظف
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search & View Toggle */}
        <div className="card p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search
                size={20}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="البحث عن قسم..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pr-10 w-full"
              />
            </div>
            <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-primary-600 shadow'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                قائمة
              </button>
              <button
                onClick={() => setViewMode('tree')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'tree'
                    ? 'bg-white text-primary-600 shadow'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                شجرة
              </button>
            </div>
          </div>
        </div>

        {/* Tree View */}
        {viewMode === 'tree' && (
          <div className="card p-4">
            {rootDepartments.map((dept) => renderTreeItem(dept))}
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-right py-4 px-6 text-sm font-bold text-gray-700">
                    القسم
                  </th>
                  <th className="text-right py-4 px-6 text-sm font-bold text-gray-700">
                    الكود
                  </th>
                  <th className="text-right py-4 px-6 text-sm font-bold text-gray-700">
                    القسم الأب
                  </th>
                  <th className="text-right py-4 px-6 text-sm font-bold text-gray-700">
                    المدير
                  </th>
                  <th className="text-right py-4 px-6 text-sm font-bold text-gray-700">
                    الفرع
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
                {filteredDepartments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                          <Layers size={20} className="text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{dept.name}</p>
                          <p className="text-sm text-gray-500">{dept.nameEn}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-mono text-sm text-primary-600 bg-primary-50 px-2 py-1 rounded">
                        {dept.code}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-600">
                      {dept.parentId
                        ? departments.find((d) => d.id === dept.parentId)?.name
                        : '-'}
                    </td>
                    <td className="py-4 px-6 text-gray-600">{dept.managerName}</td>
                    <td className="py-4 px-6 text-gray-600">
                      <div className="flex items-center gap-2">
                        <Building2 size={14} className="text-gray-400" />
                        <span className="text-sm">{dept.branch}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1">
                        <Users size={14} className="text-gray-400" />
                        <span className="text-gray-600">{dept.employeesCount}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="relative">
                        <button
                          onClick={() =>
                            setActiveMenu(activeMenu === dept.id ? null : dept.id)
                          }
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <MoreVertical size={18} className="text-gray-500" />
                        </button>

                        {activeMenu === dept.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActiveMenu(null)}
                            />
                            <div className="absolute left-0 top-full mt-1 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20">
                              <button
                                onClick={() => {
                                  handleOpenModal(dept)
                                  setActiveMenu(null)
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50"
                              >
                                <Edit size={16} />
                                تعديل
                              </button>
                              <button
                                onClick={() => handleDelete(dept.id)}
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
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingDept ? 'تعديل القسم' : 'إضافة قسم جديد'}
                </h2>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      اسم القسم (عربي) *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="input w-full"
                      placeholder="مثال: الموارد البشرية"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      اسم القسم (إنجليزي)
                    </label>
                    <input
                      type="text"
                      value={formData.nameEn}
                      onChange={(e) =>
                        setFormData({ ...formData, nameEn: e.target.value })
                      }
                      className="input w-full"
                      placeholder="e.g. Human Resources"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      كود القسم *
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                      }
                      className="input w-full font-mono"
                      placeholder="مثال: HR"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      القسم الأب
                    </label>
                    <select
                      value={formData.parentId}
                      onChange={(e) =>
                        setFormData({ ...formData, parentId: e.target.value })
                      }
                      className="input w-full"
                    >
                      <option value="">بدون (قسم رئيسي)</option>
                      {departments
                        .filter((d) => d.id !== editingDept?.id)
                        .map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      مدير القسم
                    </label>
                    <input
                      type="text"
                      value={formData.managerName}
                      onChange={(e) =>
                        setFormData({ ...formData, managerName: e.target.value })
                      }
                      className="input w-full"
                      placeholder="اسم المدير"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الفرع
                    </label>
                    <select
                      value={formData.branch}
                      onChange={(e) =>
                        setFormData({ ...formData, branch: e.target.value })
                      }
                      className="input w-full"
                    >
                      <option value="">اختر الفرع</option>
                      {branches.map((branch) => (
                        <option key={branch} value={branch}>
                          {branch}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الوصف
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="input w-full h-24 resize-none"
                    placeholder="وصف مختصر للقسم..."
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
                  <span className="text-sm text-gray-700">قسم نشط</span>
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
                  {editingDept ? 'حفظ التغييرات' : 'إضافة القسم'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
