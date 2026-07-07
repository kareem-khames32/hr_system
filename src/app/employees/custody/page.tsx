'use client'

import { useState } from 'react'
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
import { employees } from '@/data/employees'
import { branches as branchOptions, getBranchName } from '@/data/branches'

type CustodyStatus =
  | 'pending_approval' // بانتظار اعتماد التسليم
  | 'pending_ack' // معتمدة — بانتظار تأكيد استلام الموظف (§7.3)
  | 'assigned' // مسلَّمة (الموظف أقرّ بالاستلام — سجل ملزِم)
  | 'return_pending' // بانتظار اعتماد الإخلاء
  | 'returned' // مُخلاة
  | 'lost' // مفقودة
  | 'damaged' // تالفة

interface CustodyRecord {
  id: string
  employeeId: string
  employeeName: string
  branchId: string
  assetType: string
  serialNumber: string
  assignedDate: string
  acknowledgedDate?: string // تاريخ إقرار الموظف بالاستلام — السجل الملزِم قانونياً
  returnedDate?: string
  status: CustodyStatus
  value: number
  notes?: string
}

const statusLabels: Record<CustodyStatus, string> = {
  pending_approval: 'بانتظار اعتماد التسليم',
  pending_ack: 'بانتظار تأكيد استلام الموظف',
  assigned: 'مسلَّمة',
  return_pending: 'بانتظار اعتماد الإخلاء',
  returned: 'مُخلاة',
  lost: 'مفقودة',
  damaged: 'تالفة',
}

const statusStyles: Record<CustodyStatus, string> = {
  pending_approval: 'bg-warning-50 text-warning-700',
  pending_ack: 'bg-indigo-100 text-indigo-700',
  assigned: 'bg-success-50 text-success-700',
  return_pending: 'bg-blue-100 text-blue-700',
  returned: 'bg-gray-100 text-gray-600',
  lost: 'bg-red-100 text-red-700',
  damaged: 'bg-orange-100 text-orange-700',
}

const assetTypeOptions = ['لابتوب', 'هاتف جوال', 'سيارة شركة', 'بطاقة دخول', 'مفاتيح مكتب']

const initialRecords: CustodyRecord[] = [
  {
    id: 'c1',
    employeeId: 'EMP005',
    employeeName: 'أحمد محمد علي',
    branchId: '1',
    assetType: 'لابتوب',
    serialNumber: 'LP-2024-001',
    assignedDate: '2024-03-15',
    acknowledgedDate: '2024-03-16',
    status: 'assigned',
    value: 4500,
  },
  {
    id: 'c2',
    employeeId: 'EMP005',
    employeeName: 'أحمد محمد علي',
    branchId: '1',
    assetType: 'بطاقة دخول',
    serialNumber: 'AC-101',
    assignedDate: '2024-03-15',
    acknowledgedDate: '2024-03-15',
    status: 'assigned',
    value: 100,
  },
  {
    id: 'c7',
    employeeId: 'EMP012',
    employeeName: 'محمود سامي رضوان',
    branchId: '2',
    assetType: 'لابتوب',
    serialNumber: 'LP-2026-012',
    assignedDate: '2026-07-06',
    status: 'pending_ack',
    value: 4800,
    notes: 'اعتمد المدير — لن تُفعَّل العهدة إلا بإقرار الموظف بالاستلام',
  },
  {
    id: 'c3',
    employeeId: 'EMP008',
    employeeName: 'نورة سعيد الغامدي',
    branchId: '2',
    assetType: 'هاتف جوال',
    serialNumber: 'PH-2025-021',
    assignedDate: '2025-01-10',
    status: 'pending_approval',
    value: 2000,
  },
  {
    id: 'c4',
    employeeId: 'EMP009',
    employeeName: 'عمر ياسر الشهري',
    branchId: '2',
    assetType: 'سيارة شركة',
    serialNumber: 'CAR-2024-003',
    assignedDate: '2024-06-01',
    status: 'return_pending',
    value: 0,
    notes: 'الموظف في فترة إشعار — إخلاء ضمن تصفية المستحقات',
  },
  {
    id: 'c5',
    employeeId: 'EMP010',
    employeeName: 'ليلى حسن العتيبي',
    branchId: '3',
    assetType: 'لابتوب',
    serialNumber: 'LP-2023-044',
    assignedDate: '2023-09-20',
    returnedDate: '2026-05-30',
    status: 'returned',
    value: 4500,
  },
  {
    id: 'c6',
    employeeId: 'EMP007',
    employeeName: 'خالد عبدالعزيز النمر',
    branchId: '1',
    assetType: 'هاتف جوال',
    serialNumber: 'PH-2024-008',
    assignedDate: '2024-02-01',
    status: 'lost',
    value: 2000,
    notes: 'سيُخصم من الراتب القادم حسب إعداد نوع العهدة',
  },
]

export default function CustodyPage() {
  const [records, setRecords] = useState(initialRecords)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterBranch, setFilterBranch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    employeeId: '',
    assetType: '',
    serialNumber: '',
    assignedDate: '',
    value: 0,
    requiresApproval: true,
  })

  const filtered = records.filter(
    (r) =>
      (r.employeeName.includes(searchQuery) ||
        r.assetType.includes(searchQuery) ||
        r.serialNumber.includes(searchQuery)) &&
      (!filterStatus || r.status === filterStatus) &&
      (!filterBranch || r.branchId === filterBranch)
  )

  const stats = {
    assigned: records.filter((r) => r.status === 'assigned').length,
    pending: records.filter(
      (r) => r.status === 'pending_approval' || r.status === 'return_pending'
    ).length,
    lostDamaged: records.filter((r) => r.status === 'lost' || r.status === 'damaged').length,
    deductions: records
      .filter((r) => r.status === 'lost' || r.status === 'damaged')
      .reduce((s, r) => s + r.value, 0),
  }

  const handleAssign = () => {
    const emp = employees.find((e) => e.id === formData.employeeId)
    if (!emp) return
    setRecords([
      {
        id: 'c' + Date.now(),
        employeeId: emp.id,
        employeeName: emp.name,
        branchId: emp.branchId,
        assetType: formData.assetType,
        serialNumber: formData.serialNumber,
        assignedDate: formData.assignedDate || '2026-07-07',
        status: formData.requiresApproval ? 'pending_approval' : 'assigned',
        value: formData.value,
      },
      ...records,
    ])
    setFormData({
      employeeId: '',
      assetType: '',
      serialNumber: '',
      assignedDate: '',
      value: 0,
      requiresApproval: true,
    })
    setShowModal(false)
  }

  const updateStatus = (id: string, status: CustodyStatus) => {
    setRecords(
      records.map((r) =>
        r.id === id
          ? {
              ...r,
              status,
              // إقرار الاستلام = السجل الملزِم قانونياً (acknowledged_at)
              acknowledgedDate:
                status === 'assigned' && !r.acknowledgedDate
                  ? '2026-07-07'
                  : r.acknowledgedDate,
              returnedDate: status === 'returned' ? '2026-07-07' : r.returnedDate,
            }
          : r
      )
    )
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
              تسليم وإخلاء عهد الموظفين — بدورة اعتماد حسب نوع العهدة
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

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-success-50 rounded-xl flex items-center justify-center">
              <Package size={24} className="text-success-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">عهد مسلَّمة</p>
              <p className="text-2xl font-bold text-gray-800">{stats.assigned}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-warning-50 rounded-xl flex items-center justify-center">
              <Clock size={24} className="text-warning-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">بانتظار اعتماد</p>
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
              <p className="text-sm text-gray-500">خصومات مستحقة</p>
              <p className="text-2xl font-bold text-gray-800">
                {stats.deductions.toLocaleString()} ر.س
              </p>
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
              {branchOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Records Table */}
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
                    <p className="text-xs text-gray-400" dir="ltr">{r.employeeId}</p>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {getBranchName(r.branchId)}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-800">{r.assetType}</td>
                  <td className="py-3 px-4 text-sm font-mono text-gray-600" dir="ltr">
                    {r.serialNumber}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600" dir="ltr">
                    {r.assignedDate}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`badge text-xs ${statusStyles[r.status]}`}>
                      {statusLabels[r.status]}
                    </span>
                    {r.acknowledgedDate && (
                      <p className="text-[10px] text-indigo-500 mt-0.5">
                        أقرّ بالاستلام: {r.acknowledgedDate}
                      </p>
                    )}
                    {r.notes && (
                      <p className="text-xs text-gray-400 mt-1 max-w-[200px]">{r.notes}</p>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {r.status === 'pending_approval' && (
                        <button
                          onClick={() => updateStatus(r.id, 'pending_ack')}
                          className="text-xs px-3 py-1.5 bg-success-50 text-success-700 rounded-lg hover:bg-success-100"
                        >
                          اعتماد التسليم
                        </button>
                      )}
                      {r.status === 'pending_ack' && (
                        <button
                          onClick={() => updateStatus(r.id, 'assigned')}
                          className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 font-medium"
                          title="إقرار: استلمت الصنف بالحالة الموصوفة — سجل ملزِم"
                        >
                          ✍️ تأكيد الاستلام (الموظف)
                        </button>
                      )}
                      {r.status === 'assigned' && (
                        <>
                          <button
                            onClick={() => updateStatus(r.id, 'return_pending')}
                            className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 flex items-center gap-1"
                          >
                            <RotateCcw size={12} />
                            طلب إخلاء
                          </button>
                          <button
                            onClick={() => updateStatus(r.id, 'lost')}
                            className="text-xs px-3 py-1.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100"
                          >
                            فقد/تلف
                          </button>
                        </>
                      )}
                      {r.status === 'return_pending' && (
                        <button
                          onClick={() => updateStatus(r.id, 'returned')}
                          className="text-xs px-3 py-1.5 bg-success-50 text-success-700 rounded-lg hover:bg-success-100 flex items-center gap-1"
                        >
                          <CheckCircle2 size={12} />
                          اعتماد الإخلاء
                        </button>
                      )}
                      {(r.status === 'lost' || r.status === 'damaged') && r.value > 0 && (
                        <span className="text-xs text-red-600">
                          خصم {r.value.toLocaleString()} ر.س
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

        {/* Assign Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">تسليم عهدة لموظف</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    حسب نوع العهدة قد يمر التسليم بدورة اعتماد قبل التفعيل
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
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} — {emp.position}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      نوع العهدة *
                    </label>
                    <select
                      value={formData.assetType}
                      onChange={(e) =>
                        setFormData({ ...formData, assetType: e.target.value })
                      }
                      className="input w-full"
                    >
                      <option value="">— اختر النوع —</option>
                      {assetTypeOptions.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                      الأنواع تُدار من إعدادات «أنواع العهد»
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الرقم التسلسلي *
                    </label>
                    <input
                      type="text"
                      value={formData.serialNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          serialNumber: e.target.value.toUpperCase(),
                        })
                      }
                      className="input w-full font-mono"
                      dir="ltr"
                      placeholder="LP-2026-012"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      تاريخ التسليم
                    </label>
                    <input
                      type="date"
                      value={formData.assignedDate}
                      onChange={(e) =>
                        setFormData({ ...formData, assignedDate: e.target.value })
                      }
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      القيمة (ر.س)
                    </label>
                    <input
                      type="number"
                      value={formData.value}
                      onChange={(e) =>
                        setFormData({ ...formData, value: Number(e.target.value) })
                      }
                      className="input w-full"
                      min="0"
                    />
                  </div>
                </div>
                <label className="flex items-center justify-between p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                  <span className="text-sm text-gray-700">
                    التسليم يتطلب اعتماداً (يظهر في صندوق موافقات المدير)
                  </span>
                  <input
                    type="checkbox"
                    checked={formData.requiresApproval}
                    onChange={(e) =>
                      setFormData({ ...formData, requiresApproval: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-gray-300 text-primary-600"
                  />
                </label>
              </div>
              <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="btn-secondary">
                  إلغاء
                </button>
                <button
                  onClick={handleAssign}
                  className="btn-primary"
                  disabled={
                    !formData.employeeId || !formData.assetType || !formData.serialNumber
                  }
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
