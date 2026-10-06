'use client'

// B2.7-أ: «سياساتي» — سياسات الشركة اللي عليّ وحالتي مع كل واحدة، وأقراها تاني في أي وقت وأقرّ باللي لسه.
import { useCallback, useEffect, useState } from 'react'
import { ScrollText, X } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import EmptyState from '@/components/EmptyState'
import PolicyReader from '@/components/policies/PolicyReader'
import { formatDate } from '@/lib/dates'
import { fetchMyPolicies, POLICY_ACK_LABELS, type ApiMyPolicy, type PolicyAckState } from '@/lib/policies-api'

const STATE_STYLES: Record<PolicyAckState, string> = { ACKNOWLEDGED: 'bg-green-50 text-green-700', PENDING: 'bg-amber-50 text-amber-800', OVERDUE: 'bg-red-50 text-red-700' }

export default function MyPoliciesPage() {
  const [data, setData] = useState<{ available: boolean; policies: ApiMyPolicy[] } | null>(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState<ApiMyPolicy | null>(null)

  const load = useCallback(() => {
    setError('')
    fetchMyPolicies().then(setData).catch(cause => setError(cause instanceof Error ? cause.message : 'تعذر تحميل السياسات'))
  }, [])
  useEffect(load, [load])

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><ScrollText size={24} className="text-primary-600" />سياساتي</h1>
          <p className="text-gray-500 mt-1">سياسات الشركة اللي عليك، وإقرارك بكل واحدة</p>
        </div>
        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        {data && !data.available && <div className="bg-amber-50 text-amber-800 rounded-xl p-4 text-sm" data-policies-unavailable>مكتبة السياسات لسه مش متاحة على النظام.</div>}
        {data?.available && data.policies.length === 0 && <EmptyState title="مفيش سياسات عليك دلوقتي" icon={ScrollText} />}
        {data?.available && data.policies.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-my-policies>
            {data.policies.map(policy => (
              <div key={policy.policyId} className="card space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-bold text-gray-800 break-words">{policy.title}</h2>
                    <p className="text-xs text-gray-500 mt-1">
                      {policy.category ? `${policy.category} · ` : ''}النسخة {policy.version.versionNo} · سارية من {formatDate(policy.version.effectiveDate)}
                      {policy.isMandatory ? ' · إلزامية' : ''}
                    </p>
                  </div>
                  {/* غير الإلزامية مالهاش مهلة: «للاطلاع» لحد ما يقرّ */}
                  {policy.state !== 'ACKNOWLEDGED' && !policy.isMandatory
                    ? <span className="badge shrink-0 bg-gray-100 text-gray-600">للاطلاع</span>
                    : <span className={`badge shrink-0 ${STATE_STYLES[policy.state]}`}>{POLICY_ACK_LABELS[policy.state]}</span>}
                </div>
                <p className="text-xs text-gray-500">
                  {policy.state === 'ACKNOWLEDGED'
                    ? `أقرّيت بالنسخة ${policy.acknowledgedVersionNo ?? policy.version.versionNo}${policy.acknowledgedAt ? ` يوم ${formatDate(policy.acknowledgedAt)}` : ''}`
                    : policy.lockDate
                      ? policy.state === 'OVERDUE' ? 'مهلة الإقرار خلصت' : `النظام هيقفل معاك من يوم ${formatDate(policy.lockDate)}`
                      : 'الإقرار بيها اختياري'}
                </p>
                {/* الإلزامية اللي لسه: «اقرا ووافق». غير كده قراءة (وإقرار غير الإلزامية من جوّه القارئ) */}
                <button type="button" onClick={() => setOpen(policy)} className={policy.state !== 'ACKNOWLEDGED' && policy.isMandatory ? 'btn-primary' : 'btn-secondary'}>
                  {policy.state !== 'ACKNOWLEDGED' && policy.isMandatory ? 'اقرا ووافق' : 'قراءة'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {open && (
        <div className="fixed inset-0 z-[60] bg-gray-900/40 flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" aria-label={open.title} className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-end p-3 border-b border-gray-100">
              <button type="button" onClick={() => setOpen(null)} aria-label="إغلاق" className="p-2 rounded-lg text-gray-400 hover:bg-gray-100"><X size={20} /></button>
            </div>
            <div className="p-5">
              <PolicyReader versionId={open.version.id} canAcknowledge={open.state !== 'ACKNOWLEDGED'} acknowledgedAt={open.acknowledgedAt}
                onAcknowledged={() => { setOpen(null); load() }} onStale={() => { setOpen(null); load() }} />
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
