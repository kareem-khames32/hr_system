'use client'

// B-ADD.20: قسما «القوى العاملة» و«الإجازات» — رسوم بس. القوى العاملة: العدد شهر بشهر، تعيينات مقابل خروج، الدوران، مدة الخدمة،
// التوزيع حسب المكان (فرع ← إدارة ← قسم ← فريق)، والحالة والمواعيد القريبة. الأسماء (جداد الشهر، تجربة وعقود هتنتهي، إجازات الأسبوع الجاي)
// هي اللي كارت القوى العاملة وكارت الإجازات بيرجّعوها للحساب ده أصلًا، وبتتفتح كروت أشخاص في اللوحة الجانبية.
import { CalendarOff, Users } from 'lucide-react'
import {
  fetchWorkforceCard, fetchWorkforceLevel, type DatedPerson, type LeavesCard, type WorkforceCard, type WorkforceInsights,
} from '@/lib/dashboard-api'
import { leavesTakeaway, workforceTakeaway } from '@/lib/dashboard-insights'
import type { OrgFilterParams } from '@/lib/org-filter'
import { Donut, HBars, LineChart, Legend, PairedColumns, Ring, StatTile, niceDomain } from '../charts'
import { Panel, Section, gate, type Loaded } from '../frame'
import type { PanelPerson } from '../PeoplePanel'
import { DrillPath, num, useCard, useDrill } from '../shared'

export interface ListRequest { title: string; subtitle?: string; people: PanelPerson[]; total: number; href?: string; hrefLabel?: string }

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
const monthName = (key: string) => `${MONTHS[Number(key.slice(5, 7)) - 1] ?? key} ${key.slice(0, 4)}`
const monthTick = (key: string) => `${key.slice(5, 7)}/${key.slice(2, 4)}`
const tenureText = (months: number | null) => (months === null ? '—' : months < 12 ? `${months} شهر` : `${Math.round((months / 12) * 10) / 10} سنة`)

const datedPeople = (list: DatedPerson[], soon: boolean): PanelPerson[] => list.map((person) => ({
  id: person.id, name: person.name, line: [person.unit, person.team].filter(Boolean).join(' · ') || null,
  state: soon ? { label: person.daysLeft ? `بعد ${person.daysLeft} يوم` : 'النهارده', tone: person.daysLeft <= 7 ? 'red' : 'yellow' } : null,
  note: person.date,
}))

export function WorkforceSection({ org, orgKey, href, workforce, insights, onList }: {
  org: OrgFilterParams
  orgKey: string
  href?: string
  workforce: Loaded<WorkforceCard | null>
  insights: Loaded<WorkforceInsights | null>
  onList: (request: ListRequest) => void
}) {
  const drill = useDrill(orgKey)
  // فتح فرع = كارت القوى العاملة بفلتر الفرع (صفوفه = إدارات الفرع)، وفتح وحدة = مستواها (أعداد بس)
  const level = useCard(gate(drill.active, async () => {
    const narrowed = { org: drill.orgOf(org) }
    return drill.group ? fetchWorkforceLevel(narrowed, drill.group) : fetchWorkforceCard(narrowed)
  }), `${orgKey}|${drill.key}|workforce`)
  const card = workforce.data, stats = insights.data
  const months = stats?.months ?? []
  const byBranch = !drill.active && (stats?.byBranch.length ?? 0) > 1
  const rows = drill.active ? level.data?.rows ?? [] : card?.rows ?? []
  const list = (title: string, people: DatedPerson[], total: number, soon: boolean) =>
    onList({ title, subtitle: soon && card ? `خلال ${card.windowDays} يوم` : undefined, people: datedPeople(people, soon), total, href, hrefLabel: 'الكل في شاشة الموظفين' })

  return (
    <Section sectionKey="workforce" title="القوى العاملة" icon={<Users size={18} />} href={href} linkLabel="شاشة الموظفين"
      takeaway={workforce.loading && !card ? 'بنحسب العدد…' : workforceTakeaway(card, stats)}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <Panel panelKey="headcount" wide title="عدد الموظفين شهر بشهر" loading={insights.loading} error={insights.error} onRetry={insights.reload} skeleton="h-56"
          subtitle={stats ? `آخر يوم في كل شهر، من ${monthName(stats.from)} لحد النهارده` : undefined}>
          {stats && (
            <LineChart label="عدد الموظفين آخر كل شهر" suffix="" tick={monthTick} labels={months.map((month) => month.month)} domain={niceDomain(months.map((month) => month.headcount))}
              series={[{ key: 'headcount', label: 'العدد', tone: 'blue', values: months.map((month) => month.headcount) }]} />
          )}
        </Panel>

        <Panel panelKey="turnover" title="الدوران ومدة الخدمة" loading={insights.loading} error={insights.error} onRetry={insights.reload}
          subtitle={stats ? `الدوران في آخر ${months.length} شهر` : undefined}>
          {stats && (
            <>
              <Ring value={stats.turnover.rate} label="دوران العمالة" tone="blue"
                caption={`${num(stats.turnover.leavers)} خروج ÷ متوسط العدد (${num(stats.turnover.atStart)} أول الفترة و${num(stats.turnover.atEnd)} دلوقتي)`} />
              <p className="text-xs text-gray-500 mt-4 mb-1">مدة الخدمة — المتوسط <span className="font-semibold text-gray-800">{tenureText(stats.tenure.averageMonths)}</span></p>
              <HBars empty="مفيش موظفين." rows={[
                ...stats.tenure.bands.map((band) => ({ key: band.key, label: band.label, value: band.count, tone: 'blue' as const })),
                ...(stats.tenure.unknown ? [{ key: 'unknown', label: 'من غير تاريخ تعيين', value: stats.tenure.unknown, tone: 'gray' as const }] : []),
              ]} />
            </>
          )}
        </Panel>

        <Panel panelKey="flows" wide title="تعيينات مقابل خروج" loading={insights.loading} error={insights.error} onRetry={insights.reload}
          subtitle={stats ? `شهر بشهر من ${monthName(stats.from)} لحد ${monthName(stats.to)} (الرقم تحت كل عمودين = الشهر)` : undefined}>
          {stats && (
            <>
              <div className="mb-2"><Legend items={[
                { label: 'تعيين', tone: 'green', value: num(months.reduce((sum, month) => sum + month.joiners, 0)) },
                { label: 'خروج', tone: 'red', value: num(months.reduce((sum, month) => sum + month.leavers, 0)) },
              ]} /></div>
              <PairedColumns label="تعيينات مقابل خروج بالشهر" first={{ label: 'تعيين', tone: 'green' }} second={{ label: 'خروج', tone: 'red' }}
                groups={months.map((month) => ({ key: month.month, label: month.month.slice(5), first: month.joiners, second: month.leavers }))} />
            </>
          )}
        </Panel>

        <Panel panelKey="status" title="الحالة والمواعيد القريبة" loading={workforce.loading} error={workforce.error} onRetry={workforce.reload}
          subtitle={card ? `شهر الرواتب ${card.period.period} — اضغط رقم تشوف أصحابه` : undefined}>
          {card && (
            <>
              <Donut centerLabel="موظف" centerValue={num(card.headcount)}
                segments={[{ key: 'active', label: 'نشط', value: card.active, tone: 'green' }, { key: 'probation', label: 'تحت التجربة', value: card.onProbation, tone: 'yellow' },
                  ...(card.headcount - card.active - card.onProbation > 0 ? [{ key: 'other', label: 'حالات تانية', value: card.headcount - card.active - card.onProbation, tone: 'gray' as const }] : [])]} />
              <div className="grid grid-cols-2 gap-2 mt-4" data-workforce-dates>
                <StatTile label="جداد الشهر ده" value={card.joiners.count} tone="green" onClick={() => list('جداد الشهر ده', card.joiners.list, card.joiners.count, false)} />
                <StatTile label="خرجوا الشهر ده" value={card.leavers} tone="red" />
                <StatTile label="تجربة هتنتهي" value={card.probationEnding.count} tone="yellow" onClick={() => list('فترة تجربة هتنتهي', card.probationEnding.list, card.probationEnding.count, true)} />
                <StatTile label="عقود هتنتهي" value={card.contractsEnding.count} tone="yellow" hint={card.contractsEnding.expired ? `و${num(card.contractsEnding.expired)} عقد منتهي` : undefined}
                  onClick={() => list('عقود هتنتهي', card.contractsEnding.list, card.contractsEnding.count, true)} />
                <StatTile label="جوازات هتنتهي" value={card.passportsEnding.count} tone="yellow" onClick={() => list('جوازات هتنتهي', card.passportsEnding.list, card.passportsEnding.count, true)} />
                {/* مستندات الموظفين: الحقل بيرجع لصاحب صلاحية إدارة المستندات بس */}
                {card.documentsEnding && (
                  <StatTile label="مستندات هتنتهي" value={card.documentsEnding.count} tone="yellow" hint={card.documentsEnding.expired ? `و${num(card.documentsEnding.expired)} منتهي` : undefined}
                    onClick={() => onList({ title: 'مستندات هتنتهي أو انتهت', subtitle: `خلال ${card.windowDays} يوم`, total: card.documentsEnding!.count + card.documentsEnding!.expired,
                      href: '/employees/documents', hrefLabel: 'الكل في شاشة المستندات',
                      people: card.documentsEnding!.list.map((row, index) => ({ id: `${row.id}-${index}`, name: row.name, line: row.type,
                        state: { label: row.expired ? 'منتهي' : `بعد ${row.daysLeft} يوم`, tone: row.expired ? 'red' : 'yellow' }, note: row.date })) })} />
                )}
              </div>
            </>
          )}
        </Panel>

        <Panel panelKey="distribution" wide="full" title="توزيع الموظفين حسب المكان" loading={drill.active ? level.loading : workforce.loading} error={drill.active ? level.error : workforce.error}
          onRetry={drill.active ? level.reload : workforce.reload} subtitle="اضغط اسم المكان تنزل للي تحته (فرع ← إدارة ← قسم ← فريق)">
          {(drill.active ? level.data : card) && (
            <>
              <DrillPath path={drill.path} start={byBranch ? null : card?.group ?? null} onBack={drill.back} />
              {byBranch ? (
                <HBars empty="مفيش موظفين." rows={stats!.byBranch.map((branch) => ({
                  key: `branch:${branch.branchId ?? 'none'}`, label: branch.name, value: branch.total, tone: 'blue',
                  onClick: branch.branchId !== null ? () => drill.open({ name: branch.name, branchId: branch.branchId! }) : undefined,
                }))} />
              ) : (
                <HBars empty="ده آخر مستوى — الأسماء في شاشة الموظفين." rows={rows.map((row) => ({
                  key: row.group, label: row.level ? `${row.name} · ${row.level}` : row.name, value: row.total, tone: 'blue', hint: row.branchName ?? undefined,
                  onClick: row.expandable ? () => drill.open({ group: row.group, name: row.name }) : undefined,
                }))} />
              )}
            </>
          )}
        </Panel>
      </div>
    </Section>
  )
}

export function LeavesSection({ href, date, leaves, onList, onOnLeave }: {
  href?: string
  date: string
  leaves: Loaded<LeavesCard | null>
  onList: (request: ListRequest) => void
  /** فتح أصحاب خانة «إجازة» في حضور اليوم — موجود لو الحساب يشوف كارت الحضور */
  onOnLeave?: () => void
}) {
  const card = leaves.data
  return (
    <Section sectionKey="leaves" title="الإجازات" icon={<CalendarOff size={18} />} href={href ? `${href}?date=${date}` : undefined} linkLabel="شاشة الإجازات"
      takeaway={leaves.loading && !card ? 'بنحسب الإجازات…' : leavesTakeaway(card)}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <Panel panelKey="leave-now" title={card?.isToday === false ? 'اليوم المختار والأسبوع اللي بعده' : 'النهارده والأسبوع الجاي'} loading={leaves.loading} error={leaves.error} onRetry={leaves.reload}
          subtitle={card ? <>لحد <span dir="ltr">{card.weekEnd}</span></> : undefined}>
          {card && (
            <div className="grid grid-cols-2 gap-2" data-leave-tiles>
              <StatTile label="في إجازة (يوم كامل)" value={card.today.onLeave} tone="blue" onClick={onOnLeave} />
              <StatTile label="نص يوم" value={card.today.halfDay} tone="blue" />
              <StatTile label="إجازات في الأسبوع الجاي" value={card.nextWeek.employees} tone="blue"
                onClick={() => onList({ title: 'إجازات الأسبوع الجاي', total: card.nextWeek.employees, href: href ? `${href}?date=${date}` : undefined, hrefLabel: 'الكل في شاشة الإجازات',
                  people: card.nextWeek.list.map((row) => ({ id: row.id, name: row.name, line: [row.unit, row.team].filter(Boolean).join(' · ') || null,
                    state: { label: row.halfDay ? `${row.type} — نص يوم` : row.type, tone: 'blue' }, note: row.from === row.to ? row.from : `${row.from} ← ${row.to}` })) })} />
            </div>
          )}
        </Panel>

        <Panel panelKey="leave-types" title="حسب نوع الإجازة" loading={leaves.loading} error={leaves.error} onRetry={leaves.reload} subtitle="أيام الإجازة في اليوم المختار والأسبوع اللي بعده">
          {card && (
            <HBars empty="مفيش إجازات في الأسبوع ده." rows={card.byType.map((type) => ({
              key: type.code, label: type.name, value: type.days, display: `${num(type.days)} يوم`, tone: 'blue', hint: `${num(type.employees)} موظف`,
            }))} />
          )}
        </Panel>

        <Panel panelKey="leave-units" title="أكتر الأقسام إجازات" loading={leaves.loading} error={leaves.error} onRetry={leaves.reload} subtitle="أيام الإجازة في نفس النافذة">
          {card && (
            <HBars empty="مفيش إجازات في الأسبوع ده." rows={card.topUnits.map((unit) => ({
              key: String(unit.id ?? 'none'), label: unit.name, value: unit.days, display: `${num(unit.days)} يوم`, tone: 'blue', hint: `${num(unit.employees)} موظف`,
            }))} />
          )}
        </Panel>
      </div>
    </Section>
  )
}
