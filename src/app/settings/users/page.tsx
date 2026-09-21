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
  KeyRound,
  AlertTriangle,
  Globe2,
  Building2,
  Lock,
} from 'lucide-react'
import {
  type ApiBranch,
  type ApiEmployee,
  type ApiPermission,
  type ApiRole,
  type ApiUser,
  type ApiUserPermissions,
  createUser,
  fetchBranches,
  fetchEmployees,
  fetchPermissionsRegistry,
  fetchRolesFull,
  fetchUserPermissions,
  fetchUsers,
  getCurrentUser,
  setTemporaryPassword,
  setUserPermissions,
  updateUser,
} from '@/lib/api'

const MIN_PASSWORD = 8

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
  // «نطاقه: فرعه / كل الفروع» — يفتحه ويقفله مدير النظام فقط
  scopeAllBranches: false,
}

// تجاوزات الصلاحيات الدقيقة للمستخدم (فوق حزمة الدور) زي ما الخادم حسبها:
// النهائي = حزمة الدور ∪ المنح − السحب
type Overrides = Pick<ApiUserPermissions, 'grants' | 'revokes' | 'effective' | 'rolePermissions' | 'roleActive' | 'legacyGrants'>

// بحث عربي متسامح (الهمزات والتاء المربوطة والياء) — نفس بحث شاشة الأدوار
const normalizeSearch = (text: string) =>
  text.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').trim()

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
  // إعادة التعيين من المدير = كلمة مؤقتة افتراضيًا (يغيّرها أول دخول)
  const [resetMustChange, setResetMustChange] = useState(true)

  // كلمة مرور مؤقتة لكذا مستخدم مرة واحدة (المنقولين من القديم جم من غير كلمة)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [showBulk, setShowBulk] = useState(false)
  const [bulkPassword, setBulkPassword] = useState('')
  const [bulkConfirm, setBulkConfirm] = useState('')
  const [bulkMustChange, setBulkMustChange] = useState(true)
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [meId, setMeId] = useState<number | null>(null)
  // نطاق الحساب وصلاحياته الحصرية بيغيّرهم مدير النظام بس (الخادم بيرفض غيره) — الشاشة بتقفل المفتاح وتشرح
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  // الصلاحيات الدقيقة — تُحمَّل عند فتح مودال التعديل
  const [overrides, setOverrides] = useState<Overrides | null>(null)
  const [permsLoading, setPermsLoading] = useState(false)
  const [permSearch, setPermSearch] = useState('')

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
    const me = getCurrentUser()
    setMeId(me?.id ?? null)
    setIsSuperAdmin(me?.role === 'super_admin')
    loadData()
  }, [])

  // «مستخدم منقول — محتاج باسورد» (من سجل الترحيل، ولسه محدش عيّن له كلمة هنا)
  const legacyNeedPassword = users.filter((u) => u.legacyNeedsPassword)

  const toggleSelected = (id: number, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })

  const selectLegacyWithoutPassword = () =>
    setSelected(new Set(legacyNeedPassword.filter((u) => u.id !== meId).map((u) => u.id)))

  const openBulk = () => {
    setBulkPassword('')
    setBulkConfirm('')
    setBulkMustChange(true)
    setBulkError(null)
    setShowBulk(true)
  }

  const bulkProblem =
    bulkPassword.length > 0 && bulkPassword.length < MIN_PASSWORD
      ? `كلمة المرور ${MIN_PASSWORD} حروف على الأقل`
      : bulkConfirm.length > 0 && bulkConfirm !== bulkPassword
        ? 'التأكيد مش زي كلمة المرور'
        : null

  const handleBulkPassword = async () => {
    if (bulkPassword.length < MIN_PASSWORD || bulkConfirm !== bulkPassword || selected.size === 0) return
    setSaving(true)
    setBulkError(null)
    try {
      const res = await setTemporaryPassword([...selected], bulkPassword, bulkMustChange)
      setShowBulk(false)
      setBulkPassword('')
      setBulkConfirm('')
      setSelected(new Set())
      setNotice(
        res.mustChangePassword
          ? `اتعيّنت كلمة مؤقتة لـ ${res.updated} مستخدم — بلّغهم بيها، وأول ما يدخلوا هيتطلب منهم يغيّروها`
          : `اتعيّنت كلمة المرور لـ ${res.updated} مستخدم`
      )
      await loadData()
    } catch (err: any) {
      setBulkError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // تسمية عربية لأي مفتاح صلاحية — من سجل الصلاحيات
  const permLabels = useMemo(
    () => Object.fromEntries(registry.map((p) => [p.key, p.labelAr])),
    [registry]
  )

  const roleNameOf = (code: string) =>
    roles.find((r) => r.code === code)?.nameAr ?? roleLabels[code] ?? code

  // حزمة صلاحيات الدور المختار حالياً في النموذج — الدور المعطَّل مابيمنحش حاجة.
  // لو الدور في النموذج هو نفسه المحفوظ، نستخدم حزمته زي ما الخادم حسبها بالظبط
  const roleBundle = useMemo(() => {
    if (editingUser && overrides && formData.role === editingUser.role) return overrides.rolePermissions
    const role = roles.find((r) => r.code === formData.role)
    return role && role.isActive ? role.permissions : []
  }, [roles, formData.role, editingUser, overrides])

  // الصلاحيات النهائية للمستخدم = حزمة الدور ∪ المنح (ومعاها منح العمود القديم) − السحب — بتتحسب هنا مع كل تعديل
  // عشان المدير يشوف النتيجة قبل الحفظ، والخادم بيحسبها تاني بنفسه عند الحفظ
  const legacyGrants = overrides?.legacyGrants ?? []
  const permissionState = (key: string) => {
    const inRole = roleBundle.includes(key) || roleBundle.includes('*')
    const legacy = legacyGrants.includes(key)
    const granted = !!overrides?.grants.includes(key) && !inRole
    const revoked = !!overrides?.revokes.includes(key) && (inRole || legacy || granted)
    return { inRole, legacy, granted, revoked, effective: (inRole || legacy || granted) && !revoked }
  }
  const effectiveNow = registry.filter((p) => permissionState(p.key).effective)

  // السجل مجمّعًا حسب الوحدة + بحث
  const groupedRegistry = useMemo(() => {
    const term = normalizeSearch(permSearch)
    const groups = new Map<string, { label: string; perms: ApiPermission[] }>()
    for (const p of registry) {
      if (term && ![p.labelAr, p.description, p.key, p.groupLabelAr].some((f) => normalizeSearch(f).includes(term))) continue
      const entry = groups.get(p.group) ?? { label: p.groupLabelAr, perms: [] }
      entry.perms.push(p)
      groups.set(p.group, entry)
    }
    return Array.from(groups.entries()).map(([key, value]) => ({ key, ...value }))
  }, [registry, permSearch])

  const branchNameOf = (branchId?: number) =>
    branches.find((b) => b.id === branchId)?.name ?? '—'

  const employeeNameOf = (employeeId?: number) =>
    employees.find((e) => e.id === employeeId)?.fullName

  const formatLastLogin = (lastLoginAt?: string) =>
    lastLoginAt ? lastLoginAt.replace('T', ' ').slice(0, 16) : '-'

  const filteredUsers = users.filter((user) => {
    const term = searchTerm.trim().toLowerCase()
    const matchesSearch =
      !term || user.displayName.toLowerCase().includes(term) || user.email.toLowerCase().includes(term)
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
    setPermSearch('')
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
      scopeAllBranches: user.scopeAllBranches === true,
    })
    setPermSearch('')
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
            rolePermissions: res.rolePermissions ?? [],
            roleActive: res.roleActive !== false,
            legacyGrants: res.legacyGrants ?? [],
          })
        )
        .catch((err: any) => setModalError(err.message))
        .finally(() => setPermsLoading(false))
    }
  }

  // قائمة واحدة: العلامة = «الصلاحية سارية على المستخدم». تشغيل صلاحية مش في دوره = منحة (GRANT)،
  // وإطفاء صلاحية جاية من دوره = سحب (REVOKE) — والرجوع عن أي منهما بيشيل التجاوز
  const togglePermission = (key: string, checked: boolean) => {
    const { inRole, legacy } = permissionState(key)
    setOverrides((o) => {
      if (!o) return o
      const grants = o.grants.filter((p) => p !== key)
      const revokes = o.revokes.filter((p) => p !== key)
      if (checked && !inRole && !legacy) grants.push(key)
      if (!checked && (inRole || legacy)) revokes.push(key)
      return { ...o, grants, revokes }
    })
  }

  // حساب نطاقه «كل الفروع» مايعدّلوش غير مدير النظام (الخادم بيرفض) — الشاشة بتقفل الحفظ وتقول ليه
  const lockedScopeAllAccount = !!editingUser && editingUser.scopeAllBranches === true && !isSuperAdmin

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
          // النطاق بيتبعت بس لو مدير النظام غيّره فعلًا (غيره الخادم بيرفضه)
          ...(isSuperAdmin &&
          formData.role !== 'super_admin' &&
          formData.scopeAllBranches !== (editingUser.scopeAllBranches === true)
            ? { scopeAllBranches: formData.scopeAllBranches }
            : {}),
        })
        // حفظ تجاوزات الصلاحيات الدقيقة — المنحة لصلاحية مش في الدور، والسحب لصلاحية جاية من الدور أو من العمود القديم
        if (formData.role !== 'super_admin' && overrides) {
          await setUserPermissions(
            editingUser.id,
            overrides.grants.filter((g) => !roleBundle.includes(g) && !overrides.revokes.includes(g)),
            overrides.revokes.filter((r) => roleBundle.includes(r) || legacyGrants.includes(r))
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
          ...(isSuperAdmin && formData.role !== 'super_admin' && formData.scopeAllBranches
            ? { scopeAllBranches: true }
            : {}),
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
      await updateUser(resetUser.id, { password: newPassword, mustChangePassword: resetMustChange })
      setNotice(
        resetMustChange
          ? `اتعيّنت كلمة مؤقتة لـ ${resetUser.displayName} — أول ما يدخل هيتطلب منه يغيّرها`
          : `اتعيّنت كلمة المرور لـ ${resetUser.displayName}`
      )
      setResetUser(null)
      setNewPassword('')
      await loadData()
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
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)))
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
            <h1 className="text-2xl font-bold text-gray-800">المستخدمين</h1>
            <p className="text-gray-500 mt-1">إدارة مستخدمي النظام وصلاحياتهم</p>
          </div>
          <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            إضافة مستخدم
          </button>
        </div>

        {/* Error Banner */}
        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        {notice && (
          <div className="bg-green-50 text-green-700 rounded-xl p-4 flex items-center justify-between gap-4">
            <span>{notice}</span>
            <button onClick={() => setNotice(null)} className="p-1 hover:bg-green-100 rounded-lg" aria-label="إغلاق">
              <X size={16} />
            </button>
          </div>
        )}

        {/* المنقولين من القديم من غير كلمة + كلمة مؤقتة للمختارين */}
        {!loading && (legacyNeedPassword.length > 0 || selected.size > 0) && (
          <div className="card flex flex-wrap items-center gap-3 bg-amber-50/60 border border-amber-100">
            {legacyNeedPassword.length > 0 && (
              <div className="flex items-center gap-2 text-amber-800 text-sm flex-1 min-w-[16rem]">
                <AlertTriangle size={18} className="shrink-0" />
                <span>
                  فيه {legacyNeedPassword.length} مستخدم منقول من النظام القديم من غير كلمة مرور — مش هيقدروا يدخلوا غير
                  لما تعيّن لهم كلمة.
                </span>
              </div>
            )}
            {legacyNeedPassword.length > 0 && (
              <button onClick={selectLegacyWithoutPassword} className="btn-secondary text-sm">
                اختيار المستخدمين المنقولين اللي مالهمش باسورد
              </button>
            )}
            {selected.size > 0 && (
              <>
                <button onClick={openBulk} className="btn-primary text-sm flex items-center gap-2">
                  <KeyRound size={16} />
                  تعيين كلمة مرور مؤقتة ({selected.size})
                </button>
                <button onClick={() => setSelected(new Set())} className="text-sm text-gray-500 hover:text-gray-700">
                  إلغاء الاختيار
                </button>
              </>
            )}
          </div>
        )}

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
                  <th className="px-4 py-3 w-10">
                    {/* اختيار كل الظاهرين (غير حسابك) — لتعيين كلمة مؤقتة */}
                    <input
                      type="checkbox"
                      aria-label="اختيار كل الظاهرين"
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      checked={
                        filteredUsers.some((u) => u.id !== meId) &&
                        filteredUsers.filter((u) => u.id !== meId).every((u) => selected.has(u.id))
                      }
                      onChange={(e) =>
                        setSelected((prev) => {
                          const next = new Set(prev)
                          for (const u of filteredUsers) {
                            if (u.id === meId) continue
                            if (e.target.checked) next.add(u.id)
                            else next.delete(u.id)
                          }
                          return next
                        })
                      }
                    />
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">المستخدم</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الدور</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الفرع</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الحالة</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">آخر دخول</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                      {users.length === 0 ? 'لا يوجد مستخدمون' : 'لا يوجد مستخدمون مطابقون للبحث أو الفلاتر'}
                    </td>
                  </tr>
                )}
                {filteredUsers.map((user) => (
                  <tr key={user.id} className={selected.has(user.id) ? 'bg-primary-50/40' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        aria-label={`اختيار ${user.displayName}`}
                        title={user.id === meId ? 'حسابك إنت — غيّر كلمتك من «غيّر كلمة المرور»' : undefined}
                        disabled={user.id === meId}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 disabled:opacity-40"
                        checked={selected.has(user.id)}
                        onChange={(e) => toggleSelected(user.id, e.target.checked)}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600 font-bold">
                          {user.displayName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{user.displayName}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                          {(user.legacyNeedsPassword || user.mustChangePassword) && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {user.legacyNeedsPassword && (
                                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs">
                                  مستخدم منقول — محتاج باسورد
                                </span>
                              )}
                              {user.mustChangePassword && (
                                <span className="px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 rounded-full text-xs">
                                  كلمة مؤقتة — هيغيّرها أول دخول
                                </span>
                              )}
                            </div>
                          )}
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
                      {/* نطاق الحساب: مدير النظام كل الفروع بدوره، وغيره مقفول على فرعه إلا لو اتفتح له «كل الفروع» */}
                      {user.role === 'super_admin' || user.scopeAllBranches ? (
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs">
                          <Globe2 size={11} />
                          نطاقه: كل الفروع
                        </span>
                      ) : !user.branchId && user.role !== 'employee' ? (
                        <span
                          className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-red-50 text-red-700 border border-red-100 rounded-full text-xs"
                          title="حساب إداري بلا فرع ونطاقه مش «كل الفروع»: شاشات النطاق بتطلع له فاضية — حدّد فرعه"
                        >
                          <AlertTriangle size={11} />
                          بلا فرع — نطاقه فاضي
                        </span>
                      ) : null}
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
                            setResetMustChange(user.id !== meId)
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

                {/* ===== نطاقه: فرعه / كل الفروع ===== */}
                {formData.role === 'super_admin' ? (
                  <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-500 flex items-center gap-2">
                    <Globe2 size={16} />
                    مدير النظام نطاقه كل الفروع بحكم دوره
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-200 p-4" data-testid="branch-scope-switch">
                    <p className="text-sm font-medium text-gray-700 mb-2">نطاقه</p>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        [false, 'فرعه', 'يشوف ويعدّل بيانات فرعه بس', Building2],
                        [true, 'كل الفروع', 'يشوف النظام كله ويعدّل إعدادات الشركة — بالصلاحيات اللي معاه بس', Globe2],
                      ] as const).map(([value, title, hint, Icon]) => (
                        <label
                          key={String(value)}
                          className={`flex items-start gap-2 p-3 rounded-lg border ${
                            formData.scopeAllBranches === value ? 'border-primary-500 bg-primary-50/50' : 'border-gray-200'
                          } ${isSuperAdmin ? 'cursor-pointer' : 'opacity-70 cursor-not-allowed'}`}
                        >
                          <input
                            type="radio"
                            name="branch-scope"
                            className="mt-1 text-primary-600"
                            checked={formData.scopeAllBranches === value}
                            disabled={!isSuperAdmin}
                            onChange={() => setFormData({ ...formData, scopeAllBranches: value })}
                          />
                          <span>
                            <span className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
                              <Icon size={14} />
                              {title}
                            </span>
                            <span className="block text-xs text-gray-500 mt-0.5">{hint}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                      <Lock size={12} />
                      {isSuperAdmin
                        ? '«كل الفروع» بتوسّع كل صلاحية معاه على الشركة كلها (ومنها اعتماد الطلبات) — النطاق مش صلاحية: لسه محتاج الصلاحية لكل فعل. تغييره بيقفل جلسته الحالية.'
                        : 'يغيّره مدير النظام فقط'}
                    </p>
                  </div>
                )}

                {lockedScopeAllAccount && (
                  <div className="bg-amber-50 text-amber-800 border border-amber-200 rounded-xl p-4 text-sm">
                    الحساب ده نطاقه «كل الفروع» — تعديله (الدور والصلاحيات وكلمة المرور والتفعيل) متاح لمدير النظام فقط.
                  </div>
                )}

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
                    <div className="space-y-4 border-t border-gray-100 pt-4" data-testid="user-effective-permissions">
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1">
                          صلاحيات المستخدم الفعلية ({effectiveNow.length} من {registry.length})
                        </label>
                        <p className="text-xs text-gray-500">
                          النهائي = صلاحيات الدور + المنح الإضافية − المسحوب منه. علّم على الصلاحية عشان تسري عليه:
                          لو مش في دوره تبقى «منحة»، ولو شلت علامة صلاحية جاية من دوره تبقى «مسحوبة». الفرض الحقيقي في الخادم.
                        </p>
                        {!overrides.roleActive && formData.role === editingUser.role && (
                          <p className="text-xs text-amber-700 mt-1">دوره معطّل دلوقتي — حزمة الدور مابتمنحوش حاجة، والساري عليه المنح الإضافية بس.</p>
                        )}
                      </div>

                      {/* ملخص التجاوزات */}
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                          من الدور: {registry.filter((p) => permissionState(p.key).inRole).length}
                        </span>
                        <span className="px-2 py-1 bg-success-50 text-success-700 rounded-full">
                          منح إضافية: {registry.filter((p) => { const s = permissionState(p.key); return (s.granted || s.legacy) && !s.inRole && !s.revoked }).length}
                        </span>
                        <span className="px-2 py-1 bg-red-50 text-red-700 rounded-full">
                          مسحوبة: {registry.filter((p) => permissionState(p.key).revoked).length}
                        </span>
                      </div>

                      <div className="relative">
                        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="بحث في الصلاحيات..."
                          className="input pr-9 w-full text-sm"
                          value={permSearch}
                          onChange={(e) => setPermSearch(e.target.value)}
                        />
                      </div>

                      <div className="space-y-3 max-h-[28rem] overflow-y-auto pl-1">
                        {groupedRegistry.length === 0 && (
                          <p className="text-sm text-gray-400 text-center py-6">مفيش صلاحية مطابقة للبحث</p>
                        )}
                        {groupedRegistry.map((group) => (
                          <div key={group.key} className="border border-gray-100 rounded-xl p-3">
                            <p className="text-sm font-bold text-gray-700 mb-2">
                              {group.label}{' '}
                              <span className="font-normal text-gray-400">
                                ({group.perms.filter((p) => permissionState(p.key).effective).length} من {group.perms.length})
                              </span>
                            </p>
                            <div className="space-y-1">
                              {group.perms.map((p) => {
                                const state = permissionState(p.key)
                                // الصلاحية الحصرية: منحها لمدير النظام بس (سحبها مسموح لأي مدير حسابات)
                                const locked = p.superAdminOnly && !isSuperAdmin && !state.effective
                                return (
                                  <label
                                    key={p.key}
                                    className={`flex items-start gap-2 p-2 rounded-lg ${
                                      locked || lockedScopeAllAccount ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'
                                    }`}
                                    title={locked ? 'منحها متاح لمدير النظام فقط' : undefined}
                                  >
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 mt-0.5 rounded border-gray-300 text-primary-600"
                                      checked={state.effective}
                                      disabled={locked || lockedScopeAllAccount}
                                      onChange={(e) => togglePermission(p.key, e.target.checked)}
                                    />
                                    <span className="min-w-0 flex-1">
                                      <span className="flex flex-wrap items-center gap-1.5">
                                        <span className={`text-sm ${state.revoked ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{p.labelAr}</span>
                                        {p.superAdminOnly && <Lock size={12} className="text-red-500" aria-label="يمنحها مدير النظام فقط" />}
                                        {state.revoked ? (
                                          <span className="px-1.5 py-0.5 bg-red-50 text-red-700 rounded text-[10px]">مسحوبة من دوره</span>
                                        ) : state.inRole ? (
                                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]">من الدور</span>
                                        ) : state.granted ? (
                                          <span className="px-1.5 py-0.5 bg-success-50 text-success-700 rounded text-[10px]">منحة إضافية</span>
                                        ) : state.legacy ? (
                                          <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px]">صلاحية قديمة على الحساب</span>
                                        ) : null}
                                      </span>
                                      <span className="block text-xs text-gray-500 mt-0.5">{p.description}</span>
                                    </span>
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null)}
              </div>

              <div className="flex items-center gap-3 p-6 border-t border-gray-100 sticky bottom-0 bg-white">
                <button onClick={() => setShowModal(false)} className="flex-1 btn-secondary">
                  إلغاء
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || lockedScopeAllAccount}
                  className="flex-1 btn-primary disabled:opacity-50"
                >
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
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer w-fit">
                  <input
                    type="checkbox"
                    checked={resetMustChange}
                    onChange={(e) => setResetMustChange(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  كلمة مؤقتة — يغيّرها أول ما يدخل
                </label>
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

        {/* كلمة مرور مؤقتة واحدة للمختارين */}
        {showBulk && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">تعيين كلمة مرور مؤقتة</h2>
                <button onClick={() => setShowBulk(false)} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="إغلاق">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {(bulkError || bulkProblem) && (
                  <div className="bg-red-50 text-red-700 rounded-xl p-4">{bulkError ?? bulkProblem}</div>
                )}

                <p className="text-sm text-gray-600">
                  كلمة واحدة لـ <span className="font-bold text-gray-800">{selected.size}</span> مستخدم. اكتبها إنت وبلّغهم
                  بيها، وأي جلسة قديمة ليهم هتقفل.
                </p>
                <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
                  {users
                    .filter((u) => selected.has(u.id))
                    .map((u) => (
                      <span key={u.id} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">
                        {u.displayName}
                      </span>
                    ))}
                </div>

                <div>
                  <label htmlFor="bulk-password" className="block text-sm font-medium text-gray-700 mb-2">
                    كلمة المرور المؤقتة
                  </label>
                  <input
                    id="bulk-password"
                    type="password"
                    autoComplete="new-password"
                    className="input w-full"
                    value={bulkPassword}
                    onChange={(e) => setBulkPassword(e.target.value)}
                    placeholder={`${MIN_PASSWORD} أحرف على الأقل`}
                    dir="ltr"
                  />
                </div>
                <div>
                  <label htmlFor="bulk-confirm" className="block text-sm font-medium text-gray-700 mb-2">
                    اكتبها تاني
                  </label>
                  <input
                    id="bulk-confirm"
                    type="password"
                    autoComplete="new-password"
                    className="input w-full"
                    value={bulkConfirm}
                    onChange={(e) => setBulkConfirm(e.target.value)}
                    dir="ltr"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer w-fit">
                  <input
                    type="checkbox"
                    checked={bulkMustChange}
                    onChange={(e) => setBulkMustChange(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  لازم كل واحد يغيّرها أول ما يدخل
                </label>
              </div>

              <div className="flex items-center gap-3 p-6 border-t border-gray-100">
                <button onClick={() => setShowBulk(false)} className="flex-1 btn-secondary">
                  إلغاء
                </button>
                <button
                  onClick={handleBulkPassword}
                  disabled={
                    saving || selected.size === 0 || bulkPassword.length < MIN_PASSWORD || bulkConfirm !== bulkPassword
                  }
                  className="flex-1 btn-primary disabled:opacity-50"
                >
                  {saving ? 'جارٍ الحفظ...' : `تعيين لـ ${selected.size} مستخدم`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
