'use client'

import { employeeStatusLabels, employeeStatusStyles } from '@/lib/status-labels'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MainLayout } from '@/components/layout'
import { AlertTriangle, CalendarDays, ClipboardCheck, ListChecks, Users } from 'lucide-react'
import { currencyLabel } from '@/lib/currency'
import {
  fetchTeamOverview, teamDaysLeftText, TEAM_ATTENDANCE_LABELS, TEAM_ATTENDANCE_STYLES, type TeamOverview,
} from '@/lib/manager-api'

// B2.14: لوحة «فريقي» — المدير الهيكلي (حتى بدور «موظف») بيشوف فريقه بس: حضور النهارده، والإجازات القريبة، واللي هينتهي،
// والمستني منه. قراءة بس: الاعتماد والتكليف من شاشاتهم. الراتب عمود للي معاه حق عرض الرواتب.
export default function MyTeamPage() {
  const [data, setData] = useState<TeamOverview | { manager: false } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTeamOverview().then(setData).catch((err) => setError(err instanceof Error ? err.message : 'تعذر تحميل لوحة الفريق'))
  }, [])

  const attendanceOf = new Map((data && data.manager ? data.attendanceToday?.rows ?? [] : []).map((row) => [row.employeeId, row]))

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">فريقي</h1>
          <p className="text-sm text-gray-500">
            اللي تحتك في الهيكل: حضورهم النهارده، وإجازاتهم القريبة، واللي هينتهي، والمستني منك
            {data && data.manager ? <> — <bdi>{data.date}</bdi></> : null}
          </p>
        </div>

        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        {!data && !error && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {data && !data.manager && (
          <div className="card text-center text-gray-500 py-12" data-team-empty>مفيش حد تحتك في الهيكل التنظيمي.</div>
        )}

        {data && data.manager && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-team-cards>
              <div className="card">
                <div className="flex items-center gap-2 text-gray-500 text-sm"><Users size={18} /> الفريق</div>
                <p className="text-3xl font-bold text-gray-800">{data.team.length}</p>
                <p className="text-xs text-gray-400">منهم {data.team.filter((member) => member.direct).length} مباشر</p>
              </div>
              {data.attendanceToday && (
                <div className="card">
                  <div className="flex items-center gap-2 text-gray-500 text-sm"><ClipboardCheck size={18} /> حضور النهارده</div>
                  <p className="text-3xl font-bold text-gray-800">{data.attendanceToday.attended}</p>
                  <p className="text-xs text-gray-400">
                    متأخر {data.attendanceToday.late} • غايب {data.attendanceToday.absent} • إجازة {data.attendanceToday.onLeave} • من غير بصمة {data.attendanceToday.none}
                  </p>
                </div>
              )}
              <Link href="/approvals-inbox" className="card hover:bg-primary-50 transition-colors">
                <div className="flex items-center gap-2 text-gray-500 text-sm"><ClipboardCheck size={18} /> بانتظار موافقتي</div>
                <p className="text-3xl font-bold text-gray-800">{data.pendingApprovals}</p>
                <p className="text-xs text-gray-400">طلب مستني قرارك</p>
              </Link>
              <Link href="/my/tasks" className="card hover:bg-primary-50 transition-colors">
                <div className="flex items-center gap-2 text-gray-500 text-sm"><ListChecks size={18} /> مهام الفريق</div>
                <p className="text-3xl font-bold text-gray-800">{data.tasks.open}</p>
                <p className="text-xs text-gray-400">مفتوحة{data.tasks.overdue > 0 ? ` • ${data.tasks.overdue} متأخرة` : ''}</p>
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="card" data-team-expiring>
                <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2"><AlertTriangle size={18} className="text-warning-600" /> هينتهي خلال {data.windowDays} يوم</h2>
                {data.expiring.length === 0 ? <p className="text-sm text-gray-500">مفيش تجربة ولا عقد ولا مستند هينتهي قريب.</p> : (
                  <ul className="divide-y divide-gray-100">
                    {data.expiring.map((item, index) => (
                      <li key={`${item.employeeId}-${item.kind}-${item.label}-${index}`} className="py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="text-gray-800">{item.fullName} — {item.label}</span>
                        <span className={item.daysLeft < 0 ? 'text-red-600' : 'text-gray-500'}><bdi>{item.date}</bdi> • {teamDaysLeftText(item.daysLeft)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {data.leaves && (
                <div className="card" data-team-leaves>
                  <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2"><CalendarDays size={18} className="text-primary-600" /> إجازات الفريق ({data.windowDays} يوم)</h2>
                  {data.leaves.length === 0 ? <p className="text-sm text-gray-500">مفيش إجازات معتمدة في الفترة دي.</p> : (
                    <ul className="divide-y divide-gray-100">
                      {data.leaves.map((leave, index) => (
                        <li key={`${leave.employeeId}-${leave.fromDate}-${index}`} className="py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                          <span className="text-gray-800">{leave.fullName}</span>
                          <span className="text-gray-500">
                            من <bdi>{leave.fromDate}</bdi> إلى <bdi>{leave.toDate}</bdi> • {leave.days} يوم{leave.period !== 'FULL' ? ' (جزء من اليوم)' : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="card" data-team-list>
              <h2 className="text-lg font-bold text-gray-800 mb-3">قايمة الفريق</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-start text-gray-500 border-b border-gray-100">
                      <th className="py-2 px-2 font-medium">الموظف</th>
                      <th className="py-2 px-2 font-medium">المسمى</th>
                      <th className="py-2 px-2 font-medium">القسم / الفريق</th>
                      <th className="py-2 px-2 font-medium">الحالة</th>
                      {data.attendanceToday && <th className="py-2 px-2 font-medium">حضور النهارده</th>}
                      {data.canSeeCompensation && <th className="py-2 px-2 font-medium" data-team-salary>الراتب الأساسي</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {data.team.map((member) => {
                      const today = attendanceOf.get(member.id)
                      return (
                        <tr key={member.id} className="border-b border-gray-50">
                          <td className="py-2 px-2">
                            <span className="font-medium text-gray-800">{member.fullName}</span>
                            <span className="text-xs text-gray-400"> <bdi>{member.employeeCode}</bdi>{member.direct ? ' • مباشر' : ''}</span>
                          </td>
                          <td className="py-2 px-2 text-gray-600">{member.jobTitle ?? '—'}</td>
                          <td className="py-2 px-2 text-gray-600">{[member.departmentName, member.teamName].filter(Boolean).join(' / ') || member.branchName || '—'}</td>
                          <td className="py-2 px-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${employeeStatusStyles[member.status] ?? 'bg-gray-100 text-gray-600'}`}>{employeeStatusLabels[member.status] ?? member.status}</span>
                          </td>
                          {data.attendanceToday && (
                            <td className="py-2 px-2">
                              {today && (
                                <>
                                  <span className={`px-2 py-0.5 rounded-full text-xs ${TEAM_ATTENDANCE_STYLES[today.status] ?? 'bg-gray-100 text-gray-600'}`}>{TEAM_ATTENDANCE_LABELS[today.status] ?? today.status}</span>
                                  {today.checkIn && <span className="text-xs text-gray-400"> <bdi>{today.checkIn}{today.checkOut ? ` – ${today.checkOut}` : ''}</bdi></span>}
                                </>
                              )}
                            </td>
                          )}
                          {data.canSeeCompensation && (
                            <td className="py-2 px-2 text-gray-700">
                              {member.basicSalary != null ? <bdi>{Number(member.basicSalary).toLocaleString('en-US')} {member.currency ? currencyLabel(member.currency) : ''}</bdi> : '—'}
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  )
}
