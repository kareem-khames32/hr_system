'use client'

// B2.7-أ: تقرير إقرارات السياسات — لصاحب «إدارة السياسات» أو «تقرير الإقرارات»، لموظفي نطاق فروعه.
import { useEffect, useState } from 'react'
import { ClipboardCheck } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import EmptyState from '@/components/EmptyState'
import PolicyReport from '@/components/policies/PolicyReport'
import { fetchPolicies, POLICY_STATUS_LABELS, type ApiPolicies } from '@/lib/policies-api'

export default function PolicyReportsPage() {
  const [data, setData] = useState<ApiPolicies | null>(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<number | null>(null)

  useEffect(() => {
    // رقم السياسة من اللينك (?id=) لو جاي من مكتبة السياسات
    const wanted = Number(new URLSearchParams(window.location.search).get('id'))
    fetchPolicies()
      .then(loaded => {
        setData(loaded)
        // المسودة مالهاش تقرير (من غير نسخة)
        const reportable = loaded.policies.filter(policy => policy.status !== 'DRAFT')
        setSelected(reportable.find(policy => policy.id === wanted)?.id ?? reportable[0]?.id ?? null)
      })
      .catch(cause => setError(cause instanceof Error ? cause.message : 'تعذر تحميل السياسات'))
  }, [])

  const reportable = data?.policies.filter(policy => policy.status !== 'DRAFT') ?? []
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><ClipboardCheck size={24} className="text-primary-600" />تقرير الإقرارات</h1>
          <p className="text-gray-500 mt-1">مين أقرّ بكل سياسة ومين لسه، لموظفي نطاق فروعك</p>
        </div>
        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        {data && !data.available && <div className="bg-amber-50 text-amber-800 rounded-xl p-4 text-sm" data-policies-unavailable>مكتبة السياسات لسه مش متاحة: محتاجة ترحيل قاعدة البيانات 20261005_091.</div>}
        {data?.available && reportable.length === 0 && <EmptyState title="مفيش سياسات منشورة لسه" icon={ClipboardCheck} />}
        {data?.available && reportable.length > 0 && (
          <>
            <label className="block text-sm text-gray-700 max-w-xl">السياسة
              <select className="input mt-1 block w-full" value={selected ?? ''} onChange={event => setSelected(Number(event.target.value))} data-policy-report-select>
                {reportable.map(policy => <option key={policy.id} value={policy.id}>{policy.title}{policy.status === 'WITHDRAWN' ? ` (${POLICY_STATUS_LABELS.WITHDRAWN})` : ''}</option>)}
              </select>
            </label>
            {selected != null && <PolicyReport policyId={selected} />}
          </>
        )}
      </div>
    </MainLayout>
  )
}
