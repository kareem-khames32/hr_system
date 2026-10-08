'use client'

// B3.5-أ: صفحة رد المرشح على عرض العمل (من غير دخول) — الرمز في اللينك هو الحق. الرد مرة واحدة: قبول أو رفض بملاحظة اختيارية.
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { useBranding } from '@/lib/branding'
import { formatDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { CareersUnavailable, answerPublicOffer, fetchPublicOffer, type PublicOffer } from '@/lib/careers-api'

export default function OfferAnswerPage() {
  const brand = useBranding()
  const params = useParams<{ token: string }>()
  const token = String(params?.token ?? '')
  const [offer, setOffer] = useState<PublicOffer | null>(null)
  const [gone, setGone] = useState(false)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [choice, setChoice] = useState<'ACCEPT' | 'DECLINE' | null>(null)
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState<'ACCEPT' | 'DECLINE' | null>(null)

  useEffect(() => {
    fetchPublicOffer(token)
      .then(setOffer)
      .catch((cause) => {
        if (cause instanceof CareersUnavailable) setGone(true)
        else setError(cause instanceof Error ? cause.message : 'تعذر تحميل العرض')
      })
  }, [token])

  const send = async () => {
    if (!choice) return
    setSending(true)
    setError('')
    try {
      await answerPublicOffer(token, choice, note.trim() || undefined)
      setDone(choice)
    } catch (cause) {
      if (cause instanceof CareersUnavailable) setGone(true)
      else setError(cause instanceof Error ? cause.message : 'تعذر تسجيل الرد')
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-xl mx-auto space-y-6">
        <header>
          <p className="text-sm text-gray-500">
            <bdi>{brand.companyName}</bdi>
          </p>
          <h1 className="text-2xl font-bold text-gray-800 mt-1">عرض عمل</h1>
        </header>
        {error && (
          <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">
            {error}
          </div>
        )}
        {gone && !done && (
          <div role="status" className="bg-white rounded-xl border border-gray-100 p-6 text-gray-600">
            العرض ده مش متاح للرد (اترد عليه قبل كده، أو اتسحب، أو مدته خلصت). لو محتاج حاجة تواصل مع فريق التوظيف.
          </div>
        )}
        {done && (
          <div role="status" className="bg-green-50 text-green-800 rounded-xl p-6 flex items-start gap-3">
            <CheckCircle2 size={22} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-bold">{done === 'ACCEPT' ? 'قبولك للعرض اتسجّل' : 'ردّك اتسجّل'}</p>
              <p className="text-sm mt-1">{done === 'ACCEPT' ? 'فريق التوظيف هيتواصل معاك لإجراءات التعيين.' : 'شكرًا لوقتك.'}</p>
            </div>
          </div>
        )}
        {offer && !done && !gone && (
          <section className="bg-white rounded-xl border border-gray-100 p-6 space-y-5" data-offer>
            <p className="text-gray-700">
              أهلًا <bdi>{offer.candidateName}</bdi>، ده عرض العمل المقدّم لك:
            </p>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">الوظيفة</dt>
                <dd className="font-medium text-gray-800 mt-1">{offer.positionTitle}</dd>
              </div>
              {offer.branchName && (
                <div>
                  <dt className="text-gray-500">الفرع</dt>
                  <dd className="font-medium text-gray-800 mt-1">{offer.branchName}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-500">الراتب الشهري المعروض</dt>
                <dd className="font-medium text-gray-800 mt-1 tabular-nums">{formatMoney(offer.salary)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">تاريخ البدء</dt>
                <dd className="font-medium text-gray-800 mt-1">{offer.startDate ? formatDate(offer.startDate) : '—'}</dd>
              </div>
            </dl>
            {offer.expiresOn && <p className="text-xs text-gray-500">الرد مطلوب قبل {formatDate(offer.expiresOn)}.</p>}
            <div className="grid grid-cols-2 gap-2">
              {(['ACCEPT', 'DECLINE'] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => setChoice(key)}
                  aria-pressed={choice === key}
                  className={`rounded-xl border p-3 text-sm font-medium ${choice === key ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                >
                  {key === 'ACCEPT' ? 'أقبل العرض' : 'أعتذر عن العرض'}
                </button>
              ))}
            </div>
            <label className="block text-sm text-gray-700">
              ملاحظة (اختياري)
              <textarea className="input w-full mt-1" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <p className="text-xs text-gray-500">الرد بيتسجّل مرة واحدة بتاريخه، وبعدها اللينك بيتقفل.</p>
            <div className="flex justify-end">
              <button onClick={send} disabled={!choice || sending} className="btn-primary disabled:opacity-50">
                تأكيد الرد
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
