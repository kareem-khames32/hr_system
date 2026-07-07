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
  Users,
  EyeOff,
} from 'lucide-react'
import {
  requestsCatalog,
  statusLabels,
  statusStyles,
  categoryLabels,
  type RequestStatus,
} from '@/data/requestsCatalog'

// الأنواع المتاحة للموظف — من الكتالوج الموحّد (data-driven)
// المرحلة P1 التي يقدّمها الموظف، مجمّعة بالفئات التسع
const availableRequestTypes = requestsCatalog.filter(
  (t) => t.phase === 'P1' && t.submitter.includes('E')
)

interface MyRequest {
  id: string
  type: string
  typeCode: string
  submittedAt: string
  status: RequestStatus
  // سلسلة الاعتماد وخطوتها الحالية
  steps: { name: string; state: 'done' | 'current' | 'waiting' | 'rejected' }[]
  details: string
  destinationRecord?: string // مرجع الوجهة بعد الاكتمال
}

const initialRequests: MyRequest[] = [
  {
    id: 'REQ-1042',
    type: 'إجازة سنوية',
    typeCode: 'LEAVE_ANNUAL',
    submittedAt: '2026-07-05',
    status: 'UNDER_REVIEW',
    steps: [
      { name: 'المدير المباشر', state: 'current' },
      { name: 'مدير الموارد البشرية', state: 'waiting' },
    ],
    details: '5 أيام — من 12 يوليو إلى 16 يوليو',
  },
  {
    id: 'REQ-1036',
    type: 'تعريف راتب',
    typeCode: 'LETTER_SALARY',
    submittedAt: '2026-07-03',
    status: 'IN_EXECUTION',
    steps: [{ name: 'HR', state: 'done' }],
    details: 'موجّه لبنك الراجحي — جارٍ توليد الـ PDF',
  },
  {
    id: 'REQ-1029',
    type: 'تحديث بيانات شخصية',
    typeCode: 'PERSONAL_DATA_UPDATE',
    submittedAt: '2026-07-01',
    status: 'COMPLETED',
    steps: [{ name: 'HR (تحقق)', state: 'done' }],
    details: 'تحديث رقم الجوال',
    destinationRecord: 'سجل الموظف — حُدِّث في 2 يوليو',
  },
  {
    id: 'REQ-1017',
    type: 'عمل إضافي',
    typeCode: 'OVERTIME',
    submittedAt: '2026-06-28',
    status: 'REJECTED',
    steps: [
      { name: 'المدير المباشر', state: 'done' },
      { name: 'مدير الموارد البشرية', state: 'rejected' },
    ],
    details: '3 ساعات يوم 27 يونيو — رُفض: لا يوجد تكليف مسبق',
  },
  {
    id: 'REQ-1003',
    type: 'سلفة',
    typeCode: 'LOAN',
    submittedAt: '2026-06-15',
    status: 'RETURNED_FOR_INFO',
    steps: [
      { name: 'المدير المباشر', state: 'done' },
      { name: 'مدير الموارد البشرية', state: 'current' },
    ],
    details: 'أُعيد لاستكمال البيانات: أرفق كشف الالتزامات',
  },
]

const statusIcons: Partial<Record<RequestStatus, typeof Clock>> = {
  SUBMITTED: Send,
  UNDER_REVIEW: Clock,
  APPROVED: CheckCircle2,
  IN_EXECUTION: RotateCcw,
  COMPLETED: CheckCircle2,
  REJECTED: XCircle,
  RETURNED_FOR_INFO: RotateCcw,
  DRAFT: FileText,
  CANCELLED: XCircle,
}

export default function MyRequestsPage() {
  const [requests, setRequests] = useState(initialRequests)
  const [filter, setFilter] = useState<'all' | RequestStatus>('all')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewModal, setShowNewModal] = useState(false)
  const [selectedType, setSelectedType] = useState('')
  const [requestNote, setRequestNote] = useState('')

  const filtered = requests.filter(
    (r) =>
      (filter === 'all' ||
        (filter === 'IN_EXECUTION'
          ? ['APPROVED', 'IN_EXECUTION'].includes(r.status)
          : r.status === filter)) &&
      (r.type.includes(searchQuery) || r.id.includes(searchQuery))
  )

  const counts: Record<string, number> = {
    all: requests.length,
    UNDER_REVIEW: requests.filter((r) => r.status === 'UNDER_REVIEW').length,
    IN_EXECUTION: requests.filter((r) => ['APPROVED', 'IN_EXECUTION'].includes(r.status)).length,
    COMPLETED: requests.filter((r) => r.status === 'COMPLETED').length,
    REJECTED: requests.filter((r) => r.status === 'REJECTED').length,
    RETURNED_FOR_INFO: requests.filter((r) => r.status === 'RETURNED_FOR_INFO').length,
  }

  const handleSubmit = () => {
    const type = availableRequestTypes.find((t) => t.code === selectedType)
    if (!type) return
    setRequests([
      {
        id: 'REQ-' + (1043 + requests.length),
        type: type.nameAr,
        typeCode: type.code,
        submittedAt: '2026-07-07',
        status: 'SUBMITTED',
        steps: [
          { name: 'المدير المباشر', state: 'current' },
          { name: 'مدير الموارد البشرية', state: 'waiting' },
        ],
        details: requestNote || type.destination,
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
              ['UNDER_REVIEW', 'قيد المراجعة'],
              ['IN_EXECUTION', 'قيد التنفيذ'],
              ['COMPLETED', 'مكتمل'],
              ['REJECTED', 'مرفوض'],
              ['RETURNED_FOR_INFO', 'مُرجَع إليّ'],
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
                {counts[id] ?? 0}
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
            const StatusIcon = statusIcons[req.status] ?? Clock
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
                      {req.destinationRecord && (
                        <p className="text-xs text-success-600 mt-1">
                          ✓ الوجهة: {req.destinationRecord}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1" dir="ltr">
                        {req.id} • {req.submittedAt}
                      </p>
                    </div>
                  </div>
                  {['SUBMITTED', 'UNDER_REVIEW'].includes(req.status) && (
                    <button
                      onClick={() => withdraw(req.id)}
                      className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-600"
                    >
                      سحب الطلب
                    </button>
                  )}
                  {req.status === 'RETURNED_FOR_INFO' && (
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
                {/* فئات الكتالوج */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedCategory('')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                      !selectedCategory ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    الكل
                  </button>
                  {Object.entries(categoryLabels).map(([catId, catLabel]) => {
                    const count = availableRequestTypes.filter((t) => t.category === catId).length
                    if (!count) return null
                    return (
                      <button
                        key={catId}
                        onClick={() => setSelectedCategory(selectedCategory === catId ? '' : catId)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                          selectedCategory === catId
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {catLabel} ({count})
                      </button>
                    )
                  })}
                </div>

                <div className="grid grid-cols-1 gap-3 max-h-80 overflow-y-auto">
                  {availableRequestTypes
                    .filter((t) => !selectedCategory || t.category === selectedCategory)
                    .map((t) => (
                      <button
                        key={t.code}
                        onClick={() => setSelectedType(t.code)}
                        className={`p-4 rounded-xl border-2 text-right transition-all flex items-center justify-between ${
                          selectedType === t.code
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <FileText
                            size={20}
                            className={
                              selectedType === t.code ? 'text-primary-600' : 'text-gray-400'
                            }
                          />
                          <div>
                            <p className="font-bold text-gray-800 text-sm">
                              {t.nameAr}
                              {t.autoGeneratesPdf && (
                                <span className="mr-2 badge text-[10px] bg-teal-50 text-teal-700">PDF آلي</span>
                              )}
                              {t.confidential && (
                                <span className="mr-2 badge text-[10px] bg-gray-800 text-white">
                                  <EyeOff size={9} className="inline ml-0.5" />
                                  سرّي
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500">
                              السلسلة: {t.approvalChain} • الوجهة: {t.destination}
                            </p>
                          </div>
                        </div>
                        <span className="flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg whitespace-nowrap">
                          <Users size={12} />
                          {categoryLabels[t.category]}
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
