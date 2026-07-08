'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import Link from 'next/link'
import {
  ArrowRight,
  Plus,
  Search,
  Package,
  CheckCircle2,
  Clock,
  RotateCcw,
  AlertTriangle,
  X,
  Wallet,
} from 'lucide-react'
import {
  fetchCustody,
  fetchAssets,
  fetchEmployees,
  fetchBranches,
  createAsset,
  assignCustody,
  returnCustody,
  ApiAsset,
  ApiEmployee,
  ApiBranch,
} from '@/lib/api'

// حالات العهدة كما في الباك إند
const statusLabels: Record<string, string> = {
  PENDING_ACK: 'بانتظار التأكيد',
  ACTIVE: 'نشطة',
  RETURNED: 'مُرجعة',
  RETURN_REQUESTED: 'طلب إرجاع',
  LOST: 'مفقودة',
  DAMAGED: 'تالفة',
}

const statusStyles: Record<string, string> = {
  PENDING_ACK: 'bg-indigo-100 text-indigo-700',
  ACTIVE: 'bg-success-50 text-success-700',
  RETURNED: 'bg-gray-100 text-gray-600',
  RETURN_REQUESTED: 'bg-blue-100 text-blue-700',
  LOST: 'bg-red-100 text-red-700',
  DAMAGED: 'bg-orange-100 text-orange-700',
}

interface CustodyRow {
  id: number
  employeeId: number
  employeeName: string
  employeeCode: string
  branchId: number | null
  branchName: string
  assetName: string
  assetCategory: string
  serialNumber: string
  assignedAt: string
  acknowledgedAt: string
  returnedAt: string
  condition: string
  status: string
}

const fmtDate = (v?: string | null) => (v ? String(v).slice(0, 10) : '')

export default function CustodyPage() {
  const [records, setRecords] = useState<CustodyRow[]>([])
  const [assets, setAssets] = useState<ApiAsset[]>([])
  const [employees, setEmployees] = useState<ApiEmployee[]>([])
  const [branches, setBranches] = useState<ApiBranch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterBranch, setFilterBranch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({ employeeId: '', assetId: '' })
  const [newAsset, setNewAsset] = useState({
    name: '',
    category: '',
    serialNumber: '',
  })

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [rows, assetRows, emps, brs] = await Promise.all([
        fetchCustody(),
        fetchAssets(),
        fetchEmployees(),
        fetchBranches(),
      ])
      const empById = new Map(emps.map((e) => [e.id, e]))
      const branchById = new Map(brs.map((b) => [b.id, b.name]))
      setAssets(assetRows)
      setEmployees(emps)
      setBranches(brs)
      setRecords(
        rows.map((r) => {
          const emp = empById.get(r.employeeId)
          return {
            id: r.id,
            employeeId: r.employeeId,
            employeeName: r.employeeName ?? emp?.fullName ?? `#${r.employeeId}`,
            employeeCode: r.employeeCode ?? emp?.employeeCode ?? '',
            branchId: emp?.branchId ?? null,
            branchName: emp ? branchById.get(emp.branchId) ?? '—' : '—',
            assetName: r.assetName ?? `#${r.assetId}`,
            assetCategory: r.assetCategory ?? '',
            serialNumber: r.serialNumber ?? '—',
            assignedAt: fmtDate(r.assignedAt),
            acknowledgedAt: fmtDate(r.acknowledgedAt),
            returnedAt: fmtDate(r.returnedAt),
            condition: r.condition ?? '',
            status: r.status,
          }
        })
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل سجل العهد')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = records.filter(
    (r) =>
      (r.employeeName.includes(searchQuery) ||
        r.assetName.includes(searchQuery) ||
        r.serialNumber.includes(searchQuery)) &&
      (!filterStatus || r.status === filterStatus) &&
      (!filterBranch || String(r.branchId) === filterBranch)
  )

  const stats = {
    active: records.filter((r) => r.status === 'ACTIVE').length,
    pending: records.filter(
      (r) => r.status === 'PENDING_ACK' || r.status === 'RETURN_REQUESTED'
    ).length,
    lostDamaged: records.filter(
      (r) => r.status === 'LOST' || r.status === 'DAMAGED'
    ).length,
    returned: records.filter((r) => r.status === 'RETURNED').length,
  }

  // الأصول غير المسلَّمة حالياً فقط
  const freeAssets = assets.filter((a) => !a.currentHolderId)

  const handleCreateAsset = async () => {
    if (!newAsset.name || !newAsset.category) return
    setSaving(true)
    setError('')
    try {
      const created = await createAsset({
        name: newAsset.name,
        category: newAsset.category,
        serialNumber: newAsset.serialNumber || undefined,
      })
      setAssets([...assets, created])
      setFormData({ ...formData, assetId: String(created.id) })
      setNewAsset({ name: '', category: '', serialNumber: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إنشاء الأصل')
    } finally {
      setSaving(false)
    }
  }

  const handleAssign = async () => {
    if (!formData.employeeId || !formData.assetId) return
    setSaving(true)
    setError('')
    try {
      await assignCustody(Number(formData.assetId), Number(formData.employeeId))
      setFormData({ employeeId: '', assetId: '' })
      setShowModal(false)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تسليم العهدة')
    } finally {
      setSaving(false)
    }
  }

  const handleReturn = async (id: number) => {
    const condition = window.prompt('حالة العهدة عند الإرجاع؟', 'سليمة')
    if (condition === null) return
    setError('')
    try {
      await returnCustody(id, condition || undefined)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إرجاع العهدة')
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/employees" className="hover:text-primary-600">
            إدارة الموظفين
          </Link>
          <ArrowRight size={16} />
          <span className="text-gray-800">سجل العهد</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">سجل العهد</h1>
            <p className="text-gray-500 mt-1">
              تسليم وإخلاء عهد الموظفين — التفعيل بعد إقرار الموظف بالاستلام
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            تسليم عهدة
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-success-50 rounded-xl flex items-center justify-center">
              <Package size={24} className="text-success-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">عهد نشطة</p>
              <p className="text-2xl font-bold text-gray-800">{stats.active}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-warning-50 rounded-xl flex items-center justify-center">
              <Clock size={24} className="text-warning-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">بانتظار إجراء</p>
              <p className="text-2xl font-bold text-warning-600">{stats.pending}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle size={24} className="text-red-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">مفقودة/تالفة</p>
              <p className="text-2xl font-bold text-red-600">{stats.lostDamaged}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <Wallet size={24} className="text-gray-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">عهد مُرجعة</p>
              <p className="text-2xl font-bold text-gray-800">{stats.returned}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="بحث بالموظف أو العهدة أو الرقم التسلسلي..."
                className="input pr-10 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input w-56"
            >
              <option value="">كل الحالات</option>
              {Object.entries(statusLabels).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="input w-56"
            >
              <option value="">كل الفروع</option>
              {branches.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
        /* Records Table */
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-right">
                <th className="py-3 px-4 text-sm font-medium text-gray-500">الموظف</th>
                <th className="py-3 px-4 text-sm font-medium text-gray-500">الفرع</th>
                <th className="py-3 px-4 text-sm font-medium text-gray-500">العهدة</th>
                <th className="py-3 px-4 text-sm font-medium text-gray-500">الرقم التسلسلي</th>
                <th className="py-3 px-4 text-sm font-medium text-gray-500">تاريخ التسليم</th>
                <th className="py-3 px-4 text-sm font-medium text-gray-500">الحالة</th>
                <th className="py-3 px-4 text-sm font-medium text-gray-500">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="py-3 px-4">
                    <p className="font-medium text-gray-800 text-sm">{r.employeeName}</p>
                    <p className="text-xs text-gray-400" dir="ltr">{r.employeeCode}</p>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {r.branchName}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-800">
                    {r.assetName}
                    {r.assetCategory && (
                      <p className="text-xs text-gray-400">{r.assetCategory}</p>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm font-mono text-gray-600" dir="ltr">
                    {r.serialNumber}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600" dir="ltr">
                    {r.assignedAt}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`badge text-xs ${statusStyles[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {statusLabels[r.status] ?? r.status}
                    </span>
                    {r.acknowledgedAt && (
                      <p className="text-[10px] text-indigo-500 mt-0.5">
                        أقرّ بالاستلام: {r.acknowledgedAt}
                      </p>
                    )}
                    {r.returnedAt && (
                      <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
                        أُرجعت: {r.returnedAt}
                        {r.condition && ` — الحالة: ${r.condition}`}
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {['PENDING_ACK', 'ACTIVE', 'RETURN_REQUESTED'].includes(r.status) && (
                        <button
                          onClick={() => handleReturn(r.id)}
                          className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 flex items-center gap-1"
                        >
                          <RotateCcw size={12} />
                          إرجاع
                        </button>
                      )}
                      {r.status === 'RETURNED' && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          مكتملة
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-12 text-center">
              <Package size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">لا توجد سجلات عهد مطابقة</p>
            </div>
          )}
        </div>
        )}

        {/* Assign Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">تسليم عهدة لموظف</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    تُفعَّل العهدة بعد إقرار الموظف بالاستلام
                  </p>
                </div>
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
                    الموظف *
                  </label>
                  <select
                    value={formData.employeeId}
                    onChange={(e) =>
                      setFormData({ ...formData, employeeId: e.target.value })
                    }
                    className="input w-full"
                  >
                    <option value="">— اختر الموظف —</option>
                    {employees
                      .filter((emp) => emp.status !== 'archived')
                      .map((emp) => (
                        <option key={emp.id} value={String(emp.id)}>
                          {emp.fullName} — {emp.jobTitle ?? emp.employeeCode}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الأصل *
                  </label>
                  <select
                    value={formData.assetId}
                    onChange={(e) =>
                      setFormData({ ...formData, assetId: e.target.value })
                    }
                    className="input w-full"
                  >
                    <option value="">— اختر أصلاً غير مسلَّم —</option>
                    {freeAssets.map((a) => (
                      <option key={a.id} value={String(a.id)}>
                        {a.name} ({a.category})
                        {a.serialNumber ? ` — ${a.serialNumber}` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    تظهر الأصول غير المسلَّمة لموظف حالياً فقط
                  </p>
                </div>

                {/* إنشاء أصل جديد */}
                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3">
                  <p className="text-sm font-medium text-gray-700">
                    أو أضف أصلاً جديداً للسجل
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        اسم الأصل
                      </label>
                      <input
                        type="text"
                        value={newAsset.name}
                        onChange={(e) =>
                          setNewAsset({ ...newAsset, name: e.target.value })
                        }
                        className="input w-full"
                        placeholder="لابتوب Dell Latitude"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الفئة
                      </label>
                      <input
                        type="text"
                        value={newAsset.category}
                        onChange={(e) =>
                          setNewAsset({ ...newAsset, category: e.target.value })
                        }
                        className="input w-full"
                        placeholder="لابتوب"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الرقم التسلسلي
                    </label>
                    <input
                      type="text"
                      value={newAsset.serialNumber}
                      onChange={(e) =>
                        setNewAsset({
                          ...newAsset,
                          serialNumber: e.target.value.toUpperCase(),
                        })
                      }
                      className="input w-full font-mono"
                      dir="ltr"
                      placeholder="LP-2026-012"
                    />
                  </div>
                  <button
                    onClick={handleCreateAsset}
                    className="btn-secondary"
                    disabled={saving || !newAsset.name || !newAsset.category}
                  >
                    إضافة الأصل
                  </button>
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="btn-secondary">
                  إلغاء
                </button>
                <button
                  onClick={handleAssign}
                  className="btn-primary"
                  disabled={saving || !formData.employeeId || !formData.assetId}
                >
                  تسليم العهدة
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
