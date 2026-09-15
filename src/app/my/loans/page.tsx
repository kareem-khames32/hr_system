'use client'

import { Fragment, useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import { AlertTriangle, ChevronDown, ChevronUp, Plus, Wallet, X } from 'lucide-react'
import { createRequest } from '@/lib/api'
import { useCurrency } from '@/lib/currency'
import {
  fetchLoanCapPreview, fetchMyLoans, formatLoanMoney, loanMoneyInputValid,
  LOAN_EVENT_LABELS, LOAN_EXCEPTIONAL_CATEGORY_LABELS, LOAN_REPAYMENT_METHOD_LABELS, LOAN_REPAYMENT_MODE_LABELS,
  type LoanCapEvaluation, type LoanInstallmentStatus, type LoanLedger,
} from '@/lib/loans-api'
import { LoanCapSummary } from '@/components/payroll/LoanCapSummary'

// AD-15: دفتر الموظف لسلفه هو فقط (GET /loans/mine) — أصل المبلغ والمسدد والمتبقي وحالة كل قسط والسداد المبكر.
const installmentLabels: Record<LoanInstallmentStatus, string> = {
  DUE: 'مستحق', PAID: 'مخصوم من المسير', PARTIAL: 'سداد جزئي والباقي مرحّل', DEFERRED: 'مؤجل بالكامل', SETTLED: 'مسوّى مبكرًا',
  // C8: قسط ترحيل أُلغي بعكس صرف مسير (بلا رصيد)
  REVERSED: 'مُلغى بعكس صرف مسير',
}
const statusBadge = (status: LoanInstallmentStatus) => ['PAID', 'SETTLED'].includes(status) ? 'badge-success' : status === 'DUE' ? 'badge-warning'
  : status === 'REVERSED' ? 'bg-gray-100 text-gray-600' : 'badge-primary'

export default function MyLoansPage() {
  const currency = useCurrency()
  const [loans, setLoans] = useState<LoanLedger[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [showRequest, setShowRequest] = useState(false)
  const [amount, setAmount] = useState('')
  const [months, setMonths] = useState('')
  const [preview, setPreview] = useState<LoanCapEvaluation | null>(null)
  const [previewError, setPreviewError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')
  const [deferral, setDeferral] = useState<{ loanId: number; installmentId: number; dueDate: string; remaining: string } | null>(null)
  const [deferPeriod, setDeferPeriod] = useState('')
  const [deferReason, setDeferReason] = useState('')
  const [deferBusy, setDeferBusy] = useState(false)
  const [deferMessage, setDeferMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const load = () => {
    setLoading(true); setError('')
    fetchMyLoans().then(setLoans).catch(e => setError(e instanceof Error ? e.message : 'تعذر تحميل سلفك')).finally(() => setLoading(false))
  }
  useEffect(load, [])

  // AD-02/04: السقف والمتبقي يظهران قبل التقديم ويتحدثان مع المبلغ وعدد الأشهر
  useEffect(() => {
    if (!showRequest) return
    const monthsValue = Number(months)
    const handle = setTimeout(() => {
      setPreviewError('')
      fetchLoanCapPreview({ amount: loanMoneyInputValid(amount) ? amount.trim() : undefined, months: Number.isInteger(monthsValue) && monthsValue > 0 ? monthsValue : undefined })
        .then(setPreview).catch(e => { setPreview(null); setPreviewError(e instanceof Error ? e.message : 'تعذر حساب السقف') })
    }, 300)
    return () => clearTimeout(handle)
  }, [showRequest, amount, months])

  const submit = async () => {
    setSubmitting(true); setSubmitError(''); setSubmitSuccess('')
    try {
      const request = await createRequest('LOAN', { amount: amount.trim(), months: Number(months) })
      setSubmitSuccess(`أُرسل طلب السلفة رقم ${request.id} للاعتماد؛ يُعاد فحص السقف عند كل خطوة اعتماد`)
      setAmount(''); setMonths(''); load()
    } catch (e) { setSubmitError(e instanceof Error ? e.message : 'تعذر إرسال الطلب') } finally { setSubmitting(false) }
  }

  const submitDeferral = async () => {
    if (!deferral) return
    setDeferBusy(true); setDeferMessage(null)
    try {
      const request = await createRequest('LOAN_INSTALLMENT_DEFER', { loanId: deferral.loanId, installmentId: deferral.installmentId, toPeriod: deferPeriod, reason: deferReason })
      setDeferMessage({ ok: true, text: `أُرسل طلب التأجيل رقم ${request.id}؛ يبقى موعد القسط الحالي حتى الاعتماد` })
      load()
    } catch (e) { setDeferMessage({ ok: false, text: e instanceof Error ? e.message : 'تعذر إرسال طلب التأجيل' }) } finally { setDeferBusy(false) }
  }

  const openTotal = loans.reduce((sum, loan) => sum + Number(loan.remainingAmount), 0)
  const monthsValid = /^[1-9]\d{0,3}$/.test(months.trim())

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">سلفي</h1>
            <p className="text-gray-500 mt-1">دفتر سلفك: أصل المبلغ والمسدد والمتبقي وحالة كل قسط وحركات السداد</p>
          </div>
          <button onClick={() => { setShowRequest(true); setSubmitError(''); setSubmitSuccess('') }} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> طلب سلفة
          </button>
        </div>

        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4 flex items-center gap-2"><AlertTriangle size={18} />{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center"><Wallet size={24} className="text-primary-600" /></div>
            <div><p className="text-sm text-gray-500">المتبقي عليك</p><p className="text-2xl font-bold text-primary-600">{formatLoanMoney(openTotal)} <span className="text-sm">{currency}</span></p></div>
          </div>
          <div className="card"><p className="text-sm text-gray-500">عدد السلف</p><p className="text-2xl font-bold text-gray-800">{loans.length}</p></div>
          <div className="card"><p className="text-sm text-gray-500">سلف مفتوحة</p><p className="text-2xl font-bold text-gray-800">{loans.filter(loan => Number(loan.remainingAmount) > 0).length}</p></div>
        </div>

        <div className="card overflow-hidden p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th className="text-right px-4 py-4">السلفة</th>
                    <th className="text-center px-4 py-4">المعتمد</th>
                    <th className="text-center px-4 py-4">المسدد</th>
                    <th className="text-center px-4 py-4">المتبقي</th>
                    <th className="text-center px-4 py-4">الأقساط</th>
                    <th className="text-center px-4 py-4">التفاصيل</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map(loan => (
                    <Fragment key={loan.id}>
                      <tr className="table-row">
                        <td className="table-cell">
                          <p className="font-medium text-gray-800">سلفة #{loan.id}{loan.requestId ? ` — طلب #${loan.requestId}` : ''}</p>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            {loan.isExceptional && <span className="badge badge-warning">استثنائية — {LOAN_EXCEPTIONAL_CATEGORY_LABELS[loan.exceptionalCategory ?? ''] ?? loan.exceptionalCategory}</span>}
                            {loan.firstInstallmentPeriod && <span className="text-xs text-gray-500">أول قسط: {loan.firstInstallmentPeriod}</span>}
                          </div>
                        </td>
                        <td className="table-cell text-center font-mono">
                          {formatLoanMoney(loan.amount)}
                          {loan.requestedAmount && loan.requestedAmount !== loan.amount && <p className="text-xs text-gray-500 font-sans">المطلوب {formatLoanMoney(loan.requestedAmount)}</p>}
                        </td>
                        <td className="table-cell text-center font-mono text-success-600">{formatLoanMoney(loan.paidAmount)}</td>
                        <td className="table-cell text-center font-mono font-bold text-primary-600">{formatLoanMoney(loan.remainingAmount)}</td>
                        <td className="table-cell text-center">{loan.paidCount} من {loan.installments.length}</td>
                        <td className="table-cell text-center">
                          <button aria-label="عرض دفتر السلفة" onClick={() => setExpanded(expanded === loan.id ? null : loan.id)} className="p-2 hover:bg-gray-100 rounded-lg">
                            {expanded === loan.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </button>
                        </td>
                      </tr>
                      {expanded === loan.id && (
                        <tr>
                          <td colSpan={6} className="bg-gray-50 px-6 py-4 space-y-4">
                            {loan.isExceptional && loan.exceptionalReason && <p className="text-sm text-gray-600">سبب الاستثناء: {loan.exceptionalReason}</p>}
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead>
                                  <tr className="table-header">
                                    <th className="text-right px-4 py-2">#</th>
                                    <th className="text-center px-4 py-2">الاستحقاق</th>
                                    <th className="text-center px-4 py-2">المبلغ</th>
                                    <th className="text-center px-4 py-2">المدفوع</th>
                                    <th className="text-center px-4 py-2">المفتوح</th>
                                    <th className="text-center px-4 py-2">الحالة</th>
                                    <th className="text-center px-4 py-2">تأجيل</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {loan.installments.map(item => (
                                    <tr key={item.id} className="table-row">
                                      <td className="table-cell">#{item.id}{item.parentInstallmentId !== null && <p className="text-xs text-gray-500">مرحّل من #{item.parentInstallmentId}</p>}</td>
                                      <td className="table-cell text-center font-mono">{item.dueDate}</td>
                                      <td className="table-cell text-center font-mono">{formatLoanMoney(item.amount)}</td>
                                      <td className="table-cell text-center font-mono text-success-600">{formatLoanMoney(item.paidAmount)}</td>
                                      <td className="table-cell text-center font-mono">{formatLoanMoney(item.remainingAmount)}</td>
                                      <td className="table-cell text-center"><span className={`badge ${statusBadge(item.financialStatus)}`}>{installmentLabels[item.financialStatus]}</span></td>
                                      <td className="table-cell text-center">
                                        {item.financialStatus === 'DUE' && Number(item.remainingAmount) > 0
                                          ? <button className="btn-secondary text-sm" onClick={() => { setDeferral({ loanId: loan.id, installmentId: item.id, dueDate: item.dueDate, remaining: item.remainingAmount }); setDeferPeriod(''); setDeferReason(''); setDeferMessage(null) }}>طلب تأجيل</button>
                                          : '—'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <div>
                              <p className="font-medium text-gray-700 mb-2">السداد المبكر</p>
                              {loan.repayments.length === 0 ? <p className="text-sm text-gray-500">لا توجد حركات سداد مبكر.</p> : (
                                <div className="overflow-x-auto">
                                  <table className="w-full">
                                    <thead>
                                      <tr className="table-header">
                                        <th className="text-right px-4 py-2">التاريخ</th>
                                        <th className="text-center px-4 py-2">المبلغ</th>
                                        <th className="text-center px-4 py-2">المرجع</th>
                                        <th className="text-center px-4 py-2">الوسيلة</th>
                                        <th className="text-center px-4 py-2">الطريقة</th>
                                        <th className="text-center px-4 py-2">الرصيد بعدها</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {loan.repayments.map(row => (
                                        <tr key={row.id} className="table-row">
                                          <td className="table-cell font-mono">{row.createdAt.slice(0, 10)}</td>
                                          <td className="table-cell text-center font-mono">{formatLoanMoney(row.amount)}</td>
                                          <td className="table-cell text-center">{row.reference}</td>
                                          <td className="table-cell text-center">{LOAN_REPAYMENT_METHOD_LABELS[row.method]}</td>
                                          <td className="table-cell text-center">{LOAN_REPAYMENT_MODE_LABELS[row.mode]}</td>
                                          <td className="table-cell text-center font-mono">{formatLoanMoney(row.balanceAfter)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                            {loan.events.length > 0 && (
                              <div>
                                <p className="font-medium text-gray-700 mb-2">سجل الحركات</p>
                                <ul className="text-sm text-gray-600 space-y-1">
                                  {loan.events.map(event => (
                                    <li key={event.id}>{event.createdAt.slice(0, 10)} — {LOAN_EVENT_LABELS[event.action] ?? event.action} (قسط #{event.installmentId}){event.payrollRunId ? ` — مسير #${event.payrollRunId}` : ''}{event.reason ? ` — ${event.reason}` : ''}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                  {loans.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-gray-400">لا توجد سلف مسجلة لك</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="my-loan-title">
            <div className="flex items-center justify-between mb-4">
              <h3 id="my-loan-title" className="font-bold text-gray-800 text-lg">طلب سلفة</h3>
              <button onClick={() => setShowRequest(false)} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="إغلاق"><X size={20} /></button>
            </div>
            {submitError && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 mb-3">{submitError}</div>}
            {submitSuccess && <div role="status" className="bg-success-50 text-success-700 rounded-xl p-3 mb-3">{submitSuccess}</div>}
            <div className="space-y-4">
              <div><label className="label" htmlFor="my-loan-amount">المبلغ ({currency}) *</label>
                <input id="my-loan-amount" className="input" dir="ltr" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" /></div>
              <div><label className="label" htmlFor="my-loan-months">عدد أشهر السداد *</label>
                <input id="my-loan-months" className="input" dir="ltr" inputMode="numeric" value={months} onChange={e => setMonths(e.target.value)} placeholder="1" /></div>
              {previewError && <p role="alert" className="text-sm text-red-600">{previewError}</p>}
              {preview && <LoanCapSummary cap={preview} currency={currency} title="السقف المتاح لك الآن" />}
            </div>
            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
              <button className="btn-primary flex-1 disabled:opacity-50" onClick={submit} disabled={submitting || !loanMoneyInputValid(amount) || !monthsValid || (preview !== null && !preview.allowed)}>
                {submitting ? 'جارٍ الإرسال...' : 'إرسال للاعتماد'}
              </button>
              <button className="btn-secondary" onClick={() => setShowRequest(false)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {deferral && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="my-defer-title">
            <div className="flex items-center justify-between mb-4">
              <h3 id="my-defer-title" className="font-bold text-gray-800 text-lg">طلب تأجيل قسط</h3>
              <button disabled={deferBusy} onClick={() => setDeferral(null)} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="إغلاق"><X size={20} /></button>
            </div>
            <p className="text-sm text-gray-600 mb-4">القسط #{deferral.installmentId} برصيد {formatLoanMoney(deferral.remaining)} {currency}، مستحق {deferral.dueDate}.</p>
            {deferMessage && <div role={deferMessage.ok ? 'status' : 'alert'} className={`${deferMessage.ok ? 'bg-success-50 text-success-700' : 'bg-red-50 text-red-700'} rounded-xl p-3 mb-3`}>{deferMessage.text}</div>}
            <div className="space-y-4">
              <div><label className="label" htmlFor="my-defer-period">شهر التأجيل *</label>
                <input id="my-defer-period" type="month" className="input" dir="ltr" value={deferPeriod} onChange={e => setDeferPeriod(e.target.value)} disabled={deferBusy || !!deferMessage?.ok} /></div>
              <div><label className="label" htmlFor="my-defer-reason">السبب *</label>
                <textarea id="my-defer-reason" className="input" rows={3} maxLength={500} value={deferReason} onChange={e => setDeferReason(e.target.value)} disabled={deferBusy || !!deferMessage?.ok} /></div>
            </div>
            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
              <button className="btn-primary flex-1 disabled:opacity-50" onClick={submitDeferral} disabled={deferBusy || !!deferMessage?.ok || !deferPeriod || deferReason.trim().length < 3}>{deferBusy ? 'جارٍ الإرسال...' : 'إرسال للموافقة'}</button>
              <button className="btn-secondary" disabled={deferBusy} onClick={() => setDeferral(null)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
