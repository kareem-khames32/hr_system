'use client'

// B5.1 (ب): «دورات الزيادات» — فتح الدورة وتحريكها، وميزانية كل إدارة، ومراجعة اقتراحات المديرين وتعديلها بسبب.
// السطور اقتراحات بس: الراتب مابيتغيّرش من الشاشة دي. الميزانية تحذير مش منع. أرقام الراتب لصاحب «عرض الرواتب».
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, TrendingUp } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { currencyLabel } from '@/lib/currency'
import { formatDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { adjustRaiseLine, createRaiseCycle, fetchRaiseCycle, fetchRaiseCycles, moveRaiseCycle, setRaiseBudget,
  type ApiRaiseCycle, type ApiRaiseCycleDetail, type CycleStep } from '@/lib/compensation-api'

const STEP_LABELS: Record<CycleStep, string> = { open: 'فتح للاقتراحات', review: 'قفل الاقتراحات وبدء المراجعة', reopen: 'رجوع للاقتراحات', cancel: 'إلغاء الدورة' }
const STEPS_FROM: Record<string, CycleStep[]> = { DRAFT: ['open', 'cancel'], OPEN: ['review', 'cancel'], REVIEW: ['reopen', 'cancel'] }
const amountOf = (text: string): number | null => (/^\d{1,7}(\.\d{1,2})?$/.test(text.trim()) ? Number(text.trim()) : null)

export default function RaiseCyclesPage() {
  const [cycles, setCycles] = useState<ApiRaiseCycle[] | null>(null)
  const [ready, setReady] = useState(true)
  const [detail, setDetail] = useState<ApiRaiseCycleDetail | null>(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ name: '', effectivePayrollPeriod: '', note: '' })
  const [edit, setEdit] = useState<{ employeeId: number; amount: string; note: string } | null>(null)
  const [add, setAdd] = useState({ employeeId: '', amount: '', note: '' })
  const [budget, setBudget] = useState<{ departmentId: number; amount: string } | null>(null)
  const [confirmStep, setConfirmStep] = useState<CycleStep | null>(null)

  const loadList = useCallback(() => {
    fetchRaiseCycles().then((data) => { setCycles(data.cycles); setReady(data.ready) }).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل دورات الزيادات'))
  }, [])
  useEffect(loadList, [loadList])

  async function run(work: () => Promise<ApiRaiseCycleDetail>, done: string) {
    setBusy(true); setError(''); setInfo('')
    try {
      setDetail(await work())
      setInfo(done)
      loadList()
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر الحفظ')
      return false
    } finally {
      setBusy(false)
    }
  }
  const open = (id: number) => run(() => fetchRaiseCycle(id), '')

  async function create() {
    const ok = await run(() => createRaiseCycle({ name: form.name.trim(), effectivePayrollPeriod: form.effectivePayrollPeriod, ...(form.note.trim() ? { note: form.note.trim() } : {}) }), 'اتعملت الدورة (مسودة)')
    if (ok) setForm({ name: '', effectivePayrollPeriod: '', note: '' })
  }
  async function saveLine() {
    if (!detail || !edit) return
    const amount = amountOf(edit.amount)
    if (amount === null) return setError('اكتب مبلغ صحيح بمنزلتين بالكتير')
    if (await run(() => adjustRaiseLine(detail.cycle.id, edit.employeeId, amount, edit.note.trim()), 'اتحفظ التعديل')) setEdit(null)
  }
  async function addLine() {
    if (!detail) return
    const amount = amountOf(add.amount)
    if (amount === null || !add.employeeId) return setError('اختر الموظف واكتب مبلغ صحيح')
    if (await run(() => adjustRaiseLine(detail.cycle.id, Number(add.employeeId), amount, add.note.trim()), 'اتضاف السطر')) setAdd({ employeeId: '', amount: '', note: '' })
  }
  async function saveBudget() {
    if (!detail || !budget) return
    const amount = budget.amount.trim() === '' ? null : amountOf(budget.amount)
    if (budget.amount.trim() !== '' && amount === null) return setError('اكتب ميزانية صحيحة، أو سيبها فاضية (من غير ميزانية)')
    if (await run(() => setRaiseBudget(detail.cycle.id, budget.departmentId, amount), 'اتحفظت الميزانية')) setBudget(null)
  }
  async function move(step: CycleStep) {
    if (!detail) return
    setConfirmStep(null)
    await run(() => moveRaiseCycle(detail.cycle.id, step), `${STEP_LABELS[step]}: تمام`)
  }

  const canCreate = form.name.trim().length > 0 && /^\d{4}-\d{2}$/.test(form.effectivePayrollPeriod)
  const steps = detail && detail.canMove ? STEPS_FROM[detail.cycle.status] ?? [] : []

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <Link href="/compensation" className="text-sm text-primary-600 hover:underline">
            ← سلّم الرواتب والزيادات
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mt-2">
            <TrendingUp size={24} className="text-primary-600" />
            دورات الزيادات
          </h1>
          <p className="text-gray-500 mt-1">
            المديرين بيقترحوا لمرؤوسيهم والدورة مفتوحة، والمراجعة بتعدّل بسبب مكتوب. السطور اقتراحات بس — الراتب بيتغيّر بعد الاعتماد.
          </p>
        </div>

        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        {info && <div role="status" className="bg-green-50 text-green-700 rounded-xl p-4">{info}</div>}
        {!ready && <div role="alert" className="bg-amber-50 text-amber-800 rounded-xl p-4">جداول دورات الزيادات ناقصة — طبّق ترحيلات 140 و141 و142 الأول.</div>}

        <div className="card space-y-3" data-raise-cycles>
          <h2 className="text-lg font-semibold text-gray-800">الدورات</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="table-header text-right">الدورة</th>
                  <th className="table-header text-center">يسري من راتب شهر</th>
                  <th className="table-header text-center">الحالة</th>
                  <th className="table-header text-center">اتعملت</th>
                  <th className="table-header" />
                </tr>
              </thead>
              <tbody>
                {(cycles ?? []).map((cycle) => (
                  <tr key={cycle.id} className={`border-t border-gray-100 ${detail?.cycle.id === cycle.id ? 'bg-primary-50' : ''}`}>
                    <td className="table-cell">{cycle.name}</td>
                    <td className="table-cell text-center font-mono" dir="ltr">{cycle.effectivePayrollPeriod}</td>
                    <td className="table-cell text-center">{cycle.statusLabel}</td>
                    <td className="table-cell text-center">{formatDate(cycle.createdAt)}</td>
                    <td className="table-cell text-left">
                      <button type="button" className="btn-secondary text-xs disabled:opacity-50" disabled={busy} onClick={() => open(cycle.id)}>فتح</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {cycles && cycles.length === 0 && <p className="text-gray-500 text-sm p-2">مفيش دورات لسه.</p>}
          </div>
          <div className="flex flex-wrap items-end gap-3 border-t border-gray-100 pt-3">
            <label className="text-sm text-gray-600">
              اسم الدورة
              <input className="input mt-1" value={form.name} maxLength={120} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>
            <label className="text-sm text-gray-600">
              يسري من راتب شهر
              <input type="month" className="input mt-1" value={form.effectivePayrollPeriod} onChange={(event) => setForm({ ...form, effectivePayrollPeriod: event.target.value })} />
            </label>
            <label className="text-sm text-gray-600 grow">
              ملاحظة (اختياري)
              <input className="input mt-1 w-full" value={form.note} maxLength={500} onChange={(event) => setForm({ ...form, note: event.target.value })} />
            </label>
            <button type="button" className="btn-primary text-sm disabled:opacity-50" disabled={busy || !ready || !canCreate} onClick={create}>دورة جديدة</button>
          </div>
          <p className="text-xs text-gray-500">الدورة الجديدة وتحريكها لحساب على مستوى الشركة كلها.</p>
        </div>

        {detail && (
          <>
            <div className="card space-y-3" data-raise-cycle>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-800">{detail.cycle.name}</h2>
                <span className="text-sm text-gray-600">{detail.cycle.statusLabel} · يسري من راتب <span dir="ltr">{detail.cycle.effectivePayrollPeriod}</span></span>
                <div className="flex flex-wrap gap-2 mr-auto">
                  {steps.map((step) => (
                    <button key={step} type="button" className={`${step === 'cancel' ? 'btn-secondary' : 'btn-primary'} text-sm disabled:opacity-50`} disabled={busy} onClick={() => setConfirmStep(step)}>
                      {STEP_LABELS[step]}
                    </button>
                  ))}
                </div>
              </div>
              {confirmStep && (
                <div className="bg-amber-50 text-amber-800 rounded-xl p-3 flex flex-wrap items-center gap-3 text-sm">
                  <span>متأكد من «{STEP_LABELS[confirmStep]}»؟</span>
                  <button type="button" className="btn-primary text-sm disabled:opacity-50" disabled={busy} onClick={() => move(confirmStep)}>أيوه</button>
                  <button type="button" className="btn-secondary text-sm" onClick={() => setConfirmStep(null)}>لأ</button>
                </div>
              )}
              {detail.cycle.note && <p className="text-sm text-gray-600">{detail.cycle.note}</p>}
              <div className="flex flex-wrap gap-4 text-sm">
                {detail.totals.map((total) => (
                  <span key={total.currency} className="bg-gray-50 rounded-lg px-3 py-2">
                    {total.count} سطر · اقتراحات <b className="font-mono">{formatMoney(total.proposed)}</b> · نهائي <b className="font-mono">{formatMoney(total.final)}</b> {currencyLabel(total.currency)} في الشهر
                  </span>
                ))}
                {detail.totals.length === 0 && <span className="text-gray-500">مفيش سطور في نطاقك لسه.</span>}
              </div>
            </div>

            <div className="card space-y-3" data-raise-budgets>
              <h2 className="text-lg font-semibold text-gray-800">الميزانيات</h2>
              <p className="text-xs text-gray-500">ميزانية الزيادة الشهرية للإدارة أو القسم (بتغطي اللي تحتها). لو المستخدم عدّاها بيظهر تحذير والسطور بتتحفظ عادي.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="table-header text-right">الوحدة</th>
                      <th className="table-header text-center">الميزانية</th>
                      <th className="table-header text-center">المستخدم</th>
                      <th className="table-header text-center">الباقي</th>
                      <th className="table-header" />
                    </tr>
                  </thead>
                  <tbody>
                    {detail.budgets.map((row) => (
                      <tr key={row.departmentId} className="border-t border-gray-100">
                        <td className="table-cell">{row.name} <span className="text-xs text-gray-500">({row.unitType === 'ADMINISTRATION' ? 'إدارة' : 'قسم'} · {currencyLabel(row.currency)})</span></td>
                        <td className="table-cell text-center font-mono">
                          {budget?.departmentId === row.departmentId
                            ? <input className="input w-32 text-center" dir="ltr" inputMode="decimal" value={budget.amount} placeholder="من غير" onChange={(event) => setBudget({ ...budget, amount: event.target.value })} />
                            : row.budget === null ? '—' : formatMoney(row.budget)}
                        </td>
                        <td className="table-cell text-center font-mono">{formatMoney(row.used)}</td>
                        <td className={`table-cell text-center font-mono ${row.over ? 'text-red-700 font-bold' : ''}`}>
                          {row.remaining === null ? '—' : formatMoney(row.remaining)}
                          {row.over && <span className="inline-flex items-center gap-1 mr-2 text-xs"><AlertTriangle size={14} /> عدّت الميزانية</span>}
                        </td>
                        <td className="table-cell text-left">
                          {detail.canBudget && (budget?.departmentId === row.departmentId
                            ? <span className="inline-flex gap-2">
                                <button type="button" className="btn-primary text-xs disabled:opacity-50" disabled={busy} onClick={saveBudget}>حفظ</button>
                                <button type="button" className="btn-secondary text-xs" onClick={() => setBudget(null)}>إلغاء</button>
                              </span>
                            : <button type="button" className="btn-secondary text-xs" onClick={() => setBudget({ departmentId: row.departmentId, amount: row.budget === null ? '' : String(row.budget) })}>تعديل</button>)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {detail.budgets.length === 0 && <p className="text-gray-500 text-sm p-2">مفيش إدارات أو أقسام في نطاقك.</p>}
              </div>
            </div>

            <div className="card space-y-3" data-raise-lines>
              <h2 className="text-lg font-semibold text-gray-800">السطور ({detail.lines.length})</h2>
              {!detail.salaries && <p className="text-xs text-gray-500">الراتب الحالي والجديد والنسبة بيظهروا للي معاه «عرض الرواتب».</p>}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="table-header text-right">الموظف</th>
                      <th className="table-header text-right">الوحدة</th>
                      {detail.salaries && <th className="table-header text-center">الأساسي الحالي</th>}
                      <th className="table-header text-center">اقتراح المدير</th>
                      <th className="table-header text-center">النهائي</th>
                      {detail.salaries && <th className="table-header text-center">الأساسي الجديد</th>}
                      {detail.salaries && <th className="table-header text-center">النسبة</th>}
                      <th className="table-header text-right">ملاحظات</th>
                      <th className="table-header" />
                    </tr>
                  </thead>
                  <tbody>
                    {detail.lines.map((line) => (
                      <tr key={line.employeeId} className={`border-t border-gray-100 ${line.active ? '' : 'text-gray-400'}`}>
                        <td className="table-cell">
                          {line.fullName}{line.employeeCode ? <span className="text-xs text-gray-500" dir="ltr"> · {line.employeeCode}</span> : null}
                          {!line.active && <span className="text-xs text-red-700"> (مش على رأس العمل)</span>}
                        </td>
                        <td className="table-cell">{line.departmentName ?? '—'}</td>
                        {detail.salaries && (
                          <td className="table-cell text-center font-mono">
                            {line.currentBasic === null ? '—' : formatMoney(line.currentBasic)}
                            {line.basicChanged && <span className="block text-xs text-amber-700">اتغيّر بعد آخر كتابة</span>}
                          </td>
                        )}
                        <td className="table-cell text-center font-mono">
                          {formatMoney(line.proposedAmount)}
                          <span className="block text-xs text-gray-500 font-sans">{line.proposedBy ?? 'حساب برّه نطاقك'}</span>
                        </td>
                        <td className="table-cell text-center font-mono font-bold">
                          {edit?.employeeId === line.employeeId
                            ? <input className="input w-28 text-center" dir="ltr" inputMode="decimal" value={edit.amount} onChange={(event) => setEdit({ ...edit, amount: event.target.value })} />
                            : <>{formatMoney(line.finalAmount)} <span className="text-xs font-normal text-gray-500 font-sans">{currencyLabel(line.currency)}</span></>}
                          {line.adjusted && edit?.employeeId !== line.employeeId && <span className="block text-xs font-normal text-gray-500 font-sans">عدّله {line.adjustedBy ?? 'حساب برّه نطاقك'}</span>}
                        </td>
                        {detail.salaries && <td className="table-cell text-center font-mono">{line.newBasic === null ? '—' : formatMoney(line.newBasic)}</td>}
                        {detail.salaries && <td className="table-cell text-center font-mono" dir="ltr">{line.percent === null ? '—' : `${line.percent}%`}</td>}
                        <td className="table-cell text-xs text-gray-600">
                          {edit?.employeeId === line.employeeId
                            ? <input className="input w-full" value={edit.note} maxLength={500} placeholder="سبب التعديل (مطلوب)" onChange={(event) => setEdit({ ...edit, note: event.target.value })} />
                            : <>{line.note}{line.adjustNote ? <span className="block">التعديل: {line.adjustNote}</span> : null}</>}
                        </td>
                        <td className="table-cell text-left">
                          {detail.canAdjust && line.active && (edit?.employeeId === line.employeeId
                            ? <span className="inline-flex gap-2">
                                <button type="button" className="btn-primary text-xs disabled:opacity-50" disabled={busy || !edit.note.trim()} onClick={saveLine}>حفظ</button>
                                <button type="button" className="btn-secondary text-xs" onClick={() => setEdit(null)}>إلغاء</button>
                              </span>
                            : <button type="button" className="btn-secondary text-xs" onClick={() => setEdit({ employeeId: line.employeeId, amount: String(line.finalAmount), note: '' })}>تعديل</button>)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {detail.lines.length === 0 && <p className="text-gray-500 text-sm p-2">مفيش اقتراحات في نطاقك لسه.</p>}
              </div>
              {detail.canAdjust && detail.candidates.length > 0 && (
                <div className="flex flex-wrap items-end gap-3 border-t border-gray-100 pt-3">
                  <label className="text-sm text-gray-600">
                    إضافة سطر لموظف
                    <select className="input mt-1" value={add.employeeId} onChange={(event) => setAdd({ ...add, employeeId: event.target.value })}>
                      <option value="">اختر الموظف</option>
                      {detail.candidates.map((person) => <option key={person.employeeId} value={person.employeeId}>{person.fullName}{person.employeeCode ? ` · ${person.employeeCode}` : ''}</option>)}
                    </select>
                  </label>
                  <label className="text-sm text-gray-600">
                    الزيادة الشهرية
                    <input className="input mt-1 w-32" dir="ltr" inputMode="decimal" value={add.amount} onChange={(event) => setAdd({ ...add, amount: event.target.value })} />
                  </label>
                  <label className="text-sm text-gray-600 grow">
                    السبب (مطلوب)
                    <input className="input mt-1 w-full" value={add.note} maxLength={500} onChange={(event) => setAdd({ ...add, note: event.target.value })} />
                  </label>
                  <button type="button" className="btn-primary text-sm disabled:opacity-50" disabled={busy || !add.employeeId || !add.note.trim() || amountOf(add.amount) === null} onClick={addLine}>إضافة</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  )
}
