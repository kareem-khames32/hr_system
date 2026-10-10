'use client'

// B-ADD.3: لوحة الإدارة — فلتر واحد للوحة كلها (الفلتر الموحد: فرع، إدارة، قسم، فريق + اليوم، والنهارده افتراضي)، وتحته الكروت.
// الكروت اللي بتترسم هي اللي الخادم قال إن الحساب يشوفها (كل كارت بصلاحيته وموديوله)، وكل كارت بيتحمّل لوحده. الأرقام كلها من
// الخادم جوه نطاق فروع الحساب: مدير HR فرع جدة يشوف جدة بس. لوحة الموظف العادي («لوحتي») مكوّن تاني (EmployeeHome).
import { useEffect, useMemo, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { useOrgFilter } from '@/components/OrgFilter'
import { fetchDashboardAccess, type DashboardAccess, type DashboardCardKey, type DashboardFilter } from '@/lib/dashboard-api'
import { AbsentLateCard, AttendanceTodayCard, TrendsCard } from './cards/AttendanceCards'
import { LeavesCard, WorkforceCard } from './cards/PeopleCards'
import { OvertimeCard, PayrollCard, RequestsCard, TasksCard } from './cards/WorkCards'

interface CardProps { filter: DashboardFilter; filterKey: string; href: string; access: DashboardAccess }

// ترتيب العرض: الحضور وتفاصيله، ثم الإجازات والقوى العاملة، ثم الشغل (طلبات، مهام، إضافي، رواتب)، ثم الاتجاهات
const CARD_COMPONENTS: Array<[DashboardCardKey, (props: CardProps) => JSX.Element]> = [
  ['attendance', AttendanceTodayCard],
  ['absentLate', AbsentLateCard],
  ['leaves', LeavesCard],
  ['workforce', WorkforceCard],
  ['requests', RequestsCard],
  ['tasks', TasksCard],
  ['overtime', OvertimeCard],
  ['payroll', PayrollCard],
  ['trends', TrendsCard],
]

export default function AdminDashboard() {
  const org = useOrgFilter()
  const [access, setAccess] = useState<DashboardAccess | null>(null)
  const [error, setError] = useState('')
  // اليوم المختار: يوم الشركة من الخادم (مش ساعة المتصفح) أول ما الكروت المتاحة تتعرف
  const [date, setDate] = useState('')

  useEffect(() => {
    let cancelled = false
    fetchDashboardAccess()
      .then((value) => { if (!cancelled) { setAccess(value); setDate(value.today) } })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'تعذر تحميل اللوحة') })
    return () => { cancelled = true }
  }, [])

  const filter = useMemo<DashboardFilter>(() => ({ org: org.params, date }), [org.paramsKey, date]) // eslint-disable-line react-hooks/exhaustive-deps
  const filterKey = `${org.paramsKey}|${date}`

  if (error) return <div className="bg-red-50 text-red-700 rounded-xl p-4" role="alert">{error}</div>
  if (!access || !date) {
    return (
      <div className="card flex items-center justify-center py-10" aria-busy="true">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  const hrefOf = new Map(access.cards.map((card) => [card.key, card.href]))

  return (
    <div className="space-y-6" data-admin-dashboard>
      {/* فلتر واحد للوحة كلها */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-wrap items-end gap-3" data-dashboard-filter>
        {org.element}
        <label className="flex items-center gap-2 min-w-0">
          <CalendarDays size={16} className="text-gray-400 shrink-0" />
          <span className="sr-only">اليوم</span>
          <input
            type="date"
            aria-label="اليوم"
            className="input min-w-0 sm:w-44"
            value={date}
            max={access.today}
            onChange={(event) => {
              // يوم فات أو النهارده بس — المستقبل مش متاح (والخادم بيرفضه)
              const next = event.target.value
              if (next && next <= access.today) setDate(next)
            }}
          />
        </label>
        {date !== access.today && (
          <button type="button" onClick={() => setDate(access.today)} className="text-xs text-primary-600 hover:underline px-1 py-2">
            ارجع للنهارده
          </button>
        )}
        {org.label && <p className="basis-full text-xs text-gray-500">الأرقام على: {org.label}</p>}
      </div>

      {access.cards.length === 0 ? (
        <div className="card text-sm text-gray-600">
          حسابك معاه «لوحة التحكم الإدارية» من غير صلاحية أي شاشة من شاشات كروتها (الحضور، الإجازات، الموظفين، الطلبات، المهام، الرواتب) — اطلب الصلاحية من مدير النظام.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {CARD_COMPONENTS.filter(([key]) => hrefOf.has(key)).map(([key, Card]) => (
            <Card key={key} filter={filter} filterKey={filterKey} href={hrefOf.get(key)!} access={access} />
          ))}
        </div>
      )}
    </div>
  )
}
