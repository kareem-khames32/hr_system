'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import Link from 'next/link'
import {
  ArrowRight,
  Plus,
  Search,
  Users,
  Edit,
  Trash2,
  MoreVertical,
  Building2,
  UserCircle,
  CheckCircle,
  XCircle,
  ChevronDown,
} from 'lucide-react'

// Mock departments for dropdown
const departments = [
  { id: '1', name: 'تقنية المعلومات', manager: 'أحمد محمد علي' },
  { id: '2', name: 'الموارد البشرية', manager: 'سارة أحمد العلي' },
  { id: '3', name: 'المالية', manager: 'محمد سالم العتيبي' },
  { id: '4', name: 'المبيعات', manager: 'عبدالله فهد السعيد' },
  { id: '5', name: 'التسويق', manager: 'نورة محمد الشمري' },
  { id: '6', name: 'خدمة العملاء', manager: 'فاطمة علي الحربي' },
]

// Mock employees for team leader dropdown
const employees = [
  { id: '1', name: 'أحمد محمد علي', department: 'تقنية المعلومات', jobTitle: 'مدير تقنية المعلومات' },
  { id: '2', name: 'سارة أحمد العلي', department: 'الموارد البشرية', jobTitle: 'مديرة الموارد البشرية' },
  { id: '3', name: 'خالد عبدالله الشمري', department: 'تقنية المعلومات', jobTitle: 'قائد فريق التطوير' },
  { id: '4', name: 'فاطمة علي الحربي', department: 'خدمة العملاء', jobTitle: 'مديرة خدمة العملاء' },
  { id: '5', name: 'عمر سعيد القحطاني', department: 'تقنية المعلومات', jobTitle: 'قائد فريق الدعم الفني' },
  { id: '6', name: 'منى عبدالرحمن السالم', department: 'المبيعات', jobTitle: 'قائدة فريق المبيعات' },
  { id: '7', name: 'يوسف محمد الغامدي', department: 'التسويق', jobTitle: 'قائد فريق التسويق الرقمي' },
  { id: '8', name: 'ريم سالم العنزي', department: 'الموارد البشرية', jobTitle: 'قائدة فريق التوظيف' },
]

// Mock teams data
const initialTeams = [
  {
    id: '1',
    name: 'فريق التطوير',
    nameEn: 'Development Team',
    code: 'IT-DEV',
    departmentId: '1',
    departmentName: 'تقنية المعلومات',
    leaderId: '3',
    leaderName: 'خالد عبدالله الشمري',
    membersCount: 8,
    description: 'فريق تطوير البرمجيات والتطبيقات',
    isActive: true,
  },
  {
    id: '2',
    name: 'فريق الدعم الفني',
    nameEn: 'Technical Support Team',
    code: 'IT-SUP',
    departmentId: '1',
    departmentName: 'تقنية المعلومات',
    leaderId: '5',
    leaderName: 'عمر سعيد القحطاني',
    membersCount: 5,
    description: 'فريق الدعم الفني وحل المشكلات التقنية',
    isActive: true,
  },
  {
    id: '3',
    name: 'فريق التوظيف',
    nameEn: 'Recruitment Team',
    code: 'HR-REC',
    departmentId: '2',
    departmentName: 'الموارد البشرية',
    leaderId: '8',
    leaderName: 'ريم سالم العنزي',
    membersCount: 4,
    description: 'فريق التوظيف واستقطاب الكفاءات',
    isActive: true,
  },
  {
    id: '4',
    name: 'فريق المبيعات الداخلية',
    nameEn: 'Inside Sales Team',
    code: 'SAL-INT',
    departmentId: '4',
    departmentName: 'المبيعات',
    leaderId: '6',
    leaderName: 'منى عبدالرحمن السالم',
    membersCount: 6,
    description: 'فريق المبيعات الداخلية والهاتفية',
    isActive: true,
  },
  {
    id: '5',
    name: 'فريق التسويق الرقمي',
    nameEn: 'Digital Marketing Team',
    code: 'MKT-DIG',
    departmentId: '5',
    departmentName: 'التسويق',
    leaderId: '7',
    leaderName: 'يوسف محمد الغامدي',
    membersCount: 4,
    description: 'فريق التسويق الإلكتروني ووسائل التواصل',
    isActive: true,
  },
]

export default function TeamsPage() {
  const [teams, setTeams] = useState(initialTeams)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDepartment, setFilterDepartment] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingTeam, setEditingTeam] = useState<typeof initialTeams[0] | null>(null)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    nameEn: '',
    code: '',
    departmentId: '',
    leaderId: '',
    description: '',
    isActive: true,
  })

  const filteredTeams = teams.filter((team) => {
    const matchesSearch =
      team.name.includes(searchQuery) ||
      team.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.leaderName.includes(searchQuery)

    const matchesDepartment = !filterDepartment || team.departmentId === filterDepartment

    return matchesSearch && matchesDepartment
  })

  // Group teams by department
  const teamsByDepartment = filteredTeams.reduce((acc, team) => {
    if (!acc[team.departmentName]) {
      acc[team.departmentName] = []
    }
    acc[team.departmentName].push(team)
    return acc
  }, {} as Record<string, typeof initialTeams>)

  const handleOpenModal = (team?: typeof initialTeams[0]) => {
    if (team) {
      setEditingTeam(team)
      setFormData({
        name: team.name,
        nameEn: team.nameEn,
        code: team.code,
        departmentId: team.departmentId,
        leaderId: team.leaderId,
        description: team.description,
        isActive: team.isActive,
      })
    } else {
      setEditingTeam(null)
      setFormData({
        name: '',
        nameEn: '',
        code: '',
        departmentId: '',
        leaderId: '',
        description: '',
        isActive: true,
      })
    }
    setShowModal(true)
  }

  const handleSave = () => {
    const department = departments.find((d) => d.id === formData.departmentId)
    const leader = employees.find((e) => e.id === formData.leaderId)

    if (editingTeam) {
      setTeams(
        teams.map((t) =>
          t.id === editingTeam.id
            ? {
                ...t,
                ...formData,
                departmentName: department?.name || '',
                leaderName: leader?.name || '',
              }
            : t
        )
      )
    } else {
      const newTeam = {
        id: String(Date.now()),
        ...formData,
        departmentName: department?.name || '',
        leaderName: leader?.name || '',
        membersCount: 0,
      }
      setTeams([...teams, newTeam])
    }
    setShowModal(false)
  }

  const handleDelete = (id: string) => {
    const team = teams.find((t) => t.id === id)
    if (team && team.membersCount > 0) {
      alert('لا يمكن حذف فريق يحتوي على أعضاء')
      return
    }
    if (confirm('هل أنت متأكد من حذف هذا الفريق؟')) {
      setTeams(teams.filter((t) => t.id !== id))
    }
    setActiveMenu(null)
  }

  const toggleStatus = (id: string) => {
    setTeams(
      teams.map((t) => (t.id === id ? { ...t, isActive: !t.isActive } : t))
    )
    setActiveMenu(null)
  }

  const totalMembers = teams.reduce((sum, t) => sum + t.membersCount, 0)
  const activeTeams = teams.filter((t) => t.isActive).length

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/settings" className="hover:text-primary-600">
            الإعدادات
          </Link>
          <ArrowRight size={16} />
          <span className="text-gray-800">إدارة الفرق</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">إدارة الفرق</h1>
            <p className="text-gray-500 mt-1">
              الفرق داخل الأقسام - مدير الفريق هو المدير المباشر للموظفين
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            إضافة فريق جديد
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
                <Users size={24} className="text-primary-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">إجمالي الفرق</p>
                <p className="text-2xl font-bold text-gray-800">{teams.length}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-success-50 rounded-xl flex items-center justify-center">
                <CheckCircle size={24} className="text-success-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">الفرق النشطة</p>
                <p className="text-2xl font-bold text-success-600">{activeTeams}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-warning-50 rounded-xl flex items-center justify-center">
                <UserCircle size={24} className="text-warning-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">إجمالي الأعضاء</p>
                <p className="text-2xl font-bold text-gray-800">{totalMembers}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                <Building2 size={24} className="text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">الأقسام</p>
                <p className="text-2xl font-bold text-gray-800">
                  {new Set(teams.map((t) => t.departmentId)).size}
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
                placeholder="البحث عن فريق..."
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
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Teams by Department */}
        <div className="space-y-6">
          {Object.entries(teamsByDepartment).map(([deptName, deptTeams]) => (
            <div key={deptName} className="space-y-4">
              {/* Department Header */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                  <Building2 size={20} className="text-primary-600" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-800">{deptName}</h2>
                  <p className="text-sm text-gray-500">
                    {deptTeams.length} فريق • {deptTeams.reduce((sum, t) => sum + t.membersCount, 0)} عضو
                  </p>
                </div>
              </div>

              {/* Teams Grid */}
              <div className="grid grid-cols-3 gap-4 mr-13">
                {deptTeams.map((team) => (
                  <div
                    key={team.id}
                    className={`card p-5 relative ${!team.isActive ? 'opacity-60' : ''}`}
                  >
                    {/* Status & Actions */}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span
                        className={`badge text-xs ${
                          team.isActive ? 'badge-success' : 'badge-danger'
                        }`}
                      >
                        {team.isActive ? 'نشط' : 'غير نشط'}
                      </span>
                      <div className="relative">
                        <button
                          onClick={() =>
                            setActiveMenu(activeMenu === team.id ? null : team.id)
                          }
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <MoreVertical size={16} className="text-gray-500" />
                        </button>

                        {activeMenu === team.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActiveMenu(null)}
                            />
                            <div className="absolute left-0 top-full mt-1 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20">
                              <button
                                onClick={() => {
                                  handleOpenModal(team)
                                  setActiveMenu(null)
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 text-sm"
                              >
                                <Edit size={14} />
                                تعديل
                              </button>
                              <button
                                onClick={() => toggleStatus(team.id)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 text-sm"
                              >
                                {team.isActive ? (
                                  <>
                                    <XCircle size={14} />
                                    تعطيل
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle size={14} />
                                    تفعيل
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => handleDelete(team.id)}
                                className="w-full flex items-center gap-2 px-4 py-2 text-danger-600 hover:bg-danger-50 text-sm"
                              >
                                <Trash2 size={14} />
                                حذف
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Team Info */}
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-primary-500/30">
                        <Users size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-800 truncate">{team.name}</h3>
                        <p className="text-xs text-gray-500 truncate">{team.nameEn}</p>
                        <p className="text-xs text-primary-600 font-mono mt-1">{team.code}</p>
                      </div>
                    </div>

                    {/* Description */}
                    {team.description && (
                      <p className="text-sm text-gray-500 mt-3 line-clamp-2">
                        {team.description}
                      </p>
                    )}

                    {/* Team Leader */}
                    <div className="mt-4 p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500 mb-1">مدير الفريق (المدير المباشر)</p>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                          <UserCircle size={18} className="text-primary-600" />
                        </div>
                        <span className="font-medium text-gray-800 text-sm">
                          {team.leaderName}
                        </span>
                      </div>
                    </div>

                    {/* Members Count */}
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {team.membersCount} عضو
                        </span>
                      </div>
                      <Link
                        href={`/employees?team=${team.id}`}
                        className="text-xs text-primary-600 hover:text-primary-700"
                      >
                        عرض الأعضاء
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredTeams.length === 0 && (
          <div className="card p-12 text-center">
            <Users size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">لا توجد فرق</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || filterDepartment
                ? 'لم يتم العثور على فرق مطابقة للبحث'
                : 'ابدأ بإضافة فريق جديد'}
            </p>
            {!searchQuery && !filterDepartment && (
              <button
                onClick={() => handleOpenModal()}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus size={18} />
                إضافة فريق
              </button>
            )}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingTeam ? 'تعديل الفريق' : 'إضافة فريق جديد'}
                </h2>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      اسم الفريق (عربي) *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="input w-full"
                      placeholder="مثال: فريق التطوير"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      اسم الفريق (إنجليزي)
                    </label>
                    <input
                      type="text"
                      value={formData.nameEn}
                      onChange={(e) =>
                        setFormData({ ...formData, nameEn: e.target.value })
                      }
                      className="input w-full"
                      placeholder="e.g. Development Team"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      كود الفريق *
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                      }
                      className="input w-full font-mono"
                      placeholder="مثال: IT-DEV"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      القسم *
                    </label>
                    <select
                      value={formData.departmentId}
                      onChange={(e) =>
                        setFormData({ ...formData, departmentId: e.target.value })
                      }
                      className="input w-full"
                    >
                      <option value="">اختر القسم</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    مدير الفريق (المدير المباشر) *
                  </label>
                  <select
                    value={formData.leaderId}
                    onChange={(e) =>
                      setFormData({ ...formData, leaderId: e.target.value })
                    }
                    className="input w-full"
                  >
                    <option value="">اختر مدير الفريق</option>
                    {employees
                      .filter(
                        (emp) =>
                          !formData.departmentId ||
                          emp.department ===
                            departments.find((d) => d.id === formData.departmentId)?.name
                      )
                      .map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} - {emp.jobTitle}
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    مدير الفريق سيكون المدير المباشر لجميع أعضاء الفريق
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    وصف الفريق
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="input w-full"
                    rows={3}
                    placeholder="وصف مختصر لمهام الفريق..."
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
                  <span className="text-sm text-gray-700">فريق نشط</span>
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
                  {editingTeam ? 'حفظ التغييرات' : 'إضافة الفريق'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
