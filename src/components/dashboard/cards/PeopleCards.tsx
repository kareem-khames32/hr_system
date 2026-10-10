'use client'

// B-ADD.3: كارت الإجازات وكارت القوى العاملة في لوحة الإدارة.
import { useState } from 'react'
import {
  fetchLeavesCard, fetchWorkforceCard, fetchWorkforceLevel,
  type CardGroupRow, type DashboardAccess, type DashboardFilter, type DatedPerson,
} from '@/lib/dashboard-api'
import { formatDate } from '@/lib/dates'
import { Bar, CardShell, DrillPath, Empty, ListModal, Stat, num, useCard, useDrill } from './shared'

interface CardProps { filter: DashboardFilter; filterKey: string; href: string; access: DashboardAccess }

const shortDate = (date: string) => formatDate(date, { month: 'short', day: 'numeric' })

// ===== كارت 3: الإجازات =====
export function LeavesCard({ filter, filterKey, href, access }: CardProps) {
  const { data, loading, error, reload } = useCard(() => fetchLeavesCard(filter), filterKey)
  const [open, setOpen] = useState(false)
  const maxDays = Math.max(1, ...(data?.topUnits ?? []).map((unit) => unit.days))
  const isToday = filter.date === access.today
  return (
    // شاشة الإجازات بتقرا ?date= فبتفتح على نفس اليوم
    <CardShell cardKey="leaves" title="الإجازات" href={`${href}?date=${filter.date}`} loading={loading} error={error} onRetry={reload}
      subtitle={isToday ? 'النهارده والأسبوع الجاي' : `يوم ${formatDate(filter.date)} والأسبوع اللي بعده`}>
      {data ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <Stat label={isToday ? 'في إجازة النهارده' : 'في إجازة اليوم ده'} value={num(data.today.onLeave)} tone="blue" />
            <Stat label="نص يوم" value={num(data.today.halfDay)} tone="gray" />
            <Stat label="الأسبوع الجاي" value={num(data.nextWeek.employees)} tone={data.nextWeek.employees ? 'yellow' : 'green'}
              onClick={data.nextWeek.employees ? () => setOpen(true) : undefined} hint="من بكرة لـ7 أيام" />
          </div>
          <p className="text-sm font-bold text-gray-700 mb-2">أكتر الأقسام إجازات (اليوم + 7 أيام)</p>
          {data.topUnits.length === 0 ? <Empty>مفيش إجازات في الفترة دي.</Empty> : (
            <ul className="space-y-2.5">
              {data.topUnits.map((unit) => (
                <li key={unit.id ?? 'none'}>
                  <div className="flex items-center justify-between gap-2 text-sm mb-1">
                    <span className="text-gray-700 truncate">{unit.name}</span>
                    <span className="text-gray-500 shrink-0">{num(unit.days)} يوم — {num(unit.employees)} موظف</span>
                  </div>
                  <Bar value={unit.days} max={maxDays} tone="blue" />
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
      {open && data && (
        <ListModal title="إجازات الأسبوع الجاي" onClose={() => setOpen(false)} subtitle={`${num(data.nextWeek.employees)} موظف${data.nextWeek.employees > data.nextWeek.list.length ? ' — معروض أول 20' : ''}`}>
          <ul className="divide-y divide-gray-100">
            {data.nextWeek.list.map((row) => (
              <li key={row.id} className="py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="min-w-0">
                  <span className="font-medium text-gray-800">{row.name}</span>
                  <span className="block text-xs text-gray-400">{[row.team ?? row.unit, row.type, row.halfDay ? 'نص يوم' : null].filter(Boolean).join(' — ')}</span>
                </span>
                <span className="text-gray-600 shrink-0">{row.from === row.to ? shortDate(row.from) : `${shortDate(row.from)} ← ${shortDate(row.to)}`}</span>
              </li>
            ))}
          </ul>
        </ListModal>
      )}
    </CardShell>
  )
}

// ===== كارت 4: القوى العاملة =====
type WorkforceList = { title: string; rows: Array<DatedPerson & { type?: string; expired?: boolean }>; total: number; dateLabel: string }

export function WorkforceCard({ filter, href }: CardProps) {
  // الأعداد والقوايم بتتحمّل مرة للفلتر (مش لليوم المختار: القوى العاملة «النهارده» دايمًا)، والمستوى المفتوح بنداء خفيف لوحده
  const orgKey = JSON.stringify(filter.org)
  const drill = useDrill(orgKey)
  const card = useCard(() => fetchWorkforceCard({ org: filter.org }), orgKey)
  const level = useCard(() => (drill.group ? fetchWorkforceLevel({ org: filter.org }, drill.group) : Promise.resolve(null)), `${orgKey}|${drill.group ?? ''}`)
  const [list, setList] = useState<WorkforceList | null>(null)
  const data = card.data
  const rows: CardGroupRow[] = drill.group ? level.data?.rows ?? [] : data?.rows ?? []
  const maxTotal = Math.max(1, ...rows.map((row) => row.total))
  return (
    <CardShell cardKey="workforce" title="القوى العاملة" href={href} loading={card.loading} error={card.error || level.error} onRetry={() => { card.reload(); level.reload() }}
      subtitle={data ? `منهم ${num(data.active)} نشط، و${num(data.onProbation)} تحت التجربة` : undefined}>
      {data ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <Stat label="عدد الموظفين" value={num(data.headcount)} tone="blue" />
            <Stat label="جداد الشهر ده" value={num(data.joiners.count)} tone="green"
              onClick={data.joiners.count ? () => setList({ title: 'الجداد في شهر الرواتب الجاري', rows: data.joiners.list, total: data.joiners.count, dateLabel: 'باشر' }) : undefined} />
            <Stat label="خارجين الشهر ده" value={num(data.leavers)} tone={data.leavers ? 'yellow' : 'green'} />
            <Stat label={`تجربة هتخلص (${data.windowDays} يوم)`} value={num(data.probationEnding.count)} tone={data.probationEnding.count ? 'yellow' : 'green'}
              onClick={data.probationEnding.count ? () => setList({ title: 'فترات تجربة هتخلص', rows: data.probationEnding.list, total: data.probationEnding.count, dateLabel: 'تنتهي' }) : undefined} />
            <Stat label={`عقود هتنتهي (${data.windowDays} يوم)`} value={num(data.contractsEnding.count)}
              tone={data.contractsEnding.expired ? 'red' : data.contractsEnding.count ? 'yellow' : 'green'}
              hint={data.contractsEnding.expired ? `و${num(data.contractsEnding.expired)} عقد منتهي` : undefined}
              onClick={data.contractsEnding.count ? () => setList({ title: 'عقود هتنتهي', rows: data.contractsEnding.list, total: data.contractsEnding.count, dateLabel: 'ينتهي' }) : undefined} />
            {data.documentsEnding ? (
              <Stat label={`إقامات ومستندات (${data.windowDays} يوم)`} value={num(data.documentsEnding.count)}
                tone={data.documentsEnding.expired ? 'red' : data.documentsEnding.count ? 'yellow' : 'green'}
                hint={data.documentsEnding.expired ? `و${num(data.documentsEnding.expired)} منتهي` : undefined}
                onClick={data.documentsEnding.count + data.documentsEnding.expired
                  ? () => setList({ title: 'إقامات ومستندات هتنتهي أو انتهت', rows: data.documentsEnding!.list, total: data.documentsEnding!.count + data.documentsEnding!.expired, dateLabel: 'ينتهي' })
                  : undefined} />
            ) : (
              <Stat label={`جوازات هتنتهي (${data.windowDays} يوم)`} value={num(data.passportsEnding.count)} tone={data.passportsEnding.count ? 'yellow' : 'green'}
                onClick={data.passportsEnding.count ? () => setList({ title: 'جوازات هتنتهي', rows: data.passportsEnding.list, total: data.passportsEnding.count, dateLabel: 'ينتهي' }) : undefined} />
            )}
          </div>
          {data.documentsEnding && data.passportsEnding.count > 0 && (
            <p className="text-xs text-gray-500 mb-3">
              <button type="button" className="text-primary-600 hover:underline"
                onClick={() => setList({ title: 'جوازات هتنتهي', rows: data.passportsEnding.list, total: data.passportsEnding.count, dateLabel: 'ينتهي' })}>
                {num(data.passportsEnding.count)} جواز هينتهي في {data.windowDays} يوم
              </button>
            </p>
          )}
          <p className="text-sm font-bold text-gray-700 mb-2">العدد بالإدارة والقسم والفريق</p>
          <DrillPath path={drill.path} start={data.group} onBack={drill.back} />
          {rows.length === 0 ? <Empty>{drill.group && level.loading ? 'جارٍ التحميل...' : 'ده آخر مستوى.'}</Empty> : (
            <ul className="space-y-2.5" data-workforce-levels>
              {rows.map((row) => (
                <li key={row.group}>
                  <div className="flex items-center justify-between gap-2 text-sm mb-1">
                    {row.expandable
                      ? <button type="button" onClick={() => drill.open({ group: row.group, name: row.name })} className="text-primary-600 hover:underline truncate text-start">{row.name}</button>
                      : <span className="text-gray-700 truncate">{row.name}</span>}
                    <span className="text-gray-500 shrink-0">{[row.level, row.branchName].filter(Boolean).join(' — ')} <b className="text-gray-800">{num(row.total)}</b></span>
                  </div>
                  <Bar value={row.total} max={maxTotal} tone="blue" />
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
      {list && (
        <ListModal title={list.title} onClose={() => setList(null)} subtitle={`${num(list.total)}${list.total > list.rows.length ? ' — معروض أول 20' : ''}`}>
          <ul className="divide-y divide-gray-100">
            {list.rows.map((row, index) => (
              <li key={`${row.id}-${index}`} className="py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="min-w-0">
                  <span className="font-medium text-gray-800">{row.name}</span>
                  <span className="block text-xs text-gray-400">{[row.type, row.team ?? row.unit].filter(Boolean).join(' — ') || '—'}</span>
                </span>
                <span className={`shrink-0 ${row.expired ? 'text-danger-600' : 'text-gray-600'}`}>
                  {row.expired ? 'انتهى' : list.dateLabel} {formatDate(row.date)}
                </span>
              </li>
            ))}
          </ul>
        </ListModal>
      )}
    </CardShell>
  )
}
