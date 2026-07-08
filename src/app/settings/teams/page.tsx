'use client'

import { useEffect, useState } from 'react'
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
} from 'lucide-react'
import {
  ApiDepartment,
  ApiEmployee,
  ApiTeam,
  createTeam,
  fetchDepartments,
  fetchEmployees,
  fetchTeams,
  updateTeam,
} from '@/lib/api'

const emptyForm = {
  name: '',
  code: '',
  departmentId: '',
  leaderId: '',
  isActive: true,
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<ApiTeam[]>([])
  const [departments, setDepartments] = useState<ApiDepartment[]>([])
  const [employees, setEmployees] = useState<ApiEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDepartment, setFilterDepartment] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editingTeam, setEditingTeam] = useState<ApiTeam | null>(null)
  const [activeMenu, setActiveMenu] = useState<number | null>(null)

  const [formData, setFormData] = useState({ ...emptyForm })

  const loadData = async () => {
    try {
      const [tms, deps, emps] = await Promise.all([
        fetchTeams(),
        fetchDepartments(),
        fetchEmployees(),
      ])
      setTeams(tms)
      setDepartments(deps)
      setEmployees(emps)
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

  const departmentNameOf = (team: ApiTeam) =>
    team.department?.name ??
    departments.find((d) => d.id === team.departmentId)?.name ??
    '—'

  const leaderNameOf = (team: ApiTeam) =>
    employees.find((e) => e.id === team.leaderEmployeeId)?.fullName ?? 'لم يُحدد'

  const membersCountOf = (teamId: number) =>
    employees.filter((e) => e.teamId === teamId).length

  const filteredTeams = teams.filter((team) => {
    const matchesSearch =
      team.name.includes(searchQuery) ||
      (team.code ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      leaderNameOf(team).includes(searchQuery)

    const matchesDepartment =
      !filterDepartment || team.departmentId === Number(filterDepartment)

    return matchesSearch && matchesDepartment
  })

  // Group teams by department
  const teamsByDepartment = filteredTeams.reduce((acc, team) => {
    const deptName = departmentNameOf(team)
    if (!acc[deptName]) {
      acc[deptName] = []
    }
    acc[deptName].push(team)
    return acc
  }, {} as Record<string, ApiTeam[]>)

  const handleOpenModal = (team?: ApiTeam) => {
    setModalError(null)
    if (team) {
      setEditingTeam(team)
      setFormData({
        name: team.name,
        code: team.code ?? '',
        departmentId: String(team.departmentId),
        leaderId: team.leaderEmployeeId ? String(team.leaderEmployeeId) : '',
        isActive: team.isActive,
      })
    } else {
      setEditingTeam(null)
      setFormData({ ...emptyForm })
    }
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setModalError(null)
    const payload: Partial<ApiTeam> = {
      name: formData.name,
      code: formData.code || undefined,
      departmentId: formData.departmentId ? Number(formData.departmentId) : undefined,
      leaderEmployeeId: formData.leaderId ? Number(formData.leaderId) : undefined,
    }
    try {
      if (editingTeam) {
        await updateTeam(editingTeam.id, { ...payload, isActive: formData.isActive })
      } else {
        const created = await createTeam(payload)
        // الإنشاء لا يقبل isActive — نعطّله بعد الإنشاء لو طُلب ذلك
        if (!formData.isActive) await updateTeam(created.id, { isActive: false })
      }
      await loadData()
      setShowModal(false)
    } catch (err: any) {
      setModalError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (team: ApiTeam) => {
    setActiveMenu(null)
    try {
      await updateTeam(team.id, { isActive: !team.isActive })
      await loadData()
      setError(null)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const totalMembers = employees.filter((e) => e.teamId).length
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

        {/* Error Banner */}
        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

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

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Teams by Department */}
        {!loading && (
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
                      {deptTeams.length} فريق •{' '}
                      {deptTeams.reduce((sum, t) => sum + membersCountOf(t.id), 0)} عضو
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
                                  onClick={() => toggleStatus(team)}
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
                                  disabled
                                  title="الحذف غير متاح — عطّل الفريق بدلاً من ذلك"
                                  className="w-full flex items-center gap-2 px-4 py-2 text-danger-600 opacity-50 cursor-not-allowed text-sm"
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
                          <p className="text-xs text-gray-500 truncate">
                            {departmentNameOf(team)}
                          </p>
                          <p className="text-xs text-primary-600 font-mono mt-1">
                            {team.code || '—'}
                          </p>
                        </div>
                      </div>

                      {/* Team Leader */}
                      <div className="mt-4 p-3 bg-gray-50 rounded-xl">
                        <p className="text-xs text-gray-500 mb-1">مدير الفريق (المدير المباشر)</p>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                            <UserCircle size={18} className="text-primary-600" />
                          </div>
                          <span className="font-medium text-gray-800 text-sm">
                            {leaderNameOf(team)}
                          </span>
                        </div>
                      </div>

                      {/* Members Count */}
                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users size={14} className="text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {membersCountOf(team.id)} عضو
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
        )}

        {/* Empty State */}
        {!loading && filteredTeams.length === 0 && (
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
                {/* Modal Error */}
                {modalError && (
                  <div className="bg-red-50 text-red-700 rounded-xl p-4">{modalError}</div>
                )}

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
                          emp.departmentId === Number(formData.departmentId)
                      )
                      .map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.fullName}
                          {emp.jobTitle ? ` - ${emp.jobTitle}` : ''}
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    مدير الفريق سيكون المدير المباشر لجميع أعضاء الفريق — تظهر قائمة موظفي القسم المختار
                  </p>
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
                <button onClick={handleSave} disabled={saving} className="btn-primary">
                  {saving ? 'جارٍ الحفظ...' : editingTeam ? 'حفظ التغييرات' : 'إضافة الفريق'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
