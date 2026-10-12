'use client'

// B-ADD.20 (طلب المالك 12 أكتوبر 2026): لوحة الإدارة إحصائيات بس — مفيش جداول ولا «عرض الجداول التفصيلية»؛ كل قسم بيودّي لشاشته
// التفصيلية، والأسماء بتتفتح كروت أشخاص في لوحة جانبية (StatsDashboard). فلتر واحد فوق بيحرّك اللوحة كلها: المكان، واليوم، والفترة.
// B-ADD.3: الفلتر الموحد (فرع، إدارة، قسم، فريق) + اليوم (النهارده افتراضي). الأقسام اللي بتترسم هي اللي الخادم قال إن الحساب يشوف
// كروتها (كل كارت بصلاحيته وموديوله)، وكل رقم من الخادم جوه نطاق فروع الحساب: مدير HR فرع جدة يشوف جدة بس.
// لوحة الموظف العادي («لوحتي») مكوّن تاني (EmployeeHome).
import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, CalendarRange } from 'lucide-react'
import { useOrgFilter } from '@/components/OrgFilter'
import { TREND_WINDOWS, fetchDashboardAccess, type DashboardAccess, type DashboardFilter, type TrendWindow } from '@/lib/dashboard-api'
import StatsDashboard from './StatsDashboard'

export default function AdminDashboard() {
  const org = useOrgFilter()
  const [access, setAccess] = useState<DashboardAccess | null>(null)
  const [error, setError] = useState('')
  // اليوم المختار: يوم الشركة من الخادم (مش ساعة المتصفح) أول ما الأقسام المتاحة تتعرف
  const [date, setDate] = useState('')
  // الفترة: نافذة الاتجاه والمقارنة (7 أو 30 أو 90 يوم لحد اليوم المختار) — 30 افتراضي زي الأول
  const [period, setPeriod] = useState<TrendWindow>(30)

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
      <div className="space-y-4" aria-busy="true" data-dashboard-loading>
        <div className="h-16 rounded-2xl bg-gray-100 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((index) => <div key={index} className="h-28 rounded-2xl bg-gray-100 animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6" data-admin-dashboard>
      {/* فلتر واحد للوحة كلها: المكان + اليوم + الفترة */}
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
        <label className="flex items-center gap-2 min-w-0">
          <CalendarRange size={16} className="text-gray-400 shrink-0" />
          <span className="sr-only">الفترة</span>
          <select aria-label="الفترة" className="input min-w-0 sm:w-40" value={period} onChange={(event) => setPeriod(Number(event.target.value) as TrendWindow)} data-dashboard-period>
            {TREND_WINDOWS.map((days) => <option key={days} value={days}>{days === 7 ? 'آخر 7 أيام' : `آخر ${days} يوم`}</option>)}
          </select>
        </label>
        {date !== access.today && (
          <button type="button" onClick={() => setDate(access.today)} className="text-xs text-primary-600 hover:underline px-1 py-2">
            ارجع للنهارده
          </button>
        )}
        <p className="basis-full text-xs text-gray-500">
          {org.label ? `الأرقام على: ${org.label} — ` : ''}الفترة بتحرّك الاتجاهات والمقارنة بالفترة اللي قبلها؛ الإضافي والرواتب بشهر الرواتب الجاري، والقوى العاملة بآخر 12 شهر.
        </p>
      </div>

      {access.cards.length === 0 ? (
        <div className="card text-sm text-gray-600">
          حسابك معاه «لوحة التحكم الإدارية» من غير صلاحية أي شاشة من شاشات أقسامها (الحضور، الإجازات، الموظفين، الطلبات، المهام، الرواتب) — اطلب الصلاحية من مدير النظام.
        </div>
      ) : (
        <StatsDashboard filter={filter} filterKey={filterKey} period={period} access={access} />
      )}
    </div>
  )
}
