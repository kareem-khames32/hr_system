'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Filter,
  Download,
  UserX,
  Calendar,
  Building2,
  RefreshCw,
  Eye,
  Trash2,
  FileText,
} from 'lucide-react'
import Link from 'next/link'
import {
  fetchEmployees,
  fetchBranches,
  fetchDepartments,
  updateEmployee,
} from '@/lib/api'

interface ArchivedEmployee {
  id: number
  name: string
  avatar: string
  employeeId: string
  department: string
  position: string
  joinDate: string
  endDate: string
  yearsOfService: string
  // مؤرشف يدوياً أو منتهي الخدمة عبر ملف إنهاء خدمة
  status: string
}

const serviceText = (joinDate?: string | null) => {
  if (!joinDate) return '—'
  const start = new Date(joinDate)
  const now = new Date()
  const years = Math.floor(
    (now.getTime() - start.getTime()) / (365.25 * 24 * 3600 * 1000)
  )
  if (years < 0) return '—'
  if (years < 1) return 'أقل من سنة'
  return `${years} سنوات`
}

export default function ArchivedEmployeesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [archivedEmployees, setArchivedEmployees] = useState<ArchivedEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [emps, branches, depts] = await Promise.all([
        fetchEmployees(),
        fetchBranches(),
        fetchDepartments(),
      ])
      const branchById = new Map(branches.map((b) => [b.id, b.name]))
      const deptById = new Map(depts.map((d) => [d.id, d.name]))
      setArchivedEmployees(
        emps
          .filter((e) => e.status === 'archived' || e.status === 'terminated')
          .map((e) => ({
            id: e.id,
            name: e.fullName,
            avatar: (e.fullName ?? '').trim().charAt(0) || 'م',
            employeeId: e.employeeCode,
            department:
              (e.departmentId != null ? deptById.get(e.departmentId) : null) ??
              branchById.get(e.branchId) ??
              '—',
            position: e.jobTitle ?? '—',
            joinDate: e.joinDate ? String(e.joinDate).slice(0, 10) : '',
            endDate: '',
            yearsOfService: serviceText(e.joinDate),
            status: e.status,
          }))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل الأرشيف')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleReactivate = async (id: number) => {
    if (!window.confirm('هل تريد إعادة تفعيل هذا الموظف؟')) return
    try {
      await updateEmployee(id, { status: 'active', isActive: true })
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذرت إعادة التفعيل')
    }
  }

  const filteredEmployees = archivedEmployees.filter((emp) => {
    return (
      (emp.name.includes(searchTerm) || emp.employeeId.includes(searchTerm)) &&
      (!filterStatus || emp.status === filterStatus)
    )
  })

  const archivedCount = archivedEmployees.filter((e) => e.status === 'archived').length
  const terminatedCount = archivedEmployees.filter((e) => e.status === 'terminated').length

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">أرشيف الموظفين</h1>
            <p className="text-gray-500 mt-1">الموظفين المنتهية خدماتهم</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/employees" className="btn-secondary flex items-center gap-2">
              <RefreshCw size={18} />
              الموظفين الحاليين
            </Link>
            <button className="btn-primary flex items-center gap-2">
              <Download size={18} />
              تصدير
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
              <UserX size={24} className="text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي المؤرشفين</p>
              <p className="text-2xl font-bold text-gray-800">{archivedCount}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
              <FileText size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">نتائج البحث</p>
              <p className="text-2xl font-bold text-gray-800">{filteredEmployees.length}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
              <Calendar size={24} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">منتهو الخدمة</p>
              <p className="text-2xl font-bold text-red-600">{terminatedCount}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-warning-50 rounded-2xl flex items-center justify-center">
              <Building2 size={24} className="text-warning-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">قابلون لإعادة التفعيل</p>
              <p className="text-2xl font-bold text-gray-800">{archivedCount}</p>
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
                placeholder="بحث عن موظف..."
                className="input pr-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input w-56"
            >
              <option value="">كل الحالات</option>
              <option value="archived">مؤرشف</option>
              <option value="terminated">منتهي الخدمة</option>
            </select>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
        /* Table */
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الموظف</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">القسم</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">تاريخ الالتحاق</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">تاريخ الانتهاء</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">مدة الخدمة</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الحالة</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-300 rounded-xl flex items-center justify-center text-white font-bold">
                        {emp.avatar}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{emp.name}</p>
                        <p className="text-sm text-gray-500">{emp.employeeId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-gray-800">{emp.department}</p>
                    <p className="text-sm text-gray-500">{emp.position}</p>
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    {emp.joinDate
                      ? new Date(emp.joinDate).toLocaleDateString('ar-SA')
                      : '—'}
                  </td>
                  <td className="px-4 py-4 text-gray-600">—</td>
                  <td className="px-4 py-4 text-gray-600">{emp.yearsOfService}</td>
                  <td className="px-4 py-4">
                    {emp.status === 'terminated' ? (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        انتهت الخدمة
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        مؤرشف
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        href={`/employees/${emp.id}`}
                        className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                        title="عرض الملف"
                      >
                        <Eye size={16} className="text-gray-600" />
                      </Link>
                      {emp.status === 'archived' && (
                        <button
                          onClick={() => handleReactivate(emp.id)}
                          className="p-2 bg-gray-100 rounded-lg hover:bg-success-50"
                          title="إعادة تفعيل"
                        >
                          <RefreshCw size={16} className="text-gray-600 hover:text-success-600" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredEmployees.length === 0 && (
            <div className="py-12 text-center">
              <UserX size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">لا يوجد موظفون مؤرشفون أو منتهو الخدمة مطابقون</p>
            </div>
          )}
        </div>
        )}
      </div>
    </MainLayout>
  )
}
