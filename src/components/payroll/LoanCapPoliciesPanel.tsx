'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Plus, X } from 'lucide-react'
import { can, fetchBranches, fetchDepartments, fetchEmployees, fetchTeams } from '@/lib/api'
import {
  createLoanCapPolicy, createLoanCapPolicyVersion, deactivateLoanCapPolicy, fetchLoanCapPolicies, formatLoanMoney,
  LOAN_SCOPE_LABELS, type LoanCapPolicy, type LoanCapPolicyInput, type LoanCapScopeType,
} from '@/lib/loans-api'

// AD-01..06: سياسات سقوف السلف بالنطاق والنسخ المؤرخة — التعديل نسخة جديدة والسابقة تبقى قابلة للاستعلام بتاريخها.
type Option = { id: number; label: string }
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const emptyForm = (): LoanCapPolicyInput => ({ name: '', scopeType: 'COMPANY', scopeIds: [], salaryBase: null, percentOfSalary: '', flatCapAmount: '',
  maxRequestsPerMonth: '', maxAmountPerMonth: '', maxOutstandingBalance: '', maxInstallmentMonths: '', monthDefinition: 'PAYROLL_PERIOD', effectiveFrom: today(), effectiveTo: '', priority: 0, reason: '' })
const blankToNull = (value: unknown) => (value === '' || value === undefined ? null : value)

export function LoanCapPoliciesPanel({ currency }: { currency: string }) {
  const [policies, setPolicies] = useState<LoanCapPolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [canManage, setCanManage] = useState(false)
  const [options, setOptions] = useState<Record<Exclude<LoanCapScopeType, 'COMPANY'>, Option[]>>({ BRANCH: [], DEPARTMENT: [], TEAM: [], EMPLOYEES: [] })
  const [editing, setEditing] = useState<{ base: LoanCapPolicy | null } | null>(null)
  const [form, setForm] = useState<LoanCapPolicyInput>(emptyForm())
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [deactivating, setDeactivating] = useState<LoanCapPolicy | null>(null)
  const [deactivateReason, setDeactivateReason] = useState('')

  const load = () => { setLoading(true); setError(''); fetchLoanCapPolicies().then(setPolicies).catch(e => setError(e instanceof Error ? e.message : 'تعذر تحميل السياسات')).finally(() => setLoading(false)) }
  useEffect(() => {
    const manage = can('loans.policies'); setCanManage(manage); load()
    if (!manage) return
    Promise.all([fetchBranches(), fetchDepartments(), fetchTeams(), fetchEmployees()]).then(([branches, departments, teams, employees]) => setOptions({
      BRANCH: branches.map((row: any) => ({ id: row.id, label: row.name })), DEPARTMENT: departments.map((row: any) => ({ id: row.id, label: row.name })),
      TEAM: teams.map((row: any) => ({ id: row.id, label: row.name })), EMPLOYEES: employees.map((row: any) => ({ id: row.id, label: `${row.fullName} — ${row.employeeCode}` })),
    })).catch(() => { /* القوائم اختيارية؛ الخادم يتحقق من المعرفات */ })
  }, [])

  const openCreate = () => { setEditing({ base: null }); setForm(emptyForm()); setFormError('') }
  const openVersion = (base: LoanCapPolicy) => {
    setEditing({ base }); setFormError('')
    setForm({ name: base.name, scopeType: base.scopeType, scopeIds: base.scopeIds ?? [], salaryBase: base.salaryBase, percentOfSalary: base.percentOfSalary ?? '',
      flatCapAmount: base.flatCapAmount ?? '', maxRequestsPerMonth: base.maxRequestsPerMonth ?? '', maxAmountPerMonth: base.maxAmountPerMonth ?? '',
      maxOutstandingBalance: base.maxOutstandingBalance ?? '', maxInstallmentMonths: base.maxInstallmentMonths ?? '', monthDefinition: base.monthDefinition,
      effectiveFrom: today() > base.effectiveFrom ? today() : base.effectiveFrom, effectiveTo: '', priority: base.priority, reason: '' })
  }
  const save = async () => {
    if (!editing) return
    setBusy(true); setFormError('')
    const payload: LoanCapPolicyInput = {
      ...form, scopeIds: form.scopeType === 'COMPANY' ? null : form.scopeIds, salaryBase: blankToNull(form.salaryBase) as LoanCapPolicyInput['salaryBase'],
      percentOfSalary: blankToNull(form.percentOfSalary) as string | null, flatCapAmount: blankToNull(form.flatCapAmount) as string | null,
      maxRequestsPerMonth: blankToNull(form.maxRequestsPerMonth) as string | null, maxAmountPerMonth: blankToNull(form.maxAmountPerMonth) as string | null,
      maxOutstandingBalance: blankToNull(form.maxOutstandingBalance) as string | null, maxInstallmentMonths: blankToNull(form.maxInstallmentMonths) as string | null,
      effectiveTo: blankToNull(form.effectiveTo) as string | null, reason: blankToNull(form.reason) as string | null,
    }
    try {
      if (editing.base) await createLoanCapPolicyVersion(editing.base.id, payload)
      else await createLoanCapPolicy(payload)
      setEditing(null); load()
    } catch (e) { setFormError(e instanceof Error ? e.message : 'تعذر حفظ السياسة') } finally { setBusy(false) }
  }
  const deactivate = async () => {
    if (!deactivating) return
    setBusy(true); setFormError('')
    try { await deactivateLoanCapPolicy(deactivating.id, deactivateReason.trim()); setDeactivating(null); load() }
    catch (e) { setFormError(e instanceof Error ? e.message : 'تعذر إيقاف السياسة') } finally { setBusy(false) }
  }

  // آخر نسخة من كل سياسة فقط
  const latestByKey = new Map<string, LoanCapPolicy>()
  for (const row of policies) if (!latestByKey.has(row.policyKey) || latestByKey.get(row.policyKey)!.version < row.version) latestByKey.set(row.policyKey, row)
  const visible = [...latestByKey.values()]
  const scopeText = (row: LoanCapPolicy) => row.scopeType === 'COMPANY' ? LOAN_SCOPE_LABELS.COMPANY
    : `${LOAN_SCOPE_LABELS[row.scopeType]}: ${(row.scopeIds ?? []).map(id => options[row.scopeType as Exclude<LoanCapScopeType, 'COMPANY'>].find(option => option.id === id)?.label ?? 'غير معروف').join('، ')}`
  const set = (patch: Partial<LoanCapPolicyInput>) => setForm(current => ({ ...current, ...patch }))

  return (
    <div className="card overflow-hidden p-0">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-bold text-gray-800">سياسات سقوف السلف</h3>
          <p className="text-sm text-gray-500">الأخص نطاقًا يحكم؛ الأدنى بين النسبة والمقطوع والشهري والمديونية هو السقف الفعّال. بلا سياسة سارية لا يُطبق سقف.</p>
        </div>
        {canManage && <button className="btn-primary flex items-center gap-2" onClick={openCreate}><Plus size={16} /> سياسة جديدة</button>}
      </div>
      {error && <div role="alert" className="bg-red-50 text-red-700 p-3 flex items-center gap-2"><AlertTriangle size={16} />{error}</div>}
      {loading ? <div className="py-10 text-center text-gray-400">جارٍ التحميل...</div> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="text-right px-4 py-3">السياسة</th>
                <th className="text-right px-4 py-3">النطاق</th>
                <th className="text-center px-4 py-3">النسبة</th>
                <th className="text-center px-4 py-3">المقطوع</th>
                <th className="text-center px-4 py-3">السريان</th>
                <th className="text-center px-4 py-3">الحالة</th>
                {canManage && <th className="text-center px-4 py-3">إجراء</th>}
              </tr>
            </thead>
            <tbody>
              {visible.map(row => (
                <tr key={row.id} className="table-row">
                  <td className="table-cell"><p className="font-medium text-gray-800">{row.name}</p><p className="text-xs text-gray-500">نسخة {row.version}{row.reason ? ` — ${row.reason}` : ''}</p></td>
                  <td className="table-cell text-sm">{scopeText(row)}</td>
                  <td className="table-cell text-center">{row.percentOfSalary ? `${Number(row.percentOfSalary)}% ${row.salaryBase === 'BASIC' ? 'أساسي' : 'إجمالي'}` : '—'}</td>
                  <td className="table-cell text-center font-mono">{row.flatCapAmount ? formatLoanMoney(row.flatCapAmount) : '—'}</td>
                  <td className="table-cell text-center font-mono text-sm">{row.effectiveFrom} ← {row.effectiveTo ?? 'مفتوح'}</td>
                  <td className="table-cell text-center">
                    <span className={`badge ${row.currentlyEffective ? 'badge-success' : row.isActive ? 'badge-primary' : 'bg-gray-100 text-gray-600'}`}>{row.currentlyEffective ? 'سارية اليوم' : row.isActive ? 'مجدولة/منتهية' : 'موقوفة'}</span>
                    {row.deactivationReason && <p className="text-xs text-gray-500 mt-1">{row.deactivationReason}</p>}
                  </td>
                  {canManage && (
                    <td className="table-cell text-center">
                      {row.isActive && latestByKey.get(row.policyKey)?.id === row.id ? (
                        <div className="flex gap-2 justify-center">
                          <button className="btn-secondary text-sm" onClick={() => openVersion(row)}>نسخة جديدة</button>
                          <button className="btn-secondary text-sm text-danger-600" onClick={() => { setDeactivating(row); setDeactivateReason(''); setFormError('') }}>إيقاف</button>
                        </div>
                      ) : '—'}
                    </td>
                  )}
                </tr>
              ))}
              {visible.length === 0 && <tr><td colSpan={canManage ? 7 : 6} className="text-center py-8 text-gray-400">لا توجد سياسات سقوف — لا يُطبق سقف على طلبات السلف</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="cap-policy-title">
            <div className="flex items-center justify-between mb-4">
              <h3 id="cap-policy-title" className="font-bold text-gray-800 text-lg">{editing.base ? `نسخة جديدة من «${editing.base.name}»` : 'سياسة سقوف جديدة'}</h3>
              <button disabled={busy} onClick={() => setEditing(null)} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="إغلاق"><X size={20} /></button>
            </div>
            {editing.base && <p className="text-sm text-amber-800 bg-amber-50 rounded-xl p-3 mb-3">النسخة الحالية تُقفل باليوم السابق لسريان الجديدة (أو تُوقف لو تساوى يوم السريان) وتبقى محفوظة للاستعلام.</p>}
            {formError && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 mb-3">{formError}</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2"><label className="label" htmlFor="cap-name">الاسم *</label><input id="cap-name" className="input" maxLength={150} value={form.name} onChange={e => set({ name: e.target.value })} /></div>
              <div className="md:col-span-2"><label className="label" htmlFor="cap-scope">النطاق *</label>
                <select id="cap-scope" className="input" value={form.scopeType} onChange={e => set({ scopeType: e.target.value as LoanCapScopeType, scopeIds: [] })}>
                  {(Object.keys(LOAN_SCOPE_LABELS) as LoanCapScopeType[]).map(key => <option key={key} value={key}>{LOAN_SCOPE_LABELS[key]}</option>)}
                </select></div>
              {form.scopeType !== 'COMPANY' && (
                <div className="md:col-span-2"><label className="label" htmlFor="cap-scope-ids">عناصر النطاق *</label>
                  <select id="cap-scope-ids" multiple className="input h-32" value={(form.scopeIds ?? []).map(String)}
                    onChange={e => set({ scopeIds: Array.from(e.target.selectedOptions).map(option => Number(option.value)) })}>
                    {options[form.scopeType as Exclude<LoanCapScopeType, 'COMPANY'>].map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                  </select></div>
              )}
              <div><label className="label" htmlFor="cap-percent">نسبة من الراتب %</label><input id="cap-percent" className="input" dir="ltr" inputMode="decimal" value={form.percentOfSalary ?? ''} onChange={e => set({ percentOfSalary: e.target.value })} /></div>
              <div><label className="label" htmlFor="cap-base">قاعدة النسبة</label>
                <select id="cap-base" className="input" value={form.salaryBase ?? ''} onChange={e => set({ salaryBase: (e.target.value || null) as LoanCapPolicyInput['salaryBase'] })}>
                  <option value="">—</option><option value="BASIC">الراتب الأساسي</option><option value="GROSS">إجمالي الراتب (المكونات الست)</option>
                </select></div>
              <div className="md:col-span-2"><label className="label" htmlFor="cap-flat">سقف مقطوع للطلب ({currency})</label><input id="cap-flat" className="input" dir="ltr" inputMode="decimal" value={form.flatCapAmount ?? ''} onChange={e => set({ flatCapAmount: e.target.value })} /></div>
              <div><label className="label" htmlFor="cap-from">يسري من *</label><input id="cap-from" type="date" className="input" dir="ltr" value={form.effectiveFrom} onChange={e => set({ effectiveFrom: e.target.value })} /></div>
              <div><label className="label" htmlFor="cap-to">حتى (اختياري)</label><input id="cap-to" type="date" className="input" dir="ltr" value={form.effectiveTo ?? ''} onChange={e => set({ effectiveTo: e.target.value })} /></div>
              <details className="md:col-span-2 border border-gray-100 rounded-xl p-3">
                <summary className="cursor-pointer text-sm font-medium text-gray-700">خيارات إضافية</summary>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div><label className="label" htmlFor="cap-month-count">أقصى عدد طلبات في الشهر</label><input id="cap-month-count" className="input" dir="ltr" inputMode="numeric" value={String(form.maxRequestsPerMonth ?? '')} onChange={e => set({ maxRequestsPerMonth: e.target.value })} /></div>
                  <div><label className="label" htmlFor="cap-month-amount">أقصى قيمة في الشهر ({currency})</label><input id="cap-month-amount" className="input" dir="ltr" inputMode="decimal" value={form.maxAmountPerMonth ?? ''} onChange={e => set({ maxAmountPerMonth: e.target.value })} /></div>
                  <div><label className="label" htmlFor="cap-month-def">تعريف الشهر</label>
                    <select id="cap-month-def" className="input" value={form.monthDefinition} onChange={e => set({ monthDefinition: e.target.value as 'PAYROLL_PERIOD' | 'CALENDAR' })}>
                      <option value="PAYROLL_PERIOD">فترة المسير</option><option value="CALENDAR">الشهر التقويمي</option>
                    </select></div>
                  <div><label className="label" htmlFor="cap-outstanding">سقف المديونية القائمة ({currency})</label><input id="cap-outstanding" className="input" dir="ltr" inputMode="decimal" value={form.maxOutstandingBalance ?? ''} onChange={e => set({ maxOutstandingBalance: e.target.value })} /></div>
                  <div><label className="label" htmlFor="cap-max-months">أقصى أشهر للتقسيط</label><input id="cap-max-months" className="input" dir="ltr" inputMode="numeric" value={String(form.maxInstallmentMonths ?? '')} onChange={e => set({ maxInstallmentMonths: e.target.value })} /></div>
                </div>
              </details>
              <div className="md:col-span-2"><label className="label" htmlFor="cap-reason">{editing.base ? 'سبب التعديل *' : 'ملاحظة'}</label><textarea id="cap-reason" className="input" rows={2} maxLength={500} value={form.reason ?? ''} onChange={e => set({ reason: e.target.value })} /></div>
            </div>
            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
              <button className="btn-primary flex-1 disabled:opacity-50" onClick={save} disabled={busy || form.name.trim().length < 3 || !form.effectiveFrom || (!!editing.base && (form.reason ?? '').trim().length < 3)}>{busy ? 'جارٍ الحفظ...' : 'حفظ'}</button>
              <button className="btn-secondary" disabled={busy} onClick={() => setEditing(null)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {deactivating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="cap-deactivate-title">
            <h3 id="cap-deactivate-title" className="font-bold text-gray-800 text-lg mb-3">إيقاف «{deactivating.name}»</h3>
            <p className="text-sm text-gray-600 mb-3">لن تشارك في أي فحص بعد الإيقاف، وتبقى نسخها محفوظة.</p>
            {formError && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 mb-3">{formError}</div>}
            <label className="label" htmlFor="cap-deactivate-reason">السبب *</label>
            <textarea id="cap-deactivate-reason" className="input" rows={3} maxLength={500} value={deactivateReason} onChange={e => setDeactivateReason(e.target.value)} />
            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
              <button className="btn-primary flex-1 disabled:opacity-50" onClick={deactivate} disabled={busy || deactivateReason.trim().length < 3}>{busy ? 'جارٍ الإيقاف...' : 'تأكيد الإيقاف'}</button>
              <button className="btn-secondary" disabled={busy} onClick={() => setDeactivating(null)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
