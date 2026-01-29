'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  Users,
  TrendingUp,
  Gift,
  Car,
  Home,
  Phone,
  Briefcase,
  MoreVertical,
  X,
} from 'lucide-react'

interface Allowance {
  id: string
  name: string
  nameEn: string
  type: 'fixed' | 'percentage'
  value: number
  applicableTo: 'all' | 'department' | 'position' | 'custom'
  employeesCount: number
  totalMonthly: number
  status: 'active' | 'inactive'
  icon: string
}

const allowances: Allowance[] = [
  {
    id: '1',
    name: 'بدل السكن',
    nameEn: 'Housing Allowance',
    type: 'percentage',
    value: 25,
    applicableTo: 'all',
    employeesCount: 156,
    totalMonthly: 195000,
    status: 'active',
    icon: 'home',
  },
  {
    id: '2',
    name: 'بدل المواصلات',
    nameEn: 'Transportation Allowance',
    type: 'fixed',
    value: 500,
    applicableTo: 'all',
    employeesCount: 156,
    totalMonthly: 78000,
    status: 'active',
    icon: 'car',
  },
  {
    id: '3',
    name: 'بدل الهاتف',
    nameEn: 'Phone Allowance',
    type: 'fixed',
    value: 200,
    applicableTo: 'department',
    employeesCount: 45,
    totalMonthly: 9000,
    status: 'active',
    icon: 'phone',
  },
  {
    id: '4',
    name: 'بدل طبيعة العمل',
    nameEn: 'Nature of Work Allowance',
    type: 'percentage',
    value: 15,
    applicableTo: 'position',
    employeesCount: 28,
    totalMonthly: 42000,
    status: 'active',
    icon: 'briefcase',
  },
  {
    id: '5',
    name: 'بدل التميز',
    nameEn: 'Excellence Allowance',
    type: 'fixed',
    value: 1000,
    applicableTo: 'custom',
    employeesCount: 12,
    totalMonthly: 12000,
    status: 'active',
    icon: 'gift',
  },
]

const iconMap: Record<string, React.ReactNode> = {
  home: <Home size={20} />,
  car: <Car size={20} />,
  phone: <Phone size={20} />,
  briefcase: <Briefcase size={20} />,
  gift: <Gift size={20} />,
}

const applicableLabels = {
  all: 'جميع الموظفين',
  department: 'قسم محدد',
  position: 'وظيفة محددة',
  custom: 'مخصص',
}

export default function AllowancesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingAllowance, setEditingAllowance] = useState<Allowance | null>(null)

  const filteredAllowances = allowances.filter(
    (a) => a.name.includes(searchTerm) || a.nameEn.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalAllowances = allowances.reduce((sum, a) => sum + a.totalMonthly, 0)
  const activeCount = allowances.filter((a) => a.status === 'active').length

  const openAddModal = () => {
    setEditingAllowance(null)
    setShowModal(true)
  }

  const openEditModal = (allowance: Allowance) => {
    setEditingAllowance(allowance)
    setShowModal(true)
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">إدارة البدلات</h1>
            <p className="text-gray-500 mt-1">إعداد وإدارة أنواع البدلات المختلفة</p>
          </div>
          <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            إضافة بدل جديد
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
              <DollarSign size={24} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي البدلات الشهرية</p>
              <p className="text-2xl font-bold text-gray-800">{totalAllowances.toLocaleString()} ر.س</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
              <TrendingUp size={24} className="text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">أنواع البدلات النشطة</p>
              <p className="text-2xl font-bold text-gray-800">{activeCount}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Users size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">موظفين مستفيدين</p>
              <p className="text-2xl font-bold text-gray-800">156</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
              <Gift size={24} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">متوسط البدلات للموظف</p>
              <p className="text-2xl font-bold text-gray-800">{Math.round(totalAllowances / 156).toLocaleString()} ر.س</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="card">
          <div className="relative">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="بحث عن بدل..."
              className="input pr-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Allowances Grid */}
        <div className="grid grid-cols-2 gap-4">
          {filteredAllowances.map((allowance) => (
            <div key={allowance.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center text-primary-600">
                    {iconMap[allowance.icon]}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{allowance.name}</h3>
                    <p className="text-sm text-gray-500">{allowance.nameEn}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      allowance.status === 'active'
                        ? 'bg-success-50 text-success-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {allowance.status === 'active' ? 'نشط' : 'غير نشط'}
                  </span>
                  <button className="p-1 hover:bg-gray-100 rounded-lg">
                    <MoreVertical size={18} className="text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">القيمة</p>
                  <p className="font-bold text-gray-800">
                    {allowance.type === 'fixed'
                      ? `${allowance.value.toLocaleString()} ر.س`
                      : `${allowance.value}% من الراتب`}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">ينطبق على</p>
                  <p className="font-bold text-gray-800">{applicableLabels[allowance.applicableTo]}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div>
                  <p className="text-sm text-gray-500">
                    <span className="font-bold text-gray-800">{allowance.employeesCount}</span> موظف
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-sm text-gray-500">التكلفة الشهرية</p>
                  <p className="font-bold text-primary-600">{allowance.totalMonthly.toLocaleString()} ر.س</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => openEditModal(allowance)}
                  className="flex-1 btn-secondary flex items-center justify-center gap-2"
                >
                  <Edit2 size={16} />
                  تعديل
                </button>
                <button className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl w-full max-w-lg mx-4">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingAllowance ? 'تعديل البدل' : 'إضافة بدل جديد'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اسم البدل (عربي)
                  </label>
                  <input
                    type="text"
                    className="input w-full"
                    defaultValue={editingAllowance?.name}
                    placeholder="مثال: بدل السكن"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اسم البدل (إنجليزي)
                  </label>
                  <input
                    type="text"
                    className="input w-full"
                    defaultValue={editingAllowance?.nameEn}
                    placeholder="Example: Housing Allowance"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      نوع القيمة
                    </label>
                    <select className="input w-full" defaultValue={editingAllowance?.type || 'fixed'}>
                      <option value="fixed">مبلغ ثابت</option>
                      <option value="percentage">نسبة من الراتب</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      القيمة
                    </label>
                    <input
                      type="number"
                      className="input w-full"
                      defaultValue={editingAllowance?.value}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ينطبق على
                  </label>
                  <select
                    className="input w-full"
                    defaultValue={editingAllowance?.applicableTo || 'all'}
                  >
                    <option value="all">جميع الموظفين</option>
                    <option value="department">قسم محدد</option>
                    <option value="position">وظيفة محددة</option>
                    <option value="custom">مخصص</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الحالة
                  </label>
                  <select
                    className="input w-full"
                    defaultValue={editingAllowance?.status || 'active'}
                  >
                    <option value="active">نشط</option>
                    <option value="inactive">غير نشط</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 p-6 border-t border-gray-100">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 btn-secondary"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 btn-primary"
                >
                  {editingAllowance ? 'حفظ التعديلات' : 'إضافة البدل'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
