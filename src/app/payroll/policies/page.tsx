'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ListOrdered, RefreshCw } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { PayrollCollectionEditor } from '@/components/PayrollCollectionEditor'
import { PayrollLiveSourcesPanel } from '@/components/PayrollLiveSourcesPanel'
import { can } from '@/lib/api'
import {
  fetchPayrollPolicies, fetchPayrollPolicy, fetchPayrollPolicyCollection, payrollPoliciesError,
  type PayrollCollectionSaveResponse, type PayrollCollectionView, type PayrollPolicySummary,
} from '@/lib/payroll-policies-api'

const versionLabels = { DRAFT: 'مسودة', ACTIVE: 'نشطة', ARCHIVED: 'مؤرشفة' }
type Selection = { policyId: number; versionId?: number }

function PayrollPoliciesContent() {
  const [policies, setPolicies] = useState<PayrollPolicySummary[]>([])
  const [selected, setSelected] = useState<PayrollPolicySummary | null>(null)
  const [versionId, setVersionId] = useState<number | null>(null)
  const [view, setView] = useState<PayrollCollectionView | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState('')
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sourcesDirty, setSourcesDirty] = useState(false)
  const [pendingSelection, setPendingSelection] = useState<Selection | null>(null)
  const [editorGeneration, setEditorGeneration] = useState(0)
  const sequence = useRef(0)
  const mounted = useRef(true)

  const loadSelection = useCallback(async (selection: Selection, list?: PayrollPolicySummary[]) => {
    const request = ++sequence.current
    setLoading(true); setLoadError(''); setView(null); setNotice(''); setDirty(false); setPendingSelection(null)
    try {
      const detail = await fetchPayrollPolicy(selection.policyId)
      if (!mounted.current || request !== sequence.current) return
      setSelected(detail)
      setPolicies(current => (list ?? current).map(item => item.policy.id === detail.policy.id ? detail : item))
      const nextVersion = selection.versionId ?? [...detail.versions].sort((a, b) => b.versionNo - a.versionNo)[0]?.id
      setVersionId(nextVersion ?? null)
      if (nextVersion != null) {
        const collection = await fetchPayrollPolicyCollection(detail.policy.id, nextVersion)
        if (!mounted.current || request !== sequence.current) return
        setView(collection); setEditorGeneration(current => current + 1)
      }
    } catch (cause) { if (mounted.current && request === sequence.current) setLoadError(payrollPoliciesError(cause)) }
    finally { if (mounted.current && request === sequence.current) setLoading(false) }
  }, [])

  const loadList = useCallback(async () => {
    const request = ++sequence.current
    setLoading(true); setLoadError(''); setSelected(null); setView(null); setVersionId(null); setNotice('')
    try {
      const list = await fetchPayrollPolicies()
      if (!mounted.current || request !== sequence.current) return
      setPolicies(list)
      if (list.length) await loadSelection({ policyId: list[0].policy.id }, list)
      else setLoading(false)
    } catch (cause) { if (mounted.current && request === sequence.current) { setLoadError(payrollPoliciesError(cause)); setLoading(false) } }
  }, [loadSelection])

  useEffect(() => {
    mounted.current = true
    void loadList()
    return () => { mounted.current = false; ++sequence.current }
  }, [loadList])

  function choose(selection: Selection) {
    if (busy || loading || sourcesDirty) return
    if (dirty) setPendingSelection(selection)
    else void loadSelection(selection)
  }

  async function reloadCollection() {
    if (!selected || versionId == null) return
    // لا نستبدل المحرر عند فشل القراءة؛ السبب والترتيب المحلي يظلان ظاهرين.
    const collection = await fetchPayrollPolicyCollection(selected.policy.id, versionId)
    const detail = await fetchPayrollPolicy(selected.policy.id)
    if (!mounted.current) return
    setSelected(detail); setView(collection); setDirty(false); setLoadError(''); setNotice('')
    setPolicies(current => current.map(item => item.policy.id === detail.policy.id ? detail : item))
    setEditorGeneration(current => current + 1)
  }

  function saved(response: PayrollCollectionSaveResponse) {
    setView(response); setVersionId(response.version.id); setDirty(false); setLoadError(''); setPendingSelection(null)
    setEditorGeneration(current => current + 1)
    setSelected(current => current ? { ...current, versions: [...current.versions.filter(version => version.id !== response.version.id), response.version] } : current)
    setNotice(response.editKind === 'CLONED' ? `حُفظ الترتيب في نسخة مسودة جديدة رقم ${response.version.versionNo}. النسخة السابقة محفوظة كما هي.` : 'حُفظ ترتيب التحصيل وسبب التعديل بنجاح.')
    // نجاح الحفظ مؤكد برد الخادم؛ فشل تحديث القائمة لا يعيد المسودة القديمة أو يكرر الحفظ.
    const request = ++sequence.current
    void fetchPayrollPolicies().then(list => {
      if (!mounted.current || request !== sequence.current) return
      setPolicies(list)
    }).catch(cause => { if (mounted.current && request === sequence.current) setLoadError(`تم الحفظ، لكن تعذر تحديث قائمة السياسات: ${payrollPoliciesError(cause)}`) })
  }

  const version = view?.version ?? selected?.versions.find(item => item.id === versionId)
  return <div className="space-y-6 pb-8">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3"><span className="rounded-2xl p-3 bg-primary-50 text-primary-600"><ListOrdered size={26} /></span><div><h1 className="text-2xl font-bold text-gray-800">سياسات الرواتب</h1><p className="text-gray-500 mt-1">تصنيف الخصومات وترتيب تحصيلها لكل نسخة سياسة.</p></div></div>
      <Link href="/payroll" className="btn-secondary flex gap-2 items-center text-sm"><ArrowRight size={17} />مسير الرواتب</Link>
    </div>

    {notice && <div role="status" className="rounded-xl bg-green-50 p-4 text-green-800 text-sm">{notice}</div>}
    {loadError && <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-800 space-y-3"><p>{loadError}</p>{!view && <button type="button" className="btn-secondary text-sm flex gap-2 items-center" disabled={loading} onClick={() => void loadList()}><RefreshCw size={16} />إعادة تحميل السياسات</button>}</div>}

    {policies.length > 0 && <section className="card grid md:grid-cols-2 gap-4" aria-label="اختيار السياسة والنسخة">
      <div><label htmlFor="payroll-policy" className="block text-sm font-medium text-gray-700 mb-2">السياسة</label><select id="payroll-policy" value={selected?.policy.id ?? ''} disabled={loading || busy || sourcesDirty} onChange={event => choose({ policyId: Number(event.target.value) })} className="w-full rounded-xl border border-gray-200 p-3 bg-white disabled:bg-gray-50">
        <option value="" disabled>اختر السياسة</option>{policies.map(item => <option key={item.policy.id} value={item.policy.id}>{item.policy.name} ({item.policy.code}){item.policy.branchId == null ? ' · عامة' : ''}{!item.policy.isActive ? ' · مؤرشفة' : ''}</option>)}
      </select></div>
      <div><label htmlFor="payroll-policy-version" className="block text-sm font-medium text-gray-700 mb-2">النسخة</label><select id="payroll-policy-version" value={versionId ?? ''} disabled={loading || busy || sourcesDirty || !selected?.versions.length} onChange={event => selected && choose({ policyId: selected.policy.id, versionId: Number(event.target.value) })} className="w-full rounded-xl border border-gray-200 p-3 bg-white disabled:bg-gray-50">
        <option value="" disabled>اختر النسخة</option>{[...(selected?.versions ?? [])].sort((a, b) => b.versionNo - a.versionNo).map(item => <option key={item.id} value={item.id}>نسخة {item.versionNo} · {versionLabels[item.status]}{item.metadata?.title ? ` · ${item.metadata.title}` : ''}</option>)}
      </select></div>
    </section>}

    {pendingSelection && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3"><p className="text-sm text-amber-900">لديك تعديلات غير محفوظة. الانتقال يستبدلها بالنسخة المختارة.</p><div className="flex gap-2"><button type="button" className="btn-secondary text-sm" onClick={() => void loadSelection(pendingSelection)}>تجاهل التعديلات والانتقال</button><button type="button" className="px-3 text-sm text-gray-600" onClick={() => setPendingSelection(null)}>البقاء</button></div></div>}
    {loading && <div role="status" className="card py-16 text-center text-gray-500">جارٍ تحميل السياسة ونسختها…</div>}
    {!loading && !loadError && policies.length === 0 && <div className="card py-12 text-center"><h2 className="font-bold text-gray-700">لا توجد سياسات متاحة لحسابك</h2><p className="text-sm text-gray-500 mt-2">تظهر هنا السياسات الموجودة ضمن نطاق صلاحياتك. يلزم تجهيز سياسة ونسخة ببنودها قبل إدارة ترتيب التحصيل.</p></div>}
    {!loading && selected && !selected.versions.length && <p className="card text-gray-500">لا توجد نسخ لهذه السياسة. يلزم تجهيز نسخة بإعداداتها وبنودها أولًا.</p>}
    {sourcesDirty && <p className="text-sm text-amber-800">احفظ مراجعة الأجر أو تجاهل تعديلاتها من سجل الموظف قبل تغيير السياسة أو ترتيب التحصيل.</p>}
    {!loading && view && version && <fieldset disabled={sourcesDirty} className="min-w-0"><PayrollCollectionEditor key={`${view.versionId}:${view.revision}:${editorGeneration}`} view={view} version={version} canCalculate={can('payroll.calculate')} onSaved={saved} onReload={reloadCollection} onDirtyChange={setDirty} onBusyChange={setBusy} /></fieldset>}
    {!loading && view && version && <PayrollLiveSourcesPanel key={`sources:${view.versionId}:${view.revision}:${editorGeneration}`} view={view} canCalculate={can('payroll.calculate')} policyDirty={dirty || busy} onHistoryDirtyChange={setSourcesDirty} />}
  </div>
}

export default function PayrollPoliciesPage() { return <MainLayout><PayrollPoliciesContent /></MainLayout> }
