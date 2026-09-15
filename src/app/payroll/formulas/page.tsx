'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import { Info, Save, UserX } from 'lucide-react'
import { fetchConfig, updateConfig } from '@/lib/api'
import { LatenessTierSetsEditor } from '@/components/payroll/LatenessTierSetsEditor'

const ABSENCE_KEY = 'attendance.absence_penalty_days'

// «القيم العامة للخصومات»: تُستخدم في كل معادلات رواتب تترك الحقل على «زي الإعدادات العامة».
export default function PayrollFormulasPage() {
  const [absence, setAbsence] = useState('1')
  const [absenceSaved, setAbsenceSaved] = useState('1')
  const [msg, setMsg] = useState('')

  const load = async () => {
    try {
      const cfg = await fetchConfig()
      const a = cfg.find((c) => c.key === ABSENCE_KEY)?.value ?? '1'
      setAbsence(a)
      setAbsenceSaved(a)
    } catch (e: any) {
      setMsg(e?.message ?? 'خطأ في التحميل')
    }
  }
  useEffect(() => { load() }, [])

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const saveAbsence = async () => {
    if (!(Number(absence) >= 0)) return flash('المعامل رقم غير سالب')
    try { await updateConfig(ABSENCE_KEY, String(Number(absence))); setAbsenceSaved(absence); flash('حُفظ معامل الغياب ✓') }
    catch (e: any) { flash(e?.message ?? 'فشل الحفظ') }
  }


  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">القيم العامة للخصومات</h1>
            <p className="text-gray-500 mt-1">القيم التي تأخذها معادلات الرواتب حين تترك الحقل على «زي الإعدادات العامة».</p>
          </div>
          {msg && <span className="px-4 py-2 rounded-lg bg-primary-50 text-primary-700 text-sm font-medium">{msg}</span>}
        </div>

        {/* شرائح خصم التأخير — مجموعات مؤرخة متحقق منها */}
        <LatenessTierSetsEditor />

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
                <li>• هذه القيم تُطبَّق على معادلات الرواتب التي تترك الحقل فارغًا («زي الإعدادات العامة»)، عند إعادة حساب أي مسير لم يُعتمد بعد.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
