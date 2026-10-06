'use client'

// B2.9-ب: حقول ملف الموظف — الشركة بتعرّف حقول زيادة على ملف الموظف (نص، رقم، تاريخ، اختيار، نعم/لا) بترتيبها وإلزامها ومين يشوفها.
// المفتاح والنوع مابيتغيّروش بعد الإنشاء، والحقل مابيتمسحش: بيتعطّل وقيمه بتفضل.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle, Edit, ListPlus, Plus, XCircle } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import {
  createEmployeeField, employeeFieldTypeLabel, fetchEmployeeFields, updateEmployeeField, EMPLOYEE_FIELD_TYPES,
  type ApiEmployeeField, type EmployeeFieldType,
} from '@/lib/employee-fields-api'

const emptyForm = { label: '', fieldKey: '', type: 'TEXT' as EmployeeFieldType, options: '', required: false, restricted: false, sortOrder: '' }
// نفس قاعدة الخادم: حروف إنجليزي صغيرة وأرقام و_ ، ويبدأ بحرف
const FIELD_KEY = /^[a-z][a-z0-9_]{1,39}$/

export default function EmployeeFieldsPage() {
  const [fields, setFields] = useState<ApiEmployeeField[]>([])
  const [available, setAvailable] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<ApiEmployeeField | null>(null)
  const [form, setForm] = useState({ ...emptyForm })

  const load = async () => {
    try {
      const data = await fetchEmployeeFields()
      setAvailable(data.available)
      setFields(data.fields)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل الحقول')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const open = (field?: ApiEmployeeField) => {
    setModalError(null)
    setEditing(field ?? null)
    setForm(field
      ? { label: field.label, fieldKey: field.fieldKey, type: field.type, options: field.options.join('\n'), required: field.required, restricted: field.restricted, sortOrder: String(field.sortOrder) }
      : { ...emptyForm })
    setShowModal(true)
  }

  const save = async () => {
    const options = form.options.split('\n').map((line) => line.trim()).filter(Boolean)
    if (form.label.trim().length < 2) return setModalError('اكتب اسم الحقل')
    if (!editing && !FIELD_KEY.test(form.fieldKey.trim())) return setModalError('مفتاح الحقل: حروف إنجليزي صغيرة وأرقام و_ ، ويبدأ بحرف')
    if (form.type === 'CHOICE' && options.length === 0) return setModalError('اكتب اختيار واحد على الأقل (كل اختيار في سطر)')
    if (form.sortOrder.trim() !== '' && !/^-?\d+$/.test(form.sortOrder.trim())) return setModalError('الترتيب رقم صحيح')
    setSaving(true)
    setModalError(null)
    const shared = {
      label: form.label.trim(), required: form.required, restricted: form.restricted,
      ...(form.type === 'CHOICE' ? { options } : {}),
      ...(form.sortOrder.trim() !== '' ? { sortOrder: Number(form.sortOrder.trim()) } : {}),
    }
    try {
      if (editing) await updateEmployeeField(editing.id, shared)
      else await createEmployeeField({ ...shared, fieldKey: form.fieldKey.trim(), type: form.type })
      setShowModal(false)
      await load()
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'تعذر حفظ الحقل')
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (field: ApiEmployeeField) => {
    try {
      await updateEmployeeField(field.id, { isActive: !field.isActive })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تغيير حالة الحقل')
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/settings" className="hover:text-primary-600">الإعدادات</Link>
          <ArrowRight size={16} />
          <span className="text-gray-800">حقول ملف الموظف</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">حقول ملف الموظف</h1>
            <p className="text-gray-500 mt-1">حقول زيادة بتظهر في ملف كل موظف تحت «بيانات إضافية».</p>
          </div>
          {available && (
            <button onClick={() => open()} className="btn-primary flex items-center gap-2">
              <Plus size={20} />
              إضافة حقل
            </button>
          )}
        </div>

        {error && <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        {!loading && !available && (
          <div className="bg-amber-50 text-amber-800 rounded-xl p-4" data-fields-unavailable>
            الحقول المخصصة محتاجة تحديث قاعدة البيانات (ترحيل 094) — هتشتغل أول ما يتطبق.
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && available && (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['الحقل', 'النوع', 'إلزامي', 'مين يشوفه', 'الترتيب', 'الحالة', 'إجراءات'].map((title) => (
                    <th key={title} className="text-right py-4 px-6 text-sm font-bold text-gray-700">{title}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {fields.map((field) => (
                  <tr key={field.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <p className="font-medium text-gray-800">{field.label}</p>
                      <p className="text-xs text-gray-500 font-mono" dir="ltr">{field.fieldKey}</p>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-700">
                      {employeeFieldTypeLabel(field.type)}
                      {field.type === 'CHOICE' && <span className="block text-xs text-gray-500">{field.options.join('، ')}</span>}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-700">{field.required ? 'نعم' : 'لا'}</td>
                    <td className="py-4 px-6 text-sm text-gray-700">{field.restricted ? 'اللي يعدّل ملف الموظف بس' : 'الموظف واللي يشوف ملفه'}</td>
                    <td className="py-4 px-6 text-sm text-gray-700">{field.sortOrder}</td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${field.isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                        {field.isActive ? 'مفعّل' : 'معطّل'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <button onClick={() => open(field)} className="p-2 hover:bg-gray-100 rounded-lg" title="تعديل" aria-label={`تعديل ${field.label}`}>
                          <Edit size={16} className="text-gray-600" />
                        </button>
                        <button onClick={() => toggle(field)} className="p-2 hover:bg-gray-100 rounded-lg" title={field.isActive ? 'تعطيل' : 'تفعيل'} aria-label={`${field.isActive ? 'تعطيل' : 'تفعيل'} ${field.label}`}>
                          {field.isActive ? <XCircle size={16} className="text-gray-600" /> : <CheckCircle size={16} className="text-gray-600" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {fields.length === 0 && (
              <div className="p-12 text-center">
                <ListPlus size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-bold text-gray-800 mb-2">مفيش حقول مخصصة</h3>
                <p className="text-gray-500">أضف أول حقل من الزر اللي فوق.</p>
              </div>
            )}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">{editing ? 'تعديل الحقل' : 'إضافة حقل'}</h2>
              </div>
              <div className="p-6 space-y-4">
                {modalError && <div className="bg-red-50 text-red-700 rounded-xl p-4">{modalError}</div>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">اسم الحقل *</label>
                    <input type="text" value={form.label} maxLength={100} onChange={(event) => setForm({ ...form, label: event.target.value })} className="input w-full" placeholder="مثال: مقاس الزي" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">المفتاح (إنجليزي) *</label>
                    <input type="text" value={form.fieldKey} maxLength={40} disabled={!!editing} onChange={(event) => setForm({ ...form, fieldKey: event.target.value })}
                      className="input w-full disabled:bg-gray-100" dir="ltr" placeholder="uniform_size" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">النوع *</label>
                    <select value={form.type} disabled={!!editing} onChange={(event) => setForm({ ...form, type: event.target.value as EmployeeFieldType })} className="input w-full disabled:bg-gray-100">
                      {EMPLOYEE_FIELD_TYPES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">الترتيب</label>
                    <input type="text" inputMode="numeric" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} className="input w-full" dir="ltr" placeholder="تلقائي" />
                  </div>
                </div>
                {editing && <p className="text-xs text-gray-500">المفتاح والنوع مابيتغيّروش بعد إنشاء الحقل.</p>}
                {form.type === 'CHOICE' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">الاختيارات (كل اختيار في سطر) *</label>
                    <textarea value={form.options} rows={4} onChange={(event) => setForm({ ...form, options: event.target.value })} className="input w-full" />
                  </div>
                )}
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.required} onChange={(event) => setForm({ ...form, required: event.target.checked })} className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                  <span className="text-sm text-gray-700">إلزامي (مايتحفظش فاضي)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.restricted} onChange={(event) => setForm({ ...form, restricted: event.target.checked })} className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                  <span className="text-sm text-gray-700">مقيّد: يظهر للي يعدّل ملف الموظف بس (الموظف نفسه مايشوفوش)</span>
                </label>
              </div>
              <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="btn-secondary">إلغاء</button>
                <button onClick={save} className="btn-primary disabled:opacity-50" disabled={saving}>{saving ? 'جارٍ الحفظ...' : editing ? 'حفظ التغييرات' : 'إضافة الحقل'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
