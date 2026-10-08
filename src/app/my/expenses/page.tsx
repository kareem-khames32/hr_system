'use client'

// B5.3 (أ): «مصروفاتي» — الموظف بيعمل تقرير مصروفات ببنوده وإيصالاته، وبيقدّمه طلب في سلسلة الاعتماد. الصرف قيد واحد في الدفتر عند
// الاعتماد النهائي. البنود بتتعدّل في المسودة والراجع والمرفوض بس. ميزة expenses.reports (مقفولة افتراضيًا).
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Receipt } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { createRequest, fetchFileObjectUrl, resubmitRequest, uploadFile } from '@/lib/api'
import { currencyLabel } from '@/lib/currency'
import { formatMoney } from '@/lib/money'
import {
  addExpenseLine, addPerDiemLine, attachTravelAdvance, createExpenseReport, fetchMyExpenses, removeExpenseLine, removeExpenseReport, type ApiExpenseReport, type ApiMyExpenses,
} from '@/lib/expenses-api'

const PHASE_STYLE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700', PENDING: 'bg-blue-50 text-blue-700', RETURNED: 'bg-amber-50 text-amber-800', REJECTED: 'bg-red-50 text-red-700', APPROVED: 'bg-green-50 text-green-700',
}
const amountOf = (text: string): number | null => (/^\d{1,7}(\.\d{1,2})?$/.test(text.trim()) && Number(text) > 0 ? Number(text.trim()) : null)
const today = () => new Date().toLocaleDateString('en-CA')
const emptyLine = () => ({ categoryId: '', expenseDate: today(), amount: '', note: '', file: null as File | null })

export default function MyExpensesPage() {
  const [data, setData] = useState<ApiMyExpenses | null>(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState({ title: '', tripFrom: '', tripTo: '' })
  const [lines, setLines] = useState<Record<number, ReturnType<typeof emptyLine>>>({})
  const [advance, setAdvance] = useState({ amount: '', reason: '' })
  const [daily, setDaily] = useState<Record<number, { destination: string; days: string; expenseDate: string }>>({})

  const load = useCallback(() => {
    fetchMyExpenses().then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل تقارير المصروفات'))
  }, [])
  useEffect(load, [load])

  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true); setError(''); setInfo('')
    try { await action(); setInfo(done); load() } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر التنفيذ') } finally { setBusy(false) }
  }

  const create = () => run(async () => {
    await createExpenseReport({ title: draft.title.trim(), tripFrom: draft.tripFrom || null, tripTo: draft.tripTo || null })
    setDraft({ title: '', tripFrom: '', tripTo: '' })
  }, 'اتعمل التقرير — ضيف بنوده')

  const addLine = (report: ApiExpenseReport) => {
    const line = lines[report.id] ?? emptyLine()
    const amount = amountOf(line.amount)
    if (!line.categoryId || amount === null || !line.expenseDate) return setError('اختار الفئة واكتب تاريخ ومبلغ صحيح (بمنزلتين بالكتير)')
    return run(async () => {
      // الإيصال بيترفع بنوع «طلب»: الاطلاع عليه بيتبع الطلب اللي التقرير هيتقدّم بيه
      const receipt = line.file ? await uploadFile(line.file, { entityType: 'request' }) : null
      const saved = await addExpenseLine(report.id, { categoryId: Number(line.categoryId), expenseDate: line.expenseDate, amount, note: line.note.trim(), receiptFileId: receipt?.id ?? null })
      setLines((current) => ({ ...current, [report.id]: emptyLine() }))
      if (saved.warning) setInfo(`اتحفظ البند — ${saved.warning}`)
    }, 'اتحفظ البند')
  }

  // (ج) بند بدل يومي: الوجهة وعدد الأيام بس — المبلغ بيحسبه الخادم بسعر درجتك
  const addDaily = (report: ApiExpenseReport) => {
    const entry = daily[report.id] ?? { destination: '', days: '', expenseDate: today() }
    if (!entry.destination || !/^\d{1,2}$/.test(entry.days.trim()) || Number(entry.days) < 1) return setError('اختار الوجهة واكتب عدد الأيام')
    return run(async () => {
      await addPerDiemLine(report.id, { destination: entry.destination, days: Number(entry.days), expenseDate: entry.expenseDate })
      setDaily((current) => ({ ...current, [report.id]: { destination: '', days: '', expenseDate: today() } }))
    }, 'اتضاف بند البدل اليومي')
  }

  // (ب) طلب سلفة مأمورية: طلب عادي في سلسلته؛ بعد اعتماده وتسجيل صرفه بيتربط بتقرير
  const askAdvance = () => {
    const amount = amountOf(advance.amount)
    if (amount === null || advance.reason.trim().length < 2) return setError('اكتب مبلغ السلفة وغرض المأمورية')
    return run(async () => {
      await createRequest(data!.advanceTypeCode!, { amount, reason: advance.reason.trim() }, true)
      setAdvance({ amount: '', reason: '' })
    }, 'طلب السلفة اتقدّم للاعتماد')
  }

  const submit = (report: ApiExpenseReport) => run(async () => {
    if (report.phase === 'RETURNED' && report.requestId) await resubmitRequest(report.requestId)
    else await createRequest(data!.requestTypeCode!, { reportId: report.id }, true)
  }, `التقرير ${report.code} اتقدّم للاعتماد`)

  async function openReceipt(fileId: number) {
    const url = await fetchFileObjectUrl(fileId)
    if (!url) return setError('تعذر فتح الإيصال')
    window.open(url, '_blank', 'noopener')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  const currency = currencyLabel(data?.currency)
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Receipt size={24} className="text-primary-600" />
            مصروفاتي
          </h1>
          <p className="text-gray-500 mt-1">اعمل تقرير ببنود مصروفاتك وإيصالاتها وقدّمه للاعتماد. المبلغ المعتمد بيتضاف على راتبك بعد الاعتماد النهائي.</p>
        </div>

        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        {info && <div role="status" className="bg-green-50 text-green-700 rounded-xl p-4">{info}</div>}
        {data && !data.ready && <div className="card text-amber-800 bg-amber-50">جداول تقارير المصروفات لسه ماتطبّقتش على قاعدة البيانات (ترحيلات 149 لحد 154).</div>}
        {data?.ready && !data.requestTypeCode && (
          <div className="card text-amber-800 bg-amber-50">مفيش نوع طلب معرّف لتقديم تقارير المصروفات. مسؤول النظام يضيف نوع طلب وجهته «تقرير مصروفات ببنود» من إعدادات الطلبات.</div>
        )}

        {data?.ready && (
          <div className="card space-y-3" data-expense-new>
            <h2 className="text-lg font-semibold text-gray-800">تقرير جديد</h2>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex-1 min-w-56 text-sm text-gray-600">العنوان
                <input className="input w-full mt-1" maxLength={200} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="مثال: مأمورية الرياض — أكتوبر" />
              </label>
              <label className="text-sm text-gray-600">بداية المأمورية (اختياري)
                <input type="date" className="input mt-1" value={draft.tripFrom} onChange={(event) => setDraft({ ...draft, tripFrom: event.target.value })} />
              </label>
              <label className="text-sm text-gray-600">نهايتها
                <input type="date" className="input mt-1" value={draft.tripTo} onChange={(event) => setDraft({ ...draft, tripTo: event.target.value })} />
              </label>
              <button type="button" className="btn-primary disabled:opacity-50" disabled={busy || draft.title.trim().length < 2} onClick={create}>إنشاء</button>
            </div>
          </div>
        )}

        {data?.ready && (data.advanceTypeCode || data.advances.length > 0) && (
          <div className="card space-y-3" data-travel-advances>
            <h2 className="text-lg font-semibold text-gray-800">سلف المأموريات</h2>
            <p className="text-xs text-gray-500">السلفة بتتصرف نقدًا بعد اعتماد طلبها، وبتتسوّى لما تربطها بتقرير مصروفات ويتعتمد: الفرق بيتضاف على راتبك أو بيتخصم منه.</p>
            {data.advances.length > 0 && (
              <ul className="divide-y divide-gray-100 text-sm">
                {data.advances.map((row) => (
                  <li key={row.id} className="py-2 flex flex-wrap items-center gap-3">
                    <span className="font-mono text-xs text-gray-500" dir="ltr">{row.code}</span>
                    <span>{row.purpose}</span>
                    <b className="font-mono">{formatMoney(row.amount)}</b> {currency}
                    <span className="ms-auto text-xs rounded-full px-3 py-1 bg-gray-100 text-gray-700">
                      {row.status === 'OPEN' ? (row.paid ? (row.reportId ? 'مربوطة بتقرير' : 'اتصرفت — مستنية تقرير') : 'معتمدة — لسه مااتصرفتش') : row.statusLabel}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {data.advanceTypeCode && (
              <div className="flex flex-wrap items-end gap-3 bg-gray-50 rounded-xl p-3" data-travel-advance-form>
                <label className="text-sm text-gray-600">مبلغ السلفة ({currency})
                  <input className="input mt-1 w-32 text-center" dir="ltr" inputMode="decimal" value={advance.amount} onChange={(event) => setAdvance({ ...advance, amount: event.target.value })} />
                </label>
                <label className="flex-1 min-w-56 text-sm text-gray-600">غرض المأمورية
                  <input className="input w-full mt-1" maxLength={200} value={advance.reason} onChange={(event) => setAdvance({ ...advance, reason: event.target.value })} />
                </label>
                <button type="button" className="btn-secondary disabled:opacity-50" disabled={busy} onClick={askAdvance}>طلب سلفة</button>
              </div>
            )}
          </div>
        )}

        {data?.ready && data.reports.length === 0 && <div className="card text-gray-500">مفيش تقارير مصروفات لسه.</div>}

        {(data?.reports ?? []).map((report) => {
          const line = lines[report.id] ?? emptyLine()
          const change = (patch: Partial<ReturnType<typeof emptyLine>>) => setLines((current) => ({ ...current, [report.id]: { ...line, ...patch } }))
          const blocked = report.lines.find((row) => row.problem)
          const dailyEntry = daily[report.id] ?? { destination: '', days: '', expenseDate: today() }
          const changeDaily = (patch: Partial<typeof dailyEntry>) => setDaily((current) => ({ ...current, [report.id]: { ...dailyEntry, ...patch } }))
          // سلف الحساب المصروفة المفتوحة اللي مش مربوطة بتقرير تاني
          const linkable = (data?.advances ?? []).filter((row) => row.status === 'OPEN' && row.paid && (row.reportId === null || row.reportId === report.id))
          return (
            <div key={report.id} className="card space-y-3" data-expense-report={report.id}>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-800">{report.title}</h2>
                <span className="text-xs text-gray-500 font-mono" dir="ltr">{report.code}</span>
                <span className={`text-xs rounded-full px-3 py-1 ${PHASE_STYLE[report.phase]}`}>{report.phaseLabel}</span>
                {report.tripFrom && <span className="text-sm text-gray-600">المأمورية: <span dir="ltr">{report.tripFrom} → {report.tripTo}</span></span>}
                <span className="ms-auto text-sm bg-gray-50 rounded-lg px-3 py-2">الإجمالي: <b className="font-mono">{formatMoney(report.total)}</b> {currency}</span>
              </div>

              {report.lines.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="table-header text-start">الفئة</th>
                        <th className="table-header text-center">التاريخ</th>
                        <th className="table-header text-center">المبلغ</th>
                        <th className="table-header text-start">ملاحظة</th>
                        <th className="table-header text-center">الإيصال</th>
                        <th className="table-header" />
                      </tr>
                    </thead>
                    <tbody>
                      {report.lines.map((row) => (
                        <tr key={row.id} className="border-t border-gray-100">
                          <td className="table-cell">{row.categoryName}
                            {row.perDiem && <span className="block text-xs text-gray-500">{row.perDiem}</span>}
                            {row.warning && <span className="block text-xs text-amber-700">{row.warning}</span>}
                            {row.problem && <span className="block text-xs text-red-700">{row.problem}</span>}
                          </td>
                          <td className="table-cell text-center" dir="ltr">{row.expenseDate}</td>
                          <td className="table-cell text-center font-mono">{formatMoney(row.amount)}</td>
                          <td className="table-cell">{row.note ?? '—'}</td>
                          <td className="table-cell text-center">
                            {row.receiptFileId ? <button type="button" className="text-primary-600 underline" onClick={() => openReceipt(row.receiptFileId!)}>عرض</button> : <span className="text-gray-400">من غير</span>}
                          </td>
                          <td className="table-cell text-end">
                            {report.editable && <button type="button" className="text-red-600 text-xs disabled:opacity-50" disabled={busy}
                              onClick={() => run(() => removeExpenseLine(report.id, row.id), 'اتشال البند')}>حذف</button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {report.editable && (
                <div className="flex flex-wrap items-end gap-3 bg-gray-50 rounded-xl p-3" data-expense-line-form>
                  <label className="text-sm text-gray-600">الفئة
                    <select className="input mt-1" value={line.categoryId} onChange={(event) => change({ categoryId: event.target.value })}>
                      <option value="">اختار</option>
                      {data!.categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}{category.limitPerLine !== null ? ` (حد ${formatMoney(category.limitPerLine)})` : ''}{category.receiptRequired ? ' · بإيصال' : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm text-gray-600">التاريخ
                    <input type="date" className="input mt-1" max={today()} value={line.expenseDate} onChange={(event) => change({ expenseDate: event.target.value })} />
                  </label>
                  <label className="text-sm text-gray-600">المبلغ ({currency})
                    <input className="input mt-1 w-28 text-center" dir="ltr" inputMode="decimal" value={line.amount} onChange={(event) => change({ amount: event.target.value })} />
                  </label>
                  <label className="flex-1 min-w-40 text-sm text-gray-600">ملاحظة
                    <input className="input w-full mt-1" maxLength={300} value={line.note} onChange={(event) => change({ note: event.target.value })} />
                  </label>
                  <label className="text-sm text-gray-600">الإيصال
                    <input type="file" className="block mt-1 text-xs" accept="image/*,application/pdf" onChange={(event) => change({ file: event.target.files?.[0] ?? null })} />
                  </label>
                  <button type="button" className="btn-secondary disabled:opacity-50" disabled={busy} onClick={() => addLine(report)}>إضافة بند</button>
                </div>
              )}

              {report.editable && data!.perDiem.length > 0 && (
                <div className="flex flex-wrap items-end gap-3 bg-gray-50 rounded-xl p-3" data-expense-per-diem-form>
                  <label className="text-sm text-gray-600">بدل يومي — الوجهة
                    <select className="input mt-1" value={dailyEntry.destination} onChange={(event) => changeDaily({ destination: event.target.value })}>
                      <option value="">اختار</option>
                      {data!.perDiem.map((rate) => <option key={rate.destination} value={rate.destination}>{rate.destination} ({formatMoney(rate.dailyAmount)} في اليوم)</option>)}
                    </select>
                  </label>
                  <label className="text-sm text-gray-600">عدد الأيام
                    <input className="input mt-1 w-20 text-center" dir="ltr" inputMode="numeric" value={dailyEntry.days} onChange={(event) => changeDaily({ days: event.target.value })} />
                  </label>
                  <label className="text-sm text-gray-600">أول يوم
                    <input type="date" className="input mt-1" max={today()} value={dailyEntry.expenseDate} onChange={(event) => changeDaily({ expenseDate: event.target.value })} />
                  </label>
                  <button type="button" className="btn-secondary disabled:opacity-50" disabled={busy} onClick={() => addDaily(report)}>إضافة بدل يومي</button>
                </div>
              )}

              {(report.advance || (report.editable && linkable.length > 0)) && (
                <div className="flex flex-wrap items-center gap-3 text-sm" data-expense-advance>
                  <span className="text-gray-600">سلفة المأمورية:</span>
                  {report.editable ? (
                    <select className="input" aria-label={`سلفة تقرير ${report.code}`} disabled={busy} value={report.advance?.id ?? ''}
                      onChange={(event) => run(() => attachTravelAdvance(report.id, event.target.value ? Number(event.target.value) : null), 'اتحدّثت سلفة التقرير')}>
                      <option value="">من غير سلفة</option>
                      {linkable.map((row) => <option key={row.id} value={row.id}>{row.code} — {formatMoney(row.amount)}</option>)}
                    </select>
                  ) : <span className="font-mono" dir="ltr">{report.advance!.code}</span>}
                  {report.advance && report.net !== null && (
                    <span className={report.net < 0 ? 'text-red-700' : 'text-gray-700'}>
                      السلفة <b className="font-mono">{formatMoney(report.advance.amount)}</b> · {report.net < 0 ? 'هيتخصم منك' : 'هيتضاف لك'} <b className="font-mono">{formatMoney(Math.abs(report.net))}</b> {currency}
                    </span>
                  )}
                </div>
              )}

              {report.editable && (
                <div className="flex flex-wrap items-center gap-3">
                  {data!.requestTypeCode && (
                    <button type="button" className="btn-primary disabled:opacity-50" disabled={busy || (report.lines.length === 0 && !report.advance) || !!blocked} onClick={() => submit(report)}>
                      {report.phase === 'RETURNED' ? 'إعادة التقديم' : 'تقديم للاعتماد'}
                    </button>
                  )}
                  {blocked && <span className="text-xs text-red-700">صلّح البنود المعلّمة بالأحمر قبل التقديم.</span>}
                  {report.phase === 'DRAFT' && report.requestId === null && (
                    <button type="button" className="text-red-600 text-sm ms-auto disabled:opacity-50" disabled={busy} onClick={() => run(() => removeExpenseReport(report.id), 'اتمسحت المسودة')}>مسح المسودة</button>
                  )}
                </div>
              )}
              {report.requestId !== null && report.phase !== 'DRAFT' && (
                <p className="text-xs text-gray-500">الطلب رقم <span dir="ltr">#{report.requestId}</span> — تابعه من <Link className="text-primary-600 underline" href="/requests">طلباتي</Link>.</p>
              )}
            </div>
          )
        })}
      </div>
    </MainLayout>
  )
}
