'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Eye, EyeOff, KeyRound, Lock, LogOut, ShieldCheck } from 'lucide-react'
import {
  ApiError,
  changeMyPassword,
  clearSession,
  getCurrentUser,
  getToken,
  isSessionRemembered,
  saveSession,
} from '@/lib/api'
import { useBranding } from '@/lib/branding'
import { BrandLogo } from '@/components/branding/BrandLogo'
import { BrandBackdrop } from '@/components/branding/BrandBackdrop'
import { PoweredBy } from '@/components/branding/PoweredBy'

const MIN_LENGTH = 8

// «غيّر كلمة المرور» — تحت /login فبتفتح من غير إطار النظام.
// اللي داخل بكلمة مؤقتة من المدير بيتوجّه هنا ومايقدرش يستخدم النظام غير لما يغيّرها (الخادم قافل الباقي).
export default function ChangePasswordPage() {
  const brand = useBranding()
  const [ready, setReady] = useState(false)
  const [forced, setForced] = useState(false)
  const [name, setName] = useState('')
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!getToken()) {
      window.location.href = '/login'
      return
    }
    const user = getCurrentUser()
    setForced(!!user?.mustChangePassword)
    setName(user?.displayName ?? '')
    setReady(true)
  }, [])

  const problem =
    next.length > 0 && next.length < MIN_LENGTH
      ? `كلمة المرور الجديدة ${MIN_LENGTH} حروف على الأقل`
      : confirm.length > 0 && confirm !== next
        ? 'التأكيد مش زي كلمة المرور الجديدة'
        : next.length > 0 && next === current
          ? forced
            ? 'كلمة المرور الجديدة لازم تختلف عن المؤقتة'
            : 'كلمة المرور الجديدة لازم تختلف عن الحالية'
          : null
  const canSubmit =
    !saving && current.length > 0 && next.length >= MIN_LENGTH && confirm === next && next !== current

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    try {
      const remembered = isSessionRemembered()
      const { accessToken, user } = await changeMyPassword(current, next)
      clearSession()
      saveSession(accessToken, user, remembered)
      window.location.href = '/'
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSession()
        window.location.href = '/login?expired=1'
        return
      }
      setError(err instanceof ApiError ? err.message : 'تعذّر الاتصال بالخادم — أعد المحاولة')
      setSaving(false)
    }
  }

  const logout = () => {
    clearSession()
    window.location.href = '/login'
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const field = (
    id: string,
    label: string,
    value: string,
    set: (v: string) => void,
    autoComplete: string
  ) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="relative">
        <Lock size={18} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          className="w-full pr-11 pl-4 py-3 rounded-xl border border-gray-200 bg-gray-50/70 text-gray-900 transition focus:border-teal-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-600/15"
          value={value}
          onChange={(e) => set(e.target.value)}
          required
        />
      </div>
    </div>
  )

  // نفس هوية صفحة الدخول: خلفية التدرّج والنقشة، وشعار الشركة واسمها فوق الكارت، و«بواسطة Logic Leap HR» تحته
  return (
    <div className="relative isolate min-h-screen overflow-hidden flex items-center justify-center p-4" dir="rtl">
      <BrandBackdrop patternId="ll-change-password-pattern" ornamentClassName="hidden sm:block" />
      <div className="ll-rise w-full max-w-md py-6">
        <div className="flex items-center justify-center gap-3 mb-6 min-h-12">
          {brand.ready && (
            <>
              <BrandLogo brand={brand} size="md" tone="dark" className="shrink-0" />
              <p title={brand.companyName} className="min-w-0 font-bold text-lg text-white leading-snug line-clamp-2 break-words">
                <bdi>{brand.companyName}</bdi>
              </p>
            </>
          )}
        </div>
        <div className="bg-white rounded-3xl shadow-2xl shadow-black/30 p-8">
          <div className="w-14 h-14 bg-teal-50 ring-1 ring-inset ring-teal-600/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-7 h-7 text-teal-700" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 text-center mb-2">غيّر كلمة المرور</h1>
          <p className="text-gray-500 text-center mb-6 text-sm">
            {forced
              ? `${name ? `أهلًا ${name} — ` : ''}انت داخل بكلمة مؤقتة من مسؤول النظام. اختار كلمة جديدة خاصة بيك عشان تكمّل.`
              : 'اكتب كلمتك الحالية وبعدين الكلمة الجديدة.'}
          </p>

          <form onSubmit={submit} className="space-y-5">
            {(error || problem) && (
              <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3 ring-1 ring-inset ring-red-600/10">
                <AlertCircle size={18} className="shrink-0" />
                <span>{error ?? problem}</span>
              </div>
            )}

            {field('cp-current', forced ? 'كلمة المرور المؤقتة' : 'كلمة المرور الحالية', current, setCurrent, 'current-password')}
            {field('cp-new', `كلمة المرور الجديدة (${MIN_LENGTH} حروف على الأقل)`, next, setNext, 'new-password')}
            {field('cp-confirm', 'اكتب الجديدة تاني', confirm, setConfirm, 'new-password')}

            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer w-fit rounded-md focus-within:ring-2 focus-within:ring-teal-600/40">
              <input
                type="checkbox"
                checked={show}
                onChange={(e) => setShow(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 accent-teal-700"
              />
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
              إظهار الكلمات
            </label>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-teal-700 to-emerald-700 py-3 font-semibold text-white shadow-lg shadow-teal-900/20 transition-all hover:from-teal-800 hover:to-emerald-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-600/35 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck size={18} />
                  احفظ الكلمة الجديدة
                </>
              )}
            </button>
          </form>

          <div className="flex items-center justify-between mt-6 text-sm">
            <button type="button" onClick={logout} className="flex items-center gap-1 rounded-lg px-1 py-0.5 text-gray-500 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600">
              <LogOut size={16} />
              خروج
            </button>
            {!forced && (
              <button
                type="button"
                onClick={() => (window.location.href = '/')}
                className="rounded-lg px-1 py-0.5 text-teal-700 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              >
                رجوع للنظام
              </button>
            )}
          </div>
        </div>
        <PoweredBy tone="dark" className="mt-6" />
      </div>
    </div>
  )
}
