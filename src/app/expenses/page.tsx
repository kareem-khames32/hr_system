'use client'

// B5.3 (أ): «المصروفات» — فئات المصروف وحدودها (التعديل لحساب بكل الفروع)، وتقارير مصروفات موظفين نطاق الحساب (قراءة: الاعتماد في سلسلة الطلب).
// ميزة expenses.reports (مقفولة افتراضيًا).
import { useCallback, useEffect, useState } from 'react'
import { Receipt } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { currencyLabel } from '@/lib/currency'
import { formatMoney } from '@/lib/money'
import {
  createExpenseCategory, createPerDiemRate, fetchExpensesOverview, travelAdvanceStep, updateExpenseCategory, updatePerDiemRate, type ApiExpenseCategory, type ApiExpensesOverview, type ApiPerDiemRate,
} from '@/lib/expenses-api'

const PHASE_STYLE: Record<string, string> = {
  PENDING: 'bg-blue-50 text-blue-700', RETURNED: 'bg-amber-50 text-amber-800', REJECTED: 'bg-red-50 text-red-700', APPROVED: 'bg-green-50 text-green-700',
}
const emptyForm = () => ({ id: null as number | null, name: '', limit: '', limitMode: 'WARN' as 'WARN' | 'BLOCK', receiptRequired: false, isActive: true, gradeLimits: [] as Array<{ gradeId: string; limit: string }> })
const emptyRate = () => ({ id: null as number | null, destination: '', gradeId: '', categoryId: '', dailyAmount: '', isActive: true })
const limitOf = (text: string): number | null | undefined => (text.trim() === '' ? null : /^\d{1,7}(\.\d{1,2})?$/.test(text.trim()) && Number(text) > 0 ? Number(text.trim()) : undefined)

export default function ExpensesPage() {
  const [data, setData] = useState<ApiExpensesOverview | null>(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [rate, setRate] = useState(emptyRate())

  const load = useCallback(() => {
    fetchExpensesOverview().then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل المصروفات'))
  }, [])
  useEffect(load, [load])

  async function save() {
    const limitPerLine = limitOf(form.limit)
    if (form.name.trim().length < 2) return setError('اكتب اسم الفئة')
    if (limitPerLine === undefined) return setError('حد البند مبلغ موجب بمنزلتين بالكتير، أو سيبه فاضي')
    // (ج) حدود الدرجات: كل صف درجة وحد صحيح، ومن غير تكرار درجة
    const gradeLimits = form.gradeLimits.map((row) => ({ gradeId: Number(row.gradeId), limitPerLine: limitOf(row.limit) }))
    if (gradeLimits.some((row) => !row.gradeId || !row.limitPerLine) || new Set(gradeLimits.map((row) => row.gradeId)).size !== gradeLimits.length) return setError('حد الدرجة: اختار درجة مختلفة لكل صف واكتب مبلغ صحيح')
    setBusy(true); setError(''); setInfo('')
    const body = { name: form.name.trim(), limitPerLine, limitMode: form.limitMode, receiptRequired: form.receiptRequired, isActive: form.isActive, gradeLimits: gradeLimits as Array<{ gradeId: number; limitPerLine: number }> }
    try {
      if (form.id === null) await createExpenseCategory(body); else await updateExpenseCategory(form.id, body)
      setForm(emptyForm()); setInfo('اتحفظت الفئة'); load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر الحفظ') } finally { setBusy(false) }
  }
  // (ب) سلف المأموريات: تسجيل الصرف، أو القفل «اترجّعت نقدًا» بملاحظة
  async function advanceStep(id: number, step: 'paid' | 'returned') {
    const note = step === 'returned' ? (notes[id] ?? '').trim() : undefined
    if (step === 'returned' && (!note || note.length < 2)) return setError('اكتب ملاحظة القفل الأول')
    setBusy(true); setError(''); setInfo('')
    try { await travelAdvanceStep(id, step, note); setInfo(step === 'paid' ? 'اتسجّل صرف السلفة' : 'اتقفلت السلفة'); load() } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر التنفيذ') } finally { setBusy(false) }
  }
  const edit = (row: ApiExpenseCategory) => setForm({ id: row.id, name: row.name, limit: row.limitPerLine === null ? '' : String(row.limitPerLine), limitMode: row.limitMode, receiptRequired: row.receiptRequired, isActive: row.isActive,
    gradeLimits: row.gradeLimits.map((limit) => ({ gradeId: String(limit.gradeId), limit: String(limit.limitPerLine) })) })
  // (ج) سعر البدل اليومي: وجهة ودرجة (أو كل الدرجات) وسعر اليوم، تحت فئة مصروف
  async function saveRate() {
    const dailyAmount = limitOf(rate.dailyAmount)
    if (rate.destination.trim().length < 2 || !rate.categoryId || !dailyAmount) return setError('اكتب الوجهة واختار الفئة واكتب سعر اليوم')
    setBusy(true); setError(''); setInfo('')
    const body = { destination: rate.destination.trim(), categoryId: Number(rate.categoryId), gradeId: rate.gradeId ? Number(rate.gradeId) : null, dailyAmount, isActive: rate.isActive }
    try {
      if (rate.id === null) await createPerDiemRate(body); else await updatePerDiemRate(rate.id, body)
      setRate(emptyRate()); setInfo('اتحفظ سعر البدل اليومي'); load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر الحفظ') } finally { setBusy(false) }
  }
  const editRate = (row: ApiPerDiemRate) => setRate({ id: row.id, destination: row.destination, gradeId: row.gradeId === null ? '' : String(row.gradeId), categoryId: String(row.categoryId), dailyAmount: String(row.dailyAmount), isActive: row.isActive })
  const gradeName = (id: number | null) => (id === null ? 'كل الدرجات' : data?.grades.find((grade) => grade.id === id)?.name ?? `درجة #${id}`)

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Receipt size={24} className="text-primary-600" />
            المصروفات
          </h1>
          <p className="text-gray-500 mt-1">فئات المصروف وحدودها، وتقارير مصروفات الموظفين. الاعتماد والصرف في سلسلة الطلب نفسها.</p>
        </div>

        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        {info && <div role="status" className="bg-green-50 text-green-700 rounded-xl p-4">{info}</div>}
        {data && !data.ready && <div className="card text-amber-800 bg-amber-50">جداول تقارير المصروفات لسه ماتطبّقتش على قاعدة البيانات (ترحيلات 149 لحد 154).</div>}

        {data?.ready && (
          <div className="card space-y-3" data-expense-categories>
            <h2 className="text-lg font-semibold text-gray-800">فئات المصروف</h2>
            {!data.canEdit && <p className="text-xs text-gray-500">الفئات تعريف للشركة كلها — تعديلها لحساب نطاقه كل الفروع.</p>}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="table-header text-right">الفئة</th>
                    <th className="table-header text-center">حد البند</th>
                    <th className="table-header text-center">لو اتعدّى الحد</th>
                    <th className="table-header text-center">الإيصال</th>
                    <th className="table-header text-center">الحالة</th>
                    <th className="table-header" />
                  </tr>
                </thead>
                <tbody>
                  {data.categories.length === 0 && <tr><td colSpan={6} className="table-cell text-center text-gray-500">مفيش فئات لسه.</td></tr>}
                  {data.categories.map((row) => (
                    <tr key={row.id} className="border-t border-gray-100">
                      <td className="table-cell">{row.name}</td>
                      <td className="table-cell text-center font-mono">{row.limitPerLine === null ? '—' : formatMoney(row.limitPerLine)}
                        {row.gradeLimits.map((limit) => <span key={limit.gradeId} className="block text-xs text-gray-500 font-sans">{gradeName(limit.gradeId)}: <span className="font-mono">{formatMoney(limit.limitPerLine)}</span></span>)}
                      </td>
                      <td className="table-cell text-center">{row.limitPerLine === null ? '—' : row.limitMode === 'BLOCK' ? 'منع' : 'تحذير'}</td>
                      <td className="table-cell text-center">{row.receiptRequired ? 'إجباري' : 'اختياري'}</td>
                      <td className="table-cell text-center">{row.isActive ? 'مفعّلة' : <span className="text-gray-400">مقفولة</span>}</td>
                      <td className="table-cell text-left">{data.canEdit && <button type="button" className="text-primary-600 text-xs" onClick={() => edit(row)}>تعديل</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.canEdit && (
              <div className="flex flex-wrap items-end gap-3 bg-gray-50 rounded-xl p-3" data-expense-category-form>
                <label className="flex-1 min-w-48 text-sm text-gray-600">{form.id === null ? 'فئة جديدة' : 'تعديل الفئة'}
                  <input className="input w-full mt-1" maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                </label>
                <label className="text-sm text-gray-600">حد البند (فاضي = من غير حد)
                  <input className="input mt-1 w-32 text-center" dir="ltr" inputMode="decimal" value={form.limit} onChange={(event) => setForm({ ...form, limit: event.target.value })} />
                </label>
                <label className="text-sm text-gray-600">لو اتعدّى الحد
                  <select className="input mt-1" value={form.limitMode} onChange={(event) => setForm({ ...form, limitMode: event.target.value as 'WARN' | 'BLOCK' })}>
                    <option value="WARN">تحذير للمعتمد</option>
                    <option value="BLOCK">منع</option>
                  </select>
                </label>
                <label className="text-sm text-gray-600 flex items-center gap-2"><input type="checkbox" checked={form.receiptRequired} onChange={(event) => setForm({ ...form, receiptRequired: event.target.checked })} />الإيصال إجباري</label>
                <label className="text-sm text-gray-600 flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />مفعّلة</label>
                <button type="button" className="btn-primary disabled:opacity-50" disabled={busy} onClick={save}>حفظ</button>
                {form.id !== null && <button type="button" className="btn-secondary" onClick={() => setForm(emptyForm())}>إلغاء</button>}
                <div className="w-full space-y-2" data-expense-grade-limits>
                  {form.gradeLimits.map((row, index) => (
                    <div key={index} className="flex flex-wrap items-center gap-2 text-sm">
                      <select className="input" aria-label={`درجة الحد ${index + 1}`} value={row.gradeId} onChange={(event) => setForm({ ...form, gradeLimits: form.gradeLimits.map((item, at) => (at === index ? { ...item, gradeId: event.target.value } : item)) })}>
                        <option value="">الدرجة</option>
                        {data.grades.map((grade) => <option key={grade.id} value={grade.id}>{grade.name}</option>)}
                      </select>
                      <input className="input w-32 text-center" dir="ltr" inputMode="decimal" placeholder="حد البند" aria-label={`حد الدرجة ${index + 1}`} value={row.limit}
                        onChange={(event) => setForm({ ...form, gradeLimits: form.gradeLimits.map((item, at) => (at === index ? { ...item, limit: event.target.value } : item)) })} />
                      <button type="button" className="text-red-600 text-xs" onClick={() => setForm({ ...form, gradeLimits: form.gradeLimits.filter((_, at) => at !== index) })}>شيل</button>
                    </div>
                  ))}
                  {data.grades.length > 0 && <button type="button" className="text-primary-600 text-xs" onClick={() => setForm({ ...form, gradeLimits: [...form.gradeLimits, { gradeId: '', limit: '' }] })}>+ حد مختلف لدرجة</button>}
                </div>
              </div>
            )}
          </div>
        )}

        {data?.ready && (data.canEdit || data.rates.length > 0) && (
          <div className="card space-y-3" data-per-diem-rates>
            <h2 className="text-lg font-semibold text-gray-800">البدل اليومي</h2>
            <p className="text-xs text-gray-500">سعر اليوم لكل وجهة، لدرجة معيّنة أو لكل الدرجات (سعر الدرجة بيسبق). الموظف بيختار الوجهة وعدد الأيام والنظام بيحسب المبلغ.</p>
            {data.rates.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="table-header text-right">الوجهة</th>
                      <th className="table-header text-right">الدرجة</th>
                      <th className="table-header text-right">الفئة</th>
                      <th className="table-header text-center">سعر اليوم</th>
                      <th className="table-header text-center">الحالة</th>
                      <th className="table-header" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.rates.map((row) => (
                      <tr key={row.id} className="border-t border-gray-100">
                        <td className="table-cell">{row.destination}</td>
                        <td className="table-cell">{gradeName(row.gradeId)}</td>
                        <td className="table-cell">{data.categories.find((category) => category.id === row.categoryId)?.name ?? '—'}</td>
                        <td className="table-cell text-center font-mono">{formatMoney(row.dailyAmount)}</td>
                        <td className="table-cell text-center">{row.isActive ? 'مفعّل' : <span className="text-gray-400">مقفول</span>}</td>
                        <td className="table-cell text-left">{data.canEdit && <button type="button" className="text-primary-600 text-xs" onClick={() => editRate(row)}>تعديل</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {data.canEdit && (
              <div className="flex flex-wrap items-end gap-3 bg-gray-50 rounded-xl p-3" data-per-diem-rate-form>
                <label className="flex-1 min-w-40 text-sm text-gray-600">{rate.id === null ? 'وجهة جديدة' : 'تعديل السعر'}
                  <input className="input w-full mt-1" maxLength={80} value={rate.destination} onChange={(event) => setRate({ ...rate, destination: event.target.value })} />
                </label>
                <label className="text-sm text-gray-600">الدرجة
                  <select className="input mt-1" value={rate.gradeId} onChange={(event) => setRate({ ...rate, gradeId: event.target.value })}>
                    <option value="">كل الدرجات</option>
                    {data.grades.map((grade) => <option key={grade.id} value={grade.id}>{grade.name}</option>)}
                  </select>
                </label>
                <label className="text-sm text-gray-600">فئة المصروف
                  <select className="input mt-1" value={rate.categoryId} onChange={(event) => setRate({ ...rate, categoryId: event.target.value })}>
                    <option value="">اختار</option>
                    {data.categories.filter((category) => category.isActive).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                </label>
                <label className="text-sm text-gray-600">سعر اليوم
                  <input className="input mt-1 w-28 text-center" dir="ltr" inputMode="decimal" value={rate.dailyAmount} onChange={(event) => setRate({ ...rate, dailyAmount: event.target.value })} />
                </label>
                <label className="text-sm text-gray-600 flex items-center gap-2"><input type="checkbox" checked={rate.isActive} onChange={(event) => setRate({ ...rate, isActive: event.target.checked })} />مفعّل</label>
                <button type="button" className="btn-primary disabled:opacity-50" disabled={busy} onClick={saveRate}>حفظ السعر</button>
                {rate.id !== null && <button type="button" className="btn-secondary" onClick={() => setRate(emptyRate())}>إلغاء</button>}
              </div>
            )}
          </div>
        )}

        {data?.ready && data.advances.length > 0 && (
          <div className="card space-y-3" data-travel-advances>
            <h2 className="text-lg font-semibold text-gray-800">سلف المأموريات</h2>
            <p className="text-xs text-gray-500">السلفة بتتعمل من اعتماد طلبها. سجّل صرفها النقدي هنا؛ والتسوية بتتم لما الموظف يربطها بتقرير مصروفات ويتعتمد.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="table-header text-right">السلفة</th>
                    <th className="table-header text-right">الموظف</th>
                    <th className="table-header text-center">المبلغ</th>
                    <th className="table-header text-center">الحالة</th>
                    <th className="table-header" />
                  </tr>
                </thead>
                <tbody>
                  {data.advances.map((row) => (
                    <tr key={row.id} className="border-t border-gray-100">
                      <td className="table-cell">{row.purpose}<span className="block text-xs text-gray-500 font-mono" dir="ltr">{row.code}</span></td>
                      <td className="table-cell">{row.employeeName}{row.employeeCode ? <span className="text-xs text-gray-500" dir="ltr"> · {row.employeeCode}</span> : null}</td>
                      <td className="table-cell text-center font-mono">{formatMoney(row.amount)} <span className="text-xs text-gray-500 font-sans">{currencyLabel(row.currency)}</span></td>
                      <td className="table-cell text-center">
                        {row.status === 'OPEN' ? (row.paid ? (row.reportId ? 'مربوطة بتقرير' : 'اتصرفت — مستنية تقرير') : 'لسه مااتصرفتش') : row.statusLabel}
                        {row.closeNote && <span className="block text-xs text-gray-500">{row.closeNote}</span>}
                      </td>
                      <td className="table-cell text-left">
                        {row.status === 'OPEN' && !row.paid && <button type="button" className="btn-primary text-xs disabled:opacity-50" disabled={busy} onClick={() => advanceStep(row.id, 'paid')}>اتصرفت</button>}
                        {row.status === 'OPEN' && row.paid && row.reportId === null && (
                          <span className="inline-flex items-center gap-2">
                            <input className="input w-44 text-xs" maxLength={300} placeholder="ملاحظة القفل" aria-label={`ملاحظة قفل ${row.code}`} value={notes[row.id] ?? ''} onChange={(event) => setNotes({ ...notes, [row.id]: event.target.value })} />
                            <button type="button" className="btn-secondary text-xs disabled:opacity-50" disabled={busy} onClick={() => advanceStep(row.id, 'returned')}>اترجّعت نقدًا</button>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data?.ready && (
          <div className="card space-y-3" data-expense-reports>
            <h2 className="text-lg font-semibold text-gray-800">تقارير الموظفين</h2>
            {data.reports.length === 0 ? <p className="text-gray-500">مفيش تقارير اتقدّمت لسه.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="table-header text-right">التقرير</th>
                      <th className="table-header text-right">الموظف</th>
                      <th className="table-header text-center">البنود</th>
                      <th className="table-header text-center">الإجمالي</th>
                      <th className="table-header text-center">الحالة</th>
                      <th className="table-header text-center">الطلب</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.reports.map((report) => (
                      <tr key={report.id} className="border-t border-gray-100">
                        <td className="table-cell">{report.title}<span className="block text-xs text-gray-500 font-mono" dir="ltr">{report.code}</span></td>
                        <td className="table-cell">{report.employeeName}{report.employeeCode ? <span className="text-xs text-gray-500" dir="ltr"> · {report.employeeCode}</span> : null}</td>
                        <td className="table-cell text-center">{report.lines.length}{report.lines.some((row) => row.warning) && <span className="block text-xs text-amber-700">فيه بند فوق الحد</span>}</td>
                        <td className="table-cell text-center font-mono">{formatMoney(report.total)} <span className="text-xs text-gray-500 font-sans">{currencyLabel(report.currency)}</span></td>
                        <td className="table-cell text-center"><span className={`text-xs rounded-full px-3 py-1 ${PHASE_STYLE[report.phase] ?? 'bg-gray-100 text-gray-700'}`}>{report.phaseLabel}</span></td>
                        <td className="table-cell text-center" dir="ltr">{report.requestId === null ? '—' : `#${report.requestId}`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
