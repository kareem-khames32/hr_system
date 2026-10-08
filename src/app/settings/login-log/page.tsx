'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, RefreshCw, ShieldCheck } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { fetchLoginEvents, type ApiLoginEvent } from '@/lib/api'
import { formatDateTime } from '@/lib/dates'

// أمان الدخول (خطة التنفيذ B1.3): سجل الدخول — كل محاولة بوقتها ونتيجتها والطريقة والـIP والجهاز، وفك القفل ومين فكه.
// لصاحب «إدارة حسابات الدخول»؛ حساب الفروع بيشوف محاولات حسابات فروعه بس. الأحدث الأول، 500 بحد أقصى.

const LOGIN_OUTCOME_LABELS: Record<string, string> = {
  SUCCESS: 'دخل', CODE_SENT: 'اتبعت له رمز البريد', BAD_PASSWORD: 'كلمة سر غلط', LOCKED_OUT: 'كلمة سر غلط — والحساب اتقفل', LOCKED: 'حاول والحساب مقفول',
  UNKNOWN_ACCOUNT: 'بريد مش موجود', INACTIVE: 'حساب معطّل', UNLOCKED: 'فك القفل', UNLOCK_NOOP: 'فك القفل (ماكانش مقفول)',
  CODE_WRONG_CODE: 'رمز البريد غلط', CODE_LOCKED: 'رمز البريد غلط — المحاولات خلصت', CODE_EXPIRED: 'رمز البريد انتهى', CODE_UNKNOWN: 'طلب دخول مش معروف',
}
const METHOD_LABELS: Record<ApiLoginEvent['method'], string> = { PASSWORD: 'بريد وكلمة سر', DOMAIN: 'حساب الشركة', CODE: 'رمز البريد', ADMIN: 'مدير' }
const loginOutcomeLabel = (outcome: string) =>
  LOGIN_OUTCOME_LABELS[outcome] ?? (outcome.startsWith('DOMAIN_') ? 'حساب الشركة رفض الدخول' : outcome)
const FAILED = new Set(['BAD_PASSWORD', 'LOCKED_OUT', 'LOCKED', 'UNKNOWN_ACCOUNT', 'INACTIVE'])

export default function LoginLogPage() {
  const [filters, setFilters] = useState({ from: '', to: '', outcome: '', search: '' })
  const [rows, setRows] = useState<ApiLoginEvent[]>([])
  const [available, setAvailable] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true); setError('')
    fetchLoginEvents(filters)
      .then(result => { setRows(result.rows); setAvailable(result.available) })
      .catch(cause => setError(cause instanceof Error ? cause.message : 'تعذر تحميل سجل الدخول'))
      .finally(() => setLoading(false))
  }, [filters])
  useEffect(load, [load])

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><ShieldCheck size={24} className="text-primary-600" />سجل الدخول</h1>
            <p className="text-gray-500 mt-1">كل محاولة دخول بوقتها ونتيجتها، وفك قفل الحسابات ومين فكه</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/settings/users" className="btn-secondary flex items-center gap-2"><ArrowRight size={18} />المستخدمين</Link>
            <button type="button" onClick={load} className="btn-secondary flex items-center gap-2"><RefreshCw size={18} />تحديث</button>
          </div>
        </div>

        <div className="card flex flex-wrap items-end gap-3" data-login-log-filters>
          <label className="text-sm text-gray-700">من<input type="date" className="input mt-1 block" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} /></label>
          <label className="text-sm text-gray-700">إلى<input type="date" className="input mt-1 block" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} /></label>
          <label className="text-sm text-gray-700">النتيجة
            <select className="input mt-1 block" value={filters.outcome} onChange={e => setFilters(f => ({ ...f, outcome: e.target.value }))}>
              <option value="">كل النتايج</option>
              {Object.entries(LOGIN_OUTCOME_LABELS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </select>
          </label>
          <label className="text-sm text-gray-700 flex-1 min-w-48">بحث بالبريد أو الاسم
            <input className="input mt-1 w-full" value={filters.search} maxLength={100} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
          </label>
        </div>

        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        {!available && <div className="bg-amber-50 text-amber-900 rounded-xl p-4" data-login-log-unavailable>سجل الدخول هيبدأ يتسجل بعد تطبيق ترحيل 078 على السيرفر.</div>}

        <div className="card overflow-x-auto">
          {loading ? <p className="text-sm text-gray-400">جارٍ التحميل…</p> : (
            <table className="w-full text-sm" data-login-log-table>
              <thead className="bg-gray-50">
                <tr>{['الوقت', 'الحساب', 'الطريقة', 'النتيجة', 'الـIP', 'الجهاز'].map(title => <th key={title} className="px-3 py-2 text-start font-medium text-gray-600 whitespace-nowrap">{title}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map(row => (
                  <tr key={row.id} className={FAILED.has(row.outcome) ? 'bg-red-50/40' : undefined}>
                    <td className="px-3 py-2 whitespace-nowrap" dir="ltr">{formatDateTime(row.at)}</td>
                    <td className="px-3 py-2">
                      <span className="font-medium text-gray-800">{row.displayName ?? '—'}</span>
                      <span className="block text-xs text-gray-500" dir="ltr">{row.identifier}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{METHOD_LABELS[row.method] ?? row.method}</td>
                    <td className="px-3 py-2">
                      {loginOutcomeLabel(row.outcome)}
                      {row.actorName && <span className="block text-xs text-gray-500">بواسطة {row.actorName}</span>}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-gray-600" dir="ltr">{row.ip ?? '—'}</td>
                    <td className="px-3 py-2 text-xs text-gray-500 max-w-xs truncate" title={row.userAgent ?? ''} dir="ltr">{row.userAgent ?? '—'}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-400">مفيش محاولات دخول بالفلاتر دي</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
