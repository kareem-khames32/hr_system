'use client'

// محرر سلسلة اعتماد المسير (قرار المالك 22 سبتمبر): المالك بيرتب الخطوات وبيختار لكل خطوة شخص بعينه بالبحث بالاسم أو الكود
// (أو دور كبديل). مسؤول الرواتب بيحسب ← الخطوات بالترتيب ← آخر خطوة = الاعتماد النهائي. نفس المحرر لسلسلة الشركة وللسلسلة الخاصة بمسير.
import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Search, Trash2, UserCheck } from 'lucide-react'
import { PAYROLL_CHAIN_MAX_STEPS, payrollChainStepsInput, searchPayrollApprovers, type PayrollApproverOption, type PayrollChainStepInput,
  type PayrollChainStepView } from '../../lib/payroll-approval-chain-api'

type DraftStep = Pick<PayrollChainStepView, 'kind' | 'userId' | 'roleCode' | 'label' | 'approverName'> & { key: number }

/** نقل خطوة لفوق أو لتحت (دالة صافية للمحرر واختباره). */
export function movePayrollChainStep<T>(steps: readonly T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction
  if (index < 0 || index >= steps.length || target < 0 || target >= steps.length) return [...steps]
  const next = [...steps]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

export const payrollChainEditorChanged = (saved: readonly PayrollChainStepView[], draft: ReadonlyArray<Pick<PayrollChainStepView, 'kind' | 'userId' | 'roleCode' | 'label'>>) =>
  JSON.stringify(saved.map(step => [step.kind, step.userId, step.roleCode, step.label])) !== JSON.stringify(draft.map(step => [step.kind, step.userId, step.roleCode, step.label.trim()]))

export function PayrollChainEditor({ steps, roles, disabled, busy, emptyHint, clearLabel, onSave }: {
  steps: PayrollChainStepView[]
  roles: Array<{ code: string; nameAr: string }>
  disabled?: boolean
  busy: boolean
  /** جملة الحالة لما السلسلة فاضية («الاعتماد بخطوة واحدة» أو «ماشي بسلسلة الشركة») */
  emptyHint: string
  /** اسم زرار شيل السلسلة كلها */
  clearLabel: string
  onSave: (steps: PayrollChainStepInput[]) => void
}) {
  const nextKey = useRef(1)
  const fromSaved = (rows: PayrollChainStepView[]): DraftStep[] => rows.map(step => ({ key: nextKey.current++, kind: step.kind, userId: step.userId, roleCode: step.roleCode,
    label: step.label, approverName: step.approverName }))
  const [draft, setDraft] = useState<DraftStep[]>(() => fromSaved(steps))
  const [mode, setMode] = useState<'USER' | 'ROLE'>('USER')
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<PayrollApproverOption[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [roleCode, setRoleCode] = useState('')

  // السلسلة المحفوظة اتغيرت (حفظ ناجح أو اختيار مسير تاني) ← المسودة تبدأ منها
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setDraft(fromSaved(steps)) }, [steps])

  // البحث بالاسم أو كود الموظف أو الإيميل — بعد حرفين، وبمهلة قصيرة عشان مايبعتش مع كل حرف
  useEffect(() => {
    const term = search.trim()
    setSearchError('')
    if (term.length < 2) { setResults([]); setSearching(false); return }
    let cancelled = false
    setSearching(true)
    const timer = setTimeout(() => {
      searchPayrollApprovers(term)
        .then(rows => { if (!cancelled) setResults(rows) })
        .catch(error => { if (!cancelled) { setResults([]); setSearchError(error instanceof Error ? error.message : 'تعذر البحث') } })
        .finally(() => { if (!cancelled) setSearching(false) })
    }, 300)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [search])

  const locked = disabled || busy
  const full = draft.length >= PAYROLL_CHAIN_MAX_STEPS
  const taken = new Set(draft.filter(step => step.kind === 'USER').map(step => step.userId))
  const add = (step: Omit<DraftStep, 'key' | 'label'>) => setDraft(rows => [...rows, { ...step, key: nextKey.current++, label: '' }])
  const changed = payrollChainEditorChanged(steps, draft)

  return (
    <div className="space-y-4" data-chain-editor>
      <p className="text-sm text-gray-600">
        مسؤول الرواتب يحسب المسير ← {draft.length ? draft.map((step, index) => step.label.trim() || (index === draft.length - 1 ? 'الاعتماد النهائي' : 'مراجعة')).join(' ← ') : emptyHint}
        {draft.length > 0 && ' — آخر خطوة هي الاعتماد النهائي، وبعدها القسائم تظهر للموظفين.'}
      </p>

      {draft.length > 0 && (
        <ol className="space-y-2" data-chain-editor-steps>
          {draft.map((step, index) => (
            <li key={step.key} className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3">
              <span className="w-7 h-7 rounded-full bg-primary-50 text-primary-700 text-sm font-bold flex items-center justify-center shrink-0">{index + 1}</span>
              <span className="flex items-center gap-2 min-w-[200px] flex-1">
                <UserCheck size={16} className="text-gray-400 shrink-0" />
                <span>
                  <span className="block font-medium text-gray-800">{step.approverName}</span>
                  <span className="block text-xs text-gray-500">{step.kind === 'USER' ? 'شخص بعينه' : 'أي حد بيحمل الدور ده (في نطاق فرعه)'}</span>
                </span>
              </span>
              <label className="text-xs text-gray-600">اسم الخطوة
                <input className="input text-sm mt-1 block w-48" value={step.label} maxLength={100} disabled={locked}
                  placeholder={index === draft.length - 1 ? 'الاعتماد النهائي' : 'مراجعة'}
                  onChange={event => setDraft(rows => rows.map(row => row.key === step.key ? { ...row, label: event.target.value } : row))} />
              </label>
              <span className="flex items-center gap-1">
                <button type="button" className="btn-secondary px-2 py-1 disabled:opacity-40" disabled={locked || index === 0} title="قدّم الخطوة"
                  onClick={() => setDraft(rows => movePayrollChainStep(rows, index, -1))}><ArrowUp size={14} /></button>
                <button type="button" className="btn-secondary px-2 py-1 disabled:opacity-40" disabled={locked || index === draft.length - 1} title="أخّر الخطوة"
                  onClick={() => setDraft(rows => movePayrollChainStep(rows, index, 1))}><ArrowDown size={14} /></button>
                <button type="button" className="btn-secondary px-2 py-1 text-red-600 disabled:opacity-40" disabled={locked} title="شيل الخطوة"
                  onClick={() => setDraft(rows => rows.filter(row => row.key !== step.key))}><Trash2 size={14} /></button>
              </span>
            </li>
          ))}
        </ol>
      )}

      {!disabled && (
        <div className="rounded-xl border border-dashed border-gray-200 p-3 space-y-3" data-chain-editor-add>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-medium text-gray-700 flex items-center gap-1"><Plus size={14} />ضيف خطوة:</span>
            <label className="flex items-center gap-1.5"><input type="radio" name="chain-step-kind" checked={mode === 'USER'} onChange={() => setMode('USER')} disabled={locked} />شخص بعينه</label>
            <label className="flex items-center gap-1.5"><input type="radio" name="chain-step-kind" checked={mode === 'ROLE'} onChange={() => setMode('ROLE')} disabled={locked} />دور</label>
            {full && <span className="text-xs text-amber-700">السلسلة بحد أقصى {PAYROLL_CHAIN_MAX_STEPS} خطوات</span>}
          </div>
          {mode === 'USER' ? (
            <div className="space-y-2">
              <span className="relative block max-w-md">
                <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" className="input w-full pr-9" placeholder="دوّر بالاسم أو كود الموظف..." value={search} disabled={locked || full}
                  onChange={event => setSearch(event.target.value)} data-chain-approver-search />
              </span>
              {searchError && <p role="alert" className="text-sm text-red-700">{searchError}</p>}
              {searching && <p className="text-xs text-gray-400">بيدوّر…</p>}
              {!searching && search.trim().length >= 2 && results.length === 0 && !searchError && <p className="text-xs text-gray-500">مفيش حساب دخول نشط بالاسم أو الكود ده.</p>}
              {results.length > 0 && (
                <ul className="max-h-56 overflow-y-auto divide-y divide-gray-100 rounded-xl border border-gray-100">
                  {results.map(person => (
                    <li key={person.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                      <span>
                        <span className="font-medium text-gray-800">{person.displayName}</span>
                        {person.employeeCode && <span className="font-mono text-xs text-gray-500" dir="ltr"> ({person.employeeCode})</span>}
                        <span className="block text-xs text-gray-500">{[person.jobTitle, person.roleName, person.branchName].filter(Boolean).join(' • ')}</span>
                      </span>
                      <button type="button" className="btn-secondary text-xs px-2 py-1 disabled:opacity-40" disabled={locked || full || taken.has(person.id)}
                        title={taken.has(person.id) ? 'موجود في خطوة تانية — محدش بيعتمد خطوتين' : undefined}
                        onClick={() => { add({ kind: 'USER', userId: person.id, roleCode: null, approverName: person.displayName }); setSearch('') }}>
                        {taken.has(person.id) ? 'موجود في السلسلة' : 'ضيفه خطوة'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-xs text-gray-600">الدور
                <select className="input text-sm mt-1 block w-56" value={roleCode} disabled={locked || full} onChange={event => setRoleCode(event.target.value)}>
                  <option value="">اختار الدور</option>
                  {roles.map(role => <option key={role.code} value={role.code}>{role.nameAr}</option>)}
                </select>
              </label>
              <button type="button" className="btn-secondary text-sm disabled:opacity-40" disabled={locked || full || !roleCode}
                onClick={() => { add({ kind: 'ROLE', userId: null, roleCode, approverName: roles.find(role => role.code === roleCode)?.nameAr ?? roleCode }); setRoleCode('') }}>
                ضيف الدور خطوة
              </button>
            </div>
          )}
        </div>
      )}

      {!disabled && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-primary text-sm disabled:opacity-50" disabled={locked || !changed} onClick={() => onSave(payrollChainStepsInput(draft))} data-chain-save>
            {busy ? 'بيحفظ…' : 'حفظ السلسلة'}
          </button>
          {changed && <button type="button" className="btn-secondary text-sm disabled:opacity-50" disabled={locked} onClick={() => setDraft(fromSaved(steps))}>رجّع المحفوظ</button>}
          {steps.length > 0 && <button type="button" className="btn-secondary text-sm text-red-700 disabled:opacity-50" disabled={locked} onClick={() => onSave([])} data-chain-clear>{clearLabel}</button>}
        </div>
      )}
    </div>
  )
}

export default PayrollChainEditor
