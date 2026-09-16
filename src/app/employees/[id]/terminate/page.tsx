'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { UserMinus, ArrowRight, Calculator, ClipboardCheck } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import {
  fetchEmployee, fetchOffboardingPreview, createOffboardingCase,
  type ApiEmployee, type ApiOffboardingPreview, type TerminationReason,
} from '@/lib/api'
import { currencyLabel, useCurrency } from '@/lib/currency'
import { employeeStatusLabels, custodyStatusLabels } from '@/lib/status-labels'
import { localToday } from '@/lib/dates'
// نفس التسميات تظهر لاحقاً في «تفاصيل القرار» بصفحة ملف إنهاء الخدمة
import { TERMINATION_REASON_LABELS as reasons } from '@/lib/termination-reasons'

export default function TerminateEmployeePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const employeeId = Number(params.id)
  const systemCurrency = useCurrency()
  const [employee, setEmployee] = useState<ApiEmployee | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reason, setReason] = useState<TerminationReason>('termination')
  const [lastWorkingDay, setLastWorkingDay] = useState('')
  const [noticeDate, setNoticeDate] = useState(localToday())
  const [notes, setNotes] = useState('')
  const [exitInterviewNotes, setExitInterviewNotes] = useState('')
  const [revokeAccess, setRevokeAccess] = useState(false)
  const [preview, setPreview] = useState<ApiOffboardingPreview | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [createdId, setCreatedId] = useState<number | null>(null)
  const currency = employee?.currency ? currencyLabel(employee.currency) : systemCurrency
  const previewMatches = preview?.employeeId === employeeId && preview.reason === reason && preview.lastWorkingDay === lastWorkingDay

  useEffect(() => {
    if (!Number.isSafeInteger(employeeId) || employeeId <= 0) { setError('رقم الموظف غير صالح'); setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetchEmployee(employeeId).then(row => { if (!cancelled) setEmployee(row) })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'تعذر تحميل الموظف') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [employeeId])

  const inputError = () => !lastWorkingDay ? 'حدد آخر يوم عمل' : noticeDate && noticeDate > lastWorkingDay ? 'تاريخ الإشعار لا يمكن أن يكون بعد آخر يوم عمل' : employee?.joinDate && lastWorkingDay < employee.joinDate.slice(0, 10) ? 'آخر يوم عمل لا يمكن أن يسبق تاريخ التعيين' : ''
  const loadPreview = async () => {
    const issue = inputError()
    if (issue) { setError(issue); return }
    setError('')
    setPreview(null)
    setPreviewing(true)
    try { setPreview(await fetchOffboardingPreview({ employeeId, reason, lastWorkingDay })) }
    catch (err) { setError(err instanceof Error ? err.message : 'تعذر تحميل معاينة إنهاء الخدمة') }
    finally { setPreviewing(false) }
  }
  const submit = async () => {
    if (saving || createdId || !previewMatches || preview?.blockReason) return
    const issue = inputError()
    if (issue) { setError(issue); return }
    setSaving(true)
    setError('')
    try {
      const created = await createOffboardingCase({ employeeId, reason, lastWorkingDay, noticeDate: noticeDate || undefined, notes: notes.trim() || undefined, exitInterviewNotes: exitInterviewNotes.trim() || undefined, revokeAccess })
      if (!created?.id) throw new Error('لم يرجع الخادم رقم ملف إنهاء الخدمة. راجع قائمة الملفات قبل إعادة المحاولة.')
      setCreatedId(created.id)
      router.push(`/offboarding/${created.id}`)
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر فتح ملف إنهاء الخدمة') }
    finally { setSaving(false) }
  }

  return <MainLayout><div className="max-w-5xl mx-auto space-y-6">
    <div className="flex items-center gap-4"><Link href={`/employees/${employeeId}`} className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors" aria-label="العودة لملف الموظف"><ArrowRight size={20} className="text-gray-600" /></Link><div><h1 className="text-2xl font-bold text-gray-800">إنهاء خدمة موظف</h1><p className="text-sm text-gray-500 mt-1">إشعار ثم إخلاء طرف وتصفية؛ الإغلاق النهائي يتبع اعتماد التصفية وآخر يوم عمل.</p></div></div>
    {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
    {createdId && <div role="status" className="bg-success-50 text-success-700 rounded-xl p-4">تم فتح ملف إنهاء الخدمة #{createdId}. <Link href={`/offboarding/${createdId}`} className="underline">متابعة الإخلاء والتصفية</Link></div>}
    {loading ? <div className="card text-center p-10">جارٍ تحميل بيانات الموظف...</div> : !employee ? <div className="card text-gray-500">لا تتوفر بيانات موظف صالحة لفتح الملف.</div> : <>
      <div className="card flex items-center gap-4 border-r-4 border-red-500"><UserMinus className="text-red-500 shrink-0" size={34} /><div><h2 className="text-xl font-bold text-gray-800">{employee.fullName}</h2><p className="text-sm text-gray-500">{employee.employeeCode} • {employee.jobTitle || 'المسمى غير مسجل'} • {employeeStatusLabels[employee.status] ?? employee.status}</p><p className="text-sm text-gray-500 mt-1">تاريخ التعيين: {employee.joinDate?.slice(0, 10) || 'غير مسجل'} • مهلة الإشعار في الملف: {employee.noticePeriodDays != null ? `${employee.noticePeriodDays} يوم` : 'غير محددة'}</p></div></div>
      <fieldset disabled={saving || createdId !== null} className="card space-y-5 disabled:opacity-70">
        <h2 className="font-bold text-lg">تفاصيل القرار</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <label className="text-sm text-gray-600">سبب الإنهاء<select value={reason} onChange={event => setReason(event.target.value as TerminationReason)} className="input mt-2 w-full">{Object.entries(reasons).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
          <label className="text-sm text-gray-600">آخر يوم عمل *<input type="date" value={lastWorkingDay} min={employee.joinDate?.slice(0, 10)} onChange={event => setLastWorkingDay(event.target.value)} className="input mt-2 w-full" /></label>
          <label className="text-sm text-gray-600">تاريخ الإشعار<input type="date" value={noticeDate} max={lastWorkingDay || undefined} onChange={event => setNoticeDate(event.target.value)} className="input mt-2 w-full" /></label>
        </div>
        <div className="grid sm:grid-cols-2 gap-4"><label className="text-sm text-gray-600">ملاحظات القرار<textarea rows={3} maxLength={1000} value={notes} onChange={event => setNotes(event.target.value)} className="input mt-2 w-full" /></label><label className="text-sm text-gray-600">ملاحظات مقابلة الخروج<textarea rows={3} maxLength={1000} value={exitInterviewNotes} onChange={event => setExitInterviewNotes(event.target.value)} className="input mt-2 w-full" /></label></div>
        {reason === 'death' ? <p className="text-sm text-amber-700">عند تسجيل الوفاة يُوقَف حساب الدخول فور فتح الملف.</p> : <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={revokeAccess} onChange={event => setRevokeAccess(event.target.checked)} />إيقاف حساب دخول الموظف فور فتح الملف</label>}
        <button type="button" onClick={loadPreview} disabled={previewing || !lastWorkingDay} className="btn-secondary inline-flex items-center gap-2"><Calculator size={18} />{previewing ? 'جارٍ حساب المعاينة...' : 'معاينة الإخلاء والتصفية'}</button>
      </fieldset>
      {previewMatches && preview && <div className="card space-y-5">
        <h2 className="font-bold text-lg flex items-center gap-2"><ClipboardCheck size={20} />مراجعة البيانات قبل فتح الملف</h2>
        {preview.blockReason && <p role="alert" className="bg-red-50 p-3 rounded-xl text-red-700">{preview.blockReason}</p>}
        <p className="text-sm text-gray-600">سنوات الخدمة: {preview.serviceYears} • معامل المكافأة: {preview.eos.factorLabel}. المعاينة من سياسات النظام الحالية، وقد تتغير البنود عند إتمام الإخلاء.</p>
        {preview.canViewSettlement ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-50"><th className="text-right p-3">البند</th><th className="p-3">النوع</th><th className="p-3">المبلغ</th></tr></thead><tbody>{preview.lines?.map((line, index) => <tr key={index} className="border-t border-gray-100"><td className="p-3">{line.label}</td><td className="p-3 text-center">{line.type === 'CREDIT' ? 'استحقاق' : 'خصم'}</td><td className="p-3 text-center">{Number(line.amount).toLocaleString('en-US')} {currency}</td></tr>)}</tbody></table><p className="font-bold text-primary-700 mt-3">صافي المعاينة: {Number(preview.net ?? 0).toLocaleString('en-US')} {currency}</p></div> : <p className="text-sm text-gray-500">المبالغ متاحة لأصحاب صلاحية التصفية.</p>}
        <div><h3 className="font-bold mb-2">العهد المفتوحة ({preview.openCustody.length})</h3>{preview.openCustody.length ? <ul className="space-y-2 text-sm">{preview.openCustody.map(item => <li key={item.id} className="bg-gray-50 rounded-lg p-3">{item.assetName} • {item.serialNumber || 'بدون رقم تسلسلي'} • {custodyStatusLabels[item.status] ?? item.status}</li>)}</ul> : <p className="text-sm text-gray-500">لا توجد عهد مفتوحة.</p>}<p className="text-xs text-gray-500 mt-2">تأكيد التسليم يتم داخل ملف الإخلاء بواسطة الجهة المسؤولة.</p></div>
        <button type="button" onClick={submit} disabled={saving || createdId !== null || !!preview.blockReason} className="btn-primary">{saving ? 'جارٍ فتح الملف...' : 'تأكيد فتح ملف إنهاء الخدمة'}</button>
      </div>}
    </>}
  </div></MainLayout>
}
