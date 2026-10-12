'use client'

// B-ADD.20: قسم «الحضور والالتزام» — متوسطات الفترة ومقارنتها بالفترة اللي قبلها، خط الاتجاه، دايرة حالة اليوم، حالة اليوم حسب المكان
// (فرع ← إدارة ← قسم ← فريق، والضغط على رقم حالة بيفتح أصحابه في اللوحة الجانبية)، نسبة الحضور حسب المكان، ونمط أيام الأسبوع.
// كل رقم من مسارات كروت الحضور والاتجاهات بصلاحيتها ونطاقها — القسم مابيترسمش لحساب مايشوفهمش.
import { CalendarCheck, Clock, UserCheck, UserX } from 'lucide-react'
import {
  fetchAttendanceCard, fetchTrendsCard, type AttendanceBucket, type AttendanceCard, type BranchesCard, type BucketCounts, type DashboardAccess, type DashboardFilter,
  type DashboardTone, type TrendWindow, type TrendsCard,
} from '@/lib/dashboard-api'
import { attendanceTakeaway, deltaOf, weekdayPattern } from '@/lib/dashboard-insights'
import type { OrgFilterParams } from '@/lib/org-filter'
import { BUCKET_TONE, Donut, HBars, Kpi, Legend, LineChart, PairedColumns, StackedRows, type StackedRow } from '../charts'
import { Panel, Section, gate, type Loaded } from '../frame'
import { DrillPath, num, rate, useCard, useDrill } from '../shared'

export interface BucketRequest { bucket: AttendanceBucket; org: OrgFilterParams; group?: string; place?: string }

const toneOfRate = (value: number | null): DashboardTone => (value === null ? 'gray' : value >= 90 ? 'green' : value >= 80 ? 'yellow' : 'red')

export default function AttendanceSection({ filter, filterKey, period, access, href, reportsHref, showToday, showTrends, attendance, branches, trends, previous, onBucket }: {
  filter: DashboardFilter
  filterKey: string
  period: TrendWindow
  access: DashboardAccess
  /** شاشة الحضور، وشاشة التقارير (كارت الاتجاهات) */
  href?: string
  reportsHref?: string
  /** الحساب يشوف كارت حضور اليوم / كارت الاتجاهات */
  showToday: boolean
  showTrends: boolean
  attendance: Loaded<AttendanceCard | null>
  branches: Loaded<BranchesCard | null>
  trends: Loaded<TrendsCard | null>
  previous: Loaded<TrendsCard | null>
  onBucket: (request: BucketRequest) => void
}) {
  const drill = useDrill(`${filterKey}|${period}`)
  const drilled: DashboardFilter = { org: drill.orgOf(filter.org), date: filter.date }
  const level = useCard(gate(showToday && drill.active, () => fetchAttendanceCard(drilled, drill.group)), `${filterKey}|${drill.key}|level`)
  const levelTrends = useCard(gate(showTrends && drill.active, () => fetchTrendsCard(drilled, drill.group, period)), `${filterKey}|${period}|${drill.key}|rates`)
  const place = drill.active ? level : attendance
  const rates = drill.active ? levelTrends : trends

  const segmentsOf = (counts: BucketCounts) => access.buckets.map((bucket) => ({ key: bucket.key, label: bucket.label, value: counts[bucket.key] ?? 0, tone: BUCKET_TONE[bucket.key] }))
  const counts = attendance.data?.counts
  const days = trends.data?.days ?? []
  const summary = trends.data?.summary, before = previous.data?.summary
  const caption = `عن الـ${period} يوم اللي قبلهم`

  // أول مستوى: فروع الحساب لو أكتر من فرع ومفيش فرع مختار — وبعدها الإدارات فالأقسام فالفرق
  const byBranch = !drill.active && (branches.data?.rows.length ?? 0) > 1
  const placeRows: StackedRow[] = byBranch
    ? branches.data!.rows.map((row) => ({
        key: `branch:${row.branchId ?? 'none'}`, label: row.name, segments: segmentsOf(row.counts), pickable: row.branchId !== null,
        onOpen: row.branchId !== null ? () => drill.open({ name: row.name, branchId: row.branchId! }) : undefined,
      }))
    : place.data
      ? (place.data.rows.length
          ? place.data.rows.map((row) => ({
              key: row.group, label: row.level ? `${row.name} · ${row.level}` : row.name, hint: row.branchName ?? undefined, segments: segmentsOf(row.counts),
              onOpen: row.expandable ? () => drill.open({ group: row.group, name: row.name }) : undefined,
            }))
          // آخر مستوى (فريق، أو وحدة من غير أقسام): صف واحد بأرقامه
          : [{ key: place.data.group?.group ?? 'all', label: place.data.group?.name ?? 'الكل', segments: segmentsOf(place.data.counts) }])
      : []
  const pickPlace = (rowKey: string, bucket: string) => {
    if (rowKey.startsWith('branch:')) {
      const row = branches.data?.rows.find((item) => `branch:${item.branchId ?? 'none'}` === rowKey)
      if (row && row.branchId !== null) onBucket({ bucket: bucket as AttendanceBucket, org: { ...filter.org, branchId: row.branchId }, place: row.name })
      return
    }
    const row = place.data?.rows.find((item) => item.group === rowKey)
    onBucket({ bucket: bucket as AttendanceBucket, org: drilled.org, group: row ? row.group : place.data?.group?.group, place: row ? row.name : place.data?.group?.name })
  }
  const pattern = weekdayPattern(days).filter((day) => day.required > 0)

  return (
    <Section sectionKey="attendance" title="الحضور والالتزام" icon={<CalendarCheck size={18} />} href={href} linkLabel="شاشة الحضور"
      takeaway={showTrends ? (trends.loading && !trends.data ? 'بنحسب الفترة…' : attendanceTakeaway(trends.data, previous.data)) : undefined}>
      {showTrends && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4" data-period-averages>
          <Kpi label={`متوسط الحضور — ${period} يوم`} icon={<UserCheck size={18} />} tone="green" loading={trends.loading} value={summary ? rate(summary.attendance) : '—'}
            spark={days.map((day) => day.attendance)} delta={summary && before ? wrap(deltaOf(summary.attendance, before.attendance, true), caption) : null} />
          <Kpi label={`متوسط التأخير — ${period} يوم`} icon={<Clock size={18} />} tone="yellow" loading={trends.loading} value={summary ? rate(summary.late) : '—'}
            spark={days.map((day) => day.late)} delta={summary && before ? wrap(deltaOf(summary.late, before.late, false), caption) : null} />
          <Kpi label={`متوسط الغياب — ${period} يوم`} icon={<UserX size={18} />} tone="red" loading={trends.loading} value={summary ? rate(summary.absence) : '—'}
            spark={days.map((day) => day.absence)} delta={summary && before ? wrap(deltaOf(summary.absence, before.absence, false), caption) : null} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {showTrends && (
          <Panel panelKey="trend" wide title="اتجاه الحضور يوم بيوم" href={reportsHref} linkLabel="التقارير" loading={trends.loading} error={trends.error} onRetry={trends.reload} skeleton="h-56"
            subtitle={trends.data ? <>من <span dir="ltr">{trends.data.from}</span> لحد <span dir="ltr">{trends.data.to}</span> — نسبة من المطلوب منهم الحضور</> : undefined}>
            {trends.data && (
              <>
                <div className="mb-2"><Legend items={[{ label: 'حضور', tone: 'green' }, { label: 'تأخير', tone: 'yellow', dashed: true }, { label: 'غياب', tone: 'red', dashed: true }]} /></div>
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

        {showToday && (
          <Panel panelKey="today" title={attendance.data?.isToday === false ? 'حالة اليوم المختار' : 'حالة النهارده'} loading={attendance.loading} error={attendance.error} onRetry={attendance.reload}
            subtitle={attendance.data ? <><span dir="ltr">{attendance.data.date}</span> — اضغط حالة تشوف أصحابها</> : undefined}>
            {counts && (
              <Donut centerLabel="موظف" centerValue={num(attendance.data!.total)} onPick={(key) => onBucket({ bucket: key as AttendanceBucket, org: filter.org, place: attendance.data!.group?.name })}
                segments={segmentsOf(counts).filter((segment) => segment.value > 0 || ['present', 'late', 'absent'].includes(segment.key))} />
            )}
          </Panel>
        )}

        {showToday && (
          <Panel panelKey="places" wide title="حالة اليوم حسب المكان" loading={drill.active ? level.loading : attendance.loading || branches.loading}
            error={drill.active ? level.error : attendance.error} onRetry={drill.active ? level.reload : attendance.reload} skeleton="h-56"
            subtitle="اضغط اسم المكان تنزل للي تحته (فرع ← إدارة ← قسم ← فريق)، واضغط رقم حالة تشوف أصحابها">
            {(byBranch || place.data) && (
              <>
                <DrillPath path={drill.path} start={byBranch ? null : attendance.data?.group ?? null} onBack={drill.back} />
                <StackedRows rows={placeRows} onPick={pickPlace} empty="مفيش موظفين في المكان ده." />
              </>
            )}
          </Panel>
        )}

        {showTrends && (
          <Panel panelKey="units" title="نسبة الحضور حسب المكان" loading={rates.loading} error={rates.error} onRetry={rates.reload}
            subtitle={`متوسط آخر ${period} يوم — نفس المستوى المفتوح في «حالة اليوم حسب المكان»`}>
            {rates.data && (
              <>
                {!showToday && <DrillPath path={drill.path} start={trends.data?.group ?? null} onBack={drill.back} />}
                <HBars max={100} empty="مفيش أيام محسوبة للمستوى ده في الفترة."
                  rows={rates.data.units.map((unit) => ({
                    key: unit.group, label: unit.level ? `${unit.name} · ${unit.level}` : unit.name, value: unit.attendance ?? 0, display: rate(unit.attendance),
                    hint: `غياب ${rate(unit.absence)}`, tone: toneOfRate(unit.attendance),
                    onClick: unit.expandable ? () => drill.open({ group: unit.group, name: unit.name }) : undefined,
                  }))} />
              </>
            )}
          </Panel>
        )}

        {showTrends && (
          <Panel panelKey="weekdays" wide="full" title="الغياب والتأخير حسب يوم الأسبوع" loading={trends.loading} error={trends.error} onRetry={trends.reload}
            subtitle={`متوسط كل يوم في آخر ${period} يوم — يوم الراحة اللي مافيهوش حد مطلوب منه الحضور مش ظاهر`}>
            {trends.data && (pattern.length ? (
              <>
                <div className="mb-2"><Legend items={[{ label: 'غياب', tone: 'red' }, { label: 'تأخير', tone: 'yellow' }]} /></div>
                <PairedColumns label="متوسط نسبة الغياب والتأخير لكل يوم من الأسبوع" suffix="%" first={{ label: 'غياب', tone: 'red' }} second={{ label: 'تأخير', tone: 'yellow' }}
                  groups={pattern.map((day) => ({ key: String(day.weekday), label: day.label, first: day.absence ?? 0, second: day.late ?? 0 }))} />
              </>
            ) : <p className="text-sm text-gray-500 py-3">مفيش أيام محسوبة في الفترة دي.</p>)}
          </Panel>
        )}
      </div>
    </Section>
  )
}

const wrap = (delta: ReturnType<typeof deltaOf>, caption: string) => (delta ? { value: delta, unit: 'نقطة', caption } : null)
