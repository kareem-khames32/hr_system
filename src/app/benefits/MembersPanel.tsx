'use client'

// B5.2 (ب): «الأعضاء وطلبات شركة التأمين» — اشتراك الموظف ومعاليه المشمولين بالتأمين، وطلبات الإضافة والحذف (مستني الكشف ← اتبعت ← تم)،
// وكشف شركة التأمين ملف بيتنزّل. طلبات الحذف مع إنهاء الخدمة ومع حذف المعال بتطلع لوحدها. مفيش مبلغ هنا.
import { useCallback, useEffect, useState } from 'react'
import { csvDateStamp, downloadCsv } from '@/lib/csv'
import { formatDate } from '@/lib/dates'
import { cancelInsuranceRequest, doneInsuranceRequest, fetchInsuranceMembers, fetchInsuranceSheet, requestInsuranceAdd, requestInsuranceRemove, sendInsuranceRequest,
  type ApiInsuranceMember, type ApiInsuranceMembers, type ApiInsuranceRequest } from '@/lib/benefits-api'

const RELATION_LABELS: Record<string, string> = { SPOUSE: 'زوج/زوجة', SON: 'ابن', DAUGHTER: 'ابنة', FATHER: 'أب', MOTHER: 'أم', OTHER: 'أخرى' }
const relationOf = (relation: string | null) => (relation ? RELATION_LABELS[relation] ?? relation : 'الموظف')
type Form = { kind: 'remove'; enrollmentId: number; reason: string } | { kind: 'done'; request: ApiInsuranceRequest; cardNumber: string; effectiveDate: string } | { kind: 'cancel'; requestId: number; reason: string }

export function MembersPanel() {
  const [data, setData] = useState<ApiInsuranceMembers | null>(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState<Form | null>(null)
  const [onlyOpen, setOnlyOpen] = useState(true)

  const load = useCallback(() => {
    fetchInsuranceMembers().then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل الاشتراكات'))
  }, [])
  useEffect(load, [load])

  async function run(work: () => Promise<ApiInsuranceMembers>, done: string) {
    setBusy(true); setError(''); setInfo('')
    try {
      setData(await work())
      setInfo(done)
      setForm(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر الحفظ')
    } finally {
      setBusy(false)
    }
  }
  const add = (member: ApiInsuranceMember) => run(() => requestInsuranceAdd(member.employeeId, member.dependentId), `اتسجّل طلب إضافة «${member.memberName}»`)
  async function submit() {
    if (!form) return
    if (form.kind === 'remove') await run(() => requestInsuranceRemove(form.enrollmentId, form.reason.trim()), 'اتسجّل طلب الحذف')
    else if (form.kind === 'cancel') await run(() => cancelInsuranceRequest(form.requestId, form.reason.trim()), 'اتلغى الطلب')
    else await run(() => doneInsuranceRequest(form.request.id, form.effectiveDate, form.cardNumber.trim()), form.request.kind === 'ADD' ? 'اتسجّل الاشتراك' : 'انتهى الاشتراك')
  }
  async function sheet(status: 'PENDING' | 'SENT') {
    setError('')
    try {
      const result = await fetchInsuranceSheet(status)
      downloadCsv(`كشف-شركة-التأمين-${csvDateStamp()}.csv`, ['الطلب', 'النوع', 'الموظف', 'كود الموظف', 'العضو', 'الاسم بالإنجليزي', 'القرابة', 'تاريخ الميلاد', 'رقم الهوية', 'الوثيقة', 'رقم الوثيقة', 'الفئة', 'رقم البطاقة', 'السبب'],
        result.rows.map((row) => [row.requestId, row.kindLabel, row.employeeName, row.employeeCode, row.memberName, row.memberNameEn, relationOf(row.relation), row.birthDate, row.nationalId, row.policyName, row.policyNumber,
          row.className, row.cardNumber, row.reason]))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تنزيل الكشف')
    }
  }

  if (!data) return error ? <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div> : null
  if (!data.ready) return <div role="alert" className="bg-amber-50 text-amber-800 rounded-xl p-4">جداول اشتراكات التأمين ناقصة — طبّق ترحيلي 146 و147 الأول.</div>
  const requests = data.requests.filter((row) => !onlyOpen || row.status === 'PENDING' || row.status === 'SENT')
  const pending = data.requests.filter((row) => row.status === 'PENDING').length
  const formValid = form === null ? false : form.kind === 'done' ? form.effectiveDate !== '' && (form.request.kind === 'REMOVE' || form.cardNumber.trim() !== '') : form.reason.trim() !== ''

  return (
    <>
      {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
      {info && <div role="status" className="bg-green-50 text-green-700 rounded-xl p-4">{info}</div>}

      <div className="card space-y-3" data-insurance-requests>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-800">طلبات شركة التأمين</h2>
          <label className="text-sm text-gray-600 inline-flex items-center gap-2">
            <input type="checkbox" checked={onlyOpen} onChange={(event) => setOnlyOpen(event.target.checked)} />
            المفتوحة بس
          </label>
          <span className="mr-auto inline-flex gap-2">
            <button type="button" className="btn-secondary text-sm disabled:opacity-50" disabled={pending === 0} onClick={() => sheet('PENDING')}>تنزيل كشف المستنية ({pending})</button>
            <button type="button" className="btn-secondary text-sm" onClick={() => sheet('SENT')}>كشف اللي اتبعتت</button>
          </span>
        </div>
        {form && (
          <div className="bg-gray-50 rounded-xl p-3 flex flex-wrap items-end gap-3" data-insurance-request-form>
            {form.kind === 'done' ? (
              <>
                <span className="text-sm text-gray-700">رد شركة التأمين على طلب {form.request.kindLabel} «{form.request.memberName}»:</span>
                {form.request.kind === 'ADD' && (
                  <label className="text-sm text-gray-600">
                    رقم البطاقة
                    <input className="input mt-1 w-40" dir="ltr" maxLength={60} value={form.cardNumber} onChange={(event) => setForm({ ...form, cardNumber: event.target.value })} />
                  </label>
                )}
                <label className="text-sm text-gray-600">
                  {form.request.kind === 'ADD' ? 'بداية التغطية' : 'نهاية التغطية'}
                  <input type="date" className="input mt-1" value={form.effectiveDate} onChange={(event) => setForm({ ...form, effectiveDate: event.target.value })} />
                </label>
              </>
            ) : (
              <label className="text-sm text-gray-600 grow">
                {form.kind === 'remove' ? 'سبب طلب الحذف' : 'سبب الإلغاء'}
                <input className="input mt-1 w-full" maxLength={300} value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} />
              </label>
            )}
            <button type="button" className="btn-primary text-sm disabled:opacity-50" disabled={busy || !formValid} onClick={submit}>حفظ</button>
            <button type="button" className="btn-secondary text-sm" onClick={() => setForm(null)}>رجوع</button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="table-header text-right">العضو</th>
                <th className="table-header text-center">الطلب</th>
                <th className="table-header text-center">الحالة</th>
                <th className="table-header text-right">الفئة</th>
                <th className="table-header text-right">ملاحظات</th>
                <th className="table-header" />
              </tr>
            </thead>
            <tbody>
              {requests.map((row) => (
                <tr key={row.id} className="border-t border-gray-100">
                  <td className="table-cell">
                    {row.memberName} <span className="text-xs text-gray-500">({relationOf(row.relation)}{row.relation ? ` · ${row.employeeName}` : ''})</span>
                  </td>
                  <td className="table-cell text-center">{row.kindLabel} <span className="text-xs text-gray-500">· {row.originLabel}</span></td>
                  <td className="table-cell text-center">{row.statusLabel}</td>
                  <td className="table-cell">{row.className ?? '—'}</td>
                  <td className="table-cell text-xs text-gray-600">
                    {row.reason}
                    {row.status === 'DONE' && row.effectiveDate ? <span className="block">{formatDate(row.effectiveDate)}{row.cardNumber ? <span dir="ltr"> · {row.cardNumber}</span> : null}</span> : null}
                  </td>
                  <td className="table-cell text-left">
                    {(row.status === 'PENDING' || row.status === 'SENT') && (
                      <span className="inline-flex gap-2">
                        {row.status === 'PENDING' && <button type="button" className="btn-secondary text-xs disabled:opacity-50" disabled={busy} onClick={() => run(() => sendInsuranceRequest(row.id), 'اتعلّم «اتبعت»')}>اتبعت</button>}
                        <button type="button" className="btn-primary text-xs" onClick={() => setForm({ kind: 'done', request: row, cardNumber: '', effectiveDate: '' })}>تم</button>
                        <button type="button" className="btn-secondary text-xs" onClick={() => setForm({ kind: 'cancel', requestId: row.id, reason: '' })}>إلغاء</button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {requests.length === 0 && <p className="text-gray-500 text-sm p-2">مفيش طلبات.</p>}
        </div>
      </div>

      <div className="card space-y-3" data-insurance-members>
        <h2 className="text-lg font-semibold text-gray-800">الأعضاء ({data.members.length})</h2>
        <p className="text-xs text-gray-500">الموظفين ومعاليهم المتعلّمين «مشمول بالتأمين» في سجل المعالين. طلب الإضافة على وثيقة دولة فرع الموظف وفئة درجته.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="table-header text-right">العضو</th>
                <th className="table-header text-right">الاشتراك</th>
                <th className="table-header text-center">رقم البطاقة</th>
                <th className="table-header text-center">طلب مفتوح</th>
                <th className="table-header" />
              </tr>
            </thead>
            <tbody>
              {data.members.map((member) => (
                <tr key={`${member.employeeId}:${member.dependentId ?? 0}`} className="border-t border-gray-100">
                  <td className={`table-cell ${member.dependentId === null ? 'font-semibold' : 'pr-6'}`}>
                    {member.memberName}
                    {member.dependentId === null
                      ? member.employeeCode ? <span className="text-xs text-gray-500 font-normal" dir="ltr"> · {member.employeeCode}</span> : null
                      : <span className="text-xs text-gray-500"> ({relationOf(member.relation)})</span>}
                  </td>
                  <td className="table-cell">
                    {member.enrollment ? <>{member.enrollment.className} <span className="text-xs text-gray-500">· {member.enrollment.policyName} · من {formatDate(member.enrollment.startDate)}</span></> : <span className="text-gray-400">مش مشترك</span>}
                  </td>
                  <td className="table-cell text-center font-mono" dir="ltr">{member.enrollment?.cardNumber ?? '—'}</td>
                  <td className="table-cell text-center">{member.openRequest ? `${member.openRequest.kindLabel} — ${member.openRequest.statusLabel}` : '—'}</td>
                  <td className="table-cell text-left">
                    {!member.openRequest && (member.enrollment
                      ? <button type="button" className="btn-secondary text-xs" onClick={() => setForm({ kind: 'remove', enrollmentId: member.enrollment!.id, reason: '' })}>طلب حذف</button>
                      : <button type="button" className="btn-secondary text-xs disabled:opacity-50" disabled={busy} onClick={() => add(member)}>طلب إضافة</button>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.members.length === 0 && <p className="text-gray-500 text-sm p-2">مفيش موظفين في نطاقك.</p>}
        </div>
      </div>
    </>
  )
}
