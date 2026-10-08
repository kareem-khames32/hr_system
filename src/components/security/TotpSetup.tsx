'use client'

import { useState } from 'react'
import { beginTotpSetup, confirmTotpSetup, type TotpSetupSecret } from '@/lib/security-api'
import { isSessionRemembered, saveSession, type CurrentUser } from '@/lib/api'

// B2.17-ج: تفعيل تطبيق المصادقة — «ابدأ» بيجيب السر ورابط التطبيق (مرة واحدة)، والتأكيد برمز من التطبيق بيفعّله وبيرجّع جلسة جديدة.
// نفس المكوّن في شاشة «الأمان» (اختياري) وفي شاشة «فعّل الأول» (الأدوار الإلزامية).
export default function TotpSetup({ onEnabled }: { onEnabled: (user: CurrentUser) => void }) {
  const [setup, setSetup] = useState<TotpSetupSecret | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (work: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await work()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تنفيذ الإجراء')
    } finally {
      setBusy(false)
    }
  }
  const begin = () => run(async () => {
    setSetup(await beginTotpSetup())
    setCode('')
  })
  const confirm = () => run(async () => {
    const remembered = isSessionRemembered()
    // الخادم بدّل الجلسة بواحدة من غير علامة «فعّل الأول»: بيانات الحساب ورمز CSRF الجداد
    const session = await confirmTotpSetup(code, remembered)
    saveSession(session.user, remembered, session.csrfToken)
    onEnabled(session.user)
  })

  return (
    <div className="space-y-3" data-totp-setup>
      {error && <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
      {!setup ? (
        <button type="button" onClick={begin} disabled={busy} className="btn-primary">ابدأ التفعيل</button>
      ) : (
        <>
          <ol className="list-decimal ps-5 space-y-2 text-sm text-gray-700">
            <li>افتح تطبيق مصادقة على موبايلك (Google Authenticator أو Microsoft Authenticator أو أي تطبيق مشابه) وضيف حساب جديد.</li>
            <li>
              اكتب المفتاح ده في التطبيق (أو افتح اللينك من الموبايل نفسه):
              <p className="mt-1 font-mono text-base tracking-wider bg-gray-50 rounded-lg px-3 py-2 break-all select-all" dir="ltr" data-totp-secret>{setup.secret}</p>
              <a href={setup.otpauthUrl} className="text-xs underline text-primary-700">فتح في تطبيق المصادقة</a>
            </li>
            <li>اكتب الرمز اللي ظاهر في التطبيق (6 أرقام):</li>
          </ol>
          <div className="flex flex-wrap items-center gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} dir="ltr"
              placeholder="------" className="w-36 rounded-lg border border-gray-200 px-3 py-2 text-center font-mono text-lg tracking-[0.4em]" aria-label="رمز تطبيق المصادقة" />
            <button type="button" onClick={confirm} disabled={busy || code.length !== 6} className="btn-primary disabled:opacity-50">تأكيد التفعيل</button>
            <button type="button" onClick={begin} disabled={busy} className="text-xs text-gray-500 hover:text-gray-700">مفتاح جديد</button>
          </div>
          <p className="text-xs text-gray-500">المفتاح بيظهر هنا مرة واحدة. بعد التفعيل كل دخول هيطلب رمز من التطبيق.</p>
        </>
      )}
    </div>
  )
}
