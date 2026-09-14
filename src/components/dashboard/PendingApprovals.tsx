'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, X, Eye, Calendar, Clock, DollarSign, Package } from 'lucide-react'
import {
  fetchInbox,
  fetchRequestTypes,
  actOnRequest,
  type ApiRequest,
  type ApiRequestType,
} from '@/lib/api'
// ملخّص الحمولة بكل مفاتيحها وتسمياتها — نفس صندوق الموافقات، فالاعتماد من هنا لا يخفي مفتاحاً (SEC-REQ-2)
import RequestPayload from '@/components/RequestPayload'
import { payloadSummary } from '@/lib/request-payload'

// صف الصندوق كما يرجعه السيرفر: اسم مقدّم الطلب ضمن الحمولة (بلا نداء /employees)
type InboxRow = ApiRequest & {
  requesterName?: string
  requesterCode?: string
  requesterJobTitle?: string
}

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

export default function PendingApprovals() {
  const [inbox, setInbox] = useState<InboxRow[]>([])
  const [types, setTypes] = useState<ApiRequestType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [decision, setDecision] = useState<{ request: InboxRow; action: 'APPROVE' | 'REJECT' } | null>(null)
  const [decisionReason, setDecisionReason] = useState('')
  const [actingId, setActingId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    // الصندوق هو الأساس؛ أنواع الطلبات مساعدة فقط — فشلها يعرض الكود بدل الاسم ولا يُسقط الويدجت
    Promise.allSettled([fetchInbox(), fetchRequestTypes()])
      .then(([inboxRes, typesRes]) => {
        if (cancelled) return
        if (inboxRes.status === 'fulfilled') setInbox(inboxRes.value)
        else
          setError(
            inboxRes.reason instanceof Error ? inboxRes.reason.message : 'تعذر تحميل الموافقات'
          )
        if (typesRes.status === 'fulfilled') setTypes(typesRes.value)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleAct = async (id: number, action: 'APPROVE' | 'REJECT') => {
    const request = inbox.find(row => row.id === id)
    if (request && requiresDetailedReview(request)) {
      window.location.assign(`/approvals-inbox?request=${id}`)
      return
    }
    if (action === 'REJECT' && !decisionReason.trim()) return
    setActingId(id)
    setError('')
    try {
      await actOnRequest(id, action, decisionReason.trim() || undefined)
      setDecision(null)
      setDecisionReason('')
      setInbox(await fetchInbox())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تنفيذ الإجراء')
    } finally {
      setActingId(null)
    }
  }

  const visible = inbox.slice(0, 5)
  // الإضافي يحتاج الأدلة المحفوظة؛ عند تعذر معرفة النوع نفتح التفاصيل أيضًا.
  const requiresDetailedReview = (request: InboxRow) => {
    const type = types.find(row => row.code === (request.definitionCode ?? request.typeCode))
    return !type || ['OVERTIME', 'OVERTIME_AUTO'].includes(request.typeCode) || request.overtimeReviewRequired === true ||
      !!request.overtime || ['overtime_entries', 'overtime_auto'].includes(type.destinationHandler)
  }

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
            const name = req.requesterName ?? `موظف #${req.requesterId}`
            const details = payloadSummary(req.payload)
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
                    {req.requesterJobTitle ?? req.requesterCode ?? ''}
                  </p>
                  {/* كل المفاتيح بلا قصّ — المعتمد يرى كل ما سيعتمده قبل زر الاعتماد */}
                  {details && <p className="text-sm text-gray-600 mt-1 break-words">{details}</p>}
                  <p className="text-xs text-gray-400 mt-1" dir="ltr">{date}</p>
                </div>

                {/* إجراءات الطلب؛ مراجعة الإضافي من صندوق الموافقات */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link
                    href={`/approvals-inbox?request=${req.id}`}
                    aria-label={`مراجعة الطلب ${req.id}`}
                    className="p-2 bg-white rounded-lg hover:bg-gray-200 transition-colors border border-gray-200 inline-flex items-center gap-2 text-sm"
                  >
                    <Eye size={18} className="text-gray-500" />
                    {requiresDetailedReview(req) && <span>مراجعة الطلب</span>}
                  </Link>
                  {!requiresDetailedReview(req) && <><button
                    onClick={() => { setDecision({ request: req, action: 'APPROVE' }); setDecisionReason(''); setError('') }}
                    disabled={actingId === req.id}
                    className="p-2 bg-success-500 rounded-lg hover:bg-success-600 transition-colors text-white disabled:opacity-50"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    onClick={() => { setDecision({ request: req, action: 'REJECT' }); setDecisionReason(''); setError('') }}
                    disabled={actingId === req.id}
                    className="p-2 bg-danger-500 rounded-lg hover:bg-danger-600 transition-colors text-white disabled:opacity-50"
                  >
                    <X size={18} />
                  </button></>}
                </div>
              </div>
            )
          })}
        </div>
      )}
      {decision && !requiresDetailedReview(decision.request) && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="مراجعة القرار">
        <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
          <h3 className="text-lg font-bold">{decision.action === 'APPROVE' ? 'تأكيد اعتماد الطلب' : 'تأكيد رفض الطلب'} #{decision.request.id}</h3>
          <RequestPayload payload={decision.request.payload} />
          {error && <p role="alert" className="text-red-700">{error}</p>}
          <label className="block text-sm">{decision.action === 'REJECT' ? 'سبب الرفض (مطلوب)' : 'ملاحظة (اختياري)'}<textarea rows={3} value={decisionReason} onChange={event => setDecisionReason(event.target.value)} className="input w-full mt-2" /></label>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setDecision(null)} disabled={actingId !== null} className="btn-secondary">إلغاء</button><button type="button" onClick={() => handleAct(decision.request.id, decision.action)} disabled={actingId !== null || (decision.action === 'REJECT' && !decisionReason.trim())} className="btn-primary">{actingId !== null ? 'جارٍ التنفيذ...' : 'تأكيد القرار'}</button></div>
        </div>
      </div>}
    </div>
  )
}
