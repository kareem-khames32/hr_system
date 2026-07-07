'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import Link from 'next/link'
import {
  ArrowRight,
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  XCircle,
  CalendarClock,
  AlertTriangle,
  Package,
  ChevronLeft,
  History,
} from 'lucide-react'
import { getBranchName } from '@/data/branches'

// ============================================================
// النقل بين الفرق (§7.2)
// السلسلة: المدير الحالي (إفراج) → المدير المستقبِل (استقبال) → HR
// بعد الموافقة النهائية → يُجدول لتاريخ السريان → التنفيذ آلي
// Guard: عهدة مفتوحة أو مهام معلّقة = تسليم قبل النقل
// ============================================================

type TransferStatus =
  | 'UNDER_REVIEW'
  | 'APPROVED_SCHEDULED' // معتمد ومجدول لتاريخ السريان
  | 'EXECUTED' // نُفِّذ آلياً في تاريخ السريان
  | 'REJECTED'
  | 'BLOCKED_GUARD' // موقوف — عهدة/مهام مفتوحة

interface TransferStep {
  role: string
  state: 'done' | 'current' | 'waiting' | 'rejected'
  actedBy?: string
}

interface Transfer {
  id: string
  employeeName: string
  employeeId: string
  fromTeam: string
  toTeam: string
  fromBranchId: string
  toBranchId: string
  effectiveDate: string
  status: TransferStatus
  steps: TransferStep[]
  guardIssues?: string[]
  executedAt?: string
}

const statusConfig: Record<TransferStatus, { label: string; className: string }> = {
  UNDER_REVIEW: { label: 'قيد المراجعة', className: 'bg-warning-50 text-warning-700' },
  APPROVED_SCHEDULED: { label: 'معتمد — مجدول للتنفيذ', className: 'bg-indigo-100 text-indigo-700' },
  EXECUTED: { label: 'نُفِّذ آلياً ✓', className: 'bg-success-50 text-success-700' },
  REJECTED: { label: 'مرفوض', className: 'bg-red-100 text-red-700' },
  BLOCKED_GUARD: { label: 'موقوف — تسليم مطلوب', className: 'bg-orange-100 text-orange-700' },
}

const initialTransfers: Transfer[] = [
  {
    id: 'TRF-2026-009',
    employeeName: 'أحمد محمد علي',
    employeeId: 'EMP005',
    fromTeam: 'فريق التطوير',
    toTeam: 'فريق الدعم الفني',
    fromBranchId: '1',
    toBranchId: '1',
    effectiveDate: '2026-08-01',
    status: 'UNDER_REVIEW',
    steps: [
      { role: 'المدير الحالي (إفراج)', state: 'done', actedBy: 'عبدالرحمن محمد' },
      { role: 'المدير المستقبِل (استقبال)', state: 'current' },
      { role: 'HR', state: 'waiting' },
    ],
  },
  {
    id: 'TRF-2026-008',
    employeeName: 'عمر ياسر الشهري',
    employeeId: 'EMP009',
    fromTeam: 'فريق المبيعات الميدانية',
    toTeam: 'فريق التسويق الرقمي',
    fromBranchId: '2',
    toBranchId: '2',
    effectiveDate: '2026-08-01',
    status: 'BLOCKED_GUARD',
    steps: [
      { role: 'المدير الحالي (إفراج)', state: 'done', actedBy: 'نورة الغامدي' },
      { role: 'المدير المستقبِل (استقبال)', state: 'done', actedBy: 'يوسف الغامدي' },
      { role: 'HR', state: 'done', actedBy: 'سارة الزهراني' },
    ],
    guardIssues: [
      'عهدة مفتوحة: سيارة شركة CAR-2024-003 (بانتظار اعتماد الإخلاء)',
      'مهمة مفتوحة: تسليم عملاء المنطقة الغربية',
    ],
  },
  {
    id: 'TRF-2026-007',
    employeeName: 'ليلى حسن العتيبي',
    employeeId: 'EMP010',
    fromTeam: 'فريق الدعم الفني',
    toTeam: 'فريق التطوير',
    fromBranchId: '3',
    toBranchId: '1',
    effectiveDate: '2026-07-15',
    status: 'APPROVED_SCHEDULED',
    steps: [
      { role: 'المدير الحالي (إفراج)', state: 'done', actedBy: 'خالد الشمري' },
      { role: 'المدير المستقبِل (استقبال)', state: 'done', actedBy: 'عبدالرحمن محمد' },
      { role: 'HR', state: 'done', actedBy: 'سارة الزهراني' },
    ],
  },
  {
    id: 'TRF-2026-005',
    employeeName: 'منى عبدالرحمن السالم',
    employeeId: 'EMP014',
    fromTeam: 'فريق المبيعات الميدانية',
    toTeam: 'فريق خدمة العملاء',
    fromBranchId: '2',
    toBranchId: '3',
    effectiveDate: '2026-06-01',
    status: 'EXECUTED',
    steps: [
      { role: 'المدير الحالي (إفراج)', state: 'done', actedBy: 'نورة الغامدي' },
      { role: 'المدير المستقبِل (استقبال)', state: 'done', actedBy: 'فاطمة الحربي' },
      { role: 'HR', state: 'done', actedBy: 'سارة الزهراني' },
    ],
    executedAt: '2026-06-01 00:05',
  },
  {
    id: 'TRF-2026-004',
    employeeName: 'خالد عبدالعزيز النمر',
    employeeId: 'EMP007',
    fromTeam: 'المالية',
    toTeam: 'فريق التطوير',
    fromBranchId: '1',
    toBranchId: '1',
    effectiveDate: '2026-05-15',
    status: 'REJECTED',
    steps: [
      { role: 'المدير الحالي (إفراج)', state: 'done', actedBy: 'فيصل الشمري' },
      { role: 'المدير المستقبِل (استقبال)', state: 'rejected', actedBy: 'عبدالرحمن محمد' },
      { role: 'HR', state: 'waiting' },
    ],
  },
]

export default function TransfersPage() {
  const [transfers] = useState(initialTransfers)
  const [filter, setFilter] = useState<'' | TransferStatus>('')

  const filtered = transfers.filter((t) => !filter || t.status === filter)

  const counts = {
    review: transfers.filter((t) => t.status === 'UNDER_REVIEW').length,
    scheduled: transfers.filter((t) => t.status === 'APPROVED_SCHEDULED').length,
    blocked: transfers.filter((t) => t.status === 'BLOCKED_GUARD').length,
    executed: transfers.filter((t) => t.status === 'EXECUTED').length,
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
          <span className="text-gray-800">لوج النقل</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">لوج النقل بين الفرق</h1>
            <p className="text-gray-500 mt-1">
              السلسلة: المدير الحالي ← المدير المستقبِل ← HR — والتنفيذ آلي بتاريخ السريان
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-warning-50 rounded-xl flex items-center justify-center">
              <Clock size={24} className="text-warning-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">قيد المراجعة</p>
              <p className="text-2xl font-bold text-warning-600">{counts.review}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <CalendarClock size={24} className="text-indigo-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">مجدولة للتنفيذ</p>
              <p className="text-2xl font-bold text-indigo-600">{counts.scheduled}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <AlertTriangle size={24} className="text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">موقوفة (Guard)</p>
              <p className="text-2xl font-bold text-orange-600">{counts.blocked}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-success-50 rounded-xl flex items-center justify-center">
              <CheckCircle2 size={24} className="text-success-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">نُفِّذت آلياً</p>
              <p className="text-2xl font-bold text-success-600">{counts.executed}</p>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('')}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${
              !filter ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            الكل ({transfers.length})
          </button>
          {(Object.keys(statusConfig) as TransferStatus[]).map((st) => {
            const c = transfers.filter((t) => t.status === st).length
            if (!c) return null
            return (
              <button
                key={st}
                onClick={() => setFilter(filter === st ? '' : st)}
                className={`px-4 py-2 rounded-xl text-sm font-medium ${
                  filter === st ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {statusConfig[st].label} ({c})
              </button>
            )
          })}
        </div>

        {/* Transfers */}
        <div className="space-y-4">
          {filtered.map((t) => (
            <div
              key={t.id}
              className={`card p-5 ${
                t.status === 'BLOCKED_GUARD' ? 'border-2 border-orange-200' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center">
                    <ArrowLeftRight size={24} className="text-indigo-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-800">{t.employeeName}</h3>
                      <span className={`badge text-xs ${statusConfig[t.status].className}`}>
                        {statusConfig[t.status].label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1.5">
                      <span className="text-gray-400">من:</span> {t.fromTeam}
                      <span className="text-xs text-gray-400"> ({getBranchName(t.fromBranchId)})</span>
                      <span className="text-gray-300 mx-2">←</span>
                      <span className="text-gray-400">إلى:</span>{' '}
                      <span className="font-medium">{t.toTeam}</span>
                      <span className="text-xs text-gray-400"> ({getBranchName(t.toBranchId)})</span>
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                      <span dir="ltr">{t.id}</span>
                      <span className="flex items-center gap-1 text-indigo-600 font-medium">
                        <CalendarClock size={12} />
                        تاريخ السريان: {t.effectiveDate}
                      </span>
                      {t.executedAt && (
                        <span className="text-success-600">
                          نفّذه النظام آلياً: {t.executedAt}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {t.status === 'APPROVED_SCHEDULED' && (
                  <div className="text-left text-xs text-indigo-600 bg-indigo-50 px-3 py-2 rounded-xl">
                    في {t.effectiveDate} سيُحدَّث آلياً:
                    <br />
                    الفريق + القسم + المدير المباشر
                  </div>
                )}
              </div>

              {/* Guard issues */}
              {t.guardIssues && t.guardIssues.length > 0 && (
                <div className="mt-4 p-3 bg-orange-50 rounded-xl border border-orange-100">
                  <p className="text-sm font-bold text-orange-700 flex items-center gap-2 mb-2">
                    <Package size={14} />
                    التنفيذ موقوف — مطلوب تسليم قبل النقل:
                  </p>
                  {t.guardIssues.map((issue, i) => (
                    <p key={i} className="text-xs text-orange-600 mr-5">
                      • {issue}
                    </p>
                  ))}
                </div>
              )}

              {/* سلسلة الموافقات — المديران + HR */}
              <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-400">السلسلة:</span>
                {t.steps.map((step, i) => (
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
                      {step.role}
                      {step.actedBy && (
                        <span className="text-[10px] opacity-70">({step.actedBy})</span>
                      )}
                    </div>
                    {i < t.steps.length - 1 && (
                      <ChevronLeft size={14} className="text-gray-300" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ملاحظة المبدأ */}
        <div className="card p-4 bg-blue-50 border border-blue-200 flex items-start gap-3">
          <History size={18} className="text-blue-600 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-800">
            <strong>المبدأ (§7.2):</strong> HR لا تعيد إدخال البيانات — الطلب فيه from/to وتاريخ
            السريان، وبعد الموافقة النهائية <strong>النظام ينفّذ آلياً في تاريخ السريان</strong>
            (تحديث الفريق والقسم والمدير المباشر). كل نقل يُسجَّل في سجل تنقلات الموظف
            (assignment history) الظاهر في تبويب «السجل الوظيفي».
          </p>
        </div>
      </div>
    </MainLayout>
  )
}
