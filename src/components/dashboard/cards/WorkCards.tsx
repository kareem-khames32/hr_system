'use client'

// B-ADD.3: كروت الطلبات والمهام والإضافي والرواتب في لوحة الإدارة. المبلغ بيتعرض لو الخادم بعته بس (صلاحية عرض الرواتب) — مفيش
// حقل مخفي هنا: من غير الصلاحية الحقل مش موجود في الرد، وكارت الرواتب نفسه مش مرسوم.
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import {
  RUN_STATUS_LABELS, fetchOvertimeCard, fetchPayrollCard, fetchRequestsCard, fetchTasksCard,
  type CurrencyAmount, type DashboardAccess, type DashboardFilter,
} from '@/lib/dashboard-api'
import { currencyLabel } from '@/lib/currency'
import { Bar, CardShell, Empty, Stat, TONE_BG, TONE_TEXT, num, useCard } from './shared'

interface CardProps { filter: DashboardFilter; filterKey: string; href: string; access: DashboardAccess }

const money = (value: number) => Number(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const amountsText = (amounts: CurrencyAmount[] | undefined) =>
  amounts?.length ? amounts.map((item) => `${money(item.amount)} ${currencyLabel(item.currency)}`).join(' + ') : null

// ===== كارت 5: الطلبات =====
export function RequestsCard({ filter, href }: CardProps) {
  const orgKey = JSON.stringify(filter.org)
  const { data, loading, error, reload } = useCard(() => fetchRequestsCard({ org: filter.org }), orgKey)
  const maxType = Math.max(1, ...(data?.byType ?? []).map((type) => type.count))
  return (
    <CardShell cardKey="requests" title="الطلبات" href={href} loading={loading} error={error} onRetry={reload}
      subtitle={data?.pending ? `أقدم طلب معلّق من ${num(data.oldestDays)} يوم` : undefined}>
      {data ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <Stat label="معلّق" value={num(data.pending)} tone={data.pending ? 'yellow' : 'green'} />
            <Stat label="متأخر عن المهلة" value={num(data.overdue)} tone={data.overdue ? 'red' : 'green'} />
            <Stat label="معتمد ومااتنفذش" value={num(data.approvedNotExecuted)} tone={data.approvedNotExecuted ? 'yellow' : 'green'} />
          </div>
          <p className="text-sm font-bold text-gray-700 mb-2">المعلّق بالعمر</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {data.byAge.map((band) => (
              <div key={band.key} className={`rounded-xl px-3 py-2 text-center ${band.count ? TONE_BG[band.tone] : 'bg-gray-50'}`}>
                <span className={`block text-lg font-bold ${band.count ? TONE_TEXT[band.tone] : 'text-gray-300'}`}>{num(band.count)}</span>
                <span className="text-xs text-gray-600">{band.label}</span>
              </div>
            ))}
          </div>
          <p className="text-sm font-bold text-gray-700 mb-2">المعلّق بالنوع</p>
          {data.byType.length === 0 ? <Empty>مفيش طلبات معلّقة.</Empty> : (
            <ul className="space-y-2.5 max-h-56 overflow-y-auto pe-1">
              {data.byType.map((type) => (
                <li key={type.code}>
                  <div className="flex items-center justify-between gap-2 text-sm mb-1">
                    <span className="text-gray-700 truncate">{type.name}</span>
                    <span className="shrink-0 text-gray-800 font-semibold">
                      {num(type.count)}
                      {type.overdue > 0 && <span className="ms-2 text-xs font-normal text-danger-600">{num(type.overdue)} متأخر</span>}
                    </span>
                  </div>
                  <Bar value={type.count} max={maxType} tone={type.overdue ? 'red' : 'yellow'} />
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </CardShell>
  )
}

// ===== كارت 6: المهام =====
export function TasksCard({ filter, href }: CardProps) {
  const orgKey = JSON.stringify(filter.org)
  const { data, loading, error, reload } = useCard(() => fetchTasksCard({ org: filter.org }), orgKey)
  return (
    <CardShell cardKey="tasks" title="المهام" href={href} loading={loading} error={error} onRetry={reload} subtitle="المفتوحة والمتأخرة بالمسؤول">
      {data ? (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Stat label="مفتوحة" value={num(data.open)} tone="blue" />
            <Stat label="متأخرة" value={num(data.overdue)} tone={data.overdue ? 'red' : 'green'} />
          </div>
          {data.assignees.length === 0 ? <Empty>مفيش مهام مفتوحة.</Empty> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-task-assignees>
                <thead>
                  <tr className="table-header">
                    <th className="px-3 py-2 text-start">المسؤول</th>
                    <th className="px-3 py-2 text-center">مفتوحة</th>
                    <th className="px-3 py-2 text-center">متأخرة</th>
                  </tr>
                </thead>
                <tbody>
                  {data.assignees.map((row) => (
                    <tr key={`${row.employeeId ?? ''}|${row.role ?? ''}|${row.name}`} className="table-row">
                      <td className="px-3 py-2 text-gray-800">
                        {row.name}
                        {row.role !== null && <span className="ms-2 text-xs text-gray-400">دور</span>}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-700">{num(row.open)}</td>
                      <td className={`px-3 py-2 text-center font-semibold ${row.overdue ? 'text-danger-600' : 'text-gray-300'}`}>{num(row.overdue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(data.people ?? 0) > data.assignees.length && <p className="text-xs text-gray-400 mt-2">معروض أكتر 10 مسؤولين من {num(data.people ?? 0)}.</p>}
            </div>
          )}
        </>
      ) : null}
    </CardShell>
  )
}

// ===== كارت 7: الإضافي =====
export function OvertimeCard({ filter, href }: CardProps) {
  const orgKey = JSON.stringify(filter.org)
  const { data, loading, error, reload } = useCard(() => fetchOvertimeCard({ org: filter.org }), orgKey)
  const maxHours = Math.max(1, ...(data?.byUnit ?? []).map((unit) => unit.hours))
  const total = amountsText(data?.amounts)
  return (
    <CardShell cardKey="overtime" title="الإضافي" href={href} loading={loading} error={error} onRetry={reload}
      subtitle={data ? <>شهر الرواتب <span dir="ltr">{data.period}</span> لحد النهارده — المعتمد والمصروف</> : undefined}>
      {data ? (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Stat label="ساعات الشهر" value={num(data.hours)} tone="blue" hint={`${num(data.entries)} سجل`} />
            <Stat label="مستني تأكيد" value={num(data.pendingEntries)} tone={data.pendingEntries ? 'yellow' : 'green'} hint="سجل" />
          </div>
          {/* المبلغ: الخادم بيبعته لصاحب صلاحية الرواتب بس */}
          {data.amounts && (
            <p className="text-sm text-gray-700 mb-4" data-overtime-amount>
              قيمة المعتمد: <b className="text-gray-900">{total ?? '—'}</b>
            </p>
          )}
          <p className="text-sm font-bold text-gray-700 mb-2">بالقسم</p>
          {data.byUnit.length === 0 ? <Empty>مفيش إضافي معتمد في الشهر ده.</Empty> : (
            <ul className="space-y-2.5 max-h-56 overflow-y-auto pe-1">
              {data.byUnit.map((unit) => (
                <li key={unit.id ?? 'none'}>
                  <div className="flex items-center justify-between gap-2 text-sm mb-1">
                    <span className="text-gray-700 truncate">{unit.name}</span>
                    <span className="text-gray-500 shrink-0">
                      <b className="text-gray-800">{num(unit.hours)}</b> ساعة
                      {amountsText(unit.amounts) && <span className="ms-2">{amountsText(unit.amounts)}</span>}
                    </span>
                  </div>
                  <Bar value={unit.hours} max={maxHours} tone="blue" />
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </CardShell>
  )
}

// ===== كارت 8: الرواتب (لصاحب صلاحية الرواتب بس — الكارت مش مرسوم لغيره) =====
export function PayrollCard({ filter, href }: CardProps) {
  const orgKey = JSON.stringify(filter.org)
  const { data, loading, error, reload } = useCard(() => fetchPayrollCard({ org: filter.org }), orgKey)
  return (
    <CardShell cardKey="payroll" title="الرواتب" href={href} loading={loading} error={error} onRetry={reload}
      subtitle={data ? <>شهر الرواتب <span dir="ltr">{data.period}</span></> : undefined}>
      {data ? (
        <>
          <p className="text-sm font-bold text-gray-700 mb-2">مسير الفترة</p>
          {data.runs.length === 0 ? <Empty>لسه مفيش مسير للفترة دي.</Empty> : (
            <ul className="divide-y divide-gray-100 mb-4" data-payroll-runs>
              {data.runs.map((run) => {
                const status = RUN_STATUS_LABELS[run.status] ?? { label: run.status, tone: 'gray' as const }
                return (
                  <li key={run.id} className="py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <Link href={`/payroll?run=${run.id}`} className="text-primary-600 hover:underline truncate">{run.name ?? `مسير #${run.id}`}</Link>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className={`badge ${TONE_BG[status.tone]} ${TONE_TEXT[status.tone]}`}>{status.label}</span>
                      <span className="text-gray-700" dir="ltr">{money(run.totalNet)}</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
          <p className="text-sm font-bold text-gray-700 mb-2">المستحق لحد امبارح <span className="font-normal text-xs text-gray-400" dir="ltr">({data.upTo})</span></p>
          {!data.accrued.available ? <Empty>المستحق التقديري لسه مش متاح.</Empty> : data.accrued.byCurrency.length === 0 ? <Empty>مفيش مستحق محسوب لسه.</Empty> : (
            <ul className="space-y-2 mb-2" data-payroll-accrued>
              {data.accrued.byCurrency.map((group) => (
                <li key={group.currency} className="rounded-xl bg-primary-50 px-3 py-2.5">
                  <span className="block text-xl font-bold text-primary-600">{money(group.estimatedNet)} <span className="text-sm font-medium">{currencyLabel(group.currency)}</span></span>
                  <span className="text-xs text-gray-600">
                    {num(group.employees)} موظف — مستحق {money(group.earned)} + إضافي {money(group.overtime)} − خصومات حضور {money(group.deductions)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-gray-400 mb-4">{data.note}</p>
          <p className="text-sm font-bold text-gray-700 mb-2">تنبيهات قبل الاعتماد</p>
          {data.alerts.length === 0 ? <p className="text-sm text-success-600">مفيش تنبيهات.</p> : (
            <ul className="space-y-1.5" data-payroll-alerts>
              {data.alerts.map((alert) => (
                <li key={alert.text} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${TONE_BG[alert.tone]} ${TONE_TEXT[alert.tone]}`}>
                  <AlertTriangle size={14} className="shrink-0" />
                  <b>{num(alert.count)}</b>
                  <span className="text-gray-700">{alert.text}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </CardShell>
  )
}
