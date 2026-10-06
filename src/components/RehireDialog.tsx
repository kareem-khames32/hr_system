'use client'
// B2.10: نافذة «إعادة تعيين» — موظف خدمته انتهت واتصفّى بيبدأ فترة خدمة جديدة بنفس الملف والكود.
// الخادم هو الحكم: هو اللي بيقول متاحة ولا لأ (وليه) ومن أي تاريخ؛ والنافذة بتاخد تاريخ المباشرة والسبب.
import { useEffect, useState } from 'react'
import { fetchEmploymentPeriods, rehireEmployee, type ApiEmploymentPeriods } from '../lib/api'
import { formatDate, localToday } from '../lib/dates'

export default function RehireDialog({ target, onClose, onDone }: {
  target: { id: number; name: string } | null
  onClose: () => void
  onDone: () => void | Promise<void>
}) {
  const [info, setInfo] = useState<ApiEmploymentPeriods | null>(null)
  const [startDate, setStartDate] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const targetId = target?.id ?? null

  useEffect(() => {
    if (targetId == null) return
    let alive = true
    setInfo(null)
    setReason('')
    setError('')
    fetchEmploymentPeriods(targetId).then((result) => {
      if (!alive) return
      setInfo(result)
      // التاريخ الافتراضي: النهارده، أو أول يوم مقبول لو بعده
      const today = localToday(), min = result.rehire?.minStartDate ?? ''
      setStartDate(min && min > today ? min : today)
    }).catch((err) => { if (alive) setError(err instanceof Error ? err.message : 'تعذر تحميل بيانات إعادة التعيين') })
    return () => { alive = false }
  }, [targetId])

  if (!target) return null
  const rehire = info?.ready ? info.rehire : null

  const confirm = async () => {
    if (saving) return
    if (!startDate) {
      setError('اختار تاريخ المباشرة الجديد')
      return
    }
    if (reason.trim().length < 5) {
      setError('اكتب سبب إعادة التعيين (5 حروف على الأقل)')
      return
    }
    setSaving(true)
    setError('')
    try {
      await rehireEmployee(target.id, startDate, reason.trim())
      await onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذرت إعادة التعيين')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-rehire>
      <div className="bg-white rounded-2xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">إعادة تعيين — {target.name}</h2>
        </div>
        <div className="p-6 space-y-4">
          {!info && !error && <p className="text-sm text-gray-500">جارٍ التحميل…</p>}
          {info && !info.ready && (
            <div className="bg-amber-50 text-amber-800 rounded-xl p-4 text-sm">إعادة التعيين مش متاحة على قاعدة البيانات دي لسه (محتاجة ترحيل 095).</div>
          )}
          {info?.ready && !rehire?.available && (
            <div className="bg-amber-50 text-amber-800 rounded-xl p-4 text-sm" data-rehire-blocked>{rehire?.blocked ?? 'إعادة التعيين مش متاحة للموظف ده'}</div>
          )}
          {rehire?.available && (
            <>
              <div className="bg-amber-50 text-amber-800 rounded-xl p-4 text-sm">
                إعادة التعيين بتبدأ فترة خدمة جديدة بنفس الملف والكود: مدة الخدمة (مكافأة نهاية الخدمة) ورصيد الإجازات بيبدأوا من تاريخ المباشرة الجديد،
                والعقد القديم بيتقفل — سجّل العقد الجديد وراجع الراتب من ملف الموظف. فترته القديمة (لحد {rehire.lastWorkingDay ? formatDate(rehire.lastWorkingDay) : '—'}) بتفضل محفوظة في ملفه.
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="rehire-start">تاريخ المباشرة الجديد *</label>
                <input id="rehire-start" type="date" dir="ltr" value={startDate} min={rehire.minStartDate ?? undefined} max={rehire.maxStartDate}
                  onChange={(event) => setStartDate(event.target.value)} className="input w-full" />
                <p className="text-xs text-gray-500 mt-1">من {rehire.minStartDate ? formatDate(rehire.minStartDate) : '—'} أو بعده (بعد شهر الرواتب اللي فيه آخر يوم عمل).</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="rehire-reason">سبب إعادة التعيين *</label>
                <textarea id="rehire-reason" value={reason} maxLength={500} rows={3} onChange={(event) => setReason(event.target.value)} className="input w-full" />
              </div>
            </>
          )}
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        </div>
        <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} disabled={saving} className="btn-secondary">إلغاء</button>
          {rehire?.available && (
            <button type="button" onClick={confirm} disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'جارٍ إعادة التعيين…' : 'إعادة تعيين'}</button>
          )}
        </div>
      </div>
    </div>
  )
}
