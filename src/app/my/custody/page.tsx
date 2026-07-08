'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Package,
} from 'lucide-react'
import { acknowledgeCustody, fetchMyCustody, type ApiCustody } from '@/lib/api'

// حالات العهدة من منظور الموظف
const statusLabels: Record<string, string> = {
  PENDING_ACK: 'بانتظار تأكيدك',
  PENDING_MANAGER_CONFIRM: 'أكدت الاستلام — بانتظار اعتماد مديرك',
  ACTIVE: 'نشطة',
  RETURNED: 'مُرجعة',
  RETURN_REQUESTED: 'طلب إرجاع',
  LOST: 'مفقودة',
  DAMAGED: 'تالفة',
}

const statusStyles: Record<string, string> = {
  PENDING_ACK: 'bg-indigo-100 text-indigo-700',
  PENDING_MANAGER_CONFIRM: 'bg-indigo-100 text-indigo-700',
  ACTIVE: 'bg-success-50 text-success-700',
  RETURNED: 'bg-gray-100 text-gray-600',
  RETURN_REQUESTED: 'bg-blue-100 text-blue-700',
  LOST: 'bg-red-100 text-red-700',
  DAMAGED: 'bg-orange-100 text-orange-700',
}

const fmtDate = (v?: string | null) => (v ? String(v).slice(0, 10) : '—')

export default function MyCustodyPage() {
  const [rows, setRows] = useState<ApiCustody[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ackingId, setAckingId] = useState<number | null>(null)

  const load = async () => {
    try {
      setRows(await fetchMyCustody())
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل عهدك')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleAcknowledge = async (id: number) => {
    setAckingId(id)
    setError('')
    try {
      await acknowledgeCustody(id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تأكيد الاستلام')
    } finally {
      setAckingId(null)
    }
  }

  const pendingCount = rows.filter((r) => r.status === 'PENDING_ACK').length
  const activeCount = rows.filter((r) => r.status === 'ACTIVE').length
  const returnedCount = rows.filter((r) => r.status === 'RETURNED').length

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">عهدي</h1>
            <p className="text-gray-500 mt-1">
              العهد المسلَّمة لك — العهدة تُفعَّل بعد تأكيدك استلامها
            </p>
          </div>
        </div>

        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {/* تنبيه العهد بانتظار التأكيد */}
        {pendingCount > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle size={20} className="text-indigo-500 shrink-0" />
            <p className="text-sm font-medium">
              لديك {pendingCount} عهدة بانتظار تأكيد الاستلام — أكِّد الاستلام لتفعيلها في سجلك
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Clock size={24} className="text-indigo-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">بانتظار تأكيدك</p>
              <p className="text-2xl font-bold text-indigo-600">{pendingCount}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-success-50 rounded-xl flex items-center justify-center">
              <Package size={24} className="text-success-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">عهد نشطة</p>
              <p className="text-2xl font-bold text-gray-800">{activeCount}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 size={24} className="text-gray-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">مُرجعة</p>
              <p className="text-2xl font-bold text-gray-800">{returnedCount}</p>
            </div>
          </div>
        </div>

        {/* Custody Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            {rows.length === 0 ? (
              <div className="p-12 text-center">
                <Package size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">لا توجد عهد مسجلة عليك</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="table-header">
                      <th className="text-right px-4 py-3">العهدة</th>
                      <th className="text-right px-4 py-3">الرقم التسلسلي</th>
                      <th className="text-center px-4 py-3">تاريخ التسليم</th>
                      <th className="text-center px-4 py-3">الحالة</th>
                      <th className="text-center px-4 py-3">إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const isPending = r.status === 'PENDING_ACK'
                      return (
                        <tr
                          key={r.id}
                          className={`table-row ${isPending ? 'bg-indigo-50/60' : ''}`}
                        >
                          <td className="table-cell">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                  isPending ? 'bg-indigo-100' : 'bg-gray-100'
                                }`}
                              >
                                <Package
                                  size={20}
                                  className={isPending ? 'text-indigo-500' : 'text-gray-500'}
                                />
                              </div>
                              <div>
                                <p className="font-medium text-gray-800 text-sm">
                                  {r.assetName ?? `أصل #${r.assetId}`}
                                </p>
                                {r.assetCategory && (
                                  <p className="text-xs text-gray-400">{r.assetCategory}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="table-cell text-sm font-mono text-gray-600" dir="ltr">
                            {r.serialNumber ?? '—'}
                          </td>
                          <td className="table-cell text-center text-sm text-gray-600" dir="ltr">
                            {fmtDate(r.assignedAt)}
                          </td>
                          <td className="table-cell text-center">
                            <span
                              className={`badge text-xs ${statusStyles[r.status] ?? 'bg-gray-100 text-gray-600'}`}
                            >
                              {statusLabels[r.status] ?? r.status}
                            </span>
                            {r.acknowledgedAt && (
                              <p className="text-[10px] text-indigo-500 mt-0.5">
                                أقررت بالاستلام: {fmtDate(r.acknowledgedAt)}
                              </p>
                            )}
                            {r.returnedAt && (
                              <p className="text-xs text-gray-400 mt-1">
                                أُرجعت: {fmtDate(r.returnedAt)}
                                {r.condition && ` — الحالة: ${r.condition}`}
                              </p>
                            )}
                          </td>
                          <td className="table-cell text-center">
                            {isPending ? (
                              <button
                                onClick={() => handleAcknowledge(r.id)}
                                disabled={ackingId === r.id}
                                className="btn-primary text-sm px-4 py-2 inline-flex items-center gap-2"
                              >
                                <CheckCircle2 size={16} />
                                {ackingId === r.id ? 'جارٍ التأكيد...' : 'تأكيد الاستلام'}
                              </button>
                            ) : (
                              <span className="text-gray-300 text-sm">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
