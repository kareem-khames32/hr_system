'use client'

// B5.6: «بصمتي» — تسجيل البصمة من الموبايل: المتصفح بيبعت الموقع ودقته، والخادم بيحكم (نطاق موقع الفرع، حد الدقة، وقت الخادم) وبيرد بتأكيد فوري.
// ميزة attendance.mobile_punch (مقفولة افتراضيًا).
import { useCallback, useEffect, useState } from 'react'
import { MapPin } from 'lucide-react'
import { MainLayout } from '@/components/layout'
import { apiFetch } from '@/lib/api'

interface Attempt { id: number; siteName: string | null; accuracyMeters: number; distanceMeters: number | null; outcome: string; outcomeLabel: string; at: string }
interface MyPunch { ready: boolean; allowed?: boolean; hasFingerprint: boolean; sites: Array<{ id: number; name: string; radiusMeters: number }>; attempts: Attempt[] }
const fetchMine = () => apiFetch<MyPunch>('/attendance/mobile-punch')
const sendPunch = (position: { latitude: number; longitude: number; accuracy: number }) =>
  apiFetch<{ accepted: boolean; at: string; siteName: string | null; distanceMeters: number | null }>('/attendance/mobile-punch', { method: 'POST', body: JSON.stringify(position) })
const locate = () => new Promise<GeolocationPosition>((resolve, reject) => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return reject(new Error('المتصفح ده مابيدعمش تحديد الموقع'))
  // السبب بيتقال بالظبط (طلب المالك 12 أكتوبر 2026 بعد أول تجربة): إذن مرفوض، أو الجهاز نفسه مش مدّي موقع، أو الوقت خلص — كل واحد وحلّه
  navigator.geolocation.getCurrentPosition(resolve, (error) => reject(new Error(
    typeof window !== 'undefined' && !window.isSecureContext ? 'المتصفح مابيدّيش الموقع غير على رابط آمن (https) — افتح النظام من رابطه الآمن'
      : error.code === error.PERMISSION_DENIED ? 'الموقع مقفول للصفحة دي — افتح علامة القفل جنب عنوان الصفحة، واسمح بـ«الموقع»، وحدّث الصفحة'
        : error.code === error.TIMEOUT ? 'الجهاز اتأخر في تحديد الموقع — اتأكد إن خدمة الموقع (GPS) شغالة وجرّب تاني في مكان مفتوح'
          : 'الجهاز مش قادر يحدد موقعه — شغّل خدمة الموقع في إعدادات الجهاز (الموبايل: GPS، ويندوز: الإعدادات ← الخصوصية ← الموقع) وجرّب تاني')), { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 })
})

export default function MyPunchPage() {
  const [data, setData] = useState<MyPunch | null>(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    fetchMine().then(setData).catch((cause) => setError(cause instanceof Error ? cause.message : 'تعذر تحميل بصمتك'))
  }, [])
  useEffect(load, [load])

  async function punch() {
    setBusy(true); setError(''); setInfo('')
    try {
      const position = await locate()
      const result = await sendPunch({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy })
      setInfo(`اتسجّلت بصمتك${result.siteName ? ` في «${result.siteName}»` : ''} الساعة ${new Date(result.at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر تسجيل البصمة') } finally { setBusy(false); load() }
  }

  // B-ADD.9: برّه «مين يبصم من الموبايل» = من غير زرار، برسالة واحدة واضحة
  const allowed = data?.allowed !== false
  const usable = !!data?.ready && allowed && data.hasFingerprint && data.sites.length > 0
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <MapPin size={24} className="text-primary-600" />
            بصمتي
          </h1>
          <p className="text-gray-500 mt-1">سجّل بصمتك من الموبايل وإنت جوه نطاق موقع الشغل. الوقت بياخده النظام، مش موبايلك.</p>
        </div>

        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}
        {info && <div role="status" className="bg-green-50 text-green-700 rounded-xl p-4">{info}</div>}
        {data && !data.ready && <div className="card text-amber-800 bg-amber-50">جداول بصمة الموبايل لسه ماتطبّقتش على قاعدة البيانات (ترحيلي 167 و168).</div>}
        {data?.ready && !allowed && <div className="card text-amber-800 bg-amber-50" data-punch-not-allowed>بصمة الموبايل مش مفعّلة لك — راجع الموارد البشرية.</div>}
        {data?.ready && allowed && !data.hasFingerprint && <div className="card text-amber-800 bg-amber-50">ملفك مالوش رقم بصمة — راجع الموارد البشرية.</div>}
        {data?.ready && allowed && data.hasFingerprint && data.sites.length === 0 && <div className="card text-amber-800 bg-amber-50">مفيش موقع بصمة متعرّف لفرعك.</div>}

        {usable && (
          <div className="card space-y-3 text-center" data-mobile-punch>
            <button type="button" className="btn-primary text-lg px-8 py-4 disabled:opacity-50" disabled={busy} onClick={punch}>{busy ? 'بيتحدد موقعك…' : 'سجّل بصمة'}</button>
            <p className="text-xs text-gray-500">مواقع فرعك: {data!.sites.map((site) => `${site.name} (${site.radiusMeters} متر)`).join('، ')}</p>
          </div>
        )}

        {data?.ready && data.attempts.length > 0 && (
          <div className="card space-y-3" data-my-punch-attempts>
            <h2 className="text-lg font-semibold text-gray-800">آخر محاولاتي</h2>
            <ul className="divide-y divide-gray-100 text-sm">
              {data.attempts.map((row) => (
                <li key={row.id} className="py-2 flex flex-wrap items-center gap-3">
                  <span dir="ltr" className="text-gray-600">{new Date(row.at).toLocaleString('ar-EG')}</span>
                  <span className={row.outcome === 'ACCEPTED' ? 'text-green-700' : 'text-red-700'}>{row.outcomeLabel}</span>
                  <span className="text-gray-500">{row.siteName ?? '—'}{row.distanceMeters !== null ? ` · على بعد ${row.distanceMeters} متر` : ''} · دقة {row.accuracyMeters} متر</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
