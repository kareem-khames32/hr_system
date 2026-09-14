'use client'

import { useEffect, useMemo, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Plus,
  Shield,
  Users,
  Edit2,
  Eye,
  CheckCircle2,
  Lock,
  X,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import {
  type ApiPermission,
  type ApiRole,
  createRole,
  fetchPermissionsRegistry,
  fetchRolesFull,
  updateRole,
} from '@/lib/api'

// تسميات مجموعات سجل الصلاحيات
const groupLabels: Record<string, string> = {
  employees: 'الموظفون',
  org: 'الهيكل التنظيمي',
  users: 'المستخدمون',
  roles: 'الأدوار',
  requests: 'الطلبات',
  approve: 'خطوات الاعتماد',
  attendance: 'الحضور',
  overtime: 'العمل الإضافي',
  leaves: 'الإجازات',
  leave_balances: 'أرصدة الإجازات',
  payroll: 'الرواتب',
  custody: 'العهدة',
  documents: 'المستندات',
  offboarding: 'إنهاء الخدمة',
  settlement: 'المخالصة',
  reports: 'التقارير',
  dashboard: 'اللوحة',
  calendar: 'التقويم',
  settings: 'الإعدادات',
  request_types: 'بانِي الطلبات',
  approval_chains: 'سلاسل الاعتماد',
  candidates: 'المرشحون',
  transfers: 'النقل',
}

const emptyForm = { code: '', nameAr: '', permissions: [] as string[] }

export default function RolesPage() {
  const [roles, setRoles] = useState<ApiRole[]>([])
  const [registry, setRegistry] = useState<ApiPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // المودال المشترك للإنشاء/التعديل — editingRole=null يعني إنشاء
  const [showModal, setShowModal] = useState(false)
  const [editingRole, setEditingRole] = useState<ApiRole | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const loadData = async () => {
    try {
      // أعداد المستخدمين تأتي مع الأدوار (userCount) — بلا GET /users (users.manage)
      // فالشاشة تعمل لمن يملك roles.manage وحدها
      const [r, reg] = await Promise.all([fetchRolesFull(), fetchPermissionsRegistry()])
      setRoles(r)
      setRegistry(reg)
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

  // سجل الصلاحيات مجمّعاً حسب المجموعة
  const groupedRegistry = useMemo(() => {
    const groups = new Map<string, ApiPermission[]>()
    for (const p of registry) {
      const list = groups.get(p.group) ?? []
      list.push(p)
      groups.set(p.group, list)
    }
    return Array.from(groups.entries())
  }, [registry])

  const usersCountOf = (code: string) => roles.find((r) => r.code === code)?.userCount ?? 0
  const totalUsers = roles.reduce((sum, r) => sum + (r.userCount ?? 0), 0)

  const filteredRoles = roles.filter(
    (role) => role.nameAr.includes(searchTerm) || role.code.includes(searchTerm)
  )

  // super_admin يملك كل شيء ضمنياً — دوره للعرض فقط
  const isReadOnly = editingRole?.code === 'super_admin'

  const openCreateModal = () => {
    setEditingRole(null)
    setForm({ ...emptyForm })
    setModalError(null)
    setShowModal(true)
  }

  const openEditModal = (role: ApiRole) => {
    setEditingRole(role)
    setForm({ code: role.code, nameAr: role.nameAr, permissions: [...role.permissions] })
    setModalError(null)
    setShowModal(true)
  }

  const togglePermission = (key: string, checked: boolean) => {
    setForm((f) => ({
      ...f,
      permissions: checked
        ? [...f.permissions, key]
        : f.permissions.filter((p) => p !== key),
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setModalError(null)
    try {
      if (editingRole) {
        await updateRole(editingRole.id, {
          nameAr: form.nameAr,
          permissions: form.permissions,
        })
      } else {
        await createRole({
          code: form.code.trim(),
          nameAr: form.nameAr,
          permissions: form.permissions,
        })
      }
      await loadData()
      setShowModal(false)
    } catch (err: any) {
      setModalError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // تفعيل/تعطيل الأدوار المخصصة فقط
  const toggleActive = async (role: ApiRole) => {
    try {
      const updated = await updateRole(role.id, { isActive: !role.isActive })
      // رد التعديل بلا userCount — نُبقي العدد المحمّل
      setRoles((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)))
      setError(null)
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">الأدوار والصلاحيات</h1>
            <p className="text-gray-500 mt-1">
              إدارة الأدوار وحزم صلاحياتها من سجل الصلاحيات ({registry.length} صلاحية)
            </p>
          </div>
          <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            إنشاء دور
          </button>
        </div>

        {/* Error Banner */}
        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
              <Shield size={24} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي الأدوار</p>
              <p className="text-2xl font-bold text-gray-800">{roles.length}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Lock size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">أدوار النظام</p>
              <p className="text-2xl font-bold text-gray-800">
                {roles.filter((r) => r.isSystem).length}
              </p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
              <Users size={24} className="text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">المستخدمين</p>
              <p className="text-2xl font-bold text-gray-800">{totalUsers}</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="card">
          <div className="relative">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="بحث عن دور..."
              className="input pr-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Roles Grid */}
        {!loading && (
          <div className="grid grid-cols-2 gap-4">
            {filteredRoles.map((role) => (
              <div key={role.id} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        role.isSystem ? 'bg-blue-100' : 'bg-purple-100'
                      }`}
                    >
                      <Shield
                        size={24}
                        className={role.isSystem ? 'text-blue-600' : 'text-purple-600'}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-800">{role.nameAr}</h3>
                        {role.isSystem ? (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                            نظام
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                            مخصص
                          </span>
                        )}
                        {!role.isActive && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                            معطّل
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 font-mono" dir="ltr">
                        {role.code}
                      </p>
                    </div>
                  </div>
                  {/* تفعيل/تعطيل — للأدوار المخصصة فقط */}
                  {!role.isSystem && (
                    <button
                      onClick={() => toggleActive(role)}
                      title={role.isActive ? 'تعطيل الدور' : 'تفعيل الدور'}
                      className="p-1 hover:bg-gray-100 rounded-lg"
                    >
                      {role.isActive ? (
                        <ToggleRight size={28} className="text-success-500" />
                      ) : (
                        <ToggleLeft size={28} className="text-gray-300" />
                      )}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Users size={16} />
                    <span>{usersCountOf(role.code)} مستخدم</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <CheckCircle2 size={16} />
                    <span>
                      {role.code === 'super_admin'
                        ? 'كل الصلاحيات'
                        : `${role.permissions.length} صلاحية`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => openEditModal(role)}
                    className="flex-1 btn-secondary flex items-center justify-center gap-2"
                  >
                    {role.code === 'super_admin' ? (
                      <>
                        <Eye size={16} />
                        عرض
                      </>
                    ) : (
                      <>
                        <Edit2 size={16} />
                        تعديل
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
            {filteredRoles.length === 0 && (
              <div className="col-span-2 card p-12 text-center">
                <Shield size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">لا توجد أدوار مطابقة</p>
              </div>
            )}
          </div>
        )}

        {/* Create / Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingRole
                    ? isReadOnly
                      ? `صلاحيات: ${editingRole.nameAr}`
                      : `تعديل الدور: ${editingRole.nameAr}`
                    : 'إنشاء دور جديد'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {modalError && (
                  <div className="bg-red-50 text-red-700 rounded-xl p-4">{modalError}</div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      كود الدور
                    </label>
                    <input
                      type="text"
                      className="input w-full font-mono"
                      dir="ltr"
                      value={form.code}
                      maxLength={30}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      disabled={!!editingRole}
                      title={editingRole ? 'لا يمكن تعديل الكود بعد الإنشاء' : undefined}
                      placeholder="payroll_auditor"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الاسم بالعربية
                    </label>
                    <input
                      type="text"
                      className="input w-full"
                      value={form.nameAr}
                      onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                      disabled={isReadOnly}
                      placeholder="مدقق الرواتب"
                    />
                  </div>
                </div>

                {isReadOnly ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-xl p-4">
                    <Lock size={16} />
                    <span>
                      مدير النظام يملك كل الصلاحيات ضمنياً — هذا الدور للعرض فقط
                    </span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="block text-sm font-medium text-gray-700">
                        الصلاحيات ({form.permissions.length} من {registry.length})
                      </label>
                    </div>
                    <div className="space-y-4">
                      {groupedRegistry.map(([group, perms]) => (
                        <div key={group} className="border border-gray-100 rounded-xl p-4">
                          <p className="text-sm font-bold text-gray-700 mb-3">
                            {groupLabels[group] ?? group}
                          </p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {perms.map((p) => (
                              <label
                                key={p.key}
                                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 rounded border-gray-300 text-primary-600"
                                  checked={form.permissions.includes(p.key)}
                                  onChange={(e) => togglePermission(p.key, e.target.checked)}
                                />
                                <span className="text-sm text-gray-700">{p.labelAr}</span>
                                <span className="text-[10px] text-gray-400 font-mono" dir="ltr">
                                  {p.key}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 p-6 border-t border-gray-100 sticky bottom-0 bg-white">
                <button onClick={() => setShowModal(false)} className="flex-1 btn-secondary">
                  {isReadOnly ? 'إغلاق' : 'إلغاء'}
                </button>
                {!isReadOnly && (
                  <button
                    onClick={handleSave}
                    disabled={saving || !form.nameAr || (!editingRole && !form.code.trim())}
                    className="flex-1 btn-primary"
                  >
                    {saving
                      ? 'جارٍ الحفظ...'
                      : editingRole
                        ? 'حفظ التغييرات'
                        : 'إنشاء الدور'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
