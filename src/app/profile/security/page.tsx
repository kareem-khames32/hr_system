'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout'
import { MonitorSmartphone, Smartphone } from 'lucide-react'
import { clearSession } from '@/lib/api'
import { formatDateTime } from '@/lib/dates'
import { disableTotp, endMySession, endOtherSessions, fetchMySessions, fetchTotpStatus, type MySessions, type TotpStatus } from '@/lib/security-api'
import TotpSetup from '@/components/security/TotpSetup'

// B2.17: أمان الحساب — «جلساتي»: الأجهزة اللي الحساب مفتوح عليها دلوقتي، وإنهاء أي جلسة منها (الجلسة المنتهية بتطلع برّه مع أول طلب).
// وB2.17-ج: التحقق بتطبيق مصادقة — تفعيله (اختياري، أو إلزامي لأدوار) وإلغاؤه برمز منه.
export default function AccountSecurityPage() {
  const [sessions, setSessions] = useState<MySessions | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmOthers, setConfirmOthers] = useState(false)
  const [totp, setTotp] = useState<TotpStatus | null>(null)
  const [disableCode, setDisableCode] = useState('')

  const fail = (err: unknown, fallback: string) => setError(err instanceof Error ? err.message : fallback)
  const load = () => fetchMySessions().then(setSessions).catch((err) => fail(err, 'تعذر تحميل الجلسات'))
  const loadTotp = () => fetchTotpStatus().then(setTotp).catch((err) => fail(err, 'تعذر تحميل حالة تطبيق المصادقة'))
  useEffect(() => {
    void load()
    void loadTotp()
  }, [])

  const run = async (work: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await work()
      await load()
    } catch (err) {
      fail(err, 'تعذر تنفيذ الإجراء')
    } finally {
      setBusy(false)
    }
  }
  const end = (id: number) => run(async () => {
    const result = await endMySession(id)
    // الجلسة الحالية نفسها: الخادم مسح الـcookie — نمسح بيانات الحساب ونرجع لصفحة الدخول
    if (result.current) {
      clearSession()
      window.location.href = '/login'
    }
  })
  const endOthers = () => {
    if (!confirmOthers) return setConfirmOthers(true)
    setConfirmOthers(false)
    return run(() => endOtherSessions())
  }
  const others = sessions?.items.filter((item) => !item.current).length ?? 0
  // إلغاء تطبيق المصادقة برمز منه
  const disable = () => run(async () => {
    await disableTotp(disableCode)
    setDisableCode('')
    await loadTotp()
  })

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">الأمان</h1>
          <p className="text-sm text-gray-500">الأجهزة اللي حسابك مفتوح عليها</p>
        </div>
        {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>}

        <div className="card space-y-3" data-my-totp>
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Smartphone size={18} className="text-primary-600" /> التحقق بتطبيق المصادقة</h2>
          {totp === null && !error && <p className="text-center text-gray-400 py-4">جارٍ التحميل…</p>}
          {totp && !totp.available && <p className="bg-amber-50 text-amber-800 rounded-xl p-3 text-sm">{totp.message}</p>}
          {totp?.available && totp.enabled && (
            <>
              <p className="text-sm text-success-700">مفعّل — كل دخول بيطلب رمز من تطبيق المصادقة على موبايلك.</p>
              {totp.required ? (
                <p className="text-xs text-gray-500">إلزامي لدورك، فمايتقفلش. لو غيّرت الموبايل كلّم مدير النظام يعيد الضبط.</p>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <input value={disableCode} onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" maxLength={6} dir="ltr"
                    placeholder="------" className="w-36 rounded-lg border border-gray-200 px-3 py-2 text-center font-mono tracking-[0.4em]" aria-label="رمز تطبيق المصادقة للإلغاء" />
                  <button type="button" onClick={disable} disabled={busy || disableCode.length !== 6} className="btn-secondary disabled:opacity-50">إلغاء التفعيل</button>
                </div>
              )}
            </>
          )}
          {totp?.available && !totp.enabled && (
            <>
              <p className="text-sm text-gray-600">
                {totp.required ? 'إلزامي لدورك: ' : 'اختياري: '}رمز من تطبيق على موبايلك مع كل دخول — حتى لو كلمة السر اتعرفت محدش يدخل من غير موبايلك.
              </p>
              <TotpSetup onEnabled={() => void loadTotp()} />
            </>
          )}
        </div>

        <div className="card space-y-4" data-my-sessions>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2"><MonitorSmartphone size={18} className="text-primary-600" /> الجلسات النشطة</h2>
            {others > 0 && (
              <button type="button" disabled={busy} onClick={endOthers} className="btn-secondary" data-end-other-sessions>
                {confirmOthers ? `تأكيد إنهاء ${others} جلسة` : 'إنهاء كل الجلسات التانية'}
              </button>
            )}
          </div>
          {sessions === null && !error && <p className="text-center text-gray-400 py-6">جارٍ التحميل…</p>}
          {sessions && !sessions.available && <p className="bg-amber-50 text-amber-800 rounded-xl p-3 text-sm">{sessions.message}</p>}
          {sessions?.available && sessions.items.length === 0 && <p className="text-sm text-gray-500">مفيش جلسات متسجّلة للحساب (الجلسة الحالية اتفتحت قبل تسجيل الجلسات).</p>}
          <ul className="divide-y divide-gray-100">
            {sessions?.items.map((item) => (
              <li key={item.id} className="py-3 flex flex-wrap items-center justify-between gap-3" data-session={item.id}>
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 flex flex-wrap items-center gap-2">
                    <span className="break-words">{item.device}</span>
                    {item.current && <span className="text-xs bg-success-50 text-success-700 rounded-full px-2 py-0.5">الجلسة دي</span>}
                  </p>
                  <p className="text-xs text-gray-500">
                    اتفتحت <bdi>{formatDateTime(item.createdAt)}</bdi> · آخر نشاط <bdi>{formatDateTime(item.lastSeenAt)}</bdi>
                    {item.ip && <> · <bdi>{item.ip}</bdi></>}
                  </p>
                </div>
                <button type="button" disabled={busy} onClick={() => end(item.id)} className="btn-secondary shrink-0">
                  {item.current ? 'خروج' : 'إنهاء'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </MainLayout>
  )
}
