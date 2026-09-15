'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, CheckCircle2, LockKeyhole, Save } from 'lucide-react'
import { ApiError } from '../lib/api'
import {
  COLLECTION_KINDS, COLLECTION_LABELS, changeCollectionKind, collectionDeductions, collectionDraftIssues, collectionPayload,
  createCollectionDraft, isLoanCollectionComponent, isProtectedCollectionKind, moveCollectionItem, payrollPoliciesError,
  proposeCollectionOrder, savePayrollPolicyCollection,
  type CollectionKind, type PayrollCollectionView, type PayrollCollectionSaveResponse, type PayrollPolicyVersionSummary,
} from '../lib/payroll-policies-api'

interface Props {
  view: PayrollCollectionView
  version: PayrollPolicyVersionSummary
  onSaved: (response: PayrollCollectionSaveResponse) => void
  onReload: () => Promise<void>
  onDirtyChange: (dirty: boolean) => void
  onBusyChange: (busy: boolean) => void
}
const stateLabels = { MISSING: 'غير مكتمل', INVALID: 'يحتاج مراجعة', COMPLETE: 'مكتمل' }

// يُعاد تركيب المحرر بعد قراءة ناجحة أو حفظ ناجح فقط؛ فشل الحفظ لا يستبدل المسودة.
export function PayrollCollectionEditor({ view, version, onSaved, onReload, onDirtyChange, onBusyChange }: Props) {
  const initial = useMemo(() => createCollectionDraft(view), [view])
  const [draft, setDraft] = useState(initial)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [conflict, setConflict] = useState(false)
  const [error, setError] = useState('')
  const [confirmReload, setConfirmReload] = useState(false)
  const [proposal, setProposal] = useState('')
  const components = collectionDeductions(view.definition.components)
  const byCode = new Map(components.map(component => [component.code, component]))
  const kinds = new Map(draft.classifications.map(item => [item.componentCode, item.kind]))
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial) || reason.length > 0
  const complete = view.settingsStatus === 'COMPLETE' && view.definitionStatus === 'COMPLETE' && view.contractVersion === 'SRS_V1'
  // الخطوة 15: قرار الخادم (payroll.policy.manage + نطاق فرع السياسة النشطة) هو المرجع؛ payroll.calculate لا تمنح التعديل ولا تحجبه.
  const authorized = view.capabilities.canEdit
  const editable = authorized && complete && !saving && !conflict
  const issues = collectionDraftIssues(draft, view.definition.components)
  const protectedItems = components.filter(component => isProtectedCollectionKind(kinds.get(component.code) ?? ''))
  const copiesVersion = version.status !== 'DRAFT' || !!version.frozenAt || !!version.publishedAt || version.publishedBy != null

  useEffect(() => { onDirtyChange(dirty) }, [dirty, onDirtyChange])
  useEffect(() => {
    if (!dirty) return
    const protect = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', protect)
    return () => window.removeEventListener('beforeunload', protect)
  }, [dirty])

  async function save() {
    if (!editable || issues.length || !reason.trim()) return
    setSaving(true); onBusyChange(true); setError('')
    try {
      const response = await savePayrollPolicyCollection(view.policyId, view.versionId, view.revision, reason, collectionPayload(draft, view.definition.components))
      onSaved(response)
    } catch (cause) {
      setError(payrollPoliciesError(cause))
      if (cause instanceof ApiError && cause.status === 409) setConflict(true)
    } finally { setSaving(false); onBusyChange(false) }
  }
  async function reload() {
    setSaving(true); onBusyChange(true); setError('')
    try { await onReload() } catch (cause) { setError(payrollPoliciesError(cause)) }
    finally { setSaving(false); onBusyChange(false) }
  }

  return <div className="space-y-5">
    <section className="card space-y-4" aria-label="حالة نسخة السياسة">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-800">ترتيب التحصيل — النسخة {version.versionNo}</h2>
          <p className="text-sm text-gray-500 mt-1">المراجعة {view.revision} · السريان من {version.effectiveFrom.slice(0, 10)}{version.effectiveTo ? ` إلى ${version.effectiveTo.slice(0, 10)}` : ''}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm ${view.collectionState === 'COMPLETE' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-800'}`}>
          ترتيب التحصيل: {stateLabels[view.collectionState]}
        </span>
      </div>
      <p className="text-sm text-gray-600 leading-7">حدد أي الخصومات تُحصّل أولًا عند عدم كفاية المبلغ المتاح. البنود المحمية تُعالج قبل هذا الترتيب. المسير المرتبط بهذه النسخة يطبقه عند الحساب على فئات التحصيل (الحضور، والاستردادات، والمصنفة، والإدارية، وأقساط السلف) حسب تصنيف كل بند؛ المسيرات المحسوبة لا تتغير إلا بإعادة حسابها، والنسخة المنشورة لا تُعدل (التعديل ينشئ نسخة جديدة).</p>
      {!authorized && <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600 flex gap-2"><LockKeyhole size={18} className="shrink-0" />هذه السياسة متاحة للقراءة فقط؛ التعديل يتطلب صلاحية «إدارة سياسات الرواتب ونشرها» ونطاق فرع السياسة النشطة.</p>}
      {!complete && <div role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 space-y-2">
        <p className="font-semibold">يلزم استكمال إعدادات النسخة وتعريف بنودها قبل حفظ ترتيب التحصيل.</p>
        <p>الإعدادات: {stateLabels[view.settingsStatus]} · تعريف البنود: {stateLabels[view.definitionStatus]}</p>
        {view.contractVersion !== 'SRS_V1' && <p>هذه النسخة تستخدم عقدًا قديمًا أو غير مدعوم لهذا المحرر.</p>}
        {[...(view.settingsIssues ?? []).map(item => typeof item === 'string' ? item : item.message), ...(view.definitionIssues ?? [])].map((item, index) => <p key={index}>{item}</p>)}
      </div>}
      {view.collectionState === 'MISSING' && complete && <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">لم يُحفظ ترتيب لهذه النسخة. اختر تصنيف كل خصم وراجع الترتيب المقترح، ثم احفظ بسبب واضح.</p>}
      {view.collectionState === 'INVALID' && <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 space-y-1">
        <p>الترتيب المحفوظ يحتاج إصلاحًا. الاختيارات أدناه مقترح جديد للمراجعة قبل استبداله بالحفظ.</p>
        {view.collectionIssues.map((issue, index) => <p key={index}>{issue.message}</p>)}
      </div>}
      {authorized && complete && copiesVersion && <p className="text-sm text-blue-700">حفظ التعديل سينشئ نسخة مسودة جديدة ويحافظ على هذه النسخة كما هي.</p>}
    </section>

    <section className="card" aria-label="تصنيفات الخصومات">
      <h2 className="font-bold text-gray-800">١. تصنيف الخصومات</h2>
      <p className="text-sm text-gray-500 mt-1 mb-4">يشمل جميع بنود الخصم. البنود غير المفعلة تحتفظ بتصنيفها وترتيبها دون تفعيلها.</p>
      {components.length === 0 ? <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">لا توجد بنود خصم في تعريف هذه النسخة.</p> : <div className="divide-y divide-gray-100">
        {components.map(component => {
          const loan = isLoanCollectionComponent(component)
          return <div key={component.code} className="py-4 flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2"><label htmlFor={`collection-kind-${component.code}`} className="font-medium text-gray-800">{component.nameAr}</label>
                {!component.isActive && <span className="rounded-full px-2 py-0.5 text-xs bg-gray-100 text-gray-500">غير مفعل</span>}
                {loan && <span className="text-xs text-primary-700 flex gap-1 items-center"><LockKeyhole size={13} />تصنيف السلف ثابت</span>}
              </div>
              <span className="text-xs text-gray-400" dir="ltr">{component.code}</span>
            </div>
            <select id={`collection-kind-${component.code}`} className="w-full md:w-72 border border-gray-200 rounded-xl px-3 py-2.5 bg-white text-sm disabled:bg-gray-50 disabled:text-gray-500" value={kinds.get(component.code) ?? ''} disabled={!editable || loan}
              onChange={event => { setDraft(current => changeCollectionKind(current, components, component.code, event.target.value as CollectionKind | '')); setProposal('') }}>
              <option value="">اختر التصنيف</option>
              {COLLECTION_KINDS.filter(kind => loan ? kind === 'LOAN' : kind !== 'LOAN').map(kind => <option key={kind} value={kind}>{COLLECTION_LABELS[kind]}</option>)}
            </select>
          </div>
        })}
      </div>}
      {issues.length > 0 && complete && <ul className="list-disc list-inside mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 space-y-1" aria-label="مطلوب قبل الحفظ">{issues.map((issue, index) => <li key={index}>{issue}</li>)}</ul>}
    </section>

    {protectedItems.length > 0 && <section className="card border border-gray-200" aria-label="الخصومات المحمية">
      <h2 className="font-bold text-gray-800 flex gap-2 items-center"><LockKeyhole size={18} />الخصومات المحمية</h2>
      <p className="text-sm text-gray-500 mt-1">خارج ترتيب التحصيل أدناه، ولا تُنقل خلف السلف أو الخصومات الأخرى.</p>
      <div className="mt-3 flex flex-wrap gap-2">{protectedItems.map(component => <span key={component.code} className="rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-700">{component.nameAr} — {COLLECTION_LABELS[kinds.get(component.code) as CollectionKind]}{!component.isActive ? ' · غير مفعل' : ''}</span>)}</div>
    </section>}

    <section className="card space-y-4" aria-label="ترتيب تحصيل الخصومات">
      <div><h2 className="font-bold text-gray-800">٢. ترتيب التحصيل</h2><p className="text-sm text-gray-500 mt-1">البند في الأعلى يُحصّل أولًا من المتاح. استخدم الأسهم لتحديد ترتيبك.</p></div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!editable || !draft.collectionOrder.length} className="btn-secondary text-sm disabled:opacity-50" onClick={() => { setDraft(current => proposeCollectionOrder(current, 'LOAN_FIRST')); setProposal('اقتراح السلف أولًا جاهز للمراجعة. لم يُحفظ بعد.') }}>السلف أولًا</button>
        <button type="button" disabled={!editable || !draft.collectionOrder.length} className="btn-secondary text-sm disabled:opacity-50" onClick={() => { setDraft(current => proposeCollectionOrder(current, 'ATTENDANCE_RECOVERY_FIRST')); setProposal('اقتراح الحضور والاستردادات أولًا جاهز للمراجعة. لم يُحفظ بعد.') }}>الحضور والاستردادات أولًا</button>
      </div>
      {proposal && <p role="status" className="text-sm text-primary-700">{proposal}</p>}
      {draft.collectionOrder.length === 0 ? <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">لا توجد بنود مصنفة قابلة للترتيب حاليًا.</p> : <ol className="space-y-2">
        {draft.collectionOrder.map((code, index) => {
          const component = byCode.get(code)!
          return <li key={code} className="border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3" data-collection-code={code}>
            <span className="rounded-full bg-primary-50 text-primary-700 w-8 h-8 shrink-0 flex items-center justify-center font-bold">{index + 1}</span>
            <div className="flex-1 min-w-0"><p className="font-medium text-gray-800">{component.nameAr}{!component.isActive && <span className="text-xs text-gray-500 mr-2">غير مفعل</span>}</p><p className="text-xs text-gray-500 mt-1">{COLLECTION_LABELS[kinds.get(code) as CollectionKind]}</p></div>
            <div className="flex gap-1">
              <button type="button" disabled={!editable || index === 0} aria-label={`تقديم ${component.nameAr}`} className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30" onClick={() => { setDraft(current => moveCollectionItem(current, code, -1)); setProposal('') }}><ArrowUp size={17} /></button>
              <button type="button" disabled={!editable || index === draft.collectionOrder.length - 1} aria-label={`تأخير ${component.nameAr}`} className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-30" onClick={() => { setDraft(current => moveCollectionItem(current, code, 1)); setProposal('') }}><ArrowDown size={17} /></button>
            </div>
          </li>
        })}
      </ol>}
    </section>

    <section className="card space-y-4" aria-label="حفظ ترتيب التحصيل">
      <div className="flex items-center justify-between gap-3"><h2 className="font-bold text-gray-800">٣. مراجعة وحفظ</h2>{dirty && <span className="text-sm text-amber-700">تعديلات غير محفوظة</span>}</div>
      <div><label htmlFor="collection-save-reason" className="block text-sm font-medium text-gray-700 mb-2">سبب التعديل <span className="text-red-500">*</span></label>
        <textarea id="collection-save-reason" value={reason} onChange={event => setReason(event.target.value)} disabled={!editable} maxLength={500} rows={2} className="w-full border border-gray-200 rounded-xl p-3 text-sm disabled:bg-gray-50" placeholder="اكتب سبب اختيار هذا الترتيب ليُحفظ في سجل التغييرات" />
      </div>
      {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800 space-y-2"><p>{error}</p>{conflict && <p>لم تُحذف تعديلاتك أو سببها. راجعها قبل إعادة تحميل أحدث نسخة؛ إعادة الحفظ متوقفة حتى تحميلها.</p>}</div>}
      {confirmReload && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3" role="alert">
        <p className="text-sm text-amber-900">إعادة التحميل تستبدل التعديلات غير المحفوظة عند نجاح القراءة.</p>
        <div className="flex gap-2"><button type="button" className="btn-secondary text-sm" disabled={saving} onClick={reload}>تجاهل التعديلات وإعادة التحميل</button><button type="button" className="text-sm text-gray-600 px-3" disabled={saving} onClick={() => setConfirmReload(false)}>البقاء</button></div>
      </div>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={!editable || !!issues.length || !reason.trim()} className="btn-primary flex gap-2 items-center disabled:opacity-50"><Save size={18} />{saving ? 'جارٍ الحفظ أو التحميل…' : 'حفظ ترتيب التحصيل'}</button>
        <button type="button" disabled={saving} className="btn-secondary text-sm disabled:opacity-50" onClick={() => dirty ? setConfirmReload(true) : void reload()}>إعادة تحميل النسخة</button>
        {!dirty && view.collectionState === 'COMPLETE' && <span className="flex items-center gap-1 text-sm text-green-700"><CheckCircle2 size={16} />الترتيب المحفوظ معروض</span>}
      </div>
    </section>
  </div>
}
