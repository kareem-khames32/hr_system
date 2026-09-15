'use client'

// الخطوة 16: «مسير جديد» — اسم ونسخة سياسة منشورة وشهر (الفترة من دورتها)، وفلاتر فرع ← قسم ← فريق أو قائمة،
// واستبعادات بسبب إجباري، ومعاينة عضوية حقيقية قبل الحفظ. الحفظ ينشئ مسودة فقط؛ الحساب زر منفصل.
// الاستبعاد متاح لأي موظف تعرضه المعاينة داخل النطاق — ومنهم أصحاب مشاكل البيانات التي تمنع «احتساب المسودة».
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ApiBranch, ApiDepartment, ApiEmployee, ApiTeam } from '../../lib/api'
import { fetchPayrollPolicies } from '../../lib/payroll-policies-api'
import {
  createPayrollRunDraft, emptyRunFilters, linkedFilterOptions, payrollExclusionCandidates, payrollRunErrorCode, payrollRunErrorMessage, previewPayrollRunDefinition,
  pruneLinkedFilters, publishedPolicyVersions, updatePayrollRunDraft,
  type PayrollExclusionCandidate, type PayrollMembershipPreview, type PayrollRunExclusionInput, type PayrollRunFiltersInput, type PayrollRunWithSelection,
  type PublishedPolicyVersionOption,
} from '../../lib/payroll-runs-api'
import { PayrollMembershipPreviewView } from './PayrollMembershipPreviewView'

type Mode = 'FILTERS' | 'LIST'

function ToggleList<T extends { id: number; name: string }>({ label, rows, selected, disabled, onChange, empty }: {
  label: string; rows: T[]; selected: number[]; disabled?: boolean; onChange: (ids: number[]) => void; empty: string
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-gray-700">{label} <span className="text-xs text-gray-400">(أي منها)</span></p>
      <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto rounded-xl border border-gray-100 p-2">
        {rows.length === 0 && <span className="text-xs text-gray-400">{empty}</span>}
        {rows.map(row => {
          const on = selected.includes(row.id)
          return <button key={row.id} type="button" disabled={disabled} aria-pressed={on}
            onClick={() => onChange(on ? selected.filter(id => id !== row.id) : [...selected, row.id])}
            className={`px-2 py-1 rounded-lg text-xs border ${on ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-200'}`}>{row.name}</button>
        })}
      </div>
    </div>
  )
}

export function PayrollRunDefinitionPanel({ branches, departments, teams, employees, currency, draft, onSaved, onCancel }: {
  branches: ApiBranch[]; departments: ApiDepartment[]; teams: ApiTeam[]; employees: ApiEmployee[]; currency: string
  draft?: PayrollRunWithSelection | null
  onSaved: (run: PayrollRunWithSelection) => void
  onCancel: () => void
}) {
  const [policies, setPolicies] = useState<PublishedPolicyVersionOption[]>([])
  const [policiesError, setPoliciesError] = useState('')
  const [name, setName] = useState(draft?.name ?? '')
  const [policyVersionId, setPolicyVersionId] = useState<number | null>(draft?.policyVersionId ?? null)
  const [period, setPeriod] = useState(draft?.period ?? '')
  const [mode, setMode] = useState<Mode>(draft?.selection?.filters.employeeIds.length ? 'LIST' : 'FILTERS')
  const [filters, setFilters] = useState<PayrollRunFiltersInput>(() => draft?.selection ? {
    branchIds: draft.selection.filters.branchIds, departmentIds: draft.selection.filters.departmentIds,
    teamIds: draft.selection.filters.teamIds, employeeIds: draft.selection.filters.employeeIds } : emptyRunFilters())
  const [exclusions, setExclusions] = useState<PayrollRunExclusionInput[]>(draft?.selection?.exclusions.map(row => ({ employeeId: row.employeeId, reason: row.reason })) ?? [])
  const [exclusionEmployee, setExclusionEmployee] = useState<number | ''>('')
  const [exclusionReason, setExclusionReason] = useState('')
  const [search, setSearch] = useState('')
  const [confirmEmpty, setConfirmEmpty] = useState(!!draft?.selection?.emptyScope)
  const [emptyReason, setEmptyReason] = useState(draft?.selection?.emptyScope?.reason ?? '')
  const [preview, setPreview] = useState<PayrollMembershipPreview | null>(null)
  // مرشحو الاستبعاد من آخر معاينة لنفس النطاق: يبقون بعد إضافة استبعاد (فتسقط المعاينة) ويُمسحون عند تغيير النطاق.
  const [candidates, setCandidates] = useState<PayrollExclusionCandidate[]>([])
  const reasonRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [needsEmptyConfirmation, setNeedsEmptyConfirmation] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchPayrollPolicies().then(rows => { if (!cancelled) setPolicies(publishedPolicyVersions(rows)) })
      .catch(e => { if (!cancelled) setPoliciesError(payrollRunErrorMessage(e, 'تعذر تحميل سياسات الرواتب المنشورة')) })
    return () => { cancelled = true }
  }, [])

  // أي تغيير في التعريف يُسقط المعاينة السابقة حتى لا يُحفظ تعريف بمعاينة قديمة.
  useEffect(() => { setPreview(null) }, [policyVersionId, period, mode, filters, exclusions, confirmEmpty, emptyReason])
  useEffect(() => { setCandidates([]) }, [policyVersionId, period, mode, filters])

  const options = useMemo(() => linkedFilterOptions(branches, departments, teams, filters), [branches, departments, teams, filters])
  const selectedFilters: PayrollRunFiltersInput = mode === 'LIST'
    ? { branchIds: filters.branchIds, departmentIds: [], teamIds: [], employeeIds: filters.employeeIds }
    : { ...filters, employeeIds: [] }
  const input = policyVersionId && /^\d{4}-\d{2}$/.test(period) ? {
    name: name.trim() || undefined, policyVersionId, period, filters: selectedFilters, exclusions,
    ...(confirmEmpty ? { confirmEmptyScope: true, emptyScopeReason: emptyReason.trim() } : {}),
  } : null
  const listCandidates = employees.filter(emp => (!filters.branchIds.length || filters.branchIds.includes(emp.branchId)) &&
    (!search.trim() || emp.fullName.includes(search.trim()) || emp.employeeCode.includes(search.trim()))).slice(0, 60)
  const employeeName = (id: number) => employees.find(emp => emp.id === id)?.fullName ?? candidates.find(row => row.employeeId === id)?.label ?? `موظف #${id}`
  const policy = policies.find(row => row.versionId === policyVersionId)
  const excludedIds = exclusions.map(row => row.employeeId)

  const setLinked = (next: PayrollRunFiltersInput) => setFilters(pruneLinkedFilters(branches, departments, teams, next))
  const runPreview = async () => {
    if (!input || busy) return
    setBusy(true); setError('')
    try {
      const result = await previewPayrollRunDefinition({ ...input, ...(draft ? { runId: draft.id } : {}) })
      setPreview(result)
      setCandidates(payrollExclusionCandidates(result))
      setNeedsEmptyConfirmation(result.emptyScopeRequiresConfirmation)
    } catch (e) {
      setPreview(null); setError(payrollRunErrorMessage(e, 'تعذرت معاينة العضوية'))
    } finally { setBusy(false) }
  }
  const save = async () => {
    if (!input || !name.trim() || busy) return
    setBusy(true); setError('')
    try {
      const run = draft ? await updatePayrollRunDraft(draft.id, { ...input, name: name.trim() }) : await createPayrollRunDraft({ ...input, name: name.trim() })
      onSaved(run)
    } catch (e) {
      if (payrollRunErrorCode(e) === 'PAYRUN-SCOPE-EMPTY') setNeedsEmptyConfirmation(true)
      setError(payrollRunErrorMessage(e, 'تعذر حفظ مسودة المسير'))
    } finally { setBusy(false) }
  }
  const addExclusion = () => {
    if (exclusionEmployee === '' || exclusionReason.trim().length < 3) return
    setExclusions([...exclusions.filter(row => row.employeeId !== exclusionEmployee), { employeeId: exclusionEmployee, reason: exclusionReason.trim() }])
    setExclusionEmployee(''); setExclusionReason('')
  }
  const chooseExclusion = (candidate: PayrollExclusionCandidate) => {
    setExclusionEmployee(candidate.employeeId)
    reasonRef.current?.focus()
  }
  const exclusionOptions = candidates.length
    ? candidates.filter(row => !excludedIds.includes(row.employeeId)).map(row => ({ id: row.employeeId, label: row.label }))
    : (mode === 'LIST' ? filters.employeeIds.filter(id => !excludedIds.includes(id)).map(id => ({ id, label: employeeName(id) })) : [])
  const blockingProblems = candidates.filter(row => row.dataProblem && !excludedIds.includes(row.employeeId))

  return (
    <div className="card border-2 border-primary-100 space-y-4" data-testid="payroll-run-definition">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-bold text-gray-800">{draft ? `تعديل مسودة المسير #${draft.id}` : 'مسير جديد'}</h3>
          <p className="text-xs text-gray-500">الحفظ ينشئ مسودة بلا مبالغ؛ «احتساب المسودة» خطوة منفصلة عن «إعادة حساب مسير». تُحفظ نسخة السياسة ودورتها على المسير، والمبالغ تُحسب حاليًا بالمسار القائم (وضع SHADOW).</p>
        </div>
        <button type="button" onClick={onCancel} disabled={busy} className="btn-secondary text-sm">إغلاق</button>
      </div>
      {policiesError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{policiesError}</p>}
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm text-gray-700 space-y-1">
          <span className="font-medium">اسم المسير (فريد داخل الشهر)</span>
          <input value={name} onChange={e => setName(e.target.value)} maxLength={200} disabled={busy} className="input w-full" placeholder="مثل: مسير فرع القاهرة — أكتوبر" />
        </label>
        <label className="text-sm text-gray-700 space-y-1">
          <span className="font-medium">نسخة السياسة المنشورة</span>
          <select value={policyVersionId ?? ''} onChange={e => setPolicyVersionId(e.target.value ? Number(e.target.value) : null)} disabled={busy} className="input w-full">
            <option value="">اختر مجموعة السياسة ونسختها</option>
            {policies.map(row => <option key={row.versionId} value={row.versionId}>{row.label}</option>)}
          </select>
          {policies.length === 0 && !policiesError && <span className="text-xs text-amber-700">لا توجد نسخة منشورة؛ انشر نسخة من «سياسات الرواتب» أولًا.</span>}
        </label>
        <label className="text-sm text-gray-700 space-y-1">
          <span className="font-medium">شهر الراتب</span>
          <input type="month" value={period} onChange={e => setPeriod(e.target.value)} disabled={busy} className="input w-full" dir="ltr" />
          {policy && <span className="text-xs text-gray-500">الفترة من دورة السياسة (بداية يوم {policy.cycleStartDay ?? '—'})؛ تظهر التواريخ الدقيقة في المعاينة.</span>}
        </label>
      </div>

      <div className="flex items-center bg-gray-100 rounded-xl p-1 w-fit">
        {(['FILTERS', 'LIST'] as Mode[]).map(value => <button key={value} type="button" onClick={() => setMode(value)} disabled={busy}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium ${mode === value ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600'}`}>
          {value === 'FILTERS' ? 'فلاتر: فرع ← قسم ← فريق' : 'قائمة موظفين محددة'}</button>)}
      </div>
      <p className="text-xs text-gray-500">داخل النوع الواحد الاختيار «أو»، وبين الأنواع «و». العضوية بمكان الموظف في التنظيم آخر يوم في الفترة؛ القائمة الثابتة تبقى كما هي حتى لو انتقل الموظف.</p>
      <div className="grid gap-3 md:grid-cols-3">
        <ToggleList label="الفروع" rows={options.branches} selected={filters.branchIds} disabled={busy} empty="لا توجد فروع"
          onChange={branchIds => setLinked({ ...filters, branchIds })} />
        {mode === 'FILTERS' && <ToggleList label="الأقسام" rows={options.departments} selected={filters.departmentIds} disabled={busy} empty="لا أقسام ضمن الفروع المختارة"
          onChange={departmentIds => setLinked({ ...filters, departmentIds })} />}
        {mode === 'FILTERS' && <ToggleList label="الفرق" rows={options.teams} selected={filters.teamIds} disabled={busy} empty="لا فرق ضمن الاختيار"
          onChange={teamIds => setLinked({ ...filters, teamIds })} />}
        {mode === 'LIST' && <div className="md:col-span-2 space-y-1">
          <p className="text-sm font-medium text-gray-700">الموظفون ({filters.employeeIds.length})</p>
          <input value={search} onChange={e => setSearch(e.target.value)} className="input w-full" placeholder="بحث بالاسم أو الرقم الوظيفي" disabled={busy} />
          <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto rounded-xl border border-gray-100 p-2">
            {listCandidates.map(emp => {
              const on = filters.employeeIds.includes(emp.id)
              return <button key={emp.id} type="button" aria-pressed={on} disabled={busy}
                onClick={() => setFilters({ ...filters, employeeIds: on ? filters.employeeIds.filter(id => id !== emp.id) : [...filters.employeeIds, emp.id] })}
                className={`px-2 py-1 rounded-lg text-xs border ${on ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-200'}`}>{emp.fullName} ({emp.employeeCode})</button>
            })}
          </div>
        </div>}
      </div>

      <div className="space-y-2 rounded-xl border border-gray-100 p-3" data-testid="payroll-run-exclusions">
        <p className="text-sm font-medium text-gray-700">الاستبعادات ({exclusions.length}) — السبب إجباري</p>
        {blockingProblems.length > 0 && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {blockingProblems.length} موظف بمشكلة بيانات تمنع «احتساب المسودة»: صحح بياناتهم أو استبعدهم هنا بسبب مكتوب.</p>}
        <div className="flex flex-wrap gap-2">
          <select value={exclusionEmployee} onChange={e => setExclusionEmployee(e.target.value ? Number(e.target.value) : '')} disabled={busy || !exclusionOptions.length} className="input w-72"
            aria-label="الموظف المستبعد">
            <option value="">{exclusionOptions.length ? 'اختر موظفًا من المعاينة (داخلون أو مستبعدون تلقائيًا)' : 'اعرض المعاينة لاختيار موظف'}</option>
            {exclusionOptions.map(row => <option key={row.id} value={row.id}>{row.label}</option>)}
          </select>
          <input ref={reasonRef} value={exclusionReason} onChange={e => setExclusionReason(e.target.value)} maxLength={500} disabled={busy} className="input flex-1 min-w-48"
            aria-label="سبب الاستبعاد" placeholder="سبب الاستبعاد (مثل: يُصرف في مسير الإدارة العليا)" />
          <button type="button" onClick={addExclusion} disabled={busy || exclusionEmployee === '' || exclusionReason.trim().length < 3} className="btn-secondary text-sm disabled:opacity-50">إضافة استبعاد</button>
        </div>
        {exclusions.map(row => <div key={row.employeeId} className="flex items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm">
          <span>{employeeName(row.employeeId)} — {row.reason}</span>
          <button type="button" onClick={() => setExclusions(exclusions.filter(item => item.employeeId !== row.employeeId))} disabled={busy} className="text-xs text-red-700 underline">إزالة</button>
        </div>)}
      </div>

      {(needsEmptyConfirmation || confirmEmpty) && <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3">
        <label className="flex items-center gap-2 text-sm text-red-800">
          <input type="checkbox" checked={confirmEmpty} onChange={e => setConfirmEmpty(e.target.checked)} disabled={busy} />
          تأكيد نطاق فارغ مقصود (لا يضم أي موظف في آخر يوم من الفترة)
        </label>
        {confirmEmpty && <input value={emptyReason} onChange={e => setEmptyReason(e.target.value)} maxLength={500} disabled={busy} className="input w-full" placeholder="سبب قبول النطاق الفارغ" />}
      </div>}

      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={runPreview} disabled={busy || !input} className="btn-secondary disabled:opacity-50">معاينة العضوية</button>
        <button type="button" onClick={save} disabled={busy || !input || !name.trim() || (confirmEmpty && emptyReason.trim().length < 3)} className="btn-primary disabled:opacity-50">
          {draft ? 'حفظ تعديل المسودة' : 'حفظ كمسودة'}</button>
        {preview?.nameTaken && <span className="text-sm text-red-700">الاسم مستخدم لمسير آخر في هذا الشهر</span>}
      </div>
      {preview && <PayrollMembershipPreviewView preview={preview} currency={currency} onExclude={chooseExclusion} excludedIds={excludedIds} disabled={busy} />}
    </div>
  )
}
