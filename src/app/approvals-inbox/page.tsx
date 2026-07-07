'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Inbox,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  Calendar,
  Wallet,
  Package,
  FileText,
  UserMinus,
  AlertTriangle,
  ChevronLeft,
  X,
} from 'lucide-react'
import { getBranchName } from '@/data/branches'

type ItemType = 'leave' | 'loan' | 'custody' | 'resignation' | 'data_change' | 'overtime'

interface InboxItem {
  id: string
  type: ItemType
  title: string
  requester: string
  requesterId: string
  branchId: string
  submittedAt: string
  details: string
  myStepLevel: number
  totalSteps: number
  slaDaysLeft: number // المتبقي قبل انتهاء مهلة الرد
  amount?: number
}

const typeConfig: Record<
  ItemType,
  { label: string; icon: typeof Calendar; color: string }
> = {
  leave: { label: 'إجازة', icon: Calendar, color: 'bg-blue-100 text-blue-600' },
  loan: { label: 'سلفة', icon: Wallet, color: 'bg-purple-100 text-purple-600' },
  custody: { label: 'عهدة', icon: Package, color: 'bg-teal-100 text-teal-600' },
  resignation: { label: 'استقالة', icon: UserMinus, color: 'bg-red-100 text-red-600' },
  data_change: { label: 'تغيير بيانات', icon: FileText, color: 'bg-gray-100 text-gray-600' },
  overtime: { label: 'عمل إضافي', icon: Clock, color: 'bg-orange-100 text-orange-600' },
}

const initialItems: InboxItem[] = [
  {
    id: 'REQ-1042',
    type: 'leave',
    title: 'طلب إجازة سنوية — 5 أيام',
    requester: 'أحمد محمد علي',
    requesterId: 'EMP005',
    branchId: '1',
    submittedAt: '2026-07-05',
    details: 'من 12 يوليو إلى 16 يوليو — الرصيد المتبقي بعد الطلب: 8 أيام',
    myStepLevel: 1,
    totalSteps: 2,
    slaDaysLeft: 1,
  },
  {
    id: 'REQ-1044',
    type: 'resignation',
    title: 'طلب استقالة',
    requester: 'عمر ياسر الشهري',
    requesterId: 'EMP009',
    branchId: '2',
    submittedAt: '2026-07-06',
    details: 'آخر يوم عمل مطلوب: 6 أغسطس — فترة الإشعار 30 يوماً حسب العقد',
    myStepLevel: 1,
    totalSteps: 3,
    slaDaysLeft: 3,
  },
  {
    id: 'CUS-2031',
    type: 'custody',
    title: 'اعتماد تسليم عهدة — هاتف جوال',
    requester: 'نورة سعيد الغامدي',
    requesterId: 'EMP008',
    branchId: '2',
    submittedAt: '2026-07-06',
    details: 'PH-2025-021 بقيمة 2,000 ر.س — التسليم مشروط باعتمادك',
    myStepLevel: 1,
    totalSteps: 1,
    slaDaysLeft: 2,
  },
  {
    id: 'REQ-1045',
    type: 'overtime',
    title: 'عمل إضافي تلقائي — 2.5 ساعة',
    requester: 'ليلى حسن العتيبي',
    requesterId: 'EMP010',
    branchId: '3',
    submittedAt: '2026-07-07',
    details: 'تجاوزت نهاية ورديتها أمس — أُرسل تلقائياً حسب إعداد العتبة (> 1 ساعة). عند الاعتماد يُحتسب في مسير الرواتب',
    myStepLevel: 1,
    totalSteps: 2,
    slaDaysLeft: 2,
    amount: 187,
  },
  {
    id: 'REQ-1038',
    type: 'loan',
    title: 'طلب سلفة — 6,000 ر.س',
    requester: 'خالد عبدالعزيز النمر',
    requesterId: 'EMP007',
    branchId: '1',
    submittedAt: '2026-07-03',
    details: 'على 6 أقساط شهرية — لا توجد سلف قائمة',
    myStepLevel: 2,
    totalSteps: 3,
    slaDaysLeft: 0,
    amount: 6000,
  },
  {
    id: 'REQ-1040',
    type: 'data_change',
    title: 'تغيير بيانات — الحساب البنكي',
    requester: 'سارة أحمد الزهراني',
    requesterId: 'EMP006',
    branchId: '1',
    submittedAt: '2026-07-04',
    details: 'تحديث IBAN — مرفق: خطاب البنك ✓',
    myStepLevel: 1,
    totalSteps: 1,
    slaDaysLeft: 4,
  },
]

export default function ApprovalsInboxPage() {
  const [items, setItems] = useState(initialItems)
  const [filterType, setFilterType] = useState<'' | ItemType>('')
  const [actionModal, setActionModal] = useState<{
    item: InboxItem
    action: 'approve' | 'reject' | 'return'
  } | null>(null)
  const [comment, setComment] = useState('')
  const [history, setHistory] = useState<
    { id: string; title: string; action: string }[]
  >([])

  const filtered = items.filter((i) => !filterType || i.type === filterType)
  const overdue = items.filter((i) => i.slaDaysLeft <= 0).length

  const actionLabels = {
    approve: 'اعتماد',
    reject: 'رفض',
    return: 'إعادة للمقدّم',
  }

  const confirmAction = () => {
    if (!actionModal) return
    setItems(items.filter((i) => i.id !== actionModal.item.id))
    setHistory([
      {
        id: actionModal.item.id,
        title: actionModal.item.title,
        action:
          actionModal.action === 'approve'
            ? 'اعتمدت'
            : actionModal.action === 'reject'
            ? 'رفضت'
            : 'أعدت',
      },
      ...history,
    ])
    setComment('')
    setActionModal(null)
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">صندوق الموافقات</h1>
            <p className="text-gray-500 mt-1">
              كل ما ينتظر قرارك من كل أنواع الطلبات — في مكان واحد
            </p>
          </div>
          <div className="flex items-center gap-3">
            {overdue > 0 && (
              <span className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-xl text-sm font-medium">
                <AlertTriangle size={16} />
                {overdue} متجاوز للمهلة
              </span>
            )}
            <span className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-xl text-sm font-medium">
              <Inbox size={16} />
              {items.length} بانتظارك
            </span>
          </div>
        </div>

        {/* Type Filters */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterType('')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              !filterType
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            الكل ({items.length})
          </button>
          {(Object.keys(typeConfig) as ItemType[]).map((t) => {
            const count = items.filter((i) => i.type === t).length
            if (!count) return null
            return (
              <button
                key={t}
                onClick={() => setFilterType(filterType === t ? '' : t)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  filterType === t
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {typeConfig[t].label} ({count})
              </button>
            )
          })}
        </div>

        {/* Items */}
        <div className="space-y-4">
          {filtered.map((item) => {
            const cfg = typeConfig[item.type]
            const Icon = cfg.icon
            return (
              <div
                key={item.id}
                className={`card p-5 ${
                  item.slaDaysLeft <= 0 ? 'border-2 border-red-200' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${cfg.color}`}
                    >
                      <Icon size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-800">{item.title}</h3>
                        <span className={`badge text-xs ${cfg.color}`}>{cfg.label}</span>
                        <span className="badge text-xs bg-indigo-100 text-indigo-700">
                          {getBranchName(item.branchId)}
                        </span>
                        {item.slaDaysLeft <= 0 ? (
                          <span className="badge text-xs bg-red-100 text-red-700">
                            متجاوز للمهلة!
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">
                            متبقي {item.slaDaysLeft} يوم للرد
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1.5">{item.details}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span>
                          مقدّم من: <span className="text-gray-600 font-medium">{item.requester}</span>
                        </span>
                        <span dir="ltr">{item.id}</span>
                        <span dir="ltr">{item.submittedAt}</span>
                        <span className="flex items-center gap-1">
                          خطوتك: {item.myStepLevel} من {item.totalSteps}
                          <ChevronLeft size={12} />
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setActionModal({ item, action: 'approve' })}
                      className="flex items-center gap-1.5 px-4 py-2 bg-success-500 text-white rounded-xl text-sm font-medium hover:bg-success-600"
                    >
                      <CheckCircle2 size={16} />
                      اعتماد
                    </button>
                    <button
                      onClick={() => setActionModal({ item, action: 'reject' })}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-medium hover:bg-red-100"
                    >
                      <XCircle size={16} />
                      رفض
                    </button>
                    <button
                      onClick={() => setActionModal({ item, action: 'return' })}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200"
                    >
                      <RotateCcw size={16} />
                      إعادة
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div className="card p-12 text-center">
              <CheckCircle2 size={48} className="mx-auto text-success-300 mb-4" />
              <h3 className="text-lg font-bold text-gray-800 mb-1">
                لا يوجد ما ينتظر قرارك 🎉
              </h3>
              <p className="text-gray-500">كل الطلبات تمت معالجتها</p>
            </div>
          )}
        </div>

        {/* آخر قراراتي */}
        {history.length > 0 && (
          <div className="card p-5">
            <h3 className="font-bold text-gray-800 mb-3 text-sm">آخر قراراتك في الجلسة</h3>
            <div className="space-y-2">
              {history.slice(0, 5).map((h, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircle2 size={14} className="text-gray-300" />
                  <span>
                    {h.action} «{h.title}»
                  </span>
                  <span className="text-xs text-gray-400" dir="ltr">
                    {h.id}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Modal */}
        {actionModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-800">
                  {actionLabels[actionModal.action]}: {actionModal.item.title}
                </h2>
                <button
                  onClick={() => setActionModal(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-600">
                  مقدّم من {actionModal.item.requester} —{' '}
                  {getBranchName(actionModal.item.branchId)}
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {actionModal.action === 'approve'
                      ? 'ملاحظة (اختياري)'
                      : 'السبب *'}
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="input w-full h-24 resize-none"
                    placeholder={
                      actionModal.action === 'approve'
                        ? 'أي ملاحظة تُسجَّل مع قرارك...'
                        : actionModal.action === 'reject'
                        ? 'اذكر سبب الرفض — يظهر للمقدّم'
                        : 'ما المطلوب استكماله من المقدّم؟'
                    }
                  />
                </div>
                {actionModal.action === 'approve' &&
                  actionModal.item.myStepLevel < actionModal.item.totalSteps && (
                    <p className="text-xs text-gray-400">
                      بعد اعتمادك سينتقل الطلب للخطوة{' '}
                      {actionModal.item.myStepLevel + 1} من{' '}
                      {actionModal.item.totalSteps}
                    </p>
                  )}
              </div>
              <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button onClick={() => setActionModal(null)} className="btn-secondary">
                  إلغاء
                </button>
                <button
                  onClick={confirmAction}
                  className={`px-5 py-2.5 rounded-xl text-white text-sm font-medium ${
                    actionModal.action === 'approve'
                      ? 'bg-success-500 hover:bg-success-600'
                      : actionModal.action === 'reject'
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-gray-500 hover:bg-gray-600'
                  }`}
                  disabled={actionModal.action !== 'approve' && !comment}
                >
                  تأكيد {actionLabels[actionModal.action]}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
