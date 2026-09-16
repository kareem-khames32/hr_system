'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import Link from 'next/link'
import { csvDateStamp, downloadCsv } from '@/lib/csv'
import {
  FileSignature,
  Search,
  Filter,
  Plus,
  Eye,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Bell,
  X,
} from 'lucide-react'
import {
  can,
  fetchEmployees,
  fetchDepartments,
  renewEmployeeContract,
  uploadFile,
  ApiEmployee,
} from '@/lib/api'

// حقول العقد على كيان الموظف (ليست بعد ضمن ApiEmployee)
type ContractFields = {
  contractType?: string | null
  contractStart?: string | null
  contractEnd?: string | null
  contractNumber?: string | null
  contractDurationMonths?: number | null
  noticePeriodDays?: number | null
}

const CONTRACT_TYPE_AR: Record<string, string> = {
  permanent: 'دائم',
  fixed_term: 'محدد المدة',
  part_time: 'دوام جزئي',
  seasonal: 'موسمي',
}

interface ContractRow {
  employeeId: number
  employeeName: string
  employeeCode: string
  employeeAvatar: string
  department: string
  jobTitle: string
  contractNumber: string
  contractType: string
  startDate: string
  endDate: string
  // المدة المحفوظة بالأشهر (تُعرض أولاً قبل الاشتقاق من التاريخين)
  durationMonths: number | null
  // فترة الإشعار المحفوظة بالأيام
  noticePeriodDays: number | null
  daysLeft: number | null
  status: 'active' | 'expiring' | 'expired' | 'unlimited'
  canRenew: boolean
}

const statusConfig = {
  active: { name: 'ساري', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  expiring: { name: 'ينتهي قريباً', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
  expired: { name: 'منتهي', color: 'bg-red-100 text-red-700', icon: Clock },
  unlimited: { name: 'غير محدد المدة', color: 'bg-blue-100 text-blue-700', icon: FileSignature },
}

// عدد الأيام المتبقية حتى تاريخ معيّن مقارنةً باليوم (سالب = انتهى)
const daysUntil = (date?: string) => {
  if (!date) return null
  const end = new Date(date)
  const today = new Date(new Date().toISOString().slice(0, 10))
  return Math.round((end.getTime() - today.getTime()) / 86400000)
}

// أشهر العقد المكتملة مع احتساب آخر يوم ضمن مدة العقد.
const monthsBetween = (start?: string, end?: string) => {
  if (!start || !end) return null
  const s = new Date(`${start}T12:00:00`)
  const e = new Date(`${end}T12:00:00`)
  e.setDate(e.getDate() + 1)
  let months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth())
  if (e.getDate() < s.getDate()) months -= 1
  return months
}

// مدة العقد بين البداية والنهاية بصيغة مقروءة — احتياطي عند غياب المدة المحفوظة
const durationText = (start?: string, end?: string) => {
  if (!end) return 'غير محددة'
  if (!start) return '—'
  const s = new Date(start)
  const e = new Date(end)
  const months = monthsBetween(start, end) as number
  if (months <= 0) {
    const days = Math.max(0, Math.round((e.getTime() - s.getTime()) / 86400000) + 1)
    return `${days} يوم`
  }
  const years = Math.floor(months / 12)
  const rem = months % 12
  if (years > 0 && rem > 0) return `${years} سنة و${rem} شهر`
  if (years > 0) return `${years} سنة`
  return `${months} شهر`
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<ContractRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [renewError, setRenewError] = useState('')
  const [renewFile, setRenewFile] = useState<File | null>(null)
  const [renewFileRef, setRenewFileRef] = useState<string | undefined>()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [showRenewalModal, setShowRenewalModal] = useState(false)
  const [selectedContract, setSelectedContract] = useState<ContractRow | null>(null)
  const [renewForm, setRenewForm] = useState({
    startDate: '',
    endDate: '',
    reason: '',
  })

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [emps, depts] = await Promise.all([fetchEmployees(), fetchDepartments()])
      const deptById = new Map(depts.map((d) => [d.id, d.name]))
      setContracts(
        (emps as (ApiEmployee & ContractFields)[])
          .filter((e) => e.contractStart || e.contractEnd)
          .map((e) => {
            const start = e.contractStart ? String(e.contractStart).slice(0, 10) : ''
            const end = e.contractEnd ? String(e.contractEnd).slice(0, 10) : ''
            const daysLeft = end ? daysUntil(end) : null
            const status: ContractRow['status'] = !end
              ? 'unlimited'
              : (daysLeft as number) < 0
              ? 'expired'
              : (daysLeft as number) <= 60
              ? 'expiring'
              : 'active'
            const name = e.fullName ?? `#${e.id}`
            return {
              employeeId: e.id,
              employeeName: name,
              employeeCode: e.employeeCode,
              employeeAvatar: name.trim().charAt(0) || 'م',
              department:
                e.departmentId != null
                  ? deptById.get(e.departmentId) ?? '—'
                  : '—',
              jobTitle: e.jobTitle ?? '—',
              contractNumber: e.contractNumber ? String(e.contractNumber) : '',
              contractType: e.contractType
                ? CONTRACT_TYPE_AR[e.contractType] ?? e.contractType
                : '—',
              startDate: start,
              endDate: end,
              durationMonths: e.contractDurationMonths ?? null,
              noticePeriodDays: e.noticePeriodDays ?? null,
              daysLeft,
              status,
              canRenew: e.contractType !== 'permanent' && !['archived', 'terminated', 'resigned', 'retired'].includes(e.status ?? ''),
            }
          })
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل العقود')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const contractTypes = Array.from(new Set(contracts.map((c) => c.contractType)))

  const filteredContracts = contracts.filter((contract) => {
    const matchesSearch =
      contract.employeeName.includes(searchTerm) ||
      contract.employeeCode.includes(searchTerm) ||
      contract.contractNumber.includes(searchTerm) ||
      contract.contractType.includes(searchTerm)
    const matchesStatus = filterStatus === 'all' || contract.status === filterStatus
    const matchesType = filterType === 'all' || contract.contractType === filterType
    return matchesSearch && matchesStatus && matchesType
  })

  const stats = {
    total: contracts.length,
    active: contracts.filter((c) => c.status === 'active' || c.status === 'unlimited').length,
    expiring: contracts.filter((c) => c.status === 'expiring').length,
    expired: contracts.filter((c) => c.status === 'expired').length,
  }

  // تصدير الصفوف المعروضة (بعد البحث والفلاتر) إلى CSV
  const handleExport = () => {
    if (filteredContracts.length === 0) return
    downloadCsv(
      `contracts-${csvDateStamp()}.csv`,
      [
        'الرقم الوظيفي',
        'الموظف',
        'القسم',
        'المسمى الوظيفي',
        'رقم العقد',
        'نوع العقد',
        'تاريخ البداية',
        'تاريخ الانتهاء',
        'المدة',
        'فترة الإشعار (يوم)',
        'المتبقي (يوم)',
        'الحالة',
      ],
      filteredContracts.map((c) => [
        c.employeeCode,
        c.employeeName,
        c.department,
        c.jobTitle,
        c.contractNumber,
        c.contractType,
        c.startDate,
        c.endDate || 'غير محدد المدة',
        c.durationMonths != null
          ? `${c.durationMonths} شهر`
          : durationText(c.startDate, c.endDate),
        c.noticePeriodDays ?? '',
        c.daysLeft ?? '',
        statusConfig[c.status].name,
      ])
    )
  }

  const openRenewal = (contract: ContractRow) => {
    setSelectedContract(contract)
    const next = contract.endDate ? new Date(`${contract.endDate}T12:00:00Z`) : null
    if (next) next.setUTCDate(next.getUTCDate() + 1)
    setRenewForm({
      startDate: next ? next.toISOString().slice(0, 10) : '',
      endDate: '',
      reason: '',
    })
    setRenewFile(null)
    setRenewFileRef(undefined)
    setRenewError('')
    setShowRenewalModal(true)
  }

  // مدة العقد بعد التجديد — تُحفظ مع التجديد كي لا تبقى مدة قديمة معروضة
  const renewDurationMonths = selectedContract
    ? monthsBetween(renewForm.startDate || selectedContract.startDate, renewForm.endDate)
    : null

  const handleRenew = async () => {
    if (!selectedContract || saving) return
    if (!renewForm.startDate || !renewForm.endDate || renewForm.reason.trim().length < 3) {
      setRenewError('حدد بداية ونهاية التجديد وسبباً من 3 أحرف على الأقل')
      return
    }
    if (renewForm.endDate < renewForm.startDate || (selectedContract.endDate && renewForm.startDate <= selectedContract.endDate)) {
      setRenewError('يبدأ التجديد بعد نهاية العقد الحالي، وتكون نهايته بعد بدايته')
      return
    }
    if (renewFile && renewFile.size > 10 * 1024 * 1024) { setRenewError('حجم الملف لا يتجاوز 10 ميجابايت'); return }
    setSaving(true)
    setRenewError('')
    try {
      let fileRef = renewFileRef
      if (renewFile && !fileRef) {
        fileRef = (await uploadFile(renewFile, { entityType: 'contract' })).ref
        setRenewFileRef(fileRef)
      }
      await renewEmployeeContract(selectedContract.employeeId, {
        contractStart: renewForm.startDate, contractEnd: renewForm.endDate,
        reason: renewForm.reason.trim(), ...(fileRef ? { contractFileRef: fileRef } : {}),
      })
      setShowRenewalModal(false)
      setSelectedContract(null)
      await loadData()
      setNotice('جُدد العقد وحُفظت التواريخ السابقة والجديدة في السجل الوظيفي' + (fileRef ? ' وأُضيف المستند إلى ملف الموظف' : ''))
    } catch (err) {
      setRenewError(err instanceof Error ? err.message : 'تعذر تجديد العقد')
    } finally {
      setSaving(false)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">إدارة العقود</h1>
            <p className="text-gray-600 mt-1">
              متابعة عقود الموظفين وتجديدها من واقع ملفات الموظفين
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              disabled={loading || filteredContracts.length === 0}
              className="btn-secondary flex items-center gap-2 disabled:opacity-50"
            >
              <Download size={18} />
              تصدير CSV
            </button>
            {can('employees.create') && (
              <Link
                href="/employees/add"
                className="btn-primary flex items-center gap-2"
              >
                <Plus size={18} />
                عقد جديد
              </Link>
            )}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>
        )}
        {notice && <div role="status" className="bg-green-50 text-green-800 rounded-xl p-4">{notice}</div>}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">إجمالي العقود</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <FileSignature className="text-blue-600" size={24} />
              </div>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">عقود سارية</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.active}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="text-green-600" size={24} />
              </div>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">تنتهي قريباً</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{stats.expiring}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="text-orange-600" size={24} />
              </div>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">عقود منتهية</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{stats.expired}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <Clock className="text-red-600" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Expiring Soon Alert */}
        {stats.expiring > 0 && (
          <div className="card p-4 bg-orange-50 border-orange-200">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Bell className="text-orange-600" size={20} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-orange-800">تنبيه: عقود تنتهي قريباً</p>
                <p className="text-sm text-orange-600">
                  يوجد {stats.expiring} عقود تنتهي خلال الـ 60 يوم القادمة وتحتاج لمراجعة
                </p>
              </div>
              <button
                onClick={() => setFilterStatus('expiring')}
                className="btn-secondary text-sm"
              >
                عرض التفاصيل
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="card p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="بحث بالاسم أو الرقم الوظيفي أو رقم العقد أو نوع العقد..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pr-10 w-full"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input"
              >
                <option value="all">جميع الحالات</option>
                <option value="active">ساري</option>
                <option value="expiring">ينتهي قريباً</option>
                <option value="expired">منتهي</option>
                <option value="unlimited">غير محدد المدة</option>
              </select>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="input"
              >
                <option value="all">جميع الأنواع</option>
                {contractTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
        /* Contracts Table */
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-right py-3 px-4 font-medium text-gray-700">الموظف</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700 whitespace-nowrap">رقم العقد</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">نوع العقد</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700 whitespace-nowrap">تاريخ البداية</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700 whitespace-nowrap">تاريخ الانتهاء</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">المدة</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700 whitespace-nowrap">فترة الإشعار</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700 whitespace-nowrap">المتبقي (يوم)</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">الحالة</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredContracts.map((contract) => {
                const StatusIcon = statusConfig[contract.status].icon

                return (
                  <tr key={contract.employeeId} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <Link
                        href={`/employees/${contract.employeeId}`}
                        className="flex items-center gap-3 hover:text-primary-600"
                      >
                        <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600 font-bold">
                          {contract.employeeAvatar}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{contract.employeeName}</p>
                          <p className="text-sm text-gray-500 font-mono">{contract.employeeCode}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      {contract.contractNumber ? (
                        <span className="font-mono text-sm text-gray-700">{contract.contractNumber}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="badge bg-blue-100 text-blue-700">
                        {contract.contractType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                      {contract.startDate || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                      {contract.endDate || <span className="text-gray-400">غير محدد المدة</span>}
                    </td>
                    <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                      {/* المدة المحفوظة أولاً، والاشتقاق من التاريخين احتياطي */}
                      {contract.durationMonths != null
                        ? `${contract.durationMonths} شهر`
                        : durationText(contract.startDate, contract.endDate)}
                    </td>
                    <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                      {contract.noticePeriodDays != null ? (
                        `${contract.noticePeriodDays} يوم`
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {contract.daysLeft == null ? (
                        <span className="text-gray-400">-</span>
                      ) : contract.daysLeft < 0 ? (
                        <span className="text-red-600 font-medium">منتهي</span>
                      ) : contract.daysLeft <= 60 ? (
                        <span className="text-orange-600 font-medium">{contract.daysLeft} يوم</span>
                      ) : (
                        <span className="text-gray-600">{contract.daysLeft} يوم</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`badge ${statusConfig[contract.status].color} inline-flex items-center gap-1`}>
                        <StatusIcon size={14} />
                        {statusConfig[contract.status].name}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/employees/${contract.employeeId}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="عرض"
                        >
                          <Eye size={18} />
                        </Link>
                        {/* التجديد يحفظ على ملف الموظف (employees.edit) */}
                        {(contract.status === 'expiring' || contract.status === 'expired') &&
                          can('employees.edit') && contract.canRenew && (
                          <button
                            onClick={() => openRenewal(contract)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                            title="تجديد"
                          >
                            <RefreshCw size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filteredContracts.length === 0 && (
            <div className="text-center py-12">
              <FileSignature className="mx-auto text-gray-300 mb-4" size={48} />
              <p className="text-gray-500">
                لا توجد عقود بعد — تُسجَّل بيانات العقد من شاشة إضافة أو تعديل الموظف
              </p>
            </div>
          )}
        </div>
        )}

        {/* Renewal Modal */}
        {showRenewalModal && selectedContract && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">تجديد العقد</h2>
                  <button
                    disabled={saving}
                    onClick={() => setShowRenewalModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {renewError && <p role="alert" className="rounded-lg bg-red-50 text-red-700 p-3">{renewError}</p>}
                {/* Employee Info */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600 font-bold text-lg">
                    {selectedContract.employeeAvatar}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{selectedContract.employeeName}</p>
                    <p className="text-sm text-gray-500">
                      {selectedContract.jobTitle} - {selectedContract.department}
                    </p>
                  </div>
                </div>

                {/* Current Contract Info — القيم المحفوظة كما هي */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">رقم العقد</label>
                    <p className="font-medium text-gray-900 font-mono">
                      {selectedContract.contractNumber || '—'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">نوع العقد</label>
                    <p className="font-medium text-gray-900">
                      {selectedContract.contractType}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">تاريخ البداية الحالي</label>
                    <p className="font-medium text-gray-900">
                      {selectedContract.startDate || '—'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">تاريخ الانتهاء الحالي</label>
                    <p className="font-medium text-gray-900">
                      {selectedContract.endDate || '—'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">المدة الحالية</label>
                    <p className="font-medium text-gray-900">
                      {selectedContract.durationMonths != null
                        ? `${selectedContract.durationMonths} شهر`
                        : durationText(selectedContract.startDate, selectedContract.endDate)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">فترة الإشعار</label>
                    <p className="font-medium text-gray-900">
                      {selectedContract.noticePeriodDays != null
                        ? `${selectedContract.noticePeriodDays} يوم`
                        : '—'}
                    </p>
                  </div>
                </div>

                {/* New Contract Details */}
                <div className="pt-4 border-t space-y-4">
                  <h3 className="font-medium text-gray-900">تفاصيل التجديد</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="renew-start" className="block text-sm font-medium text-gray-700 mb-1">
                        تاريخ البداية الجديد
                      </label>
                      <input
                        id="renew-start"
                        disabled={saving}
                        type="date"
                        className="input w-full"
                        value={renewForm.startDate}
                        onChange={(e) =>
                          setRenewForm({ ...renewForm, startDate: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label htmlFor="renew-end" className="block text-sm font-medium text-gray-700 mb-1">
                        تاريخ الانتهاء الجديد
                      </label>
                      <input
                        id="renew-end"
                        disabled={saving}
                        type="date"
                        className="input w-full"
                        value={renewForm.endDate}
                        onChange={(e) =>
                          setRenewForm({ ...renewForm, endDate: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <p className="text-xs text-gray-500">
                    {renewDurationMonths != null && renewDurationMonths >= 0
                      ? `المدة بين التاريخين: ${renewDurationMonths} شهر؛ تُحفظ التواريخ كما حددتها`
                      : 'حدّد تاريخي البداية والانتهاء للعقد الجديد'}
                  </p>
                  <div>
                    <label htmlFor="renew-reason" className="block text-sm font-medium text-gray-700 mb-1">سبب التجديد</label>
                    <textarea id="renew-reason" className="input w-full" maxLength={250} rows={2} disabled={saving}
                      value={renewForm.reason} onChange={(e) => setRenewForm({ ...renewForm, reason: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="renew-document" className="block text-sm font-medium text-gray-700 mb-1">مستند العقد الجديد (اختياري)</label>
                    <input id="renew-document" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" disabled={saving}
                      onChange={(e) => { setRenewFile(e.target.files?.[0] ?? null); setRenewFileRef(undefined) }} className="w-full text-sm" />
                    <p className="text-xs text-gray-500 mt-1">حتى 10 ميجابايت. يُحفظ ضمن مستندات الموظف عند نجاح التجديد.</p>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                <button
                  disabled={saving}
                  onClick={() => setShowRenewalModal(false)}
                  className="btn-secondary"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleRenew}
                  className="btn-primary flex items-center gap-2"
                  disabled={saving}
                >
                  <RefreshCw size={18} />
                  {saving ? 'جارٍ حفظ التجديد…' : 'تجديد العقد'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
