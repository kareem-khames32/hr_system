'use client'

// B5.2 (ج): «حصص الموظفين الشهرية» (قراءة بس — مفيش خصم من هنا) و«تذاكر السفر السنوية بالدرجة» (ميزة فرعية مقفولة افتراضيًا: تعريف استحقاق بس).
import { useCallback, useEffect, useState } from 'react'
import ModuleGate from '@/components/ModuleGate'
import { currencyLabel } from '@/lib/currency'
import { formatMoney } from '@/lib/money'
import { fetchInsuranceShares, fetchTicketEntitlements, setTicketEntitlement, type ApiInsuranceShares, type ApiTicketEntitlements } from '@/lib/benefits-api'

function SharesCard() {
  const [data, setData] = useState<ApiInsuranceShares | null>(null)
  useEffect(() => { fetchInsuranceShares().then(setData).catch(() => setData(null)) }, [])
  if (!data || data.rows.length === 0) return null
  return (
    <div className="card space-y-3" data-insurance-shares>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-800">حصص الموظفين الشهرية</h2>
        {data.totals.map((total) => (
          <span key={total.currency} className="text-sm bg-gray-50 rounded-lg px-3 py-2">
            {total.employees} موظف · <b className="font-mono">{formatMoney(total.total)}</b> {currencyLabel(total.currency)} في الشهر
          </span>
        ))}
      </div>
      <p className="text-xs text-gray-500">مجموع حصة فئات الاشتراكات السارية لكل موظف (هو ومعاليه). للعلم بس — مفيش خصم بيتعمل من الشاشة دي.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="table-header text-right">الموظف</th>
              <th className="table-header text-center">الأعضاء</th>
              <th className="table-header text-center">الحصة الشهرية</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.employeeId} className="border-t border-gray-100">
                <td className="table-cell">{row.fullName}{row.employeeCode ? <span className="text-xs text-gray-500" dir="ltr"> · {row.employeeCode}</span> : null}</td>
                <td className="table-cell text-center font-mono">{row.members}</td>
                <td className="table-cell text-center font-mono">{row.total > 0 ? <>{formatMoney(row.total)} <span className="text-xs text-gray-500 font-sans">{currencyLabel(row.currency)}</span></> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TicketsCard() {
  const [data, setData] = useState<ApiTicketEntitlements | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [edit, setEdit] = useState<{ gradeId: number; tickets: string; dependents: boolean; note: string } | null>(null)
  const load = useCallback(() => { fetchTicketEntitlements().then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل تذاكر السفر')) }, [])
  useEffect(load, [load])

  async function save() {
    if (!edit) return
    const count = /^\d{1,2}$/.test(edit.tickets.trim()) ? Number(edit.tickets.trim()) : null
    if (count === null) return setError('عدد التذاكر رقم صحيح')
    setBusy(true); setError('')
    try {
      setData(await setTicketEntitlement(edit.gradeId, { ticketsPerYear: count, includesDependents: edit.dependents, ...(edit.note.trim() ? { note: edit.note.trim() } : {}) }))
      setEdit(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر الحفظ')
    } finally {
      setBusy(false)
    }
  }

  if (!data) return error ? <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div> : null
  return (
    <div className="card space-y-3" data-ticket-entitlements>
      <h2 className="text-lg font-semibold text-gray-800">تذاكر السفر السنوية بالدرجة</h2>
      <p className="text-xs text-gray-500">استحقاق كل درجة من تذاكر السفر في السنة. تعريف وعرض بس — من غير رصيد ولا صرف.</p>
      {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
      {!data.ready && <div role="alert" className="bg-amber-50 text-amber-800 rounded-xl p-3 text-sm">جدول تذاكر السفر ناقص — طبّق ترحيل 148 الأول.</div>}
      {data.ready && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="table-header text-right">الدرجة</th>
                <th className="table-header text-center">الموظفين</th>
                <th className="table-header text-center">تذاكر في السنة</th>
                <th className="table-header text-center">للمعالين</th>
                <th className="table-header text-right">ملاحظة</th>
                <th className="table-header" />
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (edit?.gradeId === row.gradeId ? (
                <tr key={row.gradeId} className="border-t border-gray-100 bg-gray-50">
                  <td className="table-cell">{row.gradeName}</td>
                  <td className="table-cell text-center font-mono">{row.headcount}</td>
                  <td className="table-cell text-center"><input className="input w-20 text-center" dir="ltr" inputMode="numeric" value={edit.tickets} onChange={(event) => setEdit({ ...edit, tickets: event.target.value })} /></td>
                  <td className="table-cell text-center"><input type="checkbox" checked={edit.dependents} onChange={(event) => setEdit({ ...edit, dependents: event.target.checked })} aria-label="تشمل المعالين" /></td>
                  <td className="table-cell"><input className="input w-full" maxLength={300} value={edit.note} onChange={(event) => setEdit({ ...edit, note: event.target.value })} /></td>
                  <td className="table-cell text-left">
                    <span className="inline-flex gap-2">
                      <button type="button" className="btn-primary text-xs disabled:opacity-50" disabled={busy} onClick={save}>حفظ</button>
                      <button type="button" className="btn-secondary text-xs" onClick={() => setEdit(null)}>إلغاء</button>
                    </span>
                  </td>
                </tr>
              ) : (
                <tr key={row.gradeId} className="border-t border-gray-100">
                  <td className="table-cell">{row.gradeName}</td>
                  <td className="table-cell text-center font-mono">{row.headcount}</td>
                  <td className="table-cell text-center font-mono">{row.ticketsPerYear || '—'}</td>
                  <td className="table-cell text-center">{row.ticketsPerYear ? (row.includesDependents ? 'أيوه' : 'لأ') : '—'}</td>
                  <td className="table-cell text-xs text-gray-600">{row.note}</td>
                  <td className="table-cell text-left">
                    {data.canEdit && <button type="button" className="btn-secondary text-xs" onClick={() => setEdit({ gradeId: row.gradeId, tickets: String(row.ticketsPerYear), dependents: row.includesDependents, note: row.note ?? '' })}>تعديل</button>}
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
          {data.rows.length === 0 && <p className="text-gray-500 text-sm p-2">مفيش درجات وظيفية مفعّلة.</p>}
        </div>
      )}
    </div>
  )
}

export function ExtrasPanel() {
  return (
    <>
      <SharesCard />
      <ModuleGate feature="benefits.tickets"><TicketsCard /></ModuleGate>
    </>
  )
}
