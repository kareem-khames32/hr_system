'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout'
import Link from 'next/link'
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Download,
  Hourglass,
} from 'lucide-react'
import {
  shiftFor,
  computeAttendance,
  formatWorkHours,
} from '@/lib/attendance'

// تاريخ اليوم في العرض التجريبي — ما بعده «لم يحن بعد»
const TODAY = '2026-07-15'

// موظفو الديمو
const demoEmployees = [
  { id: 'EMP001', name: 'أحمد محمد علي', department: 'تقنية المعلومات' },
  { id: 'EMP002', name: 'سارة أحمد الخالدي', department: 'الموارد البشرية' },
]

// بصمات الشهر الخام (من أجهزة البصمة) — الموظف EMP001
const monthPunches: Record<string, { in: string | null; out: string | null }> = {
  '2026-07-01': { in: '08:05', out: '17:10' },
  '2026-07-02': { in: '08:20', out: '17:00' },
  '2026-07-05': { in: '10:05', out: '19:02' }, // وردية 10 — ضمن السماح
  '2026-07-06': { in: '10:40', out: '19:00' }, // وردية 10 — متأخر 40د
  '2026-07-07': { in: '10:25', out: '19:10' }, // وردية 10 — متأخر 25د
  '2026-07-08': { in: '09:58', out: '19:00' },
  '2026-07-09': { in: '10:02', out: '18:45' },
  '2026-07-12': { in: '11:05', out: '20:00' }, // وردية 11 — ضمن السماح
  '2026-07-13': { in: null, out: null }, // غياب
  '2026-07-14': { in: '10:50', out: '20:05' }, // وردية 11 — منضبط (جاء مبكراً)
  '2026-07-15': { in: '11:00', out: null }, // اليوم — لم يبصم انصرافاً بعد
}

// إجازات معتمدة خلال الشهر
const approvedLeaves: Record<string, string> = {
  '2026-07-02': '', // لا إجازة — مثال
}

const weekdayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

interface DayRow {
  date: string
  weekday: string
  shiftLabel: string
  checkIn: string | null
  checkOut: string | null
  workHours: string | null
  lateMinutes: number
  status: 'present' | 'late' | 'absent' | 'early_leave' | 'weekend' | 'upcoming' | 'leave'
}

const buildMonthSheet = (employeeId: string): DayRow[] => {
  const rows: DayRow[] = []
  for (let day = 1; day <= 31; day++) {
    const date = `2026-07-${String(day).padStart(2, '0')}`
    const d = new Date(date)
    if (d.getMonth() !== 6) break
    const weekday = weekdayNames[d.getDay()]
    const isWeekend = d.getDay() === 5 || d.getDay() === 6 // جمعة وسبت
    const shift = shiftFor(employeeId, date)
    const shiftLabel = `${shift.name} (${shift.start}–${shift.end})`

    if (isWeekend) {
      rows.push({
        date, weekday, shiftLabel: 'عطلة أسبوعية',
        checkIn: null, checkOut: null, workHours: null, lateMinutes: 0,
        status: 'weekend',
      })
      continue
    }
    if (date > TODAY) {
      rows.push({
        date, weekday, shiftLabel,
        checkIn: null, checkOut: null, workHours: null, lateMinutes: 0,
        status: 'upcoming',
      })
      continue
    }
    const punch = employeeId === 'EMP001' ? monthPunches[date] : { in: '08:03', out: '17:00' }
    const checkIn = punch?.in ?? null
    const checkOut = punch?.out ?? null
    const computed = computeAttendance(checkIn, checkOut, shift)
    rows.push({
      date,
      weekday,
      shiftLabel,
      checkIn,
      checkOut,
      workHours: formatWorkHours(checkIn, checkOut),
      lateMinutes: computed.lateMinutes,
      // اليوم الجاري بلا انصراف لا يُعد خروجاً مبكراً
      status: date === TODAY && !checkOut ? (computed.lateMinutes > 0 ? 'late' : 'present') : computed.status,
    })
  }
  return rows
}

const statusConfig: Record<
  DayRow['status'],
  { label: string; className: string; icon: typeof CheckCircle }
> = {
  present: { label: 'حاضر', className: 'badge-success', icon: CheckCircle },
  late: { label: 'متأخر', className: 'badge-warning', icon: AlertTriangle },
  absent: { label: 'غائب', className: 'badge-danger', icon: XCircle },
  early_leave: { label: 'خروج مبكر', className: 'bg-orange-50 text-orange-600', icon: Clock },
  weekend: { label: 'عطلة', className: 'bg-purple-50 text-purple-600', icon: Calendar },
  upcoming: { label: 'لم يحن بعد', className: 'bg-gray-100 text-gray-400', icon: Hourglass },
  leave: { label: 'إجازة', className: 'badge-primary', icon: Calendar },
}

export default function MonthlySheetPage() {
  const [employeeId, setEmployeeId] = useState('EMP001')
  const employee = demoEmployees.find((e) => e.id === employeeId)!
  const rows = buildMonthSheet(employeeId)

  const summary = {
    present: rows.filter((r) => r.status === 'present').length,
    late: rows.filter((r) => r.status === 'late').length,
    absent: rows.filter((r) => r.status === 'absent').length,
    totalLate: rows.reduce((s, r) => s + r.lateMinutes, 0),
    upcoming: rows.filter((r) => r.status === 'upcoming').length,
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
            <h1 className="text-2xl font-bold text-gray-800">الكشف الشهري — يوليو 2026</h1>
            <p className="text-gray-500 mt-1">
              يوم بيوم: وردية اليوم من الجدول المؤرَّخ، والتأخير محسوب آلياً (سماح 10 دقائق)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="input w-64"
            >
              {demoEmployees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} — {e.department}
                </option>
              ))}
            </select>
            <button className="btn-secondary flex items-center gap-2">
              <Download size={18} />
              تصدير
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-5 gap-4">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-success-600">{summary.present}</p>
            <p className="text-sm text-gray-500">يوم حضور</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-warning-600">{summary.late}</p>
            <p className="text-sm text-gray-500">يوم بتأخير</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{summary.absent}</p>
            <p className="text-sm text-gray-500">غياب</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-gray-800">{summary.totalLate}</p>
            <p className="text-sm text-gray-500">إجمالي دقائق التأخير</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-gray-400">{summary.upcoming}</p>
            <p className="text-sm text-gray-500">أيام لم تحن</p>
          </div>
        </div>

        {/* ملاحظة الديمو */}
        {employeeId === 'EMP001' && (
          <div className="card p-4 bg-blue-50 border border-blue-200 text-sm text-blue-700">
            💡 لاحظ: أحمد على <strong>وردية 10</strong> في أسبوع 5–9 يوليو (حضوره 10:25 يوم 7 = متأخر
            25د)، وعلى <strong>وردية 11</strong> في أسبوع 12–16 يوليو (حضوره 10:50 يوم 14 =
            منضبط) — نفس التوقيت تقريباً وحكم مختلف لأن الوردية تتغيّر بالأسبوع.
          </div>
        )}

        {/* Day-by-day Sheet */}
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
                  <th className="text-center px-4 py-3">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const cfg = statusConfig[row.status]
                  const StatusIcon = cfg.icon
                  const muted = row.status === 'weekend' || row.status === 'upcoming'
                  return (
                    <tr
                      key={row.date}
                      className={`table-row ${muted ? 'bg-gray-50/50' : ''} ${
                        row.date === TODAY ? 'bg-primary-50/40' : ''
                      }`}
                    >
                      <td className={`table-cell font-medium ${muted ? 'text-gray-400' : 'text-gray-700'}`}>
                        {row.weekday}
                        {row.date === TODAY && (
                          <span className="mr-2 text-xs text-primary-600 font-bold">اليوم</span>
                        )}
                      </td>
                      <td className="table-cell font-mono text-sm text-gray-500" dir="ltr">
                        {row.date}
                      </td>
                      <td className={`table-cell text-sm ${muted ? 'text-gray-400' : 'text-gray-600'}`}>
                        {row.shiftLabel}
                      </td>
                      <td className="table-cell text-center">
                        {row.checkIn ? (
                          <span className="font-mono text-success-600">{row.checkIn}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="table-cell text-center">
                        {row.checkOut ? (
                          <span className="font-mono text-danger-600">{row.checkOut}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="table-cell text-center font-mono text-sm text-gray-600">
                        {row.workHours ?? '—'}
                      </td>
                      <td className="table-cell text-center">
                        {row.lateMinutes > 0 ? (
                          <span className="text-warning-600 font-bold text-sm">
                            {row.lateMinutes} دقيقة
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="table-cell text-center">
                        <span className={`badge text-xs inline-flex items-center gap-1 ${cfg.className}`}>
                          <StatusIcon size={12} />
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
