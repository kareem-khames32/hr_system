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
  Copy,
  AlertTriangle,
  ListChecks,
  RotateCcw,
} from 'lucide-react'
import {
  type ApiPermission,
  type ApiRole,
  createRole,
  fetchPermissionsRegistry,
  fetchRolesFull,
  getCurrentUser,
  updateRole,
} from '@/lib/api'

// الشاشة بتعرض كل صلاحية في سجل النظام (GET /permissions-registry) تحت وحدتها، بتسميتها وسطر شرحها،
// ومين شايلها من الأدوار. الصلاحية اللي مفيش أي دور شايلها بتتعلّم «يتيمة» عشان ماتتنسيش
// (approve.custody فضلت كده لحد تدقيق 21 سبتمبر). الفرض الحقيقي في الخادم — الشاشة بتوضّح بس.

const emptyForm = { code: '', nameAr: '', permissions: [] as string[] }
type Tab = 'roles' | 'permissions'

// بحث عربي متسامح: الهمزات والتاء المربوطة والياء، وحالة الأحرف في المفاتيح الإنجليزية
const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim()

const matchesPermission = (p: ApiPermission, term: string) => {
  const t = normalize(term)
  if (!t) return true
  return [p.labelAr, p.description, p.key, p.groupLabelAr].some((field) => normalize(field).includes(t))
}

// نفس المجموعة بغض النظر عن الترتيب
const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((p) => b.includes(p))

export default function RolesPage() {
  const [roles, setRoles] = useState<ApiRole[]>([])
  const [registry, setRegistry] = useState<ApiPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('roles')
  const [searchTerm, setSearchTerm] = useState('')
  const [permSearch, setPermSearch] = useState('')
  const [orphansOnly, setOrphansOnly] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  // المودال المشترك للإنشاء/التعديل — editingRole=null يعني إنشاء (ومنه «نسخ دور»)
  const [showModal, setShowModal] = useState(false)
  const [editingRole, setEditingRole] = useState<ApiRole | null>(null)
  const [copiedFrom, setCopiedFrom] = useState<ApiRole | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [modalSearch, setModalSearch] = useState('')
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
    setIsSuperAdmin(getCurrentUser()?.role === 'super_admin')
    loadData()
  }, [])

  // السجل مجمّعًا حسب الوحدة، بترتيب الخادم
  const grouped = useMemo(() => {
    const groups = new Map<string, { label: string; perms: ApiPermission[] }>()
    for (const p of registry) {
      const entry = groups.get(p.group) ?? { label: p.groupLabelAr, perms: [] }
      entry.perms.push(p)
      groups.set(p.group, entry)
    }
    return Array.from(groups.entries()).map(([key, value]) => ({ key, ...value }))
  }, [registry])

  const registryKeys = useMemo(() => new Set(registry.map((p) => p.key)), [registry])
  const labelOf = useMemo(() => Object.fromEntries(registry.map((p) => [p.key, p.labelAr])), [registry])
  // صلاحية مفيش أي دور مفعّل شايلها (مدير النظام شايل الكل ضمنيًا فمش محسوب)
  const orphans = useMemo(() => registry.filter((p) => p.carriedBy.length === 0), [registry])

  const usersCountOf = (code: string) => roles.find((r) => r.code === code)?.userCount ?? 0
  const totalUsers = roles.reduce((sum, r) => sum + (r.userCount ?? 0), 0)

  const filteredRoles = roles.filter(
    (role) => role.nameAr.includes(searchTerm) || role.code.includes(searchTerm)
  )

  // super_admin يملك كل شيء ضمنياً — دوره للعرض فقط
  const isReadOnly = editingRole?.code === 'super_admin'

  const openCreateModal = () => {
    setEditingRole(null)
    setCopiedFrom(null)
    setForm({ ...emptyForm })
    setModalSearch('')
    setModalError(null)
    setShowModal(true)
  }

  const openEditModal = (role: ApiRole) => {
    setEditingRole(role)
    setCopiedFrom(null)
    setForm({ code: role.code, nameAr: role.nameAr, permissions: [...role.permissions] })
    setModalSearch('')
    setModalError(null)
    setShowModal(true)
  }

  // «نسخ دور»: دور جديد بنفس صلاحيات الأصل — كود واسم مقترحين يتعدّلوا قبل الحفظ
  const openCopyModal = (role: ApiRole) => {
    const taken = new Set(roles.map((r) => r.code))
    const base = `${role.code}_copy`.slice(0, 28)
    let code = base
    for (let n = 2; taken.has(code); n++) code = `${base.slice(0, 26)}_${n}`
    setEditingRole(null)
    setCopiedFrom(role)
    setForm({ code, nameAr: `نسخة من ${role.nameAr}`, permissions: [...role.permissions] })
    setModalSearch('')
    setModalError(null)
    setShowModal(true)
  }

  const setPermissions = (next: string[]) => setForm((f) => ({ ...f, permissions: next }))

  const togglePermission = (key: string, checked: boolean) =>
    setPermissions(checked ? [...form.permissions, key] : form.permissions.filter((p) => p !== key))

  // الصلاحية الحصرية لمدير النظام: غيره مايقدرش يضيفها لدور (الخادم بيرفض) — تفضل متعلّمة لو كانت موجودة
  const lockedForActor = (p: ApiPermission) =>
    p.superAdminOnly && !isSuperAdmin && !(editingRole?.permissions ?? []).includes(p.key)

  const toggleModule = (perms: ApiPermission[], checked: boolean) => {
    const keys = perms.filter((p) => !lockedForActor(p)).map((p) => p.key)
    setPermissions(
      checked
        ? [...form.permissions, ...keys.filter((k) => !form.permissions.includes(k))]
        : form.permissions.filter((p) => !keys.includes(p))
    )
  }

  // الفرق عن المحفوظ — بيتعرض قبل الحفظ، والحفظ بيتبعت بس لو فيه تغيير
  const original = editingRole?.permissions ?? []
  const added = form.permissions.filter((p) => !original.includes(p))
  const removed = original.filter((p) => !form.permissions.includes(p))
  const nameChanged = !!editingRole && form.nameAr !== editingRole.nameAr
  const permsChanged = !sameSet(form.permissions, original)
  const dirty = editingRole ? nameChanged || permsChanged : true
  // صلاحيات في الدور مش موجودة في سجل النظام (اسم قديم) — بتتعرض وتتشال بالحفظ لو اتشالت
  const unknownInForm = form.permissions.filter((p) => !registryKeys.has(p))

  // الحزمة المعتمدة للدور = (الحالي − الزيادة) + الناقص
  const presetDiff = editingRole?.presetDiff ?? null
  const hasPresetDiff = !!presetDiff && (presetDiff.extra.length > 0 || presetDiff.missing.length > 0)
  const restorePreset = () => {
    if (!editingRole || !presetDiff) return
    setPermissions([
      ...editingRole.permissions.filter((p) => !presetDiff.extra.includes(p)),
      ...presetDiff.missing,
    ])
  }

  const handleSave = async () => {
    setSaving(true)
    setModalError(null)
    try {
      // ترتيب ثابت: بترتيب سجل الصلاحيات، وبلا تكرار — فالمحفوظ مايتغيّرش شكله مع كل فتح وقفل
      const ordered = [
        ...registry.map((p) => p.key).filter((k) => form.permissions.includes(k)),
        ...unknownInForm,
      ].filter((k, i, all) => all.indexOf(k) === i)
      if (editingRole) {
        await updateRole(editingRole.id, {
          ...(nameChanged ? { nameAr: form.nameAr } : {}),
          ...(permsChanged ? { permissions: ordered } : {}),
        })
        setNotice(
          permsChanged
            ? `اتحفظ دور «${form.nameAr}» — اللي على الدور ده هيتطلب منهم يدخلوا تاني عشان الصلاحيات الجديدة تسري`
            : `اتحفظ اسم الدور «${form.nameAr}»`
        )
      } else {
        await createRole({ code: form.code.trim(), nameAr: form.nameAr, permissions: ordered })
        setNotice(
          copiedFrom
            ? `اتعمل دور «${form.nameAr}» نسخة من «${copiedFrom.nameAr}»`
            : `اتعمل دور «${form.nameAr}»`
        )
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
      await updateRole(role.id, { isActive: !role.isActive })
      // الدور المعطَّل مابيشيلش صلاحياته — فقائمة «مين شايل الصلاحية» لازم تتحدّث
      await loadData()
      setError(null)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const visiblePermissions = (perms: ApiPermission[], term: string) =>
    perms.filter((p) => matchesPermission(p, term) && (!orphansOnly || p.carriedBy.length === 0))

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">الأدوار والصلاحيات</h1>
            <p className="text-gray-500 mt-1">
              كل صلاحيات النظام ({registry.length} صلاحية في {grouped.length} وحدة) والأدوار اللي شايلاها
            </p>
          </div>
          <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            إنشاء دور
          </button>
        </div>

        {/* Error / Notice */}
        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        {notice && (
          <div className="bg-green-50 text-green-700 rounded-xl p-4 flex items-center justify-between gap-4">
            <span>{notice}</span>
            <button onClick={() => setNotice(null)} className="p-1 hover:bg-green-100 rounded-lg" aria-label="إغلاق">
              <X size={16} />
            </button>
          </div>
        )}

        {/* صلاحيات يتيمة: في السجل ومفيش أي دور شايلها */}
        {!loading && orphans.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4" data-testid="orphan-permissions">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-amber-900">
                  {orphans.length} صلاحية مفيش أي دور شايلها — محدش غير مدير النظام يقدر يعمل اللي بتفتحه
                </p>
                <p className="text-sm text-amber-800 mt-1">
                  لو دي مقصودة (صلاحية حساسة لمدير النظام بس) سيبها، ولو لأ ضيفها للدور المناسب.
                </p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {orphans.map((p) => (
                    <span key={p.key} className="px-2 py-0.5 bg-white border border-amber-200 text-amber-800 rounded-full text-xs" title={p.key}>
                      {p.labelAr}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => {
                  setTab('permissions')
                  setOrphansOnly(true)
                }}
                className="btn-secondary text-sm shrink-0"
              >
                اعرضها
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
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
              <p className="text-2xl font-bold text-gray-800">{roles.filter((r) => r.isSystem).length}</p>
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
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center">
              <ListChecks size={24} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">صلاحيات النظام</p>
              <p className="text-2xl font-bold text-gray-800">{registry.length}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-200">
          {([
            ['roles', `الأدوار (${roles.length})`],
            ['permissions', `كل الصلاحيات (${registry.length})`],
          ] as Array<[Tab, string]>).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${
                tab === key ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* ===== تبويب الأدوار ===== */}
        {!loading && tab === 'roles' && (
          <>
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

            <div className="grid grid-cols-2 gap-4">
              {filteredRoles.map((role) => {
                const diff = role.presetDiff
                const differs = !!diff && (diff.extra.length > 0 || diff.missing.length > 0)
                return (
                  <div key={role.id} className="card hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                            role.isSystem ? 'bg-blue-100' : 'bg-purple-100'
                          }`}
                        >
                          <Shield size={24} className={role.isSystem ? 'text-blue-600' : 'text-purple-600'} />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-gray-800">{role.nameAr}</h3>
                            {role.isSystem ? (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">نظام</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">مخصص</span>
                            )}
                            {!role.isActive && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">معطّل</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 font-mono mt-0.5" dir="ltr">
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

                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Users size={16} />
                        <span>{usersCountOf(role.code)} مستخدم</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <CheckCircle2 size={16} />
                        <span>
                          {role.code === 'super_admin' ? 'كل الصلاحيات' : `${role.permissions.length} صلاحية`}
                        </span>
                      </div>
                    </div>

                    {/* الدور اتعدّل عن حزمته المعتمدة: إيه الزائد وإيه الناقص */}
                    {differs && diff && (
                      <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-800 mb-3 space-y-1">
                        <p className="font-medium">مختلف عن الحزمة المعتمدة للدور</p>
                        {diff.extra.length > 0 && <p>زيادة: {diff.extra.map((p) => labelOf[p] ?? p).join('، ')}</p>}
                        {diff.missing.length > 0 && <p>ناقص: {diff.missing.map((p) => labelOf[p] ?? p).join('، ')}</p>}
                      </div>
                    )}

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
                            تعديل الصلاحيات
                          </>
                        )}
                      </button>
                      {role.code !== 'super_admin' && (
                        <button
                          onClick={() => openCopyModal(role)}
                          className="btn-secondary flex items-center justify-center gap-2"
                          title="دور جديد بنفس الصلاحيات"
                        >
                          <Copy size={16} />
                          نسخ دور
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
              {filteredRoles.length === 0 && (
                <div className="col-span-2 card p-12 text-center">
                  <Shield size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">لا توجد أدوار مطابقة</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ===== تبويب كل الصلاحيات ===== */}
        {!loading && tab === 'permissions' && (
          <>
            <div className="card flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[16rem]">
                <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="بحث في الصلاحيات: بالاسم أو الشرح أو الوحدة أو المفتاح..."
                  className="input pr-10 w-full"
                  value={permSearch}
                  onChange={(e) => setPermSearch(e.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300 text-primary-600"
                  checked={orphansOnly}
                  onChange={(e) => setOrphansOnly(e.target.checked)}
                />
                اللي مفيش دور شايلها بس ({orphans.length})
              </label>
            </div>

            <div className="space-y-4">
              {grouped.map((group) => {
                const perms = visiblePermissions(group.perms, permSearch)
                if (perms.length === 0) return null
                return (
                  <div key={group.key} className="card">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-gray-800">{group.label}</h3>
                      <span className="text-xs text-gray-400">{perms.length} صلاحية</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {perms.map((p) => (
                        <div key={p.key} className="py-3 flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-gray-800">{p.labelAr}</p>
                              {p.superAdminOnly && (
                                <span className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-100 rounded-full text-xs flex items-center gap-1">
                                  <Lock size={11} />
                                  يمنحها مدير النظام فقط
                                </span>
                              )}
                              {p.carriedBy.length === 0 && (
                                <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs flex items-center gap-1">
                                  <AlertTriangle size={11} />
                                  مفيش دور شايلها
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5">{p.description}</p>
                            <p className="text-[11px] text-gray-400 font-mono mt-0.5" dir="ltr">
                              {p.key}
                            </p>
                          </div>
                          <div className="flex flex-wrap justify-end gap-1 max-w-[45%] shrink-0">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">مدير النظام</span>
                            {p.carriedBy.map((r) => (
                              <span key={r.code} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">
                                {r.nameAr}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
              {grouped.every((g) => visiblePermissions(g.perms, permSearch).length === 0) && (
                <div className="card p-12 text-center text-gray-500">مفيش صلاحية مطابقة للبحث</div>
              )}
            </div>
          </>
        )}

        {/* Create / Edit / Copy Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl w-full max-w-4xl mx-4 max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingRole
                    ? isReadOnly
                      ? `صلاحيات: ${editingRole.nameAr}`
                      : `تعديل الدور: ${editingRole.nameAr}`
                    : copiedFrom
                      ? `نسخ دور: ${copiedFrom.nameAr}`
                      : 'إنشاء دور جديد'}
                </h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {modalError && <div className="bg-red-50 text-red-700 rounded-xl p-4">{modalError}</div>}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">كود الدور</label>
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
                    {!editingRole && (
                      <p className="text-xs text-gray-400 mt-1">حروف إنجليزية صغيرة وأرقام و _ (من 3 لـ 30) — مايتغيّرش بعد الإنشاء</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">الاسم بالعربية</label>
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
                    <span>مدير النظام يملك كل الصلاحيات ضمنياً — هذا الدور للعرض فقط</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* الدور مختلف عن حزمته المعتمدة */}
                    {hasPresetDiff && presetDiff && (
                      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900 space-y-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-medium">الدور ده مختلف عن حزمته المعتمدة في النظام</p>
                          <button onClick={restorePreset} className="btn-secondary text-xs flex items-center gap-1 shrink-0">
                            <RotateCcw size={13} />
                            رجّعه للحزمة المعتمدة
                          </button>
                        </div>
                        {presetDiff.extra.length > 0 && (
                          <p>زيادة عنها (شيلها لو مش مقصودة): {presetDiff.extra.map((p) => labelOf[p] ?? p).join('، ')}</p>
                        )}
                        {presetDiff.missing.length > 0 && (
                          <p>ناقص منها: {presetDiff.missing.map((p) => labelOf[p] ?? p).join('، ')}</p>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <label className="block text-sm font-medium text-gray-700">
                        الصلاحيات ({form.permissions.filter((p) => registryKeys.has(p)).length} من {registry.length})
                      </label>
                      <div className="relative w-72">
                        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="بحث في الصلاحيات..."
                          className="input pr-9 w-full text-sm"
                          value={modalSearch}
                          onChange={(e) => setModalSearch(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      {grouped.map((group) => {
                        const perms = group.perms.filter((p) => matchesPermission(p, modalSearch))
                        if (perms.length === 0) return null
                        const selectable = perms.filter((p) => !lockedForActor(p))
                        const allOn = selectable.length > 0 && selectable.every((p) => form.permissions.includes(p.key))
                        const onCount = group.perms.filter((p) => form.permissions.includes(p.key)).length
                        return (
                          <div key={group.key} className="border border-gray-100 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-sm font-bold text-gray-700">
                                {group.label}{' '}
                                <span className="font-normal text-gray-400">
                                  ({onCount} من {group.perms.length})
                                </span>
                              </p>
                              <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 rounded border-gray-300 text-primary-600"
                                  checked={allOn}
                                  disabled={selectable.length === 0}
                                  onChange={(e) => toggleModule(perms, e.target.checked)}
                                />
                                الكل
                              </label>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              {perms.map((p) => {
                                const locked = lockedForActor(p)
                                return (
                                  <label
                                    key={p.key}
                                    className={`flex items-start gap-2 p-2 rounded-lg ${
                                      locked ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'
                                    }`}
                                    title={locked ? 'منحها متاح لمدير النظام فقط' : undefined}
                                  >
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 mt-0.5 rounded border-gray-300 text-primary-600"
                                      checked={form.permissions.includes(p.key)}
                                      disabled={locked}
                                      onChange={(e) => togglePermission(p.key, e.target.checked)}
                                    />
                                    <span className="min-w-0">
                                      <span className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-sm text-gray-800">{p.labelAr}</span>
                                        {p.superAdminOnly && <Lock size={12} className="text-red-500" aria-label="يمنحها مدير النظام فقط" />}
                                      </span>
                                      <span className="block text-xs text-gray-500 mt-0.5">{p.description}</span>
                                      <span className="block text-[10px] text-gray-400 font-mono" dir="ltr">
                                        {p.key}
                                      </span>
                                    </span>
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* صلاحيات محفوظة في الدور ومش موجودة في سجل النظام */}
                    {unknownInForm.length > 0 && (
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                        <p className="font-medium mb-2">أسماء قديمة مش موجودة في سجل الصلاحيات (مابتفتحش حاجة):</p>
                        <div className="flex flex-wrap gap-1.5">
                          {unknownInForm.map((p) => (
                            <button
                              key={p}
                              onClick={() => togglePermission(p, false)}
                              className="px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs font-mono flex items-center gap-1 hover:bg-red-50"
                              dir="ltr"
                              title="شيلها من الدور"
                            >
                              {p} <X size={11} />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ملخص التغيير قبل الحفظ */}
                    {editingRole && permsChanged && (
                      <div className="rounded-xl bg-primary-50/60 border border-primary-100 p-4 text-sm space-y-1" data-testid="role-change-summary">
                        <p className="font-medium text-gray-800">اللي هيتغيّر لما تحفظ</p>
                        {added.length > 0 && (
                          <p className="text-success-700">هيتضاف ({added.length}): {added.map((p) => labelOf[p] ?? p).join('، ')}</p>
                        )}
                        {removed.length > 0 && (
                          <p className="text-red-700">هيتشال ({removed.length}): {removed.map((p) => labelOf[p] ?? p).join('، ')}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          {usersCountOf(editingRole.code)} مستخدم على الدور ده — جلساتهم هتقفل وهيدخلوا تاني بالصلاحيات الجديدة
                        </p>
                      </div>
                    )}
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
                    disabled={saving || !dirty || !form.nameAr || (!editingRole && !form.code.trim())}
                    className="flex-1 btn-primary disabled:opacity-50"
                  >
                    {saving
                      ? 'جارٍ الحفظ...'
                      : editingRole
                        ? dirty
                          ? 'حفظ التغييرات'
                          : 'مفيش تغيير'
                        : copiedFrom
                          ? 'إنشاء النسخة'
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
