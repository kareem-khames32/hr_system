'use client'

import { useEffect, useState } from 'react'
import { can } from '@/lib/api'
import { formatDate } from '@/lib/dates'
import { fetchLoanLedger, LOAN_DISBURSEMENT_METHOD_LABELS, recordLoanDisbursement, type LoanDisbursementMethod, type LoanLedger } from '@/lib/loans-api'

// B1.8 (R09): «تم صرف السلفة» — إمتى وإزاي والمرجع ومين. لو السلفة «لازم تتصرف الأول»، أقساطها مابتنزلش المسير قبل التسجيل.
const today = () => new Date().toLocaleDateString('en-CA')

export function LoanDisbursementPanel({ loanId, onChanged }: { loanId: number; onChanged: () => void }) {
  const [ledger, setLedger] = useState<LoanLedger | null>(null)
  const [canDisburse, setCanDisburse] = useState(false)
  const [date, setDate] = useState(today())
  const [method, setMethod] = useState<LoanDisbursementMethod>('CASH')
  const [reference, setReference] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setCanDisburse(can('loans.disburse'))
    fetchLoanLedger(loanId).then(setLedger).catch(() => setLedger(null))
  }, [loanId])

  if (!ledger) return null
  const submit = async () => {
    setBusy(true); setError('')
    try {
      setLedger(await recordLoanDisbursement(loanId, { date, method, reference: reference.trim() || undefined }))
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تسجيل صرف السلفة')
    } finally { setBusy(false) }
  }

  if (ledger.disbursedAt) {
    return (
      <p className="text-sm text-gray-700 mb-3">
        تم صرف السلفة: {formatDate(ledger.disbursedAt)}
        {ledger.disbursementMethod ? ` · ${LOAN_DISBURSEMENT_METHOD_LABELS[ledger.disbursementMethod as LoanDisbursementMethod] ?? ledger.disbursementMethod}` : ''}
        {ledger.disbursementReference ? ` · مرجع ${ledger.disbursementReference}` : ''}
      </p>
    )
  }
  return (
    <div className="mb-3 space-y-2">
      {ledger.requiresDisbursement && (
        <p role="status" className="text-sm text-amber-800 bg-amber-50 rounded-lg p-2">
          السلفة دي لازم صرفها يتسجل الأول — أقساطها مش بتنزل المسير لحد ما يتسجل.
        </p>
      )}
      {canDisburse && (
        <div className="flex flex-wrap items-end gap-2 text-sm">
          <label className="flex flex-col gap-1">تاريخ الصرف
            <input type="date" className="input" value={date} max={today()} onChange={(event) => setDate(event.target.value)} />
          </label>
          <label className="flex flex-col gap-1">الطريقة
            <select className="input" value={method} onChange={(event) => setMethod(event.target.value as LoanDisbursementMethod)}>
              {(Object.keys(LOAN_DISBURSEMENT_METHOD_LABELS) as LoanDisbursementMethod[]).map((key) => <option key={key} value={key}>{LOAN_DISBURSEMENT_METHOD_LABELS[key]}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">المرجع{method === 'CASH' ? ' (اختياري)' : ''}
            <input className="input" value={reference} maxLength={100} onChange={(event) => setReference(event.target.value)} />
          </label>
          <button type="button" className="btn-primary disabled:opacity-50" disabled={busy || !date || (method !== 'CASH' && !reference.trim())} onClick={submit}>
            سجّل صرف السلفة
          </button>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
