'use client'

import { useEffect, useState } from 'react'
import { Camera, RefreshCw } from 'lucide-react'
import { can } from '../../lib/api'
import { fetchPayrollPolicySnapshot, LATENESS_TIER_MODE_LABELS, type PayrollPolicySnapshotView } from '../../lib/payroll-engine-api'

// الخطوة 19: لقطة السياسة المحفوظة على المسير (النسخة والإعدادات والشرائح وأساس الأيام والبصمة) مقابل الإعدادات الحالية.
// إعادة الحساب تقرأ اللقطة؛ «تحديث اللقطة» اختيار صريح لا يُتاح إلا بعد عرض الفروق، ويرسل بصمة الإعدادات المعروضة.
export interface PolicySnapshotRefreshChoice { refresh: boolean; expectedHash: string | null }

const show = (value: unknown) => value === null || value === undefined ? '—' : typeof value === 'boolean' ? (value ? 'نعم' : 'لا') : String(value)

export function PayrollPolicySnapshotPanel({ runId, runStatus, snapshotVersion, onRefreshChoice }: {
  runId: number; runStatus: string; snapshotVersion: number; onRefreshChoice: (choice: PolicySnapshotRefreshChoice) => void
}) {
  const [view, setView] = useState<PayrollPolicySnapshotView | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [refresh, setRefresh] = useState(false)

  const load = async () => {
    setLoading(true); setError('')
    try { setView(await fetchPayrollPolicySnapshot(runId)) } catch (e) { setView(null); setError(e instanceof Error ? e.message : 'تعذر تحميل لقطة السياسة') }
    finally { setLoading(false) }
  }
  useEffect(() => { setRefresh(false); onRefreshChoice({ refresh: false, expectedHash: null }); setView(null); load() }, [runId, snapshotVersion])

  const toggle = (checked: boolean) => {
    setRefresh(checked)
    onRefreshChoice({ refresh: checked, expectedHash: checked && view ? view.currentHash : null })
  }
  const stored = view?.stored
  const canRefresh = !!view && view.canRefresh && can('payroll.calculate') && runStatus === 'CALCULATED'

  return (
    <div className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Camera size={18} className="text-primary-600" />
          <h3 className="font-bold text-gray-800">لقطة السياسة على المسير</h3>
          {stored && <span className="text-xs text-gray-500">بصمة <span className="font-mono" dir="ltr">{stored.fingerprint.slice(0, 12)}</span> • التُقطت {stored.capturedAt.slice(0, 16).replace('T', ' ')}</span>}
        </div>
        <button type="button" onClick={load} disabled={loading} className="btn-secondary text-xs flex items-center gap-1 disabled:opacity-50"><RefreshCw size={14} />مقارنة بالإعدادات الحالية</button>
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {view && !stored && runStatus === 'DRAFT' && <p className="text-sm text-gray-600">المسودة لم تُحتسب بعد؛ أول «احتساب المسودة» يلتقط القيم الحالية أدناه ويثبتها على المسير.</p>}
      {view && !stored && runStatus !== 'DRAFT' && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">هذا المسير محسوب قبل حفظ لقطة السياسة. إعادة حسابه تتطلب «تحديث اللقطة» بعد مراجعة القيم الحالية.</p>}
      {stored && <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
        <p><span className="text-gray-500">نسخة السياسة: </span>{stored.policy ? `«${stored.policy.name}» نسخة ${stored.policy.versionNo} (مراجعة ${stored.policy.revision})` : 'بلا نسخة (إعدادات عامة)'}</p>
        <p><span className="text-gray-500">أساس الأيام: </span>{stored.dayBasis} • ساعات اليوم {show(stored.values.dailyHours)}</p>
        <p><span className="text-gray-500">معامل الغياب: </span>{show(stored.values.absencePenaltyDays)} يوم • خصم التأخير {show(stored.values.lateDeductionEnabled)}</p>
        <p className="md:col-span-3"><span className="text-gray-500">شرائح التأخير: </span>{stored.latenessTiers.setId
          ? `المجموعة #${stored.latenessTiers.setId} من ${stored.latenessTiers.effectivePeriod} — ` + stored.latenessTiers.tiers.map(tier => `${tier.fromMinutes}–${tier.toMinutes ?? '∞'} ${LATENESS_TIER_MODE_LABELS[tier.mode]}${['FRACTION', 'MULTIPLIER'].includes(tier.mode) ? ` ${Number(tier.value)}` : ''}`).join('، ')
          : 'بلا شرائح (الخصم بالدقيقة)'}</p>
      </div>}
      {view && (view.differences.length === 0
        ? stored && <p className="text-sm text-success-700">الإعدادات الحالية تطابق اللقطة المحفوظة؛ إعادة الحساب تعطي نفس القواعد.</p>
        : <div className="space-y-2">
          <p className="text-sm font-medium text-amber-900">{stored ? `${view.differences.length} فرق بين اللقطة المحفوظة والإعدادات الحالية — إعادة الحساب تستخدم المحفوظ ما لم تختر التحديث صراحةً:` : 'القيم الحالية التي ستُلتقط:'}</p>
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="table-header"><th className="p-2 text-right">البند</th><th className="p-2 text-right">المحفوظ على المسير</th><th className="p-2 text-right">الحالي</th></tr></thead>
            <tbody>{view.differences.map(row => <tr key={row.key} className="border-t border-gray-100 align-top">
              <td className="p-2">{row.label}</td><td className="p-2 text-gray-700">{row.stored}</td><td className="p-2 text-amber-900">{row.current}</td>
            </tr>)}</tbody>
          </table></div>
          {canRefresh && <label className="flex items-start gap-2 text-sm text-gray-800">
            <input type="checkbox" checked={refresh} onChange={e => toggle(e.target.checked)} className="mt-1 rounded border-gray-300" />
            تحديث لقطة السياسة بالقيم الحالية المعروضة عند «إعادة حساب المسير» (بصمة <span className="font-mono" dir="ltr">{view.currentHash.slice(0, 12)}</span>)
          </label>}
        </div>)}
    </div>
  )
}
