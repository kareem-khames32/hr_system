'use client'

// B-ADD.20: أقسام «الطلبات والاعتمادات»، «المهام والأداء»، «الإضافي»، «الرواتب»، و«باقي الموديولات» — رسوم وأرقام بس، وكل قسم بلينك
// لشاشته. المبلغ بيتعرض لو حقله راجع من الخادم (صلاحية عرض الرواتب)، وقسم الرواتب نفسه مابيترسمش لحساب مايشوفش كارتها.
import { Briefcase, ChevronLeft, Inbox, ListChecks, Timer, Wallet } from 'lucide-react'
import ModuleLink from '@/components/ModuleLink'
import { currencyLabel } from '@/lib/currency'
import {
  RUN_STATUS_LABELS, type ModuleTile, type ModulesStrip, type OvertimeCard, type PayrollCard, type RequestsCard, type TasksCard,
} from '@/lib/dashboard-api'
import { overtimeTakeaway, payrollTakeaway, requestsTakeaway, tasksTakeaway } from '@/lib/dashboard-insights'
import { Donut, HBars, Ring, StackedBar, StatTile, type ChartTone } from '../charts'
import { Panel, Section, type Loaded } from '../frame'
import { TONE_TEXT, num } from '../shared'

const money = (value: number) => Number(value ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })
const GRID = 'grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6'

export function RequestsSection({ href, requests }: { href?: string; requests: Loaded<RequestsCard | null> }) {
  const card = requests.data
  return (
    <Section sectionKey="requests" title="الطلبات والاعتمادات" icon={<Inbox size={18} />} href={href} linkLabel="كونسول الطلبات"
      takeaway={requests.loading && !card ? 'بنعدّ الطلبات…' : requestsTakeaway(card)}>
      <div className={GRID}>
        <Panel panelKey="requests-now" title="الموقف دلوقتي" loading={requests.loading} error={requests.error} onRetry={requests.reload}>
          {card && (
            <div className="grid grid-cols-2 gap-2" data-request-tiles>
              <StatTile label="معلّق (مستني قرار)" value={card.pending} tone="blue" />
              <StatTile label="عدّى مهلة خطوته" value={card.overdue} tone="red" />
              <StatTile label="معتمد ومااتنفذش" value={card.approvedNotExecuted} tone="yellow" />
              <StatTile label="عمر أقدم طلب معلّق" value={card.pending ? `${num(card.oldestDays)} يوم` : '—'} tone={card.oldestDays > 7 ? 'red' : 'gray'} quiet={false} />
            </div>
          )}
        </Panel>

        <Panel panelKey="requests-age" title="عمر الطلبات المعلّقة" loading={requests.loading} error={requests.error} onRetry={requests.reload} subtitle="من يوم التقديم لحد النهارده">
          {card && (card.pending
            ? <StackedBar label="عمر الطلبات المعلّقة" segments={card.byAge.map((band) => ({ key: band.key, label: band.label, value: band.count, tone: band.tone }))} />
            : <p className="text-sm text-gray-500 py-3">مفيش طلبات معلّقة.</p>)}
        </Panel>

        <Panel panelKey="requests-types" title="المعلّق حسب نوع الطلب" loading={requests.loading} error={requests.error} onRetry={requests.reload} subtitle="الأحمر = فيه طلبات عدّت مهلتها">
          {card && (
            <HBars empty="مفيش طلبات معلّقة." rows={card.byType.slice(0, 8).map((type) => ({
              key: type.code, label: type.name, value: type.count, tone: type.overdue ? 'red' : 'blue', hint: type.overdue ? `${num(type.overdue)} عدّى مهلته` : undefined,
            }))} />
          )}
        </Panel>
      </div>
    </Section>
  )
}

export function TasksSection({ href, showTasks, tasks, performance }: {
  href?: string
  /** الحساب يشوف كارت المهام (وجدولها موجود) */
  showTasks: boolean
  tasks: Loaded<TasksCard | null>
  /** بلاطة تقييم الأداء من شريط الموديولات — موجودة لو موديولها مفعّل للحساب ومعاه صلاحيته */
  performance: ModuleTile | null
}) {
  const card = showTasks ? tasks.data : null
  const cycles = performance?.stats[0], evaluated = performance?.stats[1]
  return (
    <Section sectionKey="tasks" title="المهام والأداء" icon={<ListChecks size={18} />} href={showTasks ? href : undefined} linkLabel="شاشة المهام"
      takeaway={showTasks ? (tasks.loading && !card ? 'بنعدّ المهام…' : tasksTakeaway(card)) : undefined}>
      <div className={GRID}>
        {showTasks && (
          <Panel panelKey="tasks-state" title="المهام المفتوحة" loading={tasks.loading} error={tasks.error} onRetry={tasks.reload}>
            {card && (card.open
              ? <Donut centerLabel="مهمة مفتوحة" centerValue={num(card.open)} segments={[
                  { key: 'ontime', label: 'جوه ميعادها', value: card.open - card.overdue, tone: 'blue' }, { key: 'overdue', label: 'فات ميعادها', value: card.overdue, tone: 'red' }]} />
              : <p className="text-sm text-gray-500 py-3">مفيش مهام مفتوحة.</p>)}
          </Panel>
        )}

        {showTasks && (
          <Panel panelKey="tasks-owners" title="المهام حسب المسؤول" loading={tasks.loading} error={tasks.error} onRetry={tasks.reload} subtitle="أكتر المسؤولين مهام مفتوحة — الأحمر عليه متأخر">
            {card && (
              <HBars empty="مفيش مهام مفتوحة." rows={card.assignees.slice(0, 8).map((row) => ({
                key: `${row.employeeId ?? ''}|${row.role ?? ''}|${row.name}`, label: row.name, value: row.open, tone: row.overdue ? 'red' : 'blue',
                hint: row.overdue ? `${num(row.overdue)} متأخرة` : undefined,
              }))} />
            )}
          </Panel>
        )}

        {performance && evaluated && (
          <div className="card min-w-0" data-dashboard-panel="performance">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
              <h3 className="text-base font-bold text-gray-800">تقييم الأداء</h3>
              <ModuleLink href={performance.href} fallback={null} className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline shrink-0">
                دورات التقييم
                <ChevronLeft size={12} />
              </ModuleLink>
            </div>
            <Ring value={evaluated.value} label="مديرهم خلّص تقييمهم" tone={evaluated.tone as ChartTone} caption={`${evaluated.label}${cycles ? ` · ${cycles.label}: ${num(cycles.value)}` : ''}`} />
          </div>
        )}
      </div>
    </Section>
  )
}

export function OvertimeSection({ href, overtime }: { href?: string; overtime: Loaded<OvertimeCard | null> }) {
  const card = overtime.data
  return (
    <Section sectionKey="overtime" title="الإضافي" icon={<Timer size={18} />} href={href} linkLabel="شاشة الإضافي"
      takeaway={overtime.loading && !card ? 'بنجمع الساعات…' : overtimeTakeaway(card)}>
      <div className={GRID}>
        <Panel panelKey="overtime-now" title="شهر الرواتب الجاري" loading={overtime.loading} error={overtime.error} onRetry={overtime.reload}
          subtitle={card ? <>من <span dir="ltr">{card.from}</span> لحد <span dir="ltr">{card.to}</span></> : undefined}>
          {card && (
            <div className="grid grid-cols-2 gap-2" data-overtime-tiles>
              <StatTile label="ساعات معتمدة" value={num(Math.round(card.hours * 10) / 10)} tone="blue" quiet={false} />
              <StatTile label="حركات معتمدة" value={card.entries} tone="blue" />
              <StatTile label="مستنية اعتماد" value={card.pendingEntries} tone="yellow" />
              {/* المبلغ: الحقل بيرجع لصاحب صلاحية عرض الرواتب بس */}
              {card.amounts?.map((item) => (
                <StatTile key={item.currency} label={`قيمة المعتمد (${currencyLabel(item.currency)})`} value={money(item.amount)} tone="green" quiet={false} />
              ))}
            </div>
          )}
        </Panel>

        <Panel panelKey="overtime-units" wide title="ساعات الإضافي حسب القسم" loading={overtime.loading} error={overtime.error} onRetry={overtime.reload}>
          {card && (
            <HBars empty="مفيش إضافي معتمد في الفترة دي." rows={card.byUnit.slice(0, 8).map((unit) => ({
              key: String(unit.id ?? 'none'), label: unit.name, value: unit.hours, display: `${num(Math.round(unit.hours * 10) / 10)} س`, tone: 'blue',
              hint: unit.amounts?.length ? unit.amounts.map((item) => `${money(item.amount)} ${currencyLabel(item.currency)}`).join(' + ') : `${num(unit.entries)} حركة`,
            }))} />
          )}
        </Panel>
      </div>
    </Section>
  )
}

export function PayrollSection({ href, payroll }: { href?: string; payroll: Loaded<PayrollCard | null> }) {
  const card = payroll.data
  const statuses = card ? Object.entries(RUN_STATUS_LABELS).map(([status, meta]) => ({
    key: status, label: meta.label, tone: meta.tone, value: card.runs.filter((run) => run.status === status).length,
  })).filter((segment) => segment.value > 0) : []
  const alerts = card ? card.alerts.reduce((sum, alert) => sum + alert.count, 0) : 0
  return (
    <Section sectionKey="payroll" title="الرواتب" icon={<Wallet size={18} />} href={href} linkLabel="شاشة الرواتب"
      takeaway={payroll.loading && !card ? 'بنحسب المستحق…' : payrollTakeaway(card)}>
      <div className={GRID}>
        <Panel panelKey="payroll-accrued" wide title="المستحق التقديري" loading={payroll.loading} error={payroll.error} onRetry={payroll.reload}
          subtitle={card ? <>شهر الرواتب <span dir="ltr">{card.period}</span> لحد <span dir="ltr">{card.upTo}</span> — تقديري مش مسير</> : undefined}>
          {card && (card.accrued.byCurrency.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-payroll-summary>
              {card.accrued.byCurrency.map((group) => (
                <div key={group.currency} className="min-w-0">
                  <p className="text-xs text-gray-500">الصافي التقديري ({currencyLabel(group.currency)}) — {num(group.employees)} موظف</p>
                  <p className="text-3xl font-bold text-gray-900 mb-2" dir="ltr">{money(group.estimatedNet)}</p>
                  <HBars empty="" rows={[
                    { key: 'earned', label: 'المستحق عن الأيام', value: group.earned, display: money(group.earned), tone: 'blue' },
                    { key: 'overtime', label: 'إضافي', value: group.overtime, display: money(group.overtime), tone: 'cyan' },
                    { key: 'deductions', label: 'خصومات', value: group.deductions, display: money(group.deductions), tone: 'red' },
                  ]} />
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-500 py-3">{card.note || 'مفيش مستحق محسوب للفترة دي.'}</p>)}
        </Panel>

        <Panel panelKey="payroll-runs" title="مسيرات الفترة" loading={payroll.loading} error={payroll.error} onRetry={payroll.reload} subtitle="عدد المسيرات حسب حالتها">
          {card && (
            <>
              {statuses.length
                ? <StackedBar label="مسيرات الفترة حسب الحالة" segments={statuses} />
                : <p className="text-sm text-gray-500 py-1">مفيش مسير للفترة دي لسه.</p>}
              <div className="grid grid-cols-2 gap-2 mt-4">
                <StatTile label="تنبيهات قبل الاعتماد" value={alerts} tone="red" hint={card.alerts.length ? `${num(card.alerts.length)} نوع` : undefined} />
                <StatTile label="حسابهم ناقص أيام" value={card.accrued.incomplete} tone="yellow" />
              </div>
            </>
          )}
        </Panel>
      </div>
    </Section>
  )
}

/** باقي الموديولات: بلاطة لكل موديول مفعّل للحساب ومعاه صلاحية شاشته — رقم أو اتنين ولينك لشاشته (الخادم بيرجّع المسموح بس) */
export function ModulesSection({ modules, skip }: { modules: Loaded<ModulesStrip | null>; skip: readonly string[] }) {
  const tiles = (modules.data?.modules ?? []).filter((tile) => !skip.includes(tile.key))
  if (!tiles.length) return null
  return (
    <Section sectionKey="modules" title="باقي أقسام النظام" icon={<Briefcase size={18} />} takeaway="أهم رقم في كل قسم — اضغط على أي بطاقة تفتح شاشته.">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3" data-modules-strip>
        {tiles.map((tile) => (
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
    </Section>
  )
}
