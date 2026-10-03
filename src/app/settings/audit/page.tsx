'use client'

import { Fragment, useCallback, useEffect, useState } from 'react'
import { ChevronDown, RefreshCw, ScrollText } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { formatDateTime } from '@/lib/dates'
import { AUDIT_CATEGORY_OPTIONS, auditValueText, fetchAuditLog, type ApiAuditPage, type AuditFilters } from '@/lib/audit-api'

// B2.1: سجل التدقيق المركزي — الدخول، والصلاحيات والنطاق، والإعدادات والموديولات، والبيانات البنكية والرواتب، والتصدير، وإجراءات المسير.
// بصلاحية «سجل التدقيق» وبنطاق فروع الحساب. قراءة بس: مفيش تعديل ولا مسح من هنا ولا من أي مكان.

export default function AuditLogPage() {
  const [filters, setFilters] = useState<AuditFilters>({ category: '', from: '', to: '', q: '', expired: false, page: 1 })
  const [data, setData] = useState<ApiAuditPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true); setError('')
    fetchAuditLog(filters)
      .then(setData)
      .catch(cause => setError(cause instanceof Error ? cause.message : 'تعذر تحميل سجل التدقيق'))
      .finally(() => setLoading(false))
  }, [filters])
  useEffect(load, [load])

  const set = (patch: Partial<AuditFilters>) => setFilters(current => ({ ...current, ...patch, page: patch.page ?? 1 }))
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><ScrollText size={24} className="text-primary-600" />سجل التدقيق</h1>
            <p className="text-gray-500 mt-1">
              مين عمل إيه وإمتى ومن أي جهاز: الدخول، والصلاحيات، والإعدادات، والبيانات البنكية والرواتب، والتصدير، وإجراءات المسير
            </p>
          </div>
          <button type="button" onClick={load} className="btn-secondary flex items-center gap-2"><RefreshCw size={18} />تحديث</button>
        </div>

        <div className="card flex flex-wrap items-end gap-3" data-audit-filters>
          <label className="text-sm text-gray-700">الفئة
            <select className="input mt-1 block" value={filters.category ?? ''} onChange={e => set({ category: e.target.value })}>
              <option value="">كل الفئات</option>
              {AUDIT_CATEGORY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="text-sm text-gray-700">من<input type="date" className="input mt-1 block" value={filters.from ?? ''} onChange={e => set({ from: e.target.value })} /></label>
          <label className="text-sm text-gray-700">إلى<input type="date" className="input mt-1 block" value={filters.to ?? ''} onChange={e => set({ to: e.target.value })} /></label>
          <label className="text-sm text-gray-700 flex-1 min-w-48">بحث في الوصف
            <input className="input mt-1 w-full" value={filters.q ?? ''} maxLength={100} onChange={e => set({ q: e.target.value })} />
          </label>
          <label className="text-sm text-gray-700 flex items-center gap-2 pb-2">
            <input type="checkbox" checked={filters.expired === true} onChange={e => set({ expired: e.target.checked })} />
            منتهي الاحتفاظ
          </label>
        </div>

        {data && (
          <p className="text-xs text-gray-500" data-audit-retention>
            {data.expired
              ? `بتشوف الأحداث الأقدم من ${data.retentionMonths} شهر (منتهية الاحتفاظ). مفيش حاجة بتتمسح.`
              : `بتشوف آخر ${data.retentionMonths} شهر. الأقدم في «منتهي الاحتفاظ».`}
          </p>
        )}
        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        <div className="card overflow-x-auto">
          {loading ? <p className="text-sm text-gray-400">جارٍ التحميل…</p> : (
            <table className="w-full text-sm" data-audit-table>
              <thead className="bg-gray-50">
                <tr>{['الوقت', 'الفئة', 'الوصف', 'مين', 'الـIP', ''].map((title, index) => <th key={index} className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">{title}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.rows.map(row => (
                  <Fragment key={row.id}>
                    <tr>
                      <td className="px-3 py-2 whitespace-nowrap" dir="ltr">{formatDateTime(row.at)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="badge bg-gray-100 text-gray-700">{row.categoryLabel}</span>
                        <span className="block text-xs text-gray-400" dir="ltr">{row.action}</span>
                      </td>
                      <td className="px-3 py-2 text-gray-800">{row.summary ?? '—'}</td>
                      <td className="px-3 py-2 text-gray-600">{row.actorName ?? (row.actorUserId ? `#${row.actorUserId}` : 'النظام')}</td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-600" dir="ltr">{row.ip ?? '—'}</td>
                      <td className="px-3 py-2">
                        {(row.before != null || row.after != null) && (
                          <button type="button" className="text-primary-600 text-xs flex items-center gap-1" onClick={() => setOpen(open === row.id ? null : row.id)}>
                            قبل وبعد <ChevronDown size={14} className={open === row.id ? 'rotate-180' : ''} />
                          </button>
                        )}
                      </td>
                    </tr>
                    {open === row.id && (
                      <tr className="bg-gray-50/60">
                        <td colSpan={6} className="px-3 py-2 text-xs">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div><span className="text-gray-500">قبل: </span><code className="break-all" dir="ltr">{auditValueText(row.before)}</code></div>
                            <div><span className="text-gray-500">بعد: </span><code className="break-all" dir="ltr">{auditValueText(row.after)}</code></div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {data && data.rows.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-400">مفيش أحداث بالفلاتر دي</td></tr>}
              </tbody>
            </table>
          )}
        </div>

        {data && pages > 1 && (
          <div className="flex items-center justify-center gap-3 text-sm" data-audit-pages>
            <button type="button" className="btn-secondary px-3 py-1" disabled={data.page <= 1} onClick={() => set({ page: data.page - 1 })}>السابق</button>
            <span className="text-gray-600">صفحة {data.page} من {pages} ({data.total} حدث)</span>
            <button type="button" className="btn-secondary px-3 py-1" disabled={data.page >= pages} onClick={() => set({ page: data.page + 1 })}>التالي</button>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
