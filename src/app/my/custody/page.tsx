'use client'

import { custodyStatusLabels as statusLabels, custodyStatusStyles as statusStyles } from '@/lib/status-labels'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Package,
  Undo2,
} from 'lucide-react'
import {
  acknowledgeCustody,
  rejectCustody,
  fetchMyCustody,
  requestCustodyHandover,
  type ApiCustody,
} from '@/lib/api'

// حالات العهدة — التسميات الموحّدة في كل النظام


const fmtDate = (v?: string | null) => (v ? String(v).slice(0, 10) : '—')

export default function MyCustodyPage() {
  const [rows, setRows] = useState<ApiCustody[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ackingId, setAckingId] = useState<number | null>(null)
  const [rejecting, setRejecting] = useState<ApiCustody | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectBusy, setRejectBusy] = useState(false)

  const handleReject = async () => {
    if (!rejecting || rejectReason.trim().length < 3 || rejectReason.trim().length > 100) return
    setRejectBusy(true)
    setError('')
    try {
      await rejectCustody(rejecting.id, rejectReason.trim())
      setRejecting(null)
      setRejectReason('')
      await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر رفض الاستلام') }
    finally { setRejectBusy(false) }
  }

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

  // الموظف يعلّم «سلّمت العهدة» — التأكيد النهائي عند مسؤول العهد
  const [handoverId, setHandoverId] = useState<number | null>(null)
  const handleHandover = async (id: number) => {
    if (
      !window.confirm(
        'هتعلّم إنك سلّمت العهدة، ومسؤول العهد لازم يؤكد الاستلام. متأكد؟'
      )
    )
      return
    setHandoverId(id)
    setError('')
    try {
      await requestCustodyHandover(id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تسجيل تسليم العهدة')
    } finally {
      setHandoverId(null)
    }
  }

  const pendingCount = rows.filter((r) => r.status === 'PENDING_ACK').length
  const activeCount = rows.filter((r) => r.status === 'ACTIVE').length
  const returnedCount = rows.filter((r) => r.status === 'RETURNED').length
  const endedCount = rows.filter((r) => ['RETURNED', 'TRANSFERRED', 'REJECTED', 'LOST', 'DAMAGED'].includes(r.status)).length
  const lostCount = rows.filter((r) => r.status === 'LOST').length

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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
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
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 shrink-0 bg-slate-100 rounded-xl flex items-center justify-center">
              <CheckCircle2 size={24} className="text-slate-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">عهد منتهية</p>
              <p className="text-2xl font-bold text-gray-800">{endedCount}</p>
              <p className="text-[10px] text-gray-400 mt-1">مُرجعة أو منقولة أو مرفوضة أو مفقودة أو تالفة</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 shrink-0 bg-red-50 rounded-xl flex items-center justify-center">
              <AlertTriangle size={24} className="text-red-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">عهد مفقودة</p>
              <p className="text-2xl font-bold text-red-600">{lostCount}</p>
              <p className="text-[10px] text-gray-400 mt-1">ضمن إجمالي العهد المنتهية</p>
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
                              <div className="flex flex-wrap justify-center gap-2">
                              <button
                                onClick={() => handleAcknowledge(r.id)}
                                disabled={ackingId === r.id}
                                className="btn-primary text-sm px-4 py-2 inline-flex items-center gap-2"
                              >
                                <CheckCircle2 size={16} />
                                {ackingId === r.id ? 'جارٍ التأكيد...' : 'تأكيد الاستلام'}
                              </button>
                              <button type="button" onClick={() => { setRejecting(r); setRejectReason(''); setError('') }} disabled={ackingId === r.id} className="btn-secondary text-red-700 text-sm px-3 py-2">رفض الاستلام</button>
                              </div>
                            ) : r.status === 'ACTIVE' ? (
                              <button
                                onClick={() => handleHandover(r.id)}
                                disabled={handoverId === r.id}
                                className="btn-secondary text-sm px-4 py-2 inline-flex items-center gap-2"
                              >
                                <Undo2 size={16} />
                                {handoverId === r.id ? 'جارٍ التسجيل...' : 'تسليم العهدة'}
                              </button>
                            ) : r.status === 'RETURN_REQUESTED' ? (
                              <span className="text-xs text-indigo-600 inline-flex items-center gap-1">
                                <Clock size={14} />
                                بانتظار تأكيد مسؤول العهد
                              </span>
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
      {rejecting && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="رفض استلام العهدة">
        <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4">
          <h2 className="font-bold text-lg">رفض استلام {rejecting.assetName ?? `الأصل #${rejecting.assetId}`}</h2>
          <p className="text-sm text-gray-600">سجّل سبب عدم استلام العهدة ليُراجع مع المسؤول.</p>
          {error && <p role="alert" className="text-red-700">{error}</p>}
          <label className="block text-sm">سبب الرفض (3–100 حرف)<textarea value={rejectReason} onChange={event => setRejectReason(event.target.value)} minLength={3} maxLength={100} className="input mt-2 w-full" rows={3} /></label>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setRejecting(null)} disabled={rejectBusy} className="btn-secondary">إلغاء</button><button type="button" onClick={handleReject} disabled={rejectBusy || rejectReason.trim().length < 3} className="btn-primary">{rejectBusy ? 'جارٍ التسجيل...' : 'تأكيد رفض الاستلام'}</button></div>
        </div>
      </div>}
    </MainLayout>
  )
}
