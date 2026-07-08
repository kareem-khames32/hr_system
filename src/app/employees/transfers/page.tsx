'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import Link from 'next/link'
import {
  ArrowRight,
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  CalendarClock,
  History,
} from 'lucide-react'
import { fetchTransfers } from '@/lib/api'

// ============================================================
// لوج النقل بين الفرق (§7.2)
// الموافقات تتم في محرك الطلبات — هنا سجل الجدولة والتنفيذ الآلي
// SCHEDULED = معتمد ومجدول لتاريخ السريان | EXECUTED = نُفِّذ آلياً
// ============================================================

interface TransferRow {
  id: number
  requestId?: number
  employeeName: string
  fromTeamName: string
  toTeamName: string
  effectiveDate: string
  status: string
  executedAt?: string
}

const statusConfig: Record<string, { label: string; className: string }> = {
  SCHEDULED: { label: 'مجدول', className: 'bg-indigo-100 text-indigo-700' },
  EXECUTED: { label: 'منفّذ', className: 'bg-success-50 text-success-700' },
}

const fmtDate = (v?: string | null) => (v ? String(v).slice(0, 10) : '')

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<TransferRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const rows = await fetchTransfers()
        setTransfers(
          rows.map((t: any) => ({
            id: t.id,
            requestId: t.requestId ?? undefined,
            employeeName: t.employeeName ?? `#${t.employeeId}`,
            fromTeamName: t.fromTeamName ?? `#${t.fromTeam}`,
            toTeamName: t.toTeamName ?? `#${t.toTeam}`,
            effectiveDate: fmtDate(t.effectiveDate),
            status: t.status,
            executedAt: t.executedAt
              ? String(t.executedAt).slice(0, 16).replace('T', ' ')
              : undefined,
          }))
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'تعذر تحميل لوج النقل')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = transfers.filter((t) => !filter || t.status === filter)

  const todayPlus30 = new Date(Date.now() + 30 * 86400000)
    .toISOString()
    .slice(0, 10)
  const counts = {
    total: transfers.length,
    scheduled: transfers.filter((t) => t.status === 'SCHEDULED').length,
    soon: transfers.filter(
      (t) => t.status === 'SCHEDULED' && t.effectiveDate <= todayPlus30
    ).length,
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
              الموافقات تتم في محرك الطلبات — والتنفيذ آلي بتاريخ السريان
            </p>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <ArrowLeftRight size={24} className="text-gray-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي التنقلات</p>
              <p className="text-2xl font-bold text-gray-800">{counts.total}</p>
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
            <div className="w-12 h-12 bg-warning-50 rounded-xl flex items-center justify-center">
              <Clock size={24} className="text-warning-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">تنفّذ خلال 30 يوم</p>
              <p className="text-2xl font-bold text-warning-600">{counts.soon}</p>
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
          {Object.keys(statusConfig).map((st) => {
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

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
        /* Transfers */
        <div className="space-y-4">
          {filtered.map((t) => (
            <div key={t.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center">
                    <ArrowLeftRight size={24} className="text-indigo-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-800">{t.employeeName}</h3>
                      <span
                        className={`badge text-xs ${
                          statusConfig[t.status]?.className ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {statusConfig[t.status]?.label ?? t.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1.5">
                      <span className="text-gray-400">من:</span> {t.fromTeamName}
                      <span className="text-gray-300 mx-2">←</span>
                      <span className="text-gray-400">إلى:</span>{' '}
                      <span className="font-medium">{t.toTeamName}</span>
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                      <span dir="ltr">TRF-{t.id}</span>
                      {t.requestId && <span dir="ltr">طلب #{t.requestId}</span>}
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
                {t.status === 'SCHEDULED' && (
                  <div className="text-left text-xs text-indigo-600 bg-indigo-50 px-3 py-2 rounded-xl">
                    في {t.effectiveDate} سيُحدَّث آلياً:
                    <br />
                    الفريق + القسم + المدير المباشر
                  </div>
                )}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="card p-12 text-center">
              <ArrowLeftRight size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">لا توجد تنقلات مسجلة بعد</p>
            </div>
          )}
        </div>
        )}

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
