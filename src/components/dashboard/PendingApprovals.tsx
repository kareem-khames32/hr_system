'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, X, Eye, Calendar, Clock, DollarSign, Package } from 'lucide-react'
import {
  fetchInbox,
  fetchRequestTypes,
  fetchEmployees,
  actOnRequest,
  type ApiRequest,
  type ApiRequestType,
  type ApiEmployee,
} from '@/lib/api'

// أيقونة حسب تصنيف نوع الطلب في الباك إند
const getCategoryIcon = (category?: string) => {
  if (!category) return <Calendar size={16} className="text-primary-500" />
  if (category.includes('leave')) return <Calendar size={16} className="text-primary-500" />
  if (category.includes('finance') || category.includes('loan'))
    return <DollarSign size={16} className="text-success-500" />
  if (category.includes('custody') || category.includes('asset'))
    return <Package size={16} className="text-warning-500" />
  if (category.includes('attendance') || category.includes('overtime'))
    return <Clock size={16} className="text-purple-500" />
  return <Calendar size={16} className="text-primary-500" />
}

// تلخيص حمولة الطلب (JSON) إلى سطر مقروء
const summarizePayload = (payload?: string): string => {
  if (!payload) return ''
  try {
    const obj = JSON.parse(payload) as Record<string, unknown>
    return Object.entries(obj)
      .filter(([, v]) => ['string', 'number', 'boolean'].includes(typeof v))
      .slice(0, 4)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' — ')
  } catch {
    return ''
  }
}

export default function PendingApprovals() {
  const [inbox, setInbox] = useState<ApiRequest[]>([])
  const [types, setTypes] = useState<ApiRequestType[]>([])
  const [employees, setEmployees] = useState<ApiEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actingId, setActingId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchInbox(), fetchRequestTypes(), fetchEmployees()])
      .then(([inboxData, typesData, employeesData]) => {
        if (cancelled) return
        setInbox(inboxData)
        setTypes(typesData)
        setEmployees(employeesData)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'تعذر تحميل الموافقات')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleAct = async (id: number, action: 'APPROVE' | 'REJECT') => {
    setActingId(id)
    setError('')
    try {
      await actOnRequest(id, action)
      setInbox(await fetchInbox())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تنفيذ الإجراء')
    } finally {
      setActingId(null)
    }
  }

  const visible = inbox.slice(0, 5)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-gray-800">طلبات في الانتظار</h3>
          <span className="bg-danger-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            {inbox.length}
          </span>
        </div>
        <Link
          href="/approvals-inbox"
          className="text-sm text-primary-500 hover:text-primary-600 font-medium"
        >
          عرض الكل
        </Link>
      </div>

      {error && <div className="bg-red-50 text-red-700 rounded-xl p-4 mb-4">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="p-4 bg-gray-50 rounded-xl text-center text-sm text-gray-500">
          لا توجد موافقات معلقة
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((req) => {
            const type = types.find((t) => t.code === req.typeCode)
            const employee = employees.find((e) => e.id === req.requesterId)
            const name = employee?.fullName ?? `موظف #${req.requesterId}`
            const details = summarizePayload(req.payload)
            const date = (req.submittedAt ?? req.createdAt).slice(0, 10)
            return (
              <div
                key={req.id}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                {/* Avatar */}
                <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {name.charAt(0)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-800">{name}</p>
                    <span className="badge badge-primary flex items-center gap-1">
                      {getCategoryIcon(type?.category)}
                      {type?.nameAr ?? req.typeCode}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {employee?.jobTitle ?? employee?.employeeCode ?? ''}
                  </p>
                  {details && <p className="text-sm text-gray-600 mt-1" dir="ltr">{details}</p>}
                  <p className="text-xs text-gray-400 mt-1" dir="ltr">{date}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link
                    href="/approvals-inbox"
                    className="p-2 bg-white rounded-lg hover:bg-gray-200 transition-colors border border-gray-200"
                  >
                    <Eye size={18} className="text-gray-500" />
                  </Link>
                  <button
                    onClick={() => handleAct(req.id, 'APPROVE')}
                    disabled={actingId === req.id}
                    className="p-2 bg-success-500 rounded-lg hover:bg-success-600 transition-colors text-white disabled:opacity-50"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    onClick={() => handleAct(req.id, 'REJECT')}
                    disabled={actingId === req.id}
                    className="p-2 bg-danger-500 rounded-lg hover:bg-danger-600 transition-colors text-white disabled:opacity-50"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
