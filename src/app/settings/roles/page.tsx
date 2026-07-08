'use client'

import { useEffect, useState } from 'react'
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
} from 'lucide-react'
import { ApiUser, fetchRoles, fetchUsers } from '@/lib/api'

interface Role {
  role: string
  nameAr: string
  scope: string
  permissions: string[]
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [users, setUsers] = useState<ApiUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewingRole, setViewingRole] = useState<Role | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [r, u] = await Promise.all([fetchRoles(), fetchUsers()])
        setRoles(r)
        setUsers(u)
        setError(null)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const usersCountOf = (role: string) => users.filter((u) => u.role === role).length

  const filteredRoles = roles.filter(
    (role) => role.nameAr.includes(searchTerm) || role.scope.includes(searchTerm)
  )

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">الأدوار والصلاحيات</h1>
            <p className="text-gray-500 mt-1">إدارة أدوار المستخدمين وصلاحياتهم</p>
          </div>
          <button
            className="btn-primary flex items-center gap-2 opacity-50 cursor-not-allowed"
            disabled
            title="الأدوار معرّفة في النظام ولا يمكن إضافتها من الواجهة"
          >
            <Plus size={18} />
            إضافة دور جديد
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
              <p className="text-2xl font-bold text-gray-800">{roles.length}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
              <Users size={24} className="text-success-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">المستخدمين</p>
              <p className="text-2xl font-bold text-gray-800">{users.length}</p>
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
              <div key={role.role} className="card hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-blue-100">
                      <Shield size={24} className="text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-800">{role.nameAr}</h3>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                          نظام
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">النطاق: {role.scope}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Users size={16} />
                    <span>{usersCountOf(role.role)} مستخدم</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <CheckCircle2 size={16} />
                    <span>{role.permissions.length} صلاحية</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                  <button
                    className="flex-1 btn-secondary flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
                    disabled
                    title="الأدوار معرّفة في النظام ولا يمكن تعديلها من الواجهة"
                  >
                    <Edit2 size={16} />
                    تعديل
                  </button>
                  <button
                    onClick={() => setViewingRole(role)}
                    className="flex-1 btn-secondary flex items-center justify-center gap-2"
                  >
                    <Eye size={16} />
                    عرض الصلاحيات
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Permissions Modal (view only) */}
        {viewingRole && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
                <h2 className="text-xl font-bold text-gray-800">
                  صلاحيات: {viewingRole.nameAr}
                </h2>
                <button
                  onClick={() => setViewingRole(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    نطاق الدور
                  </label>
                  <div className="p-3 bg-gray-50 rounded-xl text-gray-700">
                    {viewingRole.scope}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    الصلاحيات
                  </label>
                  <div className="space-y-3">
                    {viewingRole.permissions.map((permission) => (
                      <div
                        key={permission}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                      >
                        <div>
                          <p className="font-medium text-gray-700">{permission}</p>
                        </div>
                        <CheckCircle2 size={20} className="text-success-600" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Lock size={16} />
                  <span>
                    هذا الدور معرّف في كود النظام — التعديل غير متاح من الواجهة
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-6 border-t border-gray-100 sticky bottom-0 bg-white">
                <button
                  onClick={() => setViewingRole(null)}
                  className="flex-1 btn-secondary"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
