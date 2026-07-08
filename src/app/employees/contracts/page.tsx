'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import Link from 'next/link'
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
  fetchDocuments,
  fetchEmployees,
  fetchDepartments,
  updateDocument,
} from '@/lib/api'

// العقود تُدار كمستندات (docType يحتوي «عقد») في سجل المستندات
interface ContractRow {
  id: number
  employeeId: number
  employeeName: string
  employeeAvatar: string
  department: string
  jobTitle: string
  contractType: string
  startDate: string
  endDate: string
  status: 'active' | 'expiring' | 'expired'
  notes: string
}

const statusConfig = {
  active: { name: 'ساري', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  expiring: { name: 'ينتهي قريباً', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
  expired: { name: 'منتهي', color: 'bg-red-100 text-red-700', icon: Clock },
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<ContractRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [showRenewalModal, setShowRenewalModal] = useState(false)
  const [selectedContract, setSelectedContract] = useState<ContractRow | null>(null)
  const [renewForm, setRenewForm] = useState({
    startDate: '',
    endDate: '',
    notes: '',
  })

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [docs, emps, depts] = await Promise.all([
        fetchDocuments(),
        fetchEmployees(),
        fetchDepartments(),
      ])
      const empById = new Map(emps.map((e) => [e.id, e]))
      const deptById = new Map(depts.map((d) => [d.id, d.name]))
      const today = new Date().toISOString().slice(0, 10)
      const soon = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
      setContracts(
        docs
          .filter((d) => (d.docType ?? '').includes('عقد'))
          .map((d) => {
            const emp = empById.get(d.employeeId)
            const name = d.employeeName ?? emp?.fullName ?? `#${d.employeeId}`
            const end = d.expiryDate ? String(d.expiryDate).slice(0, 10) : ''
            const expired = d.expired ?? (!!end && end < today)
            return {
              id: d.id,
              employeeId: d.employeeId,
              employeeName: name,
              employeeAvatar: (name ?? '').trim().charAt(0) || 'م',
              department:
                emp?.departmentId != null
                  ? deptById.get(emp.departmentId) ?? '—'
                  : '—',
              jobTitle: emp?.jobTitle ?? '—',
              contractType: d.docType,
              startDate: d.issueDate ? String(d.issueDate).slice(0, 10) : '',
              endDate: end,
              status: expired
                ? ('expired' as const)
                : end && end <= soon
                ? ('expiring' as const)
                : ('active' as const),
              notes: d.notes ?? '',
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
      contract.contractType.includes(searchTerm)
    const matchesStatus = filterStatus === 'all' || contract.status === filterStatus
    const matchesType = filterType === 'all' || contract.contractType === filterType
    return matchesSearch && matchesStatus && matchesType
  })

  const stats = {
    total: contracts.length,
    active: contracts.filter((c) => c.status === 'active').length,
    expiring: contracts.filter((c) => c.status === 'expiring').length,
    expired: contracts.filter((c) => c.status === 'expired').length,
  }

  const getDaysUntilExpiry = (endDate?: string) => {
    if (!endDate) return null
    const end = new Date(endDate)
    const today = new Date()
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const openRenewal = (contract: ContractRow) => {
    setSelectedContract(contract)
    setRenewForm({
      startDate: contract.startDate,
      endDate: contract.endDate,
      notes: contract.notes,
    })
    setShowRenewalModal(true)
  }

  const handleRenew = async () => {
    if (!selectedContract) return
    setSaving(true)
    setError('')
    try {
      await updateDocument(selectedContract.id, {
        issueDate: renewForm.startDate || undefined,
        expiryDate: renewForm.endDate || undefined,
        notes: renewForm.notes || undefined,
      })
      setShowRenewalModal(false)
      setSelectedContract(null)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تجديد العقد')
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
            <h1 className="text-2xl font-bold text-gray-900">إدارة العقود</h1>
            <p className="text-gray-600 mt-1">
              متابعة عقود الموظفين وتجديدها — تُدار عبر سجل المستندات
            </p>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary flex items-center gap-2">
              <Download size={18} />
              تصدير
            </button>
            <Link
              href="/employees/documents"
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={18} />
              عقد جديد
            </Link>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>
        )}

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
                  يوجد {stats.expiring} عقود تنتهي خلال الـ 30 يوم القادمة وتحتاج لمراجعة
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
                placeholder="بحث بالاسم أو نوع العقد..."
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
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-right py-3 px-4 font-medium text-gray-700">الموظف</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">نوع العقد</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">تاريخ البداية</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">تاريخ الانتهاء</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">الحالة</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">ملاحظات</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredContracts.map((contract) => {
                const StatusIcon = statusConfig[contract.status].icon
                const daysUntilExpiry = getDaysUntilExpiry(contract.endDate)

                return (
                  <tr key={contract.id} className="hover:bg-gray-50">
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
                          <p className="text-sm text-gray-500">{contract.jobTitle}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <span className="badge bg-blue-100 text-blue-700">
                        {contract.contractType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {contract.startDate
                        ? new Date(contract.startDate).toLocaleDateString('ar-SA')
                        : '-'}
                    </td>
                    <td className="py-3 px-4">
                      {contract.endDate ? (
                        <div>
                          <p className="text-gray-600">
                            {new Date(contract.endDate).toLocaleDateString('ar-SA')}
                          </p>
                          {daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 30 && (
                            <p className="text-xs text-orange-600">
                              متبقي {daysUntilExpiry} يوم
                            </p>
                          )}
                          {daysUntilExpiry !== null && daysUntilExpiry <= 0 && (
                            <p className="text-xs text-red-600">منتهي</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`badge ${statusConfig[contract.status].color} inline-flex items-center gap-1`}>
                        <StatusIcon size={14} />
                        {statusConfig[contract.status].name}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {contract.notes ? (
                        <p className="text-sm text-gray-600 max-w-[200px] truncate">
                          {contract.notes}
                        </p>
                      ) : (
                        <span className="text-gray-400 text-center block">-</span>
                      )}
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
                        {(contract.status === 'expiring' || contract.status === 'expired') && (
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
                لا توجد بيانات عقود بعد — تُدار عبر المستندات (نوع مستند يحتوي «عقد»)
              </p>
            </div>
          )}
        </div>
        )}

        {/* Renewal Modal */}
        {showRenewalModal && selectedContract && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-lg">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">تجديد العقد</h2>
                  <button
                    onClick={() => setShowRenewalModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
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

                {/* Current Contract Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">تاريخ البداية الحالي</label>
                    <p className="font-medium text-gray-900">
                      {selectedContract.startDate
                        ? new Date(selectedContract.startDate).toLocaleDateString('ar-SA')
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">تاريخ الانتهاء الحالي</label>
                    <p className="font-medium text-gray-900">
                      {selectedContract.endDate
                        ? new Date(selectedContract.endDate).toLocaleDateString('ar-SA')
                        : '-'}
                    </p>
                  </div>
                </div>

                {/* New Contract Details */}
                <div className="pt-4 border-t space-y-4">
                  <h3 className="font-medium text-gray-900">تفاصيل التجديد</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        تاريخ البداية الجديد
                      </label>
                      <input
                        type="date"
                        className="input w-full"
                        value={renewForm.startDate}
                        onChange={(e) =>
                          setRenewForm({ ...renewForm, startDate: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        تاريخ الانتهاء الجديد
                      </label>
                      <input
                        type="date"
                        className="input w-full"
                        value={renewForm.endDate}
                        onChange={(e) =>
                          setRenewForm({ ...renewForm, endDate: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ملاحظات
                    </label>
                    <textarea
                      className="input w-full"
                      rows={3}
                      placeholder="أي ملاحظات إضافية..."
                      value={renewForm.notes}
                      onChange={(e) =>
                        setRenewForm({ ...renewForm, notes: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                <button
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
                  تجديد العقد
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
