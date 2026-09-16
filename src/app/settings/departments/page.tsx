'use client'

import { useEffect, useState } from 'react'
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
  Building2,
  User,
  UsersRound,
} from 'lucide-react'
import {
  ApiBranch,
  ApiDepartment,
  ApiEmployee,
  ApiTeam,
  createDepartment,
  fetchBranches,
  fetchDepartments,
  fetchEmployees,
  fetchTeams,
  updateDepartment,
} from '@/lib/api'

const emptyForm = {
  name: '',
  nameEn: '',
  code: '',
  parentId: '',
  managerId: '',
  branchId: '',
  isActive: true,
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<ApiDepartment[]>([])
  const [branches, setBranches] = useState<ApiBranch[]>([])
  const [employees, setEmployees] = useState<ApiEmployee[]>([])
  const [teams, setTeams] = useState<ApiTeam[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editingDept, setEditingDept] = useState<ApiDepartment | null>(null)
  const [activeMenu, setActiveMenu] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('tree')
  const [expandedDepts, setExpandedDepts] = useState<number[]>([])

  const [formData, setFormData] = useState({ ...emptyForm })

  const loadData = async () => {
    try {
      const [deps, brs, emps, tms] = await Promise.all([
        fetchDepartments(),
        fetchBranches(),
        fetchEmployees(),
        fetchTeams(),
      ])
      setDepartments(deps)
      setBranches(brs)
      setEmployees(emps)
      setTeams(tms)
      setExpandedDepts(deps.filter((d) => !d.parentId).map((d) => d.id))
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const managerNameOf = (managerEmployeeId?: number) =>
    employees.find((e) => e.id === managerEmployeeId)?.fullName ?? '—'

  const branchNameOf = (branchId: number) =>
    branches.find((b) => b.id === branchId)?.name ?? '—'

  const employeesCountOf = (deptId: number) =>
    employees.filter((e) => e.departmentId === deptId).length

  const teamMembersCountOf = (teamId: number) =>
    employees.filter((e) => e.teamId === teamId).length

  const filteredDepartments = departments.filter(
    (dept) =>
      dept.name.includes(searchQuery) ||
      (dept.nameEn ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dept.code ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getChildren = (parentId: number | null) => {
    return departments.filter((d) => (d.parentId ?? null) === parentId)
  }

  const getTeamsForDepartment = (deptId: number) => {
    return teams.filter((t) => t.departmentId === deptId)
  }

  // الأقسام التابعة لقسم (أبناء وأحفاد) — لا تصلح أباً له: الهيكل يصير دائرياً (SET-14)
  const descendantIdsOf = (deptId: number) => {
    const out = new Set<number>()
    const walk = (pid: number) => {
      for (const d of departments) {
        if (d.parentId === pid && !out.has(d.id)) {
          out.add(d.id)
          walk(d.id)
        }
      }
    }
    walk(deptId)
    return out
  }

  const handleOpenModal = (dept?: ApiDepartment) => {
    setModalError(null)
    if (dept) {
      setEditingDept(dept)
      setFormData({
        name: dept.name,
        nameEn: dept.nameEn ?? '',
        code: dept.code ?? '',
        parentId: dept.parentId ? String(dept.parentId) : '',
        managerId: dept.managerEmployeeId ? String(dept.managerEmployeeId) : '',
        branchId: String(dept.branchId),
        isActive: dept.isActive,
      })
    } else {
      setEditingDept(null)
      setFormData({ ...emptyForm })
    }
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setModalError(null)
    const payload: Partial<ApiDepartment> = {
      name: formData.name,
      nameEn: formData.nameEn || undefined,
      code: formData.code || undefined,
      branchId: formData.branchId ? Number(formData.branchId) : undefined,
      // «بدون» عند التعديل = قسم رئيسي (null يمسح الأب — كان يُهمل فيبقى الأب القديم)
      parentId: formData.parentId ? Number(formData.parentId) : editingDept ? null : undefined,
      managerEmployeeId: formData.managerId ? Number(formData.managerId) : undefined,
    }
    try {
      if (editingDept) {
        await updateDepartment(editingDept.id, { ...payload, isActive: formData.isActive,
          nameEn: formData.nameEn || null, code: formData.code || null,
          managerEmployeeId: formData.managerId ? Number(formData.managerId) : null,
        })
      } else {
        const created = await createDepartment(payload)
        // الإنشاء لا يقبل isActive — نعطّله بعد الإنشاء لو طُلب ذلك
        if (!formData.isActive) await updateDepartment(created.id, { isActive: false })
      }
      await loadData()
      setShowModal(false)
    } catch (err: any) {
      setModalError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleExpand = (id: number) => {
    setExpandedDepts((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    )
  }

  const renderTreeItem = (dept: ApiDepartment, level: number = 0) => {
    const children = getChildren(dept.id)
    const deptTeams = getTeamsForDepartment(dept.id)
    const hasChildren = children.length > 0 || deptTeams.length > 0
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
              <span className="text-xs text-gray-400 font-mono">({dept.code || '—'})</span>
            </div>
            <p className="text-sm text-gray-500">{managerNameOf(dept.managerEmployeeId)}</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Users size={14} />
              <span>{employeesCountOf(dept.id)}</span>
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
            {/* Render child departments first */}
            {children.map((child) => renderTreeItem(child, level + 1))}

            {/* Then render teams */}
            {deptTeams.map((team) => (
              <div
                key={team.id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                style={{ marginRight: (level + 1) * 32 }}
              >
                <div className="w-7" />

                <div className="w-10 h-10 bg-success-100 rounded-xl flex items-center justify-center">
                  <UsersRound size={20} className="text-success-600" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">{team.name}</span>
                    <span className="text-xs text-gray-400 font-mono">({team.code || '—'})</span>
                    <span className="text-xs bg-success-50 text-success-600 px-2 py-0.5 rounded-full">فريق</span>
                  </div>
                  <p className="text-sm text-gray-500">{managerNameOf(team.leaderEmployeeId)}</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Users size={14} />
                    <span>{teamMembersCountOf(team.id)}</span>
                  </div>
                  <Link
                    href="/settings/teams"
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <Edit size={16} className="text-gray-500" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const totalEmployees = employees.length
  const rootDepartments = departments.filter((d) => !d.parentId)
  const blockedParents = editingDept ? descendantIdsOf(editingDept.id) : new Set<number>()

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
            <h1 className="text-2xl font-bold text-gray-800">الأقسام والإدارات</h1>
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

        {/* Error Banner */}
        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

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
                  {rootDepartments.length}
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
                  {departments.length > 0
                    ? Math.round(totalEmployees / departments.length)
                    : 0}{' '}
                  موظف
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

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Tree View */}
        {!loading && viewMode === 'tree' && (
          <div className="card p-4">
            {rootDepartments.map((dept) => renderTreeItem(dept))}
          </div>
        )}

        {/* List View */}
        {!loading && viewMode === 'list' && (
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
                          <p className="text-sm text-gray-500">{dept.nameEn ?? ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-mono text-sm text-primary-600 bg-primary-50 px-2 py-1 rounded">
                        {dept.code || '—'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-600">
                      {dept.parentId
                        ? departments.find((d) => d.id === dept.parentId)?.name
                        : '-'}
                    </td>
                    <td className="py-4 px-6 text-gray-600">
                      {managerNameOf(dept.managerEmployeeId)}
                    </td>
                    <td className="py-4 px-6 text-gray-600">
                      <div className="flex items-center gap-2">
                        <Building2 size={14} className="text-gray-400" />
                        <span className="text-sm">{branchNameOf(dept.branchId)}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1">
                        <Users size={14} className="text-gray-400" />
                        <span className="text-gray-600">{employeesCountOf(dept.id)}</span>
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
                                disabled
                                title="الحذف غير متاح — عطّل القسم من نافذة التعديل"
                                className="w-full flex items-center gap-2 px-4 py-2 text-danger-600 opacity-50 cursor-not-allowed"
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
                {/* Modal Error */}
                {modalError && (
                  <div className="bg-red-50 text-red-700 rounded-xl p-4">{modalError}</div>
                )}

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
                        .filter(
                          (d) =>
                            d.id !== editingDept?.id &&
                            !blockedParents.has(d.id) &&
                            (!formData.branchId ||
                              d.branchId === Number(formData.branchId))
                        )
                        .map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                      تظهر أقسام الفرع المختار فقط، عدا الأقسام التابعة لهذا القسم
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      مدير القسم *
                    </label>
                    <select
                      value={formData.managerId}
                      onChange={(e) =>
                        setFormData({ ...formData, managerId: e.target.value })
                      }
                      className="input w-full"
                    >
                      <option value="">— اختر الموظف المسؤول —</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.fullName}
                          {emp.jobTitle ? ` — ${emp.jobTitle}` : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                      يُستخدم في دورات الاعتماد (رئيس القسم)
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الفرع *
                    </label>
                    <select
                      value={formData.branchId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          branchId: e.target.value,
                          parentId: '',
                        })
                      }
                      className="input w-full"
                    >
                      <option value="">اختر الفرع</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
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
                <button onClick={handleSave} disabled={saving} className="btn-primary">
                  {saving ? 'جارٍ الحفظ...' : editingDept ? 'حفظ التغييرات' : 'إضافة القسم'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
