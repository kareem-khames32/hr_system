'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import {
  Search,
  Plus,
  Download,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Wallet,
  TrendingDown,
  Calendar,
  User,
} from 'lucide-react'
import Link from 'next/link'

interface LoanRequest {
  id: string
  employeeId: string
  employeeName: string
  avatar: string
  department: string
  loanType: 'salary_advance' | 'long_term' | 'emergency'
  amount: number
  installments: number
  installmentAmount: number
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'completed'
  requestDate: string
  approvedDate?: string
  paidAmount: number
  remainingAmount: number
  startDate?: string
  endDate?: string
}

const loanRequests: LoanRequest[] = [
  {
    id: '1',
    employeeId: 'EMP002',
    employeeName: 'سارة أحمد الخالدي',
    avatar: 'س',
    department: 'الموارد البشرية',
    loanType: 'long_term',
    amount: 20000,
    installments: 20,
    installmentAmount: 1000,
    reason: 'شراء سيارة',
    status: 'active',
    requestDate: '2025/06/15',
    approvedDate: '2025/06/20',
    paidAmount: 7000,
    remainingAmount: 13000,
    startDate: '2025/07/01',
    endDate: '2027/02/01',
  },
  {
    id: '2',
    employeeId: 'EMP005',
    employeeName: 'عمر سالم الحربي',
    avatar: 'ع',
    department: 'التسويق',
    loanType: 'long_term',
    amount: 30000,
    installments: 15,
    installmentAmount: 2000,
    reason: 'تجديد المنزل',
    status: 'active',
    requestDate: '2025/09/01',
    approvedDate: '2025/09/10',
    paidAmount: 8000,
    remainingAmount: 22000,
    startDate: '2025/10/01',
    endDate: '2027/01/01',
  },
  {
    id: '3',
    employeeId: 'EMP003',
    employeeName: 'محمد خالد السعيد',
    avatar: 'م',
    department: 'المبيعات',
    loanType: 'salary_advance',
    amount: 5000,
    installments: 1,
    installmentAmount: 5000,
    reason: 'ظروف شخصية طارئة',
    status: 'pending',
    requestDate: '2026/01/25',
    paidAmount: 0,
    remainingAmount: 5000,
  },
  {
    id: '4',
    employeeId: 'EMP008',
    employeeName: 'ريم سعود الدوسري',
    avatar: 'ر',
    department: 'تقنية المعلومات',
    loanType: 'emergency',
    amount: 10000,
    installments: 5,
    installmentAmount: 2000,
    reason: 'حالة طبية طارئة',
    status: 'pending',
    requestDate: '2026/01/28',
    paidAmount: 0,
    remainingAmount: 10000,
  },
  {
    id: '5',
    employeeId: 'EMP006',
    employeeName: 'نورة محمد العتيبي',
    avatar: 'ن',
    department: 'خدمة العملاء',
    loanType: 'salary_advance',
    amount: 4500,
    installments: 1,
    installmentAmount: 4500,
    reason: 'سفر عائلي',
    status: 'completed',
    requestDate: '2025/11/10',
    approvedDate: '2025/11/12',
    paidAmount: 4500,
    remainingAmount: 0,
    startDate: '2025/11/15',
    endDate: '2025/12/28',
  },
]

const getLoanTypeBadge = (type: LoanRequest['loanType']) => {
  switch (type) {
    case 'salary_advance':
      return <span className="badge badge-primary">سلفة راتب</span>
    case 'long_term':
      return <span className="badge badge-warning">قرض طويل</span>
    case 'emergency':
      return <span className="badge badge-danger">سلفة طوارئ</span>
  }
}

const getStatusBadge = (status: LoanRequest['status']) => {
  switch (status) {
    case 'pending':
      return (
        <span className="badge badge-warning flex items-center gap-1">
          <Clock size={12} />
          في الانتظار
        </span>
      )
    case 'approved':
      return (
        <span className="badge badge-primary flex items-center gap-1">
          <CheckCircle size={12} />
          معتمد
        </span>
      )
    case 'rejected':
      return (
        <span className="badge badge-danger flex items-center gap-1">
          <XCircle size={12} />
          مرفوض
        </span>
      )
    case 'active':
      return (
        <span className="badge badge-success flex items-center gap-1">
          <DollarSign size={12} />
          جاري السداد
        </span>
      )
    case 'completed':
      return (
        <span className="badge bg-gray-100 text-gray-600 flex items-center gap-1">
          <CheckCircle size={12} />
          مكتمل
        </span>
      )
  }
}

export default function LoansPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'active' | 'completed'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewLoanModal, setShowNewLoanModal] = useState(false)

  // Calculate stats
  const stats = {
    totalActive: loanRequests
      .filter((l) => l.status === 'active')
      .reduce((sum, l) => sum + l.remainingAmount, 0),
    pendingCount: loanRequests.filter((l) => l.status === 'pending').length,
    activeCount: loanRequests.filter((l) => l.status === 'active').length,
    monthlyDeductions: loanRequests
      .filter((l) => l.status === 'active')
      .reduce((sum, l) => sum + l.installmentAmount, 0),
  }

  const filteredLoans = loanRequests.filter((loan) => {
    if (activeTab !== 'all' && loan.status !== activeTab) return false
    if (
      searchQuery &&
      !loan.employeeName.includes(searchQuery) &&
      !loan.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false
    return true
  })

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">السلف والقروض</h1>
            <p className="text-gray-500 mt-1">إدارة طلبات السلف والقروض للموظفين</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-secondary flex items-center gap-2">
              <Download size={18} />
              تصدير
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

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
                <Wallet size={24} className="text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">إجمالي السلف النشطة</p>
                <p className="text-2xl font-bold text-primary-600">{stats.totalActive.toLocaleString()}</p>
                <p className="text-xs text-gray-400">ريال سعودي</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-warning-50 rounded-2xl flex items-center justify-center">
                <Clock size={24} className="text-warning-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">طلبات معلقة</p>
                <p className="text-2xl font-bold text-warning-600">{stats.pendingCount}</p>
                <p className="text-xs text-gray-400">بانتظار الموافقة</p>
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
                <p className="text-xs text-gray-400">موظف</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-danger-50 rounded-2xl flex items-center justify-center">
                <DollarSign size={24} className="text-danger-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">إجمالي الخصم الشهري</p>
                <p className="text-2xl font-bold text-danger-600">{stats.monthlyDeductions.toLocaleString()}</p>
                <p className="text-xs text-gray-400">ريال سعودي</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="card p-2">
          <div className="flex items-center gap-2">
            {[
              { id: 'all', label: 'الكل', count: loanRequests.length },
              { id: 'pending', label: 'في الانتظار', count: loanRequests.filter((l) => l.status === 'pending').length },
              { id: 'active', label: 'نشط', count: loanRequests.filter((l) => l.status === 'active').length },
              { id: 'completed', label: 'مكتمل', count: loanRequests.filter((l) => l.status === 'completed').length },
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
                  placeholder="بحث بالاسم أو الرقم الوظيفي..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input pr-10"
                />
              </div>
            </div>

            <select className="input w-40">
              <option value="all">كل الأنواع</option>
              <option value="salary_advance">سلفة راتب</option>
              <option value="long_term">قرض طويل</option>
              <option value="emergency">سلفة طوارئ</option>
            </select>
          </div>
        </div>

        {/* Loans Table */}
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="text-right px-4 py-4">الموظف</th>
                  <th className="text-center px-4 py-4">النوع</th>
                  <th className="text-center px-4 py-4">المبلغ</th>
                  <th className="text-center px-4 py-4">الأقساط</th>
                  <th className="text-center px-4 py-4">القسط الشهري</th>
                  <th className="text-center px-4 py-4">المسدد</th>
                  <th className="text-center px-4 py-4">المتبقي</th>
                  <th className="text-center px-4 py-4">الحالة</th>
                  <th className="text-center px-4 py-4">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredLoans.map((loan) => (
                  <tr key={loan.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center text-white font-bold">
                          {loan.avatar}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{loan.employeeName}</p>
                          <p className="text-sm text-gray-400">{loan.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell text-center">{getLoanTypeBadge(loan.loanType)}</td>
                    <td className="table-cell text-center font-mono font-bold text-gray-800">
                      {loan.amount.toLocaleString()}
                    </td>
                    <td className="table-cell text-center">{loan.installments} شهر</td>
                    <td className="table-cell text-center font-mono text-danger-600">
                      {loan.installmentAmount.toLocaleString()}
                    </td>
                    <td className="table-cell text-center">
                      <div>
                        <span className="font-mono text-success-600">{loan.paidAmount.toLocaleString()}</span>
                        {loan.status === 'active' && (
                          <div className="w-full h-1.5 bg-gray-100 rounded-full mt-1">
                            <div
                              className="h-full bg-success-500 rounded-full"
                              style={{ width: `${(loan.paidAmount / loan.amount) * 100}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="table-cell text-center font-mono font-bold text-primary-600">
                      {loan.remainingAmount.toLocaleString()}
                    </td>
                    <td className="table-cell text-center">{getStatusBadge(loan.status)}</td>
                    <td className="table-cell">
                      <div className="flex items-center justify-center gap-1">
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                          <Eye size={18} className="text-gray-500" />
                        </button>
                        {loan.status === 'pending' && (
                          <>
                            <button className="p-2 bg-success-50 hover:bg-success-100 rounded-lg transition-colors">
                              <CheckCircle size={18} className="text-success-600" />
                            </button>
                            <button className="p-2 bg-danger-50 hover:bg-danger-100 rounded-lg transition-colors">
                              <XCircle size={18} className="text-danger-600" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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

        {/* Loan Types Info */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card border-r-4 border-primary-500">
            <h3 className="font-bold text-gray-800 mb-2">سلفة راتب</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• حد أقصى 50% من الراتب</li>
              <li>• تُخصم من راتب الشهر التالي</li>
              <li>• بدون فوائد</li>
            </ul>
          </div>
          <div className="card border-r-4 border-warning-500">
            <h3 className="font-bold text-gray-800 mb-2">قرض طويل الأجل</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• حد أقصى 3 رواتب</li>
              <li>• تقسيط حتى 24 شهر</li>
              <li>• بدون فوائد</li>
            </ul>
          </div>
          <div className="card border-r-4 border-danger-500">
            <h3 className="font-bold text-gray-800 mb-2">سلفة طوارئ</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• للحالات الطارئة فقط</li>
              <li>• موافقة سريعة</li>
              <li>• تقسيط حتى 6 أشهر</li>
            </ul>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
