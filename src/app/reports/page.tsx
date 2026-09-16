'use client'

import { employeeStatusLabels as statusLabels, overtimeStatusLabels, payMethodLabels } from '@/lib/status-labels'
import { useLeaveCatalog } from '@/lib/leave-catalog'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout'
import {
  Download,
  TrendingUp,
  Users,
  DollarSign,
  Eye,
  RefreshCw,
  UserCheck,
  UserMinus,
} from 'lucide-react'
import {
  fetchAttendanceReport,
  fetchHeadcountReport,
  fetchLeavesReport,
  fetchOvertimeReport,
  fetchPayrollReport,
  fetchRequestsReport,
} from '@/lib/api'
import { downloadCsv, csvDateStamp } from '@/lib/csv'
import { localMonth, localToday } from '@/lib/dates'
import { categoryLabels } from '@/data/requestsCatalog'

interface HeadcountReport {
  byBranch: Array<{ branchName: string; total: number; active: number }>
  byDepartment: Array<{ departmentName: string; total: number }>
  byStatus: Array<{ status: string; total: number }>
}

interface AttendanceRow {
  employeeId: number
  fullName: string
  employeeCode: string
  presentDays: number
  lateDays: number
  absentDays: number
  earlyLeaveDays: number
  totalLateMinutes: number
  totalWorkMinutes: number
}

interface LeavesReport {
  byType: Array<{ leaveType: string; requests: number; totalDays: number }>
  balances: Array<{ employeeId: number; fullName: string; balanceType: string }>
}

interface PayrollReport {
  // المسير بلا فرع (قسم/فريق/مخصّص) يأتي branchName = null ويُعرض بوصف نطاقه
  runs: Array<{
    id: number
    name: string | null
    period: string
    status: string
    totalNet: number | string
    branchName: string | null
    scopeLabel: string
    employees: number
  }>
  byMethod: Array<{ payMethod: string; count: number; total: number }>
  deductions: Array<{
    period: string
    lateness: number
    unpaidLeave: number
    loans: number
    overtime: number
  }>
}

interface OvertimeRow {
  employeeId: number
  fullName: string
  status: string
  entries: number
  actualHours: number
  payableHours: number
  // قيمة لقطة الاعتماد — تصل فقط لمن يملك صلاحية عرض الرواتب
  approvedAmount?: string | null
}

interface RequestsReport {
  byType: Array<{ category: string; status: string; total: number }>
}

const pieColors = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-yellow-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-gray-500',
]





export default function ReportsPage() {
  const leaveCatalog = useLeaveCatalog()
  const leaveTypeLabels = leaveCatalog.labels
  const [headcount, setHeadcount] = useState<HeadcountReport | null>(null)
  const [attendance, setAttendance] = useState<AttendanceRow[]>([])
  const [leaves, setLeaves] = useState<LeavesReport | null>(null)
  const [payroll, setPayroll] = useState<PayrollReport | null>(null)
  const [overtime, setOvertime] = useState<OvertimeRow[]>([])
  const [requests, setRequests] = useState<RequestsReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState('all')

  // الشهر/السنة بالتوقيت المحلي — toISOString (UTC) كانت تفتح الشهر السابق من 00:00 لـ03:00
  const currentMonth = localMonth()
  const currentYear = localToday().slice(0, 4)

  const loadData = async () => {
    setLoading(true)
    try {
      const [hc, att, lv, pr, ot, rq] = await Promise.all([
        fetchHeadcountReport(),
        fetchAttendanceReport(currentMonth),
        fetchLeavesReport(currentYear),
        fetchPayrollReport(),
        fetchOvertimeReport(currentMonth),
        fetchRequestsReport(),
      ])
      setHeadcount(hc)
      setAttendance(att)
      setLeaves(lv)
      setPayroll(pr)
      setOvertime(ot)
      setRequests(rq)
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ===== مشتقات القوى العاملة =====
  const totalEmployees =
    headcount?.byStatus.reduce((sum, s) => sum + Number(s.total), 0) ?? 0
  const activeEmployees =
    Number(headcount?.byStatus.find((s) => s.status === 'active')?.total ?? 0)
  const archivedEmployees =
    Number(headcount?.byStatus.find((s) => s.status === 'archived')?.total ?? 0)

  const maxBranchTotal = Math.max(
    1,
    ...(headcount?.byBranch.map((b) => Number(b.total)) ?? [1])
  )

  const departmentTotal =
    headcount?.byDepartment.reduce((sum, d) => sum + Number(d.total), 0) ?? 0

  // ===== مشتقات الرواتب =====
  const payrollTotal =
    payroll?.runs.reduce((sum, r) => sum + Number(r.totalNet), 0) ?? 0
  const maxRunNet = Math.max(1, ...(payroll?.runs.map((r) => Number(r.totalNet)) ?? [1]))

  // ===== مشتقات الحضور =====
  const maxAttendanceDays = Math.max(
    1,
    ...attendance.map((a) => Math.max(Number(a.presentDays), Number(a.lateDays)))
  )

  // ===== مشتقات الطلبات (فئة × حالة) =====
  const requestCategories = [
    ...new Set(requests?.byType.map((r) => r.category) ?? []),
  ]
  const requestCell = (category: string, statuses: string[]) =>
    requests?.byType
      .filter((r) => r.category === category && statuses.includes(r.status))
      .reduce((sum, r) => sum + Number(r.total), 0) ?? 0
  const requestOther = (category: string) =>
    requests?.byType
      .filter(
        (r) =>
          r.category === category &&
          !['COMPLETED', 'UNDER_REVIEW', 'REJECTED'].includes(r.status)
      )
      .reduce((sum, r) => sum + Number(r.total), 0) ?? 0
  const requestCategoryTotal = (category: string) =>
    requests?.byType
      .filter((r) => r.category === category)
      .reduce((sum, r) => sum + Number(r.total), 0) ?? 0
  const totalRequests =
    requests?.byType.reduce((sum, r) => sum + Number(r.total), 0) ?? 0

  const categoryLabelOf = (category: string) =>
    (categoryLabels as Record<string, string>)[category] ?? category

  // ===== بطاقات التقارير المتاحة (بأرقام حقيقية) =====
  const reportCards = [
    {
      id: 'headcount',
      title: 'تقرير القوى العاملة',
      description: 'توزيع الموظفين حسب الفروع والأقسام والحالة',
      category: 'الموارد البشرية',
      icon: '👥',
      href: '/employees',
      stat: `${totalEmployees} موظف في ${headcount?.byBranch.length ?? 0} فرع`,
    },
    {
      id: 'attendance',
      title: 'تقرير الحضور والانصراف',
      description: 'ملخص الحضور والتأخير والغياب للموظفين',
      category: 'الحضور',
      icon: '⏰',
      href: '/attendance/reports',
      stat: `${attendance.length} موظف متابع هذا الشهر`,
    },
    {
      id: 'payroll',
      title: 'تقرير الرواتب',
      description: 'مسيرات الرواتب وطرق الدفع والخصومات',
      category: 'الرواتب',
      icon: '💰',
      href: '/payroll/reports',
      stat: `${payroll?.runs.length ?? 0} مسير رواتب`,
    },
    {
      id: 'leaves',
      title: 'تقرير الإجازات',
      description: 'طلبات الإجازات وأرصدة الموظفين لهذا العام',
      category: 'الإجازات',
      icon: '🏖️',
      href: '/leaves/balance',
      stat: `${leaves?.byType.length ?? 0} نوع إجازة • ${leaves?.balances.length ?? 0} سجل رصيد`,
    },
    {
      id: 'overtime',
      title: 'تقرير العمل الإضافي',
      description: 'ساعات الأوفرتايم الفعلية والمستحقة هذا الشهر',
      category: 'الحضور',
      icon: '⏱️',
      href: '/attendance/overtime',
      stat: `${overtime.length} موظف لديه عمل إضافي`,
    },
    {
      id: 'requests',
      title: 'تقرير الطلبات',
      description: 'الطلبات حسب الفئة والحالة في دورات الاعتماد',
      category: 'الطلبات',
      icon: '📋',
      href: '/requests-console',
      stat: `${totalRequests} طلب`,
    },
  ]

  // تصدير CSV حقيقي لكل بطاقة من البيانات المحمّلة نفسها (الخطوة 30: لا زر تصدير بلا ملف)
  const exportReport = (id: string) => {
    const stamp = csvDateStamp()
    switch (id) {
      case 'headcount':
        return downloadCsv(`headcount-${stamp}.csv`, ['النوع', 'الاسم/الحالة', 'الإجمالي', 'النشطون'], [
          ...(headcount?.byBranch ?? []).map((b) => ['فرع', b.branchName, b.total, b.active]),
          ...(headcount?.byDepartment ?? []).map((d) => ['قسم', d.departmentName, d.total, '']),
          ...(headcount?.byStatus ?? []).map((s) => ['حالة', statusLabels[s.status] ?? s.status, s.total, '']),
        ])
      case 'attendance':
        return downloadCsv(`attendance-${currentMonth}-${stamp}.csv`,
          ['الرقم الوظيفي', 'الموظف', 'أيام الحضور', 'أيام التأخير', 'أيام الغياب', 'انصراف مبكر', 'دقائق التأخير', 'دقائق العمل'],
          attendance.map((a) => [a.employeeCode, a.fullName, a.presentDays, a.lateDays, a.absentDays, a.earlyLeaveDays, a.totalLateMinutes, a.totalWorkMinutes]))
      case 'payroll':
        return downloadCsv(`payroll-runs-${stamp}.csv`, ['رقم المسير', 'الاسم', 'الفترة', 'النطاق', 'الحالة', 'الموظفون', 'الصافي'],
          (payroll?.runs ?? []).map((r) => [r.id, r.name ?? '', r.period, r.branchName ?? r.scopeLabel, r.status, r.employees, r.totalNet]))
      case 'leaves':
        return downloadCsv(`leaves-${currentYear}-${stamp}.csv`, ['نوع الإجازة', 'عدد الطلبات', 'إجمالي الأيام'],
          (leaves?.byType ?? []).map((t) => [leaveTypeLabels[t.leaveType] ?? t.leaveType, t.requests, t.totalDays]))
      case 'overtime':
        return downloadCsv(`overtime-${currentMonth}-${stamp}.csv`, ['الموظف', 'الحالة', 'عدد السجلات', 'الساعات الفعلية', 'الساعات المستحقة', 'قيمة المعتمد'],
          overtime.map((o) => [o.fullName, overtimeStatusLabels[o.status] ?? o.status, o.entries, o.actualHours, o.payableHours, o.approvedAmount ?? '']))
      case 'requests':
        return exportRequests()
    }
  }
  const exportRequests = () =>
    downloadCsv(`requests-by-category-${csvDateStamp()}.csv`, ['الفئة', 'مكتملة', 'قيد المراجعة', 'مرفوضة', 'أخرى', 'الإجمالي'],
      requestCategories.map((category) => [categoryLabelOf(category), requestCell(category, ['COMPLETED']), requestCell(category, ['UNDER_REVIEW']),
        requestCell(category, ['REJECTED']), requestOther(category), requestCategoryTotal(category)]))

  const categories = [...new Set(reportCards.map((r) => r.category))]
  const filteredReports =
    selectedCategory === 'all'
      ? reportCards
      : reportCards.filter((r) => r.category === selectedCategory)

  return (
    <MainLayout>
      <div className="space-y-6">
        {leaveCatalog.error && <div role="alert" className="bg-amber-50 text-amber-800 rounded-xl p-3 text-sm">تعذر تحميل أنواع الإجازات: {leaveCatalog.error} <button type="button" className="underline" onClick={leaveCatalog.retry}>إعادة المحاولة</button></div>}
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">لوحة التقارير</h1>
            <p className="text-gray-500 mt-1">عرض وتحليل بيانات الموارد البشرية</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw size={18} />
              تحديث
            </button>
            {/* «تصدير الكل» أُزيل (بلا تنفيذ)؛ لكل تقرير زر CSV خاص به في بطاقته */}
          </div>
        </div>

        {/* Error Banner */}
        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-4 gap-4">
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-2xl flex items-center justify-center">
                    <Users size={24} className="text-primary-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-500">إجمالي الموظفين</p>
                <p className="text-3xl font-bold text-gray-800">{totalEmployees}</p>
              </div>

              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-success-50 rounded-2xl flex items-center justify-center">
                    <UserCheck size={24} className="text-success-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-500">موظفون نشطون</p>
                <p className="text-3xl font-bold text-gray-800">{activeEmployees}</p>
              </div>

              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-warning-50 rounded-2xl flex items-center justify-center">
                    <UserMinus size={24} className="text-warning-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-500">موظفون مؤرشفون</p>
                <p className="text-3xl font-bold text-gray-800">{archivedEmployees}</p>
              </div>

              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                    <DollarSign size={24} className="text-blue-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-500">إجمالي صافي الرواتب</p>
                <p className="text-3xl font-bold text-gray-800">
                  {payrollTotal.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-2 gap-6">
              {/* Employees by Branch */}
              <div className="card">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-gray-800">الموظفون حسب الفرع</h2>
                </div>
                <div className="h-64 flex items-end gap-4">
                  {headcount?.byBranch.map((branch, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <span className="text-sm font-bold text-gray-700 mb-1">
                        {branch.total}
                      </span>
                      <div
                        className="w-full bg-gradient-to-t from-primary-500 to-primary-400 rounded-t-lg transition-all hover:from-primary-600 hover:to-primary-500"
                        style={{
                          height: `${(Number(branch.total) / maxBranchTotal) * 85}%`,
                        }}
                      />
                      <span className="text-xs text-gray-500 mt-2">
                        {branch.branchName}
                      </span>
                    </div>
                  ))}
                  {(headcount?.byBranch.length ?? 0) === 0 && (
                    <p className="w-full text-center text-sm text-gray-400">
                      لا توجد بيانات
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-gray-100">
                  <span className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-3 h-3 bg-primary-500 rounded" />
                    عدد الموظفين
                  </span>
                </div>
              </div>

              {/* Department Distribution */}
              <div className="card">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-gray-800">توزيع الأقسام</h2>
                </div>
                <div className="flex items-center gap-8">
                  {/* Pie Chart Representation */}
                  <div className="relative w-48 h-48">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      {(() => {
                        let currentAngle = 0
                        const depts = headcount?.byDepartment ?? []
                        if (depts.length === 1) {
                          return (
                            <circle
                              cx="50"
                              cy="50"
                              r="40"
                              className={pieColors[0].replace('bg-', 'fill-')}
                              stroke="white"
                              strokeWidth="1"
                            />
                          )
                        }
                        return depts.map((dept, index) => {
                          const pct =
                            departmentTotal > 0
                              ? Number(dept.total) / departmentTotal
                              : 0
                          const angle = pct * 360
                          const startAngle = currentAngle
                          currentAngle += angle

                          const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180)
                          const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180)
                          const x2 =
                            50 + 40 * Math.cos(((startAngle + angle) * Math.PI) / 180)
                          const y2 =
                            50 + 40 * Math.sin(((startAngle + angle) * Math.PI) / 180)

                          const largeArc = angle > 180 ? 1 : 0

                          return (
                            <path
                              key={index}
                              d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                              className={pieColors[index % pieColors.length].replace(
                                'bg-',
                                'fill-'
                              )}
                              stroke="white"
                              strokeWidth="1"
                            />
                          )
                        })
                      })()}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-gray-800">
                        {departmentTotal}
                      </span>
                      <span className="text-xs text-gray-500">موظف</span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex-1 space-y-2">
                    {headcount?.byDepartment.map((dept, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded ${pieColors[index % pieColors.length]}`}
                          />
                          <span className="text-sm text-gray-600">
                            {dept.departmentName}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-800">
                          {dept.total}
                        </span>
                      </div>
                    ))}
                    {(headcount?.byDepartment.length ?? 0) === 0 && (
                      <p className="text-sm text-gray-400">لا توجد بيانات</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Attendance this month */}
              <div className="card">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-gray-800">
                    الحضور مقابل التأخير (هذا الشهر)
                  </h2>
                </div>
                <div className="h-64 flex items-end gap-2">
                  {attendance.map((row) => (
                    <div
                      key={row.employeeId}
                      className="flex-1 flex flex-col items-center gap-1"
                    >
                      <div className="w-full flex gap-1 items-end">
                        <div
                          className="flex-1 bg-success-500 rounded-t-lg"
                          style={{
                            height: `${Math.max(
                              4,
                              (Number(row.presentDays) / maxAttendanceDays) * 200
                            )}px`,
                          }}
                        />
                        <div
                          className="flex-1 bg-red-400 rounded-t-lg"
                          style={{
                            height: `${Math.max(
                              4,
                              (Number(row.lateDays) / maxAttendanceDays) * 200
                            )}px`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{row.fullName}</span>
                    </div>
                  ))}
                  {attendance.length === 0 && (
                    <p className="w-full text-center text-sm text-gray-400">
                      لا توجد سجلات حضور هذا الشهر
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100">
                  <span className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-3 h-3 bg-success-500 rounded" />
                    أيام حضور
                  </span>
                  <span className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-3 h-3 bg-red-400 rounded" />
                    أيام تأخير
                  </span>
                </div>
              </div>

              {/* Payroll Runs */}
              <div className="card">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-gray-800">مسيرات الرواتب</h2>
                </div>
                <div className="h-40 relative">
                  {(payroll?.runs.length ?? 0) > 0 ? (
                    <svg
                      className="w-full h-full"
                      viewBox="0 0 600 200"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop
                            offset="0%"
                            stopColor="rgb(59, 130, 246)"
                            stopOpacity="0.3"
                          />
                          <stop
                            offset="100%"
                            stopColor="rgb(59, 130, 246)"
                            stopOpacity="0"
                          />
                        </linearGradient>
                      </defs>
                      {(() => {
                        const runs = payroll?.runs ?? []
                        const points = runs.map((r, i) => ({
                          x:
                            runs.length > 1
                              ? (i / (runs.length - 1)) * 600
                              : 300,
                          y: 200 - (Number(r.totalNet) / maxRunNet) * 180,
                        }))
                        return (
                          <>
                            {points.length > 1 && (
                              <>
                                <path
                                  d={`M ${points[0].x} ${points[0].y} ${points
                                    .slice(1)
                                    .map((p) => `L ${p.x} ${p.y}`)
                                    .join(' ')} L 600 200 L 0 200 Z`}
                                  fill="url(#gradient)"
                                />
                                <path
                                  d={`M ${points
                                    .map((p) => `${p.x} ${p.y}`)
                                    .join(' L ')}`}
                                  fill="none"
                                  stroke="rgb(59, 130, 246)"
                                  strokeWidth="3"
                                />
                              </>
                            )}
                            {points.map((p, i) => (
                              <circle
                                key={i}
                                cx={p.x}
                                cy={p.y}
                                r="6"
                                fill="white"
                                stroke="rgb(59, 130, 246)"
                                strokeWidth="3"
                              />
                            ))}
                          </>
                        )
                      })()}
                    </svg>
                  ) : (
                    <p className="text-center text-sm text-gray-400 pt-16">
                      لا توجد مسيرات رواتب
                    </p>
                  )}
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  {payroll?.runs.map((r) => (
                    <span key={r.id}>
                      {r.period} — {r.branchName ?? r.scopeLabel} ({Number(r.totalNet).toLocaleString()})
                    </span>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                  {payroll?.byMethod.map((m) => (
                    <div
                      key={m.payMethod}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="flex items-center gap-2 text-gray-600">
                        <div className="w-3 h-3 bg-blue-500 rounded" />
                        {payMethodLabels[m.payMethod] ?? m.payMethod}
                      </span>
                      <span className="font-medium text-gray-800">
                        {m.count} موظف — {Number(m.total).toLocaleString()}
                      </span>
                    </div>
                  ))}
                  {payroll?.deductions.map((d) => (
                    <div
                      key={d.period}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="flex items-center gap-2 text-gray-600">
                        <div className="w-3 h-3 bg-red-400 rounded" />
                        خصومات {d.period}
                      </span>
                      <span className="font-medium text-gray-800">
                        تأخير {Number(d.lateness).toLocaleString()} • بدون راتب{' '}
                        {Number(d.unpaidLeave).toLocaleString()} • سلف{' '}
                        {Number(d.loans).toLocaleString()} • أوفرتايم{' '}
                        {Number(d.overtime).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Leaves this year */}
              <div className="card">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-gray-800">
                    الإجازات هذا العام ({currentYear})
                  </h2>
                </div>
                <div className="space-y-2">
                  {leaves?.byType.map((t, index) => (
                    <div
                      key={t.leaveType}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded ${pieColors[index % pieColors.length]}`}
                        />
                        <span className="text-sm text-gray-600">
                          {leaveTypeLabels[t.leaveType] ?? t.leaveType}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-800">
                        {t.requests} طلب — {t.totalDays} يوم
                      </span>
                    </div>
                  ))}
                  {(leaves?.byType.length ?? 0) === 0 && (
                    <p className="text-sm text-gray-400">لا توجد إجازات هذا العام</p>
                  )}
                </div>
                <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-gray-100">
                  <span className="flex items-center gap-2 text-sm text-gray-600">
                    <TrendingUp size={14} />
                    {leaves?.balances.length ?? 0} سجل رصيد إجازات
                  </span>
                </div>
              </div>

              {/* Overtime this month */}
              <div className="card">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-gray-800">
                    العمل الإضافي (هذا الشهر)
                  </h2>
                </div>
                <div className="space-y-2">
                  {overtime.map((row, index) => (
                    <div
                      key={row.employeeId + '-' + row.status}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded ${pieColors[index % pieColors.length]}`}
                        />
                        <span className="text-sm text-gray-600">{row.fullName}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-800">
                        {Number(row.payableHours)} ساعة مستحقة —{' '}
                        {overtimeStatusLabels[row.status] ?? row.status}
                      </span>
                    </div>
                  ))}
                  {overtime.length === 0 && (
                    <p className="text-sm text-gray-400">
                      لا يوجد عمل إضافي هذا الشهر
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-gray-100">
                  <span className="flex items-center gap-2 text-sm text-gray-600">
                    <TrendingUp size={14} />
                    {overtime.reduce((s, o) => s + Number(o.entries), 0)} إدخال أوفرتايم
                  </span>
                </div>
              </div>
            </div>

            {/* Available Reports */}
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-800">التقارير المتاحة</h2>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="input w-40"
                  >
                    <option value="all">كل الفئات</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {filteredReports.map((report) => (
                  <div
                    key={report.id}
                    className="p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm">
                        {report.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-800 group-hover:text-primary-600 transition-colors">
                          {report.title}
                        </h3>
                        <p className="text-sm text-gray-500">{report.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">{report.stat}</span>
                      <div className="flex items-center gap-2">
                        {/* عرض يفتح شاشة التقرير التفصيلية، والتنزيل ينتج CSV من بيانات البطاقة المحمّلة؛ زر الطباعة الشكلي أُزيل */}
                        <Link href={report.href} title="عرض التقرير" className="p-1.5 bg-white rounded-lg hover:bg-primary-50 transition-colors">
                          <Eye size={16} className="text-gray-600" />
                        </Link>
                        <button
                          type="button"
                          title="تصدير CSV"
                          onClick={() => exportReport(report.id)}
                          className="p-1.5 bg-white rounded-lg hover:bg-primary-50 transition-colors"
                        >
                          <Download size={16} className="text-gray-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Requests by Category Table */}
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-800">
                  ملخص الطلبات حسب الفئة
                </h2>
                <button
                  type="button"
                  onClick={exportRequests}
                  disabled={requestCategories.length === 0}
                  className="btn-secondary flex items-center gap-2 disabled:opacity-50"
                >
                  <Download size={18} />
                  تصدير CSV
                </button>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                      الفئة
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                      مكتملة
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                      قيد المراجعة
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                      مرفوضة
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                      أخرى
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                      الإجمالي
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {requestCategories.map((category) => (
                    <tr key={category} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {categoryLabelOf(category)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-success-600 font-medium">
                          {requestCell(category, ['COMPLETED'])}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {requestCell(category, ['UNDER_REVIEW'])}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-red-600 font-medium">
                          {requestCell(category, ['REJECTED'])}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {requestOther(category)}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {requestCategoryTotal(category)}
                      </td>
                    </tr>
                  ))}
                  {requestCategories.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                        لا توجد طلبات
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  )
}
