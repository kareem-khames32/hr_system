'use client'
// B3.14: كارت «المعالين» — في ملف الموظف (لصاحب صلاحية سجل المعالين: إضافة وتعديل وحذف مباشر) وفي «ملفي الشخصي» (قراءة، والتغيير بطلب
// «تحديث المعالين»). بيظهر لما موديول سجل المعالين مفتوح بس، والخادم بيحكم النطاق.
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { can } from '../lib/api'
import { formatDate } from '../lib/dates'
import { useModuleEnabled } from '../lib/modules'
import {
  DEPENDENT_GENDER_LABELS, DEPENDENT_RELATION_LABELS, addDependent, fetchEmployeeDependents, fetchMyDependents, removeDependent, updateDependent,
  type ApiDependent, type DependentBody, type DependentGender, type DependentRelation,
} from '../lib/dependents-api'

type Draft = { nameAr: string; nameEn: string; relation: DependentRelation; birthDate: string; nationalId: string; gender: '' | DependentGender; isInsured: boolean; idExpiryDate: string }
const EMPTY: Draft = { nameAr: '', nameEn: '', relation: 'SON', birthDate: '', nationalId: '', gender: '', isInsured: false, idExpiryDate: '' }
const draftOf = (row: ApiDependent): Draft => ({ nameAr: row.nameAr, nameEn: row.nameEn ?? '', relation: row.relation, birthDate: row.birthDate ?? '', nationalId: row.nationalId ?? '', gender: row.gender ?? '',
  isInsured: row.isInsured, idExpiryDate: row.idExpiryDate ?? '' })

/** employeeId = ملف موظف (صاحب الصلاحية)؛ من غيره = معالين صاحب الحساب */
export default function DependentsCard({ employeeId }: { employeeId?: number }) {
  const enabled = useModuleEnabled('dependents')
  const manage = employeeId !== undefined && can('dependents.manage')
  const visible = enabled && (employeeId === undefined || manage)
  const [rows, setRows] = useState<ApiDependent[] | null>(null)
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [removing, setRemoving] = useState<number | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    if (!visible) return
    const work = employeeId === undefined ? fetchMyDependents() : fetchEmployeeDependents(employeeId)
    work.then((data) => setRows(data.available ? data.dependents : null)).catch(() => setRows(null))
  }, [visible, employeeId])
  useEffect(load, [load])

  if (!visible || rows === null) return null

  const run = async (work: () => Promise<unknown>) => {
    setBusy(true)
    setError('')
    try {
      await work()
      setEditing(null)
      setRemoving(null)
      setReason('')
      load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر حفظ المعال')
    } finally {
      setBusy(false)
    }
  }
  const save = () => {
    if (employeeId === undefined || editing === null) return
    const current = editing === 'new' ? null : rows.find((row) => row.id === editing)
    // في التعديل: اللي اتغيّر بس بيتبعت
    const base = current ? draftOf(current) : null
    const body: DependentBody = {}
    if (!base || draft.nameAr.trim() !== base.nameAr) body.nameAr = draft.nameAr.trim()
    if (!base || draft.nameEn.trim() !== base.nameEn) body.nameEn = draft.nameEn.trim() || null
    if (!base || draft.relation !== base.relation) body.relation = draft.relation
    if (!base || draft.birthDate !== base.birthDate) body.birthDate = draft.birthDate || null
    if (!base || draft.nationalId.trim() !== base.nationalId) body.nationalId = draft.nationalId.trim() || null
    if (!base || draft.gender !== base.gender) body.gender = draft.gender || null
    if (!base || draft.isInsured !== base.isInsured) body.isInsured = draft.isInsured
    if (draft.idExpiryDate && (!base || draft.idExpiryDate !== base.idExpiryDate)) body.idExpiryDate = draft.idExpiryDate
    if (current && Object.keys(body).length === 0) { setEditing(null); return }
    void run(() => (current ? updateDependent(current.id, body) : addDependent(employeeId, body)))
  }
  const field = (label: string, node: ReactNode) => (
    <label className="block text-sm text-gray-600">
      {label}
      {node}
    </label>
  )

  return (
    <div className="pt-6 border-t border-gray-100" data-dependents>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-md font-bold text-gray-700">المعالين</h3>
        {manage && editing === null && (
          <button type="button" onClick={() => { setDraft(EMPTY); setError(''); setEditing('new') }} className="btn-secondary text-sm">إضافة معال</button>
        )}
        {employeeId === undefined && (
          <Link href="/requests" className="text-sm text-primary-600 hover:underline">التغيير بطلب «تحديث المعالين»</Link>
        )}
      </div>
      {error && <p className="text-sm text-red-600 mb-3" role="alert">{error}</p>}
      {rows.length === 0 && editing === null && <p className="text-sm text-gray-500">مفيش معالين مسجّلين.</p>}
      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-start font-medium text-gray-600">الاسم</th>
                <th className="px-3 py-2 text-start font-medium text-gray-600">القرابة</th>
                <th className="px-3 py-2 text-start font-medium text-gray-600">تاريخ الميلاد</th>
                <th className="px-3 py-2 text-start font-medium text-gray-600">رقم الهوية</th>
                <th className="px-3 py-2 text-start font-medium text-gray-600">انتهاء الهوية</th>
                <th className="px-3 py-2 text-start font-medium text-gray-600">التأمين</th>
                {manage && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2 text-gray-800">
                    {row.nameAr}
                    {row.nameEn && <span className="block text-xs text-gray-400" dir="ltr">{row.nameEn}</span>}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{row.relationLabel}</td>
                  <td className="px-3 py-2 text-gray-600">{row.birthDate ? formatDate(row.birthDate) : '—'}</td>
                  <td className="px-3 py-2 text-gray-600" dir="ltr">{row.nationalId ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{row.idExpiryDate ? formatDate(row.idExpiryDate) : '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{row.isInsured ? 'مشمول' : '—'}</td>
                  {manage && (
                    <td className="px-3 py-2 text-end whitespace-nowrap">
                      <button type="button" onClick={() => { setDraft(draftOf(row)); setError(''); setRemoving(null); setEditing(row.id) }} className="text-primary-600 hover:underline text-xs me-3">تعديل</button>
                      <button type="button" onClick={() => { setEditing(null); setError(''); setReason(''); setRemoving(row.id) }} className="text-red-600 hover:underline text-xs">حذف</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {manage && removing !== null && (
        <div className="bg-red-50 rounded-xl p-4 mt-4 space-y-3">
          {field('سبب الحذف', <input className="input mt-1 w-full" maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} />)}
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => run(() => removeDependent(removing, reason.trim()))} disabled={busy || reason.trim().length < 3} className="btn-primary text-sm disabled:opacity-50">تأكيد الحذف</button>
            <button type="button" onClick={() => setRemoving(null)} disabled={busy} className="btn-secondary text-sm">إلغاء</button>
          </div>
        </div>
      )}
      {manage && editing !== null && (
        <div className="bg-gray-50 rounded-xl p-4 mt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {field('الاسم', <input className="input mt-1 w-full" maxLength={150} value={draft.nameAr} onChange={(event) => setDraft({ ...draft, nameAr: event.target.value })} />)}
            {field('الاسم بالإنجليزي', <input className="input mt-1 w-full" dir="ltr" maxLength={150} value={draft.nameEn} onChange={(event) => setDraft({ ...draft, nameEn: event.target.value })} />)}
            {field('صلة القرابة', (
              <select className="input mt-1 w-full" value={draft.relation} onChange={(event) => setDraft({ ...draft, relation: event.target.value as DependentRelation })}>
                {(Object.keys(DEPENDENT_RELATION_LABELS) as DependentRelation[]).map((key) => <option key={key} value={key}>{DEPENDENT_RELATION_LABELS[key]}</option>)}
              </select>
            ))}
            {field('الجنس', (
              <select className="input mt-1 w-full" value={draft.gender} onChange={(event) => setDraft({ ...draft, gender: event.target.value as '' | DependentGender })}>
                <option value="">—</option>
                {(Object.keys(DEPENDENT_GENDER_LABELS) as DependentGender[]).map((key) => <option key={key} value={key}>{DEPENDENT_GENDER_LABELS[key]}</option>)}
              </select>
            ))}
            {field('تاريخ الميلاد', <input type="date" className="input mt-1 w-full" value={draft.birthDate} onChange={(event) => setDraft({ ...draft, birthDate: event.target.value })} />)}
            {field('رقم الهوية أو الإقامة', <input className="input mt-1 w-full" dir="ltr" maxLength={30} value={draft.nationalId} onChange={(event) => setDraft({ ...draft, nationalId: event.target.value })} />)}
            {field('تاريخ انتهاء الهوية', <input type="date" className="input mt-1 w-full" value={draft.idExpiryDate} onChange={(event) => setDraft({ ...draft, idExpiryDate: event.target.value })} />)}
            <label className="flex items-center gap-2 text-sm text-gray-700 mt-6">
              <input type="checkbox" checked={draft.isInsured} onChange={(event) => setDraft({ ...draft, isInsured: event.target.checked })} />
              مشمول بالتأمين
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={save} disabled={busy || draft.nameAr.trim().length < 2} className="btn-primary text-sm disabled:opacity-50">{busy ? 'جاري الحفظ…' : 'حفظ'}</button>
            <button type="button" onClick={() => { setEditing(null); setError('') }} disabled={busy} className="btn-secondary text-sm">إلغاء</button>
          </div>
        </div>
      )}
    </div>
  )
}
