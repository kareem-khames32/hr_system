'use client'

// B-ADD.7 (طلب المالك 11 أكتوبر 2026): لوحة الإدارة الإحصائية — مؤشرات فوق، ورسوم (اتجاه الحضور، حالة اليوم، الإدارات، الطلبات،
// القوى العاملة، الإضافي، المهام، الإجازات، الرواتب)، وشريط برقم أو اتنين من كل موديول مفعّل. الجداول والأسماء ورا الضغطة: أي مؤشر أو
// رسمة بتفتح كارتها التفصيلي. كل قسم بيتحمّل لوحده وبيترسم لو الخادم قال إن الحساب يشوف كارته (نفس صلاحيات ونطاق B-ADD.3).
import { type ReactNode } from 'react'
import { Briefcase, CalendarOff, ChevronLeft, Clock, Inbox, ListChecks, RefreshCw, Timer, UserCheck, UserX, Users, Wallet } from 'lucide-react'
import ModuleLink from '@/components/ModuleLink'
import { currencyLabel } from '@/lib/currency'
import {
  fetchAttendanceCard, fetchLeavesCard, fetchModulesStrip, fetchOvertimeCard, fetchPayrollCard, fetchRequestsCard, fetchTasksCard, fetchTrendsCard,
  fetchWorkforceCard, fetchWorkforceMonthly, type AttendanceBucket, type DashboardAccess, type DashboardCardKey, type DashboardFilter, type DashboardTone,
} from '@/lib/dashboard-api'
import { DrillPath, TONE_BG, TONE_TEXT, num, rate, useCard, useDrill } from './cards/shared'
import { Donut, HBars, Kpi, Legend, LineChart, PairedColumns, StackedBar } from './charts'

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
const monthLabel = (key: string) => MONTHS[Number(key.slice(5, 7)) - 1] ?? key
const money = (value: number) => Number(value ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })
// قسم الحساب مايشوفش كارته: من غير نداء (الخادم كان هيرفضه) — والنتيجة null
const gate = <T,>(on: boolean, load: () => Promise<T>) => (): Promise<T | null> => (on ? load() : Promise.resolve(null))

/** هيكل قسم رسمة: عنوان، «التفاصيل» (بتفتح الكارت التفصيلي)، وتحميل وخطأ القسم لوحده */
function Panel({ title, subtitle, onDetail, loading, error, onRetry, wide = false, children, panelKey }: {
  title: string
  subtitle?: ReactNode
  onDetail?: () => void
  loading: boolean
  error: string
  onRetry: () => void
  wide?: boolean
  children: ReactNode
  panelKey: string
}) {
  return (
    <section className={`card min-w-0 ${wide ? 'lg:col-span-2' : ''}`} data-dashboard-panel={panelKey}>
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-gray-800">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {onDetail && (
          <button type="button" onClick={onDetail} className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline shrink-0">
            التفاصيل والأسماء
            <ChevronLeft size={14} />
          </button>
        )}
      </div>
      {error ? (
        <p role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">
          {error}{' '}
          <button type="button" onClick={onRetry} className="underline inline-flex items-center gap-1"><RefreshCw size={12} />إعادة المحاولة</button>
        </p>
      ) : loading && !children ? (
        <div className="flex items-center justify-center py-8" aria-busy="true">
          <div className="w-7 h-7 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className={loading ? 'opacity-60 transition-opacity' : undefined}>{children}</div>
      )}
    </section>
  )
}

const toneOfRate = (value: number | null): DashboardTone => (value === null ? 'gray' : value >= 90 ? 'green' : value >= 80 ? 'yellow' : 'red')

export default function StatsDashboard({ filter, filterKey, access, onDetail }: {
  filter: DashboardFilter
  filterKey: string
  access: DashboardAccess
  /** فتح الكارت التفصيلي (الجداول والأسماء) */
  onDetail: (key: DashboardCardKey) => void
}) {
  const allowed = new Set(access.cards.map((card) => card.key))
  const has = (key: DashboardCardKey) => allowed.has(key)
  const orgKey = JSON.stringify(filter.org)
  const org = { org: filter.org }
  const drill = useDrill(filterKey)

  const attendance = useCard(gate(has('attendance'), () => fetchAttendanceCard(filter)), `${filterKey}|a`)
  const trends = useCard(gate(has('trends'), () => fetchTrendsCard(filter)), `${filterKey}|t`)
  const unitTrends = useCard(gate(has('trends') && !!drill.group, () => fetchTrendsCard(filter, drill.group)), `${filterKey}|u|${drill.group ?? ''}`)
  const leaves = useCard(gate(has('leaves'), () => fetchLeavesCard(filter)), `${filterKey}|l`)
  const workforce = useCard(gate(has('workforce'), () => fetchWorkforceCard(org)), `${orgKey}|w`)
  const monthly = useCard(gate(has('workforce'), () => fetchWorkforceMonthly(org)), `${orgKey}|m`)
  const requests = useCard(gate(has('requests'), () => fetchRequestsCard(org)), `${orgKey}|r`)
  const tasks = useCard(gate(has('tasks'), () => fetchTasksCard(org)), `${orgKey}|k`)
  const overtime = useCard(gate(has('overtime'), () => fetchOvertimeCard(org)), `${orgKey}|o`)
  const payroll = useCard(gate(has('payroll'), () => fetchPayrollCard(org)), `${orgKey}|p`)
  const modules = useCard(() => fetchModulesStrip(org), `${orgKey}|x`)

  // ===== المؤشرات =====
  const counts = attendance.data?.counts
  const attended = counts ? counts.present + counts.late : 0
  const required = counts ? attended + counts.absent : 0
  const todayRate = counts && required > 0 ? Math.round((attended / required) * 100) : null
  const days = trends.data?.days ?? []
  const before = days.length >= 2 ? days[days.length - 2] : null
  const units = (drill.group ? unitTrends.data?.units : trends.data?.units) ?? []
  const buckets = access.buckets

  return (
    <div className="space-y-6" data-stats-dashboard>
      {/* صف المؤشرات: الرقم الأساسي، وتحته اللي يفسّره — والضغط بيفتح الأسماء */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-kpi-row>
        {has('workforce') && (
          <Kpi label="الموظفين" icon={<Users size={18} />} tone="blue" loading={workforce.loading} onClick={() => onDetail('workforce')}
            value={workforce.data ? num(workforce.data.headcount) : '—'}
            hint={workforce.data ? `+${num(workforce.data.joiners.count)} تعيين · ${num(workforce.data.leavers)} خروج في الفترة` : undefined} />
        )}
        {has('attendance') && (
          <Kpi label="نسبة الحضور" icon={<UserCheck size={18} />} tone={toneOfRate(todayRate)} loading={attendance.loading} onClick={() => onDetail('attendance')}
            value={rate(todayRate)}
            hint={before && before.attendance !== null ? `اليوم اللي قبله ${before.attendance}%` : counts ? `${num(attended)} من ${num(required)} مطلوب منهم الحضور` : undefined}
            hintTone={todayRate !== null && before?.attendance != null ? (todayRate >= before.attendance ? 'green' : 'red') : undefined} />
        )}
        {has('attendance') && (
          <Kpi label="غياب" icon={<UserX size={18} />} tone="red" loading={attendance.loading} onClick={() => onDetail(has('absentLate') ? 'absentLate' : 'attendance')}
            value={counts ? num(counts.absent) : '—'}
            hint={counts && attendance.data?.isToday && counts.pending > 0 ? `${num(counts.pending)} لسه مابصمش` : before && before.absence !== null ? `اليوم اللي قبله ${before.absence}%` : undefined} />
        )}
        {has('attendance') && (
          <Kpi label="تأخير" icon={<Clock size={18} />} tone="yellow" loading={attendance.loading} onClick={() => onDetail(has('absentLate') ? 'absentLate' : 'attendance')}
            value={counts ? num(counts.late) : '—'}
            hint={before && before.late !== null ? `اليوم اللي قبله ${before.late}%` : undefined} />
        )}
        {has('leaves') && (
          <Kpi label="في إجازة" icon={<CalendarOff size={18} />} tone="blue" loading={leaves.loading} onClick={() => onDetail('leaves')}
            value={leaves.data ? num(leaves.data.today.onLeave) : '—'}
            hint={leaves.data ? `${num(leaves.data.nextWeek.employees)} في الأسبوع الجاي` : undefined} />
        )}
        {has('requests') && (
          <Kpi label="طلبات معلّقة" icon={<Inbox size={18} />} tone={requests.data?.overdue ? 'red' : 'blue'} loading={requests.loading} onClick={() => onDetail('requests')}
            value={requests.data ? num(requests.data.pending) : '—'}
            hint={requests.data ? (requests.data.overdue ? `${num(requests.data.overdue)} متأخر عن مهلته` : 'مفيش متأخر') : undefined}
            hintTone={requests.data?.overdue ? 'red' : 'green'} />
        )}
        {has('tasks') && tasks.data?.available !== false && (
          <Kpi label="مهام مفتوحة" icon={<ListChecks size={18} />} tone={tasks.data?.overdue ? 'red' : 'blue'} loading={tasks.loading} onClick={() => onDetail('tasks')}
            value={tasks.data ? num(tasks.data.open) : '—'}
            hint={tasks.data ? (tasks.data.overdue ? `${num(tasks.data.overdue)} متأخرة` : 'مفيش متأخر') : undefined}
            hintTone={tasks.data?.overdue ? 'red' : 'green'} />
        )}
        {has('overtime') && (
          <Kpi label="ساعات الإضافي" icon={<Timer size={18} />} tone="blue" loading={overtime.loading} onClick={() => onDetail('overtime')}
            value={overtime.data ? num(Math.round(overtime.data.hours)) : '—'}
            hint={overtime.data ? (overtime.data.pendingEntries ? `${num(overtime.data.pendingEntries)} مستني اعتماد` : `شهر الرواتب ${overtime.data.period}`) : undefined}
            hintTone={overtime.data?.pendingEntries ? 'yellow' : undefined} />
        )}
      </div>

      {/* الحضور: الاتجاه وحالة اليوم */}
      {(has('trends') || has('attendance')) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {has('trends') && (
            <Panel panelKey="trend" wide title="اتجاه الحضور" subtitle={trends.data ? <>آخر 30 يوم لحد <span dir="ltr">{trends.data.to}</span> — نسبة من المطلوب منهم الحضور</> : undefined}
              loading={trends.loading} error={trends.error} onRetry={trends.reload} onDetail={() => onDetail('trends')}>
              {trends.data && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <Legend items={[{ label: 'حضور', tone: 'green' }, { label: 'تأخير', tone: 'yellow', dashed: true }, { label: 'غياب', tone: 'red', dashed: true }]} />
                    <p className="text-xs text-gray-500">
                      متوسط الفترة: حضور <span className="font-semibold text-gray-800">{rate(trends.data.summary.attendance)}</span> · تأخير{' '}
                      <span className="font-semibold text-gray-800">{rate(trends.data.summary.late)}</span> · غياب{' '}
                      <span className={`font-semibold ${TONE_TEXT[trends.data.summary.tone]}`}>{rate(trends.data.summary.absence)}</span>
                    </p>
                  </div>
                  <LineChart label="نسبة الحضور والتأخير والغياب يوم بيوم" labels={days.map((day) => day.date)}
                    series={[
                      { key: 'attendance', label: 'حضور', tone: 'green', values: days.map((day) => day.attendance) },
                      { key: 'late', label: 'تأخير', tone: 'yellow', dashed: true, values: days.map((day) => day.late) },
                      { key: 'absence', label: 'غياب', tone: 'red', dashed: true, values: days.map((day) => day.absence) },
                    ]} />
                </>
              )}
            </Panel>
          )}
          {has('attendance') && (
            <Panel panelKey="today" title={attendance.data?.isToday === false ? 'حالة اليوم المختار' : 'حالة النهارده'} subtitle={attendance.data ? <span dir="ltr">{attendance.data.date}</span> : undefined}
              loading={attendance.loading} error={attendance.error} onRetry={attendance.reload} onDetail={() => onDetail('attendance')}>
              {counts && (
                <Donut centerLabel="موظف" centerValue={num(attendance.data!.total)} onPick={() => onDetail('attendance')}
                  segments={buckets.map((bucket) => ({ key: bucket.key, label: bucket.label, tone: bucket.tone, value: counts[bucket.key as AttendanceBucket] ?? 0 }))
                    .filter((segment) => segment.value > 0 || ['present', 'late', 'absent'].includes(segment.key))} />
              )}
            </Panel>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* الإدارات: نسبة الحضور في الفترة، والضغط بينزّل للأقسام والفرق */}
        {has('trends') && (
          <Panel panelKey="units" title="الحضور حسب الإدارة" subtitle="نسبة الحضور في آخر 30 يوم — اضغط إدارة تنزل لأقسامها وفرقها"
            loading={drill.group ? unitTrends.loading : trends.loading} error={drill.group ? unitTrends.error : trends.error}
            onRetry={drill.group ? unitTrends.reload : trends.reload} onDetail={() => onDetail('trends')}>
            {(drill.group ? unitTrends.data : trends.data) && (
              <>
                <DrillPath path={drill.path} start={trends.data?.group ?? null} onBack={drill.back} />
                <HBars max={100} empty="مفيش أيام محسوبة في الفترة دي."
                  rows={units.map((unit) => ({
                    key: unit.group, label: unit.level ? `${unit.name} · ${unit.level}` : unit.name, value: unit.attendance ?? 0, display: rate(unit.attendance),
                    hint: `غياب ${rate(unit.absence)}`, tone: toneOfRate(unit.attendance),
                    onClick: unit.expandable ? () => drill.open({ group: unit.group, name: unit.name }) : undefined, title: 'اضغط للمستوى اللي تحته',
                  }))} />
              </>
            )}
          </Panel>
        )}

        {/* الطلبات: المعلّق حسب النوع، وعمره */}
        {has('requests') && (
          <Panel panelKey="requests" title="الطلبات المعلّقة" subtitle={requests.data ? `${num(requests.data.approvedNotExecuted)} معتمد ومااتنفذش · أقدم طلب من ${num(requests.data.oldestDays)} يوم` : undefined}
            loading={requests.loading} error={requests.error} onRetry={requests.reload} onDetail={() => onDetail('requests')}>
            {requests.data && (
              <>
                <StackedBar label="عمر الطلبات المعلّقة" segments={requests.data.byAge.map((band) => ({ key: band.key, label: band.label, value: band.count, tone: band.tone }))} />
                <div className="mt-4">
                  <HBars empty="مفيش طلبات معلّقة."
                    rows={requests.data.byType.slice(0, 6).map((type) => ({
                      key: type.code, label: type.name, value: type.count, tone: type.overdue ? 'red' : 'blue', hint: type.overdue ? `${num(type.overdue)} متأخر` : undefined,
                    }))} />
                </div>
              </>
            )}
          </Panel>
        )}

        {/* القوى العاملة: تعيينات مقابل خروج، واللي هينتهي */}
        {has('workforce') && (
          <Panel panelKey="workforce" title="القوى العاملة" subtitle="تعيينات مقابل خروج — آخر 6 شهور"
            loading={monthly.loading || workforce.loading} error={monthly.error || workforce.error} onRetry={() => { monthly.reload(); workforce.reload() }} onDetail={() => onDetail('workforce')}>
            {monthly.data && (
              <>
                <div className="mb-2"><Legend items={[{ label: 'تعيين', tone: 'green' }, { label: 'خروج', tone: 'red' }]} /></div>
                <PairedColumns label="تعيينات مقابل خروج بالشهر" first={{ label: 'تعيين', tone: 'green' }} second={{ label: 'خروج', tone: 'red' }}
                  groups={monthly.data.months.map((month) => ({ key: month.month, label: monthLabel(month.month), first: month.joiners, second: month.leavers }))} />
              </>
            )}
            {workforce.data && (
              <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 text-center" data-workforce-ending>
                {[
                  { label: 'تحت التجربة', value: workforce.data.onProbation, tone: 'blue' as const },
                  { label: `تجربة هتنتهي (${workforce.data.windowDays} يوم)`, value: workforce.data.probationEnding.count, tone: 'yellow' as const },
                  { label: 'عقود هتنتهي', value: workforce.data.contractsEnding.count, tone: 'yellow' as const },
                  { label: 'عقود منتهية', value: workforce.data.contractsEnding.expired, tone: 'red' as const },
                ].map((item) => (
                  <li key={item.label} className={`rounded-xl px-2 py-2 ${TONE_BG[item.value ? item.tone : 'gray']}`}>
                    <span className={`block text-xl font-bold ${TONE_TEXT[item.value ? item.tone : 'gray']}`}>{num(item.value)}</span>
                    <span className="block text-[11px] text-gray-600">{item.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        {/* الإضافي حسب القسم */}
        {has('overtime') && (
          <Panel panelKey="overtime" title="الإضافي حسب القسم" subtitle={overtime.data ? <>ساعات شهر الرواتب <span dir="ltr">{overtime.data.period}</span> — {num(overtime.data.entries)} حركة</> : undefined}
            loading={overtime.loading} error={overtime.error} onRetry={overtime.reload} onDetail={() => onDetail('overtime')}>
            {overtime.data && (
              <HBars empty="مفيش إضافي محسوب في الفترة دي."
                rows={overtime.data.byUnit.slice(0, 7).map((unit) => ({
                  key: String(unit.id ?? 'none'), label: unit.name, value: unit.hours, display: `${num(Math.round(unit.hours * 10) / 10)} س`, tone: 'blue',
                  hint: unit.amounts?.length ? unit.amounts.map((item) => `${money(item.amount)} ${currencyLabel(item.currency)}`).join(' + ') : `${num(unit.entries)} حركة`,
                }))} />
            )}
          </Panel>
        )}

        {/* المهام: مين عليه إيه */}
        {has('tasks') && tasks.data?.available !== false && (
          <Panel panelKey="tasks" title="المهام المفتوحة حسب المسؤول" subtitle={tasks.data ? `${num(tasks.data.open)} مفتوحة · ${num(tasks.data.overdue)} متأخرة` : undefined}
            loading={tasks.loading} error={tasks.error} onRetry={tasks.reload} onDetail={() => onDetail('tasks')}>
            {tasks.data && (
              <HBars empty="مفيش مهام مفتوحة."
                rows={tasks.data.assignees.slice(0, 7).map((row) => ({
                  key: `${row.employeeId ?? ''}|${row.role ?? ''}|${row.name}`, label: row.name, value: row.open, tone: row.overdue ? 'red' : 'blue',
                  hint: row.overdue ? `${num(row.overdue)} متأخرة` : undefined,
                }))} />
            )}
          </Panel>
        )}

        {/* الإجازات: أكتر الوحدات */}
        {has('leaves') && (
          <Panel panelKey="leaves" title="الإجازات حسب القسم" subtitle={leaves.data ? `${num(leaves.data.today.onLeave)} في إجازة · ${num(leaves.data.today.halfDay)} نص يوم` : undefined}
            loading={leaves.loading} error={leaves.error} onRetry={leaves.reload} onDetail={() => onDetail('leaves')}>
            {leaves.data && (
              <HBars empty="مفيش إجازات في الأسبوع ده."
                rows={leaves.data.topUnits.slice(0, 7).map((unit) => ({
                  key: String(unit.id ?? 'none'), label: unit.name, value: unit.days, display: `${num(unit.days)} يوم`, tone: 'blue', hint: `${num(unit.employees)} موظف`,
                }))} />
            )}
          </Panel>
        )}

        {/* الرواتب — الكارت نفسه بصلاحية عرض الرواتب (من غيرها مش راجع من الخادم أصلًا) */}
        {has('payroll') && (
          <Panel panelKey="payroll" wide title="الرواتب" subtitle={payroll.data ? <>شهر الرواتب <span dir="ltr">{payroll.data.period}</span> — المستحق التقديري لحد <span dir="ltr">{payroll.data.upTo}</span></> : undefined}
            loading={payroll.loading} error={payroll.error} onRetry={payroll.reload} onDetail={() => onDetail('payroll')}>
            {payroll.data && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" data-payroll-summary>
                {payroll.data.accrued.byCurrency.map((group) => (
                  <div key={group.currency} className="rounded-xl bg-primary-50 px-3 py-2.5 min-w-0">
                    <span className="flex items-center gap-1.5 text-xs text-gray-600"><Wallet size={14} className="text-primary-500" />الصافي التقديري ({currencyLabel(group.currency)})</span>
                    <span className="block text-2xl font-bold text-primary-600" dir="ltr">{money(group.estimatedNet)}</span>
                    <span className="block text-[11px] text-gray-500">{num(group.employees)} موظف · إضافي {money(group.overtime)} · خصومات {money(group.deductions)}</span>
                  </div>
                ))}
                <div className="rounded-xl bg-gray-100 px-3 py-2.5">
                  <span className="text-xs text-gray-600">مسيرات الفترة</span>
                  <span className="block text-2xl font-bold text-gray-800">{num(payroll.data.runs.length)}</span>
                  <span className="block text-[11px] text-gray-500">{payroll.data.accrued.incomplete ? `${num(payroll.data.accrued.incomplete)} موظف حسابه ناقص` : 'الحساب مكتمل'}</span>
                </div>
                <div className={`rounded-xl px-3 py-2.5 ${payroll.data.alerts.length ? 'bg-warning-50' : 'bg-success-50'}`}>
                  <span className="text-xs text-gray-600">تنبيهات قبل الاعتماد</span>
                  <span className={`block text-2xl font-bold ${payroll.data.alerts.length ? 'text-warning-600' : 'text-success-600'}`}>{num(payroll.data.alerts.reduce((sum, alert) => sum + alert.count, 0))}</span>
                  <span className="block text-[11px] text-gray-500">{payroll.data.alerts.length ? `${num(payroll.data.alerts.length)} نوع تنبيه` : 'مفيش تنبيهات'}</span>
                </div>
              </div>
            )}
          </Panel>
        )}
      </div>

      {/* شريط الموديولات: رقم أو اتنين من كل موديول مفعّل للحساب ومعاه صلاحية شاشته */}
      {modules.data && modules.data.modules.length > 0 && (
        <section data-modules-strip>
          <h3 className="flex items-center gap-2 text-base font-bold text-gray-800 mb-3"><Briefcase size={16} className="text-gray-400" />باقي الموديولات</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {modules.data.modules.map((tile) => (
              <div key={tile.key} className="min-w-0" data-module-tile={tile.key}>
              <ModuleLink href={tile.href} fallback={null}
                className="block h-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 min-w-0 hover:border-primary-500/40 hover:shadow transition-shadow">
                <span className="flex items-center justify-between gap-2 text-sm font-bold text-gray-800">
                  <span className="truncate">{tile.title}</span>
                  <ChevronLeft size={14} className="text-gray-300 shrink-0" />
                </span>
                <span className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                  {tile.stats.map((stat) => (
                    <span key={stat.label} className="min-w-0">
                      <span className={`block text-2xl font-bold ${TONE_TEXT[stat.value ? stat.tone : 'gray']}`}>{num(stat.value)}{stat.suffix ?? ''}</span>
                      <span className="block text-[11px] text-gray-500">{stat.label}</span>
                    </span>
                  ))}
                </span>
              </ModuleLink>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
