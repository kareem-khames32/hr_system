'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import { AttendanceFlexSummary } from '@/components/AttendanceFlexSummary'
import { NextDayCheckoutHint } from '@/components/NextDayCheckoutHint'
import Link from 'next/link'
import {
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  UserX,
  Briefcase,
  Laptop,
} from 'lucide-react'
import {
  fetchMonthlyAttendance,
  fetchMyAttendanceExemptions,
  getCurrentUser,
  type ApiAttendanceDay,
  type ApiAttendanceExemption,
} from '@/lib/api'
import { localMonth } from '@/lib/dates'

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

// الشهر بالتوقيت المحلي — toISOString كانت تفتح الشهر السابق أول يوم بعد منتصف الليل
const currentMonth = () => localMonth()

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

export default function MyAttendancePage() {
  const [employeeId, setEmployeeId] = useState<number | null>(null)
  const [noEmployee, setNoEmployee] = useState(false)
  const [month, setMonth] = useState(currentMonth())

  const [days, setDays] = useState<ApiAttendanceDay[]>([])
  const [exemptions, setExemptions] = useState<ApiAttendanceExemption[]>([])
  const [summary, setSummary] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // هوية الموظف من الجلسة — بعد الـ mount
  useEffect(() => {
    const user = getCurrentUser()
    if (user?.employeeId) {
      setEmployeeId(user.employeeId)
    } else {
      setNoEmployee(true)
      setLoading(false)
    }
  }, [])

  // كشف الشهر — من السيرفر (مصدر الحقيقة)
  useEffect(() => {
    if (!employeeId || !month) return
    setLoading(true)
    setError('')
    let cancelled = false
    Promise.all([fetchMonthlyAttendance(employeeId, month), fetchMyAttendanceExemptions()])
      .then(([res, windows]) => {
        if (cancelled) return
        setDays(res.days)
        setSummary(res.summary)
        setExemptions(windows.filter(window => window.effectiveFrom.slice(0, 7) <= month &&
          (!window.effectiveTo || window.effectiveTo.slice(0, 7) >= month) && (!window.terminatedFrom || window.terminatedFrom > `${month}-01`)))
      })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'تعذر تحميل كشف حضورك') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [employeeId, month])

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">حضوري — {month}</h1>
            <p className="text-gray-500 mt-1">
              كشف حضورك يوم بيوم: الوردية والحالة والتأخير محسوبة من السيرفر
            </p>
          </div>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="input w-44"
          />
        </div>

        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        {noEmployee ? (
          <div className="card p-12 text-center">
            <UserX size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">
              حسابك غير مرتبط بملف موظف — تواصل مع الموارد البشرية لربط حسابك
            </p>
          </div>
        ) : (
          <>
            {/* Summary */}
            {exemptions.map(window => <div key={window.id} className="card p-4 text-sm text-gray-600">
              <p>استثناء الحضور #{window.id}: من {window.effectiveFrom} إلى {window.effectiveTo ?? 'نهاية مفتوحة'}</p>
              {window.terminatedFrom && <p>انتهى السريان اعتبارًا من {window.terminatedFrom}</p>}
              <p>{window.reason}</p>
            </div>)}
            {Number(summary.exemptDays ?? 0) > 0 && <p className="card p-4 text-sm text-gray-600">مستثنى من الحضور: {summary.exemptDays} يوم — بدون خصومات حضور في الأيام المشمولة.</p>}
            <div className="grid grid-cols-3 md:grid-cols-5 xl:grid-cols-10 gap-4">
              <div className="card p-4 text-center">
                <p className="text-2xl font-bold text-success-600">{Number(summary.present ?? 0)}</p>
                <p className="text-sm text-gray-500">يوم حضور</p>
                {Number(summary.missingPunch ?? 0) > 0 && (
                  <p
                    className="text-xs text-rose-600 mt-1"
                    title="أيام منقضية ببصمة طرف واحد — لا تُعدّ حضوراً حتى تقدّم طلب تصحيح بصمة"
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
                  {Number(summary.totalEarlyLeaveMinutes ?? 0)} دقيقة إجمالاً
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
                            لا توجد سجلات حضور لك في هذا الشهر
                          </td>
                        </tr>
                      ) : (
                        days.map((row) => {
                          const cfg = statusConfig[row.status] ?? statusConfig.present
                          const StatusIcon = cfg.icon
                          const lateMinutes = Number(row.lateMinutes)
                          const excusedMinutes = Number(row.excusedMinutes ?? 0)
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
                                    title="لا وردية ولا جدول عمل مُسند — راجع الموارد البشرية"
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
                                    title="لم تُسند لك وردية ولا جدول عمل — طُبّقت ساعات جدول العمل الافتراضي (العطلة الأسبوعية من إعداد الفرع/السياسات)"
                                  >
                                    جدول افتراضي (مفترَض)
                                  </span>
                                )}
                                {row.graceUsed != null && (
                                  <span
                                    className="block text-[10px] text-gray-400"
                                    title="سماحية التأخير التي طُبّقت على هذا اليوم — سماحية ورديتك إن حُدّدت لها، وإلا القيمة العامة"
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
                                {Number(row.earlyLeaveMinutes ?? 0) > 0 ? (
                                  <span className="text-orange-600 font-bold text-sm">
                                    {Number(row.earlyLeaveMinutes)} دقيقة
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
                                  {row.status === 'missing_punch' && (
                                    <Link
                                      href={`/requests?type=PUNCH_CORRECTION&date=${row.date}&punchType=${row.checkIn ? 'OUT' : 'IN'}`}
                                      className="badge text-xs bg-primary-50 text-primary-700 hover:bg-primary-100 inline-flex items-center gap-1"
                                      title={
                                        row.checkIn
                                          ? 'سجّلت حضوراً بلا انصراف — قدّم طلب تصحيح بصمة الانصراف'
                                          : 'سجّلت انصرافاً بلا حضور — قدّم طلب تصحيح بصمة الحضور'
                                      }
                                    >
                                      تصحيح البصمة
                                    </Link>
                                  )}
                                  {row.punchAnomalies && (
                                    <span
                                      className="badge text-xs bg-amber-50 text-amber-700 inline-flex items-center gap-1"
                                      title={`بصمات خارج نافذتي الدخول والخروج: ${row.punchAnomalies.split(',').join('، ')} — إن كانت خاطئة قدّم طلب تصحيح بصمة`}
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
          </>
        )}
      </div>
    </MainLayout>
  )
}
