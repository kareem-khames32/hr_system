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
  ChevronDown,
  ChevronUp,
  Wallet,
  TrendingDown,
  AlertTriangle,
  X,
} from 'lucide-react'
import { can, fetchEmployeeDirectory, fetchLoans, createRequest, getCurrentUser, type ApiEmployeeDirectoryEntry } from '@/lib/api'
import { downloadCsv, csvDateStamp } from '@/lib/csv'
import { useCurrency } from '@/lib/currency'
import { fetchLoanCapPreview, loanMoneyInputValid, type LoanCapEvaluation } from '@/lib/loans-api'
import { LoanCapSummary } from '@/components/payroll/LoanCapSummary'
import { DayRangeFilter, usePayrollDayRange } from '@/components/DayRangeFilter'
import { dateInRange, dayRangeKey, localDayOf, validDayRange } from '@/lib/payroll-month-range'
import { formatDate } from '@/lib/dates'

type Money = string | number
// REVERSED (C8): قسط ترحيل أُلغي بعكس صرف مسير — بلا رصيد
type InstallmentStatus = 'DUE' | 'PARTIAL' | 'DEFERRED' | 'PAID' | 'SETTLED' | 'REVERSED'
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
  // تاريخ طلب السلفة من محرك الطلبات
  requestedAt?: string | null
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
  DUE: 'مستحق', PAID: 'مسدد', PARTIAL: 'سداد جزئي والباقي مرحّل', DEFERRED: 'مؤجل بالكامل', SETTLED: 'مسوّى', REVERSED: 'مُلغى بعكس صرف مسير',
}
const installmentBadge = (status: InstallmentStatus) => ['PAID', 'SETTLED'].includes(status) ? 'badge-success' : status === 'DUE' ? 'badge-warning'
  : status === 'REVERSED' ? 'bg-gray-100 text-gray-600' : 'badge-primary'
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

// رقم القسط بترتيبه داخل السلفة (بدل معرّف قاعدة البيانات)
const installmentNo = (list: Array<{ id: number }>, id: number | null) => { const index = list.findIndex(row => row.id === id); return index >= 0 ? index + 1 : '—' }
// أيام طلب السلفة من الشهر كما يعيدها الخادم مع معاينة السقف
type CapPreview = LoanCapEvaluation & { requestWindow?: { fromDay: number; toDay: number; open: boolean; message: string } }

// فلتر التاريخ في السجل: بتاريخ طلب السلفة، أو بشهر القسط (سلفة ليها قسط مستحق في الفترة)
type LoanDateBasis = 'all' | 'requested' | 'installment'
const loanRequestDay = (loan: Loan) => localDayOf(loan.requestedAt ?? loan.disbursedAt ?? null)

const LOAN_STATUS_LABELS: Record<string, string> = { APPROVED: 'معتمد', DISBURSED: 'جاري السداد', SETTLED: 'مكتمل' }
const loanStatusLabel = (status: string) => LOAN_STATUS_LABELS[status] ?? 'غير معروف'

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
          {loanStatusLabel(status)}
        </span>
      )
  }
}

export default function LoansPage() {
  const currency = useCurrency()
  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'settled'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  // «من تاريخ / إلى تاريخ» (أو شهر رواتب بضغطة) — على تاريخ الطلب أو على شهر القسط
  const [dateBasis, setDateBasis] = useState<LoanDateBasis>('all')
  const { range, setRange, context } = usePayrollDayRange()
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
  // القرار ب1: السلفة تُقيَّد باسم الموظف المختار وبسقفه هو — لا باسم من يرفعها ولا بسقفه
  const [newLoanCap, setNewLoanCap] = useState<CapPreview | null>(null)
  const [canOnBehalf, setCanOnBehalf] = useState(false)
  const [selfEmployeeId, setSelfEmployeeId] = useState<number | null>(null)
  const [directory, setDirectory] = useState<ApiEmployeeDirectoryEntry[]>([])
  const [forEmployeeId, setForEmployeeId] = useState<number | ''>('')
  useEffect(() => {
    setCanOnBehalf(can('requests.create_on_behalf'))
    setSelfEmployeeId(getCurrentUser()?.employeeId ?? null)
  }, [])
  useEffect(() => {
    if (!showNewLoanModal || !canOnBehalf || directory.length) return
    fetchEmployeeDirectory().then(setDirectory).catch(() => setDirectory([]))
  }, [showNewLoanModal, canOnBehalf, directory.length])
  const targetEmployeeId = canOnBehalf ? (forEmployeeId === '' ? null : Number(forEmployeeId)) : selfEmployeeId
  useEffect(() => {
    if (!showNewLoanModal || !targetEmployeeId) { setNewLoanCap(null); return }
    const handle = setTimeout(() => {
      fetchLoanCapPreview({ employeeId: targetEmployeeId, amount: loanMoneyInputValid(loanAmount) ? loanAmount.trim() : undefined,
        months: /^[1-9]\d{0,3}$/.test(loanMonths) ? Number(loanMonths) : undefined })
        .then(setNewLoanCap).catch(() => setNewLoanCap(null))
    }, 300)
    return () => clearTimeout(handle)
  }, [showNewLoanModal, loanAmount, loanMonths, targetEmployeeId])

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
      }, true, targetEmployeeId && targetEmployeeId !== selfEmployeeId ? targetEmployeeId : undefined)
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

  // الفترة بتفلتر الجدول والتبويبات والتصدير؛ كروت الإجماليات فوق فاضلة على كل السلف
  const activeRange = dateBasis === 'all' ? null : validDayRange(range)
  const datedLoans = !activeRange ? loans : loans.filter((loan) => dateBasis === 'requested'
    ? dateInRange(loanRequestDay(loan), activeRange)
    : loan.installments.some((item) => dateInRange(item.dueDate, activeRange)))
  const datedOpen = datedLoans.filter((l) => centsOf(l.remainingAmount) > BigInt(0)).length
  const filteredLoans = datedLoans.filter((loan) => {
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
              onClick={() => downloadCsv(`loans-${activeTab}-${activeRange ? `${dayRangeKey(activeRange)}-` : ''}${csvDateStamp()}.csv`,
                ['رقم السلفة', 'الموظف', 'تاريخ الطلب', 'أصل المبلغ', 'المسدد', 'المتبقي', 'الأقساط المسددة', 'عدد الأقساط', 'تاريخ الصرف', 'الحالة'],
                filteredLoans.map((loan) => [loan.id, loan.employeeName ?? 'غير معروف', loanRequestDay(loan), String(loan.amount), String(loan.paidAmount),
                  String(loan.remainingAmount), loan.paidCount, loan.installments.length, loan.disbursedAt ? String(loan.disbursedAt).slice(0, 10) : '', loanStatusLabel(loan.status)]))}
              disabled={loading || filteredLoans.length === 0}
              className="btn-secondary flex items-center gap-2 disabled:opacity-50"
            >
              <Download size={18} />
              تصدير CSV
            </button>
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
        {/* القرار ب1: سقف السلفة صار في «سياسات النظام» — لا تبويب سياسات هنا */}
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
              { id: 'all', label: 'الكل', count: datedLoans.length },
              { id: 'open', label: 'جاري السداد', count: datedOpen },
              { id: 'settled', label: 'مكتمل', count: datedLoans.length - datedOpen },
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
          <div className="flex flex-wrap items-end gap-4">
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
            <label htmlFor="loans-date-basis" className="text-sm text-gray-600">
              فلتر التاريخ
              <select id="loans-date-basis" className="input mt-1 block w-52" value={dateBasis} onChange={(e) => setDateBasis(e.target.value as LoanDateBasis)}>
                <option value="all">كل السلف (من غير تاريخ)</option>
                <option value="requested">بتاريخ طلب السلفة</option>
                <option value="installment">بشهر القسط (مستحق في الفترة)</option>
              </select>
            </label>
            <DayRangeFilter idPrefix="loans" value={range} onChange={setRange} cycleStartDay={context?.cycleStartDay} today={context?.today} disabled={dateBasis === 'all'} />
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
                          <p className="font-medium text-gray-800">{loan.employeeName ?? 'غير معروف'}</p>
                          <p className="text-sm text-gray-400">
                            {loan.requestId ? `طلب رقم ${loan.requestId}` : `سلفة رقم ${loan.id}`}
                            {loanRequestDay(loan) ? ` — ${formatDate(loanRequestDay(loan))}` : ''}
                          </p>
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
                              </tr>
                            </thead>
                            <tbody>
                              {loan.installments.map((inst, index) => (
                                <tr key={inst.id} className={`table-row ${dateBasis === 'installment' && activeRange && dateInRange(inst.dueDate, activeRange) ? 'bg-primary-50' : ''}`}>
                                  <td className="table-cell">
                                    <span>{index + 1}</span>
                                    {inst.parentInstallmentId !== null && <p className="text-xs text-gray-500">مرحّل من القسط {installmentNo(loan.installments, inst.parentInstallmentId)}</p>}
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
                                      المتبقي على القسط {installmentNo(loan.installments, loan.installments.find(child => child.parentInstallmentId === inst.id)?.id ?? null)}
                                    </p>}
                                  </td>
                                  <td className="table-cell text-center">
                                    <span className={`badge ${installmentBadge(inst.financialStatus)} w-fit mx-auto`}>{installmentLabels[inst.financialStatus]}</span>
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
                      {loans.length === 0 ? 'لا توجد سلف مسجلة' : 'لا توجد سلف مطابقة للفلاتر أو الفترة المختارة'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          )}
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
      </div>

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
              {canOnBehalf && (
                <div>
                  <label className="label" htmlFor="loan-for-employee">الموظف صاحب السلفة *</label>
                  <select id="loan-for-employee" className="input" value={forEmployeeId} onChange={(e) => setForEmployeeId(e.target.value ? Number(e.target.value) : '')}>
                    <option value="">— اختر الموظف —</option>
                    {directory.map((row) => <option key={row.id} value={row.id}>{row.fullName} — {row.employeeCode}</option>)}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">السلفة تُقيَّد باسمه ويُفحص سقفه هو.</p>
                </div>
              )}
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
              {newLoanCap && <LoanCapSummary cap={newLoanCap} currency={currency} title="المتاح لهذا الموظف الآن" />}
              {newLoanCap?.requestWindow && (!newLoanCap.requestWindow.open || newLoanCap.requestWindow.fromDay !== 1 || newLoanCap.requestWindow.toDay !== 31) && (
                <p className={`text-sm rounded-xl p-3 ${newLoanCap.requestWindow.open ? 'bg-gray-50 text-gray-600' : 'bg-amber-50 text-amber-800'}`}>{newLoanCap.requestWindow.message}</p>
              )}
            </div>

            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={submitNewLoan}
                disabled={submitting || !loanAmount || !loanMonths || !targetEmployeeId || newLoanCap?.requestWindow?.open === false || (newLoanCap !== null && !newLoanCap.allowed)}
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
