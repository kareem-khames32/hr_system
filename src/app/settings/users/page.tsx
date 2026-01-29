'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Plus,
  User,
  Mail,
  Shield,
  Calendar,
  MoreVertical,
  Edit2,
  Trash2,
  Key,
  UserX,
  CheckCircle2,
  Clock,
  X,
} from 'lucide-react'

interface SystemUser {
  id: string
  name: string
  email: string
  role: string
  department: string
  status: 'active' | 'inactive' | 'pending'
  lastLogin: string
  createdAt: string
  avatar?: string
}

const users: SystemUser[] = [
  {
    id: '1',
    name: 'أحمد محمد الشمري',
    email: 'ahmed@company.com',
    role: 'مدير النظام',
    department: 'تقنية المعلومات',
    status: 'active',
    lastLogin: '2024-01-21 14:30',
    createdAt: '2023-01-15',
  },
  {
    id: '2',
    name: 'سارة أحمد الخالدي',
    email: 'sara@company.com',
    role: 'مدير الموارد البشرية',
    department: 'الموارد البشرية',
    status: 'active',
    lastLogin: '2024-01-21 10:15',
    createdAt: '2023-03-20',
  },
  {
    id: '3',
    name: 'محمد علي السعيد',
    email: 'mohammed@company.com',
    role: 'أخصائي موارد بشرية',
    department: 'الموارد البشرية',
    status: 'active',
    lastLogin: '2024-01-20 16:45',
    createdAt: '2023-06-10',
  },
  {
    id: '4',
    name: 'نورة محمد الدوسري',
    email: 'noura@company.com',
    role: 'محاسب',
    department: 'المالية',
    status: 'inactive',
    lastLogin: '2024-01-10 09:00',
    createdAt: '2023-08-05',
  },
  {
    id: '5',
    name: 'فهد عبدالله العتيبي',
    email: 'fahad@company.com',
    role: 'مشاهد',
    department: 'المبيعات',
    status: 'pending',
    lastLogin: '-',
    createdAt: '2024-01-20',
  },
]

const roles = [
  { id: '1', name: 'مدير النظام' },
  { id: '2', name: 'مدير الموارد البشرية' },
  { id: '3', name: 'أخصائي موارد بشرية' },
  { id: '4', name: 'محاسب' },
  { id: '5', name: 'مشاهد' },
]

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

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null)

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.includes(searchTerm) || user.email.includes(searchTerm)
    const matchesRole = filterRole === 'all' || user.role === filterRole
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus
    return matchesSearch && matchesRole && matchesStatus
  })

  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === 'active').length,
    inactive: users.filter((u) => u.status === 'inactive').length,
    pending: users.filter((u) => u.status === 'pending').length,
  }

  const openAddModal = () => {
    setEditingUser(null)
    setShowModal(true)
  }

  const openEditModal = (user: SystemUser) => {
    setEditingUser(user)
    setShowModal(true)
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
                <option key={role.id} value={role.name}>
                  {role.name}
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

        {/* Users Table */}
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">المستخدم</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الدور</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">القسم</th>
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
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Shield size={16} className="text-primary-500" />
                      <span className="text-gray-700">{user.role}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-gray-600">{user.department}</td>
                  <td className="px-4 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[user.status]}`}
                    >
                      {statusLabels[user.status]}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">{user.lastLogin}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                      >
                        <Edit2 size={16} className="text-gray-600" />
                      </button>
                      <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                        <Key size={16} className="text-gray-600" />
                      </button>
                      <button className="p-2 bg-gray-100 rounded-lg hover:bg-red-100">
                        <Trash2 size={16} className="text-gray-600 hover:text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl w-full max-w-lg mx-4">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الاسم الكامل
                  </label>
                  <input
                    type="text"
                    className="input w-full"
                    defaultValue={editingUser?.name}
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
                    defaultValue={editingUser?.email}
                    placeholder="example@company.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الدور
                    </label>
                    <select className="input w-full" defaultValue={editingUser?.role || ''}>
                      <option value="">اختر الدور</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.name}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      القسم
                    </label>
                    <select className="input w-full" defaultValue={editingUser?.department || ''}>
                      <option value="">اختر القسم</option>
                      <option value="تقنية المعلومات">تقنية المعلومات</option>
                      <option value="الموارد البشرية">الموارد البشرية</option>
                      <option value="المالية">المالية</option>
                      <option value="المبيعات">المبيعات</option>
                    </select>
                  </div>
                </div>

                {!editingUser && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      كلمة المرور
                    </label>
                    <input
                      type="password"
                      className="input w-full"
                      placeholder="أدخل كلمة المرور"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الحالة
                  </label>
                  <select className="input w-full" defaultValue={editingUser?.status || 'active'}>
                    <option value="active">نشط</option>
                    <option value="inactive">غير نشط</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 p-6 border-t border-gray-100">
                <button onClick={() => setShowModal(false)} className="flex-1 btn-secondary">
                  إلغاء
                </button>
                <button onClick={() => setShowModal(false)} className="flex-1 btn-primary">
                  {editingUser ? 'حفظ التغييرات' : 'إضافة المستخدم'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
