'use client'

// B3.9: «إضافة دورة» — دورة جديدة في كتالوج التدريب: النوع، المدة، المزوّد، وهل بتطلّع شهادة وصلاحيتها. (كانت شاشة عرض ببيانات وهمية؛ بقت على الخادم.)
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { GraduationCap } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { TRAINING_KIND_LABELS, createTrainingCourse, type TrainingCourseKind } from '@/lib/training-api'

export default function AddTrainingCoursePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [kind, setKind] = useState<TrainingCourseKind>('INTERNAL')
  const [url, setUrl] = useState('')
  const [duration, setDuration] = useState('')
  const [provider, setProvider] = useState('')
  const [description, setDescription] = useState('')
  const [givesCertificate, setGivesCertificate] = useState(false)
  const [validMonths, setValidMonths] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      await createTrainingCourse({ name: name.trim(), kind, url: url.trim() || null, durationHours: duration.trim() ? Number(duration) : null, provider: provider.trim() || null,
        description: description.trim() || null, givesCertificate, certificateValidMonths: givesCertificate && validMonths.trim() ? Number(validMonths) : null })
      router.push('/training')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر حفظ الدورة')
      setBusy(false)
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <Link href="/training" className="text-sm text-primary-600 hover:underline">
            ← الدورات التدريبية
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mt-2">
            <GraduationCap size={24} className="text-primary-600" />
            إضافة دورة
          </h1>
          <p className="text-gray-500 mt-1">دورة جديدة في الكتالوج — الجلسات بتتعمل عليها من «الدورات التدريبية»</p>
        </div>
        {error && (
          <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">
            {error}
          </div>
        )}
        <div className="card space-y-4">
          <label className="block text-sm text-gray-600">
            اسم الدورة
            <input className="input mt-1 w-full" maxLength={200} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm text-gray-600">
              النوع
              <select className="input mt-1 w-full" value={kind} onChange={(e) => setKind(e.target.value as TrainingCourseKind)}>
                {(Object.keys(TRAINING_KIND_LABELS) as TrainingCourseKind[]).map((key) => (
                  <option key={key} value={key}>
                    {TRAINING_KIND_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-gray-600">
              المدة بالساعات
              <input className="input mt-1 w-full" inputMode="decimal" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </label>
          </div>
          <label className="block text-sm text-gray-600">
            رابط الدورة {kind === 'ONLINE' ? '(مطلوب للأونلاين)' : '(اختياري)'}
            <input className="input mt-1 w-full" dir="ltr" maxLength={500} placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} />
          </label>
          <label className="block text-sm text-gray-600">
            المزوّد
            <input className="input mt-1 w-full" maxLength={200} value={provider} onChange={(e) => setProvider(e.target.value)} />
          </label>
          <label className="block text-sm text-gray-600">
            الوصف
            <textarea className="input mt-1 w-full" rows={3} maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={givesCertificate} onChange={(e) => setGivesCertificate(e.target.checked)} />
            الدورة بتطلّع شهادة (بتتسجّل مستند للموظف لما يكمل)
          </label>
          {givesCertificate && (
            <label className="block text-sm text-gray-600">
              صلاحية الشهادة بالشهور (فاضية = من غير انتهاء)
              <input className="input mt-1 w-40" inputMode="numeric" value={validMonths} onChange={(e) => setValidMonths(e.target.value.replace(/\D/g, ''))} />
            </label>
          )}
          <div className="flex items-center justify-end gap-2">
            <Link href="/training" className="btn-secondary text-sm">
              إلغاء
            </Link>
            <button onClick={save} disabled={busy || name.trim().length < 3} className="btn-primary text-sm disabled:opacity-50">
              حفظ الدورة
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
