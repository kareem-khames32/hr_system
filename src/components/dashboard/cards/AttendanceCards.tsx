'use client'

// B-ADD.3: كروت الحضور في لوحة الإدارة — حضور اليوم بالتسلسل (إدارة ← قسم ← فريق ← أسماء)، والغايبين والمتأخرين بالاسم، والاتجاهات.
import { useState } from 'react'
import { MessageCircle, Phone } from 'lucide-react'
import {
  fetchAbsentLateCard, fetchAttendanceCard, fetchAttendanceEmployees, fetchTrendsCard, telLink, whatsappLink,
  type AttendanceBucket, type AttendanceEmployees, type AttendancePerson, type DashboardAccess, type DashboardFilter, type DashboardTone,
} from '@/lib/dashboard-api'
import { formatDate } from '@/lib/dates'
import { CardShell, Count, DrillPath, Empty, ListModal, Stat, TONE_BG, TONE_TEXT, num, rate, useCard, useDrill } from './shared'

interface CardProps { filter: DashboardFilter; filterKey: string; href: string; access: DashboardAccess }

const dayTitle = (filter: DashboardFilter, today: string) => (filter.date === today ? 'النهارده' : `يوم ${formatDate(filter.date)}`)

function PeopleTable({ people }: { people: AttendancePerson[] }) {
  if (!people.length) return <Empty>مفيش أسماء.</Empty>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" data-attendance-names>
        <thead>
          <tr className="table-header">
            <th className="px-3 py-2 text-start">الاسم</th>
            <th className="px-3 py-2 text-start">الفريق</th>
            <th className="px-3 py-2 text-start">الوردية</th>
            <th className="px-3 py-2 text-start">أول بصمة</th>
            <th className="px-3 py-2 text-start">الحالة</th>
          </tr>
        </thead>
        <tbody>
          {people.map((person) => (
            <tr key={person.id} className="table-row">
              <td className="px-3 py-2">
                <span className="font-medium text-gray-800">{person.name}</span>
                {person.jobTitle && <span className="block text-xs text-gray-400">{person.jobTitle}</span>}
              </td>
              <td className="px-3 py-2 text-gray-600">{person.team ?? person.unit ?? '—'}</td>
              <td className="px-3 py-2 text-gray-600">{person.shift ?? '—'}</td>
              <td className="px-3 py-2 text-gray-600" dir="ltr">{person.firstPunch ?? '—'}</td>
              <td className="px-3 py-2">
                {person.status}
                {person.detail && <span className="block text-xs text-gray-400">{person.detail}</span>}
                {person.bucket === 'late' && person.lateMinutes > 0 && <span className="block text-xs text-warning-600">{person.lateMinutes} دقيقة</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ===== كارت 1: حضور اليوم =====
export function AttendanceTodayCard({ filter, filterKey, href, access }: CardProps) {
  // تغيير الفلتر الموحد بيرجّع لأول مستوى؛ تغيير اليوم بيسيب المستوى المفتوح زي ما هو
  const drill = useDrill(JSON.stringify(filter.org))
  const { data, loading, error, reload } = useCard(() => fetchAttendanceCard(filter, drill.group), `${filterKey}|${drill.group ?? ''}`)
  const [names, setNames] = useState<{ title: string; data: AttendanceEmployees | null; error: string } | null>(null)
  const buckets = access.buckets.filter((bucket) => bucket.key !== 'other' || (data?.counts.other ?? 0) > 0)

  // الضغط على أي رقم: قايمة موظفين الخانة دي في المجموعة دي — بتتحمّل وقت الضغط بس
  const openNames = (bucket: AttendanceBucket, label: string, group: string | undefined, where: string) => {
    const title = `${label} — ${where}`
    setNames({ title, data: null, error: '' })
    fetchAttendanceEmployees(filter, bucket, group)
      .then((list) => setNames((current) => (current?.title === title ? { title, data: list, error: '' } : current)))
      .catch((err) => setNames((current) => (current?.title === title ? { title, data: null, error: err instanceof Error ? err.message : 'تعذر تحميل الأسماء' } : current)))
  }
  const here = drill.path.length ? drill.path[drill.path.length - 1].name : data?.group?.name ?? 'كل النطاق'

  return (
    <CardShell cardKey="attendance" wide title={`حضور ${dayTitle(filter, access.today)}`} href={href} loading={loading} error={error} onRetry={reload}
      subtitle={data ? `${num(data.total)} موظف — اضغط على أي رقم تشوف الأسماء` : undefined}>
      {data ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-5">
            {buckets.map((bucket) => (
              <Stat key={bucket.key} label={bucket.label} value={num(data.counts[bucket.key])} tone={bucket.tone}
                hint={bucket.key === 'pending' ? 'قبل ميعاد الوردية' : undefined}
                onClick={data.counts[bucket.key] ? () => openNames(bucket.key, bucket.label, drill.group, here) : undefined} />
            ))}
          </div>
          <DrillPath path={drill.path} start={data.group} onBack={drill.back} />
          {data.rows.length === 0 ? (
            <Empty>{data.total ? 'ده آخر مستوى — اضغط على رقم فوق تشوف الأسماء.' : 'مفيش موظفين في الاختيار ده.'}</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-attendance-levels>
                <thead>
                  <tr className="table-header">
                    <th className="px-3 py-2 text-start">الإدارة / القسم / الفريق</th>
                    <th className="px-3 py-2 text-center">العدد</th>
                    {buckets.map((bucket) => <th key={bucket.key} className="px-2 py-2 text-center whitespace-nowrap">{bucket.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={row.group} className="table-row">
                      <td className="px-3 py-2">
                        {row.expandable ? (
                          <button type="button" onClick={() => drill.open({ group: row.group, name: row.name })} className="font-medium text-primary-600 hover:underline text-start">
                            {row.name}
                          </button>
                        ) : (
                          <span className="font-medium text-gray-800">{row.name}</span>
                        )}
                        {(row.level || row.branchName) && <span className="block text-xs text-gray-400">{[row.level, row.branchName].filter(Boolean).join(' — ')}</span>}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-700">{num(row.total)}</td>
                      {buckets.map((bucket) => (
                        <td key={bucket.key} className="px-2 py-2 text-center">
                          <Count value={row.counts[bucket.key]} tone={bucket.tone} label={`${bucket.label} في ${row.name}`}
                            onClick={() => openNames(bucket.key, bucket.label, row.group, row.name)} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
      {names && (
        <ListModal title={names.title} onClose={() => setNames(null)}
          subtitle={names.data ? `${num(names.data.total)} موظف${names.data.truncated ? ' — معروض أول 500' : ''}` : undefined}>
          {names.error ? <p role="alert" className="text-sm text-red-700">{names.error}</p>
            : names.data ? <PeopleTable people={names.data.employees} />
              : <p className="text-sm text-gray-500">جارٍ التحميل...</p>}
        </ListModal>
      )}
    </CardShell>
  )
}

// ===== كارت 2: الغايبين والمتأخرين =====
function ContactButtons({ person }: { person: AttendancePerson }) {
  const tel = telLink(person.phone), whatsapp = whatsappLink(person.phone)
  if (!tel) return <span className="text-xs text-gray-400">مفيش رقم في الملف</span>
  // اللينك بيتبني هنا من رقم الملف: الخادم مابيتصلش ومابيبعتش حاجة
  return (
    <span className="flex items-center gap-1.5 shrink-0">
      <a href={tel} className="inline-flex items-center gap-1 text-xs rounded-lg px-2 py-1 bg-primary-50 text-primary-600 hover:bg-primary-100" data-contact="call">
        <Phone size={12} />
        اتصل
      </a>
      <a href={whatsapp ?? `sms:${tel.slice(4)}`} target={whatsapp ? '_blank' : undefined} rel={whatsapp ? 'noopener noreferrer' : undefined}
        className="inline-flex items-center gap-1 text-xs rounded-lg px-2 py-1 bg-success-50 text-success-600 hover:bg-success-100" data-contact="message">
        <MessageCircle size={12} />
        راسل
      </a>
    </span>
  )
}

export function AbsentLateCard({ filter, filterKey, href, access }: CardProps) {
  const { data, loading, error, reload } = useCard(() => fetchAbsentLateCard(filter), filterKey)
  const person = (row: AttendancePerson, tone: DashboardTone, note: string) => (
    <li key={`${tone}-${row.id}`} className="flex flex-wrap items-center justify-between gap-2 py-2">
      <span className="min-w-0">
        <span className="font-medium text-sm text-gray-800">{row.name}</span>
        <span className={`ms-2 text-xs rounded-full px-2 py-0.5 ${TONE_BG[tone]} ${TONE_TEXT[tone]}`}>{note}</span>
        <span className="block text-xs text-gray-400">{[row.shift, row.firstPunch ? `أول بصمة ${row.firstPunch}` : null].filter(Boolean).join(' — ') || '—'}</span>
      </span>
      {data?.contact && <ContactButtons person={row} />}
    </li>
  )
  return (
    <CardShell cardKey="absentLate" title={`الغايبين والمتأخرين ${dayTitle(filter, access.today)}`} href={href} loading={loading} error={error} onRetry={reload}
      subtitle="بالاسم، متجمّعين بالفريق">
      {data ? (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Stat label="غايب" value={num(data.absent)} tone={data.absent ? 'red' : 'green'} />
            <Stat label="متأخر" value={num(data.late)} tone={data.late ? 'yellow' : 'green'} />
          </div>
          {data.teams.length === 0 ? <Empty>مفيش غياب ولا تأخير.</Empty> : (
            <div className="space-y-3 max-h-96 overflow-y-auto pe-1">
              {data.teams.map((team) => (
                <div key={`${team.unit ?? ''}|${team.name}`} className="rounded-xl border border-gray-100 p-3" data-absent-team>
                  <p className="text-sm font-bold text-gray-700">
                    {team.name}
                    {team.unit && <span className="font-normal text-xs text-gray-400"> — {team.unit}</span>}
                    <span className="font-normal text-xs text-gray-400"> ({num(team.absent.length + team.late.length)})</span>
                  </p>
                  <ul className="divide-y divide-gray-100">
                    {team.absent.map((row) => person(row, 'red', 'غايب'))}
                    {team.late.map((row) => person(row, 'yellow', row.lateMinutes ? `متأخر ${row.lateMinutes} د` : 'متأخر'))}
                  </ul>
                </div>
              ))}
              {data.truncated && <p className="text-xs text-gray-400">معروض أول 500 اسم — الباقي في شاشة الحضور.</p>}
            </div>
          )}
        </>
      ) : null}
    </CardShell>
  )
}

// ===== كارت 9: الاتجاهات =====
const SERIES: Array<{ key: 'attendance' | 'late' | 'absence'; label: string; tone: DashboardTone; stroke: string }> = [
  { key: 'attendance', label: 'الحضور', tone: 'green', stroke: '#16a34a' },
  { key: 'late', label: 'التأخير', tone: 'yellow', stroke: '#d97706' },
  { key: 'absence', label: 'الغياب', tone: 'red', stroke: '#dc2626' },
]

export function TrendsCard({ filter, filterKey, href }: CardProps) {
  // تغيير الفلتر الموحد بيرجّع لأول مستوى؛ تغيير اليوم بيسيب المستوى المفتوح زي ما هو
  const drill = useDrill(JSON.stringify(filter.org))
  const { data, loading, error, reload } = useCard(() => fetchTrendsCard(filter, drill.group), `${filterKey}|${drill.group ?? ''}`)
  const width = 600, height = 160, pad = 6
  const points = (key: 'attendance' | 'late' | 'absence') => {
    const days = data?.days ?? []
    const step = days.length > 1 ? (width - pad * 2) / (days.length - 1) : 0
    // اليوم اللي مافيهوش أيام عمل مطلوبة (عطلة) مالوش نقطة — الخط بيتقطع عنده
    const segments: string[][] = [[]]
    days.forEach((day, index) => {
      const value = day[key]
      if (value === null) { if (segments[segments.length - 1].length) segments.push([]); return }
      segments[segments.length - 1].push(`${(pad + index * step).toFixed(1)},${(height - pad - (value / 100) * (height - pad * 2)).toFixed(1)}`)
    })
    return segments.filter((segment) => segment.length > 0)
  }
  return (
    <CardShell cardKey="trends" wide title="اتجاهات الحضور — آخر 30 يوم" href={href} loading={loading} error={error} onRetry={reload}
      subtitle={data ? <>من <span dir="ltr">{data.from}</span> إلى <span dir="ltr">{data.to}</span> — النسبة من أيام العمل المطلوبة</> : undefined}>
      {data ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {SERIES.map((series) => <Stat key={series.key} label={`نسبة ${series.label}`} value={rate(data.summary[series.key])} tone={series.tone} />)}
          </div>
          <DrillPath path={drill.path} start={data.group} onBack={drill.back} />
          {data.summary.required === 0 ? <Empty>مفيش أيام حضور محسوبة في الفترة دي.</Empty> : (
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40" role="img" aria-label="نسبة الحضور والتأخير والغياب يوم بيوم" preserveAspectRatio="none" data-trend-chart>
              {[0, 50, 100].map((level) => {
                const y = height - pad - (level / 100) * (height - pad * 2)
                return <line key={level} x1={pad} x2={width - pad} y1={y} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 4" />
              })}
              {SERIES.map((series) => points(series.key).map((segment, index) => (
                segment.length === 1
                  ? <circle key={`${series.key}-${index}`} cx={segment[0].split(',')[0]} cy={segment[0].split(',')[1]} r="2.5" fill={series.stroke} />
                  : <polyline key={`${series.key}-${index}`} points={segment.join(' ')} fill="none" stroke={series.stroke} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              )))}
            </svg>
          )}
          {data.units.length > 0 && (
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm" data-trend-units>
                <thead>
                  <tr className="table-header">
                    <th className="px-3 py-2 text-start">الإدارة / القسم</th>
                    {SERIES.map((series) => <th key={series.key} className="px-3 py-2 text-center">{series.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {data.units.map((unit) => (
                    <tr key={unit.group} className="table-row">
                      <td className="px-3 py-2">
                        {unit.expandable
                          ? <button type="button" onClick={() => drill.open({ group: unit.group, name: unit.name })} className="font-medium text-primary-600 hover:underline text-start">{unit.name}</button>
                          : <span className="font-medium text-gray-800">{unit.name}</span>}
                        {unit.level && <span className="block text-xs text-gray-400">{unit.level}</span>}
                      </td>
                      <td className="px-3 py-2 text-center text-success-600">{rate(unit.attendance)}</td>
                      <td className="px-3 py-2 text-center text-warning-600">{rate(unit.late)}</td>
                      <td className={`px-3 py-2 text-center font-semibold ${TONE_TEXT[unit.tone]}`}>{rate(unit.absence)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </CardShell>
  )
}
