'use client'

import { Fragment, useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import { AlertTriangle, ChevronDown, ChevronUp, Plus, Wallet, X } from 'lucide-react'
import { createRequest } from '@/lib/api'
import { useCurrency } from '@/lib/currency'
import {
  fetchLoanCapPreview, fetchMyLoans, formatLoanMoney, loanKindLabel, loanMoneyInputValid, REGULAR_LOAN_SINGLE_DEDUCTION_NOTE,
  type LoanCapEvaluation, type LoanInstallmentStatus, type LoanLedger,
} from '@/lib/loans-api'
import { LoanCapSummary } from '@/components/payroll/LoanCapSummary'

// AD-15: سلف الموظف هو فقط (GET /loans/mine) — المبلغ والمسدد والمتبقي وأقساط كل سلفة، وطلب سلفة جديدة بسقفها.
const installmentLabels: Record<LoanInstallmentStatus, string> = {
  DUE: 'مستحق', PAID: 'مخصوم من المسير', PARTIAL: 'سداد جزئي والباقي مرحّل', DEFERRED: 'مؤجل بالكامل', SETTLED: 'مسوّى مبكرًا',
  // C8: قسط ترحيل أُلغي بعكس صرف مسير (بلا رصيد)
  REVERSED: 'مُلغى بعكس صرف مسير',
}
const statusBadge = (status: LoanInstallmentStatus) => ['PAID', 'SETTLED'].includes(status) ? 'badge-success' : status === 'DUE' ? 'badge-warning'
  : status === 'REVERSED' ? 'bg-gray-100 text-gray-600' : 'badge-primary'
// رقم القسط بترتيبه داخل السلفة (بدل معرّف قاعدة البيانات)
const installmentNo = (list: Array<{ id: number }>, id: number | null) => { const index = list.findIndex(row => row.id === id); return index >= 0 ? index + 1 : '—' }
// أيام طلب السلفة من الشهر كما يعيدها الخادم مع معاينة السقف
type CapPreview = LoanCapEvaluation & { requestWindow?: { fromDay: number; toDay: number; open: boolean; message: string } }
// «سلفة استثنائية — N قسط» أو «سلفة (مرة واحدة)»؛ السلفة القديمة بلا عدد مسجّل = عدد أقساطها الأصلية
const loanKind = (loan: LoanLedger) => loanKindLabel(loan.isExceptional, loan.installmentMonths ?? loan.installments.filter(row => row.parentInstallmentId === null).length)

export default function MyLoansPage() {
  const currency = useCurrency()
  const [loans, setLoans] = useState<LoanLedger[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [showRequest, setShowRequest] = useState(false)
  const [amount, setAmount] = useState('')
  const [preview, setPreview] = useState<CapPreview | null>(null)
  const [previewError, setPreviewError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')

  const load = () => {
    setLoading(true); setError('')
    fetchMyLoans().then(setLoans).catch(e => setError(e instanceof Error ? e.message : 'تعذر تحميل سلفك')).finally(() => setLoading(false))
  }
  useEffect(load, [])

  // AD-02/04: السقف والمتبقي يظهران قبل التقديم ويتحدثان مع المبلغ — السلفة العادية شهر واحد (قرار المالك 30 سبتمبر)
  useEffect(() => {
    if (!showRequest) return
    const handle = setTimeout(() => {
      setPreviewError('')
      fetchLoanCapPreview({ amount: loanMoneyInputValid(amount) ? amount.trim() : undefined })
        .then(setPreview).catch(e => { setPreview(null); setPreviewError(e instanceof Error ? e.message : 'تعذر حساب السقف') })
    }, 300)
    return () => clearTimeout(handle)
  }, [showRequest, amount])

  // رفض الخادم (السقف أو أيام طلب السلفة من الشهر) يظهر برسالته داخل نافذة الطلب
  const submit = async () => {
    setSubmitting(true); setSubmitError(''); setSubmitSuccess('')
    try {
      // السلفة العادية بتتخصم مرة واحدة: شهر واحد دايمًا — التقسيط للسلفة الاستثنائية من الموارد البشرية بس
      const request = await createRequest('LOAN', { amount: amount.trim(), months: 1 })
      setSubmitSuccess(`أُرسل طلب السلفة رقم ${request.id} للاعتماد؛ يُعاد فحص السقف عند كل خطوة اعتماد`)
      setAmount(''); load()
    } catch (e) { setSubmitError(e instanceof Error ? e.message : 'تعذر إرسال الطلب') } finally { setSubmitting(false) }
  }

  const openTotal = loans.reduce((sum, loan) => sum + Number(loan.remainingAmount), 0)

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* الموبايل (~390px): العنوان والزرار بيلفّوا، والقائمة كروت بدل الجدول العريض */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">سلفي</h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">دفتر سلفك: أصل المبلغ والمسدد والمتبقي وحالة كل قسط</p>
          </div>
          <button onClick={() => { setShowRequest(true); setSubmitError(''); setSubmitSuccess('') }} className="btn-primary flex items-center gap-2 shrink-0">
            <Plus size={18} /> طلب سلفة
          </button>
        </div>

        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4 flex items-center gap-2"><AlertTriangle size={18} className="shrink-0" />{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center shrink-0"><Wallet size={24} className="text-primary-600" /></div>
            <div className="min-w-0"><p className="text-sm text-gray-500">المتبقي عليك</p><p className="text-2xl font-bold text-primary-600 break-all">{formatLoanMoney(openTotal)} <span className="text-sm">{currency}</span></p></div>
          </div>
          <div className="card"><p className="text-sm text-gray-500">عدد السلف</p><p className="text-2xl font-bold text-gray-800">{loans.length}</p></div>
          <div className="card"><p className="text-sm text-gray-500">سلف مفتوحة</p><p className="text-2xl font-bold text-gray-800">{loans.filter(loan => Number(loan.remainingAmount) > 0).length}</p></div>
        </div>

        <div className="card overflow-hidden p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <>
            {/* الموبايل: كارت لكل سلفة، وأقساطها تحتها سطر لكل قسط */}
            <ul className="md:hidden divide-y divide-gray-100" data-testid="my-loans-cards">
              {loans.map(loan => (
                <li key={loan.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800">سلفة رقم {loan.id}{loan.requestId ? ` — طلب رقم ${loan.requestId}` : ''}</p>
                      <p className="text-xs text-gray-600 mt-1">{loanKind(loan)}</p>
                      {loan.firstInstallmentPeriod && <p className="text-xs text-gray-500 mt-1">أول قسط: {loan.firstInstallmentPeriod}</p>}
                    </div>
                    <button aria-label="عرض دفتر السلفة" aria-expanded={expanded === loan.id} onClick={() => setExpanded(expanded === loan.id ? null : loan.id)} className="p-2 hover:bg-gray-100 rounded-lg shrink-0">
                      {expanded === loan.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                  <dl className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-gray-50 rounded-lg p-2 min-w-0"><dt className="text-xs text-gray-500">المعتمد</dt><dd className="font-mono text-sm break-all">{formatLoanMoney(loan.amount)}</dd></div>
                    <div className="bg-gray-50 rounded-lg p-2 min-w-0"><dt className="text-xs text-gray-500">المسدد</dt><dd className="font-mono text-sm text-success-600 break-all">{formatLoanMoney(loan.paidAmount)}</dd></div>
                    <div className="bg-gray-50 rounded-lg p-2 min-w-0"><dt className="text-xs text-gray-500">المتبقي</dt><dd className="font-mono text-sm font-bold text-primary-600 break-all">{formatLoanMoney(loan.remainingAmount)}</dd></div>
                  </dl>
                  <p className="text-xs text-gray-500">
                    الأقساط المسددة: {loan.paidCount} من {loan.installments.length}
                    {loan.requestedAmount && loan.requestedAmount !== loan.amount && ` — المطلوب ${formatLoanMoney(loan.requestedAmount)}`}
                  </p>
                  {expanded === loan.id && (
                    <ul className="space-y-2">
                      {loan.installments.map((item, index) => (
                        <li key={item.id} className="rounded-lg border border-gray-100 bg-white p-3 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-gray-800">القسط {index + 1}</span>
                            <span className={`badge ${statusBadge(item.financialStatus)} text-center`}>{installmentLabels[item.financialStatus]}</span>
                          </div>
                          {item.parentInstallmentId !== null && <p className="text-xs text-gray-500 mt-1">مرحّل من القسط {installmentNo(loan.installments, item.parentInstallmentId)}</p>}
                          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 text-xs">
                            <dt className="text-gray-500">الاستحقاق</dt><dd className="font-mono">{item.dueDate}</dd>
                            <dt className="text-gray-500">المبلغ</dt><dd className="font-mono">{formatLoanMoney(item.amount)}</dd>
                            <dt className="text-gray-500">المدفوع</dt><dd className="font-mono text-success-600">{formatLoanMoney(item.paidAmount)}</dd>
                            <dt className="text-gray-500">المفتوح</dt><dd className="font-mono">{formatLoanMoney(item.remainingAmount)}</dd>
                          </dl>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
              {loans.length === 0 && <li className="text-center py-10 text-gray-400">لا توجد سلف مسجلة لك</li>}
            </ul>
            <div className="hidden md:block overflow-x-auto">
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
                          <p className="font-medium text-gray-800">سلفة رقم {loan.id}{loan.requestId ? ` — طلب رقم ${loan.requestId}` : ''}</p>
                          <p className="text-xs text-gray-600 mt-1">{loanKind(loan)}</p>
                          {loan.firstInstallmentPeriod && <p className="text-xs text-gray-500 mt-1">أول قسط: {loan.firstInstallmentPeriod}</p>}
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
                          <td colSpan={6} className="bg-gray-50 px-6 py-4">
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
                                  </tr>
                                </thead>
                                <tbody>
                                  {loan.installments.map((item, index) => (
                                    <tr key={item.id} className="table-row">
                                      <td className="table-cell">{index + 1}{item.parentInstallmentId !== null && <p className="text-xs text-gray-500">مرحّل من القسط {installmentNo(loan.installments, item.parentInstallmentId)}</p>}</td>
                                      <td className="table-cell text-center font-mono">{item.dueDate}</td>
                                      <td className="table-cell text-center font-mono">{formatLoanMoney(item.amount)}</td>
                                      <td className="table-cell text-center font-mono text-success-600">{formatLoanMoney(item.paidAmount)}</td>
                                      <td className="table-cell text-center font-mono">{formatLoanMoney(item.remainingAmount)}</td>
                                      <td className="table-cell text-center"><span className={`badge ${statusBadge(item.financialStatus)}`}>{installmentLabels[item.financialStatus]}</span></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                  {loans.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-gray-400">لا توجد سلف مسجلة لك</td></tr>}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      </div>

      {showRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-4 sm:p-6 shadow-xl max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="my-loan-title">
            <div className="flex items-center justify-between mb-4">
              <h3 id="my-loan-title" className="font-bold text-gray-800 text-lg">طلب سلفة</h3>
              <button onClick={() => setShowRequest(false)} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="إغلاق"><X size={20} /></button>
            </div>
            {submitError && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 mb-3">{submitError}</div>}
            {submitSuccess && <div role="status" className="bg-success-50 text-success-700 rounded-xl p-3 mb-3">{submitSuccess}</div>}
            <div className="space-y-4">
              <div><label className="label" htmlFor="my-loan-amount">المبلغ ({currency}) *</label>
                <input id="my-loan-amount" className="input" dir="ltr" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" /></div>
              {/* قرار المالك 30 سبتمبر: مفيش عدد أشهر — السلفة العادية قسط واحد */}
              <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3" data-testid="loan-single-deduction-note">{REGULAR_LOAN_SINGLE_DEDUCTION_NOTE}</p>
              {previewError && <p role="alert" className="text-sm text-red-600">{previewError}</p>}
              {preview && <LoanCapSummary cap={preview} currency={currency} title="السقف المتاح لك الآن" />}
              {preview?.requestWindow && (!preview.requestWindow.open || preview.requestWindow.fromDay !== 1 || preview.requestWindow.toDay !== 31) && (
                <p className={`text-sm rounded-xl p-3 ${preview.requestWindow.open ? 'bg-gray-50 text-gray-600' : 'bg-amber-50 text-amber-800'}`}>{preview.requestWindow.message}</p>
              )}
            </div>
            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
              <button className="btn-primary flex-1 disabled:opacity-50" onClick={submit} disabled={submitting || !loanMoneyInputValid(amount) || (preview !== null && !preview.allowed) || preview?.requestWindow?.open === false}>
                {submitting ? 'جارٍ الإرسال...' : 'إرسال للاعتماد'}
              </button>
              <button className="btn-secondary" onClick={() => setShowRequest(false)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
