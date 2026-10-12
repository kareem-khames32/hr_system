'use client'

// B-ADD.20: لوحة الأسماء الجانبية — لما رقم في اللوحة محتاج أسماء بتتفتح على الجنب بكروت أشخاص صغيرة (الاسم، المسمى، حالته)، مش
// جدول. أقصاها 50 كارت ومعاها لينك للشاشة اللي فيها الباقي. الأسماء هي اللي الخادم بيرجّعها للحساب ده أصلًا (بصلاحية كارتها ونطاق
// فروعه)، ورقم التليفون بيتعرض لو الخادم بعته بس (صلاحية عرض الموظفين).
import { useEffect, type ReactNode } from 'react'
import { ChevronLeft, MessageCircle, Phone, RefreshCw, X } from 'lucide-react'
import ModuleLink from '@/components/ModuleLink'
import {
  fetchAbsentLateCard, fetchAttendanceEmployees, telLink, whatsappLink, type AttendanceBucket, type AttendancePerson, type DashboardFilter, type DashboardTone,
} from '@/lib/dashboard-api'
import { PEOPLE_PANEL_LIMIT } from '@/lib/dashboard-insights'
import { BUCKET_TONE, TONE_FILL, type ChartTone } from './charts'
import { num, useCard } from './shared'

export interface PanelPerson {
  id: number | string
  name: string
  /** المسمى الوظيفي أو المكان */
  line?: string | null
  /** حالته: نقطة لون + نص */
  state?: { label: string; tone: ChartTone } | null
  /** سطر تفصيل (الوردية، أول بصمة، التاريخ…) */
  note?: string | null
  /** موجود بس لو الخادم بعته */
  phone?: string | null
}

const BADGE: Record<DashboardTone, string> = {
  green: 'bg-success-50 text-success-600', yellow: 'bg-warning-50 text-warning-600', red: 'bg-danger-50 text-danger-600', blue: 'bg-primary-50 text-primary-600', gray: 'bg-gray-100 text-gray-600',
}
// الخانات اللي لونها من ألوان الرسم الزيادة بتاخد شارة رمادي أو أزرق — النقطة هي اللي شايلة لون الحالة بالظبط
const badgeTone = (tone: ChartTone): DashboardTone => (tone === 'cyan' ? 'blue' : tone === 'light' || tone === 'slate' ? 'gray' : tone)

function PersonCard({ person }: { person: PanelPerson }) {
  // رقم دولي = واتساب، ورقم محلي = رسالة نصية (نفس قاعدة B-ADD.3) — اللينك بيتبني في المتصفح، الخادم مابيبعتش حاجة
  const tel = telLink(person.phone), whatsapp = whatsappLink(person.phone)
  const message = tel ? whatsapp ?? `sms:${tel.slice(4)}` : null
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-3 min-w-0" data-person-card>
      <span className="w-9 h-9 rounded-full bg-primary-50 text-primary-600 font-bold flex items-center justify-center shrink-0" aria-hidden="true">{person.name.trim().charAt(0)}</span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm text-gray-800 truncate">{person.name}</p>
        {person.line && <p className="text-xs text-gray-500 truncate">{person.line}</p>}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
          {person.state && (
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${BADGE[badgeTone(person.state.tone)]}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${TONE_FILL[person.state.tone]}`} aria-hidden="true" />
              {person.state.label}
            </span>
          )}
          {person.note && <span className="text-[11px] text-gray-500">{person.note}</span>}
        </div>
      </div>
      {tel && message && (
        <div className="flex items-center gap-1 shrink-0" data-contact>
          <a href={tel} aria-label={`اتصل بـ${person.name}`} title="اتصل" className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50"><Phone size={15} /></a>
          <a href={message} target={whatsapp ? '_blank' : undefined} rel={whatsapp ? 'noopener noreferrer' : undefined} aria-label={`راسل ${person.name}`} title={whatsapp ? 'واتساب' : 'رسالة نصية'}
            className="p-1.5 rounded-lg text-success-600 hover:bg-success-50"><MessageCircle size={15} /></a>
        </div>
      )}
    </div>
  )
}

/** هيكل اللوحة الجانبية: بتتفتح من ناحية نهاية الصفحة، وعلى الموبايل بعرض الشاشة كله، وبتمرير داخلي */
export function PeoplePanel({ title, subtitle, people, total, loading = false, error = '', onRetry, href, hrefLabel, onClose }: {
  title: string
  subtitle?: ReactNode
  people: PanelPerson[]
  /** العدد الكلي (الظاهر ممكن يبقى أقل) */
  total: number
  loading?: boolean
  error?: string
  onRetry?: () => void
  /** الشاشة التفصيلية اللي فيها الكل */
  href?: string
  hrefLabel?: string
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const shown = people.slice(0, PEOPLE_PANEL_LIMIT)
  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} data-people-panel>
      <aside className="absolute inset-y-0 end-0 w-full sm:max-w-md bg-gray-50 shadow-xl flex flex-col" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 p-4 bg-white border-b border-gray-100">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-800">{title}</h2>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 shrink-0"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {error ? (
            <p role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">
              {error}{' '}
              {onRetry && <button type="button" onClick={onRetry} className="underline inline-flex items-center gap-1"><RefreshCw size={12} />إعادة المحاولة</button>}
            </p>
          ) : loading ? (
            <div className="grid grid-cols-1 gap-2" aria-busy="true">
              {[0, 1, 2, 3].map((index) => <div key={index} className="h-16 rounded-xl bg-gray-200/70 animate-pulse" />)}
            </div>
          ) : shown.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">مفيش أسماء هنا.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {shown.map((person) => <PersonCard key={person.id} person={person} />)}
            </div>
          )}
        </div>
        {!loading && !error && (
          <div className="p-4 bg-white border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-gray-500" data-panel-count>{total > shown.length ? `ظاهر ${num(shown.length)} من ${num(total)}` : `${num(total)} اسم`}</span>
            {href && (
              <ModuleLink href={href} fallback={null} className="inline-flex items-center gap-1 text-primary-600 hover:underline">
                {hrefLabel ?? 'افتح الشاشة التفصيلية'}
                <ChevronLeft size={14} />
              </ModuleLink>
            )}
          </div>
        )}
      </aside>
    </div>
  )
}

const personOf = (row: AttendancePerson, label: string): PanelPerson => ({
  id: row.id, name: row.name, line: row.jobTitle ?? ([row.unit, row.team].filter(Boolean).join(' · ') || null),
  state: { label: row.bucket === 'late' && row.lateMinutes ? `متأخر ${row.lateMinutes} د` : row.detail ?? label, tone: BUCKET_TONE[row.bucket] },
  note: [row.jobTitle ? [row.unit, row.team].filter(Boolean).join(' · ') : '', row.firstPunch ? `أول بصمة ${row.firstPunch}` : '', row.shift ?? ''].filter(Boolean).join(' — ') || null,
  phone: row.phone,
})

/**
 * أصحاب خانة حضور (الضغط على «غايب» في فريق مثلًا): أول 50 اسم من مسار أسماء كارت الحضور. الغايبين والمتأخرين على مستوى الفلتر كله
 * بييجوا من كارت «الغايبين والمتأخرين» عشان معاه رقم التليفون لصاحب صلاحيته.
 */
export function BucketPanel({ filter, bucket, label, group, place, contactCard, href, onClose }: {
  filter: DashboardFilter
  bucket: AttendanceBucket
  /** اسم الخانة (حاضر، غايب…) */
  label: string
  group?: string
  /** اسم المكان المفتوح (فرع، إدارة، فريق) */
  place?: string
  /** الحساب يشوف كارت «الغايبين والمتأخرين»؟ (فيه التليفون لصاحب صلاحيته) */
  contactCard: boolean
  href?: string
  onClose: () => void
}) {
  const withPhones = contactCard && !group && (bucket === 'absent' || bucket === 'late')
  const list = useCard(async () => {
    if (withPhones) {
      const card = await fetchAbsentLateCard(filter)
      const rows = card.teams.flatMap((team) => team[bucket as 'absent' | 'late'])
      return { total: bucket === 'absent' ? card.absent : card.late, people: rows.slice(0, PEOPLE_PANEL_LIMIT).map((row) => personOf(row, label)) }
    }
    const body = await fetchAttendanceEmployees(filter, bucket, group, PEOPLE_PANEL_LIMIT)
    return { total: body.total, people: body.employees.map((row) => personOf(row, label)) }
  }, `${JSON.stringify(filter)}|${bucket}|${group ?? ''}`)
  return (
    <PeoplePanel title={place ? `${label} — ${place}` : label} subtitle={<span dir="ltr">{filter.date}</span>} people={list.data?.people ?? []} total={list.data?.total ?? 0}
      loading={list.loading} error={list.error} onRetry={list.reload} href={href} hrefLabel="الكل في شاشة الحضور" onClose={onClose} />
  )
}
