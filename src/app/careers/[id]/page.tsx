'use client'

// B3.3-ب: صفحة وظيفة عامة ونموذج التقديم (من غير دخول): الاسم والبريد والموبايل، والهوية والسيرة الذاتية اختياريين، وموافقة البيانات.
// `?src=` في اللينك = مصدر المتقدّم (لينك لكل مصدر). B-ADD.6: من قايمة المصادر المعروفة بس (linkedin، facebook…) — أي قيمة تانية بتتساب.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { CheckCircle2, MapPin } from 'lucide-react'
import { useBranding } from '@/lib/branding'
import { formatDate } from '@/lib/dates'
import { CareersUnavailable, applyToPublicJob, fetchPublicJob, type PublicJob } from '@/lib/careers-api'
import { knownShareSource } from '@/lib/job-share'

const CV_MAX_BYTES = 5 * 1024 * 1024

export default function CareerJobPage() {
  const brand = useBranding()
  const params = useParams<{ id: string }>()
  const id = Number(params?.id)
  const [source, setSource] = useState('')
  const [job, setJob] = useState<PublicJob | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const [error, setError] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [nationalId, setNationalId] = useState('')
  const [cv, setCv] = useState<File | null>(null)
  const [consent, setConsent] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    setSource(knownShareSource(new URLSearchParams(window.location.search).get('src')))
  }, [])

  useEffect(() => {
    if (!Number.isSafeInteger(id) || id < 1) {
      setUnavailable(true)
      return
    }
    fetchPublicJob(id)
      .then(setJob)
      .catch((cause) => {
        if (cause instanceof CareersUnavailable) setUnavailable(true)
        else setError(cause instanceof Error ? cause.message : 'تعذر تحميل الوظيفة')
      })
  }, [id])

  const cvTooBig = !!cv && cv.size > CV_MAX_BYTES
  const valid = fullName.trim().length >= 3 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) && phone.replace(/\D/g, '').length >= 7 && consent && !cvTooBig

  const submit = async () => {
    setSending(true)
    setError('')
    try {
      await applyToPublicJob(id, { fullName: fullName.trim(), email: email.trim(), phone: phone.trim(), nationalId: nationalId.trim() || undefined, source: source || undefined, cv })
      setSent(true)
    } catch (cause) {
      if (cause instanceof CareersUnavailable) setUnavailable(true)
      else setError(cause instanceof Error ? cause.message : 'تعذر إرسال الطلب')
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <header>
          <p className="text-sm text-gray-500">
            <bdi>{brand.companyName}</bdi> ·{' '}
            <Link href={source ? `/careers?src=${source}` : '/careers'} className="text-primary-600 hover:underline">
              كل الوظائف
            </Link>
          </p>
        </header>
        {unavailable && (
          <div role="status" className="bg-white rounded-xl border border-gray-100 p-6 text-gray-600">
            الوظيفة دي مش متاحة للتقديم دلوقتي.
          </div>
        )}
        {job && (
          <section className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{job.title}</h1>
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-3 flex-wrap">
                {job.branchName && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={14} />
                    {job.branchName}
                  </span>
                )}
                <span>العدد المطلوب {job.openings}</span>
                {job.startDate && <span>البدء {formatDate(job.startDate)}</span>}
                <span>{job.code}</span>
              </p>
            </div>
            {job.description && <p className="text-gray-700 whitespace-pre-line">{job.description}</p>}
            {job.requirements && (
              <div>
                <h2 className="text-sm font-bold text-gray-800 mb-1">المتطلبات</h2>
                <p className="text-gray-700 whitespace-pre-line">{job.requirements}</p>
              </div>
            )}
          </section>
        )}
        {job && sent && (
          <div role="status" className="bg-green-50 text-green-800 rounded-xl p-6 flex items-start gap-3">
            <CheckCircle2 size={22} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-bold">طلبك اتستلم</p>
              <p className="text-sm mt-1">فريق التوظيف هيراجع بياناتك ويتواصل معاك لو فيه خطوة جاية.</p>
            </div>
          </div>
        )}
        {job && !sent && (
          <section className="bg-white rounded-xl border border-gray-100 p-6 space-y-4" data-apply-form>
            <h2 className="text-lg font-bold text-gray-800">قدّم على الوظيفة</h2>
            {error && (
              <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block text-sm text-gray-700 sm:col-span-2">
                الاسم الكامل
                <input className="input w-full mt-1" maxLength={200} autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </label>
              <label className="block text-sm text-gray-700">
                البريد الإلكتروني
                <input type="email" dir="ltr" className="input w-full mt-1" maxLength={200} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <label className="block text-sm text-gray-700">
                رقم الموبايل
                <input type="tel" dir="ltr" className="input w-full mt-1" maxLength={50} autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </label>
              <label className="block text-sm text-gray-700">
                رقم الهوية أو الجواز (اختياري)
                <input dir="ltr" className="input w-full mt-1" maxLength={40} value={nationalId} onChange={(e) => setNationalId(e.target.value)} />
              </label>
              <label className="block text-sm text-gray-700">
                السيرة الذاتية (اختياري — PDF أو Word، بحد أقصى 5 ميجا)
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="block w-full mt-1 text-sm"
                  onChange={(e) => setCv(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            {cvTooBig && <p className="text-xs text-red-600">حجم السيرة الذاتية أكبر من 5 ميجا.</p>}
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>
                أوافق إن <bdi>{brand.companyName}</bdi> تحفظ بياناتي وسيرتي الذاتية وتستخدمهم في دراسة طلبي على الوظيفة دي.
              </span>
            </label>
            <div className="flex justify-end">
              <button onClick={submit} disabled={!valid || sending} title="الاسم والبريد والموبايل والموافقة مطلوبين" className="btn-primary disabled:opacity-50">
                إرسال الطلب
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
