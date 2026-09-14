'use client'

import { useEffect, useRef, useState } from 'react'
import { BookOpen, Plus, Save, Trash2 } from 'lucide-react'
import { payrollPoliciesError } from '../lib/payroll-policies-api'
import { emptyMonthlySalaryPeriod, fetchSalaryHistory, MONTHLY_SALARY_HISTORY_VERSION, SALARY_HISTORY_FIELDS, monthlySalaryFormError, saveMonthlySalaryHistory, type SalaryHistoryAmounts, type SalaryHistorySegment, type SalaryHistoryView } from '../lib/payroll-salary-history-api'

export function PayrollSalaryHistorySummary({ view }: { view: SalaryHistoryView }) {
  return <div className="space-y-2 text-sm"><p>{view.version ? `المراجعة ${view.revision} · مرجع المستند: ${view.version.evidenceReference}` : 'لا يوجد سجل أجر مؤرخ لهذا الموظف بعد.'}</p>{view.version && <p className="text-gray-500">سبب آخر مراجعة: {view.version.reason}</p>}{view.version && view.version.currentSourceHash !== view.currentSourceHash && <p className="text-amber-800">تغير الأجر أو العملة في ملف الموظف منذ توثيق السجل. راجع الفترات ثم احفظ مراجعة جديدة قبل استخدامها.</p>}</div>
}

export function PayrollSalaryHistoryEditor({ employeeId, canEdit, disabled, onDirtyChange, onSaved }: { employeeId: number; canEdit: boolean; disabled: boolean; onDirtyChange: (dirty: boolean) => void; onSaved: () => void }) {
  const [view, setView] = useState<SalaryHistoryView | null>(null)
  const [rows, setRows] = useState<SalaryHistorySegment[]>([])
  const [reason, setReason] = useState(''), [evidence, setEvidence] = useState('')
  const [loading, setLoading] = useState(false), [saving, setSaving] = useState(false), [dirty, setDirty] = useState(false)
  const [error, setError] = useState(''), [notice, setNotice] = useState('')
  const active = useRef(true), request = useRef<AbortController | null>(null)
  useEffect(() => { active.current = true; return () => { active.current = false; request.current?.abort() } }, [])
  const editable = canEdit && !!view?.capabilities.canEdit
  function markDirty() { setDirty(true); onDirtyChange(true); setNotice(''); setError('') }
  function restore(next: SalaryHistoryView) { setView(next); setRows(next.segments.map(row => ({ ...row }))); setReason(''); setEvidence(next.version?.evidenceReference ?? ''); setDirty(false); onDirtyChange(false) }
  async function load() {
    if (loading || saving || dirty || disabled) return
    request.current?.abort(); const controller = new AbortController(); request.current = controller
    setLoading(true); setError(''); setNotice('')
    try { const next = await fetchSalaryHistory(employeeId, controller.signal); if (active.current && !controller.signal.aborted) restore(next) }
    catch (cause) { if (active.current && !controller.signal.aborted) setError(payrollPoliciesError(cause)) }
    finally { if (active.current && !controller.signal.aborted) setLoading(false) }
  }
  async function save() {
    if (!view || !editable || disabled || loading || saving || !dirty) return
    const issue = monthlySalaryFormError(rows, reason, evidence)
    if (issue) { setError(issue); return }
    setSaving(true); setError(''); setNotice('')
    try { const next = await saveMonthlySalaryHistory(view, rows, reason, evidence); if (active.current) { restore(next); setNotice('حُفظ راتب كل شهر كاملًا في سجل الزيادات. أعد فحص مصادر فترة المسير لقراءة التحديث.'); onSaved() } }
    catch (cause) { if (active.current) setError(payrollPoliciesError(cause)) }
    finally { if (active.current) setSaving(false) }
  }
  function patch(index: number, values: Partial<SalaryHistorySegment>) { setRows(previous => previous.map((row, i) => i === index ? { ...row, ...values } : row)); markDirty() }
  return <div className="border rounded-xl p-4 space-y-4" aria-label="سجل الأجر المؤرخ">
    <div className="flex items-center gap-2"><BookOpen size={19} className="text-primary-600" /><h3 className="font-semibold">سجل الأجر المؤرخ</h3></div>
    <p className="text-sm text-gray-500">حدد راتب الموظف من شهر الرواتب الذي يسري منه. زيادة سبتمبر تطبق على راتب سبتمبر كاملًا، حتى لو كانت دورته من 23 أغسطس إلى 22 سبتمبر. كل حفظ يحتفظ بالمراجعة السابقة. هذا السجل لا يغيّر الأجر الحالي في ملف الموظف ولا ينشئ فروقات مالية على مسيرات سابقة.</p>
    <button type="button" className="btn-secondary disabled:opacity-50" disabled={disabled || loading || saving || dirty} onClick={() => void load()}>{loading ? 'جارٍ تحميل السجل…' : view ? 'إعادة تحميل السجل' : 'عرض سجل الأجر'}</button>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}{notice && <p role="status" className="text-sm text-green-700">{notice}</p>}
    {view && <><PayrollSalaryHistorySummary view={view} />
      {view.version && view.version.contractVersion !== MONTHLY_SALARY_HISTORY_VERSION && <p className="text-sm text-amber-800">السجل السابق محفوظ بتواريخ. حدد شهر سريان كل قيمة صراحةً قبل حفظها كشهور رواتب؛ لم نملأ الشهور من التواريخ تلقائيًا.</p>}
      {!editable && <p className="text-xs text-gray-500">توثيق الأجر وتصحيحه يتطلب صلاحية اعتماد الرواتب.</p>}
      <fieldset disabled={!editable || disabled || loading || saving} className="space-y-4 min-w-0">
        {rows.map((row, index) => <div key={index} className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between"><h4 className="font-medium">فترة الأجر {index + 1}</h4>{editable && <button type="button" className="text-red-600 disabled:opacity-50 p-2" aria-label={`إزالة الفترة ${index + 1} من المراجعة الجديدة`} onClick={() => { setRows(previous => previous.filter((_, i) => i !== index)); markDirty() }}><Trash2 size={17} /></button>}</div>
          {!row.effectivePayrollPeriod && row.effectiveFrom && <p className="text-xs text-gray-500">التاريخ المسجل سابقًا: {row.effectiveFrom} — {row.effectiveTo ?? 'مستمر'}</p>}
          <div className="grid sm:grid-cols-3 gap-3"><label className="label">يسري من راتب شهر<input type="month" className="input mt-1" value={row.effectivePayrollPeriod ?? ''} onChange={e => patch(index, { effectivePayrollPeriod: e.target.value, effectiveToPayrollPeriod: row.effectiveToPayrollPeriod ?? null })} /></label><label className="label">آخر شهر — فارغ للمستمر<input type="month" className="input mt-1" value={row.effectiveToPayrollPeriod ?? ''} onChange={e => patch(index, { effectiveToPayrollPeriod: e.target.value || null })} /></label><label className="label">العملة<select className="input mt-1" value={row.currency} onChange={e => patch(index, { currency: e.target.value as 'SAR' | 'EGP' })}><option value="EGP">جنيه مصري</option><option value="SAR">ريال سعودي</option></select></label></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{Object.entries(SALARY_HISTORY_FIELDS).map(([key, label]) => <label key={key} className="label">{label}<input className="input mt-1" inputMode="decimal" dir="ltr" maxLength={19} value={row[key as keyof SalaryHistoryAmounts]} onChange={e => patch(index, { [key]: e.target.value })} /></label>)}</div>
          {editable && <button type="button" className="text-primary-700 text-sm underline" onClick={() => { const amounts = Object.fromEntries(Object.keys(SALARY_HISTORY_FIELDS).map(key => [key, view.current[key as keyof SalaryHistoryAmounts] ?? ''])); patch(index, { ...amounts, ...(['SAR', 'EGP'].includes(view.current.currency ?? '') ? { currency: view.current.currency as 'SAR' | 'EGP' } : {}) }) }}>نسخ القيم الحالية — بعد التأكد من سريانها على هذه الفترة</button>}
        </div>)}
        {editable && <><button type="button" className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50" disabled={rows.length >= 120} onClick={() => { setRows(previous => [...previous, { ...emptyMonthlySalaryPeriod(), ...(['SAR', 'EGP'].includes(view.current.currency ?? '') ? { currency: view.current.currency as 'SAR' | 'EGP' } : {}) }]); markDirty() }}><Plus size={16} />إضافة فترة أجر</button>
          <div className="grid sm:grid-cols-2 gap-3"><label className="label">مرجع العقد أو القرار<input className="input mt-1" maxLength={200} value={evidence} onChange={e => { setEvidence(e.target.value); markDirty() }} /></label><label className="label">سبب التوثيق أو التصحيح<input className="input mt-1" maxLength={500} value={reason} onChange={e => { setReason(e.target.value); markDirty() }} /></label></div></>}
      </fieldset>
      {editable && <div className="flex flex-wrap gap-3"><button type="button" className="btn-primary inline-flex items-center gap-2 disabled:opacity-50" disabled={disabled || loading || saving || !dirty} onClick={() => void save()}><Save size={17} />{saving ? 'جارٍ حفظ المراجعة…' : 'حفظ مراجعة الأجر'}</button><button type="button" className="btn-secondary disabled:opacity-50" disabled={disabled || loading || saving || !dirty} onClick={() => { restore(view); setError(''); setNotice('') }}>تجاهل التعديلات</button></div>}
    </>}
  </div>
}
