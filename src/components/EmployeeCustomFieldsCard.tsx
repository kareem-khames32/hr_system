'use client'
// B2.9-ب: كارت «بيانات إضافية» في ملف الموظف — الحقول المخصصة اللي الشركة عرّفتها من الإعدادات.
// الخادم هو اللي بيحكم: الحقول الظاهرة للقارئ (المقيّد للي يعدّل الملف بس)، وهل التعديل متاح. قبل ترحيل 094 أو من غير حقول الكارت مابيظهرش.
import { useEffect, useState } from 'react'
import {
  employeeFieldDraft, employeeFieldText, fetchEmployeeFieldValues, saveEmployeeFieldValues, FIELD_NO, FIELD_YES,
  type ApiEmployeeFieldValue, type ApiEmployeeFieldValues, type EmployeeFieldValue,
} from '../lib/employee-fields-api'

export default function EmployeeCustomFieldsCard({ employeeId }: { employeeId: number }) {
  const [data, setData] = useState<ApiEmployeeFieldValues | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setData(null)
    setEditing(false)
    fetchEmployeeFieldValues(employeeId).then((result) => { if (alive) setData(result) }).catch(() => undefined)
    return () => { alive = false }
  }, [employeeId])

  if (!data?.available || data.fields.length === 0) return null

  const startEdit = () => {
    setDraft(Object.fromEntries(data.fields.map((field) => [field.fieldKey, employeeFieldDraft(field)])))
    setError(null)
    setEditing(true)
  }

  const save = async () => {
    const missing = data.fields.find((field) => field.required && (draft[field.fieldKey] ?? '').trim() === '')
    if (missing) {
      setError(`«${missing.label}» حقل إلزامي`)
      return
    }
    // اللي اتغيّر بس بيتبعت: قيمة قديمة اختيارها اتشال من القايمة بتفضل زي ما هي
    const changed: Record<string, EmployeeFieldValue> = {}
    for (const field of data.fields) {
      const next = (draft[field.fieldKey] ?? '').trim()
      if (next !== employeeFieldDraft(field)) changed[field.fieldKey] = next === '' ? null : next
    }
    if (Object.keys(changed).length === 0) {
      setEditing(false)
      return
    }
    setSaving(true)
    setError(null)
    try {
      setData(await saveEmployeeFieldValues(employeeId, changed))
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ البيانات الإضافية')
    } finally {
      setSaving(false)
    }
  }

  const set = (field: ApiEmployeeFieldValue, value: string) => setDraft({ ...draft, [field.fieldKey]: value })
  const input = (field: ApiEmployeeFieldValue) => {
    const value = draft[field.fieldKey] ?? ''
    if (field.type === 'CHOICE' || field.type === 'YESNO') {
      // قيمة قديمة مش في القايمة دلوقتي بتفضل اختيار ظاهر
      const options = field.type === 'YESNO' ? [FIELD_YES, FIELD_NO] : field.options.includes(value) || value === '' ? field.options : [value, ...field.options]
      return (
        <select value={value} onChange={(event) => set(field, event.target.value)} className="input w-full mt-1" aria-label={field.label}>
          <option value="">— من غير قيمة —</option>
          {options.map((option) => <option key={option} value={option}>{field.type === 'YESNO' ? (option === FIELD_YES ? 'نعم' : 'لا') : option}</option>)}
        </select>
      )
    }
    return (
      <input type={field.type === 'DATE' ? 'date' : 'text'} inputMode={field.type === 'NUMBER' ? 'decimal' : undefined} dir={field.type === 'TEXT' ? undefined : 'ltr'}
        value={value} maxLength={500} onChange={(event) => set(field, event.target.value)} className="input w-full mt-1" aria-label={field.label} />
    )
  }

  return (
    <div className="pt-6 border-t border-gray-100" data-employee-custom-fields>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-md font-bold text-gray-700">بيانات إضافية</h3>
        {data.canEdit && !editing && (
          <button type="button" onClick={startEdit} className="btn-secondary text-sm">تعديل</button>
        )}
      </div>
      {error && <p className="text-sm text-red-600 mb-3" role="alert">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.fields.map((field) => (
          <div key={field.id}>
            <p className="text-sm text-gray-500">
              {field.label}
              {field.required && <span className="text-red-500"> *</span>}
              {field.restricted && <span className="text-xs text-amber-600"> (للموارد البشرية بس)</span>}
            </p>
            {editing ? input(field) : <p className="font-medium text-gray-800 mt-1 break-words">{employeeFieldText(field)}</p>}
          </div>
        ))}
      </div>
      {editing && (
        <div className="flex items-center gap-2 mt-4">
          <button type="button" onClick={save} disabled={saving} className="btn-primary text-sm disabled:opacity-50">{saving ? 'جاري الحفظ…' : 'حفظ'}</button>
          <button type="button" onClick={() => { setEditing(false); setError(null) }} disabled={saving} className="btn-secondary text-sm">إلغاء</button>
        </div>
      )}
    </div>
  )
}
