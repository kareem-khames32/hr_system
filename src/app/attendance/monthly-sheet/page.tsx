'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import { AttendanceFlexSummary } from '@/components/AttendanceFlexSummary'
import { NextDayCheckoutHint } from '@/components/NextDayCheckoutHint'
import Link from 'next/link'
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Download,
  Briefcase,
  Laptop,
} from 'lucide-react'
import {
  fetchEmployees,
  type ApiAttendanceDay,
  type ApiEmployee,
} from '@/lib/api'
import { fetchAttendanceSheetRange } from '@/lib/attendance-range-api'
import { dayRangeError, dayRangeKey, dayRangeLabel } from '@/lib/payroll-month-range'
import { DayRangeFilter, usePayrollDayRange } from '@/components/DayRangeFilter'
import { EmployeePicker } from '@/components/EmployeePicker'

const weekdayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

const weekdayOf = (date: string): string => {
  const d = new Date(date + 'T12:00:00')
  return Number.isNaN(d.getTime()) ? '—' : weekdayNames[d.getDay()]
}

// دقائق → H:mm
const formatMinutes = (mins: number): string | null => {
  const m = Number(mins)
  if (!m || m <= 0) return null
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
}

// BOM في مقدمة ملف CSV — بدونه يفتح Excel العربية كرموز مشوّهة
const CSV_BOM = String.fromCharCode(0xfeff)

const statusConfig: Record<
  string,
  { label: string; className: string; icon: typeof CheckCircle }
> = {
  exempt: { label: 'مستثنى من الحضور', className: 'bg-gray-100 text-gray-600', icon: CheckCircle },
  present: { label: 'حاضر', className: 'badge-success', icon: CheckCircle },
  late: { label: 'متأخر', className: 'badge-warning', icon: AlertTriangle },
  absent: { label: 'غائب', className: 'badge-danger', icon: XCircle },
  early_leave: { label: 'خروج مبكر', className: 'bg-orange-50 text-orange-600', icon: Clock },
  leave: { label: 'في إجازة', className: 'bg-indigo-50 text-indigo-600', icon: Calendar },
  partial_leave: { label: 'إجازة جزئية', className: 'bg-indigo-100 text-indigo-700', icon: Clock },
  holiday: { label: 'عطلة', className: 'bg-blue-50 text-blue-600', icon: Calendar },
  // مأمورية/عمل عن بُعد معتمد — يوم معذور بلا تأخير ولا غياب
  mission: { label: 'مأمورية', className: 'bg-teal-50 text-teal-700', icon: Briefcase },
  remote: { label: 'عمل عن بُعد', className: 'bg-cyan-50 text-cyan-700', icon: Laptop },
  // يوم منقضٍ ببصمة طرف واحد — لا يُحسب حضوراً حتى تُصحَّح البصمة
  missing_punch: { label: 'بصمة ناقصة', className: 'bg-rose-50 text-rose-700', icon: AlertTriangle },
}

export default function MonthlySheetPage() {
  const [employees, setEmployees] = useState<ApiEmployee[]>([])
  const [employeeId, setEmployeeId] = useState<number | null>(null)
  // الكشف بيفتح على شهر الرواتب (من يوم بداية الدورة لليوم اللي قبله، مثلًا 23 → 22) مش الشهر التقويمي
  const { range, setRange, context } = usePayrollDayRange()
  const rangeTitle = range ? dayRangeLabel(range) : ''

  const [days, setDays] = useState<ApiAttendanceDay[]>([])
  const [summary, setSummary] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // الموظفون — مرة واحدة؛ ?employeeId= في الرابط يفتح كشف الموظف ده، وإلا أول موظف
  useEffect(() => {
    const requested = Number(new URLSearchParams(window.location.search).get('employeeId'))
    fetchEmployees()
      .then((rows) => {
        setEmployees(rows)
        const linked = rows.find((row) => row.id === requested)
        if (rows.length > 0) setEmployeeId((prev) => prev ?? (linked ? linked.id : rows[0].id))
        else setLoading(false)
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'تعذر تحميل الموظفين')
        setLoading(false)
      })
  }, [])

  // كشف الشهر — من السيرفر (مصدر الحقيقة)
  useEffect(() => {
    if (!employeeId || !range || dayRangeError(range)) return
    setLoading(true)
    setError('')
    fetchAttendanceSheetRange(employeeId, range)
      .then((res) => {
        setDays(res.days)
        setSummary(res.summary)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر تحميل الكشف الشهري'))
      .finally(() => setLoading(false))
  }, [employeeId, range])

  // إجمالي دقائق الانصراف المبكر — من الملخّص إن أرسله السيرفر، وإلا يُجمَع من الأيام
  const totalEarlyLeaveMinutes =
    summary.totalEarlyLeaveMinutes != null
      ? Number(summary.totalEarlyLeaveMinutes)
      : days.reduce((s, d) => s + Number(d.earlyLeaveMinutes ?? 0), 0)

  // تصدير الصفوف المعروضة إلى CSV — BOM حتى تفتح العربية سليمة في Excel
  const exportCsv = () => {
    if (days.length === 0) return
    const emp = employees.find((e) => e.id === employeeId)
    const cell = (v: unknown) => {
      const s = v == null ? '' : String(v)
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const header = [
      'اليوم',
      'التاريخ',
      'وردية اليوم',
      'الحضور',
      'الانصراف',
      'ساعات العمل',
      'التأخير (دقيقة)',
      'نقص ساعات العمل (دقيقة)',
      'الدقائق المحتسبة',
      'المرونة',
      'سبب مراجعة الحضور',
      'الانصراف المبكر (دقيقة)',
      'السماحية المطبَّقة (دقيقة)',
      'الحالة',
    ]
    const body = days.map((row) => [
      weekdayOf(row.date),
      String(row.date).slice(0, 10),
      row.unscheduled
        ? 'بلا وردية'
        : `${row.shiftName} (${row.shiftStart}–${row.shiftEnd})${row.scheduleSource === 'default' ? ' — جدول افتراضي' : ''}`,
      row.checkIn ?? '',
      row.checkOut ?? '',
      formatMinutes(Number(row.workMinutes)) ?? '',
      Number(row.lateMinutes) || 0,
      row.shortfallMinutes ?? '',
      row.countedWorkMinutes ?? '',
      row.attendanceRuleSnapshot?.flexEnabled ? `مفعلة — نافذة ${row.attendanceRuleSnapshot.flexWindowMinutes} دقيقة` : '',
      row.attendanceReviewReason ?? '',
      Number(row.earlyLeaveMinutes) || 0,
      row.attendanceRuleSnapshot?.flexEnabled && (row.attendanceRuleSnapshot.windowSupersedesGrace ?? true) ? '' : row.graceUsed ?? '',
      (statusConfig[row.status] ?? statusConfig.present).label,
    ])
    const csv =
      CSV_BOM + [header, ...body].map((r) => r.map(cell).join(',')).join('\r\n')
    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    )
    const a = document.createElement('a')
    a.href = url
    a.download = `monthly-sheet-${emp?.employeeCode || employeeId || ''}-${range ? dayRangeKey(range) : ''}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/attendance" className="hover:text-primary-600">
            الحضور والانصراف
          </Link>
          <ArrowRight size={16} />
          <span className="text-gray-800">الكشف الشهري</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">الكشف الشهري — {rangeTitle}</h1>
            <p className="text-gray-500 mt-1">
              يوم بيوم: الوردية والحالة والتأخير والانصراف المبكر محسوبة من السيرفر
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* كشف موظف واحد دايمًا: بحث بالاسم أو الكود، ومفيش «من غير موظف» */}
            <EmployeePicker
              employees={employees}
              value={employeeId ?? ''}
              onChange={(id) => {
                if (id) setEmployeeId(Number(id))
              }}
              clearable={false}
              aria-label="الموظف"
              className="w-72"
            />
            <button
              onClick={exportCsv}
              disabled={loading || days.length === 0}
              title={days.length === 0 ? 'لا توجد صفوف للتصدير' : 'تصدير الصفوف المعروضة إلى CSV'}
              className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={18} />
              تصدير
            </button>
          </div>
        </div>

        {/* الفترة: شهر الرواتب افتراضيًا، أو أي مدى باليوم */}
        <div className="card">
          <DayRangeFilter idPrefix="monthly-sheet" value={range} onChange={setRange} cycleStartDay={context?.cycleStartDay} today={context?.today} />
        </div>

        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {/* Summary */}
        {Number(summary.exemptDays ?? 0) > 0 && <p className="card p-4 text-sm text-gray-600">مستثنى من الحضور: {summary.exemptDays} يوم — خارج احتساب التأخير والغياب ومؤشرات الالتزام.</p>}
        <div className="grid grid-cols-3 md:grid-cols-5 xl:grid-cols-10 gap-4">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-success-600">{Number(summary.present ?? 0)}</p>
            <p className="text-sm text-gray-500">يوم حضور</p>
            {Number(summary.missingPunch ?? 0) > 0 && (
              <p
                className="text-xs text-rose-600 mt-1"
                title="أيام منقضية ببصمة طرف واحد — لا تُعدّ حضوراً حتى تُصحَّح البصمة"
              >
                + {Number(summary.missingPunch)} بصمة ناقصة (خارج العدّ)
              </p>
            )}
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-warning-600">{Number(summary.late ?? 0)}</p>
            <p className="text-sm text-gray-500">يوم بتأخير</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{Number(summary.absent ?? 0)}</p>
            <p className="text-sm text-gray-500">غياب</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{Number(summary.earlyLeave ?? 0)}</p>
            <p className="text-sm text-gray-500">خروج مبكر</p>
            <p className="text-xs text-gray-400 mt-1">
              {totalEarlyLeaveMinutes} دقيقة إجمالاً
            </p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-indigo-600">
              {Number(summary.partialLeave ?? summary.partial_leave ?? 0)}
            </p>
            <p className="text-sm text-gray-500">إجازة جزئية</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-indigo-500">{Number(summary.leave ?? 0)}</p>
            <p className="text-sm text-gray-500">يوم إجازة</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{Number(summary.holiday ?? 0)}</p>
            <p className="text-sm text-gray-500">يوم عطلة</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-teal-600">
              {Number(summary.mission ?? 0) + Number(summary.remote ?? 0)}
            </p>
            <p className="text-sm text-gray-500">مأمورية / عن بُعد</p>
            <p className="text-xs text-gray-400 mt-1">
              {Number(summary.mission ?? 0)} مأمورية · {Number(summary.remote ?? 0)} عن بُعد
            </p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-gray-800">{Number(summary.totalLateMinutes ?? 0)}</p>
            <p className="text-sm text-gray-500">إجمالي دقائق التأخير</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-primary-600 font-mono">
              {formatMinutes(Number(summary.totalWorkMinutes ?? 0)) ?? '0:00'}
            </p>
            <p className="text-sm text-gray-500">إجمالي ساعات العمل</p>
          </div>
        </div>

        {/* Day-by-day Sheet */}
        {loading ? (
          <div className="card flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="table-header">
                    <th className="text-right px-4 py-3">اليوم</th>
                    <th className="text-right px-4 py-3">التاريخ</th>
                    <th className="text-right px-4 py-3">وردية اليوم</th>
                    <th className="text-center px-4 py-3">الحضور</th>
                    <th className="text-center px-4 py-3">الانصراف</th>
                    <th className="text-center px-4 py-3">ساعات العمل</th>
                    <th className="text-center px-4 py-3">التأخير</th>
                    <th className="text-center px-4 py-3">الانصراف المبكر</th>
                    <th className="text-center px-4 py-3">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {days.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="table-cell text-center text-gray-400 py-10">
                        لا توجد سجلات حضور لهذا الموظف في الفترة دي
                      </td>
                    </tr>
                  ) : (
                    days.map((row) => {
                      const cfg = statusConfig[row.status] ?? statusConfig.present
                      const StatusIcon = cfg.icon
                      const lateMinutes = Number(row.lateMinutes)
                      const earlyLeaveMinutes = Number(row.earlyLeaveMinutes ?? 0)
                      const excusedMinutes = Number((row as any).excusedMinutes ?? 0)
                      const deductibleMinutes = Number(row.deductibleMinutes ?? 0)
                      const leaveConflict = row.leaveConflict === true
                      return (
                        <tr key={row.id} className="table-row">
                          <td className="table-cell font-medium text-gray-700">
                            {weekdayOf(row.date)}
                          </td>
                          <td className="table-cell font-mono text-sm text-gray-500" dir="ltr">
                            {row.date}
                          </td>
                          <td className="table-cell text-sm text-gray-600">
                            {row.unscheduled ? (
                              <span
                                className="badge bg-amber-100 text-amber-700"
                                title="لا وردية ولا جدول عمل — البصمة بلا حساب تأخير أو أوفرتايم"
                              >
                                بلا وردية
                              </span>
                            ) : (
                              <>
                                {row.shiftName} ({row.shiftStart}–{row.shiftEnd})
                              </>
                            )}
                            {row.scheduleSource === 'default' && (
                              <span
                                className="block text-[10px] text-amber-600"
                                title="لم تُسند وردية ولا جدول عمل — طُبّقت ساعات جدول العمل الافتراضي (العطلة الأسبوعية من إعداد الفرع/السياسات)"
                              >
                                جدول افتراضي (مفترَض)
                              </span>
                            )}
                            {/* الوردية المرنة لا تُطبَّق فيها السماحية — نافذة الحضور تغنيها */}
                            {row.graceUsed != null && !(row.attendanceRuleSnapshot?.flexEnabled && (row.attendanceRuleSnapshot.windowSupersedesGrace ?? true)) && (
                              <span
                                className="block text-[10px] text-gray-400"
                                title="السماحية التي طُبّقت على هذا اليوم — سماحية الوردية إن حُدّدت لها، وإلا القيمة العامة"
                              >
                                سماحية {row.graceUsed} د
                              </span>
                            )}
                          </td>
                          <td className="table-cell text-center">
                            {row.checkIn ? (
                              <><span className="font-mono text-success-600">{row.checkIn}</span><NextDayCheckoutHint day={row} field="checkIn" /></>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="table-cell text-center">
                            {row.checkOut ? (
                              <><span className="font-mono text-danger-600">{row.checkOut}</span><NextDayCheckoutHint day={row} /></>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="table-cell text-center font-mono text-sm text-gray-600">
                            {formatMinutes(Number(row.workMinutes)) ?? '—'}
                            <AttendanceFlexSummary day={row} />
                          </td>
                          <td className="table-cell text-center">
                            {lateMinutes > 0 ? (
                              <span className="text-warning-600 font-bold text-sm">
                                {lateMinutes} دقيقة
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                            {excusedMinutes > 0 && (
                              <p className="text-xs text-success-600 mt-1 font-medium">
                                معذور بإذن: {excusedMinutes} د
                              </p>
                            )}
                            {deductibleMinutes > 0 && (
                              <p
                                className="text-xs text-amber-600 mt-1 font-medium"
                                title="دقائق إذن بخصم — تُخصم من الراتب"
                              >
                                {deductibleMinutes} د بخصم
                              </p>
                            )}
                          </td>
                          <td className="table-cell text-center">
                            {earlyLeaveMinutes > 0 ? (
                              <span className="text-orange-600 font-bold text-sm">
                                {earlyLeaveMinutes} دقيقة
                              </span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="table-cell text-center">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              <span className={`badge text-xs inline-flex items-center gap-1 ${cfg.className}`}>
                                <StatusIcon size={12} />
                                {cfg.label}
                              </span>
                              {leaveConflict && (
                                <span
                                  className="badge text-xs bg-amber-100 text-amber-700 inline-flex items-center gap-1"
                                  title="الموظف حضر يوم إجازته المعتمدة — راجع شاشة الإجازات: إلغاء الإجازة يحسبه دواماً ويرجع الرصيد"
                                >
                                  <AlertTriangle size={12} />
                                  بصم رغم الإجازة
                                </span>
                              )}
                              {row.punchAnomalies && (
                                <span
                                  className="badge text-xs bg-amber-50 text-amber-700 inline-flex items-center gap-1"
                                  title={`بصمات خارج نافذتي الدخول والخروج: ${row.punchAnomalies.split(',').join('، ')} — لم تُرمَ؛ راجعها أو صحّح البصمة`}
                                >
                                  <AlertTriangle size={12} />
                                  خارج النافذة: {row.punchAnomalies.split(',').slice(0, 3).join('، ')}
                                  {row.punchAnomalies.split(',').length > 3 ? '…' : ''}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
