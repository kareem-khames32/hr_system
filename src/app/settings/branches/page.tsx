'use client'

import { useState } from 'react'
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
  Clock,
  Globe,
  CheckCircle,
  XCircle,
  UserCheck,
  Landmark,
} from 'lucide-react'
import { employees, getEmployeeName } from '@/data/employees'

// Mock data for branches
const initialBranches = [
  {
    id: '1',
    name: 'الفرع الرئيسي - الرياض',
    nameEn: 'Main Branch - Riyadh',
    code: 'RYD-001',
    city: 'الرياض',
    address: 'حي العليا، شارع الملك فهد، الرياض',
    phone: '+966 11 123 4567',
    email: 'riyadh@company.com',
    managerId: 'EMP001',
    manager: 'محمد أحمد السعيد',
    costCenter: 'CC-100',
    employeesCount: 150,
    workingHours: '08:00 - 17:00',
    timezone: 'Asia/Riyadh',
    isActive: true,
    isHeadquarters: true,
  },
  {
    id: '2',
    name: 'فرع جدة',
    nameEn: 'Jeddah Branch',
    code: 'JED-001',
    city: 'جدة',
    address: 'حي الروضة، شارع التحلية، جدة',
    phone: '+966 12 234 5678',
    email: 'jeddah@company.com',
    managerId: 'EMP002',
    manager: 'عبدالله محمد العمري',
    costCenter: 'CC-200',
    employeesCount: 85,
    workingHours: '08:00 - 17:00',
    timezone: 'Asia/Riyadh',
    isActive: true,
    isHeadquarters: false,
  },
  {
    id: '3',
    name: 'فرع الدمام',
    nameEn: 'Dammam Branch',
    code: 'DMM-001',
    city: 'الدمام',
    address: 'حي الفيصلية، شارع الملك سعود، الدمام',
    phone: '+966 13 345 6789',
    email: 'dammam@company.com',
    managerId: 'EMP003',
    manager: 'سالم عبدالرحمن القحطاني',
    costCenter: 'CC-300',
    employeesCount: 62,
    workingHours: '08:00 - 17:00',
    timezone: 'Asia/Riyadh',
    isActive: true,
    isHeadquarters: false,
  },
  {
    id: '4',
    name: 'فرع المدينة المنورة',
    nameEn: 'Madinah Branch',
    code: 'MED-001',
    city: 'المدينة المنورة',
    address: 'حي العزيزية، المدينة المنورة',
    phone: '+966 14 456 7890',
    email: 'madinah@company.com',
    managerId: 'EMP004',
    manager: 'فهد سعد الحربي',
    costCenter: 'CC-400',
    employeesCount: 45,
    workingHours: '08:00 - 17:00',
    timezone: 'Asia/Riyadh',
    isActive: false,
    isHeadquarters: false,
  },
]

export default function BranchesPage() {
  const [branches, setBranches] = useState(initialBranches)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingBranch, setEditingBranch] = useState<typeof initialBranches[0] | null>(null)
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    nameEn: '',
    code: '',
    city: '',
    address: '',
    phone: '',
    email: '',
    managerId: '',
    costCenter: '',
    workingHours: '08:00 - 17:00',
    timezone: 'Asia/Riyadh',
    isActive: true,
    isHeadquarters: false,
  })

  const filteredBranches = branches.filter(
    (branch) =>
      branch.name.includes(searchQuery) ||
      branch.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      branch.city.includes(searchQuery) ||
      branch.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleOpenModal = (branch?: typeof initialBranches[0]) => {
    if (branch) {
      setEditingBranch(branch)
      setFormData({
        name: branch.name,
        nameEn: branch.nameEn,
        code: branch.code,
        city: branch.city,
        address: branch.address,
        phone: branch.phone,
        email: branch.email,
        managerId: branch.managerId,
        costCenter: branch.costCenter,
        workingHours: branch.workingHours,
        timezone: branch.timezone,
        isActive: branch.isActive,
        isHeadquarters: branch.isHeadquarters,
      })
    } else {
      setEditingBranch(null)
      setFormData({
        name: '',
        nameEn: '',
        code: '',
        city: '',
        address: '',
        phone: '',
        email: '',
        managerId: '',
        costCenter: '',
        workingHours: '08:00 - 17:00',
        timezone: 'Asia/Riyadh',
        isActive: true,
        isHeadquarters: false,
      })
    }
    setShowModal(true)
  }

  const handleSave = () => {
    // اسم المدير يُشتق من اختيار الموظف (مصدر واحد للحقيقة)
    const managerName = getEmployeeName(formData.managerId)
    if (editingBranch) {
      setBranches(
        branches.map((b) =>
          b.id === editingBranch.id
            ? { ...b, ...formData, manager: managerName }
            : b
        )
      )
    } else {
      const newBranch = {
        id: String(Date.now()),
        ...formData,
        manager: managerName,
        employeesCount: 0,
      }
      setBranches([...branches, newBranch])
    }
    setShowModal(false)
  }

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الفرع؟')) {
      setBranches(branches.filter((b) => b.id !== id))
    }
    setActiveMenu(null)
  }

  const toggleStatus = (id: string) => {
    setBranches(
      branches.map((b) =>
        b.id === id ? { ...b, isActive: !b.isActive } : b
      )
    )
    setActiveMenu(null)
  }

  const totalEmployees = branches.reduce((sum, b) => sum + b.employeesCount, 0)
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
                  {new Set(branches.map((b) => b.city)).size}
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

        {/* Branches Grid */}
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
                        onClick={() => toggleStatus(branch.id)}
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
                          onClick={() => handleDelete(branch.id)}
                          className="w-full flex items-center gap-2 px-4 py-2 text-danger-600 hover:bg-danger-50"
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
                  <p className="text-gray-500 text-sm">{branch.nameEn}</p>
                  <p className="text-primary-600 font-mono text-sm mt-1">{branch.code}</p>
                </div>
              </div>

              {/* Details */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <MapPin size={16} className="text-gray-400" />
                  <span className="text-gray-600">{branch.address}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone size={16} className="text-gray-400" />
                  <span className="text-gray-600" dir="ltr">{branch.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Mail size={16} className="text-gray-400" />
                  <span className="text-gray-600">{branch.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock size={16} className="text-gray-400" />
                  <span className="text-gray-600">ساعات العمل: {branch.workingHours}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {branch.employeesCount} موظف
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <UserCheck size={16} className="text-primary-500" />
                  {branch.manager || 'لم يُحدد مدير'}
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

        {/* Empty State */}
        {filteredBranches.length === 0 && (
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

                {/* Manager & Working Hours */}
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
                          {emp.name} — {emp.position}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                      المدير المُسنَد يُستخدم في دورات الاعتماد وصلاحيات الفرع
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ساعات العمل
                    </label>
                    <input
                      type="text"
                      value={formData.workingHours}
                      onChange={(e) =>
                        setFormData({ ...formData, workingHours: e.target.value })
                      }
                      className="input w-full"
                      placeholder="08:00 - 17:00"
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Cost Center */}
                <div className="grid grid-cols-2 gap-4">
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
                <button onClick={handleSave} className="btn-primary">
                  {editingBranch ? 'حفظ التغييرات' : 'إضافة الفرع'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
