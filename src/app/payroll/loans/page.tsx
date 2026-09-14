'use client'

import { Fragment, useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Plus,
  Download,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Wallet,
  TrendingDown,
  AlertTriangle,
  X,
} from 'lucide-react'
import { fetchLoans, createRequest, can, getCurrentUser } from '@/lib/api'
import { downloadCsv, csvDateStamp } from '@/lib/csv'
import { useCurrency } from '@/lib/currency'
import { fetchLoanCapPreview, loanMoneyInputValid, type LoanCapEvaluation } from '@/lib/loans-api'
import { LoanCapSummary } from '@/components/payroll/LoanCapSummary'
import { LoanCapPoliciesPanel } from '@/components/payroll/LoanCapPoliciesPanel'
import { LoanExceptionalModal } from '@/components/payroll/LoanExceptionalModal'
import { LoanRecoveriesPanel } from '@/components/payroll/LoanRecoveriesPanel'
import { LoanRepaymentModal } from '@/components/payroll/LoanRepaymentModal'

type Money = string | number
type InstallmentStatus = 'DUE' | 'PARTIAL' | 'DEFERRED' | 'PAID' | 'SETTLED'
interface LoanInstallment {
  id: number
  loanId: number
  dueDate: string
  amount: Money
  paid: boolean
  paidAmount: Money
  remainingAmount: Money
  financialStatus: InstallmentStatus
  financialRevision: number
  parentInstallmentId: number | null
  originalDueDate: string
  paidAt: string | null
  ledgerAvailable: boolean
}

interface Loan {
  id: number
  requestId?: number | null
  employeeId: number
  amount: Money
  status: string // APPROVED | DISBURSED | SETTLED
  disbursedAt?: string | null
  employeeName?: string
  installments: LoanInstallment[]
  paidCount: number
  paidAmount: Money
  remainingAmount: Money
  ledgerAvailable: boolean
}

// الجمع والعرض بالقروش الصحيحة، بما فيها المبالغ التي تتجاوز دقة Number.
const centsOf = (value: Money): bigint => {
  const text = String(value)
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) throw new Error('تعذر عرض مبلغ السلفة بدقة')
  const [whole, fraction = ''] = text.split('.')
  return BigInt(whole + fraction.padEnd(2, '0'))
}
const formatCents = (value: bigint) => `${String(value / BigInt(100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${String(value % BigInt(100)).padStart(2, '0')}`
const formatMoney = (value: Money) => formatCents(centsOf(value))
const isOpenInstallment = (item: LoanInstallment) => item.financialStatus === 'DUE' && centsOf(item.remainingAmount) > BigInt(0)
const installmentLabels: Record<InstallmentStatus, string> = {
  DUE: 'مستحق', PAID: 'مسدد', PARTIAL: 'سداد جزئي والباقي مرحّل', DEFERRED: 'مؤجل بالكامل', SETTLED: 'مسوّى',
}
const installmentBadge = (status: InstallmentStatus) => ['PAID', 'SETTLED'].includes(status) ? 'badge-success' : status === 'DUE' ? 'badge-warning' : 'badge-primary'
const progressWidth = (loan: Loan) => {
  const total = centsOf(loan.amount), paid = centsOf(loan.paidAmount)
  if (total === BigInt(0)) return '0%'
  const scaled = paid * BigInt(10000) / total
  return `${Number(scaled > BigInt(10000) ? BigInt(10000) : scaled) / 100}%`
}
const ownField = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key)
function normalizeLoan(value: unknown): Loan {
  const raw = value as Loan
  const installments = raw.installments.map(item => {
    // توافق خدمة العرض القديمة فقط: كانت لا تعرف إلا amount وpaid.
    const legacy = !ownField(item, 'financialStatus') && !ownField(item, 'paidAmount') && !ownField(item, 'remainingAmount')
    const row: LoanInstallment = legacy ? { ...item, financialStatus: item.paid ? 'PAID' : 'DUE',
      paidAmount: item.paid ? item.amount : '0.00', remainingAmount: item.paid ? '0.00' : item.amount,
      financialRevision: 1, parentInstallmentId: null, originalDueDate: item.dueDate, paidAt: null, ledgerAvailable: false }
      : { ...item, ledgerAvailable: ['financialStatus', 'paidAmount', 'remainingAmount', 'financialRevision', 'parentInstallmentId', 'originalDueDate'].every(key => ownField(item, key)) }
    // الرد الجديد الناقص لا يُستكمل بالتخمين؛ الخطأ يظهر في بانر التحميل قبل الرسم.
    for (const amount of [row.amount, row.paidAmount, row.remainingAmount]) centsOf(amount)
    if (!Object.prototype.hasOwnProperty.call(installmentLabels, row.financialStatus)) throw new Error('حالة أحد الأقساط غير معروفة؛ راجع خدمة السلف')
    return row
  })
  for (const amount of [raw.amount, raw.paidAmount, raw.remainingAmount]) centsOf(amount)
  return { ...raw, installments, ledgerAvailable: installments.every(item => item.ledgerAvailable) }
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'APPROVED':
      return (
        <span className="badge badge-primary flex items-center gap-1">
          <CheckCircle size={12} />
          معتمد
        </span>
      )
    case 'DISBURSED':
      return (
        <span className="badge badge-success flex items-center gap-1">
          <DollarSign size={12} />
          جاري السداد
        </span>
      )
    case 'SETTLED':
      return (
        <span className="badge bg-gray-100 text-gray-600 flex items-center gap-1">
          <CheckCircle size={12} />
          مكتمل
        </span>
      )
    default:
      return (
        <span className="badge badge-warning flex items-center gap-1">
          <Clock size={12} />
          {status}
        </span>
      )
  }
}

export default function LoansPage() {
  const currency = useCurrency()
  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'settled'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewLoanModal, setShowNewLoanModal] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const [loans, setLoans] = useState<Loan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // نموذج طلب سلفة جديد
  const [loanAmount, setLoanAmount] = useState('')
  const [loanMonths, setLoanMonths] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')
  const [deferral, setDeferral] = useState<{ loan: Loan; installment: LoanInstallment } | null>(null)
  const [deferPeriod, setDeferPeriod] = useState('')
  const [deferReason, setDeferReason] = useState('')
  const [deferBusy, setDeferBusy] = useState(false)
  const [deferError, setDeferError] = useState('')
  const [deferSuccess, setDeferSuccess] = useState('')
  // C6 / الخطوة 29: السقف قبل التقديم، والسلفة الاستثنائية، والسداد المبكر، ولوحتا السياسات والأرصدة بعد الإنهاء
  const [section, setSection] = useState<'loans' | 'policies' | 'recoveries'>('loans')
  const [newLoanCap, setNewLoanCap] = useState<LoanCapEvaluation | null>(null)
  const [showExceptional, setShowExceptional] = useState(false)
  const [repaying, setRepaying] = useState<Loan | null>(null)
  const [loanPerms, setLoanPerms] = useState({ exceptional: false, repay: false, selfLinked: false })
  useEffect(() => { setLoanPerms({ exceptional: can('loans.exceptional'), repay: can('loans.repay'), selfLinked: !!getCurrentUser()?.employeeId }) }, [])
  useEffect(() => {
    if (!showNewLoanModal || !loanPerms.selfLinked) { setNewLoanCap(null); return }
    const handle = setTimeout(() => {
      fetchLoanCapPreview({ amount: loanMoneyInputValid(loanAmount) ? loanAmount.trim() : undefined, months: /^[1-9]\d{0,3}$/.test(loanMonths) ? Number(loanMonths) : undefined })
        .then(setNewLoanCap).catch(() => setNewLoanCap(null))
    }, 300)
    return () => clearTimeout(handle)
  }, [showNewLoanModal, loanAmount, loanMonths, loanPerms.selfLinked])

  const loadLoans = () => {
    setError('')
    setLoading(true)
    fetchLoans()
      .then((data) => setLoans(data.map(normalizeLoan)))
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل سجل السلف'))
      .finally(() => setLoading(false))
  }

  useEffect(loadLoans, [])

  const submitNewLoan = async () => {
    setSubmitError('')
    setSubmitSuccess('')
    setSubmitting(true)
    try {
      await createRequest('LOAN', {
        amount: loanAmount,
        months: Number(loanMonths),
      })
      setSubmitSuccess('تم إرسال طلب السلفة للاعتماد — سيظهر في السجل بعد اكتمال الموافقات')
      setLoanAmount('')
      setLoanMonths('')
      loadLoans()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'تعذر إرسال الطلب')
    } finally {
      setSubmitting(false)
    }
  }

  const canDefer = (loan: Loan) => getCurrentUser()?.employeeId === loan.employeeId || can('requests.create_on_behalf')
  const openDeferral = (loan: Loan, installment: LoanInstallment) => {
    setDeferral({ loan, installment }); setDeferPeriod(''); setDeferReason(''); setDeferError(''); setDeferSuccess('')
  }
  const submitDeferral = async () => {
    if (!deferral) return
    setDeferBusy(true); setDeferError('')
    try {
      const request = await createRequest('LOAN_INSTALLMENT_DEFER', { loanId: deferral.loan.id, installmentId: deferral.installment.id,
        toPeriod: deferPeriod, reason: deferReason }, true,
        getCurrentUser()?.employeeId === deferral.loan.employeeId ? undefined : deferral.loan.employeeId)
      setDeferSuccess(request.status === 'COMPLETED'
        ? `اكتمل طلب التأجيل رقم ${request.id} وفق سلسلة السلف المعتمدة`
        : `أُرسل طلب التأجيل رقم ${request.id} للموافقات؛ يظل موعد القسط الحالي قائمًا حتى الاعتماد`)
      loadLoans()
    } catch (e) { setDeferError(e instanceof Error ? e.message : 'تعذر إرسال طلب التأجيل') }
    finally { setDeferBusy(false) }
  }

  // Calculate stats
  const openLoans = loans.filter((l) => centsOf(l.remainingAmount) > BigInt(0))
  const stats = {
    totalActive: openLoans.reduce((sum, l) => sum + centsOf(l.remainingAmount), BigInt(0)),
    disbursedCount: loans.filter((l) => l.status === 'DISBURSED').length,
    activeCount: openLoans.length,
    monthlyDeductions: openLoans.reduce((sum, l) => {
      const due = l.installments.filter(isOpenInstallment), nextPeriod = due[0]?.dueDate.slice(0, 7)
      return due.filter(item => item.dueDate.slice(0, 7) === nextPeriod)
        .reduce((total, item) => total + centsOf(item.remainingAmount), sum)
    }, BigInt(0)),
  }

  const filteredLoans = loans.filter((loan) => {
    if (activeTab === 'open' && centsOf(loan.remainingAmount) === BigInt(0)) return false
    if (activeTab === 'settled' && centsOf(loan.remainingAmount) > BigInt(0)) return false
    if (searchQuery && !(loan.employeeName ?? '').includes(searchQuery)) return false
    return true
  })

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">السلف والقروض</h1>
            <p className="text-gray-500 mt-1">سجل السلف المعتمدة من محرك الطلبات وجدول الأقساط</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => downloadCsv(`loans-${activeTab}-${csvDateStamp()}.csv`,
                ['رقم السلفة', 'الموظف', 'أصل المبلغ', 'المسدد', 'المتبقي', 'الأقساط المسددة', 'عدد الأقساط', 'تاريخ الصرف', 'الحالة'],
                filteredLoans.map((loan) => [loan.id, loan.employeeName ?? `موظف #${loan.employeeId}`, String(loan.amount), String(loan.paidAmount),
                  String(loan.remainingAmount), loan.paidCount, loan.installments.length, loan.disbursedAt ? String(loan.disbursedAt).slice(0, 10) : '', loan.status]))}
              disabled={loading || filteredLoans.length === 0}
              className="btn-secondary flex items-center gap-2 disabled:opacity-50"
            >
              <Download size={18} />
              تصدير CSV
            </button>
            {loanPerms.exceptional && (
              <button type="button" onClick={() => setShowExceptional(true)} className="btn-secondary flex items-center gap-2">
                <AlertTriangle size={18} />
                سلفة استثنائية
              </button>
            )}
            <button
              onClick={() => setShowNewLoanModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={18} />
              طلب سلفة جديد
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4 flex items-center gap-2">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}
        {loans.some(loan => !loan.ledgerAvailable) && <div className="bg-amber-50 text-amber-800 rounded-xl p-4 text-sm">
          خدمة السلف الحالية تعرض بيانات الجدول القديم؛ التفصيل المالي الجديد والتأجيل غير متاحين لهذه السجلات حتى تحديث الخدمة.
        </div>}

        <div className="card p-2 flex items-center gap-2 flex-wrap" role="tablist" aria-label="أقسام السلف">
          {([['loans', 'السلف والأقساط'], ['policies', 'سياسات السقوف'], ['recoveries', 'أرصدة بعد الإنهاء']] as const).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={section === id} onClick={() => setSection(id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium ${section === id ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{label}</button>
          ))}
        </div>
        {section === 'policies' && <LoanCapPoliciesPanel currency={currency} />}
        {section === 'recoveries' && <LoanRecoveriesPanel currency={currency} />}
        {section === 'loans' && <>
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
                <Wallet size={24} className="text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">إجمالي السلف النشطة</p>
                <p className="text-2xl font-bold text-primary-600">{formatCents(stats.totalActive)}</p>
                <p className="text-xs text-gray-400">المتبقي بدون سداد</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-warning-50 rounded-2xl flex items-center justify-center">
                <Clock size={24} className="text-warning-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">سلف مصروفة</p>
                <p className="text-2xl font-bold text-warning-600">{stats.disbursedCount}</p>
                <p className="text-xs text-gray-400">تم صرفها للموظف</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
                <TrendingDown size={24} className="text-success-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">سلف جاري سدادها</p>
                <p className="text-2xl font-bold text-success-600">{stats.activeCount}</p>
                <p className="text-xs text-gray-400">سلفة</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-danger-50 rounded-2xl flex items-center justify-center">
                <DollarSign size={24} className="text-danger-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">القسط القادم (إجمالي)</p>
                <p className="text-2xl font-bold text-danger-600">{formatCents(stats.monthlyDeductions)}</p>
                <p className="text-xs text-gray-400">الاستحقاق القادم قبل ضوابط الخصم</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="card p-2">
          <div className="flex items-center gap-2">
            {[
              { id: 'all', label: 'الكل', count: loans.length },
              { id: 'open', label: 'جاري السداد', count: openLoans.length },
              { id: 'settled', label: 'مكتمل', count: loans.length - openLoans.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.id ? 'bg-white/20' : 'bg-gray-200'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="card">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="بحث باسم الموظف..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input pr-10"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Loans Table */}
        <div className="card overflow-hidden p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="text-right px-4 py-4">الموظف</th>
                  <th className="text-center px-4 py-4">المبلغ</th>
                  <th className="text-center px-4 py-4">قيود الجدول</th>
                  <th className="text-center px-4 py-4">مسدد بالكامل</th>
                  <th className="text-center px-4 py-4">المسدد</th>
                  <th className="text-center px-4 py-4">المتبقي</th>
                  <th className="text-center px-4 py-4">الحالة</th>
                  <th className="text-center px-4 py-4">الجدول</th>
                </tr>
              </thead>
              <tbody>
                {filteredLoans.map((loan) => (
                  <Fragment key={loan.id}>
                  <tr className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold">
                          {(loan.employeeName ?? '؟').charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{loan.employeeName ?? `موظف #${loan.employeeId}`}</p>
                          <p className="text-sm text-gray-400">{loan.requestId ? `طلب رقم #${loan.requestId}` : `سلفة #${loan.id}`}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell text-center font-mono font-bold text-gray-800">
                      {formatMoney(loan.amount)}
                    </td>
                    <td className="table-cell text-center">{loan.installments.length}</td>
                    <td className="table-cell text-center">{loan.paidCount} من {loan.installments.length}</td>
                    <td className="table-cell text-center">
                      <div>
                        <span className="font-mono text-success-600">{formatMoney(loan.paidAmount)}</span>
                        {centsOf(loan.remainingAmount) > BigInt(0) && (
                          <div className="w-full h-1.5 bg-gray-100 rounded-full mt-1">
                            <div
                              className="h-full bg-success-500 rounded-full"
                              style={{ width: progressWidth(loan) }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="table-cell text-center font-mono font-bold text-primary-600">
                      {formatMoney(loan.remainingAmount)}
                    </td>
                    <td className="table-cell text-center">{getStatusBadge(loan.status)}</td>
                    <td className="table-cell">
                      <div className="flex items-center justify-center gap-1">
                        {loanPerms.repay && loan.ledgerAvailable && centsOf(loan.remainingAmount) > BigInt(0) && (
                          <button type="button" onClick={() => setRepaying(loan)} className="btn-secondary text-sm whitespace-nowrap">سداد مبكر</button>
                        )}
                        <button
                          onClick={() => setExpandedId(expandedId === loan.id ? null : loan.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          {expandedId === loan.id ? (
                            <ChevronUp size={18} className="text-gray-500" />
                          ) : (
                            <ChevronDown size={18} className="text-gray-500" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === loan.id && (
                    <tr key={`inst-${loan.id}`}>
                      <td colSpan={8} className="bg-gray-50 px-6 py-4">
                        <p className="font-medium text-gray-700 mb-3">جدول الأقساط</p>
                        <p className="text-sm text-gray-500 mb-3">{loan.ledgerAvailable ? 'القسط المؤجل أو المسدد جزئيًا يحتفظ بتاريخه ومبلغه؛ يظهر الجزء المتبقي في قسط جديد مرتبط به.' : 'هذا جدول من خدمة العرض القديمة؛ المدفوع والمتبقي معروضان وفق حالة السداد القديمة.'}</p>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="table-header">
                                <th className="text-right px-4 py-2">#</th>
                                <th className="text-center px-4 py-2">تاريخ الاستحقاق</th>
                                <th className="text-center px-4 py-2">مبلغ القسط</th>
                                <th className="text-center px-4 py-2">المدفوع فعليًا</th>
                                <th className="text-center px-4 py-2">الرصيد المفتوح</th>
                                <th className="text-center px-4 py-2">الحالة</th>
                                <th className="text-center px-4 py-2">الطلب</th>
                              </tr>
                            </thead>
                            <tbody>
                              {loan.installments.map((inst) => (
                                <tr key={inst.id} className="table-row">
                                  <td className="table-cell">
                                    <span>#{inst.id}</span>
                                    {inst.parentInstallmentId !== null && <p className="text-xs text-gray-500">مرحّل من #{inst.parentInstallmentId}</p>}
                                  </td>
                                  <td className="table-cell text-center font-mono">
                                    {inst.dueDate}
                                    {inst.originalDueDate !== inst.dueDate && <p className="text-xs text-gray-500">الأصلي: {inst.originalDueDate}</p>}
                                  </td>
                                  <td className="table-cell text-center font-mono">{formatMoney(inst.amount)}</td>
                                  <td className="table-cell text-center font-mono text-success-600">{formatMoney(inst.paidAmount)}</td>
                                  <td className="table-cell text-center font-mono">
                                    {formatMoney(inst.remainingAmount)}
                                    {['PARTIAL', 'DEFERRED'].includes(inst.financialStatus) && <p className="text-xs text-gray-500 font-sans">
                                      المتبقي على القسط #{loan.installments.find(child => child.parentInstallmentId === inst.id)?.id ?? '—'}
                                    </p>}
                                  </td>
                                  <td className="table-cell text-center">
                                    <span className={`badge ${installmentBadge(inst.financialStatus)} w-fit mx-auto`}>{installmentLabels[inst.financialStatus]}</span>
                                  </td>
                                  <td className="table-cell text-center">
                                    {inst.ledgerAvailable && isOpenInstallment(inst) && canDefer(loan) ? <button className="btn-secondary text-sm whitespace-nowrap" onClick={() => openDeferral(loan, inst)}>طلب تأجيل</button> : '—'}
                                  </td>
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
                {filteredLoans.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-gray-400">
                      لا توجد سلف مسجلة
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              عرض <span className="font-medium text-gray-700">1-{filteredLoans.length}</span> من{' '}
              <span className="font-medium text-gray-700">{filteredLoans.length}</span> سجل
            </p>
            <div className="flex items-center gap-2">
              <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50" disabled>
                <ChevronRight size={18} />
              </button>
              <button className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium">
                1
              </button>
              <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50" disabled>
                <ChevronLeft size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Loan Flow Info */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card border-r-4 border-primary-500">
            <h3 className="font-bold text-gray-800 mb-2">تقديم الطلب</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• يقدَّم الطلب من محرك الطلبات (نوع «سلفة»)</li>
              <li>• يحدد الموظف المبلغ وعدد الأشهر</li>
            </ul>
          </div>
          <div className="card border-r-4 border-warning-500">
            <h3 className="font-bold text-gray-800 mb-2">الاعتماد</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• يمر الطلب بسلسلة الموافقات المعتمدة</li>
              <li>• عند الاكتمال يُنشأ سجل السلفة وجدول الأقساط آلياً</li>
            </ul>
          </div>
          <div className="card border-r-4 border-danger-500">
            <h3 className="font-bold text-gray-800 mb-2">السداد</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• تُخصم الأقساط المستحقة آلياً من مسير الرواتب</li>
              <li>• يُثبت المدفوع عند الصرف، والجزء المؤجل يبقى ظاهرًا في الجدول</li>
            </ul>
          </div>
        </div>
        </>}
      </div>

      {deferral && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="deferral-title">
            <div className="flex items-center justify-between mb-4">
              <h3 id="deferral-title" className="font-bold text-gray-800 text-lg">طلب تأجيل قسط</h3>
              <button disabled={deferBusy} onClick={() => setDeferral(null)} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="إغلاق"><X size={20} /></button>
            </div>
            <p className="text-sm text-gray-600 mb-4">{deferral.loan.employeeName} — القسط #{deferral.installment.id} برصيد {formatMoney(deferral.installment.remainingAmount)} {currency}، مستحق {deferral.installment.dueDate}.</p>
            <p className="text-sm text-gray-500 mb-4">يمكن طلب التأجيل حتى مع كفاية الراتب. يمر الطلب بسلسلة موافقات السلف، ويتغير الجدول بعد اكتمال الاعتماد.</p>
            {deferError && <div className="bg-red-50 text-red-700 rounded-xl p-3 mb-4" role="alert">{deferError}</div>}
            {deferSuccess && <div className="bg-success-50 text-success-700 rounded-xl p-3 mb-4" role="status">{deferSuccess}</div>}
            <div className="space-y-4">
              <div><label className="label" htmlFor="defer-period">شهر التأجيل *</label>
                <input id="defer-period" type="month" value={deferPeriod} onChange={event => setDeferPeriod(event.target.value)} disabled={deferBusy || !!deferSuccess} className="input" dir="ltr" />
              </div>
              <div><label className="label" htmlFor="defer-reason">سبب التأجيل *</label>
                <textarea id="defer-reason" value={deferReason} onChange={event => setDeferReason(event.target.value)} minLength={3} maxLength={500} disabled={deferBusy || !!deferSuccess} className="input" rows={3} />
              </div>
            </div>
            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
              <button className="btn-primary flex-1 disabled:opacity-50" onClick={submitDeferral} disabled={deferBusy || !!deferSuccess || !deferPeriod || deferReason.trim().length < 3}>{deferBusy ? 'جارٍ الإرسال...' : 'إرسال للموافقة'}</button>
              <button className="btn-secondary" disabled={deferBusy} onClick={() => setDeferral(null)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {showExceptional && <LoanExceptionalModal currency={currency} onClose={() => setShowExceptional(false)} onDone={loadLoans} />}
      {repaying && <LoanRepaymentModal loan={{ id: repaying.id, employeeName: repaying.employeeName, remainingAmount: String(repaying.remainingAmount) }} currency={currency} onClose={() => setRepaying(null)} onDone={loadLoans} />}
      {/* New Loan Modal */}
      {showNewLoanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 text-lg">طلب سلفة جديد</h3>
              <button
                onClick={() => {
                  setShowNewLoanModal(false)
                  setSubmitError('')
                  setSubmitSuccess('')
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {submitError && (
              <div className="bg-red-50 text-red-700 rounded-xl p-4 mb-4 flex items-center gap-2">
                <XCircle size={18} />
                {submitError}
              </div>
            )}
            {submitSuccess && (
              <div className="bg-success-50 text-success-700 rounded-xl p-4 mb-4 flex items-center gap-2">
                <CheckCircle size={18} />
                {submitSuccess}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="label">مبلغ السلفة ({currency}) *</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                  className="input"
                  placeholder="0.00"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="label">عدد أشهر السداد *</label>
                <input
                  type="number"
                  value={loanMonths}
                  onChange={(e) => setLoanMonths(e.target.value)}
                  className="input"
                  placeholder="0"
                  dir="ltr"
                />
              </div>
              {newLoanCap && <LoanCapSummary cap={newLoanCap} currency={currency} title="السقف المتاح لك الآن" />}
            </div>

            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={submitNewLoan}
                disabled={submitting || !loanAmount || !loanMonths}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'جارٍ الإرسال...' : 'إرسال الطلب'}
              </button>
              <button
                onClick={() => {
                  setShowNewLoanModal(false)
                  setSubmitError('')
                  setSubmitSuccess('')
                }}
                className="btn-secondary"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
