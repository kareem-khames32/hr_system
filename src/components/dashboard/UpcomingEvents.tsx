'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Calendar } from 'lucide-react'
import { can, fetchCalendar, fetchEmployees, fetchDocuments } from '@/lib/api'
import { localToday } from '@/lib/dates'
import { docTypeLabel } from '@/lib/doc-types'
import { upcomingBirthdays } from '@/lib/upcoming-birthdays'

type Event = { id: string; title: string; date: string; href: string }
export default function UpcomingEvents() {
  const [events, setEvents] = useState<Event[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const today = localToday()
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setErrors([])
    const end = new Date(`${today}T12:00:00`)
    end.setDate(end.getDate() + 30)
    const endDate = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
    const monthKeys = Array.from(new Set([today.slice(0, 7), endDate.slice(0, 7)]))
    Promise.allSettled([
      Promise.all(monthKeys.map(month => fetchCalendar(month))),
      can('employees.view') ? fetchEmployees() : Promise.resolve([]),
      can('documents.manage') ? fetchDocuments({ expiringDays: 30 }) : Promise.resolve([]),
    ]).then(([calendarResult, employeeResult, documentResult]) => {
      if (cancelled) return
      const rows: Event[] = []
      const missing: string[] = []
      if (calendarResult.status === 'fulfilled') {
        for (const calendar of calendarResult.value) {
          // العطلة المخصصة («تسري على» — ترحيل 070) بوصف مين تخصه
          for (const holiday of calendar.holidays) rows.push({ id: `holiday-${holiday.id}`, title: holiday.targeted && holiday.audienceText ? `${holiday.name} — ${holiday.audienceText}` : holiday.name, date: holiday.date, href: '/calendar' })
          for (const leave of calendar.leaves) rows.push({ id: `leave-${leave.id}`, title: `إجازة ${leave.employeeName ?? `موظف #${leave.employeeId}`}`, date: leave.fromDate, href: '/leaves/calendar' })
        }
      } else missing.push('التقويم')
      if (employeeResult.status === 'fulfilled') {
        for (const employee of employeeResult.value) {
          if (employee.contractEnd && !['archived', 'terminated'].includes(employee.status)) rows.push({ id: `contract-${employee.id}`, title: `انتهاء عقد ${employee.fullName}`, date: employee.contractEnd.slice(0, 10), href: `/employees/${employee.id}` })
        }
        for (const birthday of upcomingBirthdays(employeeResult.value, today, endDate)) {
          rows.push({ id: `birthday-${birthday.employeeId}`, title: `عيد ميلاد ${birthday.name}${birthday.observedLeapDay ? ' (مواليد 29 فبراير؛ يُعرض في 28 فبراير هذا العام)' : ''}`, date: birthday.date, href: `/employees/${birthday.employeeId}` })
        }
      } else missing.push('العقود وأعياد الميلاد')
      if (documentResult.status === 'fulfilled') for (const document of documentResult.value) {
        if (document.expiryDate) rows.push({ id: `document-${document.id}`, title: `انتهاء ${docTypeLabel(document.docType)} — ${document.employeeName ?? `موظف #${document.employeeId}`}`, date: document.expiryDate.slice(0, 10), href: '/employees/documents' })
      } else missing.push('المستندات')
      setEvents(Array.from(new Map(rows.filter(row => row.date >= today && row.date <= endDate).map(row => [row.id, row])).values()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6))
      setErrors(missing)
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [today, revision])

  return <div className="card">
    <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold text-gray-800">خلال 30 يومًا</h3><Link href="/calendar" className="text-sm text-primary-600">عرض التقويم</Link></div>
    {errors.length > 0 && <p role="alert" className="text-xs text-amber-700 mb-3">تعذر تحميل: {errors.join('، ')}. <button onClick={() => setRevision(value => value + 1)} className="underline">إعادة المحاولة</button></p>}
    {loading ? <p className="text-sm text-gray-500">جارٍ التحميل...</p> : events.length === 0 ? <p className="text-sm text-gray-500">{errors.length ? 'لا تتوفر أحداث من المصادر المحمّلة.' : 'لا توجد أحداث قادمة في المصادر المتاحة.'}</p> : <div className="space-y-3">{events.map(event => <Link key={event.id} href={event.href} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50"><Calendar size={18} className="text-primary-600 shrink-0" /><div className="flex-1 min-w-0"><p className="font-medium text-sm text-gray-800">{event.title}</p><time className="text-xs text-gray-500" dateTime={event.date}>{event.date}</time></div><span className="text-xs text-primary-700">{event.date === today ? 'اليوم' : `${Math.round((Date.parse(`${event.date}T12:00:00`) - Date.parse(`${today}T12:00:00`)) / 86400000)} يوم`}</span></Link>)}</div>}
  </div>
}
