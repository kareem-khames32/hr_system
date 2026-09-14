'use client'

import { useEffect, useMemo, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Plus,
  User,
  Shield,
  Edit2,
  Key,
  UserX,
  CheckCircle2,
  Clock,
  X,
  MinusCircle,
  PlusCircle,
} from 'lucide-react'
import {
  type ApiBranch,
  type ApiEmployee,
  type ApiPermission,
  type ApiRole,
  type ApiUser,
  createUser,
  fetchBranches,
  fetchEmployees,
  fetchPermissionsRegistry,
  fetchRolesFull,
  fetchUserPermissions,
  fetchUsers,
  setUserPermissions,
  updateUser,
} from '@/lib/api'

const roleLabels: Record<string, string> = {
  super_admin: 'مدير النظام',
  hr_manager: 'مدير الموارد البشرية',
  branch_manager: 'مدير فرع',
  employee: 'موظف',
}

// صف المستخدم كما يرجعه السيرفر — permissions تصل كنص JSON أو null
type UserRow = ApiUser & { permissions?: string | null }

const parsePermissions = (raw?: string | null): string[] => {
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr)
      ? arr.filter((p): p is string => typeof p === 'string')
      : []
  } catch {
    return []
  }
}

const statusLabels = {
  active: 'نشط',
  inactive: 'غير نشط',
  pending: 'بانتظار التفعيل',
}

const statusColors = {
  active: 'bg-success-50 text-success-700',
  inactive: 'bg-gray-100 text-gray-600',
  pending: 'bg-warning-50 text-warning-700',
}

// الحالة مشتقة: معطّل = غير نشط، نشط بلا دخول سابق = بانتظار التفعيل
const statusOf = (user: ApiUser): 'active' | 'inactive' | 'pending' => {
  if (!user.isActive) return 'inactive'
  return user.lastLoginAt ? 'active' : 'pending'
}

const emptyForm = {
  displayName: '',
  email: '',
  role: '',
  branchId: '',
  employeeId: '',
  password: '',
  isActive: true,
}

// تجاوزات الصلاحيات الدقيقة للمستخدم (فوق حزمة الدور)
interface Overrides {
  grants: string[]
  revokes: string[]
  effective: string[]
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [branches, setBranches] = useState<ApiBranch[]>([])
  const [employees, setEmployees] = useState<ApiEmployee[]>([])
  const [roles, setRoles] = useState<ApiRole[]>([])
  const [registry, setRegistry] = useState<ApiPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null)
  const [resetUser, setResetUser] = useState<ApiUser | null>(null)
  const [newPassword, setNewPassword] = useState('')

  // الصلاحيات الدقيقة — تُحمَّل عند فتح مودال التعديل
  const [overrides, setOverrides] = useState<Overrides | null>(null)
  const [permsLoading, setPermsLoading] = useState(false)

  const [formData, setFormData] = useState({ ...emptyForm })

  const loadData = async () => {
    try {
      const [us, brs, emps, rls, reg] = await Promise.all([
        fetchUsers(),
        fetchBranches(),
        fetchEmployees(),
        fetchRolesFull(),
        fetchPermissionsRegistry(),
      ])
      setUsers(us as UserRow[])
      setBranches(brs)
      setEmployees(emps)
      setRoles(rls)
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

  // تسمية عربية لأي مفتاح صلاحية — من سجل الصلاحيات
  const permLabels = useMemo(
    () => Object.fromEntries(registry.map((p) => [p.key, p.labelAr])),
    [registry]
  )

  const roleNameOf = (code: string) =>
    roles.find((r) => r.code === code)?.nameAr ?? roleLabels[code] ?? code

  // حزمة صلاحيات الدور المختار حالياً في النموذج
  const roleBundle = useMemo(
    () => roles.find((r) => r.code === formData.role)?.permissions ?? [],
    [roles, formData.role]
  )

  // المنح الإضافي يعرض ما ليس في حزمة الدور — والسحب يعرض ما فيها فقط
  const grantablePerms = registry.filter((p) => !roleBundle.includes(p.key))
  const revocablePerms = registry.filter((p) => roleBundle.includes(p.key))

  const branchNameOf = (branchId?: number) =>
    branches.find((b) => b.id === branchId)?.name ?? '—'

  const employeeNameOf = (employeeId?: number) =>
    employees.find((e) => e.id === employeeId)?.fullName

  const formatLastLogin = (lastLoginAt?: string) =>
    lastLoginAt ? lastLoginAt.replace('T', ' ').slice(0, 16) : '-'

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.displayName.includes(searchTerm) || user.email.includes(searchTerm)
    const matchesRole = filterRole === 'all' || user.role === filterRole
    const matchesStatus = filterStatus === 'all' || statusOf(user) === filterStatus
    return matchesSearch && matchesRole && matchesStatus
  })

  const stats = {
    total: users.length,
    active: users.filter((u) => statusOf(u) === 'active').length,
    inactive: users.filter((u) => statusOf(u) === 'inactive').length,
    pending: users.filter((u) => statusOf(u) === 'pending').length,
  }

  const openAddModal = () => {
    setEditingUser(null)
    setFormData({ ...emptyForm })
    setOverrides(null)
    setModalError(null)
    setShowModal(true)
  }

  const openEditModal = (user: UserRow) => {
    setEditingUser(user)
    setFormData({
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      branchId: user.branchId ? String(user.branchId) : '',
      employeeId: user.employeeId ? String(user.employeeId) : '',
      password: '',
      isActive: user.isActive,
    })
    setModalError(null)
    setShowModal(true)
    // الصلاحيات الدقيقة — لا تنطبق على مدير النظام
    setOverrides(null)
    if (user.role !== 'super_admin') {
      setPermsLoading(true)
      fetchUserPermissions(user.id)
        .then((res) =>
          setOverrides({
            grants: res.grants,
            revokes: res.revokes,
            effective: res.effective,
          })
        )
        .catch((err: any) => setModalError(err.message))
        .finally(() => setPermsLoading(false))
    }
  }

  const toggleGrant = (key: string, checked: boolean) => {
    setOverrides((o) =>
      o
        ? {
            ...o,
            grants: checked ? [...o.grants, key] : o.grants.filter((p) => p !== key),
          }
        : o
    )
  }

  const toggleRevoke = (key: string, checked: boolean) => {
    setOverrides((o) =>
      o
        ? {
            ...o,
            revokes: checked ? [...o.revokes, key] : o.revokes.filter((p) => p !== key),
          }
        : o
    )
  }

  const handleSave = async () => {
    setSaving(true)
    setModalError(null)
    try {
      if (editingUser) {
        await updateUser(editingUser.id, {
          role: formData.role,
          isActive: formData.isActive,
          // المُفرَّغ بعد قيمة يُرسَل null (فك ربط الموظف/إزالة الفرع) — كان يُهمل فتبقى
          // القيمة القديمة. الباك يفحص النطاق (غير مدير النظام لا يترك حساباً بلا فرع)
          ...(formData.branchId
            ? { branchId: Number(formData.branchId) }
            : editingUser.branchId
              ? { branchId: null }
              : {}),
          ...(formData.employeeId
            ? { employeeId: Number(formData.employeeId) }
            : editingUser.employeeId
              ? { employeeId: null }
              : {}),
        })
        // حفظ تجاوزات الصلاحيات الدقيقة — السحب مقصور على حزمة الدور
        if (formData.role !== 'super_admin' && overrides) {
          await setUserPermissions(
            editingUser.id,
            overrides.grants.filter((g) => !roleBundle.includes(g)),
            overrides.revokes.filter((r) => roleBundle.includes(r))
          )
        }
      } else {
        // الإنشاء بسيط — التجاوزات تُضبط من التعديل بعد الإنشاء
        await createUser({
          email: formData.email,
          password: formData.password,
          displayName: formData.displayName,
          role: formData.role,
          branchId: formData.branchId ? Number(formData.branchId) : undefined,
          employeeId: formData.employeeId ? Number(formData.employeeId) : undefined,
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

  const handleResetPassword = async () => {
    if (!resetUser) return
    setSaving(true)
    setModalError(null)
    try {
      await updateUser(resetUser.id, { password: newPassword })
      setResetUser(null)
      setNewPassword('')
    } catch (err: any) {
      setModalError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (user: ApiUser) => {
    const question = user.isActive
      ? `هل تريد تعطيل حساب ${user.displayName}؟`
      : `هل تريد تفعيل حساب ${user.displayName}؟`
    if (!confirm(question)) return
    try {
      const updated = await updateUser(user.id, { isActive: !user.isActive })
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
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
            <h1 className="text-2xl font-bold text-gray-800">إدارة المستخدمين</h1>
            <p className="text-gray-500 mt-1">إدارة مستخدمي النظام وصلاحياتهم</p>
          </div>
          <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            إضافة مستخدم
          </button>
        </div>

        {/* Error Banner */}
        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
              <User size={24} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي المستخدمين</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
              <CheckCircle2 size={24} className="text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">نشطين</p>
              <p className="text-2xl font-bold text-gray-800">{stats.active}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
              <UserX size={24} className="text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">غير نشطين</p>
              <p className="text-2xl font-bold text-gray-800">{stats.inactive}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-warning-50 rounded-2xl flex items-center justify-center">
              <Clock size={24} className="text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">بانتظار التفعيل</p>
              <p className="text-2xl font-bold text-gray-800">{stats.pending}</p>
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
                placeholder="بحث عن مستخدم..."
                className="input pr-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="input w-48"
            >
              <option value="all">كل الأدوار</option>
              {roles.map((role) => (
                <option key={role.code} value={role.code}>
                  {role.nameAr}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input w-40"
            >
              <option value="all">كل الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
              <option value="pending">بانتظار التفعيل</option>
            </select>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Users Table */}
        {!loading && (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">المستخدم</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الدور</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الفرع</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الحالة</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">آخر دخول</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600 font-bold">
                          {user.displayName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{user.displayName}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Shield size={16} className="text-primary-500" />
                        <span className="text-gray-700">{roleNameOf(user.role)}</span>
                      </div>
                      {/* شارات الصلاحيات الممنوحة فوق الدور */}
                      {parsePermissions(user.permissions).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {parsePermissions(user.permissions).map((p) => (
                            <span
                              key={p}
                              className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs"
                            >
                              {permLabels[p] ?? p}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      <p>{branchNameOf(user.branchId)}</p>
                      {employeeNameOf(user.employeeId) && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          الموظف: {employeeNameOf(user.employeeId)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[statusOf(user)]}`}
                      >
                        {statusLabels[statusOf(user)]}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500" dir="ltr">
                      {formatLastLogin(user.lastLoginAt)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          title="تعديل"
                          className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                          <Edit2 size={16} className="text-gray-600" />
                        </button>
                        <button
                          onClick={() => {
                            setResetUser(user)
                            setNewPassword('')
                            setModalError(null)
                          }}
                          title="إعادة تعيين كلمة المرور"
                          className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                          <Key size={16} className="text-gray-600" />
                        </button>
                        <button
                          onClick={() => toggleActive(user)}
                          title={user.isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                          className="p-2 bg-gray-100 rounded-lg hover:bg-red-100"
                        >
                          {user.isActive ? (
                            <UserX size={16} className="text-gray-600 hover:text-red-600" />
                          ) : (
                            <CheckCircle2 size={16} className="text-success-600" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add / Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingUser ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Modal Error */}
                {modalError && (
                  <div className="bg-red-50 text-red-700 rounded-xl p-4">{modalError}</div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الاسم الكامل
                  </label>
                  <input
                    type="text"
                    className="input w-full"
                    value={formData.displayName}
                    onChange={(e) =>
                      setFormData({ ...formData, displayName: e.target.value })
                    }
                    disabled={!!editingUser}
                    title={editingUser ? 'لا يمكن تعديل الاسم بعد الإنشاء' : undefined}
                    placeholder="أدخل الاسم الكامل"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    className="input w-full"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    disabled={!!editingUser}
                    title={editingUser ? 'لا يمكن تعديل البريد بعد الإنشاء' : undefined}
                    placeholder="example@company.com"
                    dir="ltr"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الدور
                    </label>
                    <select
                      className="input w-full"
                      value={formData.role}
                      onChange={(e) =>
                        setFormData({ ...formData, role: e.target.value })
                      }
                    >
                      <option value="">اختر الدور</option>
                      {roles
                        .filter((r) => r.isActive || r.code === formData.role)
                        .map((role) => (
                          <option key={role.code} value={role.code}>
                            {role.nameAr}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الفرع
                    </label>
                    <select
                      className="input w-full"
                      value={formData.branchId}
                      onChange={(e) =>
                        setFormData({ ...formData, branchId: e.target.value })
                      }
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الموظف المرتبط
                  </label>
                  <select
                    className="input w-full"
                    value={formData.employeeId}
                    onChange={(e) =>
                      setFormData({ ...formData, employeeId: e.target.value })
                    }
                  >
                    <option value="">بدون ربط بموظف</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} ({emp.employeeCode})
                      </option>
                    ))}
                  </select>
                </div>

                {!editingUser && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      كلمة المرور
                    </label>
                    <input
                      type="password"
                      className="input w-full"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder="8 أحرف على الأقل"
                      dir="ltr"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      الصلاحيات الدقيقة (منح/سحب) تُضبط من شاشة التعديل بعد الإنشاء
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الحالة
                  </label>
                  <select
                    className="input w-full"
                    value={formData.isActive ? 'active' : 'inactive'}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.value === 'active' })
                    }
                  >
                    <option value="active">نشط</option>
                    <option value="inactive">غير نشط</option>
                  </select>
                </div>

                {/* ===== الصلاحيات الدقيقة — منح/سحب فوق حزمة الدور ===== */}
                {editingUser &&
                  (formData.role === 'super_admin' ? (
                    <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-500">
                      مدير النظام يملك كل الصلاحيات تلقائياً — لا تنطبق عليه
                      التجاوزات الدقيقة
                    </div>
                  ) : permsLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : overrides ? (
                    <div className="space-y-4 border-t border-gray-100 pt-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1">
                          الصلاحيات الدقيقة
                        </label>
                        <p className="text-xs text-gray-400">
                          منح صلاحيات فوق الدور أو سحب صلاحيات منه — الفرض الحقيقي
                          في الباك إند
                        </p>
                      </div>

                      {/* الصلاحيات الفعلية الحالية */}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          الصلاحيات الفعلية الآن ({overrides.effective.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-3 bg-gray-50 rounded-xl">
                          {overrides.effective.length === 0 && (
                            <span className="text-xs text-gray-400">لا توجد صلاحيات</span>
                          )}
                          {overrides.effective.map((p) => (
                            <span
                              key={p}
                              className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs"
                            >
                              {permLabels[p] ?? p}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* منح إضافي */}
                      <div className="p-4 bg-success-50/50 rounded-xl border border-success-100">
                        <p className="text-sm font-medium text-success-800 mb-2 flex items-center gap-2">
                          <PlusCircle size={16} />
                          منح إضافي (GRANT) — صلاحيات ليست في حزمة الدور
                        </p>
                        <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                          {grantablePerms.length === 0 && (
                            <span className="text-xs text-gray-400 col-span-2">
                              الدور يشمل كل صلاحيات السجل
                            </span>
                          )}
                          {grantablePerms.map((p) => (
                            <label
                              key={p.key}
                              className="flex items-center gap-2 p-2 rounded-lg hover:bg-white cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-gray-300 text-success-600"
                                checked={overrides.grants.includes(p.key)}
                                onChange={(e) => toggleGrant(p.key, e.target.checked)}
                              />
                              <span className="text-sm text-gray-700">{p.labelAr}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* سحب من الدور */}
                      <div className="p-4 bg-red-50/50 rounded-xl border border-red-100">
                        <p className="text-sm font-medium text-red-800 mb-2 flex items-center gap-2">
                          <MinusCircle size={16} />
                          سحب من الدور (REVOKE) — من صلاحيات الحزمة الحالية فقط
                        </p>
                        <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                          {revocablePerms.length === 0 && (
                            <span className="text-xs text-gray-400 col-span-2">
                              حزمة الدور فارغة — لا شيء يُسحب
                            </span>
                          )}
                          {revocablePerms.map((p) => (
                            <label
                              key={p.key}
                              className="flex items-center gap-2 p-2 rounded-lg hover:bg-white cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-gray-300 text-red-600"
                                checked={overrides.revokes.includes(p.key)}
                                onChange={(e) => toggleRevoke(p.key, e.target.checked)}
                              />
                              <span className="text-sm text-gray-700">{p.labelAr}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null)}
              </div>

              <div className="flex items-center gap-3 p-6 border-t border-gray-100 sticky bottom-0 bg-white">
                <button onClick={() => setShowModal(false)} className="flex-1 btn-secondary">
                  إلغاء
                </button>
                <button onClick={handleSave} disabled={saving} className="flex-1 btn-primary">
                  {saving
                    ? 'جارٍ الحفظ...'
                    : editingUser
                      ? 'حفظ التغييرات'
                      : 'إضافة المستخدم'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reset Password Modal */}
        {resetUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">إعادة تعيين كلمة المرور</h2>
                <button
                  onClick={() => setResetUser(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Modal Error */}
                {modalError && (
                  <div className="bg-red-50 text-red-700 rounded-xl p-4">{modalError}</div>
                )}

                <p className="text-sm text-gray-600">
                  كلمة مرور جديدة للمستخدم{' '}
                  <span className="font-bold text-gray-800">{resetUser.displayName}</span>
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    كلمة المرور الجديدة
                  </label>
                  <input
                    type="password"
                    className="input w-full"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="8 أحرف على الأقل"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-6 border-t border-gray-100">
                <button onClick={() => setResetUser(null)} className="flex-1 btn-secondary">
                  إلغاء
                </button>
                <button
                  onClick={handleResetPassword}
                  disabled={saving}
                  className="flex-1 btn-primary"
                >
                  {saving ? 'جارٍ الحفظ...' : 'تعيين كلمة المرور'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
