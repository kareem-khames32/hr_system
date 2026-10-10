'use client'
// B-ADD.5: «رقم الواتساب» في ملف الموظف — الرقم اللي إشعارات الواتساب بتتبعت عليه (مستقل عن رقم الجوال). القراءة بصلاحية عرض الموظفين
// والتعديل بصلاحية تعديلهم، والخادم هو اللي بيحكم (ونطاق الفروع). قبل ترحيل 187، أو لقارئ من غير الصلاحية، الكارت مابيظهرش.
import { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { can } from '../lib/api'
import { fetchEmployeeContact, saveEmployeeContact, type ApiEmployeeContact } from '../lib/notification-channels-api'

export default function EmployeeWhatsappCard({ employeeId }: { employeeId: number }) {
  const [data, setData] = useState<ApiEmployeeContact | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setData(null)
    setEditing(false)
    if (!can('employees.view')) return
    fetchEmployeeContact(employeeId).then((result) => { if (alive) setData(result) }).catch(() => undefined)
    return () => { alive = false }
  }, [employeeId])

  if (!data?.available) return null

  const save = async () => {
    setSaving(true); setError(null)
    try {
      setData(await saveEmployeeContact(employeeId, draft.trim() || null))
      setEditing(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر حفظ رقم الواتساب')
    } finally { setSaving(false) }
  }

  return (
    <div className="pt-6 border-t border-gray-100" data-employee-whatsapp>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-md font-bold text-gray-700 flex items-center gap-2"><MessageCircle size={18} className="text-primary-500" />رقم الواتساب للإشعارات</h3>
        {can('employees.edit') && !editing && (
          <button type="button" className="text-sm text-primary-600 hover:underline" onClick={() => { setDraft(data.whatsappNumber ?? ''); setError(null); setEditing(true) }}>
            {data.whatsappNumber ? 'تعديل' : 'إضافة رقم'}
          </button>
        )}
      </div>
      {!editing && (
        data.whatsappNumber
          ? <p className="font-medium text-gray-800" dir="ltr">{data.whatsappNumber}</p>
          : <p className="text-sm text-gray-500">مفيش رقم واتساب متسجّل: إشعارات الواتساب مش هتوصل للموظف ده.</p>
      )}
      {editing && (
        <div className="space-y-2">
          {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-2 text-sm">{error}</div>}
          <input className="input w-full sm:w-72" dir="ltr" aria-label="رقم الواتساب" placeholder="+966500000000" value={draft} onChange={(event) => setDraft(event.target.value)} />
          <p className="text-xs text-gray-500">بالصيغة الدولية بكود الدولة. الخانة الفاضية بتمسح الرقم.</p>
          <div className="flex gap-2">
            <button type="button" className="btn-primary text-sm" disabled={saving} onClick={save}>حفظ</button>
            <button type="button" className="btn-secondary text-sm" disabled={saving} onClick={() => setEditing(false)}>إلغاء</button>
          </div>
        </div>
      )}
    </div>
  )
}
