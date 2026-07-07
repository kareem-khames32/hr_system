'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Download,
  ClipboardList,
  ShieldAlert,
  EyeOff,
  FileText,
  ArrowLeft,
  Database,
  Clock,
} from 'lucide-react'
import {
  requestsCatalog,
  getTypeByCode,
  statusLabels,
  statusStyles,
  categoryLabels,
  type RequestStatus,
  type RequestCategory,
} from '@/data/requestsCatalog'
import { branches as branchOptions, getBranchName } from '@/data/branches'

// ===== سجل طلبات الشركة (mock — يصبح جدول requests في الباك) =====
interface CompanyRequest {
  id: string
  typeCode: string
  requesterName: string // يُخفى في السرّي
  department: string
  branchId: string
  submittedAt: string
  status: RequestStatus
  currentStep: string
  destinationRecord: string | null // مرجع السجل الدائم بعد التنفيذ
  effectiveDate?: string
}

const initialRequests: CompanyRequest[] = [
  {
    id: 'REQ-2026-1042',
    typeCode: 'LEAVE_ANNUAL',
    requesterName: 'أحمد محمد علي',
    department: 'تقنية المعلومات',
    branchId: '1',
    submittedAt: '2026-07-05',
    status: 'UNDER_REVIEW',
    currentStep: 'المدير المباشر (1 من 2)',
    destinationRecord: null,
  },
  {
    id: 'REQ-2026-1041',
    typeCode: 'OVERTIME',
    requesterName: 'ليلى حسن العتيبي',
    department: 'تقنية المعلومات',
    branchId: '3',
    submittedAt: '2026-07-06',
    status: 'APPROVED',
    currentStep: 'بانتظار مطابقة البصمة',
    destinationRecord: null,
  },
  {
    id: 'REQ-2026-1038',
    typeCode: 'LOAN',
    requesterName: 'خالد عبدالعزيز النمر',
    department: 'المالية',
    branchId: '1',
    submittedAt: '2026-07-03',
    status: 'COMPLETED',
    currentStep: 'منتهي',
    destinationRecord: 'سجل السلف: LN-2026-014 (6 أقساط تبدأ أغسطس)',
  },
  {
    id: 'REQ-2026-1035',
    typeCode: 'TEAM_TRANSFER',
    requesterName: 'عمر ياسر الشهري',
    department: 'المبيعات',
    branchId: '2',
    submittedAt: '2026-07-01',
    status: 'IN_EXECUTION',
    currentStep: 'مجدول للتنفيذ',
    destinationRecord: 'لوج النقل: TRF-2026-007',
    effectiveDate: '2026-08-01',
  },
  {
    id: 'REQ-2026-1033',
    typeCode: 'BANK_ACCOUNT_CHANGE',
    requesterName: 'سارة أحمد الزهراني',
    department: 'الموارد البشرية',
    branchId: '1',
    submittedAt: '2026-06-30',
    status: 'UNDER_REVIEW',
    currentStep: 'التحقق الأمني (اتصال هاتفي + مطابقة IBAN)',
    destinationRecord: null,
  },
  {
    id: 'REQ-2026-1031',
    typeCode: 'GRIEVANCE',
    requesterName: '(سرّي)',
    department: '(سرّي)',
    branchId: '2',
    submittedAt: '2026-06-29',
    status: 'UNDER_REVIEW',
    currentStep: 'HR مباشرة — تخطّى المدير',
    destinationRecord: null,
  },
  {
    id: 'REQ-2026-1029',
    typeCode: 'LETTER_SALARY',
    requesterName: 'نورة سعيد الغامدي',
    department: 'التسويق',
    branchId: '2',
    submittedAt: '2026-06-28',
    status: 'COMPLETED',
    currentStep: 'منتهي',
    destinationRecord: 'PDF مولّد: DOC-2026-118 (تعريف راتب — بنك الراجحي)',
  },
  {
    id: 'REQ-2026-1027',
    typeCode: 'CUSTODY_REQUEST',
    requesterName: 'محمود سامي رضوان',
    department: 'المبيعات',
    branchId: '2',
    submittedAt: '2026-06-27',
    status: 'IN_EXECUTION',
    currentStep: 'بانتظار تأكيد استلام الموظف',
    destinationRecord: 'سجل العهد: CUS-2031 (لابتوب)',
  },
  {
    id: 'REQ-2026-1025',
    typeCode: 'PUNCH_CORRECTION',
    requesterName: 'فاطمة علي الزهراني',
    department: 'المحاسبة',
    branchId: '1',
    submittedAt: '2026-06-26',
    status: 'COMPLETED',
    currentStep: 'منتهي',
    destinationRecord: 'سجل الحضور: تصحيح انصراف 25 يونيو',
  },
  {
    id: 'REQ-2026-1022',
    typeCode: 'SALARY_INCREASE',
    requesterName: 'أحمد محمد علي',
    department: 'تقنية المعلومات',
    branchId: '1',
    submittedAt: '2026-06-24',
    status: 'REJECTED',
    currentStep: 'رُفض عند: المدير التنفيذي (الزيادة ≥ العتبة)',
    destinationRecord: null,
  },
  {
    id: 'REQ-2026-1020',
    typeCode: 'LEAVE_SICK',
    requesterName: 'ريم سعود الدوسري',
    department: 'تقنية المعلومات',
    branchId: '1',
    submittedAt: '2026-06-23',
    status: 'RETURNED_FOR_INFO',
    currentStep: 'مُرجَع: التقرير الطبي غير مرفق',
    destinationRecord: null,
  },
  {
    id: 'REQ-2026-1018',
    typeCode: 'PERSONAL_DATA_UPDATE',
    requesterName: 'عمر سالم الحربي',
    department: 'التسويق',
    branchId: '2',
    submittedAt: '2026-06-22',
    status: 'CANCELLED',
    currentStep: 'ألغاه مقدّمه',
    destinationRecord: null,
  },
]

export default function RequestsConsolePage() {
  const [requests] = useState(initialRequests)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<'' | RequestCategory>('')
  const [filterStatus, setFilterStatus] = useState<'' | RequestStatus>('')
  const [filterBranch, setFilterBranch] = useState('')

  const filtered = requests.filter((r) => {
    const type = getTypeByCode(r.typeCode)
    return (
      (r.id.includes(searchQuery) ||
        r.requesterName.includes(searchQuery) ||
        (type?.nameAr ?? '').includes(searchQuery)) &&
      (!filterCategory || type?.category === filterCategory) &&
      (!filterStatus || r.status === filterStatus) &&
      (!filterBranch || r.branchId === filterBranch)
    )
  })

  const counts = {
    total: requests.length,
    open: requests.filter((r) =>
      ['SUBMITTED', 'UNDER_REVIEW', 'RETURNED_FOR_INFO'].includes(r.status)
    ).length,
    executing: requests.filter((r) =>
      ['APPROVED', 'IN_EXECUTION'].includes(r.status)
    ).length,
    completed: requests.filter((r) => r.status === 'COMPLETED').length,
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">لوحة الطلبات — Requests Console</h1>
            <p className="text-gray-500 mt-1">
              الشاشة الأم: كل طلبات الشركة بدورة حياتها الكاملة — وكل طلب معتمَد له وجهة (سجل دائم)
            </p>
          </div>
          <button className="btn-secondary flex items-center gap-2">
            <Download size={18} />
            تصدير
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
              <ClipboardList size={24} className="text-primary-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي الطلبات</p>
              <p className="text-2xl font-bold text-gray-800">{counts.total}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-warning-50 rounded-xl flex items-center justify-center">
              <Clock size={24} className="text-warning-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">مفتوحة (مُقدَّم/مراجعة/مُرجَع)</p>
              <p className="text-2xl font-bold text-warning-600">{counts.open}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
              <ArrowLeft size={24} className="text-cyan-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">موافَق/قيد التنفيذ</p>
              <p className="text-2xl font-bold text-cyan-600">{counts.executing}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-success-50 rounded-xl flex items-center justify-center">
              <Database size={24} className="text-success-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">مكتملة (كُتبت في وجهتها)</p>
              <p className="text-2xl font-bold text-success-600">{counts.completed}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[220px]">
              <Search
                size={18}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="بحث برقم الطلب / الموظف / النوع..."
                className="input pr-10 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as '' | RequestCategory)}
              className="input w-48"
            >
              <option value="">كل الفئات (9)</option>
              {Object.entries(categoryLabels).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as '' | RequestStatus)}
              className="input w-52"
            >
              <option value="">كل الحالات (9)</option>
              {Object.entries(statusLabels).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="input w-48"
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

        {/* Requests Table */}
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="text-right px-4 py-3">الطلب</th>
                  <th className="text-right px-4 py-3">مقدّمه</th>
                  <th className="text-center px-4 py-3">الفرع</th>
                  <th className="text-center px-4 py-3">التقديم</th>
                  <th className="text-center px-4 py-3">الحالة</th>
                  <th className="text-right px-4 py-3">الخطوة الحالية</th>
                  <th className="text-right px-4 py-3">الوجهة (السجل الدائم)</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((req) => {
                  const type = getTypeByCode(req.typeCode)
                  if (!type) return null
                  return (
                    <tr key={req.id} className="table-row">
                      <td className="table-cell">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-gray-800 text-sm">{type.nameAr}</p>
                          {type.securityRoute && (
                            <span className="badge text-[10px] bg-red-100 text-red-700 flex items-center gap-0.5">
                              <ShieldAlert size={10} />
                              مسار أمني
                            </span>
                          )}
                          {type.confidential && (
                            <span className="badge text-[10px] bg-gray-800 text-white flex items-center gap-0.5">
                              <EyeOff size={10} />
                              سرّي
                            </span>
                          )}
                          {type.autoGeneratesPdf && (
                            <span className="badge text-[10px] bg-teal-50 text-teal-700 flex items-center gap-0.5">
                              <FileText size={10} />
                              PDF آلي
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5" dir="ltr">
                          {req.id} • {type.code}
                        </p>
                        <span className="text-[10px] text-indigo-500">
                          {categoryLabels[type.category]}
                        </span>
                      </td>
                      <td className="table-cell">
                        <p
                          className={`text-sm ${
                            type.confidential ? 'text-gray-400 italic' : 'text-gray-700'
                          }`}
                        >
                          {req.requesterName}
                        </p>
                        <p className="text-xs text-gray-400">{req.department}</p>
                      </td>
                      <td className="table-cell text-center text-xs text-gray-500">
                        {getBranchName(req.branchId)}
                      </td>
                      <td className="table-cell text-center text-xs font-mono text-gray-500" dir="ltr">
                        {req.submittedAt}
                      </td>
                      <td className="table-cell text-center">
                        <span className={`badge text-xs ${statusStyles[req.status]}`}>
                          {statusLabels[req.status]}
                        </span>
                        {req.effectiveDate && (
                          <p className="text-[10px] text-cyan-600 mt-1">
                            تاريخ السريان: {req.effectiveDate}
                          </p>
                        )}
                      </td>
                      <td className="table-cell text-sm text-gray-600">{req.currentStep}</td>
                      <td className="table-cell">
                        {req.destinationRecord ? (
                          <div className="flex items-start gap-1.5">
                            <Database size={14} className="text-success-500 mt-0.5 shrink-0" />
                            <p className="text-xs text-success-700">{req.destinationRecord}</p>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400">
                            → {type.destination}
                            <span className="block text-[10px] text-gray-300">
                              (يُكتب عند الاكتمال)
                            </span>
                          </p>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="p-12 text-center">
              <ClipboardList size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">لا توجد طلبات مطابقة</p>
            </div>
          )}
        </div>

        {/* كتالوج الأنواع */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800 text-sm">
              كتالوج الأنواع المُعرَّفة ({requestsCatalog.length} نوعاً في 9 فئات — Data-Driven)
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="badge text-[10px] bg-primary-50 text-primary-700">P1 أساسي</span>
              <span className="badge text-[10px] bg-warning-50 text-warning-700">P2 مهم</span>
              <span className="badge text-[10px] bg-gray-100 text-gray-500">P3 متقدم</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(categoryLabels).map(([catId, catLabel]) => {
              const types = requestsCatalog.filter((t) => t.category === catId)
              return (
                <div key={catId} className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-sm font-bold text-gray-700 mb-2">
                    {catLabel} <span className="text-gray-400 font-normal">({types.length})</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {types.map((t) => (
                      <span
                        key={t.code}
                        className={`text-[11px] px-2 py-0.5 rounded-lg ${
                          t.phase === 'P1'
                            ? 'bg-primary-50 text-primary-700'
                            : t.phase === 'P2'
                            ? 'bg-warning-50 text-warning-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                        title={`${t.code} → ${t.destination}`}
                      >
                        {t.nameAr}
                        {t.byLaw && ' ⚖️'}
                        {t.securityRoute && ' 🔒'}
                        {t.confidential && ' 🤫'}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
