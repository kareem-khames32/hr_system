'use client'

import { useEffect, useRef, useState } from 'react'
import { Database, Search } from 'lucide-react'
import { can, fetchEmployeeDirectory, type ApiEmployeeDirectoryEntry } from '../lib/api'
import { PayrollSalaryHistoryEditor } from './PayrollSalaryHistoryEditor'
import { payrollPoliciesError, type PayrollCollectionView } from '../lib/payroll-policies-api'
import { LIVE_SOURCE_LABELS, liveSourceAmount, liveSourceDate, liveSourceDayKind, liveSourceProofLabel, liveSourceMessage, liveSourceMinutes, liveSourcePeriodError, liveSourceRecord, liveSourceRows, liveSourceRowReasons, liveSourceRowStatus, liveSourceStateLabel, readPayrollLiveSources, type PayrollLiveSources, type LiveSourceSection } from '../lib/payroll-live-sources-api'

const salaryLabels: Record<string, string> = { basicSalary: 'الأساسي', housingAllowance: 'السكن', transportAllowance: 'الانتقال', phoneAllowance: 'الهاتف', workNatureAllowance: 'طبيعة العمل', otherAllowance: 'أخرى' }
function DayEvidenceNotes({ row }: { row: Record<string, unknown> }) {
  const issues = liveSourceRows(row.issues)
  const refs = Array.isArray(row.sourceRefs) ? row.sourceRefs.filter((ref): ref is string => typeof ref === 'string' && ref.length > 0 && ref.length <= 500).slice(0, 30) : []
  return <div className="space-y-1">{issues.map((issue, index) => <p key={index} className="text-xs text-amber-800">{liveSourceMessage(issue.message)}</p>)}{refs.length > 0 && <details className="text-xs text-gray-500"><summary className="cursor-pointer">مراجع الأدلة ({refs.length})</summary><ul className="space-y-1 mt-2">{refs.map((ref, index) => <li key={index} dir="ltr" className="break-all">{ref}</li>)}</ul></details>}</div>
}
function CalendarDayDetails({ days }: { days: Record<string, unknown>[] }) {
  const time = (value: unknown) => typeof value === 'string' && /^\d{2}:\d{2}(?::\d{2})?$/.test(value) ? value : 'غير مثبت'
  return <div className="space-y-3"><p className="text-sm text-amber-800">الجدول يعرض الإسناد وقواعد التوقيت المقروءة لكل يوم. تحديد أيام العمل يحتاج أيضًا تقويمًا مؤرخًا؛ لا تتحول الأيام غير المثبتة إلى غياب.</p><div className="overflow-x-auto"><table className="w-full text-sm min-w-[900px]"><thead><tr className="table-header">{['اليوم', 'حالة التقويم / نوع اليوم', 'حالة التوقيت', 'بداية / نهاية', 'دقائق الدوام المطلوبة', 'المرونة', 'الأدلة والملاحظات'].map(label => <th key={label} className="table-cell">{label}</th>)}</tr></thead><tbody>{days.slice(0, 32).map((row, index) => { const timing = liveSourceRecord(row.timing); return <tr key={index} className="table-row"><td className="table-cell whitespace-nowrap">{liveSourceDate(row.date)}</td><td className="table-cell"><p>{liveSourceStateLabel(row.calendarState)}</p><p className="text-xs mt-1">{row.calendarState === 'AVAILABLE' ? liveSourceDayKind(row.dayKind) : 'نوع اليوم غير مثبت'}</p></td><td className="table-cell">{liveSourceStateLabel(row.timingState)}</td><td className="table-cell whitespace-nowrap" dir="ltr">{time(timing?.startTime)} / {time(timing?.endTime)}</td><td className="table-cell">{liveSourceMinutes(timing?.requiredWorkMinutes)}</td><td className="table-cell">{timing?.flexEnabled === true ? `${liveSourceMinutes(timing.flexWindowMinutes)} دقيقة` : timing?.flexEnabled === false ? 'غير مفعلة' : 'غير مثبتة'}</td><td className="table-cell min-w-[200px]"><DayEvidenceNotes row={row} /></td></tr> })}</tbody></table></div></div>
}
function AttendanceDayDetails({ days, totals }: { days: Record<string, unknown>[]; totals: Record<string, unknown> | null }) {
  const instant = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && value.length <= 35 && Number.isFinite(Date.parse(value)) ? value : 'غير مثبت'
  return <div className="space-y-3"><p className="text-sm text-gray-600">الدقائق القديمة وحدها لا تثبت ثواني التأخير. تظهر الأرقام التالية عندما يثبت دليل اليوم؛ اليوم الناقص لا يُحسب صفرًا.</p><div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{Object.entries({ workedDays: 'أيام الحضور', absentDays: 'أيام الغياب', shortfallMinutes: 'دقائق نقص الدوام', paidPermissionDeductibleMinutes: 'دقائق الأذونات القابلة للخصم' }).map(([key, label]) => <div key={key} className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">{label}</p><p className="font-semibold mt-1">{liveSourceMinutes(totals?.[key])}</p></div>)}</div><div className="overflow-x-auto"><table className="w-full text-sm min-w-[950px]"><thead><tr className="table-header">{['اليوم', 'الحالة / الدليل', 'التأخير الخام / المستثنى بالثواني', 'نقص الدوام / دقائق', 'تفصيل الإثبات', 'الملاحظات والمراجع'].map(label => <th key={label} className="table-cell">{label}</th>)}</tr></thead><tbody>{days.slice(0, 32).map((row, index) => {
    const proof = row.state === 'AVAILABLE' ? liveSourceRecord(row.proof) : null
    const measured = proof?.basis === 'UNIQUE_RAW_PUNCH_PAIR_VERIFIED' || proof?.basis === 'EXPLICIT_STORED_ABSENCE_VERIFIED'
    const tier = measured ? liveSourceRecord(proof?.tierDay) : null
    const excluded = proof?.basis === 'DATED_NON_WORKING_DAY' || proof?.basis === 'OUTSIDE_EMPLOYMENT_COVERAGE'
    return <tr key={index} className="table-row"><td className="table-cell whitespace-nowrap">{liveSourceDate(row.date)}</td><td className="table-cell"><p>{liveSourceStateLabel(row.state)}</p><p className="text-xs mt-1">{liveSourceProofLabel(proof?.basis)}</p>{typeof row.status === 'string' && <p className="text-xs text-gray-500 mt-1">{liveSourceRowStatus(row)}</p>}</td><td className="table-cell" dir="ltr">{excluded ? 'لا ينطبق' : `${liveSourceAmount(tier?.rawLateSeconds)} / ${liveSourceAmount(tier?.excusedLateSeconds)}`}</td><td className="table-cell">{excluded ? 'لا ينطبق' : liveSourceMinutes(measured ? proof?.shortfallMinutes : null)}</td><td className="table-cell min-w-[220px]">{measured ? <details className="text-xs"><summary className="cursor-pointer">وقت الاحتساب والبصمات</summary><dl className="mt-2 space-y-2"><div><dt>احتُسب في</dt><dd dir="ltr" className="break-all">{instant(proof?.computedAt)}</dd></div><div><dt>الدخول / الخروج</dt><dd dir="ltr" className="break-all">{instant(proof?.firstIn)} / {instant(proof?.lastOut)}</dd></div><div><dt>دقائق العمل المحتسبة</dt><dd>{liveSourceMinutes(proof?.countedWorkMinutes)}</dd></div><div><dt>المرونة / سماح الوردية</dt><dd>{tier?.flexibleStartEnabled === true ? 'المرونة مفعلة' : tier?.flexibleStartEnabled === false ? 'المرونة غير مفعلة' : 'غير مثبت'} / {liveSourceMinutes(tier?.shiftGraceMinutes)}</dd></div></dl></details> : <span className="text-xs text-gray-500">{excluded ? 'الحضور غير مطلوب لهذا اليوم' : 'لا يوجد دليل يوم مكتمل قابل للاحتساب'}</span>}</td><td className="table-cell min-w-[220px]"><DayEvidenceNotes row={row} /></td></tr>
  })}</tbody></table></div></div>
}
export function PayrollLiveSourceDetails({ name, section }: { name: string; section: LiveSourceSection }) {
  const data = liveSourceRecord(section.data)
  if (!data) return <p className="text-sm text-gray-500">لا توجد تفاصيل مقروءة قابلة للعرض لهذا المصدر.</p>
  if (name === 'compensation') {
    const salary = liveSourceRecord(data.current)
    const segments = liveSourceRows(data.datedSegments)
    const reference = typeof data.referencePeriod === 'string' && /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(data.referencePeriod) ? data.referencePeriod : null
    const historyConfirmed = section.state === 'AVAILABLE' && data.basis === 'SINGLE_PAYROLL_PERIOD_SALARY' && reference !== null && data.currentSourceUnchanged === true && segments.length === 1 && segments.every(row => typeof row.from === 'string' && typeof row.to === 'string' && liveSourcePeriodError(row.from, row.to) === null && ['EGP', 'SAR'].includes(String(row.currency)) && Object.keys(salaryLabels).every(key => liveSourceAmount(liveSourceRecord(row.salary)?.[key]) !== 'غير مثبت'))
    return <div className="space-y-3"><p className="text-xs text-amber-800 mb-3">{historyConfirmed ? `راتب شهر ${reference} موثق بقيمة واحدة للفترة كاملة. القيم التالية من الملف الحالي، وراتب شهر المسير المختار في الجدول أسفلها.` : 'هذه القيم الحالية في ملف الموظف. سريانها على الفترة المختارة لم يُثبت بعد.'}</p><dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">{Object.entries(salaryLabels).map(([code, label]) => <div key={code} className="rounded-lg bg-gray-50 p-3"><dt className="text-xs text-gray-500">{label}</dt><dd className="font-semibold mt-1" dir="ltr">{liveSourceAmount(salary?.[code])}</dd></div>)}</dl>{segments.length > 0 && <div className="overflow-x-auto"><table className="w-full text-sm min-w-[750px]"><thead><tr className="table-header"><th className="table-cell">تغطية الخدمة بنفس الراتب الشهري</th><th className="table-cell">العملة</th>{Object.values(salaryLabels).map(label => <th key={label} className="table-cell">{label}</th>)}</tr></thead><tbody>{segments.map((row, i) => <tr key={i} className="table-row"><td className="table-cell whitespace-nowrap">{liveSourceDate(row.from)} / {liveSourceDate(row.to)}</td><td className="table-cell">{row.currency === 'EGP' ? 'جنيه' : row.currency === 'SAR' ? 'ريال' : 'غير مثبت'}</td>{Object.keys(salaryLabels).map(key => <td key={key} className="table-cell" dir="ltr">{liveSourceAmount(liveSourceRecord(row.salary)?.[key])}</td>)}</tr>)}</tbody></table></div>}</div>
  }
  if (name === 'schedule') return <CalendarDayDetails days={liveSourceRows(data.days)} />
  if (name === 'attendance' && Array.isArray(data.days)) return <AttendanceDayDetails days={liveSourceRows(data.days)} totals={liveSourceRecord(data.totals)} />
  if (name === 'employment') {
    const coverage = liveSourceRecord(data.coverage)
    const valid = coverage && typeof coverage.from === 'string' && typeof coverage.to === 'string' && liveSourcePeriodError(coverage.from, coverage.to) === null && typeof coverage.days === 'number' && Number.isSafeInteger(coverage.days) && coverage.days > 0 && coverage.days <= 32
    return <p className="text-sm text-gray-700">{valid ? `التغطية المقروءة: ${coverage.from} إلى ${coverage.to} · ${coverage.days} يومًا تقويميًا.` : 'لا توجد تغطية وظيفية مثبتة قابلة للعرض لهذه الفترة.'}</p>
  }
  if (!Object.prototype.hasOwnProperty.call(LIVE_SOURCE_LABELS, name)) return <p className="text-sm text-gray-500">تفاصيل هذا المصدر تحتاج إصدارًا أحدث من شاشة القراءة.</p>
  const rows = liveSourceRows(data.rows ?? data.positions ?? data.entries)
  const missing = Array.isArray(data.missingDates) ? data.missingDates.length : 0
  return <div className="space-y-3"><p className="text-xs text-gray-500">{rows.length} سجلًا مقروءًا{missing > 0 ? ` · ${missing} يومًا بلا سجل حضور` : ''}</p>
    {rows.length > 0 && <div className="overflow-x-auto"><table className="w-full text-sm min-w-[540px]"><thead><tr className="text-right text-gray-500 border-b"><th className="py-2 pl-3">السجل</th><th className="pl-3">التاريخ</th><th className="pl-3">{name === 'attendance' ? 'التأخير المسجل / دقيقة' : 'المبلغ المسجل'}</th><th>الحالة والملاحظات</th></tr></thead><tbody>{rows.slice(0, 100).map((row, index) => <tr key={index} className="border-b last:border-0"><td className="py-3 pl-3">{typeof row.id === 'number' && Number.isSafeInteger(row.id) && row.id > 0 ? `#${row.id}` : 'غير مثبت'}</td><td className="pl-3 whitespace-nowrap">{liveSourceDate(row.date ?? row.dueDate ?? row.effectiveDate, (name === 'credits' || name === 'otherDebits') && row.effectiveDate === null)}</td><td dir="ltr" className="text-right pl-3">{name === 'attendance' ? liveSourceMinutes(row.unexcusedLateMinutes) : liveSourceAmount(row.approvedAmount ?? row.remainingAmount ?? row.amount)}</td><td className="py-3"><p className="font-medium">{liveSourceRowStatus(row)}</p>{row.eligible === false && <p className="text-xs text-amber-800 mt-1">مستبعد من المصادر المتاحة</p>}{liveSourceRowReasons(row).map((reason, reasonIndex) => <p key={reasonIndex} className="text-xs text-gray-500 mt-1">{reason}</p>)}</td></tr>)}</tbody></table></div>}
    {rows.length > 100 && <p className="text-xs text-gray-500">معروض أول 100 سجل من {rows.length} سجلًا.</p>}
  </div>
}

export function PayrollLiveSourcesResult({ result }: { result: PayrollLiveSources }) {
  return <div className="space-y-4">
    <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900 space-y-1"><p className="font-bold">{result.snapshot.employee.fullName} · {result.snapshot.employee.employeeCode}</p><p>{result.snapshot.period.startDate} إلى {result.snapshot.period.endDate} · مراجعة السياسة {result.snapshot.policy.revision}</p><p className="text-xs">وقت القراءة: {new Date(result.capturedAt).toLocaleString('ar-EG')}</p></div>
    <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">الفحص يوضح المصادر المتاحة وما يحتاج استكمالًا. حساب المسير بهذه المصادر لم يُفعّل بعد.</p>
    {Object.entries(result.snapshot.sections).map(([name, section]) => <details key={name} className="rounded-xl border border-gray-200 p-4" open={section.state !== 'AVAILABLE'}><summary className="cursor-pointer font-semibold text-gray-800"><span>{Object.prototype.hasOwnProperty.call(LIVE_SOURCE_LABELS, name) ? LIVE_SOURCE_LABELS[name] : 'مصدر إضافي'}</span><span className={`text-xs mr-3 rounded-full px-2 py-1 ${section.state === 'AVAILABLE' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-800'}`}>{liveSourceStateLabel(section.state)}</span></summary><div className="mt-4 space-y-3"><PayrollLiveSourceDetails name={name} section={section} />{section.issues.length > 0 && <ul className="space-y-1 text-sm text-amber-900 list-disc pr-5">{section.issues.map((issue, index) => <li key={index}>{liveSourceMessage(issue.message)}</li>)}</ul>}</div></details>)}
    {result.snapshot.blockers.some(row => row.section === 'policy') && <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900"><p className="font-bold mb-2">مراجعة السياسة</p>{result.snapshot.blockers.filter(row => row.section === 'policy').map((row, index) => <p key={index}>{liveSourceMessage(row.message)}</p>)}</div>}
  </div>
}

export function PayrollLiveSourcesPanel({ view, canCalculate, policyDirty, onHistoryDirtyChange }: { view: PayrollCollectionView; canCalculate: boolean; policyDirty: boolean; onHistoryDirtyChange?: (dirty: boolean) => void }) {
  const [employees, setEmployees] = useState<ApiEmployeeDirectoryEntry[]>([])
  const [employeeId, setEmployeeId] = useState('')
  const [search, setSearch] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [result, setResult] = useState<PayrollLiveSources | null>(null)
  const [error, setError] = useState('')
  const [directoryError, setDirectoryError] = useState('')
  const [directoryLoading, setDirectoryLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [historyDirty, setHistoryDirty] = useState(false)
  const [reload, setReload] = useState(0)
  const active = useRef(true)
  const pending = useRef<AbortController | null>(null)
  useEffect(() => {
    active.current = true
    if (canCalculate) {
      setDirectoryLoading(true); setDirectoryError('')
      let cancelled = false
      fetchEmployeeDirectory().then(rows => { if (!cancelled) setEmployees(rows) }).catch(cause => { if (!cancelled) setDirectoryError(payrollPoliciesError(cause)) }).finally(() => { if (!cancelled) setDirectoryLoading(false) })
      return () => { cancelled = true; active.current = false; pending.current?.abort() }
    }
    return () => { active.current = false; pending.current?.abort() }
  }, [canCalculate, reload])
  useEffect(() => {
    pending.current?.abort(); pending.current = null
    setResult(null); setError(''); setLoading(false)
  }, [policyDirty, view.policyId, view.versionId, view.revision])
  function clear() { setResult(null); setError('') }
  async function read() {
    const issue = liveSourcePeriodError(start, end)
    if (!employeeId || issue) { setError(issue ?? 'اختر الموظف أولًا.'); return }
    if (loading || policyDirty || historyDirty || !canCalculate) return
    const controller = new AbortController(); pending.current = controller
    setLoading(true); setError(''); setResult(null)
    try {
      const response = await readPayrollLiveSources(view.policyId, view.versionId, view.revision, Number(employeeId), start, end, controller.signal)
      if (active.current && !controller.signal.aborted) setResult(response)
    } catch (cause) { if (active.current && !controller.signal.aborted) setError(payrollPoliciesError(cause)) }
    finally { if (active.current && !controller.signal.aborted) setLoading(false) }
  }
  const choices = employees.filter(row => !search.trim() || `${row.fullName} ${row.employeeCode}`.toLowerCase().includes(search.trim().toLowerCase()) || String(row.id) === employeeId)
  return <section className="card space-y-5" aria-label="فحص مصادر حساب الموظف">
    <div className="flex gap-3"><Database className="text-primary-600 shrink-0" size={22} /><div><h2 className="text-lg font-bold text-gray-800">فحص مصادر حساب الموظف</h2><p className="text-sm text-gray-500 mt-1">راجع الأجر والحضور والإضافي والسلف والمستحقات للفترة المختارة قبل ربطها بالمسير.</p></div></div>
    {!canCalculate ? <p className="text-sm text-gray-500">عرض هذه المصادر يتطلب صلاحية احتساب الرواتب.</p> : <>
      <p className="text-xs text-gray-500">قائمة الاختيار تعرض الموظفين النشطين المتاحين لصلاحياتك حاليًا؛ لا تمثل سجل جميع الموظفين التاريخي.</p>
      {directoryError && <p role="alert" className="text-red-700 text-sm">{directoryError} <button type="button" className="underline disabled:opacity-50" disabled={loading} onClick={() => setReload(value => value + 1)}>إعادة تحميل الموظفين</button></p>}
      <div className="grid sm:grid-cols-2 gap-4"><div className="space-y-2"><label htmlFor="payroll-source-search" className="text-sm font-medium">بحث في الموظفين النشطين</label><input id="payroll-source-search" className="input" placeholder="الاسم أو كود الموظف" value={search} disabled={loading} onChange={event => setSearch(event.target.value)} /><label htmlFor="payroll-source-employee" className="sr-only">الموظف</label><select id="payroll-source-employee" className="input" value={employeeId} disabled={loading || directoryLoading || historyDirty} onChange={event => { setEmployeeId(event.target.value); clear() }}><option value="">{directoryLoading ? 'جارٍ تحميل الموظفين…' : 'اختر الموظف'}</option>{choices.map(row => <option key={row.id} value={row.id}>{row.fullName} · {row.employeeCode}</option>)}</select></div><div className="grid grid-cols-2 gap-3"><div><label htmlFor="payroll-source-start" className="block text-sm font-medium mb-2">بداية الفترة</label><input id="payroll-source-start" type="date" className="input" value={start} disabled={loading} onChange={event => { setStart(event.target.value); clear() }} /></div><div><label htmlFor="payroll-source-end" className="block text-sm font-medium mb-2">نهاية الفترة</label><input id="payroll-source-end" type="date" className="input" value={end} disabled={loading} onChange={event => { setEnd(event.target.value); clear() }} /></div></div></div>
      {policyDirty && <p className="text-sm text-amber-800">احفظ تعديل ترتيب التحصيل أو تجاهله قبل فحص النسخة المحفوظة.</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button type="button" className="btn-primary inline-flex items-center gap-2 disabled:opacity-50" disabled={loading || directoryLoading || policyDirty || historyDirty || !employeeId || !start || !end} onClick={() => void read()}><Search size={17} />{loading ? 'جارٍ قراءة المصادر…' : 'فحص المصادر'}</button>
      {result && !policyDirty && <PayrollLiveSourcesResult result={result} />}
      {historyDirty && <p className="text-sm text-amber-800">احفظ مراجعة الأجر أو تجاهل تعديلاتها قبل تغيير الموظف أو فحص المصادر.</p>}
      {employeeId && <PayrollSalaryHistoryEditor key={employeeId} employeeId={Number(employeeId)} canEdit={can('payroll.approve')} disabled={loading || policyDirty} onDirtyChange={value => { setHistoryDirty(value); onHistoryDirtyChange?.(value); if (value) clear() }} onSaved={clear} />}
    </>}
  </section>
}
