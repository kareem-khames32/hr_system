'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import { Calculator, Info, Plus, Trash2, Save, Clock, UserX } from 'lucide-react'
import {
  fetchLatenessTiers,
  createLatenessTier,
  deleteLatenessTier,
  updateLatenessTier,
  fetchConfig,
  updateConfig,
  type ApiLatenessTier,
} from '@/lib/api'

const ABSENCE_KEY = 'attendance.absence_penalty_days'

export default function PayrollFormulasPage() {
  const [tiers, setTiers] = useState<ApiLatenessTier[]>([])
  const [absence, setAbsence] = useState('1')
  const [absenceSaved, setAbsenceSaved] = useState('1')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)

  // نموذج إضافة شريحة
  const [form, setForm] = useState({ fromMinutes: '', toMinutes: '', mode: 'FRACTION', value: '0.25', label: '' })

  const load = async () => {
    setLoading(true)
    try {
      const [t, cfg] = await Promise.all([fetchLatenessTiers(), fetchConfig()])
      setTiers(t.sort((a, b) => a.fromMinutes - b.fromMinutes))
      const a = cfg.find((c) => c.key === ABSENCE_KEY)?.value ?? '1'
      setAbsence(a)
      setAbsenceSaved(a)
    } catch (e: any) {
      setMsg(e?.message ?? 'خطأ في التحميل')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const addTier = async () => {
    const from = Number(form.fromMinutes)
    if (!Number.isFinite(from) || from < 0) return flash('«من دقيقة» مطلوبة')
    if (form.mode === 'FRACTION' && !(Number(form.value) > 0)) return flash('كسر اليوم أكبر من صفر (مثل 0.25)')
    try {
      await createLatenessTier({
        fromMinutes: from,
        toMinutes: form.toMinutes === '' ? null : Number(form.toMinutes),
        mode: form.mode as 'FRACTION' | 'MINUTES',
        value: form.mode === 'FRACTION' ? form.value : 0,
        label: form.label || undefined,
      })
      setForm({ fromMinutes: '', toMinutes: '', mode: 'FRACTION', value: '0.25', label: '' })
      await load()
      flash('أُضيفت الشريحة ✓')
    } catch (e: any) { flash(e?.message ?? 'فشل الإضافة') }
  }

  const removeTier = async (id: number) => {
    try { await deleteLatenessTier(id); await load(); flash('حُذفت ✓') }
    catch (e: any) { flash(e?.message ?? 'فشل الحذف') }
  }

  const toggleTier = async (t: ApiLatenessTier) => {
    try { await updateLatenessTier(t.id, { isActive: !t.isActive }); await load() }
    catch (e: any) { flash(e?.message ?? 'فشل') }
  }

  const saveAbsence = async () => {
    if (!(Number(absence) >= 0)) return flash('المعامل رقم غير سالب')
    try { await updateConfig(ABSENCE_KEY, String(Number(absence))); setAbsenceSaved(absence); flash('حُفظ معامل الغياب ✓') }
    catch (e: any) { flash(e?.message ?? 'فشل الحفظ') }
  }

  const fmtDeduction = (t: ApiLatenessTier) =>
    t.mode === 'MINUTES'
      ? 'بالوقت الفعلي (دقيقة بدقيقة)'
      : `${Number(t.value)} يوم${Number(t.value) === 0.25 ? ' (ربع)' : Number(t.value) === 0.5 ? ' (نصف)' : Number(t.value) === 1 ? ' (يوم كامل)' : ''}`

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">معادلات الرواتب</h1>
            <p className="text-gray-500 mt-1">أنت تحدد قواعد الخصم — النظام يحسب المسير بناءً عليها</p>
          </div>
          {msg && <span className="px-4 py-2 rounded-lg bg-primary-50 text-primary-700 text-sm font-medium">{msg}</span>}
        </div>

        {/* شرائح خصم التأخير */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-warning-100 rounded-xl flex items-center justify-center">
              <Clock size={20} className="text-warning-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">شرائح خصم التأخير</h3>
              <p className="text-sm text-gray-400">حدّد مدى دقائق التأخير وكم يُخصم عليه — كسر يوم أو بالوقت الفعلي</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="text-center px-4 py-3">من دقيقة</th>
                  <th className="text-center px-4 py-3">إلى دقيقة</th>
                  <th className="text-center px-4 py-3">الخصم</th>
                  <th className="text-center px-4 py-3">الوصف</th>
                  <th className="text-center px-4 py-3">مفعّلة</th>
                  <th className="text-center px-4 py-3">حذف</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">جارِ التحميل…</td></tr>
                ) : tiers.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">لا شرائح — أضف شريحتك الأولى بالأسفل (بدون شرائح: الخصم بالدقيقة)</td></tr>
                ) : tiers.map((t) => (
                  <tr key={t.id} className="table-row">
                    <td className="table-cell text-center font-mono">{t.fromMinutes}</td>
                    <td className="table-cell text-center font-mono">{t.toMinutes ?? '∞'}</td>
                    <td className="table-cell text-center">{fmtDeduction(t)}</td>
                    <td className="table-cell text-center text-gray-500">{t.label || '—'}</td>
                    <td className="table-cell text-center">
                      <button onClick={() => toggleTier(t)} className={`px-3 py-1 rounded-full text-xs font-medium ${t.isActive ? 'bg-success-100 text-success-700' : 'bg-gray-100 text-gray-500'}`}>
                        {t.isActive ? 'مفعّلة' : 'موقوفة'}
                      </button>
                    </td>
                    <td className="table-cell text-center">
                      <button onClick={() => removeTier(t.id)} className="text-danger-500 hover:text-danger-700"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* إضافة شريحة */}
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <div>
              <label className="text-xs text-gray-500">من دقيقة</label>
              <input type="number" value={form.fromMinutes} onChange={(e) => setForm({ ...form, fromMinutes: e.target.value })} className="input-field" placeholder="30" />
            </div>
            <div>
              <label className="text-xs text-gray-500">إلى دقيقة (فارغ = ∞)</label>
              <input type="number" value={form.toMinutes} onChange={(e) => setForm({ ...form, toMinutes: e.target.value })} className="input-field" placeholder="60" />
            </div>
            <div>
              <label className="text-xs text-gray-500">نوع الخصم</label>
              <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })} className="input-field">
                <option value="FRACTION">كسر من اليوم</option>
                <option value="MINUTES">بالوقت الفعلي</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">كسر اليوم</label>
              <input type="number" step="0.05" value={form.value} disabled={form.mode !== 'FRACTION'} onChange={(e) => setForm({ ...form, value: e.target.value })} className="input-field disabled:bg-gray-100" placeholder="0.25" />
            </div>
            <div>
              <label className="text-xs text-gray-500">وصف (اختياري)</label>
              <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="input-field" placeholder="تأخير بسيط" />
            </div>
            <button onClick={addTier} className="btn-primary flex items-center justify-center gap-2"><Plus size={18} />إضافة</button>
          </div>
          <p className="text-xs text-gray-400 mt-2">مثال: من 30 إلى 60 → ربع يوم (0.25) · من 61 إلى 120 → نصف يوم (0.5) · من 121 وفارغ → يوم (1) — القيم دي مجرد مثال، أنت تحددها.</p>
        </div>

        {/* معامل الغياب */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-danger-100 rounded-xl flex items-center justify-center">
              <UserX size={20} className="text-danger-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">عقوبة الغياب بلا إذن</h3>
              <p className="text-sm text-gray-400">اليوم الغائب بلا إذن يُخصم = قيمة اليوم × المعامل</p>
            </div>
          </div>
          <div className="flex items-end gap-3">
            <div className="w-40">
              <label className="text-xs text-gray-500">معامل الأيام</label>
              <input type="number" step="0.5" value={absence} onChange={(e) => setAbsence(e.target.value)} className="input-field" placeholder="1.5" />
            </div>
            <button onClick={saveAbsence} disabled={absence === absenceSaved} className="btn-primary flex items-center gap-2 disabled:opacity-50"><Save size={18} />حفظ</button>
            <span className="text-sm text-gray-400 pb-2">مثال: 1.5 يعني الغياب بلا إذن يُخصم يوم ونصف. (الإجازة بدون راتب تبقى يوماً واحداً.)</span>
          </div>
        </div>

        {/* معلومة */}
        <div className="card bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0"><Info size={24} className="text-blue-600" /></div>
            <div>
              <h3 className="font-bold text-blue-800 mb-2">كيف تُطبَّق؟</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• كل يوم متأخر يُخصم حسب الشريحة اللي بيقع فيها تأخيره.</li>
                <li>• لو مفيش شرائح مفعّلة → الخصم بالدقيقة (السلوك الافتراضي).</li>
                <li>• التغييرات تُطبَّق عند إعادة احتساب المسير.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
