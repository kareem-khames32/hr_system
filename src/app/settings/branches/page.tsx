'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import Link from 'next/link'
import {
  ArrowRight,
  Plus,
  Search,
  Building2,
  MapPin,
  Phone,
  Mail,
  Edit,
  Trash2,
  MoreVertical,
  Users,
  CheckCircle,
  XCircle,
  UserCheck,
  Landmark,
} from 'lucide-react'
import {
  ApiBranch,
  ApiEmployee,
  createBranch,
  fetchBranches,
  fetchEmployees,
  updateBranch,
} from '@/lib/api'

const emptyForm = {
  name: '',
  nameEn: '',
  code: '',
  city: '',
  address: '',
  phone: '',
  email: '',
  managerId: '',
  costCenter: '',
  isActive: true,
  isHeadquarters: false,
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<ApiBranch[]>([])
  const [employees, setEmployees] = useState<ApiEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editingBranch, setEditingBranch] = useState<ApiBranch | null>(null)
  const [activeMenu, setActiveMenu] = useState<number | null>(null)

  const [formData, setFormData] = useState({ ...emptyForm })

  const loadData = async () => {
    try {
      const [br, emps] = await Promise.all([fetchBranches(), fetchEmployees()])
      setBranches(br)
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

  const managerNameOf = (branch: ApiBranch) =>
    employees.find((e) => e.id === branch.managerEmployeeId)?.fullName ?? ''

  const employeesCountOf = (branchId: number) =>
    employees.filter((e) => e.branchId === branchId).length

  const filteredBranches = branches.filter(
    (branch) =>
      branch.name.includes(searchQuery) ||
      (branch.nameEn ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (branch.city ?? '').includes(searchQuery) ||
      branch.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleOpenModal = (branch?: ApiBranch) => {
    setModalError(null)
    if (branch) {
      setEditingBranch(branch)
      setFormData({
        name: branch.name,
        nameEn: branch.nameEn ?? '',
        code: branch.code,
        city: branch.city ?? '',
        address: branch.address ?? '',
        phone: branch.phone ?? '',
        email: branch.email ?? '',
        managerId: branch.managerEmployeeId ? String(branch.managerEmployeeId) : '',
        costCenter: branch.costCenter ?? '',
        isActive: branch.isActive,
        isHeadquarters: branch.isHeadquarters,
      })
    } else {
      setEditingBranch(null)
      setFormData({ ...emptyForm })
    }
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setModalError(null)
    const payload: Partial<ApiBranch> = {
      name: formData.name,
      nameEn: formData.nameEn || undefined,
      code: formData.code,
      city: formData.city || undefined,
      address: formData.address || undefined,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
      managerEmployeeId: formData.managerId ? Number(formData.managerId) : undefined,
      costCenter: formData.costCenter || undefined,
      isHeadquarters: formData.isHeadquarters,
    }
    try {
      if (editingBranch) {
        await updateBranch(editingBranch.id, { ...payload, isActive: formData.isActive })
      } else {
        const created = await createBranch(payload)
        // إنشاء الفرع لا يقبل isActive — نعطّله بعد الإنشاء لو طُلب ذلك
        if (!formData.isActive) await updateBranch(created.id, { isActive: false })
      }
      await loadData()
      setShowModal(false)
    } catch (err: any) {
      setModalError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (branch: ApiBranch) => {
    setActiveMenu(null)
    try {
      const updated = await updateBranch(branch.id, { isActive: !branch.isActive })
      setBranches((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
      setError(null)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const totalEmployees = employees.length
  const activeBranches = branches.filter((b) => b.isActive).length

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/settings" className="hover:text-primary-600">
            الإعدادات
          </Link>
          <ArrowRight size={16} />
          <span className="text-gray-800">إدارة الفروع</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">إدارة الفروع</h1>
            <p className="text-gray-500 mt-1">إضافة وإدارة فروع الشركة</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            إضافة فرع جديد
          </button>
        </div>

        {/* Error Banner */}
        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
                <Building2 size={24} className="text-primary-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">إجمالي الفروع</p>
                <p className="text-2xl font-bold text-gray-800">{branches.length}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-success-50 rounded-xl flex items-center justify-center">
                <CheckCircle size={24} className="text-success-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">الفروع النشطة</p>
                <p className="text-2xl font-bold text-success-600">{activeBranches}</p>
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
                <MapPin size={24} className="text-gray-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">المدن</p>
                <p className="text-2xl font-bold text-gray-800">
                  {new Set(branches.map((b) => b.city).filter(Boolean)).size}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="card p-4">
          <div className="relative">
            <Search
              size={20}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="البحث عن فرع..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pr-10 w-full md:w-96"
            />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Branches Grid */}
        {!loading && (
          <div className="grid grid-cols-2 gap-6">
            {filteredBranches.map((branch) => (
              <div
                key={branch.id}
                className={`card p-6 relative ${
                  !branch.isActive ? 'opacity-60' : ''
                }`}
              >
                {/* Status Badge */}
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  {branch.isHeadquarters && (
                    <span className="badge badge-primary">المقر الرئيسي</span>
                  )}
                  <span
                    className={`badge ${
                      branch.isActive ? 'badge-success' : 'badge-danger'
                    }`}
                  >
                    {branch.isActive ? 'نشط' : 'غير نشط'}
                  </span>
                </div>

                {/* Actions Menu */}
                <div className="absolute top-4 left-32">
                  <button
                    onClick={() =>
                      setActiveMenu(activeMenu === branch.id ? null : branch.id)
                    }
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <MoreVertical size={18} className="text-gray-500" />
                  </button>

                  {activeMenu === branch.id && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setActiveMenu(null)}
                      />
                      <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20">
                        <button
                          onClick={() => {
                            handleOpenModal(branch)
                            setActiveMenu(null)
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50"
                        >
                          <Edit size={16} />
                          تعديل
                        </button>
                        <button
                          onClick={() => toggleStatus(branch)}
                          className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50"
                        >
                          {branch.isActive ? (
                            <>
                              <XCircle size={16} />
                              تعطيل
                            </>
                          ) : (
                            <>
                              <CheckCircle size={16} />
                              تفعيل
                            </>
                          )}
                        </button>
                        {!branch.isHeadquarters && (
                          <button
                            disabled
                            title="الحذف غير متاح — عطّل الفرع بدلاً من ذلك"
                            className="w-full flex items-center gap-2 px-4 py-2 text-danger-600 opacity-50 cursor-not-allowed"
                          >
                            <Trash2 size={16} />
                            حذف
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Branch Info */}
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center">
                    <Building2 size={28} className="text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800 text-lg">{branch.name}</h3>
                    <p className="text-gray-500 text-sm">{branch.nameEn ?? ''}</p>
                    <p className="text-primary-600 font-mono text-sm mt-1">{branch.code}</p>
                  </div>
                </div>

                {/* Details */}
                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin size={16} className="text-gray-400" />
                    <span className="text-gray-600">{branch.address || branch.city || '—'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Phone size={16} className="text-gray-400" />
                    <span className="text-gray-600" dir="ltr">{branch.phone || '—'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Mail size={16} className="text-gray-400" />
                    <span className="text-gray-600">{branch.email || '—'}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {employeesCountOf(branch.id)} موظف
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <UserCheck size={16} className="text-primary-500" />
                    {managerNameOf(branch) || 'لم يُحدد مدير'}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Landmark size={14} className="text-gray-400" />
                  <span className="text-xs font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded-lg" dir="ltr">
                    {branch.costCenter || '—'}
                  </span>
                  <span className="text-xs text-gray-400">مركز التكلفة</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredBranches.length === 0 && (
          <div className="card p-12 text-center">
            <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-2">لا توجد فروع</h3>
            <p className="text-gray-500 mb-4">لم يتم العثور على فروع مطابقة للبحث</p>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingBranch ? 'تعديل الفرع' : 'إضافة فرع جديد'}
                </h2>
              </div>

              <div className="p-6 space-y-6">
                {/* Modal Error */}
                {modalError && (
                  <div className="bg-red-50 text-red-700 rounded-xl p-4">{modalError}</div>
                )}

                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      اسم الفرع (عربي) *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="input w-full"
                      placeholder="مثال: الفرع الرئيسي - الرياض"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      اسم الفرع (إنجليزي)
                    </label>
                    <input
                      type="text"
                      value={formData.nameEn}
                      onChange={(e) =>
                        setFormData({ ...formData, nameEn: e.target.value })
                      }
                      className="input w-full"
                      placeholder="e.g. Main Branch - Riyadh"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      كود الفرع *
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                      }
                      className="input w-full font-mono"
                      placeholder="مثال: RYD-001"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      المدينة *
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      className="input w-full"
                      placeholder="مثال: الرياض"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    العنوان
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    className="input w-full"
                    placeholder="العنوان التفصيلي للفرع"
                  />
                </div>

                {/* Contact */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      رقم الهاتف
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="input w-full"
                      placeholder="+966 XX XXX XXXX"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      البريد الإلكتروني
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="input w-full"
                      placeholder="branch@company.com"
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Manager & Cost Center */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      مدير الفرع *
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
                      المدير المُسنَد يُستخدم في دورات الاعتماد وصلاحيات الفرع
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      مركز التكلفة
                    </label>
                    <input
                      type="text"
                      value={formData.costCenter}
                      onChange={(e) =>
                        setFormData({ ...formData, costCenter: e.target.value.toUpperCase() })
                      }
                      className="input w-full font-mono"
                      placeholder="مثال: CC-100"
                      dir="ltr"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      تُحمَّل عليه رواتب ومصاريف الفرع في التقارير المالية
                    </p>
                  </div>
                </div>

                {/* Options */}
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) =>
                        setFormData({ ...formData, isActive: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">فرع نشط</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isHeadquarters}
                      onChange={(e) =>
                        setFormData({ ...formData, isHeadquarters: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">المقر الرئيسي</span>
                  </label>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  إلغاء
                </button>
                <button onClick={handleSave} disabled={saving} className="btn-primary">
                  {saving ? 'جارٍ الحفظ...' : editingBranch ? 'حفظ التغييرات' : 'إضافة الفرع'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
