'use client'
import { useCallback, useEffect, useState } from 'react'
import { localToday } from '@/lib/dates'
import { buildCalendarChange, confirmPayrollCalendarContext, emptyCalendarEvidence, fetchPayrollCalendarContext, type CalendarChangeEvidence, type PayrollCalendarContext, type PayrollCalendarScope } from '@/lib/payroll-calendar-api'
import type { PayrollCalendarChange } from '@/lib/payroll-calendar-api'

export function useCalendarContext(scope: PayrollCalendarScope, sourceId: number, enabled = true) {
  const key = `${scope}:${sourceId}:${enabled}`
  const [state, setState] = useState<{ key: string; context: PayrollCalendarContext | null; loading: boolean; error: string }>({ key: '', context: null, loading: false, error: '' })
  const [revision, setRevision] = useState(0)
  const [evidence, setEvidence] = useState<CalendarChangeEvidence>(emptyCalendarEvidence)
  const reload = useCallback(() => setRevision(value => value + 1), [])
  useEffect(() => {
    let active = true
    const controller = new AbortController()
    setEvidence(emptyCalendarEvidence())
    if (!enabled) { setState({ key, context: null, loading: false, error: '' }); return () => { active = false; controller.abort() } }
    setState({ key, context: null, loading: true, error: '' })
    fetchPayrollCalendarContext(scope, sourceId, controller.signal)
      .then(context => { if (active) setState({ key, context, loading: false, error: '' }) })
      .catch(cause => { if (active) setState({ key, context: null, loading: false, error: cause instanceof Error ? cause.message : 'تعذر تحميل سياق التقويم.' }) })
    return () => { active = false; controller.abort() }
  }, [key, scope, sourceId, enabled, revision])
  return { context: state.key === key ? state.context : null, loading: enabled && (state.key !== key || state.loading), error: state.key === key ? state.error : '', evidence, setEvidence, reload }
}
export function CalendarContextSummary({ context, loading = false, error = '' }: { context: PayrollCalendarContext | null; loading?: boolean; error?: string }) {
  if (loading) return <p className="text-sm text-gray-500">جارٍ تحميل نسخة التقويم...</p>
  if (error || !context) return <p role="alert" className="text-sm text-amber-800">{error || 'لم يُحمّل سياق التقويم.'} لا يمكن تعديل التقويم حتى تحميله.</p>
  const current = context.current
  const weekend = current.weekendDays ?? current.globalWeekendDays ?? current.weekend
  const weekdayLabels: Record<string, string> = { SUN: 'الأحد', MON: 'الاثنين', TUE: 'الثلاثاء', WED: 'الأربعاء', THU: 'الخميس', FRI: 'الجمعة', SAT: 'السبت' }
  const weekendText = typeof weekend === 'string' ? weekend.split(',').map(day => weekdayLabels[day.trim()] ?? day.trim()).join('، ') || 'لا توجد' : context.scope === 'BRANCH' ? 'تورث من التقويم العام' : 'غير محددة'
  const holidays = Array.isArray(current.holidays) ? current.holidays.length : null
  const rules = Array.isArray(current.rules) ? current.rules.length : Array.isArray(current.exceptions) ? current.exceptions.length : null
  const holidayRows = Array.isArray(current.holidays) ? current.holidays : []
  const exceptionRows = Array.isArray(current.exceptions) ? current.exceptions : []
  const occurrenceLabels: Record<string, string> = { ALL: 'كل أسبوع', '1ST': 'الأول', '2ND': 'الثاني', '3RD': 'الثالث', '4TH': 'الرابع', LAST: 'الأخير' }
  const text = (value: unknown) => typeof value === 'string' ? value : 'غير محدد'
  return <div className="space-y-1 text-sm">
    {context.currentMatchesHistory === false && <p role="alert" className="text-sm text-red-700">تغيّرت بيانات التقويم خارج سجله. الحفظ متوقف حتى مراجعة التغيير غير المسجل.</p>}
    <p className={context.effectiveFrom ? 'text-gray-700' : 'text-amber-800'}>{context.effectiveFrom ? `نسخة ${context.revision} — تسري من ${context.effectiveFrom}${context.effectiveFrom > localToday() ? ' — إعداد مستقبلي' : ''}` : 'القيم الحالية لم يُثبت تاريخ سريانها بعد.'}</p>
    <p className="text-xs text-gray-600">{context.scope !== 'EMPLOYEE' ? `أيام الراحة: ${weekendText}. ` : ''}{holidays !== null ? `العطلات: ${holidays}. ` : ''}{rules !== null ? `القواعد الاستثنائية: ${rules}. ` : ''}{typeof current.country === 'string' ? `الدولة: ${current.country || 'كل الدول'}.` : ''}{typeof current.branchId === 'number' ? `الفرع المسجل: ${current.branchId}.` : context.scope === 'EMPLOYEE' ? 'الفرع غير محدد.' : ''}</p>
    {context.scope !== 'EMPLOYEE' && <details className="pt-2"><summary className="cursor-pointer font-medium text-blue-800">مراجعة جميع قيم التقويم التي سيشملها التأكيد</summary><div className="space-y-3 mt-3">
      {context.scope === 'GLOBAL' && <div><h4 className="font-medium mb-2">العطلات الحالية</h4>{holidayRows.length === 0 ? <p className="text-xs text-gray-500">لا توجد عطلات مسجلة.</p> : <ul className="space-y-2">{holidayRows.map((row, index) => <li key={index} className="rounded-lg bg-white/70 border border-gray-100 p-3"><p className="font-medium break-words">{text(row?.name)}</p><p className="text-xs text-gray-600 mt-1"><bdi dir="ltr">{text(row?.date)}</bdi> إلى <bdi dir="ltr">{row?.endDate === null ? text(row?.date) : text(row?.endDate)}</bdi> · {row?.country === null ? 'كل الدول' : text(row?.country)}</p></li>)}</ul>}</div>}
      <div><h4 className="font-medium mb-2">القواعد الاستثنائية الحالية</h4>{exceptionRows.length === 0 ? <p className="text-xs text-gray-500">لا توجد قواعد استثنائية مسجلة.</p> : <ul className="space-y-2">{exceptionRows.map((row, index) => <li key={index} className="rounded-lg bg-white/70 border border-gray-100 p-3"><p className="font-medium break-words">{text(row?.name)}</p><p className="text-xs text-gray-600 mt-1">{weekdayLabels[text(row?.weekday)] ?? 'يوم غير محدد'} · {occurrenceLabels[text(row?.occurrence)] ?? 'تكرار غير محدد'} · {row?.effect === 'WORK' ? 'يوم عمل' : row?.effect === 'OFF' ? 'يوم راحة' : 'أثر غير محدد'} · {row?.isActive === true ? 'مفعلة' : row?.isActive === false ? 'معطلة' : 'حالة غير محددة'}</p></li>)}</ul>}</div>
    </div></details>}
  </div>
}
export function CalendarChangeFields({ context, value, onChange, disabled = false }: { context: PayrollCalendarContext | null; value: CalendarChangeEvidence; onChange: (value: CalendarChangeEvidence) => void; disabled?: boolean }) {
  return <fieldset disabled={disabled || !context || context.currentMatchesHistory === false} className="space-y-3 disabled:opacity-60">
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="label">يسري تعديل التقويم من<input type="date" min={context?.effectiveFrom ?? undefined} className="input mt-1 w-full" value={value.effectiveFrom} onChange={event => onChange({ ...value, effectiveFrom: event.target.value })} /></label>
      <label className="label">سبب التغيير<textarea className="input mt-1 w-full" maxLength={500} value={value.reason} onChange={event => onChange({ ...value, reason: event.target.value })} /></label>
    </div>
    <p className="text-xs text-gray-600">هذا تاريخ تطبيق قرار التقويم، وليس مدة العطلة. لا ينشئ تاريخًا سابقًا مفترضًا، والفترات المعتمدة أو المصروفة تحتاج معالجة مستقلة.</p>
  </fieldset>
}
export function CalendarScopeConfirmation({ scope, sourceId, canConfirm, disabled = false, onConfirmed }: { scope: PayrollCalendarScope; sourceId: number; canConfirm: boolean; disabled?: boolean; onConfirmed?: () => void }) {
  const calendar = useCalendarContext(scope, sourceId)
  const [open, setOpen] = useState(false), [saving, setSaving] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  useEffect(() => { setOpen(false); setError(''); setNotice('') }, [scope, sourceId])
  const confirm = async () => {
    if (!canConfirm || !calendar.context || saving || disabled) return
    try { buildCalendarChange(calendar.context, calendar.evidence) } catch (cause) { setError((cause as Error).message); return }
    setSaving(true); setError('')
    try { await confirmPayrollCalendarContext(calendar.context, calendar.evidence); setOpen(false); setNotice('حُفظ تأكيد التقويم كاملًا من التاريخ المحدد.'); calendar.reload(); onConfirmed?.() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر حفظ التأكيد.') }
    finally { setSaving(false) }
  }
  return <section className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-3">
    <h3 className="font-semibold text-gray-800">تاريخ التقويم {scope === 'GLOBAL' ? 'العام' : scope === 'BRANCH' ? 'للفرع' : 'للموظف'}</h3>
    <CalendarContextSummary context={calendar.context} loading={calendar.loading} error={calendar.error} />
    {!canConfirm && <p className="text-xs text-gray-500">القراءة فقط لهذا النطاق؛ إدارة التقويم العام تحتاج صلاحية ونطاقًا شاملًا.</p>}
    {canConfirm && !open && <button type="button" disabled={disabled || saving || !calendar.context || calendar.context.currentMatchesHistory === false} className="btn-secondary text-sm disabled:opacity-50" onClick={() => setOpen(true)}>تأكيد التقويم الحالي من تاريخ</button>}
    {calendar.error && <button type="button" className="btn-secondary text-sm" disabled={saving} onClick={calendar.reload}>إعادة تحميل السياق</button>}
    {open && <><p className="text-sm text-gray-700">أؤكد أن جميع القيم الحالية لهذا النطاق، بما فيها العطلات والقواعد المسجلة، تسري من التاريخ الذي أحدده. لا يغير هذا الإجراء القيم المعروضة.</p><CalendarChangeFields context={calendar.context} value={calendar.evidence} onChange={calendar.setEvidence} disabled={saving || disabled} /><div className="flex flex-wrap gap-2"><button type="button" className="btn-primary disabled:opacity-50" disabled={saving || disabled || !calendar.context || calendar.context.currentMatchesHistory === false} onClick={confirm}>{saving ? 'جارٍ التأكيد...' : 'تأكيد القيم الحالية'}</button><button type="button" className="btn-secondary" disabled={saving} onClick={() => setOpen(false)}>إلغاء</button></div></>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}{notice && <p role="status" className="text-sm text-green-700">{notice}</p>}
  </section>
}
export function CalendarMutationDialog({ scope, sourceId, title, description, onClose, onSave }: { scope: PayrollCalendarScope; sourceId: number; title: string; description: string; onClose: () => void; onSave: (change: PayrollCalendarChange, context: PayrollCalendarContext) => Promise<void> }) {
  const calendar = useCalendarContext(scope, sourceId)
  const [saving, setSaving] = useState(false), [error, setError] = useState('')
  const save = async () => {
    if (saving) return
    try { const change = buildCalendarChange(calendar.context, calendar.evidence); setSaving(true); setError(''); await onSave(change, calendar.context!); onClose() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر حفظ تغيير التقويم.') }
    finally { setSaving(false) }
  }
  return <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center"><div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4">
    <h2 className="text-lg font-bold text-gray-800">{title}</h2><p className="text-sm text-gray-600">{description}</p>
    <CalendarContextSummary context={calendar.context} loading={calendar.loading} error={calendar.error} />
    <CalendarChangeFields context={calendar.context} value={calendar.evidence} onChange={calendar.setEvidence} disabled={saving} />
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="flex gap-2"><button type="button" className="btn-primary disabled:opacity-50" disabled={saving || !calendar.context || calendar.context.currentMatchesHistory === false} onClick={save}>{saving ? 'جارٍ الحفظ...' : 'حفظ التغيير'}</button><button type="button" className="btn-secondary" disabled={saving} onClick={onClose}>إلغاء</button></div>
  </div></div>
}
