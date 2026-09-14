'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import {
  formatLoanMoney, loanMoneyInputValid, LOAN_REPAYMENT_METHOD_LABELS, LOAN_REPAYMENT_MODE_LABELS, recordLoanRepayment,
  type LoanRepaymentMethod, type LoanRepaymentMode, type LoanRepaymentResult,
} from '@/lib/loans-api'

// AD-14: سداد مبكر يسجله المخوّل (loans.repay) بمبلغ ومرجع؛ الفارغ = سداد كلي بقيمة الإقفال.
export function LoanRepaymentModal({ loan, currency, onClose, onDone }: {
  loan: { id: number; employeeName?: string; remainingAmount: string }; currency: string; onClose: () => void; onDone: () => void
}) {
  const [full, setFull] = useState(false)
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [method, setMethod] = useState<LoanRepaymentMethod>('CASH')
  const [mode, setMode] = useState<Exclude<LoanRepaymentMode, 'FULL'>>('SHORTEN_TERM')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<LoanRepaymentResult | null>(null)

  const valid = reference.trim().length > 0 && (full || loanMoneyInputValid(amount))
  const submit = async () => {
    setBusy(true); setError('')
    try {
      const saved = await recordLoanRepayment(loan.id, { amount: full ? null : amount.trim(), reference: reference.trim(), method, mode: full ? 'FULL' : mode, reason: reason.trim() || undefined })
      setResult(saved); onDone()
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر تسجيل السداد') } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="loan-repayment-title">
        <div className="flex items-center justify-between mb-4">
          <h3 id="loan-repayment-title" className="font-bold text-gray-800 text-lg">سداد مبكر — سلفة #{loan.id}</h3>
          <button disabled={busy} onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="إغلاق"><X size={20} /></button>
        </div>
        <p className="text-sm text-gray-600 mb-4">{loan.employeeName ? `${loan.employeeName} — ` : ''}الرصيد المتبقي {formatLoanMoney(loan.remainingAmount)} {currency}</p>
        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 mb-3">{error}</div>}
        {result && (
          <div role="status" className="bg-success-50 text-success-700 rounded-xl p-3 mb-3">
            {result.replayed ? 'هذا المرجع مسجل من قبل بنفس المبلغ؛ لم تُكرر الحركة. ' : 'سُجل السداد. '}
            {result.amount ? `المبلغ ${formatLoanMoney(result.amount)} — ` : ''}{LOAN_REPAYMENT_MODE_LABELS[result.mode]} — الرصيد بعده {formatLoanMoney(result.balanceAfter)}
          </div>
        )}
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={full} onChange={e => setFull(e.target.checked)} disabled={busy || !!result} /> سداد كلي بقيمة الإقفال الدقيقة</label>
          {!full && <>
            <div><label className="label" htmlFor="repay-amount">المبلغ ({currency}) *</label>
              <input id="repay-amount" className="input" dir="ltr" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} disabled={busy || !!result} /></div>
            <div><label className="label" htmlFor="repay-mode">أثر السداد الجزئي *</label>
              <select id="repay-mode" className="input" value={mode} onChange={e => setMode(e.target.value as typeof mode)} disabled={busy || !!result}>
                <option value="SHORTEN_TERM">{LOAN_REPAYMENT_MODE_LABELS.SHORTEN_TERM} — يُسدد من آخر الأقساط ويبقى مبلغ القسط</option>
                <option value="REDUCE_INSTALLMENT">{LOAN_REPAYMENT_MODE_LABELS.REDUCE_INSTALLMENT} — يبقى عدد الأقساط ويُوزع المتبقي</option>
              </select></div>
          </>}
          <div><label className="label" htmlFor="repay-reference">المرجع (رقم الإيصال أو التحويل) *</label>
            <input id="repay-reference" className="input" maxLength={100} value={reference} onChange={e => setReference(e.target.value)} disabled={busy || !!result} /></div>
          <div><label className="label" htmlFor="repay-method">الوسيلة</label>
            <select id="repay-method" className="input" value={method} onChange={e => setMethod(e.target.value as LoanRepaymentMethod)} disabled={busy || !!result}>
              {(Object.keys(LOAN_REPAYMENT_METHOD_LABELS) as LoanRepaymentMethod[]).map(key => <option key={key} value={key}>{LOAN_REPAYMENT_METHOD_LABELS[key]}</option>)}
            </select></div>
          <div><label className="label" htmlFor="repay-reason">ملاحظة</label>
            <textarea id="repay-reason" className="input" rows={2} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} disabled={busy || !!result} /></div>
        </div>
        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
          <button className="btn-primary flex-1 disabled:opacity-50" onClick={submit} disabled={busy || !valid || !!result}>{busy ? 'جارٍ التسجيل...' : 'تسجيل السداد'}</button>
          <button className="btn-secondary" disabled={busy} onClick={onClose}>إغلاق</button>
        </div>
      </div>
    </div>
  )
}
