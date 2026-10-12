'use client'

import { useState, type FormEvent } from 'react'
import { KeyRound, Mail } from 'lucide-react'
import { unlockMailbox } from '@/lib/mail-api'

/**
 * B-ADD.16: «افتح بريدك» — كلمة مرور بريد الشركة مرة واحدة للجلسة (لما الدخول ماكانش بحساب الشركة، أو الخادم اتعاد تشغيله، أو المدة خلصت).
 * الكلمة بتتبعت للخادم مرة وبتتمسح من النموذج؛ الخادم بيجرّبها على خادم البريد وبيمسكها مشفّرة للجلسة، والمفتاح بيرجع في cookie
 * مابتتقريش من سكربت الصفحة. مفيش حاجة منها بتتحفظ في المتصفح.
 */
export default function UnlockForm({ login, notice, onUnlocked }: { login: string; notice?: string; onUnlocked: () => void }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!password || busy) return
    setBusy(true)
    setError('')
    try {
      await unlockMailbox(password)
      onUnlocked()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذّر فتح البريد')
    } finally {
      setPassword('')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="card max-w-md mx-auto space-y-4" data-mail-unlock>
      <div className="flex items-center gap-3">
        <span className="w-11 h-11 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
          <Mail size={22} />
        </span>
        <div>
          <h2 className="font-bold text-gray-800">افتح بريدك</h2>
          <p className="text-sm text-gray-500">اكتب كلمة مرور بريد الشركة مرة واحدة — وتفضل مفتوحة طول الجلسة دي</p>
        </div>
      </div>
      {notice && (
        <div role="status" className="bg-amber-50 text-amber-800 rounded-xl p-3 text-sm">
          {notice}
        </div>
      )}
      {error && (
        <div role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 text-sm">
          {error}
        </div>
      )}
      <div>
        <span className="label">الحساب</span>
        <p className="text-sm text-gray-700" dir="ltr">
          {login}
        </p>
      </div>
      <div>
        <label className="label" htmlFor="mail-unlock-password">
          كلمة مرور بريد الشركة
        </label>
        <input id="mail-unlock-password" className="input" type="password" dir="ltr" autoComplete="current-password" autoFocus maxLength={400} value={password}
          onChange={(event) => setPassword(event.target.value)} />
      </div>
      <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50" disabled={!password || busy}>
        <KeyRound size={18} />
        {busy ? 'بنفتح البريد…' : 'افتح البريد'}
      </button>
      <p className="text-xs text-gray-500">
        الكلمة مابتتحفظش في قاعدة البيانات ولا في المتصفح: الخادم بيمسكها مشفّرة للجلسة بس، وبتتمسح مع الخروج.
      </p>
    </form>
  )
}
