'use client'

import { EMPLOYEE_STATUS, employeeStatusLabels, employeeStatusStyles } from '@/lib/status-labels'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Plus,
  Download,
  MoreVertical,
  Eye,
  Edit,
  Mail,
  Phone,
  Building2,
} from 'lucide-react'
import Link from 'next/link'
import { csvDateStamp, downloadCsv } from '@/lib/csv'
import { ARCHIVE_REASON_MAX, archiveReasonIssue } from '@/lib/input-limits'
import {
  can,
  fetchEmployees,
  fetchBranches,
  fetchDepartments,
  archiveEmployee,
  fetchFileObjectUrl,
  ApiDepartment,
} from '@/lib/api'

interface Employee {
  id: number
  employeeId: string
  name: string
  nameEn: string
  avatar: string
  photoFileId?: number
  email: string
  phone: string
  department: string
  jobTitle: string
  status: string
  joinDate: string
  branch: string
}

const getStatusBadge = (status: string) => (
  <span className={`badge ${employeeStatusStyles[status] ?? 'bg-gray-100 text-gray-600'}`}>
    {employeeStatusLabels[status] ?? status}
  </span>
)

// خيارات فلتر الحالة بقيم الباك (EmployeeStatus) — وتسمياتها لعمود الحالة في التصدير
const STATUS_OPTIONS = Object.entries(EMPLOYEE_STATUS).map(([value, meta]) => ({ value, label: meta.label }))
// خارج القائمة الافتراضية — يظهرون بفلتر حالتهم أو «كل الحالات»
const FORMER_STATUSES = ['terminated', 'archived']

// معرّفات صور لم يعد لها ملف (404) — تُحفظ للجلسة فلا تُطلب مع كل فتح للقائمة
const missingPhotoFileIds = new Set<number>()

export default function EmployeesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  // الافتراضي «الحاليون»: بدون المنتهية خدمتهم والمؤرشفين
  const [selectedStatus, setSelectedStatus] = useState('current')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')

  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<ApiDepartment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [photoUrls, setPhotoUrls] = useState<Record<number, string>>({})

  // بحث الهيدر يفتح القائمة بـ ?q= — يُقرأ مرة عند فتح الصفحة
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q')
    if (q) setSearchQuery(q)
  }, [])

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
      setDepartments(depts)
      setEmployees(
        emps.map((e) => ({
          id: e.id,
          employeeId: e.employeeCode,
          name: e.fullName,
          nameEn: e.fullNameEn ?? '',
          avatar: (e.fullName ?? '').trim().charAt(0) || 'م',
          photoFileId: e.photoFileId,
          email: e.email ?? '',
          phone: e.phone ?? '',
          department:
            e.departmentId != null
              ? deptById.get(e.departmentId) ?? '—'
              : '—',
          jobTitle: e.jobTitle ?? '—',
          status: e.status,
          joinDate: e.joinDate
            ? e.joinDate.slice(0, 10).split('-').join('/')
            : '—',
          branch: branchById.get(e.branchId) ?? '—',
        }))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // صور الموظفين — روابط blob بالتوكن، تُلغى عند إعادة التحميل أو التفريغ
  useEffect(() => {
    let active = true
    const created: string[] = []
    const withPhotos = employees.filter(
      (e) => e.photoFileId != null && !missingPhotoFileIds.has(e.photoFileId)
    )
    if (withPhotos.length === 0) {
      setPhotoUrls({})
      return
    }
    Promise.all(
      withPhotos.map(async (e) => {
        const fileId = e.photoFileId as number
        const url = await fetchFileObjectUrl(fileId)
        // ملف محذوف يرجع 404 في كل مرة — نتذكره فلا نعيد طلبه في هذه الجلسة
        if (!url) missingPhotoFileIds.add(fileId)
        return url ? ([e.id, url] as const) : null
      })
    ).then((pairs) => {
      if (!active) {
        pairs.forEach((p) => p && URL.revokeObjectURL(p[1]))
        return
      }
      const map: Record<number, string> = {}
      pairs.forEach((p) => {
        if (p) {
          map[p[0]] = p[1]
          created.push(p[1])
        }
      })
      setPhotoUrls(map)
    })
    return () => {
      active = false
      created.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [employees])

  const handleArchive = async (id: number) => {
    if (!window.confirm('هل تريد أرشفة هذا الموظف؟')) return
    // سبب اختياري — الإلغاء يوقف الأرشفة، والفراغ يُكمل بلا سبب
    const reason = window.prompt(`سبب الأرشفة (اختياري، حتى ${ARCHIVE_REASON_MAX} حرف)`)
    if (reason === null) return
    // عمود السبب بحد 300 حرف — الأطول يُرفض هنا برسالة واضحة بدل خطأ خادم عام
    const reasonIssue = archiveReasonIssue(reason)
    if (reasonIssue) {
      setError(reasonIssue)
      return
    }
    try {
      await archiveEmployee(id, reason.trim() || undefined)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذرت أرشفة الموظف')
    }
  }

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.includes(searchQuery) ||
      emp.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesDepartment =
      selectedDepartment === 'all' || emp.department === selectedDepartment

    const matchesStatus =
      selectedStatus === 'all' ||
      (selectedStatus === 'current'
        ? !FORMER_STATUSES.includes(emp.status)
        : emp.status === selectedStatus)

    return matchesSearch && matchesDepartment && matchesStatus
  })

  // تصدير الصفوف المعروضة (بعد البحث والفلاتر) إلى CSV
  const handleExport = () => {
    if (filteredEmployees.length === 0) return
    const statusLabel = new Map(STATUS_OPTIONS.map((s) => [s.value, s.label]))
    downloadCsv(
      `employees-${csvDateStamp()}.csv`,
      [
        'الرقم الوظيفي',
        'الاسم',
        'الاسم بالإنجليزية',
        'البريد الإلكتروني',
        'الجوال',
        'القسم',
        'المسمى الوظيفي',
        'الفرع',
        'تاريخ التعيين',
        'الحالة',
      ],
      filteredEmployees.map((e) => [
        e.employeeId,
        e.name,
        e.nameEn,
        e.email,
        e.phone,
        e.department,
        e.jobTitle,
        e.branch,
        e.joinDate,
        statusLabel.get(e.status) ?? e.status,
      ])
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">قائمة الموظفين</h1>
            <p className="text-gray-500 mt-1">إدارة بيانات الموظفين في الشركة</p>
          </div>
          <div className="flex items-center gap-3">
            {/* التصدير من الصفوف المعروضة — الاستيراد الجماعي بلا endpoint فأُزيل زرّه */}
            <button
              onClick={handleExport}
              disabled={loading || filteredEmployees.length === 0}
              className="btn-secondary flex items-center gap-2 disabled:opacity-50"
            >
              <Download size={18} />
              تصدير CSV
            </button>
            {/* الإضافة/التعديل/الأرشفة بصلاحياتها في الباك — لا زرار ينتهي بـ403 */}
            {can('employees.create') && (
              <Link href="/employees/add" className="btn-primary flex items-center gap-2">
                <Plus size={18} />
                إضافة موظف
              </Link>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="بحث بالاسم، الرقم الوظيفي، البريد..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input pr-10"
                />
              </div>
            </div>

            {/* Department Filter */}
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="input w-48"
            >
              <option value="all">كل الأقسام</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.name}>
                  {dept.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="input w-44"
            >
              <option value="current">الموظفون الحاليون</option>
              <option value="all">كل الحالات</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                جدول
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                بطاقات
              </button>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>
        )}

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            عرض <span className="font-medium text-gray-700">{filteredEmployees.length}</span> من{' '}
            <span className="font-medium text-gray-700">{employees.length}</span> موظف
          </p>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : viewMode === 'table' ? (
          /* Table View */
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th className="text-right px-4 py-4">الموظف</th>
                    <th className="text-right px-4 py-4">الرقم الوظيفي</th>
                    <th className="text-right px-4 py-4">القسم</th>
                    <th className="text-right px-4 py-4">المسمى الوظيفي</th>
                    <th className="text-right px-4 py-4">الفرع</th>
                    <th className="text-right px-4 py-4">تاريخ التعيين</th>
                    <th className="text-right px-4 py-4">الحالة</th>
                    <th className="text-center px-4 py-4">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee) => (
                    <tr key={employee.id} className="table-row">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold overflow-hidden">
                            {photoUrls[employee.id] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={photoUrls[employee.id]} alt={employee.name} className="w-full h-full object-cover" />
                            ) : (
                              employee.avatar
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{employee.name}</p>
                            <p className="text-sm text-gray-400">{employee.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell font-mono text-primary-600">
                        {employee.employeeId}
                      </td>
                      <td className="table-cell">{employee.department}</td>
                      <td className="table-cell">{employee.jobTitle}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1.5">
                          <Building2 size={14} className="text-gray-400" />
                          {employee.branch}
                        </div>
                      </td>
                      <td className="table-cell text-gray-500">{employee.joinDate}</td>
                      <td className="table-cell">{getStatusBadge(employee.status)}</td>
                      <td className="table-cell">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            href={`/employees/${employee.id}`}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Eye size={18} className="text-gray-500" />
                          </Link>
                          {can('employees.edit') && (
                            <Link
                              href={`/employees/${employee.id}/edit`}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <Edit size={18} className="text-gray-500" />
                            </Link>
                          )}
                          {can('employees.archive') && (
                            <button
                              onClick={() => handleArchive(employee.id)}
                              title="أرشفة"
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <MoreVertical size={18} className="text-gray-500" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredEmployees.map((employee) => (
              <div key={employee.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl overflow-hidden">
                    {photoUrls[employee.id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoUrls[employee.id]} alt={employee.name} className="w-full h-full object-cover" />
                    ) : (
                      employee.avatar
                    )}
                  </div>
                  {getStatusBadge(employee.status)}
                </div>
                <h3 className="font-bold text-gray-800">{employee.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{employee.jobTitle}</p>
                <p className="text-xs text-primary-600 font-mono mt-1">{employee.employeeId}</p>

                <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Building2 size={14} />
                    <span>{employee.department} - {employee.branch}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Mail size={14} />
                    <span className="truncate">{employee.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Phone size={14} />
                    <span dir="ltr">{employee.phone}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <Link
                    href={`/employees/${employee.id}`}
                    className="flex-1 btn-secondary text-center text-sm py-2"
                  >
                    عرض
                  </Link>
                  {can('employees.edit') && (
                    <Link
                      href={`/employees/${employee.id}/edit`}
                      className="flex-1 btn-primary text-center text-sm py-2"
                    >
                      تعديل
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
