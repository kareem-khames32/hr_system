'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Plus,
  Search,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ClipboardList,
  ChevronLeft,
  X,
  Send,
  User,
  Users,
} from 'lucide-react'

// أنواع الطلبات المتاحة للموظف الحالي — حسب جمهور كل نوع في «بانِي الطلبات»
const availableRequestTypes = [
  { id: 'rt1', name: 'طلب إجازة', description: 'إجازة من الرصيد المتاح', audience: 'كل الموظفين' },
  { id: 'rt2', name: 'طلب استقالة', description: 'يمر بالمدير ثم HR ثم الإدارة', audience: 'كل الموظفين' },
  { id: 'rt3', name: 'طلب تغيير بيانات', description: 'يُطبَّق بعد اعتماد HR', audience: 'كل الموظفين' },
  { id: 'rt5', name: 'طلب سلفة', description: 'تُخصم على أقساط من الراتب', audience: 'قسمك' },
  { id: 'rt7', name: 'طلب شهادة تعريف بالراتب', description: 'خطاب موجّه للبنك أو السفارة', audience: 'كل الموظفين' },
]

type RequestStatus = 'pending' | 'approved' | 'rejected' | 'returned'

interface MyRequest {
  id: string
  type: string
  submittedAt: string
  status: RequestStatus
  // سلسلة الاعتماد وخطوتها الحالية
  steps: { name: string; state: 'done' | 'current' | 'waiting' | 'rejected' }[]
  details: string
}

const initialRequests: MyRequest[] = [
  {
    id: 'REQ-1042',
    type: 'طلب إجازة سنوية',
    submittedAt: '2026-07-05',
    status: 'pending',
    steps: [
      { name: 'المدير المباشر', state: 'current' },
      { name: 'مدير الموارد البشرية', state: 'waiting' },
    ],
    details: '5 أيام — من 12 يوليو إلى 16 يوليو',
  },
  {
    id: 'REQ-1029',
    type: 'طلب تغيير بيانات',
    submittedAt: '2026-07-01',
    status: 'approved',
    steps: [{ name: 'مدير الموارد البشرية', state: 'done' }],
    details: 'تحديث رقم الجوال',
  },
  {
    id: 'REQ-1017',
    type: 'طلب عمل إضافي',
    submittedAt: '2026-06-28',
    status: 'rejected',
    steps: [
      { name: 'المدير المباشر', state: 'done' },
      { name: 'مدير الموارد البشرية', state: 'rejected' },
    ],
    details: '3 ساعات يوم 27 يونيو — رُفض: لا يوجد تكليف مسبق',
  },
  {
    id: 'REQ-1003',
    type: 'طلب سلفة',
    submittedAt: '2026-06-15',
    status: 'returned',
    steps: [
      { name: 'المدير المباشر', state: 'done' },
      { name: 'مدير الموارد البشرية', state: 'current' },
    ],
    details: 'أُعيد لاستكمال البيانات: أرفق كشف الالتزامات',
  },
]

const statusLabels: Record<RequestStatus, string> = {
  pending: 'قيد الاعتماد',
  approved: 'معتمد',
  rejected: 'مرفوض',
  returned: 'أُعيد إليك',
}

const statusStyles: Record<RequestStatus, string> = {
  pending: 'bg-warning-50 text-warning-700',
  approved: 'bg-success-50 text-success-700',
  rejected: 'bg-red-100 text-red-700',
  returned: 'bg-blue-100 text-blue-700',
}

const statusIcons: Record<RequestStatus, typeof Clock> = {
  pending: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
  returned: RotateCcw,
}

export default function MyRequestsPage() {
  const [requests, setRequests] = useState(initialRequests)
  const [filter, setFilter] = useState<'all' | RequestStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewModal, setShowNewModal] = useState(false)
  const [selectedType, setSelectedType] = useState('')
  const [requestNote, setRequestNote] = useState('')

  const filtered = requests.filter(
    (r) =>
      (filter === 'all' || r.status === filter) &&
      (r.type.includes(searchQuery) || r.id.includes(searchQuery))
  )

  const counts = {
    all: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
    returned: requests.filter((r) => r.status === 'returned').length,
  }

  const handleSubmit = () => {
    const type = availableRequestTypes.find((t) => t.id === selectedType)
    if (!type) return
    setRequests([
      {
        id: 'REQ-' + (1043 + requests.length),
        type: type.name,
        submittedAt: '2026-07-07',
        status: 'pending',
        steps: [
          { name: 'المدير المباشر', state: 'current' },
          { name: 'مدير الموارد البشرية', state: 'waiting' },
        ],
        details: requestNote || type.description,
      },
      ...requests,
    ])
    setSelectedType('')
    setRequestNote('')
    setShowNewModal(false)
  }

  const withdraw = (id: string) => {
    if (confirm('سحب الطلب؟ لن يظهر للمعتمدين بعد السحب.')) {
      setRequests(requests.filter((r) => r.id !== id))
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">طلباتي</h1>
            <p className="text-gray-500 mt-1">
              قدّم طلباتك وتابع حالتها وخطوة الاعتماد الحالية
            </p>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            طلب جديد
          </button>
        </div>

        {/* Status Filters */}
        <div className="flex gap-2 flex-wrap">
          {(
            [
              ['all', 'الكل'],
              ['pending', 'قيد الاعتماد'],
              ['approved', 'معتمد'],
              ['rejected', 'مرفوض'],
              ['returned', 'أُعيد إليّ'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                filter === id
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
              <span
                className={`mr-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                  filter === id ? 'bg-white/20' : 'bg-white'
                }`}
              >
                {counts[id]}
              </span>
            </button>
          ))}
          <div className="relative flex-1 max-w-xs mr-auto">
            <Search
              size={18}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="بحث برقم الطلب أو النوع..."
              className="input pr-10 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Requests List */}
        <div className="space-y-4">
          {filtered.map((req) => {
            const StatusIcon = statusIcons[req.status]
            return (
              <div key={req.id} className="card p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center ${statusStyles[req.status]}`}
                    >
                      <StatusIcon size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-bold text-gray-800">{req.type}</h3>
                        <span className={`badge text-xs ${statusStyles[req.status]}`}>
                          {statusLabels[req.status]}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{req.details}</p>
                      <p className="text-xs text-gray-400 mt-1" dir="ltr">
                        {req.id} • {req.submittedAt}
                      </p>
                    </div>
                  </div>
                  {req.status === 'pending' && (
                    <button
                      onClick={() => withdraw(req.id)}
                      className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-600"
                    >
                      سحب الطلب
                    </button>
                  )}
                  {req.status === 'returned' && (
                    <button className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">
                      استكمال وإعادة إرسال
                    </button>
                  )}
                </div>

                {/* سلسلة الاعتماد */}
                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-400">سلسلة الاعتماد:</span>
                  {req.steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                          step.state === 'done'
                            ? 'bg-success-50 text-success-700'
                            : step.state === 'current'
                            ? 'bg-warning-50 text-warning-700 ring-1 ring-warning-300'
                            : step.state === 'rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-50 text-gray-400'
                        }`}
                      >
                        {step.state === 'done' && <CheckCircle2 size={12} />}
                        {step.state === 'current' && <Clock size={12} />}
                        {step.state === 'rejected' && <XCircle size={12} />}
                        {step.name}
                        {step.state === 'current' && ' (الآن)'}
                      </div>
                      {i < req.steps.length - 1 && (
                        <ChevronLeft size={14} className="text-gray-300" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div className="card p-12 text-center">
              <ClipboardList size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">لا توجد طلبات مطابقة</p>
            </div>
          )}
        </div>

        {/* New Request Modal */}
        {showNewModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">تقديم طلب جديد</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    الطلبات الظاهرة لك حسب ما حدده المسؤول في «بانِي الطلبات»
                  </p>
                </div>
                <button
                  onClick={() => setShowNewModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  {availableRequestTypes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedType(t.id)}
                      className={`p-4 rounded-xl border-2 text-right transition-all flex items-center justify-between ${
                        selectedType === t.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <FileText
                          size={20}
                          className={
                            selectedType === t.id ? 'text-primary-600' : 'text-gray-400'
                          }
                        />
                        <div>
                          <p className="font-bold text-gray-800 text-sm">{t.name}</p>
                          <p className="text-xs text-gray-500">{t.description}</p>
                        </div>
                      </div>
                      <span className="flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                        {t.audience === 'كل الموظفين' ? (
                          <Users size={12} />
                        ) : (
                          <User size={12} />
                        )}
                        {t.audience}
                      </span>
                    </button>
                  ))}
                </div>

                {selectedType && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      تفاصيل الطلب
                    </label>
                    <textarea
                      value={requestNote}
                      onChange={(e) => setRequestNote(e.target.value)}
                      className="input w-full h-24 resize-none"
                      placeholder="اكتب تفاصيل طلبك... (حقول النموذج الكاملة تُبنى حسب نوع الطلب)"
                    />
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button onClick={() => setShowNewModal(false)} className="btn-secondary">
                  إلغاء
                </button>
                <button
                  onClick={handleSubmit}
                  className="btn-primary flex items-center gap-2"
                  disabled={!selectedType}
                >
                  <Send size={16} />
                  إرسال الطلب
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
