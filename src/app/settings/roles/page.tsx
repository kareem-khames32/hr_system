'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Plus,
  Shield,
  Users,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  Settings,
  Lock,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface Permission {
  id: string
  name: string
  description: string
  granted: boolean
}

interface PermissionGroup {
  id: string
  name: string
  permissions: Permission[]
}

interface Role {
  id: string
  name: string
  description: string
  usersCount: number
  isSystem: boolean
  createdAt: string
  permissions: string[]
}

const roles: Role[] = [
  {
    id: '1',
    name: 'مدير النظام',
    description: 'صلاحيات كاملة للنظام',
    usersCount: 2,
    isSystem: true,
    createdAt: '2023-01-01',
    permissions: ['all'],
  },
  {
    id: '2',
    name: 'مدير الموارد البشرية',
    description: 'إدارة كاملة لشؤون الموظفين والرواتب',
    usersCount: 3,
    isSystem: false,
    createdAt: '2023-01-15',
    permissions: ['employees.all', 'attendance.all', 'leaves.all', 'payroll.all'],
  },
  {
    id: '3',
    name: 'أخصائي موارد بشرية',
    description: 'إدارة الموظفين والحضور والإجازات',
    usersCount: 5,
    isSystem: false,
    createdAt: '2023-02-01',
    permissions: ['employees.read', 'employees.edit', 'attendance.all', 'leaves.all'],
  },
  {
    id: '4',
    name: 'محاسب',
    description: 'إدارة الرواتب والتقارير المالية',
    usersCount: 2,
    isSystem: false,
    createdAt: '2023-03-01',
    permissions: ['payroll.all', 'reports.financial'],
  },
  {
    id: '5',
    name: 'مشاهد',
    description: 'عرض البيانات فقط بدون تعديل',
    usersCount: 8,
    isSystem: false,
    createdAt: '2023-04-01',
    permissions: ['employees.read', 'attendance.read', 'leaves.read'],
  },
]

const permissionGroups: PermissionGroup[] = [
  {
    id: 'employees',
    name: 'الموظفين',
    permissions: [
      { id: 'employees.read', name: 'عرض', description: 'عرض بيانات الموظفين', granted: false },
      { id: 'employees.create', name: 'إضافة', description: 'إضافة موظفين جدد', granted: false },
      { id: 'employees.edit', name: 'تعديل', description: 'تعديل بيانات الموظفين', granted: false },
      { id: 'employees.delete', name: 'حذف', description: 'حذف الموظفين', granted: false },
    ],
  },
  {
    id: 'attendance',
    name: 'الحضور والانصراف',
    permissions: [
      { id: 'attendance.read', name: 'عرض', description: 'عرض سجلات الحضور', granted: false },
      { id: 'attendance.edit', name: 'تعديل', description: 'تعديل سجلات الحضور', granted: false },
      { id: 'attendance.reports', name: 'التقارير', description: 'عرض تقارير الحضور', granted: false },
    ],
  },
  {
    id: 'leaves',
    name: 'الإجازات',
    permissions: [
      { id: 'leaves.read', name: 'عرض', description: 'عرض طلبات الإجازات', granted: false },
      { id: 'leaves.approve', name: 'اعتماد', description: 'اعتماد أو رفض الإجازات', granted: false },
      { id: 'leaves.manage', name: 'إدارة', description: 'إدارة أنواع الإجازات', granted: false },
    ],
  },
  {
    id: 'payroll',
    name: 'الرواتب',
    permissions: [
      { id: 'payroll.read', name: 'عرض', description: 'عرض بيانات الرواتب', granted: false },
      { id: 'payroll.process', name: 'معالجة', description: 'معالجة مسير الرواتب', granted: false },
      { id: 'payroll.reports', name: 'التقارير', description: 'عرض التقارير المالية', granted: false },
    ],
  },
  {
    id: 'settings',
    name: 'الإعدادات',
    permissions: [
      { id: 'settings.users', name: 'المستخدمين', description: 'إدارة المستخدمين', granted: false },
      { id: 'settings.roles', name: 'الأدوار', description: 'إدارة الأدوار والصلاحيات', granted: false },
      { id: 'settings.system', name: 'النظام', description: 'إعدادات النظام العامة', granted: false },
    ],
  },
]

export default function RolesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['employees'])

  const filteredRoles = roles.filter(
    (role) => role.name.includes(searchTerm) || role.description.includes(searchTerm)
  )

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId) ? prev.filter((g) => g !== groupId) : [...prev, groupId]
    )
  }

  const openAddModal = () => {
    setEditingRole(null)
    setShowModal(true)
  }

  const openEditModal = (role: Role) => {
    setEditingRole(role)
    setShowModal(true)
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">الأدوار والصلاحيات</h1>
            <p className="text-gray-500 mt-1">إدارة أدوار المستخدمين وصلاحياتهم</p>
          </div>
          <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            إضافة دور جديد
          </button>
        </div>

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
              <p className="text-2xl font-bold text-gray-800">
                {roles.reduce((sum, r) => sum + r.usersCount, 0)}
              </p>
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

        {/* Roles Grid */}
        <div className="grid grid-cols-2 gap-4">
          {filteredRoles.map((role) => (
            <div key={role.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      role.isSystem ? 'bg-blue-100' : 'bg-primary-100'
                    }`}
                  >
                    <Shield
                      size={24}
                      className={role.isSystem ? 'text-blue-600' : 'text-primary-600'}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-800">{role.name}</h3>
                      {role.isSystem && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                          نظام
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{role.description}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Users size={16} />
                  <span>{role.usersCount} مستخدم</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircle2 size={16} />
                  <span>
                    {role.permissions.includes('all')
                      ? 'صلاحيات كاملة'
                      : `${role.permissions.length} صلاحية`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                <button
                  onClick={() => openEditModal(role)}
                  className="flex-1 btn-secondary flex items-center justify-center gap-2"
                >
                  <Edit2 size={16} />
                  تعديل
                </button>
                <button className="flex-1 btn-secondary flex items-center justify-center gap-2">
                  <Eye size={16} />
                  عرض الصلاحيات
                </button>
                {!role.isSystem && (
                  <button className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100">
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingRole ? 'تعديل الدور' : 'إضافة دور جديد'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اسم الدور
                  </label>
                  <input
                    type="text"
                    className="input w-full"
                    defaultValue={editingRole?.name}
                    placeholder="مثال: أخصائي موارد بشرية"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الوصف
                  </label>
                  <textarea
                    className="input w-full"
                    rows={2}
                    defaultValue={editingRole?.description}
                    placeholder="وصف مختصر للدور وصلاحياته"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    الصلاحيات
                  </label>
                  <div className="space-y-3">
                    {permissionGroups.map((group) => (
                      <div key={group.id} className="border border-gray-200 rounded-xl overflow-hidden">
                        <button
                          onClick={() => toggleGroup(group.id)}
                          className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100"
                        >
                          <span className="font-medium text-gray-800">{group.name}</span>
                          {expandedGroups.includes(group.id) ? (
                            <ChevronUp size={18} className="text-gray-500" />
                          ) : (
                            <ChevronDown size={18} className="text-gray-500" />
                          )}
                        </button>
                        {expandedGroups.includes(group.id) && (
                          <div className="p-4 space-y-3">
                            {group.permissions.map((permission) => (
                              <label
                                key={permission.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100"
                              >
                                <div>
                                  <p className="font-medium text-gray-700">{permission.name}</p>
                                  <p className="text-sm text-gray-500">{permission.description}</p>
                                </div>
                                <input
                                  type="checkbox"
                                  defaultChecked={permission.granted}
                                  className="w-5 h-5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                                />
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-6 border-t border-gray-100 sticky bottom-0 bg-white">
                <button onClick={() => setShowModal(false)} className="flex-1 btn-secondary">
                  إلغاء
                </button>
                <button onClick={() => setShowModal(false)} className="flex-1 btn-primary">
                  {editingRole ? 'حفظ التغييرات' : 'إضافة الدور'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
