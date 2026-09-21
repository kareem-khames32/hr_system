'use client'

// الخطوة 16: «مسير جديد» — اسم ومعادلات رواتب وشهر (الفترة من دورتها)، وفلاتر فرع ← قسم ← فريق أو قائمة،
// واستبعادات بسبب إجباري، ومعاينة عضوية حقيقية قبل الحفظ. الحفظ ينشئ مسودة فقط؛ الحساب زر منفصل.
// تبسيط الرواتب: «مسير الشهر التالي» يفتح اللوحة نفسها معبأة من مسير سابق (initial) ويحفظ بـcreatePayrollRunDraft نفسه.
import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchEmployeeDirectory, type ApiBranch, type ApiDepartment, type ApiEmployee, type ApiTeam } from '../../lib/api'
import { fetchPayrollPolicies } from '../../lib/payroll-policies-api'
import { dayRangeLabel, payrollMonthBounds } from '../../lib/payroll-month-range'
import {
  createPayrollRunDraft, emptyRunFilters, linkedFilterOptions, payrollExclusionCandidates, payrollRunErrorCode, payrollRunErrorMessage,
  payrollScopeCoversEmployee, payrollScopeSummary, previewPayrollRunDefinition, pruneLinkedFilters, publishedPolicyVersions, updatePayrollRunDraft,
  type PayrollExclusionCandidate, type PayrollMembershipPreview, type PayrollRunExclusionInput, type PayrollRunFiltersInput, type PayrollRunWithSelection,
  type PublishedPolicyVersionOption,
} from '../../lib/payroll-runs-api'
import { PayrollMembershipPreviewView } from './PayrollMembershipPreviewView'

type Mode = 'FILTERS' | 'LIST'

/** تعبئة مسبقة لمسير جديد (مسير الشهر التالي): الاسم والشهر والمعادلة (المجموعة) والفلاتر والاستبعادات بأسبابها. */
export interface PayrollRunDefinitionInitial {
  name: string; period: string; policyId: number | null
  filters: PayrollRunFiltersInput; exclusions: PayrollRunExclusionInput[]
}

// نسخة المعادلة لمسير الشهر التالي: الأحدث أولًا، ويُسأل الخادم بمعاينة التعريف نفسه (هو وحده يحسب فترة الشهر وسريان النسخة)؛
// رفض سريان النسخة أو دورتها يعني تجربة الأقدم، وأي رد آخر يعني أن النسخة صالحة للشهر.
const POLICY_VERSION_UNUSABLE = new Set(['PAYRUN-POLICY-PERIOD', 'PAYRUN-POLICY-CYCLE-MISSING', 'PAYRUN-POLICY-CYCLE-INVALID', 'PAYRUN-POLICY-NOT-PUBLISHED', 'PAYRUN-POLICY-NOT-FOUND'])
async function seedPolicyVersion(options: PublishedPolicyVersionOption[], seed: PayrollRunDefinitionInitial): Promise<PublishedPolicyVersionOption | null> {
  if (seed.policyId == null || !/^\d{4}-\d{2}$/.test(seed.period)) return null
  const filters: PayrollRunFiltersInput = seed.filters.employeeIds.length
    ? { branchIds: seed.filters.branchIds, departmentIds: [], teamIds: [], employeeIds: seed.filters.employeeIds, includeEmployeeIds: seed.filters.includeEmployeeIds ?? [] }
    : { ...seed.filters, employeeIds: [], includeEmployeeIds: seed.filters.includeEmployeeIds ?? [] }
  for (const option of options.filter(row => row.policyId === seed.policyId).sort((a, b) => b.versionNo - a.versionNo)) {
    try {
      await previewPayrollRunDefinition({ policyVersionId: option.versionId, period: seed.period, filters, exclusions: seed.exclusions })
      return option
    } catch (e) {
      if (!POLICY_VERSION_UNUSABLE.has(payrollRunErrorCode(e) ?? '')) return option
    }
  }
  return null
}

/**
 * صندوق اختيار بشِبس. الفاضي في المحرك = بلا تقييد، فالصندوق بيقول كده صراحةً:
 * شريحة «كل …» مختارة افتراضيًا، والضغط عليها (أو شيل كل الشِبس) يرجّع للحالة دي.
 */
function ToggleList<T extends { id: number; name: string }>({ label, rows, selected, disabled, onChange, empty, allLabel, allActive, hint }: {
  label: string; rows: T[]; selected: number[]; disabled?: boolean; onChange: (ids: number[]) => void; empty: string
  allLabel?: string; allActive?: boolean; hint?: string
}) {
  const allOn = allActive ?? selected.length === 0
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-gray-700">{label}{selected.length ? ` — ${selected.length} مختار` : ''}</p>
      <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto rounded-xl border border-gray-100 p-2">
        {allLabel && <button type="button" disabled={disabled} aria-pressed={allOn} data-scope-all={allLabel} onClick={() => onChange([])}
          className={`px-2 py-1 rounded-lg text-xs border font-medium ${allOn ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-primary-700 border-primary-200 border-dashed'}`}>{allLabel}</button>}
        {rows.length === 0 && <span className="text-xs text-gray-400">{empty}</span>}
        {rows.map(row => {
          const on = selected.includes(row.id)
          return <button key={row.id} type="button" disabled={disabled} aria-pressed={on}
            onClick={() => onChange(on ? selected.filter(id => id !== row.id) : [...selected, row.id])}
            className={`px-2 py-1 rounded-lg text-xs border ${on ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-200'}`}>{row.name}</button>
        })}
      </div>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

export function PayrollRunDefinitionPanel({ branches, departments, teams, employees, currency, draft, initial, onSaved, onCancel }: {
  branches: ApiBranch[]; departments: ApiDepartment[]; teams: ApiTeam[]; employees: ApiEmployee[]; currency: string
  draft?: PayrollRunWithSelection | null
  initial?: PayrollRunDefinitionInitial | null
  onSaved: (run: PayrollRunWithSelection) => void
  onCancel: () => void
}) {
  const seed = draft ? null : initial ?? null
  const [policies, setPolicies] = useState<PublishedPolicyVersionOption[]>([])
  const [policiesError, setPoliciesError] = useState('')
  const [policyMissingForSeed, setPolicyMissingForSeed] = useState(false)
  const [name, setName] = useState(draft?.name ?? seed?.name ?? '')
  const [policyVersionId, setPolicyVersionId] = useState<number | null>(draft?.policyVersionId ?? null)
  const [period, setPeriod] = useState(draft?.period ?? seed?.period ?? '')
  const [mode, setMode] = useState<Mode>((draft?.selection?.filters.employeeIds.length ?? seed?.filters.employeeIds.length) ? 'LIST' : 'FILTERS')
  // القائمة الدائمة (المضافون للمسير) تُحمل وتُعاد كما هي مع أي تعديل للتعريف، فما تسقطش عضويتهم
  const [filters, setFilters] = useState<PayrollRunFiltersInput>(() => draft?.selection ? {
    branchIds: draft.selection.filters.branchIds, departmentIds: draft.selection.filters.departmentIds,
    teamIds: draft.selection.filters.teamIds, employeeIds: draft.selection.filters.employeeIds,
    includeEmployeeIds: draft.selection.filters.includeEmployeeIds ?? [] }
    : seed ? { branchIds: seed.filters.branchIds, departmentIds: seed.filters.departmentIds, teamIds: seed.filters.teamIds, employeeIds: seed.filters.employeeIds,
      includeEmployeeIds: seed.filters.includeEmployeeIds ?? [] }
    : emptyRunFilters())
  const [exclusions, setExclusions] = useState<PayrollRunExclusionInput[]>(draft?.selection?.exclusions.map(row => ({ employeeId: row.employeeId, reason: row.reason }))
    ?? seed?.exclusions.map(row => ({ employeeId: row.employeeId, reason: row.reason })) ?? [])
  const [exclusionEmployee, setExclusionEmployee] = useState<number | ''>('')
  const [exclusionReason, setExclusionReason] = useState('')
  // منتقي الاستبعاد شغّال من أول ما تفتح اللوحة: بحث بالاسم أو الرقم الوظيفي في موظفي نطاق المستخدم.
  const [exclusionSearch, setExclusionSearch] = useState('')
  const [directory, setDirectory] = useState<Array<{ id: number; fullName: string; employeeCode: string }>>([])
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
    fetchPayrollPolicies().then(async rows => {
      if (cancelled) return
      const options = publishedPolicyVersions(rows)
      setPolicies(options)
      // مسير الشهر التالي: أحدث نسخة منشورة من المعادلة نفسها يقبلها الخادم لهذا الشهر، وإلا يُترك الاختيار فارغًا.
      if (seed) {
        const match = await seedPolicyVersion(options, seed)
        if (cancelled) return
        setPolicyVersionId(match?.versionId ?? null)
        setPolicyMissingForSeed(!match)
      }
    }).catch(e => { if (!cancelled) setPoliciesError(payrollRunErrorMessage(e, 'تعذر تحميل معادلات الرواتب')) })
    return () => { cancelled = true }
    // التعبئة المسبقة تُقرأ مرة واحدة عند فتح اللوحة
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // بلا صلاحية «عرض الموظفين» تفضل قائمة الشاشة فاضية، فيُقرأ دليل النشطين في نطاق المستخدم (نفس تحديد الفرع في الخادم).
  useEffect(() => {
    if (employees.length) return
    let cancelled = false
    fetchEmployeeDirectory().then(rows => { if (!cancelled) setDirectory(rows) }).catch(() => { if (!cancelled) setDirectory([]) })
    return () => { cancelled = true }
  }, [employees.length])

  // أي تغيير في التعريف يُسقط المعاينة السابقة حتى لا يُحفظ تعريف بمعاينة قديمة.
  useEffect(() => { setPreview(null) }, [policyVersionId, period, mode, filters, exclusions, confirmEmpty, emptyReason])
  useEffect(() => { setCandidates([]) }, [policyVersionId, period, mode, filters])

  const options = useMemo(() => linkedFilterOptions(branches, departments, teams, filters), [branches, departments, teams, filters])
  const selectedFilters: PayrollRunFiltersInput = mode === 'LIST'
    ? { branchIds: filters.branchIds, departmentIds: [], teamIds: [], employeeIds: filters.employeeIds, includeEmployeeIds: filters.includeEmployeeIds ?? [] }
    : { ...filters, employeeIds: [], includeEmployeeIds: filters.includeEmployeeIds ?? [] }
  const input = policyVersionId && /^\d{4}-\d{2}$/.test(period) ? {
    name: name.trim() || undefined, policyVersionId, period, filters: selectedFilters, exclusions,
    ...(confirmEmpty ? { confirmEmptyScope: true, emptyScopeReason: emptyReason.trim() } : {}),
  } : null
  const listCandidates = employees.filter(emp => (!filters.branchIds.length || filters.branchIds.includes(emp.branchId)) &&
    (!search.trim() || emp.fullName.includes(search.trim()) || emp.employeeCode.includes(search.trim()))).slice(0, 60)
  const employeeName = (id: number) => employees.find(emp => emp.id === id)?.fullName ?? directory.find(row => row.id === id)?.fullName
    ?? candidates.find(row => row.employeeId === id)?.label ?? 'موظف غير معروف'
  const employeeCode = (id: number) => employees.find(emp => emp.id === id)?.employeeCode ?? directory.find(row => row.id === id)?.employeeCode ?? null
  const policy = policies.find(row => row.versionId === policyVersionId)
  const excludedIds = exclusions.map(row => row.employeeId)
  // التعريف الجديد يشمل الأقسام الفرعية؛ مسير قديم محفوظ بنطاق القسم نفسه فقط يُقرأ كما حُسب.
  const includeSubDepartments = draft?.selection?.filters.includeSubDepartments !== false
  const scope = payrollScopeSummary(branches, departments, teams, selectedFilters, mode, includeSubDepartments)
  // من يمكن اختياره للاستبعاد: موظفو نطاق المستخدم (بحث بالاسم أو الرقم)، وفي «قائمة موظفين محددة» أعضاء القائمة فقط
  // (الخادم يرفض استبعاد من ليس في القائمة: PAYRUN-EXCLUSION-NOT-LISTED)، ومع الفلاتر يُقبل الجميع وخارج النطاق يُعلَّم.
  const people = employees.length
    ? employees.map(emp => ({ id: emp.id, fullName: emp.fullName, employeeCode: emp.employeeCode, branchId: emp.branchId, departmentId: emp.departmentId ?? null, teamId: emp.teamId ?? null }))
    : directory.map(row => ({ id: row.id, fullName: row.fullName, employeeCode: row.employeeCode, branchId: null as number | null, departmentId: null as number | null, teamId: null as number | null }))
  const inScope = (id: number) => {
    const person = people.find(row => row.id === id)
    return person ? payrollScopeCoversEmployee(departments, selectedFilters, person, includeSubDepartments) : true
  }
  const exclusionSearchTerm = exclusionSearch.trim()
  const exclusionMatches = people
    .filter(person => !excludedIds.includes(person.id) && person.id !== exclusionEmployee)
    .filter(person => mode !== 'LIST' || filters.employeeIds.includes(person.id))
    .filter(person => !exclusionSearchTerm || person.fullName.includes(exclusionSearchTerm) || person.employeeCode.includes(exclusionSearchTerm))
    .map(person => ({ ...person, covered: payrollScopeCoversEmployee(departments, selectedFilters, person, includeSubDepartments) }))
    .sort((a, b) => Number(b.covered) - Number(a.covered))
  const exclusionResults = exclusionMatches.slice(0, 12)

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
    setExclusionEmployee(''); setExclusionReason(''); setExclusionSearch('')
  }
  const chooseExclusion = (candidate: PayrollExclusionCandidate) => {
    setExclusionEmployee(candidate.employeeId)
    reasonRef.current?.focus()
  }
  const pickExclusion = (employeeId: number) => {
    setExclusionEmployee(employeeId); setExclusionSearch('')
    reasonRef.current?.focus()
  }
  const dataProblems = candidates.filter(row => row.dataProblem && !excludedIds.includes(row.employeeId))

  return (
    <div className="card border-2 border-primary-100 space-y-4" data-testid="payroll-run-definition">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-bold text-gray-800">{draft ? 'تعديل مسودة المسير' : seed ? 'مسير الشهر التالي' : 'مسير جديد'}</h3>
          <p className="text-xs text-gray-500">{seed
            ? 'نفس الاسم والموظفين والمستبعدين للشهر التالي؛ راجعها ثم احفظها كمسودة واحسبها.'
            : 'الحفظ ينشئ مسودة بلا مبالغ، ثم «احتساب المسودة» يحسب الرواتب.'}</p>
        </div>
        <button type="button" onClick={onCancel} disabled={busy} className="btn-secondary text-sm">إغلاق</button>
      </div>
      {policiesError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{policiesError}</p>}
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm text-gray-700 space-y-1">
          <span className="font-medium">اسم المسير (فريد داخل الشهر)</span>
          <input value={name} onChange={e => setName(e.target.value)} maxLength={200} disabled={busy} className="input w-full" placeholder="مثل: مسير فرع المعادي" />
        </label>
        <label className="text-sm text-gray-700 space-y-1">
          <span className="font-medium">معادلات الرواتب</span>
          <select value={policyVersionId ?? ''} onChange={e => { setPolicyVersionId(e.target.value ? Number(e.target.value) : null); setPolicyMissingForSeed(false) }} disabled={busy} className="input w-full">
            <option value="">اختر المعادلات</option>
            {policies.map(row => <option key={row.versionId} value={row.versionId}>{row.label}</option>)}
          </select>
          {policies.length === 0 && !policiesError && <span className="text-xs text-amber-700">لا توجد معادلات مفعّلة؛ فعّل معادلة من «معادلات الرواتب» أولًا.</span>}
          {policyMissingForSeed && !policyVersionId && policies.length > 0 && <span className="text-xs text-amber-700">لا توجد معادلة من نفس المجموعة سارية على الشهر الجديد؛ اختر المعادلات.</span>}
        </label>
        <label className="text-sm text-gray-700 space-y-1">
          <span className="font-medium">شهر الراتب</span>
          <input type="month" value={period} onChange={e => setPeriod(e.target.value)} disabled={busy} className="input w-full" dir="ltr" />
          {policy && (policy.cycleStartDay && /^\d{4}-(0[1-9]|1[0-2])$/.test(period)
            ? <span className="text-xs text-gray-500" data-run-period-range>الفترة: {dayRangeLabel(payrollMonthBounds(period, policy.cycleStartDay))} (تبدأ يوم {policy.cycleStartDay})</span>
            : <span className="text-xs text-gray-500">الفترة تبدأ يوم {policy.cycleStartDay ?? '—'}؛ التواريخ الدقيقة تظهر في المعاينة.</span>)}
        </label>
      </div>

      <div className="flex items-center bg-gray-100 rounded-xl p-1 w-fit">
        {(['FILTERS', 'LIST'] as Mode[]).map(value => <button key={value} type="button" onClick={() => setMode(value)} disabled={busy}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium ${mode === value ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600'}`}>
          {value === 'FILTERS' ? 'فلاتر: فرع ← قسم ← فريق' : 'قائمة موظفين محددة'}</button>)}
      </div>
      {mode === 'FILTERS' && <p className="rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-900">
        اختر الفرع وبس: «كل الأقسام» و«كل الفرق» مختارة افتراضيًا، يعني الفرع كله داخل المسير من غير ما تعلّم على أي قسم.
        علّم على قسم أو فريق بس لو عايز تضيّق النطاق جوه الفرع.</p>}
      <div className="grid gap-3 md:grid-cols-3">
        <ToggleList label="الفروع" rows={options.branches} selected={filters.branchIds} disabled={busy} empty="لا توجد فروع"
          allLabel="كل الفروع" allActive={!filters.branchIds.length && (mode === 'LIST' || filters.departmentIds.length > 0 || filters.teamIds.length > 0)}
          hint={mode === 'FILTERS' && !filters.branchIds.length && !filters.departmentIds.length && !filters.teamIds.length ? 'لسه ما اخترتش حاجة: اختر فرعًا عشان يدخل المسير موظفين.' : undefined}
          onChange={branchIds => setLinked({ ...filters, branchIds })} />
        {mode === 'FILTERS' && <ToggleList label="الأقسام" rows={options.departments} selected={filters.departmentIds} disabled={busy} empty="لا أقسام ضمن الفروع المختارة"
          allLabel="كل الأقسام" hint="فاضية = كل أقسام الفرع المختار (مش لازم تعلّم عليها كلها)."
          onChange={departmentIds => setLinked({ ...filters, departmentIds })} />}
        {mode === 'FILTERS' && <ToggleList label="الفرق" rows={options.teams} selected={filters.teamIds} disabled={busy} empty="لا فرق ضمن الاختيار"
          allLabel="كل الفرق" hint="فاضية = كل فرق الأقسام المختارة."
          onChange={teamIds => setLinked({ ...filters, teamIds })} />}
        {mode === 'LIST' && <div className="md:col-span-2 space-y-1">
          <p className="text-sm font-medium text-gray-700">الموظفون ({filters.employeeIds.length})</p>
          <input value={search} onChange={e => setSearch(e.target.value)} className="input w-full" placeholder="بحث بالاسم أو الرقم الوظيفي" disabled={busy} />
          <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto rounded-xl border border-gray-100 p-2">
            {listCandidates.map(emp => {
              const on = filters.employeeIds.includes(emp.id)
              return <button key={emp.id} type="button" aria-pressed={on} disabled={busy}
                onClick={() => setFilters(previous => ({ ...previous, employeeIds: previous.employeeIds.includes(emp.id)
                  ? previous.employeeIds.filter(id => id !== emp.id) : [...previous.employeeIds, emp.id] }))}
                className={`px-2 py-1 rounded-lg text-xs border ${on ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-200'}`}>{emp.fullName} ({emp.employeeCode})</button>
            })}
          </div>
        </div>}
      </div>
      {/* جملة النطاق الحيّة: تقرأ الاختيار الحالي بالعربي وتتغير مع كل ضغطة، فما حدش يخمّن معنى «سيبت الأقسام فاضية». */}
      <p data-testid="payroll-run-scope-summary" role="status"
        className={`rounded-xl px-3 py-2 text-sm ${scope.empty ? 'bg-red-50 text-red-800' : 'bg-gray-50 text-gray-800'}`}>{scope.text}</p>

      <div className="space-y-2 rounded-xl border border-gray-100 p-3" data-testid="payroll-run-exclusions">
        <p className="text-sm font-medium text-gray-700">الاستبعادات ({exclusions.length}) — السبب إجباري</p>
        <p className="text-xs text-gray-500">{mode === 'LIST'
          ? 'ابحث باسم الموظف أو رقمه الوظيفي من داخل قائمة المسير، اكتب السبب، ثم «إضافة استبعاد».'
          : 'عايز تستثني واحد أو كام واحد من الفرع؟ ابحث باسمه أو رقمه الوظيفي هنا، اكتب السبب، ثم «إضافة استبعاد» — من غير ما تستنى المعاينة.'}</p>
        {dataProblems.length > 0 && <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {dataProblems.length} موظف بيانات خدمته غير مكتملة: سيُستبعد من الحساب حتى تُصحح بياناته.</p>}
        <div className="flex flex-wrap gap-2">
          <div className="w-72 space-y-1">
            {exclusionEmployee === ''
              ? <input value={exclusionSearch} onChange={e => setExclusionSearch(e.target.value)} disabled={busy} className="input w-full"
                  aria-label="الموظف المستبعد" placeholder="ابحث بالاسم أو الرقم الوظيفي" data-testid="payroll-run-exclusion-search" />
              : <div className="flex items-center justify-between gap-2 rounded-xl border border-primary-200 bg-primary-50 px-3 py-2 text-sm">
                  <span>{employeeName(exclusionEmployee)}{employeeCode(exclusionEmployee) ? ` (${employeeCode(exclusionEmployee)})` : ''}</span>
                  <button type="button" onClick={() => { setExclusionEmployee(''); setExclusionSearch('') }} disabled={busy} className="text-xs text-primary-700 underline">غيّر</button>
                </div>}
          </div>
          <input ref={reasonRef} value={exclusionReason} onChange={e => setExclusionReason(e.target.value)} maxLength={500} disabled={busy} className="input flex-1 min-w-48"
            aria-label="سبب الاستبعاد" placeholder="سبب الاستبعاد (مثل: يُصرف في مسير الإدارة العليا)" />
          <button type="button" onClick={addExclusion} disabled={busy || exclusionEmployee === '' || exclusionReason.trim().length < 3} className="btn-secondary text-sm disabled:opacity-50">إضافة استبعاد</button>
        </div>
        {exclusionEmployee === '' && <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto rounded-xl border border-gray-100 p-2" data-testid="payroll-run-exclusion-results">
          {!people.length && <span className="text-xs text-gray-400">لا توجد قائمة موظفين متاحة لحسابك؛ اعرض المعاينة واستبعد من صفوفها.</span>}
          {!!people.length && !exclusionResults.length && <span className="text-xs text-gray-400">
            {mode === 'LIST' ? 'لا أحد في قائمة المسير يطابق البحث' : 'لا موظف يطابق البحث'}</span>}
          {exclusionResults.map(person => <button key={person.id} type="button" onClick={() => pickExclusion(person.id)} disabled={busy}
            data-exclusion-pick={person.id}
            className={`px-2 py-1 rounded-lg text-xs border ${person.covered ? 'bg-white text-gray-700 border-gray-200' : 'bg-amber-50 text-amber-900 border-amber-200'}`}>
            {person.fullName} ({person.employeeCode}){person.covered ? '' : ' — خارج النطاق'}</button>)}
          {exclusionMatches.length > exclusionResults.length && <span className="text-xs text-gray-400">+{exclusionMatches.length - exclusionResults.length} غيرهم — ضيّق البحث</span>}
        </div>}
        {exclusionEmployee !== '' && !inScope(exclusionEmployee) && <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {employeeName(exclusionEmployee)} خارج النطاق المختار بملفه الحالي — الاستبعاد يُحفظ لكنه لن ينطبق على أحد داخل النطاق.</p>}
        {exclusions.map(row => <div key={row.employeeId} className="flex items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm" data-exclusion-row={row.employeeId}>
          <span>{employeeName(row.employeeId)}{employeeCode(row.employeeId) ? ` (${employeeCode(row.employeeId)})` : ''} — {row.reason}
            {!inScope(row.employeeId) && <span className="text-xs text-amber-800"> — خارج النطاق المختار</span>}</span>
          <button type="button" onClick={() => setExclusions(exclusions.filter(item => item.employeeId !== row.employeeId))} disabled={busy} className="text-xs text-red-700 underline">شيل</button>
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
