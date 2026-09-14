'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { createRequest, fetchEmployees, type ApiEmployee } from '@/lib/api'
import {
  fetchLoanCapPreview, formatLoanMoney, loanMoneyInputValid, LOAN_EXCEPTIONAL_CATEGORY_LABELS, type LoanCapEvaluation,
} from '@/lib/loans-api'
import { LoanCapSummary } from './LoanCapSummary'

// AD-09: الموارد البشرية (loans.exceptional) تنشئ سلفة لموظف فوق السقف العادي بسبب مكتوب وتصنيف وشهر أول قسط.
// الطلب يمر بسلسلة اعتماد السلف، ومنشئه لا يعتمده.
export function LoanExceptionalModal({ currency, onClose, onDone }: { currency: string; onClose: () => void; onDone: () => void }) {
  const [employees, setEmployees] = useState<ApiEmployee[]>([])
  const [employeeId, setEmployeeId] = useState('')
  const [amount, setAmount] = useState('')
  const [months, setMonths] = useState('')
  const [category, setCategory] = useState('')
  const [reason, setReason] = useState('')
  const [firstPeriod, setFirstPeriod] = useState('')
  const [preview, setPreview] = useState<LoanCapEvaluation | null>(null)
  const [previewError, setPreviewError] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => { fetchEmployees().then(rows => setEmployees(rows.filter(row => row.status !== 'terminated' && row.status !== 'archived'))).catch(e => setError(e instanceof Error ? e.message : 'تعذر تحميل الموظفين')) }, [])
  useEffect(() => {
    if (!employeeId) { setPreview(null); return }
    const handle = setTimeout(() => {
      setPreviewError('')
      fetchLoanCapPreview({ employeeId: Number(employeeId), amount: loanMoneyInputValid(amount) ? amount.trim() : undefined, months: /^[1-9]\d{0,3}$/.test(months) ? Number(months) : undefined })
        .then(setPreview).catch(e => { setPreview(null); setPreviewError(e instanceof Error ? e.message : 'تعذر حساب السقف') })
    }, 300)
    return () => clearTimeout(handle)
  }, [employeeId, amount, months])

  const valid = !!employeeId && loanMoneyInputValid(amount) && /^[1-9]\d{0,3}$/.test(months) && !!category && reason.trim().length >= 10 && /^\d{4}-\d{2}$/.test(firstPeriod)
  const submit = async () => {
    setBusy(true); setError('')
    try {
      const request = await createRequest('LOAN', { amount: amount.trim(), months: Number(months), exceptional: true, exceptionalCategory: category, reason: reason.trim(), firstInstallmentPeriod: firstPeriod },
        true, Number(employeeId))
      setSuccess(`أُنشئ طلب السلفة الاستثنائية رقم ${request.id} وأُرسل لسلسلة اعتماد السلف`); onDone()
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر إنشاء السلفة الاستثنائية') } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="loan-exceptional-title">
        <div className="flex items-center justify-between mb-4">
          <h3 id="loan-exceptional-title" className="font-bold text-gray-800 text-lg">سلفة استثنائية لموظف</h3>
          <button disabled={busy} onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="إغلاق"><X size={20} /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">تتجاوز السقف العادي بقرار موثق. السبب والتصنيف وشهر أول قسط إلزامية، ومقدار التجاوز يُحفظ في لقطة الطلب ويظهر للمعتمدين.</p>
        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 mb-3">{error}</div>}
        {success && <div role="status" className="bg-success-50 text-success-700 rounded-xl p-3 mb-3">{success}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2"><label className="label" htmlFor="exc-employee">الموظف *</label>
            <select id="exc-employee" className="input" value={employeeId} onChange={e => setEmployeeId(e.target.value)} disabled={busy || !!success}>
              <option value="">اختر الموظف</option>
              {employees.map(row => <option key={row.id} value={row.id}>{row.fullName} — {row.employeeCode}</option>)}
            </select></div>
          <div><label className="label" htmlFor="exc-amount">المبلغ ({currency}) *</label>
            <input id="exc-amount" className="input" dir="ltr" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} disabled={busy || !!success} /></div>
          <div><label className="label" htmlFor="exc-months">عدد أشهر التقسيط *</label>
            <input id="exc-months" className="input" dir="ltr" inputMode="numeric" value={months} onChange={e => setMonths(e.target.value)} disabled={busy || !!success} /></div>
          <div><label className="label" htmlFor="exc-category">تصنيف السبب *</label>
            <select id="exc-category" className="input" value={category} onChange={e => setCategory(e.target.value)} disabled={busy || !!success}>
              <option value="">اختر التصنيف</option>
              {Object.entries(LOAN_EXCEPTIONAL_CATEGORY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select></div>
          <div><label className="label" htmlFor="exc-period">شهر أول قسط *</label>
            <input id="exc-period" type="month" className="input" dir="ltr" value={firstPeriod} onChange={e => setFirstPeriod(e.target.value)} disabled={busy || !!success} /></div>
          <div className="md:col-span-2"><label className="label" htmlFor="exc-reason">السبب المكتوب * (10 أحرف على الأقل)</label>
            <textarea id="exc-reason" className="input" rows={3} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} disabled={busy || !!success} /></div>
        </div>
        {previewError && <p role="alert" className="text-sm text-red-600 mt-3">{previewError}</p>}
        {preview && (
          <div className="mt-4 space-y-2">
            {Number(preview.excess) > 0 && <div className="bg-amber-50 text-amber-800 rounded-xl p-3 text-sm">مقدار التجاوز عن السقف العادي: <span className="font-mono font-bold">{formatLoanMoney(preview.excess)}</span> {currency}</div>}
            <LoanCapSummary cap={preview} currency={currency} title="السقف العادي لهذا الموظف" />
          </div>
        )}
        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
          <button className="btn-primary flex-1 disabled:opacity-50" onClick={submit} disabled={busy || !valid || !!success}>{busy ? 'جارٍ الإنشاء...' : 'إنشاء وإرسال للاعتماد'}</button>
          <button className="btn-secondary" disabled={busy} onClick={onClose}>إغلاق</button>
        </div>
      </div>
    </div>
  )
}
