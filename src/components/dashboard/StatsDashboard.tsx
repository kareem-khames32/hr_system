'use client'

// B-ADD.20 (طلب المالك 12 أكتوبر 2026: «داشبورد احترافية بتعرض كل حاجة… ما يكونش فيها جداول. الداشبورد بتبقى إحصائيات»):
// اللوحة إحصائيات بس — نبض اليوم (مؤشرات بفرقها عن الفترة وخط صغير)، «محتاج انتباهك» (قواعد ثابتة على نفس الأرقام)، ثم قسم لكل موضوع
// بعنوانه وسطر خلاصته ولينك شاشته. مفيش جدول ولا قايمة صفوف: الرقم اللي محتاج أسماء بيفتحها كروت أشخاص في لوحة جانبية (أقصاها 50)،
// والرسمة بتنزل في المستويات (فرع ← إدارة ← قسم ← فريق) جوه نفسها.
// B-ADD.7/B-ADD.3: كل قسم بيتحمّل لوحده وبيترسم لو الخادم قال إن الحساب يشوف كارته (نفس الصلاحيات والموديولات ونطاق الفروع) —
// مفيش شرط صلاحية هنا يقوم مقام الخادم.
import { useCallback, useState } from 'react'
import { Activity, AlertTriangle, CalendarOff, CheckCircle2, ChevronLeft, Clock, Inbox, ListChecks, Timer, UserCheck, UserX, Users } from 'lucide-react'
import ModuleLink from '@/components/ModuleLink'
import {
  fetchAttendanceCard, fetchBranchesCard, fetchLeavesCard, fetchModulesStrip, fetchOvertimeCard, fetchPayrollCard, fetchRequestsCard, fetchTasksCard, fetchTrendsCard,
  fetchWorkforceCard, fetchWorkforceInsights, type DashboardAccess, type DashboardCardKey, type DashboardFilter, type DashboardTone, type TrendWindow,
} from '@/lib/dashboard-api'
import { ATTENTION, absenceRateOf, attendanceRateOf, attentionItems, deltaOf, shiftDay } from '@/lib/dashboard-insights'
import { Kpi } from './charts'
import { gate, jumpTo } from './frame'
import { BucketPanel, PeoplePanel } from './PeoplePanel'
import AttendanceSection, { type BucketRequest } from './sections/AttendanceSection'
import { LeavesSection, WorkforceSection, type ListRequest } from './sections/PeopleSections'
import { ModulesSection, OvertimeSection, PayrollSection, RequestsSection, TasksSection } from './sections/WorkSections'
import { num, rate, useCard } from './shared'

const toneOfRate = (value: number | null): DashboardTone => (value === null ? 'gray' : value >= 90 ? 'green' : value >= 80 ? 'yellow' : 'red')

export default function StatsDashboard({ filter, filterKey, period, access }: {
  filter: DashboardFilter
  filterKey: string
  /** نافذة الاتجاه المختارة من فلتر اللوحة */
  period: TrendWindow
  access: DashboardAccess
}) {
  const allowed = new Set(access.cards.map((card) => card.key))
  const has = (key: DashboardCardKey) => allowed.has(key)
  const hrefs = Object.fromEntries(access.cards.map((card) => [card.key, card.href])) as Partial<Record<DashboardCardKey, string>>
  const orgKey = JSON.stringify(filter.org)
  const org = { org: filter.org }
  // الفروع مستوى أول في النزول لما الفلتر مش مختار فرع ولا وحدة ولا فريق (الخادم بيرجّع فروع نطاق الحساب بس)
  const companyWide = filter.org.branchId === undefined && !filter.org.departmentIds && filter.org.teamId === undefined
  // اللوحة الجانبية المفتوحة: أصحاب خانة حضور (بتتحمّل)، أو قايمة جاية مع كارتها
  const [bucketPanel, setBucketPanel] = useState<BucketRequest | null>(null)
  const [listPanel, setListPanel] = useState<ListRequest | null>(null)
  const openBucket = useCallback((request: BucketRequest) => { setListPanel(null); setBucketPanel(request) }, [])
  const openList = useCallback((request: ListRequest) => { setBucketPanel(null); setListPanel(request) }, [])
  const closePanel = useCallback(() => { setBucketPanel(null); setListPanel(null) }, [])

  const attendance = useCard(gate(has('attendance'), () => fetchAttendanceCard(filter)), `${filterKey}|a`)
  const branches = useCard(gate(has('attendance') && companyWide, () => fetchBranchesCard(filter)), `${filterKey}|b`)
  const trends = useCard(gate(has('trends'), () => fetchTrendsCard(filter, undefined, period)), `${filterKey}|${period}|t`)
  // نفس النافذة قبلها مباشرة — للمقارنة «عن الفترة اللي قبلها»
  const previous = useCard(gate(has('trends'), () => fetchTrendsCard({ org: filter.org, date: shiftDay(filter.date, -period) }, undefined, period)), `${filterKey}|${period}|p`)
  const leaves = useCard(gate(has('leaves'), () => fetchLeavesCard(filter)), `${filterKey}|l`)
  const workforce = useCard(gate(has('workforce'), () => fetchWorkforceCard(org)), `${orgKey}|w`)
  const insights = useCard(gate(has('workforce'), () => fetchWorkforceInsights(org)), `${orgKey}|i`)
  const requests = useCard(gate(has('requests'), () => fetchRequestsCard(org)), `${orgKey}|r`)
  const tasks = useCard(gate(has('tasks'), () => fetchTasksCard(org)), `${orgKey}|k`)
  const overtime = useCard(gate(has('overtime'), () => fetchOvertimeCard(org)), `${orgKey}|o`)
  const payroll = useCard(gate(has('payroll'), () => fetchPayrollCard(org)), `${orgKey}|p`)
  const modules = useCard(() => fetchModulesStrip(org), `${orgKey}|x`)

  // ===== نبض اليوم =====
  const counts = attendance.data?.counts
  const attended = counts ? counts.present + counts.late : 0
  const required = counts ? attended + counts.absent : 0
  const todayRate = attendanceRateOf(counts), todayAbsence = absenceRateOf(counts)
  const todayLate = counts && required > 0 ? Math.round((counts.late * 1000) / required) / 10 : null
  const days = trends.data?.days ?? []
  const summary = trends.data?.summary
  const months = insights.data?.months ?? []
  const lastMonth = months.length >= 2 ? months[months.length - 2] : null
  const dayWord = attendance.data?.isToday === false ? 'اليوم المختار' : 'النهارده'
  const versusPeriod = (delta: ReturnType<typeof deltaOf>) => (delta ? { value: delta, unit: 'نقطة', caption: `عن متوسط ${period} يوم` } : null)
  const tasksOn = has('tasks') && tasks.data?.available !== false
  const performance = modules.data?.modules.find((tile) => tile.key === 'performance') ?? null

  // ===== محتاج انتباهك =====
  // الجملة من رقم قسم الحساب يشوفه بس — نفس بوابة الكارت (الرقم اللي مش راجع من الخادم مالوش جملة)
  const seen = <T,>(key: DashboardCardKey, data: T | null): T | null => (has(key) ? data : null)
  const attention = attentionItems({
    hrefs, attendance: seen('attendance', attendance.data), trends: seen('trends', trends.data), previous: seen('trends', previous.data), requests: seen('requests', requests.data),
    tasks: seen('tasks', tasks.data), overtime: seen('overtime', overtime.data), workforce: seen('workforce', workforce.data), payroll: seen('payroll', payroll.data), modules: modules.data,
  })
  const settling = [attendance, trends, requests, tasks, overtime, workforce, payroll, modules].some((card) => card.loading && !card.data && !card.error)

  return (
    <div className="space-y-8" data-stats-dashboard>
      {/* نبض اليوم: الرقم، وفرقه عن الفترة، وخط اتجاهه — والضغط بيودّي لقسمه أو بيفتح أصحابه */}
      <section data-dashboard-section="pulse">
        <div className="mb-3">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
            <Activity size={18} className="text-primary-500 shrink-0" aria-hidden="true" />
            نبض {dayWord}
            <span className="text-sm font-normal text-gray-400" dir="ltr">{filter.date}</span>
          </h2>
          {counts && (
            <p className="text-sm text-gray-500 mt-0.5" data-section-takeaway>
              {num(attended)} حضروا من {num(required)} مطلوب منهم الحضور — {num(counts.absent)} غايب و{num(counts.late)} متأخر{attendance.data?.isToday && counts.pending > 0 ? `، و${num(counts.pending)} لسه مابصمش` : ''}.
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-kpi-row>
          {has('workforce') && (
            <Kpi label="الموظفين" icon={<Users size={18} />} tone="blue" loading={workforce.loading} onClick={() => jumpTo('workforce')} title="اضغط لقسم القوى العاملة"
              value={workforce.data ? num(workforce.data.headcount) : '—'} spark={months.map((month) => month.headcount)}
              delta={lastMonth ? { value: deltaOf(months[months.length - 1].headcount, lastMonth.headcount, null)!, unit: 'موظف', caption: 'عن آخر الشهر اللي فات' } : null}
              hint={workforce.data ? `+${num(workforce.data.joiners.count)} تعيين · ${num(workforce.data.leavers)} خروج في شهر الرواتب` : undefined} />
          )}
          {has('attendance') && (
            <Kpi label={`حضور ${dayWord}`} icon={<UserCheck size={18} />} tone={toneOfRate(todayRate)} loading={attendance.loading} onClick={() => jumpTo('attendance')} title="اضغط لقسم الحضور"
              value={rate(todayRate)} spark={days.map((day) => day.attendance)} delta={versusPeriod(deltaOf(todayRate, summary?.attendance, true))}
              hint={counts ? `${num(attended)} من ${num(required)} مطلوب منهم الحضور` : undefined} />
          )}
          {has('attendance') && (
            <Kpi label={`غياب ${dayWord}`} icon={<UserX size={18} />} tone="red" loading={attendance.loading} title="اضغط للأسماء"
              onClick={() => openBucket({ bucket: 'absent', org: filter.org })}
              value={counts ? num(counts.absent) : '—'} spark={days.map((day) => day.absence)} delta={versusPeriod(deltaOf(todayAbsence, summary?.absence, false))}
              hint={counts ? (attendance.data?.isToday && counts.pending > 0 ? `${rate(todayAbsence)} · ${num(counts.pending)} لسه مابصمش` : rate(todayAbsence)) : undefined} />
          )}
          {has('attendance') && (
            <Kpi label={`تأخير ${dayWord}`} icon={<Clock size={18} />} tone="yellow" loading={attendance.loading} title="اضغط للأسماء"
              onClick={() => openBucket({ bucket: 'late', org: filter.org })}
              value={counts ? num(counts.late) : '—'} spark={days.map((day) => day.late)} delta={versusPeriod(deltaOf(todayLate, summary?.late, false))}
              hint={counts ? rate(todayLate) : undefined} />
          )}
          {has('leaves') && (
            <Kpi label="في إجازة" icon={<CalendarOff size={18} />} tone="blue" loading={leaves.loading} onClick={() => jumpTo('leaves')} title="اضغط لقسم الإجازات"
              value={leaves.data ? num(leaves.data.today.onLeave) : '—'}
              hint={leaves.data ? `${num(leaves.data.nextWeek.employees)} في الأسبوع الجاي` : undefined} />
          )}
          {has('requests') && (
            <Kpi label="طلبات معلّقة" icon={<Inbox size={18} />} tone={requests.data?.overdue ? 'red' : 'blue'} loading={requests.loading} onClick={() => jumpTo('requests')} title="اضغط لقسم الطلبات"
              value={requests.data ? num(requests.data.pending) : '—'}
              hint={requests.data ? (requests.data.overdue ? `${num(requests.data.overdue)} عدّى مهلته` : 'مفيش متأخر') : undefined}
              hintTone={requests.data ? (requests.data.overdue ? 'red' : 'green') : undefined} />
          )}
          {tasksOn && (
            <Kpi label="مهام مفتوحة" icon={<ListChecks size={18} />} tone={tasks.data?.overdue ? 'red' : 'blue'} loading={tasks.loading} onClick={() => jumpTo('tasks')} title="اضغط لقسم المهام"
              value={tasks.data ? num(tasks.data.open) : '—'}
              hint={tasks.data ? (tasks.data.overdue ? `${num(tasks.data.overdue)} فات ميعادها` : 'مفيش متأخر') : undefined}
              hintTone={tasks.data ? (tasks.data.overdue ? 'red' : 'green') : undefined} />
          )}
          {has('overtime') && (
            <Kpi label="ساعات الإضافي" icon={<Timer size={18} />} tone="blue" loading={overtime.loading} onClick={() => jumpTo('overtime')} title="اضغط لقسم الإضافي"
              value={overtime.data ? num(Math.round(overtime.data.hours)) : '—'}
              hint={overtime.data ? (overtime.data.pendingEntries ? `${num(overtime.data.pendingEntries)} مستني اعتماد` : `شهر الرواتب ${overtime.data.period}`) : undefined}
              hintTone={overtime.data?.pendingEntries ? 'yellow' : undefined} />
          )}
        </div>
      </section>

      {/* محتاج انتباهك: جمل من نفس الأرقام بقواعد ثابتة، وكل جملة بتودّي للشاشة اللي بتتعالج فيها */}
      <section className="card" data-dashboard-section="attention" aria-label="محتاج انتباهك">
        <h2 className="flex items-center gap-2 text-base font-bold text-gray-800 mb-3">
          <AlertTriangle size={18} className="text-warning-500 shrink-0" aria-hidden="true" />
          محتاج انتباهك
          {attention.length > 0 && <span className="text-xs font-medium text-gray-500">({num(attention.length)})</span>}
        </h2>
        {attention.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-gray-500">
            {settling ? 'بنراجع الأرقام…' : <><CheckCircle2 size={16} className="text-success-500 shrink-0" aria-hidden="true" />مفيش حاجة محتاجة انتباهك دلوقتي.</>}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2" data-attention-items>
            {attention.slice(0, ATTENTION.maxItems).map((item) => {
              const body = (
                <>
                  <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${item.tone === 'red' ? 'bg-danger-500' : 'bg-warning-500'}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1 text-sm text-gray-700">
                    <span className={`font-semibold ${item.tone === 'red' ? 'text-danger-600' : 'text-warning-600'}`}>{item.tone === 'red' ? 'عاجل' : 'للمتابعة'}: </span>
                    {item.text}
                  </span>
                </>
              )
              const className = `flex items-start gap-2 rounded-xl px-3 py-2 ${item.tone === 'red' ? 'bg-danger-50' : 'bg-warning-50'}`
              return (
                <div key={item.key} className="min-w-0" data-attention={item.tone}>
                  {item.href
                    ? <ModuleLink href={item.href} className={`${className} hover:ring-2 hover:ring-primary-500/30`} fallback={<span className={className}>{body}</span>}>
                        {body}
                        <ChevronLeft size={14} className="text-gray-400 shrink-0 mt-1" />
                      </ModuleLink>
                    : <span className={className}>{body}</span>}
                </div>
              )
            })}
          </div>
        )}
        {attention.length > ATTENTION.maxItems && <p className="text-xs text-gray-400 mt-2">و{num(attention.length - ATTENTION.maxItems)} كمان في أقسامها تحت.</p>}
      </section>

      {(has('attendance') || has('trends')) && (
        <AttendanceSection filter={filter} filterKey={filterKey} period={period} access={access} href={hrefs.attendance} reportsHref={hrefs.trends}
          showToday={has('attendance')} showTrends={has('trends')} attendance={attendance} branches={branches} trends={trends} previous={previous} onBucket={openBucket} />
      )}
      {has('workforce') && <WorkforceSection org={filter.org} orgKey={orgKey} href={hrefs.workforce} workforce={workforce} insights={insights} onList={openList} />}
      {has('leaves') && (
        <LeavesSection href={hrefs.leaves} date={filter.date} leaves={leaves} onList={openList}
          onOnLeave={has('attendance') ? () => openBucket({ bucket: 'leave', org: filter.org }) : undefined} />
      )}
      {has('requests') && <RequestsSection href={hrefs.requests} requests={requests} />}
      {(tasksOn || performance) && <TasksSection href={hrefs.tasks} showTasks={tasksOn} tasks={tasks} performance={performance} />}
      {has('overtime') && <OvertimeSection href={hrefs.overtime} overtime={overtime} />}
      {/* الرواتب — الكارت نفسه بصلاحية عرض الرواتب (من غيرها مش راجع من الخادم أصلًا) */}
      {has('payroll') && <PayrollSection href={hrefs.payroll} payroll={payroll} />}
      <ModulesSection modules={modules} skip={performance ? ['performance'] : []} />

      {bucketPanel && (
        <BucketPanel filter={{ org: bucketPanel.org, date: filter.date }} bucket={bucketPanel.bucket} group={bucketPanel.group} place={bucketPanel.place}
          label={access.buckets.find((bucket) => bucket.key === bucketPanel.bucket)?.label ?? bucketPanel.bucket} contactCard={has('absentLate')} href={hrefs.attendance} onClose={closePanel} />
      )}
      {listPanel && (
        <PeoplePanel title={listPanel.title} subtitle={listPanel.subtitle} people={listPanel.people} total={listPanel.total} href={listPanel.href} hrefLabel={listPanel.hrefLabel} onClose={closePanel} />
      )}
    </div>
  )
}
